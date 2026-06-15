# Endless Runner — Release & Build Guide

> 🏃 Three.js + Electron desktop endless runner with PVP multiplayer, cloud saves, and admin backend.

---

## 📥 Download & Play (Windows)

### System Requirements

| Requirement | Minimum |
|-------------|---------|
| OS | Windows 10 64-bit or later |
| CPU | Dual-core 2.0 GHz |
| RAM | 2 GB |
| GPU | Any GPU with WebGL support (integrated works) |
| Storage | ~200 MB |
| Network | Required only for account login, cloud saves, and PVP |

### Download

1. Go to **[GitHub Releases](https://github.com/jamesbot2/subway-surfer/releases)**
2. Find the latest release
3. Download **`Endless-Runner-vX.X.X-win.zip`** (the portable Windows build)
4. Extract the zip to any folder (e.g. `C:\Games\Endless Runner\`)

### Run

1. Open the extracted folder
2. Double-click **`Endless Runner.exe`**
3. The game starts — you'll see the login / register overlay
4. **First time?** Register an account (email + username + password), then check your email for a 6-digit verification code
5. After verification, log in and play!

> **Offline mode**: You can play without an account — saves are kept locally. Online features (cloud save, PVP, leaderboard) require login.

### Configuration (Advanced)

By default, the game connects to the production server at `35.212.200.85:3000`.

To use a custom server, set the environment variable before launching:

```cmd
set SUBWAY_API_BASE_URL=http://your-server-ip:3000
"Endless Runner.exe"
```

Or in PowerShell:

```powershell
$env:SUBWAY_API_BASE_URL="http://your-server-ip:3000"
& ".\Endless Runner.exe"
```

---

## 🛠 Developer Build Guide

### Prerequisites

- **Node.js** >= 18 (tested on v24)
- **npm** >= 9
- **Git**
- **For packaging**: Electron's build tools (see [electron-builder docs](https://www.electron.build/multi-platform-build))

### Quick Start

```bash
# Clone the repo
git clone https://github.com/jamesbot2/subway-surfer.git
cd subway-surfer

# Install dependencies
npm install
cd apps/desktop && npm install && cd ../..

# Step 1: Build the game bundle
npm run build:game

# Step 2: Build Electron app (TypeScript + Vite)
npm run desktop:build

# Step 3: Run smoke tests
npm run desktop:test:smoke        # Requires display (or xvfb on Linux)
npm run pvp:smoke                 # Requires account + pvp servers running

# Step 4: Package the app
npm run desktop:pack              # Produces win-unpacked/ directory
# or
npm run desktop:dist              # Produces NSIS installer (requires wine on Linux)

# Step 5: (Optional) Create release zip
cd apps/desktop/release
zip -r Endless-Runner-v1.0.0-win.zip win-unpacked/
```

### Package Outputs

| Command | Output | Description |
|---------|--------|-------------|
| `npm run desktop:pack` | `apps/desktop/release/win-unpacked/` | Portable directory (unpacked) |
| `npm run desktop:dist` | `apps/desktop/release/Endless Runner Setup.exe` | NSIS installer (Windows) |

> **Important**: Release binaries are **never committed to git**. Upload them to GitHub Releases instead.

### Full Build Pipeline

```bash
# Clean build from scratch
npm run build:game                    # Concatenate game/ modules → game.js
npm run desktop:build                 # Compile TypeScript + Vite renderer
npm run desktop:test:smoke:headless   # Headless smoke test (8 checks)
npm run pvp:smoke                     # PVP integration test (12 checks)
npm run desktop:pack                  # Package → win-unpacked
```

---

## 📦 Creating a GitHub Release

### Automated (via CI)

Push a version tag to trigger the release workflow:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The CI pipeline will:
1. Build the game bundle (`game.js`)
2. Compile Electron (TypeScript + Vite)
3. Run smoke tests
4. Package the app (`win-unpacked`)
5. Zip the build artifact
6. Create a GitHub Release and upload the zip

### Manual

1. Build locally following the [Developer Build Guide](#-developer-build-guide)
2. Zip the output:

   ```bash
   cd apps/desktop/release
   zip -r Endless-Runner-v1.0.0-win.zip win-unpacked/
   ```

3. Go to [GitHub Releases](https://github.com/jamesbot2/subway-surfer/releases)
4. Click **"Draft a new release"**
5. Enter a tag version (e.g. `v1.0.0`)
6. Write release notes describing changes
7. Upload the zip file
8. Publish release

---

## 🔧 Server Configuration & Deployment

Endless Runner depends on two backend servers for online features:

| Server | Port | Purpose |
|--------|------|---------|
| Account Server | 3000 | Auth, cloud save, leaderboard, admin |
| PVP Server | 3001 | WebSocket multiplayer |

### Quick Deploy (Debian/Ubuntu)

```bash
# Clone and install
git clone https://github.com/jamesbot2/subway-surfer.git
cd subway-surfer
npm install

# Start account server
node server/account-server.js &

# Start PVP server
node server/pvp-server.js &
```

### Production (systemd)

Copy the service files and enable:

```bash
sudo cp server/subway-account.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now subway-account
```

For PVP:

```bash
sudo cp server/pvp-server.service /etc/systemd/system/
sudo systemctl enable --now subway-pvp
```

### Firewall

Open these ports on your cloud firewall:

| Port | Protocol | Tag |
|------|----------|-----|
| 3000 | TCP | `allow-game-server` |
| 3001 | TCP | `allow-game-server` |

### SMTP (Email Verification)

The account server needs SMTP credentials for email verification codes. Set environment variables:

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

### Admin Panel

Once the account server is running, access the admin panel:

`http://<server-ip>:3000/admin`

Default credentials: `admin / admin123`

- Manage users, coins, credits, abilities, characters
- Reset passwords, verify users, delete accounts
- View all verification codes

---

## 🔄 CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/build.yml`) runs automatically:

### On Push / PR to `main`

- ✅ Builds game bundle
- ✅ Compiles Electron app
- ✅ Runs headless smoke test
- ✅ Runs PVP smoke test
- ⬆ Uploads `win-unpacked` as build artifact

### On Tag Push (`v*`)

- All of the above, plus:
- 🏷 Creates a GitHub Release
- 📦 Uploads `Endless-Runner-<version>-win.zip` to the release

### Artifact Retention

Build artifacts are retained for 90 days. Release artifacts are permanent.

---

## 📁 Release File Structure

```
Endless-Runner-v1.0.0-win.zip
├── Endless Runner.exe          # Main application
├── resources/
│   └── app.asar                # Bundled app code
├── locales/                    # Locale files (67 languages)
├── d3dcompiler_47.dll          # DirectX compiler
├── libEGL.dll                  # EGL (ANGLE)
├── libGLESv2.dll               # OpenGL ES (ANGLE)
├── vk_swiftshader.dll          # Vulkan software renderer
├── chrome_100_percent.pak      # Chromium resources
├── chrome_200_percent.pak
├── icudtl.dat                  # ICU data
├── resources.pak               # Chromium resources
├── snapshot_blob.bin           # V8 snapshot
├── v8_context_snapshot.bin
├── vk_swiftshader_icd.json     # Vulkan ICD
├── ffmpeg.dll                  # FFmpeg
├── LICENSE.electron.txt        # Electron license
└── LICENSES.chromium.html      # Chromium licenses
```

---

> **Note**: The root `game.js` at the project root is the source-of-truth game bundle. It is copied to `apps/desktop/src/public/legacy/game.js` at build time. The Electron app loads this file via `<script>` in `index.html`.
