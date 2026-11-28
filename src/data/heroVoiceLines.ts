import { HERO_MAP } from './heroes';

/**
 * Interactive Lobby Voice/Dialogue Bank for all 16 Starlight Chasers Heroes.
 * Tapping a Hero in the Living Lobby cycles smoothly through personality-rich banter,
 * tactical remarks, and Bond reflections.
 */
const HERO_EXTRA_LINES: Record<string, string[]> = {
  astraea: [
    'When the Fifth Pillar awakens, even fractured heavens bow to our edict.',
    'Six constellation blades answer your command, Chaser Commander—speak, and the sky shall part.',
    'Seraphina’s forbidden starchart only glimpsed my silhouette. Now I walk beside your vanguard in full starlight.',
    'Align our Starlight Link and witness the true majesty of a Sovereign Domain.',
  ],
  velaris: [
    'At the Zero Meridian, every fractured horizon bows to a single cut.',
    'Astraea mends the fallen sky; I sever whatever crawls through the cracks. Name your target, Commander.',
    'Four rift-blades already track the Boss’s pulse. Once its guard breaks, reality splits in five slashes.',
    'Stand beside me on the event horizon—no eclipse can swallow a vanguard that refuses to blink.',
  ],
  vespera: [
    'Target locked at four hundred meters. Once the magma coils peak, nothing walks away.',
    'Tell Draven to keep them burning—my Ember Cluster Barrage loves a hot target.',
    'Visor calibrated, Caldera Rail-Cannon pressurized. Point me at the toughest boss on the map.',
    'Out in Ferrum Caldera, hesitation gets you melted. Good thing you’re quick on the call, Commander.',
  ],
  vaelen: [
    'Even if the sky falls twice, my blade will sever the dark.',
    'Commander—say the word, and the Eclipse Vanguard cuts straight through the Rift.',
    'This hairline crack along my greatsword? A promise to bring every comrade home.',
    'Watch the Boss’s Break Gauge. The moment it shatters, I’ll finish it in five slashes.',
  ],
  seraphina: [
    'Every star remembers its orbit. Let me remind you of yours.',
    'My astrolabe caught a new resonance spike beyond Lumina—care to inspect the charts together?',
    'Three Star Orbs in harmonic alignment… nothing in the Void can outrun celestial geometry.',
    'Only you have seen my forbidden starchart, Commander. Don’t keep the cosmos waiting.',
  ],
  draven: [
    'Strike my anvil all you like—you will only stoke the furnace!',
    'Ha! Need a fresh dent hammered out of your armor before we deploy, Commander?',
    'Ten hits to ignite Molten Core—let the monsters come, I’ll stand in front of the whole squad!',
    'True strength isn’t how hard you swing. It’s how many comrades walk back unscarred.',
  ],
  elara: [
    'When the moonlight locks on, the hunt is already over.',
    'The wind off Sylva’s canopy smells like starlight today… good weather for an expedition.',
    'Stay nimble, Commander. One clean Starlight Reflex dodge opens every weak point.',
    'Quiet watch beside you on the battlements—honestly, I wouldn’t trade it for anything.',
  ],
  aurelia: [
    'Breathe in the starlight—no wound shall endure beneath the World-Tree.',
    'I brewed fresh emerald-lotus dewdrop tea for the squad. Please take a moment to rest, Commander.',
    'Even fractured skies can heal, so long as we refuse to let go of one another.',
    'Whenever the battlefield turns fierce, my Sanctuary of Eternal Bloom will shelter everyone.',
  ],
  zephyrion: [
    'Your future ended three seconds ago.',
    'Funny—my stopped pocket-watch finally started ticking again the day I joined your squad.',
    'Half a heartbeat ahead of reality. Give me a target and watch the clockface shatter.',
    'Don’t blink during Dimensional Severance, Commander—you might miss the best part.',
  ],
  garrick: [
    'Stand behind my shield—nothing breaks the Solaris line!',
    'Shield straps checked, vanguard polished. Ready to hold the front whenever you give the signal.',
    'Keep the healers safe behind my Bulwark Dome and we can outlast any Chapter Boss.',
    'Three siege campaigns taught me one truth: a steady Commander is worth ten thousand blades.',
  ],
  lyra: [
    'Breathe in the morning dew—our song has only begun.',
    'Listen closely… the chimes hum brighter whenever our whole squad moves in harmony!',
    'Remember to check our Forge and Dungeons before pushing a new Chapter, Commander.',
    'A warm melody after a hard fight mends more than just HP—let me tune a song for you.',
  ],
  raze: [
    'No running once my chains taste cinder!',
    'Point me at the biggest monster on the map—bonus points if it’s already on fire!',
    'Don’t tell the rookies I stay between them and the bosses. Ruins my reckless reputation!',
    'Pair me with Draven or Nyx and watch those Burn stacks detonate sky-high.',
  ],
  orion: [
    'Locking onto stellar coordinates—every shot finds its constellation.',
    'Astral Beacon calibrated! Step inside the glow and watch our Crit Rate soar.',
    'One critical bolt triggers a ricochet across the pack. Geometry is a marksman’s best friend.',
    'Whenever you’re ready to sweep the Rift Trials, my rail-bow is fully charged.',
  ],
  ignis: [
    'Ashes to starlight—watch this blaze rewrite the battlefield!',
    'Careful, Commander—my gauntlets run hot when a boss fight is right around the corner!',
    'Stack the embers high, then detonate them all at once. Nothing survives a pyre burst.',
    'From the slag canyons to the Zenith Throne—we’ll burn a path straight through the dark.',
  ],
  bram: [
    'A true guardian never takes a step backward!',
    'Armor bolted tight and ready for duty, Commander. Let me draw the vanguard’s fire.',
    'Even an R-rank shield stands tall when forged with the right set and a steady heart.',
    'Lead the charge—I’ve got your flank covered!',
  ],
  kael: [
    'Steady breath, steady bowstring—let the tailwind guide the arrow.',
    'Give me two seconds of clean footing and Tailwind doubles my volley tempo.',
    'I scouted the outer gates earlier—plenty of loot waiting in today’s Rift Trials!',
    'Keep moving smart, Commander. Every arrow counts when the boss enters Phase 2.',
  ],
  nyx: [
    'Play with embers and you’ll witness a wildfire!',
    'Hehe, ready to roast some Void Stalkers? My Ember Orbs are practically begging to blow!',
    'Stack Burn, snap my fingers, boom—nothing beats watching a whole wave light up!',
    'Stay close to the flames, Commander—it gets chilly out near Frostveil Citadel.',
  ],
  titus: [
    'Hold the prism steady—no barrage pierces the Sanctum’s guard!',
    'Ranged enemy casters? Let their bolts shatter harmlessly against my Refracting Guard.',
    'Discipline and timing win wars. Ready for our next tactical deployment, Commander.',
    'Aegis polished and starlight conduits aligned. Awaiting your command!',
  ],
  clara: [
    'May dawnlight guide every step our Chasers take!',
    'If anyone drops low in battle, Morning Grace will catch them before they fall!',
    'My lantern never flickers, even inside the deepest Void Rift. Let’s shine bright today!',
    'Thank you for leading us so kindly, Commander. Everyone feels safer with you here.',
  ],
};

export function getHeroLobbyLines(heroId: string, bondLevel = 1): string[] {
  const custom = HERO_EXTRA_LINES[heroId];
  const def = HERO_MAP[heroId];
  if (custom && custom.length > 0) {
    if (bondLevel >= 5 && def?.bondStory) {
      return [...custom, def.bondStory];
    }
    return custom;
  }
  return [
    def?.quote ?? 'Standing by for your orders, Commander!',
    def?.bondStory ?? 'Together, the Starlight Chasers will restore the fractured sky.',
  ];
}
