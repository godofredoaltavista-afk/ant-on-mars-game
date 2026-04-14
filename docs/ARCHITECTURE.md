# ANT ON MARS — ARCHITECTURE BRIEF
> For Sonnet 4.6 sessions. Read this first. Always.

---

## WHAT THIS IS

A real-time 3D world builder running in the browser.
Built by Argentine developers pushing toward the next frontier.
**Ant on Mars** is not a game demo — it's a live frontier experiment:
a GLB-powered physics world where the user constructs, drives, and inhabits Martian terrain.

Stack: **Vite 8 + Three.js (WebGPU) + Rapier3D (WASM physics) + Cloudflare R2 + Vercel**

---

## DEPLOYMENT TOPOLOGY

```
GitHub repo         →   Vercel (auto-deploy on push to main)
godofredoaltavista-afk/ant-on-mars-game

GLB assets          →   Cloudflare R2
pub-6aa6b6baa3b043bf9598c7429620b422.r2.dev

Local dev           →   localhost:3003 (vite dev)
Production preview  →   localhost:4174 (vite preview / dist/)
Live URL            →   ant-on-mars-game.vercel.app
```

**Rule #1:** GLBs never go through Vercel. Always R2.
**Rule #2:** Code edits go to localhost first. Push to GitHub ONLY when the user (el jefe) says so.
**Rule #3:** `src/main.js` is the entire app. Do not split modules.

---

## FILE STRUCTURE

```
/
├── src/
│   └── main.js              ← THE ENTIRE APP (monolithic by design)
│   └── style.css
│   └── core/                ← Legacy stubs (Engine, EventBus, GameLoop, InputManager)
│   └── physics/             ← Legacy stubs (PhysicsWorld, VehicleController, Heightfield)
│   └── terrain/             ← Legacy stubs (NoiseGenerator)
├── public/
│   ├── GLB/
│   │   ├── manifest.json    ← (legacy, no longer used — catalog is now hardcoded in main.js)
│   │   ├── DEFAULTS/        ← fallback GLBs (local, small)
│   │   └── *.glb            ← local copies (NOT served in production — R2 is source of truth)
│   ├── art/
│   │   ├── icons/           ← SVG UI icons
│   │   └── worlds/          ← world thumbnail PNGs/SVGs
│   ├── favicon.svg
│   └── icons.svg
├── index.html
├── vite.config.js
├── package.json             ← deps: three, @dimforge/rapier3d-compat, stats-gl, terser
└── .gitattributes           ← Git LFS tracking for *.glb
```

---

## CORE SYSTEMS IN main.js

### 1. VEHICLE SYSTEM
- `VEHICLE_PRESETS[]` — array of chassis/wheel configs, all paths pointing to R2
- `initVehicle(presetIdx)` — spawns physics body + loads GLB chassis async
- `VEHICLE_SKINS[]` — alternate visual skin switcher
- Rapier `VehicleController` drives the physics simulation
- Chassis = cuboid collider, wheels = ray-cast suspension

### 2. GLB CATALOG + CONSTRUCTOR
- `GLB_CDN_BASE` — R2 base URL constant (single source of truth)
- `R2_ASSETS[]` — hardcoded list of 8 available R2 files
- `loadGLBCatalog()` — builds `GLB_CATALOG` from R2_ASSETS (no network call needed)
- `loadGLBFromCatalog(item)` — loads a GLB and enters ghost placement mode
- `loadGLBFromFile(file)` — drag-and-drop local GLB upload
- `enterGhostMode(gltfScene, name)` — semi-transparent preview before placing
- `placedObjects[]` — array of all placed GLB objects in the scene

### 3. PHYSICS MODES (gravity states)
- **GRAV mode** — 9.81 m/s² standard gravity, vehicle drives on terrain
- **FLOAT mode** — gravity = 0, vehicle hovers freely in 3D space
- **HOOK mode** — grapple mechanic, physics constraint to surface
- **MAG mode** — magnetic attraction to nearby surfaces
- Each mode has HUD indicators and keyboard shortcuts

### 4. COLLISION SYSTEM (GLB objects)
- `createGLBCollider(entry, mode)` — attaches Rapier collider to placed GLB
- Modes: `convexHull` | `trimesh` | `none`
- `extractGLBMeshData(group)` — extracts vertices/indices from Three.js mesh
- `removeGLBCollider(entry)` — cleans up physics body + collider

### 5. SAVE / LOAD WORLD
- `saveWorld()` / `loadWorld()` — JSON serialization of `placedObjects[]`
- Saved to `localStorage` (instant) + downloadable JSON file
- On load: reconstructs GLBs from saved paths (uses R2 URLs)

### 6. TERRAIN
- Procedural heightfield via Rapier `HeightfieldCollider`
- Visual mesh built with Three.js `PlaneGeometry` + noise displacement
- Infinite scrolling zones: `WORLD_ZONES[]` with fog/color configs

---

## R2 ASSET LIST (current)

```
https://pub-6aa6b6baa3b043bf9598c7429620b422.r2.dev/
├── antonmars.connections.enviroment.glb
├── hands.on.mountain.glb
├── mate.yerba.glb
├── wheel.white.glb
├── rueda.glb
├── ruedacompresed.glb
├── van.satelite.glb
└── van.creative.glb
```

To add a new asset: upload to R2 bucket, add filename to `R2_ASSETS[]` in main.js.

---

## GIT HISTORY

```
81e9614  fix: vehicle spawn + GLB catalog pointing to R2
12701a2  feat: migrate GLB assets to Cloudflare R2 CDN
0a414c1  feat: initial Vite project — Three.js WebGPU world builder
```

---

## BUILD COMMANDS

```bash
npm run dev        # localhost:3003 — hot reload dev
npm run build      # builds to dist/ (terser minified, ~3.27MB JS)
npx vite preview --port 4174  # serves dist/ for prod verification
git push origin main          # triggers Vercel redeploy
```

Build output: `dist/` — Vite default, auto-detected by Vercel.
