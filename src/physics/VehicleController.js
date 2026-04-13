/**
 * VehicleController - Rapier vehicle, wheel config, steering, forces
 */
import * as THREE from 'three/webgpu'

export class VehicleController {
  constructor(physics, scene) {
    this.physics = physics
    this.scene = scene
    this.vehicle = null
    this.chassisBody = null
    this.chassisGroup = null
    this.wheelMeshes = []
    this.wheelSpins = [0, 0, 0, 0]
    this.chassisPos = new THREE.Vector3()
    this.chassisQuat = new THREE.Quaternion()

    // Settings
    this.settings = {
      steer: 0.5,
      acceleration: 5,
      deceleration: 0.23,
      maxSpeed: 15,
      boostMultiplier: 2.5,
      jumpForce: 6,
      jumpCrouchTime: 0.05,
      flipForce: 2,
      grip: 2,
      tireLerp: 0.3,
    }

    // Constants
    this.WHEEL_R = 0.45
    this.WHEEL_W = 0.3
    this.SUSP_REST = 0.6
    this.WHEEL_OFF = { x: 1.0, y: 0.1, z: 0.68 }
    this.CHASSIS_HW = 1.0
    this.CHASSIS_HH = 0.35
    this.CHASSIS_HD = 0.6
  }

  createChassis(startH) {
    const R = this.physics.RAPIER
    this.chassisBody = this.physics.world.createRigidBody(
      R.RigidBodyDesc.dynamic().setTranslation(0, startH, 0).setCanSleep(false)
    )

    this.physics.world.createCollider(
      R.ColliderDesc.cuboid(this.CHASSIS_HW, this.CHASSIS_HH, this.CHASSIS_HD)
        .setMassProperties(2.5, { x: 0, y: -0.3, z: 0 }, { x: 0.4, y: 1.1, z: 0.9 }, { x: 0, y: 0, z: 0, w: 1 })
        .setFriction(0.5),
      this.chassisBody
    )

    this.chassisGroup = new THREE.Group()
    this.scene.add(this.chassisGroup)

    return this.chassisBody
  }

  createVehicle() {
    const R = this.physics.RAPIER
    this.vehicle = this.physics.world.createVehicleController(this.chassisBody)

    const wheelConns = [
      { x: this.WHEEL_OFF.x, y: this.WHEEL_OFF.y, z: this.WHEEL_OFF.z },
      { x: this.WHEEL_OFF.x, y: this.WHEEL_OFF.y, z: -this.WHEEL_OFF.z },
      { x: -this.WHEEL_OFF.x, y: this.WHEEL_OFF.y, z: this.WHEEL_OFF.z },
      { x: -this.WHEEL_OFF.x, y: this.WHEEL_OFF.y, z: -this.WHEEL_OFF.z },
    ]
    const dirCs = { x: 0, y: -1, z: 0 }
    const axleCs = { x: 0, y: 0, z: 1 }

    for (let i = 0; i < 4; i++) {
      this.vehicle.addWheel(wheelConns[i], dirCs, axleCs, this.SUSP_REST, this.WHEEL_R)
      this.vehicle.setWheelFrictionSlip(i, this.settings.grip)
      this.vehicle.setWheelSuspensionStiffness(i, 12)
      this.vehicle.setWheelMaxSuspensionForce(i, 300)
      this.vehicle.setWheelMaxSuspensionTravel(i, 1.2)
      this.vehicle.setWheelSuspensionCompression(i, 1.8)
      this.vehicle.setWheelSuspensionRelaxation(i, 4.5)
      this.vehicle.setWheelSideFrictionStiffness(i, 2)

      const tc = new THREE.Group()
      this.scene.add(tc)
      this.wheelMeshes.push(tc)
    }

    this.wheelConns = wheelConns
    return this.vehicle
  }

  setWheelMeshes(meshes) {
    this.wheelMeshes = meshes
  }

  update(dt, input, camera) {
    if (!this.vehicle || !this.chassisBody) return

    const accel = (input.isDown('KeyW') ? 1 : 0) - (input.isDown('KeyS') ? 1 : 0)
    const steer = (input.isDown('KeyA') ? 1 : 0) - (input.isDown('KeyD') ? 1 : 0)
    const boosting = input.isDown('ShiftLeft') || input.isDown('ShiftRight')

    const vel = this.chassisBody.linvel()
    const fwd = new THREE.Vector3(1, 0, 0).applyQuaternion(this.chassisQuat)
    const forwardSpeed = fwd.x * vel.x + fwd.y * vel.y + fwd.z * vel.z
    const speed = Math.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2)

    const topSpeed = this.settings.maxSpeed * (boosting ? this.settings.boostMultiplier : 1)
    const overSpeed = Math.max(0, Math.abs(forwardSpeed) - topSpeed)
    let engineForce = (accel * this.settings.acceleration * (boosting ? this.settings.boostMultiplier : 1)) / (1 + overSpeed)
    let brake = 0
    if (!accel) brake = this.settings.deceleration * 0.15
    if (speed > 0.5 && ((accel > 0 && forwardSpeed < -0.5) || (accel < 0 && forwardSpeed > 0.5))) {
      brake = this.settings.deceleration
      engineForce = 0
    }

    const steerAngle = steer * this.settings.steer * Math.sqrt(this.settings.acceleration / 5)
    this.vehicle.setWheelSteering(0, steerAngle)
    this.vehicle.setWheelSteering(1, steerAngle)

    for (let i = 0; i < 4; i++) {
      this.vehicle.setWheelEngineForce(i, engineForce)
      this.vehicle.setWheelBrake(i, brake)
      this.vehicle.setWheelFrictionSlip(i, this.settings.grip)
    }

    // Update visual
    const p = this.chassisBody.translation()
    const r = this.chassisBody.rotation()
    this.chassisPos.set(p.x, p.y, p.z)
    this.chassisQuat.set(r.x, r.y, r.z, r.w)
    this.chassisGroup.position.copy(this.chassisPos)
    this.chassisGroup.quaternion.copy(this.chassisQuat)

    // Update wheels
    const UP = new THREE.Vector3(0, 1, 0)
    const SPIN_AXIS = new THREE.Vector3(0, 0, 1)
    for (let i = 0; i < 4; i++) {
      const conn = this.wheelConns[i]
      const inContact = this.vehicle.wheelIsInContact(i)
      const suspLen = inContact ? (this.vehicle.wheelSuspensionLength(i) ?? this.SUSP_REST) : this.SUSP_REST
      const wheelPos = new THREE.Vector3(conn.x, conn.y - suspLen, conn.z).applyQuaternion(this.chassisQuat).add(this.chassisPos)

      if (this.wheelMeshes[i]) {
        this.wheelMeshes[i].position.x = wheelPos.x
        this.wheelMeshes[i].position.y = THREE.MathUtils.lerp(this.wheelMeshes[i].position.y, wheelPos.y, this.settings.tireLerp)
        this.wheelMeshes[i].position.z = wheelPos.z

        const wheelQuat = this.chassisQuat.clone()
        if (i < 2) {
          const steerQ = new THREE.Quaternion().setFromAxisAngle(UP, steerAngle)
          wheelQuat.multiply(steerQ)
        }
        if (inContact) this.wheelSpins[i] -= (forwardSpeed / this.WHEEL_R) * dt
        const spinQ = new THREE.Quaternion().setFromAxisAngle(SPIN_AXIS, this.wheelSpins[i])
        wheelQuat.multiply(spinQ)
        this.wheelMeshes[i].quaternion.slerp(wheelQuat, this.settings.tireLerp)
      }
    }
  }

  wheelsOnGround() {
    let count = 0
    for (let i = 0; i < 4; i++) {
      if (this.vehicle?.wheelIsInContact(i)) count++
    }
    return count
  }

  reset(startH) {
    this.chassisBody.setTranslation({ x: 0, y: startH, z: 0 }, true)
    this.chassisBody.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
    this.chassisBody.setLinvel({ x: 0, y: 0, z: 0 }, true)
    this.chassisBody.setAngvel({ x: 0, y: 0, z: 0 }, true)
    this.wheelSpins.fill(0)
  }
}
