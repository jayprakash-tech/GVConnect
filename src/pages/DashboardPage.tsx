import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, MessageCircle, Users, Calendar, TrendingUp, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase/client';
import { Navbar } from '../components/Navbar';
import { ProfileEditModal } from '../components/ProfileEditModal';

interface Profile {
  full_name: string;
  admission_number: string;
  class: string;
  batch: string;
  avatar_url?: string | null;
}

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [connections, setConnections] = useState<number>(0);
  const [messages, setMessages] = useState<number>(0);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      // Fetch user profile
      supabase
        .from('profiles')
        .select('full_name, admission_number, class, batch, avatar_url')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setProfile(data);
        });

      // Fetch connections count (alumni in same batch)
      const fetchConnections = async () => {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('batch')
          .eq('id', user.id)
          .single();

        if (profileData?.batch) {
          const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('batch', profileData.batch)
            .neq('id', user.id);

          setConnections(count || 0);
        }
      };

      // Fetch messages count
      const fetchMessages = async () => {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('batch')
          .eq('id', user.id)
          .single();

        if (profileData?.batch) {
          // Get all user IDs in the same batch
          const { data: batchUsers } = await supabase
            .from('profiles')
            .select('id')
            .eq('batch', profileData.batch);

          if (batchUsers && batchUsers.length > 0) {
            const userIds = batchUsers.map(u => u.id);
            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .in('user_id', userIds);

            setMessages(count || 0);
          }
        }
      };

      fetchConnections();
      fetchMessages();
    }
  }, [user]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleProfileUpdate = (updatedProfile: Profile) => {
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[#800020] via-[#800020] to-[#600018] rounded-2xl p-8 mb-8 relative overflow-hidden"
          style={{ boxShadow: '0 4px 6px -1px rgba(128, 0, 32, 0.1)' }}
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/10 rounded-full -translate-y-32 translate-x-32" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              {/* Clickable Profile Avatar */}
              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="relative group flex-shrink-0"
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
                <p className="text-[#D4AF37] text-sm font-semibold tracking-widest uppercase mb-2">
                  Welcome Back
                </p>
                <h1 className="text-3xl md:text-4xl font-serif font-bold text-white mb-2">
                  {profile?.full_name || 'Grizzlian'}!
                </h1>
                {profile && (
                  <p className="text-white/70">
                    {profile.admission_number} • Class {profile.class} • Batch {profile.batch}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur text-white rounded-full hover:bg-white/20 transition-all border border-white/20"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl p-6 border border-[#f0f0f0] hover:border-[#D4AF37]/30 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-[#fff5f7] rounded-xl flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-[#800020]" />
                </div>
              </div>
              <p className="text-3xl font-bold text-[#800020] mb-1">{stat.value}</p>
              <p className="text-[#666666] text-sm">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2 bg-white rounded-xl p-6 border border-[#f0f0f0]"
          >
            <h2 className="text-xl font-serif font-bold text-[#800020] mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
              Recent Activity
            </h2>
            <div className="text-center py-12">
              <MessageCircle className="w-12 h-12 text-[#e5e5e5] mx-auto mb-3" />
              <p className="text-[#666666] text-sm">No recent activity yet</p>
              <p className="text-[#999999] text-xs mt-1">Start connecting with fellow Grizzlians!</p>
            </div>
          </motion.div>

          {/* Upcoming Events */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl p-6 border border-[#f0f0f0]"
          >
            <h2 className="text-xl font-serif font-bold text-[#800020] mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#D4AF37]" />
              Upcoming Events
            </h2>
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-[#e5e5e5] mx-auto mb-3" />
              <p className="text-[#666666] text-sm">No upcoming events</p>
              <p className="text-[#999999] text-xs mt-1">Stay tuned for alumni reunions!</p>
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <button className="p-6 bg-white rounded-xl border border-[#f0f0f0] hover:border-[#D4AF37]/30 transition-all hover:-translate-y-1 text-center group">
            <Users className="w-8 h-8 text-[#800020] mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="font-semibold text-[#1a1a1a] text-sm">Directory</p>
          </button>
          <button className="p-6 bg-white rounded-xl border border-[#f0f0f0] hover:border-[#D4AF37]/30 transition-all hover:-translate-y-1 text-center group">
            <MessageCircle className="w-8 h-8 text-[#800020] mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="font-semibold text-[#1a1a1a] text-sm">Messages</p>
          </button>
          <button className="p-6 bg-white rounded-xl border border-[#f0f0f0] hover:border-[#D4AF37]/30 transition-all hover:-translate-y-1 text-center group">
            <Calendar className="w-8 h-8 text-[#800020] mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="font-semibold text-[#1a1a1a] text-sm">Events</p>
          </button>
          <button className="p-6 bg-white rounded-xl border border-[#f0f0f0] hover:border-[#D4AF37]/30 transition-all hover:-translate-y-1 text-center group">
            <TrendingUp className="w-8 h-8 text-[#800020] mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="font-semibold text-[#1a1a1a] text-sm">Activity</p>
          </button>
        </motion.div>
      </main>

      {/* Profile Edit Modal */}
      {user && profile && (
        <ProfileEditModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          userId={user.id}
          currentProfile={profile}
          onProfileUpdate={handleProfileUpdate}
        />
      )}
    </div>
  );
}
