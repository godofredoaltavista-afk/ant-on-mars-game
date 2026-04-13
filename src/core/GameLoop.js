/**
 * GameLoop - Fixed timestep physics + variable render
 */
export class GameLoop {
  constructor(engine, fixedDt = 1 / 60) {
    this.engine = engine
    this.fixedDt = fixedDt
    this.accumulator = 0
    this.lastTime = 0
    this._tickCallback = null
  }

  start(onTick) {
    this._tickCallback = onTick
    this.lastTime = performance.now()
    this.engine.start((dt) => this._loop(performance.now()))
  }

  _loop(now) {
    const dt = Math.min((now - this.lastTime) / 1000, 0.1)
    this.lastTime = now
    this.accumulator += dt

    while (this.accumulator >= this.fixedDt) {
      if (this._tickCallback) this._tickCallback(this.fixedDt)
      this.accumulator -= this.fixedDt
    }

    this.engine.render()
  }
}
