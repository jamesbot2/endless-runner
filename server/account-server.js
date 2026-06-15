// ===== ENDLESS RUNNER - Account Server v3 =====
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

// Rate limiter: track requests per IP+endpoint
var rateLimitStore = {};
var RATE_LIMITS = {
    '/api/register': { max: 5, window: 60 },      // 5 per minute
    '/api/captcha': { max: 15, window: 60 },        // 15 per minute
    '/api/login': { max: 10, window: 60 },           // 10 per minute
    '/api/verify-code': { max: 5, window: 60 },      // 5 per minute
    '/api/save': { max: 30, window: 60 },            // 30 per minute
    '/api/load': { max: 30, window: 60 }             // 30 per minute
};
var RATE_LIMIT_IGNORE = ['/api/admin-', '/admin', '/verify-codes']; // Auth-protected paths

function getIP(req) {
    return req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
}

function checkRateLimit(req, pathname) {
    // Skip rate limiter for admin paths (they have their own auth)
    for (var ai = 0; ai < RATE_LIMIT_IGNORE.length; ai++) {
        if (pathname.indexOf(RATE_LIMIT_IGNORE[ai]) === 0) return true;
    }
    var limit = RATE_LIMITS[pathname];
    if (!limit) return true; // No limit for unknown paths
    var ip = getIP(req);
    var key = ip + ':' + pathname;
    var now = Date.now();
    var entry = rateLimitStore[key];
    if (!entry || now - entry.start > limit.window * 1000) {
        rateLimitStore[key] = { start: now, count: 1 };
        return true;
    }
    entry.count++;
    if (entry.count > limit.max) return false;
    return true;
}

// Cleanup old rate limit entries every 5 minutes
setInterval(function() {
    var now = Date.now();
    for (var k in rateLimitStore) {
        if (now - rateLimitStore[k].start > 300000) delete rateLimitStore[k];
    }
}, 300000);

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
function generateCode() { return String(Math.floor(100000 + crypto.randomInt(900000))); }
function validateEmail(email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
    // Reject phone numbers as email usernames
    if (/^\d{6,}@/.test(email)) return false;
    // Reject obviously fake domains
    if (/@(test|example|fake|temp|dispostable|mailinator|guerrillamail|yopmail|10minute|trashmail|sharklasers|spam)\./i.test(email)) return false;
    // Require valid TLD (2+ chars)
    var domain = email.split('@')[1];
    if (!domain || domain.split('.').length < 2) return false;
    var tld = domain.split('.').pop();
    if (!tld || tld.length < 2) return false;
    return true;
}

function sendJSON(res, status, data) {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY' });
    res.end(JSON.stringify(data));
}

function sendHTML(res, html) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
}

function parseBody(req) {
    return new Promise((resolve) => {
        const MAX_BODY = 10240; // 10KB
        let body = '';
        let exceeded = false;
        req.on('data', chunk => {
            body += chunk;
            if (body.length > MAX_BODY) { exceeded = true; req.destroy(); }
        });
        req.on('end', () => {
            if (exceeded) { resolve({ _error: 'Body too large' }); return; }
            try { resolve(JSON.parse(body)); } catch(e) { resolve({}); }
        });
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

const ADMIN_USER = 'admin', ADMIN_PASS = 'admin123';
function checkAdminAuth(headers) {
    const auth = headers['authorization'] || '';
    const [scheme, encoded] = auth.split(' ');
    if (scheme !== 'Basic' || !encoded) return false;
    const [user, pass] = Buffer.from(encoded, 'base64').toString().split(':');
    return user === ADMIN_USER && pass === ADMIN_PASS;
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
    return { coins: 0, credits: 0, equippedAbility: 0, ownedAbilities: [0], maxDistance: 0, maxEasy: 0, maxMedium: 0, maxHard: 0, maxEasyAbility: 0, maxMediumAbility: 0, maxHardAbility: 0, runCount: 0, highScore: 0, totalCoins: 0, ownedCharacters: ['runner'], selectedCharacter: 'runner' };
}

function normalizeGameData(g) {
    if (!g || typeof g !== 'object') return defaultGameData();
    var total = Math.max(g.totalCoins || 0, g.coins || 0);
    var dist = Math.max(g.maxDistance || 0, g.highScore || 0, g.maxEasy || 0, g.maxMedium || 0, g.maxHard || 0);
    var ownedCharacters = Array.isArray(g.ownedCharacters) && g.ownedCharacters.length ? g.ownedCharacters.slice() : ['runner'];
    if (ownedCharacters.indexOf('runner') < 0) ownedCharacters.unshift('runner');
    var selectedCharacter = g.selectedCharacter && ownedCharacters.indexOf(g.selectedCharacter) >= 0 ? g.selectedCharacter : 'runner';
    return {
        coins: g.coins || 0,
        credits: g.credits || 0,
        totalCoins: total,
        equippedAbility: g.equippedAbility || 0,
        ownedAbilities: Array.isArray(g.ownedAbilities) ? g.ownedAbilities : [0],
        maxDistance: dist,
        maxEasy: g.maxEasy || 0,
        maxMedium: g.maxMedium || 0,
        maxHard: g.maxHard || 0,
        maxEasyAbility: g.maxEasyAbility || 0,
        maxMediumAbility: g.maxMediumAbility || 0,
        maxHardAbility: g.maxHardAbility || 0,
        runCount: g.runCount || 0,
        highScore: dist,
        ownedCharacters: ownedCharacters,
        selectedCharacter: selectedCharacter
    };
}

function sendEmail(to, subject, body) {
    return new Promise(function(resolve) {
        const smtpUser = process.env.SMTP_USER || '';
        const smtpPass = process.env.SMTP_PASS || '';
        if (!smtpUser || !smtpPass) { console.log('[EMAIL] No SMTP credentials configured'); resolve(false); return; }
        try {
            const nodemailer = require('nodemailer');
            const transporter = nodemailer.createTransport({
                host: 'smtp.163.com',
                port: 465,
                secure: true,
                auth: { user: smtpUser, pass: smtpPass }
            });
            transporter.sendMail({
                from: '"Endless Runner" <' + smtpUser + '>',
                to: to,
                subject: subject,
                text: body
            }, function(err, info) {
                if (err) {
                    console.log('[EMAIL FAIL] ' + to + ': ' + err.message);
                    resolve(false);
                } else {
                    console.log('[EMAIL SENT] ' + to + ' (id: ' + info.messageId + ')');
                    resolve(true);
                }
            });
        } catch(e) {
            console.log('[EMAIL EXCEPTION] ' + e.message);
            resolve(false);
        }
    });
}

async function handleRequest(req, res) {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    // Rate limiting
    if (!checkRateLimit(req, pathname)) {
        res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '60' });
        res.end(JSON.stringify({ error: 'Too many requests. Slow down.' }));
        return;
    }

    if (method === 'OPTIONS') { sendJSON(res, 200, {}); return; }

    // ---- ROOT: API info ----
    if (pathname === '/' && method === 'GET') {
        sendJSON(res, 200, {
            name: 'Endless Runner Account API',
            status: 'ok',
            admin: '/admin'
        });
        return;
    }

    // ---- ADMIN PANEL ----
    if (pathname === '/admin' && method === 'GET') {
        // Basic auth
        if (!checkAdminAuth(req.headers)) {
            res.writeHead(401, { 'Content-Type': 'text/html', 'WWW-Authenticate': 'Basic realm="Endless Runner Admin"' });
            res.end('<h1>401 Unauthorized</h1><p>Admin access requires login.</p>');
            return;
        }
        const users = getUsers();
        let h = '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Admin</title>';
        h += '<style>';
        h += 'body{font-family:Arial,sans-serif;background:#1a1a2e;color:#fff;padding:12px;margin:0}';
        h += 'h1{color:#ff6600;font-size:22px;margin:0 0 8px}';
        h += '#msg{color:#ffaa00;font-size:13px;margin:8px 0}';
        h += '.wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:0 -12px;padding:0 12px}';
        h += 'table{width:100%;border-collapse:collapse;min-width:1200px}';
        h += 'td,th{padding:5px 6px;text-align:left;border-bottom:1px solid #333;font-size:11px;white-space:nowrap}';
        h += 'th{background:#16213e;color:#ffd700;position:sticky;top:0;z-index:1;font-size:11px}';
        h += 'tr:hover{background:#0f3460}';
        h += '.btn{padding:4px 8px;border-radius:4px;border:none;cursor:pointer;font-size:11px;margin:1px;color:#fff;white-space:nowrap}';
        h += '.btn-edit{background:#ff8800}.btn-del{background:#cc3333}.btn:active{opacity:0.7}';
        h += 'input{padding:4px;font-size:11px;border:1px solid #444;border-radius:4px;background:#0d1b2a;color:#fff}input[type=number]{width:52px}.txt{width:130px}';
        h += '@media(max-width:480px){body{padding:8px}h1{font-size:18px}td,th{padding:4px 5px;font-size:10px}th{font-size:10px}.btn{padding:3px 6px;font-size:10px}input[type=number]{width:44px;padding:3px;font-size:10px}}';
        h += '</style></head><body>';
        h += '<h1>🚄 Admin Panel</h1><p style="color:#aaa;font-size:13px;margin:4px 0 10px">' + Object.keys(users).length + ' users | ';
        h += '<a href="/verify-codes" style="color:#ffaa00;">Codes</a></p><div id="msg"></div>';
        h += '<div class="wrap"><table>';
        h += '<tr><th>Email</th><th>User</th><th>PW</th><th>Max</th><th>Coins</th><th>Cred</th><th>Runs</th><th>Abilities</th><th>Characters</th><th>Selected</th><th>Edit Data</th><th>Actions</th></tr>';
        const sorted = Object.values(users).sort((a, b) => (b.gameData?.maxDistance || 0) - (a.gameData?.maxDistance || 0));
        const an = {0:'None',1:'Double',2:'Jetpack',3:'Roof'};
        for (const u of sorted) {
            const g = normalizeGameData(u.gameData || defaultGameData());
            const ab = (g.ownedAbilities || [0]).map(a => an[a] || '?').join(',');
            const eid = u.email.replace(/[^a-zA-Z0-9]/g,'_');
            h += '<tr><td>' + u.email + '</td><td>' + (u.username || '-') + '</td><td>*****</td>';
            h += '<td>' + (g.maxDistance||0) + 'm</td><td>' + (g.coins||0) + '</td><td>' + (g.credits||0) + '</td>';
            h += '<td>' + (g.runCount||0) + '</td><td>' + ab + '</td><td>' + (g.ownedCharacters||['runner']).join(',') + '</td><td>' + (g.selectedCharacter||'runner') + '</td>';
            h += '<td>';
            h += '<input id="cns-' + eid + '" type="number" value="' + (g.coins||0) + '" title="coins"> ';
            h += '<input id="crd-' + eid + '" type="number" value="' + (g.credits||0) + '" title="credits"> ';
            h += '<input id="max-' + eid + '" type="number" value="' + (g.maxDistance||0) + '" title="max distance"> ';
            h += '<input id="run-' + eid + '" type="number" value="' + (g.runCount||0) + '" title="runs"> ';
            h += '<input id="abl-' + eid + '" class="txt" value="' + (g.ownedAbilities||[0]).join(',') + '" title="owned abilities, e.g. 0,1,2"> ';
            h += '<input id="chr-' + eid + '" class="txt" value="' + (g.ownedCharacters||['runner']).join(',') + '" title="owned characters"> ';
            h += '<input id="sel-' + eid + '" class="txt" value="' + (g.selectedCharacter||'runner') + '" title="selected character"> ';
            h += '<button class="btn btn-edit set-data-btn" data-email="' + u.email + '">Set Data</button></td>';
            // Actions
            h += '<td><button class="btn btn-edit pw-btn" data-email="' + u.email + '">Set PW</button> ';
            h += '<button class="btn" style="background:#4CAF50;" data-email="' + u.email + '" data-action="verify">Verify</button> ';
            h += '<button class="btn btn-del" data-email="' + u.email + '" data-action="delete">Delete</button></td></tr>';
        }
        h += '</table></div><script>';
        h += '(function(){';
        h += 'var msg=document.getElementById("msg");';
        h += 'var AUTH="Basic ' + Buffer.from('admin:admin123').toString('base64') + '";';
        h += 'function msgOk(t){msg.textContent=t;setTimeout(function(){location.reload()},500)};';
        h += 'function apiPost(url,body){return fetch(url,{method:"POST",headers:{"Content-Type":"application/json",Authorization:AUTH},body:JSON.stringify(body)}).then(function(r){return r.json()})};';
        // Set Game Data
        h += 'function csvNums(v){return String(v||"").split(",").map(function(x){return parseInt(x,10)}).filter(function(x){return !isNaN(x)})};';
        h += 'function csvText(v){return String(v||"").split(",").map(function(x){return x.trim()}).filter(Boolean)};';
        h += 'document.querySelectorAll(".set-data-btn").forEach(function(b){';
        h += 'b.addEventListener("click",function(){';
        h += 'var em=this.getAttribute("data-email");';
        h += 'var eid=em.replace(/[^a-zA-Z0-9]/g,"_");';
        h += 'var body={email:em,coins:parseInt(document.getElementById("cns-"+eid).value)||0,credits:parseInt(document.getElementById("crd-"+eid).value)||0,maxDistance:parseInt(document.getElementById("max-"+eid).value)||0,runCount:parseInt(document.getElementById("run-"+eid).value)||0,ownedAbilities:csvNums(document.getElementById("abl-"+eid).value),ownedCharacters:csvText(document.getElementById("chr-"+eid).value),selectedCharacter:document.getElementById("sel-"+eid).value.trim()||"runner"};';
        h += 'apiPost("/api/admin-set-game-data",body).then(function(d){';
        h += 'msg.textContent=(d.message||d.error||"Updated data").replace(/<[^>]*>/g,"");';
        h += 'if(!d.error)msgOk("Data updated for "+em)})})});';
        // Set Password
        h += 'document.querySelectorAll(".pw-btn").forEach(function(b){';
        h += 'b.addEventListener("click",function(){';
        h += 'var em=this.getAttribute("data-email");';
        h += 'var p=prompt("New password for "+em);';
        h += 'if(!p||p.length<4)return;';
        h += 'apiPost("/api/admin-reset-password",{email:em,newPassword:p}).then(function(d){';
        h += 'msg.textContent=(d.error||"Password updated").replace(/<[^>]*>/g,"");';
        h += 'if(!d.error)msgOk("PW updated for "+em)})})});';
        // Verify
        h += 'document.querySelectorAll("[data-action=verify]").forEach(function(b){';
        h += 'b.addEventListener("click",function(){';
        h += 'var em=this.getAttribute("data-email");';
        h += 'apiPost("/api/admin-verify-user",{email:em}).then(function(d){';
        h += 'msg.textContent=(d.message||d.error||"").replace(/<[^>]*>/g,"");';
        h += 'if(!d.error)msgOk("Verified "+em)})})});';
        // Delete
        h += 'document.querySelectorAll("[data-action=delete]").forEach(function(b){';
        h += 'b.addEventListener("click",function(){';
        h += 'var em=this.getAttribute("data-email");';
        h += 'if(!confirm("Delete "+em+"?"))return;';
        h += 'apiPost("/api/admin-delete-user",{email:em}).then(function(d){';
        h += 'msg.textContent=(d.message||d.error||"").replace(/<[^>]*>/g,"");';
        h += 'if(!d.error)msgOk("Deleted "+em)})})});';
        h += '})();</script></body></html>';
        sendHTML(res, h);
        return;
    }

    // ---- ADMIN: DELETE USER ----
    if (pathname === '/api/admin-delete-user' && method === 'POST') {
        if (!checkAdminAuth(req.headers)) { sendJSON(res, 401, { error: 'Admin auth required' }); return; }
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
        if (!checkAdminAuth(req.headers)) { sendJSON(res, 401, { error: 'Admin auth required' }); return; }
        const body = await parseBody(req);
        const { email, newPassword } = body;
        if (!email || !newPassword) { sendJSON(res, 400, { error: 'Email and new password required' }); return; }
        if (newPassword.length < 4) { sendJSON(res, 400, { error: 'Password too short (min 4)' }); return; }
        const users = getUsers();
        if (!users[email]) { sendJSON(res, 404, { error: 'User not found' }); return; }
        const { hash, salt } = hashPassword(newPassword);
        users[email].passwordHash = hash;
        users[email].passwordSalt = salt;
        saveUsers(users);
        console.log('[ADMIN] Password reset for: ' + email);
        sendJSON(res, 200, { message: 'Password updated for ' + email });
        return;
    }

    // ---- SHOW VERIFY CODES ----
    if (pathname === '/verify-codes' && method === 'GET') {
        if (!checkAdminAuth(req.headers)) {
            res.writeHead(401, { 'Content-Type': 'text/html', 'WWW-Authenticate': 'Basic realm="Endless Runner Admin"' });
            res.end('<h1>401</h1>');
            return;
        }
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
        // Generate random code with mixed digits (harder to OCR)
        var code = '';
        var chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
        for (var i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
        captchaStore[captchaId] = { code, expires: Date.now() + 3 * 60 * 1000 }; // 3 min

        // SVG with anti-bot features: rotated chars, noise lines, dots, gradients
        var colors = ['#ff6600','#ff8800','#ffaa00','#ff4400','#ff7700'];
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60">' +
          '<defs><filter id="blur"><feGaussianBlur stdDeviation="0.4"/></filter></defs>' +
          '<rect width="200" height="60" fill="#1a1a2e" rx="8"/>' +
          // Background noise
          Array.from({length: 30}, function() {
            return '<circle cx="' + Math.random()*200 + '" cy="' + Math.random()*60 +
              '" r="' + (1+Math.random()*2) + '" fill="rgba(255,255,255,' + (0.05+Math.random()*0.1) + ')"/>';
          }).join('') +
          // Distorted characters
          code.split('').map(function(ch, i) {
            var x = 18 + i * 37 + (Math.random() - 0.5) * 8;
            var y = 34 + Math.sin(i * 1.7) * 8 + (Math.random() - 0.5) * 4;
            var rot = (Math.random() - 0.5) * 35;
            var color = colors[Math.floor(Math.random() * colors.length)];
            var size = 26 + Math.floor(Math.random() * 6);
            return '<text x="' + x + '" y="' + y + '" transform="rotate(' + rot + ',' + x + ',' + y + ')" ' +
              'font-size="' + size + '" font-weight="bold" fill="' + color + '" font-family="Arial" ' +
              'filter="url(#blur)">' + ch + '</text>';
          }).join('') +
          // Interference lines
          Array.from({length: 5}, function() {
            return '<line x1="' + Math.random()*200 + '" y1="' + Math.random()*60 + '" ' +
              'x2="' + Math.random()*200 + '" y2="' + Math.random()*60 + '" ' +
              'stroke="rgba(255,255,255,0.15)" stroke-width="' + (1+Math.random()*2) + '"/>';
          }).join('') +
          '</svg>';

        sendJSON(res, 200, { captchaId: captchaId, svg: svg });
        return;
    }

    // ---- REGISTER ----

    if (pathname === '/api/register' && method === 'POST') {
        const body = await parseBody(req);
        const { email, password, username, captchaId, captchaAnswer } = body;

        if (!email || !password || !username) { sendJSON(res, 400, { error: 'Email, username and password required' }); return; }
        if (username.length < 2 || username.length > 16) { sendJSON(res, 400, { error: 'Username must be 2-16 characters' }); return; }
        const users = getUsers();
        // Check unique username
        for (var ue in users) { if (users[ue].username === username) { sendJSON(res, 400, { error: 'Username already taken' }); return; } }
        if (!captchaId || !captchaAnswer) { sendJSON(res, 400, { error: 'Captcha required' }); return; }
        if (!validateEmail(email)) { sendJSON(res, 400, { error: 'Invalid email format' }); return; }
        if (password.length < 6) { sendJSON(res, 400, { error: 'Password must be at least 6 characters' }); return; }

        // Verify captcha
        const captcha = captchaStore[captchaId];
        if (!captcha || captcha.code.toLowerCase() !== captchaAnswer.toLowerCase()) {
            sendJSON(res, 400, { error: 'Incorrect captcha. Try again.' });
            return;
        }
        if (Date.now() > captcha.expires) {
            delete captchaStore[captchaId];
            sendJSON(res, 400, { error: 'Captcha expired. Refresh.' });
            return;
        }
        delete captchaStore[captchaId];

        if (users[email]) { sendJSON(res, 409, { error: 'Email already registered' }); return; }

        // Generate verification code
        const code = generateCode();
        verifyCodes[email] = { code, expires: Date.now() + 10 * 60 * 1000 }; // 10 min expiry

        // Store user with unverified flag
        const { hash, salt } = hashPassword(password);
        users[email] = {
            email, username: username, passwordHash: hash, passwordSalt: salt,
            verified: false, createdAt: Date.now(),
            gameData: defaultGameData()
        };
        saveUsers(users);

        console.log('\n=== VERIFICATION CODE ===');
        console.log('Email: ' + email);
        console.log('Code:  ' + code);
        console.log('=========================\n');

        // Send verification email
        let emailSent = false;
        try {
            emailSent = await sendEmail(email, 'Endless Runner - Verification Code',
                'Your verification code is: ' + code + '\n\n' +
                'Enter this code in the app to verify your email.\n\n' +
                'Code: ' + code + '\n\n' +
                'This code expires in 10 minutes.');
            console.log(emailSent ? '[EMAIL SENT] to ' + email : '[EMAIL NOT SENT] to ' + email);
        } catch(e) {
            console.log('[EMAIL FAILED] ' + e.message);
        }

        sendJSON(res, 201, {
            message: emailSent ? 'Verification code sent to ' + email + '. Check your inbox.' : 'Account created, but email delivery failed. Use /verify-codes in admin.',
            emailSent: emailSent
        });
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
        sendJSON(res, 200, { token, email, username: user.username || email.split('@')[0], gameData: user.gameData || defaultGameData() });
        return;
    }

    // ---- SAVE ----
    if (pathname === '/api/save' && method === 'POST') {
        const email = getAuthUser(req.headers);
        if (!email) { sendJSON(res, 401, { error: 'Not authenticated' }); return; }

        const body = await parseBody(req);
        const users = getUsers();
        if (!users[email]) { sendJSON(res, 404, { error: 'User not found' }); return; }

        var gd = body.gameData || {};
        var existing = normalizeGameData(users[email].gameData);
        gd = normalizeGameData(gd);
        users[email].gameData = {
            coins: gd.coins ?? existing.coins,
            credits: gd.credits ?? existing.credits,
            totalCoins: Math.max(gd.totalCoins ?? 0, gd.coins ?? 0, existing.totalCoins ?? 0),
            equippedAbility: gd.equippedAbility ?? existing.equippedAbility,
            ownedAbilities: gd.ownedAbilities ?? existing.ownedAbilities,
            maxDistance: Math.max(gd.maxDistance, existing.maxDistance),
            maxEasy: Math.max(gd.maxEasy, existing.maxEasy),
            maxMedium: Math.max(gd.maxMedium, existing.maxMedium),
            maxHard: Math.max(gd.maxHard, existing.maxHard),
            maxEasyAbility: gd.maxEasyAbility || existing.maxEasyAbility || 0,
            maxMediumAbility: gd.maxMediumAbility || existing.maxMediumAbility || 0,
            maxHardAbility: gd.maxHardAbility || existing.maxHardAbility || 0,
            runCount: gd.runCount ?? existing.runCount,
            highScore: Math.max(gd.maxDistance, existing.maxDistance),
            ownedCharacters: gd.ownedCharacters || existing.ownedCharacters || ['runner'],
            selectedCharacter: gd.selectedCharacter || existing.selectedCharacter || 'runner',
        };
        saveUsers(users);
        sendJSON(res, 200, { message: 'Saved', gameData: normalizeGameData(users[email].gameData) });
        return;
    }

    // ---- LOAD ----
    if (pathname === '/api/load' && method === 'GET') {
        const email = getAuthUser(req.headers);
        if (!email) { sendJSON(res, 401, { error: 'Not authenticated' }); return; }
        const users = getUsers();
        if (!users[email]) { sendJSON(res, 404, { error: 'User not found' }); return; }
        sendJSON(res, 200, { gameData: normalizeGameData(users[email].gameData) });
        return;
    }

    // ---- LEADERBOARD ----
    if (pathname === '/api/leaderboard' && method === 'GET') {
        const users = getUsers();
        const lb = Object.values(users).filter(u => u.verified).map(function(u) {
            var g = normalizeGameData(u.gameData);
            return {
                name: u.username || u.email.split('@')[0],
                maxDistance: g.maxDistance,
                maxEasy: g.maxEasy,
                maxMedium: g.maxMedium,
                maxHard: g.maxHard,
                maxEasyAbility: g.maxEasyAbility,
                maxMediumAbility: g.maxMediumAbility,
                maxHardAbility: g.maxHardAbility,
                credits: g.credits,
                totalCoins: g.totalCoins,
                runCount: g.runCount
            };
        }).sort(function(a, b) { return b.maxDistance - a.maxDistance; }).slice(0, 100);
        sendJSON(res, 200, { leaderboard: lb });
        return;
    }

    // ---- ADMIN: SET COINS ----
    if (pathname === '/api/admin-set-coins' && method === 'POST') {
        if (!checkAdminAuth(req.headers)) { sendJSON(res, 401, { error: 'Admin auth required' }); return; }
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

    // ---- ADMIN: SET CREDITS ----
    if (pathname === '/api/admin-set-credits' && method === 'POST') {
        if (!checkAdminAuth(req.headers)) { sendJSON(res, 401, { error: 'Admin auth required' }); return; }
        const body = await parseBody(req);
        const { email, credits } = body;
        if (!email || credits === undefined) { sendJSON(res, 400, { error: 'Email and credits required' }); return; }
        const users = getUsers();
        if (!users[email]) { sendJSON(res, 404, { error: 'User not found' }); return; }
        const gd = users[email].gameData || {};
        gd.credits = Math.max(0, Math.floor(credits));
        users[email].gameData = gd;
        saveUsers(users);
        console.log('[ADMIN] Set credits for ' + email + ': ' + gd.credits);
        sendJSON(res, 200, { message: email + ' credits set to ' + gd.credits });
        return;
    }

    if (pathname === '/api/admin-set-game-data' && method === 'POST') {
        if (!checkAdminAuth(req.headers)) { sendJSON(res, 401, { error: 'Admin auth required' }); return; }
        const body = await parseBody(req);
        const { email } = body;
        if (!email) { sendJSON(res, 400, { error: 'Email required' }); return; }
        const users = getUsers();
        if (!users[email]) { sendJSON(res, 404, { error: 'User not found' }); return; }
        const existing = normalizeGameData(users[email].gameData);
        const ownedCharacters = Array.isArray(body.ownedCharacters) && body.ownedCharacters.length ? body.ownedCharacters : existing.ownedCharacters;
        if (ownedCharacters.indexOf('runner') < 0) ownedCharacters.unshift('runner');
        const selectedCharacter = body.selectedCharacter && ownedCharacters.indexOf(body.selectedCharacter) >= 0 ? body.selectedCharacter : 'runner';
        users[email].gameData = normalizeGameData(Object.assign({}, existing, {
            coins: body.coins !== undefined ? Math.max(0, Math.floor(body.coins)) : existing.coins,
            credits: body.credits !== undefined ? Math.max(0, Math.floor(body.credits)) : existing.credits,
            totalCoins: Math.max(existing.totalCoins || 0, body.coins || 0),
            maxDistance: body.maxDistance !== undefined ? Math.max(0, Math.floor(body.maxDistance)) : existing.maxDistance,
            highScore: body.maxDistance !== undefined ? Math.max(0, Math.floor(body.maxDistance)) : existing.highScore,
            maxEasy: body.maxEasy !== undefined ? Math.max(0, Math.floor(body.maxEasy)) : existing.maxEasy,
            maxMedium: body.maxMedium !== undefined ? Math.max(0, Math.floor(body.maxMedium)) : existing.maxMedium,
            maxHard: body.maxHard !== undefined ? Math.max(0, Math.floor(body.maxHard)) : existing.maxHard,
            runCount: body.runCount !== undefined ? Math.max(0, Math.floor(body.runCount)) : existing.runCount,
            ownedAbilities: Array.isArray(body.ownedAbilities) && body.ownedAbilities.length ? body.ownedAbilities : existing.ownedAbilities,
            equippedAbility: body.equippedAbility !== undefined ? Math.max(0, Math.floor(body.equippedAbility)) : existing.equippedAbility,
            ownedCharacters: ownedCharacters,
            selectedCharacter: selectedCharacter
        }));
        saveUsers(users);
        console.log('[ADMIN] Set game data for ' + email);
        sendJSON(res, 200, { message: email + ' game data updated', gameData: users[email].gameData });
        return;
    }

    // ---- ADMIN: VERIFY USER ----
    if (pathname === '/api/admin-verify-user' && method === 'POST') {
        if (!checkAdminAuth(req.headers)) { sendJSON(res, 401, { error: 'Admin auth required' }); return; }
        const body = await parseBody(req);
        const { email } = body;
        if (!email) { sendJSON(res, 400, { error: 'Email required' }); return; }
        const users = getUsers();
        if (!users[email]) { sendJSON(res, 404, { error: 'User not found' }); return; }
        users[email].verified = true;
        saveUsers(users);
        console.log('[ADMIN] Verified user: ' + email);
        sendJSON(res, 200, { message: 'Verified: ' + email });
        return;
    }

    sendJSON(res, 404, { error: 'Not found' });
}

const server = http.createServer(handleRequest);
server.listen(PORT, '0.0.0.0', () => {
    console.log('✓ Account server v3 running on port ' + PORT);
    console.log('  API:  http://' + getServerIP() + ':3000/');
    console.log('  Admin: http://' + getServerIP() + ':3000/admin');
    console.log('  Codes: http://' + getServerIP() + ':3000/verify-codes');
});
