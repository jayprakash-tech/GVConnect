import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../utils/supabase/client';
import { useAuth } from '../context/AuthContext';

export function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'signup' | 'login'>('signup');
  const [signupStep, setSignupStep] = useState<'email' | 'otp' | 'profile'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [batchYear, setBatchYear] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [timerInterval, setTimerInterval] = useState<any>(null);

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Redirect if already logged in AND has completed profile
  useEffect(() => {
    const checkProfileAndRedirect = async () => {
      if (user && activeTab === 'login') {
        // Only redirect if user is on login tab (not in middle of signup)
        navigate('/dashboard');
      } else if (user && activeTab === 'signup' && signupStep === 'email') {
        // If user is logged in but on signup email step, check if they have a profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();
        
        // Only redirect if profile exists (completed signup)
        if (profile) {
          navigate('/dashboard');
        }
      }
    };
    
    checkProfileAndRedirect();
  }, [user, navigate, activeTab, signupStep]);

  // Clear all states when switching tabs
  useEffect(() => {
    setEmail('');
    setVerifiedEmail('');
    setOtp('');
    setSignupStep('email');
    setError('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setAdmissionNumber('');
    setSelectedClass('');
    setBatchYear('');
    setLoginEmail('');
    setLoginPassword('');
    setResendTimer(0);
    
    // Clear timer interval
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
  }, [activeTab]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [timerInterval]);

  // STEP 1: Send OTP
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      setVerifiedEmail('');
      setOtp(''); // Clear any previous OTP
      
      // Clear existing timer if any
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }

      const normalizedEmail = email.trim().toLowerCase();
      console.log('Attempting to send OTP to:', normalizedEmail);
      
      const { data, error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`
        }
      });

      if (error) {
        console.error('OTP Error:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          name: error.name
        });
        throw error;
      }

      console.log('OTP sent successfully!');
      console.log('Response data:', data);
      console.log('Email:', normalizedEmail);
      
      setSignupStep('otp');
      setResendTimer(30);
      
      // Start countdown timer
      const interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setTimerInterval(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      setTimerInterval(interval);

    } catch (err: any) {
      console.error('Send OTP failed:', err);
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate OTP before sending
    if (!otp || otp.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otp.trim(),
        type: 'email'
      });

      if (error) {
        console.error('Verification Error:', error);
        throw error;
      }

      if (!data || !data.session) {
        throw new Error('Verification failed. Please try again.');
      }

      console.log('OTP verified! Email:', email);
      setVerifiedEmail(email.trim().toLowerCase());
      setSignupStep('profile');
      
    } catch (err: any) {
      console.error('OTP verification failed:', err);
      const errorMessage = err.message || 'Invalid OTP code';
      
      // Provide more specific error messages
      if (errorMessage.includes('expired')) {
        setError('OTP code has expired. Please request a new code.');
      } else if (errorMessage.includes('invalid')) {
        setError('Invalid OTP code. Please check and try again.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: Create Profile
  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        console.error('Update Error:', updateError);
        throw updateError;
      }

      const userId = updateData?.user?.id;
      if (!userId) throw new Error('No user ID');

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: verifiedEmail,
          full_name: fullName,
          admission_number: admissionNumber,
          class: selectedClass,
          batch: batchYear,
        });

      if (profileError) {
        console.error('Profile Error:', profileError);
        throw profileError;
      }

      console.log('Profile created successfully!');
      alert('Account created successfully! Please login.');
      setActiveTab('login');
      setSignupStep('email');
      
    } catch (err: any) {
      console.error('Profile creation error:', err);
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword
      });

      if (error) {
        console.error('Login Error:', error);
        throw error;
      }

      console.log('Login successful!');
      navigate('/dashboard');
      
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    
    // Clear current OTP
    setOtp('');
    setError('');
    
    // Resend OTP
    try {
      setLoading(true);

      const normalizedEmail = email.trim().toLowerCase();
      console.log('Attempting to resend OTP to:', normalizedEmail);
      
      const { data, error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`
        }
      });

      if (error) {
        console.error('Resend OTP Error:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          name: error.name
        });
        throw error;
      }

      console.log('OTP resent successfully!');
      console.log('Response data:', data);
      console.log('Email:', normalizedEmail);
      
      setResendTimer(30);
      
      // Clear existing timer if any
      if (timerInterval) {
        clearInterval(timerInterval);
      }
      
      // Start new countdown timer
      const interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setTimerInterval(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      setTimerInterval(interval);
      
    } catch (err: any) {
      console.error('Resend OTP failed:', err);
      setError(err.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Professional Gradient */}
      <div className="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-[#800020] via-[#600018] to-[#800020] relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, #D4AF37 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }} />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <img
              src="/gvlogo.png"
              alt="GVConnect Logo"
              className="w-32 h-32 mx-auto mb-8"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <h2 className="text-4xl font-serif font-bold text-[#D4AF37] mb-4">
              Welcome to GVConnect
            </h2>
            <p className="text-white/80 text-lg leading-relaxed max-w-sm">
              Your journey back to Grizzly Vidyalya starts here
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Form Area */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Mobile Header */}
        <header className="lg:hidden pt-8 pb-4 px-6 bg-gradient-to-r from-[#800020] to-[#600018]">
          <div className="flex flex-col items-center gap-3">
            <img
              src="/gvlogo.png"
              alt="GVConnect Logo"
              className="w-16 h-16"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <h2 className="text-xl font-serif font-bold text-[#D4AF37]">
              GVConnect
            </h2>
          </div>
        </header>

        {/* Main Form Area */}
        <main className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-12">
          <div className="w-full max-w-md mx-auto">
            {/* Tab Switcher */}
            <div className="flex gap-2 mb-8 bg-[#fafafa] p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('signup')}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'signup'
                    ? 'bg-[#800020] text-[#D4AF37] shadow-md'
                    : 'text-[#666666] hover:text-[#800020]'
                }`}
              >
                New User
              </button>
              <button
                onClick={() => setActiveTab('login')}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'login'
                    ? 'bg-[#800020] text-[#D4AF37] shadow-md'
                    : 'text-[#666666] hover:text-[#800020]'
                }`}
              >
                Login
              </button>
            </div>

            {/* Signup Flow */}
            {activeTab === 'signup' && (
              <motion.div
                key={signupStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Step Indicator */}
                <div className="mb-6">
                  <p className="text-xs font-semibold tracking-widest uppercase text-[#D4AF37] mb-2">
                    STEP {signupStep === 'email' ? '1' : signupStep === 'otp' ? '2' : '3'} OF 3
                  </p>
                  <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#800020] tracking-tight">
                    {signupStep === 'email' && 'Create your account'}
                    {signupStep === 'otp' && 'Verify your email'}
                    {signupStep === 'profile' && 'Complete your profile'}
                  </h1>
                  <p className="mt-2 text-[#666666] text-[15px]">
                    {signupStep === 'email' && 'Enter your email to receive a verification code.'}
                    {signupStep === 'otp' && 'Enter the 6-digit code we sent to your email.'}
                    {signupStep === 'profile' && 'Tell us about yourself to join the community.'}
                  </p>
                </div>

                {/* Email Step */}
                {signupStep === 'email' && (
                  <form onSubmit={handleSendOTP} className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] transition-all"
                        placeholder="your@email.com"
                      />
                    </div>
                    
                    {error && (
                      <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 px-6 rounded-xl font-semibold text-[15px] bg-[#800020] text-[#D4AF37] hover:bg-[#600018] active:scale-[0.98] shadow-lg shadow-[#800020]/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {loading ? 'Sending...' : 'Send Verification Code →'}
                    </button>
                  </form>
                )}

                {/* OTP Step */}
                {signupStep === 'otp' && (
                  <form onSubmit={handleVerifyOTP} className="space-y-5">
                    <div className="text-center mb-4">
                      <p className="text-[#666666]">
                        We sent a 6-digit code to <span className="font-semibold text-[#800020]">{email}</span>
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                        Enter Verification Code
                      </label>
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        required
                        maxLength={6}
                        className="w-full px-4 py-3 border border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] transition-all text-center text-2xl tracking-widest"
                        placeholder="000000"
                      />
                    </div>
                    
                    {error && (
                      <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading || otp.length !== 6}
                      className="w-full py-3.5 px-6 rounded-xl font-semibold text-[15px] bg-[#800020] text-[#D4AF37] hover:bg-[#600018] active:scale-[0.98] shadow-lg shadow-[#800020]/20 disabled:opacity-50 transition-all"
                    >
                      {loading ? 'Verifying...' : 'Verify Code →'}
                    </button>

                    <div className="text-center space-y-3">
                      {resendTimer > 0 ? (
                        <p className="text-sm text-[#666666]">
                          Resend in {resendTimer}s
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResendOTP}
                          className="text-sm text-[#800020] hover:text-[#600018] font-medium"
                        >
                          ↻ Resend Code
                        </button>
                      )}
                      
                      <button
                        type="button"
                        onClick={() => {
                          setSignupStep('email');
                          setEmail('');
                          setOtp('');
                          setError('');
                        }}
                        className="text-sm text-[#666666] hover:text-[#1a1a1a] block mx-auto"
                      >
                        ← Use a different email
                      </button>
                    </div>
                  </form>
                )}

                {/* Profile Step */}
                {signupStep === 'profile' && (
                  <form onSubmit={handleCreateProfile} className="space-y-4">
                    <div className="bg-[#800020]/10 border-l-4 border-[#800020] p-4 rounded">
                      <p className="text-sm text-[#800020]">
                        Email verified: <span className="font-semibold">{verifiedEmail}</span>
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] transition-all"
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                        Admission Number
                      </label>
                      <input
                        type="text"
                        value={admissionNumber}
                        onChange={(e) => setAdmissionNumber(e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] transition-all"
                        placeholder="Enter your admission number"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                          Class
                        </label>
                        <select
                          value={selectedClass}
                          onChange={(e) => setSelectedClass(e.target.value)}
                          required
                          className="w-full px-4 py-3 border border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] transition-all"
                        >
                          <option value="">Select</option>
                          <option value="10th">10th</option>
                          <option value="12th">12th</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                          Batch Year
                        </label>
                        <select
                          value={batchYear}
                          onChange={(e) => setBatchYear(e.target.value)}
                          required
                          className="w-full px-4 py-3 border border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] transition-all"
                        >
                          <option value="">Select</option>
                          {[...Array(10)].map((_, i) => (
                            <option key={i} value={(2026 - i).toString()}>
                              {2026 - i}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                        Password
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full px-4 py-3 border border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] transition-all"
                        placeholder="••••••••"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full px-4 py-3 border border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                    
                    {error && (
                      <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 px-6 rounded-xl font-semibold text-[15px] bg-[#800020] text-[#D4AF37] hover:bg-[#600018] active:scale-[0.98] shadow-lg shadow-[#800020]/20 disabled:opacity-50 transition-all"
                    >
                      {loading ? 'Creating Account...' : 'Create Account →'}
                    </button>
                  </form>
                )}
              </motion.div>
            )}

            {/* Login Form */}
            {activeTab === 'login' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-6">
                  <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#800020] tracking-tight">
                    Welcome Back!
                  </h1>
                  <p className="mt-2 text-[#666666] text-[15px]">
                    Login to your GVConnect account
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] transition-all"
                      placeholder="your@email.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                      Password
                    </label>
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                  
                  {error && (
                    <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-6 rounded-xl font-semibold text-[15px] bg-[#800020] text-[#D4AF37] hover:bg-[#600018] active:scale-[0.98] shadow-lg shadow-[#800020]/20 disabled:opacity-50 transition-all"
                  >
                    {loading ? 'Logging in...' : 'Login →'}
                  </button>
                </form>
              </motion.div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="pb-6 text-center">
          <p className="text-[#666666] text-[11px] tracking-wide">
            Grizzly Vidyalya Alumni Network
          </p>
        </footer>
      </div>
    </div>
  );
}
