# 🏃 Endless Runner

> Three.js + Electron desktop endless runner with real-time PVP, character system, abilities, cloud saves, and admin backend.
> Made by Neo 🤖 for James

---

## 🖥 Architecture

```
┌─────────────────────────────┐
│  Electron Desktop Client    │
│  (Three.js r128 + legacy)   │
│  Apps on :5173 (dev)        │
└──────────┬──────────────────┘
           │ HTTP + WS
    ┌──────┴───────┬──────────┐
    │              │          │
    ▼              ▼          ▼
┌────────┐  ┌──────────┐  ┌──────┐
│Account │  │PVP Server│  │ SMTP │
│Server  │  │WebSocket │  │ 163  │
│:3000   │  │:3001/pvp│  │Email │
└────────┘  └──────────┘  └──────┘
  users.json   real-time    verify
  save/load    snapshot     codes
  leaderboard  match sync
  admin panel  ranking
```

---

## 🎮 Features

- **Normal mode**: Infinite runner with lanes, jumping, rolling, obstacles, police chase, speed scaling
- **PVP multiplayer**: WebSocket rooms (max 3 players), real-time 20Hz snapshot sync, death spectating, distance-based ranking
- **Character system**: Ownable characters, selection, visual models
- **Abilities**: Double jump (10k cr), Jetpack (50k cr, 15s flight / 30s cooldown), Roof walk (100k cr)
- **Guns**: Pickups in normal mode (disabled in PVP)
- **Cloud saves**: Login, register, email verification, auto-save every 30s
- **Leaderboard**: Per-difficulty rankings with credits, total coins, run count
- **Admin panel**: Edit coins, credits, characters, abilities, verify users, reset passwords
- **Offline mode**: Play without an account (local saves only)

---

## 🛠 Local Development

```bash
git clone https://github.com/jamesbot2/subway-surfer.git
cd subway-surfer
npm install
cd apps/desktop && npm install && cd ../..

# Start account server (required for login/save)
npm run server:account

# Start PVP server (required for multiplayer)
npm run server:pvp

# Start Electron in dev mode
npm run desktop:dev
```

---

## 📦 Packaging

```bash
npm run desktop:build    # Build TypeScript + Vite
npm run desktop:pack     # Package Electron app (win32 dir)
npm run desktop:dist     # Full installer build
```

Output: `apps/desktop/release/win-unpacked/Endless Runner.exe`

---

## 🧪 Testing

```bash
npm run desktop:test:smoke   # Electron smoke test (requires display)
npm run pvp:smoke             # PVP WebSocket integration test
```

---

## ☁️ Server Deployment

### Account Server (port 3000)

```bash
sudo systemctl enable --now subway-account
```

Requires SMTP for email verification (163.com):

```bash
sudo systemctl edit subway-account
```

```ini
[Service]
Environment="SMTP_USER=james_sever@163.com"
Environment="SMTP_PASS=<auth_code>"
```

```bash
sudo systemctl daemon-reload
sudo systemctl restart subway-account
```

### PVP Server (port 3001)

```bash
sudo systemctl enable --now subway-pvp
```

Firewall: open TCP 3001 on your cloud firewall with tag `allow-game-server`.

---

## 🔐 Account System

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/register` | POST | Register (email + username + password + captcha) |
| `/api/verify-code` | POST | Verify email with 6-digit code |
| `/api/login` | POST | Login, returns session token |
| `/api/save` | POST | Save game data (auth required) |
| `/api/load` | GET | Load game data (auth required) |
| `/api/leaderboard` | GET | Top 100 players by max distance |

### Admin Panel

**http://<host>:3000/admin** — Basic auth: `admin / admin123`

- View all users (email, username, coins, credits, max distance, run count, abilities, characters)
- Set coins, credits, max distance, run count
- Edit owned characters and selected character
- Reset passwords
- Verify users
- Delete users

### SMTP Email Verification

- Registers with captcha → receives 6-digit code via email
- SMTP: 163.com, port 465, SSL
- Temporary code lookup: `http://<host>:3000/verify-codes` (admin auth required)

---

## 🆚 PVP Protocol

**WebSocket**: `ws://<host>:3001/pvp`

All messages are JSON. See `server/pvp-server.js` for full handler reference.

| Client → Server | Server → Client | Description |
|-----------------|-----------------|-------------|
| `hello {token}` | `hello:ok {userId,username}` | Authenticate with account token |
| `room:list` | `room:list {rooms[]}` | List joinable rooms |
| `room:create {name}` | `room:update {room}` | Create room (max 3 players) |
| `room:join {roomId}` | `room:update {room}` | Join a room |
| `room:leave` | `room:left {roomId}` | Leave room |
| `room:ready {roomId,ready}` | `room:update {room}` | Toggle ready |
| `room:start {roomId}` | `match:start {room,seed}` | Host starts match |
| `match:snapshot {roomId,snapshot}` | `match:snapshot {players[]}` | 20Hz state sync |
| `match:dead {roomId,distance}` | `match:dead {playerId,name,distance}` | Player death |
| — | `match:finish {ranking[]}` | Match ended, distance ranking |

Dead players are frozen — distance cannot increase after death. Repeat `match:dead` calls are ignored.

---

## 🗂 Project Structure

```
subway-surfer/
├── game/                     # Game modules (IIFE concatenation)
│   ├── constants.js          # Game constants (Jetpack: 15s fuel / 30s cooldown)
│   ├── state.js              # Game state
│   ├── audio.js              # Audio + music
│   ├── scene.js              # Three.js scene/camera/renderer
│   ├── player.js             # Player character model
│   ├── guns.js               # Gun pickups (normal mode only)
│   ├── ui.js                 # Menus, shop, settings, PVP lobby
│   ├── account.js            # Login/register/cloud save
│   ├── pvp-client.js         # PVP WebSocket client bridge
│   └── ...                   # Track, buildings, obstacles, coins, collision, controls, homelander, police
├── server/
│   ├── account-server.js     # HTTP API (port 3000)
│   ├── pvp-server.js         # WebSocket PVP (port 3001)
│   ├── pvp-smoke.js          # PVP integration tests
│   ├── auth.js               # Shared auth + data helpers
│   └── data/users.json       # User database
├── apps/desktop/             # Electron shell
│   ├── src/public/legacy/    # Bundled game code
│   ├── src/renderer.ts       # Electron bridge (IPC, auth, status bar)
│   ├── electron/main.ts      # Electron main process
│   └── tests/smoke.js        # Electron smoke test
├── game.js                   # Concatenated game bundle (20 modules)
├── package.json              # Root scripts + dependencies
└── README.md
```

---

## ⚠ Legacy Web Entry (deprecated)

The old `game.html` web entry and `server/static-server.js` on port 8080 are no longer the primary delivery target. The recommended way to play is the Electron desktop app.

---
*Web version was the original delivery target. Now deprecated in favor of Electron desktop.*
