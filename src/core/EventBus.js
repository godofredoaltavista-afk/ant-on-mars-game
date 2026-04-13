/**
 * EventBus - Decoupled module communication via pub/sub
 */
export const EventBus = {
  _listeners: new Map(),

  on(event, fn) {
    if (!this._listeners.has(event)) this._listeners.set(event, [])
    this._listeners.get(event).push(fn)
    return () => this.off(event, fn)
  },

  off(event, fn) {
    const fns = this._listeners.get(event)
    if (fns) {
      const idx = fns.indexOf(fn)
      if (idx !== -1) fns.splice(idx, 1)
    }
  },

  emit(event, data) {
    const fns = this._listeners.get(event)
    if (fns) fns.forEach(fn => fn(data))
  },

  once(event, fn) {
    const off = this.on(event, (data) => { off(); fn(data) })
  }
}
