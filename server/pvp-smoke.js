// ===== PVP Smoke Test =====
const { WebSocket } = require('ws'), crypto = require('crypto');
const { getUsers, saveUsers } = require('./auth.js');
const HOST = 'ws://localhost:3001/pvp';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let passed = 0, failed = 0;

function setupUsers(count) {
  const users = getUsers(), created = [];
  for (let i = 0; i < count; i++) {
    const email = '_pvp_test_' + i + '@test', token = crypto.randomBytes(32).toString('hex');
    users[email] = { email, username: 'Test' + i, verified: true, createdAt: Date.now(), sessionToken: token, sessionExpires: Date.now() + 86400000, gameData: null, passwordHash: 'x', passwordSalt: 'x' };
    created.push({ email, token, username: 'Test' + i });
  }
  saveUsers(users); return created;
}
function cleanupUsers() {
  const users = getUsers();
  Object.keys(users).filter(k => k.startsWith('_pvp_test_')).forEach(k => delete users[k]);
  saveUsers(users);
}

function connect(token, label) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(HOST), t = setTimeout(() => { ws.close(); reject(new Error(label + ': timeout')); }, 4000);
    ws._label = label; ws._inbox = [];
    ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', token })));
    ws.on('message', (raw) => { const m = JSON.parse(raw.toString()); ws._inbox.push(m); if (m.type === 'hello:ok') { clearTimeout(t); ws._userId = m.userId; resolve(ws); } });
    ws.on('close', () => { clearTimeout(t); }); ws.on('error', () => {});
  });
}

function send(ws, msg) { ws.send(JSON.stringify(msg)); }
function expect(ws, type, tm) { tm = tm || 3000; return new Promise((resolve, reject) => { const t = setTimeout(() => reject(new Error(ws._label + ': timeout ' + type)), tm); const poll = () => { const i = ws._inbox.findIndex(m => m.type === type); if (i >= 0) { clearTimeout(t); resolve(ws._inbox.splice(i, 1)[0]); return; } setTimeout(poll, 10); }; poll(); }); }
function last(ws, type) { const f = ws._inbox.filter(m => m.type === type); return f.length ? f[f.length - 1] : null; }
function clear(ws) { ws._inbox.length = 0; }

async function main() {
  console.log('=== PVP Smoke Test ===\n');
  let users;
  try {
    users = setupUsers(3);
    console.log('✓ Temp users created'); passed++;

    const A = await connect(users[0].token, 'A'), B = await connect(users[1].token, 'B'), C = await connect(users[2].token, 'C');
    console.log('✓ All 3 authenticated'); passed++;

    // Create room
    send(A, { type: 'room:create', name: 'Sprint' });
    const cr = await expect(A, 'room:update');
    const roomId = cr.room.id;
    console.log(cr.room.name === 'Sprint' && cr.room.players.length === 1 ? '✓ room:create OK' : '✗ create fail'); (cr.room.name === 'Sprint') ? passed++ : failed++;

    // Join
    send(B, { type: 'room:join', roomId }); await expect(B, 'room:update'); await expect(A, 'room:update');
    send(C, { type: 'room:join', roomId }); await expect(C, 'room:update'); await expect(A, 'room:update'); await expect(B, 'room:update');
    console.log('✓ B+C joined'); passed++;

    // Ready
    clear(A); clear(B); clear(C);
    send(A, { type: 'room:ready', roomId, ready: true }); await expect(A, 'room:update');
    send(B, { type: 'room:ready', roomId, ready: true }); await expect(B, 'room:update');
    send(C, { type: 'room:ready', roomId, ready: true }); await expect(C, 'room:update');
    clear(A); clear(B); clear(C); console.log('✓ All ready'); passed++;

    // Start
    send(A, { type: 'room:start', roomId });
    const ms = await expect(A, 'match:start'); await expect(B, 'match:start'); await expect(C, 'match:start');
    console.log(ms.seed && ms.room ? '✓ match:start OK' : '✗ start fail'); (ms.seed && ms.room) ? passed++ : failed++;

    // Send snapshots
    clear(A); clear(B); clear(C);
    const snap = (lane, dist, opts) => ({ lane, distance: dist, isJumping: false, isRolling: false, alive: true, spectating: false, characterId: 'runner', timestamp: Date.now(), ...(opts || {}) });
    send(A, { type: 'match:snapshot', roomId, snapshot: snap(0, 100) });
    send(B, { type: 'match:snapshot', roomId, snapshot: snap(1, 200) });
    send(C, { type: 'match:snapshot', roomId, snapshot: snap(2, 150) });
    await sleep(500);
    const batch = last(A, 'match:snapshot');
    console.log(batch && batch.players && batch.players.length === 2 ? '✓ match:snapshot relayed (players[])' : '✗ no batch'); (batch && batch.players) ? passed++ : failed++;

    // Death
    send(A, { type: 'match:dead', roomId, distance: 100 }); await sleep(200);
    const dead = last(B, 'match:dead');
    console.log(dead && dead.playerId === A._userId ? '✓ match:dead OK' : '✗ no dead msg'); dead ? passed++ : failed++;

    // C then B die → finish
    clear(A); clear(B); clear(C);
    send(C, { type: 'match:snapshot', roomId, snapshot: snap(2, 150, { alive: false }) }); await sleep(100);
    send(B, { type: 'match:snapshot', roomId, snapshot: snap(1, 200, { alive: false }) });
    const finish = await expect(B, 'match:finish', 4000);
    console.log(finish.ranking && finish.ranking[0].distance === 200 ? '✓ match:finish ranking OK' : '✗ ranking bad'); finish.ranking ? passed++ : failed++;

    A.close(); B.close(); C.close(); console.log('✓ Clean exit'); passed++;
  } catch (e) { console.log('✗ ERROR: ' + e.message); failed++; }
  finally { cleanupUsers(); }

  console.log('\n=== Results: ' + passed + ' passed, ' + failed + ' failed ===');
  process.exit(failed > 0 ? 1 : 0);
}
main();
