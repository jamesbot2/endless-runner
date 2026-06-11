// ===== Subway Surfer - Renderer Entry =====
// Loaded as an ES module after the legacy game.js bundle.
// Bridges Electron APIs to the game without modifying game logic.

/// <reference path="./types/desktop-api.d.ts" />
/// <reference types="vite/client" />

import { API_BASE_URL } from './config'

// ── Environment Detection ────────────────────────────────

if (window.desktopAPI) {
  console.log('[Subway Surfer] Running in Electron desktop shell')

  // In Electron, __SUBWAY_CONFIG__ is set by preload BEFORE game.js loads,
  // so legacy code can read it at init time via:
  //
  //   var API = (window.__SUBWAY_CONFIG__ && window.__SUBWAY_CONFIG__.API_BASE_URL)
  //            || 'http://' + (window.location.hostname || '35.212.200.85') + ':3000';
  //
  if (window.__SUBWAY_CONFIG__) {
    console.log('[Subway Surfer] API_BASE_URL:', window.__SUBWAY_CONFIG__.API_BASE_URL)
  }

  // Expose Electron info to the game's SG namespace (read-only)
  const SG = (window as any).__SG
  if (SG) {
    SG.runtime = 'electron'
  }
} else {
  console.log('[Subway Surfer] Running in browser')
  console.log('[Subway Surfer] API_BASE_URL (Vite build):', API_BASE_URL)
}

// ── Desktop Key Bindings ─────────────────────────────────
// These run alongside game.js's own keydown handler without interference.
// game.js checks: Escape, arrows, WASD, Space, Enter, ~/`, m/M — NOT F11.

if (window.desktopAPI) {
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'F11') {
      e.preventDefault()
      window.desktopAPI!.window.toggleFullscreen()
    }
  })
}

export {}
