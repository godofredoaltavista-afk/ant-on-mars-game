<div align="center">
<img src="docs/banner.svg" width="100%" alt="ANT ON MARS"/>
</div>

<br/>

<div align="center">

[![Three.js](https://img.shields.io/badge/Three.js-r183-black?style=flat-square&logo=threedotjs&logoColor=white)](https://threejs.org)
[![WebGPU](https://img.shields.io/badge/WebGPU-TSL-00e5ff?style=flat-square)](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API)
[![Rapier](https://img.shields.io/badge/Rapier-v0.19_WASM-FF6B35?style=flat-square)](https://rapier.rs)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![Meshy](https://img.shields.io/badge/Meshy_AI-GLB_gen-c8f135?style=flat-square&logoColor=black)](#)

</div>

---

## Motor de Simulación Planetaria · Nativo en el Browser

**ANT ON MARS** no es un juego 3D recreativo. Es un **motor de simulación planetaria nativo en el navegador** y una infraestructura de **generación de datos sintéticos** para el entrenamiento de inteligencia artificial robótica — ejecutado sin hardware especializado, sin instalaciones pesadas, sin licencias propietarias.

Un sistema de **soberanía tecnológica** que resuelve lo que llamo **"Nodos Raíz"**: problemas fundamentales como la navegación autónoma en terrenos alienígenas que, una vez simulados con precisión física, desbloquean ramas enteras de la ciencia. La métrica de éxito es el **Test de Einstein de Demis Hassabis**: ¿puede un sistema entrenado solo con las leyes físicas base redescubrir por sí solo hipótesis complejas como la eyección orbital óptima?

El entorno no es una textura estática. Es un **ecosistema planetario vivo**: atmósfera marciana con modelo Preetham calibrado (turbidity=0.4, rayleigh=0.15), nubes volumétricas FBM en ~2ms, sistema de estrellas procedural con Vía Láctea, clusters y fugaces, ciclo solar dinámico con sombras en tiempo real. Todo renderizado con **TSL (Three Shading Language)** — el compilador de shaders modular nativo de Three.js WebGPU.

> *"Explora la frontera de la web con WebGPU: nubes volumétricas, sombras dinámicas y una atmósfera marciana física renderizada en tiempo real a 60fps. Un cielo que nunca duerme — desde el amanecer rosa-rojizo hasta una noche profunda donde la Vía Láctea y las estrellas fugaces rotan al ritmo de tu exploración."*

<img src="docs/divider.svg" width="100%"/>

## Features

<table>
<tr>
<td align="center" width="33%">
<br/>
<b>🌌 Atmósfera Marciana</b>
<br/><br/>
<sub>SkyMesh Preetham atmosférico. Turbidity marciana (0.4), rayleigh rojizo (0.15), nubes FBM volumétricas en ~2ms. Ciclo solar dinámico — amanecer 7× más lento en la zona de ±25° del horizonte. 100% TSL/WebGPU.</sub>
<br/><br/>
</td>
<td align="center" width="33%">
<br/>
<b>⭐ Sistema Estelar</b>
<br/><br/>
<sub>12,000 estrellas en 3 tamaños con Vía Láctea, clusters y parpadeo trimodal (sinusoidal / destellos / fade). Estrellas fugaces 5× simultáneas. Rotación sincronizada con el slider de órbita solar.</sub>
<br/><br/>
</td>
<td align="center" width="33%">
<br/>
<b>🚁 Drone Ingenuity</b>
<br/><br/>
<sub>Recreación del drone marciano con 3 anillos HUD orbitantes (2 blancos + 1 cyan punteado). Cámara de seguimiento en primera persona. Controles Q/E para orbit cam alrededor del drone.</sub>
<br/><br/>
</td>
</tr>
<tr>
<td align="center" width="33%">
<br/>
<b>🚗 Física de Vehículo</b>
<br/><br/>
<sub>Rapier3D WASM — suspensión independiente por rueda, steering, torque, handbrake. Hot-swap de modelos GLB en runtime via `USE_CUSTOM_VEHICLE_GLB` sin recargar página.</sub>
<br/><br/>
</td>
<td align="center" width="33%">
<br/>
<b>🌍 Terreno Procedural</b>
<br/><br/>
<sub>ImprovedNoise seeded — heightmap reproducible por seed. Heightfield collision incremental de Rapier: solo la zona activa alrededor del vehículo tiene colisión viva. Extensible por chunks.</sub>
<br/><br/>
</td>
<td align="center" width="33%">
<br/>
<b>🎛 Control MIDI-Style</b>
<br/><br/>
<sub>Panel de control externo con sliders dinámicos para órbita solar, velocidad de nubes, cobertura y densidad. Nubes + órbita + estrellas siempre sincronizadas en el mismo slider de tiempo.</sub>
<br/><br/>
</td>
</tr>
<tr>
<td align="center" width="33%">
<br/>
<b>⚡ WebGPU + TSL</b>
<br/><br/>
<sub>WebGPURenderer con fallback automático a WebGL2. TSL (Three Shading Language) para shaders modulares nativos compilados a GLSL/WGSL. Stats-GL overlay: FPS, draw calls, VRAM en runtime.</sub>
<br/><br/>
</td>
<td align="center" width="33%">
<br/>
<b>📦 60+ GLB Assets</b>
<br/><br/>
<sub>Modelos Meshy AI catalogados en `manifest.json`. Vans, ruedas, paisajes marcianos, La Bombonera, mate, metal hands. Auto-loader sin configuración manual.</sub>
<br/><br/>
</td>
<td align="center" width="33%">
<br/>
<b>🔧 EventBus Modular</b>
<br/><br/>
<sub>Pub/sub completamente desacoplado. Engine, PhysicsWorld, GameLoop, InputManager — cada módulo emite y escucha sin referencias directas. Migración monolith→modular en curso.</sub>
<br/><br/>
</td>
</tr>
</table>

<img src="docs/divider.svg" width="100%"/>

## Stack

```
Three.js r183         →  Renderer WebGPU + WebGL2 fallback
TSL                   →  Three Shading Language — shaders modulares nativos
SkyMesh (addons)      →  Cielo atmosférico Preetham + nubes FBM, 100% TSL
@dimforge/rapier3d    →  Physics engine WASM (Rust compilado)
Vite 8.0              →  Dev server HMR + bundler con path aliases
stats-gl              →  GPU performance overlay en runtime
Meshy AI              →  Generación de assets GLB 3D
```

## Arquitectura

```
ant-on-mars/
├── index.html                    # UI shell — HUD, botones, sliders MIDI externos
├── src/
│   ├── main.js                   # ~6500 líneas (monolith → migración modular activa)
│   ├── style.css                 # Glass panels, animaciones, responsive
│   ├── core/
│   │   ├── Engine.js             # Three.js: escena, cámara, WebGPURenderer, tone mapping
│   │   ├── EventBus.js           # Pub/sub — único canal de comunicación entre módulos
│   │   ├── GameLoop.js           # Fixed timestep 60Hz physics + variable render Hz
│   │   └── InputManager.js       # Keyboard + eventos nombrados
│   ├── physics/
│   │   ├── PhysicsWorld.js       # Rapier world — gravity, step, debug renderer
│   │   ├── VehicleController.js  # Suspensión, steering, torque, handbrake
│   │   └── Heightfield.js        # Terrain collider incremental — zona activa del vehículo
│   └── terrain/
│       └── NoiseGenerator.js     # ImprovedNoise seeded — heightmap reproducible
└── public/
    └── GLB/
        ├── manifest.json         # Auto-loader — registrar nuevos GLBs aquí
        ├── DEFAULTS/             # Modelos default de vehículo y terreno
        └── [60+ .glb files]      # Assets Meshy AI
```

## GLB Assets

```bash
# Agregar modelo nuevo:
# 1. Copiar .glb a public/GLB/
# 2. Registrar en public/GLB/manifest.json
# 3. Hot-swap en runtime: activar USE_CUSTOM_VEHICLE_GLB

# Assets:
# vehículos  → vans (naranja, roja, mundos, satélite), rally, ruedas
# entornos   → coast, lava, nieve, La Bombonera, vehicle terrain
# objetos    → manos en montaña, mate, metal hands
```

## Correr local

```bash
npm install
npm run dev      # → http://localhost:5173
npm run build    # → dist/ (terser optimizado)
npm run preview  # → preview del build
```

## Gallery

<table>
<tr>
<td width="50%"><img src="docs/art-01.svg" width="100%"/></td>
<td width="50%"><img src="docs/art-02.svg" width="100%"/></td>
</tr>
</table>

<br/>

<table>
<tr>
<td width="33%"><img src="docs/sq-01.svg" width="100%"/></td>
<td width="33%"><img src="docs/sq-02.svg" width="100%"/></td>
<td width="33%"><img src="docs/sq-03.svg" width="100%"/></td>
</tr>
</table>

## Docs

| | |
|---|---|
| [`ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Arquitectura completa del sistema |
| [`CONTEXT.md`](docs/CONTEXT.md) | Guía para AI prompting con contexto |
| [`FLOW_TIME.md`](docs/FLOW_TIME.md) | Game loop, timers y física |
| [`UI_SYSTEMS.md`](docs/UI_SYSTEMS.md) | HUD y componentes de UI |
| [`FUTURE_ROADMAP.md`](docs/FUTURE_ROADMAP.md) | Features planeados |
| [`HUMAN_MANIFEST.md`](docs/HUMAN_MANIFEST.md) | Manifiesto del proyecto |

<br/>

<img src="docs/footer.svg" width="100%"/>
