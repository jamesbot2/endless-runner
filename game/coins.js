// ===== SUBWAY SURFER - Coins =====
(function() {
    'use strict';
    const SG = window.__SG = window.__SG || {};
    const THREE = window.THREE;

    SG.createCoin = function(lane, zPos, yOffset) {
        var group = new THREE.Group();
        var laneX = SG.LANE_POSITIONS[lane];

        var coin = new THREE.Mesh(
            new THREE.CylinderGeometry(SG.COIN_RADIUS, SG.COIN_RADIUS, 0.08, 10),
            new THREE.MeshBasicMaterial({ color: 0xFFD700 })
        );
        coin.rotation.x = Math.PI / 2;
        coin.position.set(0, 0.6 + (yOffset || 0), 0);
        group.add(coin);

        var glow = new THREE.Mesh(
            new THREE.RingGeometry(SG.COIN_RADIUS * 0.5, SG.COIN_RADIUS * 1.1, 10),
            new THREE.MeshBasicMaterial({ color: 0xFFD700, transparent: true, opacity: 0.25 })
        );
        glow.rotation.x = Math.PI / 2;
        glow.position.set(0, 0.6 + (yOffset || 0), 0);
        group.add(glow);

        var dot = new THREE.Mesh(
            new THREE.CircleGeometry(SG.COIN_RADIUS * 0.3, 6),
            new THREE.MeshBasicMaterial({ color: 0xFFA500 })
        );
        dot.rotation.x = Math.PI / 2;
        dot.position.set(0, 0.6 + (yOffset || 0), 0.01);
        group.add(dot);

        group.position.set(laneX, 0, zPos);
        group.userData = { lane: lane, collected: false };
        return group;
    };

    SG.createCoinPattern = function(lane, zPos, pattern) {
        var coins = [];
        var fn;
        if (pattern === 'arc') {
            fn = function() {
                for (var i = 0; i < 6; i++) {
                    var l = Math.max(0, Math.min(2, lane + Math.round(Math.sin(i * 1.2) * 1.2)));
                    var yOff = Math.sin(i * 1.0) * 0.3 + 0.4;
                    coins.push(SG.createCoin(l, zPos - i * 2.0, yOff));
                }
            };
        } else if (pattern === 'line') {
            fn = function() { for (var i = 0; i < 5; i++) coins.push(SG.createCoin(lane, zPos - i * 2.2, 0.2)); };
        } else if (pattern === 'double') {
            fn = function() {
                var lanes = [Math.max(0, lane - 1), Math.min(2, lane + 1)];
                for (var i = 0; i < 4; i++) {
                    coins.push(SG.createCoin(lanes[i % 2], zPos - i * 1.8, 0.2));
                }
            };
        } else if (pattern === 'single') {
            fn = function() { coins.push(SG.createCoin(lane, zPos, 0.3)); };
        } else if (pattern === 'zigzag') {
            fn = function() {
                for (var i = 0; i < 4; i++) {
                    var l = i % 2 === 0 ? lane : Math.max(0, Math.min(2, lane + (i < 2 ? 1 : -1)));
                    coins.push(SG.createCoin(l, zPos - i * 2.0, 0.3));
                }
            };
        } else {
            fn = function() { coins.push(SG.createCoin(lane, zPos, 0.3)); };
        }
        fn();
        return coins;
    };
})();
