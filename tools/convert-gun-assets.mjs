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
  { source: 'Pistol', file: 'pistol', target: { width: 0.42, height: 0.26, depth: 0.96 }, accent: 0x4be7ff },
  { source: 'LongPistol', file: 'long-pistol', target: { width: 0.42, height: 0.28, depth: 1.12 }, accent: 0x86ff7a },
  { source: 'Rifle', file: 'rifle', target: { width: 0.5, height: 0.34, depth: 1.52 }, accent: 0xffd34e },
  { source: 'Sniper rifle', file: 'sniper-rifle', target: { width: 0.54, height: 0.36, depth: 1.82 }, accent: 0xff5fd7 }
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

function materialFor(mat, accent) {
  const name = (mat && mat.name ? mat.name : '').toLowerCase()
  let color = mat && mat.color ? mat.color.clone() : new THREE.Color(0x9aa4b2)
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
    const converted = mats.map((mat) => materialFor(mat, job.accent))
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
