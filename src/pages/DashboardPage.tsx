import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mountain, LogOut, MessageCircle, Users, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase/client';

interface Profile {
  full_name: string;
  admission_number: string;
  class: string;
  batch: string;
  email: string;
}

export function DashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (data) setProfile(data as Profile);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-clean-50">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 opacity-[0.015] pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(107, 18, 48) 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }} />
      </div>

      {/* Header */}
      <header className="relative z-10 bg-white/80 backdrop-blur-lg border-b border-slate-clean-100 sticky top-0">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-maroon-800 to-maroon-950 flex items-center justify-center shadow-sm">
              <Mountain className="w-4.5 h-4.5 text-amber-warm-400" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">
                <span className="text-maroon-900">GV</span>
                <span className="text-amber-warm-600">Connect</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="w-9 h-9 rounded-full flex items-center justify-center text-slate-clean-500 hover:bg-slate-clean-100 transition-colors">
              <Bell className="w-[18px] h-[18px]" />
            </button>
            <button
              onClick={handleSignOut}
              className="w-9 h-9 rounded-full flex items-center justify-center text-slate-clean-500 hover:bg-slate-clean-100 transition-colors"
            >
              <LogOut className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-lg mx-auto px-5 py-8">
        {/* Welcome Card */}
        <div className="bg-gradient-to-br from-maroon-800 via-maroon-900 to-maroon-950 rounded-2xl p-6 sm:p-8 shadow-xl shadow-maroon-900/20 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-amber-warm-300 text-xs font-semibold tracking-widest uppercase mb-2">
                Welcome to
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                GV<span className="text-amber-warm-400">Connect</span>
              </h2>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
              <Mountain className="w-6 h-6 text-amber-warm-400" strokeWidth={1.5} />
            </div>
          </div>

          {profile && (
            <div className="mt-5 pt-5 border-t border-white/10">
              <p className="text-white/90 text-lg font-semibold">{profile.full_name}</p>
              <p className="text-white/50 text-sm mt-0.5">
                {profile.admission_number} • Class {profile.class} • Batch {profile.batch}
              </p>
            </div>
          )}
        </div>

        {/* Feature Cards (Placeholder for Step 3) */}
        <div className="mt-6 space-y-3">
          <div className="bg-white rounded-xl p-5 border border-slate-clean-100 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-amber-warm-50 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-amber-warm-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-clean-900 text-[15px]">Group Chat</p>
                <p className="text-slate-clean-500 text-sm">Coming in Step 3</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-clean-100 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-maroon-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-maroon-700" />
              </div>
              <div>
                <p className="font-semibold text-slate-clean-900 text-[15px]">Alumni Directory</p>
                <p className="text-slate-clean-500 text-sm">Coming soon</p>
              </div>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-warm-50 border border-amber-warm-200">
            <div className="w-2 h-2 rounded-full bg-amber-warm-500 animate-pulse" />
            <span className="text-xs font-semibold text-amber-warm-700 tracking-wide uppercase">
              Step 2 — Auth Complete
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
