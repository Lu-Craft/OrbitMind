// IndexedDB Database Wrapper for OrbiMind

export class OrbiMindDB {
    constructor() {
        this.dbName = "OrbiMindDatabase";
        this.version = 2; // Versión incrementada para la nueva tienda de tareas
        this.db = null;
    }

    init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = (event) => {
                console.error("Error al abrir IndexedDB:", event);
                reject(event);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Tienda de Sistemas Solares (Temas principales)
                if (!db.objectStoreNames.contains("systems")) {
                    db.createObjectStore("systems", { keyPath: "id" });
                }

                // Tienda de Nodos (Sol, Planetas, Satélites)
                if (!db.objectStoreNames.contains("nodes")) {
                    const nodeStore = db.createObjectStore("nodes", { keyPath: "id" });
                    nodeStore.createIndex("systemId", "systemId", { unique: false });
                    nodeStore.createIndex("parentId", "parentId", { unique: false });
                }

                // NUEVA Tienda de Tareas (Estrellas Fugaces)
                if (!db.objectStoreNames.contains("tasks")) {
                    const taskStore = db.createObjectStore("tasks", { keyPath: "id" });
                    taskStore.createIndex("systemId", "systemId", { unique: false });
                }
            };
        });
    }

    // --- Métodos de Sistemas ---
    getAllSystems() {
        return new Promise((resolve) => {
            const transaction = this.db.transaction(["systems"], "readonly");
            const store = transaction.objectStore("systems");
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
        });
    }

    saveSystem(system) {
        return new Promise((resolve) => {
            const transaction = this.db.transaction(["systems"], "readwrite");
            const store = transaction.objectStore("systems");
            store.put(system);
            transaction.oncomplete = () => resolve(true);
        });
    }

    deleteSystem(systemId) {
        return new Promise((resolve) => {
            const transaction = this.db.transaction(["systems", "nodes", "tasks"], "readwrite");
            
            // Eliminar sistema
            transaction.objectStore("systems").delete(systemId);
            
            // Eliminar todos los nodos del sistema
            const nodeStore = transaction.objectStore("nodes");
            const index = nodeStore.index("systemId");
            const request = index.openCursor(IDBKeyRange.only(systemId));
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };

            // Eliminar tareas asociadas
            const taskStore = transaction.objectStore("tasks");
            const taskIndex = taskStore.index("systemId");
            const taskRequest = taskIndex.openCursor(IDBKeyRange.only(systemId));
            taskRequest.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };

            transaction.oncomplete = () => resolve(true);
        });
    }

    // --- Métodos de Nodos ---
    getNodesBySystem(systemId) {
        return new Promise((resolve) => {
            const transaction = this.db.transaction(["nodes"], "readonly");
            const store = transaction.objectStore("nodes");
            const index = store.index("systemId");
            const request = index.getAll(IDBKeyRange.only(systemId));
            request.onsuccess = () => resolve(request.result);
        });
    }

    saveNode(node) {
        return new Promise((resolve) => {
            const transaction = this.db.transaction(["nodes"], "readwrite");
            const store = transaction.objectStore("nodes");
            store.put(node);
            transaction.oncomplete = () => resolve(true);
        });
    }

    deleteNodeCascade(nodeId, allNodes) {
        return new Promise((resolve) => {
            const transaction = this.db.transaction(["nodes"], "readwrite");
            const store = transaction.objectStore("nodes");
            
            const idsToDelete = [nodeId];
            const getChildrenIds = (parentID) => {
                allNodes.forEach(n => {
                    if (n.parentId === parentID) {
                        idsToDelete.push(n.id);
                        getChildrenIds(n.id);
                    }
                });
            };
            
            getChildrenIds(nodeId);
            
            idsToDelete.forEach(id => {
                store.delete(id);
            });

            transaction.oncomplete = () => resolve(idsToDelete);
        });
    }

    // --- Métodos de Tareas (Estrellas Fugaces) ---
    getTasksBySystem(systemId) {
        return new Promise((resolve) => {
            const transaction = this.db.transaction(["tasks"], "readonly");
            const store = transaction.objectStore("tasks");
            const index = store.index("systemId");
            const request = index.getAll(IDBKeyRange.only(systemId));
            request.onsuccess = () => resolve(request.result || []);
        });
    }

    saveTask(task) {
        return new Promise((resolve) => {
            const transaction = this.db.transaction(["tasks"], "readwrite");
            const store = transaction.objectStore("tasks");
            store.put(task);
            transaction.oncomplete = () => resolve(true);
        });
    }

    deleteTask(taskId) {
        return new Promise((resolve) => {
            const transaction = this.db.transaction(["tasks"], "readwrite");
            const store = transaction.objectStore("tasks");
            store.delete(taskId);
            transaction.oncomplete = () => resolve(true);
        });
    }
}
