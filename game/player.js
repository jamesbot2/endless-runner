// ===== SUBWAY SURFER - Player =====
(function() {
    'use strict';
    const SG = window.__SG = window.__SG || {};
    const THREE = window.THREE;

    SG.playerModelPath = SG.playerModelPath || 'models/player.glb';

    function rememberLegacyPart(part) {
        SG.playerLegacyParts = SG.playerLegacyParts || [];
        SG.playerLegacyParts.push(part);
        return part;
    }

    function hideLegacyBodyParts() {
        var parts = SG.playerLegacyParts || [];
        for (var i = 0; i < parts.length; i++) {
            if (parts[i]) parts[i].visible = false;
        }
    }

    function normalizeModel(model) {
        var box = new THREE.Box3().setFromObject(model);
        var size = new THREE.Vector3();
        var center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        var targetHeight = 1.35;
        var scale = size.y > 0 ? targetHeight / size.y : 1;
        model.scale.setScalar(scale);

        box.setFromObject(model);
        box.getCenter(center);
        model.position.set(-center.x, -box.min.y, -center.z);
    }

    function indexAnimationActions(gltf, model) {
        SG.playerMixer = null;
        SG.playerActions = {};
        SG.playerAction = null;

        if (!gltf.animations || !gltf.animations.length || !THREE.AnimationMixer) return;

        SG.playerMixer = new THREE.AnimationMixer(model);
        for (var i = 0; i < gltf.animations.length; i++) {
            var clip = gltf.animations[i];
            var key = String(clip.name || '').toLowerCase();
            SG.playerActions[key] = SG.playerMixer.clipAction(clip);
        }
    }

    SG.playPlayerAnimation = function(name) {
        if (!SG.playerMixer || !SG.playerActions) return;
        var next = SG.playerActions[String(name || '').toLowerCase()];
        if (!next || SG.playerAction === next) return;

        if (SG.playerAction) SG.playerAction.fadeOut(0.12);
        next.reset().fadeIn(0.12).play();
        SG.playerAction = next;
    };

    SG.updatePlayerModelAnimation = function(delta) {
        if (!SG.playerModelLoaded || !SG.playerMixer) return;

        var target = 'Idle';
        if (SG.state) {
            if (SG.state.gameOver) {
                target = 'Death';
            } else if (SG.state.started && !SG.state.paused) {
                if (SG.state.isRolling) {
                    target = 'Slide';
                } else if (SG.state.isJumping) {
                    target = SG.state.jumpVelocity < -0.15 ? 'Fall' : 'Jump';
                } else if (SG.state.laneLerp < 1 && SG.state.targetLane !== SG.state.currentLane) {
                    target = SG.state.targetLane < SG.state.currentLane ? 'StrafeLeft' : 'StrafeRight';
                } else {
                    target = 'Run';
                }
            }
        }

        SG.playPlayerAnimation(target);
        SG.playerMixer.update(delta);
    };

    SG.loadPlayerModel = function() {
        if (SG.playerModelRequested || !SG.player || !THREE || !THREE.GLTFLoader) return;
        SG.playerModelRequested = true;

        var loader = new THREE.GLTFLoader();
        loader.load(SG.playerModelPath, function(gltf) {
            if (!SG.player) return;

            var model = gltf.scene || (gltf.scenes && gltf.scenes[0]);
            if (!model) return;

            model.name = 'PlayerGLB';
            normalizeModel(model);
            model.traverse(function(node) {
                if (node && node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            });

            if (SG.playerModel && SG.playerModel.parent) {
                SG.playerModel.parent.remove(SG.playerModel);
            }

            SG.playerModel = model;
            SG.playerModelLoaded = true;
            SG.player.add(model);
            hideLegacyBodyParts();
            indexAnimationActions(gltf, model);
            SG.playPlayerAnimation('Idle');
        }, undefined, function(err) {
            SG.playerModelError = err;
            SG.playerModelLoaded = false;
        });
    };

    SG.createPlayer = function() {
        SG.player = new THREE.Group();
        SG.player.position.set(0, 0, 0);
        SG.player.rotation.y = Math.PI;
        SG.playerLegacyParts = [];
        SG.playerModel = null;
        SG.playerModelLoaded = false;
        SG.playerModelRequested = false;

        var bodyMat = new THREE.MeshLambertMaterial({ color: 0x2255aa });
        SG.playerBody = rememberLegacyPart(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.4), bodyMat));
        SG.playerBody.position.y = 0.7;
        SG.player.add(SG.playerBody);

        var headMat = new THREE.MeshLambertMaterial({ color: 0xffccaa });
        SG.playerHead = rememberLegacyPart(new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 6), headMat));
        SG.playerHead.position.set(0, 1.15, 0);
        SG.player.add(SG.playerHead);

        var capMat = new THREE.MeshLambertMaterial({ color: 0xcc3333 });
        var cap = rememberLegacyPart(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.1, 6), capMat));
        cap.position.set(0, 1.3, 0);
        SG.player.add(cap);

        var armMat = new THREE.MeshLambertMaterial({ color: 0xffccaa });
        SG.playerLeftArm = rememberLegacyPart(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 0.12), armMat));
        SG.playerLeftArm.position.set(-0.4, 0.85, 0);
        SG.player.add(SG.playerLeftArm);
        SG.playerRightArm = rememberLegacyPart(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 0.12), armMat));
        SG.playerRightArm.position.set(0.4, 0.85, 0);
        SG.player.add(SG.playerRightArm);

        var legMat = new THREE.MeshLambertMaterial({ color: 0x224488 });
        SG.playerLeftLeg = rememberLegacyPart(new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.3, 0.15), legMat));
        SG.playerLeftLeg.position.set(-0.15, 0.2, 0);
        SG.player.add(SG.playerLeftLeg);
        SG.playerRightLeg = rememberLegacyPart(new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.3, 0.15), legMat));
        SG.playerRightLeg.position.set(0.15, 0.2, 0);
        SG.player.add(SG.playerRightLeg);

        // Shoes (for Double Jump / Roof Walk abilities, initially hidden)
        var shoeMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
        SG.shoesLeft = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.18), shoeMat);
        SG.shoesLeft.position.set(-0.15, 0.03, 0.04);
        SG.shoesLeft.visible = false;
        SG.player.add(SG.shoesLeft);
        SG.shoesRight = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.18), shoeMat);
        SG.shoesRight.position.set(0.15, 0.03, 0.04);
        SG.shoesRight.visible = false;
        SG.player.add(SG.shoesRight);

        // Double Jump shoe overlay (blue/white sneaker look)
        var djMat = new THREE.MeshLambertMaterial({ color: 0x3399ff });
        SG.shoesDJLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.2), djMat);
        SG.shoesDJLeft.position.set(-0.15, 0.035, 0.04);
        SG.shoesDJLeft.visible = false;
        SG.player.add(SG.shoesDJLeft);
        SG.shoesDJRight = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.2), djMat);
        SG.shoesDJRight.position.set(0.15, 0.035, 0.04);
        SG.shoesDJRight.visible = false;
        SG.player.add(SG.shoesDJRight);

        // Roof Walk shoes (golden with glow)
        var rwMat = new THREE.MeshLambertMaterial({ color: 0xffd700, emissive: 0xffa500, emissiveIntensity: 0.5 });
        SG.shoesRWLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.22), rwMat);
        SG.shoesRWLeft.position.set(-0.15, 0.04, 0.04);
        SG.shoesRWLeft.visible = false;
        SG.player.add(SG.shoesRWLeft);
        SG.shoesRWRight = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.22), rwMat);
        SG.shoesRWRight.position.set(0.15, 0.04, 0.04);
        SG.shoesRWRight.visible = false;
        SG.player.add(SG.shoesRWRight);

        // Jetpack pack (backpack)
        SG.jetpackPack = new THREE.Group();
        var packBox = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.45, 0.2),
            new THREE.MeshLambertMaterial({ color: 0xcc6622 })
        );
        packBox.position.set(0, 0, 0);
        SG.jetpackPack.add(packBox);

        // Jetpack thruster nozzle (cone pointing down)
        var nozzleMat = new THREE.MeshLambertMaterial({ color: 0x884422 });
        var nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.12, 6), nozzleMat);
        nozzle.rotation.x = Math.PI;
        nozzle.position.set(0, -0.25, 0);
        SG.jetpackPack.add(nozzle);

        // Jetpack flame (initially invisible, shown during jetpack use)
        SG.jetpackFlame = new THREE.Mesh(
            new THREE.ConeGeometry(0.1, 0.3, 6),
            new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.9 })
        );
        SG.jetpackFlame.position.set(0, -0.35, 0);
        SG.jetpackFlame.visible = false;
        SG.jetpackPack.add(SG.jetpackFlame);

        // Inner bright flame
        SG.jetpackFlameInner = new THREE.Mesh(
            new THREE.ConeGeometry(0.05, 0.18, 6),
            new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.9 })
        );
        SG.jetpackFlameInner.position.set(0, -0.32, 0);
        SG.jetpackFlameInner.visible = false;
        SG.jetpackPack.add(SG.jetpackFlameInner);

        SG.jetpackPack.position.set(0, 0.8, -0.3);
        SG.player.add(SG.jetpackPack);

        SG.scene.add(SG.player);
        SG.loadPlayerModel();
        return SG.player;
    };
})();
