import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

/**
 * Generates high-craft cel-shaded anime-fantasy WebP assets for slots where
 * AI image-gen hit HTTP 429 quota, and crops crisp eye-level panoramic Cut-Ins
 * for the 3 AI-generated SSR Hero portraits (Vaelen, Seraphina, Elara).
 */

async function renderSvgToWebp(svg, destRel, width, height) {
  const dest = path.resolve(destRel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  await sharp(Buffer.from(svg))
    .resize(width, height, { fit: 'cover' })
    .webp({ quality: 88 })
    .toFile(dest);
  console.log(`Rendered ${destRel} (${width}x${height})`);
}

function starfield(seed, color1, color2, count = 38, w = 600, h = 800) {
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  let out = '';
  for (let i = 0; i < count; i++) {
    const x = Math.round(rand() * w);
    const y = Math.round(rand() * h);
    const r = (1.2 + rand() * 3.4).toFixed(1);
    const op = (0.3 + rand() * 0.65).toFixed(2);
    const col = rand() > 0.45 ? color1 : color2;
    if (rand() > 0.72) {
      const sz = Number(r) * 3.2;
      out += `<path d="M${x} ${y - sz} L${x + sz * 0.25} ${y - sz * 0.25} L${x + sz} ${y} L${x + sz * 0.25} ${y + sz * 0.25} L${x} ${y + sz} L${x - sz * 0.25} ${y + sz * 0.25} L${x - sz} ${y} L${x - sz * 0.25} ${y - sz * 0.25} Z" fill="${col}" opacity="${op}"/>`;
    } else {
      out += `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" opacity="${op}"/>`;
    }
  }
  return out;
}

function factionBackdrop(faction, w = 600, h = 800) {
  if (faction === 'SOLARIS') {
    return `
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stop-color="#1e3a8a"/>
          <stop offset="42%" stop-color="#3b82f6"/>
          <stop offset="76%" stop-color="#fde68a"/>
          <stop offset="100%" stop-color="#451a03"/>
        </linearGradient>
        <radialGradient id="sun" cx="65%" cy="22%" r="55%">
          <stop offset="0%" stop-color="#fef9c3" stop-opacity="0.9"/>
          <stop offset="50%" stop-color="#f5c84c" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#f5c84c" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="url(#bg)"/>
      <rect width="${w}" height="${h}" fill="url(#sun)"/>
      <!-- Floating marble arches -->
      <path d="M35 ${h} L35 280 Q110 210 185 280 L185 ${h} Z" fill="#e2e8f0" opacity="0.22"/>
      <path d="M430 ${h} L430 230 Q510 155 585 230 L585 ${h} Z" fill="#f8fafc" opacity="0.26"/>
      <line x1="0" y1="0" x2="${w}" y2="${h * 0.7}" stroke="#fef08a" stroke-width="52" opacity="0.1"/>
    `;
  }
  if (faction === 'ASTRAL') {
    return `
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#090d24"/>
          <stop offset="48%" stop-color="#1e1b4b"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
        <radialGradient id="nebula" cx="50%" cy="32%" r="58%">
          <stop offset="0%" stop-color="#38e8ff" stop-opacity="0.5"/>
          <stop offset="55%" stop-color="#818cf8" stop-opacity="0.2"/>
          <stop offset="100%" stop-color="#090d24" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="url(#bg)"/>
      <rect width="${w}" height="${h}" fill="url(#nebula)"/>
      <circle cx="${w * 0.5}" cy="${h * 0.34}" r="185" fill="none" stroke="#38e8ff" stroke-width="1.6" stroke-dasharray="9 9" opacity="0.45"/>
      <circle cx="${w * 0.5}" cy="${h * 0.34}" r="245" fill="none" stroke="#a855f7" stroke-width="1.2" opacity="0.35"/>
      <polygon points="45,760 95,430 140,760" fill="#38bdf8" opacity="0.28"/>
      <polygon points="475,780 535,380 590,780" fill="#818cf8" opacity="0.28"/>
    `;
  }
  if (faction === 'VERDANT') {
    return `
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stop-color="#06281e"/>
          <stop offset="45%" stop-color="#0f4c3a"/>
          <stop offset="100%" stop-color="#051314"/>
        </linearGradient>
        <radialGradient id="canopy" cx="50%" cy="28%" r="55%">
          <stop offset="0%" stop-color="#6ee7b7" stop-opacity="0.55"/>
          <stop offset="60%" stop-color="#10b981" stop-opacity="0.18"/>
          <stop offset="100%" stop-color="#06281e" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="url(#bg)"/>
      <rect width="${w}" height="${h}" fill="url(#canopy)"/>
      <path d="M0 0 Q180 120 90 360 Q40 520 0 800 Z" fill="#022c22" opacity="0.65"/>
      <path d="M${w} 0 Q420 140 520 390 Q560 540 ${w} 800 Z" fill="#022c22" opacity="0.65"/>
      <circle cx="485" cy="120" r="54" fill="#d1fae5" opacity="0.55"/>
    `;
  }
  // ASHEN
  return `
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0.7" y2="1">
        <stop offset="0%" stop-color="#1c0f13"/>
        <stop offset="48%" stop-color="#451a03"/>
        <stop offset="82%" stop-color="#9a3412"/>
        <stop offset="100%" stop-color="#180b0e"/>
      </linearGradient>
      <radialGradient id="forge" cx="50%" cy="62%" r="60%">
        <stop offset="0%" stop-color="#fb923c" stop-opacity="0.72"/>
        <stop offset="55%" stop-color="#ef4444" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="#1c0f13" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#bg)"/>
    <rect width="${w}" height="${h}" fill="url(#forge)"/>
    <polygon points="0,800 130,420 240,800" fill="#0f0709" opacity="0.7"/>
    <polygon points="360,800 500,360 600,800" fill="#0f0709" opacity="0.75"/>
    <path d="M80 780 Q280 650 560 760" stroke="#fb923c" stroke-width="10" fill="none" opacity="0.65"/>
  `;
}

function buildHeroPortraitSvg(cfg) {
  const { faction, hair, armor, accent, eyeColor, skin, weaponSvg, seed, broad = false } = cfg;
  const shoulderW = broad ? 175 : 132;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
    ${factionBackdrop(faction, 600, 800)}
    ${starfield(seed, accent, '#ffffff', 42)}
    <!-- Flowing cloak behind body -->
    <path d="M${300 - shoulderW - 20} 370 Q110 520 75 790 L525 790 Q490 520 ${300 + shoulderW + 20} 370 Z" fill="#0f172a" stroke="${accent}" stroke-width="3" opacity="0.92"/>
    <!-- Dynamic diagonal energy trail -->
    <path d="M-20 660 Q280 430 630 160" fill="none" stroke="${accent}" stroke-width="26" opacity="0.22"/>
    <path d="M-20 660 Q280 430 630 160" fill="none" stroke="#ffffff" stroke-width="4" opacity="0.65"/>

    <!-- Armor Torso & Pauldrons -->
    <path d="M${300 - shoulderW} 400 Q300 345 ${300 + shoulderW} 400 L${300 + shoulderW * 0.72} 800 L${300 - shoulderW * 0.72} 800 Z" fill="${armor}" stroke="#090d1a" stroke-width="5"/>
    <!-- Chest Trim & Core Crest -->
    <path d="M235 415 L300 545 L365 415 L340 400 L300 480 L260 400 Z" fill="${accent}" opacity="0.92"/>
    <polygon points="300,455 322,495 300,535 278,495" fill="#ffffff" opacity="0.88" stroke="${accent}" stroke-width="4"/>
    <!-- Left & Right Pauldrons -->
    <path d="M${300 - shoulderW - 18} 430 Q${300 - shoulderW * 0.65} 340 ${300 - shoulderW * 0.25} 395 L${300 - shoulderW * 0.52} 475 Z" fill="${armor}" stroke="${accent}" stroke-width="5"/>
    <path d="M${300 + shoulderW + 18} 430 Q${300 + shoulderW * 0.65} 340 ${300 + shoulderW * 0.25} 395 L${300 + shoulderW * 0.52} 475 Z" fill="${armor}" stroke="${accent}" stroke-width="5"/>

    <!-- Neck -->
    <rect x="275" y="315" width="50" height="62" rx="14" fill="${skin}" stroke="#1e293b" stroke-width="3"/>
    <!-- Back Hair -->
    <path d="M198 245 Q172 360 198 465 L402 465 Q428 360 402 245 Z" fill="${hair}" stroke="#090d1a" stroke-width="4"/>
    <!-- Anime Face -->
    <path d="M232 238 Q232 325 300 344 Q368 325 368 238 Q368 175 300 175 Q232 175 232 238 Z" fill="${skin}" stroke="#0f172a" stroke-width="4"/>
    <!-- Anime Eyes -->
    <g>
      <path d="M250 258 Q268 246 284 258 Q268 269 250 258 Z" fill="#ffffff" stroke="#0f172a" stroke-width="3"/>
      <circle cx="268" cy="258" r="8" fill="${eyeColor}"/>
      <circle cx="265" cy="255" r="3" fill="#ffffff"/>
      <path d="M316 258 Q332 246 350 258 Q332 269 316 258 Z" fill="#ffffff" stroke="#0f172a" stroke-width="3"/>
      <circle cx="332" cy="258" r="8" fill="${eyeColor}"/>
      <circle cx="329" cy="255" r="3" fill="#ffffff"/>
      <!-- Determined brows & nose/mouth -->
      <path d="M246 244 L286 249" stroke="#0f172a" stroke-width="4" stroke-linecap="round"/>
      <path d="M354 244 L314 249" stroke="#0f172a" stroke-width="4" stroke-linecap="round"/>
      <path d="M298 278 L302 287" stroke="#b48367" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M286 306 Q300 314 314 306" fill="none" stroke="#854d3d" stroke-width="3" stroke-linecap="round"/>
    </g>
    <!-- Front Spiky / Swept Anime Hair -->
    <path d="M210 245 Q214 140 300 132 Q386 140 390 245 L368 214 L344 248 L322 204 L298 246 L274 202 L248 248 L228 216 Z" fill="${hair}" stroke="#090d1a" stroke-width="4"/>
    <!-- Rim lighting highlight on hair -->
    <path d="M235 178 Q300 144 365 178" fill="none" stroke="${accent}" stroke-width="4" opacity="0.7"/>

    <!-- Hero Signature Weapon / Artifact Foreground -->
    ${weaponSvg}
    ${starfield(seed + 77, '#ffffff', accent, 18)}
  </svg>`;
}

const REMAINING_HEROES = [
  {
    file: 'public/assets/heroes/hero_draven_card.webp',
    cutin: 'public/assets/cutins/cutin_draven.webp',
    faction: 'ASHEN',
    hair: '#272025',
    armor: '#1e1b24',
    accent: '#f97316',
    eyeColor: '#f59e0b',
    skin: '#e7bca1',
    broad: true,
    seed: 103,
    weaponSvg: `
      <rect x="430" y="130" width="24" height="620" rx="8" fill="#3f3f46" stroke="#090d1a" stroke-width="5" transform="rotate(14 442 440)"/>
      <path d="M345 140 L545 190 L515 320 L315 270 Z" fill="#1c1917" stroke="#f97316" stroke-width="7"/>
      <polygon points="430,192 465,235 425,275 390,232" fill="#fb923c"/>
      <circle cx="430" cy="234" r="24" fill="#fef08a" opacity="0.85"/>
    `,
  },
  {
    file: 'public/assets/heroes/hero_garrick_card.webp',
    cutin: 'public/assets/cutins/cutin_garrick.webp',
    faction: 'SOLARIS',
    hair: '#64748b',
    armor: '#e2e8f0',
    accent: '#eab308',
    eyeColor: '#38bdf8',
    skin: '#f1c7ad',
    broad: true,
    seed: 105,
    weaponSvg: `
      <!-- Massive Hexagonal Golden Tower Shield -->
      <polygon points="445,320 558,385 558,645 445,735 332,645 332,385" fill="#1e293b" stroke="#f5c84c" stroke-width="10"/>
      <polygon points="445,360 526,406 526,620 445,690 364,620 364,406" fill="#0f172a" stroke="#38e8ff" stroke-width="4"/>
      <polygon points="445,425 490,515 445,605 400,515" fill="#f5c84c" opacity="0.9"/>
    `,
  },
  {
    file: 'public/assets/heroes/hero_lyra_card.webp',
    cutin: 'public/assets/cutins/cutin_lyra.webp',
    faction: 'VERDANT',
    hair: '#6ee7b7',
    armor: '#f8fafc',
    accent: '#10b981',
    eyeColor: '#10b981',
    skin: '#ffe8d6',
    seed: 106,
    weaponSvg: `
      <!-- Crescent Chime Staff & Glowing Petals -->
      <path d="M128 190 L158 760" stroke="#92400e" stroke-width="14" stroke-linecap="round"/>
      <path d="M88 185 A62 62 0 1 1 178 195 A44 44 0 1 0 88 185 Z" fill="#fde68a" stroke="#10b981" stroke-width="4"/>
      <circle cx="136" cy="182" r="24" fill="#34d399" opacity="0.85"/>
      <circle cx="136" cy="182" r="10" fill="#ffffff"/>
      <circle cx="485" cy="410" r="14" fill="#a7f3d0" opacity="0.8"/>
      <circle cx="445" cy="340" r="9" fill="#fde68a" opacity="0.9"/>
    `,
  },
  {
    file: 'public/assets/heroes/hero_raze_card.webp',
    cutin: 'public/assets/cutins/cutin_raze.webp',
    faction: 'ASHEN',
    hair: '#e5e7eb',
    armor: '#292524',
    accent: '#ef4444',
    eyeColor: '#f43f5e',
    skin: '#f0c8ae',
    seed: 107,
    weaponSvg: `
      <!-- Blazing Chained War-Scythe -->
      <path d="M75 680 Q240 530 475 245" fill="none" stroke="#f97316" stroke-width="10" stroke-dasharray="18 10"/>
      <path d="M475 185 Q585 260 515 415 Q495 310 415 265 Z" fill="#ef4444" stroke="#fef08a" stroke-width="5"/>
      <path d="M455 215 L525 565" stroke="#44403c" stroke-width="12" stroke-linecap="round"/>
    `,
  },
  {
    file: 'public/assets/heroes/hero_orion_card.webp',
    cutin: 'public/assets/cutins/cutin_orion.webp',
    faction: 'ASTRAL',
    hair: '#64748b',
    armor: '#1e1b4b',
    accent: '#38e8ff',
    eyeColor: '#38e8ff',
    skin: '#f6d8c5',
    seed: 108,
    weaponSvg: `
      <!-- Holographic Monocle & Dual Astral Pistols -->
      <circle cx="332" cy="258" r="22" fill="#38e8ff" opacity="0.28" stroke="#38e8ff" stroke-width="3"/>
      <rect x="380" y="455" width="165" height="32" rx="8" fill="#334155" stroke="#38e8ff" stroke-width="4" transform="rotate(-14 450 470)"/>
      <path d="M535 445 L600 425" stroke="#38e8ff" stroke-width="12" opacity="0.9"/>
      <rect x="65" y="470" width="155" height="30" rx="8" fill="#334155" stroke="#38e8ff" stroke-width="4" transform="rotate(14 140 485)"/>
      <polygon points="105,215 135,260 105,305 75,260" fill="#38e8ff" opacity="0.85" stroke="#ffffff" stroke-width="3"/>
    `,
  },
  {
    file: 'public/assets/heroes/hero_kael_card.webp',
    faction: 'VERDANT',
    hair: '#b45309',
    armor: '#14532d',
    accent: '#22c55e',
    eyeColor: '#4ade80',
    skin: '#f5cfb6',
    seed: 109,
    weaponSvg: `
      <!-- Recurve Wind Bow & Swirling Emerald Gale -->
      <path d="M430 165 Q560 400 430 645" fill="none" stroke="#86efac" stroke-width="14" stroke-linecap="round"/>
      <line x1="430" y1="168" x2="430" y2="642" stroke="#ffffff" stroke-width="3" opacity="0.75"/>
      <line x1="255" y1="405" x2="565" y2="405" stroke="#38e8ff" stroke-width="7"/>
      <polygon points="575,405 538,386 538,424" fill="#ffffff"/>
    `,
  },
  {
    file: 'public/assets/heroes/hero_nyx_card.webp',
    faction: 'ASHEN',
    hair: '#1f2937',
    armor: '#7f1d1d',
    accent: '#fb7185',
    eyeColor: '#ef4444',
    skin: '#ffe3d3',
    seed: 110,
    weaponSvg: `
      <!-- Twin Molten Ember Orbs -->
      <circle cx="122" cy="485" r="54" fill="#f97316" opacity="0.85" stroke="#fef08a" stroke-width="5"/>
      <circle cx="122" cy="485" r="24" fill="#ffffff" opacity="0.9"/>
      <circle cx="485" cy="455" r="62" fill="#ef4444" opacity="0.85" stroke="#fde047" stroke-width="5"/>
      <circle cx="485" cy="455" r="28" fill="#fef08a" opacity="0.92"/>
    `,
  },
  {
    file: 'public/assets/heroes/hero_titus_card.webp',
    faction: 'ASTRAL',
    hair: '#1e3a8a',
    armor: '#cbd5e1',
    accent: '#818cf8',
    eyeColor: '#c084fc',
    skin: '#f4d3be',
    seed: 111,
    weaponSvg: `
      <!-- Faceted Translucent Prism Buckler -->
      <polygon points="445,355 545,455 445,625 345,455" fill="#6366f1" opacity="0.78" stroke="#e0e7ff" stroke-width="7"/>
      <polygon points="445,390 508,465 445,580 382,465" fill="#38e8ff" opacity="0.52"/>
      <line x1="445" y1="355" x2="445" y2="625" stroke="#ffffff" stroke-width="3" opacity="0.7"/>
    `,
  },
  {
    file: 'public/assets/heroes/hero_clara_card.webp',
    faction: 'SOLARIS',
    hair: '#fbbf24',
    armor: '#f8fafc',
    accent: '#fcd34d',
    eyeColor: '#38bdf8',
    skin: '#ffeadb',
    seed: 112,
    weaponSvg: `
      <!-- Radiant Sunburst Brass Lantern -->
      <circle cx="465" cy="410" r="108" fill="#fef08a" opacity="0.28"/>
      <path d="M465 280 L465 345" stroke="#d97706" stroke-width="8"/>
      <polygon points="430,345 500,345 516,465 414,465" fill="#fef08a" stroke="#b45309" stroke-width="7"/>
      <circle cx="465" cy="405" r="24" fill="#ffffff"/>
      <path d="M414 465 L516 465 L495 490 L435 490 Z" fill="#b45309"/>
    `,
  },
];

// ---------- 8 BESPOKE STARLIGHT RELICS (3:4 600x800) ----------
const RELIC_SPECS = [
  {
    file: 'public/assets/relics/relic_first_eclipse.webp',
    bg1: '#090d24',
    bg2: '#31104a',
    glow: '#f5c84c',
    seed: 201,
    art: `
      <circle cx="300" cy="400" r="210" fill="#a855f7" opacity="0.2"/>
      <!-- Half Gold / Half Violet Eclipse Greatsword -->
      <polygon points="300,72 346,165 334,530 300,530" fill="#a855f7" stroke="#f5d0fe" stroke-width="4"/>
      <polygon points="300,72 254,165 266,530 300,530" fill="#f5c84c" stroke="#fef9c3" stroke-width="4"/>
      <polygon points="185,520 415,520 365,568 235,568" fill="#eab308" stroke="#451a03" stroke-width="5"/>
      <circle cx="300" cy="544" r="22" fill="#e879f9" stroke="#ffffff" stroke-width="4"/>
      <rect x="284" y="568" width="32" height="130" rx="8" fill="#1e1b4b" stroke="#f5c84c" stroke-width="4"/>
      <polygon points="300,735 330,695 270,695" fill="#f5c84c"/>
    `,
  },
  {
    file: 'public/assets/relics/relic_astrolabe_lumina.webp',
    bg1: '#070b1e',
    bg2: '#1e1b4b',
    glow: '#38e8ff',
    seed: 202,
    art: `
      <circle cx="300" cy="395" r="215" fill="none" stroke="#f5c84c" stroke-width="14"/>
      <circle cx="300" cy="395" r="175" fill="none" stroke="#cbd5e1" stroke-width="7" stroke-dasharray="28 14"/>
      <ellipse cx="300" cy="395" rx="205" ry="74" fill="none" stroke="#38e8ff" stroke-width="8" transform="rotate(-28 300 395)"/>
      <ellipse cx="300" cy="395" rx="205" ry="74" fill="none" stroke="#f5c84c" stroke-width="8" transform="rotate(28 300 395)"/>
      <circle cx="300" cy="395" r="76" fill="#38e8ff" opacity="0.88" stroke="#ffffff" stroke-width="5"/>
      <circle cx="300" cy="395" r="34" fill="#ffffff"/>
    `,
  },
  {
    file: 'public/assets/relics/relic_obsidian_forge.webp',
    bg1: '#14080a',
    bg2: '#5a1a07',
    glow: '#f97316',
    seed: 203,
    art: `
      <ellipse cx="300" cy="400" rx="235" ry="88" fill="none" stroke="#52525b" stroke-width="16" transform="rotate(-18 300 400)"/>
      <polygon points="300,130 435,285 405,540 300,665 195,540 165,285" fill="#18181b" stroke="#f97316" stroke-width="8"/>
      <path d="M295 160 L325 320 L255 415 L335 530 L295 640" fill="none" stroke="#fef08a" stroke-width="14" stroke-linecap="round"/>
      <path d="M205 320 L395 450" fill="none" stroke="#fb923c" stroke-width="10"/>
      <circle cx="300" cy="400" r="46" fill="#fb923c" opacity="0.9"/>
    `,
  },
  {
    file: 'public/assets/relics/relic_falling_star_bow.webp',
    bg1: '#051c1a',
    bg2: '#134e4a',
    glow: '#34d399',
    seed: 204,
    art: `
      <path d="M195 135 Q495 395 195 665" fill="none" stroke="#a7f3d0" stroke-width="22" stroke-linecap="round"/>
      <path d="M195 135 Q495 395 195 665" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round"/>
      <line x1="198" y1="142" x2="198" y2="658" stroke="#38e8ff" stroke-width="6"/>
      <line x1="95" y1="400" x2="525" y2="400" stroke="#38e8ff" stroke-width="10"/>
      <polygon points="545,400 480,368 480,432" fill="#ffffff"/>
      <circle cx="345" cy="400" r="32" fill="#34d399" opacity="0.5"/>
    `,
  },
  {
    file: 'public/assets/relics/relic_world_tree_tear.webp',
    bg1: '#051f16',
    bg2: '#065f46',
    glow: '#10b981',
    seed: 205,
    art: `
      <path d="M300 135 C415 295 455 445 420 555 C395 635 205 635 180 555 C145 445 185 295 300 135 Z" fill="#10b981" stroke="#fde68a" stroke-width="10"/>
      <path d="M300 195 C375 325 395 445 368 525 C350 580 250 580 232 525 C205 445 225 325 300 195 Z" fill="#6ee7b7" opacity="0.72"/>
      <circle cx="300" cy="430" r="44" fill="#ffffff" opacity="0.8"/>
    `,
  },
  {
    file: 'public/assets/relics/relic_cinder_chain.webp',
    bg1: '#1a0a0c',
    bg2: '#7c2d12',
    glow: '#ef4444',
    seed: 206,
    art: `
      <ellipse cx="240" cy="240" rx="64" ry="38" fill="none" stroke="#27272a" stroke-width="24" transform="rotate(35 240 240)"/>
      <ellipse cx="240" cy="240" rx="64" ry="38" fill="none" stroke="#f97316" stroke-width="5" transform="rotate(35 240 240)"/>
      <ellipse cx="340" cy="340" rx="64" ry="38" fill="none" stroke="#27272a" stroke-width="24" transform="rotate(-35 340 340)"/>
      <ellipse cx="340" cy="340" rx="64" ry="38" fill="none" stroke="#ef4444" stroke-width="5" transform="rotate(-35 340 340)"/>
      <path d="M300 395 Q450 480 390 655 Q340 560 220 545 Z" fill="#ef4444" stroke="#fef08a" stroke-width="8"/>
    `,
  },
  {
    file: 'public/assets/relics/relic_prism_aegis.webp',
    bg1: '#0a102b',
    bg2: '#312e81',
    glow: '#818cf8',
    seed: 207,
    art: `
      <polygon points="300,130 475,230 475,545 300,675 125,545 125,230" fill="#1e1b4b" stroke="#cbd5e1" stroke-width="12"/>
      <polygon points="300,175 435,255 435,515 300,620 165,515 165,255" fill="#38bdf8" opacity="0.48" stroke="#38e8ff" stroke-width="6"/>
      <polygon points="300,245 385,395 300,545 215,395" fill="#ffffff" opacity="0.85"/>
    `,
  },
  {
    file: 'public/assets/relics/relic_dawnlight_lantern.webp',
    bg1: '#172554',
    bg2: '#9a3412',
    glow: '#fcd34d',
    seed: 208,
    art: `
      <circle cx="300" cy="435" r="195" fill="#fef08a" opacity="0.25"/>
      <path d="M235 205 Q300 130 365 205" fill="none" stroke="#f5c84c" stroke-width="12"/>
      <polygon points="205,250 395,250 430,575 170,575" fill="#fef08a" stroke="#d97706" stroke-width="12"/>
      <circle cx="300" cy="415" r="68" fill="#ffffff"/>
      <rect x="155" y="575" width="290" height="44" rx="14" fill="#b45309" stroke="#fef08a" stroke-width="5"/>
    `,
  },
];

// 1. Render remaining 9 Hero Cards (+ 5 panoramic cutins for Draven, Garrick, Lyra, Raze, Orion)
for (const h of REMAINING_HEROES) {
  const svg = buildHeroPortraitSvg(h);
  await renderSvgToWebp(svg, h.file, 600, 800);
  if (h.cutin) {
    // Focal dramatic eye-level panoramic Cut-In (1920x720)
    const dest = path.resolve(h.cutin);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const fullBuf = await sharp(Buffer.from(svg)).resize(1920, 2560).png().toBuffer();
    await sharp(fullBuf)
      .extract({ left: 0, top: 430, width: 1920, height: 720 })
      .webp({ quality: 88 })
      .toFile(dest);
    console.log(`Rendered ${h.cutin} (1920x720 panoramic eye-cut)`);
  }
}

// 2. Re-crop the 3 AI-generated SSR Hero Cut-Ins centered on their anime eyes/upper body!
const aiCutIns = [
  {
    src: 'C:/Users/choxa/.gemini/antigravity/brain/ad3811d6-8729-4d8c-8bf7-1283d45fc051/hero_vaelen_card_1795667683854.jpg',
    dest: 'public/assets/cutins/cutin_vaelen.webp',
    topFrac: 0.16,
  },
  {
    src: 'C:/Users/choxa/.gemini/antigravity/brain/ad3811d6-8729-4d8c-8bf7-1283d45fc051/hero_seraphina_card_1795667684789.jpg',
    dest: 'public/assets/cutins/cutin_seraphina.webp',
    topFrac: 0.12,
  },
  {
    src: 'C:/Users/choxa/.gemini/antigravity/brain/ad3811d6-8729-4d8c-8bf7-1283d45fc051/hero_elara_card_1795667685712.jpg',
    dest: 'public/assets/cutins/cutin_elara.webp',
    topFrac: 0.18,
  },
];
for (const c of aiCutIns) {
  if (!fs.existsSync(c.src)) continue;
  const resized = await sharp(c.src).resize(1920, 2560, { fit: 'cover' }).toBuffer();
  await sharp(resized)
    .extract({ left: 0, top: Math.round(2560 * c.topFrac), width: 1920, height: 720 })
    .webp({ quality: 88 })
    .toFile(path.resolve(c.dest));
  console.log(`Focal-cropped AI Cut-In -> ${c.dest} (1920x720)`);
}

// 3. Render 8 Starlight Relics
for (const r of RELIC_SPECS) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
    <defs>
      <linearGradient id="rb" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${r.bg1}"/>
        <stop offset="100%" stop-color="${r.bg2}"/>
      </linearGradient>
      <radialGradient id="rg" cx="50%" cy="48%" r="52%">
        <stop offset="0%" stop-color="${r.glow}" stop-opacity="0.62"/>
        <stop offset="100%" stop-color="${r.glow}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="600" height="800" fill="url(#rb)"/>
    <rect width="600" height="800" fill="url(#rg)"/>
    <circle cx="300" cy="400" r="240" fill="none" stroke="${r.glow}" stroke-width="1.5" stroke-dasharray="10 10" opacity="0.38"/>
    ${starfield(r.seed, r.glow, '#ffffff', 36)}
    ${r.art}
  </svg>`;
  await renderSvgToWebp(svg, r.file, 600, 800);
}

// 4. Render Chapter 1 Arena Floor: env_aurelia_floor.webp (2560x1440, controlled 35-45% saturation!)
{
  let tiles = '';
  for (let x = 280; x <= 2280; x += 160) {
    tiles += `<line x1="${x}" y1="320" x2="${x}" y2="1180" stroke="#d9c698" stroke-width="2" opacity="0.32"/>`;
  }
  for (let y = 320; y <= 1180; y += 120) {
    tiles += `<line x1="280" y1="${y}" x2="2280" y2="${y}" stroke="#d9c698" stroke-width="2" opacity="0.32"/>`;
  }
  const arenaSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2560 1440" width="2560" height="1440">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#3c547a"/>
        <stop offset="50%" stop-color="#4e678c"/>
        <stop offset="100%" stop-color="#2c3a57"/>
      </linearGradient>
      <radialGradient id="floorLight" cx="50%" cy="46%" r="58%">
        <stop offset="0%" stop-color="#ebe5d5"/>
        <stop offset="65%" stop-color="#c9c4b8"/>
        <stop offset="100%" stop-color="#9da0a8"/>
      </radialGradient>
    </defs>
    <rect width="2560" height="1440" fill="url(#sky)"/>
    <!-- Cloud horizon bands -->
    <ellipse cx="520" cy="240" rx="520" ry="95" fill="#d8e4f2" opacity="0.22"/>
    <ellipse cx="1980" cy="210" rx="640" ry="110" fill="#e2ecf7" opacity="0.24"/>
    <!-- Outer Sky Citadel Stone Apron -->
    <rect x="210" y="255" width="2140" height="990" rx="44" fill="#70788c" stroke="#c5ad74" stroke-width="10"/>
    <!-- Playable Sunlit Marble Courtyard (35-45% soft contrast so characters & VFX pop!) -->
    <rect x="280" y="320" width="2000" height="860" rx="22" fill="url(#floorLight)" stroke="#cbb072" stroke-width="6"/>
    ${tiles}
    <!-- Central Solaris Compass Inlay -->
    <ellipse cx="1280" cy="750" rx="340" ry="220" fill="none" stroke="#bfa15c" stroke-width="6" opacity="0.55"/>
    <ellipse cx="1280" cy="750" rx="220" ry="140" fill="none" stroke="#8aa8cc" stroke-width="4" opacity="0.45"/>
    <polygon points="1280,555 1335,750 1280,945 1225,750" fill="#cbb072" opacity="0.25"/>
    <polygon points="975,750 1280,705 1585,750 1280,795" fill="#cbb072" opacity="0.25"/>
    <!-- Subtle diagonal god-ray light shafts -->
    <polygon points="400,0 780,0 1360,1440 940,1440" fill="#fef9c3" opacity="0.08"/>
    <polygon points="1380,0 1660,0 2200,1440 1860,1440" fill="#fef9c3" opacity="0.07"/>
  </svg>`;
  await renderSvgToWebp(arenaSvg, 'public/assets/environments/env_aurelia_floor.webp', 2560, 1440);
}

// 5. Render Chapter 1 Boss: boss_aurelian_sentinel.webp (1024x1024)
{
  const bossSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
    <defs>
      <radialGradient id="voidAura" cx="50%" cy="54%" r="46%">
        <stop offset="0%" stop-color="#d946ef" stop-opacity="0.58"/>
        <stop offset="55%" stop-color="#6b21a8" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="#6b21a8" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <!-- Soft transparent ground shadow + glowing Void aura (zero opaque square box!) -->
    <ellipse cx="512" cy="915" rx="285" ry="72" fill="#070510" opacity="0.55"/>
    <circle cx="512" cy="540" r="440" fill="url(#voidAura)"/>
    ${starfield(999, '#e879f9', '#f5c84c', 28, 1024, 1024)}
    <!-- Massive Golden Halberd -->
    <line x1="785" y1="88" x2="735" y2="930" stroke="#f5c84c" stroke-width="26" stroke-linecap="round"/>
    <path d="M775 110 L955 215 L885 385 L762 315 Z" fill="#a855f7" stroke="#fef08a" stroke-width="12"/>
    <!-- Colossal Stone-and-Gold Pauldrons & Torso -->
    <polygon points="245,350 779,350 695,860 329,860" fill="#332e42" stroke="#f5c84c" stroke-width="16"/>
    <polygon points="120,455 280,315 345,515 190,605" fill="#474059" stroke="#f5c84c" stroke-width="14"/>
    <polygon points="904,455 744,315 679,515 834,605" fill="#474059" stroke="#f5c84c" stroke-width="14"/>
    <!-- Corrupted Void Rift Fracturing Chest Core -->
    <polygon points="512,410 618,555 512,710 406,555" fill="#d946ef" stroke="#f5d0fe" stroke-width="12"/>
    <polygon points="512,472 565,555 512,642 459,555" fill="#ffffff" opacity="0.9"/>
    <!-- Cracked Golden Crown & Glowing Visor Helmet -->
    <rect x="405" y="185" width="214" height="165" rx="32" fill="#3b354d" stroke="#f5c84c" stroke-width="14"/>
    <polygon points="382,198 425,75 480,165 512,55 552,165 606,82 642,198" fill="#f5c84c" stroke="#451a03" stroke-width="8"/>
    <rect x="442" y="255" width="140" height="32" rx="12" fill="#f0abfc"/>
  </svg>`;
  await renderSvgToWebp(bossSvg, 'public/assets/enemies/boss_aurelian_sentinel.webp', 1024, 1024);
}

console.log('All remaining WebP artwork generated cleanly!');
