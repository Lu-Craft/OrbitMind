// Main UI Controller and entry point for OrbiMind
import { OrbiMindDB } from './db.js';
import { SpaceEngine } from './spaceEngine.js';
import { VoiceDictation } from './voiceDictation.js';
import { parseMarkdown } from './markdownParser.js';
import { getNodeColor, hexToRgb } from './utils.js';
import { initTutorial } from './tutorial.js';
import {
    exportSystemToJSON,
    importSystemFromJSON
} from './sync.js';

document.addEventListener("DOMContentLoaded", async () => {
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
        // Upgrade seed version to ensure the user gets the highly advanced thermodynamics system
        const SEED_VERSION = "3";
        const currentSeedVer = localStorage.getItem("orbimind_seed_ver");
        let systems = await db.getAllSystems();
        
        const advancedSys = systems.find(sys => sys.name === "Termodinámica Avanzada");
        if (currentSeedVer !== SEED_VERSION && advancedSys) {
            await db.deleteSystem(advancedSys.id);
            systems = await db.getAllSystems();
        }
        localStorage.setItem("orbimind_seed_ver", SEED_VERSION);

        selectSystem.innerHTML = "";
        
        const hasAdvanced = systems.some(sys => sys.name === "Termodinámica Avanzada");
        if (!hasAdvanced) {
            const defaultId = crypto.randomUUID();
            const defaultSystem = { id: defaultId, name: "Termodinámica Avanzada", createdAt: new Date() };
            await db.saveSystem(defaultSystem);
            
            // 1. Sol Central
            const sunId = crypto.randomUUID();
            await db.saveNode({
                id: sunId,
                systemId: defaultId,
                parentId: null,
                title: "Termodinámica",
                type: "sun",
                notes: `# Termodinámica Física y Química (Nivel Universitario)\nLa termodinámica clásica y estadística describe el comportamiento macroscópico y microscópico de la materia bajo equilibrio térmico mediante leyes matemáticas y estadísticas rigurosas.\n\n> [!IMPORTANT]\n> Este mapa orbital representa la jerarquía de 5 niveles de estudio en la termodinámica. Usa la rueda del ratón para hacer zoom y arrastra para desplazarte. Haz **doble clic** en cualquier planeta para entrar en su órbita y ver subtemas.\n\n### Concepto de Diferencial Exacta:\nEn termodinámica, las funciones de estado poseen diferenciales exactas, lo que significa que el cambio de una variable de estado depende únicamente del estado inicial y final, no de la trayectoria. Para una función $z(x, y)$:\n$$dz = \\left(\\frac{\\partial z}{\\partial x}\\right)_y dx + \\left(\\frac{\\partial z}{\\partial y}\\right)_x dy$$\nSi $dz$ es exacta, se cumple el teorema de Euler para las segundas derivadas cruzadas:\n$$\\frac{\\partial^2 z}{\\partial y \\partial x} = \\frac{\\partial^2 z}{\\partial x \\partial y}$$\n\n### Clasificación de Sistemas:\n1. **Aislado**: No intercambia materia ni energía con el entorno ($\\Delta U = 0, \\Delta N = 0$).\n2. **Cerrado**: Intercambia energía pero no materia ($\\Delta N = 0$).\n3. **Abierto**: Intercambia tanto materia como energía.\n\n### Variables de Estado:\n- **Intensivas**: Independientes del tamaño del sistema (ej. Temperatura $T$, Presión $P$, Densidad $\\rho$).\n- **Extensivas**: Proporcionales al tamaño del sistema (ej. Volumen $V$, Energía interna $U$, Entropía $S$, Masa $m$).\n\nQ: ¿Qué diferencia a una función de estado de una función de trayectoria?\nA: Una **función de estado** (como $U, H, S, G$) tiene una diferencial exacta y su cambio depende solo de los estados extremos. Una **función de trayectoria** (como el calor $Q$ y el trabajo $W$) tiene una diferencial inexacta ($\\delta Q, \\delta W$) y su valor acumulado depende de los detalles mecánicos y térmicos de la transición.\n\n[^1]: Zemansky, M. W. & Dittman, R. H. (1997). Heat and Thermodynamics. McGraw-Hill.\n[^2]: Callen, H. B. (1985). Thermodynamics and an Introduction to Thermostatistics. Wiley.`,
                attachments: [],
                orbitRadius: 0,
                orbitSpeed: 0,
                color: "#ffaa00",
                angle: 0
            });

            // 2. Planeta: Leyes Fundamentales
            const p1Id = crypto.randomUUID();
            await db.saveNode({
                id: p1Id,
                systemId: defaultId,
                parentId: sunId,
                title: "Leyes Fundamentales",
                type: "planet",
                notes: `# Leyes Fundamentales de la Termodinámica\nLos cuatro principios pilares sobre los que se construye la termodinámica macroscópica clásica.\n\n### Ley Cero (Equilibrio Térmico):\nSi un sistema $A$ está en equilibrio térmico con un sistema $B$, y $B$ está en equilibrio con $C$, entonces $A$ y $C$ están en equilibrio térmico entre sí:\n$$T_A = T_B \\quad \\text{y} \\quad T_B = T_C \\implies T_A = T_C$$\nPermite definir operacionalmente el concepto de temperatura y calibrar termómetros.\n\n### Primera Ley (Conservación de la Energía):\nLa energía interna total de un sistema cerrado solo se modifica por el intercambio de calor o la realización de trabajo:\n$$dU = \\delta Q - \\delta W$$\n- $dU$: Diferencial exacta de la energía interna (J).\n- $\\delta Q$: Cantidad diferencial inexacta de calor absorbido por el sistema (J).\n- $\\delta W$: Cantidad diferencial inexacta de trabajo realizado por el sistema (J).\n\n### Segunda Ley (Entropía y Causalidad):\nLa entropía de un sistema aislado en un proceso espontáneo siempre aumenta, alcanzando su máximo en el equilibrio:\n$$dS_{\\text{universo}} = dS_{\\text{sistema}} + dS_{\\text{entorno}} \\ge 0$$\nPara un ciclo termodinámico cerrado con transferencia de calor:\n$$\\oint \\frac{\\delta Q}{T} \\le 0 \\quad \\text{(Desigualdad de Clausius)}$$\n\n### Tercera Ley (Límite del Cero Absoluto):\nAl aproximarse la temperatura de un sistema cristalino perfecto al cero absoluto, su entropía toma un valor constante mínimo (que por convención se define como cero):\n$$\\lim_{T \\to 0} S = 0$$\n- **Nernst-Simon**: El cambio de entropía asociado con cualquier proceso químico o físico reversible tiende a cero cuando la temperatura absoluta se aproxima a cero.\n\nQ: ¿Por qué la segunda ley prohíbe una eficiencia del 100% en motores térmicos?\nA: Porque la conversión de calor en trabajo de forma cíclica requiere liberar parte del calor a un foco frío para que la entropía neta del universo no disminuya, limitando la eficiencia según el teorema de Carnot.`,
                attachments: [],
                orbitRadius: 135,
                orbitSpeed: 0.05,
                color: "#00f2fe",
                angle: 0.5
            });

            // 3. Planetoide: Primera Ley (bajo Planeta 1)
            const pl1_1Id = crypto.randomUUID();
            await db.saveNode({
                id: pl1_1Id,
                systemId: defaultId,
                parentId: p1Id,
                title: "Primera Ley",
                type: "planetoid",
                notes: `# Primera Ley de la Termodinámica\nFormulación matemática rigurosa para el balance energético de sistemas cerrados y abiertos.\n\n### Ecuación Fundamental (Forma Diferencial):\nPara un sistema termodinámico simple cerrado en un proceso reversible:\n$$dU = T\\,dS - P\\,dV$$\nPara un sistema abierto multiespecie (donde se transfiere materia), agregamos el potencial químico:\n$$dU = T\\,dS - P\\,dV + \\sum_{i} \\mu_i \\, dN_i$$\nDonde las variables y unidades en el SI son:\n- $U$: Energía interna total (J, función de estado).\n- $T$: Temperatura absoluta del sistema (K).\n- $S$: Entropía del sistema (J/K).\n- $P$: Presión interna en el límite de equilibrio (Pa).\n- $V$: Volumen ocupado por el sistema ($\\text{m}^3$).\n- $\\mu_i$: Potencial químico de la especie $i$ (J/mol). Define la afinidad química y el gradiente molar.\n- $N_i$: Cantidad de sustancia de la especie $i$ (moles).\n\n### Conservación de la Entalpía en Procesos a Presión Constante:\nDefiniendo la Entalpía como $H = U + PV$, en procesos isobáricos irreversibles y reversibles donde solo hay trabajo de expansión $P-V$, el cambio de entalpía coincide con el calor intercambiado:\n$$dH = \\delta Q_P \\implies \\Delta H = Q_P$$\n\nQ: ¿Cómo se expresa la primera ley para un ciclo termodinámico?\nA: Como $U$ es una función de estado, el cambio neto de energía interna a lo largo de un ciclo cerrado es idénticamente cero ($\\oint dU = 0$). Por lo tanto, el calor neto transferido es numéricamente igual al trabajo neto realizado: $Q_{\\text{neto}} = W_{\\text{neto}}$.`,
                attachments: [],
                orbitRadius: 60,
                orbitSpeed: -0.1,
                color: "#ff7b00",
                angle: 1.0
            });

            // 4. Luna: Trabajo de Expansión (bajo Planetoide 1.1)
            const m1_1_1Id = crypto.randomUUID();
            await db.saveNode({
                id: m1_1_1Id,
                systemId: defaultId,
                parentId: pl1_1Id,
                title: "Trabajo de Expansión",
                type: "moon",
                notes: `# Trabajo de Expansión ($P-V$)\nEl trabajo mecánico macroscópico debido a los cambios de volumen de un fluido contra una presión externa opositora.\n\n### Formulación Fundamental:\nEl trabajo diferencial realizado por el sistema al expandirse una cantidad $dV$ contra una presión externa $P_{\\text{ext}}$ es:\n$$\\delta W = P_{\\text{ext}} \\, dV$$\nPara un proceso reversible, la presión interna del sistema difiere infinitesimalmente de la presión externa ($P \\approx P_{\\text{ext}}$), lo que permite integrar usando la ecuación de estado:\n$$W = \\int_{V_i}^{V_f} P(V, T) \\, dV$$\nDonde:\n- $W$: Trabajo total acumulado realizado por el sistema (J).\n- $P$: Presión interna del gas (Pa).\n- $V$: Volumen del sistema ($\\text{m}^3$).\n- $V_i, V_f$: Volúmenes inicial y final respectivamente.\n\n### Trabajo para un Gas Ideal en Procesos Reversibles:\n1. **Isobárico** ($P = \\text{cte}$):\n   $$W = P(V_f - V_i)$$\n2. **Isotérmico** ($T = \\text{cte}$, $P = \\frac{nRT}{V}$):\n   $$W = nRT \\ln\\left(\\frac{V_f}{V_i}\right)$$\n   *(donde $n$ es el número de moles y $R = 8.314 \\text{ J/(mol K)}$)*\n3. **Adiabático** ($\\delta Q = 0$, $PV^\\gamma = \\text{cte}$):\n   $$W = \\frac{P_i V_i - P_f V_f}{\\gamma - 1}$$\n   *(donde $\\gamma = C_p / C_v$ es el coeficiente adiabático)*\n4. **Isocórico** ($V = \\text{cte}$):\n   $$W = 0$$\n\n### Comparación de Trabajo en Diferentes Procesos:\n[grafico tipo="bar" valores="83,57,34,0" etiquetas="Isotérmico,Isobárico,Adiabático,Isocórico" titulo="Trabajo de Expansión (J) de 1 mol de gas ideal"]`,
                attachments: [],
                orbitRadius: 35,
                orbitSpeed: 0.25,
                color: "#00ff87",
                angle: 1.5
            });

            // 5. Satélite: Relación de Mayer (bajo Luna 1.1.1)
            const s1_1_1_1Id = crypto.randomUUID();
            await db.saveNode({
                id: s1_1_1_1Id,
                systemId: defaultId,
                parentId: m1_1_1Id,
                title: "Relación de Mayer",
                type: "satellite",
                notes: `# Relación de Mayer para Gases Ideales\nDeducción termodinámica clásica que conecta las capacidades caloríficas a presión y volumen constantes.\n\n### Enunciado Matemático:\n$$C_p - C_v = R \\quad \\text{(capacidad molar)} \\quad \\text{o} \\quad c_p - c_v = R/M$$\nDonde:\n- $C_p$: Capacidad calorífica molar a presión constante ($\\text{J/(mol}\\cdot\\text{K)}$).\n- $C_v$: Capacidad calorífica molar a volumen constante ($\\text{J/(mol}\\cdot\\text{K)}$).\n- $R$: Constante universal de los gases ideales ($8.314 \\text{ J/(mol}\\cdot\\text{K)}$).\n- $M$: Masa molar del gas ($\\text{kg/mol}$).\n\n### Demostración Termodinámica:\n1. Por definición de Entalpía: $H = U + PV$\n2. Para un gas ideal, $PV = nRT$, por lo que a nivel molar ($n=1$): $H_m = U_m + RT$\n3. Derivando respecto a la temperatura $T$: $\\frac{dH_m}{dT} = \\frac{dU_m}{dT} + R$\n4. Dado que para un gas ideal $U$ y $H$ dependen exclusivamente de $T$ (ley de Joule): $C_p = \\left(\\frac{\\partial H_m}{\\partial T}\\right)_P = \\frac{dH_m}{dT}$ y $C_v = \\left(\\frac{\\partial U_m}{\\partial T}\right)_V = \\frac{dU_m}{dT}$\n5. Sustituyendo, se obtiene directamente: $$C_p - C_v = R$$\n\n### Interpretación Física:\nA volumen constante, todo el calor transferido se almacena como energía cinética molecular (aumenta $T$). A presión constante, parte de la energía térmica suministrada se consume en realizar trabajo mecánico de expansión contra la atmósfera circundante, requiriendo más energía total para aumentar un grado la temperatura.`,
                attachments: [],
                orbitRadius: 20,
                orbitSpeed: -0.5,
                color: "#a8afb8",
                angle: 0.8
            });

            // 6. Planetoide: Segunda Ley (bajo Planeta 1)
            const pl1_2Id = crypto.randomUUID();
            await db.saveNode({
                id: pl1_2Id,
                systemId: defaultId,
                parentId: p1Id,
                title: "Segunda Ley y Entropía",
                type: "planetoid",
                notes: `# Segunda Ley y Entropía\nEl principio que establece la dirección del tiempo físico y el desorden termodinámico mediante la entropía.\n\n### Formulación de Kelvin-Planck:\nEs imposible construir un dispositivo que opere cíclicamente y cuyo único efecto sea absorber calor de un solo foco térmico y convertirlo íntegramente en trabajo mecánico útil.\n\n### Formulación de Clausius:\nEs imposible construir un dispositivo que opere cíclicamente y cuyo único efecto neto sea transferir calor desde un cuerpo frío a otro cuerpo más caliente sin aporte externo de trabajo.\n\n### Definición Clásica de Entropía ($S$):\nLa entropía es una variable de estado extensiva definida cuantitativamente para un proceso reversible elemental como:\n$$dS = \\frac{\\delta Q_{\\text{rev}}}{T}$$\nDonde:\n- $dS$: Variación diferencial de la entropía (J/K).\n- $\\delta Q_{\\text{rev}}$: Calor transferido de forma reversible e infinitesimal (J).\n- $T$: Temperatura absoluta del sistema en el equilibrio local (K).\n\n### El Principio del Aumento de Entropía:\nPara cualquier proceso físico o químico real (irreversible), se genera entropía internamente ($S_{\\text{gen}} > 0$):\n$$dS_{\\text{universo}} = dS_{\\text{sistema}} + dS_{\\text{entorno}} = dS_{\\text{sistema}} - \\frac{\\delta Q}{T_{\\text{frontera}}} \\ge 0$$\n\nQ: ¿Por qué la entropía no disminuye en sistemas aislados?\nA: Porque en un sistema aislado el flujo de calor externo $\\delta Q = 0$, lo que implica que $dS \\ge 0$. Toda irreversibilidad interna espontánea aumenta el número de configuraciones microscópicas accesibles del sistema, incrementando la entropía molecular.`,
                attachments: [],
                orbitRadius: 90,
                orbitSpeed: 0.08,
                color: "#e8c4ff",
                angle: 2.2
            });

            // 7. Luna: Desigualdad de Clausius (bajo Planetoide 1.2)
            const m1_2_1Id = crypto.randomUUID();
            await db.saveNode({
                id: m1_2_1Id,
                systemId: defaultId,
                parentId: pl1_2Id,
                title: "Desigualdad de Clausius",
                type: "moon",
                notes: `# Desigualdad de Clausius\nTeorema fundamental derivado del segundo principio de la termodinámica que rige el comportamiento de todos los ciclos térmicos.\n\n### Enunciado General:\nPara cualquier proceso cerrado o ciclo que experimente un sistema:\n$$\\oint \\frac{\\delta Q}{T_{\\text{frontera}}} \\le 0$$\nDonde:\n- $\\delta Q$: Cantidad diferencial de calor transferido al sistema a través de la frontera (J). Es positivo si entra, negativo si sale.\n- $T_{\\text{frontera}}$: Temperatura absoluta de la sección de la frontera del sistema donde ocurre la transferencia de calor (K).\n- $\\oint$: Integral cerrada a lo largo de la trayectoria completa del ciclo.\n\n### Demostración y Casos Límite:\n1. **Ciclo Reversible**: Toda la transferencia de calor es ideal y sin fricción ni gradientes finitos de temperatura.   $$\\oint \\frac{\\delta Q_{\\text{rev}}}{T} = 0$$\n   *Esto demuestra matemáticamente que la cantidad $\\frac{\\delta Q_{\\text{rev}}}{T}$ es una diferencial exacta de una función de estado, a la cual Clausius llamó Entropía ($S$).*\n2. **Ciclo Irreversible**: El ciclo presenta rozamiento, gradientes de temperatura o procesos internos de no equilibrio.   $$\\oint \\frac{\\delta Q}{T_{\\text{frontera}}} < 0$$\n\n### Generación de Entropía ($S_{\\text{gen}}$):\nPodemos reescribir la desigualdad como una ecuación de conservación agregando el término de entropía generada, que es siempre estrictamente mayor a cero para procesos reales:\n$$\\Delta S_{\\text{sistema}} = \\int \\frac{\\delta Q}{T_{\\text{frontera}}} + S_{\\text{gen}}$$\nDonde $S_{\\text{gen}} \\ge 0$.`,
                attachments: [],
                orbitRadius: 40,
                orbitSpeed: -0.2,
                color: "#ffffba",
                angle: 0.5
            });

            // 8. Planeta: Ciclos Termodinámicos
            const p2Id = crypto.randomUUID();
            await db.saveNode({
                id: p2Id,
                systemId: defaultId,
                parentId: sunId,
                title: "Ciclos y Máquinas",
                type: "planet",
                notes: `# Ciclos Termodinámicos y Máquinas Térmicas\nEl estudio ingenieril de los ciclos cerrados de fluidos para convertir energía térmica en trabajo mecánico continuo.\n\n### Máquinas Térmicas:\nAbsorben calor $Q_H$ de un foco caliente a temperatura $T_H$, producen trabajo neto $W_{\\text{neto}}$, y ceden calor residual $Q_C$ a un foco frío a temperatura $T_C$.\n- **Eficiencia Térmica ($\\eta$)**:\n  $$\\eta = \\frac{W_{\\text{neto}}}{Q_H} = \\frac{Q_H - |Q_C|}{Q_H} = 1 - \\frac{|Q_C|}{Q_H}$$\n  *(Unidades en SI: $Q_H$, $Q_C$, y $W$ en Joules (J); $\\eta$ es adimensional)*\n\n### Ciclos de Refrigeración y Bombas de Calor:\nUtilizan trabajo mecánico externo $W$ para forzar la transferencia de calor de un foco frío a un foco caliente.\n- **Coeficiente de Rendimiento de un Refrigerador ($\\text{COP}_{\\text{Ref}}$)**:\n  $$\\text{COP}_{\\text{Ref}} = \\frac{Q_C}{W} = \\frac{Q_C}{Q_H - Q_C}$$\n- **Coeficiente de Rendimiento de una Bomba de Calor ($\\text{COP}_{\\text{BC}}$)**:\n  $$\\text{COP}_{\\text{BC}} = \\frac{Q_H}{W} = \\frac{Q_H}{Q_H - Q_C}$$\n\n### Relación Fundamental de COP:\n$$\\text{COP}_{\\text{BC}} = \\text{COP}_{\\text{Ref}} + 1$$\n\n### Eficiencia Comparada:\nEl ciclo de Carnot establece el límite superior absoluto para cualquier máquina térmica.\n\n[grafico tipo="line" valores="100,50,20,35,100" etiquetas="1,2,3,4,1" titulo="Ciclo de Carnot en Diagrama P-V"]`,
                attachments: [],
                orbitRadius: 230,
                orbitSpeed: -0.04,
                color: "#ff007f",
                angle: 2.0
            });

            // 9. Planetoide: Ciclo de Carnot (bajo Planeta 2)
            const pl2_1Id = crypto.randomUUID();
            await db.saveNode({
                id: pl2_1Id,
                systemId: defaultId,
                parentId: p2Id,
                title: "Ciclo de Carnot",
                type: "planetoid",
                notes: `# El Ciclo de Carnot\nUn ciclo termodinámico teórico compuesto por cuatro procesos reversibles que define el límite de eficiencia ideal de conversión térmica.\n\n### Etapas del Ciclo para un Gas Ideal (Diagrama $P-V$):\n1. **Expansión Isotérmica Reversible ($1 \\to 2$)** a temperatura alta $T_H$:\n   El sistema absorbe calor $Q_H$ del foco caliente.\n   $$Q_H = W_{1\\to 2} = nRT_H \\ln\\left(\\frac{V_2}{V_1}\\right)$$\n2. **Expansión Adiabática Reversible ($2 \\to 3$)** de $T_H$ a $T_C$:\n   El sistema realiza trabajo disminuyendo su temperatura sin intercambiar calor ($Q = 0$).\n   $$T_H V_2^{\\gamma-1} = T_C V_3^{\\gamma-1}$$\n3. **Compresión Isotérmica Reversible ($3 \\to 4$)** a temperatura baja $T_C$:\n   Se realiza trabajo sobre el gas y este cede calor $Q_C$ al foco frío.\n   $$Q_C = -nRT_C \\ln\\left(\\frac{V_3}{V_4}\\right)$$\n4. **Compresión Adiabática Reversible ($4 \\to 1$)** de $T_C$ a $T_H$:\n   El gas se calienta mediante compresión reversible adiabática sin ganar calor ($Q = 0$).\n   $$T_C V_4^{\\gamma-1} = T_H V_1^{\\gamma-1}$$\n\n### Relación de Volúmenes:\nCombinando las relaciones adiabáticas, se demuestra que:\n$$\\frac{V_2}{V_1} = \\frac{V_3}{V_4}$$\nLo que permite simplificar las expresiones de calor absorbido y cedido.`,
                attachments: [],
                orbitRadius: 75,
                orbitSpeed: 0.12,
                color: "#ffdfba",
                angle: 1.2
            });

            // 10. Luna: Eficiencia de Carnot (bajo Planetoide 2.1)
            const m2_1_1Id = crypto.randomUUID();
            await db.saveNode({
                id: m2_1_1Id,
                systemId: defaultId,
                parentId: pl2_1Id,
                title: "Eficiencia de Carnot",
                type: "moon",
                notes: `# Eficiencia de Carnot\nEl límite termodinámico fundamental de eficiencia térmica de cualquier máquina térmica que opera entre dos límites de temperatura.\n\n### Fórmula de Eficiencia de Carnot ($\\eta_{\\text{Carnot}}$):\n$$\\eta_{\\text{Carnot}} = 1 - \\frac{T_C}{T_H}$$\nDonde:\n- $\\eta_{\\text{Carnot}}$: Eficiencia máxima adimensional ($0 \\le \\eta < 1$).\n- $T_C$: Temperatura absoluta del foco frío (K).\n- $T_H$: Temperatura absoluta del foco caliente (K).\n\n### Deducción Termodinámica:\n1. A partir del ciclo de Carnot ideal: $Q_H = nRT_H \\ln\\left(\\frac{V_2}{V_1}\\right)$ y $Q_C = -nRT_C \\ln\\left(\\frac{V_3}{V_4}\\right)$\n2. Como se cumple que $\\frac{V_2}{V_1} = \\frac{V_3}{V_4}$, dividimos ambos términos: $\\frac{|Q_C|}{Q_H} = \\frac{T_C}{T_H}$\n3. Sustituyendo esta relación en la ecuación de eficiencia térmica general ($\\eta = 1 - \\frac{|Q_C|}{Q_H}$), obtenemos:\n   $$\\eta_{\\text{Carnot}} = 1 - \\frac{T_C}{T_H}$$\n\nQ: ¿Por qué no se puede alcanzar una eficiencia del 100% ($\\eta = 1$)?\nA: Alcanzar $\\eta = 1$ requiere que el foco frío esté a $T_C = 0 \\text{ K}$ (Cero Absoluto). La tercera ley de la termodinámica imposibilita enfriar cualquier foco térmico real a $T_C = 0 \\text{ K}$ en un número finito de pasos.`,
                attachments: [],
                orbitRadius: 35,
                orbitSpeed: -0.3,
                color: "#baffc9",
                angle: 2.5
            });

            // 11. Satélite: Teorema de Carnot (bajo Luna 2.1.1)
            const s2_1_1_1Id = crypto.randomUUID();
            await db.saveNode({
                id: s2_1_1_1Id,
                systemId: defaultId,
                parentId: m2_1_1Id,
                title: "Teorema de Carnot",
                type: "satellite",
                notes: `# Teorema de Carnot\nEstablece los límites máximos de eficiencia para cualquier motor térmico, deducidos de las leyes fundamentales.\n\n### Primer Teorema:\nNingún motor térmico real que opere de manera irreversible entre dos límites térmicos dados puede ser más eficiente que una máquina de Carnot reversible que opere entre los mismos dos límites:\n$$\\eta_{\\text{irreversible}} \\le \\eta_{\\text{reversible}}$$\n\n### Segundo Teorema:\nTodos los motores térmicos reversibles (como la máquina de Carnot, Stirling o Ericsson ideales) que operen entre los mismos dos focos térmicos constantes deben poseer exactamente la misma eficiencia:\n$$\\eta_{\\text{rev, A}} = \\eta_{\\text{rev, B}} = 1 - \\frac{T_C}{T_H}$$\n\n### Demostración del Teorema:\nSe demuestra por contradicción. Si supusiéramos la existencia de un motor super-eficiente con eficiencia $\\eta_X > \\eta_{\\text{Carnot}}$, podríamos acoplarlo mecánicamente a una máquina de Carnot funcionando a la inversa como refrigerador. El trabajo generado por el motor $X$ alimentaría al refrigerador de Carnot. El resultado neto de este sistema compuesto sería la transferencia de calor del foco frío al foco caliente sin recibir trabajo externo, violando de forma directa la formulación de la Segunda Ley de Clausius.`,
                attachments: [],
                orbitRadius: 20,
                orbitSpeed: 0.6,
                color: "#a8afb8",
                angle: 1.8
            });

            // 12. Planeta: Potenciales Termodinámicos
            const p3Id = crypto.randomUUID();
            await db.saveNode({
                id: p3Id,
                systemId: defaultId,
                parentId: sunId,
                title: "Potenciales de Maxwell",
                type: "planet",
                notes: `# Potenciales Termodinámicos y Relaciones de Maxwell\nLos potenciales termodinámicos son funciones de estado con unidades de energía utilizadas para analizar el equilibrio bajo diferentes restricciones físicas externas.\n\n### Definiciones Matemáticas (Restricciones del Sistema):\n1. **Energía Interna ($U$)**: Medida en sistemas aislados.\n   $$dU = T\\,dS - P\\,dV + \\sum_i \\mu_i \\, dN_i$$\n2. **Entalpía ($H$)**: Para procesos a presión constante.\n   $$H = U + PV \\implies dH = T\\,dS + V\\,dP + \\sum_i \\mu_i \\, dN_i$$\n3. **Energía Libre de Helmholtz ($A$)**: Para procesos a temperatura y volumen constantes.\n   $$A = U - TS \\implies dA = -S\\,dT - P\\,dV + \\sum_i \\mu_i \\, dN_i$$\n4. **Energía Libre de Gibbs ($G$)**: Para procesos a temperatura y presión constantes.\n   $$G = H - TS \\implies dG = -S\\,dT + V\\,dP + \\sum_i \\mu_i \\, dN_i$$\n\nDonde:\n- $U, H, A, G$: Potenciales termodinámicos en Joules (J).\n- $T$: Temperatura absoluta (K).\n- $P$: Presión del sistema (Pa).\n- $V$: Volumen del sistema ($\\text{m}^3$).\n- $S$: Entropía del sistema (J/K).\n- $N_i$: Moles de la especie química $i$.\n- $\\mu_i$: Potencial químico de la especie $i$ (J/mol).\n\n### Transformadas de Legendre:\nLos potenciales se derivan uno del otro intercambiando variables independientes conjugadas (ej. cambiar $S$ por $T$, o $V$ por $P$) mediante sumas de productos de variables conjugadas, manteniendo toda la información termodinámica original del sistema.`,
                attachments: [],
                orbitRadius: 330,
                orbitSpeed: 0.03,
                color: "#bae1ff",
                angle: 3.5
            });

            // 13. Planetoide: Energía de Gibbs (bajo Planeta 3)
            const pl3_1Id = crypto.randomUUID();
            await db.saveNode({
                id: pl3_1Id,
                systemId: defaultId,
                parentId: p3Id,
                title: "Energía Libre de Gibbs",
                type: "planetoid",
                notes: `# Energía Libre de Gibbs ($G$)\nEl potencial termodinámico de mayor relevancia en química y ciencia de materiales, que rige la espontaneidad a presión y temperatura constantes.\n\n### Definición Matemática:\n$$G = H - TS = U + PV - TS$$\nDonde:\n- $G$: Energía libre de Gibbs (J).\n- $H$: Entalpía del sistema (J).\n- $T$: Temperatura absoluta (K).\n- $S$: Entropía del sistema (J/K).\n\n### Criterio de Espontaneidad y Equilibrio:\nPara cualquier cambio de fase o reacción química a temperatura ($T$) y presión ($P$) constantes, el cambio de energía libre de Gibbs es:\n$$dG_{T,P} = dH - T\\,dS \\le 0$$\n- **$dG_{T,P} < 0$**: Proceso exergónico espontáneo (el sistema libera energía útil).\n- **$dG_{T,P} = 0$**: El sistema está en equilibrio termodinámico macroscópico.\n- **$dG_{T,P} > 0$**: Proceso endergónico no espontáneo (requiere energía externa para ocurrir).\n\n### Relación con la Afinidad Química:\nEn términos del potencial químico $\\mu_i$ y la composición del sistema:\n$$G = \\sum_{i} \\mu_i N_i \\implies dG_{T,P} = \\sum_{i} \\mu_i \\, dN_i$$\n\n> [!IMPORTANT]\n> El valor mínimo de la energía de Gibbs define el estado termodinámicamente más estable del sistema en las condiciones de presión y temperatura constantes.`,
                attachments: [],
                orbitRadius: 70,
                orbitSpeed: -0.1,
                color: "#ffd3b6",
                angle: 0.8
            });

            // 14. Luna: Ecuación de Clapeyron (bajo Planetoide 3.1)
            const m3_1_1Id = crypto.randomUUID();
            await db.saveNode({
                id: m3_1_1Id,
                systemId: defaultId,
                parentId: pl3_1Id,
                title: "Ecuación de Clapeyron",
                type: "moon",
                notes: `# Ecuación de Clapeyron\nLa ecuación fundamental que rige el equilibrio de fase de cualquier sustancia de un componente puro.\n\n### Enunciado de Clapeyron:\n$$\\frac{dP}{dT} = \\frac{\\Delta H}{T \\, \\Delta V}$$\nDonde:\n- $P$: Presión de coexistencia o presión de vapor de la fase (Pa).\n- $T$: Temperatura absoluta de transición de fase (K).\n- $\\Delta H$: Entalpía molar de la transición de fase (ej. fusión, vaporización, sublimación) ($\\text{J/mol}$).\n- $\\Delta V$: Cambio en el volumen específico molar de la transición ($\\text{m}^3\\text{/mol}$): $\\Delta V = V_{\\text{fase final}} - V_{\\text{fase inicial}}$\n\n### Derivación Matemática:\n1. En condiciones de equilibrio de fases coexistentes (fases $\\alpha$ y $\\beta$), los potenciales químicos moleculares de ambos estados deben ser idénticos: $\\mu_{\\alpha}(T, P) = \\mu_{\\beta}(T, P)$\n2. Para un desplazamiento infinitesimal sobre la línea de coexistencia: $d\\mu_{\\alpha} = d\\mu_{\\beta}$\n3. Recordando la relación diferencial para el potencial químico molar ($d\\mu = -S_m dT + V_m dP$): $$-S_{m,\\alpha} dT + V_{m,\\alpha} dP = -S_{m,\\beta} dT + V_{m,\\beta} dP$$\n4. Reordenando y agrupando términos: $(V_{m,\\beta} - V_{m,\\alpha}) dP = (S_{m,\\beta} - S_{m,\\alpha}) dT \\implies \\frac{dP}{dT} = \\frac{\\Delta S}{\\Delta V}$\n5. Como la transición de fase es reversible e isoterma, la entropía de cambio es $\\Delta S = \\frac{\\Delta H}{T}$, lo que nos da:\n   $$\\frac{dP}{dT} = \\frac{\\Delta H}{T \\, \\Delta V}$$`,
                attachments: [],
                orbitRadius: 40,
                orbitSpeed: 0.25,
                color: "#a8e6cf",
                angle: 1.5
            });

            // 15. Satélite: Clausius-Clapeyron (bajo Luna 3.1.1)
            const s3_1_1_1Id = crypto.randomUUID();
            await db.saveNode({
                id: s3_1_1_1Id,
                systemId: defaultId,
                parentId: m3_1_1Id,
                title: "Clausius-Clapeyron",
                type: "satellite",
                notes: `# Ecuación de Clausius-Clapeyron\nSimplificación física de la ecuación de Clapeyron aplicada específicamente a transiciones de fase gaseosa-condensada.\n\n### Enunciado Integrado:\n$$\\ln\\left(\\frac{P_2}{P_1}\\right) = -\\frac{\\Delta H_{\\text{vap}}}{R} \\left(\\frac{1}{T_2} - \\frac{1}{T_1}\\right)$$\nDonde:\n- $P_1, P_2$: Presiones de vapor de la sustancia a temperaturas absolutas $T_1$ y $T_2$ respectively.\n- $\\Delta H_{\\text{vap}}$: Entalpía de vaporización (o sublimación) molar de la sustancia ($\\text{J/mol}$).\n- $R$: Constante universal de los gases ideales ($8.314 \\text{ J/(mol K)}$).\n\n### Supuestos de la Derivación:\n1. **Volumen Despreciable**: El volumen específico molar de la fase gaseosa ($V_g$) es infinitamente mayor que el de la líquida ($V_l$), por lo que $\\Delta V = V_g - V_l \\approx V_g$.\n2. **Comportamiento de Gas Ideal**: El vapor se comporta como un gas ideal en el rango de equilibrio, lo que permite sustituir $V_g = \\frac{RT}{P}$.\n3. Sustituyendo en Clapeyron:\n   $$\\frac{dP}{dT} = \\frac{\\Delta H_{\\text{vap}}}{T \\left(\\frac{RT}{P}\right)} \\implies \\frac{d\\ln P}{dT} = \\frac{\\Delta H_{\\text{vap}}}{R T^2}$$\n4. Integrando con $\\Delta H_{\\text{vap}}$ constante, obtenemos directamente la ecuación integrada.`,
                attachments: [],
                orbitRadius: 20,
                orbitSpeed: -0.6,
                color: "#a8afb8",
                angle: 0.5
            });

            // 16. Planetoide: Relaciones de Maxwell (bajo Planeta 3)
            const pl3_2Id = crypto.randomUUID();
            await db.saveNode({
                id: pl3_2Id,
                systemId: defaultId,
                parentId: p3Id,
                title: "Relaciones de Maxwell",
                type: "planetoid",
                notes: `# Relaciones de Maxwell\nIdentidades matemáticas que conectan derivadas parciales de las variables de estado termodinámicas primarias ($P, V, T, S$).\n\n### Origen Matemático:\nSi una función diferencial de estado $df = M dx + N dy$ es exacta, sus segundas derivadas parciales cruzadas son idénticas: $\\left(\\frac{\\partial M}{\\partial y}\\right)_x = \\left(\\frac{\\partial N}{\\partial x}\\right)_y$\n\n### Las Cuatro Relaciones Clásicas de Maxwell:\n1. **De la Energía Interna** ($dU = T\\,dS - P\\,dV$):\n   $$\\left(\\frac{\\partial T}{\\partial V}\\right)_S = -\\left(\\frac{\\partial P}{\\partial S}\\right)_V$$\n2. **De la Entalpía** ($dH = T\\,dS + V\\,dP$):\n   $$\\left(\\frac{\\partial T}{\\partial P}\\right)_S = \\left(\\frac{\\partial V}{\\partial S}\\right)_P$$\n3. **De la Energía de Helmholtz** ($dA = -S\\,dT - P\\,dV$):\n   $$\\left(\\frac{\\partial S}{\\partial V}\\right)_T = \\left(\\frac{\\partial P}{\\partial T}\right)_V$$\n4. **De la Energía de Gibbs** ($dG = -S\\,dT + V\\,dP$):\n   $$\\left(\\frac{\\partial S}{\\partial P}\\right)_T = -\\left(\\frac{\\partial V}{\\partial T}\\right)_P$$\n\nDonde:\n- $T$: Temperatura absoluta (K).\n- $P$: Presión (Pa).\n- $V$: Volumen ($\\text{m}^3$).\n- $S$: Entropía (J/K).\n\n### Importancia Científica:\nPermiten determinar indirectamente los cambios de variables que no se pueden medir experimentalmente en el laboratorio de forma sencilla (como la Entropía $S$), a partir de variables fácilmente medibles ($P, V, T$).`,
                attachments: [],
                orbitRadius: 105,
                orbitSpeed: 0.06,
                color: "#c7ceea",
                angle: 2.5
            });

            // 17. Planeta: Física Estadística
            const p4Id = crypto.randomUUID();
            await db.saveNode({
                id: p4Id,
                systemId: defaultId,
                parentId: sunId,
                title: "Física Estadística",
                type: "planet",
                notes: `# Física Estadística\nLa disciplina que une el mundo cuántico y molecular microscópico con los principios macroscópicos de la termodinámica.\n\n### Postulado de Probabilidad a Priori Igual:\nEn un sistema aislado en equilibrio térmico, todos los microestados compatibles con las restricciones externas de volumen, partículas y energía son igualmente probables de ocurrir.\n\n### Colectivos Estadísticos (Ensembles):\n1. **Microcanónico ($N, V, E$)**: Representa sistemas aislados. La energía total $E$ es constante.\n2. **Canónico ($N, V, T$)**: Sistema cerrado en contacto térmico con un foco térmico externo a temperatura constante $T$.\n3. **Gran Canónico ($\\mu, V, T$)**: Sistema abierto que puede intercambiar calor y partículas con el exterior a temperatura $T$ y potencial químico $\\mu$.\n\n### Conexión Microscópica-Macroscópica:\nLa entropía es el puente directo entre ambos regímenes, cuantificando la probabilidad y densidad de estados mecánicos elementales:\n$$A = -k_B T \\ln Z$$\nDonde:\n- $A$: Energía libre de Helmholtz (J).\n- $k_B$: Constante de Boltzmann ($1.3806 \\times 10^{-23} \\text{ J/K}$).\n- $T$: Temperatura absoluta (K).\n- $Z$: Función de partición estadística del colectivo.`,
                attachments: [],
                orbitRadius: 440,
                orbitSpeed: -0.02,
                color: "#ffd3b6",
                angle: 4.8
            });

            // 18. Planetoide: Entropía de Boltzmann (bajo Planeta 4)
            const pl4_1Id = crypto.randomUUID();
            await db.saveNode({
                id: pl4_1Id,
                systemId: defaultId,
                parentId: p4Id,
                title: "Entropía de Boltzmann",
                type: "planetoid",
                notes: `# La Fórmula de Entropía de Boltzmann\nLa ecuación de la termodinámica estadística que conecta el desorden microscópico y cuántico molecular con la variable macroscópica de la entropía.\n\n### Fórmula de Boltzmann:\n$$S = k_B \\ln \\Omega$$\nDonde:\n- $S$: Entropía termodinámica macroscópica (J/K).\n- $k_B$: Constante fundamental de Boltzmann ($1.3806 \\times 10^{-23} \\text{ J/K}$).\n- $\\Omega$: Multiplicidad termodinámica o el número total de microestados moleculares mecánicos individuales (posiciones y momentos cuánticos en el espacio de fases) compatibles con el macroestado en equilibrio.\n\n### Implicación para la Tercera Ley:\nAl aproximarse la temperatura a $0\\text{ K}$, los sistemas físicos caen al microestado base de mínima energía degenerada. Si este estado base es único ($\\Omega = 1$):\n$$S = k_B \\ln(1) = 0$$\nLo que justifica estadísticamente la Tercera Ley de la Termodinámica de Planck.`,
                attachments: [],
                orbitRadius: 85,
                orbitSpeed: 0.09,
                color: "#ffb3ba",
                angle: 1.0
            });

            // 19. Luna: Función de Partición (bajo Planetoide 4.1)
            const m4_1_1Id = crypto.randomUUID();
            await db.saveNode({
                id: m4_1_1Id,
                systemId: defaultId,
                parentId: pl4_1Id,
                title: "Función de Partición",
                type: "moon",
                notes: `# Función de Partición ($Z$)\nEl parámetro normalizador en física estadística que resume de forma completa los estados energéticos moleculares accesibles de un sistema en equilibrio.\n\n### Definición Matemática (Colectivo Canónico):\n$$Z = \\sum_{i} e^{-\\beta E_i}$$\nDonde:\n- $Z$: Función de partición cuántica/estadística (adimensional).\n- $E_i$: Nivel de energía cuántico discreto accesible para el microestado molecular $i$ (J).\n- $\\beta$: Parámetro térmico fundamental ($\\text{J}^{-1}$), definido como: $$\\beta = \\frac{1}{k_B T}$$\n  *(donde $k_B$ es la constante de Boltzmann y $T$ es la temperatura absoluta del sistema)*\n\n### Probabilidad de Ocupación de un Estado ($P_i$):\nLa probabilidad de encontrar el sistema en un microestado específico $i$ sigue la distribución de Boltzmann: $P_i = \\frac{e^{-\\beta E_i}}{Z}$\n\n### Cálculo de Variables Macroscópicas a partir de $Z$:\n1. **Energía Interna Media ($\\langle E \\rangle$)**:\n   $$\\langle E \\rangle = -\\left(\\frac{\\partial \\ln Z}{\\partial \\beta}\\right)_V = k_B T^2 \\left(\\frac{\\partial \\ln Z}{\\partial T}\\right)_V$$\n2. **Entropía Estadística ($S$)**:\n   $$S = k_B \\ln Z + \\frac{\\langle E \\rangle}{T}$$\n3. **Presión Media ($\\langle P \\rangle$)**:\n   $$\\langle P \\rangle = \\frac{1}{\\beta} \\left(\\frac{\\partial \\ln Z}{\\partial V}\\right)_T$$\n\n> [!TIP]\n> A partir de $Z$ se puede calcular la energía interna media del sistema:\n> $$\\langle E \\rangle = -\\frac{\\partial \\ln Z}{\\partial \\beta}$$`,
                attachments: [],
                orbitRadius: 45,
                orbitSpeed: -0.22,
                color: "#ff8b94",
                angle: 2.0
            });

            // Seeder de Tareas Pendientes para Termodinámica Avanzada
            await db.saveTask({
                id: crypto.randomUUID(),
                systemId: defaultId,
                title: "Deducir las Relaciones de Maxwell",
                createdAt: new Date()
            });
            await db.saveTask({
                id: crypto.randomUUID(),
                systemId: defaultId,
                title: "Calcular el cambio de entropía de mezcla",
                createdAt: new Date()
            });
            await db.saveTask({
                id: crypto.randomUUID(),
                systemId: defaultId,
                title: "Resolver la paradoja de Gibbs",
                createdAt: new Date()
            });

            systems.push(defaultSystem);
        }

        systems.forEach(sys => {
            const opt = document.createElement("option");
            opt.value = sys.id;
            opt.textContent = sys.name;
            selectSystem.appendChild(opt);
        });

        if (!currentSystemId) {
            currentSystemId = systems[0].id;
        }
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
        if (file.type.includes('pdf')) {
            w.document.write(`<iframe src="${file.data}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
        } else {
            w.document.write(`<body style="margin:0; background:#020208; display:flex; align-items:center; justify-content:center;"><img src="${file.data}" style="max-width:100%; max-height:100vh; object-fit:contain; box-shadow: 0 10px 40px rgba(0,0,0,0.8); border-radius:8px;"></body>`);
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

    function navigateToNode(targetNode) {
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
        openStudyWorkspace(targetNode, true);
    }

    function openStudyWorkspace(node, keepTimer = false) {
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
                const oRadius = orbiter.type === "satellite" ? 3.5 : (orbiter.type === "moon" ? 4 : 4.5);

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
                    navigateToNode(node);
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
