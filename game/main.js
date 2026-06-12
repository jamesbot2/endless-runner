// ===== SUBWAY SURFER - Main Game Loop & Init =====
(function() {
    'use strict';
    var SG = window.__SG = window.__SG || {};
    var THREE = window.THREE;

    // ===== EASE =====
    SG.easeOutQuad = function(t) {
        return t * (2 - t);
    };

    // ===== CAMERA =====
    SG.updateCamera = function() {
        if (!SG.camera) return;

        var camTarget = (SG.state.homelander && SG.homelanderGroup) ? SG.homelanderGroup.position : (SG.player ? SG.player.position : null);
        if (!camTarget) return;

        if (isNaN(camTarget.x)) camTarget.x = 0;
        if (isNaN(camTarget.y)) camTarget.y = 1;
        if (isNaN(camTarget.z)) camTarget.z = 0;

        if (SG.state.firstPerson) {
            var rollDrop = SG.state.isRolling ? -0.9 : 0;
            var eyeY = camTarget.y + 1.3 + rollDrop;
            var eyeZ = camTarget.z + 0.5;
            SG.camera.position.set(camTarget.x, eyeY, eyeZ);
            SG.camera.lookAt(camTarget.x, camTarget.y + 0.3, camTarget.z - 30);
            if (SG.player) SG.player.visible = false;
            if (SG.homelanderGroup) SG.homelanderGroup.visible = false;
        } else {
            if (SG.homelanderGroup) SG.homelanderGroup.visible = true;
            var targetX = camTarget.x;
            var targetY = camTarget.y + 5;
            var targetZ = camTarget.z + 7;
            var shakeX = 0, shakeY = 0;
            if (SG.state.cameraShake > 0.01) {
                shakeX = (Math.random() - 0.5) * SG.state.cameraShake * 0.3;
                shakeY = (Math.random() - 0.5) * SG.state.cameraShake * 0.3;
            }
            SG.camera.position.x += (targetX + shakeX - SG.camera.position.x) * 0.1;
            SG.camera.position.y += (targetY + shakeY - SG.camera.position.y) * 0.1;
            SG.camera.position.z += (targetZ - SG.camera.position.z) * 0.1;
            SG.camera.lookAt(camTarget.x, camTarget.y - 1, camTarget.z - 10);
            if (SG.player && !SG.state.homelander) SG.player.visible = true;
        }
    };

    // ===== RESET ALL GAME OBJECTS =====
    SG.resetAllGameObjects = function() {
        var i;
        for (i = 0; i < SG.state.trackSegments.length; i++) { SG.scene.remove(SG.state.trackSegments[i]); SG.disposeObject(SG.state.trackSegments[i]); }
        for (i = 0; i < SG.state.obstacles.length; i++) { SG.scene.remove(SG.state.obstacles[i]); SG.disposeObject(SG.state.obstacles[i]); }
        for (i = 0; i < SG.state.coinObjects.length; i++) { SG.scene.remove(SG.state.coinObjects[i]); SG.disposeObject(SG.state.coinObjects[i]); }
        for (i = 0; i < SG.state.buildings.length; i++) { SG.scene.remove(SG.state.buildings[i]); SG.disposeObject(SG.state.buildings[i]); }
        for (i = 0; i < SG.state.particles.length; i++) { SG.scene.remove(SG.state.particles[i]); SG.disposeObject(SG.state.particles[i]); }
        SG.state.trackSegments = [];
        SG.state.obstacles = [];
        SG.state.coinObjects = [];
        SG.state.coinObstacleMap = new Map();
        SG.state.buildings = [];
        SG.state.particles = [];
    };

    SG.resetCyberMode = function() {
        if (SG.applyCyberColors) SG.applyCyberColors(false);
        SG.state.cyberMode = false;
        if (SG.scene) {
            if (SG.scene.background) SG.scene.background.setHex(0x87CEEB);
            if (SG.scene.fog) {
                SG.scene.fog.color.setHex(0x87CEEB);
                SG.scene.fog.near = 60;
                SG.scene.fog.far = 120;
            }
        }
    };

    // ===== QUIT TO MENU =====
    SG.quitToMenu = function() {
        SG.stopPoliceChase();
        SG.resetCyberMode();
        SG.resetAllGameObjects();
        SG.state.score = 0;
        SG.state.coins = 0;
        SG.state.speed = SG.START_SPEED;
        SG.state.gameOver = false;
        SG.state.started = false;
        SG.state.paused = false;
        SG.state.currentLane = 1;
        SG.state.targetLane = 1;
        SG.state.laneLerp = 1;
        SG.state.isJumping = false;
        SG.state.isRolling = false;
        SG.state.jumpVelocity = 0;
        SG.state.playerHeight = SG.PLAYER_Y;
        SG.state.targetPlayerHeight = SG.PLAYER_Y;
        SG.state.lastObstacleZ = 0;
        SG.state.gameTime = 0;
        SG.state.scoreTimer = 0;
        SG.state.instructionTimer = 8;
        SG.state.cameraShake = 0;
        SG.state.hasStartedTouch = false;
        SG.state.onRoof = false;
        SG.state.hasDoubleJumped = false;
        SG.state.jumpingFromRoof = false;
        SG.state.jetpackFuel = 0;
        SG.state.jetpackCooldown = 0;
        SG.state.policeChasing = false;
        SG.state.policeDistance = 12.0;
        SG.state.policeCaught = false;

        if (SG.player) {
            SG.player.position.set(0, 0, 0);
            SG.player.rotation.set(0, Math.PI, 0);
            SG.player.scale.set(1, 1, 1);
        }
        if (SG.camera) {
            SG.camera.position.set(0, 6, 8);
            SG.camera.lookAt(0, 0, -10);
        }

        if (SG.state.homelander) {
            SG.deactivateHomelander();
            SG.state.homelander = false;
        }

        if (SG.state.theme !== 0) {
            SG.switchTheme(0);
        }

        if (SG.gameOverEl) SG.gameOverEl.classList.remove('visible');
        if (SG.pauseOverlay) SG.pauseOverlay.style.display = 'none';
        SG.stopBgMusic();
        if (SG.pauseBtnEl) SG.pauseBtnEl.style.display = 'none';
        if (SG.menuOverlay) SG.menuOverlay.style.display = 'flex';
        SG.updateMenuCredits();
        ['mute-btn'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        SG.spawnInitialTrack();
        SG.spawnBuildings();
        SG.spawnObstacles();
    };

    // ===== RESTART GAME =====
    SG.restartGame = function() {
        SG.stopPoliceChase();
        SG.resetCyberMode();
        SG.resetAllGameObjects();

        SG.state.score = 0;
        SG.state.coins = 0;
        SG.state.speed = SG.START_SPEED;
        SG.state.gameOver = false;
        SG.state.started = true;
        SG.state.paused = false;
        SG.state.onRoof = false;
        SG.state.currentLane = 1;
        SG.state.targetLane = 1;
        SG.state.laneLerp = 1;
        SG.state.isJumping = false;
        SG.state.isRolling = false;
        SG.state.jumpVelocity = 0;
        SG.state.playerHeight = SG.PLAYER_Y;
        SG.state.targetPlayerHeight = SG.PLAYER_Y;
        SG.state.lastObstacleZ = 0;
        SG.state.gameTime = 0;
        SG.state.scoreTimer = 0;
        SG.state.cameraShake = 0;
        SG.state.hasStartedTouch = false;
        SG.state.hasDoubleJumped = false;
        SG.state.jumpingFromRoof = false;
        SG.state.jetpackFuel = 0;
        SG.state.jetpackCooldown = 0;
        SG.state.policeChasing = false;
        SG.state.policeDistance = 12.0;
        SG.state.policeCaught = false;

        if (SG.player) {
            SG.player.position.set(0, SG.PLAYER_Y, 0);
            SG.player.rotation.set(0, Math.PI, 0);
            SG.player.scale.set(1, 1, 1);
        }
        if (SG.camera) {
            SG.camera.position.set(0, 5.5, 7);
            SG.camera.lookAt(0, 0, -10);
        }

        if (SG.pauseBtnEl) {
            SG.pauseBtnEl.style.display = 'block';
            SG.pauseBtnEl.textContent = '\u23F8';
        }
        if (SG.gameOverEl) SG.gameOverEl.classList.remove('visible');
        if (SG.pauseOverlay) SG.pauseOverlay.style.display = 'none';
        if (SG.clock) SG.clock.getDelta();

        if (SG.state.homelander) {
            SG.deactivateHomelander();
            SG.state.homelander = false;
        }

        if (SG.state.theme !== 0) {
            SG.switchTheme(0);
        }

        SG.spawnInitialTrack();
        SG.spawnBuildings();
        SG.spawnObstacles();
    };

    // ===== GAME OVER =====
    SG.gameOver = function() {
        SG.state.gameOver = true;
        SG.state.cameraShake = 0.5;
        SG.createCrashParticles(SG.player.position.clone());
        SG.playCrashSound();
        SG.stopSiren();
        SG.stopPoliceChase();

        var score = Math.floor(SG.state.score);
        if (score > SG.state.bestScore) {
            SG.state.bestScore = score;
            try { localStorage.setItem('subwayBest', String(score)); } catch(e) {}
        }
        // Per-difficulty max distance (NOT in homelander mode)
        if (!SG.state.homelander) {
            var diff = SG.state.difficulty;
            var diffKey = ['maxEasy','maxMedium','maxHard'][diff] || 'maxHard';
            var abilityKey = diffKey + 'Ability';
            if (score > (SG.state[diffKey] || 0)) {
                SG.state[diffKey] = score;
                SG.state[abilityKey] = SG.state.equippedAbility || 0;
            }
        }
        SG.finalScoreEl.textContent = score;
        SG.finalCoinsEl.textContent = SG.state.coins;

        var multipliers = [1, 5, 10];
        var multiplier = multipliers[SG.state.difficulty] || 1;
        var earned = SG.state.coins * multiplier;

        // Homelander: don't save coins/credits or shop data
        if (!SG.state.homelander) {
            SG.state.credits += earned;
            SG.state.totalCoins += SG.state.coins;
            try {
                localStorage.setItem('subwayCredits', String(SG.state.credits));
                localStorage.setItem('subwayTotalCoins', String(SG.state.totalCoins));
            } catch(e) {}
            SG.saveShopData();
        } else {
            earned = 0; // Homelander: show 0 credits earned
        }

        var oldCredits = document.getElementById('credits-earned');
        if (oldCredits) oldCredits.remove();
        var creditsInfo = document.createElement('div');
        creditsInfo.id = 'credits-earned';
        creditsInfo.className = 'final-coins';
        creditsInfo.style.color = '#FFD700';
        creditsInfo.style.fontSize = '14px';
        creditsInfo.textContent = '+ ' + earned + ' credits (' + multiplier + 'x)';
        var refEl = SG.gameOverEl.querySelector('.final-coins');
        if (refEl) refEl.after(creditsInfo);

        SG.gameOverEl.classList.add('visible');
        var bestEl = document.getElementById('best-score');
        if (bestEl) bestEl.textContent = 'BEST: ' + SG.state.bestScore + 'm';
        if (SG.pauseBtnEl) SG.pauseBtnEl.style.display = 'none';
        var muteGO = document.getElementById('mute-btn');
        if (muteGO) muteGO.style.display = 'none';
    };

    // ===== UPDATE LOOP =====
    SG.update = function() {
        if (SG.state.gameOver) {
            if (SG.state.cameraShake > 0) {
                SG.state.cameraShake *= 0.95;
                if (SG.state.cameraShake < 0.01) SG.state.cameraShake = 0;
            }
            SG.updateCamera();
            return;
        }
        if (!SG.state.started || SG.state.paused) {
            return;
        }

        var delta = Math.min(SG.clock.getDelta(), 0.05);
        SG.state.gameTime += delta;
        if (SG.updatePlayerModelAnimation) SG.updatePlayerModelAnimation(delta);

        // Speed increase
        if (SG.state.speed < SG.MAX_SPEED) {
            SG.state.speed += SG.getDifficultySpeedIncrement() * delta * 60;
            if (SG.state.speed > SG.MAX_SPEED) SG.state.speed = SG.MAX_SPEED;
        }

        // Distance is meters; faster speeds cover more meters per second.
        SG.state.score += SG.getDistanceRate(SG.state.speed) * delta;

        SG.state.policeTotalDistance += delta * SG.state.speed * 60;

        // Update score display
        if (SG.scoreEl) SG.scoreEl.textContent = Math.floor(SG.state.score);
        if (SG.coinsEl) SG.coinsEl.textContent = SG.state.coins;
        if (SG.updateAbilityVisuals) SG.updateAbilityVisuals();
        if (SG.updateAbilityHUD) SG.updateAbilityHUD();

        // Speed indicator
        var speedEl = document.getElementById('speed-indicator');
        if (speedEl) {
            var speedLevel = SG.getSpeedLevel(SG.state.speed);
            speedEl.textContent = 'SPD: ' + speedLevel + 'x';
            speedEl.style.color = speedLevel > 35 ? 'rgba(255,30,30,1)' : speedLevel > 15 ? 'rgba(255,100,50,0.9)' : 'rgba(255,255,255,0.5)';
        }

        // Update best score HUD
        var hudBest = document.getElementById('hud-best');
        if (hudBest) hudBest.textContent = 'BEST: ' + SG.state.bestScore + 'm';

        // Instructions fade
        if (SG.state.instructionTimer > 0) {
            SG.state.instructionTimer -= delta;
            if (SG.state.instructionTimer <= 0) {
                SG.instructionsEl.style.opacity = '0';
            } else if (SG.state.instructionTimer < 3) {
                SG.instructionsEl.style.opacity = SG.state.instructionTimer / 3;
            }
        }

        // Move track segments
        for (var si = 0; si < SG.state.trackSegments.length; si++) {
            SG.state.trackSegments[si].position.z += SG.state.speed * delta * 60;
        }

        // Recycle track segments
        for (var ti = SG.state.trackSegments.length - 1; ti >= 0; ti--) {
            if (SG.state.trackSegments[ti].position.z > SG.TRACK_SEGMENT_LENGTH) {
                SG.state.trackSegments[ti].position.z -= SG.TRACK_SEGMENT_LENGTH * SG.state.trackSegments.length;
            }
        }

        // Move obstacles
        for (var oi = 0; oi < SG.state.obstacles.length; oi++) {
            SG.state.obstacles[oi].position.z += SG.state.speed * delta * 60;
        }

        // Moving obstacles
        for (var mi = 0; mi < SG.state.obstacles.length; mi++) {
            var obs = SG.state.obstacles[mi];
            if (obs.userData.moving) {
                var ud = obs.userData;
                ud.movePhase += delta * 2.0;
                var offset = Math.sin(ud.movePhase) * SG.LANE_WIDTH * 1.0;
                obs.position.x = ud.baseX + offset;
                if (ud.warningLights) {
                    var flashOn = Math.sin(SG.state.gameTime * 12) > 0;
                    for (var wli = 0; wli < ud.warningLights.length; wli++) {
                        var light = ud.warningLights[wli];
                        if (light && light.material) {
                            light.material.color.setHex(flashOn ? 0xFFFF00 : 0x886600);
                        }
                    }
                }
            }
        }

        // Move coins
        for (var ci = 0; ci < SG.state.coinObjects.length; ci++) {
            var coin = SG.state.coinObjects[ci];
            coin.position.z += SG.state.speed * delta * 60;
            coin.rotation.y += delta * 3;
            var children = coin.children;
            if (children.length > 0) {
                children[0].position.y = 0.6 + Math.sin(SG.state.gameTime * 2 + coin.id) * 0.1;
                if (children[1] && children[1].type === 'RingGeometry') {
                    children[1].position.y = 0.6 + Math.sin(SG.state.gameTime * 2 + coin.id) * 0.1;
                }
            }
        }

        // Move buildings
        for (var bi = 0; bi < SG.state.buildings.length; bi++) {
            SG.state.buildings[bi].position.z += SG.state.speed * delta * 60;
        }

        // Particles
        for (var pi = SG.state.particles.length - 1; pi >= 0; pi--) {
            var p = SG.state.particles[pi];
            var pud = p.userData;
            p.position.x += pud.vx;
            p.position.y += pud.vy;
            p.position.z += pud.vz;
            pud.vy -= 0.003;
            pud.life -= pud.decay;
            p.material.opacity = Math.max(0, pud.life);
            p.scale.setScalar(pud.life);
            if (pud.life <= 0) {
                SG.scene.remove(p);
                SG.state.particles.splice(pi, 1);
            }
        }

        // Player lane movement
        if (SG.state.laneLerp < 1) {
            SG.state.laneLerp += delta * 10;
            if (SG.state.laneLerp > 1) SG.state.laneLerp = 1;
            var targetX = SG.LANE_POSITIONS[SG.state.targetLane];
            SG.player.position.x = SG.state.startLaneX + (targetX - SG.state.startLaneX) * SG.easeOutQuad(SG.state.laneLerp);
        } else {
            SG.player.position.x = SG.LANE_POSITIONS[SG.state.currentLane];
        }

        // Jetpack
        if (SG.state.isJumping && SG.state.equippedAbility === 2 && SG.state.canJetpack && SG.state.jetpackFuel > 0 && SG.state.jetpackCooldown <= 0) {
            SG.state.jumpVelocity = 0;
            if (SG.state.playerHeight < SG.JETPACK_MAX_HEIGHT) {
                SG.state.playerHeight += SG.JETPACK_LIFT * delta * 60;
                if (SG.state.playerHeight > SG.JETPACK_MAX_HEIGHT) SG.state.playerHeight = SG.JETPACK_MAX_HEIGHT;
            }
            SG.state.jetpackFuel -= delta;
            if (SG.state.jetpackFuel <= 0) {
                SG.state.jetpackFuel = 0;
                SG.state.jetpackCooldown = SG.JETPACK_COOLDOWN_MAX;
            }
        } else if (SG.state.jetpackCooldown > 0) {
            SG.state.jetpackCooldown -= delta;
            if (SG.state.jetpackCooldown < 0) SG.state.jetpackCooldown = 0;
        }

        // Jump physics
        if (SG.state.isJumping) {
            SG.state.playerHeight += SG.state.jumpVelocity * delta * 60;
            var gravMult = SG.state.isRolling ? 2.5 : 1.0;
            SG.state.jumpVelocity += SG.GRAVITY * gravMult * delta * 60;
            if (SG.state.playerHeight <= SG.PLAYER_Y) {
                SG.state.playerHeight = SG.PLAYER_Y;
                SG.state.isJumping = false;
                SG.state.hasDoubleJumped = false;
                SG.state.jumpingFromRoof = false;
                SG.state.jumpVelocity = 0;
                if (SG.state.isRolling && !SG.state.rolledLand) {
                    SG.state.rolledLand = true;
                    SG.state.rolledLandTime = Date.now();
                }
            }
        }

        // Roll height
        if (SG.state.isRolling) {
            SG.state.playerHeight += (SG.state.targetPlayerHeight - SG.state.playerHeight) * 0.2;
            if (Math.abs(SG.state.playerHeight - SG.state.targetPlayerHeight) < 0.01) {
                SG.state.playerHeight = SG.state.targetPlayerHeight;
            }
        } else if (!SG.state.isJumping) {
            SG.state.playerHeight += (SG.PLAYER_Y - SG.state.playerHeight) * 0.2;
            if (Math.abs(SG.state.playerHeight - SG.PLAYER_Y) < 0.01) {
                SG.state.playerHeight = SG.PLAYER_Y;
            }
        }

        SG.player.position.y = SG.state.playerHeight;

        // Roll scale
        if (SG.state.isRolling) {
            var scaleY = (SG.ROLL_HEIGHT + 0.2) / (SG.PLAYER_Y + 0.2);
            SG.player.scale.y = 1 - (1 - scaleY) * 0.7;
            SG.player.position.y = SG.state.playerHeight;
        } else {
            SG.player.scale.y += (1 - SG.player.scale.y) * 0.15;
        }

        // Roll release
        if (SG.state.isRolling && !SG.state.isJumping) {
            var now = Date.now();
            var rollReleaseDelay = Math.max(0, Math.min(1000, SG.state.rollReleaseDelay || 200));
            var downHeld = SG.isActionHeld ? SG.isActionHeld('down') : SG.keys['ArrowDown'];
            if (downHeld) {
                SG.state.rollEndTime = now + rollReleaseDelay;
                SG.state.rolledLand = false;
            } else if (SG.state.rolledLand && now > SG.state.rolledLandTime + 400) {
                SG.state.isRolling = false;
                SG.state.targetPlayerHeight = SG.PLAYER_Y;
                SG.state.rolledLand = false;
            } else if (now < SG.state.rollEndTime) {
                // still in min roll duration
            } else {
                SG.state.isRolling = false;
                SG.state.targetPlayerHeight = SG.PLAYER_Y;
            }
        }

        // Roof mechanics
        if (SG.state.onRoof && !SG.state.isJumping) {
            SG.state.playerHeight = SG.ROOF_TOP_Y + SG.PLAYER_Y;
            SG.player.position.y = SG.state.playerHeight;
            var hasSurfaceBelow = SG.state.obstacles.some(function(o) {
                return Math.abs(o.position.z) < 4 &&
                    Math.abs(o.position.x - SG.player.position.x) < 1.5;
            });
            if (!hasSurfaceBelow) {
                SG.state.onRoof = false;
            }
        }

        if (SG.state.jumpingFromRoof && !SG.state.isJumping) {
            SG.state.jumpingFromRoof = false;
        }

        // Running animation
        var runCycle = SG.state.gameTime * 8;
        if (!SG.state.isJumping && !SG.state.isRolling) {
            SG.player.position.y += Math.sin(runCycle) * 0.04;
        }

        if (SG.playerLeftArm && SG.playerRightArm) {
            SG.playerLeftArm.rotation.x = Math.sin(runCycle) * 0.4;
            SG.playerRightArm.rotation.x = Math.sin(runCycle + Math.PI) * 0.4;
        }
        if (SG.playerLeftLeg && SG.playerRightLeg) {
            SG.playerLeftLeg.rotation.x = Math.sin(runCycle + Math.PI) * 0.3;
            SG.playerRightLeg.rotation.x = Math.sin(runCycle) * 0.3;
        }

        // Body lean
        var leanTargetX = SG.LANE_POSITIONS[SG.state.targetLane];
        var leanTarget = (SG.player.position.x - leanTargetX) * 0.3;
        SG.player.rotation.z += (leanTarget - SG.player.rotation.z) * 0.1;

        // Coin collection
        for (var coi = SG.state.coinObjects.length - 1; coi >= 0; coi--) {
            var coinObj = SG.state.coinObjects[coi];
            var coinLane = coinObj.userData.lane;
            var coinX = SG.LANE_POSITIONS[coinLane];
            var dx = Math.abs(SG.player.position.x - coinX);
            var dz = Math.abs(SG.player.position.z - coinObj.position.z);

            if (dx < 0.8 && dz < 0.8 && !coinObj.userData.collected) {
                coinObj.userData.collected = true;
                SG.createCoinParticles(coinObj.position.clone());
                SG.state.coins++;
                SG.playCoinSound();
                SG.scene.remove(coinObj);
                SG.state.coinObjects.splice(coi, 1);
                // Police pushback
                SG.coinPushBackPolice();
            }

            if (coinObj.position.z > SG.DESPAWN_BEHIND) {
                SG.scene.remove(coinObj);
                SG.state.coinObjects.splice(coi, 1);
            }
        }

        // Spawn new objects
        SG.spawnObstacles();
        SG.spawnBuildings();

        // Homelander override
        if (SG.state.homelander) SG.state.gameOver = false;

        // Collision
        if (SG.checkCollisions()) {
            SG.gameOver();
            SG.updateCamera();
            return;
        }

        // Theme change
        SG.checkThemeChange();

        // Background color changes with speed
        var speedLvl = SG.getSpeedLevel(SG.state.speed);
        var speedRatio = Math.min(SG.state.speed / SG.MAX_SPEED, 1.0);
        var inCyber = speedLvl >= 48;
        if (inCyber !== SG.state.cyberMode) {
            SG.state.cyberMode = inCyber;
            SG.applyCyberColors(inCyber);
        }
        if (inCyber) {
            SG.scene.background.setHex(0x000000);
            SG.scene.fog.color.setHex(0x000000);
            SG.scene.fog.near = 25;
            SG.scene.fog.far = 70;
        } else if (speedRatio < 0.3) {
            SG.scene.background.setHex(0x87CEEB);
            SG.scene.fog.color.setHex(0x87CEEB);
            SG.scene.fog.near = 60;
            SG.scene.fog.far = 120;
        } else if (speedRatio < 0.6) {
            var t = (speedRatio - 0.3) / 0.3;
            var r = Math.round(0x87 * (1-t) + 0xFF * t);
            var g = Math.round(0xCE * (1-t) + 0x99 * t);
            var b = Math.round(0xEB * (1-t) + 0x33 * t);
            SG.scene.background.setRGB(r/255, g/255, b/255);
            SG.scene.fog.color.copy(SG.scene.background);
        } else {
            var t2 = Math.min((speedRatio - 0.6) / 0.4, 1.0);
            var r2 = Math.round(0xFF * (1-t2) + 0x55 * t2);
            var g2 = Math.round(0x99 * (1-t2) + 0x11 * t2);
            var b2 = Math.round(0x33 * (1-t2) + 0x11 * t2);
            SG.scene.background.setRGB(r2/255, g2/255, b2/255);
            SG.scene.fog.color.copy(SG.scene.background);
        }

        // Police chase: start after 100m
        if (!SG.state.policeChasing && SG.state.policeTotalDistance > 200 && !SG.state.gameOver && !SG.state.homelander) {
            SG.startPoliceChase();
        }

        // Police update
        if (SG.state.policeChasing) {
            SG.updatePolice(delta);
            if (SG.state.policeCaught) {
                SG.updateCamera();
                return;
            }
        }

        if (SG.state.homelander) SG.updateHomelander(delta);
        SG.updateBgMusic(delta);
        if (SG.updateAbilityHUD) SG.updateAbilityHUD();
        SG.updateCamera();
    };

    SG.updateAbilityHUD = function() {
        var skillEl = document.getElementById('skill-indicator');
        var jetEl = document.getElementById('jetpack-timer');
        if (!skillEl || !jetEl) return;

        if (!SG.state.started || SG.state.gameOver || SG.state.paused) {
            skillEl.style.display = 'none';
            jetEl.style.display = 'none';
            return;
        }

        var abilityNames = ['None', 'Double Jump', 'Jetpack', 'Roof Walk'];
        var abilityIcons = ['-', 'DJ', 'JET', 'ROOF'];
        var ability = SG.state.equippedAbility || 0;
        skillEl.style.display = 'block';
        skillEl.textContent = 'SKILL: ' + (abilityIcons[ability] || '-') + ' ' + (abilityNames[ability] || 'None');

        if (ability === 2 && SG.state.canJetpack) {
            jetEl.style.display = 'block';
            if (SG.state.jetpackFuel > 0) {
                var fuel = Math.max(0, SG.state.jetpackFuel);
                var capped = SG.state.playerHeight >= SG.JETPACK_MAX_HEIGHT - 0.01;
                jetEl.textContent = 'JETPACK: ' + fuel.toFixed(1) + 's' + (capped ? ' | MAX ALT' : '');
                jetEl.style.borderColor = 'rgba(100,200,255,0.45)';
            } else if (SG.state.jetpackCooldown > 0) {
                jetEl.textContent = 'JETPACK CD: ' + SG.state.jetpackCooldown.toFixed(1) + 's';
                jetEl.style.borderColor = 'rgba(255,120,80,0.45)';
            } else {
                jetEl.textContent = 'JETPACK READY';
                jetEl.style.borderColor = 'rgba(80,255,160,0.45)';
            }
        } else {
            jetEl.style.display = 'none';
        }
    };

    SG.updateAbilityVisuals = function() {
        var showDJ = SG.state.equippedAbility === 1 && SG.state.canDoubleJump;
        var showJetpack = SG.state.equippedAbility === 2 && SG.state.canJetpack;
        var showRW = SG.state.equippedAbility === 3 && SG.state.canRoofWalk;

        if (SG.shoesLeft) SG.shoesLeft.visible = false;
        if (SG.shoesRight) SG.shoesRight.visible = false;
        var showNeoShoeOverlay = (SG.state.selectedCharacter || 'runner') === 'runner';
        if (SG.shoesDJLeft) SG.shoesDJLeft.visible = showDJ && showNeoShoeOverlay;
        if (SG.shoesDJRight) SG.shoesDJRight.visible = showDJ && showNeoShoeOverlay;
        if (SG.shoesRWLeft) SG.shoesRWLeft.visible = showRW && showNeoShoeOverlay;
        if (SG.shoesRWRight) SG.shoesRWRight.visible = showRW && showNeoShoeOverlay;

        if (showRW && SG.shoesRWLeft && SG.shoesRWRight) {
            var pulse = 0.45 + Math.sin(SG.state.gameTime * 8) * 0.25;
            SG.shoesRWLeft.material.emissiveIntensity = pulse;
            SG.shoesRWRight.material.emissiveIntensity = pulse;
        }

        if (SG.jetpackPack) {
            SG.jetpackPack.visible = showJetpack;
            SG.jetpackPack.position.set(0, 0.95, -0.34);
        }

        var flameOn = showJetpack && SG.state.jetpackFuel > 0 && SG.state.jetpackCooldown <= 0;
        if (SG.jetpackFlame) {
            SG.jetpackFlame.visible = flameOn;
            SG.jetpackFlame.scale.setScalar(flameOn ? 0.85 + Math.sin(SG.state.gameTime * 18) * 0.15 : 1);
        }
        if (SG.jetpackFlameInner) {
            SG.jetpackFlameInner.visible = flameOn;
            SG.jetpackFlameInner.scale.setScalar(flameOn ? 0.9 + Math.sin(SG.state.gameTime * 22) * 0.12 : 1);
        }
    };

    // ===== RENDER LOOP =====
    SG.animate = function() {
        requestAnimationFrame(SG.animate);
        try {
            SG.update();
            if (SG.camera && !isNaN(SG.camera.position.x)) {
                SG.renderer.render(SG.scene, SG.camera);
            }
        } catch(e) {
            console.error('Game error:', e);
        }
    };

    // ===== INIT =====
    SG.init = function() {
        // Check Three.js loaded
        if (typeof THREE === 'undefined') {
            var errDiv = document.getElementById('three-error');
            if (errDiv) errDiv.style.display = 'block';
            return;
        }

        SG.initScene();
        if (SG.loadVehicleModels) SG.loadVehicleModels();
        if (SG.loadSceneryModels) SG.loadSceneryModels();
        SG.loadShopData();
        if (typeof SG.setupUI !== 'function') { SG.setupUI = function() { console.warn('setupUI missing - ui.js may not have loaded'); }; }
        SG.setupUI();
        SG.createPlayer();
        SG.spawnInitialTrack();
        SG.spawnBuildings();
        SG.spawnObstacles();
        SG.setupControls();

        if (SG.camera) {
            SG.camera.position.set(0, 6, 8);
            SG.camera.lookAt(0, 0, -10);
        }

        if (SG.scoreEl) SG.scoreEl.textContent = '0';
        if (SG.coinsEl) SG.coinsEl.textContent = '0';

        SG.updateMenuCredits();

        if (SG.menuOverlay) SG.menuOverlay.style.display = 'flex';
        SG.state.started = false;

        window.__neoGame = { state: SG.state, scene: SG.scene, camera: SG.camera, player: SG.player, renderer: SG.renderer, animate: SG.animate, restartGame: SG.restartGame, quitToMenu: SG.quitToMenu, togglePause: SG.togglePause, homelanderGroup: SG.homelanderGroup };

        SG.animate();
    };

    // Init triggered by account.js after override
})();
