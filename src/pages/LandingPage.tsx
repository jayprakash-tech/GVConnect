import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Navbar } from '../components/Navbar';
import { ArrowRight, Users, MessageCircle, Calendar, CheckCircle } from 'lucide-react';

export function LandingPage() {
  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 },
  };

  const galleryImages = [
    { src: '/gate.png', title: 'The Gateway to Memories', size: 'large' },
    { src: '/mess.png', title: 'Cafeteria Days', size: 'medium' },
    { src: '/bus.png', title: 'Bus Rides Home', size: 'medium' },
    { src: '/innerview.png', title: 'Our Beautiful Campus', size: 'large' },
    { src: '/prayer.png', title: 'Morning Prayers', size: 'full' },
  ];

  const features = [
    {
      icon: Users,
      title: 'Alumni Directory',
      description: 'Find and connect with batchmates from your year and across batches. Search by name, batch, or class.',
    },
    {
      icon: MessageCircle,
      title: 'Group Chat & Forums',
      description: 'Real-time conversations, batch-specific groups, and discussion forums to stay connected.',
    },
    {
      icon: Calendar,
      title: 'Events & Reunions',
      description: 'Stay updated with alumni meets, reunions, school events, and important announcements.',
    },
  ];

  const whyJoinPoints = [
    'Reconnect with old friends',
    'Share your career journey',
    'Mentor current students',
    'Attend exclusive alumni events',
    'Access job opportunities',
    'Stay updated with school news',
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <img
          src="/innerview.png"
          alt="Grizzly Vidyalya Campus"
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
          decoding="async"
          onError={(e) => {
            e.currentTarget.src = 'image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"%3E%3Crect fill="%23800020" width="1920" height="1080"/%3E%3C/svg%3E';
          }}
        />
        
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-maroon-800/60" />

        {/* Content */}
        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl md:text-6xl font-serif font-bold text-gold-500 mb-6 leading-tight"
            style={{ fontWeight: 700 }}
          >
            Welcome Home, Grizzlian!
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl text-white mb-10 leading-relaxed max-w-3xl mx-auto"
          >
            Join thousands of Grizzly Vidyalya alumni reconnecting with their roots
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              to="/auth"
              className="px-10 py-4 bg-gold-500 text-maroon-800 rounded-full font-bold text-lg hover:bg-gold-400 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 group inline-flex items-center justify-center gap-3"
            >
              Join the Community
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/directory"
              className="px-10 py-4 border-2 border-gold-500 text-white rounded-full font-bold text-lg hover:bg-gold-500 hover:text-maroon-800 transition-all duration-300 inline-flex items-center justify-center"
            >
              Explore Directory
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Nostalgia Gallery Section */}
      <section className="py-20 px-4 bg-white" style={{ marginTop: '80px' }}>
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-maroon-800 mb-4">
              Relive the Memories
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Every corner holds a memory, every moment tells a story
            </p>
          </motion.div>

          {/* Masonry Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {galleryImages.map((image, index) => (
              <motion.div
                key={index}
                {...fadeInUp}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`relative group overflow-hidden rounded-lg shadow-md ${
                  image.size === 'full' ? 'col-span-2 md:col-span-4' : ''
                } ${image.size === 'large' ? 'col-span-2 row-span-2' : ''}`}
              >
                <img
                  src={image.src}
                  alt={image.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  style={{ minHeight: image.size === 'large' ? '400px' : '200px' }}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    e.currentTarget.src = `image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect fill='%23800020' width='800' height='600'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='serif' font-size='24' fill='%23D4AF37'%3E${image.title}%3C/text%3E%3C/svg%3E`;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-maroon-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                  <h3 className="text-gold-500 text-xl font-serif font-bold">
                    {image.title}
                  </h3>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4" style={{ backgroundColor: '#fff5f7' }}>
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-maroon-800 mb-4">
              Connect, Share, Grow
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                {...fadeInUp}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white rounded-lg p-8 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group border-t-4 border-gold-500"
                style={{ boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
              >
                <feature.icon className="w-12 h-12 text-gold-500 mb-6 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="text-xl font-serif font-bold text-maroon-800 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Join Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-maroon-800 mb-4">
              Why Join GVConnect?
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Image */}
            <motion.div {...fadeInUp} className="relative">
              <img
                src="/prayer.png"
                alt="Morning Prayers at Grizzly Vidyalya"
                className="w-full rounded-lg shadow-lg"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  e.currentTarget.src = 'image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600"%3E%3Crect fill="%23800020" width="800" height="600"/%3E%3C/svg%3E';
                }}
              />
            </motion.div>

            {/* Points */}
            <motion.div {...fadeInUp} className="space-y-4">
              {whyJoinPoints.map((point, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <CheckCircle className="w-6 h-6 text-gold-500 flex-shrink-0 mt-0.5" />
                  <p className="text-lg text-gray-700">{point}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 px-4 bg-maroon-800">
        <motion.div {...fadeInUp} className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-gold-500 mb-6">
            Ready to Reconnect?
          </h2>
          <p className="text-xl text-white mb-10 max-w-2xl mx-auto">
            Join thousands of Grizzlian alumni today
          </p>
          <Link
            to="/auth"
            className="inline-flex items-center gap-3 px-12 py-5 bg-gold-500 text-maroon-800 rounded-full font-bold text-lg hover:bg-gold-400 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 group"
          >
            Create Free Account
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-4" style={{ backgroundColor: '#600018' }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            {/* Column 1: Logo & Description */}
            <div className="md:col-span-1">
              <img
                src="/gvlogo.png"
                alt="GVConnect Logo"
                className="h-[60px] w-auto mb-4"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <p className="text-white/70 leading-relaxed text-sm">
                Reconnecting Grizzly Vidyalya alumni worldwide
              </p>
            </div>

            {/* Column 2: Quick Links */}
            <div>
              <h4 className="text-gold-500 font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><Link to="/" className="text-white/70 hover:text-gold-400 transition-colors text-sm">Home</Link></li>
                <li><Link to="/directory" className="text-white/70 hover:text-gold-400 transition-colors text-sm">Directory</Link></li>
                <li><Link to="/events" className="text-white/70 hover:text-gold-400 transition-colors text-sm">Events</Link></li>
                <li><Link to="/about" className="text-white/70 hover:text-gold-400 transition-colors text-sm">About</Link></li>
              </ul>
            </div>

            {/* Column 3: Features */}
            <div>
              <h4 className="text-gold-500 font-semibold mb-4">Features</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-white/70 hover:text-gold-400 transition-colors text-sm">Group Chat</a></li>
                <li><a href="#" className="text-white/70 hover:text-gold-400 transition-colors text-sm">Alumni Directory</a></li>
                <li><a href="#" className="text-white/70 hover:text-gold-400 transition-colors text-sm">Events</a></li>
                <li><a href="#" className="text-white/70 hover:text-gold-400 transition-colors text-sm">News & Updates</a></li>
              </ul>
            </div>

            {/* Column 4: Contact */}
            <div>
              <h4 className="text-gold-500 font-semibold mb-4">Contact</h4>
              <ul className="space-y-2">
                <li><a href="mailto:info@gvconnect.com" className="text-white/70 hover:text-gold-400 transition-colors text-sm">info@gvconnect.com</a></li>
                <li><a href="#" className="text-white/70 hover:text-gold-400 transition-colors text-sm">Facebook</a></li>
                <li><a href="#" className="text-white/70 hover:text-gold-400 transition-colors text-sm">Instagram</a></li>
                <li><a href="#" className="text-white/70 hover:text-gold-400 transition-colors text-sm">LinkedIn</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 text-center">
            <p className="text-white/60 text-sm">
              © 2026 GVConnect. Made with ❤️ for Grizzly Vidyalya
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
