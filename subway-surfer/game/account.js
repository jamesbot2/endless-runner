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
            html += '<input id="login-email" placeholder="Email (qq/163/gmail)" style="width:90%;padding:10px;margin:5px 0;border-radius:6px;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.4);color:#fff;font-size:14px;">';
            html += '<br><input id="login-pass" type="password" placeholder="Password" style="width:90%;padding:10px;margin:5px 0;border-radius:6px;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.4);color:#fff;font-size:14px;">';
            html += '<br>';
            html += '<button class="diff-btn" onclick="SG.doLogin()" style="margin:5px;padding:10px 30px;font-size:16px;">LOGIN</button>';
            html += '<button class="diff-btn" onclick="SG.doRegister()" style="margin:5px;padding:10px 20px;">REGISTER</button>';
            html += '<div id="login-msg" style="color:#ffaa00;font-size:12px;margin:8px 0;"></div>';
            html += '<div style="color:#555;font-size:11px;margin-top:10px;">Play anywhere • Cloud saves • Leaderboard</div>';
            html += '</div>';

            overlay.innerHTML = html;
            document.body.appendChild(overlay);

            // Enter key triggers login
            document.getElementById('login-pass').addEventListener('keydown', function(e) {
                if (e.key === 'Enter') SG.doLogin();
            });
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
                var owned = data.gameData.ownedAbilities || [0];
                SG.state.canDoubleJump = owned.indexOf(1) >= 0;
                SG.state.canJetpack = owned.indexOf(2) >= 0;
                SG.state.canRoofWalk = owned.indexOf(3) >= 0;
            }

            // Update button text
            var btn = document.getElementById('account-btn-menu');
            if (btn) btn.textContent = '👤 ' + data.email;

            // Show main menu
            if (SG.menuOverlay) SG.menuOverlay.style.display = 'flex';
        }).catch(function() { msg.textContent = 'X Server error'; });
    };

    SG.doRegister = function() {
        var email = document.getElementById('login-email').value.trim();
        var pass = document.getElementById('login-pass').value;
        var msg = document.getElementById('login-msg');

        fetch(API + '/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: pass })
        }).then(function(r) { return r.json(); }).then(function(data) {
            if (data.error) { msg.textContent = 'X ' + data.error; return; }
            msg.textContent = 'Registered! Now log in.';
            msg.style.color = '#4CAF50';
        }).catch(function() { msg.textContent = 'X Server error'; });
    };

    SG.accountLogout = function() {
        SG.account.token = null;
        SG.account.email = null;
        SG.account.loggedIn = false;
        localStorage.removeItem('subwayToken');
        localStorage.removeItem('subwayEmail');
        var btn = document.getElementById('account-btn-menu');
        if (btn) btn.textContent = '🔑 SIGN IN';
        if (SG.menuOverlay) SG.menuOverlay.style.display = 'none';
        SG.showLogin(true);
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
                    runCount: (SG.state.runCount || 0),
                    highScore: SG.state.bestScore || 0,
                    totalCoins: SG.state.totalCoins || SG.state.coins || 0
                }
            })
        }).catch(function() {});
    };

    SG.showProfile = function() {
        var overlay = document.getElementById('profile-overlay');
        if (overlay) { overlay.style.display = 'flex'; return; }

        overlay = document.createElement('div');
        overlay.id = 'profile-overlay';
        overlay.className = 'overlay';
        overlay.style.display = 'flex';

        var s = SG.state;
        var names = {0:'None',1:'Double Jump',2:'Jetpack',3:'Roof Walk'};
        var ability = names[s.equippedAbility] || 'None';
        var owned = [];
        if (s.canDoubleJump) owned.push('Double Jump');
        if (s.canJetpack) owned.push('Jetpack');
        if (s.canRoofWalk) owned.push('Roof Walk');

        var html = '<div class="menu-content" style="max-width:380px;text-align:left;">';
        html += '<h1 class="menu-title" style="font-size:24px;text-align:center;margin-bottom:10px;">👤 PROFILE</h1>';
        html += '<div style="background:rgba(0,0,0,0.3);border-radius:10px;padding:15px;margin-bottom:10px;">';
        html += '<div style="margin:4px 0;"><b style="color:#aaa;">Email:</b> ' + (SG.account.email || '-') + '</div>';
        html += '<div style="margin:4px 0;"><b style="color:#aaa;">Credits:</b> <span style="color:#FFD700;">' + (s.credits || 0) + '</span></div>';
        html += '<div style="margin:4px 0;"><b style="color:#aaa;">Coins:</b> <span style="color:#FFD700;">' + (s.coins || 0) + '</span></div>';
        html += '<div style="margin:4px 0;"><b style="color:#aaa;">Equipped:</b> ' + ability + '</div>';
        html += '<div style="margin:4px 0;"><b style="color:#aaa;">Owned:</b> ' + (owned.length ? owned.join(', ') : 'None') + '</div>';
        html += '<div style="margin:4px 0;"><b style="color:#aaa;">Runs:</b> ' + (s.runCount || 0) + '</div>';
        html += '</div>';

        html += '<div style="background:rgba(0,0,0,0.3);border-radius:10px;padding:15px;">';
        html += '<div style="font-weight:bold;margin-bottom:8px;">🏆 Best Distances</div>';
        html += '<div style="margin:3px 0;"><span style="color:#4CAF50;">■</span> Easy: <b>' + (s.maxEasy || 0) + 'm</b></div>';
        html += '<div style="margin:3px 0;"><span style="color:#FFC107;">■</span> Medium: <b>' + (s.maxMedium || 0) + 'm</b></div>';
        html += '<div style="margin:3px 0;"><span style="color:#F44336;">■</span> Hard: <b>' + (s.maxHard || 0) + 'm</b></div>';
        html += '</div>';

        html += '<div class="menu-btn" onclick="document.getElementById(\'profile-overlay\').style.display=\'none\'" style="margin-top:12px;text-align:center;">CLOSE</div>';
        html += '</div>';

        overlay.innerHTML = html;
        document.body.appendChild(overlay);
    };

    // Auto-save every 30s
    setInterval(function() {
        if (SG.account.loggedIn && SG.state && SG.state.started && !SG.state.gameOver) SG.accountSave();
    }, 30000);

    // Override init to show login first
    var origInit = SG.init;
    SG.init = function() {
        if (origInit) origInit(); // Run original init FIRST

        // Wrap setupUI to handle login state
        var origSetup = SG.setupUI;
        SG.setupUI = function() {
            if (origSetup) origSetup();
            if (!SG.account.loggedIn) {
                if (SG.menuOverlay) SG.menuOverlay.style.display = 'none';
                setTimeout(function() { SG.showLogin(true); }, 100);
            }
        };

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
