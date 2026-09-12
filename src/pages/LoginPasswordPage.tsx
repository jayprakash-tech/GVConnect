import { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { supabase, isSupabaseConfigured } from '../utils/supabase/client';

export function LoginPasswordPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const email = sessionStorage.getItem('gv_email');

  useEffect(() => {
    if (!email) {
      navigate('/login');
    }
  }, [email, navigate]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!password) return;

    if (!isSupabaseConfigured()) {
      setError('Supabase not configured.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email!,
        password: password,
      });

      if (signInError) throw signInError;

      if (data.session) {
        sessionStorage.removeItem('gv_email');
        navigate('/dashboard');
      }
    } catch (err: any) {
      if (err.message?.toLowerCase().includes('invalid')) {
        setError('Incorrect password. Please try again.');
      } else {
        setError(err.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      step="Step 3 of 3"
      title="Enter your password"
      subtitle={`Welcome back! Enter the password you set for ${email}`}
    >
      <form onSubmit={handleLogin} className="space-y-5">
        <div className="relative">
          <Input
            type="password"
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error}
            autoComplete="current-password"
            required
          />
          <Lock className="absolute right-4 top-[42px] w-4 h-4 text-slate-clean-400 pointer-events-none" />
        </div>

        <Button type="submit" loading={loading}>
          Sign In
          <ArrowRight className="w-4 h-4" />
        </Button>

        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem('gv_email');
              navigate('/login');
            }}
            className="text-sm text-slate-clean-500 hover:text-slate-clean-700 transition-colors"
          >
            ← Use a different email
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
