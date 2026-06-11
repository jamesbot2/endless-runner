# Headless / CI Testing (Linux)

The Electron desktop app can run in headless environments (GCP, GitHub Actions, etc.)
using Xvfb (virtual framebuffer). This is useful for smoke tests and CI pipelines.

> ⚠️ **Crucial**: headless testing is a **smoke test only**.
> Always verify the final GUI on a real display (local Windows machine).

---

## Prerequisites

```bash
sudo apt-get install -y xvfb imagemagick xdotool
```

---

## Commands

### Smoke test (quick, automated)

```bash
# From repo root
npm run desktop:test:smoke:headless

# From apps/desktop directly
cd apps/desktop
ELECTRON_HEADLESS_CI=1 xvfb-run -a npm run test:smoke
```

Verifies: body loaded, `window.__SG` (149 keys), `window.THREE` (r128),
`desktopAPI` bridge, `__SUBWAY_CONFIG__`, F11 handler, no Node.js leaks.

### Dev session (interactive, with Vite hot-reload)

```bash
# From repo root
npm run desktop:dev:headless

# From apps/desktop directly
cd apps/desktop
ELECTRON_HEADLESS_CI=1 xvfb-run -a npm run dev:headless
```

### Screenshot (manual visual check)

```bash
ELECTRON_HEADLESS_CI=1 xvfb-run -a npm run dev:headless &
EPID=$!
sleep 12
import -window root /tmp/subway-surfer.png
identify /tmp/subway-surfer.png
kill $EPID 2>/dev/null
```

---

## What it does

When `ELECTRON_HEADLESS_CI=1` is set, main.ts enables three Chromium flags
**before** the app is ready:

| Flag | Purpose |
|---|---|
| `--disable-dev-shm-usage` | Use `/tmp` instead of `/dev/shm` (fixes GCP/container crashes) |
| `--ignore-gpu-blocklist` | Allow SwiftShader even without real GPU |
| `--use-gl swiftshader` | Software-rendered WebGL |

Additionally, `--no-sandbox` is required because Electron is often run as root
in container/CI environments. This only bypasses the Chromium sandbox;
`contextIsolation: true` and `nodeIntegration: false` are **not affected**.

---

## What is NOT tested headlessly

- Real GPU rendering / frame rate
- Fullscreen transitions
- Login flow against the GCP account server (requires network)
- Windows-specific behaviours (NSIS installer, registry, etc.)

Always run `npm run dev` on your local Windows machine for a complete test.
