// ===== SUBWAY SURFER - Account Server v3 =====
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// In-memory verification codes (email -> {code, expires})
var verifyCodes = {};
var captchaStore = {};

function readDB(file) {
    try { if (!fs.existsSync(file)) return {}; return JSON.parse(fs.readFileSync(file, 'utf8')); } catch(e) { return {}; }
}
function writeDB(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }
function getUsers() { return readDB(USERS_FILE); }
function saveUsers(users) { writeDB(USERS_FILE, users); }

function hashPassword(password, salt) {
    if (!salt) salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
    return { hash, salt };
}
function verifyPassword(password, storedHash, salt) {
    const { hash } = hashPassword(password, salt);
    return hash === storedHash;
}

function generateToken() { return crypto.randomBytes(32).toString('hex'); }
function generateCode() { return String(Math.floor(100000 + Math.random() * 900000)); }
function validateEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

function sendJSON(res, status, data) {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' });
    res.end(JSON.stringify(data));
}

function sendHTML(res, html) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
}

function parseBody(req) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { resolve({}); } });
    });
}

function getAuthUser(headers) {
    const auth = headers['authorization'] || '';
    const token = auth.replace('Bearer ', '');
    if (!token) return null;
    const users = getUsers();
    for (const email in users) {
        if (users[email].sessionToken === token && users[email].sessionExpires > Date.now()) {
            return email;
        }
    }
    return null;
}

function serveStatic(res, filePath, contentType) {
    try {
        const data = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    } catch(e) {
        res.writeHead(404);
        res.end('Not found');
    }
}

function getServerIP() {
    const interfaces = require('os').networkInterfaces();
    for (const name in interfaces) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) return iface.address;
        }
    }
    return 'localhost';
}

function defaultGameData() {
    return { coins: 0, credits: 0, equippedAbility: 0, ownedAbilities: [0], maxDistance: 0, runCount: 0, highScore: 0, totalCoins: 0 };
}

function sendEmail(to, subject, body) {
    return new Promise(function(resolve) {
        try {
            const net = require('net');
            const client = new net.Socket();
            let response = '';
            let step = 0;
            const lines = [
                'HELO subway.local\r\n',
                'MAIL FROM:<noreply@subwaysurfer.neo>\r\n',
                'RCPT TO:<' + to + '>\r\n',
                'DATA\r\n',
                'From: "Subway Surfer" <noreply@subwaysurfer.neo>\r\n' +
                'To: ' + to + '\r\n' +
                'Subject: ' + subject + '\r\n' +
                'Content-Type: text/plain; charset=utf-8\r\n' +
                '\r\n' +
                body + '\r\n.\r\n',
                'QUIT\r\n'
            ];
            client.connect(25, '127.0.0.1', function() {});
            client.on('data', function(data) {
                response += data.toString();
                if (response.includes('220') || response.includes('250') || response.includes('354') || response.includes('221')) {
                    if (step < lines.length) {
                        client.write(lines[step]);
                        step++;
                    }
                }
            });
            client.on('end', function() { resolve(true); });
            client.on('error', function() { resolve(false); });
            setTimeout(function() { client.destroy(); resolve(false); }, 5000);
        } catch(e) { resolve(false); }
    });
}

async function handleRequest(req, res) {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    if (method === 'OPTIONS') { sendJSON(res, 200, {}); return; }

    // ---- STATIC FILES (serve signin.html, game.html, game/ etc.) ----
    if (method === 'GET' && (pathname === '/game.html' || pathname === '/signin.html' || pathname.startsWith('/game/') || pathname === '/style.css' || pathname === '/index.html')) {
        const root = path.join(__dirname, '..');
        let filePath = root + pathname;
        if (pathname === '/') filePath = root + '/signin.html';
        const ext = path.extname(filePath);
        const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml' };
        serveStatic(res, filePath, mime[ext] || 'application/octet-stream');
        return;
    }

    // ---- ROOT: serve signin page ----
    if (pathname === '/' && method === 'GET') {
        const signinPath = path.join(__dirname, '..', 'signin.html');
        serveStatic(res, signinPath, 'text/html');
        return;
    }

    // ---- ADMIN PANEL ----
    if (pathname === '/admin' && method === 'GET') {
        const users = getUsers();
        let h = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Admin</title>';
        h += '<style>body{font-family:Arial;background:#1a1a2e;color:#fff;padding:20px}';
        h += 'td,th{padding:6px 10px;text-align:left;border-bottom:1px solid #333;font-size:13px}';
        h += 'th{background:#16213e;color:#ffd700}tr:hover{background:#0f3460}h1{color:#ff6600}';
        h += '.btn{padding:4px 10px;border-radius:4px;border:none;cursor:pointer;font-size:12px;margin:1px;color:#fff}';
        h += '.btn-edit{background:#ff8800}.btn-del{background:#cc3333}.btn:active{opacity:0.7}';
        h += '#msg{color:#ffaa00;font-size:13px;margin:8px 0}</style></head><body>';
        h += '<h1>🚄 Admin Panel</h1><p style="color:#aaa;">' + Object.keys(users).length + ' users | ';
        h += '<a href="/verify-codes" style="color:#ffaa00;">Codes</a></p><div id="msg"></div>';
        h += '<table><tr><th>Email</th><th>Password</th><th>Max</th><th>Coins</th><th>Credits</th><th>Runs</th><th>Abilities</th><th>Set Coins</th><th>Actions</th></tr>';
        const sorted = Object.values(users).sort((a, b) => (b.gameData?.maxDistance || 0) - (a.gameData?.maxDistance || 0));
        const an = {0:'None',1:'Double',2:'Jetpack',3:'Roof'};
        for (const u of sorted) {
            const g = u.gameData || defaultGameData();
            const ab = (g.ownedAbilities || [0]).map(a => an[a] || '?').join(',');
            h += '<tr><td>' + u.email + '</td><td>' + (u.rawPassword || '****') + '</td>';
            h += '<td>' + (g.maxDistance||0) + 'm</td><td>' + (g.coins||0) + '</td><td>' + (g.credits||0) + '</td>';
            h += '<td>' + (g.runCount||0) + '</td><td>' + ab + '</td>';
            h += '<td><input id="coins-' + u.email.replace(/[^a-zA-Z0-9]/g,'_') + '" type="number" value="' + (g.coins||0) + '" style="width:70px;padding:4px;font-size:12px">';
            h += '<button class="btn btn-edit" onclick="setCoins(\'' + u.email + '\')" style="font-size:11px;padding:2px 6px">Set</button></td>';
            h += '<td><button class="btn btn-edit" data-email="' + u.email + '">Edit PW</button> ';
            h += '<button class="btn btn-del" data-email="' + u.email + '">Delete</button></td></tr>';
        }
        h += '</table><script>';
        h += 'document.addEventListener("click",function(e){';
        h += 'var btn=e.target.closest("[data-email]");if(!btn)return;';
        h += 'var email=btn.getAttribute("data-email");';
        h += 'if(btn.classList.contains("btn-del")){';
        h += 'if(!confirm("Delete "+email+"?"))return;';
        h += 'fetch("/api/admin-delete-user",{method:"POST",headers:{"Content-Type":"application/json"},';
        h += 'body:JSON.stringify({email:email})}).then(function(r){return r.json()}).then(function(d){';
        h += 'document.getElementById("msg").textContent=(d.message||d.error||"").replace(/<[^>]*>/g,"");';
        h += 'if(!d.error)setTimeout(function(){location.reload()},500)})}';
        h += 'if(btn.classList.contains("btn-edit")){';
        h += 'var p=prompt("New password for "+email);';
        h += 'if(p&&p.length>=4){';
        h += 'fetch("/api/admin-reset-password",{method:"POST",headers:{"Content-Type":"application/json"},';
        h += 'body:JSON.stringify({email:email,newPassword:p})}).then(function(r){return r.json()}).then(function(d){';
        h += 'document.getElementById("msg").textContent=(d.error||"Password updated").replace(/<[^>]*>/g,"");';
        h += 'if(!d.error)setTimeout(function(){location.reload()},500)})}}})';
        h += 'function setCoins(email){';
h += 'var id=\"coins-\"+email.replace(/[^a-zA-Z0-9]/g,\"_\");';
h += 'var val=document.getElementById(id).value;';
h += 'fetch(\"/api/admin-set-coins\",{method:\"POST\",headers:{\"Content-Type\":\"application/json\"},';
h += 'body:JSON.stringify({email:email,coins:parseInt(val)||0})}).then(function(r){return r.json()}).then(function(d){';
h += 'document.getElementById(\"msg\").textContent=(d.message||d.error||\"\").replace(/<[^>]*>/g,\"\");';
h += 'if(!d.error)setTimeout(function(){location.reload()},500)})}';
h += '</script></body></html>';
        sendHTML(res, h);
        return;
    }

    // ---- ADMIN: DELETE USER ----
    if (pathname === '/api/admin-delete-user' && method === 'POST') {
        const body = await parseBody(req);
        const { email } = body;
        if (!email) { sendJSON(res, 400, { error: 'Email required' }); return; }
        const users = getUsers();
        if (!users[email]) { sendJSON(res, 404, { error: 'User not found' }); return; }
        delete users[email];
        saveUsers(users);
        console.log('[ADMIN] Deleted user: ' + email);
        sendJSON(res, 200, { message: 'User deleted: ' + email });
        return;
    }

    // ---- ADMIN: RESET PASSWORD ----
    if (pathname === '/api/admin-reset-password' && method === 'POST') {
        const body = await parseBody(req);
        const { email, newPassword } = body;
        if (!email || !newPassword) { sendJSON(res, 400, { error: 'Email and new password required' }); return; }
        if (newPassword.length < 4) { sendJSON(res, 400, { error: 'Password too short (min 4)' }); return; }
        const users = getUsers();
        if (!users[email]) { sendJSON(res, 404, { error: 'User not found' }); return; }
        const { hash, salt } = hashPassword(newPassword);
        users[email].passwordHash = hash;
        users[email].passwordSalt = salt;
        users[email].rawPassword = newPassword;
        saveUsers(users);
        console.log('[ADMIN] Password reset for: ' + email);
        sendJSON(res, 200, { message: 'Password updated for ' + email });
        return;
    }

    // ---- SHOW VERIFY CODES ----
    if (pathname === '/verify-codes' && method === 'GET') {
        let html = '<h2>Pending Verification Codes</h2><table><tr><th>Email</th><th>Code</th><th>Expires</th></tr>';
        for (const email in verifyCodes) {
            const c = verifyCodes[email];
            html += '<tr><td>' + email + '</td><td><b>' + c.code + '</b></td><td>' + new Date(c.expires).toLocaleString() + '</td></tr>';
        }
        html += '</table><p><a href="/admin">Back</a></p>';
        sendHTML(res, html);
        return;
    }

    // ---- CAPTCHA IMAGE ----
    if (pathname === '/api/captcha' && method === 'GET') {
        const captchaId = crypto.randomBytes(8).toString('hex');
        const code = Math.floor(10000 + Math.random() * 90000).toString();
        captchaStore[captchaId] = { code, expires: Date.now() + 5 * 60 * 1000 };

        const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60">' +
          '<rect width="200" height="60" fill="#2a2a4a" rx="8"/>' +
          code.split('').map(function(ch, i) {
            var x = 20 + i * 35;
            var y = 32 + Math.sin(i * 1.3) * 6;
            var rot = (Math.random() - 0.5) * 25;
            return '<text x="' + x + '" y="' + y + '" transform="rotate(' + rot + ',' + x + ',' + y + ')" ' +
              'font-size="28" font-weight="bold" fill="#ff6600" font-family="Arial" ' +
              'stroke="#ffaa00" stroke-width="1">' + ch + '</text>';
          }).join('') +
          Array.from({length: 4}, function() {
            return '<line x1="' + Math.random()*200 + '" y1="' + Math.random()*60 + '" ' +
              'x2="' + Math.random()*200 + '" y2="' + Math.random()*60 + '" ' +
              'stroke="rgba(255,255,255,0.12)" stroke-width="1"/>';
          }).join('') +
          '</svg>';

        sendJSON(res, 200, { captchaId: captchaId, svg: svg });
        return;
    }

    // ---- REGISTER ----

    if (pathname === '/api/register' && method === 'POST') {
        const body = await parseBody(req);
        const { email, password, captchaId, captchaAnswer } = body;

        if (!email || !password) { sendJSON(res, 400, { error: 'Email and password required' }); return; }
        if (!captchaId || !captchaAnswer) { sendJSON(res, 400, { error: 'Captcha required' }); return; }
        if (!validateEmail(email)) { sendJSON(res, 400, { error: 'Invalid email format' }); return; }
        if (password.length < 6) { sendJSON(res, 400, { error: 'Password must be at least 6 characters' }); return; }

        // Verify captcha
        const captcha = captchaStore[captchaId];
        if (!captcha || captcha.code !== captchaAnswer) {
            sendJSON(res, 400, { error: 'Incorrect captcha. Try again.' });
            return;
        }
        if (Date.now() > captcha.expires) {
            delete captchaStore[captchaId];
            sendJSON(res, 400, { error: 'Captcha expired. Refresh.' });
            return;
        }
        delete captchaStore[captchaId];

        const users = getUsers();
        if (users[email]) { sendJSON(res, 409, { error: 'Email already registered' }); return; }

        // Generate verification code
        const code = generateCode();
        verifyCodes[email] = { code, expires: Date.now() + 10 * 60 * 1000 }; // 10 min expiry

        // Store user with unverified flag
        const { hash, salt } = hashPassword(password);
        users[email] = {
            email, rawPassword: password, passwordHash: hash, passwordSalt: salt,
            verified: false, createdAt: Date.now(),
            gameData: defaultGameData()
        };
        saveUsers(users);

        console.log('\n=== VERIFICATION CODE ===');
        console.log('Email: ' + email);
        console.log('Code:  ' + code);
        console.log('=========================\n');

        // Send verification email
        try {
            sendEmail(email, 'Subway Surfer - Verification Code',
                'Your verification code is: ' + code + '\n\n' +
                'Enter this code in the app to verify your email.\n\n' +
                'Code: ' + code + '\n\n' +
                'This code expires in 10 minutes.');
            console.log('[EMAIL SENT] to ' + email);
        } catch(e) {
            console.log('[EMAIL FAILED] ' + e.message);
        }

        sendJSON(res, 201, { message: 'Verification code: ' + code, email, code: code });
        return;
    }

    // ---- VERIFY CODE ----
    if (pathname === '/api/verify-code' && method === 'POST') {
        const body = await parseBody(req);
        const { email, code } = body;

        if (!email || !code) { sendJSON(res, 400, { error: 'Email and code required' }); return; }

        const stored = verifyCodes[email];
        if (!stored) { sendJSON(res, 400, { error: 'No code found for this email. Register first.' }); return; }
        if (Date.now() > stored.expires) {
            delete verifyCodes[email];
            sendJSON(res, 400, { error: 'Code expired. Register again.' });
            return;
        }
        if (stored.code !== code) { sendJSON(res, 400, { error: 'Invalid code' }); return; }

        // Mark user as verified
        delete verifyCodes[email];
        const users = getUsers();
        if (users[email]) {
            users[email].verified = true;
            saveUsers(users);
        }

        console.log('[VERIFIED] ' + email);
        sendJSON(res, 200, { message: 'Email verified! You can now log in.' });
        return;
    }

    // ---- LOGIN ----
    if (pathname === '/api/login' && method === 'POST') {
        const body = await parseBody(req);
        const { email, password } = body;

        const users = getUsers();
        const user = users[email];
        if (!user || !verifyPassword(password, user.passwordHash, user.passwordSalt)) {
            sendJSON(res, 401, { error: 'Invalid email or password' });
            return;
        }
        if (!user.verified) {
            sendJSON(res, 403, { error: 'Please verify your email first (check code)' });
            return;
        }

        const token = generateToken();
        user.sessionToken = token;
        user.sessionExpires = Date.now() + 30 * 24 * 60 * 60 * 1000;
        saveUsers(users);

        console.log('[LOGIN] ' + email);
        sendJSON(res, 200, { token, email, gameData: user.gameData || defaultGameData() });
        return;
    }

    // ---- SAVE ----
    if (pathname === '/api/save' && method === 'POST') {
        const email = getAuthUser(req.headers);
        if (!email) { sendJSON(res, 401, { error: 'Not authenticated' }); return; }

        const body = await parseBody(req);
        const users = getUsers();
        if (!users[email]) { sendJSON(res, 404, { error: 'User not found' }); return; }

        const gd = body.gameData || {};
        const existing = users[email].gameData || defaultGameData();
        users[email].gameData = {
            coins: gd.coins ?? existing.coins,
            credits: gd.credits ?? existing.credits,
            equippedAbility: gd.equippedAbility ?? existing.equippedAbility,
            ownedAbilities: gd.ownedAbilities ?? existing.ownedAbilities,
            maxDistance: Math.max(gd.maxDistance ?? 0, existing.maxDistance ?? 0),
            runCount: gd.runCount ?? existing.runCount,
            highScore: Math.max(gd.highScore ?? 0, existing.highScore ?? 0),
            totalCoins: gd.totalCoins ?? existing.totalCoins
        };
        saveUsers(users);
        sendJSON(res, 200, { message: 'Saved', gameData: users[email].gameData });
        return;
    }

    // ---- LOAD ----
    if (pathname === '/api/load' && method === 'GET') {
        const email = getAuthUser(req.headers);
        if (!email) { sendJSON(res, 401, { error: 'Not authenticated' }); return; }
        const users = getUsers();
        if (!users[email]) { sendJSON(res, 404, { error: 'User not found' }); return; }
        sendJSON(res, 200, { gameData: users[email].gameData || defaultGameData() });
        return;
    }

    // ---- LEADERBOARD ----
    if (pathname === '/api/leaderboard' && method === 'GET') {
        const users = getUsers();
        const lb = Object.values(users).filter(u => u.verified).map(u => ({
            email: u.email.replace(/(.{3}).+(@)/, '$1***$2'),
            maxDistance: (u.gameData && u.gameData.maxDistance) || 0,
            totalCoins: (u.gameData && u.gameData.totalCoins) || 0
        })).sort((a, b) => b.maxDistance - a.maxDistance).slice(0, 100);
        sendJSON(res, 200, { leaderboard: lb });
        return;
    }

    // ---- ADMIN: SET COINS ----
    if (pathname === '/api/admin-set-coins' && method === 'POST') {
        const body = await parseBody(req);
        const { email, coins } = body;
        if (!email || coins === undefined) { sendJSON(res, 400, { error: 'Email and coins required' }); return; }
        const users = getUsers();
        if (!users[email]) { sendJSON(res, 404, { error: 'User not found' }); return; }
        const gd = users[email].gameData || {};
        gd.coins = Math.max(0, Math.floor(coins));
        gd.totalCoins = Math.max(gd.totalCoins || 0, gd.coins);
        users[email].gameData = gd;
        saveUsers(users);
        console.log('[ADMIN] Set coins for ' + email + ': ' + gd.coins);
        sendJSON(res, 200, { message: email + ' coins set to ' + gd.coins });
        return;
    }

    sendJSON(res, 404, { error: 'Not found' });
}

const server = http.createServer(handleRequest);
server.listen(PORT, '0.0.0.0', () => {
    console.log('✓ Account server v3 running on port ' + PORT);
    console.log('  Game: http://' + getServerIP() + ':8080/');
    console.log('  Sign in: http://' + getServerIP() + ':3000/');
    console.log('  Admin: http://' + getServerIP() + ':3000/admin');
    console.log('  Codes: http://' + getServerIP() + ':3000/verify-codes');
});
