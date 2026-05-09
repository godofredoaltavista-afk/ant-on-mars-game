# ANT ON MARS — Session Handoff

**Repo:** `godofredoaltavista-afk/ant-on-mars-game`
**Working dir:** `d:\ANTS on MARS\ant-on-mars-vite\`
**Stack:** Three.js WebGPU r183 (WebGL2 fallback) + Rapier physics + Vite 5
**Dev:** `npm run dev` → `localhost:3000`

---

## 1 · Lo que se construyó esta sesión

### 1.1 — Visor de carpeta local independiente
Ruta: **`/catalog-local.html`** (pestaña separada, NO consume RAM del juego principal).

Se abre desde el panel `GLB CATALOG` del constructor con el botón `📂 CARGAR CARPETA LOCAL`. Diseñado como pestaña Vercel-deployable: el mismo dominio que el juego, link compartible, no rompe estado del juego al cerrar.

**Conexión con el juego:** `window.opener.postMessage({ type:'send-to-scene', filename, cleanName, blob })`. El receptor en `src/main.js` (dentro de `setupUI`) escucha `message`, entra a constructor mode si no estaba, llama `loadGLBFromFile` y aplica un escalado 3× (`ghostObject.scale.multiplyScalar(3)`) para que el ghost spawnee proporcional al mundo.

### 1.2 — Carga lógica paginada (pool de 6 slots)
**Problema previo:** cargar 30+ GLBs en simultáneo crashea el navegador (`Too many active WebGL contexts` — el límite real es ~16).
**Problema previo 2:** un solo WebGL renderer compartido (técnica blit) tampoco era suficiente porque la GPU se saturaba con 100+ assets cargados al mismo tiempo.

**Solución actual:** pool de **6 slots máximos activos** + cards en estado *back* por default mostrando solo nombre, peso y rareza. Hover con 220ms delay → si hay slot libre, hace flip 3D, carga el GLB, lo gira en preview. Despawn automático según rareza:

| Rareza | Distribución | Duración | Color |
|---|---|---|---|
| **CLASSIC** | bottom 50% (más livianos) | 4s | cyan `#00FFE0` |
| **VIOLET** | middle 30% | 5s | violeta `#B450FF` |
| **GOLD** | top 20% (más pesados) | 8s | dorado `#FFC828` con shimmer |

La rareza se calcula al hacer `pickFolder` ordenando por `file.size`. Cuando un slot termina, vuelve al estado *back* (se conserva el color de rareza al rotar inversamente — fue un bug que ya está fixed: en `deactivateSlot` solo remueve `flipped`, no `rarity-*`).

**Renderer compartido:** un único `THREE.WebGLRenderer` offscreen (`SHARED_SIZE = 256`). Cada frame, para cada slot activo:
1. inserta el modelo en la escena compartida
2. ajusta `clearColor` y `rimLight.color` según rareza
3. renderiza
4. copia el output al canvas 2D del card con `drawImage`
5. saca el modelo

Esto = **1 contexto WebGL para todo el visor** + 1 más cuando se abre el modal grande.

### 1.3 — Persistencia de carpeta (IndexedDB)
El `FileSystemDirectoryHandle` se guarda en IndexedDB (`ant-mars-viewer / handles / lastFolder`). Al abrir el visor:
- `tryRestoreLastFolder()` levanta el handle.
- Si `queryPermission({ mode:'read' })` devuelve `granted` → carga sola.
- Si no, marca el botón `ELEGIR CARPETA` con `dataset.restore = '1'` y muestra "click ELEGIR para restaurar".
- `smartPickFolder()`: si hay restore pendiente, hace `requestPermission` (re-grant con un solo click); si no, llama al picker tradicional.

**Importante:** Chrome guarda los permisos por sesión, así que tras cerrar el browser puede pedir re-grant — pero un solo click trae de vuelta toda la carpeta sin tener que navegar el filesystem.

### 1.4 — Crop por triángulos
Editor 3D dentro del visor modal grande con:
- 3 sliders **TAMAÑO** X/Y/Z (0.05–3)
- 3 sliders **POSICIÓN** X/Y/Z (-3 a 3) — la box/cilindro se mueve libre, no anclado al centro
- Modos: BOX / CYL
- Botón ↺ RESET

**Algoritmo (sin reconstrucción):** para cada triángulo, si los 3 vértices están dentro del volumen, se conserva. Si no, se descarta. Sin relleno de bordes — los cortes quedan abiertos. Bake del world transform en los vértices del nuevo `BufferGeometry` para que el GLB exportado preserve la posición visual sin matrix.
Export con `GLTFExporter binary:true` → `<cleanName>.glb` (nombre exacto, sin sufijo `.crop`).

### 1.5 — Snapshots dual
Botón **📸** en cada card y **📸 SNAPSHOTS** en visor.
- `<name>.square.png` → 1024×1024, fondo dark studio, asset clean
- `<name>.trailer.png` → 1920×1080, cinematic con HUD overlay (brand "ANT·ON·MARS", título Bebas Neue, stats line, scanline). Usa `composeTrailerHUD` con un canvas 2D que dibuja encima del render.

### 1.6 — Place mode (free-fly camera)
Cuando un asset llega del visor al juego, entra a `enterPlaceMode()`:
- `body.place-mode-active` baja opacidad de paneles laterales a 12% (45% al hover).
- Crosshair central + 4 corner readouts (HUD NASA-style).
- Botón central glassmórfico **`◆ POSICIONÁ + CLICK PARA CONFIRMAR`**.
- WASD adelante/atrás/lados, Q/E up/down, Shift sprint.
- Drag derecho del mouse = pan (OrbitControls). Drag izquierdo = orbit. Scroll = zoom.
- Ghost transparente sigue al cursor (mecánica del constructor existente).
- Click izquierdo en terreno → `placeGhostAtPoint()` → `exitPlaceMode()` automático → cierra `_localViewerWindow` con `window.close()` (la pestaña del visor se cierra sola).
- ESC cancela y remueve el ghost.

### 1.7 — Mystic-tech HUD del visor
Reemplaza el header sticky cyan-fluo por **paneles flotantes draggeables** con SVG layer global de bezier connectors que se actualizan en tiempo real.

| Panel | ID | Contenido |
|---|---|---|
| `BRAND · 01` | `#hud-brand` | Logo SVG (círculos concéntricos), stats GLBs/RENDER |
| `QUERY · 02` | `#hud-search` | Search input, sort select, size slider |
| `CATEGORÍAS · 03` | `#hud-cats` | Chips circulares (todos/vehículos/entornos/props/personajes/otros) |
| `SOURCE · 04` | `#hud-folder` | Nombre de carpeta + botón ELEGIR CARPETA |

Cada panel tiene un `hud-panel-handle` (cursor:grab) con dot circular. Al arrastrarlo, el panel se mueve absoluto y la `tick()` SVG recalcula:
- anchor en el edge más cercano al centro de la pantalla
- bezier curve con control points perpendiculares al vector → línea órganica
- circle anchor blanco en cada extremo
- hub circle central de 28px radio

Estilo: blanco fino sobre `rgba(8,10,14,0.55)` con `backdrop-filter:blur(10px)`. Cero emojis, todo SVG inline.

### 1.8 — Export/Import JSON del mundo (en constructor)
Botones **`↓ EXPORT JSON`** + **`↑ IMPORT JSON`** debajo de "OBJETOS EN ESCENA" en el panel del constructor.
- Export: dispara `exportWorld()` que ya existía → modal de naming → JSON descargado con schema v8.0 (terrain, biomas, zonas, placedAssets con `url`/`source`/`originalFilename`).
- Import: file input → `importWorldFromFile()` → `applyWorldData()`. Si hay assets con `source:'r2'` carga directo de la URL. Si `source:'local'`, muestra `showUnresolvedAssetsPanel` con un botón para resolver con folder picker.

---

## 2 · Lo que viene (próxima sesión)

### 2.1 — IMPORT JSON con carpeta asignada (combinar mundos)
**Goal:** que importar un mundo no requiera re-pickear carpeta cada vez. Si el JSON tiene `source:'local'`, el sistema:
1. Busca en IndexedDB la carpeta más reciente del visor.
2. Pide permiso (1 click) y resuelve los GLBs por nombre automáticamente.
3. Si faltan, muestra solo los faltantes en el unresolved panel.

**Flujo combinar mundos:** importás `mundo_A.json` → carga lo que matchea con la carpeta actual → importás `mundo_B.json` con merge mode → suma assets sin reset, cargando lo que matchea + dejando los R2 directos.

### 2.2 — Cambio de mundos automatizado (drag JSON + carpeta)
**Goal:** drag-and-drop al canvas del juego = JSON + folder simultáneo:
- Si tirás un `.json` → importa world.
- Si tirás una carpeta → restaura visor.
- Si tirás ambos → carga mundo y matchea assets locales con la carpeta tirada.

### 2.3 — Compartir mundos
**Goal:** un mundo + previews + assets cargados en un único bundle para compartir.
Idea: `EXPORT WORLD BUNDLE` que arme un ZIP con:
- `world.json` (schema v8.0 actual)
- `assets/` carpeta con los GLBs locales referenciados
- `previews/` con los `.square.png` de cada asset
- `manifest.json` con paths relativos

Al importar el bundle: se descomprime in-memory, se mapean los GLBs por nombre, se cargan los previews instantáneo en el catálogo del constructor. Listo para enviar a otra persona o subir a Vercel.

### 2.4 — Fixes pendientes
- `Bash` rejection en último intento de git status — pendiente git push.
- Slider velocidad rotación del sol al lado de `SUN ON / NIGHT` (asociado a las nubes ya existentes).
- "Ubicaciones más divertidas" del HUD — momento del usuario decidir layout asimétrico (poster-style).
- Ingenuity dual-mesh sigue revertido — espera GLB separado de rotores en R2.

---

## 3 · Schema v8.0 — placedAssets con `url`

```json
{
  "id": 12,
  "originalFilename": "la.bombonera.meshy.glb",
  "source": "r2" | "local" | "catalog",
  "url": "https://pub-…r2.dev/la.bombonera.meshy.glb" | null,
  "collisionMode": "convex" | "trimesh" | "none",
  "position": [x, y, z],
  "rotation": [x, y, z],
  "scale": [x, y, z],
  "type": "glb"
}
```

`source: "r2"` + `url` → carga directa cross-device. `source: "local"` → necesita folder resolution (panel unresolved).

---

## 4 · Archivos clave tocados esta sesión

| Archivo | Cambios |
|---|---|
| `public/catalog-local.html` | **NUEVO** — visor completo (~1600 líneas) con HUD místico, pool 6 slots, crop por triángulos, snapshots dual, IndexedDB persist |
| `src/main.js` | + listener postMessage (`send-to-scene`), `enterPlaceMode`/`exitPlaceMode` con free-fly WASD, escalado 3×, wire export/import JSON buttons, `_localViewerWindow` ref. Borrado: `addLocalFolderToCatalog` (consumía 6GB RAM con 30 GLBs) |
| `src/core/Engine.js` | shadow map 2048→1024 (perf) |
| `index.html` | + botón `📂 CARGAR CARPETA LOCAL` en GLB Catalog, + botones `↓ EXPORT JSON`/`↑ IMPORT JSON` debajo de Objetos en Escena, + CSS place-mode HUD (corners, crosshair, dimmed panels) |

---

## 5 · Comandos rápidos

```bash
cd "d:/ANTS on MARS/ant-on-mars-vite"
npm run dev                  # localhost:3000
# Visor: localhost:3000/catalog-local.html
```

**R2 base URL:** `https://pub-6aa6b6baa3b043bf9598c7429620b422.r2.dev`
