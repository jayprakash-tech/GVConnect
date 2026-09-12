import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase/client';
import { Mountain, UserPlus, ArrowRight, ArrowLeft } from 'lucide-react';

export function ProfilePage() {
  const navigate = useNavigate();
  
  // Restore verified email from sessionStorage
  const [verifiedEmail, setVerifiedEmail] = useState(() => {
    return sessionStorage.getItem('gv_verified_email') || '';
  });

  // Profile fields
  const [fullName, setFullName] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [batchYear, setBatchYear] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);

  // Redirect if no verified email (user skipped OTP verification)
  useEffect(() => {
    if (!verifiedEmail) {
      navigate('/auth');
    }
  }, [verifiedEmail, navigate]);

  // Class and batch options
  const classes = ['Nursery', 'LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
  const batches = Array.from({ length: 25 }, (_, i) => String(new Date().getFullYear() - i));

  const handleCreateAccount = async () => {
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      // 1. Create user in Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: verifiedEmail,
        password: password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No user returned from signup");

      const userId = authData.user.id;

      // 2. UPDATE the profile that the database trigger just created
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: verifiedEmail,
          full_name: fullName,
          admission_number: admissionNumber,
          class: selectedClass,
          batch: batchYear,
        });

      if (profileError) {
        console.error("Profile Upsert Error:", profileError);
        throw profileError;
      }

      // 3. Success!
      alert("Account created successfully! Please check your email to confirm.");
      
      // Clear session storage
      sessionStorage.removeItem('gv_verified_email');
      sessionStorage.removeItem('gv_signup_step');
      sessionStorage.removeItem('gv_auth_mode');
      
      navigate('/auth');

    } catch (error: any) {
      console.error("Signup failed:", error);
      alert("Failed to create account: " + error.message);
    }
  };

  const handleBack = () => {
    // Clear verified email and go back to auth
    sessionStorage.removeItem('gv_verified_email');
    sessionStorage.removeItem('gv_signup_step');
    navigate('/auth');
  };

  if (!verifiedEmail) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-clean-50 flex flex-col">
      {/* Background pattern */}
      <div className="fixed inset-0 opacity-[0.02] pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(107, 18, 48) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }} />
      </div>

      {/* Header */}
      <header className="relative z-10 pt-8 pb-4 px-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-maroon-800 to-maroon-950 flex items-center justify-center shadow-md shadow-maroon-900/20">
            <Mountain className="w-5 h-5 text-amber-warm-400" strokeWidth={1.5} />
          </div>
          <h2 className="text-lg font-bold tracking-tight">
            <span className="text-maroon-900">GV</span>
            <span className="text-amber-warm-600">Connect</span>
          </h2>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex flex-col justify-center px-6 pb-12">
        <div className="w-full max-w-md mx-auto">
          {/* Back button */}
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-1 text-sm text-slate-clean-500 hover:text-slate-clean-700 mb-4 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>

          {/* Step indicator */}
          <p className="text-xs font-semibold tracking-widest uppercase text-amber-warm-600 mb-2">
            Step 3 of 3
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-clean-900 tracking-tight">
            Complete your profile
          </h1>
          <p className="mt-2 text-slate-clean-500 text-[15px]">
            Tell us about yourself to join the community
          </p>

          <div className="mt-8 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-clean-700 mb-1.5">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g., Rahul Sharma"
                className="w-full px-4 py-3 rounded-xl border border-slate-clean-200 bg-white text-slate-clean-900 placeholder:text-slate-clean-400 text-[15px] focus:outline-none focus:ring-2 focus:ring-maroon-700/20 focus:border-maroon-700 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-clean-700 mb-1.5">Admission Number</label>
              <input
                type="text"
                value={admissionNumber}
                onChange={(e) => setAdmissionNumber(e.target.value)}
                placeholder="e.g., GV-2018-045"
                className="w-full px-4 py-3 rounded-xl border border-slate-clean-200 bg-white text-slate-clean-900 placeholder:text-slate-clean-400 text-[15px] focus:outline-none focus:ring-2 focus:ring-maroon-700/20 focus:border-maroon-700 transition-all"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-clean-700 mb-1.5">Class</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-clean-200 bg-white text-slate-clean-900 text-[15px] focus:outline-none focus:ring-2 focus:ring-maroon-700/20 focus:border-maroon-700 transition-all"
                  required
                >
                  <option value="">Select</option>
                  {classes.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-clean-700 mb-1.5">Batch Year</label>
                <select
                  value={batchYear}
                  onChange={(e) => setBatchYear(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-clean-200 bg-white text-slate-clean-900 text-[15px] focus:outline-none focus:ring-2 focus:ring-maroon-700/20 focus:border-maroon-700 transition-all"
                  required
                >
                  <option value="">Select</option>
                  {batches.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-clean-100">
              <p className="text-xs text-slate-clean-500 mb-3 font-medium uppercase tracking-wide">
                Create a password
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-clean-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full px-4 py-3 rounded-xl border border-slate-clean-200 bg-white text-slate-clean-900 placeholder:text-slate-clean-400 text-[15px] focus:outline-none focus:ring-2 focus:ring-maroon-700/20 focus:border-maroon-700 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-clean-700 mb-1.5">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full px-4 py-3 rounded-xl border border-slate-clean-200 bg-white text-slate-clean-900 placeholder:text-slate-clean-400 text-[15px] focus:outline-none focus:ring-2 focus:ring-maroon-700/20 focus:border-maroon-700 transition-all"
                required
              />
            </div>

            <button
              type="button"
              onClick={handleCreateAccount}
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-xl font-semibold text-[15px] bg-maroon-800 text-white hover:bg-maroon-900 active:scale-[0.98] shadow-lg shadow-maroon-900/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'Creating account...' : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 pb-6 text-center">
        <p className="text-slate-clean-400 text-[11px] tracking-wide">
          Grizzly Vidyalya Alumni Network
        </p>
      </footer>
    </div>
  );
}
