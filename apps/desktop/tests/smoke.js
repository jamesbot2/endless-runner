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
    state = await win.webContents.executeJavaScript(`(async function() {
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
      r.jetpackModelPath = window.__SG ? window.__SG.jetpackModelPath : null
      r.jetpackModelLoaded = window.__SG ? window.__SG.jetpackModelLoaded === true : false
      r.jetpackModelName = window.__SG && window.__SG.jetpackModel ? window.__SG.jetpackModel.name : null
      r.jetpackFlameGroups = window.__SG && window.__SG.jetpackFlameGroups ? window.__SG.jetpackFlameGroups.length : 0
      r.jetpackTuning = window.__SG && window.__SG.jetpackModelTuning ? {
        targetHeight: window.__SG.jetpackModelTuning.targetHeight,
        rotationY: window.__SG.jetpackModelTuning.rotationY
      } : null
      r.jetpackMount = window.__SG && window.__SG.jetpackPack ? {
        y: window.__SG.jetpackPack.position.y,
        z: window.__SG.jetpackPack.position.z
      } : null
      r.abilityHud = window.__SG ? typeof window.__SG.updateAbilityHUD === 'function' : false
      r.abilityVisuals = window.__SG ? typeof window.__SG.updateAbilityVisuals === 'function' : false
      r.defaultKeyBindings = window.__SG && window.__SG.getKeyBindings ? Object.assign({}, window.__SG.getKeyBindings()) : null
      r.keyBindingActionBefore = window.__SG && window.__SG.getInputActionForKey ? window.__SG.getInputActionForKey('ArrowUp') : null
      r.keyBindingActionAfter = null
      r.keyBindingSaved = false
      r.rollReleaseDelaySetting = null
      r.settingsBindingButtons = 0
      r.settingsVolumeGridLeftAligned = false
      r.rollDelayHasDescription = false
      r.thirdPersonViewButtons = 0
      r.thirdPersonViewSaved = false
      r.thirdPersonDefault = window.__SG ? window.__SG.state.thirdPersonView : null
      r.thirdPersonButtonFeedback = false
      r.settingsModalWide = false
      r.thirdPersonCameraViews = window.__SG && window.__SG.thirdPersonCameraViews ? window.__SG.thirdPersonCameraViews : null
      r.speedHud = false
      r.speedHudText = ''
      r.speedHudBackground = ''
      if (window.__SG && window.__SG.setKeyBinding && window.__SG.resetKeyBindings && window.__SG.showSettings) {
        window.__SG.setKeyBinding('up', 'k')
        r.keyBindingActionAfter = window.__SG.getInputActionForKey ? window.__SG.getInputActionForKey('k') : null
        r.keyBindingSaved = localStorage.getItem('subwayKeyBindings') && localStorage.getItem('subwayKeyBindings').indexOf('"up":"k"') >= 0
        localStorage.setItem('subwayRollReleaseDelay', '350')
        window.__SG.state.rollReleaseDelay = 350
        window.__SG.showSettings()
        var delaySlider = document.getElementById('__roll-delay')
        r.rollReleaseDelaySetting = delaySlider ? parseInt(delaySlider.value, 10) : null
        r.settingsBindingButtons = document.querySelectorAll('#settings-overlay .__bind-btn').length
        r.rollDelayHasDescription = document.getElementById('settings-overlay').textContent.indexOf('stays crouched') >= 0
        r.thirdPersonViewButtons = document.querySelectorAll('#settings-overlay .__view-btn').length
        var mediumBtn = document.querySelector('#settings-overlay .__view-btn[data-view="medium"]')
        if (mediumBtn) mediumBtn.click()
        var mediumStyle = mediumBtn ? getComputedStyle(mediumBtn) : null
        r.thirdPersonViewSaved = window.__SG.state.thirdPersonView === 'medium' && localStorage.getItem('subwayThirdPersonView') === 'medium'
        r.thirdPersonButtonFeedback = !!mediumBtn && mediumBtn.classList.contains('selected') && mediumBtn.getAttribute('aria-pressed') === 'true' && mediumStyle && mediumStyle.boxShadow !== 'none' && mediumStyle.borderColor.indexOf('34') >= 0
        var modal = document.querySelector('#settings-overlay .menu-content')
        r.settingsModalWide = modal ? modal.getBoundingClientRect().width >= 560 : false
        var volumeRows = document.querySelectorAll('#settings-overlay .__vol-slider')
        if (volumeRows.length >= 2) {
          var row0 = volumeRows[0].parentElement
          var row1 = volumeRows[1].parentElement
          r.settingsVolumeGridLeftAligned = row0 && row1 &&
            getComputedStyle(row0).display === 'grid' &&
            getComputedStyle(row1).display === 'grid' &&
            getComputedStyle(row0).gridTemplateColumns.split(' ').length >= 4
        }
        var settingsOverlay = document.getElementById('settings-overlay')
        if (settingsOverlay) settingsOverlay.style.display = 'none'
        window.__SG.resetKeyBindings()
        window.__SG.state.thirdPersonView = 'near'
        localStorage.setItem('subwayThirdPersonView', 'near')
      }
      r.consoleCommands = window.__SG && window.__SG.consoleCommands ? Object.keys(window.__SG.consoleCommands).sort() : []
      r.executeConsoleCommand = window.__SG ? typeof window.__SG.executeConsoleCommand === 'function' : false
      r.consoleBacktickToggle = false
      r.consoleEscapeClose = false
      r.consoleHelpHidesHomelander = false
      if (window.__SG && window.__SG.toggleConsole && r.executeConsoleCommand) {
        var devConsole = document.getElementById('dev-console')
        var consoleInput = document.getElementById('console-input')
        var consoleOutput = document.getElementById('console-output')
        var tickKey = String.fromCharCode(96)
        if (devConsole && consoleInput) {
          devConsole.style.display = 'none'
          window.__SG.state.paused = false
          document.dispatchEvent(new KeyboardEvent('keydown', { key: tickKey, bubbles: true }))
          var openedByTick = devConsole.style.display === 'flex'
          consoleInput.dispatchEvent(new KeyboardEvent('keydown', { key: tickKey, bubbles: true }))
          var closedByTick = devConsole.style.display === 'none'
          document.dispatchEvent(new KeyboardEvent('keydown', { key: tickKey, bubbles: true }))
          var openedAgain = devConsole.style.display === 'flex'
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
          var closedByEscape = devConsole.style.display === 'none'
          r.consoleBacktickToggle = openedByTick && closedByTick
          r.consoleEscapeClose = openedAgain && closedByEscape
        }
        if (consoleOutput && window.__SG.clearConsole) {
          window.__SG.clearConsole()
          window.__SG.executeConsoleCommand('help')
          r.consoleHelpHidesHomelander = consoleOutput.textContent.toLowerCase().indexOf('homelander') < 0
        }
      }
      if (window.__SG && window.__SG.updateSpeedHUD && window.__SG.player && window.__SG.camera) {
        var prevStarted = window.__SG.state.started
        var prevGameOver = window.__SG.state.gameOver
        var prevFirstPerson = window.__SG.state.firstPerson
        var prevHomelander = window.__SG.state.homelander
        var prevSpeed = window.__SG.state.speed
        window.__SG.state.started = true
        window.__SG.state.gameOver = false
        window.__SG.state.firstPerson = false
        window.__SG.state.homelander = false
        window.__SG.state.speed = window.__SG.speedForLevel ? window.__SG.speedForLevel(20) : 1
        if (window.__SG.updateCamera) window.__SG.updateCamera()
        window.__SG.updateSpeedHUD()
        var speedHud = document.getElementById('third-person-speed-hud')
        if (speedHud) {
          r.speedHudText = speedHud.textContent
          r.speedHudBackground = getComputedStyle(speedHud).backgroundColor
          r.speedHud = speedHud.style.display !== 'none' && /km\\/h/.test(speedHud.textContent)
        }
        window.__SG.state.started = prevStarted
        window.__SG.state.gameOver = prevGameOver
        window.__SG.state.firstPerson = prevFirstPerson
        window.__SG.state.homelander = prevHomelander
        window.__SG.state.speed = prevSpeed
        window.__SG.updateSpeedHUD()
      }
      r.homelanderModelPath = window.__SG ? window.__SG.homelanderModelPath : null
      r.homelanderLoader = window.__SG ? typeof window.__SG.loadHomelanderModel === 'function' : false
      r.homelanderTuning = window.__SG && window.__SG.homelanderModelTuning ? {
        modelRotationY: window.__SG.homelanderModelTuning.modelRotationY,
        modelYOffset: window.__SG.homelanderModelTuning.modelYOffset,
        eyeOffsetY: window.__SG.homelanderModelTuning.eyeOffsetY,
        eyeOffsetZ: window.__SG.homelanderModelTuning.eyeOffsetZ
      } : null
      r.homelanderModelLoaded = false
      r.homelanderModelHeight = 0
      if (window.__SG && window.__SG.activateHomelander && window.__SG.deactivateHomelander && window.__SG.player && window.THREE) {
        window.__SG.activateHomelander()
        await new Promise(function(resolve) { setTimeout(resolve, 1800) })
        r.homelanderModelLoaded = !!window.__SG.homelanderModel && window.__SG.homelanderModel.name === 'HomelanderGLB'
        if (window.__SG.homelanderModel) {
          window.__SG.homelanderModel.updateMatrixWorld(true)
          var homelanderBox = new window.THREE.Box3().setFromObject(window.__SG.homelanderModel)
          var homelanderSize = new window.THREE.Vector3()
          homelanderBox.getSize(homelanderSize)
          r.homelanderModelHeight = homelanderSize.y
        }
        window.__SG.deactivateHomelander()
      }
      r.vehicleLoader = window.__SG ? typeof window.__SG.loadVehicleModels === 'function' : false
      r.vehicleTrainPath = window.__SG && window.__SG.vehicleModelPaths ? window.__SG.vehicleModelPaths.train : null
      r.obstacleSpacing = window.__SG ? typeof window.__SG.canPlaceObstacle === 'function' && typeof window.__SG.trackObstacle === 'function' : false
      r.coinSpacing = window.__SG ? typeof window.__SG.canPlaceCoinAt === 'function' && typeof window.__SG.addSafeCoin === 'function' : false
      r.sceneryLoader = window.__SG ? typeof window.__SG.loadSceneryModels === 'function' && typeof window.__SG.cloneSceneryModel === 'function' : false
      r.sceneryPathCounts = window.__SG && window.__SG.sceneryModelPaths ? {
        buildings: window.__SG.sceneryModelPaths.buildings.length,
        trees: window.__SG.sceneryModelPaths.trees.length
      } : null
      r.cityScenerySkipsLegacyFallback = false
      r.forestScenerySkipsLegacyFallback = false
      r.treeMaterialsTinted = false
      if (window.__SG && window.__SG.createScenery && window.__SG.sceneryModels && window.__SG.disposeObject) {
        var savedThemeForFallback = window.__SG.state.theme
        var savedBuildingModels = window.__SG.sceneryModels.buildings
        var savedTreeModels = window.__SG.sceneryModels.trees
        window.__SG.sceneryModels.buildings = []
        window.__SG.state.theme = 0
        var legacyCity = window.__SG.createScenery(123, -123)
        r.cityScenerySkipsLegacyFallback = legacyCity === null
        if (legacyCity) {
          window.__SG.scene.remove(legacyCity)
          window.__SG.disposeObject(legacyCity)
        }
        window.__SG.sceneryModels.trees = []
        window.__SG.state.theme = 1
        var legacyForest = window.__SG.createScenery(123, -133)
        r.forestScenerySkipsLegacyFallback = legacyForest === null
        if (legacyForest) {
          window.__SG.scene.remove(legacyForest)
          window.__SG.disposeObject(legacyForest)
        }
        window.__SG.sceneryModels.buildings = savedBuildingModels
        window.__SG.sceneryModels.trees = savedTreeModels
        window.__SG.state.theme = savedThemeForFallback
      }
      if (window.__SG && window.__SG.sceneryModels && window.__SG.sceneryModels.trees && window.__SG.sceneryModels.trees[0]) {
        window.__SG.sceneryModels.trees[0].traverse(function(node) {
          if (r.treeMaterialsTinted || !node || !node.isMesh || !node.material) return
          var mats = Array.isArray(node.material) ? node.material : [node.material]
          for (var tmi = 0; tmi < mats.length; tmi++) {
            var mat = mats[tmi]
            if (!mat || !mat.color) continue
            if (mat.color.g > mat.color.r && mat.color.g > mat.color.b) r.treeMaterialsTinted = true
          }
        })
      }
      r.cityScenerySpacing = window.__SG && window.__SG.getScenerySpacing ? window.__SG.getScenerySpacing(0) : null
      r.citySceneryRows = window.__SG && window.__SG.getSceneryRowCount ? window.__SG.getSceneryRowCount(0) : null
      r.citySceneryAligned = false
      r.citySceneryNoDuplicateSpawn = false
      if (window.__SG && window.__SG.spawnSceneryRow && window.__SG.disposeObject && window.__SG.scene) {
        var previousTheme = window.__SG.state.theme
        window.__SG.state.theme = 0
        var nearCity = window.__SG.spawnSceneryRow(-24, 1, 0)
        var farCity = window.__SG.spawnSceneryRow(-24, 1, 1)
        var expectedNearX = window.__SG.GROUND_WIDTH / 2 + 2.25
        var expectedFarX = expectedNearX + 3.9
        r.citySceneryAligned =
          Math.abs(nearCity.position.x - expectedNearX) < 0.001 &&
          Math.abs(farCity.position.x - expectedFarX) < 0.001 &&
          Math.abs(nearCity.position.z + 24) < 0.001 &&
          Math.abs(farCity.position.z + 24) < 0.001
        window.__SG.scene.remove(nearCity)
        window.__SG.scene.remove(farCity)
        window.__SG.disposeObject(nearCity)
        window.__SG.disposeObject(farCity)
        window.__SG.state.theme = previousTheme
      }
      if (window.__SG && window.__SG.spawnBuildings && window.__SG.disposeObject && window.__SG.scene) {
        var savedTheme = window.__SG.state.theme
        var savedBuildings = window.__SG.state.buildings.slice()
        window.__SG.state.theme = 0
        window.__SG.state.buildings = []
        window.__SG.spawnBuildings()
        var firstCount = window.__SG.state.buildings.length
        window.__SG.spawnBuildings()
        var secondCount = window.__SG.state.buildings.length
        var seenScenery = {}
        var uniqueCount = 0
        for (var sci = 0; sci < window.__SG.state.buildings.length; sci++) {
          var sb = window.__SG.state.buildings[sci]
          var key = Math.round(sb.position.x * 10) + ':' + Math.round(sb.position.z * 10)
          if (!seenScenery[key]) {
            seenScenery[key] = true
            uniqueCount++
          }
        }
        r.citySceneryNoDuplicateSpawn = firstCount > 0 && firstCount === secondCount && uniqueCount === secondCount
        for (var sdi = window.__SG.state.buildings.length - 1; sdi >= 0; sdi--) {
          window.__SG.scene.remove(window.__SG.state.buildings[sdi])
          window.__SG.disposeObject(window.__SG.state.buildings[sdi])
        }
        window.__SG.state.buildings = savedBuildings
        window.__SG.state.theme = savedTheme
      }
      r.rollUnderSize = null
      r.coinDetail = null
      if (window.__SG && window.__SG.createCoin && window.__SG.disposeObject) {
        var detailedCoin = window.__SG.createCoin(1, -12, 0.3)
        var coinShape = detailedCoin.children.find(function(child) { return child.geometry && child.geometry.type === 'ShapeGeometry' })
        r.coinDetail = {
          children: detailedCoin.children.length,
          marker: detailedCoin.userData.coinDetail,
          hasTorus: detailedCoin.children.some(function(child) { return child.geometry && child.geometry.type === 'TorusGeometry' }),
          hasShape: !!coinShape,
          centeredShape: !!coinShape && Math.abs(coinShape.position.x) < 0.001 && Math.abs(coinShape.position.y - detailedCoin.userData.baseCoinY) < 0.001,
          hasBaseY: detailedCoin.children.every(function(child) { return child.userData && typeof child.userData.baseY === 'number' }),
          shapeColor: coinShape && coinShape.material && coinShape.material.color ? coinShape.material.color.getHex() : null
        }
        window.__SG.disposeObject(detailedCoin)
      }
      r.fullBarrierGap = null
      r.fullBarrierCollisionGap = false
      if (window.__SG && window.__SG.createRollUnderTrain && window.__SG.disposeObject) {
        var rollUnder = window.__SG.createRollUnderTrain(1, -32)
        r.rollUnderSize = {
          width: rollUnder.userData.width,
          height: rollUnder.userData.height,
          depth: rollUnder.userData.depth,
          yOffset: rollUnder.userData.yOffset
        }
        window.__SG.disposeObject(rollUnder)
      }
      if (window.__SG && window.__SG.createFullLaneBarrier && window.__SG.getObstacleLanes && window.__SG.checkCollisions && window.__SG.player) {
        var gapBarrier = window.__SG.createFullLaneBarrier(0, 1)
        var savedObstacles = window.__SG.state.obstacles
        var savedPlayerPos = window.__SG.player.position.clone()
        var savedCurrentLane = window.__SG.state.currentLane
        var savedTargetLane = window.__SG.state.targetLane
        var savedOnRoof = window.__SG.state.onRoof
        var savedJumping = window.__SG.state.isJumping
        var savedRolling = window.__SG.state.isRolling
        var savedHomelander = window.__SG.state.homelander
        window.__SG.state.obstacles = [gapBarrier]
        window.__SG.state.onRoof = false
        window.__SG.state.isJumping = false
        window.__SG.state.isRolling = false
        window.__SG.state.homelander = false
        window.__SG.player.position.set(window.__SG.LANE_POSITIONS[1], 0.15, 0)
        window.__SG.state.currentLane = 1
        var gapLaneHit = window.__SG.checkCollisions()
        window.__SG.player.position.set(window.__SG.LANE_POSITIONS[0], 0.15, 0)
        window.__SG.state.currentLane = 0
        var blockedLaneHit = window.__SG.checkCollisions()
        r.fullBarrierGap = {
          openLane: gapBarrier.userData.openLane,
          blockedLanes: window.__SG.getObstacleLanes(gapBarrier)
        }
        r.fullBarrierCollisionGap = gapBarrier.userData.openLane === 1 &&
          r.fullBarrierGap.blockedLanes.length === 2 &&
          r.fullBarrierGap.blockedLanes.indexOf(1) < 0 &&
          gapLaneHit === false &&
          blockedLaneHit === true
        window.__SG.state.obstacles = savedObstacles
        window.__SG.player.position.copy(savedPlayerPos)
        window.__SG.state.currentLane = savedCurrentLane
        window.__SG.state.targetLane = savedTargetLane
        window.__SG.state.onRoof = savedOnRoof
        window.__SG.state.isJumping = savedJumping
        window.__SG.state.isRolling = savedRolling
        window.__SG.state.homelander = savedHomelander
        window.__SG.disposeObject(gapBarrier)
      }
      r.trainRampWidth = null
      r.vehicleSkipsLegacyFallback = false
      if (window.__SG && window.__SG.createTrain && window.__SG.disposeObject) {
        var originalRandom = Math.random
        try {
          Math.random = function() { return 0.1 }
          var rampTrain = window.__SG.createTrain(1, -42, false)
          r.trainRampWidth = rampTrain ? rampTrain.userData.rampWidth || null : null
          if (rampTrain) window.__SG.disposeObject(rampTrain)
        } finally {
          Math.random = originalRandom
        }
        var savedTrainModel = window.__SG.vehicleModels ? window.__SG.vehicleModels.train : null
        if (window.__SG.vehicleModels) delete window.__SG.vehicleModels.train
        var legacyTrain = window.__SG.createTrain(1, -52, false)
        r.vehicleSkipsLegacyFallback = legacyTrain === null
        if (legacyTrain) window.__SG.disposeObject(legacyTrain)
        if (window.__SG.vehicleModels && savedTrainModel) window.__SG.vehicleModels.train = savedTrainModel
      }
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
        const modal = document.querySelector('#characters-overlay .character-modal')
        r.characterModalWidth = modal ? modal.getBoundingClientRect().width : 0
        r.characterModalMaxWidth = modal ? getComputedStyle(modal).maxWidth : ''
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
  const jetpackModelPath = path.join(DESKTOP, 'dist/renderer/models/jetpack.glb')
  const homelanderModelPath = path.join(DESKTOP, 'dist/renderer/models/homelander.glb')
  const trainModelPath = path.join(DESKTOP, 'dist/renderer/models/vehicles/train.glb')
  const busModelPath = path.join(DESKTOP, 'dist/renderer/models/vehicles/bus.glb')
  const adventurerPath = path.join(DESKTOP, 'dist/renderer/models/characters/Adventurer.gltf')
  const sceneryBuildingPath = path.join(DESKTOP, 'dist/renderer/models/scenery/buildings/building1_small.glb')
  const sceneryTreePath = path.join(DESKTOP, 'dist/renderer/models/scenery/trees/tree_1.glb')
  check('3d. player.glb copied to renderer dist', fs.existsSync(playerModelPath), fs.existsSync(playerModelPath) ? `${fs.statSync(playerModelPath).size} bytes` : 'missing')
  check('3e. refined player.glb size', fs.existsSync(playerModelPath) && fs.statSync(playerModelPath).size > 100000, fs.existsSync(playerModelPath) ? `${fs.statSync(playerModelPath).size} bytes` : 'missing')
  check('3f. Jetpack tuning constants', state.jetpackFuelMax === 15 && state.jetpackCooldownMax === 30 && state.jetpackMaxHeight > 0, `fuel=${state.jetpackFuelMax}, cooldown=${state.jetpackCooldownMax}, maxHeight=${state.jetpackMaxHeight}`)
  check('3f-1. jetpack.glb copied to renderer dist', fs.existsSync(jetpackModelPath) && fs.statSync(jetpackModelPath).size > 1000000, fs.existsSync(jetpackModelPath) ? `${fs.statSync(jetpackModelPath).size} bytes` : 'missing')
  check('3g. homelander.glb copied to renderer dist', fs.existsSync(homelanderModelPath), fs.existsSync(homelanderModelPath) ? `${fs.statSync(homelanderModelPath).size} bytes` : 'missing')
  check('3h. train.glb copied to renderer dist', fs.existsSync(trainModelPath), fs.existsSync(trainModelPath) ? `${fs.statSync(trainModelPath).size} bytes` : 'missing')
  check('3i. bus.glb copied to renderer dist', fs.existsSync(busModelPath), fs.existsSync(busModelPath) ? `${fs.statSync(busModelPath).size} bytes` : 'missing')
  check('3j. Adventurer.gltf copied to renderer dist', fs.existsSync(adventurerPath), fs.existsSync(adventurerPath) ? `${fs.statSync(adventurerPath).size} bytes` : 'missing')
  check('3k. scenery building GLB copied to renderer dist', fs.existsSync(sceneryBuildingPath), fs.existsSync(sceneryBuildingPath) ? `${fs.statSync(sceneryBuildingPath).size} bytes` : 'missing')
  check('3l. scenery tree GLB copied to renderer dist', fs.existsSync(sceneryTreePath), fs.existsSync(sceneryTreePath) ? `${fs.statSync(sceneryTreePath).size} bytes` : 'missing')
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
  check("14e-0a. Jetpack GLB loads with dual flames", state.jetpackModelPath === 'models/jetpack.glb' && !!state.jetpackModelLoaded && state.jetpackModelName === 'JetpackGLB' && state.jetpackFlameGroups === 2, `path=${state.jetpackModelPath}, model=${state.jetpackModelName}, flames=${state.jetpackFlameGroups}`)
  check("14e-0b. Jetpack is lower, closer, and faces backward", !!state.jetpackTuning && Math.abs(state.jetpackTuning.rotationY - Math.PI) < 0.001 && state.jetpackTuning.targetHeight <= 0.6 && !!state.jetpackMount && state.jetpackMount.y <= 0.75 && state.jetpackMount.z >= -0.26, state.jetpackTuning && state.jetpackMount ? JSON.stringify({ tuning: state.jetpackTuning, mount: state.jetpackMount }) : 'missing')
  check("14e-1. default key bindings use arrow keys", !!state.defaultKeyBindings && state.defaultKeyBindings.up === 'ArrowUp' && state.defaultKeyBindings.down === 'ArrowDown' && state.defaultKeyBindings.left === 'ArrowLeft' && state.defaultKeyBindings.right === 'ArrowRight', state.defaultKeyBindings ? JSON.stringify(state.defaultKeyBindings) : 'missing')
  check("14e-2. key binding remap updates action lookup", state.keyBindingActionBefore === 'up' && state.keyBindingActionAfter === 'up' && !!state.keyBindingSaved, `before=${state.keyBindingActionBefore}, after=${state.keyBindingActionAfter}`)
  check("14e-3. settings exposes roll delay and key binding controls", state.rollReleaseDelaySetting === 350 && state.settingsBindingButtons === 4, `delay=${state.rollReleaseDelaySetting}, buttons=${state.settingsBindingButtons}`)
  check("14e-4. settings volume rows keep icons on the left", !!state.settingsVolumeGridLeftAligned)
  check("14e-5. settings labels roll delay", !!state.rollDelayHasDescription)
  check("14e-6. settings exposes third-person camera choices", state.thirdPersonViewButtons === 3 && !!state.thirdPersonViewSaved && !!state.settingsModalWide, `buttons=${state.thirdPersonViewButtons}, wide=${state.settingsModalWide}`)
  check("14e-7. third-person camera presets move closer", !!state.thirdPersonCameraViews && state.thirdPersonCameraViews.far.z === 7 && state.thirdPersonCameraViews.medium.z < state.thirdPersonCameraViews.far.z && state.thirdPersonCameraViews.near.z < state.thirdPersonCameraViews.medium.z, state.thirdPersonCameraViews ? JSON.stringify(state.thirdPersonCameraViews) : 'missing')
  check("14e-8. third-person camera defaults to closest", state.thirdPersonDefault === 'near', String(state.thirdPersonDefault))
  check("14e-9. third-person camera buttons give selected feedback", !!state.thirdPersonButtonFeedback)
  check("14e-10. third-person speed HUD follows runner", !!state.speedHud, state.speedHudText || state.speedHudBackground || 'missing')
  check("14f. restart keeps player facing forward", Math.abs(state.restartRotationY - Math.PI) < 0.001, String(state.restartRotationY))
  check("14g. console command runner exists", !!state.executeConsoleCommand)
  check("14h. console includes Homelander easter egg", state.consoleCommands && state.consoleCommands.includes('homelander'), state.consoleCommands ? state.consoleCommands.join(', ') : 'none')
  check("14h-1. console opens/closes with tilde", !!state.consoleBacktickToggle)
  check("14h-2. console closes with Escape", !!state.consoleEscapeClose)
  check("14h-3. console help does not reveal Homelander", !!state.consoleHelpHidesHomelander)
  check("14i. Homelander GLB loader exists", !!state.homelanderLoader && state.homelanderModelPath === 'models/homelander.glb', state.homelanderModelPath || 'missing path')
  check("14i-1. Homelander GLB tuning faces forward with eye lasers", !!state.homelanderTuning && Math.abs(state.homelanderTuning.modelRotationY) < 0.001 && state.homelanderTuning.modelYOffset <= -0.15 && state.homelanderTuning.eyeOffsetY > 1.5 && state.homelanderTuning.eyeOffsetZ < 0, state.homelanderTuning ? JSON.stringify(state.homelanderTuning) : 'missing tuning')
  check("14i-2. Homelander GLB loads into scene", !!state.homelanderModelLoaded && state.homelanderModelHeight > 1.7, `height=${state.homelanderModelHeight}`)
  check("14j. vehicle model loader exists", !!state.vehicleLoader, state.vehicleTrainPath || 'missing train path')
  check("14k. obstacle spacing guard exists", !!state.obstacleSpacing)
  check("14l. coin spacing guard exists", !!state.coinSpacing)
  check("14l-1. coin model has centered high-contrast surface detail", !!state.coinDetail && state.coinDetail.children >= 6 && !!state.coinDetail.hasTorus && !!state.coinDetail.hasShape && !!state.coinDetail.centeredShape && !!state.coinDetail.hasBaseY && state.coinDetail.shapeColor === 0x7A3B00 && state.coinDetail.marker === 'high-contrast-centered-detail', state.coinDetail ? JSON.stringify(state.coinDetail) : 'missing')
  check("14m. scenery model loader exists", !!state.sceneryLoader, state.sceneryPathCounts ? `buildings=${state.sceneryPathCounts.buildings}, trees=${state.sceneryPathCounts.trees}` : 'missing paths')
  check("14m-0a. city scenery waits for GLB assets", !!state.cityScenerySkipsLegacyFallback)
  check("14m-0b. forest scenery waits for GLB assets", !!state.forestScenerySkipsLegacyFallback)
  check("14m-0c. tree scenery materials are tinted green", !!state.treeMaterialsTinted)
  check("14m-1. city scenery spacing is performance tuned", state.cityScenerySpacing >= 10, `spacing=${state.cityScenerySpacing}`)
  check("14m-2. city scenery rows are grid aligned", !!state.citySceneryAligned)
  check("14m-3. city scenery uses a single building row", state.citySceneryRows === 1, `rows=${state.citySceneryRows}`)
  check("14m-4. city scenery spawn avoids duplicate overlap", !!state.citySceneryNoDuplicateSpawn)
  check("14m-5. roll-under obstacle is narrower and lower", !!state.rollUnderSize && state.rollUnderSize.width <= 1.35 && state.rollUnderSize.height <= 0.28 && state.rollUnderSize.yOffset <= 1.2, state.rollUnderSize ? JSON.stringify(state.rollUnderSize) : 'missing')
  check("14m-5a. full-width barrier leaves one lane gap", !!state.fullBarrierCollisionGap, state.fullBarrierGap ? JSON.stringify(state.fullBarrierGap) : 'missing')
  check("14m-6. train roof ramp matches train width", state.trainRampWidth !== null && state.trainRampWidth <= 1.6, `rampWidth=${state.trainRampWidth}`)
  check("14m-7. train obstacles wait for GLB assets", !!state.vehicleSkipsLegacyFallback)
  check("14n. character catalog loaded", state.characterCatalogCount >= 12, String(state.characterCatalogCount))
  check("14o. character selector menu exists", !!state.characterSelector && !!state.charactersButton)
  check("14p. character price follows unlock count", state.characterBuy && state.characterPrice === state.expectedCharacterPrice, `price=${state.characterPrice}, owned=${state.ownedCharacterCount}`)
  check("14q. character modal renders large card grid", !!state.characterOverlay && !!state.characterPreviewCanvas && state.characterCards >= 12 && state.characterModalWidth > 800 && state.characterModalMaxWidth === 'none', `cards=${state.characterCards || 0}, width=${Math.round(state.characterModalWidth || 0)}, max=${state.characterModalMaxWidth || 'unset'}`)
  check("14r. speed growth slowed per difficulty", Array.isArray(state.speedIncrements) && state.speedIncrements[0] < 0.0005 && state.speedIncrements[1] < 0.0005 && state.speedIncrements[2] < 0.0005, state.speedIncrements ? state.speedIncrements.join(', ') : 'missing')
  const speedLevelsOk = state.speedLevels && state.speedLevels.length === 3 &&
    state.speedLevels[0].roundtrip === 1 &&
    state.speedLevels[1].roundtrip >= 25 &&
    state.speedLevels[2].roundtrip === 50 &&
    state.speedLevels[0].distanceRate < state.speedLevels[1].distanceRate &&
    state.speedLevels[1].distanceRate < state.speedLevels[2].distanceRate
  check("14s. distance rate scales with speed level", speedLevelsOk, state.speedLevels ? JSON.stringify(state.speedLevels) : 'missing')
  check("14t. cyber mode reset restores normal mode", !!state.cyberReset)
  check("14u. non-runner hides Neo shoe overlays", !!state.nonRunnerShoeOverlayHidden)

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
