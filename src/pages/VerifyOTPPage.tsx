import { useState, useRef, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, RefreshCw } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/ui/Button';
import { supabase, isSupabaseConfigured } from '../utils/supabase/client';

export function VerifyOTPPage() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();

  const email = sessionStorage.getItem('gv_email');

  useEffect(() => {
    if (!email) {
      navigate('/login');
    }
    // Focus first input
    inputRefs.current[0]?.focus();
  }, [email, navigate]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newOtp = [...otp];
      digits.forEach((digit, i) => {
        if (index + i < 6) newOtp[index + i] = digit;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    if (!isSupabaseConfigured()) {
      setError('Supabase not configured.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Try to verify OTP — if user exists, this succeeds
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email!,
        token: code,
        type: 'email',
      });

      if (verifyError) {
        // User might not exist — could be a new user
        // Try to check if it's a "user not found" type error
        if (verifyError.message?.toLowerCase().includes('not found') || 
            verifyError.message?.toLowerCase().includes('invalid')) {
          // New user — create account with temporary password
          const tempPassword = 'Temp_' + Math.random().toString(36).slice(2) + '!A1';
          const { error: signUpError } = await supabase.auth.signUp({
            email: email!,
            password: tempPassword,
          });

          if (signUpError) throw signUpError;

          // Store that this is a new user
          sessionStorage.setItem('gv_new_user', 'true');
          navigate('/setup-profile');
          return;
        }
        throw verifyError;
      }

      if (data.session && data.user) {
        // User exists — check if they have a profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .single();

        if (profile) {
          // Existing user — sign out and ask for password
          await supabase.auth.signOut();
          navigate('/login-password');
        } else {
          // No profile — new user flow
          sessionStorage.setItem('gv_new_user', 'true');
          navigate('/setup-profile');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !email) return;

    if (!isSupabaseConfigured()) return;

    setResendLoading(true);
    try {
      await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      setResendCooldown(30);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch {
      // Silently fail
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <AuthLayout
      step="Step 2 of 3"
      title="Enter verification code"
      subtitle={`We sent a 6-digit code to ${email}`}
    >
      <form onSubmit={handleVerify} className="space-y-6">
        {/* OTP Inputs */}
        <div className="flex justify-center gap-2.5 sm:gap-3">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-12 h-14 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-bold
                rounded-xl border-2 border-slate-clean-200 bg-white text-slate-clean-900
                focus:outline-none focus:border-maroon-700 focus:ring-4 focus:ring-maroon-700/10
                transition-all duration-200"
            />
          ))}
        </div>

        {error && (
          <p className="text-center text-sm text-red-500 font-medium">{error}</p>
        )}

        <Button type="submit" loading={loading}>
          Verify Code
          <ArrowRight className="w-4 h-4" />
        </Button>

        {/* Resend */}
        <div className="text-center">
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || resendLoading}
            className="inline-flex items-center gap-1.5 text-sm text-maroon-700 font-medium
              hover:text-maroon-900 disabled:text-slate-clean-400 disabled:cursor-not-allowed
              transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resendLoading ? 'animate-spin' : ''}`} />
            {resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : 'Resend code'}
          </button>
        </div>

        {/* Back link */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-sm text-slate-clean-500 hover:text-slate-clean-700 transition-colors"
          >
            ← Use a different email
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
