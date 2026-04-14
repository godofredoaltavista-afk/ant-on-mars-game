# 🚀 FUTURE_ROADMAP — ANT ON MARS v1.0
## Backend/Frontend Expansion, Mobile Strategy & Web App Architecture

> **Vision:** From desktop WebGL game to cross-platform interactive experience
> **Current State:** Single-player desktop WebGL game
> **Target State:** Cross-platform web app with cloud saves, mobile support, social features
> **Timeline:** Phased approach — each phase delivers value independently

---

## 🗺️ ROADMAP OVERVIEW

```
PHASE 1: FOUNDATION (Now)
  ✅ Core game mechanics
  ✅ Save/Load system
  ✅ Constructor mode
  ✅ Zone system
  ⬜ Modular architecture completion
  ⬜ Performance optimization

PHASE 2: FRONTEND EXPANSION (Next)
  ⬜ Landing page / marketing site
  ⬜ In-game UI overhaul (cards, sections, animations)
  ⬜ Mobile responsive design
  ⬜ Touch controls
  ⬜ Loading screen improvements

PHASE 3: BACKEND INTEGRATION (Soon)
  ⬜ Cloud save system
  ⬜ User authentication
  ⬜ World sharing (URL-based)
  ⬜ Asset library (cloud-hosted GLBs)
  ⬜ Analytics

PHASE 4: SOCIAL & COMMUNITY (Later)
  ⬜ World gallery / showcase
  ⬜ User profiles
  ⬜ Comments / likes
  ⬜ Collaborative building
  ⬜ Asset marketplace

PHASE 5: MONETIZATION (Future)
  ⬜ Premium assets
  ⬜ World templates
  ⬜ Custom branding
  ⬜ API access
```

---

## 📱 PHASE 2: FRONTEND EXPANSION (Detailed)

### 2.1 Landing Page / Marketing Site

**Purpose:** First impression, conversion to game, showcase features

**Structure:**
```
landing/
├── index.html              # Landing page
├── style.css               # Landing styles
├── components/
│   ├── HeroBanner.js       # Full-screen hero with game preview
│   ├── FeatureCards.js     # Horizontal scrollable feature cards
│   ├── GallerySection.js   # Screenshot/video gallery
│   ├── CTASection.js       # Call-to-action (Play Now)
│   └── Footer.js           # Links, social, credits
└── assets/
    ├── hero-video.mp4      # Gameplay trailer
    ├── screenshots/        # Curated screenshots
    └── logos/              # Brand assets
```

**Hero Banner Component:**
```html
<!-- HeroBanner.js -->
<section class="hero-banner" id="hero">
  <div class="hero-video-container">
    <video autoplay muted loop playsinline class="hero-video">
      <source src="/assets/hero-trailer.mp4" type="video/mp4">
    </video>
    <div class="hero-overlay"></div>
  </div>
  
  <div class="hero-content">
    <h1 class="hero-title">
      <span class="title-line" data-text="ANT ON MARS">ANT ON MARS</span>
      <span class="title-subtitle">Gaussian World Engine</span>
    </h1>
    
    <p class="hero-description">
      Build, drive, and explore a procedurally generated Martian landscape.
      Place 3D assets, create custom zones, and share your worlds.
    </p>
    
    <div class="hero-cta-group">
      <a href="/game" class="cta-button cta-primary">
        <span class="cta-text">PLAY NOW</span>
        <span class="cta-arrow">→</span>
      </a>
      <a href="#features" class="cta-button cta-secondary">
        <span class="cta-text">LEARN MORE</span>
      </a>
    </div>
  </div>
  
  <div class="hero-scroll-indicator">
    <span>SCROLL</span>
    <div class="scroll-arrow"></div>
  </div>
</section>
```

**Hero Banner CSS (with animations):**
```css
.hero-banner {
  position: relative;
  height: 100vh;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-video-container {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.hero-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.4) saturate(1.2);
  transform: scale(1.1); /* Prevents edge showing during parallax */
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(0,0,0,0.3) 0%,
    rgba(0,0,0,0.6) 50%,
    rgba(10,2,5,1) 100%
  );
}

.hero-content {
  position: relative;
  z-index: 1;
  text-align: center;
  max-width: 800px;
  padding: 0 24px;
}

.hero-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: clamp(48px, 10vw, 120px);
  letter-spacing: 0.05em;
  color: #fff;
  margin-bottom: 16px;
  animation: titleReveal 1s ease-out 0.5s both;
}

.title-line {
  display: block;
  position: relative;
  overflow: hidden;
}

.title-line::after {
  content: attr(data-text);
  position: absolute;
  left: 0;
  top: 0;
  color: #00FFE0;
  clip-path: inset(0 100% 0 0);
  animation: textReveal 0.8s ease-out 1s both;
}

.title-subtitle {
  display: block;
  font-family: 'Share Tech Mono', monospace;
  font-size: clamp(12px, 2vw, 18px);
  letter-spacing: 0.3em;
  color: rgba(255,255,255,0.5);
  margin-top: 8px;
  animation: fadeUp 0.6s ease-out 1.2s both;
}

.hero-description {
  font-family: 'Inter', sans-serif;
  font-size: clamp(14px, 2vw, 18px);
  line-height: 1.6;
  color: rgba(255,255,255,0.7);
  margin-bottom: 32px;
  animation: fadeUp 0.6s ease-out 1.4s both;
}

.hero-cta-group {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
  animation: fadeUp 0.6s ease-out 1.6s both;
}

.cta-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 32px;
  font-family: 'Share Tech Mono', monospace;
  font-size: 14px;
  letter-spacing: 0.15em;
  text-decoration: none;
  border-radius: 4px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.cta-primary {
  background: rgba(0, 255, 224, 0.15);
  border: 1px solid rgba(0, 255, 224, 0.4);
  color: #00FFE0;
}

.cta-primary:hover {
  background: rgba(0, 255, 224, 0.25);
  border-color: #00FFE0;
  box-shadow: 0 0 20px rgba(0, 255, 224, 0.3);
  transform: translateY(-2px);
}

.cta-primary:hover .cta-arrow {
  transform: translateX(4px);
}

.cta-arrow {
  transition: transform 0.3s ease;
}

.cta-secondary {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.2);
  color: rgba(255,255,255,0.6);
}

.cta-secondary:hover {
  background: rgba(255,255,255,0.05);
  border-color: rgba(255,255,255,0.4);
  color: #fff;
}

.hero-scroll-indicator {
  position: absolute;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: rgba(255,255,255,0.4);
  font-family: 'Share Tech Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.2em;
  animation: scrollBounce 2s ease-in-out infinite;
}

.scroll-arrow {
  width: 1px;
  height: 24px;
  background: linear-gradient(to bottom, rgba(255,255,255,0.4), transparent);
}

/* Animations */
@keyframes titleReveal {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes textReveal {
  from { clip-path: inset(0 100% 0 0); }
  to { clip-path: inset(0 0% 0 0); }
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes scrollBounce {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(8px); }
}

/* Parallax on mouse move */
.hero-banner:hover .hero-video {
  transition: transform 0.3s ease-out;
}
```

**Hero Banner Interactions:**
1. **Mouse hover parallax** — Video moves slightly with cursor position
2. **CTA hover** — Background fills, border glows, arrow slides right
3. **Scroll indicator** — Bounces up/down continuously
4. **Title reveal** — Text slides up, cyan overlay reveals from left
5. **Staggered animations** — Each element appears in sequence

---

### 2.2 Feature Cards Section

**Purpose:** Showcase game features with interactive cards

**Structure:**
```html
<section class="features-section" id="features">
  <div class="section-header">
    <h2 class="section-title">FEATURES</h2>
    <p class="section-subtitle">What makes Ant on Mars unique</p>
  </div>
  
  <div class="features-grid">
    <!-- Card 1: Drive Modes -->
    <div class="feature-card" data-feature="drive-modes">
      <div class="card-visual">
        <div class="card-icon">🚗</div>
        <div class="card-glow"></div>
      </div>
      <div class="card-content">
        <h3 class="card-title">4 Drive Modes</h3>
        <p class="card-description">
          Gravity, Magnetic, Hook, and Float — each with unique physics and controls.
        </p>
        <ul class="card-features">
          <li>Anti-gravity boost</li>
          <li>Magnetic adhesion</li>
          <li>Grappling hook</li>
          <li>Free flight</li>
        </ul>
      </div>
      <div class="card-hover-layer">
        <span class="hover-text">EXPLORE →</span>
      </div>
    </div>
    
    <!-- Card 2: Constructor -->
    <div class="feature-card" data-feature="constructor">
      <div class="card-visual">
        <div class="card-icon">🏗️</div>
        <div class="card-glow"></div>
      </div>
      <div class="card-content">
        <h3 class="card-title">Constructor Mode</h3>
        <p class="card-description">
          Place 3D assets, build custom zones, and create your own worlds.
        </p>
        <ul class="card-features">
          <li>60+ GLB assets</li>
          <li>Drag & drop</li>
          <li>Collision physics</li>
          <li>Save & share</li>
        </ul>
      </div>
      <div class="card-hover-layer">
        <span class="hover-text">BUILD →</span>
      </div>
    </div>
    
    <!-- Card 3: Zones -->
    <div class="feature-card" data-feature="zones">
      <div class="card-visual">
        <div class="card-icon">🔵</div>
        <div class="card-glow"></div>
      </div>
      <div class="card-content">
        <h3 class="card-title">Custom Zones</h3>
        <p class="card-description">
          Create trigger zones with fog, camera, and modal events.
        </p>
        <ul class="card-features">
          <li>3 sizes (XS/MD/XL)</li>
          <li>Fog transitions</li>
          <li>Camera presets</li>
          <li>Modal sequences</li>
        </ul>
      </div>
      <div class="card-hover-layer">
        <span class="hover-text">TRIGGER →</span>
      </div>
    </div>
  </div>
</section>
```

**Feature Cards CSS (with interactions):**
```css
.features-section {
  padding: 80px 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.section-header {
  text-align: center;
  margin-bottom: 48px;
}

.section-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: clamp(32px, 6vw, 64px);
  letter-spacing: 0.1em;
  color: #fff;
  margin-bottom: 8px;
}

.section-subtitle {
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  color: rgba(255,255,255,0.5);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

.feature-card {
  position: relative;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 32px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.feature-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
    rgba(0, 255, 224, 0.1) 0%,
    transparent 50%
  );
  opacity: 0;
  transition: opacity 0.3s ease;
}

.feature-card:hover::before {
  opacity: 1;
}

.feature-card:hover {
  border-color: rgba(0, 255, 224, 0.3);
  transform: translateY(-4px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.card-visual {
  position: relative;
  width: 64px;
  height: 64px;
  margin-bottom: 24px;
}

.card-icon {
  font-size: 48px;
  line-height: 1;
}

.card-glow {
  position: absolute;
  inset: -8px;
  background: radial-gradient(circle, rgba(0,255,224,0.2) 0%, transparent 70%);
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.feature-card:hover .card-glow {
  opacity: 1;
}

.card-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 24px;
  letter-spacing: 0.05em;
  color: #fff;
  margin-bottom: 8px;
}

.card-description {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: rgba(255,255,255,0.6);
  margin-bottom: 16px;
}

.card-features {
  list-style: none;
  padding: 0;
  margin: 0;
}

.card-features li {
  font-family: 'Share Tech Mono', monospace;
  font-size: 12px;
  color: rgba(0, 255, 224, 0.7);
  padding: 4px 0;
  padding-left: 16px;
  position: relative;
}

.card-features li::before {
  content: '◆';
  position: absolute;
  left: 0;
  color: #00FFE0;
  font-size: 8px;
  top: 50%;
  transform: translateY(-50%);
}

.card-hover-layer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
  transform: translateY(100%);
  transition: transform 0.3s ease;
}

.feature-card:hover .card-hover-layer {
  transform: translateY(0);
}

.hover-text {
  font-family: 'Share Tech Mono', monospace;
  font-size: 12px;
  letter-spacing: 0.15em;
  color: #00FFE0;
}

/* Mouse tracking for radial gradient */
.feature-card.addEventListener('mousemove', (e) => {
  const rect = card.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;
  card.style.setProperty('--mouse-x', x + '%');
  card.style.setProperty('--mouse-y', y + '%');
});
```

**Feature Card Interactions:**
1. **Mouse tracking** — Radial gradient follows cursor within card
2. **Hover lift** — Card lifts 4px with shadow
3. **Glow reveal** — Icon glow appears on hover
4. **Bottom slide** — "EXPLORE →" slides up from bottom
5. **Border glow** — Border color transitions to cyan

---

### 2.3 Gallery Section (Horizontal Scroll)

**Purpose:** Showcase screenshots and videos in a horizontal scroll gallery

**Structure:**
```html
<section class="gallery-section" id="gallery">
  <div class="section-header">
    <h2 class="section-title">GALLERY</h2>
    <p class="section-subtitle">Explore the Martian landscape</p>
  </div>
  
  <div class="gallery-container">
    <div class="gallery-track" id="gallery-track">
      <!-- Gallery items injected dynamically -->
    </div>
  </div>
  
  <div class="gallery-controls">
    <button class="gallery-nav gallery-nav-prev" aria-label="Previous">
      <span>←</span>
    </button>
    <div class="gallery-dots" id="gallery-dots"></div>
    <button class="gallery-nav gallery-nav-next" aria-label="Next">
      <span>→</span>
    </button>
  </div>
</section>
```

**Gallery CSS (horizontal scroll with snap):**
```css
.gallery-container {
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  margin: 0 -24px;
  padding: 0 24px;
}

.gallery-container::-webkit-scrollbar {
  display: none;
}

.gallery-track {
  display: flex;
  gap: 16px;
  padding: 16px 0;
}

.gallery-item {
  flex: 0 0 auto;
  width: min(80vw, 600px);
  aspect-ratio: 16 / 9;
  border-radius: 8px;
  overflow: hidden;
  scroll-snap-align: center;
  position: relative;
  cursor: pointer;
}

.gallery-item img,
.gallery-item video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.gallery-item:hover img,
.gallery-item:hover video {
  transform: scale(1.05);
}

.gallery-item-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%);
  opacity: 0;
  transition: opacity 0.3s ease;
  display: flex;
  align-items: flex-end;
  padding: 16px;
}

.gallery-item:hover .gallery-item-overlay {
  opacity: 1;
}

.gallery-item-title {
  font-family: 'Share Tech Mono', monospace;
  font-size: 14px;
  color: #fff;
  letter-spacing: 0.1em;
}

.gallery-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin-top: 24px;
}

.gallery-nav {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.6);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.gallery-nav:hover {
  background: rgba(0, 255, 224, 0.1);
  border-color: rgba(0, 255, 224, 0.3);
  color: #00FFE0;
}

.gallery-dots {
  display: flex;
  gap: 8px;
}

.gallery-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  cursor: pointer;
  transition: all 0.2s ease;
}

.gallery-dot.active {
  background: #00FFE0;
  box-shadow: 0 0 8px rgba(0, 255, 224, 0.4);
}
```

---

### 2.4 Mobile Responsive Design

**Breakpoints:**
```css
/* Mobile first approach */
:root {
  --breakpoint-sm: 480px;   /* Small phones */
  --breakpoint-md: 768px;   /* Tablets */
  --breakpoint-lg: 1024px;  /* Laptops */
  --breakpoint-xl: 1280px;  /* Desktops */
}

/* Game canvas scaling */
@media (max-width: 768px) {
  canvas {
    width: 100vw !important;
    height: 100vh !important;
  }
  
  /* UI panels become bottom sheets */
  #hud-telemetry {
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    border-radius: 12px 12px 0 0;
  }
  
  #drive-mode-panel {
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
  }
  
  /* Touch-friendly buttons */
  .drive-tab, .sw-save-btn, .sw-load-btn {
    min-height: 44px; /* Apple HIG minimum */
    padding: 12px 16px;
  }
  
  /* Hide non-essential UI */
  #trail-info, #mode-indicator {
    display: none;
  }
}

/* Touch controls overlay */
.touch-controls {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 2000;
  padding: 16px;
  pointer-events: none;
}

@media (max-width: 768px) {
  .touch-controls {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  
  .touch-dpad {
    pointer-events: auto;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
    gap: 4px;
    width: 150px;
    height: 150px;
  }
  
  .touch-action-buttons {
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: flex-end;
  }
  
  .touch-btn {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.2);
    color: #fff;
    font-size: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(8px);
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    -webkit-user-select: none;
  }
  
  .touch-btn:active {
    background: rgba(0, 255, 224, 0.2);
    border-color: #00FFE0;
  }
}
```

**Touch Controls Implementation:**
```javascript
// TouchControls.js
class TouchControls {
  constructor(inputManager) {
    this.input = inputManager
    this.dpad = document.querySelector('.touch-dpad')
    this.buttons = document.querySelector('.touch-action-buttons')
    this._setupListeners()
  }
  
  _setupListeners() {
    // D-pad buttons
    const dpadButtons = this.dpad.querySelectorAll('.touch-btn')
    dpadButtons.forEach(btn => {
      const key = btn.dataset.key // 'KeyW', 'KeyA', 'KeyS', 'KeyD'
      
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault()
        this.input.keys[key] = true
      })
      
      btn.addEventListener('touchend', (e) => {
        e.preventDefault()
        this.input.keys[key] = false
      })
    })
    
    // Action buttons
    const actionButtons = this.buttons.querySelectorAll('.touch-btn')
    actionButtons.forEach(btn => {
      const action = btn.dataset.action // 'jump', 'boost', 'menu'
      
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault()
        switch(action) {
          case 'jump': this.input.keys['Space'] = true; break
          case 'boost': this.input.keys['ShiftLeft'] = true; break
          case 'menu': this._toggleMenu(); break
        }
      })
      
      btn.addEventListener('touchend', (e) => {
        e.preventDefault()
        switch(action) {
          case 'jump': this.input.keys['Space'] = false; break
          case 'boost': this.input.keys['ShiftLeft'] = false; break
        }
      })
    })
  }
  
  _toggleMenu() {
    // Open escape menu or drive mode selector
    EventBus.emit('touch:menu')
  }
}
```

---

## ☁️ PHASE 3: BACKEND INTEGRATION (Detailed)

### 3.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                      │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │   Game      │  │   Landing    │  │   World Editor      │ │
│  │   (WebGL)   │  │   Page       │  │   (Constructor)     │ │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬──────────┘ │
│         │                │                      │            │
│         └────────────────┼──────────────────────┘            │
│                          │                                   │
│                   ┌──────▼───────┐                           │
│                   │   API Client │                           │
│                   │   (fetch)    │                           │
│                   └──────┬───────┘                           │
└──────────────────────────┼───────────────────────────────────┘
                           │
                    HTTPS / WSS
                           │
┌──────────────────────────┼───────────────────────────────────┐
│                        SERVER (Node.js)                       │
│                   ┌──────▼───────┐                           │
│                   │   Express    │                           │
│                   │   API        │                           │
│                   └──────┬───────┘                           │
│                          │                                   │
│         ┌────────────────┼────────────────┐                 │
│         │                │                │                 │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐         │
│  │   Auth      │  │   Worlds    │  │   Assets    │         │
│  │   (JWT)     │  │   Service   │  │   Service   │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                 │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐         │
│  │   Users     │  │   Worlds    │  │   Assets    │         │
│  │   (MongoDB) │  │   (MongoDB) │  │   (S3)      │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 API Endpoints

```
AUTH
POST   /api/auth/register     # Create account
POST   /api/auth/login        # Login, returns JWT
POST   /api/auth/refresh      # Refresh token
POST   /api/auth/logout       # Invalidate token

USERS
GET    /api/users/me          # Get current user
PUT    /api/users/me          # Update profile
GET    /api/users/:id         # Get public profile

WORLDS
GET    /api/worlds            # List public worlds (paginated)
POST   /api/worlds            # Create world
GET    /api/worlds/:id        # Get world
PUT    /api/worlds/:id        # Update world
DELETE /api/worlds/:id        # Delete world
POST   /api/worlds/:id/fork   # Fork world (copy)
GET    /api/worlds/:id/share  # Get share URL

ASSETS
GET    /api/assets            # List user assets
POST   /api/assets/upload     # Upload GLB
GET    /api/assets/:id        # Get asset
DELETE /api/assets/:id        # Delete asset
GET    /api/assets/:id/url    # Get signed download URL
```

### 3.3 World Schema (MongoDB)

```javascript
// models/World.js
const worldSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 100 },
  description: { type: String, maxlength: 500 },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // World data (same as localStorage format)
  data: {
    version: String,
    terrain: { frequency: Number, amplitude: Number, planetCurvature: Number },
    environment: { skyColor: String, fogColor: String, fogNear: Number, fogFar: Number },
    camera: { position: Object, fov: Number, mode: String },
    placedAssets: [{
      id: Number,
      originalFilename: String,
      source: String,
      collisionMode: String,
      position: { x: Number, y: Number, z: Number },
      rotation: { x: Number, y: Number, z: Number },
      scale: Number,
      type: String
    }],
    customZones: [Object],
    modals: [Object],
    panels: [Object]
  },
  
  // Metadata
  thumbnail: { type: String }, // URL to screenshot
  isPublic: { type: Boolean, default: false },
  tags: [{ type: String }],
  
  // Stats
  views: { type: Number, default: 0 },
  forks: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
})

// Indexes for performance
worldSchema.index({ owner: 1, createdAt: -1 })
worldSchema.index({ isPublic: 1, createdAt: -1 })
worldSchema.index({ tags: 1 })
worldSchema.index({ name: 'text', description: 'text' })
```

### 3.4 Save Sync Logic

```javascript
// In game: syncWorldToCloud()
async function syncWorldToCloud(slotIndex) {
  const localData = localStorage.getItem(`ant-mars-world-${slotIndex}`)
  if (!localData) return
  
  const worldData = JSON.parse(localData)
  
  // Check if world already exists in cloud
  const existingWorld = await fetch(`/api/worlds?slot=${slotIndex}`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  }).then(r => r.json())
  
  if (existingWorld) {
    // Update existing
    await fetch(`/api/worlds/${existingWorld.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({ data: worldData })
    })
  } else {
    // Create new
    await fetch('/api/worlds', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({
        name: worldData.slotName || `World ${slotIndex}`,
        slot: slotIndex,
        data: worldData,
        isPublic: false
      })
    })
  }
}

// In game: loadWorldFromCloud()
async function loadWorldFromCloud(slotIndex) {
  const world = await fetch(`/api/worlds?slot=${slotIndex}`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  }).then(r => r.json())
  
  if (world) {
    // Save to localStorage
    localStorage.setItem(`ant-mars-world-${slotIndex}`, JSON.stringify(world.data))
    // Load in game
    await applyWorldData(world.data)
  }
}
```

---

## 📊 PHASE 4: SOCIAL & COMMUNITY (High-Level)

### 4.1 World Gallery

```
Features:
- Browse public worlds
- Filter by tags, date, popularity
- Preview world (loads in sandboxed iframe)
- Fork world (copy to your account)
- Like / comment
- Share via URL
```

### 4.2 User Profiles

```
Features:
- Public profile page
- List of created worlds
- Stats (worlds created, total views, likes)
- Avatar / banner
- Bio / description
```

### 4.3 Collaborative Building

```
Features:
- Real-time co-editing (WebSocket)
- Cursor presence (see other users' cursors)
- Chat sidebar
- Version history
- Conflict resolution
```

---

## 💰 PHASE 5: MONETIZATION (High-Level)

### 5.1 Premium Assets

```
Model: One-time purchase or subscription
- Premium GLB asset packs
- Exclusive vehicle skins
- Custom terrain textures
- Zone effects (particles, sounds)
```

### 5.2 World Templates

```
Model: Free + premium templates
- Pre-built worlds (race tracks, cities, puzzles)
- Template marketplace
- Creator revenue share
```

### 5.3 Custom Branding

```
Model: B2B / enterprise
- White-label worlds
- Custom domains
- API access
- Analytics dashboard
```

---

## 🎯 IMMEDIATE NEXT STEPS (Priority Order)

1. **Complete modular architecture** — Wire existing modules into main.js
2. **Fix minimap WebGL rendering** — Use render target instead of 2D fallback
3. **Build zone config panel UI** — Allow editing zone properties
4. **Add landing page** — Hero banner + feature cards + gallery
5. **Mobile responsive design** — Touch controls, UI scaling
6. **Backend setup** — Node.js + Express + MongoDB
7. **Cloud save system** — Auth + world sync
8. **World sharing** — URL-based sharing with preview
9. **Asset library** — Cloud-hosted GLB uploads
10. **Social features** — Gallery, profiles, likes

---

## 📐 TECH STACK RECOMMENDATIONS

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Vite + Vanilla JS | Already using, no framework overhead |
| Backend | Node.js + Express | JavaScript everywhere, easy to learn |
| Database | MongoDB | Flexible schema for world data |
| Auth | JWT + bcrypt | Stateless, scalable |
| Storage | AWS S3 / Cloudflare R2 | Cheap, fast GLB hosting |
| CDN | Cloudflare | Free tier, global edge |
| Realtime | Socket.io | Easy WebSocket abstraction |
| Deployment | Vercel (frontend) + Railway (backend) | Free tiers, easy CI/CD |
| Analytics | Plausible | Privacy-friendly, lightweight |

---

## 🏁 FINAL NOTES

This roadmap is **aspirational but grounded**. Each phase builds on the previous one, and each phase delivers value independently. You don't need to wait for Phase 5 to launch — Phase 2 alone (landing page + mobile) would dramatically increase accessibility.

**The key principle:** Ship something every week. Even if it's small. Momentum compounds.

---

*This document is part of the ANT ON MARS v1.0 documentation suite.*
*Generated: 2026-04-07 | Dev: Argentine tech lead | Stack: Three.js WebGPU + Rapier + Vite 8*
