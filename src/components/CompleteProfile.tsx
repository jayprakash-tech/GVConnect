import { useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { completeProfileSetup } from '../services/authService';
import { CLASS_OPTIONS } from '../utils/authRules';

const BATCH_OPTIONS = Array.from({ length: 30 }, (_, i) => String(2026 - i));

const ONBOARDING_GOALS = [
  'Reconnect with batchmates',
  'Career & mentorship',
  'Campus events & reunions',
  'Mentor current students',
];

export interface CompleteProfileProps {
  isEmailVerified: boolean;
  userId: string;
  verifiedEmail: string;
  verifiedUsername?: string;
  initialFullName?: string;
  initialAdmissionNumber?: string;
  initialClass?: string;
  initialBatch?: string;
  onSuccess: () => Promise<void> | void;
  onRequireVerification?: () => void;
  onSignOut?: () => Promise<void> | void;
}

export function CompleteProfile({
  isEmailVerified,
  userId,
  verifiedEmail,
  verifiedUsername,
  initialFullName = '',
  initialAdmissionNumber = '',
  initialClass = '',
  initialBatch = '',
  onSuccess,
  onRequireVerification,
  onSignOut,
}: CompleteProfileProps) {
  const [fullName, setFullName] = useState(initialFullName);
  const [admissionNumber, setAdmissionNumber] = useState(initialAdmissionNumber);
  const [selectedClass, setSelectedClass] = useState(initialClass);
  const [batchYear, setBatchYear] = useState(initialBatch);
  const [onboardingGoal, setOnboardingGoal] = useState(ONBOARDING_GOALS[0]);
  const [onboardingBio, setOnboardingBio] = useState('');
  const [complianceAccepted, setComplianceAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Strict guard: only render after the user has clicked the verification link in their email
  if (!isEmailVerified || !verifiedEmail || !userId) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isEmailVerified) {
      onRequireVerification?.();
      setError('Please click the verification link sent to your email first.');
      return;
    }

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!admissionNumber.trim()) {
      setError('Please enter your admission number.');
      return;
    }
    if (!selectedClass) {
      setError('Please select your Class (or PASSOUT if alumni).');
      return;
    }
    if (!batchYear) {
      setError('Please select your Batch / passout year for compliance.');
      return;
    }
    if (!complianceAccepted) {
      setError('Please confirm your Batch compliance and alumni guidelines.');
      return;
    }

    setLoading(true);
    try {
      await completeProfileSetup(userId, {
        email: verifiedEmail,
        username: verifiedUsername || verifiedEmail.split('@')[0],
        full_name: fullName,
        admission_number: admissionNumber,
        class: selectedClass,
        batch: batchYear,
        compliance_accepted: complianceAccepted,
        onboarding_goal: onboardingGoal,
        onboarding_bio: onboardingBio,
      });

      await onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-5">
        <p className="text-xs font-semibold text-[#800020] mb-1.5">
          Step 3 of 3 · Complete Profile &amp; Batch Compliance
        </p>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1a1a1a] tracking-tight">
          Complete Profile
        </h1>
        <p className="mt-1.5 text-[#525252] text-[15px]">
          Enter your alumni details, select PASSOUT / Class and Batch (passout year) for compliance, and open your dashboard.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-[#fecaca] bg-[#fef2f2] p-3.5 text-sm text-[#b91c1c]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] px-4 py-3 text-xs text-[#525252] flex flex-wrap items-center gap-x-2 gap-y-1">
          <CheckCircle2 className="w-4 h-4 text-[#166534] shrink-0" />
          <span>
            Verified: <strong className="text-[#1a1a1a]">{verifiedEmail}</strong>
          </span>
          {verifiedUsername && (
            <>
              <span aria-hidden="true">·</span>
              <span>@{verifiedUsername}</span>
            </>
          )}
        </div>

        <div>
          <label
            htmlFor="complete-profile-fullname"
            className="block text-sm font-medium text-[#1a1a1a] mb-1.5"
          >
            Full Name
          </label>
          <input
            id="complete-profile-fullname"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full px-4 py-3 border border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020] text-[15px]"
            placeholder="e.g., Rahul Sharma"
          />
        </div>

        <div>
          <label
            htmlFor="complete-profile-admission"
            className="block text-sm font-medium text-[#1a1a1a] mb-1.5"
          >
            Admission Number
          </label>
          <input
            id="complete-profile-admission"
            type="text"
            value={admissionNumber}
            onChange={(e) => setAdmissionNumber(e.target.value)}
            required
            className="w-full px-4 py-3 border border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020] text-[15px]"
            placeholder="e.g., GV-2018-045"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="complete-profile-class"
              className="block text-sm font-medium text-[#1a1a1a] mb-1.5"
            >
              Class (or Passout)
            </label>
            <select
              id="complete-profile-class"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              required
              className="w-full px-4 py-3 border border-[#e5e5e5] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020] text-[15px]"
            >
              <option value="">Select Class</option>
              {CLASS_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c === 'PASSOUT' ? 'PASSOUT (Alumni)' : c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="complete-profile-batch"
              className="block text-sm font-medium text-[#1a1a1a] mb-1.5"
            >
              Batch (Passout Year)
            </label>
            <select
              id="complete-profile-batch"
              value={batchYear}
              onChange={(e) => setBatchYear(e.target.value)}
              required
              className="w-full px-4 py-3 border border-[#e5e5e5] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020] text-[15px] tabular-nums"
            >
              <option value="">Select Batch</option>
              {BATCH_OPTIONS.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="complete-profile-goal"
            className="block text-sm font-medium text-[#1a1a1a] mb-1.5"
          >
            What brings you to GVConnect?
          </label>
          <select
            id="complete-profile-goal"
            value={onboardingGoal}
            onChange={(e) => setOnboardingGoal(e.target.value)}
            className="w-full px-4 py-3 border border-[#e5e5e5] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020] text-[15px]"
          >
            {ONBOARDING_GOALS.map((goal) => (
              <option key={goal} value={goal}>
                {goal}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="complete-profile-bio"
            className="block text-sm font-medium text-[#1a1a1a] mb-1.5"
          >
            Current Role or City (Optional)
          </label>
          <input
            id="complete-profile-bio"
            type="text"
            value={onboardingBio}
            onChange={(e) => setOnboardingBio(e.target.value)}
            className="w-full px-4 py-3 border border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020] text-[15px]"
            placeholder="e.g., Product Engineer · Bengaluru"
          />
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-3.5 cursor-pointer">
          <input
            type="checkbox"
            checked={complianceAccepted}
            onChange={(e) => setComplianceAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[#800020]"
          />
          <span className="text-xs text-[#404040] leading-relaxed">
            I confirm my selected Batch year is accurate for alumni verification compliance and agree to the GVConnect community guidelines.
          </span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-6 rounded-xl font-semibold text-[15px] bg-[#800020] text-[#D4AF37] hover:bg-[#600018] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {loading ? 'Finishing Setup...' : 'Finish Onboarding & Open Dashboard'}
          <ArrowRight className="w-4 h-4" />
        </button>

        {onSignOut && (
          <button
            type="button"
            disabled={loading}
            onClick={() => onSignOut()}
            className="w-full text-center text-xs text-[#525252] hover:text-[#1a1a1a] pt-1"
          >
            Not your account? Sign out and use another email
          </button>
        )}
      </form>
    </div>
  );
}
