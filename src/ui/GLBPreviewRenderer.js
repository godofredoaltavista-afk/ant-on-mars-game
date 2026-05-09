import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

const DRACO_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'
const CYAN = 0x00FFE0

export class GLBPreviewRenderer {
  constructor(canvas, glbUrl, options = {}) {
    this.canvas = canvas
    this.glbUrl = glbUrl
    this.assetName = options.assetName || ''
    this.options = {
      backgroundColor: 0x030303,
      rotationSpeed: 0.016,
      pixelRatio: Math.min(window.devicePixelRatio, 2),
      ...options,
    }
    this._animId = null
    this._renderer = null
    this._scene = null
    this._camera = null
    this._model = null
    this._t = Math.random() * Math.PI * 2
    this._running = false
  }

  async init() {
    const canvas = this.canvas
    const W = canvas.width || 64
    const H = canvas.height || 64

    this._renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
    this._renderer.setSize(W, H, false)
    this._renderer.setPixelRatio(this.options.pixelRatio)
    this._renderer.setClearColor(this.options.backgroundColor, 1)

    this._scene = new THREE.Scene()

    this._camera = new THREE.PerspectiveCamera(45, W / H, 0.01, 100)
    this._camera.position.set(2, 1.5, 2)
    this._camera.lookAt(0, 0, 0)

    this._scene.add(new THREE.AmbientLight(0x102020, 0.7))
    const dir = new THREE.DirectionalLight(0xffffff, 1.2)
    dir.position.set(3, 5, 3)
    this._scene.add(dir)
    const rim = new THREE.DirectionalLight(CYAN, 0.6)
    rim.position.set(-2, 1, -2)
    this._scene.add(rim)

    const grid = new THREE.GridHelper(4, 8, 0x0a2020, 0x050f0f)
    grid.position.y = -1
    this._scene.add(grid)

    try {
      await this._loadModel()
    } catch {
      this._addFallback()
    }

    this.start()
  }

  _loadModel() {
    return new Promise((resolve, reject) => {
      const draco = new DRACOLoader()
      draco.setDecoderPath(DRACO_PATH)
      const loader = new GLTFLoader()
      loader.setDRACOLoader(draco)

      loader.load(
        this.glbUrl,
        (gltf) => {
          const model = gltf.scene
          const box = new THREE.Box3().setFromObject(model)
          const center = box.getCenter(new THREE.Vector3())
          const size = box.getSize(new THREE.Vector3())
          const maxDim = Math.max(size.x, size.y, size.z) || 1

          model.position.sub(center)
          model.scale.setScalar(1.8 / maxDim)

          model.traverse(child => {
            if (!child.isMesh) return
            const mats = Array.isArray(child.material) ? child.material : [child.material]
            mats.forEach(m => {
              if (m.emissiveIntensity !== undefined && m.emissiveIntensity < 0.01) {
                m.emissiveIntensity = 0.05
              }
            })
          })

          const dist = (1.8 / maxDim) * maxDim * 2.2
          this._camera.position.set(dist, dist * 0.6, dist)
          this._camera.lookAt(0, 0, 0)
          this._camera.updateProjectionMatrix()

          this._model = model
          this._scene.add(model)
          draco.dispose()
          resolve()
        },
        undefined,
        (err) => { draco.dispose(); reject(err) }
      )
    })
  }

  _addFallback() {
    const name = (this.assetName || this.glbUrl || '').toLowerCase()
    let geo
    if (name.includes('sphere') || name.includes('ball') || name.includes('moon') || name.includes('planet')) {
      geo = new THREE.SphereGeometry(0.8, 10, 10)
    } else if (name.includes('van') || name.includes('car') || name.includes('rover') || name.includes('vehicle') || name.includes('camion')) {
      geo = new THREE.BoxGeometry(1.4, 0.5, 0.7)
    } else if (name.includes('portal') || name.includes('wheel') || name.includes('ring') || name.includes('rueda') || name.includes('torus')) {
      geo = new THREE.TorusGeometry(0.6, 0.18, 8, 18)
    } else if (name.includes('mountain') || name.includes('terrain') || name.includes('lava') || name.includes('selva') || name.includes('coast')) {
      geo = new THREE.ConeGeometry(0.9, 1.5, 7)
    } else if (name.includes('mate') || name.includes('vase') || name.includes('bottle') || name.includes('cup')) {
      geo = new THREE.CylinderGeometry(0.3, 0.5, 1.2, 10)
    } else if (name.includes('dragon') || name.includes('qilin') || name.includes('horse') || name.includes('figure')) {
      geo = new THREE.IcosahedronGeometry(0.8, 1)
    } else {
      const pool = [
        new THREE.OctahedronGeometry(0.8, 0),
        new THREE.IcosahedronGeometry(0.7, 0),
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.TetrahedronGeometry(0.9, 0),
      ]
      geo = pool[this.assetName.length % pool.length]
    }

    const mat = new THREE.MeshStandardMaterial({ color: 0x0d2020, emissive: CYAN, emissiveIntensity: 0.2, roughness: 0.7, metalness: 0.5 })
    const wireMat = new THREE.MeshBasicMaterial({ color: CYAN, wireframe: true, opacity: 0.18, transparent: true })
    this._model = new THREE.Group()
    this._model.add(new THREE.Mesh(geo, mat), new THREE.Mesh(geo, wireMat))
    this._scene.add(this._model)
  }

  start() {
    if (this._running) return
    this._running = true
    const loop = () => {
      if (!this._running) return
      this._animId = requestAnimationFrame(loop)
      this._t += this.options.rotationSpeed
      if (this._model) {
        this._model.rotation.y = this._t
        this._model.rotation.x = Math.sin(this._t * 0.3) * 0.08
      }
      if (this._renderer && this._scene && this._camera) {
        this._renderer.render(this._scene, this._camera)
      }
    }
    loop()
  }

  stop() {
    this._running = false
    if (this._animId) { cancelAnimationFrame(this._animId); this._animId = null }
  }

  dispose() {
    this.stop()
    if (this._scene) {
      this._scene.traverse(obj => {
        obj.geometry?.dispose()
        const mats = obj.material ? (Array.isArray(obj.material) ? obj.material : [obj.material]) : []
        mats.forEach(m => m.dispose())
      })
    }
    if (this._renderer) {
      this._renderer.dispose()
      this._renderer.forceContextLoss()
      this._renderer = null
    }
    this._scene = null
    this._model = null
  }

  takeSnapshot(size = 256) {
    if (!this._renderer || !this._scene || !this._camera) return null
    this._renderer.setSize(size, size, false)
    this._camera.aspect = 1
    this._camera.updateProjectionMatrix()
    this._renderer.render(this._scene, this._camera)
    const url = this._renderer.domElement.toDataURL('image/png')
    const W = this.canvas.width || 64
    this._renderer.setSize(W, W, false)
    this._camera.aspect = 1
    this._camera.updateProjectionMatrix()
    return url
  }
}
