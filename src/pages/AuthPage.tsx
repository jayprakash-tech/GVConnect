import { useState, useEffect, useRef } from 'react';
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
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BackButton } from '../components/BackButton';
import { SecurityPuzzle } from '../components/SecurityPuzzle';
import { CompleteProfile } from '../components/CompleteProfile';
import {
  checkLiveEmailVerification,
  checkUsernameAvailability,
  getDeviceLabel,
  getUserProfile,
  isUsingDemoFallback,
  loginWithOAuthProvider,
  loginWithPasskey,
  resendVerificationLink,
  resetLocalDemoPassword,
  sendNewDeviceOtp,
  sendPasswordReset,
  validatePasswordPolicy,
  validateUsernameFormat,
  verifyEmailWithToken,
  verifyNewDeviceOtp,
} from '../services/authService';
import {
  isProfileComplete,
  parseSupabaseCallbackUrl,
  resolveSessionRouteAction,
} from '../utils/authRules';

type AuthTab = 'signup' | 'login';
type SignupStep = 'credentials' | 'verify' | 'onboarding';
type LoginStep = 'form' | 'device_otp' | 'forgot_reset';

export function AuthPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, deviceVerified, isDemoMode, refreshAuth, signUp, signIn, signOut } = useAuth();

  const initialTab: AuthTab = searchParams.get('mode') === 'login' ? 'login' : 'signup';
  const [activeTab, setActiveTab] = useState<AuthTab>(initialTab);
  const [showSignOutPrompt, setShowSignOutPrompt] = useState(false);

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
  const [showSignupPwd, setShowSignupPwd] = useState(false);
  const [showSignupConfirmPwd, setShowSignupConfirmPwd] = useState(false);

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
  const completingOnboardingRef = useRef(false);

  // Login state
  const [loginStep, setLoginStep] = useState<LoginStep>('form');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const loginIdentifierInputRef = useRef<HTMLInputElement>(null);

  // Local password reset state (for preview mode when Supabase isn't configured)
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetPwd, setShowResetPwd] = useState(false);

  // New-Device OTP state
  const [otpTargetEmail, setOtpTargetEmail] = useState('');
  const [otpTargetUserId, setOtpTargetUserId] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [trustThisDevice, setTrustThisDevice] = useState(true);
  const [demoOtpCode, setDemoOtpCode] = useState('');
  const [otpResendTimer, setOtpResendTimer] = useState(0);
  const otpDispatchedForUserRef = useRef<string | null>(null);

  // OAuth email prompt modal (when running without external Supabase keys)
  const [demoOAuthPrompt, setDemoOAuthPrompt] = useState<{
    provider: 'google' | 'apple';
    mode: 'signup' | 'login';
    email: string;
  } | null>(null);

  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordPolicy = validatePasswordPolicy(password);
  const resetPasswordPolicy = validatePasswordPolicy(resetNewPassword);

  // Close preview OAuth modal on Escape
  useEffect(() => {
    if (!demoOAuthPrompt) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDemoOAuthPrompt(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [demoOAuthPrompt]);

  // Sync tab & callback errors with URL query params
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'login' || mode === 'signup') {
      setActiveTab(mode);
    }
    const authError = searchParams.get('auth_error');
    if (authError) {
      setError(authError);
    }
  }, [searchParams]);

  // Handle verification link callback
  useEffect(() => {
    const parsed = parseSupabaseCallbackUrl(window.location.search, window.location.hash);
    const token = searchParams.get('verify_token') || parsed.verifyToken;
    const pkceCode = parsed.pkceCode || searchParams.get('code');
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
          setShowSignOutPrompt(false);
          setEmailVerifiedConfirmed(true);
          setVerifiedUserId(verifiedUser.id);
          setVerifiedEmail(verifiedUser.email);
          setVerifiedUsername(verifiedUser.username || '');
          setSignupStep('onboarding');
          setInfoMessage(
            'Email verified! Complete your Profile & Batch compliance to open your dashboard.'
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
      checkLiveEmailVerification(
        pkceCode || undefined,
        parsed.accessToken || undefined,
        parsed.refreshToken || undefined,
        true
      )
        .then(async (res) => {
          if (cancelled) return;
          if (res.verified && res.user) {
            await refreshAuth();
            setActiveTab('signup');
            setShowSignOutPrompt(false);
            setEmailVerifiedConfirmed(true);
            setVerifiedUserId(res.user.id);
            setVerifiedEmail(res.user.email);
            setVerifiedUsername(res.user.username || '');
            setSignupStep('onboarding');
            setInfoMessage(
              'Email verified! Complete your Profile & Batch compliance to open your dashboard.'
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

  // Strictly isolate Sign Up and Login session routing
  useEffect(() => {
    if (!user) {
      setShowSignOutPrompt(false);
      return;
    }
    if (completingOnboardingRef.current) return;

    let cancelled = false;

    const evaluateSession = async () => {
      const profile = await getUserProfile(user.id);
      if (cancelled || completingOnboardingRef.current) return;

      const allowExistingAccountLogin =
        sessionStorage.getItem('gv_oauth_callback_active') === '1';

      const decision = resolveSessionRouteAction({
        activeTab,
        user,
        hasProfile: isProfileComplete(profile),
        deviceVerified,
        allowExistingAccountLogin,
      });

      if (decision.action === 'signup_verify_email') {
        setShowSignOutPrompt(false);
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

      if (decision.action === 'signup_onboarding') {
        sessionStorage.removeItem('gv_oauth_callback_active');
        setShowSignOutPrompt(false);
        setActiveTab('signup');
        setEmailVerifiedConfirmed(true);
        setVerifiedUserId(user.id);
        setVerifiedEmail(user.email);
        setVerifiedUsername(user.username || user.email.split('@')[0]);
        setSignupStep('onboarding');
        return;
      }

      if (decision.action === 'prompt_signout') {
        setShowSignOutPrompt(true);
        return;
      }

      if (decision.action === 'login_device_otp') {
        sessionStorage.removeItem('gv_oauth_callback_active');
        setShowSignOutPrompt(false);
        setActiveTab('login');
        setLoginStep('device_otp');
        setOtpTargetEmail(user.email);
        setOtpTargetUserId(user.id);
        if (otpDispatchedForUserRef.current !== user.id) {
          otpDispatchedForUserRef.current = user.id;
          try {
            const res = await sendNewDeviceOtp(user.email, user.id);
            if (!cancelled && res.demoOtp) {
              setDemoOtpCode(res.demoOtp);
            }
          } catch (otpErr: any) {
            if (!cancelled && otpErr?.message) {
              setInfoMessage(otpErr.message);
            }
          }
        }
        return;
      }

      if (decision.action === 'redirect_dashboard') {
        sessionStorage.removeItem('gv_oauth_callback_active');
        navigate('/dashboard', { replace: true });
      }
    };

    evaluateSession();

    return () => {
      cancelled = true;
    };
  }, [activeTab, user, deviceVerified, navigate]);

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
      setShowSignOutPrompt(false);
      setLoginStep('form');
      setOtpCode('');
      setDemoOtpCode('');
      setResetNewPassword('');
      setResetConfirmPassword('');
      otpDispatchedForUserRef.current = null;
    }
  };

  const handleSignOutToCreateAccount = async () => {
    setLoading(true);
    setError('');
    setInfoMessage('');
    otpDispatchedForUserRef.current = null;
    try {
      await signOut();
      setShowSignOutPrompt(false);
      setActiveTab('signup');
      setSignupStep('credentials');
      setPuzzleSolved(false);
      setVerificationLinkSent(false);
      setEmailVerifiedConfirmed(false);
      setDemoVerifyUrl('');
      setEmail('');
      setUsername('');
      setPassword('');
      setConfirmPassword('');
      setVerifiedUserId('');
      setVerifiedEmail('');
      setVerifiedUsername('');
      setSearchParams({ mode: 'signup' }, { replace: true });
    } finally {
      setLoading(false);
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

      setEmailVerifiedConfirmed(false);
      setVerificationLinkSent(true);
      setResendTimer(30);
      setDemoVerifyUrl(result.demoVerifyUrl || '');
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
        setResendTimer(0);
        setError('Please verify your email address via the verification link before logging in.');
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
        otpDispatchedForUserRef.current = result.userId;
        setActiveTab('login');
        setLoginStep('device_otp');
        setOtpTargetEmail(result.email);
        setOtpTargetUserId(result.userId);
        setDemoOtpCode(result.demoOtp || '');
        setOtpResendTimer(30);
        if (result.otpNotice) {
          setInfoMessage(result.otpNotice);
        }
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
        email: '',
      });
      return;
    }

    setLoading(true);
    try {
      sessionStorage.setItem('gv_oauth_callback_active', '1');
      const result = await loginWithOAuthProvider(provider, mode);
      if (result.status !== 'redirecting') {
        await refreshAuth();
        if (result.status === 'needs_onboarding') {
          sessionStorage.removeItem('gv_oauth_callback_active');
          setActiveTab('signup');
          setEmailVerifiedConfirmed(true);
          setVerifiedUserId(result.userId || '');
          setVerifiedEmail(result.email || '');
          setVerifiedUsername(result.username || '');
          setSignupStep('onboarding');
        } else if (result.status === 'otp_required') {
          sessionStorage.removeItem('gv_oauth_callback_active');
          otpDispatchedForUserRef.current = result.userId || null;
          setActiveTab('login');
          setLoginStep('device_otp');
          setOtpTargetEmail(result.email || '');
          setOtpTargetUserId(result.userId || '');
          setDemoOtpCode(result.demoOtp || '');
          setOtpResendTimer(30);
        } else {
          sessionStorage.removeItem('gv_oauth_callback_active');
          navigate('/dashboard', { replace: true });
        }
        setLoading(false);
      }
    } catch (err: any) {
      sessionStorage.removeItem('gv_oauth_callback_active');
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
      sessionStorage.setItem('gv_oauth_callback_active', '1');
      const result = await loginWithOAuthProvider(provider, mode, oauthEmail);
      await refreshAuth();

      if (result.status === 'needs_onboarding') {
        sessionStorage.removeItem('gv_oauth_callback_active');
        setActiveTab('signup');
        setShowSignOutPrompt(false);
        setEmailVerifiedConfirmed(true);
        setVerifiedUserId(result.userId || '');
        setVerifiedEmail(result.email || oauthEmail);
        setVerifiedUsername(result.username || '');
        setSignupStep('onboarding');
        setInfoMessage(
          `Connected with ${provider === 'google' ? 'Google' : 'Apple'}. Complete your Profile & Batch compliance to enter your dashboard.`
        );
        return;
      }

      if (result.status === 'otp_required') {
        sessionStorage.removeItem('gv_oauth_callback_active');
        otpDispatchedForUserRef.current = result.userId || null;
        setShowSignOutPrompt(false);
        setActiveTab('login');
        setLoginStep('device_otp');
        setOtpTargetEmail(result.email || oauthEmail);
        setOtpTargetUserId(result.userId || '');
        setDemoOtpCode(result.demoOtp || '');
        setOtpResendTimer(30);
        return;
      }

      sessionStorage.removeItem('gv_oauth_callback_active');
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      sessionStorage.removeItem('gv_oauth_callback_active');
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
        otpDispatchedForUserRef.current = result.userId;
        setActiveTab('login');
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
      const res = await sendNewDeviceOtp(otpTargetEmail, otpTargetUserId, true);
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
      setError('Enter your username or email address above, then click Forgot Password.');
      loginIdentifierInputRef.current?.focus();
      return;
    }
    setError('');
    setInfoMessage('');
    setLoading(true);
    try {
      const sentEmail = await sendPasswordReset(loginIdentifier);
      if (isDemoMode || isUsingDemoFallback()) {
        setResetNewPassword('');
        setResetConfirmPassword('');
        setLoginStep('forgot_reset');
        setInfoMessage(`Account verified for ${sentEmail}. Set a new password below.`);
      } else {
        setInfoMessage(`Password reset instructions sent to ${sentEmail}.`);
      }
    } catch (err: any) {
      setError(err.message || 'Could not send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteLocalPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    if (!resetPasswordPolicy.valid) {
      setError(
        'Password must be at least 15 characters, or 8+ characters including a lowercase letter and a number.'
      );
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const updatedEmail = await resetLocalDemoPassword(loginIdentifier, resetNewPassword);
      setLoginStep('form');
      setLoginPassword('');
      setResetNewPassword('');
      setResetConfirmPassword('');
      setInfoMessage(`Password updated for ${updatedEmail}. You can sign in now.`);
    } catch (err: any) {
      setError(err.message || 'Could not update password.');
    } finally {
      setLoading(false);
    }
  };

  const stepIndex = signupStep === 'credentials' ? 1 : signupStep === 'verify' ? 2 : 3;

  return (
    <div className="min-h-screen flex bg-[#120409] text-white">
      {/* Left Brand Panel — Heritage Exhibition Backdrop */}
      <div
        className="hidden lg:flex lg:w-5/12 relative overflow-hidden border-r border-[#d4af37]/25"
        style={{
          background:
            'linear-gradient(135deg, #16040b 0%, #260613 50%, #0f0308 100%)',
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(rgba(255, 207, 138, 0.35) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 top-1/2 h-[480px] w-[480px] -translate-y-1/2 rounded-full opacity-35 blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(212, 175, 55, 0.32) 0%, rgba(128, 0, 32, 0.2) 55%, transparent 75%)',
          }}
        />

        <div className="relative z-10 flex flex-col justify-between w-full p-12">
          <Link to="/" className="inline-flex items-center gap-3 w-fit group">
            <img
              src="/gvlogo.png"
              alt="GVConnect Logo"
              className="w-11 h-11 object-contain group-hover:opacity-90 transition-opacity"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <span className="font-display text-xl font-bold tracking-wider text-[#ffcf8a]">
              GVConnect
            </span>
          </Link>

          <div className="my-auto py-8">
            <p className="font-mono-tabular text-[11px] uppercase tracking-[0.32em] text-[#ffcf8a]/85">
              Grizzly Vidyalya · Telaiya Dam
            </p>
            <h2 className="font-display mt-3 text-4xl font-bold tracking-wide text-white leading-[1.12]">
              WELCOME HOME,
              <span className="mt-1 block bg-gradient-to-r from-[#fff3d6] via-[#ffcf8a] to-[#d4af37] bg-clip-text text-transparent">
                GRIZZLIAN
              </span>
            </h2>
            <p className="mt-4 text-sm text-white/75 leading-relaxed max-w-sm">
              Reconnect with fellow Grizzlians across graduating batches with verified credentials and real-time alumni conversations.
            </p>

            {/* Framed Campus Memory Card matching Home Page Hero */}
            <div className="mt-8 overflow-hidden rounded-xl border border-[#d4af37]/30 bg-[#120409] p-2 max-w-sm shadow-[0_20px_50px_rgba(0,0,0,0.65)]">
              <div className="relative aspect-[16/10] overflow-hidden rounded-lg">
                <img
                  src="/gate.png"
                  alt="Grizzly Vidyalya Main Gate"
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#120409]/85 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3.5 right-3.5">
                  <p className="font-mono-tabular text-[10px] uppercase tracking-[0.24em] text-[#ffcf8a]">
                    Campus I · Telaiya Dam, Koderma
                  </p>
                  <p className="font-display text-sm font-semibold text-white mt-0.5">
                    Verified Alumni Network
                  </p>
                </div>
              </div>
            </div>
          </div>

          <p className="font-mono-tabular text-[11px] uppercase tracking-[0.24em] text-white/45">
            Alumni Archive · Community Portal
          </p>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex flex-col bg-[#120409] relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-56 opacity-45"
          style={{
            background:
              'radial-gradient(ellipse at top, rgba(128, 0, 32, 0.45), transparent 70%)',
          }}
        />

        {/* Mobile Header */}
        <header className="lg:hidden relative z-10 py-5 px-6 border-b border-white/10 bg-[#16040b]">
          <Link to="/" className="flex items-center justify-center gap-3">
            <img
              src="/gvlogo.png"
              alt="GVConnect Logo"
              className="w-10 h-10 object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <span className="font-display text-lg font-bold tracking-wider text-[#ffcf8a]">
              GVConnect
            </span>
          </Link>
        </header>

        <main className="relative z-10 flex-1 flex flex-col justify-center px-5 py-10 sm:px-8 lg:px-12">
          <div className="w-full max-w-md mx-auto">
            <div className="mb-5">
              {activeTab === 'signup' && signupStep === 'verify' && !showSignOutPrompt ? (
                <BackButton
                  label="Back to Credentials"
                  onClick={async () => {
                    if (user && !user.email_verified) {
                      await signOut();
                    }
                    setVerificationLinkSent(false);
                    setEmailVerifiedConfirmed(false);
                    setSignupStep('credentials');
                    setError('');
                    setInfoMessage('');
                  }}
                />
              ) : activeTab === 'login' && loginStep === 'device_otp' ? (
                <BackButton
                  label="Back to Login"
                  onClick={async () => {
                    otpDispatchedForUserRef.current = null;
                    await signOut();
                    setLoginStep('form');
                    setOtpCode('');
                    setDemoOtpCode('');
                    setError('');
                    setInfoMessage('');
                  }}
                />
              ) : activeTab === 'login' && loginStep === 'forgot_reset' ? (
                <BackButton
                  label="Back to Login"
                  onClick={() => {
                    setLoginStep('form');
                    setResetNewPassword('');
                    setResetConfirmPassword('');
                    setError('');
                    setInfoMessage('');
                  }}
                />
              ) : (
                <BackButton fallbackTo="/" label="Back" />
              )}
            </div>

            <div className="hud-card relative rounded-2xl border border-white/12 bg-[#1a060e]/90 p-6 sm:p-8 shadow-[0_24px_70px_rgba(0,0,0,0.6)]">
              {/* Segmented Auth Mode Tabs */}
              <div className="flex gap-1.5 mb-7 bg-[#120409] p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => switchTab('signup')}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-semibold uppercase tracking-[0.16em] transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'signup'
                      ? 'bg-[#d4af37] text-[#1c040b] shadow-sm'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  Sign Up
                </button>
                <button
                  type="button"
                  onClick={() => switchTab('login')}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-semibold uppercase tracking-[0.16em] transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'login'
                      ? 'bg-[#d4af37] text-[#1c040b] shadow-sm'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  Login
                </button>
              </div>

              {infoMessage && (
                <div className="mb-5 rounded-xl border border-emerald-400/35 bg-emerald-950/50 p-3.5 text-sm text-emerald-200 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-300" />
                  <span>{infoMessage}</span>
                </div>
              )}

              {error && (
                <div className="mb-5 rounded-xl border border-red-400/35 bg-red-950/50 p-3.5 text-sm text-red-200 flex items-start gap-2.5">
                  <XCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-300" />
                  <span>{error}</span>
                </div>
              )}

              {/* ===================== SIGN UP FLOW ===================== */}
              {activeTab === 'signup' && showSignOutPrompt && (
                <motion.div
                  key="signout-prompt"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  className="rounded-xl border border-white/12 bg-[#120409] p-5 space-y-5"
                >
                  <div>
                    <p className="font-mono-tabular text-[11px] uppercase tracking-[0.24em] text-[#ffcf8a] mb-1.5">
                      Active Session Detected
                    </p>
                    <h1 className="font-display text-2xl font-bold text-white tracking-wide">
                      Sign out before creating a new account
                    </h1>
                    <p className="mt-2 text-sm text-white/70 leading-relaxed">
                      You are currently signed in as{' '}
                      <strong className="text-white">{user?.email}</strong>. To register a new
                      GVConnect account, please sign out of your current session first.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleSignOutToCreateAccount}
                      className="w-full py-3 px-5 rounded-xl font-semibold text-sm bg-[#d4af37] text-[#1c040b] hover:bg-[#ffcf8a] disabled:opacity-50 transition-all cursor-pointer"
                    >
                      {loading ? 'Signing Out...' : 'Sign Out & Create New Account'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        navigate(deviceVerified ? '/dashboard' : '/auth?mode=login')
                      }
                      className="w-full py-3 px-5 rounded-xl font-semibold text-sm border border-white/15 bg-white/5 text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      {deviceVerified ? 'Go to Dashboard' : 'Continue to Existing Account Login'}
                    </button>
                  </div>
                </motion.div>
              )}

              {activeTab === 'signup' && !showSignOutPrompt && (
                <motion.div
                  key={signupStep}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  {signupStep !== 'onboarding' && (
                    <div className="mb-6">
                      <p className="font-mono-tabular text-[11px] uppercase tracking-[0.26em] text-[#ffcf8a] mb-1.5 tabular-nums">
                        Step {stepIndex} of 3 ·{' '}
                        {signupStep === 'credentials'
                          ? 'Account Credentials'
                          : 'Security & Email Verification'}
                      </p>
                      <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-wide">
                        {signupStep === 'credentials' && 'Create Your Account'}
                        {signupStep === 'verify' && 'Verify Your Account'}
                      </h1>
                      <p className="mt-1.5 text-white/70 text-sm">
                        {signupStep === 'credentials' &&
                          'Enter your email, choose a unique username, and set a strong password.'}
                        {signupStep === 'verify' &&
                          'Solve the quick security puzzle and confirm via the verification link sent to your email.'}
                      </p>
                    </div>
                  )}

                  {/* SIGN UP STEP 1: CREDENTIALS */}
                  {signupStep === 'credentials' && (
                    <div className="space-y-5">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleOAuthClick('google', 'signup')}
                        className="w-full py-3 px-4 rounded-xl border border-white/15 bg-[#120409] hover:border-[#d4af37]/50 text-white font-semibold text-sm flex items-center justify-center gap-3 transition-colors cursor-pointer"
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
                        <div className="flex-grow border-t border-white/10" />
                        <span className="mx-3 font-mono-tabular text-[11px] uppercase tracking-widest text-white/45">
                          or register with email
                        </span>
                        <div className="flex-grow border-t border-white/10" />
                      </div>

                      <form onSubmit={handleCredentialsContinue} className="space-y-4">
                        <div>
                          <label
                            htmlFor="signup-email"
                            className="block text-xs font-medium uppercase tracking-wider text-white/80 mb-1.5"
                          >
                            Email Address
                          </label>
                          <input
                            id="signup-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-4 py-3 border border-white/15 bg-[#120409] rounded-xl text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/30 focus:border-[#d4af37] transition-all text-sm"
                            placeholder="you@example.com"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="signup-username"
                            className="block text-xs font-medium uppercase tracking-wider text-white/80 mb-1.5"
                          >
                            Unique Username
                          </label>
                          <input
                            id="signup-username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                            required
                            minLength={3}
                            maxLength={24}
                            className="w-full px-4 py-3 border border-white/15 bg-[#120409] rounded-xl text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/30 focus:border-[#d4af37] transition-all text-sm"
                            placeholder="Choose a unique username"
                          />
                          {usernameStatus.message && (
                            <p
                              className={`mt-1.5 text-xs flex items-center gap-1.5 ${
                                usernameStatus.checking
                                  ? 'text-white/65'
                                  : usernameStatus.available
                                    ? 'text-emerald-300'
                                    : 'text-red-300'
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
                          <label
                            htmlFor="signup-password"
                            className="block text-xs font-medium uppercase tracking-wider text-white/80 mb-1.5"
                          >
                            Password
                          </label>
                          <div className="relative">
                            <input
                              id="signup-password"
                              type={showSignupPwd ? 'text' : 'password'}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              required
                              className="w-full pl-4 pr-11 py-3 border border-white/15 bg-[#120409] rounded-xl text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/30 focus:border-[#d4af37] transition-all text-sm"
                              placeholder="Create a strong password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowSignupPwd((p) => !p)}
                              aria-label={showSignupPwd ? 'Hide password' : 'Show password'}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/55 hover:text-[#ffcf8a] p-1 cursor-pointer"
                            >
                              {showSignupPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>

                          <div className="mt-2.5 rounded-xl border border-white/10 bg-[#120409] p-3 text-xs space-y-1.5">
                            <p className="font-semibold text-white/90">
                              Password must meet either rule:
                            </p>
                            <p
                              className={`flex items-center gap-1.5 ${
                                passwordPolicy.meetsLongRule ? 'text-emerald-300 font-medium' : 'text-white/60'
                              }`}
                            >
                              {passwordPolicy.meetsLongRule ? (
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              ) : (
                                <span className="w-3.5 h-3.5 inline-flex items-center justify-center rounded-full border border-white/30 text-[9px] shrink-0">
                                  •
                                </span>
                              )}
                              <span className="tabular-nums">
                                At least 15 characters ({passwordPolicy.length}/15)
                              </span>
                            </p>
                            <p className="text-white/40 pl-5 font-mono-tabular text-[10px]">OR</p>
                            <p
                              className={`flex items-center gap-1.5 ${
                                passwordPolicy.meetsCompositeRule
                                  ? 'text-emerald-300 font-medium'
                                  : 'text-white/60'
                              }`}
                            >
                              {passwordPolicy.meetsCompositeRule ? (
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              ) : (
                                <span className="w-3.5 h-3.5 inline-flex items-center justify-center rounded-full border border-white/30 text-[9px] shrink-0">
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
                          <label
                            htmlFor="signup-confirm-password"
                            className="block text-xs font-medium uppercase tracking-wider text-white/80 mb-1.5"
                          >
                            Confirm Password
                          </label>
                          <div className="relative">
                            <input
                              id="signup-confirm-password"
                              type={showSignupConfirmPwd ? 'text' : 'password'}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              required
                              className="w-full pl-4 pr-11 py-3 border border-white/15 bg-[#120409] rounded-xl text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/30 focus:border-[#d4af37] transition-all text-sm"
                              placeholder="Re-enter password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowSignupConfirmPwd((p) => !p)}
                              aria-label={showSignupConfirmPwd ? 'Hide password' : 'Show password'}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/55 hover:text-[#ffcf8a] p-1 cursor-pointer"
                            >
                              {showSignupConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={loading || usernameStatus.checking}
                          className="w-full py-3.5 px-6 rounded-xl font-semibold text-sm bg-[#d4af37] text-[#1c040b] hover:bg-[#ffcf8a] active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
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
                            className="w-full py-3.5 px-6 rounded-xl font-semibold text-sm bg-[#d4af37] text-[#1c040b] hover:bg-[#ffcf8a] disabled:opacity-45 transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Mail className="w-4 h-4" />
                            {loading ? 'Sending Verification Link...' : 'Send Verification Link'}
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              if (user && !user.email_verified) {
                                await signOut();
                              }
                              setSignupStep('credentials');
                              setError('');
                            }}
                            className="w-full text-xs text-white/65 hover:text-[#ffcf8a] py-1 cursor-pointer"
                          >
                            ← Edit email or username
                          </button>
                        </>
                      ) : (
                        <div className="rounded-xl border border-white/12 bg-[#120409] p-5 space-y-4">
                          <div className="flex items-start gap-3">
                            <Mail className="w-5 h-5 text-[#ffcf8a] mt-0.5 shrink-0" />
                            <div>
                              <h2 className="text-base font-semibold text-white">
                                Verification link sent
                              </h2>
                              <p className="text-sm text-white/70 mt-1 leading-relaxed">
                                We sent an account verification link to{' '}
                                <span className="font-semibold text-[#ffcf8a]">{verifiedEmail}</span>.
                                Click the link in your email to verify your account and continue to Batch setup.
                              </p>
                            </div>
                          </div>

                          {demoVerifyUrl ? (
                            <div className="rounded-lg border border-[#d4af37]/40 bg-[#1a060e] p-4 space-y-2.5">
                              <p className="font-mono-tabular text-[11px] uppercase tracking-wider text-[#ffcf8a]">
                                Preview Verification Inbox
                              </p>
                              <p className="text-xs text-white/70">
                                Email delivery is running in preview mode. Open your verification link directly below to verify your email:
                              </p>
                              <button
                                type="button"
                                disabled={loading}
                                onClick={handleOpenDemoVerifyLink}
                                className="w-full py-2.5 px-4 rounded-lg bg-[#d4af37] text-[#1c040b] text-xs font-semibold hover:bg-[#ffcf8a] transition-colors flex items-center justify-center gap-2 cursor-pointer"
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
                              className="w-full py-2.5 px-4 rounded-lg bg-[#d4af37] text-[#1c040b] text-xs font-semibold hover:bg-[#ffcf8a] transition-colors flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {loading ? 'Checking Verification...' : "I've Verified My Email — Continue"}
                            </button>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                            {resendTimer > 0 ? (
                              <span className="text-white/55 font-mono-tabular">
                                Resend link in {resendTimer}s
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={handleResendVerificationLink}
                                disabled={loading}
                                className="text-[#ffcf8a] font-semibold hover:underline cursor-pointer"
                              >
                                Resend verification link
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={async () => {
                                if (user && !user.email_verified) {
                                  await signOut();
                                }
                                setVerificationLinkSent(false);
                                setEmailVerifiedConfirmed(false);
                                setSignupStep('credentials');
                              }}
                              className="text-white/65 hover:text-white cursor-pointer"
                            >
                              Change email
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SIGN UP STEP 3: COMPLETE PROFILE */}
                  {signupStep === 'onboarding' && emailVerifiedConfirmed && (
                    <CompleteProfile
                      isEmailVerified={Boolean(emailVerifiedConfirmed || user?.email_verified)}
                      userId={verifiedUserId || user?.id || ''}
                      verifiedEmail={verifiedEmail || user?.email || email}
                      verifiedUsername={verifiedUsername || user?.username || username}
                      onRequireVerification={() => {
                        setSignupStep('verify');
                        setVerificationLinkSent(true);
                      }}
                      onSignOut={handleSignOutToCreateAccount}
                      onSuccess={async () => {
                        completingOnboardingRef.current = true;
                        await refreshAuth();
                        navigate('/dashboard', { replace: true });
                      }}
                    />
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
                        <p className="font-mono-tabular text-[11px] uppercase tracking-[0.26em] text-[#ffcf8a] mb-1.5">
                          Member Access
                        </p>
                        <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-wide">
                          Welcome Back
                        </h1>
                        <p className="mt-1.5 text-white/70 text-sm">
                          Sign in with your username or email, social account, or passkey.
                        </p>
                      </div>

                      <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                          <label
                            htmlFor="login-identifier"
                            className="block text-xs font-medium uppercase tracking-wider text-white/80 mb-1.5"
                          >
                            Username or Email Address
                          </label>
                          <input
                            ref={loginIdentifierInputRef}
                            id="login-identifier"
                            type="text"
                            value={loginIdentifier}
                            onChange={(e) => setLoginIdentifier(e.target.value)}
                            required
                            className="w-full px-4 py-3 border border-white/15 bg-[#120409] rounded-xl text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/30 focus:border-[#d4af37] transition-all text-sm"
                            placeholder="username or you@example.com"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="login-password"
                            className="block text-xs font-medium uppercase tracking-wider text-white/80 mb-1.5"
                          >
                            Password
                          </label>
                          <div className="relative">
                            <input
                              id="login-password"
                              type={showLoginPwd ? 'text' : 'password'}
                              value={loginPassword}
                              onChange={(e) => setLoginPassword(e.target.value)}
                              required
                              className="w-full pl-4 pr-11 py-3 border border-white/15 bg-[#120409] rounded-xl text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/30 focus:border-[#d4af37] transition-all text-sm"
                              placeholder="••••••••"
                            />
                            <button
                              type="button"
                              onClick={() => setShowLoginPwd((p) => !p)}
                              aria-label={showLoginPwd ? 'Hide password' : 'Show password'}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/55 hover:text-[#ffcf8a] p-1 cursor-pointer"
                            >
                              {showLoginPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          <div className="mt-2 text-right">
                            <button
                              type="button"
                              onClick={handleForgotPassword}
                              disabled={loading}
                              className="text-xs text-[#ffcf8a] hover:text-white hover:underline font-medium disabled:opacity-50 cursor-pointer"
                            >
                              Forgot Password?
                            </button>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full py-3.5 px-6 rounded-xl font-semibold text-sm bg-[#d4af37] text-[#1c040b] hover:bg-[#ffcf8a] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {loading ? 'Signing in...' : 'Sign In'}
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </form>

                      <div className="relative flex items-center py-5">
                        <div className="flex-grow border-t border-white/10" />
                        <span className="mx-3 font-mono-tabular text-[11px] uppercase tracking-widest text-white/45">
                          or continue with
                        </span>
                        <div className="flex-grow border-t border-white/10" />
                      </div>

                      <div className="space-y-2.5">
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => handleOAuthClick('google', 'login')}
                          className="w-full py-2.5 px-4 rounded-xl border border-white/15 bg-[#120409] hover:border-[#d4af37]/50 text-white font-semibold text-sm flex items-center justify-center gap-3 transition-colors cursor-pointer"
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
                          className="w-full py-2.5 px-4 rounded-xl border border-white/15 bg-[#120409] hover:border-[#d4af37]/50 text-white font-semibold text-sm flex items-center justify-center gap-3 transition-colors cursor-pointer"
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
                          className="w-full py-2.5 px-4 rounded-xl border border-white/15 bg-[#120409] hover:border-[#d4af37]/50 text-white font-semibold text-sm flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <Fingerprint className="w-4 h-4 text-[#ffcf8a]" />
                          Sign in with a Passkey
                        </button>
                      </div>
                    </>
                  )}

                  {/* LOGIN STEP: LOCAL PASSWORD RESET */}
                  {loginStep === 'forgot_reset' && (
                    <form onSubmit={handleCompleteLocalPasswordReset} className="space-y-4">
                      <div className="mb-2">
                        <p className="font-mono-tabular text-[11px] uppercase tracking-[0.24em] text-[#ffcf8a] mb-1.5">
                          Password Recovery
                        </p>
                        <h1 className="font-display text-2xl font-bold text-white tracking-wide">
                          Set New Password
                        </h1>
                        <p className="mt-1 text-sm text-white/70">
                          Updating password for <strong className="text-white">{loginIdentifier}</strong>.
                        </p>
                      </div>

                      <div>
                        <label
                          htmlFor="reset-new-password"
                          className="block text-xs font-medium uppercase tracking-wider text-white/80 mb-1.5"
                        >
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            id="reset-new-password"
                            type={showResetPwd ? 'text' : 'password'}
                            value={resetNewPassword}
                            onChange={(e) => setResetNewPassword(e.target.value)}
                            required
                            className="w-full pl-4 pr-11 py-3 border border-white/15 bg-[#120409] rounded-xl text-white placeholder:text-white/35 focus:outline-none focus:border-[#d4af37] text-sm"
                            placeholder="15+ chars or 8+ with lowercase & number"
                          />
                          <button
                            type="button"
                            onClick={() => setShowResetPwd((p) => !p)}
                            aria-label={showResetPwd ? 'Hide password' : 'Show password'}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/55 hover:text-[#ffcf8a] p-1 cursor-pointer"
                          >
                            {showResetPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="reset-confirm-password"
                          className="block text-xs font-medium uppercase tracking-wider text-white/80 mb-1.5"
                        >
                          Confirm New Password
                        </label>
                        <input
                          id="reset-confirm-password"
                          type={showResetPwd ? 'text' : 'password'}
                          value={resetConfirmPassword}
                          onChange={(e) => setResetConfirmPassword(e.target.value)}
                          required
                          className="w-full px-4 py-3 border border-white/15 bg-[#120409] rounded-xl text-white placeholder:text-white/35 focus:outline-none focus:border-[#d4af37] text-sm"
                          placeholder="Re-enter new password"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 px-6 rounded-xl font-semibold text-sm bg-[#d4af37] text-[#1c040b] hover:bg-[#ffcf8a] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {loading ? 'Updating Password...' : 'Update Password'}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </form>
                  )}

                  {/* LOGIN STEP 2: NEW DEVICE OTP CHALLENGE */}
                  {loginStep === 'device_otp' && (
                    <form onSubmit={handleVerifyDeviceOtp} className="space-y-5">
                      <div className="mb-2">
                        <p className="font-mono-tabular text-[11px] uppercase tracking-[0.24em] text-[#ffcf8a] mb-1.5">
                          New Device Security Check
                        </p>
                        <h1 className="font-display text-2xl font-bold text-white tracking-wide">
                          Verify This Device
                        </h1>
                        <p className="mt-1.5 text-sm text-white/70">
                          We noticed a login from <strong className="text-white">{getDeviceLabel()}</strong>. Enter the 6-digit verification code sent to{' '}
                          <strong className="text-[#ffcf8a]">{otpTargetEmail}</strong>.
                        </p>
                      </div>

                      {demoOtpCode && (
                        <div className="rounded-xl border border-[#d4af37]/40 bg-[#120409] p-4 flex items-center justify-between gap-3">
                          <div className="flex items-start gap-2.5">
                            <ShieldAlert className="w-4 h-4 text-[#ffcf8a] mt-0.5 shrink-0" />
                            <div>
                              <p className="font-mono-tabular text-[11px] uppercase tracking-wider text-[#ffcf8a]">
                                Preview Security Code
                              </p>
                              <p className="text-xs text-white/65">
                                Use this 6-digit code to verify this device:
                              </p>
                            </div>
                          </div>
                          <span className="font-mono-tabular text-lg font-bold tracking-widest text-[#ffcf8a]">
                            {demoOtpCode}
                          </span>
                        </div>
                      )}

                      <div>
                        <label
                          htmlFor="device-otp-input"
                          className="block text-xs font-medium uppercase tracking-wider text-white/80 mb-1.5"
                        >
                          6-Digit Verification Code
                        </label>
                        <div className="relative">
                          <KeyRound className="w-4 h-4 text-white/45 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            id="device-otp-input"
                            type="text"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            required
                            maxLength={6}
                            inputMode="numeric"
                            className="w-full pl-10 pr-4 py-3 border border-white/15 bg-[#120409] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#d4af37]/30 focus:border-[#d4af37] text-center font-mono-tabular text-xl tracking-[0.35em]"
                            placeholder="000000"
                          />
                        </div>
                      </div>

                      <label className="flex items-center gap-2.5 text-sm text-white/75 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={trustThisDevice}
                          onChange={(e) => setTrustThisDevice(e.target.checked)}
                          className="h-4 w-4 accent-[#d4af37]"
                        />
                        <span>Trust this device for future logins</span>
                      </label>

                      <button
                        type="submit"
                        disabled={loading || otpCode.length !== 6}
                        className="w-full py-3.5 px-6 rounded-xl font-semibold text-sm bg-[#d4af37] text-[#1c040b] hover:bg-[#ffcf8a] disabled:opacity-45 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {loading ? 'Verifying Device...' : 'Verify & Open Dashboard'}
                        <ArrowRight className="w-4 h-4" />
                      </button>

                      <div className="flex items-center justify-between text-xs pt-2 border-t border-white/10">
                        {otpResendTimer > 0 ? (
                          <span className="text-white/55 font-mono-tabular">
                            Resend in {otpResendTimer}s
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleResendDeviceOtp}
                            disabled={loading}
                            className="text-[#ffcf8a] font-semibold hover:underline cursor-pointer"
                          >
                            Resend code
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={async () => {
                            otpDispatchedForUserRef.current = null;
                            await signOut();
                            setLoginStep('form');
                            setOtpCode('');
                            setDemoOtpCode('');
                            setError('');
                          }}
                          className="text-white/65 hover:text-white cursor-pointer"
                        >
                          Back to login
                        </button>
                      </div>
                    </form>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </main>

        <footer className="relative z-10 pb-6 text-center">
          <p className="font-mono-tabular text-[11px] uppercase tracking-[0.24em] text-white/45">
            Grizzly Vidyalya · Telaiya Dam, Koderma
          </p>
        </footer>
      </div>

      {/* Preview OAuth Account Modal */}
      {demoOAuthPrompt && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="hud-card relative bg-[#14040a] rounded-xl border border-white/15 shadow-2xl max-w-sm w-full p-6 space-y-4 text-white">
            <p className="font-mono-tabular text-[10px] uppercase tracking-[0.26em] text-[#ffcf8a]">
              OAuth Verification
            </p>
            <h3 className="font-display text-lg font-bold text-white">
              Continue with {demoOAuthPrompt.provider === 'google' ? 'Google' : 'Apple'}
            </h3>
            <p className="text-xs text-white/70 leading-relaxed">
              Enter your {demoOAuthPrompt.provider === 'google' ? 'Google' : 'Apple'} account email to continue in preview mode:
            </p>
            <form onSubmit={handleConfirmDemoOAuth} className="space-y-4">
              <input
                type="email"
                required
                autoFocus
                placeholder="you@example.com"
                value={demoOAuthPrompt.email}
                onChange={(e) =>
                  setDemoOAuthPrompt((prev) => (prev ? { ...prev, email: e.target.value } : null))
                }
                className="w-full px-4 py-2.5 border border-white/15 bg-[#120409] rounded-xl text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-[#d4af37]"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setDemoOAuthPrompt(null)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-white/70 hover:bg-white/10 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#d4af37] text-[#1c040b] hover:bg-[#ffcf8a] cursor-pointer"
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
