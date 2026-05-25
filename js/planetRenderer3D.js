// Three.js 3D low-poly planet renderer for OrbiMind
import { hexToRgb } from './utils.js';

export class PlanetRenderer3D {
    constructor() {
        this.canvasSize = 256; // Renderizamos en 256x256 para alta resolución y excelente rendimiento
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = this.canvasSize;
        this.offscreenCanvas.height = this.canvasSize;

        // Inicializar renderer WebGL de Three.js en el canvas oculto con alpha transparente
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.offscreenCanvas,
            alpha: true,
            antialias: true,
            preserveDrawingBuffer: true
        });
        this.renderer.setSize(this.canvasSize, this.canvasSize);
        this.renderer.setPixelRatio(1);

        // Escena 3D
        this.scene = new THREE.Scene();

        // Cámara de perspectiva
        this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        this.camera.position.z = 4.8;

        // Iluminación
        // Luz ambiental para no dejar los lados en sombra total (detalles visibles)
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
        this.scene.add(this.ambientLight);

        // Luz direccional principal que emula al Sol
        this.sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
        this.sunLight.position.set(5, 3, 5);
        this.scene.add(this.sunLight);

        // Material estándar realista con soporte para flatShading (caras planas facetadas)
        this.sphereMaterial = new THREE.MeshStandardMaterial({
            roughness: 0.6,
            metalness: 0.1,
            flatShading: true
        });

        // Crear las mallas low-poly para los distintos tipos de cuerpos celestes
        this.planetMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6, 1), this.sphereMaterial);
        this.planetoidMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6, 0), this.sphereMaterial);
        // Luna en 3D con forma de Asteroide/Roca Irregular (Low-Poly Cratered Moon)
        this.moonMesh = new THREE.Group();
        const moonGeo = new THREE.DodecahedronGeometry(1.4, 0);
        const posAttr = moonGeo.getAttribute('position');
        if (posAttr) {
            for (let i = 0; i < posAttr.count; i++) {
                const vx = posAttr.getX(i);
                const vy = posAttr.getY(i);
                const vz = posAttr.getZ(i);
                // Deformar los vértices de manera determinista usando funciones trigonométricas
                const noise = 0.85 + Math.sin(vx * 4.5) * Math.cos(vy * 4.5) * 0.18;
                posAttr.setXYZ(i, vx * noise, vy * noise, vz * noise);
            }
            posAttr.needsUpdate = true;
            moonGeo.computeVertexNormals();
        }
        const moonBody = new THREE.Mesh(moonGeo, this.sphereMaterial);
        this.moonMesh.add(moonBody);
        
        // Satélite artificial detallado low-poly (unificado en un THREE.Group)
        this.satelliteMesh = new THREE.Group();
        
        // Cuerpo principal (caja central)
        const satBody = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), this.sphereMaterial);
        this.satelliteMesh.add(satBody);
        
        // Brazos / paneles solares
        const satArmGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.2, 5);
        satArmGeo.rotateZ(Math.PI / 2); // Orientación horizontal en X
        const satArm = new THREE.Mesh(satArmGeo, this.sphereMaterial);
        this.satelliteMesh.add(satArm);
        
        // Panel izquierdo
        const satPanelLeft = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.05), this.sphereMaterial);
        satPanelLeft.position.set(-1.25, 0, 0);
        this.satelliteMesh.add(satPanelLeft);
        
        // Panel derecho
        const satPanelRight = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.05), this.sphereMaterial);
        satPanelRight.position.set(1.25, 0, 0);
        this.satelliteMesh.add(satPanelRight);
        
        // Antena parabólica (poste y plato/cono)
        const satAntPoleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.45, 4);
        satAntPoleGeo.rotateX(Math.PI / 2); // Apunta en Z
        const satAntPole = new THREE.Mesh(satAntPoleGeo, this.sphereMaterial);
        satAntPole.position.set(0, 0, 0.6);
        this.satelliteMesh.add(satAntPole);
        
        const satDishGeo = new THREE.ConeGeometry(0.35, 0.25, 5);
        satDishGeo.rotateX(Math.PI / 2); // Apunta en Z
        const satDish = new THREE.Mesh(satDishGeo, this.sphereMaterial);
        satDish.position.set(0, 0, 0.8);
        this.satelliteMesh.add(satDish);

        // --- LUCES Y AURA DE LUZ ARTIFICIAL EN 3D ---
        // Halo de luz artificial cian translúcido
        this.satHaloMaterial = new THREE.MeshBasicMaterial({
            color: 0x00f2fe,
            transparent: true,
            opacity: 0.12,
            side: THREE.DoubleSide
        });
        const haloGeo = new THREE.SphereGeometry(1.6, 8, 8);
        this.satHalo = new THREE.Mesh(haloGeo, this.satHaloMaterial);
        this.satelliteMesh.add(this.satHalo);

        // Balizas LED parpadeantes (una central y dos en los paneles solares)
        this.satBeaconMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff87, // Verde neón por defecto
            transparent: true,
            opacity: 1.0
        });
        const beaconGeo = new THREE.SphereGeometry(0.1, 4, 4);
        
        this.satBeaconCenter = new THREE.Mesh(beaconGeo, this.satBeaconMaterial);
        this.satBeaconCenter.position.set(0, 0.45, 0);
        this.satelliteMesh.add(this.satBeaconCenter);

        this.satBeaconLeft = new THREE.Mesh(beaconGeo, this.satBeaconMaterial);
        this.satBeaconLeft.position.set(-1.6, 0.25, 0);
        this.satelliteMesh.add(this.satBeaconLeft);

        this.satBeaconRight = new THREE.Mesh(beaconGeo, this.satBeaconMaterial);
        this.satBeaconRight.position.set(1.6, 0.25, 0);
        this.satelliteMesh.add(this.satBeaconRight);

        this.crystalMesh = new THREE.Mesh(new THREE.OctahedronGeometry(1.6, 0), this.sphereMaterial);
        
        // Crear el grupo del Sol con una esfera low-poly limpia al estilo del diseño estético
        this.sunGroup = new THREE.Group();
        const sunSphere = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6, 1), this.sphereMaterial);
        this.sunGroup.add(sunSphere);
        
        // Añadir todas las mallas al grupo principal de la escena
        this.scene.add(this.planetMesh);
        this.scene.add(this.planetoidMesh);
        this.scene.add(this.moonMesh);
        this.scene.add(this.satelliteMesh);
        this.scene.add(this.crystalMesh);
        this.scene.add(this.sunGroup);

        // Ocultar todas por defecto
        this.planetMesh.visible = false;
        this.planetoidMesh.visible = false;
        this.moonMesh.visible = false;
        this.satelliteMesh.visible = false;
        this.crystalMesh.visible = false;
        this.sunGroup.visible = false;

        // Anillos para planetas que los posean (anillo decagonal low-poly o curvo suave)
        this.ringGeometryLowPoly = new THREE.RingGeometry(1.85, 2.8, 12);
        this.ringGeometrySmooth = new THREE.RingGeometry(1.85, 2.8, 64);
        this.ringMaterial = new THREE.MeshStandardMaterial({
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.75,
            roughness: 0.7,
            metalness: 0.1,
            flatShading: true
        });
        this.ringMesh = new THREE.Mesh(this.ringGeometrySmooth, this.ringMaterial);
        this.ringMesh.rotation.x = Math.PI * 0.4;
        this.ringMesh.rotation.y = Math.PI * 0.08;
        this.scene.add(this.ringMesh);
        this.ringMesh.visible = false;

        // Almacenamiento de texturas procedimentales en caché
        this.textureCache = {};
    }

    // Generador determinista de pseudo-aleatorios con semilla
    seededRand(seed, subSeed) {
        const key = seed + "-" + subSeed;
        let hash = 0;
        for (let i = 0; i < key.length; i++) {
            hash = key.charCodeAt(i) + ((hash << 5) - hash);
        }
        const x = Math.sin(hash) * 43758.5453123;
        return x - Math.floor(x);
    }

    // Generar texturas procedimentales
    generateProceduralTexture(colorHex, seed, type) {
        const cacheKey = `${colorHex}-${seed}-${type}`;
        if (this.textureCache[cacheKey]) {
            return this.textureCache[cacheKey];
        }

        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Color base del cuerpo celeste
        ctx.fillStyle = colorHex;
        ctx.fillRect(0, 0, size, size);

        const rgb = hexToRgb(colorHex);

        if (type === "sun") {
            // Textura ardiente de plasma solar con múltiples llamaradas y turbulencias
            const numCells = 35;
            for (let i = 0; i < numCells; i++) {
                const cx = this.getNodeSeed(seed, i * 4) * size;
                const cy = this.getNodeSeed(seed, i * 9) * size;
                const r = (0.06 + this.getNodeSeed(seed, i * 13) * 0.18) * size;
                const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
                grad.addColorStop(0, "rgba(255, 255, 230, 0.95)");
                grad.addColorStop(0.2, "rgba(255, 205, 10, 0.8)");
                grad.addColorStop(0.55, "rgba(240, 95, 0, 0.55)");
                grad.addColorStop(1, "rgba(255, 0, 0, 0)");
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.fill();
            }
            // Bucles magnéticos calientes (llamaradas en filamentos)
            ctx.strokeStyle = "rgba(255, 235, 150, 0.25)";
            ctx.lineWidth = 3.5;
            for (let i = 0; i < 6; i++) {
                const sx = this.getNodeSeed(seed, i * 15) * size;
                const sy = this.getNodeSeed(seed, i * 22) * size;
                const r = (0.04 + this.getNodeSeed(seed, i * 8) * 0.08) * size;
                ctx.beginPath();
                ctx.arc(sx, sy, r, 0, Math.PI);
                ctx.stroke();
            }
        } else if (type === "planet") {
            const val = this.getNodeSeed(seed, 100);
            if (val < 0.35) {
                // 1. Gaseous Giant (Jovian style)
                const numBands = 12 + Math.floor(this.getNodeSeed(seed, 14) * 8);
                for (let i = 0; i < numBands; i++) {
                    const y = (i / numBands) * size;
                    const h = (size / numBands);
                    const opacity = 0.25 + this.getNodeSeed(seed, i * 3) * 0.45;
                    const isBright = this.getNodeSeed(seed, i * 19) > 0.45;
                    
                    const bandColor = isBright 
                        ? `rgba(${Math.min(255, Math.floor(rgb.r * 1.15))}, ${Math.min(255, Math.floor(rgb.g * 1.15))}, ${Math.min(255, Math.floor(rgb.b * 1.15))}, ${opacity})`
                        : `rgba(${Math.floor(rgb.r * 0.55)}, ${Math.floor(rgb.g * 0.55)}, ${Math.floor(rgb.b * 0.55)}, ${opacity})`;
                    
                    ctx.fillStyle = bandColor;
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    for (let x = 0; x <= size; x += 16) {
                        const wave = Math.sin(x * 0.035 + i * 2.3) * (h * 0.45);
                        ctx.lineTo(x, y + wave);
                    }
                    ctx.lineTo(size, y + h);
                    for (let x = size; x >= 0; x -= 16) {
                        const wave = Math.sin(x * 0.035 + (i + 1) * 2.3) * (h * 0.45);
                        ctx.lineTo(x, y + h + wave);
                    }
                    ctx.closePath();
                    ctx.fill();

                    // Giant oval storms (Great Red Spot)
                    if (this.getNodeSeed(seed, i * 23) > 0.7) {
                        const spotX = this.getNodeSeed(seed, i * 7) * size;
                        const spotY = y + h / 2;
                        const spotRadius = (0.035 + this.getNodeSeed(seed, i * 5) * 0.055) * size;
                        const spotGrad = ctx.createRadialGradient(spotX, spotY, 0, spotX, spotY, spotRadius);
                        spotGrad.addColorStop(0, `rgba(${Math.min(255, rgb.r + 130)}, ${Math.floor(rgb.g * 0.15)}, ${Math.floor(rgb.b * 0.15)}, 0.95)`);
                        spotGrad.addColorStop(0.5, `rgba(${Math.floor(rgb.r * 0.85)}, ${Math.floor(rgb.g * 0.1)}, ${Math.floor(rgb.b * 0.1)}, 0.5)`);
                        spotGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
                        ctx.fillStyle = spotGrad;
                        ctx.beginPath();
                        ctx.ellipse(spotX, spotY, spotRadius * 1.6, spotRadius, 0, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            } else if (val < 0.55) {
                // 2. Ice Giant (Neptunian/Uranian)
                // Smooth bands, subtle pastel shading, slight polar haze
                ctx.fillStyle = colorHex;
                ctx.fillRect(0, 0, size, size);
                const numBands = 8;
                for (let i = 0; i < numBands; i++) {
                    const y = (i / numBands) * size;
                    const h = (size / numBands);
                    const opacity = 0.15;
                    ctx.fillStyle = `rgba(${Math.min(255, Math.floor(rgb.r * 1.15))}, ${Math.min(255, Math.floor(rgb.g * 1.15))}, ${Math.min(255, Math.floor(rgb.b * 1.15))}, ${opacity})`;
                    ctx.beginPath();
                    ctx.rect(0, y, size, h);
                    ctx.fill();
                }
                // Add soft hazy atmosphere poles
                const polarHaze = ctx.createLinearGradient(0, 0, 0, size);
                polarHaze.addColorStop(0, `rgba(${Math.min(255, Math.floor(rgb.r * 1.1))}, ${Math.min(255, Math.floor(rgb.g * 1.1))}, ${Math.min(255, Math.floor(rgb.b * 1.1))}, 0.15)`);
                polarHaze.addColorStop(0.2, "rgba(0, 0, 0, 0)");
                polarHaze.addColorStop(0.8, "rgba(0, 0, 0, 0)");
                polarHaze.addColorStop(1, `rgba(${Math.min(255, Math.floor(rgb.r * 1.1))}, ${Math.min(255, Math.floor(rgb.g * 1.1))}, ${Math.min(255, Math.floor(rgb.b * 1.1))}, 0.15)`);
                ctx.fillStyle = polarHaze;
                ctx.fillRect(0, 0, size, size);
            } else if (val < 0.75) {
                // 3. Terrestrial Earth-like (continents, blue oceans, green land, clouds)
                // Base is ocean (darker shade of the base color)
                ctx.fillStyle = `rgb(${Math.floor(rgb.r * 0.55)}, ${Math.floor(rgb.g * 0.55)}, ${Math.floor(rgb.b * 0.55)})`;
                ctx.fillRect(0, 0, size, size);

                const numContinents = 7 + Math.floor(this.getNodeSeed(seed, 18) * 6);
                for (let i = 0; i < numContinents; i++) {
                    const cx = this.getNodeSeed(seed, i * 4) * size;
                    const cy = this.getNodeSeed(seed, i * 8) * size;
                    const rx = (0.15 + this.getNodeSeed(seed, i * 12) * 0.25) * size;
                    const ry = (0.1 + this.getNodeSeed(seed, i * 16) * 0.18) * size;
                    const rot = this.getNodeSeed(seed, i * 22) * Math.PI;

                    ctx.save();
                    ctx.translate(cx, cy);
                    ctx.rotate(rot);
                    
                    // Earth-like vegetation is base-color
                    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.95)`;
                    
                    ctx.beginPath();
                    for (let a = 0; a < Math.PI * 2; a += 0.25) {
                        const noise = 1 + (this.getNodeSeed(seed, i * 3 + a) - 0.5) * 0.32;
                        const x = Math.cos(a) * rx * noise;
                        const y = Math.sin(a) * ry * noise;
                        if (a === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.closePath();
                    ctx.fill();

                    // Coastline shine
                    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                    ctx.restore();
                }

                // Ice Caps (shrunk to 0.04)
                const capHeight = size * 0.04;
                const capGrad = ctx.createLinearGradient(0, 0, 0, capHeight);
                capGrad.addColorStop(0, "rgba(255, 255, 255, 0.98)");
                capGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
                ctx.fillStyle = capGrad;
                ctx.fillRect(0, 0, size, capHeight);

                const capGradS = ctx.createLinearGradient(0, size, 0, size - capHeight);
                capGradS.addColorStop(0, "rgba(255, 255, 255, 0.98)");
                capGradS.addColorStop(1, "rgba(255, 255, 255, 0)");
                ctx.fillStyle = capGradS;
                ctx.fillRect(0, size - capHeight, size, capHeight);

                // Cloud cover (limited to 3 layers with max 0.25 opacity)
                const numClouds = 3;
                for (let i = 0; i < numClouds; i++) {
                    const cy = this.getNodeSeed(seed, i * 3) * size;
                    const h = (0.05 + this.getNodeSeed(seed, i * 7) * 0.05) * size;
                    const cloudGrad = ctx.createLinearGradient(0, cy - h/2, 0, cy + h/2);
                    cloudGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
                    cloudGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.25)");
                    cloudGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
                    ctx.fillStyle = cloudGrad;
                    ctx.beginPath();
                    ctx.moveTo(0, cy);
                    for (let x = 0; x <= size; x += 32) {
                        const wave = Math.sin(x * 0.02 + i * 4.1) * (h * 0.7);
                        ctx.lineTo(x, cy + wave);
                    }
                    ctx.lineTo(size, cy + h);
                    ctx.lineTo(0, cy + h);
                    ctx.closePath();
                    ctx.fill();
                }
            } else {
                // 4. Terrestrial Volcanic/Lava (light crust, glowing red rivers, ash clouds) (dynamic pastel color)
                const baseR = Math.floor(rgb.r * 0.65);
                const baseG = Math.floor(rgb.g * 0.65);
                const baseB = Math.floor(rgb.b * 0.65);
                ctx.fillStyle = `rgb(${baseR}, ${baseG}, ${baseB})`;
                ctx.fillRect(0, 0, size, size);

                // Glowing lava oceans / fractures
                ctx.strokeStyle = "rgba(255, 60, 0, 0.85)";
                ctx.shadowColor = "rgba(255, 60, 0, 0.85)";
                ctx.shadowBlur = 4;
                ctx.lineWidth = 4;
                for (let i = 0; i < 8; i++) {
                    let lx = this.getNodeSeed(seed, i * 15) * size;
                    let ly = this.getNodeSeed(seed, i * 22) * size;
                    ctx.beginPath();
                    ctx.moveTo(lx, ly);
                    for (let j = 0; j < 6; j++) {
                        lx += (this.getNodeSeed(seed, i * 3 + j * 5) - 0.5) * 80;
                        ly += (this.getNodeSeed(seed, i * 7 + j * 9) - 0.5) * 80;
                        ctx.lineTo(lx, ly);
                    }
                    ctx.stroke();
                }
                ctx.shadowBlur = 0; // Reset shadow

                // Lava hot spots / craters
                for (let i = 0; i < 5; i++) {
                    const cx = this.getNodeSeed(seed, i * 12) * size;
                    const cy = this.getNodeSeed(seed, i * 19) * size;
                    const r = (0.04 + this.getNodeSeed(seed, i * 13) * 0.08) * size;
                    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
                    grad.addColorStop(0, "rgba(255, 140, 0, 0.95)");
                    grad.addColorStop(0.4, "rgba(255, 30, 0, 0.7)");
                    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(cx, cy, r, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Light ash clouds
                const numClouds = 5;
                for (let i = 0; i < numClouds; i++) {
                    const cy = this.getNodeSeed(seed, i * 9) * size;
                    const h = (0.06 + this.getNodeSeed(seed, i * 14) * 0.08) * size;
                    ctx.fillStyle = `rgba(${Math.floor(rgb.r * 0.85)}, ${Math.floor(rgb.g * 0.85)}, ${Math.floor(rgb.b * 0.85)}, ${0.25 + this.getNodeSeed(seed, i * 3) * 0.25})`;
                    ctx.beginPath();
                    ctx.moveTo(0, cy);
                    for (let x = 0; x <= size; x += 32) {
                        const wave = Math.sin(x * 0.015 + i * 2.1) * (h * 0.5);
                        ctx.lineTo(x, cy + wave);
                    }
                    ctx.lineTo(size, cy + h);
                    ctx.lineTo(0, cy + h);
                    ctx.closePath();
                    ctx.fill();
                }
            }
        } else if (type === "planetoid") {
            const val = this.getNodeSeed(seed, 100);
            if (val < 0.45) {
                // 1. Rocky Asteroid (C/S-type) (dynamic light stone color)
                const baseR = Math.floor(rgb.r * 0.85);
                const baseG = Math.floor(rgb.g * 0.85);
                const baseB = Math.floor(rgb.b * 0.85);
                ctx.fillStyle = `rgb(${baseR}, ${baseG}, ${baseB})`;
                ctx.fillRect(0, 0, size, size);

                // Rocky speckle / pores
                for (let i = 0; i < 400; i++) {
                    const px = this.getNodeSeed(seed, i * 2) * size;
                    const py = this.getNodeSeed(seed, i * 5) * size;
                    const pr = 1 + this.getNodeSeed(seed, i * 9) * 2;
                    const brightness = this.getNodeSeed(seed, i * 12) > 0.5 ? 80 : 0;
                    ctx.fillStyle = `rgba(${brightness}, ${brightness}, ${brightness}, 0.15)`;
                    ctx.beginPath();
                    ctx.arc(px, py, pr, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Cracks/fractures
                const numCracks = 15;
                for (let i = 0; i < numCracks; i++) {
                    const x1 = this.getNodeSeed(seed, i * 7) * size;
                    const y1 = this.getNodeSeed(seed, i * 11) * size;
                    const x2 = x1 + (this.getNodeSeed(seed, i * 13) - 0.5) * 120;
                    const y2 = y1 + (this.getNodeSeed(seed, i * 17) - 0.5) * 120;
                    ctx.strokeStyle = "rgba(0, 0, 0, 0.7)";
                    ctx.lineWidth = 1 + this.getNodeSeed(seed, i) * 2;
                    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
                }

                // Crater pits
                const numCraters = 12;
                for (let i = 0; i < numCraters; i++) {
                    const cx = this.getNodeSeed(seed, i * 33) * size;
                    const cy = this.getNodeSeed(seed, i * 41) * size;
                    const r = (0.02 + this.getNodeSeed(seed, i * 15) * 0.06) * size;
                    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
                    grad.addColorStop(0, "rgba(0, 0, 0, 0.85)");
                    grad.addColorStop(0.75, "rgba(0, 0, 0, 0.3)");
                    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
                    ctx.fillStyle = grad;
                    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
                }
            } else if (val < 0.8) {
                // 2. Metallic Ore Asteroid (M-type) (dynamic light steel color)
                const baseR = Math.floor(rgb.r * 0.9);
                const baseG = Math.floor(rgb.g * 0.9);
                const baseB = Math.floor(rgb.b * 0.95);
                ctx.fillStyle = `rgb(${baseR}, ${baseG}, ${baseB})`;
                ctx.fillRect(0, 0, size, size);

                // Crystalline metal grains
                for (let i = 0; i < 150; i++) {
                    const px = this.getNodeSeed(seed, i * 4) * size;
                    const py = this.getNodeSeed(seed, i * 7) * size;
                    const pr = 3 + this.getNodeSeed(seed, i * 11) * 5;
                    ctx.fillStyle = `rgba(${Math.min(255, Math.floor(rgb.r * 1.25))}, ${Math.min(255, Math.floor(rgb.g * 1.25))}, ${Math.min(255, Math.floor(rgb.b * 1.35))}, ${0.1 + this.getNodeSeed(seed, i * 3) * 0.15})`;
                    ctx.fillRect(px, py, pr, pr);
                }

                // Veins of precious minerals (Gold / Cyan Neon)
                const veinColor = rgb.r > rgb.g ? "rgba(255, 215, 0, 0.85)" : "rgba(0, 242, 254, 0.85)";
                const numVeins = 6;
                for (let i = 0; i < numVeins; i++) {
                    let vx = this.getNodeSeed(seed, i * 30) * size;
                    let vy = this.getNodeSeed(seed, i * 40) * size;
                    ctx.strokeStyle = veinColor;
                    ctx.lineWidth = 2.0;
                    ctx.beginPath();
                    ctx.moveTo(vx, vy);
                    for (let j = 0; j < 5; j++) {
                        vx += (this.getNodeSeed(seed, i * 3 + j * 5) - 0.5) * 60;
                        vy += (this.getNodeSeed(seed, i * 7 + j * 9) - 0.5) * 60;
                        ctx.lineTo(vx, vy);
                    }
                    ctx.stroke();

                    // Bright node deposits
                    ctx.fillStyle = veinColor;
                    ctx.beginPath(); ctx.arc(vx, vy, 3.5, 0, Math.PI * 2); ctx.fill();
                }
            } else {
                // 3. Active Comet (icy core, sublimation fissures)
                ctx.fillStyle = `rgb(${Math.min(255, Math.floor(rgb.r * 1.15))}, ${Math.min(255, Math.floor(rgb.g * 1.15))}, ${Math.min(255, Math.floor(rgb.b * 1.2))})`;
                ctx.fillRect(0, 0, size, size);

                // Deep blue ice patches
                const numIce = 8;
                for (let i = 0; i < numIce; i++) {
                    const cx = this.getNodeSeed(seed, i * 12) * size;
                    const cy = this.getNodeSeed(seed, i * 15) * size;
                    const r = (0.06 + this.getNodeSeed(seed, i * 8) * 0.15) * size;
                    const iceGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
                    iceGrad.addColorStop(0, `rgba(${Math.floor(rgb.r * 0.5)}, ${Math.floor(rgb.g * 0.5)}, ${Math.floor(rgb.b * 0.65)}, 0.6)`);
                    iceGrad.addColorStop(0.7, `rgba(${Math.floor(rgb.r * 0.5)}, ${Math.floor(rgb.g * 0.5)}, ${Math.floor(rgb.b * 0.65)}, 0.2)`);
                    iceGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
                    ctx.fillStyle = iceGrad;
                    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
                }

                // Sublimation fractures (bright glowing cracks)
                const numFractures = 12;
                for (let i = 0; i < numFractures; i++) {
                    const x1 = this.getNodeSeed(seed, i * 5) * size;
                    const y1 = this.getNodeSeed(seed, i * 8) * size;
                    const x2 = x1 + (this.getNodeSeed(seed, i * 9) - 0.5) * 110;
                    const y2 = y1 + (this.getNodeSeed(seed, i * 13) - 0.5) * 110;
                    
                    ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
                    ctx.lineWidth = 1.5;
                    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
                }
            }
        } else if (type === "moon") {
            const val = this.getNodeSeed(seed, 100);
            if (val < 0.5) {
                // 1. Dusty Moon (standard lunar cratered style) (dynamic light lunar color)
                const baseR = Math.floor(rgb.r * 0.9);
                const baseG = Math.floor(rgb.g * 0.9);
                const baseB = Math.floor(rgb.b * 0.9);
                ctx.fillStyle = `rgb(${baseR}, ${baseG}, ${baseB})`;
                ctx.fillRect(0, 0, size, size);

                // Dark basaltic maria
                const numMaria = 8;
                for (let i = 0; i < numMaria; i++) {
                    const cx = this.getNodeSeed(seed, i * 12) * size;
                    const cy = this.getNodeSeed(seed, i * 15) * size;
                    const r = (0.07 + this.getNodeSeed(seed, i * 9) * 0.16) * size;
                    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
                    grad.addColorStop(0, `rgba(${Math.floor(rgb.r * 0.4)}, ${Math.floor(rgb.g * 0.4)}, ${Math.floor(rgb.b * 0.4)}, 0.35)`);
                    grad.addColorStop(0.7, `rgba(${Math.floor(rgb.r * 0.4)}, ${Math.floor(rgb.g * 0.4)}, ${Math.floor(rgb.b * 0.4)}, 0.15)`);
                    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    for (let a = 0; a < Math.PI * 2; a += 0.35) {
                        const noise = 1 + (this.getNodeSeed(seed, i * 3 + a) - 0.5) * 0.25;
                        ctx.lineTo(cx + Math.cos(a) * r * noise, cy + Math.sin(a) * r * noise);
                    }
                    ctx.closePath(); ctx.fill();
                }

                // Craters & ray systems
                const numCraters = 20;
                const majorCraters = [];
                for (let i = 0; i < numCraters; i++) {
                    const cx = this.getNodeSeed(seed, i * 21) * size;
                    const cy = this.getNodeSeed(seed, i * 23) * size;
                    const r = (0.015 + this.getNodeSeed(seed, i * 3) * 0.038) * size;
                    if (r > size * 0.033) majorCraters.push({ x: cx, y: cy, r });

                    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
                    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
                    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
                    ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.arc(cx + 0.8, cy + 0.8, r, 0, Math.PI * 2); ctx.stroke();
                }

                // Rays
                ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
                majorCraters.forEach((cr, ci) => {
                    const numRays = 8 + Math.floor(this.getNodeSeed(seed, ci * 4) * 6);
                    for (let k = 0; k < numRays; k++) {
                        const angle = (k / numRays) * Math.PI * 2 + this.getNodeSeed(seed, ci * 7 + k) * 0.25;
                        const len = (0.15 + this.getNodeSeed(seed, ci * 9 + k) * 0.25) * size;
                        ctx.beginPath();
                        ctx.moveTo(cr.x + Math.cos(angle) * cr.r, cr.y + Math.sin(angle) * cr.r);
                        ctx.lineTo(cr.x + Math.cos(angle) * len, cr.y + Math.sin(angle) * len);
                        ctx.stroke();
                    }
                });
            } else if (val < 0.8) {
                // 2. Io-like Volcanic Moon (sulfur deposits and dark calderas)
                ctx.fillStyle = colorHex;
                ctx.fillRect(0, 0, size, size);

                // Greenish/reddish patches
                for (let i = 0; i < 12; i++) {
                    const cx = this.getNodeSeed(seed, i * 14) * size;
                    const cy = this.getNodeSeed(seed, i * 19) * size;
                    const r = (0.08 + this.getNodeSeed(seed, i * 11) * 0.14) * size;
                    const isRed = i % 2 === 0;
                    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
                    grad.addColorStop(0, isRed ? `rgba(${Math.floor(rgb.r * 0.7)}, ${Math.floor(rgb.g * 0.3)}, ${Math.floor(rgb.b * 0.3)}, 0.55)` : `rgba(${Math.floor(rgb.r * 0.3)}, ${Math.floor(rgb.g * 0.6)}, ${Math.floor(rgb.b * 0.3)}, 0.55)`);
                    grad.addColorStop(0.6, isRed ? `rgba(${Math.floor(rgb.r * 0.7)}, ${Math.floor(rgb.g * 0.3)}, ${Math.floor(rgb.b * 0.3)}, 0.2)` : `rgba(${Math.floor(rgb.r * 0.3)}, ${Math.floor(rgb.g * 0.6)}, ${Math.floor(rgb.b * 0.3)}, 0.2)`);
                    grad.addColorStop(1, "rgba(0,0,0,0)");
                    ctx.fillStyle = grad;
                    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
                }

                // Dark calderas (active volcanic lakes)
                const numCalderas = 10;
                for (let i = 0; i < numCalderas; i++) {
                    const cx = this.getNodeSeed(seed, i * 29) * size;
                    const cy = this.getNodeSeed(seed, i * 31) * size;
                    const r = (0.015 + this.getNodeSeed(seed, i * 5) * 0.035) * size;
                    ctx.fillStyle = "#2a1e15"; // dark brown/black lava lake
                    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

                    // Glowing orange ring border
                    ctx.strokeStyle = "rgba(255, 90, 0, 0.8)";
                    ctx.lineWidth = 1.2;
                    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
                }
            } else {
                // 3. Europa-like Icy Moon (white shell, crisscrossing linear fractures)
                ctx.fillStyle = `rgb(${Math.min(255, Math.floor(rgb.r * 1.15))}, ${Math.min(255, Math.floor(rgb.g * 1.15))}, ${Math.min(255, Math.floor(rgb.b * 1.2))})`;
                ctx.fillRect(0, 0, size, size);

                // Soft blue ice sheet gradients
                for (let i = 0; i < 6; i++) {
                    const cx = this.getNodeSeed(seed, i * 18) * size;
                    const cy = this.getNodeSeed(seed, i * 25) * size;
                    const r = (0.12 + this.getNodeSeed(seed, i * 14) * 0.2) * size;
                    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
                    grad.addColorStop(0, `rgba(${Math.floor(rgb.r * 0.65)}, ${Math.floor(rgb.g * 0.75)}, ${Math.floor(rgb.b * 0.85)}, 0.4)`);
                    grad.addColorStop(0.7, `rgba(${Math.floor(rgb.r * 0.65)}, ${Math.floor(rgb.g * 0.75)}, ${Math.floor(rgb.b * 0.85)}, 0.1)`);
                    grad.addColorStop(1, "rgba(0,0,0,0)");
                    ctx.fillStyle = grad;
                    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
                }

                // Reddish/brown fracture lines
                const numFractures = 18;
                for (let i = 0; i < numFractures; i++) {
                    const x1 = this.getNodeSeed(seed, i * 6) * size;
                    const y1 = this.getNodeSeed(seed, i * 13) * size;
                    const x2 = x1 + (this.getNodeSeed(seed, i * 17) - 0.5) * size * 0.8;
                    const y2 = y1 + (this.getNodeSeed(seed, i * 21) - 0.5) * size * 0.8;

                    ctx.strokeStyle = "rgba(110, 60, 35, 0.5)"; // rusty brown crack
                    ctx.lineWidth = 1 + this.getNodeSeed(seed, i) * 3;
                    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();

                    // Subtle bright highlight beside the crack
                    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
                    ctx.lineWidth = 0.8;
                    ctx.beginPath(); ctx.moveTo(x1 + 1, y1 + 1); ctx.lineTo(x2 + 1, y2 + 1); ctx.stroke();
                }
            }
        } else {
            const val = this.getNodeSeed(seed, 100);
            if (val < 0.4) {
                // 1. Comm Satellite (foil plates, solar wings, beacon)
                ctx.fillStyle = colorHex;
                ctx.fillRect(0, 0, size, size);

                // Plate divisions
                ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
                ctx.lineWidth = 2.0;
                const pSize = 64;
                for (let x = 0; x < size; x += pSize) {
                    for (let y = 0; y < size; y += pSize) {
                        ctx.strokeRect(x, y, pSize, pSize);
                        ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
                        ctx.fillRect(x + 2, y + 2, 2, 2);
                        ctx.fillRect(x + pSize - 4, y + 2, 2, 2);
                    }
                }

                // Solar cells array inside texture
                const sx = 0.2 * size, sy = 0.2 * size, sw = 0.6 * size, sh = 0.6 * size;
                ctx.fillStyle = `rgb(${Math.floor(rgb.r * 0.25)}, ${Math.floor(rgb.g * 0.25)}, ${Math.floor(rgb.b * 0.35)})`;
                ctx.fillRect(sx, sy, sw, sh);
                ctx.strokeStyle = "#00f2fe"; // Cian
                ctx.lineWidth = 3.0;
                ctx.strokeRect(sx, sy, sw, sh);

                // Solar grids
                ctx.strokeStyle = "rgba(0, 242, 254, 0.45)";
                ctx.lineWidth = 1.0;
                for (let px = sx; px < sx + sw; px += sw / 4) {
                    ctx.beginPath(); ctx.moveTo(px, sy); ctx.lineTo(px, sy + sh); ctx.stroke();
                }
                for (let py = sy; py < sy + sh; py += sh / 8) {
                    ctx.beginPath(); ctx.moveTo(sx, py); ctx.lineTo(sx + sw, py); ctx.stroke();
                }

                // Red beacon led
                ctx.fillStyle = "#ff0055";
                ctx.beginPath(); ctx.arc(size/2, size/2, 10, 0, Math.PI * 2); ctx.fill();
            } else if (val < 0.75) {
                // 2. Space Station (silver plates, solar cell zones, cabin windows) (dynamic light alloy)
                const baseR = Math.floor(rgb.r * 0.95);
                const baseG = Math.floor(rgb.g * 0.95);
                const baseB = Math.floor(rgb.b * 0.95);
                ctx.fillStyle = `rgb(${baseR}, ${baseG}, ${baseB})`;
                ctx.fillRect(0, 0, size, size);

                // Grid armor paneling
                ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
                ctx.lineWidth = 1.5;
                const pSize = 48;
                for (let x = 0; x < size; x += pSize) {
                    for (let y = 0; y < size; y += pSize) {
                        ctx.strokeRect(x, y, pSize, pSize);
                    }
                }

                // Rows of glowing green/yellow cabin windows
                ctx.fillStyle = "#00ff87";
                for (let y = pSize; y < size - pSize; y += pSize * 2) {
                    for (let x = pSize; x < size - pSize; x += pSize) {
                        ctx.fillRect(x + 8, y + 8, 8, 6);
                        ctx.fillRect(x + 24, y + 8, 8, 6);
                    }
                }

                // Flashing beacon lights
                ctx.fillStyle = "#ffeb3b";
                ctx.beginPath(); ctx.arc(32, 32, 6, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(size - 32, size - 32, 6, 0, Math.PI * 2); ctx.fill();
            } else {
                // 3. Scientific Probe (metallic core, intricate copper wiring, blue camera lens) (dynamic light core)
                const baseR = Math.floor(rgb.r * 0.9);
                const baseG = Math.floor(rgb.g * 0.9);
                const baseB = Math.floor(rgb.b * 0.9);
                ctx.fillStyle = `rgb(${baseR}, ${baseG}, ${baseB})`;
                ctx.fillRect(0, 0, size, size);

                // Copper circuitry lines
                ctx.strokeStyle = "#e67e22"; // Copper orange
                ctx.lineWidth = 2.5;
                for (let i = 0; i < 8; i++) {
                    let cx = this.getNodeSeed(seed, i * 11) * size;
                    let cy = this.getNodeSeed(seed, i * 17) * size;
                    ctx.beginPath();
                    ctx.moveTo(cx, cy);
                    for (let j = 0; j < 6; j++) {
                        const dir = this.getNodeSeed(seed, i * 7 + j) > 0.5;
                        const dist = (0.06 + this.getNodeSeed(seed, i * 4 + j) * 0.08) * size;
                        if (dir) cx += dist; else cy += dist;
                        ctx.lineTo(cx, cy);
                    }
                    ctx.stroke();

                    // Gold welds
                    ctx.fillStyle = "#f1c40f";
                    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
                }

                // Scientific camera lens in the center
                const lensX = size/2, lensY = size/2, lensR = 48;
                const lensGrad = ctx.createRadialGradient(lensX, lensY, 0, lensX, lensY, lensR);
                lensGrad.addColorStop(0, "#00f2fe"); // Glowing cyan core
                lensGrad.addColorStop(0.5, "#0c2440"); // Deep blue lens glass
                lensGrad.addColorStop(0.85, "#1b1d20");
                lensGrad.addColorStop(1, "#ffffff"); // Chrome outer ring
                ctx.fillStyle = lensGrad;
                ctx.beginPath(); ctx.arc(lensX, lensY, lensR, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 3.0;
                ctx.stroke();
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        this.textureCache[cacheKey] = texture;
        return texture;
    }

    renderNode(ctx, x, y, r, node, sunDirection, time) {
        const color = node.color || "#00f2fe";
        
        // Obtener o generar la textura procedimental para el planeta
        const texture = this.generateProceduralTexture(color, node.seed || node.id, node.type);

        // Configurar material
        this.sphereMaterial.map = texture;
        this.sphereMaterial.color.set(0xffffff); // El color se aplica desde la textura
        this.sphereMaterial.needsUpdate = true;

        if (node.type === "sun") {
            // El Sol emite su propia luz, por lo que se define como emisivo, pero con menor intensidad para mostrar facetas
            this.sphereMaterial.emissive.set(color);
            this.sphereMaterial.emissiveIntensity = 0.45;
            this.sphereMaterial.roughness = 0.3;
            this.sphereMaterial.metalness = 0.1;
        } else {
            this.sphereMaterial.emissive.set(0x000000);
            this.sphereMaterial.emissiveIntensity = 0.0;
            if (node.type === "planet") {
                const val = this.getNodeSeed(node.seed || node.id, 100);
                if (val < 0.35) {
                    // Gaseous Giant
                    this.sphereMaterial.roughness = 0.25;
                    this.sphereMaterial.metalness = 0.15;
                } else if (val < 0.55) {
                    // Ice Giant
                    this.sphereMaterial.roughness = 0.35;
                    this.sphereMaterial.metalness = 0.05;
                } else if (val < 0.75) {
                    // Terrestrial Earth-like
                    this.sphereMaterial.roughness = 0.65;
                    this.sphereMaterial.metalness = 0.05;
                } else {
                    // Terrestrial Volcanic
                    this.sphereMaterial.roughness = 0.8;
                    this.sphereMaterial.metalness = 0.1;
                }
            } else if (node.type === "planetoid") {
                const val = this.getNodeSeed(node.seed || node.id, 100);
                if (val < 0.45) {
                    // Rocky Asteroid
                    this.sphereMaterial.roughness = 0.85;
                    this.sphereMaterial.metalness = 0.1;
                } else if (val < 0.8) {
                    // Metallic Ore Asteroid
                    this.sphereMaterial.roughness = 0.4;
                    this.sphereMaterial.metalness = 0.85;
                } else {
                    // Active Comet
                    this.sphereMaterial.roughness = 0.6;
                    this.sphereMaterial.metalness = 0.2;
                }
            } else if (node.type === "moon") {
                const val = this.getNodeSeed(node.seed || node.id, 100);
                if (val < 0.5) {
                    // Dusty Moon
                    this.sphereMaterial.roughness = 0.9;
                    this.sphereMaterial.metalness = 0.0;
                } else if (val < 0.8) {
                    // Io-like Volcanic
                    this.sphereMaterial.roughness = 0.75;
                    this.sphereMaterial.metalness = 0.0;
                } else {
                    // Europa-like Icy
                    this.sphereMaterial.roughness = 0.4;
                    this.sphereMaterial.metalness = 0.1;
                }
                

            } else if (node.type === "satellite") {
                const val = this.getNodeSeed(node.seed || node.id, 100);
                if (val < 0.4) {
                    // Comm Satellite
                    this.sphereMaterial.roughness = 0.3;
                    this.sphereMaterial.metalness = 0.8;
                } else if (val < 0.75) {
                    // Space Station
                    this.sphereMaterial.roughness = 0.45;
                    this.sphereMaterial.metalness = 0.65;
                } else {
                    // Scientific Probe
                    this.sphereMaterial.roughness = 0.25;
                    this.sphereMaterial.metalness = 0.9;
                }
            } else {
                this.sphereMaterial.roughness = 0.65;
                this.sphereMaterial.metalness = 0.1;
            }
        }

        // Posicionar luz direccional del Sol dinámicamente
        if (node.type === "sun") {
            this.sunLight.position.set(0, 0, 5);
        } else if (sunDirection) {
            this.sunLight.position.set(sunDirection.x * 5, -sunDirection.y * 5, 1.8); 
        } else {
            this.sunLight.position.set(5, 3, 5);
        }

        // Configurar visibilidad de las mallas low-poly
        this.planetMesh.visible = false;
        this.planetoidMesh.visible = false;
        this.moonMesh.visible = false;
        this.satelliteMesh.visible = false;
        this.crystalMesh.visible = false;
        this.sunGroup.visible = false;

        let activeMesh = null;
        if (node.type === "sun") {
            this.sunGroup.visible = true;
            activeMesh = this.sunGroup;
        } else if (node.type === "planet") {
            this.planetMesh.visible = true;
            activeMesh = this.planetMesh;
        } else if (node.type === "planetoid") {
            this.planetoidMesh.visible = true;
            activeMesh = this.planetoidMesh;
        } else if (node.type === "moon") {
            this.moonMesh.visible = true;
            activeMesh = this.moonMesh;
        } else {
            this.satelliteMesh.visible = true;
            activeMesh = this.satelliteMesh;
        }

        // Aplicar rotación sobre su propio eje Y
        const speedMultiplier = node.type === "moon" ? 0.35 : (node.type === "planetoid" ? 1.4 : 0.7);
        activeMesh.rotation.y = time * 0.0003 * speedMultiplier;
        activeMesh.rotation.x = 0.25;

        // Animar luces artificiales y aura si es un satélite
        if (node.type === "satellite") {
            const timeSec = time * 0.004;
            const blink = Math.sin(timeSec * 2.5) > 0;
            // Alternar color/estado de los LEDs
            this.satBeaconMaterial.color.setHex(blink ? 0x00ff87 : 0xff0055);
            this.satBeaconMaterial.opacity = blink ? 1.0 : 0.25;
            
            this.satHalo.visible = false;
            this.satBeaconCenter.visible = true;
            this.satBeaconLeft.visible = true;
            this.satBeaconRight.visible = true;
        } else {
            this.satHalo.visible = false;
            this.satBeaconCenter.visible = false;
            this.satBeaconLeft.visible = false;
            this.satBeaconRight.visible = false;
        }

        // Manejar Anillos de Planetas Gigantes
        const hasRings = node.type === "planet" && this.getNodeSeed(node.id, 8) > 0.6;
        if (hasRings) {
            activeMesh.scale.set(0.62, 0.62, 0.62);
            this.ringMesh.scale.set(0.62, 0.62, 0.62);
            this.ringMesh.visible = true;
            
            const ringStyle = Math.floor(this.getNodeSeed(node.id, 12) * 4);
            const ringTexture = this.generateProceduralRingTexture(color, node.seed || node.id, ringStyle);
            
            this.ringMaterial.map = ringTexture;
            
            // Configurar propiedades de material según el estilo de anillo
            if (ringStyle === 1) { // Sci-Fi HUD
                this.ringMesh.geometry = this.ringGeometrySmooth;
                this.ringMaterial.color.set(color);
                this.ringMaterial.emissive.set(color);
                this.ringMaterial.emissiveIntensity = 1.0;
                this.ringMaterial.roughness = 0.1;
                this.ringMaterial.metalness = 0.9;
                this.ringMaterial.blending = THREE.AdditiveBlending;
                this.ringMaterial.opacity = 0.95;
            } else if (ringStyle === 3) { // Doble Energía
                this.ringMesh.geometry = this.ringGeometrySmooth;
                this.ringMaterial.color.set(color);
                this.ringMaterial.emissive.set(color);
                this.ringMaterial.emissiveIntensity = 1.5;
                this.ringMaterial.roughness = 0.1;
                this.ringMaterial.metalness = 0.8;
                this.ringMaterial.blending = THREE.AdditiveBlending;
                this.ringMaterial.opacity = 1.0;
            } else if (ringStyle === 2) { // Asteroides
                this.ringMesh.geometry = this.ringGeometryLowPoly; // Low-poly para asteroides angulares
                this.ringMaterial.color.set(0xffffff);
                this.ringMaterial.emissive.set(0x000000);
                this.ringMaterial.emissiveIntensity = 0.0;
                this.ringMaterial.roughness = 0.9;
                this.ringMaterial.metalness = 0.05;
                this.ringMaterial.blending = THREE.NormalBlending;
                this.ringMaterial.opacity = 0.75;
            } else { // Saturno Clásico
                this.ringMesh.geometry = this.ringGeometrySmooth;
                this.ringMaterial.color.set(0xffffff);
                this.ringMaterial.emissive.set(0x000000);
                this.ringMaterial.emissiveIntensity = 0.0;
                this.ringMaterial.roughness = 0.7;
                this.ringMaterial.metalness = 0.1;
                this.ringMaterial.blending = THREE.NormalBlending;
                this.ringMaterial.opacity = 0.85;
            }
            this.ringMaterial.needsUpdate = true;

            // Dirección y velocidad de rotación variable determinista
            const rotDirection = this.getNodeSeed(node.id, 15) > 0.5 ? 1 : -1;
            const rotSpeed = 0.00002 + this.getNodeSeed(node.id, 16) * 0.00008;
            this.ringMesh.rotation.z = time * rotSpeed * rotDirection;
            
            // Variación de inclinación (tilt) determinista basada en semilla
            const tiltX = Math.PI * (0.35 + this.getNodeSeed(node.id, 17) * 0.1); 
            const tiltY = Math.PI * (0.02 + this.getNodeSeed(node.id, 18) * 0.12); 
            this.ringMesh.rotation.x = tiltX;
            this.ringMesh.rotation.y = tiltY;
        } else {
            activeMesh.scale.set(1.0, 1.0, 1.0);
            this.ringMesh.scale.set(1.0, 1.0, 1.0);
            this.ringMesh.visible = false;
        }

        // Renderizar la escena en el canvas oculto
        this.renderer.render(this.scene, this.camera);

        // Dibujar el resultado en el canvas 2D principal
        ctx.drawImage(
            this.offscreenCanvas,
            0, 0, this.canvasSize, this.canvasSize, // Origen
            x - r, y - r, r * 2, r * 2             // Destino
        );
    }

    renderCrystal(ctx, x, y, r, colorHex, time) {
        // Generar una textura simple en caché para el cristal
        const cacheKey = `crystal-${colorHex}`;
        let texture = this.textureCache[cacheKey];
        if (!texture) {
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;
            const c = canvas.getContext('2d');
            c.fillStyle = colorHex;
            c.fillRect(0, 0, 64, 64);
            texture = new THREE.CanvasTexture(canvas);
            this.textureCache[cacheKey] = texture;
        }

        this.sphereMaterial.map = texture;
        this.sphereMaterial.color.set(0xffffff);
        this.sphereMaterial.emissive.set(colorHex);
        this.sphereMaterial.emissiveIntensity = 0.6;
        this.sphereMaterial.roughness = 0.25;
        this.sphereMaterial.needsUpdate = true;

        // Configurar visibilidad
        this.planetMesh.visible = false;
        this.planetoidMesh.visible = false;
        this.moonMesh.visible = false;
        this.satelliteMesh.visible = false;
        this.sunGroup.visible = false;
        this.ringMesh.visible = false;
        
        this.crystalMesh.visible = true;

        // Rotar el cristal rápidamente para efecto cinético
        this.crystalMesh.rotation.y = time * 0.003;
        this.crystalMesh.rotation.x = time * 0.0015;
        this.crystalMesh.rotation.z = time * 0.001;
        this.crystalMesh.scale.set(1.0, 1.0, 1.0);

        // Iluminación fija brillante
        this.sunLight.position.set(2, 4, 3);

        this.renderer.render(this.scene, this.camera);

        ctx.drawImage(
            this.offscreenCanvas,
            0, 0, this.canvasSize, this.canvasSize,
            x - r, y - r, r * 2, r * 2
        );
    }

    // Helper para determinar semillas de los anillos de manera estática
    getNodeSeed(nodeId, index) {
        let hash = 0;
        const key = nodeId + "-" + index;
        for (let i = 0; i < key.length; i++) {
            hash = key.charCodeAt(i) + ((hash << 5) - hash);
        }
        return Math.abs(Math.sin(hash)) % 1;
    }

    // Generador de texturas de anillos dinámicos y variados
    generateProceduralRingTexture(colorHex, seed, style) {
        const cacheKey = `ring-${colorHex}-${seed}-${style}`;
        if (this.textureCache[cacheKey]) {
            return this.textureCache[cacheKey];
        }

        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const cx = size / 2;
        const cy = size / 2;

        ctx.clearRect(0, 0, size, size);

        const rgb = hexToRgb(colorHex);
        const minR = 85;
        const maxR = 125;
        const width = maxR - minR;

        if (style === 0) {
            // Saturno Clásico (anillos múltiples)
            const numRings = 40;
            for (let i = 0; i < numRings; i++) {
                const r = minR + (i / numRings) * width;
                const noise = this.seededRand(seed, `saturn-ring-${i}`);
                
                // Cassini division gap
                if (r > minR + width * 0.45 && r < minR + width * 0.53) {
                    continue;
                }
                
                if (noise < 0.15) continue;

                const opacity = 0.15 + noise * 0.65;
                const factor = 0.7 + noise * 0.6;
                const ringR = Math.min(255, Math.floor(rgb.r * factor));
                const ringG = Math.min(255, Math.floor(rgb.g * factor));
                const ringB = Math.min(255, Math.floor(rgb.b * factor));

                ctx.strokeStyle = `rgba(${ringR}, ${ringG}, ${ringB}, ${opacity})`;
                ctx.lineWidth = 1.0 + noise * 2.5;
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.stroke();
            }
        } else if (style === 1) {
            // Sci-Fi HUD (órbita de datos)
            const techColor = colorHex;
            ctx.shadowColor = techColor;
            ctx.shadowBlur = 4;

            const ringRadii = [88, 98, 108, 118];
            ringRadii.forEach((r, idx) => {
                ctx.strokeStyle = techColor;
                if (idx === 0) {
                    ctx.lineWidth = 1.0;
                    ctx.setLineDash([]);
                } else if (idx === 1) {
                    ctx.lineWidth = 1.5;
                    ctx.setLineDash([8, 12]);
                } else if (idx === 2) {
                    ctx.lineWidth = 2.0;
                    ctx.setLineDash([2, 6]);
                } else {
                    ctx.lineWidth = 1.0;
                    ctx.setLineDash([40, 20]);
                }

                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.stroke();
            });
            ctx.setLineDash([]);

            // Marcadores en cruz/líneas radiales HUD
            ctx.strokeStyle = techColor;
            ctx.lineWidth = 1.0;
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
                const noise = this.seededRand(seed, `tech-tick-${angle}`);
                if (noise > 0.6) {
                    const sx = cx + Math.cos(angle) * (minR - 3);
                    const sy = cy + Math.sin(angle) * (minR - 3);
                    const ex = cx + Math.cos(angle) * (maxR + 3);
                    const ey = cy + Math.sin(angle) * (maxR + 3);
                    
                    ctx.beginPath();
                    ctx.moveTo(sx, sy);
                    ctx.lineTo(ex, ey);
                    ctx.stroke();
                }
            }
            ctx.shadowBlur = 0;
        } else if (style === 2) {
            // Cinturón de Asteroides (fragmentos)
            const numAsteroids = 280;
            ctx.fillStyle = `rgba(${Math.min(255, rgb.r + 20)}, ${Math.min(255, rgb.g + 20)}, ${Math.min(255, rgb.b + 20)}, 0.85)`;
            
            for (let i = 0; i < numAsteroids; i++) {
                const rNoise = this.seededRand(seed, `ast-r-${i}`);
                const aNoise = this.seededRand(seed, `ast-a-${i}`);
                const sizeNoise = this.seededRand(seed, `ast-s-${i}`);
                
                let r = minR + rNoise * width;
                if (r > minR + width * 0.45 && r < minR + width * 0.55) {
                    r += (rNoise > 0.5 ? 6 : -6);
                }

                const angle = aNoise * Math.PI * 2;
                const ax = cx + Math.cos(angle) * r;
                const ay = cy + Math.sin(angle) * r;
                const radius = 0.5 + sizeNoise * 1.8;

                ctx.beginPath();
                ctx.arc(ax, ay, radius, 0, Math.PI * 2);
                ctx.fill();
                
                if (sizeNoise > 0.7) {
                    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`;
                    ctx.beginPath();
                    ctx.arc(ax + (sizeNoise - 0.5)*4, ay + (sizeNoise - 0.5)*4, radius * 1.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = `rgba(${Math.min(255, rgb.r + 20)}, ${Math.min(255, rgb.g + 20)}, ${Math.min(255, rgb.b + 20)}, 0.85)`;
                }
            }
        } else {
            // Doble Anillo de Energía (Neón)
            const energyColor = colorHex;
            ctx.shadowColor = energyColor;
            ctx.shadowBlur = 12;
            
            ctx.strokeStyle = energyColor;
            ctx.lineWidth = 3.0;
            ctx.beginPath();
            ctx.arc(cx, cy, minR + width * 0.25, 0, Math.PI * 2);
            ctx.stroke();

            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(cx, cy, minR + width * 0.75, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.shadowBlur = 0;
            ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`;
            ctx.lineWidth = 1.0;
            const waves = 12;
            ctx.beginPath();
            for (let i = 0; i <= waves; i++) {
                const angle = (i / waves) * Math.PI * 2;
                const r1 = minR + width * 0.25;
                const r2 = minR + width * 0.75;
                const x1 = cx + Math.cos(angle) * r1;
                const y1 = cy + Math.sin(angle) * r1;
                const x2 = cx + Math.cos(angle) * r2;
                const y2 = cy + Math.sin(angle) * r2;
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
            }
            ctx.stroke();
        }

        const texture = new THREE.CanvasTexture(canvas);
        this.textureCache[cacheKey] = texture;
        return texture;
    }
}
