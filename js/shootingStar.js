// ShootingStar class for floating tasks in SpaceEngine

export class ShootingStar {
    constructor(id, title, canvas) {
        this.id = id;
        this.title = title;
        this.canvas = canvas;
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.radius = 6;
        this.isActive = false;
        
        // Temporizador para aparecer de manera asíncrona
        this.cooldown = Math.random() * 8 + 2; // Segundos antes de cruzar
        
        // Puntos de control para la trayectoria curva parabólica (Bézier cuadrático)
        this.p0 = { x: 0, y: 0 };
        this.p1 = { x: 0, y: 0 };
        this.p2 = { x: 0, y: 0 };
        this.t = 0;
        this.duration = 6.0;
        
        this.offsetX = 0;
        this.offsetY = 0;
        
        // Estilo visual amarillo clásico solicitado
        this.color = "#ffeb3b";
        this.sparkColor = "#ffeb3b";
        this.glowColor = "rgba(255, 235, 59, 0.4)";
        this.sparks = [];
        this.isHovered = false;
        
        this.reset();
    }

    reset() {
        this.isActive = false;
        this.cooldown = Math.random() * 12 + 4; // Espera entre vuelos
        this.t = 0;
        this.duration = Math.random() * 1.5 + 5.0; // 5.0 a 6.5 segundos de duración
        this.sparks = [];
        this.isHovered = false;

        // Centro por defecto de la pantalla
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;
        
        // Borde de origen aleatorio: Arriba, Izquierda, Derecha
        const spawnEdge = Math.random();
        
        if (spawnEdge < 0.4) {
            // Spawn Arriba: cruza hacia abajo
            this.p0 = {
                x: this.canvas.width * (0.15 + Math.random() * 0.7),
                y: -50
            };
            this.p2 = {
                x: this.canvas.width * (0.15 + Math.random() * 0.7),
                y: this.canvas.height + 50
            };
        } else if (spawnEdge < 0.7) {
            // Spawn Izquierda: cruza hacia la derecha
            this.p0 = {
                x: -50,
                y: this.canvas.height * (0.15 + Math.random() * 0.7)
            };
            this.p2 = {
                x: this.canvas.width + 50,
                y: this.canvas.height * (0.15 + Math.random() * 0.7)
            };
        } else {
            // Spawn Derecha: cruza hacia la izquierda
            this.p0 = {
                x: this.canvas.width + 50,
                y: this.canvas.height * (0.15 + Math.random() * 0.7)
            };
            this.p2 = {
                x: -50,
                y: this.canvas.height * (0.15 + Math.random() * 0.7)
            };
        }

        // Offset con respecto al centro para crear curvaturas parabólicas variadas y elegantes
        // El rango [-100, 100] asegura que pasen muy cerca del Sol (centro)
        this.offsetX = (Math.random() - 0.5) * 200;
        this.offsetY = (Math.random() - 0.5) * 200;
        
        this.p1 = {
            x: cx + this.offsetX,
            y: cy + this.offsetY
        };
        
        this.x = this.p0.x;
        this.y = this.p0.y;
        this.vx = 0;
        this.vy = 0;
    }

    checkHover(mx, my) {
        if (!this.isActive) {
            this.isHovered = false;
            return;
        }
        const dist = Math.hypot(mx - this.x, my - this.y);
        this.isHovered = dist <= this.radius * 3.5;
    }

    update(dt, engine) {
        if (!this.isActive) {
            this.cooldown -= dt;
            if (this.cooldown <= 0) {
                this.isActive = true;
            }
            return;
        }

        // Si tenemos acceso al motor, actualizamos dinámicamente P1 basándonos en la posición
        // de pantalla en tiempo real del Sol (o del nodo enfocado) para que se curve a su alrededor
        let targetX = this.canvas.width / 2;
        let targetY = this.canvas.height / 2;
        
        if (engine && engine.nodes) {
            const targetNode = engine.followedNode || engine.nodes.find(n => n.type === "sun") || engine.nodes[0];
            if (targetNode) {
                const worldPos = engine.getNodeAbsolutePosition(targetNode);
                const screenPos = engine.worldToScreen(worldPos.x, worldPos.y);
                targetX = screenPos.x;
                targetY = screenPos.y;
            }
        }
        
        this.p1.x = targetX + this.offsetX;
        this.p1.y = targetY + this.offsetY;

        // Factor de velocidad con ralentización del 40% en el centro de la pantalla (t = 0.5)
        // S(t) = 1.0 - 0.6 * sin(pi * t) -> En el centro vale 0.4 (va al 40% de velocidad)
        const speedFactor = 1.0 - 0.6 * Math.sin(Math.PI * this.t);
        
        // Avanzar el parámetro t en proporción al tiempo transcurrido
        const baseSpeed = 1 / this.duration;
        this.t += baseSpeed * speedFactor * dt;

        if (this.t >= 1.0) {
            this.reset();
            return;
        }

        // Evaluar la posición actual en la curva Bézier cuadrática
        const u = 1 - this.t;
        const tt = this.t * this.t;
        const uu = u * u;
        
        this.x = uu * this.p0.x + 2 * u * this.t * this.p1.x + tt * this.p2.x;
        this.y = uu * this.p0.y + 2 * u * this.t * this.p1.y + tt * this.p2.y;

        // Derivada matemática para el vector de velocidad instantánea
        // B'(t) = 2(1-t)(P1 - P0) + 2t(P2 - P1)
        const tVelScale = baseSpeed * speedFactor;
        this.vx = (2 * u * (this.p1.x - this.p0.x) + 2 * this.t * (this.p2.x - this.p1.x)) * tVelScale;
        this.vy = (2 * u * (this.p1.y - this.p0.y) + 2 * this.t * (this.p2.y - this.p1.y)) * tVelScale;

        // Emitir chispas en la estela de fuego
        const sparkRate = this.isHovered ? 5.0 : 2.0;
        const numSparksToEmit = Math.floor(sparkRate + Math.random());
        
        for (let i = 0; i < numSparksToEmit; i++) {
            const randT = Math.random();
            const sparkX = this.x - this.vx * dt * randT;
            const sparkY = this.y - this.vy * dt * randT;
            
            const angleSpread = Math.random() * Math.PI * 2;
            const speedSpread = Math.random() * 25 + 5;
            
            this.sparks.push({
                x: sparkX,
                y: sparkY,
                vx: -this.vx * 0.12 + Math.cos(angleSpread) * speedSpread,
                vy: -this.vy * 0.12 + Math.sin(angleSpread) * speedSpread,
                size: Math.random() * 2.2 + 1.2,
                alpha: 1.0,
                color: this.sparkColor,
                decay: Math.random() * 1.5 + 0.8
            });
        }

        // Actualizar chispas
        this.sparks.forEach(s => {
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            s.alpha -= s.decay * dt;
            s.size *= 0.95;
        });
        this.sparks = this.sparks.filter(s => s.alpha > 0);
    }

    draw(ctx, time, renderer3d) {
        if (!this.isActive) return;

        ctx.save();
        
        // 1. Dibujar Chispas de la Cola
        this.sparks.forEach(s => {
            ctx.save();
            ctx.globalAlpha = s.alpha;
            
            const sparkGrad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 2);
            sparkGrad.addColorStop(0, "#ffffff");
            sparkGrad.addColorStop(0.5, s.color);
            sparkGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
            
            ctx.fillStyle = sparkGrad;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size * 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // 2. Dibujar Brillo / Halo de la Cabeza
        const glowRadius = this.radius * (this.isHovered ? 4.5 : 3.0);
        const headGrad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, glowRadius);
        headGrad.addColorStop(0, "#ffffff");
        headGrad.addColorStop(0.3, this.color);
        headGrad.addColorStop(0.7, this.glowColor);
        headGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        
        ctx.fillStyle = headGrad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // 3. Dibujar Diamante de Cristal Neón de Cabeza
        if (renderer3d) {
            renderer3d.renderCrystal(ctx, this.x, this.y, this.radius * (this.isHovered ? 1.8 : 1.4), this.color, time);
        } else {
            this.drawStarShape(ctx, this.x, this.y, this.radius * (this.isHovered ? 1.8 : 1.4));
        }

        // 4. Etiqueta Flotante con la tarea (Color amarillo neón clásico)
        ctx.fillStyle = this.isHovered ? "#ffffff" : this.color;
        ctx.font = "italic 500 12px 'Outfit', sans-serif";
        ctx.textAlign = "center";
        
        ctx.shadowColor = "#161122";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1.5;
        ctx.shadowOffsetY = 1.5;
        
        let displayTitle = this.title;
        if (displayTitle.length > 25) displayTitle = displayTitle.substring(0, 22) + "...";
        
        ctx.fillText(displayTitle, this.x, this.y - 15);
        
        ctx.restore();
    }

    drawStarShape(ctx, cx, cy, radius) {
        ctx.beginPath();
        ctx.moveTo(cx, cy - radius);
        ctx.lineTo(cx + radius * 0.6, cy);
        ctx.lineTo(cx, cy + radius);
        ctx.lineTo(cx - radius * 0.6, cy);
        ctx.closePath();
        
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
        
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1.0;
        ctx.stroke();
    }

    isHit(mx, my) {
        if (!this.isActive) return false;
        const dist = Math.hypot(mx - this.x, my - this.y);
        const hit = dist <= this.radius * 3.5;
        this.isHovered = hit;
        return hit;
    }
}
