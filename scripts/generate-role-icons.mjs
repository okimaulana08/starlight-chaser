import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const outDir = path.resolve('public/assets/icons');
fs.mkdirSync(outDir, { recursive: true });

const DEFS = `
  <defs>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fff3b0"/>
      <stop offset="40%" stop-color="#f5c84c"/>
      <stop offset="100%" stop-color="#a86707"/>
    </linearGradient>
    <linearGradient id="silver" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="50%" stop-color="#cbd5e1"/>
      <stop offset="100%" stop-color="#475569"/>
    </linearGradient>
    <linearGradient id="tankBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1e40af"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="assaultBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#be123c"/>
      <stop offset="100%" stop-color="#2a0a18"/>
    </linearGradient>
    <linearGradient id="rangerBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#047857"/>
      <stop offset="100%" stop-color="#062620"/>
    </linearGradient>
    <linearGradient id="mageBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#6d28d9"/>
      <stop offset="100%" stop-color="#180e38"/>
    </linearGradient>
    <linearGradient id="healerBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0f766e"/>
      <stop offset="100%" stop-color="#0a2520"/>
    </linearGradient>
    <linearGradient id="cyanGem" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#e0f9ff"/>
      <stop offset="45%" stop-color="#38e8ff"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
    <linearGradient id="crimsonGem" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fed7aa"/>
      <stop offset="45%" stop-color="#f97316"/>
      <stop offset="100%" stop-color="#be123c"/>
    </linearGradient>
    <linearGradient id="emeraldGem" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#d1fae5"/>
      <stop offset="45%" stop-color="#34d399"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
    <linearGradient id="violetGem" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f5d0fe"/>
      <stop offset="50%" stop-color="#c084fc"/>
      <stop offset="100%" stop-color="#6d28d9"/>
    </linearGradient>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="5" result="b"/>
      <feMerge>
        <feMergeNode in="b"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
`;

const roles = {
  // TANK: Ornate Royal Sapphire Kite Shield with Gilded Cross Ribs & Core Gem
  role_tank: `
    <g filter="url(#glow)">
      <path d="M128 18 L216 54 L208 144 C202 188 168 220 128 240 C88 220 54 188 48 144 L40 54 Z"
            fill="url(#tankBg)" stroke="url(#gold)" stroke-width="11" stroke-linejoin="round"/>
      <path d="M128 36 L196 64 L190 138 C185 174 158 200 128 218 C98 200 71 174 66 138 L60 64 Z"
            fill="none" stroke="#60a5fa" stroke-opacity="0.55" stroke-width="4"/>
      <!-- Gilded Fortress Cross -->
      <path d="M128 42 L128 212 M64 114 L192 114" stroke="url(#gold)" stroke-width="12" stroke-linecap="round"/>
      <!-- Inner Diamond Core -->
      <polygon points="128,80 158,114 128,148 98,114" fill="url(#cyanGem)" stroke="#0f172a" stroke-width="6" stroke-linejoin="round"/>
      <polygon points="128,92 145,114 128,136 111,114" fill="#ffffff" opacity="0.65"/>
      <!-- Corner Gold Studs -->
      <circle cx="76" cy="72" r="6" fill="url(#gold)"/>
      <circle cx="180" cy="72" r="6" fill="url(#gold)"/>
    </g>
  `,

  // ASSAULT: Blazing Crimson-Gold Greatsword & Dynamic Energy Slash Arc
  role_assault: `
    <g filter="url(#glow)">
      <circle cx="128" cy="128" r="102" fill="url(#assaultBg)" stroke="url(#gold)" stroke-width="9"/>
      <!-- Sweeping Crimson-Gold Energy Slash Arc -->
      <path d="M44 166 C60 80 124 38 204 52 C142 62 94 102 74 176 Z"
            fill="url(#crimsonGem)" opacity="0.9"/>
      <!-- Diagonal Broad Greatsword -->
      <g transform="translate(128 128) rotate(42)">
        <polygon points="0,-96 22,-58 16,38 -16,38 -22,-58"
                 fill="url(#silver)" stroke="#0f172a" stroke-width="6" stroke-linejoin="round"/>
        <polygon points="0,-88 8,-54 5,34 0,34" fill="#ffffff" opacity="0.75"/>
        <!-- Crossguard -->
        <polygon points="-44,32 44,32 34,52 -34,52" fill="url(#gold)" stroke="#0f172a" stroke-width="5" stroke-linejoin="round"/>
        <polygon points="0,24 14,42 0,60 -14,42" fill="url(#crimsonGem)" stroke="#0f172a" stroke-width="4"/>
        <!-- Grip & Pommel -->
        <rect x="-9" y="52" width="18" height="34" rx="4" fill="#3b0764" stroke="#0f172a" stroke-width="4"/>
        <circle cx="0" cy="92" r="12" fill="url(#gold)" stroke="#0f172a" stroke-width="4"/>
      </g>
      <!-- Spark Star -->
      <path d="M196 154 L204 170 L220 178 L204 186 L196 202 L188 186 L172 178 L188 170 Z" fill="#fef08a"/>
    </g>
  `,

  // RANGER: Sculpted Emerald-Gold Recurve Bow & Luminous Starlight Arrow
  role_ranger: `
    <g filter="url(#glow)">
      <circle cx="128" cy="128" r="102" fill="url(#rangerBg)" stroke="url(#gold)" stroke-width="9"/>
      <!-- Glowing Bowstring -->
      <polyline points="86,44 64,128 86,212" fill="none" stroke="#a7f3d0" stroke-width="5" stroke-linecap="round"/>
      <!-- Ornate Recurve Bow Limbs -->
      <path d="M84 42 C158 58 172 102 172 128 C172 154 158 198 84 214"
            fill="none" stroke="url(#gold)" stroke-width="15" stroke-linecap="round"/>
      <path d="M88 48 C150 64 162 104 162 128 C162 152 150 192 88 208"
            fill="none" stroke="#fef3c7" stroke-width="4" stroke-linecap="round" opacity="0.7"/>
      <!-- Nocked Starlight Arrow -->
      <rect x="64" y="122" width="134" height="12" rx="5" fill="url(#cyanGem)" stroke="#0f172a" stroke-width="4"/>
      <polygon points="228,128 182,104 192,128 182,152" fill="url(#cyanGem)" stroke="#0f172a" stroke-width="5" stroke-linejoin="round"/>
      <!-- Fletching Feathers -->
      <polygon points="56,128 82,108 98,108 76,128 98,148 82,148" fill="url(#emeraldGem)" stroke="#0f172a" stroke-width="4" stroke-linejoin="round"/>
      <!-- Central Emerald Grip Gem -->
      <polygon points="168,112 184,128 168,144 152,128" fill="url(#emeraldGem)" stroke="#0f172a" stroke-width="4"/>
    </g>
  `,

  // MAGE: Celestial Amethyst Astrolabe Star & Arcane Orbit Rings
  role_mage: `
    <g filter="url(#glow)">
      <circle cx="128" cy="128" r="102" fill="url(#mageBg)" stroke="url(#gold)" stroke-width="9"/>
      <!-- Tilted Arcane Orbit Rings -->
      <ellipse cx="128" cy="128" rx="84" ry="34" transform="rotate(-32 128 128)"
               fill="none" stroke="url(#cyanGem)" stroke-width="6" opacity="0.9"/>
      <ellipse cx="128" cy="128" rx="84" ry="34" transform="rotate(32 128 128)"
               fill="none" stroke="url(#gold)" stroke-width="6" opacity="0.9"/>
      <!-- 8-Point Celestial Starburst -->
      <path d="M128 34 L144 98 L206 86 L158 128 L206 170 L144 158 L128 222 L112 158 L50 170 L98 128 L50 86 L112 98 Z"
            fill="url(#gold)" stroke="#0f172a" stroke-width="5" stroke-linejoin="round"/>
      <!-- Luminous Amethyst Core Sphere -->
      <circle cx="128" cy="128" r="32" fill="url(#violetGem)" stroke="#0f172a" stroke-width="5"/>
      <circle cx="118" cy="118" r="11" fill="#ffffff" opacity="0.8"/>
      <!-- Orbiting Star Motes -->
      <circle cx="62" cy="78" r="7" fill="#fef08a"/>
      <circle cx="196" cy="176" r="7" fill="#38e8ff"/>
    </g>
  `,

  // HEALER: Radiant Angelic Winged Emerald-Gold Sanctuary Crest & Blossom Halo
  role_healer: `
    <g filter="url(#glow)">
      <circle cx="128" cy="128" r="102" fill="url(#healerBg)" stroke="url(#gold)" stroke-width="9"/>
      <!-- Angelic Wings -->
      <path d="M116 146 C76 146 44 114 38 78 C66 86 92 102 114 124 Z"
            fill="url(#gold)" stroke="#0f172a" stroke-width="5" stroke-linejoin="round"/>
      <path d="M140 146 C180 146 212 114 218 78 C190 86 164 102 142 124 Z"
            fill="url(#gold)" stroke="#0f172a" stroke-width="5" stroke-linejoin="round"/>
      <!-- Radiant Sanctuary Cross / Four-Petal Lotus -->
      <path d="M128 42 C144 76 148 96 148 110 C162 110 182 114 214 128 C182 142 162 146 148 146 C148 160 144 180 128 214 C112 180 108 160 108 146 C94 146 74 142 42 128 C74 114 94 110 108 110 C108 96 112 76 128 42 Z"
            fill="url(#emeraldGem)" stroke="#0f172a" stroke-width="6" stroke-linejoin="round"/>
      <!-- Golden Sun Heart Core -->
      <circle cx="128" cy="128" r="24" fill="url(#gold)" stroke="#0f172a" stroke-width="5"/>
      <circle cx="128" cy="128" r="11" fill="#ffffff" opacity="0.9"/>
    </g>
  `,
};

for (const [name, body] of Object.entries(roles)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">${DEFS}${body}</svg>`;
  const dest = path.join(outDir, `${name}.webp`);
  await sharp(Buffer.from(svg)).webp({ quality: 94, alphaQuality: 100 }).toFile(dest);
  console.log(`✓ public/assets/icons/${name}.webp`);
}
