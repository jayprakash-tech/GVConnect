import { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  User,
  Lock,
  Save,
  ShieldCheck,
  Fingerprint,
  Trash2,
  Laptop,
  Plus,
  Eye,
  EyeOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  changeUserPassword,
  getOrCreateDeviceId,
  listPasskeys,
  listTrustedDevices,
  PasskeyCredentialRecord,
  registerPasskey,
  removePasskey,
  revokeTrustedDevice,
  TrustedDevice,
  updateUserProfile,
  UserProfile,
  validatePasswordPolicy,
} from '../services/authService';
import { CLASS_OPTIONS } from '../utils/authRules';

const ONBOARDING_GOALS = [
  'Reconnect with batchmates',
  'Career & mentorship',
  'Campus events & reunions',
  'Mentor current students',
];

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail: string;
  defaultTab?: 'profile' | 'password' | 'security';
  currentProfile: UserProfile;
  onProfileUpdate: (profile: UserProfile) => void;
}

export function ProfileEditModal({
  isOpen,
  onClose,
  userId,
  userEmail,
  defaultTab = 'profile',
  currentProfile,
  onProfileUpdate,
}: ProfileEditModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'security'>(defaultTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Profile fields
  const [fullName, setFullName] = useState(currentProfile.full_name);
  const [admissionNumber, setAdmissionNumber] = useState(currentProfile.admission_number);
  const [selectedClass, setSelectedClass] = useState(currentProfile.class);
  const [batchYear, setBatchYear] = useState(currentProfile.batch);
  const [onboardingGoal, setOnboardingGoal] = useState(
    currentProfile.onboarding_goal || ONBOARDING_GOALS[0]
  );
  const [onboardingBio, setOnboardingBio] = useState(currentProfile.onboarding_bio || '');
  const [avatarUrl, setAvatarUrl] = useState<string>(currentProfile.avatar_url || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  // Security: Passkeys & Trusted Devices
  const [passkeys, setPasskeys] = useState<PasskeyCredentialRecord[]>([]);
  const [trustedDevices, setTrustedDevices] = useState<TrustedDevice[]>([]);
  const currentDeviceId = getOrCreateDeviceId();

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setFullName(currentProfile.full_name);
      setAdmissionNumber(currentProfile.admission_number);
      setSelectedClass(currentProfile.class);
      setBatchYear(currentProfile.batch);
      setOnboardingGoal(currentProfile.onboarding_goal || ONBOARDING_GOALS[0]);
      setOnboardingBio(currentProfile.onboarding_bio || '');
      setAvatarUrl(currentProfile.avatar_url || '');
      setAvatarFile(null);
      setAvatarPreview(null);
      setError('');
      setSuccess('');
      loadSecurityData();
    }
  }, [isOpen, currentProfile, defaultTab]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const loadSecurityData = async () => {
    const [pk, devices] = await Promise.all([
      listPasskeys(userId),
      listTrustedDevices(userId),
    ]);
    setPasskeys(pk);
    setTrustedDevices(devices);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
    setError('');
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const updated = await updateUserProfile(userId, {
        full_name: fullName,
        admission_number: admissionNumber,
        class: selectedClass,
        batch: batchYear,
        onboarding_goal: onboardingGoal,
        onboarding_bio: onboardingBio,
        avatar_url: avatarUrl,
        avatarFile,
      });

      setSuccess('Profile updated successfully.');
      onProfileUpdate(updated);
      setTimeout(() => onClose(), 900);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all password fields');
      return;
    }

    const policy = validatePasswordPolicy(newPassword);
    if (!policy.valid) {
      setError(
        'New password must be at least 15 characters, or 8+ characters including a lowercase letter and a number.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await changeUserPassword(userId, currentPassword, newPassword);
      setSuccess('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterPasskey = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await registerPasskey(userId, userEmail, fullName, currentProfile.username);
      await loadSecurityData();
      setSuccess('Passkey added for this device.');
    } catch (err: any) {
      setError(err.message || 'Could not register passkey.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePasskey = async (credentialId: string) => {
    setError('');
    setSuccess('');
    await removePasskey(userId, credentialId);
    await loadSecurityData();
    setSuccess('Passkey removed.');
  };

  const handleRevokeDevice = async (deviceId: string) => {
    setError('');
    setSuccess('');
    await revokeTrustedDevice(userId, deviceId);
    await loadSecurityData();
    setSuccess(
      deviceId === currentDeviceId
        ? 'Current device trust removed. Next login on this browser will require an OTP verification code.'
        : 'Device trust revoked.'
    );
  };

  const classes = CLASS_OPTIONS;
  const batches = Array.from({ length: 30 }, (_, i) => String(2026 - i));

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.16 }}
            className="hud-card relative bg-[#14040a] rounded-xl border border-white/15 shadow-[0_24px_80px_rgba(0,0,0,0.85)] max-w-2xl w-full max-h-[90vh] overflow-hidden text-white"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#240612] via-[#1a060e] to-[#14040a] border-b border-white/12 p-6 flex items-center justify-between">
              <div>
                <p className="font-mono-tabular text-[10px] uppercase tracking-[0.28em] text-[#ffcf8a]">
                  Alumni Member Settings
                </p>
                <h2 className="font-display text-2xl font-bold text-white mt-0.5">
                  Account &amp; Security
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-white/15 p-1.5 text-white/75 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-white/10 bg-[#120409]">
              <div className="flex">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('profile');
                    setError('');
                    setSuccess('');
                  }}
                  className={`flex-1 py-3.5 px-4 text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'profile'
                      ? 'text-[#ffcf8a] border-b-2 border-[#d4af37] bg-[#1a060e]/60'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <User className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" />
                  Profile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('password');
                    setError('');
                    setSuccess('');
                  }}
                  className={`flex-1 py-3.5 px-4 text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'password'
                      ? 'text-[#ffcf8a] border-b-2 border-[#d4af37] bg-[#1a060e]/60'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" />
                  Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('security');
                    setError('');
                    setSuccess('');
                  }}
                  className={`flex-1 py-3.5 px-4 text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'security'
                      ? 'text-[#ffcf8a] border-b-2 border-[#d4af37] bg-[#1a060e]/60'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" />
                  Passkeys &amp; Devices
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[65vh]">
              {error && (
                <div className="mb-4 p-3 bg-red-950/50 border border-red-400/35 rounded-xl text-red-200 text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-4 p-3 bg-emerald-950/50 border border-emerald-400/35 rounded-xl text-emerald-200 text-sm">
                  {success}
                </div>
              )}

              {activeTab === 'profile' && (
                <form onSubmit={handleProfileUpdate} className="space-y-5">
                  <div className="flex flex-col items-center">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-full overflow-hidden bg-[#1a060e] border-2 border-[#d4af37]">
                        {avatarPreview ? (
                          <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : avatarUrl ? (
                          <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#ffcf8a] font-display text-3xl font-bold">
                            {fullName.charAt(0).toUpperCase() || 'G'}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        aria-label="Upload profile picture"
                        className="absolute bottom-0 right-0 w-8 h-8 bg-[#d4af37] text-[#1c040b] rounded-full flex items-center justify-center hover:bg-[#ffcf8a] transition-colors shadow-lg cursor-pointer"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                    <p className="text-xs text-white/55 mt-2">
                      Click the camera icon to upload a portrait (max 5MB)
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-white/80 mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-white/15 bg-[#120409] text-white focus:outline-none focus:border-[#d4af37] text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-white/80 mb-1.5">
                      Admission Number
                    </label>
                    <input
                      type="text"
                      value={admissionNumber}
                      onChange={(e) => setAdmissionNumber(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-white/15 bg-[#120409] text-white focus:outline-none focus:border-[#d4af37] text-sm font-mono-tabular"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider text-white/80 mb-1.5">
                        Class
                      </label>
                      <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        required
                        className="w-full px-4 py-3 rounded-xl border border-white/15 bg-[#120409] text-white focus:outline-none focus:border-[#d4af37] text-sm"
                      >
                        {classes.map((cls) => (
                          <option key={cls} value={cls}>
                            {cls === 'PASSOUT' ? 'PASSOUT (Alumni)' : cls}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider text-white/80 mb-1.5">
                        Batch Year
                      </label>
                      <select
                        value={batchYear}
                        onChange={(e) => setBatchYear(e.target.value)}
                        required
                        className="w-full px-4 py-3 rounded-xl border border-white/15 bg-[#120409] text-white focus:outline-none focus:border-[#d4af37] text-sm font-mono-tabular"
                      >
                        {batches.map((batch) => (
                          <option key={batch} value={batch}>
                            {batch}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-white/80 mb-1.5">
                      Network Focus
                    </label>
                    <select
                      value={onboardingGoal}
                      onChange={(e) => setOnboardingGoal(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-white/15 bg-[#120409] text-white focus:outline-none focus:border-[#d4af37] text-sm"
                    >
                      {ONBOARDING_GOALS.map((goal) => (
                        <option key={goal} value={goal}>
                          {goal}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-white/80 mb-1.5">
                      Current Role or City
                    </label>
                    <input
                      type="text"
                      value={onboardingBio}
                      onChange={(e) => setOnboardingBio(e.target.value)}
                      placeholder="Your role, university, or city"
                      className="w-full px-4 py-3 rounded-xl border border-white/15 bg-[#120409] text-white placeholder:text-white/35 focus:outline-none focus:border-[#d4af37] text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-6 rounded-xl font-semibold text-sm bg-[#d4af37] text-[#1c040b] hover:bg-[#ffcf8a] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>
              )}

              {activeTab === 'password' && (
                <form onSubmit={handlePasswordChange} className="space-y-5">
                  <div className="bg-[#120409] border border-white/12 p-4 rounded-xl text-xs text-white/75 leading-relaxed">
                    New passwords must be at least 15 characters, or 8+ characters including a lowercase letter and a number.
                  </div>

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-white/80 mb-1.5">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPwd ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        className="w-full pl-4 pr-11 py-3 rounded-xl border border-white/15 bg-[#120409] text-white placeholder:text-white/35 focus:outline-none focus:border-[#d4af37] text-sm"
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPwd((p) => !p)}
                        aria-label={showCurrentPwd ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/55 hover:text-[#ffcf8a] p-1 cursor-pointer"
                      >
                        {showCurrentPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-white/80 mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPwd ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className="w-full pl-4 pr-11 py-3 rounded-xl border border-white/15 bg-[#120409] text-white placeholder:text-white/35 focus:outline-none focus:border-[#d4af37] text-sm"
                        placeholder="15+ chars or 8+ with number & lowercase"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPwd((p) => !p)}
                        aria-label={showNewPwd ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/55 hover:text-[#ffcf8a] p-1 cursor-pointer"
                      >
                        {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-white/80 mb-1.5">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPwd ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="w-full pl-4 pr-11 py-3 rounded-xl border border-white/15 bg-[#120409] text-white placeholder:text-white/35 focus:outline-none focus:border-[#d4af37] text-sm"
                        placeholder="Confirm new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPwd((p) => !p)}
                        aria-label={showConfirmPwd ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/55 hover:text-[#ffcf8a] p-1 cursor-pointer"
                      >
                        {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-6 rounded-xl font-semibold text-sm bg-[#d4af37] text-[#1c040b] hover:bg-[#ffcf8a] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                    {loading ? 'Changing Password...' : 'Change Password'}
                  </button>
                </form>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-base font-semibold text-white flex items-center gap-2">
                          <Fingerprint className="w-4 h-4 text-[#ffcf8a]" />
                          Configured Passkeys
                        </h3>
                        <p className="text-xs text-white/60 mt-0.5">
                          Sign in faster using your device biometrics or hardware security key.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRegisterPasskey}
                        disabled={loading}
                        className="px-3.5 py-2 rounded-lg bg-[#d4af37] text-[#1c040b] text-xs font-semibold hover:bg-[#ffcf8a] transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Passkey
                      </button>
                    </div>

                    {passkeys.length === 0 ? (
                      <div className="rounded-xl border border-white/10 bg-[#120409] p-4 text-xs text-white/65">
                        No passkeys configured yet. Click &ldquo;Add Passkey&rdquo; to enroll this device.
                      </div>
                    ) : (
                      <div className="divide-y divide-white/10 rounded-xl border border-white/12 bg-[#120409]">
                        {passkeys.map((pk) => (
                          <div
                            key={pk.id}
                            className="p-3.5 flex items-center justify-between gap-3 text-sm"
                          >
                            <div>
                              <p className="font-medium text-white">{pk.label}</p>
                              <p className="text-xs text-white/55 font-mono-tabular">
                                Added {new Date(pk.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemovePasskey(pk.id)}
                              className="p-2 text-white/55 hover:text-red-300 rounded-lg transition-colors cursor-pointer"
                              aria-label="Remove passkey"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 pt-4 border-t border-white/10">
                    <div>
                      <h3 className="text-base font-semibold text-white flex items-center gap-2">
                        <Laptop className="w-4 h-4 text-[#ffcf8a]" />
                        Trusted Devices
                      </h3>
                      <p className="text-xs text-white/60 mt-0.5">
                        Logging in from an unrecognized device triggers an email OTP verification challenge.
                      </p>
                    </div>

                    {trustedDevices.length === 0 ? (
                      <div className="rounded-xl border border-white/10 bg-[#120409] p-4 text-xs text-white/65">
                        No trusted devices recorded. Your next login will ask for an email OTP verification code.
                      </div>
                    ) : (
                      <div className="divide-y divide-white/10 rounded-xl border border-white/12 bg-[#120409]">
                        {trustedDevices.map((dev) => (
                          <div
                            key={dev.id}
                            className="p-3.5 flex items-center justify-between gap-3 text-sm"
                          >
                            <div>
                              <p className="font-medium text-white">
                                {dev.label}
                                {dev.id === currentDeviceId ? ' · Current Browser' : ''}
                              </p>
                              <p className="text-xs text-white/55 font-mono-tabular">
                                Trusted {new Date(dev.addedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRevokeDevice(dev.id)}
                              className="text-xs font-medium text-red-300 hover:text-red-200 hover:underline whitespace-nowrap cursor-pointer"
                            >
                              Revoke Trust
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
