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
const treePack = process.argv[2] || process.env.TREE_PACK_DIR || 'D:\\ac_project\\Textured Stylized Trees - May 2020'
const buildingPack = process.argv[3] || process.env.BUILDINGS_PACK_DIR || 'D:\\ac_project\\Buildings Pack - Jan 2019'

const jobs = [
  { pack: buildingPack, type: 'buildings', name: 'Building1_Small', target: { width: 2.4, height: 6.4, depth: 2.4 } },
  { pack: buildingPack, type: 'buildings', name: 'Building2_Small', target: { width: 2.3, height: 5.6, depth: 2.2 } },
  { pack: buildingPack, type: 'buildings', name: 'Building3_Small', target: { width: 2.2, height: 5.4, depth: 2.2 } },
  { pack: buildingPack, type: 'buildings', name: 'Building4', target: { width: 2.5, height: 6.0, depth: 2.5 } },
  { pack: buildingPack, type: 'buildings', name: 'House2', target: { width: 2.6, height: 3.4, depth: 2.6 } },
  { pack: treePack, type: 'trees', name: 'Tree_1', target: { width: 1.8, height: 3.8, depth: 1.8 } },
  { pack: treePack, type: 'trees', name: 'Tree_4', target: { width: 1.9, height: 4.0, depth: 1.9 } },
  { pack: treePack, type: 'trees', name: 'Tree_7', target: { width: 1.8, height: 3.7, depth: 1.8 } },
  { pack: treePack, type: 'trees', name: 'Pine_1', target: { width: 1.7, height: 4.2, depth: 1.7 } },
  { pack: treePack, type: 'trees', name: 'Birch_2', target: { width: 1.7, height: 4.1, depth: 1.7 } }
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
  const objDir = path.join(job.pack, 'OBJ')
  const objPath = path.join(objDir, `${job.name}.obj`)
  const mtlPath = path.join(objDir, `${job.name}.mtl`)
  const materials = fs.existsSync(mtlPath) ? new MTLLoader().parse(fs.readFileSync(mtlPath, 'utf8'), '') : null
  if (materials) materials.preload()

  const loader = new OBJLoader()
  if (materials) loader.setMaterials(materials)
  const model = loader.parse(fs.readFileSync(objPath, 'utf8'))
  model.name = `${job.name}Scenery`
  model.traverse((node) => {
    if (!node.isMesh) return
    node.castShadow = true
    node.receiveShadow = true
    const mats = Array.isArray(node.material) ? node.material : [node.material]
    const converted = mats.map((mat) => {
      if (!mat) return null
      return new THREE.MeshStandardMaterial({
        name: mat.name || 'Material',
        color: mat.color ? mat.color.clone() : new THREE.Color(0x9aa4b2),
        roughness: 0.82,
        metalness: 0.02
      })
    }).filter(Boolean)
    node.material = Array.isArray(node.material) ? converted : (converted[0] || new THREE.MeshStandardMaterial({ color: 0x9aa4b2 }))
  })
  normalizeModel(model, job.target)

  const scene = new THREE.Scene()
  scene.name = `${job.name}Scene`
  scene.add(model)
  const buffer = Buffer.from(await exportGlb(scene))
  const file = `${job.name.toLowerCase()}.glb`
  for (const out of [
    path.join(rootDir, 'models', 'scenery', job.type, file),
    path.join(rootDir, 'apps', 'desktop', 'src', 'public', 'models', 'scenery', job.type, file)
  ]) {
    fs.mkdirSync(path.dirname(out), { recursive: true })
    fs.writeFileSync(out, buffer)
    console.log(`wrote ${out} (${buffer.length} bytes)`)
  }
}

for (const job of jobs) await convert(job)
