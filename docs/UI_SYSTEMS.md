# ANT ON MARS — UI SYSTEMS
> Draggeable. Transparent. Stateful. Argentine-engineered.

---

## UI PHILOSOPHY

Every panel in this app is:
- **Draggeable** — can be repositioned anywhere on screen
- **Stateful** — remembers open/closed, position, config via localStorage
- **Transparent** — glass-morphism aesthetic, opacity layers
- **Zone-aware** — each panel spawns in a specific screen quadrant

The HUD is not decorative. It's the control surface of a physics world.

---

## PANEL INVENTORY

### TELEMETRY PANEL (top-left)
- Real-time vehicle data: LAT / LON / ALT / MOUSE XY
- Physics state: velocity, suspension load, gravity mode
- SYS indicator: DARK/LIGHT theme state
- Always visible in DRIVE MARS mode

### GRAVITY MODE CONTROLS (bottom bar)
```
[ GRAVITY ] [ MAG ] [ HOOK ] [ FLOAT ] [ ▶ DRIVE MARS ] [ ◉ CONSTRUCT ] [ MAP ]
```
Each button toggles a physics mode:
- **GRAVITY** — 9.81 standard, vehicle sticks to terrain
- **MAG** — magnetic surface attraction
- **HOOK** — grapple physics constraint
- **FLOAT** — zero gravity, free 3D movement
- **DRIVE MARS** — activates vehicle control mode
- **CONSTRUCT** — opens the GLB constructor panel
- **MAP** — toggles the minimap overlay

### CONSTRUCTOR PANEL (right side)
- GLB catalog grid — 8 assets from R2
- Drag-and-drop local GLB upload zone
- Object list of placed items
- Inspector with:
  - Object name (editable)
  - Collision mode selector: `convexHull` / `trimesh` / `none`
  - Transform controls (position, rotation, scale)
  - Delete button

### SETUP / ENGINE / DASHBOARD TABS (top nav)
- **MISSION** — world zone selector, narrative context
- **SETUP** — physics config, terrain settings, fog controls
- **ENGINE** — stats panel (stats-gl), Rapier debug overlay
- **DASHBOARD** — save/load world, export, session info

### MINIMAP (bottom-right overlay)
- Top-down view of placed objects + vehicle position
- Toggleable, draggeable
- Shows world zone boundaries

### THEME TOGGLE (top-right)
- DARK / LIGHT mode
- Zero-flicker via CSS variables on `data-theme`
- Persisted in localStorage
- Three.js material sync on toggle (fog color, background)

---

## DRAGGEABLE SYSTEM

All panels implement the same drag pattern:
```js
// Mousedown on header → track delta → mousemove updates panel position
panel.style.left = `${startLeft + dx}px`
panel.style.top = `${startTop + dy}px`
```
No external library. Pure DOM event listeners.
Panels clamp to viewport edges to prevent going offscreen.

---

## TRANSPARENCY / GLASS STATES

Panels have 3 opacity states:
- **Active** — full opacity, blur backdrop
- **Idle** — reduced opacity (user not hovering)
- **Hidden** — `display: none` or `opacity: 0` + `pointer-events: none`

CSS variables control all glass values:
```css
--panel-bg: rgba(0, 0, 0, 0.72);
--panel-blur: blur(12px);
--panel-border: rgba(255, 255, 255, 0.08);
```

---

## STATE PERSISTENCE (localStorage keys)

| Key | Value |
|---|---|
| `ant-theme` | `'dark'` \| `'light'` |
| `ant-world-save` | JSON string of placed objects |
| `ant-panel-positions` | JSON map of panel positions |
| `ant-physics-mode` | current gravity mode string |

---

## WINDOW / MODAL SYSTEM

Some panels open sub-windows (e.g. object config, world settings).
Pattern:
- Button click → `panel.classList.add('open')` → CSS transition in
- Close via X button or Escape key
- Config changes fire immediately (no "apply" button needed)
- Name fields are `contenteditable` spans, blur saves the value

---

## ADDING A NEW PANEL (pattern)

1. Add HTML structure to `index.html` with class `ant-panel`
2. Add drag initialization in `main.js` `initDrag(panelEl)`
3. Add toggle button to bottom bar
4. Save open state to localStorage on toggle
5. Style with existing CSS variables — no new color tokens

---

## HUD MODES BY GAME STATE

| State | Active Panels |
|---|---|
| Intro / loading | Logo, loading bar |
| DRIVE MARS | Telemetry, gravity bar, minimap |
| CONSTRUCT | Constructor panel, object list, inspector |
| DASHBOARD | Save/load UI, world thumbnail grid |
| FLOAT mode | Telemetry + float indicator, no terrain shadow |
