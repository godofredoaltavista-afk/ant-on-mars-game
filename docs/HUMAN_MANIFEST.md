# 🧬 HUMAN_MANIFEST — ANT ON MARS v1.0
## What Works, What Doesn't, and How to Talk to Sonnet About It

> **Written by:** Argentine tech lead who's been in the trenches
> **For:** Claude Sonnet 4.6 (200k context, knows the architecture)
> **Tone:** Direct, technical, no bullshit. Like explaining to a senior dev at 2am.

---

## 🗣️ HOW TO READ THIS DOCUMENT

This isn't a corporate spec. This is the **real deal** — what actually works, what's held together with duct tape, and exactly how to prompt Sonnet so it doesn't break things.

If you're Sonnet: **read this first, then CONTEXT.md, then implement.**
If you're human: **this tells you what you're getting into.**

---

## ✅ WHAT ACTUALLY WORKS (Tested & Verified)

### Vehicle Physics — Rock Solid
```
Drive modes: GRAVITY, MAGNETIC, HOOK, FLOAT
All 4 modes switch correctly with keyboard shortcuts
Vehicle stays on terrain, doesn't fall through
Respawn works (R key, hold for teleport)
Jump works (Space), including flip when upside down
Boost works (Shift), 2.5x multiplier
```

**Why it works:** The Rapier vehicle controller is properly configured. Wheel friction, suspension, steering — all tuned. The magnetic mode applies 50x gravity downforce (line 1446 in main.js). Float mode zeroes gravity and applies camera-relative forces.

**Don't touch:** The physics timestep (FIXED_DT = 1/60), wheel connection positions, or the magnetic downforce formula. These are tuned by feel.

---

### GLB Loading — Works with Draco
```
Loads 60+ GLB files from /public/GLB/
Catalog auto-generated from manifest.json
Drag & drop works
File picker works
Auto-scaling to ~2 units works
Shadows cast and receive
```

**Why it works:** GLTFLoader + DRACOLoader configured correctly. Decoder loaded from Google CDN. The auto-scaling (`autoScaleGLB`) finds the bounding box and scales to 2 units max axis.

**Known quirk:** Some Meshy AI GLBs have weird pivot points. The auto-scale handles it but the object might appear rotated.

---

### Constructor Mode — Full Featured
```
Tab to toggle on/off
Ghost object (semi-transparent) follows cursor
Click to place
Select object → inspector panel appears
Move (G), Rotate (R), Scale (S) via TransformControls
Elevation slider works
Rotation sliders (X/Y/Z 0-360°) work
Scale slider (logarithmic) works
Collision: None / Convex Hull / TriMesh
Delete object works
Object list updates in real-time
```

**Why it works:** The ghost system is clean — create a semi-transparent copy, follow raycast to terrain, place on click. TransformControls handles the gizmo. Inspector syncs every frame in `tickConstructor()`.

**Don't touch:** The `makeDraggable()` function (line 2388). It's janky but works. Freezing dimensions before drag prevents re-layout issues.

---

### Save/Load System — 6 Slots, JSON Export
```
6 save slots in 3x2 grid
Save opens modal to name the world
Load directly loads from localStorage
Export single world to JSON
Export ALL worlds to single JSON
Import single world from JSON
Import ALL worlds from JSON
Auto-refreshes load button names on startup
```

**Why it works:** `buildSaveDataV8()` serializes everything: terrain, environment, camera, placed assets, zones, modals, panels, teleport slots. `applyWorldData()` deserializes and rebuilds. `cleanupWorldAssets()` properly disposes everything before loading.

**The save format (v8):**
```json
{
  "version": "8.0",
  "slotName": "My World",
  "terrain": { "frequency": 0.004, "amplitude": 14 },
  "environment": { "fogColor": "#ddc8a8", "fogNear": 80, "fogFar": 250 },
  "camera": { "distance": 8, "height": 4, "fov": 60 },
  "placedAssets": [
    { "id": 0, "originalFilename": "mate.yerba.glb", "position": {...}, "rotation": {...}, "scale": 1.0, "collisionMode": "none" }
  ],
  "customZones": [...],
  "modals": [...],
  "panels": [...],
  "teleportSlots": [null, {...}, null, null, null, null, null]
}
```

---

### Custom Zones — Enter/Exit Detection Works
```
Create zones in constructor mode (3 sizes: XS/MD/XL)
Zones appear as wireframe (visible only in constructor mode)
Zones are sensors (`.setSensor(true)`) — no collision
Enter/exit detection works via position checking
Zone events fire: fog transition, sky color, modal spawn, camera animation
Export/import zones to JSON
Debug tools: window.ZoneDebug.list(), .teleport(), .trigger(), .clear()
```

**Why it works:** Zone detection is pure math — distance checks against zone dimensions. Events are data-driven — each zone has an `events` object with `onEnter` and `onExit` configs. Fog transition uses smoothstep interpolation.

**What's NOT built yet:**
- Zone config panel UI (the panel to edit zone properties)
- Button unlock system (references buttons that don't exist yet)
- Modal step type "button_action" (waits for button press but no handler)

---

### Particle Systems — All 4 Types Work
```
Dust: Emit from wheels on ground, 1200 particles, brown/orange
Splash: Emit in water, 300 particles, cyan/white
Wind dust: Ambient floating, 1500 particles, wobble animation
Debris: Pool of 600 objects (not actively used)
```

**Why it works:** InstancedMesh for performance. Each particle is a quad (PlaneGeometry) with a radial gradient texture. Colors updated per-frame via InstancedBufferAttribute. Billboard rotation via camera quaternion.

**Performance:** ~0.5ms per frame for all particles. The drag and lifetime math is efficient.

---

### Settings Panel — All Categories
```
Car: Steering, Acceleration, Max Speed, Boost, Jump Force, Grip, Orbit toggle
Camera: Distance, Height, Look Height, Smoothing
Terrain: Frequency, Amplitude (rebuilds terrain on change)
Fog: Color, Near, Far
Dust: Enabled, Emit Rate, Size, Lifetime, Opacity
Lighting: Sun Azimuth, Sun Elevation, Shadows toggle, Shadow Res, Shadow colors
Biomes: Water Level, Sand→Dirt, Dirt→Grass, Transition, All colors
Ruins: Show Ruins, Show Pyramids, Ruin Color
Presets: MARS_DAY, NIGHT, DUST_STORM, CLEAR + 2 user save slots
```

**Why it works:** The `buildSettingsPanel()` function creates a DSL for building folders with sliders, checkboxes, color pickers, and selects. Each control binds to a settings object and optionally calls an onChange callback.

---

### Teleport System — 6 Slots + Spawn
```
Hold R for 1.5s → teleport menu appears
Slot 0: Spawn inicial (always exists, can't delete)
Slots 1-6: Named slots with rename/delete buttons
Empty slots show "VACÍO · CLICK = GUARDAR AQUÍ"
Click empty slot → saves current position
Click filled slot → teleports to saved position
Positions saved to localStorage
```

**Why it works:** The hold-to-teleport uses a setTimeout with a visual SVG progress indicator. Teleport slots are a simple array in localStorage.

---

### Minimap — 2D Canvas Rendering
```
Press M to toggle
Shows top-down view
Vehicle position (orange circle + heading line)
Placed objects (green squares)
Custom zones (colored shapes + labels)
Grid lines
Draggable panel
Closeable
```

**⚠️ IMPORTANT:** The minimap uses a **2D canvas fallback**, NOT the WebGL render target. The render target is initialized (`initMinimapRenderTarget()`) but the actual rendering draws shapes manually. This is intentional — the 3D render-to-texture approach had issues.

**If you want to fix the WebGL rendering:** The render target exists, the minimap camera exists, but the `renderMinimap()` function falls back to 2D drawing at line 3106. To fix it, you'd need to render the scene with the minimap camera to the render target, then read pixels back to the canvas. This is non-trivial with WebGPU.

---

### Windowed/Frame Mode
```
Click FRAME button → canvas shrinks with rounded corners
Black chrome around canvas
Frame border with glow
All panels stay position:fixed (can float over canvas OR chrome)
Glass effect more transparent in frame mode (0.45 alpha, 20px blur)
FRAME button moves to top-center when active
```

**Why it works:** CSS-only solution. `body.windowed-mode` class triggers all the style changes. Canvas gets `border-radius: 20px` and shrinks. `#game-frame` overlay provides the border + shadow effect.

---

## ❌ WHAT DOESN'T WORK (Known Issues)

### 1. Modular Architecture Not Wired
```
src/core/Engine.js — exists but unused
src/core/GameLoop.js — exists but unused
src/core/InputManager.js — exists but unused
src/core/EventBus.js — exists but unused
src/physics/PhysicsWorld.js — exists but unused
src/physics/VehicleController.js — exists but unused
src/physics/Heightfield.js — exists but unused
src/terrain/NoiseGenerator.js — exists but unused
```

**Current state:** Everything runs from `src/main.js` (3343 lines). The modular files were created as part of a migration that was never completed.

**Impact:** Low — the game works fine as a monolith. But it's hard to maintain and can't be tree-shaken.

**How to fix:** Gradually extract functions from main.js into the modular files, then import them. DO NOT rewrite main.js from scratch — extract piece by piece.

---

### 2. Zone Config Panel UI Not Built
```
The zone system works (create, detect, trigger)
But there's no UI to edit zone properties after creation
No way to set fog color, modal triggers, camera presets via UI
```

**What's needed:** A panel (like the inspector) that shows when a zone is selected in constructor mode. Should have:
- Name input
- Type selector (trigger/fog/respawn/camera/base)
- Color picker
- Event config (onEnter/onExit fog color, modal ID, camera preset)
- Delete zone button

---

### 3. Modal System Incomplete
```
Floating text panels work
Modal sequencing works (step through sequence)
But "button_action" step type doesn't actually wait for button press
No modal definitions are created by default
```

**What's needed:** Either complete the button_action handler or remove that step type. Add default modal definitions for the world.

---

### 4. No Gaussian Splat Rendering
```
The project mentions "GAUSSIAN SPLAT WORLD ENGINE" in the loader
But no splat rendering is implemented
```

**What's needed:** A splat renderer that loads .splat or .ply files and renders them as Gaussian primitives. This is a separate rendering pipeline from the mesh-based approach.

---

### 5. No Player Character Controller
```
The src/player/ directory is empty
No first-person or third-person character controller
```

**What's needed:** A player controller with camera, movement, and interaction. Separate from the vehicle system.

---

### 6. No Mobile/Responsive Design
```
The game is desktop-only
No touch controls
No mobile UI scaling
```

**What's needed:** Touch-friendly controls, responsive layout, mobile-optimized settings.

---

## 🧠 HOW SONNET SHOULD APPROACH THIS PROJECT

### Rule 1: Read Before Writing
```
1. Read this file (HUMAN_MANIFEST.md)
2. Read CONTEXT.md for architecture details
3. Read the specific file you need to modify
4. Understand the existing patterns
5. THEN implement
```

### Rule 2: Don't Break What Works
```
The vehicle physics are tuned by feel. Don't change:
- FIXED_DT (physics timestep)
- Wheel friction values (unless specifically asked)
- Magnetic mode downforce (50x gravity)
- Jump force values
- Camera smoothing

If you need to change these, explain WHY and what the new values do.
```

### Rule 3: Follow the Existing Style
```
- Variable names: camelCase (carSettings, chassisPos, wheelMeshes)
- Constants: UPPER_SNAKE_CASE (GROUND_SIZE, FIXED_DT, DUST_COUNT)
- Functions: camelCase (createVehicle, setDriveMode, updateTelemetry)
- Classes: PascalCase (VehicleController, Heightfield)
- CSS: BEM-ish (.panel-glass, .drive-tab, .ctor-panel)
- Comments: JSDoc-style for functions, inline for complex logic
```

### Rule 4: Test After Every Change
```
After each modification:
1. Check that the game loads (no console errors)
2. Verify the changed feature works
3. Verify related features still work
4. If something broke, fix it before moving on
```

### Rule 5: Communicate Progress
```
After each phase:
- What was changed
- What was tested
- What still needs work
- Any blockers or questions
```

---

## 🎨 UI ANIMATION PATTERNS (For Sonnet to Replicate)

### Pattern 1: Glass Panel Hover
```css
.panel-glass {
  background: rgba(0,0,0,0.0);
  backdrop-filter: blur(10px);
  border: 0.5px solid rgba(255,255,255,0.12);
  transition: all 0.22s cubic-bezier(0.4,0,0.2,1);
}
.panel-glass:hover {
  background: rgba(0,0,0,0.15);
}
```
**Effect:** Panel is transparent until hovered, then fills with dark tint. Smooth transition.

### Pattern 2: Drive Tab Active Glow
```css
.drive-tab[data-mode="gravity"].active {
  border-color: rgba(0,255,224,0.5);
  color: #00FFE0;
  box-shadow: 0 0 10px 1px rgba(0,255,224,0.35);
  text-shadow: 0 0 8px currentColor;
}
```
**Effect:** Active tab gets colored border, text color, outer glow, and text glow.

### Pattern 3: Button Hover Brightness
```css
.sw-save-btn:hover {
  background: rgba(0,0,0,0.85) !important;
  border-color: rgba(180,255,80,0.4) !important;
  color: #B4FF50 !important;
}
```
**Effect:** Dark background fills, border gets accent color, text becomes accent color.

### Pattern 4: Constructor Mode Fade
```css
.game-hud-element.ctor-faded {
  opacity: 0.15;
  pointer-events: none;
}
```
**Effect:** All game HUD elements become nearly invisible and non-interactive in constructor mode.

### Pattern 5: Toast Notification
```css
@keyframes toastIn {
  from { opacity: 0; transform: translate(-50%, 8px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}
@keyframes toastOut {
  to { opacity: 0; }
}
```
**Effect:** Toast slides up from below, fades in, then fades out after duration.

### Pattern 6: Gravity Tank Pulse
```css
@keyframes gravPulse {
  from { box-shadow: 0 0 4px rgba(0,245,212,0.4); }
  to { box-shadow: 0 0 12px rgba(0,245,212,0.9), 0 0 4px rgba(0,245,212,0.6); }
}
.gtank.active-pulse {
  animation: gravPulse 0.25s infinite alternate;
}
```
**Effect:** Tank bar pulses between small and large glow when anti-grav is active.

### Pattern 7: Folder Accordion
```css
.folder-body {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}
.folder.open .folder-body {
  max-height: 800px;
}
.folder.open .folder-chevron {
  transform: rotate(90deg);
}
```
**Effect:** Folder content slides open with chevron rotation.

---

## 🔑 KEYBOARD SHORTCUTS (Complete Reference)

| Key | Normal Mode | Constructor Mode |
|-----|------------|-----------------|
| Tab | Toggle constructor | Exit constructor |
| G | Toggle anti-grav / gravity mode | Translate mode |
| Z | Toggle magnetic mode | — |
| H | Toggle hook mode | — |
| F | Toggle float mode | — |
| O | Toggle orbit controls | — |
| M | Toggle minimap | — |
| V | Swap vehicle preset | — |
| P | Toggle debug | — |
| R (tap) | Respawn local | — |
| R (hold 1.5s) | Teleport menu | — |
| Space | Jump | — |
| Shift | Boost | — |
| WASD | Drive | — |
| Esc | Pause menu | Deselect / exit |
| Delete | — | Delete selected object |
| S | — | Scale mode |

---

## 📊 PERFORMANCE METRICS

```
Initial load time: ~3-5 seconds (physics init + GLB catalog)
Frame rate: 60fps on modern hardware
Physics: ~2ms per step (60Hz fixed)
Render: ~8ms per frame (WebGPU)
Particles: ~0.5ms per frame
Scatter: ~1ms per frame (when building cells)
Memory: ~200MB (60 GLB files loaded)
```

**Bottlenecks:**
1. GLB loading (Draco decompression)
2. Heightfield rebuild (when moving)
3. Scatter cell building (when moving)
4. Minimap rendering (every frame when open)

---

## 🏁 FINAL NOTES FOR SONNET

1. **This project is a game, not a website.** Performance matters. Every frame counts.
2. **The physics are tuned by feel.** Don't change numbers without testing in-game.
3. **The UI is glass-morphism.** Follow the existing patterns.
4. **Everything is in main.js.** The modular files are aspirational.
5. **Test in browser.** Console errors are your enemy.
6. **Communicate after each change.** Don't go dark for 10 edits.
7. **The user speaks Spanish.** Comments can be in English, but UI text should stay as-is.

---

*This document is part of the ANT ON MARS v1.0 documentation suite.*
*Generated: 2026-04-07 | Dev: Argentine tech lead | Stack: Three.js WebGPU + Rapier + Vite 8*
