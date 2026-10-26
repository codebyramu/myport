/**
 * ==========================================================================
 * RAMU® CINEMATIC PORTFOLIO — CORE ENGINE
 * Hardware-Accelerated Canvas Frames, Cursor-Reactive Loops, Lenis & GSAP
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
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.6,
    });

    function lenisRaf(time) {
      lenis.raf(time);
      requestAnimationFrame(lenisRaf);
    }
    requestAnimationFrame(lenisRaf);
  }

  // ==========================================================================
  // 3. HERO CANVAS: 44-Frame Interactive Cursor-Reactive Ping-Pong Engine
  //    (Video Project 29: Continuous 0 -> n -> 0 Loop + Cursor Up/Down Velocity)
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
  const HERO_IDLE_SPEED = 0.42; // baseline idle speed (~25 FPS ping-pong)
  let heroSpeed = HERO_IDLE_SPEED;
  let heroTargetSpeed = HERO_IDLE_SPEED;
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

    heroCtx.fillStyle = '#080809';
    heroCtx.fillRect(0, 0, cw, ch);
    heroCtx.drawImage(targetImg, sx, sy, sw, sh);
  }

  // Pointer Movement: Cursor Up -> Normal (0->n), Cursor Down -> Reverse (n->0)
  window.addEventListener('pointermove', (e) => {
    const now = performance.now();
    const dt = Math.max(now - lastMoveTime, 8);
    lastMoveTime = now;

    if (lastCursorY !== null) {
      const deltaY = e.clientY - lastCursorY;
      const speedMagnitude = Math.abs(deltaY) / dt;

      // Cursor moving UP (deltaY < -1.5): play forward / normal
      if (deltaY < -1.5) {
        heroDir = 1;
        const boost = Math.min(speedMagnitude * 0.9, 2.6);
        heroTargetSpeed = HERO_IDLE_SPEED + boost;
      }
      // Cursor moving DOWN (deltaY > 1.5): play downwards / reverse
      else if (deltaY > 1.5) {
        heroDir = -1;
        const boost = Math.min(speedMagnitude * 0.9, 2.6);
        heroTargetSpeed = HERO_IDLE_SPEED + boost;
      }

      // 3D Parallax tilt effect on the hero canvas
      const normX = (e.clientX / window.innerWidth) - 0.5;
      const normY = (e.clientY / window.innerHeight) - 0.5;
      if (heroCanvas) {
        heroCanvas.style.transform = `translate3d(${normX * 18}px, ${normY * 12}px, 0) scale(1.04)`;
      }
    }

    lastCursorY = e.clientY;
    lastCursorX = e.clientX;
  }, { passive: true });

  // Main Hero Ping-Pong RAF Loop
  function heroPingPongLoop() {
    // Lerp current speed towards target speed
    heroSpeed += (heroTargetSpeed - heroSpeed) * 0.14;
    // Gradually decay target speed back to idle baseline
    heroTargetSpeed += (HERO_IDLE_SPEED - heroTargetSpeed) * 0.045;

    // Advance frame index
    heroCurrentFrame += heroDir * heroSpeed;

    // Ping-pong at boundaries (0 <-> 43)
    if (heroCurrentFrame >= HERO_TOTAL - 1) {
      heroCurrentFrame = HERO_TOTAL - 1;
      heroDir = -1; // Reverse downwards
    } else if (heroCurrentFrame <= 0) {
      heroCurrentFrame = 0;
      heroDir = 1; // Play normal forward
    }

    const frameIdx = Math.round(heroCurrentFrame);
    if (frameIdx !== heroRenderedIdx) {
      renderHeroFrame(frameIdx);
    }

    // Engine audio rev sync
    if (heroAudio && !heroAudio.paused) {
      const rev = Math.max(0.85, Math.min(1.45, 0.95 + (heroSpeed - HERO_IDLE_SPEED) * 0.22));
      heroAudio.playbackRate = rev;
    }

    requestAnimationFrame(heroPingPongLoop);
  }

  requestAnimationFrame(heroPingPongLoop);

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
  // 4. DRIFT FILM CANVAS: 395-Frame 1-Scroll Cinematic Experience
  //    (1 Scroll Down -> Plays 0 to 100%, 1 Scroll Up -> Reverses 100% to 0)
  // ==========================================================================
  const filmCanvas = document.getElementById('filmCanvas');
  const filmCtx = filmCanvas ? filmCanvas.getContext('2d', { alpha: false, desynchronized: true }) : null;
  const filmSection = document.getElementById('film');
  const filmHeading = document.getElementById('filmHeading');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');

  const TOTAL_FILM_FRAMES = 395;
  const filmImages = new Array(TOTAL_FILM_FRAMES);
  let filmRenderedIndex = -1;
  let filmLastValidImage = null;
  let currentHeadingText = '';

  const filmState = {
    frame: 0,
    targetFrame: 0,
    isPlaying: false,
  };

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

  function updateFilmHeading(progressFraction) {
    if (!filmHeading) return;
    const targetHTML = progressFraction < 0.52
      ? 'MOTION<br>WITH <span>INTENT.</span>'
      : 'STAY<br><span>CURIOUS.</span>';

    if (currentHeadingText !== targetHTML) {
      currentHeadingText = targetHTML;
      if (window.gsap) {
        gsap.to(filmHeading, {
          opacity: 0,
          y: -10,
          duration: 0.18,
          ease: 'power1.in',
          onComplete: () => {
            filmHeading.innerHTML = targetHTML;
            gsap.to(filmHeading, {
              opacity: 1,
              y: 0,
              duration: 0.28,
              ease: 'power2.out',
            });
          },
        });
      } else {
        filmHeading.innerHTML = targetHTML;
      }
    }
  }

  function updateFilmHUD(progressFraction) {
    const pct = Math.max(0, Math.min(100, Math.round(progressFraction * 100)));
    if (progressFill) progressFill.style.width = `${pct}%`;
    if (progressText) progressText.textContent = `${String(pct).padStart(2, '0')}%`;
    updateFilmHeading(progressFraction);
  }

  // Smooth 1-Scroll Playhead Animation
  function playFilmTo(target) {
    if (filmState.targetFrame === target && filmState.isPlaying) return;

    filmState.targetFrame = target;
    filmState.isPlaying = true;

    if (window.gsap) {
      gsap.killTweensOf(filmState);
      const dist = Math.abs(target - filmState.frame);
      const duration = Math.max(0.65, (dist / (TOTAL_FILM_FRAMES - 1)) * 2.3);

      gsap.to(filmState, {
        frame: target,
        duration: duration,
        ease: 'power2.out',
        onUpdate: () => {
          const idx = Math.min(TOTAL_FILM_FRAMES - 1, Math.max(0, Math.round(filmState.frame)));
          renderFilmFrame(idx);
          updateFilmHUD(idx / (TOTAL_FILM_FRAMES - 1));
        },
        onComplete: () => {
          filmState.isPlaying = false;
          filmState.frame = target;
          renderFilmFrame(target);
          updateFilmHUD(target / (TOTAL_FILM_FRAMES - 1));
        },
      });
    } else {
      filmState.frame = target;
      renderFilmFrame(target);
      updateFilmHUD(target / (TOTAL_FILM_FRAMES - 1));
      filmState.isPlaying = false;
    }
  }

  // Wheel Listener for 1-Scroll Trigger
  window.addEventListener('wheel', (e) => {
    if (!filmSection) return;
    const rect = filmSection.getBoundingClientRect();
    // Active when film section occupies the viewport
    const inFilm = rect.top <= 120 && rect.bottom >= window.innerHeight - 120;
    if (!inFilm) return;

    // 1 Scroll DOWN gesture (deltaY > 15)
    if (e.deltaY > 15) {
      if (filmState.frame < TOTAL_FILM_FRAMES - 1) {
        e.preventDefault();
        playFilmTo(TOTAL_FILM_FRAMES - 1);
      }
      // If already at 100% and animation finished, allow natural scroll down to #work!
    }
    // 1 Scroll UP gesture (deltaY < -15)
    else if (e.deltaY < -15) {
      if (filmState.frame > 0) {
        e.preventDefault();
        playFilmTo(0);
      }
      // If already at 0% and animation finished, allow natural scroll up to #about!
    }
  }, { passive: false });

  // Mobile Touch Swipe Handling
  let touchStartY = null;
  window.addEventListener('touchstart', (e) => {
    if (e.touches.length) touchStartY = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (touchStartY === null || !filmSection) return;
    const rect = filmSection.getBoundingClientRect();
    const inFilm = rect.top <= 120 && rect.bottom >= window.innerHeight - 120;
    if (!inFilm) return;

    const currentY = e.touches[0].clientY;
    const deltaY = touchStartY - currentY; // positive = swipe up = scroll down

    if (deltaY > 25) {
      if (filmState.frame < TOTAL_FILM_FRAMES - 1) {
        e.preventDefault();
        playFilmTo(TOTAL_FILM_FRAMES - 1);
        touchStartY = currentY;
      }
    } else if (deltaY < -25) {
      if (filmState.frame > 0) {
        e.preventDefault();
        playFilmTo(0);
        touchStartY = currentY;
      }
    }
  }, { passive: false });

  // Direct Canvas Click to Toggle Forward / Reverse
  if (filmCanvas) {
    filmCanvas.addEventListener('click', () => {
      if (filmState.frame >= TOTAL_FILM_FRAMES - 1) {
        playFilmTo(0);
      } else {
        playFilmTo(TOTAL_FILM_FRAMES - 1);
      }
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
  // 5. GSAP ScrollTrigger Integration & Editorial Reveals
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

    // Film ScrollTrigger: sync progress if user scrubs scrollbar
    ScrollTrigger.create({
      trigger: '#film',
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        // If user is manually dragging scrollbar and no 1-scroll tween is active
        if (!filmState.isPlaying) {
          const progress = Math.max(0, Math.min(1, self.progress));
          const idx = Math.min(TOTAL_FILM_FRAMES - 1, Math.round(progress * (TOTAL_FILM_FRAMES - 1)));
          filmState.frame = idx;
          renderFilmFrame(idx);
          updateFilmHUD(progress);
        }
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
  // 6. Interactive Ambient Cursor Glow
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
  // 7. Interactive Terminal Shell
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
  • <span style="color:var(--red)">drift</span>    - Trigger the cinematic car sequence
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
      const film = document.getElementById('film');
      if (film) {
        film.scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => {
          playFilmTo(TOTAL_FILM_FRAMES - 1);
        }, 600);
      }
      return `> Navigating to Cinematic Frame Sequence... Nitrous engaged.`;
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
  // 8. Copy Email Button with Clipboard Feedback
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
})();
