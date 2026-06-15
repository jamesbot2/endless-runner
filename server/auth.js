// ===== ENDLESS RUNNER - Shared Auth / Data Helpers =====
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function readDB(file) {
  try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {}; }
  catch { return {}; }
}
function writeDB(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }
function getUsers() { return readDB(USERS_FILE); }
function saveUsers(users) { writeDB(USERS_FILE, users); }

function getAuthUser(headers) {
  const token = (headers['authorization'] || '').replace('Bearer ', '');
  if (!token) return null;
  const users = getUsers();
  for (const email in users) {
    if (users[email].sessionToken === token && users[email].sessionExpires > Date.now()) return email;
  }
  return null;
}

function validateToken(token) {
  if (!token) return null;
  const users = getUsers();
  for (const email in users) {
    const u = users[email];
    if (u.sessionToken === token && u.sessionExpires > Date.now()) return { ...u, email };
  }
  return null;
}

function defaultGameData() {
  return { coins:0, credits:0, equippedAbility:0, ownedAbilities:[0], maxDistance:0, maxEasy:0, maxMedium:0, maxHard:0, maxEasyAbility:0, maxMediumAbility:0, maxHardAbility:0, runCount:0, highScore:0, totalCoins:0, ownedCharacters:['runner'], selectedCharacter:'runner' };
}

function normalizeGameData(g) {
  if (!g || typeof g !== 'object') return defaultGameData();
  const ownedCharacters = Array.isArray(g.ownedCharacters) && g.ownedCharacters.length ? g.ownedCharacters : ['runner'];
  if (ownedCharacters.indexOf('runner') < 0) ownedCharacters.unshift('runner');
  const selectedCharacter = g.selectedCharacter && ownedCharacters.indexOf(g.selectedCharacter) >= 0 ? g.selectedCharacter : 'runner';
  return {
    coins: g.coins||0, credits: g.credits||0,
    totalCoins: Math.max(g.totalCoins||0, g.coins||0),
    equippedAbility: g.equippedAbility||0,
    ownedAbilities: Array.isArray(g.ownedAbilities) ? g.ownedAbilities : [0],
    maxDistance: Math.max(g.maxDistance||0, g.highScore||0, g.maxEasy||0, g.maxMedium||0, g.maxHard||0),
    maxEasy: g.maxEasy||0, maxMedium: g.maxMedium||0, maxHard: g.maxHard||0,
    maxEasyAbility: g.maxEasyAbility||0, maxMediumAbility: g.maxMediumAbility||0, maxHardAbility: g.maxHardAbility||0,
    runCount: g.runCount||0,
    highScore: Math.max(g.maxDistance||0, g.highScore||0, g.maxEasy||0, g.maxMedium||0, g.maxHard||0),
    ownedCharacters,
    selectedCharacter,
  };
}

module.exports = { DATA_DIR, USERS_FILE, readDB, writeDB, getUsers, saveUsers, getAuthUser, validateToken, defaultGameData, normalizeGameData };
