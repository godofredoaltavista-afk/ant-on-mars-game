<div align="center">
<img src="docs/banner.svg" width="100%" alt="ANT ON MARS"/>
</div>

<br/>

<div align="center">

### 🚀 [ant-on-mars-game.vercel.app](https://ant-on-mars-game.vercel.app)

[![Three.js](https://img.shields.io/badge/Three.js-r183_WebGPU-black?style=flat-square&logo=threedotjs&logoColor=white)](https://threejs.org)
[![TSL](https://img.shields.io/badge/TSL-Shading_Language-00e5ff?style=flat-square)](#)
[![Rapier](https://img.shields.io/badge/Rapier-WASM_Physics-FF6B35?style=flat-square)](https://rapier.rs)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel_Edge-black?style=flat-square&logo=vercel)](https://ant-on-mars-game.vercel.app)

</div>

---

## Motor de Simulación Planetaria · Browser-Native · Zero Dependencies

**ANT ON MARS** es una plataforma de simulación de entorno marciano ejecutada 100% en el navegador, sin instalación, sin plugins, sin hardware especializado. Lo que ves en producción corre sobre **WebGPU nativo con fallback WebGL2**, física **Rapier WASM compilada desde Rust**, y un renderer atmosférico **Preetham calibrado para Marte** — todo desplegado en Vercel Edge en milisegundos.

La pregunta que responde este proyecto: **¿puede el browser moderno convertirse en una plataforma de simulación científica de grado profesional?** La respuesta es sí — y la implementación lo demuestra en producción.

Esto no es entretenimiento. Es una **infraestructura de generación de datos sintéticos** para el entrenamiento de modelos de navegación autónoma en terrenos alienígenas. Cada ejecución genera trayectorias, colisiones y datos de física que pueden alimentar pipelines de IA robótica. El mismo motor que renderiza el cielo marciano puede exportar el estado del mundo como JSON estructurado para entrenamiento.

<img src="docs/divider.svg" width="100%"/>

## Por qué importa técnicamente

**Para equipos de Vercel / Edge Computing:**
El proyecto demuestra que workloads de simulación física pesada (Rapier WASM + Three.js WebGPU) son deployables en edge sin servidor de estado. Zero backend. Static deploy. El cliente hace todo el trabajo de cómputo — lo que implica que la infraestructura escala a costo casi cero sin importar el número de usuarios simultáneos.

**Para equipos de Robotics / AI:**
El terreno procedural es reproducible por seed. Cualquier configuración del mundo puede reconstruirse exactamente a partir de un integer. Esto significa que las trayectorias del vehículo son auditables, los datos de colisión son deterministas, y los datasets de entrenamiento son versionables — exactamente lo que necesitás para synthetic data pipelines.

**Para equipos de WebGPU / Graphics:**
TSL (Three Shading Language) compila a WGSL para WebGPU y GLSL para WebGL2 desde el mismo código fuente. El proyecto implementa `SkyMesh` atmosférico con nubes FBM volumétricas (~2ms render time), sistema estelar procedural con 12,000 puntos en 3 tamaños, y tone mapping ACES Filmic — todo funcionando en el renderer experimental de Three.js r183.

<img src="docs/divider.svg" width="100%"/>

## Cómo se usa

```
🌐  Abrí  →  https://ant-on-mars-game.vercel.app

🚗  Vehículo          WASD / Flechas — acelerar, frenar, girar
                      Espacio         — handbrake
                      Shift           — turbo

🚁  Drone Ingenuity   Tab             — cambiar al drone
                      WASD            — mover drone
                      Q / E           — rotar cámara orbit alrededor del drone

☀  Entorno            SUN / NIGHT     — toggle día/noche con transición suave
                      ORBIT slider    — controla velocidad solar, nubes y estrellas
                                        (todo sincronizado en un único control)

📦  Assets            GLB panel       — hot-swap de modelos de vehículo sin recargar
                      manifest.json   — catálogo editable de 60+ modelos Meshy AI
```

**Gamificación y exploración libre:**
El terreno es infinito en todas las direcciones — el heightfield collision se construye incrementalmente alrededor del vehículo. No hay mapa cargado de antemano. Cada seed genera un planeta diferente. El sistema de órbita solar crea condiciones lumínicas únicas: madrugada marciana, mediodía con polvo atmosférico, noche con Vía Láctea completa. La exploración libre es el loop principal — el mundo reacciona a tus decisiones de movimiento con física real.

**El drone como segunda perspectiva:**
El Ingenuity tiene cámara de primera persona, anillos HUD orbitantes (cyan + blanco) y physics propias separadas del vehículo. Cambiar entre vehículo y drone en el mismo mundo sin recarga es un mechanic deliberado de escala — el Mars rover desde el suelo vs. el drone desde el aire muestran el mismo terreno en dimensiones completamente distintas.

<img src="docs/divider.svg" width="100%"/>

## Decisiones de arquitectura

| Decisión | Por qué |
|---|---|
| **Vanilla JS sin framework** | Sin overhead de reconciliación de VDOM en el game loop. El renderer corre a 60Hz fijo — cualquier framework introduce latencia no determinista que rompe la física. |
| **Rapier WASM sobre Cannon.js** | Rapier está compilado desde Rust — velocidad de cómputo 3-5× mayor para rigid bodies. Crítico para heightfield collision con 10,000+ vértices activos. |
| **EventBus pub/sub** | El motor de física no sabe que existe el renderer. El renderer no sabe que existe el input system. Desacoplamiento total — cada módulo es testeable y reemplazable independientemente. |
| **Heightfield incremental** | No se carga el terreno completo en memoria. Solo el chunk alrededor del vehículo tiene colisión activa. Permite terreno infinito en dispositivos con 2GB RAM. |
| **TSL sobre GLSL custom** | TSL compila a WGSL (WebGPU) y GLSL (WebGL2) desde el mismo código. Un shader, dos targets. Sin mantenimiento de dos codebases de shaders. |
| **Seed-based terrain** | El estado completo del mundo es reproducible desde un integer. Exportable, versionable, auditable para datasets de IA. |

## Stack

```
Three.js r183 + WebGPU  →  Renderer experimental — TSL shaders, WGSL/GLSL dual output
SkyMesh (addons)        →  Atmósfera Preetham + nubes FBM — 100% TSL compatible
@dimforge/rapier3d      →  Physics engine WASM, compilado desde Rust
Vite 8.0                →  Dev server HMR + bundler con path aliases (@core, @physics)
stats-gl                →  GPU overlay: FPS, draw calls, VRAM en tiempo real
Meshy AI                →  Pipeline de generación de assets GLB 3D
Vercel Edge             →  Deploy estático — cómputo 100% client-side
```

## Arquitectura

```
ant-on-mars/
├── index.html                    # UI shell — HUD, sliders MIDI, botones externos
├── src/
│   ├── main.js                   # Entry (~6500 líneas, migración modular activa)
│   ├── style.css                 # Glass panels, responsive, animaciones
│   ├── core/
│   │   ├── Engine.js             # Three.js: escena, cámara, WebGPURenderer, ACES tone mapping
│   │   ├── EventBus.js           # Pub/sub desacoplado — único canal entre módulos
│   │   ├── GameLoop.js           # Fixed timestep 60Hz physics + variable render Hz
│   │   └── InputManager.js       # Keyboard state → eventos nombrados
│   ├── physics/
│   │   ├── PhysicsWorld.js       # Rapier world — gravity, debug renderer, step
│   │   ├── VehicleController.js  # Suspensión independiente, steering, torque, handbrake
│   │   └── Heightfield.js        # Terrain collider incremental — solo zona activa
│   └── terrain/
│       └── NoiseGenerator.js     # ImprovedNoise seeded — determinista por seed
└── public/
    └── GLB/
        ├── manifest.json         # Catálogo auto-loader — registrar nuevos assets aquí
        └── [60+ .glb]            # Assets Meshy AI versionados
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

## Dev

```
🌐  Live  →  https://ant-on-mars-game.vercel.app
```

```bash
npm install
npm run dev      # → http://localhost:5173
npm run build    # → dist/ (terser + tree shaking)
npm run preview  # → preview del build final
```

## Docs

| | |
|---|---|
| [`ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Arquitectura completa del sistema |
| [`CONTEXT.md`](docs/CONTEXT.md) | Contexto para AI prompting |
| [`FLOW_TIME.md`](docs/FLOW_TIME.md) | Game loop, timers y física |
| [`FUTURE_ROADMAP.md`](docs/FUTURE_ROADMAP.md) | Roadmap — multiplayer, export de datasets, Gaussian Splats |
| [`HUMAN_MANIFEST.md`](docs/HUMAN_MANIFEST.md) | Manifiesto del proyecto |

<br/>

<img src="docs/footer.svg" width="100%"/>
