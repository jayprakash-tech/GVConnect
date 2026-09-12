import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  error: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if Supabase is configured
    const isConfigured = import.meta.env.VITE_SUPABASE_URL && 
                         import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!isConfigured) {
      setError(
        'Supabase not configured. Please create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
      );
      setLoading(false);
      return;
    }

    // Get initial user
    supabase.auth.getUser()
      .then(({ data }) => {
        setUser(data.user);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Auth error:', err);
        setError('Failed to initialize authentication');
        setLoading(false);
      });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
