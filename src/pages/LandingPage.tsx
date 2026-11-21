import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  ChevronDown,
  MessageCircle,
  Users,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { AlumniCanvas3D } from '../components/exhibition/AlumniCanvas3D';
import {
  BenchModal,
  ExhibitDetailModal,
  ExhibitionCursor,
  ExhibitionLoader,
  FloatingInviteCTA,
  HeroCurtain,
  RoomHudAndChapters,
  WebGLFallbackShowcase,
} from '../components/exhibition/ExhibitionOverlays';
import { MagneticButton } from '../components/exhibition/MagneticButton';
import {
  EXHIBITS,
  TOTAL_PATH_WEIGHT,
  getMaxScrollDistance,
  motionRefs,
  progressForExhibit,
  resetExhibitionStore,
  scrollToProgress,
  scrollTrackRef,
  setExhibitionState,
  useExhibitionStore,
} from '../data/exhibitionData';
import { computeTrackHeightPx } from '../utils/exhibitionScroll';

const COMMUNITY_PILLARS = [
  {
    icon: Users,
    kicker: 'Verified Network',
    title: 'Alumni Directory',
    description:
      'Find batchmates from your graduating year or connect across senior and junior batches worldwide.',
    cta: 'Browse Directory',
    href: '/directory',
  },
  {
    icon: MessageCircle,
    kicker: 'Real-Time Conversations',
    title: 'Group Chat & Forums',
    description:
      'Jump into batch rooms, hostel and bus-crew threads, and live discussions with fellow Grizzlians.',
    cta: 'Open Alumni Chat',
    href: '/chat',
  },
  {
    icon: Calendar,
    kicker: 'Campus Legacy',
    title: 'Reunions & Mentorship',
    description:
      'Stay close to Telaiya Dam gatherings, homecoming meets, and career guidance circles.',
    cta: 'Join the Network',
    href: '/auth?mode=signup',
  },
];

const WHY_JOIN_POINTS = [
  'Reconnect with batchmates from your classrooms and bus routes',
  'Share your career milestones and discover alumni opportunities',
  'Mentor current Grizzly Vidyalya students and recent graduates',
  'Coordinate chapter meetups and silver-jubilee campus reunions',
];

const FAQ_ITEMS = [
  {
    num: '01',
    q: 'How do I verify my Grizzly Vidyalya alumni profile?',
    a: 'Sign up with your email, select your graduating batch, and complete quick alumni verification to unlock full access to the directory and real-time group chats.',
  },
  {
    num: '02',
    q: 'Can I interact with the 3D Campus Exhibition?',
    a: 'Yes. Scroll smoothly to walk through all four campus wings from the Main Gate to the Belvedere overlook, or click any framed campus photograph to inspect its story and jump straight into the community.',
  },
  {
    num: '03',
    q: 'How do I find friends from my specific batch or bus route?',
    a: 'Visit the Alumni Directory after signing in to search by name, graduation year, city, or profession and reconnect one-on-one.',
  },
  {
    num: '04',
    q: 'Are there batch-specific and interest-based chats?',
    a: 'GVConnect includes real-time group chat channels where alumni share reunion updates, campus throwback photos, and career referrals.',
  },
  {
    num: '05',
    q: 'Is GVConnect open to alumni living outside India?',
    a: 'Absolutely. Grizzlians across cities in India and abroad use GVConnect to keep in touch with Telaiya Dam roots and local alumni chapters.',
  },
];

export function LandingPage() {
  const focus = useExhibitionStore((s) => s.focus);
  const bench = useExhibitionStore((s) => s.bench);
  const webglSupported = useExhibitionStore((s) => s.webglSupported);

  const location = useLocation();
  const navigate = useNavigate();
  const communityRef = useRef<HTMLElement>(null);
  const [inGallery, setInGallery] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Reset gallery state on entry & cleanup on leave
  useEffect(() => {
    const prevRestoration =
      typeof window !== 'undefined' && 'scrollRestoration' in window.history
        ? window.history.scrollRestoration
        : null;
    if (prevRestoration !== null) {
      window.history.scrollRestoration = 'manual';
    }

    const targetSection = (location.state as { scrollToSection?: string } | null)?.scrollToSection;
    resetExhibitionStore();
    if (targetSection) {
      setExhibitionState({ phase: 'gallery' });
      document.documentElement.style.overflow = '';
      const timer = window.setTimeout(() => {
        document.getElementById(targetSection)?.scrollIntoView({ behavior: 'smooth' });
        navigate('.', { replace: true, state: null });
      }, 120);
      return () => {
        window.clearTimeout(timer);
        document.documentElement.style.overflow = '';
        if (prevRestoration !== null) {
          window.history.scrollRestoration = prevRestoration;
        }
        resetExhibitionStore();
      };
    }

    window.scrollTo({ top: 0, behavior: 'auto' });
    return () => {
      document.documentElement.style.overflow = '';
      if (prevRestoration !== null) {
        window.history.scrollRestoration = prevRestoration;
      }
      resetExhibitionStore();
    };
  }, [location.state, navigate]);

  // Lock scroll only while actively inspecting a zoomed exhibit or bench overlook
  useEffect(() => {
    const locked = Boolean(focus) || bench;
    document.documentElement.style.overflow = locked ? 'hidden' : '';
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [focus, bench]);

  // Sync window.scrollY -> Three.js camera spline target (rAF-throttled like techkriti.org)
  useEffect(() => {
    if (!webglSupported) {
      setInGallery(false);
      return;
    }

    let ticking = false;
    let rafId = 0;

    const updateScroll = () => {
      ticking = false;
      const maxScroll = getMaxScrollDistance();
      const raw = window.scrollY / maxScroll;
      motionRefs.target = Math.min(1, Math.max(0, raw));

      const commEl = communityRef.current;
      if (commEl) {
        const rect = commEl.getBoundingClientRect();
        motionRefs.scrolledPastGallery = rect.top <= 0;
        setInGallery(rect.top > window.innerHeight * 0.65);
      } else {
        motionRefs.scrolledPastGallery = false;
        setInGallery(true);
      }
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        rafId = requestAnimationFrame(updateScroll);
      }
    };

    updateScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updateScroll);
    };
  }, [webglSupported]);

  const jumpToCommunity = () => {
    communityRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#120409] text-white selection:bg-[#d4af37] selection:text-[#1c040b]">
      <Navbar variant="exhibition" />

      {webglSupported ? (
        <>
          <AlumniCanvas3D />
          <ExhibitionLoader />
          <HeroCurtain />
          <ExhibitionCursor />
          <RoomHudAndChapters
            inGallery={inGallery}
            onJumpCommunity={jumpToCommunity}
          />
          <FloatingInviteCTA inGallery={inGallery} />
          <ExhibitDetailModal />
          <BenchModal />

          {/* Virtual Museum Scroll Track (Techkriti-matched deliberate walk speed) */}
          <div
            ref={(el) => {
              scrollTrackRef.el = el;
            }}
            className="relative z-10 pointer-events-none"
            style={{ height: `calc(${computeTrackHeightPx(TOTAL_PATH_WEIGHT)}px + 100svh)` }}
          >
            {/* Screen-reader & keyboard accessible index of exhibits */}
            <div className="sr-only">
              <h2>Grizzly Vidyalaya Virtual Alumni Exhibition</h2>
              <ul>
                {EXHIBITS.map((ex) => (
                  <li key={ex.id}>
                    <button
                      type="button"
                      onClick={() => scrollToProgress(progressForExhibit(ex.id))}
                    >
                      {ex.title} — {ex.subtitle}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      ) : (
        <WebGLFallbackShowcase onJumpCommunity={jumpToCommunity} />
      )}

      {/* Post-Exhibition Community Section */}
      <section
        id="community"
        ref={communityRef}
        className="relative z-20 border-t border-[#d4af37]/25 bg-[#120409] px-4 py-24 sm:px-6 lg:px-8"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-40"
          style={{
            background:
              'radial-gradient(ellipse at top, rgba(128, 0, 32, 0.55), transparent 70%)',
          }}
        />

        <div className="relative max-w-7xl mx-auto">
          {/* Header */}
          <div className="max-w-3xl">
            <p className="text-xs font-mono-tabular uppercase tracking-[0.32em] text-[#ffcf8a]">
              Beyond the Exhibition
            </p>
            <h2 className="font-display mt-3 text-3xl sm:text-5xl font-bold text-white">
              Connect, Share &amp; Grow Together
            </h2>
            <p className="mt-4 text-base sm:text-lg text-white/70 leading-relaxed">
              The nostalgia of Telaiya Dam lives on through the people you walked
              those corridors with. Step into the active GVConnect network.
            </p>
          </div>

          {/* 3 Feature Pillars */}
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {COMMUNITY_PILLARS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-[#1a060e]/85 p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[#d4af37]/45"
                >
                  <div>
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[#d4af37]/30 bg-[#800020]/30 text-[#ffcf8a]">
                      <Icon className="h-6 w-6" />
                    </div>
                    <p className="mt-5 text-[11px] font-mono-tabular uppercase tracking-[0.26em] text-[#ffcf8a]/80">
                      {item.kicker}
                    </p>
                    <h3 className="font-display mt-1.5 text-2xl font-bold text-white">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-white/70">
                      {item.description}
                    </p>
                  </div>

                  <Link
                    to={item.href}
                    className="mt-7 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#ffcf8a] hover:text-white transition-colors"
                  >
                    {item.cta}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Heritage Spotlight Split (Distinct Campus Archives) */}
          <div className="mt-24 grid items-center gap-12 lg:grid-cols-12">
            <div className="lg:col-span-6 relative">
              <div className="overflow-hidden rounded-2xl border border-[#d4af37]/30 bg-[#1a060e] p-2 shadow-2xl">
                <img
                  src="/campus/campus-robotics-workshop.png"
                  alt="Grizzly Vidyalaya Robotics & Mentorship Session"
                  className="aspect-[16/10] w-full rounded-xl object-cover"
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="mt-4 sm:mt-0 sm:absolute sm:-bottom-8 sm:-right-6 sm:w-56 overflow-hidden rounded-xl border border-[#d4af37]/40 bg-[#120409] p-1.5 shadow-2xl">
                <img
                  src="/campus/campus-gallery-3.jpg"
                  alt="Students in Winter Blazers Exploring the Globe"
                  className="aspect-[16/10] w-full rounded-lg object-cover"
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            <div className="lg:col-span-6 lg:pl-6">
              <p className="text-xs font-mono-tabular uppercase tracking-[0.3em] text-[#ffcf8a]">
                Grizzly Vidyalya Brotherhood
              </p>
              <h3 className="font-display mt-3 text-3xl sm:text-4xl font-bold text-white">
                Why Join GVConnect?
              </h3>
              <ul className="mt-6 space-y-4">
                {WHY_JOIN_POINTS.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#d4af37]" />
                    <span className="text-base text-white/80">{point}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap items-center gap-5">
                <MagneticButton
                  tone="amber"
                  label="Create Alumni Profile"
                  to="/auth?mode=signup"
                />
                {webglSupported && (
                  <button
                    type="button"
                    onClick={() => scrollToProgress(0)}
                    className="text-xs font-semibold uppercase tracking-[0.2em] text-white/65 hover:text-[#ffcf8a] transition-colors cursor-pointer"
                  >
                    ↑ Revisit Campus I
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Techkriti-Style Frosted FAQ Accordion */}
          <div id="faq" className="mt-28 pt-16 border-t border-white/10">
            <div className="grid gap-10 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <p className="text-xs font-mono-tabular uppercase tracking-[0.3em] text-[#ffcf8a]">
                  Questions
                </p>
                <h3 className="font-display mt-2 text-3xl font-bold text-white">
                  Frequently Asked
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-white/65">
                  Everything you need to know about joining GVConnect and walking
                  the interactive alumni gallery.
                </p>
              </div>

              <div className="lg:col-span-8 space-y-3">
                {FAQ_ITEMS.map((item, idx) => {
                  const isOpen = openFaq === idx;
                  return (
                    <div
                      key={item.num}
                      className="rounded-xl border border-white/10 bg-[#19060d]/95 transition-colors hover:border-[#d4af37]/35"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaq(isOpen ? null : idx)}
                        aria-expanded={isOpen}
                        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <span className="font-mono-tabular text-xs text-[#ffcf8a]/80">
                            {item.num}
                          </span>
                          <span className="text-sm sm:text-base font-semibold text-white">
                            {item.q}
                          </span>
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 text-[#ffcf8a] transition-transform duration-300 ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <div className="border-t border-white/10 px-6 pb-5 pt-3 text-sm leading-relaxed text-white/75 pl-14">
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-20 border-t border-white/10 bg-[#0b0205] px-4 py-14 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid gap-10 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3">
                <img
                  src="/gvlogo.png"
                  alt="GVConnect Logo"
                  className="h-12 w-12 object-contain"
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h4 className="font-display text-xl font-bold text-[#ffcf8a]">
                    GVConnect
                  </h4>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                    Grizzly Vidyalya · Telaiya Dam, Koderma
                  </p>
                </div>
              </div>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-white/60">
                Connecting generations of Grizzlians across campuses, industries,
                and time zones—preserving our shared memories while building
                tomorrow’s alumni mentorship network.
              </p>
            </div>

            <div>
              <h5 className="text-xs font-mono-tabular uppercase tracking-[0.24em] text-[#ffcf8a]">
                Explore
              </h5>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li>
                  <Link
                    to="/directory"
                    className="text-white/70 hover:text-[#ffcf8a] transition-colors"
                  >
                    Alumni Directory
                  </Link>
                </li>
                <li>
                  <Link
                    to="/chat"
                    className="text-white/70 hover:text-[#ffcf8a] transition-colors"
                  >
                    Group Chat
                  </Link>
                </li>
                <li>
                  <Link
                    to="/dashboard"
                    className="text-white/70 hover:text-[#ffcf8a] transition-colors"
                  >
                    Member Dashboard
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h5 className="text-xs font-mono-tabular uppercase tracking-[0.24em] text-[#ffcf8a]">
                Account &amp; Support
              </h5>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li>
                  <Link
                    to="/auth?mode=signup"
                    className="text-white/70 hover:text-[#ffcf8a] transition-colors"
                  >
                    Join Network
                  </Link>
                </li>
                <li>
                  <Link
                    to="/auth?mode=login"
                    className="text-white/70 hover:text-[#ffcf8a] transition-colors"
                  >
                    Sign In
                  </Link>
                </li>
                <li>
                  <a
                    href="mailto:info@gvconnect.com"
                    className="text-white/70 hover:text-[#ffcf8a] transition-colors"
                  >
                    info@gvconnect.com
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/45">
            <p>© 2026 GVConnect · Grizzly Vidyalya Alumni Association</p>
            <p>Telaiya Dam, Koderma, Jharkhand</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
