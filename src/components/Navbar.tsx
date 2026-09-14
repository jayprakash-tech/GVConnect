import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Directory', path: '/directory' },
    { name: 'Events', path: '/events' },
    { name: 'About', path: '/about' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-gradient-to-r from-maroon-800 to-maroon-900 shadow-lg'
          : 'bg-gradient-to-r from-maroon-800 to-maroon-900'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src="/gvlogo.png"
              alt="GVConnect Logo"
              className="h-[60px] w-auto rounded-full border-2 border-gold-500/50 group-hover:border-gold-500 transition-all duration-300"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="flex flex-col">
              <span className="text-gold-500 font-serif text-2xl font-bold tracking-wide group-hover:text-gold-400 transition-colors">
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
                    ? 'text-gold-500'
                    : 'text-white/90 hover:text-gold-400'
                }`}
              >
                {link.name}
                {location.pathname === link.path && (
                  <motion.div
                    layoutId="navbar-indicator"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gold-500 rounded-full"
                  />
                )}
              </Link>
            ))}
            <div className="flex items-center gap-3">
              <Link
                to="/auth"
                className="px-5 py-2 text-sm font-semibold text-gold-500 border-2 border-gold-500 rounded-full hover:bg-gold-500 hover:text-maroon-800 transition-all duration-300"
              >
                Login
              </Link>
              <Link
                to="/auth"
                className="px-5 py-2 text-sm font-semibold bg-gold-500 text-maroon-800 rounded-full hover:bg-gold-400 transition-all duration-300 shadow-md hover:shadow-lg"
              >
                Sign Up
              </Link>
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-gold-500 hover:text-gold-300 transition-colors"
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
                        ? 'bg-gold-500/20 text-gold-500'
                        : 'text-white/90 hover:bg-white/10 hover:text-gold-400'
                    }`}
                  >
                    {link.name}
                  </Link>
                ))}
                <div className="flex flex-col gap-2 mt-2 px-4">
                  <Link
                    to="/auth"
                    onClick={() => setIsOpen(false)}
                    className="px-5 py-3 text-sm font-semibold text-gold-500 border-2 border-gold-500 rounded-full text-center hover:bg-gold-500 hover:text-maroon-800 transition-all"
                  >
                    Login
                  </Link>
                  <Link
                    to="/auth"
                    onClick={() => setIsOpen(false)}
                    className="px-5 py-3 text-sm font-semibold bg-gold-500 text-maroon-800 rounded-full text-center hover:bg-gold-400 transition-all"
                  >
                    Sign Up
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
