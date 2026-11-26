import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

/**
 * Generates 10 original, cel-shaded metallic-gold & gemstone RPG menu icons (256x256 transparent WebP)
 * in public/assets/icons/ so Starlight Chasers has bespoke game emblems instead of generic web icons.
 */
const OUT = path.resolve('public/assets/icons');
fs.mkdirSync(OUT, { recursive: true });

async function renderIcon(filename, innerSvg) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
    <defs>
      <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#fef9c3"/>
        <stop offset="35%" stop-color="#f5c84c"/>
        <stop offset="75%" stop-color="#ca8a04"/>
        <stop offset="100%" stop-color="#713f12"/>
      </linearGradient>
      <linearGradient id="steel" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f8fafc"/>
        <stop offset="45%" stop-color="#94a3b8"/>
        <stop offset="100%" stop-color="#334155"/>
      </linearGradient>
      <linearGradient id="cyanGem" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#e0f2fe"/>
        <stop offset="40%" stop-color="#38e8ff"/>
        <stop offset="100%" stop-color="#0369a1"/>
      </linearGradient>
      <linearGradient id="violetGem" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#fae8ff"/>
        <stop offset="45%" stop-color="#c084fc"/>
        <stop offset="100%" stop-color="#581c87"/>
      </linearGradient>
      <linearGradient id="fireGem" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#fef08a"/>
        <stop offset="45%" stop-color="#f97316"/>
        <stop offset="100%" stop-color="#991b1b"/>
      </linearGradient>
      <radialGradient id="haloGold" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fde047" stop-opacity="0.55"/>
        <stop offset="100%" stop-color="#fde047" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="haloCyan" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#38e8ff" stop-opacity="0.55"/>
        <stop offset="100%" stop-color="#38e8ff" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="haloViolet" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#c084fc" stop-opacity="0.55"/>
        <stop offset="100%" stop-color="#c084fc" stop-opacity="0"/>
      </radialGradient>
    </defs>
    ${innerSvg}
  </svg>`;

  await sharp(Buffer.from(svg))
    .resize(256, 256)
    .webp({ quality: 92, alphaQuality: 100 })
    .toFile(path.join(OUT, filename));
  console.log(`✓ public/assets/icons/${filename}`);
}

// 1. BATTLE — Crossed Solaris Eclipse Blades over Radiant Star Emblem
await renderIcon(
  'icon_battle.webp',
  `
  <circle cx="128" cy="128" r="112" fill="url(#haloGold)"/>
  <circle cx="128" cy="128" r="88" fill="#0f172a" stroke="url(#gold)" stroke-width="8"/>
  <!-- Left-to-right sword -->
  <g transform="rotate(-45 128 128)">
    <polygon points="128,18 144,44 138,166 118,166 112,44" fill="url(#steel)" stroke="#0f172a" stroke-width="5"/>
    <polygon points="128,28 134,48 131,158 128,158" fill="#ffffff" opacity="0.7"/>
    <polygon points="94,162 162,162 146,180 110,180" fill="url(#gold)" stroke="#0f172a" stroke-width="4"/>
    <rect x="120" y="180" width="16" height="40" rx="4" fill="#1e1b4b" stroke="url(#gold)" stroke-width="3"/>
    <circle cx="128" cy="226" r="12" fill="url(#gold)" stroke="#0f172a" stroke-width="4"/>
  </g>
  <!-- Right-to-left eclipse sword -->
  <g transform="rotate(45 128 128)">
    <polygon points="128,18 144,44 138,166 118,166 112,44" fill="url(#violetGem)" stroke="#0f172a" stroke-width="5"/>
    <polygon points="128,28 135,48 132,158 128,158" fill="#fde68a" opacity="0.85"/>
    <polygon points="94,162 162,162 146,180 110,180" fill="url(#gold)" stroke="#0f172a" stroke-width="4"/>
    <rect x="120" y="180" width="16" height="40" rx="4" fill="#1e1b4b" stroke="url(#gold)" stroke-width="3"/>
    <circle cx="128" cy="226" r="12" fill="url(#gold)" stroke="#0f172a" stroke-width="4"/>
  </g>
  <!-- Center blazing starlight gem -->
  <polygon points="128,96 154,128 128,160 102,128" fill="url(#gold)" stroke="#0f172a" stroke-width="5"/>
  <polygon points="128,108 142,128 128,148 114,128" fill="#ffffff" opacity="0.9"/>
`,
);

// 2. HEROES — Winged Solaris Knight Crest & Sapphire Shield
await renderIcon(
  'icon_heroes.webp',
  `
  <circle cx="128" cy="128" r="110" fill="url(#haloGold)"/>
  <!-- Winged gilded side plumes -->
  <path d="M58 118 Q18 82 28 42 Q64 58 84 96 Z" fill="url(#gold)" stroke="#0f172a" stroke-width="5"/>
  <path d="M198 118 Q238 82 228 42 Q192 58 172 96 Z" fill="url(#gold)" stroke="#0f172a" stroke-width="5"/>
  <!-- Royal Hexagonal Paladin Shield -->
  <polygon points="128,36 202,74 190,174 128,224 66,174 54,74" fill="#172554" stroke="url(#gold)" stroke-width="10"/>
  <polygon points="128,54 184,84 174,164 128,204 82,164 72,84" fill="#1e3a8a" stroke="#38e8ff" stroke-width="3" opacity="0.85"/>
  <!-- Knight Helmet Crown Visor inside -->
  <path d="M90 104 Q128 74 166 104 L160 156 L128 180 L96 156 Z" fill="url(#steel)" stroke="#0f172a" stroke-width="5"/>
  <polygon points="94,94 112,68 128,86 144,68 162,94" fill="url(#gold)" stroke="#0f172a" stroke-width="4"/>
  <polygon points="102,124 154,124 146,142 110,142" fill="#0f172a"/>
  <rect x="110" y="129" width="36" height="7" rx="3" fill="#38e8ff"/>
`,
);

// 3. SUMMON — Radiant Faceted Starlight Prism with Orbiting Constellation Rings
await renderIcon(
  'icon_summon.webp',
  `
  <circle cx="128" cy="128" r="114" fill="url(#haloCyan)"/>
  <ellipse cx="128" cy="128" rx="102" ry="38" fill="none" stroke="url(#gold)" stroke-width="7" transform="rotate(-26 128 128)"/>
  <ellipse cx="128" cy="128" rx="98" ry="34" fill="none" stroke="#38e8ff" stroke-width="5" transform="rotate(26 128 128)"/>
  <!-- Faceted Starlight Prism Crystal -->
  <polygon points="128,20 186,128 128,236 70,128" fill="url(#cyanGem)" stroke="#0f172a" stroke-width="6"/>
  <polygon points="128,20 186,128 128,128" fill="#e0f2fe" opacity="0.65"/>
  <polygon points="128,128 186,128 128,236" fill="url(#violetGem)" opacity="0.72"/>
  <polygon points="128,58 158,128 128,198 98,128" fill="#ffffff" opacity="0.6"/>
  <!-- 4-point sparkle stars -->
  <polygon points="50,58 56,72 70,78 56,84 50,98 44,84 30,78 44,72" fill="#fef08a"/>
  <polygon points="204,158 209,170 222,175 209,180 204,192 199,180 186,175 199,170" fill="#fde047"/>
`,
);

// 4. CODEX — Ornate Gilded Astral Grimoire with Amethyst Star Clasp
await renderIcon(
  'icon_codex.webp',
  `
  <circle cx="128" cy="128" r="110" fill="url(#haloViolet)"/>
  <!-- Heavy bound book body -->
  <rect x="46" y="34" width="164" height="190" rx="16" fill="#2e1065" stroke="url(#gold)" stroke-width="9"/>
  <rect x="46" y="34" width="32" height="190" rx="8" fill="#1e1b4b" stroke="url(#gold)" stroke-width="5"/>
  <!-- Pages edge glow -->
  <rect x="196" y="46" width="14" height="166" rx="4" fill="#fef3c7" stroke="#92400e" stroke-width="3"/>
  <!-- Filigree gold cover inlay -->
  <rect x="88" y="54" width="100" height="150" rx="8" fill="none" stroke="url(#gold)" stroke-width="4" opacity="0.85"/>
  <!-- Center celestial compass star emblem -->
  <polygon points="138,76 150,114 186,128 150,142 138,180 126,142 90,128 126,114" fill="url(#gold)" stroke="#0f172a" stroke-width="4"/>
  <circle cx="138" cy="128" r="16" fill="url(#violetGem)" stroke="#ffffff" stroke-width="3"/>
`,
);

// 5. FORGE — Molten Volcanic Anvil & Runic Blacksmith Hammer
await renderIcon(
  'icon_forge.webp',
  `
  <circle cx="128" cy="128" r="110" fill="url(#haloGold)"/>
  <!-- Anvil -->
  <path d="M36 140 L216 140 L196 172 L166 178 L184 218 L74 218 L92 178 L58 172 Z" fill="url(#steel)" stroke="#0f172a" stroke-width="7"/>
  <rect x="64" y="140" width="136" height="14" fill="url(#gold)"/>
  <!-- Hammer slamming diagonally with molten sparks -->
  <g transform="rotate(-32 132 102)">
    <rect x="122" y="88" width="20" height="118" rx="6" fill="#78350f" stroke="#0f172a" stroke-width="5"/>
    <rect x="82" y="42" width="100" height="54" rx="10" fill="#1e293b" stroke="url(#gold)" stroke-width="6"/>
    <polygon points="132,52 148,69 132,86 116,69" fill="url(#fireGem)"/>
  </g>
  <circle cx="96" cy="122" r="9" fill="#fef08a"/>
  <circle cx="172" cy="116" r="7" fill="#fb923c"/>
  <circle cx="186" cy="134" r="5" fill="#fde047"/>
`,
);

// 6. WORLD MAP — Gilded Celestial Compass & Floating Continent Globe
await renderIcon(
  'icon_worldmap.webp',
  `
  <circle cx="128" cy="128" r="112" fill="url(#haloCyan)"/>
  <circle cx="128" cy="128" r="94" fill="#0f172a" stroke="url(#gold)" stroke-width="10"/>
  <circle cx="128" cy="128" r="76" fill="#1e3a8a" stroke="#38e8ff" stroke-width="3" opacity="0.8"/>
  <!-- Stylized star-compass rose -->
  <polygon points="128,28 148,108 228,128 148,148 128,228 108,148 28,128 108,108" fill="url(#gold)" stroke="#0f172a" stroke-width="5"/>
  <polygon points="128,54 140,116 202,128 140,140 128,202 116,140 54,128 116,116" fill="#fef9c3" opacity="0.7"/>
  <circle cx="128" cy="128" r="22" fill="url(#cyanGem)" stroke="#0f172a" stroke-width="5"/>
  <circle cx="128" cy="128" r="8" fill="#ffffff"/>
`,
);

// 7. STARLIGHT CRYSTAL — Luminous Faceted Sky-Shard Currency
await renderIcon(
  'icon_crystal.webp',
  `
  <circle cx="128" cy="128" r="108" fill="url(#haloCyan)"/>
  <polygon points="128,18 192,82 170,192 128,238 86,192 64,82" fill="url(#cyanGem)" stroke="#0f172a" stroke-width="7"/>
  <polygon points="128,18 192,82 128,118" fill="#ffffff" opacity="0.68"/>
  <polygon points="128,118 192,82 170,192 128,238" fill="#0284c7" opacity="0.55"/>
  <polygon points="128,62 158,108 128,176 98,108" fill="#e0f2fe" opacity="0.55"/>
`,
);

// 8. SOLARIS GOLD — Embossed Sunburst Gold Coin Medallion
await renderIcon(
  'icon_gold.webp',
  `
  <circle cx="128" cy="128" r="104" fill="url(#haloGold)"/>
  <circle cx="138" cy="138" r="78" fill="#a16207" stroke="#0f172a" stroke-width="7"/>
  <circle cx="122" cy="122" r="80" fill="url(#gold)" stroke="#0f172a" stroke-width="7"/>
  <circle cx="122" cy="122" r="62" fill="none" stroke="#713f12" stroke-width="4" stroke-dasharray="10 6"/>
  <polygon points="122,72 135,108 172,122 135,136 122,172 109,136 72,122 109,108" fill="#fef9c3" stroke="#854d0e" stroke-width="4"/>
`,
);

// 9. RELIC — Floating Radiant Emerald-Gold Artifact Orb
await renderIcon(
  'icon_relic.webp',
  `
  <circle cx="128" cy="128" r="108" fill="url(#haloViolet)"/>
  <circle cx="128" cy="128" r="82" fill="none" stroke="url(#gold)" stroke-width="8" stroke-dasharray="22 10"/>
  <polygon points="128,36 196,128 128,220 60,128" fill="url(#violetGem)" stroke="url(#gold)" stroke-width="8"/>
  <circle cx="128" cy="128" r="34" fill="#ffffff" opacity="0.88"/>
`,
);

// 10. SUPPLY CHEST — Royal Starlight Expedition Treasure Chest
await renderIcon(
  'icon_supply.webp',
  `
  <circle cx="128" cy="128" r="110" fill="url(#haloGold)"/>
  <rect x="40" y="98" width="176" height="114" rx="14" fill="#7c2d12" stroke="url(#gold)" stroke-width="9"/>
  <path d="M34 108 Q128 42 222 108 Z" fill="#9a3412" stroke="url(#gold)" stroke-width="9"/>
  <rect x="40" y="106" width="176" height="16" fill="url(#gold)"/>
  <rect x="108" y="96" width="40" height="48" rx="8" fill="url(#gold)" stroke="#0f172a" stroke-width="5"/>
  <polygon points="128,108 138,120 128,132 118,120" fill="#38e8ff"/>
`,
);
