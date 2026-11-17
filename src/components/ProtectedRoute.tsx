import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserProfile } from '../services/authService';
import { isProfileComplete } from '../utils/authRules';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, deviceVerified, loading } = useAuth();
  const [profileChecked, setProfileChecked] = useState(false);
  const [hasCompletedProfile, setHasCompletedProfile] = useState(false);

  useEffect(() => {
    if (!user || !user.email_verified || !deviceVerified) {
      setProfileChecked(true);
      setHasCompletedProfile(false);
      return;
    }

    let cancelled = false;
    setProfileChecked(false);

    getUserProfile(user.id)
      .then((profile) => {
        if (cancelled) return;
        setHasCompletedProfile(isProfileComplete(profile));
        setProfileChecked(true);
      })
      .catch(() => {
        if (cancelled) return;
        setHasCompletedProfile(false);
        setProfileChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, [user, deviceVerified]);

  if (loading || (user && user.email_verified && deviceVerified && !profileChecked)) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#800020] to-[#600018] animate-pulse" />
          <p className="text-sm text-[#525252] font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth?mode=login" replace />;
  }

  if (!user.email_verified) {
    return <Navigate to="/auth?mode=signup" replace />;
  }

  if (!deviceVerified) {
    return <Navigate to="/auth?mode=login&device_otp=required" replace />;
  }

  if (!hasCompletedProfile) {
    return <Navigate to="/auth?mode=signup" replace />;
  }

  return <>{children}</>;
}
