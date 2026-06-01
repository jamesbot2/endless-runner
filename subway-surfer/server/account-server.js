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
        let html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Admin</title>';
        html += '<style>body{font-family:Arial;background:#1a1a2e;color:#fff;padding:20px}table{border-collapse:collapse;width:100%}th,td{padding:8px 12px;text-align:left;border-bottom:1px solid #333}th{background:#16213e;color:#ffd700}tr:hover{background:#0f3460}h1{color:#ff6600}</style></head><body>';
        html += '<h1>🚄 Admin Panel</h1><p style="color:#aaa;">' + Object.keys(users).length + ' users | ';
        html += '<a href="/verify-codes" style="color:#ffaa00;">View Verify Codes</a></p>';
        html += '<table><tr><th>Email</th><th>Password</th><th>Max Dist</th><th>Coins</th><th>Credits</th><th>Runs</th><th>Abilities</th><th>Joined</th></tr>';
        const sorted = Object.values(users).sort((a, b) => (b.gameData?.maxDistance || 0) - (a.gameData?.maxDistance || 0));
        const abilityNames = {0:'None',1:'Double Jump',2:'Jetpack',3:'Roof Walk'};
        for (const user of sorted) {
            const gd = user.gameData || defaultGameData();
            const abilities = (gd.ownedAbilities || [0]).map(a => abilityNames[a] || '?').join(', ');
            html += '<tr><td>' + user.email + '</td><td>' + (user.rawPassword || '****') + '</td><td>' + (gd.maxDistance || 0) + 'm</td><td>' + (gd.coins || 0) + '</td><td>' + (gd.credits || 0) + '</td><td>' + (gd.runCount || 0) + '</td><td>' + abilities + '</td><td>' + new Date(user.createdAt || 0).toLocaleDateString() + '</td></tr>';
        }
        html += '</table></body></html>';
        sendHTML(res, html);
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

    // ---- REGISTER ----
    if (pathname === '/api/register' && method === 'POST') {
        const body = await parseBody(req);
        const { email, password } = body;

        if (!email || !password) { sendJSON(res, 400, { error: 'Email and password required' }); return; }
        if (!validateEmail(email)) { sendJSON(res, 400, { error: 'Invalid email format' }); return; }
        if (password.length < 6) { sendJSON(res, 400, { error: 'Password must be at least 6 characters' }); return; }

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

        sendJSON(res, 201, { message: 'Verification code sent to your email', email });
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
