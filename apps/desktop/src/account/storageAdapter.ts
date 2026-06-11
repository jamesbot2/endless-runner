// ===== Subway Surfer - Storage Adapter =====
// Dual-mode persistence: Electron desktopAPI → localStorage fallback.
// Local saves are kept separate from cloud saves (server-side).

/// <reference path="../types/desktop-api.d.ts" />

// ── Types ────────────────────────────────────────────────

export interface GameSave {
  credits: number
  totalCoins: number
  maxEasy: number
  maxMedium: number
  maxHard: number
  maxDistance: number
  runCount: number
  ownedAbilities: number[]
  equippedAbility: number
  updatedAt: string // ISO 8601
}

export interface AppSettings {
  musicVolume: number
  sfxVolume: number
  theme: number
  [key: string]: unknown
}

// ── Helpers ──────────────────────────────────────────────

const SAVE_KEY = '__subway_local_save__'
const SETTINGS_KEY = '__subway_local_settings__'

function nowISO(): string {
  return new Date().toISOString()
}

function defaultSave(): GameSave {
  return {
    credits: 0,
    totalCoins: 0,
    maxEasy: 0,
    maxMedium: 0,
    maxHard: 0,
    maxDistance: 0,
    runCount: 0,
    ownedAbilities: [0],
    equippedAbility: 0,
    updatedAt: nowISO(),
  }
}

function defaultSettings(): AppSettings {
  return {
    musicVolume: 0.5,
    sfxVolume: 0.8,
    theme: 0,
  }
}

function isGameSave(val: unknown): val is GameSave {
  if (typeof val !== 'object' || val === null) return false
  const s = val as Record<string, unknown>
  return (
    typeof s.credits === 'number' &&
    typeof s.totalCoins === 'number' &&
    typeof s.maxDistance === 'number' &&
    typeof s.runCount === 'number' &&
    Array.isArray(s.ownedAbilities) &&
    typeof s.equippedAbility === 'number' &&
    typeof s.updatedAt === 'string'
  )
}

function isAppSettings(val: unknown): val is AppSettings {
  if (typeof val !== 'object' || val === null) return false
  const s = val as Record<string, unknown>
  return (
    typeof s.musicVolume === 'number' &&
    typeof s.sfxVolume === 'number'
  )
}

// ── Desktop API (Electron) ───────────────────────────────

function hasDesktopAPI(): boolean {
  return typeof window.desktopAPI !== 'undefined' && window.desktopAPI !== null
}

// ── localStorage (Browser) ───────────────────────────────

function lsGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function lsSet(key: string, val: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(val))
  } catch (e) {
    console.warn('[Storage] localStorage write failed:', e)
  }
}

// ── Public API ───────────────────────────────────────────

/**
 * Load the local game save. Returns a default GameSave if nothing is stored.
 */
export async function loadLocalSave(): Promise<GameSave> {
  if (hasDesktopAPI()) {
    const data = await window.desktopAPI!.save.getLocal()
    if (data !== null && isGameSave(data)) {
      return data as GameSave
    }
    return defaultSave()
  }

  // Browser fallback
  const data = lsGet<unknown>(SAVE_KEY)
  if (data !== null && isGameSave(data)) {
    return data as GameSave
  }
  return defaultSave()
}

/**
 * Persist the local game save. Merges updatedAt automatically.
 */
export async function saveLocalGame(save: Omit<GameSave, 'updatedAt'> & { updatedAt?: string }): Promise<void> {
  const payload: GameSave = {
    ...save,
    updatedAt: nowISO(),
  }

  if (hasDesktopAPI()) {
    await window.desktopAPI!.save.setLocal(payload as unknown as Record<string, unknown>)
    return
  }

  // Browser fallback
  lsSet(SAVE_KEY, payload)
}

/**
 * Load app settings. Returns defaults if nothing is stored.
 */
export async function loadSettings(): Promise<AppSettings> {
  if (hasDesktopAPI()) {
    const data = await window.desktopAPI!.settings.get()
    if (data !== null && isAppSettings(data)) {
      return data as unknown as AppSettings
    }
    return defaultSettings()
  }

  // Browser fallback
  const data = lsGet<unknown>(SETTINGS_KEY)
  if (data !== null && isAppSettings(data)) {
    return data as AppSettings
  }
  return defaultSettings()
}

/**
 * Persist app settings.
 */
export async function saveSettings(settings: Partial<AppSettings>): Promise<void> {
  // Merge with existing so partial updates don't clobber unknown keys
  const existing = await loadSettings()
  const merged: AppSettings = { ...existing, ...settings }

  if (hasDesktopAPI()) {
    await window.desktopAPI!.settings.set(merged as unknown as Record<string, unknown>)
    return
  }

  // Browser fallback
  lsSet(SETTINGS_KEY, merged)
}
