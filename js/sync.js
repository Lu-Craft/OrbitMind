// OrbiMind Local Backup & Restore Module
// Handles exporting and importing systems as JSON files offline.

// --- Respaldos Locales (JSON Export/Import) ---

export async function getSystemData(systemId, localDb) {
    // 1. Obtener los metadatos del sistema
    const allSystems = await localDb.getAllSystems();
    const system = allSystems.find(s => s.id === systemId);
    if (!system) throw new Error("Sistema no encontrado.");

    // 2. Obtener los nodos del sistema
    const nodes = await localDb.getNodesBySystem(systemId);

    // 3. Obtener las tareas del sistema
    const tasks = await localDb.getTasksBySystem(systemId);

    return {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        system,
        nodes,
        tasks
    };
}

export async function exportSystemToJSON(systemId, localDb) {
    const data = await getSystemData(systemId, localDb);
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `orbimind-sistema-${data.system.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export async function importSystemFromJSON(jsonStr, localDb) {
    const data = JSON.parse(jsonStr);
    if (!data.system || !data.system.id || !data.system.name) {
        throw new Error("Formato de JSON inválido: falta información del sistema.");
    }
    
    // Guardar el sistema
    await localDb.saveSystem({
        id: data.system.id,
        name: data.system.name,
        createdAt: data.system.createdAt ? new Date(data.system.createdAt) : new Date()
    });

    // Limpiar nodos y tareas anteriores en IndexedDB para evitar duplicados
    await clearSystemNodesAndTasksLocal(data.system.id, localDb);

    // Guardar nodos
    if (Array.isArray(data.nodes)) {
        for (const node of data.nodes) {
            await localDb.saveNode(node);
        }
    }

    // Guardar tareas
    if (Array.isArray(data.tasks)) {
        for (const task of data.tasks) {
            await localDb.saveTask({
                id: task.id,
                systemId: task.systemId,
                title: task.title,
                createdAt: task.createdAt ? new Date(task.createdAt) : new Date()
            });
        }
    }

    return data.system;
}

// Helper para limpiar IndexedDB localmente de forma transaccional
export function clearSystemNodesAndTasksLocal(systemId, localDb) {
    return new Promise((resolve, reject) => {
        if (!localDb.db) {
            reject("Base de datos no inicializada.");
            return;
        }
        const transaction = localDb.db.transaction(["nodes", "tasks"], "readwrite");
        
        // Borrar nodos
        const nodeStore = transaction.objectStore("nodes");
        const nodeIndex = nodeStore.index("systemId");
        const nodeRequest = nodeIndex.openCursor(IDBKeyRange.only(systemId));
        nodeRequest.onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
                cursor.delete();
                cursor.continue();
            }
        };

        // Borrar tareas
        const taskStore = transaction.objectStore("tasks");
        const taskIndex = taskStore.index("systemId");
        const taskRequest = taskIndex.openCursor(IDBKeyRange.only(systemId));
        taskRequest.onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
                cursor.delete();
                cursor.continue();
            }
        };

        transaction.oncomplete = () => resolve(true);
        transaction.onerror = (e) => reject(e);
    });
}
