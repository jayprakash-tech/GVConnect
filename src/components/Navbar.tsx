import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, User, LogOut, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase/client';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch user profile when user is logged in
  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, batch, class')
          .eq('id', user.id)
          .single();
        
        if (data && !error) {
          setUserProfile(data);
        }
      };
      fetchProfile();
    } else {
      setUserProfile(null);
    }
  }, [user]);

  // Get user initials
  const getUserInitials = () => {
    if (!userProfile?.full_name) return 'U';
    const names = userProfile.full_name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return names[0][0].toUpperCase();
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Directory', path: '/directory' },
    { name: 'Chat', path: '/chat' },
    { name: 'Events', path: '/events' },
    { name: 'About', path: '/about' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-[#800020] shadow-lg' : 'bg-[#800020]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo - Clean, no modifications */}
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src="/gvlogo.png"
              alt="GVConnect Logo"
              className="h-[60px] w-auto group-hover:opacity-90 transition-opacity"
              loading="eager"
              decoding="async"
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
                className={`text-sm font-medium transition-all duration-300 relative ${
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
            {user ? (
              // Logged in - Show user profile dropdown
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

                {/* Profile Dropdown */}
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
                            await supabase.auth.signOut();
                            setShowProfileDropdown(false);
                            window.location.href = '/';
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
              // Not logged in - Show Login/Sign Up buttons
              <div className="flex items-center gap-3">
                <Link
                  to="/auth"
                  className="px-5 py-2 text-sm font-semibold text-[#D4AF37] border-2 border-[#D4AF37] rounded-full hover:bg-[#D4AF37] hover:text-[#800020] transition-all duration-300"
                >
                  Login
                </Link>
                <Link
                  to="/auth"
                  className="px-5 py-2 text-sm font-semibold bg-[#D4AF37] text-[#800020] rounded-full hover:bg-[#e6c65c] transition-all duration-300 shadow-md hover:shadow-lg"
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
                  {user ? (
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
                          await supabase.auth.signOut();
                          setIsOpen(false);
                          window.location.href = '/';
                        }}
                        className="px-5 py-3 text-sm font-semibold bg-red-500 text-white rounded-full text-center hover:bg-red-600 transition-all"
                      >
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/auth"
                        onClick={() => setIsOpen(false)}
                        className="px-5 py-3 text-sm font-semibold text-[#D4AF37] border-2 border-[#D4AF37] rounded-full text-center hover:bg-[#D4AF37] hover:text-[#800020] transition-all"
                      >
                        Login
                      </Link>
                      <Link
                        to="/auth"
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
