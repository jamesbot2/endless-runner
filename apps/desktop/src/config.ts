// ===== Subway Surfer - App Configuration =====
// Vite replaces import.meta.env.VITE_* at build time.
// Fallback: development → localhost:3000 (local dev server).
// Production: set VITE_API_BASE_URL at build time to override.
//
// In Electron, the preload also exposes __SUBWAY_CONFIG__ via contextBridge
// (which runs before any page scripts). That takes priority over this value
// because legacy code checks window.__SUBWAY_CONFIG__.API_BASE_URL first.

export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
