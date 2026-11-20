import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  BENCH_POS,
  BELVEDERE_WINDOW,
  EXHIBITS,
  FEATURE_WALLS,
  GEARS,
  HOLO_POS,
  LANTERNS,
  PLAQUES,
  ROOM_META,
  ROOMS,
  WALL_HEIGHT,
  WALLS,
  WAYPOINTS,
  WORLD_BOUNDS,
  findRoomAt,
  getExhibitionState,
  mapScrollToSplineT,
  motionRefs,
  setExhibitionState,
} from '../../data/exhibitionData';
import {
  createBelvedereVistaCanvas,
  createBrassGearCanvas,
  createChapterTextCanvas,
  createDropShadowCanvas,
  createFeatureWallCanvas,
  createFramedPhotoCanvas,
  createHoloPlateCanvas,
  createLabelPlaqueCanvas,
  createSpotlightBeamCanvas,
  createSurfaceCanvas,
  toCanvasTexture,
} from './proceduralTextures';

const ROOM_LIGHT_PALETTES = [
  { sky: '#ffe0ba', ground: '#4a1822', hemi: 1.4, key: '#ffc07a', keyI: 0.85, bg: '#220910', fog: [10, 32] },
  { sky: '#ffd2a4', ground: '#38151d', hemi: 1.25, key: '#ffb07a', keyI: 0.75, bg: '#1b080e', fog: [10, 32] },
  { sky: '#ffe0f0', ground: '#4a2638', hemi: 1.45, key: '#ffd0e8', keyI: 0.9, bg: '#271524', fog: [12, 36] },
  { sky: '#e2fff2', ground: '#2a3f3a', hemi: 1.4, key: '#e6fff4', keyI: 0.9, bg: '#142220', fog: [12, 36] },
  { sky: '#e2f4ff', ground: '#2a3d52', hemi: 1.5, key: '#e6f6ff', keyI: 1.0, bg: '#101b28', fog: [12, 38] },
  { sky: '#f0fcff', ground: '#3a5a70', hemi: 1.7, key: '#f0faff', keyI: 1.1, bg: '#162634', fog: [12, 38] },
].map((p) => ({
  ...p,
  sky: new THREE.Color(p.sky),
  ground: new THREE.Color(p.ground),
  key: new THREE.Color(p.key),
  bg: new THREE.Color(p.bg),
}));

function detectSoftwareWebGL(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function damp(current: number, target: number, speed: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-speed * dt));
}

export function AlumniCanvas3D() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const isCoarsePointer =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse)').matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        stencil: false,
      });
    } catch {
      setExhibitionState({ webglSupported: false, loaded: 1, phase: 'gallery' });
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const disposables: { dispose: () => void }[] = [];
    const track = <T extends { dispose: () => void }>(item: T): T => {
      disposables.push(item);
      return item;
    };

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#220910');
    scene.fog = new THREE.Fog('#220910', 12, 34);

    // Studio reflection environment for burnished brass & metallic folds
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    track(envRT);
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      50,
      (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
      0.1,
      90
    );
    camera.position.set(...WAYPOINTS[0].p);

    // Lights
    const hemiLight = new THREE.HemisphereLight('#ffe0ba', '#4a1822', 1.4);
    scene.add(hemiLight);
    const keyLight = new THREE.DirectionalLight('#ffc07a', 0.9);
    keyLight.position.set(4, 8, 9);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight('#ffffff', 0.25);
    fillLight.position.set(-6, 5, 2);
    scene.add(fillLight);
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.2);
    scene.add(ambientLight);

    const maxAniso = Math.min(2, renderer.capabilities.getMaxAnisotropy());
    const dropShadowTex = track(toCanvasTexture(createDropShadowCanvas(), maxAniso));
    const spotlightTex = track(toCanvasTexture(createSpotlightBeamCanvas(), maxAniso));

    const scaleUv = (geo: THREE.BufferGeometry, uScale: number, vScale: number) => {
      const uv = geo.getAttribute('uv');
      if (!uv) return;
      for (let i = 0; i < uv.count; i++) {
        uv.setXY(i, uv.getX(i) * uScale, uv.getY(i) * vScale);
      }
      uv.needsUpdate = true;
    };

    // Shared GPU tiled textures (only 6 GPU textures instead of 28+)
    const walnutTex = track(toCanvasTexture(createSurfaceCanvas('walnut'), maxAniso, [1, 1]));
    const plasterTex = track(toCanvasTexture(createSurfaceCanvas('maroon-plaster'), maxAniso, [1, 1]));
    const terrazzoTex = track(toCanvasTexture(createSurfaceCanvas('terrazzo'), maxAniso, [1, 1]));
    const concreteTex = track(toCanvasTexture(createSurfaceCanvas('concrete-grid'), maxAniso, [1, 1]));
    const planksTex = track(toCanvasTexture(createSurfaceCanvas('planks'), maxAniso, [1, 1]));
    const futureTex = track(toCanvasTexture(createSurfaceCanvas('future-floor'), maxAniso, [1, 1]));

    // Exterior ground plane
    const extW = WORLD_BOUNDS.x1 - WORLD_BOUNDS.x0;
    const extD = WORLD_BOUNDS.z1 - WORLD_BOUNDS.z0;
    const extGeo = track(new THREE.PlaneGeometry(extW, extD));
    scaleUv(extGeo, extW / 6, extD / 6);
    const extMat = track(
      new THREE.MeshStandardMaterial({
        map: terrazzoTex,
        color: '#6e5c58',
        roughness: 0.65,
      })
    );
    const extMesh = new THREE.Mesh(extGeo, extMat);
    extMesh.rotation.x = -Math.PI / 2;
    extMesh.position.set(
      (WORLD_BOUNDS.x0 + WORLD_BOUNDS.x1) / 2,
      -0.005,
      (WORLD_BOUNDS.z0 + WORLD_BOUNDS.z1) / 2
    );
    scene.add(extMesh);

    // Build Rooms (Floors & Ceilings)
    ROOMS.forEach((r) => {
      const age = ROOM_META[r.id]?.age ?? 2;
      const isCorridor = r.kind === 'arcade' || r.kind === 'folds';
      const w = isCorridor ? (r.len ?? 6) + 0.6 : r.x1 - r.x0;
      const d = isCorridor ? 5 : r.z1 - r.z0;
      const repeatScale = age >= 2.8 && age < 3.8 ? 2.4 : 3.5;
      const floorTex =
        age < 0.8
          ? planksTex
          : age < 1.6
          ? plasterTex
          : age < 2.2
          ? terrazzoTex
          : age < 3.8
          ? concreteTex
          : futureTex;
      const floorMat = track(
        new THREE.MeshStandardMaterial({
          map: floorTex,
          color: age < 0.8 ? '#ffffff' : age < 2.2 ? '#d6c2b4' : '#ffffff',
          roughness: age >= 3.8 ? 0.2 : age < 0.8 ? 0.45 : 0.38,
          metalness: age >= 0.8 && age < 2.2 ? 0.2 : 0.05,
        })
      );
      const floorGeo = track(new THREE.PlaneGeometry(w, d));
      scaleUv(floorGeo, w / repeatScale, d / repeatScale);

      if (isCorridor && r.a) {
        const grp = new THREE.Group();
        grp.position.set(r.a[0], 0.005, r.a[1]);
        grp.rotation.y = -(r.dir ?? 0);
        const m = new THREE.Mesh(floorGeo, floorMat);
        m.position.set(w / 2 - 0.3, 0, 0);
        m.rotation.x = -Math.PI / 2;
        grp.add(m);
        scene.add(grp);
      } else {
        const floorMesh = new THREE.Mesh(floorGeo, floorMat);
        floorMesh.rotation.x = -Math.PI / 2;
        floorMesh.position.set((r.x0 + r.x1) / 2, 0.002, (r.z0 + r.z1) / 2);
        scene.add(floorMesh);

        const ceilGeo = track(new THREE.PlaneGeometry(w, d));
        const ceilMat = track(
          new THREE.MeshBasicMaterial({
            color: age < 2.2 ? '#1a070d' : '#2a2e38',
          })
        );
        const ceilMesh = new THREE.Mesh(ceilGeo, ceilMat);
        ceilMesh.rotation.x = Math.PI / 2;
        ceilMesh.position.set((r.x0 + r.x1) / 2, WALL_HEIGHT, (r.z0 + r.z1) / 2);
        scene.add(ceilMesh);
      }
    });

    // Shared architectural moulding & pilaster materials
    const warmMouldingMat = track(
      new THREE.MeshStandardMaterial({ color: '#b88946', roughness: 0.42, metalness: 0.65 })
    );
    const coolMouldingMat = track(
      new THREE.MeshStandardMaterial({ color: '#c8bfb4', roughness: 0.52, metalness: 0.15 })
    );
    const panelLineDarkMat = track(
      new THREE.MeshBasicMaterial({
        color: '#000000',
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
      })
    );
    const panelLineLightMat = track(
      new THREE.MeshBasicMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
      })
    );

    // Build Walls
    WALLS.forEach((w) => {
      const hasFeature = FEATURE_WALLS.some((fw) => fw.wall === w.id);
      const len = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]);
      const thick = w.t ?? 0.3;
      const age = ROOM_META[w.room]?.age ?? 2;
      const accent = ROOM_META[w.room]?.accent ?? '#ffcf8a';

      const grp = new THREE.Group();
      grp.position.set((w.a[0] + w.b[0]) / 2, 0, (w.a[1] + w.b[1]) / 2);
      grp.rotation.y = Math.atan2(w.n[0], w.n[1]);

      const wallTex =
        age < 0.8
          ? walnutTex
          : age < 2.2
          ? plasterTex
          : age < 3.8
          ? terrazzoTex
          : concreteTex;

      if (thick > 0) {
        const boxGeo = track(new THREE.BoxGeometry(len + thick * 0.02, WALL_HEIGHT, thick));
        scaleUv(boxGeo, len / (age < 1.6 ? 3.2 : 4.2), 1);
        const boxMat = track(
          age >= 4.5
            ? new THREE.MeshStandardMaterial({ color: '#e6f1f8', roughness: 0.32 })
            : new THREE.MeshStandardMaterial({
                map: wallTex,
                color: age < 0.8 ? '#d6a47a' : age < 2.2 ? '#985c68' : '#efe3d5',
                roughness: age < 0.8 ? 0.55 : 0.82,
                metalness: age >= 0.8 && age < 2.0 ? 0.18 : 0.04,
              })
        );
        const mesh = new THREE.Mesh(boxGeo, boxMat);
        mesh.position.set(0, WALL_HEIGHT / 2, -thick / 2);
        grp.add(mesh);
      }

      // Baseboard trim
      const baseGeo = track(new THREE.PlaneGeometry(len, 0.24));
      const baseMesh = new THREE.Mesh(baseGeo, panelLineDarkMat);
      baseMesh.position.set(0, 0.12, 0.004);
      grp.add(baseMesh);

      // Architectural dado rail, cornice & bay pilasters on non-feature walls
      if (!hasFeature) {
        const mouldingMat = age < 2.2 ? warmMouldingMat : coolMouldingMat;
        const dadoMesh = new THREE.Mesh(track(new THREE.PlaneGeometry(len, 0.036)), mouldingMat);
        dadoMesh.position.set(0, 0.58, 0.005);
        grp.add(dadoMesh);

        const corniceMesh = new THREE.Mesh(track(new THREE.PlaneGeometry(len, 0.055)), mouldingMat);
        corniceMesh.position.set(0, WALL_HEIGHT - 0.14, 0.005);
        grp.add(corniceMesh);

        if (len >= 2.6) {
          const bayCount = Math.max(2, Math.round(len / 3.4));
          const pilasterGeo = track(new THREE.PlaneGeometry(0.045, WALL_HEIGHT - 0.78));
          for (let i = 1; i < bayCount; i++) {
            const px = -len / 2 + (len * i) / bayCount;
            const pilaster = new THREE.Mesh(
              pilasterGeo,
              age < 2.2 ? panelLineLightMat : panelLineDarkMat
            );
            pilaster.position.set(px, 0.58 + (WALL_HEIGHT - 0.78) / 2, 0.004);
            grp.add(pilaster);
          }
        }

        [0.06, WALL_HEIGHT - 0.46].forEach((yPos) => {
          const stripGeo = track(new THREE.PlaneGeometry(len, 0.028));
          const stripMat = track(
            new THREE.MeshBasicMaterial({
              color: accent,
              transparent: true,
              opacity: 0.45,
              toneMapped: false,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
            })
          );
          const strip = new THREE.Mesh(stripGeo, stripMat);
          strip.position.set(0, yPos, 0.035);
          grp.add(strip);
        });
      }

      scene.add(grp);
    });

    // Build Arched Colonnade (Corridor 2: Arcade)
    ROOMS.filter((r) => r.kind === 'arcade').forEach((r) => {
      const len = r.len ?? 13;
      const archCount = Math.round(len / 1.05);
      const totalSpan = (archCount - 1) * 1.05 + 0.42;

      const makeArchGeo = (halfW: number, depth: number) => {
        const shape = new THREE.Shape();
        shape.moveTo(-halfW, 0);
        shape.lineTo(-1.3, 0);
        shape.lineTo(-1.3, 2.25);
        shape.absarc(0, 2.25, 1.3, Math.PI, 0, true);
        shape.lineTo(1.3, 0);
        shape.lineTo(halfW, 0);
        shape.lineTo(halfW, WALL_HEIGHT);
        shape.lineTo(-halfW, WALL_HEIGHT);
        shape.closePath();
        const geo = new THREE.ExtrudeGeometry(shape, {
          depth,
          bevelEnabled: false,
          curveSegments: 16,
        });
        geo.rotateY(Math.PI / 2);
        return track(geo);
      };

      const archGeo = makeArchGeo(2.25, 0.42);
      const endArchGeo = makeArchGeo(2.6, 0.3);
      const stoneMat = track(
        new THREE.MeshStandardMaterial({
          color: '#e5d4c0',
          roughness: 0.4,
          metalness: 0.08,
        })
      );
      const brassMat = track(
        new THREE.MeshStandardMaterial({
          color: '#c89b52',
          roughness: 0.35,
          metalness: 0.72,
        })
      );

      // Brass inner arch trim tube
      const trimPts: THREE.Vector3[] = [
        new THREE.Vector3(0, 0.02, -1.3),
        new THREE.Vector3(0, 2.25, -1.3),
      ];
      for (let i = 0; i <= 16; i++) {
        const a = Math.PI - (i / 16) * Math.PI;
        trimPts.push(new THREE.Vector3(0, 2.25 + 1.3 * Math.sin(a), 1.3 * Math.cos(a)));
      }
      trimPts.push(new THREE.Vector3(0, 0.02, 1.3));
      const trimGeo = track(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(trimPts, false, 'catmullrom', 0.02),
          36,
          0.02,
          5,
          false
        )
      );

      const grp = new THREE.Group();
      if (r.a) grp.position.set(r.a[0], 0, r.a[1]);
      grp.rotation.y = -(r.dir ?? 0);

      for (let i = 0; i < archCount; i++) {
        const rib = new THREE.Group();
        rib.position.set(1.05 * i + 0.02, 0, 0);
        rib.add(new THREE.Mesh(archGeo, stoneMat));
        const trimMesh = new THREE.Mesh(trimGeo, brassMat);
        trimMesh.position.set(-0.01, 0, 0);
        rib.add(trimMesh);
        grp.add(rib);
      }

      [-0.32, totalSpan + 0.04].forEach((xOffset) => {
        const m = new THREE.Mesh(endArchGeo, stoneMat);
        m.position.set(xOffset, 0, 0);
        grp.add(m);
      });

      [-2.25, 2.25].forEach((zOff) => {
        const sideWall = new THREE.Mesh(
          track(new THREE.BoxGeometry(totalSpan, WALL_HEIGHT, 0.06)),
          stoneMat
        );
        sideWall.position.set(totalSpan / 2, WALL_HEIGHT / 2, zOff);
        grp.add(sideWall);
      });

      // Decorative brass heritage medallions inside colonnade bays
      const medallionRingGeo = track(new THREE.RingGeometry(0.24, 0.3, 24));
      const medallionCoreGeo = track(new THREE.CircleGeometry(0.14, 20));
      for (let i = 1; i < archCount - 1; i += 2) {
        const xBay = 1.05 * i + 0.54;
        [-2.21, 2.21].forEach((zSide) => {
          const rotY = zSide < 0 ? 0 : Math.PI;
          const ring = new THREE.Mesh(medallionRingGeo, brassMat);
          ring.position.set(xBay, 1.85, zSide);
          ring.rotation.y = rotY;
          grp.add(ring);

          const core = new THREE.Mesh(medallionCoreGeo, warmMouldingMat);
          core.position.set(xBay, 1.85, zSide);
          core.rotation.y = rotY;
          grp.add(core);
        });
      }

      const roof = new THREE.Mesh(
        track(new THREE.BoxGeometry(totalSpan + 0.6, 0.06, 4.9)),
        stoneMat
      );
      roof.position.set(totalSpan / 2, WALL_HEIGHT + 0.02, 0);
      grp.add(roof);

      scene.add(grp);
    });

    // Build Angled Architectural Folds Corridors
    ROOMS.filter((r) => r.kind === 'folds').forEach((r) => {
      const shape = new THREE.Shape();
      shape.moveTo(-4.6, -4.6);
      shape.lineTo(4.6, -4.6);
      shape.lineTo(4.6, 4.6);
      shape.lineTo(-4.6, 4.6);
      shape.closePath();

      const hole = new THREE.Path();
      hole.moveTo(-1.75, -1.72);
      hole.lineTo(-1.75, 1.72);
      hole.lineTo(1.75, 1.72);
      hole.lineTo(1.75, -1.72);
      hole.closePath();
      shape.holes.push(hole);

      const foldGeo = track(new THREE.ExtrudeGeometry(shape, { depth: 0.035, bevelEnabled: false }));
      foldGeo.rotateY(Math.PI / 2);

      const step = isCoarsePointer ? 1.15 : 0.65;
      const count = Math.max(2, Math.round((r.len ?? 6) / step));
      const fromCol = new THREE.Color(ROOM_META[r.id]?.from ?? '#d9cbb5');
      const toCol = new THREE.Color(ROOM_META[r.id]?.accent ?? '#d9cbb5');

      const grp = new THREE.Group();
      if (r.a) grp.position.set(r.a[0], 0, r.a[1]);
      grp.rotation.y = -(r.dir ?? 0);

      for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        const col = new THREE.Color('#c8bab0')
          .lerp(new THREE.Color().lerpColors(fromCol, toCol, t), 0.28)
          .multiplyScalar(i % 2 ? 0.85 : 1);
        const mat = track(
          new THREE.MeshStandardMaterial({
            color: col,
            roughness: 0.72,
            metalness: 0.15,
            side: THREE.DoubleSide,
          })
        );
        const mesh = new THREE.Mesh(foldGeo, mat);
        mesh.position.set(0.55 + t * ((r.len ?? 6) - 1.1), 1.72, 0);
        mesh.rotation.x = t * 1.45 - 0.2;
        grp.add(mesh);
      }

      scene.add(grp);
    });

    // Build Belvedere Panoramic Window & Clickable Stone Bench
    const clickableMeshes: THREE.Object3D[] = [];
    let benchMesh: THREE.Mesh | null = null;
    {
      const bw = BELVEDERE_WINDOW;
      const cx = (bw.x0 + bw.x1) / 2;
      const span = bw.x1 - bw.x0;
      const frameMat = track(new THREE.MeshStandardMaterial({ color: '#e5d4c0', roughness: 0.5 }));

      const topFrame = new THREE.Mesh(
        track(new THREE.BoxGeometry(span, WALL_HEIGHT - bw.y1, 0.3)),
        frameMat
      );
      topFrame.position.set(cx, (WALL_HEIGHT + bw.y1) / 2, bw.z - 0.15);
      scene.add(topFrame);

      const botFrame = new THREE.Mesh(
        track(new THREE.BoxGeometry(span, bw.y0, 0.3)),
        frameMat
      );
      botFrame.position.set(cx, bw.y0 / 2, bw.z - 0.15);
      scene.add(botFrame);

      [bw.x0, bw.x1].forEach((xEdge) => {
        const jamb = new THREE.Mesh(
          track(new THREE.BoxGeometry(0.08, WALL_HEIGHT, 1.2)),
          frameMat
        );
        jamb.position.set(xEdge, WALL_HEIGHT / 2, bw.z - 0.6);
        scene.add(jamb);
      });

      // Async vista canvas
      createBelvedereVistaCanvas().then((canvas) => {
        const tex = track(toCanvasTexture(canvas, maxAniso));
        const vistaMesh = new THREE.Mesh(
          track(new THREE.PlaneGeometry(span, bw.y1 - bw.y0 + 0.4)),
          track(new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, fog: false }))
        );
        vistaMesh.position.set(cx, (bw.y0 + bw.y1) / 2, bw.z - 1.1);
        scene.add(vistaMesh);
      });

      // Clickable Stone Bench
      const benchMat = track(new THREE.MeshStandardMaterial({ color: '#efeae2', roughness: 0.85 }));
      benchMesh = new THREE.Mesh(track(new THREE.BoxGeometry(3.8, 0.5, 0.75)), benchMat);
      benchMesh.position.set(BENCH_POS.x, 0.25, BENCH_POS.z);
      benchMesh.userData = { interactType: 'bench', interactId: 'bench' };
      scene.add(benchMesh);
      clickableMeshes.push(benchMesh);

      const benchShadow = new THREE.Mesh(
        track(new THREE.PlaneGeometry(4.8, 1.6)),
        track(
          new THREE.MeshBasicMaterial({
            map: dropShadowTex,
            transparent: true,
            opacity: 0.32,
            color: '#000000',
            depthWrite: false,
          })
        )
      );
      benchShadow.rotation.x = -Math.PI / 2;
      benchShadow.position.set(BENCH_POS.x, 0.006, BENCH_POS.z + 0.2);
      scene.add(benchShadow);
    }

    // Build Rotating Brass Heritage Gears
    const gearMeshes: { mesh: THREE.Mesh; speed: number }[] = [];
    GEARS.forEach((g, idx) => {
      const gearTex = track(toCanvasTexture(createBrassGearCanvas(g.teeth, `gear-${idx}`), maxAniso));
      const mesh = new THREE.Mesh(
        track(new THREE.PlaneGeometry(g.d, g.d)),
        track(
          new THREE.MeshStandardMaterial({
            map: gearTex,
            transparent: true,
            alphaTest: 0.05,
            metalness: 0.65,
            roughness: 0.32,
          })
        )
      );
      const grp = new THREE.Group();
      grp.position.set(g.x, g.y, g.z);
      grp.rotation.y = g.rot;
      mesh.position.z = 0.03;
      grp.add(mesh);
      scene.add(grp);
      gearMeshes.push({ mesh, speed: (g.dir * 3.0) / g.teeth });
    });

    // Build Flickering Warm Sconce Lanterns (1 shared point light + baked halo planes for 60fps PBR)
    const activeLanternLight = new THREE.PointLight('#ffae52', 5.2, 11, 1.5);
    activeLanternLight.position.set(13.8, 2.75, -1.2);
    scene.add(activeLanternLight);

    const lanternRefs: { glow: THREE.MeshBasicMaterial; phase: number; pos: THREE.Vector3 }[] = [];
    LANTERNS.forEach((l, idx) => {
      const grp = new THREE.Group();
      grp.position.set(l.x, 2.75, l.z);
      grp.rotation.y = l.rot;

      const bracket = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.06, 0.34, 0.12)),
        track(new THREE.MeshStandardMaterial({ color: '#a87c32', metalness: 0.8, roughness: 0.35 }))
      );
      bracket.position.set(0, -0.18, 0.08);
      grp.add(bracket);

      const bulbMat = track(
        new THREE.MeshBasicMaterial({ color: '#ffd280', transparent: true, toneMapped: false })
      );
      const bulb = new THREE.Mesh(track(new THREE.SphereGeometry(0.1, 12, 10)), bulbMat);
      bulb.position.set(0, 0, 0.18);
      grp.add(bulb);

      const halo = new THREE.Mesh(
        track(new THREE.PlaneGeometry(1.8, 1.8)),
        track(
          new THREE.MeshBasicMaterial({
            map: spotlightTex,
            color: '#ffb95e',
            transparent: true,
            opacity: 0.28,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            toneMapped: false,
          })
        )
      );
      halo.position.set(0, -0.45, 0.14);
      grp.add(halo);

      scene.add(grp);
      lanternRefs.push({
        glow: bulbMat,
        phase: idx * 2.1,
        pos: new THREE.Vector3(l.x, 2.75, l.z),
      });
    });

    // Build Feature Wall Murals
    FEATURE_WALLS.forEach((fw) => {
      const wallH = WALL_HEIGHT - 0.28;
      createFeatureWallCanvas(fw).then((canvas) => {
        const tex = track(toCanvasTexture(canvas, maxAniso));
        const mural = new THREE.Mesh(
          track(new THREE.PlaneGeometry(fw.len, wallH)),
          track(new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }))
        );
        mural.position.set(fw.x, 0.14 + wallH / 2, fw.z);
        mural.rotation.y = fw.rot;
        scene.add(mural);
      });
    });

    // Build Chapter Plaques
    PLAQUES.forEach((c) => {
      const room = findRoomAt(c.x, c.z);
      const meta = ROOM_META[room.id];
      const age = meta.age;
      const isFinal = Boolean(c.glow);

      const grp = new THREE.Group();
      grp.position.set(c.x, 1.85, c.z);
      grp.rotation.y = c.rot;

      const bodyGeo = track(new THREE.BoxGeometry(4.8, 3.5, 0.3));
      const bodyMat = track(
        isFinal
          ? new THREE.MeshStandardMaterial({
              color: '#0d1a24',
              emissive: '#1e546e',
              emissiveIntensity: 0.65,
              roughness: 0.2,
            })
          : new THREE.MeshStandardMaterial({
              map: age < 0.8 ? walnutTex : plasterTex,
              color: age < 0.8 ? '#b88254' : '#783446',
              roughness: 0.65,
              metalness: 0.15,
            })
      );
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      if (c.href) {
        bodyMesh.userData = { interactType: 'link', href: c.href, interactId: c.id };
        clickableMeshes.push(bodyMesh);
      }
      grp.add(bodyMesh);

      if (!isFinal && age < 0.8) {
        const rim = new THREE.Mesh(
          track(new THREE.BoxGeometry(4.94, 3.64, 0.28)),
          track(new THREE.MeshStandardMaterial({ color: '#c9a063', roughness: 0.3, metalness: 0.8 }))
        );
        grp.add(rim);
      }

      if (isFinal) {
        const backGlow = new THREE.Mesh(
          track(new THREE.PlaneGeometry(7.2, 5.2)),
          track(new THREE.MeshBasicMaterial({ color: '#6fdcff', toneMapped: false }))
        );
        backGlow.position.z = -0.3;
        grp.add(backGlow);
      }

      const shadow = new THREE.Mesh(
        track(new THREE.PlaneGeometry(5.6, 1.6)),
        track(
          new THREE.MeshBasicMaterial({
            map: dropShadowTex,
            transparent: true,
            opacity: 0.35,
            color: '#000000',
            depthWrite: false,
          })
        )
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.set(0, -1.845, 0.3);
      grp.add(shadow);

      const textTex = track(
        toCanvasTexture(
          createChapterTextCanvas(c.n, c.title, c.lines, meta.accent, meta.era, isFinal),
          maxAniso
        )
      );
      const textPlane = new THREE.Mesh(
        track(new THREE.PlaneGeometry(4.8, 3.36)),
        track(
          new THREE.MeshBasicMaterial({
            map: textTex,
            transparent: true,
            depthWrite: false,
            toneMapped: false,
          })
        )
      );
      textPlane.position.z = 0.155;
      grp.add(textPlane);

      scene.add(grp);
    });

    // Backlit Reunion Sanctuary Crest Panel behind Welcome Home plaque (on reunion-E0)
    createHoloPlateCanvas('Grizzly Vidyalaya', 'Telaiya Dam Alumni Association', '#8fe3ff').then(
      (canvas) => {
        const tex = track(toCanvasTexture(canvas, maxAniso));
        const backdropPlate = new THREE.Mesh(
          track(new THREE.PlaneGeometry(3.8, 2.1)),
          track(
            new THREE.MeshBasicMaterial({
              map: tex,
              transparent: true,
              opacity: 0.72,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
              toneMapped: false,
            })
          )
        );
        backdropPlate.position.set(52.95, 2.25, -30.5);
        backdropPlate.rotation.y = -Math.PI / 2;
        scene.add(backdropPlate);
      }
    );

    // Twin Holographic Alumni Crest Plates in Final Campus
    [
      { label: 'Alumni Directory', sub: 'Find Your Batch', accent: '#63d8ff', z: HOLO_POS.zs[0] },
      { label: 'Reunion Stories', sub: 'Grizzly Vidyalaya', accent: '#ffd082', z: HOLO_POS.zs[1] },
    ].forEach((h, idx) => {
      createHoloPlateCanvas(h.label, h.sub, h.accent).then((canvas) => {
        const tex = track(toCanvasTexture(canvas, maxAniso));
        const plate = new THREE.Mesh(
          track(new THREE.PlaneGeometry(2.5, 1.38)),
          track(
            new THREE.MeshBasicMaterial({
              map: tex,
              transparent: true,
              opacity: 0.48,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
              side: THREE.DoubleSide,
              toneMapped: false,
            })
          )
        );
        plate.position.set(HOLO_POS.x - 0.6, 2.0, h.z);
        plate.rotation.y = -Math.PI / 2 + (idx === 0 ? 0.18 : -0.18);
        scene.add(plate);
      });
    });

    // Build Framed Campus Exhibits (The User's Existing Photos!)
    const exhibitHoverGroups = new Map<string, THREE.Group>();
    let loadedImages = 0;
    const totalImages = EXHIBITS.length;

    const markLoaded = () => {
      loadedImages += 1;
      setExhibitionState({ loaded: Math.min(1, loadedImages / Math.max(1, totalImages)) });
    };

    EXHIBITS.forEach((ex) => {
      const meta = ROOM_META[ex.room];
      const isWide = ex.id === 'exhibit-gate';
      const frameBorder = isWide ? 0.09 : 0.06;
      const grp = new THREE.Group();
      grp.position.set(ex.x, 0, ex.z);
      grp.rotation.y = ex.rot;

      // Spotlight beam above frame
      const beam = new THREE.Mesh(
        track(new THREE.PlaneGeometry(ex.w * 2.2, 3.6)),
        track(
          new THREE.MeshBasicMaterial({
            map: spotlightTex,
            color: '#ffcf8a',
            transparent: true,
            opacity: isWide ? 0.32 : 0.28,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        )
      );
      beam.position.set(0, ex.y + 0.55, 0.035);
      grp.add(beam);

      const moveGrp = new THREE.Group();
      grp.add(moveGrp);
      exhibitHoverGroups.set(ex.id, moveGrp);

      const frameSub = new THREE.Group();
      frameSub.position.set(0, ex.y, 0.03);
      moveGrp.add(frameSub);

      // Soft drop shadow
      const shadow = new THREE.Mesh(
        track(new THREE.PlaneGeometry(ex.w * 1.45, ex.h * 1.45)),
        track(
          new THREE.MeshBasicMaterial({
            map: dropShadowTex,
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
            color: '#000000',
          })
        )
      );
      shadow.position.set(0.04, -0.06, -0.025);
      frameSub.add(shadow);

      // Burnished Brass / Dark Metallic Frame Box
      const frameMesh = new THREE.Mesh(
        track(new THREE.BoxGeometry(ex.w + frameBorder * 2, ex.h + frameBorder * 2, 0.045)),
        track(
          new THREE.MeshStandardMaterial({
            color: isWide ? '#c89b44' : '#967032',
            metalness: 0.78,
            roughness: 0.3,
          })
        )
      );
      frameMesh.userData = { interactType: 'exhibit', interactId: ex.id };
      clickableMeshes.push(frameMesh);
      frameSub.add(frameMesh);

      // Corner reticles (Techkriti U() brackets)
      const bracketLen = Math.min(ex.w, ex.h) * 0.2;
      const bw = ex.w / 2 + frameBorder + 0.07;
      const bh = ex.h / 2 + frameBorder + 0.07;
      const bracketMat = track(
        new THREE.MeshBasicMaterial({ color: meta.accent, toneMapped: false })
      );
      [
        [-1, 1],
        [1, 1],
        [-1, -1],
        [1, -1],
      ].forEach(([sx, sy]) => {
        const hBar = new THREE.Mesh(
          track(new THREE.PlaneGeometry(bracketLen, 0.016)),
          bracketMat
        );
        hBar.position.set(sx * bw - (sx * bracketLen) / 2, sy * bh, 0.032);
        frameSub.add(hBar);

        const vBar = new THREE.Mesh(
          track(new THREE.PlaneGeometry(0.016, bracketLen)),
          bracketMat
        );
        vBar.position.set(sx * bw, sy * bh - (sy * bracketLen) / 2, 0.032);
        frameSub.add(vBar);
      });

      // Photo Canvas Plane (placeholder first, upgraded when image loads)
      const photoMat = track(
        new THREE.MeshBasicMaterial({ color: '#e8dfd3', toneMapped: false })
      );
      const photoMesh = new THREE.Mesh(track(new THREE.PlaneGeometry(ex.w, ex.h)), photoMat);
      photoMesh.position.z = 0.024;
      photoMesh.userData = { interactType: 'exhibit', interactId: ex.id };
      clickableMeshes.push(photoMesh);
      frameSub.add(photoMesh);

      createFramedPhotoCanvas(ex.imageSrc, ex.title, isWide)
        .then((canvas) => {
          const tex = track(toCanvasTexture(canvas, maxAniso));
          photoMat.map = tex;
          photoMat.color.set('#ffffff');
          photoMat.needsUpdate = true;
        })
        .finally(markLoaded);

      // Wall Label Plaque below painting
      const labelY = ex.y - ex.h / 2 - 0.16;
      const labelScale = Math.min(1, Math.max(0.32, (labelY - 0.04) / 0.4));
      const labelTex = track(
        toCanvasTexture(createLabelPlaqueCanvas(ex.kicker, ex.title, meta.accent), maxAniso)
      );
      const labelPlane = new THREE.Mesh(
        track(new THREE.PlaneGeometry(1.5 * labelScale, 0.4 * labelScale)),
        track(
          new THREE.MeshBasicMaterial({
            map: labelTex,
            transparent: true,
            depthWrite: false,
            toneMapped: false,
          })
        )
      );
      labelPlane.position.set(-ex.w / 2 + 0.75 * labelScale, labelY - 0.2 * labelScale, 0.008);
      grp.add(labelPlane);

      scene.add(grp);
    });

    // Build Camera Spline & Gaze Interpolation
    const splineCurve = new THREE.CatmullRomCurve3(
      WAYPOINTS.map((w) => new THREE.Vector3(...w.p)),
      false,
      'centripetal'
    );
    const lookYaws = WAYPOINTS.map((w) => Math.atan2(w.l[0] - w.p[0], w.l[2] - w.p[2]));
    const lookPitches = WAYPOINTS.map((w) =>
      Math.atan2(w.l[1] - w.p[1], Math.hypot(w.l[0] - w.p[0], w.l[2] - w.p[2]))
    );

    const sampleGaze = (u: number, out = new THREE.Vector3()): THREE.Vector3 => {
      const clamped = Math.min(WAYPOINTS.length - 1.0001, Math.max(0, u * (WAYPOINTS.length - 1)));
      const idx = Math.floor(clamped);
      const f = clamped - idx;
      const smooth = f * f * (3 - 2 * f);
      let dYaw = lookYaws[idx + 1] - lookYaws[idx];
      dYaw = Math.atan2(Math.sin(dYaw), Math.cos(dYaw));
      const yaw = lookYaws[idx] + dYaw * smooth;
      const pitch = lookPitches[idx] + (lookPitches[idx + 1] - lookPitches[idx]) * smooth;
      return out.set(
        Math.sin(yaw) * Math.cos(pitch),
        Math.sin(pitch),
        Math.cos(yaw) * Math.cos(pitch)
      );
    };

    // Glowing Floor Light-Stream Ribbon (ShaderMaterial)
    const ribbonSamples = isCoarsePointer ? 300 : 520;
    const ribbonGeo = track(new THREE.BufferGeometry());
    const rPos = new Float32Array(ribbonSamples * 2 * 3);
    const rU = new Float32Array(ribbonSamples * 2);
    const rCol = new Float32Array(ribbonSamples * 2 * 3);
    const pA = new THREE.Vector3();
    const pB = new THREE.Vector3();
    const gDir = new THREE.Vector3();
    const tmpCol = new THREE.Color();

    const sampleRibbonPt = (u: number, out: THREE.Vector3) => {
      splineCurve.getPoint(u, out);
      sampleGaze(u, gDir);
      const h = Math.hypot(gDir.x, gDir.z) || 1;
      out.x += (gDir.x / h) * 2.3;
      out.z += (gDir.z / h) * 2.3;
    };

    for (let i = 0; i < ribbonSamples; i++) {
      const u = i / (ribbonSamples - 1);
      sampleRibbonPt(u, pA);
      sampleRibbonPt(Math.min(1, u + 0.002), pB);
      const dx = pB.x - pA.x;
      const dz = pB.z - pA.z;
      const len = Math.hypot(dx, dz) || 1;
      const nx = (-dz / len) * 0.07;
      const nz = (dx / len) * 0.07;

      rPos.set([pA.x + nx, 0.014, pA.z + nz, pA.x - nx, 0.014, pA.z - nz], i * 6);
      rU.set([u, u], i * 2);
      const rm = findRoomAt(pA.x, pA.z);
      tmpCol.set(ROOM_META[rm.id]?.accent ?? '#ffcf8a');
      rCol.set([tmpCol.r, tmpCol.g, tmpCol.b, tmpCol.r, tmpCol.g, tmpCol.b], i * 6);
    }

    const rIdx: number[] = [];
    for (let i = 0; i < ribbonSamples - 1; i++) {
      const b = i * 2;
      rIdx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    }
    ribbonGeo.setIndex(rIdx);
    ribbonGeo.setAttribute('position', new THREE.BufferAttribute(rPos, 3));
    ribbonGeo.setAttribute('aU', new THREE.BufferAttribute(rU, 1));
    ribbonGeo.setAttribute('color', new THREE.BufferAttribute(rCol, 3));

    const ribbonMat = track(
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uHead: { value: 0 },
        },
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        vertexShader: `
          attribute float aU;
          varying float vU;
          varying vec3 vC;
          void main() {
            vU = aU;
            vC = color;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform float uHead;
          varying float vU;
          varying vec3 vC;
          void main() {
            float ahead = vU - uHead;
            float packets = pow(max(0.0, sin(vU * 210.0 - uTime * 3.0)), 14.0);
            float near = exp(-abs(ahead - 0.014) * 52.0);
            float trail = 0.24 + packets * (0.5 + near * 2.0) + near * 1.4;
            float fade = ahead < 0.0 ? 0.5 : 1.0;
            gl_FragColor = vec4(vC * trail * 1.5, clamp(trail, 0.0, 1.0) * fade);
          }
        `,
      })
    );
    scene.add(new THREE.Mesh(ribbonGeo, ribbonMat));

    // GPU-Animated Dust Motes (Zero CPU loop & zero buffer re-uploads per frame)
    const moteCount = isCoarsePointer ? 360 : 850;
    const moteGeo = track(new THREE.BufferGeometry());
    const motePos = new Float32Array(moteCount * 3);
    const moteCol = new Float32Array(moteCount * 3);
    const motePhase = new Float32Array(moteCount);
    let mSeed = 42;
    const mRand = () => {
      mSeed = (mSeed * 16807) % 2147483647;
      return mSeed / 2147483647;
    };

    for (let i = 0; i < moteCount; i++) {
      const mx = WORLD_BOUNDS.x0 + 6 + mRand() * (WORLD_BOUNDS.x1 - WORLD_BOUNDS.x0 - 12);
      const mz = WORLD_BOUNDS.z0 + 8 + mRand() * (WORLD_BOUNDS.z1 - WORLD_BOUNDS.z0 - 18);
      motePos.set([mx, 0.2 + mRand() * 3.9, mz], i * 3);
      motePhase[i] = mRand() * 6.28318;
      const rm = findRoomAt(mx, mz);
      tmpCol.set(ROOM_META[rm.id]?.accent ?? '#ffcf8a').multiplyScalar(0.65 + 0.65 * mRand());
      moteCol.set([tmpCol.r, tmpCol.g, tmpCol.b], i * 3);
    }
    moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
    moteGeo.setAttribute('color', new THREE.BufferAttribute(moteCol, 3));
    moteGeo.setAttribute('aPhase', new THREE.BufferAttribute(motePhase, 1));
    const moteMat = track(
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        vertexShader: `
          attribute float aPhase;
          uniform float uTime;
          varying vec3 vC;
          void main() {
            vC = color;
            vec3 p = position;
            p.y = 0.18 + mod(p.y + uTime * (0.04 + mod(aPhase, 0.04)), 4.0);
            p.x += sin(uTime * 0.45 + aPhase) * 0.14;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = clamp(24.0 / max(0.6, -mv.z), 1.5, 6.0);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          varying vec3 vC;
          void main() {
            float d = length(gl_PointCoord - vec2(0.5));
            if (d > 0.5) discard;
            float a = smoothstep(0.5, 0.05, d) * 0.85;
            gl_FragColor = vec4(vC, a);
          }
        `,
      })
    );
    scene.add(new THREE.Points(moteGeo, moteMat));

    // Pointer Raycasting (Hover & Click)
    const raycaster = new THREE.Raycaster();
    const ndcPointer = new THREE.Vector2();
    let lastHoverTime = 0;

    const updateNdc = (e: PointerEvent | MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      ndcPointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndcPointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverTime < 40) return;
      lastHoverTime = now;
      if (getExhibitionState().focus || getExhibitionState().bench) return;
      updateNdc(e);
      raycaster.setFromCamera(ndcPointer, camera);
      const hits = raycaster.intersectObjects(clickableMeshes, false);
      if (hits.length > 0) {
        const hitId = hits[0].object.userData.interactId as string | undefined;
        if (hitId && getExhibitionState().hover !== hitId) {
          setExhibitionState({ hover: hitId });
        }
      } else if (getExhibitionState().hover !== null) {
        setExhibitionState({ hover: null });
      }
    };

    const onClick = (e: MouseEvent) => {
      if (getExhibitionState().phase !== 'gallery') return;
      if (getExhibitionState().focus || getExhibitionState().bench) return;
      updateNdc(e);
      raycaster.setFromCamera(ndcPointer, camera);
      const hits = raycaster.intersectObjects(clickableMeshes, false);
      if (hits.length === 0) return;
      const data = hits[0].object.userData;
      if (data.interactType === 'exhibit' && data.interactId) {
        setExhibitionState({ focus: data.interactId, hover: null });
      } else if (data.interactType === 'bench') {
        setExhibitionState({ bench: true, hover: null });
      } else if (data.interactType === 'link' && data.href) {
        window.location.hash = data.href.replace(/^#/, '');
      }
    };

    renderer.domElement.addEventListener('pointermove', onPointerMove, { passive: true });
    renderer.domElement.addEventListener('click', onClick);

    // Resize listener
    const onResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // WebGL context loss safety
    let contextLost = false;
    const onContextLost = (e: Event) => {
      e.preventDefault();
      contextLost = true;
    };
    const onContextRestored = () => {
      contextLost = false;
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    // Animation loop state
    const clock = new THREE.Clock();
    const curLook = new THREE.Vector3(...WAYPOINTS[0].l);
    const camPos = new THREE.Vector3();
    const gazeVec = new THREE.Vector3();
    const smoothPtr = { x: 0, y: 0 };
    const lightAge = { value: 0 };
    const skyCol = new THREE.Color();
    const groundCol = new THREE.Color();
    const keyCol = new THREE.Color();
    const bgCol = new THREE.Color();
    let arrivedFocusId: string | null = null;
    let lastRoomId = '';
    let frameId = 0;

    const animate = () => {
      if (contextLost) {
        frameId = requestAnimationFrame(animate);
        return;
      }

      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.elapsedTime;
      const ui = getExhibitionState();

      // Dynamic responsive FOV (50° desktop base guarantees full uncropped exhibit + plaque framing)
      const aspect = camera.aspect || 1.5;
      const targetFov =
        aspect >= 1.5
          ? 50
          : THREE.MathUtils.clamp(
              Math.max(
                50 + (1.5 - aspect) * 22,
                THREE.MathUtils.radToDeg(
                  2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(27)) / aspect)
                )
              ),
              46,
              88
            );
      if (Math.abs(camera.fov - targetFov) > 0.01) {
        camera.fov = targetFov;
        camera.updateProjectionMatrix();
      }

      // Smooth Techkriti-matched scroll progress & camera damping
      motionRefs.progress = damp(motionRefs.progress, motionRefs.target, 2.8, dt);
      const u = mapScrollToSplineT(motionRefs.progress);
      splineCurve.getPoint(u, camPos);
      sampleGaze(u, gazeVec).multiplyScalar(5).add(camPos);

      smoothPtr.x = damp(smoothPtr.x, motionRefs.pointer.x, 1.5, dt);
      smoothPtr.y = damp(smoothPtr.y, motionRefs.pointer.y, 1.5, dt);

      let gx = camPos.x + smoothPtr.x * 0.06;
      let gy = camPos.y - smoothPtr.y * 0.025;
      let gz = camPos.z;
      let lx = gazeVec.x + smoothPtr.x * 0.02;
      let ly = gazeVec.y;
      let lz = gazeVec.z;
      let camSpeed = 4.2;

      // Focus glide directly in front of clicked campus exhibit
      const focusedExhibit = ui.focus ? EXHIBITS.find((e) => e.id === ui.focus) : null;
      if (focusedExhibit) {
        const halfFovRad = THREE.MathUtils.degToRad(targetFov / 2);
        const tanHalf = Math.tan(halfFovRad);
        const isLandscape = aspect > 1;
        const dist = Math.max(
          (focusedExhibit.h * 1.55) / (2 * tanHalf),
          isLandscape
            ? focusedExhibit.w / (tanHalf * aspect)
            : (focusedExhibit.w * 1.15) / (2 * tanHalf * aspect)
        );
        const sideOffset = isLandscape ? 0.44 * dist * tanHalf * aspect : 0;
        const sinR = Math.sin(focusedExhibit.rot);
        const cosR = Math.cos(focusedExhibit.rot);

        gx = focusedExhibit.x + sinR * (dist + 0.05) + cosR * sideOffset;
        gz = focusedExhibit.z + cosR * (dist + 0.05) - sinR * sideOffset;
        gy = focusedExhibit.y - (isLandscape ? 0 : 0.45 * focusedExhibit.h);
        lx = focusedExhibit.x + cosR * sideOffset;
        lz = focusedExhibit.z - sinR * sideOffset;
        ly = gy;
        camSpeed = 3.4;

        if (
          arrivedFocusId !== focusedExhibit.id &&
          Math.hypot(camera.position.x - gx, camera.position.z - gz) < 0.1
        ) {
          arrivedFocusId = focusedExhibit.id;
          setExhibitionState({ detail: true });
        }
      } else {
        arrivedFocusId = null;
      }

      camera.position.set(
        damp(camera.position.x, gx, camSpeed, dt),
        damp(camera.position.y, gy, camSpeed, dt),
        damp(camera.position.z, gz, camSpeed, dt)
      );
      curLook.set(
        damp(curLook.x, lx, camSpeed, dt),
        damp(curLook.y, ly, camSpeed, dt),
        damp(curLook.z, lz, camSpeed, dt)
      );
      camera.lookAt(curLook);

      // Room & lighting interpolation
      const currentRoom = findRoomAt(camera.position.x, camera.position.z);
      if (currentRoom.id !== lastRoomId) {
        lastRoomId = currentRoom.id;
        setExhibitionState({ room: currentRoom.id });
      }
      const targetAge = ROOM_META[currentRoom.id]?.age ?? 0;
      lightAge.value = damp(lightAge.value, targetAge, 3.0, dt);

      const s = THREE.MathUtils.clamp(lightAge.value, 0, ROOM_LIGHT_PALETTES.length - 1.001);
      const i0 = Math.floor(s);
      const frac = s - i0;
      const p0 = ROOM_LIGHT_PALETTES[i0];
      const p1 = ROOM_LIGHT_PALETTES[i0 + 1];

      skyCol.lerpColors(p0.sky, p1.sky, frac);
      groundCol.lerpColors(p0.ground, p1.ground, frac);
      keyCol.lerpColors(p0.key, p1.key, frac);
      bgCol.lerpColors(p0.bg, p1.bg, frac);

      hemiLight.color.copy(skyCol);
      hemiLight.groundColor.copy(groundCol);
      hemiLight.intensity = p0.hemi + (p1.hemi - p0.hemi) * frac;
      keyLight.color.copy(keyCol);
      keyLight.intensity = p0.keyI + (p1.keyI - p0.keyI) * frac;
      if (scene.background instanceof THREE.Color) scene.background.copy(bgCol);
      if (scene.fog instanceof THREE.Fog) {
        scene.fog.color.copy(bgCol);
        scene.fog.near = p0.fog[0] + (p1.fog[0] - p0.fog[0]) * frac;
        scene.fog.far = p0.fog[1] + (p1.fog[1] - p0.fog[1]) * frac;
      }

      // Hover lift on exhibits
      exhibitHoverGroups.forEach((grp, id) => {
        const targetZ = ui.hover === id ? 0.055 : 0;
        grp.position.z = damp(grp.position.z, targetZ, 10, dt);
      });

      // Bench hover tint
      if (benchMesh && benchMesh.material instanceof THREE.MeshStandardMaterial) {
        benchMesh.material.color.set(ui.hover === 'bench' ? '#ffffff' : '#efeae2');
      }

      // Animate gears
      gearMeshes.forEach((g) => {
        g.mesh.rotation.z += g.speed * dt;
      });

      // Flicker shared lantern light on nearest lantern & bulb opacities
      let nearestLantern = lanternRefs[0];
      let bestDistSq = Infinity;
      lanternRefs.forEach((l) => {
        const flicker =
          0.84 +
          0.06 * Math.sin(8.5 * elapsed + l.phase) +
          0.05 * Math.sin(21 * elapsed + l.phase) +
          0.05 * Math.sin(3.1 * elapsed);
        l.glow.opacity = 0.78 + 0.22 * flicker;
        const dSq = l.pos.distanceToSquared(camera.position);
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          nearestLantern = l;
        }
      });
      if (nearestLantern) {
        activeLanternLight.position.copy(nearestLantern.pos);
        const fade = Math.max(0, 1 - bestDistSq / 320);
        activeLanternLight.intensity = 5.2 * fade;
      }

      // Update ribbon & GPU dust mote shaders
      ribbonMat.uniforms.uTime.value = elapsed;
      ribbonMat.uniforms.uHead.value = u;
      moteMat.uniforms.uTime.value = elapsed;

      if (!motionRefs.scrolledPastGallery) {
        renderer.render(scene, camera);
      }

      if (isSoftwareGl) {
        const gl = renderer.getContext() as WebGL2RenderingContext;
        if (gl && typeof gl.fenceSync === 'function') {
          const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
          gl.flush();
          const poll = () => {
            const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
            if (status === gl.UNSIGNALED) {
              frameId = window.setTimeout(poll, 5);
            } else {
              if (sync) gl.deleteSync(sync);
              frameId = window.setTimeout(() => {
                frameId = requestAnimationFrame(animate);
              }, 70);
            }
          };
          frameId = window.setTimeout(poll, 5);
        } else {
          frameId = window.setTimeout(() => {
            frameId = requestAnimationFrame(animate);
          }, 70);
        }
      } else {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);

      disposables.forEach((d) => {
        try {
          d.dispose();
        } catch {
          // ignore
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-full h-full overflow-hidden pointer-events-auto"
      aria-hidden="true"
    />
  );
}
