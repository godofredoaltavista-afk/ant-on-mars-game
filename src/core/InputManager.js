/**
 * InputManager - Keyboard/mouse state, event emission
 */
import { EventBus } from './EventBus'

export class InputManager {
  constructor(eventBus = EventBus) {
    this.keys = {}
    this.eventBus = eventBus
    this._boundKeyDown = this._onKeyDown.bind(this)
    this._boundKeyUp = this._onKeyUp.bind(this)
    this._setupListeners()
  }

  _setupListeners() {
    window.addEventListener('keydown', this._boundKeyDown)
    window.addEventListener('keyup', this._boundKeyUp)
  }

  _onKeyDown(e) {
    this.keys[e.code] = true
    this.eventBus.emit('input:keyDown', { code: e.code, repeat: e.repeat })
  }

  _onKeyUp(e) {
    this.keys[e.code] = false
    this.eventBus.emit('input:keyUp', { code: e.code })
  }

  isDown(code) {
    return !!this.keys[code]
  }

  dispose() {
    window.removeEventListener('keydown', this._boundKeyDown)
    window.removeEventListener('keyup', this._boundKeyUp)
  }
}
