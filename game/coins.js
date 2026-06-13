// ===== ENDLESS RUNNER - Coins =====
(function() {
    'use strict';
    const SG = window.__SG = window.__SG || {};
    const THREE = window.THREE;

    SG.createCoin = function(lane, zPos, yOffset) {
        var group = new THREE.Group();
        var laneX = SG.LANE_POSITIONS[lane];

        var coinY = 0.6 + (yOffset || 0);
        var goldMat = new THREE.MeshLambertMaterial({ color: 0xFFD34D, emissive: 0x5a3200, emissiveIntensity: 0.18 });
        var rimMat = new THREE.MeshLambertMaterial({ color: 0xFFAA00, emissive: 0x6c3900, emissiveIntensity: 0.25 });
        var darkDetailMat = new THREE.MeshBasicMaterial({ color: 0x7A3B00 });
        var brightMat = new THREE.MeshBasicMaterial({ color: 0xFFF4B8, transparent: true, opacity: 0.9 });

        var coin = new THREE.Mesh(
            new THREE.CylinderGeometry(SG.COIN_RADIUS, SG.COIN_RADIUS, 0.1, 16),
            goldMat
        );
        coin.rotation.x = Math.PI / 2;
        coin.position.set(0, coinY, 0);
        group.add(coin);

        var outerRim = new THREE.Mesh(
            new THREE.TorusGeometry(SG.COIN_RADIUS * 0.92, 0.035, 6, 24),
            rimMat
        );
        outerRim.position.set(0, coinY, 0.06);
        group.add(outerRim);

        var innerRim = new THREE.Mesh(
            new THREE.TorusGeometry(SG.COIN_RADIUS * 0.48, 0.018, 6, 20),
            darkDetailMat
        );
        innerRim.position.set(0, coinY, 0.065);
        group.add(innerRim);

        var glow = new THREE.Mesh(
            new THREE.RingGeometry(SG.COIN_RADIUS * 0.55, SG.COIN_RADIUS * 1.22, 18),
            new THREE.MeshBasicMaterial({ color: 0xFFD700, transparent: true, opacity: 0.25 })
        );
        glow.rotation.x = Math.PI / 2;
        glow.position.set(0, coinY, 0);
        group.add(glow);

        var star = new THREE.Shape();
        for (var si = 0; si < 10; si++) {
            var radius = si % 2 === 0 ? SG.COIN_RADIUS * 0.28 : SG.COIN_RADIUS * 0.12;
            var angle = -Math.PI / 2 + si * Math.PI / 5;
            var sx = Math.cos(angle) * radius;
            var sy = Math.sin(angle) * radius;
            if (si === 0) star.moveTo(sx, sy);
            else star.lineTo(sx, sy);
        }
        star.closePath();
        var emblem = new THREE.Mesh(
            new THREE.ShapeGeometry(star),
            darkDetailMat
        );
        emblem.position.set(0, coinY, 0.071);
        group.add(emblem);

        var highlight = new THREE.Mesh(
            new THREE.CircleGeometry(SG.COIN_RADIUS * 0.08, 12),
            brightMat
        );
        highlight.position.set(0, coinY, 0.076);
        group.add(highlight);

        group.position.set(laneX, 0, zPos);
        for (var ci = 0; ci < group.children.length; ci++) {
            group.children[ci].userData.baseY = group.children[ci].position.y;
        }
        group.userData = { lane: lane, collected: false, baseCoinY: coinY, coinDetail: 'high-contrast-centered-detail' };
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
