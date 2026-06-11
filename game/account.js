// ===== SUBWAY SURFER - Account System v2 =====
(function() {
    'use strict';
    var SG = window.__SG = window.__SG || {};
    var API = 'http://' + (window.location.hostname || '35.212.200.85') + ':3000';

    SG.account = {
        token: localStorage.getItem('subwayToken') || null,
        email: localStorage.getItem('subwayEmail') || null,
        loggedIn: !!localStorage.getItem('subwayToken')
    };

    // Show login overlay (blocks game start until logged in)
    SG.showLogin = function(firstTime) {
        var overlay = document.getElementById('login-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'login-overlay';
            overlay.className = 'overlay';
            overlay.style.display = 'flex';
            overlay.style.zIndex = '100';

            var html = '<div class="menu-content" style="max-width:360px;">';
            html += '<h1 class="menu-title" style="font-size:28px;">SUBWAY SURFER</h1>';
            html += '<div style="color:#888;font-size:13px;margin:-15px 0 15px;">Sign in to play</div>';
            html += '<input id="login-name" placeholder="Username" style="width:90%;padding:10px;margin:5px 0;border-radius:6px;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.4);color:#fff;font-size:14px;display:none;">';
            html += '<input id="login-email" placeholder="Email (qq/163/gmail)" style="width:90%;padding:10px;margin:5px 0;border-radius:6px;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.4);color:#fff;font-size:14px;">';
            html += '<br><input id="login-pass" type="password" placeholder="Password" style="width:90%;padding:10px;margin:5px 0;border-radius:6px;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.4);color:#fff;font-size:14px;">';
            html += '<br>';
            html += '<button class="diff-btn" onclick="SG.doLogin()" style="margin:5px;padding:10px 30px;font-size:16px;">LOGIN</button>';
            html += '<button class="diff-btn" onclick="__neoShowReg()" style="margin:5px;padding:10px 20px;">REGISTER</button>';
            html += '<div id="login-msg" style="color:#ffaa00;font-size:12px;margin:8px 0;"></div>';
            html += '<div style="color:#555;font-size:11px;margin-top:10px;">Play anywhere • Cloud saves • Leaderboard</div>';
            html += '</div>';

            overlay.innerHTML = html;
            document.body.appendChild(overlay);

            // Enter key triggers login
            document.getElementById('login-pass').addEventListener('keydown', function(e) {
                if (e.key === 'Enter') SG.doLogin();
            });

            // Show username field only when registering
            window.__neoShowReg = function() {
                var nameEl = document.getElementById('login-name');
                if (nameEl) nameEl.style.display = 'block';
                var btn = document.querySelector('[onclick="__neoShowReg()"]');
                if (btn) {
                    btn.textContent = '✓ REGISTER';
                    btn.onclick = function() { SG.doRegister(); };
                }
            };
        }
        overlay.style.display = 'flex';
        if (firstTime) {
            document.getElementById('login-email').focus();
        }
    };

    SG.hideLogin = function() {
        var overlay = document.getElementById('login-overlay');
        if (overlay) overlay.style.display = 'none';
    };

    SG.doLogin = function() {
        var email = document.getElementById('login-email').value.trim();
        var pass = document.getElementById('login-pass').value;
        var msg = document.getElementById('login-msg');

        fetch(API + '/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: pass })
        }).then(function(r) { return r.json(); }).then(function(data) {
            if (data.error) { msg.textContent = 'X ' + data.error; return; }
            SG.account.token = data.token;
            SG.account.email = data.email;
            SG.account.loggedIn = true;
            localStorage.setItem('subwayToken', data.token);
            localStorage.setItem('subwayEmail', data.email);
            msg.textContent = 'Logged in!';
            msg.style.color = '#4CAF50';
            SG.hideLogin();

            // Sync game data from server
            if (data.gameData) {
                SG.state.bestScore = Math.max(SG.state.bestScore, data.gameData.maxDistance || 0);
                SG.state.credits = data.gameData.credits || 0;
                SG.state.totalCoins = data.gameData.totalCoins || 0;
                SG.state.equippedAbility = data.gameData.equippedAbility || 0;
                SG.state.maxEasy = data.gameData.maxEasy || 0;
                SG.state.maxMedium = data.gameData.maxMedium || 0;
                SG.state.maxHard = data.gameData.maxHard || 0;
                SG.state.maxEasyAbility = data.gameData.maxEasyAbility || 0;
                SG.state.maxMediumAbility = data.gameData.maxMediumAbility || 0;
                SG.state.maxHardAbility = data.gameData.maxHardAbility || 0;
                SG.state.runCount = data.gameData.runCount || 0;
                var owned = data.gameData.ownedAbilities || [0];
                SG.state.canDoubleJump = owned.indexOf(1) >= 0;
                SG.state.canJetpack = owned.indexOf(2) >= 0;
                SG.state.canRoofWalk = owned.indexOf(3) >= 0;
            }

            // Store username
            SG.account.username = data.username || data.email.split('@')[0];
            localStorage.setItem('subwayUsername', SG.account.username);

            // Update button text
            var btn = document.getElementById('account-btn-menu');
            if (btn) btn.textContent = '👤 ' + SG.account.username;

            // Show main menu
            if (SG.menuOverlay) SG.menuOverlay.style.display = 'flex';
        }).catch(function() { msg.textContent = 'X Server error'; });
    };

    SG.doRegister = function() {
        var name = document.getElementById('login-name').value.trim();
        var email = document.getElementById('login-email').value.trim();
        var pass = document.getElementById('login-pass').value;
        var msg = document.getElementById('login-msg');

        if (!name) { msg.textContent = 'X Username required (2-16 chars)'; return; }
        fetch(API + '/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: pass, username: name })
        }).then(function(r) { return r.json(); }).then(function(data) {
            if (data.error) { msg.textContent = 'X ' + data.error; return; }
            msg.textContent = 'Registered! Check email for code. Now log in.';
            msg.style.color = '#4CAF50';
            // Reset button back to login mode
            var btn = document.querySelector('button[onclick*="SG.doRegister"]');
            if (btn) {
                btn.textContent = 'REGISTER';
                btn.onclick = function() { __neoShowReg(); };
            }
            var nameEl = document.getElementById('login-name');
            if (nameEl) nameEl.style.display = 'none';
        }).catch(function() { msg.textContent = 'X Server error'; });
    };

    SG.accountLogout = function() {
        SG.account.token = null;
        SG.account.email = null;
        SG.account.loggedIn = false;
        localStorage.removeItem('subwayToken');
        localStorage.removeItem('subwayEmail');
        localStorage.removeItem('subwayRemember');
        window.location.href = 'http://' + window.location.hostname + ':3000/';
    };

    SG.accountSave = function() {
        if (!SG.account.loggedIn || !SG.account.token) return;
        var owned = [0];
        if (SG.state.canDoubleJump) owned.push(1);
        if (SG.state.canJetpack) owned.push(2);
        if (SG.state.canRoofWalk) owned.push(3);

        fetch(API + '/api/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + SG.account.token
            },
            body: JSON.stringify({
                gameData: {
                    coins: SG.state.coins || 0,
                    credits: SG.state.credits || 0,
                    equippedAbility: SG.state.equippedAbility || 0,
                    ownedAbilities: owned,
                    maxDistance: SG.state.bestScore || SG.state.maxLegitDistance || 0,
                    maxEasy: SG.state.maxEasy || 0,
                    maxMedium: SG.state.maxMedium || 0,
                    maxHard: SG.state.maxHard || 0,
                    maxEasyAbility: SG.state.maxEasyAbility || 0,
                    maxMediumAbility: SG.state.maxMediumAbility || 0,
                    maxHardAbility: SG.state.maxHardAbility || 0,
                    runCount: (SG.state.runCount || 0),
                    highScore: SG.state.bestScore || 0,
                    totalCoins: SG.state.totalCoins || SG.state.coins || 0
                }
            })
        }).catch(function() {});
    };

    SG.accountSaveVol = function() {
        // Volume is already saved in localStorage by oninput handler
    };

    // Sanitize user input for safe HTML rendering
    SG.escapeHtml = function(str) {
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    };

    SG.loadAccountData = function(callback) {
        if (!SG.account.loggedIn || !SG.account.token) { if (callback) callback(); return; }
        var url = 'http://' + (window.location.hostname || '35.212.200.85') + ':3000/api/load';
        fetch(url, {
            headers: { 'Authorization': 'Bearer ' + SG.account.token }
        }).then(function(r) {
            if (r.status === 401) {
                // Token expired/invalid - force re-login
                SG.account.token = null;
                SG.account.loggedIn = false;
                localStorage.removeItem('subwayToken');
                localStorage.removeItem('subwayEmail');
                if (SG.menuOverlay) SG.menuOverlay.style.display = 'none';
                SG.showLogin(true);
                if (callback) callback();
                return null;
            }
            return r.json();
        }).then(function(data) {
            if (!data || !data.gameData) { if (callback) callback(); return; }
            var g = data.gameData;
            SG.state.bestScore = Math.max(SG.state.bestScore || 0, g.maxDistance || 0);
            SG.state.credits = g.credits || 0;
            SG.state.totalCoins = g.totalCoins || 0;
            SG.state.equippedAbility = g.equippedAbility || 0;
            SG.state.maxEasy = g.maxEasy || 0;
            SG.state.maxMedium = g.maxMedium || 0;
            SG.state.maxHard = g.maxHard || 0;
            SG.state.maxEasyAbility = g.maxEasyAbility || 0;
            SG.state.maxMediumAbility = g.maxMediumAbility || 0;
            SG.state.maxHardAbility = g.maxHardAbility || 0;
            SG.state.runCount = g.runCount || 0;
            var owned = g.ownedAbilities || [0];
            SG.state.canDoubleJump = owned.indexOf(1) >= 0;
            SG.state.canJetpack = owned.indexOf(2) >= 0;
            SG.state.canRoofWalk = owned.indexOf(3) >= 0;
            // Update menu credits after loading
            if (SG.updateMenuCredits) SG.updateMenuCredits();
            if (callback) callback();
        }).catch(function(){ if (callback) callback(); });
    };

    SG.showProfile = function() {
        var overlay = document.getElementById('profile-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'profile-overlay';
            overlay.className = 'overlay';
            overlay.onclick = function(e) { if (e.target === overlay || e.target.closest('.modal-close-btn')) overlay.style.display = 'none'; };
            overlay.addEventListener('touchend', function(e) { if (e.target === overlay || e.target.closest('.modal-close-btn')) { e.preventDefault(); overlay.style.display = 'none'; } });
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'flex';
        overlay.innerHTML = '<div class="menu-content"><div style="color:#888;padding:20px;">Loading...</div></div>';

        // Load fresh data from server first, then render
        SG.loadAccountData(function() {
            try {
                SG._renderProfile(overlay);
            } catch(e) {
                // Fallback: render anyway even if _renderProfile fails
                overlay.innerHTML = '<div class="menu-content"><h1 class="menu-title">👤 PROFILE</h1>' +
                    '<div style="color:#888;padding:20px;">' + SG.escapeHtml(SG.account.email || '') + '</div>' +
                    '<div class="menu-btn modal-close-btn" onclick="this.closest(\'.overlay\').style.display=\'none\'">CLOSE</div></div>';
            }
        });
    };

    SG._renderProfile = function(overlay) {
        var s = SG.state;
        SG.account.email = localStorage.getItem('subwayEmail');
        SG.account.username = localStorage.getItem('subwayUsername') || (SG.account.email || '').split('@')[0] || 'Player';
        var names = {0:'None',1:'Double Jump',2:'Jetpack',3:'Roof Walk'};
        var ability = names[s.equippedAbility] || 'None';
        var owned = [];
        if (s.canDoubleJump) owned.push('Double Jump');
        if (s.canJetpack) owned.push('Jetpack');
        if (s.canRoofWalk) owned.push('Roof Walk');

        var html = '<div class="menu-content" style="max-width:380px;text-align:left;">';
        html += '<h1 class="menu-title" style="font-size:24px;text-align:center;margin-bottom:10px;">👤 PROFILE</h1>';
        html += '<div style="background:rgba(0,0,0,0.3);border-radius:10px;padding:15px;margin-bottom:10px;">';
        html += '<div style="margin:4px 0;"><b style="color:#aaa;">Name:</b> ' + SG.escapeHtml(SG.account.username || '-') + '</div>';
        html += '<div style="margin:4px 0;"><b style="color:#aaa;">Credits:</b> <span style="color:#FFD700;">' + (s.credits || 0) + '</span></div>';
        html += '<div style="margin:4px 0;"><b style="color:#aaa;">Total Coins:</b> <span style="color:#FFD700;">' + (s.totalCoins || 0) + '</span></div>';
        html += '<div style="margin:4px 0;"><b style="color:#aaa;">Equipped:</b> ' + ability + '</div>';
        html += '<div style="margin:4px 0;"><b style="color:#aaa;">Owned:</b> ' + (owned.length ? owned.join(', ') : 'None') + '</div>';
        html += '<div style="margin:4px 0;"><b style="color:#aaa;">Runs:</b> ' + (s.runCount || 0) + '</div>';
        html += '</div>';

        html += '<div style="background:rgba(0,0,0,0.3);border-radius:10px;padding:15px;">';
        var abNames = {0:'None',1:'Double Jump',2:'Jetpack',3:'Roof Walk'};
        html += '<div style="font-weight:bold;margin-bottom:8px;">🏆 Best Distances</div>';
        html += '<div style="margin:3px 0;"><span style="color:#4CAF50;">■</span> Easy: <b>' + (s.maxEasy || 0) + 'm</b> <span style="color:#888;font-size:11px;">[' + (abNames[s.maxEasyAbility] || 'None') + ']</span></div>';
        html += '<div style="margin:3px 0;"><span style="color:#FFC107;">■</span> Medium: <b>' + (s.maxMedium || 0) + 'm</b> <span style="color:#888;font-size:11px;">[' + (abNames[s.maxMediumAbility] || 'None') + ']</span></div>';
        html += '<div style="margin:3px 0;"><span style="color:#F44336;">■</span> Hard: <b>' + (s.maxHard || 0) + 'm</b> <span style="color:#888;font-size:11px;">[' + (abNames[s.maxHardAbility] || 'None') + ']</span></div>';
        html += '</div>';

        html += '<div class="menu-btn modal-close-btn" onclick="document.getElementById(\'profile-overlay\').style.display=\'none\'" style="margin-top:12px;text-align:center;">CLOSE</div>';
        html += '</div>';

        overlay.innerHTML = html;
    };

    // ===== LEADERBOARD =====
    SG.showLeaderboard = function() {
        var overlay = document.getElementById('lb-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'lb-overlay';
            overlay.className = 'overlay';
            overlay.onclick = function(e) { if (e.target === overlay || e.target.closest('.modal-close-btn')) overlay.style.display = 'none'; };
            overlay.addEventListener('touchend', function(e) { if (e.target === overlay || e.target.closest('.modal-close-btn')) { e.preventDefault(); overlay.style.display = 'none'; } });
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'flex';
        overlay.innerHTML = '<div class="menu-content" style="max-width:420px;max-height:80vh;overflow-y:auto;">' +
            '<h1 class="menu-title" style="font-size:24px;margin-bottom:10px;">🏆 LEADERBOARD</h1>' +
            '<div style="color:#aaa;font-size:13px;margin-bottom:10px;">Loading...</div>' +
            '</div>';

        var url = 'http://' + (window.location.hostname || '35.212.200.85') + ':3000/api/leaderboard';
        fetch(url)
        .then(function(r) { return r.json(); })
        .then(function(data) {
            var entries = data.leaderboard || [];
            var abNames = {0:'None',1:'Double',2:'Jetpack',3:'Roof'};
            var html = '<div class="menu-content" style="max-width:420px;max-height:80vh;overflow-y:auto;">';
            html += '<h1 class="menu-title" style="font-size:24px;margin-bottom:5px;">🏆 LEADERBOARD</h1>';
            html += '<div style="font-size:11px;color:#666;margin-bottom:10px;">Per-difficulty best distances</div>';
            if (entries.length === 0) {
                html += '<div style="color:#888;padding:20px;">No entries yet. Play a game first!</div>';
            } else {
                html += '<table style="width:100%;border-collapse:collapse;font-size:12px;">';
                html += '<tr style="color:#888;border-bottom:1px solid #333;">' +
                    '<th style="padding:4px;text-align:left;">#</th>' +
                    '<th style="padding:4px;text-align:left;">Player</th>' +
                    '<th style="padding:4px;color:#4CAF50;">Easy</th>' +
                    '<th style="padding:4px;color:#FFC107;">Med</th>' +
                    '<th style="padding:4px;color:#F44336;">Hard</th>' +
                    '</tr>';
                for (var i = 0; i < entries.length; i++) {
                    var e = entries[i];
                    var row = (i % 2 === 0) ? 'rgba(255,255,255,0.03)' : 'transparent';
                    html += '<tr style="background:' + row + ';">' +
                        '<td style="padding:3px 4px;color:#888;">' + (i+1) + '</td>' +
                        '<td style="padding:3px 4px;">' + SG.escapeHtml(e.name || 'Player') + '</td>' +
                        '<td style="padding:3px 4px;color:#4CAF50;">' + (e.maxEasy||0) + 'm <span style="color:#666;font-size:10px;">[' + (abNames[e.maxEasyAbility]||'-') + ']</span></td>' +
                        '<td style="padding:3px 4px;color:#FFC107;">' + (e.maxMedium||0) + 'm <span style="color:#666;font-size:10px;">[' + (abNames[e.maxMediumAbility]||'-') + ']</span></td>' +
                        '<td style="padding:3px 4px;color:#F44336;">' + (e.maxHard||0) + 'm <span style="color:#666;font-size:10px;">[' + (abNames[e.maxHardAbility]||'-') + ']</span></td>' +
                        '</tr>';
                }
                html += '</table>';
            }
            html += '<div class="menu-btn modal-close-btn" onclick="document.getElementById(\'lb-overlay\').style.display=\'none\'" style="margin-top:12px;">CLOSE</div>';
            html += '</div>';
            overlay.innerHTML = html;
        })
        .catch(function() {
            overlay.innerHTML = '<div class="menu-content"><h1 class="menu-title">🏆 LEADERBOARD</h1><div style="color:#ff4444;padding:20px;">Failed to load. Server offline?</div><div class="menu-btn modal-close-btn" onclick="document.getElementById(\'lb-overlay\').style.display=\'none\'">CLOSE</div></div>';
        });
    };

    // Auto-save every 30s
    setInterval(function() {
        if (SG.account.loggedIn && SG.state && SG.state.started && !SG.state.gameOver) SG.accountSave();
    }, 30000);

    // Override init to show login first
    var origInit = SG.init;
    SG.init = function() {
        // Wrap setupUI BEFORE calling original init, so the menu
        // doesn't flash before login check runs
        var origSetup = SG.setupUI;
        SG.setupUI = function() {
            if (origSetup) origSetup();
            if (!SG.account.loggedIn) {
                if (SG.menuOverlay) SG.menuOverlay.style.display = 'none';
                SG.showLogin(true);
            }
        };

        try {
            if (origInit) origInit();
        } catch(e) {
            document.body.innerHTML += '<div style="position:fixed;top:0;left:0;width:100%;background:#ff0000;color:#fff;padding:20px;z-index:9999;font-size:16px;">ERROR: ' + e.message + '<br>' + e.stack.split('\n').slice(0,3).join('<br>') + '</div>';
            return;
        }

        // Load account data from server (will clear token if 401)
        SG.loadAccountData();

        // Wrap startGameFromMenu to track runs
        var origStart = SG.startGameFromMenu;
        if (origStart) {
            SG.startGameFromMenu = function() {
                SG.state.runCount = (SG.state.runCount || 0) + 1;
                SG.state.legitRun = !SG.state.homelander;
                return origStart();
            };
        }

        // Wrap gameOver to track max legit distance + auto-save
        var origEnd = SG.gameOver;
        if (origEnd) {
            SG.gameOver = function() {
                if (origEnd) origEnd();
                if (SG.state.legitRun !== false) {
                    var score = Math.floor(SG.state.score || 0);
                    SG.state.maxLegitDistance = Math.max(SG.state.maxLegitDistance || 0, score);
                    SG.state.bestScore = Math.max(SG.state.bestScore || 0, SG.state.maxLegitDistance);
                }
                SG.accountSave();
            };
        }
    };
    SG.init();
})();
