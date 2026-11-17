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
  const [avatarUrl, setAvatarUrl] = useState<string>(currentProfile.avatar_url || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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
      setAvatarUrl(currentProfile.avatar_url || '');
      setAvatarFile(null);
      setAvatarPreview(null);
      setError('');
      setSuccess('');
      loadSecurityData();
    }
  }, [isOpen, currentProfile, defaultTab]);

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
        avatar_url: avatarUrl,
        avatarFile,
      });

      setSuccess('Profile updated successfully.');
      onProfileUpdate(updated);
      setTimeout(() => onClose(), 1000);
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
      await registerPasskey(userId, userEmail, fullName);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.16 }}
            className="bg-white rounded-2xl border border-[#e5e5e5] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#800020] to-[#600018] p-6 flex items-center justify-between">
              <h2 className="text-2xl font-serif font-bold text-[#D4AF37]">
                Account & Security
              </h2>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-[#e5e5e5]">
              <div className="flex">
                <button
                  onClick={() => {
                    setActiveTab('profile');
                    setError('');
                    setSuccess('');
                  }}
                  className={`flex-1 py-3.5 px-4 text-sm font-semibold transition-all whitespace-nowrap ${
                    activeTab === 'profile'
                      ? 'text-[#800020] border-b-2 border-[#D4AF37]'
                      : 'text-[#525252] hover:text-[#800020]'
                  }`}
                >
                  <User className="w-4 h-4 inline-block mr-1.5" />
                  Profile
                </button>
                <button
                  onClick={() => {
                    setActiveTab('password');
                    setError('');
                    setSuccess('');
                  }}
                  className={`flex-1 py-3.5 px-4 text-sm font-semibold transition-all whitespace-nowrap ${
                    activeTab === 'password'
                      ? 'text-[#800020] border-b-2 border-[#D4AF37]'
                      : 'text-[#525252] hover:text-[#800020]'
                  }`}
                >
                  <Lock className="w-4 h-4 inline-block mr-1.5" />
                  Password
                </button>
                <button
                  onClick={() => {
                    setActiveTab('security');
                    setError('');
                    setSuccess('');
                  }}
                  className={`flex-1 py-3.5 px-4 text-sm font-semibold transition-all whitespace-nowrap ${
                    activeTab === 'security'
                      ? 'text-[#800020] border-b-2 border-[#D4AF37]'
                      : 'text-[#525252] hover:text-[#800020]'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 inline-block mr-1.5" />
                  Passkeys & Devices
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[64vh]">
              {error && (
                <div className="mb-4 p-3 bg-[#fef2f2] border border-[#fecaca] rounded-lg text-[#b91c1c] text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-4 p-3 bg-[#f0fdf4] border border-[#bbf7d0] rounded-lg text-[#166534] text-sm">
                  {success}
                </div>
              )}

              {activeTab === 'profile' && (
                <form onSubmit={handleProfileUpdate} className="space-y-5">
                  <div className="flex flex-col items-center">
                    <div className="relative group">
                      <div className="w-28 h-28 rounded-full overflow-hidden bg-[#fff5f7] border-4 border-[#D4AF37]">
                        {avatarPreview ? (
                          <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : avatarUrl ? (
                          <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#800020] text-3xl font-bold">
                            {fullName.charAt(0).toUpperCase() || 'G'}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-0 right-0 w-9 h-9 bg-[#800020] text-[#D4AF37] rounded-full flex items-center justify-center hover:bg-[#600018] transition-colors shadow-lg"
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
                    <p className="text-xs text-[#525252] mt-2">
                      Click camera icon to change profile picture (max 5MB)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-[#e5e5e5] rounded-xl focus:outline-none focus:border-[#800020]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                      Admission Number
                    </label>
                    <input
                      type="text"
                      value={admissionNumber}
                      onChange={(e) => setAdmissionNumber(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-[#e5e5e5] rounded-xl focus:outline-none focus:border-[#800020]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                        Class
                      </label>
                      <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-[#e5e5e5] rounded-xl bg-white focus:outline-none focus:border-[#800020]"
                      >
                        {classes.map((cls) => (
                          <option key={cls} value={cls}>
                            {cls}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                        Batch Year
                      </label>
                      <select
                        value={batchYear}
                        onChange={(e) => setBatchYear(e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-[#e5e5e5] rounded-xl bg-white focus:outline-none focus:border-[#800020]"
                      >
                        {batches.map((batch) => (
                          <option key={batch} value={batch}>
                            {batch}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-6 rounded-xl font-semibold text-[15px] bg-[#800020] text-[#D4AF37] hover:bg-[#600018] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>
              )}

              {activeTab === 'password' && (
                <form onSubmit={handlePasswordChange} className="space-y-5">
                  <div className="bg-[#fafafa] border border-[#e5e5e5] p-4 rounded-xl text-sm text-[#404040]">
                    New passwords must be at least 15 characters, or 8+ characters including a lowercase letter and a number.
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-[#e5e5e5] rounded-xl focus:outline-none focus:border-[#800020]"
                      placeholder="Enter current password"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-[#e5e5e5] rounded-xl focus:outline-none focus:border-[#800020]"
                      placeholder="15+ chars or 8+ with number & lowercase"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-[#e5e5e5] rounded-xl focus:outline-none focus:border-[#800020]"
                      placeholder="Confirm new password"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-6 rounded-xl font-semibold text-[15px] bg-[#800020] text-[#D4AF37] hover:bg-[#600018] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    {loading ? 'Changing Password...' : 'Change Password'}
                  </button>
                </form>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6">
                  {/* Passkeys Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-base font-semibold text-[#1a1a1a] flex items-center gap-2">
                          <Fingerprint className="w-4 h-4 text-[#800020]" />
                          Configured Passkeys
                        </h3>
                        <p className="text-xs text-[#525252] mt-0.5">
                          Sign in faster using your device biometrics or hardware security key.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRegisterPasskey}
                        disabled={loading}
                        className="px-3.5 py-2 rounded-lg bg-[#800020] text-[#D4AF37] text-xs font-semibold hover:bg-[#600018] transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Passkey
                      </button>
                    </div>

                    {passkeys.length === 0 ? (
                      <div className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-4 text-xs text-[#525252]">
                        No passkeys configured yet. Click "Add Passkey" to enroll this device.
                      </div>
                    ) : (
                      <div className="divide-y divide-[#e5e5e5] rounded-xl border border-[#e5e5e5]">
                        {passkeys.map((pk) => (
                          <div
                            key={pk.id}
                            className="p-3.5 flex items-center justify-between gap-3 text-sm"
                          >
                            <div>
                              <p className="font-medium text-[#1a1a1a]">{pk.label}</p>
                              <p className="text-xs text-[#737373]">
                                Added {new Date(pk.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemovePasskey(pk.id)}
                              className="p-2 text-[#525252] hover:text-[#b91c1c] rounded-lg transition-colors"
                              aria-label="Remove passkey"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Trusted Devices Section */}
                  <div className="space-y-3 pt-4 border-t border-[#e5e5e5]">
                    <div>
                      <h3 className="text-base font-semibold text-[#1a1a1a] flex items-center gap-2">
                        <Laptop className="w-4 h-4 text-[#800020]" />
                        Trusted Devices
                      </h3>
                      <p className="text-xs text-[#525252] mt-0.5">
                        Logging in from an unrecognized device triggers an email OTP verification challenge.
                      </p>
                    </div>

                    {trustedDevices.length === 0 ? (
                      <div className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-4 text-xs text-[#525252]">
                        No trusted devices recorded. Your next login will ask for an email OTP verification code.
                      </div>
                    ) : (
                      <div className="divide-y divide-[#e5e5e5] rounded-xl border border-[#e5e5e5]">
                        {trustedDevices.map((dev) => (
                          <div
                            key={dev.id}
                            className="p-3.5 flex items-center justify-between gap-3 text-sm"
                          >
                            <div>
                              <p className="font-medium text-[#1a1a1a]">
                                {dev.label}
                                {dev.id === currentDeviceId ? ' · Current Browser' : ''}
                              </p>
                              <p className="text-xs text-[#737373]">
                                Trusted {new Date(dev.addedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRevokeDevice(dev.id)}
                              className="text-xs font-medium text-[#b91c1c] hover:underline whitespace-nowrap"
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
