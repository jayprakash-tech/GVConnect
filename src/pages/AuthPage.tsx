import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  Mail,
  KeyRound,
  Fingerprint,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SecurityPuzzle } from '../components/SecurityPuzzle';
import {
  checkLiveEmailVerification,
  checkUsernameAvailability,
  completeProfileSetup,
  getDeviceLabel,
  getUserProfile,
  isUsingDemoFallback,
  loginWithOAuthProvider,
  loginWithPasskey,
  resendVerificationLink,
  sendNewDeviceOtp,
  sendPasswordReset,
  validatePasswordPolicy,
  validateUsernameFormat,
  verifyEmailWithToken,
  verifyNewDeviceOtp,
} from '../services/authService';

type AuthTab = 'signup' | 'login';
type SignupStep = 'credentials' | 'verify' | 'onboarding';
type LoginStep = 'form' | 'device_otp';

const CLASS_OPTIONS = [
  'Nursery',
  'LKG',
  'UKG',
  '1st',
  '2nd',
  '3rd',
  '4th',
  '5th',
  '6th',
  '7th',
  '8th',
  '9th',
  '10th',
  '11th',
  '12th',
];

const BATCH_OPTIONS = Array.from({ length: 26 }, (_, i) => String(2026 - i));

const ONBOARDING_GOALS = [
  'Reconnect with batchmates',
  'Career & mentorship',
  'Campus events & reunions',
  'Mentor current students',
];

export function AuthPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, deviceVerified, isDemoMode, refreshAuth, signUp, signIn } = useAuth();

  const initialTab: AuthTab = searchParams.get('mode') === 'login' ? 'login' : 'signup';
  const [activeTab, setActiveTab] = useState<AuthTab>(initialTab);

  // Sign Up state
  const [signupStep, setSignupStep] = useState<SignupStep>('credentials');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    message: string;
  }>({ checking: false, available: null, message: '' });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2: Puzzle + Verification link
  const [puzzleSolved, setPuzzleSolved] = useState(false);
  const [verificationLinkSent, setVerificationLinkSent] = useState(false);
  const [emailVerifiedConfirmed, setEmailVerifiedConfirmed] = useState(false);
  const [demoVerifyUrl, setDemoVerifyUrl] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  // Step 3: Profile Setup & Compliance Onboarding
  const [verifiedUserId, setVerifiedUserId] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [verifiedUsername, setVerifiedUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [batchYear, setBatchYear] = useState('');
  const [complianceAccepted, setComplianceAccepted] = useState(false);
  const [onboardingGoal, setOnboardingGoal] = useState(ONBOARDING_GOALS[0]);
  const [onboardingBio, setOnboardingBio] = useState('');

  // Login state
  const [loginStep, setLoginStep] = useState<LoginStep>('form');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // New-Device OTP state
  const [otpTargetEmail, setOtpTargetEmail] = useState('');
  const [otpTargetUserId, setOtpTargetUserId] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [trustThisDevice, setTrustThisDevice] = useState(true);
  const [demoOtpCode, setDemoOtpCode] = useState('');
  const [otpResendTimer, setOtpResendTimer] = useState(0);

  // Demo OAuth email chooser modal (when Supabase isn't configured)
  const [demoOAuthPrompt, setDemoOAuthPrompt] = useState<{
    provider: 'google' | 'apple';
    mode: 'signup' | 'login';
    email: string;
  } | null>(null);

  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordPolicy = validatePasswordPolicy(password);

  // Sync tab with URL query param (?mode=signup | ?mode=login)
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'login' || mode === 'signup') {
      setActiveTab(mode);
    }
  }, [searchParams]);

  // Handle verification link callback (?verify_token=...) or Supabase post-verification session (?code=... / ?verified=true)
  useEffect(() => {
    const token = searchParams.get('verify_token');
    const pkceCode = new URLSearchParams(window.location.search).get('code') || searchParams.get('code');
    const verifiedFlag = searchParams.get('verified') === 'true';

    if (!token && !pkceCode && !verifiedFlag) return;

    let cancelled = false;
    setLoading(true);
    setError('');

    if (token) {
      verifyEmailWithToken(token)
        .then(async (verifiedUser) => {
          if (cancelled) return;
          await refreshAuth();
          setActiveTab('signup');
          setEmailVerifiedConfirmed(true);
          setVerifiedUserId(verifiedUser.id);
          setVerifiedEmail(verifiedUser.email);
          setVerifiedUsername(verifiedUser.username || '');
          setSignupStep('onboarding');
          setInfoMessage(
            'Email verified! Complete your Batch compliance and onboarding to open your dashboard.'
          );
          setSearchParams({ mode: 'signup' }, { replace: true });
        })
        .catch((err: any) => {
          if (cancelled) return;
          setEmailVerifiedConfirmed(false);
          setError(err.message || 'Verification link is invalid or expired.');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    } else {
      checkLiveEmailVerification(pkceCode || undefined)
        .then(async (res) => {
          if (cancelled) return;
          if (res.verified && res.user) {
            await refreshAuth();
            setActiveTab('signup');
            setEmailVerifiedConfirmed(true);
            setVerifiedUserId(res.user.id);
            setVerifiedEmail(res.user.email);
            setVerifiedUsername(res.user.username || '');
            setSignupStep('onboarding');
            setInfoMessage(
              'Email verified! Complete your Batch compliance and onboarding to open your dashboard.'
            );
            setSearchParams({ mode: 'signup' }, { replace: true });
          } else {
            setEmailVerifiedConfirmed(false);
            setActiveTab('signup');
            setSignupStep('verify');
            setPuzzleSolved(true);
            setVerificationLinkSent(true);
            setError(
              'Email verification is not completed yet. Please click the verification link in your email inbox.'
            );
          }
        })
        .catch(() => {
          if (!cancelled) {
            setEmailVerifiedConfirmed(false);
            setError('Could not confirm email verification status. Please try the link in your email again.');
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [searchParams, refreshAuth, setSearchParams]);

  // Handle authenticated user routing (OAuth return, verified email return, or untrusted device OTP)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const evaluateSession = async () => {
      // Never treat an unverified account as verified or advance to onboarding
      if (!user.email_verified) {
        setActiveTab('signup');
        setSignupStep('verify');
        setPuzzleSolved(true);
        setVerificationLinkSent(true);
        setEmailVerifiedConfirmed(false);
        setVerifiedUserId(user.id);
        setVerifiedEmail(user.email);
        setVerifiedUsername(user.username || user.email.split('@')[0]);
        return;
      }

      const profile = await getUserProfile(user.id);
      if (cancelled) return;

      if (!profile) {
        // User verified email or signed in via OAuth for the first time -> Onboarding
        setActiveTab('signup');
        setEmailVerifiedConfirmed(true);
        setVerifiedUserId(user.id);
        setVerifiedEmail(user.email);
        setVerifiedUsername(user.username || user.email.split('@')[0]);
        setSignupStep('onboarding');
        return;
      }

      if (!deviceVerified) {
        // Logged in on a new/unrecognized device -> force OTP challenge
        setActiveTab('login');
        setLoginStep('device_otp');
        setOtpTargetEmail(user.email);
        setOtpTargetUserId(user.id);
        if (!demoOtpCode && isUsingDemoFallback()) {
          const res = await sendNewDeviceOtp(user.email, user.id);
          if (!cancelled && res.demoOtp) {
            setDemoOtpCode(res.demoOtp);
          }
        }
        return;
      }

      // Fully verified & onboarded -> Dashboard
      navigate('/dashboard', { replace: true });
    };

    evaluateSession();

    return () => {
      cancelled = true;
    };
  }, [user, deviceVerified, navigate, demoOtpCode]);

  // Debounced live username availability check during Sign Up
  useEffect(() => {
    if (activeTab !== 'signup' || signupStep !== 'credentials') return;
    if (!username.trim()) {
      setUsernameStatus({ checking: false, available: null, message: '' });
      return;
    }

    const format = validateUsernameFormat(username);
    if (!format.valid) {
      setUsernameStatus({
        checking: false,
        available: false,
        message: format.message || 'Invalid username format',
      });
      return;
    }

    setUsernameStatus({ checking: true, available: null, message: 'Checking availability...' });
    const handle = setTimeout(async () => {
      const result = await checkUsernameAvailability(username);
      setUsernameStatus({
        checking: false,
        available: result.available,
        message: result.message,
      });
    }, 300);

    return () => clearTimeout(handle);
  }, [username, activeTab, signupStep]);

  // Countdown timers
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((prev) => prev - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  useEffect(() => {
    if (otpResendTimer <= 0) return;
    const t = setTimeout(() => setOtpResendTimer((prev) => prev - 1), 1000);
    return () => clearTimeout(t);
  }, [otpResendTimer]);

  const switchTab = (tab: AuthTab) => {
    setActiveTab(tab);
    setSearchParams({ mode: tab }, { replace: true });
    setError('');
    setInfoMessage('');
    if (tab === 'signup') {
      setSignupStep('credentials');
      setPuzzleSolved(false);
      setVerificationLinkSent(false);
      setEmailVerifiedConfirmed(false);
      setDemoVerifyUrl('');
    } else {
      setLoginStep('form');
      setOtpCode('');
      setDemoOtpCode('');
    }
  };

  // Sign Up Step 1 -> Step 2 (Puzzle & Email Link)
  const handleCredentialsContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    if (!passwordPolicy.valid) {
      setError(
        'Password must be at least 15 characters, or 8+ characters including a lowercase letter and a number.'
      );
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const check = await checkUsernameAvailability(username);
      if (!check.available) {
        setUsernameStatus({ checking: false, available: false, message: check.message });
        setError(check.message);
        return;
      }

      setSignupStep('verify');
      setPuzzleSolved(false);
      setVerificationLinkSent(false);
    } finally {
      setLoading(false);
    }
  };

  // Sign Up Step 2: Send Verification Link after Security Puzzle solved
  const handleSendVerificationLink = async () => {
    if (!puzzleSolved) {
      setError('Please solve the security puzzle first.');
      return;
    }

    setError('');
    setInfoMessage('');
    setLoading(true);

    try {
      const result = await signUp({
        email,
        username,
        password,
      });

      setVerifiedUserId(result.userId);
      setVerifiedEmail(result.email);
      setVerifiedUsername(result.username);

      if (result.emailVerified === true && !result.needsEmailVerification) {
        setEmailVerifiedConfirmed(true);
        setSignupStep('onboarding');
      } else {
        setEmailVerifiedConfirmed(false);
        setVerificationLinkSent(true);
        setResendTimer(30);
        setDemoVerifyUrl(result.demoVerifyUrl || '');
      }
    } catch (err: any) {
      setError(err.message || 'Could not send verification link.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerificationLink = async () => {
    if (resendTimer > 0) return;
    setError('');
    setLoading(true);
    try {
      const result = await resendVerificationLink(verifiedEmail || email);
      if (result.demoVerifyUrl) {
        setDemoVerifyUrl(result.demoVerifyUrl);
      }
      setResendTimer(30);
      setInfoMessage('A fresh verification link has been sent to your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification link.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDemoVerifyLink = async () => {
    if (!demoVerifyUrl) return;
    const urlObj = new URL(demoVerifyUrl);
    const hashQuery = urlObj.hash.split('?')[1] || '';
    const params = new URLSearchParams(hashQuery);
    const token = params.get('verify_token');
    if (!token) return;

    setLoading(true);
    setError('');
    try {
      const verifiedUser = await verifyEmailWithToken(token);
      await refreshAuth();
      setEmailVerifiedConfirmed(true);
      setVerifiedUserId(verifiedUser.id);
      setVerifiedEmail(verifiedUser.email);
      setVerifiedUsername(verifiedUser.username || '');
      setSignupStep('onboarding');
      setInfoMessage('Email verified! Finish your Batch compliance and onboarding below.');
    } catch (err: any) {
      setError(err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckLiveVerification = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await checkLiveEmailVerification();
      if (res.verified && res.user) {
        await refreshAuth();
        setEmailVerifiedConfirmed(true);
        setVerifiedUserId(res.user.id);
        setVerifiedEmail(res.user.email);
        setVerifiedUsername(res.user.username || '');
        setSignupStep('onboarding');
        setInfoMessage('Email verified! Finish your Batch compliance and onboarding below.');
      } else {
        setEmailVerifiedConfirmed(false);
        setError('Your email is not verified yet. Please click the verification link sent to your inbox first.');
      }
    } catch (err: any) {
      setError(err.message || 'Could not verify email status yet.');
    } finally {
      setLoading(false);
    }
  };

  // Sign Up Step 3: Batch Compliance & Onboarding -> Auto-Login to Dashboard
  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!emailVerifiedConfirmed && !user?.email_verified) {
      setSignupStep('verify');
      setVerificationLinkSent(true);
      setError('Please verify your email address before completing onboarding.');
      return;
    }

    if (!batchYear) {
      setError('Please select your Batch year for compliance.');
      return;
    }
    if (!complianceAccepted) {
      setError('Please confirm your Batch compliance and alumni guidelines.');
      return;
    }

    const activeUserId = verifiedUserId || user?.id;
    const activeEmail = verifiedEmail || user?.email || email;
    const activeUsername = verifiedUsername || user?.username || username;

    if (!activeUserId) {
      setError('Verification session missing. Please verify your email first.');
      return;
    }

    setLoading(true);
    try {
      await completeProfileSetup(activeUserId, {
        email: activeEmail,
        username: activeUsername,
        full_name: fullName,
        admission_number: admissionNumber,
        class: selectedClass,
        batch: batchYear,
        compliance_accepted: complianceAccepted,
        onboarding_goal: onboardingGoal,
        onboarding_bio: onboardingBio,
      });

      await refreshAuth();
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to complete onboarding.');
    } finally {
      setLoading(false);
    }
  };

  // Existing User Login (Username or Email + Password)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setLoading(true);

    try {
      const result = await signIn({
        identifier: loginIdentifier,
        password: loginPassword,
      });

      if (result.status === 'email_verification_required') {
        setActiveTab('signup');
        setSignupStep('verify');
        setPuzzleSolved(true);
        setVerificationLinkSent(true);
        setEmailVerifiedConfirmed(false);
        setVerifiedUserId(result.userId);
        setVerifiedEmail(result.email);
        setVerifiedUsername(result.username || '');
        setDemoVerifyUrl(result.demoVerifyUrl || '');
        setError('Please verify your email address before logging in.');
        return;
      }

      if (result.status === 'needs_onboarding') {
        setActiveTab('signup');
        setEmailVerifiedConfirmed(true);
        setVerifiedUserId(result.userId);
        setVerifiedEmail(result.email);
        setVerifiedUsername(result.username || '');
        setSignupStep('onboarding');
        return;
      }

      if (result.status === 'otp_required') {
        setLoginStep('device_otp');
        setOtpTargetEmail(result.email);
        setOtpTargetUserId(result.userId);
        setDemoOtpCode(result.demoOtp || '');
        setOtpResendTimer(30);
        return;
      }

      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Google / Apple OAuth handler
  const handleOAuthClick = async (provider: 'google' | 'apple', mode: 'signup' | 'login') => {
    setError('');
    setInfoMessage('');

    if (isDemoMode || isUsingDemoFallback()) {
      setDemoOAuthPrompt({
        provider,
        mode,
        email:
          provider === 'google' ? 'grizzlian.google@gmail.com' : 'grizzlian.apple@icloud.com',
      });
      return;
    }

    setLoading(true);
    try {
      const result = await loginWithOAuthProvider(provider, mode);
      if (result.status !== 'redirecting') {
        await refreshAuth();
        if (result.status === 'needs_onboarding') {
          setActiveTab('signup');
          setEmailVerifiedConfirmed(true);
          setVerifiedUserId(result.userId || '');
          setVerifiedEmail(result.email || '');
          setVerifiedUsername(result.username || '');
          setSignupStep('onboarding');
        } else if (result.status === 'otp_required') {
          setActiveTab('login');
          setLoginStep('device_otp');
          setOtpTargetEmail(result.email || '');
          setOtpTargetUserId(result.userId || '');
          setDemoOtpCode(result.demoOtp || '');
          setOtpResendTimer(30);
        } else {
          navigate('/dashboard', { replace: true });
        }
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || `Could not sign in with ${provider}.`);
      setLoading(false);
    }
  };

  const handleConfirmDemoOAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoOAuthPrompt) return;

    const { provider, mode, email: oauthEmail } = demoOAuthPrompt;
    setDemoOAuthPrompt(null);
    setLoading(true);
    setError('');

    try {
      const result = await loginWithOAuthProvider(provider, mode, oauthEmail);
      await refreshAuth();

      if (result.status === 'needs_onboarding') {
        setActiveTab('signup');
        setEmailVerifiedConfirmed(true);
        setVerifiedUserId(result.userId || '');
        setVerifiedEmail(result.email || oauthEmail);
        setVerifiedUsername(result.username || '');
        setSignupStep('onboarding');
        setInfoMessage(
          `Connected with ${provider === 'google' ? 'Google' : 'Apple'}. Complete your Batch compliance to enter your dashboard.`
        );
        return;
      }

      if (result.status === 'otp_required') {
        setActiveTab('login');
        setLoginStep('device_otp');
        setOtpTargetEmail(result.email || oauthEmail);
        setOtpTargetUserId(result.userId || '');
        setDemoOtpCode(result.demoOtp || '');
        setOtpResendTimer(30);
        return;
      }

      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'OAuth sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  // Passkey Login
  const handlePasskeyLogin = async () => {
    setError('');
    setInfoMessage('');
    setLoading(true);
    try {
      const result = await loginWithPasskey(loginIdentifier);
      await refreshAuth();

      if (result.status === 'otp_required') {
        setLoginStep('device_otp');
        setOtpTargetEmail(result.email);
        setOtpTargetUserId(result.userId);
        setDemoOtpCode(result.demoOtp || '');
        setOtpResendTimer(30);
        return;
      }

      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Passkey sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  // New-Device OTP verification
  const handleVerifyDeviceOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyNewDeviceOtp({
        email: otpTargetEmail,
        userId: otpTargetUserId || user?.id || '',
        code: otpCode,
        trustDevice: trustThisDevice,
      });
      await refreshAuth();
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendDeviceOtp = async () => {
    if (otpResendTimer > 0 || !otpTargetEmail) return;
    setError('');
    setLoading(true);
    try {
      const res = await sendNewDeviceOtp(otpTargetEmail, otpTargetUserId);
      if (res.demoOtp) setDemoOtpCode(res.demoOtp);
      setOtpResendTimer(30);
      setInfoMessage('A new 6-digit verification code has been sent.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!loginIdentifier.trim()) {
      setError('Enter your username or email address first to reset your password.');
      return;
    }
    setError('');
    setInfoMessage('');
    setLoading(true);
    try {
      const sentEmail = await sendPasswordReset(loginIdentifier);
      setInfoMessage(`Password reset instructions sent to ${sentEmail}.`);
    } catch (err: any) {
      setError(err.message || 'Could not send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  const stepIndex = signupStep === 'credentials' ? 1 : signupStep === 'verify' ? 2 : 3;

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Brand Panel */}
      <div className="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-[#800020] via-[#600018] to-[#800020] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, #D4AF37 1px, transparent 0)',
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12 text-center">
          <Link to="/">
            <img
              src="/gvlogo.png"
              alt="GVConnect Logo"
              className="w-28 h-28 mx-auto mb-8"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </Link>
          <h2 className="text-4xl font-serif font-bold text-[#D4AF37] mb-4">
            Welcome to GVConnect
          </h2>
          <p className="text-white/80 text-lg leading-relaxed max-w-sm">
            Reconnect with Grizzly Vidyalya alumni worldwide with verified batch credentials.
          </p>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Mobile Header */}
        <header className="lg:hidden py-6 px-6 bg-gradient-to-r from-[#800020] to-[#600018]">
          <Link to="/" className="flex items-center justify-center gap-3">
            <img
              src="/gvlogo.png"
              alt="GVConnect Logo"
              className="w-12 h-12"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <span className="text-xl font-serif font-bold text-[#D4AF37]">GVConnect</span>
          </Link>
        </header>

        <main className="flex-1 flex flex-col justify-center px-6 py-10 lg:px-12">
          <div className="w-full max-w-md mx-auto">
            {/* Segmented Auth Mode Tabs */}
            <div className="flex gap-1.5 mb-8 bg-[#fafafa] p-1 rounded-xl border border-[#e5e5e5]">
              <button
                type="button"
                onClick={() => switchTab('signup')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === 'signup'
                    ? 'bg-[#800020] text-[#D4AF37]'
                    : 'text-[#525252] hover:text-[#800020]'
                }`}
              >
                Sign Up
              </button>
              <button
                type="button"
                onClick={() => switchTab('login')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === 'login'
                    ? 'bg-[#800020] text-[#D4AF37]'
                    : 'text-[#525252] hover:text-[#800020]'
                }`}
              >
                Login
              </button>
            </div>

            {infoMessage && (
              <div className="mb-5 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] p-3.5 text-sm text-[#166534] flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{infoMessage}</span>
              </div>
            )}

            {error && (
              <div className="mb-5 rounded-xl border border-[#fecaca] bg-[#fef2f2] p-3.5 text-sm text-[#b91c1c] flex items-start gap-2.5">
                <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* ===================== SIGN UP FLOW ===================== */}
            {activeTab === 'signup' && (
              <motion.div
                key={signupStep}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
              >
                <div className="mb-6">
                  <p className="text-xs font-semibold text-[#800020] mb-1.5 tabular-nums">
                    Step {stepIndex} of 3 ·{' '}
                    {signupStep === 'credentials'
                      ? 'Account Credentials'
                      : signupStep === 'verify'
                        ? 'Security & Email Verification'
                        : 'Profile & Batch Compliance'}
                  </p>
                  <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1a1a1a] tracking-tight">
                    {signupStep === 'credentials' && 'Create your account'}
                    {signupStep === 'verify' && 'Verify your account'}
                    {signupStep === 'onboarding' && 'Complete profile setup'}
                  </h1>
                  <p className="mt-1.5 text-[#525252] text-[15px]">
                    {signupStep === 'credentials' &&
                      'Enter your email, choose a unique username, and set a strong password.'}
                    {signupStep === 'verify' &&
                      'Solve the quick security puzzle and confirm via the verification link sent to your email.'}
                    {signupStep === 'onboarding' &&
                      'Select your Batch for compliance and finish onboarding to enter your dashboard.'}
                  </p>
                </div>

                {/* SIGN UP STEP 1: CREDENTIALS */}
                {signupStep === 'credentials' && (
                  <div className="space-y-5">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleOAuthClick('google', 'signup')}
                      className="w-full py-3 px-4 rounded-xl border border-[#e5e5e5] bg-white hover:bg-[#fafafa] text-[#1a1a1a] font-semibold text-sm flex items-center justify-center gap-3 transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                        />
                      </svg>
                      Continue with Google
                    </button>

                    <div className="relative flex items-center py-1">
                      <div className="flex-grow border-t border-[#e5e5e5]" />
                      <span className="mx-3 text-xs text-[#737373] font-medium">
                        or register with email
                      </span>
                      <div className="flex-grow border-t border-[#e5e5e5]" />
                    </div>

                    <form onSubmit={handleCredentialsContinue} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="w-full px-4 py-3 border border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020] transition-all text-[15px]"
                          placeholder="you@example.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                          Unique Username
                        </label>
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                          required
                          minLength={3}
                          maxLength={24}
                          className="w-full px-4 py-3 border border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020] transition-all text-[15px]"
                          placeholder="e.g., rahul.sharma18"
                        />
                        {usernameStatus.message && (
                          <p
                            className={`mt-1.5 text-xs flex items-center gap-1.5 ${
                              usernameStatus.checking
                                ? 'text-[#525252]'
                                : usernameStatus.available
                                  ? 'text-[#166534]'
                                  : 'text-[#b91c1c]'
                            }`}
                          >
                            {usernameStatus.checking ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : usernameStatus.available ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5" />
                            )}
                            {usernameStatus.message}
                          </p>
                        )}
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
                          className="w-full px-4 py-3 border border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020] transition-all text-[15px]"
                          placeholder="Create a strong password"
                        />

                        {/* Live Password Policy Checklist */}
                        <div className="mt-2.5 rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-3 text-xs space-y-1.5">
                          <p className="font-semibold text-[#1a1a1a]">
                            Password must meet either rule:
                          </p>
                          <p
                            className={`flex items-center gap-1.5 ${
                              passwordPolicy.meetsLongRule ? 'text-[#166534] font-medium' : 'text-[#525252]'
                            }`}
                          >
                            {passwordPolicy.meetsLongRule ? (
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            ) : (
                              <span className="w-3.5 h-3.5 inline-flex items-center justify-center rounded-full border border-[#a3a3a3] text-[9px] shrink-0">
                                •
                              </span>
                            )}
                            <span className="tabular-nums">
                              At least 15 characters ({passwordPolicy.length}/15)
                            </span>
                          </p>
                          <p className="text-[#737373] pl-5 font-medium">OR</p>
                          <p
                            className={`flex items-center gap-1.5 ${
                              passwordPolicy.meetsCompositeRule
                                ? 'text-[#166534] font-medium'
                                : 'text-[#525252]'
                            }`}
                          >
                            {passwordPolicy.meetsCompositeRule ? (
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            ) : (
                              <span className="w-3.5 h-3.5 inline-flex items-center justify-center rounded-full border border-[#a3a3a3] text-[9px] shrink-0">
                                •
                              </span>
                            )}
                            <span>
                              8+ characters including a number and a lowercase letter
                            </span>
                          </p>
                        </div>
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
                          className="w-full px-4 py-3 border border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020] transition-all text-[15px]"
                          placeholder="Re-enter password"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading || usernameStatus.checking}
                        className="w-full py-3.5 px-6 rounded-xl font-semibold text-[15px] bg-[#800020] text-[#D4AF37] hover:bg-[#600018] active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                      >
                        Continue to Verification
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                )}

                {/* SIGN UP STEP 2: SECURITY PUZZLE + EMAIL VERIFICATION LINK */}
                {signupStep === 'verify' && (
                  <div className="space-y-5">
                    {!verificationLinkSent ? (
                      <>
                        <SecurityPuzzle
                          solved={puzzleSolved}
                          onSolved={() => {
                            setPuzzleSolved(true);
                            setError('');
                          }}
                        />

                        <button
                          type="button"
                          disabled={!puzzleSolved || loading}
                          onClick={handleSendVerificationLink}
                          className="w-full py-3.5 px-6 rounded-xl font-semibold text-[15px] bg-[#800020] text-[#D4AF37] hover:bg-[#600018] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                        >
                          <Mail className="w-4 h-4" />
                          {loading ? 'Sending Verification Link...' : 'Send Verification Link'}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSignupStep('credentials');
                            setError('');
                          }}
                          className="w-full text-sm text-[#525252] hover:text-[#1a1a1a] py-1"
                        >
                          ← Edit email or username
                        </button>
                      </>
                    ) : (
                      <div className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-5 space-y-4">
                        <div className="flex items-start gap-3">
                          <Mail className="w-5 h-5 text-[#800020] mt-0.5 shrink-0" />
                          <div>
                            <h2 className="text-base font-semibold text-[#1a1a1a]">
                              Verification link sent
                            </h2>
                            <p className="text-sm text-[#525252] mt-1">
                              We sent an account verification link to{' '}
                              <span className="font-semibold text-[#1a1a1a]">{verifiedEmail}</span>.
                              Click the link in your email to verify your account and continue to Batch setup.
                            </p>
                          </div>
                        </div>

                        {demoVerifyUrl ? (
                          <div className="rounded-lg border border-[#D4AF37]/60 bg-white p-4 space-y-2.5">
                            <p className="text-xs font-semibold text-[#800020]">
                              Preview Verification Inbox
                            </p>
                            <p className="text-xs text-[#525252]">
                              Email delivery is running in preview mode. Open your verification link directly below to verify your email:
                            </p>
                            <button
                              type="button"
                              disabled={loading}
                              onClick={handleOpenDemoVerifyLink}
                              className="w-full py-2.5 px-4 rounded-lg bg-[#800020] text-[#D4AF37] text-xs font-semibold hover:bg-[#600018] transition-colors flex items-center justify-center gap-2"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              {loading ? 'Verifying...' : 'Open Verification Link & Continue'}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={loading}
                            onClick={handleCheckLiveVerification}
                            className="w-full py-2.5 px-4 rounded-lg bg-[#800020] text-[#D4AF37] text-xs font-semibold hover:bg-[#600018] transition-colors flex items-center justify-center gap-2"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {loading ? 'Checking Verification...' : "I've Verified My Email — Continue"}
                          </button>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-[#e5e5e5] text-sm">
                          {resendTimer > 0 ? (
                            <span className="text-[#525252] tabular-nums">
                              Resend link in {resendTimer}s
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={handleResendVerificationLink}
                              disabled={loading}
                              className="text-[#800020] font-semibold hover:underline"
                            >
                              Resend verification link
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setVerificationLinkSent(false);
                              setEmailVerifiedConfirmed(false);
                              setSignupStep('credentials');
                            }}
                            className="text-[#525252] hover:text-[#1a1a1a]"
                          >
                            Change email
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* SIGN UP STEP 3: BATCH COMPLIANCE & ONBOARDING */}
                {signupStep === 'onboarding' && (
                  <form onSubmit={handleCompleteOnboarding} className="space-y-4">
                    {(emailVerifiedConfirmed || user?.email_verified) && (
                      <div className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] px-4 py-3 text-xs text-[#525252] flex flex-wrap items-center gap-x-2 gap-y-1">
                        <CheckCircle2 className="w-4 h-4 text-[#166534] shrink-0" />
                        <span>
                          Verified: <strong className="text-[#1a1a1a]">{verifiedEmail}</strong>
                        </span>
                        {verifiedUsername && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>@{verifiedUsername}</span>
                          </>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020] text-[15px]"
                        placeholder="e.g., Rahul Sharma"
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
                        className="w-full px-4 py-3 border border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020] text-[15px]"
                        placeholder="e.g., GV-2018-045"
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
                          className="w-full px-4 py-3 border border-[#e5e5e5] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020] text-[15px]"
                        >
                          <option value="">Select</option>
                          {CLASS_OPTIONS.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                          Batch Year (Compliance)
                        </label>
                        <select
                          value={batchYear}
                          onChange={(e) => setBatchYear(e.target.value)}
                          required
                          className="w-full px-4 py-3 border border-[#e5e5e5] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020] text-[15px]"
                        >
                          <option value="">Select Batch</option>
                          {BATCH_OPTIONS.map((yr) => (
                            <option key={yr} value={yr}>
                              {yr}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Onboarding Prompts */}
                    <div>
                      <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                        What brings you to GVConnect?
                      </label>
                      <select
                        value={onboardingGoal}
                        onChange={(e) => setOnboardingGoal(e.target.value)}
                        className="w-full px-4 py-3 border border-[#e5e5e5] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020] text-[15px]"
                      >
                        {ONBOARDING_GOALS.map((goal) => (
                          <option key={goal} value={goal}>
                            {goal}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                        Current Role or City (Optional)
                      </label>
                      <input
                        type="text"
                        value={onboardingBio}
                        onChange={(e) => setOnboardingBio(e.target.value)}
                        className="w-full px-4 py-3 border border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020] text-[15px]"
                        placeholder="e.g., Product Engineer · Bengaluru"
                      />
                    </div>

                    <label className="flex items-start gap-3 rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-3.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={complianceAccepted}
                        onChange={(e) => setComplianceAccepted(e.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-[#800020]"
                      />
                      <span className="text-xs text-[#404040] leading-relaxed">
                        I confirm my selected Batch year is accurate for alumni verification compliance and agree to the GVConnect community guidelines.
                      </span>
                    </label>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 px-6 rounded-xl font-semibold text-[15px] bg-[#800020] text-[#D4AF37] hover:bg-[#600018] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {loading ? 'Finishing Setup...' : 'Finish Onboarding & Open Dashboard'}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                )}
              </motion.div>
            )}

            {/* ===================== LOGIN FLOW ===================== */}
            {activeTab === 'login' && (
              <motion.div
                key={loginStep}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
              >
                {loginStep === 'form' && (
                  <>
                    <div className="mb-6">
                      <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1a1a1a] tracking-tight">
                        Welcome Back
                      </h1>
                      <p className="mt-1.5 text-[#525252] text-[15px]">
                        Sign in with your username or email, social account, or passkey.
                      </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                          Username or Email Address
                        </label>
                        <input
                          type="text"
                          value={loginIdentifier}
                          onChange={(e) => setLoginIdentifier(e.target.value)}
                          required
                          className="w-full px-4 py-3 border border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020] transition-all text-[15px]"
                          placeholder="username or you@example.com"
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
                          className="w-full px-4 py-3 border border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020] transition-all text-[15px]"
                          placeholder="••••••••"
                        />
                        <div className="mt-2 text-right">
                          <button
                            type="button"
                            onClick={handleForgotPassword}
                            disabled={loading || !loginIdentifier.trim()}
                            className="text-sm text-[#800020] hover:underline font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Forgot Password?
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 px-6 rounded-xl font-semibold text-[15px] bg-[#800020] text-[#D4AF37] hover:bg-[#600018] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                      >
                        {loading ? 'Signing in...' : 'Sign In'}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </form>

                    <div className="relative flex items-center py-5">
                      <div className="flex-grow border-t border-[#e5e5e5]" />
                      <span className="mx-3 text-xs text-[#737373] font-medium">
                        or continue with
                      </span>
                      <div className="flex-grow border-t border-[#e5e5e5]" />
                    </div>

                    <div className="space-y-2.5">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleOAuthClick('google', 'login')}
                        className="w-full py-2.5 px-4 rounded-xl border border-[#e5e5e5] bg-white hover:bg-[#fafafa] text-[#1a1a1a] font-semibold text-sm flex items-center justify-center gap-3 transition-colors"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            fill="#4285F4"
                            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                          />
                        </svg>
                        Continue with Google
                      </button>

                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleOAuthClick('apple', 'login')}
                        className="w-full py-2.5 px-4 rounded-xl border border-[#e5e5e5] bg-white hover:bg-[#fafafa] text-[#1a1a1a] font-semibold text-sm flex items-center justify-center gap-3 transition-colors"
                      >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43Zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45Z" />
                        </svg>
                        Continue with Apple
                      </button>

                      <button
                        type="button"
                        disabled={loading}
                        onClick={handlePasskeyLogin}
                        className="w-full py-2.5 px-4 rounded-xl border border-[#e5e5e5] bg-white hover:bg-[#fafafa] text-[#1a1a1a] font-semibold text-sm flex items-center justify-center gap-2.5 transition-colors"
                      >
                        <Fingerprint className="w-4 h-4 text-[#800020]" />
                        Sign in with a Passkey
                      </button>
                    </div>
                  </>
                )}

                {/* LOGIN STEP 2: NEW DEVICE OTP CHALLENGE */}
                {loginStep === 'device_otp' && (
                  <form onSubmit={handleVerifyDeviceOtp} className="space-y-5">
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-[#800020] mb-1.5">
                        New Device Security Check
                      </p>
                      <h1 className="text-2xl font-serif font-bold text-[#1a1a1a] tracking-tight">
                        Verify this device
                      </h1>
                      <p className="mt-1.5 text-sm text-[#525252]">
                        We noticed a login from <strong className="text-[#1a1a1a]">{getDeviceLabel()}</strong>. Enter the 6-digit verification code sent to{' '}
                        <strong className="text-[#1a1a1a]">{otpTargetEmail}</strong>.
                      </p>
                    </div>

                    {demoOtpCode && (
                      <div className="rounded-xl border border-[#D4AF37]/60 bg-[#fafafa] p-4 flex items-center justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <ShieldAlert className="w-4 h-4 text-[#800020] mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-[#800020]">
                              Preview Security Code
                            </p>
                            <p className="text-xs text-[#525252]">
                              Use this 6-digit code to verify this new device:
                            </p>
                          </div>
                        </div>
                        <span className="font-mono tabular-nums text-lg font-bold tracking-widest text-[#1a1a1a]">
                          {demoOtpCode}
                        </span>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                        6-Digit Verification Code
                      </label>
                      <div className="relative">
                        <KeyRound className="w-4 h-4 text-[#737373] absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          required
                          maxLength={6}
                          inputMode="numeric"
                          className="w-full pl-10 pr-4 py-3 border border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020] text-center font-mono tabular-nums text-xl tracking-[0.35em]"
                          placeholder="000000"
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2.5 text-sm text-[#404040] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={trustThisDevice}
                        onChange={(e) => setTrustThisDevice(e.target.checked)}
                        className="h-4 w-4 accent-[#800020]"
                      />
                      <span>Trust this device for future logins</span>
                    </label>

                    <button
                      type="submit"
                      disabled={loading || otpCode.length !== 6}
                      className="w-full py-3.5 px-6 rounded-xl font-semibold text-[15px] bg-[#800020] text-[#D4AF37] hover:bg-[#600018] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {loading ? 'Verifying Device...' : 'Verify & Open Dashboard'}
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <div className="flex items-center justify-between text-sm pt-2 border-t border-[#e5e5e5]">
                      {otpResendTimer > 0 ? (
                        <span className="text-[#525252] tabular-nums">
                          Resend in {otpResendTimer}s
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResendDeviceOtp}
                          disabled={loading}
                          className="text-[#800020] font-semibold hover:underline"
                        >
                          Resend code
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setLoginStep('form');
                          setOtpCode('');
                          setDemoOtpCode('');
                          setError('');
                        }}
                        className="text-[#525252] hover:text-[#1a1a1a]"
                      >
                        Back to login
                      </button>
                    </div>
                  </form>
                )}
              </motion.div>
            )}
          </div>
        </main>

        <footer className="pb-6 text-center">
          <p className="text-[#737373] text-xs tracking-wide">
            Grizzly Vidyalya Alumni Network
          </p>
        </footer>
      </div>

      {/* Preview OAuth Account Selector Modal */}
      {demoOAuthPrompt && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#e5e5e5] shadow-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-serif font-bold text-[#1a1a1a]">
              Continue with {demoOAuthPrompt.provider === 'google' ? 'Google' : 'Apple'}
            </h3>
            <p className="text-sm text-[#525252]">
              Confirm the account email to simulate {demoOAuthPrompt.provider === 'google' ? 'Google' : 'Apple'} OAuth in preview mode:
            </p>
            <form onSubmit={handleConfirmDemoOAuth} className="space-y-4">
              <input
                type="email"
                required
                value={demoOAuthPrompt.email}
                onChange={(e) =>
                  setDemoOAuthPrompt((prev) => (prev ? { ...prev, email: e.target.value } : null))
                }
                className="w-full px-4 py-2.5 border border-[#e5e5e5] rounded-xl text-sm focus:outline-none focus:border-[#800020]"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setDemoOAuthPrompt(null)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-[#525252] hover:bg-[#fafafa]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#800020] text-[#D4AF37] hover:bg-[#600018]"
                >
                  Continue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
