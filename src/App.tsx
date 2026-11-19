import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { DirectoryPage } from './pages/DirectoryPage';
import { ChatPage } from './pages/ChatPage';
import { parseSupabaseCallbackUrl } from './utils/authRules';
import { checkLiveEmailVerification } from './services/authService';

function AppRoutes() {
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();
  const [handlingCallback, setHandlingCallback] = useState<boolean>(() => {
    const parsed = parseSupabaseCallbackUrl(window.location.search, window.location.hash);
    return Boolean(
      parsed.pkceCode || parsed.accessToken || parsed.authCallback || parsed.errorDescription
    );
  });

  useEffect(() => {
    const parsed = parseSupabaseCallbackUrl(window.location.search, window.location.hash);
    if (!parsed.pkceCode && !parsed.accessToken && !parsed.authCallback && !parsed.errorDescription) {
      setHandlingCallback(false);
      return;
    }

    let cancelled = false;

    const handleCallback = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const modeParam = searchParams.get('mode') === 'login' ? 'login' : 'signup';

        if (parsed.errorDescription) {
          window.history.replaceState(
            {},
            '',
            `${window.location.pathname}#/auth?mode=${modeParam}&auth_error=${encodeURIComponent(
              parsed.errorDescription
            )}`
          );
          navigate(
            `/auth?mode=${modeParam}&auth_error=${encodeURIComponent(parsed.errorDescription)}`,
            { replace: true }
          );
          return;
        }

        const res = await checkLiveEmailVerification(
          parsed.pkceCode || undefined,
          parsed.accessToken || undefined,
          parsed.refreshToken || undefined,
          true
        );

        if (cancelled) return;

        // If the user clicked a new-device magic link sent by signInWithOtp for an untrusted device,
        // verify this browser session and proceed cleanly.
        const pendingDeviceUser = sessionStorage.getItem('gv_pending_device_otp_user');
        if (
          res.verified &&
          res.user &&
          (parsed.authCallback === 'device_otp' ||
            (parsed.callbackType === 'magiclink' && pendingDeviceUser === res.user.id))
        ) {
          sessionStorage.removeItem('gv_pending_device_otp_user');
          sessionStorage.setItem('gv_device_otp_verified_user', res.user.id);
          await refreshAuth();
          window.history.replaceState({}, '', `${window.location.pathname}#/dashboard`);
          navigate('/dashboard', { replace: true });
          return;
        }

        if (parsed.authCallback === 'oauth') {
          sessionStorage.setItem('gv_oauth_callback_active', '1');
        }

        await refreshAuth();

        const isSignupVerification =
          parsed.authCallback === 'signup' || parsed.callbackType === 'signup';
        const targetMode = isSignupVerification ? 'signup' : modeParam;
        const verifiedQuery = isSignupVerification && res.verified ? '&verified=true' : '';

        window.history.replaceState(
          {},
          '',
          `${window.location.pathname}#/auth?mode=${targetMode}${verifiedQuery}`
        );
        navigate(`/auth?mode=${targetMode}${verifiedQuery}`, { replace: true });
      } finally {
        if (!cancelled) setHandlingCallback(false);
      }
    };

    handleCallback();

    return () => {
      cancelled = true;
    };
  }, [navigate, refreshAuth]);

  if (handlingCallback) {
    return (
      <div className="min-h-screen bg-[#120409] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#800020] to-[#d4af37] animate-pulse" />
          <p className="font-mono-tabular text-xs uppercase tracking-[0.22em] text-[#ffcf8a]">
            Confirming verification link...
          </p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/profile" element={<Navigate to="/auth?mode=signup" replace />} />
      <Route path="/directory" element={<DirectoryPage />} />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </HashRouter>
  );
}
