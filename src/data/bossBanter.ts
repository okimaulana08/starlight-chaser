import type { ActiveBossBanter, BossBanterLine, Faction } from '../types/game';
import { HERO_MAP } from './heroes';
import { REGION_MAP } from './regions';

interface ChapterBanterScript {
  preferredFaction: Faction;
  bossLines: [string, string];
  heroReply: string;
  heroCloser: string;
}

const CHAPTER_BOSS_SCRIPTS: Record<number, ChapterBanterScript> = {
  1: {
    preferredFaction: 'SOLARIS',
    bossLines: [
      'Intruders upon the First Spire... By the fractured sky, none shall pass Aurelia’s shattered seal!',
      'Then let eclipse and marble collide—prove your blades worthy of the fallen stars!',
    ],
    heroReply:
      'The Sentinel’s core is drowned in Void static. Strike together and shatter its resonance!',
    heroCloser: 'Formation locked, Commander! Watch its Void Shockwave—break its stance now!',
  },
  2: {
    preferredFaction: 'ASTRAL',
    bossLines: [
      'Your orbits are erratic, little Chasers. The Observatory has already calculated your demise.',
      'Gravity bends to the Fallen Pillars! Let us test whether mortal resolve survives a supernova!',
    ],
    heroReply:
      'Every star-equation in Lumina was twisted from inside the Rift. We are here to rewrite the sky.',
    heroCloser: 'Read the constellation telegraphs—Evade on cue and shatter the Archon’s prism!',
  },
  3: {
    preferredFaction: 'VERDANT',
    bossLines: [
      'The roots remember the night the sky burned... No steel shall tread upon Sylva’s blighted crown!',
      'Breathe the spore-storm and return to the canopy’s roots!',
    ],
    heroReply:
      'The World-Tree still fights beneath the corruption. Purify the Grove Colossus and free its boughs!',
    heroCloser: 'Keep healing ready and cut through the briars—this forest will bloom again!',
  },
  4: {
    preferredFaction: 'ASHEN',
    bossLines: [
      'Hmph! Fresh ore marches straight into Ferrum’s furnace? Come—let my hammer temper your bones!',
      'Ten thousand degrees of star-iron fury! Show me if your shields can endure the Caldera!',
    ],
    heroReply:
      'Even molten steel cools when its core cracks. Push through the heat and break its armor!',
    heroCloser: 'Hold the frontline steady—strike the glowing seams when its Break Gauge shatters!',
  },
  5: {
    preferredFaction: 'ASTRAL',
    bossLines: [
      'Silence... Time itself froze when the Fifth Shard fell. Why do you disturb eternal winter?',
      'Then be entombed in starlight frost until the heavens forget your names!',
    ],
    heroReply:
      'Frozen time is just another cage built by the Void. Melt the Sovereign’s throne!',
    heroCloser: 'Stay nimble through the blizzard—one clean Starlight Reflex will crack its ice!',
  },
  6: {
    preferredFaction: 'VERDANT',
    bossLines: [
      'From Pelagia’s drowned vault, the tide rises to swallow every surface-dweller whole!',
      'Sink beneath the abyssal current—the Fourth Pillar belongs to the deep!',
    ],
    heroReply:
      'The drowned Star Pillar is calling for rescue beneath those currents. Break the Leviathan’s hold!',
    heroCloser: 'Brace for the tidal sweep and unleash everything once its guard breaks!',
  },
  7: {
    preferredFaction: 'SOLARIS',
    bossLines: [
      'So the Chasers finally climbed the hurricane! Can your wings endure the Eye of the Maelstrom?',
      'Lightning and gale answer only the Valkyrie—scatter like dust across the cloud sea!',
    ],
    heroReply:
      'No storm tears down the Solaris vanguard. Anchor the squad and ground the Valkyrie!',
    heroCloser: 'Watch for the dive telegraphs—counter hard the second she touches marble!',
  },
  8: {
    preferredFaction: 'SOLARIS',
    bossLines: [
      'Bow before Eternal Noon! Every fallen star refracts my golden mirage across Solis!',
      'Burn beneath twin suns—only glass and ash remain of those who defy the Pharaoh!',
    ],
    heroReply:
      'A mirage collapses the instant you pierce its core. Cut straight through the glare!',
    heroCloser: 'Keep pressure on the Pharaoh’s Stagger Bar—don’t let the noonlight blind us!',
  },
  9: {
    preferredFaction: 'ASHEN',
    bossLines: [
      'You stand at the threshold of Unmaking... Every Pillar you mended only drew you closer to the Abyss.',
      'Witness the true echo of the Shattering—be erased from Aetheria’s memory!',
    ],
    heroReply:
      'If the Abyss wants a war, the Starlight Chasers brought four factions to finish it!',
    heroCloser: 'Full Chaser Resonance ready, Commander—tear open the Obsidian Spire!',
  },
  10: {
    preferredFaction: 'SOLARIS',
    bossLines: [
      'At last... the mortals who refused to accept a broken firmament stand before the Zenith Throne.',
      'I tore open the sky to remake eternity! Strike with all your light—show me if Aetheria deserves a dawn!',
    ],
    heroReply:
      'Every scar, every fallen comrade, every star we reclaimed led to this blade. Our sky belongs to us!',
    heroCloser: 'This is the final battle, Commander! Unleash every Ultimate and reclaim the dawn!',
  },
};

function pickLeadSpeaker(squadIds: string[], preferredFaction: Faction): string {
  // Prefer a faction-aligned SSR/SR hero in the current squad for rich lore authenticity
  const aligned = squadIds.find((id) => HERO_MAP[id]?.faction === preferredFaction);
  if (aligned) return aligned;
  const ssr = squadIds.find((id) => HERO_MAP[id]?.tier === 'SSR');
  return ssr ?? squadIds[0] ?? 'vaelen';
}

/**
 * Builds an Anime VN Pre-Boss Confrontation Banter sequence for any Chapter Boss (Stage X-12)
 * or Rift Dungeon Boss Rush (Relic Abyss).
 */
export function buildBossBanter(opts: {
  stageId: string;
  chapter: number;
  bossName: string;
  bossTitle: string;
  bossAsset: string;
  squadIds: string[];
  isDungeon?: boolean;
}): ActiveBossBanter | null {
  if (opts.isDungeon) {
    const heroId = pickLeadSpeaker(opts.squadIds, 'ASTRAL');
    const hero = HERO_MAP[heroId] ?? HERO_MAP.vaelen;
    const lines: BossBanterLine[] = [
      {
        speakerSide: 'BOSS',
        speakerName: opts.bossName,
        speakerTitle: opts.bossTitle,
        text: 'Relic seekers dare disturb the Abyssal Vault? Only those who shatter my ward may claim the Fallen Pillars’ power!',
      },
      {
        speakerSide: 'HERO',
        speakerName: hero.name,
        speakerTitle: hero.title,
        text: `Keep your eyes on its Break Gauge, Commander. Shatter its stance and those ancient Relics are ours!`,
      },
    ];
    return {
      id: `banter_${opts.stageId}_${Date.now()}`,
      chapterLabel: 'RIFT TRIAL — ABYSSAL BOSS RUSH',
      heroId: hero.id,
      bossName: opts.bossName,
      bossTitle: opts.bossTitle,
      bossAsset: opts.bossAsset,
      accentColor: '#c084fc',
      lines,
    };
  }

  const script = CHAPTER_BOSS_SCRIPTS[opts.chapter] ?? CHAPTER_BOSS_SCRIPTS[1];
  const region = REGION_MAP[`region_${opts.chapter}`];
  const heroId = pickLeadSpeaker(opts.squadIds, script.preferredFaction);
  const hero = HERO_MAP[heroId] ?? HERO_MAP.vaelen;

  const lines: BossBanterLine[] = [
    {
      speakerSide: 'BOSS',
      speakerName: opts.bossName,
      speakerTitle: opts.bossTitle,
      text: script.bossLines[0],
    },
    {
      speakerSide: 'HERO',
      speakerName: hero.name,
      speakerTitle: hero.title,
      text: script.heroReply,
    },
    {
      speakerSide: 'BOSS',
      speakerName: opts.bossName,
      speakerTitle: opts.bossTitle,
      text: script.bossLines[1],
    },
    {
      speakerSide: 'HERO',
      speakerName: hero.name,
      speakerTitle: hero.title,
      text: script.heroCloser,
    },
  ];

  return {
    id: `banter_${opts.stageId}_${Date.now()}`,
    chapterLabel: `CHAPTER ${opts.chapter} BOSS — ${region?.name.toUpperCase() ?? 'AETHERIA'}`,
    heroId: hero.id,
    bossName: opts.bossName,
    bossTitle: opts.bossTitle,
    bossAsset: opts.bossAsset,
    accentColor: region?.themeColor ?? '#f5c84c',
    lines,
  };
}
