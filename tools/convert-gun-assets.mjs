import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import * as THREE from '../apps/desktop/node_modules/three/build/three.module.js'
import { OBJLoader } from '../apps/desktop/node_modules/three/examples/jsm/loaders/OBJLoader.js'
import { MTLLoader } from '../apps/desktop/node_modules/three/examples/jsm/loaders/MTLLoader.js'
import { GLTFExporter } from '../apps/desktop/node_modules/three/examples/jsm/exporters/GLTFExporter.js'

globalThis.window = globalThis.window || {}
globalThis.window.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = buffer
      if (this.onloadend) this.onloadend()
    }).catch((err) => {
      this.error = err
      if (this.onerror) this.onerror(err)
    })
  }
}

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const packDir = process.argv[2] || process.env.GUN_PACK_DIR || 'D:\\ac_project\\Sci-Fi Gun Pack by @Quaternius'
const sourceDir = path.join(packDir, 'OBJ')

const jobs = [
  { source: 'Pistol', file: 'pistol', target: { width: 0.42, height: 0.26, depth: 0.96 }, primary: 0x4f6378, accent: 0xc84a4a, dark: 0x202733 },
  { source: 'LongPistol', file: 'long-pistol', target: { width: 0.42, height: 0.28, depth: 1.12 }, primary: 0x7d2f28, accent: 0xd66b3f, dark: 0x261818 },
  { source: 'Rifle', file: 'rifle', target: { width: 0.5, height: 0.34, depth: 1.52 }, primary: 0x2e6b70, accent: 0xd3a63f, dark: 0x17282d },
  { source: 'Sniper rifle', file: 'sniper-rifle', target: { width: 0.54, height: 0.36, depth: 1.82 }, primary: 0x607a95, accent: 0x8d5ca8, dark: 0x1b2130 }
]

function normalizeModel(object, target) {
  const box = new THREE.Box3().setFromObject(object)
  const size = new THREE.Vector3()
  const center = new THREE.Vector3()
  box.getSize(size)
  box.getCenter(center)
  const scale = Math.min(
    target.width / Math.max(size.x, 0.001),
    target.height / Math.max(size.y, 0.001),
    target.depth / Math.max(size.z, 0.001)
  )
  object.scale.setScalar(scale)
  object.updateMatrixWorld(true)
  box.setFromObject(object)
  box.getCenter(center)
  object.position.sub(center)
  box.setFromObject(object)
  object.position.y -= box.min.y
}

function materialFor(mat, job) {
  const name = (mat && mat.name ? mat.name : '').toLowerCase()
  let color = mat && mat.color ? mat.color.clone() : new THREE.Color(0x9aa4b2)
  const brightness = (color.r + color.g + color.b) / 3
  if (/main/.test(name)) color = new THREE.Color(job.primary)
  else if (/detail|barrel|scope|glass/.test(name)) color = new THREE.Color(job.accent)
  else if (/handle|grip|dark/.test(name) || brightness < 0.06) color = new THREE.Color(job.dark)
  return new THREE.MeshStandardMaterial({
    name: mat && mat.name ? mat.name : 'GunMaterial',
    color,
    roughness: 0.54,
    metalness: /barrel|metal|silver|grey|gray|main/.test(name) ? 0.22 : 0.06
  })
}

async function exportGlb(scene) {
  const exporter = new GLTFExporter()
  return await new Promise((resolve, reject) => {
    try {
      exporter.parse(scene, resolve, { binary: true })
    } catch (err) {
      reject(err)
    }
  })
}

async function convert(job) {
  const objPath = path.join(sourceDir, `${job.source}.obj`)
  const mtlPath = path.join(sourceDir, `${job.source}.mtl`)
  const materials = fs.existsSync(mtlPath) ? new MTLLoader().parse(fs.readFileSync(mtlPath, 'utf8'), '') : null
  if (materials) materials.preload()

  const loader = new OBJLoader()
  if (materials) loader.setMaterials(materials)
  const model = loader.parse(fs.readFileSync(objPath, 'utf8'))
  model.name = `${job.file}-gun-model`
  model.traverse((node) => {
    if (!node.isMesh) return
    const mats = Array.isArray(node.material) ? node.material : [node.material]
    const converted = mats.map((mat) => materialFor(mat, job))
    node.material = Array.isArray(node.material) ? converted : converted[0]
    node.castShadow = true
    node.receiveShadow = true
  })
  normalizeModel(model, job.target)

  const scene = new THREE.Scene()
  scene.name = `${job.file}-gun-scene`
  scene.add(model)
  const buffer = Buffer.from(await exportGlb(scene))
  for (const out of [
    path.join(rootDir, 'models', 'guns', `${job.file}.glb`),
    path.join(rootDir, 'apps', 'desktop', 'src', 'public', 'models', 'guns', `${job.file}.glb`)
  ]) {
    fs.mkdirSync(path.dirname(out), { recursive: true })
    fs.writeFileSync(out, buffer)
    console.log(`wrote ${out} (${buffer.length} bytes)`)
  }
}

for (const job of jobs) await convert(job)
