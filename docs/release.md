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

Two workflows run automatically:

- `.github/workflows/desktop-build.yml` — Build, smoke test, PVP test, package on push/PR
- `.github/workflows/desktop-release.yml` — Create GitHub Release on tag push (`v*`)

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
sudo cp server/endless-runner-account.service /etc/systemd/system/
sudo cp server/endless-runner-pvp.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now endless-runner-account
sudo systemctl enable --now endless-runner-pvp
```

### SMTP (Email Verification)

```bash
sudo systemctl edit endless-runner-account
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


## 📧 SMTP Configuration

Endless Runner uses SMTP to send verification code emails during registration. The system supports multiple email providers.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SMTP_USER` | (required) | SMTP login username, typically the email address |
| `SMTP_PASS` | (required) | SMTP login password or authorization code |
| `MAIL_PROVIDER` | `163` | Provider name for logging. Use `163`, `resend`, `sendgrid`, `smtp`, etc. |
| `SMTP_HOST` | `smtp.163.com` | SMTP server hostname. Auto-detected for 163 if not set |
| `SMTP_PORT` | `465` | SMTP port (465 for SSL, 587 for STARTTLS) |
| `SMTP_SECURE` | `true` | Use SSL/TLS. Set to `false` for STARTTLS on port 587 |
| `MAIL_FROM` | `"Endless Runner" <user>` | From address for outgoing emails |

### systemd Configuration

Add a drop-in file to configure SMTP:

```bash
sudo mkdir -p /etc/systemd/system/endless-runner-account.service.d
sudo tee /etc/systemd/system/endless-runner-account.service.d/smtp.conf << 'EOF'
[Service]
Environment="SMTP_USER=youraccount@163.com"
Environment="SMTP_PASS=your_auth_code"
Environment="MAIL_FROM=Endless Runner <youraccount@163.com>"
EOF
sudo systemctl daemon-reload
sudo systemctl restart endless-runner-account
```

### Provider-Specific Notes

#### 163.com (Free)

- Host: `smtp.163.com:465` (SSL)
- SMTP_USER: your full 163 email address
- SMTP_PASS: your **authorization code** (not login password). Get it from Settings > POP3/SMTP/IMAP
- **⚠️ Known issue**: 163 free email → QQ email delivery may be delayed (5-30 min) or filtered to spam folder.
  This is a common issue between Chinese email providers. For production, use enterprise SMTP or a transactional email service.

#### Resend (Recommended for production)

1. Sign up at https://resend.com
2. Verify your domain (enables SPF/DKIM/DMARC)
3. Create an API key
4. Configure:

```bash
Environment="MAIL_PROVIDER=resend"
Environment="SMTP_HOST=smtp.resend.com"
Environment="SMTP_PORT=465"
Environment="SMTP_USER=resend"
Environment="SMTP_PASS=re_xxxxx"
Environment="MAIL_FROM=Endless Runner <noreply@yourdomain.com>"
```

#### SendGrid

```bash
Environment="MAIL_PROVIDER=sendgrid"
Environment="SMTP_HOST=smtp.sendgrid.net"
Environment="SMTP_PORT=465"
Environment="SMTP_USER=apikey"
Environment="SMTP_PASS=SG.xxxxx"
Environment="MAIL_FROM=Endless Runner <noreply@yourdomain.com>"
```

#### Gmail / Google Workspace (SMTP)

```bash
Environment="MAIL_PROVIDER=gmail"
Environment="SMTP_HOST=smtp.gmail.com"
Environment="SMTP_PORT=587"
Environment="SMTP_SECURE=false"
Environment="SMTP_USER=your@gmail.com"
Environment="SMTP_PASS=your_app_password"
Environment="MAIL_FROM=Endless Runner <your@gmail.com>"
```

### Diagnostic Tool

Test email delivery with the admin API:

```bash
curl -u "admin:admin123" -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}' \
  http://your-server:3000/api/admin-test-email
```

Returns structured result: `{ ok, messageId, accepted, rejected, response, error }`

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
