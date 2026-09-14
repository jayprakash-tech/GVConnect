import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'Events', path: '/events' },
    { name: 'Gallery', path: '/gallery' },
  ];

  return (
    <nav className="bg-maroon-800 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src="/gvlogo.png"
              alt="GVConnect Logo"
              width={50}
              height={50}
              className="rounded-full border-2 border-gold-500 group-hover:border-gold-300 transition-all duration-300"
              onError={(e) => {
                // Fallback if logo not found
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="flex flex-col">
              <span className="text-gold-500 font-serif text-xl font-bold tracking-wide group-hover:text-gold-300 transition-colors">
                GVConnect
              </span>
              <span className="text-white/70 text-xs">Grizzly Vidyalya</span>
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
                  <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gold-500 rounded-full" />
                )}
              </Link>
            ))}
            <Link
              to="/auth"
              className="px-6 py-2 bg-gold-500 text-maroon-800 rounded-full font-semibold text-sm hover:bg-gold-400 transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105"
            >
              Join Community
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-gold-500 hover:text-gold-300 transition-colors"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden pb-4 animate-in slide-in-from-top duration-300">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    location.pathname === link.path
                      ? 'bg-gold-500/20 text-gold-500'
                      : 'text-white/90 hover:bg-white/10 hover:text-gold-400'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
              <Link
                to="/auth"
                onClick={() => setIsOpen(false)}
                className="mx-4 mt-2 px-6 py-2 bg-gold-500 text-maroon-800 rounded-full font-semibold text-sm text-center hover:bg-gold-400 transition-all"
              >
                Join Community
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
