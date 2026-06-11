// ===== Subway Surfer - Electron Preload =====
// Runs before any page scripts. Exposes:
//   1. window.desktopAPI — secure IPC bridge (contextBridge)
//   2. window.__SUBWAY_CONFIG__ — runtime config for legacy game.js
//
// NO ipcRenderer access leaks to the renderer.

import { contextBridge, ipcRenderer } from 'electron'

// ── Runtime Config (read before page scripts) ────────────
// The API base URL is passed from main.ts via additionalArguments,
// so it works even with sandbox: true.
const apiArg = process.argv.find(a => a.startsWith('--api-base-url='))
const API_BASE_URL = apiArg
  ? apiArg.split('=', 2)[1]
  : 'http://35.212.200.85:3000' // hard fallback (shouldn't reach here)

contextBridge.exposeInMainWorld('__SUBWAY_CONFIG__', {
  API_BASE_URL,
})

// ── Secure IPC Bridge ────────────────────────────────────

contextBridge.exposeInMainWorld('desktopAPI', {
  app: {
    getVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
  },

  window: {
    toggleFullscreen: (): Promise<void> => ipcRenderer.invoke('window:toggleFullscreen'),
  },

  settings: {
    get: (): Promise<Record<string, unknown>> => ipcRenderer.invoke('settings:get'),
    set: (settings: Record<string, unknown>): Promise<void> =>
      ipcRenderer.invoke('settings:set', settings),
  },

  save: {
    getLocal: (): Promise<Record<string, unknown> | null> =>
      ipcRenderer.invoke('save:getLocal'),
    setLocal: (save: Record<string, unknown>): Promise<void> =>
      ipcRenderer.invoke('save:setLocal', save),
  },
})
