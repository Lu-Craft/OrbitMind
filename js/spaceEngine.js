// Canvas orbital rendering and interactive physics engine for OrbiMind
import { Particle } from './particles.js';
import { ShootingStar } from './shootingStar.js';
import { PlanetRenderer3D } from './planetRenderer3D.js';
import { hexToRgb, hexToRgbA, getNodeColor } from './utils.js';

export class SpaceEngine {
    constructor(canvasId, onNodeSelected, onNodeDoubleClicked, onStarClicked) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext("2d");
        
        // Callbacks
        this.onNodeSelected = onNodeSelected;
        this.onNodeDoubleClicked = onNodeDoubleClicked;
        this.onStarClicked = onStarClicked;

        // Propiedades de la Cámara
        this._zoom = 1.0;
        this.targetZoom = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.followedNode = null; // Nodo en seguimiento de cámara
        this.centerShiftX = 0;
        this.targetCenterShiftX = 0;
        this.centerShiftY = 0;
        this.targetCenterShiftY = 0;
        this.sidebarElement = document.getElementById("detailSidebar");
        
        // Estados
        this.isPlaying = true;
        this.nodes = [];
        this.currentParentId = null;
        this.parentRotations = {}; // Rotaciones compartidas por órbita de padre
        
        // Pools de Elementos Dinámicos
        this.stars = [];
        this.nebulae = [];
        this.shootingStars = [];
        this.particles = [];
        this.worldParticles = []; // World-space particles (for destruction effects)
        
        // Propiedades de Animación de Destrucción de Sistema
        this.destructionActive = false;
        this.destructionTimer = 0;
        this.destructionDuration = 5.0;
        this.destructionCallback = null;
        this.supernovaTriggered = false;
        this.destructionShockwaveRadius = 0;
        
        // Propiedades de Escaneo de Búsqueda
        this.scanPulseActive = false;
        this.scanPulseProgress = 0;

        // Animación de Búsqueda de Alíen
        this.alienScanActive = false;
        this.alienScanNodes = [];
        this.alienScanTimer = 0;
        this.alienScanDuration = 1800;
        this.alienScanUfoPos = { x: 0, y: 0 };
        this.alienScanStartPos = { x: 0, y: 0 };
        this.drawUfoBeam = false;
        this.activeScanPlanetPos = null;
        this.activeScanPlanetRadius = 0;
        this.activeScanProgress = 0;
        
        // Interacción
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.mouseX = 0;
        this.mouseY = 0;
        this.hoveredNode = null;
        this.selectedNode = null;
        
        // Tiempo
        this.lastTime = performance.now();

        // Inicializar renderer 3D de manera segura con fallback
        this.renderer3d = null;
        if (typeof THREE !== 'undefined') {
            try {
                this.renderer3d = new PlanetRenderer3D();
            } catch (err) {
                console.warn("[SpaceEngine] Error al inicializar el motor de renderizado 3D:", err);
            }
        } else {
            console.warn("[SpaceEngine] Three.js no está cargado. Se usará el motor 2D.");
        }

        // Configurar Eventos
        this.initEvents();
        this.generateCosmos();
        this.resize();
    }

    get zoom() {
        return this._zoom;
    }

    set zoom(val) {
        this.targetZoom = val;
    }

    get selectedNode() {
        return this._selectedNode;
    }

    set selectedNode(node) {
        this._selectedNode = node;
        if (node) {
            this.followedNode = node;
            this.targetZoom = this.getTargetZoomForNode(node);
        } else {
            this.followedNode = null;
            this.targetZoom = 1.0;
        }
    }

    getNodeSystemRadius(node) {
        const children = this.nodes.filter(n => n.parentId === node.id);
        const nodeRadius = this.getNodeRadius(node);
        if (children.length === 0) {
            return nodeRadius + 35; // Just the node itself + some padding
        }
        
        const expansion = (node.type !== "sun" && node.orbitExpansion !== undefined) ? node.orbitExpansion : 1.0;
        
        let maxRadius = 0;
        children.forEach(child => {
            const childScale = this.getNodeScale(child);
            const orbitRadius = this.getNodeBaseOrbitRadius(child) * Math.max(0.55, childScale) * expansion;
            const childRadius = this.getNodeRadius(child);
            const totalDist = orbitRadius + childRadius;
            if (totalDist > maxRadius) {
                maxRadius = totalDist;
            }
        });
        
        return Math.max(maxRadius, nodeRadius) + 20; // adding 20px padding
    }

    getTargetZoomForNode(node) {
        if (!node) return 1.0;
        const systemRadius = this.getNodeSystemRadius(node);
        
        // Available width (excluding sidebar space and left toolbar)
        let availableWidth = this.canvas.width;
        let availableHeight = this.canvas.height;
        if (this.sidebarElement && this.sidebarElement.classList.contains("open")) {
            availableWidth -= ((this.sidebarElement.offsetWidth || 800) + 90);
            availableHeight -= 190; // Exclude header (100px) and bottom actions (90px)
        }
        
        const minDimension = Math.min(availableWidth, availableHeight);
        
        // We want the system to occupy about 70% of the viewport
        let targetZoom = (minDimension * 0.35) / systemRadius;
        
        // Clamp zoom between reasonable limits (e.g. 0.35 to 3.0)
        targetZoom = Math.max(0.35, Math.min(targetZoom, 3.0));
        return targetZoom;
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    generateCosmos() {
        this.stars = [];
        const numStars = 200;
        const colors = ["#b2ebf2", "#f8bbd0", "#ffffff", "#ffe0b2", "#e1bee7", "#c8e6c9"];
        for (let i = 0; i < numStars; i++) {
            const rand = Math.random();
            let type = "dot";
            let radius = Math.random() * 1.2 + 0.3;
            if (rand < 0.12) {
                type = "cross";
                radius = Math.random() * 4 + 3;
            } else if (rand < 0.25) {
                type = "ring";
                radius = Math.random() * 2.5 + 1.5;
            }
            
            this.stars.push({
                x: Math.random() * 4000 - 2000,
                y: Math.random() * 4000 - 2000,
                radius: radius,
                alpha: Math.random() * 0.75 + 0.25,
                twinkleSpeed: Math.random() * 0.015 + 0.005,
                twinkleDirection: Math.random() > 0.5 ? 1 : -1,
                layer: Math.floor(Math.random() * 3) + 1,
                type: type,
                color: colors[Math.floor(Math.random() * colors.length)]
            });
        }

        this.nebulae = [
            { x: -300, y: -200, size: 850, color: "rgba(90, 24, 154, 0.09)" }, 
            { x: 400, y: 300, size: 950, color: "rgba(3, 4, 94, 0.08)" },      
            { x: -500, y: 400, size: 750, color: "rgba(0, 180, 216, 0.06)" }    
        ];
    }

    setNodes(nodes, currentParentId) {
        this.nodes = nodes;
        this.currentParentId = currentParentId;
    }

    setTasks(tasks) {
        // Inicializar o actualizar la lista de estrellas fugaces en base a tareas pendientes
        this.shootingStars = tasks.map(t => new ShootingStar(t.id, t.title, this.canvas));
    }

    addShootingStar(id, title) {
        const newStar = new ShootingStar(id, title, this.canvas);
        newStar.cooldown = 0.5; // Que vuele rápidamente
        this.shootingStars.push(newStar);
    }

    removeShootingStar(id) {
        this.shootingStars = this.shootingStars.filter(s => s.id !== id);
    }

    triggerExplosion(x, y, color = "#ffeb3b") {
        for (let i = 0; i < 35; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }

    triggerSystemDestruction(callback) {
        this.destructionActive = true;
        this.destructionTimer = 0;
        this.destructionCallback = callback;
        this.supernovaTriggered = false;
        this.destructionShockwaveRadius = 0;
        this.worldParticles = [];
        
        // Guardar las órbitas originales para los planetas y satélites
        this.nodes.forEach(node => {
            if (node.type !== "sun") {
                const parentNode = this.nodes.find(n => n.id === node.parentId);
                const scale = this.getNodeScale(node);
                let baseRadius = this.getNodeBaseOrbitRadius(node) * Math.max(0.55, scale);
                if (parentNode && parentNode.type !== "sun" && parentNode.orbitExpansion !== undefined) {
                    baseRadius *= parentNode.orbitExpansion;
                }
                
                node.destructionOrbitRadius = baseRadius;
                node.originalDestructionOrbitRadius = baseRadius;
                
                const siblings = this.nodes.filter(n => n.parentId === node.parentId).sort((a, b) => a.id.localeCompare(b.id));
                const index = siblings.indexOf(node);
                const parentRot = this.parentRotations[node.parentId] || 0;
                node.destructionAngle = siblings.length > 0 ? (index * 2 * Math.PI / siblings.length) + parentRot : parentRot;
                node.isConsumed = false;
            }
        });
    }

    triggerWorldExplosion(x, y, color = "#ffeb3b") {
        for (let i = 0; i < 35; i++) {
            this.worldParticles.push(new Particle(x, y, color));
        }
    }

    initEvents() {
        window.addEventListener("resize", () => this.resize());

        // Mouse Down (Arrastre o Click)
        this.canvas.addEventListener("mousedown", (e) => {
            if (this.destructionActive) return;
            if (e.button === 0) { // Click izquierdo
                const mx = e.clientX;
                const my = e.clientY;

                // 1. Primero comprobar click en Estrellas Fugaces (en espacio de pantalla)
                const hitStar = this.shootingStars.find(s => s.isHit(mx, my));
                if (hitStar) {
                    this.onStarClicked(hitStar);
                    return;
                }

                // 2. Comprobar click en Nodos (espacio de mundo)
                const worldPos = this.screenToWorld(mx, my);
                const clickedNode = this.getNodeAtPosition(worldPos.x, worldPos.y);

                if (clickedNode) {
                    // Centrar y activar seguimiento inmediatamente en el primer clic
                    this.followedNode = clickedNode;
                    this.selectedNode = clickedNode;
                    this.onNodeSelected(clickedNode);
                } else {
                    this.isDragging = true;
                    this.dragStartX = mx - this.panX;
                    this.dragStartY = my - this.panY;
                }
            }
        });

        // Mouse Move
        window.addEventListener("mousemove", (e) => {
            if (this.destructionActive) return;
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;

            if (this.isDragging) {
                this.followedNode = null; // Detener seguimiento al arrastrar libremente
                this.panX = e.clientX - this.dragStartX;
                this.panY = e.clientY - this.dragStartY;
            } else {
                // Detectar Hover en Estrella Fugaz
                const hoverStar = this.shootingStars.some(s => s.isHit(e.clientX, e.clientY));
                
                // Detectar Hover en Nodos
                const worldPos = this.screenToWorld(e.clientX, e.clientY);
                this.hoveredNode = this.getNodeAtPosition(worldPos.x, worldPos.y);
                
                this.canvas.style.cursor = (this.hoveredNode || hoverStar) ? "pointer" : (this.isDragging ? "grabbing" : "default");
            }
        });

        // Mouse Up
        window.addEventListener("mouseup", () => {
            if (this.destructionActive) return;
            this.isDragging = false;
        });

        // Wheel (Zoom)
        this.canvas.addEventListener("wheel", (e) => {
            e.preventDefault();
            if (this.destructionActive) return;
            const zoomIntensity = 0.15;
            const mouseBeforeZoom = this.screenToWorld(e.clientX, e.clientY);

            let newZoom;
            if (e.deltaY < 0) {
                newZoom = Math.min(this._zoom + zoomIntensity * this._zoom, 4.0);
            } else {
                newZoom = Math.max(this._zoom - zoomIntensity * this._zoom, 0.25);
            }

            this.targetZoom = newZoom;
            this._zoom = newZoom; // instantly update current zoom during wheel scroll to keep mouse-centered panning correct

            const mouseAfterZoom = this.screenToWorld(e.clientX, e.clientY);
            this.panX += (mouseAfterZoom.x - mouseBeforeZoom.x) * this._zoom;
            this.panY += (mouseAfterZoom.y - mouseBeforeZoom.y) * this._zoom;
        }, { passive: false });

        // Double Click
        this.canvas.addEventListener("dblclick", (e) => {
            if (this.destructionActive) return;
            const worldPos = this.screenToWorld(e.clientX, e.clientY);
            const clickedNode = this.getNodeAtPosition(worldPos.x, worldPos.y);

            if (clickedNode && clickedNode.type !== "satellite") {
                this.onNodeDoubleClicked(clickedNode);
            }
        });
    }

    screenToWorld(screenX, screenY) {
        return {
            x: (screenX - (this.canvas.width / 2 - this.centerShiftX) - this.panX) / this.zoom,
            y: (screenY - (this.canvas.height / 2 + this.centerShiftY) - this.panY) / this.zoom
        };
    }

    worldToScreen(worldX, worldY) {
        return {
            x: worldX * this.zoom + (this.canvas.width / 2 - this.centerShiftX) + this.panX,
            y: worldY * this.zoom + (this.canvas.height / 2 + this.centerShiftY) + this.panY
        };
    }

    getNodeRadius(node) {
        let baseR = 10;
        if (node.type === "sun") baseR = 55;
        else if (node.type === "planet") baseR = 27;
        else if (node.type === "planetoid") baseR = 19;
        else if (node.type === "moon") baseR = 15;
        else if (node.type === "satellite") baseR = 21;
        
        const scale = node.currentScale !== undefined ? node.currentScale : 1.0;
        return baseR * scale;
    }

    getNodeBaseOrbitRadius(node) {
        const parentNode = this.nodes.find(n => n.id === node.parentId);
        if (!parentNode) return 185;
        
        if (parentNode.type === "sun") return 185;
        if (parentNode.type === "planet") return 90;
        if (parentNode.type === "planetoid") return 50;
        if (parentNode.type === "moon") return 28;
        return 24;
    }

    getNodeScale(node) {
        const depth = this.getDepth(node, this.currentParentId);
        if (depth <= 1) return 1.0;
        if (depth === 2) return 0.55;
        if (depth === 3) return 0.45;
        return 0.33;
    }

    // Calcula de forma determinista vértices de asteroides usando su ID
    getAsteroidVertices(nodeId, radius) {
        let hash = 0;
        for (let i = 0; i < nodeId.length; i++) {
            hash = nodeId.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        const numVertices = 6 + Math.abs(hash % 4); // 6 a 9 vértices
        const vertices = [];
        for (let i = 0; i < numVertices; i++) {
            const angle = (i / numVertices) * Math.PI * 2;
            const seed = Math.sin(hash + i * 19) * 0.5 + 0.5; // 0 a 1
            const r = radius * (0.8 + seed * 0.35); // Irregularidad del 20% al 15%
            vertices.push({
                x: r * Math.cos(angle),
                y: r * Math.sin(angle)
            });
        }
        return vertices;
    }

    getNodeSeed(nodeId, index) {
        let hash = 0;
        const key = nodeId + "-" + index;
        for (let i = 0; i < key.length; i++) {
            hash = key.charCodeAt(i) + ((hash << 5) - hash);
        }
        return Math.abs(Math.sin(hash)) % 1;
    }

    getCleanSnippet(notes) {
        if (!notes) return "";
        let text = notes.replace(/```[\s\S]*?```/g, "");
        text = text.replace(/^#+\s+.*$/gm, "");
        text = text.replace(/<[^>]*>/g, "");
        text = text.replace(/[\#\*\_`~\[\]\(\)]/g, "");
        const lines = text.split("\n")
            .map(l => l.trim())
            .filter(l => l.length > 0);
        
        if (lines.length === 0) return "";
        const firstLine = lines[0];
        if (firstLine.length > 35) {
            return firstLine.substring(0, 32) + "...";
        }
        return firstLine;
    }

    getNodeAbsolutePosition(node) {
        if (node.id === this.currentParentId) {
            return { x: 0, y: 0 };
        }

        const scale = node.currentScale !== undefined ? node.currentScale : 1.0;
        let orbitRadius = (this.destructionActive && node.destructionOrbitRadius !== undefined) 
            ? node.destructionOrbitRadius 
            : (this.getNodeBaseOrbitRadius(node) * Math.max(0.55, scale));
        
        const parentNode = this.nodes.find(n => n.id === node.parentId);
        if (parentNode && parentNode.type !== "sun" && parentNode.orbitExpansion !== undefined && (!this.destructionActive || node.destructionOrbitRadius === undefined)) {
            orbitRadius *= parentNode.orbitExpansion;
        }
        
        const siblings = this.nodes.filter(n => n.parentId === node.parentId).sort((a, b) => a.id.localeCompare(b.id));
        const index = siblings.indexOf(node);
        const parentRot = this.parentRotations[node.parentId] || 0;
        const angle = (this.destructionActive && node.destructionAngle !== undefined)
            ? node.destructionAngle
            : (siblings.length > 0 ? (index * 2 * Math.PI / siblings.length) + parentRot : parentRot);

        if (node.parentId === this.currentParentId) {
            return {
                x: orbitRadius * Math.cos(angle),
                y: orbitRadius * Math.sin(angle)
            };
        }

        if (parentNode) {
            const parentPos = this.getNodeAbsolutePosition(parentNode);
            return {
                x: parentPos.x + orbitRadius * Math.cos(angle),
                y: parentPos.y + orbitRadius * Math.sin(angle)
            };
        }

        return { x: 0, y: 0 };
    }

    getNodeAtPosition(x, y) {
        const centerNode = this.nodes.find(n => n.id === this.currentParentId);
        if (centerNode) {
            const r = this.getNodeRadius(centerNode);
            const dist = Math.hypot(x, y);
            if (dist <= r) return centerNode;
        }

        const visibleNodes = this.nodes.filter(n => n.id !== this.currentParentId);
        for (const node of visibleNodes) {
            const pos = this.getNodeAbsolutePosition(node);
            const r = this.getNodeRadius(node);
            const dist = Math.hypot(x - pos.x, y - pos.y);
            if (dist <= r) return node;
        }
        return null;
    }

    resetView() {
        this.targetZoom = 1.0;
        this._zoom = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.followedNode = null;
        this._selectedNode = null;
    }

    start() {
        const loop = (time) => {
            const dt = (time - this.lastTime) / 1000;
            this.lastTime = time;

            this.update(dt);
            this.draw(time);

            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    update(dt) {
        const delta = Math.min(dt, 0.1);

        // Update world-space particles
        this.worldParticles.forEach(p => p.update(delta));
        this.worldParticles = this.worldParticles.filter(p => p.alpha > 0);

        if (this.destructionActive) {
            this.destructionTimer += delta;
            
            // 1. Zoom and pan focus on center
            this.followedNode = null;
            this.selectedNode = null;
            this.targetZoom = 0.85; // slightly zoom out to see the collapse
            this.panX += (0 - this.panX) * 5 * delta;
            this.panY += (0 - this.panY) * 5 * delta;

            const sunNode = this.nodes.find(n => n.type === "sun");
            const otherNodes = this.nodes.filter(n => n.type !== "sun");

            if (this.destructionTimer <= 3.0) {
                // Phase 1: Sun expands, planets spiral in
                const t = this.destructionTimer / 3.0; // 0 to 1

                if (sunNode) {
                    sunNode.currentScale = 1.0 + t * 6.5; 
                }

                otherNodes.forEach(n => {
                    if (n.originalDestructionOrbitRadius === undefined) {
                        n.originalDestructionOrbitRadius = n.destructionOrbitRadius;
                    }
                    if (n.destructionAngle === undefined) n.destructionAngle = Math.random() * Math.PI * 2;
                    n.destructionAngle += (10.0 * t + 2.0) * delta; 
                    
                    n.destructionOrbitRadius = n.originalDestructionOrbitRadius * (1.0 - t * 1.15); // spirals in
                    if (n.destructionOrbitRadius < 0) n.destructionOrbitRadius = 0;

                    const pos = this.getNodeAbsolutePosition(n);
                    const dist = Math.hypot(pos.x, pos.y);
                    const sunR = sunNode ? this.getNodeRadius(sunNode) : 55;

                    if (dist <= sunR && !n.isConsumed) {
                        this.triggerWorldExplosion(pos.x, pos.y, n.color || "#ffffff");
                        n.currentScale = 0;
                        n.isConsumed = true;
                    } else if (!n.isConsumed) {
                        n.currentScale = this.getNodeScale(n) * (1.0 - t * 0.5);
                    }
                });
            } else if (this.destructionTimer <= 3.5) {
                // Phase 2: Collapse & Supernova
                const t = (this.destructionTimer - 3.0) / 0.5; // 0 to 1
                
                if (!this.supernovaTriggered) {
                    this.supernovaTriggered = true;
                    // Trigger a massive particle burst at the center in world space
                    for (let i = 0; i < 150; i++) {
                        const angle = Math.random() * Math.PI * 2;
                        const speed = Math.random() * 450 + 150;
                        const color = i % 3 === 0 ? "#ffffff" : (i % 3 === 1 ? "#00f2fe" : "#b900ff");
                        const p = new Particle(0, 0, color);
                        p.vx = Math.cos(angle) * speed;
                        p.vy = Math.sin(angle) * speed;
                        p.radius = Math.random() * 5 + 2.5;
                        p.decay = Math.random() * 0.015 + 0.005;
                        this.worldParticles.push(p);
                    }
                }

                if (sunNode) {
                    sunNode.currentScale = 7.5 * (1.0 - t) + 0.15 * t;
                }
                
                otherNodes.forEach(n => {
                    n.currentScale = 0;
                });
            } else if (this.destructionTimer <= 5.0) {
                // Phase 3: Black Hole slowly fades out
                const t = (this.destructionTimer - 3.5) / 1.5; // 0 to 1
                
                if (sunNode) {
                    sunNode.currentScale = 0.15 * (1.0 - t);
                }
                
                otherNodes.forEach(n => {
                    n.currentScale = 0;
                });
            } else {
                // Complete!
                this.destructionActive = false;
                if (this.destructionCallback) {
                    const cb = this.destructionCallback;
                    this.destructionCallback = null;
                    cb();
                }
            }
        }

        // Smoothly animate zoom
        this._zoom += (this.targetZoom - this._zoom) * 8 * delta;

        // Actualizar el desplazamiento del centro si el panel lateral está abierto
        if (this.sidebarElement && this.sidebarElement.classList.contains("open") && !this.destructionActive) {
            const width = this.sidebarElement.offsetWidth || 800;
            // Centrado dentro del cuadrante libre (entre panel de control izquierdo y panel lateral derecho)
            const leftMargin = 90; // Ancho del panel de control izquierdo + margen
            this.targetCenterShiftX = (width - leftMargin) / 2;
            
            // Centrado vertical dentro del cuadrante libre (entre cabecera y panel inferior)
            const topMargin = 100;
            const bottomMargin = 90;
            this.targetCenterShiftY = (topMargin - bottomMargin) / 2;
        } else {
            this.targetCenterShiftX = 0;
            this.targetCenterShiftY = 0;
        }
        this.centerShiftX += (this.targetCenterShiftX - this.centerShiftX) * 12 * delta;
        
        if (this.centerShiftY === undefined) {
            this.centerShiftY = 0;
        }
        this.centerShiftY += (this.targetCenterShiftY - this.centerShiftY) * 12 * delta;

        // Actualizar la cámara para seguir al nodo seguido
        if (this.followedNode) {
            const pos = this.getNodeAbsolutePosition(this.followedNode);
            const targetPanX = -pos.x * this.zoom;
            const targetPanY = -pos.y * this.zoom;
            // Interpolación suave para centrar la cámara
            this.panX += (targetPanX - this.panX) * 12 * delta;
            this.panY += (targetPanY - this.panY) * 12 * delta;
        }

        // Initialize and update parent rotations
        this.nodes.forEach(n => {
            if (this.destructionActive) return;
            if (n.type !== "satellite") {
                if (this.parentRotations[n.id] === undefined) {
                    this.parentRotations[n.id] = n.angle || Math.random() * Math.PI * 2;
                }
                if (this.isPlaying) {
                    let speed = 0.15;
                    if (n.type === "planet") speed = -0.25;
                    else if (n.type === "planetoid") speed = 0.4;
                    else if (n.type === "moon") speed = -0.6;
                    
                    this.parentRotations[n.id] += speed * delta;
                    if (this.parentRotations[n.id] > Math.PI * 2) this.parentRotations[n.id] -= Math.PI * 2;
                    if (this.parentRotations[n.id] < 0) this.parentRotations[n.id] += Math.PI * 2;
                }
            }
        });

        // Update node scales smoothly
        this.nodes.forEach(n => {
            if (this.destructionActive) return;
            const targetScale = this.getNodeScale(n);
            if (n.currentScale === undefined) {
                n.currentScale = targetScale;
            } else {
                n.currentScale += (targetScale - n.currentScale) * 8 * delta;
            }

            // Update orbit expansion smoothly (expand if selected, hovered, or is ancestor of selected/hovered)
            const isSelected = this.selectedNode && this.selectedNode.id === n.id;
            const isHovered = this.hoveredNode && this.hoveredNode.id === n.id;
            const isAncestorOfSelected = this.selectedNode && this.isDescendantOf(this.selectedNode, n.id);
            const isAncestorOfHovered = this.hoveredNode && this.isDescendantOf(this.hoveredNode, n.id);
            const targetExpansion = (isSelected || isHovered || isAncestorOfSelected || isAncestorOfHovered) ? 1.75 : 1.0;
            if (n.orbitExpansion === undefined) {
                n.orbitExpansion = targetExpansion;
            } else {
                n.orbitExpansion += (targetExpansion - n.orbitExpansion) * 8 * delta;
            }
        });

        // Actualizar Estrellas Fugaces (en pantalla)
        this.shootingStars.forEach(star => {
            star.checkHover(this.mouseX, this.mouseY);
            star.update(delta, this);
        });

        // Actualizar Partículas
        this.particles.forEach(p => p.update(delta));
        this.particles = this.particles.filter(p => p.alpha > 0);
        
        // Actualizar onda de radar
        if (this.scanPulseActive) {
            this.scanPulseProgress += delta * 0.55; // dura aprox 1.8s
            if (this.scanPulseProgress >= 1.0) {
                this.scanPulseActive = false;
                this.scanPulseProgress = 0;
            }
        }

        // Actualizar animación de búsqueda alienígena (UFO volando por el sistema)
        if (this.alienScanActive) {
            this.alienScanTimer += delta * 1000;
            if (this.alienScanTimer >= this.alienScanDuration) {
                this.alienScanActive = false;
                this.followedNode = null;
                this.activeScanPlanetPos = null;
            } else {
                const totalNodes = this.alienScanNodes.length;
                if (totalNodes > 0) {
                    const t = this.alienScanTimer / this.alienScanDuration; // 0 a 1
                    const progress = t * totalNodes;
                    const segmentIndex = Math.floor(progress);
                    const segmentProgress = progress - segmentIndex; // 0 a 1

                    const hoverOffset = -55;

                    let startPos = { x: 0, y: 0 };
                    if (segmentIndex === 0) {
                        startPos = this.alienScanStartPos;
                    } else {
                        const prevNode = this.alienScanNodes[segmentIndex - 1];
                        if (prevNode) {
                            const prevPos = this.getNodeAbsolutePosition(prevNode);
                            startPos = { x: prevPos.x, y: prevPos.y + hoverOffset };
                        } else {
                            startPos = this.alienScanStartPos;
                        }
                    }

                    const targetNode = this.alienScanNodes[Math.min(segmentIndex, totalNodes - 1)];
                    let targetPos = { x: 0, y: 0 };
                    if (targetNode) {
                        const nodePos = this.getNodeAbsolutePosition(targetNode);
                        targetPos = { x: nodePos.x, y: nodePos.y + hoverOffset };
                    } else {
                        targetPos = { x: this.alienScanStartPos.x, y: this.alienScanStartPos.y };
                    }

                    // Interpolación de vuelo y escaneo:
                    // 65% del tiempo viaja al planeta. 35% escanea/hover.
                    let interpT = 0;
                    const travelRatio = 0.65;
                    if (segmentProgress < travelRatio) {
                        const normT = segmentProgress / travelRatio;
                        // Curva ease-out cúbica
                        interpT = 1.0 - Math.pow(1.0 - normT, 3);
                        this.drawUfoBeam = false;
                        this.activeScanPlanetPos = null;
                    } else {
                        interpT = 1.0;
                        this.drawUfoBeam = true;
                        if (targetNode) {
                            this.activeScanPlanetPos = this.getNodeAbsolutePosition(targetNode);
                            this.activeScanPlanetRadius = this.getNodeRadius(targetNode);
                            this.activeScanProgress = (segmentProgress - travelRatio) / (1.0 - travelRatio);
                        }
                    }

                    this.alienScanUfoPos.x = startPos.x + (targetPos.x - startPos.x) * interpT;
                    this.alienScanUfoPos.y = startPos.y + (targetPos.y - startPos.y) * interpT;

                    // Centrar suavemente la cámara en la posición del planeta (compensando el offset vertical del ovni)
                    const cameraTargetY = this.alienScanUfoPos.y - hoverOffset;
                    const targetPanX = -this.alienScanUfoPos.x * this.zoom;
                    const targetPanY = -cameraTargetY * this.zoom;
                    this.panX += (targetPanX - this.panX) * 14 * delta;
                    this.panY += (targetPanY - this.panY) * 14 * delta;

                    // Zoom dinámico cinemático: zoom out al viajar, zoom in al escanear
                    this.targetZoom = this.drawUfoBeam ? 1.35 : 0.72;

                    // Emitir rastro de polvo de estrellas o partículas de escaneo del OVNI
                    if (this.drawUfoBeam) {
                        // Partículas de escaneo descendiendo desde el OVNI hacia el planeta
                        if (Math.random() < 0.6) {
                            this.particles.push(new Particle(
                                this.alienScanUfoPos.x + (Math.random() - 0.5) * 20,
                                this.alienScanUfoPos.y + 10 + Math.random() * 45,
                                "#00ff87"
                            ));
                        }
                    } else {
                        // Rastro de vuelo multicolor
                        if (Math.random() < 0.45) {
                            const colors = ["#00ff87", "#00f2fe", "#ffffff", "#ffd600"];
                            const color = colors[Math.floor(Math.random() * colors.length)];
                            this.particles.push(new Particle(
                                this.alienScanUfoPos.x + (Math.random() - 0.5) * 8,
                                this.alienScanUfoPos.y + 4 + (Math.random() - 0.5) * 4,
                                color
                            ));
                        }
                    }
                }
            }
        }

        // Twinkle de las estrellas de fondo
        this.stars.forEach(star => {
            star.alpha += star.twinkleSpeed * star.twinkleDirection;
            if (star.alpha >= 1) {
                star.alpha = 1;
                star.twinkleDirection = -1;
            } else if (star.alpha <= 0.15) {
                star.alpha = 0.15;
                star.twinkleDirection = 1;
            }
        });
    }

    isDescendantOf(node, parentId) {
        let parent = this.nodes.find(n => n.id === node.parentId);
        while (parent) {
            if (parent.id === parentId) return true;
            parent = this.nodes.find(n => n.id === parent.parentId);
        }
        return false;
    }

    getDepth(node, parentId) {
        let depth = 0;
        let current = node;
        while (current && current.id !== parentId) {
            depth++;
            current = this.nodes.find(n => n.id === current.parentId);
        }
        return depth;
    }

    drawCartoonStar(ctx, cx, cy, spikes, outerRadius, innerRadius, alpha) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        let step = Math.PI / spikes;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        
        ctx.fillStyle = "#ffeb3b";
        ctx.fill();
        
        ctx.strokeStyle = "#e6a100";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
    }

    draw(time) {
        // Limpiar lienzo con degradado de negro profundo/carbón elegante
        const bgGrad = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        bgGrad.addColorStop(0, "#000000");
        bgGrad.addColorStop(1, "#020205");
        this.ctx.fillStyle = bgGrad;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. Dibujar Nebulosas
        this.nebulae.forEach(nebula => {
            const screenPos = this.worldToScreen(nebula.x * 0.08, nebula.y * 0.08);
            const grad = this.ctx.createRadialGradient(
                screenPos.x, screenPos.y, 0,
                screenPos.x, screenPos.y, nebula.size * this.zoom * 0.5
            );
            grad.addColorStop(0, nebula.color);
            grad.addColorStop(1, "rgba(0, 0, 0, 0)");
            
            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.arc(screenPos.x, screenPos.y, nebula.size * this.zoom * 0.5, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // 2. Dibujar Estrellas de Fondo (Parallax)
        this.stars.forEach(star => {
            const factor = star.layer * 0.12;
            const starX = star.x + (this.panX * factor) / this.zoom;
            const starY = star.y + (this.panY * factor) / this.zoom;

            const screenPos = this.worldToScreen(starX, starY);
            
            if (screenPos.x >= 0 && screenPos.x <= this.canvas.width &&
                screenPos.y >= 0 && screenPos.y <= this.canvas.height) {
                this.ctx.save();
                this.ctx.globalAlpha = star.alpha;
                this.ctx.strokeStyle = star.color;
                this.ctx.fillStyle = star.color;
                
                const r = star.radius * this.zoom;
                
                if (star.type === "cross") {
                    this.ctx.lineWidth = 0.8 * this.zoom;
                    this.ctx.beginPath();
                    this.ctx.moveTo(screenPos.x - r * 1.5, screenPos.y);
                    this.ctx.lineTo(screenPos.x + r * 1.5, screenPos.y);
                    this.ctx.moveTo(screenPos.x, screenPos.y - r * 1.5);
                    this.ctx.lineTo(screenPos.x, screenPos.y + r * 1.5);
                    this.ctx.stroke();
                    
                    // Center glow
                    this.ctx.beginPath();
                    this.ctx.arc(screenPos.x, screenPos.y, r * 0.4, 0, Math.PI * 2);
                    this.ctx.fill();
                } else {
                    this.ctx.beginPath();
                    this.ctx.arc(screenPos.x, screenPos.y, r, 0, Math.PI * 2);
                    this.ctx.fill();
                }
                this.ctx.restore();
            }
        });

        // Guardar contexto para aplicar Zoom y Pan (Mundo) con temblor de cámara
        this.ctx.save();
        
        let shakeX = 0;
        let shakeY = 0;
        if (this.alienScanActive && this.drawUfoBeam) {
            shakeX = (Math.random() - 0.5) * 1.5;
            shakeY = (Math.random() - 0.5) * 1.5;
        } else if (this.destructionActive) {
            let shakeIntensity = 0;
            if (this.destructionTimer <= 3.0) {
                // Temblor leve que incrementa a medida que el sol se expande
                shakeIntensity = (this.destructionTimer / 3.0) * 3.5;
            } else if (this.destructionTimer <= 3.5) {
                // Temblor violento durante el colapso / supernova
                const t = (this.destructionTimer - 3.0) / 0.5;
                shakeIntensity = 12.0 * (1.0 - t);
            }
            if (shakeIntensity > 0) {
                shakeX = (Math.random() - 0.5) * shakeIntensity;
                shakeY = (Math.random() - 0.5) * shakeIntensity;
            }
        }

        this.ctx.translate(
            this.canvas.width / 2 - this.centerShiftX + this.panX + shakeX, 
            this.canvas.height / 2 + this.centerShiftY + this.panY + shakeY
        );
        this.ctx.scale(this.zoom, this.zoom);

        let destructionFade = 1.0;
        if (this.destructionActive) {
            destructionFade = Math.max(0, 1.0 - this.destructionTimer / 1.5);
        }

        // Dibujar onda de escaneo de radar alíen
        if (this.scanPulseActive) {
            this.ctx.save();
            const radius = this.scanPulseProgress * 1500;
            const opacity = 1.0 - this.scanPulseProgress;
            this.ctx.strokeStyle = `rgba(0, 255, 135, ${opacity})`;
            this.ctx.lineWidth = 3.5;
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = "#00ff87";
            this.ctx.beginPath();
            this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.restore();
        }

        // Anillos concéntricos expansivos de radar sobre el planeta siendo escaneado actualmente
        if (this.alienScanActive && this.activeScanPlanetPos) {
            this.ctx.save();
            this.ctx.shadowBlur = 12;
            this.ctx.shadowColor = "#00ff87";
            const baseRadius = this.activeScanPlanetRadius + 5;
            const progress = this.activeScanProgress; // 0 a 1
            for (let i = 0; i < 3; i++) {
                const ringProgress = (progress + i * 0.33) % 1.0;
                const ringRadius = baseRadius + ringProgress * 45;
                const ringOpacity = (1.0 - ringProgress) * 0.85;
                this.ctx.strokeStyle = `rgba(0, 255, 135, ${ringOpacity})`;
                this.ctx.lineWidth = 2.0 * (1.0 - ringProgress * 0.5);
                this.ctx.beginPath();
                this.ctx.arc(this.activeScanPlanetPos.x, this.activeScanPlanetPos.y, ringRadius, 0, Math.PI * 2);
                this.ctx.stroke();
            }
            this.ctx.restore();
        }

        // 3. Dibujar Líneas de Órbitas (Círculos concéntricos limpios, finos y semi-transparentes de neón)
        const parentIdsDrawn = new Set();
        this.nodes.forEach(node => {
            if (node.parentId && this.isDescendantOf(node, this.currentParentId)) {
                if (parentIdsDrawn.has(node.parentId)) return;
                parentIdsDrawn.add(node.parentId);

                const parentNode = this.nodes.find(n => n.id === node.parentId);
                if (parentNode) {
                    const parentScale = parentNode.currentScale !== undefined ? parentNode.currentScale : 1.0;
                    if (parentScale < 0.2) return; // Ocultar si el padre está colapsado

                    const parentPos = this.getNodeAbsolutePosition(parentNode);
                    const depth = this.getDepth(node, this.currentParentId);
                    const scale = node.currentScale !== undefined ? node.currentScale : 1.0;
                    let orbitRadius = (this.destructionActive && node.destructionOrbitRadius !== undefined)
                        ? node.destructionOrbitRadius
                        : (this.getNodeBaseOrbitRadius(node) * Math.max(0.55, scale));
                    if (parentNode.type !== "sun" && parentNode.orbitExpansion !== undefined && (!this.destructionActive || node.destructionOrbitRadius === undefined)) {
                        orbitRadius *= parentNode.orbitExpansion;
                    }
                    
                    let opacity = 0.18;
                    let lineWidth = 0.5;
                    let lineDash = [1, 4];
                    
                    if (parentNode.type === "sun") {
                        opacity = 0.22;
                        lineWidth = 0.75;
                        lineDash = [3, 5];
                    } else if (parentNode.type === "planet") {
                        opacity = 0.11;
                        lineWidth = 0.55;
                        lineDash = [2, 4];
                    } else if (parentNode.type === "planetoid") {
                        opacity = 0.05;
                        lineWidth = 0.4;
                        lineDash = [1, 5];
                    } else { // moon
                        opacity = 0.02;
                        lineWidth = 0.3;
                        lineDash = [1, 6];
                    }

                    // Destacar órbita si el padre o algún hijo está seleccionado o hovered
                    const isParentActive = 
                        (this.selectedNode && this.selectedNode.id === parentNode.id) ||
                        (this.hoveredNode && this.hoveredNode.id === parentNode.id);
                    
                    const isAnyChildActive = this.nodes.some(n => 
                        n.parentId === parentNode.id && (
                            (this.selectedNode && this.selectedNode.id === n.id) ||
                            (this.hoveredNode && this.hoveredNode.id === n.id)
                        )
                    );
                    
                    if (isParentActive || isAnyChildActive) {
                        opacity = Math.max(opacity * 2.2, 0.14);
                        lineWidth = Math.max(lineWidth * 1.3, 0.65);
                    }
                    
                    opacity *= destructionFade;
                    if (opacity > 0) {
                        this.ctx.strokeStyle = `rgba(0, 242, 254, ${opacity})`; 
                        this.ctx.lineWidth = lineWidth;
                        this.ctx.setLineDash(lineDash);
                        
                        this.ctx.beginPath();
                        this.ctx.arc(parentPos.x, parentPos.y, orbitRadius, 0, Math.PI * 2);
                        this.ctx.stroke();
                        this.ctx.setLineDash([]);
                    }
                }
            }
        });

        // 4. Dibujar Líneas de Conexión (Finas de color neón cian)
        this.nodes.forEach(node => {
            if (this.isDescendantOf(node, this.currentParentId)) {
                const parentNode = this.nodes.find(n => n.id === node.parentId);
                if (parentNode) {
                    const parentScale = parentNode.currentScale !== undefined ? parentNode.currentScale : 1.0;
                    const nodeScale = node.currentScale !== undefined ? node.currentScale : 1.0;
                    if (parentScale < 0.2 || nodeScale < 0.2) return; // ocultar si alguno está colapsado

                    const parentPos = this.getNodeAbsolutePosition(parentNode);
                    const nodePos = this.getNodeAbsolutePosition(node);
                    this.ctx.beginPath();
                    this.ctx.moveTo(parentPos.x, parentPos.y);
                    this.ctx.lineTo(nodePos.x, nodePos.y);
                    
                    let opacity = 0.15;
                    let lineWidth = 0.45;
                    
                    if (parentNode.type === "sun") {
                        opacity = 0.18;
                        lineWidth = 0.5;
                    } else if (parentNode.type === "planet") {
                        opacity = 0.08;
                        lineWidth = 0.4;
                    } else if (parentNode.type === "planetoid") {
                        opacity = 0.03;
                        lineWidth = 0.3;
                    } else { // moon
                        opacity = 0.01;
                        lineWidth = 0.2;
                    }

                    // Destacar si el nodo o el padre está seleccionado o hovered
                    const isNodeActive = 
                        (this.selectedNode && (this.selectedNode.id === node.id || this.selectedNode.id === parentNode.id)) ||
                        (this.hoveredNode && (this.hoveredNode.id === node.id || this.hoveredNode.id === parentNode.id));
                    
                    if (isNodeActive) {
                        opacity = Math.max(opacity * 2.5, 0.15);
                        lineWidth = Math.max(lineWidth * 1.3, 0.5);
                    }

                    opacity *= destructionFade;
                    if (opacity > 0) {
                        this.ctx.strokeStyle = `rgba(0, 242, 254, ${opacity})`;
                        this.ctx.lineWidth = lineWidth;
                        this.ctx.stroke();
                    }
                }
            }
        });

        // 5. Dibujar los Nodos Celestes (Renderizado 3D Híbrido)
        const nodesToDraw = this.nodes.filter(n => 
            n.id === this.currentParentId || 
            this.isDescendantOf(n, this.currentParentId)
        );

        nodesToDraw.forEach(node => {
            const r = this.getNodeRadius(node);
            if (r <= 0.1) return; // Evita errores de IndexSizeError al llamar a drawImage con dimensiones en 0 o negativas

            const pos = this.getNodeAbsolutePosition(node);

            // Dibujar brillo de atmósfera en 2D en el fondo (evitar duplicado del sol en destrucción)
            if (node.type !== "satellite" && (!this.destructionActive || node.type !== "sun")) {
                const baseColor = this.getNodeColor(node);
                const rgb = this.hexToRgb(baseColor);
                
                this.ctx.save();
                this.ctx.translate(pos.x, pos.y);
                const glowR = r * (node.type === "sun" ? 1.45 : 1.7);
                let atmosGrad;
                if (node.type === "sun") {
                    atmosGrad = this.ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, glowR);
                    atmosGrad.addColorStop(0, "rgba(255, 255, 255, 0.9)");
                    atmosGrad.addColorStop(0.2, "rgba(255, 210, 0, 0.7)");
                    atmosGrad.addColorStop(0.55, "rgba(255, 100, 0, 0.35)");
                    atmosGrad.addColorStop(0.8, "rgba(255, 50, 0, 0.12)");
                    atmosGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
                } else {
                    const alpha = 0.22;
                    atmosGrad = this.ctx.createRadialGradient(0, 0, r * 0.7, 0, 0, glowR);
                    atmosGrad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`);
                    atmosGrad.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha * 0.35})`);
                    atmosGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
                }
                this.ctx.fillStyle = atmosGrad;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, glowR, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
            }

            // Calcular dirección dinámica del Sol para iluminación 3D
            let sunDirection = null;
            if (node.id !== this.currentParentId) {
                const len = Math.hypot(pos.x, pos.y);
                if (len > 0) {
                    sunDirection = { x: -pos.x / len, y: -pos.y / len };
                }
            }

            // Renderizar con motor 3D si está disponible, sino usar fallback 2D
            // Para la destrucción, solo forzamos 2D en el sol para poder dibujar el agujero negro.
            let rendered3D = false;
            const force2D = this.destructionActive && node.type === "sun";
            if (this.renderer3d && !force2D) {
                try {
                    this.renderer3d.renderNode(this.ctx, pos.x, pos.y, r, node, sunDirection, time);
                    rendered3D = true;
                } catch (err) {
                    console.error("[SpaceEngine] Fallo en renderNode 3D, usando fallback 2D:", err);
                }
            }
            
            if (!rendered3D) {
                if (node.type === "sun") {
                    if (this.destructionActive && this.destructionTimer > 3.0) {
                        this.drawBlackHole(pos.x, pos.y, r, time, this.destructionTimer);
                    } else {
                        this.drawHudSun(pos.x, pos.y, r, time, this.destructionActive ? this.destructionTimer : null);
                    }
                } else if (node.type === "planet") {
                    this.drawHudPlanet(node, pos.x, pos.y, r, time);
                } else if (node.type === "planetoid") {
                    this.drawHudPlanetoid(node, pos.x, pos.y, r, time);
                } else if (node.type === "moon") {
                    this.drawHudMoon(node, pos.x, pos.y, r, time);
                } else {
                    this.drawHudSatellite(node, pos.x, pos.y, r, time);
                }
            }

            // Marcador de Selección / Hover HUD / Coincidencia de Búsqueda
            const isSelected = !this.destructionActive && this.selectedNode && this.selectedNode.id === node.id;
            const isHovered = !this.destructionActive && this.hoveredNode && this.hoveredNode.id === node.id;
            const isSearchMatch = !this.destructionActive && node.isSearchMatch;
            
            if (isSelected || isHovered) {
                this.drawTargetReticle(pos.x, pos.y, r, time, isSelected);
            } else if (isSearchMatch) {
                this.drawSearchMatchReticle(pos.x, pos.y, r, time);
            }

            // Dibujar Textos / Etiquetas
            const scale = node.currentScale !== undefined ? node.currentScale : 1.0;
            const screenRadius = r * this.zoom;
            
            let showLabel = false;
            const isCurrentParent = node.id === this.currentParentId;
            
            // Check direct child/parent relations
            const isChildOfSelected = this.selectedNode && node.parentId === this.selectedNode.id;
            const isParentOfSelected = this.selectedNode && node.id === this.selectedNode.parentId;
            const isChildOfHovered = this.hoveredNode && node.parentId === this.hoveredNode.id;
            
            const isDefaultVisible = !this.selectedNode && node.parentId === this.currentParentId;
            
            if (isCurrentParent || isSelected || isHovered || isSearchMatch) {
                showLabel = true;
            } else if (isChildOfSelected || isParentOfSelected || isChildOfHovered || isDefaultVisible) {
                // Apply a basic screen size check to avoid cluttering at extreme zoom-out
                showLabel = screenRadius >= 6;
            }
            
            if (this.destructionActive) {
                showLabel = false;
            }
            
            if (showLabel) {
                this.ctx.save();
                
                // Define style based on hierarchy
                let fontStyle = "bold 11px 'Outfit', sans-serif";
                let textFill = "#ffffff";
                let outlineWidth = 3;
                
                if (node.type === "sun") {
                    fontStyle = "bold 13px 'Orbitron', sans-serif";
                    textFill = "#ffd600";
                    outlineWidth = 3;
                } else if (node.type === "planet") {
                    fontStyle = "bold 11.5px 'Outfit', sans-serif";
                    textFill = "#ffffff";
                    outlineWidth = 3;
                } else if (node.type === "planetoid") {
                    fontStyle = "bold 10px 'Outfit', sans-serif";
                    textFill = "#e2e8f0";
                    outlineWidth = 2.5;
                } else if (node.type === "moon") {
                    fontStyle = "500 9px 'Outfit', sans-serif";
                    textFill = "#a0a5b0";
                    outlineWidth = 2;
                } else if (node.type === "satellite") {
                    fontStyle = "400 8px 'Outfit', sans-serif";
                    textFill = "#787d8a";
                    outlineWidth = 1.8;
                }
                
                this.ctx.font = fontStyle;
                this.ctx.textAlign = "center";
                this.ctx.textBaseline = "top";
                
                // Dibujar Borde Negro del texto para legibilidad
                this.ctx.strokeStyle = "rgba(2, 5, 20, 0.85)";
                this.ctx.lineWidth = outlineWidth;
                this.ctx.lineJoin = "round";
                this.ctx.strokeText(node.title, pos.x, pos.y + r + 8);
                // Rellenar Texto
                this.ctx.fillStyle = textFill;
                this.ctx.fillText(node.title, pos.x, pos.y + r + 8);
                
                this.ctx.restore();
            }
        });

        // Dibujar trayectoria del escaneo (línea punteada de vuelo del OVNI conectando hover points)
        if (this.alienScanActive && this.alienScanNodes.length > 0) {
            this.ctx.save();
            this.ctx.strokeStyle = "rgba(0, 255, 135, 0.38)";
            this.ctx.lineWidth = 1.6;
            this.ctx.shadowBlur = 8;
            this.ctx.shadowColor = "#00ff87";
            this.ctx.setLineDash([4, 6]);
            this.ctx.lineDashOffset = -time * 0.015;
            this.ctx.beginPath();
            this.ctx.moveTo(this.alienScanStartPos.x, this.alienScanStartPos.y);
            const hoverOffset = -55;
            this.alienScanNodes.forEach(node => {
                const pos = this.getNodeAbsolutePosition(node);
                this.ctx.lineTo(pos.x, pos.y + hoverOffset);
            });
            this.ctx.stroke();
            this.ctx.restore();
        }

        // Dibujar el ovni si la animación de búsqueda está activa
        if (this.alienScanActive) {
            this.drawAlienUFO(this.ctx, this.alienScanUfoPos.x, this.alienScanUfoPos.y, time);
        }

        // Dibujar partículas en espacio del mundo
        this.worldParticles.forEach(p => p.draw(this.ctx));

        // Dibujar onda expansiva de la supernova si corresponde
        if (this.destructionActive && this.destructionTimer > 3.0 && this.destructionTimer < 4.2) {
            const t = (this.destructionTimer - 3.0) / 1.2; // La onda expansiva dura 1.2s
            const radius = t * 900;
            const opacity = 1.0 - t;
            this.ctx.save();
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
            this.ctx.lineWidth = 6 * (1.0 - t);
            this.ctx.shadowBlur = 20 * (1.0 - t);
            this.ctx.shadowColor = "#00f2fe";
            this.ctx.beginPath();
            this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.restore();
        }

        this.ctx.restore(); // Restaurar Cámara (Mundo)

        // 6. RENDERIZAR CAPA DE INTERFAZ (Pantalla Completa)
        this.shootingStars.forEach(star => star.draw(this.ctx, time, this.renderer3d));
        this.particles.forEach(p => p.draw(this.ctx));
    }

    // ============================================================
    // 2D RENDER FALLBACK FUNCTIONS
    // ============================================================

    clipToCircle(r) {
        this.ctx.beginPath();
        this.ctx.arc(0, 0, r, 0, Math.PI * 2);
        this.ctx.clip();
    }

    drawSurfaceBand(ctx, cx, cy, rx, ry, rotation, alpha, color) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.translate(cx, cy);
        ctx.rotate(rotation);
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawHudSun(x, y, r, time, destructionTimer = null) {
        this.ctx.save();
        this.ctx.translate(x, y);

        // Define colors and gradients, shift to deep red/orange if expanding as red giant
        let coronaColor0 = "rgba(255, 180, 0, 0.5)";
        let coronaColor1 = "rgba(255, 120, 0, 0.25)";
        let coronaColor2 = "rgba(255, 60, 0, 0.08)";
        let coronaColor3 = "rgba(255, 40, 0, 0)";
        
        let innerGlowColor0 = "rgba(255, 255, 200, 0.6)";
        let innerGlowColor1 = "rgba(255, 180, 0, 0)";
        
        let sunColor0 = "#fffde7";
        let sunColor1 = "#ffcc02";
        let sunColor2 = "#ff8f00";
        let sunColor3 = "#bf360c";
        
        if (destructionTimer !== null && destructionTimer <= 3.0) {
            const t = destructionTimer / 3.0;
            // Desplazar hacia colores de gigante roja
            coronaColor0 = `rgba(${Math.floor(255)}, ${Math.floor(80 * (1 - t) + 10 * t)}, 0, 0.65)`;
            coronaColor1 = `rgba(${Math.floor(255)}, ${Math.floor(40 * (1 - t) + 5 * t)}, 0, 0.38)`;
            coronaColor2 = `rgba(${Math.floor(200)}, 0, 0, 0.15)`;
            coronaColor3 = "rgba(100, 0, 0, 0)";
            
            innerGlowColor0 = `rgba(255, ${Math.floor(180 * (1 - t) + 40 * t)}, 0, 0.65)`;
            innerGlowColor1 = "rgba(150, 0, 0, 0)";
            
            sunColor0 = `rgb(255, ${Math.floor(250 * (1 - t) + 80 * t)}, ${Math.floor(230 * (1 - t) + 20 * t)})`;
            sunColor1 = `rgb(255, ${Math.floor(200 * (1 - t) + 40 * t)}, 0)`;
            sunColor2 = `rgb(${Math.floor(255 * (1 - t) + 180 * t)}, ${Math.floor(100 * (1 - t))}, 0)`;
            sunColor3 = `rgb(${Math.floor(191 * (1 - t) + 100 * t)}, 0, 0)`;
        }

        // 1. Outer corona glow (reduced radius)
        const coronaGrad = this.ctx.createRadialGradient(0, 0, r * 0.8, 0, 0, r * 1.65);
        coronaGrad.addColorStop(0, coronaColor0);
        coronaGrad.addColorStop(0.3, coronaColor1);
        coronaGrad.addColorStop(0.7, coronaColor2);
        coronaGrad.addColorStop(1, coronaColor3);
        this.ctx.fillStyle = coronaGrad;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, r * 1.65, 0, Math.PI * 2);
        this.ctx.fill();

        // 2. Inner hot glow (reduced radius)
        const innerGlow = this.ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.2);
        innerGlow.addColorStop(0, innerGlowColor0);
        innerGlow.addColorStop(1, innerGlowColor1);
        this.ctx.fillStyle = innerGlow;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, r * 1.2, 0, Math.PI * 2);
        this.ctx.fill();

        // 3. Base sphere - hot plasma 3D
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(0, 0, r, 0, Math.PI * 2);
        this.ctx.clip();

        // Base warm orange-yellow sphere
        const sunBase = this.ctx.createRadialGradient(-r * 0.25, -r * 0.25, 0, r * 0.15, r * 0.15, r * 1.1);
        sunBase.addColorStop(0, sunColor0);
        sunBase.addColorStop(0.25, sunColor1);
        sunBase.addColorStop(0.6, sunColor2);
        sunBase.addColorStop(1, sunColor3);
        this.ctx.fillStyle = sunBase;
        this.ctx.fillRect(-r, -r, r * 2, r * 2);

        // Animated plasma surface cells
        const t = time * 0.0005;
        const cells = [
            { cx: Math.cos(t * 0.7) * r * 0.2, cy: Math.sin(t * 1.1) * r * 0.15, rx: r * 0.45, ry: r * 0.3, alpha: 0.18, color: "#ffee58" },
            { cx: Math.cos(t * 1.3 + 2) * r * 0.3, cy: Math.sin(t * 0.8 + 1) * r * 0.25, rx: r * 0.35, ry: r * 0.25, alpha: 0.22, color: "#fff9c4" },
            { cx: Math.cos(t * 0.5 + 4) * r * 0.25, cy: Math.sin(t * 1.5 + 3) * r * 0.2, rx: r * 0.3, ry: r * 0.22, alpha: 0.15, color: "#ff6f00" },
            { cx: Math.cos(t * 1.8 + 1) * r * 0.15, cy: Math.sin(t * 0.6 + 5) * r * 0.3, rx: r * 0.5, ry: r * 0.2, alpha: 0.12, color: "#ffe082" },
        ];
        cells.forEach(c => this.drawSurfaceBand(this.ctx, c.cx, c.cy, c.rx, c.ry, t, c.alpha, c.color));

        // Dark shadow side (subtle)
        const shadowGrad = this.ctx.createRadialGradient(r * 0.5, r * 0.5, 0, r * 0.3, r * 0.3, r * 1.2);
        shadowGrad.addColorStop(0, "rgba(0,0,0,0)");
        shadowGrad.addColorStop(1, "rgba(100, 20, 0, 0.35)");
        this.ctx.fillStyle = shadowGrad;
        this.ctx.fillRect(-r, -r, r * 2, r * 2);

        this.ctx.restore(); // end clip

        // 4. Specular highlight
        const specGrad = this.ctx.createRadialGradient(-r * 0.3, -r * 0.35, 0, -r * 0.3, -r * 0.35, r * 0.55);
        specGrad.addColorStop(0, "rgba(255, 255, 255, 0.7)");
        specGrad.addColorStop(0.4, "rgba(255, 255, 200, 0.2)");
        specGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
        this.ctx.fillStyle = specGrad;
        this.ctx.beginPath();
        this.ctx.arc(-r * 0.3, -r * 0.35, r * 0.55, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }

    drawBlackHole(x, y, r, time, timer) {
        this.ctx.save();
        this.ctx.translate(x, y);

        // Opacidad del agujero negro y del disco de acreción
        let opacity = 1.0;
        if (timer > 3.5) {
            opacity = 1.0 - (timer - 3.5) / 1.5;
        }

        this.ctx.globalAlpha = opacity;

        // 1. Disco de Acreción (elipse arremolinada y brillante)
        const numRings = 4;
        this.ctx.save();
        this.ctx.rotate(time * 0.0003); // Rotación lenta
        for (let i = 0; i < numRings; i++) {
            const ringR = r * (1.8 + i * 0.4);
            const ringOpacity = (0.5 - i * 0.1) * opacity;
            const grad = this.ctx.createRadialGradient(0, 0, ringR * 0.8, 0, 0, ringR * 1.2);
            grad.addColorStop(0, "rgba(0, 0, 0, 0)");
            if (i % 2 === 0) {
                grad.addColorStop(0.5, `rgba(185, 0, 255, ${ringOpacity})`); // Púrpura de neón
            } else {
                grad.addColorStop(0.5, `rgba(0, 242, 254, ${ringOpacity})`); // Cian de neón
            }
            grad.addColorStop(1, "rgba(0, 0, 0, 0)");
            this.ctx.strokeStyle = grad;
            this.ctx.lineWidth = r * 0.3;
            this.ctx.beginPath();
            this.ctx.ellipse(0, 0, ringR, ringR * 0.35, Math.PI / 6, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        this.ctx.restore();

        // 2. Anillo de Einstein (efecto de lente gravitacional brillante)
        const lensGrad = this.ctx.createRadialGradient(0, 0, r * 0.9, 0, 0, r * 1.35);
        lensGrad.addColorStop(0, "rgba(0, 0, 0, 1.0)");
        lensGrad.addColorStop(0.3, "rgba(255, 255, 255, 0.85)"); // Anillo de Einstein brillante
        lensGrad.addColorStop(0.7, "rgba(185, 0, 255, 0.35)"); // Halo púrpura
        lensGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        this.ctx.fillStyle = lensGrad;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, r * 1.35, 0, Math.PI * 2);
        this.ctx.fill();

        // 3. Horizonte de Sucesos (esfera negra sólida central)
        this.ctx.fillStyle = "#000000";
        this.ctx.beginPath();
        this.ctx.arc(0, 0, r, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }

    drawHudPlanet(node, x, y, r, time) {
        this.ctx.save();
        this.ctx.translate(x, y);

        const baseColor = this.getNodeColor(node);
        const rgb = this.hexToRgb(baseColor);

        // Derive color palette from base color
        const darkColor = `rgb(${Math.floor(rgb.r*0.25)}, ${Math.floor(rgb.g*0.25)}, ${Math.floor(rgb.b*0.25)})`;
        const midColor = `rgb(${Math.floor(rgb.r*0.65)}, ${Math.floor(rgb.g*0.65)}, ${Math.floor(rgb.b*0.65)})`;
        const lightColor = `rgb(${Math.min(255,Math.floor(rgb.r*1.3))}, ${Math.min(255,Math.floor(rgb.g*1.3))}, ${Math.min(255,Math.floor(rgb.b*1.3))})`;

        // 1. Outer atmospheric glow
        const atmosGrad = this.ctx.createRadialGradient(0, 0, r * 0.85, 0, 0, r * 1.9);
        atmosGrad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.45)`);
        atmosGrad.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`);
        atmosGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        this.ctx.fillStyle = atmosGrad;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, r * 1.9, 0, Math.PI * 2);
        this.ctx.fill();

        // 2. Clip and draw sphere body
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(0, 0, r, 0, Math.PI * 2);
        this.ctx.clip();

        // 2a. Base sphere gradient (lit from top-left)
        const sphereGrad = this.ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.05, r * 0.2, r * 0.2, r * 1.3);
        sphereGrad.addColorStop(0, lightColor);
        sphereGrad.addColorStop(0.35, midColor);
        sphereGrad.addColorStop(0.75, baseColor);
        sphereGrad.addColorStop(1, darkColor);
        this.ctx.fillStyle = sphereGrad;
        this.ctx.fillRect(-r, -r, r * 2, r * 2);

        // 2b. Procedural surface bands/terrain using deterministic seeds
        const val = this.getNodeSeed(node.seed || node.id, 100);
        const isGaseous = val < 0.55;
        if (val < 0.35) {
            // 1. Gaseous Giant (Jovian style)
            const numBands = 8;
            const h = (r * 2) / numBands;
            for (let i = 0; i < numBands; i++) {
                const bandY = -r + i * h;
                const opacity = 0.2 + this.getNodeSeed(node.seed || node.id, i * 3) * 0.45;
                const isBright = this.getNodeSeed(node.seed || node.id, i * 19) > 0.48;
                const bandColor = isBright 
                    ? `rgba(${Math.min(255, Math.floor(rgb.r * 1.15))}, ${Math.min(255, Math.floor(rgb.g * 1.15))}, ${Math.min(255, Math.floor(rgb.b * 1.15))}, ${opacity})`
                    : `rgba(${Math.floor(rgb.r * 0.55)}, ${Math.floor(rgb.g * 0.55)}, ${Math.floor(rgb.b * 0.55)}, ${opacity})`;
                
                this.ctx.fillStyle = bandColor;
                this.ctx.beginPath();
                this.ctx.moveTo(-r, bandY);
                for (let bx = -r; bx <= r; bx += r * 0.1) {
                    const wave = Math.sin(bx * (5 / r) + i * 2.3) * (h * 0.3);
                    this.ctx.lineTo(bx, bandY + wave);
                }
                this.ctx.lineTo(r, bandY + h);
                for (let bx = r; bx >= -r; bx -= r * 0.1) {
                    const wave = Math.sin(bx * (5 / r) + (i + 1) * 2.3) * (h * 0.3);
                    this.ctx.lineTo(bx, bandY + h + wave);
                }
                this.ctx.closePath();
                this.ctx.fill();

                // Storm/cyclone
                if (this.getNodeSeed(node.seed || node.id, i * 23) > 0.7) {
                    const spotX = (this.getNodeSeed(node.seed || node.id, i * 7) - 0.5) * r * 1.2;
                    const spotY = bandY + h / 2;
                    const spotRadius = (0.05 + this.getNodeSeed(node.seed || node.id, i * 5) * 0.08) * r;
                    const spotGrad = this.ctx.createRadialGradient(spotX, spotY, 0, spotX, spotY, spotRadius);
                    spotGrad.addColorStop(0, `rgba(${Math.min(255, rgb.r + 110)}, ${Math.floor(rgb.g * 0.25)}, ${Math.floor(rgb.b * 0.25)}, 0.85)`);
                    spotGrad.addColorStop(0.5, `rgba(${Math.floor(rgb.r * 0.75)}, ${Math.floor(rgb.g * 0.1)}, ${Math.floor(rgb.b * 0.1)}, 0.45)`);
                    spotGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
                    this.ctx.fillStyle = spotGrad;
                    this.ctx.beginPath();
                    this.ctx.ellipse(spotX, spotY, spotRadius * 1.5, spotRadius, 0, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        } else if (val < 0.55) {
            // 2. Ice Giant (Neptunian/Uranian smooth bands & polar atmosphere haze)
            const numBands = 6;
            const h = (r * 2) / numBands;
            for (let i = 0; i < numBands; i++) {
                const bandY = -r + i * h;
                const opacity = 0.15;
                this.ctx.fillStyle = `rgba(${Math.min(255, Math.floor(rgb.r * 1.15))}, ${Math.min(255, Math.floor(rgb.g * 1.15))}, ${Math.min(255, Math.floor(rgb.b * 1.15))}, ${opacity})`;
                this.ctx.fillRect(-r, bandY, r * 2, h);
            }
            // Soft polar haze overlay
            const polarHaze = this.ctx.createLinearGradient(0, -r, 0, r);
            polarHaze.addColorStop(0, `rgba(${Math.min(255, Math.floor(rgb.r * 1.1))}, ${Math.min(255, Math.floor(rgb.g * 1.1))}, ${Math.min(255, Math.floor(rgb.b * 1.1))}, 0.15)`);
            polarHaze.addColorStop(0.25, "rgba(0, 0, 0, 0)");
            polarHaze.addColorStop(0.75, "rgba(0, 0, 0, 0)");
            polarHaze.addColorStop(1, `rgba(${Math.min(255, Math.floor(rgb.r * 1.1))}, ${Math.min(255, Math.floor(rgb.g * 1.1))}, ${Math.min(255, Math.floor(rgb.b * 1.1))}, 0.15)`);
            this.ctx.fillStyle = polarHaze;
            this.ctx.fillRect(-r, -r, r * 2, r * 2);
        } else if (val < 0.75) {
            // 3. Terrestrial Earth-like (continents, cap polar, clouds)
            // Base is ocean (darker shade of the base color)
            this.ctx.fillStyle = `rgb(${Math.floor(rgb.r * 0.55)}, ${Math.floor(rgb.g * 0.55)}, ${Math.floor(rgb.b * 0.55)})`;
            this.ctx.fillRect(-r, -r, r * 2, r * 2);

            const numContinents = 5 + Math.floor(this.getNodeSeed(node.seed || node.id, 18) * 4);
            for (let i = 0; i < numContinents; i++) {
                const cx = (this.getNodeSeed(node.seed || node.id, i * 4) - 0.5) * r * 1.4;
                const cy = (this.getNodeSeed(node.seed || node.id, i * 8) - 0.5) * r * 1.4;
                const rx = (0.2 + this.getNodeSeed(node.seed || node.id, i * 12) * 0.3) * r;
                const ry = (0.15 + this.getNodeSeed(node.seed || node.id, i * 16) * 0.2) * r;
                const rot = this.getNodeSeed(node.seed || node.id, i * 22) * Math.PI;

                this.ctx.save();
                this.ctx.translate(cx, cy);
                this.ctx.rotate(rot);

                this.ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.95)`;

                this.ctx.beginPath();
                for (let a = 0; a < Math.PI * 2; a += 0.3) {
                    const noise = 1 + (this.getNodeSeed(node.seed || node.id, i * 3 + a) - 0.5) * 0.3;
                    const px = Math.cos(a) * rx * noise;
                    const py = Math.sin(a) * ry * noise;
                    if (a === 0) this.ctx.moveTo(px, py);
                    else this.ctx.lineTo(px, py);
                }
                this.ctx.closePath();
                this.ctx.fill();

                // Coastlines
                this.ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
                this.ctx.lineWidth = 1.5;
                this.ctx.stroke();

                this.ctx.restore();
            }

            // Polar Caps (shrunk to 0.04)
            const capH = r * 0.04;
            const polarGradN = this.ctx.createLinearGradient(0, -r, 0, -r + capH);
            polarGradN.addColorStop(0, "rgba(255, 255, 255, 0.98)");
            polarGradN.addColorStop(1, "rgba(255, 255, 255, 0)");
            this.ctx.fillStyle = polarGradN;
            this.ctx.fillRect(-r, -r, r * 2, capH);

            const polarGradS = this.ctx.createLinearGradient(0, r, 0, r - capH);
            polarGradS.addColorStop(0, "rgba(255, 255, 255, 0.98)");
            polarGradS.addColorStop(1, "rgba(255, 255, 255, 0)");
            this.ctx.fillStyle = polarGradS;
            this.ctx.fillRect(-r, r - capH, r * 2, capH);

            // Cloud overlay (limited to 3 layers with max 0.25 opacity)
            const numClouds = 3;
            for (let i = 0; i < numClouds; i++) {
                const cy = (this.getNodeSeed(node.seed || node.id, i * 3) - 0.5) * r * 1.6;
                const ch = (0.05 + this.getNodeSeed(node.seed || node.id, i * 7) * 0.05) * r;
                const cloudGrad = this.ctx.createLinearGradient(0, cy - ch/2, 0, cy + ch/2);
                cloudGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
                cloudGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.25)");
                cloudGrad.addColorStop(1, "rgba(255, 255, 255, 0)");

                this.ctx.fillStyle = cloudGrad;
                this.ctx.beginPath();
                this.ctx.moveTo(-r, cy);
                for (let bx = -r; bx <= r; bx += r * 0.1) {
                    const wave = Math.sin(bx * (4 / r) + i * 4.1) * (ch * 0.65);
                    this.ctx.lineTo(bx, cy + wave);
                }
                this.ctx.lineTo(r, cy + ch);
                this.ctx.lineTo(-r, cy + ch);
                this.ctx.closePath();
                this.ctx.fill();
            }
        } else {
            // 4. Terrestrial Volcanic (basalt crust, lava rivers, ash clouds) (dynamic pastel color)
            const baseR = Math.floor(rgb.r * 0.65);
            const baseG = Math.floor(rgb.g * 0.65);
            const baseB = Math.floor(rgb.b * 0.65);
            this.ctx.fillStyle = `rgb(${baseR}, ${baseG}, ${baseB})`;
            this.ctx.fillRect(-r, -r, r * 2, r * 2);

            // Lava river paths
            this.ctx.strokeStyle = "rgba(255, 60, 0, 0.85)";
            this.ctx.lineWidth = 1.5;
            for (let i = 0; i < 5; i++) {
                let lx = (this.getNodeSeed(node.seed || node.id, i * 15) - 0.5) * r * 1.2;
                let ly = (this.getNodeSeed(node.seed || node.id, i * 22) - 0.5) * r * 1.2;
                this.ctx.beginPath();
                this.ctx.moveTo(lx, ly);
                for (let j = 0; j < 4; j++) {
                    lx += (this.getNodeSeed(node.seed || node.id, i * 3 + j * 5) - 0.5) * r * 0.35;
                    ly += (this.getNodeSeed(node.seed || node.id, i * 7 + j * 9) - 0.5) * r * 0.35;
                    this.ctx.lineTo(lx, ly);
                }
                this.ctx.stroke();
            }

            // Lava spots/craters
            for (let i = 0; i < 3; i++) {
                const cx = (this.getNodeSeed(node.seed || node.id, i * 12) - 0.5) * r * 1.1;
                const cy = (this.getNodeSeed(node.seed || node.id, i * 19) - 0.5) * r * 1.1;
                const cr = (0.05 + this.getNodeSeed(node.seed || node.id, i * 13) * 0.08) * r;
                const grad = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
                grad.addColorStop(0, "rgba(255, 140, 0, 0.95)");
                grad.addColorStop(0.4, "rgba(255, 30, 0, 0.7)");
                grad.addColorStop(1, "rgba(0, 0, 0, 0)");
                this.ctx.fillStyle = grad;
                this.ctx.beginPath();
                this.ctx.arc(cx, cy, cr, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // Dark ash clouds
            const numAsh = 3;
            for (let i = 0; i < numAsh; i++) {
                const cy = (this.getNodeSeed(node.seed || node.id, i * 9) - 0.5) * r * 1.6;
                const ch = (0.08 + this.getNodeSeed(node.seed || node.id, i * 14) * 0.08) * r;
                this.ctx.fillStyle = `rgba(${Math.floor(rgb.r * 0.85)}, ${Math.floor(rgb.g * 0.85)}, ${Math.floor(rgb.b * 0.85)}, ${0.2 + this.getNodeSeed(node.seed || node.id, i * 3) * 0.25})`;
                this.ctx.beginPath();
                this.ctx.moveTo(-r, cy);
                for (let bx = -r; bx <= r; bx += r * 0.1) {
                    const wave = Math.sin(bx * (4 / r) + i * 2.1) * (ch * 0.5);
                    this.ctx.lineTo(bx, cy + wave);
                }
                this.ctx.lineTo(r, cy + ch);
                this.ctx.lineTo(-r, cy + ch);
                this.ctx.closePath();
                this.ctx.fill();
            }
        }

        // 2c. Dark shadow hemisphere (right+bottom)
        const shadowGrad = this.ctx.createRadialGradient(r * 0.55, r * 0.55, 0, r * 0.2, r * 0.2, r * 1.55);
        shadowGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
        shadowGrad.addColorStop(0.55, "rgba(0, 0, 0, 0.25)");
        shadowGrad.addColorStop(1, "rgba(0, 0, 0, 0.72)");
        this.ctx.fillStyle = shadowGrad;
        this.ctx.fillRect(-r, -r, r * 2, r * 2);

        this.ctx.restore(); // end clip

        // 3. Specular highlight (top-left bright spot) - softer for gaseous planets
        const specOpacity = isGaseous ? 0.35 : 0.75;
        const specGrad = this.ctx.createRadialGradient(-r * 0.38, -r * 0.38, 0, -r * 0.38, -r * 0.38, r * 0.5);
        specGrad.addColorStop(0, `rgba(255, 255, 255, ${specOpacity})`);
        specGrad.addColorStop(0.35, `rgba(255, 255, 255, ${specOpacity * 0.33})`);
        specGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
        this.ctx.fillStyle = specGrad;
        this.ctx.beginPath();
        this.ctx.arc(-r * 0.38, -r * 0.38, r * 0.5, 0, Math.PI * 2);
        this.ctx.fill();

        // 4. Rim light (atmospheric edge glow)
        const rimGrad = this.ctx.createRadialGradient(0, 0, r * 0.78, 0, 0, r);
        rimGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
        rimGrad.addColorStop(0.7, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.0)`);
        rimGrad.addColorStop(1, `rgba(${Math.min(255,rgb.r+80)}, ${Math.min(255,rgb.g+80)}, ${Math.min(255,rgb.b+120)}, 0.65)`);
        this.ctx.fillStyle = rimGrad;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, r, 0, Math.PI * 2);
        this.ctx.fill();

        // 5. Planetary Rings (procedurally for some nodes)
        const hasRings = this.getNodeSeed(node.seed || node.id, 8) > 0.6;
        if (hasRings) {
            this.ctx.save();
            this.ctx.rotate(-0.35);
            
            // Ring shadow behind planet
            this.ctx.globalAlpha = 0.35;
            const ringShadow = this.ctx.createLinearGradient(-r * 1.8, 0, r * 1.8, 0);
            ringShadow.addColorStop(0, "rgba(0,0,0,0)");
            ringShadow.addColorStop(0.3, `rgba(${Math.floor(rgb.r*0.4)}, ${Math.floor(rgb.g*0.4)}, ${Math.floor(rgb.b*0.4)}, 0.8)`);
            ringShadow.addColorStop(0.7, `rgba(${Math.floor(rgb.r*0.4)}, ${Math.floor(rgb.g*0.4)}, ${Math.floor(rgb.b*0.4)}, 0.8)`);
            ringShadow.addColorStop(1, "rgba(0,0,0,0)");

            // Draw filled ring bands
            this.ctx.globalAlpha = 1;
            this.ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7)`;
            this.ctx.lineWidth = r * 0.18;
            this.ctx.beginPath();
            this.ctx.ellipse(0, 0, r * 1.6, r * 0.28, 0, 0, Math.PI * 2);
            this.ctx.stroke();

            this.ctx.strokeStyle = `rgba(${Math.min(255,rgb.r+60)}, ${Math.min(255,rgb.g+60)}, ${Math.min(255,rgb.b+60)}, 0.45)`;
            this.ctx.lineWidth = r * 0.08;
            this.ctx.beginPath();
            this.ctx.ellipse(0, 0, r * 1.9, r * 0.34, 0, 0, Math.PI * 2);
            this.ctx.stroke();

            this.ctx.restore();
        }

        this.ctx.restore();
    }

    drawHudPlanetoid(node, x, y, r, time) {
        this.ctx.save();
        this.ctx.translate(x, y);

        const baseColor = this.getNodeColor(node);
        const rgb = this.hexToRgb(baseColor);
        const val = this.getNodeSeed(node.seed || node.id, 100);

        // Derive color palette based on sub-type
        let darkColor, midColor, lightColor;
        if (val < 0.45) {
            // Rocky: brown-grey (brightened)
            darkColor = `rgb(${Math.floor(rgb.r*0.55)}, ${Math.floor(rgb.g*0.55)}, ${Math.floor(rgb.b*0.55)})`;
            midColor = `rgb(${Math.floor(rgb.r*0.95)}, ${Math.floor(rgb.g*0.95)}, ${Math.floor(rgb.b*0.95)})`;
            lightColor = `rgb(${Math.min(255,Math.floor(rgb.r*1.45))}, ${Math.min(255,Math.floor(rgb.g*1.45))}, ${Math.min(255,Math.floor(rgb.b*1.45))})`;
        } else if (val < 0.8) {
            // Metallic: light steel grey (dynamic light metal)
            darkColor = `rgb(${Math.floor(rgb.r * 0.35 + 100 * 0.65)}, ${Math.floor(rgb.g * 0.35 + 105 * 0.65)}, ${Math.floor(rgb.b * 0.35 + 115 * 0.65)})`;
            midColor = `rgb(${Math.floor(rgb.r * 0.35 + 160 * 0.65)}, ${Math.floor(rgb.g * 0.35 + 165 * 0.65)}, ${Math.floor(rgb.b * 0.35 + 175 * 0.65)})`;
            lightColor = `rgb(${Math.floor(rgb.r * 0.35 + 220 * 0.65)}, ${Math.floor(rgb.g * 0.35 + 225 * 0.65)}, ${Math.floor(rgb.b * 0.35 + 235 * 0.65)})`;
        } else {
            // Comet: bright cyan-white
            darkColor = "#2c4c64";
            midColor = "#7faec4";
            lightColor = "#e3f2fd";
        }

        // Deformed polygon silhouette representation
        const numPoints = 10;
        const vertices = [];
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const noise = 1 + (this.getNodeSeed(node.seed || node.id, i * 4) - 0.5) * 0.16;
            vertices.push({
                x: Math.cos(angle) * r * noise,
                y: Math.sin(angle) * r * noise
            });
        }

        // 1a. Comet tail (drawn behind body)
        if (val >= 0.8) {
            this.ctx.save();
            const cx = this.canvas ? (this.canvas.width / 2 - this.centerShiftX) : 0;
            const cy = this.canvas ? (this.canvas.height / 2 + this.centerShiftY) : 0;
            const tailAngle = Math.atan2((this.canvas.height / 2 + this.centerShiftY) - (y + this.panY), (this.canvas.width / 2 - this.centerShiftX) - (x + this.panX)); // Appears pointing away from center
            this.ctx.rotate(tailAngle + Math.PI); // opposite direction
            
            // Draw a cone extending away from the sun
            const tailGrad = this.ctx.createLinearGradient(0, 0, r * 3.5, 0);
            tailGrad.addColorStop(0, "rgba(0, 242, 254, 0.45)");
            tailGrad.addColorStop(0.3, "rgba(0, 242, 254, 0.15)");
            tailGrad.addColorStop(1, "rgba(0, 242, 254, 0)");
            this.ctx.fillStyle = tailGrad;
            this.ctx.beginPath();
            this.ctx.moveTo(0, -r * 0.4);
            this.ctx.lineTo(r * 3.5, -r * 1.1);
            this.ctx.lineTo(r * 3.5, r * 1.1);
            this.ctx.lineTo(0, r * 0.4);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.restore();
        }

        // 1b. Outer atmospheric glow conforming to the irregular silhouette
        const glowVertices = vertices.map(v => ({ x: v.x * 1.6, y: v.y * 1.6 }));
        this.ctx.save();
        const atmosGrad = this.ctx.createRadialGradient(0, 0, r * 0.7, 0, 0, r * 1.7);
        if (val >= 0.8) {
            // Comet cyan aura
            atmosGrad.addColorStop(0, "rgba(0, 242, 254, 0.45)");
            atmosGrad.addColorStop(0.5, "rgba(0, 242, 254, 0.15)");
        } else {
            atmosGrad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`);
            atmosGrad.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`);
        }
        atmosGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        this.ctx.fillStyle = atmosGrad;
        this.ctx.beginPath();
        this.ctx.moveTo(glowVertices[0].x, glowVertices[0].y);
        for (let i = 1; i < glowVertices.length; i++) {
            this.ctx.lineTo(glowVertices[i].x, glowVertices[i].y);
        }
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.restore();

        // 2. Clip and draw irregular body
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < vertices.length; i++) {
            this.ctx.lineTo(vertices[i].x, vertices[i].y);
        }
        this.ctx.closePath();
        this.ctx.clip();

        // Base gradient (lit from top-left)
        const sphereGrad = this.ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.05, r * 0.2, r * 0.2, r * 1.3);
        sphereGrad.addColorStop(0, lightColor);
        sphereGrad.addColorStop(0.3, midColor);
        if (val < 0.45) {
            sphereGrad.addColorStop(0.75, baseColor);
        } else if (val < 0.8) {
            sphereGrad.addColorStop(0.75, `rgb(${Math.floor(rgb.r*0.4 + 120*0.6)}, ${Math.floor(rgb.g*0.4 + 125*0.6)}, ${Math.floor(rgb.b*0.4 + 135*0.6)})`);
        } else {
            sphereGrad.addColorStop(0.75, "#527e9c");
        }
        sphereGrad.addColorStop(1, darkColor);
        this.ctx.fillStyle = sphereGrad;
        this.ctx.fillRect(-r * 1.5, -r * 1.5, r * 3, r * 3);

        if (val < 0.45) {
            // Rocky Asteroid features
            // Rocky speckle noise
            for (let i = 0; i < 30; i++) {
                const px = (this.getNodeSeed(node.seed || node.id, i * 2) - 0.5) * r * 2.2;
                const py = (this.getNodeSeed(node.seed || node.id, i * 5) - 0.5) * r * 2.2;
                const pr = 1 + this.getNodeSeed(node.seed || node.id, i * 9) * 1.5;
                this.ctx.fillStyle = i % 2 === 0 ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.15)";
                this.ctx.beginPath();
                this.ctx.arc(px, py, pr, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // Tectonic cracks
            const numCracks = 6 + Math.floor(this.getNodeSeed(node.seed || node.id, 2) * 5);
            for (let i = 0; i < numCracks; i++) {
                const x1 = (this.getNodeSeed(node.seed || node.id, i * 7) - 0.5) * r * 1.2;
                const y1 = (this.getNodeSeed(node.seed || node.id, i * 11) - 0.5) * r * 1.2;
                const x2 = x1 + (this.getNodeSeed(node.seed || node.id, i * 13) - 0.5) * r * 0.6;
                const y2 = y1 + (this.getNodeSeed(node.seed || node.id, i * 17) - 0.5) * r * 0.6;

                this.ctx.strokeStyle = "rgba(0, 0, 0, 0.78)";
                this.ctx.lineWidth = 1 + this.getNodeSeed(node.seed || node.id, i * 2) * 1.5;
                this.ctx.beginPath();
                this.ctx.moveTo(x1, y1);
                this.ctx.lineTo(x2, y2);
                this.ctx.stroke();

                this.ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
                this.ctx.lineWidth = 0.8;
                this.ctx.beginPath();
                this.ctx.moveTo(x1 + 0.8, y1 + 0.8);
                this.ctx.lineTo(x2 + 0.8, y2 + 0.8);
                this.ctx.stroke();
            }

            // Craters
            const numCraters = 4 + Math.floor(this.getNodeSeed(node.seed || node.id, 41) * 4);
            for (let i = 0; i < numCraters; i++) {
                const cx = (this.getNodeSeed(node.seed || node.id, i * 33) - 0.5) * r * 1.1;
                const cy = (this.getNodeSeed(node.seed || node.id, i * 47) - 0.5) * r * 1.1;
                const cr = (0.05 + this.getNodeSeed(node.seed || node.id, i * 15) * 0.08) * r;

                const craterGrad = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
                craterGrad.addColorStop(0, "rgba(0, 0, 0, 0.72)");
                craterGrad.addColorStop(0.75, "rgba(0, 0, 0, 0.36)");
                craterGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
                this.ctx.fillStyle = craterGrad;
                this.ctx.beginPath();
                this.ctx.arc(cx, cy, cr, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
                this.ctx.lineWidth = 1.0;
                this.ctx.beginPath();
                this.ctx.arc(cx + 0.8, cy + 0.8, cr, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        } else if (val < 0.8) {
            // Metallic Ore Asteroid features
            // Metallic crystalline grains
            for (let i = 0; i < 20; i++) {
                const px = (this.getNodeSeed(node.seed || node.id, i * 4) - 0.5) * r * 2;
                const py = (this.getNodeSeed(node.seed || node.id, i * 7) - 0.5) * r * 2;
                const pw = 2 + this.getNodeSeed(node.seed || node.id, i * 11) * 4;
                this.ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
                this.ctx.fillRect(px, py, pw, pw);
            }

            // Mineral veins (Gold or Neon Cyan)
            const veinColor = rgb.r > rgb.g ? "rgba(255, 215, 0, 0.85)" : "rgba(0, 242, 254, 0.85)";
            const numVeins = 3 + Math.floor(this.getNodeSeed(node.seed || node.id, 29) * 3);
            for (let i = 0; i < numVeins; i++) {
                let vx = (this.getNodeSeed(node.seed || node.id, i * 30) - 0.5) * r * 1.1;
                let vy = (this.getNodeSeed(node.seed || node.id, i * 40) - 0.5) * r * 1.1;
                this.ctx.strokeStyle = veinColor;
                this.ctx.lineWidth = 1.4;
                this.ctx.beginPath();
                this.ctx.moveTo(vx, vy);
                for (let j = 0; j < 4; j++) {
                    vx += (this.getNodeSeed(node.seed || node.id, i * 3 + j * 5) - 0.5) * r * 0.28;
                    vy += (this.getNodeSeed(node.seed || node.id, i * 7 + j * 9) - 0.5) * r * 0.28;
                    this.ctx.lineTo(vx, vy);
                }
                this.ctx.stroke();

                // Shiny node deposit
                this.ctx.fillStyle = veinColor;
                this.ctx.beginPath();
                this.ctx.arc(vx, vy, 1.8, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // Craters with metallic highlights
            const numCraters = 3;
            for (let i = 0; i < numCraters; i++) {
                const cx = (this.getNodeSeed(node.seed || node.id, i * 33) - 0.5) * r * 1.1;
                const cy = (this.getNodeSeed(node.seed || node.id, i * 47) - 0.5) * r * 1.1;
                const cr = (0.05 + this.getNodeSeed(node.seed || node.id, i * 15) * 0.08) * r;

                this.ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
                this.ctx.beginPath();
                this.ctx.arc(cx, cy, cr, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.strokeStyle = veinColor;
                this.ctx.lineWidth = 0.8;
                this.ctx.beginPath();
                this.ctx.arc(cx + 0.6, cy + 0.6, cr, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        } else {
            // Active Comet features
            // Soft deep blue ice patches
            for (let i = 0; i < 4; i++) {
                const cx = (this.getNodeSeed(node.seed || node.id, i * 12) - 0.5) * r * 1.1;
                const cy = (this.getNodeSeed(node.seed || node.id, i * 15) - 0.5) * r * 1.1;
                const cr = (0.15 + this.getNodeSeed(node.seed || node.id, i * 8) * 0.25) * r;
                const iceGrad = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
                iceGrad.addColorStop(0, "rgba(50, 110, 168, 0.5)");
                iceGrad.addColorStop(0.7, "rgba(50, 110, 168, 0.15)");
                iceGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
                this.ctx.fillStyle = iceGrad;
                this.ctx.beginPath();
                this.ctx.arc(cx, cy, cr, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // Sublimation fractures (glowing white lines)
            const numFractures = 6;
            for (let i = 0; i < numFractures; i++) {
                const x1 = (this.getNodeSeed(node.seed || node.id, i * 5) - 0.5) * r * 1.2;
                const y1 = (this.getNodeSeed(node.seed || node.id, i * 8) - 0.5) * r * 1.2;
                const x2 = x1 + (this.getNodeSeed(node.seed || node.id, i * 9) - 0.5) * r * 0.5;
                const y2 = y1 + (this.getNodeSeed(node.seed || node.id, i * 13) - 0.5) * r * 0.5;
                
                this.ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
                this.ctx.lineWidth = 1.0;
                this.ctx.beginPath();
                this.ctx.moveTo(x1, y1);
                this.ctx.lineTo(x2, y2);
                this.ctx.stroke();
            }
        }

        // Shadow
        const shadowGrad = this.ctx.createRadialGradient(r * 0.55, r * 0.55, 0, r * 0.2, r * 0.2, r * 1.55);
        shadowGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
        shadowGrad.addColorStop(0.5, "rgba(0, 0, 0, 0.25)");
        shadowGrad.addColorStop(1, "rgba(0, 0, 0, 0.75)");
        this.ctx.fillStyle = shadowGrad;
        this.ctx.fillRect(-r * 1.5, -r * 1.5, r * 3, r * 3);

        this.ctx.restore(); // end clip

        // 3. Sharp Specular highlight
        const specGrad = this.ctx.createRadialGradient(-r * 0.35, -r * 0.35, 0, -r * 0.35, -r * 0.35, r * 0.45);
        specGrad.addColorStop(0, "rgba(255, 235, 200, 0.82)");
        specGrad.addColorStop(0.3, "rgba(255, 200, 150, 0.22)");
        specGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
        this.ctx.fillStyle = specGrad;
        this.ctx.beginPath();
        this.ctx.arc(-r * 0.35, -r * 0.35, r * 0.45, 0, Math.PI * 2);
        this.ctx.fill();

        // 4. Rim light
        const rimGrad = this.ctx.createRadialGradient(0, 0, r * 0.78, 0, 0, r);
        rimGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
        rimGrad.addColorStop(0.7, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.0)`);
        rimGrad.addColorStop(1, `rgba(${Math.min(255, rgb.r + 90)}, ${Math.min(255, rgb.g + 75)}, ${Math.min(255, rgb.b + 60)}, 0.65)`);
        this.ctx.fillStyle = rimGrad;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, r, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }

    drawHudMoon(node, x, y, r, time) {
        this.ctx.save();
        this.ctx.translate(x, y);

        const baseColor = this.getNodeColor(node);
        const rgb = this.hexToRgb(baseColor);
        const seed = node.seed || node.id;

        // 1. Brillo exterior
        this.ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`;
        this.ctx.shadowBlur = r * 0.8;

        // 2. Trazado de Asteroide/Luna Irregular (Polígono de 8 lados ligeramente distorsionado)
        this.ctx.fillStyle = baseColor;
        this.ctx.beginPath();
        const numVertices = 8;
        for (let i = 0; i < numVertices; i++) {
            const angle = (i / numVertices) * Math.PI * 2;
            // Usar la semilla para obtener una deformación determinista por vértice
            const noise = 0.82 + this.getNodeSeed(seed, i * 17) * 0.28;
            const px = Math.cos(angle) * r * noise;
            const py = Math.sin(angle) * r * noise;
            if (i === 0) this.ctx.moveTo(px, py);
            else this.ctx.lineTo(px, py);
        }
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.shadowBlur = 0;

        // 3. Sombras y textura de cráteres simplificados en 2D (estilo Sci-Fi)
        // Aplicamos sombreado source-atop
        this.ctx.globalCompositeOperation = "source-atop";
        
        // Degradado de sombra 3D
        const shadeGrad = this.ctx.createRadialGradient(-r * 0.2, -r * 0.2, 0, -r * 0.2, -r * 0.2, r * 1.5);
        shadeGrad.addColorStop(0, "rgba(255, 255, 255, 0.18)");
        shadeGrad.addColorStop(0.5, "rgba(0, 0, 0, 0.22)");
        shadeGrad.addColorStop(1, "rgba(0, 0, 0, 0.78)");
        this.ctx.fillStyle = shadeGrad;
        this.ctx.fillRect(-r * 1.5, -r * 1.5, r * 3, r * 3);

        // Dibujar algunos cráteres sutiles dentro
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
        for (let i = 0; i < 3; i++) {
            const cx = (this.getNodeSeed(seed, i * 23) - 0.5) * r * 0.8;
            const cy = (this.getNodeSeed(seed, i * 29) - 0.5) * r * 0.8;
            const cr = (0.12 + this.getNodeSeed(seed, i * 5) * 0.12) * r;
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, cr, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.restore();
    }

    drawHudSatellite(node, x, y, r, time) {
        this.ctx.save();
        this.ctx.translate(x, y);
        
        // Rotación lenta sobre el eje central para efecto espacial
        const rotAngle = time * 0.0004;
        this.ctx.rotate(rotAngle);

        const baseColor = this.getNodeColor(node);
        const rgb = this.hexToRgb(baseColor);
        const seed = node.seed || node.id;
        const val = this.getNodeSeed(seed, 100);

        if (val < 0.4) {
            // --- 1. Comm Satellite (foil plates, solar wings, beacon) ---
            // Brazos conectores de los paneles
            this.ctx.strokeStyle = "#ffffff";
            this.ctx.lineWidth = 1.2;
            this.ctx.beginPath();
            this.ctx.moveTo(-r * 0.8, 0);
            this.ctx.lineTo(-r * 0.5, 0);
            this.ctx.moveTo(r * 0.5, 0);
            this.ctx.lineTo(r * 0.8, 0);
            this.ctx.stroke();

            // Panel izquierdo
            const lx = -r * 1.85, ly = -r * 0.35, pw = r * 1.05, ph = r * 0.7;
            const lGrad = this.ctx.createLinearGradient(lx, ly, lx + pw, ly);
            lGrad.addColorStop(0, "#081d33");
            lGrad.addColorStop(1, "#0c2440");
            this.ctx.fillStyle = lGrad;
            this.ctx.fillRect(lx, ly, pw, ph);
            this.ctx.strokeStyle = "#00f2fe"; // Cian brillante
            this.ctx.lineWidth = 1.5;
            this.ctx.strokeRect(lx, ly, pw, ph);

            // Rejilla de celdas izquierda
            this.ctx.strokeStyle = "rgba(0, 242, 254, 0.42)";
            this.ctx.lineWidth = 0.8;
            for (let gx = lx + pw / 3; gx < lx + pw; gx += pw / 3) {
                this.ctx.beginPath(); this.ctx.moveTo(gx, ly); this.ctx.lineTo(gx, ly + ph); this.ctx.stroke();
            }
            for (let gy = ly + ph / 4; gy < ly + ph; gy += ph / 4) {
                this.ctx.beginPath(); this.ctx.moveTo(lx, gy); this.ctx.lineTo(lx + pw, gy); this.ctx.stroke();
            }

            // Panel derecho
            const rx = r * 0.8, ry = -r * 0.35, rpw = r * 1.05, rph = r * 0.7;
            const rGrad = this.ctx.createLinearGradient(rx, ry, rx + rpw, ry);
            rGrad.addColorStop(0, "#0c2440");
            rGrad.addColorStop(1, "#081d33");
            this.ctx.fillStyle = rGrad;
            this.ctx.fillRect(rx, ry, rpw, rph);
            this.ctx.strokeStyle = "#00f2fe";
            this.ctx.lineWidth = 1.5;
            this.ctx.strokeRect(rx, ry, rpw, rph);

            // Rejilla de celdas derecha
            this.ctx.strokeStyle = "rgba(0, 242, 254, 0.42)";
            this.ctx.lineWidth = 0.8;
            for (let gx = rx + rpw / 3; gx < rx + rpw; gx += rpw / 3) {
                this.ctx.beginPath(); this.ctx.moveTo(gx, rx); this.ctx.lineTo(gx, ry + rph); this.ctx.stroke();
            }
            for (let gy = ry + rph / 4; gy < ry + rph; gy += rph / 4) {
                this.ctx.beginPath(); this.ctx.moveTo(rx, gy); this.ctx.lineTo(rx + rpw, gy); this.ctx.stroke();
            }

            // Antena principal
            this.ctx.strokeStyle = "#a8afb8";
            this.ctx.lineWidth = 1.8;
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(0, -r * 1.35);
            this.ctx.stroke();
            
            // Plato reflector de la antena con degradado plateado
            const dishGrad = this.ctx.createRadialGradient(0, -r * 1.35, 0, 0, -r * 1.35, r * 0.38);
            dishGrad.addColorStop(0, "#ffffff");
            dishGrad.addColorStop(0.55, "#a8afb8");
            dishGrad.addColorStop(1, "#505860");
            this.ctx.fillStyle = dishGrad;
            this.ctx.beginPath();
            this.ctx.arc(0, -r * 1.35, r * 0.38, Math.PI, 0);
            this.ctx.fill();
            this.ctx.strokeStyle = "#ffffff";
            this.ctx.lineWidth = 0.8;
            this.ctx.stroke();

            // Cuerpo central (Foil dorado octagonal chamfered)
            const goldGrad = this.ctx.createLinearGradient(-r * 0.5, -r * 0.5, r * 0.5, r * 0.5);
            goldGrad.addColorStop(0, "#ffe066");
            goldGrad.addColorStop(0.5, "#cca01e");
            goldGrad.addColorStop(1, "#7f5f00");

            this.ctx.fillStyle = goldGrad;
            this.ctx.strokeStyle = "#ffe066";
            this.ctx.lineWidth = 1.2;
            this.ctx.beginPath();
            const ch = r * 0.15; // chamfer size
            this.ctx.moveTo(-r * 0.5 + ch, -r * 0.5);
            this.ctx.lineTo(r * 0.5 - ch, -r * 0.5);
            this.ctx.lineTo(r * 0.5, -r * 0.5 + ch);
            this.ctx.lineTo(r * 0.5, r * 0.5 - ch);
            this.ctx.lineTo(r * 0.5 - ch, r * 0.5);
            this.ctx.lineTo(-r * 0.5 + ch, r * 0.5);
            this.ctx.lineTo(-r * 0.5, r * 0.5 - ch);
            this.ctx.lineTo(-r * 0.5, -r * 0.5 + ch);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();

            // Remaches dorados
            this.ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
            const remOffset = r * 0.42;
            this.ctx.fillRect(-remOffset, -remOffset, 1.2, 1.2);
            this.ctx.fillRect(remOffset - 1.2, -remOffset, 1.2, 1.2);
            this.ctx.fillRect(-remOffset, remOffset - 1.2, 1.2, 1.2);
            this.ctx.fillRect(remOffset - 1.2, remOffset - 1.2, 1.2, 1.2);

            // LED baliza roja intermitente
            const blink = Math.sin(time * 0.01) > 0;
            const ledColor = blink ? "#ff0055" : "#55001a";
            if (blink) {
                const ledGlow = this.ctx.createRadialGradient(0, 0, r * 0.05, 0, 0, r * 0.35);
                ledGlow.addColorStop(0, "rgba(255, 0, 85, 0.65)");
                ledGlow.addColorStop(1, "rgba(0,0,0,0)");
                this.ctx.fillStyle = ledGlow;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
                this.ctx.fill();
            }
            this.ctx.fillStyle = ledColor;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, r * 0.14, 0, Math.PI * 2);
            this.ctx.fill();

        } else if (val < 0.75) {
            // --- 2. Space Station (modular capsules, truss line, big panels, yellow lights) ---
            // Truss central horizontal
            this.ctx.strokeStyle = "#4f555e";
            this.ctx.lineWidth = 2.5;
            this.ctx.beginPath();
            this.ctx.moveTo(-r * 1.5, 0);
            this.ctx.lineTo(r * 1.5, 0);
            this.ctx.stroke();

            // Estructura de celosía del truss
            this.ctx.strokeStyle = "#7f8c8d";
            this.ctx.lineWidth = 0.8;
            this.ctx.beginPath();
            for (let tx = -r * 1.4; tx <= r * 1.4; tx += r * 0.3) {
                this.ctx.moveTo(tx, -r * 0.12);
                this.ctx.lineTo(tx + r * 0.15, r * 0.12);
                this.ctx.moveTo(tx, r * 0.12);
                this.ctx.lineTo(tx + r * 0.15, -r * 0.12);
            }
            this.ctx.stroke();

            // Paneles solares verticales en los extremos
            const drawStationPanel = (px) => {
                const pw = r * 0.45;
                const ph = r * 2.0;
                const py = -ph / 2;
                
                // Panel base
                const pGrad = this.ctx.createLinearGradient(px, py, px + pw, py);
                pGrad.addColorStop(0, "#09203f");
                pGrad.addColorStop(1, "#134e5e");
                this.ctx.fillStyle = pGrad;
                this.ctx.fillRect(px, py, pw, ph);
                this.ctx.strokeStyle = "#00f2fe";
                this.ctx.lineWidth = 1.2;
                this.ctx.strokeRect(px, py, pw, ph);

                // Rejillas solares
                this.ctx.strokeStyle = "rgba(0, 242, 254, 0.35)";
                this.ctx.lineWidth = 0.6;
                // Línea media vertical
                this.ctx.beginPath();
                this.ctx.moveTo(px + pw / 2, py);
                this.ctx.lineTo(px + pw / 2, py + ph);
                this.ctx.stroke();
                // Horizontales
                for (let gy = py + ph / 8; gy < py + ph; gy += ph / 8) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(px, gy);
                    this.ctx.lineTo(px + pw, gy);
                    this.ctx.stroke();
                }
            };
            drawStationPanel(-r * 1.75);
            drawStationPanel(r * 1.3);

            // Módulo central presurizado (Cilindro con extremos redondeados) (dynamic light silver)
            const bodyGrad = this.ctx.createLinearGradient(-r * 0.6, -r * 0.4, r * 0.6, r * 0.4);
            bodyGrad.addColorStop(0, "#ffffff");
            bodyGrad.addColorStop(0.3, `rgb(${Math.floor(rgb.r * 0.3 + 120 * 0.7)}, ${Math.floor(rgb.g * 0.3 + 130 * 0.7)}, ${Math.floor(rgb.b * 0.3 + 140 * 0.7)})`);
            bodyGrad.addColorStop(1, `rgb(${Math.floor(rgb.r * 0.3 + 150 * 0.7)}, ${Math.floor(rgb.g * 0.3 + 160 * 0.7)}, ${Math.floor(rgb.b * 0.3 + 170 * 0.7)})`);
            
            this.ctx.fillStyle = bodyGrad;
            this.ctx.strokeStyle = "#ffffff";
            this.ctx.lineWidth = 1.5;
            
            // Dibujar cápsula con esquinas redondeadas
            const cx = -r * 0.6, cy = -r * 0.45, cw = r * 1.2, ch = r * 0.9;
            const radius = r * 0.2;
            this.ctx.beginPath();
            this.ctx.moveTo(cx + radius, cy);
            this.ctx.lineTo(cx + cw - radius, cy);
            this.ctx.quadraticCurveTo(cx + cw, cy, cx + cw, cy + radius);
            this.ctx.lineTo(cx + cw, cy + ch - radius);
            this.ctx.quadraticCurveTo(cx + cw, cy + ch, cx + cw - radius, cy + ch);
            this.ctx.lineTo(cx + radius, cy + ch);
            this.ctx.quadraticCurveTo(cx, cy + ch, cx, cy + ch - radius);
            this.ctx.lineTo(cx, cy + radius);
            this.ctx.quadraticCurveTo(cx, cy, cx + radius, cy);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();

            // Módulos acoplados secundarios (transversales)
            this.ctx.fillStyle = "#95a5a6";
            this.ctx.fillRect(-r * 0.2, -r * 0.7, r * 0.4, r * 0.25);
            this.ctx.strokeRect(-r * 0.2, -r * 0.7, r * 0.4, r * 0.25);
            this.ctx.fillRect(-r * 0.2, r * 0.45, r * 0.4, r * 0.25);
            this.ctx.strokeRect(-r * 0.2, r * 0.45, r * 0.4, r * 0.25);

            // Panelados de blindaje en el módulo central
            this.ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
            this.ctx.lineWidth = 0.8;
            this.ctx.beginPath();
            this.ctx.moveTo(-r * 0.2, cy);
            this.ctx.lineTo(-r * 0.2, cy + ch);
            this.ctx.moveTo(r * 0.2, cy);
            this.ctx.lineTo(r * 0.2, cy + ch);
            this.ctx.moveTo(cx, 0);
            this.ctx.lineTo(cx + cw, 0);
            this.ctx.stroke();

            // Ventanas de cabina iluminadas en verde/amarillo neón
            this.ctx.fillStyle = "#00ff87";
            this.ctx.fillRect(-r * 0.45, -r * 0.22, r * 0.15, r * 0.12);
            this.ctx.fillRect(-r * 0.2, -r * 0.22, r * 0.15, r * 0.12);
            this.ctx.fillRect(r * 0.05, -r * 0.22, r * 0.15, r * 0.12);
            this.ctx.fillRect(r * 0.3, -r * 0.22, r * 0.15, r * 0.12);
            
            this.ctx.fillStyle = "#ffeb3b";
            this.ctx.fillRect(-r * 0.45, r * 0.1, r * 0.15, r * 0.12);
            this.ctx.fillRect(-r * 0.2, r * 0.1, r * 0.15, r * 0.12);
            this.ctx.fillRect(r * 0.05, r * 0.1, r * 0.15, r * 0.12);
            this.ctx.fillRect(r * 0.3, r * 0.1, r * 0.15, r * 0.12);

            // Balizas amarillas intermitentes en extremos (frecuencia rápida)
            const blinkFast = Math.sin(time * 0.02) > 0;
            if (blinkFast) {
                this.ctx.fillStyle = "#ffeb3b";
                const spots = [
                    {x: -r * 1.5, y: -r * 1.0},
                    {x: -r * 1.5, y: r * 1.0},
                    {x: r * 1.5, y: -r * 1.0},
                    {x: r * 1.5, y: r * 1.0},
                    {x: 0, y: -r * 0.7},
                    {x: 0, y: r * 0.7}
                ];
                for (let spot of spots) {
                    this.ctx.beginPath();
                    this.ctx.arc(spot.x, spot.y, r * 0.08, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // Pequeño resplandor
                    const glow = this.ctx.createRadialGradient(spot.x, spot.y, 0, spot.x, spot.y, r * 0.22);
                    glow.addColorStop(0, "rgba(255, 235, 59, 0.45)");
                    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
                    this.ctx.fillStyle = glow;
                    this.ctx.beginPath();
                    this.ctx.arc(spot.x, spot.y, r * 0.22, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }

        } else {
            // --- 3. Scientific Probe (carbon core, copper circuit lines, camera lens) ---
            // Brazos / mástiles de instrumental científico
            this.ctx.strokeStyle = "#7f8c8d";
            this.ctx.lineWidth = 1.5;
            
            // Brazo 1: Magnetómetro (superior izquierda, 135 deg aprox)
            const ang1 = Math.PI * 0.75;
            const bx1 = Math.cos(ang1) * r * 1.5;
            const by1 = Math.sin(ang1) * r * 1.5;
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(bx1, by1);
            this.ctx.stroke();
            // Sensor del magnetómetro (caja plateada)
            this.ctx.fillStyle = "#bdc3c7";
            this.ctx.strokeStyle = "#ffffff";
            this.ctx.lineWidth = 1.0;
            this.ctx.fillRect(bx1 - r * 0.15, by1 - r * 0.15, r * 0.3, r * 0.3);
            this.ctx.strokeRect(bx1 - r * 0.15, by1 - r * 0.15, r * 0.3, r * 0.3);

            // Brazo 2: Antena dipolo (inferior izquierda, 225 deg aprox)
            const ang2 = Math.PI * 1.25;
            const bx2 = Math.cos(ang2) * r * 1.4;
            const by2 = Math.sin(ang2) * r * 1.4;
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(bx2, by2);
            this.ctx.stroke();
            // Puntas de antena en T
            this.ctx.beginPath();
            this.ctx.moveTo(bx2 - r * 0.15, by2 - r * 0.15);
            this.ctx.lineTo(bx2 + r * 0.15, by2 + r * 0.15);
            this.ctx.stroke();

            // Brazo 3: Sensor de plasma (derecha superior, 45 deg aprox)
            const ang3 = Math.PI * 0.25;
            const bx3 = Math.cos(ang3) * r * 1.35;
            const by3 = Math.sin(ang3) * r * 1.35;
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(bx3, by3);
            this.ctx.stroke();
            // Bulbo del sensor azul neón parpadeante
            const pBlink = Math.sin(time * 0.012) > 0;
            this.ctx.fillStyle = pBlink ? "#00f2fe" : "#005a60";
            this.ctx.beginPath();
            this.ctx.arc(bx3, by3, r * 0.12, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = "#ffffff";
            this.ctx.stroke();

            // Cuerpo central hexagonal (metalizado claro con matiz de color base)
            const hexGrad = this.ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.65);
            hexGrad.addColorStop(0, `rgb(${Math.floor(rgb.r * 0.25 + 215 * 0.75)}, ${Math.floor(rgb.g * 0.25 + 218 * 0.75)}, ${Math.floor(rgb.b * 0.25 + 222 * 0.75)})`);
            hexGrad.addColorStop(0.7, `rgb(${Math.floor(rgb.r * 0.25 + 170 * 0.75)}, ${Math.floor(rgb.g * 0.25 + 175 * 0.75)}, ${Math.floor(rgb.b * 0.25 + 180 * 0.75)})`);
            hexGrad.addColorStop(1, `rgb(${Math.floor(rgb.r * 0.25 + 130 * 0.75)}, ${Math.floor(rgb.g * 0.25 + 135 * 0.75)}, ${Math.floor(rgb.b * 0.25 + 145 * 0.75)})`);
            
            this.ctx.fillStyle = hexGrad;
            this.ctx.strokeStyle = "#7f8c8d";
            this.ctx.lineWidth = 1.8;
            this.ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI) / 3;
                const hx = Math.cos(angle) * r * 0.65;
                const hy = Math.sin(angle) * r * 0.65;
                if (i === 0) this.ctx.moveTo(hx, hy);
                else this.ctx.lineTo(hx, hy);
            }
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();

            // Trazado de circuitos impresos cobre/oro en el fuselaje
            this.ctx.strokeStyle = "#e67e22"; // Cobre
            this.ctx.lineWidth = 1.0;
            this.ctx.beginPath();
            
            // Camino de circuito 1
            this.ctx.moveTo(-r * 0.4, -r * 0.25);
            this.ctx.lineTo(-r * 0.2, -r * 0.25);
            this.ctx.lineTo(-r * 0.2, -r * 0.45);
            
            // Camino de circuito 2
            this.ctx.moveTo(-r * 0.4, r * 0.25);
            this.ctx.lineTo(-r * 0.2, r * 0.25);
            this.ctx.lineTo(-r * 0.2, r * 0.45);

            // Camino de circuito 3
            this.ctx.moveTo(r * 0.4, -r * 0.25);
            this.ctx.lineTo(r * 0.2, -r * 0.25);
            this.ctx.lineTo(r * 0.2, -r * 0.45);

            this.ctx.stroke();

            // Soldaduras doradas (puntos de circuito)
            this.ctx.fillStyle = "#f1c40f"; // Oro
            const points = [
                {x: -r * 0.2, y: -r * 0.45},
                {x: -r * 0.2, y: r * 0.45},
                {x: r * 0.2, y: -r * 0.45},
                {x: -r * 0.4, y: -r * 0.25},
                {x: -r * 0.4, y: r * 0.25},
                {x: r * 0.4, y: -r * 0.25}
            ];
            for (let pt of points) {
                this.ctx.beginPath();
                this.ctx.arc(pt.x, pt.y, 1.5, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // Lente científica central (con resplandor concéntrico)
            const lensR = r * 0.32;
            const lensGrad = this.ctx.createRadialGradient(0, 0, 0, 0, 0, lensR);
            lensGrad.addColorStop(0, "#00f2fe"); // Núcleo cian resplandeciente
            lensGrad.addColorStop(0.45, "#092540"); // Vidrio azul profundo
            lensGrad.addColorStop(0.85, "#1b1d20"); // Borde del lente
            lensGrad.addColorStop(1, "#ffffff"); // Anillo exterior metálico cromado
            
            this.ctx.fillStyle = lensGrad;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, lensR, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = "#ffffff";
            this.ctx.lineWidth = 1.5;
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    drawTargetReticle(x, y, r, time, isSelected) {
        this.ctx.save();
        this.ctx.strokeStyle = isSelected ? "#00f2fe" : "rgba(0, 242, 254, 0.4)";
        this.ctx.lineWidth = isSelected ? 1.5 : 1.0;
        
        // Rotating outer circle
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(time * 0.0005);
        this.ctx.setLineDash([4, 8]);
        this.ctx.beginPath();
        const reticleRadius = r + 8;
        this.ctx.arc(0, 0, reticleRadius, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.restore();

        // Four L-shaped brackets
        const bracketSize = Math.max(5, r * 0.25);
        const d = r + 4;
        
        this.ctx.beginPath();
        // Top-Left
        this.ctx.moveTo(x - d, y - d + bracketSize);
        this.ctx.lineTo(x - d, y - d);
        this.ctx.lineTo(x - d + bracketSize, y - d);
        
        // Top-Right
        this.ctx.moveTo(x + d - bracketSize, y - d);
        this.ctx.lineTo(x + d, y - d);
        this.ctx.lineTo(x + d, y - d + bracketSize);
        
        // Bottom-Right
        this.ctx.moveTo(x + d, y + d - bracketSize);
        this.ctx.lineTo(x + d, y + d);
        this.ctx.lineTo(x + d - bracketSize, y + d);
        
        // Bottom-Left
        this.ctx.moveTo(x - d + bracketSize, y + d);
        this.ctx.lineTo(x - d, y + d);
        this.ctx.lineTo(x - d, y + d - bracketSize);
        
        this.ctx.stroke();
        this.ctx.restore();
    }

    getNodeColor(node) {
        return getNodeColor(node);
    }

    hexToRgb(hex) {
        return hexToRgb(hex);
    }

    hexToRgbA(hex, alpha) {
        return hexToRgbA(hex, alpha);
    }

    getNodeGlowColor(node) {
        const color = this.getNodeColor(node);
        return this.hexToRgbA(color, 0.12);
    }

    drawSearchMatchReticle(x, y, r, time) {
        this.ctx.save();
        const pulse = 1.0 + Math.sin(time * 0.008) * 0.08;
        const adjustedRadius = (r + 10) * pulse;
        
        this.ctx.strokeStyle = "#00ff87"; // Verde neón
        this.ctx.lineWidth = 2.0;
        
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = "#00ff87";

        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(-time * 0.0003);
        this.ctx.setLineDash([6, 12]);
        this.ctx.beginPath();
        this.ctx.arc(0, 0, adjustedRadius, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.restore();

        const d = adjustedRadius;
        const size = 6;
        this.ctx.beginPath();
        // Top-Left
        this.ctx.moveTo(x - d, y - d + size);
        this.ctx.lineTo(x - d, y - d);
        this.ctx.lineTo(x - d + size, y - d);
        
        // Top-Right
        this.ctx.moveTo(x + d - size, y - d);
        this.ctx.lineTo(x + d, y - d);
        this.ctx.lineTo(x + d, y - d + size);
        
        // Bottom-Right
        this.ctx.moveTo(x + d, y + d - size);
        this.ctx.lineTo(x + d, y + d);
        this.ctx.lineTo(x + d - size, y + d);
        
        // Bottom-Left
        this.ctx.moveTo(x - d + size, y + d);
        this.ctx.lineTo(x - d, y + d);
        this.ctx.lineTo(x - d, y + d - size);
        this.ctx.stroke();

        this.ctx.restore();
    }

    startAlienScanAnimation(nodesToVisit, duration = 1800) {
        this.alienScanActive = true;
        this.alienScanNodes = nodesToVisit;
        this.alienScanTimer = 0;
        this.alienScanDuration = duration;

        // La posición inicial es el centro del sistema con offset de hover
        const centerNode = this.nodes.find(n => n.id === this.currentParentId);
        const centerPos = centerNode ? this.getNodeAbsolutePosition(centerNode) : { x: 0, y: 0 };
        
        const hoverOffset = -55;
        this.alienScanStartPos = { x: centerPos.x, y: centerPos.y + hoverOffset };
        this.alienScanUfoPos = { ...this.alienScanStartPos };

        this.followedNode = null; // Quitar seguimiento para que la cámara siga al OVNI
        this.activeScanPlanetPos = null;
        this.activeScanPlanetRadius = 0;
        this.activeScanProgress = 0;
    }

    drawAlienUFO(ctx, x, y, time) {
        ctx.save();
        ctx.translate(x, y);
        
        ctx.scale(0.85, 0.85);

        // Dibujar el haz de luz verde si se está escaneando
        if (this.drawUfoBeam) {
            const beamPulse = 1.0 + Math.sin(time * 0.025) * 0.12;
            ctx.save();
            const grad = ctx.createLinearGradient(0, 0, 0, 75);
            grad.addColorStop(0, "rgba(0, 255, 135, 0.55)");
            grad.addColorStop(0.5, "rgba(0, 255, 135, 0.25)");
            grad.addColorStop(1, "rgba(0, 255, 135, 0.0)");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-20 * beamPulse, 75);
            ctx.lineTo(20 * beamPulse, 75);
            ctx.closePath();
            ctx.fill();
            
            // Anillo de escaneo en la base del haz sobre el planeta (a y = 65 en escala local del ovni)
            const ringPulse = 1.0 + Math.sin(time * 0.03) * 0.15;
            ctx.strokeStyle = "rgba(0, 255, 135, 0.85)";
            ctx.lineWidth = 2.0;
            ctx.shadowBlur = 10;
            ctx.shadowColor = "#00ff87";
            ctx.beginPath();
            ctx.ellipse(0, 65, 18 * ringPulse, 6 * ringPulse, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Efecto flotante bobbing
        const bob = Math.sin(time * 0.005) * 4;
        ctx.translate(0, bob);

        // Domo del platillo
        const domeGrad = ctx.createRadialGradient(0, -8, 0, 0, -8, 16);
        domeGrad.addColorStop(0, "rgba(0, 242, 254, 0.75)");
        domeGrad.addColorStop(1, "rgba(0, 242, 254, 0.2)");
        ctx.fillStyle = domeGrad;
        ctx.strokeStyle = "rgba(0, 242, 254, 0.5)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, -4, 15, Math.PI, 0);
        ctx.fill();
        ctx.stroke();

        // Alien dentro
        ctx.font = "13px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("👽", 0, -8);

        // Casco metálico
        const hullGrad = ctx.createLinearGradient(-26, 4, 26, 4);
        hullGrad.addColorStop(0, "#7f8c8d");
        hullGrad.addColorStop(0.5, "#bdc3c7");
        hullGrad.addColorStop(1, "#34495e");
        ctx.fillStyle = hullGrad;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.ellipse(0, 4, 25, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Luces parpadeantes
        const lightTime = Math.floor(time / 180);
        const colors = ["#00ff87", "#00f2fe", "#ff3366", "#ffd600"];
        for (let i = 0; i < 4; i++) {
            const angle = (i / 3) * Math.PI - Math.PI;
            const lx = 18 * Math.cos(angle + 0.5);
            const ly = 4 + 3 * Math.sin(angle + 0.5);
            ctx.fillStyle = colors[(lightTime + i) % colors.length];
            ctx.beginPath();
            ctx.arc(lx, ly, 1.8, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}
