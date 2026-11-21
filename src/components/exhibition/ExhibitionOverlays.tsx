import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Compass,
  ExternalLink,
  X,
} from 'lucide-react';
import {
  CHAPTER_JUMPS,
  EXHIBITS,
  REUNION_PROGRESS_THRESHOLD,
  ROOM_META,
  motionRefs,
  scrollPastHeroCurtain,
  scrollToProgress,
  setExhibitionState,
  useExhibitionStore,
} from '../../data/exhibitionData';
import {
  CURTAIN_REVEAL_SCROLL_PX,
  computeCurtainRevealFraction,
  smoothstep01,
} from '../../utils/exhibitionScroll';
import { MagneticButton } from './MagneticButton';

// =========================================================================
// 1. PRELOADER CURTAIN (ORBIT + RADIAL LOGO REVEAL + TABULAR COUNTER)
// =========================================================================

export function ExhibitionLoader() {
  const phase = useExhibitionStore((s) => s.phase);
  const loaded = useExhibitionStore((s) => s.loaded);
  const [pct, setPct] = useState(0);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (phase !== 'loading') return;
    if (
      typeof window !== 'undefined' &&
      (window.location.search.includes('autostart=1') ||
        window.location.hash.includes('autostart=1'))
    ) {
      setPct(1);
      setExhibitionState({ phase: 'gallery' });
      return;
    }

    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const minRamp = Math.min(1, elapsed / 650);
      const target = elapsed > 1250 ? 1 : Math.min(loaded, minRamp);
      setPct((prev) => {
        const next = prev + (target - prev) * 0.22;
        if (next >= 0.992 && (loaded >= 1 || elapsed > 1250)) {
          return 1;
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, loaded]);

  useEffect(() => {
    if (pct >= 0.995 && phase === 'loading') {
      const timer = window.setTimeout(() => {
        setExhibitionState({ phase: 'gallery' });
      }, 180);
      return () => window.clearTimeout(timer);
    }
  }, [pct, phase]);

  useEffect(() => {
    if (phase === 'gallery') {
      const timer = window.setTimeout(() => setHidden(true), 650);
      return () => window.clearTimeout(timer);
    }
    setHidden(false);
  }, [phase]);

  if (hidden) return null;

  const displayNum = String(Math.round(pct * 100)).padStart(3, '0');
  const clipPct = Math.round((1 - pct) * 100);

  return (
    <div
      className={`fixed inset-0 z-[70] flex flex-col items-center justify-center bg-[#0f0307] text-[#ffcf8a] transition-opacity duration-700 ${
        phase === 'gallery' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, rgba(128, 0, 32, 0.42), rgba(15, 3, 7, 0.96) 65%)',
        }}
      />

      <div className="relative flex flex-col items-center">
        {/* Orbiting golden spark */}
        <div className="relative h-36 w-36 flex items-center justify-center">
          <div className="loader-orbit absolute inset-0 rounded-full border border-[#d4af37]/25">
            <span
              className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-[#ffcf8a]"
              style={{
                boxShadow: '0 0 14px 4px rgba(255, 207, 138, 0.85)',
              }}
            />
          </div>

          <div className="relative h-24 w-24 rounded-full bg-[#1b050d]/90 border border-[#d4af37]/30 flex items-center justify-center overflow-hidden shadow-2xl">
            <img
              src="/gvlogo.png"
              alt="Grizzly Vidyalya Crest"
              className="h-16 w-16 object-contain opacity-20"
              referrerPolicy="no-referrer"
            />
            <img
              src="/gvlogo.png"
              alt=""
              aria-hidden="true"
              className="absolute h-16 w-16 object-contain transition-[clip-path] duration-150"
              style={{
                clipPath: `inset(${clipPct}% 0 0 0)`,
              }}
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        <p className="mt-7 font-mono-tabular text-3xl tracking-[0.28em] text-[#ffcf8a]">
          {displayNum}
        </p>
        <p className="mt-2 text-[11px] uppercase tracking-[0.38em] text-white/60">
          Grizzly Vidyalya Alumni Campus
        </p>

        <button
          type="button"
          onClick={() => setExhibitionState({ phase: 'gallery' })}
          className="mt-6 text-[11px] uppercase tracking-[0.28em] text-[#d4af37]/80 hover:text-[#ffcf8a] transition-colors cursor-pointer"
        >
          Enter Exhibition →
        </button>
      </div>
    </div>
  );
}

// =========================================================================
// 2. SLIDING HERO CURTAIN WITH GOLDEN HERITAGE PARTICLES & CAMPUS SHOWCASE
// =========================================================================

function HeroAmbienceCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    let isAwake = false;

    const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { deviceMemory?: number }) : null;
    const lowSpec =
      Boolean(window.matchMedia?.('(pointer: coarse)').matches) ||
      Boolean(nav?.hardwareConcurrency && nav.hardwareConcurrency <= 4) ||
      Boolean(nav?.deviceMemory && nav.deviceMemory <= 4);

    const particles = Array.from({ length: lowSpec ? 22 : 38 }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.9 + (i % 3) * 0.7,
      vy: 0.015 + (i % 5) * 0.006,
      phase: i * 0.7,
    }));

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      width = parent.clientWidth;
      height = parent.clientHeight;
      const dpr = lowSpec ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const start = performance.now();
    const draw = (now: number) => {
      raf = 0;
      if (window.scrollY > CURTAIN_REVEAL_SCROLL_PX + 80) {
        isAwake = false;
        return;
      }

      const t = (now - start) * 0.001;
      ctx.clearRect(0, 0, width, height);

      // Sweeping nostalgic golden threads across curtain backdrop
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        const baseY = height * (0.28 + i * 0.22);
        for (let x = 0; x <= width; x += 40) {
          const y =
            baseY +
            Math.sin(x * 0.0045 + t * (0.55 + i * 0.15) + i * 1.4) * 34 +
            Math.cos(x * 0.009 - t * 0.4) * 14;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle =
          i === 1 ? 'rgba(255, 207, 138, 0.11)' : 'rgba(212, 175, 55, 0.07)';
        ctx.lineWidth = i === 1 ? 1.5 : 1;
        ctx.stroke();
      }

      // Drifting warm dust motes
      particles.forEach((p) => {
        p.y -= p.vy * 0.016;
        if (p.y < -0.05) p.y = 1.05;
        const px = (p.x + Math.sin(t * 0.6 + p.phase) * 0.015) * width;
        const py = p.y * height;
        const alpha = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.6 + p.phase));
        ctx.beginPath();
        ctx.arc(px, py, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 212, 148, ${alpha.toFixed(3)})`;
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    };

    const ensureRunning = () => {
      if (window.scrollY <= CURTAIN_REVEAL_SCROLL_PX + 80 && !isAwake) {
        isAwake = true;
        raf = requestAnimationFrame(draw);
      }
    };

    ensureRunning();
    window.addEventListener('scroll', ensureRunning, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', ensureRunning);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
}

const MEMORY_NODES = [
  { top: '26%', left: '22%', delay: '0s' },
  { top: '42%', left: '74%', delay: '0.9s' },
  { top: '68%', left: '34%', delay: '1.7s' },
  { top: '55%', left: '58%', delay: '2.4s' },
];

export function HeroCurtain({ scrollTrackHeight }: { scrollTrackHeight?: number }) {
  const phase = useExhibitionStore((s) => s.phase);
  const focus = useExhibitionStore((s) => s.focus);
  const bench = useExhibitionStore((s) => s.bench);
  const curtainRef = useRef<HTMLDivElement>(null);
  const focusOrBenchRef = useRef(Boolean(focus || bench));
  focusOrBenchRef.current = Boolean(focus || bench);

  useEffect(() => {
    let raf = 0;
    let currentT = computeCurtainRevealFraction(window.scrollY);
    let targetT = currentT;

    const applyTransform = (t: number) => {
      const el = curtainRef.current;
      if (!el) return;
      if (t >= 0.996) {
        el.style.display = 'none';
        el.style.pointerEvents = 'none';
        return;
      }
      if (el.style.display === 'none') {
        el.style.display = 'block';
      }
      const eased = smoothstep01(t);
      el.style.transform = `translate3d(${-105 * eased}%, 0, 0)`;
      el.style.opacity = t >= 0.99 ? '0' : '1';
      el.style.visibility = t >= 0.995 ? 'hidden' : 'visible';
      el.style.pointerEvents = t >= 0.85 || focusOrBenchRef.current ? 'none' : 'auto';
    };

    applyTransform(currentT);

    const step = () => {
      raf = 0;
      targetT = computeCurtainRevealFraction(window.scrollY);
      const diff = targetT - currentT;
      if (Math.abs(diff) <= 0.001) {
        currentT = targetT;
        applyTransform(currentT);
        return;
      }
      currentT += diff * 0.24;
      applyTransform(currentT);
      raf = requestAnimationFrame(step);
    };

    const wake = () => {
      targetT = computeCurtainRevealFraction(window.scrollY);
      if (!raf) {
        raf = requestAnimationFrame(step);
      }
    };

    window.addEventListener('scroll', wake, { passive: true });
    window.addEventListener('resize', wake, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', wake);
      window.removeEventListener('resize', wake);
    };
  }, [focus, bench, scrollTrackHeight]);

  return (
    <div
      ref={curtainRef}
      className={`fixed inset-y-0 left-0 z-30 w-full overflow-hidden shadow-[24px_0_80px_rgba(0,0,0,0.75)] transition-opacity duration-500 ${
        phase === 'loading' ? 'opacity-0 pointer-events-none' : ''
      }`}
      style={{
        background:
          'linear-gradient(135deg, #16040b 0%, #260613 48%, #0f0308 100%)',
        willChange: 'transform',
      }}
    >
      {/* Subtle architectural dot matrix */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(rgba(255, 207, 138, 0.35) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <HeroAmbienceCanvas />

      {/* Warm radial glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-1/2 h-[540px] w-[540px] -translate-y-1/2 rounded-full opacity-35 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(212, 175, 55, 0.36) 0%, rgba(128, 0, 32, 0.15) 55%, transparent 75%)',
        }}
      />

      <div className="relative z-10 flex h-full w-full flex-col justify-between px-6 pt-24 pb-8 sm:px-10 md:px-14 lg:px-16">
        <div className="grid my-auto items-center gap-8 lg:grid-cols-12 lg:gap-10">
          {/* Left Narrative Column */}
          <div className="lg:col-span-7 max-w-2xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.34em] text-[#ffcf8a]/80">
              Grizzly Vidyalya · Telaiya Dam · Alumni Archive
            </p>

            <h1 className="font-display mt-4 text-4xl font-bold tracking-wide text-white sm:text-5xl lg:text-6xl leading-[1.06]">
              WELCOME HOME,
              <span className="mt-1 block bg-gradient-to-r from-[#fff3d6] via-[#ffcf8a] to-[#d4af37] bg-clip-text text-transparent">
                GRIZZLIAN
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-sm sm:text-base leading-relaxed text-white/75">
              Walk the virtual campus of Grizzly Vidyalya—from the first morning at
              our main gates, through sunlit courtyards and mess tables, to the
              alumni network uniting batches worldwide.
            </p>

            {/* Techkriti-inspired Animated Heritage Circuit Trace */}
            <div className="mt-6 hidden sm:block max-w-lg">
              <div className="flex items-center justify-between text-[10px] font-mono-tabular uppercase tracking-[0.26em] text-[#ffcf8a]/75 mb-1.5">
                <span>Grizzly Vidyalaya</span>
                <span>Est. Heritage</span>
                <span>Global Chapters</span>
              </div>
              <svg
                viewBox="0 0 520 44"
                className="w-full h-11 overflow-visible"
                aria-hidden="true"
              >
                <path
                  d="M 8 22 L 170 22 L 194 10 L 326 10 L 350 22 L 512 22"
                  fill="none"
                  stroke="rgba(255, 207, 138, 0.2)"
                  strokeWidth="1.5"
                />
                <path
                  d="M 8 22 L 170 22 L 194 10 L 326 10 L 350 22 L 512 22"
                  fill="none"
                  stroke="rgba(212, 175, 55, 0.65)"
                  strokeWidth="1.5"
                  className="trace-draw"
                />
                <path
                  d="M 8 22 L 170 22 L 194 10 L 326 10 L 350 22 L 512 22"
                  fill="none"
                  stroke="#fff5dc"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="trace-pulse"
                />
                <circle cx="8" cy="22" r="3.5" fill="#ffcf8a" />
                <circle cx="260" cy="10" r="4" fill="#d4af37" />
                <circle cx="512" cy="22" r="3.5" fill="#8fe3ff" />
              </svg>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-5">
              <MagneticButton
                tone="amber"
                label="Walk The Campus"
                onClick={() => scrollPastHeroCurtain()}
              />
              <Link
                to="/auth?mode=signup"
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium uppercase tracking-[0.2em] text-white/80 hover:text-[#ffcf8a] transition-colors whitespace-nowrap"
              >
                Join Alumni Network
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Right Layered Campus Memory Collage (Real Grizzly Vidyalaya Campus Photos, Zero Text Overlap) */}
          <div className="hidden md:block lg:col-span-5">
            <div className="relative mx-auto max-w-md">
              {/* Primary Framed Campus Photo: /innerview.png */}
              <div className="relative overflow-hidden rounded-xl border border-[#d4af37]/35 bg-[#120409] p-2 shadow-[0_24px_60px_rgba(0,0,0,0.65)]">
                <div className="relative aspect-[16/10] overflow-hidden rounded-lg">
                  <img
                    src="/innerview.png"
                    alt="Grizzly Vidyalaya Campus Courtyard & Academic Wings"
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#14040a]/30 via-transparent to-[#14040a]/15" />

                  {/* Twinkling memory nodes */}
                  {MEMORY_NODES.map((node, idx) => (
                    <span
                      key={idx}
                      aria-hidden="true"
                      className="memory-node"
                      style={{
                        top: node.top,
                        left: node.left,
                        animationDelay: node.delay,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Clean Non-Overlapping Secondary Campus Card & Heritage Placard Row */}
              <div className="mt-3.5 grid grid-cols-12 gap-3.5 items-stretch">
                <div className="col-span-5 overflow-hidden rounded-lg border border-[#d4af37]/35 bg-[#140409] p-1.5 shadow-xl flex flex-col">
                  <div className="relative aspect-[16/10] overflow-hidden rounded">
                    <img
                      src="/gate.png"
                      alt="Grizzly Vidyalaya Main Entrance Gate"
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <p className="mt-1.5 px-1 text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-[#ffcf8a]">
                    Campus Main Gate
                  </p>
                </div>

                <div className="col-span-7 rounded-lg border border-[#d4af37]/30 bg-[#14040a]/95 px-4 py-3 shadow-xl flex flex-col justify-center">
                  <p className="text-[10px] font-mono-tabular uppercase tracking-[0.24em] text-[#ffcf8a]">
                    Main Campus · Telaiya Dam
                  </p>
                  <p className="font-display mt-1 text-base font-semibold leading-snug text-white">
                    Grizzly Vidyalaya Campus
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-white/65">
                    Sunlit quadrangles, academic wings &amp; alumni roots.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar inside curtain */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10 text-[11px] uppercase tracking-[0.26em] text-white/55">
          <span className="hidden sm:inline">4 Interactive 3D Campus Wings</span>
          <button
            type="button"
            onClick={() => scrollPastHeroCurtain()}
            className="ml-auto flex items-center gap-3 text-[#ffcf8a]/90 hover:text-white transition-colors cursor-pointer"
          >
            <span>Scroll to walk</span>
            <span className="relative h-2 w-10 rounded-full bg-white/15 overflow-hidden">
              <span className="gallery-scroll-dot absolute top-0.5 h-1 w-1.5 rounded-full bg-[#ffcf8a]" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// 3. CUSTOM DIFFERENCE-BLEND CURSOR + GLOWING LIGHT TRAIL CANVAS
// =========================================================================

export function ExhibitionCursor({ inGallery = true }: { inGallery?: boolean }) {
  const hover = useExhibitionStore((s) => s.hover);
  const focus = useExhibitionStore((s) => s.focus);
  const bench = useExhibitionStore((s) => s.bench);
  const room = useExhibitionStore((s) => s.room);
  const phase = useExhibitionStore((s) => s.phase);

  const cursorRef = useRef<HTMLDivElement>(null);
  const trailCanvasRef = useRef<HTMLCanvasElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!coarse && !reduced) {
      setEnabled(true);
    }
  }, []);

  const cursorActive = enabled && phase === 'gallery' && inGallery && !focus && !bench;

  // Hide native browser pointer strictly while actively walking inside the 3D gallery
  useEffect(() => {
    document.documentElement.classList.toggle('exhibition-cursor-hidden', cursorActive);
    if (!inGallery) {
      setExhibitionState({ hover: null });
    }
    return () => {
      document.documentElement.classList.remove('exhibition-cursor-hidden');
    };
  }, [cursorActive, inGallery]);

  useEffect(() => {
    if (!cursorActive) {
      const canvas = trailCanvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      if (cursorRef.current) {
        cursorRef.current.classList.remove('is-on');
      }
      return;
    }

    const canvas = trailCanvasRef.current;
    const cursorEl = cursorRef.current;
    const dotEl = dotRef.current;
    const ctx = canvas?.getContext('2d') || null;

    const trail: { x: number; y: number; life: number }[] = [];
    const targetPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const smoothPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    let visible = false;
    let uiInteractive = false;
    let raf = 0;

    const resize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const scheduleTick = () => {
      if (!raf) {
        raf = requestAnimationFrame(tick);
      }
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      visible = true;
      targetPos.x = e.clientX;
      targetPos.y = e.clientY;
      motionRefs.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      motionRefs.pointer.y = (e.clientY / window.innerHeight) * 2 - 1;

      const el = e.target as HTMLElement | null;
      uiInteractive = Boolean(el?.closest('a, button, [role="button"], input, textarea, select'));

      if (!motionRefs.scrolledPastGallery && !focus && !bench) {
        trail.push({ x: e.clientX, y: e.clientY, life: 1 });
        if (trail.length > 14) trail.shift();
      }
      scheduleTick();
    };

    const onLeave = () => {
      visible = false;
      scheduleTick();
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);

    const tick = () => {
      raf = 0;
      const dx = targetPos.x - smoothPos.x;
      const dy = targetPos.y - smoothPos.y;
      smoothPos.x += dx * 0.3;
      smoothPos.y += dy * 0.3;

      if (cursorEl) {
        cursorEl.style.transform = `translate3d(${smoothPos.x}px, ${smoothPos.y}px, 0)`;
        cursorEl.classList.toggle('is-on', visible && phase === 'gallery');
      }

      if (dotEl && !hover) {
        dotEl.style.transform = uiInteractive ? 'scale(1.65)' : 'scale(1)';
      }

      if (ctx && canvas) {
        if (trail.length > 0) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const accent = ROOM_META[room]?.accent || '#ffcf8a';
          for (let i = trail.length - 1; i >= 0; i--) {
            trail[i].life -= 0.08;
            if (trail[i].life <= 0) {
              trail.splice(i, 1);
            }
          }
          if (
            trail.length > 1 &&
            phase === 'gallery' &&
            !focus &&
            !bench &&
            !motionRefs.scrolledPastGallery
          ) {
            for (let i = 1; i < trail.length; i++) {
              const p0 = trail[i - 1];
              const p1 = trail[i];
              ctx.beginPath();
              ctx.moveTo(p0.x, p0.y);
              ctx.lineTo(p1.x, p1.y);
              ctx.strokeStyle = accent;
              ctx.globalAlpha = Math.max(0, p1.life * 0.34);
              ctx.lineWidth = Math.max(0.8, p1.life * 2.8);
              ctx.lineCap = 'round';
              ctx.stroke();
            }
            ctx.globalAlpha = 1;
          }
        }
      }

      if (
        Math.abs(targetPos.x - smoothPos.x) >= 0.15 ||
        Math.abs(targetPos.y - smoothPos.y) >= 0.15 ||
        trail.length > 0
      ) {
        scheduleTick();
      }
    };

    scheduleTick();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('mouseleave', onLeave);
    };
  }, [cursorActive, room, phase, focus, bench, hover]);

  if (!cursorActive) return null;

  const isHovering = Boolean(hover) && !focus && !bench;
  const cursorLabel =
    hover === 'bench'
      ? 'SIT DOWN'
      : hover === 'chapter-join'
      ? 'JOIN NOW'
      : hover?.startsWith('holo-')
      ? 'OPEN'
      : 'ZOOM IN';

  return (
    <>
      <canvas
        ref={trailCanvasRef}
        className="pointer-events-none fixed inset-0 z-30"
        aria-hidden="true"
      />
      <div
        ref={cursorRef}
        aria-hidden="true"
        className="gallery-cursor pointer-events-none fixed top-0 left-0 z-[80] -translate-x-1/2 -translate-y-1/2"
      >
        <div
          ref={dotRef}
          className={`flex items-center justify-center rounded-full border border-white transition-[width,height,background-color,transform] duration-200 ${
            isHovering
              ? 'h-20 w-20 bg-white text-black'
              : 'h-4 w-4 bg-white/95 text-transparent'
          }`}
        >
          {isHovering && (
            <span className="text-[10px] font-bold uppercase tracking-[0.16em]">
              {cursorLabel}
            </span>
          )}
        </div>
      </div>
    </>
  );
}

// =========================================================================
// 4. ROOM HUD & CHAPTER JUMP RAIL
// =========================================================================

export function RoomHudAndChapters({
  inGallery,
  onJumpCommunity,
}: {
  inGallery: boolean;
  onJumpCommunity: () => void;
}) {
  const phase = useExhibitionStore((s) => s.phase);
  const room = useExhibitionStore((s) => s.room);
  const focus = useExhibitionStore((s) => s.focus);
  const bench = useExhibitionStore((s) => s.bench);
  const webglSupported = useExhibitionStore((s) => s.webglSupported);

  if (!webglSupported || phase === 'loading' || focus || bench || !inGallery) {
    return null;
  }

  const meta = ROOM_META[room];

  return (
    <>
      {/* Bottom-left Room Identifier */}
      <div className="pointer-events-none fixed bottom-6 left-6 z-20 hidden sm:block">
        <div className="rounded-lg border border-white/10 bg-[#120409]/88 px-4 py-2.5 shadow-lg">
          <p
            className="text-[10px] font-mono-tabular uppercase tracking-[0.28em]"
            style={{ color: meta.accent }}
          >
            {meta.era}
          </p>
          <p className="font-display mt-0.5 text-sm font-semibold tracking-wide text-white">
            {meta.name}
          </p>
        </div>
      </div>

      {/* Bottom-right Chapter Jump Rail */}
      <div className="fixed bottom-5 right-5 z-20 flex flex-wrap items-center gap-1.5 rounded-full border border-white/15 bg-[#120409]/90 p-1.5 shadow-2xl">
        {CHAPTER_JUMPS.map((ch) => {
          const active = room === ch.room;
          return (
            <button
              key={ch.room}
              type="button"
              onClick={() => scrollToProgress(ch.progress)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-medium tracking-wide transition-all cursor-pointer whitespace-nowrap ${
                active
                  ? 'bg-[#d4af37] text-[#1c040b] font-semibold'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
              }`}
            >
              {ch.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={onJumpCommunity}
          className="inline-flex items-center gap-1 rounded-full border border-[#d4af37]/35 px-3 py-1.5 text-[11px] font-medium text-[#ffcf8a] hover:bg-[#d4af37]/15 transition-colors cursor-pointer whitespace-nowrap"
        >
          Community
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>
    </>
  );
}

// =========================================================================
// 5. CLICK-TO-ZOOM EXHIBIT HUD DETAIL CARD
// =========================================================================

export function ExhibitDetailModal() {
  const focus = useExhibitionStore((s) => s.focus);
  const detail = useExhibitionStore((s) => s.detail);

  const exhibitIdx = focus ? EXHIBITS.findIndex((e) => e.id === focus) : -1;
  const exhibit = exhibitIdx >= 0 ? EXHIBITS[exhibitIdx] : null;

  useEffect(() => {
    if (!focus) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setExhibitionState({ focus: null, detail: false });
      } else if (e.key === 'ArrowRight' && exhibitIdx >= 0) {
        const next = EXHIBITS[(exhibitIdx + 1) % EXHIBITS.length];
        setExhibitionState({ focus: next.id, detail: false });
      } else if (e.key === 'ArrowLeft' && exhibitIdx >= 0) {
        const prev = EXHIBITS[(exhibitIdx - 1 + EXHIBITS.length) % EXHIBITS.length];
        setExhibitionState({ focus: prev.id, detail: false });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focus, exhibitIdx]);

  if (!focus || !exhibit) return null;

  const accent = ROOM_META[exhibit.room]?.accent || '#ffcf8a';

  const cycleExhibit = (delta: number) => {
    const next = EXHIBITS[(exhibitIdx + delta + EXHIBITS.length) % EXHIBITS.length];
    setExhibitionState({ focus: next.id, detail: false });
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center md:justify-end p-4 sm:p-8 lg:p-12 pointer-events-none"
      style={{ '--hud': accent } as React.CSSProperties}
    >
      {/* Subtle close trigger backdrop while gliding or inspecting */}
      <button
        type="button"
        aria-label="Close exhibit inspection"
        onClick={() => setExhibitionState({ focus: null, detail: false })}
        className="pointer-events-auto fixed inset-0 bg-black/25 cursor-pointer"
      />

      {detail && (
        <article className="hud-card pointer-events-auto relative z-10 w-full max-w-md border border-white/15 bg-[#120409]/96 p-6 sm:p-7 text-white shadow-[0_24px_80px_rgba(0,0,0,0.75)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p
                className="text-[10px] font-mono-tabular uppercase tracking-[0.28em]"
                style={{ color: accent }}
              >
                {exhibit.kicker}
              </p>
              <h2 className="font-display mt-1.5 text-2xl font-bold text-white leading-tight">
                {exhibit.title}
              </h2>
              <p className="mt-1 text-xs text-white/60">{exhibit.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setExhibitionState({ focus: null, detail: false })}
              aria-label="Close detail"
              className="rounded-md border border-white/15 p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 overflow-hidden rounded-md border border-white/10">
            <img
              src={exhibit.imageSrc}
              alt={exhibit.title}
              className="h-40 w-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>

          <p className="mt-4 text-sm font-semibold text-[#ffcf8a]">
            {exhibit.headline}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/75">
            {exhibit.about}
          </p>

          <dl className="mt-4 space-y-2 border-t border-white/10 pt-3 text-xs">
            {exhibit.facts.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-4">
                <dt className="uppercase tracking-[0.18em] text-white/45">{k}</dt>
                <dd className="text-right font-medium text-white/90">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-5 flex flex-col gap-3">
            <Link
              to={exhibit.href}
              onClick={() => setExhibitionState({ focus: null, detail: false })}
              className="inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#1c040b] transition-transform hover:scale-[1.01]"
              style={{ backgroundColor: accent }}
            >
              {exhibit.cta}
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>

            <div className="flex items-center justify-between border-t border-white/10 pt-3">
              <button
                type="button"
                onClick={() => cycleExhibit(-1)}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white/70 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Previous
              </button>
              <span className="font-mono-tabular text-[11px] text-white/40">
                {String(exhibitIdx + 1).padStart(2, '0')} / {String(EXHIBITS.length).padStart(2, '0')}
              </span>
              <button
                type="button"
                onClick={() => cycleExhibit(1)}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white/70 hover:text-white transition-colors cursor-pointer"
              >
                Next
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </article>
      )}
    </div>
  );
}

// =========================================================================
// 6. BELVEDERE BENCH OVERLOOK MODAL
// =========================================================================

export function BenchModal() {
  const bench = useExhibitionStore((s) => s.bench);

  useEffect(() => {
    if (!bench) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setExhibitionState({ bench: false });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [bench]);

  if (!bench) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#0c0a14]">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 30%, rgba(128, 0, 32, 0.45), rgba(16, 12, 24, 0.92) 55%, rgba(8, 3, 6, 0.98) 100%)',
        }}
      />

      <div className="relative z-10 mx-auto max-w-2xl px-6 text-center">
        <p className="text-[11px] font-mono-tabular uppercase tracking-[0.34em] text-[#f4a261]">
          Campus III · Campus Overlook
        </p>
        <h2 className="font-display mt-3 text-4xl sm:text-5xl font-bold text-white">
          Where It All Began
        </h2>
        <p className="mt-4 text-base sm:text-lg leading-relaxed text-white/80">
          Years pass, cities change, and batches scatter across the world—yet one
          look back at these grounds brings every friend and classroom right back
          to mind.
        </p>

        <div className="mt-8 mx-auto max-w-sm overflow-hidden rounded-xl border border-[#d4af37]/30 bg-[#14050b]/96 px-6 py-6">
          <img
            src="/gvlogo.png"
            alt="Grizzly Vidyalaya Crest"
            className="mx-auto h-20 w-20 object-contain"
            referrerPolicy="no-referrer"
          />
          <p className="mt-4 text-xs font-mono-tabular uppercase tracking-[0.24em] text-[#ffcf8a]">
            Grizzly Vidyalaya · Telaiya Dam, Koderma
          </p>
          <p className="mt-1 text-xs text-white/60">
            Success Through Hard Work · Forever Connected
          </p>
        </div>

        <button
          type="button"
          onClick={() => setExhibitionState({ bench: false })}
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-[#f4a261]/50 bg-[#1a0a10]/80 px-7 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#ffcf8a] hover:bg-[#f4a261] hover:text-[#1a0a10] transition-colors cursor-pointer"
        >
          Stand Up & Continue
        </button>
      </div>
    </div>
  );
}

// =========================================================================
// 7. FLOATING REUNION CTA (APPEARS IN CAMPUS IV)
// =========================================================================

export function FloatingInviteCTA({ inGallery }: { inGallery: boolean }) {
  const phase = useExhibitionStore((s) => s.phase);
  const focus = useExhibitionStore((s) => s.focus);
  const bench = useExhibitionStore((s) => s.bench);
  const room = useExhibitionStore((s) => s.room);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const check = () => {
      const shouldShow =
        inGallery &&
        phase === 'gallery' &&
        !focus &&
        !bench &&
        (room === 'reunion' || motionRefs.target >= REUNION_PROGRESS_THRESHOLD - 0.04);
      setVisible((prev) => (prev === shouldShow ? prev : shouldShow));
    };
    check();
    window.addEventListener('scroll', check, { passive: true });
    return () => window.removeEventListener('scroll', check);
  }, [inGallery, phase, focus, bench, room]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 left-1/2 z-20 -translate-x-1/2 pointer-events-auto">
      <MagneticButton tone="cyan" label="Join Alumni Network" to="/auth?mode=signup" />
    </div>
  );
}

// =========================================================================
// 8. WEBGL-UNAVAILABLE STATIC FALLBACK GALLERY
// =========================================================================

export function WebGLFallbackShowcase({
  onJumpCommunity,
}: {
  onJumpCommunity: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = EXHIBITS.find((e) => e.id === selectedId) || null;

  return (
    <section className="relative bg-[#14040a] pt-28 pb-20 px-4 sm:px-6 lg:px-8 text-white">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-3xl">
          <p className="text-xs font-mono-tabular uppercase tracking-[0.32em] text-[#ffcf8a]">
            Grizzly Vidyalya · Alumni Archive
          </p>
          <h1 className="font-display mt-3 text-4xl sm:text-6xl font-bold text-white">
            Welcome Home, Grizzlian
          </h1>
          <p className="mt-4 text-base sm:text-lg text-white/75">
            Explore cherished campus memories from Telaiya Dam and connect
            with your batchmates on GVConnect.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <MagneticButton tone="amber" label="Join Alumni Network" to="/auth?mode=signup" />
            <button
              type="button"
              onClick={onJumpCommunity}
              className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/40 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#ffcf8a] hover:bg-[#d4af37]/15 transition-colors cursor-pointer"
            >
              <Compass className="h-4 w-4" />
              Explore Community
            </button>
          </div>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {EXHIBITS.map((ex) => (
            <button
              key={ex.id}
              type="button"
              onClick={() => setSelectedId(ex.id)}
              className="group text-left overflow-hidden rounded-xl border border-white/10 bg-[#1c0710] transition-all hover:-translate-y-1 hover:border-[#d4af37]/50 cursor-pointer"
            >
              <div className="aspect-[16/10] overflow-hidden">
                <img
                  src={ex.imageSrc}
                  alt={ex.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="p-5">
                <p className="text-[10px] font-mono-tabular uppercase tracking-[0.24em] text-[#ffcf8a]">
                  {ex.kicker}
                </p>
                <h2 className="font-display mt-1 text-xl font-bold text-white">
                  {ex.title}
                </h2>
                <p className="mt-1.5 text-sm text-white/65 line-clamp-2">
                  {ex.headline}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 p-4">
          <div className="hud-card relative w-full max-w-lg border border-white/15 bg-[#120409] p-6 text-white">
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-md border border-white/15 p-1.5 text-white/70 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="text-[10px] font-mono-tabular uppercase tracking-[0.24em] text-[#ffcf8a]">
              {selected.kicker}
            </p>
            <h3 className="font-display mt-1 text-2xl font-bold text-white">
              {selected.title}
            </h3>
            <img
              src={selected.imageSrc}
              alt={selected.title}
              className="mt-4 h-48 w-full rounded-md object-cover"
              referrerPolicy="no-referrer"
            />
            <p className="mt-4 text-sm leading-relaxed text-white/80">
              {selected.about}
            </p>
            <Link
              to={selected.href}
              className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#d4af37] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#1c040b]"
            >
              {selected.cta}
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
