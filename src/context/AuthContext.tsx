import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { isSupabaseConfigured, supabase } from '../utils/supabase/client';
import {
  AuthUser,
  getAuthSessionState,
  isAuthBroadcastSuppressed,
  isUsingDemoFallback,
  loginWithPassword,
  registerWithEmail,
  signOutUser,
  subscribeAuthChanges,
} from '../services/authService';

export interface SignUpResult {
  userId: string;
  email: string;
  username: string;
  emailVerified: boolean;
  needsEmailVerification: boolean;
  demoVerifyUrl?: string;
}

export interface SignInResult {
  status: 'authenticated' | 'otp_required' | 'needs_onboarding' | 'email_verification_required';
  email: string;
  userId: string;
  username?: string;
  demoOtp?: string;
  demoVerifyUrl?: string;
  otpNotice?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  deviceVerified: boolean;
  loading: boolean;
  isDemoMode: boolean;
  refreshAuth: () => Promise<{ user: AuthUser | null; deviceVerified: boolean }>;
  signUp: (params: { email: string; username: string; password: string }) => Promise<SignUpResult>;
  signIn: (params: { identifier: string; password: string }) => Promise<SignInResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  deviceVerified: false,
  loading: true,
  isDemoMode: isUsingDemoFallback(),
  refreshAuth: async () => ({ user: null, deviceVerified: false }),
  signUp: async () => {
    throw new Error('AuthProvider not initialized');
  },
  signIn: async () => {
    throw new Error('AuthProvider not initialized');
  },
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [deviceVerified, setDeviceVerified] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(isUsingDemoFallback());

  const refreshAuth = useCallback(async () => {
    const state = await getAuthSessionState();
    setUser(state.user);
    setDeviceVerified(state.deviceVerified);
    setIsDemoMode(isUsingDemoFallback());
    setLoading(false);
    return state;
  }, []);

  useEffect(() => {
    let mounted = true;

    const syncSession = async () => {
      try {
        if (isSupabaseConfigured && !isUsingDemoFallback()) {
          await supabase.auth.getSession().catch(() => null);
        }
        const state = await getAuthSessionState();
        if (!mounted) return;
        setUser(state.user);
        setDeviceVerified(state.deviceVerified);
        setIsDemoMode(isUsingDemoFallback());
        setLoading(false);
      } catch {
        if (!mounted) return;
        setUser(null);
        setDeviceVerified(false);
        setIsDemoMode(isUsingDemoFallback());
        setLoading(false);
      }
    };

    syncSession();

    const unsubscribeLocal = subscribeAuthChanges((state) => {
      if (!mounted) return;
      setUser(state.user);
      setDeviceVerified(state.deviceVerified);
      setIsDemoMode(isUsingDemoFallback());
      setLoading(false);
    });

    let unsubscribeSupabase: (() => void) | undefined;
    if (isSupabaseConfigured) {
      const { data } = supabase.auth.onAuthStateChange((_event) => {
        if (!mounted || isAuthBroadcastSuppressed()) return;
        getAuthSessionState().then((state) => {
          if (!mounted || isAuthBroadcastSuppressed()) return;
          setUser(state.user);
          setDeviceVerified(state.deviceVerified);
          setIsDemoMode(isUsingDemoFallback());
          setLoading(false);
        });
      });
      unsubscribeSupabase = () => data.subscription.unsubscribe();
    }

    return () => {
      mounted = false;
      unsubscribeLocal();
      unsubscribeSupabase?.();
    };
  }, []);

  const signUp = useCallback(
    async (params: { email: string; username: string; password: string }) => {
      const result = await registerWithEmail(params);
      await refreshAuth();
      return result;
    },
    [refreshAuth]
  );

  const signIn = useCallback(
    async (params: { identifier: string; password: string }) => {
      const result = await loginWithPassword(params);
      await refreshAuth();
      return result;
    },
    [refreshAuth]
  );

  const signOut = useCallback(async () => {
    await signOutUser();
    await refreshAuth();
  }, [refreshAuth]);

  return (
    <AuthContext.Provider
      value={{
        user,
        deviceVerified,
        loading,
        isDemoMode,
        refreshAuth,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
