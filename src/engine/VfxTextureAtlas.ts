import { Texture } from 'pixi.js';

export type VfxTexKey =
  | 'softGlow'
  | 'crescentSlash'
  | 'impactFlare'
  | 'energyBeam'
  | 'skyColumn'
  | 'magicCircle'
  | 'hexDome'
  | 'smokePuff'
  | 'fireWisp'
  | 'iceCrystal'
  | 'petalLeaf'
  | 'groundCrack'
  | 'lightningBolt'
  | 'chainLink'
  | 'arrowStreak'
  | 'ringHalo';

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);
  return [c, ctx];
}

function buildSoftGlow(): Texture {
  const [c, ctx] = makeCanvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  g.addColorStop(0.0, 'rgba(255,255,255,1)');
  g.addColorStop(0.22, 'rgba(255,255,255,0.88)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.34)');
  g.addColorStop(0.8, 'rgba(255,255,255,0.08)');
  g.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return Texture.from(c);
}

function buildRingHalo(): Texture {
  const [c, ctx] = makeCanvas(256, 256);
  const g = ctx.createRadialGradient(128, 128, 74, 128, 128, 124);
  g.addColorStop(0.0, 'rgba(255,255,255,0)');
  g.addColorStop(0.38, 'rgba(255,255,255,0.16)');
  g.addColorStop(0.68, 'rgba(255,255,255,0.92)');
  g.addColorStop(0.82, 'rgba(255,255,255,1)');
  g.addColorStop(0.92, 'rgba(255,255,255,0.35)');
  g.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(128, 128, 124, 0, Math.PI * 2);
  ctx.fill();
  return Texture.from(c);
}

/**
 * True tapered anime crescent blade slash — razor-sharp pointed tips, glowing curved motion-smear body.
 */
function buildCrescentSlash(): Texture {
  const [c, ctx] = makeCanvas(256, 256);
  ctx.save();
  ctx.translate(128, 128);

  // Soft outer smear glow
  ctx.save();
  ctx.filter = 'blur(8px)';
  ctx.beginPath();
  ctx.moveTo(10, -108);
  ctx.bezierCurveTo(108, -72, 118, 72, 10, 108);
  ctx.bezierCurveTo(72, 58, 72, -58, 10, -108);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  ctx.fill();
  ctx.restore();

  // Main sharp tapered crescent body
  const grad = ctx.createLinearGradient(0, -110, 112, 0);
  grad.addColorStop(0, 'rgba(255,255,255,0.2)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.94)');
  grad.addColorStop(0.75, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0.92)');

  ctx.beginPath();
  ctx.moveTo(8, -112);
  ctx.bezierCurveTo(114, -74, 122, 74, 8, 112);
  ctx.bezierCurveTo(78, 60, 78, -60, 8, -112);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Inner trailing wind streak
  ctx.beginPath();
  ctx.moveTo(-12, -88);
  ctx.bezierCurveTo(64, -56, 68, 56, -12, 88);
  ctx.bezierCurveTo(46, 46, 46, -46, -12, -88);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  ctx.fill();

  // Razor-bright outer leading edge
  ctx.beginPath();
  ctx.moveTo(14, -106);
  ctx.bezierCurveTo(104, -68, 110, 68, 14, 106);
  ctx.strokeStyle = 'rgba(255,255,255,1)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.restore();
  return Texture.from(c);
}

/**
 * Crisp anisotropic anime starburst impact flare (elongated razor rays + soft radial core).
 */
function buildImpactFlare(): Texture {
  const [c, ctx] = makeCanvas(256, 256);
  ctx.save();
  ctx.translate(128, 128);

  const core = ctx.createRadialGradient(0, 0, 2, 0, 0, 76);
  core.addColorStop(0, 'rgba(255,255,255,1)');
  core.addColorStop(0.3, 'rgba(255,255,255,0.65)');
  core.addColorStop(0.7, 'rgba(255,255,255,0.12)');
  core.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = core;
  ctx.fillRect(-90, -90, 180, 180);

  const drawRay = (len: number, halfW: number, rot: number, alpha: number) => {
    ctx.save();
    ctx.rotate(rot);
    const rg = ctx.createLinearGradient(-len, 0, len, 0);
    rg.addColorStop(0, 'rgba(255,255,255,0)');
    rg.addColorStop(0.35, `rgba(255,255,255,${alpha * 0.7})`);
    rg.addColorStop(0.5, `rgba(255,255,255,${alpha})`);
    rg.addColorStop(0.65, `rgba(255,255,255,${alpha * 0.7})`);
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(-len, 0);
    ctx.quadraticCurveTo(0, -halfW, len, 0);
    ctx.quadraticCurveTo(0, halfW, -len, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  drawRay(122, 13, 0, 1);
  drawRay(108, 11, Math.PI / 2, 0.95);
  drawRay(76, 7, Math.PI / 4, 0.72);
  drawRay(76, 7, -Math.PI / 4, 0.72);

  ctx.restore();
  return Texture.from(c);
}

/**
 * Smooth feathered horizontal plasma/wind energy ribbon with tapered glowing core.
 */
function buildEnergyBeam(): Texture {
  const [c, ctx] = makeCanvas(256, 64);
  const vg = ctx.createLinearGradient(0, 0, 0, 64);
  vg.addColorStop(0.0, 'rgba(255,255,255,0)');
  vg.addColorStop(0.24, 'rgba(255,255,255,0.45)');
  vg.addColorStop(0.5, 'rgba(255,255,255,1)');
  vg.addColorStop(0.76, 'rgba(255,255,255,0.45)');
  vg.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = vg;
  ctx.fillRect(10, 0, 236, 64);

  // Softly taper left/right caps so beam never ends with a hard box corner
  ctx.globalCompositeOperation = 'destination-in';
  const hg = ctx.createLinearGradient(0, 0, 256, 0);
  hg.addColorStop(0.0, 'rgba(255,255,255,0)');
  hg.addColorStop(0.08, 'rgba(255,255,255,1)');
  hg.addColorStop(0.9, 'rgba(255,255,255,1)');
  hg.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = hg;
  ctx.fillRect(0, 0, 256, 64);

  return Texture.from(c);
}

/**
 * Soft feathered celestial/flame skyfall column (replaces blocky .rect() completely!).
 */
function buildSkyColumn(): Texture {
  const [c, ctx] = makeCanvas(192, 512);

  // Horizontal Gaussian soft light body
  const hg = ctx.createLinearGradient(0, 0, 192, 0);
  hg.addColorStop(0.0, 'rgba(255,255,255,0)');
  hg.addColorStop(0.18, 'rgba(255,255,255,0.22)');
  hg.addColorStop(0.36, 'rgba(255,255,255,0.72)');
  hg.addColorStop(0.5, 'rgba(255,255,255,1)');
  hg.addColorStop(0.64, 'rgba(255,255,255,0.72)');
  hg.addColorStop(0.82, 'rgba(255,255,255,0.22)');
  hg.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = hg;
  ctx.fillRect(0, 0, 192, 512);

  // Add subtle inner diagonal energy wisps
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    const x0 = 52 + i * 16;
    ctx.beginPath();
    ctx.moveTo(x0, 512);
    ctx.bezierCurveTo(x0 - 18, 340, x0 + 18, 170, x0, 0);
    ctx.stroke();
  }

  // Smooth fade at sky top and rounded glowing impact foot at bottom
  ctx.globalCompositeOperation = 'destination-in';
  const vg = ctx.createLinearGradient(0, 0, 0, 512);
  vg.addColorStop(0.0, 'rgba(255,255,255,0)');
  vg.addColorStop(0.18, 'rgba(255,255,255,0.85)');
  vg.addColorStop(0.92, 'rgba(255,255,255,1)');
  vg.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, 192, 512);

  return Texture.from(c);
}

/**
 * Ornate arcane astronomical magic circle seal for ground projection.
 */
function buildMagicCircle(): Texture {
  const [c, ctx] = makeCanvas(256, 256);
  ctx.save();
  ctx.translate(128, 128);

  // Subtle ambient wash
  const bg = ctx.createRadialGradient(0, 0, 16, 0, 0, 120);
  bg.addColorStop(0, 'rgba(255,255,255,0.26)');
  bg.addColorStop(0.65, 'rgba(255,255,255,0.12)');
  bg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(0, 0, 120, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(0, 0, 114, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, 0, 96, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, 58, 0, Math.PI * 2);
  ctx.stroke();

  // Inscribed 8-point celestial star (2 rotated squares)
  for (let rot = 0; rot < 2; rot++) {
    ctx.save();
    ctx.rotate((rot * Math.PI) / 4);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(-66, -66, 132, 132);
    ctx.restore();
  }

  // 16 tick marks & 8 glowing rune orbs between outer rings
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI * 2) / 16;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 96, Math.sin(a) * 96);
    ctx.lineTo(Math.cos(a) * 114, Math.sin(a) * 114);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = i % 2 === 0 ? 2.5 : 1.2;
    ctx.stroke();
    if (i % 2 === 0) {
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 105, Math.sin(a) * 105, 4.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,1)';
      ctx.fill();
    }
  }

  ctx.restore();
  return Texture.from(c);
}

/**
 * Hexagonal honeycomb energy barrier dome (Garrick Fortress of Dawn & Titus Prism Aegis).
 */
function buildHexDome(): Texture {
  const [c, ctx] = makeCanvas(256, 256);
  ctx.save();
  ctx.translate(128, 128);

  // Spherical dome translucent shell
  const dg = ctx.createRadialGradient(0, -18, 12, 0, 0, 122);
  dg.addColorStop(0.0, 'rgba(255,255,255,0.08)');
  dg.addColorStop(0.62, 'rgba(255,255,255,0.22)');
  dg.addColorStop(0.88, 'rgba(255,255,255,0.88)');
  dg.addColorStop(0.95, 'rgba(255,255,255,1)');
  dg.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = dg;
  ctx.beginPath();
  ctx.arc(0, 0, 122, 0, Math.PI * 2);
  ctx.fill();

  // Clip honeycomb hex grid inside sphere
  ctx.beginPath();
  ctx.arc(0, 0, 114, 0, Math.PI * 2);
  ctx.clip();

  ctx.strokeStyle = 'rgba(255,255,255,0.68)';
  ctx.lineWidth = 2;
  const r = 20;
  const dx = r * 1.5;
  const dy = r * Math.sqrt(3);
  for (let gx = -140; gx <= 140; gx += dx) {
    const colIdx = Math.round(gx / dx);
    for (let gy = -140; gy <= 140; gy += dy) {
      const cy = gy + (colIdx % 2 !== 0 ? dy / 2 : 0);
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3;
        const px = gx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.restore();
  return Texture.from(c);
}

function buildSmokePuff(): Texture {
  const [c, ctx] = makeCanvas(128, 128);
  const blobs = [
    [64, 64, 44, 0.72],
    [46, 56, 34, 0.56],
    [82, 58, 32, 0.54],
    [56, 78, 34, 0.5],
    [76, 76, 30, 0.45],
  ];
  for (const [bx, by, br, ba] of blobs) {
    const g = ctx.createRadialGradient(bx, by, 4, bx, by, br);
    g.addColorStop(0, `rgba(255,255,255,${ba})`);
    g.addColorStop(0.55, `rgba(255,255,255,${ba * 0.45})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  }
  return Texture.from(c);
}

function buildFireWisp(): Texture {
  const [c, ctx] = makeCanvas(128, 128);
  ctx.save();
  ctx.translate(64, 72);
  ctx.filter = 'blur(3px)';
  ctx.beginPath();
  ctx.moveTo(0, -64);
  ctx.bezierCurveTo(34, -22, 42, 24, 0, 44);
  ctx.bezierCurveTo(-42, 24, -34, -22, 0, -64);
  ctx.closePath();
  const fg = ctx.createRadialGradient(0, 12, 4, 0, -4, 52);
  fg.addColorStop(0, 'rgba(255,255,255,1)');
  fg.addColorStop(0.42, 'rgba(255,240,200,0.92)');
  fg.addColorStop(0.75, 'rgba(255,190,120,0.48)');
  fg.addColorStop(1, 'rgba(255,140,80,0)');
  ctx.fillStyle = fg;
  ctx.fill();
  ctx.restore();
  return Texture.from(c);
}

function buildIceCrystal(): Texture {
  const [c, ctx] = makeCanvas(128, 128);
  ctx.save();
  ctx.translate(64, 64);
  ctx.beginPath();
  ctx.moveTo(0, -58);
  ctx.lineTo(24, -14);
  ctx.lineTo(16, 48);
  ctx.lineTo(0, 58);
  ctx.lineTo(-16, 48);
  ctx.lineTo(-24, -14);
  ctx.closePath();
  const g = ctx.createLinearGradient(-24, -56, 24, 56);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(220,245,255,0.9)');
  g.addColorStop(1, 'rgba(170,220,255,0.72)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,1)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Inner facet highlight lines
  ctx.beginPath();
  ctx.moveTo(0, -58);
  ctx.lineTo(0, 58);
  ctx.moveTo(-24, -14);
  ctx.lineTo(24, -14);
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
  return Texture.from(c);
}

function buildPetalLeaf(): Texture {
  const [c, ctx] = makeCanvas(64, 64);
  ctx.save();
  ctx.translate(32, 32);
  ctx.beginPath();
  ctx.moveTo(0, -26);
  ctx.bezierCurveTo(20, -10, 18, 14, 0, 26);
  ctx.bezierCurveTo(-18, 14, -20, -10, 0, -26);
  ctx.closePath();
  const g = ctx.createRadialGradient(-3, -4, 2, 0, 0, 26);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.65, 'rgba(255,255,255,0.85)');
  g.addColorStop(1, 'rgba(255,255,255,0.2)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  return Texture.from(c);
}

function buildGroundCrack(): Texture {
  const [c, ctx] = makeCanvas(256, 256);
  ctx.save();
  ctx.translate(128, 128);

  // Scorched glowing magma crater core
  const cg = ctx.createRadialGradient(0, 0, 6, 0, 0, 96);
  cg.addColorStop(0, 'rgba(255,255,255,0.95)');
  cg.addColorStop(0.28, 'rgba(255,255,255,0.42)');
  cg.addColorStop(0.7, 'rgba(255,255,255,0.08)');
  cg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.arc(0, 0, 96, 0, Math.PI * 2);
  ctx.fill();

  // 9 radial jagged volcanic/tectonic fissure veins
  const branches = 9;
  for (let i = 0; i < branches; i++) {
    const baseAngle = (i * Math.PI * 2) / branches + (i % 2) * 0.14;
    let cx = 0;
    let cy = 0;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let seg = 1; seg <= 5; seg++) {
      const dist = seg * 23;
      const jitter = ((i * 17 + seg * 31) % 11 - 5) * 0.06;
      cx = Math.cos(baseAngle + jitter) * dist;
      cy = Math.sin(baseAngle + jitter) * dist;
      ctx.lineTo(cx, cy);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 4.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Forked side fissure
    ctx.beginPath();
    ctx.moveTo(cx * 0.55, cy * 0.55);
    ctx.lineTo(
      Math.cos(baseAngle + 0.35) * 95,
      Math.sin(baseAngle + 0.35) * 95,
    );
    ctx.lineWidth = 2.2;
    ctx.stroke();
  }
  ctx.restore();
  return Texture.from(c);
}

function buildLightningBolt(): Texture {
  const [c, ctx] = makeCanvas(256, 64);
  const pts: Array<[number, number]> = [
    [6, 32],
    [42, 20],
    [68, 42],
    [104, 16],
    [136, 44],
    [172, 18],
    [206, 38],
    [250, 32],
  ];

  // Outer electric aura
  ctx.save();
  ctx.filter = 'blur(5px)';
  ctx.beginPath();
  pts.forEach(([x, y], idx) => (idx === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();

  // Razor-sharp core bolt
  ctx.beginPath();
  pts.forEach(([x, y], idx) => (idx === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.strokeStyle = 'rgba(255,255,255,1)';
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Micro side sparks
  ctx.beginPath();
  ctx.moveTo(104, 16);
  ctx.lineTo(124, 6);
  ctx.moveTo(136, 44);
  ctx.lineTo(160, 56);
  ctx.lineWidth = 1.8;
  ctx.stroke();

  return Texture.from(c);
}

function buildChainLink(): Texture {
  const [c, ctx] = makeCanvas(256, 64);
  // Subtle fiery glow beneath chain
  const bg = ctx.createLinearGradient(0, 12, 0, 52);
  bg.addColorStop(0, 'rgba(255,255,255,0)');
  bg.addColorStop(0.5, 'rgba(255,255,255,0.45)');
  bg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 12, 256, 40);

  // Interlocking forged chain ovals
  ctx.strokeStyle = 'rgba(255,255,255,0.96)';
  ctx.lineWidth = 5;
  for (let x = 18; x <= 238; x += 28) {
    ctx.beginPath();
    ctx.ellipse(x, 32, 16, 9, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Center connector bars
  ctx.strokeStyle = 'rgba(255,255,255,1)';
  ctx.lineWidth = 4;
  for (let x = 32; x <= 224; x += 28) {
    ctx.beginPath();
    ctx.moveTo(x - 8, 32);
    ctx.lineTo(x + 8, 32);
    ctx.stroke();
  }
  return Texture.from(c);
}

function buildArrowStreak(): Texture {
  const [c, ctx] = makeCanvas(256, 48);
  // Long comet tail streak
  const tg = ctx.createLinearGradient(0, 24, 240, 24);
  tg.addColorStop(0.0, 'rgba(255,255,255,0)');
  tg.addColorStop(0.55, 'rgba(255,255,255,0.55)');
  tg.addColorStop(0.88, 'rgba(255,255,255,1)');
  tg.addColorStop(1.0, 'rgba(255,255,255,0.9)');
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.moveTo(0, 24);
  ctx.lineTo(222, 15);
  ctx.lineTo(254, 24);
  ctx.lineTo(222, 33);
  ctx.closePath();
  ctx.fill();

  // Sleek glowing arrowhead chevrons
  ctx.beginPath();
  ctx.moveTo(254, 24);
  ctx.lineTo(212, 8);
  ctx.lineTo(224, 24);
  ctx.lineTo(212, 40);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,1)';
  ctx.fill();

  return Texture.from(c);
}

export class VfxTextureAtlas {
  private static instance: Record<VfxTexKey, Texture> | null = null;

  public static get(): Record<VfxTexKey, Texture> {
    if (!this.instance) {
      this.instance = {
        softGlow: buildSoftGlow(),
        ringHalo: buildRingHalo(),
        crescentSlash: buildCrescentSlash(),
        impactFlare: buildImpactFlare(),
        energyBeam: buildEnergyBeam(),
        skyColumn: buildSkyColumn(),
        magicCircle: buildMagicCircle(),
        hexDome: buildHexDome(),
        smokePuff: buildSmokePuff(),
        fireWisp: buildFireWisp(),
        iceCrystal: buildIceCrystal(),
        petalLeaf: buildPetalLeaf(),
        groundCrack: buildGroundCrack(),
        lightningBolt: buildLightningBolt(),
        chainLink: buildChainLink(),
        arrowStreak: buildArrowStreak(),
      };
    }
    return this.instance;
  }
}
