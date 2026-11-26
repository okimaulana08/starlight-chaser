import type { Faction, FactionDef } from '../types/game';

export const FACTIONS: Record<Faction, FactionDef> = {
  SOLARIS: {
    id: 'SOLARIS',
    name: 'Solaris Vanguard',
    chapterTitle: 'Ch. 1: Aurelia Bastion',
    biomeTheme: 'Sunlit marble citadel, gilded pillars, azure sky ruins',
    color: '#f5c84c',
    accentHex: 0xf5c84c,
    bonus2Desc: '+10% Squad ATK',
    bonus3Desc: '+20% Squad ATK & 15% Max HP Shield at stage start',
  },
  ASTRAL: {
    id: 'ASTRAL',
    name: 'Astral Sanctum',
    chapterTitle: 'Ch. 2: Lumina Observatory',
    biomeTheme: 'Midnight indigo sky, cyan star crystals, silver light',
    color: '#38e8ff',
    accentHex: 0x38e8ff,
    bonus2Desc: '+12% Squad Skill DMG',
    bonus3Desc: '+25% Squad Skill DMG & +15% Ultimate Gauge Charge Rate',
  },
  VERDANT: {
    id: 'VERDANT',
    name: 'Verdant Covenant',
    chapterTitle: 'Ch. 3: Sylva Canopy',
    biomeTheme: 'Emerald ancient forest, luminescent moss, golden spores',
    color: '#10b981',
    accentHex: 0x10b981,
    bonus2Desc: '+12% Squad Max HP',
    bonus3Desc: '+20% Outgoing Heal & +10% SP Regeneration',
  },
  ASHEN: {
    id: 'ASHEN',
    name: 'Ashen Legion',
    chapterTitle: 'Ch. 4: Ferrum Caldera',
    biomeTheme: 'Volcanic ash, forged copper machinery, molten magma',
    color: '#f97316',
    accentHex: 0xf97316,
    bonus2Desc: '+8% Squad Crit Rate',
    bonus3Desc: '+15% Squad Crit Rate & Ignore 15% Enemy DEF',
  },
};

export const FACTION_LIST: FactionDef[] = Object.values(FACTIONS);
