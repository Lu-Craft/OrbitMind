// Module for the OrbiMind guided tutorial
export function initTutorial(nodesList, currentParentId, engine) {
    const TUTORIAL_KEY = "orbimind_tutorial_seen";

    // Setup helper and start if not seen yet
    if (!localStorage.getItem(TUTORIAL_KEY)) {
        startTutorial();
    }

    // Attach click listener for help button
    const helpBtn = document.getElementById("btnShowTutorial");
    if (helpBtn) {
        helpBtn.addEventListener("click", () => {
            startTutorial(true);
        });
    }

    function startTutorial(force = false) {
        // Prevent multiple tutorials running simultaneously
        if (document.querySelector(".tutorial-card") || document.querySelector(".tutorial-highlight-helper")) {
            return;
        }

        let currentStep = 0;
        let resizeListener = null;

        const tutorialSteps = [
            {
                title: "¡Te damos la bienvenida a OrbiMind! 🪐",
                description: "OrbiMind es un <strong>organizador tridimensional de ideas</strong>. Aquí, tus temas de estudio se representan como un <strong>Sistema Solar interactivo</strong>: <br><br><ul>" +
                             "<li><strong>Sol dorado central:</strong> El tema principal (ej. Termodinámica).</li>" +
                             "<li><strong>Planetas y Planetoides:</strong> Categorías y subtemas mayores.</li>" +
                             "<li><strong>Lunas y Satélites:</strong> Apuntes detallados y datos rápidos en órbita.</li>" +
                             "</ul>",
                target: null,
                position: "center"
            },
            {
                title: "Controles Orbitales ⏸️",
                description: "Usa este panel flotante izquierdo para controlar la simulación: <br><ul>" +
                             "<li><strong>Pausar/Reanudar (⏸):</strong> Detiene el movimiento orbital para leer tus apuntes con tranquilidad.</li>" +
                             "<li><strong>Zoom (➕/➖):</strong> Te acerca y te aleja en el espacio tridimensional.</li>" +
                             "</ul>",
                target: "#btnPlayPause, #btnZoomIn, #btnZoomOut",
                position: "right"
            },
            {
                title: "Centrar la Cámara 🎯",
                description: "Este es el botón de <strong>Centrar Vista</strong>. Si te pierdes en la inmensidad del espacio o te alejas demasiado, haz clic aquí para reenfocar la cámara instantáneamente en el centro del sistema orbital activo.",
                target: "#btnResetView",
                position: "right"
            },
            {
                title: "Subir Nivel Orbital ⬆️",
                description: "Cuando entres en la órbita de un planeta o luna haciendo doble clic sobre él, este botón se activará. Te permite <strong>subir un nivel orbital</strong> y volver al espacio padre en el mapa de ideas.",
                target: "#btnGoParent",
                position: "right"
            },
            {
                title: "Buscador Inteligente Alíen 👽",
                description: "¡Tu asistente extraterrestre! Haz clic en el <strong>Alíen</strong> para abrir el panel de búsqueda inteligente. Puedes escribir o dictar por voz (🎙️) lo que buscas. ¡La nave del alíen volará al planeta que tenga la respuesta!",
                target: "#btnOpenSearch",
                position: "right"
            },
            {
                title: "Estrellas Fugaces (Recordatorios) ⭐",
                description: "El botón de **Estrella** abre tus recordatorios pendientes. Puedes lanzar una nueva estrella desde el botón inferior para apuntar tareas que quieras investigar más tarde. ¡Volarán por la pantalla hasta que las completes!",
                target: "#btnToggleStars",
                position: "right"
            },
            {
                title: "Selector de Sistemas 🌌",
                description: "En la barra superior puedes cambiar entre tus diferentes temas de estudio. También puedes presionar <strong>+ Nuevo Sistema</strong> para iniciar uno nuevo con su propio Sol central, o borrar el actual.",
                target: ".system-selector > *",
                position: "bottom"
            },
            {
                title: "Añadir Ideas a la Órbita ➕",
                description: "Usa este panel inferior para expandir tu mapa de estudio. Te permite añadir nuevos Planetas, Planetoides, Lunas o Satélites alrededor del cuerpo que tengas seleccionado en ese momento.",
                target: "#addActionsContainer",
                position: "top"
            },
            {
                title: "Navegación Interactiva 🚀",
                description: "Por último, explora con total libertad: <br><ul>" +
                             "<li><strong>Arrastrar con el ratón:</strong> Mueve la cámara por el espacio.</li>" +
                             "<li><strong>Rueda del ratón:</strong> Zoom.</li>" +
                             "<li><strong>Clic simple:</strong> Selecciona el objeto y abre el editor lateral derecho para tomar apuntes (con soporte Markdown y fórmulas KaTeX).</li>" +
                             "<li><strong>Doble clic:</strong> Entra en su órbita para crear y ver subniveles.</li>" +
                             "</ul>",
                target: "#spaceCanvas",
                position: "center"
            }
        ];

        // Create the spotlight highlight helper
        const helper = document.createElement("div");
        helper.className = "tutorial-highlight-helper";
        document.body.appendChild(helper);

        // Create the description card
        const card = document.createElement("div");
        card.className = "tutorial-card";
        document.body.appendChild(card);

        // Show the initial step
        showStep(0);

        function showStep(index) {
            currentStep = index;
            const step = tutorialSteps[index];

            // Render Card Content
            card.innerHTML = `
                <h3>🪐 ${step.title}</h3>
                <div>${step.description}</div>
                <div class="tutorial-footer">
                    <span class="tutorial-steps-indicator">Paso ${index + 1} de ${tutorialSteps.length}</span>
                    <div class="tutorial-buttons">
                        <button class="tutorial-btn tutorial-btn-skip">Saltar</button>
                        ${index > 0 ? '<button class="tutorial-btn tutorial-btn-prev">Atrás</button>' : ''}
                        <button class="tutorial-btn tutorial-btn-next">${index === tutorialSteps.length - 1 ? '¡Entendido!' : 'Siguiente'}</button>
                    </div>
                </div>
            `;

            // Attach listeners to buttons
            card.querySelector(".tutorial-btn-skip").addEventListener("click", endTutorial);
            
            const prevBtn = card.querySelector(".tutorial-btn-prev");
            if (prevBtn) {
                prevBtn.addEventListener("click", () => showStep(currentStep - 1));
            }

            const nextBtn = card.querySelector(".tutorial-btn-next");
            nextBtn.addEventListener("click", () => {
                if (currentStep === tutorialSteps.length - 1) {
                    endTutorial();
                } else {
                    showStep(currentStep + 1);
                }
            });

            // Position card and update spotlight helper
            updateLayout();

            // Set up resize listener to update layout dynamically
            if (resizeListener) {
                window.removeEventListener("resize", resizeListener);
            }
            resizeListener = updateLayout;
            window.addEventListener("resize", resizeListener);
        }

        function getCombinedRect(elements) {
            if (!elements || elements.length === 0) return null;
            
            let minTop = Infinity;
            let minLeft = Infinity;
            let maxBottom = -Infinity;
            let maxRight = -Infinity;
            
            elements.forEach(el => {
                const rect = el.getBoundingClientRect();
                if (rect.width === 0 && rect.height === 0) return; // Skip hidden
                
                minTop = Math.min(minTop, rect.top);
                minLeft = Math.min(minLeft, rect.left);
                maxBottom = Math.max(maxBottom, rect.bottom);
                maxRight = Math.max(maxRight, rect.right);
            });
            
            if (minTop === Infinity) return null;
            
            return {
                top: minTop,
                left: minLeft,
                width: maxRight - minLeft,
                height: maxBottom - minTop,
                right: maxRight,
                bottom: maxBottom
            };
        }

        function updateLayout() {
            const step = tutorialSteps[currentStep];
            let targets = [];

            if (step.target) {
                targets = Array.from(document.querySelectorAll(step.target)).filter(el => el.offsetParent !== null);
            }

            if (targets.length > 0) {
                const rect = getCombinedRect(targets);
                
                if (rect) {
                    // Update Spotlight Box Position and size
                    helper.style.top = (rect.top - 4) + "px";
                    helper.style.left = (rect.left - 4) + "px";
                    helper.style.width = (rect.width + 8) + "px";
                    helper.style.height = (rect.height + 8) + "px";
                    
                    let borderRadius = "8px";
                    if (targets.length === 1) {
                        borderRadius = window.getComputedStyle(targets[0]).borderRadius || "8px";
                    } else {
                        // Para grupos de elementos, crear una forma de píldora (stadium) perfecta y estética
                        if (rect.width < rect.height) {
                            borderRadius = `${(rect.width + 8) / 2}px`; // Píldora vertical
                        } else {
                            borderRadius = `${(rect.height + 8) / 2}px`; // Píldora horizontal
                        }
                    }
                    helper.style.borderRadius = borderRadius;
                    helper.style.opacity = "1";

                    // Position card near target element
                    positionCard(rect, step.position);
                    return;
                }
            }
            
            // Center mode or fallback if target is hidden/not found
            helper.style.top = "50%";
            helper.style.left = "50%";
            helper.style.width = "0px";
            helper.style.height = "0px";
            helper.style.borderRadius = "50%";
            helper.style.opacity = "1";

            positionCard(null, "center");
        }

        function positionCard(targetRect, position) {
            const cardRect = card.getBoundingClientRect();
            const cardW = cardRect.width || 380;
            const cardH = cardRect.height || 220;
            
            if (position === "center" || !targetRect) {
                card.style.transform = "translate(-50%, -50%)";
                card.style.left = "50%";
                card.style.top = "50%";
            } else {
                card.style.transform = "none";
                const margin = 20;

                if (position === "right") {
                    let left = targetRect.right + margin;
                    let top = targetRect.top + (targetRect.height - cardH) / 2;

                    // Boundary checks
                    if (left + cardW > window.innerWidth) {
                        left = targetRect.left - cardW - margin; // Swap to left
                    }
                    if (left < 10) left = 10;
                    
                    top = Math.max(10, Math.min(window.innerHeight - cardH - 10, top));

                    card.style.left = left + "px";
                    card.style.top = top + "px";
                } else if (position === "bottom") {
                    let top = targetRect.bottom + margin;
                    let left = targetRect.left + (targetRect.width - cardW) / 2;

                    // Boundary checks
                    if (top + cardH > window.innerHeight) {
                        top = targetRect.top - cardH - margin; // Swap to top
                    }
                    if (top < 10) top = 10;

                    left = Math.max(10, Math.min(window.innerWidth - cardW - 10, left));

                    card.style.left = left + "px";
                    card.style.top = top + "px";
                } else if (position === "top") {
                    let top = targetRect.top - cardH - margin;
                    let left = targetRect.left + (targetRect.width - cardW) / 2;

                    // Boundary checks
                    if (top < 10) {
                        top = targetRect.bottom + margin; // Swap to bottom
                    }
                    if (top + cardH > window.innerHeight) top = window.innerHeight - cardH - 10;

                    left = Math.max(10, Math.min(window.innerWidth - cardW - 10, left));

                    card.style.left = left + "px";
                    card.style.top = top + "px";
                }
            }
        }

        function endTutorial() {
            if (resizeListener) {
                window.removeEventListener("resize", resizeListener);
            }
            
            // Fade out animations
            card.style.opacity = "0";
            card.style.transform = card.style.transform + " scale(0.95)";
            helper.style.opacity = "0";

            setTimeout(() => {
                card.remove();
                helper.remove();
            }, 300);

            // Save flag
            localStorage.setItem(TUTORIAL_KEY, "true");
        }
    }
}
