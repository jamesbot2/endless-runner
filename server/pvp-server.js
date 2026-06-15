// ===== ENDLESS RUNNER - PVP Server =====
const http = require('http'); const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const { validateToken } = require('./auth.js');

const PORT = parseInt(process.env.PVP_PORT, 10) || 3001;
const MAX_PLAYERS = 3, SNAPSHOT_INTERVAL = 50, MAX_SPEED_MPS = 100, MIN_GRACE = 5;
const LANES = [0,1,2], START_OFFSETS = [0,-4,-8];

const onlineUsers = new Map(); const clients = new Map();
const rooms = new Map(); const snapshotTimers = new Map();
let nextRoomId = 1;

function send(ws, data) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(data)); }
function broadcast(list, data, excludeWs) { const m = JSON.stringify(data); for (const [,p] of list) if (p.ws !== excludeWs && p.ws.readyState === 1) p.ws.send(m); }
function shuffle(a) { for (let i=a.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function requireAuth(ws) { const uid = clients.get(ws); if (!uid) send(ws, {type:'error',error:'not authenticated'}); return uid; }
function findRoomByUser(uid) { for (const r of rooms.values()) if (r.players.has(uid)) return r; return null; }

function roomToPublic(room) {
  const ps = []; for (const [,p] of room.players) ps.push({id:p.id,name:p.name,ready:p.ready,lane:p.lane,characterId:p.characterId,alive:p.alive,distance:Math.floor(p.distance)});
  return {id:room.id,name:room.name,host:room.host,hostId:room.hostId,players:ps,maxPlayers:room.maxPlayers,status:room.status,seed:room.seed,createdAt:room.createdAt};
}

function broadcastRoomList() {
  const list = []; for (const r of rooms.values()) if (r.status === 'waiting') list.push({id:r.id,name:r.name,host:r.host,hostId:r.hostId,playerCount:r.players.size,maxPlayers:r.maxPlayers,status:r.status});
  for (const [ws] of clients) if (ws.readyState === 1) send(ws, {type:'room:list',rooms:list});
}

function broadcastRoomUpdate(room) { broadcast(room.players, {type:'room:update',room:roomToPublic(room)}); broadcastRoomList(); }

function aliveCount(room) { let c=0; for (const [,p] of room.players) if (p.alive && !p.forfeit) c++; return c; }
function allDone(room) { for (const [,p] of room.players) if (p.alive && !p.forfeit) return false; return true; }

function resetRoomForLobby(room) {
  stopSnapshotBroadcast(room.id);
  room.status = 'waiting'; room.seed = null; room.startedPlayers = new Set();
  for (const [,p] of room.players) { p.ready=false; p.alive=true; p.distance=0; p.forfeit=false; p.snapshot=null; p.snapshotTime=0; p.lane=-1; }
}

function endMatch(room) {
  if (room.status === 'finished') return; room.status = 'finished'; stopSnapshotBroadcast(room.id);
  const ranking = []; for (const uid of room.startedPlayers||new Set()) { const p=room.players.get(uid); ranking.push({name:p?p.name:'disconnected',distance:p?Math.floor(p.distance):0}); }
  ranking.sort((a,b)=>b.distance-a.distance); broadcast(room.players, {type:'match:finish',roomId:room.id,ranking});
  resetRoomForLobby(room);
  broadcastRoomUpdate(room);
}

function startSnapshotBroadcast(room) {
  if (snapshotTimers.has(room.id)) return;
  snapshotTimers.set(room.id, setInterval(() => {
    const r = rooms.get(room.id); if (!r || r.status !== 'running') { stopSnapshotBroadcast(room.id); return; }
    for (const [,player] of r.players) {
      if (player.ws.readyState !== 1) continue;
      const others = [];
      for (const [,other] of r.players) { if (other.id===player.id||!other.snapshot) continue; others.push({id:other.id,name:other.name,lane:other.snapshot.lane,distance:other.snapshot.distance,isJumping:other.snapshot.isJumping,isRolling:other.snapshot.isRolling,alive:other.snapshot.alive,spectating:other.snapshot.spectating,characterId:other.snapshot.characterId,timestamp:other.snapshot.timestamp}); }
      if (others.length) send(player.ws, {type:'match:snapshot',players:others});
    }
  }, SNAPSHOT_INTERVAL));
}
function stopSnapshotBroadcast(rid) { const t=snapshotTimers.get(rid); if(t){clearInterval(t);snapshotTimers.delete(rid);} }

function removeUserFromRoom(roomId, userId) {
  const room = rooms.get(roomId); if (!room) return;
  if (room.status === 'running') { const p=room.players.get(userId); if(p){p.forfeit=true;p.alive=false;if(aliveCount(room)<=1)endMatch(room);broadcastRoomUpdate(room);} return; }
  room.players.delete(userId);
  if (room.players.size===0) { stopSnapshotBroadcast(roomId); rooms.delete(roomId); broadcastRoomList(); return; }
  if (room.hostId===userId) { const f=room.players.values().next().value; if(f){room.hostId=f.id;room.host=f.name;} }
  broadcastRoomUpdate(room);
}
function cleanupUser(uid) { for (const [rid,r] of rooms) if (r.players.has(uid)) { removeUserFromRoom(rid,uid); return; } }

const handlers = {};

handlers.hello = (ws, msg) => {
  const { token } = msg;
  if (!token) { send(ws, {type:'error',error:'token required'}); ws.close(4001); return; }
  const user = validateToken(token);
  if (!user) { send(ws, {type:'error',error:'invalid token'}); ws.close(4001); return; }
  const userId = user.email, username = user.username || userId.split('@')[0];
  const oldWs = [...clients.entries()].find(([,uid])=>uid===userId)?.[0];
  if (oldWs&&oldWs!==ws) { send(oldWs,{type:'error',error:'kicked:duplicate login'}); oldWs.close(4001); }
  clients.set(ws, userId); onlineUsers.set(userId, {userId,username,joinedAt:Date.now()});
  send(ws, {type:'hello:ok',userId,username});
};

handlers['room:list'] = (ws) => { if(!requireAuth(ws))return;
  const list=[]; for(const r of rooms.values()) if(r.status==='waiting') list.push({id:r.id,name:r.name,host:r.host,hostId:r.hostId,playerCount:r.players.size,maxPlayers:r.maxPlayers,status:r.status});
  send(ws, {type:'room:list',rooms:list});
};

handlers['room:create'] = (ws, msg) => {
  const userId = requireAuth(ws); if (!userId) return;
  const name = (msg.name||'').trim(); if (!name) { send(ws,{type:'error',error:'room name required'}); return; }
  if (findRoomByUser(userId)) { send(ws,{type:'error',error:'already in a room'}); return; }
  const info = onlineUsers.get(userId), username = info?info.username:userId.split('@')[0];
  const room = {id:makeRoomId(),name,host:username,hostId:userId,players:new Map(),maxPlayers:MAX_PLAYERS,status:'waiting',seed:null,createdAt:Date.now(),startedPlayers:new Set()};
  room.players.set(userId, {id:userId,name:username,ws,ready:false,lane:-1,characterId:msg.characterId||'runner',alive:true,distance:0,forfeit:false,snapshot:null,snapshotTime:0});
  rooms.set(room.id, room);
  send(ws, {type:'room:update',room:roomToPublic(room)}); broadcastRoomList();
};

handlers['room:join'] = (ws, msg) => {
  const userId = requireAuth(ws); if (!userId) return;
  const roomId = msg.roomId||msg.id; if (!roomId) { send(ws,{type:'error',error:'roomId required'}); return; }
  const room = rooms.get(roomId); if (!room) { send(ws,{type:'error',error:'room not found'}); return; }
  if (room.status!=='waiting') { send(ws,{type:'error',error:'game already started'}); return; }
  if (room.players.has(userId)) { send(ws,{type:'error',error:'already in this room'}); return; }
  if (room.players.size>=room.maxPlayers) { send(ws,{type:'error',error:'room is full'}); return; }
  const ex = findRoomByUser(userId); if (ex) removeUserFromRoom(ex.id, userId);
  const info = onlineUsers.get(userId), username = info?info.username:userId.split('@')[0];
  room.players.set(userId, {id:userId,name:username,ws,ready:false,lane:-1,characterId:msg.characterId||'runner',alive:true,distance:0,forfeit:false,snapshot:null,snapshotTime:0});
  send(ws, {type:'room:update',room:roomToPublic(room)}); broadcastRoomUpdate(room);
};

handlers['room:leave'] = (ws) => { const uid=requireAuth(ws); if(!uid)return; const r=findRoomByUser(uid); if(!r){send(ws,{type:'room:left'});return;} removeUserFromRoom(r.id,uid); send(ws,{type:'room:left'}); };

handlers['room:reset'] = (ws, msg) => {
  const userId = requireAuth(ws); if (!userId) return;
  const roomId = msg.roomId||msg.id; if (!roomId) { send(ws,{type:'error',error:'roomId required'}); return; }
  const room = rooms.get(roomId); if (!room) { send(ws,{type:'error',error:'room not found'}); return; }
  if (room.hostId!==userId) { send(ws,{type:'error',error:'only host can reset'}); return; }
  resetRoomForLobby(room); broadcastRoomUpdate(room);
};

handlers['room:ready'] = (ws, msg) => {
  const userId = requireAuth(ws); if (!userId) return;
  const roomId = msg.roomId||msg.id, ready = msg.ready;
  if (!roomId||ready===undefined) { send(ws,{type:'error',error:'roomId and ready required'}); return; }
  const room = rooms.get(roomId); if (!room) { send(ws,{type:'error',error:'room not found'}); return; }
  const p = room.players.get(userId); if (!p) { send(ws,{type:'error',error:'not in this room'}); return; }
  p.ready = !!ready; broadcastRoomUpdate(room);
};

handlers['room:start'] = (ws, msg) => {
  const userId = requireAuth(ws); if (!userId) return;
  const roomId = msg.roomId||msg.id; if (!roomId) { send(ws,{type:'error',error:'roomId required'}); return; }
  const room = rooms.get(roomId); if (!room) { send(ws,{type:'error',error:'room not found'}); return; }
  if (room.hostId!==userId) { send(ws,{type:'error',error:'only host can start'}); return; }
  if (room.status!=='waiting') resetRoomForLobby(room);
  if (room.players.size<1) { send(ws,{type:'error',error:'need 1+ players'}); return; }
  if (room.players.size > 1) for (const [,p] of room.players) if (p.id !== userId && !p.ready) { send(ws,{type:'error',error:'not all ready'}); return; }
  const seed = crypto.randomBytes(16).toString('hex'); room.seed = seed; room.status = 'running'; room.startedPlayers = new Set([...room.players.keys()]);
  const lanePool = shuffle([...LANES]), offsetPool = shuffle([...START_OFFSETS]), playerList = [...room.players.values()], matchPlayers = [];
  for (let i=0;i<playerList.length;i++) { const p=playerList[i]; p.lane=lanePool[i]; p.alive=true;p.distance=0;p.forfeit=false;p.snapshot=null;p.snapshotTime=0; matchPlayers.push({id:p.id,name:p.name,lane:p.lane,startOffset:offsetPool[i],characterId:p.characterId||'runner'}); }
  broadcast(room.players, {type:'match:start',room:roomToPublic(room),seed,startAt:Date.now()});
  startSnapshotBroadcast(room); broadcastRoomList();
};

handlers['match:snapshot'] = (ws, msg) => {
  const userId = requireAuth(ws); if (!userId) return;
  const { roomId, snapshot } = msg; if (!roomId||!snapshot) { send(ws,{type:'error',error:'roomId and snapshot required'}); return; }
  const room = rooms.get(roomId); if (!room) { send(ws,{type:'error',error:'room not found'}); return; }
  if (room.status!=='running') { send(ws,{type:'error',error:'game not running'}); return; }
  const player = room.players.get(userId); if (!player) { send(ws,{type:'error',error:'not in this room'}); return; }
  // Freeze dead/forfeit players — only spectating can change
  if (!player.alive || player.forfeit) {
    if (player.snapshot) { player.snapshot.spectating = !!(snapshot.spectating); player.snapshotTime = Date.now(); }
    return;
  }
  const { lane, distance, isJumping, isRolling, alive, spectating, characterId, timestamp } = snapshot;
  if (typeof lane!=='number'||![0,1,2].includes(lane)) { send(ws,{type:'error',error:'invalid lane'}); return; }
  if (typeof distance!=='number'||distance<0||!Number.isFinite(distance)) { send(ws,{type:'error',error:'invalid distance'}); return; }
  const prevDist = player.snapshot?player.snapshot.distance:0, prevTs = player.snapshot?player.snapshot.timestamp:0;
  if (player.snapshot&&player.alive) { if (distance<prevDist) { send(ws,{type:'error',error:'distance cannot decrease'}); return; } let dt=0; if(prevTs>0&&timestamp>prevTs) dt=(timestamp-prevTs)/1000; const maxDelta=dt>0?Math.max(MAX_SPEED_MPS*dt,MIN_GRACE):MAX_SPEED_MPS*0.1; if(distance-prevDist>maxDelta) { send(ws,{type:'error',error:'distance increase too large'}); return; } }
  const wasAlive=player.alive, nowDead=alive===false;
  player.snapshot = {lane,distance:Math.floor(distance),isJumping:!!isJumping,isRolling:!!isRolling,alive:alive!==false,spectating:!!spectating,characterId:characterId||'runner',timestamp:timestamp||Date.now()};
  player.snapshotTime=Date.now(); player.distance=Math.floor(distance); player.alive=alive!==false;
  if (nowDead&&wasAlive) { broadcast(room.players, {type:'match:dead',roomId:room.id,playerId:player.id,name:player.name,distance:player.distance}); if(aliveCount(room)<=1) endMatch(room); }
};

handlers['match:dead'] = (ws, msg) => {
  const userId = requireAuth(ws); if(!userId)return; const {roomId,distance}=msg; if(!roomId){send(ws,{type:'error',error:'roomId required'});return;}
  const room=rooms.get(roomId); if(!room){send(ws,{type:'error',error:'room not found'});return;}
  const p=room.players.get(userId); if(!p){send(ws,{type:'error',error:'not in this room'});return;} if(!p.alive)return;
  p.alive=false; p.distance=Math.max(p.distance,distance||0); if(p.snapshot)p.snapshot.alive=false;
  broadcast(room.players, {type:'match:dead',roomId:room.id,playerId:p.id,name:p.name,distance:p.distance});
  if(aliveCount(room)<=1) endMatch(room);
};

function makeRoomId() { return 'room_'+(nextRoomId++); }

// ─── HTTP + WS ───────────────────────────────────────────────────────────

const server = http.createServer((req, res) => { res.writeHead(200,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}); res.end(JSON.stringify({service:'endless-runner-pvp',status:'running',onlineUsers:onlineUsers.size,activeRooms:rooms.size})); });
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws) => {
  ws.on('message', (raw) => { let msg; try{msg=JSON.parse(raw.toString())}catch{send(ws,{type:'error',error:'invalid JSON'});return;} const h=handlers[msg.type]; if(!h){send(ws,{type:'error',error:'unknown type:'+msg.type});return;} h(ws, msg); });
  ws.on('close', () => { const uid=clients.get(ws); if(uid){cleanupUser(uid);onlineUsers.delete(uid);clients.delete(ws);} });
});
server.on('upgrade', (req, socket, head) => { try{const u=new URL(req.url,'http://localhost');if(u.pathname!=='/pvp'){socket.destroy();return;}wss.handleUpgrade(req,socket,head,(ws)=>{wss.emit('connection',ws,req);})}catch{socket.destroy()} });

server.listen(PORT, '0.0.0.0', () => { console.log('[PVP] ws://0.0.0.0:'+PORT+'/pvp'); });
