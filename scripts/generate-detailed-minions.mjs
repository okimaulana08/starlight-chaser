import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

/**
 * Generates detailed cel-shaded anime-ink transparent WebP sprites (512x512)
 * for the 3 Chapter 1 enemy minions so they look like authentic RPG monsters
 * (and automatically get replaced whenever the user drops AI-generated JPG/PNGs
 * into public/assets/enemies/ and runs `npm run convert-sprites`).
 */
const OUT = path.resolve('public/assets/enemies');
fs.mkdirSync(OUT, { recursive: true });

async function renderTransparentWebp(svg, filename) {
  await sharp(Buffer.from(svg))
    .resize(512, 512)
    .webp({ quality: 92, alphaQuality: 100 })
    .toFile(path.join(OUT, filename));
  console.log(`✓ public/assets/enemies/${filename} (512x512 transparent)`);
}

// 1. VOID STALKER — Agile obsidian shadow-crystal beast lunging left
const voidStalkerSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="vsBody" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#312e81"/>
      <stop offset="50%" stop-color="#1e1b4b"/>
      <stop offset="100%" stop-color="#090718"/>
    </linearGradient>
    <linearGradient id="vsCrystal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f0abfc"/>
      <stop offset="50%" stop-color="#a855f7"/>
      <stop offset="100%" stop-color="#581c87"/>
    </linearGradient>
  </defs>
  <!-- Flowing smoky Void tail -->
  <path d="M355 285 Q445 250 475 180 Q445 285 385 335 Q435 320 465 290 Q420 355 340 345 Z" fill="#581c87" stroke="#090718" stroke-width="6"/>
  <!-- Back leg -->
  <path d="M310 315 L365 395 L345 452 L305 452 L318 396 L278 338 Z" fill="#171338" stroke="#070512" stroke-width="7"/>
  <!-- Jagged crystal dorsal spines -->
  <polygon points="215,175 245,95 278,180" fill="url(#vsCrystal)" stroke="#090718" stroke-width="6"/>
  <polygon points="268,195 318,118 334,212" fill="url(#vsCrystal)" stroke="#090718" stroke-width="6"/>
  <polygon points="325,222 385,165 372,258" fill="url(#vsCrystal)" stroke="#090718" stroke-width="6"/>
  <!-- Muscular beast torso -->
  <path d="M130 250 Q195 168 330 205 Q395 235 375 318 Q325 352 215 340 Q140 330 130 250 Z" fill="url(#vsBody)" stroke="#070512" stroke-width="8"/>
  <!-- Glowing purple rib-rift cracks -->
  <path d="M210 245 L245 275 L228 308 M265 238 L295 272 L278 310" fill="none" stroke="#e879f9" stroke-width="6" stroke-linecap="round"/>
  <!-- Front slashing claw legs -->
  <path d="M168 305 L118 390 L78 446 L124 448 L156 396 L205 330 Z" fill="#231d52" stroke="#070512" stroke-width="7"/>
  <path d="M225 325 L196 408 L175 462 L218 462 L238 408 L266 340 Z" fill="#1e1b4b" stroke="#070512" stroke-width="7"/>
  <!-- Razor glowing amethyst claws -->
  <polygon points="78,446 42,462 96,458" fill="#f0abfc"/>
  <polygon points="175,462 142,475 196,472" fill="#f0abfc"/>
  <!-- Fierce horned predator head facing LEFT -->
  <path d="M52 255 L118 188 L195 196 L218 248 L175 305 L95 298 L58 278 Z" fill="url(#vsBody)" stroke="#070512" stroke-width="8"/>
  <!-- Swept obsidian horns -->
  <path d="M130 194 L188 122 L175 198 Z" fill="#0f0b24" stroke="#a855f7" stroke-width="4"/>
  <!-- Snarling jaw & crimson eye -->
  <path d="M62 276 L112 288 L95 304 L68 292 Z" fill="#f43f5e" stroke="#070512" stroke-width="4"/>
  <polygon points="94,234 134,224 124,248 92,246" fill="#ff2e63"/>
  <circle cx="108" cy="236" r="5" fill="#ffffff"/>
</svg>`;

// 2. RIFT ACOLYTE — Hovering corrupted Void mage in gold-trimmed indigo robes with staff & amethyst orb
const riftAcolyteSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="raRobe" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0%" stop-color="#3b0764"/>
      <stop offset="55%" stop-color="#1e1b4b"/>
      <stop offset="100%" stop-color="#0f0720"/>
    </linearGradient>
    <radialGradient id="raOrb" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="35%" stop-color="#f0abfc"/>
      <stop offset="75%" stop-color="#a855f7"/>
      <stop offset="100%" stop-color="#581c87" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <!-- Arcane halo ring behind hood -->
  <circle cx="285" cy="145" r="78" fill="none" stroke="#f5c84c" stroke-width="5" stroke-dasharray="18 10" opacity="0.8"/>
  <!-- Flowing tattered Void cloak -->
  <path d="M210 175 L350 175 L408 420 L345 385 L312 456 L262 396 L218 462 L175 395 L140 432 Z" fill="url(#raRobe)" stroke="#070512" stroke-width="8"/>
  <!-- Ornate gold cultist sash & mantle -->
  <path d="M205 182 L355 182 L378 258 L322 238 L280 288 L236 238 L184 258 Z" fill="#2e1065" stroke="#f5c84c" stroke-width="6"/>
  <path d="M264 252 L296 252 L310 410 L280 435 L250 410 Z" fill="#4c1d95" stroke="#f5c84c" stroke-width="4"/>
  <!-- Deep pointed hood & fractured dark porcelain mask facing left -->
  <path d="M206 178 Q215 72 292 64 Q366 76 368 182 L285 212 Z" fill="#1e1b4b" stroke="#070512" stroke-width="8"/>
  <path d="M214 148 Q218 96 266 96 Q298 102 296 156 Q276 196 242 192 Q216 184 214 148 Z" fill="#110c21" stroke="#f5c84c" stroke-width="4"/>
  <!-- Glowing violet visor slit -->
  <polygon points="222,140 264,132 258,150 226,152" fill="#f0abfc"/>
  <circle cx="242" cy="142" r="5" fill="#ffffff"/>
  <!-- Extended casting sleeve & Void staff on LEFT -->
  <path d="M225 225 L128 242 L138 292 L222 276 Z" fill="#2e1065" stroke="#070512" stroke-width="6"/>
  <line x1="112" y1="128" x2="148" y2="442" stroke="#eab308" stroke-width="11" stroke-linecap="round"/>
  <path d="M84 145 Q112 84 144 145 Q112 118 84 145 Z" fill="#f5c84c" stroke="#070512" stroke-width="4"/>
  <!-- Floating blazing amethyst orb -->
  <circle cx="110" cy="120" r="46" fill="url(#raOrb)"/>
  <circle cx="110" cy="120" r="18" fill="#ffffff" opacity="0.92"/>
</svg>`;

// 3. ARMORED GOLEM — Heavy weathered marble-and-gold guardian with glowing Void core & massive gauntlets
const armoredGolemSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="agStone" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f1ebe0"/>
      <stop offset="55%" stop-color="#c9c2b4"/>
      <stop offset="100%" stop-color="#7c7a85"/>
    </linearGradient>
    <linearGradient id="agGold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fde68a"/>
      <stop offset="55%" stop-color="#d99b1e"/>
      <stop offset="100%" stop-color="#784c0c"/>
    </linearGradient>
  </defs>
  <!-- Heavy pillar legs -->
  <path d="M168 332 L236 332 L226 472 L152 472 Z" fill="url(#agStone)" stroke="#1e1b2e" stroke-width="9"/>
  <path d="M282 332 L352 332 L366 472 L292 472 Z" fill="url(#agStone)" stroke="#1e1b2e" stroke-width="9"/>
  <rect x="148" y="438" width="84" height="34" rx="6" fill="url(#agGold)" stroke="#1e1b2e" stroke-width="6"/>
  <rect x="286" y="438" width="84" height="34" rx="6" fill="url(#agGold)" stroke="#1e1b2e" stroke-width="6"/>
  <!-- Massive Barrel Marble Torso -->
  <polygon points="122,148 392,148 358,346 154,346" fill="url(#agStone)" stroke="#1e1b2e" stroke-width="10"/>
  <!-- Gold chest bands -->
  <polygon points="134,158 380,158 370,192 144,192" fill="url(#agGold)" stroke="#1e1b2e" stroke-width="6"/>
  <polygon points="158,314 354,314 348,346 164,346" fill="url(#agGold)" stroke="#1e1b2e" stroke-width="6"/>
  <!-- Cracked glowing Void Amethyst Core -->
  <polygon points="256,198 302,254 256,310 210,254" fill="#a855f7" stroke="#f5d0fe" stroke-width="6"/>
  <polygon points="256,222 278,254 256,286 234,254" fill="#ffffff" opacity="0.92"/>
  <path d="M175 215 L212 248 M336 220 L298 250" stroke="#c084fc" stroke-width="6" stroke-linecap="round"/>
  <!-- Colossal Shoulder Pauldrons -->
  <path d="M52 215 Q82 118 175 134 L165 244 L72 252 Z" fill="url(#agStone)" stroke="#1e1b2e" stroke-width="9"/>
  <path d="M460 215 Q430 118 337 134 L347 244 L440 252 Z" fill="url(#agStone)" stroke="#1e1b2e" stroke-width="9"/>
  <!-- Massive Stone Slam Gauntlets -->
  <rect x="42" y="252" width="102" height="122" rx="18" fill="url(#agStone)" stroke="#1e1b2e" stroke-width="9"/>
  <rect x="46" y="264" width="94" height="24" fill="url(#agGold)" stroke="#1e1b2e" stroke-width="5"/>
  <rect x="368" y="248" width="102" height="122" rx="18" fill="url(#agStone)" stroke="#1e1b2e" stroke-width="9"/>
  <rect x="372" y="260" width="94" height="24" fill="url(#agGold)" stroke="#1e1b2e" stroke-width="5"/>
  <!-- Armored Monolith Head with glowing violet visor -->
  <rect x="196" y="66" width="120" height="92" rx="16" fill="url(#agStone)" stroke="#1e1b2e" stroke-width="9"/>
  <polygon points="212,66 256,32 300,66" fill="url(#agGold)" stroke="#1e1b2e" stroke-width="6"/>
  <rect x="218" y="102" width="76" height="20" rx="6" fill="#1e1b2e"/>
  <rect x="226" y="107" width="60" height="10" rx="4" fill="#e879f9"/>
</svg>`;

await renderTransparentWebp(voidStalkerSvg, 'enemy_void_stalker.webp');
await renderTransparentWebp(riftAcolyteSvg, 'enemy_rift_acolyte.webp');
await renderTransparentWebp(armoredGolemSvg, 'enemy_armored_golem.webp');
