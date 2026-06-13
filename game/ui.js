// ===== ENDLESS RUNNER - UI System =====
(function() {
    'use strict';
    var SG = window.__SG = window.__SG || {};
    var THREE = window.THREE;

    // ===== SHOP =====
    SG.shopOverlay = null;

    SG.loadShopData = function() {
        try {
            var saved = localStorage.getItem('subwayShop');
            if (saved) {
                var data = JSON.parse(saved);
                SG.state.credits = data.credits || 0;
                SG.state.equippedAbility = data.equippedAbility || 0;
                SG.state.canDoubleJump = data.doubleJump || false;
                SG.state.canJetpack = data.jetpack || false;
                SG.state.canRoofWalk = data.roofWalk || false;
                SG.state.ownedCharacters = Array.isArray(data.ownedCharacters) && data.ownedCharacters.length ? data.ownedCharacters : ['runner'];
                SG.state.selectedCharacter = data.selectedCharacter || SG.state.selectedCharacter || 'runner';
                localStorage.setItem('subwayOwnedCharacters', JSON.stringify(SG.state.ownedCharacters));
                localStorage.setItem('subwaySelectedCharacter', SG.state.selectedCharacter);
            }
        } catch(e) {}
    };

    SG.saveShopData = function() {
        try {
            var data = {
                credits: SG.state.credits,
                equippedAbility: SG.state.equippedAbility,
                doubleJump: SG.state.canDoubleJump,
                jetpack: SG.state.canJetpack,
                roofWalk: SG.state.canRoofWalk,
                ownedCharacters: SG.getOwnedCharacters ? SG.getOwnedCharacters() : (SG.state.ownedCharacters || ['runner']),
                selectedCharacter: SG.state.selectedCharacter || 'runner'
            };
            localStorage.setItem('subwayShop', JSON.stringify(data));
        } catch(e) {}
    };

    SG.showShop = function() {
        // Always read volume from localStorage for persistence
        var v = {
            music: parseFloat(localStorage.getItem('subwayMusicVol') || '0.5'),
            sfx: parseFloat(localStorage.getItem('subwaySfxVol') || '0.8')
        };
        SG.state.musicVolume = v.music;
        SG.state.sfxVolume = v.sfx;

        if (!SG.shopOverlay) {
            SG.shopOverlay = document.createElement('div');
            SG.shopOverlay.id = 'shop-overlay';
            SG.shopOverlay.className = 'overlay';
            SG.shopOverlay.onclick = function(e) { if (e.target === SG.shopOverlay || e.target.closest('.modal-close-btn')) { SG.shopOverlay.style.display = 'none'; SG.updateMenuCredits(); } };
            SG.shopOverlay.addEventListener('touchend', function(e) { if (e.target === SG.shopOverlay || e.target.closest('.modal-close-btn')) { e.preventDefault(); SG.shopOverlay.style.display = 'none'; SG.updateMenuCredits(); } });
        }
        // showShop continues below...
        var prices = [0, 10000, 50000, 100000];
        var names = ['None', 'Double Jump', 'Jetpack', 'Roof Walk'];
        var descs = ['No ability equipped', 'Double jump in mid-air', 'Fly for 15s, max altitude, 30s cooldown', 'Walk on top of obstacles'];
        var icons = ['🚫', '🦘', '🚀', '🏃'];

        var html = '<div class="menu-content" style="max-height:85vh;overflow-y:auto;">';
        html += '<h1 class="menu-title" style="font-size:28px;margin-bottom:5px;">SHOP</h1>';
        html += '<div style="color:#FFD700;font-size:20px;margin-bottom:15px;">💰 ' + SG.state.credits + ' credits</div>';

        var owned = [false, SG.state.canDoubleJump, SG.state.canJetpack, SG.state.canRoofWalk];
        for (var i = 0; i < 4; i++) {
            var isEquipped = SG.state.equippedAbility === i;
            var isOwned = i === 0 || owned[i];
            var btnClass = isEquipped ? 'diff-btn active' : 'diff-btn';
            var btnDisabled = !isOwned && SG.state.credits < prices[i] ? 'disabled' : '';
            html += '<div class="shop-card' + (i > 0 && owned[i] ? ' owned' : '') + '">';
            html += '<div class="shop-ico">' + icons[i] + '</div><div class="shop-body"><div class="shop-name">' + names[i] + '</div>';
            html += '<div class="shop-desc">' + descs[i] + '</div></div>';
            if (i === 0) {
                if (SG.state.equippedAbility === 0) {
                    html += '<button class="' + btnClass + '" disabled style="opacity:0.6;">EQUIPPED</button>';
                } else {
                    html += '<button class="diff-btn" onclick="__neoEquip(0)">EQUIP NONE</button>';
                }
            } else if (isOwned) {
                if (isEquipped) {
                    html += '<button class="diff-btn active" disabled style="opacity:0.6;">EQUIPPED</button>';
                } else {
                    html += '<button class="diff-btn" onclick="__neoEquip(' + i + ')">EQUIP</button>';
                }
            } else {
                if (SG.state.credits >= prices[i]) {
                    html += '<button class="diff-btn" onclick="__neoBuy(' + i + ')">BUY ' + prices[i] + 'cr</button>';
                } else {
                    html += '<button class="' + btnClass + '" disabled style="opacity:0.4;">' + prices[i] + 'cr</button>';
                }
            }
            html += '</div>';
        }

        html += '<hr style="border-color:rgba(255,255,255,0.05);margin:8px 0;">';
        html += '<div style="color:#aaa;font-size:13px;margin-top:5px;">Controls: ↑ Jump | ↓ Roll | ← → Move | 👁 FPV | ` Console | M Menu</div>';
        html += '<div class="menu-btn modal-close-btn" onclick="__neoCloseShop()">CLOSE</div>';
        html += '</div>';

        SG.shopOverlay.innerHTML = html;
        document.body.appendChild(SG.shopOverlay);
        SG.shopOverlay.style.display = 'flex';

        window.__neoEquip = function(idx) {
            SG.state.equippedAbility = idx;
            SG.saveShopData();
            if (SG.accountSave) SG.accountSave();
            SG.showShop();
        };
        window.__neoBuy = function(idx) {
            var prices2 = [0, 10000, 50000, 100000];
            if (SG.state.credits >= prices2[idx]) {
                SG.state.credits -= prices2[idx];
                if (idx === 1) SG.state.canDoubleJump = true;
                else if (idx === 2) SG.state.canJetpack = true;
                else if (idx === 3) SG.state.canRoofWalk = true;
                SG.state.equippedAbility = idx;
                SG.saveShopData();
                if (SG.accountSave) SG.accountSave();
                SG.showShop();
            }
        };
        window.__neoCloseShop = function() {
            SG.shopOverlay.style.display = 'none';
            SG.updateMenuCredits();
        };

    };  // end showShop

    SG.characterOverlay = null;
    SG.characterPreview = null;

    function esc(str) {
        return String(str || '').replace(/[&<>"']/g, function(ch) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
        });
    }

    function disposeCharacterPreviewModel() {
        if (!SG.characterPreview || !SG.characterPreview.model) return;
        SG.characterPreview.scene.remove(SG.characterPreview.model);
        if (SG.disposeObject) SG.disposeObject(SG.characterPreview.model);
        SG.characterPreview.model = null;
        SG.characterPreview.mixer = null;
    }

    SG.previewCharacter = function(id) {
        if (!SG.characterPreview || !THREE || !THREE.GLTFLoader) return;
        var character = SG.getCharacterById ? SG.getCharacterById(id) : null;
        if (!character) return;
        SG.characterPreview.current = character.id;
        disposeCharacterPreviewModel();
        var loader = new THREE.GLTFLoader();
        loader.load(character.path, function(gltf) {
            var model = gltf.scene || (gltf.scenes && gltf.scenes[0]);
            if (!model || !SG.characterPreview || SG.characterPreview.current !== character.id) return;
            model.name = 'Preview-' + character.id;
            if (SG.normalizePlayerModel) SG.normalizePlayerModel(model);
            model.traverse(function(node) {
                if (node && node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            });
            SG.characterPreview.model = model;
            SG.characterPreview.scene.add(model);
            SG.characterPreview.previewTime = 0;
            if (character.id !== 'runner' && gltf.animations && gltf.animations.length && THREE.AnimationMixer) {
                SG.characterPreview.mixer = new THREE.AnimationMixer(model);
                var clip = gltf.animations.filter(function(c) { return String(c.name).toLowerCase() === 'idle'; })[0] || gltf.animations[0];
                SG.characterPreview.mixer.clipAction(clip).play();
            }
        }, undefined, function(err) {
            SG.characterPreview.error = err;
        });
    };

    function ensureCharacterPreview(canvas) {
        if (!canvas || !THREE) return;
        if (!SG.characterPreview) {
            var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            var scene = new THREE.Scene();
            var camera = new THREE.PerspectiveCamera(35, 1, 0.1, 30);
            camera.position.set(0, 1.15, 4.0);
            var hemi = new THREE.HemisphereLight(0xffffff, 0x273347, 1.5);
            scene.add(hemi);
            var key = new THREE.DirectionalLight(0xffffff, 1.8);
            key.position.set(2, 4, 3);
            scene.add(key);
            SG.characterPreview = { renderer: renderer, scene: scene, camera: camera, model: null, mixer: null, clock: new THREE.Clock(), current: null, running: false, previewTime: 0 };
        } else if (SG.characterPreview.renderer.domElement !== canvas) {
            SG.characterPreview.renderer.dispose();
            SG.characterPreview.renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
            SG.characterPreview.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        }

        function loop() {
            if (!SG.characterOverlay || SG.characterOverlay.style.display === 'none' || !SG.characterPreview) {
                if (SG.characterPreview) SG.characterPreview.running = false;
                return;
            }
            SG.characterPreview.running = true;
            var w = Math.max(220, canvas.clientWidth || 320);
            var h = Math.max(260, canvas.clientHeight || 360);
            SG.characterPreview.renderer.setSize(w, h, false);
            SG.characterPreview.camera.aspect = w / h;
            SG.characterPreview.camera.updateProjectionMatrix();
            var delta = Math.min(SG.characterPreview.clock.getDelta(), 0.033);
            SG.characterPreview.previewTime += delta;
            if (SG.characterPreview.mixer) SG.characterPreview.mixer.update(delta);
            if (SG.characterPreview.model) SG.characterPreview.model.rotation.y = Math.sin(SG.characterPreview.previewTime * 0.7) * 0.35;
            SG.characterPreview.renderer.render(SG.characterPreview.scene, SG.characterPreview.camera);
            requestAnimationFrame(loop);
        }
        if (!SG.characterPreview.running) loop();
    }

    SG.showCharacters = function() {
        if (!SG.characterOverlay) {
            SG.characterOverlay = document.createElement('div');
            SG.characterOverlay.id = 'characters-overlay';
            SG.characterOverlay.className = 'overlay';
            SG.characterOverlay.onclick = function(e) { if (e.target === SG.characterOverlay || e.target.closest('.modal-close-btn')) SG.characterOverlay.style.display = 'none'; };
            SG.characterOverlay.addEventListener('touchend', function(e) { if (e.target === SG.characterOverlay || e.target.closest('.modal-close-btn')) { e.preventDefault(); SG.characterOverlay.style.display = 'none'; } });
            document.body.appendChild(SG.characterOverlay);
        }

        var selected = SG.state.selectedCharacter || 'runner';
        var owned = SG.getOwnedCharacters ? SG.getOwnedCharacters() : ['runner'];
        var nextPrice = SG.getNextCharacterPrice ? SG.getNextCharacterPrice() : 0;
        var html = '<div class="menu-content character-modal">';
        html += '<h1 class="menu-title" style="font-size:28px;margin-bottom:5px;">CHARACTERS</h1>';
        html += '<div class="character-credit-line">' + (SG.state.credits || 0) + ' credits</div>';
        html += '<div class="character-layout">';
        html += '<div class="character-preview-wrap"><canvas id="character-preview-canvas"></canvas><div id="character-preview-name">' + esc((SG.getCharacterById ? SG.getCharacterById(selected).name : selected)) + '</div></div>';
        html += '<div class="character-list">';
        for (var i = 0; i < SG.characterCatalog.length; i++) {
            var ch = SG.characterCatalog[i];
            var isOwned = owned.indexOf(ch.id) >= 0;
            var isSelected = selected === ch.id;
            html += '<div class="character-card' + (isOwned ? ' owned' : '') + (isSelected ? ' selected' : '') + '" onclick="__neoPreviewCharacter(\'' + ch.id + '\')">';
            html += '<div class="character-info"><div class="character-name">' + esc(ch.name) + '</div><div class="character-desc">' + esc(ch.desc) + '</div></div>';
            if (isSelected) html += '<button class="diff-btn active" disabled>SELECTED</button>';
            else if (isOwned) html += '<button class="diff-btn" onclick="event.stopPropagation();__neoSelectCharacter(\'' + ch.id + '\')">SELECT</button>';
            else html += '<button class="diff-btn" onclick="event.stopPropagation();__neoBuyCharacter(\'' + ch.id + '\')">' + nextPrice + 'cr</button>';
            html += '</div>';
        }
        html += '</div></div>';
        html += '<div class="menu-btn modal-close-btn">CLOSE</div>';
        html += '</div>';

        SG.characterOverlay.innerHTML = html;
        SG.characterOverlay.style.display = 'flex';

        window.__neoPreviewCharacter = function(id) {
            var ch = SG.getCharacterById(id);
            var nameEl = document.getElementById('character-preview-name');
            if (ch && nameEl) nameEl.textContent = ch.name;
            SG.previewCharacter(id);
        };
        window.__neoSelectCharacter = function(id) {
            if (SG.selectCharacter(id)) {
                if (SG.saveShopData) SG.saveShopData();
                if (SG.accountSave) SG.accountSave();
                SG.showCharacters();
            }
        };
        window.__neoBuyCharacter = function(id) {
            if (SG.buyCharacter(id)) SG.showCharacters();
        };

        ensureCharacterPreview(document.getElementById('character-preview-canvas'));
        SG.previewCharacter(selected);
    };

    SG.updateMenuCredits = function() {
        var el = document.getElementById('menu-credits');
        if (el) el.textContent = '💰 TOTAL: ' + SG.state.credits;
    };

    SG.getSpeedKmh = function() {
        var metersPerSecond = typeof SG.state.instantSpeedMps === 'number'
            ? SG.state.instantSpeedMps
            : (SG.getDistanceRate ? SG.getDistanceRate(SG.state.speed) : ((SG.state.speed || 0) * 10));
        return Math.max(0, Math.round(metersPerSecond * 3.6));
    };

    SG.updateSpeedHUD = function() {
        var el = SG.speedHudEl || document.getElementById('third-person-speed-hud');
        if (!el || !SG.camera || !SG.player || !window.THREE) return;
        if (!SG.state.started || SG.state.gameOver || SG.state.firstPerson || SG.state.homelander) {
            el.style.display = 'none';
            return;
        }

        var pos = SG.player.position.clone();
        pos.x += 0.26;
        pos.y += 1.45;
        pos.project(SG.camera);

        if (pos.z < -1 || pos.z > 1) {
            el.style.display = 'none';
            return;
        }

        el.textContent = SG.getSpeedKmh() + ' km/h';
        el.style.left = ((pos.x * 0.5 + 0.5) * window.innerWidth) + 'px';
        el.style.top = ((-pos.y * 0.5 + 0.5) * window.innerHeight) + 'px';
        el.style.display = 'block';
    };

    // ===== SETTINGS OVERLAY =====
    SG.showSettings = function() {
        var overlay = document.getElementById('settings-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'settings-overlay';
            overlay.className = 'overlay';
            overlay.onclick = function(e) { if (e.target === overlay || e.target.closest('.modal-close-btn')) overlay.style.display = 'none'; };
            overlay.addEventListener('touchend', function(e) { if (e.target === overlay || e.target.closest('.modal-close-btn')) { e.preventDefault(); overlay.style.display = 'none'; } });
            document.body.appendChild(overlay);
        }
        var music = parseFloat(localStorage.getItem('subwayMusicVol') || '0.5');
        var sfx = parseFloat(localStorage.getItem('subwaySfxVol') || '0.8');
        var rollDelay = Math.max(0, Math.min(1000, parseInt(localStorage.getItem('subwayRollReleaseDelay') || String(SG.state.rollReleaseDelay || 200))));
        var bindings = SG.getKeyBindings ? SG.getKeyBindings() : { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown' };
        var thirdPersonView = localStorage.getItem('subwayThirdPersonView') || SG.state.thirdPersonView || 'near';
        var fpPitch = Math.max(-5, Math.min(5, parseFloat(localStorage.getItem('subwayFirstPersonPitchDeg') || String(typeof SG.state.firstPersonPitchDeg === 'number' ? SG.state.firstPersonPitchDeg : 1))));
        SG.state.musicVolume = music;
        SG.state.sfxVolume = sfx;
        SG.state.rollReleaseDelay = rollDelay;
        SG.state.thirdPersonView = thirdPersonView;
        SG.state.firstPersonPitchDeg = fpPitch;

        var actionOrder = ['up', 'down', 'left', 'right'];
        var viewOptions = [
            { key: 'far', label: 'Farthest', desc: 'Current camera distance' },
            { key: 'medium', label: 'Medium', desc: 'Closer third-person view' },
            { key: 'near', label: 'Closest', desc: 'Most immersive third-person view' }
        ];
        var html = '<div class="menu-content" style="max-width:640px;width:min(94vw,640px);max-height:88vh;overflow:auto;">';
        html += '<h1 class="menu-title" style="font-size:24px;">⚙ SETTINGS</h1>';
        html += '<div style="margin:12px 0;text-align:center;">';
        html += '<span class="s-label">🔊 Master</span>';
        html += '<button class="diff-btn" id="__mute-btn">' + (SG.state.muted ? 'OFF' : 'ON') + '</button>';
        html += '</div>';
        html += '<div style="margin:10px 0;">';
        html += '<div style="display:grid;grid-template-columns:30px 76px 1fr 44px;align-items:center;gap:8px;">';
        html += '<span style="justify-self:start;font-size:18px;">🎵</span><span class="s-label">Music</span><input type="range" min="0" max="1" step="0.1" value="' + music + '" class="__vol-slider" data-key="subwayMusicVol"><span class="vol-pct">' + Math.round(music * 100) + '%</span>';
        html += '</div>';
        html += '</div>';
        html += '<div style="margin:10px 0;">';
        html += '<div style="display:grid;grid-template-columns:30px 76px 1fr 44px;align-items:center;gap:8px;">';
        html += '<span style="justify-self:start;font-size:18px;">🔊</span><span class="s-label">SFX</span><input type="range" min="0" max="1" step="0.1" value="' + sfx + '" class="__vol-slider" data-key="subwaySfxVol"><span class="vol-pct">' + Math.round(sfx * 100) + '%</span>';
        html += '</div>';
        html += '</div>';
        html += '<div style="margin:14px 0 10px;">';
        html += '<div style="display:flex;justify-content:space-between;align-items:end;gap:10px;margin-bottom:6px;"><div><div class="s-label">Crouch Release Delay / 蹲起延迟</div><div style="color:#aaa;font-size:12px;text-align:left;">How long the character stays crouched after releasing Down</div></div><span id="__roll-delay-val" class="vol-pct">' + rollDelay + 'ms</span></div>';
        html += '<input type="range" min="0" max="1000" step="50" value="' + rollDelay + '" id="__roll-delay" style="width:100%;">';
        html += '</div>';
        html += '<div style="margin:14px 0 10px;">';
        html += '<div style="display:flex;justify-content:space-between;align-items:end;gap:10px;margin-bottom:6px;"><div><div class="s-label">First-Person View Height / 第一人称视角高度</div><div style="color:#aaa;font-size:12px;text-align:left;">Adjust camera pitch from -5° to +5°</div></div><span id="__fp-pitch-val" class="vol-pct">' + fpPitch.toFixed(0) + '°</span></div>';
        html += '<div style="display:grid;grid-template-columns:42px 1fr 42px;align-items:center;gap:8px;"><button class="diff-btn" id="__fp-pitch-down" style="min-width:42px;padding:8px;">-</button><input type="range" min="-5" max="5" step="1" value="' + fpPitch + '" id="__fp-pitch" style="width:100%;"><button class="diff-btn" id="__fp-pitch-up" style="min-width:42px;padding:8px;">+</button></div>';
        html += '</div>';
        html += '<div style="margin:14px 0 10px;">';
        html += '<div class="s-label" style="margin-bottom:8px;">Third-Person Camera</div>';
        html += '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;">';
        for (var vi = 0; vi < viewOptions.length; vi++) {
            var view = viewOptions[vi];
            var active = view.key === thirdPersonView ? ' selected' : '';
            html += '<button class="diff-btn __view-btn' + active + '" data-view="' + view.key + '" style="min-height:58px;padding:8px 6px;border:1px solid rgba(255,255,255,0.2);transition:background 0.12s,border-color 0.12s,box-shadow 0.12s,transform 0.12s;color:#fff;"><strong>' + view.label + '</strong><small style="display:block;color:#aaa;font-size:11px;margin-top:4px;line-height:1.2;">' + view.desc + '</small></button>';
        }
        html += '</div>';
        html += '</div>';
        html += '<div style="margin:14px 0 8px;">';
        html += '<div class="s-label" style="margin-bottom:8px;">Key Bindings</div>';
        html += '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;">';
        for (var ai = 0; ai < actionOrder.length; ai++) {
            var action = actionOrder[ai];
            var label = SG.keyBindingLabels && SG.keyBindingLabels[action] ? SG.keyBindingLabels[action] : action;
            var keyLabel = SG.formatKeyName ? SG.formatKeyName(bindings[action]) : bindings[action];
            html += '<button class="diff-btn __bind-btn" data-action="' + action + '" style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 10px;"><span>' + label + '</span><strong>' + keyLabel + '</strong></button>';
        }
        html += '</div>';
        html += '<button class="diff-btn" id="__reset-bindings" style="width:100%;margin-top:8px;">RESET KEYS</button>';
        html += '</div>';
        html += '<div class="menu-btn modal-close-btn" id="__settings-close">CLOSE</div>';
        html += '</div>';

        overlay.innerHTML = html;
        overlay.style.display = 'flex';

        // Wire up mute button
        var muteBtn = document.getElementById('__mute-btn');
        if (muteBtn) {
            muteBtn.onclick = function() {
                SG.toggleMute();
                var overlay2 = document.getElementById('settings-overlay');
                if (overlay2) SG.showSettings();
            };
        }
        // Wire up volume sliders
        var sliders = overlay.querySelectorAll('.__vol-slider');
        for (var si = 0; si < sliders.length; si++) {
            sliders[si].oninput = function() {
                var key = this.getAttribute('data-key');
                var val = parseFloat(this.value);
                localStorage.setItem(key, String(val));
                if (key === 'subwayMusicVol') SG.state.musicVolume = val;
                else if (key === 'subwaySfxVol') SG.state.sfxVolume = val;
                if (SG.updateHomelanderAudioVolume) SG.updateHomelanderAudioVolume();
                var pct = this.parentNode.querySelector('.vol-pct');
                if (pct) pct.textContent = Math.round(val * 100) + '%';
            };
        }
        var rollDelaySlider = document.getElementById('__roll-delay');
        if (rollDelaySlider) {
            rollDelaySlider.oninput = function() {
                var val = Math.max(0, Math.min(1000, parseInt(this.value || '200')));
                SG.state.rollReleaseDelay = val;
                localStorage.setItem('subwayRollReleaseDelay', String(val));
                var out = document.getElementById('__roll-delay-val');
                if (out) out.textContent = val + 'ms';
            };
        }
        var fpPitchSlider = document.getElementById('__fp-pitch');
        function setFirstPersonPitch(val) {
            val = Math.max(-5, Math.min(5, parseFloat(val || '1')));
            SG.state.firstPersonPitchDeg = val;
            localStorage.setItem('subwayFirstPersonPitchDeg', String(val));
            if (fpPitchSlider) fpPitchSlider.value = String(val);
            var out = document.getElementById('__fp-pitch-val');
            if (out) out.textContent = val.toFixed(0) + '°';
        }
        if (fpPitchSlider) {
            fpPitchSlider.oninput = function() { setFirstPersonPitch(this.value); };
        }
        var fpPitchDown = document.getElementById('__fp-pitch-down');
        var fpPitchUp = document.getElementById('__fp-pitch-up');
        if (fpPitchDown) fpPitchDown.onclick = function(e) { e.preventDefault(); setFirstPersonPitch((SG.state.firstPersonPitchDeg || 1) - 1); };
        if (fpPitchUp) fpPitchUp.onclick = function(e) { e.preventDefault(); setFirstPersonPitch((SG.state.firstPersonPitchDeg || 1) + 1); };
        function refreshViewButtons() {
            var btns = overlay.querySelectorAll('.__view-btn');
            for (var vi = 0; vi < btns.length; vi++) {
                var active = btns[vi].getAttribute('data-view') === SG.state.thirdPersonView;
                btns[vi].classList.toggle('selected', active);
                btns[vi].setAttribute('aria-pressed', active ? 'true' : 'false');
                btns[vi].style.borderColor = active ? '#22d3ee' : 'rgba(255,255,255,0.2)';
                btns[vi].style.background = active ? 'linear-gradient(135deg, rgba(34,211,238,0.34), rgba(250,204,21,0.18))' : '';
                btns[vi].style.boxShadow = active ? '0 0 0 2px rgba(34,211,238,0.35), 0 0 20px rgba(34,211,238,0.28)' : 'none';
                btns[vi].style.transform = active ? 'translateY(-1px)' : 'translateY(0)';
            }
        }
        var viewBtns = overlay.querySelectorAll('.__view-btn');
        for (var vk = 0; vk < viewBtns.length; vk++) {
            viewBtns[vk].onclick = function(e) {
                e.preventDefault();
                var view = this.getAttribute('data-view') || 'far';
                SG.state.thirdPersonView = view;
                localStorage.setItem('subwayThirdPersonView', view);
                refreshViewButtons();
            };
        }
        refreshViewButtons();
        function refreshBindingButtons() {
            var btns = overlay.querySelectorAll('.__bind-btn');
            var current = SG.getKeyBindings ? SG.getKeyBindings() : bindings;
            for (var bi = 0; bi < btns.length; bi++) {
                var action = btns[bi].getAttribute('data-action');
                var strong = btns[bi].querySelector('strong');
                if (strong) strong.textContent = SG.formatKeyName ? SG.formatKeyName(current[action]) : current[action];
                btns[bi].classList.remove('selected');
            }
        }
        var bindBtns = overlay.querySelectorAll('.__bind-btn');
        for (var bj = 0; bj < bindBtns.length; bj++) {
            bindBtns[bj].onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                var btn = this;
                var action = btn.getAttribute('data-action');
                refreshBindingButtons();
                btn.classList.add('selected');
                var strong = btn.querySelector('strong');
                if (strong) strong.textContent = '...';
                var capture = function(ev) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    document.removeEventListener('keydown', capture, true);
                    if (ev.key === 'Escape') {
                        refreshBindingButtons();
                        return;
                    }
                    if (SG.setKeyBinding) SG.setKeyBinding(action, ev.key);
                    refreshBindingButtons();
                };
                setTimeout(function() { document.addEventListener('keydown', capture, true); }, 0);
            };
        }
        var resetBindings = document.getElementById('__reset-bindings');
        if (resetBindings) {
            resetBindings.onclick = function(e) {
                e.preventDefault();
                if (SG.resetKeyBindings) SG.resetKeyBindings();
                refreshBindingButtons();
            };
        }
        // Wire up close button
        var closeBtn = document.getElementById('__settings-close');
        if (closeBtn) {
            closeBtn.onclick = function() { overlay.style.display = 'none'; };
        }
    };

    // ===== UI SETUP =====
    SG.setupUI = function() {
        SG.uiOverlay = document.createElement('div');
        SG.uiOverlay.id = 'ui-overlay';

        // ===== MAIN MENU =====
        SG.menuOverlay = document.createElement('div');
        SG.menuOverlay.id = 'menu-overlay';
        SG.menuOverlay.className = 'overlay';
        SG.menuOverlay.innerHTML = '' +
            '<div class="menu-shell">' +
                '<aside class="menu-sidebar">' +
                    '<div class="menu-brand">ENDLESS RUNNER<small>NEO EDITION</small></div>' +
                    '<div class="menu-nav-btn" id="shop-btn-menu"><span class="nav-ico">🛒</span> Shop</div>' +
                    '<div class="menu-nav-btn" id="characters-btn"><span class="nav-ico">◆</span> Characters</div>' +
                    '<div class="menu-nav-btn" id="profile-btn"><span class="nav-ico">👤</span> Profile</div>' +
                    '<div class="menu-nav-btn" id="leaderboard-btn"><span class="nav-ico">🏆</span> Leaderboard</div>' +
                    '<div class="menu-nav-btn" id="settings-btn-menu"><span class="nav-ico">⚙</span> Settings</div>' +
                    '<div class="menu-nav-btn danger" id="signout-btn"><span class="nav-ico">🚪</span> Sign Out</div>' +
                '</aside>' +
                '<section class="menu-main">' +
                    '<h1 class="menu-title">ENDLESS RUNNER</h1>' +
                    '<p class="menu-subtitle">Neo Edition</p>' +
                    '<div class="tap-to-start pulse">TAP TO START</div>' +
                    '<div class="diff-select">' +
                        '<button class="diff-btn" data-diff="0">EASY</button>' +
                        '<button class="diff-btn" data-diff="1">MEDIUM</button>' +
                        '<button class="diff-btn active" data-diff="2">HARD</button>' +
                    '</div>' +
                    '<div id="menu-credits">💰 TOTAL: 0</div>' +
                    '<div class="menu-controls">' +
                        '<span class="key">←</span> <span class="key">→</span> Move &nbsp;|&nbsp;' +
                        '<span class="key">↑</span> Jump &nbsp;|&nbsp;' +
                        '<span class="key">↓</span> Roll' +
                    '</div>' +
                    '<div class="menu-keys">ESC / P = Pause &nbsp;|&nbsp; M = Menu &nbsp;|&nbsp; 👁 FPV</div>' +
                    '<div class="menu-mobile-hint">Swipe to play on mobile</div>' +
                '</section>' +
            '</div>';
        SG.uiOverlay.appendChild(SG.menuOverlay);

        // ===== PAUSE OVERLAY =====
        SG.pauseOverlay = document.createElement('div');
        SG.pauseOverlay.id = 'pause-overlay';
        SG.pauseOverlay.className = 'overlay';
        SG.pauseOverlay.style.display = 'none';
        SG.pauseOverlay.innerHTML = '' +
            '<div class="menu-content">' +
                '<h1 class="menu-title">PAUSED</h1>' +
                '<div class="tap-to-start">TAP TO CONTINUE</div>' +
                '<div class="menu-btn" id="pause-menu-btn">RETURN TO MENU</div>' +
            '</div>';
        SG.uiOverlay.appendChild(SG.pauseOverlay);

        // ===== DEV CONSOLE =====
        var consoleEl = document.createElement('div');
        consoleEl.id = 'dev-console';
        consoleEl.style.display = 'none';
        consoleEl.innerHTML = '<div id="console-output"></div><div class="console-row"><span class="console-prompt">&gt;</span><input type="text" id="console-input" placeholder="help" autofocus/></div>';
        SG.uiOverlay.appendChild(consoleEl);

        SG.speedHudEl = document.createElement('div');
        SG.speedHudEl.id = 'third-person-speed-hud';
        SG.speedHudEl.style.cssText = 'position:fixed;left:50%;top:50%;z-index:18;display:none;pointer-events:none;transform:translate(-8px,2px);padding:3px 7px;border-radius:5px;background:rgba(0,0,0,0.16);border:1px solid rgba(255,255,255,0.14);color:rgba(255,255,255,0.94);font:700 12px/1.25 Arial,sans-serif;text-shadow:0 1px 6px rgba(0,0,0,0.85);letter-spacing:0;';
        SG.uiOverlay.appendChild(SG.speedHudEl);

        // ===== PAUSE BUTTON =====
        SG.pauseBtnEl = document.createElement('div');
        SG.pauseBtnEl.id = 'pause-btn';
        SG.pauseBtnEl.textContent = '\u23F8';
        SG.pauseBtnEl.style.display = 'none';
        SG.uiOverlay.appendChild(SG.pauseBtnEl);

        // ===== FPV TOGGLE BUTTON =====
        var fpvBtn = document.createElement('div');
        fpvBtn.id = 'fpv-btn';
        fpvBtn.textContent = '\uD83D\uDC41';
        fpvBtn.style.display = 'none';
        SG.uiOverlay.appendChild(fpvBtn);
        fpvBtn.addEventListener('click', function() { SG.state.firstPerson = !SG.state.firstPerson; fpvBtn.textContent = SG.state.firstPerson ? '\uD83D\uDC41' : '\uD83D\uDC41'; });
        fpvBtn.addEventListener('touchend', function(e) { e.preventDefault(); SG.state.firstPerson = !SG.state.firstPerson; });

        // ===== CONSOLE BUTTON =====
        var conBtn = document.createElement('div');
        conBtn.id = 'con-btn';
        conBtn.textContent = '>_';
        conBtn.style.display = 'none';
        SG.uiOverlay.appendChild(conBtn);
        conBtn.addEventListener('click', SG.toggleConsole);
        conBtn.addEventListener('touchend', function(e) { e.preventDefault(); SG.toggleConsole(); });

        // ===== MUTE BUTTON =====
        (function() {
            var btn = document.createElement('div');
            btn.id = 'mute-btn';
            btn.textContent = '\uD83D\uDD0A';
            btn.style.display = 'none';
            btn.style.cssText = 'position:absolute;top:16px;left:66px;width:40px;height:40px;font-size:18px;cursor:pointer;z-index:15;pointer-events:auto;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,0.35);border-radius:10px;border:1px solid rgba(255,255,255,0.08);transition:all 0.2s;color:rgba(255,255,255,0.7);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);text-align:center;line-height:40px;';
            SG.uiOverlay.appendChild(btn);
            btn.addEventListener('click', function() { SG.toggleMute(); });
            btn.addEventListener('touchend', function(e) { e.preventDefault(); SG.toggleMute(); });
        })();

        // ===== POLICE DISTANCE INDICATOR =====
        var policeEl = document.createElement('div');
        policeEl.id = 'police-indicator';
        policeEl.style.cssText = 'position:absolute;top:100px;left:50%;transform:translateX(-50%);font-size:16px;color:#ff4444;text-shadow:0 1px 8px rgba(0,0,0,0.9);display:none;pointer-events:none;background:rgba(0,0,0,0.4);padding:4px 14px;border-radius:8px;border:1px solid rgba(255,0,0,0.3);';
        policeEl.textContent = '\uD83D\uDE94 DISTANCE: 8.0m';
        SG.uiOverlay.appendChild(policeEl);
        SG.policeIndicatorEl = policeEl;

        // ===== MOBILE CONTROLS =====
        var mobileCtrl = document.createElement('div');
        mobileCtrl.id = 'mobile-controls';
        mobileCtrl.innerHTML = '' +
            '<div class="m-row">' +
                '<button class="m-btn" id="m-jump">▲</button>' +
            '</div>' +
            '<div class="m-row">' +
                '<button class="m-btn" id="m-left">◀</button>' +
                '<button class="m-btn" id="m-roll">▼</button>' +
                '<button class="m-btn" id="m-right">▶</button>' +
            '</div>';
        SG.uiOverlay.appendChild(mobileCtrl);

        // ===== SCORE DISPLAY =====
        var scoreDiv = document.createElement('div');
        scoreDiv.id = 'score-display';
        var coinsSpan = document.createElement('span');
        coinsSpan.className = 'coins-label';
        coinsSpan.textContent = '\uD83E\uDE99 ';
        var coinCount = document.createElement('span');
        coinCount.id = 'coin-count';
        coinCount.textContent = '0';
        coinsSpan.appendChild(coinCount);
        var sep = document.createTextNode('  |  ');
        var distSpan = document.createElement('span');
        distSpan.className = 'dist-label';
        distSpan.textContent = '\uD83C\uDFC3 ';
        var distCount = document.createElement('span');
        distCount.id = 'distance-count';
        distCount.textContent = '0';
        distSpan.appendChild(distCount);
        var mSpan = document.createTextNode('m');
        scoreDiv.appendChild(coinsSpan);
        scoreDiv.appendChild(sep);
        scoreDiv.appendChild(distSpan);
        scoreDiv.appendChild(mSpan);
        SG.uiOverlay.appendChild(scoreDiv);
        SG.scoreEl = distCount;
        SG.coinsEl = coinCount;

        // ===== BEST SCORE HUD =====
        var bestSmall = document.createElement('div');
        bestSmall.id = 'hud-best';
        bestSmall.style.cssText = 'position:absolute;top:72px;left:50%;transform:translateX(-50%);font-size:13px;color:rgba(136,204,255,0.6);text-shadow:0 1px 5px rgba(0,0,0,0.8);pointer-events:none;';
        bestSmall.textContent = 'BEST: ' + SG.state.bestScore + 'm';
        SG.uiOverlay.appendChild(bestSmall);

        // ===== SPEED INDICATOR =====
        var speedDiv = document.createElement('div');
        speedDiv.id = 'speed-indicator';
        speedDiv.textContent = 'SPD: 1x';
        SG.uiOverlay.appendChild(speedDiv);

        // ===== SKILL INDICATOR (equipped ability name) =====
        (function() {
            var el = document.createElement('div');
            el.id = 'skill-indicator';
            el.style.cssText = 'position:absolute;top:64px;right:16px;color:rgba(255,255,255,0.8);font-size:12px;text-shadow:0 1px 8px rgba(0,0,0,0.9);background:rgba(0,0,0,0.35);padding:4px 10px;border-radius:10px;backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);border:1px solid rgba(255,200,50,0.2);display:none;pointer-events:none;';
            el.textContent = '';
            SG.uiOverlay.appendChild(el);
        })();

        // ===== JETPACK TIMER (fuel / cooldown) =====
        (function() {
            var el = document.createElement('div');
            el.id = 'jetpack-timer';
            el.style.cssText = 'position:absolute;top:90px;right:16px;color:rgba(255,255,255,0.8);font-size:11px;text-shadow:0 1px 8px rgba(0,0,0,0.9);background:rgba(0,0,0,0.35);padding:3px 10px;border-radius:10px;backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);border:1px solid rgba(100,200,255,0.2);display:none;pointer-events:none;';
            el.textContent = '';
            SG.uiOverlay.appendChild(el);
        })();

        // ===== GUN TIMER =====
        (function() {
            var el = document.createElement('div');
            el.id = 'gun-hud';
            el.style.cssText = 'position:absolute;top:116px;right:16px;color:rgba(255,255,255,0.86);font-size:11px;text-shadow:0 1px 8px rgba(0,0,0,0.9);background:rgba(0,0,0,0.32);padding:3px 10px;border-radius:10px;backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);border:1px solid rgba(75,231,255,0.24);display:none;pointer-events:none;';
            el.textContent = '';
            SG.uiOverlay.appendChild(el);
        })();

        // ===== GUN CROSSHAIR =====
        (function() {
            var cross = document.createElement('div');
            cross.id = 'gun-crosshair';
            cross.style.cssText = 'position:fixed;left:50%;top:50%;width:24px;height:24px;transform:translate(-50%,-50%);display:none;visibility:hidden;opacity:0;pointer-events:none;z-index:9999;';
            var h = document.createElement('div');
            h.style.cssText = 'position:absolute;left:2px;right:2px;top:11px;height:2px;background:#ffe84a;box-shadow:0 0 6px rgba(255,232,74,0.95),0 0 1px #000;';
            var v = document.createElement('div');
            v.style.cssText = 'position:absolute;top:2px;bottom:2px;left:11px;width:2px;background:#ffe84a;box-shadow:0 0 6px rgba(255,232,74,0.95),0 0 1px #000;';
            var dot = document.createElement('div');
            dot.style.cssText = 'position:absolute;left:10px;top:10px;width:4px;height:4px;border-radius:50%;background:#fff38a;box-shadow:0 0 7px rgba(255,232,74,1);';
            cross.appendChild(h);
            cross.appendChild(v);
            cross.appendChild(dot);
            SG.uiOverlay.appendChild(cross);
        })();

        // ===== GAME OVER SCREEN =====
        var gameOverDiv = document.createElement('div');
        gameOverDiv.id = 'game-over-screen';

        var h1 = document.createElement('h1');
        h1.textContent = 'GAME OVER';
        gameOverDiv.appendChild(h1);

        var finalScoreDiv = document.createElement('div');
        finalScoreDiv.className = 'final-score';
        finalScoreDiv.textContent = 'Distance: ';
        var finalDistSpan = document.createElement('span');
        finalDistSpan.id = 'final-distance';
        finalDistSpan.textContent = '0';
        finalScoreDiv.appendChild(finalDistSpan);
        finalScoreDiv.appendChild(document.createTextNode('m'));
        gameOverDiv.appendChild(finalScoreDiv);

        var finalCoinsDiv = document.createElement('div');
        finalCoinsDiv.className = 'final-coins';
        finalCoinsDiv.textContent = 'Coins: ';
        var finalCoinSpan = document.createElement('span');
        finalCoinSpan.id = 'final-coins';
        finalCoinSpan.textContent = '0';
        finalCoinsDiv.appendChild(finalCoinSpan);
        gameOverDiv.appendChild(finalCoinsDiv);

        var bestDiv = document.createElement('div');
        bestDiv.id = 'best-score';
        bestDiv.className = 'final-coins';
        bestDiv.style.marginBottom = '20px';
        bestDiv.style.color = '#88ccff';
        bestDiv.textContent = 'BEST: ' + SG.state.bestScore + 'm';
        gameOverDiv.appendChild(bestDiv);

        var restartBtn = document.createElement('div');
        restartBtn.className = 'restart-btn';
        restartBtn.id = 'restart-btn';
        restartBtn.textContent = 'TAP TO RETRY';
        gameOverDiv.appendChild(restartBtn);

        var quitBtn = document.createElement('div');
        quitBtn.className = 'menu-btn';
        quitBtn.id = 'quit-btn';
        quitBtn.textContent = 'RETURN TO MENU';
        gameOverDiv.appendChild(quitBtn);

        SG.uiOverlay.appendChild(gameOverDiv);
        SG.gameOverEl = gameOverDiv;
        SG.finalScoreEl = finalDistSpan;
        SG.finalCoinsEl = finalCoinSpan;
        SG.restartBtnEl = restartBtn;

        // ===== INSTRUCTIONS =====
        var instrDiv = document.createElement('div');
        instrDiv.id = 'instructions';
        instrDiv.innerHTML = '' +
            '<span class="key">←</span> <span class="key">→</span> Move &nbsp;|&nbsp;' +
            '<span class="key">↑</span> Jump &nbsp;|&nbsp;' +
            '<span class="key">↓</span> Roll<br>' +
            'Swipe on mobile';
        SG.uiOverlay.appendChild(instrDiv);
        SG.instructionsEl = instrDiv;

        document.body.appendChild(SG.uiOverlay);

        // ===== EVENT LISTENERS =====
        SG.restartBtnEl.addEventListener('click', SG.restartGame);
        SG.restartBtnEl.addEventListener('touchend', function(e) { e.preventDefault(); SG.restartGame(); });

        var quitBtnEl = document.getElementById('quit-btn');
        if (quitBtnEl) {
            quitBtnEl.addEventListener('click', SG.quitToMenu);
            quitBtnEl.addEventListener('touchend', function(e) { e.preventDefault(); SG.quitToMenu(); });
        }

        SG.menuOverlay.addEventListener('click', function(e) { if (e.target.closest('.tap-to-start')) SG.startGameFromMenu(); });
        SG.menuOverlay.addEventListener('touchend', function(e) {
            e.preventDefault();
            if (e.target.closest('.tap-to-start')) SG.startGameFromMenu();
        });

        document.querySelectorAll('.diff-btn').forEach(function(btn) {
            var setDiff = function() {
                SG.state.difficulty = parseInt(btn.dataset.diff);
                document.querySelectorAll('.diff-btn').forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
            };
            btn.addEventListener('click', setDiff);
            btn.addEventListener('touchend', function(e) { e.preventDefault(); setDiff(); });
        });

        var shopBtnMenu = document.getElementById('shop-btn-menu');
        if (shopBtnMenu) {
            shopBtnMenu.addEventListener('click', function(e) { e.stopPropagation(); SG.showShop(); });
            shopBtnMenu.addEventListener('touchend', function(e) { e.stopPropagation(); e.preventDefault(); SG.showShop(); });
        }
        var charactersBtn = document.getElementById('characters-btn');
        if (charactersBtn) {
            charactersBtn.addEventListener('click', function(e) { e.stopPropagation(); SG.showCharacters(); });
            charactersBtn.addEventListener('touchend', function(e) { e.stopPropagation(); e.preventDefault(); SG.showCharacters(); });
        }
        var profileBtn = document.getElementById('profile-btn');
        if (profileBtn) {
            profileBtn.addEventListener('click', function(e) { e.stopPropagation(); SG.showProfile(); });
            profileBtn.addEventListener('touchend', function(e) { e.stopPropagation(); e.preventDefault(); SG.showProfile(); });
        }
        var leaderboardBtn = document.getElementById('leaderboard-btn');
        if (leaderboardBtn) {
            leaderboardBtn.addEventListener('click', function(e) { e.stopPropagation(); SG.showLeaderboard(); });
            leaderboardBtn.addEventListener('touchend', function(e) { e.stopPropagation(); e.preventDefault(); SG.showLeaderboard(); });
        }
        var settingsBtn = document.getElementById('settings-btn-menu');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', function(e) { e.stopPropagation(); SG.showSettings(); });
            settingsBtn.addEventListener('touchend', function(e) { e.stopPropagation(); e.preventDefault(); SG.showSettings(); });
        }
        var signoutBtn = document.getElementById('signout-btn');
        if (signoutBtn) {
            signoutBtn.addEventListener('click', function(e) { e.stopPropagation(); SG.accountLogout(); });
            signoutBtn.addEventListener('touchend', function(e) { e.stopPropagation(); e.preventDefault(); SG.accountLogout(); });
        }

        var pauseTapBtn = SG.pauseOverlay.querySelector('.tap-to-start');
        if (pauseTapBtn) {
            pauseTapBtn.addEventListener('click', function(e) { e.stopPropagation(); SG.togglePause(); });
            pauseTapBtn.addEventListener('touchend', function(e) { e.stopPropagation(); e.preventDefault(); SG.togglePause(); });
        }
        SG.pauseOverlay.addEventListener('click', function(e) {
            if (e.target.closest('.menu-btn')) return;
            if (e.target === SG.pauseOverlay) SG.togglePause();
        });
        SG.pauseOverlay.addEventListener('touchend', function(e) {
            if (e.target.closest('.menu-btn')) return;
            e.preventDefault();
            if (e.target === SG.pauseOverlay) SG.togglePause();
        });

        SG.pauseBtnEl.addEventListener('click', SG.togglePause);
        SG.pauseBtnEl.addEventListener('touchend', function(e) { e.preventDefault(); SG.togglePause(); });

        var pauseMenuBtn = document.getElementById('pause-menu-btn');
        if (pauseMenuBtn) {
            pauseMenuBtn.addEventListener('click', function(e) { e.stopPropagation(); SG.quitToMenu(); });
            pauseMenuBtn.addEventListener('touchend', function(e) { e.stopPropagation(); e.preventDefault(); SG.quitToMenu(); });
        }

        var conInput = document.getElementById('console-input');
        if (conInput) {
            SG.consoleHistory = SG.consoleHistory || [];
            SG.consoleHistoryIndex = SG.consoleHistory.length;
            SG.consoleCommands = SG.consoleCommands || {};

            SG.consoleLog = function(text, kind) {
                var out = document.getElementById('console-output');
                if (!out) return;
                var line = document.createElement('div');
                line.className = 'console-line' + (kind ? ' ' + kind : '');
                line.textContent = String(text);
                out.appendChild(line);
                while (out.children.length > 80) out.removeChild(out.firstChild);
                out.scrollTop = out.scrollHeight;
            };

            SG.clearConsole = function() {
                var out = document.getElementById('console-output');
                if (out) out.innerHTML = '';
            };

            SG.registerConsoleCommand = function(name, description, handler) {
                SG.consoleCommands[name] = { description: description, handler: handler };
            };

            SG.registerConsoleCommand('help', 'List available commands', function() {
                var names = Object.keys(SG.consoleCommands).filter(function(name) { return name !== 'homelander'; }).sort();
                SG.consoleLog('Commands: ' + names.join(', '), 'ok');
                SG.consoleLog('Try: status, speed 20, coins 5000, ability jetpack, normal');
            });
            SG.registerConsoleCommand('clear', 'Clear console output', function() { SG.clearConsole(); });
            SG.registerConsoleCommand('status', 'Show run state', function() {
                var speedLevel = SG.getSpeedLevel ? SG.getSpeedLevel(SG.state.speed) : 1;
                SG.consoleLog('score=' + Math.floor(SG.state.score || 0) + 'm coins=' + (SG.state.coins || 0) + ' speed=' + speedLevel + 'x ability=' + (SG.state.equippedAbility || 0), 'ok');
            });
            SG.registerConsoleCommand('speed', 'Set speed level 1-50', function(args) {
                var level = Math.max(1, Math.min(50, parseInt(args[0] || '1', 10) || 1));
                SG.state.speed = SG.speedForLevel ? SG.speedForLevel(level) : SG.START_SPEED + (SG.MAX_SPEED - SG.START_SPEED) * ((level - 1) / 49);
                SG.consoleLog('speed set to ' + level + 'x', 'ok');
            });
            SG.registerConsoleCommand('coins', 'Add credits/coins to this run', function(args) {
                var amount = Math.max(0, parseInt(args[0] || '0', 10) || 0);
                SG.state.coins += amount;
                SG.state.credits += amount;
                if (SG.updateMenuCredits) SG.updateMenuCredits();
                SG.consoleLog('added ' + amount + ' coins and credits', 'ok');
            });
            SG.registerConsoleCommand('ability', 'Equip ability: none/double/jetpack/roof', function(args) {
                var key = String(args[0] || '').toLowerCase();
                var map = { none: 0, double: 1, dj: 1, jetpack: 2, jet: 2, roof: 3 };
                if (!(key in map)) { SG.consoleLog('usage: ability none|double|jetpack|roof', 'err'); return; }
                SG.state.equippedAbility = map[key];
                if (SG.state.equippedAbility === 1) SG.state.canDoubleJump = true;
                if (SG.state.equippedAbility === 2) SG.state.canJetpack = true;
                if (SG.state.equippedAbility === 3) SG.state.canRoofWalk = true;
                if (SG.saveShopData) SG.saveShopData();
                SG.consoleLog('equipped ability ' + key, 'ok');
            });
            SG.registerConsoleCommand('restart', 'Restart current run', function() {
                if (SG.restartGame) SG.restartGame();
                SG.consoleLog('run restarted', 'ok');
            });
            SG.registerConsoleCommand('homelander', 'Easter egg: enable Homelander mode', function() {
                SG.state.homelander = true;
                SG.pendingHomelanderVoice = true;
                if (SG.activateHomelander) SG.activateHomelander();
                SG.consoleLog('homelander mode enabled', 'ok');
            });
            SG.registerConsoleCommand('normal', 'Disable Homelander mode', function() {
                if (SG.deactivateHomelander) SG.deactivateHomelander();
                SG.consoleLog('homelander mode disabled', 'ok');
            });
            SG.registerConsoleCommand('quit', 'Alias for normal', function() {
                if (SG.deactivateHomelander) SG.deactivateHomelander();
                SG.consoleLog('homelander mode disabled', 'ok');
            });

            SG.executeConsoleCommand = function(raw) {
                raw = String(raw || '').trim();
                if (!raw) return;
                SG.consoleLog('> ' + raw, 'cmd');
                SG.consoleHistory.push(raw);
                SG.consoleHistoryIndex = SG.consoleHistory.length;
                var parts = raw.split(/\s+/);
                var name = parts.shift().toLowerCase();
                var cmd = SG.consoleCommands[name];
                if (!cmd) {
                    SG.consoleLog('unknown command: ' + name + ' (type help)', 'err');
                    return;
                }
                try {
                    cmd.handler(parts, raw);
                } catch (err) {
                    SG.consoleLog('error: ' + (err && err.message ? err.message : err), 'err');
                }
            };

            function submitConsoleCommand() {
                var val = conInput.value.trim();
                conInput.value = '';
                SG.executeConsoleCommand(val);
            }
            conInput.addEventListener('keydown', function(e) {
                if (e.key === '`' || e.key === '~') {
                    e.preventDefault();
                    e.stopPropagation();
                    SG.toggleConsole();
                    return;
                }
                if (e.key === 'Enter' || e.keyCode === 13) {
                    e.preventDefault();
                    submitConsoleCommand();
                }
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    SG.consoleHistoryIndex = Math.max(0, SG.consoleHistoryIndex - 1);
                    conInput.value = SG.consoleHistory[SG.consoleHistoryIndex] || '';
                }
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    SG.consoleHistoryIndex = Math.min(SG.consoleHistory.length, SG.consoleHistoryIndex + 1);
                    conInput.value = SG.consoleHistory[SG.consoleHistoryIndex] || '';
                }
                if (e.key === 'Escape') {
                    if (SG.closeConsole) SG.closeConsole();
                }
                e.stopPropagation();
            });
            conInput.addEventListener('input', function() {
                if (conInput.value.includes('\n')) {
                    submitConsoleCommand();
                }
            });
            conInput.addEventListener('blur', function() {
                setTimeout(function() {
                    var con = document.getElementById('dev-console');
                    if (con && con.style.display === 'flex') conInput.focus();
                }, 0);
            });
        }

        // ===== MOBILE BUTTONS =====
        function bindMobileBtn(id, action, key) {
            var btn = document.getElementById(id);
            if (!btn) return;
            var start = function(e) {
                e.preventDefault(); e.stopPropagation();
                if (key) SG.keys[key] = true;
                if (SG.state.started && !SG.state.paused && !SG.state.gameOver) action();
            };
            var end = function(e) { if (key) SG.keys[key] = false; };
            btn.addEventListener('touchstart', start, { passive: false });
            btn.addEventListener('touchend', end, { passive: false });
            btn.addEventListener('touchcancel', end, { passive: false });
            btn.addEventListener('mousedown', start);
            btn.addEventListener('mouseup', end);
        }
        bindMobileBtn('m-left', SG.moveLeft, 'ArrowLeft');
        bindMobileBtn('m-right', SG.moveRight, 'ArrowRight');
        bindMobileBtn('m-jump', SG.jump, 'w');
        bindMobileBtn('m-roll', SG.roll, 's');
    };

    // ===== Toggle functions (on SG for cross-module access) =====
    SG.startGameFromMenu = function() {
        if (SG.state.started) return;
        SG.state.started = true;
        SG.menuOverlay.style.display = 'none';
        SG.pauseBtnEl.style.display = 'block';
        var cb = document.getElementById('con-btn');
        if (cb) cb.style.display = 'block';
        var audioBtns = ['mute-btn'];
        audioBtns.forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.style.display = 'flex';
        });
        if (!SG.audioCtx) SG.initAudio();
        if (SG.clock) SG.clock.getDelta();
        var f = document.getElementById('fpv-btn');
        if (f) f.style.display = 'block';
        SG.startBgMusic();
    };

    SG.closeConsole = function() {
        var con = document.getElementById('dev-console');
        if (!con) return;
        con.style.display = 'none';
        SG.state.paused = false;
        if (SG.updateGunCrosshair) SG.updateGunCrosshair();
        if (SG.updateGunViewModel) SG.updateGunViewModel();
        if (SG.playPendingHomelanderVoice) SG.playPendingHomelanderVoice();
    };

    SG.toggleConsole = function() {
        var con = document.getElementById('dev-console');
        if (!con) return;
        if (con.style.display === 'flex') {
            SG.closeConsole();
            return;
        }
        con.style.display = 'flex';
        SG.state.paused = true;
        if (SG.updateGunCrosshair) SG.updateGunCrosshair();
        if (SG.updateGunViewModel) SG.updateGunViewModel();
        var ci = document.getElementById('console-input');
        if (ci) {
            ci.value = '';
            ci.focus();
            setTimeout(function() { ci.focus(); }, 100);
        }
    };

    SG.togglePause = function() {
        if (!SG.state.started || SG.state.gameOver) return;
        SG.state.paused = !SG.state.paused;
        if (SG.state.paused) {
            SG.pauseOverlay.style.display = 'flex';
            SG.pauseBtnEl.textContent = '\u25B6';
            if (SG.clock) SG.clock.getDelta();
        } else {
            SG.pauseOverlay.style.display = 'none';
            SG.pauseBtnEl.textContent = '\u23F8';
            if (SG.clock) SG.clock.getDelta();
        }
        if (SG.updateGunCrosshair) SG.updateGunCrosshair();
        if (SG.updateGunViewModel) SG.updateGunViewModel();
    };

    SG.toggleMute = function() {
        SG.state.muted = !SG.state.muted;
        var muteBtn = document.getElementById('mute-btn');
        if (muteBtn) {
            muteBtn.textContent = SG.state.muted ? '\uD83D\uDD07' : '\uD83D\uDD0A';
        }
        if (SG.state.muted && SG.audioCtx) {
            try { SG.audioCtx.suspend(); } catch(e) {}
            SG.stopBgMusic();
            SG.stopSiren();
            if (SG.stopHomelanderAudio) SG.stopHomelanderAudio();
        } else if (!SG.state.muted && SG.audioCtx && SG.audioCtx.state === 'suspended') {
            try { SG.audioCtx.resume(); } catch(e) {}
            if (SG.state.started && !SG.state.gameOver) SG.startBgMusic();
            if (SG.state.homelander && SG.startHomelanderTheme) SG.startHomelanderTheme();
        }
    };
})();
