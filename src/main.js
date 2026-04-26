/**
 * main.js - ANT ON MARS Complete Game
 * Vite 8 + Three.js WebGPU + RAPIER Physics
 */
import './style.css'
import RAPIER from '@dimforge/rapier3d-compat'
import * as THREE from 'three/webgpu'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { TransformControls } from 'three/addons/controls/TransformControls.js'
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js'
import Stats from 'stats-gl'
import { Fn, uniform, float, vec3, positionWorld, smoothstep, mix, mx_noise_float } from 'three/tsl'

// ═══════════════════════════════════════════════════════════════════════════
// GLOBALS
// ═══════════════════════════════════════════════════════════════════════════
const GROUND_SIZE = 400, GROUND_SEGMENTS = 200, GROUND_Y_OFFSET = -0.15
const HF_SIZE = 600, HF_RES = 200, HF_RETHRESHOLD = 150, GROUND_SNAP = 8
let scene, camera, renderer, stats, perlin, orbit, transformControls
let minimapCamera = null  // top-down orthographic camera for minimap scissor render
let rightViewCamera = null  // side-view camera for right-view panel
let rightViewOpen = false
let groundMesh, groundGeo, groundMat, waterMesh
let physicsWorld, FIXED_DT = 1/60
let hfBody = null, hfCollider = null, hfCenter = { x: 0, z: 0 }
let chassisBody, chassisGroup, chassisPos = new THREE.Vector3(), chassisQuat = new THREE.Quaternion()
let vehicle, wheelMeshes = [], wheelSpins = [0,0,0,0]
const WHEEL_R = 0.45, WHEEL_W = 0.3, SUSP_REST = 0.6
const WHEEL_OFF = { x: 1.0, y: 0.25, z: 0.68 }
const CHASSIS_HW = 1.0, CHASSIS_HH = 0.35, CHASSIS_HD = 0.6
let lastGroundX = 0, lastGroundZ = 0
const keys = {}
let constructorMode = false, placedObjects = [], selectedObject = null, ghostObject = null
let constructorIdCounter = 0
let vehicleMode = 'gravity', antiGravityActive = false, floatModeActive = false
let gravTanks = 5, gravTankPartial = 0, gravConsumeTime = 0
const NORMAL_JUMP = 6, ANTIGRAV_JUMP = 18, NORMAL_GRAVITY = -9.81, ANTIGRAV_GRAVITY = -4.0
let floatModePrevGravity = null, _floatPrevFOV = null
const NORMAL_GRIP = 2, HIGH_GRIP = 3.5
let currentVehicleSkinIdx = 0, _currentChassisVisual = null

// Vehicle presets: [chassisGLB, wheelGLB, chassisScale, wheelScale, chassisRotationY]
const VEHICLE_PRESETS = [
  {
    name: 'CREATIVE VAN',
    chassis: 'https://pub-6aa6b6baa3b043bf9598c7429620b422.r2.dev/van.creative.glb',
    wheels: 'https://pub-6aa6b6baa3b043bf9598c7429620b422.r2.dev/ruedacompresed.glb',
    chassisScale: 1.0,
    wheelScale: 0.49,
    chassisRotY: 0,
    wheelOffsetY: 0.42,
    chassisOffsetY: 0.65
  },
  {
    name: 'SATELLITE VAN',
    chassis: 'https://pub-6aa6b6baa3b043bf9598c7429620b422.r2.dev/van.satelite.glb',
    wheels: 'https://pub-6aa6b6baa3b043bf9598c7429620b422.r2.dev/wheel.white.glb',
    chassisScale: 1.0,
    wheelScale: 0.49,
    chassisRotY: 0,
    wheelOffsetY: 0.42,
    chassisOffsetY: 0.65
  }
]
let minimapOpen = false

let sessionStartTime = Date.now()
let currentWorldZone = -1, worldZoneDiscovered = new Set()
let zoneTransition = null
const _zoneColorFrom = new THREE.Color(), _zoneColorTo = new THREE.Color(), _zoneColorCurrent = new THREE.Color()
let teleportMenuOpen = false, escapeMenuOpen = false, gamePaused = false
let freeTpActive = false, _freeTpPrevFOV = null, _freeTpPrevOrbit = false, _freeTpMarker = null, _freeTpMarkerPos = null
let hookRopeLine = null, hookRopeTimer = 0
let rHoldTimer = null, rHoldStart = 0, rHoldInterval = null
const HOLD_DURATION = 1500
let jumpState = 'ready', jumpTimer = 0, prevSpace = false
let _telTime = 0, _telDist = 0, _telPrevPos = null
let _s9_lastZone = -1
let _windHeightCache = 0, _windHeightCacheX = -99999, _windHeightCacheZ = -99999

// Settings
const carSettings = { steer: 0.5, acceleration: 5, deceleration: 0.23, maxSpeed: 15, boostMultiplier: 2.5, jumpForce: 6, jumpCrouchTime: 0.05, flipForce: 2, grip: HIGH_GRIP, tireLerp: 0.3, debug: false, orbitControls: false }
const terrainSettings = { frequency: 0.004, amplitude: 14, planetCurvature: 0 }
const cameraSettings = { distance: 8, height: 4, lookHeight: 3.5, smoothing: 0.040 }
const fogSettings = { color: '#000000', near: 125, far: 220 }
const shadowSettings = { enabled: true, resolution: 2048, bias: -0.001, normalBias: 0.02 }
const lightSettings = { azimuth: 320, elevation: 45 }
const biomeSettings = { waterLevel: -5.0, sandEnd: 2.0, dirtEnd: 6.0, transitionWidth: 1.8, sandColor1: '#d4a656', sandColor2: '#e8c47a', dirtColor1: '#c48840', dirtColor2: '#b07030', grassColor1: '#a07048', grassColor2: '#8a6040', waterColor: '#7ecfcf', waterColorDeep: '#4a8a8a' }
const dustSettings = { enabled: true, emitRate: 0.3, minSpeed: 1.5, particleSize: 6, sizeVariance: 8, lifetime: 0.8, lifetimeVariance: 1.2, opacity: 0.6, spread: 0.8, velocitySpread: 1.5, upwardForce: 2.0, drag: 0.97, colorR: 0.78, colorG: 0.38, colorB: 0.08, colorR2: 0.55, colorG2: 0.22, colorB2: 0.04 }
const splashSettings = { enabled: true, emitRate: 0.5, minSpeed: 0.8, particleSize: 8, sizeVariance: 6, lifetime: 0.6, lifetimeVariance: 0.4, opacity: 0.7, spread: 0.6, velocitySpread: 2.0, upwardForce: 4.0, drag: 0.94, colorR: 0.45, colorG: 0.75, colorB: 0.78 }
const windSettings = { dirX: -3.5, dirZ: 1.8, gustStrength: 2.5, turbulence: 1.2, spawnRadius: 60, spawnHeight: 25, particleSize: 1.5, sizeVariance: 1.5, lifetime: 4, lifetimeVariance: 3, opacity: 0.35, drag: 0.985, colorR: 0.85, colorG: 0.75, colorB: 0.6 }
const ruinSettings = { showRuins: true, showLargeRuins: true, ruinColor: '#c4a96a' }

// TSL biome uniforms — created after biomeSettings, updated by Settings panel
let biomeU = null
function createBiomeUniforms() {
  biomeU = {
    waterLevel:      uniform(biomeSettings.waterLevel),
    sandEnd:         uniform(biomeSettings.sandEnd),
    dirtEnd:         uniform(biomeSettings.dirtEnd),
    transitionWidth: uniform(biomeSettings.transitionWidth),
    sandColor1:      uniform(new THREE.Color(biomeSettings.sandColor1)),
    sandColor2:      uniform(new THREE.Color(biomeSettings.sandColor2)),
    dirtColor1:      uniform(new THREE.Color(biomeSettings.dirtColor1)),
    dirtColor2:      uniform(new THREE.Color(biomeSettings.dirtColor2)),
    grassColor1:     uniform(new THREE.Color(biomeSettings.grassColor1)),
    grassColor2:     uniform(new THREE.Color(biomeSettings.grassColor2)),
    waterColor:      uniform(new THREE.Color(biomeSettings.waterColor)),
    waterColorDeep:  uniform(new THREE.Color(biomeSettings.waterColorDeep)),
  }
}

// GLB Catalog — assets available on Cloudflare R2
const GLB_CDN_BASE = 'https://pub-6aa6b6baa3b043bf9598c7429620b422.r2.dev'
const R2_ASSETS = [
  'antonmars.connections.enviroment.glb',
  'hands.on.mountain.glb',
  'la.bombonera.meshy.glb',
  'mate.yerba.glb',
  'wheel.white.glb',
  'rueda.glb',
  'ruedacompresed.glb',
  'van.satelite.glb',
  'van.creative.glb',
]
let GLB_CATALOG = []
async function loadGLBCatalog() {
  GLB_CATALOG = R2_ASSETS.map(f => ({ name: f.replace(/\.glb$/i,''), path: `${GLB_CDN_BASE}/${f}`, thumb: '📦' }))
}

// World Zones — hardcoded discovery zones (legacy)
const WORLD_ZONES = [
  { id: 0, name: 'SECTOR NORTE', color: '#FFB347', fogColor: '#CC6633' },
  { id: 1, name: 'CAÑON ROJO', color: '#FF6B35', fogColor: '#882211' },
  { id: 2, name: 'ZONA OSCURA', color: '#00FFE0', fogColor: '#001122' },
  { id: 3, name: 'TORMENTA', color: '#FF4444', fogColor: '#330011' }
]

// Custom Zones — user-created trigger/fog/respawn/camera/base zones
let customZones = []
let customZoneVisuals = new Map()    // zoneId -> THREE.Mesh (wireframe)
let customZoneColliders = new Map()  // zoneId -> { body, collider }
let activeCustomZones = new Set()    // zoneIds currently active (vehicle inside)

// Zone placement mode
let zonePlacementMode = false
let zonePlacementType = 'sphere'  // sphere | cylinder
let zonePlacementColor = '#00FFE0'
let zonePlacementSize = 'md'         // xs | md | xl
let zonePlacementOffsetY = 0         // vertical offset from terrain hit point
let zonePendingPoint = null          // terrain hit point waiting for Y confirm
let zoneGhostMesh = null             // preview mesh before confirm

// Zone capture / conquest system
// zoneCapture: Map<zoneId, { timeInZone, captured, onCapture }>
const zoneCaptureState = new Map()
const ZONE_CAPTURE_TIME = 5.0  // seconds to conquer a zone

// Zone size definitions (radius in world units)
const ZONE_SIZES = {
  xs: { radius: 6,  height: 6,  label: 'XS (6m)' },
  md: { radius: 20, height: 12, label: 'MD (20m)' },
  xl: { radius: 60, height: 30, label: 'XL (60m)' }
}

// Modals — data-driven modal sequences
let worldModals = new Map()  // modalId -> modal definition
let currentModal = null
let currentModalStep = 0
let modalPanels = []         // currently rendered floating panels

// Panels — floating text panels
let worldPanels = new Map()  // panelId -> panel definition

// Scatter
const SCATTER_CELL = 14, SCATTER_RANGE = 12, MAX_SCATTER_CELLS = 800
const scatterCells = new Map()
let _lastScatterCX = null, _lastScatterCZ = null, _scatterBuildQueue = []
const SCATTER_CELLS_PER_FRAME = 2

// Particles
const DUST_COUNT = 1200, SPLASH_COUNT = 300, WIND_DUST_COUNT = 1500, DEBRIS_COUNT = 600
const dustData = [], splashData = [], windDustData = [], debrisPool = []
let dustIndex = 0, splashIndex = 0, windDustIndex = 0, debrisIndex = 0, windTime = 0

// Lights
let ambientLight, redAmbient, shadowRedFill, dirLight

// ═══════════════════════════════════════════════════════════════════════════
// CAPA 1 — DRILL / TORNO MODE GLOBALS (additive)
// ═══════════════════════════════════════════════════════════════════════════
let drillCamera = null               // PerspectiveCamera, interior POV looking down
let drillCamOpen = false             // panel open/closed
let drillSampleHoldTime = 0          // seconds the player has been holding [E]
let drillSampleHoldActive = false    // is [E] currently held while panel open
const DRILL_SAMPLE_HOLD_DURATION = 2.4  // seconds to complete one sample (doubled — feels more deliberate)
const MAX_SAMPLES = 7
let roverSamples = []                // [{ id, biome, colors[], position, t }]
let _drillBlinkUntil = 0             // hud blink end-timestamp when full

// ═══════════════════════════════════════════════════════════════════════════
// CAPA 2/3/4 — PROBE / EJECT / CAPSULE / SAT_SLOT GLOBALS (additive)
// ═══════════════════════════════════════════════════════════════════════════
// State machine: 'idle' → 'prep' → 'flying' → 'eject_window' → 'capsule_flying' → 'captured' → 'idle'
let probeState = 'idle'
let probeBody = null, probeMesh = null   // Rapier dynamic body + Three.js placeholder mesh
let probeSamples = []                    // samples transferred at launch time
let probeCamera = null                   // orbital cam around the probe
let probeOrbitAngle = 0                  // radians, controlled with A/D while flying
let probeLaunchPos = null                // where the rocket left from (rover spawn)
let _probeLaunchTime = 0                 // performance.now() at launch
const PROBE_LAUNCH_IMPULSE = 6           // small initial kick — continuous thrust takes over
const PROBE_GRAVITY_SCALE = -0.025       // gentler continuous propulsion (longer flight)
const PROBE_EJECT_MIN_ALT = 137          // +30% higher — probe climbs slowly so takes longer
const PROBE_EJECT_MAX_ALT = 163          // +30% window ceiling
const PROBE_MAX_FLIGHT_TIME = 75         // more time since ascent is slower

// Capsule (Capa 4)
let capsuleBody = null, capsuleMesh = null
let capsuleCamera = null
let capsuleVelocity = new THREE.Vector3()
const CAPSULE_SPEED = 28                 // fast enough to actually catch the orbiting satellite
const CAPSULE_NUDGE_FORCE = 4            // legacy A/D fallback
const CAPSULE_TIMEOUT = 22               // capsule despawns if no capture (seconds)
const CAPSULE_MOUSE_STEER_FORCE = 26     // mouse-aim steering force (Capa 4 v2)
let _capsuleStart = 0

// SAT_SLOT — orbital capture target (a Three.js mesh + manual point-in-sphere check)
let satSlotMesh = null
let satSlotPos = new THREE.Vector3()
const SAT_SLOT_ALTITUDE_OFFSET = 130     // meters above launch — close to eject window ceiling
const SAT_SLOT_ORBITAL_RADIUS = 75       // horizontal distance — close enough to reach with speed 28
const SAT_SLOT_CAPTURE_RADIUS = 14       // tighter — must aim well
let _satSlotAngle = 0
let _satSlotBaseY = 0   // set at capsule eject time so sat is always at capsule's altitude

// Anchor flag — when true, rover is locked in place during launch prep
let roverAnchored = false
let _roverAnchorPos = null

// ─── v2 Feature globals (rework session) ─────────────────────────────────
let drillCamMode = 'floor'              // 'floor' (under chassis) | 'front' (over hood, fish-eye)
let drillHaloLight = null               // PointLight under rover during drilling
let drillTripodMeshes = []              // GLB-placeholder legs that appear during launch prep
let _drillCrouchPct = 0                 // 0..1 chassis crouch amount during drilling
let _capsuleMouseX = 0, _capsuleMouseY = 0  // -1..1 normalized mouse position inside capsule panel
let _capsuleMouseActive = false
let _launchCountdownTimer = null
let _missionReturnAnim = null           // {start, duration} for cinematic camera return after capture
// v3 — split TORNO panels, sky cam, cinematic countdown, rover lights
let drillFloorCamera = null             // fisheye underbelly cam (left panel)
let launchSkyCamera = null              // up-looking cam inside launch-prep gyro area
let _countdownCinemaActive = false
let _cdCamAngle = 0                     // current orbit angle (radians)
let _cdCamHeight = 80                   // starting height above rover
let _cdCamRadius = 60                   // orbit radius
// Rover lights — 3 modes cycled with L: 0=position(dim), 1=low beam, 2=high beam
let _lightMode = 0                      // 0=position, 1=low, 2=high
let _lightsOn = true                    // lights always on (mode determines intensity)
let _headlightMeshes = []               // 4 white rect meshes (front)
let _headlightLights = []               // 4 SpotLights (front)
let _tailLightMeshes = []              // 2 red rect meshes (rear)
let _tailLightLights = []
let _turnMeshL = null, _turnMeshR = null // orange blinkers (independent materials)
let _turnLightL = null, _turnLightR = null
let _brakeMesh = null, _brakeLight = null
let _turnBlinkT = 0
// Night mode
let _nightMode = false

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════
async function init() {
  await RAPIER.init()

  // Scene — black fog on spawn for spatial entry feeling
  scene = new THREE.Scene()
  scene.background = new THREE.Color('#000000')
  scene.fog = new THREE.Fog('#000000', 125, 220)

  // Camera
  camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500)
  camera.position.set(-8, 5, 0)

  // Minimap top-down camera — looks straight down, follows vehicle
  minimapCamera = new THREE.PerspectiveCamera(55, 1, 1, 2000)
  minimapCamera.up.set(0, 0, -1)  // north = -Z

  // Right-view side camera — close-up side shot of the vehicle
  rightViewCamera = new THREE.PerspectiveCamera(40, 1, 0.5, 500)
  rightViewCamera.up.set(0, 1, 0)

  // Renderer
  renderer = new THREE.WebGPURenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.setSize(innerWidth, innerHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  document.body.appendChild(renderer.domElement)
  await renderer.init()

  // Stats
  stats = new Stats({ trackGPU: true })
  document.body.appendChild(stats.dom)
  stats.dom.style.display = 'none'
  stats.init(renderer)

  // Noise
  perlin = new ImprovedNoise()

  // Lights
  ambientLight = new THREE.AmbientLight(0xfff0d0, 0.6); scene.add(ambientLight)
  redAmbient = new THREE.AmbientLight(0xcc3318, 0.8); scene.add(redAmbient)
  shadowRedFill = new THREE.HemisphereLight(0xfff4e8, 0xcc8855, 0.7); scene.add(shadowRedFill)
  dirLight = new THREE.DirectionalLight(0xfff0d8, 3.5)
  dirLight.position.set(10, 20, 10); dirLight.castShadow = true
  dirLight.shadow.mapSize.set(2048, 2048)
  dirLight.shadow.camera.near = 0.5; dirLight.shadow.camera.far = 100
  dirLight.shadow.camera.left = -60; dirLight.shadow.camera.right = 60
  dirLight.shadow.camera.top = 60; dirLight.shadow.camera.bottom = -60
  dirLight.shadow.bias = -0.001; dirLight.shadow.normalBias = 0.02
  scene.add(dirLight); scene.add(dirLight.target)

  // Physics
  physicsWorld = new RAPIER.World({ x: 0, y: -9.81, z: 0 })
  physicsWorld.timestep = FIXED_DT

  // Ground
  createGround()

  // Water
  createWater()

  // Heightfield
  createHeightfieldSync(0, 0)

  // Vehicle
  await createVehicle()

  // Orbit Controls
  orbit = new OrbitControls(camera, renderer.domElement)
  orbit.enabled = false; orbit.enableDamping = true

  // Transform Controls (constructor)
  transformControls = new TransformControls(camera, renderer.domElement)
  transformControls.addEventListener('dragging-changed', (e) => { orbit.enabled = !e.value && (constructorMode || carSettings.orbitControls) })
  scene.add(transformControls.getHelper())

  // Particles
  initParticles()

  // Scatter
  scene.add(scatterGroup)
  updateScatter(0, 0)
  while (_scatterBuildQueue.length > 0) tickScatterBuild()

  // UI Setup
  await loadGLBCatalog()
  setupUI()

  // CAPA 1 — TORNO / DRILL MODE (additive)
  initDrillModule()
  // CAPA 2/3/4 — PROBE / EJECT / CAPSULE (additive)
  initProbeModule()
  // v3 — rover lights
  initRoverLights()

  // Events
  setupEvents()

  // Hide loader
  setLoading('Ready', 100)
  setTimeout(() => {
    const loader = document.getElementById('loader')
    if (loader) { loader.style.opacity = '0'; setTimeout(() => loader.remove(), 600) }
  }, 300)

  // Auto-restore last saved world (slot 1 if exists)
  setTimeout(async () => {
    const lastSlot = localStorage.getItem('ant-mars-last-slot')
    const slotToLoad = lastSlot || '1'
    const raw = localStorage.getItem('ant-mars-world-' + slotToLoad)
    if (raw) {
      try {
        const data = JSON.parse(raw)
        await applyWorldData(data)
        showToast(`✦ WORLD RESTORED · ${data.slotName || 'SLOT ' + slotToLoad}`, '#B4FF50', 2500)
      } catch(e) { console.warn('[AutoRestore] failed:', e.message) }
    }
  }, 800)

  // Start loop
  renderer.setAnimationLoop(animate)
}

// ═══════════════════════════════════════════════════════════════════════════
// TERRAIN
// ═══════════════════════════════════════════════════════════════════════════
function getTerrainHeight(x, z) {
  const s = terrainSettings.frequency, a = terrainSettings.amplitude
  let h = 0
  h += perlin.noise(x * s, 0, z * s) * a
  h += perlin.noise(x * s * 2, 1, z * s * 2) * a * 0.5
  h += perlin.noise(x * s * 4, 2, z * s * 4) * a * 0.25
  return h
}

function createGround() {
  createBiomeUniforms()
  const u = biomeU
  groundMat = new THREE.MeshStandardNodeMaterial({ roughness: 0.85, metalness: 0 })
  groundMat.colorNode = Fn(() => {
    const wx = positionWorld.x, wz = positionWorld.z, h = positionWorld.y
    const n = mx_noise_float(vec3(wx.mul(0.15), float(0), wz.mul(0.15))).mul(0.5).add(0.5)
    const tn = mx_noise_float(vec3(wx.mul(0.06), float(0), wz.mul(0.06))).mul(u.transitionWidth)
    const adjustedH = h.add(tn)
    const halfTW = u.transitionWidth.mul(0.5)
    const sandT  = smoothstep(u.sandEnd.sub(halfTW), u.sandEnd.add(halfTW), adjustedH)
    const grassT = smoothstep(u.dirtEnd.sub(halfTW), u.dirtEnd.add(halfTW), adjustedH)
    const sand   = mix(u.sandColor1, u.sandColor2, n)
    const dirt   = mix(u.dirtColor1, u.dirtColor2, n)
    const grass  = mix(u.grassColor1, u.grassColor2, n)
    const surface = mix(mix(sand, dirt, sandT), grass, grassT)
    const underwaterDarken = smoothstep(u.waterLevel.add(float(0.5)), u.waterLevel.sub(float(1.5)), h)
    return mix(surface, vec3(0.08, 0.12, 0.1), underwaterDarken)
  })()
  groundGeo = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE, GROUND_SEGMENTS, GROUND_SEGMENTS)
  groundMesh = new THREE.Mesh(groundGeo, groundMat)
  groundMesh.rotation.x = -Math.PI / 2; groundMesh.receiveShadow = true
  scene.add(groundMesh)
  updateGroundSync(0, 0)
}

function updateGroundSync(px, pz) {
  groundMesh.position.x = px; groundMesh.position.z = pz
  const posAttr = groundGeo.attributes.position
  const total = posAttr.count
  for (let i = 0; i < total; i++) {
    const lx = posAttr.getX(i), ly = posAttr.getY(i)
    const curve = (terrainSettings.planetCurvature || 0) * (lx * lx + ly * ly)
    posAttr.setZ(i, getTerrainHeight(lx + px, pz - ly) + GROUND_Y_OFFSET - curve)
  }
  posAttr.needsUpdate = true
  groundGeo.computeVertexNormals()
}

function createWater() {
  const waterMat = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0.3, side: THREE.DoubleSide, color: '#7ecfcf' })
  const waterGeo = new THREE.PlaneGeometry(GROUND_SIZE + 100, GROUND_SIZE + 100, 2, 2)
  waterMesh = new THREE.Mesh(waterGeo, waterMat)
  waterMesh.rotation.x = -Math.PI / 2
  waterMesh.position.y = biomeSettings.waterLevel
  waterMesh.receiveShadow = true
  scene.add(waterMesh)
}

// ═══════════════════════════════════════════════════════════════════════════
// HEIGHTFIELD
// ═══════════════════════════════════════════════════════════════════════════
function createHeightfieldSync(cx, cz) {
  const heights = new Float32Array((HF_RES + 1) * (HF_RES + 1))
  for (let row = 0; row <= HF_RES; row++) {
    for (let col = 0; col <= HF_RES; col++) {
      const wx = cx + (col / HF_RES - 0.5) * HF_SIZE
      const wz = cz + (row / HF_RES - 0.5) * HF_SIZE
      heights[row + col * (HF_RES + 1)] = getTerrainHeight(wx, wz) + GROUND_Y_OFFSET
    }
  }
  if (hfCollider) { try { physicsWorld.removeCollider(hfCollider, false) } catch(e){} hfCollider = null }
  if (hfBody) { try { physicsWorld.removeRigidBody(hfBody) } catch(e){} hfBody = null }
  hfBody = physicsWorld.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(cx, 0, cz))
  hfCollider = physicsWorld.createCollider(RAPIER.ColliderDesc.heightfield(HF_RES, HF_RES, heights, { x: HF_SIZE, y: 1, z: HF_SIZE }).setFriction(0.8).setRestitution(0.1), hfBody)
  hfCenter = { x: cx, z: cz }
}

// ═══════════════════════════════════════════════════════════════════════════
// VEHICLE
// ═══════════════════════════════════════════════════════════════════════════
let chassisGLB = null
let wheelGLB = null
let vehicleInitialized = false
let currentPresetIdx = 0

async function createVehicle(presetIdx = 0) {
  const preset = VEHICLE_PRESETS[presetIdx] || VEHICLE_PRESETS[0]
  currentPresetIdx = presetIdx
  
  const startH = getTerrainHeight(0, 0) + 3
  chassisBody = physicsWorld.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, startH, 0).setCanSleep(false))
  physicsWorld.createCollider(RAPIER.ColliderDesc.cuboid(CHASSIS_HW, CHASSIS_HH, CHASSIS_HD).setMassProperties(2.5, { x: 0, y: -0.3, z: 0 }, { x: 0.4, y: 1.1, z: 0.9 }, { x: 0, y: 0, z: 0, w: 1 }).setFriction(0.5), chassisBody)

  chassisGroup = new THREE.Group()
  scene.add(chassisGroup)

  // Load chassis GLB
  try {
    const chassisGltf = await new Promise((resolve, reject) => {
      gltfLoader.load(preset.chassis, resolve, undefined, reject)
    })
    chassisGLB = chassisGltf.scene
    chassisGLB.rotation.y = preset.chassisRotY || 0
    chassisGLB.scale.setScalar(preset.chassisScale || 1.8)
    chassisGLB.position.y = preset.chassisOffsetY || 0
    chassisGLB.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true } })
    chassisGroup.add(chassisGLB)
    _currentChassisVisual = chassisGLB
    console.log(`[Vehicle] Chassis loaded: ${preset.name}`)
  } catch(e) {
    console.warn('[Vehicle] Failed to load chassis GLB, using fallback:', e.message)
    const chassisModel = createFallbackChassis()
    chassisModel.rotation.y = Math.PI / 2; chassisModel.scale.setScalar(3.3)
    chassisModel.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true } })
    chassisGroup.add(chassisModel)
    _currentChassisVisual = chassisModel
  }

  // Load wheel GLB
  try {
    const wheelGltf = await new Promise((resolve, reject) => {
      gltfLoader.load(preset.wheels, resolve, undefined, reject)
    })
    wheelGLB = wheelGltf.scene
    console.log(`[Vehicle] Wheels loaded: ${preset.name}`)
  } catch(e) {
    console.warn('[Vehicle] Failed to load wheel GLB, using fallback:', e.message)
    wheelGLB = null
  }

  vehicle = physicsWorld.createVehicleController(chassisBody)
  const wheelConns = [
    { x: WHEEL_OFF.x, y: preset.wheelOffsetY || 0.25, z: WHEEL_OFF.z },
    { x: WHEEL_OFF.x, y: preset.wheelOffsetY || 0.25, z: -WHEEL_OFF.z },
    { x: -WHEEL_OFF.x, y: preset.wheelOffsetY || 0.25, z: WHEEL_OFF.z },
    { x: -WHEEL_OFF.x, y: preset.wheelOffsetY || 0.25, z: -WHEEL_OFF.z },
  ]
  const dirCs = { x: 0, y: -1, z: 0 }, axleCs = { x: 0, y: 0, z: 1 }

  for (let i = 0; i < 4; i++) {
    vehicle.addWheel(wheelConns[i], dirCs, axleCs, SUSP_REST, WHEEL_R)
    vehicle.setWheelFrictionSlip(i, carSettings.grip)
    vehicle.setWheelSuspensionStiffness(i, 12)
    vehicle.setWheelMaxSuspensionForce(i, 300)
    vehicle.setWheelMaxSuspensionTravel(i, 1.2)
    vehicle.setWheelSuspensionCompression(i, 1.8)
    vehicle.setWheelSuspensionRelaxation(i, 4.5)
    vehicle.setWheelSideFrictionStiffness(i, 2)

    const tc = new THREE.Group()
    if (wheelGLB) {
      const wheelClone = wheelGLB.clone()
      wheelClone.scale.setScalar(preset.wheelScale || 0.65)
      wheelClone.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true } })
      tc.add(wheelClone)
    } else {
      const tm = createFallbackTire()
      tm.rotation.z = (i % 2 === 0) ? Math.PI / 2 : -Math.PI / 2
      tm.scale.setScalar(3)
      tc.add(tm)
    }
    scene.add(tc); wheelMeshes.push(tc)
  }
  
  vehicleInitialized = true
  console.log(`[Vehicle] Preset ${presetIdx + 1}/${VEHICLE_PRESETS.length}: ${preset.name}`)
}

// Swap vehicle preset (called with V key)
async function swapVehiclePreset() {
  if (!vehicleInitialized) return
  
  // Remove current vehicle visuals
  if (chassisGroup) {
    chassisGroup.traverse(child => {
      if (child.isMesh) {
        child.geometry?.dispose()
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose())
          else child.material.dispose()
        }
      }
    })
    scene.remove(chassisGroup)
  }
  for (const wheel of wheelMeshes) {
    wheel.traverse(child => {
      if (child.isMesh) {
        child.geometry?.dispose()
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose())
          else child.material.dispose()
        }
      }
    })
    scene.remove(wheel)
  }
  wheelMeshes = []
  
  // Clear arrays
  chassisGroup = new THREE.Group()
  
  // Load next preset
  currentPresetIdx = (currentPresetIdx + 1) % VEHICLE_PRESETS.length
  const preset = VEHICLE_PRESETS[currentPresetIdx]
  
  // Reload chassis
  try {
    const chassisGltf = await new Promise((resolve, reject) => {
      gltfLoader.load(preset.chassis, resolve, undefined, reject)
    })
    chassisGLB = chassisGltf.scene
    chassisGLB.rotation.y = preset.chassisRotY || 0
    chassisGLB.scale.setScalar(preset.chassisScale || 1.8)
    chassisGLB.position.y = preset.chassisOffsetY || 0
    chassisGLB.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true } })
    chassisGroup.add(chassisGLB)
    _currentChassisVisual = chassisGLB
  } catch(e) {
    console.warn('[Vehicle] Failed to load chassis:', e.message)
  }
  
  // Reload wheels
  try {
    const wheelGltf = await new Promise((resolve, reject) => {
      gltfLoader.load(preset.wheels, resolve, undefined, reject)
    })
    wheelGLB = wheelGltf.scene
  } catch(e) {
    wheelGLB = null
  }
  
  // Recreate wheel meshes
  const wheelConns = [
    { x: WHEEL_OFF.x, y: preset.wheelOffsetY || 0.25, z: WHEEL_OFF.z },
    { x: WHEEL_OFF.x, y: preset.wheelOffsetY || 0.25, z: -WHEEL_OFF.z },
    { x: -WHEEL_OFF.x, y: preset.wheelOffsetY || 0.25, z: WHEEL_OFF.z },
    { x: -WHEEL_OFF.x, y: preset.wheelOffsetY || 0.25, z: -WHEEL_OFF.z },
  ]
  
  for (let i = 0; i < 4; i++) {
    const tc = new THREE.Group()
    if (wheelGLB) {
      const wheelClone = wheelGLB.clone()
      wheelClone.scale.setScalar(preset.wheelScale || 0.65)
      wheelClone.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true } })
      tc.add(wheelClone)
    } else {
      const tm = createFallbackTire()
      tm.rotation.z = (i % 2 === 0) ? Math.PI / 2 : -Math.PI / 2
      tm.scale.setScalar(3)
      tc.add(tm)
    }
    scene.add(tc); wheelMeshes.push(tc)
  }
  
  scene.add(chassisGroup)
  showToast(`VEHICLE: ${preset.name}`, '#B4FF50', 1500)
  console.log(`[Vehicle] Switched to preset: ${preset.name}`)
}

function createFallbackChassis() {
  const group = new THREE.Group()
  const S = 0.115
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xFF8C35, roughness: 0.45, metalness: 0.15 })
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x1A2030, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.55 })
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xcc3300, roughness: 0.5 })
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.9, roughness: 0.2 })
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 })
  function box(w,h,d,mat,x=0,y=0,z=0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w*S,h*S,d*S), mat); m.position.set(x*S,y*S,z*S); m.castShadow=true; group.add(m); return m }
  box(2.4,1.8,5.5,bodyMat,0,1.4,0); box(2.3,1.4,1.8,bodyMat,0,1.2,3.2); box(2.2,0.15,5.0,bodyMat,0,2.4,0)
  box(2.1,0.7,2.2,trimMat,0,2.65,2.3); box(2.42,0.22,5.52,trimMat,0,0.9,0); box(2.3,0.3,5.3,darkMat,0,0.2,0)
  box(2.0,0.9,0.06,glassMat,0,1.7,4.05); box(1.4,0.7,0.06,glassMat,0,1.8,-2.78)
  box(2.5,0.3,0.25,chromeMat,0,0.45,4.15); box(2.5,0.3,0.25,chromeMat,0,0.45,-2.9)
  for (const x of [-1.22,1.22]) { box(0.06,0.6,1.0,glassMat,x,1.5,3.2); for (let i=0;i<3;i++) box(0.06,0.7,0.9,glassMat,x,1.8,1.2-i*1.6) }
  const hlMat = new THREE.MeshStandardMaterial({ color: 0xFFFFEE, emissive: 0xFFFFAA, emissiveIntensity: 1.0 })
  for (const x of [-0.9,0.9]) box(0.4,0.25,0.06,hlMat,x,0.85,4.08)
  const tlMat = new THREE.MeshStandardMaterial({ color: 0xCC0000, emissive: 0x880000, emissiveIntensity: 0.7 })
  for (const x of [-0.9,0.9]) box(0.35,0.4,0.06,tlMat,x,1.1,-2.82)
  return group
}

function createFallbackTire() {
  const group = new THREE.Group()
  const R = 0.15, W = 0.1
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 })
  const hubMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.85, roughness: 0.2 })
  const tireGeo = new THREE.CylinderGeometry(R,R,W,20); tireGeo.rotateX(Math.PI/2)
  const tire = new THREE.Mesh(tireGeo, tireMat); tire.castShadow=true; group.add(tire)
  const hubGeo = new THREE.CylinderGeometry(R*0.5,R*0.5,W*1.02,8); hubGeo.rotateX(Math.PI/2)
  group.add(new THREE.Mesh(hubGeo, hubMat))
  return group
}

// ═══════════════════════════════════════════════════════════════════════════
// PARTICLES
// ═══════════════════════════════════════════════════════════════════════════
function initParticles() {
  for (let i = 0; i < DUST_COUNT; i++) dustData.push({ life: 0, maxLife: 0, x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, size: 0, opacity: 0 })
  for (let i = 0; i < SPLASH_COUNT; i++) splashData.push({ life: 0, maxLife: 0, x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, size: 0, opacity: 0, gravity: 0 })
  for (let i = 0; i < WIND_DUST_COUNT; i++) windDustData.push({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 0, size: 0, opacity: 0, wobblePhase: Math.random()*Math.PI*2, wobbleSpeed: 1.5+Math.random()*2.5, wobbleAmp: 0.3+Math.random()*0.8 })
  for (let i = 0; i < DEBRIS_COUNT; i++) debrisPool.push({ mesh: null, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0, gravity: 9.8, drag: 0.97 })

  const dustCanvas = document.createElement('canvas'); dustCanvas.width = 64; dustCanvas.height = 64
  const dustCtx = dustCanvas.getContext('2d')
  const gradient = dustCtx.createRadialGradient(32,32,0,32,32,32)
  gradient.addColorStop(0,'rgba(255,255,255,1)'); gradient.addColorStop(0.5,'rgba(255,255,255,0.35)'); gradient.addColorStop(1,'rgba(255,255,255,0)')
  dustCtx.fillStyle = gradient; dustCtx.fillRect(0,0,64,64)
  const dustTexture = new THREE.CanvasTexture(dustCanvas)

  const dustQuadGeo = new THREE.PlaneGeometry(1,1)
  const dustMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1,1,1), map: dustTexture, transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.1 })
  const dustIMesh = new THREE.InstancedMesh(dustQuadGeo, dustMat, DUST_COUNT)
  dustIMesh.frustumCulled = false; dustIMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  const dustColors = new Float32Array(DUST_COUNT*3).fill(1)
  dustIMesh.instanceColor = new THREE.InstancedBufferAttribute(dustColors, 3); dustIMesh.instanceColor.setUsage(THREE.DynamicDrawUsage)
  scene.add(dustIMesh)
  window._dustIMesh = dustIMesh; window._dustColors = dustColors; window._dustQuadGeo = dustQuadGeo

  const splashMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.45,0.75,0.78), transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.15, map: dustTexture })
  const splashIMesh = new THREE.InstancedMesh(dustQuadGeo, splashMat, SPLASH_COUNT)
  splashIMesh.frustumCulled = false; splashIMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  const splashColors = new Float32Array(SPLASH_COUNT*3).fill(1)
  splashIMesh.instanceColor = new THREE.InstancedBufferAttribute(splashColors, 3); splashIMesh.instanceColor.setUsage(THREE.DynamicDrawUsage)
  scene.add(splashIMesh)
  window._splashIMesh = splashIMesh; window._splashColors = splashColors

  const windDustMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.76,0.62,0.38), transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.15, map: dustTexture })
  const windDustIMesh = new THREE.InstancedMesh(dustQuadGeo, windDustMat, WIND_DUST_COUNT)
  windDustIMesh.frustumCulled = false; windDustIMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  const windDustColors = new Float32Array(WIND_DUST_COUNT*3).fill(1)
  windDustIMesh.instanceColor = new THREE.InstancedBufferAttribute(windDustColors, 3); windDustIMesh.instanceColor.setUsage(THREE.DynamicDrawUsage)
  scene.add(windDustIMesh)
  window._windDustIMesh = windDustIMesh; window._windDustColors = windDustColors
}

// ═══════════════════════════════════════════════════════════════════════════
// SCATTER
// ═══════════════════════════════════════════════════════════════════════════
function seededRand(x, z, seed) { let n = Math.sin(x*12.9898+z*78.233+seed*43.1234)*43758.5453; return n-Math.floor(n) }
const scatterGroup = new THREE.Group();
const rockMat = new THREE.MeshStandardMaterial({ color: '#8a7d6b', roughness: 0.92, metalness: 0.05 })
const bushMat = new THREE.MeshStandardMaterial({ color: '#6b7a45', roughness: 0.85, metalness: 0 })

function buildCell(cellX, cellZ) {
  const key = cellX+','+cellZ
  if (scatterCells.has(key)) return
  const objs = []
  const wx0 = cellX*SCATTER_CELL, wz0 = cellZ*SCATTER_CELL
  // scatter rocks disabled
  scatterCells.set(key, objs)
}

function updateScatter(px, pz) {
  const cx = Math.round(px/SCATTER_CELL), cz = Math.round(pz/SCATTER_CELL)
  if (cx === _lastScatterCX && cz === _lastScatterCZ) return
  _lastScatterCX = cx; _lastScatterCZ = cz
  const maxDist = SCATTER_RANGE+2
  let removed = 0
  for (const key of [...scatterCells.keys()]) {
    if (removed >= 12) break
    const sep = key.indexOf(','); const kx = parseInt(key.substring(0,sep)); const kz = parseInt(key.substring(sep+1))
    if (Math.abs(kx-cx)>maxDist || Math.abs(kz-cz)>maxDist) { scatterCells.delete(key); removed++ }
  }
  if (scatterCells.size < MAX_SCATTER_CELLS) {
    _scatterBuildQueue = []
    for (let gx=-SCATTER_RANGE;gx<=SCATTER_RANGE;gx++) for (let gz=-SCATTER_RANGE;gz<=SCATTER_RANGE;gz++) {
      const key = (cx+gx)+','+(cz+gz)
      if (!scatterCells.has(key)) _scatterBuildQueue.push({ cx:cx+gx, cz:cz+gz, d:gx*gx+gz*gz })
    }
    _scatterBuildQueue.sort((a,b)=>a.d-b.d)
    if (_scatterBuildQueue.length > 80) _scatterBuildQueue.length = 80
  }
}

function tickScatterBuild() {
  if (scatterCells.size >= MAX_SCATTER_CELLS) return
  const count = Math.min(SCATTER_CELLS_PER_FRAME, _scatterBuildQueue.length)
  for (let i=0;i<count;i++) { const item=_scatterBuildQueue.shift(); buildCell(item.cx,item.cz) }
}

// ═══════════════════════════════════════════════════════════════════════════
// UI SETUP
// ═══════════════════════════════════════════════════════════════════════════
function setupUI() {
  // Drive mode tabs
  document.querySelectorAll('.drive-tab').forEach(tab => {
    tab.addEventListener('click', () => setDriveMode(tab.dataset.mode))
  })

  // Mode indicator button — cycles through drive modes
  const modeBtn = document.getElementById('mode-indicator-btn')
  if (modeBtn) {
    const modes = ['gravity', 'magnetic', 'hook', 'float']
    modeBtn.addEventListener('click', () => {
      const idx = modes.indexOf(vehicleMode)
      const next = modes[(idx + 1) % modes.length]
      setDriveMode(next)
    })
  }

  // Settings panel
  const settingsToggle = document.getElementById('settings-toggle')
  const settingsPanel = document.getElementById('settings-panel')
  const panelClose = document.getElementById('panel-close')
  let settingsPanelOpen = false
  function openSettingsPanel() {
    settingsPanelOpen = true
    settingsPanel.style.opacity = '1'
    settingsPanel.style.pointerEvents = 'auto'
    settingsPanel.style.transform = 'translateX(0) scale(1)'
    settingsToggle.classList.add('panel-open')
  }
  function closeSettingsPanel() {
    settingsPanelOpen = false
    settingsPanel.style.opacity = '0'
    settingsPanel.style.pointerEvents = 'none'
    settingsPanel.style.transform = 'translateX(10px) scale(0.97)'
    settingsToggle.classList.remove('panel-open')
  }
  settingsToggle.addEventListener('click', () => { settingsPanelOpen ? closeSettingsPanel() : openSettingsPanel() })
  panelClose.addEventListener('click', closeSettingsPanel)

  // Build settings folders
  buildSettingsPanel()

  // Constructor toggle
  const constructBtn = document.getElementById('construct-toggle')
  constructBtn.addEventListener('click', toggleConstructorMode)
  constructBtn.textContent = '⚙ CONSTRUCT'  // Initialize with correct text

  // ADD ZONE button
  document.getElementById('ctor-add-zone-btn').addEventListener('click', () => {
    if (!constructorMode) toggleConstructorMode()
    const btn = document.getElementById('ctor-add-zone-btn')

    // CONFIRM pending zone
    if (zonePendingPoint) {
      removeZoneGhost()
      placeZoneAtPoint(zonePendingPoint)
      zonePendingPoint = null
      zonePlacementMode = false
      btn.style.background = 'rgba(0,255,224,0.1)'
      btn.style.borderColor = 'rgba(0,255,224,0.4)'
      btn.textContent = '+ ADD ZONE'
      return
    }

    // Toggle placement mode
    zonePlacementMode = !zonePlacementMode
    if (zonePlacementMode) {
      btn.style.background = 'rgba(0,255,224,0.15)'
      btn.style.borderColor = '#00FFE0'
      btn.textContent = '✕ CANCEL'
      showToast('CLICK EN EL TERRENO PARA POSICIONAR', '#00FFE0', 2000)
    } else {
      removeZoneGhost()
      zonePendingPoint = null
      btn.style.background = 'rgba(0,255,224,0.1)'
      btn.style.borderColor = 'rgba(0,255,224,0.4)'
      btn.textContent = '+ ADD ZONE'
    }
  })

  // Zone size selection buttons
  document.querySelectorAll('.zone-size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.zone-size-btn').forEach(b => {
        b.style.background = 'rgba(255,255,255,0.04)'
        b.style.borderColor = 'rgba(255,255,255,0.15)'
        b.style.color = 'rgba(255,255,255,0.4)'
        b.classList.remove('active')
      })
      btn.style.background = 'rgba(0,255,224,0.12)'
      btn.style.borderColor = 'rgba(0,255,224,0.4)'
      btn.style.color = '#00FFE0'
      btn.classList.add('active')
      zonePlacementSize = btn.dataset.size
      if (zonePendingPoint) spawnZoneGhost(zonePendingPoint)
    })
  })

  // Zone shape selection buttons
  document.querySelectorAll('.zone-shape-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.zone-shape-btn').forEach(b => {
        b.style.background = 'rgba(255,255,255,0.04)'
        b.style.borderColor = 'rgba(255,255,255,0.15)'
        b.style.color = 'rgba(255,255,255,0.4)'
        b.classList.remove('active')
      })
      btn.style.background = 'rgba(0,255,224,0.12)'
      btn.style.borderColor = 'rgba(0,255,224,0.4)'
      btn.style.color = '#00FFE0'
      btn.classList.add('active')
      zonePlacementType = btn.dataset.shape
      if (zonePendingPoint) spawnZoneGhost(zonePendingPoint)
    })
  })

  // Zone color picker
  document.getElementById('zone-color-input')?.addEventListener('input', (e) => {
    zonePlacementColor = e.target.value
    if (zoneGhostMesh) zoneGhostMesh.material.color.set(zonePlacementColor)
  })

  // Zone Y offset slider
  document.getElementById('zone-y-slider')?.addEventListener('input', (e) => {
    zonePlacementOffsetY = parseFloat(e.target.value)
    document.getElementById('zone-y-val').textContent = zonePlacementOffsetY.toFixed(1)
    // Live-update ghost mesh position if pending
    if (zoneGhostMesh && zonePendingPoint) {
      const size = ZONE_SIZES[zonePlacementSize]
      const h = size.height
      const r = size.radius
      const tubeR = Math.max(Math.min(r * 0.06, 2.5), 0.4)
      const posY = zonePendingPoint.y + zonePlacementOffsetY + (zonePlacementType === 'ring-h' ? tubeR : h / 2)
      zoneGhostMesh.position.y = posY
    }
  })

  // EXPORT ZONES button
  document.getElementById('ctor-export-zones-btn').addEventListener('click', exportZones)

  // IMPORT ZONES button
  document.getElementById('ctor-import-zones-btn').addEventListener('click', () => {
    document.getElementById('ctor-import-zones-input').click()
  })
  document.getElementById('ctor-import-zones-input').addEventListener('change', (e) => {
    if (e.target.files[0]) importZones(e.target.files[0])
    e.target.value = ''  // Reset input
  })

  // Catalog drop zone
  const dropZone = document.getElementById('ctor-drop-zone')
  const fileInput = document.getElementById('ctor-file-input')
  dropZone.addEventListener('click', () => fileInput.click())
  fileInput.addEventListener('change', (e) => { if (e.target.files[0]) { if (!constructorMode) toggleConstructorMode(); loadGLBFromFile(e.target.files[0]) } })
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over') })
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'))
  dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('drag-over'); const file=[...e.dataTransfer.files].find(f=>f.name.toLowerCase().endsWith('.glb')); if (file) { if (!constructorMode) toggleConstructorMode(); loadGLBFromFile(file) } })

  // Catalog list
  const catalogList = document.getElementById('ctor-catalog-list')
  GLB_CATALOG.forEach(item => {
    const slot = document.createElement('div')
    slot.className = 'ctor-glb-slot'
    const previewSrc = `/GLB/previews/${item.name}.png`
    slot.innerHTML = `
      <div class="ctor-slot-thumb">
        <img class="ctor-slot-img" src="${previewSrc}" alt="${item.name}"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
          style="width:100%;height:100%;object-fit:cover;border-radius:3px;display:block;" />
        <div class="ctor-slot-img-fallback" style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:20px;color:rgba(255,255,255,0.25);">◈</div>
      </div>
      <div class="ctor-slot-info"><div class="ctor-slot-name">${item.name}</div><div class="ctor-slot-note">${item.note||''}</div></div>
      <button class="ctor-slot-add">+</button>`
    slot.querySelector('.ctor-slot-add').addEventListener('click', (e) => { e.stopPropagation(); if (!constructorMode) toggleConstructorMode(); loadGLBFromCatalog(item) })
    slot.addEventListener('click', () => { if (!constructorMode) toggleConstructorMode(); loadGLBFromCatalog(item) })
    catalogList.appendChild(slot)
  })

  // Inspector buttons
  document.getElementById('ctor-delete-btn').addEventListener('click', deleteSelectedObject)
  document.getElementById('ctor-elev-slider').addEventListener('input', (e) => {
    if (!selectedObject) return
    selectedObject.group.position.y = parseFloat(e.target.value)
    document.getElementById('ctor-elev-val').textContent = parseFloat(e.target.value).toFixed(1)
  })
  const d2r = Math.PI / 180
  document.getElementById('ctor-rot-slider-x').addEventListener('input', (e) => {
    if (!selectedObject) return
    selectedObject.group.rotation.x = parseFloat(e.target.value) * d2r
    document.getElementById('ctor-rot-val-x').textContent = e.target.value + '°'
  })
  document.getElementById('ctor-rot-slider-y').addEventListener('input', (e) => {
    if (!selectedObject) return
    selectedObject.group.rotation.y = parseFloat(e.target.value) * d2r
    document.getElementById('ctor-rot-val-y').textContent = e.target.value + '°'
  })
  document.getElementById('ctor-rot-slider-z').addEventListener('input', (e) => {
    if (!selectedObject) return
    selectedObject.group.rotation.z = parseFloat(e.target.value) * d2r
    document.getElementById('ctor-rot-val-z').textContent = e.target.value + '°'
  })
  document.getElementById('ctor-scale-slider').addEventListener('input', (e) => {
    if (!selectedObject) return
    const s = sliderToScale(parseFloat(e.target.value))
    selectedObject.group.scale.setScalar(s)
    document.getElementById('ctor-scale-val').textContent = s.toFixed(2)+'x'
  })
  document.getElementById('ctor-col-none').addEventListener('click', () => { if (selectedObject) { removeGLBCollider(selectedObject); selectedObject.physics=null; syncCollisionBtns('none'); updateCollisionStatus('none') } })
  document.getElementById('ctor-col-convex').addEventListener('click', () => { if (selectedObject) { createGLBCollider(selectedObject,'convexHull'); syncCollisionBtns('convexHull') } })
  document.getElementById('ctor-col-trimesh').addEventListener('click', () => { if (selectedObject) { createGLBCollider(selectedObject,'trimesh'); syncCollisionBtns('trimesh') } })

  // Panel close
  document.getElementById('ctor-catalog-close').addEventListener('click', () => document.getElementById('ctor-panel-catalog').classList.remove('visible'))
  document.getElementById('ctor-inspector-close').addEventListener('click', deselectObject)

  // Draggable panels
  makeDraggable('ctor-panel-catalog', 'ctor-catalog-drag')
  makeDraggable('ctor-panel-inspector', 'ctor-inspector-drag')
  makeDraggable('ctor-panel-zones', 'ctor-zones-drag')
  document.getElementById('ctor-zones-close')?.addEventListener('click', () => {
    document.getElementById('ctor-panel-zones')?.classList.remove('visible')
  })
  makeDraggable('grav-tanks-hud', 'grav-tanks-hud')
  makeDraggable('drive-mode-panel', 'drive-mode-panel')
  makeDraggable('save-worlds-panel', 'save-worlds-panel')
  makeDraggable('hud-telemetry', 'tel-toggle-btn')
  makeDraggable('trail-info', 'trail-info')
  makeDraggable('south-hustles-info', 'south-hustles-info')
  makeDraggable('control-strip', 'control-strip')
  const trailClose = document.getElementById('trail-info-close')
  if (trailClose) trailClose.addEventListener('click', () => { document.getElementById('trail-info').style.display = 'none' })
  const shClose = document.getElementById('south-hustles-close')
  if (shClose) shClose.addEventListener('click', () => { document.getElementById('south-hustles-info').style.display = 'none' })
  makeDraggable('minimap-panel', 'minimap-label')
  makeDraggable('btn-minimap', 'btn-minimap')
  makeDraggable('btn-orbital-wrapper', 'btn-orbital-wrapper')
  makeDraggable('btn-sun-wrapper', 'btn-sun-wrapper')
  makeDraggable('btn-gravity-wrapper', 'btn-gravity-wrapper')
  makeDraggable('wasd-wrapper', 'wasd-wrapper')
  makeDraggable('settings-panel', 'settings-panel-header')

  // World panel toggle
  const worldsToggle = document.getElementById('worlds-toggle')
  const worldsArrow = document.getElementById('worlds-arrow')
  const saveWorldsPanel = document.getElementById('save-worlds-panel')
  if (worldsToggle && saveWorldsPanel) {
    worldsToggle.addEventListener('click', () => {
      const open = saveWorldsPanel.style.display !== 'none'
      saveWorldsPanel.style.display = open ? 'none' : 'block'
      if (worldsArrow) worldsArrow.textContent = open ? '↑' : '↓'
      worldsToggle.style.background = open ? 'rgba(0,0,0,0.88)' : 'rgba(255,255,255,0.08)'
      worldsToggle.style.color = open ? 'rgba(255,255,255,0.75)' : '#fff'
    })
  }

  // Save/Load (6 slots always visible)
  document.querySelectorAll('.sw-save-btn').forEach(btn => btn.addEventListener('click', () => showSaveModal(btn.dataset.slot)))
  document.querySelectorAll('.sw-load-btn').forEach(btn => btn.addEventListener('click', () => loadWorld(btn.dataset.slot)))
  document.getElementById('sw-export-btn').addEventListener('click', exportWorld)
  document.getElementById('sw-export-all-btn')?.addEventListener('click', exportAllWorlds)
  document.getElementById('sw-import-btn')?.addEventListener('click', () => document.getElementById('sw-import-input')?.click())
  document.getElementById('sw-import-input')?.addEventListener('change', (e) => { if (e.target.files[0]) importWorldFromFile(e.target.files[0]); e.target.value = '' })
  document.getElementById('sw-import-all-btn')?.addEventListener('click', () => document.getElementById('sw-import-all-input')?.click())
  document.getElementById('sw-import-all-input')?.addEventListener('change', (e) => { if (e.target.files[0]) importAllWorlds(e.target.files[0]); e.target.value = '' })

  // Teleport menu
  document.querySelectorAll('#teleport-menu .tp-option').forEach(opt => opt.addEventListener('click', () => teleportToSlot(parseInt(opt.dataset.tp))))

  // Telemetry toggle
  document.getElementById('tel-toggle-btn').addEventListener('click', () => {
    document.getElementById('hud-telemetry').classList.toggle('tel-open')
  })

  // Minimap
  // Initialize both view panels (drag + resize + close) once
  function initViewPanels() {
    const mmPanel = document.getElementById('minimap-panel')
    const rvPanel = document.getElementById('right-view-panel')

    if (mmPanel && !mmPanel._draggableInitialized) {
      makeDraggable('minimap-panel', 'minimap-label')
      mmPanel._draggableInitialized = true
      attachResizeHandle(mmPanel, document.getElementById('minimap-resize-handle'))
      const closeBtn = document.getElementById('minimap-close')
      // Close only TOP VIEW — RIGHT VIEW stays open
      if (closeBtn) closeBtn.addEventListener('click', () => closeTopView())
    }
    if (rvPanel && !rvPanel._rvInitialized) {
      rvPanel._rvInitialized = true
      makeDraggable('right-view-panel', 'right-view-label')
      attachResizeHandle(rvPanel, document.getElementById('right-view-resize-handle'), 'left')
      const closeBtn = document.getElementById('right-view-close')
      // Close only RIGHT VIEW — TOP VIEW stays open
      if (closeBtn) closeBtn.addEventListener('click', () => closeRightView())
    }
  }

  function closeTopView() {
    minimapOpen = false
    const mmPanel = document.getElementById('minimap-panel')
    const btn = document.getElementById('btn-minimap')
    if (mmPanel) mmPanel.style.display = 'none'
    if (btn) btn.classList.remove('minimap-open')
  }

  function closeRightView() {
    rightViewOpen = false
    const rvPanel = document.getElementById('right-view-panel')
    if (rvPanel) rvPanel.style.display = 'none'
    // Update btn-right-view appearance to reflect closed state
    const btnRv = document.getElementById('btn-right-view')
    if (btnRv) {
      const mc = getComputedStyle(document.documentElement).getPropertyValue('--mode-color').trim() || '#00FFE0'
      btnRv.style.borderColor = mc + '44'
      btnRv.style.color = mc + '66'
      btnRv.style.background = 'rgba(255,255,255,0.04)'
    }
  }

  // Open or close BOTH views together (M key / btn-minimap)
  function openViews(open) {
    const mmPanel = document.getElementById('minimap-panel')
    const rvPanel = document.getElementById('right-view-panel')
    const btn = document.getElementById('btn-minimap')

    minimapOpen = open
    rightViewOpen = open

    if (mmPanel) {
      mmPanel.style.display = open ? 'block' : 'none'
      if (open && !mmPanel.style.width) { mmPanel.style.width = '320px'; mmPanel.style.height = '320px' }
    }
    if (rvPanel) {
      rvPanel.style.display = open ? 'block' : 'none'
      if (open && !rvPanel.style.width) { rvPanel.style.width = '320px'; rvPanel.style.height = '320px' }
    }
    if (btn) {
      open ? btn.classList.add('minimap-open') : btn.classList.remove('minimap-open')
    }
    // Update btn-right-view state
    const btnRv = document.getElementById('btn-right-view')
    if (btnRv) {
      const mc = getComputedStyle(document.documentElement).getPropertyValue('--mode-color').trim() || '#00FFE0'
      btnRv.style.borderColor = open ? mc + 'cc' : mc + '44'
      btnRv.style.color = open ? mc : mc + '66'
      btnRv.style.background = open ? mc + '22' : 'rgba(255,255,255,0.04)'
    }
    if (open) initViewPanels()
  }

  document.getElementById('btn-minimap').addEventListener('click', () => {
    // If both are closed → open both. If any is open → close both.
    const anyOpen = minimapOpen || rightViewOpen
    openViews(!anyOpen)
  })

  // btn-right-view — toggle only the RIGHT VIEW independently
  const btnRightView = document.getElementById('btn-right-view')
  if (btnRightView) {
    btnRightView.addEventListener('click', (e) => {
      e.stopPropagation()
      if (rightViewOpen) {
        closeRightView()
      } else {
        rightViewOpen = true
        const rvPanel = document.getElementById('right-view-panel')
        if (rvPanel) {
          rvPanel.style.display = 'block'
          if (!rvPanel.style.width) { rvPanel.style.width = '320px'; rvPanel.style.height = '320px' }
        }
        initViewPanels()
        // Update btn appearance
        const mc = getComputedStyle(document.documentElement).getPropertyValue('--mode-color').trim() || '#00FFE0'
        btnRightView.style.borderColor = mc + 'cc'
        btnRightView.style.color = mc
        btnRightView.style.background = mc + '22'
      }
    })
  }

  // Controls WASD toggle
  const btnControlsToggle = document.getElementById('btn-controls-toggle')
  const controlsBar = document.getElementById('controls-info-bar')
  if (btnControlsToggle && controlsBar) {
    let controlsOpen = false
    btnControlsToggle.addEventListener('click', () => {
      controlsOpen = !controlsOpen
      controlsBar.style.display = controlsOpen ? 'block' : 'none'
      btnControlsToggle.style.borderColor = controlsOpen ? 'rgba(0,255,224,0.6)' : 'rgba(255,255,255,0.3)'
      btnControlsToggle.style.color = controlsOpen ? '#00FFE0' : 'rgba(255,255,255,0.6)'
    })
  }

  // Orbital
  document.getElementById('btn-orbital').addEventListener('click', () => {
    carSettings.orbitControls = !carSettings.orbitControls
    orbit.enabled = carSettings.orbitControls
    if (carSettings.orbitControls) orbit.target.copy(chassisPos)
    syncOrbitalBtn()
  })

  // Sun animation toggle — azimuth 0-360° slow, elevation 10-50° sin wave, desynced
  const btnSunAnim = document.getElementById('btn-sun-anim')
  if (btnSunAnim) {
    let sunAnimActive = false
    let sunAnimInterval = null
    let _sunAnimT = 0  // internal time counter
    btnSunAnim.addEventListener('click', () => {
      sunAnimActive = !sunAnimActive
      if (sunAnimActive) {
        btnSunAnim.style.borderColor = 'rgba(255,180,50,0.8)'
        btnSunAnim.style.color = '#FFB432'
        btnSunAnim.style.background = 'rgba(255,180,50,0.1)'
        btnSunAnim.textContent = '☀ SUN ON'
        sunAnimInterval = setInterval(() => {
          _sunAnimT += 0.05
          // Azimuth: slow full rotation 0-360°
          lightSettings.azimuth = (lightSettings.azimuth + 0.4) % 360
          // Elevation: oscillates 10-50° using sin, slightly faster (desynced)
          lightSettings.elevation = 30 + 20 * Math.sin(_sunAnimT * 0.7)
        }, 50)
      } else {
        btnSunAnim.style.borderColor = 'rgba(255,255,255,0.3)'
        btnSunAnim.style.color = 'rgba(255,255,255,0.55)'
        btnSunAnim.style.background = 'transparent'
        btnSunAnim.textContent = '☀ SUN'
        clearInterval(sunAnimInterval)
        sunAnimInterval = null
      }
    })
  }

  // ── FREE TELEPORT MODE ──────────────────────────────────────────────────
  makeDraggable('btn-freetp-wrapper', 'btn-freetp-wrapper')
  const btnFreeTP = document.getElementById('btn-freetp')
  if (btnFreeTP) {
    btnFreeTP.addEventListener('click', () => {
      if (freeTpActive) exitFreeTeleport()
      else enterFreeTeleport()
    })
  }

  // Windowed / framed mode toggle
  const btnWindowed = document.getElementById('btn-windowed')
  if (btnWindowed) {
    let windowedMode = false
    btnWindowed.addEventListener('click', () => {
      windowedMode = !windowedMode
      document.body.classList.toggle('windowed-mode', windowedMode)
      btnWindowed.classList.toggle('active', windowedMode)
      btnWindowed.textContent = windowedMode ? '⊠ FRAME' : '⊞ FRAME'
      // When frame mode active: float button centered at top, z-index above everything
      if (windowedMode) {
        btnWindowed.style.position = 'fixed'
        btnWindowed.style.top = '16px'
        btnWindowed.style.left = '50%'
        btnWindowed.style.right = 'auto'
        btnWindowed.style.bottom = 'auto'
        btnWindowed.style.transform = 'translateX(-50%)'
        btnWindowed.style.zIndex = '9999'
        btnWindowed.style.borderColor = 'rgba(0,255,224,0.6)'
        btnWindowed.style.color = '#00FFE0'
      } else {
        btnWindowed.style.position = 'fixed'
        btnWindowed.style.top = '50%'
        btnWindowed.style.left = 'auto'
        btnWindowed.style.right = '16px'
        btnWindowed.style.bottom = 'auto'
        btnWindowed.style.transform = 'translateY(-50%)'
        btnWindowed.style.zIndex = '2100'
        btnWindowed.style.borderColor = 'rgba(255,255,255,0.1)'
        btnWindowed.style.color = 'rgba(255,255,255,0.4)'
      }
      // Resize renderer to match new canvas size
      setTimeout(() => {
        const w = renderer.domElement.clientWidth
        const h = renderer.domElement.clientHeight
        renderer.setSize(w, h, false)
        camera.aspect = w / h
        camera.updateProjectionMatrix()
      }, 50)
    })
  }

  // Antigrav
  document.getElementById('antigrav-btn').addEventListener('click', toggleAntiGravity)

  // Resize
  window.addEventListener('resize', () => {
    const el = renderer.domElement
    const w = el.clientWidth || innerWidth
    const h = el.clientHeight || innerHeight
    camera.aspect = w / h; camera.updateProjectionMatrix()
    renderer.setSize(w, h, false)
  })

  // Auto-refresh load buttons to show saved world names on startup
  s9RefreshLoadBtns()

  // Open both views on startup + apply initial mode colors to all HUD elements
  setTimeout(() => {
    const mmPanel = document.getElementById('minimap-panel')
    const rvPanel = document.getElementById('right-view-panel')
    if (mmPanel) { mmPanel.style.width = '320px'; mmPanel.style.height = '320px' }
    if (rvPanel) { rvPanel.style.width = '320px'; rvPanel.style.height = '320px' }
    openViews(true)
    // Force a full mode-color pass so all HUD elements get the correct color from frame 1
    setDriveMode(vehicleMode)
  }, 500)
}

const _panelBindings = []
function syncSettingsPanel() {
  for (const b of _panelBindings) {
    if (b.type === 'slider') {
      b.el.value = b.obj[b.key]
      b.display.textContent = Number(b.obj[b.key]).toFixed(b.step < 1 ? 2 : 0)
    } else if (b.type === 'color') {
      const v = b.obj[b.key]
      if (v) { b.el.value = v; b.swatch.style.background = v }
    }
  }
}

function buildSettingsPanel() {
  const scrollEl = document.getElementById('panel-scroll')
  function createFolder(name, startOpen=false) {
    const folder = document.createElement('div'); folder.className = 'folder'+(startOpen?' open':'')
    folder.innerHTML = `<div class="folder-header"><div class="folder-chevron">▶</div><div class="folder-icon" style="background:rgba(255,255,255,0.08)">⚙</div><div class="folder-title">${name}</div></div><div class="folder-body"><div class="folder-content"></div></div>`
    folder.querySelector('.folder-header').addEventListener('click', () => folder.classList.toggle('open'))
    scrollEl.appendChild(folder)
    return {
      addSlider(label, obj, key, min, max, step, onChange) {
        const content = folder.querySelector('.folder-content')
        const row = document.createElement('div'); row.className = 'ctrl-row'
        const valDisplay = document.createElement('span'); valDisplay.className = 'ctrl-value'; valDisplay.textContent = Number(obj[key]).toFixed(step<1?2:0)
        const slider = document.createElement('input'); slider.type='range'; slider.className='ctrl-slider'; slider.min=min; slider.max=max; slider.step=step; slider.value=obj[key]
        slider.addEventListener('input', () => { obj[key]=parseFloat(slider.value); valDisplay.textContent=Number(obj[key]).toFixed(step<1?2:0); if(onChange) onChange(obj[key]) })
        _panelBindings.push({ type:'slider', obj, key, el:slider, display:valDisplay, step })
        row.innerHTML = `<span class="ctrl-label">${label}</span>`
        const wrap = document.createElement('div'); wrap.className='ctrl-input-wrap'; wrap.appendChild(slider); wrap.appendChild(valDisplay); row.appendChild(wrap); content.appendChild(row)
      },
      addCheckbox(label, obj, key, onChange) {
        const content = folder.querySelector('.folder-content')
        const row = document.createElement('div'); row.className = 'ctrl-row'
        const check = document.createElement('div'); check.className = 'ctrl-check'+(obj[key]?' active':'')
        check.addEventListener('click', () => { obj[key]=!obj[key]; check.classList.toggle('active',obj[key]); if(onChange) onChange(obj[key]) })
        row.innerHTML = `<span class="ctrl-label">${label}</span>`
        const wrap = document.createElement('div'); wrap.className='ctrl-input-wrap'; wrap.appendChild(check); row.appendChild(wrap); content.appendChild(row)
      },
      addColor(label, obj, key, onChange) {
        const content = folder.querySelector('.folder-content')
        const row = document.createElement('div'); row.className = 'ctrl-row'
        const swatch = document.createElement('div'); swatch.className='ctrl-color'; swatch.style.background=obj[key]
        const input = document.createElement('input'); input.type='color'; input.value=obj[key]
        input.addEventListener('input', () => { obj[key]=input.value; swatch.style.background=input.value; if(onChange) onChange(input.value) })
        swatch.appendChild(input)
        _panelBindings.push({ type:'color', obj, key, el:input, swatch })
        row.innerHTML = `<span class="ctrl-label">${label}</span>`
        const wrap = document.createElement('div'); wrap.className='ctrl-input-wrap'; wrap.appendChild(swatch); row.appendChild(wrap); content.appendChild(row)
      },
      addSelect(label, obj, key, options, onChange) {
        const content = folder.querySelector('.folder-content')
        const row = document.createElement('div'); row.className = 'ctrl-row'
        const sel = document.createElement('select'); sel.style.cssText = 'background:rgba(0,0,0,0.5);color:#E8E8E0;border:1px solid rgba(255,255,255,0.1);border-radius:3px;padding:2px 4px;font-size:10px;font-family:inherit;'
        Object.entries(options).forEach(([k,v]) => { const o=document.createElement('option'); o.value=v; o.textContent=k; if(obj[key]==v) o.selected=true; sel.appendChild(o) })
        sel.addEventListener('change', () => { obj[key]=parseInt(sel.value); if(onChange) onChange(obj[key]) })
        row.innerHTML = `<span class="ctrl-label">${label}</span>`
        const wrap = document.createElement('div'); wrap.className='ctrl-input-wrap'; wrap.appendChild(sel); row.appendChild(wrap); content.appendChild(row)
      }
    }
  }

  const carF = createFolder('Car')
  carF.addSlider('Steering', carSettings, 'steer', 0.1, 1.2, 0.01)
  carF.addSlider('Acceleration', carSettings, 'acceleration', 1, 20, 0.5)
  carF.addSlider('Max Speed', carSettings, 'maxSpeed', 1, 30, 0.1)
  carF.addSlider('Boost', carSettings, 'boostMultiplier', 1, 8, 0.1)
  carF.addSlider('Jump Force', carSettings, 'jumpForce', 1, 20, 0.5)
  carF.addSlider('Grip', carSettings, 'grip', 0.05, 5, 0.05)
  carF.addCheckbox('Orbit (O)', carSettings, 'orbitControls', (v) => { orbit.enabled=v; if(v) orbit.target.copy(chassisPos) })

  const camF = createFolder('Camera')
  camF.addSlider('Distance', cameraSettings, 'distance', 3, 25, 0.5)
  camF.addSlider('Height', cameraSettings, 'height', 1, 15, 0.5)
  camF.addSlider('Look Height', cameraSettings, 'lookHeight', 0, 5, 0.1)
  camF.addSlider('Smoothing', cameraSettings, 'smoothing', 0.01, 0.2, 0.005)

  const terrF = createFolder('Terrain')
  const rebuildTerrain = () => { updateGroundSync(lastGroundX, lastGroundZ); createHeightfieldSync(lastGroundX, lastGroundZ) }
  terrF.addSlider('Frequency', terrainSettings, 'frequency', 0.005, 0.06, 0.001, rebuildTerrain)
  terrF.addSlider('Amplitude', terrainSettings, 'amplitude', 0, 15, 0.5, rebuildTerrain)

  const fogF = createFolder('Fog')
  fogF.addColor('Color', fogSettings, 'color', (v) => { scene.fog.color.set(v); scene.background.set(v) })
  fogF.addSlider('Near', fogSettings, 'near', 10, 200, 1, (v) => { scene.fog.near=v })
  fogF.addSlider('Far', fogSettings, 'far', 50, 500, 1, (v) => { scene.fog.far=v })

  const dustF = createFolder('Dust')
  dustF.addCheckbox('Enabled', dustSettings, 'enabled')
  dustF.addSlider('Emit Rate', dustSettings, 'emitRate', 0.1, 3, 0.1)
  dustF.addSlider('Size', dustSettings, 'particleSize', 4, 40, 1)
  dustF.addSlider('Lifetime', dustSettings, 'lifetime', 0.2, 3, 0.1)
  dustF.addSlider('Opacity', dustSettings, 'opacity', 0.1, 1, 0.05)
  const _dustColorProxy = { color: '#' + new THREE.Color(dustSettings.colorR, dustSettings.colorG, dustSettings.colorB).getHexString() }
  dustF.addColor('Color', _dustColorProxy, 'color', (v) => { const c = new THREE.Color(v); dustSettings.colorR = c.r; dustSettings.colorG = c.g; dustSettings.colorB = c.b })

  const windF = createFolder('Ambient Particles')
  windF.addSlider('Opacity', windSettings, 'opacity', 0, 1, 0.05)
  windF.addSlider('Size', windSettings, 'particleSize', 0.5, 8, 0.1)
  windF.addSlider('Lifetime', windSettings, 'lifetime', 1, 12, 0.5)
  const _windColorProxy = { color: '#' + new THREE.Color(windSettings.colorR, windSettings.colorG, windSettings.colorB).getHexString() }
  windF.addColor('Color', _windColorProxy, 'color', (v) => { const c = new THREE.Color(v); windSettings.colorR = c.r; windSettings.colorG = c.g; windSettings.colorB = c.b })

  const shadowColorSettings = {
    shadowAmbient: '#' + redAmbient.color.getHexString(),
    shadowHemiSky: '#' + shadowRedFill.color.getHexString(),
    shadowHemiGround: '#' + shadowRedFill.groundColor.getHexString(),
    shadowAmbientIntensity: redAmbient.intensity,
    shadowHemiIntensity: shadowRedFill.intensity,
  }
  const lightF = createFolder('Lighting')
  lightF.addSlider('Sun Azimuth', lightSettings, 'azimuth', 0, 360, 1)
  lightF.addSlider('Sun Elevation', lightSettings, 'elevation', 10, 85, 1)
  lightF.addCheckbox('Shadows', shadowSettings, 'enabled', (v) => { renderer.shadowMap.enabled = v; dirLight.castShadow = v })
  lightF.addSelect('Shadow Res', shadowSettings, 'resolution', {'512':512,'1024':1024,'2048':2048,'4096':4096}, (v) => { dirLight.shadow.mapSize.set(v,v); if(dirLight.shadow.map){dirLight.shadow.map.dispose();dirLight.shadow.map=null} })
  lightF.addColor('Shadow Ambient', shadowColorSettings, 'shadowAmbient', (v) => { redAmbient.color.set(v) })
  lightF.addSlider('Ambient Intensity', shadowColorSettings, 'shadowAmbientIntensity', 0, 2, 0.05, (v) => { redAmbient.intensity = v })
  lightF.addColor('Hemi Sky', shadowColorSettings, 'shadowHemiSky', (v) => { shadowRedFill.color.set(v) })
  lightF.addColor('Hemi Ground', shadowColorSettings, 'shadowHemiGround', (v) => { shadowRedFill.groundColor.set(v) })
  lightF.addSlider('Hemi Intensity', shadowColorSettings, 'shadowHemiIntensity', 0, 2, 0.05, (v) => { shadowRedFill.intensity = v })

  const biomeF = createFolder('Biomes')
  biomeF.addSlider('Water Level', biomeSettings, 'waterLevel', -5, 5, 0.1, (v) => { waterMesh.position.y = v; if(biomeU) biomeU.waterLevel.value = v })
  biomeF.addSlider('Sand→Dirt', biomeSettings, 'sandEnd', -3, 5, 0.1, (v) => { if(biomeU) biomeU.sandEnd.value = v })
  biomeF.addSlider('Dirt→Grass', biomeSettings, 'dirtEnd', -1, 8, 0.1, (v) => { if(biomeU) biomeU.dirtEnd.value = v })
  biomeF.addSlider('Transition', biomeSettings, 'transitionWidth', 0.1, 5, 0.1, (v) => { if(biomeU) biomeU.transitionWidth.value = v })
  biomeF.addColor('Sand 1', biomeSettings, 'sandColor1', (v) => { if(biomeU) biomeU.sandColor1.value.set(v) })
  biomeF.addColor('Sand 2', biomeSettings, 'sandColor2', (v) => { if(biomeU) biomeU.sandColor2.value.set(v) })
  biomeF.addColor('Dirt 1', biomeSettings, 'dirtColor1', (v) => { if(biomeU) biomeU.dirtColor1.value.set(v) })
  biomeF.addColor('Dirt 2', biomeSettings, 'dirtColor2', (v) => { if(biomeU) biomeU.dirtColor2.value.set(v) })
  biomeF.addColor('Grass 1', biomeSettings, 'grassColor1', (v) => { if(biomeU) biomeU.grassColor1.value.set(v) })
  biomeF.addColor('Grass 2', biomeSettings, 'grassColor2', (v) => { if(biomeU) biomeU.grassColor2.value.set(v) })
  biomeF.addColor('Water', biomeSettings, 'waterColor', (v) => { if(biomeU) biomeU.waterColor.value.set(v); if(waterMesh) waterMesh.material.color.set(v) })
  biomeF.addColor('Water Deep', biomeSettings, 'waterColorDeep', (v) => { if(biomeU) biomeU.waterColorDeep.value.set(v) })

  const ruinF = createFolder('Ruins')
  ruinF.addCheckbox('Show Ruins', ruinSettings, 'showRuins')
  ruinF.addCheckbox('Show Pyramids', ruinSettings, 'showLargeRuins')
  ruinF.addColor('Ruin Color', ruinSettings, 'ruinColor')

  const CONFIG_PRESETS = {
    MARS_DAY:   { fogColor:'#c45a3b', fogNear:80,  fogFar:350, ambientColor:'#cc3318', ambientIntensity:0.8, hemiSky:'#fff4e8', hemiGround:'#cc8855', hemiIntensity:0.7 },
    NIGHT:      { fogColor:'#060414', fogNear:30,  fogFar:140, ambientColor:'#1a0830', ambientIntensity:0.3, hemiSky:'#2a1060', hemiGround:'#080408', hemiIntensity:0.3 },
    DUST_STORM: { fogColor:'#8b6914', fogNear:12,  fogFar:80,  ambientColor:'#9c5e10', ambientIntensity:1.1, hemiSky:'#d4a030', hemiGround:'#7a4010', hemiIntensity:0.9 },
    CLEAR:      { fogColor:'#0d0705', fogNear:200, fogFar:700, ambientColor:'#ff5522', ambientIntensity:0.5, hemiSky:'#ffe0c8', hemiGround:'#804020', hemiIntensity:0.5 },
  }
  function applyPreset(p) {
    fogSettings.color=p.fogColor; fogSettings.near=p.fogNear; fogSettings.far=p.fogFar
    scene.fog.color.set(p.fogColor); scene.background.set(p.fogColor)
    scene.fog.near=p.fogNear; scene.fog.far=p.fogFar
    redAmbient.color.set(p.ambientColor); redAmbient.intensity=p.ambientIntensity
    shadowRedFill.color.set(p.hemiSky); shadowRedFill.groundColor.set(p.hemiGround)
    shadowRedFill.intensity=p.hemiIntensity
  }
  createFolder('Presets')
  ;(function() {
    const body = scrollEl.lastElementChild?.querySelector('.folder-body')
    if (!body) return
    ;[['◆ MARS DAY','MARS_DAY'],['◆ NIGHT','NIGHT'],['◆ DUST STORM','DUST_STORM'],['◆ CLEAR SKY','CLEAR']].forEach(([label,key]) => {
      const btn = document.createElement('button')
      btn.textContent = label
      btn.style.cssText = `width:100%;margin-bottom:4px;padding:6px 8px;font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:0.1em;background:rgba(0,0,0,0.5);color:rgba(255,255,255,0.6);border:1px solid rgba(255,255,255,0.12);border-radius:3px;cursor:pointer;`
      btn.addEventListener('click', () => applyPreset(CONFIG_PRESETS[key]))
      body.appendChild(btn)
    })
    const userDiv = document.createElement('div')
    userDiv.style.cssText = 'margin-top:8px;border-top:1px solid rgba(255,255,255,0.06);padding-top:8px;'
    userDiv.innerHTML = `<div style="font-size:8px;color:rgba(255,255,255,0.25);letter-spacing:0.1em;margin-bottom:6px;">USER SLOTS</div>`
    ;[1,2].forEach(slot => {
      const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:4px;margin-bottom:4px;'
      const makBtn = (txt, fn) => { const b=document.createElement('button'); b.textContent=txt; b.style.cssText=`flex:1;padding:5px 6px;font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:0.08em;background:rgba(0,0,0,0.4);color:rgba(255,255,255,0.5);border:1px solid rgba(255,255,255,0.08);border-radius:3px;cursor:pointer;`; b.addEventListener('click',fn); return b }
      row.appendChild(makBtn(`SAVE ${slot}`, () => { const snap={fogColor:fogSettings.color,fogNear:fogSettings.near,fogFar:fogSettings.far,ambientColor:'#'+redAmbient.color.getHexString(),ambientIntensity:redAmbient.intensity,hemiSky:'#'+shadowRedFill.color.getHexString(),hemiGround:'#'+shadowRedFill.groundColor.getHexString(),hemiIntensity:shadowRedFill.intensity}; localStorage.setItem(`ant-mars-preset-user${slot}`,JSON.stringify(snap)) }))
      row.appendChild(makBtn(`LOAD ${slot}`, () => { const raw=localStorage.getItem(`ant-mars-preset-user${slot}`); if(raw){try{applyPreset(JSON.parse(raw))}catch(e){}} }))
      userDiv.appendChild(row)
    })
    body.appendChild(userDiv)
  })()
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════════════════════════════
function setupEvents() {
  addEventListener('keydown', (e) => {
    if (e.code === 'Tab') { e.preventDefault(); toggleConstructorMode(); return }
    if (e.code === 'KeyG' && !constructorMode) { if (vehicleMode !== 'gravity') setDriveMode('gravity'); else toggleAntiGravity(); return }
    if (e.code === 'KeyZ' && !constructorMode) { setDriveMode(vehicleMode==='magnetic'?'gravity':'magnetic'); return }
    if (e.code === 'KeyH' && !constructorMode) { setDriveMode(vehicleMode==='hook'?'gravity':'hook'); return }
    if (e.code === 'KeyF' && !constructorMode) { setDriveMode(vehicleMode==='float'?'gravity':'float'); return }
    if (e.code === 'KeyO' && !constructorMode) { carSettings.orbitControls=!carSettings.orbitControls; orbit.enabled=carSettings.orbitControls; if(carSettings.orbitControls) orbit.target.copy(chassisPos); syncOrbitalBtn(); return }
    if (e.code === 'KeyM') { e.preventDefault(); document.getElementById('btn-minimap').click(); return }
    if (e.code === 'KeyV' && !constructorMode) { swapVehiclePreset(); return }
    if (e.code === 'KeyP') { carSettings.debug=!carSettings.debug; return }

    if (e.code === 'Escape' && freeTpActive) { exitFreeTeleport(); return }

    if (e.code === 'Escape' && !constructorMode && !teleportMenuOpen) {
      if (escapeMenuOpen) { hideEscapeMenu() } else { showEscapeMenu() }
      return
    }

    if (teleportMenuOpen) {
      if (e.code==='Digit1') { teleportToSlot(0); return }
      if (e.code==='Digit2') { teleportToSlot(1); return }
      if (e.code==='Digit3') { teleportToSlot(2); return }
      if (e.code==='Digit4') { teleportToSlot(3); return }
      if (e.code==='Escape') { hideTeleportMenu(); return }
      return
    }

    if (!constructorMode && !freeTpActive) { keys[e.code]=true; return }
    e.preventDefault(); e.stopPropagation()
    if (e.code==='Escape') { if(ghostObject){scene.remove(ghostObject);ghostObject=null;return} deselectObject(); return }
    if (e.code==='KeyG') { transformControls.mode='translate' }
    if (e.code==='KeyR') { transformControls.mode='rotate' }
    if (e.code==='KeyS' && selectedObject) { transformControls.mode='scale' }
    if (e.code==='Delete'||e.code==='Backspace') deleteSelectedObject()
  })

  addEventListener('keyup', (e) => {
    if (e.code === 'KeyR' && !constructorMode && !teleportMenuOpen) {
      if (rHoldTimer !== null) { clearTimeout(rHoldTimer); rHoldTimer=null; if(!teleportMenuOpen) localRespawn() }
      stopHoldLoader()
      return
    }
    keys[e.code] = false
  })

  // R hold for teleport
  addEventListener('keydown', (e) => {
    if (e.code !== 'KeyR' || constructorMode || teleportMenuOpen || e.repeat) return
    startHoldLoader()
    rHoldTimer = setTimeout(() => { stopHoldLoader(); showTeleportMenu(); rHoldTimer=null }, HOLD_DURATION)
  }, true)

  // Constructor mouse
  renderer.domElement.addEventListener('mousemove', (e) => {
    if (!constructorMode || !ghostObject) return
    const pt = ctorGetTerrainPoint(e.clientX, e.clientY)
    if (pt) ghostObject.position.copy(pt)
  })

  renderer.domElement.addEventListener('click', (e) => {
    // Zone placement takes priority
    if (zonePlacementMode) {
      const pt = ctorGetTerrainPoint(e.clientX, e.clientY)
      if (pt) {
        // Enter pending mode — show ghost, let user adjust Y before confirming
        zonePendingPoint = pt
        spawnZoneGhost(pt)
        // Update button to CONFIRM state
        const btn = document.getElementById('ctor-add-zone-btn')
        btn.style.background = 'rgba(0,255,224,0.3)'
        btn.style.borderColor = '#00FFE0'
        btn.textContent = '✔ CONFIRM ZONE'
      }
      return
    }
    if (constructorMode) {
      if (ghostObject) { const pt=ctorGetTerrainPoint(e.clientX,e.clientY); placeGhostAtPoint(pt); return }
      const hit = raycastPlacedObjects(e.clientX, e.clientY)
      hit ? selectObject(hit) : deselectObject()
      return
    }
    if (vehicleMode === 'hook') fireHook()
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// GAME LOOP
// ═══════════════════════════════════════════════════════════════════════════
function animate() {
  // Skip physics if game is paused (escape menu)
  if (gamePaused) {
    renderer.render(scene, camera)
    stats.update()
    return
  }

  const accel = (constructorMode?0:(keys.KeyW?1:0)-(keys.KeyS?1:0))
  const steer = (constructorMode?0:(keys.KeyA?1:0)-(keys.KeyD?1:0))
  const spaceDown = !!keys.Space
  const jumpPressed = spaceDown && !prevSpace
  prevSpace = spaceDown
  const boosting = !!keys.ShiftLeft || !!keys.ShiftRight

  const vel = chassisBody.linvel()
  const fwd = new THREE.Vector3(1,0,0).applyQuaternion(chassisQuat)
  const forwardSpeed = fwd.x*vel.x+fwd.y*vel.y+fwd.z*vel.z
  const speed = Math.sqrt(vel.x**2+vel.y**2+vel.z**2)

  // Skip normal vehicle physics in float mode
  const isFloatMode = vehicleMode === 'float' && floatModeActive
  let steerAngle = 0 // Declare outside the block so it's accessible for wheel rotation
  let wheelsOnGround = 0 // Declare outside for dust particle logic

  if (!isFloatMode) {
    const topSpeed = carSettings.maxSpeed*(boosting?carSettings.boostMultiplier:1)
    const overSpeed = Math.max(0, Math.abs(forwardSpeed)-topSpeed)
    let engineForce = (accel*carSettings.acceleration*(boosting?carSettings.boostMultiplier:1))/(1+overSpeed)
    let brake = 0
    if (!accel) brake = carSettings.deceleration*0.15
    if (speed>0.5 && ((accel>0&&forwardSpeed<-0.5)||(accel<0&&forwardSpeed>0.5))) { brake=carSettings.deceleration; engineForce=0 }

    const chassisUp = new THREE.Vector3(0,1,0).applyQuaternion(chassisQuat)
    const isUpsideDown = chassisUp.y < Math.cos((84*Math.PI)/180)

    if (isUpsideDown && jumpPressed) {
      const mass = chassisBody.mass()
      chassisBody.applyImpulse({x:0,y:carSettings.flipForce*mass,z:0},true)
      const torque = new THREE.Vector3(1,0,0).applyQuaternion(chassisQuat).multiplyScalar(carSettings.flipForce*0.66*mass)
      chassisBody.applyTorqueImpulse({x:torque.x,y:torque.y,z:torque.z},true)
      jumpState='cooldown'; jumpTimer=0
    }

    for (let i=0;i<4;i++) if (vehicle.wheelIsInContact(i)) wheelsOnGround++
    if (!isUpsideDown && jumpState==='ready' && jumpPressed && wheelsOnGround>=2) { jumpState='crouching'; jumpTimer=0 }

    if (jumpState==='crouching') {
      jumpTimer += FIXED_DT
      for (let i=0;i<4;i++) { vehicle.setWheelSuspensionRestLength(i,0.05); vehicle.setWheelSuspensionStiffness(i,80) }
      if (jumpTimer >= carSettings.jumpCrouchTime) {
        for (let i=0;i<4;i++) { vehicle.setWheelSuspensionRestLength(i,SUSP_REST); vehicle.setWheelSuspensionStiffness(i,12) }
        const up = new THREE.Vector3(0,1,0).applyQuaternion(chassisQuat)
        const mass = chassisBody.mass()
        chassisBody.applyImpulse({x:up.x*carSettings.jumpForce*mass,y:up.y*carSettings.jumpForce*mass,z:up.z*carSettings.jumpForce*mass},true)
        jumpState='cooldown'; jumpTimer=0
      }
    }
    if (jumpState==='cooldown') { jumpTimer+=FIXED_DT; if(jumpTimer>0.3&&wheelsOnGround>=2) jumpState='ready' }

    steerAngle = steer*carSettings.steer*Math.sqrt(carSettings.acceleration/5)
    vehicle.setWheelSteering(0,steerAngle); vehicle.setWheelSteering(1,steerAngle)
    for (let i=0;i<4;i++) { vehicle.setWheelEngineForce(i,engineForce); vehicle.setWheelBrake(i,brake); vehicle.setWheelFrictionSlip(i,carSettings.grip) }
  }

  if (chassisPos.y < biomeSettings.waterLevel && !isFloatMode) {
    const v = chassisBody.linvel(); const drag = 0.92
    chassisBody.setLinvel({x:v.x*drag,y:v.y*drag,z:v.z*drag},true)
  }

  if (!isFloatMode) { try { vehicle.updateVehicle(FIXED_DT) } catch(e){} }
  try { physicsWorld.step() } catch(e){}

  const p = chassisBody.translation(); const r = chassisBody.rotation()
  chassisPos.set(p.x,p.y,p.z); chassisQuat.set(r.x,r.y,r.z,r.w)
  chassisGroup.position.copy(chassisPos); chassisGroup.quaternion.copy(chassisQuat)

  const SPIN_AXIS = new THREE.Vector3(0,0,1), UP = new THREE.Vector3(0,1,0)
  for (let i=0;i<4;i++) {
    const conn = { x:(i<2?1:-1)*WHEEL_OFF.x, y:WHEEL_OFF.y, z:WHEEL_OFF.z*(i%2===0?1:-1) }
    const inContact = vehicle.wheelIsInContact(i)
    const suspLen = inContact ? (vehicle.wheelSuspensionLength(i)??SUSP_REST) : SUSP_REST
    const tmpV = new THREE.Vector3(conn.x, conn.y-suspLen, conn.z).applyQuaternion(chassisQuat).add(chassisPos)
    wheelMeshes[i].position.x = tmpV.x
    wheelMeshes[i].position.y = THREE.MathUtils.lerp(wheelMeshes[i].position.y, tmpV.y, carSettings.tireLerp)
    wheelMeshes[i].position.z = tmpV.z
    
    // Build wheel rotation: chassis rotation + steering (front only) + spin
    const tmpQ = chassisQuat.clone()
    // Only front wheels (0,1) get steering angle
    if (i < 2) {
      tmpQ.multiply(new THREE.Quaternion().setFromAxisAngle(UP, steerAngle))
    }
    // All wheels spin based on speed
    if (inContact) wheelSpins[i] -= (forwardSpeed/WHEEL_R)*FIXED_DT
    tmpQ.multiply(new THREE.Quaternion().setFromAxisAngle(SPIN_AXIS, wheelSpins[i]))
    
    // Apply rotation directly without slerp to prevent wobbling
    wheelMeshes[i].quaternion.copy(tmpQ)
  }

  const snapX = Math.round(chassisPos.x/GROUND_SNAP)*GROUND_SNAP
  const snapZ = Math.round(chassisPos.z/GROUND_SNAP)*GROUND_SNAP
  if (snapX!==lastGroundX||snapZ!==lastGroundZ) { lastGroundX=snapX; lastGroundZ=snapZ; updateGroundSync(snapX,snapZ) }

  waterMesh.position.x = chassisPos.x; waterMesh.position.z = chassisPos.z

  const dxHF = chassisPos.x-hfCenter.x, dzHF = chassisPos.z-hfCenter.z
  if (dxHF*dxHF+dzHF*dzHF > HF_RETHRESHOLD*HF_RETHRESHOLD) createHeightfieldSync(chassisPos.x, chassisPos.z)

  const azRad = (lightSettings.azimuth*Math.PI)/180, elRad = (lightSettings.elevation*Math.PI)/180
  const lightDist = 30
  dirLight.position.set(chassisPos.x+Math.cos(elRad)*Math.sin(azRad)*lightDist, chassisPos.y+Math.sin(elRad)*lightDist, chassisPos.z+Math.cos(elRad)*Math.cos(azRad)*lightDist)
  dirLight.target.position.copy(chassisPos); dirLight.target.updateMatrixWorld()

  if (carSettings.orbitControls) { orbit.target.lerp(chassisPos,0.1); orbit.update() }
  else if (isFloatMode) {
    const camFwd = new THREE.Vector3(1,0,0).applyQuaternion(chassisQuat)
    const ideal = chassisPos.clone().addScaledVector(camFwd, -cameraSettings.distance * 2.5)
    ideal.y = chassisPos.y + cameraSettings.height * 2
    camera.position.lerp(ideal, cameraSettings.smoothing * 0.5)
    camera.lookAt(chassisPos.x, chassisPos.y + cameraSettings.lookHeight, chassisPos.z)
  }
  else {
    const camFwd = new THREE.Vector3(1,0,0).applyQuaternion(chassisQuat)
    const ideal = chassisPos.clone().addScaledVector(camFwd, -cameraSettings.distance)
    ideal.y = chassisPos.y + cameraSettings.height
    camera.position.lerp(ideal, cameraSettings.smoothing)
    camera.lookAt(chassisPos.x, chassisPos.y+cameraSettings.lookHeight, chassisPos.z)
  }

  // Scatter
  if (!animate._scatterFrame) animate._scatterFrame = 0
  if (++animate._scatterFrame % 20 === 0) updateScatter(chassisPos.x, chassisPos.z)
  tickScatterBuild()

  // Particles
  const groundSpeed = Math.sqrt(vel.x*vel.x+vel.z*vel.z)
  const inWater = chassisPos.y < biomeSettings.waterLevel+1.5
  if (dustSettings.enabled && wheelsOnGround>=2 && groundSpeed>dustSettings.minSpeed && !inWater) {
    const emitCount = Math.min(3, Math.floor(groundSpeed*dustSettings.emitRate))
    for (let i=0;i<4;i++) if (vehicle.wheelIsInContact(i)) emitDust(wheelMeshes[i].position.x, wheelMeshes[i].position.y, wheelMeshes[i].position.z, -vel.x, 0, -vel.z, emitCount)
  }
  updateDustParticles(FIXED_DT)

  if (splashSettings.enabled && inWater && groundSpeed>splashSettings.minSpeed) {
    const sc = Math.min(5, Math.floor(groundSpeed*splashSettings.emitRate))
    for (let i=0;i<4;i++) { const wp=wheelMeshes[i].position; if(wp.y<biomeSettings.waterLevel+0.5) emitSplash(wp.x,biomeSettings.waterLevel,wp.z,-vel.x,0,-vel.z,sc) }
  }
  updateSplashParticles(FIXED_DT)

  // Wind dust
  for (let s=0;s<3;s++) spawnWindDust(chassisPos.x, chassisPos.y, chassisPos.z)
  updateWindDust(FIXED_DT, camera.position.x, camera.position.y, camera.position.z)

  // Magnetic mode
  tickMagneticMode()
  // Float mode
  tickFloatMode()

  // Float mode wheel rotation
  if (floatModeActive) {
    for (let i = 0; i < 4; i++) {
      wheelMeshes[i].rotation.y = THREE.MathUtils.lerp(wheelMeshes[i].rotation.y, Math.PI / 2, 0.1)
    }
  } else if (vehicleMode !== 'float') {
    for (let i = 0; i < 4; i++) {
      wheelMeshes[i].rotation.y = THREE.MathUtils.lerp(wheelMeshes[i].rotation.y, 0, 0.1)
    }
  }

  // Hook rope
  tickHookRope(FIXED_DT)

  // CAPA 1 — drill sampling (cheap; early-outs when panel closed)
  tickDrillSampling(FIXED_DT)
  // CAPA 2 — launch prep gyroscope + rover anchoring
  tickLaunchPrep()
  // CAPA 2/3 — probe flight + altitude bar + eject window detection
  tickProbe(FIXED_DT)
  // CAPA 4 — capsule guidance + sat_slot capture check
  tickCapsule(FIXED_DT)
  // CAPA 4 — sat_slot orbit motion (only while probe/capsule alive)
  if (satSlotMesh) tickSatSlot(FIXED_DT)

  // World zones
  tickWorldZones(FIXED_DT)

  // Gravity tanks
  tickGravityTanks(FIXED_DT)

  // Telemetry
  updateTelemetry()

  // Constructor
  if (constructorMode) tickConstructor()

  // Reset if fallen
  if (chassisPos.y < -30) resetCar()

  // Main render
  renderer.render(scene, camera)

  // Minimap — 3D top-down scissor render after main
  if (minimapOpen) renderMinimapScissor()
  // Right View — 3D side scissor render
  if (rightViewOpen) renderRightViewScissor()
  // v3 — rover lights tick
  tickRoverLights(FIXED_DT)
  // v3 — cinematic countdown camera override (before renders)
  if (_countdownCinemaActive) _tickCountdownCamera(FIXED_DT)
  // CAPA 1 — TORNO floor + front cam scissor renders
  if (drillCamOpen) { renderFloorCamScissor(); renderDrillCamScissor() }
  // CAPA 2 — launch prep sky cam
  renderLaunchSkyCamScissor()
  // CAPA 2/3 — PROBE orbital scissor render
  renderProbeCamScissor()
  // CAPA 4 — CAPSULE chase scissor render
  renderCapsuleCamScissor()

  stats.update()
}

// ═══════════════════════════════════════════════════════════════════════════
// DRIVE MODES
// ═══════════════════════════════════════════════════════════════════════════
function setDriveMode(mode) {
  const prev = vehicleMode
  // Exit float mode if switching away
  if (prev === 'float' && mode !== 'float') exitFloatMode()

  vehicleMode = mode
  document.querySelectorAll('.drive-tab').forEach(t => t.classList.toggle('active', t.dataset.mode===mode))
  const ch = document.getElementById('hook-crosshair'), hh = document.getElementById('hook-hud')
  if (ch) ch.style.display = mode==='hook'?'block':'none'
  if (hh) hh.style.display = mode==='hook'?'block':'none'
  const panel = document.getElementById('drive-mode-panel')
  if (panel) {
    if(mode==='gravity') panel.dataset.accent='cyan'
    else if(mode==='magnetic') panel.dataset.accent='blue'
    else if(mode==='hook') panel.dataset.accent='red'
    else if(mode==='float') panel.dataset.accent='lime'
  }

  if (mode==='magnetic') {
    physicsWorld.gravity = {x:0,y:NORMAL_GRAVITY,z:0}
    carSettings.jumpForce = 0
    for (let i=0;i<4;i++) vehicle.setWheelFrictionSlip(i,250)
    showToast('MAGNETIC MODE · TREN ADHESION','#00AAFF',1500)
  } else if (prev==='magnetic' && mode!=='float') {
    physicsWorld.gravity = {x:0,y:antiGravityActive?ANTIGRAV_GRAVITY:NORMAL_GRAVITY,z:0}
    carSettings.jumpForce = antiGravityActive?ANTIGRAV_JUMP:NORMAL_JUMP
    for (let i=0;i<4;i++) vehicle.setWheelFrictionSlip(i,carSettings.grip)
  }
  if (mode==='hook') showToast('HOOK MODE · AIM & CLICK','#FF4444',1500)
  if (mode==='gravity'&&prev!=='gravity') showToast('GRAVITY MODE','#00FFE0',1200)
  if (mode==='float') { enterFloatMode(); showToast('FLOAT MODE · FREE FLIGHT','#B4FF50',1500) }

  const modeEl = document.getElementById('hud-mode')
  const modeColor = mode==='gravity'?'#00FFE0':mode==='magnetic'?'#00AAFF':mode==='hook'?'#FF4444':mode==='float'?'#B4FF50':'#00FFE0'
  // Set CSS variable so all elements using var(--mode-color) update automatically
  document.documentElement.style.setProperty('--mode-color', modeColor)
  if (modeEl) { modeEl.textContent=mode.toUpperCase(); modeEl.style.color=modeColor }

  // Propagate mode color to key UI elements
  const modeIndicator = document.getElementById('mode-indicator-btn')
  if (modeIndicator) {
    modeIndicator.textContent = mode.toUpperCase()
    modeIndicator.style.borderColor = modeColor
    modeIndicator.style.color = modeColor
  }
  const gameFrame = document.getElementById('game-frame')
  if (gameFrame) gameFrame.style.borderColor = modeColor + '55'
  const btnOrb = document.getElementById('btn-orbital')
  if (btnOrb && !carSettings.orbitControls) btnOrb.style.borderColor = modeColor + '66'
  const constructBtn = document.getElementById('construct-toggle')
  if (constructBtn && !constructorMode) {
    constructBtn.style.borderColor = 'rgba(180,255,80,0.5)'
    constructBtn.style.color = '#B4FF50'
  }
  const driveToggle = document.getElementById('drive-toggle')
  if (driveToggle) {
    driveToggle.style.borderColor = modeColor + '66'
    driveToggle.style.color = modeColor
    driveToggle.style.background = modeColor + '14'
  }
  const shInfo = document.getElementById('south-hustles-info')
  if (shInfo) shInfo.style.color = modeColor + '66'

  // View panels — borders
  const mmPanel = document.getElementById('minimap-panel')
  if (mmPanel) mmPanel.style.borderColor = modeColor + '99'
  const rvPanel = document.getElementById('right-view-panel')
  if (rvPanel) rvPanel.style.borderColor = modeColor + '99'

  // View panel labels — text color
  const mmLabel = document.querySelector('#minimap-label span')
  if (mmLabel) mmLabel.style.color = modeColor + 'aa'
  const rvLabel = document.querySelector('#right-view-label span')
  if (rvLabel) rvLabel.style.color = modeColor + 'aa'

  // Resize handles — tint
  const mmHandle = document.getElementById('minimap-resize-handle')
  if (mmHandle) mmHandle.style.background = `linear-gradient(225deg,transparent 50%,${modeColor}66 50%)`
  const rvHandle = document.getElementById('right-view-resize-handle')
  if (rvHandle) rvHandle.style.background = `linear-gradient(135deg,transparent 50%,${modeColor}66 50%)`

  // GRAV TANKS panel
  const gravHud = document.getElementById('grav-tanks-hud')
  if (gravHud) gravHud.style.borderColor = modeColor + '55'
  const gravTitle = document.getElementById('grav-tanks-title')
  if (gravTitle) gravTitle.style.color = modeColor + '55'
  const gravCount = document.getElementById('grav-tank-count')
  if (gravCount) gravCount.style.color = modeColor + '66'
  // Only tint the empty-state background — full bars use CSS var(--mode-color)
  document.querySelectorAll('.gtank:not(.full)').forEach(bar => {
    bar.style.background = modeColor + '20'
  })

  // TELEMETRY header — border + title text + arrow
  const telPanel = document.getElementById('hud-telemetry')
  if (telPanel) telPanel.style.borderColor = modeColor + '44'
  const telToggle = document.getElementById('tel-toggle-btn')
  if (telToggle) {
    telToggle.style.color = modeColor
    const telArrow = telToggle.querySelector('.tel-arrow')
    if (telArrow) telArrow.style.color = modeColor
  }

  // Trail info (ANT ON MARS v.27 panel) — text
  const trailInfo = document.getElementById('trail-info')
  if (trailInfo) trailInfo.style.color = modeColor + '55'

  // Close buttons on all panels — change with mode
  ;['minimap-close','right-view-close','trail-info-close','south-hustles-close'].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.style.color = modeColor + '66'
  })

  // btn-right-view — highlight when right view is open, else muted modeColor
  const btnRv = document.getElementById('btn-right-view')
  if (btnRv) {
    btnRv.style.borderColor = rightViewOpen ? modeColor + 'cc' : modeColor + '44'
    btnRv.style.color = rightViewOpen ? modeColor : modeColor + '66'
    btnRv.style.background = rightViewOpen ? modeColor + '22' : 'rgba(255,255,255,0.04)'
  }

  updateDriveModeStatus()
}

function updateDriveModeStatus() {
  const el = document.getElementById('drive-mode-status')
  const modeBtn = document.getElementById('mode-indicator-btn')
  if (!el) return
  if (vehicleMode==='gravity') { el.textContent=`GRAVITY · ${antiGravityActive?'ANTIGRAV':'NORMAL'}`; el.style.color='rgba(0,255,224,0.6)'; if(modeBtn) modeBtn.textContent='GRAVITY [G]' }
  else if (vehicleMode==='magnetic') { el.textContent='MAGNETIC · ADHESION ACTIVE'; el.style.color='rgba(0,170,255,0.6)'; if(modeBtn) modeBtn.textContent='MAGNETIC [Z]' }
  else if (vehicleMode==='hook') { el.textContent=hookRopeLine?'HOOK · FLYING':'HOOK · READY'; el.style.color='rgba(255,68,68,0.6)'; if(modeBtn) modeBtn.textContent='HOOK [H]' }
  else if (vehicleMode==='float') { el.textContent='FLOAT · FREE FLIGHT'; el.style.color='rgba(180,255,80,0.6)'; if(modeBtn) modeBtn.textContent='FLOAT [F]' }
}


function tickMagneticMode() {
  if (vehicleMode !== 'magnetic') return
  if (!chassisBody || typeof chassisBody.applyForce !== 'function') return
  const mass = chassisBody.mass()
  const pos = chassisBody.translation()
  // Massive downforce — 250x gravity — keeps van glued HARD to surface (5x magnetic)
  chassisBody.applyForce({ x: 0, y: -mass * 2452.5, z: 0 }, true)
  // Clamp upward velocity if van lifts off surface
  const ray = new RAPIER.Ray({ x: pos.x, y: pos.y, z: pos.z }, { x: 0, y: -1, z: 0 })
  const hit = physicsWorld.castRay(ray, 6.0, true)
  if (!hit || hit.timeOfImpact > 2.0) {
    const vel = chassisBody.linvel()
    if (vel.y > 0) chassisBody.setLinvel({ x: vel.x, y: 0, z: vel.z }, true)
  }
}

// FLOAT MODE
function enterFloatMode() {
  floatModeActive = true
  floatModePrevGravity = { ...physicsWorld.gravity }
  physicsWorld.gravity = { x: 0, y: 0, z: 0 }
  for (let i = 0; i < 4; i++) wheelMeshes[i].userData.floatMode = true
  // Ship camera: widen FOV x2
  _floatPrevFOV = camera.fov
  camera.fov = Math.min(camera.fov * 2, 120)
  camera.updateProjectionMatrix()
  showToast('FLOAT MODE · SHIP CAM · SPACE=UP SHIFT=DOWN', '#B4FF50', 2000)
}

function exitFloatMode() {
  if (!floatModeActive) return
  floatModeActive = false
  if (floatModePrevGravity) physicsWorld.gravity = { ...floatModePrevGravity }
  for (let i = 0; i < 4; i++) wheelMeshes[i].userData.floatMode = false
  // Restore FOV
  if (_floatPrevFOV) { camera.fov = _floatPrevFOV; camera.updateProjectionMatrix(); _floatPrevFOV = null }
}

function tickFloatMode() {
  if (vehicleMode !== 'float' || !floatModeActive) return
  if (!chassisBody || typeof chassisBody.applyForce !== 'function') {
    console.warn('Float mode: chassisBody.applyForce no disponible')
    return // no crash
  }
  const mass = chassisBody.mass()
  const moveSpeed = 10 * mass
  // Get camera forward direction for movement
  const camDir = new THREE.Vector3()
  camera.getWorldDirection(camDir)
  camDir.y = 0
  camDir.normalize()
  const camRight = new THREE.Vector3().crossVectors(camDir, new THREE.Vector3(0, 1, 0)).normalize()

  let forceX = 0, forceY = 0, forceZ = 0
  if (keys.KeyW) { forceX += camDir.x * moveSpeed; forceZ += camDir.z * moveSpeed }
  if (keys.KeyS) { forceX -= camDir.x * moveSpeed; forceZ -= camDir.z * moveSpeed }
  if (keys.KeyA) { forceX -= camRight.x * moveSpeed; forceZ -= camRight.z * moveSpeed }
  if (keys.KeyD) { forceX += camRight.x * moveSpeed; forceZ += camRight.z * moveSpeed }
  if (keys.Space) forceY += moveSpeed * 1.5
  if (keys.ShiftLeft || keys.ShiftRight) forceY -= moveSpeed * 1.5

  // Apply damping to prevent infinite acceleration
  const vel = chassisBody.linvel()
  chassisBody.setLinvel({ x: vel.x * 0.92, y: vel.y * 0.92, z: vel.z * 0.92 }, true)
  chassisBody.applyForce({ x: forceX, y: forceY, z: forceZ }, true)
}

function fireHook() {
  if (vehicleMode!=='hook') return
  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera(new THREE.Vector2(0,0),camera)
  const targets = [groundMesh]; placedObjects.forEach(o=>targets.push(o.group))
  const hits = raycaster.intersectObjects(targets,true)
  if (hits.length>0) {
    const hitPoint = hits[0].point
    const vehPos = new THREE.Vector3(chassisPos.x,chassisPos.y,chassisPos.z)
    const ropeMat = new THREE.LineBasicMaterial({color:0xFF4444,transparent:true,opacity:1})
    const ropeGeo = new THREE.BufferGeometry().setFromPoints([vehPos.clone(),hitPoint.clone()])
    hookRopeLine = new THREE.Line(ropeGeo,ropeMat)
    scene.add(hookRopeLine); hookRopeTimer=0.5
    const dir = hitPoint.clone().sub(vehPos).normalize()
    chassisBody.applyImpulse({x:dir.x*200,y:dir.y*200,z:dir.z*200},true)
    showToast('HOOK LAUNCHED','#FF4444',800)
    updateDriveModeStatus()
  }
}

function tickHookRope(dt) {
  if (!hookRopeLine) return
  hookRopeTimer -= dt
  if (hookRopeTimer<=0) { scene.remove(hookRopeLine); hookRopeLine.geometry.dispose(); hookRopeLine.material.dispose(); hookRopeLine=null; updateDriveModeStatus() }
  else {
    hookRopeLine.material.opacity = Math.max(0,hookRopeTimer/0.5)
    const pts = hookRopeLine.geometry.attributes.position.array
    pts[0]=chassisPos.x; pts[1]=chassisPos.y; pts[2]=chassisPos.z
    hookRopeLine.geometry.attributes.position.needsUpdate = true
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ANTIGRAVITY
// ═══════════════════════════════════════════════════════════════════════════
function toggleAntiGravity() {
  const btn = document.getElementById('antigrav-btn'), hudAG = document.getElementById('hud-antigrav')
  if (!antiGravityActive) {
    if (gravTanks<=0) { btn.classList.add('no-tanks'); setTimeout(()=>btn.classList.remove('no-tanks'),350); return }
    gravTanks--; gravConsumeTime=0; antiGravityActive=true
    carSettings.jumpForce=ANTIGRAV_JUMP; physicsWorld.gravity={x:0,y:ANTIGRAV_GRAVITY,z:0}
    btn.classList.add('active'); btn.textContent='ANTIGRAV ON [G]'
    if (hudAG) { hudAG.textContent='ANTI-G'; hudAG.style.color='#00f5d4' }
  } else {
    antiGravityActive=false; carSettings.jumpForce=NORMAL_JUMP; physicsWorld.gravity={x:0,y:NORMAL_GRAVITY,z:0}
    btn.classList.remove('active'); btn.textContent='ANTIGRAV [G]'
    if (hudAG) { hudAG.textContent='NORMAL'; hudAG.style.color='#00FFE0' }
    document.getElementById('grav-timer-bar-wrap').style.display='none'
  }
}

function tickGravityTanks(dt) {
  if (antiGravityActive) {
    gravConsumeTime+=dt
    const pct = Math.max(0,1-gravConsumeTime/999)
    document.getElementById('grav-timer-bar').style.width=(pct*100)+'%'
  }
  if (!antiGravityActive && gravTanks<5) {
    gravTankPartial+=dt/8
    if (gravTankPartial>=1) { gravTanks=Math.min(gravTanks+1,5); gravTankPartial=0 }
  }
  for (let i=0;i<5;i++) {
    const el = document.getElementById('gtank-'+i)
    if (!el) continue
    el.classList.remove('full','empty','active-pulse')
    if (i<gravTanks) { el.classList.add('full'); if(antiGravityActive) el.classList.add('active-pulse') }
    else if (i===gravTanks&&!antiGravityActive&&gravTankPartial>0) { const fillPct=Math.round(gravTankPartial*100); const mc=getComputedStyle(document.documentElement).getPropertyValue('--mode-color').trim()||'#00FFE0'; el.style.background=`linear-gradient(to top,${mc}b3 ${fillPct}%,rgba(255,255,255,0.06) ${fillPct}%)` }
    else { el.classList.add('empty'); el.style.background='' }
  }
  const countEl = document.getElementById('grav-tank-count')
  if (countEl) countEl.textContent=gravTanks+' / 5'
}

// ═══════════════════════════════════════════════════════════════════════════
// WORLD ZONES
// ═══════════════════════════════════════════════════════════════════════════
function getWorldZone(pos) {
  if (pos.x<0&&pos.z<0) return 0; if (pos.x>=0&&pos.z<0) return 1; if (pos.x<0&&pos.z>=0) return 2; return 3
}

function tickWorldZones(dt) {
  // Legacy WORLD_ZONES quadrant fog disabled — zones are now user-built via constructor
  // Only custom zone collision detection runs
  checkCustomZoneCollisions()

  // Smooth fog transitions from custom zones
  if (zoneTransition) {
    zoneTransition.timer += dt
    const t = Math.min(1, zoneTransition.timer / zoneTransition.duration)
    _zoneColorCurrent.lerpColors(zoneTransition.from, zoneTransition.to, t)
    scene.fog.color.copy(_zoneColorCurrent); scene.background.copy(_zoneColorCurrent)
    if (t >= 1) zoneTransition = null
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TELEPORT / RESPAWN
// ═══════════════════════════════════════════════════════════════════════════
function localRespawn() {
  if (constructorMode) return
  const pos=chassisBody.translation()
  chassisBody.setTranslation({x:pos.x+(Math.random()-0.5)*8,y:pos.y+6,z:pos.z+(Math.random()-0.5)*8},true)
  chassisBody.setRotation({x:0,y:0,z:0,w:1},true)
  chassisBody.setLinvel({x:0,y:0,z:0},true); chassisBody.setAngvel({x:0,y:0,z:0},true)
  wheelSpins.fill(0)
  showToast('RESPAWN LOCAL','#B4FF50',1200)
}

function resetCar() {
  const h=getTerrainHeight(0,0)+3
  chassisBody.setTranslation({x:0,y:h,z:0},true); chassisBody.setRotation({x:0,y:0,z:0,w:1},true)
  chassisBody.setLinvel({x:0,y:0,z:0},true); chassisBody.setAngvel({x:0,y:0,z:0},true)
  wheelSpins.fill(0)
}

function startHoldLoader() {
  const loaderEl=document.getElementById('respawn-loader'), arc=document.getElementById('respawn-arc')
  if(!loaderEl||!arc) return
  rHoldStart=Date.now(); loaderEl.classList.add('visible'); arc.style.strokeDashoffset=157
  rHoldInterval=setInterval(()=>{const elapsed=Date.now()-rHoldStart;const progress=Math.min(1,elapsed/HOLD_DURATION);arc.style.strokeDashoffset=157*(1-progress);if(progress>=1){clearInterval(rHoldInterval);rHoldInterval=null}},16)
}

function stopHoldLoader() {
  const loaderEl=document.getElementById('respawn-loader'), arc=document.getElementById('respawn-arc')
  if(!loaderEl||!arc) return
  loaderEl.classList.remove('visible'); if(rHoldInterval){clearInterval(rHoldInterval);rHoldInterval=null}
  arc.style.strokeDashoffset=157
}

function showTeleportMenu() {
  teleportMenuOpen=true
  const menu=document.getElementById('teleport-menu'); if(!menu) return
  const slots=loadTeleportSlots()

  // Build the menu content dynamically
  const contentDiv = document.getElementById('tp-content')
  if (!contentDiv) return

  contentDiv.innerHTML = ''

  // Spawn inicial (not deletable)
  const spawnRow = document.createElement('div')
  spawnRow.className = 'tp-option'
  spawnRow.dataset.tp = '0'
  spawnRow.innerHTML = `<span>[1] SPAWN INICIAL</span>`
  spawnRow.addEventListener('click', () => teleportToSlot(0))
  contentDiv.appendChild(spawnRow)

  // Slots 1-6 with delete and rename buttons
  for (let i = 1; i <= 6; i++) {
    const tp = slots[i]
    const row = document.createElement('div')
    row.className = 'tp-row'
    row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:6px 8px;cursor:pointer;font-size:10px;letter-spacing:0.1em;transition:all 0.15s;border:0.5px solid transparent;border-radius:2px;margin:3px 0;'

    if (tp && tp.position) {
      row.style.color = 'rgba(180,255,80,0.9)'
      row.innerHTML = `
        <span class="tp-name" data-slot="${i}" style="flex:1;cursor:pointer;">[${i+1}] ${tp.name}</span>
        <button class="tp-rename-btn" data-slot="${i}" style="background:none;border:none;color:rgba(0,170,255,0.6);cursor:pointer;font-size:10px;padding:2px 4px;" title="Renombrar">✎</button>
        <button class="tp-delete-btn" data-slot="${i}" style="background:none;border:none;color:rgba(255,68,68,0.6);cursor:pointer;font-size:11px;padding:2px 4px;" title="Eliminar">✕</button>
      `
    } else {
      row.style.color = 'rgba(255,255,255,0.35)'
      row.innerHTML = `<span class="tp-name" data-slot="${i}" style="flex:1;cursor:pointer;">[${i+1}] — VACÍO · CLICK = GUARDAR AQUÍ</span>`
    }

    // Click on name to teleport or save
    const nameEl = row.querySelector('.tp-name')
    nameEl.addEventListener('click', (e) => {
      e.stopPropagation()
      teleportToSlot(i)
    })

    // Rename button
    const renameBtn = row.querySelector('.tp-rename-btn')
    if (renameBtn) {
      renameBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        const slot = parseInt(renameBtn.dataset.slot)
        renameTeleportSlot(slot)
      })
    }

    // Delete button
    const deleteBtn = row.querySelector('.tp-delete-btn')
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        const slot = parseInt(deleteBtn.dataset.slot)
        deleteTeleportSlot(slot)
      })
    }

    contentDiv.appendChild(row)
  }

  menu.style.display = 'block'
}

function renameTeleportSlot(slotIdx) {
  const slots = loadTeleportSlots()
  const tp = slots[slotIdx]
  if (!tp || !tp.position) return

  const newName = prompt('Nuevo nombre para el punto de teletransporte:', tp.name)
  if (newName && newName.trim()) {
    tp.name = newName.trim()
    slots[slotIdx] = tp
    saveTeleportSlots(slots)
    showToast(`✦ TP ${slotIdx} RENOMBRADO: ${tp.name}`, '#B4FF50', 1500)
    showTeleportMenu() // Refresh menu
  }
}

function deleteTeleportSlot(slotIdx) {
  if (slotIdx === 0) return // Can't delete spawn
  if (!confirm(`¿Eliminar el punto de teletransporte ${slotIdx}?`)) return

  const slots = loadTeleportSlots()
  slots[slotIdx] = null
  saveTeleportSlots(slots)
  showToast(`TP ${slotIdx} ELIMINADO`, '#FF4444', 1200)
  showTeleportMenu() // Refresh menu
}

function hideTeleportMenu() { teleportMenuOpen=false; const menu=document.getElementById('teleport-menu'); if(menu) menu.style.display='none' }

function teleportToSlot(slotIdx) {
  const slots=loadTeleportSlots()
  if(slotIdx===0){const h=getTerrainHeight(0,0)+3;chassisBody.setTranslation({x:0,y:h,z:0},true);chassisBody.setRotation({x:0,y:0,z:0,w:1},true);chassisBody.setLinvel({x:0,y:0,z:0},true);chassisBody.setAngvel({x:0,y:0,z:0},true);showToast('TELEPORT · SPAWN INICIAL','#B4FF50',1500);hideTeleportMenu();return}
  const tp=slots[slotIdx]
  if(!tp||!tp.position){saveTeleportPoint(slotIdx);return}
  chassisBody.setTranslation({x:tp.position.x,y:tp.position.y+1.5,z:tp.position.z},true)
  if(tp.rotation) chassisBody.setRotation(tp.rotation,true)
  else chassisBody.setRotation({x:0,y:0,z:0,w:1},true)
  chassisBody.setLinvel({x:0,y:0,z:0},true);chassisBody.setAngvel({x:0,y:0,z:0},true)
  showToast(`TELEPORT · ${tp.name}`,'#B4FF50',1500);hideTeleportMenu()
}

// ── FREE TELEPORT ────────────────────────────────────────────────────────────
function enterFreeTeleport() {
  if (constructorMode) return
  freeTpActive = true

  // Save and switch camera to orbit/freecam
  _freeTpPrevOrbit = carSettings.orbitControls
  _freeTpPrevFOV = camera.fov
  carSettings.orbitControls = true
  orbit.enabled = true
  orbit.target.copy(chassisPos)
  orbit.screenSpacePanning = true  // infinite pan
  camera.fov = Math.min(_freeTpPrevFOV * 1.35, 100)
  camera.updateProjectionMatrix()

  // Build 3D marker (arrow cone + ring)
  const markerGroup = new THREE.Group()
  // Ring on ground
  const ringGeo = new THREE.RingGeometry(0.6, 0.9, 32)
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd200, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false })
  const ring = new THREE.Mesh(ringGeo, ringMat)
  ring.rotation.x = -Math.PI / 2
  markerGroup.add(ring)
  // Arrow cone pointing up
  const coneGeo = new THREE.ConeGeometry(0.25, 1.0, 8)
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xffd200, transparent: true, opacity: 0.85 })
  const cone = new THREE.Mesh(coneGeo, coneMat)
  cone.position.y = 1.5
  markerGroup.add(cone)
  // Pulsing inner disc
  const discGeo = new THREE.CircleGeometry(0.5, 32)
  const discMat = new THREE.MeshBasicMaterial({ color: 0xffd200, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false })
  const disc = new THREE.Mesh(discGeo, discMat)
  disc.rotation.x = -Math.PI / 2
  disc.position.y = 0.02
  markerGroup.add(disc)

  markerGroup.visible = false
  scene.add(markerGroup)
  _freeTpMarker = markerGroup
  _freeTpMarkerPos = null

  // Hint text
  const hint = document.getElementById('freetp-hint')
  if (hint) hint.style.display = 'block'

  // Button style active
  const btn = document.getElementById('btn-freetp')
  if (btn) {
    btn.style.borderColor = 'rgba(255,210,0,0.9)'
    btn.style.color = '#FFD200'
    btn.style.background = 'rgba(255,210,0,0.1)'
    btn.textContent = 'TELEPORT ON'
  }

  // Raycast click handler
  renderer.domElement.addEventListener('click', _freeTpClickHandler)
}

function _freeTpClickHandler(e) {
  if (!freeTpActive) return
  // Don't fire if orbit was dragging
  if (orbit._lastDragDelta && orbit._lastDragDelta > 4) return

  const rect = renderer.domElement.getBoundingClientRect()
  const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1
  const my = -((e.clientY - rect.top) / rect.height) * 2 + 1
  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera(new THREE.Vector2(mx, my), camera)

  // Intersect with all scene objects recursively (GLBs, terrain, etc) — exclude marker and instanced particle meshes
  const targets = scene.children.filter(c => c !== _freeTpMarker && !c.isInstancedMesh && c !== window._dustIMesh && c !== window._windDustIMesh && c !== window._splashIMesh)
  const hits = raycaster.intersectObjects(targets, true).filter(h => !h.object.isInstancedMesh && h.object !== _freeTpMarker)
  const hit = hits[0]
  if (!hit) return

  const spawnPos = hit.point.clone()
  spawnPos.y += WHEEL_R * 2 + 0.5  // one wheel height above ground

  // Show marker at hit point
  if (_freeTpMarker) {
    _freeTpMarker.position.set(hit.point.x, hit.point.y + 0.05, hit.point.z)
    _freeTpMarker.visible = true
  }
  _freeTpMarkerPos = spawnPos

  // Pulse animation on marker
  let _pulse = 0
  if (_freeTpMarker._pulseInterval) clearInterval(_freeTpMarker._pulseInterval)
  _freeTpMarker._pulseInterval = setInterval(() => {
    _pulse += 0.15
    const s = 1 + 0.15 * Math.sin(_pulse)
    if (_freeTpMarker) _freeTpMarker.scale.set(s, s, s)
  }, 16)

  // Confirm UI — show toast with confirmation
  showToast('CLICK AGAIN TO CONFIRM SPAWN · ESC CANCEL', '#FFD200', 2000)

  // Second click = confirm
  renderer.domElement.removeEventListener('click', _freeTpClickHandler)
  setTimeout(() => {
    renderer.domElement.addEventListener('click', _freeTpConfirmHandler)
  }, 200)
}

function _freeTpConfirmHandler(e) {
  if (!freeTpActive || !_freeTpMarkerPos) return
  renderer.domElement.removeEventListener('click', _freeTpConfirmHandler)

  const pos = _freeTpMarkerPos.clone()

  // Camera zoom-in animation before spawn
  const startFOV = camera.fov
  const targetFOV = startFOV * 0.45
  let t = 0
  const zoomInterval = setInterval(() => {
    t += 0.07
    camera.fov = THREE.MathUtils.lerp(startFOV, targetFOV, Math.min(1, t))
    camera.updateProjectionMatrix()
    if (t >= 1) {
      clearInterval(zoomInterval)
      // Teleport
      chassisBody.setTranslation({ x: pos.x, y: pos.y, z: pos.z }, true)
      chassisBody.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
      chassisBody.setLinvel({ x: 0, y: 0, z: 0 }, true)
      chassisBody.setAngvel({ x: 0, y: 0, z: 0 }, true)
      wheelSpins.fill(0)
      showToast('⬡ SPAWNED', '#FFD200', 1500)
      exitFreeTeleport()
    }
  }, 16)
}

function exitFreeTeleport() {
  freeTpActive = false
  renderer.domElement.removeEventListener('click', _freeTpClickHandler)
  renderer.domElement.removeEventListener('click', _freeTpConfirmHandler)

  // Restore camera
  carSettings.orbitControls = _freeTpPrevOrbit
  orbit.enabled = _freeTpPrevOrbit
  orbit.screenSpacePanning = false
  if (_freeTpPrevFOV) { camera.fov = _freeTpPrevFOV; camera.updateProjectionMatrix(); _freeTpPrevFOV = null }
  syncOrbitalBtn()

  // Remove marker
  if (_freeTpMarker) {
    if (_freeTpMarker._pulseInterval) clearInterval(_freeTpMarker._pulseInterval)
    scene.remove(_freeTpMarker)
    _freeTpMarker.traverse(c => { if (c.isMesh) { c.geometry.dispose(); c.material.dispose() } })
    _freeTpMarker = null
  }
  _freeTpMarkerPos = null

  const hint = document.getElementById('freetp-hint')
  if (hint) hint.style.display = 'none'

  const btn = document.getElementById('btn-freetp')
  if (btn) {
    btn.style.borderColor = 'rgba(255,210,0,0.4)'
    btn.style.color = 'rgba(255,210,0,0.6)'
    btn.style.background = 'transparent'
    btn.textContent = 'TELEPORT'
  }
}

const TP_STORAGE_KEY='ant-mars-teleports'
function loadTeleportSlots(){try{const raw=localStorage.getItem(TP_STORAGE_KEY);if(raw)return JSON.parse(raw)}catch(e){}return[null,null,null,null,null,null,null]}
function saveTeleportSlots(slots){localStorage.setItem(TP_STORAGE_KEY,JSON.stringify(slots))}
function saveTeleportPoint(slotIdx){
  if(slotIdx===0){showToast('SPAWN SLOT NO EDITABLE','#FF4444',1500);return}
  const slots=loadTeleportSlots()
  const r=chassisBody.rotation()
  slots[slotIdx]={name:'TP '+slotIdx,position:{x:chassisPos.x,y:chassisPos.y,z:chassisPos.z},rotation:{x:r.x,y:r.y,z:r.z,w:r.w}}
  saveTeleportSlots(slots); showToast(`✦ TP ${slotIdx} SAVED`,'#B4FF50',2000); hideTeleportMenu()
}

// ═══════════════════════════════════════════════════════════════════════════
// SAVE / LOAD
// ═══════════════════════════════════════════════════════════════════════════
function buildSaveDataV8() {
  return {
    version:'8.0', timestamp:Date.now(), slotName:'',
    terrain:{frequency:terrainSettings.frequency,amplitude:terrainSettings.amplitude,planetCurvature:terrainSettings.planetCurvature||0},
    environment:{skyColor:scene.background?'#'+scene.background.getHexString():'#000',fogColor:scene.fog?'#'+scene.fog.color.getHexString():'#000',fogNear:scene.fog?scene.fog.near:10,fogFar:scene.fog?scene.fog.far:500},
    camera:{position:{x:camera.position.x,y:camera.position.y,z:camera.position.z},fov:camera.fov,mode:carSettings.orbitControls?'orbit':'follow',distance:cameraSettings.distance,height:cameraSettings.height,lookHeight:cameraSettings.lookHeight,smoothing:cameraSettings.smoothing},
    placedAssets:placedObjects.map(e=>({id:e.id,originalFilename:e.name,source:e.source||'catalog',collisionMode:e.physics?.mode||'none',position:{x:+e.group.position.x.toFixed(3),y:+e.group.position.y.toFixed(3),z:+e.group.position.z.toFixed(3)},rotation:{x:+e.group.rotation.x.toFixed(4),y:+e.group.rotation.y.toFixed(4),z:+e.group.rotation.z.toFixed(4)},scale:+e.group.scale.x.toFixed(4),type:'glb'})),
    discoveredZones:Array.from(worldZoneDiscovered),
    playerPosition:{x:chassisPos.x,y:chassisPos.y,z:chassisPos.z},
    driveMode:vehicleMode,
    teleportSlots:loadTeleportSlots(),
    lighting:{...lightSettings},
    biomes:{waterLevel:biomeSettings.waterLevel,sandEnd:biomeSettings.sandEnd,dirtEnd:biomeSettings.dirtEnd,transitionWidth:biomeSettings.transitionWidth,sandColor1:biomeSettings.sandColor1,sandColor2:biomeSettings.sandColor2,dirtColor1:biomeSettings.dirtColor1,dirtColor2:biomeSettings.dirtColor2,grassColor1:biomeSettings.grassColor1,grassColor2:biomeSettings.grassColor2,waterColor:biomeSettings.waterColor,waterColorDeep:biomeSettings.waterColorDeep},
    // NEW: Custom zones, modals, panels
    customZones: customZones.map(z => ({
      zoneId: z.zoneId,
      name: z.name,
      type: z.type,
      shape: z.shape,
      dimensions: z.dimensions,
      position: z.position,
      color: z.color,
      scale: z.scale,
      events: z.events || {},
      cameraPOV: z.cameraPOV || null
    })),
    modals: Array.from(worldModals.entries()).map(([id, m]) => ({ modalId: id, ...m })),
    panels: Array.from(worldPanels.entries()).map(([id, p]) => ({ panelId: id, ...p })),
    dust: { colorR: dustSettings.colorR, colorG: dustSettings.colorG, colorB: dustSettings.colorB, opacity: dustSettings.opacity, lifetime: dustSettings.lifetime, emitRate: dustSettings.emitRate },
    wind: { colorR: windSettings.colorR, colorG: windSettings.colorG, colorB: windSettings.colorB, opacity: windSettings.opacity, particleSize: windSettings.particleSize, lifetime: windSettings.lifetime }
  }
}

function captureWorldThumbnail() {
  try {
    // Render a frame to ensure canvas is up to date, then grab a small JPEG
    renderer.render(scene, camera)
    return renderer.domElement.toDataURL('image/jpeg', 0.45)
  } catch(e) { return null }
}

function saveWorld(slot) {
  const data=buildSaveDataV8()
  data.slotName='SLOT '+slot
  data.thumbnail = captureWorldThumbnail()
  try{localStorage.setItem('ant-mars-world-'+slot,JSON.stringify(data));localStorage.setItem('ant-mars-last-slot',slot);showToast(`✦ SLOT ${slot} SAVED`,'#B4FF50',2000);s9RefreshLoadBtns()}catch(e){showToast('SAVE ERROR','#FF4444',1500)}
}

async function loadWorld(slot) {
  try{
    const raw=localStorage.getItem('ant-mars-world-'+slot)
    if(!raw){showToast(`SLOT ${slot} VACÍO`,'#FF4444',1200);return}
    const data=JSON.parse(raw)
    await applyWorldData(data)
    localStorage.setItem('ant-mars-last-slot', slot)
    showToast(`LOADED · ${data.slotName||'SLOT '+slot}`,'#B4FF50',2000)
  }catch(e){showToast('LOAD ERROR','#FF4444',1500);console.error(e)}
}

function exportWorld() {
  showExportNameModal((name) => {
    const safeName = name.trim().replace(/[^a-zA-Z0-9_\-. ]/g, '').replace(/\s+/g, '_') || ('world-'+new Date().toISOString().slice(0,10))
    const data = buildSaveDataV8()
    data.slotName = name.trim() || 'EXPORT'
    data.thumbnail = captureWorldThumbnail()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = safeName + '.json'
    a.click()
    URL.revokeObjectURL(url)
    showToast('✦ EXPORTED: ' + safeName, '#B4FF50', 2000)
  })
}

function showExportNameModal(onConfirm) {
  const existing = document.getElementById('export-name-modal')
  if (existing) existing.remove()
  const modal = document.createElement('div')
  modal.id = 'export-name-modal'
  modal.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:3000;background:rgba(10,10,20,0.94);backdrop-filter:blur(16px);border:1px solid rgba(180,255,80,0.3);border-radius:8px;padding:20px;min-width:300px;font-family:"Share Tech Mono",monospace;'
  modal.innerHTML = `
    <div style="font-size:10px;color:#B4FF50;letter-spacing:0.15em;margin-bottom:12px;">◆ EXPORT WORLD — NOMBRE DEL ARCHIVO</div>
    <input id="export-name-input" type="text" placeholder="mi-mundo..." value="world-${new Date().toISOString().slice(0,10)}" style="width:100%;padding:8px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:4px;color:#fff;font-family:inherit;font-size:11px;outline:none;box-sizing:border-box;" />
    <div style="font-size:8px;color:rgba(255,255,255,0.25);margin-top:6px;letter-spacing:0.05em;">Se guardará como .json</div>
    <div style="display:flex;gap:8px;margin-top:12px;">
      <button id="export-name-confirm" style="flex:1;padding:8px;background:rgba(180,255,80,0.15);border:1px solid rgba(180,255,80,0.4);color:#B4FF50;border-radius:4px;cursor:pointer;font-family:inherit;font-size:10px;letter-spacing:0.1em;">↓ EXPORT</button>
      <button id="export-name-cancel" style="flex:1;padding:8px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.5);border-radius:4px;cursor:pointer;font-family:inherit;font-size:10px;letter-spacing:0.1em;">CANCEL</button>
    </div>
  `
  document.body.appendChild(modal)
  const input = modal.querySelector('#export-name-input')
  input.focus(); input.select()
  const confirm = () => { const v = input.value; modal.remove(); gamePaused = false; onConfirm(v) }
  modal.querySelector('#export-name-confirm').addEventListener('click', confirm)
  modal.querySelector('#export-name-cancel').addEventListener('click', () => { modal.remove(); gamePaused = false })
  input.addEventListener('focus', () => { gamePaused = true })
  input.addEventListener('blur', () => { gamePaused = false })
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') { modal.remove(); gamePaused = false } })
}

// Export ALL worlds to a single JSON file
function exportAllWorlds() {
  const allWorlds = {}
  let exportedCount = 0
  
  for (let i = 1; i <= 6; i++) {
    const raw = localStorage.getItem('ant-mars-world-' + i)
    if (raw) {
      try {
        allWorlds['world_' + i] = JSON.parse(raw)
        exportedCount++
      } catch(e) {
        console.warn(`[Export] Failed to parse world ${i}`)
      }
    }
  }
  
  if (exportedCount === 0) {
    showToast('NO WORLDS TO EXPORT', '#FFB347', 2000)
    return
  }
  
  const exportData = {
    version: '8.0',
    exportedAt: new Date().toISOString(),
    worldCount: exportedCount,
    worlds: allWorlds
  }
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ant-on-mars-all-worlds-${new Date().toISOString().slice(0,10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  
  showToast(`✦ EXPORTED ${exportedCount} WORLDS`, '#B4FF50', 2000)
}

// Import ALL worlds from a JSON file
function importAllWorlds(file) {
  showToast('IMPORTING ALL WORLDS...', '#00AAFF', 1500)
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result)
      
      if (!data.worlds) {
        showToast('INVALID FILE FORMAT', '#FF4444', 2000)
        return
      }
      
      let importedCount = 0
      for (const [key, worldData] of Object.entries(data.worlds)) {
        const slotNum = parseInt(key.replace('world_', ''))
        if (slotNum >= 1 && slotNum <= 6) {
          localStorage.setItem('ant-mars-world-' + slotNum, JSON.stringify(worldData))
          importedCount++
        }
      }
      
      showToast(`✦ IMPORTED ${importedCount} WORLDS`, '#B4FF50', 2000)
      s9RefreshLoadBtns()
    } catch(err) {
      showToast('IMPORT ERROR: INVALID JSON', '#FF4444', 2000)
      console.error('[Import All] Error:', err)
    }
  }
  reader.readAsText(file)
}

function s9RefreshLoadBtns() {
  for(let i=1;i<=6;i++){
    const loadBtn=document.getElementById('sw-load-'+i)
    const nameEl=document.getElementById('sw-name-'+i)
    const saveBtn=document.querySelector(`.sw-save-btn[data-slot="${i}"]`)
    const thumbEl=document.getElementById('sw-thumb-'+i)
    if(!loadBtn) continue
    try{
      const raw=localStorage.getItem('ant-mars-world-'+i)
      if(raw){
        const d=JSON.parse(raw)
        const name=d.slotName||('SLOT '+i)
        loadBtn.textContent=name.substring(0,10)
        loadBtn.title=name
        if(nameEl){ nameEl.textContent=name.substring(0,12); nameEl.style.color='#B4FF50' }
        loadBtn.style.borderColor='#B4FF50'
        loadBtn.style.color='#B4FF50'
        loadBtn.style.background='rgba(180,255,80,0.12)'
        if(saveBtn){ saveBtn.textContent=name.substring(0,8); saveBtn.style.borderColor='#B4FF50'; saveBtn.style.color='#000'; saveBtn.style.background='#B4FF50'; saveBtn.style.fontWeight='700' }
        // thumbnail — update <img> src if a saved screenshot exists
        const thumbImg = document.getElementById('sw-thumb-img-'+i)
        if(thumbImg){
          if(d.thumbnail){
            thumbImg.src = d.thumbnail
            thumbImg.style.display = ''
          }
          // else keep the static fallback image
        }
      }else{
        loadBtn.textContent='SLOT '+i
        if(nameEl){ nameEl.textContent='—'; nameEl.style.color='rgba(255,255,255,0.35)' }
        loadBtn.style.borderColor='rgba(255,255,255,0.1)'
        loadBtn.style.color='rgba(255,255,255,0.4)'
        loadBtn.style.background='transparent'
        if(saveBtn){ saveBtn.textContent='SAVE '+i; saveBtn.style.borderColor='rgba(255,255,255,0.1)'; saveBtn.style.color='rgba(255,255,255,0.45)'; saveBtn.style.background='transparent'; saveBtn.style.fontWeight='400' }
        const emptyThumbImg = document.getElementById('sw-thumb-img-'+i)
        if(emptyThumbImg){ emptyThumbImg.src = '/art/worlds/world-'+i+'.png'; emptyThumbImg.style.display = '' }
      }
    }catch(e){}
  }
}

// SAVE MODAL - allows naming slots, with overwrite confirmation if slot has data
function showSaveModal(slot) {
  const existing = document.getElementById('save-modal')
  if (existing) existing.remove()

  // Check if slot already has saved data — show overwrite confirmation first
  try {
    const raw = localStorage.getItem('ant-mars-world-'+slot)
    if (raw) {
      const d = JSON.parse(raw)
      const existingName = d.slotName || ('SLOT '+slot)
      showOverwriteConfirm(existingName, () => _openSaveModal(slot))
      return
    }
  } catch(e) {}

  _openSaveModal(slot)
}

function showOverwriteConfirm(existingName, onConfirm) {
  const existing = document.getElementById('overwrite-confirm-modal')
  if (existing) existing.remove()
  const modal = document.createElement('div')
  modal.id = 'overwrite-confirm-modal'
  modal.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:3100;background:rgba(10,10,20,0.95);backdrop-filter:blur(16px);border:1px solid rgba(255,100,50,0.4);border-radius:8px;padding:20px;min-width:280px;font-family:"Share Tech Mono",monospace;text-align:center;'
  modal.innerHTML = `
    <div style="font-size:10px;color:#FFB347;letter-spacing:0.12em;margin-bottom:8px;">◆ SOBRESCRIBIR MUNDO</div>
    <div style="font-size:9px;color:rgba(255,255,255,0.6);letter-spacing:0.08em;margin-bottom:16px;">¿Seguro que querés sobrescribir<br><span style="color:#B4FF50;">"${existingName}"</span>?</div>
    <div style="display:flex;gap:8px;">
      <button id="owc-yes" style="flex:1;padding:8px;background:rgba(255,100,50,0.15);border:1px solid rgba(255,100,50,0.4);color:#FF6432;border-radius:4px;cursor:pointer;font-family:inherit;font-size:10px;letter-spacing:0.1em;">SÍ, SOBRESCRIBIR</button>
      <button id="owc-no" style="flex:1;padding:8px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.5);border-radius:4px;cursor:pointer;font-family:inherit;font-size:10px;letter-spacing:0.1em;">CANCELAR</button>
    </div>
  `
  document.body.appendChild(modal)
  modal.querySelector('#owc-yes').addEventListener('click', () => { modal.remove(); onConfirm() })
  modal.querySelector('#owc-no').addEventListener('click', () => { modal.remove() })
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') { modal.remove(); document.removeEventListener('keydown', escHandler) }
  })
}

function _openSaveModal(slot) {
  const modal = document.createElement('div')
  modal.id = 'save-modal'
  modal.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:3000;background:rgba(10,10,20,0.92);backdrop-filter:blur(16px);border:1px solid rgba(180,255,80,0.3);border-radius:8px;padding:20px;min-width:320px;font-family:"Share Tech Mono",monospace;'
  modal.innerHTML = `
    <div style="font-size:11px;color:#B4FF50;letter-spacing:0.15em;margin-bottom:12px;">◆ SAVE WORLD — SLOT ${slot}</div>
    <input id="save-modal-input" type="text" placeholder="Nombre del mundo..." style="width:100%;padding:8px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:4px;color:#fff;font-family:inherit;font-size:11px;outline:none;" />
    <div style="display:flex;gap:8px;margin-top:12px;">
      <button id="save-modal-confirm" style="flex:1;padding:8px;background:rgba(180,255,80,0.15);border:1px solid rgba(180,255,80,0.4);color:#B4FF50;border-radius:4px;cursor:pointer;font-family:inherit;font-size:10px;letter-spacing:0.1em;">SAVE</button>
      <button id="save-modal-cancel" style="flex:1;padding:8px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.5);border-radius:4px;cursor:pointer;font-family:inherit;font-size:10px;letter-spacing:0.1em;">CANCEL</button>
    </div>
    <div style="margin-top:12px;font-size:8px;color:rgba(255,255,255,0.3);letter-spacing:0.1em;">SLOTS:</div>
    <div id="save-modal-slots" style="display:flex;flex-direction:column;gap:4px;margin-top:6px;"></div>
  `
  document.body.appendChild(modal)

  // Pre-fill name if exists
  try {
    const raw = localStorage.getItem('ant-mars-world-'+slot)
    if (raw) { const d = JSON.parse(raw); document.getElementById('save-modal-input').value = d.slotName || '' }
  } catch(e) {}

  // Show existing slots with delete buttons (6 slots)
  const slotsDiv = document.getElementById('save-modal-slots')
  for (let i = 1; i <= 6; i++) {
    const row = document.createElement('div')
    row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 6px;background:rgba(255,255,255,0.03);border-radius:3px;'
    try {
      const raw = localStorage.getItem('ant-mars-world-'+i)
      if (raw) {
        const d = JSON.parse(raw)
        row.innerHTML = `<span style="flex:1;font-size:9px;color:rgba(255,255,255,0.6);">${d.slotName||'SLOT '+i}</span><button class="save-modal-del" data-slot="${i}" style="background:none;border:none;color:#FF4444;cursor:pointer;font-size:11px;">✕</button>`
      } else {
        row.innerHTML = `<span style="flex:1;font-size:9px;color:rgba(255,255,255,0.25);">SLOT ${i} — VACÍO</span>`
      }
    } catch(e) { row.innerHTML = `<span style="font-size:9px;color:rgba(255,255,255,0.25);">SLOT ${i}</span>` }
    slotsDiv.appendChild(row)
  }

  // Delete slot handlers
  slotsDiv.querySelectorAll('.save-modal-del').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = btn.dataset.slot
      if (confirm(`¿Borrar SLOT ${s}?`)) {
        localStorage.removeItem('ant-mars-world-'+s)
        showToast(`SLOT ${s} BORRADO`, '#FF4444', 1200)
        modal.remove()
        _openSaveModal(slot) // Re-open to refresh (skip overwrite check)
        s9RefreshLoadBtns()
      }
    })
  })

  // Confirm save
  document.getElementById('save-modal-confirm').addEventListener('click', () => {
    const name = document.getElementById('save-modal-input').value.trim() || ('SLOT '+slot)
    const data = buildSaveDataV8()
    data.slotName = name
    data.thumbnail = captureWorldThumbnail()
    try {
      localStorage.setItem('ant-mars-world-'+slot, JSON.stringify(data))
      showToast(`✦ SLOT ${slot} SAVED: ${name}`, '#B4FF50', 2000)
      s9RefreshLoadBtns()
    } catch(e) { showToast('SAVE ERROR', '#FF4444', 1500) }
    modal.remove()
  })

  // Cancel
  document.getElementById('save-modal-cancel').addEventListener('click', () => {
    gamePaused = false
    modal.remove()
  })

  // Pause game when input is focused
  const nameInput = document.getElementById('save-modal-input')
  nameInput.addEventListener('focus', () => {
    gamePaused = true
  })
  nameInput.addEventListener('blur', () => {
    gamePaused = false
  })

  // Enter key to save
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('save-modal-confirm').click()
    if (e.key === 'Escape') {
      gamePaused = false
      modal.remove()
    }
  })
}

// IMPORT WORLD from JSON file
function importWorldFromFile(file) {
  showToast('IMPORTING WORLD...', '#00AAFF', 1500)
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result)
      applyWorldData(data).then(() => showToast('✦ WORLD IMPORTED', '#B4FF50', 2000))
    } catch(err) {
      showToast('IMPORT ERROR: INVALID FILE', '#FF4444', 2000)
      console.error('Import error:', err)
    }
  }
  reader.readAsText(file)
}

// Cleanup all placed assets before loading a new world
function cleanupWorldAssets() {
  console.log('[WorldLoader] Cleaning up world assets...')
  
  // Remove all placed GLB objects and their colliders
  for (const entry of placedObjects) {
    removeGLBCollider(entry)
    scene.remove(entry.group)
    // Dispose geometries and materials
    entry.group.traverse(child => {
      if (child.isMesh) {
        child.geometry?.dispose()
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose())
          else child.material.dispose()
        }
      }
    })
  }
  placedObjects = []
  
  // Clear all custom zones
  clearAllCustomZones()
  
  // Clear modals and panels
  worldModals.clear()
  worldPanels.clear()
  closeModal()
  
  // Reset discovered zones
  worldZoneDiscovered.clear()
  currentWorldZone = -1
  
  // Reset teleport slots
  saveTeleportSlots([null, null, null, null])
  
  // Reset vehicle position
  const h = getTerrainHeight(0, 0) + 3
  chassisBody.setTranslation({ x: 0, y: h, z: 0 }, true)
  chassisBody.setLinvel({ x: 0, y: 0, z: 0 }, true)
  chassisBody.setAngvel({ x: 0, y: 0, z: 0 }, true)
  
  console.log('[WorldLoader] World assets cleaned up')
}

async function applyWorldData(data) {
  // CLEANUP: Remove all existing assets before loading new world
  cleanupWorldAssets()
  
  if (data.terrain) {
    terrainSettings.frequency = data.terrain.frequency
    terrainSettings.amplitude = data.terrain.amplitude
    if (data.terrain.planetCurvature !== undefined) terrainSettings.planetCurvature = data.terrain.planetCurvature
    // Rebuild mesh AND physics heightfield so the car sits on the correct terrain
    updateGroundSync(lastGroundX, lastGroundZ)
    createHeightfieldSync(lastGroundX, lastGroundZ)
  }
  if (data.environment) {
    if (data.environment.fogColor) {
      scene.fog.color.set(data.environment.fogColor)
      scene.background.set(data.environment.skyColor || data.environment.fogColor)
      fogSettings.color = data.environment.fogColor
    }
    if (data.environment.fogNear !== undefined) { scene.fog.near = data.environment.fogNear; fogSettings.near = data.environment.fogNear }
    if (data.environment.fogFar !== undefined) { scene.fog.far = data.environment.fogFar; fogSettings.far = data.environment.fogFar }
  }
  if (data.camera) {
    if (data.camera.fov) { camera.fov = data.camera.fov; camera.updateProjectionMatrix() }
    if (data.camera.distance) cameraSettings.distance = data.camera.distance
    if (data.camera.height) cameraSettings.height = data.camera.height
    if (data.camera.lookHeight !== undefined) cameraSettings.lookHeight = data.camera.lookHeight
    if (data.camera.smoothing) cameraSettings.smoothing = data.camera.smoothing
  }
  if (data.playerPosition) {
    chassisBody.setTranslation({ x: data.playerPosition.x, y: data.playerPosition.y + 2, z: data.playerPosition.z }, true)
    chassisBody.setLinvel({ x: 0, y: 0, z: 0 }, true)
    chassisBody.setAngvel({ x: 0, y: 0, z: 0 }, true)
  }
  if (data.driveMode) setDriveMode(data.driveMode)
  if (data.discoveredZones) {
    data.discoveredZones.forEach(z => worldZoneDiscovered.add(z))
    const unlockEl = document.getElementById('hud-unlocked')
    if (unlockEl) unlockEl.textContent = `${worldZoneDiscovered.size} / 4`
  }
  if (data.teleportSlots) saveTeleportSlots(data.teleportSlots)
  if (data.lighting) {
    Object.assign(lightSettings, data.lighting)
  }
  if (data.biomes) {
    Object.assign(biomeSettings, data.biomes)
    waterMesh.position.y = biomeSettings.waterLevel
    if (biomeU) {
      biomeU.waterLevel.value = biomeSettings.waterLevel
      biomeU.sandEnd.value = biomeSettings.sandEnd
      biomeU.dirtEnd.value = biomeSettings.dirtEnd
      biomeU.transitionWidth.value = biomeSettings.transitionWidth
      biomeU.sandColor1.value.set(biomeSettings.sandColor1)
      biomeU.sandColor2.value.set(biomeSettings.sandColor2)
      biomeU.dirtColor1.value.set(biomeSettings.dirtColor1)
      biomeU.dirtColor2.value.set(biomeSettings.dirtColor2)
      biomeU.grassColor1.value.set(biomeSettings.grassColor1)
      biomeU.grassColor2.value.set(biomeSettings.grassColor2)
      biomeU.waterColor.value.set(biomeSettings.waterColor)
      biomeU.waterColorDeep.value.set(biomeSettings.waterColorDeep)
    }
  }

  // Load GLB assets from saved world
  if (data.placedAssets && data.placedAssets.length > 0) {
    showToast(`LOADING ${data.placedAssets.length} ASSETS...`, '#00AAFF', 2000)
    for (const asset of data.placedAssets) {
      try {
        await loadAssetFromSave(asset)
      } catch (err) {
        console.warn(`[Import] Failed to load asset ${asset.originalFilename}:`, err)
        showToast(`WARNING: ${asset.originalFilename} not found`, '#FFB347', 1500)
      }
    }
    showToast(`✦ ${data.placedAssets.length} ASSETS LOADED`, '#B4FF50', 2000)
  }

  // Dust & Wind particle settings
  if (data.dust) {
    if (data.dust.colorR !== undefined) dustSettings.colorR = data.dust.colorR
    if (data.dust.colorG !== undefined) dustSettings.colorG = data.dust.colorG
    if (data.dust.colorB !== undefined) dustSettings.colorB = data.dust.colorB
    if (data.dust.opacity !== undefined) dustSettings.opacity = data.dust.opacity
    if (data.dust.lifetime !== undefined) dustSettings.lifetime = data.dust.lifetime
    if (data.dust.emitRate !== undefined) dustSettings.emitRate = data.dust.emitRate
  }
  if (data.wind) {
    if (data.wind.colorR !== undefined) windSettings.colorR = data.wind.colorR
    if (data.wind.colorG !== undefined) windSettings.colorG = data.wind.colorG
    if (data.wind.colorB !== undefined) windSettings.colorB = data.wind.colorB
    if (data.wind.opacity !== undefined) windSettings.opacity = data.wind.opacity
    if (data.wind.particleSize !== undefined) windSettings.particleSize = data.wind.particleSize
    if (data.wind.lifetime !== undefined) windSettings.lifetime = data.wind.lifetime
  }

  // NEW: Load custom zones
  if (data.customZones && Array.isArray(data.customZones)) {
    clearAllCustomZones()
    for (const zone of data.customZones) {
      customZones.push(zone)
      createZoneVisual(zone)
      createZoneCollider(zone)
      zoneCaptureState.set(zone.zoneId, { timeInZone: 0, captured: false })
    }
    updateZoneList()
    console.log(`[Zones] Loaded ${data.customZones.length} custom zones`)
  }

  // NEW: Load modals
  if (data.modals && Array.isArray(data.modals)) {
    worldModals.clear()
    for (const modal of data.modals) {
      const { modalId, ...rest } = modal
      worldModals.set(modalId, rest)
    }
    console.log(`[Modals] Loaded ${data.modals.length} modals`)
  }

  // NEW: Load panels
  if (data.panels && Array.isArray(data.panels)) {
    worldPanels.clear()
    for (const panel of data.panels) {
      const { panelId, ...rest } = panel
      worldPanels.set(panelId, rest)
    }
    console.log(`[Panels] Loaded ${data.panels.length} panels`)
  }

  // Sync all Developer panel controls to reflect loaded values
  syncSettingsPanel()
}

async function loadAssetFromSave(assetData) {
  const path = assetData.originalFilename
  // Try to find the GLB in the catalog or from the path
  const catalogItem = GLB_CATALOG.find(c => c.name === assetData.originalFilename.replace(/\.glb$/i, ''))
  const loadPath = catalogItem ? catalogItem.path : `${GLB_CDN_BASE}/${assetData.originalFilename}`

  const gltf = await new Promise((resolve, reject) => {
    gltfLoader.load(loadPath, resolve, undefined, reject)
  })

  const group = new THREE.Group()
  group.add(gltf.scene.clone())

  // Apply saved transform
  group.position.set(assetData.position.x, assetData.position.y, assetData.position.z)
  group.rotation.set(assetData.rotation.x, assetData.rotation.y, assetData.rotation.z)
  group.scale.setScalar(assetData.scale)

  // Enable shadows
  group.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true } })

  scene.add(group)

  // Add to placedObjects
  const entry = {
    group,
    name: assetData.originalFilename,
    id: constructorIdCounter++,
    baseScale: assetData.scale,
    physics: null,
    source: assetData.source || 'import'
  }
  placedObjects.push(entry)

  // Apply collision mode if saved (but not trimesh by default for performance)
  if (assetData.collisionMode && assetData.collisionMode !== 'none') {
    createGLBCollider(entry, assetData.collisionMode)
  }
}

// ESCAPE MENU
function showEscapeMenu() {
  escapeMenuOpen = true
  gamePaused = true

  const menu = document.createElement('div')
  menu.id = 'escape-menu'
  menu.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:3000;background:rgba(10,10,20,0.95);backdrop-filter:blur(20px);border:1px solid rgba(0,255,224,0.3);border-radius:8px;padding:24px;min-width:360px;font-family:"Share Tech Mono",monospace;animation:menuFadeIn 0.2s ease;'
  menu.innerHTML = `
    <div style="font-size:14px;color:#00FFE0;letter-spacing:0.2em;margin-bottom:20px;text-align:center;">◆ PAUSED</div>
    <div style="display:flex;flex-direction:column;gap:8px;">
      <button id="esc-continue" style="padding:12px;background:rgba(0,255,224,0.1);border:1px solid rgba(0,255,224,0.4);color:#00FFE0;border-radius:4px;cursor:pointer;font-family:inherit;font-size:12px;letter-spacing:0.15em;transition:all 0.2s;">CONTINUAR</button>
      <button id="esc-save" style="padding:12px;background:rgba(180,255,80,0.1);border:1px solid rgba(180,255,80,0.3);color:#B4FF50;border-radius:4px;cursor:pointer;font-family:inherit;font-size:12px;letter-spacing:0.15em;transition:all 0.2s;">SAVE WORLD</button>
      <button id="esc-load" style="padding:12px;background:rgba(180,255,80,0.1);border:1px solid rgba(180,255,80,0.3);color:#B4FF50;border-radius:4px;cursor:pointer;font-family:inherit;font-size:12px;letter-spacing:0.15em;transition:all 0.2s;">LOAD WORLD</button>
      <button id="esc-settings" style="padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.5);border-radius:4px;cursor:pointer;font-family:inherit;font-size:12px;letter-spacing:0.15em;transition:all 0.2s;">SETTINGS (PRÓXIMAMENTE)</button>
      <button id="esc-reset" style="padding:12px;background:rgba(255,68,68,0.1);border:1px solid rgba(255,68,68,0.3);color:#FF4444;border-radius:4px;cursor:pointer;font-family:inherit;font-size:12px;letter-spacing:0.15em;transition:all 0.2s;">RESET</button>
    </div>
    <div style="font-size:8px;color:rgba(255,255,255,0.25);margin-top:16px;text-align:center;letter-spacing:0.1em;">[ESC] PARA CONTINUAR</div>
  `
  document.body.appendChild(menu)

  // Add blur to game canvas
  renderer.domElement.style.filter = 'blur(4px)'

  // Button handlers
  document.getElementById('esc-continue').addEventListener('click', hideEscapeMenu)
  document.getElementById('esc-save').addEventListener('click', () => { hideEscapeMenu(); showSaveModal('1') })
  document.getElementById('esc-load').addEventListener('click', () => { hideEscapeMenu(); /* Could open load modal */ showToast('USE HUD LOAD BUTTONS', '#00AAFF', 1500) })
  document.getElementById('esc-settings').addEventListener('click', () => showToast('SETTINGS COMING SOON', '#00AAFF', 1500))
  document.getElementById('esc-reset').addEventListener('click', () => { if (confirm('¿Resetear el juego?')) location.reload() })

  // Hover effects
  menu.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('mouseenter', () => { btn.style.background = btn.style.background.replace('0.1', '0.2').replace('0.05', '0.15') })
    btn.addEventListener('mouseleave', () => { btn.style.background = btn.style.background.replace('0.2', '0.1').replace('0.15', '0.05') })
  })
}

function hideEscapeMenu() {
  escapeMenuOpen = false
  gamePaused = false
  const menu = document.getElementById('escape-menu')
  if (menu) menu.remove()
  renderer.domElement.style.filter = ''
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTRUCTOR
// ═══════════════════════════════════════════════════════════════════════════
function toggleConstructorMode() {
  constructorMode=!constructorMode
  const toggleBtn=document.getElementById('construct-toggle'), modeBar=document.getElementById('constructor-mode-bar')
  const catalog=document.getElementById('ctor-panel-catalog'), gameEls=document.querySelectorAll('.game-hud-element')
  const antigravBtn=document.getElementById('antigrav-btn'), controlsBar=document.getElementById('controls-info-bar')
  const gravTanksHUD=document.getElementById('grav-tanks-hud'), btnOrbital=document.getElementById('btn-orbital'), btnSun=document.getElementById('btn-sun-anim'), btnGrav=document.getElementById('mode-indicator-btn')
  const driveToggle=document.getElementById('drive-toggle'), wasdWrapper=document.getElementById('wasd-wrapper'), saveWorldsPanel=document.getElementById('save-worlds-panel')

  toggleBtn.classList.toggle('active',constructorMode)
  toggleBtn.textContent=constructorMode?'✕ EXIT CONSTRUCT':'⚙ CONSTRUCT'
  modeBar.style.display=constructorMode?'block':'none'

  const zonesPanel=document.getElementById('ctor-panel-zones')
  if(constructorMode){
    catalog.classList.add('visible'); if(zonesPanel)zonesPanel.classList.add('visible'); orbit.enabled=true; orbit.target.copy(chassisPos); orbit.update()
    gameEls.forEach(el=>el.classList.add('ctor-faded'))
    if(antigravBtn)antigravBtn.classList.add('ctor-faded')
    if(gravTanksHUD)gravTanksHUD.style.opacity='0.15'
    if(btnOrbital)btnOrbital.style.opacity='0.15'
    if(btnSun)btnSun.style.opacity='0.15'
    if(btnGrav)btnGrav.style.opacity='0.15'
    if(driveToggle)driveToggle.style.opacity='0.15'
    if(wasdWrapper)wasdWrapper.style.opacity='0.15'
    if(saveWorldsPanel)saveWorldsPanel.style.opacity='0.15'
    if(controlsBar)controlsBar.style.display='none'
    for(const k in keys) keys[k]=false
    // Show zone visuals in constructor mode
    for (const [zoneId, mesh] of customZoneVisuals) mesh.visible = true
  } else {
    catalog.classList.remove('visible'); if(zonesPanel)zonesPanel.classList.remove('visible'); hideInspector(); deselectObject(); orbit.enabled=false
    gameEls.forEach(el=>el.classList.remove('ctor-faded'))
    if(antigravBtn)antigravBtn.classList.remove('ctor-faded')
    if(gravTanksHUD)gravTanksHUD.style.opacity='1'
    if(btnOrbital)btnOrbital.style.opacity='1'
    if(btnSun)btnSun.style.opacity='1'
    if(btnGrav)btnGrav.style.opacity='1'
    if(driveToggle)driveToggle.style.opacity='1'
    if(wasdWrapper)wasdWrapper.style.opacity='1'
    if(saveWorldsPanel)saveWorldsPanel.style.opacity='1'
    if(controlsBar)controlsBar.style.display='none'
    if(ghostObject){scene.remove(ghostObject);ghostObject=null}
    // Hide zone visuals outside constructor mode
    for (const [zoneId, mesh] of customZoneVisuals) mesh.visible = false
    // Cancel zone placement mode
    zonePlacementMode = false
    const addZoneBtn = document.getElementById('ctor-add-zone-btn')
    if (addZoneBtn) {
      addZoneBtn.style.background = 'rgba(0,255,224,0.1)'
      addZoneBtn.style.borderColor = 'rgba(0,255,224,0.4)'
      addZoneBtn.textContent = '+ ADD ZONE'
    }
  }
}

const ctorRaycaster = new THREE.Raycaster(), ctorMouse = new THREE.Vector2()
function ctorGetTerrainPoint(clientX,clientY){ctorMouse.x=(clientX/innerWidth)*2-1;ctorMouse.y=-(clientY/innerHeight)*2+1;ctorRaycaster.setFromCamera(ctorMouse,camera);const hits=ctorRaycaster.intersectObject(groundMesh,false);return hits.length>0?hits[0].point:null}
function raycastPlacedObjects(clientX,clientY){ctorMouse.x=(clientX/innerWidth)*2-1;ctorMouse.y=-(clientY/innerHeight)*2+1;ctorRaycaster.setFromCamera(ctorMouse,camera);const meshes=placedObjects.map(o=>o.group);const hits=ctorRaycaster.intersectObjects(meshes,true);if(hits.length===0)return null;let obj=hits[0].object;while(obj.parent&&!placedObjects.find(o=>o.group===obj))obj=obj.parent;return placedObjects.find(o=>o.group===obj)||null}

function autoScaleGLB(group){const box=new THREE.Box3().setFromObject(group);const size=new THREE.Vector3();box.getSize(size);const maxAxis=Math.max(size.x,size.y,size.z);if(maxAxis>0){const factor=2/maxAxis;group.scale.setScalar(factor);return factor}return 1}

function enterGhostMode(gltfScene,name){if(ghostObject){scene.remove(ghostObject);ghostObject=null}const group=new THREE.Group();group.add(gltfScene.clone());const baseScale=autoScaleGLB(group);group.traverse(c=>{if(c.isMesh){c.castShadow=false;c.material=c.material.clone();c.material.transparent=true;c.material.opacity=0.5;c.material.emissive=new THREE.Color(0x1a3300);c.material.needsUpdate=true}});scene.add(group);ghostObject=group;ghostObject._name=name;ghostObject._baseScale=baseScale}

const dracoLoader = new DRACOLoader(); dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')
const gltfLoader = new GLTFLoader(); gltfLoader.setDRACOLoader(dracoLoader)

function loadGLBFromFile(file){
  showLoadingMsg(`◌ CARGANDO ${file.name}…`); showProgress(0)
  gltfLoader.load(URL.createObjectURL(file),(gltf)=>{hideLoadingMsg();hideProgress();enterGhostMode(gltf.scene,file.name);ghostObject._source='uploaded'},(p)=>{if(p.total>0)showProgress(Math.round(p.loaded/p.total*100))},(err)=>{hideLoadingMsg();hideProgress();console.error('[CONSTRUCTOR] Error:',err)})
}

function loadGLBFromCatalog(item){
  showLoadingMsg(`◌ CARGANDO ${item.name}…`); showProgress(0)
  gltfLoader.load(item.path,(gltf)=>{hideLoadingMsg();hideProgress();enterGhostMode(gltf.scene,item.name);ghostObject._source='catalog'},(p)=>{if(p.total>0)showProgress(Math.round(p.loaded/p.total*100))},(err)=>{hideLoadingMsg();hideProgress();console.error('[CONSTRUCTOR] Error:',err)})
}

function placeGhostAtPoint(pt){
  if(!ghostObject||!pt)return
  const name=ghostObject._name, baseScale=ghostObject._baseScale
  const finalGroup=new THREE.Group()
  ghostObject.children.forEach(child=>{const clone=child.clone();clone.traverse(c=>{if(c.isMesh){c.castShadow=true;c.receiveShadow=true;c.material=c.material.clone();c.material.transparent=false;c.material.opacity=1;c.material.emissive=new THREE.Color(0x000000);c.material.needsUpdate=true}});finalGroup.add(clone)})
  finalGroup.scale.copy(ghostObject.scale); finalGroup.position.copy(pt); scene.add(finalGroup)
  const _ghostSource=ghostObject._source||'uploaded'
  scene.remove(ghostObject); ghostObject=null
  const entry={group:finalGroup,name,id:constructorIdCounter++,baseScale,physics:null,source:_ghostSource}
  placedObjects.push(entry); updateObjList(); selectObject(entry)
}

function selectObject(entry){selectedObject=entry;transformControls.attach(entry.group);showInspector(entry);document.querySelectorAll('.ctor-obj-item').forEach(el=>el.classList.toggle('selected',parseInt(el.dataset.id)===entry.id))}
function deselectObject(){selectedObject=null;transformControls.detach();hideInspector();document.querySelectorAll('.ctor-obj-item').forEach(el=>el.classList.remove('selected'))}
function deleteSelectedObject(){if(!selectedObject)return;removeGLBCollider(selectedObject);scene.remove(selectedObject.group);transformControls.detach();const idx=placedObjects.findIndex(o=>o.id===selectedObject.id);if(idx!==-1)placedObjects.splice(idx,1);selectedObject=null;hideInspector();updateObjList()}

function showInspector(entry){
  document.getElementById('ctor-panel-inspector').classList.add('visible')
  document.getElementById('ctor-inspector-title').textContent=`◎ ${entry.name.replace(/\.glb$/i,'').substring(0,18)}`
  const sc=entry.group.scale.x; document.getElementById('ctor-scale-slider').value=scaleToSlider(sc); document.getElementById('ctor-scale-val').textContent=sc.toFixed(2)+'x'
  const r2d=180/Math.PI; document.getElementById('ctor-rot-slider-x').value=((entry.group.rotation.x*r2d)%360+360)%360; document.getElementById('ctor-rot-slider-y').value=((entry.group.rotation.y*r2d)%360+360)%360; document.getElementById('ctor-rot-slider-z').value=((entry.group.rotation.z*r2d)%360+360)%360
  document.getElementById('ctor-elev-slider').value=entry.group.position.y; document.getElementById('ctor-elev-val').textContent=entry.group.position.y.toFixed(1)
  syncCollisionBtns(entry.physics?.mode||'none'); updateCollisionStatus(entry.physics?.mode||'none')
}
function hideInspector(){document.getElementById('ctor-panel-inspector').classList.remove('visible')}

function sliderToScale(v){return 0.01*Math.pow(100/0.01,v/100)}
function scaleToSlider(s){if(s<=0.01)return 0;return 100*Math.log(s/0.01)/Math.log(100/0.01)}

function updateObjList(){
  const listEl=document.getElementById('ctor-obj-list')
  if(placedObjects.length===0){listEl.innerHTML='<div style="color:rgba(255,255,255,0.2);font-size:9px;text-align:center;padding:8px;">ninguno aún</div>';return}
  listEl.innerHTML=''
  placedObjects.forEach(entry=>{
    const item=document.createElement('div'); item.className='ctor-obj-item'+(selectedObject?.id===entry.id?' selected':''); item.dataset.id=entry.id
    item.innerHTML=`<span>${entry.name.replace(/\.glb$/i,'').substring(0,16)}</span><button class="ctor-obj-item-del" data-id="${entry.id}">✕</button>`
    item.addEventListener('click',(e)=>{if(e.target.classList.contains('ctor-obj-item-del')){const delEntry=placedObjects.find(o=>o.id===parseInt(e.target.dataset.id));if(delEntry){if(selectedObject?.id===delEntry.id)deselectObject();removeGLBCollider(delEntry);scene.remove(delEntry.group);const idx=placedObjects.findIndex(o=>o.id===delEntry.id);if(idx!==-1)placedObjects.splice(idx,1);updateObjList()}}else selectObject(entry)})
    listEl.appendChild(item)
  })
}

function showLoadingMsg(msg){const el=document.getElementById('ctor-loading-msg');el.textContent=msg;el.classList.add('visible')}
function hideLoadingMsg(){document.getElementById('ctor-loading-msg').classList.remove('visible')}
function showProgress(pct){document.getElementById('ctor-progress').style.display='block';document.getElementById('ctor-progress-bar').style.width=pct+'%'}
function hideProgress(){document.getElementById('ctor-progress').style.display='none'}

function tickConstructor(){
  if(!selectedObject)return
  const pos=selectedObject.group.position, rot=selectedObject.group.rotation, r2d=180/Math.PI
  document.getElementById('ctor-pos-x').textContent=pos.x.toFixed(2); document.getElementById('ctor-pos-y').textContent=pos.y.toFixed(2); document.getElementById('ctor-pos-z').textContent=pos.z.toFixed(2)
  document.getElementById('ctor-rot-x').textContent=(rot.x*r2d).toFixed(1)+'°'; document.getElementById('ctor-rot-y').textContent=(rot.y*r2d).toFixed(1)+'°'; document.getElementById('ctor-rot-z').textContent=(rot.z*r2d).toFixed(1)+'°'
  const sc=selectedObject.group.scale.x; document.getElementById('ctor-scale-val').textContent=sc.toFixed(2)+'x'
  const scSlider=document.getElementById('ctor-scale-slider'); const currentSliderScale=sliderToScale(parseFloat(scSlider.value)); if(Math.abs(currentSliderScale-sc)>0.01)scSlider.value=scaleToSlider(sc)
  document.getElementById('ctor-rot-slider-x').value=((rot.x*r2d)%360+360)%360; document.getElementById('ctor-rot-slider-y').value=((rot.y*r2d)%360+360)%360; document.getElementById('ctor-rot-slider-z').value=((rot.z*r2d)%360+360)%360
  document.getElementById('ctor-rot-val-x').textContent=Math.round(document.getElementById('ctor-rot-slider-x').value)+'°'; document.getElementById('ctor-rot-val-y').textContent=Math.round(document.getElementById('ctor-rot-slider-y').value)+'°'; document.getElementById('ctor-rot-val-z').textContent=Math.round(document.getElementById('ctor-rot-slider-z').value)+'°'
  document.getElementById('ctor-elev-slider').value=pos.y; document.getElementById('ctor-elev-val').textContent=pos.y.toFixed(1)
}

function makeDraggable(panelId,headerId){
  const panel=document.getElementById(panelId), header=document.getElementById(headerId)
  if (!panel || !header) return
  header.style.cursor='grab'
  
  let isDragging=false, dragStartX=0, dragStartY=0
  
  header.addEventListener('mousedown',(e)=>{
    // Only prevent if we actually drag (move > 5px threshold)
    dragStartX=e.clientX
    dragStartY=e.clientY
    isDragging=false
    
    const rect=panel.getBoundingClientRect()
    
    // Clear any margins or transforms that might interfere
    panel.style.marginLeft='auto'
    panel.style.marginTop='auto'
    if(panel.style.transform){
      panel.style.transform=''
    }
    
    // Set absolute position based on current visual position
    panel.style.left=rect.left+'px'
    panel.style.top=rect.top+'px'
    panel.style.width=rect.width+'px'
    panel.style.height=rect.height+'px'
    panel.style.right='auto'
    panel.style.bottom='auto'
    
    const ox=e.clientX-parseInt(panel.style.left), oy=e.clientY-parseInt(panel.style.top)
    
    const move=(mv)=>{
      const dx=Math.abs(mv.clientX-dragStartX)
      const dy=Math.abs(mv.clientY-dragStartY)
      
      // Threshold of 5px to consider as drag
      if(dx>5||dy>5){
        isDragging=true
        header.style.cursor='grabbing'
      }
      
      if(isDragging){
        panel.style.left=(mv.clientX-ox)+'px'
        panel.style.top=(mv.clientY-oy)+'px'
      }
    }
    
    const up=()=>{
      header.style.cursor='grab'
      document.removeEventListener('mousemove',move)
      document.removeEventListener('mouseup',up)
    }
    
    document.addEventListener('mousemove',move)
    document.addEventListener('mouseup',up)
  })
}

// Attach a bottom-left resize handle to a panel.
// Keeps the RIGHT edge fixed while left edge + bottom grow.
// anchor: 'right' = panel anchored to right edge, resize drags bottom-left corner
//         'left'  = panel anchored to left edge, resize drags bottom-right corner
function attachResizeHandle(panel, resizeHandle, anchor = 'right') {
  if (!resizeHandle || resizeHandle._resizeAttached) return
  resizeHandle._resizeAttached = true
  let isResizing = false, startX, startY, startWidth, startHeight, startAnchorPx

  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true
    startX = e.clientX
    startY = e.clientY
    const rect = panel.getBoundingClientRect()
    startWidth = rect.width
    startHeight = rect.height
    if (anchor === 'right') {
      startAnchorPx = window.innerWidth - rect.right
      panel.style.right = startAnchorPx + 'px'
      panel.style.left = 'auto'
    } else {
      startAnchorPx = rect.left
      panel.style.left = startAnchorPx + 'px'
      panel.style.right = 'auto'
    }
    e.preventDefault()
    e.stopPropagation()
  })

  const onMove = (e) => {
    if (!isResizing) return
    const dx = e.clientX - startX
    const dy = e.clientY - startY
    let newWidth, newHeight
    if (anchor === 'right') {
      // bottom-left handle: drag left = wider, drag down = taller
      newWidth = Math.max(140, startWidth - dx)
    } else {
      // bottom-right handle: drag right = wider, drag down = taller
      newWidth = Math.max(140, startWidth + dx)
    }
    newHeight = Math.max(140, startHeight + dy)
    panel.style.width = newWidth + 'px'
    panel.style.height = newHeight + 'px'
  }

  const onUp = () => { isResizing = false }

  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}


// ═══════════════════════════════════════════════════════════════════════════
// GLB COLLISION
// ═══════════════════════════════════════════════════════════════════════════
function extractGLBMeshData(group){
  const allVertices=[], allIndices=[]; let vertexOffset=0; const worldMat=new THREE.Matrix4()
  group.traverse(child=>{if(!child.isMesh)return;const geo=child.geometry;if(!geo||!geo.attributes.position)return;child.updateWorldMatrix(true,false);worldMat.copy(child.matrixWorld);const posAttr=geo.attributes.position;const posArr=posAttr.array;const count=posAttr.count;for(let i=0;i<count;i++){const v=new THREE.Vector3(posArr[i*3],posArr[i*3+1],posArr[i*3+2]);v.applyMatrix4(worldMat);allVertices.push(v.x,v.y,v.z)}if(geo.index){const idxArr=geo.index.array;for(let i=0;i<idxArr.length;i++)allIndices.push(idxArr[i]+vertexOffset)}else{for(let i=0;i<count;i++)allIndices.push(i+vertexOffset)};vertexOffset+=count})
  return{vertices:new Float32Array(allVertices),indices:new Uint32Array(allIndices)}
}

function removeGLBCollider(entry){if(!entry.physics)return;const{body,collider}=entry.physics;try{physicsWorld.removeCollider(collider,false)}catch(e){}try{physicsWorld.removeRigidBody(body)}catch(e){}entry.physics=null}

function createGLBCollider(entry,mode){
  removeGLBCollider(entry); const group=entry.group; group.updateWorldMatrix(true,true)
  let desc=null; const{vertices,indices}=extractGLBMeshData(group)
  if(vertices.length<3)return
  try{
    if(mode==='trimesh'){if(indices.length<3)return;desc=RAPIER.ColliderDesc.trimesh(vertices,indices)}
    else if(mode==='convexHull'){desc=RAPIER.ColliderDesc.convexHull(vertices);if(!desc)return}
    else return
    desc.setFriction(0.8).setRestitution(0.05)
    const body=physicsWorld.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0,0,0))
    const collider=physicsWorld.createCollider(desc,body)
    entry.physics={body,collider,mode}; updateCollisionStatus(mode)
  }catch(err){console.error('[GLB Collision] Error:',err);updateCollisionStatus('error')}
}

function updateCollisionStatus(mode){const el=document.getElementById('ctor-col-status');if(!el)return;if(mode==='trimesh'){el.textContent='✓ TriMesh activo';el.style.color='rgba(184,255,74,0.7)'}else if(mode==='convexHull'){el.textContent='✓ ConvexHull activo';el.style.color='rgba(0,245,212,0.7)'}else if(mode==='error'){el.textContent='⚠ Error';el.style.color='rgba(255,80,80,0.7)'}else{el.textContent='sin colisión';el.style.color='rgba(0,245,212,0.35)'}}
function syncCollisionBtns(mode){const noneBtn=document.getElementById('ctor-col-none'),convexBtn=document.getElementById('ctor-col-convex'),trimeshBtn=document.getElementById('ctor-col-trimesh');if(!noneBtn)return;noneBtn.classList.toggle('active',!mode||mode==='none');convexBtn.classList.toggle('active',mode==='convexHull');trimeshBtn.classList.toggle('active',mode==='trimesh')}

// ═══════════════════════════════════════════════════════════════════════════
// VEHICLE SWAP
// ═══════════════════════════════════════════════════════════════════════════
const VEHICLE_SKINS = [null, 'vehicle_terrain.glb']
async function swapVehicleSkin(idx){
  if(idx===currentVehicleSkinIdx)return
  const path=VEHICLE_SKINS[idx]; let newVisual
  if(!path){newVisual=createFallbackChassis();newVisual.rotation.y=Math.PI/2;newVisual.scale.setScalar(3.3)}
  else{try{const gltf=await new Promise((res,rej)=>gltfLoader.load(path,res,null,rej));newVisual=gltf.scene;const box3=new THREE.Box3().setFromObject(newVisual);const size=new THREE.Vector3();box3.getSize(size);const targetWidth=CHASSIS_HW*2*3.3;const fitScale=targetWidth/Math.max(size.x,0.01);newVisual.scale.setScalar(fitScale)}catch(e){showToast('NO SE PUDO CARGAR VEHÍCULO','#FF4444',1500);return}}
  newVisual.traverse(c=>{if(c.isMesh){c.castShadow=true;c.receiveShadow=true}})
  if(_currentChassisVisual&&_currentChassisVisual.parent===chassisGroup)chassisGroup.remove(_currentChassisVisual)
  chassisGroup.add(newVisual); _currentChassisVisual=newVisual; currentVehicleSkinIdx=idx
  showToast('VEHICLE: '+(idx===0?'ANT':'TERRAIN'),'#B4FF50',1500)
}

// ═══════════════════════════════════════════════════════════════════════════
// PARTICLES UPDATE
// ═══════════════════════════════════════════════════════════════════════════
const _dustMat4=new THREE.Matrix4(), _dustScale=new THREE.Vector3(), _dustPos=new THREE.Vector3()

function emitDust(wx,wy,wz,vx,vy,vz,count){
  const c=count*3
  for(let n=0;n<c;n++){const i=dustIndex%DUST_COUNT;dustIndex++;const d=dustData[i];d.x=wx+(Math.random()-0.5)*dustSettings.spread;d.y=wy-WHEEL_R*0.8+Math.random()*0.1;d.z=wz+(Math.random()-0.5)*dustSettings.spread;d.vx=vx*0.15+(Math.random()-0.5)*dustSettings.velocitySpread*0.5;d.vy=Math.random()*dustSettings.upwardForce*0.5+0.25;d.vz=vz*0.15+(Math.random()-0.5)*dustSettings.velocitySpread*0.5;d.maxLife=dustSettings.lifetime+Math.random()*dustSettings.lifetimeVariance;d.life=d.maxLife;d.size=0.15+Math.random()*0.25;d.opacity=dustSettings.opacity*(0.7+Math.random()*0.3)}
}

function updateDustParticles(dt){
  const dustIMesh=window._dustIMesh, dustColors=window._dustColors, dustQuadGeo=window._dustQuadGeo
  if(!dustIMesh)return
  for(let i=0;i<DUST_COUNT;i++){
    const d=dustData[i]
    if(d.life<=0){_dustMat4.makeScale(0,0,0);dustIMesh.setMatrixAt(i,_dustMat4);dustColors[i*3]=0;dustColors[i*3+1]=0;dustColors[i*3+2]=0;continue}
    d.life-=dt;d.x+=d.vx*dt;d.y+=d.vy*dt;d.z+=d.vz*dt;d.vx*=dustSettings.drag;d.vy*=(dustSettings.drag-0.01);d.vz*=dustSettings.drag
    const t=Math.max(0,d.life/d.maxLife); const smoothT=t*t*(3-2*t); const grow=d.size*(1+(1-t)*1.5)*smoothT
    const colorT=1-t; dustColors[i*3]=dustSettings.colorR+(dustSettings.colorR2-dustSettings.colorR)*colorT; dustColors[i*3+1]=dustSettings.colorG+(dustSettings.colorG2-dustSettings.colorG)*colorT; dustColors[i*3+2]=dustSettings.colorB+(dustSettings.colorB2-dustSettings.colorB)*colorT
    _dustPos.set(d.x,d.y,d.z);_dustScale.set(grow,grow,grow);_dustMat4.compose(_dustPos,camera.quaternion,_dustScale);dustIMesh.setMatrixAt(i,_dustMat4)
  }
  dustIMesh.instanceMatrix.needsUpdate=true;dustIMesh.instanceColor.needsUpdate=true
}

function emitSplash(wx,wy,wz,vx,vy,vz,count){
  for(let n=0;n<count;n++){const i=splashIndex%SPLASH_COUNT;splashIndex++;const d=splashData[i];d.x=wx+(Math.random()-0.5)*splashSettings.spread;d.y=wy+Math.random()*0.15;d.z=wz+(Math.random()-0.5)*splashSettings.spread;const angle=Math.random()*Math.PI*2;const outSpeed=splashSettings.velocitySpread*(0.5+Math.random()*0.5);d.vx=vx*0.1+Math.cos(angle)*outSpeed;d.vy=splashSettings.upwardForce*(0.5+Math.random()*0.5);d.vz=vz*0.1+Math.sin(angle)*outSpeed;d.gravity=6+Math.random()*4;d.maxLife=splashSettings.lifetime+Math.random()*splashSettings.lifetimeVariance;d.life=d.maxLife;d.size=0.08+Math.random()*0.15;d.opacity=splashSettings.opacity*(0.6+Math.random()*0.4)}
}

function updateSplashParticles(dt){
  const splashIMesh=window._splashIMesh, splashColors=window._splashColors
  if(!splashIMesh)return
  for(let i=0;i<SPLASH_COUNT;i++){
    const d=splashData[i]
    if(d.life<=0){_dustMat4.makeScale(0,0,0);splashIMesh.setMatrixAt(i,_dustMat4);splashColors[i*3]=0;splashColors[i*3+1]=0;splashColors[i*3+2]=0;continue}
    d.life-=dt;d.x+=d.vx*dt;d.vy-=d.gravity*dt;d.y+=d.vy*dt;d.z+=d.vz*dt;d.vx*=splashSettings.drag;d.vz*=splashSettings.drag
    const t=Math.max(0,d.life/d.maxLife);const smoothT=t*t*(3-2*t);const grow=d.size*(1+(1-t)*0.8)*smoothT
    const white=0.3*(1-t);splashColors[i*3]=Math.min(1,splashSettings.colorR+white);splashColors[i*3+1]=Math.min(1,splashSettings.colorG+white);splashColors[i*3+2]=Math.min(1,splashSettings.colorB+white*0.5)
    _dustPos.set(d.x,d.y,d.z);_dustScale.set(grow,grow,grow);_dustMat4.compose(_dustPos,camera.quaternion,_dustScale);splashIMesh.setMatrixAt(i,_dustMat4)
  }
  splashIMesh.instanceMatrix.needsUpdate=true;splashIMesh.instanceColor.needsUpdate=true
}

function spawnWindDust(cx,cy,cz){
  const i=windDustIndex%WIND_DUST_COUNT;windDustIndex++;const d=windDustData[i];const angle=Math.random()*Math.PI*2;const dist=Math.random()*windSettings.spawnRadius
  d.x=cx+Math.cos(angle)*dist;d.z=cz+Math.sin(angle)*dist;d.y=cy+0.5+Math.random()*windSettings.spawnHeight
  d.vx=windSettings.dirX*(0.6+Math.random()*0.4);d.vy=(Math.random()-0.4)*0.5;d.vz=windSettings.dirZ*(0.6+Math.random()*0.4)
  d.maxLife=windSettings.lifetime+Math.random()*windSettings.lifetimeVariance;d.life=d.maxLife;d.size=windSettings.particleSize+Math.random()*windSettings.sizeVariance;d.opacity=windSettings.opacity*(0.3+Math.random()*0.7)
}

function updateWindDust(dt,cx,cy,cz){
  const windDustIMesh=window._windDustIMesh, windDustColors=window._windDustColors
  if(!windDustIMesh)return
  windTime+=dt;const gustX=Math.sin(windTime*0.7)*windSettings.gustStrength;const gustZ=Math.cos(windTime*0.5)*windSettings.gustStrength*0.6
  for(let i=0;i<WIND_DUST_COUNT;i++){
    const d=windDustData[i]
    if(d.life<=0){_dustMat4.makeScale(0,0,0);windDustIMesh.setMatrixAt(i,_dustMat4);windDustColors[i*3]=0;windDustColors[i*3+1]=0;windDustColors[i*3+2]=0;continue}
    d.life-=dt;const turbX=Math.sin(windTime*3.1+d.wobblePhase)*windSettings.turbulence;const turbZ=Math.cos(windTime*2.7+d.wobblePhase*1.3)*windSettings.turbulence*0.8;const wobble=Math.sin(windTime*d.wobbleSpeed+d.wobblePhase)*d.wobbleAmp
    d.vx+=(gustX+turbX)*dt;d.vy+=wobble*dt*0.5;d.vz+=(gustZ+turbZ)*dt;d.vx*=windSettings.drag;d.vy*=windSettings.drag;d.vz*=windSettings.drag
    d.x+=d.vx*dt;d.y+=d.vy*dt;d.z+=d.vz*dt
    if(d.y<biomeSettings.waterLevel+0.3)d.y=biomeSettings.waterLevel+0.3+Math.random()*0.5
    const t=Math.max(0,d.life/d.maxLife);const fadeIn=Math.min(1,(d.maxLife-d.life)*3);const fadeOut=t<0.3?t/0.3:1;const alpha=fadeIn*fadeOut*windSettings.opacity;const s=(d.size*0.08)*alpha
    const distFromCam=Math.sqrt((d.x-cx)**2+(d.z-cz)**2);const distFade=Math.max(0,1-distFromCam/(windSettings.spawnRadius*1.2))
    windDustColors[i*3]=windSettings.colorR;windDustColors[i*3+1]=windSettings.colorG;windDustColors[i*3+2]=windSettings.colorB
    _dustPos.set(d.x,d.y,d.z);const scaleMult=windSettings.particleSize/1.5;_dustScale.set(s*distFade*scaleMult,s*distFade*scaleMult,s*distFade*scaleMult);_dustMat4.compose(_dustPos,camera.quaternion,_dustScale);windDustIMesh.setMatrixAt(i,_dustMat4)
  }
  windDustIMesh.instanceMatrix.needsUpdate=true;windDustIMesh.instanceColor.needsUpdate=true
}

// ═══════════════════════════════════════════════════════════════════════════
// TELEMETRY
// ═══════════════════════════════════════════════════════════════════════════
function updateTelemetry(){
  _telTime+=FIXED_DT
  const cV=chassisBody.linvel();const spd=Math.sqrt(cV.x*cV.x+cV.y*cV.y+cV.z*cV.z)
  const cr=chassisBody.rotation();const hdg=((Math.atan2(2*(cr.w*cr.y+cr.x*cr.z),1-2*(cr.y*cr.y+cr.z*cr.z))*180/Math.PI)+360)%360
  const tilt=Math.asin(Math.max(-1,Math.min(1,2*(cr.w*cr.x-cr.z*cr.y))))*180/Math.PI
  if(_telPrevPos){const dx=chassisPos.x-_telPrevPos.x;const dz=chassisPos.z-_telPrevPos.z;_telDist+=Math.sqrt(dx*dx+dz*dz)}
  _telPrevPos={x:chassisPos.x,z:chassisPos.z}
  const avgSpd=_telTime>0?_telDist/_telTime:0
  const hudSpeed=document.getElementById('hud-speed');if(hudSpeed)hudSpeed.textContent=spd.toFixed(3)+' m/s'
  const hudTurn=document.getElementById('hud-turn');if(hudTurn)hudTurn.textContent=(vehicle.currentSteering?.(0)??0).toFixed(1)+'%'
  const hudHdg=document.getElementById('hud-hdg');if(hudHdg)hudHdg.textContent=hdg.toFixed(1)+'°'
  const hudTilt=document.getElementById('hud-tilt');if(hudTilt)hudTilt.textContent=tilt.toFixed(1)+'°'
  const hudTerrain=document.getElementById('hud-terrain');if(hudTerrain){hudTerrain.textContent=spd>0.5?'MOVING':'CLEAR';hudTerrain.style.color=spd>2?'#ffaa00':'#00FFE0'}
  const hudDist=document.getElementById('hud-dist');if(hudDist)hudDist.textContent=_telDist.toFixed(2)+'m'
  const hudTime=document.getElementById('hud-time');if(hudTime)hudTime.textContent=_telTime.toFixed(1)+'s'
  const hudAvg=document.getElementById('hud-avg');if(hudAvg)hudAvg.textContent=avgSpd.toFixed(3)+' m/s'
  const hudGait=document.getElementById('hud-gait');if(hudGait)hudGait.textContent=keys.ShiftLeft||keys.ShiftRight?'BOOST':spd>0.1?'DRIVE':'IDLE'
  const hudPos=document.getElementById('hud-pos');if(hudPos)hudPos.textContent=`${chassisPos.x.toFixed(0)} / ${chassisPos.y.toFixed(1)} / ${chassisPos.z.toFixed(0)}`
  const elapsed=Math.floor((Date.now()-sessionStartTime)/1000);const mm=String(Math.floor(elapsed/60)).padStart(2,'0');const ss=String(elapsed%60).padStart(2,'0')
  const hudSession=document.getElementById('hud-session');if(hudSession)hudSession.textContent=`${mm}:${ss}`
  
  // Update right-side telemetry values color based on drive mode
  updateTelemetryRightValueColor()
}

// Set right-side telemetry values color per drive mode
function updateTelemetryRightValueColor() {
  const modeColors={gravity:'#00FFE0',magnetic:'#00AAFF',hook:'#FF4444',float:'#B4FF50'}
  const color=modeColors[vehicleMode]||'#00FFE0'
  const rightValues=['hud-speed','hud-turn','hud-hdg','hud-tilt','hud-dist','hud-time','hud-avg','hud-gait','hud-pos','hud-session']
  rightValues.forEach(id=>{const el=document.getElementById(id);if(el)el.style.color=color})
}

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOM ZONES — full implementation
// ═══════════════════════════════════════════════════════════════════════════
function clearAllCustomZones() {
  for (const [zoneId, mesh] of customZoneVisuals) {
    scene.remove(mesh)
    mesh.geometry?.dispose()
    if (mesh.material) {
      if (Array.isArray(mesh.material)) mesh.material.forEach(m => m.dispose())
      else mesh.material.dispose()
    }
  }
  customZoneVisuals.clear()
  for (const [zoneId, physics] of customZoneColliders) {
    if (!physics) continue
    try { physicsWorld.removeCollider(physics.collider, false) } catch(e) {}
    try { physicsWorld.removeRigidBody(physics.body) } catch(e) {}
  }
  customZoneColliders.clear()
  customZones = []
  activeCustomZones.clear()
  zoneCaptureState.clear()
  updateZoneCaptureHUD(null, 0)
  updateZoneList()
}

function updateZoneList() {
  const list = document.getElementById('ctor-zone-list')
  if (!list) return
  if (customZones.length === 0) {
    list.innerHTML = '<div style="color:rgba(255,255,255,0.2);font-size:9px;text-align:center;padding:8px;">ninguna aún</div>'
    return
  }
  list.innerHTML = ''
  customZones.forEach(zone => {
    const item = document.createElement('div')
    item.style.cssText = 'display:flex;flex-direction:column;gap:4px;padding:6px 8px;border:1px solid rgba(0,255,224,0.12);border-radius:4px;background:rgba(0,255,224,0.03);'

    const hasCam = !!zone.cameraPOV
    item.innerHTML = `
      <div style="display:flex;align-items:center;gap:6px;">
        <!-- color dot / picker -->
        <input type="color" value="${zone.color}" class="zone-color-edit" data-zoneid="${zone.zoneId}"
          style="width:14px;height:14px;border:none;padding:0;border-radius:50%;cursor:pointer;background:none;flex-shrink:0;" />
        <!-- editable name — click to fly if POV saved -->
        <span contenteditable="true" class="zone-name-edit" data-zoneid="${zone.zoneId}"
          style="flex:1;font-size:9px;color:${hasCam ? '#00FFE0' : 'rgba(255,255,255,0.8)'};outline:none;border-bottom:1px solid transparent;cursor:${hasCam ? 'pointer' : 'text'};white-space:nowrap;overflow:hidden;text-decoration:${hasCam ? 'underline dotted rgba(0,255,224,0.4)' : 'none'};"
          title="${hasCam ? 'Click para volar · edita el nombre' : 'Click para editar nombre'}">${zone.name}</span>
        <!-- shape/size label -->
        <span style="font-size:8px;color:rgba(255,255,255,0.2);flex-shrink:0;">${zone.shape}·${zone.scale}</span>
        <!-- cam button — always remaps POV -->
        <button class="zone-cam-btn" data-zoneid="${zone.zoneId}" title="${hasCam ? 'Sobrescribir POV de cámara' : 'Guardar POV de cámara aquí'}"
          style="background:${hasCam ? 'rgba(0,255,224,0.1)' : 'none'};border:1px solid ${hasCam ? '#00FFE0' : 'rgba(255,255,255,0.15)'};color:${hasCam ? '#00FFE0' : 'rgba(255,255,255,0.3)'};border-radius:3px;cursor:pointer;font-size:10px;padding:1px 5px;flex-shrink:0;line-height:1.4;">◎</button>
        <!-- delete -->
        <button class="zone-del-btn" data-zoneid="${zone.zoneId}"
          style="background:none;border:none;color:rgba(255,80,80,0.5);cursor:pointer;font-size:12px;padding:0 2px;line-height:1;flex-shrink:0;">✕</button>
      </div>
      ${hasCam ? `<div style="font-size:8px;color:rgba(0,255,224,0.3);padding-left:20px;">↗ volar · ◎ para sobrescribir POV</div>` : `<div style="font-size:8px;color:rgba(255,255,255,0.15);padding-left:20px;">◎ para guardar cámara</div>`}
    `

    // Editable name — save on blur/enter
    const nameEl = item.querySelector('.zone-name-edit')
    nameEl.addEventListener('focus', () => nameEl.style.borderBottomColor = 'rgba(0,255,224,0.4)')
    nameEl.addEventListener('blur', () => {
      nameEl.style.borderBottomColor = 'transparent'
      zone.name = nameEl.textContent.trim() || zone.name
    })
    nameEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); nameEl.blur() } })

    // Color edit
    item.querySelector('.zone-color-edit').addEventListener('input', (e) => {
      zone.color = e.target.value
      const mesh = customZoneVisuals.get(zone.zoneId)
      if (mesh) mesh.material.color.set(zone.color)
    })

    // Camera POV button — always remaps to current camera position
    item.querySelector('.zone-cam-btn').addEventListener('click', (e) => {
      e.stopPropagation()
      zone.cameraPOV = {
        px: camera.position.x, py: camera.position.y, pz: camera.position.z,
        tx: chassisPos.x, ty: chassisPos.y + 2, tz: chassisPos.z
      }
      showToast(`◎ POV MAPEADO · ${zone.name}`, zone.color, 1500)
      updateZoneList()
    })

    // Zone name: single click → fly (if POV); double click → edit
    const nameEl2 = item.querySelector('.zone-name-edit')
    let nameSingleClickTimer = null
    nameEl2.addEventListener('click', (e) => {
      if (!zone.cameraPOV) return
      clearTimeout(nameSingleClickTimer)
      nameSingleClickTimer = setTimeout(() => {
        flyToZonePOV(zone)
      }, 220)
    })
    nameEl2.addEventListener('dblclick', (e) => {
      clearTimeout(nameSingleClickTimer)
      // Let contenteditable handle it naturally
    })

    // Delete
    item.querySelector('.zone-del-btn').addEventListener('click', (e) => {
      e.stopPropagation()
      const zid = e.target.dataset.zoneid
      const mesh = customZoneVisuals.get(zid)
      if (mesh) { scene.remove(mesh); mesh.geometry?.dispose(); mesh.material?.dispose() }
      customZoneVisuals.delete(zid)
      const physics = customZoneColliders.get(zid)
      if (physics) {
        try { physicsWorld.removeCollider(physics.collider, false) } catch(e2) {}
        try { physicsWorld.removeRigidBody(physics.body) } catch(e2) {}
      }
      customZoneColliders.delete(zid)
      customZones.splice(customZones.findIndex(z => z.zoneId === zid), 1)
      zoneCaptureState.delete(zid)
      updateZoneList()
    })

    list.appendChild(item)
  })
}

function flyToZonePOV(zone) {
  if (!zone.cameraPOV) return
  const pov = zone.cameraPOV
  // Smooth camera fly using lerp over ~2 seconds
  const startPos = camera.position.clone()
  const endPos = new THREE.Vector3(pov.px, pov.py, pov.pz)
  const target = new THREE.Vector3(pov.tx, pov.ty, pov.tz)
  let t = 0
  const dur = 2.0
  const prevOrbit = carSettings.orbitControls
  carSettings.orbitControls = true
  orbit.enabled = true
  showToast(`◎ ${zone.name}`, zone.color, 2000)
  const flyTick = (dt) => {
    t += dt / dur
    if (t >= 1) {
      camera.position.copy(endPos)
      orbit.target.copy(target)
      orbit.update()
      if (!prevOrbit) { carSettings.orbitControls = false; orbit.enabled = false }
      return
    }
    const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t
    camera.position.lerpVectors(startPos, endPos, ease)
    orbit.target.copy(target)
    orbit.update()
    requestAnimationFrame(() => flyTick(1/60))
  }
  flyTick(0)
}

function spawnZoneGhost(point) {
  removeZoneGhost()
  const size = ZONE_SIZES[zonePlacementSize]
  const r = size.radius
  const h = size.height
  const tubeR = Math.max(Math.min(r * 0.06, 2.5), 0.4)

  let geometry
  switch (zonePlacementType) {
    case 'ring-h':
      geometry = new THREE.TorusGeometry(r, tubeR, 12, 48)
      break
    case 'ring-v':
      geometry = new THREE.TorusGeometry(r, tubeR, 12, 48)
      break
    case 'sphere':
      geometry = new THREE.SphereGeometry(r, 18, 18)
      break
    case 'cylinder':
      geometry = new THREE.CylinderGeometry(r, r, h, 24, 1, true)
      break
    case 'box':
      geometry = new THREE.BoxGeometry(r * 2, h, r * 2)
      break
    default:
      geometry = new THREE.BoxGeometry(r * 2, h, r * 2)
  }

  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color(zonePlacementColor),
    wireframe: zonePlacementType === 'box' || zonePlacementType === 'sphere',
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    side: THREE.DoubleSide
  })

  zoneGhostMesh = new THREE.Mesh(geometry, material)
  if (zonePlacementType === 'ring-h') zoneGhostMesh.rotation.x = Math.PI / 2

  const posY = point.y + zonePlacementOffsetY + (zonePlacementType === 'ring-h' ? tubeR : h / 2)
  zoneGhostMesh.position.set(point.x, posY, point.z)
  zoneGhostMesh.userData.isGhost = true
  scene.add(zoneGhostMesh)
}

function removeZoneGhost() {
  if (!zoneGhostMesh) return
  scene.remove(zoneGhostMesh)
  zoneGhostMesh.geometry?.dispose()
  zoneGhostMesh.material?.dispose()
  zoneGhostMesh = null
}

function placeZoneAtPoint(point) {
  const size = ZONE_SIZES[zonePlacementSize]
  const nameInput = document.getElementById('zone-name-input')
  const defaultName = `Zone ${customZones.length + 1}`
  const name = (nameInput?.value?.trim()) || defaultName
  // Auto-increment name for next zone
  if (nameInput) nameInput.value = `Zone ${customZones.length + 2}`
  const zone = {
    zoneId: `zone_${Date.now()}`,
    name,
    type: 'trigger',
    shape: zonePlacementType,
    dimensions: { x: size.radius * 2, y: size.height, z: size.radius * 2 },
    position: { x: point.x, y: point.y + zonePlacementOffsetY, z: point.z },
    color: zonePlacementColor,
    scale: zonePlacementSize,
    events: {}
  }
  customZones.push(zone)
  createZoneVisual(zone)
  createZoneCollider(zone)
  zoneCaptureState.set(zone.zoneId, { timeInZone: 0, captured: false })
  updateZoneList()
  showToast(`ZONA: ${zone.name}`, zone.color, 1500)
}

function createZoneVisual(zone) {
  let geometry
  const { x, y, z } = zone.dimensions
  const r = Math.max(x / 2, 3)
  const tubeR = Math.max(Math.min(r * 0.06, 2.5), 0.4)
  switch(zone.shape) {
    case 'ring-h':
      // Horizontal torus — lies flat on terrain
      geometry = new THREE.TorusGeometry(r, tubeR, 12, 48)
      break
    case 'ring-v':
      // Vertical torus — stands upright like a portal
      geometry = new THREE.TorusGeometry(r, tubeR, 12, 48)
      break
    case 'sphere':
      geometry = new THREE.SphereGeometry(r, 18, 18)
      break
    case 'cylinder':
      geometry = new THREE.CylinderGeometry(r, r, y, 24, 1, true)
      break
    case 'box':
      geometry = new THREE.BoxGeometry(x, y, z)
      break
    default:
      geometry = new THREE.BoxGeometry(x, y, z)
  }

  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color(zone.color),
    wireframe: zone.shape === 'box' || zone.shape === 'sphere',
    transparent: true,
    opacity: zone.shape === 'ring-h' || zone.shape === 'ring-v' ? 0.7 : 0.2,
    depthWrite: false,
    side: THREE.DoubleSide
  })

  const mesh = new THREE.Mesh(geometry, material)

  // ring-h: rotate torus to lie flat; ring-v: stands upright by default
  if (zone.shape === 'ring-h') mesh.rotation.x = Math.PI / 2
  // ring-v stays default (vertical plane)

  mesh.position.set(zone.position.x, zone.position.y + (zone.shape === 'ring-h' ? tubeR : y / 2), zone.position.z)
  mesh.userData.zoneId = zone.zoneId
  mesh.visible = constructorMode
  scene.add(mesh)
  customZoneVisuals.set(zone.zoneId, mesh)
}

function createZoneCollider(zone) {
  // Zones are purely visual + JS-based proximity detection — no Rapier collider
  // This avoids the vehicle bouncing/flying when entering a zone
  customZoneColliders.set(zone.zoneId, null)
}

// Zone detection — check if point is inside zone volume
function isPointInZone(point, zone) {
  const dx = Math.abs(point.x - zone.position.x)
  const dy = Math.abs(point.y - (zone.position.y + zone.dimensions.y / 2))
  const dz = Math.abs(point.z - zone.position.z)
  
  switch(zone.shape) {
    case 'box':
      return dx < zone.dimensions.x / 2 && dy < zone.dimensions.y / 2 && dz < zone.dimensions.z / 2
    case 'sphere':
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz)
      return dist < zone.dimensions.x / 2
    case 'cylinder':
      const distXZ = Math.sqrt(dx*dx + dz*dz)
      return distXZ < zone.dimensions.x / 2 && dy < zone.dimensions.y / 2
    case 'ring':
      // Torus detection — point must be within tube radius of the major circle
      const distXZ_ring = Math.sqrt(dx*dx + dz*dz)
      const majorRadius = Math.max(zone.dimensions.x / 2.5, 5)
      const tubeRadius = Math.max(zone.dimensions.y / 4, 2)
      const distToMajor = Math.abs(distXZ_ring - majorRadius)
      return distToMajor < tubeRadius && dy < tubeRadius + 1
    default:
      return false
  }
}

// Check all custom zones for enter/exit events + conquest timer
function checkCustomZoneCollisions() {
  if (constructorMode) return

  const pos = chassisBody.translation()
  const point = { x: pos.x, y: pos.y, z: pos.z }

  for (const zone of customZones) {
    const inZone = isPointInZone(point, zone)
    const wasActive = activeCustomZones.has(zone.zoneId)

    // Init capture state if missing (e.g. loaded from save)
    if (!zoneCaptureState.has(zone.zoneId)) {
      zoneCaptureState.set(zone.zoneId, { timeInZone: 0, captured: false })
    }
    const capture = zoneCaptureState.get(zone.zoneId)

    if (inZone && !wasActive) {
      activeCustomZones.add(zone.zoneId)
      onCustomZoneEnter(zone)
    } else if (!inZone && wasActive) {
      activeCustomZones.delete(zone.zoneId)
      capture.timeInZone = 0
      updateZoneCaptureHUD(null, 0)
      onCustomZoneExit(zone)
    }

    // Conquest timer — accumulate time inside zone
    if (inZone && !capture.captured) {
      capture.timeInZone += FIXED_DT
      const pct = Math.min(1, capture.timeInZone / ZONE_CAPTURE_TIME)
      updateZoneCaptureHUD(zone, pct)

      if (capture.timeInZone >= ZONE_CAPTURE_TIME) {
        capture.captured = true
        updateZoneCaptureHUD(null, 0)
        onZoneCaptured(zone)
      }
    }
  }
}

// Called when a zone is fully conquered (5s inside)
function onZoneCaptured(zone) {
  showToast(`⬡ ZONA CONQUISTADA: ${zone.name}`, zone.color, 3000)
  // Auto fly-to POV if saved
  if (zone.cameraPOV) {
    setTimeout(() => flyToZonePOV(zone), 800)
  }
  // Fire capture events if defined
  const evt = zone.events?.onCapture
  if (!evt) return
  if (evt.fogColor) transitionFogTo(evt.fogColor, evt.fogDuration || 2000)
  if (evt.modalId) spawnModal(evt.modalId)
  if (evt.unlockButton) unlockButton(evt.unlockButton)
  if (evt.cameraPreset) animateCameraTo(evt.cameraPreset.position, evt.cameraPreset.target, evt.cameraPreset.duration || 2000)
}

// Update the zone capture HUD bar (zone-capture-hud element)
function updateZoneCaptureHUD(zone, pct) {
  const hud = document.getElementById('zone-capture-hud')
  const bar = document.getElementById('zone-capture-bar')
  const label = document.getElementById('zone-capture-label')
  if (!hud) return
  if (!zone || pct <= 0) {
    hud.style.display = 'none'
    return
  }
  hud.style.display = 'block'
  hud.style.borderColor = zone.color + '88'
  if (label) label.textContent = zone.name
  if (bar) { bar.style.width = (pct * 100) + '%'; bar.style.background = zone.color }
}

// Configure zone capture event (fog color transition)
function editZoneEventFog(zone) {
  const currentFogColor = zone.events?.onCapture?.fogColor || '#000000'
  const colorInput = prompt(`Fog color para zone "${zone.name}":\n(hex format, e.g. #FF6B35)`, currentFogColor)
  
  if (colorInput) {
    if (!zone.events) zone.events = {}
    if (!zone.events.onCapture) zone.events.onCapture = {}
    zone.events.onCapture.fogColor = colorInput
    zone.events.onCapture.fogDuration = 2000  // Default 2s transition
    showToast(`FOG EVENT SET: ${colorInput}`, zone.color, 1500)
  }
}

// Called when vehicle enters a zone
function onCustomZoneEnter(zone) {
  console.log(`[Zone] ENTER: ${zone.name} (${zone.zoneId})`)
  showToast(`ENTERING: ${zone.name}`, zone.color, 2000)
  
  const evt = zone.events?.onEnter
  if (!evt) return
  
  // Fog transition
  if (evt.fogColor) {
    transitionFogTo(evt.fogColor, evt.fogDuration || 2000)
  }
  
  // Sky color transition
  if (evt.skyColor) {
    scene.background.set(evt.skyColor)
  }
  
  // Modal spawn
  if (evt.modalId) {
    spawnModal(evt.modalId)
  }
  
  // Button unlock
  if (evt.unlockButton) {
    unlockButton(evt.unlockButton)
  }
  
  // Camera preset
  if (evt.cameraPreset) {
    animateCameraTo(evt.cameraPreset.position, evt.cameraPreset.target, evt.cameraPreset.duration || 2000)
  }
}

// Called when vehicle exits a zone
function onCustomZoneExit(zone) {
  console.log(`[Zone] EXIT: ${zone.name} (${zone.zoneId})`)
  
  const evt = zone.events?.onExit
  if (!evt) return
  
  // Fog transition on exit
  if (evt.fogColor) {
    transitionFogTo(evt.fogColor, evt.fogDuration || 2000)
  }
}

// Smooth fog color transition
function transitionFogTo(color, duration) {
  const fromColor = scene.fog.color.clone()
  const toColor = new THREE.Color(color)
  const startTime = performance.now()
  
  function updateFog() {
    const elapsed = performance.now() - startTime
    const t = Math.min(1, elapsed / duration)
    const eased = t * t * (3 - 2 * t)  // smoothstep
    
    scene.fog.color.lerpColors(fromColor, toColor, eased)
    scene.background.copy(scene.fog.color)
    
    if (t < 1) requestAnimationFrame(updateFog)
  }
  updateFog()
}

// Animate camera to position/target
function animateCameraTo(position, target, duration) {
  const startPos = camera.position.clone()
  const startTarget = orbit.target.clone()
  const startTime = performance.now()
  
  function update() {
    const elapsed = performance.now() - startTime
    const t = Math.min(1, elapsed / duration)
    const eased = t * t * (3 - 2 * t)
    
    camera.position.lerpVectors(startPos, new THREE.Vector3(...position), eased)
    orbit.target.lerpVectors(startTarget, new THREE.Vector3(...target), eased)
    orbit.update()
    
    if (t < 1) requestAnimationFrame(update)
  }
  update()
}

// Unlock/highlight a button
function unlockButton(buttonId) {
  const btn = document.getElementById(buttonId)
  if (!btn) return
  
  btn.classList.remove('locked')
  btn.classList.add('highlight')
  btn.style.pointerEvents = 'auto'
  btn.style.borderColor = '#FF0000'
  btn.style.color = '#FF0000'
  btn.style.animation = 'pulse 1s infinite'
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL SYSTEM — data-driven modals and floating text panels
// ═══════════════════════════════════════════════════════════════════════════

// Spawn a modal by ID
function spawnModal(modalId) {
  const modal = worldModals.get(modalId)
  if (!modal) {
    console.warn(`[Modal] Modal not found: ${modalId}`)
    return
  }
  
  currentModal = modal
  currentModalStep = 0
  renderModalStep()
}

// Render current modal step
function renderModalStep() {
  if (!currentModal) return
  
  const step = currentModal.sequence?.[currentModalStep]
  if (!step) {
    closeModal()
    return
  }
  
  switch(step.type) {
    case 'floating_text':
      renderFloatingText(step.content, step.trigger, currentModalStep)
      break
    case 'button_action':
      renderButtonAction(step.content, step.trigger, currentModalStep)
      break
    default:
      console.warn(`[Modal] Unknown step type: ${step.type}`)
      currentModalStep++
      renderModalStep()
  }
}

// Render floating text panel
function renderFloatingText(content, trigger, stepIndex) {
  const panel = document.createElement('div')
  panel.className = 'floating-text-panel'
  panel.dataset.stepIndex = stepIndex
  panel.style.cssText = `
    position: fixed;
    z-index: 2000;
    background: transparent;
    color: white;
    font-family: 'Share Tech Mono', monospace;
    text-align: justify;
    padding: 16px;
    max-width: 300px;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  `
  
  let html = ''
  if (content.title) {
    html += `<div style="font-size: 14px; font-weight: bold; margin-bottom: 8px; color: ${content.titleColor || '#00FFE0'};">${content.title}</div>`
  }
  if (content.subtitle) {
    html += `<div style="font-size: 11px; color: rgba(255,255,255,0.6); margin-bottom: 8px;">${content.subtitle}</div>`
  }
  if (content.body) {
    html += `<div style="font-size: 11px; line-height: 1.6; margin-bottom: 12px;">${content.body}</div>`
  }
  if (content.button) {
    html += `<button class="modal-step-btn" data-step="${stepIndex}" style="padding: 8px 16px; background: rgba(0,255,224,0.15); border: 1px solid rgba(0,255,224,0.4); color: #00FFE0; border-radius: 4px; cursor: pointer; font-family: inherit; font-size: 10px; letter-spacing: 0.1em;">${content.button.text || 'CONTINUE'}</button>`
  }
  if (content.closable) {
    html += `<button class="floating-close-btn" style="position:absolute;top:4px;right:4px;background:none;border:none;color:rgba(255,255,255,0.5);cursor:pointer;font-size:14px;">✕</button>`
  }
  
  panel.innerHTML = html
  document.body.appendChild(panel)
  modalPanels.push(panel)
  
  // Make draggable
  makeDraggable(panel, panel)
  
  // Button handler
  const btn = panel.querySelector('.modal-step-btn')
  if (btn) {
    btn.addEventListener('click', () => {
      currentModalStep++
      renderModalStep()
    })
  }
  
  // Close handler
  const closeBtn = panel.querySelector('.floating-close-btn')
  if (closeBtn && content.closable) {
    closeBtn.addEventListener('click', () => {
      panel.remove()
      modalPanels = modalPanels.filter(p => p !== panel)
      if (content.onClose === 'next_step') {
        currentModalStep++
        renderModalStep()
      }
    })
  }
  
  return panel
}

// Render button action step
function renderButtonAction(content, trigger, stepIndex) {
  // This step type waits for a button press
  console.log(`[Modal] Waiting for button action: ${content.buttonId}`)
  // The actual button handler is set up by unlockButton
  currentModalStep++
  renderModalStep()
}

// Close current modal and clean up
function closeModal() {
  if (!currentModal) return
  
  // Execute onClose actions
  const onClose = currentModal.onClose
  if (onClose) {
    if (onClose.unlockFeature) {
      // Unlock a feature (e.g., FREE_CAM)
      console.log(`[Modal] Unlocking feature: ${onClose.unlockFeature}`)
    }
    if (onClose.resetCamera) {
      // Reset camera to follow mode
      carSettings.orbitControls = false
      orbit.enabled = false
    }
  }
  
  // Remove all modal panels
  for (const panel of modalPanels) {
    panel.remove()
  }
  modalPanels = []
  
  currentModal = null
  currentModalStep = 0
}

// Export zones to JSON file
function exportZones() {
  if (customZones.length === 0) {
    showToast('NO ZONES TO EXPORT', '#FFB347', 2000)
    return
  }
  
  const data = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    zoneCount: customZones.length,
    zones: customZones
  }
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `zones-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
  
  showToast(`EXPORTED ${customZones.length} ZONES`, '#B4FF50', 2000)
}

// Import zones from JSON file
function importZones(file) {
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result)
      
      if (!data.zones || !Array.isArray(data.zones)) {
        showToast('INVALID ZONE FILE', '#FF4444', 2000)
        return
      }
      
      let imported = 0
      for (const zone of data.zones) {
        // Validate required fields
        if (!zone.zoneId || !zone.name || !zone.type || !zone.shape || !zone.dimensions || !zone.position) {
          console.warn(`[Import] Skipping invalid zone:`, zone)
          continue
        }
        
        // Generate new zoneId to avoid conflicts
        zone.zoneId = `zone_${Date.now()}_${imported}`
        
        customZones.push(zone)
        createZoneVisual(zone)
        createZoneCollider(zone)
        zoneCaptureState.set(zone.zoneId, { timeInZone: 0, captured: false })
        imported++
      }

      showToast(`IMPORTED ${imported} ZONES`, '#B4FF50', 2000)
    } catch (err) {
      showToast('IMPORT ERROR: INVALID JSON', '#FF4444', 2000)
      console.error('[Import] Error:', err)
    }
  }
  reader.readAsText(file)
}

// ═══════════════════════════════════════════════════════════════════════════
// MINIMAP — top-down 2D canvas rendering with procedural terrain sampling
// ═══════════════════════════════════════════════════════════════════════════

// Minimap — real 3D top-down scissor render using minimapCamera
// The panel div overlays the WebGPU canvas with transparent background;
// scissor renders the 3D scene into the matching canvas region
function renderMinimapScissor() {
  if (!minimapCamera || !chassisBody) return
  const mmPanel = document.getElementById('minimap-panel')
  if (!mmPanel || mmPanel.style.display === 'none') return

  const rect = mmPanel.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return

  // Position minimap camera directly above the vehicle looking straight down
  minimapCamera.position.set(chassisPos.x, chassisPos.y + 120, chassisPos.z)
  minimapCamera.lookAt(chassisPos.x, chassisPos.y, chassisPos.z)
  minimapCamera.aspect = rect.width / rect.height
  minimapCamera.updateProjectionMatrix()

  // Scissor coordinates — offset relative to the canvas element, not the viewport
  // In frame mode the canvas is shifted (top:32px left:32px), so subtract its origin
  const canvasRect = renderer.domElement.getBoundingClientRect()
  const sx = Math.round(rect.left - canvasRect.left)
  const sy = Math.round(rect.top - canvasRect.top)

  renderer.setScissorTest(true)
  renderer.setScissor(sx, sy, Math.round(rect.width), Math.round(rect.height))
  renderer.setViewport(sx, sy, Math.round(rect.width), Math.round(rect.height))
  renderer.render(scene, minimapCamera)
  renderer.setScissorTest(false)
  // Restore full viewport (use CSS-pixel size, renderer handles DPR)
  renderer.setViewport(0, 0, renderer.domElement.clientWidth, renderer.domElement.clientHeight)

}

// Right View — close-up side camera locked to the vehicle's local right axis
function renderRightViewScissor() {
  if (!rightViewCamera || !chassisBody) return
  const rvPanel = document.getElementById('right-view-panel')
  if (!rvPanel || rvPanel.style.display === 'none') return

  const rect = rvPanel.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return

  // Local right axis of the vehicle (+Z in local space = right side of the van)
  // The van's forward is +X local, so local right = +Z local
  const localRight = new THREE.Vector3(0, 0, 1).applyQuaternion(chassisQuat)
  const dist = 9  // units away from chassis center
  const heightOffset = 1.5  // slight upward look
  rightViewCamera.position.set(
    chassisPos.x + localRight.x * dist,
    chassisPos.y + heightOffset,
    chassisPos.z + localRight.z * dist
  )
  // Look at chassis center with a slight upward target
  rightViewCamera.lookAt(chassisPos.x, chassisPos.y + 0.8, chassisPos.z)
  // Keep camera upright regardless of vehicle tilt
  rightViewCamera.up.set(0, 1, 0)
  rightViewCamera.aspect = rect.width / rect.height
  rightViewCamera.updateProjectionMatrix()

  const canvasRect = renderer.domElement.getBoundingClientRect()
  const sx = Math.round(rect.left - canvasRect.left)
  const sy = Math.round(rect.top - canvasRect.top)

  renderer.setScissorTest(true)
  renderer.setScissor(sx, sy, Math.round(rect.width), Math.round(rect.height))
  renderer.setViewport(sx, sy, Math.round(rect.width), Math.round(rect.height))
  renderer.render(scene, rightViewCamera)
  renderer.setScissorTest(false)
  renderer.setViewport(0, 0, renderer.domElement.clientWidth, renderer.domElement.clientHeight)
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════════════
function showToast(msg,color='#B4FF50',duration=2500){const t=document.createElement('div');t.style.cssText=`position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);backdrop-filter:blur(12px);border:0.5px solid ${color};color:${color};font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:0.08em;padding:8px 16px;border-radius:2px;pointer-events:none;z-index:9999;animation:toastIn 0.2s ease,toastOut 0.3s ease ${duration-300}ms forwards;`;t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),duration)}
function syncOrbitalBtn(){const btnOrb=document.getElementById('btn-orbital'),labelEl=document.getElementById('btn-orbital-label');if(!btnOrb)return;if(carSettings.orbitControls){btnOrb.classList.add('orbital-on');if(labelEl)labelEl.textContent='FREE [O]'}else{btnOrb.classList.remove('orbital-on');if(labelEl)labelEl.textContent='ORBIT [O]'}}
function setLoading(text,pct){const status=document.getElementById('loader-status'),bar=document.getElementById('loader-bar');if(status)status.textContent=text;if(bar)bar.style.width=pct+'%'}

// ═══════════════════════════════════════════════════════════════════════════
// CAPA 1 — DRILL / TORNO MODE (additive — does not touch any existing system)
//   • Interior POV camera rendered into #drill-cam-panel via scissor
//   • Backdrop-filter on the panel gives the B/N + scanline look
//   • Hold [E] while panel is open to sample the biome under the rover
//   • Up to 7 samples stored in window.roverSamples, surfaced in #drill-hud
// ═══════════════════════════════════════════════════════════════════════════

// Map a vertical position to a biome bucket using existing biomeSettings thresholds.
// Returns { name, colors:[hex...] } — colors are read live so Settings panel edits propagate.
// Biome palette uses 4-7 colors (the focus biome gets all of its hues + the neighbouring ones'
// accent for a richer sample). This eliminates the prior "all-grey" sample bug — colors are now
// real hex strings, never affected by any UI backdrop-filter.
function getBiomeAtY(y) {
  const b = biomeSettings
  if (y < b.waterLevel) {
    return { name: 'WATER', colors: [b.waterColorDeep, b.waterColor, b.sandColor1, b.sandColor2] }
  }
  if (y < b.sandEnd) {
    return { name: 'SAND',  colors: [b.sandColor1, b.sandColor2, b.dirtColor1, b.waterColor, b.dirtColor2] }
  }
  if (y < b.dirtEnd) {
    return { name: 'DIRT',  colors: [b.dirtColor1, b.dirtColor2, b.sandColor2, b.grassColor1, b.sandColor1] }
  }
  return { name: 'GRASS', colors: [b.grassColor1, b.grassColor2, b.dirtColor1, b.dirtColor2, b.sandColor2] }
}

// Get terrain height directly under the rover (uses existing getTerrainHeight)
function _drillGetGroundY() {
  if (!chassisBody) return 0
  const p = chassisBody.translation()
  return getTerrainHeight(p.x, p.z)
}

// Push one sample, flash HUD if full, refresh the slots, show big central popup (v2)
function sampleBiome() {
  if (!chassisBody) return
  if (roverSamples.length >= MAX_SAMPLES) {
    _drillBlinkUntil = performance.now() + 600
    updateDrillHUD()
    console.log('[DRILL] HUD full — eject probe to clear samples')
    return
  }
  const p = chassisBody.translation()
  const groundY = _drillGetGroundY()
  const biome = getBiomeAtY(groundY + 0.01) // sample at the surface, not above the rover
  const sample = {
    id: roverSamples.length,
    biome: biome.name,
    colors: biome.colors.slice(),
    position: { x: p.x, y: groundY, z: p.z },
    t: Date.now()
  }
  roverSamples.push(sample)
  window.roverSamples = roverSamples
  updateDrillHUD()
  _showSamplePopup(sample)
  console.log('[DRILL] sample collected:', sample)
  if (typeof _refreshLaunchBtn === 'function') _refreshLaunchBtn()
}

// v2 — large centered popup that announces the new sample
function _showSamplePopup(sample) {
  const popup = document.getElementById('drill-sample-popup')
  if (!popup) return
  const biomeEl = document.getElementById('drill-popup-biome')
  const swatchesEl = document.getElementById('drill-popup-swatches')
  const coordsEl = document.getElementById('drill-popup-coords')
  if (biomeEl) biomeEl.textContent = sample.biome
  if (coordsEl) coordsEl.textContent = `@ ${sample.position.x.toFixed(0)},${sample.position.z.toFixed(0)} · #${roverSamples.length}/${MAX_SAMPLES}`
  if (swatchesEl) {
    swatchesEl.innerHTML = ''
    sample.colors.forEach(hex => {
      const s = document.createElement('div')
      s.style.cssText = `width:24px;height:24px;border-radius:50%;background:${hex};border:1.5px solid rgba(255,255,255,0.3);box-shadow:0 0 12px ${hex}88;`
      swatchesEl.appendChild(s)
    })
  }
  // Tint the border with the dominant biome color
  popup.style.borderColor = sample.colors[0]
  popup.style.boxShadow = `0 0 50px ${sample.colors[0]}66`
  popup.style.display = 'block'
  popup.style.animation = 'drillPopupIn 0.42s cubic-bezier(0.34,1.56,0.64,1) forwards'
  clearTimeout(_showSamplePopup._t)
  _showSamplePopup._t = setTimeout(() => {
    popup.style.animation = 'drillPopupOut 0.35s ease forwards'
    setTimeout(() => { popup.style.display = 'none' }, 380)
  }, 1900)
}

// v2 — Builds 7 glass test tubes inside #drill-hud-slots, fills each with biome colors.
// Reading colors AS HEX STRINGS guarantees no UI backdrop-filter desaturates them.
function updateDrillHUD() {
  const counter = document.getElementById('drill-hud-counter')
  if (counter) counter.textContent = `${roverSamples.length} / ${MAX_SAMPLES}`
  const biomeNameEl = document.getElementById('drill-hud-biome-name')
  if (biomeNameEl) {
    const groundY = _drillGetGroundY()
    const cur = getBiomeAtY(groundY + 0.01)
    biomeNameEl.textContent = cur.name
  }
  const slotsContainer = document.getElementById('drill-hud-slots')
  if (slotsContainer) {
    // Rebuild all 7 tubes (cheap; called only on sample/sample-fail)
    slotsContainer.innerHTML = ''
    for (let i = 0; i < MAX_SAMPLES; i++) {
      const tube = document.createElement('div')
      tube.className = 'glass-tube'
      tube.dataset.slot = i
      const s = roverSamples[i]
      const cap = document.createElement('div'); cap.className = 'tube-cap'
      const body = document.createElement('div'); body.className = 'tube-body'
      const fill = document.createElement('div'); fill.className = 'tube-fill'
      const meniscus = document.createElement('div'); meniscus.className = 'tube-meniscus'
      const shine = document.createElement('div'); shine.className = 'tube-shine'
      if (s) {
        // Use all available colors as a multi-stop vertical gradient (top→bottom: lightest first)
        const stops = s.colors.map((c, idx) => `${c} ${(idx / (s.colors.length - 1) * 100).toFixed(0)}%`).join(', ')
        fill.style.background = `linear-gradient(180deg, ${stops})`
        fill.style.height = '92%'
        meniscus.style.bottom = '92%'
        meniscus.style.background = `linear-gradient(180deg, ${s.colors[0]}cc, transparent)`
        tube.title = `${s.biome} @ (${s.position.x.toFixed(0)}, ${s.position.z.toFixed(0)})`
        cap.style.background = `linear-gradient(180deg, ${s.colors[0]}, ${s.colors[1] || s.colors[0]})`
      } else {
        fill.style.height = '0%'
      }
      body.appendChild(fill)
      body.appendChild(meniscus)
      tube.appendChild(cap)
      tube.appendChild(body)
      tube.appendChild(shine)
      slotsContainer.appendChild(tube)
    }
  }
  const hud = document.getElementById('drill-hud')
  if (hud) {
    hud.style.display = 'block'  // always visible
    const blink = performance.now() < _drillBlinkUntil
    hud.style.borderColor = blink ? '#FF4444' : (roverSamples.length >= MAX_SAMPLES ? '#FFB432' : 'rgba(0,255,224,0.4)')
    hud.style.boxShadow = blink
      ? '0 0 28px rgba(255,68,68,0.4),inset 0 0 24px rgba(255,68,68,0.08)'
      : (roverSamples.length >= MAX_SAMPLES
          ? '0 0 28px rgba(255,180,50,0.45),inset 0 0 24px rgba(255,180,50,0.08)'
          : '0 0 28px rgba(0,255,224,0.12),inset 0 0 24px rgba(0,255,224,0.04)')
  }
  // Sync bottom-bar launch button state
  if (typeof _refreshLaunchBtn === 'function') _refreshLaunchBtn()
}

// v2 — drill hold logic: 2.4s, chassis crouch, halo light, percent text, telemetry side panel
function tickDrillSampling(dt) {
  const eHeld = !!keys.KeyE && drillCamOpen && !constructorMode && !escapeMenuOpen && !teleportMenuOpen && probeState === 'idle'
  const ring = document.getElementById('drill-progress-ring')
  const pctEl = document.getElementById('drill-progress-pct')
  const status = document.getElementById('drill-cam-status')
  const telDepth = document.getElementById('drill-tel-depth')
  const telBiome = document.getElementById('drill-tel-biome')
  const telSub = document.getElementById('drill-tel-sub')

  // v3 — big floor pct element
  const floorPctEl = document.getElementById('drill-floor-pct')

  if (eHeld && roverSamples.length < MAX_SAMPLES) {
    drillSampleHoldActive = true
    drillSampleHoldTime += dt
    const pct = Math.min(1, drillSampleHoldTime / DRILL_SAMPLE_HOLD_DURATION)
    const pctTxt = `${Math.round(pct * 100)}%`
    const pctColor = pct >= 1 ? '#B4FF50' : '#00FFE0'
    // Ring + small pct (FRONT panel reticle)
    if (ring)  { ring.style.display = 'block'; ring.style.transform = `rotate(${pct * 360}deg)`; ring.style.borderTopColor = pctColor }
    if (pctEl) { pctEl.style.display = 'block'; pctEl.textContent = pctTxt; pctEl.style.color = pctColor }
    // Big digital % on FLOOR panel
    if (floorPctEl) { floorPctEl.style.display = 'block'; floorPctEl.textContent = pctTxt; floorPctEl.style.color = pctColor }
    if (status) { status.textContent = `DRILL · ${Math.round(pct * 100)}%`; status.style.color = '#00FFE0' }
    if (telDepth) telDepth.textContent = `${(pct * 1.4).toFixed(2)}m`
    if (telBiome) { const cur = getBiomeAtY(_drillGetGroundY() + 0.01); telBiome.textContent = cur.name }
    if (telSub) telSub.textContent = drillCamMode === 'floor' ? 'FLOOR' : 'FRONT'
    // Chassis crouch (smoothly suspend the wheels) — visible in ALL cameras
    _drillCrouchPct = THREE.MathUtils.lerp(_drillCrouchPct, pct, 0.15)
    _applyChassisCrouch(_drillCrouchPct)
    // Halo light under the rover
    _ensureDrillHaloLight()
    if (drillHaloLight) {
      drillHaloLight.intensity = 6 + pct * 22
      drillHaloLight.color.setHex(pct >= 1 ? 0xb4ff50 : 0x00ffe0)
      drillHaloLight.position.set(chassisPos.x, chassisPos.y - 0.4, chassisPos.z)
    }
    if (pct >= 1) {
      sampleBiome()
      drillSampleHoldTime = 0
    }
  } else {
    if (drillSampleHoldActive) {
      drillSampleHoldActive = false
      drillSampleHoldTime = 0
      if (ring) ring.style.display = 'none'
      if (pctEl) pctEl.style.display = 'none'
      if (floorPctEl) floorPctEl.style.display = 'none'
      if (status) {
        if (roverSamples.length >= MAX_SAMPLES) { status.textContent = 'FULL · LAUNCH'; status.style.color = '#FFB432' }
        else { status.textContent = 'IDLE'; status.style.color = 'rgba(255,255,255,0.5)' }
      }
    }
    // Smooth restore crouch
    if (_drillCrouchPct > 0.001) {
      _drillCrouchPct = THREE.MathUtils.lerp(_drillCrouchPct, 0, 0.18)
      _applyChassisCrouch(_drillCrouchPct)
    }
    // Fade halo
    if (drillHaloLight && drillHaloLight.intensity > 0.2) {
      drillHaloLight.intensity *= 0.85
    } else if (drillHaloLight && drillHaloLight.intensity <= 0.2) {
      drillHaloLight.intensity = 0
    }
  }
  // Periodic biome readout refresh
  if (drillCamOpen) {
    if (!tickDrillSampling._frame) tickDrillSampling._frame = 0
    if (++tickDrillSampling._frame % 15 === 0) {
      const biomeNameEl = document.getElementById('drill-hud-biome-name')
      if (biomeNameEl) {
        const groundY = _drillGetGroundY()
        biomeNameEl.textContent = getBiomeAtY(groundY + 0.01).name
      }
    }
  }
}

// Lazy-create a colored point light under the rover; persistent across drill cycles
function _ensureDrillHaloLight() {
  if (drillHaloLight) return
  drillHaloLight = new THREE.PointLight(0x00ffe0, 0, 8, 2)
  scene.add(drillHaloLight)
}

// Smoothly compress the wheel suspension so the chassis sinks while drilling.
// Restores to SUSP_REST on release (additive — only changes during drill).
function _applyChassisCrouch(pct) {
  if (!vehicle || pct < 0.001 && _applyChassisCrouch._lastPct < 0.001) { _applyChassisCrouch._lastPct = pct; return }
  const restLen = THREE.MathUtils.lerp(SUSP_REST, 0.12, pct)
  const stiff   = THREE.MathUtils.lerp(12, 60, pct)
  for (let i = 0; i < 4; i++) {
    try { vehicle.setWheelSuspensionRestLength(i, restLen) } catch(e){}
    try { vehicle.setWheelSuspensionStiffness(i, stiff) } catch(e){}
  }
  _applyChassisCrouch._lastPct = pct
}
_applyChassisCrouch._lastPct = 0

// v2 — supports two cam modes: 'floor' (under chassis) | 'front' (fish-eye, hood-mount)
const _drillCamFwd = new THREE.Vector3()
const _drillCamUp  = new THREE.Vector3()
const _drillCamPos = new THREE.Vector3()
const _drillLookAt = new THREE.Vector3()
// v3 — FLOOR cam: fisheye B&W, left panel of split layout
function renderFloorCamScissor() {
  if (!chassisBody) return
  const panel = document.getElementById('drill-floor-panel')
  if (!panel) return
  const wrap = document.getElementById('drill-split-wrap')
  if (!wrap || wrap.style.display === 'none') return
  if (!drillFloorCamera) drillFloorCamera = new THREE.PerspectiveCamera(170, 1, 0.05, 150)
  const rect = panel.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return

  const up  = new THREE.Vector3(0, 1, 0).applyQuaternion(chassisQuat)
  const fwd = new THREE.Vector3(1, 0, 0).applyQuaternion(chassisQuat)
  // Very close to ground, directly below chassis looking straight down (fisheye at 170°)
  drillFloorCamera.position.copy(chassisPos).addScaledVector(up, -0.3).addScaledVector(fwd, 0.1)
  drillFloorCamera.up.copy(fwd)
  drillFloorCamera.lookAt(chassisPos.clone().addScaledVector(up, -3))
  drillFloorCamera.aspect = rect.width / rect.height
  drillFloorCamera.updateProjectionMatrix()

  const canvasRect = renderer.domElement.getBoundingClientRect()
  const sx = Math.round(rect.left - canvasRect.left)
  const sy = Math.round(rect.top  - canvasRect.top)
  renderer.setScissorTest(true)
  renderer.setScissor(sx, sy, Math.round(rect.width), Math.round(rect.height))
  renderer.setViewport(sx, sy, Math.round(rect.width), Math.round(rect.height))
  renderer.render(scene, drillFloorCamera)
  renderer.setScissorTest(false)
  renderer.setViewport(0, 0, renderer.domElement.clientWidth, renderer.domElement.clientHeight)

  // Sync floor depth readout
  const depthEl = document.getElementById('drill-floor-depth')
  if (depthEl && chassisBody) {
    const groundY = typeof getTerrainHeight === 'function' ? getTerrainHeight(chassisPos.x, chassisPos.z) : 0
    const depth = Math.max(0, chassisPos.y - groundY)
    depthEl.textContent = depth.toFixed(2) + 'm'
  }
}

// v3 FRONT cam: now always renders into #drill-front-panel (right half of split)
function renderDrillCamScissor() {
  if (!chassisBody) return
  // Use the right-half front panel in the split layout
  const panel = document.getElementById('drill-front-panel') || document.getElementById('drill-cam-panel')
  if (!panel) return
  const wrap = document.getElementById('drill-split-wrap')
  // If split wrap exists but hidden, bail out
  if (wrap && wrap.style.display === 'none') return
  if (!wrap && panel.style.display === 'none') return
  if (!drillCamera) drillCamera = new THREE.PerspectiveCamera(130, 1, 0.1, 300)
  const rect = panel.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return

  const up  = new THREE.Vector3(0, 1, 0).applyQuaternion(chassisQuat)
  const fwd = new THREE.Vector3(1, 0, 0).applyQuaternion(chassisQuat)
  // FRONT cam: always 130° over the hood, slightly angled down
  drillCamera.fov = 130
  _drillCamPos.copy(chassisPos).addScaledVector(fwd, 1.2).addScaledVector(up, 0.6)
  _drillLookAt.copy(chassisPos).addScaledVector(fwd, 8).addScaledVector(up, -0.8)

  drillCamera.position.copy(_drillCamPos)
  drillCamera.up.copy(up)
  drillCamera.lookAt(_drillLookAt)
  drillCamera.aspect = rect.width / rect.height
  drillCamera.updateProjectionMatrix()

  const canvasRect = renderer.domElement.getBoundingClientRect()
  const sx = Math.round(rect.left - canvasRect.left)
  const sy = Math.round(rect.top  - canvasRect.top)
  renderer.setScissorTest(true)
  renderer.setScissor(sx, sy, Math.round(rect.width), Math.round(rect.height))
  renderer.setViewport(sx, sy, Math.round(rect.width), Math.round(rect.height))
  renderer.render(scene, drillCamera)
  renderer.setScissorTest(false)
  renderer.setViewport(0, 0, renderer.domElement.clientWidth, renderer.domElement.clientHeight)
}

// One-time setup: button toggle, panel drag/resize/close, [E] / [T] listeners
function initDrillModule() {
  if (initDrillModule._ran) return
  initDrillModule._ran = true

  const btnDrill  = document.getElementById('btn-drill')
  const panel     = document.getElementById('drill-cam-panel')   // legacy dummy
  const splitWrap = document.getElementById('drill-split-wrap')
  const hud       = document.getElementById('drill-hud')
  const closeBtn  = document.getElementById('drill-cam-close')
  const holdPrompt = document.getElementById('drill-hold-prompt')
  // Specimens HUD always visible (not tied to drill panel)
  if (hud) hud.style.display = 'block'

  function openPanel(open) {
    drillCamOpen = open
    if (splitWrap) splitWrap.style.display = open ? 'flex' : 'none'
    if (panel)     panel.style.display     = 'none'
    // HUD stays visible always
    if (holdPrompt) holdPrompt.style.display = open ? 'block' : 'none'
    if (btnDrill) {
      btnDrill.style.background  = open ? 'rgba(0,255,224,0.18)' : 'rgba(0,0,0,0.82)'
      btnDrill.style.color       = open ? '#00FFE0' : 'rgba(255,255,255,0.55)'
      btnDrill.style.borderColor = open ? 'rgba(0,255,224,0.7)' : 'rgba(255,255,255,0.12)'
    }
    if (open) {
      if (hud && !hud._drillHudDraggable) {
        hud._drillHudDraggable = true
        try { makeDraggable('drill-hud', 'drill-hud-header') } catch(e){}
      }
      updateDrillHUD()
      showToast('TORNO ON · HOLD [E] TO DRILL', '#00FFE0', 1800)
    } else {
      drillSampleHoldActive = false
      drillSampleHoldTime   = 0
      const ring = document.getElementById('drill-progress-ring')
      if (ring) ring.style.display = 'none'
      const floorPct = document.getElementById('drill-floor-pct')
      if (floorPct) floorPct.style.display = 'none'
      const pctEl = document.getElementById('drill-progress-pct')
      if (pctEl) pctEl.style.display = 'none'
    }
  }

  if (btnDrill) btnDrill.addEventListener('click', () => openPanel(!drillCamOpen))
  if (closeBtn) closeBtn.addEventListener('click', () => openPanel(false))

  // v3 — close button on FRONT panel
  const frontClose = document.getElementById('drill-front-close')
  if (frontClose) frontClose.addEventListener('click', () => openPanel(false))
  // legacy FLOOR/FRONT tab close (kept for ID compat; tabs no longer needed in split layout)
  const tabFloor = document.getElementById('drill-cam-floor')
  const tabFront = document.getElementById('drill-cam-front')
  if (tabFloor) tabFloor.addEventListener('click', () => {})
  if (tabFront) tabFront.addEventListener('click', () => {})

  // Keyboard — additive listener, does not interfere with setupEvents()
  // KeyT toggles the panel. KeyE is read in tickDrillSampling via the existing keys{} map.
  addEventListener('keydown', (e) => {
    if (e.repeat) return
    if (constructorMode || escapeMenuOpen || teleportMenuOpen || freeTpActive) return
    if (e.code === 'KeyT') { e.preventDefault(); openPanel(!drillCamOpen); return }
  })

  // Initial HUD render so the slots have correct background even when first opened
  updateDrillHUD()
  console.log('[DRILL_MODE] initialized — press [T] to open TORNO interior cam · hold [E] to sample')
}

// Public API for Capa 2 (probe will consume samples)
window.DrillDebug = {
  list: () => { console.table(roverSamples); return roverSamples },
  add:  () => { sampleBiome() },
  clear: () => { roverSamples = []; window.roverSamples = roverSamples; updateDrillHUD(); console.log('[DRILL] samples cleared') },
  open:  () => { const b = document.getElementById('btn-drill'); if (b) b.click() }
}

// ═══════════════════════════════════════════════════════════════════════════
// v3 — LAUNCH SKY CAM + COUNTDOWN CINEMATIC + ROVER LIGHTS (additive)
// ═══════════════════════════════════════════════════════════════════════════

// Sky-up cam for launch prep gyro area
function renderLaunchSkyCamScissor() {
  if (probeState !== 'prep' || !chassisBody) return
  const vp = document.getElementById('launch-sky-viewport')
  if (!vp || vp.style.display === 'none') return
  const rect = vp.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return
  if (!launchSkyCamera) launchSkyCamera = new THREE.PerspectiveCamera(100, 1, 0.5, 1200)
  // Position at rover, look straight up
  const up  = new THREE.Vector3(0, 1, 0).applyQuaternion(chassisQuat)
  const fwd = new THREE.Vector3(1, 0, 0).applyQuaternion(chassisQuat)
  launchSkyCamera.position.copy(chassisPos).addScaledVector(up, 0.4)
  launchSkyCamera.up.copy(fwd)
  launchSkyCamera.lookAt(chassisPos.clone().addScaledVector(up, 30))
  launchSkyCamera.aspect = rect.width / rect.height
  launchSkyCamera.updateProjectionMatrix()
  const canvasRect = renderer.domElement.getBoundingClientRect()
  const sx = Math.round(rect.left - canvasRect.left)
  const sy = Math.round(rect.top  - canvasRect.top)
  renderer.setScissorTest(true)
  renderer.setScissor(sx, sy, Math.round(rect.width), Math.round(rect.height))
  renderer.setViewport(sx, sy, Math.round(rect.width), Math.round(rect.height))
  renderer.render(scene, launchSkyCamera)
  renderer.setScissorTest(false)
  renderer.setViewport(0, 0, renderer.domElement.clientWidth, renderer.domElement.clientHeight)
}

// Cinematic camera tick during 5..4..3..2..1 countdown
function _tickCountdownCamera(dt) {
  if (!_countdownCinemaActive || !chassisBody) return
  _cdCamAngle += dt * 0.65   // orbit speed
  _cdCamHeight = Math.max(12, _cdCamHeight - dt * 9)   // descend from 80 → 12
  _cdCamRadius = Math.max(14, _cdCamRadius - dt * 6)   // tighten orbit 60 → 14
  const cx = chassisPos.x + Math.cos(_cdCamAngle) * _cdCamRadius
  const cz = chassisPos.z + Math.sin(_cdCamAngle) * _cdCamRadius
  const cy = chassisPos.y + _cdCamHeight
  camera.position.set(cx, cy, cz)
  camera.lookAt(chassisPos.x, chassisPos.y + 2, chassisPos.z)
}

// ──────── ROVER LIGHTS (L key: toggle, LL: high/low beam) ────────
const _LIGHT_MODES = ['POS', 'LOW', 'HIGH']
const _NIGHT_SAVE = { el: 45, amb: 0.6, red: 0.8, hem: 0.7 }

function initRoverLights() {
  if (initRoverLights._ran) return
  initRoverLights._ran = true

  // Spawn lights immediately (position mode, always visible)
  _spawnRoverLights()

  // L key cycles modes: position → low → high → position
  addEventListener('keydown', (e) => {
    if (e.repeat) return
    if (e.code === 'KeyL') {
      _lightMode = (_lightMode + 1) % 3
      _updateLightModeUI()
      showToast(`LIGHTS: ${_LIGHT_MODES[_lightMode]}`, '#FFB432', 900)
    }
  })

  const btn = document.getElementById('btn-rover-lights')
  if (btn) btn.addEventListener('click', () => {
    _lightMode = (_lightMode + 1) % 3
    _updateLightModeUI()
    showToast(`LIGHTS: ${_LIGHT_MODES[_lightMode]}`, '#FFB432', 900)
  })

  // Night mode button
  const btnNight = document.getElementById('btn-night-mode')
  if (btnNight) btnNight.addEventListener('click', () => {
    _nightMode = !_nightMode
    if (_nightMode) {
      _NIGHT_SAVE.el  = lightSettings.elevation
      _NIGHT_SAVE.amb = ambientLight.intensity
      _NIGHT_SAVE.red = redAmbient.intensity
      _NIGHT_SAVE.hem = shadowRedFill.intensity
      lightSettings.elevation = -55   // sun below horizon
      ambientLight.intensity  = 0.04
      redAmbient.intensity    = 0.08
      shadowRedFill.intensity = 0.04
      btnNight.textContent = '🌑 NIGHT'
      btnNight.style.color = '#B4FF50'
      btnNight.style.borderColor = 'rgba(180,255,80,0.7)'
      btnNight.style.background  = 'rgba(180,255,80,0.1)'
    } else {
      lightSettings.elevation = _NIGHT_SAVE.el
      ambientLight.intensity  = _NIGHT_SAVE.amb
      redAmbient.intensity    = _NIGHT_SAVE.red
      shadowRedFill.intensity = _NIGHT_SAVE.hem
      btnNight.textContent = '🌙 NIGHT'
      btnNight.style.color = 'rgba(255,255,255,0.55)'
      btnNight.style.borderColor = 'rgba(255,255,255,0.3)'
      btnNight.style.background  = 'transparent'
    }
  })
}

function _updateLightModeUI() {
  const btn = document.getElementById('btn-rover-lights')
  if (!btn) return
  const labels = ['◈ POS [L]', '◈ LOW [L]', '◈ HIGH [L]']
  btn.textContent = labels[_lightMode]
  btn.style.color       = _lightMode === 0 ? 'rgba(255,255,255,0.55)' : '#FFB432'
  btn.style.borderColor = _lightMode === 2 ? 'rgba(255,255,80,0.8)' : (_lightMode === 1 ? 'rgba(255,180,50,0.7)' : 'rgba(255,255,255,0.12)')
  btn.style.background  = _lightMode > 0 ? 'rgba(255,180,50,0.14)' : 'rgba(0,0,0,0.82)'
}

function _spawnRoverLights() {
  if (!chassisGroup) return
  // Cleanup old
  ;[..._headlightMeshes, ..._headlightLights, ..._tailLightMeshes, ..._tailLightLights,
    _turnMeshL, _turnMeshR, _turnLightL, _turnLightR, _brakeMesh, _brakeLight
  ].forEach(o => { if (o && o.parent) o.parent.remove(o) })
  _headlightMeshes = []; _headlightLights = []
  _tailLightMeshes = []; _tailLightLights = []
  _turnMeshL = _turnMeshR = _turnLightL = _turnLightR = null
  _brakeMesh = _brakeLight = null

  const headGeo = new THREE.BoxGeometry(0.06, 0.10, 0.20)  // smaller rect
  const tailGeo = new THREE.BoxGeometry(0.06, 0.09, 0.18)
  const turnGeo = new THREE.BoxGeometry(0.06, 0.07, 0.12)

  // LOW BEAM (2 bottom): body panel, same height as turn signals, inside them (z ±0.22)
  // HIGH BEAM (2 top): above van body (y=0.60), aimed nearly level for far distance
  // X moved inward to 1.12 (away from bumper tip, against body panel)
  const lowPos  = [[1.12, 0.32, -0.22], [1.12, 0.32, 0.22]]
  const highPos = [[1.08, 0.60, -0.20], [1.08, 0.60, 0.20]]
  lowPos.forEach(([x, y, z]) => {
    const mesh = new THREE.Mesh(headGeo, new THREE.MeshBasicMaterial({ color: 0x222218 }))
    mesh.position.set(x, y, z); chassisGroup.add(mesh); _headlightMeshes.push(mesh)
    const spot = new THREE.SpotLight(0xfffbe0, 0, 45, Math.PI / 8, 0.4)
    spot.position.set(x, y, z)
    spot.target.position.set(x + 16, y - 2.0, z)  // low beam: angled down for close road
    chassisGroup.add(spot); chassisGroup.add(spot.target); _headlightLights.push(spot)
  })
  highPos.forEach(([x, y, z]) => {
    const mesh = new THREE.Mesh(headGeo, new THREE.MeshBasicMaterial({ color: 0x222218 }))
    mesh.position.set(x, y, z); chassisGroup.add(mesh); _headlightMeshes.push(mesh)
    const spot = new THREE.SpotLight(0xffffff, 0, 180, Math.PI / 6, 0.15)
    spot.position.set(x, y, z)
    spot.target.position.set(x + 60, y + 1.5, z)  // high beam: nearly level, far range
    chassisGroup.add(spot); chassisGroup.add(spot.target); _headlightLights.push(spot)
  })

  // 2 rear tail lights — body panel, X inward to -1.12, Z restored to ±0.28
  const tPos = [[-1.12, 0.32, -0.28], [-1.12, 0.32, 0.28]]
  tPos.forEach(([x, y, z]) => {
    const mesh = new THREE.Mesh(tailGeo, new THREE.MeshBasicMaterial({ color: 0xcc1100 }))
    mesh.position.set(x, y, z); chassisGroup.add(mesh); _tailLightMeshes.push(mesh)
    const pt = new THREE.PointLight(0xff1100, 0.8, 7)
    pt.position.set(x, y, z); chassisGroup.add(pt); _tailLightLights.push(pt)
  })

  // Turn signals — SEPARATE materials (shared mat = both blink bug)
  // Left = -Z side (A key), Right = +Z side (D key)
  _turnMeshL  = new THREE.Mesh(turnGeo, new THREE.MeshBasicMaterial({ color: 0x441100 }))
  _turnMeshR  = new THREE.Mesh(turnGeo, new THREE.MeshBasicMaterial({ color: 0x441100 }))
  _turnMeshL.position.set(1.12, 0.32, -0.42); chassisGroup.add(_turnMeshL)
  _turnMeshR.position.set(1.12, 0.32,  0.42); chassisGroup.add(_turnMeshR)
  _turnLightL = new THREE.PointLight(0xff7700, 0, 5); _turnLightL.position.set(1.08, 0.3, -0.48); chassisGroup.add(_turnLightL)
  _turnLightR = new THREE.PointLight(0xff7700, 0, 5); _turnLightR.position.set(1.08, 0.3,  0.48); chassisGroup.add(_turnLightR)

  // Brake/reverse — own material
  _brakeMesh  = new THREE.Mesh(tailGeo, new THREE.MeshBasicMaterial({ color: 0x330000 }))
  _brakeMesh.position.set(-1.14, 0.40, 0); chassisGroup.add(_brakeMesh)
  _brakeLight = new THREE.PointLight(0xff0000, 0, 9); _brakeLight.position.set(-1.18, 0.38, 0); chassisGroup.add(_brakeLight)
}

function tickRoverLights(dt) {
  if (!chassisGroup) return
  _turnBlinkT += dt
  const blink        = (_turnBlinkT % 0.65) < 0.32
  const turningLeft  = !!keys.KeyA   // A = left turn = left (−Z) blinker
  const turningRight = !!keys.KeyD   // D = right turn = right (+Z) blinker
  const braking      = !!keys.KeyS

  // ── HEADLIGHTS — indices 0-1 = LOW BEAM, indices 2-3 = HIGH BEAM ──
  // mode 0 (POSITION): all off — just placed, no emission
  // mode 1 (LOW): bottom 2 on (warm white, moderate)
  // mode 2 (HIGH): bottom 2 on + top 2 blazing (far, level beam)
  const lowOn  = _lightMode >= 1
  const highOn = _lightMode === 2
  _headlightMeshes[0].material.color.setHex(lowOn  ? 0xfffbe0 : 0x222218)
  _headlightMeshes[1].material.color.setHex(lowOn  ? 0xfffbe0 : 0x222218)
  _headlightMeshes[2].material.color.setHex(highOn ? 0xffffff : 0x222218)
  _headlightMeshes[3].material.color.setHex(highOn ? 0xffffff : 0x222218)
  _headlightLights[0].intensity = lowOn  ? 10  : 0; _headlightLights[0].distance = 45
  _headlightLights[1].intensity = lowOn  ? 10  : 0; _headlightLights[1].distance = 45
  _headlightLights[2].intensity = highOn ? 45  : 0; _headlightLights[2].distance = 180
  _headlightLights[3].intensity = highOn ? 45  : 0; _headlightLights[3].distance = 180

  // ── TAIL LIGHTS (side reds) ──
  // mode 0: just placed, no emission
  // mode 1/2: on (medium red)
  // braking: very bright red regardless of mode
  const tailColor     = braking ? 0xff2200 : (_lightMode === 0 ? 0x1a0000 : 0xcc1100)
  const tailIntensity = braking ? 6 : (_lightMode === 0 ? 0 : 1.8)
  _tailLightMeshes.forEach(m => m.material.color.setHex(tailColor))
  _tailLightLights.forEach(l => l.intensity = tailIntensity)

  // ── TURN SIGNALS ──
  if (_turnMeshL)  _turnMeshL.material.color.setHex(turningLeft  && blink ? 0xff8800 : 0x220800)
  if (_turnMeshR)  _turnMeshR.material.color.setHex(turningRight && blink ? 0xff8800 : 0x220800)
  if (_turnLightL) _turnLightL.intensity = turningLeft  && blink ? 3.5 : 0
  if (_turnLightR) _turnLightR.intensity = turningRight && blink ? 3.5 : 0

  // ── BRAKE CENTER ──
  // off in mode 0, dim red in mode 1/2, SUPER prominent when braking
  const brakeColor = braking ? 0xff0000 : (_lightMode > 0 ? 0x550000 : 0x0e0000)
  const brakeInt   = braking ? 12 : (_lightMode > 0 ? 0.6 : 0)
  if (_brakeMesh)  _brakeMesh.material.color.setHex(brakeColor)
  if (_brakeLight) _brakeLight.intensity = brakeInt
}

// ═══════════════════════════════════════════════════════════════════════════
// CAPA 2/3/4 — PROBE / EJECT / CAPSULE / SAT_SLOT (additive)
// ═══════════════════════════════════════════════════════════════════════════

// ──────── Helpers ────────
function _refreshLaunchBtn() {
  // Bottom-bar launch button — always visible; active when samples ≥ 1 and idle
  const btn = document.getElementById('btn-launch-specimens')
  const active = roverSamples.length >= 1 && probeState === 'idle'
  if (btn) {
    btn.style.opacity = active ? '1' : '0.35'
    btn.style.cursor  = active ? 'pointer' : 'default'
    btn.style.color   = active ? '#FFB432' : 'rgba(255,255,255,0.35)'
    btn.style.borderColor = active ? 'rgba(255,180,50,0.6)' : 'rgba(255,255,255,0.12)'
  }
  // Also update old btn-launch-prep (hidden, kept for compat)
  const old = document.getElementById('btn-launch-prep')
  if (old) old.style.display = 'none'
}

// ──────── LAUNCH PREP ────────
function startLaunchPrep() {
  if (probeState !== 'idle') return
  if (roverSamples.length === 0) { showToast('NO SAMPLES TO LAUNCH', '#FF4444', 1500); return }
  if (vehicleMode === 'float') setDriveMode('gravity')
  if (vehicleMode === 'hook')  setDriveMode('gravity')
  probeState = 'prep'
  roverAnchored = true
  if (chassisBody) {
    const t = chassisBody.translation()
    _roverAnchorPos = { x: t.x, y: t.y, z: t.z }
    chassisBody.setLinvel({ x: 0, y: 0, z: 0 }, true)
    chassisBody.setAngvel({ x: 0, y: 0, z: 0 }, true)
  }
  const hud = document.getElementById('launch-prep-hud')
  if (hud) hud.style.display = 'block'
  const sm = document.getElementById('launch-prep-samples')
  if (sm) sm.textContent = `SAMPLES ABOARD: ${roverSamples.length}`
  // v3 — show sky cam viewport
  const skyVp = document.getElementById('launch-sky-viewport')
  if (skyVp) skyVp.style.display = 'block'
  // v2 — dim background, spawn tripod legs placeholder
  _setLaunchDimmer(true)
  _spawnTripodLegs()
  startLaunchPrep._tStart = performance.now()
  showToast('LAUNCH PREP · BALANCE THE ROVER', '#FFB432', 1800)
  console.log('[PROBE] launch prep started')
}

function _setLaunchDimmer(on) {
  const d = document.getElementById('launch-dimmer')
  if (!d) return
  d.style.display = on ? 'block' : 'none'
  d.style.opacity = on ? '1' : '0'
}

function _spawnTripodLegs() {
  _despawnTripodLegs()
  if (!chassisGroup) return
  const legMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.6, roughness: 0.4 })
  const positions = [
    [ 0.85, 0,  0.55],
    [ 0.85, 0, -0.55],
    [-0.85, 0,  0.55],
    [-0.85, 0, -0.55],
  ]
  positions.forEach(p => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.55, 8), legMat)
    leg.position.set(p[0], p[1] - 0.35, p[2])
    leg.scale.y = 0.05
    leg.castShadow = true
    chassisGroup.add(leg)
    drillTripodMeshes.push(leg)
  })
}

function _despawnTripodLegs() {
  drillTripodMeshes.forEach(leg => {
    if (leg.parent) leg.parent.remove(leg)
    if (leg.geometry) leg.geometry.dispose()
    if (leg.material) leg.material.dispose()
  })
  drillTripodMeshes = []
}

function cancelLaunchPrep() {
  if (probeState !== 'prep') return
  probeState = 'idle'
  roverAnchored = false
  _roverAnchorPos = null
  const hud = document.getElementById('launch-prep-hud')
  if (hud) hud.style.display = 'none'
  _setLaunchDimmer(false)
  _despawnTripodLegs()
  if (_launchCountdownTimer) { clearTimeout(_launchCountdownTimer); _launchCountdownTimer = null }
  _countdownCinemaActive = false
  const cd = document.getElementById('launch-countdown')
  if (cd) cd.style.display = 'none'
  const skyVp = document.getElementById('launch-sky-viewport')
  if (skyVp) skyVp.style.display = 'none'
  _refreshLaunchBtn()
  showToast('LAUNCH CANCELLED', '#FF4444', 1200)
  console.log('[PROBE] launch prep cancelled')
}

// v3 — 5-4-3-2-1 cinematic countdown with digital-clock digits + orbiting camera
function startLaunchCountdown() {
  if (probeState !== 'prep') return
  const hud = document.getElementById('launch-prep-hud')
  if (hud) hud.style.display = 'none'
  const skyVp = document.getElementById('launch-sky-viewport')
  if (skyVp) skyVp.style.display = 'none'
  const cd = document.getElementById('launch-countdown')
  if (!cd) { launchProbe(); return }
  // Start cinematic camera — store current state and begin orbit
  _countdownCinemaActive = true
  _cdCamAngle  = Math.atan2(camera.position.z - chassisPos.z, camera.position.x - chassisPos.x)
  _cdCamHeight = 80
  _cdCamRadius = 60
  let n = 5
  function showDigit(num) {
    // v3 digital-clock style: use CSS text-shadow to simulate lit segments
    cd.style.display = 'block'
    cd.textContent = num
    cd.style.fontFamily = "'Orbitron', 'Share Tech Mono', monospace"
    cd.style.fontWeight = '900'
    cd.style.letterSpacing = '0.05em'
    const colors = { 5: '#00FFE0', 4: '#00FFE0', 3: '#FFB432', 2: '#FF8800', 1: '#FF4444' }
    const c = colors[num] || '#00FFE0'
    cd.style.color = c
    cd.style.textShadow = `0 0 30px ${c}, 0 0 60px ${c}88, 0 0 100px ${c}44`
    cd.style.animation = 'none'
    void cd.offsetWidth
    cd.style.animation = 'countdownTick 1s ease forwards'
  }
  showDigit(n)
  const tick = () => {
    n -= 1
    if (n <= 0) {
      cd.textContent = '▲ LAUNCH'
      cd.style.fontFamily = "'Orbitron', 'Share Tech Mono', monospace"
      cd.style.fontSize = '80px'
      cd.style.color = '#B4FF50'
      cd.style.textShadow = '0 0 40px #B4FF50, 0 0 80px #B4FF5066'
      cd.style.animation = 'none'; void cd.offsetWidth
      cd.style.animation = 'countdownTick 0.9s ease forwards'
      setTimeout(() => {
        cd.style.display = 'none'
        cd.style.fontSize = '140px'
        _countdownCinemaActive = false
        launchProbe()
      }, 900)
      return
    }
    showDigit(n)
    _launchCountdownTimer = setTimeout(tick, 950)
  }
  _launchCountdownTimer = setTimeout(tick, 950)
}

// v2 — skate-trick balance: arrow on horizontal bar + circular gyro + sweet zone pulse + cling feedback
function tickLaunchPrep() {
  if (probeState !== 'prep' || !chassisBody) return
  if (_roverAnchorPos) {
    chassisBody.setLinvel({ x: 0, y: 0, z: 0 }, true)
    chassisBody.setAngvel({ x: 0, y: 0, z: 0 }, true)
  }
  const chassisUp    = new THREE.Vector3(0, 1, 0).applyQuaternion(chassisQuat)
  const chassisFwd   = new THREE.Vector3(1, 0, 0).applyQuaternion(chassisQuat)
  const chassisRight = new THREE.Vector3(0, 0, 1).applyQuaternion(chassisQuat)
  const tiltAngleRad = Math.acos(THREE.MathUtils.clamp(chassisUp.y, -1, 1))
  const tiltDeg = tiltAngleRad * 180 / Math.PI
  const dotX = chassisUp.dot(chassisRight)
  const dotY = chassisUp.dot(chassisFwd)
  // Horizontal balance bar: combine roll (X) and pitch (Y) into a single arrow position [-1..1]
  // (most intuitive: tilt left/right dominates, pitch fwd/back is secondary)
  const barNorm = THREE.MathUtils.clamp((dotX * 0.7 + dotY * 0.3) * 1.6, -1, 1) // amplified for sensitivity
  const arrow = document.getElementById('balance-arrow')
  if (arrow) arrow.style.left = `${50 + barNorm * 45}%`
  // Mini gyro dot
  const dot = document.getElementById('gyro-dot')
  if (dot) {
    const half = 40
    dot.style.left = `calc(50% + ${dotX * half}px)`
    dot.style.top  = `calc(50% - ${dotY * half}px)`
  }
  // Sweet zone pulse — brighter as we approach 0°
  const sweet = document.getElementById('balance-sweet-zone')
  const closeness = THREE.MathUtils.clamp(1 - (tiltDeg / 12), 0, 1)
  if (sweet) {
    const w = 60 + closeness * 60  // expands as you approach level
    sweet.style.width = `${w}px`
    sweet.style.background = closeness > 0.6
      ? `rgba(180,255,80,${0.18 + closeness * 0.4})`
      : 'rgba(180,255,80,0.18)'
    sweet.style.animation = closeness > 0.65 ? 'balanceSweetPulse 0.6s ease infinite' : 'none'
  }
  const level = tiltDeg < 5 // tightened to 5° as requested
  const status = document.getElementById('gyro-status')
  if (status) {
    status.textContent = `TILT: ${tiltDeg.toFixed(1)}° · ${level ? '◉ PERFECT LEVEL' : 'UNLEVEL'}`
    status.style.color = level ? '#B4FF50' : 'rgba(255,180,50,0.85)'
  }
  // Continuous feedback ladder (Tony Hawk style "cling cling")
  const fb = document.getElementById('gyro-feedback')
  if (fb) {
    let msg = '—', col = 'rgba(255,255,255,0.4)'
    if (tiltDeg < 1)      { msg = '✦✦✦ INSANE BALANCE ✦✦✦'; col = '#B4FF50' }
    else if (tiltDeg < 3) { msg = '✦✦ GREAT — HOLD IT'; col = '#B4FF50' }
    else if (tiltDeg < 5) { msg = '✦ OK — STEADY';      col = '#FFB432' }
    else if (tiltDeg < 8) { msg = '~ ALMOST THERE';     col = '#FFB432' }
    else if (tiltDeg < 12){ msg = 'KEEP NIVELING…';     col = 'rgba(255,180,50,0.7)' }
    else                  { msg = 'TOO MUCH TILT';      col = '#FF4444' }
    if (fb.textContent !== msg) {
      fb.textContent = msg
      fb.style.color = col
    }
  }
  // Tripod placeholder legs animate in over the first second
  if (drillTripodMeshes.length > 0) {
    const t0 = (performance.now() - (startLaunchPrep._tStart || performance.now())) / 1000
    const lerp = THREE.MathUtils.clamp(t0, 0, 1)
    drillTripodMeshes.forEach(leg => {
      leg.scale.y = THREE.MathUtils.lerp(0.05, 1, lerp)
      leg.position.y = chassisPos.y - 0.4 - (1 - lerp) * 0.3
    })
  }
  const fireBtn = document.getElementById('btn-launch-fire')
  if (fireBtn) {
    fireBtn.disabled = !level
    fireBtn.style.opacity = level ? '1' : '0.5'
    fireBtn.style.cursor  = level ? 'pointer' : 'not-allowed'
    fireBtn.style.background = level ? 'rgba(180,255,80,0.32)' : 'rgba(180,255,80,0.08)'
    fireBtn.style.color = level ? '#FFFFFF' : 'rgba(180,255,80,0.4)'
    fireBtn.style.borderColor = level ? '#B4FF50' : 'rgba(180,255,80,0.3)'
    fireBtn.style.boxShadow = level ? '0 0 22px rgba(180,255,80,0.5)' : 'none'
  }
}

// ──────── LAUNCH ────────
async function launchProbe() {
  if (probeState !== 'prep' || !chassisBody) return
  console.log('[PROBE] launching with', roverSamples.length, 'samples')
  // Transfer samples
  probeSamples = roverSamples.slice()
  // Hide prep HUD
  const prepHud = document.getElementById('launch-prep-hud')
  if (prepHud) prepHud.style.display = 'none'
  // Build probe physics body
  const t = chassisBody.translation()
  probeLaunchPos = { x: t.x, y: t.y + 1.5, z: t.z }
  const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(probeLaunchPos.x, probeLaunchPos.y, probeLaunchPos.z)
    .setLinearDamping(0.05)
    .setAngularDamping(0.5)
    .setGravityScale(PROBE_GRAVITY_SCALE)
  probeBody = physicsWorld.createRigidBody(bodyDesc)
  const colDesc = RAPIER.ColliderDesc.cylinder(0.7, 0.35).setMass(2.0).setRestitution(0)
  physicsWorld.createCollider(colDesc, probeBody)
  // Visual rocket placeholder (cone + cylinder + fins)
  probeMesh = new THREE.Group()
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.35, 1.4, 16),
    new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.5, roughness: 0.4 })
  )
  body.castShadow = true
  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.35, 0.6, 16),
    new THREE.MeshStandardMaterial({ color: 0xff4444, metalness: 0.4, roughness: 0.5 })
  )
  tip.position.y = 1.0
  // Three small fins
  const finMat = new THREE.MeshStandardMaterial({ color: 0xffb432, metalness: 0.3, roughness: 0.6 })
  for (let i = 0; i < 3; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.4, 0.4), finMat)
    fin.position.y = -0.6
    fin.position.x = Math.cos(i * Math.PI * 2 / 3) * 0.4
    fin.position.z = Math.sin(i * Math.PI * 2 / 3) * 0.4
    probeMesh.add(fin)
  }
  // Exhaust glow
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xff8844, transparent: true, opacity: 0.8 })
  )
  glow.position.y = -0.9
  glow.scale.set(1, 1.6, 1)
  probeMesh.add(glow)
  probeMesh.add(body, tip)
  scene.add(probeMesh)
  // Initial impulse — perpendicular to ground (world Y)
  const mass = probeBody.mass()
  probeBody.applyImpulse({ x: 0, y: PROBE_LAUNCH_IMPULSE * mass, z: 0 }, true)
  probeState = 'flying'
  _probeLaunchTime = performance.now()
  // Open probe cam panel
  const panel = document.getElementById('probe-cam-panel')
  if (panel) {
    panel.style.display = 'block'
    if (!panel._probeInitialized) {
      panel._probeInitialized = true
      try { makeDraggable('probe-cam-panel', 'probe-cam-label') } catch(e){}
      try { attachResizeHandle(panel, document.getElementById('probe-cam-resize-handle'), 'left') } catch(e){}
      const closeBtn = document.getElementById('probe-cam-close')
      if (closeBtn) closeBtn.addEventListener('click', () => { if (panel) panel.style.display = 'none' })
    }
  }
  // Position the eject window band visually
  const wrap = document.getElementById('probe-altitude-wrap')
  const band = document.getElementById('probe-eject-window')
  if (wrap && band) {
    // Map [0..PROBE_EJECT_MAX_ALT*1.4] to bar height; bar is bottom-up
    const range = PROBE_EJECT_MAX_ALT * 1.4
    const minPct = (PROBE_EJECT_MIN_ALT / range) * 100
    const maxPct = (PROBE_EJECT_MAX_ALT / range) * 100
    band.style.bottom = minPct + '%'
    band.style.height = (maxPct - minPct) + '%'
  }
  // Place the SAT_SLOT in orbit around the launch site
  _spawnSatSlot()
  showToast('▲ PROBE LAUNCHED · ROTATE WITH A/D · WATCH ALTITUDE', '#B4FF50', 2200)
}

// ──────── PROBE FLIGHT TICK ────────
function tickProbe(dt) {
  if (probeState !== 'flying' && probeState !== 'eject_window') return
  if (!probeBody || !probeMesh) return
  // Sync mesh
  const p = probeBody.translation()
  const r = probeBody.rotation()
  probeMesh.position.set(p.x, p.y, p.z)
  probeMesh.quaternion.set(r.x, r.y, r.z, r.w)
  // Player rotates orbit angle with A/D (don't conflict with steering — steering only matters when grounded)
  if (keys.KeyA) probeOrbitAngle -= dt * 1.6
  if (keys.KeyD) probeOrbitAngle += dt * 1.6
  // Compute altitude relative to launch
  const altitude = p.y - probeLaunchPos.y
  // Progressive thrust via impulse (Rapier has no applyForce — impulse = force × dt)
  const age = (performance.now() - _probeLaunchTime) / 1000
  const pm  = probeBody.mass()
  const thrustY = (3.72 * 1.55 + age * 0.48) * pm   // starts just above gravity, grows with time
  const wobble  = altitude < 22 ? (Math.random() - 0.5) * pm * 1.6 : 0  // wobbly first 22m
  probeBody.applyImpulse({ x: wobble * dt, y: thrustY * dt, z: wobble * 0.7 * dt }, true)
  // Update altitude marker on the bar
  const wrap = document.getElementById('probe-altitude-wrap')
  const marker = document.getElementById('probe-alt-marker')
  if (wrap && marker) {
    const range = PROBE_EJECT_MAX_ALT * 1.4
    const pct = THREE.MathUtils.clamp(altitude / range, 0, 1)
    marker.style.bottom = (pct * 100) + '%'
  }
  // Status text
  const status = document.getElementById('probe-cam-status')
  if (status) status.textContent = `ALT: ${altitude.toFixed(0)}m`
  // Eject window state
  const ejectBtn = document.getElementById('btn-eject-capsule')
  const inWindow = altitude >= PROBE_EJECT_MIN_ALT && altitude <= PROBE_EJECT_MAX_ALT
  if (inWindow && probeState === 'flying') {
    probeState = 'eject_window'
    if (ejectBtn) ejectBtn.style.display = 'block'
    showToast('◉ EJECT WINDOW · CLICK NOW', '#00FFE0', 1800)
  } else if (!inWindow && probeState === 'eject_window' && altitude > PROBE_EJECT_MAX_ALT) {
    // Missed the window
    if (ejectBtn) ejectBtn.style.display = 'none'
    _missedEjectWindow()
    return
  }
  // Safety timeout — if 28s pass, auto-eject
  if ((performance.now() - _probeLaunchTime) / 1000 > PROBE_MAX_FLIGHT_TIME) {
    if (probeState === 'eject_window') ejectCapsule()
    else _missedEjectWindow()
  }
}

function _missedEjectWindow() {
  if (probeState !== 'flying' && probeState !== 'eject_window') return
  showToast('✗ PROBE LOST · NO EJECT', '#FF4444', 2200)
  console.log('[PROBE] eject window missed — cleaning up')
  _cleanupProbe()
  // Reset rover state — samples lost
  roverSamples = []
  window.roverSamples = roverSamples
  updateDrillHUD()
  probeState = 'idle'
  roverAnchored = false
  _refreshLaunchBtn()
}

function _cleanupProbe() {
  const ejectBtn = document.getElementById('btn-eject-capsule')
  if (ejectBtn) ejectBtn.style.display = 'none'
  if (probeMesh) { scene.remove(probeMesh); probeMesh.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose() }); probeMesh = null }
  if (probeBody) { try { physicsWorld.removeRigidBody(probeBody) } catch(e){}; probeBody = null }
  const panel = document.getElementById('probe-cam-panel')
  if (panel) panel.style.display = 'none'
  // v2 — clean up dimmer + tripod placeholder when leaving the launch flow
  _setLaunchDimmer(false)
  _despawnTripodLegs()
}

// ──────── PROBE CAM SCISSOR ────────
const _probeCamPos = new THREE.Vector3()
const _probeCamLook = new THREE.Vector3()
function renderProbeCamScissor() {
  const panel = document.getElementById('probe-cam-panel')
  if (!panel || panel.style.display === 'none') return
  if (!probeMesh) return
  if (!probeCamera) {
    probeCamera = new THREE.PerspectiveCamera(55, 1, 0.1, 600)
  }
  const rect = panel.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return
  const dist = 8
  const heightOff = 1.5
  _probeCamPos.set(
    probeMesh.position.x + Math.cos(probeOrbitAngle) * dist,
    probeMesh.position.y + heightOff,
    probeMesh.position.z + Math.sin(probeOrbitAngle) * dist
  )
  _probeCamLook.copy(probeMesh.position)
  probeCamera.position.copy(_probeCamPos)
  probeCamera.up.set(0, 1, 0)
  probeCamera.lookAt(_probeCamLook)
  probeCamera.aspect = rect.width / rect.height
  probeCamera.updateProjectionMatrix()
  const canvasRect = renderer.domElement.getBoundingClientRect()
  const sx = Math.round(rect.left - canvasRect.left)
  const sy = Math.round(rect.top  - canvasRect.top)
  renderer.setScissorTest(true)
  renderer.setScissor(sx, sy, Math.round(rect.width), Math.round(rect.height))
  renderer.setViewport(sx, sy, Math.round(rect.width), Math.round(rect.height))
  renderer.render(scene, probeCamera)
  renderer.setScissorTest(false)
  renderer.setViewport(0, 0, renderer.domElement.clientWidth, renderer.domElement.clientHeight)
}

// ──────── SAT_SLOT (Capa 4 capture target) ────────
function _spawnSatSlot() {
  if (satSlotMesh) { scene.remove(satSlotMesh); satSlotMesh.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose() }); satSlotMesh = null }
  // Position on a horizontal orbit around the launch point
  _satSlotAngle = Math.random() * Math.PI * 2
  _satSlotBaseY = probeLaunchPos.y + SAT_SLOT_ALTITUDE_OFFSET  // temp; overridden at eject
  satSlotPos.set(
    probeLaunchPos.x + Math.cos(_satSlotAngle) * SAT_SLOT_ORBITAL_RADIUS,
    _satSlotBaseY,
    probeLaunchPos.z + Math.sin(_satSlotAngle) * SAT_SLOT_ORBITAL_RADIUS
  )
  satSlotMesh = new THREE.Group()
  const torus = new THREE.Mesh(
    new THREE.TorusGeometry(4, 0.6, 12, 32),
    new THREE.MeshStandardMaterial({ color: 0x00ffe0, emissive: 0x008866, emissiveIntensity: 0.6, metalness: 0.6, roughness: 0.3 })
  )
  torus.rotation.x = Math.PI / 2
  satSlotMesh.add(torus)
  // Center beacon
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.8, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xb4ff50 })
  )
  satSlotMesh.add(beacon)
  satSlotMesh.position.copy(satSlotPos)
  scene.add(satSlotMesh)
  console.log('[SAT_SLOT] spawned at', satSlotPos.toArray())
}

function tickSatSlot(dt) {
  if (!satSlotMesh) return
  // Slow orbit around launch point so it actually moves like a satellite
  _satSlotAngle += dt * 0.022
  satSlotPos.set(
    probeLaunchPos.x + Math.cos(_satSlotAngle) * SAT_SLOT_ORBITAL_RADIUS,
    _satSlotBaseY,   // set at eject time = capsule altitude, so sat is always reachable
    probeLaunchPos.z + Math.sin(_satSlotAngle) * SAT_SLOT_ORBITAL_RADIUS
  )
  satSlotMesh.position.copy(satSlotPos)
  satSlotMesh.rotation.y += dt * 0.5
}

function _cleanupSatSlot() {
  if (satSlotMesh) { scene.remove(satSlotMesh); satSlotMesh.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose() }); satSlotMesh = null }
}

// ──────── CAPSULE EJECT (Capa 3→4 transition) ────────
function ejectCapsule() {
  if (probeState !== 'eject_window' || !probeBody) return
  console.log('[CAPSULE] ejecting toward sat_slot direction')
  const probePos = probeBody.translation()
  // Snap satellite to capsule's actual eject altitude + 18m so it's always in the same horizontal plane
  _satSlotBaseY = probePos.y + 18
  satSlotPos.y = _satSlotBaseY
  if (satSlotMesh) satSlotMesh.position.y = _satSlotBaseY
  // Eject direction = full 3D vector toward satellite (wherever it is now)
  const toSat = new THREE.Vector3(
    satSlotPos.x - probePos.x,
    satSlotPos.y - probePos.y,
    satSlotPos.z - probePos.z
  )
  if (toSat.lengthSq() < 0.001) toSat.set(1, 0.3, 0)
  const dir = toSat.normalize()
  // Build capsule body — gravityScale 0 = perfect coast
  const desc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(probePos.x + toSat.x * 1.5, probePos.y + 0.5, probePos.z + toSat.z * 1.5)
    .setGravityScale(0)
    .setLinearDamping(0)
  capsuleBody = physicsWorld.createRigidBody(desc)
  const cd = RAPIER.ColliderDesc.ball(0.45).setMass(0.4).setRestitution(0)
  physicsWorld.createCollider(cd, capsuleBody)
  capsuleVelocity.copy(dir).multiplyScalar(CAPSULE_SPEED)
  capsuleBody.setLinvel({ x: capsuleVelocity.x, y: capsuleVelocity.y, z: capsuleVelocity.z }, true)
  // Visual capsule — sphere with biome-color sample window
  capsuleMesh = new THREE.Group()
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 18, 12),
    new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.6, roughness: 0.3 })
  )
  capsuleMesh.add(shell)
  // Color band reflecting the first sample
  if (probeSamples[0]) {
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.46, 0.08, 8, 24),
      new THREE.MeshBasicMaterial({ color: probeSamples[0].colors[0] })
    )
    capsuleMesh.add(band)
  }
  // Trail
  const trail = new THREE.Mesh(
    new THREE.ConeGeometry(0.3, 0.9, 12),
    new THREE.MeshBasicMaterial({ color: 0x00ffe0, transparent: true, opacity: 0.7 })
  )
  trail.rotation.z = Math.PI / 2
  trail.position.x = -0.6
  capsuleMesh.add(trail)
  scene.add(capsuleMesh)
  // Hide eject button, free probe (let it drift away)
  const ejectBtn = document.getElementById('btn-eject-capsule')
  if (ejectBtn) ejectBtn.style.display = 'none'
  // Open capsule chase cam (closes the probe panel)
  const panel = document.getElementById('probe-cam-panel')
  if (panel) panel.style.display = 'none'
  const cpanel = document.getElementById('capsule-cam-panel')
  if (cpanel) {
    cpanel.style.display = 'block'
    if (!cpanel._capsInitialized) {
      cpanel._capsInitialized = true
      try { makeDraggable('capsule-cam-panel', 'capsule-cam-label') } catch(e){}
    }
  }
  probeState = 'capsule_flying'
  _capsuleStart = performance.now()
  showToast('◉ CAPSULE EJECTED · STEER WITH A/D', '#00FFE0', 1800)
}

// v2 — mouse-aimed steering. Capsule cruises forward at constant speed; mouse displacement
//      from the panel center applies a steering force perpendicular to velocity.
function tickCapsule(dt) {
  if (probeState !== 'capsule_flying' || !capsuleBody || !capsuleMesh) return
  const p = capsuleBody.translation()
  const r = capsuleBody.rotation()
  capsuleMesh.position.set(p.x, p.y, p.z)
  capsuleMesh.quaternion.set(r.x, r.y, r.z, r.w)
  // Compute steering vector based on mouse position (panel-relative, -1..1)
  const v = capsuleBody.linvel()
  const horiz = new THREE.Vector3(v.x, 0, v.z); horiz.normalize()
  if (horiz.lengthSq() < 0.0001) horiz.set(1, 0, 0)
  const right = new THREE.Vector3(-horiz.z, 0, horiz.x).normalize()
  const up    = new THREE.Vector3(0, 1, 0)
  const _mf = 0.10   // mouse gets much less steering than keyboard — micro-corrections only
  const steerX = _capsuleMouseActive ? _capsuleMouseX * _mf : (keys.KeyA ? -1 : keys.KeyD ? 1 : 0)
  const steerY = _capsuleMouseActive ? _capsuleMouseY * _mf : (keys.KeyW ? 1 : keys.KeyS ? -0.6 : 0)
  const f = CAPSULE_MOUSE_STEER_FORCE
  const nudge = {
    x: right.x * steerX * f + up.x * steerY * f,
    y: right.y * steerX * f + up.y * steerY * f,
    z: right.z * steerX * f + up.z * steerY * f,
  }
  capsuleBody.applyImpulse(nudge, true)
  // Renormalize speed to constant CAPSULE_SPEED so steering doesn't change throttle
  const cur = capsuleBody.linvel()
  const speed = Math.sqrt(cur.x*cur.x + cur.y*cur.y + cur.z*cur.z)
  if (speed > 0.01) {
    const k = CAPSULE_SPEED / speed
    capsuleBody.setLinvel({ x: cur.x*k, y: cur.y*k, z: cur.z*k }, true)
  }
  // Distance + telemetry
  const dx = satSlotPos.x - p.x, dy = satSlotPos.y - p.y, dz = satSlotPos.z - p.z
  const dist = Math.sqrt(dx*dx + dy*dy + dz*dz)
  const distEl = document.getElementById('capsule-distance')
  if (distEl) distEl.textContent = `DIST: ${dist.toFixed(0)}m`
  const tSpd = document.getElementById('cap-tel-spd')
  const tAlt = document.getElementById('cap-tel-alt')
  const tDrift = document.getElementById('cap-tel-drift')
  if (tSpd) tSpd.textContent = speed.toFixed(0)
  if (tAlt) tAlt.textContent = (p.y - probeLaunchPos.y).toFixed(0)
  if (tDrift) {
    const driftDeg = (Math.atan2(steerX, 1) * 180 / Math.PI).toFixed(0)
    tDrift.textContent = `${driftDeg}°`
  }
  // Capture
  if (dist <= SAT_SLOT_CAPTURE_RADIUS) {
    _onSatSlotCapture()
    return
  }
  // SAT_SLOT screen-space indicator
  if (capsuleCamera) {
    const ndc = satSlotPos.clone().project(capsuleCamera)
    const ind = document.getElementById('sat-slot-indicator')
    if (ind) {
      const onScreen = ndc.x > -1 && ndc.x < 1 && ndc.y > -1 && ndc.y < 1 && ndc.z < 1
      ind.style.display = 'block'
      const px = onScreen ? (ndc.x * 0.5 + 0.5) * 100 : THREE.MathUtils.clamp((ndc.x * 0.5 + 0.5) * 100, 5, 95)
      const py = onScreen ? (1 - (ndc.y * 0.5 + 0.5)) * 100 : THREE.MathUtils.clamp((1 - (ndc.y * 0.5 + 0.5)) * 100, 5, 95)
      ind.style.left = px + '%'
      ind.style.top  = py + '%'
    }
  }
  if ((performance.now() - _capsuleStart) / 1000 > CAPSULE_TIMEOUT) {
    showToast('✗ CAPSULE LOST IN SPACE', '#FF4444', 2200)
    _missionFailed()
  }
}

const _capsCamPos = new THREE.Vector3()
const _capsCamLook = new THREE.Vector3()
function renderCapsuleCamScissor() {
  const panel = document.getElementById('capsule-cam-panel')
  if (!panel || panel.style.display === 'none') return
  if (!capsuleMesh) return
  if (!capsuleCamera) capsuleCamera = new THREE.PerspectiveCamera(60, 1, 0.1, 800)
  const rect = panel.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return
  // Chase from behind the velocity vector
  const v = capsuleBody ? capsuleBody.linvel() : { x: 1, y: 0, z: 0 }
  const dir = new THREE.Vector3(v.x, v.y, v.z).normalize()
  if (dir.lengthSq() < 0.0001) dir.set(1, 0, 0)
  _capsCamPos.copy(capsuleMesh.position).addScaledVector(dir, -6).add(new THREE.Vector3(0, 1.5, 0))
  _capsCamLook.copy(capsuleMesh.position).addScaledVector(dir, 4)
  capsuleCamera.position.copy(_capsCamPos)
  capsuleCamera.up.set(0, 1, 0)
  capsuleCamera.lookAt(_capsCamLook)
  capsuleCamera.aspect = rect.width / rect.height
  capsuleCamera.updateProjectionMatrix()
  const canvasRect = renderer.domElement.getBoundingClientRect()
  const sx = Math.round(rect.left - canvasRect.left)
  const sy = Math.round(rect.top  - canvasRect.top)
  renderer.setScissorTest(true)
  renderer.setScissor(sx, sy, Math.round(rect.width), Math.round(rect.height))
  renderer.setViewport(sx, sy, Math.round(rect.width), Math.round(rect.height))
  renderer.render(scene, capsuleCamera)
  renderer.setScissorTest(false)
  renderer.setViewport(0, 0, renderer.domElement.clientWidth, renderer.domElement.clientHeight)
}

function _onSatSlotCapture() {
  console.log('[SAT_SLOT] CAPTURE! samples:', probeSamples.length)
  // Cleanup capsule + probe
  if (capsuleMesh) { scene.remove(capsuleMesh); capsuleMesh.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose() }); capsuleMesh = null }
  if (capsuleBody) { try { physicsWorld.removeRigidBody(capsuleBody) } catch(e){}; capsuleBody = null }
  _cleanupProbe()
  _cleanupSatSlot()
  // Banner
  const banner = document.getElementById('mission-complete-banner')
  const detail = document.getElementById('mission-complete-detail')
  if (detail) detail.textContent = `${probeSamples.length} SAMPLE${probeSamples.length === 1 ? '' : 'S'} DELIVERED TO ORBIT`
  if (banner) {
    banner.style.display = 'block'
    setTimeout(() => { banner.style.display = 'none' }, 4500)
  }
  // Hide capsule cam, return to rover
  const cpanel = document.getElementById('capsule-cam-panel')
  if (cpanel) cpanel.style.display = 'none'
  // Reset state
  roverSamples = []
  probeSamples = []
  window.roverSamples = roverSamples
  updateDrillHUD()
  probeState = 'idle'
  roverAnchored = false
  _refreshLaunchBtn()
  showToast('✦ MISSION COMPLETE · BACK TO ROVER', '#B4FF50', 2500)
}

function _missionFailed() {
  if (capsuleMesh) { scene.remove(capsuleMesh); capsuleMesh.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose() }); capsuleMesh = null }
  if (capsuleBody) { try { physicsWorld.removeRigidBody(capsuleBody) } catch(e){}; capsuleBody = null }
  _cleanupProbe()
  _cleanupSatSlot()
  const cpanel = document.getElementById('capsule-cam-panel')
  if (cpanel) cpanel.style.display = 'none'
  // Samples are lost
  roverSamples = []
  probeSamples = []
  window.roverSamples = roverSamples
  updateDrillHUD()
  probeState = 'idle'
  roverAnchored = false
  _refreshLaunchBtn()
}

// ──────── INIT (wire up buttons) ────────
function initProbeModule() {
  if (initProbeModule._ran) return
  initProbeModule._ran = true
  const btnPrep = document.getElementById('btn-launch-prep')
  if (btnPrep) btnPrep.addEventListener('click', startLaunchPrep)
  // v3 — bottom-bar launch button (always visible)
  const btnSpecLaunch = document.getElementById('btn-launch-specimens')
  if (btnSpecLaunch) btnSpecLaunch.addEventListener('click', () => { if (roverSamples.length >= 1 && probeState === 'idle') startLaunchPrep() })
  _refreshLaunchBtn()
  const btnCancel = document.getElementById('btn-launch-cancel')
  if (btnCancel) btnCancel.addEventListener('click', cancelLaunchPrep)
  const btnFire = document.getElementById('btn-launch-fire')
  if (btnFire) btnFire.addEventListener('click', startLaunchCountdown)
  const btnEject = document.getElementById('btn-eject-capsule')
  if (btnEject) btnEject.addEventListener('click', ejectCapsule)
  // Click ANYWHERE on probe cam panel also triggers eject when in window
  const probePanelEl = document.getElementById('probe-cam-panel')
  if (probePanelEl) probePanelEl.addEventListener('click', () => {
    if (probeState === 'eject_window') ejectCapsule()
  })
  // Patch updateDrillHUD so the launch button refreshes whenever samples change
  const _origUpdate = updateDrillHUD
  // Note: we reassign by wrapping — additive monkey-patch (NO original code removed)
  window._origUpdateDrillHUD = _origUpdate
  // Listen for spacebar / Enter inside the eject window for keyboard eject
  addEventListener('keydown', (e) => {
    if (probeState === 'eject_window' && (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE')) {
      e.preventDefault()
      ejectCapsule()
    }
  })
  // Periodic refresh of the launch button (safe; just toggles display)
  setInterval(_refreshLaunchBtn, 250)

  // v2 — Mouse aim for the capsule chase cam
  const cpanel = document.getElementById('capsule-cam-panel')
  const aimCursor = document.getElementById('capsule-aim-cursor')
  if (cpanel) {
    cpanel.addEventListener('mousemove', (e) => {
      if (probeState !== 'capsule_flying') return
      const rect = cpanel.getBoundingClientRect()
      const nx = ((e.clientX - rect.left) / rect.width)  * 2 - 1
      const ny = ((e.clientY - rect.top)  / rect.height) * 2 - 1
      // tanh curve: responsive near center, soft saturation at edges
      _capsuleMouseX =  Math.tanh(nx * 2.5) * 0.60
      _capsuleMouseY = -Math.tanh(ny * 2.5) * 0.60
      _capsuleMouseActive = true
      if (aimCursor) {
        const px = (e.clientX - rect.left)
        const py = (e.clientY - rect.top)
        aimCursor.style.left = px + 'px'
        aimCursor.style.top  = py + 'px'
      }
    })
    cpanel.addEventListener('mouseleave', () => { _capsuleMouseActive = false; _capsuleMouseX = 0; _capsuleMouseY = 0 })
  }

  // v2 — Sample popup is closable by clicking it
  const popup = document.getElementById('drill-sample-popup')
  if (popup) popup.addEventListener('click', () => { popup.style.display = 'none' })

  console.log('[PROBE_MODULE v2] initialized — countdown + dimmer + mouse-aim cycle ready')
}

window.ProbeDebug = {
  state: () => probeState,
  prep:  startLaunchPrep,
  fire:  launchProbe,
  eject: ejectCapsule,
  fail:  _missionFailed,
  capture: _onSatSlotCapture,
  satPos: () => satSlotPos.toArray()
}

// ═══════════════════════════════════════════════════════════════════════════
// DEBUG TOOLS — exposed on window for console access
// ═══════════════════════════════════════════════════════════════════════════
window.ZoneDebug = {
  // List all custom zones
  list: () => {
    console.table(customZones.map(z => ({
      id: z.zoneId,
      name: z.name,
      type: z.type,
      shape: z.shape,
      position: `(${z.position.x.toFixed(1)}, ${z.position.y.toFixed(1)}, ${z.position.z.toFixed(1)})`,
      color: z.color
    })))
    console.log(`Total zones: ${customZones.length}`)
    return customZones
  },
  
  // Teleport vehicle to a zone
  teleport: (zoneId) => {
    const zone = customZones.find(z => z.zoneId === zoneId)
    if (!zone) {
      console.warn(`[ZoneDebug] Zone not found: ${zoneId}`)
      return
    }
    chassisBody.setTranslation({
      x: zone.position.x,
      y: zone.position.y + zone.dimensions.y + 2,
      z: zone.position.z
    }, true)
    chassisBody.setLinvel({ x: 0, y: 0, z: 0 }, true)
    console.log(`[ZoneDebug] Teleported to zone: ${zone.name}`)
    showToast(`TELEPORTED TO: ${zone.name}`, zone.color, 2000)
  },
  
  // Manually trigger a zone's onEnter event
  trigger: (zoneId) => {
    const zone = customZones.find(z => z.zoneId === zoneId)
    if (!zone) {
      console.warn(`[ZoneDebug] Zone not found: ${zoneId}`)
      return
    }
    onCustomZoneEnter(zone)
    console.log(`[ZoneDebug] Triggered zone: ${zone.name}`)
  },
  
  // Add a test zone at vehicle position
  addTestZone: (type = 'trigger', shape = 'box') => {
    const pos = chassisBody.translation()
    const zone = {
      zoneId: `zone_test_${Date.now()}`,
      name: `Test ${type.toUpperCase()}`,
      type,
      shape,
      dimensions: { x: 10, y: 5, z: 10 },
      position: { x: pos.x, y: pos.y - 2, z: pos.z },
      color: '#00FFE0',
      scale: 'md',
      events: {
        onEnter: {
          fogColor: '#FFFFFF',
          fogDuration: 2000
        }
      }
    }
    customZones.push(zone)
    createZoneVisual(zone)
    createZoneCollider(zone)
    console.log(`[ZoneDebug] Added test zone: ${zone.name}`)
    showToast(`TEST ZONE ADDED`, '#00FFE0', 2000)
  },
  
  // Clear all custom zones
  clear: () => {
    clearAllCustomZones()
    console.log('[ZoneDebug] All zones cleared')
    showToast('ALL ZONES CLEARED', '#FF4444', 2000)
  },
  
  // Get active zones
  active: () => {
    console.log('Active zone IDs:', Array.from(activeCustomZones))
    return Array.from(activeCustomZones)
  }
}

console.log('[ANT ON MARS] ZoneDebug tools available at window.ZoneDebug')
console.log('  window.ZoneDebug.list()     - List all zones')
console.log('  window.ZoneDebug.teleport() - Teleport to zone')
console.log('  window.ZoneDebug.trigger()  - Trigger zone event')
console.log('  window.ZoneDebug.addTestZone() - Add test zone')
console.log('  window.ZoneDebug.clear()    - Clear all zones')
console.log('  window.ZoneDebug.active()   - List active zones')

// ═══════════════════════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════════════════════
init().catch(err=>{console.error('Boot failed:',err);const loader=document.getElementById('loader');if(loader)loader.remove();document.body.insertAdjacentHTML('beforeend',`<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);color:#ff4444;font-family:monospace;font-size:14px;z-index:9999;text-align:center;background:#0a0205;padding:20px;border:1px solid #ff4444">BOOT ERROR:<br>${err.message}</div>`)})
