// Voice Dictation module utilizing Web Speech API for OrbiMind notes

export class VoiceDictation {
    constructor() {
        this.recognition = null;
        this.isRecording = false;
        this.activeTarget = null;   // el input/textarea destino
        this.activeButton = null;   // el btn-voice activo
        this.statusBar = document.getElementById('voiceStatusBar');
        this.interimEl = document.getElementById('voiceInterimText');
        this.stopBtn = document.getElementById('voiceStopBtn');
        this.isSupported = false;
        this._init();
    }

    _init() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn('[VoiceDictation] Web Speech API no soportada en este navegador.');
            // Marcar todos los botones como no soportados
            document.querySelectorAll('.btn-voice').forEach(btn => {
                btn.classList.add('not-supported');
                btn.title = 'Dictado por voz no soportado en este navegador';
            });
            return;
        }

        this.isSupported = true;
        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'es-ES';       // español por defecto
        this.recognition.continuous = true;    // no para solo después de un silencio
        this.recognition.interimResults = true; // resultados parciales en tiempo real
        this.recognition.maxAlternatives = 1;

        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            // Mostrar texto provisional en la barra de estado
            if (this.interimEl) {
                this.interimEl.textContent = interimTranscript || finalTranscript || 'Escuchando...';
            }

            // Insertar texto final en el campo destino
            if (finalTranscript && this.activeTarget) {
                this._insertText(this.activeTarget, finalTranscript);
            }
        };

        this.recognition.onerror = (event) => {
            console.error('[VoiceDictation] Error:', event.error);
            let msg = 'Error de micrófono';
            if (event.error === 'not-allowed') msg = 'Permiso de micrófono denegado';
            else if (event.error === 'no-speech') msg = 'No se detectó voz';
            else if (event.error === 'audio-capture') msg = 'Micrófono no encontrado';
            else if (event.error === 'network') msg = 'Error de red en reconocimiento';
            this._showToastGlobal(msg, 'error');
            this.stop();
        };

        this.recognition.onend = () => {
            // Si se detuvo inesperadamente y aún queremos grabar, reiniciar
            if (this.isRecording) {
                try { this.recognition.start(); } catch(e) { this.stop(); }
            }
        };

        // Botón Detener en la barra flotante
        if (this.stopBtn) {
            this.stopBtn.addEventListener('click', () => this.stop());
        }

        // Enlazar todos los botones de voz
        document.querySelectorAll('.btn-voice').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const targetId = btn.dataset.target;
                if (!targetId) return;
                const targetEl = document.getElementById(targetId);
                if (!targetEl) return;

                if (this.isRecording && this.activeButton === btn) {
                    // Detener si ya está grabando en este campo
                    this.stop();
                } else {
                    // Iniciar grabación para este campo
                    this.start(targetEl, btn);
                }
            });
        });
    }

    start(targetEl, btn) {
        if (!this.isSupported) return;

        // Detener grabación previa si hay
        if (this.isRecording) this.stop();

        this.activeTarget = targetEl;
        this.activeButton = btn;
        this.isRecording = true;

        // Estilos de grabación en el botón
        btn.classList.add('recording');
        btn.querySelector('.mic-icon').textContent = '🔴';

        // Mostrar barra de estado flotante
        if (this.statusBar) this.statusBar.classList.remove('hidden');
        if (this.interimEl) this.interimEl.textContent = 'Di algo para empezar...';

        // Poner foco en el campo
        targetEl.focus();

        try {
            this.recognition.start();
        } catch(e) {
            // Ya estaba iniciado, ignorar
        }
    }

    stop() {
        this.isRecording = false;

        try { this.recognition.stop(); } catch(e) {}

        // Restaurar botón activo
        if (this.activeButton) {
            this.activeButton.classList.remove('recording');
            const icon = this.activeButton.querySelector('.mic-icon');
            if (icon) icon.textContent = '🎙️';
            this.activeButton = null;
        }

        // Ocultar barra de estado
        if (this.statusBar) this.statusBar.classList.add('hidden');
        if (this.interimEl) this.interimEl.textContent = '';
        this.activeTarget = null;
    }

    // Inserta texto en el campo destino respetando la posición del cursor
    _insertText(el, text) {
        const trimmed = text.trim();
        if (!trimmed) return;

        if (el.tagName === 'TEXTAREA') {
            // Para textarea: insertar en la posición del cursor, o al final
            const start = el.selectionStart;
            const end = el.selectionEnd;
            const current = el.value;
            const before = current.substring(0, start);
            const after = current.substring(end);
            const separator = (before.length > 0 && !before.endsWith(' ') && !before.endsWith('\n')) ? ' ' : '';
            el.value = before + separator + trimmed + ' ' + after;
            const newPos = start + separator.length + trimmed.length + 1;
            el.setSelectionRange(newPos, newPos);
        } else {
            // Para input: reemplazar todo el contenido con el texto dictado
            el.value = trimmed;
            el.setSelectionRange(el.value.length, el.value.length);
        }

        // Disparar evento 'input' para que cualquier listener reactivo se entere
        el.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Mostrar toast sin depender del contexto del controlador
    _showToastGlobal(message, type = 'error') {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('fade-out');
            toast.addEventListener('animationend', () => toast.remove());
        }, 3500);
    }
}
