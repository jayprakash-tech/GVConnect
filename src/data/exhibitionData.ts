import { useSyncExternalStore } from 'react';

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
    name: 'Hall I · The Gateway',
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
    name: 'Hall II · Campus Life',
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
    name: 'Hall III · The Belvedere',
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
    name: 'Hall IV · The Alumni Network',
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
// BUILD THE 4-HALL GRIZZLY VIDYALYA ALUMNI MUSEUM
// =========================================================================

// Hall I: The Gateway (Origin)
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
    'Scroll through four halls of campus archives to relive the places and moments that shaped our batches.',
  ],
  11.3,
  0.65,
  DIR_S
);

WAYPOINTS.push({ p: [7, EYE_HEIGHT, 1.2], l: [3.2, 1.85, -5] });

// Hero Exhibit 1: /gate.png
addExhibit({
  id: 'exhibit-gate',
  room: 'origin',
  kicker: 'Archive 01 · The Entrance',
  title: 'The Gateway to Memories',
  subtitle: 'Grizzly Vidyalya Main Gate, Telaiya Dam',
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
  y: 2.08,
  z: -5,
  normal: DIR_E,
  w: 8.4,
  h: 3.2,
});

WAYPOINTS.push({ p: [5.75, 2.0, -5], l: [0.15, 2.0, -5] });
WAYPOINTS.push({ p: [6.0, 2.0, -5], l: [0.15, 2.0, -5], hold: 3.8 });

addFeatureWall(
  'origin',
  'N',
  'gravity',
  '01',
  'THE ORIGIN',
  'From Telaiya Dam classrooms to alumni chapters across the globe',
  6.4
);

WAYPOINTS.push({ p: [11.6, EYE_HEIGHT, -4.5], l: [18, 1.7, -4.5] });

LANTERNS.push({ x: 13.8, z: -1.2, rot: rotFromNormal(DIR_W) });
LANTERNS.push({ x: 0.2, z: -0.9, rot: rotFromNormal(DIR_E) });

GEARS.push(
  { x: 13.8, y: 3.0, z: -8.4, rot: rotFromNormal(DIR_W), d: 1.9, teeth: 24, dir: 1 },
  { x: 13.8, y: 2.3, z: -7.2, rot: rotFromNormal(DIR_W), d: 1.05, teeth: 13, dir: -1 },
  { x: 13.8, y: 3.1, z: -1.4, rot: rotFromNormal(DIR_W), d: 1.5, teeth: 19, dir: -1 },
  { x: 3.0, y: 3.2, z: -0.15, rot: rotFromNormal(DIR_N), d: 1.7, teeth: 22, dir: 1 },
  { x: 11.4, y: 3.25, z: -0.15, rot: rotFromNormal(DIR_N), d: 1.2, teeth: 15, dir: -1 }
);

// Corridor 1: Heritage Folds
addCorridor('fold-heritage', 'folds', [14, -4.5], 0, 6);

// Hall II: Campus Life
addRoom('campus', 'black', 20, 41, -13, 1, [
  { side: 'W', from: -6.3, to: -2.7 },
  { side: 'N', from: 22, to: 25.5 },
]);

addPlaque(
  'chapter-2',
  '02',
  'Campus Life & Stories',
  [
    'Between the corridors, the bustling mess tables, and the afternoon bus rides home, our days at Grizzly Vidyalya wrote stories we still retell at every reunion.',
    'Click any framed campus archive to zoom in and explore its memory.',
  ],
  22.4,
  -0.3,
  DIR_N
);

// Center Spine Wall inside Hall II
const SPINE_A: [number, number] = [24.5, -6];
const SPINE_B: [number, number] = [35.5, -6];
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

// Exhibit 2: /innerview.png
addExhibit({
  id: 'exhibit-campus',
  room: 'campus',
  kicker: 'Archive 02 · Campus Grounds',
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
  x: 27.0,
  y: 1.68,
  z: -5.84,
  normal: DIR_S,
  w: 2.55,
  h: 1.72,
});

WAYPOINTS.push({ p: [27.0, EYE_HEIGHT, -2.0], l: [27.0, 1.65, -5.84], hold: 1.6 });

// Exhibit 3: /mess.png
addExhibit({
  id: 'exhibit-mess',
  room: 'campus',
  kicker: 'Archive 03 · Shared Tables',
  title: 'Cafeteria Days',
  subtitle: 'The School Mess & Dining Hall',
  headline: 'Where tiffins, laughter, and batch legends were shared',
  about:
    'Long wooden tables, steaming meals, and debates over cricket scores and upcoming exams. Some of the closest friendships in school were forged right over lunch.',
  facts: [
    ['Place', 'Grizzly Vidyalya Mess'],
    ['Ritual', 'Midday Break & Stories'],
    ['Community', 'Join Batch Group Chats'],
  ],
  href: '/chat',
  cta: 'Open Alumni Chat',
  imageSrc: '/mess.png',
  x: 32.8,
  y: 1.68,
  z: -5.84,
  normal: DIR_S,
  w: 2.55,
  h: 1.72,
});

WAYPOINTS.push({ p: [32.8, EYE_HEIGHT, -2.0], l: [32.8, 1.65, -5.84], hold: 1.6 });

addFeatureWall(
  'campus',
  'E',
  'waves',
  '02',
  'THE GOLDEN YEARS',
  'Echoes of laughter, house spirit, and shared ambitions',
  4.4
);

WAYPOINTS.push({ p: [36.8, EYE_HEIGHT, -6.0], l: [40.8, 1.8, -6.0], hold: 1.6 });

// Exhibit 4: /bus.png
addExhibit({
  id: 'exhibit-bus',
  room: 'campus',
  kicker: 'Archive 04 · The Journey',
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
  x: 32.8,
  y: 1.68,
  z: -6.16,
  normal: DIR_N,
  w: 2.55,
  h: 1.72,
});

WAYPOINTS.push({ p: [32.8, EYE_HEIGHT, -10.0], l: [32.8, 1.65, -6.16], hold: 1.6 });

// Exhibit 5: /prayer.png
addExhibit({
  id: 'exhibit-prayer',
  room: 'campus',
  kicker: 'Archive 05 · Morning Assembly',
  title: 'Morning Prayers',
  subtitle: 'The Courtyard Assembly Ground',
  headline: 'Standing shoulder to shoulder before the day began',
  about:
    'Crisp mornings, synchronized hymns, principal announcements, and birthday applause in front of the entire school. That shared stillness grounded every single day.',
  facts: [
    ['Moment', 'Morning Assembly Courtyard'],
    ['Values', 'Unity · Discipline · Gratitude'],
    ['Heritage', 'Carried Forward Worldwide'],
  ],
  href: '/auth?mode=signup',
  cta: 'Join the Alumni Community',
  imageSrc: '/prayer.png',
  x: 27.0,
  y: 1.68,
  z: -6.16,
  normal: DIR_N,
  w: 2.55,
  h: 1.72,
});

WAYPOINTS.push({ p: [27.0, EYE_HEIGHT, -10.0], l: [27.0, 1.65, -6.16], hold: 1.6 });

// Exhibit 6 (from grizzlyvidyalaya.com): /campus/campus-atl.png
addExhibit({
  id: 'exhibit-atl',
  room: 'campus',
  kicker: 'Archive 06 · Innovation Wing',
  title: 'ATL & Robotics Lab',
  subtitle: 'Atal Tinkering & Electronics Studio',
  headline: 'Hands-on circuits, robotics builds & curious young minds',
  about:
    'Inside the ATL Robotics Lab, students clustered around workbenches wiring sensors, programming microcontrollers, and turning textbook physics into working prototypes.',
  facts: [
    ['Space', 'Atal Tinkering Lab'],
    ['Focus', 'Robotics · Electronics · STEM'],
    ['Mentorship', 'Connect With STEM Alumni'],
  ],
  href: '/directory',
  cta: 'Connect With Alumni Mentors',
  imageSrc: '/campus/campus-atl.png',
  x: 37.5,
  y: 1.72,
  z: -12.98,
  normal: DIR_S,
  w: 2.45,
  h: 1.65,
});

LANTERNS.push(
  { x: 20.2, z: -1.4, rot: rotFromNormal(DIR_E) },
  { x: 40.8, z: -1.4, rot: rotFromNormal(DIR_W) },
  { x: 40.8, z: -10.6, rot: rotFromNormal(DIR_W) }
);

WAYPOINTS.push({ p: [23.75, EYE_HEIGHT, -10.9], l: [23.75, 1.7, -20] });

// Corridor 2: Arched Colonnade
addCorridor('arcade', 'arcade', [23.75, -13], -Math.PI / 2, 13);

// Hall III: Belvedere Overlook
addRoom('belvedere', 'white', 17, 31, -35, -26, [
  { side: 'S', from: 21.5, to: 26 },
  { side: 'N', from: 20.5, to: 27 },
  { side: 'E', from: -32.3, to: -28.7 },
]);

export const BELVEDERE_WINDOW = {
  x0: 20.5,
  x1: 27,
  z: -35,
  y0: 0.35,
  y1: 3.45,
};

export const BENCH_POS = { x: 23.75, z: -31.6 };

// Exhibit 7 (from grizzlyvidyalaya.com): /campus/campus-slide-4.jpg
addExhibit({
  id: 'exhibit-science',
  room: 'belvedere',
  kicker: 'Archive 07 · Discovery Wing',
  title: 'Science Laboratories',
  subtitle: 'Biology & Practical Experiments',
  headline: 'First glimpses through a microscope and lifelong curiosity',
  about:
    'Afternoon lab practicals in crisp blazers—measuring slides, sketching specimens, and discovering how theory came alive at Grizzly Vidyalaya.',
  facts: [
    ['Wing', 'Senior Science Laboratories'],
    ['Legacy', 'Doctors, Engineers & Researchers'],
    ['Directory', 'Find Science Batchmates'],
  ],
  href: '/directory',
  cta: 'Explore Alumni Directory',
  imageSrc: '/campus/campus-slide-4.jpg',
  x: 18.75,
  y: 1.72,
  z: -34.98,
  normal: DIR_S,
  w: 2.3,
  h: 1.6,
});

// Exhibit 8 (from grizzlyvidyalaya.com): /campus/campus-building.jpg
addExhibit({
  id: 'exhibit-honors',
  room: 'belvedere',
  kicker: 'Archive 08 · School Honors',
  title: 'Annual Stage & Pride',
  subtitle: 'Grizzly Vidyalaya Recognition Ceremony',
  headline: 'Standing proud beneath the Grizzly Vidyalaya crest',
  about:
    'Honors assemblies, toppers, house captains, and teachers cheering side by side on stage—moments of pride etched into every alumnus memory.',
  facts: [
    ['Occasion', 'Academic & House Honors'],
    ['Motto', 'Success Through Hard Work'],
    ['Community', 'Celebrate Alumni Milestones'],
  ],
  href: '/auth?mode=signup',
  cta: 'Join the Alumni Network',
  imageSrc: '/campus/campus-building.jpg',
  x: 29.0,
  y: 1.72,
  z: -34.98,
  normal: DIR_S,
  w: 2.45,
  h: 1.65,
});

WAYPOINTS.push({ p: [23.75, 1.68, -26.4], l: [23.75, 1.35, -36], hold: 2.0 });

addFeatureWall(
  'belvedere',
  'W',
  'orbit',
  '03',
  'THE YEARS BETWEEN',
  'From Telaiya Dam classrooms to leadership roles around the world',
  5.5
);

WAYPOINTS.push({ p: [27.6, EYE_HEIGHT, -30.5], l: [34, 1.7, -30.5] });

// Corridor 3: Folds Tunnel
addCorridor('folds', 'folds', [31, -30.5], 0, 9);

// Hall IV: The Alumni Network
addRoom('reunion', 'white', 40, 53, -37, -24, [
  { side: 'W', from: -32.3, to: -28.7 },
]);

addFeatureWall(
  'reunion',
  'N',
  'neural',
  '04',
  'THE NETWORK',
  'Verified alumni directory, batch-wise group chats & mentorship',
  4.6,
  '#63d8ff'
);

WAYPOINTS.push({ p: [43.4, EYE_HEIGHT, -30.5], l: [46.5, 1.75, -36.9], hold: 1.8 });

addFeatureWall(
  'reunion',
  'S',
  'fractal',
  '05',
  'REUNIONS',
  'Homecomings, mentorship circles & the next chapter of GVConnect',
  4.6,
  '#ffd082'
);

WAYPOINTS.push({ p: [43.4, EYE_HEIGHT, -30.5], l: [46.5, 1.75, -24.1], hold: 1.8 });

addPlaque(
  'chapter-join',
  '',
  'Welcome Home',
  [
    'Reconnect with your batchmates, share your journey, and mentor the next generation of Grizzlians.',
    'Click this invitation panel or continue below to join GVConnect.',
  ],
  48.6,
  -30.5,
  DIR_W,
  true,
  '#/auth?mode=signup'
);

export const HOLO_POS = { x: 47.9, zs: [-33.4, -27.6] };

WAYPOINTS.push({ p: [43.0, 1.7, -30.5], l: [48.6, 1.75, -30.5], hold: 3.5 });

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

export const REUNION_PROGRESS_THRESHOLD = progressForWaypoint(
  Math.max(
    0,
    WAYPOINTS.findIndex((w) => findRoomAt(w.p[0], w.p[2]).id === 'reunion')
  )
);

export const CHAPTER_JUMPS: { label: string; progress: number; room: RoomId }[] = [
  { label: '01 Gateway', progress: progressForWaypoint(2), room: 'origin' },
  { label: '02 Campus', progress: progressForWaypoint(6), room: 'campus' },
  { label: '03 Belvedere', progress: progressForWaypoint(11), room: 'belvedere' },
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

let state: ExhibitionUIState = {
  phase: 'loading',
  loaded: 0,
  room: 'origin',
  focus: null,
  detail: false,
  hover: null,
  bench: false,
  webglSupported: true,
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

export function resetExhibitionStore() {
  state = {
    phase: 'loading',
    loaded: 0,
    room: 'origin',
    focus: null,
    detail: false,
    hover: null,
    bench: false,
    webglSupported: true,
  };
  motionRefs.target = 0;
  motionRefs.progress = 0;
  motionRefs.scrolledPastGallery = false;
}
