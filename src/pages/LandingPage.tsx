import { Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { ArrowRight, Users, Calendar, BookOpen, Heart } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />

      {/* Hero Section with School Building Background */}
      <section className="relative h-[90vh] min-h-[600px] flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(https://image.qwenlm.ai/generated-images/46dafc73-b57a-4dc0-ad93-e08f3f6af677/_result.png)',
          }}
        />
        
        {/* Dark Maroon Overlay */}
        <div className="absolute inset-0 bg-maroon-800/70" />

        {/* Content */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-gold-500 mb-6 leading-tight">
            Welcome Home, Grizzly!
          </h1>
          <p className="text-xl md:text-2xl text-white mb-10 leading-relaxed max-w-3xl mx-auto">
            Reconnect with your batchmates, relive the memories, and stay connected to Grizzly Vidyalya.
          </p>
          <Link
            to="/auth"
            className="inline-flex items-center gap-3 px-10 py-4 bg-gold-500 text-maroon-800 rounded-full font-bold text-lg hover:bg-gold-400 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 group"
          >
            Join the Community
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-gold-500 rounded-full flex items-start justify-center p-2">
            <div className="w-1 h-2 bg-gold-500 rounded-full" />
          </div>
        </div>
      </section>

      {/* Nostalgia Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Image */}
            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-br from-maroon-800 to-gold-500 rounded-2xl opacity-20 blur-xl group-hover:opacity-30 transition-opacity duration-500" />
              <img
                src="https://image.qwenlm.ai/generated-images/112a7ad0-1821-4460-8bfb-bdf0a03ed7d5/_result.png"
                alt="School Gate"
                className="relative rounded-2xl shadow-2xl w-full h-[500px] object-cover group-hover:scale-[1.02] transition-transform duration-500"
              />
            </div>

            {/* Text Content */}
            <div className="space-y-6">
              <h2 className="text-4xl md:text-5xl font-serif font-bold text-maroon-800 leading-tight">
                Remember the days?
              </h2>
              <p className="text-lg text-neutral-700 leading-relaxed">
                Your school, your friends, your memories. All in one place. Join GVConnect to reconnect with your batchmates and relive the golden moments of your school life.
              </p>
              <div className="pt-4">
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-2 px-8 py-3 bg-maroon-800 text-gold-500 rounded-full font-semibold hover:bg-maroon-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  Start Your Journey
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-maroon-50 to-gold-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-maroon-800 mb-4">
              What Awaits You
            </h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              Everything you need to stay connected with your Grizzly Vidyalya family
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group">
              <div className="w-16 h-16 bg-gradient-to-br from-maroon-800 to-maroon-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Users className="w-8 h-8 text-gold-500" />
              </div>
              <h3 className="text-xl font-bold text-maroon-800 mb-3">Connect with Batchmates</h3>
              <p className="text-neutral-600 leading-relaxed">
                Find and reconnect with friends from your batch. Share updates and stay in touch.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group">
              <div className="w-16 h-16 bg-gradient-to-br from-gold-500 to-gold-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Calendar className="w-8 h-8 text-maroon-800" />
              </div>
              <h3 className="text-xl font-bold text-maroon-800 mb-3">Events & Reunions</h3>
              <p className="text-neutral-600 leading-relaxed">
                Stay updated on alumni events, reunions, and school functions. Never miss a gathering.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group">
              <div className="w-16 h-16 bg-gradient-to-br from-maroon-800 to-maroon-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <BookOpen className="w-8 h-8 text-gold-500" />
              </div>
              <h3 className="text-xl font-bold text-maroon-800 mb-3">Memory Lane</h3>
              <p className="text-neutral-600 leading-relaxed">
                Share and relive memories through photos, stories, and nostalgic conversations.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group">
              <div className="w-16 h-16 bg-gradient-to-br from-gold-500 to-gold-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Heart className="w-8 h-8 text-maroon-800" />
              </div>
              <h3 className="text-xl font-bold text-maroon-800 mb-3">Give Back</h3>
              <p className="text-neutral-600 leading-relaxed">
                Contribute to your alma mater and help current students through alumni initiatives.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-maroon-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, #D4AF37 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }} />
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-gold-500 mb-6">
            Ready to Reconnect?
          </h2>
          <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
            Join thousands of Grizzly Vidyalya alumni who are already connected. Your batchmates are waiting for you!
          </p>
          <Link
            to="/auth"
            className="inline-flex items-center gap-3 px-12 py-5 bg-gold-500 text-maroon-800 rounded-full font-bold text-lg hover:bg-gold-400 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 group"
          >
            Join GVConnect Today
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-maroon-900 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <img
                  src="/gvlogo.png"
                  alt="GVConnect Logo"
                  width={40}
                  height={40}
                  className="rounded-full border-2 border-gold-500"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div>
                  <h3 className="text-gold-500 font-serif text-xl font-bold">GVConnect</h3>
                  <p className="text-white/60 text-sm">Grizzly Vidyalya Alumni Network</p>
                </div>
              </div>
              <p className="text-white/70 leading-relaxed max-w-md">
                Connecting Grizzly Vidyalya alumni across the globe. Relive memories, build connections, and stay part of the family.
              </p>
            </div>

            <div>
              <h4 className="text-gold-500 font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><Link to="/" className="text-white/70 hover:text-gold-400 transition-colors">Home</Link></li>
                <li><Link to="/about" className="text-white/70 hover:text-gold-400 transition-colors">About</Link></li>
                <li><Link to="/events" className="text-white/70 hover:text-gold-400 transition-colors">Events</Link></li>
                <li><Link to="/gallery" className="text-white/70 hover:text-gold-400 transition-colors">Gallery</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-gold-500 font-semibold mb-4">Connect</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-white/70 hover:text-gold-400 transition-colors">Facebook</a></li>
                <li><a href="#" className="text-white/70 hover:text-gold-400 transition-colors">Instagram</a></li>
                <li><a href="#" className="text-white/70 hover:text-gold-400 transition-colors">LinkedIn</a></li>
                <li><a href="#" className="text-white/70 hover:text-gold-400 transition-colors">Twitter</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 text-center">
            <p className="text-white/60 text-sm">
              © {new Date().getFullYear()} GVConnect - Grizzly Vidyalya Alumni Network. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
