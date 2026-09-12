import { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, ArrowRight } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { supabase, isSupabaseConfigured } from '../utils/supabase/client';

const CLASS_OPTIONS = [
  'Nursery', 'LKG', 'UKG',
  '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th',
  '11th', '12th',
];

const BATCH_YEARS = Array.from({ length: 30 }, (_, i) => {
  const year = new Date().getFullYear() - i;
  return `${year}`;
});

export function SetupProfilePage() {
  const [fullName, setFullName] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [classLevel, setClassLevel] = useState('');
  const [batchYear, setBatchYear] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const email = sessionStorage.getItem('gv_email');

  useEffect(() => {
    if (!email) {
      navigate('/login');
    }
  }, [email, navigate]);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(pwd)) return 'Password must contain an uppercase letter';
    if (!/[0-9]/.test(pwd)) return 'Password must contain a number';
    return null;
  };

  const handleSetup = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) { setError('Please enter your full name'); return; }
    if (!admissionNumber.trim()) { setError('Please enter your admission number'); return; }
    if (!classLevel) { setError('Please select your class'); return; }
    if (!batchYear) { setError('Please select your batch year'); return; }

    const pwdError = validatePassword(password);
    if (pwdError) { setError(pwdError); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }

    if (!isSupabaseConfigured()) {
      setError('Supabase not configured.');
      return;
    }

    setLoading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Session expired. Please start over.');
      }

      // Update password
      const { error: pwdError } = await supabase.auth.updateUser({
        password: password,
      });
      if (pwdError) throw pwdError;

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          full_name: fullName.trim(),
          admission_number: admissionNumber.trim(),
          class: classLevel,
          batch: batchYear,
          email: email,
        });

      if (profileError) throw profileError;

      // Clear session storage
      sessionStorage.removeItem('gv_email');
      sessionStorage.removeItem('gv_new_user');

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      step="Step 3 of 3"
      title="Create your profile"
      subtitle="Welcome to the Grizzly Vidyalya family! Set up your profile to connect with alumni."
    >
      <form onSubmit={handleSetup} className="space-y-4">
        <Input
          label="Full Name"
          placeholder="e.g., Rahul Sharma"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          autoComplete="name"
          required
        />

        <Input
          label="Admission Number"
          placeholder="e.g., GV-2018-045"
          value={admissionNumber}
          onChange={(e) => setAdmissionNumber(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-clean-700 mb-1.5">
              Class
            </label>
            <select
              value={classLevel}
              onChange={(e) => setClassLevel(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-clean-200 bg-white text-slate-clean-900 
                text-[15px] focus:outline-none focus:ring-2 focus:ring-maroon-700/20 focus:border-maroon-700
                transition-all duration-200 appearance-none"
              required
            >
              <option value="">Select</option>
              {CLASS_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-clean-700 mb-1.5">
              Batch Year
            </label>
            <select
              value={batchYear}
              onChange={(e) => setBatchYear(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-clean-200 bg-white text-slate-clean-900 
                text-[15px] focus:outline-none focus:ring-2 focus:ring-maroon-700/20 focus:border-maroon-700
                transition-all duration-200 appearance-none"
              required
            >
              <option value="">Select</option>
              {BATCH_YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-clean-100">
          <p className="text-xs text-slate-clean-500 mb-3 font-medium uppercase tracking-wide">
            Create a password for future logins
          </p>
        </div>

        <Input
          label="Password"
          type="password"
          placeholder="Min. 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />

        <Input
          label="Confirm Password"
          type="password"
          placeholder="Re-enter password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
        />

        {error && (
          <p className="text-sm text-red-500 font-medium text-center">{error}</p>
        )}

        <Button type="submit" loading={loading} className="mt-2">
          <UserPlus className="w-4 h-4" />
          Create Profile & Join
          <ArrowRight className="w-4 h-4" />
        </Button>
      </form>
    </AuthLayout>
  );
}
