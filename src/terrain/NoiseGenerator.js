/**
 * NoiseGenerator - ImprovedNoise wrapper, seeded random
 */
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js'

export class NoiseGenerator {
  constructor() {
    this.perlin = new ImprovedNoise()
  }

  getTerrainHeight(x, z, settings) {
    const s = settings.frequency
    const a = settings.amplitude
    let h = 0
    h += this.perlin.noise(x * s, 0, z * s) * a
    h += this.perlin.noise(x * s * 2, 1, z * s * 2) * a * 0.5
    h += this.perlin.noise(x * s * 4, 2, z * s * 4) * a * 0.25
    return h
  }

  seededRand(x, z, seed) {
    let n = Math.sin(x * 12.9898 + z * 78.233 + seed * 43.1234) * 43758.5453
    return n - Math.floor(n)
  }
}
