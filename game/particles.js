// ===== SUBWAY SURFER - Particles =====
(function() {
    'use strict';
    const SG = window.__SG = window.__SG || {};
    const THREE = window.THREE;

    SG.createCoinParticles = function(position) {
        for (var i = 0; i < 5; i++) {
            var p = new THREE.Mesh(
                new THREE.SphereGeometry(0.05, 4, 4),
                new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 1 })
            );
            p.position.copy(position);
            p.userData = { vx: (Math.random() - 0.5) * 0.3, vy: Math.random() * 0.2 + 0.1, vz: (Math.random() - 0.5) * 0.3, life: 1.0, decay: 0.025 };
            SG.scene.add(p);
            SG.state.particles.push(p);
        }
    };

    SG.createCrashParticles = function(position) {
        for (var i = 0; i < 10; i++) {
            var p = new THREE.Mesh(
                new THREE.BoxGeometry(0.06, 0.06, 0.06),
                new THREE.MeshBasicMaterial({ color: [0xff4444, 0xff8800, 0xffcc00][Math.floor(Math.random() * 3)], transparent: true, opacity: 1 })
            );
            p.position.copy(position);
            var speed = 0.15 + Math.random() * 0.2;
            var theta = Math.random() * Math.PI * 2;
            var phi = Math.random() * Math.PI;
            p.userData = {
                vx: Math.sin(phi) * Math.cos(theta) * speed,
                vy: Math.sin(phi) * Math.sin(theta) * speed + 0.1,
                vz: Math.cos(phi) * speed,
                life: 1.0, decay: 0.02
            };
            SG.scene.add(p);
            SG.state.particles.push(p);
        }
    };

    SG.spawnDestroyParticles = function(pos) {
        if (SG.state.particles.length > 300) return;

        var colors = [0xFF4400, 0xFFAA00, 0xFF6600, 0xFFFF00, 0xFF2200];
        var count = 6;

        var flash = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 4, 4),
            new THREE.MeshBasicMaterial({ color: 0xFFAA00, transparent: true, opacity: 1 })
        );
        flash.position.copy(pos);
        flash.userData = { vx: 0, vy: 0, vz: 0, life: 0.4, decay: 0.04, scale: true };
        SG.scene.add(flash);
        SG.state.particles.push(flash);

        for (var i = 0; i < count; i++) {
            var p = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 0.1, 0.1),
                new THREE.MeshBasicMaterial({
                    color: colors[i % colors.length],
                    transparent: true,
                    opacity: 1
                })
            );
            p.position.copy(pos);
            p.position.x += (Math.random() - 0.5) * 0.8;
            p.position.y += Math.random() * 0.3;
            p.position.z += (Math.random() - 0.5) * 0.8;
            var speed2 = 0.12 + Math.random() * 0.2;
            var theta2 = Math.random() * Math.PI * 2;
            var phi2 = Math.random() * Math.PI * 0.7;
            p.userData = {
                vx: Math.sin(phi2) * Math.cos(theta2) * speed2,
                vy: Math.sin(phi2) * Math.sin(theta2) * speed2 + 0.15,
                vz: Math.cos(phi2) * speed2,
                life: 0.8 + Math.random() * 0.3,
                decay: 0.025 + Math.random() * 0.02
            };
            SG.scene.add(p);
            SG.state.particles.push(p);
        }
    };
})();
