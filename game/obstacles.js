// ===== SUBWAY SURFER - Obstacles =====
(function() {
    'use strict';
    const SG = window.__SG = window.__SG || {};
    const THREE = window.THREE;

    SG.vehicleModels = SG.vehicleModels || {};
    SG.vehicleModelPaths = SG.vehicleModelPaths || {
        train: 'models/vehicles/train.glb',
        bus: 'models/vehicles/bus.glb'
    };

    SG.loadVehicleModels = function() {
        if (!THREE || !THREE.GLTFLoader || SG.vehicleModelsLoading) return;
        SG.vehicleModelsLoading = true;
        var loader = new THREE.GLTFLoader();
        Object.keys(SG.vehicleModelPaths).forEach(function(key) {
            loader.load(SG.vehicleModelPaths[key], function(gltf) {
                var model = gltf.scene || (gltf.scenes && gltf.scenes[0]);
                if (!model) return;
                model.name = key + '-vehicle-model';
                model.traverse(function(node) {
                    if (node && node.isMesh) {
                        node.castShadow = true;
                        node.receiveShadow = true;
                    }
                });
                SG.vehicleModels[key] = model;
            }, undefined, function(err) {
                SG.vehicleModelError = err;
            });
        });
    };

    SG.cloneVehicleModel = function(key) {
        var source = SG.vehicleModels && SG.vehicleModels[key];
        if (!source) return null;
        var clone = source.clone(true);
        clone.name = key + '-vehicle-obstacle';
        return clone;
    };

    SG.getObstacleLanes = function(obstacle) {
        if (!obstacle || !obstacle.userData) return [];
        if (obstacle.userData.type === 'full_barrier' || obstacle.userData.moving) return [0, 1, 2];
        if (typeof obstacle.userData.lane === 'number') return [obstacle.userData.lane];
        return [0, 1, 2];
    };

    SG.getObstacleDepth = function(obstacle) {
        if (!obstacle || !obstacle.userData) return 2;
        var depth = obstacle.userData.visualDepth || obstacle.userData.depth || 2;
        if (obstacle.userData.hasRamp) depth = Math.max(depth, 9.5);
        if (obstacle.userData.moving) depth += 1.5;
        return depth;
    };

    SG.obstacleLanesOverlap = function(a, b) {
        for (var i = 0; i < a.length; i++) {
            if (b.indexOf(a[i]) >= 0) return true;
        }
        return false;
    };

    SG.canPlaceObstacle = function(obstacle, z) {
        var lanes = SG.getObstacleLanes(obstacle);
        var depth = SG.getObstacleDepth(obstacle);
        for (var i = 0; i < SG.state.obstacles.length; i++) {
            var other = SG.state.obstacles[i];
            if (!other || !other.userData) continue;
            if (!SG.obstacleLanesOverlap(lanes, SG.getObstacleLanes(other))) continue;
            var minGap = (depth + SG.getObstacleDepth(other)) * 0.5 + 2.0;
            if (Math.abs(other.position.z - z) < minGap) return false;
        }
        return true;
    };

    SG.trackObstacle = function(obstacle, lane, z) {
        if (!obstacle) return false;
        if (!SG.canPlaceObstacle(obstacle, z)) {
            SG.disposeObject(obstacle);
            return false;
        }
        SG.scene.add(obstacle);
        SG.state.obstacles.push(obstacle);
        SG.state.coinObstacleMap.set(obstacle.uuid, []);
        SG.spawnCoinsNearObstacle(obstacle, lane, z);
        return true;
    };

    SG.canPlaceCoinAt = function(lane, z, ignoreObstacle) {
        for (var i = 0; i < SG.state.obstacles.length; i++) {
            var obstacle = SG.state.obstacles[i];
            if (!obstacle || obstacle === ignoreObstacle) continue;
            var lanes = SG.getObstacleLanes(obstacle);
            if (lanes.indexOf(lane) < 0) continue;
            var minGap = SG.getObstacleDepth(obstacle) * 0.5 + 1.1;
            if (Math.abs(obstacle.position.z - z) < minGap) return false;
        }
        if (ignoreObstacle) {
            var ignoreLanes = SG.getObstacleLanes(ignoreObstacle);
            if (ignoreLanes.indexOf(lane) >= 0) {
                var ignoreGap = SG.getObstacleDepth(ignoreObstacle) * 0.5 + 1.1;
                if (Math.abs(ignoreObstacle.position.z - z) < ignoreGap) return false;
            }
        }
        return true;
    };

    SG.findSafeCoinLane = function(preferred, z, ignoreObstacle) {
        var lanes = [preferred, (preferred + 1) % 3, (preferred + 2) % 3];
        for (var i = 0; i < lanes.length; i++) {
            if (SG.canPlaceCoinAt(lanes[i], z, ignoreObstacle)) return lanes[i];
        }
        return -1;
    };

    SG.addSafeCoin = function(lane, z, yOffset, ignoreObstacle, mapEntry) {
        var safeLane = SG.findSafeCoinLane(lane, z, ignoreObstacle);
        if (safeLane < 0) return null;
        var coin = SG.createCoin(safeLane, z, yOffset);
        SG.scene.add(coin);
        SG.state.coinObjects.push(coin);
        if (mapEntry) mapEntry.push(coin);
        return coin;
    };

    SG.createTrain = function(lane, zPos, isMoving) {
        var group = new THREE.Group();
        var laneX = SG.LANE_POSITIONS[lane];
        var moving = (isMoving !== false) && Math.random() < 0.18;
        var colors = [0xE53935, 0x1E88E5, 0x43A047, 0xFB8C00, 0x8E24AA];
        var mainColor = colors[Math.floor(Math.random() * colors.length)];
        var model = SG.cloneVehicleModel('train');

        if (model) {
            model.rotation.y = Math.PI;
            group.add(model);
            group.userData.assetModel = 'train.glb';
        } else {
            if (SG.vehicleModelPaths.train) return null;
            var body = new THREE.Mesh(
                new THREE.BoxGeometry(2.4, 1.8, 6),
                new THREE.MeshLambertMaterial({ color: mainColor })
            );
            body.position.set(0, 0.9, 0);
            group.add(body);

            var winMat = new THREE.MeshBasicMaterial({ color: 0x88CCFF, transparent: true, opacity: 0.7 });
            for (var i = -1; i <= 1; i++) {
                for (var side = -1; side <= 1; side += 2) {
                    var win = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.05), winMat);
                    win.position.set(side * 1.21, 1.0, i * 1.5);
                    group.add(win);
                }
            }

            var roof = new THREE.Mesh(
                new THREE.BoxGeometry(2.0, 0.1, 5.6),
                new THREE.MeshLambertMaterial({ color: 0xDDDDDD })
            );
            roof.position.set(0, 1.85, 0);
            group.add(roof);

            var doorMat = new THREE.MeshBasicMaterial({ color: 0xCCCCCC });
            var door = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.9, 0.6), doorMat);
            door.position.set(0, 0.8, 0);
            group.add(door);

            var lightMat = new THREE.MeshBasicMaterial({ color: 0xFFFFAA });
            for (var side2 = -1; side2 <= 1; side2 += 2) {
                var l = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.05), lightMat);
                l.position.set(side2 * 0.6, 0.5, 3.05);
                group.add(l);
            }
        }

        var hasRamp = Math.random() < 0.3;
        if (hasRamp) {
            var rampMat = new THREE.MeshLambertMaterial({ color: 0xFF6600 });
            var ramp = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.07, 2.35), rampMat);
            ramp.position.set(0, 0.9, 4.5);
            ramp.rotation.x = 0.65;
            group.add(ramp);
            var railMat = new THREE.MeshLambertMaterial({ color: 0xDD4400 });
            for (var side3 = -1; side3 <= 1; side3 += 2) {
                var r = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.36, 2.35), railMat);
                r.position.set(side3 * 0.78, 1.12, 4.5);
                r.rotation.x = 0.65;
                group.add(r);
            }
            var warnMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
            for (var i2 = -2; i2 <= 2; i2++) {
                if (i2 === 0) continue;
                var s = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.02, 0.045), warnMat);
                s.position.set(0, 0.03, 4.5 + i2 * 0.5);
                group.add(s);
            }
            var tipMat = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
            var tip = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.10, 0.045), tipMat);
            tip.position.set(0, 0.05, 5.8);
            group.add(tip);

            group.userData.hasRamp = true;
            group.userData.rampWidth = 1.55;
        }

        group.position.set(laneX, 0, zPos);
        group.userData.type = 'train';
        group.userData.lane = lane;
        group.userData.width = 2.0;
        group.userData.height = 1.8;
        group.userData.depth = 5.5;
        group.userData.visualDepth = hasRamp ? 9.5 : 5.8;
        group.userData.hasRamp = hasRamp;
        group.userData.moving = moving;
        if (moving) {
            group.userData.moveDir = 1;
            group.userData.movePhase = Math.random() * Math.PI * 2;
            group.userData.baseX = laneX;
            group.userData.warningLights = [];
            var warnMat2 = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
            for (var side4 = -1; side4 <= 1; side4 += 2) {
                for (var end = -1; end <= 1; end += 2) {
                    var flash = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.05), warnMat2);
                    flash.position.set(side4 * 1.25, 0.9, end * 2.9);
                    group.add(flash);
                    group.userData.warningLights.push(flash);
                }
            }
        }
        return group;
    };

    SG.createBarrier = function(lane, zPos) {
        var group = new THREE.Group();
        var laneX = SG.LANE_POSITIONS[lane];

        var barrier = new THREE.Mesh(
            new THREE.BoxGeometry(1.6, 0.6, 1.0),
            new THREE.MeshLambertMaterial({ color: 0xFF6600 })
        );
        barrier.position.set(0, 0.3, 0);
        group.add(barrier);

        var stripeMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        for (var i = -2; i <= 2; i++) {
            var s = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.08), stripeMat);
            s.position.set(i * 0.2, 0.4 + (i % 2) * 0.1, 0.55);
            s.rotation.x = 0.1;
            group.add(s);
        }
        for (var i2 = -2; i2 <= 2; i2++) {
            var s2 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.08), stripeMat);
            s2.position.set(i2 * 0.2, 0.4 + ((i2+1) % 2) * 0.1, -0.55);
            s2.rotation.x = -0.1;
            group.add(s2);
        }

        var cap = new THREE.Mesh(
            new THREE.BoxGeometry(1.4, 0.08, 0.9),
            new THREE.MeshLambertMaterial({ color: 0xFF8844 })
        );
        cap.position.set(0, 0.65, 0);
        group.add(cap);

        group.position.set(laneX, 0, zPos);
        group.userData = { type: 'barrier', lane: lane, width: 1.6, height: 0.6, depth: 1.0, visualDepth: 1.4 };
        return group;
    };

    SG.createFullLaneBarrier = function(zPos) {
        var group = new THREE.Group();

        var beamMat = new THREE.MeshLambertMaterial({ color: 0xFF4444 });
        var beam = new THREE.Mesh(new THREE.BoxGeometry(SG.GROUND_WIDTH + 1.5, 0.5, 1.2), beamMat);
        beam.position.set(0, 0.25, 0);
        group.add(beam);

        var stripe = new THREE.Mesh(
            new THREE.BoxGeometry(SG.GROUND_WIDTH + 1.0, 0.05, 0.05),
            new THREE.MeshBasicMaterial({ color: 0xFFFFFF })
        );
        stripe.position.set(0, 0.5, 0.6);
        group.add(stripe);
        var stripe2 = stripe.clone();
        stripe2.position.z = -0.6;
        group.add(stripe2);

        var postMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
        for (var side = -1; side <= 1; side += 2) {
            var post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.7, 0.15), postMat);
            post.position.set(side * (SG.GROUND_WIDTH / 2 + 0.8), 0.35, 0);
            group.add(post);
            var light = new THREE.Mesh(
                new THREE.SphereGeometry(0.08, 4, 4),
                new THREE.MeshBasicMaterial({ color: 0xFF0000 })
            );
            light.position.set(side * (SG.GROUND_WIDTH / 2 + 0.8), 0.75, 0);
            group.add(light);
        }

        group.position.set(0, 0, zPos);
        group.userData = { type: 'full_barrier', width: SG.GROUND_WIDTH + 1.5, height: 0.5, depth: 1.2, visualDepth: 1.6 };
        return group;
    };

    SG.createLowFlyingObstacle = function(lane, zPos) {
        var group = new THREE.Group();
        var laneX = SG.LANE_POSITIONS[lane];

        var bodyMat = new THREE.MeshLambertMaterial({ color: 0xFF3300 });
        var body = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 0.25, 1.0),
            bodyMat
        );
        body.position.set(0, 0.9, 0);
        group.add(body);

        var armMat = new THREE.MeshLambertMaterial({ color: 0xDD8800 });
        for (var i = -1; i <= 1; i += 2) {
            var arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.04), armMat);
            arm.position.set(i * 0.3, 1.05, 0);
            group.add(arm);
            var rotor = new THREE.Mesh(
                new THREE.CylinderGeometry(0.22, 0.22, 0.02, 6),
                new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.6 })
            );
            rotor.position.set(i * 0.3, 1.08, 0);
            group.add(rotor);
        }

        var beaconMat = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
        var beacon = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), beaconMat);
        beacon.position.set(0, 1.1, 0);
        group.add(beacon);

        var glowMat = new THREE.MeshBasicMaterial({ color: 0xFF8800, transparent: true, opacity: 0.5 });
        var glow = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.2, 0.1, 8), glowMat);
        glow.position.set(0, 0.75, 0);
        group.add(glow);

        var hudMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.4 });
        for (var side = -1; side <= 1; side += 2) {
            var hstrip = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.8), hudMat);
            hstrip.position.set(side * 0.6, 0.9, 0);
            group.add(hstrip);
        }

        group.position.set(laneX, 0, zPos);
        group.userData = { type: 'low_flying', lane: lane, width: 1.0, height: 0.8, depth: 0.8, visualDepth: 1.2, yOffset: 0.8 };
        return group;
    };

    SG.createRollUnderTrain = function(lane, zPos) {
        var group = new THREE.Group();
        var laneX = SG.LANE_POSITIONS[lane];

        var top = new THREE.Mesh(
            new THREE.BoxGeometry(1.42, 0.28, 3.75),
            new THREE.MeshLambertMaterial({ color: 0xFF6600 })
        );
        top.position.set(0, 1.18, 0);
        group.add(top);

        var stripe = new THREE.Mesh(
            new THREE.BoxGeometry(1.24, 0.035, 3.45),
            new THREE.MeshBasicMaterial({ color: 0xFFFFFF })
        );
        stripe.position.set(0, 0.98, 0);
        group.add(stripe);

        var supMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
        for (var side = -1; side <= 1; side += 2) {
            var sup = new THREE.Mesh(new THREE.BoxGeometry(0.10, 1.34, 0.10), supMat);
            sup.position.set(side * 0.66, 0.67, 0);
            group.add(sup);
        }

        var warnMat = new THREE.MeshBasicMaterial({ color: 0xFFCC00 });
        for (var side2 = -1; side2 <= 1; side2 += 2) {
            for (var end = -1; end <= 1; end += 2) {
                var w = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.08), warnMat);
                w.position.set(side2 * 0.72, 0.96, end * 1.78);
                group.add(w);
            }
        }

        var markerMat = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
        for (var side3 = -1; side3 <= 1; side3 += 2) {
            for (var end2 = -1; end2 <= 1; end2 += 2) {
                var m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.05), markerMat);
                m.position.set(side3 * 0.60, 0.1, end2 * 2.12);
                group.add(m);
            }
        }

        group.position.set(laneX, 0, zPos);
        group.userData = { type: 'roll_under', lane: lane, width: 1.35, height: 0.28, depth: 3.75, visualDepth: 4.1, yOffset: 1.18 };
        return group;
    };

    // ===== OBSTACLE SPAWNING =====
    SG.spawnObstacles = function() {
        for (var i = SG.state.obstacles.length - 1; i >= 0; i--) {
            if (SG.state.obstacles[i].position.z > SG.DESPAWN_BEHIND) {
                SG.disposeObject(SG.state.obstacles[i]);
                SG.scene.remove(SG.state.obstacles[i]);
                SG.state.obstacles.splice(i, 1);
            }
        }

        if (SG.state.obstacles.length === 0) {
            var positions = [];
            var initGap = [30, 20, 15][SG.state.difficulty] || 15;
            var initCount = [10, 15, 20][SG.state.difficulty] || 20;
            for (var zi = -30; zi > -initGap * initCount; zi -= initGap) positions.push(zi);
            for (var pi = 0; pi < positions.length; pi++) {
                var z = positions[pi];
                if (pi % 5 === 0 && Math.random() < 0.5) {
                    var openLane = Math.floor(Math.random() * 3);
                    var lanes = [0,1,2].filter(function(l) { return l !== openLane; });
                    for (var li = 0; li < lanes.length; li++) {
                        var lane = lanes[li];
                        var obs;
                        var t = Math.random();
                        if (t < 0.55) obs = SG.createTrain(lane, z, false);
                        else if (t < 0.80) obs = SG.createLowFlyingObstacle(lane, z);
                        else obs = SG.createRollUnderTrain(lane, z);
                        SG.trackObstacle(obs, lane, z);
                    }
                } else {
                    var lane2 = pi % 3;
                    var type = Math.random();
                    if (type >= 0.4 && type < 0.55) {
                        var hasRollNearby = SG.state.obstacles.some(function(o) {
                            return o.userData.type === 'roll_under' &&
                                Math.abs(o.position.z - positions[pi]) < 10;
                        });
                        if (hasRollNearby) type = 0.8;
                    }
                    var obs2;
                    if (type < 0.35) obs2 = SG.createTrain(lane2, z, false);
                    else if (type < 0.60) obs2 = SG.createLowFlyingObstacle(lane2, z);
                    else if (type < 0.75) obs2 = SG.createFullLaneBarrier(z);
                    else obs2 = SG.createRollUnderTrain(lane2, z);
                    SG.trackObstacle(obs2, lane2, z);
                }
            }
            for (var zc = -5; zc > -28; zc -= 5) {
                var coin = SG.createCoin(Math.floor(Math.random() * 3), zc, 0.3);
                SG.scene.add(coin);
                SG.state.coinObjects.push(coin);
            }
            return;
        }

        var ahead = SG.state.obstacles.filter(function(o) {
            return o.position.z > -90 && o.position.z < 0;
        });

        var diffMult = [0.4, 0.7, 1.0][SG.state.difficulty] || 1.0;
        var targetCount = Math.min(Math.floor((6 + SG.state.speed * 6) * diffMult), Math.floor(18 * diffMult));
        var spawnZ = -(45 + SG.state.speed * 30 * diffMult) - Math.random() * 15 * diffMult;

        if (ahead.length < targetCount) {
            var z2 = spawnZ;
            var rowProbe = { position: { z: z2 }, userData: { type: 'row_probe', lane: 1, depth: 1.0, visualDepth: 1.0 } };
            var zBlocked = !SG.canPlaceObstacle(rowProbe, z2);
            if (!zBlocked) {
                if (Math.random() < 0.10) {
                    var openLane2 = Math.floor(Math.random() * 3);
                    var lanes2 = [0,1,2].filter(function(l) { return l !== openLane2; });
                    for (var li2 = 0; li2 < lanes2.length; li2++) {
                        var lane3 = lanes2[li2];
                        var obs3;
                        var t2 = Math.random();
                        if (t2 < 0.55) obs3 = SG.createTrain(lane3, z2, true);
                        else if (t2 < 0.80) obs3 = SG.createLowFlyingObstacle(lane3, z2);
                        else obs3 = SG.createRollUnderTrain(lane3, z2);
                        SG.trackObstacle(obs3, lane3, z2);
                    }
                } else {
                    var busy = new Set();
                    for (var oi = 0; oi < ahead.length; oi++) {
                        if (ahead[oi].position.z > z2 - 10) {
                            var lv = Math.round((ahead[oi].position.x + SG.LANE_WIDTH) / SG.LANE_WIDTH);
                            if (lv >= 0 && lv <= 2) busy.add(lv);
                        }
                    }
                    var safe = [0,1,2].filter(function(l) { return !busy.has(l); });
                    var lane4 = safe.length > 0 ? safe[Math.floor(Math.random() * safe.length)] : Math.floor(Math.random() * 3);

                    var type2 = Math.random();
                    if (type2 >= 0.4 && type2 < 0.55) {
                        var hasRollUnderNearby = SG.state.obstacles.some(function(o) {
                            return o.userData.type === 'roll_under' &&
                                Math.abs(o.position.z - z2) < 10;
                        });
                        if (hasRollUnderNearby) type2 = 0.8;
                    }
                    if (type2 >= 0.55) {
                        var hasRampNearby = SG.state.obstacles.some(function(o) {
                            return o.userData.hasRamp &&
                                Math.abs(o.position.z - z2) < 8;
                        });
                        if (hasRampNearby) type2 = 0.3;
                    }

                    var obs4;
                    if (type2 < 0.35) obs4 = SG.createTrain(lane4, z2, true);
                    else if (type2 < 0.60) obs4 = SG.createLowFlyingObstacle(lane4, z2);
                    else if (type2 < 0.75) obs4 = SG.createFullLaneBarrier(z2);
                    else obs4 = SG.createRollUnderTrain(lane4, z2);
                    SG.trackObstacle(obs4, lane4, z2);
                }
            }
        }
    };

    SG.spawnCoinsNearObstacle = function(obstacle, lane, z) {
        var coinChance = Math.random();
        var depth = SG.getObstacleDepth(obstacle);
        var safeStartZ = z - depth * 0.5 - 2.4;
        var mapEntry = SG.state.coinObstacleMap.get(obstacle.uuid);
        if (coinChance < 0.5) {
            var coinLane = Math.floor(Math.random() * 3);
            while (coinLane === lane && Math.random() > 0.3) {
                coinLane = (coinLane + 1) % 3;
            }
            SG.addSafeCoin(coinLane, safeStartZ - Math.random() * 4, 0.3, obstacle, mapEntry);
        } else if (coinChance < 0.7) {
            var coinLane2 = Math.floor(Math.random() * 3);
            while (coinLane2 === lane && Math.random() > 0.4) {
                coinLane2 = (coinLane2 + 1) % 3;
            }
            var patterns = ['line', 'arc', 'double', 'zigzag', 'arc', 'zigzag'];
            var pattern = patterns[Math.floor(Math.random() * patterns.length)];
            var coins = SG.createCoinPattern(coinLane2, safeStartZ - 1.0, pattern);
            var mapEntry2 = SG.state.coinObstacleMap.get(obstacle.uuid);
            for (var ci = 0; ci < coins.length; ci++) {
                var coin = coins[ci];
                var coinLane = Math.round((coin.position.x + SG.LANE_WIDTH) / SG.LANE_WIDTH);
                if (coinLane < 0 || coinLane > 2 || !SG.canPlaceCoinAt(coinLane, coin.position.z, obstacle)) {
                    SG.disposeObject(coin);
                    continue;
                }
                SG.scene.add(coin);
                SG.state.coinObjects.push(coin);
                if (mapEntry2) mapEntry2.push(coin);
            }
        }
    };
})();
