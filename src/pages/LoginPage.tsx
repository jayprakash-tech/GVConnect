import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, RefreshCw, Mountain, UserPlus } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { useAuth } from '../context/AuthContext';

type Step = 'email' | 'otp' | 'profile' | 'password';

export function LoginPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');

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

  // Redirect if already logged in
  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCooldown]);

  // Focus first OTP input when step changes
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  // ─── STEP 1: Send OTP ────────────────────────────────────
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setStep('otp');
    setResendCooldown(30);
  };

  // ─── STEP 2: Verify OTP ──────────────────────────────────
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Enter the full 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code,
      type: 'email',
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    // OTP verified — check if user has a profile
    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profile) {
        // Existing user — sign out, ask for password
        await supabase.auth.signOut();
        setStep('password');
      } else {
        // New user — show profile setup
        setStep('profile');
      }
    }
  };

  // ─── STEP 3a: Create Profile (New User) ──────────────────
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

    // Set password for the user
    const { error: pwdErr } = await supabase.auth.updateUser({ password: newPassword });
    if (pwdErr) {
      setError(pwdErr.message);
      setLoading(false);
      return;
    }

    // Get current user
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      setError('Session expired. Please start over.');
      setLoading(false);
      return;
    }

    // Create profile record
    const { error: profileErr } = await supabase.from('profiles').insert({
      id: currentUser.id,
      full_name: fullName.trim(),
      admission_number: admissionNumber.trim(),
      class: classLevel,
      batch,
      email: email.trim().toLowerCase(),
    });

    setLoading(false);

    if (profileErr) {
      setError(profileErr.message);
      return;
    }

    navigate('/dashboard');
  };

  // ─── STEP 3b: Password Login (Existing User) ─────────────
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    navigate('/dashboard');
  };

  // ─── OTP Input Handlers ──────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];

    if (value.length > 1) {
      // Handle paste
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
      options: { shouldCreateUser: false },
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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-maroon-800 to-maroon-950 flex items-center justify-center shadow-md shadow-maroon-900/20">
            <Mountain className="w-5 h-5 text-amber-warm-400" strokeWidth={1.5} />
          </div>
          <h2 className="text-lg font-bold tracking-tight">
            <span className="text-maroon-900">GV</span>
            <span className="text-amber-warm-600">Connect</span>
          </h2>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex flex-col justify-center px-6 pb-12">
        <div className="w-full max-w-md mx-auto">

          {/* ─── STEP: Email ──────────────────────────── */}
          {step === 'email' && (
            <>
              <p className="text-xs font-semibold tracking-widest uppercase text-amber-warm-600 mb-2">
                Step 1 of 3
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-clean-900 tracking-tight">
                Welcome back
              </h1>
              <p className="mt-2 text-slate-clean-500 text-[15px]">
                Enter your email to receive a verification code.
              </p>

              <form onSubmit={handleSendOTP} className="mt-8 space-y-5">
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
            </>
          )}

          {/* ─── STEP: OTP ────────────────────────────── */}
          {step === 'otp' && (
            <>
              <p className="text-xs font-semibold tracking-widest uppercase text-amber-warm-600 mb-2">
                Step 2 of 3
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-clean-900 tracking-tight">
                Enter verification code
              </h1>
              <p className="mt-2 text-slate-clean-500 text-[15px]">
                We sent a 6-digit code to <span className="font-medium text-slate-clean-700">{email}</span>
              </p>

              <form onSubmit={handleVerifyOTP} className="mt-8 space-y-6">
                {/* OTP Inputs */}
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

                {/* Resend */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0}
                    className="inline-flex items-center gap-1.5 text-sm text-maroon-700 font-medium hover:text-maroon-900 disabled:text-slate-clean-400 disabled:cursor-not-allowed transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${resendCooldown > 0 ? '' : ''}`} />
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                  </button>
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => { setStep('email'); setError(''); setOtp(['', '', '', '', '', '']); }}
                    className="text-sm text-slate-clean-500 hover:text-slate-clean-700 transition-colors"
                  >
                    ← Use a different email
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ─── STEP: Profile Setup (New User) ──────── */}
          {step === 'profile' && (
            <>
              <p className="text-xs font-semibold tracking-widest uppercase text-amber-warm-600 mb-2">
                Step 3 of 3
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-clean-900 tracking-tight">
                Create your profile
              </h1>
              <p className="mt-2 text-slate-clean-500 text-[15px]">
                Welcome to the Grizzly Vidyalya family!
              </p>

              <form onSubmit={handleCreateProfile} className="mt-8 space-y-4">
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
                    Create a password for future logins
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
                  {loading ? 'Creating...' : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Create Profile & Join
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* ─── STEP: Password Login (Existing User) ── */}
          {step === 'password' && (
            <>
              <p className="text-xs font-semibold tracking-widest uppercase text-amber-warm-600 mb-2">
                Step 3 of 3
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-clean-900 tracking-tight">
                Enter your password
              </h1>
              <p className="mt-2 text-slate-clean-500 text-[15px]">
                Welcome back! Enter the password for <span className="font-medium text-slate-clean-700">{email}</span>
              </p>

              <form onSubmit={handlePasswordLogin} className="mt-8 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-clean-700 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => { setStep('email'); setError(''); setPassword(''); }}
                    className="text-sm text-slate-clean-500 hover:text-slate-clean-700 transition-colors"
                  >
                    ← Use a different email
                  </button>
                </div>
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
