import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, ArrowRight } from 'lucide-react';
import { supabase } from '../utils/supabase/client';

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
      console.log("STEP 1: Attempting signUp with email:", verifiedEmail);
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: verifiedEmail,
        password: password,
      });

      if (authError) {
        console.error("STEP 1 FAILED - Auth Error:", authError);
        throw new Error("Auth failed: " + authError.message);
      }

      if (!authData || !authData.user) {
        console.error("STEP 1 FAILED - No user returned:", authData);
        throw new Error("No user returned from signup.");
      }

      const userId = authData.user.id;
      console.log("STEP 2: SignUp successful! User ID is:", userId);

      console.log("STEP 3: Attempting to upsert profile for userId:", userId);
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: verifiedEmail,
          full_name: fullName,
          admission_number: admissionNumber,
          class: selectedClass,
          batch: batchYear,
        })
        .select();

      if (profileError) {
        console.error("STEP 3 FAILED - Profile Upsert Error:", profileError);
        throw new Error("Profile save failed: " + profileError.message);
      }

      console.log("STEP 4: SUCCESS! Profile data saved:", profileData);
      
      // Store success state and email for the success screen
      sessionStorage.setItem('gv_signup_step', 'success');
      sessionStorage.setItem('gv_success_email', verifiedEmail);
      
      // Navigate to auth page which will show the success screen
      navigate('/auth');

    } catch (error: any) {
      console.error("CRITICAL FAILURE:", error);
      alert("Failed to create account: " + error.message);
    }
  };

  if (!verifiedEmail) {
    return null;
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Gradient with Logo (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-maroon-800 via-maroon-900 to-maroon-950 relative overflow-hidden">
        {/* Background Image */}
        <img
          src="/assembly.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-20"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="1200"%3E%3Crect fill="%23800020" width="800" height="1200"/%3E%3C/svg%3E';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-maroon-800/90 to-maroon-950/90" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12 text-center">
          <img
            src="/gvlogo.png"
            alt="GVConnect Logo"
            width={120}
            height={120}
            className="rounded-full border-4 border-gold-500 shadow-2xl mb-8"
            loading="eager"
            decoding="async"
            onError={(e) => {
              // Fallback to text
              e.currentTarget.style.display = 'none';
              const parent = e.currentTarget.parentElement;
              if (parent) {
                const text = document.createElement('div');
                text.className = 'w-[120px] h-[120px] rounded-full bg-gradient-to-br from-maroon-800 to-maroon-950 flex items-center justify-center text-gold-500 font-serif text-4xl font-bold border-4 border-gold-500 shadow-2xl mb-8';
                text.textContent = 'GV';
                parent.insertBefore(text, e.currentTarget.nextSibling);
              }
            }}
          />
          <h2 className="text-4xl font-serif font-bold text-gold-500 mb-4">
            Complete Your Profile
          </h2>
          <p className="text-white/80 text-lg leading-relaxed max-w-sm">
            Join the Grizzly Vidyalya alumni network and reconnect with your batchmates.
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Mobile Header */}
        <header className="lg:hidden pt-8 pb-4 px-6 bg-gradient-to-r from-maroon-800 to-maroon-900">
          <div className="flex flex-col items-center gap-3">
            <img
              src="/gvlogo.png"
              alt="GVConnect Logo"
              width={60}
              height={60}
              className="rounded-full border-2 border-gold-500"
              loading="eager"
              decoding="async"
              onError={(e) => {
                // Fallback to text
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  const text = document.createElement('div');
                  text.className = 'w-[60px] h-[60px] rounded-full bg-gradient-to-br from-maroon-800 to-maroon-950 flex items-center justify-center text-gold-500 font-serif text-xl font-bold border-2 border-gold-500';
                  text.textContent = 'GV';
                  parent.insertBefore(text, e.currentTarget.nextSibling);
                }
              }}
            />
            <h2 className="text-xl font-serif font-bold text-gold-500">
              GVConnect
            </h2>
          </div>
        </header>

        {/* Main Form Area */}
        <main className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md mx-auto"
          >
            {/* Step indicator */}
            <p className="text-xs font-semibold tracking-widest uppercase text-gold-600 mb-2">
              Step 3 of 3
            </p>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-maroon-800 tracking-tight">
              Complete your profile
            </h1>
            <p className="mt-2 text-neutral-600 text-[15px]">
              Tell us about yourself to join the community
            </p>

            <div className="mt-8 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g., Rahul Sharma"
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400 text-[15px] focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Admission Number</label>
                <input
                  type="text"
                  value={admissionNumber}
                  onChange={(e) => setAdmissionNumber(e.target.value)}
                  placeholder="e.g., GV-2018-045"
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400 text-[15px] focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Class</label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white text-neutral-900 text-[15px] focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 transition-all"
                    required
                  >
                    <option value="">Select</option>
                    {classes.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Batch Year</label>
                  <select
                    value={batchYear}
                    onChange={(e) => setBatchYear(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white text-neutral-900 text-[15px] focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 transition-all"
                    required
                  >
                    <option value="">Select</option>
                    {batches.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-100">
                <p className="text-xs text-neutral-500 mb-3 font-medium uppercase tracking-wide">
                  Create a password
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400 text-[15px] focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400 text-[15px] focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 transition-all"
                  required
                />
              </div>

              <button
                type="button"
                onClick={handleCreateAccount}
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-xl font-semibold text-[15px] bg-maroon-800 text-gold-500 hover:bg-maroon-700 active:scale-[0.98] shadow-lg shadow-maroon-900/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 border-2 border-gold-500/30 hover:border-gold-500/50"
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
          </motion.div>
        </main>

        {/* Footer */}
        <footer className="pb-6 text-center">
          <p className="text-neutral-500 text-[11px] tracking-wide">
            Grizzly Vidyalya Alumni Network
          </p>
        </footer>
      </div>
    </div>
  );
}
