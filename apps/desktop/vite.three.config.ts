import { defineConfig } from 'vite'
import { resolve } from 'path'

// Separate Vite build for three-bootstrap IIFE.
// Output goes to src/public/ so the main Vite build copies it to dist/renderer/
// and the dev server serves it from /three-bootstrap.js.
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/three-bootstrap.ts'),
      formats: ['iife'],
      name: 'SubwayThree',
      fileName: () => 'three-bootstrap.js',
    },
    outDir: resolve(__dirname, 'src/public'),
    emptyOutDir: false,
  },
  resolve: {
    // Ensure three is resolved from apps/desktop/node_modules
    alias: {
      three: resolve(__dirname, 'node_modules/three'),
    },
  },
})
