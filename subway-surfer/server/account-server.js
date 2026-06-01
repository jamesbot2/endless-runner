// ===== SUBWAY SURFER - Account Server =====
// Node.js built-in only - no npm needed
// Handles: register, verify, login, save/load game data, leaderboard
// Data stored in server/data/ (JSON file database)

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const url = require('url');

const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ===== DATABASE (JSON file-based) =====
function readDB(file) {
    try {
        if (!fs.existsSync(file)) return {};
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch(e) { return {}; }
}

function writeDB(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function getUsers() { return readDB(USERS_FILE); }
function saveUsers(users) { writeDB(USERS_FILE, users); }
function getSessions() { return readDB(SESSIONS_FILE); }
function saveSessions(sessions) { writeDB(SESSIONS_FILE, sessions); }

// ===== PASSWORD HASHING (pbkdf2 sync) =====
function hashPassword(password, salt) {
    if (!salt) salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
    return { hash, salt };
}

function verifyPassword(password, storedHash, salt) {
    const { hash } = hashPassword(password, salt);
    return hash === storedHash;
}

// ===== TOKENS =====
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ===== REQUEST HANDLER =====
function sendJSON(res, status, data) {
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    });
    res.end(JSON.stringify(data));
}

function parseBody(req) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try { resolve(JSON.parse(body)); }
            catch(e) { resolve({}); }
        });
    });
}

function getAuthUser(headers) {
    const auth = headers['authorization'] || '';
    const token = auth.replace('Bearer ', '');
    if (!token) return null;
    const sessions = getSessions();
    const session = sessions[token];
    if (!session || session.expires < Date.now()) {
        if (session) delete sessions[token];
        saveSessions(sessions);
        return null;
    }
    return session.email;
}

// ===== ROUTES =====
async function handleRequest(req, res) {
    const parsed = url.parse(req.url, true);
    const pathname = parsed.pathname;
    const method = req.method;

    // CORS preflight
    if (method === 'OPTIONS') {
        sendJSON(res, 200, {});
        return;
    }

    // ---- REGISTER ----
    if (pathname === '/api/register' && method === 'POST') {
        const body = await parseBody(req);
        const { email, password } = body;

        if (!email || !password) {
            sendJSON(res, 400, { error: 'Email and password required' });
            return;
        }
        if (!validateEmail(email)) {
            sendJSON(res, 400, { error: 'Invalid email format' });
            return;
        }
        if (password.length < 6) {
            sendJSON(res, 400, { error: 'Password must be at least 6 characters' });
            return;
        }

        const users = getUsers();
        if (users[email]) {
            sendJSON(res, 409, { error: 'Email already registered' });
            return;
        }

        const { hash, salt } = hashPassword(password);
        const verifyToken = generateToken();

        users[email] = {
            email,
            passwordHash: hash,
            passwordSalt: salt,
            verified: false,
            verifyToken,
            createdAt: Date.now(),
            gameData: { highScore: 0, totalCoins: 0, credits: 0, equippedAbility: 0 }
        };
        saveUsers(users);

        // Send verification email (async - don't block)
        sendVerificationEmail(email, verifyToken).catch(() => {});

        sendJSON(res, 201, {
            message: 'Registration successful. Check your email for verification link.',
            email
        });
        return;
    }

    // ---- VERIFY EMAIL ----
    if (pathname === '/api/verify' && method === 'GET') {
        const token = parsed.query.token;
        if (!token) {
            sendJSON(res, 400, { error: 'Verification token required' });
            return;
        }

        const users = getUsers();
        let verified = false;
        for (const email in users) {
            if (users[email].verifyToken === token && !users[email].verified) {
                users[email].verified = true;
                delete users[email].verifyToken;
                verified = true;
                saveUsers(users);
                break;
            }
        }

        if (verified) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<h2>✅ Email verified! You can now log in.</h2><script>setTimeout(()=>window.close(),3000)</script>');
        } else {
            sendJSON(res, 400, { error: 'Invalid or expired token' });
        }
        return;
    }

    // ---- LOGIN ----
    if (pathname === '/api/login' && method === 'POST') {
        const body = await parseBody(req);
        const { email, password } = body;

        if (!email || !password) {
            sendJSON(res, 400, { error: 'Email and password required' });
            return;
        }

        const users = getUsers();
        const user = users[email];
        if (!user) {
            sendJSON(res, 401, { error: 'Invalid email or password' });
            return;
        }
        if (!verifyPassword(password, user.passwordHash, user.passwordSalt)) {
            sendJSON(res, 401, { error: 'Invalid email or password' });
            return;
        }
        if (!user.verified) {
            sendJSON(res, 403, { error: 'Please verify your email first' });
            return;
        }

        const token = generateToken();
        const sessions = getSessions();
        sessions[token] = { email, expires: Date.now() + 30 * 24 * 60 * 60 * 1000 }; // 30 days
        saveSessions(sessions);

        sendJSON(res, 200, {
            token,
            email,
            gameData: user.gameData
        });
        return;
    }

    // ---- SAVE GAME DATA ----
    if (pathname === '/api/save' && method === 'POST') {
        const email = getAuthUser(req.headers);
        if (!email) {
            sendJSON(res, 401, { error: 'Not authenticated' });
            return;
        }

        const body = await parseBody(req);
        const users = getUsers();
        if (!users[email]) {
            sendJSON(res, 404, { error: 'User not found' });
            return;
        }

        users[email].gameData = body.gameData || users[email].gameData;
        saveUsers(users);

        sendJSON(res, 200, { message: 'Saved' });
        return;
    }

    // ---- LOAD GAME DATA ----
    if (pathname === '/api/load' && method === 'GET') {
        const email = getAuthUser(req.headers);
        if (!email) {
            sendJSON(res, 401, { error: 'Not authenticated' });
            return;
        }

        const users = getUsers();
        if (!users[email]) {
            sendJSON(res, 404, { error: 'User not found' });
            return;
        }

        sendJSON(res, 200, { gameData: users[email].gameData });
        return;
    }

    // ---- LEADERBOARD ----
    if (pathname === '/api/leaderboard' && method === 'GET') {
        const users = getUsers();
        const leaderboard = Object.values(users)
            .filter(u => u.verified)
            .map(u => ({
                email: u.email.replace(/(.{3}).+(@)/, '$1***$2'), // mask email
                highScore: (u.gameData && u.gameData.highScore) || 0,
                totalCoins: (u.gameData && u.gameData.totalCoins) || 0
            }))
            .sort((a, b) => b.highScore - a.highScore)
            .slice(0, 100);

        sendJSON(res, 200, { leaderboard });
        return;
    }

    // ---- 404 ----
    // Root route
    if (pathname === "/" && method === "GET") {
        res.writeHead(200, {"Content-Type":"text/html"});
        res.end("<h2>Subway Surfer - Account API</h2><p>Endpoints:</p><ul><li>POST /api/register</li><li>POST /api/login</li><li>POST /api/save</li><li>GET /api/load</li><li>GET /api/leaderboard</li></ul><a href=\"http://35.212.200.85:8080/\">Play Game</a>");
        return;
    }

    sendJSON(res, 404, { error: 'Not found' });
}

// ===== EMAIL SENDING (SMTP via QQ/163/Gmail) =====
async function sendVerificationEmail(toEmail, token) {
    const verifyLink = `http://${getServerIP()}:${PORT}/api/verify?token=${token}`;
    console.log(`[EMAIL] Verification for ${toEmail}: ${verifyLink}`);
    // In production, use nodemailer or SMTP. For now, log the link.
    // User can click the link to verify. The server logs show the URL.
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

// ===== START SERVER =====
const server = http.createServer(handleRequest);
server.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ Account server running on port ${PORT}`);
    console.log(`  Register:   POST http://${getServerIP()}:${PORT}/api/register`);
    console.log(`  Login:      POST http://${getServerIP()}:${PORT}/api/login`);
    console.log(`  Save:       POST http://${getServerIP()}:${PORT}/api/save`);
    console.log(`  Load:       GET  http://${getServerIP()}:${PORT}/api/load`);
    console.log(`  Leaderboard:GET  http://${getServerIP()}:${PORT}/api/leaderboard`);
});
