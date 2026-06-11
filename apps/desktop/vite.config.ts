import { defineConfig } from 'vite'
import { resolve } from 'path'

// Vite builds the Renderer (src/) → dist/renderer/
// The Electron main/preload are compiled separately (tsc -p electron/tsconfig.json)
export default defineConfig({
  root: 'src',
  base: './',

  build: {
    outDir: '../dist/renderer',
    emptyOutDir: true,
    // Inline assets under 4 KB to reduce requests
    assetsInlineLimit: 4096,
  },

  server: {
    port: 5173,
    strictPort: true,
    // Allow serving files from the project root (game.js, style.css)
    fs: {
      allow: ['../..'],
    },
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
