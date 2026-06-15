// ===== Endless Runner - Desktop API Type Declarations =====
// Exposed via contextBridge in preload.ts. All methods use ipcRenderer.invoke.
// Renderer NEVER has direct access to ipcRenderer, fs, or Node.js APIs.

/** Runtime config exposed by Electron preload before any page scripts run. */
interface EndlessRunnerConfig {
  API_BASE_URL: string
}

interface DesktopAPI {
  app: {
    /** Returns the application version from package.json. */
    getVersion(): Promise<string>
  }

  window: {
    /** Toggles between fullscreen and windowed mode. */
    toggleFullscreen(): Promise<void>
  }

  settings: {
    /** Reads all settings from the user data directory. Returns {} if none. */
    get(): Promise<Record<string, unknown>>
    /** Overwrites all settings (deep merge is caller's responsibility). */
    set(settings: Record<string, unknown>): Promise<void>
  }

  save: {
    /** Reads local game save data. Returns null if no save exists. */
    getLocal(): Promise<Record<string, unknown> | null>
    /** Writes local game save data (called after each run or on quit). */
    setLocal(save: Record<string, unknown>): Promise<void>
  }
}

declare global {
  interface Window {
    /** Set by preload.ts via contextBridge — available before game.js loads. */
    __ENDLESS_RUNNER_CONFIG__?: EndlessRunnerConfig
    /** Legacy alias kept so existing builds and scripts keep working. */
    __SUBWAY_CONFIG__?: EndlessRunnerConfig
    /** Set by preload.ts via contextBridge — all methods use ipcRenderer.invoke. */
    desktopAPI?: DesktopAPI
  }
}

export {}
