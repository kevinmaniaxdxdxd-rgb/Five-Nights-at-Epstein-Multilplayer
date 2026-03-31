// =============================================
// FNAE - Controlador de Lobby Multijugador
// =============================================

class MultiplayerLobby {
    constructor(game) {
        this.game = game;
        this.mp = null;
        this.selectedPlayer = null;
        this.lobbyInterval = null;
        this._pendingJoinCode = null;
        this._launching = false;
    }

    // =============================================
    // 1. PANTALLA: Selección Modo (Solo / Multi)
    // =============================================
    showModeSelect() {
        // Ocultar menú principal para que no se vean los personajes detrás
        const mainMenu = document.getElementById('main-menu');
        if (mainMenu) mainMenu.classList.add('hidden');

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
        const mainMenu = document.getElementById('main-menu');
        if (mainMenu) mainMenu.classList.add('hidden');

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
                <div class="mp-code-display" id="mp-room-code">· · · · · ·</div>
                <div class="mp-code-hint" id="mp-code-subhint">Selecciona JUGADOR 1 para crear sala</div>
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

        this.mp = new MultiplayerSystem(this.game);

        document.getElementById('mp-p1-btn').addEventListener('click', () => this.selectPlayer(1));
        document.getElementById('mp-p2-btn').addEventListener('click', () => this.selectPlayer(2));
        document.getElementById('mp-start-game-btn').addEventListener('click', () => this.tryStart());
        document.getElementById('mp-join-btn').addEventListener('click', () => this.joinWithCode());
        document.getElementById('mp-join-code').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.joinWithCode();
        });
        document.getElementById('mp-back-btn').addEventListener('click', () => {
            this.cleanup();
            const mainMenu = document.getElementById('main-menu');
            if (mainMenu) mainMenu.classList.remove('hidden');
        });
    }

    // =============================================
    // Seleccionar jugador (1 o 2)
    // =============================================
    selectPlayer(num) {
        // Si ya soy ese jugador, permitir cambiar nombre
        if (this.selectedPlayer === num) {
            this.showNameModal(num);
            return;
        }

        // Si ya elegí otro jugador, bloquear
        if (this.selectedPlayer !== null && this.selectedPlayer !== num) {
            MultiplayerUI.showTempMessage('YA ERES JUGADOR ' + this.selectedPlayer, 2000);
            return;
        }

        // Verificar si el otro jugador ya tomó ese slot
        const data = this.mp.sharedState;
        const key = `player${num}`;
        if (data[key] && data[key].name) {
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
                   placeholder="MÍN. 2 · MÁX. 12" maxlength="12" autocomplete="off">
            <div id="mp-name-error" style="color:#f00;font-size:1vw;margin-bottom:1vh;min-height:1.8vh;letter-spacing:2px;font-family:'Courier New',monospace;text-align:center;"></div>
            <button class="mp-action-btn mp-green" id="mp-confirm-name">CONFIRMAR</button>
            <button class="mp-back-btn" id="mp-cancel-name" style="margin-top:1vh;">CANCELAR</button>
        `;
        document.body.appendChild(modal);

        const input = document.getElementById('mp-name-input-field');
        input.focus();

        // Solo letras y números
        input.addEventListener('input', () => {
            input.value = input.value.replace(/[^a-zA-Z0-9 áéíóúÁÉÍÓÚñÑ]/g, '');
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.confirmName(playerNum);
        });

        document.getElementById('mp-confirm-name').addEventListener('click', () => {
            this.confirmName(playerNum);
        });

        document.getElementById('mp-cancel-name').addEventListener('click', () => {
            modal.remove();
            if (!this.mp.playerName) {
                this.selectedPlayer = null;
            }
        });
    }

    // =============================================
    // Confirmar nombre
    // =============================================
    async confirmName(playerNum) {
        const input = document.getElementById('mp-name-input-field');
        const errorEl = document.getElementById('mp-name-error');
        const name = input ? input.value.trim().toUpperCase() : '';

        // Validar mínimo 2 caracteres
        if (!name || name.length < 2) {
            if (input) input.style.borderBottomColor = '#f00';
            if (errorEl) errorEl.textContent = 'MÍNIMO 2 CARACTERES';
            return;
        }

        document.getElementById('mp-name-modal')?.remove();

        const status = document.getElementById('mp-lobby-status');

        if (playerNum === 1 && !this.mp.isConnected) {
            // Jugador 1 = Host, crea la sala
            if (status) { status.textContent = 'CREANDO SALA...'; status.className = 'mp-status'; }

            const result = await this.mp.createRoom(name);

            if (result.success) {
                const codeEl = document.getElementById('mp-room-code');
                if (codeEl) codeEl.textContent = result.roomCode;

                const hintEl = document.getElementById('mp-code-subhint');
                if (hintEl) hintEl.textContent = 'Comparte este código con tu amigo';

                this.updatePlayerButtons();
                if (status) { status.textContent = 'SALA LISTA · ESPERANDO JUGADOR 2'; status.className = 'mp-status mp-ok'; }
                this.startLobbyPolling();
            } else {
                if (status) { status.textContent = `ERROR: ${result.error}`; status.className = 'mp-status mp-err'; }
                this.selectedPlayer = null;
            }

        } else if (playerNum === 2 && this.mp.isConnected) {
            // Ya está en sala, solo actualiza nombre
            await this.mp.roomRef.child('player2').update({ name: name });
            this.mp.playerName = name;
            this.updatePlayerButtons();

        } else if (this._pendingJoinCode) {
            // Tenía código pendiente, unirse ahora
            this.mp.playerName = name;
            this.mp.playerNumber = playerNum;
            const code = this._pendingJoinCode;
            this._pendingJoinCode = null;
            await this._doJoin(code);

        } else {
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
            MultiplayerUI.showTempMessage('CÓDIGO INVÁLIDO · 6 CARACTERES', 2000);
            return;
        }

        // Ya está en esa sala
        if (this.mp.roomCode === code) {
            MultiplayerUI.showTempMessage('YA ESTÁS EN ESTA SALA', 2000);
            return;
        }

        // Ya conectado a otra sala
        if (this.mp.isConnected) {
            MultiplayerUI.showTempMessage('YA ESTÁS EN UNA SALA', 2000);
            return;
        }

        if (!this.selectedPlayer) this.selectedPlayer = 2;

        if (!this.mp.playerName) {
            this._pendingJoinCode = code;
            this.showNameModal(2);
            return;
        }

        await this._doJoin(code);
    }

    async _doJoin(code) {
        const status = document.getElementById('mp-lobby-status');
        if (status) { status.textContent = 'UNIÉNDOSE A LA SALA...'; status.className = 'mp-status'; }

        const name = this.mp.playerName || 'JUGADOR2';
        const result = await this.mp.joinRoom(code, name);

        if (result.success) {
            const codeEl = document.getElementById('mp-room-code');
            if (codeEl) codeEl.textContent = result.roomCode;

            const hintEl = document.getElementById('mp-code-subhint');
            if (hintEl) hintEl.textContent = 'Conectado a sala de tu amigo';

            this.updatePlayerButtons();
            if (status) { status.textContent = `CONECTADO · SALA ${result.roomCode}`; status.className = 'mp-status mp-ok'; }
            this.startLobbyPolling();
        } else {
            if (status) { status.textContent = `ERROR: ${result.error}`; status.className = 'mp-status mp-err'; }
        }
    }

    // =============================================
    // Actualizar botones de jugadores
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

            if (num === myNum) {
                btn.classList.add('mp-mine'); // Verde — soy yo
                btn.title = 'Clic para cambiar tu nombre';
            } else if (pName) {
                btn.classList.add('mp-taken'); // Bloqueado — ya tomado
                btn.title = 'Jugador ya registrado';
            }
        });

        // Habilitar Empezar si ambos tienen nombre
        const p1Name = data.player1 ? data.player1.name : '';
        const p2Name = data.player2 ? data.player2.name : '';
        const startBtn = document.getElementById('mp-start-game-btn');

        if (startBtn) {
            if (p1Name && p2Name) {
                startBtn.classList.remove('mp-disabled');
            } else {
                startBtn.classList.add('mp-disabled');
            }
        }
    }

    // =============================================
    // Polling de sala
    // =============================================
    startLobbyPolling() {
        if (this.lobbyInterval) return;
        this.lobbyInterval = setInterval(() => {
            this.updatePlayerButtons();
            if (this.mp.sharedState.status === 'playing') {
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

        if (!p1.name && !p2.name) {
            MultiplayerUI.showTempMessage('CÁMBIATE EL NOMBRE', 2500);
            return;
        }
        if (!p1.name || !p2.name) {
            MultiplayerUI.showTempMessage('FALTA 1 JUGADOR', 2500);
            return;
        }

        if (this.mp.isHost) this.mp.startGame();
        this.launchGame();
    }

    // =============================================
    // Lanzar el juego
    // =============================================
    launchGame() {
        if (this._launching) return;
        this._launching = true;

        clearInterval(this.lobbyInterval);
        this.lobbyInterval = null;

        document.getElementById('mp-lobby')?.remove();

        this.showPlayerBadge();
        this.game.mp = this.mp;
        this.game.mpLobby = this;
        this.patchSoundSystem();
        this.game._startSolo();
    }

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

    patchSoundSystem() {
        if (!this.game.camera || !this.mp) return;
        const camera = this.game.camera;
        const mp = this.mp;

        const origPlayAmbient = camera.playAmbientSound.bind(camera);
        camera.playAmbientSound = async function() {
            const allowed = await mp.useSoundCharge();
            if (!allowed) {
                camera.soundButtonUseCount = camera.maxSoundUses;
                origPlayAmbient();
                return;
            }
            origPlayAmbient();
        };

        const origReset = camera.resetSoundButtonCount.bind(camera);
        camera.resetSoundButtonCount = function() {
            origReset();
            mp.resetSoundCharges();
        };
    }

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

    cleanup() {
        clearInterval(this.lobbyInterval);
        this.lobbyInterval = null;
        this._launching = false;
        this.selectedPlayer = null;
        this._pendingJoinCode = null;

        if (this.mp) {
            this.mp.disconnect();
            this.mp = null;
        }

        document.getElementById('mp-lobby')?.remove();
        document.getElementById('mode-select-overlay')?.remove();
        document.getElementById('mp-player-badge')?.remove();
        document.getElementById('mp-other-cam-indicator')?.remove();
        document.getElementById('mp-name-modal')?.remove();
    }
}
