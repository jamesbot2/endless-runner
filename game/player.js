// ===== ENDLESS RUNNER - Player =====
(function() {
    'use strict';
    const SG = window.__SG = window.__SG || {};
    const THREE = window.THREE;

    SG.playerModelPath = SG.playerModelPath || 'models/player.glb';
    SG.jetpackModelPath = SG.jetpackModelPath || 'models/jetpack.glb';
    SG.jetpackModelTuning = SG.jetpackModelTuning || {
        targetHeight: 0.58,
        rotationY: Math.PI,
        yOffset: 0,
        zOffset: 0
    };
    SG.characterCatalog = SG.characterCatalog || [
        { id: 'runner', name: 'Neo Runner', path: 'models/player.glb', desc: 'Original endless runner' },
        { id: 'adventurer', name: 'Adventurer', path: 'models/characters/Adventurer.gltf', desc: 'Backpack and field gear' },
        { id: 'beach', name: 'Beach', path: 'models/characters/Beach.gltf', desc: 'Light summer outfit' },
        { id: 'casual2', name: 'Casual 2', path: 'models/characters/Casual_2.gltf', desc: 'Street casual outfit' },
        { id: 'hoodie', name: 'Hoodie', path: 'models/characters/Casual_Hoodie.gltf', desc: 'Casual hoodie outfit' },
        { id: 'farmer', name: 'Farmer', path: 'models/characters/Farmer.gltf', desc: 'Workwear runner' },
        { id: 'king', name: 'King', path: 'models/characters/King.gltf', desc: 'Royal outfit' },
        { id: 'punk', name: 'Punk', path: 'models/characters/Punk.gltf', desc: 'High contrast punk outfit' },
        { id: 'spacesuit', name: 'Spacesuit', path: 'models/characters/Spacesuit.gltf', desc: 'Space explorer suit' },
        { id: 'suit', name: 'Suit', path: 'models/characters/Suit.gltf', desc: 'Formal runner' },
        { id: 'swat', name: 'SWAT', path: 'models/characters/Swat.gltf', desc: 'Tactical outfit' },
        { id: 'worker', name: 'Worker', path: 'models/characters/Worker.gltf', desc: 'Construction outfit' }
    ];

    function parseOwnedCharacters() {
        try {
            var saved = JSON.parse(localStorage.getItem('subwayOwnedCharacters') || '["runner"]');
            if (Array.isArray(saved) && saved.length) return saved.indexOf('runner') >= 0 ? saved : ['runner'].concat(saved);
        } catch(e) {}
        return ['runner'];
    }

    function saveOwnedCharacters(owned) {
        try { localStorage.setItem('subwayOwnedCharacters', JSON.stringify(owned)); } catch(e) {}
    }

    SG.getCharacterById = function(id) {
        for (var i = 0; i < SG.characterCatalog.length; i++) {
            if (SG.characterCatalog[i].id === id) return SG.characterCatalog[i];
        }
        return SG.characterCatalog[0];
    };

    SG.getOwnedCharacters = function() {
        if (!Array.isArray(SG.state.ownedCharacters) || !SG.state.ownedCharacters.length) {
            SG.state.ownedCharacters = parseOwnedCharacters();
        }
        return SG.state.ownedCharacters;
    };

    SG.characterIsOwned = function(id) {
        return SG.getOwnedCharacters().indexOf(id) >= 0;
    };

    SG.getNextCharacterPrice = function() {
        return Math.max(0, SG.getOwnedCharacters().length - 1) * 10000;
    };

    SG.selectCharacter = function(id) {
        var character = SG.getCharacterById(id);
        if (!character || !SG.characterIsOwned(character.id)) return false;
        SG.state.selectedCharacter = character.id;
        SG.playerModelPath = character.path;
        try { localStorage.setItem('subwaySelectedCharacter', character.id); } catch(e) {}
        if (SG.player) SG.reloadPlayerModel();
        return true;
    };

    SG.buyCharacter = function(id) {
        var character = SG.getCharacterById(id);
        if (!character || SG.characterIsOwned(character.id)) return SG.selectCharacter(id);
        var price = SG.getNextCharacterPrice();
        if ((SG.state.credits || 0) < price) return false;
        SG.state.credits -= price;
        var owned = SG.getOwnedCharacters().slice();
        owned.push(character.id);
        SG.state.ownedCharacters = owned;
        saveOwnedCharacters(owned);
        SG.selectCharacter(character.id);
        if (SG.updateMenuCredits) SG.updateMenuCredits();
        if (SG.saveShopData) SG.saveShopData();
        if (SG.accountSave) SG.accountSave();
        return true;
    };

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

    function showLegacyBodyParts() {
        var parts = SG.playerLegacyParts || [];
        for (var i = 0; i < parts.length; i++) {
            if (parts[i]) parts[i].visible = true;
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
    SG.normalizePlayerModel = normalizeModel;

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
        var selected = SG.state.selectedCharacter || localStorage.getItem('subwaySelectedCharacter') || 'runner';
        if (!SG.characterIsOwned(selected)) selected = 'runner';
        var character = SG.getCharacterById(selected);
        SG.state.selectedCharacter = character.id;
        SG.playerModelPath = character.path;

        var loader = new THREE.GLTFLoader();
        loader.load(SG.playerModelPath, function(gltf) {
            if (!SG.player) return;

            var model = gltf.scene || (gltf.scenes && gltf.scenes[0]);
            if (!model) return;

            model.name = 'PlayerGLB-' + character.id;
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
            showLegacyBodyParts();
        });
    };

    SG.reloadPlayerModel = function() {
        if (!SG.player || !THREE) return;
        if (SG.playerModel && SG.playerModel.parent) {
            SG.playerModel.parent.remove(SG.playerModel);
            if (SG.disposeObject) SG.disposeObject(SG.playerModel);
        }
        SG.playerModel = null;
        SG.playerModelLoaded = false;
        SG.playerModelRequested = false;
        SG.playerMixer = null;
        SG.playerActions = {};
        SG.playerAction = null;
        showLegacyBodyParts();
        SG.loadPlayerModel();
    };

    SG.normalizeJetpackModel = function(model) {
        if (!model || !THREE) return;
        model.updateMatrixWorld(true);
        var box = new THREE.Box3().setFromObject(model);
        var size = new THREE.Vector3();
        var center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        var maxDim = Math.max(size.x, size.y, size.z) || 1;
        var scale = (SG.jetpackModelTuning.targetHeight || 0.72) / maxDim;
        model.scale.setScalar(scale);
        model.rotation.y = SG.jetpackModelTuning.rotationY || 0;
        model.position.set(
            -center.x * scale,
            -center.y * scale + (SG.jetpackModelTuning.yOffset || 0),
            -center.z * scale + (SG.jetpackModelTuning.zOffset || 0)
        );
        model.updateMatrixWorld(true);
    };

    SG.loadJetpackModel = function() {
        if (!SG.jetpackPack || SG.jetpackModelRequested || !THREE || !THREE.GLTFLoader) return;
        SG.jetpackModelRequested = true;
        var loader = new THREE.GLTFLoader();
        loader.load(SG.jetpackModelPath, function(gltf) {
            if (!SG.jetpackPack) return;
            var model = gltf.scene || (gltf.scenes && gltf.scenes[0]);
            if (!model) return;
            model.name = 'JetpackGLB';
            model.traverse(function(node) {
                if (node && node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            });
            SG.normalizeJetpackModel(model);
            SG.jetpackModel = model;
            SG.jetpackModelLoaded = true;
            SG.jetpackPack.add(model);
        }, undefined, function(err) {
            SG.jetpackModelError = err;
            SG.jetpackModelLoaded = false;
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
        SG.state.ownedCharacters = parseOwnedCharacters();
        SG.state.selectedCharacter = localStorage.getItem('subwaySelectedCharacter') || SG.state.selectedCharacter || 'runner';
        if (!SG.characterIsOwned(SG.state.selectedCharacter)) SG.state.selectedCharacter = 'runner';
        SG.playerModelPath = SG.getCharacterById(SG.state.selectedCharacter).path;

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

        // Jetpack pack: GLB model plus two flame emitters.
        SG.jetpackPack = new THREE.Group();
        SG.jetpackPack.name = 'JetpackPack';
        SG.jetpackFlameGroups = [];
        function createJetpackFlame(side) {
            var flameGroup = new THREE.Group();
            flameGroup.name = side < 0 ? 'JetpackFlameLeft' : 'JetpackFlameRight';
            flameGroup.position.set(side * 0.14, -0.32, 0.01);
            flameGroup.visible = false;

            var outer = new THREE.Mesh(
                new THREE.ConeGeometry(0.075, 0.36, 10),
                new THREE.MeshBasicMaterial({ color: 0xff5a00, transparent: true, opacity: 0.88 })
            );
            outer.position.y = -0.06;
            flameGroup.add(outer);

            var inner = new THREE.Mesh(
                new THREE.ConeGeometry(0.038, 0.23, 10),
                new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0.95 })
            );
            inner.position.y = -0.02;
            flameGroup.add(inner);

            SG.jetpackPack.add(flameGroup);
            SG.jetpackFlameGroups.push(flameGroup);
            return flameGroup;
        }
        var leftFlame = createJetpackFlame(-1);
        var rightFlame = createJetpackFlame(1);
        SG.jetpackFlame = leftFlame.children[0];
        SG.jetpackFlameInner = leftFlame.children[1];
        SG.jetpackFlameRight = rightFlame.children[0];
        SG.jetpackFlameRightInner = rightFlame.children[1];
        SG.jetpackPack.position.set(0, 0.72, -0.24);
        SG.jetpackPack.visible = false;
        SG.player.add(SG.jetpackPack);
        SG.loadJetpackModel();

        SG.scene.add(SG.player);
        SG.loadPlayerModel();
        return SG.player;
    };
})();
