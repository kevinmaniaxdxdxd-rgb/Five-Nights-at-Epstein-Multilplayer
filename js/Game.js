// Main game class
class Game {
    constructor() {
        this.state = new GameState();
        this.assets = new AssetManager();
        this.ui = new UIManager(this);
        this.camera = new CameraSystem(this);
        this.enemyAI = new EnemyAI(this);
        this.input = new InputHandler(this);
        
        // Initialize CameraSystem's EP config (from EnemyAI)
        this.camera.initEPConfig();
        
        // ===== MULTIJUGADOR =====
        this._mpLobby = null;
        this.mp = null;
        // ========================
        
        this.timeInterval = null;
        this.powerInterval = null;
        this.viewPosition = 0.25;
        this.isRotatingLeft = false;
        this.isRotatingRight = false;
        this.rotationSpeed = 0.015;
        
        this.initElements();
        this.bindEvents();
    }

    initElements() {
        this.mainMenu = document.getElementById('main-menu');
        this.gameScreen = document.getElementById('game-screen');
        this.gameOverElement = document.getElementById('game-over');
        this.gameOverText = document.getElementById('game-over-text');
        this.tutorialOverlay = document.getElementById('tutorial-overlay');
        this.tutorialGotItBtn = document.getElementById('tutorial-got-it');
        
        this.startBtn = document.getElementById('start-game');
        this.continueBtn = document.getElementById('continue-game');
        this.specialNightBtn = document.getElementById('special-night-btn');
        this.customNightBtn = document.getElementById('custom-night-btn');
        this.starIcon = document.getElementById('star-icon');
        this.starIcon2 = document.getElementById('star-icon-2');
        this.starIcon3 = document.getElementById('star-icon-3');
        this.restartBtn = document.getElementById('restart');
        this.mainMenuBtn = document.getElementById('main-menu-btn');
        
        this.volumeBtn = document.getElementById('volume-btn');
        this.volumePanel = document.getElementById('volume-panel');
        this.closeVolumePanelBtn = document.getElementById('close-volume-panel');
        this.gameBgVolumeSlider = document.getElementById('game-bg-volume');
        this.menuMusicVolumeSlider = document.getElementById('menu-music-volume');
        this.jumpscareVolumeSlider = document.getElementById('jumpscare-volume');
        this.ventCrawlingVolumeSlider = document.getElementById('vent-crawling-volume');
        this.masterVolumeSlider = document.getElementById('master-volume');
        
        this.customNightMenu = document.getElementById('custom-night-menu');
        this.epsteinSlider = document.getElementById('epstein-slider');
        this.trumpSlider = document.getElementById('trump-slider');
        this.hawkingSlider = document.getElementById('hawking-slider');
        this.epsteinValue = document.getElementById('epstein-value');
        this.trumpValue = document.getElementById('trump-value');
        this.hawkingValue = document.getElementById('hawking-value');
        this.startCustomNightBtn = document.getElementById('start-custom-night');
        this.backToMenuBtn = document.getElementById('back-to-menu');
        
        this.initVolumeSettings();
    }
    
    initVolumeSettings() {
        const volumes = this.assets.getAllVolumes();
        this.gameBgVolumeSlider.value = Math.round(volumes.gameBg * 100);
        this.menuMusicVolumeSlider.value = Math.round(volumes.menuMusic * 100);
        this.jumpscareVolumeSlider.value = Math.round(volumes.jumpscare * 100);
        this.ventCrawlingVolumeSlider.value = Math.round(volumes.ventCrawling * 100);
        this.masterVolumeSlider.value = Math.round(volumes.master * 100);
        this.updateVolumePercents();
    }
    
    updateVolumePercents() {
        const sliders = [
            this.gameBgVolumeSlider,
            this.menuMusicVolumeSlider,
            this.jumpscareVolumeSlider,
            this.ventCrawlingVolumeSlider,
            this.masterVolumeSlider
        ];
        sliders.forEach(slider => {
            const percent = slider.parentElement.querySelector('.volume-percent');
            if (percent) {
                percent.textContent = slider.value + '%';
            }
        });
    }

    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startGame());
        this.continueBtn.addEventListener('click', () => this.continueGame());
        this.specialNightBtn.addEventListener('click', () => this.startSpecialNight());
        this.customNightBtn.addEventListener('click', () => this.showCustomNightMenu());
        this.restartBtn.addEventListener('click', () => this.restartGame());
        
        this.volumeBtn.addEventListener('click', () => {
            this.volumePanel.classList.toggle('hidden');
        });
        this.closeVolumePanelBtn.addEventListener('click', () => {
            this.volumePanel.classList.add('hidden');
        });
        
        this.gameBgVolumeSlider.addEventListener('input', (e) => {
            this.assets.setVolume('gameBg', parseInt(e.target.value) / 100);
            this.updateVolumePercents();
            if (this.state.isGameRunning) {
                const ventsSound = this.assets.sounds['vents'];
                if (ventsSound && !ventsSound.paused) {
                    const volumes = this.assets.getAllVolumes();
                    ventsSound.volume = volumes.gameBg * volumes.master;
                }
            }
        });
        this.menuMusicVolumeSlider.addEventListener('input', (e) => {
            this.assets.setVolume('menuMusic', parseInt(e.target.value) / 100);
            this.updateVolumePercents();
            const menuMusic = document.getElementById('menu-music');
            if (menuMusic && !menuMusic.paused) {
                const volumes = this.assets.getAllVolumes();
                menuMusic.volume = volumes.menuMusic * volumes.master;
            }
        });
        this.jumpscareVolumeSlider.addEventListener('input', (e) => {
            this.assets.setVolume('jumpscare', parseInt(e.target.value) / 100);
            this.updateVolumePercents();
        });
        this.ventCrawlingVolumeSlider.addEventListener('input', (e) => {
            this.assets.setVolume('ventCrawling', parseInt(e.target.value) / 100);
            this.updateVolumePercents();
        });
        this.masterVolumeSlider.addEventListener('input', (e) => {
            this.assets.setVolume('master', parseInt(e.target.value) / 100);
            this.updateVolumePercents();
            const menuMusic = document.getElementById('menu-music');
            if (menuMusic && !menuMusic.paused) {
                const volumes = this.assets.getAllVolumes();
                menuMusic.volume = volumes.menuMusic * volumes.master;
            }
            if (this.state.isGameRunning) {
                const ventsSound = this.assets.sounds['vents'];
                if (ventsSound && !ventsSound.paused) {
                    const volumes = this.assets.getAllVolumes();
                    ventsSound.volume = volumes.gameBg * volumes.master;
                }
            }
        });

        this.mainMenuBtn.addEventListener('click', () => this.showMainMenu());
        this.tutorialGotItBtn.addEventListener('click', () => this.closeTutorial());
        
        this.startCustomNightBtn.addEventListener('click', () => this.startCustomNight());
        this.backToMenuBtn.addEventListener('click', () => this.hideCustomNightMenu());
        
        this.epsteinSlider.addEventListener('input', (e) => {
            this.epsteinValue.textContent = e.target.value;
        });
        this.trumpSlider.addEventListener('input', (e) => {
            this.trumpValue.textContent = e.target.value;
        });
        this.hawkingSlider.addEventListener('input', (e) => {
            this.hawkingValue.textContent = e.target.value;
        });
        
        document.querySelectorAll('.ai-btn-minus').forEach(btn => {
            btn.addEventListener('click', () => {
                const aiName = btn.dataset.ai;
                const slider = document.getElementById(`${aiName}-slider`);
                const value = Math.max(0, parseInt(slider.value) - 1);
                slider.value = value;
                document.getElementById(`${aiName}-value`).textContent = value;
            });
        });
        document.querySelectorAll('.ai-btn-plus').forEach(btn => {
            btn.addEventListener('click', () => {
                const aiName = btn.dataset.ai;
                const slider = document.getElementById(`${aiName}-slider`);
                const value = Math.min(20, parseInt(slider.value) + 1);
                slider.value = value;
                document.getElementById(`${aiName}-value`).textContent = value;
            });
        });
    }
    
    loadProgress() {
        const savedNight = localStorage.getItem('fnae_current_night');
        if (savedNight) {
            const night = parseInt(savedNight);
            if (night > 1 && night <= this.state.maxNights) {
                this.state.currentNight = night;
                return true;
            }
        }
        return false;
    }
    
    saveProgress() {
        if (this.state.currentNight > 1) {
            localStorage.setItem('fnae_current_night', this.state.currentNight.toString());
        }
    }
    
    clearProgress() {
        localStorage.removeItem('fnae_current_night');
    }
    
    updateContinueButton() {
        if (this.loadProgress()) {
            this.continueBtn.classList.remove('hidden');
            this.continueBtn.textContent = `CONTINUE (NIGHT ${this.state.currentNight})`;
        } else {
            this.continueBtn.classList.add('hidden');
        }
        
        const night6Unlocked = localStorage.getItem('night6Unlocked');
        if (night6Unlocked === 'true') {
            this.specialNightBtn.classList.remove('hidden');
            this.starIcon.classList.remove('hidden');
        } else {
            this.specialNightBtn.classList.add('hidden');
            this.starIcon.classList.add('hidden');
        }
        
        const night6Completed = localStorage.getItem('night6Completed');
        if (night6Completed === 'true') {
            this.starIcon2.classList.remove('hidden');
            this.customNightBtn.classList.remove('hidden');
        } else {
            this.starIcon2.classList.add('hidden');
            this.customNightBtn.classList.add('hidden');
        }
        
        const customNight202020 = localStorage.getItem('customNight202020');
        if (customNight202020 === 'true') {
            this.starIcon3.classList.remove('hidden');
        } else {
            this.starIcon3.classList.add('hidden');
        }
        
        this.state.currentNight = 1;
    }
    
    showCustomNightMenu() {
        this.mainMenu.classList.add('hidden');
        this.customNightMenu.classList.remove('hidden');
    }
    
    hideCustomNightMenu() {
        this.customNightMenu.classList.add('hidden');
        this.mainMenu.classList.remove('hidden');
    }
    
    // =============================================
    // NUEVO startGame — muestra selector Solo/Multi
    // =============================================
    async startGame() {
        if (!this._mpLobby) {
            this._mpLobby = new MultiplayerLobby(this);
        }
        this._mpLobby.showModeSelect();
    }

    // =============================================
    // _startSolo — el startGame original renombrado
    // =============================================
    async _startSolo() {
        this.state.currentNight = 1;
        this.clearProgress();
        
        this.mainMenu.classList.add('hidden');
        
        if (this.volumeBtn) this.volumeBtn.classList.add('hidden');
        if (this.volumePanel) this.volumePanel.classList.add('hidden');
        
        const menuMusic = document.getElementById('menu-music');
        if (menuMusic) {
            menuMusic.pause();
            menuMusic.currentTime = 0;
            menuMusic.loop = false;
        }
        
        this.enemyAI.reset();
        
        const cutscene = document.getElementById('cutscene');
        cutscene.classList.remove('hidden');
        
        setTimeout(() => {
            cutscene.classList.add('fade-in');
        }, 50);
        
        let cutsceneEnded = false;
        
        const endCutscene = () => {
            if (cutsceneEnded) return;
            cutsceneEnded = true;
            
            cutscene.classList.remove('fade-in');
            cutscene.classList.add('fade-out');
            
            setTimeout(() => {
                cutscene.classList.add('hidden');
                cutscene.classList.remove('fade-out');
                this.initGame();
            }, 3000);
            
            cutscene.removeEventListener('click', endCutscene);
            if (autoEndTimeout) clearTimeout(autoEndTimeout);
        };
        
        cutscene.addEventListener('click', endCutscene);
        const autoEndTimeout = setTimeout(() => {
            endCutscene();
        }, 3000);

        // Parchar cámara para sincronizar en modo multi
        if (this.mp && this._mpLobby) {
            this._mpLobby.patchCameraSystem();
        }
    }
    
    async startCustomNight() {
        const epsteinLevel = parseInt(this.epsteinSlider.value);
        const trumpLevel = parseInt(this.trumpSlider.value);
        const hawkingLevel = parseInt(this.hawkingSlider.value);
        
        this.state.customNight = true;
        this.state.currentNight = 7;
        this.state.customAILevels = {
            epstein: epsteinLevel,
            trump: trumpLevel,
            hawking: hawkingLevel
        };
        
        this.customNightMenu.classList.add('hidden');
        
        if (this.volumeBtn) this.volumeBtn.classList.add('hidden');
        if (this.volumePanel) this.volumePanel.classList.add('hidden');
        
        const menuMusic = document.getElementById('menu-music');
        if (menuMusic) {
            menuMusic.pause();
            menuMusic.currentTime = 0;
            menuMusic.loop = false;
        }
        
        this.enemyAI.reset();
        await this.initGame();
    }
    
    async continueGame() {
        if (this.loadProgress()) {
            this.mainMenu.classList.add('hidden');
            
            if (this.volumeBtn) this.volumeBtn.classList.add('hidden');
            if (this.volumePanel) this.volumePanel.classList.add('hidden');
            
            const menuMusic = document.getElementById('menu-music');
            if (menuMusic) {
                menuMusic.pause();
                menuMusic.currentTime = 0;
                menuMusic.loop = false;
            }
            
            this.enemyAI.reset();
            await this.initGame();
        }
    }
    
    async startSpecialNight() {
        this.state.currentNight = 6;
        this.clearProgress();
        
        this.mainMenu.classList.add('hidden');
        
        if (this.volumeBtn) this.volumeBtn.classList.add('hidden');
        if (this.volumePanel) this.volumePanel.classList.add('hidden');
        
        const menuMusic = document.getElementById('menu-music');
        if (menuMusic) {
            menuMusic.pause();
            menuMusic.currentTime = 0;
            menuMusic.loop = false;
        }
        
        this.enemyAI.reset();
        await this.initGame();
    }

    async initGame() {
        if (!this.assets.loaded) {
            await this.assets.loadAssets();
        }
        
        this.state.reset();
        this.camera.resetSoundButtonCount();
        
        const cameraPanel = document.getElementById('camera-panel');
        if (cameraPanel) {
            cameraPanel.style.display = '';
        }
        
        await this.showNightIntro();
        
        this.gameScreen.classList.add('active');
        
        this.ui.currentSceneImg.src = this.assets.images.office.src;
        this.ui.currentSceneImg.style.display = 'block';
        this.viewPosition = 0.25;
        this.ui.updateViewPosition(this.viewPosition);
        
        this.ui.update();
        this.ui.createHotspots();
        
        this.initVentFanAnimation();
        
        this.startGameLoop();
        this.startViewRotation();
        
        this.enemyAI.start();
        
        this.assets.playSound('vents', true);
        
        if (this.state.currentNight === 1) {
            this.showTutorial('night1');
        } else if (this.state.currentNight === 2) {
            this.showTutorial('night2');
        } else if (this.state.currentNight === 3) {
            this.showTutorial('night3');
        }
        
        if (this.state.currentNight === 5) {
            setTimeout(() => {
                this.showGoldenStephen();
            }, 1000);
        }
    }
    
    initVentFanAnimation() {
        const ventIcon = document.querySelector('.vent-icon');
        if (ventIcon) {
            if (this.state.ventsClosed) {
                ventIcon.classList.add('stopped');
                ventIcon.style.animation = 'none';
            } else {
                ventIcon.classList.remove('stopped', 'slowing', 'speeding-up');
                ventIcon.style.animation = 'spin-fast 0.333s linear infinite';
            }
        }
    }
    
    showTutorial(type = 'night1') {
        const tutorialContent = document.getElementById('tutorial-content');
        if (!tutorialContent) return;
        
        if (type === 'night2') {
            tutorialContent.innerHTML = `
                <h2>DEFEND YOURSELF AGAINST TRUMP</h2>
                <p>
                    TRUMP WILL TRY TO ATTACK YOU THROUGH THE VENTS IN CAM 1 AND CAM 2, SO IF YOU HEAR BANGING IN THE VENTS HEAD OVER TO THE CONTROL PANEL AND CLOSE THEM. 
                    AFTER CLOSING THEM YOU WILL HEAR BANGING AGAIN AFTER A FEW SECONDS WHICH MEANS HE LEFT THE VENTS. YOU MUST OPEN THE VENTS OTHERWISE YOU WILL DIE FROM LACK OF OXYGEN. 
                    TRUMP CAN BE LURED WITH THE AUDIOS BUT YOUR MAIN PRIORITY WITH THE AUDIO LURES SHOULD BE EPSTEIN.
                </p>
                <button id="tutorial-got-it">GOT IT</button>
            `;
            const gotItBtn = document.getElementById('tutorial-got-it');
            if (gotItBtn) gotItBtn.addEventListener('click', () => this.closeTutorial());
        } else if (type === 'night3') {
            tutorialContent.innerHTML = `
                <h2>DEFEND YOURSELF AGAINST STEPHEN HAWKING</h2>
                <p>
                    STEPHEN HAWKING ALWAYS STAYS AT CAM 6 AND HE IS NOT AFFECTED BY THE AUDIO LURES. 
                    ELECTROCUTE STEPHEN HAWKING EVERY ONCE IN A WHILE TO PREVENT HIM FROM LEAVING CAM 6.
                </p>
                <button id="tutorial-got-it">GOT IT</button>
            `;
            const gotItBtn = document.getElementById('tutorial-got-it');
            if (gotItBtn) gotItBtn.addEventListener('click', () => this.closeTutorial());
        } else {
            tutorialContent.innerHTML = `
                <h2>DEFEND YOURSELF AGAINST EPSTEIN</h2>
                <p>
                    EPSTEIN ALWAYS STARTS AT CAM 11. USE THE CAMERA'S AUDIO LURE TO KEEP EPSTEIN FAR AWAY FROM YOU. 
                    MAKE SURE THE CAMERA YOU'RE PLAYING THE SOUND IN IS NEXT TO THE CAMERA WHERE EPSTEIN IS. 
                    PLAYING SOUND IN ONLY ONE SPOT WILL NOT WORK IF YOU DO IT TWICE OR MORE IN A ROW. 
                    USING THE AUDIO LURE TOO MUCH WILL LEAD TO THE CAMERAS BREAKING. 
                    TO FIX THEM HEAD TO THE CONTROL PANEL AND RESTART THE CAMERAS LIKE YOU JUST DID. 
                    EPSTEIN DOES NOT ATTACK THROUGH THE VENTS SO DON'T BOTHER CLOSING THEM FOR THIS NIGHT.
                </p>
                <button id="tutorial-got-it">GOT IT</button>
            `;
            const gotItBtn = document.getElementById('tutorial-got-it');
            if (gotItBtn) gotItBtn.addEventListener('click', () => this.closeTutorial());
        }
        
        this.tutorialOverlay.classList.remove('hidden');
        this.state.tutorialActive = true;
    }
    
    closeTutorial() {
        this.tutorialOverlay.classList.add('hidden');
        this.state.tutorialActive = false;
    }
    
    showGoldenStephen() {
        const goldenOverlay = document.createElement('div');
        goldenOverlay.id = 'golden-stephen-overlay';
        goldenOverlay.style.position = 'fixed';
        goldenOverlay.style.top = '0';
        goldenOverlay.style.left = '0';
        goldenOverlay.style.width = '100%';
        goldenOverlay.style.height = '100%';
        goldenOverlay.style.zIndex = '9999';
        goldenOverlay.style.pointerEvents = 'none';
        goldenOverlay.style.background = 'rgba(0, 0, 0, 0.3)';
        
        const goldenImg = document.createElement('img');
        goldenImg.src = 'assets/images/goldenstephen.png';
        goldenImg.style.position = 'absolute';
        goldenImg.style.top = '50%';
        goldenImg.style.left = '50%';
        goldenImg.style.transform = 'translate(-50%, -50%)';
        goldenImg.style.width = '80%';
        goldenImg.style.height = '80%';
        goldenImg.style.objectFit = 'contain';
        goldenImg.style.opacity = '0';
        goldenImg.style.animation = 'golden-flicker 2s ease-in-out';
        
        goldenOverlay.appendChild(goldenImg);
        document.body.appendChild(goldenOverlay);
        
        this.assets.playSound('goldenstephenscare', false, 1.0);
        
        setTimeout(() => {
            goldenOverlay.remove();
        }, 2000);
    }
    
    showNightIntro() {
        return new Promise((resolve) => {
            const nightIntro = document.getElementById('night-intro');
            const nightIntroText = document.getElementById('night-intro-text');
            
            if (this.state.customNight && this.state.currentNight === 7) {
                nightIntroText.textContent = 'CUSTOM NIGHT';
            } else {
                nightIntroText.textContent = `NIGHT ${this.state.currentNight}`;
            }
            
            nightIntro.classList.remove('hidden');
            
            setTimeout(() => {
                nightIntro.classList.add('fade-in');
            }, 50);
            
            setTimeout(() => {
                nightIntro.classList.remove('fade-in');
                nightIntro.classList.add('fade-out');
                
                setTimeout(() => {
                    nightIntro.classList.add('hidden');
                    nightIntro.classList.remove('fade-out');
                    resolve();
                }, 1500);
            }, 3500);
        });
    }

    startViewRotation() {
        const rotationLoop = () => {
            if (!this.state.isGameRunning) return;
            
            if (!this.state.controlPanelOpen && !this.state.cameraOpen) {
                if (this.isRotatingLeft && this.viewPosition > 0) {
                    this.viewPosition -= this.rotationSpeed;
                    this.viewPosition = Math.max(0, this.viewPosition);
                    this.ui.updateViewPosition(this.viewPosition);
                }
                if (this.isRotatingRight && this.viewPosition < 1) {
                    this.viewPosition += this.rotationSpeed;
                    this.viewPosition = Math.min(1, this.viewPosition);
                    this.ui.updateViewPosition(this.viewPosition);
                }
            }
            
            requestAnimationFrame(rotationLoop);
        };
        rotationLoop();
    }

    startGameLoop() {
        this.timeInterval = setInterval(() => {
            this.state.currentTime += 1;
            this.ui.update();
            if (this.state.currentTime >= 6) {
                this.winNight();
            }
        }, 60000);
        
        this.powerInterval = setInterval(() => {
            this.updatePower();
        }, 1000);
    }

    updatePower() {
        if (this.state.ventsClosed) {
            this.state.oxygen -= 1.5;
        } else {
            if (this.state.oxygen < 100) {
                this.state.oxygen += 2;
            }
        }
        
        this.state.oxygen = Math.max(0, Math.min(100, this.state.oxygen));
        
        if (this.state.oxygen <= 0) {
            this.oxygenOut();
        }
        
        this.ui.update();
    }

    toggleVents() {
        if (this.state.controlPanelBusy) return;
        
        this.state.controlPanelBusy = true;
        this.state.ventsToggling = true;
        
        this.assets.playSound('ekg', false, 0.8);
        
        const ventIcon = document.querySelector('.vent-icon');
        
        if (this.state.ventsClosed) {
            if (ventIcon) {
                ventIcon.classList.remove('stopped', 'slowing');
                ventIcon.classList.add('speeding-up');
                setTimeout(() => { ventIcon.style.animation = 'spin-slow 2s linear infinite'; }, 0);
                setTimeout(() => { ventIcon.style.animation = 'spin-slow 1.5s linear infinite'; }, 1000);
                setTimeout(() => {
                    ventIcon.style.animation = 'spin-fast 0.333s linear infinite';
                    ventIcon.classList.remove('speeding-up');
                }, 2000);
            }
        } else {
            if (ventIcon) {
                ventIcon.classList.remove('speeding-up');
                ventIcon.classList.add('slowing');
                setTimeout(() => { ventIcon.style.animation = 'spin-slow 1.5s linear infinite'; }, 0);
                setTimeout(() => { ventIcon.style.animation = 'spin-slow 2s linear infinite'; }, 1000);
                setTimeout(() => { ventIcon.style.animation = 'spin-slow 3s linear infinite'; }, 2000);
                setTimeout(() => {
                    ventIcon.style.animation = 'none';
                    ventIcon.classList.remove('slowing');
                    ventIcon.classList.add('stopped');
                }, 3000);
            }
        }
        
        this.ui.updateVentsStatus();
        
        const updateInterval = setInterval(() => {
            this.ui.updateVentsStatus();
            if (!this.state.ventsToggling) clearInterval(updateInterval);
        }, 100);
        
        setTimeout(() => {
            this.state.ventsClosed = !this.state.ventsClosed;
            this.enemyAI.onVentsChanged(this.state.ventsClosed);
            this.state.ventsToggling = false;
            this.state.controlPanelBusy = false;
            this.ui.update();
            this.ui.updateVentsStatus();
            this.ui.updateControlPanelOptions();
        }, 4000);
    }

    toggleCamera() {
        this.camera.toggle();
    }

    oxygenOut() {
        this.stopGame();
        this.assets.stopSound('ambient');
        this.enemyAI.triggerJumpscare();
    }
    
    gameOver(message) {
        this.stopGame();
        this.assets.stopSound('ambient');
        
        this.gameScreen.classList.remove('active');
        
        if (this.state.cameraOpen) this.camera.close();
        
        const cameraPanel = document.getElementById('camera-panel');
        if (cameraPanel) {
            cameraPanel.classList.add('hidden');
            cameraPanel.classList.remove('show');
        }
        
        const characterOverlay = document.getElementById('character-overlay');
        if (characterOverlay) characterOverlay.innerHTML = '';
        
        const controlPanel = document.getElementById('control-panel');
        if (controlPanel) controlPanel.classList.add('hidden');
        
        this.gameOverScreen(message);
    }

    winNight() {
        this.stopGame();
        this.assets.stopSound('ambient');
        
        if (this.state.cameraOpen) this.camera.close();
        
        const cameraPanel = document.getElementById('camera-panel');
        if (cameraPanel) {
            cameraPanel.classList.add('hidden');
            cameraPanel.classList.remove('show', 'closing');
            cameraPanel.style.display = 'none';
        }
        
        this.gameScreen.classList.remove('active');
        
        if (this.state.customNight && this.state.currentNight === 7) {
            const levels = this.state.customAILevels;
            if (levels.epstein === 20 && levels.trump === 20 && levels.hawking === 20) {
                localStorage.setItem('customNight202020', 'true');
            }
        }
        
        if (this.state.currentNight === 6) {
            localStorage.setItem('night6Completed', 'true');
            this.playNight6VictoryAnimation();
        } else if (this.state.currentNight === 5) {
            this.playNight5VictoryAnimation();
        } else {
            this.playNightEndAnimation();
        }
    }
    
    playNight5VictoryAnimation() {
        const animationContainer = document.createElement('div');
        animationContainer.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:#000;display:flex;align-items:center;justify-content:center;z-index:10000;opacity:0;transition:opacity 0.5s;`;
        
        const timeDisplay = document.createElement('div');
        timeDisplay.style.cssText = `font-size:10vw;font-weight:bold;color:#fff;font-family:Arial,sans-serif;`;
        timeDisplay.textContent = '5:59 AM';
        
        animationContainer.appendChild(timeDisplay);
        document.body.appendChild(animationContainer);
        
        setTimeout(() => { animationContainer.style.opacity = '1'; }, 50);
        setTimeout(() => {
            timeDisplay.textContent = '6:00 AM';
            this.assets.playSound('chimes', false, 1.0);
        }, 1000);
        setTimeout(() => {
            timeDisplay.style.transition = 'opacity 0.5s';
            timeDisplay.style.opacity = '0';
            setTimeout(() => {
                animationContainer.removeChild(timeDisplay);
                const rescueText = document.createElement('div');
                rescueText.style.cssText = `font-size:8vw;font-weight:bold;color:#0f0;font-family:Arial,sans-serif;text-align:center;opacity:0;transition:opacity 1s;`;
                rescueText.textContent = 'RESCUE ARRIVE';
                animationContainer.appendChild(rescueText);
                setTimeout(() => { rescueText.style.opacity = '1'; }, 50);
                setTimeout(() => {
                    rescueText.style.opacity = '0';
                    setTimeout(() => {
                        animationContainer.removeChild(rescueText);
                        const winScreen = document.createElement('img');
                        winScreen.src = 'assets/images/winscreen.png';
                        winScreen.style.cssText = `width:100%;height:100%;object-fit:contain;opacity:0;transition:opacity 1s;`;
                        animationContainer.appendChild(winScreen);
                        this.assets.playSound('win', false, 1.0);
                        setTimeout(() => { winScreen.style.opacity = '1'; }, 50);
                        setTimeout(() => {
                            animationContainer.style.opacity = '0';
                            setTimeout(() => {
                                document.body.removeChild(animationContainer);
                                localStorage.setItem('night6Unlocked', 'true');
                                this.clearProgress();
                                this.showMainMenu();
                            }, 500);
                        }, 5000);
                    }, 1000);
                }, 2000);
            }, 500);
        }, 3000);
    }
    
    playNight6VictoryAnimation() {
        const animationContainer = document.createElement('div');
        animationContainer.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:#000;display:flex;align-items:center;justify-content:center;z-index:10000;opacity:0;transition:opacity 0.5s;`;
        
        const timeDisplay = document.createElement('div');
        timeDisplay.style.cssText = `font-size:10vw;font-weight:bold;color:#fff;font-family:Arial,sans-serif;`;
        timeDisplay.textContent = '5:59 AM';
        animationContainer.appendChild(timeDisplay);
        document.body.appendChild(animationContainer);
        
        setTimeout(() => { animationContainer.style.opacity = '1'; }, 50);
        setTimeout(() => {
            timeDisplay.textContent = '6:00 AM';
            this.assets.playSound('chimes', false, 1.0);
        }, 1000);
        setTimeout(() => {
            timeDisplay.style.transition = 'opacity 0.5s';
            timeDisplay.style.opacity = '0';
            setTimeout(() => {
                animationContainer.removeChild(timeDisplay);
                const night6Image = document.createElement('img');
                night6Image.src = 'assets/images/night6.png';
                night6Image.style.cssText = `width:100%;height:100%;object-fit:contain;opacity:0;transition:opacity 1s;`;
                animationContainer.appendChild(night6Image);
                this.assets.playSound('goldenstephenscare', false, 1.0);
                setTimeout(() => { night6Image.style.opacity = '1'; }, 50);
                setTimeout(() => {
                    animationContainer.style.opacity = '0';
                    setTimeout(() => {
                        document.body.removeChild(animationContainer);
                        this.showMainMenu();
                    }, 500);
                }, 5000);
            }, 500);
        }, 3000);
    }
    
    playNightEndAnimation() {
        const animationContainer = document.createElement('div');
        animationContainer.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:#000;display:flex;align-items:center;justify-content:center;z-index:10000;opacity:0;transition:opacity 0.5s;`;
        
        const timeDisplay = document.createElement('div');
        timeDisplay.style.cssText = `font-size:10vw;font-weight:bold;color:#fff;font-family:Arial,sans-serif;`;
        timeDisplay.textContent = '5:59 AM';
        animationContainer.appendChild(timeDisplay);
        document.body.appendChild(animationContainer);
        
        setTimeout(() => { animationContainer.style.opacity = '1'; }, 50);
        setTimeout(() => {
            timeDisplay.textContent = '6:00 AM';
            this.assets.playSound('chimes', false, 1.0);
        }, 1000);
        setTimeout(() => {
            timeDisplay.style.transition = 'opacity 0.5s';
            timeDisplay.style.opacity = '0';
            setTimeout(() => {
                if (this.state.customNight && this.state.currentNight === 7) {
                    timeDisplay.textContent = 'CUSTOM NIGHT COMPLETE';
                    timeDisplay.style.fontSize = '5vw';
                    timeDisplay.style.color = '#0f0';
                } else if (this.state.currentNight < this.state.maxNights) {
                    const daysRemaining = 5 - this.state.currentNight;
                    timeDisplay.textContent = `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} until rescue`;
                    timeDisplay.style.fontSize = '5vw';
                } else {
                    timeDisplay.innerHTML = 'TO BE CONTINUED...<br><span style="font-size:3vw;color:#f00;">Web version port in progress</span>';
                    timeDisplay.style.fontSize = '5vw';
                }
                timeDisplay.style.opacity = '1';
            }, 500);
            
            setTimeout(() => {
                animationContainer.style.opacity = '0';
                setTimeout(() => {
                    document.body.removeChild(animationContainer);
                    if (this.state.customNight && this.state.currentNight === 7) {
                        this.showMainMenu();
                    } else if (this.state.currentNight < this.state.maxNights) {
                        this.state.currentNight++;
                        this.continueToNextNight();
                    } else {
                        this.clearProgress();
                        this.showMainMenu();
                    }
                }, 500);
            }, 3000);
        }, 3000);
    }

    gameOverScreen(message, win = false) {
        this.gameOverText.textContent = message;
        const subtitle = document.getElementById('game-over-subtitle');
        const gameOverStatic = document.getElementById('game-over-static');
        const restartBtn = document.getElementById('restart');
        const mainMenuBtn = document.getElementById('main-menu-btn');
        
        if (restartBtn) restartBtn.style.display = 'none';
        if (mainMenuBtn) mainMenuBtn.style.display = 'none';
        
        if (gameOverStatic) {
            gameOverStatic.currentTime = 0;
            gameOverStatic.play().catch(e => console.log('Failed to play game over static:', e));
        }
        
        if (win) {
            if (this.state.currentNight < this.state.maxNights) {
                this.state.currentNight++;
                subtitle.classList.add('hidden');
                this.gameOverElement.classList.remove('hidden');
                setTimeout(() => {
                    this.gameOverElement.classList.add('hidden');
                    this.gameScreen.classList.remove('active');
                    if (gameOverStatic) { gameOverStatic.pause(); gameOverStatic.currentTime = 0; }
                    this.continueToNextNight();
                }, 3000);
            } else {
                subtitle.textContent = 'TO BE CONTINUED... (Web version port in progress)';
                subtitle.classList.remove('hidden');
                this.gameOverElement.classList.remove('hidden');
                setTimeout(() => {
                    this.gameOverElement.classList.add('hidden');
                    this.showMainMenu();
                }, 3000);
            }
        } else {
            subtitle.classList.add('hidden');
            this.gameOverElement.classList.remove('hidden');
            this.saveProgress();
            setTimeout(() => {
                this.gameOverElement.classList.add('hidden');
                this.showMainMenu();
            }, 3000);
        }
    }
    
    async continueToNextNight() {
        if (!this.assets.loaded) await this.assets.loadAssets();
        
        this.state.reset();
        this.enemyAI.reset();
        this.camera.resetSoundButtonCount();
        
        const cameraPanel = document.getElementById('camera-panel');
        if (cameraPanel) cameraPanel.style.display = '';
        
        await this.showNightIntro();
        
        this.gameScreen.classList.add('active');
        this.ui.currentSceneImg.src = this.assets.images.office.src;
        this.ui.currentSceneImg.style.display = 'block';
        this.viewPosition = 0.25;
        this.ui.updateViewPosition(this.viewPosition);
        this.ui.update();
        this.ui.createHotspots();
        this.initVentFanAnimation();
        this.startGameLoop();
        this.startViewRotation();
        this.enemyAI.start();
        this.assets.playSound('vents', true);
        
        if (this.state.currentNight === 2) this.showTutorial('night2');
        else if (this.state.currentNight === 3) this.showTutorial('night3');
        
        if (this.state.currentNight === 5) {
            setTimeout(() => { this.showGoldenStephen(); }, 1000);
        }
    }

    stopGame() {
        this.state.isGameRunning = false;
        clearInterval(this.timeInterval);
        clearInterval(this.powerInterval);
        this.enemyAI.stop();
    }

    restartGame() {
        this.gameOverElement.classList.add('hidden');
        this.gameScreen.classList.remove('active');
        if (this.state.customNight && this.state.currentNight === 7) {
            this.startCustomNight();
        } else {
            this._startSolo();
        }
    }

    showMainMenu() {
        this.gameOverElement.classList.add('hidden');
        this.gameScreen.classList.remove('active');
        
        if (this.volumeBtn) this.volumeBtn.classList.remove('hidden');
        
        if (this.state.cameraOpen) this.camera.close();
        
        const cameraPanel = document.getElementById('camera-panel');
        if (cameraPanel) {
            cameraPanel.classList.add('hidden');
            cameraPanel.classList.remove('show');
        }
        
        const characterOverlay = document.getElementById('character-overlay');
        if (characterOverlay) characterOverlay.innerHTML = '';
        
        const controlPanel = document.getElementById('control-panel');
        if (controlPanel) controlPanel.classList.add('hidden');
        
        // Limpiar multijugador al volver al menú
        if (this.mp) {
            this.mp.disconnect();
            this.mp = null;
        }
        document.getElementById('mp-player-badge')?.remove();
        document.getElementById('mp-other-cam-indicator')?.remove();
        
        this.mainMenu.classList.remove('hidden');
        this.stopGame();
        this.updateContinueButton();
        
        this.assets.stopSound('vents');
        this.assets.stopSound('static');
        this.assets.stopSound('staticLoop');
        this.assets.stopSound('ventCrawling');
        
        const menuMusic = document.getElementById('menu-music');
        if (menuMusic) {
            menuMusic.loop = true;
            menuMusic.currentTime = 0;
            menuMusic.play().catch(e => console.log('Menu music playback failed:', e));
        }
    }
}
