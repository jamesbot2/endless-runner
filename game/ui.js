// ===== SUBWAY SURFER - UI System =====
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
                roofWalk: SG.state.canRoofWalk
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
        var descs = ['No ability equipped', 'Double jump in mid-air', 'Fly for 30s every 15s cooldown', 'Walk on top of obstacles'];
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

    SG.updateMenuCredits = function() {
        var el = document.getElementById('menu-credits');
        if (el) el.textContent = '💰 TOTAL: ' + SG.state.credits;
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
        SG.state.musicVolume = music;
        SG.state.sfxVolume = sfx;

        var html = '<div class="menu-content" style="max-width:360px;">';
        html += '<h1 class="menu-title" style="font-size:24px;">⚙ SETTINGS</h1>';
        html += '<div style="margin:12px 0;text-align:center;">';
        html += '<span class="s-label">🔊 Master</span>';
        html += '<button class="diff-btn" id="__mute-btn">' + (SG.state.muted ? 'OFF' : 'ON') + '</button>';
        html += '</div>';
        html += '<div style="margin:10px 0;">';
        html += '<div class="s-label" style="margin-bottom:6px;">🎵 Music</div>';
        html += '<div style="display:flex;align-items:center;gap:8px;"><input type="range" min="0" max="1" step="0.1" value="' + music + '" class="__vol-slider" data-key="subwayMusicVol"><span class="vol-pct">' + Math.round(music * 100) + '%</span></div>';
        html += '</div>';
        html += '<div style="margin:10px 0;">';
        html += '<div class="s-label" style="margin-bottom:6px;">🔊 SFX</div>';
        html += '<div style="display:flex;align-items:center;gap:8px;"><input type="range" min="0" max="1" step="0.1" value="' + sfx + '" class="__vol-slider" data-key="subwaySfxVol"><span class="vol-pct">' + Math.round(sfx * 100) + '%</span></div>';
        html += '</div>';
        html += '<div style="color:#aaa;font-size:13px;margin:12px 0;">↑ Jump | ↓ Roll | ← → Move | 👁 FPV</div>';
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
                var pct = this.parentNode.querySelector('.vol-pct');
                if (pct) pct.textContent = Math.round(val * 100) + '%';
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
                    '<div class="menu-brand">SUBWAY SURFER<small>NEO EDITION</small></div>' +
                    '<div class="menu-nav-btn" id="shop-btn-menu"><span class="nav-ico">🛒</span> Shop</div>' +
                    '<div class="menu-nav-btn" id="profile-btn"><span class="nav-ico">👤</span> Profile</div>' +
                    '<div class="menu-nav-btn" id="leaderboard-btn"><span class="nav-ico">🏆</span> Leaderboard</div>' +
                    '<div class="menu-nav-btn" id="settings-btn-menu"><span class="nav-ico">⚙</span> Settings</div>' +
                    '<div class="menu-nav-btn danger" id="signout-btn"><span class="nav-ico">🚪</span> Sign Out</div>' +
                '</aside>' +
                '<section class="menu-main">' +
                    '<h1 class="menu-title">SUBWAY SURFER</h1>' +
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
        consoleEl.innerHTML = '<input type="text" id="console-input" placeholder="enter command..." autofocus/>';
        SG.uiOverlay.appendChild(consoleEl);

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
            function submitConsoleCommand() {
                var val = conInput.value.trim().toLowerCase();
                conInput.value = '';
                document.getElementById('dev-console').style.display = 'none';
                if (SG.state.paused) SG.state.paused = false;
                if (val === 'homelander') {
                    SG.state.homelander = true;
                    SG.activateHomelander();
                }
                if (val === 'quit' && SG.state.homelander) {
                    SG.deactivateHomelander();
                }
            }
            conInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.keyCode === 13) {
                    e.preventDefault();
                    submitConsoleCommand();
                }
                if (e.key === 'Escape') {
                    document.getElementById('dev-console').style.display = 'none';
                    if (SG.state.paused) SG.state.paused = false;
                }
                e.stopPropagation();
            });
            conInput.addEventListener('input', function() {
                if (conInput.value.includes('\n')) {
                    submitConsoleCommand();
                }
            });
            conInput.addEventListener('blur', function() {
                if (conInput.value.trim()) submitConsoleCommand();
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

    SG.toggleConsole = function() {
        var con = document.getElementById('dev-console');
        if (!con) return;
        if (con.style.display === 'flex') {
            con.style.display = 'none';
            SG.state.paused = false;
        } else {
            con.style.display = 'flex';
            SG.state.paused = true;
            var ci = document.getElementById('console-input');
            if (ci) {
                ci.value = '';
                ci.focus();
                setTimeout(function() { ci.focus(); }, 100);
            }
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
        } else if (!SG.state.muted && SG.audioCtx && SG.audioCtx.state === 'suspended') {
            try { SG.audioCtx.resume(); } catch(e) {}
            if (SG.state.started && !SG.state.gameOver) SG.startBgMusic();
        }
    };
})();
