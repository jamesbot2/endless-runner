// ===== SUBWAY SURFER - Account System =====
(function() {
    'use strict';
    var SG = window.__SG = window.__SG || {};
    var ACCOUNT_API = 'http://' + (window.location.hostname || '35.212.200.85') + ':3000';

    SG.account = {
        token: localStorage.getItem('subwayToken') || null,
        email: localStorage.getItem('subwayEmail') || null,
        loggedIn: !!localStorage.getItem('subwayToken')
    };

    SG.showAccountModal = function() {
        var overlay = document.getElementById('account-overlay');
        if (overlay) { overlay.style.display = 'flex'; return; }

        overlay = document.createElement('div');
        overlay.id = 'account-overlay';
        overlay.className = 'overlay';
        overlay.style.display = 'flex';

        var html = '<div class="menu-content" style="max-width:350px;">';
        html += '<h1 class="menu-title" style="font-size:24px;margin-bottom:5px;">' + (SG.account.loggedIn ? 'ACCOUNT' : 'SIGN IN') + '</h1>';

        if (SG.account.loggedIn) {
            html += '<div style="color:#aaa;font-size:13px;margin-bottom:10px;">Logged in as <b>' + SG.account.email + '</b></div>';
        } else {
            html += '<div style="color:#aaa;font-size:13px;margin-bottom:10px;"></div>';
            html += '<input id="acc-email" placeholder="Email (qq/163/gmail)" style="width:90%;padding:10px;margin:5px 0;border-radius:6px;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.4);color:#fff;font-size:14px;">';
            html += '<br><input id="acc-pass" type="password" placeholder="Password (6+ chars)" style="width:90%;padding:10px;margin:5px 0;border-radius:6px;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.4);color:#fff;font-size:14px;">';
            html += '<br>';
            html += '<button class="diff-btn" onclick="SG.accountLogin()" style="margin:5px;padding:8px 20px;">LOGIN</button>';
            html += '<button class="diff-btn" onclick="SG.accountRegister()" style="margin:5px;padding:8px 20px;">REGISTER</button>';
        }

        html += '<div id="account-msg" style="color:#ffaa00;font-size:12px;margin:5px 0;word-break:break-all;"></div>';

        if (SG.account.loggedIn) {
            html += '<button class="diff-btn" onclick="SG.accountLogout()" style="margin:5px;padding:8px 20px;border-color:#ff4444;">LOGOUT</button>';
        }

        html += '<div class="menu-btn" onclick="document.getElementById(\'account-overlay\').style.display=\'none\'">CLOSE</div>';
        html += '</div>';

        overlay.innerHTML = html;
        document.body.appendChild(overlay);
    };

    SG.accountLogin = function() {
        var email = document.getElementById('acc-email').value.trim();
        var pass = document.getElementById('acc-pass').value;
        var msg = document.getElementById('account-msg');

        fetch(ACCOUNT_API + '/api/login', {
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
            var ab = document.getElementById('account-btn-menu');
            if (ab) ab.textContent = '👤 ' + data.email;
            msg.style.color = '#4CAF50';
            if (data.gameData) {
                if (data.gameData.highScore > SG.state.bestScore) SG.state.bestScore = data.gameData.highScore;
                if (data.gameData.credits > SG.state.credits) SG.state.credits = data.gameData.credits;
            }
            setTimeout(function() { SG.showAccountModal(); }, 800);
        }).catch(function() { msg.textContent = 'X Server error'; });
    };

    SG.accountRegister = function() {
        var email = document.getElementById('acc-email').value.trim();
        var pass = document.getElementById('acc-pass').value;
        var msg = document.getElementById('account-msg');

        fetch(ACCOUNT_API + '/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: pass })
        }).then(function(r) { return r.json(); }).then(function(data) {
            if (data.error) { msg.textContent = 'X ' + data.error; return; }
            msg.textContent = 'Registered! Server sends verify link. Ask Neo for it.';
            msg.style.color = '#4CAF50';
        }).catch(function() { msg.textContent = 'X Server error'; });
    };

    SG.accountLogout = function() {
        SG.account.token = null;
        SG.account.email = null;
        SG.account.loggedIn = false;
        localStorage.removeItem('subwayToken');
        localStorage.removeItem('subwayEmail');
        var ab = document.getElementById('account-btn-menu');
        if (ab) ab.textContent = '🔑 SIGN IN';
        SG.showAccountModal();
    };

    SG.accountSave = function() {
        if (!SG.account.loggedIn || !SG.account.token) return;
        fetch(ACCOUNT_API + '/api/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + SG.account.token
            },
            body: JSON.stringify({
                gameData: {
                    highScore: SG.state.bestScore,
                    totalCoins: SG.state.totalCoins || SG.state.coins,
                    credits: SG.state.credits,
                    equippedAbility: SG.state.equippedAbility || 0
                }
            })
        }).catch(function() {});
    };

    setInterval(function() {
        if (SG.account.loggedIn && SG.state && SG.state.started) SG.accountSave();
    }, 30000);

    var origCreateMenu = SG.createMainMenu;
    SG.createMainMenu = function() {
        if (origCreateMenu) origCreateMenu();
        var shopBtn = document.getElementById('shop-btn-menu');
        if (shopBtn && !document.getElementById('account-btn-menu')) {
            var accBtn = document.createElement('div');
            accBtn.id = 'account-btn-menu';
            accBtn.className = 'menu-btn';
            accBtn.style.cssText = 'margin-top:5px;font-size:13px;padding:6px 14px;';
            accBtn.textContent = SG.account.loggedIn ? '👤 ' + SG.account.email : '🔑 SIGN IN';
            accBtn.onclick = function(e) { e.stopPropagation(); SG.showAccountModal(); };
            accBtn.ontouchend = function(e) { e.preventDefault(); e.stopPropagation(); SG.showAccountModal(); };
            shopBtn.parentNode.insertBefore(accBtn, shopBtn.nextSibling);
        }
    };
})();
