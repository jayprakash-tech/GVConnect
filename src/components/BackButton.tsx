import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  fallbackTo?: string;
  label?: string;
  onClick?: () => void;
  variant?: 'light' | 'dark';
  className?: string;
}

export function BackButton({
  fallbackTo = '/',
  label = 'Back',
  onClick,
  variant = 'dark',
  className = '',
}: BackButtonProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onClick) {
      onClick();
      return;
    }

    const historyIdx =
      typeof window !== 'undefined' && window.history.state && typeof window.history.state.idx === 'number'
        ? window.history.state.idx
        : 0;

    if (historyIdx > 0) {
      navigate(-1);
    } else {
      navigate(fallbackTo);
    }
  };

  const styles =
    variant === 'dark'
      ? 'text-[#ffcf8a] hover:text-white border-white/15 bg-[#1a060e]/85 hover:border-[#d4af37]/50 hover:bg-[#260914]'
      : 'text-[#525252] hover:text-[#800020] border-[#e5e5e5] bg-white hover:border-[#800020]/30 hover:bg-[#fafafa]';

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-semibold tracking-wide transition-all cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/60 ${styles} ${className}`}
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      <span>{label}</span>
    </button>
  );
}
