import { useState } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '../components/Navbar';
import { Search, Filter, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Alumni {
  id: string;
  full_name: string;
  batch: string;
  class: string;
}

export function DirectoryPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  // Placeholder for alumni data - will be populated from database
  const alumni: Alumni[] = [];

  const batches = Array.from({ length: 25 }, (_, i) => String(new Date().getFullYear() - i));
  const classes = ['Nursery', 'LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

  const filteredAlumni = alumni.filter((alum) => {
    const matchesSearch = alum.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBatch = !selectedBatch || alum.batch === selectedBatch;
    const matchesClass = !selectedClass || alum.class === selectedClass;
    return matchesSearch && matchesBatch && matchesClass;
  });

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-[#800020] mb-4">
            Alumni Directory
          </h1>
          <p className="text-lg text-[#666666] max-w-2xl mx-auto">
            Connect with fellow Grizzlians from across all batches
          </p>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-[#f0f0f0] shadow-sm p-6 mb-8"
        >
          <div className="grid md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#999999]" />
              <input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] transition-all"
              />
            </div>

            {/* Batch Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#999999]" />
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] transition-all appearance-none bg-white"
              >
                <option value="">All Batches</option>
                {batches.map((batch) => (
                  <option key={batch} value={batch}>
                    Batch of {batch}
                  </option>
                ))}
              </select>
            </div>

            {/* Class Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#999999]" />
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] transition-all appearance-none bg-white"
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

        {/* Results Count */}
        {filteredAlumni.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <p className="text-[#666666]">
              Showing {filteredAlumni.length} {filteredAlumni.length === 1 ? 'alumnus' : 'alumni'}
            </p>
          </motion.div>
        )}

        {/* Alumni Grid */}
        {filteredAlumni.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAlumni.map((alum, index) => (
              <motion.div
                key={alum.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6 border-t-4 border-[#D4AF37]"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#800020] to-[#600018] flex items-center justify-center text-[#D4AF37] font-serif text-2xl font-bold flex-shrink-0">
                    {alum.full_name.charAt(0)}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1">
                    <h3 className="text-lg font-serif font-bold text-[#800020] mb-1">
                      {alum.full_name}
                    </h3>
                    <p className="text-sm text-[#666666] mb-1">
                      Batch of {alum.batch}
                    </p>
                    <p className="text-sm text-[#666666] mb-3">
                      Class {alum.class}
                    </p>
                    <button className="w-full py-2 px-4 bg-[#D4AF37] text-[#800020] rounded-lg font-semibold text-sm hover:bg-[#e6c65c] transition-colors">
                      Connect
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center py-16"
          >
            <Users className="w-16 h-16 text-[#e5e5e5] mx-auto mb-4" />
            <h3 className="text-xl font-serif font-bold text-[#666666] mb-2">
              No Alumni Found
            </h3>
            <p className="text-[#999999] mb-6">
              {searchQuery || selectedBatch || selectedClass
                ? 'Try adjusting your search or filters'
                : user
                  ? 'You are the first Grizzlian here! Invite your batchmates to join the directory.'
                  : 'Be the first to join the directory!'}
            </p>
            {!searchQuery && !selectedBatch && !selectedClass && !user && (
              <a
                href="/auth"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#D4AF37] text-[#800020] rounded-full font-semibold hover:bg-[#e6c65c] transition-colors"
              >
                Join GVConnect
              </a>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}
