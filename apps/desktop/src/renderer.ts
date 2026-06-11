// ===== Subway Surfer - Renderer Entry =====
// Loaded as an ES module after the legacy game.js bundle.
// Bridges Electron APIs to the game without modifying game logic.

/// <reference path="./types/desktop-api.d.ts" />
/// <reference types="vite/client" />

import { API_BASE_URL } from './config'
import { loadLocalSave, saveLocalGame, loadSettings, saveSettings } from './account/storageAdapter'
import type { GameSave, AppSettings } from './account/storageAdapter'

// ── Helpers ──────────────────────────────────────────────

const SG = (): any => (window as any).__SG

function getApiBaseUrl(): string {
  return (
    window.__SUBWAY_CONFIG__?.API_BASE_URL ||
    API_BASE_URL ||
    'http://localhost:3000'
  )
}

// ── Environment Detection ────────────────────────────────

if (window.desktopAPI) {
  console.log('[Subway Surfer] Running in Electron desktop shell')

  const apiUrl = getApiBaseUrl()
  console.log('[Subway Surfer] API_BASE_URL:', apiUrl)

  // ── Expose config to SG namespace ────────────────────────
  const s = SG()
  if (s) {
    s.runtime = 'electron'
    s.apiBaseUrl = apiUrl
  }

  // ── API connectivity check ──────────────────────────────
  ;(async () => {
    const s2 = SG()
    try {
      const resp = await fetch(apiUrl + '/api/leaderboard', {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      })
      if (s2) {
        s2.serverOnline = resp.ok
        s2.offlineMode = false
      }
      console.log('[Subway Surfer] Server online:', resp.ok)
      document.title = `Subway Surfer [${apiUrl}] ✓`
    } catch {
      if (s2) {
        s2.serverOnline = false
        s2.offlineMode = true
      }
      console.warn('[Subway Surfer] Server unreachable — offline mode')
      document.title = `Subway Surfer [offline]`
    }

    // Update status bar
    const statusEl = document.getElementById('electron-status-bar')
    if (statusEl) {
      updateStatusBar(statusEl, s2 ? s2.serverOnline : false, apiUrl)
    }
  })()

  // ── Storage Adapter Integration ─────────────────────────
  // Wrap SG.accountSave to persist locally on every save.
  // Cloud save (original) runs first; local save runs after.
  ;(async () => {
    const s3 = SG()
    if (!s3 || typeof s3.accountSave !== 'function') return

    const origSave = s3.accountSave
    s3.accountSave = function () {
      // Call original cloud save (no await — it's sync fetch)
      const result = origSave.apply(s3, arguments)

      // Also persist locally via storageAdapter
      const state = s3.state
      if (state) {
        const owned = [0]
        if (state.canDoubleJump) owned.push(1)
        if (state.canJetpack) owned.push(2)
        if (state.canRoofWalk) owned.push(3)

        const save: GameSave = {
          credits: state.credits || 0,
          totalCoins: state.totalCoins || 0,
          maxEasy: state.maxEasy || 0,
          maxMedium: state.maxMedium || 0,
          maxHard: state.maxHard || 0,
          maxDistance: state.bestScore || state.maxLegitDistance || 0,
          runCount: state.runCount || 0,
          ownedAbilities: owned,
          equippedAbility: state.equippedAbility || 0,
          updatedAt: new Date().toISOString(),
        }
        saveLocalGame(save).catch((e: Error) =>
          console.warn('[Subway Surfer] Local save failed:', e)
        )
      }

      return result
    }

    // Also wrap game over — auto-save is already inside game's gameOver,
    // which calls accountSave. The wrapper above handles the local side.
    console.log('[Subway Surfer] Storage adapter wired to SG.accountSave')

    // ── Create status bar ────────────────────────────────
    createStatusBar(apiUrl)

    // ── Restore local save on boot (if no cloud token) ──────
    if (!s3.account?.loggedIn) {
      try {
        const local = await loadLocalSave()
        const st = s3.state
        if (local && st) {
          if (local.credits > 0) st.credits = local.credits
          if (local.totalCoins > 0) st.totalCoins = local.totalCoins
          if (local.maxEasy > 0) st.maxEasy = local.maxEasy
          if (local.maxMedium > 0) st.maxMedium = local.maxMedium
          if (local.maxHard > 0) st.maxHard = local.maxHard
          if (local.maxDistance > 0) {
            st.bestScore = Math.max(st.bestScore || 0, local.maxDistance)
            st.maxLegitDistance = Math.max(st.maxLegitDistance || 0, local.maxDistance)
          }
          if (local.runCount > 0) st.runCount = local.runCount
          if (local.equippedAbility) st.equippedAbility = local.equippedAbility
          if (Array.isArray(local.ownedAbilities)) {
            st.canDoubleJump = local.ownedAbilities.indexOf(1) >= 0
            st.canJetpack = local.ownedAbilities.indexOf(2) >= 0
            st.canRoofWalk = local.ownedAbilities.indexOf(3) >= 0
          }
          // Persist to localStorage so game's own UI reads it too
          localStorage.setItem('subwayCredits', String(st.credits))
          localStorage.setItem('subwayTotalCoins', String(st.totalCoins))
          localStorage.setItem('subwayBest', String(st.bestScore || 0))
          console.log('[Subway Surfer] Local save restored')
        }
      } catch (e) {
        console.warn('[Subway Surfer] Local save restore failed:', e)
      }
    }
  })()

  // ── Settings sync ───────────────────────────────────────
  // On boot: read Electron settings and apply to game's localStorage keys.
  ;(async () => {
    try {
      const settings = await loadSettings()
      localStorage.setItem('subwayMusicVol', String(settings.musicVolume))
      localStorage.setItem('subwaySfxVol', String(settings.sfxVolume))
    } catch {
      // defaults are fine
    }
  })()

  // ── Intercept localStorage writes for settings keys ─────
  // When the game writes subwayMusicVol / subwaySfxVol via the UI,
  // also persist via storageAdapter.
  const origSetItem = localStorage.setItem.bind(localStorage)
  localStorage.setItem = (key: string, value: string) => {
    origSetItem(key, value)

    if (key === 'subwayMusicVol' || key === 'subwaySfxVol') {
      saveSettings({
        [key === 'subwayMusicVol' ? 'musicVolume' : 'sfxVolume']: parseFloat(value),
      }).catch(() => {})
    }
  }
} else {
  console.log('[Subway Surfer] Running in browser')
  console.log('[Subway Surfer] API_BASE_URL (Vite build):', API_BASE_URL)
}

// ── Status Bar ──────────────────────────────────────────

function createStatusBar(apiUrl: string): void {
  const bar = document.createElement('div')
  bar.id = 'electron-status-bar'
  bar.style.cssText = [
    'position:fixed',
    'bottom:0',
    'left:0',
    'right:0',
    'z-index:9999',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'gap:16px',
    'padding:3px 12px',
    'font-size:10px',
    'font-family:monospace',
    'color:rgba(255,255,255,0.5)',
    'background:rgba(0,0,0,0.6)',
    'pointer-events:none',
    'user-select:none',
  ].join(';')

  // API status
  bar.innerHTML = [
    '<span id="es-status-icon">⏳</span>',
    '<span id="es-status-text">Checking server…</span>',
    '<span id="es-url" style="color:rgba(255,255,255,0.35)">' + apiUrl + '</span>',
    '<span id="es-save-status" style="color:rgba(255,255,255,0.35)">local save ✓</span>',
  ].join('')

  document.body.appendChild(bar)
}

function updateStatusBar(el: HTMLElement, online: boolean | undefined, _apiUrl: string): void {
  const icon = el.querySelector('#es-status-icon')
  const text = el.querySelector('#es-status-text')
  if (icon && text) {
    if (online) {
      icon.textContent = '●'
      icon.setAttribute('style', 'color:#4CAF50')
      text.textContent = 'API online'
    } else {
      icon.textContent = '○'
      icon.setAttribute('style', 'color:#FF9800')
      text.textContent = 'offline — local save only'
    }
  }
}

// ── Desktop Key Bindings ─────────────────────────────────

if (window.desktopAPI) {
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'F11') {
      e.preventDefault()
      window.desktopAPI!.window.toggleFullscreen()
    }
  })
}

export {}
