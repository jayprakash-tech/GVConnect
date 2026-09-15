import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

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
  }, [activeTab]);

  // STEP 1: Send OTP
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Clear any old verified email
      setVerifiedEmail('');
      
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: window.location.origin + '/auth'
        }
      });

      if (error) {
        console.error('OTP Error:', error);
        throw error;
      }

      console.log('OTP sent to:', email);
      setSignupStep('otp');
      setResendTimer(30);
      
      // Start countdown timer
      const timer = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: otp,
        type: 'email'
      });

      if (error) {
        console.error('Verification Error:', error);
        throw error;
      }

      console.log('OTP verified! Email:', email);
      setVerifiedEmail(email);
      setSignupStep('profile');
      
    } catch (err: any) {
      setError(err.message || 'Invalid OTP');
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
      // Update the user with password
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        console.error('Update Error:', updateError);
        throw updateError;
      }

      // Insert profile into database
      const userId = updateData.user?.id;
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
    await handleSendOTP({ preventDefault: () => {} } as React.FormEvent);
  };

  // Render functions for each step
  const renderEmailStep = () => (
    <form onSubmit={handleSendOTP} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email Address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
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
        className="w-full bg-[#800020] text-[#D4AF37] py-3 rounded-lg font-semibold hover:bg-[#600018] transition-colors disabled:opacity-50"
      >
        {loading ? 'Sending...' : 'Send Verification Code →'}
      </button>
    </form>
  );

  const renderOTPStep = () => (
    <form onSubmit={handleVerifyOTP} className="space-y-4">
      <div className="text-center">
        <p className="text-gray-600 mb-2">
          We sent a 6-digit code to <span className="font-semibold">{email}</span>
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Enter Verification Code
        </label>
        <input
          type="text"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          required
          maxLength={6}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] text-center text-2xl tracking-widest"
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
        className="w-full bg-[#800020] text-[#D4AF37] py-3 rounded-lg font-semibold hover:bg-[#600018] transition-colors disabled:opacity-50"
      >
        {loading ? 'Verifying...' : 'Verify Code →'}
      </button>

      <div className="text-center space-y-2">
        {resendTimer > 0 ? (
          <p className="text-sm text-gray-600">
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
          className="text-sm text-gray-600 hover:text-gray-800 block mx-auto"
        >
          ← Use a different email
        </button>
      </div>
    </form>
  );

  const renderProfileStep = () => (
    <form onSubmit={handleCreateProfile} className="space-y-4">
      <div className="bg-[#800020] bg-opacity-10 border-l-4 border-[#800020] p-4 rounded">
        <p className="text-sm text-[#800020]">
          Email verified: <span className="font-semibold">{verifiedEmail}</span>
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Full Name
        </label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
          placeholder="Jay Prakash"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Admission Number
        </label>
        <input
          type="text"
          value={admissionNumber}
          onChange={(e) => setAdmissionNumber(e.target.value)}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
          placeholder="7552"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Class
          </label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
          >
            <option value="">Select</option>
            <option value="10th">10th</option>
            <option value="12th">12th</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Batch Year
          </label>
          <select
            value={batchYear}
            onChange={(e) => setBatchYear(e.target.value)}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
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
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
          placeholder="••••••••"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Confirm Password
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={6}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
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
        className="w-full bg-[#800020] text-[#D4AF37] py-3 rounded-lg font-semibold hover:bg-[#600018] transition-colors disabled:opacity-50"
      >
        {loading ? 'Creating Account...' : 'Create Account →'}
      </button>
    </form>
  );

  const renderLoginForm = () => (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email Address
        </label>
        <input
          type="email"
          value={loginEmail}
          onChange={(e) => setLoginEmail(e.target.value)}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
          placeholder="your@email.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Password
        </label>
        <input
          type="password"
          value={loginPassword}
          onChange={(e) => setLoginPassword(e.target.value)}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
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
        className="w-full bg-[#800020] text-[#D4AF37] py-3 rounded-lg font-semibold hover:bg-[#600018] transition-colors disabled:opacity-50"
      >
        {loading ? 'Logging in...' : 'Login →'}
      </button>
    </form>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto pt-20 px-4">
        {/* Tab Switcher */}
        <div className="bg-white rounded-lg p-1 mb-6 flex">
          <button
            onClick={() => setActiveTab('signup')}
            className={`flex-1 py-2 rounded-md font-medium transition-all ${
              activeTab === 'signup'
                ? 'bg-[#800020] text-[#D4AF37]'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            New User
          </button>
          <button
            onClick={() => setActiveTab('login')}
            className={`flex-1 py-2 rounded-md font-medium transition-all ${
              activeTab === 'login'
                ? 'bg-[#800020] text-[#D4AF37]'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Login
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {activeTab === 'signup' ? (
            <>
              <div className="mb-6">
                <p className="text-sm text-[#800020] font-semibold mb-1">
                  STEP {signupStep === 'email' ? '1' : signupStep === 'otp' ? '2' : '3'} OF 3
                </p>
                <h2 className="text-3xl font-bold text-[#800020]">
                  {signupStep === 'email' && 'Create your account'}
                  {signupStep === 'otp' && 'Verify your email'}
                  {signupStep === 'profile' && 'Complete your profile'}
                </h2>
                <p className="text-gray-600 mt-2">
                  {signupStep === 'email' && 'Enter your email to receive a verification code.'}
                  {signupStep === 'otp' && 'Enter the 6-digit code we sent to your email.'}
                  {signupStep === 'profile' && 'Tell us about yourself to join the community.'}
                </p>
              </div>

              {signupStep === 'email' && renderEmailStep()}
              {signupStep === 'otp' && renderOTPStep()}
              {signupStep === 'profile' && renderProfileStep()}
            </>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-[#800020]">Welcome Back!</h2>
                <p className="text-gray-600 mt-2">Login to your GVConnect account</p>
              </div>
              {renderLoginForm()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
