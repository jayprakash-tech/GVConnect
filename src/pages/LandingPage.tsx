import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Navbar } from '../components/Navbar';
import { ArrowRight, Users, MessageCircle, Calendar, Quote } from 'lucide-react';

export function LandingPage() {
  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 },
  };

  const stats = [
    { number: '10,000+', label: 'Alumni' },
    { number: '50+', label: 'Batches' },
    { number: 'Active', label: 'Community' },
  ];

  const galleryImages = [
    { src: '/school-gate.jpg', title: 'The Gate', size: 'large' },
    { src: '/cafeteria.jpg', title: 'Cafeteria Days', size: 'medium' },
    { src: '/school-buses.jpg', title: 'Bus Rides', size: 'medium' },
    { src: '/school-building.jpg', title: 'Our Campus', size: 'large' },
    { src: '/assembly.jpg', title: 'Morning Assembly', size: 'full' },
  ];

  const features = [
    {
      icon: Users,
      title: 'Alumni Directory',
      description: 'Find and connect with batchmates from your year and across batches',
    },
    {
      icon: MessageCircle,
      title: 'Group Chat & Forums',
      description: 'Real-time conversations, batch groups, and discussion forums',
    },
    {
      icon: Calendar,
      title: 'Events & Reunions',
      description: 'Stay updated with alumni meets, reunions, and school events',
    },
  ];

  const testimonials = [
    {
      text: 'GVConnect helped me reconnect with friends I had not spoken to in 15 years. Amazing platform!',
      author: 'Rahul Sharma',
      batch: 'Batch of 2008',
    },
    {
      text: 'The directory made it so easy to find my old batchmates. Feels like coming home.',
      author: 'Priya Mehta',
      batch: 'Batch of 2012',
    },
    {
      text: 'Finally, a proper platform for Grizzly alumni. The group chat brings back so many memories!',
      author: 'Amit Patel',
      batch: 'Batch of 2010',
    },
  ];

  const recentActivity = [
    {
      type: 'post',
      title: 'Batch of 2015 Reunion Planned',
      date: 'March 15, 2026',
      image: '/assembly.jpg',
    },
    {
      type: 'event',
      title: 'Annual Alumni Meet 2026',
      date: 'April 20, 2026',
      image: '/school-building.jpg',
    },
    {
      type: 'announcement',
      title: 'New Batch Group Created: 2020',
      date: 'March 10, 2026',
      image: '/school-gate.jpg',
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <img
          src="/assembly.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
          decoding="async"
          onError={(e) => {
            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"%3E%3Crect fill="%23800020" width="1920" height="1080"/%3E%3C/svg%3E';
          }}
        />
        
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-maroon-800/70" />

        {/* Content */}
        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl md:text-7xl font-serif font-bold text-gold-500 mb-6 leading-tight"
          >
            Welcome Home, Grizzlian!
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl md:text-2xl text-white mb-8 leading-relaxed max-w-3xl mx-auto"
          >
            Join 10,000+ alumni reconnecting with their roots
          </motion.p>

          {/* Stats Row */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-wrap justify-center gap-8 md:gap-16 mb-12"
          >
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-gold-500 mb-1">
                  {stat.number}
                </div>
                <div className="text-white/80 text-sm md:text-base">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
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
              className="px-10 py-4 border-2 border-gold-500 text-gold-500 rounded-full font-bold text-lg hover:bg-gold-500 hover:text-maroon-800 transition-all duration-300 inline-flex items-center justify-center"
            >
              Explore Directory
            </Link>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="w-6 h-10 border-2 border-gold-500 rounded-full flex items-start justify-center p-2">
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1 h-2 bg-gold-500 rounded-full"
            />
          </div>
        </motion.div>
      </section>

      {/* Nostalgia Gallery Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-maroon-800 mb-4">
              Relive the Memories
            </h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              Take a walk down memory lane with photos from our beloved campus
            </p>
          </motion.div>

          {/* Masonry Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {galleryImages.map((image, index) => (
              <motion.div
                key={index}
                {...fadeInUp}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`relative group overflow-hidden rounded-xl ${
                  image.size === 'full' ? 'col-span-2 md:col-span-3' : ''
                } ${image.size === 'large' ? 'row-span-2' : ''}`}
              >
                <img
                  src={image.src}
                  alt={image.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  style={{ minHeight: image.size === 'large' ? '400px' : '200px' }}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    // Fallback to a simple colored placeholder
                    e.currentTarget.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400'%3E%3Crect fill='%23800020' width='600' height='400'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='serif' font-size='24' fill='%23D4AF37'%3E${image.title}%3C/text%3E%3C/svg%3E`;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-maroon-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                  <h3 className="text-white text-xl font-serif font-bold">
                    {image.title}
                  </h3>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-maroon-50 to-gold-50">
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-maroon-800 mb-4">
              What Awaits You
            </h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              Everything you need to stay connected with your Grizzly Vidyalya family
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                {...fadeInUp}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group border-t-4 border-gold-500"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-maroon-800 to-maroon-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-8 h-8 text-gold-500" />
                </div>
                <h3 className="text-xl font-serif font-bold text-maroon-800 mb-3">
                  {feature.title}
                </h3>
                <p className="text-neutral-600 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Activity Section */}
      <section className="py-20 px-4 bg-maroon-50/30">
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-maroon-800 mb-4">
              What's Happening
            </h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              Stay updated with the latest from your alumni community
            </p>
          </motion.div>

          <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory">
            {recentActivity.map((activity, index) => (
              <motion.div
                key={index}
                {...fadeInUp}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="flex-shrink-0 w-80 bg-white rounded-2xl shadow-lg overflow-hidden snap-start hover:shadow-xl transition-shadow"
              >
                <img
                  src={activity.image}
                  alt={activity.title}
                  className="w-full h-48 object-cover"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23800020" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="serif" font-size="20" fill="%23D4AF37"%3E' + activity.title + '%3C/text%3E%3C/svg%3E';
                  }}
                />
                <div className="p-6">
                  <div className="inline-block px-3 py-1 bg-gold-100 text-gold-700 text-xs font-semibold rounded-full mb-3 uppercase">
                    {activity.type}
                  </div>
                  <h3 className="text-lg font-serif font-bold text-maroon-800 mb-2">
                    {activity.title}
                  </h3>
                  <p className="text-neutral-500 text-sm">{activity.date}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-maroon-800 mb-4">
              Alumni Voices
            </h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              Hear from our community members about their experience
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                {...fadeInUp}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gradient-to-br from-maroon-50 to-gold-50 rounded-2xl p-8 relative"
              >
                <Quote className="w-12 h-12 text-gold-500/30 absolute top-6 right-6" />
                <p className="text-neutral-700 leading-relaxed mb-6 italic">
                  "{testimonial.text}"
                </p>
                <div className="border-t border-gold-500/20 pt-4">
                  <p className="font-serif font-bold text-maroon-800">
                    {testimonial.author}
                  </p>
                  <p className="text-neutral-500 text-sm">{testimonial.batch}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 px-4 bg-gradient-to-r from-maroon-800 to-maroon-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, #D4AF37 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }} />
        </div>
        
        <motion.div {...fadeInUp} className="relative z-10 max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-gold-500 mb-6">
            Ready to Reconnect?
          </h2>
          <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
            Join thousands of Grizzly alumni today
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
      <footer className="bg-maroon-900 text-white py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            {/* Column 1: Logo & Description */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <img
                  src="/gvlogo.png"
                  alt="GVConnect Logo"
                  className="h-12 w-auto rounded-full border-2 border-gold-500/50"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    // Fallback to text if logo fails
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      const text = document.createElement('div');
                      text.className = 'text-gold-500 font-serif text-2xl font-bold';
                      text.textContent = 'GV';
                      parent.insertBefore(text, e.currentTarget.nextSibling);
                    }
                  }}
                />
                <div>
                  <h3 className="text-gold-500 font-serif text-xl font-bold">GVConnect</h3>
                </div>
              </div>
              <p className="text-white/70 leading-relaxed">
                Reconnecting Grizzly Vidyalya alumni worldwide
              </p>
            </div>

            {/* Column 2: Quick Links */}
            <div>
              <h4 className="text-gold-500 font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><Link to="/" className="text-white/70 hover:text-gold-400 transition-colors">Home</Link></li>
                <li><Link to="/directory" className="text-white/70 hover:text-gold-400 transition-colors">Directory</Link></li>
                <li><Link to="/events" className="text-white/70 hover:text-gold-400 transition-colors">Events</Link></li>
                <li><Link to="/about" className="text-white/70 hover:text-gold-400 transition-colors">About</Link></li>
              </ul>
            </div>

            {/* Column 3: Features */}
            <div>
              <h4 className="text-gold-500 font-semibold mb-4">Features</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-white/70 hover:text-gold-400 transition-colors">Group Chat</a></li>
                <li><a href="#" className="text-white/70 hover:text-gold-400 transition-colors">Alumni Directory</a></li>
                <li><a href="#" className="text-white/70 hover:text-gold-400 transition-colors">Events</a></li>
                <li><a href="#" className="text-white/70 hover:text-gold-400 transition-colors">News & Updates</a></li>
              </ul>
            </div>

            {/* Column 4: Contact */}
            <div>
              <h4 className="text-gold-500 font-semibold mb-4">Contact</h4>
              <ul className="space-y-2">
                <li><a href="mailto:info@gvconnect.com" className="text-white/70 hover:text-gold-400 transition-colors">info@gvconnect.com</a></li>
                <li><a href="#" className="text-white/70 hover:text-gold-400 transition-colors">Facebook</a></li>
                <li><a href="#" className="text-white/70 hover:text-gold-400 transition-colors">Instagram</a></li>
                <li><a href="#" className="text-white/70 hover:text-gold-400 transition-colors">LinkedIn</a></li>
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
