# ⏱️ FLOW_TIME — ANT ON MARS v1.0
## Development Flow, Implementation History & Time Investment

> **Project Origin:** Claude Sonnet 4.6 sessions (D:\ANTS on MARS\main\Sesion10\antrophic game)
> **Current State:** Migrated from monolithic HTML to Vite + modular structure
> **Migration Status:** Partial — main.js still monolithic, modular files exist but unused
> **Session Date:** 2026-04-07

---

## 📜 IMPLEMENTATION HISTORY

### Phase 0: Original Sonnet Sessions (Pre-Migration)
```
Location: D:\ANTS on MARS\main\Sesion10\antrophic game
Format: Single HTML file with inline CSS and JS
Features implemented:
  ✅ Vehicle physics with 4 drive modes
  ✅ GLB loading from /GLB/ directory
  ✅ Constructor mode with placement
  ✅ Save/Load with localStorage
  ✅ Settings panel with all categories
  ✅ Particle systems (dust, splash, wind)
  ✅ Procedural terrain with noise
  ✅ Telemetry HUD
  ✅ Minimap (2D canvas)
  ✅ Teleport system
  ✅ Custom zones (basic)
  ✅ Windowed/frame mode
```

**What worked:** Everything in a single HTML file. No build step. Opened directly in browser.

**What didn't scale:** 
- No module system (everything global)
- No tree-shaking or code splitting
- Hard to collaborate across AI sessions
- No type safety or linting

---

### Phase 1: Migration to Vite + Modular Structure
```
New project: d:\ANTS on MARS\qww\ant-on-mars-qwen
Build tool: Vite 8
Structure: src/core/, src/physics/, src/terrain/, src/player/, src/ui/
Dependencies: three@0.183.2, @dimforge/rapier3d-compat@0.19.3, stats-gl@2.4.2
```

**What was done:**
1. ✅ Created Vite project with path aliases
2. ✅ Created modular file structure
3. ✅ Implemented Engine.js (scene, camera, renderer, lights)
4. ✅ Implemented EventBus.js (pub/sub system)
5. ✅ Implemented GameLoop.js (fixed timestep)
6. ✅ Implemented InputManager.js (keyboard state)
7. ✅ Implemented PhysicsWorld.js (Rapier wrapper)
8. ✅ Implemented VehicleController.js (vehicle physics class)
9. ✅ Implemented Heightfield.js (terrain collider)
10. ✅ Implemented NoiseGenerator.js (perlin noise)
11. ✅ Copied main.js (3343 lines) as the working game
12. ✅ Copied style.css (all CSS)
13. ✅ Copied index.html (all UI elements)
14. ✅ Copied all GLB assets to public/GLB/

**What was NOT done:**
- ❌ Wire modular files into main.js (main.js still self-contained)
- ❌ Remove duplicate code from main.js
- ❌ Add TypeScript
- ❌ Add linting/formatting
- ❌ Add tests

**Why:** The migration was architectural preparation. The game works from main.js. The modular files are ready to be wired in gradually.

---

### Phase 2: Multi-Model Corrections & Improvements
```
Models involved: Various (not just Sonnet)
Focus: Bug fixes, UI polish, feature completion
```

**Corrections made:**
1. ✅ Fixed save/load with 6 slots (was 3)
2. ✅ Added cleanupWorldAssets() before loading
3. ✅ Added zone sensor colliders (.setSensor(true))
4. ✅ Added zone enter/exit detection
5. ✅ Added zone event triggers (fog, camera, modal)
6. ✅ Added export/import for all worlds
7. ✅ Added teleport slot rename/delete
8. ✅ Added escape menu (pause)
9. ✅ Added gamePaused flag (pauses physics when menu open)
10. ✅ Added input focus handling (typing in save modal doesn't trigger game keys)
11. ✅ Added window.ZoneDebug tools
12. ✅ Added modal system (floating text panels)
13. ✅ Added minimap zone rendering
14. ✅ Added frame/windowed mode
15. ✅ Added controls info bar toggle

---

## 🔄 DEVELOPMENT FLOW (How to Work on This Project)

### Standard Feature Implementation Flow
```
1. READ context files (HUMAN_MANIFEST.md, CONTEXT.md)
2. READ the specific file to modify
3. UNDERSTAND existing patterns in that file
4. PLAN the change (what to add, what not to break)
5. IMPLEMENT the change
6. TEST in browser (localhost:3000)
7. VERIFY related features still work
8. DOCUMENT what was changed
9. COMMUNICATE progress
```

### Debugging Flow
```
1. Reproduce the issue
2. Check console for errors
3. Add console.log at key points
4. Trace the data flow
5. Identify the root cause
6. Fix the issue
7. Remove console.log statements
8. Test the fix
9. Test related features
```

### Refactoring Flow (Modular Migration)
```
1. Pick ONE subsystem (e.g., zones)
2. Extract the zone code from main.js
3. Put it in src/systems/zones.js
4. Export the ZoneManager class
5. Import ZoneManager in main.js
6. Replace inline zone code with ZoneManager calls
7. Test everything still works
8. Repeat for next subsystem
```

**CRITICAL:** Never refactor more than one subsystem at a time. Test after each extraction.

---

## ⏰ TIME INVESTMENT ESTIMATES (Relative Complexity)

These are RELATIVE complexity units, not hours. 1 unit = "simple function extraction". 10 units = "major subsystem rewrite".

| Task | Complexity | Notes |
|------|-----------|-------|
| Fix minimap WebGL rendering | 6 | Requires WebGPU render-to-texture knowledge |
| Wire Engine.js into main.js | 3 | Extract scene/camera/renderer setup |
| Wire EventBus.js into main.js | 2 | Replace direct calls with events |
| Wire InputManager.js into main.js | 2 | Replace keys object with InputManager |
| Wire PhysicsWorld.js into main.js | 3 | Replace physicsWorld with class |
| Wire VehicleController.js into main.js | 4 | Complex — vehicle has many dependencies |
| Wire Heightfield.js into main.js | 3 | Extract heightfield functions |
| Wire NoiseGenerator.js into main.js | 1 | Simple extraction |
| Build zone config panel UI | 5 | New UI component, needs inspector pattern |
| Complete modal system button_action | 3 | Needs event listener setup |
| Add Gaussian splat rendering | 8 | Entirely new rendering pipeline |
| Add player character controller | 7 | New physics body, camera, input |
| Mobile responsive design | 6 | Touch controls, UI scaling, layout |
| Backend save to cloud | 5 | API design, auth, sync |
| Add TypeScript | 7 | Type all 3343 lines of main.js |
| Add tests | 6 | Test framework, test cases, CI |

---

## 📋 CORRECTIONS CHECKLIST (What Was Fixed)

### Critical Fixes (Would Break the Game)
- [x] Assets not cleaned up when loading different world
- [x] Zone colliders were solid (now sensors with `.setSensor(true)`)
- [x] Save modal input triggered game keys (now pauses game on focus)
- [x] World zone discovery not reset on world load
- [x] Teleport slots not saved/loaded with world

### Important Fixes (UX Issues)
- [x] Expanded save slots from 3 to 6
- [x] Added export all worlds to single JSON
- [x] Added import all worlds from JSON
- [x] Added teleport slot rename functionality
- [x] Added teleport slot delete functionality
- [x] Added escape menu with pause
- [x] Added gamePaused flag to skip physics when paused
- [x] Added auto-refresh of load button names on startup
- [x] Added zone export/import to JSON
- [x] Added window.ZoneDebug tools

### Polish Fixes (Nice to Have)
- [x] Added zone size selection (XS/MD/XL)
- [x] Added zone placement mode with cancel button
- [x] Added zone visuals only visible in constructor mode
- [x] Added minimap zone rendering
- [x] Added frame/windowed mode
- [x] Added controls info bar toggle
- [x] Added modal system (floating text panels)
- [x] Added fog transition on zone enter/exit
- [x] Added camera animation on zone trigger

---

## 🚨 KNOWN ISSUES (Not Yet Fixed)

### High Priority
| Issue | Impact | Location | Fix Complexity |
|-------|--------|----------|---------------|
| Minimap uses 2D fallback instead of WebGL | Medium | main.js:3106 | 6 |
| Zone config panel UI not built | Medium | N/A (new) | 5 |
| Modal button_action step incomplete | Low | main.js:2912 | 3 |
| Modular architecture not wired | Low | src/core/, src/physics/ | 3-4 each |

### Medium Priority
| Issue | Impact | Location | Fix Complexity |
|-------|--------|----------|---------------|
| No Gaussian splat rendering | Feature gap | N/A (new) | 8 |
| No player character controller | Feature gap | src/player/ | 7 |
| No mobile/responsive design | Accessibility | CSS | 6 |
| No backend/cloud saves | Feature gap | N/A (new) | 5 |

### Low Priority
| Issue | Impact | Location | Fix Complexity |
|-------|--------|----------|---------------|
| Random rocks in terrain (aesthetic) | Visual | main.js:617-634 | 1 |
| No TypeScript | Maintainability | All JS | 7 |
| No tests | Reliability | N/A (new) | 6 |
| No linting/formatting | Code quality | All JS | 2 |

---

## 🧪 TESTING CHECKLIST (Run After Every Change)

### Core Gameplay
- [ ] Game loads without console errors
- [ ] Vehicle spawns at correct position
- [ ] WASD drives the vehicle
- [ ] Space jumps
- [ ] Shift boosts
- [ ] R respawns (tap) / opens teleport (hold)
- [ ] Vehicle doesn't fall through terrain
- [ ] Respawn works when fallen (-30 Y)

### Drive Modes
- [ ] G toggles anti-grav (gravity mode)
- [ ] Z toggles magnetic mode
- [ ] H toggles hook mode
- [ ] F toggles float mode
- [ ] Each mode shows correct UI color
- [ ] Mode indicator updates
- [ ] Drive mode panel tabs update

### Constructor Mode
- [ ] Tab enters/exits constructor mode
- [ ] Ghost object follows cursor
- [ ] Click places object
- [ ] Selecting object shows inspector
- [ ] Inspector sliders update values
- [ ] Move/Rotate/Scale modes work
- [ ] Delete removes object
- [ ] Object list updates
- [ ] Zone placement works
- [ ] Zone appears as wireframe
- [ ] Zone is sensor (no collision)

### Save/Load
- [ ] Save opens modal
- [ ] Naming and saving works
- [ ] Load button shows saved name
- [ ] Loading restores world
- [ ] Export downloads JSON
- [ ] Import restores from JSON
- [ ] Export all downloads all worlds
- [ ] Import all restores all worlds

### Zones
- [ ] Creating zone in constructor works
- [ ] Zone visible in constructor mode
- [ ] Zone hidden in normal mode
- [ ] Driving into zone triggers enter event
- [ ] Driving out triggers exit event
- [ ] Fog transition works
- [ ] Export zones downloads JSON
- [ ] Import zones restores zones
- [ ] window.ZoneDebug.list() works
- [ ] window.ZoneDebug.teleport() works
- [ ] window.ZoneDebug.clear() works

### UI
- [ ] Settings panel opens/closes
- [ ] Settings folders expand/collapse
- [ ] Sliders update values
- [ ] Telemetry HUD updates
- [ ] Telemetry collapsible
- [ ] Minimap toggles with M
- [ ] Minimap is draggable
- [ ] Minimap shows vehicle and objects
- [ ] Frame mode toggles
- [ ] Frame mode shrinks canvas
- [ ] Panels stay above frame
- [ ] Escape menu opens/closes
- [ ] Escape menu pauses game

### Particles
- [ ] Dust emits when driving on ground
- [ ] Splash emits when in water
- [ ] Wind dust floats around
- [ ] Particles fade out correctly

---

## 📊 SESSION METRICS

```
Total lines of code: ~4200 (main.js: 3343, style.css: 408, index.html: 289)
Total GLB files: 60+
Total sessions: Multiple (Sonnet 4.6 + other models)
Total corrections: 15+
Total features: 20+
Current file count: 15 source files + 60 GLB assets
```

---

## 🎯 NEXT SESSION PRIORITIES

### If continuing this session:
1. Wire modular architecture (start with NoiseGenerator.js — easiest)
2. Fix minimap WebGL rendering
3. Build zone config panel UI

### If starting fresh:
1. Read HUMAN_MANIFEST.md and CONTEXT.md
2. Run the game (npm run dev)
3. Test all features manually
4. Pick ONE thing to improve
5. Implement, test, communicate

---

*This document is part of the ANT ON MARS v1.0 documentation suite.*
*Generated: 2026-04-07 | Dev: Argentine tech lead | Stack: Three.js WebGPU + Rapier + Vite 8*
