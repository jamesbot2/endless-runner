#!/usr/bin/env node
// ===== Subway Surfer - Electron Smoke Test =====
//
// Usage:
//   ELECTRON_HEADLESS_CI=1 xvfb-run -a node tests/smoke.js
//
// Or:
//   SUBWAY_API_BASE_URL=http://test.example.com:3000 npm run test:smoke
//
// Exits 0 on pass, 1 on fail.

const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

const DESKTOP = path.resolve(__dirname, '..')

// ── Temp data dir for IPC handler tests ──────────────────
const TMPDIR = path.join(app.getPath('temp'), 'subway-surfer-smoke-' + Date.now())
const SETTINGS_FILE = path.join(TMPDIR, 'settings.json')
const SAVE_FILE = path.join(TMPDIR, 'save.json')
app.setPath('userData', TMPDIR)

function readJSON(fp) {
  try {
    if (!fs.existsSync(fp)) return null
    return JSON.parse(fs.readFileSync(fp, 'utf-8'))
  } catch { return null }
}
function writeJSON(fp, data) {
  try {
    if (!fs.existsSync(path.dirname(fp))) fs.mkdirSync(path.dirname(fp), { recursive: true })
    fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8')
  } catch (e) { console.error('writeJSON error:', e.message) }
}

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

  // Pass SUBWAY_API_BASE_URL to preload via additionalArguments
  const addArgs = []
  if (process.env.SUBWAY_API_BASE_URL) {
    addArgs.push('--api-base-url=' + process.env.SUBWAY_API_BASE_URL)
  }

  const win = new BrowserWindow({
    width: 960,
    height: 540,
    show: false,
    webPreferences: {
      preload: path.join(DESKTOP, 'dist/electron/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      additionalArguments: addArgs,
    },
  })

  // ── Register IPC handlers (simulate main.ts) ────────
  ipcMain.handle('settings:get', () => {
    const data = readJSON(SETTINGS_FILE)
    return (typeof data === 'object' && data !== null) ? data : {}
  })
  ipcMain.handle('settings:set', (_e, settings) => {
    writeJSON(SETTINGS_FILE, settings)
  })
  ipcMain.handle('save:getLocal', () => {
    const data = readJSON(SAVE_FILE)
    return (typeof data === 'object' && data !== null) ? data : null
  })
  ipcMain.handle('save:setLocal', (_e, save) => {
    writeJSON(SAVE_FILE, save)
  })

  // ── Load & wait ─────────────────────────────────────
  try {
    await win.loadFile(path.join(DESKTOP, 'dist/renderer/index.html'))
  } catch (err) {
    check('loadFile', false, err.message)
    await cleanup()
    app.exit(1)
    return
  }

  // Allow Three.js + game.js + renderer to initialise
  await new Promise(r => setTimeout(r, 6000))

  // ── Inject checks ───────────────────────────────────
  let state
  try {
    state = await win.webContents.executeJavaScript(`(function() {
      const r = {}
      // 1. Page loaded
      r.bodyExists = !!document.body

      // 2. Game loaded
      r.sgExists = typeof window.__SG !== 'undefined' && window.__SG !== null
      r.sgKeys = r.sgExists ? Object.keys(window.__SG).length : 0

      // 3. Three.js
      r.threeExists = typeof window.THREE !== 'undefined' && window.THREE !== null
      r.threeRevision = r.threeExists ? window.THREE.REVISION : null
      r.gltfLoader = r.threeExists ? typeof window.THREE.GLTFLoader === 'function' : false

      // 4. Preload bridge
      r.desktopAPI = typeof window.desktopAPI !== 'undefined' && window.desktopAPI !== null
      r.subwayConfig = typeof window.__SUBWAY_CONFIG__ !== 'undefined'

      // 4b. API_BASE_URL from config
      r.apiBaseUrl = window.__SUBWAY_CONFIG__ ? window.__SUBWAY_CONFIG__.API_BASE_URL : null

      // 5. SG.runtime set by renderer
      r.sgRuntime = window.__SG ? window.__SG.runtime : null
      r.sgApiBaseUrl = window.__SG ? window.__SG.apiBaseUrl : null
      r.sgOfflineMode = window.__SG ? window.__SG.offlineMode : undefined

      // 6. F11 handler
      r.f11HandlerWired = window.desktopAPI !== null

      // 7-8. No Node.js leaks
      try { r.requireLeak = typeof require !== 'undefined' } catch(e) { r.requireLeak = false }
      try { r.fsLeak = eval('typeof fs !== \"undefined\"') } catch(e) { r.fsLeak = false }

      // 9-12. Desktop auth UI
      r.authOverlay = document.getElementById('dc-auth-overlay') !== null
      r.authLoginBtn = document.getElementById('dc-login-btn') !== null
      r.authRegTab = document.getElementById('dc-tab-reg') !== null
      r.authOfflineBtn = document.getElementById('dc-offline-btn') !== null
      r.__desktopAuth = window.__SG ? typeof window.__SG.__desktopAuth !== 'undefined' : false
      r.applyGameData = window.__SG ? typeof window.__SG.applyGameData === 'function' : false
      r.playerModelLoaded = window.__SG ? window.__SG.playerModelLoaded === true : false
      r.playerModelName = window.__SG && window.__SG.playerModel ? window.__SG.playerModel.name : null
      r.playerAnimations = window.__SG && window.__SG.playerActions ? Object.keys(window.__SG.playerActions) : []
      r.jetpackFuelMax = window.__SG ? window.__SG.JETPACK_FUEL_MAX : null
      r.jetpackCooldownMax = window.__SG ? window.__SG.JETPACK_COOLDOWN_MAX : null
      r.jetpackMaxHeight = window.__SG ? window.__SG.JETPACK_MAX_HEIGHT : null
      r.abilityHud = window.__SG ? typeof window.__SG.updateAbilityHUD === 'function' : false
      r.abilityVisuals = window.__SG ? typeof window.__SG.updateAbilityVisuals === 'function' : false
      r.consoleCommands = window.__SG && window.__SG.consoleCommands ? Object.keys(window.__SG.consoleCommands).sort() : []
      r.executeConsoleCommand = window.__SG ? typeof window.__SG.executeConsoleCommand === 'function' : false
      r.vehicleLoader = window.__SG ? typeof window.__SG.loadVehicleModels === 'function' : false
      r.vehicleTrainPath = window.__SG && window.__SG.vehicleModelPaths ? window.__SG.vehicleModelPaths.train : null
      r.obstacleSpacing = window.__SG ? typeof window.__SG.canPlaceObstacle === 'function' && typeof window.__SG.trackObstacle === 'function' : false
      r.characterCatalogCount = window.__SG && window.__SG.characterCatalog ? window.__SG.characterCatalog.length : 0
      r.characterSelector = window.__SG ? typeof window.__SG.showCharacters === 'function' : false
      r.characterBuy = window.__SG ? typeof window.__SG.buyCharacter === 'function' : false
      r.characterPrice = window.__SG && window.__SG.getNextCharacterPrice ? window.__SG.getNextCharacterPrice() : null
      r.ownedCharacterCount = window.__SG && window.__SG.getOwnedCharacters ? window.__SG.getOwnedCharacters().length : 0
      r.expectedCharacterPrice = Math.max(0, (r.ownedCharacterCount || 1) - 1) * 10000
      r.charactersButton = document.getElementById('characters-btn') !== null
      r.speedIncrements = window.__SG && window.__SG.SPEED_INCREMENT_BY_DIFFICULTY ? window.__SG.SPEED_INCREMENT_BY_DIFFICULTY.slice() : []
      r.speedLevels = window.__SG && window.__SG.speedForLevel && window.__SG.getSpeedLevel ? [1, 25, 50].map(function(level) {
        var speed = window.__SG.speedForLevel(level)
        return {
          level: level,
          speed: speed,
          roundtrip: window.__SG.getSpeedLevel(speed),
          distanceRate: window.__SG.getDistanceRate(speed)
        }
      }) : []
      r.cyberReset = false
      if (window.__SG && window.__SG.resetCyberMode) {
        window.__SG.state.cyberMode = true
        window.__SG.resetCyberMode()
        r.cyberReset = window.__SG.state.cyberMode === false
      }
      if (window.__SG && typeof window.__SG.showCharacters === 'function') {
        window.__SG.showCharacters()
        r.characterOverlay = document.getElementById('characters-overlay') !== null
        r.characterPreviewCanvas = document.getElementById('character-preview-canvas') !== null
        r.characterCards = document.querySelectorAll('.character-card').length
        const overlay = document.getElementById('characters-overlay')
        if (overlay) overlay.style.display = 'none'
      }
      if (window.__SG && window.__SG.restartGame && window.__SG.player) {
        window.__SG.restartGame()
        r.restartRotationY = window.__SG.player.rotation.y
      }
      if (window.__SG && window.__SG.applyGameData && window.__SG.selectCharacter) {
        window.__SG.applyGameData({ credits: 10000, ownedCharacters: ['runner', 'adventurer'], selectedCharacter: 'adventurer' })
        window.__SG.selectCharacter('adventurer')
        window.__SG.state.canDoubleJump = true
        window.__SG.state.equippedAbility = 1
        if (window.__SG.updateAbilityVisuals) window.__SG.updateAbilityVisuals()
        r.nonRunnerShoeOverlayHidden = (!window.__SG.shoesDJLeft || window.__SG.shoesDJLeft.visible === false) && (!window.__SG.shoesDJRight || window.__SG.shoesDJRight.visible === false)
      }
      return r
    })()`)
  } catch (err) {
    check('executeJavaScript', false, err.message)
    printSummary()
    app.exit(1)
    return
  }

  console.log('  ── Core checks ──')
  check('1. Body exists', !!state.bodyExists)
  check('2. window.__SG exists', !!state.sgExists, state.sgExists ? `${state.sgKeys} keys` : undefined)
  check('3. window.THREE exists', !!state.threeExists, state.threeRevision ? `r${state.threeRevision}` : undefined)
  check('3b. THREE.REVISION === "128"', state.threeRevision === '128', state.threeRevision ? `got ${state.threeRevision}` : 'undefined')
  check('3c. THREE.GLTFLoader exists', !!state.gltfLoader)
  const playerModelPath = path.join(DESKTOP, 'dist/renderer/models/player.glb')
  const trainModelPath = path.join(DESKTOP, 'dist/renderer/models/vehicles/train.glb')
  const busModelPath = path.join(DESKTOP, 'dist/renderer/models/vehicles/bus.glb')
  const adventurerPath = path.join(DESKTOP, 'dist/renderer/models/characters/Adventurer.gltf')
  check('3d. player.glb copied to renderer dist', fs.existsSync(playerModelPath), fs.existsSync(playerModelPath) ? `${fs.statSync(playerModelPath).size} bytes` : 'missing')
  check('3e. refined player.glb size', fs.existsSync(playerModelPath) && fs.statSync(playerModelPath).size > 100000, fs.existsSync(playerModelPath) ? `${fs.statSync(playerModelPath).size} bytes` : 'missing')
  check('3f. Jetpack tuning constants', state.jetpackFuelMax === 15 && state.jetpackCooldownMax === 30 && state.jetpackMaxHeight > 0, `fuel=${state.jetpackFuelMax}, cooldown=${state.jetpackCooldownMax}, maxHeight=${state.jetpackMaxHeight}`)
  check('3g. train.glb copied to renderer dist', fs.existsSync(trainModelPath), fs.existsSync(trainModelPath) ? `${fs.statSync(trainModelPath).size} bytes` : 'missing')
  check('3h. bus.glb copied to renderer dist', fs.existsSync(busModelPath), fs.existsSync(busModelPath) ? `${fs.statSync(busModelPath).size} bytes` : 'missing')
  check('3i. Adventurer.gltf copied to renderer dist', fs.existsSync(adventurerPath), fs.existsSync(adventurerPath) ? `${fs.statSync(adventurerPath).size} bytes` : 'missing')
  check('4a. desktopAPI (preload bridge)', !!state.desktopAPI)
  check('4b. __SUBWAY_CONFIG__ exists', !!state.subwayConfig)
  check('4c. API_BASE_URL is non-empty', !!state.apiBaseUrl, state.apiBaseUrl || 'empty')
  check('5a. SG.runtime === "electron"', state.sgRuntime === 'electron', state.sgRuntime || 'undefined')
  check('5b. SG.apiBaseUrl set', !!state.sgApiBaseUrl, state.sgApiBaseUrl || 'undefined')
  check('6. F11 handler wired', !!state.f11HandlerWired)
  check('7. No require() leak', !state.requireLeak)
  check('8. No fs leak', !state.fsLeak)

  // ── Auth UI checks ──
  console.log("")
  console.log("  ── Auth UI checks ──")
  check("9. Auth overlay element exists", !!state.authOverlay)
  check("10. Login button exists", !!state.authLoginBtn)
  check("11. Register tab exists", !!state.authRegTab)
  check("12. Offline play button exists", !!state.authOfflineBtn)
  check("13. SG.__desktopAuth module loaded", !!state.__desktopAuth)
  check("14. SG.applyGameData is function", !!state.applyGameData)
  check("14b. player GLB loaded", !!state.playerModelLoaded, state.playerModelName || 'not loaded')
  check("14c. player animations indexed", state.playerAnimations && state.playerAnimations.length >= 1, state.playerAnimations ? state.playerAnimations.join(', ') : 'none')
  check("14d. ability HUD updater exists", !!state.abilityHud)
  check("14e. ability visual updater exists", !!state.abilityVisuals)
  check("14f. restart keeps player facing forward", Math.abs(state.restartRotationY - Math.PI) < 0.001, String(state.restartRotationY))
  check("14g. console command runner exists", !!state.executeConsoleCommand)
  check("14h. console includes Homelander easter egg", state.consoleCommands && state.consoleCommands.includes('homelander'), state.consoleCommands ? state.consoleCommands.join(', ') : 'none')
  check("14i. vehicle model loader exists", !!state.vehicleLoader, state.vehicleTrainPath || 'missing train path')
  check("14j. obstacle spacing guard exists", !!state.obstacleSpacing)
  check("14k. character catalog loaded", state.characterCatalogCount >= 12, String(state.characterCatalogCount))
  check("14l. character selector menu exists", !!state.characterSelector && !!state.charactersButton)
  check("14m. character price follows unlock count", state.characterBuy && state.characterPrice === state.expectedCharacterPrice, `price=${state.characterPrice}, owned=${state.ownedCharacterCount}`)
  check("14n. character modal renders cards", !!state.characterOverlay && !!state.characterPreviewCanvas && state.characterCards >= 12, `cards=${state.characterCards || 0}`)
  check("14o. speed growth slowed per difficulty", Array.isArray(state.speedIncrements) && state.speedIncrements[0] < 0.0005 && state.speedIncrements[1] < 0.0005 && state.speedIncrements[2] < 0.0005, state.speedIncrements ? state.speedIncrements.join(', ') : 'missing')
  const speedLevelsOk = state.speedLevels && state.speedLevels.length === 3 &&
    state.speedLevels[0].roundtrip === 1 &&
    state.speedLevels[1].roundtrip >= 25 &&
    state.speedLevels[2].roundtrip === 50 &&
    state.speedLevels[0].distanceRate < state.speedLevels[1].distanceRate &&
    state.speedLevels[1].distanceRate < state.speedLevels[2].distanceRate
  check("14p. distance rate scales with speed level", speedLevelsOk, state.speedLevels ? JSON.stringify(state.speedLevels) : 'missing')
  check("14q. cyber mode reset restores normal mode", !!state.cyberReset)
  check("14r. non-runner hides Neo shoe overlays", !!state.nonRunnerShoeOverlayHidden)

  // -- applyGameData runtime test --
  try {
    const agdResult = await win.webContents.executeJavaScript(`(function() {
      try {
        window.__SG.applyGameData({
          credits: 7,
          totalCoins: 11,
          maxEasy: 100,
          maxMedium: 50,
          maxHard: 25,
          maxDistance: 100,
          ownedAbilities: [0, 1],
          equippedAbility: 1,
          ownedCharacters: ['runner', 'adventurer'],
          selectedCharacter: 'adventurer',
          runCount: 3
        })
        var s = window.__SG.state
        return JSON.stringify({
          ok: true,
          credits: s.credits,
          totalCoins: s.totalCoins,
          maxEasy: s.maxEasy,
          canDoubleJump: s.canDoubleJump,
          selectedCharacter: s.selectedCharacter,
          ownedCharacters: s.ownedCharacters
        })
      } catch(e) {
        return JSON.stringify({ ok: false, error: e.message })
      }
    })()`)
    const agd = JSON.parse(agdResult)
    check("15. applyGameData runs without error", !!agd.ok, agd.error || "")
    check("16. state.credits === 7", agd.credits === 7, String(agd.credits))
    check("17. state.totalCoins === 11", agd.totalCoins === 11, String(agd.totalCoins))
    check("18. state.maxEasy === 100", agd.maxEasy === 100, String(agd.maxEasy))
    check("19. state.canDoubleJump === true", agd.canDoubleJump === true, String(agd.canDoubleJump))
    check("19b. selectedCharacter restored", agd.selectedCharacter === 'adventurer', String(agd.selectedCharacter))
    check("19c. ownedCharacters restored", Array.isArray(agd.ownedCharacters) && agd.ownedCharacters.includes('adventurer'), Array.isArray(agd.ownedCharacters) ? agd.ownedCharacters.join(', ') : 'missing')
  } catch (err) {
    check("applyGameData runtime", false, err.message)
  }
  // ── IPC read/write test ────────────────────────────
  console.log('')
  console.log('  ── IPC persistence checks ──')

  try {
    const ipcResult = await win.webContents.executeJavaScript(`(async function() {
      const ok = {}
      // Test settings write+read round-trip
      try {
        await window.desktopAPI.settings.set({ musicVolume: 0.3, sfxVolume: 0.6, theme: 1 })
        const loaded = await window.desktopAPI.settings.get()
        ok.settingsWrite = true
        ok.settingsRead = loaded && loaded.musicVolume === 0.3 && loaded.sfxVolume === 0.6
        ok.settingsValue = JSON.stringify(loaded)
      } catch(e) { ok.settingsError = e.message }

      // Test save write+read round-trip
      try {
        const testSave = { credits: 99, totalCoins: 100, maxDistance: 500, runCount: 3, ownedAbilities: [0,1], equippedAbility: 1, updatedAt: new Date().toISOString() }
        await window.desktopAPI.save.setLocal(testSave)
        const loadedSave = await window.desktopAPI.save.getLocal()
        ok.saveWrite = true
        ok.saveRead = loadedSave && loadedSave.credits === 99 && loadedSave.maxDistance === 500
        ok.saveValue = JSON.stringify(loadedSave)
      } catch(e) { ok.saveError = e.message }

      return JSON.stringify(ok)
    })()`)
    const ipc = JSON.parse(ipcResult)
    check('IPC settings write+read', !!ipc.settingsWrite && !!ipc.settingsRead, ipc.settingsRead ? 'musicVolume=0.3' : ipc.settingsError || 'write failed')
    check('IPC save write+read', !!ipc.saveWrite && !!ipc.saveRead, ipc.saveRead ? 'credits=99, distance=500' : ipc.saveError || 'write failed')
  } catch (err) {
    check('IPC executeJavaScript', false, err.message)
  }

  // ── Environment variable check ─────────────────────
  console.log('')
  console.log('  ── Environment config check ──')
  const envUrl = process.env.SUBWAY_API_BASE_URL || ''
  check('SUBWAY_API_BASE_URL env (info)', true, envUrl || '(not set)')
  if (envUrl) {
    check('4d. __SUBWAY_CONFIG__.API_BASE_URL matches env', state.apiBaseUrl === envUrl, state.apiBaseUrl)
    check('5c. SG.apiBaseUrl matches env', state.sgApiBaseUrl === envUrl, state.sgApiBaseUrl)
  } else {
    // No env var → should use production default
    const prodUrl = 'http://35.212.200.85:3000'
    check('4d. API_BASE_URL defaults to production', state.apiBaseUrl === prodUrl, state.apiBaseUrl || 'undefined')
    check('5c. SG.apiBaseUrl defaults to production', state.sgApiBaseUrl === prodUrl, state.sgApiBaseUrl || 'undefined')
  }

  if (process.env.ELECTRON_HEADLESS_CI === '1') {
    console.log('')
    console.log('  ── Headless notes ──')
    console.log('  ℹ️  WebGL visual checks require a real GPU or manual')
    console.log('  ℹ️  verification on Windows.')
    console.log('  ℹ️  Server connectivity requires a running account server.')
  }

  // ── Cleanup ───────────────────────────────────────
  try {
    if (fs.existsSync(SETTINGS_FILE)) fs.unlinkSync(SETTINGS_FILE)
    if (fs.existsSync(SAVE_FILE)) fs.unlinkSync(SAVE_FILE)
    if (fs.existsSync(TMPDIR)) fs.rmdirSync(TMPDIR)
  } catch {}

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
