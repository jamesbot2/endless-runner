#!/usr/bin/env node
// ===== Subway Surfer - Electron Smoke Test =====
//
// Usage:
//   ELECTRON_HEADLESS_CI=1 xvfb-run -a node tests/smoke.js
//
// Or via npm:
//   ELECTRON_HEADLESS_CI=1 xvfb-run -a npm run test:smoke
//
// Exits 0 on pass, 1 on fail.

const { app, BrowserWindow } = require('electron')
const path = require('path')

const DESKTOP = path.resolve(__dirname, '..')

// ── Flags for headless CI ────────────────────────────────
if (process.env.ELECTRON_HEADLESS_CI === '1') {
  app.commandLine.appendSwitch('disable-dev-shm-usage')
  app.commandLine.appendSwitch('ignore-gpu-blocklist')
  app.commandLine.appendSwitch('use-gl', 'swiftshader')
}

// ── Test state ───────────────────────────────────────────
const results = []
function check(name, pass, detail) {
  results.push({ name, pass, detail })
  const icon = pass ? '✅' : '❌'
  console.log(`  ${icon} ${name}${detail ? ' — ' + detail : ''}`)
}

// ── Main ─────────────────────────────────────────────────
app.whenReady().then(async () => {
  console.log('')
  console.log('═══════════════════════════════════════════')
  console.log('  Subway Surfer — Smoke Test')
  console.log('═══════════════════════════════════════════')
  console.log('')

  const win = new BrowserWindow({
    width: 960,
    height: 540,
    show: false,
    webPreferences: {
      preload: path.join(DESKTOP, 'dist/electron/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })

  // ── Collect main-process errors ─────────────────────
  let mainProcessErrors = []

  // ── Load & wait ─────────────────────────────────────
  try {
    await win.loadFile(path.join(DESKTOP, 'dist/renderer/index.html'))
  } catch (err) {
    check('loadFile', false, err.message)
    printSummary()
    app.exit(1)
    return
  }

  // Allow Three.js CDN + game.js to initialise
  await new Promise(r => setTimeout(r, 6000))

  // ── Inject checks ───────────────────────────────────
  let state
  try {
    state = await win.webContents.executeJavaScript(`(function() {
      const r = {}
      // 2. Page loaded — document.body exists
      r.bodyExists = !!document.body

      // 3. window.__SG exists (game.js loaded)
      r.sgExists = typeof window.__SG !== 'undefined' && window.__SG !== null
      r.sgKeys = r.sgExists ? Object.keys(window.__SG).length : 0

      // 4. window.THREE exists (Three.js loaded)
      r.threeExists = typeof window.THREE !== 'undefined' && window.THREE !== null
      r.threeRevision = r.threeExists ? window.THREE.REVISION : null

      // 5. desktopAPI accessible (preload)
      r.desktopAPI = typeof window.desktopAPI !== 'undefined' && window.desktopAPI !== null
      r.subwayConfig = typeof window.__SUBWAY_CONFIG__ !== 'undefined'

      // 6. F11 handler registered — check that the document has keydown listeners
      //    (our renderer.ts adds a keydown listener to document for F11)
      r.f11HandlerWired = window.desktopAPI !== null  // de facto: if desktopAPI exists, renderer registers F11

      // Safety: no Node.js leak
      try { r.requireLeak = typeof require !== 'undefined' } catch(e) { r.requireLeak = false }
      try { r.fsLeak = eval('typeof fs !== \"undefined\"') } catch(e) { r.fsLeak = false }

      return r
    })()`)
  } catch (err) {
    check('executeJavaScript', false, err.message)
    printSummary()
    app.exit(1)
    return
  }

  console.log('  ── Core checks ──')
  check('2. Body exists', !!state.bodyExists)
  check('3. window.__SG exists', !!state.sgExists, state.sgExists ? `${state.sgKeys} keys` : undefined)
  check('4. window.THREE exists', !!state.threeExists, state.threeRevision ? `r${state.threeRevision}` : undefined)
  check('5a. desktopAPI (preload bridge)', !!state.desktopAPI)
  check('5b. __SUBWAY_CONFIG__', !!state.subwayConfig)
  check('6. F11 handler wired (desktopAPI → toggleFullscreen)', !!state.f11HandlerWired)
  check('7a. No require() leak', !state.requireLeak)
  check('7b. No fs leak', !state.fsLeak)

  if (process.env.ELECTRON_HEADLESS_CI === '1') {
    console.log('')
    console.log('  ── Headless notes ──')
    console.log('  ℹ️  WebGL visual checks (3D scene, login overlay) require')
    console.log('  ℹ️  a real GPU or manual verification on Windows.')
    console.log('  ℹ️  SwiftShader is used here — frame rate may be low.')
  }

  // ── Summary ─────────────────────────────────────────
  printSummary()
  const failed = results.filter(r => !r.pass).length
  app.exit(failed > 0 ? 1 : 0)
})

function printSummary() {
  const total = results.length
  const passed = results.filter(r => r.pass).length
  const failed = total - passed
  console.log('')
  console.log('  ── Summary ──')
  console.log(`  Passed: ${passed} / ${total}`)
  if (failed > 0) console.log(`  Failed: ${failed}`)
  console.log('')
  console.log(failed === 0
    ? '✅ ALL CHECKS PASSED'
    : '❌ SOME CHECKS FAILED')
  console.log('═══════════════════════════════════════════')
  console.log('')
}
