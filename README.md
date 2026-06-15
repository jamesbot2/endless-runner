# 🏃 Endless Runner

> Three.js + Electron desktop endless runner with real-time PVP, character system, abilities, cloud saves, and admin backend.
> Made by Neo 🤖 for James

[![Desktop Build](https://github.com/jamesbot2/subway-surfer/actions/workflows/desktop-build.yml/badge.svg)](https://github.com/jamesbot2/subway-surfer/actions/workflows/desktop-build.yml)
[![Release Desktop](https://github.com/jamesbot2/subway-surfer/actions/workflows/desktop-release.yml/badge.svg)](https://github.com/jamesbot2/subway-surfer/actions/workflows/desktop-release.yml)
[![Release](https://img.shields.io/github/v/release/jamesbot2/subway-surfer)](https://github.com/jamesbot2/subway-surfer/releases)

---

## 🖥 Architecture

```
┌─────────────────────────────┐
│  Electron Desktop Client    │
│  (Three.js r128)            │
│  Dev server :5173            │
└──────────┬──────────────────┘
           │ HTTP + WS
    ┌──────┴───────┬──────────┐
    │              │          │
    ▼              ▼          ▼
┌────────┐  ┌──────────┐  ┌──────┐
│Account │  │PVP Server│  │ SMTP │
│Server  │  │WebSocket │  │ 163  │
│:3000   │  │:3001/pvp │  │Email │
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

## 🚀 Downloads

Prebuilt binaries are available from **[GitHub Releases](https://github.com/jamesbot2/subway-surfer/releases)**.

- **Windows**: `Endless-Runner-vX.X.X-win.zip` (portable, no install needed)
- **Linux / macOS**: Build from source (see below)

> No browser or web server required — just download, extract, and run `Endless Runner.exe`.

---

## 🛠 Local Development

```bash
git clone https://github.com/jamesbot2/subway-surfer.git
cd subway-surfer
npm install
cd apps/desktop && npm install && cd ../..

# Build the game bundle
npm run build:game

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
npm run build:game              # Rebuild game.js
npm run desktop:build           # Build TypeScript + Vite renderer
npm run desktop:pack            # Package → win-unpacked (portable)
npm run desktop:dist            # Full NSIS installer (requires wine on Linux)
```

| Output | Location |
|--------|----------|
| Portable directory | `apps/desktop/release/win-unpacked/` |
| NSIS installer | `apps/desktop/release/Endless Runner Setup.exe` |

> **Important**: Release binaries are **never committed to git**. Upload to [GitHub Releases](https://github.com/jamesbot2/subway-surfer/releases).

### Quick Release Zip

```bash
npm run build:game
npm run desktop:build
npm run desktop:pack
cd apps/desktop/release
zip -r Endless-Runner-v1.0.0-win.zip win-unpacked/
```

---

## 🧪 Testing

```bash
npm run desktop:test:smoke              # Electron smoke test (requires display)
npm run desktop:test:smoke:headless     # Headless smoke test (xvfb)
npm run pvp:smoke                       # PVP WebSocket integration test
```

---

## ☁️ Server Deployment

See [docs/release.md](docs/release.md) for full server configuration.

Quick start:

```bash
# Start account server (port 3000)
node server/account-server.js &

# Start PVP server (port 3001)
node server/pvp-server.js &
```

### systemd

```bash
sudo cp server/subway-account.service /etc/systemd/system/
sudo systemctl enable --now subway-account
```

SMTP configuration for email verification:

```bash
sudo systemctl edit subway-account
```

```ini
[Service]
Environment="SMTP_USER=james_sever@163.com"
Environment="SMTP_PASS=<auth_code>"
```

### Firewall

| Port | Protocol | Tag |
|------|----------|-----|
| 3000 | TCP | `allow-game-server` |
| 3001 | TCP | `allow-game-server` |

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

**http://&lt;host&gt;:3000/admin** — Basic auth: `admin / admin123`

- View all users, set coins/credits/run count
- Edit characters, reset passwords, verify users, delete users

---

## 🆚 PVP Protocol

**WebSocket**: `ws://&lt;host&gt;:3001/pvp`

See `server/pvp-server.js` for full handler reference.

| Client → Server | Server → Client | Description |
|---|---|---|
| `hello {token}` | `hello:ok {userId,username}` | Authenticate |
| `room:create {name}` | `room:update {room}` | Create room (max 3) |
| `room:join {roomId}` | `room:update {room}` | Join room |
| `room:ready {roomId,ready}` | `room:update {room}` | Toggle ready |
| `room:start {roomId}` | `match:start {room,seed}` | Host starts match |
| `match:snapshot {roomId,snapshot}` | `match:snapshot {players[]}` | 20Hz sync |
| `match:dead {roomId,distance}` | `match:finish {ranking[]}` | Death + finish |

---

## 🗂 Project Structure

```
├── game/                     # Game modules (IIFE concatenation)
├── server/                   # Account & PVP servers
│   ├── account-server.js     # HTTP API (port 3000)
│   ├── pvp-server.js         # WebSocket PVP (port 3001)
│   └── auth.js               # Shared auth helpers
├── apps/desktop/             # Electron shell
│   ├── electron/             # Main + preload (TypeScript)
│   ├── src/                  # Renderer (HTML + TS + legacy bundle)
│   └── tests/                # Smoke tests
├── models/                   # 3D character models
├── audio/                    # Sound effects & music
├── tools/                    # Development utilities
├── docs/                     # Documentation
├── game.js                   # Concatenated game bundle
├── package.json              # Root scripts
└── .github/workflows/        # CI/CD pipeline
```

---

## 🛡 License

Private project. All rights reserved.
