# 🔧 CORRECTIONS — ANT ON MARS v1.0
## Checkable Fixes, Known Issues & Testing Protocols

> **Purpose:** Every fix, patch, and correction applied to this project
> **For:** Sonnet 4.6 to understand what was broken and how it was fixed
> **Format:** Issue → Root Cause → Fix → Verification

---

## 🚨 CRITICAL FIXES (Game-Breaking)

### FIX-001: Assets Not Cleaned Up on World Load
```
ISSUE:     Loading a different world kept assets from the previous world
           Result: Duplicate/ghost objects from old world in new world
IMPACT:    HIGH — Data corruption, confusing UX
LOCATION:  src/main.js:1817 (loadWorld function)
ROOT CAUSE: No cleanup of placedObjects array before loading new world data
```

**Fix Applied:**
```javascript
// NEW: cleanupWorldAssets() function (line 2026)
function cleanupWorldAssets() {
  console.log('[WorldLoader] Cleaning up world assets...')
  
  // Remove all placed GLB objects and their colliders
  for (const entry of placedObjects) {
    removeGLBCollider(entry)
    scene.remove(entry.group)
    // Dispose geometries and materials
    entry.group.traverse(child => {
      if (child.isMesh) {
        child.geometry?.dispose()
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose())
          else child.material.dispose()
        }
      }
    })
  }
  placedObjects = []
  
  // Clear all custom zones
  clearAllCustomZones()
  
  // Clear modals and panels
  worldModals.clear()
  worldPanels.clear()
  closeModal()
  
  // Reset discovered zones
  worldZoneDiscovered.clear()
  currentWorldZone = -1
  
  // Reset teleport slots
  saveTeleportSlots([null, null, null, null])
  
  // Reset vehicle position
  const h = getTerrainHeight(0, 0) + 3
  chassisBody.setTranslation({ x: 0, y: h, z: 0 }, true)
  chassisBody.setLinvel({ x: 0, y: 0, z: 0 }, true)
  chassisBody.setAngvel({ x: 0, y: 0, z: 0 }, true)
  
  console.log('[WorldLoader] World assets cleaned up')
}

// Called at start of applyWorldData() (line 2072)
async function applyWorldData(data) {
  // CLEANUP: Remove all existing assets before loading new world
  cleanupWorldAssets()
  // ... rest of loading
}
```

**Verification:**
1. Load world 1 (place 2 assets)
2. Save world 1
3. Load world 2 (place 3 assets)
4. Save world 2
5. Load world 1 → should see ONLY 2 assets
6. Load world 2 → should see ONLY 3 assets

---

### FIX-002: Zone Colliders Were Solid (Blocking Vehicle)
```
ISSUE:     Custom zones had solid colliders that blocked the vehicle
           Result: Vehicle couldn't drive through zones
IMPACT:    HIGH — Zones unusable for their intended purpose
LOCATION:  src/main.js:2626 (createZoneCollider function)
ROOT CAUSE: Colliders created without .setSensor(true)
```

**Fix Applied:**
```javascript
function createZoneCollider(zone) {
  if (!RAPIER) return
  
  let colliderDesc
  const { x, y, z } = zone.dimensions
  switch(zone.shape) {
    case 'box':
      colliderDesc = RAPIER.ColliderDesc.cuboid(x / 2, y / 2, z / 2)
      break
    case 'sphere':
      colliderDesc = RAPIER.ColliderDesc.ball(x / 2)
      break
    case 'cylinder':
      colliderDesc = RAPIER.ColliderDesc.cylinder(y / 2, x / 2)
      break
    default:
      colliderDesc = RAPIER.ColliderDesc.cuboid(x / 2, y / 2, z / 2)
  }
  
  const body = physicsWorld.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(
      zone.position.x,
      zone.position.y + y / 2,
      zone.position.z
    )
  )
  
  const collider = physicsWorld.createCollider(
    colliderDesc.setSensor(true),  // ← KEY FIX: Make it a sensor
    body
  )
  
  collider.userData = { zoneId: zone.zoneId, type: zone.type }
  customZoneColliders.set(zone.zoneId, { body, collider })
}
```

**Verification:**
1. Enter constructor mode
2. Create a zone on terrain
3. Exit constructor mode
4. Drive vehicle through zone
5. Vehicle passes through without collision
6. Toast notification appears on enter/exit

---

### FIX-003: Save Modal Input Triggered Game Keys
```
ISSUE:     Typing in save modal input triggered game keyboard shortcuts
           Result: Typing "R" triggered respawn, "G" toggled anti-grav
IMPACT:    HIGH — Unusable save modal
LOCATION:  src/main.js:1091-1123 (keydown handler)
ROOT CAUSE: No check for input focus before processing game keys
```

**Fix Applied:**
```javascript
// In setupUI(), when creating save modal (line 1991)
const nameInput = document.getElementById('save-modal-input')
nameInput.addEventListener('focus', () => {
  gamePaused = true  // Pause game when input is focused
})
nameInput.addEventListener('blur', () => {
  gamePaused = false  // Resume game when input loses focus
})

// In animate() game loop (line 1178)
function animate() {
  // Skip physics if game is paused (escape menu)
  if (gamePaused) {
    renderer.render(scene, camera)
    stats.update()
    return
  }
  // ... rest of game loop
}
```

**Verification:**
1. Click SAVE 1 button
2. Type "R" in input → no respawn happens
3. Type "G" in input → no anti-grav toggle
4. Click outside input → game resumes
5. Type "R" → respawn works again

---

### FIX-004: World Zone Discovery Not Reset on Load
```
ISSUE:     Loading a world didn't reset discovered zones
           Result: Zone discovery state persisted incorrectly
IMPACT:    MEDIUM — Incorrect zone discovery state
LOCATION:  src/main.js:2103-2107 (applyWorldData function)
ROOT CAUSE: No clearing of worldZoneDiscovered before loading
```

**Fix Applied:**
```javascript
// In cleanupWorldAssets() (line 2054)
// Reset discovered zones
worldZoneDiscovered.clear()
currentWorldZone = -1
```

**Verification:**
1. Discover all 4 zones in current session
2. Load a saved world
3. Zone discovery should reset to 0/4
4. Re-discover zones as you drive

---

### FIX-005: Teleport Slots Not Saved/Loaded with World
```
ISSUE:     Teleport slots were stored separately from world data
           Result: Teleport points lost when loading different world
IMPACT:    MEDIUM — Lost user data
LOCATION:  src/main.js:1781-1808 (buildSaveDataV8 function)
ROOT CAUSE: Teleport slots not included in save data
```

**Fix Applied:**
```javascript
// In buildSaveDataV8() (line 1791)
function buildSaveDataV8() {
  return {
    version: '8.0',
    // ... other fields
    teleportSlots: loadTeleportSlots(),  // ← ADDED
    // ... rest
  }
}

// In applyWorldData() (line 2108)
if (data.teleportSlots) saveTeleportSlots(data.teleportSlots)
```

**Verification:**
1. Save teleport point at slot 3
2. Save world
3. Delete teleport point
4. Load world
5. Teleport point restored at slot 3

---

## 🟡 IMPORTANT FIXES (UX Issues)

### FIX-006: Expanded Save Slots from 3 to 6
```
ISSUE:     Only 3 save slots available
IMPACT:    MEDIUM — Limited world storage
LOCATION:  index.html:162-215, src/main.js
```

**Fix Applied:**
- Updated HTML to show 6 slots in 3x2 grid
- Updated loadTeleportSlots() to return 7 slots (0-6)
- Updated all slot iteration loops to use 6

**Verification:**
- 6 save buttons visible
- 6 load buttons visible
- All 6 slots save/load correctly

---

### FIX-007: Added Export/Import All Worlds
```
ISSUE:     Could only export/import one world at a time
IMPACT:    MEDIUM — Tedious backup process
LOCATION:  src/main.js:1835-1904
```

**Fix Applied:**
```javascript
// Export ALL worlds to single JSON
function exportAllWorlds() {
  const allWorlds = {}
  let exportedCount = 0
  
  for (let i = 1; i <= 6; i++) {
    const raw = localStorage.getItem('ant-mars-world-' + i)
    if (raw) {
      try {
        allWorlds['world_' + i] = JSON.parse(raw)
        exportedCount++
      } catch(e) {
        console.warn(`[Export] Failed to parse world ${i}`)
      }
    }
  }
  
  // ... create blob and download
}

// Import ALL worlds from JSON
function importAllWorlds(file) {
  // ... read file
  for (const [key, worldData] of Object.entries(data.worlds)) {
    const slotNum = parseInt(key.replace('world_', ''))
    if (slotNum >= 1 && slotNum <= 6) {
      localStorage.setItem('ant-mars-world-' + slotNum, JSON.stringify(worldData))
      importedCount++
    }
  }
}
```

**Verification:**
1. Save 3 different worlds
2. Click EXPORT ALL
3. Delete all worlds from localStorage
4. Click IMPORT ALL
5. Select exported file
6. All 3 worlds restored

---

### FIX-008: Added Teleport Slot Rename/Delete
```
ISSUE:     Teleport slots had fixed names, couldn't be deleted
IMPACT:    LOW — Inflexible teleport system
LOCATION:  src/main.js:1656-1751
```

**Fix Applied:**
- Added ✎ rename button to each slot
- Added ✕ delete button to each slot
- Implemented renameTeleportSlot() with prompt
- Implemented deleteTeleportSlot() with confirm

**Verification:**
1. Open teleport menu (hold R)
2. Click ✎ on slot 2
3. Enter new name
4. Name updates
5. Click ✕ on slot 3
6. Confirm deletion
7. Slot shows as empty

---

### FIX-009: Added Escape Menu with Pause
```
ISSUE:     No way to pause the game
IMPACT:    LOW — No pause functionality
LOCATION:  src/main.js:2219-2262
```

**Fix Applied:**
```javascript
function showEscapeMenu() {
  escapeMenuOpen = true
  gamePaused = true  // Pause physics
  
  // Create menu DOM
  const menu = document.createElement('div')
  menu.id = 'escape-menu'
  // ... buttons: continue, save, load, settings, reset
  
  // Blur game canvas
  renderer.domElement.style.filter = 'blur(4px)'
}

function hideEscapeMenu() {
  escapeMenuOpen = false
  gamePaused = false  // Resume physics
  // ... cleanup
}
```

**Verification:**
1. Press ESC
2. Menu appears, game pauses
3. Vehicle stops moving
4. Click CONTINUE
5. Game resumes

---

### FIX-010: Added Auto-Refresh Load Button Names
```
ISSUE:     Load buttons showed "SLOT X" even when world saved
IMPACT:    LOW — Confusing UX
LOCATION:  src/main.js:1906-1912
```

**Fix Applied:**
```javascript
function s9RefreshLoadBtns() {
  for(let i = 1; i <= 6; i++){
    const loadBtn = document.getElementById('sw-load-'+i)
    const nameEl = document.getElementById('sw-name-'+i)
    if(!loadBtn) continue
    try {
      const raw = localStorage.getItem('ant-mars-world-'+i)
      if(raw) {
        const d = JSON.parse(raw)
        const name = d.slotName || ('SLOT '+i)
        loadBtn.textContent = name.substring(0, 10)
        loadBtn.title = name
        if(nameEl) nameEl.textContent = name.substring(0, 12)
        loadBtn.style.borderColor = 'rgba(180,255,80,0.25)'
        loadBtn.style.color = 'rgba(180,255,80,0.7)'
      } else {
        loadBtn.textContent = 'SLOT '+i
        if(nameEl) nameEl.textContent = '—'
        loadBtn.style.borderColor = 'rgba(255,255,255,0.1)'
        loadBtn.style.color = 'rgba(255,255,255,0.4)'
      }
    } catch(e) {}
  }
}

// Called in setupUI() (line 929)
s9RefreshLoadBtns()
```

**Verification:**
1. Save world with name "Mars Base"
2. Refresh page
3. Load button shows "Mars Base" (truncated)
4. Hover shows full name in tooltip

---

## 🟢 POLISH FIXES (Nice to Have)

### FIX-011: Zone Size Selection (XS/MD/XL)
```
ISSUE:     All zones were same size
IMPACT:    LOW — Inflexible zone creation
LOCATION:  index.html:88-92, src/main.js:141-145, 720-736
```

**Fix Applied:**
```javascript
// Zone size definitions
const ZONE_SIZES = {
  xs: { radius: 5, height: 2, label: 'XS (5m)' },
  md: { radius: 20, height: 5, label: 'MD (20m)' },
  xl: { radius: 100, height: 10, label: 'XL (100m)' }
}

// Size selection buttons
document.querySelectorAll('.zone-size-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    // Update active state
    zonePlacementSize = btn.dataset.size
  })
})

// Use selected size when placing zone
function placeZoneAtPoint(point) {
  const size = ZONE_SIZES[zonePlacementSize]
  // ... create zone with size.dimensions
}
```

---

### FIX-012: Zone Visuals Only in Constructor Mode
```
ISSUE:     Zone wireframes visible during gameplay
IMPACT:    LOW — Immersion breaking
LOCATION:  src/main.js:2287, 2297, 2621
```

**Fix Applied:**
```javascript
// In toggleConstructorMode()
if (constructorMode) {
  // Show zone visuals in constructor mode
  for (const [zoneId, mesh] of customZoneVisuals) mesh.visible = true
} else {
  // Hide zone visuals outside constructor mode
  for (const [zoneId, mesh] of customZoneVisuals) mesh.visible = false
}

// When creating zone visual
mesh.visible = constructorMode  // Initial visibility
```

---

### FIX-013: Minimap Zone Rendering
```
ISSUE:     Custom zones not shown on minimap
IMPACT:    LOW — Missing navigation info
LOCATION:  src/main.js:3174, 3179-3236
```

**Fix Applied:**
```javascript
// In renderMinimap(), after drawing objects
renderMinimapZones(canvas, w, h)

// New function
function renderMinimapZones(canvas, w, h) {
  if (customZones.length === 0) return
  
  const ctx = canvas.getContext('2d')
  const scale = Math.min(w, h) / 200
  
  for (const zone of customZones) {
    const screenX = (zone.position.x - chassisPos.x) * scale + centerX
    const screenZ = (zone.position.z - chassisPos.z) * scale + centerZ
    
    // Draw zone shape (box/sphere/cylinder)
    ctx.strokeStyle = zone.color
    ctx.lineWidth = 2
    ctx.globalAlpha = 0.7
    
    switch(zone.shape) {
      case 'box': ctx.strokeRect(...)
      case 'sphere': ctx.beginPath(); ctx.arc(...); ctx.stroke()
      case 'cylinder': ctx.beginPath(); ctx.arc(...); ctx.stroke()
    }
    
    // Draw label
    ctx.globalAlpha = 0.9
    ctx.fillStyle = zone.color
    ctx.fillText(zone.name, screenX + 8, screenZ - 4)
  }
}
```

---

### FIX-014: Frame/Windowed Mode
```
ISSUE:     No way to have "app within app" look
IMPACT:    LOW — Aesthetic preference
LOCATION:  index.html:282-285, src/style.css:212-287
```

**Fix Applied:**
- Added #game-frame element
- Added #btn-windowed toggle
- CSS for body.windowed-mode
- Canvas shrinks with border-radius
- Black chrome around canvas
- Panels stay position:fixed

---

### FIX-015: Controls Info Bar Toggle
```
ISSUE:     Keyboard shortcuts always visible, cluttering screen
IMPACT:    LOW — Screen real estate
LOCATION:  index.html:259-264, src/main.js:854-864
```

**Fix Applied:**
```javascript
const btnControlsToggle = document.getElementById('btn-controls-toggle')
const controlsBar = document.getElementById('controls-info-bar')
let controlsOpen = false

btnControlsToggle.addEventListener('click', () => {
  controlsOpen = !controlsOpen
  controlsBar.style.display = controlsOpen ? 'block' : 'none'
  btnControlsToggle.style.borderColor = controlsOpen ? 'rgba(0,255,224,0.6)' : 'rgba(255,255,255,0.3)'
  btnControlsToggle.style.color = controlsOpen ? '#00FFE0' : 'rgba(255,255,255,0.6)'
})
```

---

## 📋 TESTING PROTOCOL

### Before Any Commit
```
1. Run npm run dev
2. Open localhost:3000
3. Check console for errors (should be clean)
4. Test core gameplay (drive, jump, boost)
5. Test all drive modes
6. Test constructor mode
7. Test save/load
8. Test zones
9. Test teleport
10. Test UI panels
```

### After Zone System Changes
```
1. Tab → constructor mode
2. Click + ADD ZONE
3. Select size (XS/MD/XL)
4. Click on terrain
5. Zone appears as wireframe
6. Tab → exit constructor
7. Zone wireframe hidden
8. Drive into zone
9. Toast: "ENTERING: Zone 1"
10. Drive out of zone
11. Toast: zone exit message
12. Export zones → JSON downloads
13. Clear zones
14. Import zones → zones restored
```

### After Save/Load Changes
```
1. Place 2 assets
2. SAVE 1 → name "Test World"
3. Place 3 more assets (total 5)
4. SAVE 2 → name "Bigger World"
5. LOAD 1 → should see 2 assets
6. LOAD 2 → should see 5 assets
7. Export → JSON downloads
8. Delete all worlds
9. Import → both worlds restored
```

---

## 🐛 DEBUGGING CHEAT SHEET

### Console Commands
```javascript
// Zone debugging
window.ZoneDebug.list()       // List all zones
window.ZoneDebug.teleport(id) // Teleport to zone
window.ZoneDebug.trigger(id)  // Trigger zone event
window.ZoneDebug.addTestZone() // Add test zone at vehicle
window.ZoneDebug.clear()      // Clear all zones
window.ZoneDebug.active()     // List active zones

// Quick checks
console.log('Placed objects:', placedObjects.length)
console.log('Custom zones:', customZones.length)
console.log('Vehicle mode:', vehicleMode)
console.log('Gravity tanks:', gravTanks)
console.log('World zone:', currentWorldZone)
console.log('Constructor mode:', constructorMode)
console.log('Game paused:', gamePaused)
```

### Common Issues & Solutions
```
ISSUE: Vehicle falls through terrain
FIX:   Check heightfield is built — createHeightfieldSync(x, z)

ISSUE: GLB doesn't appear
FIX:   Check path is correct — /GLB/filename.glb
       Check console for load errors

ISSUE: Zone doesn't trigger
FIX:   Check zone is sensor — collider.setSensor(true)
       Check position detection — isPointInZone()

ISSUE: Save doesn't persist
FIX:   Check localStorage quota (5-10MB limit)
       Check JSON is valid — JSON.stringify(data)

ISSUE: Particles don't appear
FIX:   Check emit conditions (speed, ground contact)
       Check instance matrix updates
```

---

*This document is part of the ANT ON MARS v1.0 documentation suite.*
*Generated: 2026-04-07 | Dev: Argentine tech lead | Stack: Three.js WebGPU + Rapier + Vite 8*
