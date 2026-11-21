import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CURTAIN_REVEAL_SCROLL_PX,
  EXHIBITION_MOTION_TUNING,
  SCROLL_PX_PER_PATH_UNIT,
  computeCurtainRevealFraction,
  computeTrackHeightPx,
  computeWalkCampusProgress,
  resolveExhibitionPerfProfile,
  resolvePostExhibitionUiState,
  smoothstep01,
} from './exhibitionScroll';

test('HeroCurtain reveal tracks scrollY directly and clears at CURTAIN_REVEAL_SCROLL_PX', () => {
  assert.equal(computeCurtainRevealFraction(0), 0);
  assert.equal(computeCurtainRevealFraction(-50), 0);
  assert.equal(computeCurtainRevealFraction(CURTAIN_REVEAL_SCROLL_PX / 2), 0.5);
  assert.equal(computeCurtainRevealFraction(CURTAIN_REVEAL_SCROLL_PX), 1);
  assert.equal(computeCurtainRevealFraction(CURTAIN_REVEAL_SCROLL_PX * 3), 1);
});

test('smoothstep01 stays bounded [0, 1] and monotonic', () => {
  assert.equal(smoothstep01(-1), 0);
  assert.equal(smoothstep01(0.5), 0.5);
  assert.equal(smoothstep01(2), 1);
});

test('track height uses deliberate Techkriti-paced pixel density (>= 50k px for 389 path units)', () => {
  const height = computeTrackHeightPx(389.72);
  assert.equal(height, Math.round(SCROLL_PX_PER_PATH_UNIT * 389.72));
  assert.ok(height >= 50000, `Expected spacious Techkriti-paced track, got ${height}`);
});

test('Walk The Campus scroll target always clears HeroCurtain plus buffer', () => {
  const trackPx = computeTrackHeightPx(389.72);
  const progress = computeWalkCampusProgress(trackPx, 7 / 389.72);
  const landingScrollY = progress * trackPx;
  assert.ok(
    landingScrollY >= CURTAIN_REVEAL_SCROLL_PX + 120,
    `Expected landing scroll >= ${CURTAIN_REVEAL_SCROLL_PX + 120}, got ${landingScrollY}`
  );
  assert.equal(computeCurtainRevealFraction(landingScrollY), 1);
});

test('resolveExhibitionPerfProfile enables low-RAM/low-CPU optimizations cleanly', () => {
  const lowRam = resolveExhibitionPerfProfile({
    isSoftwareWebGL: false,
    isCoarsePointer: false,
    deviceMemory: 4,
    hardwareConcurrency: 8,
  });
  assert.equal(lowRam.isLowSpec, true);
  assert.equal(lowRam.pixelRatioCap, 1);
  assert.equal(lowRam.antialias, false);

  const highEnd = resolveExhibitionPerfProfile({
    isSoftwareWebGL: false,
    isCoarsePointer: false,
    deviceMemory: 16,
    hardwareConcurrency: 8,
  });
  assert.equal(highEnd.isLowSpec, false);
  assert.equal(highEnd.pixelRatioCap, 1.5);
  assert.equal(highEnd.antialias, true);
});

test('resolvePostExhibitionUiState stabilizes navbar and restores native pointer once 3D visit finishes', () => {
  assert.deepEqual(
    resolvePostExhibitionUiState({
      webglSupported: true,
      communityTopPx: 820,
      viewportHeight: 900,
    }),
    {
      inGallery: true,
      scrolledPastGallery: false,
      navbarVariant: 'exhibition',
      useGalleryCursor: true,
    }
  );

  // As soon as Community section rises into main viewport (< 55% vh), switch navbar & restore standard mouse
  assert.deepEqual(
    resolvePostExhibitionUiState({
      webglSupported: true,
      communityTopPx: 420,
      viewportHeight: 900,
    }),
    {
      inGallery: false,
      scrolledPastGallery: false,
      navbarVariant: 'default',
      useGalleryCursor: false,
    }
  );

  // Scrolled well into Community / FAQ: WebGL pauses too
  assert.deepEqual(
    resolvePostExhibitionUiState({
      webglSupported: true,
      communityTopPx: 0,
      viewportHeight: 900,
    }),
    {
      inGallery: false,
      scrolledPastGallery: true,
      navbarVariant: 'default',
      useGalleryCursor: false,
    }
  );
});

test('EXHIBITION_MOTION_TUNING stays responsive without double-damped scroll lag', () => {
  assert.ok(EXHIBITION_MOTION_TUNING.progressDampSpeed >= 7);
  assert.ok(EXHIBITION_MOTION_TUNING.walkCameraDampSpeed >= 10);
  assert.ok(EXHIBITION_MOTION_TUNING.focusCameraDampSpeed >= 4);
  assert.ok(EXHIBITION_MOTION_TUNING.scrollUploadCooldownMs >= 60);
});
