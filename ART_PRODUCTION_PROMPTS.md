# Starlight Chasers — External Art Production Prompt Guide

Drop any generated image directly into the listed path under `public/assets/` (as `.webp`, or run `node scripts/convert-webp.mjs <input> <target> <width> <height>` to auto-resize & convert PNG/JPG to 88% WebP). The game **automatically loads** every file at these exact paths with zero code changes!

> **Already AI-Generated (Ready in Project):**
> - `public/assets/heroes/hero_vaelen_card.webp` (Vaelen — SSR)
> - `public/assets/heroes/hero_seraphina_card.webp` (Seraphina — SSR)
> - `public/assets/heroes/hero_elara_card.webp` (Elara — SSR)
> - `public/assets/cutins/cutin_vaelen.webp`, `cutin_seraphina.webp`, `cutin_elara.webp`

---

## Global Style & Negative Prompt (Apply to Every Generation)
* **Style Prefix:** `High-detail Japanese anime-fantasy illustration (Grand Chase / Epic Seven / Genshin Impact art quality), painterly cel-shaded lighting, crisp dark linework, dynamic depth, cinematic rim light, vibrant clean colors.`
* **Negative Prompt (Mandatory):** `text, letters, numbers, typography, card frame, border, UI elements, rarity stars, logo, signature, watermark, blurry, low quality, cropped head`

---

## 1. Remaining 9 Hero Portraits (`3:4 Vertical` — Target `600x800` or `900x1200`)

### 1.1 Draven (SSR Tank | Ashen Legion)
* **Drop Path:** `public/assets/heroes/hero_draven_card.webp`
* **Prompt:**
> Vertical 3:4 portrait, high-detail Japanese anime-fantasy painterly illustration, crisp dark linework. Imposing muscular male vanguard juggernaut of Ashen Legion with fierce amber eyes, short dark volcanic hair, and glowing lava veins etched across dark obsidian-and-copper heavy battle armor. Gripping a colossal molten-core warhammer resting on his shoulder, magma embers and volcanic ash swirling around him, massive glowing underground forge caldera background, intense orange rim lighting. No text, no card frame, no border, no logo, no watermark.

### 1.2 Garrick (SR Tank | Solaris Vanguard)
* **Drop Path:** `public/assets/heroes/hero_garrick_card.webp`
* **Prompt:**
> Vertical 3:4 portrait, high-detail Japanese anime-fantasy painterly illustration, crisp dark linework. Broad-shouldered veteran paladin guardian of Solaris Vanguard with short scarred jawline and iron-grey hair, clad in heavy white-steel and gold plated armor. Planting a massive hexagonal golden-trimmed tower shield glowing with kinetic barrier runes into cracked marble ground, heroic low-angle perspective, sunlit sky fortress pillars behind him. No text, no card frame, no border, no logo, no watermark.

### 1.3 Lyra (SR Healer | Verdant Covenant)
* **Drop Path:** `public/assets/heroes/hero_lyra_card.webp`
* **Prompt:**
> Vertical 3:4 portrait, high-detail Japanese anime-fantasy painterly illustration, crisp dark linework. Gentle elven-styled spirit healer of Verdant Covenant with braided emerald-white hair adorned with luminous blossoms, wearing flowing ivory-and-sage silken vestments. Holding a wooden crescent chime staff releasing swirling golden-green healing petals and glowing dew droplets, enchanted sunlit ancient forest background, warm radiant lighting. No text, no card frame, no border, no logo, no watermark.

### 1.4 Raze (SR Assault | Ashen Legion)
* **Drop Path:** `public/assets/heroes/hero_raze_card.webp`
* **Prompt:**
> Vertical 3:4 portrait, high-detail Japanese anime-fantasy painterly illustration, crisp dark linework. Fierce agile male mercenary of Ashen Legion with spiky ash-blonde hair, a dark leather half-cloak, and jagged bronze shoulder guards. Swinging a glowing red-hot chained war-scythe wrapped in blazing embers, dynamic lunging action pose, sparks flying across a smoky industrial lava canyon background, dramatic crimson-orange backlighting. No text, no card frame, no border, no logo, no watermark.

### 1.5 Orion (SR Ranger | Astral Sanctum)
* **Drop Path:** `public/assets/heroes/hero_orion_card.webp`
* **Prompt:**
> Vertical 3:4 portrait, high-detail Japanese anime-fantasy painterly illustration, crisp dark linework. Cool composed male marksman of Astral Sanctum with sleek slate-blue hair and a glowing holographic monocle over one eye, wearing a tailored dark indigo-and-silver longcoat with brass astronomy buckles. Dual-wielding intricate crystal-powered astral flintlock pistols emitting bright cyan plasma trails, hovering star beacon behind him, starry twilight tower backdrop. No text, no card frame, no border, no logo, no watermark.

### 1.6 Kael (R Ranger | Verdant Covenant)
* **Drop Path:** `public/assets/heroes/hero_kael_card.webp`
* **Prompt:**
> Vertical 3:4 portrait, high-detail Japanese anime-fantasy painterly illustration, crisp dark linework. Agile young male wind archer of Verdant Covenant with tousled windswept auburn hair, wearing a lightweight forest-green leather scarf and scout cloak. Drawing a recurve bow nocked with a glowing emerald-cyan wind arrow, swirling air currents and flying leaves around him, dynamic mid-leap forest cliff background. No text, no card frame, no border, no logo, no watermark.

### 1.7 Nyx (R Mage | Ashen Legion)
* **Drop Path:** `public/assets/heroes/hero_nyx_card.webp`
* **Prompt:**
> Vertical 3:4 portrait, high-detail Japanese anime-fantasy painterly illustration, crisp dark linework. Confident young female pyromancer of Ashen Legion with sharp crimson eyes and wavy charcoal-black hair glowing with ember tips, wearing a dark bronze-and-crimson hooded coat with mechanical brass clasps. Conjuring swirling molten ember orbs in both hands, volcanic ash sparks and glowing forge ruins in background, intense orange rim lighting. No text, no card frame, no border, no logo, no watermark.

### 1.8 Titus (R Tank | Astral Sanctum)
* **Drop Path:** `public/assets/heroes/hero_titus_card.webp`
* **Prompt:**
> Vertical 3:4 portrait, high-detail Japanese anime-fantasy painterly illustration, crisp dark linework. Steadfast young male sentinel of Astral Sanctum with short midnight-navy hair and focused silver eyes, clad in polished silver-indigo crystal-inlaid medium armor. Bracing behind a translucent faceted prism buckler reflecting streaks of violet magic, glowing crystalline courtyard backdrop, crisp cool moonlight shading. No text, no card frame, no border, no logo, no watermark.

### 1.9 Clara (R Healer | Solaris Vanguard)
* **Drop Path:** `public/assets/heroes/hero_clara_card.webp`
* **Prompt:**
> Vertical 3:4 portrait, high-detail Japanese anime-fantasy painterly illustration, crisp dark linework. Warm cheerful young female acolyte of Solaris Vanguard with wavy golden-blonde hair and bright sky-blue eyes, wearing a crisp white-and-gold trimmed ceremonial cloak. Raising an ornate brass sunburst lantern radiating soft golden healing light, sunlit marble archway with floating dust motes in background, uplifting warm daylight lighting. No text, no card frame, no border, no logo, no watermark.

---

## 2. All 8 Starlight Relics (`3:4 Vertical` — Target `600x800`)

### 2.1 Blade of the First Eclipse (SSR)
* **Drop Path:** `public/assets/relics/relic_first_eclipse.webp`
* **Prompt:**
> Vertical 3:4 portrait, high-detail Japanese anime-fantasy item illustration, crisp linework, painterly lighting. Legendary ornate celestial longsword floating vertically, half forged from radiant sun-gold metal and half infused with dark violet eclipse crystal energy, swirling starlight motes around the blade, dramatic dark indigo atmospheric background. No text, no card frame, no border, no logo, no watermark.

### 2.2 Astrolabe of Lumina (SSR)
* **Drop Path:** `public/assets/relics/relic_astrolabe_lumina.webp`
* **Prompt:**
> Vertical 3:4 portrait, high-detail Japanese anime-fantasy item illustration, crisp linework, painterly lighting. Intricate antique silver-and-gold celestial astrolabe with rotating concentric star rings encasing a hovering glowing cyan galaxy core, shimmering constellation runes orbiting in mid-air, deep starlight violet background. No text, no card frame, no border, no logo, no watermark.

### 2.3 Heart of the Obsidian Forge (SSR)
* **Drop Path:** `public/assets/relics/relic_obsidian_forge.webp`
* **Prompt:**
> Vertical 3:4 portrait, high-detail Japanese anime-fantasy item illustration, crisp linework, painterly lighting. Massive jagged volcanic obsidian crystal core cracked with blazing rivers of molten gold-orange lava, bound by intricate heavy dark-iron forge rings floating in mid-air, rising glowing embers and heat shimmer against a dark volcanic cavern backdrop. No text, no card frame, no border, no logo, no watermark.

### 2.4 Bowstring of the Falling Star (SSR)
* **Drop Path:** `public/assets/relics/relic_falling_star_bow.webp`
* **Prompt:**
> Vertical 3:4 portrait, high-detail Japanese anime-fantasy item illustration, crisp linework, painterly lighting. Ethereal crystalline silver-and-emerald recurve longbow hovering diagonally, its bowstring woven from pure glowing cyan starlight filaments with a radiant arrow of condensed moonlight hovering on the rest, floating glowing petals and stardust in a deep twilight forest backdrop. No text, no card frame, no border, no logo, no watermark.

### 2.5 Tear of the World Tree (SR)
* **Drop Path:** `public/assets/relics/relic_world_tree_tear.webp`
* **Prompt:**
> Vertical 3:4 portrait, high-detail Japanese anime-fantasy item illustration, crisp linework, painterly lighting. Luminous teardrop-shaped emerald crystal artifact cradled inside delicate golden vine filigree, glowing warm healing dewlight radiating from within, floating luminous pollen and tiny green leaves against a soft twilight forest backdrop. No text, no card frame, no border, no logo, no watermark.

### 2.6 Chain of the Cinder Warden (SR)
* **Drop Path:** `public/assets/relics/relic_cinder_chain.webp`
* **Prompt:**
> Vertical 3:4 portrait, high-detail Japanese anime-fantasy item illustration, crisp linework, painterly lighting. Heavy coiled blackened-steel war chains linked to a glowing ember-forged hook blade, incandescent red-orange runes etched into every link, floating volcanic sparks against a dark smoky copper background. No text, no card frame, no border, no logo, no watermark.

### 2.7 Prism Aegis Core (SR)
* **Drop Path:** `public/assets/relics/relic_prism_aegis.webp`
* **Prompt:**
> Vertical 3:4 portrait, high-detail Japanese anime-fantasy item illustration, crisp linework, painterly lighting. Ornate hexagonal translucent sapphire-and-silver crystal shield crest floating upright, refracting vivid rainbow-cyan starlight beams outward with geometric arcane barrier rings, dark starry indigo backdrop. No text, no card frame, no border, no logo, no watermark.

### 2.8 Lantern of Dawnlight (R)
* **Drop Path:** `public/assets/relics/relic_dawnlight_lantern.webp`
* **Prompt:**
> Vertical 3:4 portrait, high-detail Japanese anime-fantasy item illustration, crisp linework, painterly lighting. Delicate antique gold-and-ivory filigree lantern containing a floating miniature sun flame, casting warm golden rays and sparkling light motes against a soft dawn blue-and-peach sky backdrop. No text, no card frame, no border, no logo, no watermark.

---

## 3. World Environments & Boss (`16:9` & `1:1`) — HIGHEST VISUAL IMPACT!

### 3.1 Lobby Full-Screen Background (`16:9` — `1920x1080`) **[AUTO-LOADED BY LOBBY]**
* **Drop Path:** `public/assets/environments/bg_lobby_aurelia.webp`
* **Prompt:**
> Wide 16:9 anime-fantasy game lobby background illustration, painterly Ghibli meets Honkai Star Rail and Grand Chase style. Grand floating sky-fortress terrace of Aurelia Bastion high above golden sunlit clouds, ruined white marble pillars with subtle gilded carvings, distant fractured celestial Star Pillar glowing in a deep twilight-to-azure sky with a faint violet starlight rift high in the heavens, floating golden dust motes and warm volumetric sunlight rays, clean open composition suitable behind UI characters. No characters, no people, no text, no UI.

### 3.2 Chapter 1 Combat Arena Floor (`16:9` — `2560x1440`) **[AUTO-LOADED BY PIXI ENGINE]**
* **Drop Path:** `public/assets/environments/env_aurelia_floor.webp`
* **Prompt:**
> Wide 16:9 high-angle 2.5D top-down isometric game battle arena map of Aurelia Bastion sky-fortress courtyard, painterly anime RPG environment art. Wide playable open platform made of soft sunlit white-cream weathered marble flagstones with delicate muted gold geometric compass inlays (controlled 35-45% soft saturation so combat characters stand out clearly), cracked stone balustrade edges overlooking soft blue sky clouds below, small shattered marble pillar ruins only along the far outer border, even clean lighting, no characters, no monsters, no text, no UI.

### 3.3 Boss: Aurelian Sentinel (Corrupted) (`1:1` — `1024x1024`, remove background to transparent PNG/WebP!)
* **Drop Path:** `public/assets/enemies/boss_aurelian_sentinel.webp`
* **Prompt:**
> 1:1 full-body anime-fantasy RPG boss sprite on a solid pure white background (for easy background removal), crisp dark linework, painterly cel-shading. Colossal corrupted stone-and-gold armored construct knight "Aurelian Sentinel" standing in a dynamic 3/4 combat stance facing left, wearing a fractured golden royal crown, blazing violet Void Rift energy erupting through cracks in its marble chestplate, gripping a massive gilded-and-amethyst war halberd. Clean silhouette, no ground shadow box, no text, no border.

---

## 4. Panoramic Ultimate Cut-Ins (`21:9 Ultra-Wide` — `1920x720`, Optional Custom Close-Ups)
*(Vaelen, Seraphina, and Elara already have focal-cropped AI Cut-Ins; you can optionally generate dedicated ultra-wide dramatic eye close-ups for any SSR/SR hero below.)*

* **`public/assets/cutins/cutin_vaelen.webp`:** Ultra-wide 21:9 anime ultimate cut-in banner, dramatic close-up of silver-haired male knight Vaelen's fiercely glowing golden eyes, radiant violet-gold eclipse greatsword reflecting light diagonally across the frame, intense golden speed-lines, no text.
* **`public/assets/cutins/cutin_seraphina.webp`:** Ultra-wide 21:9 anime ultimate cut-in banner, dramatic close-up of serene midnight-blue haired mage Seraphina with glowing cyan constellation sigils rotating in her eyes, floating stardust and sapphire-violet speed-lines, no text.
* **`public/assets/cutins/cutin_draven.webp`:** Ultra-wide 21:9 anime ultimate cut-in banner, dramatic close-up of fierce juggernaut Draven's burning amber eyes, molten cracks glowing across dark obsidian armor, volcanic sparks and crimson-orange speed-lines, no text.
* **`public/assets/cutins/cutin_elara.webp`:** Ultra-wide 21:9 anime ultimate cut-in banner, dramatic close-up of silver-emerald haired archer Elara aiming sharply behind a glowing crystalline starlight bow, cyan orbital light beams and emerald speed-lines, no text.
* **`public/assets/cutins/cutin_garrick.webp`:** Ultra-wide 21:9 anime ultimate cut-in banner, dramatic close-up of veteran paladin Garrick raising his golden hexagonal kinetic tower shield, radiant sunlit aura and gold speed-lines, no text.
* **`public/assets/cutins/cutin_lyra.webp`:** Ultra-wide 21:9 anime ultimate cut-in banner, dramatic close-up of gentle spirit healer Lyra with glowing emerald-gold eyes surrounded by swirling luminous blossom petals and dewlight, no text.
* **`public/assets/cutins/cutin_raze.webp`:** Ultra-wide 21:9 anime ultimate cut-in banner, dramatic close-up of mercenary Raze's fierce smirk behind glowing red-hot ember chains slashing diagonally across the screen, crimson sparks, no text.
* **`public/assets/cutins/cutin_orion.webp`:** Ultra-wide 21:9 anime ultimate cut-in banner, dramatic close-up of marksman Orion's glowing cyan holographic monocle locking onto target with twin plasma laser lines, indigo starlight speed-lines, no text.

---

## 5. Quick Drop-In Conversion Command
After generating PNG/JPG files elsewhere, run this command from the project root to auto-resize and save crisp 88% WebP assets directly into `public/assets/`:
```bash
node scripts/convert-webp.mjs "path/to/your_image.png" "public/assets/heroes/hero_draven_card.webp" 600 800
```
*(For `bg_lobby_aurelia.webp` use `1920 1080`; for `env_aurelia_floor.webp` use `2560 1440`; for transparent `boss_aurelian_sentinel.webp` use `1024 1024`.)*


---

## 6. Full-Body 2.5D Battle Sprites (`1:1` on Pure Solid White `#FFFFFF` Background)
Drop `.jpg` or `.png` files into `public/assets/sprites/` (for Heroes) or `public/assets/enemies/` (for Minions), then run:
```bash
npm run convert-sprites
```
The script automatically strips the solid white background into razor-sharp transparent alpha `.webp` (just like `boss_aurelian_sentinel.webp`) and the 2.5D combat engine loads them automatically!

### 6.1 Enemy Minion Battle Sprites (`public/assets/enemies/` — Facing LEFT)
* **`enemy_void_stalker.jpg`:** `1:1 full-body anime RPG monster battle sprite on a PURE SOLID FLAT WHITE BACKGROUND (#FFFFFF), crisp dark ink outlines, cel-shaded Japanese anime RPG style. Menacing agile shadow-crystal void hound creature "Void Stalker" in a lunging 3/4 combat stance facing LEFT, sleek obsidian chitin armor with glowing amethyst crystal spines along its back and fierce glowing crimson eyes, razor shadow claws. Full body visible with margin, NO ground shadow, NO floor, NO scenery, NO text.`
* **`enemy_rift_acolyte.jpg`:** `1:1 full-body anime RPG monster battle sprite on a PURE SOLID FLAT WHITE BACKGROUND (#FFFFFF), crisp dark ink outlines, cel-shaded Japanese anime RPG style. Floating corrupted Void cultist caster "Rift Acolyte" hovering in a 3/4 combat stance facing LEFT, wearing tattered deep-indigo and gold-trimmed hooded robes with a fractured dark mask showing a glowing magenta eye, channeling a hovering purple Void energy orb above its staff. Full body visible with margin, NO ground shadow, NO floor, NO scenery, NO text.`
* **`enemy_armored_golem.jpg`:** `1:1 full-body anime RPG monster battle sprite on a PURE SOLID FLAT WHITE BACKGROUND (#FFFFFF), crisp dark ink outlines, cel-shaded Japanese anime RPG style. Heavy corrupted ancient marble construct "Armored Golem" standing in an imposing 3/4 combat stance facing LEFT, chunky weathered white-stone and gold-banded body plates with glowing purple Void crystal core embedded in its chest and massive stone gauntlets raised to slam. Full body visible with margin, NO ground shadow, NO floor, NO scenery, NO text.`

### 6.2 Hero Full-Body 2.5D Battle Sprites (`public/assets/sprites/` — Facing RIGHT)
*(Heroic 3-head semi-chibi / Grand Chase Mobile proportions, full body head-to-boots on pure solid `#FFFFFF` white background, NO ground shadow, NO floor, NO text!)*
* **`battle_vaelen.jpg`:** `1:1 full-body 2.5D anime RPG combat sprite on PURE SOLID WHITE BACKGROUND (#FFFFFF), crisp dark ink outlines, Grand Chase Mobile 3-head semi-chibi cel-shaded style. Silver-haired young knight Vaelen in white-and-gold armor with starry torn dark navy cape, dynamic 3/4 combat stance facing RIGHT, gripping radiant golden-violet eclipse greatsword. Full body head-to-boots, no shadow, no floor, no text.`
* **`battle_seraphina.jpg`:** `1:1 full-body 2.5D anime RPG combat sprite on PURE SOLID WHITE BACKGROUND (#FFFFFF), crisp dark ink outlines, Grand Chase Mobile 3-head semi-chibi cel-shaded style. Midnight-blue haired astral mage Seraphina in indigo-and-silver astronomer robes with celestial ribbons, 3/4 combat stance facing RIGHT, holding crystal astrolabe staff with 3 tiny cyan star orbs. Full body head-to-boots, no shadow, no floor, no text.`
* **`battle_draven.jpg`:** `1:1 full-body 2.5D anime RPG combat sprite on PURE SOLID WHITE BACKGROUND (#FFFFFF), crisp dark ink outlines, Grand Chase Mobile 3-head semi-chibi cel-shaded style. Muscular juggernaut Draven in dark obsidian-and-copper volcanic armor glowing with molten lava cracks, 3/4 combat stance facing RIGHT, hefting a massive molten-core warhammer. Full body head-to-boots, no shadow, no floor, no text.`
* **`battle_elara.jpg`:** `1:1 full-body 2.5D anime RPG combat sprite on PURE SOLID WHITE BACKGROUND (#FFFFFF), crisp dark ink outlines, Grand Chase Mobile 3-head semi-chibi cel-shaded style. Silver-emerald haired archer Elara in forest-teal and pearl-white ranger mantle, 3/4 combat stance facing RIGHT, drawing a glowing crystalline starlight longbow. Full body head-to-boots, no shadow, no floor, no text.`
* **`battle_garrick.jpg`:** `1:1 full-body 2.5D anime RPG combat sprite on PURE SOLID WHITE BACKGROUND (#FFFFFF), crisp dark ink outlines, Grand Chase Mobile 3-head semi-chibi cel-shaded style. Veteran iron-grey haired paladin Garrick in heavy white-steel and gold armor, sturdy 3/4 stance facing RIGHT, bracing a hexagonal golden tower shield with cyan runes. Full body head-to-boots, no shadow, no floor, no text.`
* **`battle_lyra.jpg`:** `1:1 full-body 2.5D anime RPG combat sprite on PURE SOLID WHITE BACKGROUND (#FFFFFF), crisp dark ink outlines, Grand Chase Mobile 3-head semi-chibi cel-shaded style. Gentle elven healer Lyra with braided emerald-white hair in flowing ivory-and-sage vestments, 3/4 casting stance facing RIGHT, holding wooden crescent chime staff with glowing petals. Full body head-to-boots, no shadow, no floor, no text.`
* **`battle_raze.jpg`:** `1:1 full-body 2.5D anime RPG combat sprite on PURE SOLID WHITE BACKGROUND (#FFFFFF), crisp dark ink outlines, Grand Chase Mobile 3-head semi-chibi cel-shaded style. Agile ash-blonde mercenary Raze in dark leather cloak and bronze pauldrons, fierce 3/4 combat stance facing RIGHT, swinging a glowing red-hot chained war-scythe. Full body head-to-boots, no shadow, no floor, no text.`
* **`battle_orion.jpg`:** `1:1 full-body 2.5D anime RPG combat sprite on PURE SOLID WHITE BACKGROUND (#FFFFFF), crisp dark ink outlines, Grand Chase Mobile 3-head semi-chibi cel-shaded style. Cool slate-blue haired marksman Orion with glowing cyan monocle and dark indigo-silver longcoat, 3/4 combat stance facing RIGHT, aiming twin crystal astral flintlock pistols. Full body head-to-boots, no shadow, no floor, no text.`
* **`battle_kael.jpg`:** `1:1 full-body 2.5D anime RPG combat sprite on PURE SOLID WHITE BACKGROUND (#FFFFFF), crisp dark ink outlines, Grand Chase Mobile 3-head semi-chibi cel-shaded style. Agile auburn-haired wind scout Kael in forest-green scarf and leather cloak, 3/4 combat stance facing RIGHT, drawing a recurve bow with a glowing emerald wind arrow. Full body head-to-boots, no shadow, no floor, no text.`
* **`battle_nyx.jpg`:** `1:1 full-body 2.5D anime RPG combat sprite on PURE SOLID WHITE BACKGROUND (#FFFFFF), crisp dark ink outlines, Grand Chase Mobile 3-head semi-chibi cel-shaded style. Confident charcoal-haired pyromancer Nyx with ember-tipped hair in dark crimson-and-bronze hooded coat, 3/4 casting stance facing RIGHT, conjuring glowing molten fire orbs. Full body head-to-boots, no shadow, no floor, no text.`
* **`battle_titus.jpg`:** `1:1 full-body 2.5D anime RPG combat sprite on PURE SOLID WHITE BACKGROUND (#FFFFFF), crisp dark ink outlines, Grand Chase Mobile 3-head semi-chibi cel-shaded style. Steadfast navy-haired sentinel Titus in polished silver-indigo crystal armor, 3/4 guard stance facing RIGHT, bracing a faceted translucent prism buckler. Full body head-to-boots, no shadow, no floor, no text.`
* **`battle_clara.jpg`:** `1:1 full-body 2.5D anime RPG combat sprite on PURE SOLID WHITE BACKGROUND (#FFFFFF), crisp dark ink outlines, Grand Chase Mobile 3-head semi-chibi cel-shaded style. Cheerful golden-blonde healer Clara in white-and-gold ceremonial cloak, 3/4 stance facing RIGHT, raising an ornate glowing brass sunburst lantern staff. Full body head-to-boots, no shadow, no floor, no text.`

---

## 7. Bespoke RPG Menu Icons (`public/assets/icons/icon_<name>.webp` — `256x256` Transparent)
*(All 10 icons are already generated in `public/assets/icons/` using `node scripts/generate-game-icons.mjs`! If you ever want hand-painted AI upgrades, drop 1:1 transparent WebPs to these exact filenames and the game auto-loads them via `<GameIcon />`:)*

* **`icon_battle.webp`** — Crossed metallic-gold & violet starlight swords on a gilded celestial crest badge, glossy cel-shaded mobile anime RPG icon, transparent background.
* **`icon_heroes.webp`** — Winged royal paladin shield emblem with glowing cyan visor, gold trim, glossy cel-shaded mobile anime RPG icon, transparent background.
* **`icon_summon.webp`** — Floating iridescent cyan-violet Starlight Prism crystal orbited by golden star rings, glossy anime RPG gacha icon, transparent background.
* **`icon_codex.webp`** — Ornate deep-indigo & gold-bound celestial grimoire with glowing amethyst star clasp, glossy anime RPG icon, transparent background.
* **`icon_forge.webp`** — Glowing golden-rimmed blacksmith hammer striking a steel anvil with bright ember sparks, glossy anime RPG icon, transparent background.
* **`icon_worldmap.webp`** — Gilded celestial astrolabe compass rose with luminous cyan star core, glossy anime RPG icon, transparent background.
* **`icon_crystal.webp`** — Faceted glowing cyan Starlight Crystal gem, crisp dark outlines, glossy anime RPG currency icon, transparent background.
* **`icon_gold.webp`** — Gleaming stamped golden Aurelian star coin stack, crisp dark outlines, glossy anime RPG currency icon, transparent background.
* **`icon_relic.webp`** — Radiant amethyst starlight relic diamond haloed by dashed golden rune ring, glossy anime RPG icon, transparent background.
* **`icon_supply.webp`** — Gilded mahogany-and-gold RPG treasure chest with glowing cyan keyhole gem, glossy anime RPG icon, transparent background.

### 7.1 Class / Job Role Badges (`public/assets/icons/role_<role>.webp` — `256x256` Transparent)
*(All 5 role emblems are generated via `node scripts/generate-role-icons.mjs` and auto-loaded by `<RoleBadge />` across cards, Codex, Summon, Squad, and Lobby:)*
* **`role_tank.webp`** — Royal sapphire & gold kite tower shield with glowing cyan core gem.
* **`role_assault.webp`** — Blazing crimson-gold greatsword with sweeping energy slash arc.
* **`role_ranger.webp`** — Sculpted emerald-gold recurve bow nocked with a glowing cyan starlight arrow.
* **`role_mage.webp`** — Celestial amethyst 8-point astrolabe starburst with orbiting cyan & gold rings.
* **`role_healer.webp`** — Radiant winged emerald-gold sanctuary lotus halo with golden sun core.
