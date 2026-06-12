// ===== SUBWAY SURFER - Controls =====
(function() {
    'use strict';
    var SG = window.__SG = window.__SG || {};
    var THREE = window.THREE;

    SG.keys = {};

    SG.forceJetpackLanding = function() {
        if (!(SG.state.equippedAbility === 2 && SG.state.canJetpack && SG.state.jetpackFuel > 0)) return false;
        SG.state.jetpackFuel = 0;
        SG.state.jetpackCooldown = SG.JETPACK_COOLDOWN_MAX;
        SG.state.isJumping = false;
        SG.state.hasDoubleJumped = false;
        SG.state.jumpingFromRoof = false;
        SG.state.jumpVelocity = 0;
        SG.state.playerHeight = SG.PLAYER_Y;
        SG.state.targetPlayerHeight = SG.PLAYER_Y;
        if (SG.player) SG.player.position.y = SG.PLAYER_Y;
        return true;
    };

    SG.moveLeft = function() {
        if (SG.state.homelander && SG.homelanderGroup) {
            SG.homelanderGroup.position.x -= 0.35;
            return;
        }
        if (SG.state.currentLane > 0) {
            SG.state.startLaneX = SG.player.position.x;
            SG.state.currentLane--;
            SG.state.targetLane = SG.state.currentLane;
            SG.state.laneLerp = 0;
        }
    };

    SG.moveRight = function() {
        if (SG.state.homelander && SG.homelanderGroup) {
            SG.homelanderGroup.position.x += 0.35;
            return;
        }
        if (SG.state.currentLane < SG.LANE_COUNT - 1) {
            SG.state.startLaneX = SG.player.position.x;
            SG.state.currentLane++;
            SG.state.targetLane = SG.state.currentLane;
            SG.state.laneLerp = 0;
        }
    };

    SG.jump = function() {
        if (SG.state.isJumping) {
            // Only use the EQUIPPED skill
            if (SG.state.equippedAbility === 2 && SG.state.canJetpack && SG.state.jetpackCooldown <= 0 && SG.state.jetpackFuel <= 0) {
                SG.state.jetpackFuel = SG.JETPACK_FUEL_MAX;
                SG.state.jumpVelocity = 0;
                SG.playJumpSound();
                return;
            }
            if (SG.state.equippedAbility === 2 && SG.state.canJetpack && SG.state.jetpackFuel > 0) {
                return;
            }
            if (SG.state.equippedAbility === 1 && SG.state.canDoubleJump && !SG.state.hasDoubleJumped) {
                SG.state.hasDoubleJumped = true;
                SG.state.jumpVelocity = SG.DOUBLE_JUMP_VELOCITY;
                SG.state.playerHeight = Math.max(SG.state.playerHeight, 0.5);
                SG.playJumpSound();
                return;
            }
            return;
        }

        SG.state.isJumping = true;
        if (SG.state.isRolling) {
            SG.state.rollEndTime = Date.now() + 99999;
            SG.state.targetPlayerHeight = SG.ROLL_HEIGHT;
            SG.state.jumpVelocity = SG.JUMP_VELOCITY * 1.5;
            SG.playJumpSound();
            return;
        }
        if (SG.state.onRoof) {
            SG.state.jumpingFromRoof = true;
            SG.state.onRoof = false;
            SG.state.jumpVelocity = SG.JUMP_VELOCITY;
            SG.playJumpSound();
            return;
        }
        SG.state.jumpVelocity = SG.JUMP_VELOCITY;
        SG.playJumpSound();
    };

    SG.roll = function() {
        var landedFromJetpack = SG.forceJetpackLanding();
        if (SG.state.isRolling) return;
        SG.state.isRolling = true;
        SG.state.targetPlayerHeight = SG.ROLL_HEIGHT;
        SG.state.rollEndTime = Date.now() + (landedFromJetpack ? 520 : 400);
        SG.playRollSound();
    };

    SG.handleKeyInput = function(key) {
        if (SG.state.gameOver || !SG.state.started) return;
        if (SG.state.homelander && (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown')) return;

        if (!SG.audioCtx) SG.initAudio();

        switch (key) {
            case 'ArrowLeft':
            case 'a':
            case 'A':
                SG.moveLeft();
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                SG.moveRight();
                break;
            case 'ArrowUp':
            case 'w':
            case 'W':
            case ' ':
                SG.jump();
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                SG.roll();
                break;
        }
    };

    SG.setupControls = function() {
        document.addEventListener('keydown', function(e) {
            SG.keys[e.key] = true;
            if (e.keyCode) { SG.keys['_kc_' + e.keyCode] = true; }

            if (SG.state.homelander && SG.homelanderGroup) {
                var hlSpeed = 0.25;
                var k = e.key, kc = e.keyCode || e.which;
                if (k === 'ArrowLeft' || k === 'a' || k === 'A' || kc === 37 || kc === 65) { SG.homelanderGroup.position.x -= hlSpeed; e.preventDefault(); }
                if (k === 'ArrowRight' || k === 'd' || k === 'D' || kc === 39 || kc === 68) { SG.homelanderGroup.position.x += hlSpeed; e.preventDefault(); }
                if (k === 'ArrowUp' || k === 'w' || k === 'W' || kc === 38 || kc === 87) { SG.homelanderGroup.position.y = Math.min(20, SG.homelanderGroup.position.y + hlSpeed); e.preventDefault(); }
                if (k === 'ArrowDown' || k === 's' || k === 'S' || kc === 40 || kc === 83) { SG.homelanderGroup.position.y = Math.max(1, SG.homelanderGroup.position.y - hlSpeed); e.preventDefault(); }
            }

            if (e.key === 'Escape') {
                var devCon = document.getElementById('dev-console');
                if (devCon && devCon.style.display === 'flex') {
                    SG.toggleConsole();
                    return;
                }
                if (SG.state.started && !SG.state.gameOver) {
                    SG.togglePause();
                    return;
                }
            }
            if (e.key === '`' || e.key === '~') {
                e.preventDefault();
                if (SG.state.started) SG.toggleConsole();
                return;
            }

            if (!SG.state.started && (e.key === ' ' || e.key === 'Enter')) {
                SG.startGameFromMenu();
                return;
            }

            if ((e.key === 'm' || e.key === 'M') && SG.state.started) {
                if (!SG.state.gameOver) {
                    SG.togglePause();
                    setTimeout(SG.quitToMenu, 100);
                } else {
                    SG.quitToMenu();
                }
                return;
            }

            SG.handleKeyInput(e.key);
        });

        document.addEventListener('keyup', function(e) {
            SG.keys[e.key] = false;
        });

        // Touch controls
        var touchStartX = 0, touchStartY = 0, touchStartTime = 0;
        var isTouching = false;

        document.addEventListener('touchstart', function(e) {
            if (SG.state.gameOver) return;
            var touch = e.changedTouches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            touchStartTime = Date.now();
            isTouching = true;
            SG.state.hasStartedTouch = true;
            if (!SG.audioCtx) SG.initAudio();
            e.preventDefault();
        }, { passive: false });

        document.addEventListener('touchmove', function(e) {
            e.preventDefault();
        }, { passive: false });

        document.addEventListener('touchend', function(e) {
            if (SG.state.gameOver) return;
            if (!isTouching) return;
            isTouching = false;

            var touch = e.changedTouches[0];
            var dx = touch.clientX - touchStartX;
            var dy = touch.clientY - touchStartY;
            var elapsed = Date.now() - touchStartTime;

            if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy) * 0.7) {
                if (dx > 0) SG.moveRight();
                else SG.moveLeft();
            } else if (dy < -40 && Math.abs(dy) > Math.abs(dx) * 0.7) {
                SG.jump();
            } else if (dy > 40 && Math.abs(dy) > Math.abs(dx) * 0.7) {
                SG.roll();
            } else if (Math.abs(dx) < 30 && Math.abs(dy) < 30 && elapsed < 300) {
                var third = window.innerWidth / 3;
                if (touch.clientX < third) SG.moveLeft();
                else if (touch.clientX > third * 2) SG.moveRight();
                else SG.jump();
            }

            e.preventDefault();
        }, { passive: false });
    };
})();
