import * as THREE from 'three';
import { FeatureWall, ROOM_META } from '../../data/exhibitionData';

function makeRng(seedStr: string) {
  let h = 0x6a09e667 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 0xcc9e2d51);
    h = (h << 13) | (h >>> 19);
  }
  let state = h >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t ^ (t + Math.imul(t ^ (t >>> 7), 61 | t))) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  return [c, ctx];
}

function addGrain(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rng: () => number,
  amount = 10
) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rng() - 0.5) * amount;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

function drawSpacedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number
) {
  let cursor = x;
  for (const ch of text) {
    ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + spacing;
  }
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const out: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      out.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) out.push(line);
  return out;
}

const imagePromiseCache = new Map<string, Promise<HTMLImageElement>>();

export function loadImage(src: string): Promise<HTMLImageElement> {
  if (!imagePromiseCache.has(src)) {
    imagePromiseCache.set(
      src,
      new Promise((resolve, reject) => {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load ${src}`));
        img.src = src;
      })
    );
  }
  return imagePromiseCache.get(src)!;
}

export function toCanvasTexture(
  canvas: HTMLCanvasElement,
  anisotropy = 2,
  repeat?: [number, number]
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
  } else {
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
  }
  tex.needsUpdate = true;
  return tex;
}

export async function createFramedPhotoCanvas(
  src: string,
  title: string,
  isHeroWide = false
): Promise<HTMLCanvasElement> {
  const w = isHeroWide ? 1024 : 720;
  const h = isHeroWide ? 400 : 496;
  const [canvas, ctx] = createCanvas(w, h);

  // Warm museum archival mat backdrop
  ctx.fillStyle = '#f5efe6';
  ctx.fillRect(0, 0, w, h);

  try {
    const img = await loadImage(src);
    const pad = isHeroWide ? 24 : 36;
    const innerW = w - pad * 2;
    const innerH = h - pad * 2;
    const scale = Math.max(innerW / img.width, innerH / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    const dx = pad + (innerW - dw) / 2;
    const dy = pad + (innerH - dh) / 2;

    ctx.save();
    ctx.beginPath();
    ctx.rect(pad, pad, innerW, innerH);
    ctx.clip();
    ctx.filter = 'contrast(1.06) saturate(1.12) brightness(1.02)';
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.filter = 'none';

    // Subtle nostalgic warm vignette at bottom for hero painting
    if (isHeroWide) {
      const grad = ctx.createLinearGradient(0, pad + innerH * 0.45, 0, pad + innerH);
      grad.addColorStop(0, 'rgba(20, 6, 10, 0)');
      grad.addColorStop(1, 'rgba(20, 6, 10, 0.72)');
      ctx.fillStyle = grad;
      ctx.fillRect(pad, pad, innerW, innerH);

      ctx.fillStyle = '#ffcf8a';
      ctx.font = '600 14px "JetBrains Mono", monospace';
      drawSpacedText(ctx, 'GRIZZLY VIDYALYA · TELAIYA DAM', pad + 26, h - 78, 3);

      ctx.fillStyle = '#ffffff';
      ctx.font = '700 32px "Cinzel", Georgia, serif';
      ctx.fillText('THE GATEWAY TO MEMORIES', pad + 24, h - 40);
    }
    ctx.restore();

    // Inner brass hairline inset
    ctx.strokeStyle = 'rgba(184, 134, 47, 0.45)';
    ctx.lineWidth = 2;
    ctx.strokeRect(pad, pad, innerW, innerH);
  } catch {
    ctx.fillStyle = '#5a0e22';
    ctx.fillRect(24, 24, w - 48, h - 48);
    ctx.fillStyle = '#ffcf8a';
    ctx.textAlign = 'center';
    ctx.font = '700 32px "Cinzel", Georgia, serif';
    ctx.fillText(title, w / 2, h / 2);
  }

  return canvas;
}

export function createLabelPlaqueCanvas(
  kicker: string,
  title: string,
  accent: string
): HTMLCanvasElement {
  const w = 900;
  const h = 240;
  const [canvas, ctx] = createCanvas(w, h);

  ctx.fillStyle = accent;
  ctx.font = '500 36px "JetBrains Mono", monospace';
  ctx.fillText(kicker.toUpperCase(), 0, 56);

  ctx.fillStyle = '#ffffff';
  const upper = title.toUpperCase();
  let size = 58;
  while (size > 34) {
    ctx.font = `700 ${size}px "Cinzel", Georgia, serif`;
    if (ctx.measureText(upper).width + upper.length * 3 <= w - 16) break;
    size -= 2;
  }
  drawSpacedText(ctx, upper, 0, 146, 3);
  return canvas;
}

export function createChapterTextCanvas(
  n: string,
  title: string,
  lines: string[],
  accent: string,
  era: string,
  isBig = false
): HTMLCanvasElement {
  const w = 1600;
  const h = 1120;
  const [canvas, ctx] = createCanvas(w, h);

  ctx.shadowColor = accent;
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#f8f4ee';
  const left = w * 0.14;

  ctx.font = '500 28px "JetBrains Mono", monospace';
  ctx.fillStyle = accent;
  const header = n ? `CHAPTER ${n} · ${era.toUpperCase()}` : era.toUpperCase();
  drawSpacedText(ctx, header, left, h * 0.27, 3);

  ctx.fillStyle = '#ffffff';
  const titleSize = isBig ? 84 : 70;
  ctx.font = `700 ${titleSize}px "Cinzel", Georgia, serif`;
  const words = title.toUpperCase().split(' ');
  const mid = Math.ceil(words.length / 2);
  const titleLines =
    words.length > 2
      ? [words.slice(0, mid).join(' '), words.slice(mid).join(' ')]
      : [words.join(' ')];

  titleLines.forEach((tl, idx) => {
    drawSpacedText(ctx, tl, left, h * 0.27 + 108 + idx * (titleSize * 1.2), 4);
  });

  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255, 245, 232, 0.9)';
  ctx.font = `400 ${isBig ? 34 : 30}px "Plus Jakarta Sans", sans-serif`;
  const startY = h * 0.27 + 120 + titleLines.length * (titleSize * 1.2) + 20;
  const colW = w * 0.34;
  lines.forEach((para, idx) => {
    const wrapped = wrapLines(ctx, para, colW);
    wrapped.forEach((wl, lineIdx) => {
      ctx.fillText(wl, left + idx * (colW + w * 0.045), startY + lineIdx * 46);
    });
  });

  return canvas;
}

export async function createFeatureWallCanvas(fw: FeatureWall): Promise<HTMLCanvasElement> {
  const w = 1024;
  const h = 538;
  const [canvas, ctx] = createCanvas(w, h);
  const rng = makeRng(`fw:${fw.id}`);
  const meta = ROOM_META[fw.room];
  const accent = fw.accent ?? meta.accent;

  // Rich atmospheric backdrop per mode
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  if (fw.mode === 'gravity') {
    grad.addColorStop(0, '#1e0810');
    grad.addColorStop(0.55, '#4c1424');
    grad.addColorStop(1, '#c87d44');
  } else if (fw.mode === 'waves') {
    grad.addColorStop(0, '#140812');
    grad.addColorStop(0.6, '#3b1526');
    grad.addColorStop(1, '#b55638');
  } else if (fw.mode === 'orbit') {
    grad.addColorStop(0, '#0f0c24');
    grad.addColorStop(0.6, '#36234e');
    grad.addColorStop(1, '#c97c6b');
  } else if (fw.mode === 'neural') {
    grad.addColorStop(0, '#06101c');
    grad.addColorStop(0.55, '#0f283d');
    grad.addColorStop(1, '#266982');
  } else {
    grad.addColorStop(0, '#1b1026');
    grad.addColorStop(0.6, '#43284a');
    grad.addColorStop(1, '#d89b6a');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Stars / warm dust motes
  for (let i = 0; i < 160; i++) {
    const sx = rng() * w;
    const sy = rng() * h * 0.72;
    ctx.fillStyle = `rgba(255, 240, 220, ${0.2 + rng() * 0.55})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 0.8 + rng() * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Horizon silhouette / Telaiya Dam hills
  ctx.fillStyle = 'rgba(14, 5, 10, 0.72)';
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let i = 0; i <= 40; i++) {
    const px = (i / 40) * w;
    const py =
      h * 0.76 -
      Math.sin(i * 0.35 + rng() * 0.2) * 32 -
      Math.exp(-Math.pow((px - w * 0.65) / (w * 0.28), 2)) * 90;
    ctx.lineTo(px, py);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  // Bottom dark contrast scrim for typography
  const scrim = ctx.createLinearGradient(0, h * 0.35, 0, h);
  scrim.addColorStop(0, 'rgba(8, 4, 8, 0)');
  scrim.addColorStop(1, 'rgba(8, 4, 8, 0.88)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, w, h);

  // Typography centered in safe viewport region
  const safeW = w * fw.safe;
  const padX = (w - safeW) / 2 + 34;

  ctx.fillStyle = accent;
  ctx.font = '600 18px "JetBrains Mono", monospace';
  drawSpacedText(ctx, `CHAPTER ${fw.chapter} · ${meta.era.toUpperCase()}`, padX, h - 142, 3);
  ctx.fillRect(padX, h - 130, 74, 2);

  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur = 10;
  ctx.font = '700 44px "Cinzel", Georgia, serif';
  drawSpacedText(ctx, fw.title, padX, h - 78, 3);
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(255, 244, 230, 0.88)';
  ctx.font = '400 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(fw.caption, padX, h - 40);

  return canvas;
}

export function createSurfaceCanvas(
  kind: 'walnut' | 'maroon-plaster' | 'terrazzo' | 'concrete-grid' | 'planks' | 'future-floor'
): HTMLCanvasElement {
  const size = 256;
  const [canvas, ctx] = createCanvas(size, size);
  const rng = makeRng(`surf:${kind}`);

  if (kind === 'walnut') {
    for (let i = 0; i < 6; i++) {
      const x = (i * size) / 6;
      const w = size / 6;
      const base = 48 + Math.floor(rng() * 14);
      ctx.fillStyle = `rgb(${base + 24}, ${base + 4}, ${base - 14})`;
      ctx.fillRect(x, 0, w, size);
      for (let g = 0; g < 24; g++) {
        ctx.strokeStyle = `rgba(25, 8, 6, ${0.14 + rng() * 0.16})`;
        ctx.lineWidth = 1 + rng() * 1.4;
        const gx = x + rng() * w;
        ctx.beginPath();
        for (let y = 0; y <= size; y += 16) {
          ctx.lineTo(gx + Math.sin(y / 45 + g) * 3, y);
        }
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(x, 0, 2, size);
    }
    // Brass inlaid dado rail
    const railY = size * 0.62;
    const brass = ctx.createLinearGradient(0, railY, 0, railY + 18);
    brass.addColorStop(0, '#f3d488');
    brass.addColorStop(0.5, '#b8862f');
    brass.addColorStop(1, '#5e3f12');
    ctx.fillStyle = brass;
    ctx.fillRect(0, railY, size, 18);
    addGrain(ctx, size, size, rng, 7);
    return canvas;
  }

  if (kind === 'planks') {
    for (let row = 0; row < 8; row++) {
      const y = (row * size) / 8;
      const h = size / 8;
      let x = -rng() * 180;
      while (x < size) {
        const len = 180 + rng() * 220;
        const b = 56 + Math.floor(rng() * 16);
        ctx.fillStyle = `rgb(${b + 30}, ${b + 12}, ${b - 6})`;
        ctx.fillRect(x, y, len, h);
        ctx.fillStyle = 'rgba(0,0,0,0.42)';
        ctx.fillRect(x, y, 2, h);
        x += len;
      }
      ctx.fillStyle = 'rgba(0,0,0,0.48)';
      ctx.fillRect(0, y, size, 2);
    }
    addGrain(ctx, size, size, rng, 8);
    return canvas;
  }

  if (kind === 'maroon-plaster') {
    ctx.fillStyle = '#2d121a';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 120; i++) {
      const rx = rng() * size;
      const ry = rng() * size;
      const rad = 20 + rng() * 90;
      const g = ctx.createRadialGradient(rx, ry, 0, rx, ry, rad);
      g.addColorStop(0, rng() > 0.5 ? 'rgba(128, 20, 48, 0.14)' : 'rgba(18, 5, 10, 0.18)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(rx - rad, ry - rad, rad * 2, rad * 2);
    }
    addGrain(ctx, size, size, rng, 9);
    return canvas;
  }

  if (kind === 'terrazzo') {
    ctx.fillStyle = '#d8d0c4';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 160; i++) {
      const rx = rng() * size;
      const ry = rng() * size;
      const rad = 18 + rng() * 110;
      const g = ctx.createRadialGradient(rx, ry, 0, rx, ry, rad);
      g.addColorStop(0, rng() > 0.5 ? 'rgba(255,252,246,0.09)' : 'rgba(110,95,85,0.05)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(rx - rad, ry - rad, rad * 2, rad * 2);
    }
    addGrain(ctx, size, size, rng, 8);
    return canvas;
  }

  if (kind === 'concrete-grid') {
    ctx.fillStyle = '#1c2430';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(130, 215, 255, 0.18)';
    ctx.lineWidth = 2;
    const step = size / 4;
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(i * step, 0);
      ctx.lineTo(i * step, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * step);
      ctx.lineTo(size, i * step);
      ctx.stroke();
    }
    addGrain(ctx, size, size, rng, 6);
    return canvas;
  }

  // future-floor
  ctx.fillStyle = '#e7edf2';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(90, 200, 255, 0.5)';
  ctx.lineWidth = 2.5;
  for (let y = size / 8; y < size; y += size / 4) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 1;
  for (let x = 0; x < size; x += size / 8) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
  addGrain(ctx, size, size, rng, 4);
  return canvas;
}

export function createBrassGearCanvas(teeth: number, seed: string): HTMLCanvasElement {
  const size = 256;
  const [canvas, ctx] = createCanvas(size, size);
  const rng = makeRng(seed);
  const c = size / 2;
  const outer = size * 0.46;
  const inner = outer * 0.86;

  ctx.beginPath();
  for (let i = 0; i < teeth * 2; i++) {
    const a1 = (i / (teeth * 2)) * Math.PI * 2;
    const a2 = ((i + 1) / (teeth * 2)) * Math.PI * 2;
    const rad = i % 2 ? inner : outer;
    ctx.lineTo(c + Math.cos(a1 + 0.04) * rad, c + Math.sin(a1 + 0.04) * rad);
    ctx.lineTo(c + Math.cos(a2 - 0.04) * rad, c + Math.sin(a2 - 0.04) * rad);
  }
  ctx.closePath();

  const spokes = 4 + Math.floor(rng() * 3);
  for (let i = 0; i < spokes; i++) {
    const t1 = (i / spokes) * Math.PI * 2;
    const t2 = ((i + 1) / spokes) * Math.PI * 2;
    ctx.moveTo(c + Math.cos(t1 + 0.22) * outer * 0.28, c + Math.sin(t1 + 0.22) * outer * 0.28);
    ctx.arc(c, c, outer * 0.7, t1 + 0.16, t2 - 0.16);
    ctx.arc(c, c, outer * 0.28, t2 - 0.22, t1 + 0.22, true);
    ctx.closePath();
  }

  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#f7d98a');
  grad.addColorStop(0.45, '#b8862f');
  grad.addColorStop(1, '#5e3d10');
  ctx.fillStyle = grad;
  ctx.fill('evenodd');

  ctx.strokeStyle = 'rgba(60, 36, 6, 0.8)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#3b2708';
  ctx.beginPath();
  ctx.arc(c, c, outer * 0.09, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

export async function createBelvedereVistaCanvas(): Promise<HTMLCanvasElement> {
  const w = 1024;
  const h = 512;
  const [canvas, ctx] = createCanvas(w, h);
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#0d0918');
  sky.addColorStop(0.55, '#3b1c36');
  sky.addColorStop(1, '#a85a4c');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  try {
    const img = await loadImage('/innerview.png');
    ctx.save();
    ctx.globalAlpha = 0.28;
    const sc = Math.max(w / img.width, h / img.height);
    ctx.drawImage(img, (w - img.width * sc) / 2, (h - img.height * sc) / 2, img.width * sc, img.height * sc);
    ctx.restore();
  } catch {
    // fallback gradient is already drawn
  }

  const rng = makeRng('belvedere-stars');
  for (let i = 0; i < 160; i++) {
    const sy = rng() * h * 0.75;
    ctx.fillStyle = `rgba(255, 244, 224, ${0.25 + rng() * 0.65})`;
    ctx.beginPath();
    ctx.arc(rng() * w, sy, 0.6 + rng() * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, w * 0.65);
  vignette.addColorStop(0, 'rgba(13, 9, 24, 0.2)');
  vignette.addColorStop(1, 'rgba(13, 9, 24, 0.75)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#ffcf8a';
  ctx.textAlign = 'center';
  ctx.font = '500 16px "JetBrains Mono", monospace';
  ctx.fillText('TELAIYA DAM · KODERMA', w / 2, 150);

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 38px "Cinzel", Georgia, serif';
  ctx.fillText('WHERE OUR ROOTS BEGAN', w / 2, 206);

  ctx.fillStyle = 'rgba(255, 245, 235, 0.85)';
  ctx.font = '400 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    'Click the stone bench below to pause and look back at campus.',
    w / 2,
    252
  );

  return canvas;
}

export async function createHoloPlateCanvas(
  label: string,
  sub: string,
  accent: string
): Promise<HTMLCanvasElement> {
  const w = 800;
  const h = 440;
  const [canvas, ctx] = createCanvas(w, h);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.strokeRect(18, 18, w - 36, h - 36);

  try {
    const logo = await loadImage('/gvlogo.png');
    ctx.save();
    ctx.globalAlpha = 0.85;
    const s = 110;
    ctx.drawImage(logo, w / 2 - s / 2, 54, s, s);
    ctx.restore();
  } catch {
    // ignore
  }

  ctx.fillStyle = accent;
  ctx.textAlign = 'center';
  ctx.font = '600 26px "JetBrains Mono", monospace';
  ctx.fillText(sub.toUpperCase(), w / 2, 240);

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 48px "Cinzel", Georgia, serif';
  ctx.fillText(label.toUpperCase(), w / 2, 315);
  return canvas;
}

export function createDropShadowCanvas(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(256, 256);
  ctx.filter = 'blur(18px)';
  ctx.fillStyle = 'rgba(0,0,0,1)';
  ctx.fillRect(52, 52, 152, 152);
  return canvas;
}

export function createSpotlightBeamCanvas(): HTMLCanvasElement {
  const w = 256;
  const h = 512;
  const [canvas, ctx] = createCanvas(w, h);
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(255, 240, 210, 0.9)');
  grad.addColorStop(0.55, 'rgba(255, 240, 210, 0.35)');
  grad.addColorStop(1, 'rgba(255, 240, 210, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(w * 0.38, 0);
  ctx.lineTo(w * 0.62, 0);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  const [blurred, bCtx] = createCanvas(w, h);
  bCtx.filter = 'blur(18px)';
  bCtx.drawImage(canvas, 0, 0);
  return blurred;
}
