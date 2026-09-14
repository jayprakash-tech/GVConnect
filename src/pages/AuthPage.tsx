import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, RefreshCw, UserPlus, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { useAuth } from '../context/AuthContext';

type Mode = 'signup' | 'login';
type SignupStep = 'email' | 'otp' | 'profile' | 'success';

export function AuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Mode: signup (new user) or login (returning user)
  const [mode, setMode] = useState<Mode>(() => {
    const saved = sessionStorage.getItem('gv_auth_mode');
    return (saved as Mode) || 'signup';
  });
  
  // Signup flow state - restore from sessionStorage on mount
  const [signupStep, setSignupStep] = useState<SignupStep>(() => {
    const saved = sessionStorage.getItem('gv_signup_step');
    return (saved as SignupStep) || 'email';
  });
  const [verifiedEmail, setVerifiedEmail] = useState(() => {
    return sessionStorage.getItem('gv_verified_email') || '';
  });
  const [successEmail, setSuccessEmail] = useState(() => {
    return sessionStorage.getItem('gv_success_email') || '';
  });
  
  // Login flow state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Shared state
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  
  // Profile fields
  const [fullName, setFullName] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [batchYear, setBatchYear] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if already logged in (but NOT during signup flow)
  useEffect(() => {
    // Only redirect if user is logged in AND we're at the initial email step
    // This prevents redirect during OTP verification flow
    if (user && signupStep === 'email' && !verifiedEmail) {
      navigate('/dashboard');
    }
  }, [user, navigate, signupStep, verifiedEmail]);

  // Persist signup flow state to sessionStorage (survives page refresh)
  useEffect(() => {
    sessionStorage.setItem('gv_signup_step', signupStep);
    sessionStorage.setItem('gv_verified_email', verifiedEmail);
    sessionStorage.setItem('gv_auth_mode', mode);
    
    // If we're past email step, restore the email field
    if (signupStep !== 'email' && verifiedEmail) {
      setEmail(verifiedEmail);
    }
    
    // Clear storage when flow completes or user switches to login
    if (mode === 'login' || signupStep === 'email') {
      // Only clear if we're not in the middle of a flow
      if (signupStep === 'email' && !verifiedEmail) {
        sessionStorage.removeItem('gv_signup_step');
        sessionStorage.removeItem('gv_verified_email');
        sessionStorage.removeItem('gv_auth_mode');
      }
    }
  }, [signupStep, verifiedEmail, mode]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCooldown]);

  // Focus first OTP input
  useEffect(() => {
    if (signupStep === 'otp') {
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
  }, [signupStep]);

  // ─── SIGNUP STEP 1: Send OTP ─────────────────────────────
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
    });

    setLoading(false);

    if (error) {
      if (error.message.includes('already registered')) {
        setError('This email is already registered. Please login instead.');
      } else {
        setError(error.message);
      }
      return;
    }

    setSignupStep('otp');
    setResendCooldown(30);
  };

  // ─── SIGNUP STEP 2: Verify OTP ───────────────────────────
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Enter the full 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code,
      type: 'email',
    });

    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    // OTP verified - store email
    const verifiedEmailValue = email.trim().toLowerCase();
    setVerifiedEmail(verifiedEmailValue);

    // CRITICAL: Sign out immediately to prevent auto-login
    // verifyOtp() creates a session, which would trigger redirect to dashboard
    await supabase.auth.signOut();

    // Small delay to ensure signOut completes and state updates propagate
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check if profile exists for this email AND has actual data
    // (The database trigger creates a blank profile, so we need to check if it's populated)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, admission_number')
      .eq('email', verifiedEmailValue)
      .maybeSingle();

    setLoading(false);

    // Check if profile exists AND has been filled out (not just the blank trigger row)
    const hasCompleteProfile = profile && profile.full_name && profile.admission_number;

    if (hasCompleteProfile) {
      // Profile exists with data - this is a returning user, redirect to login tab
      setMode('login');
      setLoginEmail(verifiedEmailValue);
      setSignupStep('email');
      setError('Account already exists. Please login with your password.');
    } else {
      // No profile or blank profile - navigate to profile page
      navigate('/profile');
    }
  };

  // ─── LOGIN: Email + Password ─────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;

    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim().toLowerCase(),
      password: loginPassword,
    });

    setLoading(false);

    if (error) {
      if (error.message.includes('Email not confirmed')) {
        setError('Please confirm your email first. Check your inbox for the confirmation link.');
      } else if (error.message.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please try again.');
      } else {
        setError(error.message);
      }
      return;
    }

    navigate('/dashboard');
  };

  // ─── OTP Input Handlers ──────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];

    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      digits.forEach((d, i) => {
        if (index + i < 6) newOtp[index + i] = d;
      });
      setOtp(newOtp);
      const next = Math.min(index + digits.length, 5);
      otpRefs.current[next]?.focus();
      return;
    }

    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
    });
    setOtp(['', '', '', '', '', '']);
    setResendCooldown(30);
    otpRefs.current[0]?.focus();
  };

  // ─── Class & Batch Options ───────────────────────────────
  const classes = ['Nursery', 'LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
  const batches = Array.from({ length: 25 }, (_, i) => String(new Date().getFullYear() - i));

  // ─── Render ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-clean-50 flex flex-col">
      {/* Background pattern */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #D4AF37 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }} />
      </div>

      {/* Header */}
      <header className="relative z-10 pt-8 pb-4 px-6">
        <div className="flex flex-col items-center gap-4">
          {/* Logo */}
          <img
            src="/gvlogo.png"
            alt="GVConnect Logo"
            width={80}
            height={80}
            className="rounded-full border-4 border-gold-500 shadow-lg"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <Link to="/" className="text-center">
            <h2 className="text-2xl font-serif font-bold tracking-tight">
              <span className="text-maroon-800">GV</span>
              <span className="text-gold-500">Connect</span>
            </h2>
            <p className="text-sm text-neutral-600 mt-1">Grizzly Vidyalya Alumni</p>
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex flex-col justify-center px-6 pb-12">
        <div className="w-full max-w-md mx-auto">
          {/* Mode Tabs */}
          <div className="flex gap-2 mb-8 bg-neutral-100 p-1 rounded-xl">
            <button
              onClick={() => { setMode('signup'); setError(''); }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
                mode === 'signup'
                  ? 'bg-maroon-800 text-gold-500 shadow-md'
                  : 'text-neutral-500 hover:text-maroon-800'
              }`}
            >
              New User
            </button>
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
                mode === 'login'
                  ? 'bg-maroon-800 text-gold-500 shadow-md'
                  : 'text-neutral-500 hover:text-maroon-800'
              }`}
            >
              Returning User
            </button>
          </div>

          {/* ─── SIGNUP MODE ─────────────────────────────── */}
          {mode === 'signup' && (
            <>
              {/* Step indicator */}
              {signupStep !== 'success' && (
                <>
                  <p className="text-xs font-semibold tracking-widest uppercase text-gold-600 mb-2">
                    {signupStep === 'email' && 'Step 1 of 2'}
                    {signupStep === 'otp' && 'Step 2 of 2'}
                  </p>
                  <h1 className="text-2xl sm:text-3xl font-serif font-bold text-maroon-800 tracking-tight">
                    {signupStep === 'email' && 'Create your account'}
                    {signupStep === 'otp' && 'Verify your email'}
                  </h1>
                  <p className="mt-2 text-neutral-600 text-[15px]">
                    {signupStep === 'email' && 'Enter your email to receive a verification code.'}
                    {signupStep === 'otp' && `We sent a 6-digit code to ${email}`}
                  </p>
                </>
              )}

              <div className="mt-8">
                {/* ─── SIGNUP STEP 1: Email ───────────────── */}
                {signupStep === 'email' && (
                  <form onSubmit={handleSendOTP} className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-clean-700 mb-1.5">
                        Email Address
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400 text-[15px] focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 transition-all"
                          required
                          autoComplete="email"
                        />
                        <Mail className="absolute right-4 top-3.5 w-4 h-4 text-slate-clean-400 pointer-events-none" />
                      </div>
                    </div>

                    {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 px-6 rounded-xl font-semibold text-[15px] bg-maroon-800 text-gold-500 hover:bg-maroon-700 active:scale-[0.98] shadow-lg shadow-maroon-900/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 border-2 border-gold-500/30 hover:border-gold-500/50"
                    >
                      {loading ? 'Sending...' : 'Send Verification Code'}
                      {!loading && <ArrowRight className="w-4 h-4" />}
                    </button>
                  </form>
                )}

                {/* ─── SIGNUP STEP 2: OTP ─────────────────── */}
                {signupStep === 'otp' && (
                  <form onSubmit={handleVerifyOTP} className="space-y-6">
                    <div className="flex justify-center gap-2.5 sm:gap-3">
                      {otp.map((digit, i) => (
                        <input
                          key={i}
                          ref={(el) => { otpRefs.current[i] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={digit}
                          onChange={(e) => handleOtpChange(i, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(i, e)}
                          className="w-12 h-14 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-bold rounded-xl border-2 border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 transition-all"
                        />
                      ))}
                    </div>

                    {error && <p className="text-sm text-red-500 font-medium text-center">{error}</p>}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 px-6 rounded-xl font-semibold text-[15px] bg-maroon-800 text-gold-500 hover:bg-maroon-700 active:scale-[0.98] shadow-lg shadow-maroon-900/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 border-2 border-gold-500/30 hover:border-gold-500/50"
                    >
                      {loading ? 'Verifying...' : 'Verify Code'}
                      {!loading && <ArrowRight className="w-4 h-4" />}
                    </button>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={resendCooldown > 0}
                        className="inline-flex items-center gap-1.5 text-sm text-maroon-700 font-medium hover:text-maroon-900 disabled:text-slate-clean-400 disabled:cursor-not-allowed transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                      </button>
                    </div>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => { setSignupStep('email'); setError(''); setOtp(['', '', '', '', '', '']); }}
                        className="text-sm text-slate-clean-500 hover:text-slate-clean-700 transition-colors"
                      >
                        ← Use a different email
                      </button>
                    </div>
                  </form>
                )}

                {/* ─── SIGNUP STEP 4: Success ─────────────── */}
                {signupStep === 'success' && (
                  <div className="text-center space-y-6">
                    {/* Icon with mail and checkmark */}
                    <div className="relative w-20 h-20 mx-auto">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-400 to-green-600 opacity-20 animate-pulse" />
                      <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center mx-auto border-2 border-green-200">
                        <div className="relative">
                          <Mail className="w-10 h-10 text-green-600" strokeWidth={1.5} />
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center border-2 border-white">
                            <CheckCircle2 className="w-4 h-4 text-white" strokeWidth={2.5} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Heading and message */}
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-slate-clean-900 mb-3">
                        Account Created Successfully!
                      </h2>
                      <p className="text-slate-clean-600 text-[15px] leading-relaxed max-w-sm mx-auto">
                        We have sent a confirmation link to{' '}
                        <span className="font-semibold text-slate-clean-900">{successEmail || verifiedEmail}</span>.
                        Please check your inbox and click the link to activate your account.
                      </p>
                    </div>

                    {/* What's next section */}
                    <div className="bg-amber-warm-50 border border-amber-warm-200 rounded-xl p-5 text-left">
                      <p className="text-sm text-amber-warm-800 font-semibold mb-2 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-warm-200 flex items-center justify-center text-xs font-bold">?</span>
                        What's next?
                      </p>
                      <ol className="text-sm text-amber-warm-700 space-y-2">
                        <li className="flex items-start gap-2">
                          <span className="font-bold text-amber-warm-600 mt-0.5">1.</span>
                          <span>Check your email inbox (and spam folder)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold text-amber-warm-600 mt-0.5">2.</span>
                          <span>Click the confirmation link in the email</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold text-amber-warm-600 mt-0.5">3.</span>
                          <span>Return here and login with your credentials</span>
                        </li>
                      </ol>
                    </div>

                    {/* Go to Login button */}
                    <button
                      onClick={() => {
                        // Clear success state
                        sessionStorage.removeItem('gv_success_email');
                        sessionStorage.removeItem('gv_signup_step');
                        sessionStorage.removeItem('gv_verified_email');
                        sessionStorage.removeItem('gv_auth_mode');
                        
                        // Switch to login tab with email pre-filled
                        setMode('login');
                        setLoginEmail(successEmail || verifiedEmail);
                        setSignupStep('email');
                        setSuccessEmail('');
                        setVerifiedEmail('');
                        setError('');
                      }}
                      className="w-full py-3.5 px-6 rounded-xl font-semibold text-[15px] bg-maroon-800 text-gold-500 hover:bg-maroon-700 active:scale-[0.98] shadow-lg shadow-maroon-900/20 transition-all flex items-center justify-center gap-2 border-2 border-gold-500/30 hover:border-gold-500/50"
                    >
                      Go to Login
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ─── LOGIN MODE ──────────────────────────────── */}
          {mode === 'login' && (
            <>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-maroon-800 tracking-tight">
                Welcome back
              </h1>
              <p className="mt-2 text-neutral-600 text-[15px]">
                Sign in to your GVConnect account
              </p>

              <form onSubmit={handleLogin} className="mt-8 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-clean-700 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-4 py-3 rounded-xl border border-slate-clean-200 bg-white text-slate-clean-900 placeholder:text-slate-clean-400 text-[15px] focus:outline-none focus:ring-2 focus:ring-maroon-700/20 focus:border-maroon-700 transition-all"
                      required
                      autoComplete="email"
                    />
                    <Mail className="absolute right-4 top-3.5 w-4 h-4 text-slate-clean-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-clean-700 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-4 py-3 rounded-xl border border-slate-clean-200 bg-white text-slate-clean-900 placeholder:text-slate-clean-400 text-[15px] focus:outline-none focus:ring-2 focus:ring-maroon-700/20 focus:border-maroon-700 transition-all"
                      required
                      autoComplete="current-password"
                    />
                    <Lock className="absolute right-4 top-3.5 w-4 h-4 text-slate-clean-400 pointer-events-none" />
                  </div>
                </div>

                {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-6 rounded-xl font-semibold text-[15px] bg-maroon-800 text-gold-500 hover:bg-maroon-700 active:scale-[0.98] shadow-lg shadow-maroon-900/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 border-2 border-gold-500/30 hover:border-gold-500/50"
                >
                  {loading ? 'Signing in...' : (
                    <>
                      Sign In
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <p className="text-center text-sm text-slate-clean-500">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('signup'); setError(''); }}
                    className="text-maroon-700 font-semibold hover:text-maroon-900 transition-colors"
                  >
                    Sign up
                  </button>
                </p>
              </form>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 pb-6 text-center">
        <p className="text-neutral-500 text-[11px] tracking-wide">
          Grizzly Vidyalya Alumni Network
        </p>
      </footer>
    </div>
  );
}
