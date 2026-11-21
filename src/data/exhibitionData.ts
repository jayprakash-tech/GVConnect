import { useSyncExternalStore } from 'react';
import { inspectWebGLCapabilities } from '../utils/webglSupport';
import { computeWalkCampusProgress } from '../utils/exhibitionScroll';

export interface ExhibitItem {
  id: string;
  room: RoomId;
  kicker: string;
  title: string;
  subtitle: string;
  headline: string;
  about: string;
  facts: [string, string][];
  href: string;
  cta: string;
  imageSrc: string;
  x: number;
  y: number;
  z: number;
  rot: number;
  w: number;
  h: number;
}

export interface ChapterPlaque {
  id: string;
  n: string;
  title: string;
  lines: string[];
  x: number;
  z: number;
  rot: number;
  glow?: boolean;
  href?: string;
}

export interface WallSegment {
  id: string;
  room: RoomId;
  a: [number, number];
  b: [number, number];
  n: [number, number];
  t?: number;
}

export interface RoomDef {
  id: RoomId;
  kind: 'hall' | 'belvedere' | 'arcade' | 'folds';
  tone: 'black' | 'white';
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  a?: [number, number];
  dir?: number;
  len?: number;
}

export interface FeatureWall {
  id: string;
  room: RoomId;
  mode: 'gravity' | 'waves' | 'orbit' | 'neural' | 'fractal';
  x: number;
  z: number;
  rot: number;
  len: number;
  chapter: string;
  title: string;
  caption: string;
  safe: number;
  accent?: string;
  wall: string;
}

export interface GearDef {
  x: number;
  y: number;
  z: number;
  rot: number;
  d: number;
  teeth: number;
  dir: 1 | -1;
}

export interface LanternDef {
  x: number;
  z: number;
  rot: number;
}

export interface CameraWaypoint {
  p: [number, number, number];
  l: [number, number, number];
  hold?: number;
}

export type RoomId =
  | 'origin'
  | 'fold-heritage'
  | 'campus'
  | 'arcade'
  | 'belvedere'
  | 'folds'
  | 'reunion';

export interface RoomMeta {
  age: number;
  name: string;
  era: string;
  accent: string;
  from?: string;
}

export const WALL_HEIGHT = 4.6;
export const EYE_HEIGHT = 1.55;

export const ROOM_META: Record<RoomId, RoomMeta> = {
  origin: {
    age: 0,
    name: 'Campus I · The Gateway',
    era: 'Where Every Grizzlian Began',
    accent: '#ffb347',
  },
  'fold-heritage': {
    age: 0.7,
    name: 'The Heritage Passage',
    era: 'Across Decades',
    accent: '#e88b5a',
    from: '#ffb347',
  },
  campus: {
    age: 1.2,
    name: 'Campus II · Campus Life',
    era: 'Courtyards, Mess & Bus Rides',
    accent: '#ffcf8a',
  },
  arcade: {
    age: 2.0,
    name: 'The Years Between',
    era: 'Colonnade of Memories',
    accent: '#ff7aa8',
  },
  belvedere: {
    age: 2.6,
    name: 'Campus III · The Belvedere',
    era: 'Telaiya Dam Overlook',
    accent: '#f4a261',
  },
  folds: {
    age: 3.6,
    name: 'Across Generations',
    era: 'Past Meets Present',
    accent: '#8fe3ff',
    from: '#f4a261',
  },
  reunion: {
    age: 4.8,
    name: 'Campus IV · The Alumni Network',
    era: 'GVConnect Brotherhood',
    accent: '#bff4ff',
  },
};

const DIR_S: [number, number] = [0, 1];
const DIR_N: [number, number] = [0, -1];
const DIR_E: [number, number] = [1, 0];
const DIR_W: [number, number] = [-1, 0];

const rotFromNormal = (n: [number, number]) => Math.atan2(n[0], n[1]);

export const ROOMS: RoomDef[] = [];
export const WALLS: WallSegment[] = [];
export const PLAQUES: ChapterPlaque[] = [];
export const EXHIBITS: ExhibitItem[] = [];
export const FEATURE_WALLS: FeatureWall[] = [];
export const WAYPOINTS: CameraWaypoint[] = [];
export const LANTERNS: LanternDef[] = [];
export const GEARS: GearDef[] = [];

function addRoom(
  id: RoomId,
  tone: 'black' | 'white',
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  openings: { side: 'N' | 'S' | 'W' | 'E'; from: number; to: number }[] = []
) {
  ROOMS.push({
    id,
    kind: id === 'belvedere' ? 'belvedere' : 'hall',
    tone,
    x0,
    x1,
    z0,
    z1,
  });

  const sides: {
    side: 'N' | 'S' | 'W' | 'E';
    a: [number, number];
    b: [number, number];
    n: [number, number];
  }[] = [
    { side: 'N', a: [x0, z0], b: [x1, z0], n: [0, 1] },
    { side: 'S', a: [x1, z1], b: [x0, z1], n: [0, -1] },
    { side: 'W', a: [x0, z1], b: [x0, z0], n: [1, 0] },
    { side: 'E', a: [x1, z0], b: [x1, z1], n: [-1, 0] },
  ];

  for (const s of sides) {
    const axis = s.side === 'N' || s.side === 'S' ? 0 : 1;
    const min = Math.min(s.a[axis], s.b[axis]);
    const max = Math.max(s.a[axis], s.b[axis]);
    const cuts = openings
      .filter((o) => o.side === s.side)
      .sort((a, b) => a.from - b.from);

    let cursor = min;
    const segments: [number, number][] = [];
    for (const cut of cuts) {
      segments.push([cursor, cut.from]);
      cursor = cut.to;
    }
    segments.push([cursor, max]);

    segments.forEach(([segA, segB], idx) => {
      if (segB - segA < 0.05) return;
      const fixed = s.a[1 - axis];
      const pt = (val: number): [number, number] =>
        axis === 0 ? [val, fixed] : [fixed, val];
      WALLS.push({
        id: `${id}-${s.side}${idx}`,
        room: id,
        a: pt(segA),
        b: pt(segB),
        n: s.n,
      });
    });
  }
}

function addCorridor(
  id: RoomId,
  kind: 'arcade' | 'folds',
  start: [number, number],
  dir: number,
  len: number
) {
  const cos = Math.cos(dir);
  const sin = Math.sin(dir);
  const pt = (dist: number, y = EYE_HEIGHT): [number, number, number] => [
    start[0] + cos * dist,
    y,
    start[1] + sin * dist,
  ];
  WAYPOINTS.push({ p: pt(len * 0.45), l: pt(len + 6, 1.65) });
  WAYPOINTS.push({ p: pt(len + 0.8), l: pt(len + 8, 1.6) });

  ROOMS.push({
    id,
    kind,
    tone: 'white',
    x0: Math.min(start[0], start[0] + cos * len),
    x1: Math.max(start[0], start[0] + cos * len),
    z0: Math.min(start[1], start[1] + sin * len),
    z1: Math.max(start[1], start[1] + sin * len),
    a: start,
    dir,
    len,
  });
}

function addPlaque(
  id: string,
  n: string,
  title: string,
  lines: string[],
  x: number,
  z: number,
  normal: [number, number],
  glow = false,
  href?: string
) {
  PLAQUES.push({
    id,
    n,
    title,
    lines,
    x,
    z,
    rot: rotFromNormal(normal),
    glow,
    href,
  });
}

function addFeatureWall(
  room: RoomId,
  side: 'N' | 'S' | 'W' | 'E',
  mode: FeatureWall['mode'],
  chapter: string,
  title: string,
  caption: string,
  safeDistance: number,
  accent?: string
) {
  const wall = WALLS.filter(
    (w) => w.room === room && w.id.startsWith(`${room}-${side}`)
  ).sort(
    (a, b) =>
      Math.hypot(b.b[0] - b.a[0], b.b[1] - b.a[1]) -
      Math.hypot(a.b[0] - a.a[0], a.b[1] - a.a[1])
  )[0];
  if (!wall) return;

  const len = Math.hypot(wall.b[0] - wall.a[0], wall.b[1] - wall.a[1]);
  const x = (wall.a[0] + wall.b[0]) / 2 + wall.n[0] * 0.03;
  const z = (wall.a[1] + wall.b[1]) / 2 + wall.n[1] * 0.03;
  FEATURE_WALLS.push({
    id: `feature-${room}-${side}`,
    room,
    mode,
    x,
    z,
    rot: rotFromNormal(wall.n),
    len,
    chapter,
    title,
    caption,
    safe: Math.min(1, (safeDistance * 1.22) / len),
    accent,
    wall: wall.id,
  });
}

function addExhibit(
  ex: Omit<ExhibitItem, 'rot'> & { normal: [number, number] }
) {
  EXHIBITS.push({
    ...ex,
    x: ex.x + ex.normal[0] * 0.02,
    z: ex.z + ex.normal[1] * 0.02,
    rot: rotFromNormal(ex.normal),
  });
}

// =========================================================================
// BUILD THE 4-CAMPUS GRIZZLY VIDYALAYA ALUMNI MUSEUM
// =========================================================================

// Campus I: The Gateway (Origin)
addRoom('origin', 'black', 0, 14, -10, 0, [
  { side: 'S', from: 5.3, to: 8.7 },
  { side: 'E', from: -6.3, to: -2.7 },
]);

WAYPOINTS.push({ p: [7, 1.7, 7.2], l: [7, 1.7, -4.5] });

addPlaque(
  'chapter-1',
  '01',
  'Telaiya Dam Roots',
  [
    'Every Grizzlian remembers the first morning walking past those school gates—crisp uniforms, heavy satchels, and lifelong friendships waiting inside.',
    'Scroll through four campus wings of archives to relive the places and moments that shaped our batches.',
  ],
  11.3,
  0.65,
  DIR_S
);

// Step inside Campus I facing Feature Wall 01 (THE ORIGIN) BEFORE viewing Archive 01–05
WAYPOINTS.push({ p: [7, EYE_HEIGHT, 1.2], l: [7, 1.85, -10], hold: 1.0 });

// Archive 01: /gate.png
addExhibit({
  id: 'exhibit-gate',
  room: 'origin',
  kicker: 'Archive 01 · The Entrance',
  title: 'The Gateway to Memories',
  subtitle: 'Grizzly Vidyalaya Main Gate, Telaiya Dam',
  headline: 'Where every morning bell and lifelong bond began',
  about:
    'Stepping through these gates meant entering a world of curiosity, discipline, and camaraderie. Years later, across cities and time zones, that same archway still brings every batch back home.',
  facts: [
    ['Location', 'Telaiya Dam, Koderma'],
    ['Tradition', 'Generations of Grizzlians'],
    ['Archive', 'Campus Main Gate'],
  ],
  href: '/directory',
  cta: 'Find Batchmates in Directory',
  imageSrc: '/gate.png',
  x: 0.17,
  y: 2.22,
  z: -5,
  normal: DIR_E,
  w: 8.4,
  h: 2.86,
});

// Archive 02–03: Campus I South Flanking Walls (eye-level cleanly below brass gears & above 0.36m dado)
addExhibit({
  id: 'exhibit-library',
  room: 'origin',
  kicker: 'Archive 02 · Knowledge Wing',
  title: 'The School Library',
  subtitle: 'Quiet Study & Reference Alcoves',
  headline: 'Stacks of encyclopedias, journals, and exam-season focus',
  about:
    'Whispered group revisions, borrowed novels before summer break, and quiet afternoons spent preparing for Olympiads and board exams.',
  facts: [
    ['Collection', 'Reference & Literature Wing'],
    ['Tradition', 'Reading Hour & Study Groups'],
    ['Directory', 'Find Fellow Scholars'],
  ],
  href: '/directory',
  cta: 'Explore Alumni Directory',
  imageSrc: '/campus/campus-library.png',
  x: 2.7,
  y: 1.66,
  z: 0,
  normal: DIR_N,
  w: 2.25,
  h: 1.38,
});

addExhibit({
  id: 'exhibit-junior-wing',
  room: 'origin',
  kicker: 'Archive 03 · Foundation Wing',
  title: 'Junior Activity Circle',
  subtitle: 'Primary Years & Guided Curiosity',
  headline: 'Early friendships, storytelling circles, and playful discovery',
  about:
    'Before board exams and senior hostels, many Grizzlians spent their earliest school mornings learning through teamwork and curiosity inside the Junior Wing.',
  facts: [
    ['Wing', 'Primary & Foundation Block'],
    ['Mentors', 'Caring Junior Faculty'],
    ['Community', 'Reconnect With Childhood Friends'],
  ],
  href: '/directory',
  cta: 'Find Schoolmates',
  imageSrc: '/campus/campus-gallery-7.jpg',
  x: 11.3,
  y: 1.66,
  z: 0,
  normal: DIR_N,
  w: 2.25,
  h: 1.38,
});

// Archive 04–05: Campus I East Flanking Walls (beside Heritage Passage portal)
addExhibit({
  id: 'exhibit-auditorium-hall',
  room: 'origin',
  kicker: 'Archive 04 · Gathering Hall',
  title: 'The Main Auditorium',
  subtitle: 'Assemblies, Talks & Cultural Evenings',
  headline: 'Rows of anticipation whenever the entire school gathered indoors',
  about:
    'Guest lectures, orientations, debates, and cultural showcases filled the auditorium with applause and shared inspiration across batches.',
  facts: [
    ['Space', 'Campus Indoor Auditorium'],
    ['Events', 'Orientations & Talks'],
    ['Chat', 'Share Auditorium Memories'],
  ],
  href: '/chat',
  cta: 'Join Alumni Chat',
  imageSrc: '/campus/campus-auditorium.jpg',
  x: 14,
  y: 1.66,
  z: -1.35,
  normal: DIR_W,
  w: 2.05,
  h: 1.32,
});

addExhibit({
  id: 'exhibit-art-craft',
  room: 'origin',
  kicker: 'Archive 05 · Creative Heritage',
  title: 'Arts & House Craft Circle',
  subtitle: 'Festival Exhibits & Collaborative Projects',
  headline: 'House spirit expressed through handcrafted festival models and campus art',
  about:
    'Working side by side in house tracksuits before cultural exhibitions taught patience, collaboration, and lasting camaraderie.',
  facts: [
    ['Wing', 'Student Activity & Craft Circle'],
    ['Spirit', 'Inter-House Creative Displays'],
    ['Community', 'Reconnect With Housemates'],
  ],
  href: '/directory',
  cta: 'Browse Alumni Directory',
  imageSrc: '/campus/campus-art-craft.png',
  x: 14,
  y: 1.66,
  z: -8.15,
  normal: DIR_W,
  w: 2.25,
  h: 1.38,
});

addFeatureWall(
  'origin',
  'N',
  'gravity',
  '01',
  'THE ORIGIN',
  'From Telaiya Dam classrooms to alumni chapters across the globe',
  6.4
);

// Strictly chronological Campus I tour (01 -> 02 -> 03 -> 04 -> 05)
WAYPOINTS.push({ p: [7.8, 1.85, -5.0], l: [0.19, 1.95, -5.0], hold: 1.6 }); // Archive 01 Gate
WAYPOINTS.push({ p: [2.7, EYE_HEIGHT, -4.4], l: [2.7, 1.5, 0], hold: 0.9 }); // Archive 02 Library
WAYPOINTS.push({ p: [11.3, EYE_HEIGHT, -4.4], l: [11.3, 1.5, 0], hold: 0.9 }); // Archive 03 Junior Wing
WAYPOINTS.push({ p: [9.6, EYE_HEIGHT, -1.35], l: [14, 1.5, -1.35], hold: 0.9 }); // Archive 04 Auditorium
WAYPOINTS.push({ p: [9.6, EYE_HEIGHT, -8.15], l: [14, 1.5, -8.15], hold: 0.9 }); // Archive 05 Arts & Craft
WAYPOINTS.push({ p: [12.0, EYE_HEIGHT, -4.5], l: [18, 1.7, -4.5] });

LANTERNS.push({ x: 5.0, z: -0.15, rot: rotFromNormal(DIR_N) });
LANTERNS.push({ x: 9.0, z: -0.15, rot: rotFromNormal(DIR_N) });

GEARS.push(
  { x: 13.8, y: 3.55, z: -8.65, rot: rotFromNormal(DIR_W), d: 1.45, teeth: 24, dir: 1 },
  { x: 13.8, y: 3.15, z: -7.15, rot: rotFromNormal(DIR_W), d: 0.95, teeth: 13, dir: -1 },
  { x: 13.8, y: 3.65, z: -2.0, rot: rotFromNormal(DIR_W), d: 1.15, teeth: 17, dir: -1 },
  { x: 2.8, y: 3.45, z: -0.15, rot: rotFromNormal(DIR_N), d: 1.4, teeth: 22, dir: 1 },
  { x: 11.35, y: 3.45, z: -0.15, rot: rotFromNormal(DIR_N), d: 1.2, teeth: 15, dir: -1 }
);

// Corridor 1: Heritage Folds
addCorridor('fold-heritage', 'folds', [14, -4.5], 0, 6);

// Campus II: Campus Life (8.04m wide aisles prevent wall clipping and zoomed framing)
addRoom('campus', 'black', 20, 44, -14.2, 2.2, [
  { side: 'W', from: -6.3, to: -2.7 },
  { side: 'N', from: 22, to: 25.5 },
]);

// Center Spine Wall inside Campus II (14m span -> 4 cleanly spaced exhibits per side)
const SPINE_A: [number, number] = [25.0, -6];
const SPINE_B: [number, number] = [39.0, -6];
const SPINE_THICK = 0.32;
WALLS.push(
  {
    id: 'campus-spine-south',
    room: 'campus',
    a: [SPINE_A[0], SPINE_A[1] + SPINE_THICK / 2],
    b: [SPINE_B[0], SPINE_B[1] + SPINE_THICK / 2],
    n: DIR_S,
    t: SPINE_THICK / 2,
  },
  {
    id: 'campus-spine-north',
    room: 'campus',
    a: [SPINE_B[0], SPINE_B[1] - SPINE_THICK / 2],
    b: [SPINE_A[0], SPINE_A[1] - SPINE_THICK / 2],
    n: DIR_N,
    t: SPINE_THICK / 2,
  }
);

// Chapter 02 Plinth sits right at the Spine West End facing the Heritage Passage entrance
addPlaque(
  'chapter-2',
  '02',
  'Campus Life & Stories',
  [
    'Between the corridors, the bustling mess tables, and the afternoon bus rides home, our days at Grizzly Vidyalaya wrote stories we still retell at every reunion.',
    'Click any framed campus archive to zoom in and explore its memory.',
  ],
  24.85,
  -6.0,
  DIR_W
);

// W0 (South-West entry bay)
addExhibit({
  id: 'exhibit-dining-mess',
  room: 'campus',
  kicker: 'Archive 06 · Boarding Dining',
  title: 'Winter Dining Commons',
  subtitle: 'Spacious Mess Hall & Shared Meals',
  headline: 'Warm breakfast rows and house camaraderie every school morning',
  about:
    'Long gleaming stainless tables welcomed students together before classes and evening prep, turning mealtimes into cherished daily catch-ups.',
  facts: [
    ['Facility', 'Main Boarding Dining Hall'],
    ['Tradition', 'Shared Meals Across Houses'],
    ['Chat', 'Share Hostel Table Stories'],
  ],
  href: '/chat',
  cta: 'Join Alumni Chat',
  imageSrc: '/campus/campus-dining-mess.jpg',
  x: 20,
  y: 1.88,
  z: -0.35,
  normal: DIR_E,
  w: 2.45,
  h: 1.56,
});

// South Outer Wall of Campus II (Archive 07 -> 11, West -> East)
addExhibit({
  id: 'exhibit-boys-hostel',
  room: 'campus',
  kicker: 'Archive 07 · Residential Wing',
  title: 'Boys Hostel Life',
  subtitle: 'Evening Prep & Dorm Brotherhood',
  headline: 'Late-night revision and friendships built across bunk rooms',
  about:
    'Residential life taught independence, teamwork, and a sense of belonging—with evening study hours, house camaraderie, and weekend cricket matches.',
  facts: [
    ['Wing', 'Senior Boys Residential Wing'],
    ['Routine', 'Study Hours & House Activities'],
    ['Reconnect', 'Find Hostel Batchmates'],
  ],
  href: '/directory',
  cta: 'Find Dorm Mates',
  imageSrc: '/campus/campus-boys-hostel.jpg',
  x: 22.8,
  y: 1.88,
  z: 2.2,
  normal: DIR_N,
  w: 2.68,
  h: 1.64,
});

addExhibit({
  id: 'exhibit-girls-hostel',
  room: 'campus',
  kicker: 'Archive 08 · Boarding Home',
  title: 'Girls Hostel Wing',
  subtitle: 'Safe, Warm Residential Campus',
  headline: 'Shared study tables, festival evenings, and sisterhood',
  about:
    'A second home filled with festive celebrations, collaborative exam prep, and friendships that span continents long after graduation.',
  facts: [
    ['Wing', 'Girls Residential Block'],
    ['Community', 'Mentors & House Wardens'],
    ['Network', 'Connect Across Batches'],
  ],
  href: '/directory',
  cta: 'Explore Alumni Directory',
  imageSrc: '/campus/campus-girls-hostel.jpg',
  x: 27.3,
  y: 1.88,
  z: 2.2,
  normal: DIR_N,
  w: 2.68,
  h: 1.64,
});

addExhibit({
  id: 'exhibit-play-park',
  room: 'campus',
  kicker: 'Archive 09 · Recreation Wing',
  title: 'Covered Activity Play Park',
  subtitle: 'All-Weather Junior Recreation Grounds',
  headline: 'Laughter and energy across covered slides and play courts',
  about:
    'Shaded play structures kept younger Grizzlians active in every season, bridging classroom hours with sunlit outdoor camaraderie.',
  facts: [
    ['Zone', 'Junior Covered Play Area'],
    ['Focus', 'Active Balance & Teamwork'],
    ['Explore', 'Reconnect With Classmates'],
  ],
  href: '/directory',
  cta: 'Explore Alumni Directory',
  imageSrc: '/campus/campus-play-park.png',
  x: 31.8,
  y: 1.88,
  z: 2.2,
  normal: DIR_N,
  w: 2.68,
  h: 1.64,
});

addExhibit({
  id: 'exhibit-music',
  room: 'campus',
  kicker: 'Archive 10 · Cultural Arts',
  title: 'Music & Dance Studio',
  subtitle: 'Annual Day & Folk Rehearsals',
  headline: 'Tabla beats, choir practices, and rhythms on stage',
  about:
    'From inter-house singing competitions to Annual Function choreography, the music room echoed with creative energy every afternoon.',
  facts: [
    ['Disciplines', 'Classical · Instrumental · Dance'],
    ['Stage', 'Annual Day Cultural Fest'],
    ['Chat', 'Share Campus Rehearsals'],
  ],
  href: '/chat',
  cta: 'Share Memories in Chat',
  imageSrc: '/campus/campus-music-dance.png',
  x: 36.3,
  y: 1.88,
  z: 2.2,
  normal: DIR_N,
  w: 2.68,
  h: 1.64,
});

addExhibit({
  id: 'exhibit-study-hall',
  room: 'campus',
  kicker: 'Archive 11 · Academic Focus',
  title: 'Evening Study & Prep Hall',
  subtitle: 'Individual Desks & Guided Supervision',
  headline: 'Dedicated evening preparation rows building steady exam confidence',
  about:
    'Quiet individual study bays gave residential batches focused hours each evening with faculty mentors nearby whenever tough questions came up.',
  facts: [
    ['Wing', 'Senior Prep & Study Block'],
    ['Routine', 'Guided Evening Study Hours'],
    ['Network', 'Find Study Group Mates'],
  ],
  href: '/directory',
  cta: 'Browse Batch Directory',
  imageSrc: '/campus/campus-study-hall.png',
  x: 40.8,
  y: 1.88,
  z: 2.2,
  normal: DIR_N,
  w: 2.68,
  h: 1.64,
});

// East Wall of Campus II: Dedicated clean Feature Wall 02 (zero colliding exhibits or sconces!)
addFeatureWall(
  'campus',
  'E',
  'waves',
  '02',
  'THE GOLDEN YEARS',
  'Echoes of laughter, house spirit, and shared ambitions',
  5.8
);

// Spine South Side (Archive 12 -> 15, East -> West)
addExhibit({
  id: 'exhibit-kitchen',
  room: 'campus',
  kicker: 'Archive 12 · Culinary Facility',
  title: 'Mechanized Campus Kitchen',
  subtitle: 'Stainless Steel Hygiene & Daily Prep',
  headline: 'Modern automated culinary infrastructure serving thousands of meals',
  about:
    'Clean stainless steel cooklines and automated chapati makers kept hot, wholesome meals flowing seamlessly to every boarding dining hall.',
  facts: [
    ['Facility', 'Modern Mechanized Kitchen'],
    ['Standard', 'Stainless Hygiene & Freshness'],
    ['Explore', 'Visit Boarding Archives'],
  ],
  href: '/chat',
  cta: 'Share Hostel Memories',
  imageSrc: '/campus/campus-kitchen.png',
  x: 37.2,
  y: 1.88,
  z: -5.84,
  normal: DIR_S,
  w: 2.68,
  h: 1.64,
});

addExhibit({
  id: 'exhibit-bakery',
  room: 'campus',
  kicker: 'Archive 13 · Boarding Kitchen',
  title: 'In-Campus Bakery',
  subtitle: 'Freshly Baked Loaves & Evening Snacks',
  headline: 'Warm trays straight from campus ovens before evening prep',
  about:
    'Few boarders forget the unmistakable aroma from the campus bakery—fresh loaves, buns, and celebratory treats baked daily right on school grounds.',
  facts: [
    ['Facility', 'In-House Residential Bakery'],
    ['Favorite', 'Evening Tea & Fresh Bread'],
    ['Stories', 'Relive Boarding Days'],
  ],
  href: '/chat',
  cta: 'Share Hostel Stories',
  imageSrc: '/campus/campus-bakery.png',
  x: 33.7,
  y: 1.88,
  z: -5.84,
  normal: DIR_S,
  w: 2.68,
  h: 1.64,
});

addExhibit({
  id: 'exhibit-mess',
  room: 'campus',
  kicker: 'Archive 14 · Shared Tables',
  title: 'Cafeteria Days',
  subtitle: 'The School Mess & Dining Commons',
  headline: 'Where tiffins, laughter, and batch legends were shared',
  about:
    'Long wooden tables, steaming meals, and debates over cricket scores and upcoming exams. Some of the closest friendships in school were forged right over lunch.',
  facts: [
    ['Place', 'Grizzly Vidyalaya Mess'],
    ['Ritual', 'Midday Break & Stories'],
    ['Community', 'Join Batch Group Chats'],
  ],
  href: '/chat',
  cta: 'Open Alumni Chat',
  imageSrc: '/mess.png',
  x: 30.2,
  y: 1.88,
  z: -5.84,
  normal: DIR_S,
  w: 2.68,
  h: 1.64,
});

addExhibit({
  id: 'exhibit-campus',
  room: 'campus',
  kicker: 'Archive 15 · Campus Grounds',
  title: 'Our Beautiful Campus',
  subtitle: 'Academic Blocks & Open Courtyards',
  headline: 'Sunlight across the courtyard between every period',
  about:
    'From science labs to sunlit corridors, every corner of the campus echoed with exam prep, House rivalries, and conversations that stretched long after the final bell.',
  facts: [
    ['Wing', 'Main Academic Courtyard'],
    ['Spirit', 'House Competitions & Sports'],
    ['Connect', 'Browse Alumni by Batch'],
  ],
  href: '/directory',
  cta: 'Explore Alumni Directory',
  imageSrc: '/innerview.png',
  x: 26.7,
  y: 1.88,
  z: -5.84,
  normal: DIR_S,
  w: 2.68,
  h: 1.64,
});

// W1 (North-West bay)
addExhibit({
  id: 'exhibit-reference-hall',
  room: 'campus',
  kicker: 'Archive 16 · Senior Study',
  title: 'The Reference Reading Hall',
  subtitle: 'Collaborative Tables & Olympiad Prep',
  headline: 'Long reading tables where classmates solved tough problems together',
  about:
    'Journals, reference volumes, and peer study groups turned pre-board preparation into shared encouragement across batches.',
  facts: [
    ['Space', 'Senior Study & Periodicals Hall'],
    ['Spirit', 'Peer Learning & Discipline'],
    ['Connect', 'Join Alumni Network'],
  ],
  href: '/auth?mode=signup',
  cta: 'Join the Alumni Network',
  imageSrc: '/campus/campus-gallery-4.jpg',
  x: 20,
  y: 1.88,
  z: -10.3,
  normal: DIR_E,
  w: 2.55,
  h: 1.64,
});

// North Outer Wall of Campus II (Archive 17 -> 20, West -> East)
addExhibit({
  id: 'exhibit-oratory',
  room: 'campus',
  kicker: 'Archive 17 · Stage & Voice',
  title: 'Oratory & Presentation Hall',
  subtitle: 'Debates, Speeches & Student Seminars',
  headline: 'Finding our voice on stage in front of peers and faculty',
  about:
    'Elocution contests, extempore speeches, and inter-house debates gave Grizzlians the poise and confidence they carried into universities and boardrooms.',
  facts: [
    ['Skill', 'Public Speaking & Debate'],
    ['Format', 'Student Seminars & Talks'],
    ['Connect', 'Meet Alumni Leaders'],
  ],
  href: '/directory',
  cta: 'Browse Alumni Network',
  imageSrc: '/campus/campus-computer-lab.png',
  x: 27.9,
  y: 1.88,
  z: -14.2,
  normal: DIR_S,
  w: 2.68,
  h: 1.64,
});

addExhibit({
  id: 'exhibit-av-lab',
  room: 'campus',
  kicker: 'Archive 18 · Language & Media',
  title: 'Audio-Visual Language Lab',
  subtitle: 'Headsets, Phonetics & Comprehension',
  headline: 'Interactive listening booths sharpening fluency and communication',
  about:
    'Equipped with individual headsets and guided workbooks, the language studio helped batches master pronunciation, comprehension, and confident expression.',
  facts: [
    ['Lab', 'Audio-Visual Language Studio'],
    ['Focus', 'Phonetics & Communication'],
    ['Explore', 'Find Batchmates Worldwide'],
  ],
  href: '/directory',
  cta: 'Explore Alumni Directory',
  imageSrc: '/campus/campus-yoga.png',
  x: 31.8,
  y: 1.88,
  z: -14.2,
  normal: DIR_S,
  w: 2.68,
  h: 1.64,
});

addExhibit({
  id: 'exhibit-smart-class',
  room: 'campus',
  kicker: 'Archive 19 · Digital Classroom',
  title: 'Interactive Smart Classrooms',
  subtitle: 'Visual Boards, Globes & Classroom Dialogues',
  headline: 'Blending chalkboard clarity with interactive digital learning panels',
  about:
    'Interactive screens, world globes, and lively Q&A transformed geography, sciences, and literature into memorable classroom conversations.',
  facts: [
    ['Wing', 'Smart Classroom Block'],
    ['Tools', 'Digital Boards & World Globes'],
    ['Connect', 'Meet Your Classmates'],
  ],
  href: '/directory',
  cta: 'Find Your Batchmates',
  imageSrc: '/campus/campus-smart-class.png',
  x: 35.7,
  y: 1.88,
  z: -14.2,
  normal: DIR_S,
  w: 2.68,
  h: 1.64,
});

addExhibit({
  id: 'exhibit-hitech',
  room: 'campus',
  kicker: 'Archive 20 · Informatics Wing',
  title: 'Computer Science Lab',
  subtitle: 'Workstations, Coding & Digital Skills',
  headline: 'From early programming practicals to global tech careers',
  about:
    'Equipped computer workstations helped batches learn programming logic, build digital projects, and collaborate side by side.',
  facts: [
    ['Lab', 'Senior Informatics & Coding Wing'],
    ['Legacy', 'Alumni in Software & AI'],
    ['Directory', 'Meet Tech Alumni'],
  ],
  href: '/directory',
  cta: 'Connect With Tech Alumni',
  imageSrc: '/campus/campus-hitech-lab.png',
  x: 39.6,
  y: 1.88,
  z: -14.2,
  normal: DIR_S,
  w: 2.68,
  h: 1.64,
});

// Spine North Side (Archive 21 -> 24, East -> West heading smoothly to Arcade exit!)
addExhibit({
  id: 'exhibit-atl',
  room: 'campus',
  kicker: 'Archive 21 · Innovation Wing',
  title: 'ATL & Robotics Lab',
  subtitle: 'Atal Tinkering & Electronics Studio',
  headline: 'Hands-on circuits, robotics builds & curious young minds',
  about:
    'Inside the ATL Robotics Lab, students clustered around workbenches wiring sensors, programming microcontrollers, and turning physics into prototypes.',
  facts: [
    ['Space', 'Atal Tinkering Lab'],
    ['Focus', 'Robotics · Electronics · STEM'],
    ['Mentorship', 'Connect With STEM Alumni'],
  ],
  href: '/directory',
  cta: 'Connect With Alumni Mentors',
  imageSrc: '/campus/campus-atl.png',
  x: 37.2,
  y: 1.88,
  z: -6.16,
  normal: DIR_N,
  w: 2.68,
  h: 1.64,
});

addExhibit({
  id: 'exhibit-fine-arts',
  room: 'campus',
  kicker: 'Archive 22 · Fine Arts',
  title: 'Painting & Sketching Studio',
  subtitle: 'Canvases, Pigments & Creative Guidance',
  headline: 'Bringing Jharkhand landscapes and school festivals onto canvas',
  about:
    'Long afternoons with palettes, brushes, and art mentors nurtured expression that earned accolades across inter-school exhibitions.',
  facts: [
    ['Studio', 'Campus Fine Arts Room'],
    ['Focus', 'Painting · Sketching · Design'],
    ['Chat', 'Share Artwork Memories'],
  ],
  href: '/chat',
  cta: 'Join Alumni Chat',
  imageSrc: '/campus/campus-gallery-9.jpg',
  x: 33.7,
  y: 1.88,
  z: -6.16,
  normal: DIR_N,
  w: 2.68,
  h: 1.64,
});

addExhibit({
  id: 'exhibit-prayer',
  room: 'campus',
  kicker: 'Archive 23 · Morning Assembly',
  title: 'Morning Prayers',
  subtitle: 'The Courtyard Assembly Ground',
  headline: 'Standing shoulder to shoulder before the day began',
  about:
    'Crisp mornings, synchronized hymns, principal announcements, and shared stillness grounded every single school morning.',
  facts: [
    ['Moment', 'Morning Assembly Courtyard'],
    ['Values', 'Unity · Discipline · Gratitude'],
    ['Heritage', 'Carried Forward Worldwide'],
  ],
  href: '/auth?mode=signup',
  cta: 'Join the Alumni Community',
  imageSrc: '/prayer.png',
  x: 30.2,
  y: 1.88,
  z: -6.16,
  normal: DIR_N,
  w: 2.68,
  h: 1.64,
});

addExhibit({
  id: 'exhibit-bus',
  room: 'campus',
  kicker: 'Archive 24 · The Journey',
  title: 'Bus Rides Home',
  subtitle: 'Telaiya Dam & Koderma Routes',
  headline: 'Window seats, dusty roads, and songs after the last bell',
  about:
    'Racing for the back row, sharing notes before morning tests, and watching the dam waters shimmer on the ride home. Every route had its own crew that felt like family.',
  facts: [
    ['Routes', 'Koderma · Telaiya · Jhumri Telaiya'],
    ['Memory', 'Back-Row Songs & Window Seats'],
    ['Network', 'Connect Across Cities'],
  ],
  href: '/directory',
  cta: 'Reconnect With Route Mates',
  imageSrc: '/bus.png',
  x: 26.7,
  y: 1.88,
  z: -6.16,
  normal: DIR_N,
  w: 2.68,
  h: 1.64,
});

LANTERNS.push(
  { x: 20.2, z: 1.65, rot: rotFromNormal(DIR_E) },
  { x: 43.3, z: 2.05, rot: rotFromNormal(DIR_N) },
  { x: 43.0, z: -14.05, rot: rotFromNormal(DIR_S) }
);

// Strictly sequential Figure-8 Campus II Perimeter + Spine Tour (Chapter 02 -> Archive 06..11 -> Feature 02 -> Archive 12..24)
WAYPOINTS.push({ p: [20.6, 1.65, -5.2], l: [24.85, 1.75, -6.0], hold: 1.0 }); // Chapter 02 First!
WAYPOINTS.push({ p: [24.6, EYE_HEIGHT, -0.35], l: [20, 1.72, -0.35], hold: 0.9 }); // Archive 06 Dining
WAYPOINTS.push({ p: [22.8, EYE_HEIGHT, -2.4], l: [22.8, 1.72, 2.2], hold: 0.9 }); // Archive 07 Boys Hostel
WAYPOINTS.push({ p: [27.3, EYE_HEIGHT, -2.4], l: [27.3, 1.72, 2.2], hold: 0.9 }); // Archive 08 Girls Hostel
WAYPOINTS.push({ p: [31.8, EYE_HEIGHT, -2.4], l: [31.8, 1.72, 2.2], hold: 0.9 }); // Archive 09 Play Park
WAYPOINTS.push({ p: [36.3, EYE_HEIGHT, -2.4], l: [36.3, 1.72, 2.2], hold: 0.9 }); // Archive 10 Music & Dance
WAYPOINTS.push({ p: [40.8, EYE_HEIGHT, -2.4], l: [40.8, 1.72, 2.2], hold: 0.9 }); // Archive 11 Study Hall
WAYPOINTS.push({ p: [38.2, 1.7, -6.0], l: [44, 1.85, -6.0], hold: 1.1 }); // Feature Wall 02 (THE GOLDEN YEARS)
WAYPOINTS.push({ p: [37.2, EYE_HEIGHT, -1.2], l: [37.2, 1.72, -5.84], hold: 0.9 }); // Archive 12 Kitchen
WAYPOINTS.push({ p: [33.7, EYE_HEIGHT, -1.2], l: [33.7, 1.72, -5.84], hold: 0.9 }); // Archive 13 Bakery
WAYPOINTS.push({ p: [30.2, EYE_HEIGHT, -1.2], l: [30.2, 1.72, -5.84], hold: 0.9 }); // Archive 14 Mess
WAYPOINTS.push({ p: [26.7, EYE_HEIGHT, -1.2], l: [26.7, 1.72, -5.84], hold: 0.9 }); // Archive 15 Campus Grounds
WAYPOINTS.push({ p: [22.4, EYE_HEIGHT, -6.0], l: [20, 1.72, -9.8] }); // Round Spine West safely
WAYPOINTS.push({ p: [24.6, EYE_HEIGHT, -10.3], l: [20, 1.72, -10.3], hold: 0.9 }); // Archive 16 Reference Hall
WAYPOINTS.push({ p: [27.9, EYE_HEIGHT, -9.6], l: [27.9, 1.72, -14.2], hold: 0.9 }); // Archive 17 Oratory Hall
WAYPOINTS.push({ p: [31.8, EYE_HEIGHT, -9.6], l: [31.8, 1.72, -14.2], hold: 0.9 }); // Archive 18 AV Language Lab
WAYPOINTS.push({ p: [35.7, EYE_HEIGHT, -9.6], l: [35.7, 1.72, -14.2], hold: 0.9 }); // Archive 19 Smart Class
WAYPOINTS.push({ p: [39.6, EYE_HEIGHT, -9.6], l: [39.6, 1.72, -14.2], hold: 0.9 }); // Archive 20 Computer Lab
WAYPOINTS.push({ p: [41.2, EYE_HEIGHT, -10.2], l: [37.2, 1.72, -6.16] }); // Smooth turn onto Spine North
WAYPOINTS.push({ p: [37.2, EYE_HEIGHT, -10.7], l: [37.2, 1.72, -6.16], hold: 0.9 }); // Archive 21 ATL Robotics
WAYPOINTS.push({ p: [33.7, EYE_HEIGHT, -10.7], l: [33.7, 1.72, -6.16], hold: 0.9 }); // Archive 22 Fine Arts
WAYPOINTS.push({ p: [30.2, EYE_HEIGHT, -10.7], l: [30.2, 1.72, -6.16], hold: 0.9 }); // Archive 23 Morning Prayers
WAYPOINTS.push({ p: [26.7, EYE_HEIGHT, -10.7], l: [26.7, 1.72, -6.16], hold: 0.9 }); // Archive 24 Bus Rides Home
WAYPOINTS.push({ p: [23.75, EYE_HEIGHT, -11.5], l: [23.75, 1.7, -20] }); // Align Arcade North

// Corridor 2: Arched Colonnade
addCorridor('arcade', 'arcade', [23.75, -14.2], -Math.PI / 2, 12.0);

// Campus III: Belvedere Overlook (widened 16m x 10m gallery)
addRoom('belvedere', 'white', 16, 32, -36.2, -26.2, [
  { side: 'S', from: 21.5, to: 26.0 },
  { side: 'N', from: 20.2, to: 27.3 },
  { side: 'E', from: -33.0, to: -29.4 },
]);

export const BELVEDERE_WINDOW = {
  x0: 20.2,
  x1: 27.3,
  z: -36.2,
  y0: 0.35,
  y1: 3.45,
};

export const BENCH_POS = { x: 23.75, z: -32.4 };

// South Flanking Wall S0 (Archive 25)
addExhibit({
  id: 'exhibit-mathematics',
  room: 'belvedere',
  kicker: 'Archive 25 · Applied Math',
  title: 'Mathematics & Geometry Lab',
  subtitle: '3D Solid Models & Spatial Reasoning',
  headline: 'Hands-on cones, spheres, prisms, and theorem proofs brought to life',
  about:
    'Visualizing solids, mensuration, and calculus models in the Mathematics Lab gave Grizzlians a lasting intuition for engineering and architecture.',
  facts: [
    ['Lab', 'Mathematics Discovery Wing'],
    ['Alumni', 'Engineers, Analysts & Educators'],
    ['Network', 'Connect With Alumni'],
  ],
  href: '/directory',
  cta: 'Meet Science & Math Alumni',
  imageSrc: '/campus/campus-chemistry-lab.jpg',
  x: 18.8,
  y: 1.88,
  z: -26.2,
  normal: DIR_N,
  w: 2.68,
  h: 1.64,
});

// North Wall N0 (Archive 26)
addExhibit({
  id: 'exhibit-physics',
  room: 'belvedere',
  kicker: 'Archive 26 · Physics Wing',
  title: 'Physics Laboratory',
  subtitle: 'Pendulums, Rheostats & Experimental Rigor',
  headline: 'Measuring laws of motion hands-on at senior lab benches',
  about:
    'Simple pendulums, rheostats, and optical benches taught patience and scientific rigor—sparking generations of engineers and researchers.',
  facts: [
    ['Lab', 'Senior Secondary Physics'],
    ['Hands-On', 'Mechanics & Electrical Trials'],
    ['Directory', 'Find Science Batchmates'],
  ],
  href: '/directory',
  cta: 'Explore Alumni Directory',
  imageSrc: '/campus/campus-science-wing.png',
  x: 18.1,
  y: 1.88,
  z: -36.2,
  normal: DIR_S,
  w: 2.55,
  h: 1.6,
});

// North Wall N1 (Archive 27)
addExhibit({
  id: 'exhibit-chemistry',
  room: 'belvedere',
  kicker: 'Archive 27 · Chemistry Wing',
  title: 'Chemistry Laboratory',
  subtitle: 'Titrations, Burettes & Salt Analysis',
  headline: 'Mohr’s salt equations, conical flasks, and end-point colors',
  about:
    'Careful salt analysis and titration trials alongside lab partners turned abstract chemical equations into unforgettable afternoon practicals.',
  facts: [
    ['Lab', 'Senior Chemistry Practical Lab'],
    ['Focus', 'Analytical & Quantitative Trials'],
    ['Connect', 'Reconnect With Lab Partners'],
  ],
  href: '/directory',
  cta: 'Find Your Batchmates',
  imageSrc: '/campus/campus-physics-lab.jpg',
  x: 29.6,
  y: 1.88,
  z: -36.2,
  normal: DIR_S,
  w: 2.55,
  h: 1.6,
});

// East Flanking Walls E0 & E1 (Archive 28 & 29)
addExhibit({
  id: 'exhibit-taekwondo',
  room: 'belvedere',
  kicker: 'Archive 28 · Athletics',
  title: 'Martial Arts & Taekwondo',
  subtitle: 'Training Mats, Agility & Focus',
  headline: 'Balance, discipline, and spirited sparring on the campus mat',
  about:
    'Dedicated morning practice and trained martial arts coaches built stamina, focus, and sporting confidence across every house.',
  facts: [
    ['Sport', 'Taekwondo & Martial Arts'],
    ['Culture', 'Discipline & Sporting Spirit'],
    ['Chat', 'Celebrate Sports Milestones'],
  ],
  href: '/chat',
  cta: 'Open Sports Stories',
  imageSrc: '/campus/campus-gallery-8.jpg',
  x: 32,
  y: 1.88,
  z: -34.6,
  normal: DIR_W,
  w: 2.15,
  h: 1.42,
});

addExhibit({
  id: 'exhibit-global',
  room: 'belvedere',
  kicker: 'Archive 29 · Mindfulness & Balance',
  title: 'Yoga & Wellness Hall',
  subtitle: 'Morning Asanas, Posture & Inner Calm',
  headline: 'Rooted balance between academic ambition and holistic well-being',
  about:
    'Across mat-lined indoor halls, yoga sessions cultivated calm concentration, physical resilience, and mindful routines carried well beyond graduation.',
  facts: [
    ['Wing', 'Indoor Yoga & Wellness Hall'],
    ['Values', 'Mindfulness & Holistic Health'],
    ['Explore', 'Reconnect With Classmates'],
  ],
  href: '/directory',
  cta: 'Find Global Grizzlians',
  imageSrc: '/campus/campus-yoga-studio.png',
  x: 32,
  y: 1.88,
  z: -27.8,
  normal: DIR_W,
  w: 2.15,
  h: 1.42,
});

// South Flanking Wall S1 (Archive 30)
addExhibit({
  id: 'exhibit-ncc',
  room: 'belvedere',
  kicker: 'Archive 30 · Discipline & Service',
  title: 'NCC Cadets & Range Drills',
  subtitle: 'Unity, Leadership & Precision',
  headline: 'Early-morning training in formation across the school ground',
  about:
    'Drills, range discipline, and National Cadet Corps camps instilled resilience, civic duty, and camaraderie that alumni carry for life.',
  facts: [
    ['Unit', 'Grizzly Vidyalaya NCC Wing'],
    ['Motto', 'Unity and Discipline'],
    ['Community', 'Connect Across Batches'],
  ],
  href: '/auth?mode=signup',
  cta: 'Join the Alumni Network',
  imageSrc: '/campus/campus-ncc.png',
  x: 29.0,
  y: 1.88,
  z: -26.2,
  normal: DIR_N,
  w: 2.68,
  h: 1.64,
});

addFeatureWall(
  'belvedere',
  'W',
  'orbit',
  '03',
  'THE YEARS BETWEEN',
  'From Telaiya Dam classrooms to leadership roles around the world',
  5.8
);

// Belvedere tour: Enter -> Feature Wall 03 FIRST -> Archive 25 -> 26 -> Overlook -> 27 -> 28 -> 29 -> 30
WAYPOINTS.push({ p: [23.75, 1.68, -28.0], l: [23.75, 1.55, -36.2], hold: 0.7 });
WAYPOINTS.push({ p: [21.8, 1.65, -31.2], l: [16, 1.85, -31.2], hold: 1.1 }); // Feature Wall 03 First!
WAYPOINTS.push({ p: [18.8, 1.65, -30.5], l: [18.8, 1.72, -26.2], hold: 0.9 }); // Archive 25 Math Lab
WAYPOINTS.push({ p: [18.5, 1.65, -31.8], l: [18.1, 1.72, -36.2], hold: 0.9 }); // Archive 26 Physics Lab
WAYPOINTS.push({ p: [23.75, 1.68, -33.4], l: [23.75, 1.5, -37.2], hold: 0.9 }); // Overlook Vista
WAYPOINTS.push({ p: [29.2, 1.65, -31.8], l: [29.6, 1.72, -36.2], hold: 0.9 }); // Archive 27 Chemistry Lab
WAYPOINTS.push({ p: [27.7, 1.65, -34.4], l: [32, 1.72, -34.6], hold: 0.9 }); // Archive 28 Taekwondo
WAYPOINTS.push({ p: [27.7, 1.65, -28.0], l: [32, 1.72, -27.8], hold: 0.9 }); // Archive 29 Yoga Studio
WAYPOINTS.push({ p: [28.8, 1.65, -30.5], l: [29.0, 1.72, -26.2], hold: 0.9 }); // Archive 30 NCC Cadets
WAYPOINTS.push({ p: [28.6, EYE_HEIGHT, -31.2], l: [36, 1.7, -31.2] }); // Align Folds Tunnel

// Corridor 3: Folds Tunnel
addCorridor('folds', 'folds', [32, -31.2], 0, 9);

// Campus IV: The Alumni Network (15m x 15m Sanctuary)
addRoom('reunion', 'white', 41, 56, -38.7, -23.7, [
  { side: 'W', from: -33.0, to: -29.4 },
]);

// Campus IV West Flanking Walls (Archive 31 & 33)
addExhibit({
  id: 'exhibit-seminar',
  room: 'reunion',
  kicker: 'Archive 31 · Mentorship',
  title: 'Faculty & Alumni Seminars',
  subtitle: 'Guidance Across Generations',
  headline: 'Mentors, educators, and speakers inspiring future batches',
  about:
    'Workshops and faculty seminars connected classroom lessons with real-world careers—a tradition of mentorship now continued by Grizzlian alumni.',
  facts: [
    ['Tradition', 'Academic & Career Seminars'],
    ['Role', 'Alumni-Student Mentorship'],
    ['Directory', 'Connect With Mentors'],
  ],
  href: '/directory',
  cta: 'Browse Alumni Network',
  imageSrc: '/campus/campus-faculty-seminar.jpg',
  x: 41,
  y: 1.88,
  z: -35.8,
  normal: DIR_E,
  w: 2.75,
  h: 1.66,
});

addExhibit({
  id: 'exhibit-biology',
  room: 'reunion',
  kicker: 'Archive 32 · Life Sciences',
  title: 'Biology & Anatomy Lab',
  subtitle: 'Specimen Studies & Microscopy',
  headline: 'Charts, microscopes, and afternoon discoveries in botany & anatomy',
  about:
    'Hands-on biology practicals inspired countless Grizzlians who went on to serve in medicine, biotechnology, and public healthcare worldwide.',
  facts: [
    ['Lab', 'Senior Biology Wing'],
    ['Alumni', 'Doctors & Healthcare Leaders'],
    ['Network', 'Find Medical Alumni'],
  ],
  href: '/directory',
  cta: 'Meet Science Alumni',
  imageSrc: '/campus/campus-biology-lab.jpg',
  x: 56,
  y: 1.88,
  z: -35.9,
  normal: DIR_W,
  w: 2.75,
  h: 1.66,
});

addExhibit({
  id: 'exhibit-lifesciences',
  room: 'reunion',
  kicker: 'Archive 33 · Research Studio',
  title: 'Genetics & Microscopy Lab',
  subtitle: 'DNA Models & Experimental Observation',
  headline: 'From double-helix models on lab tables to global research institutes',
  about:
    'Exploring cellular structures side by side with classmates sparked a lifelong love for discovery across scientific and medical careers.',
  facts: [
    ['Focus', 'Microscopy & Genetics'],
    ['Future', 'Alumni in Global Research'],
    ['Join', 'Register Your Batch Profile'],
  ],
  href: '/auth?mode=signup',
  cta: 'Join Alumni Network',
  imageSrc: '/campus/campus-slide-4.jpg',
  x: 41,
  y: 1.88,
  z: -26.6,
  normal: DIR_E,
  w: 2.75,
  h: 1.66,
});

addExhibit({
  id: 'exhibit-infirmary',
  room: 'reunion',
  kicker: 'Archive 34 · Campus Care',
  title: 'Campus Wellness & Care',
  subtitle: '24/7 Infirmary & Pastoral Support',
  headline: 'Gentle care whenever residential students needed reassurance',
  about:
    'Dedicated nursing staff and attentive teachers ensured every boarding and day scholar felt looked after far from home.',
  facts: [
    ['Facility', 'In-Campus Medical Wing'],
    ['Support', 'Round-the-Clock Care'],
    ['Community', 'Reconnect With Your Batch'],
  ],
  href: '/chat',
  cta: 'Say Hello in Chat',
  imageSrc: '/campus/campus-gallery-6.jpg',
  x: 56,
  y: 1.88,
  z: -26.5,
  normal: DIR_W,
  w: 2.75,
  h: 1.66,
});

addFeatureWall(
  'reunion',
  'N',
  'neural',
  '04',
  'THE NETWORK',
  'Verified alumni directory, batch-wise group chats & mentorship',
  5.2,
  '#63d8ff'
);

addFeatureWall(
  'reunion',
  'S',
  'fractal',
  '05',
  'REUNIONS',
  'Homecomings, mentorship circles & the next chapter of GVConnect',
  5.2,
  '#ffd082'
);

addPlaque(
  'chapter-join',
  '',
  'Welcome Home',
  [
    'Reconnect with your batchmates, share your journey, and mentor the next generation of Grizzlians.',
    'Click this invitation panel or continue below to join GVConnect.',
  ],
  50.6,
  -31.2,
  DIR_W,
  true,
  '#/auth?mode=signup'
);

export const HOLO_POS = { x: 50.0, zs: [-34.6, -27.8], centerZ: -31.2, backX: 55.92 };

// Campus IV chronological tour: Feature Wall 04 -> Archive 31..34 -> Feature Wall 05 -> Reunion Triptych
WAYPOINTS.push({ p: [42.6, EYE_HEIGHT, -31.2], l: [47.5, 1.75, -31.2] });
WAYPOINTS.push({ p: [47.5, 1.65, -33.2], l: [47.5, 1.85, -38.7], hold: 1.0 }); // Feature Wall 04 First!
WAYPOINTS.push({ p: [45.6, 1.65, -35.8], l: [41, 1.78, -35.8], hold: 0.9 }); // Archive 31 Faculty Seminars
WAYPOINTS.push({ p: [51.4, 1.65, -35.9], l: [56, 1.78, -35.9], hold: 0.9 }); // Archive 32 Biology Lab
WAYPOINTS.push({ p: [45.6, 1.65, -26.6], l: [41, 1.78, -26.6], hold: 0.9 }); // Archive 33 Genetics Lab
WAYPOINTS.push({ p: [47.5, 1.65, -29.2], l: [47.5, 1.85, -23.7], hold: 1.0 }); // Feature Wall 05
WAYPOINTS.push({ p: [51.4, 1.65, -26.5], l: [56, 1.78, -26.5], hold: 0.9 }); // Archive 34 Wellness & Care
WAYPOINTS.push({ p: [42.8, 1.7, -31.2], l: [50.6, 1.78, -31.2], hold: 2.2 }); // Final Reunion Triptych


// World bounds for exterior floor
export const WORLD_BOUNDS = {
  x0: Math.min(...ROOMS.map((r) => r.x0)) - 6,
  x1: Math.max(...ROOMS.map((r) => r.x1)) + 6,
  z0: Math.min(...ROOMS.map((r) => r.z0)) - 8,
  z1: Math.max(...ROOMS.map((r) => r.z1)) + 10,
};

export function findRoomAt(x: number, z: number): RoomDef {
  const inside = (r: RoomDef, pad: number) =>
    x >= r.x0 - pad && x <= r.x1 + pad && z >= r.z0 - pad && z <= r.z1 + pad;
  return (
    ROOMS.find((r) => r.kind !== 'hall' && r.kind !== 'belvedere' && inside(r, 1.2)) ??
    ROOMS.find((r) => inside(r, 0)) ??
    ROOMS.find((r) => inside(r, 3)) ??
    ROOMS[0]
  );
}

// Compute arc-length & turn-weighted progress table along WAYPOINTS
const lookYaw = (w: CameraWaypoint) =>
  Math.atan2(w.l[0] - w.p[0], w.l[2] - w.p[2]);

const RAW_DISTANCES = WAYPOINTS.reduce<number[]>((acc, wp, i) => {
  if (i === 0) return [0];
  const prev = WAYPOINTS[i - 1];
  const dist = Math.hypot(wp.p[0] - prev.p[0], wp.p[2] - prev.p[2]);
  let dYaw = lookYaw(wp) - lookYaw(prev);
  dYaw = Math.atan2(Math.sin(dYaw), Math.cos(dYaw));
  return [...acc, acc[i - 1] + dist + 2.2 * Math.abs(dYaw) + (wp.hold ?? 0)];
}, []);

export const TOTAL_PATH_WEIGHT = RAW_DISTANCES[RAW_DISTANCES.length - 1] || 1;
export const WAYPOINT_PROGRESS = RAW_DISTANCES.map((d) => d / TOTAL_PATH_WEIGHT);

export function progressForWaypoint(index: number): number {
  return WAYPOINT_PROGRESS[Math.max(0, Math.min(WAYPOINT_PROGRESS.length - 1, index))];
}

export function mapScrollToSplineT(scrollProgress: number): number {
  const clamped = Math.min(1, Math.max(0, scrollProgress));
  const nextIdx = WAYPOINT_PROGRESS.findIndex((p) => p >= clamped);
  if (nextIdx <= 0) return 0;
  const prevIdx = nextIdx - 1;
  const span = Math.max(1e-6, WAYPOINT_PROGRESS[nextIdx] - WAYPOINT_PROGRESS[prevIdx]);
  const local = (clamped - WAYPOINT_PROGRESS[prevIdx]) / span;
  return Math.min(1, (prevIdx + Math.min(1, Math.max(0, local))) / (WAYPOINTS.length - 1));
}

export function nearestWaypointForPoint(x: number, z: number): number {
  let best = 0;
  let bestDist = Infinity;
  WAYPOINTS.forEach((wp, idx) => {
    const d = Math.hypot(wp.l[0] - x, wp.l[2] - z);
    if (d < bestDist) {
      bestDist = d;
      best = idx;
    }
  });
  return best;
}

export function progressForExhibit(exhibitId: string): number {
  const ex = EXHIBITS.find((e) => e.id === exhibitId);
  if (!ex) return 0;
  return progressForWaypoint(nearestWaypointForPoint(ex.x, ex.z));
}

const firstWaypointForRoom = (roomId: RoomId) =>
  Math.max(
    0,
    WAYPOINTS.findIndex((w) => findRoomAt(w.p[0], w.p[2]).id === roomId)
  );

export const ORIGIN_PROGRESS_THRESHOLD = progressForWaypoint(
  Math.min(WAYPOINTS.length - 1, firstWaypointForRoom('origin') + 2)
);
export const CAMPUS_PROGRESS_THRESHOLD = progressForWaypoint(
  firstWaypointForRoom('campus')
);
export const BELVEDERE_PROGRESS_THRESHOLD = progressForWaypoint(
  firstWaypointForRoom('belvedere')
);
export const REUNION_PROGRESS_THRESHOLD = progressForWaypoint(
  firstWaypointForRoom('reunion')
);

export const CHAPTER_JUMPS: { label: string; progress: number; room: RoomId }[] = [
  { label: '01 Gateway', progress: ORIGIN_PROGRESS_THRESHOLD, room: 'origin' },
  { label: '02 Campus', progress: CAMPUS_PROGRESS_THRESHOLD, room: 'campus' },
  { label: '03 Belvedere', progress: BELVEDERE_PROGRESS_THRESHOLD, room: 'belvedere' },
  { label: '04 Network', progress: REUNION_PROGRESS_THRESHOLD, room: 'reunion' },
];

// =========================================================================
// REACTIVE EXHIBITION STORE (zero-re-render 60fps loop refs + UI state)
// =========================================================================

export interface ExhibitionUIState {
  phase: 'loading' | 'gallery';
  loaded: number;
  room: RoomId;
  focus: string | null;
  detail: boolean;
  hover: string | null;
  bench: boolean;
  webglSupported: boolean;
}

function detectInitialWebGLSupport(): boolean {
  if (typeof window === 'undefined') return true;
  return inspectWebGLCapabilities().supported;
}

const initialWebGLSupported = detectInitialWebGLSupport();

let state: ExhibitionUIState = {
  phase: initialWebGLSupported ? 'loading' : 'gallery',
  loaded: initialWebGLSupported ? 0 : 1,
  room: 'origin',
  focus: null,
  detail: false,
  hover: null,
  bench: false,
  webglSupported: initialWebGLSupported,
};

const listeners = new Set<() => void>();

export function getExhibitionState(): ExhibitionUIState {
  return state;
}

export function setExhibitionState(patch: Partial<ExhibitionUIState>) {
  const next = { ...state, ...patch };
  const changed = (Object.keys(patch) as (keyof ExhibitionUIState)[]).some(
    (k) => next[k] !== state[k]
  );
  if (!changed) return;
  state = next;
  listeners.forEach((fn) => fn());
}

export function useExhibitionStore<T>(selector: (s: ExhibitionUIState) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => selector(state),
    () => selector(state)
  );
}

export const scrollTrackRef: { el: HTMLDivElement | null } = { el: null };

export const motionRefs = {
  target: 0,
  progress: 0,
  pointer: { x: 0, y: 0 },
  scrolledPastGallery: false,
};

export function getMaxScrollDistance(): number {
  const h = scrollTrackRef.el
    ? scrollTrackRef.el.offsetHeight
    : document.documentElement.scrollHeight;
  return Math.max(1, h - window.innerHeight);
}

export function scrollToProgress(progress: number, smooth = true) {
  const maxScroll = getMaxScrollDistance();
  const clamped = Math.min(1, Math.max(0, progress));
  window.scrollTo({
    top: clamped * maxScroll,
    behavior: smooth ? 'smooth' : 'auto',
  });
  motionRefs.target = clamped;
  if (!smooth) {
    motionRefs.progress = clamped;
  }
}

export function scrollPastHeroCurtain(smooth = true) {
  const maxScroll = getMaxScrollDistance();
  const targetProgress = computeWalkCampusProgress(maxScroll, progressForWaypoint(1));
  scrollToProgress(targetProgress, smooth);
}

export function resetExhibitionStore() {
  const supported = detectInitialWebGLSupport();
  motionRefs.target = 0;
  motionRefs.progress = 0;
  motionRefs.scrolledPastGallery = false;
  setExhibitionState({
    phase: supported ? 'loading' : 'gallery',
    loaded: supported ? 0 : 1,
    room: 'origin',
    focus: null,
    detail: false,
    hover: null,
    bench: false,
    webglSupported: supported,
  });
}
