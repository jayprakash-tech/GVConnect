import { Link } from 'react-router-dom';
import { Mountain, ArrowRight, Users, MessageCircle, GraduationCap } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-clean-50">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 opacity-[0.02] pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(107, 18, 48) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }} />
      </div>

      {/* Header */}
      <header className="relative z-10 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-maroon-800 to-maroon-950 flex items-center justify-center shadow-md shadow-maroon-900/20">
              <Mountain className="w-5 h-5 text-amber-warm-400" strokeWidth={1.5} />
            </div>
            <h1 className="text-lg font-bold tracking-tight">
              <span className="text-maroon-900">GV</span>
              <span className="text-amber-warm-600">Connect</span>
            </h1>
          </div>
          <Link
            to="/auth"
            className="text-sm font-semibold text-maroon-800 hover:text-maroon-950 transition-colors"
          >
            Sign in →
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 px-6 pt-12 sm:pt-20 pb-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Decorative badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-warm-50 border border-amber-warm-200 mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-warm-500" />
            <span className="text-xs font-semibold text-amber-warm-700 tracking-widest uppercase">
              Grizzly Vidyalya Alumni
            </span>
          </div>

          {/* Main heading */}
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-clean-900 leading-[1.1]">
            Welcome back to{' '}
            <span className="relative inline-block">
              <span className="relative z-10 bg-gradient-to-r from-maroon-800 to-maroon-950 bg-clip-text text-transparent">
                Grizzly Vidyalya.
              </span>
              <span className="absolute bottom-1 left-0 right-0 h-3 bg-amber-warm-200/60 -z-0 rounded" />
            </span>
          </h2>

          {/* Subheading */}
          <p className="mt-6 text-lg sm:text-xl text-slate-clean-600 max-w-2xl mx-auto leading-relaxed">
            Reconnect with your batchmates, share memories, and stay updated.
          </p>

          {/* CTA Button */}
          <div className="mt-10">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-br from-maroon-800 to-maroon-950 text-white font-semibold text-base shadow-xl shadow-maroon-900/25 hover:shadow-2xl hover:shadow-maroon-900/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              Join / Login
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Trust line */}
          <p className="mt-6 text-xs text-slate-clean-400 tracking-wide">
            For verified alumni of Grizzly Vidyalya
          </p>
        </div>

        {/* Feature cards */}
        <div className="max-w-4xl mx-auto mt-20 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-6 border border-slate-clean-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-11 h-11 rounded-xl bg-maroon-50 flex items-center justify-center mb-4">
              <MessageCircle className="w-5 h-5 text-maroon-700" />
            </div>
            <h3 className="font-semibold text-slate-clean-900 mb-1">Group Chat</h3>
            <p className="text-sm text-slate-clean-500">Catch up with your batch in real-time conversations.</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-clean-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-11 h-11 rounded-xl bg-amber-warm-50 flex items-center justify-center mb-4">
              <Users className="w-5 h-5 text-amber-warm-600" />
            </div>
            <h3 className="font-semibold text-slate-clean-900 mb-1">Alumni Directory</h3>
            <p className="text-sm text-slate-clean-500">Find and connect with old friends from every batch.</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-clean-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-11 h-11 rounded-xl bg-maroon-50 flex items-center justify-center mb-4">
              <GraduationCap className="w-5 h-5 text-maroon-700" />
            </div>
            <h3 className="font-semibold text-slate-clean-900 mb-1">Memories</h3>
            <p className="text-sm text-slate-clean-500">Relive the moments that made school unforgettable.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-8 border-t border-slate-clean-100">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-clean-400 tracking-wide">
            © {new Date().getFullYear()} Grizzly Vidyalya Alumni Network
          </p>
          <p className="text-xs text-slate-clean-400">
            Built with care for the Grizzly family
          </p>
        </div>
      </footer>
    </div>
  );
}
