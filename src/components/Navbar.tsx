import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogOut, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { getUserProfile, UserProfile } from '../services/authService';

interface NavbarProps {
  variant?: 'default' | 'exhibition';
}

export function Navbar({ variant = 'default' }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, deviceVerified, signOut } = useAuth();
  const isAuthenticated = Boolean(user && user.email_verified && deviceVerified);
  const isExhibition = variant === 'exhibition';

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setShowProfileDropdown(false);
    setIsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (isAuthenticated && user) {
      getUserProfile(user.id).then((data) => {
        if (data) setUserProfile(data);
      });
    } else {
      setUserProfile(null);
    }
  }, [isAuthenticated, user]);

  const getUserInitials = () => {
    if (!userProfile?.full_name) {
      return (user?.username?.[0] || user?.email?.[0] || 'G').toUpperCase();
    }
    const names = userProfile.full_name.trim().split(/\s+/);
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return names[0][0].toUpperCase();
  };

  const scrollToSection = (sectionId: string) => {
    setIsOpen(false);
    if (location.pathname !== '/') {
      navigate('/', { state: { scrollToSection: sectionId } });
      return;
    }
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Directory', path: '/directory' },
    { name: 'Chat', path: '/chat' },
  ];

  const sectionLinks = [
    { name: 'Community', sectionId: 'community' },
    { name: 'FAQ', sectionId: 'faq' },
  ];

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-200 ${
        isExhibition
          ? 'pointer-events-none'
          : scrolled
            ? 'bg-[#120409]/95 border-b border-white/12 shadow-[0_8px_30px_rgba(0,0,0,0.45)]'
            : 'bg-[#120409]/85 border-b border-white/10'
      }`}
    >
      <div
        className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-6 ${
          isExhibition ? 'pt-4 pb-2' : 'h-20'
        }`}
      >
        {/* Zone 1: Brand Wordmark */}
        <Link
          to="/"
          onClick={() => {
            if (location.pathname === '/') {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          className={`pointer-events-auto inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 group ${
            isExhibition
              ? 'rounded-full bg-[#14040a]/90 border border-white/15 px-3.5 py-1.5 shadow-lg'
              : ''
          }`}
        >
          <img
            src="/gvlogo.png"
            alt="GVConnect Logo"
            className="h-8 w-8 object-contain group-hover:opacity-90 transition-opacity"
            loading="eager"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <span className="font-display text-base sm:text-lg font-bold tracking-wider text-[#ffcf8a]">
            GVConnect
          </span>
        </Link>

        {/* Zone 2: Center Navigation */}
        <nav
          aria-label="Primary"
          className={`pointer-events-auto hidden md:flex items-center gap-1 ${
            isExhibition
              ? 'rounded-full border border-white/15 bg-[#14040a]/90 px-2 py-1.5 shadow-lg'
              : 'gap-2'
          }`}
        >
          {navLinks.map((link) => {
            const active = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => {
                  if (link.path === '/' && location.pathname === '/') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className={`rounded-full px-4 py-1.5 text-xs font-medium tracking-wide transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#d4af37]/20 text-[#ffcf8a]'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
          {sectionLinks.map((item) => (
            <button
              key={item.sectionId}
              type="button"
              onClick={() => scrollToSection(item.sectionId)}
              className="rounded-full px-4 py-1.5 text-xs font-medium tracking-wide text-white/80 hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {item.name}
            </button>
          ))}
        </nav>

        {/* Zone 3: Primary CTA / Profile Menu */}
        <div className="pointer-events-auto hidden md:flex items-center gap-3 shrink-0">
          {isAuthenticated ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowProfileDropdown((prev) => !prev)}
                aria-expanded={showProfileDropdown}
                aria-label="Account menu"
                className="flex items-center gap-2 rounded-full border border-white/15 bg-[#14040a]/90 px-3 py-1.5 hover:border-[#d4af37]/50 transition-all cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-[#d4af37] flex items-center justify-center text-[#1c040b] font-bold text-xs overflow-hidden">
                  {userProfile?.avatar_url ? (
                    <img
                      src={userProfile.avatar_url}
                      alt={userProfile.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getUserInitials()
                  )}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#ffcf8a]" />
              </button>

              <AnimatePresence>
                {showProfileDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute right-0 top-full mt-2 w-60 rounded-xl border border-white/15 bg-[#14040a]/95 backdrop-blur-md shadow-2xl overflow-hidden text-white"
                  >
                    <div className="p-4 border-b border-white/10">
                      <p className="font-semibold text-white text-sm truncate">
                        {userProfile?.full_name || user?.username || 'Alumni Member'}
                      </p>
                      <p className="text-xs text-white/60 font-mono-tabular mt-0.5">
                        {userProfile?.batch ? `Batch of ${userProfile.batch}` : 'Verified Member'}
                      </p>
                    </div>
                    <div className="p-2">
                      <Link
                        to="/dashboard"
                        onClick={() => setShowProfileDropdown(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs text-white/85 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <User className="w-4 h-4 text-[#ffcf8a]" />
                        Dashboard
                      </Link>
                      <button
                        type="button"
                        onClick={async () => {
                          await signOut();
                          setShowProfileDropdown(false);
                          navigate('/');
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-xs text-red-300 hover:bg-red-500/15 rounded-lg transition-colors w-full text-left cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link
                to="/auth?mode=login"
                className="rounded-full border border-white/15 bg-[#14040a]/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#ffcf8a] hover:border-[#d4af37]/60 hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                Login
              </Link>
              <Link
                to="/auth?mode=signup"
                className="rounded-full border border-[#d4af37]/50 bg-[#d4af37] px-5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#1c040b] hover:bg-[#ffcf8a] transition-colors shadow-lg whitespace-nowrap shrink-0"
              >
                Join Alumni
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="pointer-events-auto md:hidden rounded-full border border-white/15 bg-[#14040a]/90 p-2 text-[#ffcf8a] cursor-pointer"
          aria-label="Toggle menu"
          aria-expanded={isOpen}
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Dropdown Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="pointer-events-auto md:hidden mx-4 mt-1 mb-3 rounded-2xl border border-white/15 bg-[#14040a]/95 p-4 backdrop-blur-xl shadow-2xl"
          >
            <div className="flex flex-col gap-1.5">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                    location.pathname === link.path
                      ? 'bg-[#d4af37]/20 text-[#ffcf8a]'
                      : 'text-white/85 hover:bg-white/10'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
              {sectionLinks.map((item) => (
                <button
                  key={item.sectionId}
                  type="button"
                  onClick={() => scrollToSection(item.sectionId)}
                  className="rounded-xl px-4 py-2.5 text-left text-sm font-medium text-white/85 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  {item.name}
                </button>
              ))}
              <div className="mt-2 pt-2 border-t border-white/10 flex flex-col gap-2">
                {isAuthenticated ? (
                  <>
                    <Link
                      to="/dashboard"
                      onClick={() => setIsOpen(false)}
                      className="rounded-full border border-[#d4af37] px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-[#ffcf8a]"
                    >
                      Dashboard
                    </Link>
                    <button
                      type="button"
                      onClick={async () => {
                        await signOut();
                        setIsOpen(false);
                        navigate('/');
                      }}
                      className="rounded-full bg-red-600/80 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-white cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/auth?mode=login"
                      onClick={() => setIsOpen(false)}
                      className="rounded-full border border-[#d4af37]/50 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-[#ffcf8a]"
                    >
                      Login
                    </Link>
                    <Link
                      to="/auth?mode=signup"
                      onClick={() => setIsOpen(false)}
                      className="rounded-full bg-[#d4af37] px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-[#1c040b]"
                    >
                      Join Alumni
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
