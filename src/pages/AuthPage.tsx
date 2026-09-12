import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, RefreshCw, Mountain, UserPlus, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { useAuth } from '../context/AuthContext';

type Mode = 'signup' | 'login';
type SignupStep = 'email' | 'otp' | 'profile' | 'success';

export function AuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Mode: signup (new user) or login (returning user)
  const [mode, setMode] = useState<Mode>('signup');
  
  // Signup flow state
  const [signupStep, setSignupStep] = useState<SignupStep>('email');
  const [verifiedEmail, setVerifiedEmail] = useState('');
  
  // Login flow state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Shared state
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  
  // Profile fields
  const [fullName, setFullName] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [classLevel, setClassLevel] = useState('');
  const [batch, setBatch] = useState('');
  const [newPassword, setNewPassword] = useState('');
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

    // Check if profile exists for this email
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', verifiedEmailValue)
      .maybeSingle();

    setLoading(false);

    if (profile) {
      // Profile exists - this is a returning user, redirect to login tab
      setMode('login');
      setLoginEmail(verifiedEmailValue);
      setSignupStep('email');
      setError('Account already exists. Please login with your password.');
    } else {
      // No profile - show profile creation form
      setSignupStep('profile');
    }
  };

  // ─── SIGNUP STEP 3: Create Profile ───────────────────────
  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim() || !admissionNumber.trim() || !classLevel || !batch) {
      setError('Please fill all fields');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    // Create account with signUp
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: verifiedEmail,
      password: newPassword,
    });

    if (signUpError) {
      setLoading(false);
      if (signUpError.message.includes('already registered')) {
        setError('This email is already registered. Please login instead.');
      } else if (signUpError.message.includes('password')) {
        setError('Password is too weak. Please use a stronger password.');
      } else {
        setError(signUpError.message);
      }
      return;
    }

    // Insert profile data
    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: fullName.trim(),
        admission_number: admissionNumber.trim(),
        class: classLevel,
        batch,
        email: verifiedEmail,
      });

      if (profileError) {
        setLoading(false);
        setError('Failed to save profile. Please contact support.');
        return;
      }
    }

    setLoading(false);
    setSignupStep('success');
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
      <div className="fixed inset-0 opacity-[0.02] pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(107, 18, 48) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }} />
      </div>

      {/* Header */}
      <header className="relative z-10 pt-8 pb-4 px-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-maroon-800 to-maroon-950 flex items-center justify-center shadow-md shadow-maroon-900/20">
              <Mountain className="w-5 h-5 text-amber-warm-400" strokeWidth={1.5} />
            </div>
            <h2 className="text-lg font-bold tracking-tight">
              <span className="text-maroon-900">GV</span>
              <span className="text-amber-warm-600">Connect</span>
            </h2>
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex flex-col justify-center px-6 pb-12">
        <div className="w-full max-w-md mx-auto">
          {/* Mode Tabs */}
          <div className="flex gap-2 mb-8 bg-slate-clean-100 p-1 rounded-xl">
            <button
              onClick={() => { setMode('signup'); setError(''); }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
                mode === 'signup'
                  ? 'bg-white text-maroon-800 shadow-sm'
                  : 'text-slate-clean-500 hover:text-slate-clean-700'
              }`}
            >
              New User
            </button>
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
                mode === 'login'
                  ? 'bg-white text-maroon-800 shadow-sm'
                  : 'text-slate-clean-500 hover:text-slate-clean-700'
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
                  <p className="text-xs font-semibold tracking-widest uppercase text-amber-warm-600 mb-2">
                    {signupStep === 'email' && 'Step 1 of 3'}
                    {signupStep === 'otp' && 'Step 2 of 3'}
                    {signupStep === 'profile' && 'Step 3 of 3'}
                  </p>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-clean-900 tracking-tight">
                    {signupStep === 'email' && 'Create your account'}
                    {signupStep === 'otp' && 'Verify your email'}
                    {signupStep === 'profile' && 'Complete your profile'}
                  </h1>
                  <p className="mt-2 text-slate-clean-500 text-[15px]">
                    {signupStep === 'email' && 'Enter your email to receive a verification code.'}
                    {signupStep === 'otp' && `We sent a 6-digit code to ${email}`}
                    {signupStep === 'profile' && 'Tell us about yourself to join the community.'}
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
                          className="w-full px-4 py-3 rounded-xl border border-slate-clean-200 bg-white text-slate-clean-900 placeholder:text-slate-clean-400 text-[15px] focus:outline-none focus:ring-2 focus:ring-maroon-700/20 focus:border-maroon-700 transition-all"
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
                      className="w-full py-3.5 px-6 rounded-xl font-semibold text-[15px] bg-maroon-800 text-white hover:bg-maroon-900 active:scale-[0.98] shadow-lg shadow-maroon-900/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
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
                          className="w-12 h-14 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-bold rounded-xl border-2 border-slate-clean-200 bg-white text-slate-clean-900 focus:outline-none focus:border-maroon-700 focus:ring-4 focus:ring-maroon-700/10 transition-all"
                        />
                      ))}
                    </div>

                    {error && <p className="text-sm text-red-500 font-medium text-center">{error}</p>}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 px-6 rounded-xl font-semibold text-[15px] bg-maroon-800 text-white hover:bg-maroon-900 active:scale-[0.98] shadow-lg shadow-maroon-900/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
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

                {/* ─── SIGNUP STEP 3: Profile Form ────────── */}
                {signupStep === 'profile' && (
                  <form onSubmit={handleCreateProfile} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-clean-700 mb-1.5">Full Name</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g., Rahul Sharma"
                        className="w-full px-4 py-3 rounded-xl border border-slate-clean-200 bg-white text-slate-clean-900 placeholder:text-slate-clean-400 text-[15px] focus:outline-none focus:ring-2 focus:ring-maroon-700/20 focus:border-maroon-700 transition-all"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-clean-700 mb-1.5">Admission Number</label>
                      <input
                        type="text"
                        value={admissionNumber}
                        onChange={(e) => setAdmissionNumber(e.target.value)}
                        placeholder="e.g., GV-2018-045"
                        className="w-full px-4 py-3 rounded-xl border border-slate-clean-200 bg-white text-slate-clean-900 placeholder:text-slate-clean-400 text-[15px] focus:outline-none focus:ring-2 focus:ring-maroon-700/20 focus:border-maroon-700 transition-all"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-clean-700 mb-1.5">Class</label>
                        <select
                          value={classLevel}
                          onChange={(e) => setClassLevel(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-clean-200 bg-white text-slate-clean-900 text-[15px] focus:outline-none focus:ring-2 focus:ring-maroon-700/20 focus:border-maroon-700 transition-all"
                          required
                        >
                          <option value="">Select</option>
                          {classes.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-clean-700 mb-1.5">Batch Year</label>
                        <select
                          value={batch}
                          onChange={(e) => setBatch(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-clean-200 bg-white text-slate-clean-900 text-[15px] focus:outline-none focus:ring-2 focus:ring-maroon-700/20 focus:border-maroon-700 transition-all"
                          required
                        >
                          <option value="">Select</option>
                          {batches.map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-clean-100">
                      <p className="text-xs text-slate-clean-500 mb-3 font-medium uppercase tracking-wide">
                        Create a password
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-clean-700 mb-1.5">Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        className="w-full px-4 py-3 rounded-xl border border-slate-clean-200 bg-white text-slate-clean-900 placeholder:text-slate-clean-400 text-[15px] focus:outline-none focus:ring-2 focus:ring-maroon-700/20 focus:border-maroon-700 transition-all"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-clean-700 mb-1.5">Confirm Password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full px-4 py-3 rounded-xl border border-slate-clean-200 bg-white text-slate-clean-900 placeholder:text-slate-clean-400 text-[15px] focus:outline-none focus:ring-2 focus:ring-maroon-700/20 focus:border-maroon-700 transition-all"
                        required
                      />
                    </div>

                    {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 px-6 rounded-xl font-semibold text-[15px] bg-maroon-800 text-white hover:bg-maroon-900 active:scale-[0.98] shadow-lg shadow-maroon-900/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {loading ? 'Creating account...' : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          Create Account
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* ─── SIGNUP STEP 4: Success ─────────────── */}
                {signupStep === 'success' && (
                  <div className="text-center space-y-6">
                    <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>

                    <div>
                      <h2 className="text-2xl font-bold text-slate-clean-900 mb-2">
                        Account created successfully!
                      </h2>
                      <p className="text-slate-clean-600 text-[15px] leading-relaxed">
                        Please check your email and click the confirmation link to activate your account.
                      </p>
                    </div>

                    <div className="bg-amber-warm-50 border border-amber-warm-200 rounded-xl p-4 text-left">
                      <p className="text-sm text-amber-warm-800 font-medium mb-1">
                        What's next?
                      </p>
                      <ol className="text-sm text-amber-warm-700 space-y-1 list-decimal list-inside">
                        <li>Check your email inbox</li>
                        <li>Click the confirmation link</li>
                        <li>Return here to login</li>
                      </ol>
                    </div>

                    <button
                      onClick={() => {
                        setMode('login');
                        setLoginEmail(verifiedEmail);
                        setSignupStep('email');
                        setError('');
                      }}
                      className="w-full py-3.5 px-6 rounded-xl font-semibold text-[15px] bg-maroon-800 text-white hover:bg-maroon-900 active:scale-[0.98] shadow-lg shadow-maroon-900/20 transition-all flex items-center justify-center gap-2"
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
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-clean-900 tracking-tight">
                Welcome back
              </h1>
              <p className="mt-2 text-slate-clean-500 text-[15px]">
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
                  className="w-full py-3.5 px-6 rounded-xl font-semibold text-[15px] bg-maroon-800 text-white hover:bg-maroon-900 active:scale-[0.98] shadow-lg shadow-maroon-900/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
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
        <p className="text-slate-clean-400 text-[11px] tracking-wide">
          Grizzly Vidyalya Alumni Network
        </p>
      </footer>
    </div>
  );
}
