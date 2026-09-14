import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, MessageCircle, Users } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />

      {/* Main */}
      <main className="max-w-4xl mx-auto px-5 py-8">
        {/* Welcome Card */}
        <div className="bg-gradient-to-br from-maroon-800 via-maroon-900 to-maroon-950 rounded-2xl p-6 sm:p-8 shadow-xl shadow-maroon-900/20 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gold-500/10 rounded-full -translate-y-32 translate-x-32" />
          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gold-500 text-xs font-semibold tracking-widest uppercase mb-2">
                  Welcome Back
                </p>
                <h2 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">
                  {profile ? profile.full_name : 'Grizzly'}
                </h2>
              </div>
              <img
                src="/gvlogo.png"
                alt="GV Logo"
                width={60}
                height={60}
                className="rounded-full border-2 border-gold-500/50 opacity-80"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>

            {profile && (
              <div className="mt-5 pt-5 border-t border-white/10">
                <p className="text-white/70 text-sm">
                  {profile.admission_number} • Class {profile.class} • Batch {profile.batch}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Feature cards */}
        <div className="mt-6 grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-5 border border-neutral-200 shadow-sm hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-gold-100 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-gold-600" />
              </div>
              <div>
                <p className="font-semibold text-neutral-900 text-[15px]">Group Chat</p>
                <p className="text-neutral-500 text-sm">Coming soon</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-neutral-200 shadow-sm hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-maroon-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-maroon-700" />
              </div>
              <div>
                <p className="font-semibold text-slate-clean-900 text-[15px]">Alumni Directory</p>
                <p className="text-slate-clean-500 text-sm">Coming soon</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
