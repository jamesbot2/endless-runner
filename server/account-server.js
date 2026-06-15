// ===== ENDLESS RUNNER - Account Server v3 =====
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { generateId, htmlEscape, atomicWriteFile } = require('./auth.js');

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
function saveUsers(users) { atomicWriteFile(USERS_FILE, users); }

function sanitizeAuditValue(val) {
  if (val === null || val === undefined) return null;
  if (Array.isArray(val)) return val.map(sanitizeAuditValue);
  if (typeof val === 'object') {
    var cleaned = {};
    var sensitive = ['passwordHash','passwordSalt','sessionToken','sessionExpires','token','salt','hash'];
    for (var k in val) {
      if (sensitive.indexOf(k) >= 0) continue;
      cleaned[k] = sanitizeAuditValue(val[k]);
    }
    return cleaned;
  }
  return val;
}


// ---- AUDIT LOG ----
const AUDIT_FILE = path.join(DATA_DIR, 'admin-audit.json');
function loadAuditLog() {
  try { return fs.existsSync(AUDIT_FILE) ? JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8')) : []; }
  catch { return []; }
}
function saveAuditLog(entries) { atomicWriteFile(AUDIT_FILE, entries); }
function addAuditLog(adminUser, action, targetEmail, before, after) {
  const log = loadAuditLog();
  log.push({ time: new Date().toISOString(), admin: adminUser, action, target: targetEmail, before: sanitizeAuditValue(before || null), after: sanitizeAuditValue(after || null) });
  if (log.length > 10000) log.splice(0, log.length - 10000);
  saveAuditLog(log);
}

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

function normalizeEmailInput(email) {
    return String(email || '')
        .trim()
        .replace(/\uFF20/g, '@')
        .replace(/[\u3002\uFF0E\uFF61]/g, '.')
        .replace(/[。．｡]/g, '.')
        .toLowerCase();
}

function findUserKeyByEmail(users, email) {
    var normalized = normalizeEmailInput(email);
    if (users[normalized]) return normalized;
    for (var key in users) {
        if (normalizeEmailInput(key) === normalized) return key;
    }
    return null;
}

function validateEmail(email) {
    email = normalizeEmailInput(email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        console.log('[VALIDATE EMAIL] Rejected (basic format): ' + email);
        return false;
    }
    var domain = email.split('@')[1];
    // Phone-number email usernames are valid for many providers (163.com, qq.com, etc.)
    // Reject disposable domains
    if (/@(test|example|fake|temp|dispostable|mailinator|guerrillamail|yopmail|10minute|trashmail|sharklasers|spam|mail|tempmail)\./i.test(email)) {
        console.log('[VALIDATE EMAIL] Rejected (disposable domain)');
        return false;
    }
    // Require valid TLD (2+ chars)
    if (!domain || domain.split('.').length < 2) {
        console.log('[VALIDATE EMAIL] Rejected (no valid TLD): ' + email);
        return false;
    }
    var tld = domain.split('.').pop();
    if (!tld || tld.length < 2) {
        console.log('[VALIDATE EMAIL] Rejected (short TLD): ' + email);
        return false;
    }
    console.log('[VALIDATE EMAIL] Accepted: ' + email);
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

function getMailTransport(toEmail) {
    var domain = String(toEmail || '').toLowerCase().split('@')[1] || '';

    // QQ email recipient → use QQ SMTP if configured
    if (domain === 'qq.com' && process.env.QQ_SMTP_USER && process.env.QQ_SMTP_PASS) {
        var qqUser = process.env.QQ_SMTP_USER || '';
        var qqPass = process.env.QQ_SMTP_PASS || '';
        var qqFrom = process.env.QQ_MAIL_FROM || '"Endless Runner" <' + qqUser + '>';
        return { provider: 'qq', host: 'smtp.qq.com', port: 465, secure: true, user: qqUser, pass: qqPass, fromMasked: qqFrom.replace(/:([^@]+)@/, ':***@'), from: qqFrom };
    }

    // Default: 163 SMTP or configured MAIL_PROVIDER
    var provider = (process.env.MAIL_PROVIDER || '163').trim().toLowerCase();
    var host = process.env.SMTP_HOST || '';
    var port = parseInt(process.env.SMTP_PORT, 10) || 465;
    var secure = process.env.SMTP_SECURE !== 'false';
    var user = process.env.SMTP_USER || '';
    var pass = process.env.SMTP_PASS || '';
    var from = process.env.MAIL_FROM || '';

    if (!host && provider === '163') host = 'smtp.163.com';
    if (!from && user) from = '"Endless Runner" <' + user + '>';

    return { provider, host, port, secure, user, pass, fromMasked: from.replace(/:([^@]+)@/, ':***@'), from: from };
}

function sendEmail(to, subject, body, htmlBody) {
    return new Promise(function(resolve) {
        var cfg = getMailTransport(to);
        var result = { ok: false, messageId: null, accepted: [], rejected: [], response: null, error: null };

        if (!cfg.user || !cfg.pass) {
            console.log('[EMAIL] No SMTP credentials configured (SMTP_USER/SMTP_PASS)');
            result.error = 'SMTP_CREDENTIALS_MISSING';
            resolve(result); return;
        }

        var mailOpts = {
            from: cfg.from,
            to: to,
            subject: subject,
            text: body
        };
        if (htmlBody) mailOpts.html = htmlBody;

        try {
            var nodemailer = require('nodemailer');
            var transporter = nodemailer.createTransport({
                host: cfg.host,
                port: cfg.port,
                secure: cfg.secure,
                auth: { user: cfg.user, pass: cfg.pass }
            });

            transporter.sendMail(mailOpts, function(err, info) {
                if (err) {
                    console.log('[EMAIL FAIL] to=' + to + ' provider=' + cfg.provider + ' host=' + cfg.host + ' err=' + err.message);
                    result.error = err.message;
                    resolve(result);
                } else {
                    result.ok = true;
                    result.messageId = info.messageId;
                    result.accepted = info.accepted || [];
                    result.rejected = info.rejected || [];
                    result.response = info.response || null;
                    console.log('[EMAIL SENT] to=' + to + ' provider=' + cfg.provider + ' id=' + info.messageId + ' accepted=' + JSON.stringify(result.accepted) + ' rejected=' + JSON.stringify(result.rejected) + ' response=' + (result.response || 'none'));
                    resolve(result);
                }
            });
        } catch(e) {
            console.log('[EMAIL EXCEPTION] to=' + to + ' provider=' + cfg.provider + ' err=' + e.message);
            result.error = e.message;
            resolve(result);
        }
    });
}

function httpGet(url) {
  return new Promise(function(resolve, reject) {
    var u = new URL(url);
    var opts = { hostname: u.hostname, port: u.port, path: u.pathname + u.search, method: 'GET', timeout: 3000 };
    var req = http.request(opts, function(res) {
      var data = '';
      res.on('data', function(c) { data += c; });
      res.on('end', function() { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    req.on('timeout', function() { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

function adminHTML() {
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Admin Dashboard - Endless Runner</title>' +
  '<style>' +
  '*{box-sizing:border-box;margin:0;padding:0}' +
  'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#1a1a2e;color:#e0e0e0;padding:16px;min-height:100vh}' +
  '.header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px}' +
  'h1{color:#ff6600;font-size:24px;font-weight:700}' +
  '.tabs{display:flex;gap:4px;background:#16213e;border-radius:8px;padding:4px}' +
  '.tab{padding:8px 18px;border-radius:6px;cursor:pointer;font-size:13px;color:#888;border:none;background:transparent;transition:all 0.2s}' +
  '.tab.active{background:#ff6600;color:#fff;font-weight:600}' +
  '.tab:hover{color:#fff}' +
  '.stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin-bottom:20px}' +
  '.stat-card{background:#16213e;border-radius:10px;padding:14px;border:1px solid #2a2a4a}' +
  '.stat-card .value{font-size:22px;font-weight:700;color:#ff6600}' +
  '.stat-card .label{font-size:11px;color:#888;margin-top:4px;text-transform:uppercase;letter-spacing:0.5px}' +
  '.controls{display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:center}' +
  '.search-wrap{flex:1;min-width:180px}' +
  '.search-wrap input{width:100%;padding:9px 14px;border-radius:8px;border:1px solid #333;background:#0d1b2a;color:#fff;font-size:13px;outline:none}' +
  '.search-wrap input:focus{border-color:#ff6600}' +
  'select{padding:8px 12px;border-radius:8px;border:1px solid #333;background:#0d1b2a;color:#fff;font-size:12px;outline:none}' +
  '.filter-chips{display:flex;gap:6px;flex-wrap:wrap;width:100%;margin-bottom:16px}' +
  '.chip{padding:5px 14px;border-radius:20px;border:1px solid #333;background:transparent;color:#888;cursor:pointer;font-size:12px;transition:all 0.2s}' +
  '.chip.active{background:#ff6600;border-color:#ff6600;color:#fff}' +
  '.chip:hover{border-color:#ff6600;color:#fff}' +
  '.table-wrap{overflow-x:auto;border-radius:10px;border:1px solid #2a2a4a}' +
  'table{width:100%;border-collapse:collapse;font-size:12px}' +
  'th{background:#16213e;color:#ffd700;padding:10px 8px;text-align:left;font-weight:600;white-space:nowrap;position:sticky;top:0;z-index:1}' +
  'td{padding:8px;border-bottom:1px solid #222;white-space:nowrap}' +
  'tr:hover{background:#0f3460}' +
  '.badge{padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600}' +
  '.badge-green{background:#1b5e20;color:#81c784}' +
  '.badge-red{background:#b71c1c;color:#ef9a9a}' +
  '.badge-yellow{background:#f57f17;color:#ffe082}' +
  '.btn{padding:5px 10px;border-radius:6px;border:none;cursor:pointer;font-size:11px;font-weight:500;transition:opacity 0.2s;color:#fff}' +
  '.btn:hover{opacity:0.85}' +
  '.btn-sm{padding:3px 8px;font-size:10px}' +
  '.btn-orange{background:#ff6600}' +
  '.btn-red{background:#d32f2f}' +
  '.btn-green{background:#388e3c}' +
  '.btn-blue{background:#1976d2}' +
  '.btn-purple{background:#7b1fa2}' +
  '.actions{display:flex;gap:3px;flex-wrap:wrap}' +
  '#msg{padding:10px 14px;border-radius:8px;margin-bottom:12px;display:none;font-size:13px}' +
  '#msg.info{background:#0d47a1;color:#90caf9;display:block}' +
  '#msg.err{background:#b71c1c;color:#ef9a9a;display:block}' +
  '#msg.ok{background:#1b5e20;color:#81c784;display:block}' +
  '.modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:999;display:flex;align-items:center;justify-content:center;padding:20px}' +
  '.modal{background:#16213e;border-radius:12px;padding:24px;max-width:650px;width:100%;max-height:80vh;overflow-y:auto;border:1px solid #2a2a4a}' +
  '.modal h2{color:#ff6600;margin-bottom:16px;font-size:18px}' +
  '.modal .field{margin-bottom:12px}' +
  '.modal .field label{display:block;font-size:11px;color:#888;margin-bottom:3px}' +
  '.modal .field input,.modal .field select{width:100%;padding:8px 10px;border-radius:6px;border:1px solid #333;background:#0d1b2a;color:#fff;font-size:13px;outline:none}' +
  '.modal .field input:focus{border-color:#ff6600}' +
  '.modal .btn-row{display:flex;gap:8px;margin-top:16px}' +
  '.section{display:none}' +
  '.section.active{display:block}' +
  '.pvp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}' +
  '.pvp-card{background:#16213e;border-radius:10px;padding:14px;border:1px solid #2a2a4a}' +
  '.pvp-card h3{color:#ff6600;font-size:15px;margin-bottom:8px}' +
  '.pvp-card .info{font-size:12px;color:#aaa;margin:3px 0}' +
  '.pvp-card .players{display:flex;gap:4px;flex-wrap:wrap;margin-top:8px}' +
  '.pvp-card .players span{padding:2px 8px;border-radius:4px;background:#0d1b2a;font-size:11px}' +
  '.loader{text-align:center;padding:40px;color:#555}' +
  '.loader:after{content:"...";animation:dots 1.5s infinite}' +
  '@keyframes dots{0%,20%{content:"."}40%{content:".."}60%,100%{content:"..."}}' +
  '@media(max-width:600px){body{padding:10px}h1{font-size:20px}.stats{grid-template-columns:repeat(2,1fr)}.stat-card{padding:10px}.stat-card .value{font-size:18px}.controls{flex-direction:column}.search-wrap{min-width:100%}}' +
  '</style></head><body>' +
  '<div class="header"><h1>🚄 Endless Runner Admin</h1><a href="/verify-codes" style="color:#ffaa00;font-size:13px;">Verification Codes</a></div>' +
  '<div id="msg"></div>' +
  '<div class="tabs"><button class="tab active" data-tab="users">Users</button><button class="tab" data-tab="pvp">PVP</button><button class="tab" data-tab="audit">Audit Log</button></div>' +
  '<div id="tab-users" class="section active">' +
  '<div class="stats" id="statsRow"></div>' +
  '<div class="controls">' +
  '<div class="search-wrap"><input type="text" id="searchInput" placeholder="Search by email or username..."></div>' +
  '<select id="sortSelect"><option value="createdAt">Created</option><option value="lastLoginAt">Last Login</option><option value="credits">Credits</option><option value="coins">Coins</option><option value="maxDistance" selected>Max Distance</option><option value="runCount">Runs</option></select>' +
  '<select id="orderSelect"><option value="desc">Desc</option><option value="asc">Asc</option></select>' +
  '</div>' +
  '<div class="filter-chips" id="filterChips">' +
  '<span class="chip active" data-filter="">All</span><span class="chip" data-filter="verified">Verified</span><span class="chip" data-filter="unverified">Unverified</span><span class="chip" data-filter="banned">Banned</span><span class="chip" data-filter="active">Active</span><span class="chip" data-filter="hasPvp">Has PVP</span><span class="chip" data-filter="noPvp">No PVP</span>' +
  '</div>' +
  '<div class="table-wrap"><table><thead><tr><th>Email</th><th>Username</th><th>Verified</th><th>Banned</th><th>Created</th><th>Coins</th><th>Credits</th><th>Max</th><th>Runs</th><th>Abilities</th><th>Character</th><th>Actions</th></tr></thead><tbody id="userTableBody"><tr><td colspan="12" class="loader">Loading</td></tr></tbody></table></div>' +
  '</div>' +
  '<div id="tab-pvp" class="section"><h2 style="color:#ff6600;font-size:18px;margin-bottom:14px">PVP Rooms</h2><div id="pvpContent"><p class="loader">Loading</p></div></div>' +
  '<div id="tab-audit" class="section"><h2 style="color:#ff6600;font-size:18px;margin-bottom:14px">Audit Log</h2><div class="table-wrap"><table><thead><tr><th>Time</th><th>Admin</th><th>Action</th><th>Target</th></tr></thead><tbody id="auditBody"><tr><td colspan="4" class="loader">Loading</td></tr></tbody></table></div></div>' +
  '<div id="editModal" class="modal-overlay" style="display:none">' +
  '<div class="modal"><h2 id="modalTitle">Edit User</h2>' +
  '<div class="field"><label>Username</label><input id="editUsername" type="text"></div>' +
  '<div class="field"><label>Coins</label><input id="editCoins" type="number"></div>' +
  '<div class="field"><label>Credits</label><input id="editCredits" type="number"></div>' +
  '<div class="field"><label>Run Count</label><input id="editRunCount" type="number"></div>' +
  '<div class="field"><label>Max Distance</label><input id="editMaxDistance" type="number"></div>' +
  '<div class="field"><label>Max Easy</label><input id="editMaxEasy" type="number"></div>' +
  '<div class="field"><label>Max Medium</label><input id="editMaxMedium" type="number"></div>' +
  '<div class="field"><label>Max Hard</label><input id="editMaxHard" type="number"></div>' +
  '<div class="field"><label>Equipped Ability (0=None,1=Double,2=Jetpack,3=Roof)</label><input id="editEquippedAbility" type="number"></div>' +
  '<div class="field"><label>Owned Abilities (comma separated numbers)</label><input id="editOwnedAbilities" type="text"></div>' +
  '<div class="field"><label>Owned Characters (comma separated)</label><input id="editOwnedCharacters" type="text"></div>' +
  '<div class="field"><label>Selected Character</label><input id="editSelectedCharacter" type="text"></div>' +
  '<div class="btn-row"><button class="btn btn-green" id="saveEditBtn">Save</button><button class="btn btn-red" id="cancelEditBtn">Cancel</button></div>' +
  '</div></div>' +
  '<script src="/admin.js"></script>' +
  '</body></html>';
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


    // ---- ADMIN JS ----
    if (pathname === '/admin.js' && method === 'GET') {
        if (!checkAdminAuth(req.headers)) {
            res.writeHead(401, { 'Content-Type': 'text/plain', 'WWW-Authenticate': 'Basic realm="Endless Runner Admin"' });
            res.end('401 Unauthorized');
            return;
        }
        const adminJsPath = path.join(__dirname, 'public', 'admin.js');
        try {
            const jsContent = fs.readFileSync(adminJsPath, 'utf8');
            res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
            res.end(jsContent);
        } catch(e) {
            res.writeHead(404);
            res.end('Not found');
        }
        return;
    }

    // ---- NEW ADMIN HTML PANEL ----
    if (pathname === '/admin' && method === 'GET') {
        if (!checkAdminAuth(req.headers)) {
            res.writeHead(401, { 'Content-Type': 'text/html', 'WWW-Authenticate': 'Basic realm="Endless Runner Admin"' });
            res.end('<h1>401 Unauthorized</h1><p>Admin access requires login.</p>');
            return;
        }
        sendHTML(res, adminHTML());
        return;
    }

    // ---- ADMIN API ENDPOINTS ----

    // GET /api/admin/stats
    if (pathname === '/api/admin/stats' && method === 'GET') {
        if (!checkAdminAuth(req.headers)) { sendJSON(res, 401, { error: 'Admin auth required' }); return; }
        const users = getUsers();
        const vals = Object.values(users);
        const today = new Date(); today.setHours(0,0,0,0);
        const todayTs = today.getTime();
        let totalRuns = 0, highestDistance = 0, totalCredits = 0, totalCoins = 0;
        let todayReg = 0, verified = 0, banned = 0;
        for (const u of vals) {
            if (u.verified) verified++;
            if (u.banned) banned++;
            if (u.createdAt >= todayTs) todayReg++;
            const g = normalizeGameData(u.gameData);
            totalRuns += g.runCount || 0;
            highestDistance = Math.max(highestDistance, g.maxDistance || 0);
            totalCredits += g.credits || 0;
            totalCoins += g.coins || 0;
        }
        sendJSON(res, 200, { totalUsers: vals.length, verifiedUsers: verified, bannedUsers: banned, todayRegistrations: todayReg, totalRuns, highestDistance, totalCredits, totalCoins });
        return;
    }

    // GET /api/admin/users?search=&sort=&order=&filter=
    if (pathname === '/api/admin/users' && method === 'GET') {
        if (!checkAdminAuth(req.headers)) { sendJSON(res, 401, { error: 'Admin auth required' }); return; }
        const search = (parsedUrl.searchParams.get('search') || '').toLowerCase();
        const sort = parsedUrl.searchParams.get('sort') || 'createdAt';
        const order = parsedUrl.searchParams.get('order') || 'desc';
        const filter = parsedUrl.searchParams.get('filter') || '';
        const users = getUsers();
        let list = Object.entries(users).map(function(e) {
            const u = e[1];
            const g = normalizeGameData(u.gameData);
            return { email: u.email, username: u.username, verified: !!u.verified, banned: !!u.banned, createdAt: u.createdAt || 0, lastLoginAt: u.lastLoginAt || 0, gameData: g, hasPvpData: !!u.pvpData };
        });
        // Filter
        if (search) list = list.filter(function(u) { return u.email.toLowerCase().indexOf(search) >= 0 || (u.username || '').toLowerCase().indexOf(search) >= 0; });
        if (filter === 'verified') list = list.filter(function(u) { return u.verified; });
        else if (filter === 'unverified') list = list.filter(function(u) { return !u.verified; });
        else if (filter === 'banned') list = list.filter(function(u) { return u.banned; });
        else if (filter === 'active') list = list.filter(function(u) { return u.lastLoginAt > 0 && u.lastLoginAt > Date.now() - 7 * 24 * 60 * 60 * 1000; });
        else if (filter === 'hasPvp') list = list.filter(function(u) { return u.hasPvpData; });
        else if (filter === 'noPvp') list = list.filter(function(u) { return !u.hasPvpData; });
        // Sort
        var sortField = ['createdAt', 'lastLoginAt', 'credits', 'coins', 'maxDistance', 'runCount'].indexOf(sort) >= 0 ? sort : 'createdAt';
        list.sort(function(a, b) {
            var va = sortField === 'credits' ? a.gameData.credits : sortField === 'coins' ? a.gameData.coins : sortField === 'maxDistance' ? a.gameData.maxDistance : sortField === 'runCount' ? a.gameData.runCount : sortField === 'lastLoginAt' ? a.lastLoginAt : a.createdAt;
            var vb = sortField === 'credits' ? b.gameData.credits : sortField === 'coins' ? b.gameData.coins : sortField === 'maxDistance' ? b.gameData.maxDistance : sortField === 'runCount' ? b.gameData.runCount : sortField === 'lastLoginAt' ? b.lastLoginAt : b.createdAt;
            return order === 'asc' ? va - vb : vb - va;
        });
        sendJSON(res, 200, list);
        return;
    }

    // GET /api/admin/user?email=xxx
    if (pathname === '/api/admin/user' && method === 'GET') {
        if (!checkAdminAuth(req.headers)) { sendJSON(res, 401, { error: 'Admin auth required' }); return; }
        const email = normalizeEmailInput(parsedUrl.searchParams.get('email'));
        if (!email) { sendJSON(res, 400, { error: 'Email required' }); return; }
        const users = getUsers();
        const userKey = findUserKeyByEmail(users, email);
        const u = userKey ? users[userKey] : null;
        if (!u) { sendJSON(res, 404, { error: 'User not found' }); return; }
        const g = normalizeGameData(u.gameData);
        sendJSON(res, 200, { email: u.email, username: u.username, verified: !!u.verified, banned: !!u.banned, createdAt: u.createdAt || 0, lastLoginAt: u.lastLoginAt || 0, gameData: g, hasPvpData: !!u.pvpData });
        return;
    }

    // POST /api/admin/user/update
    if (pathname === '/api/admin/user/update' && method === 'POST') {
        if (!checkAdminAuth(req.headers)) { sendJSON(res, 401, { error: 'Admin auth required' }); return; }
        const body = await parseBody(req);
        const email = normalizeEmailInput(body.email);
        if (!email) { sendJSON(res, 400, { error: 'Email required' }); return; }
        const users = getUsers();
        const userKey = findUserKeyByEmail(users, email);
        const u = userKey ? users[userKey] : null;
        if (!u) { sendJSON(res, 404, { error: 'User not found' }); return; }
        const before = JSON.parse(JSON.stringify(u));
        const existing = normalizeGameData(u.gameData);
        if (body.gameData) {
            const gd = body.gameData;
            // Validate ownedAbilities
            if (gd.ownedAbilities !== undefined) {
                if (!Array.isArray(gd.ownedAbilities) || !gd.ownedAbilities.every(function(x) { return typeof x === 'number' && x >= 0; })) {
                    sendJSON(res, 400, { error: 'ownedAbilities must be an array of non-negative numbers' }); return;
                }
            }
            // Validate ownedCharacters
            if (gd.ownedCharacters !== undefined) {
                if (!Array.isArray(gd.ownedCharacters) || !gd.ownedCharacters.every(function(x) { return typeof x === 'string'; })) {
                    sendJSON(res, 400, { error: 'ownedCharacters must be an array of strings' }); return;
                }
                if (gd.ownedCharacters.indexOf('runner') < 0) {
                    gd.ownedCharacters.unshift('runner');
                }
            }
            // Validate selectedCharacter
            var oc = gd.ownedCharacters || existing.ownedCharacters;
            if (gd.selectedCharacter !== undefined && oc.indexOf(gd.selectedCharacter) < 0) {
                gd.selectedCharacter = 'runner';
            }
            // Validate numeric fields non-negative
            ['credits','coins','runCount','maxDistance','maxEasy','maxMedium','maxHard','maxEasyAbility','maxMediumAbility','maxHardAbility','equippedAbility'].forEach(function(f) {
                if (gd[f] !== undefined && (typeof gd[f] !== 'number' || gd[f] < 0)) gd[f] = 0;
            });
            u.gameData = normalizeGameData(Object.assign({}, existing, gd));
        } else if (body.field !== undefined && body.value !== undefined) {
            // Simple field update
            if (body.field === 'username') u.username = String(body.value);
            else if (body.field === 'verified') u.verified = !!body.value;
            else if (body.field === 'banned') u.banned = !!body.value;
            else { sendJSON(res, 400, { error: 'Unknown field: ' + body.field }); return; }
        } else {
            sendJSON(res, 400, { error: 'Provide gameData or field+value' }); return;
        }
        saveUsers(users);
        const after = JSON.parse(JSON.stringify(u));
        addAuditLog('admin', 'update', email, before, after);
        const g = normalizeGameData(u.gameData);
        sendJSON(res, 200, { success: true, email: u.email, username: u.username, verified: !!u.verified, banned: !!u.banned, gameData: g });
        return;
    }

    // POST /api/admin/user/action
    if (pathname === '/api/admin/user/action' && method === 'POST') {
        if (!checkAdminAuth(req.headers)) { sendJSON(res, 401, { error: 'Admin auth required' }); return; }
        const body = await parseBody(req);
        const email = normalizeEmailInput(body.email);
        const { action } = body;
        if (!email || !action) { sendJSON(res, 400, { error: 'Email and action required' }); return; }
        const users = getUsers();
        const userKey = findUserKeyByEmail(users, email);
        const u = userKey ? users[userKey] : null;
        if (!u && action !== 'delete') { sendJSON(res, 404, { error: 'User not found' }); return; }
        const before = u ? JSON.parse(JSON.stringify(u)) : null;
        switch (action) {
            case 'verify':
                u.verified = true;
                saveUsers(users);
                break;
            case 'unverify':
                u.verified = false;
                saveUsers(users);
                break;
            case 'ban':
                if (!body.confirm) { sendJSON(res, 400, { error: 'confirm:true required for dangerous action' }); return; }
                u.banned = true;
                saveUsers(users);
                break;
            case 'unban':
                if (!body.confirm) { sendJSON(res, 400, { error: 'confirm:true required for dangerous action' }); return; }
                u.banned = false;
                saveUsers(users);
                break;
            case 'reset-password': {
                if (!body.confirm) { sendJSON(res, 400, { error: 'confirm:true required for dangerous action' }); return; }
                const np = body.newPassword;
                if (!np || np.length < 4) { sendJSON(res, 400, { error: 'newPassword required (min 4 chars)' }); return; }
                const { hash, salt } = hashPassword(np);
                u.passwordHash = hash;
                u.passwordSalt = salt;
                saveUsers(users);
                break;
            }
            case 'clear-save':
                if (!body.confirm) { sendJSON(res, 400, { error: 'confirm:true required for dangerous action' }); return; }
                u.gameData = defaultGameData();
                saveUsers(users);
                break;
            case 'grant-all-abilities':
                if (!body.confirm) { sendJSON(res, 400, { error: 'confirm:true required for dangerous action' }); return; }
                u.gameData = normalizeGameData(Object.assign({}, u.gameData, { ownedAbilities: [0,1,2,3], equippedAbility: 2 }));
                saveUsers(users);
                break;
            case 'grant-all-characters':
                if (!body.confirm) { sendJSON(res, 400, { error: 'confirm:true required for dangerous action' }); return; }
                u.gameData = normalizeGameData(Object.assign({}, u.gameData, { ownedCharacters: ['runner','adventurer','beach','casual2','hoodie','farmer','king','punk','spacesuit','suit','swat','worker'] }));
                saveUsers(users);
                break;
            case 'reset-leaderboard':
                if (!body.confirm) { sendJSON(res, 400, { error: 'confirm:true required for dangerous action' }); return; }
                u.gameData = normalizeGameData(Object.assign({}, u.gameData, { maxDistance: 0, maxEasy: 0, maxMedium: 0, maxHard: 0, maxEasyAbility: 0, maxMediumAbility: 0, maxHardAbility: 0, highScore: 0, runCount: 0 }));
                saveUsers(users);
                break;
            case 'delete':
                if (!body.confirm) { sendJSON(res, 400, { error: 'confirm: true required to delete' }); return; }
                if (!userKey) { sendJSON(res, 404, { error: 'User not found' }); return; }
                delete users[userKey];
                saveUsers(users);
                console.log('[ADMIN] Deleted user: ' + email);
                addAuditLog('admin', 'delete', email, before, null);
                sendJSON(res, 200, { success: true, message: 'User deleted' });
                return;
            default:
                sendJSON(res, 400, { error: 'Unknown action: ' + action }); return;
        }
        const after = JSON.parse(JSON.stringify(users[userKey]));
        addAuditLog('admin', action, email, before, after);
        const g = normalizeGameData(users[userKey].gameData);
        sendJSON(res, 200, { success: true, email: u.email, username: u.username, verified: !!u.verified, banned: !!u.banned, gameData: g });
        return;
    }

    // GET /api/admin/audit
    if (pathname === '/api/admin/audit' && method === 'GET') {
        if (!checkAdminAuth(req.headers)) { sendJSON(res, 401, { error: 'Admin auth required' }); return; }
        var limit = parseInt(parsedUrl.searchParams.get('limit'), 10) || 200;
        if (limit > 5000) limit = 5000;
        const log = loadAuditLog();
        sendJSON(res, 200, log.slice(-limit).map(function(e) { return { time: e.time, admin: e.admin, action: e.action, target: e.target, before: sanitizeAuditValue(e.before), after: sanitizeAuditValue(e.after) }; }));
        return;
    }

    // ---- ADMIN: TEST EMAIL ----
    // ---- ADMIN: TEST EMAIL ----
    // ---- ADMIN: TEST EMAIL ----
    if (pathname === '/api/admin-test-email' && method === 'POST') {
        if (!checkAdminAuth(req.headers)) { sendJSON(res, 401, { error: 'Admin auth required' }); return; }
        const body = await parseBody(req);
        const to = normalizeEmailInput(body.email || '');
        if (!to) { sendJSON(res, 400, { error: 'Email required' }); return; }
        const mockMode = process.env.MOCK_EMAIL_SEND === 'true' || process.env.SKIP_EMAIL_SEND === 'true';
        if (mockMode) {
            sendJSON(res, 200, { ok: true, messageId: 'mock-' + Date.now(), accepted: [to], rejected: [], response: 'mock', error: null, provider: 'mock', mailFrom: 'mock' });
            return;
        }
        var cfg = getMailTransport(to);
        if (!cfg.user) {
            sendJSON(res, 200, { ok: false, messageId: null, accepted: [], rejected: [], response: null, error: 'SMTP_CREDENTIALS_MISSING', provider: cfg.provider, mailFrom: cfg.fromMasked });
            return;
        }
        var result = await sendEmail(to,
            'Endless Runner - Diagnostic Test Email',
            'This is a diagnostic test email from the Endless Runner admin panel.\n\nIf you received this, SMTP delivery to this address is working.\n\nSent at: ' + new Date().toISOString(),
            '<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:20px;background:#1a1a2e;color:#e0e0e0;border-radius:12px;">' +
            '<h2 style="color:#ff6600;margin:0 0 16px;">\u260a\ufe0f Endless Runner - Diagnostic Email</h2>' +
            '<p style="font-size:14px;color:#aaa;">If you received this, SMTP delivery to this address is working.</p>' +
            '<p style="font-size:12px;color:#555;">Sent at: ' + new Date().toISOString() + '</p></div>'
        );
        result.provider = cfg.provider;
        result.mailFrom = cfg.fromMasked;
        result.host = cfg.host + ':' + cfg.port;
        console.log('[ADMIN TEST EMAIL] to=' + to + ' ok=' + result.ok + ' id=' + (result.messageId || 'none') + ' accepted=' + JSON.stringify(result.accepted));
        sendJSON(res, 200, result);
        return;
    }

    if (pathname === '/api/admin/pvp/status' && method === 'GET') {
        if (!checkAdminAuth(req.headers)) { sendJSON(res, 401, { error: 'Admin auth required' }); return; }
        var pvpData = httpGet('http://127.0.0.1:3001/admin/pvp-status').then(function(d) {
            sendJSON(res, 200, d);
        }).catch(function() {
            sendJSON(res, 200, { error: 'PVP server offline', rooms: 0, players: 0, roomsList: [] });
        });
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
        const { email: rawEmail, password, username, captchaId, captchaAnswer } = body;
        const email = normalizeEmailInput(rawEmail);

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

        if (findUserKeyByEmail(users, email)) { sendJSON(res, 409, { error: 'Email already registered' }); return; }

        // Generate verification code
        const code = generateCode();

        // Send verification email FIRST - only create account if email succeeds
        var emailResult = { ok: false };
        const mockMode = process.env.MOCK_EMAIL_SEND === 'true' || process.env.SKIP_EMAIL_SEND === 'true';
        try {
            if (mockMode) {
                emailResult = { ok: true, messageId: 'mock-' + Date.now(), accepted: [email], rejected: [], response: 'mock', error: null };
                console.log('[EMAIL MOCK] Simulated success for ' + email);
            } else {
                var emailSubject = 'Endless Runner \u9a8c\u8bc1\u7801\uff1a' + code;
                var emailText = '\u60a8\u7684 Endless Runner \u8d26\u53f7\u9a8c\u8bc1\u7801\u4e3a\uff1a' + code + '\n\n' +
                    '\u9a8c\u8bc1\u7801\uff1a' + code + '\n' +
                    '\u6709\u6548\u65f6\u95f4\uff1a10 \u5206\u949f\n\n' +
                    '\u5982\u679c\u4e0d\u662f\u60a8\u672c\u4eba\u64cd\u4f5c\uff0c\u8bf7\u5ffd\u7565\u6b64\u90ae\u4ef6\u3002';
                var emailHtml = '<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:20px;background:#1a1a2e;color:#e0e0e0;border-radius:12px;">' +
                    '<h2 style="color:#ff6600;margin:0 0 16px;font-size:20px;">\u260a\ufe0f Endless Runner</h2>' +
                    '<p style="font-size:14px;color:#aaa;margin:0 0 20px;">\u60a8\u7684\u8d26\u53f7\u9a8c\u8bc1\u7801</p>' +
                    '<div style="text-align:center;background:#0d1b2a;border-radius:10px;padding:20px;margin:20px 0;border:1px solid #2a2a4a;">' +
                    '<span style="font-size:42px;font-weight:bold;color:#ff6600;letter-spacing:8px;">' + code + '</span></div>' +
                    '<p style="font-size:13px;color:#888;margin:8px 0;">\u9a8c\u8bc1\u7801\u6709\u6548\u65f6\u95f4\uff1a10 \u5206\u949f</p>' +
                    '<hr style="border:none;border-top:1px solid #2a2a4a;margin:20px 0;">' +
                    '<p style="font-size:12px;color:#555;margin:0;">\u5982\u679c\u4e0d\u662f\u60a8\u672c\u4eba\u64cd\u4f5c\uff0c\u8bf7\u5ffd\u7565\u6b64\u90ae\u4ef6\u3002</p></div>';
                emailResult = await sendEmail(email, emailSubject, emailText, emailHtml);
                console.log('[REGISTER EMAIL] to=' + email + ' ok=' + emailResult.ok + ' id=' + (emailResult.messageId || 'none'));
            }
        } catch(e) {
            console.log('[REGISTER EMAIL EXCEPTION] ' + e.message);
            emailResult = { ok: false, error: e.message };
        }

        if (!emailResult.ok) {
            var errMsg = emailResult.error || 'unknown';
            sendJSON(res, 502, { error: 'Verification email could not be sent. Error: ' + errMsg + '. Please try another email address or contact support.' });
            return;
        }

        // Only save user + verification code after successful email
        verifyCodes[email] = { code, expires: Date.now() + 10 * 60 * 1000 }; // 10 min expiry
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

        sendJSON(res, 201, {
            message: 'Verification code sent to ' + email + '. Check your inbox. If using QQ email and not received, please check spam folder or wait 5-30 minutes.',
            emailSent: true
        });
        return;
    }

    // ---- VERIFY CODE ----
    if (pathname === '/api/verify-code' && method === 'POST') {
        const body = await parseBody(req);
        const { code } = body;
        const email = normalizeEmailInput(body.email);

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
        const userKey = findUserKeyByEmail(users, email);
        if (userKey) {
            users[userKey].verified = true;
            saveUsers(users);
        }

        console.log('[VERIFIED] ' + email);
        sendJSON(res, 200, { message: 'Email verified! You can now log in.' });
        return;
    }

    // ---- LOGIN ----
    if (pathname === '/api/login' && method === 'POST') {
        const body = await parseBody(req);
        const email = normalizeEmailInput(body.email);
        const { password } = body;

        const users = getUsers();
        const userKey = findUserKeyByEmail(users, email);
        const user = userKey ? users[userKey] : null;
        if (!user || !verifyPassword(password, user.passwordHash, user.passwordSalt)) {
            sendJSON(res, 401, { error: 'Invalid email or password' });
            return;
        }
        if (!user.verified) {
            sendJSON(res, 403, { error: 'Please verify your email first (check code)' });
            return;
        }
        if (user.banned) { sendJSON(res, 403, { error: 'Account is banned. Contact support.' }); return; }

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
        const email = normalizeEmailInput(getAuthUser(req.headers) || '');
        if (!email) { sendJSON(res, 401, { error: 'Not authenticated' }); return; }

        const body = await parseBody(req);
        const users = getUsers();
        const userKey = findUserKeyByEmail(users, email);
        if (!userKey) { sendJSON(res, 404, { error: 'User not found' }); return; }

        var gd = body.gameData || {};
        var existing = normalizeGameData(users[userKey].gameData);
        gd = normalizeGameData(gd);
        users[userKey].gameData = {
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
        sendJSON(res, 200, { message: 'Saved', gameData: normalizeGameData(users[userKey].gameData) });
        return;
    }

    // ---- LOAD ----
    if (pathname === '/api/load' && method === 'GET') {
        const email = normalizeEmailInput(getAuthUser(req.headers) || '');
        if (!email) { sendJSON(res, 401, { error: 'Not authenticated' }); return; }
        const users = getUsers();
        const userKey = findUserKeyByEmail(users, email);
        if (!userKey) { sendJSON(res, 404, { error: 'User not found' }); return; }
        sendJSON(res, 200, { gameData: normalizeGameData(users[userKey].gameData) });
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


    sendJSON(res, 404, { error: 'Not found' });
}

const server = http.createServer(handleRequest);
server.listen(PORT, '0.0.0.0', () => {
    console.log('✓ Account server v3 running on port ' + PORT);
    console.log('  API:  http://' + getServerIP() + ':3000/');
    console.log('  Admin: http://' + getServerIP() + ':3000/admin');
    console.log('  Codes: http://' + getServerIP() + ':3000/verify-codes');
});
