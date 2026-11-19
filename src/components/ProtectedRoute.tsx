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
      <div className="min-h-screen bg-[#120409] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-[#d4af37]/40 bg-[#1a060e] flex items-center justify-center animate-pulse">
            <span className="h-3 w-3 rounded-full bg-[#ffcf8a]" />
          </div>
          <p className="font-mono-tabular text-xs uppercase tracking-[0.26em] text-[#ffcf8a]">
            Verifying Session...
          </p>
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
