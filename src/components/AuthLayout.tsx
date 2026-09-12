import { ReactNode } from 'react';
import { Mountain } from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
  step?: string;
  title: string;
  subtitle?: string;
}

export function AuthLayout({ children, step, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-clean-50 flex flex-col">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 opacity-[0.02] pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(107, 18, 48) 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }} />
      </div>

      {/* Header */}
      <header className="relative z-10 pt-8 pb-4 px-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-maroon-800 to-maroon-950 flex items-center justify-center shadow-md shadow-maroon-900/20">
            <Mountain className="w-5 h-5 text-amber-warm-400" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">
              <span className="text-maroon-900">GV</span>
              <span className="text-amber-warm-600">Connect</span>
            </h2>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 flex flex-col justify-center px-6 pb-12">
        <div className="w-full max-w-md mx-auto">
          {step && (
            <p className="text-xs font-semibold tracking-widest uppercase text-amber-warm-600 mb-2">
              {step}
            </p>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-clean-900 tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-slate-clean-500 text-[15px] leading-relaxed">
              {subtitle}
            </p>
          )}

          <div className="mt-8">
            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 pb-6 text-center">
        <p className="text-slate-clean-400 text-[11px] tracking-wide">
          Grizzly Vidyalya Alumni Network
        </p>
      </footer>
    </div>
  );
}
