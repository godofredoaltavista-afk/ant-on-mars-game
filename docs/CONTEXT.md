# 📋 CONTEXT — ANT ON MARS v1.0
## Architecture, UI Components & Sonnet Prompting Guide

> **Target Model:** Claude Sonnet 4.6 (200k context)
> **Project Type:** 3D WebGL Game — Three.js WebGPU + Rapier Physics
> **Stack:** Vite 8 + Vanilla JS + CSS3 + HTML5
> **Status:** Monolithic → Modular migration in progress
> **Dev Style:** Argentine tech lead, direct, no-bullshit, ship fast

---

## 🏗️ ARCHITECTURE OVERVIEW

### Project Structure
```
ant-on-mars-qwen/
├── index.html                    # Main HTML — ALL UI elements defined here
├── package.json                  # Dependencies: three, rapier3d, stats-gl, vite
├── vite.config.js                # Path aliases: @core, @physics, @terrain, @player, @ui, @assets, @systems
├── src/
│   ├── main.js                   # ⚠️ MONOLITHIC — 3343 lines, EVERYTHING lives here
│   ├── style.css                 # ALL CSS — glass panels, animations, responsive
│   ├── core/
│   │   ├── Engine.js             # Three.js scene, camera, renderer, lights
│   │   ├── EventBus.js           # Pub/sub event system for module communication
│   │   ├── GameLoop.js           # Fixed timestep physics + variable render
│   │   └── InputManager.js       # Keyboard state, event emission
│   ├── physics/
│   │   ├── PhysicsWorld.js       # Rapier world wrapper, gravity, step
│   │   ├── VehicleController.js  # Vehicle physics, wheel config, steering
│   │   └── Heightfield.js        # Terrain physics collider, incremental build
│   ├── terrain/
│   │   └── NoiseGenerator.js     # ImprovedNoise wrapper, seeded random
│   ├── player/                   # 📁 EMPTY — Player controller goes here
│   ├── splats/                   # 📁 EMPTY — Gaussian splat rendering
│   ├── ui/                       # 📁 EMPTY — UI components
│   └── assets/                   # Static assets (images, icons)
├── public/
│   ├── GLB/                      # 3D models — 60+ GLB files
│   │   ├── manifest.json         # Auto-loaded catalog of all GLB files
│   │   ├── DEFAULTS/             # Default vehicle/terrain models
│   │   └── [60+ .glb files]      # Meshy AI generated assets
│   └── newsGLB/                  # New GLB assets
├── plans/                        # Implementation plans
└── screenshots/                  # WhatsApp screenshots of progress
```

### Key Architecture Decision
**The game currently runs from [`src/main.js`](src/main.js:1) — a single 3343-line file that contains:**
- Game initialization (lines 173-268)
- Terrain generation (lines 273-329)
- Heightfield physics (lines 334-348)
- Vehicle creation with GLB loading (lines 358-565)
- Particle systems (dust, splash, wind, debris) (lines 570-607)
- Scatter system (procedural rocks/bushes) (lines 612-664)
- UI setup with settings panels (lines 669-1085)
- Event handling (lines 1090-1171)
- Game loop with all subsystems (lines 1176-1372)
- Drive modes (gravity, magnetic, hook, float) (lines 1377-1537)
- Anti-gravity system (lines 1542-1578)
- World zones (lines 1583-1620)
- Teleport/respawn (lines 1625-1776)
- Save/Load/Export/Import (lines 1781-2007)
- Constructor mode (lines 2267-2386)
- GLB collision system (lines 2417-2441)
- Particle updates (lines 2461-2524)
- Telemetry (lines 2529-2549)
- Custom zones with triggers (lines 2554-2800)
- Modal system (lines 2807-2946)
- Minimap rendering (lines 3017-3236)
- Debug tools (lines 3248-3337)

**The modular architecture in `src/core/`, `src/physics/`, `src/terrain/` exists but is NOT YET wired into main.js.**

---

## 🎨 UI COMPONENTS BREAKDOWN

### 1. TELEMETRY HUD — [`index.html:22-42`](index.html:22)
```
Position: Fixed top-left (16px, 16px)
Style: Glass panel, cyan accent (#00FFE0)
Font: Share Tech Mono, 11px
```

**Behavior:**
- **Collapsible** — Click header (`#tel-toggle-btn`) to expand/collapse body
- **Live data** — Speed, Turn %, Heading, Tilt, Terrain state, Distance, Time, Avg speed, Gravity mode, Drive mode, Position, Zone, Unlocked count, Session timer
- **Zone color propagation** — When entering a world zone, ALL `.tel-label` elements transition to the zone's color over 1.5s ease
- **Constructor mode fade** — Gets `.ctor-faded` class (opacity 0.15, pointer-events none)

**Data flow:**
```javascript
// Updated every frame in animate() → updateTelemetry()
document.getElementById('hud-speed').textContent = spd.toFixed(3) + ' m/s'
document.getElementById('hud-hdg').textContent = hdg.toFixed(1) + '°'
// ... etc
```

---

### 2. DRIVE MODE PANEL — [`index.html:45-56`](index.html:45)
```
Position: Fixed bottom-left (16px, 80px)
Style: Glass panel, dynamic accent color
Tabs: GRAVITY [G] · MAGNETIC [Z] · HOOK [H] · FLOAT [F]
```

**Behavior:**
- **Tab switching** — Click tab → `setDriveMode(mode)` called
- **Active state** — `.active` class with glow effect matching mode color
  - Gravity → Cyan (#00FFE0)
  - Magnetic → Blue (#00AAFF)
  - Hook → Red (#FF4444)
  - Float → Lime (#B4FF50)
- **Status text** — `#drive-mode-status` shows current sub-state
- **Accent propagation** — `data-accent` attribute changes panel border/glow

**Mode switching logic:**
```javascript
function setDriveMode(mode) {
  // Exit previous mode cleanup
  if (prev === 'float' && mode !== 'float') exitFloatMode()
  
  vehicleMode = mode
  // Update UI classes
  document.querySelectorAll('.drive-tab').forEach(t => 
    t.classList.toggle('active', t.dataset.mode === mode)
  )
  // Mode-specific physics changes
  if (mode === 'magnetic') {
    carSettings.jumpForce = 0
    for (let i = 0; i < 4; i++) vehicle.setWheelFrictionSlip(i, 50)
  }
  // Propagate color to UI
  const modeIndicator = document.getElementById('mode-indicator')
  modeIndicator.style.borderColor = modeColor
}
```

---

### 3. GRAVITY TANKS HUD — [`index.html:59-73`](index.html:59)
```
Position: Fixed bottom-left (16px, 120px)
Style: 5 vertical bars + timer bar + ANTIGRAV button
Draggable: Yes (makeDraggable)
```

**Behavior:**
- **5 tank bars** — `#gtank-0` through `#gtank-4`
  - `.full` class → cyan background + glow
  - `.empty` class → transparent
  - `.active-pulse` class → pulsing animation when anti-grav active
- **Partial fill** — When recharging, gradient shows partial progress
- **Timer bar** — Shows remaining anti-grav time (999ms per tank)
- **ANTIGRAV button** — Toggles anti-gravity mode, changes text/state

**State machine:**
```
5 tanks → Use 1 → 4 tanks + anti-grav active → 999ms timer → tank consumed
When not active: 1 tank recharges every 8 seconds (partial fill animation)
```

---

### 4. SETTINGS PANEL — [`index.html:76-80`](index.html:76)
```
Position: Fixed top-right (16px, 16px)
Style: Dark glass, 280px wide, max-height viewport
Toggle: #settings-toggle button (top-right corner)
```

**Behavior:**
- **Accordion folders** — Each settings category is a collapsible folder
  - Car, Camera, Terrain, Fog, Dust, Lighting, Biomes, Ruins, Presets
- **Folder animation** — Chevron rotates 90°, body max-height transitions
- **Control types:**
  - **Sliders** — Range input + value display, live-update settings object
  - **Checkboxes** — Custom div with ✓ when active
  - **Color pickers** — Hidden input + colored swatch
  - **Selects** — Native dropdown with styled options
- **Presets folder** — Pre-built lighting configs (MARS_DAY, NIGHT, DUST_STORM, CLEAR)
  - User slots 1-2 — Save/load current config to localStorage

**Folder building:**
```javascript
function buildSettingsPanel() {
  const carF = createFolder('Car')
  carF.addSlider('Steering', carSettings, 'steer', 0.1, 1.2, 0.01)
  carF.addCheckbox('Orbit (O)', carSettings, 'orbitControls', (v) => {
    orbit.enabled = v
    if (v) orbit.target.copy(chassisPos)
  })
  // ... etc for each category
}
```

---

### 5. CONSTRUCTOR MODE BAR — [`index.html:83-99`](index.html:83)
```
Position: Fixed top, full width
Style: Dark bar with lime accent (#b8ff4a)
Visibility: Hidden by default, shown when constructor mode active
```

**Components:**
- **Title:** "◈ CONSTRUCTOR MODE"
- **+ ADD ZONE button** — Toggles zone placement mode
  - When active: background changes to `rgba(0,255,224,0.3)`, text becomes "✕ CANCEL ZONE"
  - Click on terrain → places zone at that point
- **Zone size buttons** — XS / MD / XL selection
  - Active button gets cyan border/background
  - Controls radius: XS=5m, MD=20m, XL=100m
- **↓ EXPORT ZONES** — Exports all custom zones to JSON file
- **↑ IMPORT ZONES** — Opens file picker for zone JSON import
- **Help text:** "Click terreno para colocar · Click objeto para seleccionar..."

---

### 6. CONSTRUCTOR TOGGLE BUTTON — [`index.html:100`](index.html:100)
```
Position: Fixed bottom-center
Style: Syne font, uppercase, transparent bg, lime border
Text: "⚙ CONSTRUCT" → "✕ EXIT CONSTRUCT" when active
```

**Behavior:**
- **Hover:** Background fills with `rgba(10,10,10,0.88)`, border glows lime, box-shadow appears
- **Active:** Background `rgba(184,255,74,0.15)`, text lime, double glow shadow
- **On click:** `toggleConstructorMode()` — shows/hides catalog panel, fades game HUD elements

---

### 7. GLB CATALOG PANEL — [`index.html:103-115`](index.html:103)
```
Position: Fixed top-left area (60px, 220px)
Style: Dark panel, lime border, draggable
Header: "◈ GLB CATALOG" with close button
```

**Components:**
- **Drop zone** — Dashed border, click to browse or drag-drop .glb files
  - Hover state: border color → lime, background → `rgba(184,255,74,0.05)`
- **Loading message** — Shows "◌ CARGANDO..." during GLB load
- **Progress bar** — 2px lime bar, width animates 0-100%
- **Catalog list** — `#ctor-catalog-list` — populated from GLB_CATALOG
  - Each item: thumbnail + name + note + "+" button
  - Click item → loads GLB as ghost object
  - Click "+" → same, but doesn't select item
- **Scene objects list** — Shows placed objects, click to select, ✕ to delete

**GLB loading flow:**
```javascript
function loadGLBFromFile(file) {
  showLoadingMsg(`◌ CARGANDO ${file.name}…`)
  showProgress(0)
  gltfLoader.load(
    URL.createObjectURL(file),
    (gltf) => {
      hideLoadingMsg()
      hideProgress()
      enterGhostMode(gltf.scene, file.name)  // Semi-transparent preview
      ghostObject._source = 'uploaded'
    },
    (p) => { if (p.total > 0) showProgress(Math.round(p.loaded/p.total*100)) },
    (err) => { hideLoadingMsg(); hideProgress(); console.error(err) }
  )
}
```

---

### 8. INSPECTOR PANEL — [`index.html:117-159`](index.html:117)
```
Position: Fixed top-right area (60px, 280px from right)
Style: Dark panel, lime border, draggable
Header: "◎ OBJETO" with close button
```

**Components:**
- **Position display** — X/Y/Z read-only values
- **Rotation display** — X/Y/Z read-only degrees
- **Rotation sliders** — 0-360° for each axis, live update
- **Elevation slider** — -10 to 50 Y position
- **Scale slider** — Logarithmic scale (0.01 to 100x), shows "1.00x"
- **Collision buttons** — NONE / CONVEX / TRIMESH
  - Active button gets cyan border/background
  - Status text below shows current collision mode
- **Delete button** — Red accent, removes selected object

**Inspector sync:**
```javascript
function showInspector(entry) {
  document.getElementById('ctor-panel-inspector').classList.add('visible')
  document.getElementById('ctor-inspector-title').textContent = 
    `◎ ${entry.name.replace(/\.glb$/i,'').substring(0,18)}`
  // Sync all sliders to current values
  const sc = entry.group.scale.x
  document.getElementById('ctor-scale-slider').value = scaleToSlider(sc)
  document.getElementById('ctor-scale-val').textContent = sc.toFixed(2) + 'x'
  // ... rotation, position sync
}
```

---

### 9. SAVE/WORLDS PANEL — [`index.html:162-215`](index.html:162)
```
Position: Fixed bottom-right (16px, 16px)
Style: Glass panel, 3-column grid layout
```

**Layout:**
```
┌─────────────────────────────────────┐
│ WORLD  [SAVE 1] [SAVE 2] [SAVE 3]  │
│        [SAVE 4] [SAVE 5] [SAVE 6]  │
│        name   name   name           │
├─────────────────────────────────────┤
│ LOAD   [SLOT1] [SLOT2] [SLOT3]     │
│        [SLOT4] [SLOT5] [SLOT6]     │
├─────────────────────────────────────┤
│        ↑IMPORT  ↓EXPORT  ↑IMPORTALL│
└─────────────────────────────────────┘
```

**Behavior:**
- **Save buttons** — Opens modal to name the world slot
- **Load buttons** — Directly loads world from localStorage
- **Load button text** — Shows saved world name (truncated to 10 chars)
- **Slot names** — `#sw-name-1` through `#sw-name-6`, shows "—" if empty
- **Import/Export** — Single world or all 6 worlds at once
- **Auto-refresh** — `s9RefreshLoadBtns()` called on init to show saved names

---

### 10. TELEPORT MENU — [`index.html:218-230`](index.html:218)
```
Position: Center screen (50%, 50%)
Style: Dark glass, 280px min-width
Trigger: Hold R for 1.5 seconds
```

**Components:**
- **Hold loader** — Circular SVG progress, 157px circumference, animates stroke-dashoffset
- **Menu content** — Dynamically built from teleport slots
  - Slot 0: "SPAWN INICIAL" (cannot be deleted)
  - Slots 1-6: Named slots with ✎ rename and ✕ delete buttons
  - Empty slots: "— VACÍO · CLICK = GUARDAR AQUÍ"
- **ESC to cancel**

**Hold-to-teleport flow:**
```javascript
function startHoldLoader() {
  rHoldStart = Date.now()
  loaderEl.classList.add('visible')
  arc.style.strokeDashoffset = 157  // Full circle
  rHoldInterval = setInterval(() => {
    const elapsed = Date.now() - rHoldStart
    const progress = Math.min(1, elapsed / HOLD_DURATION)
    arc.style.strokeDashoffset = 157 * (1 - progress)
    if (progress >= 1) {
      clearInterval(rHoldInterval)
      showTeleportMenu()
    }
  }, 16)
}
```

---

### 11. MINIMAP / TOP VIEW — [`index.html:240-247`](index.html:240)
```
Position: Fixed top-right (52px, 16px)
Style: White panel, 260x260px, 2px border
Trigger: MAP [M] button
```

**Components:**
- **Header** — "TOP VIEW" + close button, draggable
- **Canvas** — `#minimap-canvas`, fills remaining height
- **Rendering** — 2D canvas drawing (NOT 3D render target)
  - Dark background (#1a1a2e)
  - Ground approximation (tan circle)
  - Water (cyan circle offset)
  - Grid lines (cyan, 50-unit spacing)
  - Vehicle (orange circle + heading line)
  - Placed objects (green squares)
  - Custom zones (colored shapes + labels)

**⚠️ KNOWN ISSUE:** The render target approach (WebGLRenderTarget) is initialized but the actual rendering falls back to 2D canvas drawing. The 3D render is not being used.

---

### 12. ORBITAL CAMERA BUTTON — [`index.html:250-252`](index.html:250)
```
Position: Fixed top-center, offset left
Style: Transparent button, white border
Text: "ORBIT [O]" → "FREE [O]" when active
```

**Behavior:**
- **Toggle** — `carSettings.orbitControls = !carSettings.orbitControls`
- **Active state** — `.orbital-on` class: white background, black text
- **When active:** OrbitControls enabled, target follows chassis

---

### 13. HOOK CROSSHAIR — [`index.html:255-256`](index.html:255)
```
Position: Center screen
Style: Red circle with + crosshair (::before, ::after pseudo-elements)
Visibility: Only shown in HOOK mode
```

---

### 14. CONTROLS BAR — [`index.html:259-264`](index.html:259)
```
Position: Fixed bottom-center (20px from bottom)
Style: Two-part — toggle button + expandable info bar
```

**Components:**
- **WASD button** — Toggle button, shows/hides info bar
- **Info bar** — Keyboard shortcuts with `<kbd>` styled elements
  - WASD, SHIFT, SPACE, G, Z, H, R, O, M, Tab

---

### 15. TRAIL INFO — [`index.html:267-276`](index.html:267)
```
Position: Fixed bottom-left (16px, 60px)
Style: Minimal text, cyan 35% opacity
Draggable: Yes
Closeable: Yes (✕ button)
```

**Content:**
```
ANT ON MARS v1.0
GAUSSIAN WORLD ENGINE
SOUTH HUSTLES // CBA ARG
```

---

### 16. MODE INDICATOR — [`index.html:279`](index.html:279)
```
Position: Fixed bottom-right (80px, 16px)
Style: Transparent, bordered, draggable
Text: Current drive mode (GRAVITY/MAGNETIC/HOOK/FLOAT)
Color: Changes based on active mode
```

---

### 17. GAME FRAME (Windowed Mode) — [`index.html:282-285`](index.html:282)
```
Element: #game-frame (hidden by default)
Button: #btn-windowed (bottom-right)
```

**Behavior:**
- **Toggle** — Adds `.windowed-mode` class to body
- **Effect:** Canvas shrinks to `calc(100vw - 64px)` with 20px border-radius
- **Frame border** — 1px white border + 32px black chrome + shadow
- **Panels** — Stay position:fixed, z-index bumped to 5100
- **Glass effect** — Panels become more transparent (0.45 alpha) with more blur (20px)
- **Button position** — Moves to top-center when frame mode active

---

## 🔧 HOW TO PROMPT SONNET FOR THIS PROJECT

### Rule 1: Always Reference Line Numbers
```
Fix the minimap rendering in src/main.js around line 3033-3176.
The render target is initialized but not used — the 2D canvas fallback 
is what actually renders. Make the WebGLRenderTarget work properly.
```

### Rule 2: Specify What NOT to Break
```
Add a new drive mode called "ORBIT" but DO NOT:
- Break the existing 4 modes (gravity, magnetic, hook, float)
- Change the setDriveMode() function signature
- Modify the drive-mode-panel HTML structure
DO:
- Add a new tab in the drive mode tabs
- Add the mode handling in setDriveMode()
- Add the mode color (#FF00FF) to the color propagation logic
```

### Rule 3: Provide Context for CSS Changes
```
In src/style.css, add styles for the new zone config panel.
Follow the existing pattern:
- Use CSS variables from :root
- Glass panel style (.panel-glass)
- Constructor mode fade (.ctor-faded)
- Hover states with the lime/cyan accent colors
```

### Rule 4: Be Explicit About File Locations
```
Create a new file: src/systems/zones.js
This should contain:
- ZoneManager class
- Zone creation, visual, collider methods
- Zone detection (enter/exit)
- Zone event triggers (fog, camera, modal)
- Zone serialization/deserialization

Then wire it into src/main.js by:
1. Importing at the top
2. Initializing in init()
3. Calling tick in animate()
```

### Rule 5: Testing Instructions
```
After implementing, test:
1. Open localhost:3000
2. Press Tab to enter constructor mode
3. Click + ADD ZONE, then click on terrain
4. Verify zone appears as wireframe
5. Press Tab to exit constructor mode
6. Drive vehicle into zone
7. Verify zone trigger fires (toast notification)
8. Drive out of zone
9. Verify zone exit fires
10. Export zones to JSON
11. Clear zones, import JSON
12. Verify zones restored
```

---

## 📐 CODE PATTERNS TO FOLLOW

### Pattern 1: Singleton Systems
```javascript
// In src/systems/SomeSystem.js
class SomeSystem {
  static instance = null
  
  static getInstance() {
    if (!SomeSystem.instance) {
      SomeSystem.instance = new SomeSystem()
    }
    return SomeSystem.instance
  }
  
  init() { /* ... */ }
  update(dt) { /* ... */ }
  dispose() { /* ... */ }
}

export default SomeSystem
```

### Pattern 2: Event-Driven Communication
```javascript
// Using the EventBus
import { EventBus } from '@core/EventBus'

// Emit
EventBus.emit('zone:enter', { zoneId: 'zone_123', type: 'trigger' })

// Listen
const unsubscribe = EventBus.on('zone:enter', (data) => {
  console.log('Zone entered:', data.zoneId)
})

// Cleanup
unsubscribe()
```

### Pattern 3: Factory for Complex Objects
```javascript
function createZoneVisual(zone) {
  let geometry
  switch(zone.shape) {
    case 'box': geometry = new THREE.BoxGeometry(...)
    case 'sphere': geometry = new THREE.SphereGeometry(...)
    case 'cylinder': geometry = new THREE.CylinderGeometry(...)
  }
  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color(zone.color),
    wireframe: true,
    transparent: true,
    opacity: 0.25,
    depthWrite: false
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(zone.position.x, zone.position.y, zone.position.z)
  mesh.visible = constructorMode
  scene.add(mesh)
  return mesh
}
```

---

## ⚡ PERFORMANCE CONSIDERATIONS

1. **Geometry/Material Disposal** — Always dispose when removing objects:
   ```javascript
   entry.group.traverse(child => {
     if (child.isMesh) {
       child.geometry?.dispose()
       if (child.material) {
         if (Array.isArray(child.material)) child.material.forEach(m => m.dispose())
         else child.material.dispose()
       }
     }
   })
   ```

2. **Event Listener Cleanup** — Store bound references:
   ```javascript
   this._boundKeyDown = this._onKeyDown.bind(this)
   window.addEventListener('keydown', this._boundKeyDown)
   // In dispose():
   window.removeEventListener('keydown', this._boundKeyDown)
   ```

3. **Throttling** — Minimap renders every frame but only when open:
   ```javascript
   if (minimapOpen) renderMinimap()
   ```

4. **Incremental Building** — Heightfield and scatter build over multiple frames:
   ```javascript
   const SCATTER_CELLS_PER_FRAME = 2
   function tickScatterBuild() {
     const count = Math.min(SCATTER_CELLS_PER_FRAME, _scatterBuildQueue.length)
     for (let i = 0; i < count; i++) { /* build cell */ }
   }
   ```

---

## 🎯 CURRENT STATE SUMMARY

### ✅ Working
- Vehicle physics with 4 drive modes
- GLB loading with Draco compression
- Terrain generation with noise
- Procedural scatter (rocks, bushes)
- Particle systems (dust, splash, wind)
- Constructor mode with GLB placement
- Save/Load with 6 slots
- Export/Import JSON
- Custom zones with wireframe visuals
- Zone enter/exit detection
- Zone event triggers (fog, camera, modal)
- Teleport system with 6 slots + spawn
- Escape menu (pause)
- Settings panel with all categories
- Telemetry HUD
- Minimap (2D canvas)
- Windowed/frame mode
- Debug tools (window.ZoneDebug)

### ⚠️ Needs Work
- Modular architecture not wired (src/core/, src/physics/ exist but unused)
- Minimap uses 2D fallback instead of WebGL render target
- Zone config panel UI not fully built
- Modal system needs more step types
- No Gaussian splat rendering yet
- No player character controller yet
- No mobile/responsive design

### 🚀 Next Steps
1. Wire modular architecture into main.js
2. Fix minimap WebGL rendering
3. Build zone config panel UI
4. Add Gaussian splat support
5. Add player character controller
6. Mobile responsive design
7. Backend integration (save to cloud)

---

## 📝 SONNET PROMPT TEMPLATE

```markdown
# TASK: [Brief description]

## CONTEXT
- File: src/main.js (lines X-Y)
- Related: src/style.css (lines X-Y), index.html (lines X-Y)

## WHAT EXISTS
[Brief description of current implementation]

## WHAT TO ADD/CHANGE
[Specific requirements]

## CONSTRAINTS
- DO NOT break: [list of features that must keep working]
- Follow pattern: [reference existing code pattern]
- Use colors: [accent colors from CSS variables]

## TESTING
1. [Step 1]
2. [Step 2]
3. [Expected result]

## DELIVERABLE
- Modified files with line numbers
- New files if any
- Brief explanation of changes
```

---

*This document is part of the ANT ON MARS v1.0 documentation suite for Claude Sonnet 4.6.*
*Generated: 2026-04-07 | Dev: Argentine tech lead | Stack: Three.js WebGPU + Rapier + Vite 8*
