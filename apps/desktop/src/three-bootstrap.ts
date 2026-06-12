// ===== Subway Surfer - Three.js Bootstrap =====
// Bundled as IIFE by vite.three.config.ts. Loaded as a blocking <script>
// BEFORE legacy/game.js, so window.THREE is ready for the IIFE game code.
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

;(window as any).THREE = { ...THREE, GLTFLoader }
