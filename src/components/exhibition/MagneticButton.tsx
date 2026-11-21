import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export type MagneticButtonTone = 'amber' | 'cyan' | 'frost';

interface MagneticButtonProps {
  label: string;
  to?: string;
  onClick?: () => void;
  tone?: MagneticButtonTone;
  className?: string;
}

const TONE_MAP: Record<
  MagneticButtonTone,
  {
    accent: string;
    ink: string;
    glow: string;
    borderGradient: string;
    surface: string;
  }
> = {
  amber: {
    accent: '#ffcf8a',
    ink: '#2a0812',
    glow: '255, 179, 71',
    borderGradient:
      'conic-gradient(from 0deg, transparent 0deg, rgba(255,207,138,0.22) 120deg, #ffcf8a 210deg, #fff5dc 250deg, #d4af37 300deg, transparent 360deg)',
    surface: 'rgba(32, 8, 16, 0.88)',
  },
  cyan: {
    accent: '#bff4ff',
    ink: '#07121a',
    glow: '143, 227, 255',
    borderGradient:
      'conic-gradient(from 0deg, transparent 0deg, rgba(191,244,255,0.22) 120deg, #8fe3ff 210deg, #ffffff 250deg, #63d8ff 300deg, transparent 360deg)',
    surface: 'rgba(9, 20, 30, 0.88)',
  },
  frost: {
    accent: '#fff1d6',
    ink: '#1e060e',
    glow: '212, 175, 55',
    borderGradient:
      'conic-gradient(from 0deg, transparent 0deg, rgba(255,241,214,0.22) 120deg, #d4af37 210deg, #ffffff 250deg, #ffcf8a 300deg, transparent 360deg)',
    surface: 'rgba(26, 6, 14, 0.86)',
  },
};

export function MagneticButton({
  label,
  to,
  onClick,
  tone = 'amber',
  className = '',
}: MagneticButtonProps) {
  const btnRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  const palette = TONE_MAP[tone];

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    const el = btnRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = ((e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)) * 7;
    const dy = ((e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)) * 5;
    setOffset({ x: dx, y: dy });
  };

  const resetPointer = () => {
    setHovered(false);
    setOffset({ x: 0, y: 0 });
  };

  const innerContent = (
    <div
      ref={btnRef}
      onPointerMove={handlePointerMove}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={resetPointer}
      style={{
        transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
        transition: hovered
          ? 'transform 160ms cubic-bezier(0.22, 1, 0.36, 1)'
          : 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
      className={`relative inline-flex items-center justify-center rounded-full p-[1.5px] select-none group ${className}`}
    >
      {/* Pulsing ambient aura */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-2 rounded-full transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle, rgba(${palette.glow}, 0.42), transparent 70%)`,
          animation: 'hall-core 3.2s ease-in-out infinite',
          opacity: hovered ? 0.95 : 0.52,
        }}
      />

      {/* Spinning conic border ring */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
      >
        <span
          className="absolute -inset-12"
          style={{
            background: palette.borderGradient,
            animation: 'fest-spin 4.4s linear infinite',
          }}
        />
      </span>

      {/* Interactive pill surface */}
      <span
        className="relative flex items-center gap-3 overflow-hidden rounded-full px-7 py-3.5 text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase whitespace-nowrap shrink-0 transition-colors duration-300"
        style={{
          backgroundColor: hovered ? palette.accent : palette.surface,
          color: hovered ? palette.ink : palette.accent,
          boxShadow: hovered
            ? `0 12px 32px rgba(${palette.glow}, 0.35)`
            : '0 6px 20px rgba(0, 0, 0, 0.45)',
        }}
      >
        {/* Diagonal light sheen sweep */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          style={{ animation: 'register-sweep 4.2s ease-in-out infinite' }}
        />

        <span className="relative z-10">{label}</span>
        <ArrowRight className="relative z-10 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
      </span>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="inline-block focus:outline-none">
        {innerContent}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-block bg-transparent border-0 p-0 cursor-pointer focus:outline-none"
    >
      {innerContent}
    </button>
  );
}
