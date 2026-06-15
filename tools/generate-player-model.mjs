import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import * as THREE from '../apps/desktop/node_modules/three/build/three.module.js'
import { GLTFExporter } from '../apps/desktop/node_modules/three/examples/jsm/exporters/GLTFExporter.js'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

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

function mat(color, roughness = 0.75, metalness = 0.02) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness })
}

const skin = mat(0xd99a6c, 0.85)
const skinDark = mat(0xb87652, 0.9)
const jacket = mat(0x1f5fbf, 0.68)
const jacketDark = mat(0x184886, 0.72)
const pants = mat(0x263a66, 0.76)
const sole = mat(0xf4f7fb, 0.65)
const shoeBlue = mat(0x35a4ff, 0.55)
const hair = mat(0x2b1f1a, 0.9)
const cap = mat(0xd63a2f, 0.7)
const trim = mat(0xe9eef6, 0.65)
const visor = mat(0x0f172a, 0.55)

function mesh(name, geometry, material, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
  const m = new THREE.Mesh(geometry, material)
  m.name = name
  m.position.set(...position)
  m.rotation.set(...rotation)
  m.scale.set(...scale)
  m.castShadow = true
  m.receiveShadow = true
  return m
}

function cylinderBetween(name, radius, length, material, position, rotation = [0, 0, 0], radialSegments = 12) {
  const geo = new THREE.CylinderGeometry(radius, radius, length, radialSegments)
  return mesh(name, geo, material, position, rotation)
}

function sphere(name, radius, material, position, scale = [1, 1, 1], segments = 14) {
  return mesh(name, new THREE.SphereGeometry(radius, segments, Math.max(8, Math.floor(segments * 0.75))), material, position, [0, 0, 0], scale)
}

const player = new THREE.Group()
player.name = 'NeoRunner_Root'

const body = new THREE.Group()
body.name = 'BodyRoot'
player.add(body)

const torso = new THREE.Group()
torso.name = 'Torso'
body.add(torso)
torso.add(mesh('JacketTorso', new THREE.BoxGeometry(0.62, 0.68, 0.34), jacket, [0, 0.95, 0], [0, 0, 0], [1, 1, 1]))
torso.add(mesh('ChestTrim', new THREE.BoxGeometry(0.18, 0.72, 0.03), trim, [0, 0.97, 0.18]))
torso.add(mesh('HipBlock', new THREE.BoxGeometry(0.52, 0.2, 0.32), jacketDark, [0, 0.58, 0]))
torso.add(cylinderBetween('Neck', 0.11, 0.18, skinDark, [0, 1.36, 0], [0, 0, 0], 12))

const head = new THREE.Group()
head.name = 'Head'
torso.add(head)
head.add(sphere('HeadShape', 0.24, skin, [0, 1.55, 0], [0.92, 1.08, 0.92], 18))
head.add(mesh('FacePanel', new THREE.BoxGeometry(0.2, 0.12, 0.025), skin, [0, 1.52, 0.205]))
head.add(sphere('Nose', 0.035, skinDark, [0, 1.54, 0.235], [0.8, 1, 1.1], 10))
head.add(mesh('HairCap', new THREE.SphereGeometry(0.245, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hair, [0, 1.62, -0.005], [0, 0, 0], [1.02, 0.72, 1.02]))
head.add(mesh('RedCap', new THREE.CylinderGeometry(0.22, 0.245, 0.09, 16), cap, [0, 1.76, 0]))
head.add(mesh('CapBrim', new THREE.BoxGeometry(0.28, 0.04, 0.16), cap, [0, 1.73, 0.18], [-0.2, 0, 0]))
head.add(mesh('Visor', new THREE.BoxGeometry(0.22, 0.03, 0.025), visor, [0, 1.58, 0.225]))

function buildArm(side) {
  const sign = side === 'Left' ? -1 : 1
  const arm = new THREE.Group()
  arm.name = `${side}Arm`
  arm.position.set(sign * 0.39, 1.18, 0)
  torso.add(arm)
  arm.add(sphere(`${side}Shoulder`, 0.12, jacketDark, [0, 0, 0], [1, 0.9, 1], 12))
  arm.add(cylinderBetween(`${side}UpperArm`, 0.065, 0.34, jacket, [sign * 0.03, -0.2, 0], [0.04, 0, sign * 0.16], 12))
  arm.add(sphere(`${side}Elbow`, 0.075, jacketDark, [sign * 0.06, -0.38, 0], [1, 0.9, 1], 10))
  arm.add(cylinderBetween(`${side}Forearm`, 0.055, 0.34, skin, [sign * 0.08, -0.56, 0], [-0.02, 0, sign * -0.12], 12))
  arm.add(sphere(`${side}Hand`, 0.075, skinDark, [sign * 0.1, -0.75, 0.02], [1, 0.92, 1], 10))
}

function buildLeg(side) {
  const sign = side === 'Left' ? -1 : 1
  const leg = new THREE.Group()
  leg.name = `${side}Leg`
  leg.position.set(sign * 0.19, 0.55, 0)
  body.add(leg)
  leg.add(sphere(`${side}HipJoint`, 0.105, pants, [0, 0.04, 0], [1, 0.85, 1], 12))
  leg.add(cylinderBetween(`${side}Thigh`, 0.08, 0.38, pants, [0, -0.17, 0], [0.02, 0, sign * 0.05], 12))
  leg.add(sphere(`${side}Knee`, 0.078, pants, [0, -0.38, 0], [1, 0.9, 1], 10))
  leg.add(cylinderBetween(`${side}Shin`, 0.068, 0.38, pants, [0, -0.58, 0], [-0.04, 0, sign * -0.03], 12))
  leg.add(mesh(`${side}Shoe`, new THREE.BoxGeometry(0.18, 0.11, 0.34), shoeBlue, [0, -0.82, 0.08], [0.08, 0, 0]))
  leg.add(mesh(`${side}Sole`, new THREE.BoxGeometry(0.19, 0.035, 0.36), sole, [0, -0.89, 0.09]))
}

buildArm('Left')
buildArm('Right')
buildLeg('Left')
buildLeg('Right')

// Tiny shadow catcher disk under the feet, dark and flush with the ground.
player.add(mesh('ContactShadow', new THREE.CircleGeometry(0.45, 24), mat(0x0b1220, 0.95), [0, 0.01, 0.02], [-Math.PI / 2, 0, 0], [1, 0.55, 1]))

function qTrack(node, times, eulers) {
  const values = []
  for (const e of eulers) {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(e[0], e[1], e[2]))
    values.push(q.x, q.y, q.z, q.w)
  }
  return new THREE.QuaternionKeyframeTrack(`${node}.quaternion`, times, values)
}

function vTrack(node, prop, times, values) {
  return new THREE.NumberKeyframeTrack(`${node}.${prop}`, times, values)
}

const idleT = [0, 0.5, 1]
const runT = [0, 0.16, 0.32, 0.48, 0.64]
const jumpT = [0, 0.25, 0.5]
const slideT = [0, 0.2, 0.45, 0.7]

const animations = [
  new THREE.AnimationClip('Idle', 1, [
    vTrack('BodyRoot', 'position[y]', idleT, [0, 0.035, 0]),
    qTrack('Head', idleT, [[0, 0, 0], [0.04, 0, 0], [0, 0, 0]]),
    qTrack('LeftArm', idleT, [[0.08, 0, 0.08], [0.02, 0, 0.08], [0.08, 0, 0.08]]),
    qTrack('RightArm', idleT, [[-0.08, 0, -0.08], [-0.02, 0, -0.08], [-0.08, 0, -0.08]])
  ]),
  new THREE.AnimationClip('Run', 0.64, [
    vTrack('BodyRoot', 'position[y]', runT, [0, 0.04, 0, 0.04, 0]),
    qTrack('LeftArm', runT, [[0.65,0,0.08], [-0.65,0,0.08], [0.65,0,0.08], [-0.65,0,0.08], [0.65,0,0.08]]),
    qTrack('RightArm', runT, [[-0.65,0,-0.08], [0.65,0,-0.08], [-0.65,0,-0.08], [0.65,0,-0.08], [-0.65,0,-0.08]]),
    qTrack('LeftLeg', runT, [[-0.7,0,0], [0.55,0,0], [-0.7,0,0], [0.55,0,0], [-0.7,0,0]]),
    qTrack('RightLeg', runT, [[0.55,0,0], [-0.7,0,0], [0.55,0,0], [-0.7,0,0], [0.55,0,0]])
  ]),
  new THREE.AnimationClip('Jump', 0.5, [
    qTrack('Torso', jumpT, [[-0.08,0,0], [-0.18,0,0], [-0.1,0,0]]),
    qTrack('LeftArm', jumpT, [[-0.5,0,0.12], [-0.95,0,0.12], [-0.65,0,0.12]]),
    qTrack('RightArm', jumpT, [[-0.5,0,-0.12], [-0.95,0,-0.12], [-0.65,0,-0.12]]),
    qTrack('LeftLeg', jumpT, [[0.25,0,0], [0.55,0,0], [0.3,0,0]]),
    qTrack('RightLeg', jumpT, [[0.2,0,0], [0.45,0,0], [0.25,0,0]])
  ]),
  new THREE.AnimationClip('Slide', 0.7, [
    qTrack('Torso', slideT, [[0,0,0], [0.95,0,0], [1.05,0,0], [0,0,0]]),
    qTrack('LeftLeg', slideT, [[0,0,0], [-0.85,0,0], [-0.95,0,0], [0,0,0]]),
    qTrack('RightLeg', slideT, [[0,0,0], [0.55,0,0], [0.65,0,0], [0,0,0]])
  ]),
  new THREE.AnimationClip('StrafeLeft', 0.35, [
    qTrack('Torso', [0, 0.18, 0.35], [[0,0,0], [0,0,0.22], [0,0,0]]),
    qTrack('LeftLeg', [0, 0.18, 0.35], [[0,0,0], [-0.25,0,0.16], [0,0,0]])
  ]),
  new THREE.AnimationClip('StrafeRight', 0.35, [
    qTrack('Torso', [0, 0.18, 0.35], [[0,0,0], [0,0,-0.22], [0,0,0]]),
    qTrack('RightLeg', [0, 0.18, 0.35], [[0,0,0], [-0.25,0,-0.16], [0,0,0]])
  ]),
  new THREE.AnimationClip('Fall', 0.45, [
    qTrack('Torso', [0, 0.22, 0.45], [[0.12,0,0], [0.28,0,0], [0.12,0,0]]),
    qTrack('LeftArm', [0, 0.22, 0.45], [[0.4,0,0.15], [0.8,0,0.15], [0.4,0,0.15]]),
    qTrack('RightArm', [0, 0.22, 0.45], [[0.4,0,-0.15], [0.8,0,-0.15], [0.4,0,-0.15]])
  ]),
  new THREE.AnimationClip('Death', 0.8, [
    qTrack('BodyRoot', [0, 0.4, 0.8], [[0,0,0], [1.15,0,0.35], [1.4,0,0.55]]),
    vTrack('BodyRoot', 'position[y]', [0, 0.4, 0.8], [0, -0.2, -0.42])
  ])
]

const scene = new THREE.Scene()
scene.name = 'NeoRunnerModel'
scene.add(player)

const exporter = new GLTFExporter()
const result = await new Promise((resolve, reject) => {
  try {
    exporter.parse(scene, resolve, { binary: true, animations })
  } catch (err) {
    reject(err)
  }
})
const buffer = Buffer.from(result)

for (const output of [
  path.join(rootDir, 'models', 'player.glb'),
  path.join(rootDir, 'apps', 'desktop', 'src', 'public', 'models', 'player.glb')
]) {
  fs.mkdirSync(path.dirname(output), { recursive: true })
  fs.writeFileSync(output, buffer)
  console.log(`wrote ${output} (${buffer.length} bytes)`)
}
