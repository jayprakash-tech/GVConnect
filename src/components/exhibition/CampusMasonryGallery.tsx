import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Compass, Expand, X } from 'lucide-react';
import { progressForExhibit, scrollToProgress } from '../../data/exhibitionData';

export type MasonryCategory =
  | 'All Spaces'
  | 'Campus & Grounds'
  | 'Labs & Classrooms'
  | 'Residential & Dining'
  | 'Wellness & Culture';

export interface CampusGalleryPhoto {
  id: string;
  src: string;
  title: string;
  wing: string;
  category: Exclude<MasonryCategory, 'All Spaces'>;
  description: string;
  aspectClass: string;
  exhibitId?: string;
}

export const CAMPUS_MASONRY_PHOTOS: CampusGalleryPhoto[] = [
  {
    id: 'm-gate',
    src: '/gate.png',
    title: 'Grizzly Vidyalaya Main Entrance Gate',
    wing: 'Campus I · Telaiya Dam',
    category: 'Campus & Grounds',
    description:
      'The iconic archway at Telaiya Dam where generations of Grizzlians arrived on their very first morning.',
    aspectClass: 'aspect-[16/9]',
    exhibitId: 'exhibit-gate',
  },
  {
    id: 'm-courtyard',
    src: '/innerview.png',
    title: 'Central Academic Quadrangle & Lawns',
    wing: 'Campus II · Main Complex',
    category: 'Campus & Grounds',
    description:
      'Sunlit academic blocks wrapped around landscaped lawns, pathways, and open assembly spaces.',
    aspectClass: 'aspect-[4/3]',
    exhibitId: 'exhibit-campus',
  },
  {
    id: 'm-smart-class',
    src: '/campus/campus-smart-class.png',
    title: 'Interactive Smart Classrooms',
    wing: 'Academic Wing · Digital Learning',
    category: 'Labs & Classrooms',
    description:
      'Smart visual panels, world globes, and chalkboard discussions turning geography and sciences into vivid dialogues.',
    aspectClass: 'aspect-[3/2]',
    exhibitId: 'exhibit-smart-class',
  },
  {
    id: 'm-bus-fleet',
    src: '/campus/campus-bus-fleet.png',
    title: 'School Transport Fleet on Telaiya Routes',
    wing: 'Logistics · Koderma & Jhumri Telaiya',
    category: 'Campus & Grounds',
    description:
      'Yellow Skyline school buses connecting neighborhoods across Koderma and Telaiya Dam every morning and afternoon.',
    aspectClass: 'aspect-[5/4]',
    exhibitId: 'exhibit-bus',
  },
  {
    id: 'm-facade',
    src: '/campus/campus-fire-drill.jpg',
    title: 'Yellow Academic Corridor & Open Courtyard',
    wing: 'Campus I · East Courtyard',
    category: 'Campus & Grounds',
    description:
      'The signature mustard-yellow academic facade framing assemblies, safety drills, and inter-house gatherings.',
    aspectClass: 'aspect-[16/10]',
    exhibitId: 'exhibit-courtyard-drill',
  },
  {
    id: 'm-study-hall',
    src: '/campus/campus-study-hall.png',
    title: 'Senior Evening Study & Prep Hall',
    wing: 'Academic Wing · Study Cubicles',
    category: 'Labs & Classrooms',
    description:
      'Dedicated individual desks under bright halls where board-exam batches prepared quietly side by side.',
    aspectClass: 'aspect-[4/3]',
    exhibitId: 'exhibit-study-hall',
  },
  {
    id: 'm-dining-mess',
    src: '/campus/campus-dining-mess.jpg',
    title: 'Boarding Dining Hall & Mess Commons',
    wing: 'Residential Campus · Mess Wing',
    category: 'Residential & Dining',
    description:
      'Spacious stainless-steel dining tables welcoming housemates every winter morning and evening.',
    aspectClass: 'aspect-[16/10]',
    exhibitId: 'exhibit-dining-mess',
  },
  {
    id: 'm-kitchen',
    src: '/campus/campus-kitchen.png',
    title: 'Hygienic Mechanized Campus Kitchen',
    wing: 'Residential Campus · Culinary Block',
    category: 'Residential & Dining',
    description:
      'Modern stainless-steel kitchen equipment preparing nutritious daily meals for boarding and day scholars.',
    aspectClass: 'aspect-[3/2]',
    exhibitId: 'exhibit-kitchen',
  },
  {
    id: 'm-av-lab',
    src: '/campus/campus-yoga.png',
    title: 'Audio-Visual Language & Phonetics Lab',
    wing: 'Campus II · North Wing',
    category: 'Labs & Classrooms',
    description:
      'Headset booths and interactive comprehension desks strengthening communication and language fluency.',
    aspectClass: 'aspect-[4/3]',
    exhibitId: 'exhibit-av-lab',
  },
  {
    id: 'm-play-park',
    src: '/campus/campus-play-park.png',
    title: 'Covered Activity Zone & Junior Play Park',
    wing: 'Campus II · Recreation Wing',
    category: 'Wellness & Culture',
    description:
      'All-weather covered play structures keeping younger classes active through monsoon and summer afternoons.',
    aspectClass: 'aspect-[5/4]',
    exhibitId: 'exhibit-play-park',
  },
  {
    id: 'm-robotics',
    src: '/campus/campus-robotics-workshop.png',
    title: 'ATL Robotics & Mentor Workshop',
    wing: 'Innovation Wing · STEM Studio',
    category: 'Labs & Classrooms',
    description:
      'Guided EV3 and servo robotics tables where students debugged builds alongside faculty mentors.',
    aspectClass: 'aspect-[16/10]',
    exhibitId: 'exhibit-atl',
  },
  {
    id: 'm-yoga-studio',
    src: '/campus/campus-yoga-studio.png',
    title: 'Indoor Yoga & Wellness Hall',
    wing: 'Campus III · Athletics & Mindfulness',
    category: 'Wellness & Culture',
    description:
      'Dedicated indoor practice mats fostering focus, posture, and calm balance alongside academic rigor.',
    aspectClass: 'aspect-[4/3]',
    exhibitId: 'exhibit-global',
  },
  {
    id: 'm-hostels',
    src: '/campus/campus-boys-hostel.jpg',
    title: 'Residential Boys & Girls Hostel Wings',
    wing: 'Campus II · Boarding Quarters',
    category: 'Residential & Dining',
    description:
      'Well-ventilated dormitories, study bays, and supportive house wardens forming a second home away from home.',
    aspectClass: 'aspect-[3/2]',
    exhibitId: 'exhibit-boys-hostel',
  },
  {
    id: 'm-library',
    src: '/campus/campus-library.png',
    title: 'Central Reference Library Stacks',
    wing: 'Campus I · Library Block',
    category: 'Labs & Classrooms',
    description:
      'Rows of textbooks, encyclopedias, and periodicals inspiring deep study across senior and junior grades.',
    aspectClass: 'aspect-[5/4]',
    exhibitId: 'exhibit-library',
  },
  {
    id: 'm-art-craft',
    src: '/campus/campus-art-craft.png',
    title: 'Fine Arts & Craft Workshop',
    wing: 'Cultural Wing · Creative Studio',
    category: 'Wellness & Culture',
    description:
      'Collaborative craft and design afternoons preparing stage props and seasonal exhibition pieces.',
    aspectClass: 'aspect-[16/10]',
    exhibitId: 'exhibit-fine-arts',
  },
];

const CATEGORIES: MasonryCategory[] = [
  'All Spaces',
  'Campus & Grounds',
  'Labs & Classrooms',
  'Residential & Dining',
  'Wellness & Culture',
];

export function CampusMasonryGallery({
  show3DJumps = true,
}: {
  show3DJumps?: boolean;
}) {
  const [category, setCategory] = useState<MasonryCategory>('All Spaces');
  const [activeId, setActiveId] = useState<string | null>(null);

  const visiblePhotos = useMemo(() => {
    if (category === 'All Spaces') return CAMPUS_MASONRY_PHOTOS;
    return CAMPUS_MASONRY_PHOTOS.filter((p) => p.category === category);
  }, [category]);

  const activeIdx = activeId
    ? visiblePhotos.findIndex((p) => p.id === activeId)
    : -1;
  const activePhoto = activeIdx >= 0 ? visiblePhotos[activeIdx] : null;

  useEffect(() => {
    if (!activePhoto) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveId(null);
      } else if (e.key === 'ArrowRight') {
        const next = visiblePhotos[(activeIdx + 1) % visiblePhotos.length];
        setActiveId(next.id);
      } else if (e.key === 'ArrowLeft') {
        const prev =
          visiblePhotos[(activeIdx - 1 + visiblePhotos.length) % visiblePhotos.length];
        setActiveId(prev.id);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activePhoto, activeIdx, visiblePhotos]);

  return (
    <div className="mt-24 pt-16 border-t border-white/10">
      {/* Header + Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <p className="text-xs font-mono-tabular uppercase tracking-[0.3em] text-[#ffcf8a]">
            Grizzly Vidyalaya · Infrastructure &amp; Grounds Archive
          </p>
          <h3 className="font-display mt-2 text-2xl sm:text-4xl font-bold text-white">
            Campus Landscape &amp; Facilities Masonry
          </h3>
          <p className="mt-2 max-w-2xl text-sm text-white/65 leading-relaxed">
            Every photograph from Grizzly Vidyalaya, Telaiya Dam—explore our
            classrooms, hostels, dining halls, labs, and open quadrangles in
            full view, or click any frame to inspect it up close.
          </p>
        </div>

        <div
          className="flex flex-wrap gap-2"
          role="tablist"
          aria-label="Filter campus infrastructure photos"
        >
          {CATEGORIES.map((cat) => {
            const active = category === cat;
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCategory(cat)}
                className={`rounded-lg border px-3.5 py-2 text-xs font-medium tracking-wide transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'border-[#d4af37] bg-[#d4af37] text-[#1c040b] font-semibold'
                    : 'border-white/12 bg-[#1a060e]/80 text-white/75 hover:border-[#d4af37]/45 hover:text-white'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Responsive Masonry Columns */}
      <div className="mt-10 columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
        {visiblePhotos.map((photo) => (
          <figure
            key={photo.id}
            className="break-inside-avoid group overflow-hidden rounded-2xl border border-white/10 bg-[#1a060e]/90 shadow-xl transition-all duration-300 hover:border-[#d4af37]/50"
          >
            <button
              type="button"
              onClick={() => setActiveId(photo.id)}
              className="relative block w-full text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]"
              aria-label={`View ${photo.title} in full screen`}
            >
              <div className={`relative w-full overflow-hidden ${photo.aspectClass}`}>
                <img
                  src={photo.src}
                  alt={photo.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#120409]/85 via-transparent to-transparent opacity-80 group-hover:opacity-65 transition-opacity" />
                <span className="pointer-events-none absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-[#120409]/75 text-[#ffcf8a] opacity-0 group-hover:opacity-100 transition-opacity">
                  <Expand className="h-4 w-4" />
                </span>
              </div>

              <figcaption className="p-4 sm:p-5">
                <p className="text-[10px] font-mono-tabular uppercase tracking-[0.24em] text-[#ffcf8a]">
                  {photo.wing}
                </p>
                <h4 className="font-display mt-1 text-lg font-bold text-white leading-snug">
                  {photo.title}
                </h4>
                <p className="mt-1.5 text-xs leading-relaxed text-white/65">
                  {photo.description}
                </p>
              </figcaption>
            </button>
          </figure>
        ))}
      </div>

      {/* Full-Screen Uncropped Lightbox Modal */}
      {activePhoto && (
        <div
          className="fixed inset-0 z-[75] flex items-center justify-center bg-black/85 p-4 sm:p-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label={activePhoto.title}
        >
          <button
            type="button"
            aria-label="Close full-view photo"
            onClick={() => setActiveId(null)}
            className="fixed inset-0 cursor-pointer"
          />

          <div className="hud-card relative z-10 w-full max-w-4xl overflow-hidden rounded-2xl border border-white/15 bg-[#120409] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
              <div>
                <p className="text-[10px] font-mono-tabular uppercase tracking-[0.26em] text-[#ffcf8a]">
                  {activePhoto.wing}
                </p>
                <h4 className="font-display text-lg sm:text-xl font-bold text-white">
                  {activePhoto.title}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveId(null)}
                aria-label="Close"
                className="rounded-lg border border-white/15 p-2 text-white/75 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-black/60 flex items-center justify-center max-h-[64vh] overflow-hidden">
              <img
                src={activePhoto.src}
                alt={activePhoto.title}
                className="max-h-[64vh] w-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-white/10 px-5 py-4">
              <p className="text-sm text-white/75 leading-relaxed max-w-xl">
                {activePhoto.description}
              </p>

              <div className="flex items-center gap-2 shrink-0">
                {show3DJumps && activePhoto.exhibitId && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = progressForExhibit(activePhoto.exhibitId!);
                      setActiveId(null);
                      scrollToProgress(target);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#d4af37] px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#1c040b] hover:bg-[#ffcf8a] transition-colors cursor-pointer"
                  >
                    <Compass className="h-3.5 w-3.5" />
                    View in 3D Wing
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    setActiveId(
                      visiblePhotos[
                        (activeIdx - 1 + visiblePhotos.length) % visiblePhotos.length
                      ].id
                    )
                  }
                  aria-label="Previous image"
                  className="rounded-lg border border-white/15 p-2 text-white/80 hover:bg-white/10 hover:text-white cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <span className="font-mono-tabular text-xs text-white/50 px-1">
                  {String(activeIdx + 1).padStart(2, '0')}/
                  {String(visiblePhotos.length).padStart(2, '0')}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setActiveId(visiblePhotos[(activeIdx + 1) % visiblePhotos.length].id)
                  }
                  aria-label="Next image"
                  className="rounded-lg border border-white/15 p-2 text-white/80 hover:bg-white/10 hover:text-white cursor-pointer"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
