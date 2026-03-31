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

    showModeSelect() {
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

    showMultiplayerLobby() {
        const mainMenu = document.getElementById('main-menu');
        if (mainMenu) mainMenu.classList.add('hidden');

        // Destruir lobby anterior si existe
        document.getElementById('mp-lobby')?.remove();

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

            <div class="mp-section" style="flex-direction:column;gap:0.8vh;">
                <div class="mp-code-hint">CÓDIGO DE TU SALA</div>
                <div class="mp-code-display" id="mp-room-code">— — — — — —</div>
                <div class="mp-code-hint" id="mp-code-subhint">Selecciona JUGADOR 1 para generar código</div>
            </div>

            <div class="mp-divider"></div>

            <div class="mp-section" style="flex-direction:column;gap:1vh;align-items:flex-start;">
                <button class="mp-action-btn mp-green mp-disabled" id="mp-start-game-btn">EMPEZAR PARTIDA</button>
                <div style="display:flex;align-items:center;gap:1vw;">
                    <input class="mp-code-input" id="mp-join-code" placeholder="CÓDIGO AMIGO" maxlength="6">
                    <button class="mp-action-btn" id="mp-join-btn" style="width:auto;min-width:120px;margin:0;">UNIRSE</button>
                </div>
            </div>

            <div class="mp-status" id="mp-lobby-status">Selecciona tu jugador para comenzar</div>
            <button class="mp-back-btn" id="mp-back-btn">← VOLVER AL MENÚ</button>
        `;
        document.body.appendChild(lobby);

        // Resetear estado
        this.selectedPlayer = null;
        this._launching = false;
        this.mp = new MultiplayerSystem(this.game);

        document.getElementById('mp-p1-btn').addEventListener('click', () => this.selectPlayer(1));
        document.getElementById('mp-p2-btn').addEventListener('click', () => this.selectPlayer(2));
        document.getElementById('mp-start-game-btn').addEventListener('click', () => this.tryStart());
        document.getElementById('mp-join-btn').addEventListener('click', () => this.joinWithCode());
        document.getElementById('mp-join-code').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.joinWithCode();
        });

        // Solo letras y números en el input de código
        document.getElementById('mp-join-code').addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        });

        document.getElementById('mp-back-btn').addEventListener('click', () => {
            this.cleanup();
            const mainMenu = document.getElementById('main-menu');
            if (mainMenu) mainMenu.classList.remove('hidden');
        });
    }

    selectPlayer(num) {
        // Ya soy ese jugador → cambiar nombre
        if (this.selectedPlayer === num) {
            this.showNameModal(num);
            return;
        }

        // Ya elegí otro jugador
        if (this.selectedPlayer !== null) {
            MultiplayerUI.showTempMessage('YA ERES JUGADOR ' + this.selectedPlayer, 2000);
            return;
        }

        // Slot ya tomado por otro
        const data = this.mp.sharedState;
        if (data[`player${num}`] && data[`player${num}`].name) {
            MultiplayerUI.showTempMessage('ESE JUGADOR YA ESTÁ TOMADO', 2000);
            return;
        }

        this.selectedPlayer = num;
        this.showNameModal(num);
    }

    showNameModal(playerNum) {
        document.getElementById('mp-name-modal')?.remove();

        const modal = document.createElement('div');
        modal.id = 'mp-name-modal';
        modal.innerHTML = `
            <h3>INGRESA TU NOMBRE · JUGADOR ${playerNum}</h3>
            <input class="mp-name-input" id="mp-name-input-field"
                   placeholder="MÍN 2 · MÁX 12" maxlength="12" autocomplete="off">
            <div id="mp-name-error" style="color:#f00;font-size:1vw;min-height:1.8vh;letter-spacing:2px;
                 font-family:'Courier New',monospace;text-align:center;margin-bottom:1vh;"></div>
            <button class="mp-action-btn mp-green" id="mp-confirm-name">CONFIRMAR</button>
            <button class="mp-back-btn" id="mp-cancel-name" style="margin-top:1vh;">CANCELAR</button>
        `;
        document.body.appendChild(modal);

        const input = document.getElementById('mp-name-input-field');
        input.focus();

        // Solo letras, números y espacios
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
            if (!this.mp || !this.mp.playerName) {
                this.selectedPlayer = null;
            }
        });
    }

    async confirmName(playerNum) {
        const input = document.getElementById('mp-name-input-field');
        const errorEl = document.getElementById('mp-name-error');
        const name = input ? input.value.trim().toUpperCase() : '';

        if (!name || name.length < 2) {
            if (input) input.style.borderBottomColor = '#f00';
            if (errorEl) errorEl.textContent = 'MÍNIMO 2 CARACTERES';
            return;
        }

        document.getElementById('mp-name-modal')?.remove();

        const status = document.getElementById('mp-lobby-status');
        const codeEl = document.getElementById('mp-room-code');
        const hintEl = document.getElementById('mp-code-subhint');

        // ---- CASO: Jugador 1, crear sala ----
        if (playerNum === 1 && !this.mp.isConnected) {
            if (status) { status.textContent = 'CREANDO SALA...'; status.className = 'mp-status'; }
            if (codeEl) codeEl.textContent = '· · · · · ·';

            const result = await this.mp.createRoom(name);

            if (result.success) {
                // Mostrar código inmediatamente tras recibir respuesta
                if (codeEl) {
                    codeEl.textContent = result.roomCode;
                    codeEl.style.color = '#ff0000';
                    codeEl.style.textShadow = '0 0 10px #ff0000, 0 0 20px #ff0000';
                }
                if (hintEl) hintEl.textContent = 'Comparte este código con tu amigo';
                if (status) { status.textContent = 'SALA LISTA · ESPERANDO JUGADOR 2...'; status.className = 'mp-status mp-ok'; }

                this.updatePlayerButtons();
                this.startLobbyPolling();
            } else {
                if (codeEl) codeEl.textContent = '— ERROR —';
                if (status) { status.textContent = 'ERROR: ' + result.error; status.className = 'mp-status mp-err'; }
                this.selectedPlayer = null;
            }
            return;
        }

        // ---- CASO: Jugador 2 ya conectado, actualizar nombre ----
        if (playerNum === 2 && this.mp.isConnected) {
            try {
                await this.mp.roomRef.child('player2').update({ name: name });
                this.mp.playerName = name;
                this.updatePlayerButtons();
            } catch(e) {
                console.error('Error actualizando nombre:', e);
            }
            return;
        }

        // ---- CASO: Tenía código pendiente (se unió por código) ----
        if (this._pendingJoinCode) {
            this.mp.playerName = name;
            this.mp.playerNumber = playerNum;
            const code = this._pendingJoinCode;
            this._pendingJoinCode = null;
            await this._doJoin(code);
            return;
        }

        // ---- CASO genérico ----
        this.mp.playerName = name;
        this.mp.playerNumber = playerNum;
        this.updatePlayerButtons();
    }

    async joinWithCode() {
        const codeInput = document.getElementById('mp-join-code');
        // Limpiar: solo A-Z y 0-9, sin puntos ni caracteres especiales
        const raw = codeInput ? codeInput.value.trim().toUpperCase() : '';
        const code = raw.replace(/[^A-Z0-9]/g, '');

        // Actualizar el input con el valor limpio
        if (codeInput) codeInput.value = code;

        if (!code || code.length !== 6) {
            MultiplayerUI.showTempMessage('CÓDIGO INVÁLIDO · 6 LETRAS/NÚMEROS', 2500);
            return;
        }

        // Ya está en esa sala
        if (this.mp.isConnected && this.mp.roomCode === code) {
            MultiplayerUI.showTempMessage('YA ESTÁS EN ESTA SALA', 2000);
            return;
        }

        // Ya conectado a otra sala
        if (this.mp.isConnected) {
            MultiplayerUI.showTempMessage('YA ESTÁS EN UNA SALA · VUELVE AL MENÚ', 2000);
            return;
        }

        if (!this.selectedPlayer) this.selectedPlayer = 2;

        // Pedir nombre si no tiene
        if (!this.mp.playerName) {
            this._pendingJoinCode = code;
            this.showNameModal(2);
            return;
        }

        await this._doJoin(code);
    }

    async _doJoin(code) {
        const status = document.getElementById('mp-lobby-status');
        const codeEl = document.getElementById('mp-room-code');
        const hintEl = document.getElementById('mp-code-subhint');

        if (status) { status.textContent = 'UNIÉNDOSE...'; status.className = 'mp-status'; }

        const result = await this.mp.joinRoom(code, this.mp.playerName || 'JUGADOR2');

        if (result.success) {
            if (codeEl) {
                codeEl.textContent = result.roomCode;
                codeEl.style.color = '#ff0000';
                codeEl.style.textShadow = '0 0 10px #ff0000, 0 0 20px #ff0000';
            }
            if (hintEl) hintEl.textContent = 'Conectado a sala de tu amigo';
            if (status) { status.textContent = 'CONECTADO · SALA ' + result.roomCode; status.className = 'mp-status mp-ok'; }

            this.updatePlayerButtons();
            this.startLobbyPolling();
        } else {
            if (status) { status.textContent = 'ERROR: ' + result.error; status.className = 'mp-status mp-err'; }
        }
    }

    updatePlayerButtons() {
        if (!this.mp) return;
        const data = this.mp.sharedState;
        const myNum = this.mp.playerNumber;

        [1, 2].forEach(num => {
            const btn = document.getElementById(`mp-p${num}-btn`);
            const nameEl = document.getElementById(`mp-p${num}-name`);
            if (!btn || !nameEl) return;

            const playerData = data[`player${num}`];
            const pName = playerData ? playerData.name : '';

            nameEl.textContent = pName || '— sin nombre —';
            btn.className = 'mp-player-btn';

            if (num === myNum) {
                btn.classList.add('mp-mine');   // Verde — soy yo
            } else if (pName) {
                btn.classList.add('mp-taken');  // Bloqueado — tomado
            }
        });

        // Activar botón Empezar si ambos tienen nombre
        const p1 = data.player1 ? data.player1.name : '';
        const p2 = data.player2 ? data.player2.name : '';
        const startBtn = document.getElementById('mp-start-game-btn');
        if (startBtn) {
            if (p1 && p2) startBtn.classList.remove('mp-disabled');
            else startBtn.classList.add('mp-disabled');
        }
    }

    startLobbyPolling() {
        if (this.lobbyInterval) return;
        this.lobbyInterval = setInterval(() => {
            if (!this.mp) return;
            this.updatePlayerButtons();
            if (this.mp.sharedState.status === 'playing') {
                this.launchGame();
            }
        }, 500);
    }

    tryStart() {
        if (!this.mp) return;
        const data = this.mp.sharedState;
        const p1 = data.player1 || {};
        const p2 = data.player2 || {};

        if (!p1.name && !p2.name) {
            MultiplayerUI.showTempMessage('CÁMBIATE EL NOMBRE PRIMERO', 2500);
            return;
        }
        if (!p1.name || !p2.name) {
            MultiplayerUI.showTempMessage('FALTA 1 JUGADOR', 2500);
            return;
        }

        if (this.mp.isHost) this.mp.startGame();
        this.launchGame();
    }

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
