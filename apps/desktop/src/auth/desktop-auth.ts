// ===== Subway Surfer - Desktop Auth UI =====
// Local login/register UI that calls the GCP account server via fetch.
// Overrides legacy game.js SG.showLogin / SG.doLogin / SG.doRegister
// without modifying game.js.
//
// Tab flow: Login → Register → Verify (post-registration)

/// <reference path="../types/desktop-api.d.ts" />

interface AuthCallbacks {
  onLoginSuccess: (data: { token: string; email: string; username: string; gameData?: any }) => void
  onOfflinePlay: () => void
}

export function initDesktopAuth(
  SG: any,
  API_BASE_URL: string,
  callbacks: AuthCallbacks
): void {
  if (!SG) return
  let currentTab: 'login' | 'register' | 'verify' = 'login'
  let captchaId: string | null = null
  let pendingEmail = ''

  // ── Load captcha ────────────────────────────────────
  async function loadCaptcha(): Promise<void> {
    try {
      const r = await fetch(API_BASE_URL + '/api/captcha', { signal: AbortSignal.timeout(5000) })
      const d = await r.json()
      captchaId = d.captchaId
      const el = document.getElementById('dc-captcha-svg')
      if (el) el.innerHTML = d.svg
    } catch {
      const el = document.getElementById('dc-captcha-svg')
      if (el) el.innerHTML = '<span style="color:#f44">⚠️ Captcha unavailable</span>'
    }
  }

  // ── Build UI ────────────────────────────────────────
  function buildUI(): HTMLElement {
    const overlay = document.createElement('div')
    overlay.id = 'dc-auth-overlay'
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:99998',
      'display:flex', 'align-items:center', 'justify-content:center',
      'background:rgba(0,0,0,0.85)',
      'font-family:Arial,sans-serif',
    ].join(';')

    overlay.innerHTML = `
      <div style="background:#16213e;padding:32px;border-radius:16px;text-align:center;max-width:380px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.5);color:#fff;">
        <div style="font-size:48px;margin-bottom:4px;">🏃</div>
        <div style="font-size:13px;color:#888;margin-bottom:16px;">Subway Surfer — Sign in to play</div>

        <!-- Tabs -->
        <div style="display:flex;gap:0;margin-bottom:16px;border-bottom:1px solid rgba(255,255,255,0.1);">
          <div id="dc-tab-login" class="dc-tab dc-tab-active" data-tab="login"
               style="flex:1;padding:8px;cursor:pointer;font-size:13px;font-weight:bold;color:#888;border-bottom:2px solid transparent;transition:all .2s;">
            LOGIN
          </div>
          <div id="dc-tab-reg" class="dc-tab" data-tab="register"
               style="flex:1;padding:8px;cursor:pointer;font-size:13px;font-weight:bold;color:#888;border-bottom:2px solid transparent;transition:all .2s;">
            REGISTER
          </div>
        </div>

        <!-- Login pane -->
        <div id="dc-pane-login">
          <input id="dc-login-email" type="email" placeholder="Email"
                 style="width:100%;padding:10px;margin:4px 0;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(0,0,0,0.4);color:#fff;font-size:14px;outline:none;box-sizing:border-box;">
          <input id="dc-login-pass" type="password" placeholder="Password"
                 style="width:100%;padding:10px;margin:4px 0;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(0,0,0,0.4);color:#fff;font-size:14px;outline:none;box-sizing:border-box;">
          <div id="dc-login-msg" style="font-size:12px;margin:6px 0;min-height:16px;"></div>
          <button id="dc-login-btn"
                  style="width:100%;padding:10px;border-radius:8px;border:2px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.08);color:#fff;font-size:14px;font-weight:bold;cursor:pointer;margin:4px 0;">
            LOGIN
          </button>
        </div>

        <!-- Register pane -->
        <div id="dc-pane-register" style="display:none;">
          <input id="dc-reg-name" type="text" placeholder="Username (2-16 chars)" maxlength="16"
                 style="width:100%;padding:10px;margin:4px 0;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(0,0,0,0.4);color:#fff;font-size:14px;outline:none;box-sizing:border-box;">
          <input id="dc-reg-email" type="email" placeholder="Email"
                 style="width:100%;padding:10px;margin:4px 0;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(0,0,0,0.4);color:#fff;font-size:14px;outline:none;box-sizing:border-box;">
          <input id="dc-reg-pass" type="password" placeholder="Password (6+ chars)"
                 style="width:100%;padding:10px;margin:4px 0;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(0,0,0,0.4);color:#fff;font-size:14px;outline:none;box-sizing:border-box;">
          <input id="dc-reg-pass2" type="password" placeholder="Confirm password"
                 style="width:100%;padding:10px;margin:4px 0;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(0,0,0,0.4);color:#fff;font-size:14px;outline:none;box-sizing:border-box;">
          <!-- Captcha -->
          <div id="dc-captcha-svg" style="margin:8px 0;display:flex;justify-content:center;min-height:60px;"></div>
          <div style="text-align:center;margin-bottom:4px;">
            <button id="dc-captcha-refresh"
                    style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);color:#aaa;cursor:pointer;font-size:12px;border-radius:4px;padding:3px 10px;">
              🔄 Refresh
            </button>
          </div>
          <input id="dc-reg-captcha" type="text" maxlength="5" placeholder="Enter code from image"
                 style="width:100%;padding:10px;margin:4px 0;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(0,0,0,0.4);color:#fff;font-size:14px;outline:none;box-sizing:border-box;text-align:center;letter-spacing:4px;">
          <div id="dc-reg-msg" style="font-size:12px;margin:6px 0;min-height:16px;"></div>
          <button id="dc-reg-btn"
                  style="width:100%;padding:10px;border-radius:8px;border:2px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.08);color:#fff;font-size:14px;font-weight:bold;cursor:pointer;margin:4px 0;">
            REGISTER
          </button>
        </div>

        <!-- Verify pane -->
        <div id="dc-pane-verify" style="display:none;">
          <p style="color:#aaa;font-size:13px;">Code sent to <span id="dc-verify-email" style="color:#fff;"></span></p>
          <input id="dc-verify-code" type="text" maxlength="6" placeholder="000000"
                 style="width:100%;padding:10px;margin:8px 0;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(0,0,0,0.4);color:#fff;font-size:22px;outline:none;box-sizing:border-box;text-align:center;letter-spacing:8px;font-weight:bold;">
          <div id="dc-verify-msg" style="font-size:12px;margin:6px 0;min-height:16px;"></div>
          <button id="dc-verify-btn"
                  style="width:100%;padding:10px;border-radius:8px;border:2px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.08);color:#fff;font-size:14px;font-weight:bold;cursor:pointer;margin:4px 0;">
            VERIFY
          </button>
        </div>

        <!-- Offline -->
        <div style="margin-top:12px;border-top:1px solid rgba(255,255,255,0.08);padding-top:10px;">
          <div style="font-size:11px;color:#666;margin-bottom:6px;">🌐 Server unreachable?</div>
          <button id="dc-offline-btn"
                  style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#888;cursor:pointer;font-size:12px;border-radius:6px;padding:6px 16px;">
            Play Offline (local save only)
          </button>
        </div>
      </div>
    `

    return overlay
  }

  // ── Show message ────────────────────────────────────
  function setMsg(elId: string, text: string, isError: boolean): void {
    const el = document.getElementById(elId)
    if (el) {
      el.textContent = text
      el.style.color = isError ? '#ff6b6b' : '#4CAF50'
    }
  }

  function clearMsg(elId: string): void {
    const el = document.getElementById(elId)
    if (el) { el.textContent = ''; el.style.color = '' }
  }

  // ── Tab switching ───────────────────────────────────
  function switchTab(tab: 'login' | 'register' | 'verify'): void {
    currentTab = tab
    const tabs = ['login', 'register', 'verify']
    tabs.forEach(t => {
      const tabEl = document.getElementById('dc-tab-' + (t === 'login' ? 'login' : t === 'register' ? 'reg' : 'verify'))
      const paneEl = document.getElementById('dc-pane-' + t)
      if (tabEl) {
        tabEl.style.color = t === tab ? '#fff' : '#888'
        tabEl.style.borderBottomColor = t === tab ? '#ff6600' : 'transparent'
      }
      if (paneEl) paneEl.style.display = t === tab ? '' : 'none'
    })
    if (tab === 'register') loadCaptcha()
  }

  // ── Login ───────────────────────────────────────────
  async function doLogin(): Promise<void> {
    clearMsg('dc-login-msg')
    const email = (document.getElementById('dc-login-email') as HTMLInputElement)?.value.trim()
    const pass = (document.getElementById('dc-login-pass') as HTMLInputElement)?.value
    if (!email || !pass) { setMsg('dc-login-msg', 'Email and password required', true); return }

    const btn = document.getElementById('dc-login-btn') as HTMLButtonElement
    btn.disabled = true; btn.textContent = '⏳ Logging in…'

    try {
      const r = await fetch(API_BASE_URL + '/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
        signal: AbortSignal.timeout(10000),
      })
      const data = await r.json()
      if (data.error) { setMsg('dc-login-msg', data.error, true); btn.disabled = false; btn.textContent = 'LOGIN'; return }
      hideAuth()
      callbacks.onLoginSuccess(data)
    } catch {
      setMsg('dc-login-msg', 'Cannot reach server. Check connection or play offline.', true)
      btn.disabled = false; btn.textContent = 'LOGIN'
    }
  }

  // ── Register ────────────────────────────────────────
  async function doRegister(): Promise<void> {
    clearMsg('dc-reg-msg')
    const name = (document.getElementById('dc-reg-name') as HTMLInputElement)?.value.trim()
    const email = (document.getElementById('dc-reg-email') as HTMLInputElement)?.value.trim()
    const pass = (document.getElementById('dc-reg-pass') as HTMLInputElement)?.value
    const pass2 = (document.getElementById('dc-reg-pass2') as HTMLInputElement)?.value
    const captchaAnswer = (document.getElementById('dc-reg-captcha') as HTMLInputElement)?.value.trim()

    if (!name || name.length < 2) { setMsg('dc-reg-msg', 'Username must be 2-16 characters', true); return }
    if (!email) { setMsg('dc-reg-msg', 'Email required', true); return }
    if (!pass || pass.length < 6) { setMsg('dc-reg-msg', 'Password must be at least 6 characters', true); return }
    if (pass !== pass2) { setMsg('dc-reg-msg', 'Passwords do not match', true); return }
    if (!captchaId || !captchaAnswer) { setMsg('dc-reg-msg', 'Please enter the captcha code', true); return }

    const btn = document.getElementById('dc-reg-btn') as HTMLButtonElement
    btn.disabled = true; btn.textContent = '⏳ Registering…'

    try {
      const r = await fetch(API_BASE_URL + '/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass, username: name, captchaId, captchaAnswer }),
        signal: AbortSignal.timeout(10000),
      })
      const data = await r.json()
      if (data.error) { setMsg('dc-reg-msg', data.error, true); btn.disabled = false; btn.textContent = 'REGISTER'; loadCaptcha(); return }

      // Registration successful → show verify pane
      pendingEmail = email
      const verifyEmailEl = document.getElementById('dc-verify-email')
      if (verifyEmailEl) verifyEmailEl.textContent = email
      setMsg('dc-reg-msg', '', false)
      btn.disabled = false; btn.textContent = 'REGISTER'
      switchTab('verify')
    } catch {
      setMsg('dc-reg-msg', 'Cannot reach server. Try again.', true)
      btn.disabled = false; btn.textContent = 'REGISTER'
    }
  }

  // ── Verify code ─────────────────────────────────────
  async function doVerify(): Promise<void> {
    clearMsg('dc-verify-msg')
    const code = (document.getElementById('dc-verify-code') as HTMLInputElement)?.value.trim()
    if (!code) { setMsg('dc-verify-msg', 'Enter the verification code', true); return }

    const btn = document.getElementById('dc-verify-btn') as HTMLButtonElement
    btn.disabled = true; btn.textContent = '⏳ Verifying…'

    try {
      const r = await fetch(API_BASE_URL + '/api/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail, code }),
        signal: AbortSignal.timeout(10000),
      })
      const data = await r.json()
      if (data.error) { setMsg('dc-verify-msg', data.error, true); btn.disabled = false; btn.textContent = 'VERIFY'; return }

      setMsg('dc-verify-msg', '✅ Email verified! You can now log in.', false)
      btn.disabled = false; btn.textContent = 'VERIFY'
      setTimeout(() => switchTab('login'), 1500)
    } catch {
      setMsg('dc-verify-msg', 'Cannot reach server. Try again.', true)
      btn.disabled = false; btn.textContent = 'VERIFY'
    }
  }

  // ── Show / Hide ─────────────────────────────────────
  function showAuth(firstFocus?: boolean): void {
    let overlay = document.getElementById('dc-auth-overlay')
    if (!overlay) {
      overlay = buildUI()
      document.body.appendChild(overlay)
      bindEvents(overlay)
    }
    overlay.style.display = 'flex'
    if (firstFocus) {
      const emailEl = document.getElementById('dc-login-email') as HTMLInputElement
      setTimeout(() => emailEl?.focus(), 100)
    }
  }

  function hideAuth(): void {
    const overlay = document.getElementById('dc-auth-overlay')
    if (overlay) overlay.style.display = 'none'
  }

  // ── Bind events ─────────────────────────────────────
  function bindEvents(overlay: HTMLElement): void {
    // Tab switches
    overlay.querySelectorAll('.dc-tab').forEach(el => {
      el.addEventListener('click', () => {
        const tab = el.getAttribute('data-tab') as 'login' | 'register'
        switchTab(tab)
      })
    })

    // Login button
    document.getElementById('dc-login-btn')?.addEventListener('click', doLogin)

    // Register button
    document.getElementById('dc-reg-btn')?.addEventListener('click', doRegister)

    // Verify button
    document.getElementById('dc-verify-btn')?.addEventListener('click', doVerify)

    // Captcha refresh
    document.getElementById('dc-captcha-refresh')?.addEventListener('click', () => loadCaptcha())

    // Offline button
    document.getElementById('dc-offline-btn')?.addEventListener('click', () => {
      hideAuth()
      callbacks.onOfflinePlay()
    })

    // Enter key submission
    overlay.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return
      if (currentTab === 'login') doLogin()
      else if (currentTab === 'register') doRegister()
      else if (currentTab === 'verify') doVerify()
    })
  }

  // ── Override SG auth functions ──────────────────────
  // Store originals
  const origShowLogin = SG.showLogin
  const origDoLogin = SG.doLogin
  const origDoRegister = SG.doRegister
  const origHideLogin = SG.hideLogin

  // Override showLogin — blocks pin-code overlay from game.js
  SG.showLogin = function (firstTime?: boolean) {
    // Hide any legacy login overlay if it exists
    const legacyOverlay = document.getElementById('login-overlay')
    if (legacyOverlay) legacyOverlay.style.display = 'none'
    showAuth(firstTime)
  }

  SG.doLogin = function () {
    // Forward to our auth UI — show it if hidden
    showAuth()
    // If there are field values in legacy form, copy them over
    const legacyEmail = (document.getElementById('login-email') as HTMLInputElement)?.value
    const legacyPass = (document.getElementById('login-pass') as HTMLInputElement)?.value
    if (legacyEmail) {
      const dcEmail = document.getElementById('dc-login-email') as HTMLInputElement
      if (dcEmail) dcEmail.value = legacyEmail
    }
    if (legacyPass) {
      const dcPass = document.getElementById('dc-login-pass') as HTMLInputElement
      if (dcPass) dcPass.value = legacyPass
    }
  }

  SG.doRegister = function () {
    switchTab('register')
    showAuth()
  }

  SG.hideLogin = function () {
    hideAuth()
    // Remove legacy overlay too
    const legacyOverlay = document.getElementById('login-overlay')
    if (legacyOverlay) legacyOverlay.style.display = 'none'
  }

  // Expose our functions for the game to call
  ;(SG as any).__desktopAuth = { doLogin, doRegister, doVerify, switchTab, showAuth, hideAuth }
}
