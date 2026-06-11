// ===== Subway Surfer - Electron Main Process =====
import { app, BrowserWindow, ipcMain } from 'electron'
import { join, normalize } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'

// ── CI / Headless Mode Flags ────────────────────────────
// Activated by ELECTRON_HEADLESS_CI=1 (GCP / headless CI runners).
// Fixes /dev/shm, GPU blocklist, and GL backend for Xvfb environments.
if (process.env.ELECTRON_HEADLESS_CI === '1') {
  app.commandLine.appendSwitch('disable-dev-shm-usage')
  app.commandLine.appendSwitch('ignore-gpu-blocklist')
  app.commandLine.appendSwitch('use-gl', 'swiftshader')
}

let mainWindow: BrowserWindow | null = null

const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev')

// ── Persistent Storage Paths ────────────────────────────

/** Data lives under user data dir, NEVER beside the app binary. */
const userDataPath = app.getPath('userData')
const settingsFile = join(userDataPath, 'settings.json')
const saveFile = join(userDataPath, 'save.json')

// ── Input Validation Helpers ────────────────────────────

const MAX_PAYLOAD_BYTES = 1 * 1024 * 1024 // 1 MB limit

/**
 * Returns true when `val` is a non-null, non-array object.
 * Rejects arrays, primitives, and null/undefined.
 */
function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val)
}

/**
 * Throws an error if the value fails basic validation.
 * Called inside IPC handlers before writing to disk.
 */
function assertWritablePayload(val: unknown, label: string): asserts val is Record<string, unknown> {
  if (val === undefined || val === null) {
    throw new Error(`${label}: payload is required`)
  }
  if (!isPlainObject(val)) {
    throw new Error(`${label}: payload must be a plain object, got ${typeof val}`)
  }
  const raw = JSON.stringify(val)
  if (Buffer.byteLength(raw, 'utf-8') > MAX_PAYLOAD_BYTES) {
    throw new Error(`${label}: payload exceeds ${MAX_PAYLOAD_BYTES} byte limit`)
  }
}

// ── File Storage Helpers ────────────────────────────────

function ensureDataDir(): void {
  if (!existsSync(userDataPath)) {
    mkdirSync(userDataPath, { recursive: true })
  }
}

/**
 * Read and parse a JSON file. Returns `null` if the file doesn't exist
 * or if the content is malformed (corrupted JSON).
 */
function readJSON(filePath: string): unknown {
  try {
    if (!existsSync(filePath)) return null
    return JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch {
    return null
  }
}

/**
 * Write a value as pretty-printed JSON. Creates the data directory if needed.
 */
function writeJSON(filePath: string, data: unknown): void {
  ensureDataDir()
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

// ── Window Creation ──────────────────────────────────────

function createWindow(): void {
  // ── API base URL ───────────────────────────────────
  // Dev: localhost:3000 | Prod: env var or production server
  const apiBaseUrl = isDev
    ? 'http://localhost:3000'
    : (process.env.SUBWAY_API_BASE_URL || 'http://35.212.200.85:3000')

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 960,
    minHeight: 540,
    title: 'Subway Surfer',
    show: false,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      additionalArguments: [`--api-base-url=${apiBaseUrl}`],
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ── IPC Handlers ─────────────────────────────────────────

/** app namespace */
ipcMain.handle('app:getVersion', (): string => {
  return app.getVersion()
})

/** window namespace */
ipcMain.handle('window:toggleFullscreen', () => {
  if (!mainWindow) return
  if (mainWindow.isFullScreen()) {
    mainWindow.setFullScreen(false)
  } else {
    mainWindow.setFullScreen(true)
  }
})

/** settings namespace */
ipcMain.handle('settings:get', (): Record<string, unknown> => {
  const data = readJSON(settingsFile)
  return isPlainObject(data) ? (data as Record<string, unknown>) : {}
})

ipcMain.handle('settings:set', (_event, settings: unknown): void => {
  assertWritablePayload(settings, 'settings:set')
  writeJSON(settingsFile, settings)
})

/** save namespace */
ipcMain.handle('save:getLocal', (): Record<string, unknown> | null => {
  const data = readJSON(saveFile)
  return isPlainObject(data) ? (data as Record<string, unknown>) : null
})

ipcMain.handle('save:setLocal', (_event, save: unknown): void => {
  assertWritablePayload(save, 'save:setLocal')
  writeJSON(saveFile, save)
})

// ── Lifecycle ─────────────────────────────────────────────

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
