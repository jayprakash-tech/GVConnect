import { Mountain } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-slate-clean-50 flex flex-col items-center justify-center px-4">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(107, 18, 48) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Logo/Icon */}
        <div className="mb-6 flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-maroon-800 to-maroon-950 shadow-lg shadow-maroon-900/20">
          <Mountain className="w-10 h-10 text-amber-warm-400" strokeWidth={1.5} />
        </div>

        {/* App Name */}
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          <span className="text-maroon-900">GV</span>
          <span className="text-amber-warm-600">Connect</span>
        </h1>

        {/* Tagline */}
        <p className="mt-3 text-slate-clean-500 text-sm sm:text-base font-medium tracking-wide uppercase">
          Grizzly Vidyalya
        </p>

        {/* Subtle divider */}
        <div className="mt-6 w-12 h-[2px] bg-gradient-to-r from-maroon-700 to-amber-warm-500 rounded-full" />

        {/* Status */}
        <p className="mt-6 text-slate-clean-400 text-xs tracking-widest uppercase">
          Step 1 — Foundation Complete
        </p>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-center">
        <p className="text-slate-clean-400 text-[11px] tracking-wide">
          Built with care for the Grizzly family
        </p>
      </div>
    </div>
  );
}

export default App;
