export const CURTAIN_REVEAL_SCROLL_PX = 760;
export const SCROLL_PX_PER_PATH_UNIT = 148;

export interface DeviceCapabilitySignals {
  isSoftwareWebGL: boolean;
  isCoarsePointer: boolean;
  deviceMemory?: number;
  hardwareConcurrency?: number;
}

export interface ExhibitionPerfProfile {
  isLowSpec: boolean;
  pixelRatioCap: number;
  antialias: boolean;
  standardPhotoSize: [number, number];
  heroPhotoSize: [number, number];
  chapterCanvasSize: [number, number];
  moteCount: number;
  ribbonSamples: number;
  foldStep: number;
  maxMotionDt: number;
  maxAnimDt: number;
  batchConcurrency: number;
}

/**
 * Computes normalized HeroCurtain reveal progress [0..1] purely from window.scrollY
 * in CSS pixels, independent of WebGL frame rate or total track length.
 */
export function computeCurtainRevealFraction(
  scrollY: number,
  revealPx: number = CURTAIN_REVEAL_SCROLL_PX
): number {
  if (!Number.isFinite(scrollY) || revealPx <= 0) return 0;
  return Math.min(1, Math.max(0, scrollY / revealPx));
}

export function smoothstep01(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

/**
 * Total pixel height of the virtual gallery scroll track (excluding 100svh viewport).
 */
export function computeTrackHeightPx(
  totalPathWeight: number,
  pxPerUnit: number = SCROLL_PX_PER_PATH_UNIT
): number {
  if (!Number.isFinite(totalPathWeight) || totalPathWeight <= 0) return 1000;
  return Math.round(pxPerUnit * totalPathWeight);
}

/**
 * Computes the normalized scroll target [0..1] when clicking "Walk The Campus"
 * so the page reliably clears the hero curtain AND frames Campus I Gateway cleanly.
 */
export function computeWalkCampusProgress(
  maxScrollPx: number,
  gatewayWaypointProgress: number,
  revealPx: number = CURTAIN_REVEAL_SCROLL_PX
): number {
  if (!Number.isFinite(maxScrollPx) || maxScrollPx <= 0) return gatewayWaypointProgress;
  const curtainClearProgress = Math.min(0.95, (revealPx + 140) / maxScrollPx);
  return Math.min(1, Math.max(curtainClearProgress, gatewayWaypointProgress));
}

/**
 * Selects low-RAM / low-CPU friendly WebGL parameters while keeping 100% identical scene objects.
 */
export function resolveExhibitionPerfProfile(
  signals: DeviceCapabilitySignals
): ExhibitionPerfProfile {
  const lowRam =
    typeof signals.deviceMemory === 'number' &&
    signals.deviceMemory > 0 &&
    signals.deviceMemory <= 4;
  const lowCpu =
    typeof signals.hardwareConcurrency === 'number' &&
    signals.hardwareConcurrency > 0 &&
    signals.hardwareConcurrency <= 4;

  const isLowSpec = Boolean(
    signals.isSoftwareWebGL || signals.isCoarsePointer || lowRam || lowCpu
  );

  if (isLowSpec) {
    return {
      isLowSpec: true,
      pixelRatioCap: 1,
      antialias: false,
      standardPhotoSize: [480, 330],
      heroPhotoSize: [768, 300],
      chapterCanvasSize: [1024, 716],
      moteCount: 240,
      ribbonSamples: 240,
      foldStep: 1.15,
      maxMotionDt: 0.16,
      maxAnimDt: 0.05,
      batchConcurrency: 2,
    };
  }

  return {
    isLowSpec: false,
    pixelRatioCap: 1.5,
    antialias: true,
    standardPhotoSize: [640, 440],
    heroPhotoSize: [960, 375],
    chapterCanvasSize: [1280, 896],
    moteCount: 680,
    ribbonSamples: 420,
    foldStep: 0.65,
    maxMotionDt: 0.14,
    maxAnimDt: 0.05,
    batchConcurrency: 3,
  };
}

export interface PostExhibitionUiState {
  inGallery: boolean;
  scrolledPastGallery: boolean;
  navbarVariant: 'exhibition' | 'default';
  useGalleryCursor: boolean;
}

/**
 * Coordinates navbar stability and mouse pointer mode when transitioning from
 * the 3D campus exhibition into the standard Community / FAQ / Footer document flow.
 */
export function resolvePostExhibitionUiState(params: {
  webglSupported: boolean;
  communityTopPx: number | null;
  viewportHeight: number;
}): PostExhibitionUiState {
  if (!params.webglSupported) {
    return {
      inGallery: false,
      scrolledPastGallery: true,
      navbarVariant: 'default',
      useGalleryCursor: false,
    };
  }

  if (params.communityTopPx === null || !Number.isFinite(params.communityTopPx)) {
    return {
      inGallery: true,
      scrolledPastGallery: false,
      navbarVariant: 'exhibition',
      useGalleryCursor: true,
    };
  }

  const vh = Math.max(1, params.viewportHeight || 900);
  const inGallery = params.communityTopPx > vh * 0.55;
  const scrolledPastGallery = params.communityTopPx <= 84;

  return {
    inGallery,
    scrolledPastGallery,
    navbarVariant: inGallery ? 'exhibition' : 'default',
    useGalleryCursor: inGallery,
  };
}
