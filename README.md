# Endless Runner

Endless Runner is a desktop-first 3D endless runner built with Electron, Three.js r128, and a lightweight Node.js backend.

The Electron app is the primary product. The older browser/static pages remain in the repository only as legacy development support and for compatibility with the existing account server.

## Current Product

- Desktop client: Electron + Vite + TypeScript in `apps/desktop`
- Game runtime: Three.js r128, bundled from `game/*.js` into `game.js`
- Account service: Node.js HTTP server on port `3000`
- PVP service: WebSocket server on port `3001`
- Admin panel: served by the account service at `/admin`
- Data storage: JSON files under `server/data/`

## Repository Layout

```text
.
├── apps/desktop/             # Electron desktop client
│   ├── src/                  # Electron renderer/auth/runtime bridge
│   ├── tests/                # Electron smoke tests
│   └── release/              # Local packaged output, ignored by git
├── game/                     # Modular IIFE game source
│   ├── build.js              # Bundles game modules into root game.js
│   ├── pvp-client.js         # Desktop PVP WebSocket bridge
│   └── *.js                  # Scene, player, UI, account, audio, systems
├── server/
│   ├── account-server.js     # Login, register, saves, admin, leaderboard
│   ├── pvp-server.js         # PVP rooms and realtime snapshots
│   └── pvp-smoke.js          # PVP server protocol smoke test
├── audio/                    # Shared audio assets
├── game.js                   # Built game bundle
└── README.md
```

## Install

Run these from the repository root:

```bash
npm install
npm --prefix apps/desktop install
```

## Desktop Development

```bash
npm run build:game
npm run desktop:dev
```

The desktop client reads its account API from `ENDLESS_RUNNER_API_BASE_URL`.

Example for the current GCP account server:

```powershell
$env:ENDLESS_RUNNER_API_BASE_URL="http://35.212.200.85:3000"
npm run desktop:dev
```

PVP uses the same host as the account API and connects to port `3001`.

## Build And Package

```bash
npm run build:game
npm run desktop:build
npm run desktop:test:smoke
npm run desktop:pack
```

`desktop:pack` creates a portable Windows folder at:

```text
apps/desktop/release/win-unpacked/
```

Copy the whole `win-unpacked` folder to another Windows computer, then run:

```text
Endless Runner.exe
```

Do not copy only the `.exe`; Electron needs the adjacent runtime files.

## Backend Services

Start the account server:

```bash
npm run server:account
```

Start the PVP server:

```bash
npm run server:pvp
```

Run the PVP protocol smoke test:

```bash
npm run pvp:smoke
```

Production server notes:

- Keep the account server on port `3000`.
- Run the PVP WebSocket server on port `3001`.
- Restarting PVP should not stop the account server.
- Open firewall access for `3000` and `3001`.
- Configure SMTP environment variables before testing email verification.

## Account And Admin Data

The account server owns:

- Registration and login
- Email verification codes
- Cloud save data
- Credits and coins
- Character ownership and selected character
- Equipped skills
- Best distance and run history
- Leaderboards

The Electron client also keeps local fallback save/settings files under Electron `userData`, so offline play can continue when the account server is unreachable.

## Game Features

- Three-lane endless runner gameplay
- Third-person and first-person camera options
- Character shop and unlock progression
- Jetpack, double jump, roof running, and gun pickups
- Homelander console easter egg
- PVP room flow with server-backed rooms
- PVP cyberpunk arena, countdown, ranking, spectating, and realtime player snapshots
- Admin-controlled account/game-data management

## Test Checklist

Before packaging a release:

```bash
npm run build:game
npm run desktop:build
npm run desktop:test:smoke
npm run pvp:smoke
```

Manual checks:

- Login and sign out return to the correct screen.
- A new account only has the default unlocked character.
- Email verification sends successfully from the configured SMTP account.
- PVP can connect to the server, create a room, start solo for testing, exit to the PVP lobby, and close back to the main menu.
- The copied `win-unpacked` folder works on a second Windows machine.

## Legacy Browser Files

Files such as `signin.html`, `game.html`, and the old static web flow are retained only for compatibility and debugging. New work should target the Electron desktop app first.
