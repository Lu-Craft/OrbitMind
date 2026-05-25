// Main UI Controller and entry point for OrbiMind
import { OrbiMindDB } from './db.js';
import { SpaceEngine } from './spaceEngine.js';
import { VoiceDictation } from './voiceDictation.js';
import { parseMarkdown } from './markdownParser.js';
import { getNodeColor, hexToRgb } from './utils.js';
import { initTutorial } from './tutorial.js?v=45';
import {
    exportSystemToJSON,
    importSystemFromJSON
} from './sync.js';
import { defaultSystemsData } from './defaultSystems.js?v=45';

document.addEventListener("DOMContentLoaded", async () => {
    // PWA Cache Buster: force hard reload if script query version changes
    try {
        const currentScript = document.currentScript || document.querySelector('script[src*="main.js"]');
        const scriptUrl = currentScript ? currentScript.src : '';
        const versionMatch = scriptUrl.match(/\?v=(\d+)/);
        const currentVersion = versionMatch ? versionMatch[1] : '';
        
        if (currentVersion) {
            const savedVersion = localStorage.getItem("orbimind_app_version");
            if (savedVersion && savedVersion !== currentVersion) {
                localStorage.setItem("orbimind_app_version", currentVersion);
                
                // Clear service workers
                if ('serviceWorker' in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for (const registration of registrations) {
                        registration.unregister();
                    }
                }
                // Clear caches
                if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    for (const name of cacheNames) {
                        await caches.delete(name);
                    }
                }
                
                // Force hard reload
                window.location.reload(true);
                return;
            }
            localStorage.setItem("orbimind_app_version", currentVersion);
        }
    } catch (e) {
        console.warn("[CacheBuster] Error during cache bust check:", e);
    }

    const db = new OrbiMindDB();
    await db.init();

    let currentSystemId = null;
    let currentParentId = null;
    let nodesList = [];
    let currentSystemName = "";
    let orbitalHistory = [];
    let miniMapAnimationFrameId = null;

    function renderMath(element) {
        if (typeof window.renderMathInElement === 'function' && element) {
            window.renderMathInElement(element, {
                delimiters: [
                    { left: "$$", right: "$$", display: true },
                    { left: "$", right: "$", display: false }
                ],
                throwOnError: false
            });
        }
    }

    function insertSnippet(textarea, snippet, offset) {
        const startPos = textarea.selectionStart;
        const endPos = textarea.selectionEnd;
        const value = textarea.value;

        // Insert snippet
        const newValue = value.substring(0, startPos) + snippet + value.substring(endPos);
        textarea.value = newValue;

        // Move cursor
        const newCursorPos = startPos + snippet.length + offset;
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);

        // Dispatch input event to trigger auto-save/updates
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    // Pool de colores para planetas (Pasteles claros y limpios)
    const planetColors = ["#ffb3ba", "#ffdfba", "#ffffba", "#baffc9", "#bae1ff", "#e8c4ff", "#ffd3b6", "#a8e6cf", "#ff8b94", "#c7ceea"];

    function getNodeSubtypeIndex(seedOrId, nodeType) {
        let hash = 0;
        const str = seedOrId + "-100";
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const x = Math.sin(hash) * 43758.5453123;
        const val = x - Math.floor(x);

        if (nodeType === "planet") {
            if (val < 0.35) return 0; // Gaseous
            if (val < 0.55) return 1; // Ice
            if (val < 0.75) return 2; // Earth-like
            return 3; // Volcanic
        } else if (nodeType === "planetoid") {
            if (val < 0.45) return 0; // Rocky
            if (val < 0.8) return 1; // Metallic
            return 2; // Comet
        } else if (nodeType === "moon") {
            if (val < 0.5) return 0; // Dusty
            if (val < 0.8) return 1; // Volcanic
            return 2; // Europa-like
        } else if (nodeType === "satellite") {
            if (val < 0.4) return 0; // Comm
            if (val < 0.75) return 1; // Space Station
            return 2; // Scientific Probe
        }
        return 0;
    }

    function generateUniqueSubtypeSeed(parentId, childType, nodesList, excludeNodeId = null) {
        const siblings = nodesList.filter(n => n.parentId === parentId && n.type === childType && n.id !== excludeNodeId);
        const usedSubtypes = siblings.map(s => getNodeSubtypeIndex(s.seed || s.id, childType));
        
        let numSubtypes = 3;
        if (childType === "planet") numSubtypes = 4;

        const unusedSubtypes = [];
        for (let i = 0; i < numSubtypes; i++) {
            if (!usedSubtypes.includes(i)) {
                unusedSubtypes.push(i);
            }
        }

        const targetSubtypes = unusedSubtypes.length > 0 ? unusedSubtypes : Array.from({length: numSubtypes}, (_, i) => i);

        let finalSeed = crypto.randomUUID();
        for (let iter = 0; iter < 100; iter++) {
            const testSeed = crypto.randomUUID();
            const subIdx = getNodeSubtypeIndex(testSeed, childType);
            if (targetSubtypes.includes(subIdx)) {
                finalSeed = testSeed;
                break;
            }
        }
        return finalSeed;
    }

    function selectUniqueSiblingColor(parentId, childType, nodesList, excludeNodeId = null) {
        const siblings = nodesList.filter(n => n.parentId === parentId && n.id !== excludeNodeId);
        const usedColors = siblings.map(s => s.color).filter(Boolean);
        
        const unusedColors = planetColors.filter(c => !usedColors.includes(c));
        if (unusedColors.length > 0) {
            return unusedColors[Math.floor(Math.random() * unusedColors.length)];
        }
        
        const counts = {};
        planetColors.forEach(c => counts[c] = 0);
        usedColors.forEach(c => {
            if (counts[c] !== undefined) counts[c]++;
        });
        
        let minCount = Infinity;
        let candidates = [];
        planetColors.forEach(c => {
            if (counts[c] < minCount) {
                minCount = counts[c];
                candidates = [c];
            } else if (counts[c] === minCount) {
                candidates.push(c);
            }
        });
        
        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    // Configurar callback de Canvas
    let activeClickedStar = null;

    const engine = new SpaceEngine("spaceCanvas", 
        // 1. Click en Nodo
        (node) => {
            if (node) {
                openSidebar(node);
            } else {
                closeSidebar();
            }
            updateAddButtons();
        },
        // 2. Doble Click en Nodo (para entrar en su órbita)
        (node) => {
            enterPlanetOrbit(node);
        },
        // 3. Click en Estrella Fugaz (Tarea pendiente)
        (star) => {
            activeClickedStar = star;
            const detailText = document.getElementById("starDetailMessage");
            detailText.textContent = `"${star.title}"`;
            
            // Pausar vuelo mientras se ve el detalle
            star.isActive = false;
            
            document.getElementById("starDetailModal").classList.remove("hidden");
        }
    );
    engine.start();

    // --- ELEMENTOS DEL DOM ---
    const selectSystem = document.getElementById("solarSystemSelect");
    const btnNewSystem = document.getElementById("btnNewSystem");
    const btnDeleteSystem = document.getElementById("btnDeleteSystem");
    const btnPlayPause = document.getElementById("btnPlayPause");
    const btnZoomIn = document.getElementById("btnZoomIn");
    const btnZoomOut = document.getElementById("btnZoomOut");
    const btnResetView = document.getElementById("btnResetView");
    const btnGoParent = document.getElementById("btnGoParent");
    const btnNewStar = document.getElementById("btnNewStar");

    // Modal nuevo sistema
    const modalNewSystem = document.getElementById("newSystemModal");
    const inputNewSystem = document.getElementById("newSystemName");
    const btnCancelModal = document.getElementById("btnCancelModal");
    const btnCreateModal = document.getElementById("btnCreateModal");

    // Modal nueva Estrella
    const modalNewStar = document.getElementById("newStarModal");
    const inputNewStar = document.getElementById("newStarTitle");
    const btnCancelStarModal = document.getElementById("btnCancelStarModal");
    const btnCreateStarModal = document.getElementById("btnCreateStarModal");

    // Modal Detalle Estrella
    const modalStarDetail = document.getElementById("starDetailModal");
    const btnCloseStarModal = document.getElementById("btnCloseStarModal");
    const btnCompleteStar = document.getElementById("btnCompleteStar");

    // Elementos del panel de estrellas activas
    const btnToggleStars = document.getElementById("btnToggleStars");
    const activeStarsBadge = document.getElementById("activeStarsBadge");
    const activeStarsPanel = document.getElementById("activeStarsPanel");
    const activeStarsList = document.getElementById("activeStarsList");
    const activeStarsPanelCount = document.getElementById("activeStarsPanelCount");

    // Sidebar
    const sidebar = document.getElementById("detailSidebar");
    const btnCloseSidebar = document.getElementById("btnCloseSidebar");
    const badgeNode = document.getElementById("sidebarNodeBadge");
    const inputNodeTitle = document.getElementById("nodeTitle");
    
    const selectNodeType = document.getElementById("nodeType");
    const groupNodeType = document.getElementById("nodeTypeGroup");

    const textNodeNotes = document.getElementById("nodeNotes");
    const divNotesPreview = document.getElementById("notesPreview");
    const tabEdit = document.getElementById("tabEdit");
    const tabPreview = document.getElementById("tabPreview");
    const btnStudyNode = document.getElementById("btnStudyNode");
    const voiceNotesWrapper = document.querySelector(".voice-notes-wrapper");
    const liveMathPreview = document.getElementById("liveMathPreview");
    const liveMathContent = document.getElementById("liveMathContent");
    const btnSaveNode = document.getElementById("btnSaveNode");
    const btnDeleteNode = document.getElementById("btnDeleteNode");
    const btnToggleMathKeyboard = document.getElementById("btnToggleMathKeyboard");
    const mathKeyboard = document.getElementById("mathKeyboard");
    const btnOpenSearch = document.getElementById("btnOpenSearch");
    const alienSearchPanel = document.getElementById("alienSearchPanel");
    const btnCloseSearch = document.getElementById("btnCloseSearch");
    const alienSearchInput = document.getElementById("alienSearchInput");
    const voiceSearchBtn = document.getElementById("voiceSearchBtn");
    const btnRunSearch = document.getElementById("btnRunSearch");
    const alienScanningState = document.getElementById("alienScanningState");
    const scanningProgressFill = document.getElementById("scanningProgressFill");
    const searchResultsList = document.getElementById("searchResultsList");
    const alienSpeechText = document.getElementById("alienSpeechText");
    
    const inputAttachment = document.getElementById("fileAttachment");
    const listAttachments = document.getElementById("attachmentsList");

    // Confirm Modal
    const modalConfirm = document.getElementById("confirmModal");
    const confirmTitle = document.getElementById("confirmTitle");
    const confirmMessage = document.getElementById("confirmMessage");
    const btnCancelConfirm = document.getElementById("btnCancelConfirm");
    const btnAcceptConfirm = document.getElementById("btnAcceptConfirm");
    let confirmCallback = null;

    // Toasts
    function showToast(message, type = "success") {
        let container = document.querySelector(".toast-container");
        if (!container) {
            container = document.createElement("div");
            container.className = "toast-container";
            document.body.appendChild(container);
        }
        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add("fade-out");
            toast.addEventListener("animationend", () => toast.remove());
        }, 3000);
    }

    function showConfirm(title, message, callback) {
        confirmTitle.textContent = title;
        confirmMessage.textContent = message;
        confirmCallback = callback;
        modalConfirm.classList.remove("hidden");
    }

    btnCancelConfirm.addEventListener("click", () => {
        modalConfirm.classList.add("hidden");
        confirmCallback = null;
    });

    btnAcceptConfirm.addEventListener("click", () => {
        modalConfirm.classList.add("hidden");
        if (confirmCallback) confirmCallback();
        confirmCallback = null;
    });

    // --- CARGAR DATOS ---
    async function loadSystemsList() {
        // Upgrade seed version to ensure the user gets all 5 custom default systems
        const SEED_VERSION = "14";
        const currentSeedVer = localStorage.getItem("orbimind_seed_ver");
        let systems = await db.getAllSystems();
        
        const defaultNames = [
            "Termodinámica Avanzada",
            "Psicología Social y Relaciones Humanas",
            "Historia del Arte Contemporáneo",
            "El Imperio Romano",
            "Inteligencia Artificial"
        ];

        if (currentSeedVer !== SEED_VERSION) {
            // Delete only pre-existing default systems to avoid wiping user-created systems
            for (const sys of systems) {
                if (defaultNames.includes(sys.name)) {
                    await db.deleteSystem(sys.id);
                }
            }
            systems = await db.getAllSystems();
        }
        localStorage.setItem("orbimind_seed_ver", SEED_VERSION);

        selectSystem.innerHTML = "";
        
        async function saveNodeRecursive(nodeData, systemId, parentId = null) {
            const node = {
                id: crypto.randomUUID(),
                systemId: systemId,
                parentId: parentId,
                title: nodeData.title,
                type: nodeData.type,
                notes: nodeData.notes,
                attachments: nodeData.attachments || [],
                orbitRadius: nodeData.orbitRadius || 0,
                orbitSpeed: nodeData.orbitSpeed || 0,
                color: nodeData.color || "#ffffff",
                angle: nodeData.angle !== undefined ? nodeData.angle : Math.random() * Math.PI * 2
            };
            await db.saveNode(node);
            if (nodeData.children && nodeData.children.length > 0) {
                for (const child of nodeData.children) {
                    await saveNodeRecursive(child, systemId, node.id);
                }
            }
        }

        for (const sysData of defaultSystemsData) {
            const hasSystem = systems.some(sys => sys.name === sysData.name);
            if (!hasSystem) {
                const defaultId = crypto.randomUUID();
                const defaultSystem = { id: defaultId, name: sysData.name, createdAt: new Date() };
                await db.saveSystem(defaultSystem);
                
                // Recursively save sun and child nodes
                await saveNodeRecursive(sysData.sun, defaultId);
                
                // Save system tasks (stars)
                if (sysData.tasks) {
                    for (const taskTitle of sysData.tasks) {
                        await db.saveTask({
                            id: crypto.randomUUID(),
                            systemId: defaultId,
                            title: taskTitle,
                            createdAt: new Date()
                        });
                    }
                }
                systems.push(defaultSystem);
            }
        }

        systems.forEach(sys => {
            const opt = document.createElement("option");
            opt.value = sys.id;
            opt.textContent = sys.name;
            selectSystem.appendChild(opt);
        });

        if (!currentSystemId) {
            const savedSystemId = localStorage.getItem("orbimind_selected_system_id");
            if (savedSystemId && systems.some(sys => sys.id === savedSystemId)) {
                currentSystemId = savedSystemId;
            } else {
                currentSystemId = systems[0].id;
            }
        }
        localStorage.setItem("orbimind_selected_system_id", currentSystemId);
        selectSystem.value = currentSystemId;
        await loadSystemData(currentSystemId);
        renderCustomOptions();
    }

    async function loadSystemData(systemId) {
        currentSystemId = systemId;
        orbitalHistory = [];
        btnGoParent.disabled = true;
        btnGoParent.classList.add("disabled");

        nodesList = await db.getNodesBySystem(systemId);
        
        // Migración de color de los satélites de fucsia (#bd00ff) o sin color a gris metálico (#a8afb8)
        for (let i = 0; i < nodesList.length; i++) {
            const node = nodesList[i];
            if (node.type === "satellite" && (node.color === "#bd00ff" || !node.color)) {
                node.color = "#a8afb8";
                await db.saveNode(node);
            }
        }
        
        const sun = nodesList.find(n => n.type === "sun");
        if (sun) {
            currentParentId = sun.id;
            currentSystemName = sun.title;
            if (sun.color === "#ff007f") {
                sun.color = "#ffaa00";
                await db.saveNode(sun);
            }
        } else {
            currentParentId = null;
        }

        engine.setNodes(nodesList, currentParentId);
        
        // Cargar y lanzar estrellas fugaces asociadas
        const tasks = await db.getTasksBySystem(systemId);
        engine.setTasks(tasks);
        refreshActiveStarsList();
        engine.resetView();
        updateAddButtons();
    }

    // --- NAVEGACIÓN EN ÓRBITAS ---
    function enterPlanetOrbit(planetNode) {
        orbitalHistory.push(currentParentId);
        currentParentId = planetNode.id;
        
        btnGoParent.disabled = false;
        btnGoParent.classList.remove("disabled");
        
        engine.setNodes(nodesList, currentParentId);
        engine.resetView();
        showToast(`Entrando a la órbita de: ${planetNode.title}`);
        
        engine.selectedNode = null;
        closeSidebar();
        updateAddButtons();
    }

    function goUpOrbit() {
        if (orbitalHistory.length > 0) {
            currentParentId = orbitalHistory.pop();
            
            if (orbitalHistory.length === 0) {
                btnGoParent.disabled = true;
                btnGoParent.classList.add("disabled");
            }
            
            engine.setNodes(nodesList, currentParentId);
            engine.resetView();
            
            engine.selectedNode = null;
            closeSidebar();
            updateAddButtons();
        }
    }

    btnGoParent.addEventListener("click", goUpOrbit);

    // --- ACCIONES DINÁMICAS DE CREACIÓN DE HIJOS ---
    function updateAddButtons() {
        const activeNode = engine.selectedNode || nodesList.find(n => n.id === currentParentId);
        const container = document.getElementById("addChildButtons");
        const activeParentName = document.getElementById("activeParentName");
        
        if (!activeNode) {
            container.innerHTML = "";
            activeParentName.textContent = "";
            return;
        }

        activeParentName.textContent = activeNode.title;
        container.innerHTML = "";

        let allowedTypes = [];
        if (activeNode.type === "sun") {
            allowedTypes = [
                { type: "planet", label: "Planeta", icon: "🪐" },
                { type: "planetoid", label: "Planetoide", icon: "☄️" },
                { type: "moon", label: "Luna", icon: "🌙" },
                { type: "satellite", label: "Satélite", icon: "🛰️" }
            ];
        } else if (activeNode.type === "planet") {
            allowedTypes = [
                { type: "planetoid", label: "Planetoide", icon: "☄️" },
                { type: "moon", label: "Luna", icon: "🌙" },
                { type: "satellite", label: "Satélite", icon: "🛰️" }
            ];
        } else if (activeNode.type === "planetoid") {
            allowedTypes = [
                { type: "moon", label: "Luna", icon: "🌙" },
                { type: "satellite", label: "Satélite", icon: "🛰️" }
            ];
        } else if (activeNode.type === "moon") {
            allowedTypes = [
                { type: "satellite", label: "Satélite", icon: "🛰️" }
            ];
        }

        if (allowedTypes.length === 0) {
            const span = document.createElement("span");
            span.className = "no-child-label";
            span.style.color = "rgba(255,255,255,0.4)";
            span.style.fontSize = "12px";
            span.style.fontStyle = "italic";
            span.textContent = "No se pueden añadir órbitas alrededor de un Satélite.";
            container.appendChild(span);
        } else {
            allowedTypes.forEach(opt => {
                const btn = document.createElement("button");
                btn.className = "btn btn-secondary btn-action-child";
                btn.innerHTML = `<span class="btn-icon">${opt.icon}</span><span class="btn-text"> + ${opt.label}</span>`;
                btn.addEventListener("click", () => {
                    addChildNode(activeNode, opt.type);
                });
                container.appendChild(btn);
            });
        }
    }

    async function addChildNode(parentNode, childType) {
        const newId = crypto.randomUUID();
        const currentChildren = nodesList.filter(n => n.parentId === parentNode.id);
        
        let minRadius = 45;
        let step = 30;
        
        if (parentNode.type === "sun") {
            minRadius = 110;
            step = 70;
        } else if (parentNode.type === "planet") {
            minRadius = 55;
            step = 35;
        } else if (parentNode.type === "planetoid") {
            minRadius = 35;
            step = 25;
        }
        
        let maxRadius = minRadius;
        currentChildren.forEach(child => {
            if (child.orbitRadius > maxRadius) maxRadius = child.orbitRadius;
        });
        
        const newRadius = maxRadius + (currentChildren.length === 0 ? 0 : step);
        const speed = (0.15 + Math.random() * 0.3) * (Math.random() > 0.5 ? 1 : -1);
        
        const color = selectUniqueSiblingColor(parentNode.id, childType, nodesList);
        const seed = generateUniqueSubtypeSeed(parentNode.id, childType, nodesList);

        const typeLabels = {
            planet: "Planeta",
            planetoid: "Planetoide",
            moon: "Luna",
            satellite: "Satélite"
        };
        const label = typeLabels[childType] || "Objeto";

        const newNode = {
            id: newId,
            systemId: currentSystemId,
            parentId: parentNode.id,
            title: `${label} ${currentChildren.length + 1}`,
            type: childType,
            notes: "",
            attachments: [],
            orbitRadius: newRadius,
            orbitSpeed: speed,
            color: color,
            seed: seed,
            angle: Math.random() * Math.PI * 2
        };

        nodesList.push(newNode);
        await db.saveNode(newNode);
        
        engine.setNodes(nodesList, currentParentId);
        engine.selectedNode = newNode;
        
        openSidebar(newNode);
        updateAddButtons();
        showToast(`${label} creado con éxito`);
    }

    // --- DETALLE SIDEBAR ---
    let currentEditingNode = null;

    function populateNodeTypeOptions(node) {
        selectNodeType.innerHTML = "";
        
        if (node.type === "sun") {
            const opt = document.createElement("option");
            opt.value = "sun";
            opt.textContent = "Sol (Tema Central)";
            selectNodeType.appendChild(opt);
            selectNodeType.value = "sun";
            return;
        }

        const parentNode = nodesList.find(n => n.id === node.parentId);
        if (!parentNode) return;

        let allowedTypes = [];
        if (parentNode.type === "sun") {
            allowedTypes = [
                { value: "planet", text: "Planeta (Categoría Mayor)" },
                { value: "planetoid", text: "Planetoide (Subcategoría)" },
                { value: "moon", text: "Luna (Apunte / Nota Mayor)" },
                { value: "satellite", text: "Satélite (Nota Corta)" }
            ];
        } else if (parentNode.type === "planet") {
            allowedTypes = [
                { value: "planetoid", text: "Planetoide (Subcategoría)" },
                { value: "moon", text: "Luna (Apunte / Nota Mayor)" },
                { value: "satellite", text: "Satélite (Nota Corta)" }
            ];
        } else if (parentNode.type === "planetoid") {
            allowedTypes = [
                { value: "moon", text: "Luna (Apunte / Nota Mayor)" },
                { value: "satellite", text: "Satélite (Nota Corta)" }
            ];
        } else if (parentNode.type === "moon") {
            allowedTypes = [
                { value: "satellite", text: "Satélite (Nota Corta)" }
            ];
        }

        allowedTypes.forEach(t => {
            const opt = document.createElement("option");
            opt.value = t.value;
            opt.textContent = t.text;
            selectNodeType.appendChild(opt);
        });

        selectNodeType.value = node.type;
    }

    function openSidebar(node) {
        currentEditingNode = node;
        badgeNode.textContent = node.type;
        badgeNode.className = `node-badge ${node.type}`;
        
        inputNodeTitle.value = node.title;
        textNodeNotes.value = node.notes || "";
        
        if (node.type === "sun") {
            groupNodeType.classList.add("hidden");
            btnDeleteNode.classList.add("hidden");
        } else {
            groupNodeType.classList.remove("hidden");
            btnDeleteNode.classList.remove("hidden");
            populateNodeTypeOptions(node);
        }

        tabEdit.classList.add("active");
        tabPreview.classList.add("active");
        switchTab("edit");
        renderAttachmentsList();

        sidebar.classList.add("open");
        
        // Close active stars, search panels, and custom select to avoid layout overlap
        if (activeStarsPanel) activeStarsPanel.classList.remove("open");
        if (btnToggleStars) btnToggleStars.classList.remove("active");
        if (alienSearchPanel) alienSearchPanel.classList.remove("open");
        if (btnOpenSearch) btnOpenSearch.classList.remove("active");
        const customSelect = document.getElementById("customSystemSelect");
        if (customSelect) {
            const trigger = customSelect.querySelector(".custom-select-trigger");
            const optionsContainer = customSelect.querySelector(".custom-select-options");
            if (optionsContainer) optionsContainer.classList.add("hidden");
            if (trigger) trigger.classList.remove("open");
        }
    }

    function closeSidebar() {
        sidebar.classList.remove("open");
        currentEditingNode = null;
        engine.selectedNode = null;
        updateAddButtons();
    }

    btnCloseSidebar.addEventListener("click", () => {
        closeSidebar();
    });

    function updateLiveMathPreview() {
        const text = textNodeNotes.value;
        if (text.includes("$")) {
            liveMathPreview.classList.remove("hidden");
            const nodeColor = currentEditingNode ? getNodeColor(currentEditingNode) : "#00f2fe";
            liveMathContent.innerHTML = parseMarkdown(text, nodeColor);
            renderMath(liveMathContent);
        } else {
            liveMathPreview.classList.add("hidden");
            liveMathContent.innerHTML = "";
        }
    }

    textNodeNotes.addEventListener("input", updateLiveMathPreview);

    function switchTab(tab) {
        if (tab === "edit") {
            tabEdit.classList.add("active");
            tabPreview.classList.remove("active");
            voiceNotesWrapper.classList.remove("hidden");
            divNotesPreview.classList.add("hidden");
            updateLiveMathPreview();
        } else {
            tabEdit.classList.remove("active");
            tabPreview.classList.add("active");
            voiceNotesWrapper.classList.add("hidden");
            divNotesPreview.classList.remove("hidden");
            divNotesPreview.innerHTML = parseMarkdown(textNodeNotes.value, getNodeColor(currentEditingNode));
            renderMath(divNotesPreview);
            liveMathPreview.classList.add("hidden");
        }
    }

    tabEdit.addEventListener("click", () => switchTab("edit"));
    tabPreview.addEventListener("click", () => {
        if (currentEditingNode) {
            currentEditingNode.title = inputNodeTitle.value;
            currentEditingNode.notes = textNodeNotes.value;
            if (currentEditingNode.type !== "sun") {
                currentEditingNode.type = selectNodeType.value;
            }
            switchTab("preview");
        }
    });

    btnStudyNode.addEventListener("click", () => {
        if (currentEditingNode) {
            currentEditingNode.title = inputNodeTitle.value;
            currentEditingNode.notes = textNodeNotes.value;
            if (currentEditingNode.type !== "sun") {
                currentEditingNode.type = selectNodeType.value;
            }
            openStudyWorkspace(currentEditingNode);
        }
    });

    // --- GESTIÓN DE ADJUNTOS ---
    function renderAttachmentsList() {
        listAttachments.innerHTML = "";
        if (!currentEditingNode || !currentEditingNode.attachments) return;

        currentEditingNode.attachments.forEach((file, index) => {
            const item = document.createElement("div");
            item.className = "attachment-item";
            
            const info = document.createElement("div");
            info.className = "attachment-info";
            const isPdf = file.name.split('.').pop().toLowerCase() === 'pdf';
            info.innerHTML = `
                <span class="attachment-icon">${isPdf ? '📄' : '🖼️'}</span>
                <span class="attachment-name" title="${file.name}">${file.name}</span>
            `;
            info.addEventListener("click", () => openAttachment(file));

            const btnRemove = document.createElement("button");
            btnRemove.className = "btn-remove-attachment";
            btnRemove.innerHTML = "×";
            btnRemove.addEventListener("click", (e) => {
                e.stopPropagation();
                currentEditingNode.attachments.splice(index, 1);
                renderAttachmentsList();
                showToast("Adjunto eliminado");
            });

            item.appendChild(info);
            item.appendChild(btnRemove);
            listAttachments.appendChild(item);
        });
    }

    inputAttachment.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2.5 * 1024 * 1024) {
            showToast("El archivo supera el límite de 2.5MB", "error");
            return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            if (!currentEditingNode.attachments) currentEditingNode.attachments = [];
            currentEditingNode.attachments.push({
                name: file.name,
                type: file.type,
                data: event.target.result
            });
            renderAttachmentsList();
            showToast("Archivo adjuntado");
            inputAttachment.value = "";
        };
        reader.onloadend = () => {
            // refresh sidebar node color representation if attachments modified
            currentEditingNode.color = selectUniqueSiblingColor(currentEditingNode.parentId, currentEditingNode.type, nodesList, currentEditingNode.id);
            engine.setNodes(nodesList, currentParentId);
        };
        reader.readAsDataURL(file);
    });

    function openAttachment(file) {
        const w = window.open();
        const fileUrl = (file.data.startsWith('data:') || file.data.startsWith('http://') || file.data.startsWith('https://')) 
            ? file.data 
            : window.location.origin + '/' + file.data;
        if (file.type.includes('pdf')) {
            w.document.write(`<iframe src="${fileUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
        } else {
            w.document.write(`<body style="margin:0; background:#020208; display:flex; align-items:center; justify-content:center;"><img src="${fileUrl}" style="max-width:100%; max-height:100vh; object-fit:contain; box-shadow: 0 10px 40px rgba(0,0,0,0.8); border-radius:8px;"></body>`);
        }
        w.document.title = file.name;
    }

    // Guardar / Eliminar
    btnSaveNode.addEventListener("click", async () => {
        if (!currentEditingNode) return;

        currentEditingNode.title = inputNodeTitle.value.trim() || currentEditingNode.title;
        currentEditingNode.notes = textNodeNotes.value;
        
        if (currentEditingNode.type !== "sun") {
            const oldType = currentEditingNode.type;
            currentEditingNode.type = selectNodeType.value;
            
            if (currentEditingNode.type !== oldType) {
                currentEditingNode.color = selectUniqueSiblingColor(currentEditingNode.parentId, currentEditingNode.type, nodesList, currentEditingNode.id);
                currentEditingNode.seed = generateUniqueSubtypeSeed(currentEditingNode.parentId, currentEditingNode.type, nodesList, currentEditingNode.id);
            }
        } else {
            currentSystemName = currentEditingNode.title;
            const activeOption = selectSystem.querySelector(`option[value="${currentSystemId}"]`);
            if (activeOption) activeOption.textContent = currentSystemName;
            
            const sys = { id: currentSystemId, name: currentSystemName, createdAt: new Date() };
            await db.saveSystem(sys);
            renderCustomOptions();
        }

        await db.saveNode(currentEditingNode);
        engine.setNodes(nodesList, currentParentId);
        
        showToast("Cambios guardados");
        closeSidebar();
        engine.selectedNode = null;
        triggerCloudAutosave();
    });

    btnDeleteNode.addEventListener("click", () => {
        if (!currentEditingNode) return;
        showConfirm(
            "¿Eliminar Objeto?", 
            `¿Estás seguro de que deseas eliminar "${currentEditingNode.title}"? Todos los satélites o subtemas orbitando a su alrededor también se perderán de forma permanente.`,
            async () => {
                const deletedIds = await db.deleteNodeCascade(currentEditingNode.id, nodesList);
                nodesList = nodesList.filter(n => !deletedIds.includes(n.id));
                engine.setNodes(nodesList, currentParentId);
                closeSidebar();
                engine.selectedNode = null;
                showToast("Objeto y subelementos eliminados");
                triggerCloudAutosave();
            }
        );
    });

    // --- NUEVO SISTEMA SOLAR ---
    btnNewSystem.addEventListener("click", () => {
        inputNewSystem.value = "";
        modalNewSystem.classList.remove("hidden");
        inputNewSystem.focus();
    });

    btnCancelModal.addEventListener("click", () => {
        modalNewSystem.classList.add("hidden");
    });

    btnCreateModal.addEventListener("click", async () => {
        const name = inputNewSystem.value.trim();
        if (!name) return;

        const newId = crypto.randomUUID();
        const newSystem = { id: newId, name: name, createdAt: new Date() };
        await db.saveSystem(newSystem);

        const sunNode = {
            id: crypto.randomUUID(),
            systemId: newId,
            parentId: null,
            title: name,
            type: "sun",
            notes: `# ${name}\n\nEste es el Sol central de este tema de estudio. Añade planetas a su alrededor.`,
            attachments: [],
            orbitRadius: 0,
            orbitSpeed: 0,
            color: "#ffaa00",
            angle: 0
        };
        await db.saveNode(sunNode);

        modalNewSystem.classList.add("hidden");
        showToast(`Sistema "${name}" creado`);
        currentSystemId = newId;
        await loadSystemsList();
    });

    selectSystem.addEventListener("change", async (e) => {
        currentSystemId = e.target.value;
        localStorage.setItem("orbimind_selected_system_id", currentSystemId);
        await loadSystemData(currentSystemId);
        renderCustomOptions();
        showToast(`Cargado universo: ${selectSystem.options[selectSystem.selectedIndex].text}`);
    });

    btnDeleteSystem.addEventListener("click", () => {
        if (!currentSystemId) return;
        const systemName = selectSystem.options[selectSystem.selectedIndex].text;
        showConfirm(
            "¿Eliminar Sistema Solar?", 
            `¿Estás absolutamente seguro de que deseas eliminar el sistema solar "${systemName}" completo? Esto borrará permanentemente todos sus planetas, satélites, notas, tareas y archivos adjuntos.`,
            async () => {
                await db.deleteSystem(currentSystemId);
                showToast(`Sistema "${systemName}" eliminado`);
                
                // Reiniciar el ID actual para que loadSystemsList seleccione el primero disponible
                currentSystemId = null;
                await loadSystemsList();
            }
        );
    });

    // --- GESTIÓN DE ESTRELLAS FUGACES (TAREAS PENDIENTES) ---
    btnToggleStars.addEventListener("click", () => {
        activeStarsPanel.classList.toggle("open");
        btnToggleStars.classList.toggle("active");
        if (activeStarsPanel.classList.contains("open")) {
            closeSidebar();
            if (alienSearchPanel) alienSearchPanel.classList.remove("open");
            if (btnOpenSearch) btnOpenSearch.classList.remove("active");
            const customSelect = document.getElementById("customSystemSelect");
            if (customSelect) {
                const trigger = customSelect.querySelector(".custom-select-trigger");
                const optionsContainer = customSelect.querySelector(".custom-select-options");
                if (optionsContainer) optionsContainer.classList.add("hidden");
                if (trigger) trigger.classList.remove("open");
            }
        }
    });

    function renderCustomOptions() {
        const selectSystem = document.getElementById("solarSystemSelect");
        const customSelect = document.getElementById("customSystemSelect");
        if (!customSelect || !selectSystem) return;

        const triggerText = customSelect.querySelector(".custom-select-text");
        const optionsContainer = customSelect.querySelector(".custom-select-options");
        if (!triggerText || !optionsContainer) return;

        optionsContainer.innerHTML = "";
        
        const activeOption = selectSystem.options[selectSystem.selectedIndex];
        if (activeOption) {
            triggerText.textContent = activeOption.textContent;
        } else {
            triggerText.textContent = "Seleccionar...";
        }

        Array.from(selectSystem.options).forEach(opt => {
            const div = document.createElement("div");
            div.className = "custom-select-option";
            if (opt.value === selectSystem.value) {
                div.classList.add("active");
            }
            div.textContent = opt.textContent;
            div.addEventListener("click", () => {
                selectSystem.value = opt.value;
                selectSystem.dispatchEvent(new Event("change"));
                optionsContainer.classList.add("hidden");
                customSelect.querySelector(".custom-select-trigger").classList.remove("open");
            });
            optionsContainer.appendChild(div);
        });
    }

    function initCustomSelect() {
        const customSelect = document.getElementById("customSystemSelect");
        if (!customSelect) return;

        const trigger = customSelect.querySelector(".custom-select-trigger");
        const optionsContainer = customSelect.querySelector(".custom-select-options");
        if (!trigger || !optionsContainer) return;

        trigger.addEventListener("click", (e) => {
            e.stopPropagation();
            const isOpen = !optionsContainer.classList.contains("hidden");
            
            // Close other panels
            if (sidebar) sidebar.classList.remove("open");
            if (activeStarsPanel) activeStarsPanel.classList.remove("open");
            if (alienSearchPanel) alienSearchPanel.classList.remove("open");
            if (btnOpenSearch) btnOpenSearch.classList.remove("active");
            
            optionsContainer.classList.toggle("hidden", isOpen);
            trigger.classList.toggle("open", !isOpen);
        });

        document.addEventListener("click", () => {
            optionsContainer.classList.add("hidden");
            trigger.classList.remove("open");
        });
    }

    function refreshActiveStarsList() {
        const stars = engine.shootingStars || [];
        const count = stars.length;

        // Actualizar badges
        activeStarsBadge.textContent = count;
        activeStarsPanelCount.textContent = count;

        if (count > 0) {
            activeStarsBadge.classList.remove("hidden");
        } else {
            activeStarsBadge.classList.add("hidden");
        }

        // Limpiar lista
        activeStarsList.innerHTML = "";

        if (count === 0) {
            const emptyLi = document.createElement("li");
            emptyLi.className = "active-star-empty";
            emptyLi.textContent = "No hay estrellas activas en el momento.";
            activeStarsList.appendChild(emptyLi);
            return;
        }

        stars.forEach(star => {
            const li = document.createElement("li");
            li.className = "active-star-item";

            // Info de la estrella (clickable para detalle)
            const infoDiv = document.createElement("div");
            infoDiv.className = "active-star-info";
            
            const dot = document.createElement("span");
            dot.className = "active-star-dot";
            
            const titleSpan = document.createElement("span");
            titleSpan.className = "active-star-title";
            titleSpan.textContent = star.title;
            titleSpan.title = star.title;

            infoDiv.appendChild(dot);
            infoDiv.appendChild(titleSpan);

            // Botón para completar rápido
            const completeBtn = document.createElement("button");
            completeBtn.className = "active-star-complete-btn";
            completeBtn.innerHTML = "✓";
            completeBtn.title = "Completar tema";

            li.appendChild(infoDiv);
            li.appendChild(completeBtn);

            // Evento para abrir modal de detalle
            infoDiv.addEventListener("click", () => {
                activeClickedStar = star;
                const detailText = document.getElementById("starDetailMessage");
                detailText.textContent = `"${star.title}"`;
                
                // Pausar vuelo mientras se ve el detalle
                star.isActive = false;
                
                modalStarDetail.classList.remove("hidden");
            });

            // Evento para completado rápido desde el panel
            completeBtn.addEventListener("click", async (e) => {
                e.stopPropagation(); // Evitar abrir el detalle

                // Detonar explosión
                const px = star.isActive ? star.x : (engine.canvas.width / 2);
                const py = star.isActive ? star.y : (engine.canvas.height / 2);
                engine.triggerExplosion(px, py, "#ffeb3b");

                // Eliminar de base de datos y motor
                await db.deleteTask(star.id);
                engine.removeShootingStar(star.id);

                // Si esta estrella era la que teníamos seleccionada en detalle, ocultar modal
                if (activeClickedStar && activeClickedStar.id === star.id) {
                    modalStarDetail.classList.add("hidden");
                    activeClickedStar = null;
                }

                refreshActiveStarsList();
                showToast("¡Estrella estudiada! 🌟 Lluvia estelar completada.");
            });

            activeStarsList.appendChild(li);
        });
    }

    btnNewStar.addEventListener("click", () => {
        inputNewStar.value = "";
        modalNewStar.classList.remove("hidden");
        inputNewStar.focus();
    });

    btnCancelStarModal.addEventListener("click", () => {
        modalNewStar.classList.add("hidden");
    });

    btnCreateStarModal.addEventListener("click", async () => {
        const title = inputNewStar.value.trim();
        if (!title) return;

        const newId = crypto.randomUUID();
        const newTask = {
            id: newId,
            systemId: currentSystemId,
            title: title,
            createdAt: new Date()
        };

        await db.saveTask(newTask);
        engine.addShootingStar(newId, title); // Lanzar en el motor Canvas

        modalNewStar.classList.add("hidden");
        showToast("Estrella fugaz lanzada ⭐");
        refreshActiveStarsList();
        triggerCloudAutosave();
    });

    // Cerrar el detalle de estrella fugaz
    btnCloseStarModal.addEventListener("click", () => {
        modalStarDetail.classList.add("hidden");
        // Dejar que vuelva a volar
        if (activeClickedStar) {
            activeClickedStar.reset();
        }
        activeClickedStar = null;
    });

    // Marcar estrella como completada (Estudiada)
    btnCompleteStar.addEventListener("click", async () => {
        if (!activeClickedStar) return;
        
        // 1. Detonar explosión de partículas en la coordenada de la estrella en pantalla
        engine.triggerExplosion(activeClickedStar.x, activeClickedStar.y, "#ffeb3b");
        
        // 2. Eliminar de la base de datos
        await db.deleteTask(activeClickedStar.id);
        
        // 3. Remover del motor de canvas
        engine.removeShootingStar(activeClickedStar.id);

        modalStarDetail.classList.add("hidden");
        activeClickedStar = null;
        showToast("¡Estrella estudiada! 🌟 Lluvia estelar completada.");
        refreshActiveStarsList();
        triggerCloudAutosave();
    });

    // --- BOTONES DE CONTROL DE CAMARA ---
    btnPlayPause.addEventListener("click", () => {
        engine.isPlaying = !engine.isPlaying;
        btnPlayPause.classList.toggle("active", engine.isPlaying);
        btnPlayPause.innerHTML = `<span class="icon">${engine.isPlaying ? "⏸" : "▶"}</span>`;
        showToast(engine.isPlaying ? "Rotación activa" : "Rotación pausada", "info");
    });

    btnZoomIn.addEventListener("click", () => {
        engine.zoom = Math.min(engine.zoom + 0.25, 4.0);
    });

    btnZoomOut.addEventListener("click", () => {
        engine.zoom = Math.max(engine.zoom - 0.25, 0.25);
    });

    btnResetView.addEventListener("click", () => {
        engine.resetView();
        showToast("Cámara reestablecida", "info");
    });

    // ==========================================
    // MODO ESTUDIO - LÓGICA Y INTERACCIONES
    // ==========================================
    const studyWorkspace = document.getElementById("studyWorkspace");
    const studyBreadcrumbs = document.getElementById("studyBreadcrumbs");
    const studyNodeBadge = document.getElementById("studyNodeBadge");
    const studyNodeTitle = document.getElementById("studyNodeTitle");
    const studyTimerDisplay = document.getElementById("studyTimerDisplay");
    const btnStartPauseTimer = document.getElementById("btnStartPauseTimer");
    const btnResetTimer = document.getElementById("btnResetTimer");
    const btnSpeakText = document.getElementById("btnSpeakText");
    const btnToggleRecall = document.getElementById("btnToggleRecall");
    const btnZoomTextOut = document.getElementById("btnZoomTextOut");
    const btnZoomTextIn = document.getElementById("btnZoomTextIn");
    const btnCloseStudy = document.getElementById("btnCloseStudy");
    const studyContent = document.getElementById("studyContent");
    const studyAttachmentsList = document.getElementById("studyAttachmentsList");

    let pomodoroInterval = null;
    let pomodoroTimeLeft = 25 * 60;
    let pomodoroRunning = false;
    let studyFontSize = 16;
    let studySpeaking = false;
    let studyUtterance = null;
    let recallRevealAll = false;

    function formatPomodoroTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function updatePomodoroDisplay() {
        studyTimerDisplay.textContent = formatPomodoroTime(pomodoroTimeLeft);
    }

    function playPomodoroChime() {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const playTone = (freq, start, duration) => {
                const osc = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                osc.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                osc.frequency.value = freq;
                gainNode.gain.setValueAtTime(0, start);
                gainNode.gain.linearRampToValueAtTime(0.15, start + 0.05);
                gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);
                osc.start(start);
                osc.stop(start + duration);
            };
            const now = audioCtx.currentTime;
            playTone(523.25, now, 0.8); // C5
            playTone(659.25, now + 0.15, 0.8); // E5
            playTone(783.99, now + 0.3, 1.2); // G5
        } catch (e) {
            console.error("Audio Context not supported or blocked", e);
        }
    }

    function startPomodoro() {
        if (pomodoroRunning) return;
        pomodoroRunning = true;
        btnStartPauseTimer.textContent = "⏸";
        btnStartPauseTimer.title = "Pausar Temporizador";
        
        const widget = document.querySelector('.study-timer-widget');
        if (widget) widget.classList.add('active');

        pomodoroInterval = setInterval(() => {
            if (pomodoroTimeLeft > 0) {
                pomodoroTimeLeft--;
                updatePomodoroDisplay();
            } else {
                clearInterval(pomodoroInterval);
                pomodoroInterval = null;
                pomodoroRunning = false;
                btnStartPauseTimer.textContent = "▶";
                if (widget) widget.classList.remove('active');
                playPomodoroChime();
                showToast("¡Sesión de estudio completada!");
            }
        }, 1000);
    }

    function pausePomodoro() {
        if (!pomodoroRunning) return;
        pomodoroRunning = false;
        btnStartPauseTimer.textContent = "▶";
        btnStartPauseTimer.title = "Iniciar Temporizador";
        const widget = document.querySelector('.study-timer-widget');
        if (widget) widget.classList.remove('active');
        clearInterval(pomodoroInterval);
        pomodoroInterval = null;
    }

    function resetPomodoro() {
        pausePomodoro();
        pomodoroTimeLeft = 25 * 60;
        updatePomodoroDisplay();
    }

    function toggleStudySpeech() {
        if (studySpeaking) {
            window.speechSynthesis.cancel();
            studySpeaking = false;
            btnSpeakText.innerHTML = '<span class="icon">🔊</span> <span class="lbl-btn">Leer</span>';
            btnSpeakText.classList.remove('active');
        } else {
            window.speechSynthesis.cancel();
            const text = studyContent.innerText.trim();
            if (!text) return;
            
            studyUtterance = new SpeechSynthesisUtterance(text);
            studyUtterance.lang = 'es-ES';
            studyUtterance.onend = () => {
                studySpeaking = false;
                btnSpeakText.innerHTML = '<span class="icon">🔊</span> <span class="lbl-btn">Leer</span>';
                btnSpeakText.classList.remove('active');
            };
            studyUtterance.onerror = () => {
                studySpeaking = false;
                btnSpeakText.innerHTML = '<span class="icon">🔊</span> <span class="lbl-btn">Leer</span>';
                btnSpeakText.classList.remove('active');
            };
            studySpeaking = true;
            btnSpeakText.innerHTML = '<span class="icon">⏹️</span> <span class="lbl-btn">Detener</span>';
            btnSpeakText.classList.add('active');
            window.speechSynthesis.speak(studyUtterance);
        }
    }

    function setupRecall() {
        const cards = studyContent.querySelectorAll('.recall-card');
        cards.forEach(card => {
            const question = card.querySelector('.recall-question');
            const answer = card.querySelector('.recall-answer');
            if (question && answer) {
                question.addEventListener('click', () => {
                    const isRevealed = card.classList.toggle('revealed');
                    answer.style.display = isRevealed ? 'block' : 'none';
                });
            }
        });
    }

    function resetRecallToggle() {
        recallRevealAll = false;
        btnToggleRecall.classList.remove('active');
        btnToggleRecall.innerHTML = '<span class="icon">👁️</span> <span class="lbl-btn">Active Recall</span>';
    }

    function resetStudyFontSize() {
        studyFontSize = 16;
        studyContent.style.setProperty('--study-font-size', '16px');
    }

    function navigateToNode(targetNode, searchQuery = null, isFuzzy = false) {
        if (!targetNode) return;

        // Perform complete orbit/focus navigation first
        const targetParentId = targetNode.type === "sun" ? targetNode.id : targetNode.parentId;
        if (currentParentId !== targetParentId) {
            currentParentId = targetParentId;
            engine.setNodes(nodesList, currentParentId);
        }

        // Reconstruct orbital history
        orbitalHistory = [];
        let tempParentId = targetParentId;
        let tempNode = nodesList.find(n => n.id === tempParentId);
        while (tempNode && tempNode.parentId) {
            orbitalHistory.unshift(tempNode.parentId);
            tempNode = nodesList.find(n => n.id === tempNode.parentId);
        }

        if (orbitalHistory.length === 0) {
            btnGoParent.disabled = true;
            btnGoParent.classList.add("disabled");
        } else {
            btnGoParent.disabled = false;
            btnGoParent.classList.remove("disabled");
        }

        engine.selectedNode = targetNode;
        engine.followedNode = targetNode;
        openSidebar(targetNode);
        updateAddButtons();
        openStudyWorkspace(targetNode, true, searchQuery, isFuzzy);
    }

    function openStudyWorkspace(node, keepTimer = false, searchQuery = null, isFuzzy = false) {
        if (!node) return;

        if (!keepTimer) {
            resetPomodoro();
            resetStudyFontSize();
            resetRecallToggle();
        }
        if (studySpeaking) {
            window.speechSynthesis.cancel();
            studySpeaking = false;
            btnSpeakText.innerHTML = '<span class="icon">🔊</span> <span class="lbl-btn">Leer</span>';
            btnSpeakText.classList.remove('active');
        }

        // Breadcrumbs
        const crumbs = [];
        let curr = node;
        while (crumbs.length < 10 && curr) {
            crumbs.unshift(curr);
            if (curr.parentId) {
                curr = nodesList.find(n => n.id === curr.parentId);
            } else {
                curr = null;
            }
        }
        
        studyBreadcrumbs.innerHTML = "";
        crumbs.slice(0, -1).forEach((c, idx) => {
            const span = document.createElement("span");
            span.className = "breadcrumb-item";
            span.textContent = c.title;
            span.style.cursor = "pointer";
            span.addEventListener("click", () => {
                navigateToNode(c);
            });
            studyBreadcrumbs.appendChild(span);
            if (idx < crumbs.length - 2) {
                const separator = document.createElement("span");
                separator.textContent = " > ";
                studyBreadcrumbs.appendChild(separator);
            }
        });

        studyNodeTitle.textContent = node.title;
        studyNodeBadge.textContent = node.type.toUpperCase();
        studyNodeBadge.className = `study-badge ${node.type}`;

        const nodeColor = getNodeColor(node);
        studyContent.innerHTML = parseMarkdown(node.notes || "", nodeColor);

        setupRecall();
        renderMath(studyContent);

        // Populate study attachments
        studyAttachmentsList.innerHTML = "";
        if (node.attachments && node.attachments.length > 0) {
            node.attachments.forEach(file => {
                const card = document.createElement("div");
                card.className = "study-attachment-card";
                
                const isPdf = file.name.split('.').pop().toLowerCase() === 'pdf';
                
                const info = document.createElement("div");
                info.className = "study-attachment-info";
                info.innerHTML = `
                    <span class="attachment-icon">${isPdf ? '📄' : '🖼️'}</span>
                    <span class="study-attachment-name" title="${file.name}">${file.name}</span>
                `;
                
                const preview = document.createElement("div");
                preview.className = "study-attachment-preview";
                if (isPdf) {
                    preview.innerHTML = `<span class="study-attachment-preview-pdf">📄</span>`;
                } else {
                    preview.innerHTML = `<img src="${file.data}" alt="${file.name}">`;
                }
                
                card.appendChild(info);
                card.appendChild(preview);
                
                card.addEventListener("click", () => {
                    openAttachment(file);
                });
                
                studyAttachmentsList.appendChild(card);
            });
        } else {
            const noAttachments = document.createElement("div");
            noAttachments.style.fontSize = "13px";
            noAttachments.style.color = "var(--text-muted)";
            noAttachments.style.textAlign = "center";
            noAttachments.style.padding = "20px 0";
            noAttachments.textContent = "Sin archivos adjuntos";
            studyAttachmentsList.appendChild(noAttachments);
        }

        // Populate quick navigation dock
        updateStudyQuickNav(node);

        studyWorkspace.classList.remove("hidden");

        // Remove any previous highlights/helpers
        removeAlienHighlights();

        if (searchQuery) {
            // Wait a brief moment for the browser to lay out the visible workspace
            setTimeout(() => {
                const highlightSpan = highlightSearchQueryInStudy(searchQuery, isFuzzy);
                if (highlightSpan) {
                    const container = document.querySelector(".study-document-container");
                    if (container) {
                        highlightSpan.scrollIntoView({ behavior: "smooth", block: "center" });
                    }
                    // Wait for layout to settle and scroll to execute before positioning the helper
                    requestAnimationFrame(() => {
                        createAlienTextHelper(highlightSpan);
                    });
                }
            }, 250);
        }
    }

    function removeAlienHighlights() {
        const helper = studyContent.querySelector(".alien-text-helper");
        if (helper) {
            helper.remove();
        }

        const highlights = studyContent.querySelectorAll(".alien-search-highlight");
        highlights.forEach(span => {
            const parent = span.parentNode;
            if (parent) {
                const textNode = document.createTextNode(span.textContent);
                parent.replaceChild(textNode, span);
            }
        });
        studyContent.normalize(); // merge text nodes
    }

    function highlightSearchQueryInStudy(query, isFuzzy = false) {
        try {
            if (!query) return null;
            
            // Strategy 1: Search exact query case-insensitively (or accent-insensitively)
            let found = highlightTerm(query);
            if (found) {
                const span = studyContent.querySelector(".alien-search-highlight");
                if (span && isFuzzy) {
                    span.classList.add("fuzzy-highlight");
                }
                return span;
            }
            
            // Strategy 2: Search individual words (longer than 2 chars)
            const words = query.split(/\s+/).filter(w => w.length > 2);
            for (const word of words) {
                found = highlightTerm(word);
                if (found) {
                    const span = studyContent.querySelector(".alien-search-highlight");
                    if (span && isFuzzy) {
                        span.classList.add("fuzzy-highlight");
                    }
                    return span;
                }
            }
            
            return null;
        } catch (err) {
            console.error("[AlienSearch] Error in highlightSearchQueryInStudy:", err);
            return null;
        }

        function indexOfIgnoreAccents(haystack, needle) {
            const normHaystack = normalizeText(haystack);
            const normNeedle = normalizeText(needle);
            return normHaystack.indexOf(normNeedle);
        }

        function highlightTerm(term) {
            const normalizedQuery = normalizeText(term);
            if (!normalizedQuery) return false;
            let matchesFound = false;

            function traverse(node) {
                if (node.nodeType === Node.TEXT_NODE) {
                    const textContent = node.textContent;
                    const index = indexOfIgnoreAccents(textContent, normalizedQuery);
                    if (index !== -1) {
                        const parent = node.parentNode;
                        if (!parent) return;
                        const tag = (parent.tagName || "").toUpperCase();
                        const isInsideKatex = typeof parent.closest === "function" && 
                            (parent.closest('.katex') || parent.closest('.katex-display'));
                        if (tag === "SCRIPT" || tag === "STYLE" || isInsideKatex) {
                            return;
                        }
                        
                        const beforeText = textContent.substring(0, index);
                        const matchText = textContent.substring(index, index + term.length);
                        const afterText = textContent.substring(index + term.length);
                        
                        const fragment = document.createDocumentFragment();
                        if (beforeText) {
                            fragment.appendChild(document.createTextNode(beforeText));
                        }
                        
                        const highlightSpan = document.createElement("span");
                        highlightSpan.className = "alien-search-highlight";
                        highlightSpan.textContent = matchText;
                        fragment.appendChild(highlightSpan);
                        
                        if (afterText) {
                            const afterNode = document.createTextNode(afterText);
                            fragment.appendChild(afterNode);
                            traverse(afterNode);
                        }
                        
                        parent.replaceChild(fragment, node);
                        matchesFound = true;
                    }
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    const children = Array.from(node.childNodes);
                    for (let i = 0; i < children.length; i++) {
                        traverse(children[i]);
                    }
                }
            }

            traverse(studyContent);
            return matchesFound;
        }
    }

    function createAlienTextHelper(highlightSpan) {
        try {
            const existingHelper = studyContent.querySelector(".alien-text-helper");
            if (existingHelper) existingHelper.remove();

            const helper = document.createElement("div");
            helper.className = "alien-text-helper";
            
            const phrases = [
                "¡Aquí está, humano!",
                "¡Encontré la señal!",
                "¡Apuntes localizados!",
                "¡Telemetría exacta!",
                "¡Rastreo exitoso!"
            ];
            const phrase = phrases[Math.floor(Math.random() * phrases.length)];

            // Order: bubble on top, avatar on bottom
            helper.innerHTML = `
                <div class="alien-helper-bubble">${phrase}</div>
                <div class="alien-helper-avatar">👽</div>
            `;
            
            // Inyectamos el alíen DIRECTAMENTE dentro del span resaltado para anclarlo milimétricamente
            highlightSpan.appendChild(helper);

            // Control de desbordamiento superior mediante getBoundingClientRect
            const spanRect = highlightSpan.getBoundingClientRect();
            const contentRect = studyContent.getBoundingClientRect();
            const relativeTop = spanRect.top - contentRect.top;

            // Si está muy cerca del borde superior (menos de 95px), lo posicionamos debajo
            if (relativeTop < 95) {
                helper.classList.add("position-below");
            } else {
                helper.classList.remove("position-below");
            }

            requestAnimationFrame(() => {
                helper.classList.add("show");
            });

            setTimeout(() => {
                helper.classList.remove("show");
                
                const highlights = studyContent.querySelectorAll(".alien-search-highlight");
                highlights.forEach(span => span.classList.add("fade-out"));

                setTimeout(() => {
                    removeAlienHighlights();
                }, 500);
            }, 5000);
        } catch (err) {
            console.error("[AlienSearch] Error in createAlienTextHelper:", err);
        }
    }

    function updateStudyQuickNav(currentNode) {
        const quickNavContainer = document.getElementById("studyQuickNav");
        if (!quickNavContainer) return;

        quickNavContainer.innerHTML = "";

        const parentNode = nodesList.find(n => n.id === currentNode.parentId);

        // 1. Render Header
        const header = document.createElement("div");
        header.className = "mini-system-header";

        const titleSpan = document.createElement("span");
        titleSpan.className = "mini-system-title";
        titleSpan.textContent = `SISTEMA DE: ${currentNode.title}`;
        titleSpan.title = `Sistema de ${currentNode.title}`;

        const upBtn = document.createElement("button");
        upBtn.className = "mini-system-up-btn";
        upBtn.innerHTML = "⬆";
        upBtn.title = parentNode ? `Subir a ${parentNode.title}` : "Sin nodo superior";
        
        if (parentNode) {
            upBtn.addEventListener("click", () => {
                navigateToNode(parentNode);
            });
        } else {
            upBtn.disabled = true;
        }

        header.appendChild(titleSpan);
        header.appendChild(upBtn);
        quickNavContainer.appendChild(header);

        // 2. Render Canvas
        const canvas = document.createElement("canvas");
        canvas.id = "miniSystemCanvas";
        canvas.width = 160;
        canvas.height = 130;
        canvas.style.width = "100%";
        canvas.style.height = "auto";
        canvas.style.maxWidth = "160px";
        quickNavContainer.appendChild(canvas);

        // 3. Start Animation
        startMiniMapAnimation(currentNode);
    }

    function startMiniMapAnimation(currentNode) {
        const canvas = document.getElementById("miniSystemCanvas");
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const width = canvas.width;
        const height = canvas.height;
        const x0 = width / 2;
        const y0 = height / 2;

        if (miniMapAnimationFrameId) {
            cancelAnimationFrame(miniMapAnimationFrameId);
            miniMapAnimationFrameId = null;
        }

        const orbiters = nodesList
            .filter(n => n.parentId === currentNode.id)
            .sort((a, b) => (a.orbitRadius || 0) - (b.orbitRadius || 0));

        let hoveredNode = null;
        let mousePos = null;
        const drawnOrbiters = [];
        const startTime = performance.now();

        function onMouseMove(e) {
            const rect = canvas.getBoundingClientRect();
            const mouseX = (e.clientX - rect.left) * (width / rect.width);
            const mouseY = (e.clientY - rect.top) * (height / rect.height);
            mousePos = { x: mouseX, y: mouseY };

            let found = null;
            for (const orb of drawnOrbiters) {
                const dx = mouseX - orb.x;
                const dy = mouseY - orb.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist <= Math.max(orb.r + 5, 10)) {
                    found = orb.node;
                    break;
                }
            }

            if (found !== hoveredNode) {
                hoveredNode = found;
                canvas.style.cursor = hoveredNode ? "pointer" : "default";
            }
        }

        function onMouseLeave() {
            hoveredNode = null;
            mousePos = null;
            canvas.style.cursor = "default";
        }

        function onClick() {
            if (hoveredNode) {
                navigateToNode(hoveredNode);
            }
        }

        canvas.addEventListener("mousemove", onMouseMove);
        canvas.addEventListener("mouseleave", onMouseLeave);
        canvas.addEventListener("click", onClick);

        const cleanupListeners = () => {
            canvas.removeEventListener("mousemove", onMouseMove);
            canvas.removeEventListener("mouseleave", onMouseLeave);
            canvas.removeEventListener("click", onClick);
        };

        function tick() {
            if (!document.getElementById("miniSystemCanvas")) {
                cleanupListeners();
                return;
            }

            ctx.clearRect(0, 0, width, height);
            const elapsedSeconds = (performance.now() - startTime) / 1000;
            drawnOrbiters.length = 0;

            orbiters.forEach((orbiter, index) => {
                const miniOrbitRadius = 22 + index * 9;
                
                ctx.save();
                ctx.strokeStyle = "rgba(0, 242, 254, 0.12)";
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.arc(x0, y0, miniOrbitRadius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();

                const currentAngle = (orbiter.angle || 0) + elapsedSeconds * (orbiter.orbitSpeed || 0.5) * 0.4;
                const ox = x0 + Math.cos(currentAngle) * miniOrbitRadius;
                const oy = y0 + Math.sin(currentAngle) * miniOrbitRadius;
                const oRadius = orbiter.type === "satellite" ? 4.5 : (orbiter.type === "moon" ? 5 : 5.5);

                drawnOrbiters.push({
                    node: orbiter,
                    x: ox,
                    y: oy,
                    r: oRadius
                });
            });

            const centerColor = getNodeColor(currentNode);
            const centerColorRgb = hexToRgb(centerColor) || { r: 255, g: 170, b: 0 };
            
            ctx.save();
            const centerGlow = ctx.createRadialGradient(x0, y0, 2, x0, y0, 12);
            centerGlow.addColorStop(0, `rgba(${centerColorRgb.r}, ${centerColorRgb.g}, ${centerColorRgb.b}, 0.45)`);
            centerGlow.addColorStop(1, `rgba(${centerColorRgb.r}, ${centerColorRgb.g}, ${centerColorRgb.b}, 0)`);
            ctx.fillStyle = centerGlow;
            ctx.beginPath();
            ctx.arc(x0, y0, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            
            ctx.save();
            ctx.fillStyle = centerColor;
            let centerRadius = 6;
            if (currentNode.type === "sun") centerRadius = 8;
            else if (currentNode.type === "planet") centerRadius = 6.5;
            
            ctx.beginPath();
            ctx.arc(x0, y0, centerRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            drawnOrbiters.forEach(orb => {
                const orbiterColor = getNodeColor(orb.node);
                const orbiterColorRgb = hexToRgb(orbiterColor) || { r: 255, g: 255, b: 255 };
                const isHovered = hoveredNode && hoveredNode.id === orb.node.id;

                ctx.save();
                if (isHovered) {
                    const orbGlow = ctx.createRadialGradient(orb.x, orb.y, 1, orb.x, orb.y, 10);
                    orbGlow.addColorStop(0, `rgba(${orbiterColorRgb.r}, ${orbiterColorRgb.g}, ${orbiterColorRgb.b}, 0.7)`);
                    orbGlow.addColorStop(1, `rgba(${orbiterColorRgb.r}, ${orbiterColorRgb.g}, ${orbiterColorRgb.b}, 0)`);
                    ctx.fillStyle = orbGlow;
                    ctx.beginPath();
                    ctx.arc(orb.x, orb.y, 10, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.strokeStyle = "#ffffff";
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.arc(orb.x, orb.y, orb.r + 2.5, 0, Math.PI * 2);
                    ctx.stroke();
                } else {
                    const orbGlow = ctx.createRadialGradient(orb.x, orb.y, 1, orb.x, orb.y, 6);
                    orbGlow.addColorStop(0, `rgba(${orbiterColorRgb.r}, ${orbiterColorRgb.g}, ${orbiterColorRgb.b}, 0.35)`);
                    orbGlow.addColorStop(1, `rgba(${orbiterColorRgb.r}, ${orbiterColorRgb.g}, ${orbiterColorRgb.b}, 0)`);
                    ctx.fillStyle = orbGlow;
                    ctx.beginPath();
                    ctx.arc(orb.x, orb.y, 6, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.fillStyle = orbiterColor;
                ctx.beginPath();
                ctx.arc(orb.x, orb.y, isHovered ? orb.r + 1 : orb.r, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            if (hoveredNode && mousePos) {
                ctx.save();
                ctx.font = "600 10px 'Outfit', sans-serif";
                const text = hoveredNode.title;
                const textWidth = ctx.measureText(text).width;
                const padX = 8;
                const padY = 5;
                const rectW = textWidth + padX * 2;
                const rectH = 18;

                let tx = mousePos.x - rectW / 2;
                let ty = mousePos.y - 25;

                tx = Math.max(5, Math.min(width - rectW - 5, tx));
                ty = Math.max(5, Math.min(height - rectH - 5, ty));

                ctx.fillStyle = "rgba(10, 12, 30, 0.9)";
                ctx.strokeStyle = "rgba(0, 242, 254, 0.45)";
                ctx.lineWidth = 1;
                ctx.beginPath();
                if (ctx.roundRect) {
                    ctx.roundRect(tx, ty, rectW, rectH, 5);
                } else {
                    ctx.rect(tx, ty, rectW, rectH);
                }
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = "#ffffff";
                ctx.textAlign = "left";
                ctx.textBaseline = "middle";
                ctx.fillText(text, tx + padX, ty + rectH / 2);
                ctx.restore();
            }

            miniMapAnimationFrameId = requestAnimationFrame(tick);
        }

        miniMapAnimationFrameId = requestAnimationFrame(tick);
    }

    function closeStudyWorkspace() {
        studyWorkspace.classList.add("hidden");
        pausePomodoro();
        if (studySpeaking) {
            window.speechSynthesis.cancel();
            studySpeaking = false;
            btnSpeakText.innerHTML = '<span class="icon">🔊</span> <span class="lbl-btn">Leer</span>';
            btnSpeakText.classList.remove('active');
        }
        if (miniMapAnimationFrameId) {
            cancelAnimationFrame(miniMapAnimationFrameId);
            miniMapAnimationFrameId = null;
        }
    }

    btnStartPauseTimer.addEventListener("click", () => {
        if (pomodoroRunning) {
            pausePomodoro();
        } else {
            startPomodoro();
        }
    });

    btnResetTimer.addEventListener("click", resetPomodoro);
    btnSpeakText.addEventListener("click", toggleStudySpeech);

    btnToggleRecall.addEventListener("click", () => {
        recallRevealAll = !recallRevealAll;
        const cards = studyContent.querySelectorAll('.recall-card');
        cards.forEach(card => {
            const answer = card.querySelector('.recall-answer');
            if (recallRevealAll) {
                card.classList.add('revealed');
                if (answer) answer.style.display = 'block';
            } else {
                card.classList.remove('revealed');
                if (answer) answer.style.display = 'none';
            }
        });
        if (recallRevealAll) {
            btnToggleRecall.classList.add('active');
            btnToggleRecall.innerHTML = '<span class="icon">🙈</span> <span class="lbl-btn">Ocultar Respuestas</span>';
        } else {
            btnToggleRecall.classList.remove('active');
            btnToggleRecall.innerHTML = '<span class="icon">👁️</span> <span class="lbl-btn">Active Recall</span>';
        }
    });

    btnZoomTextIn.addEventListener("click", () => {
        studyFontSize = Math.min(28, studyFontSize + 2);
        studyContent.style.setProperty('--study-font-size', studyFontSize + 'px');
    });

    btnZoomTextOut.addEventListener("click", () => {
        studyFontSize = Math.max(12, studyFontSize - 2);
        studyContent.style.setProperty('--study-font-size', studyFontSize + 'px');
    });

    btnCloseStudy.addEventListener("click", closeStudyWorkspace);

    // Cargar inicial
    await loadSystemsList();

    // Inicializar tutorial
    initTutorial(nodesList, currentParentId, engine);

    // --- TECLADO MATEMÁTICO CIENTÍFICO ---
    if (btnToggleMathKeyboard && mathKeyboard) {
        btnToggleMathKeyboard.addEventListener("click", () => {
            mathKeyboard.classList.toggle("hidden");
            btnToggleMathKeyboard.classList.toggle("active");
        });

        const mathButtons = mathKeyboard.querySelectorAll(".math-btn");
        mathButtons.forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                const snippet = btn.getAttribute("data-snippet");
                const offset = parseInt(btn.getAttribute("data-offset") || "0", 10);
                insertSnippet(textNodeNotes, snippet, offset);
            });
        });
    }

    // --- BUSCADOR INTELIGENTE ALÍEN ---
    function playScanSound() {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            osc.type = "sine";
            osc.frequency.setValueAtTime(150, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1100, audioCtx.currentTime + 1.8);
            
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.8);
            
            osc.start();
            osc.stop(audioCtx.currentTime + 1.8);
        } catch (e) {
            console.warn("[AlienSearch] AudioContext error al reproducir sonido:", e);
        }
    }

    let typeWriterInterval = null;

    if (alienSearchPanel) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === "class") {
                    const isOpen = alienSearchPanel.classList.contains("open");
                    if (!isOpen && typeWriterInterval) {
                        clearInterval(typeWriterInterval);
                        typeWriterInterval = null;
                    }
                }
            });
        });
        observer.observe(alienSearchPanel, { attributes: true });
    }

    function typeSpeechText(text, speed = 20) {
        if (typeWriterInterval) clearInterval(typeWriterInterval);
        alienSpeechText.textContent = "";
        let index = 0;
        
        typeWriterInterval = setInterval(() => {
            if (index < text.length) {
                alienSpeechText.textContent += text.charAt(index);
                if (index % 4 === 0) {
                    playSpeechTickSound();
                }
                index++;
            } else {
                clearInterval(typeWriterInterval);
                typeWriterInterval = null;
            }
        }, speed);
    }

    function playSpeechTickSound() {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            osc.type = "sine";
            osc.frequency.setValueAtTime(650 + Math.random() * 150, audioCtx.currentTime);
            
            gainNode.gain.setValueAtTime(0.015, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.04);
            
            osc.start();
            osc.stop(audioCtx.currentTime + 0.05);
        } catch (e) {
            // Ignore AudioContext errors
        }
    }

    function getColorNameSpanish(hex) {
        if (!hex) return "brillante";
        const h = hex.toLowerCase();
        if (h === "#ffd600" || h === "#ffd200" || h === "#ffeb3b") return "dorado";
        if (h === "#00f2fe" || h === "#00d2ff" || h === "#00c3ff") return "azul brillante";
        if (h === "#00ff87" || h === "#00ffaa") return "verde neón";
        if (h === "#ff3366" || h === "#ff4081") return "rosado brillante";
        if (h === "#a8afb8" || h === "#9e9e9e") return "gris metálico";
        if (h === "#9c27b0" || h === "#e040fb" || h === "#5a189a") return "púrpura";
        if (h === "#ff9800" || h === "#ff5722") return "naranja";
        if (h === "#03045e" || h === "#0077b6") return "azul profundo";
        
        if (h.includes("ff") && h.includes("00") && h.slice(1,3) === "ff") return "rosado";
        if (h.slice(1,3) === "00") return "celeste";
        return "brillante";
    }

    function describeCelestialBody(node) {
        if (!node) return "un misterioso cuerpo celeste";
        
        const nodeColor = getColorNameSpanish(node.color || (typeof getNodeColor === "function" ? getNodeColor(node) : ""));
        const parent = nodesList.find(n => n.id === node.parentId);
        const parentColor = parent ? getColorNameSpanish(parent.color || (typeof getNodeColor === "function" ? getNodeColor(parent) : "")) : "";
        
        if (node.type === "sun") {
            return `el gran Sol central de color ${nodeColor}`;
        }
        
        if (node.type === "planet") {
            return `un planeta de color ${nodeColor}`;
        }
        
        if (node.type === "planetoid") {
            if (parent && parent.type === "planet") {
                return `un pequeño planetoide de color ${nodeColor} cercano al planeta de color ${parentColor}`;
            }
            return `un pequeño planetoide de color ${nodeColor}`;
        }
        
        if (node.type === "moon") {
            if (parent && parent.type === "planet") {
                return `una luna de color ${nodeColor} que orbita al planeta de color ${parentColor}`;
            }
            return `una pequeña luna de color ${nodeColor}`;
        }
        
        if (node.type === "satellite") {
            if (parent && parent.type === "planet") {
                return `un satélite metálico de color ${nodeColor} que orbita al planeta de color ${parentColor}`;
            }
            return `un rápido satélite de color ${nodeColor}`;
        }
        
        return `un cuerpo celeste de color ${nodeColor}`;
    }

    function normalizeText(text) {
        if (!text) return "";
        return text
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Remove accents
            .toLowerCase()
            .trim();
    }

    function levenshteinDistance(s1, s2) {
        const m = s1.length;
        const n = s2.length;
        const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (s1[i - 1] === s2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = Math.min(
                        dp[i - 1][j] + 1,    // Deletion
                        dp[i][j - 1] + 1,    // Insertion
                        dp[i - 1][j - 1] + 1 // Substitution
                    );
                }
            }
        }
        return dp[m][n];
    }

    function getSearchMatchScore(node, query) {
        const normQuery = normalizeText(query);
        const normTitle = normalizeText(node.title || "");
        const normNotes = normalizeText(node.notes || "");
        
        if (!normQuery) return { matched: false, score: 0 };

        // 1. Coincidencia exacta o substring (sin acentos, case-insensitive)
        if (normTitle.includes(normQuery)) {
            const score = normTitle === normQuery ? 1.0 : 0.9;
            return { matched: true, score: score, type: "exact_title" };
        }
        if (normNotes.includes(normQuery)) {
            return { matched: true, score: 0.7, type: "exact_notes" };
        }
        
        // 2. Coincidencia difusa por distancia de Levenshtein palabra por palabra
        const queryWords = normQuery.split(/\s+/).filter(w => w.length > 2);
        const titleWords = normTitle.split(/\s+/).filter(w => w.length > 2);
        
        let fuzzyTitleMatch = false;
        let matchedWord = "";
        
        for (const qWord of queryWords) {
            for (const tWord of titleWords) {
                const dist = levenshteinDistance(qWord, tWord);
                const maxAllowedDist = Math.max(1, Math.floor(tWord.length * 0.35)); // 35% de la longitud
                if (dist <= maxAllowedDist) {
                    fuzzyTitleMatch = true;
                    matchedWord = tWord;
                    break;
                }
            }
            if (fuzzyTitleMatch) break;
        }
        
        if (fuzzyTitleMatch) {
            return { matched: true, score: 0.4, type: "fuzzy_title", matchedWord: matchedWord };
        }
        
        return { matched: false, score: 0 };
    }

    async function performAlienSearch() {
        const query = alienSearchInput.value.trim();
        if (!query) {
            typeSpeechText("¡Oye, humano! Escribe algo en la caja para que pueda rastrear el espacio.");
            return;
        }

        // 0. Limpiar coincidencias previas
        nodesList.forEach(n => n.isSearchMatch = false);
        searchResultsList.innerHTML = "";

        // Obtener puntuaciones de coincidencias (exactas y difusas)
        const matchData = [];
        nodesList.forEach(node => {
            const matchResult = getSearchMatchScore(node, query);
            if (matchResult.matched) {
                matchData.push({
                    node: node,
                    score: matchResult.score,
                    type: matchResult.type,
                    isFuzzy: matchResult.type === "fuzzy_title"
                });
            }
        });

        // Ordenar por relevancia
        matchData.sort((a, b) => b.score - a.score);
        const matches = matchData.map(m => m.node);

        // Construir la ruta de escaneo de la nave
        const scanPath = [];
        const candidates = nodesList.filter(n => n.id !== currentParentId);
        if (candidates.length > 0) {
            const shuffled = [...candidates].sort(() => 0.5 - Math.random());
            scanPath.push(...shuffled.slice(0, 2));
        }
        
        if (matches.length > 0) {
            const matchedNode = matches[0];
            const idx = scanPath.indexOf(matchedNode);
            if (idx > -1) scanPath.splice(idx, 1);
            scanPath.push(matchedNode);
        } else {
            if (scanPath.length === 0) {
                const centerNode = nodesList.find(n => n.id === currentParentId);
                if (centerNode) scanPath.push(centerNode);
            }
        }

        // 1. Reproducir sonido espacial
        playScanSound();

        // 2. Activar onda de radar en canvas y animación UFO
        engine.scanPulseActive = true;
        engine.scanPulseProgress = 0;
        engine.startAlienScanAnimation(scanPath, 1800);

        // 3. Mostrar estado de escaneo y telemetría de HUD
        alienSearchPanel.classList.add("scanning");
        alienScanningState.classList.remove("hidden");
        btnRunSearch.disabled = true;

        const telemetryQuery = document.getElementById("scanTelemetryQuery");
        const telemetryStatus = document.getElementById("scanTelemetryStatus");
        if (telemetryQuery) telemetryQuery.textContent = "TARGET: " + query.toUpperCase();
        if (telemetryStatus) telemetryStatus.textContent = "SYS.SCAN: IN_PROGRESS";
        
        typeSpeechText("Rastreando anomalías y escaneando el tejido del espacio-tiempo en busca de '" + query + "'...", 18);

        let progress = 0;
        scanningProgressFill.style.width = "0%";
        
        const sectors = ["SECTOR_ALPHA", "SECTOR_ORBITAL", "DEEP_SPACE", "ASTEROID_BELT", "HYPER_SPACE", "COGNITIVE_GRID"];
        const progressInterval = setInterval(() => {
            progress += 5;
            if (progress <= 100) {
                scanningProgressFill.style.width = progress + "%";
            }
            if (telemetryStatus && progress < 100) {
                const randSector = sectors[Math.floor(Math.random() * sectors.length)];
                const randHex = Math.floor(Math.random() * 65535).toString(16).toUpperCase();
                telemetryStatus.textContent = `LOC: ${randSector} [0x${randHex}]`;
            }
        }, 80);

        await new Promise(resolve => setTimeout(resolve, 1800));
        clearInterval(progressInterval);

        if (telemetryStatus) telemetryStatus.textContent = "SYS.SCAN: COMPLETE";
        alienScanningState.classList.add("hidden");
        alienSearchPanel.classList.remove("scanning");
        btnRunSearch.disabled = false;

        // 4. Marcar coincidencias en el motor
        matches.forEach(node => {
            node.isSearchMatch = true;
        });
        engine.setNodes(nodesList, currentParentId);

        // Si tenemos coincidencia, centrar y enfocar en el primer resultado
        if (matches.length > 0) {
            engine.followedNode = matches[0];
            engine.selectedNode = matches[0];
        } else {
            // Volver al centro
            const centerNode = nodesList.find(n => n.id === currentParentId);
            if (centerNode) {
                engine.followedNode = centerNode;
                engine.selectedNode = centerNode;
            }
        }

        // 5. Renderizar resultados y diálogo personalizado del alíen
        if (matches.length === 0) {
            typeSpeechText("¡Rayos cósmicos! No encontré ningún cuerpo celeste con el término '" + query + "' ni nada parecido. ¿Deseas probar con otra palabra?");
            searchResultsList.innerHTML = `<div class="search-no-results">Coincidencias no encontradas en este sistema solar.</div>`;
        } else {
            const hasExact = matchData.some(m => !m.isFuzzy);
            const firstMatch = matches[0];
            const type = firstMatch.type; // sun, planet, planetoid, moon, satellite
            const desc = describeCelestialBody(firstMatch);
            
            let customPhrases = [];
            
            if (type === "sun") {
                customPhrases = [
                    `¡Rayos gamma! Rastreé la información hasta la estrella central de color dorado. ¡La energía allí es abrumadora, prepárate para explorar su núcleo caliente!`,
                    `¡Frecuencia solar detectada! Los datos que buscas brillan en la estrella central de color dorado. ¡Hora de absorber ese conocimiento!`
                ];
            } else if (type === "planet") {
                customPhrases = [
                    `¡Uju! Localicé la información explorando ${desc}. ¡Prepara tu traje espacial para descender a su superficie en busca de respuestas!`,
                    `¡Éxito! Encontré lo que buscas en ${desc}. ¡Vale la pena descender y explorar este mundo mayor!`
                ];
            } else if (type === "planetoid") {
                customPhrases = [
                    `¡Bip-bop! Localicé los datos explorando ${desc}. Aunque es un cuerpo menor, ¡su contenido de estudio es gigante y está listo para ser leído!`,
                    `¡Anomalía resuelta! La respuesta está en ${desc}. ¡Aterriza con cuidado en su atmósfera de datos!`
                ];
            } else if (type === "moon") {
                customPhrases = [
                    `¡Increíble! Encontré los apuntes bajo la superficie de la corteza de ${desc}. ¡Vamos a desenterrar esos secretos ocultos en el polvo!`,
                    `¡Objetivo fijado! Los datos orbitan en ${desc}. Un satélite natural perfecto para hospedar tus notas de estudio.`
                ];
            } else if (type === "satellite") {
                customPhrases = [
                    `¡Atención, humano! La transmisión de datos proviene de ${desc}. ¡Accede a sus micro-bancos de memoria de inmediato!`,
                    `¡Transmisión interceptada! La respuesta que buscas está guardada en los circuitos de ${desc}.`
                ];
            } else {
                customPhrases = [
                    `¡Completado! Encontré la información en ${desc}. ¡Salta al hiperespacio para ver los detalles!`
                ];
            }

            // Seleccionar frase aleatoria
            const randomPhrase = customPhrases[Math.floor(Math.random() * customPhrases.length)];
            
            let introText = "";
            if (hasExact) {
                introText = `¡Escaneo completado, terrícola! Encontré ${matches.length} coincidencia(s). ${randomPhrase}`;
            } else {
                introText = `¡Entendido, humano! No hay coincidencias exactas, pero detecté ${matches.length} sugerencia(s). ${randomPhrase.replace("Localicé la información", "Quizás te refieras a los datos")}`;
            }
            
            typeSpeechText(introText, 16);
            
            matchData.forEach(itemData => {
                const node = itemData.node;
                const item = document.createElement("div");
                item.className = "search-result-item";
                
                let pathStr = "";
                let p = nodesList.find(n => n.id === node.parentId);
                if (p) {
                    pathStr = `Órbita de: ${p.title}`;
                } else {
                    pathStr = "Centro del sistema";
                }

                let snippet = "";
                if (node.notes) {
                    const cleanNotes = node.notes.replace(/[\#\*\_`~\[\]\(\)]/g, "").replace(/\$\$[\s\S]*?\$\$/g, "").replace(/\$[^\$]+\$/g, "").trim();
                    const words = cleanNotes.split(/\s+/);
                    snippet = words.slice(0, 12).join(" ");
                    if (words.length > 12) snippet += "...";
                }
                if (!snippet) snippet = "Sin notas guardadas.";

                const badgeClass = itemData.isFuzzy ? "fuzzy" : node.type;
                const badgeLabel = itemData.isFuzzy ? "Sugerencia" : node.type;

                item.innerHTML = `
                    <div class="result-header">
                        <span class="result-title">${node.title}</span>
                        <span class="result-badge ${badgeClass}">${badgeLabel}</span>
                    </div>
                    ${itemData.isFuzzy ? `<div class="result-fuzzy-note">Coincidencia aproximada para "${query}"</div>` : ""}
                    <div class="result-path">🪐 ${pathStr}</div>
                    <div class="result-snippet">${snippet}</div>
                `;

                item.addEventListener("click", () => {
                    const termToHighlight = itemData.isFuzzy ? (itemData.matchedWord || query) : query;
                    navigateToNode(node, termToHighlight, itemData.isFuzzy);
                    engine.selectedNode = node;
                    engine.followedNode = node;
                    
                    // Cerrar buscador tras navegación exitosa
                    alienSearchPanel.classList.remove("open");
                    btnOpenSearch.classList.remove("active");

                    // Limpiar destaque de coincidencia
                    nodesList.forEach(n => n.isSearchMatch = false);
                    engine.setNodes(nodesList, currentParentId);
                });

                searchResultsList.appendChild(item);
            });
        }
    }

    if (btnOpenSearch && alienSearchPanel) {
        btnOpenSearch.addEventListener("click", () => {
            const isOpen = alienSearchPanel.classList.toggle("open");
            btnOpenSearch.classList.toggle("active", isOpen);
            if (isOpen) {
                closeSidebar();
                if (activeStarsPanel) activeStarsPanel.classList.remove("open");
                if (btnToggleStars) btnToggleStars.classList.remove("active");
                const customSelect = document.getElementById("customSystemSelect");
                if (customSelect) {
                    const trigger = customSelect.querySelector(".custom-select-trigger");
                    const optionsContainer = customSelect.querySelector(".custom-select-options");
                    if (optionsContainer) optionsContainer.classList.add("hidden");
                    if (trigger) trigger.classList.remove("open");
                }
                alienSearchInput.focus();
                
                // Efecto de escribir saludo alienígena tras un breve retardo para coincidir con la llegada del ovni
                setTimeout(() => {
                    if (alienSearchPanel.classList.contains("open")) {
                        typeSpeechText("¡Hola, humano! Soy tu guía estelar. ¿Qué información deseas buscar en este sistema solar?", 20);
                    }
                }, 850);
            } else {
                if (typeWriterInterval) {
                    clearInterval(typeWriterInterval);
                    typeWriterInterval = null;
                }
                nodesList.forEach(n => n.isSearchMatch = false);
                engine.setNodes(nodesList, currentParentId);
            }
        });

        if (btnCloseSearch) {
            btnCloseSearch.addEventListener("click", () => {
                alienSearchPanel.classList.remove("open");
                alienSearchPanel.classList.remove("scanning");
                btnOpenSearch.classList.remove("active");
                if (typeWriterInterval) {
                    clearInterval(typeWriterInterval);
                    typeWriterInterval = null;
                }
                nodesList.forEach(n => n.isSearchMatch = false);
                engine.setNodes(nodesList, currentParentId);
            });
        }

        if (btnRunSearch) {
            btnRunSearch.addEventListener("click", performAlienSearch);
        }

        if (alienSearchInput) {
            alienSearchInput.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    performAlienSearch();
                }
            });
        }
    }

    // --- INICIALIZAR DICTADO POR VOZ ---
    const voiceDictation = new VoiceDictation();
    initCustomSelect();

    // --- LÓGICA DE SINCRONIZACIÓN Y RESPALDOS (JSON) ---
    const btnOpenSync = document.getElementById("btnOpenSync");
    const syncModal = document.getElementById("syncModal");
    const btnCloseSyncModal = document.getElementById("btnCloseSyncModal");
    
    const btnExportJSON = document.getElementById("btnExportJSON");
    const importJSONFile = document.getElementById("importJSONFile");

    // No-op for cloud autosave (cloud sync removed)
    function triggerCloudAutosave() {}

    // Abrir y Cerrar Modal
    if (btnOpenSync) {
        btnOpenSync.addEventListener("click", () => {
            syncModal.classList.remove("hidden");
        });
    }

    if (btnCloseSyncModal) {
        btnCloseSyncModal.addEventListener("click", () => {
            syncModal.classList.add("hidden");
        });
    }

    // Exportar JSON (Local)
    if (btnExportJSON) {
        btnExportJSON.addEventListener("click", async () => {
            try {
                if (!currentSystemId) {
                    showToast("Selecciona un sistema para exportar.", "error");
                    return;
                }
                await exportSystemToJSON(currentSystemId, db);
                showToast("Respaldo JSON descargado.");
            } catch (e) {
                console.error(e);
                showToast("Error al exportar el sistema.", "error");
            }
        });
    }

    // Importar JSON (Local)
    if (importJSONFile) {
        importJSONFile.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const importedSystem = await importSystemFromJSON(event.target.result, db);
                    showToast(`Sistema "${importedSystem.name}" restaurado con éxito.`);
                    syncModal.classList.add("hidden");
                    await loadSystemsList();
                    selectSystem.value = importedSystem.id;
                    selectSystem.dispatchEvent(new Event('change'));
                } catch (err) {
                    console.error(err);
                    showToast("Error al importar: formato JSON inválido.", "error");
                }
                importJSONFile.value = "";
            };
            reader.readAsText(file);
        });
    }
});
