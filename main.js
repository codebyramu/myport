/**
 * ==========================================================================
 * RAMU® CINEMATIC PORTFOLIO — CORE ENGINE
 * Hardware-Accelerated Canvas Scrubbing, Lenis, GSAP & Neon Helix Drift
 * ==========================================================================
 */

(() => {
  // --------------------------------------------------------------------------
  // 1. Initialize Lucide Icons
  // --------------------------------------------------------------------------
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // --------------------------------------------------------------------------
  // 2. Initialize Lenis Smooth Scroll
  // --------------------------------------------------------------------------
  let lenis = null;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (typeof Lenis !== 'undefined' && !reducedMotion) {
    lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.5,
    });

    function lenisRaf(time) {
      lenis.raf(time);
      requestAnimationFrame(lenisRaf);
    }
    requestAnimationFrame(lenisRaf);
  }

  // ==========================================================================
  // 3. HERO CANVAS: 44-Frame Interactive Cursor-Driven Engine
  //    (NO AUTO-PLAY IDLE LOOP! Plays ONLY when cursor moves)
  //    Cursor UP -> plays normal (0 -> n); Cursor DOWN -> plays reverse (n -> 0)
  // ==========================================================================
  const heroCanvas = document.getElementById('heroCanvas');
  const heroCtx = heroCanvas ? heroCanvas.getContext('2d', { alpha: false, desynchronized: true }) : null;
  const heroAudio = document.getElementById('heroAudio');
  const heroAudioBtn = document.getElementById('heroAudioBtn');
  const heroAudioIcon = document.getElementById('heroAudioIcon');
  const heroAudioText = document.getElementById('heroAudioText');

  const HERO_TOTAL = 44;
  const heroImages = new Array(HERO_TOTAL);
  let heroRenderedIdx = -1;
  let heroCurrentFrame = 0;
  let heroDir = 1; // 1 = forward (0 -> 43), -1 = reverse (43 -> 0)
  let heroVelocity = 0; // Starts at 0: ZERO AUTO-PLAY ON IDLE!
  let lastCursorY = null;
  let lastCursorX = null;
  let lastMoveTime = performance.now();
  let heroLastValidImg = null;

  // Preload all 44 hero frames
  for (let i = 0; i < HERO_TOTAL; i++) {
    const img = new Image();
    const pad = String(i + 1).padStart(4, '0');
    img.src = `hero_frames/frame_${pad}.webp`;
    img.onload = () => {
      img._loaded = true;
      if (i === 0 && heroRenderedIdx === -1) {
        renderHeroFrame(0);
      }
    };
    heroImages[i] = img;
  }

  function sizeHeroCanvas() {
    if (!heroCanvas || !heroCtx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    heroCanvas.width = Math.round(heroCanvas.clientWidth * dpr);
    heroCanvas.height = Math.round(heroCanvas.clientHeight * dpr);
    heroCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (heroRenderedIdx >= 0) {
      renderHeroFrame(heroRenderedIdx);
    } else {
      renderHeroFrame(0);
    }
  }

  function renderHeroFrame(index) {
    if (!heroCanvas || !heroCtx) return;

    let targetImg = heroImages[index];
    if (!targetImg || !targetImg._loaded) {
      if (heroLastValidImg) {
        targetImg = heroLastValidImg;
      } else {
        for (let b = index - 1; b >= 0; b--) {
          if (heroImages[b] && heroImages[b]._loaded) {
            targetImg = heroImages[b];
            break;
          }
        }
      }
    }

    if (!targetImg || !targetImg.naturalWidth) return;
    heroLastValidImg = targetImg;
    heroRenderedIdx = index;

    const cw = heroCanvas.clientWidth;
    const ch = heroCanvas.clientHeight;
    const iw = targetImg.naturalWidth;
    const ih = targetImg.naturalHeight;

    // Full-bleed cover math
    const scale = Math.max(cw / iw, ch / ih);
    const sw = iw * scale;
    const sh = ih * scale;
    const sx = (cw - sw) / 2;
    const sy = (ch - sh) / 2;

    heroCtx.clearRect(0, 0, cw, ch);
    heroCtx.drawImage(targetImg, sx, sy, sw, sh);
  }

  // Pointer Movement: Cursor Up -> Normal forward (0->n), Cursor Down -> Reverse (n->0)
  window.addEventListener('pointermove', (e) => {
    const now = performance.now();
    const dt = Math.max(now - lastMoveTime, 8);
    lastMoveTime = now;

    if (lastCursorY !== null) {
      const deltaY = e.clientY - lastCursorY;
      const speedMagnitude = Math.abs(deltaY) / dt;

      // Only advance when cursor is actively moving
      if (Math.abs(deltaY) > 1.2) {
        // Cursor moving UP (deltaY < 0): forward / normal
        if (deltaY < 0) {
          heroDir = 1;
        }
        // Cursor moving DOWN (deltaY > 0): reverse / downward
        else {
          heroDir = -1;
        }

        // Add velocity directly from cursor movement
        const impulse = Math.min(speedMagnitude * 0.5, 1.8);
        heroVelocity = Math.max(heroVelocity, impulse);
      }

      // 3D Parallax tilt effect on the hero canvas
      const normX = (e.clientX / window.innerWidth) - 0.5;
      const normY = (e.clientY / window.innerHeight) - 0.5;
      if (heroCanvas) {
        heroCanvas.style.transform = `translate3d(${normX * 16}px, ${normY * 12}px, 0) scale(1.03)`;
      }
    }

    lastCursorY = e.clientY;
    lastCursorX = e.clientX;
  }, { passive: true });

  // Main Hero RAF: ONLY plays when cursor velocity > 0 (No auto-play on idle!)
  function heroRAF() {
    if (heroVelocity > 0.008) {
      heroCurrentFrame += heroDir * heroVelocity;

      // Friction: smoothly slow down when mouse stops moving
      heroVelocity *= 0.88;

      // Ping-pong loop at boundaries (0 <-> 43)
      if (heroCurrentFrame >= HERO_TOTAL - 1) {
        heroCurrentFrame = HERO_TOTAL - 1;
        heroDir = -1;
      } else if (heroCurrentFrame <= 0) {
        heroCurrentFrame = 0;
        heroDir = 1;
      }

      const frameIdx = Math.round(heroCurrentFrame);
      if (frameIdx !== heroRenderedIdx) {
        renderHeroFrame(frameIdx);
      }

      // Engine audio rev sync
      if (heroAudio && !heroAudio.paused) {
        heroAudio.playbackRate = Math.max(0.85, Math.min(1.4, 0.95 + heroVelocity * 0.25));
      }
    } else {
      heroVelocity = 0;
    }

    requestAnimationFrame(heroRAF);
  }

  requestAnimationFrame(heroRAF);

  // Hero Audio Toggle Button
  if (heroAudioBtn && heroAudio) {
    heroAudioBtn.addEventListener('click', () => {
      if (heroAudio.paused) {
        heroAudio.play().then(() => {
          heroAudioText.textContent = 'SOUND ON';
          if (heroAudioIcon) heroAudioIcon.setAttribute('data-lucide', 'volume-2');
          heroAudioBtn.classList.add('active');
          if (window.lucide) window.lucide.createIcons();
        }).catch((err) => {
          console.warn('Audio play request blocked:', err);
        });
      } else {
        heroAudio.pause();
        heroAudioText.textContent = 'SOUND OFF';
        if (heroAudioIcon) heroAudioIcon.setAttribute('data-lucide', 'volume-x');
        heroAudioBtn.classList.remove('active');
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  // ==========================================================================
  // 4. DRIFT FILM CANVAS: 395-Frame Silky-Smooth Inertial Scroll Sequence
  //    Choreographed Typography:
  //    - 0% - 37%: "MOTION WITH INTENT" (fades out at 37%)
  //    - 37% - 52%: "BUILT TO MOVE"
  //    - 54% - 74%: "STAY CURIOUS" (slowly fades out from 74% to 76%)
  //    - 76% - 85%: "PORTFOLIO" in correct spacing & font (fades away at 85% before 87%)
  //    - 87%+: clear
  // ==========================================================================
  const filmCanvas = document.getElementById('filmCanvas');
  const filmCtx = filmCanvas ? filmCanvas.getContext('2d', { alpha: false, desynchronized: true }) : null;
  const heroDriftSection = document.getElementById('top');
  const heroOverlay = document.getElementById('heroOverlay');
  const filmTitleOverlay = document.getElementById('filmTitleOverlay');
  const filmHeading = document.getElementById('filmHeading');
  const filmHud = document.getElementById('filmHud');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');

  const TOTAL_FILM_FRAMES = 395;
  const filmImages = new Array(TOTAL_FILM_FRAMES);
  let filmRenderedIndex = -1;
  let filmLastValidImage = null;
  let currentHeadingText = '';

  // Preload all 395 film frames
  for (let i = 0; i < TOTAL_FILM_FRAMES; i++) {
    const img = new Image();
    const pad = String(i + 1).padStart(4, '0');
    img.src = `frames/frame_${pad}.webp`;
    img.onload = () => {
      img._loaded = true;
      if (i === 0 && filmRenderedIndex === -1) {
        renderFilmFrame(0);
      }
    };
    filmImages[i] = img;
  }

  function sizeFilmCanvas() {
    if (!filmCanvas || !filmCtx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    filmCanvas.width = Math.round(filmCanvas.clientWidth * dpr);
    filmCanvas.height = Math.round(filmCanvas.clientHeight * dpr);
    filmCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (filmRenderedIndex >= 0) {
      renderFilmFrame(filmRenderedIndex);
    } else {
      renderFilmFrame(0);
    }
  }

  function renderFilmFrame(index) {
    if (!filmCanvas || !filmCtx) return;

    let targetImg = filmImages[index];
    if (!targetImg || !targetImg._loaded) {
      if (filmLastValidImage) {
        targetImg = filmLastValidImage;
      } else {
        for (let b = index - 1; b >= 0; b--) {
          if (filmImages[b] && filmImages[b]._loaded) {
            targetImg = filmImages[b];
            break;
          }
        }
      }
    }

    if (!targetImg || !targetImg.naturalWidth) return;
    filmLastValidImage = targetImg;
    filmRenderedIndex = index;

    const cw = filmCanvas.clientWidth;
    const ch = filmCanvas.clientHeight;
    const iw = targetImg.naturalWidth;
    const ih = targetImg.naturalHeight;

    // Full-bleed cover math
    const scale = Math.max(cw / iw, ch / ih);
    const sw = iw * scale;
    const sh = ih * scale;
    const sx = (cw - sw) / 2;
    const sy = (ch - sh) / 2;

    filmCtx.fillStyle = '#080809';
    filmCtx.fillRect(0, 0, cw, ch);
    filmCtx.drawImage(targetImg, sx, sy, sw, sh);
  }

  // Exact Percentage-Driven Headline Choreography
  function updateFilmHeading(progress) {
    if (!filmHeading) return;

    let targetHTML = '';
    let opacity = 1;

    if (progress < 0.35) {
      targetHTML = 'MOTION<br>WITH <span>INTENT.</span>';
      opacity = 1;
    } else if (progress < 0.37) {
      // 35% - 37%: Fading away previous text
      targetHTML = 'MOTION<br>WITH <span>INTENT.</span>';
      opacity = Math.max(0, (0.37 - progress) / 0.02);
    } else if (progress < 0.385) {
      // At exactly 37%: new text enters
      targetHTML = 'BUILT TO<br><span>MOVE.</span>';
      opacity = Math.max(0, Math.min(1, (progress - 0.37) / 0.015));
    } else if (progress < 0.52) {
      targetHTML = 'BUILT TO<br><span>MOVE.</span>';
      opacity = 1;
    } else if (progress < 0.54) {
      // Crossfade to STAY CURIOUS
      targetHTML = 'STAY<br><span>CURIOUS.</span>';
      opacity = Math.max(0, Math.min(1, (progress - 0.52) / 0.02));
    } else if (progress < 0.74) {
      // 54% - 74%: STAY CURIOUS
      targetHTML = 'STAY<br><span>CURIOUS.</span>';
      opacity = 1;
    } else if (progress < 0.755) {
      // At 74: STAY CURIOUS slowly fades away
      targetHTML = 'STAY<br><span>CURIOUS.</span>';
      opacity = Math.max(0, (0.755 - progress) / 0.015);
    } else if (progress < 0.76) {
      // Crossfades into PORTFOLIO to arrive with full intensity at exactly 76%
      targetHTML = '<div class="portfolio-word">PORT<span>FOLIO</span></div>';
      opacity = Math.max(0, Math.min(1, (progress - 0.755) / 0.005));
    } else if (progress <= 0.85) {
      // Exactly 76% - 85%: PORTFOLIO in correct spacing and font
      targetHTML = '<div class="portfolio-word">PORT<span>FOLIO</span></div>';
      opacity = 1;
    } else if (progress < 0.87) {
      // Exactly at 85%: fades away before reaching 87%
      targetHTML = '<div class="portfolio-word">PORT<span>FOLIO</span></div>';
      opacity = Math.max(0, (0.87 - progress) / 0.02);
    } else {
      // 87%+: clear for the final drift climax
      targetHTML = '';
      opacity = 0;
    }

    if (currentHeadingText !== targetHTML && targetHTML !== '') {
      filmHeading.innerHTML = targetHTML;
      currentHeadingText = targetHTML;
    }

    filmHeading.style.opacity = opacity.toFixed(3);
  }

  function updateFilmHUD(progressFraction) {
    const pct = Math.max(0, Math.min(100, Math.round(progressFraction * 100)));
    if (progressFill) progressFill.style.width = `${pct}%`;
    if (progressText) progressText.textContent = `${String(pct).padStart(2, '0')}%`;
    updateFilmHeading(progressFraction);
  }

  // Unified Hero -> Drift Crossfade & Scrubber Engine
  function handleHeroDriftUpdate(totalProgress) {
    const FADE_END = 0.07; // Crossfade within first 7% of scroll

    if (totalProgress <= FADE_END) {
      // Phase 1: Hero territory - Reactive cursor video is visible
      const heroAlpha = Math.max(0, 1 - (totalProgress / FADE_END));
      if (heroCanvas) {
        heroCanvas.style.opacity = heroAlpha.toFixed(3);
        heroCanvas.style.pointerEvents = heroAlpha > 0.1 ? 'auto' : 'none';
      }
      if (heroOverlay) {
        const overlayAlpha = Math.max(0, 1 - (totalProgress / (FADE_END * 0.8)));
        heroOverlay.style.opacity = overlayAlpha.toFixed(3);
        heroOverlay.style.transform = `translateY(${-totalProgress * 250}px)`;
        heroOverlay.style.pointerEvents = overlayAlpha > 0.3 ? 'auto' : 'none';
      }
      if (filmTitleOverlay) {
        filmTitleOverlay.style.opacity = '0';
      }
      if (filmHud) {
        filmHud.style.opacity = '0';
      }

      // Pre-render frame 0 of drift film
      renderFilmFrame(0);
      updateFilmHUD(0);
    } else {
      // Phase 2: Drift sequence territory - Full 395-frame scrub
      if (heroCanvas) {
        heroCanvas.style.opacity = '0';
        heroCanvas.style.pointerEvents = 'none';
      }
      if (heroOverlay) {
        heroOverlay.style.opacity = '0';
        heroOverlay.style.pointerEvents = 'none';
      }

      const filmAlpha = Math.min(1, (totalProgress - FADE_END) / 0.025);
      if (filmTitleOverlay) {
        filmTitleOverlay.style.opacity = filmAlpha.toFixed(3);
      }
      if (filmHud) {
        filmHud.style.opacity = filmAlpha.toFixed(3);
      }

      // Map progress from (FADE_END .. 1.0) to (0.0 .. 1.0)
      const driftProgress = Math.max(0, Math.min(1, (totalProgress - FADE_END) / (1 - FADE_END)));
      const idx = Math.min(TOTAL_FILM_FRAMES - 1, Math.round(driftProgress * (TOTAL_FILM_FRAMES - 1)));
      renderFilmFrame(idx);
      updateFilmHUD(driftProgress);
    }
  }

  // Smooth click-to-cruise toggle on film canvas for hands-free viewing
  let isCruising = false;
  if (filmCanvas) {
    filmCanvas.addEventListener('click', () => {
      if (!heroDriftSection || !lenis) return;
      if (isCruising) {
        isCruising = false;
        return;
      }
      isCruising = true;
      const currentPct = filmRenderedIndex / (TOTAL_FILM_FRAMES - 1);
      const targetPct = currentPct >= 0.95 ? 0 : 1;
      const targetScroll = targetPct === 1
        ? heroDriftSection.offsetTop + heroDriftSection.offsetHeight - window.innerHeight
        : heroDriftSection.offsetTop;

      lenis.scrollTo(targetScroll, {
        duration: 7.0 * Math.abs(targetPct - currentPct),
        easing: (t) => t,
        onComplete: () => { isCruising = false; }
      });
    });
  }

  // Resize Listener
  window.addEventListener('resize', () => {
    sizeHeroCanvas();
    sizeFilmCanvas();
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }, { passive: true });

  sizeHeroCanvas();
  sizeFilmCanvas();

  // ==========================================================================
  // 5. NEON HELIX DRIFT ENGINE (Originkit 3D Matrix Helix for Page 2 / About)
  // ==========================================================================
  function initNeonHelixDrift() {
    const root = document.getElementById("helixContainer");
    const canvas = document.getElementById("helixCanvas");
    const section = document.getElementById("about") || root;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const ADVANCED_DEFAULTS = {
      halfTurnMs: 6000,
      radius: 260, // Enlarge radius for majestic centered presence
      halfPitch: 1050, // Longer pitch for sweeping curve across the section
      rungsPerHalf: 42,
      glyphSize: 13,
      charShare: 100,
      outlineShare: 20,
      axisX: 50, // Perfectly centered horizontally
      axisY: 50, // Perfectly centered vertically
      axisAngle: -22,
      axisBend: 0,
      depthTilt: 44,
      cameraDistance: 1750,
      focusDepth: 50,
      focusBand: 18,
      blurPx: 5.5,
      cyanColor: "#FFD800",
      warmColor: "#FF294D", // Ramu Crimson Red
      coolStop: 40,
      warmStop: 78,
      glyphOpacity: 95,
      farOpacity: 45,
      hotGlow: 75,
      hotGlowStart: 86,
      nodeShare: 4,
      nodeSize: 36,
      strandWidth: 3.2,
      strandColor: "#00FF96", // Cyber Mint
      haloColor: "#00FF57",
      haloWidth: 18,
      haloOpacity: 42,
      hazeColor: "#1E3F6A",
      haze: 22,
      dustCount: 60,
      seed: 7,
      lightRadius: 180,
      parallax: 12,
      hover: 55,
      grain: 0,
      vignette: 0,
    };

    const CELL = 80;
    const G = 16;
    const LEVELS = [0, 1.5, 3, 5, 7.5, 10];
    const NL = LEVELS.length;
    const CHARS = ["2", "5", "7", "0", "8", "3", "Z", "S", "F", "L"];
    const NT = 2 + CHARS.length;
    const NC = 10;
    const GAP = 0.12;
    const STEEL = [142, 172, 176, 1];

    const vals = {
      speed: 95,
      scale: 96, // Larger scale for ambient background coverage
      density: 30,
      hotColor: "#FF294D",
      coolColor: "#00FF96",
      focusBlur: 36,
      background: "transparent",
    };

    function parseColor(input) {
      if (typeof input !== "string") return [0, 0, 0, 1];
      let s = input.trim();
      const v = s.match(/^var\([^,]+,\s*(.+)\)$/);
      if (v) s = v[1].trim();
      if (s[0] === "#") {
        let h = s.slice(1);
        if (h.length === 3 || h.length === 4)
          h = h.split("").map((x) => x + x).join("");
        const n = parseInt(h.slice(0, 6), 16);
        if (isNaN(n)) return [0, 0, 0, 1];
        const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
      }
      const m = s.match(/rgba?\(([^)]+)\)/i);
      if (m) {
        const p = m[1].split(/[\s,\/]+/).filter(Boolean).map((x) => parseFloat(x));
        return [p[0] || 0, p[1] || 0, p[2] || 0, p.length > 3 && !isNaN(p[3]) ? p[3] : 1];
      }
      return [0, 0, 0, 1];
    }

    function mix(a, b, t) {
      const k = Math.max(0, Math.min(1, t));
      return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, 1];
    }

    function rgba(c, a) {
      return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
    }

    function ramp(t, far, cyan, warm, hot, cs, ws) {
      if (t <= cs) return mix(far, cyan, t / Math.max(1e-4, cs));
      if (t <= ws) return mix(cyan, warm, (t - cs) / Math.max(1e-4, ws - cs));
      return mix(warm, hot, (t - ws) / Math.max(1e-4, 1 - ws));
    }

    function hash3(a, b, c) {
      let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 1274126177);
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      h ^= h >>> 16;
      h = Math.imul(h, 2246822519);
      h ^= h >>> 13;
      return (h >>> 0) / 4294967296;
    }

    function vnoise(x, seed) {
      const i = Math.floor(x);
      const f = x - i;
      const u = f * f * (3 - 2 * f);
      return hash3(i, 11, seed) * (1 - u) + hash3(i + 1, 11, seed) * u;
    }

    function drawGlyphShape(g, type, x, y) {
      if (type === 0) {
        const w = 14;
        const r = 2;
        const x0 = x - w / 2;
        const y0 = y - w / 2;
        g.beginPath();
        g.moveTo(x0 + r, y0);
        g.arcTo(x0 + w, y0, x0 + w, y0 + w, r);
        g.arcTo(x0 + w, y0 + w, x0, y0 + w, r);
        g.arcTo(x0, y0 + w, x0, y0, r);
        g.arcTo(x0, y0, x0 + w, y0, r);
        g.closePath();
        g.fill();
      } else if (type === 1) {
        g.lineWidth = 2.2;
        g.strokeRect(x - 6.5, y - 6.5, 13, 13);
      } else {
        g.fillText(CHARS[type - 2], x, y + 1);
      }
    }

    function buildWhite() {
      const c = document.createElement("canvas");
      c.width = NT * NL * CELL;
      c.height = CELL;
      const g = c.getContext("2d");
      g.fillStyle = "#ffffff";
      g.strokeStyle = "#ffffff";
      g.font = `700 ${G + 3}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      for (let t = 0; t < NT; t++) {
        for (let l = 0; l < NL; l++) {
          const cx = (t * NL + l) * CELL + CELL / 2;
          const cy = CELL / 2;
          if (LEVELS[l] === 0) {
            drawGlyphShape(g, t, cx, cy);
          } else {
            g.save();
            g.shadowColor = "#ffffff";
            g.shadowBlur = LEVELS[l] * 2;
            g.shadowOffsetX = 10000;
            drawGlyphShape(g, t, cx - 10000, cy);
            g.restore();
          }
        }
      }
      return c;
    }

    function buildAtlas(white, colors) {
      const c = document.createElement("canvas");
      c.width = white.width;
      c.height = CELL * colors.length;
      const g = c.getContext("2d");
      for (let r = 0; r < colors.length; r++) {
        g.globalCompositeOperation = "source-over";
        g.drawImage(white, 0, r * CELL);
        g.globalCompositeOperation = "source-atop";
        g.fillStyle = colors[r];
        g.fillRect(0, r * CELL, c.width, CELL);
      }
      g.globalCompositeOperation = "source-over";
      return c;
    }

    function buildGlow(hot) {
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const g = c.getContext("2d");
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, rgba(hot, 1));
      gr.addColorStop(0.35, rgba(hot, 0.4));
      gr.addColorStop(1, rgba(hot, 0));
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
      return c;
    }

    function buildNode(hot) {
      const c = document.createElement("canvas");
      c.width = c.height = 128;
      const g = c.getContext("2d");
      const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, "rgba(255,226,204,1)");
      gr.addColorStop(0.14, rgba(hot, 1));
      gr.addColorStop(0.3, rgba(hot, 0.55));
      gr.addColorStop(0.6, rgba(hot, 0.15));
      gr.addColorStop(1, rgba(hot, 0));
      g.fillStyle = gr;
      g.fillRect(0, 0, 128, 128);
      return c;
    }

    let W = 0;
    let H = 0;
    let dpr = 1;
    const resize = () => {
      W = root.offsetWidth;
      H = root.offsetHeight;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(W * dpr));
      canvas.height = Math.max(1, Math.round(H * dpr));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(root);

    const white = buildWhite();
    let atlas = null;
    let glow = null;
    let node = null;
    let atlasKey = "";

    const pointer = { x: 0, y: 0, over: 0, overT: 0, down: 0, downT: 0 };
    const onMove = (e) => {
      const rect = root.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.overT = 1;
    };
    const onLeave = () => { pointer.overT = 0; };
    const onDown = (e) => { onMove(e); pointer.downT = 1; };
    const onUp = () => { pointer.downT = 0; };

    section.addEventListener("pointerenter", onMove, { passive: true });
    section.addEventListener("pointermove", onMove, { passive: true });
    section.addEventListener("pointerleave", onLeave, { passive: true });
    section.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });

    const mq = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

    let sX = new Float32Array(0);
    let sY = new Float32Array(0);
    let sT = new Float32Array(0);
    let sS = new Float32Array(0);
    let sP = new Float32Array(0);

    let phi = 0;
    let time = 0;
    let last = -1;
    let raf = 0;
    let isVisible = true;

    // Viewport intersection observer to avoid rendering when scrolled out
    const io = new IntersectionObserver((entries) => {
      isVisible = entries[0].isIntersecting;
    }, { threshold: 0.05 });
    io.observe(root);

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      if (!isVisible) return;

      let dt = last < 0 ? 0 : (now - last) / 1000;
      last = now;
      if (dt > 0.05) dt = 0.05;
      if (dt < 0) dt = 0;
      if (W < 2 || H < 2) return;

      const v = vals;
      const adv = ADVANCED_DEFAULTS;
      const reduce = !!(mq && mq.matches);
      const hk = reduce ? 0 : Math.max(0, adv.hover) / 50;

      pointer.over += (pointer.overT - pointer.over) * (1 - Math.exp(-dt * 4));
      pointer.down += (pointer.downT - pointer.down) * (1 - Math.exp(-dt * 6));

      if (!reduce) {
        const spinMul = 1 + pointer.down * hk * 1.5;
        phi += ((dt * Math.PI) / Math.max(0.2, adv.halfTurnMs / 1000)) * (Math.max(0, v.speed) / 50) * spinMul;
        if (phi > Math.PI * 2) phi -= Math.PI * 2;
        time += dt;
      }

      const far = parseColor(v.coolColor);
      const cyan = parseColor(adv.cyanColor);
      const warm = parseColor(adv.warmColor);
      const hot = parseColor(v.hotColor);
      const cs = Math.max(0.02, Math.min(0.97, adv.coolStop / 100));
      const ws = Math.max(cs + 0.01, Math.min(0.99, adv.warmStop / 100));
      const key = [v.coolColor, adv.cyanColor, adv.warmColor, v.hotColor, cs, ws].join("|");
      if (key !== atlasKey || !atlas || !glow || !node) {
        const cols = [];
        for (let r = 0; r < NC; r++) cols.push(rgba(ramp(r / (NC - 1), far, cyan, warm, hot, cs, ws), 1));
        atlas = buildAtlas(white, cols);
        glow = buildGlow(hot);
        node = buildNode(hot);
        atlasKey = key;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, W, H);

      const u800 = H / 800;
      const f = u800 * (Math.max(10, v.scale) / 100);
      const R = Math.max(4, adv.radius * f);
      const half = Math.max(20, adv.halfPitch * f);
      const pitch = half * 2;
      const spacing = half / Math.max(2, adv.rungsPerHalf);
      const n = Math.max(2, Math.round(v.density));
      const cx = (W * adv.axisX) / 100;
      const cy = (H * adv.axisY) / 100;
      const a0 = (adv.axisAngle * Math.PI) / 180;
      const diag = Math.hypot(W, H);
      const kappa = (adv.axisBend * Math.PI) / 180 / Math.max(1, diag);
      const tilt = adv.depthTilt / 100;
      const F = Math.max(100, adv.cameraDistance * u800);
      const vx = W / 2;
      const vy = H / 2;
      const focusZ = (R * adv.focusDepth) / 100;
      const band = adv.focusBand / 100;
      const blurK = (Math.max(0, v.focusBlur) / 50) * adv.blurPx * u800;
      const gBase = adv.glyphSize * f;
      const Smax = diag * 0.8;

      const pk = pointer.over * hk;
      const pnx = (pointer.x / W - 0.5) * 2;
      const pny = (pointer.y / H - 0.5) * 2;
      const parX = (pnx * adv.parallax * u800 * pk) / R;
      const parY = (pny * adv.parallax * u800 * pk) / R;
      const lightR2 = Math.pow(Math.max(1, adv.lightRadius * u800), 2);
      const lightK = pk * 0.45;

      let ax = 0;
      let ay = 0;
      let nx = 0;
      let ny = 0;
      const axisAt = (s) => {
        const a = a0 + kappa * s;
        if (Math.abs(kappa) < 1e-7) {
          ax = cx + Math.cos(a0) * s;
          ay = cy - Math.sin(a0) * s;
        } else {
          ax = cx + (Math.sin(a) - Math.sin(a0)) / kappa;
          ay = cy + (Math.cos(a) - Math.cos(a0)) / kappa;
        }
        nx = Math.sin(a);
        ny = Math.cos(a);
      };
      const sigmaAt = (z) => blurK * Math.max(0, Math.abs(z - focusZ) / R - band);

      ctx.globalCompositeOperation = "lighter";

      const dustN = Math.max(0, Math.round(adv.dustCount));
      for (let d = 0; d < dustN; d++) {
        const hx = hash3(d, 1, adv.seed + 90);
        const hy = hash3(d, 2, adv.seed + 90);
        const hs = hash3(d, 3, adv.seed + 90);
        const hb = hash3(d, 4, adv.seed + 90);
        const zd = (hash3(d, 5, adv.seed + 90) - 0.5) * 2 * R;
        const x = hx * W + Math.sin(time * 0.07 + hs * 6.28) * 4 * u800 + parX * zd;
        const y = hy * H + Math.cos(time * 0.05 + hb * 6.28) * 3 * u800 + parY * zd;
        const r = (0.6 + hs * 0.9) * u800;
        const col = hb > 0.5 ? cyan : STEEL;
        const tw = 0.75 + 0.25 * Math.sin(time * 0.8 + hs * 20);
        const a = (0.3 + 0.3 * hash3(d, 6, adv.seed + 90)) * tw;
        if (hb > 0.45) {
          ctx.fillStyle = rgba(col, a * 0.35);
          ctx.beginPath();
          ctx.arc(x, y, r * 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = rgba(col, a * 0.7);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      const i0 = Math.ceil(-Smax / spacing);
      const i1 = Math.floor(Smax / spacing);
      if (adv.haze > 0) {
        const hazeC = parseColor(adv.hazeColor);
        const hs = spacing / 3;
        ctx.beginPath();
        for (let i = i0 * 3; i <= i1 * 3; i++) {
          const s = i * hs;
          axisAt(s);
          const za = -s * tilt;
          const th = (2 * Math.PI * s) / pitch + phi;
          const c = Math.cos(th);
          const sn = Math.sin(th);
          const z0 = za + R * sn;
          const z1 = za - R * sn;
          const p0 = F / Math.max(1, F - z0);
          const p1 = F / Math.max(1, F - z1);
          const x0 = vx + (ax + R * c * nx - vx) * p0 + parX * z0;
          const y0 = vy + (ay + R * c * ny - vy) * p0 + parY * z0;
          const x1 = vx + (ax - R * c * nx - vx) * p1 + parX * z1;
          const y1 = vy + (ay - R * c * ny - vy) * p1 + parY * z1;
          if (Math.max(x0, x1) < -R || Math.min(x0, x1) > W + R || Math.max(y0, y1) < -R || Math.min(y0, y1) > H + R) continue;
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
        }
        ctx.lineCap = "butt";
        ctx.strokeStyle = rgba(hazeC, (adv.haze / 100) * 0.3);
        ctx.lineWidth = hs * 2.6 + 8 * f;
        ctx.stroke();
        ctx.strokeStyle = rgba(hazeC, (adv.haze / 100) * 0.5);
        ctx.lineWidth = hs * 1.4;
        ctx.stroke();
      }

      const step = Math.max(3, half / 64);
      const ns = Math.floor((2 * Smax) / step) + 1;
      if (sX.length < ns) {
        sX = new Float32Array(ns);
        sY = new Float32Array(ns);
        sT = new Float32Array(ns);
        sS = new Float32Array(ns);
        sP = new Float32Array(ns);
      }
      const haloC = parseColor(adv.haloColor);
      const strandC = parseColor(adv.strandColor);
      const whiteC = [255, 255, 255, 1];
      const CH = 5;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      for (let k = 0; k < 2; k++) {
        for (let q = 0; q < ns; q++) {
          const s = -Smax + q * step;
          axisAt(s);
          const za = -s * tilt;
          const th = (2 * Math.PI * s) / pitch + phi + k * Math.PI;
          const c = Math.cos(th);
          const sn = Math.sin(th);
          const z = za + R * sn;
          const p = F / Math.max(1, F - z);
          sX[q] = vx + (ax + R * c * nx - vx) * p + parX * z;
          sY[q] = vy + (ay + R * c * ny - vy) * p + parY * z;
          sT[q] = (sn + 1) / 2;
          sS[q] = sigmaAt(z);
          sP[q] = p;
        }
        for (let q0 = 0; q0 < ns - 1; q0 += CH) {
          const q1 = Math.min(ns - 1, q0 + CH);
          const mid = (q0 + q1) >> 1;
          if (sX[mid] < -80 || sX[mid] > W + 80 || sY[mid] < -80 || sY[mid] > H + 80) continue;
          const t = sT[mid];
          const sg = sS[mid];
          const p = sP[mid];
          ctx.beginPath();
          ctx.moveTo(sX[q0], sY[q0]);
          for (let q = q0 + 1; q <= q1; q++) ctx.lineTo(sX[q], sY[q]);
          if (adv.haloOpacity > 0 && adv.haloWidth > 0) {
            ctx.lineWidth = (adv.haloWidth * f + sg * 4) * p;
            ctx.strokeStyle = rgba(haloC, ((adv.haloOpacity / 100) * (0.55 + 0.45 * t)) / (1 + sg * 0.12));
            ctx.stroke();
          }
          ctx.lineWidth = (adv.strandWidth * f + sg * 2.2) * p;
          ctx.strokeStyle = rgba(mix(strandC, whiteC, 0.2 * Math.max(0, (t - 0.5) * 2)), (0.4 + 0.6 * t) / (1 + sg * 0.35));
          ctx.stroke();
        }
      }

      const op = adv.glyphOpacity / 100;
      const farOp = adv.farOpacity / 100;
      const charP = adv.charShare / 100;
      const outP = adv.outlineShare / 100;
      const hs = Math.max(0.5, Math.min(0.99, adv.hotGlowStart / 100));
      const hotA = adv.hotGlow / 100;
      const nodeP = adv.nodeShare / 100;
      const seed = adv.seed;
      const at = atlas;
      const gl = glow;
      const nd = node;
      const lastLevel = LEVELS[NL - 1];

      for (let i = i0; i <= i1; i++) {
        const s = i * spacing;
        axisAt(s);
        const za = -s * tilt;
        const th = (2 * Math.PI * s) / pitch + phi;
        const c = Math.cos(th);
        const sn = Math.sin(th);
        const ex = R * c * nx;
        const ey = R * c * ny;
        const ez = R * sn;
        const pa = F / Math.max(1, F - (za + ez));
        const pb = F / Math.max(1, F - (za - ez));
        const xa = vx + (ax + ex - vx) * pa;
        const ya = vy + (ay + ey - vy) * pa;
        const xb = vx + (ax - ex - vx) * pb;
        const yb = vy + (ay - ey - vy) * pb;
        const m = 60 * u800;
        if (Math.max(xa, xb) < -m || Math.min(xa, xb) > W + m || Math.max(ya, yb) < -m || Math.min(ya, yb) > H + m) continue;

        const centre = Math.exp(-Math.pow(s / (1.5 * half), 2));
        const wr = 0.55 * vnoise(i / 5 + 0.37, seed) + 0.45 * centre;

        for (let j = 0; j < n; j++) {
          if (hash3(i, j, seed + 1) < GAP) continue;
          const u = 0.05 + (0.9 * j) / (n - 1);
          const w = 1 - 2 * u;
          const z = za + ez * w;
          const p = F / Math.max(1, F - z);
          const X = vx + (ax + ex * w - vx) * p + parX * z;
          const Y = vy + (ay + ey * w - vy) * p + parY * z;
          if (X < -m || X > W + m || Y < -m || Y > H + m) continue;
          const front = (sn * w + 1) / 2;

          const dx = X - pointer.x;
          const dy = Y - pointer.y;
          const lit = lightK > 0 ? lightK * Math.exp(-(dx * dx + dy * dy) / lightR2) : 0;

          const hj = hash3(i, j, seed + 2);
          let cv = 0.12 + wr * 0.85 + (hj - 0.5) * 0.45 + lit * 0.3;
          if (wr > 0.55 && hash3(i, j, seed + 5) > 0.9) cv = 0.92 + 0.08 * hj;
          cv = Math.max(0, Math.min(1, cv));
          const row = Math.round(cv * (NC - 1));

          const ht = hash3(i, j, seed + 3);
          const type = ht < charP ? 2 + Math.floor((ht / Math.max(1e-4, charP)) * CHARS.length) % CHARS.length : ht < charP + outP ? 1 : 0;

          const sg = sigmaAt(z);
          const size = gBase * p;
          const k = size / G;
          const sa = Math.min(lastLevel, sg / Math.max(0.05, k));
          let lv = 0;
          let best = 1e9;
          for (let l = 0; l < NL; l++) {
            const d = Math.abs(LEVELS[l] - sa);
            if (d < best) {
              best = d;
              lv = l;
            }
          }

          ctx.globalAlpha = Math.max(0, Math.min(1, op * (farOp + (1 - farOp) * front) * (1 + lit * 1.5)));
          const dw = CELL * k;
          ctx.drawImage(at, (type * NL + lv) * CELL, row * CELL, CELL, CELL, X - dw / 2, Y - dw / 2, dw, dw);

          if (cv > hs && hotA > 0) {
            const gs = size * (3.2 + sg * 0.15);
            ctx.globalAlpha = Math.min(1, (hotA * (cv - hs)) / (1 - hs)) * (0.5 + 0.5 * front);
            ctx.drawImage(gl, X - gs / 2, Y - gs / 2, gs, gs);
          }
        }

        for (let e = 0; e < 2; e++) {
          if (hash3(i, 70 + e, seed) >= nodeP) continue;
          const w = e === 0 ? 1 : -1;
          const z = za + ez * w;
          const p = F / Math.max(1, F - z);
          const X = vx + (ax + ex * w - vx) * p + parX * z;
          const Y = vy + (ay + ey * w - vy) * p + parY * z;
          const sg = sigmaAt(z);
          const ns2 = adv.nodeSize * f * p * (1 + sg * 0.08);
          ctx.globalAlpha = 0.95 / (1 + sg * 0.15);
          ctx.drawImage(nd, X - ns2 / 2, Y - ns2 / 2, ns2, ns2);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    };

    raf = requestAnimationFrame(frame);
  }

  // Initialize Neon Helix Drift for Page 2
  initNeonHelixDrift();

  // ==========================================================================
  // 6. GSAP ScrollTrigger Integration & Editorial Reveals
  // ==========================================================================
  function initGSAP() {
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);

    // Sync Lenis with ScrollTrigger
    if (lenis) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);
    }

    if (reducedMotion) return;

    // Unified Hero & Cinematic Drift ScrollTrigger (Page 1)
    ScrollTrigger.create({
      trigger: '#top',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.75, // Smooth inertial scrub with no jumping or fighting
      onUpdate: (self) => {
        const totalProgress = Math.max(0, Math.min(1, self.progress));
        handleHeroDriftUpdate(totalProgress);
      },
    });

    // Reveal animations for editorial copy
    gsap.utils.toArray('.reveal').forEach((el) => {
      gsap.fromTo(
        el,
        { autoAlpha: 0, y: 30, filter: 'blur(8px)' },
        {
          autoAlpha: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 1.0,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            once: true,
          },
        }
      );
    });

    // Hero title split entrance
    gsap.fromTo(
      '.hero-title span',
      { yPercent: 110, rotate: 3 },
      {
        yPercent: 0,
        rotate: 0,
        duration: 1.2,
        stagger: 0.1,
        ease: 'power4.out',
        delay: 0.15,
      }
    );
  }

  initGSAP();

  // --------------------------------------------------------------------------
  // 7. Interactive Ambient Cursor Glow
  // --------------------------------------------------------------------------
  const glow = document.getElementById('cursorGlow');
  if (glow) {
    window.addEventListener('pointermove', (e) => {
      if (window.gsap) {
        gsap.to(glow, { x: e.clientX, y: e.clientY, duration: 0.45, ease: 'power2.out' });
      } else {
        glow.style.left = `${e.clientX}px`;
        glow.style.top = `${e.clientY}px`;
      }
    }, { passive: true });
  }

  // --------------------------------------------------------------------------
  // 8. Interactive Terminal Shell
  // --------------------------------------------------------------------------
  const termForm = document.getElementById('termForm');
  const termInput = document.getElementById('termInput');
  const terminalLog = document.getElementById('terminalLog');
  const terminalConsole = document.getElementById('terminalConsole');
  const termBtns = document.querySelectorAll('.term-btn');

  const SHELL_COMMANDS = {
    help: () => `
Available commands:
  • <span style="color:var(--red)">whoami</span>   - Identity, college, background
  • <span style="color:var(--red)">projects</span> - Core projects breakdown
  • <span style="color:var(--red)">skills</span>   - Technical stack & tools
  • <span style="color:var(--red)">drift</span>    - Scroll immediately to the cinematic car sequence
  • <span style="color:var(--red)">contact</span>  - Email & social links
  • <span style="color:var(--red)">clear</span>    - Clear terminal output
`,
    whoami: () => `
RAMU // @codebyramu
  • 19 y/o Creative Developer & AI/ML Engineer
  • 2nd-Year B.Tech CSE (AI & ML) @ VISTAS Chennai
  • Intern @ ConnectNBuild
  • Competitive Sprinter (100m/200m/800m) & Carnatic Violinist
`,
    projects: () => `
SELECTED PROJECTS:
  1. VOCARA & HumRoll : Real-time voice-to-MIDI studio (CREPE + Silero VAD)
  2. Ramu-AI          : Autonomous Voice & AR Terminal Bridge (Gemini + barehands)
  3. Vadivelu AI      : Tamil comedy semantic reaction agent (Gemini 2.0 Flash)
  4. SIH '26 MoSPI    : National Learning Portal (FAISS + iGOT Karmayogi)
  5. Temple Site      : Cultural heritage preservation site on Vercel
  6. HyperCade        : TV host + phone controller party gaming engine
  7. ~1M Neural SLM   : Trainable Transformer model built in PyTorch from scratch
`,
    skills: () => `
TOOLKIT ARSENAL:
  • Languages : Python, TypeScript, C/C++, JavaScript, SQL
  • Creative  : Next.js 15, React, GSAP ScrollTrigger, Lenis, WebGL, Canvas
  • AI & ML   : Google Gemini API, PyTorch, FAISS, Supabase pgvector
  • Systems   : Linux / Hyprland / Omarchy, Git, LMMS Audio Studio
`,
    drift: () => {
      const top = document.getElementById('top');
      if (top && lenis) {
        lenis.scrollTo(top.offsetTop + window.innerHeight * 0.45, { duration: 1.2 });
      }
      return `> Navigating to Cinematic Drift Sequence... Nitrous engaged.`;
    },
    contact: () => `
COMMUNICATION CHANNELS:
  • Email: codebyramu@gmail.com
  • GitHub: https://github.com/codebyramu
  • LeetCode: https://leetcode.com/u/codebyramu
  • Twitter/X: https://twitter.com/codebyramu
`,
    clear: () => {
      if (terminalLog) terminalLog.innerHTML = '';
      return null;
    },
  };

  function runCommand(cmdText) {
    const raw = cmdText.trim();
    const cmd = raw.toLowerCase();
    if (!cmd) return;

    const row = document.createElement('div');
    row.className = 'term-row';
    row.innerHTML = `<span class="term-prompt">ramu@hyperstation:~$</span> ${raw}`;
    terminalLog.appendChild(row);

    if (SHELL_COMMANDS[cmd]) {
      const res = SHELL_COMMANDS[cmd]();
      if (res) {
        const outRow = document.createElement('div');
        outRow.className = 'term-row';
        outRow.innerHTML = res.replace(/\n/g, '<br>');
        terminalLog.appendChild(outRow);
      }
    } else {
      const err = document.createElement('div');
      err.className = 'term-row';
      err.style.color = 'var(--muted)';
      err.innerHTML = `command not found: ${raw}. Type 'help' for options.`;
      terminalLog.appendChild(err);
    }

    if (terminalConsole) {
      terminalConsole.scrollTop = terminalConsole.scrollHeight;
    }
  }

  if (termForm && termInput) {
    termForm.addEventListener('submit', (e) => {
      e.preventDefault();
      runCommand(termInput.value);
      termInput.value = '';
    });
  }

  termBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const c = btn.getAttribute('data-cmd');
      if (c) runCommand(c);
    });
  });

  // --------------------------------------------------------------------------
  // 9. Copy Email Button with Clipboard Feedback
  // --------------------------------------------------------------------------
  const copyMailBtn = document.getElementById('copyMailBtn');
  const copyMailText = document.getElementById('copyMailText');

  if (copyMailBtn && copyMailText) {
    copyMailBtn.addEventListener('click', () => {
      const mail = 'codebyramu@gmail.com';
      navigator.clipboard.writeText(mail).then(() => {
        copyMailText.textContent = 'COPIED TO CLIPBOARD!';
        setTimeout(() => {
          copyMailText.textContent = mail;
        }, 2000);
      }).catch(() => {
        window.location.href = `mailto:${mail}`;
      });
    });
  }

  // --------------------------------------------------------------------------
  // 10. Nav Smooth-Scroll Handlers (Drift sequence & Home)
  // --------------------------------------------------------------------------
  document.querySelectorAll('a[href="#film"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const top = document.getElementById('top');
      if (top && lenis) {
        lenis.scrollTo(top.offsetTop + window.innerHeight * 0.45, { duration: 1.2 });
      }
    });
  });

  document.querySelectorAll('a[href="#top"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      if (lenis) {
        lenis.scrollTo(0, { duration: 1.0 });
      }
    });
  });
})();
