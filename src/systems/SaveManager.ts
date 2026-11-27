import { buildDefaultSaveState, usePlayerStore } from '../store/usePlayerStore';
import { useSettingsStore } from '../store/useSettingsStore';
import type { PlayerSaveState } from '../types/game';

export const SAVE_STORAGE_KEY = 'starlight-chasers-save-v3';
export const BACKUP_STORAGE_KEY = 'starlight-chasers-manual-backup-v3';
export const SETTINGS_STORAGE_KEY = 'starlight-chasers-settings-v1';
export const SAVE_FORMAT_TAG = 'starlight-chasers-save';
export const SAVE_SCHEMA_VERSION = 3;
const SAVE_CODE_PREFIX = 'SC3:';

export interface SaveSummaryInfo {
  commanderName: string;
  clearedStagesCount: number;
  heroCount: number;
  relicCount: number;
  gold: number;
  crystals: number;
  savedAt: string;
}

export interface SaveExportEnvelope {
  format: typeof SAVE_FORMAT_TAG;
  schemaVersion: number;
  exportedAt: string;
  checksum: string;
  summary: SaveSummaryInfo;
  data: PlayerSaveState;
}

export interface ImportValidationResult {
  ok: boolean;
  error?: string;
  summary?: SaveSummaryInfo;
  data?: PlayerSaveState;
  exportedAt?: string;
}

function computeChecksum(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function encodeBase64Utf8(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decodeBase64Utf8(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export function extractPlayerSaveState(raw: PlayerSaveState): PlayerSaveState {
  const base = buildDefaultSaveState();
  return {
    commanderName: typeof raw.commanderName === 'string' && raw.commanderName.trim() ? raw.commanderName.trim().slice(0, 24) : base.commanderName,
    favoriteHeroId: typeof raw.favoriteHeroId === 'string' ? raw.favoriteHeroId : base.favoriteHeroId,
    gold: Number.isFinite(raw.gold) ? Math.max(0, Math.round(raw.gold)) : base.gold,
    starlightCrystals: Number.isFinite(raw.starlightCrystals) ? Math.max(0, Math.round(raw.starlightCrystals)) : base.starlightCrystals,
    starDust: Number.isFinite(raw.starDust) ? Math.max(0, Math.round(raw.starDust)) : base.starDust,
    starlightTokens: Number.isFinite(raw.starlightTokens) ? Math.max(0, Math.round(raw.starlightTokens)) : base.starlightTokens,
    expPotions: Number.isFinite(raw.expPotions) ? Math.max(0, Math.round(raw.expPotions)) : base.expPotions,
    forgeStones: Number.isFinite(raw.forgeStones) ? Math.max(0, Math.round(raw.forgeStones)) : base.forgeStones,
    starIronIngots: Number.isFinite(raw.starIronIngots) ? Math.max(0, Math.round(raw.starIronIngots)) : base.starIronIngots,
    astralAnvilCores: Number.isFinite(raw.astralAnvilCores) ? Math.max(0, Math.round(raw.astralAnvilCores)) : base.astralAnvilCores,
    starCores: Number.isFinite(raw.starCores) ? Math.max(0, Math.round(raw.starCores)) : base.starCores,
    relicFragments: Number.isFinite(raw.relicFragments) ? Math.max(0, Math.round(raw.relicFragments)) : base.relicFragments,
    factionEssences: {
      SOLARIS: Math.max(0, Math.round(raw.factionEssences?.SOLARIS ?? base.factionEssences.SOLARIS)),
      ASTRAL: Math.max(0, Math.round(raw.factionEssences?.ASTRAL ?? base.factionEssences.ASTRAL)),
      VERDANT: Math.max(0, Math.round(raw.factionEssences?.VERDANT ?? base.factionEssences.VERDANT)),
      ASHEN: Math.max(0, Math.round(raw.factionEssences?.ASHEN ?? base.factionEssences.ASHEN)),
    },
    bondGifts: Number.isFinite(raw.bondGifts) ? Math.max(0, Math.round(raw.bondGifts)) : base.bondGifts,
    pityCounterHero: Number.isFinite(raw.pityCounterHero) ? Math.max(0, raw.pityCounterHero) : 0,
    pityCounterRelic: Number.isFinite(raw.pityCounterRelic) ? Math.max(0, raw.pityCounterRelic) : 0,
    guaranteedFeaturedHero: Boolean(raw.guaranteedFeaturedHero),
    guaranteedFeaturedRelic: Boolean(raw.guaranteedFeaturedRelic),
    squadIds: Array.isArray(raw.squadIds) && raw.squadIds.length === 4 ? (raw.squadIds as [string, string, string, string]) : base.squadIds,
    partyPresets: Array.isArray(raw.partyPresets) && raw.partyPresets.length === 3 ? raw.partyPresets : base.partyPresets,
    activePresetIndex: raw.activePresetIndex === 1 || raw.activePresetIndex === 2 ? raw.activePresetIndex : 0,
    roster: raw.roster && typeof raw.roster === 'object' && Object.keys(raw.roster).length > 0 ? raw.roster : base.roster,
    ownedRelics: Array.isArray(raw.ownedRelics) ? raw.ownedRelics : [],
    relicRanks: raw.relicRanks && typeof raw.relicRanks === 'object' ? raw.relicRanks : {},
    equipmentInventory: Array.isArray(raw.equipmentInventory) ? raw.equipmentInventory : base.equipmentInventory,
    unlockedCodexIds: Array.isArray(raw.unlockedCodexIds) ? raw.unlockedCodexIds : base.unlockedCodexIds,
    claimedCodexMilestones: Array.isArray(raw.claimedCodexMilestones) ? raw.claimedCodexMilestones : [],
    claimedRegionChests: Array.isArray(raw.claimedRegionChests) ? raw.claimedRegionChests : [],
    clearedStages: Array.isArray(raw.clearedStages) ? raw.clearedStages : [],
    selectedStageId: typeof raw.selectedStageId === 'string' ? raw.selectedStageId : base.selectedStageId,
    shopPurchases: raw.shopPurchases && typeof raw.shopPurchases === 'object' ? raw.shopPurchases : {},
    shopResetDay: typeof raw.shopResetDay === 'string' ? raw.shopResetDay : base.shopResetDay,
    lastDailySupplyAt: Number.isFinite(raw.lastDailySupplyAt) ? raw.lastDailySupplyAt : 0,
    dungeonTickets: Number.isFinite(raw.dungeonTickets) ? Math.max(0, Math.round(raw.dungeonTickets)) : base.dungeonTickets,
    dungeonEntriesUsed: raw.dungeonEntriesUsed && typeof raw.dungeonEntriesUsed === 'object' ? raw.dungeonEntriesUsed : {},
    dungeonResetDay: typeof raw.dungeonResetDay === 'string' ? raw.dungeonResetDay : base.dungeonResetDay,
    dungeonBestStars: raw.dungeonBestStars && typeof raw.dungeonBestStars === 'object' ? raw.dungeonBestStars : {},
    spireHighestFloor: Number.isFinite(raw.spireHighestFloor) ? Math.max(0, Math.min(50, Math.round(raw.spireHighestFloor))) : 0,
    spireLastSweepDay: typeof raw.spireLastSweepDay === 'string' ? raw.spireLastSweepDay : '',
    commissionResetDay: typeof raw.commissionResetDay === 'string' ? raw.commissionResetDay : base.commissionResetDay,
    dailyCommissionProgress:
      raw.dailyCommissionProgress && typeof raw.dailyCommissionProgress === 'object'
        ? raw.dailyCommissionProgress
        : {},
    claimedDailyCommissions: Array.isArray(raw.claimedDailyCommissions) ? raw.claimedDailyCommissions : [],
    claimedActivityMilestones: Array.isArray(raw.claimedActivityMilestones) ? raw.claimedActivityMilestones : [],
    claimedPermanentCommissions: Array.isArray(raw.claimedPermanentCommissions) ? raw.claimedPermanentCommissions : [],
    lifetimeLinkBursts: Number.isFinite(raw.lifetimeLinkBursts) ? Math.max(0, Math.round(raw.lifetimeLinkBursts)) : 0,
    lastManualSaveAt: Number.isFinite(raw.lastManualSaveAt) ? raw.lastManualSaveAt : Date.now(),
  };
}

export function buildSaveSummary(state: PlayerSaveState, savedAtIso?: string): SaveSummaryInfo {
  return {
    commanderName: state.commanderName || 'Chaser Commander',
    clearedStagesCount: Array.isArray(state.clearedStages) ? state.clearedStages.length : 0,
    heroCount: state.roster ? Object.keys(state.roster).length : 0,
    relicCount: Array.isArray(state.ownedRelics) ? state.ownedRelics.length : 0,
    gold: state.gold ?? 0,
    crystals: state.starlightCrystals ?? 0,
    savedAt: savedAtIso ?? new Date().toISOString(),
  };
}

export function buildExportEnvelope(): SaveExportEnvelope {
  const cleanData = extractPlayerSaveState(usePlayerStore.getState());
  const exportedAt = new Date().toISOString();
  const payloadStr = JSON.stringify(cleanData);
  return {
    format: SAVE_FORMAT_TAG,
    schemaVersion: SAVE_SCHEMA_VERSION,
    exportedAt,
    checksum: computeChecksum(payloadStr),
    summary: buildSaveSummary(cleanData, exportedAt),
    data: cleanData,
  };
}

export function manualSaveAndBackup(): { ok: boolean; savedAt: number; message: string } {
  try {
    const now = Date.now();
    usePlayerStore.setState({ lastManualSaveAt: now });
    const cleanData = extractPlayerSaveState(usePlayerStore.getState());
    cleanData.lastManualSaveAt = now;

    // 1. Force flush Zustand persist payload directly to localStorage
    localStorage.setItem(
      SAVE_STORAGE_KEY,
      JSON.stringify({ state: cleanData, version: 0 }),
    );

    // 2. Write a dedicated manual backup snapshot envelope for instant restore
    const envelope: SaveExportEnvelope = {
      format: SAVE_FORMAT_TAG,
      schemaVersion: SAVE_SCHEMA_VERSION,
      exportedAt: new Date(now).toISOString(),
      checksum: computeChecksum(JSON.stringify(cleanData)),
      summary: buildSaveSummary(cleanData, new Date(now).toISOString()),
      data: cleanData,
    };
    localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(envelope));

    return {
      ok: true,
      savedAt: now,
      message: 'Progress saved & local backup snapshot updated!',
    };
  } catch (err) {
    return {
      ok: false,
      savedAt: 0,
      message: err instanceof Error ? `Save failed: ${err.message}` : 'Unable to write localStorage.',
    };
  }
}

export function getBackupSnapshotInfo(): {
  exists: boolean;
  summary?: SaveSummaryInfo;
  exportedAt?: string;
} {
  try {
    const raw = localStorage.getItem(BACKUP_STORAGE_KEY);
    if (!raw) return { exists: false };
    const parsed = JSON.parse(raw) as SaveExportEnvelope;
    if (parsed?.format !== SAVE_FORMAT_TAG || !parsed.data) return { exists: false };
    return {
      exists: true,
      summary: parsed.summary ?? buildSaveSummary(parsed.data, parsed.exportedAt),
      exportedAt: parsed.exportedAt,
    };
  } catch {
    return { exists: false };
  }
}

export function restoreBackupSnapshot(): { ok: boolean; message: string } {
  try {
    const raw = localStorage.getItem(BACKUP_STORAGE_KEY);
    if (!raw) return { ok: false, message: 'No manual backup snapshot found.' };
    const validated = parseAndValidateImport(raw);
    if (!validated.ok || !validated.data) {
      return { ok: false, message: validated.error ?? 'Backup snapshot is invalid.' };
    }
    const cleanData = extractPlayerSaveState(validated.data);
    usePlayerStore.setState(cleanData);
    localStorage.setItem(
      SAVE_STORAGE_KEY,
      JSON.stringify({ state: cleanData, version: 0 }),
    );
    return { ok: true, message: 'Restored manual backup snapshot!' };
  } catch {
    return { ok: false, message: 'Failed to restore backup snapshot.' };
  }
}

export function exportSaveJsonString(): string {
  return JSON.stringify(buildExportEnvelope(), null, 2);
}

export function exportSaveCode(): string {
  const compact = JSON.stringify(buildExportEnvelope());
  return `${SAVE_CODE_PREFIX}${encodeBase64Utf8(compact)}`;
}

export function downloadSaveFile(): { filename: string } {
  const json = exportSaveJsonString();
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const filename = `starlight-chasers-save-${stamp}.json`;
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { filename };
}

export function parseAndValidateImport(rawInput: string): ImportValidationResult {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { ok: false, error: 'Paste a Save Code or select a .json save file first.' };
  }

  let jsonText = trimmed;
  if (trimmed.startsWith(SAVE_CODE_PREFIX)) {
    try {
      jsonText = decodeBase64Utf8(trimmed.slice(SAVE_CODE_PREFIX.length).trim());
    } catch {
      return { ok: false, error: 'Invalid Save Code (corrupted Base64 encoding).' };
    }
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { ok: false, error: 'Invalid JSON format. Make sure the full file or Save Code was copied.' };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'Save payload is empty or malformed.' };
  }

  const obj = parsed as Record<string, unknown>;
  let candidateData: PlayerSaveState | null = null;
  let exportedAt: string | undefined;

  if (obj.format === SAVE_FORMAT_TAG && obj.data && typeof obj.data === 'object') {
    const rawData = obj.data as PlayerSaveState;
    if (typeof obj.checksum === 'string') {
      const expected = computeChecksum(JSON.stringify(rawData));
      if (expected !== obj.checksum) {
        return {
          ok: false,
          error: 'Checksum mismatch — this save file appears corrupted or modified.',
        };
      }
    }
    candidateData = rawData;
    exportedAt = typeof obj.exportedAt === 'string' ? obj.exportedAt : undefined;
  } else if (obj.state && typeof obj.state === 'object' && 'roster' in (obj.state as object)) {
    // Also supports raw Zustand persist export gracefully
    candidateData = obj.state as PlayerSaveState;
  } else if ('roster' in obj && 'squadIds' in obj) {
    candidateData = obj as unknown as PlayerSaveState;
  } else {
    return { ok: false, error: 'Unrecognized file — not a Starlight Chasers save file.' };
  }

  if (
    !candidateData.roster ||
    typeof candidateData.roster !== 'object' ||
    Object.keys(candidateData.roster).length === 0
  ) {
    return { ok: false, error: 'Save file contains no valid Hero roster.' };
  }

  const normalized = extractPlayerSaveState(candidateData);
  return {
    ok: true,
    data: normalized,
    summary: buildSaveSummary(normalized, exportedAt),
    exportedAt,
  };
}

export function applyImportedSave(data: PlayerSaveState): { ok: boolean; message: string } {
  try {
    // Automatically snapshot current save into backup before overwriting!
    manualSaveAndBackup();

    const clean = extractPlayerSaveState(data);
    clean.lastManualSaveAt = Date.now();
    usePlayerStore.setState(clean);
    localStorage.setItem(
      SAVE_STORAGE_KEY,
      JSON.stringify({ state: clean, version: 0 }),
    );
    return {
      ok: true,
      message: `Imported save for ${clean.commanderName}! (Previous save backed up safely.)`,
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? `Import failed: ${err.message}` : 'Import failed.',
    };
  }
}

export function resetAccountCompletely(): { ok: boolean; message: string } {
  try {
    // 1. Wipe all persisted account save, manual backup, and settings keys
    localStorage.removeItem(SAVE_STORAGE_KEY);
    localStorage.removeItem(BACKUP_STORAGE_KEY);
    localStorage.removeItem(SETTINGS_STORAGE_KEY);

    // 2. Reset in-memory Zustand stores to clean starter state & defaults (Auto-Move/Auto-Skill ON)
    usePlayerStore.getState().resetSave();
    useSettingsStore.getState().resetSettings();

    // 3. Persist the clean starter save immediately so storage reflects the reset state
    const fresh = extractPlayerSaveState(usePlayerStore.getState());
    localStorage.setItem(
      SAVE_STORAGE_KEY,
      JSON.stringify({ state: fresh, version: 0 }),
    );

    return {
      ok: true,
      message: 'Account permanently reset. Fresh starter profile initialized.',
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? `Reset failed: ${err.message}` : 'Unable to reset account data.',
    };
  }
}
