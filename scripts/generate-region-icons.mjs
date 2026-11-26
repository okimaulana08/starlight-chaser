import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

/**
 * Generates landmark crest icons ONLY for missing region_5..region_10 emblems
 * without overwriting the user's hand-painted region_1..region_4 & region_seal WebPs!
 */
const outDir = path.resolve('public/assets/icons');
fs.mkdirSync(outDir, { recursive: true });

const DEFS = `
  <defs>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fff7cc"/>
      <stop offset="45%" stop-color="#f5c84c"/>
      <stop offset="100%" stop-color="#a86707"/>
    </linearGradient>
    <linearGradient id="ice" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f0f9ff"/>
      <stop offset="45%" stop-color="#7dd3fc"/>
      <stop offset="100%" stop-color="#0369a1"/>
    </linearGradient>
    <linearGradient id="ocean" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#cffafe"/>
      <stop offset="48%" stop-color="#22d3ee"/>
      <stop offset="100%" stop-color="#0e7490"/>
    </linearGradient>
    <linearGradient id="wind" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ecfccb"/>
      <stop offset="48%" stop-color="#a3e635"/>
      <stop offset="100%" stop-color="#15803d"/>
    </linearGradient>
    <linearGradient id="sun" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fef9c3"/>
      <stop offset="48%" stop-color="#fbbf24"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
    <linearGradient id="void" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f5d0fe"/>
      <stop offset="48%" stop-color="#c084fc"/>
      <stop offset="100%" stop-color="#581c87"/>
    </linearGradient>
    <linearGradient id="zenith" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffe4e6"/>
      <stop offset="48%" stop-color="#f43f5e"/>
      <stop offset="100%" stop-color="#881337"/>
    </linearGradient>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="4" result="b"/>
      <feMerge>
        <feMergeNode in="b"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
`;

const newEmblems = {
  // Region 5 — Frostveil Citadel: Glacial Crystal Fortress Peaks
  region_5: `
    <g filter="url(#glow)">
      <circle cx="128" cy="128" r="110" fill="#0b1b36" stroke="url(#gold)" stroke-width="10"/>
      <circle cx="128" cy="128" r="95" fill="none" stroke="url(#ice)" stroke-width="4" opacity="0.7"/>
      <polygon points="128,34 156,112 184,78 204,174 52,174 72,78 100,112" fill="url(#ice)" stroke="#0f172a" stroke-width="5" stroke-linejoin="round"/>
      <polygon points="128,34 146,112 128,174 110,112" fill="#ffffff" opacity="0.45"/>
      <polygon points="128,118 144,142 128,166 112,142" fill="#38e8ff" stroke="#0f172a" stroke-width="4"/>
      <rect x="64" y="172" width="128" height="14" rx="5" fill="url(#gold)" stroke="#0f172a" stroke-width="4"/>
    </g>
  `,

  // Region 6 — Sunken Pelagia: Abyssal Coral Sanctuary & Tide Pearl
  region_6: `
    <g filter="url(#glow)">
      <circle cx="128" cy="128" r="110" fill="#05212e" stroke="url(#gold)" stroke-width="10"/>
      <circle cx="128" cy="128" r="95" fill="none" stroke="url(#ocean)" stroke-width="4" opacity="0.7"/>
      <path d="M56 164 Q92 132 128 156 Q164 180 200 148 L200 182 L56 182 Z" fill="url(#ocean)" stroke="#082f49" stroke-width="4"/>
      <path d="M76 154 L76 86 L94 74 L94 154 M162 154 L162 86 L180 74 L180 154" fill="url(#ice)" stroke="#082f49" stroke-width="4"/>
      <circle cx="128" cy="108" r="28" fill="url(#ocean)" stroke="url(#gold)" stroke-width="6"/>
      <circle cx="119" cy="99" r="9" fill="#ffffff" opacity="0.85"/>
    </g>
  `,

  // Region 7 — Zephyr Archipelago: Floating Waterfall Isles & Wind Swirl
  region_7: `
    <g filter="url(#glow)">
      <circle cx="128" cy="128" r="110" fill="#0d261a" stroke="url(#gold)" stroke-width="10"/>
      <circle cx="128" cy="128" r="95" fill="none" stroke="url(#wind)" stroke-width="4" opacity="0.7"/>
      <path d="M54 114 Q128 74 202 114 L176 146 L128 186 L80 146 Z" fill="url(#wind)" stroke="#052e16" stroke-width="5" stroke-linejoin="round"/>
      <path d="M114 116 L114 176 M142 116 L142 172" stroke="url(#ocean)" stroke-width="11" stroke-linecap="round"/>
      <path d="M48 92 C82 54 174 54 208 92" fill="none" stroke="#e0f2fe" stroke-width="7" stroke-linecap="round" opacity="0.85"/>
      <circle cx="128" cy="86" r="14" fill="url(#gold)" stroke="#052e16" stroke-width="4"/>
    </g>
  `,

  // Region 8 — Mirage of Solis: Golden Glass Pyramids & Solar Disk
  region_8: `
    <g filter="url(#glow)">
      <circle cx="128" cy="128" r="110" fill="#291605" stroke="url(#gold)" stroke-width="10"/>
      <circle cx="128" cy="88" r="38" fill="url(#sun)" opacity="0.9"/>
      <polygon points="128,80 198,178 58,178" fill="url(#gold)" stroke="#1c0d02" stroke-width="5" stroke-linejoin="round"/>
      <polygon points="128,80 198,178 128,178" fill="#b45309" opacity="0.42"/>
      <polygon points="128,118 144,142 128,164 112,142" fill="#38e8ff" stroke="#1c0d02" stroke-width="4"/>
    </g>
  `,

  // Region 9 — Obsidian Spire: Fractured Violet Void Crystal Needle
  region_9: `
    <g filter="url(#glow)">
      <circle cx="128" cy="128" r="110" fill="#170929" stroke="url(#gold)" stroke-width="10"/>
      <ellipse cx="128" cy="164" rx="74" ry="22" fill="none" stroke="url(#void)" stroke-width="7"/>
      <polygon points="128,28 164,126 144,196 112,196 92,126" fill="url(#void)" stroke="#0f051d" stroke-width="5" stroke-linejoin="round"/>
      <polygon points="128,28 146,126 128,196 116,126" fill="#ffffff" opacity="0.38"/>
      <circle cx="72" cy="88" r="8" fill="#e879f9"/>
      <circle cx="186" cy="96" r="6" fill="#38e8ff"/>
    </g>
  `,

  // Region 10 — Shattered Zenith: Celestial Eclipse Throne
  region_10: `
    <g filter="url(#glow)">
      <circle cx="128" cy="128" r="110" fill="#210815" stroke="url(#gold)" stroke-width="10"/>
      <circle cx="128" cy="108" r="56" fill="url(#zenith)" opacity="0.38"/>
      <path d="M84 182 L94 64 L128 38 L162 64 L172 182 Z" fill="#1e1b4b" stroke="url(#gold)" stroke-width="6" stroke-linejoin="round"/>
      <path d="M74 128 L182 128 L174 166 L82 166 Z" fill="url(#zenith)" stroke="#0f0514" stroke-width="4"/>
      <polygon points="128,58 144,86 128,114 112,86" fill="url(#gold)" stroke="#0f0514" stroke-width="4"/>
      <circle cx="128" cy="86" r="8" fill="#ffffff"/>
    </g>
  `,
};

for (const [name, body] of Object.entries(newEmblems)) {
  const dest = path.join(outDir, `${name}.webp`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">${DEFS}${body}</svg>`;
  await sharp(Buffer.from(svg)).webp({ quality: 94, alphaQuality: 100 }).toFile(dest);
  console.log(`✓ public/assets/icons/${name}.webp`);
}
