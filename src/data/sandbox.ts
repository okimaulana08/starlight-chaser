import type { SandboxDurationSec, SandboxTargetMode, StageDef, StageWave } from '../types/game';

export interface SandboxPresetDef {
  mode: SandboxTargetMode;
  label: string;
  subtitle: string;
  desc: string;
  color: string;
}

export const SANDBOX_TARGET_PRESETS: SandboxPresetDef[] = [
  {
    mode: 'SINGLE_BOSS',
    label: 'Single Boss Target',
    subtitle: 'Pure Single-Target DPS Test',
    desc: 'Benchmark single-target burst, Crit scaling, Velaris Rift Marks & Constellation spikes against the Astral Resonance Monolith.',
    color: '#38e8ff',
  },
  {
    mode: 'AOE_PACK',
    label: '4-Target AoE Formation',
    subtitle: 'Cleave & AoE Wave Test',
    desc: 'Test Astraea, Vespera, Seraphina & AoE Link Burst multi-target damage against 4 immortal Resonance Prisms.',
    color: '#e879f9',
  },
  {
    mode: 'BREAK_DUMMY',
    label: 'Shielded Break Dummy',
    subtitle: 'Stagger & Shield Shatter Test',
    desc: 'Monolith regenerates a Hit-Count Shield & Stagger Break Gauge after every Break to test Ashen Break teams & multi-hit skills.',
    color: '#f5c84c',
  },
];

export function encodeSandboxStageId(
  targetMode: SandboxTargetMode,
  durationSec: SandboxDurationSec,
  passiveDummy: boolean,
): string {
  return `sandbox__${targetMode}__${durationSec}__${passiveDummy ? 'passive' : 'active'}`;
}

export function parseSandboxStageId(stageId: string): {
  targetMode: SandboxTargetMode;
  durationSec: SandboxDurationSec;
  passiveDummy: boolean;
} | null {
  if (!stageId.startsWith('sandbox__')) return null;
  const parts = stageId.split('__');
  const rawMode = parts[1];
  const targetMode: SandboxTargetMode =
    rawMode === 'AOE_PACK' || rawMode === 'BREAK_DUMMY' ? rawMode : 'SINGLE_BOSS';
  const rawDur = Number(parts[2]);
  const durationSec: SandboxDurationSec = rawDur === 30 ? 30 : rawDur === 60 ? 60 : 0;
  const passiveDummy = parts[3] !== 'active';
  return { targetMode, durationSec, passiveDummy };
}

export function buildSandboxStageDef(
  targetMode: SandboxTargetMode,
  durationSec: SandboxDurationSec,
  passiveDummy: boolean,
): StageDef {
  const preset =
    SANDBOX_TARGET_PRESETS.find((p) => p.mode === targetMode) ?? SANDBOX_TARGET_PRESETS[0];

  const waves: StageWave[] =
    targetMode === 'AOE_PACK'
      ? [
          {
            label: 'DPS Lab — 4× Resonance Monolith Formation',
            spawns: [
              { enemyId: 'training_monolith', count: 1 },
              { enemyId: 'armored_golem', count: 3, spread: 145 },
            ],
          },
        ]
      : [
          {
            label:
              targetMode === 'BREAK_DUMMY'
                ? 'DPS Lab — Shielded Stagger Monolith'
                : 'DPS Lab — Astral Resonance Monolith',
            spawns: [{ enemyId: 'training_monolith', count: 1 }],
          },
        ];

  return {
    id: encodeSandboxStageId(targetMode, durationSec, passiveDummy),
    regionId: 'endgame_sandbox',
    stageNumber: 1,
    code: 'DPS LAB',
    name: `Training Sandbox — ${preset.label}`,
    chapter: 5,
    subtitle: `${durationSec === 0 ? 'Endless' : `${durationSec}s`} • ${passiveDummy ? 'Passive Dummy (0 DMG)' : 'Active Counter-Attack'}`,
    recommendedPower: 10000,
    description: preset.desc,
    enemyScale: 1.0,
    isBossStage: true,
    isSandbox: true,
    sandboxTargetMode: targetMode,
    sandboxDurationSec: durationSec,
    sandboxPassiveDummy: passiveDummy,
    bossNameOverride: 'Astral Resonance Monolith',
    bossTitleOverride: preset.subtitle,
    bossAssetOverride: '/assets/enemies/boss_training_monolith.webp',
    arenaAsset: '/assets/environments/env_labyrinth_rift.webp',
    arenaTintHex: 0x0f2544,
    ambientMoteColors: [0x38e8ff, 0xf5c84c],
    waves,
    firstClearCrystals: 0,
    repeatCrystals: 0,
    rewards: {
      gold: [0, 0],
      expPotions: [0, 0],
      forgeStones: [0, 0],
      primaryEssence: 'ASTRAL',
      primaryEssenceQty: [0, 0],
      targetSetIds: [],
      equipmentDrops: 0,
      rarityWeights: { COMMON: 100, RARE: 0, EPIC: 0, LEGENDARY: 0 },
    },
  };
}
