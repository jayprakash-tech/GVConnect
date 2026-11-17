import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, MessageCircle, Users, Calendar, TrendingUp, Camera, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
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
    { label: 'Your Batch', value: profile?.batch || 'N/A', icon: Users },
    { label: 'Connections', value: connections.toString(), icon: TrendingUp },
    { label: 'Messages', value: messages.toString(), icon: MessageCircle },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12">
        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[#800020] via-[#800020] to-[#600018] rounded-2xl p-8 mb-8 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/10 rounded-full -translate-y-32 translate-x-32" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              {/* Clickable Profile Avatar */}
              <button
                onClick={() => {
                  setModalDefaultTab('profile');
                  setIsProfileModalOpen(true);
                }}
                className="relative group flex-shrink-0"
                aria-label="Edit profile"
              >
                <div className="w-20 h-20 rounded-full overflow-hidden bg-white/20 border-4 border-[#D4AF37] group-hover:border-white transition-all">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#D4AF37] text-3xl font-bold">
                      {profile?.full_name?.charAt(0).toUpperCase() || 'G'}
                    </div>
                  )}
                </div>
                <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#D4AF37] text-[#800020] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                  <Camera className="w-4 h-4" />
                </div>
              </button>

              <div>
                <p className="text-[#D4AF37] text-sm font-semibold tracking-wide mb-1">
                  Welcome Back{profile?.username ? ` · @${profile.username}` : ''}
                </p>
                <h1 className="text-3xl md:text-4xl font-serif font-bold text-white mb-2">
                  {profile?.full_name || 'Grizzlian'}
                </h1>
                {profile && (
                  <p className="text-white/80 text-sm">
                    {profile.admission_number} · Class {profile.class} · Batch {profile.batch}
                    {profile.compliance_accepted ? ' · Batch Compliance Verified' : ''}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  setModalDefaultTab('security');
                  setIsProfileModalOpen(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/10 text-[#D4AF37] rounded-full hover:bg-white/20 transition-all border border-[#D4AF37]/40 text-sm font-semibold"
              >
                <ShieldCheck className="w-4 h-4" />
                Passkeys & Devices
              </button>

              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all border border-white/20 text-sm font-semibold"
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
              key={index}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="bg-white rounded-xl p-6 border border-[#e5e5e5] hover:border-[#D4AF37]/50 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-[#fff5f7] rounded-xl flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-[#800020]" />
                </div>
              </div>
              <p className="text-3xl font-bold text-[#800020] mb-1 tabular-nums">{stat.value}</p>
              <p className="text-[#525252] text-sm">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Activity / Onboarding Goal */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 bg-white rounded-xl p-6 border border-[#e5e5e5]"
          >
            <h2 className="text-xl font-serif font-bold text-[#800020] mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
              Alumni Profile Overview
            </h2>
            {profile?.onboarding_goal || profile?.onboarding_bio ? (
              <div className="space-y-3 text-sm text-[#404040] py-4">
                {profile.onboarding_goal && (
                  <p>
                    <span className="font-semibold text-[#1a1a1a]">Focus:</span>{' '}
                    {profile.onboarding_goal}
                  </p>
                )}
                {profile.onboarding_bio && (
                  <p>
                    <span className="font-semibold text-[#1a1a1a]">Current Note:</span>{' '}
                    {profile.onboarding_bio}
                  </p>
                )}
                <p className="text-[#525252] pt-2">
                  Explore the Alumni Directory or Batch Chat below to connect with fellow Grizzlians.
                </p>
              </div>
            ) : (
              <div className="text-center py-10">
                <MessageCircle className="w-12 h-12 text-[#e5e5e5] mx-auto mb-3" />
                <p className="text-[#525252] text-sm">No recent activity yet</p>
                <p className="text-[#737373] text-xs mt-1">Start connecting with fellow Grizzlians.</p>
              </div>
            )}
          </motion.div>

          {/* Upcoming Events */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white rounded-xl p-6 border border-[#e5e5e5]"
          >
            <h2 className="text-xl font-serif font-bold text-[#800020] mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#D4AF37]" />
              Upcoming Events
            </h2>
            <div className="text-center py-10">
              <Calendar className="w-12 h-12 text-[#e5e5e5] mx-auto mb-3" />
              <p className="text-[#525252] text-sm">No upcoming events</p>
              <p className="text-[#737373] text-xs mt-1">Stay tuned for alumni reunions.</p>
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <button
            onClick={() => navigate('/directory')}
            className="p-6 bg-white rounded-xl border border-[#e5e5e5] hover:border-[#D4AF37] transition-all hover:-translate-y-0.5 text-center group"
          >
            <Users className="w-8 h-8 text-[#800020] mx-auto mb-2 group-hover:scale-105 transition-transform" />
            <p className="font-semibold text-[#1a1a1a] text-sm">Directory</p>
          </button>
          <button
            onClick={() => navigate('/chat')}
            className="p-6 bg-white rounded-xl border border-[#e5e5e5] hover:border-[#D4AF37] transition-all hover:-translate-y-0.5 text-center group"
          >
            <MessageCircle className="w-8 h-8 text-[#800020] mx-auto mb-2 group-hover:scale-105 transition-transform" />
            <p className="font-semibold text-[#1a1a1a] text-sm">Batch Chat</p>
          </button>
          <button
            onClick={() => {
              setModalDefaultTab('profile');
              setIsProfileModalOpen(true);
            }}
            className="p-6 bg-white rounded-xl border border-[#e5e5e5] hover:border-[#D4AF37] transition-all hover:-translate-y-0.5 text-center group"
          >
            <Camera className="w-8 h-8 text-[#800020] mx-auto mb-2 group-hover:scale-105 transition-transform" />
            <p className="font-semibold text-[#1a1a1a] text-sm">Edit Profile</p>
          </button>
          <button
            onClick={() => {
              setModalDefaultTab('security');
              setIsProfileModalOpen(true);
            }}
            className="p-6 bg-white rounded-xl border border-[#e5e5e5] hover:border-[#D4AF37] transition-all hover:-translate-y-0.5 text-center group"
          >
            <ShieldCheck className="w-8 h-8 text-[#800020] mx-auto mb-2 group-hover:scale-105 transition-transform" />
            <p className="font-semibold text-[#1a1a1a] text-sm">Passkeys & Devices</p>
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
