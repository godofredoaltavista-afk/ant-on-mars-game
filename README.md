<div align="center">
<img src="docs/banner.svg" width="100%" alt="ANT ON MARS"/>
</div>

<br/>

<div align="center">

[![Three.js](https://img.shields.io/badge/Three.js-v0.183-black?style=flat-square&logo=threedotjs&logoColor=white)](https://threejs.org)
[![Rapier](https://img.shields.io/badge/Rapier-v0.19-FF6B35?style=flat-square)](https://rapier.rs)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![WebGPU](https://img.shields.io/badge/WebGPU-enabled-00e5ff?style=flat-square)](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API)
[![JS](https://img.shields.io/badge/Vanilla_JS-ES2024-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](#)

</div>

---

## Qué es esto

Juego 3D experimental construido con **Three.js WebGPU** y **Rapier physics**. Terreno procedural con noise seeded, vehículos con física real (suspensión, steering, torque), y 60+ assets GLB generados con Meshy AI. Sin frameworks, sin abstracciones — WebGL crudo y físicas que se sienten bien.

---

## Features

<table>
<tr>
<td align="center" width="33%">
<br/>
<b>🚗 Física de Vehículo</b>
<br/><br/>
<sub>Rapier3D con suspensión real, steering y torque. Hot-swap de modelos GLB en runtime sin recargar.</sub>
<br/><br/>
</td>
<td align="center" width="33%">
<br/>
<b>🌍 Terreno Procedural</b>
<br/><br/>
<sub>ImprovedNoise seeded, heightfield collision incremental. Extensible por chunks.</sub>
<br/><br/>
</td>
<td align="center" width="33%">
<br/>
<b>📦 60+ GLB Assets</b>
<br/><br/>
<sub>Modelos Meshy AI: vans, ruedas, paisajes marcianos. Manifest JSON auto-loader.</sub>
<br/><br/>
</td>
</tr>
<tr>
<td align="center" width="33%">
<br/>
<b>⚡ WebGPU Renderer</b>
<br/><br/>
<sub>Three.js WebGPURenderer experimental. Stats-GL overlay para perf en tiempo real.</sub>
<br/><br/>
</td>
<td align="center" width="33%">
<br/>
<b>🎮 Input System</b>
<br/><br/>
<sub>EventBus pub/sub desacoplado. Keyboard state manager, preparado para gamepad.</sub>
<br/><br/>
</td>
<td align="center" width="33%">
<br/>
<b>🔧 Arquitectura Modular</b>
<br/><br/>
<sub>Engine, PhysicsWorld, GameLoop, NoiseGenerator — cada uno en su módulo, migración en curso.</sub>
<br/><br/>
</td>
</tr>
</table>

---

## Stack

```
Three.js v0.183       →  Renderer WebGPU + WebGL fallback
@dimforge/rapier3d    →  Physics engine (WASM, compilado desde Rust)
Vite 8.0              →  Dev server + bundler
stats-gl              →  Performance overlay en runtime
Meshy AI              →  Generación de assets GLB
```

---

## Arquitectura

```
ant-on-mars/
├── index.html                    # UI shell — todos los elementos definidos aquí
├── src/
│   ├── main.js                   # Core (monolith → migración modular en curso)
│   ├── style.css                 # Todo el CSS — glass panels, animaciones, responsive
│   ├── core/
│   │   ├── Engine.js             # Escena Three.js, cámara, renderer, luces
│   │   ├── EventBus.js           # Pub/sub para comunicación entre módulos
│   │   ├── GameLoop.js           # Fixed timestep physics + variable render loop
│   │   └── InputManager.js       # Estado de teclado + emisión de eventos
│   ├── physics/
│   │   ├── PhysicsWorld.js       # Wrapper Rapier — world, gravity, step
│   │   ├── VehicleController.js  # Ruedas, steering, torque, suspensión
│   │   └── Heightfield.js        # Collider de terreno, build incremental
│   └── terrain/
│       └── NoiseGenerator.js     # ImprovedNoise seeded, random estable
└── public/
    └── GLB/
        ├── manifest.json         # Catálogo auto-cargado de todos los modelos
        ├── DEFAULTS/             # Modelos default de vehículo y terreno
        └── [60+ .glb files]      # Assets Meshy AI — vans, ruedas, paisajes
```

---

## GLB Assets

Los modelos se cargan desde `public/GLB/manifest.json`. Para agregar uno nuevo:

```bash
# 1. Copiar .glb a public/GLB/
# 2. Registrar en manifest.json
# 3. Hot-swap disponible en runtime via USE_CUSTOM_VEHICLE_GLB flag
```

Incluye: vans naranja/roja, ruedas, manos en montaña, mate, La Bombonera, lava, nieve, rally, satélite, van mundos, vehicle terrain y más.

---

## Correr local

```bash
npm install
npm run dev      # → http://localhost:5173
npm run build    # → dist/
npm run preview  # preview del build
```

---

## Docs

| Archivo | Contenido |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Arquitectura detallada del sistema |
| [`docs/CONTEXT.md`](docs/CONTEXT.md) | Guía de contexto para prompting |
| [`docs/FLOW_TIME.md`](docs/FLOW_TIME.md) | Flow del game loop y timers |
| [`docs/UI_SYSTEMS.md`](docs/UI_SYSTEMS.md) | Componentes de UI |
| [`docs/FUTURE_ROADMAP.md`](docs/FUTURE_ROADMAP.md) | Roadmap de features |
| [`docs/HUMAN_MANIFEST.md`](docs/HUMAN_MANIFEST.md) | Manifiesto del proyecto |

---

<div align="center">
<sub>Built in Córdoba, Argentina · <b>South Hustles Studio</b></sub>
</div>
