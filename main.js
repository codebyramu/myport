/**
 * ==========================================================================
 * RAMU CINEMATIC PORTFOLIO — CORE SCRIPT
 * High-Performance Smooth Scroll, Scroll-Scrubbed Video, Cursor & Shell
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Lucide Icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // 2. Initialize Lenis Smooth Scroll
  let lenis = null;
  if (typeof Lenis !== 'undefined') {
    lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 2.0,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Sync with GSAP ScrollTrigger if present
    if (window.gsap && window.ScrollTrigger) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);
    }
  }

  // 3. Custom Physics Cursor System
  const cursorDot = document.getElementById('cursorDot');
  const cursorRing = document.getElementById('cursorRing');
  const cursorLabel = document.getElementById('cursorLabel');
  const ambientGlow = document.getElementById('ambientGlow');

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let ringX = mouseX;
  let ringY = mouseY;
  let dotX = mouseX;
  let dotY = mouseY;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    if (ambientGlow) {
      ambientGlow.style.left = `${mouseX}px`;
      ambientGlow.style.top = `${mouseY}px`;
    }
  });

  function renderCursor() {
    // Lerp motion
    dotX += (mouseX - dotX) * 0.45;
    dotY += (mouseY - dotY) * 0.45;
    ringX += (mouseX - ringX) * 0.15;
    ringY += (mouseY - ringY) * 0.15;

    if (cursorDot) {
      cursorDot.style.left = `${dotX}px`;
      cursorDot.style.top = `${dotY}px`;
    }
    if (cursorRing) {
      cursorRing.style.left = `${ringX}px`;
      cursorRing.style.top = `${ringY}px`;
    }

    requestAnimationFrame(renderCursor);
  }
  requestAnimationFrame(renderCursor);

  // Magnetic & Cursor Target Handlers
  const interactiveTargets = document.querySelectorAll('[data-cursor], a, button, .card-hover, .filter-btn');
  interactiveTargets.forEach((el) => {
    el.addEventListener('mouseenter', () => {
      if (cursorRing) cursorRing.classList.add('active');
      const label = el.getAttribute('data-cursor');
      if (cursorLabel) cursorLabel.textContent = label || '';
    });

    el.addEventListener('mouseleave', () => {
      if (cursorRing) cursorRing.classList.remove('active');
      if (cursorLabel) cursorLabel.textContent = '';
      if (el.classList.contains('magnetic')) {
        el.style.transform = '';
      }
    });

    // Magnetic pull
    if (el.classList.contains('magnetic')) {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const deltaX = (e.clientX - centerX) * 0.25;
        const deltaY = (e.clientY - centerY) * 0.25;
        el.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
      });
    }
  });

  // 4. Header Scroll State
  const siteHeader = document.getElementById('siteHeader');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      siteHeader?.classList.add('scrolled');
    } else {
      siteHeader?.classList.remove('scrolled');
    }
  }, { passive: true });

  // 5. Scroll-Driven Hero Video Controller
  const heroWrapper = document.getElementById('hero');
  const heroVideo = document.getElementById('heroVideo');
  const scrubFill = document.getElementById('scrubFill');
  const scrubTime = document.getElementById('scrubTime');
  const btnPlayPause = document.getElementById('btnPlayPause');
  const playIcon = document.getElementById('playIcon');
  const playStateText = document.getElementById('playStateText');
  const btnAudioToggle = document.getElementById('btnAudioToggle');
  const volumeIcon = document.getElementById('volumeIcon');
  const audioStateText = document.getElementById('audioStateText');
  const eqBars = document.getElementById('eqBars');
  const ramuWatermark = document.getElementById('ramuWatermark');
  const heroAmbientCanvas = document.getElementById('heroAmbientCanvas');

  let isAutoPlaying = false;
  let isMuted = true;
  let videoDuration = 21.96; // Video project length in seconds
  let targetTime = 0;
  let currentTime = 0;

  // Format mm:ss helper
  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  // When video metadata is ready
  if (heroVideo) {
    heroVideo.addEventListener('loadedmetadata', () => {
      if (heroVideo.duration && !isNaN(heroVideo.duration)) {
        videoDuration = heroVideo.duration;
      }
    });
  }

  // Scroll scrub calculation
  function updateScrollScrub() {
    if (!heroWrapper || !heroVideo || isAutoPlaying) return;

    const rect = heroWrapper.getBoundingClientRect();
    const totalScrollable = heroWrapper.offsetHeight - window.innerHeight;

    if (totalScrollable <= 0) return;

    // How far into heroWrapper have we scrolled?
    const scrolled = -rect.top;
    let progress = scrolled / totalScrollable;
    progress = Math.max(0, Math.min(1, progress));

    targetTime = progress * videoDuration;

    // Update UI progress bar
    if (scrubFill) {
      scrubFill.style.width = `${(progress * 100).toFixed(1)}%`;
    }
    if (scrubTime) {
      scrubTime.textContent = `${formatTime(targetTime)} / ${formatTime(videoDuration)}`;
    }

    // Finale watermark reveal at > 85% scroll (when RAMU graffiti hits)
    if (ramuWatermark) {
      if (progress > 0.85) {
        ramuWatermark.classList.add('visible');
      } else {
        ramuWatermark.classList.remove('visible');
      }
    }
  }

  // Video smooth frame lerp
  function videoTick() {
    if (heroVideo && !isAutoPlaying && heroVideo.readyState >= 2) {
      currentTime += (targetTime - currentTime) * 0.18;
      if (Math.abs(currentTime - targetTime) > 0.01) {
        heroVideo.currentTime = currentTime;
      }
    }
    requestAnimationFrame(videoTick);
  }
  requestAnimationFrame(videoTick);

  window.addEventListener('scroll', updateScrollScrub, { passive: true });
  updateScrollScrub();

  // Play / Pause Toggle
  if (btnPlayPause && heroVideo) {
    btnPlayPause.addEventListener('click', () => {
      isAutoPlaying = !isAutoPlaying;
      if (isAutoPlaying) {
        heroVideo.play().catch(() => {});
        playStateText.textContent = 'PAUSE';
        if (playIcon) playIcon.setAttribute('data-lucide', 'pause');
      } else {
        heroVideo.pause();
        playStateText.textContent = 'AUTO SCRUB';
        if (playIcon) playIcon.setAttribute('data-lucide', 'play');
        updateScrollScrub();
      }
      if (window.lucide) window.lucide.createIcons();
    });
  }

  // Audio Unmute Toggle
  if (btnAudioToggle && heroVideo) {
    btnAudioToggle.addEventListener('click', () => {
      isMuted = !isMuted;
      heroVideo.muted = isMuted;

      if (!isMuted) {
        audioStateText.textContent = 'SOUND ON';
        if (volumeIcon) volumeIcon.setAttribute('data-lucide', 'volume-2');
        if (eqBars) eqBars.classList.add('playing');
        // Ensure playback if unmuted
        if (heroVideo.paused) {
          heroVideo.play().catch(() => {});
          isAutoPlaying = true;
          if (playStateText) playStateText.textContent = 'PAUSE';
          if (playIcon) playIcon.setAttribute('data-lucide', 'pause');
        }
      } else {
        audioStateText.textContent = 'SOUND OFF';
        if (volumeIcon) volumeIcon.setAttribute('data-lucide', 'volume-x');
        if (eqBars) eqBars.classList.remove('playing');
      }
      if (window.lucide) window.lucide.createIcons();
    });
  }

  // 6. Ambient Canvas Energy Particles
  if (heroAmbientCanvas) {
    const ctx = heroAmbientCanvas.getContext('2d');
    let width = heroAmbientCanvas.width = 320;
    let height = heroAmbientCanvas.height = 180;

    const particles = [];
    for (let i = 0; i < 35; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 40 + 20,
        dx: (Math.random() - 0.5) * 1.5,
        dy: (Math.random() - 0.5) * 1.5,
        alpha: Math.random() * 0.4 + 0.1,
      });
    }

    function drawAmbient() {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0 || p.x > width) p.dx *= -1;
        if (p.y < 0 || p.y > height) p.dy *= -1;

        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        grad.addColorStop(0, `rgba(255, 42, 75, ${p.alpha})`);
        grad.addColorStop(0.5, `rgba(180, 20, 50, ${p.alpha * 0.4})`);
        grad.addColorStop(1, 'transparent');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });

      requestAnimationFrame(drawAmbient);
    }
    drawAmbient();
  }

  // 7. Projects Filter Tabs
  const filterBtns = document.querySelectorAll('.filter-btn');
  const projectCards = document.querySelectorAll('.project-card');

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');

      projectCards.forEach((card) => {
        const category = card.getAttribute('data-category');
        if (filter === 'all' || category === filter) {
          card.style.display = 'flex';
          card.style.opacity = '0';
          card.style.transform = 'scale(0.96)';
          setTimeout(() => {
            card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            card.style.opacity = '1';
            card.style.transform = 'scale(1)';
          }, 30);
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // 8. Interactive Terminal Shell (RAMU-AI)
  const terminalForm = document.getElementById('terminalForm');
  const terminalInput = document.getElementById('terminalInput');
  const terminalOutput = document.getElementById('terminalOutput');
  const terminalScreen = document.getElementById('terminalScreen');
  const quickBtns = document.querySelectorAll('.terminal-quick-btn');

  const COMMANDS = {
    help: () => `
<span class="text-green">Available commands:</span>
  - <span class="highlight-text">whoami</span>     : Core identity, education & background
  - <span class="highlight-text">projects</span>   : Summary of shipped architectures
  - <span class="highlight-text">skills</span>     : Technical stack & tools
  - <span class="highlight-text">drift</span>      : High-velocity cinematic car spin
  - <span class="highlight-text">contact</span>    : Direct channels & social handles
  - <span class="highlight-text">hobbies</span>    : Sprinting, Carnatic violin, chess
  - <span class="highlight-text">sih</span>        : Smart India Hackathon 2026 MoSPI project
  - <span class="highlight-text">clear</span>      : Clear the terminal output
`,
    whoami: () => `
<span class="text-accent">IDENTITY // RAMU (codebyramu)</span>
  • Age: 19
  • Role: Frontend Developer & UI/UX Specialist @ ConnectNBuild
  • Education: 2nd-Year B.Tech CSE (AI & ML) at VISTAS Chennai
  • Location: Chennai, India
  • Passion: Blending low-latency AI agents with cinematic frontend polish.
`,
    projects: () => `
<span class="text-accent">FLAGSHIP BUILDS:</span>
  1. <span class="text-white">Ramu-AI</span>: Personal Voice & AR terminal assistant (Gemini + edge-tts + barehands AR).
  2. <span class="text-white">Vadivelu AI Agent</span>: Tamil comedy reaction AI (Gemini 2.0 Flash + Supabase pgvector).
  3. <span class="text-white">VOCARA / HumRoll</span>: Voice-to-MIDI studio (CREPE + Silero VAD, Carnatic pitch engine).
  4. <span class="text-white">National Learning Portal</span>: SIH 2026 for MoSPI (FAISS vector search + iGOT Karmayogi).
  5. <span class="text-white">Bhaskararajapuram Temple</span>: Next.js 15 + GSAP + Lenis production heritage site.
  6. <span class="text-white">HyperCade</span>: Multiplayer TV host + smartphone controller party gaming platform.
  7. <span class="text-white">Small Language Model</span>: ~1M parameter trainable neural model in PyTorch from scratch.
  8. <span class="text-white">Amrutsatvik Foods</span>: 21-product e-commerce platform with 3D cursor-reactive hero.
`,
    skills: () => `
<span class="text-green">TECHNICAL ARSENAL:</span>
  • Languages: Python, TypeScript, C/C++, JavaScript, SQL, Rust
  • Motion & Frontend: Next.js 15, React, Tailwind CSS, GSAP ScrollTrigger, Lenis, Three.js
  • AI & Systems: Google Gemini Flash/Pro, PyTorch, FAISS, Supabase pgvector, edge-tts
  • Tools: Arch Linux / Hyprland, Git, VS Code, LMMS, Blender, AGY CLI
`,
    hobbies: () => `
<span class="text-blue">BEYOND CODE:</span>
  • Athletics: 100m, 200m, 800m track sprinting
  • Music: Classical Carnatic violin practice
  • Mind: Chess tactics & LeetCode algorithmic problem solving
`,
    sih: () => `
<span class="text-green">SMART INDIA HACKATHON 2026:</span>
  • Organization: Ministry of Statistics & Programme Implementation (MoSPI)
  • Deliverable: National Learning Portal
  • Capabilities: Automated competency gap discovery, FAISS embedding matches to iGOT Karmayogi, PDF-to-quiz generation.
`,
    drift: () => {
      // Trigger a rapid scroll to hero and video playback
      if (heroWrapper) {
        heroWrapper.scrollIntoView({ behavior: 'smooth' });
      }
      if (heroVideo) {
        heroVideo.currentTime = 0;
        heroVideo.play().catch(() => {});
        isAutoPlaying = true;
        if (playStateText) playStateText.textContent = 'PAUSE';
      }
      return `<span class="text-accent">> INITIATING HIGH-OCTANE DRIFT // NITROUS ENGAGED...</span>`;
    },
    contact: () => `
<span class="text-green">COMMUNICATION CHANNELS:</span>
  • Email: <a href="mailto:codebyramu@gmail.com" class="inline-link">codebyramu@gmail.com</a>
  • GitHub: <a href="https://github.com/codebyramu" target="_blank" class="inline-link">github.com/codebyramu</a>
  • LeetCode: <a href="https://leetcode.com/u/codebyramu" target="_blank" class="inline-link">leetcode.com/u/codebyramu</a>
  • Twitter/X: <a href="https://twitter.com/codebyramu" target="_blank" class="inline-link">@codebyramu</a>
`,
    clear: () => {
      if (terminalOutput) terminalOutput.innerHTML = '';
      return null;
    },
  };

  function executeTerminalCommand(rawCmd) {
    const cmd = rawCmd.trim().toLowerCase();
    if (!cmd) return;

    // Append user input line
    const userLine = document.createElement('div');
    userLine.className = 'term-line';
    userLine.innerHTML = `<span class="term-prompt">ramu@hyperstation:~$</span> ${rawCmd}`;
    terminalOutput.appendChild(userLine);

    // Process output
    if (COMMANDS[cmd]) {
      const result = COMMANDS[cmd]();
      if (result) {
        const resLine = document.createElement('div');
        resLine.className = 'term-line';
        resLine.innerHTML = result;
        terminalOutput.appendChild(resLine);
      }
    } else {
      const errLine = document.createElement('div');
      errLine.className = 'term-line text-muted';
      errLine.innerHTML = `command not found: ${cmd}. Type <span class="highlight-text">'help'</span> for available commands.`;
      terminalOutput.appendChild(errLine);
    }

    if (terminalScreen) {
      terminalScreen.scrollTop = terminalScreen.scrollHeight;
    }
  }

  if (terminalForm && terminalInput) {
    terminalForm.addEventListener('submit', (e) => {
      e.preventDefault();
      executeTerminalCommand(terminalInput.value);
      terminalInput.value = '';
    });
  }

  quickBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const cmd = btn.getAttribute('data-cmd');
      if (cmd) executeTerminalCommand(cmd);
    });
  });

  // 9. Copy Email Action
  const copyEmailBtn = document.getElementById('copyEmailBtn');
  const copyEmailText = document.getElementById('copyEmailText');

  if (copyEmailBtn && copyEmailText) {
    copyEmailBtn.addEventListener('click', () => {
      const email = 'codebyramu@gmail.com';
      navigator.clipboard.writeText(email).then(() => {
        const originalText = copyEmailText.textContent;
        copyEmailText.textContent = 'COPIED TO CLIPBOARD!';
        copyEmailBtn.style.background = '#10b981';
        setTimeout(() => {
          copyEmailText.textContent = originalText;
          copyEmailBtn.style.background = '';
        }, 2200);
      }).catch(() => {
        window.location.href = `mailto:${email}`;
      });
    });
  }
});
