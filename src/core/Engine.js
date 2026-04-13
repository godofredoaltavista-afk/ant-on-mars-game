/**
 * Engine - Three.js WebGPU renderer, scene, camera, animation loop
 */
import * as THREE from 'three/webgpu'
import Stats from 'stats-gl'

export class Engine {
  constructor() {
    this.scene = null
    this.camera = null
    this.renderer = null
    this.stats = null
    this._animationId = null
  }

  async init() {
    // Scene
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color('#0a0205')
    this.scene.fog = new THREE.Fog('#3d1a0e', 60, 200)

    // Camera
    this.camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500)
    this.camera.position.set(-8, 5, 0)

    // Renderer
    this.renderer = new THREE.WebGPURenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    this.renderer.setSize(innerWidth, innerHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    document.body.appendChild(this.renderer.domElement)
    await this.renderer.init()

    // Stats
    this.stats = new Stats({ trackGPU: true })
    document.body.appendChild(this.stats.dom)
    this.stats.dom.style.display = 'none'
    this.stats.init(this.renderer)

    // Lights
    this._setupLights()

    // Resize handler
    window.addEventListener('resize', () => this._onResize())

    return this
  }

  _setupLights() {
    const ambientLight = new THREE.AmbientLight(0xfff0d0, 0.6)
    this.scene.add(ambientLight)

    const redAmbient = new THREE.AmbientLight(0xcc3318, 0.8)
    this.scene.add(redAmbient)

    const shadowRedFill = new THREE.HemisphereLight(0xfff4e8, 0xcc8855, 0.7)
    this.scene.add(shadowRedFill)

    const dirLight = new THREE.DirectionalLight(0xfff0d8, 3.5)
    dirLight.position.set(10, 20, 10)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.set(2048, 2048)
    dirLight.shadow.camera.near = 0.5
    dirLight.shadow.camera.far = 100
    dirLight.shadow.camera.left = -60
    dirLight.shadow.camera.right = 60
    dirLight.shadow.camera.top = 60
    dirLight.shadow.camera.bottom = -60
    dirLight.shadow.bias = -0.001
    dirLight.shadow.normalBias = 0.02
    this.scene.add(dirLight)
    this.scene.add(dirLight.target)

    // Store references for later modification
    this.lights = { ambientLight, redAmbient, shadowRedFill, dirLight }
  }

  _onResize() {
    this.camera.aspect = innerWidth / innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(innerWidth, innerHeight)
  }

  start(renderCallback) {
    const loop = async () => {
      this._animationId = requestAnimationFrame(loop)
      if (renderCallback) await renderCallback()
      this.stats?.update()
    }
    loop()
  }

  stop() {
    if (this._animationId) {
      cancelAnimationFrame(this._animationId)
      this._animationId = null
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera)
  }

  setLoading(text, pct) {
    const status = document.getElementById('loader-status')
    const bar = document.getElementById('loader-bar')
    if (status) status.textContent = text
    if (bar) bar.style.width = pct + '%'
  }

  hideLoader() {
    const loader = document.getElementById('loader')
    if (loader) {
      setTimeout(() => {
        loader.style.opacity = '0'
        setTimeout(() => loader.remove(), 600)
      }, 300)
    }
  }
}
