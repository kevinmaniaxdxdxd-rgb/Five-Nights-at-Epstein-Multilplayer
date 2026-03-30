// =============================================
// FNAE - Controlador de Lobby Multijugador
// Integrado con Game.js
// =============================================

class MultiplayerLobby {
    constructor(game) {
        this.game = game;
        this.mp = null; // MultiplayerSystem instance
        this.selectedPlayer = null; // 1 o 2
        this.lobbyInterval = null; // polling Firebase

        // Inyectar estilos del lobby si no están
        this.injectStyles();
    }

    injectStyles() {
        if (document.getElementById('mp-styles')) return;
        // Los estilos vienen de multiplayer_style_addon.css (agregar al index.html)
    }

    // =============================================
    // 1. PANTALLA: Selección Modo (Solo / Multi)
    // =============================================
    showModeSelect() {
        const overlay = document.createElement('div');
        overlay.id = 'mode-select-overlay';
        overlay.innerHTML = `
            <h2>¿CÓMO QUIERES JUGAR?</h2>
            <button class="mode-btn" id="btn-solo">JUGAR SOLO</button>
            <button class="mode-btn" id="btn-multi">MULTIJUGADOR</button>
        `;
        document.body.appendChild(overlay);

        document.getElementById('btn-solo').addEventListener('click', () => {
            overlay.remove();
            this.game._startSolo();
        });

        document.getElementById('btn-multi').addEventListener('click', () => {
            overlay.remove();
            this.showMultiplayerLobby();
        });
    }

    // =============================================
    // 2. PANTALLA: Lobby multijugador
    // =============================================
    showMultiplayerLobby() {
        const lobby = document.createElement('div');
        lobby.id = 'mp-lobby';
        lobby.innerHTML = `
            <h1>MULTIJUGADOR</h1>

            <div class="mp-section">
                <div class="mp-label">JUGADOR 1</div>
                <button class="mp-player-btn" id="mp-p1-btn">
                    <div>JUGADOR 1</div>
                    <div class="mp-player-name" id="mp-p1-name">— sin nombre —</div>
                </button>
            </div>

            <div class="mp-section">
                <div class="mp-label">JUGADOR 2</div>
                <button class="mp-player-btn" id="mp-p2-btn">
                    <div>JUGADOR 2</div>
                    <div class="mp-player-name" id="mp-p2-name">— sin nombre —</div>
                </button>
            </div>

            <div class="mp-divider"></div>

            <div class="mp-section" style="flex-direction: column; gap: 0.8vh;">
                <div class="mp-code-hint">CÓDIGO DE TU SALA</div>
                <div class="mp-code-display" id="mp-room-code">——————</div>
                <div class="mp-code-hint">Comparte este código con tu amigo</div>
            </div>

            <div class="mp-divider"></div>

            <div class="mp-section" style="flex-direction: column; gap: 1vh; align-items: flex-start;">
                <button class="mp-action-btn mp-green mp-disabled" id="mp-start-game-btn">EMPEZAR PARTIDA</button>
                <div style="display: flex; align-items: center; gap: 1vw;">
                    <input class="mp-code-input" id="mp-join-code" placeholder="CÓDIGO" maxlength="6">
                    <button class="mp-action-btn" id="mp-join-btn" style="width: auto; min-width: 120px; margin: 0;">UNIRSE</button>
                </div>
            </div>

            <div class="mp-status" id="mp-lobby-status">Selecciona tu jugador para comenzar</div>

            <button class="mp-back-btn" id="mp-back-btn">← VOLVER AL MENÚ</button>
        `;
        document.body.appendChild(lobby);

        // Inicializar sistema multijugador
        this.mp = new MultiplayerSystem(this.game);

        // Eventos botones jugador
        document.getElementById('mp-p1-btn').addEventListener('click', () => this.selectPlayer(1));
        document.getElementById('mp-p2-btn').addEventListener('click', () => this.selectPlayer(2));

        // Empezar partida
        document.getElementById('mp-start-game-btn').addEventListener('click', () => this.tryStart());

        // Unirse con código
        document.getElementById('mp-join-btn').addEventListener('click', () => this.joinWithCode());

        // Volver
        document.getElementById('mp-back-btn').addEventListener('click', () => {
            this.cleanup();
            this.game.showMainMenu();
        });
    }

    // =============================================
    // Seleccionar jugador (1 o 2)
    // =============================================
    selectPlayer(num) {
        // Si ya hay alguien en ese slot, no permitir
        const otherNum = num === 1 ? 2 : 1;

        // Si ya elegiste ese slot
        if (this.selectedPlayer === num) {
            this.showNameModal(num);
            return;
        }

        // Si el otro jugador ya tomó ese slot
        const data = this.mp.sharedState;
        const key = `player${num}`;
        if (data[key] && data[key].name && this.selectedPlayer !== num) {
            MultiplayerUI.showTempMessage('ESE JUGADOR YA ESTÁ TOMADO', 2000);
            return;
        }

        this.selectedPlayer = num;
        this.showNameModal(num);
    }

    // =============================================
    // Modal para poner nombre
    // =============================================
    showNameModal(playerNum) {
        const existing = document.getElementById('mp-name-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'mp-name-modal';
        modal.innerHTML = `
            <h3>INGRESA TU NOMBRE · JUGADOR ${playerNum}</h3>
            <input class="mp-name-input" id="mp-name-input-field" 
                   placeholder="TU NOMBRE" maxlength="12" autocomplete="off">
            <button class="mp-action-btn mp-green" id="mp-confirm-name">CONFIRMAR</button>
            <button class="mp-back-btn" id="mp-cancel-name" style="margin-top: 1vh;">CANCELAR</button>
        `;
        document.body.appendChild(modal);

        const input = document.getElementById('mp-name-input-field');
        input.focus();

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.confirmName(playerNum);
        });

        document.getElementById('mp-confirm-name').addEventListener('click', () => {
            this.confirmName(playerNum);
        });

        document.getElementById('mp-cancel-name').addEventListener('click', () => {
            modal.remove();
            this.selectedPlayer = null;
        });
    }

    // =============================================
    // Confirmar nombre y crear/actualizar sala
    // =============================================
    async confirmName(playerNum) {
        const input = document.getElementById('mp-name-input-field');
        const name = input ? input.value.trim().toUpperCase() : '';

        if (!name || name.length < 1) {
            input.style.borderBottomColor = '#f00';
            input.placeholder = 'ESCRIBE TU NOMBRE';
            return;
        }

        document.getElementById('mp-name-modal')?.remove();

        const status = document.getElementById('mp-lobby-status');

        if (playerNum === 1 && !this.mp.isConnected) {
            // Jugador 1 = Host, crea la sala
            status.textContent = 'CREANDO SALA...';
            status.className = 'mp-status';

            const result = await this.mp.createRoom(name);

            if (result.success) {
                document.getElementById('mp-room-code').textContent = result.roomCode;
                this.updatePlayerButtons();
                status.textContent = `SALA LISTA · ESPERANDO JUGADOR 2`;
                status.className = 'mp-status mp-ok';

                // Escuchar actualizaciones de la sala
                this.startLobbyPolling();
            } else {
                status.textContent = `ERROR: ${result.error}`;
                status.className = 'mp-status mp-err';
                this.selectedPlayer = null;
            }

        } else if (playerNum === 2 && this.mp.isConnected) {
            // Jugador 2 en sala ya creada, actualizar nombre
            await this.mp.roomRef.child('player2').update({ name: name });
            this.mp.playerName = name;
            this.updatePlayerButtons();

        } else {
            // Caso: Jugador 2 entra por código
            // (manejado en joinWithCode)
            this.mp.playerName = name;
            this.mp.playerNumber = playerNum;
            this.updatePlayerButtons();
        }
    }

    // =============================================
    // Unirse con código
    // =============================================
    async joinWithCode() {
        const codeInput = document.getElementById('mp-join-code');
        const code = codeInput ? codeInput.value.trim().toUpperCase() : '';

        if (!code || code.length !== 6) {
            MultiplayerUI.showTempMessage('CÓDIGO INVÁLIDO', 2000);
            return;
        }

        if (!this.selectedPlayer) {
            // Forzar seleccionar jugador 2 al unirse
            this.selectedPlayer = 2;
        }

        // Pedir nombre si no tiene
        if (!this.mp.playerName) {
            this.showNameModal(2);
            // Guardar código para después del nombre
            this._pendingJoinCode = code;
            return;
        }

        await this._doJoin(code);
    }

    async _doJoin(code) {
        const status = document.getElementById('mp-lobby-status');
        status.textContent = 'UNIÉNDOSE A LA SALA...';
        status.className = 'mp-status';

        const name = this.mp.playerName || 'JUGADOR2';
        const result = await this.mp.joinRoom(code, name);

        if (result.success) {
            document.getElementById('mp-room-code').textContent = result.roomCode;
            this.updatePlayerButtons();
            status.textContent = `CONECTADO · SALA ${result.roomCode}`;
            status.className = 'mp-status mp-ok';
            this.startLobbyPolling();
        } else {
            status.textContent = `ERROR: ${result.error}`;
            status.className = 'mp-status mp-err';
        }
    }

    // =============================================
    // Actualizar botones de jugadores en lobby
    // =============================================
    updatePlayerButtons() {
        const data = this.mp.sharedState;
        const myNum = this.mp.playerNumber;

        [1, 2].forEach(num => {
            const btn = document.getElementById(`mp-p${num}-btn`);
            const nameEl = document.getElementById(`mp-p${num}-name`);
            if (!btn || !nameEl) return;

            const key = `player${num}`;
            const playerData = data[key];
            const pName = playerData ? playerData.name : '';

            nameEl.textContent = pName || '— sin nombre —';

            btn.className = 'mp-player-btn';
            if (num === myNum) btn.classList.add('mp-mine');
            else if (pName) btn.classList.add('mp-taken');
        });

        // Habilitar "Empezar" si ambos tienen nombre
        const p1Name = data.player1 ? data.player1.name : '';
        const p2Name = data.player2 ? data.player2.name : '';
        const startBtn = document.getElementById('mp-start-game-btn');

        if (startBtn) {
            if (p1Name && p2Name) {
                startBtn.classList.remove('mp-disabled');
                startBtn.classList.add('mp-green');
            } else {
                startBtn.classList.add('mp-disabled');
            }
        }
    }

    // =============================================
    // Polling de sala (actualiza lobby UI)
    // =============================================
    startLobbyPolling() {
        if (this.lobbyInterval) return;
        this.lobbyInterval = setInterval(() => {
            const data = this.mp.sharedState;
            this.updatePlayerButtons();

            // Si el host inició la partida
            if (data.status === 'playing') {
                this.launchGame();
            }
        }, 500);
    }

    // =============================================
    // Intentar iniciar partida
    // =============================================
    tryStart() {
        const data = this.mp.sharedState;
        const p1 = data.player1 || {};
        const p2 = data.player2 || {};

        if (!p1.name || !p2.name) {
            if (!p1.name && !p2.name) {
                MultiplayerUI.showTempMessage('CAMBIATE EL NOMBRE', 2500);
            } else {
                MultiplayerUI.showTempMessage('FALTA 1 JUGADOR', 2500);
            }
            return;
        }

        // Todo listo, iniciar
        if (this.mp.isHost) {
            this.mp.startGame();
        }
        this.launchGame();
    }

    // =============================================
    // Lanzar el juego real
    // =============================================
    launchGame() {
        clearInterval(this.lobbyInterval);
        this.lobbyInterval = null;

        const lobby = document.getElementById('mp-lobby');
        if (lobby) lobby.remove();

        // Mostrar badge de jugador
        this.showPlayerBadge();

        // Guardar referencia al sistema MP en el juego
        this.game.mp = this.mp;
        this.game.mpLobby = this;

        // Parchear sistema de sonido compartido
        this.patchSoundSystem();

        // Iniciar juego normal
        this.game._startSolo();
    }

    // =============================================
    // Badge en pantalla durante el juego
    // =============================================
    showPlayerBadge() {
        let badge = document.getElementById('mp-player-badge');
        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'mp-player-badge';
            document.body.appendChild(badge);
        }
        const name = this.mp.playerName || `JUGADOR ${this.mp.playerNumber}`;
        badge.textContent = `● ${name} · P${this.mp.playerNumber} · SALA ${this.mp.roomCode}`;
        badge.style.display = 'block';
    }

    // =============================================
    // Parchar sistema de sonido compartido
    // =============================================
    patchSoundSystem() {
        if (!this.game.camera || !this.mp) return;
        const camera = this.game.camera;
        const mp = this.mp;

        // Guardar función original
        const origPlayAmbient = camera.playAmbientSound.bind(camera);

        // Reemplazar con versión que verifica Firebase
        camera.playAmbientSound = async function() {
            // Verificar carga disponible en Firebase
            const allowed = await mp.useSoundCharge();
            if (!allowed) {
                // Sin cargas — disparar fallo de cámara igual que original
                camera.soundButtonUseCount = camera.maxSoundUses;
                origPlayAmbient();
                return;
            }
            origPlayAmbient();
        };

        // Parchar resetSoundButtonCount para que también resetee Firebase
        const origReset = camera.resetSoundButtonCount.bind(camera);
        camera.resetSoundButtonCount = function() {
            origReset();
            mp.resetSoundCharges();
        };
    }

    // =============================================
    // Parchar sistema de cámara para sincronizar
    // =============================================
    patchCameraSystem() {
        if (!this.game.camera || !this.mp) return;
        const camera = this.game.camera;
        const mp = this.mp;

        const origSwitch = camera.switchCamera.bind(camera);
        camera.switchCamera = function(camNum) {
            origSwitch(camNum);
            mp.updateCamera(`cam${camNum}`);
        };

        const origOpen = camera.open.bind(camera);
        camera.open = function() {
            origOpen();
            mp.updateCamera(camera.game.state.currentCam);
        };

        const origClose = camera.close.bind(camera);
        camera.close = function() {
            origClose();
            mp.updateCamera(null);
        };
    }

    // =============================================
    // Limpiar al salir
    // =============================================
    cleanup() {
        clearInterval(this.lobbyInterval);
        this.lobbyInterval = null;

        if (this.mp) {
            this.mp.disconnect();
            this.mp = null;
        }

        document.getElementById('mp-lobby')?.remove();
        document.getElementById('mode-select-overlay')?.remove();
        document.getElementById('mp-player-badge')?.remove();
        document.getElementById('mp-other-cam-indicator')?.remove();
    }
}MultiplayerLobby.js
