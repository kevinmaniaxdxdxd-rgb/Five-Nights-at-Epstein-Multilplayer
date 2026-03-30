// =============================================
// FNAE - Sistema Multijugador con Firebase
// =============================================

class MultiplayerSystem {
    constructor(game) {
        this.game = game;
        this.db = null;
        this.roomRef = null;
        this.roomCode = null;
        this.playerNumber = null; // 1 o 2
        this.playerName = null;
        this.isHost = false;
        this.isConnected = false;
        this.listeners = {};

        // Estado compartido que se sincroniza
        this.sharedState = {
            soundUsesLeft: 5,   // Usos de sonido compartidos
            player1: { name: '', ready: false, cam: null },
            player2: { name: '', ready: false, cam: null },
        };

        this.initFirebase();
    }

    initFirebase() {
        // Firebase se inicializa desde el HTML (ver instrucciones)
        if (typeof firebase !== 'undefined') {
            this.db = firebase.database();
            console.log('✅ Firebase conectado');
        } else {
            console.warn('⚠️ Firebase no cargado. Modo offline activado.');
        }
    }

    // Generar código de sala aleatorio
    generateRoomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    }

    // Crear sala (Host = Jugador 1)
    async createRoom(playerName) {
        if (!this.db) return { success: false, error: 'Firebase no disponible' };

        this.roomCode = this.generateRoomCode();
        this.playerNumber = 1;
        this.playerName = playerName;
        this.isHost = true;

        const roomData = {
            created: Date.now(),
            status: 'waiting',   // waiting | playing | finished
            soundUsesLeft: 5,
            player1: {
                name: playerName,
                ready: false,
                alive: true,
                cam: null,
                usingCamera: false,
            },
            player2: {
                name: '',
                ready: false,
                alive: true,
                cam: null,
                usingCamera: false,
            }
        };

        try {
            this.roomRef = this.db.ref(`rooms/${this.roomCode}`);
            await this.roomRef.set(roomData);

            // Limpiar sala al desconectarse
            this.roomRef.onDisconnect().remove();

            this.isConnected = true;
            this.listenToRoom();

            return { success: true, roomCode: this.roomCode };
        } catch (e) {
            console.error('Error creando sala:', e);
            return { success: false, error: e.message };
        }
    }

    // Unirse a sala (Jugador 2)
    async joinRoom(roomCode, playerName) {
        if (!this.db) return { success: false, error: 'Firebase no disponible' };

        this.roomCode = roomCode.toUpperCase().trim();
        this.playerNumber = 2;
        this.playerName = playerName;
        this.isHost = false;

        try {
            this.roomRef = this.db.ref(`rooms/${this.roomCode}`);
            const snapshot = await this.roomRef.once('value');
            const data = snapshot.val();

            if (!data) return { success: false, error: 'Sala no encontrada' };
            if (data.status !== 'waiting') return { success: false, error: 'La sala ya inició' };
            if (data.player2 && data.player2.name) return { success: false, error: 'Sala llena' };

            await this.roomRef.child('player2').update({
                name: playerName,
                ready: false,
                alive: true,
                cam: null,
                usingCamera: false,
            });

            this.roomRef.child('player2').onDisconnect().update({ name: '', ready: false });

            this.isConnected = true;
            this.listenToRoom();

            return { success: true, roomCode: this.roomCode };
        } catch (e) {
            console.error('Error uniéndose a sala:', e);
            return { success: false, error: e.message };
        }
    }

    // Escuchar cambios en la sala
    listenToRoom() {
        if (!this.roomRef) return;

        this.roomRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (!data) return;

            this.sharedState = data;
            this.onRoomUpdate(data);
        });
    }

    // Callback cuando se actualiza la sala
    onRoomUpdate(data) {
        // Actualizar indicador del otro jugador en pantalla
        MultiplayerUI.updateOtherPlayerIndicator(data, this.playerNumber);

        // Sincronizar usos de sonido compartidos
        if (this.game && this.game.camera) {
            const remaining = data.soundUsesLeft !== undefined ? data.soundUsesLeft : 5;
            this.game.camera.maxSoundUses = remaining + this.game.camera.soundButtonUseCount;
        }

        // Verificar si ambos jugadores están listos para iniciar
        if (data.status === 'waiting' &&
            data.player1 && data.player1.name &&
            data.player2 && data.player2.name) {
            MultiplayerUI.showBothPlayersReady();
        }
    }

    // Actualizar posición de cámara del jugador actual
    updateCamera(camName) {
        if (!this.roomRef || !this.playerNumber) return;
        const key = `player${this.playerNumber}`;
        this.roomRef.child(key).update({
            cam: camName,
            usingCamera: camName !== null,
        });
    }

    // Actualizar uso de sonido (compartido)
    async useSoundCharge() {
        if (!this.roomRef) return true; // modo solo

        try {
            let allowed = false;
            await this.roomRef.child('soundUsesLeft').transaction((current) => {
                if (current > 0) {
                    allowed = true;
                    return current - 1;
                }
                return current; // no cambiar
            });
            return allowed;
        } catch (e) {
            return true; // si falla Firebase, permitir localmente
        }
    }

    // Restaurar cargas de sonido (cuando se reparan cámaras)
    resetSoundCharges() {
        if (!this.roomRef) return;
        this.roomRef.child('soundUsesLeft').set(5);
    }

    // Iniciar partida (solo el host)
    startGame() {
        if (!this.roomRef || !this.isHost) return;
        this.roomRef.child('status').set('playing');
    }

    // Desconectarse de la sala
    disconnect() {
        if (this.roomRef) {
            if (this.playerNumber === 1) {
                this.roomRef.remove();
            } else {
                this.roomRef.child('player2').update({ name: '', ready: false });
            }
            this.roomRef.off();
            this.roomRef = null;
        }
        this.isConnected = false;
        this.roomCode = null;
        this.playerNumber = null;
        this.playerName = null;
    }

    // Reportar muerte (game over)
    reportDeath() {
        if (!this.roomRef || !this.playerNumber) return;
        const key = `player${this.playerNumber}`;
        this.roomRef.child(key).update({ alive: false });
    }

    // Reportar victoria
    reportWin() {
        if (!this.roomRef || !this.playerNumber) return;
        const key = `player${this.playerNumber}`;
        this.roomRef.child(key).update({ won: true });
    }

    isMultiplayer() {
        return this.isConnected && this.playerNumber !== null;
    }
}

// =============================================
// UI del Modo Multijugador
// =============================================
class MultiplayerUI {

    // Crear overlay de cámara del otro jugador
    static updateOtherPlayerIndicator(roomData, myPlayerNumber) {
        const otherNum = myPlayerNumber === 1 ? 2 : 1;
        const otherKey = `player${otherNum}`;
        const otherData = roomData[otherKey];

        let indicator = document.getElementById('mp-other-cam-indicator');

        if (!otherData || !otherData.usingCamera || !otherData.cam) {
            if (indicator) indicator.style.display = 'none';
            return;
        }

        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'mp-other-cam-indicator';
            indicator.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0,0,0,0.7);
                border: 2px solid rgba(255,0,0,0.6);
                border-radius: 50%;
                width: 100px;
                height: 100px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                pointer-events: none;
                z-index: 500;
                font-family: 'Courier New', monospace;
                text-align: center;
                animation: mpPulse 1.5s ease-in-out infinite;
            `;
            document.body.appendChild(indicator);
        }

        const camNum = otherData.cam.replace('cam', '');
        indicator.innerHTML = `
            <div style="color: #fff; font-size: 10px; font-weight: bold; letter-spacing: 1px;">${otherData.name || 'P' + otherNum}</div>
            <div style="color: #f00; font-size: 9px; margin-top: 2px;">CAM ${camNum}</div>
            <div style="color: #ccc; font-size: 8px;">📷</div>
        `;
        indicator.style.display = 'flex';
    }

    static showBothPlayersReady() {
        // Notificar al host que puede iniciar
        const startBtn = document.getElementById('mp-start-game-btn');
        if (startBtn) {
            startBtn.style.opacity = '1';
            startBtn.style.pointerEvents = 'auto';
            startBtn.style.borderColor = 'rgba(0,255,0,0.6)';
            startBtn.style.color = '#0f0';
        }
    }

    static showTempMessage(text, duration = 3000) {
        let msg = document.getElementById('mp-temp-msg');
        if (!msg) {
            msg = document.createElement('div');
            msg.id = 'mp-temp-msg';
            msg.style.cssText = `
                position: fixed;
                top: 40%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0,0,0,0.92);
                border: 2px solid rgba(255,0,0,0.5);
                color: #fff;
                font-family: 'Courier New', monospace;
                font-size: 1.8vw;
                font-weight: bold;
                letter-spacing: 3px;
                padding: 2vh 4vw;
                z-index: 99999;
                text-align: center;
                pointer-events: none;
                text-shadow: 0 0 10px #f00;
            `;
            document.body.appendChild(msg);
        }
        msg.textContent = text;
        msg.style.display = 'block';
        msg.style.opacity = '1';

        clearTimeout(msg._timeout);
        msg._timeout = setTimeout(() => {
            msg.style.transition = 'opacity 0.5s';
            msg.style.opacity = '0';
            setTimeout(() => { msg.style.display = 'none'; msg.style.transition = ''; }, 500);
        }, duration);
    }
}
