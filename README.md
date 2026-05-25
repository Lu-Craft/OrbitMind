# OrbitMind 🌌 - Sistema Solar de Ideas

**OrbitMind** es una aplicación web interactiva y progresiva (PWA) de mapas mentales y productividad diseñada para estudiantes. Permite organizar conceptos y temas de estudio en un espacio tridimensional estructurado como un **sistema solar interactivo**.

El proyecto utiliza una estética visual moderna y futurista basada en *Dark Glassmorphism* (efectos de cristal esmerilado sobre fondos espaciales), microanimaciones fluidas y tipografías de ciencia ficción.

---

## 🚀 Características Principales

### 🌌 Visualización Orbital Interactiva
*   **Estructura Jerárquica Celeste:**
    *   **Sol:** El tema central de tu materia (ej: Termodinámica, Psicología Social, Historia del Arte).
    *   **Planetas:** Grandes bloques o categorías de estudio.
    *   **Planetoides:** Subcategorías secundarias.
    *   **Lunas:** Notas detalladas o conceptos específicos.
    *   **Satélites:** Apuntes cortos, datos rápidos o fórmulas aisladas.
*   **Navegación Intuitiva:** Haz clic en los cuerpos celestes para seleccionarlos, rotar la cámara a su alrededor, hacer zoom o profundizar en su órbita con controles de velocidad y pausa.

### 📝 Editor Científico Enriquecido (Markdown & KaTeX)
*   Soporte para formatear apuntes con **Markdown** (títulos, listas, tablas, negritas).
*   Renderizado en tiempo real de fórmulas matemáticas y físicas complejas mediante **KaTeX** (ej. integrales, fracciones, derivadas parciales, termodinámica).
*   **Teclado Matemático Integrado:** Panel en pantalla con accesos directos para escribir símbolos de Cálculo, Termodinámica, Operadores y estilos.

### 📖 Modo de Estudio Inmersivo
*   **Temporizador Pomodoro:** Mantén el foco con un widget integrado de 25 minutos (configurable para pausas).
*   **Active Recall (Recuperación Activa):** Oculta respuestas en tus notas (usando preguntas `Q:` y respuestas `A:`) para poner a prueba tu memoria antes de revelarlas.
*   **Lectura por Voz (TTS):** Escucha tus apuntes de estudio leídos en voz alta mediante el sintetizador de voz integrado.

### 👽 Buscador Alienígena Inteligente
*   Un buscador temático personalizado con interfaz holográfica y animación de escaneo/radar en tiempo real. Escribe cualquier concepto o fórmula y el guía espacial rastreará su presencia en todo el sistema solar activo.

### ⭐ Estrellas Fugaces (Recordatorios)
*   Lanza estrellas fugaces que vuelan por el espacio para registrar temas pendientes de estudio. Puedes consultarlas en el panel lateral y "estudiarlas" para disolverlas de tu pantalla de órbita.

### 🎙️ Dictado por Voz Integrado
*   Utiliza el reconocimiento de voz para buscar conceptos, definir títulos o dictar tus apuntes de estudio sin necesidad de usar el teclado.

---

## 🛠️ Tecnologías Utilizadas

*   **Core:** HTML5 semántico y CSS3 personalizado (Variables CSS, animaciones clave, filtros *backdrop-filter*).
*   **3D Canvas Engine:** [Three.js](https://threejs.org/) para el renderizado tridimensional interactivo de los planetas, órbitas y texturas.
*   **Math Rendering:** [KaTeX](https://katex.org/) para compilar fórmulas científicas a alta velocidad.
*   **Web Speech API:** Speech Recognition (dictado por voz) y Speech Synthesis (lector de apuntes).
*   **PWA & Service Worker:** Cacheo de recursos estáticos para permitir la carga y funcionamiento offline.
*   **Persistencia Local:** `IndexedDB` y `LocalStorage` para guardar de forma segura tus sistemas solares creados en el propio navegador.

---

## 📂 Estructura del Código

```bash
├── index.html            # Interfaz de usuario (HUD del sistema y área de estudio)
├── style.css             # Estilos de glassmorphism, HUD holográfico y animaciones
├── sw.js                 # Service Worker para almacenamiento en caché local (offline)
├── manifest.json         # Configuración del PWA (instalación en escritorio y móvil)
├── three.min.js          # Biblioteca local de Three.js para renderizado 3D
├── serve.ps1             # Servidor web ligero nativo escrito en PowerShell
├── run_server.bat        # Archivo ejecutable de acceso rápido para arrancar en Windows
└── js/
    ├── main.js           # Inicializador de la app, gestión de eventos del DOM y flujos
    ├── spaceEngine.js    # Motor gráfico e interactivo de órbitas y partículas
    ├── planetRenderer3D.js # Configuración de mallas, materiales y render de Three.js
    ├── db.js             # Gestor de base de datos local (IndexedDB)
    ├── defaultSystems.js # Datos por defecto (Termodinámica, Psicología, Historia del Arte)
    ├── markdownParser.js # Parser personalizado para convertir Markdown a HTML
    ├── shootingStar.js   # Controlador de animaciones y lógica de estrellas fugaces
    ├── voiceDictation.js # Controlador para reconocimiento de voz
    ├── sync.js           # Gestor de exportación/importación de JSON
    ├── tutorial.js       # Secuencia interactiva de ayuda guiada para el usuario
    └── utils.js          # Funciones auxiliares comunes
