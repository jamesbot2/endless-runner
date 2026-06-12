// ===== SUBWAY SURFER - Collision Detection =====
(function() {
    'use strict';
    const SG = window.__SG = window.__SG || {};
    const THREE = window.THREE;

    SG.checkCollisions = function() {
        if (SG.state.homelander) return false;
        var playerPos = SG.player.position;
        var state = SG.state;
        var playerHitbox = {
            x: playerPos.x,
            y: playerPos.y + (state.isRolling ? 0.1 : 0.7),
            z: playerPos.z,
            w: 0.4,
            h: state.isRolling ? 0.3 : 1.2,
            d: 0.3
        };

        for (var i = 0; i < state.obstacles.length; i++) {
            var obs = state.obstacles[i];
            var od = obs.userData;

            if (state.onRoof) continue;
            if (state.jumpingFromRoof && od.type === 'train') {
                if (Math.abs(playerPos.z - obs.position.z) < 4) continue;
            }

            var obsY, obsH;
            if (od.type === 'roll_under') {
                obsY = od.yOffset || 1.28;
                obsH = od.height || 0.38;
            } else if (od.type === 'low_flying') {
                obsY = 1.0;
                obsH = 0.8;
            } else {
                obsY = obs.position.y + (od.height || 0.6) / 2;
                obsH = od.height || 0.6;
            }

            var obsBox = {
                x: obs.position.x,
                y: obsY,
                z: obs.position.z,
                w: od.width || 1.6,
                h: obsH,
                d: od.depth || 1.0
            };

            if (od.type === 'roll_under' && state.isRolling) continue;

            if (od.type === 'low_flying') {
                if (state.isRolling) continue;
                if (state.isJumping && state.playerHeight > 0.9) continue;
            }

            if (od.type === 'full_barrier') {
                if (Array.isArray(od.blockedLanes)) {
                    var playerLane = state.currentLane;
                    var nearestDist = Infinity;
                    for (var li = 0; li < SG.LANE_POSITIONS.length; li++) {
                        var laneDist = Math.abs(playerPos.x - SG.LANE_POSITIONS[li]);
                        if (laneDist < nearestDist) {
                            nearestDist = laneDist;
                            playerLane = li;
                        }
                    }
                    if (od.blockedLanes.indexOf(playerLane) < 0) continue;
                    obsBox.x = SG.LANE_POSITIONS[playerLane];
                    obsBox.w = od.width || 1.6;
                }
                if (state.isJumping && state.playerHeight > 0.9) continue;
            }

            if (od.type === 'train' && od.hasRamp && !state.onRoof) {
                var trainBack = obs.position.z + (od.depth || 5.5) / 2;
                var rampReach = (od.rampWidth || 2.0) / 2 + playerHitbox.w / 2;
                if (playerPos.z >= trainBack - 1.5 && playerPos.z <= trainBack + 3.5 &&
                    Math.abs(playerPos.x - obsBox.x) < rampReach) {
                    state.onRoof = true;
                    continue;
                }
            }

            if (state.onRoof && od.type === 'train') continue;

            var dx = Math.abs(playerHitbox.x - obsBox.x);
            var dz = Math.abs(playerHitbox.z - obsBox.z);
            var dy = Math.abs(playerHitbox.y - obsBox.y);
            var zThreshold = (playerHitbox.d + obsBox.d) / 2 + 0.1;

            if (state.equippedAbility === 3 && state.canRoofWalk && !state.onRoof) {
                var obsTop = obsBox.y + obsH / 2;
                var playerBottom = playerHitbox.y - playerHitbox.h / 2;
                if (playerBottom >= obsTop - 0.1) {
                    var sideHit = dx < (playerHitbox.w + obsBox.w) / 2 && dz < zThreshold;
                    if (sideHit && playerBottom >= obsTop - 0.1) {
                        state.onRoof = true;
                        state.playerHeight = obsTop + 0.1;
                        continue;
                    }
                    continue;
                }
            }

            if (dx < (playerHitbox.w + obsBox.w) / 2 &&
                dz < zThreshold &&
                dy < (playerHitbox.h + obsH) / 2) {
                return true;
            }
        }
        return false;
    };

    SG.applyCyberColors = function(on) {
        if (!SG.scene) return;
        function gray(c) {
            var r = (c >> 16) & 0xFF, g = (c >> 8) & 0xFF, b = c & 0xFF;
            var lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            var target = lum > 127 ? 200 : 220;
            return (target << 16) | (target << 8) | target;
        }

        SG.scene.traverse(function(child) {
            if (!child.isMesh || !child.material) return;
            var mats = Array.isArray(child.material) ? child.material : [child.material];
            for (var mi = 0; mi < mats.length; mi++) {
                var mat = mats[mi];
                if (!mat.color) continue;
                var hex = mat.color.getHex();
                if (on) {
                    mat.userData = mat.userData || {};
                    if (mat.userData._origColor === undefined) {
                        mat.userData._origColor = hex;
                    }
                    var g = gray(hex);
                    mat.color.setHex(g);
                } else {
                    mat.userData = mat.userData || {};
                    if (mat.userData._origColor !== undefined) {
                        mat.color.setHex(mat.userData._origColor);
                        delete mat.userData._origColor;
                    } else if (child.userData._origColor !== undefined) {
                        mat.color.setHex(child.userData._origColor);
                    }
                }
            }
            if (!on && child.userData._origColor !== undefined) delete child.userData._origColor;
        });

        if (SG.ambientLight) {
            SG.ambientLight.intensity = on ? 1.2 : 0.7;
            SG.ambientLight.color.setHex(0xFFFFFF);
        }
    };
})();
