/**
 * PhysicsWorld - RAPIER world, gravity, step
 */
import RAPIER from '@dimforge/rapier3d-compat'

export class PhysicsWorld {
  constructor() {
    this.world = null
    this.gravity = { x: 0, y: -9.81, z: 0 }
  }

  async init() {
    await RAPIER.init()
    this.world = new RAPIER.World(this.gravity)
    this.world.timestep = 1 / 60
    return this
  }

  step() {
    try {
      this.world.step()
    } catch (e) {
      console.warn('Physics step failed:', e)
    }
  }

  setGravity(x, y, z) {
    this.gravity = { x, y, z }
    this.world.gravity = this.gravity
  }

  get RAPIER() {
    return RAPIER
  }
}
