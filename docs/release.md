# Endless Runner — Release & Build Guide

---

## 📥 Download & Play (Windows)

### Requirements

| Item | Minimum |
|------|---------|
| OS | Windows 10+ 64-bit |
| CPU | Dual-core 2.0 GHz |
| RAM | 2 GB |
| GPU | WebGL-capable (integrated works) |
| Storage | ~200 MB |
| Network | Required for account login, cloud saves, PVP |

### Steps

1. Go to **[GitHub Releases](https://github.com/jamesbot2/subway-surfer/releases)**
2. Download the latest `Endless-Runner-vX.X.X-win.zip`
3. Extract to any folder (e.g. `C:\Games\Endless Runner\`)
4. Run `Endless Runner.exe`
5. Register an account → check email for verification code → log in → play!

> **Offline mode**: Play without an account — saves are local. Online features (cloud save, PVP, leaderboard) need login.

### Custom Server

```cmd
set SUBWAY_API_BASE_URL=http://your-server:3000
"Endless Runner.exe"
```

---

## 🛠 Developer Build

### Prerequisites

- Node.js >= 18, npm >= 9, Git

### Full Pipeline

```bash
git clone https://github.com/jamesbot2/subway-surfer.git
cd subway-surfer
npm install
cd apps/desktop && npm install && cd ../..

npm run build:game              # game/ → game.js
npm run desktop:build           # TypeScript + Vite
npm run desktop:test:smoke      # Electron smoke test
npm run pvp:smoke               # PVP integration test
npm run desktop:pack            # → win-unpacked
```

### Package Outputs

| Command | Output |
|---------|--------|
| `npm run desktop:pack` | `apps/desktop/release/win-unpacked/` |
| `npm run desktop:dist` | `apps/desktop/release/Endless Runner Setup.exe` |

### Release Zip

```bash
cd apps/desktop/release
zip -r Endless-Runner-v1.0.0-win.zip win-unpacked/
```

Upload to [GitHub Releases](https://github.com/jamesbot2/subway-surfer/releases).

---

## 👷 CI/CD Pipeline

The workflow at `.github/workflows/build.yml` runs automatically.

**On push/PR to `main`:**
- Build game bundle → Compile Electron → Headless smoke test → PVP test → Package → Upload artifact

**On tag push (`v*`):**
- All the above, plus create a GitHub Release with the zip attached.

```bash
git tag v1.0.0
git push origin v1.0.0
```

---

## 🔧 Server Deployment

### Quick Start

```bash
# Start account server
node server/account-server.js &

# Start PVP server
node server/pvp-server.js &
```

### systemd

```bash
sudo cp server/subway-account.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now subway-account
```

### SMTP (Email Verification)

```bash
sudo systemctl edit subway-account
```

```ini
[Service]
Environment="SMTP_USER=james_sever@163.com"
Environment="SMTP_PASS=<auth_code>"
```

### Firewall

| Port | Protocol | Purpose |
|------|----------|---------|
| 3000 | TCP | Account API |
| 3001 | TCP | PVP WebSocket |

---

## 📁 Release Contents

```
Endless-Runner-v1.0.0-win.zip
├── Endless Runner.exe          # App
├── resources/app.asar          # Bundled code
├── locales/                    # 67 languages
├── d3dcompiler_47.dll          # DirectX
├── libEGL.dll / libGLESv2.dll  # ANGLE
├── vk_swiftshader.dll          # Vulkan SW renderer
└── … (Chromium runtime files)
```
