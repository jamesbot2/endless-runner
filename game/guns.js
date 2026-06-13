// ===== ENDLESS RUNNER - Gun Pickups =====
(function() {
    'use strict';
    var SG = window.__SG = window.__SG || {};
    var THREE = window.THREE;

    SG.GUN_DURATION = 30;
    SG.GUN_SPAWN_MIN = 10;
    SG.GUN_SPAWN_MAX = 16;
    SG.gunModels = SG.gunModels || {};
    SG.gunModelPaths = SG.gunModelPaths || {
        pistol: 'models/guns/pistol.glb',
        longPistol: 'models/guns/long-pistol.glb',
        rifle: 'models/guns/rifle.glb',
        sniper: 'models/guns/sniper-rifle.glb'
    };
    SG.gunCatalog = SG.gunCatalog || [
        { id: 'pistol', name: 'Pistol', modelKey: 'pistol', power: 1.0, fireInterval: 0.34, color: 0x4be7ff, range: 36, pickupScale: 1.0, viewScale: 1.0 },
        { id: 'longPistol', name: 'Long Pistol', modelKey: 'longPistol', power: 1.55, fireInterval: 0.26, color: 0x86ff7a, range: 42, pickupScale: 1.0, viewScale: 1.0 },
        { id: 'rifle', name: 'Rifle', modelKey: 'rifle', power: 2.35, fireInterval: 0.2, color: 0xffd34e, range: 50, pickupScale: 1.0, viewScale: 1.05 },
        { id: 'sniper', name: 'Sniper Rifle', modelKey: 'sniper', power: 3.4, fireInterval: 0.16, color: 0xff5fd7, range: 58, pickupScale: 1.0, viewScale: 1.12 }
    ];

    SG.tuneGunMaterials = function(root, def) {
        if (!root || !root.traverse) return;
        root.traverse(function(node) {
            if (!node || !node.isMesh || !node.material) return;
            var mats = Array.isArray(node.material) ? node.material : [node.material];
            for (var i = 0; i < mats.length; i++) {
                var mat = mats[i];
                if (!mat || !mat.color) continue;
                if (mat.emissive) mat.emissive.setHex(0x000000);
                mat.emissiveIntensity = 0;
                mat.needsUpdate = true;
            }
        });
    };

    SG.getGunDef = function(id) {
        for (var i = 0; i < SG.gunCatalog.length; i++) {
            if (SG.gunCatalog[i].id === id) return SG.gunCatalog[i];
        }
        return SG.gunCatalog[0];
    };

    SG.loadGunModels = function() {
        if (!THREE || !THREE.GLTFLoader || SG.gunModelsLoading) return;
        SG.gunModelsLoading = true;
        var loader = new THREE.GLTFLoader();
        Object.keys(SG.gunModelPaths).forEach(function(key) {
            loader.load(SG.gunModelPaths[key], function(gltf) {
                var model = gltf.scene || (gltf.scenes && gltf.scenes[0]);
                if (!model) return;
                model.name = key + '-gun-model';
                model.traverse(function(node) {
                    if (!node || !node.isMesh) return;
                    node.castShadow = true;
                    node.receiveShadow = true;
                });
                var def = SG.getGunDef(Object.keys(SG.gunModelPaths).filter(function(id) { return SG.gunModelPaths[id] === SG.gunModelPaths[key]; })[0]);
                SG.tuneGunMaterials(model, def);
                SG.gunModels[key] = model;
            }, undefined, function(err) {
                SG.gunModelError = err;
            });
        });
    };

    SG.cloneGunModel = function(def, forView) {
        def = def || SG.gunCatalog[0];
        var source = SG.gunModels && SG.gunModels[def.modelKey];
        if (!source) return SG.createFallbackGunModel(def, forView);
        var clone = source.clone(true);
        clone.name = def.id + (forView ? '-view-gun' : '-pickup-gun');
        clone.scale.multiplyScalar(forView ? def.viewScale : def.pickupScale);
        SG.tuneGunMaterials(clone, def);
        return clone;
    };

    SG.createFallbackGunModel = function(def, forView) {
        var group = new THREE.Group();
        group.name = def.id + '-fallback-gun';
        var bodyMat = new THREE.MeshStandardMaterial({ color: 0x1b2434, roughness: 0.55, metalness: 0.2 });
        var accentMat = new THREE.MeshStandardMaterial({ color: def.color || 0x4be7ff, emissive: def.color || 0x4be7ff, emissiveIntensity: 0.25, roughness: 0.4 });
        var len = def.id === 'sniper' ? 1.8 : def.id === 'rifle' ? 1.5 : def.id === 'longPistol' ? 1.15 : 0.9;
        var body = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, len), bodyMat);
        body.position.y = 0.18;
        group.add(body);
        var barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, len * 0.62, 12), accentMat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.24, -len * 0.38);
        group.add(barrel);
        var grip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.38, 0.18), bodyMat);
        grip.rotation.x = -0.35;
        grip.position.set(0, -0.08, len * 0.18);
        group.add(grip);
        group.scale.setScalar(forView ? 1.0 : 0.9);
        return group;
    };

    SG.createGunPickup = function(lane, z, def) {
        def = def || SG.gunCatalog[Math.floor(Math.random() * SG.gunCatalog.length)];
        var group = new THREE.Group();
        group.name = def.id + '-pickup';
        group.position.set(SG.LANE_POSITIONS[lane], 0.16, z);
        var model = SG.cloneGunModel(def, false);
        model.rotation.set(-0.08, 0, 0);
        model.position.y = 0.22;
        group.add(model);

        var ringMat = new THREE.MeshBasicMaterial({
            color: def.color,
            transparent: true,
            opacity: 0.45,
            side: THREE.DoubleSide
        });
        var ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.52, 28), ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.03;
        group.add(ring);

        var light = new THREE.PointLight(def.color, 0.45, 3.2);
        light.position.y = 0.65;
        group.add(light);

        group.userData = {
            type: 'gun_pickup',
            lane: lane,
            gunId: def.id,
            gunName: def.name,
            color: def.color,
            collected: false
        };
        return group;
    };

    SG.canPlaceGunPickup = function(lane, z) {
        if (SG.state.homelander) return false;
        if (!SG.canPlaceCoinAt || !SG.canPlaceCoinAt(lane, z, null)) return false;
        for (var i = 0; i < SG.state.gunPickups.length; i++) {
            if (Math.abs(SG.state.gunPickups[i].position.z - z) < 24) return false;
        }
        return true;
    };

    SG.spawnGunPickups = function(delta) {
        if (!SG.state.started || SG.state.gameOver || SG.state.paused || SG.state.homelander) return;
        SG.state.gunSpawnTimer -= delta;
        if (SG.state.gunSpawnTimer > 0) return;
        SG.state.gunSpawnTimer = SG.GUN_SPAWN_MIN + Math.random() * (SG.GUN_SPAWN_MAX - SG.GUN_SPAWN_MIN);
        if (SG.state.gunPickups.length >= 2) return;

        var z = -(42 + Math.random() * 46);
        var lane = Math.floor(Math.random() * SG.LANE_COUNT);
        for (var tries = 0; tries < 6 && !SG.canPlaceGunPickup(lane, z); tries++) {
            lane = (lane + 1) % SG.LANE_COUNT;
            z -= 8;
        }
        if (!SG.canPlaceGunPickup(lane, z)) return;
        var def = SG.gunCatalog[Math.floor(Math.random() * SG.gunCatalog.length)];
        var pickup = SG.createGunPickup(lane, z, def);
        SG.scene.add(pickup);
        SG.state.gunPickups.push(pickup);
    };

    SG.collectGunPickup = function(pickup) {
        if (!pickup || pickup.userData.collected || SG.state.homelander) return false;
        var def = SG.getGunDef(pickup.userData.gunId);
        pickup.userData.collected = true;
        SG.state.activeGun = {
            id: def.id,
            name: def.name,
            power: def.power,
            fireInterval: def.fireInterval,
            range: def.range,
            color: def.color
        };
        SG.state.gunTimer = SG.GUN_DURATION;
        SG.state.gunShotCooldown = 0;
        if (SG.scene) SG.scene.remove(pickup);
        var idx = SG.state.gunPickups.indexOf(pickup);
        if (idx >= 0) SG.state.gunPickups.splice(idx, 1);
        if (SG.disposeObject) SG.disposeObject(pickup);
        SG.refreshGunViewModel();
        SG.updateGunCrosshair();
        SG.flashGunHUD('Picked up ' + def.name);
        return true;
    };

    SG.clearActiveGun = function() {
        SG.state.activeGun = null;
        SG.state.gunTimer = 0;
        SG.state.gunShotCooldown = 0;
        if (SG.gunViewModel) SG.gunViewModel.visible = false;
        if (SG.playerGunModel) SG.playerGunModel.visible = false;
        SG.updateGunCrosshair();
        SG.updateGunHUD();
    };

    SG.clearGunSystem = function() {
        for (var i = 0; i < SG.state.gunPickups.length; i++) {
            if (SG.scene) SG.scene.remove(SG.state.gunPickups[i]);
            if (SG.disposeObject) SG.disposeObject(SG.state.gunPickups[i]);
        }
        SG.state.gunPickups = [];
        SG.state.gunSpawnTimer = 6;
        SG.clearActiveGun();
    };

    SG.refreshGunViewModel = function() {
        if (!THREE || !SG.scene) return;
        if (SG.gunViewModel) {
            SG.scene.remove(SG.gunViewModel);
            if (SG.disposeObject) SG.disposeObject(SG.gunViewModel);
        }
        if (SG.playerGunModel && SG.player) {
            SG.player.remove(SG.playerGunModel);
            if (SG.disposeObject) SG.disposeObject(SG.playerGunModel);
        }
        SG.gunViewModel = new THREE.Group();
        SG.gunViewModel.name = 'first-person-gun-viewmodel';
        var def = SG.getGunDef(SG.state.activeGun && SG.state.activeGun.id);
        var model = SG.cloneGunModel(def, true);
        model.position.set(0, -0.02, 0);
        model.rotation.set(0.12, 0, 0);
        SG.gunViewModel.add(model);
        SG.gunViewModel.visible = false;
        SG.scene.add(SG.gunViewModel);

        SG.playerGunModel = new THREE.Group();
        SG.playerGunModel.name = 'third-person-held-gun';
        var held = SG.cloneGunModel(def, false);
        held.position.set(0, 0, 0);
        held.rotation.set(0.08, Math.PI, 0);
        held.scale.multiplyScalar(0.82);
        SG.playerGunModel.add(held);
        SG.playerGunModel.position.set(-0.34, 0.66, 0.02);
        SG.playerGunModel.rotation.set(0, 0, 0);
        SG.playerGunModel.visible = false;
        if (SG.player) SG.player.add(SG.playerGunModel);
    };

    SG.updateGunViewModel = function() {
        if (!SG.gunViewModel || !SG.camera) return;
        var show = !!(SG.state.firstPerson && SG.state.activeGun && SG.state.gunTimer > 0 && !SG.state.homelander && SG.state.started && !SG.state.paused && !SG.state.gameOver);
        SG.gunViewModel.visible = show;
        if (SG.playerGunModel) {
            SG.playerGunModel.visible = !!(!SG.state.firstPerson && SG.state.activeGun && SG.state.gunTimer > 0 && !SG.state.homelander && SG.state.started && !SG.state.paused && !SG.state.gameOver);
        }
        if (SG.updateGunCrosshair) SG.updateGunCrosshair();
        if (!show) return;
        var forward = new THREE.Vector3();
        var right = new THREE.Vector3(1, 0, 0).applyQuaternion(SG.camera.quaternion);
        var down = new THREE.Vector3(0, -1, 0).applyQuaternion(SG.camera.quaternion);
        SG.camera.getWorldDirection(forward);
        SG.gunViewModel.position.copy(SG.camera.position)
            .add(right.multiplyScalar(0.34))
            .add(down.multiplyScalar(0.4))
            .add(forward.multiplyScalar(0.82));
        SG.gunViewModel.quaternion.copy(SG.camera.quaternion);
    };

    SG.getGunMuzzlePosition = function() {
        if (!THREE || !SG.player) return null;
        if (SG.state.firstPerson && SG.camera) {
            var forward = new THREE.Vector3();
            var right = new THREE.Vector3(1, 0, 0).applyQuaternion(SG.camera.quaternion);
            var down = new THREE.Vector3(0, -1, 0).applyQuaternion(SG.camera.quaternion);
            SG.camera.getWorldDirection(forward);
            return SG.camera.position.clone()
                .add(right.multiplyScalar(0.34))
                .add(down.multiplyScalar(0.27))
                .add(forward.multiplyScalar(1.12));
        }
        return SG.player.position.clone().add(new THREE.Vector3(0.32, 0.92, -0.58));
    };

    SG.findGunTarget = function() {
        if (!SG.state.activeGun || !SG.player) return null;
        var lane = SG.state.currentLane;
        var best = null;
        var bestZ = -9999;
        var range = SG.state.activeGun.range || 40;
        for (var i = 0; i < SG.state.obstacles.length; i++) {
            var obs = SG.state.obstacles[i];
            if (!obs || !obs.userData || obs.userData.type === 'train') continue;
            if (obs.position.z > 2 || obs.position.z < -range) continue;
            var lanes = SG.getObstacleLanes ? SG.getObstacleLanes(obs) : [obs.userData.lane];
            if (lanes.indexOf(lane) < 0) continue;
            if (obs.position.z > bestZ) {
                best = obs;
                bestZ = obs.position.z;
            }
        }
        return best;
    };

    SG.getObstacleGunHp = function(obstacle) {
        if (!obstacle || !obstacle.userData) return 3;
        if (typeof obstacle.userData.gunHp === 'number') return obstacle.userData.gunHp;
        var type = obstacle.userData.type;
        if (type === 'full_barrier') return 4.4;
        if (type === 'roll_under') return 3.3;
        if (type === 'low_flying') return 2.7;
        if (type === 'barrier') return 2.4;
        return 3.2;
    };

    SG.destroyObstacleByGun = function(obstacle) {
        if (!obstacle || !SG.scene) return;
        var idx = SG.state.obstacles.indexOf(obstacle);
        if (idx >= 0) SG.state.obstacles.splice(idx, 1);
        if (SG.state.coinObstacleMap) SG.state.coinObstacleMap.delete(obstacle.uuid);
        var pos = obstacle.position.clone();
        SG.scene.remove(obstacle);
        if (SG.disposeObject) SG.disposeObject(obstacle);
        if (SG.spawnDestroyParticles) SG.spawnDestroyParticles(pos);
    };

    SG.createGunBeam = function(target) {
        if (!THREE || !SG.scene || !SG.player || !SG.state.activeGun) return;
        var start = SG.getGunMuzzlePosition() || SG.player.position.clone();
        var forward = new THREE.Vector3(0, 0, -1);
        if (SG.camera) SG.camera.getWorldDirection(forward);
        var end = target ? target.position.clone() : start.clone().add(forward.multiplyScalar(SG.state.activeGun.range));
        end.y += target ? Math.min(target.userData.height || 1, 1.1) * 0.55 : 0;
        var dir = end.clone().sub(start);
        var len = Math.max(0.1, dir.length());
        var shotColor = SG.state.activeGun.color || 0xffe34d;
        var mat = new THREE.MeshBasicMaterial({
            color: shotColor,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        var beam = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, len, 12), mat);
        beam.position.copy(start).add(dir.clone().multiplyScalar(0.5));
        beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize());
        beam.userData = { vx: 0, vy: 0, vz: 0, life: 1, decay: 0.18 };
        SG.scene.add(beam);
        SG.state.particles.push(beam);

        var glowMat = new THREE.MeshBasicMaterial({
            color: SG.state.activeGun.color || 0x4be7ff,
            transparent: true,
            opacity: 0.42,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        var glow = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, len, 12), glowMat);
        glow.position.copy(beam.position);
        glow.quaternion.copy(beam.quaternion);
        glow.userData = { vx: 0, vy: 0, vz: 0, life: 1, decay: 0.22 };
        SG.scene.add(glow);
        SG.state.particles.push(glow);

        var flashMat = new THREE.MeshBasicMaterial({
            color: 0xfff36a,
            transparent: true,
            opacity: 0.98,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        var flash = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), flashMat);
        flash.position.copy(start);
        flash.userData = { vx: 0, vy: 0, vz: 0, life: 1, decay: 0.32 };
        SG.scene.add(flash);
        SG.state.particles.push(flash);
    };

    SG.playGunSound = function() {
        if (!SG.audioCtx || SG.state.muted) return;
        SG.scheduleSound(0, function(t) {
            try {
                var sfx = SG.state.sfxVolume || 0.8;
                var master = SG.audioCtx.createGain();
                master.gain.setValueAtTime(0.32 * sfx, t);
                master.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
                master.connect(SG.audioCtx.destination);

                var body = SG.audioCtx.createOscillator();
                body.type = 'sawtooth';
                body.frequency.setValueAtTime(150, t);
                body.frequency.exponentialRampToValueAtTime(58, t + 0.11);
                body.connect(master);
                body.start(t);
                body.stop(t + 0.16);

                var crack = SG.audioCtx.createOscillator();
                crack.type = 'square';
                crack.frequency.setValueAtTime(1250, t);
                crack.frequency.exponentialRampToValueAtTime(310, t + 0.045);
                crack.connect(master);
                crack.start(t);
                crack.stop(t + 0.055);

                var bufferSize = Math.floor(SG.audioCtx.sampleRate * 0.055);
                var buffer = SG.audioCtx.createBuffer(1, bufferSize, SG.audioCtx.sampleRate);
                var data = buffer.getChannelData(0);
                for (var i = 0; i < bufferSize; i++) {
                    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
                }
                var noise = SG.audioCtx.createBufferSource();
                var noiseGain = SG.audioCtx.createGain();
                noise.buffer = buffer;
                noiseGain.gain.setValueAtTime(0.22 * sfx, t);
                noiseGain.gain.linearRampToValueAtTime(0, t + 0.055);
                noise.connect(noiseGain);
                noiseGain.connect(SG.audioCtx.destination);
                noise.start(t);
            } catch(e) {}
        });
    };

    SG.shootGun = function() {
        if (!SG.state.started || SG.state.paused || SG.state.gameOver || SG.state.homelander) return false;
        if (!SG.state.activeGun || SG.state.gunTimer <= 0 || SG.state.gunShotCooldown > 0) return false;
        if (!SG.audioCtx && SG.initAudio) SG.initAudio();
        SG.state.gunShotCooldown = SG.state.activeGun.fireInterval || 0.24;
        var target = SG.findGunTarget();
        SG.createGunBeam(target);
        SG.playGunSound();
        if (target) {
            var hp = SG.getObstacleGunHp(target) - SG.state.activeGun.power;
            target.userData.gunHp = hp;
            if (hp <= 0) SG.destroyObstacleByGun(target);
        }
        return true;
    };

    SG.flashGunHUD = function(text) {
        var el = document.getElementById('gun-hud');
        if (!el) return;
        el.textContent = text;
        el.style.display = 'block';
        el.style.borderColor = 'rgba(75,231,255,0.55)';
    };

    SG.updateGunHUD = function() {
        var el = document.getElementById('gun-hud');
        if (!el) return;
        if (!SG.state.activeGun || SG.state.gunTimer <= 0 || SG.state.homelander) {
            el.style.display = 'none';
            SG.updateGunCrosshair();
            return;
        }
        el.style.display = 'block';
        el.textContent = 'GUN: ' + SG.state.activeGun.name + '  ' + SG.state.gunTimer.toFixed(1) + 's';
        SG.updateGunCrosshair();
    };

    SG.updateGunCrosshair = function() {
        var el = document.getElementById('gun-crosshair');
        if (!el) return;
        var show = !!(SG.state.firstPerson && SG.state.activeGun && SG.state.gunTimer > 0 && !SG.state.homelander && SG.state.started && !SG.state.paused && !SG.state.gameOver);
        el.style.display = show ? 'block' : 'none';
        el.style.visibility = show ? 'visible' : 'hidden';
        el.style.opacity = show ? '1' : '0';
    };

    SG.updateGunSystem = function(delta) {
        SG.spawnGunPickups(delta);

        for (var i = SG.state.gunPickups.length - 1; i >= 0; i--) {
            var pickup = SG.state.gunPickups[i];
            pickup.position.z += SG.state.speed * delta * 60;
            pickup.rotation.y += delta * 1.8;
            var bob = Math.sin(SG.state.gameTime * 3 + pickup.id) * 0.08;
            if (pickup.children[0]) pickup.children[0].position.y = 0.22 + bob;
            if (!SG.state.homelander && SG.player) {
                var dx = Math.abs(SG.player.position.x - pickup.position.x);
                var dz = Math.abs(SG.player.position.z - pickup.position.z);
                if (dx < 0.85 && dz < 0.9) {
                    SG.collectGunPickup(pickup);
                    continue;
                }
            }
            if (pickup.position.z > SG.DESPAWN_BEHIND) {
                SG.scene.remove(pickup);
                SG.state.gunPickups.splice(i, 1);
                if (SG.disposeObject) SG.disposeObject(pickup);
            }
        }

        if (SG.state.gunShotCooldown > 0) SG.state.gunShotCooldown = Math.max(0, SG.state.gunShotCooldown - delta);
        if (SG.state.activeGun && SG.state.gunTimer > 0 && !SG.state.homelander) {
            SG.state.gunTimer = Math.max(0, SG.state.gunTimer - delta);
            if (SG.state.gunTimer <= 0) SG.clearActiveGun();
        }
        if (SG.state.homelander && SG.state.activeGun) SG.clearActiveGun();
        SG.updateGunViewModel();
        SG.updateGunHUD();
    };
})();
