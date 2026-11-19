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

  // Fetch user profile when user is logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      getUserProfile(user.id).then((data) => {
        if (data) setUserProfile(data);
      });
    } else {
      setUserProfile(null);
    }
  }, [isAuthenticated, user]);

  // Get user initials
  const getUserInitials = () => {
    if (!userProfile?.full_name) return 'U';
    const names = userProfile.full_name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return names[0][0].toUpperCase();
  };

  const scrollToSection = (sectionId: string) => {
    setIsOpen(false);
    if (location.pathname !== '/') {
      navigate('/');
      window.setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
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

  if (isExhibition) {
    return (
      <header className="fixed inset-x-0 top-0 z-50 pointer-events-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2 flex items-center justify-between gap-4">
          {/* Zone 1: Brand Wordmark */}
          <Link
            to="/"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="pointer-events-auto inline-flex items-center gap-2.5 rounded-full bg-[#14040a]/65 backdrop-blur-xl border border-white/15 px-3.5 py-1.5 shadow-lg whitespace-nowrap shrink-0 group"
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
            <span className="font-display text-base font-bold tracking-wider text-[#ffcf8a]">
              GVConnect
            </span>
          </Link>

          {/* Zone 2: Center Frosted Navigation Capsule */}
          <nav
            aria-label="Primary"
            className="pointer-events-auto hidden md:flex items-center gap-1 rounded-full border border-white/15 bg-[#14040a]/65 px-2 py-1.5 backdrop-blur-xl shadow-lg"
          >
            {navLinks.map((link) => {
              const active = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => {
                    if (link.path === '/') {
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
          <div className="pointer-events-auto hidden md:flex items-center gap-2 shrink-0">
            {isAuthenticated ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="flex items-center gap-2 rounded-full border border-white/15 bg-[#14040a]/75 px-3 py-1.5 backdrop-blur-xl hover:border-[#d4af37]/50 transition-all cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-[#d4af37] flex items-center justify-center text-[#1c040b] font-bold text-xs">
                    {getUserInitials()}
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-[#ffcf8a]" />
                </button>

                <AnimatePresence>
                  {showProfileDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute right-0 top-full mt-2 w-60 rounded-xl border border-white/15 bg-[#14040a]/95 backdrop-blur-xl shadow-2xl overflow-hidden text-white"
                    >
                      <div className="p-4 border-b border-white/10">
                        <p className="font-semibold text-white text-sm">
                          {userProfile?.full_name || 'Grizzlian'}
                        </p>
                        <p className="text-xs text-white/60">
                          Batch of {userProfile?.batch || 'Alumni'}
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
              <Link
                to="/auth?mode=signup"
                className="rounded-full border border-[#d4af37]/50 bg-[#d4af37] px-5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#1c040b] hover:bg-[#ffcf8a] transition-colors shadow-lg whitespace-nowrap shrink-0"
              >
                Join Alumni
              </Link>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="pointer-events-auto md:hidden rounded-full border border-white/15 bg-[#14040a]/75 p-2 text-[#ffcf8a] backdrop-blur-xl"
            aria-label="Toggle menu"
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
              className="pointer-events-auto md:hidden mx-4 mt-1 rounded-2xl border border-white/15 bg-[#14040a]/95 p-4 backdrop-blur-xl shadow-2xl"
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

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-[#800020] shadow-lg' : 'bg-[#800020]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo - Clean, no modifications */}
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <img
              src="/gvlogo.png"
              alt="GVConnect Logo"
              className="h-[60px] w-auto group-hover:opacity-90 transition-opacity"
              loading="eager"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="flex flex-col">
              <span className="text-[#D4AF37] font-serif text-2xl font-bold tracking-wide">
                GVConnect
              </span>
              <span className="text-white/60 text-xs">Grizzly Vidyalya Alumni</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-medium transition-all duration-300 relative whitespace-nowrap shrink-0 ${
                  location.pathname === link.path
                    ? 'text-[#D4AF37]'
                    : 'text-white hover:text-[#D4AF37]'
                }`}
              >
                {link.name}
                {location.pathname === link.path && (
                  <motion.div
                    layoutId="navbar-indicator"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#D4AF37] rounded-full"
                  />
                )}
              </Link>
            ))}
            {/* Authentication Section */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-white/10 transition-all duration-300"
                >
                  <div className="w-9 h-9 rounded-full bg-[#D4AF37] flex items-center justify-center text-[#800020] font-bold text-sm">
                    {getUserInitials()}
                  </div>
                  <ChevronDown className="w-4 h-4 text-[#D4AF37]" />
                </button>

                <AnimatePresence>
                  {showProfileDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden"
                    >
                      <div className="p-4 border-b border-gray-100">
                        <p className="font-semibold text-gray-900">
                          {userProfile?.full_name || 'User'}
                        </p>
                        <p className="text-sm text-gray-500">
                          Batch of {userProfile?.batch || 'N/A'}
                        </p>
                      </div>
                      <div className="p-2">
                        <Link
                          to="/dashboard"
                          onClick={() => setShowProfileDropdown(false)}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                        >
                          <User className="w-4 h-4" />
                          Dashboard
                        </Link>
                        <button
                          onClick={async () => {
                            await signOut();
                            setShowProfileDropdown(false);
                            navigate('/');
                          }}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors w-full text-left"
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
              <div className="flex items-center gap-3">
                <Link
                  to="/auth?mode=login"
                  className="px-5 py-2 text-sm font-semibold text-[#D4AF37] border-2 border-[#D4AF37] rounded-full hover:bg-[#D4AF37] hover:text-[#800020] transition-all duration-300 whitespace-nowrap shrink-0"
                >
                  Login
                </Link>
                <Link
                  to="/auth?mode=signup"
                  className="px-5 py-2 text-sm font-semibold bg-[#D4AF37] text-[#800020] rounded-full hover:bg-[#e6c65c] transition-all duration-300 shadow-md hover:shadow-lg whitespace-nowrap shrink-0"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-[#D4AF37] hover:text-[#e6c65c] transition-colors"
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden overflow-hidden"
            >
              <div className="flex flex-col gap-2 pb-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsOpen(false)}
                    className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      location.pathname === link.path
                        ? 'bg-[#D4AF37]/20 text-[#D4AF37]'
                        : 'text-white hover:bg-white/10 hover:text-[#D4AF37]'
                    }`}
                  >
                    {link.name}
                  </Link>
                ))}
                <div className="flex flex-col gap-2 mt-2 px-4">
                  {isAuthenticated ? (
                    <>
                      <Link
                        to="/dashboard"
                        onClick={() => setIsOpen(false)}
                        className="px-5 py-3 text-sm font-semibold text-[#D4AF37] border-2 border-[#D4AF37] rounded-full text-center hover:bg-[#D4AF37] hover:text-[#800020] transition-all"
                      >
                        Dashboard
                      </Link>
                      <button
                        onClick={async () => {
                          await signOut();
                          setIsOpen(false);
                          navigate('/');
                        }}
                        className="px-5 py-3 text-sm font-semibold bg-red-500 text-white rounded-full text-center hover:bg-red-600 transition-all"
                      >
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/auth?mode=login"
                        onClick={() => setIsOpen(false)}
                        className="px-5 py-3 text-sm font-semibold text-[#D4AF37] border-2 border-[#D4AF37] rounded-full text-center hover:bg-[#D4AF37] hover:text-[#800020] transition-all"
                      >
                        Login
                      </Link>
                      <Link
                        to="/auth?mode=signup"
                        onClick={() => setIsOpen(false)}
                        className="px-5 py-3 text-sm font-semibold bg-[#D4AF37] text-[#800020] rounded-full text-center hover:bg-[#e6c65c] transition-all"
                      >
                        Sign Up
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
