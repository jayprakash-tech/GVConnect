import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, MessageCircle, Users, Calendar, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase/client';
import { Navbar } from '../components/Navbar';

interface Profile {
  full_name: string;
  admission_number: string;
  class: string;
  batch: string;
}

export function DashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('full_name, admission_number, class, batch')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setProfile(data);
        });
    }
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const stats = [
    { label: 'Your Batch', value: profile?.batch || 'N/A', icon: Users },
    { label: 'Connections', value: '24', icon: TrendingUp },
    { label: 'Messages', value: '12', icon: MessageCircle },
  ];

  const recentActivity = [
    { type: 'message', text: 'New message from Rahul Sharma', time: '2 hours ago' },
    { type: 'event', text: 'Batch of 2015 reunion planned', time: '1 day ago' },
    { type: 'connection', text: 'Priya Mehta joined your network', time: '2 days ago' },
  ];

  const upcomingEvents = [
    { title: 'Annual Alumni Meet', date: 'April 20, 2026', location: 'School Campus' },
    { title: 'Batch of 2010 Reunion', date: 'May 15, 2026', location: 'City Hotel' },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-maroon-800 to-maroon-900 rounded-2xl p-8 mb-8 relative overflow-hidden shadow-premium"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-gold-500/10 rounded-full -translate-y-32 translate-x-32" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <p className="text-gold-500 text-sm font-semibold tracking-widest uppercase mb-2">
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
              className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-shadow border-t-4 border-gold-500"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-maroon-100 rounded-xl flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-maroon-800" />
                </div>
              </div>
              <p className="text-3xl font-bold text-maroon-800 mb-1">{stat.value}</p>
              <p className="text-neutral-500 text-sm">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm"
          >
            <h2 className="text-xl font-serif font-bold text-maroon-800 mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gold-500" />
              Recent Activity
            </h2>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 rounded-lg hover:bg-neutral-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-gold-100 rounded-full flex items-center justify-center flex-shrink-0">
                    {activity.type === 'message' && <MessageCircle className="w-5 h-5 text-gold-600" />}
                    {activity.type === 'event' && <Calendar className="w-5 h-5 text-gold-600" />}
                    {activity.type === 'connection' && <Users className="w-5 h-5 text-gold-600" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-neutral-900 font-medium">{activity.text}</p>
                    <p className="text-neutral-500 text-sm">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Upcoming Events */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl p-6 shadow-sm"
          >
            <h2 className="text-xl font-serif font-bold text-maroon-800 mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gold-500" />
              Upcoming Events
            </h2>
            <div className="space-y-4">
              {upcomingEvents.map((event, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border border-neutral-200 hover:border-gold-500 transition-colors"
                >
                  <h3 className="font-semibold text-neutral-900 mb-2">{event.title}</h3>
                  <p className="text-sm text-neutral-600 mb-1">{event.date}</p>
                  <p className="text-sm text-neutral-500">{event.location}</p>
                </div>
              ))}
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
          <button className="p-6 bg-white rounded-xl shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 text-center group">
            <Users className="w-8 h-8 text-maroon-800 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="font-semibold text-neutral-900 text-sm">Directory</p>
          </button>
          <button className="p-6 bg-white rounded-xl shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 text-center group">
            <MessageCircle className="w-8 h-8 text-maroon-800 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="font-semibold text-neutral-900 text-sm">Messages</p>
          </button>
          <button className="p-6 bg-white rounded-xl shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 text-center group">
            <Calendar className="w-8 h-8 text-maroon-800 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="font-semibold text-neutral-900 text-sm">Events</p>
          </button>
          <button className="p-6 bg-white rounded-xl shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 text-center group">
            <TrendingUp className="w-8 h-8 text-maroon-800 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="font-semibold text-neutral-900 text-sm">Activity</p>
          </button>
        </motion.div>
      </main>
    </div>
  );
}
