/**
 * ==========================================================================
 * RAMU® CINEMATIC PORTFOLIO — CORE ENGINE
 * Hardware-Accelerated Canvas Frame Scrubbing, Lenis & GSAP ScrollTrigger
 * ==========================================================================
 */

(() => {
  // 1. Initialize Lucide Icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // 2. Initialize Lenis Smooth Scroll
  let lenis = null;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (typeof Lenis !== 'undefined' && !reducedMotion) {
    lenis = new Lenis({
      duration: 1.0,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.8,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  // 3. Ultra-Smooth Canvas Frame Sequence Engine
  const canvas = document.getElementById('filmCanvas');
  const ctx = canvas ? canvas.getContext('2d', { alpha: false, desynchronized: true }) : null;
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const filmHeading = document.getElementById('filmHeading');
  const filmCaption = document.getElementById('filmCaption');

  const TOTAL_FRAMES = 395;
  const frameImages = new Array(TOTAL_FRAMES);
  let currentRenderedIndex = -1;
  let rafPending = false;
  let lastValidImage = null;

  // Build frame image list
  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const img = new Image();
    const pad = String(i + 1).padStart(4, '0');
    img.src = `frames/frame_${pad}.webp`;
    img.onload = () => {
      img._loaded = true;
      if (i === 0 && currentRenderedIndex === -1) {
        requestDraw(0);
      }
    };
    frameImages[i] = img;
  }

  // Responsive Canvas Sizing with DPR
  function sizeCanvas() {
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (currentRenderedIndex >= 0) {
      renderFrame(currentRenderedIndex);
    } else {
      renderFrame(0);
    }
  }

  // Draw selected frame to cover full canvas cleanly
  function renderFrame(index) {
    if (!canvas || !ctx) return;

    let targetImg = frameImages[index];

    // Fallback to nearest loaded frame if current frame is loading
    if (!targetImg || !targetImg._loaded) {
      if (lastValidImage) {
        targetImg = lastValidImage;
      } else {
        // Search backwards
        for (let b = index - 1; b >= 0; b--) {
          if (frameImages[b] && frameImages[b]._loaded) {
            targetImg = frameImages[b];
            break;
          }
        }
      }
    }

    if (!targetImg || !targetImg.naturalWidth) return;

    lastValidImage = targetImg;
    currentRenderedIndex = index;

    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    const iw = targetImg.naturalWidth;
    const ih = targetImg.naturalHeight;

    // Full-bleed cover math
    const scale = Math.max(cw / iw, ch / ih);
    const sw = iw * scale;
    const sh = ih * scale;
    const sx = (cw - sw) / 2;
    const sy = (ch - sh) / 2;

    ctx.fillStyle = '#080809';
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(targetImg, sx, sy, sw, sh);
  }

  function requestDraw(index) {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      renderFrame(index);
    });
  }

  // Initial draw & resize listener
  window.addEventListener('resize', () => {
    sizeCanvas();
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }, { passive: true });

  sizeCanvas();

  // 4. GSAP & ScrollTrigger Setup
  function initScrollExperience() {
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

    // Scroll-Scrubbed Canvas Film Sequence
    ScrollTrigger.create({
      trigger: '#film',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.15, // silky smooth inertia
      onUpdate: (self) => {
        const progress = Math.max(0, Math.min(1, self.progress));
        const frameIndex = Math.min(TOTAL_FRAMES - 1, Math.floor(progress * (TOTAL_FRAMES - 1)));

        requestDraw(frameIndex);

        // Update Progress Bar
        const pct = Math.round(progress * 100);
        if (progressFill) progressFill.style.width = `${pct}%`;
        if (progressText) progressText.textContent = `${String(pct).padStart(2, '0')}%`;

        // Update Dynamic Story Captions
        if (filmHeading && filmCaption) {
          if (progress < 0.33) {
            filmHeading.innerHTML = 'MOTION<br>WITH <span>INTENT.</span>';
            filmCaption.innerHTML = 'Move through the sequence.<br>The scene follows your scroll.';
          } else if (progress < 0.68) {
            filmHeading.innerHTML = 'BUILT TO<br><span>MOVE.</span>';
            filmCaption.innerHTML = 'Every frame responds to your movement.<br>Scroll up to reverse the sequence.';
          } else {
            filmHeading.innerHTML = 'STAY<br><span>CURIOUS.</span>';
            filmCaption.innerHTML = 'From first frame to final detail.<br>Motion with a purpose.';
          }
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

    // Title reveal animation
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

    // Subtle parallax on hero background art
    gsap.to('.hero-art', {
      yPercent: 12,
      ease: 'none',
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
    });
  }

  initScrollExperience();

  // 5. Interactive Cursor Glow
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

  // 6. Hero Video Audio Toggle Button
  const heroVideoLoop = document.getElementById('heroVideoLoop');
  const heroAudioBtn = document.getElementById('heroAudioBtn');
  const heroAudioIcon = document.getElementById('heroAudioIcon');
  const heroAudioText = document.getElementById('heroAudioText');

  if (heroAudioBtn && heroVideoLoop) {
    heroAudioBtn.addEventListener('click', () => {
      heroVideoLoop.muted = !heroVideoLoop.muted;

      if (!heroVideoLoop.muted) {
        heroAudioText.textContent = 'SOUND ON';
        if (heroAudioIcon) heroAudioIcon.setAttribute('data-lucide', 'volume-2');
        heroAudioBtn.style.background = 'var(--red)';
        heroAudioBtn.style.borderColor = 'var(--red)';
        heroVideoLoop.play().catch(() => {});
      } else {
        heroAudioText.textContent = 'SOUND OFF';
        if (heroAudioIcon) heroAudioIcon.setAttribute('data-lucide', 'volume-x');
        heroAudioBtn.style.background = '';
        heroAudioBtn.style.borderColor = '';
      }
      if (window.lucide) window.lucide.createIcons();
    });
  }

  // 7. Interactive Terminal Shell
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
      const film = document.getElementById('film');
      if (film) {
        film.scrollIntoView({ behavior: 'smooth' });
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

  // 8. Copy Email Button
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
