// ===== SUBWAY SURFER - Buildings & Scenery =====
(function() {
    'use strict';
    const SG = window.__SG = window.__SG || {};
    const THREE = window.THREE;

    SG.THEME_COLORS = [
        { // 0: City
            bg: 0x87CEEB, fog: 0x87CEEB, ground: 0x4a4a4e, laneMark: 0x6a6a6e, curb: 0x5a5a5a,
            buildings: [0x8B7355, 0x6B8E8B, 0x9B8B6B, 0x7B6B5B, 0x5B7B6B, 0x8B7B5B]
        },
        { // 1: Forest
            bg: 0x4CAF50, fog: 0x4CAF50, ground: 0x5D4037, laneMark: 0x6D4C41, curb: 0x4E342E,
            buildings: [0x5D4037, 0x6A4E37, 0x4C7A3A, 0x3E6B2F, 0x7B6B3B, 0x8B5E3C]
        },
        { // 2: Desert
            bg: 0xE8C170, fog: 0xE8C170, ground: 0xC2A670, laneMark: 0xD4C080, curb: 0xB8956A,
            buildings: [0xD4A86A, 0xC2956A, 0xB88A5A, 0xC8A878, 0xD8B888, 0xA8884A]
        },
        { // 3: Ocean/Arctic
            bg: 0x1a5276, fog: 0x1a5276, ground: 0x85C1E9, laneMark: 0xAED6F1, curb: 0x7FB3D8,
            buildings: [0x85C1E9, 0xAED6F1, 0x5DADE2, 0x7FB3D8, 0x95C8E0, 0xB8D8F0]
        }
    ];

    SG.createScenery = function(x, z) {
        var group = new THREE.Group();
        group.position.set(x, 0, z);
        var theme = SG.state.theme || 0;

        if (theme === 0) {
            var colors = [0x8B7355, 0x6B8E8B, 0x9B8B6B, 0x7B6B5B, 0x5B7B6B, 0x8B7B5B];
            var h = 3 + Math.random() * 6;
            var w = 1.5 + Math.random();
            var d = 1.5 + Math.random();
            var mesh = new THREE.Mesh(
                new THREE.BoxGeometry(w, h, d),
                new THREE.MeshLambertMaterial({ color: colors[Math.floor(Math.random() * colors.length)] })
            );
            mesh.position.y = h / 2;
            group.add(mesh);
        } else if (theme === 1) {
            var trunkH = 2 + Math.random() * 3;
            var trunk = new THREE.Mesh(
                new THREE.CylinderGeometry(0.15, 0.2, trunkH, 6),
                new THREE.MeshLambertMaterial({ color: 0x5D4037 })
            );
            trunk.position.y = trunkH / 2;
            group.add(trunk);
            var folColor = [0x2E7D32, 0x388E3C, 0x43A047, 0x1B5E20][Math.floor(Math.random() * 4)];
            var folMat = new THREE.MeshLambertMaterial({ color: folColor });
            for (var i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
                var cone = new THREE.Mesh(new THREE.ConeGeometry(0.8 - i * 0.15, 0.7, 6), folMat);
                cone.position.set(0, trunkH + 0.2 + i * 0.5, 0);
                group.add(cone);
            }
            if (Math.random() > 0.5) {
                var bush = new THREE.Mesh(
                    new THREE.SphereGeometry(0.3 + Math.random() * 0.2, 6, 5),
                    new THREE.MeshLambertMaterial({ color: 0x66BB6A })
                );
                bush.position.set((Math.random() - 0.5) * 0.8, 0.3, (Math.random() - 0.5) * 0.8);
                group.add(bush);
            }
        } else if (theme === 2) {
            if (Math.random() > 0.4) {
                var cacMat = new THREE.MeshLambertMaterial({ color: 0x4CAF50 });
                var main = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 2 + Math.random() * 2, 6), cacMat);
                main.position.y = 1 + Math.random();
                group.add(main);
                for (var a = 0; a < 2; a++) {
                    var arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.8 + Math.random() * 0.5, 6), cacMat);
                    arm.position.set((a === 0 ? -0.25 : 0.25), 0.6 + Math.random() * 0.8, 0);
                    arm.rotation.z = a === 0 ? 0.5 : -0.5;
                    group.add(arm);
                }
            } else {
                var rock = new THREE.Mesh(
                    new THREE.DodecahedronGeometry(0.4 + Math.random() * 0.6),
                    new THREE.MeshLambertMaterial({ color: 0xA1887F })
                );
                rock.position.y = 0.3 + Math.random() * 0.3;
                rock.rotation.set(Math.random(), Math.random(), Math.random());
                rock.scale.set(1, 0.5 + Math.random() * 0.5, 1);
                group.add(rock);
            }
        } else {
            var iceMat = new THREE.MeshLambertMaterial({ color: 0xB3E5FC });
            if (Math.random() > 0.3) {
                var pillar = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.3, 0.5, 2 + Math.random() * 4, 7),
                    iceMat
                );
                pillar.position.y = 1 + Math.random() * 2;
                pillar.scale.x = 0.6 + Math.random() * 0.8;
                group.add(pillar);
                var sparkle = new THREE.Mesh(
                    new THREE.SphereGeometry(0.05, 4, 4),
                    new THREE.MeshBasicMaterial({ color: 0xFFFFFF })
                );
                sparkle.position.set(0, pillar.position.y + 0.3, 0.2);
                group.add(sparkle);
            } else {
                var mound = new THREE.Mesh(
                    new THREE.SphereGeometry(0.6 + Math.random() * 0.5, 6, 5),
                    iceMat
                );
                mound.position.y = 0.3;
                mound.scale.set(1, 0.4, 1);
                group.add(mound);
            }
        }

        SG.scene.add(group);
        return group;
    };

    SG.spawnBuildings = function() {
        for (var i = SG.state.buildings.length - 1; i >= 0; i--) {
            if (SG.state.buildings[i].position.z > SG.DESPAWN_BEHIND) {
                SG.disposeObject(SG.state.buildings[i]);
                SG.scene.remove(SG.state.buildings[i]);
                SG.state.buildings.splice(i, 1);
            }
        }

        var farthestZ = SG.state.buildings.length > 0
            ? Math.min.apply(null, SG.state.buildings.map(function(b) { return b.position.z; }))
            : 0;

        for (var z = farthestZ; z > -SG.SPAWN_AHEAD; z -= 6 + Math.random() * 8) {
            if (z > farthestZ) continue;
            for (var side = -1; side <= 1; side += 2) {
                if (Math.random() > 0.3) {
                    var x = side * (SG.GROUND_WIDTH / 2 + 2 + Math.random() * 3);
                    var scenery = SG.createScenery(x, z);
                    SG.state.buildings.push(scenery);
                }
            }
        }
    };

    // ===== THEME SYSTEM =====
    SG.switchTheme = function(themeIndex) {
        if (themeIndex === SG.state.theme || themeIndex < 0 || themeIndex > 3) return;
        SG.state.theme = themeIndex;

        var theme = SG.THEME_COLORS[themeIndex];
        SG.scene.background.setHex(theme.bg);
        SG.scene.fog.color.setHex(theme.fog);
        SG.scene.fog.near = themeIndex >= 2 ? 40 : 60;
        SG.scene.fog.far = themeIndex >= 2 ? 90 : 120;

        for (var si = 0; si < SG.state.trackSegments.length; si++) {
            var seg = SG.state.trackSegments[si];
            seg.children.forEach(function(child) {
                if (!child.isMesh || !child.material || !child.material.color) return;
                if (child.geometry.type === 'BoxGeometry' && child.geometry.parameters.height === 0.2) {
                    child.material.color.setHex(theme.ground);
                }
                if (child.geometry.parameters.height === 0.01) {
                    child.material.color.setHex(theme.laneMark);
                }
                if (child.geometry.parameters.height === 0.3) {
                    child.material.color.setHex(theme.curb);
                }
            });
        }

        for (var bi = SG.state.buildings.length - 1; bi >= 0; bi--) {
            var b = SG.state.buildings[bi];
            SG.disposeObject(b);
            SG.scene.remove(b);
        }
        SG.state.buildings = [];
        var spawnAhead = SG.state.started ? SG.SPAWN_AHEAD : 200;
        for (var z = 0; z > -spawnAhead; z -= 6 + Math.random() * 8) {
            for (var side = -1; side <= 1; side += 2) {
                if (Math.random() > 0.3) {
                    var x = side * (SG.GROUND_WIDTH / 2 + 2 + Math.random() * 3);
                    var sc = SG.createScenery(x, z);
                    SG.state.buildings.push(sc);
                }
            }
        }

        for (var oi = 0; oi < SG.state.obstacles.length; oi++) {
            var obs = SG.state.obstacles[oi];
            obs.children.forEach(function(child) {
                if (!child.isMesh || !child.material || !child.material.color) return;
                var hex = child.material.color.getHex();
                if (hex === 0xE53935 || hex === 0x1E88E5 || hex === 0x43A047 || hex === 0xFB8C00 || hex === 0x8E24AA) {
                    var trainColors = themeIndex === 0 ? [0xE53935, 0x1E88E5, 0x43A047, 0xFB8C00, 0x8E24AA] :
                        themeIndex === 1 ? [0x6A1B9A, 0x2E7D32, 0x1565C0, 0xE65100, 0x4E342E] :
                        themeIndex === 2 ? [0xD84315, 0xFF8F00, 0xC62828, 0xEF6C00, 0xBF360C] :
                        [0x00ACC1, 0x00838F, 0x0277BD, 0x00695C, 0x4DD0E1];
                    child.material.color.setHex(trainColors[Math.floor(Math.random() * trainColors.length)]);
                }
            });
        }
    };

    SG.checkThemeChange = function() {
        var score = Math.floor(SG.state.score);
        var newTheme = 0;
        if (score >= 3000) newTheme = 3;
        else if (score >= 1500) newTheme = 2;
        else if (score >= 500) newTheme = 1;
        if (newTheme !== SG.state.theme) {
            SG.switchTheme(newTheme);
        }
    };
})();
