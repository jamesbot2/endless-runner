// ===== SUBWAY SURFER - Homelander Easter Egg =====
(function() {
    'use strict';
    var SG = window.__SG = window.__SG || {};
    var THREE = window.THREE;

    SG.homelanderGroup = null;
    SG.laserBeams = [];
    SG.laserLeftBeam = null;
    SG.laserRightBeam = null;
    SG.homelanderCape = null;

    SG.activateHomelander = function() {
        SG.state.legitRun = false; // Homelander: exclude from leaderboard
        if (!SG.player) return;
        SG.player.visible = false;
        SG.homelanderGroup = new THREE.Group();
        SG.homelanderGroup.position.copy(SG.player.position);
        SG.homelanderGroup.position.y = 6;
        SG.homelanderGroup.rotation.y = Math.PI;

        var suitMat = new THREE.MeshLambertMaterial({ color: 0x1A237E });
        var suitMatDark = new THREE.MeshLambertMaterial({ color: 0x15205A });

        var neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.10, 8), suitMat);
        neck.position.set(0, 1.08, 0);
        SG.homelanderGroup.add(neck);

        var chest = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.35, 0.30), suitMat);
        chest.position.set(0, 0.82, 0);
        SG.homelanderGroup.add(chest);

        var waist = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.25, 0.25), suitMatDark);
        waist.position.set(0, 0.48, 0);
        SG.homelanderGroup.add(waist);

        var shoulderMat = new THREE.MeshLambertMaterial({ color: 0x1A237E });
        var shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.90, 0.10, 0.30), shoulderMat);
        shoulder.position.y = 1.00;
        SG.homelanderGroup.add(shoulder);

        var pecMat = new THREE.MeshLambertMaterial({ color: 0x1E2A6E });
        for (var side = -1; side <= 1; side += 2) {
            var pec = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.06), pecMat);
            pec.position.set(side * 0.14, 0.82, 0.17);
            SG.homelanderGroup.add(pec);
        }

        var skinMat = new THREE.MeshLambertMaterial({ color: 0xFFDDCC });
        var head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 10), skinMat);
        head.position.y = 1.32;
        head.scale.set(1, 1.15, 0.85);
        SG.homelanderGroup.add(head);

        var jaw = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.10, 0.16), skinMat);
        jaw.position.set(0, 1.14, 0.20);
        SG.homelanderGroup.add(jaw);

        var chin = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), skinMat);
        chin.position.set(0, 1.07, 0.24);
        SG.homelanderGroup.add(chin);

        var noseMat = new THREE.MeshLambertMaterial({ color: 0xEECCB8 });
        var nose = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.06), noseMat);
        nose.position.set(0, 1.26, 0.24);
        SG.homelanderGroup.add(nose);
        var noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.025, 4, 4), noseMat);
        noseTip.position.set(0, 1.24, 0.27);
        SG.homelanderGroup.add(noseTip);

        var browMat = new THREE.MeshLambertMaterial({ color: 0xCCAA55 });
        for (var side2 = -1; side2 <= 1; side2 += 2) {
            var brow = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.04), browMat);
            brow.position.set(side2 * 0.08, 1.38, 0.22);
            brow.rotation.z = side2 * 0.15;
            SG.homelanderGroup.add(brow);
        }

        var hairMat = new THREE.MeshLambertMaterial({ color: 0xFFCC00 });
        var hair = new THREE.Mesh(new THREE.SphereGeometry(0.30, 10, 8), hairMat);
        hair.position.set(0, 1.50, 0.02);
        hair.scale.set(1.05, 0.35, 0.75);
        SG.homelanderGroup.add(hair);
        for (var side3 = -1; side3 <= 1; side3 += 2) {
            var sideHair = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.10, 0.12), hairMat);
            sideHair.position.set(side3 * 0.20, 1.42, 0.08);
            SG.homelanderGroup.add(sideHair);
        }
        var swoop = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.20), hairMat);
        swoop.position.set(0, 1.52, -0.08);
        swoop.rotation.x = -0.3;
        SG.homelanderGroup.add(swoop);
        var topHair = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.16), hairMat);
        topHair.position.set(0, 1.53, 0.04);
        SG.homelanderGroup.add(topHair);

        var scleraMat = new THREE.MeshLambertMaterial({ color: 0xFFEEEE });
        var pupilMat = new THREE.MeshBasicMaterial({ color: 0xFF2200 });
        for (var side4 = -1; side4 <= 1; side4 += 2) {
            var sclera = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), scleraMat);
            sclera.position.set(side4 * 0.08, 1.34, 0.22);
            SG.homelanderGroup.add(sclera);
            var pupil = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), pupilMat);
            pupil.position.set(side4 * 0.08, 1.34, 0.24);
            SG.homelanderGroup.add(pupil);
        }

        // Cape
        var capeGroup = new THREE.Group();
        capeGroup.position.set(0, 0.60, -0.28);
        capeGroup.rotation.x = 0.25;
        SG.homelanderGroup.add(capeGroup);
        SG.homelanderCape = capeGroup;

        var CW = 0.9, CH = 0.85;
        var stripeH = CH / 13;
        var ds = THREE.DoubleSide;

        var baseMat = new THREE.MeshBasicMaterial({ color: 0xB22234, side: ds });
        var baseCape = new THREE.Mesh(new THREE.PlaneGeometry(CW, CH), baseMat);
        capeGroup.add(baseCape);

        var whiteMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, side: ds });
        for (var i = 1; i < 13; i += 2) {
            var yPos = CH/2 - (i + 0.5) * stripeH;
            var s = new THREE.Mesh(new THREE.BoxGeometry(CW - 0.02, stripeH * 0.9, 0.015), whiteMat);
            s.position.set(0, yPos, -0.015);
            capeGroup.add(s);
        }

        var cantonW = CW * 0.40;
        var cantonH = stripeH * 7;
        var cantonMat = new THREE.MeshBasicMaterial({ color: 0x3C3B6E, side: ds });
        var canton = new THREE.Mesh(new THREE.BoxGeometry(cantonW, cantonH, 0.015), cantonMat);
        canton.position.set(-CW/2 + cantonW/2, CH/2 - cantonH/2, -0.015);
        capeGroup.add(canton);

        var starMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, side: ds });
        var starCols = [6, 5, 6, 5, 6, 5, 6, 5, 6];
        var cellW = cantonW / 7;
        var cellH = cantonH / 10;
        var starS = Math.min(cellW, cellH) * 0.12;
        var starGeo = new THREE.BoxGeometry(starS, starS, 0.02);
        for (var row = 0; row < 9; row++) {
            for (var col = 0; col < starCols[row]; col++) {
                var sx = -CW/2 + (col + 1) * cellW - cellW/2;
                var sy = CH/2 - (row + 1) * cellH + cellH/2;
                var star = new THREE.Mesh(starGeo, starMat);
                star.position.set(sx, sy, -0.02);
                capeGroup.add(star);
            }
        }

        var backMat = new THREE.MeshBasicMaterial({ color: 0x550000, side: THREE.DoubleSide });
        var backCape = new THREE.Mesh(new THREE.PlaneGeometry(1.24, 0.96), backMat);
        backCape.position.set(0, 0.60, -0.35);
        backCape.rotation.x = 0.25;
        SG.homelanderGroup.add(backCape);

        var claspMat = new THREE.MeshLambertMaterial({ color: 0xFFD700 });
        var clasp = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.04, 6), claspMat);
        clasp.position.set(0, 0.97, -0.13);
        clasp.rotation.x = 0.5;
        SG.homelanderGroup.add(clasp);

        for (var side5 = -1; side5 <= 1; side5 += 2) {
            var btn = new THREE.Mesh(new THREE.CircleGeometry(0.04, 6), new THREE.MeshBasicMaterial({ color: 0xFFD700 }));
            btn.position.set(side5 * 0.12, 0.95, -0.14);
            SG.homelanderGroup.add(btn);
        }

        var emblemMat = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
        var emblem = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.02), emblemMat);
        emblem.position.set(0, 0.75, 0.18);
        SG.homelanderGroup.add(emblem);
        for (var side6 = -1; side6 <= 1; side6 += 2) {
            var wing = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.02), emblemMat);
            wing.position.set(side6 * 0.15, 0.78, 0.18);
            wing.rotation.z = side6 * 0.4;
            SG.homelanderGroup.add(wing);
        }

        var armMat = new THREE.MeshLambertMaterial({ color: 0x1A237E });
        var gloveMat = new THREE.MeshLambertMaterial({ color: 0xCC0000 });
        for (var side7 = -1; side7 <= 1; side7 += 2) {
            var upper = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.20, 0.10), armMat);
            upper.position.set(side7 * 0.34, 0.75, 0);
            SG.homelanderGroup.add(upper);
            var fore = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.08), armMat);
            fore.position.set(side7 * 0.34, 0.48, 0);
            SG.homelanderGroup.add(fore);
            var glove = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.10, 0.10), gloveMat);
            glove.position.set(side7 * 0.34, 0.33, 0);
            SG.homelanderGroup.add(glove);
        }

        var legMat = new THREE.MeshLambertMaterial({ color: 0x1A237E });
        var bootMat = new THREE.MeshLambertMaterial({ color: 0xCC0000 });
        for (var side8 = -1; side8 <= 1; side8 += 2) {
            var thigh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.20, 0.14), legMat);
            thigh.position.set(side8 * 0.14, 0.32, 0);
            SG.homelanderGroup.add(thigh);
            var calf = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.12), legMat);
            calf.position.set(side8 * 0.14, 0.14, 0);
            SG.homelanderGroup.add(calf);
            var boot = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.10, 0.22), bootMat);
            boot.position.set(side8 * 0.14, 0.05, 0.03);
            SG.homelanderGroup.add(boot);
        }

        var belt = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.05, 0.18), new THREE.MeshLambertMaterial({ color: 0x222222 }));
        belt.position.set(0, 0.36, 0.12);
        SG.homelanderGroup.add(belt);
        var buckle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.02), new THREE.MeshBasicMaterial({ color: 0xFFD700 }));
        buckle.position.set(0, 0.36, 0.22);
        SG.homelanderGroup.add(buckle);

        SG.scene.add(SG.homelanderGroup);
        if (window.__neoGame) window.__neoGame.homelanderGroup = SG.homelanderGroup;

        SG.state.isJumping = false;
        SG.state.isRolling = false;
    };

    SG.deactivateHomelander = function() {
        SG.state.homelander = false;
        if (SG.homelanderGroup) {
            if (SG.homelanderCape && SG.homelanderCape.material) {
                if (SG.homelanderCape.material.map) SG.homelanderCape.material.map.dispose();
                SG.homelanderCape.material.dispose();
            }
            SG.scene.remove(SG.homelanderGroup);
            SG.disposeObject(SG.homelanderGroup);
            SG.homelanderGroup = null;
        }
        if (SG.laserLeftBeam) {
            if (SG.laserLeftBeam.userData.glow) {
                SG.scene.remove(SG.laserLeftBeam.userData.glow);
                SG.laserLeftBeam.userData.glow.geometry.dispose();
                SG.laserLeftBeam.userData.glow.material.dispose();
            }
            SG.scene.remove(SG.laserLeftBeam);
            SG.laserLeftBeam.geometry.dispose();
            SG.laserLeftBeam.material.dispose();
        }
        if (SG.laserRightBeam) {
            if (SG.laserRightBeam.userData.glow) {
                SG.scene.remove(SG.laserRightBeam.userData.glow);
                SG.laserRightBeam.userData.glow.geometry.dispose();
                SG.laserRightBeam.userData.glow.material.dispose();
            }
            SG.scene.remove(SG.laserRightBeam);
            SG.laserRightBeam.geometry.dispose();
            SG.laserRightBeam.material.dispose();
        }
        SG.laserLeftBeam = null;
        SG.laserRightBeam = null;
        SG.laserBeams = [];
        SG.homelanderCape = null;
        if (SG.player) SG.player.visible = true;
    };

    SG.updateHomelander = function(delta) {
        if (!SG.state.homelander || !SG.homelanderGroup) return;

        var speed = 0.15;
        var k = SG.keys;
        if (k['ArrowUp'] || k['w'] || k['W']) SG.homelanderGroup.position.y += speed * delta * 60;
        if (k['ArrowDown'] || k['s'] || k['S']) SG.homelanderGroup.position.y -= speed * delta * 60;
        if (k['ArrowLeft'] || k['a'] || k['A']) SG.homelanderGroup.position.x -= speed * delta * 60;
        if (k['ArrowRight'] || k['d'] || k['D']) SG.homelanderGroup.position.x += speed * delta * 60;

        if (!k['ArrowUp'] && !k['w'] && !k['W'] && !k['ArrowDown'] && !k['s'] && !k['S']) {
            SG.homelanderGroup.position.y += Math.sin(SG.state.gameTime * 1.5) * 0.008;
        }

        if (SG.homelanderGroup.position.y < 1) SG.homelanderGroup.position.y = 1;
        if (SG.homelanderGroup.position.y > 20) SG.homelanderGroup.position.y = 20;

        if (SG.homelanderCape) {
            var flutter = Math.sin(SG.state.gameTime * 3);
            var tilt = 0.25 + flutter * 0.20;
            SG.homelanderCape.rotation.x = tilt;
            SG.homelanderCape.rotation.z = Math.sin(SG.state.gameTime * 2.5) * 0.06;
            for (var i = SG.homelanderGroup.children.length - 1; i >= 0; i--) {
                var child = SG.homelanderGroup.children[i];
                if (child === SG.homelanderCape) continue;
                if (Math.abs(child.position.z - (-0.35)) < 0.01) {
                    child.rotation.x = tilt;
                    child.rotation.z = SG.homelanderCape.rotation.z;
                    break;
                }
            }
        }

        var laserLength = 12;
        SG.laserBeams.length = 0;
        var eyeY = SG.homelanderGroup.position.y + 1.35;

        for (var side9 = -1; side9 <= 1; side9 += 2) {
            var bx = SG.homelanderGroup.position.x + side9 * 0.08;
            var by = eyeY;
            var bz = SG.homelanderGroup.position.z + 0.2;

            var dirZ = -1.0;
            var dirY = -0.35;
            var len = Math.sqrt(dirZ * dirZ + dirY * dirY);
            var nz = dirZ / len;
            var ny = dirY / len;

            var beam = side9 === -1 ? SG.laserLeftBeam : SG.laserRightBeam;
            if (!beam) {
                var laserGeo = new THREE.CylinderGeometry(0.025, 0.08, laserLength, 4);
                var laserMat = new THREE.MeshBasicMaterial({
                    color: 0xFF2200, transparent: true, opacity: 0.85,
                    blending: THREE.AdditiveBlending
                });
                beam = new THREE.Mesh(laserGeo, laserMat);
                var glowGeo = new THREE.CylinderGeometry(0.05, 0.15, laserLength, 4);
                var glowMat = new THREE.MeshBasicMaterial({
                    color: 0xFF0000, transparent: true, opacity: 0.2,
                    blending: THREE.AdditiveBlending
                });
                var glow = new THREE.Mesh(glowGeo, glowMat);
                beam.userData.glow = glow;
                SG.scene.add(glow);
                SG.scene.add(beam);
                if (side9 === -1) SG.laserLeftBeam = beam;
                else SG.laserRightBeam = beam;
            }

            if (SG.state.firstPerson) {
                beam.material.opacity = 0.50;
                if (beam.userData.glow) beam.userData.glow.material.opacity = 0.20;
            } else {
                beam.material.opacity = 0.85;
                if (beam.userData.glow) beam.userData.glow.material.opacity = 0.25;
            }
            beam.scale.x = 1;
            beam.scale.z = 1;
            beam.visible = true;
            if (beam.userData.glow) beam.userData.glow.visible = true;

            var endX = bx;
            var endY = by + ny * laserLength;
            var endZ = bz + nz * laserLength;
            var midX = (bx + endX) / 2;
            var midY = (by + endY) / 2;
            var midZ = (bz + endZ) / 2;
            beam.position.set(midX, midY, midZ);

            var angle = Math.atan2(dirZ, dirY);
            beam.rotation.x = angle;

            if (beam.userData.glow) {
                beam.userData.glow.position.copy(beam.position);
                beam.userData.glow.rotation.copy(beam.rotation);
            }

            var pulse = 0.85 + Math.sin(SG.state.gameTime * 8 + side9) * 0.15;
            beam.material.opacity = pulse;
            if (beam.userData.glow) beam.userData.glow.material.opacity = pulse * 0.25;

            for (var oi = SG.state.obstacles.length - 1; oi >= 0; oi--) {
                var obs = SG.state.obstacles[oi];
                var obsZ = obs.position.z;
                if (obsZ > bz || obsZ < bz - laserLength) continue;
                var dx2 = Math.abs(obs.position.x - bx);
                if (dx2 > 0.7) continue;
                var fraction = (bz - obsZ) / laserLength;
                var beamY = by - fraction * Math.abs(ny) * laserLength / Math.abs(nz);
                var obsHeight = obs.userData.height || 0.6;
                var obsTop = obs.position.y + obsHeight;
                if (beamY < obsTop + 0.5 && beamY > obs.position.y - 0.3) {
                    SG.disposeObject(obs);
                    SG.scene.remove(obs);
                    SG.state.obstacles.splice(oi, 1);
                    SG.spawnDestroyParticles(obs.position);
                }
            }
        }

        SG.state.gameOver = false;
    };
})();
