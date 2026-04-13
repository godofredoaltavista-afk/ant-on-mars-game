/**
 * Heightfield - Terrain physics collider with incremental build
 */
export class Heightfield {
  constructor(physics) {
    this.physics = physics
    this.hfBody = null
    this.hfCollider = null
    this.hfCenter = { x: 0, z: 0 }
    this.HF_SIZE = 600
    this.HF_RES = 200
    this.HF_RETHRESHOLD = 150
    this._pending = false
    this._heights = null
    this._row = 0
    this.ROWS_PER_FRAME = 20
    this._finalizeStage = 0
    this._stagedHeights = null
  }

  create(cx, cz, getTerrainHeight) {
    this.hfCenter = { x: cx, z: cz }
    this._heights = new Float32Array((this.HF_RES + 1) * (this.HF_RES + 1))
    this._row = 0
    this._pending = true

    for (let row = 0; row <= this.HF_RES; row++) {
      for (let col = 0; col <= this.HF_RES; col++) {
        const wx = cx + (col / this.HF_RES - 0.5) * this.HF_SIZE
        const wz = cz + (row / this.HF_RES - 0.5) * this.HF_SIZE
        this._heights[row + col * (this.HF_RES + 1)] = getTerrainHeight(wx, wz) - 0.15
      }
    }
    this._finalize()
  }

  _finalize() {
    const R = this.physics.RAPIER
    if (this.hfCollider) {
      try { this.physics.world.removeCollider(this.hfCollider, false) } catch(e) {}
      this.hfCollider = null
    }
    if (this.hfBody) {
      try { this.physics.world.removeRigidBody(this.hfBody) } catch(e) {}
      this.hfBody = null
    }

    this.hfBody = this.physics.world.createRigidBody(
      R.RigidBodyDesc.fixed().setTranslation(this.hfCenter.x, 0, this.hfCenter.z)
    )
    this.hfCollider = this.physics.world.createCollider(
      R.ColliderDesc.heightfield(this.HF_RES, this.HF_RES, this._heights, { x: this.HF_SIZE, y: 1, z: this.HF_SIZE })
        .setFriction(0.8).setRestitution(0.1),
      this.hfBody
    )
    this._pending = false
  }

  needsRefresh(px, pz) {
    if (this._pending) return false
    const dx = px - this.hfCenter.x
    const dz = pz - this.hfCenter.z
    return dx * dx + dz * dz > this.HF_RETHRESHOLD * this.HF_RETHRESHOLD
  }
}
