import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Navbar } from '../components/Navbar';
import { Search, Filter, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { listAlumniDirectory, UserProfile } from '../services/authService';

export function DirectoryPage() {
  const { user, deviceVerified } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [alumni, setAlumni] = useState<UserProfile[]>([]);

  useEffect(() => {
    listAlumniDirectory().then(setAlumni);
  }, []);

  const batches = Array.from({ length: 26 }, (_, i) => String(2026 - i));
  const classes = [
    'Nursery',
    'LKG',
    'UKG',
    '1st',
    '2nd',
    '3rd',
    '4th',
    '5th',
    '6th',
    '7th',
    '8th',
    '9th',
    '10th',
    '11th',
    '12th',
  ];

  const filteredAlumni = alumni.filter((alum) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      alum.full_name.toLowerCase().includes(q) ||
      (alum.username || '').toLowerCase().includes(q);
    const matchesBatch = !selectedBatch || alum.batch === selectedBatch;
    const matchesClass = !selectedClass || alum.class === selectedClass;
    return matchesSearch && matchesBatch && matchesClass;
  });

  const isAuthenticated = Boolean(user && deviceVerified);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-[#800020] mb-4">
            Alumni Directory
          </h1>
          <p className="text-lg text-[#525252] max-w-2xl mx-auto">
            Connect with fellow Grizzlians from across all batches
          </p>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="bg-white rounded-xl border border-[#e5e5e5] p-6 mb-8"
        >
          <div className="grid md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#737373]" />
              <input
                type="text"
                placeholder="Search by name or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-[#e5e5e5] rounded-lg focus:outline-none focus:border-[#800020] transition-all"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#737373]" />
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-[#e5e5e5] rounded-lg focus:outline-none focus:border-[#800020] transition-all appearance-none bg-white"
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
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#737373]" />
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-[#e5e5e5] rounded-lg focus:outline-none focus:border-[#800020] transition-all appearance-none bg-white"
              >
                <option value="">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>

        {filteredAlumni.length > 0 && (
          <div className="mb-6">
            <p className="text-[#525252] text-sm tabular-nums">
              Showing {filteredAlumni.length} {filteredAlumni.length === 1 ? 'alumnus' : 'alumni'}
            </p>
          </div>
        )}

        {filteredAlumni.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAlumni.map((alum, index) => (
              <motion.div
                key={alum.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="bg-white rounded-xl border border-[#e5e5e5] hover:border-[#D4AF37] transition-colors p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#800020] to-[#600018] flex items-center justify-center text-[#D4AF37] font-serif text-xl font-bold flex-shrink-0 overflow-hidden">
                    {alum.avatar_url ? (
                      <img src={alum.avatar_url} alt={alum.full_name} className="w-full h-full object-cover" />
                    ) : (
                      alum.full_name.charAt(0).toUpperCase()
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-serif font-bold text-[#800020] truncate">
                      {alum.full_name}
                    </h3>
                    {alum.username && (
                      <p className="text-xs text-[#737373] mb-1">@{alum.username}</p>
                    )}
                    <p className="text-sm text-[#525252]">
                      Batch of {alum.batch} · Class {alum.class}
                    </p>
                    {alum.onboarding_bio && (
                      <p className="text-xs text-[#737373] mt-1.5 truncate">{alum.onboarding_bio}</p>
                    )}
                    <Link
                      to={isAuthenticated ? '/chat' : '/auth?mode=login'}
                      className="mt-4 inline-flex w-full items-center justify-center py-2 px-4 bg-[#800020] text-[#D4AF37] rounded-lg font-semibold text-sm hover:bg-[#600018] transition-colors"
                    >
                      Connect
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Users className="w-16 h-16 text-[#e5e5e5] mx-auto mb-4" />
            <h3 className="text-xl font-serif font-bold text-[#525252] mb-2">
              No Alumni Found
            </h3>
            <p className="text-[#737373] mb-6">
              {searchQuery || selectedBatch || selectedClass
                ? 'Try adjusting your search or filters.'
                : 'Be the first to join the directory.'}
            </p>
            {!isAuthenticated && (
              <Link
                to="/auth?mode=signup"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#D4AF37] text-[#800020] rounded-full font-semibold hover:bg-[#e6c65c] transition-colors"
              >
                Join GVConnect
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
