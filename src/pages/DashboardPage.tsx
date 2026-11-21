import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LogOut,
  MessageCircle,
  Users,
  Calendar,
  TrendingUp,
  Camera,
  ShieldCheck,
  Compass,
  Edit3,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { BackButton } from '../components/BackButton';
import { ProfileEditModal } from '../components/ProfileEditModal';
import {
  getBatchStats,
  getUserProfile,
  UserProfile,
} from '../services/authService';

export function DashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [connections, setConnections] = useState<number>(0);
  const [messages, setMessages] = useState<number>(0);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [modalDefaultTab, setModalDefaultTab] = useState<'profile' | 'password' | 'security'>('profile');

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    getUserProfile(user.id).then(async (loaded) => {
      if (cancelled || !loaded) return;
      setProfile(loaded);

      if (loaded.batch) {
        const stats = await getBatchStats(user.id, loaded.batch);
        if (!cancelled) {
          setConnections(stats.connections);
          setMessages(stats.messages);
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleProfileUpdate = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
  };

  const stats = [
    { label: 'Your Batch', value: profile?.batch || '—', icon: Users },
    { label: 'Batchmates Online', value: connections.toString(), icon: TrendingUp },
    { label: 'Batch Messages', value: messages.toString(), icon: MessageCircle },
  ];

  return (
    <div className="min-h-screen bg-[#120409] text-white relative">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-80 opacity-45"
        style={{
          background:
            'radial-gradient(ellipse at top, rgba(128, 0, 32, 0.55), transparent 70%)',
        }}
      />

      <Navbar />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
        <div className="mb-6">
          <BackButton fallbackTo="/" label="Back" />
        </div>

        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="hud-card relative rounded-2xl border border-white/15 bg-gradient-to-br from-[#240612] via-[#1a060e] to-[#120409] p-6 sm:p-8 mb-8 overflow-hidden shadow-[0_24px_70px_rgba(0,0,0,0.55)]"
        >
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-5 sm:gap-6">
              {/* Clickable Profile Avatar */}
              <button
                type="button"
                onClick={() => {
                  setModalDefaultTab('profile');
                  setIsProfileModalOpen(true);
                }}
                className="relative group shrink-0 cursor-pointer"
                aria-label="Edit profile picture and details"
              >
                <div className="w-20 h-20 rounded-full overflow-hidden bg-[#120409] border-2 border-[#d4af37] group-hover:border-[#ffcf8a] transition-all">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#ffcf8a] font-display text-3xl font-bold">
                      {profile?.full_name?.charAt(0).toUpperCase() || 'G'}
                    </div>
                  )}
                </div>
                <div className="absolute bottom-0 right-0 w-7 h-7 bg-[#d4af37] text-[#1c040b] rounded-full flex items-center justify-center shadow-lg">
                  <Camera className="w-3.5 h-3.5" />
                </div>
              </button>

              <div>
                <p className="font-mono-tabular text-[11px] uppercase tracking-[0.26em] text-[#ffcf8a] mb-1">
                  Alumni Member{profile?.username ? ` · @${profile.username}` : ''}
                </p>
                <h1 className="font-display text-2xl sm:text-4xl font-bold text-white mb-1.5">
                  {profile?.full_name || 'Grizzly Vidyalya Member'}
                </h1>
                {profile && (
                  <p className="font-mono-tabular text-xs text-white/70">
                    {profile.admission_number} · {profile.class} · Batch {profile.batch}
                    {profile.compliance_accepted ? ' · Verified' : ''}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setModalDefaultTab('security');
                  setIsProfileModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-[#d4af37]/40 bg-[#120409]/80 text-[#ffcf8a] hover:bg-[#d4af37]/15 transition-colors text-xs font-semibold uppercase tracking-wider cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                Passkeys &amp; Devices
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/15 bg-white/5 text-white/85 hover:bg-white/10 hover:text-white transition-colors text-xs font-semibold uppercase tracking-wider cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
              className="rounded-2xl border border-white/12 bg-[#1a060e]/85 p-6 hover:border-[#d4af37]/40 transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-xl border border-[#d4af37]/30 bg-[#800020]/30 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-[#ffcf8a]" />
                </div>
              </div>
              <p className="font-mono-tabular text-3xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-white/65 text-xs uppercase tracking-wider">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Alumni Profile Overview */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="lg:col-span-2 rounded-2xl border border-white/12 bg-[#1a060e]/85 p-6 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-4 mb-4">
                <h2 className="font-display text-xl font-bold text-white flex items-center gap-2.5">
                  <TrendingUp className="w-5 h-5 text-[#ffcf8a]" />
                  Alumni Profile Overview
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setModalDefaultTab('profile');
                    setIsProfileModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#ffcf8a] hover:text-white transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Details
                </button>
              </div>

              {profile?.onboarding_goal || profile?.onboarding_bio ? (
                <dl className="space-y-3 text-sm text-white/80 py-2 border-t border-white/10 pt-4">
                  {profile.onboarding_goal && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <dt className="font-mono-tabular text-xs uppercase tracking-wider text-white/50">
                        Network Focus
                      </dt>
                      <dd className="text-[#ffcf8a] font-medium">{profile.onboarding_goal}</dd>
                    </div>
                  )}
                  {profile.onboarding_bio && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <dt className="font-mono-tabular text-xs uppercase tracking-wider text-white/50">
                        Current Role / City
                      </dt>
                      <dd className="text-white">{profile.onboarding_bio}</dd>
                    </div>
                  )}
                </dl>
              ) : (
                <div className="py-6 border-t border-white/10">
                  <p className="text-white/70 text-sm">
                    Add your current role or city so fellow Grizzly Vidyalaya alumni can recognize your chapter.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => navigate('/directory')}
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#ffcf8a] hover:text-white transition-colors cursor-pointer"
              >
                Browse Alumni Directory
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/chat')}
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/75 hover:text-[#ffcf8a] transition-colors cursor-pointer"
              >
                Open Batch Chat
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>

          {/* Campus Exhibition & Reunions */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-white/12 bg-[#1a060e]/85 p-6 flex flex-col justify-between"
          >
            <div>
              <h2 className="font-display text-xl font-bold text-white mb-3 flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-[#ffcf8a]" />
                Heritage &amp; Chapters
              </h2>
              <p className="text-sm text-white/70 leading-relaxed">
                Revisit the 4-wing 3D campus exhibition or join the reunions channel to plan local batch meetups.
              </p>
            </div>

            <div className="mt-6 space-y-2.5">
              <button
                type="button"
                onClick={() => navigate('/chat?room=reunions')}
                className="w-full py-2.5 px-4 rounded-xl bg-[#d4af37] text-[#1c040b] text-xs font-semibold uppercase tracking-wider hover:bg-[#ffcf8a] transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Open Reunions Channel
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-full py-2.5 px-4 rounded-xl border border-white/15 bg-[#120409] text-white/85 text-xs font-semibold uppercase tracking-wider hover:border-[#d4af37]/40 hover:text-white transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 text-[#ffcf8a]" />
                Walk 3D Exhibition
              </button>
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <button
            type="button"
            onClick={() => navigate('/directory')}
            className="p-6 bg-[#1a060e]/85 rounded-2xl border border-white/12 hover:border-[#d4af37]/50 transition-all hover:-translate-y-0.5 text-center group cursor-pointer"
          >
            <Users className="w-7 h-7 text-[#ffcf8a] mx-auto mb-2.5 group-hover:scale-105 transition-transform" />
            <p className="font-semibold text-white text-sm">Directory</p>
          </button>
          <button
            type="button"
            onClick={() => navigate('/chat')}
            className="p-6 bg-[#1a060e]/85 rounded-2xl border border-white/12 hover:border-[#d4af37]/50 transition-all hover:-translate-y-0.5 text-center group cursor-pointer"
          >
            <MessageCircle className="w-7 h-7 text-[#ffcf8a] mx-auto mb-2.5 group-hover:scale-105 transition-transform" />
            <p className="font-semibold text-white text-sm">Group Chat</p>
          </button>
          <button
            type="button"
            onClick={() => {
              setModalDefaultTab('profile');
              setIsProfileModalOpen(true);
            }}
            className="p-6 bg-[#1a060e]/85 rounded-2xl border border-white/12 hover:border-[#d4af37]/50 transition-all hover:-translate-y-0.5 text-center group cursor-pointer"
          >
            <Camera className="w-7 h-7 text-[#ffcf8a] mx-auto mb-2.5 group-hover:scale-105 transition-transform" />
            <p className="font-semibold text-white text-sm">Edit Profile</p>
          </button>
          <button
            type="button"
            onClick={() => {
              setModalDefaultTab('security');
              setIsProfileModalOpen(true);
            }}
            className="p-6 bg-[#1a060e]/85 rounded-2xl border border-white/12 hover:border-[#d4af37]/50 transition-all hover:-translate-y-0.5 text-center group cursor-pointer"
          >
            <ShieldCheck className="w-7 h-7 text-[#ffcf8a] mx-auto mb-2.5 group-hover:scale-105 transition-transform" />
            <p className="font-semibold text-white text-sm">Passkeys &amp; Devices</p>
          </button>
        </motion.div>
      </main>

      {/* Profile & Security Edit Modal */}
      {user && profile && (
        <ProfileEditModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          userId={user.id}
          userEmail={user.email}
          defaultTab={modalDefaultTab}
          currentProfile={profile}
          onProfileUpdate={handleProfileUpdate}
        />
      )}
    </div>
  );
}
