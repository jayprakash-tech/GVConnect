import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Navbar } from '../components/Navbar';
import { BackButton } from '../components/BackButton';
import { Search, Filter, Users, RotateCcw, ArrowRight, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { listAlumniDirectory, UserProfile } from '../services/authService';
import { CLASS_OPTIONS } from '../utils/authRules';

export function DirectoryPage() {
  const { user, deviceVerified } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [alumni, setAlumni] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlumnus, setSelectedAlumnus] = useState<UserProfile | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listAlumniDirectory()
      .then((rows) => {
        if (!cancelled) {
          setAlumni(rows);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedAlumnus) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedAlumnus(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedAlumnus]);

  const batches = Array.from({ length: 30 }, (_, i) => String(2026 - i));

  const filteredAlumni = alumni.filter((alum) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      alum.full_name.toLowerCase().includes(q) ||
      (alum.username || '').toLowerCase().includes(q) ||
      (alum.onboarding_bio || '').toLowerCase().includes(q);
    const matchesBatch = !selectedBatch || alum.batch === selectedBatch;
    const matchesClass = !selectedClass || alum.class === selectedClass;
    return matchesSearch && matchesBatch && matchesClass;
  });

  const hasActiveFilters = Boolean(searchQuery.trim() || selectedBatch || selectedClass);
  const isAuthenticated = Boolean(user && deviceVerified);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedBatch('');
    setSelectedClass('');
  };

  return (
    <div className="min-h-screen bg-[#120409] text-white relative">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-45"
        style={{
          background:
            'radial-gradient(ellipse at top, rgba(128, 0, 32, 0.55), transparent 70%)',
        }}
      />

      <Navbar />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
        <div className="mb-8 flex items-center justify-between gap-4">
          <BackButton fallbackTo="/" label="Back" />
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#1a060e] px-4 py-2 text-xs font-semibold text-[#ffcf8a] hover:border-[#d4af37]/50 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mb-10"
        >
          <p className="font-mono-tabular text-xs uppercase tracking-[0.32em] text-[#ffcf8a]">
            Verified Grizzly Vidyalya Network
          </p>
          <h1 className="font-display mt-3 text-4xl sm:text-5xl font-bold text-white">
            Alumni Directory
          </h1>
          <p className="mt-3 text-base text-white/70 leading-relaxed">
            Find batchmates, discover alumni across cities and disciplines, and start real-time conversations.
          </p>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="rounded-2xl border border-white/12 bg-[#1a060e]/85 p-5 sm:p-6 mb-8"
        >
          <div className="grid md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ffcf8a]/75" />
              <input
                type="text"
                placeholder="Search by name, username, or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search alumni"
                className="w-full pl-10 pr-4 py-3 border border-white/15 bg-[#120409] rounded-xl text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-[#d4af37] transition-all"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ffcf8a]/75" />
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                aria-label="Filter by batch year"
                className="w-full pl-10 pr-4 py-3 border border-white/15 bg-[#120409] rounded-xl text-sm text-white focus:outline-none focus:border-[#d4af37] transition-all appearance-none font-mono-tabular"
              >
                <option value="">All Batches</option>
                {batches.map((batch) => (
                  <option key={batch} value={batch}>
                    Batch of {batch}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ffcf8a]/75" />
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                aria-label="Filter by class"
                className="w-full pl-10 pr-4 py-3 border border-white/15 bg-[#120409] rounded-xl text-sm text-white focus:outline-none focus:border-[#d4af37] transition-all appearance-none"
              >
                <option value="">All Classes</option>
                {CLASS_OPTIONS.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls === 'PASSOUT' ? 'PASSOUT (Alumni)' : cls}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>

        {!loading && filteredAlumni.length > 0 && (
          <div className="mb-6 flex items-center justify-between">
            <p className="font-mono-tabular text-xs uppercase tracking-[0.22em] text-white/60">
              Showing {filteredAlumni.length} {filteredAlumni.length === 1 ? 'alumnus' : 'alumni'}
            </p>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2].map((idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-white/10 bg-[#1a060e]/60 p-6 h-44 animate-pulse"
              />
            ))}
          </div>
        ) : filteredAlumni.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAlumni.map((alum, index) => (
              <motion.div
                key={alum.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.04, 0.24) }}
                className="rounded-2xl border border-white/12 bg-[#1a060e]/85 hover:border-[#d4af37]/50 transition-all p-6 flex flex-col justify-between gap-5"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#800020] to-[#3b0614] border border-[#d4af37]/45 flex items-center justify-center text-[#ffcf8a] font-display text-xl font-bold shrink-0 overflow-hidden">
                    {alum.avatar_url ? (
                      <img src={alum.avatar_url} alt={alum.full_name} className="w-full h-full object-cover" />
                    ) : (
                      alum.full_name.charAt(0).toUpperCase()
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h2 className="font-display text-lg font-bold text-white truncate">
                      {alum.full_name}
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-white/65 font-mono-tabular">
                      <span>Batch {alum.batch}</span>
                      <span aria-hidden="true">·</span>
                      <span>{alum.class}</span>
                      {alum.username && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#ffcf8a]">@{alum.username}</span>
                        </>
                      )}
                    </div>
                    {alum.onboarding_bio && (
                      <p className="text-xs text-white/70 mt-2 truncate">{alum.onboarding_bio}</p>
                    )}
                    {alum.onboarding_goal && (
                      <p className="text-xs text-[#ffcf8a]/75 mt-1 truncate">
                        {alum.onboarding_goal}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setSelectedAlumnus(alum)}
                    className="flex-1 py-2 px-3 rounded-lg border border-white/15 bg-[#120409] text-xs font-semibold text-white/80 hover:text-white hover:border-[#d4af37]/40 transition-colors cursor-pointer"
                  >
                    View Profile
                  </button>
                  <Link
                    to={
                      isAuthenticated
                        ? `/chat?with=${encodeURIComponent(alum.username || alum.id)}&name=${encodeURIComponent(alum.full_name)}`
                        : '/auth?mode=login'
                    }
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#d4af37] text-[#1c040b] text-xs font-semibold hover:bg-[#ffcf8a] transition-colors"
                  >
                    <span>Connect</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-[#1a060e]/60 text-center py-16 px-6">
            <Users className="w-12 h-12 text-[#ffcf8a]/40 mx-auto mb-4" />
            <h3 className="font-display text-2xl font-bold text-white mb-2">
              {hasActiveFilters ? 'No Matching Alumni Found' : 'No Registered Alumni Yet'}
            </h3>
            <p className="text-sm text-white/65 max-w-md mx-auto mb-6">
              {hasActiveFilters
                ? 'Try clearing your search query or selecting a different batch year.'
                : 'Verified alumni profiles appear here as Grizzlians register and complete onboarding.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/15 bg-[#120409] text-xs font-semibold uppercase tracking-wider text-[#ffcf8a] hover:border-[#d4af37]/50 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Filters
                </button>
              )}
              {!isAuthenticated && (
                <Link
                  to="/auth?mode=signup"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#d4af37] text-[#1c040b] rounded-full text-xs font-semibold uppercase tracking-[0.16em] hover:bg-[#ffcf8a] transition-colors"
                >
                  Join GVConnect
                </Link>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Alumnus Detail Modal */}
      {selectedAlumnus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="hud-card relative w-full max-w-md rounded-xl border border-white/15 bg-[#14040a] p-6 text-white shadow-2xl">
            <button
              type="button"
              onClick={() => setSelectedAlumnus(null)}
              aria-label="Close profile details"
              className="absolute right-4 top-4 rounded-md border border-white/15 p-1.5 text-white/70 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#800020] to-[#3b0614] border-2 border-[#d4af37] flex items-center justify-center text-[#ffcf8a] font-display text-2xl font-bold shrink-0 overflow-hidden">
                {selectedAlumnus.avatar_url ? (
                  <img src={selectedAlumnus.avatar_url} alt={selectedAlumnus.full_name} className="w-full h-full object-cover" />
                ) : (
                  selectedAlumnus.full_name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0 pr-6">
                <p className="font-mono-tabular text-[10px] uppercase tracking-[0.26em] text-[#ffcf8a]">
                  Grizzly Vidyalya Alumni
                </p>
                <h2 className="font-display text-xl font-bold text-white truncate mt-0.5">
                  {selectedAlumnus.full_name}
                </h2>
                {selectedAlumnus.username && (
                  <p className="text-xs text-white/60 font-mono-tabular">@{selectedAlumnus.username}</p>
                )}
              </div>
            </div>

            <dl className="mt-5 space-y-2.5 border-t border-white/10 pt-4 text-xs">
              <div className="flex justify-between gap-4">
                <dt className="uppercase tracking-[0.18em] text-white/50">Batch</dt>
                <dd className="font-mono-tabular text-white font-medium">{selectedAlumnus.batch}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="uppercase tracking-[0.18em] text-white/50">Class</dt>
                <dd className="text-white font-medium">{selectedAlumnus.class}</dd>
              </div>
              {selectedAlumnus.onboarding_goal && (
                <div className="flex justify-between gap-4">
                  <dt className="uppercase tracking-[0.18em] text-white/50">Focus</dt>
                  <dd className="text-[#ffcf8a] text-right font-medium">{selectedAlumnus.onboarding_goal}</dd>
                </div>
              )}
              {selectedAlumnus.onboarding_bio && (
                <div className="flex justify-between gap-4">
                  <dt className="uppercase tracking-[0.18em] text-white/50">Note</dt>
                  <dd className="text-white/85 text-right">{selectedAlumnus.onboarding_bio}</dd>
                </div>
              )}
            </dl>

            <Link
              to={
                isAuthenticated
                  ? `/chat?with=${encodeURIComponent(selectedAlumnus.username || selectedAlumnus.id)}&name=${encodeURIComponent(selectedAlumnus.full_name)}`
                  : '/auth?mode=login'
              }
              onClick={() => setSelectedAlumnus(null)}
              className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#d4af37] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#1c040b] hover:bg-[#ffcf8a] transition-colors"
            >
              {isAuthenticated ? `Message ${selectedAlumnus.full_name.split(' ')[0]}` : 'Sign In to Connect'}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
