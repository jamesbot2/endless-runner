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
                    '<div class="menu-nav-btn" id="pvp-btn-menu"><span class="nav-ico">VS</span> PVP</div>' +
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

        var pvpOverlay = document.createElement('div');
        pvpOverlay.id = 'pvp-overlay';
        pvpOverlay.className = 'overlay';
        pvpOverlay.style.display = 'none';
        pvpOverlay.innerHTML = '<div id="pvp-panel" style="width:min(1040px,94vw);max-height:88vh;overflow:auto;background:rgba(4,6,14,.92);border:1px solid rgba(255,44,207,.45);box-shadow:0 0 34px rgba(155,77,255,.28);padding:24px;border-radius:8px;color:#f5f7ff;font-family:Arial,sans-serif;"></div>';
        SG.uiOverlay.appendChild(pvpOverlay);
        SG.pvpOverlay = pvpOverlay;

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

        var pvpHud = document.createElement('div');
        pvpHud.id = 'pvp-hud';
        pvpHud.style.cssText = 'position:absolute;top:16px;left:16px;display:none;min-width:220px;max-width:280px;padding:10px 12px;border-radius:8px;background:rgba(4,5,12,0.52);border:1px solid rgba(34,231,255,0.34);box-shadow:0 0 18px rgba(34,231,255,0.16),0 0 22px rgba(255,44,207,0.12);color:rgba(245,247,255,0.92);font:700 12px/1.45 Arial,sans-serif;pointer-events:none;text-shadow:0 1px 7px rgba(0,0,0,0.9);';
        SG.uiOverlay.appendChild(pvpHud);
        SG.pvpHudEl = pvpHud;

        var pvpExit = document.createElement('button');
        pvpExit.id = 'pvp-exit-btn';
        pvpExit.type = 'button';
        pvpExit.textContent = 'EXIT';
        pvpExit.style.cssText = 'position:fixed;right:18px;bottom:18px;display:none;z-index:100000;height:40px;padding:0 18px;border-radius:6px;border:1px solid rgba(255,44,207,0.72);background:rgba(5,7,16,0.86);box-shadow:0 0 18px rgba(255,44,207,0.4),0 0 22px rgba(34,231,255,0.2);color:#fff;font:900 12px/40px Arial,sans-serif;letter-spacing:0;cursor:pointer;pointer-events:auto;text-shadow:0 0 10px rgba(255,44,207,0.9);';
        pvpExit.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (SG.exitPvpToLobby) SG.exitPvpToLobby();
        });
        pvpExit.addEventListener('touchend', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (SG.exitPvpToLobby) SG.exitPvpToLobby();
        });
        document.body.appendChild(pvpExit);
        SG.pvpExitBtnEl = pvpExit;

        var pvpDeath = document.createElement('div');
        pvpDeath.id = 'pvp-death-feed';
        pvpDeath.style.cssText = 'position:absolute;top:96px;left:50%;transform:translateX(-50%);display:none;z-index:40;pointer-events:none;padding:7px 16px;border-radius:6px;background:rgba(4,5,12,0.45);border:1px solid rgba(255,216,77,0.32);box-shadow:0 0 20px rgba(255,44,207,0.18),0 0 14px rgba(34,231,255,0.12);color:#fff3a6;font:900 18px/1.25 Arial,sans-serif;text-shadow:0 0 12px rgba(255,44,207,0.85),0 1px 8px rgba(0,0,0,0.95);letter-spacing:0;';
        SG.uiOverlay.appendChild(pvpDeath);
        SG.pvpDeathFeedEl = pvpDeath;

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

        var countdownDiv = document.createElement('div');
        countdownDiv.id = 'start-countdown';
        countdownDiv.style.cssText = 'display:none;position:fixed;inset:0;align-items:center;justify-content:center;z-index:99999;pointer-events:none;font-family:Arial Black,Impact,sans-serif;font-size:clamp(78px,18vw,220px);font-weight:900;letter-spacing:0;color:#fff3a6;text-shadow:0 0 24px rgba(255,190,40,.95),0 8px 0 rgba(0,0,0,.38),0 0 2px #111;transform:translateY(-3vh);';
        document.body.appendChild(countdownDiv);
        SG.countdownOverlay = countdownDiv;

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
        var pvpBtn = document.getElementById('pvp-btn-menu');
        if (pvpBtn) {
            pvpBtn.addEventListener('click', function(e) { e.stopPropagation(); SG.showPvpLobby(); });
            pvpBtn.addEventListener('touchend', function(e) { e.stopPropagation(); e.preventDefault(); SG.showPvpLobby(); });
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

    // ===== PVP room shell =====
    SG.pvpRooms = SG.pvpRooms || [];
    SG.pvpRequiresServer = true;

    SG.getLocalPvpName = function() {
        return (SG.state && SG.state.username) || localStorage.getItem('subwayUsername') || 'You';
    };

    SG.createLocalPvpRoom = function() {
        var room = {
            id: 'LOCAL-' + Math.floor(1000 + Math.random() * 9000),
            name: 'Cyber Sprint',
            host: SG.getLocalPvpName(),
            localHost: true,
            players: [
                { name: SG.getLocalPvpName(), ready: false, local: true, lane: 1, startOffset: 0 }
            ],
            maxPlayers: 3,
            locked: false
        };
        SG.state.pvpRoom = room;
        SG.renderPvpLobby();
    };

    SG.joinLocalPvpRoom = function(roomId) {
        var room = null;
        for (var i = 0; i < SG.pvpRooms.length; i++) {
            if (SG.pvpRooms[i].id === roomId) room = SG.pvpRooms[i];
        }
        if (!room) return;
        var copy = {
            id: room.id,
            name: room.name,
            host: room.host,
            localHost: false,
            players: room.players.filter(function(p) { return p && !p.bot; }).slice(0, 2).map(function(p, idx) {
                return { name: p.name, ready: !!p.ready, lane: typeof p.lane === 'number' ? p.lane : idx, startOffset: typeof p.startOffset === 'number' ? p.startOffset : (-4 - idx * 4), characterId: p.characterId };
            }),
            maxPlayers: 3,
            locked: room.locked
        };
        copy.players.push({ name: SG.getLocalPvpName(), ready: false, local: true, lane: 1 });
        SG.state.pvpRoom = copy;
        SG.renderPvpLobby();
    };

    SG.invitePvpBot = function() {
        // Local AI opponents were removed for server-backed PVP testing.
        SG.renderPvpLobby();
    };

    function sanitizePvpPlayer(player, idx, localName) {
        if (!player || player.bot) return null;
        var name = player.name || player.username || player.id || ('Player ' + (idx + 1));
        var isLocal = !!player.local || name === localName || player.id === SG.state.pvpLocalPlayerId;
        return {
            id: player.id || player.playerId || name,
            name: name,
            ready: !!player.ready,
            local: isLocal,
            lane: typeof player.lane === 'number' ? Math.max(0, Math.min(2, player.lane)) : (isLocal ? 1 : (idx % 2 ? 2 : 0)),
            startOffset: typeof player.startOffset === 'number' ? player.startOffset : (isLocal ? 0 : -4 - idx * 4),
            characterId: player.characterId || player.character || 'runner',
            alive: player.alive !== false
        };
    }

    function sanitizePvpRoom(room) {
        if (!room) return null;
        var localName = SG.getLocalPvpName();
        var players = (room.players || []).map(function(player, idx) {
            return sanitizePvpPlayer(player, idx, localName);
        }).filter(Boolean);
        return {
            id: room.id || room.roomId || ('ROOM-' + Math.floor(1000 + Math.random() * 9000)),
            name: room.name || 'Cyber Sprint',
            host: room.host || room.hostName || '',
            localHost: !!room.localHost || room.host === localName || room.hostName === localName,
            players: players,
            maxPlayers: room.maxPlayers || 3,
            locked: !!room.locked
        };
    }

    SG.setPvpRoomsFromServer = function(rooms) {
        SG.pvpRooms = (Array.isArray(rooms) ? rooms : []).map(sanitizePvpRoom).filter(Boolean);
        if (SG.pvpOverlay && SG.pvpOverlay.style.display !== 'none' && !SG.state.pvpRoom) SG.renderPvpLobby();
    };

    SG.setPvpRoomFromServer = function(room) {
        SG.state.pvpRoom = sanitizePvpRoom(room);
        if (SG.pvpOverlay && SG.pvpOverlay.style.display !== 'none') SG.renderPvpLobby();
    };

    SG.togglePvpReady = function() {
        var room = SG.state.pvpRoom;
        if (!room) return;
        for (var i = 0; i < room.players.length; i++) {
            if (room.players[i].local) room.players[i].ready = !room.players[i].ready;
        }
        SG.renderPvpLobby();
    };

    SG.isPvpRoomReady = function(room) {
        if (!room || room.players.length < 1) return false;
        if (room.localHost && room.players.length === 1) return true;
        for (var i = 0; i < room.players.length; i++) {
            if (!room.players[i].ready) return false;
        }
        return true;
    };

    SG.closePvpLobby = function() {
        if (SG.leavePvpRoom && SG.state && SG.state.pvpRoom) {
            SG.leavePvpRoom();
        } else if (SG.state) {
            SG.state.pvpRoom = null;
        }
        if (SG.state) {
            SG.state.pvpMode = false;
            SG.state.pvpResult = null;
            SG.state.pvpSpectating = false;
            SG.state.pvpLocalDead = false;
            SG.state.pvpSpectateIndex = 0;
        }
        if (SG.quitToMenu) SG.quitToMenu();
        if (SG.pvpOverlay) SG.pvpOverlay.style.display = 'none';
        if (SG.menuOverlay) SG.menuOverlay.style.display = 'flex';
    };

    SG.renderPvpLobby = function() {
        var panel = document.getElementById('pvp-panel');
        if (!panel) return;
        var room = SG.state.pvpRoom;
        var html = '<div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:18px;">' +
            '<div><div style="font-size:28px;font-weight:900;color:#fff;letter-spacing:0;">PVP Rooms</div>' +
            '<div style="color:rgba(231,224,255,.72);font-size:13px;margin-top:4px;">Server-backed rooms only. No local AI opponents.</div></div>' +
            '<button id="pvp-close" style="height:38px;padding:0 16px;border-radius:6px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);color:#fff;font-weight:800;cursor:pointer;">Close</button></div>';
        if (!room) {
            html += '<button id="pvp-create" style="width:100%;height:44px;margin-bottom:16px;border:0;border-radius:6px;background:linear-gradient(90deg,#ff2ccf,#8d35ff);color:#fff;font-weight:900;cursor:pointer;">Create Room</button>';
            html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px;">';
            var listedRooms = (SG.pvpRooms || []).filter(function(listedRoom) { return listedRoom && !listedRoom.localOnly && !listedRoom.bot; });
            if (!listedRooms.length) {
                html += '<div style="grid-column:1/-1;border:1px solid rgba(141,53,255,.28);background:rgba(255,255,255,.04);border-radius:8px;padding:18px;color:rgba(231,224,255,.76);font-size:13px;line-height:1.5;">No server rooms loaded yet. Start the PVP server bridge, then refresh this panel or create a room.</div>';
            }
            for (var r = 0; r < listedRooms.length; r++) {
                var listed = listedRooms[r];
                html += '<div style="border:1px solid rgba(141,53,255,.35);background:rgba(255,255,255,.05);border-radius:8px;padding:14px;">' +
                    '<div style="font-size:17px;font-weight:900;color:#fff;">' + listed.name + '</div>' +
                    '<div style="font-size:12px;color:rgba(231,224,255,.7);margin:5px 0 12px;">Host: ' + listed.host + ' | ' + listed.players.length + '/' + listed.maxPlayers + '</div>' +
                    '<button class="pvp-join" data-room="' + listed.id + '" style="width:100%;height:36px;border-radius:6px;border:1px solid rgba(255,44,207,.55);background:rgba(255,44,207,.14);color:#fff;font-weight:800;cursor:pointer;">Join</button>' +
                '</div>';
            }
            html += '</div>';
        } else {
            html += '<div style="display:grid;grid-template-columns:1.2fr .8fr;gap:16px;">';
            html += '<section style="border:1px solid rgba(255,44,207,.35);border-radius:8px;padding:16px;background:rgba(255,255,255,.045);">' +
                '<div style="font-size:20px;font-weight:900;color:#fff;margin-bottom:4px;">' + room.name + '</div>' +
                '<div style="font-size:12px;color:rgba(231,224,255,.7);margin-bottom:14px;">Room ' + room.id + ' | Host: ' + room.host + ' | Max 3 players</div>';
            for (var p = 0; p < room.players.length; p++) {
                var player = room.players[p];
                var status = player.declined ? 'DECLINED' : (player.ready ? 'READY' : (player.invited ? 'INVITED' : 'WAITING'));
                html += '<div style="display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;margin:8px 0;padding:10px;border-radius:6px;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.08);">' +
                    '<div><strong>' + player.name + '</strong><span style="margin-left:8px;color:' + (player.ready ? '#68ffcc' : '#ffd36b') + ';">' + status + '</span><div style="font-size:11px;color:rgba(231,224,255,.58);">Lane ' + (player.lane + 1) + '</div></div>';
                html += '<div></div>';
                html += '</div>';
            }
            if (room.players.length < 2) {
                html += '<div style="margin-top:12px;padding:10px 12px;border-radius:6px;background:rgba(255,216,77,.08);border:1px solid rgba(255,216,77,.22);color:rgba(255,239,181,.9);font-size:12px;">Waiting for real server players. Local AI placeholders are disabled.</div>';
            }
            var ready = SG.isPvpRoomReady(room);
            html += '<div style="display:flex;gap:10px;margin-top:16px;">' +
                '<button id="pvp-ready" style="flex:1;height:40px;border-radius:6px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.08);color:#fff;font-weight:900;cursor:pointer;">Ready</button>' +
                '<button id="pvp-start" ' + (!room.localHost || !ready ? 'disabled' : '') + ' style="flex:1;height:40px;border-radius:6px;border:0;background:' + (room.localHost && ready ? 'linear-gradient(90deg,#ff2ccf,#8d35ff)' : 'rgba(255,255,255,.12)') + ';color:#fff;font-weight:900;cursor:' + (room.localHost && ready ? 'pointer' : 'not-allowed') + ';">Start Game</button>' +
                '<button id="pvp-leave" style="height:40px;padding:0 14px;border-radius:6px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#fff;font-weight:800;cursor:pointer;">Leave</button>' +
            '</div></section>';
            html += '<aside style="border:1px solid rgba(141,53,255,.32);border-radius:8px;padding:16px;background:rgba(0,0,0,.22);font-size:13px;color:rgba(241,237,255,.82);line-height:1.5;">' +
                '<strong style="display:block;color:#fff;font-size:16px;margin-bottom:8px;">PVP Rules</strong>' +
                '<div>Scene: cyber glass track</div><div>Difficulty: medium obstacles</div><div>Countdown: 10 seconds</div><div>Pause and console disabled</div><div>Players: no body collision</div><div>Opponents: server snapshots only</div></aside>';
            html += '</div>';
        }
        panel.innerHTML = html;
        var close = document.getElementById('pvp-close');
        if (close) close.onclick = SG.closePvpLobby;
        var create = document.getElementById('pvp-create');
        if (create) create.onclick = SG.createLocalPvpRoom;
        var leave = document.getElementById('pvp-leave');
        if (leave) leave.onclick = function() {
            if (SG.leavePvpRoom) SG.leavePvpRoom();
            else {
                SG.state.pvpRoom = null;
                SG.renderPvpLobby();
            }
        };
        var readyBtn = document.getElementById('pvp-ready');
        if (readyBtn) readyBtn.onclick = SG.togglePvpReady;
        var startBtn = document.getElementById('pvp-start');
        if (startBtn) startBtn.onclick = SG.startPvpRace;
        var joins = panel.querySelectorAll('.pvp-join');
        for (var j = 0; j < joins.length; j++) joins[j].onclick = function() { SG.joinLocalPvpRoom(this.getAttribute('data-room')); };
    };

    SG.showPvpLobby = function() {
        if (!SG.pvpOverlay) return;
        SG.renderPvpLobby();
        SG.pvpOverlay.style.display = 'flex';
    };

    SG.playPvpOpponentAnimation = function(opponent, name) {
        if (!opponent || !opponent.actions) return;
        var next = opponent.actions[String(name || '').toLowerCase()];
        if (!next || opponent.action === next) return;
        if (opponent.action) opponent.action.fadeOut(0.12);
        next.reset().fadeIn(0.12).play();
        opponent.action = next;
    };

    SG.loadPvpOpponentModel = function(opponent, characterId) {
        if (!opponent || !opponent.group || opponent.modelRequested || !THREE || !THREE.GLTFLoader) return;
        opponent.modelRequested = true;
        var character = SG.getCharacterById ? SG.getCharacterById(characterId || 'runner') : null;
        var path = character && character.path ? character.path : 'models/player.glb';
        var loader = new THREE.GLTFLoader();
        loader.load(path, function(gltf) {
            if (!opponent.group) return;
            var model = gltf.scene || (gltf.scenes && gltf.scenes[0]);
            if (!model) return;
            model.name = 'PvpOpponentModel-' + (character ? character.id : 'runner');
            if (SG.normalizePlayerModel) SG.normalizePlayerModel(model);
            model.traverse(function(node) {
                if (node && node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            });
            var placeholder = opponent.group.getObjectByName('pvp-opponent-placeholder');
            if (placeholder) placeholder.visible = false;
            opponent.model = model;
            opponent.group.add(model);
            opponent.actions = {};
            if (gltf.animations && gltf.animations.length && THREE.AnimationMixer) {
                opponent.mixer = new THREE.AnimationMixer(model);
                for (var i = 0; i < gltf.animations.length; i++) {
                    var clip = gltf.animations[i];
                    opponent.actions[String(clip.name || '').toLowerCase()] = opponent.mixer.clipAction(clip);
                }
                SG.playPvpOpponentAnimation(opponent, 'Run');
            }
            if (SG.applyPvpNeonStyleToObject) SG.applyPvpNeonStyleToObject(opponent.group, 'opponent', opponent.colorIndex || 0);
        }, undefined, function() {
            opponent.modelError = true;
        });
    };

    SG.createPvpGhostGroup = function(name, lane, color) {
        var group = new THREE.Group();
        group.userData.pvpGhost = true;
        group.userData.pvpOpponent = true;
        group.userData.name = name;
        group.userData.lane = lane;
        var mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.46, depthWrite: false });
        var coreGeo = THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(0.28, 0.9, 4, 8) : new THREE.CylinderGeometry(0.28, 0.28, 1.25, 12);
        var core = new THREE.Mesh(coreGeo, mat);
        core.name = 'pvp-opponent-placeholder';
        core.position.y = 0.85;
        core.renderOrder = 80;
        group.add(core);
        var head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), mat);
        head.position.y = 1.62;
        head.renderOrder = 80;
        group.add(head);
        var chest = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.018, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.68, depthWrite: false, blending: THREE.AdditiveBlending }));
        chest.position.y = 1.12;
        chest.rotation.x = Math.PI / 2;
        chest.renderOrder = 82;
        group.add(chest);
        var halo = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 32), new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.78, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
        halo.position.y = 0.05;
        halo.rotation.x = Math.PI / 2;
        halo.renderOrder = 81;
        group.add(halo);
        var labelCanvas = document.createElement('canvas');
        labelCanvas.width = 256;
        labelCanvas.height = 64;
        var labelCtx = labelCanvas.getContext('2d');
        labelCtx.fillStyle = 'rgba(0,0,0,0.2)';
        labelCtx.fillRect(0, 0, 256, 64);
        labelCtx.font = '700 28px Arial';
        labelCtx.textAlign = 'center';
        labelCtx.textBaseline = 'middle';
        labelCtx.fillStyle = '#ffffff';
        labelCtx.shadowColor = '#' + color.toString(16).padStart(6, '0');
        labelCtx.shadowBlur = 14;
        labelCtx.fillText(name, 128, 32);
        var labelTex = new THREE.CanvasTexture(labelCanvas);
        var label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex, transparent: true, depthWrite: false }));
        label.position.y = 2.1;
        label.scale.set(1.6, 0.4, 1);
        label.renderOrder = 83;
        group.add(label);
        group.position.set(SG.LANE_POSITIONS[lane], SG.PLAYER_Y, -2);
        group.renderOrder = 80;
        return group;
    };

    SG.spawnPvpGhosts = function(room) {
        SG.state.pvpGhosts = [];
        SG.state.pvpOpponents = [];
        if (!room || !SG.scene) return;
        var colors = [0xff2ccf, 0x8d35ff, 0x42f5ff];
        var characterIds = ['punk', 'swat', 'adventurer'];
        for (var i = 0; i < room.players.length; i++) {
            var p = room.players[i];
            if (p.local || p.bot) continue;
            var opponent = {
                id: p.id || p.playerId || p.name,
                name: p.name,
                lane: typeof p.lane === 'number' ? p.lane : (i % 3),
                targetLane: typeof p.lane === 'number' ? p.lane : (i % 3),
                distance: typeof p.distance === 'number' ? p.distance : 0,
                speedBias: 0.9 + i * 0.18,
                startOffset: typeof p.startOffset === 'number' ? p.startOffset : (-4 - SG.state.pvpGhosts.length * 4),
                isJumping: false,
                isRolling: false,
                jumpTimer: 0,
                rollTimer: 0,
                laneTimer: 0.9 + i * 0.55,
                alive: p.alive !== false,
                status: 'RUN',
                colorIndex: i,
                serverControlled: true,
                group: SG.createPvpGhostGroup(p.name, typeof p.lane === 'number' ? p.lane : (i % 3), colors[i % colors.length])
            };
            opponent.group.position.z = opponent.startOffset;
            SG.scene.add(opponent.group);
            SG.state.pvpGhosts.push(opponent);
            SG.state.pvpOpponents.push(opponent);
            SG.loadPvpOpponentModel(opponent, p.characterId || characterIds[SG.state.pvpOpponents.length % characterIds.length]);
        }
    };

    SG.updatePvpOpponentState = function(opponent, index, delta) {
        if (!opponent || !opponent.alive) return;
        if (opponent.serverControlled) {
            opponent.status = !opponent.alive ? 'OUT' : (opponent.isJumping ? 'JUMP' : (opponent.isRolling ? 'ROLL' : (opponent.targetLane !== opponent.lane ? 'LANE' : 'RUN')));
            return;
        }
        return;
        opponent.laneTimer -= delta;
        if (opponent.laneTimer <= 0) {
            opponent.laneTimer = 1.0 + ((index + Math.floor(SG.state.gameTime * 2)) % 3) * 0.45;
            var nextLane = (opponent.targetLane + (index % 2 ? 1 : 2)) % 3;
            opponent.targetLane = nextLane;
        }
        var phase = SG.state.gameTime + index * 1.7;
        if (!opponent.isJumping && !opponent.isRolling && Math.sin(phase * 1.15) > 0.985) {
            opponent.isJumping = true;
            opponent.jumpTimer = 0.72;
        }
        if (!opponent.isJumping && !opponent.isRolling && Math.cos(phase * 1.35) > 0.985) {
            opponent.isRolling = true;
            opponent.rollTimer = 0.62;
        }
        if (opponent.isJumping) {
            opponent.jumpTimer -= delta;
            if (opponent.jumpTimer <= 0) opponent.isJumping = false;
        }
        if (opponent.isRolling) {
            opponent.rollTimer -= delta;
            if (opponent.rollTimer <= 0) opponent.isRolling = false;
        }
        opponent.status = opponent.isJumping ? 'JUMP' : (opponent.isRolling ? 'ROLL' : (opponent.lane !== opponent.targetLane ? 'LANE' : 'RUN'));
        if (opponent.distance > 520 + index * 110) {
            opponent.alive = false;
            opponent.status = 'OUT';
            if (SG.showPvpDeathNotice) SG.showPvpDeathNotice(opponent.name);
            if (opponent.group) opponent.group.visible = false;
        }
    };

    SG.applyPvpOpponentSnapshot = function(opponent, snapshot) {
        if (!opponent || !snapshot) return;
        var wasAlive = opponent.alive !== false;
        if (typeof snapshot.lane === 'number') opponent.targetLane = Math.max(0, Math.min(2, snapshot.lane));
        if (typeof snapshot.distance === 'number') opponent.distance = Math.max(opponent.distance || 0, snapshot.distance);
        if (typeof snapshot.isJumping === 'boolean') {
            opponent.isJumping = snapshot.isJumping;
            if (snapshot.isJumping && opponent.jumpTimer <= 0) opponent.jumpTimer = 0.5;
        }
        if (typeof snapshot.isRolling === 'boolean') {
            opponent.isRolling = snapshot.isRolling;
            if (snapshot.isRolling && opponent.rollTimer <= 0) opponent.rollTimer = 0.45;
        }
        if (typeof snapshot.alive === 'boolean') {
            opponent.alive = snapshot.alive;
            if (wasAlive && opponent.alive === false && SG.showPvpDeathNotice) SG.showPvpDeathNotice(opponent.name);
        }
        opponent.status = !opponent.alive ? 'OUT' : (opponent.isJumping ? 'JUMP' : (opponent.isRolling ? 'ROLL' : (opponent.targetLane !== opponent.lane ? 'LANE' : 'RUN')));
    };

    SG.upsertPvpOpponentFromServer = function(snapshot) {
        if (!snapshot || snapshot.local || snapshot.bot || !SG.scene) return null;
        var id = snapshot.id || snapshot.playerId || snapshot.name;
        if (!id) return null;
        var opponent = null;
        for (var i = 0; i < SG.state.pvpOpponents.length; i++) {
            if (SG.state.pvpOpponents[i].id === id || SG.state.pvpOpponents[i].name === id) opponent = SG.state.pvpOpponents[i];
        }
        if (!opponent) {
            var lane = typeof snapshot.lane === 'number' ? Math.max(0, Math.min(2, snapshot.lane)) : 0;
            opponent = {
                id: id,
                name: snapshot.name || id,
                lane: lane,
                targetLane: lane,
                distance: 0,
                startOffset: typeof snapshot.startOffset === 'number' ? snapshot.startOffset : -4 - SG.state.pvpOpponents.length * 4,
                isJumping: false,
                isRolling: false,
                jumpTimer: 0,
                rollTimer: 0,
                alive: true,
                status: 'RUN',
                colorIndex: SG.state.pvpOpponents.length,
                serverControlled: true,
                group: SG.createPvpGhostGroup(snapshot.name || id, lane, [0xff2ccf, 0x8d35ff, 0x42f5ff][SG.state.pvpOpponents.length % 3])
            };
            opponent.group.position.z = opponent.startOffset;
            SG.scene.add(opponent.group);
            SG.state.pvpGhosts.push(opponent);
            SG.state.pvpOpponents.push(opponent);
            SG.loadPvpOpponentModel(opponent, snapshot.characterId || snapshot.character || 'runner');
        }
        SG.applyPvpOpponentSnapshot(opponent, snapshot);
        return opponent;
    };

    SG.getLocalPvpSnapshot = function() {
        return {
            lane: SG.state.targetLane,
            distance: Math.floor(SG.state.score || 0),
            isJumping: !!SG.state.isJumping,
            isRolling: !!SG.state.isRolling,
            alive: !SG.state.pvpLocalDead,
            spectating: !!SG.state.pvpSpectating,
            characterId: SG.state.selectedCharacter || 'runner',
            timestamp: Date.now()
        };
    };

    SG.pvpPhase2Protocol = {
        transport: 'websocket',
        clientSendHz: 20,
        serverBroadcastHz: 20,
        snapshotFields: ['lane', 'distance', 'isJumping', 'isRolling', 'alive', 'spectating', 'characterId', 'timestamp'],
        noPlayerCollision: true,
        spectatorCamera: true
    };

    SG.updatePvpGhosts = function(delta) {
        if (!SG.state.pvpMode) return;
        var playerDistance = SG.state.score || 0;
        for (var i = 0; i < SG.state.pvpGhosts.length; i++) {
            var ghost = SG.state.pvpGhosts[i];
            SG.updatePvpOpponentState(ghost, i, delta);
            if (ghost.mixer) ghost.mixer.update(delta);
            if (!ghost.alive) continue;
            var lead = Math.max(-12, Math.min(8, ghost.startOffset + (ghost.distance - playerDistance) * 0.22));
            if (ghost.group) {
                ghost.group.position.x += (SG.LANE_POSITIONS[ghost.targetLane] - ghost.group.position.x) * 0.12;
                ghost.group.position.z += (lead - ghost.group.position.z) * 0.12;
                var jumpY = ghost.isJumping ? Math.sin((1 - ghost.jumpTimer / 0.72) * Math.PI) * 1.0 : 0;
                var rollScaleY = ghost.isRolling ? 0.58 : 1;
                ghost.group.position.y = SG.PLAYER_Y + jumpY + Math.sin(SG.state.gameTime * 9 + i) * 0.025;
                ghost.group.scale.y += (rollScaleY - ghost.group.scale.y) * 0.18;
                ghost.group.rotation.y = Math.PI;
                ghost.group.visible = true;
                SG.playPvpOpponentAnimation(ghost, ghost.isRolling ? 'Slide' : (ghost.isJumping ? 'Jump' : (ghost.status === 'LANE' ? (ghost.targetLane < ghost.lane ? 'StrafeLeft' : 'StrafeRight') : 'Run')));
                if (Math.abs(ghost.group.position.x - SG.LANE_POSITIONS[ghost.targetLane]) < 0.08) ghost.lane = ghost.targetLane;
            }
        }
        if (SG.pvpHudEl) {
            var lines = ['PVP ROOM ' + (SG.state.pvpRoom ? SG.state.pvpRoom.id : 'LOCAL')];
            lines.push((SG.state.pvpLocalDead ? 'You OUT' : 'You RUN') + ' ' + Math.floor(playerDistance) + 'm');
            for (var g = 0; g < SG.state.pvpGhosts.length; g++) {
                var op = SG.state.pvpGhosts[g];
                lines.push(op.name + ' ' + op.status + ' L' + (op.targetLane + 1) + ' ' + Math.floor(op.distance) + 'm');
            }
            if (SG.state.pvpSpectating) lines.push('SPECTATING: ' + (SG.getPvpSpectateTargetName ? SG.getPvpSpectateTargetName() : 'PLAYER'));
            SG.pvpHudEl.innerHTML = lines.join('<br>');
        }
        if (SG.state.pvpLocalDead && SG.getAlivePvpOpponents && SG.getAlivePvpOpponents().length === 0 && SG.finishPvpMatch) {
            SG.finishPvpMatch();
        }
    };

    SG.buildPvpResult = function(playerDistance) {
        var rows = [{ name: SG.getLocalPvpName(), distance: playerDistance || 0 }];
        for (var i = 0; i < SG.state.pvpGhosts.length; i++) {
            rows.push({ name: SG.state.pvpGhosts[i].name, distance: SG.state.pvpGhosts[i].distance || 0 });
        }
        rows.sort(function(a, b) { return b.distance - a.distance; });
        return rows;
    };

    SG.getAlivePvpOpponents = function() {
        return (SG.state.pvpOpponents || SG.state.pvpGhosts || []).filter(function(op) {
            return op && op.alive !== false && op.group;
        });
    };

    SG.getPvpSpectateTarget = function() {
        var alive = SG.getAlivePvpOpponents ? SG.getAlivePvpOpponents() : [];
        if (!alive.length) return null;
        SG.state.pvpSpectateIndex = Math.max(0, Math.min(alive.length - 1, SG.state.pvpSpectateIndex || 0));
        return alive[SG.state.pvpSpectateIndex].group;
    };

    SG.getPvpSpectateTargetName = function() {
        var alive = SG.getAlivePvpOpponents ? SG.getAlivePvpOpponents() : [];
        if (!alive.length) return 'NONE';
        SG.state.pvpSpectateIndex = Math.max(0, Math.min(alive.length - 1, SG.state.pvpSpectateIndex || 0));
        return alive[SG.state.pvpSpectateIndex].name;
    };

    SG.cyclePvpSpectateTarget = function(dir) {
        if (!SG.state.pvpSpectating) return;
        var alive = SG.getAlivePvpOpponents ? SG.getAlivePvpOpponents() : [];
        if (!alive.length) return;
        SG.state.pvpSpectateIndex = (SG.state.pvpSpectateIndex + dir + alive.length) % alive.length;
        if (SG.updatePvpGhosts) SG.updatePvpGhosts(0);
    };

    SG.enterPvpSpectator = function() {
        if (SG.showPvpDeathNotice) SG.showPvpDeathNotice(SG.getLocalPvpName ? SG.getLocalPvpName() : 'You');
        SG.state.pvpLocalDead = true;
        SG.state.pvpSpectating = true;
        SG.state.pvpSpectateIndex = 0;
        SG.state.gameOver = false;
        SG.state.started = true;
        SG.state.paused = false;
        SG.state.firstPerson = false;
        SG.state.isJumping = false;
        SG.state.isRolling = false;
        if (SG.player) SG.player.visible = false;
        if (SG.pvpPlayerAura) SG.pvpPlayerAura.visible = false;
        if (SG.gameOverEl) SG.gameOverEl.classList.remove('visible');
        if (SG.pvpHudEl) {
            SG.pvpHudEl.style.display = 'block';
            SG.pvpHudEl.innerHTML = 'SPECTATING: ' + SG.getPvpSpectateTargetName();
        }
        if (SG.pvpExitBtnEl) SG.pvpExitBtnEl.style.display = 'block';
    };

    SG.showPvpDeathNotice = function(name) {
        if (!SG.state.pvpMode || !SG.pvpDeathFeedEl) return;
        var safeName = String(name || 'PLAYER').replace(/[<>&]/g, '');
        SG.pvpDeathFeedEl.textContent = safeName + ' DIED';
        SG.pvpDeathFeedEl.style.display = 'block';
        SG.pvpDeathFeedEl.style.opacity = '1';
        SG.pvpDeathFeedEl.style.transform = 'translateX(-50%) translateY(0) scale(1.02)';
        if (SG.pvpDeathFeedTimer) clearTimeout(SG.pvpDeathFeedTimer);
        SG.pvpDeathFeedTimer = setTimeout(function() {
            if (!SG.pvpDeathFeedEl) return;
            SG.pvpDeathFeedEl.style.transition = 'opacity 220ms ease, transform 220ms ease';
            SG.pvpDeathFeedEl.style.opacity = '0';
            SG.pvpDeathFeedEl.style.transform = 'translateX(-50%) translateY(-6px) scale(0.98)';
            SG.pvpDeathFeedTimer = setTimeout(function() {
                if (!SG.pvpDeathFeedEl) return;
                SG.pvpDeathFeedEl.style.display = 'none';
                SG.pvpDeathFeedEl.style.transition = '';
                SG.pvpDeathFeedEl.style.transform = 'translateX(-50%)';
            }, 240);
        }, 1900);
    };

    SG.finishPvpMatch = function() {
        if (!SG.state.pvpMode) return;
        SG.state.pvpSpectating = false;
        SG.state.gameOver = true;
        SG.state.started = false;
        SG.state.pvpResult = SG.buildPvpResult ? SG.buildPvpResult(SG.state.score || 0) : null;
        if (SG.gameOverEl) {
            var title = SG.gameOverEl.querySelector('h1');
            if (title) title.textContent = 'PVP FINISHED';
            var oldRanks = document.getElementById('pvp-results');
            if (oldRanks) oldRanks.remove();
            if (SG.state.pvpResult) {
                var ranks = document.createElement('div');
                ranks.id = 'pvp-results';
                ranks.style.cssText = 'margin:12px auto 16px;max-width:320px;text-align:left;font:700 13px/1.5 Arial,sans-serif;color:#f7eaff;background:rgba(14,4,24,.55);border:1px solid rgba(255,44,207,.3);border-radius:8px;padding:10px 12px;';
                ranks.innerHTML = SG.state.pvpResult.map(function(row, idx) {
                    return '<div>' + (idx + 1) + '. ' + row.name + ' - ' + Math.floor(row.distance) + 'm</div>';
                }).join('');
                SG.gameOverEl.insertBefore(ranks, SG.restartBtnEl || null);
            }
            SG.gameOverEl.classList.add('visible');
        }
    };

    SG.exitPvpToLobby = function() {
        SG.stopBgMusic();
        SG.state.pvpMode = false;
        SG.state.started = false;
        SG.state.gameOver = false;
        SG.state.countdownActive = false;
        SG.state.pvpResult = null;
        SG.state.pvpSpectating = false;
        SG.state.pvpLocalDead = false;
        SG.state.pvpSpectateIndex = 0;
        if (SG.pvpHudEl) SG.pvpHudEl.style.display = 'none';
        if (SG.pvpExitBtnEl) SG.pvpExitBtnEl.style.display = 'none';
        if (SG.pvpDeathFeedEl) SG.pvpDeathFeedEl.style.display = 'none';
        if (SG.gameOverEl) {
            SG.gameOverEl.classList.remove('visible');
            var title = SG.gameOverEl.querySelector('h1');
            if (title) title.textContent = 'GAME OVER';
            var oldRanks = document.getElementById('pvp-results');
            if (oldRanks) oldRanks.remove();
        }
        SG.resetAllGameObjects();
        SG.resetCyberMode();
        SG.spawnInitialTrack();
        SG.spawnBuildings();
        SG.spawnObstacles();
        if (SG.menuOverlay) SG.menuOverlay.style.display = 'none';
        if (SG.pvpOverlay) {
            SG.renderPvpLobby();
            SG.pvpOverlay.style.display = 'flex';
        }
    };

    SG.startPvpRace = function() {
        var room = SG.state.pvpRoom;
        if (!SG.isPvpRoomReady(room) || !room.localHost) return;
        if (SG.cancelStartCountdown) SG.cancelStartCountdown();
        SG.stopBgMusic();
        SG.stopPoliceChase();
        SG.resetAllGameObjects();
        SG.state.pvpMode = true;
        SG.state.pvpResult = null;
        SG.state.difficulty = 1;
        SG.state.score = 0;
        SG.state.coins = 0;
        SG.state.speed = SG.START_SPEED;
        SG.state.gameOver = false;
        SG.state.started = false;
        SG.state.paused = false;
        SG.state.pvpSpectating = false;
        SG.state.pvpLocalDead = false;
        SG.state.pvpSpectateIndex = 0;
        if (SG.pvpDeathFeedEl) SG.pvpDeathFeedEl.style.display = 'none';
        SG.state.currentLane = 1;
        SG.state.targetLane = 1;
        SG.state.laneLerp = 1;
        SG.state.isJumping = false;
        SG.state.isRolling = false;
        SG.state.jumpVelocity = 0;
        SG.state.playerHeight = SG.PLAYER_Y;
        SG.state.targetPlayerHeight = SG.PLAYER_Y;
        SG.state.gameTime = 0;
        if (SG.player) {
            SG.player.position.set(SG.LANE_POSITIONS[1], SG.PLAYER_Y, 0);
            SG.player.rotation.set(0, Math.PI, 0);
            SG.player.visible = true;
        }
        if (SG.menuOverlay) SG.menuOverlay.style.display = 'none';
        if (SG.pvpOverlay) SG.pvpOverlay.style.display = 'none';
        if (SG.pauseOverlay) SG.pauseOverlay.style.display = 'none';
        if (SG.pauseBtnEl) SG.pauseBtnEl.style.display = 'none';
        var con = document.getElementById('con-btn');
        if (con) con.style.display = 'none';
        if (SG.pvpHudEl) SG.pvpHudEl.style.display = 'block';
        if (SG.pvpExitBtnEl) SG.pvpExitBtnEl.style.display = 'block';
        if (SG.clearGunSystem) SG.clearGunSystem();
        SG.applyPvpScene(true);
        SG.spawnInitialTrack();
        SG.spawnBuildings();
        SG.spawnObstacles();
        SG.spawnPvpGhosts(room);
        if (SG.updatePvpVisualStyle) SG.updatePvpVisualStyle();
        SG.beginRunWithCountdown();
    };

    // ===== Toggle functions (on SG for cross-module access) =====
    SG.countdownSequence = ['3', '2', '1', 'RUN!'];
    SG.COUNTDOWN_STEP_MS = SG.COUNTDOWN_STEP_MS || 720;
    SG.COUNTDOWN_RUN_MS = SG.COUNTDOWN_RUN_MS || 560;
    SG.PVP_COUNTDOWN_STEP_MS = SG.PVP_COUNTDOWN_STEP_MS || 1100;
    SG.PVP_COUNTDOWN_RUN_MS = SG.PVP_COUNTDOWN_RUN_MS || 650;

    SG.getCountdownSequence = function() {
        if (!SG.state.pvpMode) return SG.countdownSequence || ['3', '2', '1', 'RUN!'];
        var seq = [];
        for (var i = SG.state.pvpCountdownSeconds || 10; i >= 1; i--) seq.push(String(i));
        seq.push('RUN!');
        return seq;
    };

    SG.cancelStartCountdown = function() {
        if (SG.countdownTimer) {
            clearTimeout(SG.countdownTimer);
            SG.countdownTimer = null;
        }
        if (SG.stopPvpCountdownVoice) SG.stopPvpCountdownVoice();
        SG.state.countdownActive = false;
        if (SG.countdownOverlay) SG.countdownOverlay.style.display = 'none';
    };

    SG.runStartCountdown = function(done) {
        if (SG.skipCountdownForTests) {
            SG.state.countdownActive = false;
            if (SG.countdownOverlay) SG.countdownOverlay.style.display = 'none';
            if (done) done();
            return;
        }
        if (SG.state.countdownActive) return;
        SG.state.countdownActive = true;
        SG.state.started = false;
        SG.state.paused = false;
        var seq = SG.getCountdownSequence ? SG.getCountdownSequence() : (SG.countdownSequence || ['3', '2', '1', 'RUN!']);
        if (SG.state.pvpMode && SG.playPvpCountdownVoice) SG.playPvpCountdownVoice();
        var index = 0;
        var overlay = SG.countdownOverlay || document.getElementById('start-countdown');
        function showNext() {
            if (!overlay) {
                SG.state.countdownActive = false;
                if (done) done();
                return;
            }
            overlay.textContent = seq[index];
            overlay.style.display = 'flex';
            overlay.style.transform = 'translateY(-3vh) scale(1.08)';
            overlay.style.opacity = '1';
            requestAnimationFrame(function() {
                overlay.style.transition = 'transform 180ms ease-out, opacity 180ms ease-out';
                overlay.style.transform = 'translateY(-3vh) scale(1)';
            });
            index++;
            var delay = seq[index - 1] === 'RUN!'
                ? (SG.state.pvpMode ? SG.PVP_COUNTDOWN_RUN_MS : SG.COUNTDOWN_RUN_MS)
                : (SG.state.pvpMode && SG.getPvpCountdownStepMs ? SG.getPvpCountdownStepMs() : (SG.state.pvpMode ? SG.PVP_COUNTDOWN_STEP_MS : SG.COUNTDOWN_STEP_MS));
            SG.countdownTimer = setTimeout(function() {
                if (index >= seq.length) {
                    overlay.style.opacity = '0';
                    SG.countdownTimer = setTimeout(function() {
                        overlay.style.display = 'none';
                        overlay.style.transition = '';
                        SG.state.countdownActive = false;
                        SG.countdownTimer = null;
                        if (done) done();
                    }, 140);
                    return;
                }
                showNext();
            }, delay);
        }
        showNext();
    };

    SG.beginRunWithCountdown = function() {
        SG.state.started = false;
        SG.state.paused = false;
        if (SG.pauseBtnEl) SG.pauseBtnEl.style.display = 'none';
        SG.runStartCountdown(function() {
            SG.state.started = true;
            SG.state.paused = false;
            if (SG.pauseBtnEl && !SG.state.pvpMode) {
                SG.pauseBtnEl.style.display = 'block';
                SG.pauseBtnEl.textContent = '\u23F8';
            }
            var cb = document.getElementById('con-btn');
            if (cb) cb.style.display = SG.state.pvpMode ? 'none' : 'block';
            var f = document.getElementById('fpv-btn');
            if (f) f.style.display = 'block';
            if (SG.clock) SG.clock.getDelta();
            SG.startBgMusic();
        });
    };

    SG.startGameFromMenu = function() {
        if (SG.state.started || SG.state.countdownActive) return;
        SG.state.pvpMode = false;
        SG.menuOverlay.style.display = 'none';
        var cb = document.getElementById('con-btn');
        if (cb) cb.style.display = 'block';
        var audioBtns = ['mute-btn'];
        audioBtns.forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.style.display = 'flex';
        });
        if (!SG.audioCtx) SG.initAudio();
        SG.beginRunWithCountdown();
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
        if (SG.state.pvpMode) return;
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
        if (SG.state.pvpMode) return;
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
