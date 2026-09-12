import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'w-full py-3.5 px-6 rounded-xl font-semibold text-[15px] transition-all duration-200 flex items-center justify-center gap-2';

  const variants = {
    primary: 'bg-maroon-800 text-white hover:bg-maroon-900 active:scale-[0.98] shadow-lg shadow-maroon-900/20 disabled:opacity-50 disabled:cursor-not-allowed',
    secondary: 'bg-amber-warm-500 text-white hover:bg-amber-warm-600 active:scale-[0.98] shadow-lg shadow-amber-warm-600/20 disabled:opacity-50 disabled:cursor-not-allowed',
    ghost: 'bg-transparent text-maroon-800 hover:bg-maroon-50 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
}
