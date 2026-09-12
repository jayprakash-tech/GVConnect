import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowRight } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { supabase, isSupabaseConfigured } from '../utils/supabase/client';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSendOTP = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    if (!isSupabaseConfigured()) {
      setError('Please configure Supabase credentials in environment variables.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          shouldCreateUser: false,
        },
      });

      if (error) throw error;

      // Store email for next steps
      sessionStorage.setItem('gv_email', email.trim().toLowerCase());
      navigate('/verify-otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      step="Step 1 of 3"
      title="Welcome back"
      subtitle="Enter your email to receive a verification code and continue to GVConnect."
    >
      <form onSubmit={handleSendOTP} className="space-y-5">
        <div className="relative">
          <Input
            type="email"
            label="Email Address"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error}
            autoComplete="email"
            required
          />
          <Mail className="absolute right-4 top-[42px] w-4 h-4 text-slate-clean-400 pointer-events-none" />
        </div>

        <Button type="submit" loading={loading}>
          Send Verification Code
          <ArrowRight className="w-4 h-4" />
        </Button>

        <p className="text-center text-xs text-slate-clean-400 pt-2">
          We'll send a 6-digit code to your email
        </p>
      </form>
    </AuthLayout>
  );
}
