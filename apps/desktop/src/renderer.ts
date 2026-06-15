// ===== Endless Runner - Renderer Entry =====
// Loaded as an ES module after the legacy game.js bundle.
// Bridges Electron APIs to the game without modifying game logic.

/// <reference path="./types/desktop-api.d.ts" />
/// <reference types="vite/client" />

import { API_BASE_URL } from './config'
import { loadLocalSave, saveLocalGame, loadSettings, saveSettings } from './account/storageAdapter'
import type { GameSave, AppSettings } from './account/storageAdapter'
import { initDesktopAuth } from './auth/desktop-auth'

// ── Helpers ──────────────────────────────────────────────

const SG = (): any => (window as any).__SG

function getApiBaseUrl(): string {
  return (
    window.__ENDLESS_RUNNER_CONFIG__?.API_BASE_URL ||
    window.__SUBWAY_CONFIG__?.API_BASE_URL ||
    API_BASE_URL ||
    'http://localhost:3000'
  )
}

// ── Environment Detection ────────────────────────────────

if (window.desktopAPI) {
  console.log('[Endless Runner] Running in Electron desktop shell')

  const apiUrl = getApiBaseUrl()
  console.log('[Endless Runner] API_BASE_URL:', apiUrl)

  // ── Expose config to SG namespace ────────────────────────
  const s = SG()
  if (s) {
    s.runtime = 'electron'
    s.apiBaseUrl = apiUrl

    // Immediately suppress legacy login overlay (game.js may have shown it)
    // The full auth UI override is set up below once async init completes.
    const legacyOverlay = document.getElementById('login-overlay')
    if (legacyOverlay) legacyOverlay.style.display = 'none'
  }

  // ── API connectivity check ──────────────────────────────
  ;(async () => {
    const s2 = SG()
    let online = false
    try {
      const resp = await fetch(apiUrl + '/api/leaderboard', {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      })
      online = resp.ok
      if (s2) {
        s2.serverOnline = online
        s2.offlineMode = !online
      }
      console.log('[Endless Runner] Server online:', online)
      document.title = online ? `Endless Runner [online]` : `Endless Runner [offline]`
    } catch {
      if (s2) {
        s2.serverOnline = false
        s2.offlineMode = true
      }
      console.warn('[Endless Runner] Server unreachable — offline mode')
      document.title = `Endless Runner [offline]`
    }

    // Update status bar
    const statusEl = document.getElementById('electron-status-bar')
    if (statusEl) {
      updateStatusBar(statusEl, online, apiUrl)
    }
  })()

  // ── Storage Adapter Integration ─────────────────────────
  // Wrap SG.accountSave to persist locally on every save.
  ;(async () => {
    const s3 = SG()
    if (!s3 || typeof s3.accountSave !== 'function') return

    const origSave = s3.accountSave
    s3.accountSave = function () {
      const result = origSave.apply(s3, arguments)

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
          ownedCharacters: Array.isArray(state.ownedCharacters) ? state.ownedCharacters : ['runner'],
          selectedCharacter: state.selectedCharacter || 'runner',
          updatedAt: new Date().toISOString(),
        }
        saveLocalGame(save).catch((e: Error) =>
          console.warn('[Endless Runner] Local save failed:', e)
        )
      }
      return result
    }

    console.log('[Endless Runner] Storage adapter wired to SG.accountSave')

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
          if (Array.isArray(local.ownedCharacters) && local.ownedCharacters.length > 0) {
            st.ownedCharacters = local.ownedCharacters
            localStorage.setItem('subwayOwnedCharacters', JSON.stringify(local.ownedCharacters))
          }
          if (local.selectedCharacter && typeof local.selectedCharacter === 'string') {
            st.selectedCharacter = local.selectedCharacter
            localStorage.setItem('subwaySelectedCharacter', local.selectedCharacter)
            if (
              typeof s3.selectCharacter === 'function' &&
              typeof s3.characterIsOwned === 'function' &&
              s3.characterIsOwned(local.selectedCharacter)
            ) {
              s3.selectCharacter(local.selectedCharacter)
            }
          }
          localStorage.setItem('subwayCredits', String(st.credits))
          localStorage.setItem('subwayTotalCoins', String(st.totalCoins))
          localStorage.setItem('subwayBest', String(st.bestScore || 0))
          console.log('[Endless Runner] Local save restored')
        }
      } catch (e) {
        console.warn('[Endless Runner] Local save restore failed:', e)
      }
    }

    // ── Initialize desktop auth UI ─────────────────────────
    initDesktopAuth(s3, apiUrl, {
      onLoginSuccess: (data) => {
        // Match what legacy SG.doLogin does
        s3.account.token = data.token
        s3.account.email = data.email
        s3.account.loggedIn = true
        localStorage.setItem('subwayToken', data.token)
        localStorage.setItem('subwayEmail', data.email)

        if (typeof s3.applyGameData === 'function') {
          s3.applyGameData(data.gameData || {
            coins: 0,
            credits: 0,
            totalCoins: 0,
            equippedAbility: 0,
            ownedAbilities: [0],
            maxDistance: 0,
            maxEasy: 0,
            maxMedium: 0,
            maxHard: 0,
            maxEasyAbility: 0,
            maxMediumAbility: 0,
            maxHardAbility: 0,
            runCount: 0,
            highScore: 0,
            ownedCharacters: ['runner'],
            selectedCharacter: 'runner',
          })
        }

        s3.account.username = data.username || data.email.split('@')[0]
        localStorage.setItem('subwayUsername', s3.account.username)

        // Update account button if it exists
        const btn = document.getElementById('account-btn-menu')
        if (btn) btn.textContent = '👤 ' + s3.account.username

        // Show main menu (same as legacy SG.doLogin does)
        if (s3.menuOverlay) s3.menuOverlay.style.display = 'flex'
      },
      onOfflinePlay: () => {
        console.log('[Endless Runner] Playing offline (local saves only)')
        s3.account.loggedIn = false
        // Show main menu directly
        if (s3.menuOverlay) s3.menuOverlay.style.display = 'flex'
      },
    })

    // Force our auth UI to show — game.js showed the legacy overlay
    // before our override was in place, so we re-trigger.
    const lo = document.getElementById('login-overlay')
    if (lo) lo.style.display = 'none'
    if (!s3.account?.loggedIn) {
      // Directly call our showAuth (bypass showLogin to avoid recursion)
      const auth = (s3 as any).__desktopAuth
      if (auth && typeof auth.showAuth === 'function') {
        auth.showAuth(true)
      } else if (typeof s3.showLogin === 'function') {
        // Fallback: use the overridden showLogin
        s3.showLogin(true)
      }
    }
    console.log('[Endless Runner] Desktop auth UI initialized')
  })()

  // ── Settings sync ───────────────────────────────────────
  ;(async () => {
    try {
      const settings = await loadSettings()
      localStorage.setItem('subwayMusicVol', String(settings.musicVolume))
      localStorage.setItem('subwaySfxVol', String(settings.sfxVolume))
      if (typeof settings.rollReleaseDelay === 'number') {
        localStorage.setItem('subwayRollReleaseDelay', String(settings.rollReleaseDelay))
        const s4 = SG()
        if (s4?.state) s4.state.rollReleaseDelay = settings.rollReleaseDelay
      }
      if (typeof settings.thirdPersonView === 'string') {
        localStorage.setItem('subwayThirdPersonView', settings.thirdPersonView)
        const sView = SG()
        if (sView?.state) sView.state.thirdPersonView = settings.thirdPersonView
      }
      if (settings.keyBindings && typeof settings.keyBindings === 'object') {
        localStorage.setItem('subwayKeyBindings', JSON.stringify(settings.keyBindings))
        const s5 = SG()
        if (s5 && typeof s5.loadKeyBindings === 'function') s5.loadKeyBindings()
      }
    } catch {
      // defaults are fine
    }
  })()

  // ── Intercept localStorage writes for settings keys ─────
  const origSetItem = localStorage.setItem.bind(localStorage)
  localStorage.setItem = (key: string, value: string) => {
    origSetItem(key, value)

    if (key === 'subwayMusicVol' || key === 'subwaySfxVol') {
      saveSettings({
        [key === 'subwayMusicVol' ? 'musicVolume' : 'sfxVolume']: parseFloat(value),
      }).catch(() => {})
    }
    if (key === 'subwayRollReleaseDelay') {
      saveSettings({ rollReleaseDelay: parseInt(value, 10) }).catch(() => {})
    }
    if (key === 'subwayThirdPersonView') {
      saveSettings({ thirdPersonView: value }).catch(() => {})
    }
    if (key === 'subwayKeyBindings') {
      try {
        saveSettings({ keyBindings: JSON.parse(value) }).catch(() => {})
      } catch {
        // ignore malformed transient values
      }
    }
  }
} else {
  console.log('[Endless Runner] Running in browser')
  console.log('[Endless Runner] API_BASE_URL (Vite build):', API_BASE_URL)
}

// ── Status Bar ──────────────────────────────────────────

function createStatusBar(_apiUrl: string): void {
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

  bar.innerHTML = [
    '<span id="es-status-icon">⏳</span>',
    '<span id="es-status-text">Checking server…</span>',
    '<span id="es-pvp-status" style="display:none;color:rgba(255,255,255,0.5)">PVP offline</span>',
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

const pvpStatusOwner = SG()
if (pvpStatusOwner) {
  pvpStatusOwner.updatePvpStatusBar = function (state: string) {
    const el = document.getElementById('es-pvp-status')
    if (!el) return
    if (state === 'online') {
      el.textContent = 'PVP online'
      el.style.color = '#4CAF50'
    } else if (state === 'reconnecting') {
      el.textContent = 'reconnecting'
      el.style.color = '#FFA500'
    } else {
      el.textContent = 'PVP offline'
      el.style.color = 'rgba(255,255,255,0.5)'
    }
    el.style.display = 'inline'
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
