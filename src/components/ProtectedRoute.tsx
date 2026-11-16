import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, deviceVerified, loading } = useAuth();

  if (loading) {
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

  return <>{children}</>;
}
