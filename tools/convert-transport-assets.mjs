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
const packDir = process.argv[2] || process.env.TRANSPORT_PACK_DIR || 'D:\\ac_project\\Public Transport Pack - Feb 2017'
const sourceDir = path.join(packDir, 'OBJ')

const materialPalettes = {
  Train: {
    Black: 0x151923,
    Outside: 0x1e88e5,
    Top: 0xd7dde7,
    Windows: 0x8fd7ff
  },
  Bus: {
    Bottom: 0x151923,
    Bumper: 0xe8edf4,
    Details: 0x263449,
    Lights: 0xfff0a0,
    Material: 0xf4c430,
    Top: 0xf8fafc,
    Windows: 0x8fd7ff
  }
}

function materialFor(name, palette) {
  const color = palette[name] || 0x9aa4b2
  const transparent = /window/i.test(name)
  return new THREE.MeshStandardMaterial({
    color,
    roughness: transparent ? 0.28 : 0.72,
    metalness: transparent ? 0.05 : 0.02,
    transparent,
    opacity: transparent ? 0.78 : 1
  })
}

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

async function convert(name, target) {
  const objPath = path.join(sourceDir, `${name}.obj`)
  const mtlPath = path.join(sourceDir, `${name}.mtl`)
  const objText = fs.readFileSync(objPath, 'utf8')
  const mtlText = fs.existsSync(mtlPath) ? fs.readFileSync(mtlPath, 'utf8') : ''
  const materials = mtlText ? new MTLLoader().parse(mtlText, '') : null
  if (materials) materials.preload()

  const loader = new OBJLoader()
  if (materials) loader.setMaterials(materials)
  const model = loader.parse(objText)
  model.name = `${name}Asset`
  model.traverse((node) => {
    if (!node.isMesh) return
    const sourceName = Array.isArray(node.material) ? node.material[0]?.name : node.material?.name
    node.material = materialFor(sourceName || 'Material', materialPalettes[name] || {})
    node.castShadow = true
    node.receiveShadow = true
  })

  normalizeModel(model, target)

  const root = new THREE.Scene()
  root.name = `${name}VehicleModel`
  root.add(model)
  const result = await exportGlb(root)
  const buffer = Buffer.from(result)

  for (const out of [
    path.join(rootDir, 'models', 'vehicles', `${name.toLowerCase()}.glb`),
    path.join(rootDir, 'apps', 'desktop', 'src', 'public', 'models', 'vehicles', `${name.toLowerCase()}.glb`)
  ]) {
    fs.mkdirSync(path.dirname(out), { recursive: true })
    fs.writeFileSync(out, buffer)
    console.log(`wrote ${out} (${buffer.length} bytes)`)
  }
}

await convert('Train', { width: 2.35, height: 1.78, depth: 5.75 })
await convert('Bus', { width: 2.2, height: 1.65, depth: 4.8 })
