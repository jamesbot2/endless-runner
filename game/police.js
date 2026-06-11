// ===== SUBWAY SURFER - Police Chase System =====
(function() {
    'use strict';
    var SG = window.__SG = window.__SG || {};
    var THREE = window.THREE;

    var policeGroup = null;
    var lightLeft, lightRight;
    var lastSirenToggle = 0;

    SG.createPoliceCar = function() {
        if (policeGroup) {
            SG.scene.remove(policeGroup);
            SG.disposeObject(policeGroup);
        }
        policeGroup = new THREE.Group();

        // Main body (black/white)
        var bodyMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
        var body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 3.0), bodyMat);
        body.position.set(0, 0.25, 0);
        policeGroup.add(body);

        // White doors
        var doorMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
        for (var side = -1; side <= 1; side += 2) {
            var door = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.8), doorMat);
            door.position.set(side * 0.81, 0.3, 0);
            policeGroup.add(door);
        }

        // Roof / cabin
        var cabinMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
        var cabin = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.3, 1.4), cabinMat);
        cabin.position.set(0, 0.65, -0.2);
        policeGroup.add(cabin);

        // Windshield
        var glassMat = new THREE.MeshBasicMaterial({ color: 0x88CCFF, transparent: true, opacity: 0.5 });
        var windshield = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.25, 0.02), glassMat);
        windshield.position.set(0, 0.65, -0.9);
        policeGroup.add(windshield);

        // Rear window
        var rearWindow = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.25, 0.02), glassMat);
        rearWindow.position.set(0, 0.65, 0.9);
        policeGroup.add(rearWindow);

        // Light bar on roof
        var barMat = new THREE.MeshLambertMaterial({ color: 0xCCCCCC });
        var lightBar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.25), barMat);
        lightBar.position.set(0, 0.85, -0.2);
        policeGroup.add(lightBar);

        // Red light
        var redMat = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
        lightLeft = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), redMat);
        lightLeft.position.set(-0.3, 0.93, -0.2);
        policeGroup.add(lightLeft);

        // Blue light
        var blueMat = new THREE.MeshBasicMaterial({ color: 0x0044FF });
        lightRight = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), blueMat);
        lightRight.position.set(0.3, 0.93, -0.2);
        policeGroup.add(lightRight);

        // Headlights
        var headMat = new THREE.MeshBasicMaterial({ color: 0xFFFFAA });
        for (var side2 = -1; side2 <= 1; side2 += 2) {
            var head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.05), headMat);
            head.position.set(side2 * 0.4, 0.2, 1.55);
            policeGroup.add(head);
        }

        // Tail lights
        var tailMat = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
        for (var side3 = -1; side3 <= 1; side3 += 2) {
            var tail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.08, 0.04), tailMat);
            tail.position.set(side3 * 0.4, 0.2, -1.55);
            policeGroup.add(tail);
        }

        // Wheels (simple discs)
        var wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
        for (var side4 = -1; side4 <= 1; side4 += 2) {
            for (var wf = -1; wf <= 1; wf += 2) {
                var wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.05, 8), wheelMat);
                wheel.rotation.z = Math.PI / 2;
                wheel.position.set(side4 * 0.85, 0.08, wf * 0.9);
                policeGroup.add(wheel);
            }
        }

        // Siren text decal (POLICE)
        var decalMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        var decal = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.02), decalMat);
        decal.position.set(0, 0.35, 0.75);
        policeGroup.add(decal);
        // Small badge decal
        var badgeMat = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
        var badge = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.02), badgeMat);
        badge.position.set(-0.3, 0.35, 0.75);
        policeGroup.add(badge);

        // Position behind player
        policeGroup.position.set(SG.player ? SG.player.position.x : 0, 0, 8);
        SG.scene.add(policeGroup);
        return policeGroup;
    };

    SG.updatePolice = function(delta) {
        if (!SG.state.policeChasing || !policeGroup || SG.state.gameOver) return;

        var playerPos = SG.player ? SG.player.position : { x: 0, z: 0 };

        // Police catches up at a SLOW constant rate (not speed-proportional)
        // 0.0015 per frame ~= 0.09 units/sec at 60fps = ~90 seconds to close 8m gap
        var catchRate = 0.0015;
        // Speed up slightly at higher player speeds for challenge
        catchRate += Math.max(0, (SG.state.speed - 0.5)) * 0.0005;
        
        SG.state.policeDistance -= catchRate * delta * 60;

        // Clamp police distance
        if (SG.state.policeDistance < 0) SG.state.policeDistance = 0;
        if (SG.state.policeDistance > 12) SG.state.policeDistance = 12;

        // Position police car behind the player
        policeGroup.position.x += (playerPos.x - policeGroup.position.x) * 0.05;
        policeGroup.position.z = SG.state.policeDistance;

        // Orient police car to face forward (-Z)
        policeGroup.rotation.y = Math.PI;

        // Flashing lights
        var time = Date.now() / 1000;
        var flashOn = Math.sin(time * 8) > 0;
        if (lightLeft && lightRight) {
            lightLeft.material.color.setHex(flashOn ? 0xFF0000 : 0x880000);
            lightRight.material.color.setHex(flashOn ? 0x0000FF : 0x000088);
            var flashScale = flashOn ? 1.3 : 0.7;
            lightLeft.scale.setScalar(flashScale);
            lightRight.scale.setScalar(flashScale);
        }

        // Siren starts when police gets closer
        if (SG.state.policeDistance < 6 && !SG.state.policeSiren) {
            SG.startSiren();
        } else if (SG.state.policeDistance >= 8 && SG.state.policeSiren) {
            SG.stopSiren();
        }

        // Update HUD
        var policeEl = document.getElementById('police-indicator');
        if (policeEl) {
            policeEl.style.display = 'block';
            var dist = Math.round(SG.state.policeDistance * 10) / 10;
            policeEl.textContent = '\uD83D\uDE94 DISTANCE: ' + dist + 'm';
            if (dist < 2) {
                policeEl.style.color = '#ff0000';
                policeEl.style.borderColor = 'rgba(255,0,0,0.6)';
            } else if (dist < 4) {
                policeEl.style.color = '#ff6600';
                policeEl.style.borderColor = 'rgba(255,100,0,0.4)';
            } else {
                policeEl.style.color = '#ffaa00';
                policeEl.style.borderColor = 'rgba(255,200,0,0.3)';
            }
        }

        // Check if caught
        if (SG.state.policeDistance < 0.5) {
            SG.state.policeCaught = true;
            SG.stopSiren();
            SG.gameOver();
        }
    };

    SG.startPoliceChase = function() {
        SG.state.policeChasing = true;
        SG.state.policeDistance = 8.0;
        SG.createPoliceCar();
        // Show police indicator
        var policeEl = document.getElementById('police-indicator');
        if (policeEl) policeEl.style.display = 'block';
    };

    SG.stopPoliceChase = function() {
        SG.state.policeChasing = false;
        SG.state.policeDistance = 8.0;
        SG.stopSiren();
        if (policeGroup) {
            SG.scene.remove(policeGroup);
            SG.disposeObject(policeGroup);
            policeGroup = null;
        }
        var policeEl = document.getElementById('police-indicator');
        if (policeEl) policeEl.style.display = 'none';
    };

    SG.coinPushBackPolice = function() {
        if (!SG.state.policeChasing) return;
        SG.state.policeDistance = Math.min(12, SG.state.policeDistance + 1.0);
    };
})();
