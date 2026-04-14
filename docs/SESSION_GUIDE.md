# ANT ON MARS — SESSION GUIDE
> How to work fast in this codebase. For Sonnet 4.6. Read before touching anything.

---

## WHO IS THE JEFE

**godofredoaltavista-afk** — Argentine developer, project owner, final decision maker.
You (the AI) propose, implement locally, test. The jefe approves and triggers the push.
**Never push to GitHub without explicit instruction from the jefe.**

---

## THE GOLDEN WORKFLOW

```
1. Edit src/main.js (or index.html, style.css)
2. npm run dev  →  test on localhost:3003
3. If feature needs prod verification: npm run build && npx vite preview --port 4174
4. Jefe says "push" → git add + git commit + git push origin main
5. Vercel auto-redeploys. Done.
```

That's the entire loop. Never deviate from it.

---

## CONTEXT LOADING (start of every session)

Read these in order:
1. `docs/ARCHITECTURE.md` — stack, systems, R2 list, file structure
2. `docs/UI_SYSTEMS.md` — panel inventory, drag system, state persistence
3. `docs/SESSION_GUIDE.md` — this file, workflow rules
4. Skim `src/main.js` lines 1–130 — globals, presets, catalog definition

That's enough to start working on any feature.

---

## WHAT'S IN main.js (line map)

| Lines | System |
|---|---|
| 1–43 | Imports, scene setup, globals |
| 44–66 | `VEHICLE_PRESETS` — chassis/wheel R2 URLs |
| 115–130 | `GLB_CDN_BASE`, `R2_ASSETS[]`, `loadGLBCatalog()` |
| 369–420 | `initVehicle()` — spawn physics + load GLB |
| 460–520 | Vehicle skin switcher |
| 770–800 | Constructor drag-drop + file input |
| 2749–2760 | `loadAssetFromSave()` — world restore from JSON |
| 2929–2960 | Constructor object list + inspector UI |
| 3113 | `VEHICLE_SKINS[]` |

---

## ADDING A NEW GLB TO THE CATALOG

1. Upload the `.glb` to Cloudflare R2 bucket
2. In `main.js`, add filename to `R2_ASSETS[]` (line ~120):
   ```js
   'my-new-asset.glb',
   ```
3. That's it. The catalog renders it automatically.
4. Test on dev, then push when jefe approves.

---

## ADDING A NEW VEHICLE PRESET

In `VEHICLE_PRESETS[]` (line ~45):
```js
{
  name: 'NEW VAN',
  chassis: `${GLB_CDN_BASE}/my-chassis.glb`,
  wheels: `${GLB_CDN_BASE}/my-wheels.glb`,
  chassisScale: 1.0,
  wheelScale: 0.49,
  chassisRotY: 0,
  wheelOffsetY: 0.42,
  chassisOffsetY: 0.65
}
```
Make sure the GLB files exist on R2 first.

---

## FEATURE ROADMAP HINTS (from session context)

Things that came up as next steps:
- GIF / SVG / image asset loading in the constructor (alongside GLBs)
- New world zones with distinct terrain configs
- Additional gravity mechanics
- More R2 GLB assets (upload → add to R2_ASSETS)
- Visual improvements: bloom, tone mapping, fog density controls
- Mobile touch controls

---

## RULES FOR AI SESSIONS

### DO
- Edit `src/main.js` directly — it's the whole app
- Test locally before every push
- Use `GLB_CDN_BASE` constant for all GLB URLs
- Keep UI patterns consistent (drag, glass, localStorage persistence)
- Ask the jefe before pushing

### DON'T
- Split main.js into modules
- Add new npm dependencies without confirming
- Push to GitHub without jefe approval
- Modify Constructor drag-drop, Save/Load, or physics core unless explicitly asked
- Add GLBs directly to the repo — R2 is the only GLB host

---

## CREDENTIALS & URLS

| Service | URL |
|---|---|
| GitHub repo | https://github.com/godofredoaltavista-afk/ant-on-mars-game |
| Vercel live | https://ant-on-mars-game.vercel.app |
| R2 CDN base | https://pub-6aa6b6baa3b043bf9598c7429620b422.r2.dev |
| Local dev | http://localhost:3003 |
| Local prod preview | http://localhost:4174 |

---

## THE VISION

> "Ant on Mars seeks to find a place on Mars."

This is not a portfolio project. This is an experiment in what a browser can hold —
a real-time physics world, constructable, driveable, inhabitable.
Built by Argentine developers who are becoming the new DeepMind of this century.

Every session: ship something real. Test it. Make it better.
The jefe decides when it goes live.
