import React, { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ClipboardCopy,
  Download,
  Film,
  HardDrive,
  RotateCcw,
  Save,
  Settings,
  Sliders,
  Sparkles,
  Swords,
  Trash2,
  Upload,
  User,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { audioManager } from '../engine/AudioManager';
import { usePlayerStore } from '../store/usePlayerStore';
import { useSettingsStore } from '../store/useSettingsStore';
import {
  applyImportedSave,
  buildSaveSummary,
  downloadSaveFile,
  exportSaveCode,
  getBackupSnapshotInfo,
  manualSaveAndBackup,
  parseAndValidateImport,
  restoreBackupSnapshot,
  type ImportValidationResult,
} from '../systems/SaveManager';
import { GameIcon } from './GameIcon';
import { CornerFiligree, RpgButton, RpgTabs } from './RpgKit';

type SettingsTab = 'SAVE' | 'PROFILE' | 'AUDIO' | 'COMBAT';

interface SettingsModalProps {
  open: boolean;
  initialTab?: SettingsTab;
  combatOnlyMode?: boolean;
  onClose: () => void;
}

function formatTimestamp(ts?: number | string): string {
  if (!ts) return 'Auto-saved in browser';
  const d = typeof ts === 'number' ? new Date(ts) : new Date(ts);
  if (Number.isNaN(d.getTime())) return 'Auto-saved in browser';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  initialTab = 'SAVE',
  combatOnlyMode = false,
  onClose,
}) => {
  const player = usePlayerStore();
  const settings = useSettingsStore();

  const [tab, setTab] = useState<SettingsTab>(combatOnlyMode ? 'AUDIO' : initialTab);
  const [notice, setNotice] = useState<{ text: string; tone: 'ok' | 'warn' | 'err' } | null>(null);
  const [nameInput, setNameInput] = useState(player.commanderName);
  const [copiedCode, setCopiedCode] = useState(false);
  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState<ImportValidationResult | null>(null);
  const [resetConfirmStep, setResetConfirmStep] = useState(false);
  const [resetKeyword, setResetKeyword] = useState('');
  const [backupTick, setBackupTick] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const backupInfo = useMemo(
    () => getBackupSnapshotInfo(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, backupTick, player.lastManualSaveAt],
  );

  const currentSummary = useMemo(
    () => buildSaveSummary(player),
    [player],
  );

  const flashNotice = (text: string, tone: 'ok' | 'warn' | 'err' = 'ok') => {
    setNotice({ text, tone });
    window.setTimeout(() => setNotice(null), 3600);
  };

  const handleManualSave = () => {
    const res = manualSaveAndBackup();
    setBackupTick((t) => t + 1);
    audioManager.playSfx(res.ok ? 'forge' : 'button');
    flashNotice(res.message, res.ok ? 'ok' : 'err');
  };

  const handleRestoreBackup = () => {
    const res = restoreBackupSnapshot();
    setBackupTick((t) => t + 1);
    audioManager.playSfx(res.ok ? 'ssr_reveal' : 'button');
    flashNotice(res.message, res.ok ? 'ok' : 'err');
  };

  const handleDownloadJson = () => {
    const { filename } = downloadSaveFile();
    audioManager.playSfx('button');
    flashNotice(`Exported ${filename}`, 'ok');
  };

  const handleCopyCode = async () => {
    const code = exportSaveCode();
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      audioManager.playSfx('forge');
      flashNotice('Save Code copied to clipboard!', 'ok');
      window.setTimeout(() => setCopiedCode(false), 2200);
    } catch {
      setImportText(code);
      flashNotice('Clipboard unavailable — Save Code placed in box below for manual copy.', 'warn');
    }
  };

  const handleValidateInput = (raw: string) => {
    setImportText(raw);
    if (!raw.trim()) {
      setImportPreview(null);
      return;
    }
    const res = parseAndValidateImport(raw);
    setImportPreview(res);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      handleValidateInput(content);
      audioManager.playSfx('button');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmImport = () => {
    if (!importPreview?.ok || !importPreview.data) return;
    const res = applyImportedSave(importPreview.data);
    setBackupTick((t) => t + 1);
    if (res.ok) {
      audioManager.playSfx('ssr_reveal');
      setNameInput(importPreview.data.commanderName);
      setImportText('');
      setImportPreview(null);
      flashNotice(res.message, 'ok');
    } else {
      flashNotice(res.message, 'err');
    }
  };

  const handleSaveCommanderName = () => {
    const trimmed = nameInput.trim().slice(0, 24);
    if (!trimmed) {
      flashNotice('Commander Name cannot be empty.', 'warn');
      return;
    }
    player.setCommanderName(trimmed);
    audioManager.playSfx('forge');
    flashNotice(`Commander renamed to "${trimmed}"!`, 'ok');
  };

  const handleConfirmReset = () => {
    if (resetKeyword.trim().toUpperCase() !== 'RESET') {
      flashNotice('Type RESET to confirm wiping your save.', 'warn');
      return;
    }
    manualSaveAndBackup(); // Emergency backup before reset!
    player.resetSave();
    setNameInput('Chaser Commander');
    setResetConfirmStep(false);
    setResetKeyword('');
    setBackupTick((t) => t + 1);
    audioManager.playSfx('button');
    flashNotice('Save reset to fresh starter state (previous save backed up!).', 'warn');
  };

  const tabItems: Array<{ key: SettingsTab; label: string; accent: 'gold' | 'cyan' }> = combatOnlyMode
    ? [
        { key: 'AUDIO', label: 'Audio & VFX', accent: 'cyan' },
        { key: 'COMBAT', label: 'Combat', accent: 'gold' },
      ]
    : [
        { key: 'SAVE', label: 'Save & Data', accent: 'gold' },
        { key: 'PROFILE', label: 'Profile', accent: 'gold' },
        { key: 'AUDIO', label: 'Audio & VFX', accent: 'cyan' },
        { key: 'COMBAT', label: 'Combat', accent: 'gold' },
      ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-[#030510]/85 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 select-none"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative rpg-panel w-full max-w-2xl max-h-[90dvh] flex flex-col overflow-hidden border-amber-400/55 shadow-[0_24px_72px_rgba(0,0,0,0.92)]"
          >
            <CornerFiligree color="#f5c84c" size={11} opacity={0.85} />

            {/* HEADER */}
            <div className="shrink-0 px-4 sm:px-5 pt-3.5 pb-3 border-b border-amber-400/25 bg-slate-950/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-300/60 flex items-center justify-center shrink-0">
                  <Settings className="w-5 h-5 text-amber-300" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-display font-black uppercase tracking-[0.22em] text-amber-300">
                    COMMANDER SYSTEM CONSOLE
                  </div>
                  <h2 className="font-display text-lg sm:text-xl font-black text-white leading-tight truncate">
                    Game Settings
                  </h2>
                </div>
              </div>
              <button
                onClick={() => {
                  audioManager.playSfx('button');
                  onClose();
                }}
                className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-amber-300 transition"
                aria-label="Close Settings"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* TABS */}
            <div className="shrink-0 px-4 sm:px-5 pt-3 pb-2 bg-slate-950/45 border-b border-white/10">
              <RpgTabs<SettingsTab>
                layoutId="settings-modal-tabs"
                items={tabItems}
                value={tab}
                onChange={(t) => {
                  audioManager.playSfx('button');
                  setTab(t);
                }}
              />
            </div>

            {/* TOAST NOTICE */}
            {notice && (
              <div
                className={`mx-4 sm:mx-5 mt-3 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border ${
                  notice.tone === 'ok'
                    ? 'bg-emerald-950/75 border-emerald-400/60 text-emerald-200'
                    : notice.tone === 'warn'
                      ? 'bg-amber-950/75 border-amber-400/60 text-amber-200'
                      : 'bg-rose-950/75 border-rose-400/60 text-rose-200'
                }`}
              >
                {notice.tone === 'ok' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-300" />
                )}
                <span>{notice.text}</span>
              </div>
            )}

            {/* SCROLLABLE BODY */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-4 space-y-4">
              {/* TAB 1: SAVE & DATA */}
              {tab === 'SAVE' && !combatOnlyMode && (
                <>
                  {/* Current Profile & Manual Save Card */}
                  <div className="rpg-ornate-card p-3.5 sm:p-4 space-y-3 border-emerald-400/40">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-display font-black uppercase tracking-[0.2em] text-emerald-300 flex items-center gap-1.5">
                          <HardDrive className="w-3.5 h-3.5" /> Local Progress & Manual Snapshot
                        </div>
                        <div className="text-xs text-slate-300 mt-0.5">
                          Last Manual Save:{' '}
                          <span className="font-mono text-amber-200 font-bold">
                            {formatTimestamp(player.lastManualSaveAt)}
                          </span>
                        </div>
                      </div>
                      <RpgButton
                        variant="emerald"
                        size="md"
                        onClick={handleManualSave}
                        className="font-display font-black uppercase tracking-wider"
                      >
                        <Save className="w-4 h-4" /> Save Now
                      </RpgButton>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/10 text-center">
                      <div className="rounded-xl bg-slate-950/75 border border-white/10 px-2 py-1.5">
                        <div className="text-[9px] uppercase text-slate-400 font-bold">Stages</div>
                        <div className="font-mono text-sm font-black text-cyan-300">
                          {currentSummary.clearedStagesCount} / 120
                        </div>
                      </div>
                      <div className="rounded-xl bg-slate-950/75 border border-white/10 px-2 py-1.5">
                        <div className="text-[9px] uppercase text-slate-400 font-bold">Heroes</div>
                        <div className="font-mono text-sm font-black text-amber-300">
                          {currentSummary.heroCount}
                        </div>
                      </div>
                      <div className="rounded-xl bg-slate-950/75 border border-white/10 px-2 py-1.5">
                        <div className="text-[9px] uppercase text-slate-400 font-bold">Gold</div>
                        <div className="font-mono text-sm font-black text-amber-200 flex items-center justify-center gap-1">
                          <GameIcon name="gold" className="w-3.5 h-3.5" />
                          {currentSummary.gold.toLocaleString()}
                        </div>
                      </div>
                      <div className="rounded-xl bg-slate-950/75 border border-white/10 px-2 py-1.5">
                        <div className="text-[9px] uppercase text-slate-400 font-bold">Crystals</div>
                        <div className="font-mono text-sm font-black text-sky-300 flex items-center justify-center gap-1">
                          <GameIcon name="crystal" className="w-3.5 h-3.5" />
                          {currentSummary.crystals.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Local Backup Snapshot Restore */}
                    {backupInfo.exists && backupInfo.summary && (
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-[11px]">
                        <div className="text-slate-300">
                          Backup Snapshot:{' '}
                          <span className="font-bold text-white">{backupInfo.summary.commanderName}</span>{' '}
                          • <span className="text-cyan-300 font-mono">{backupInfo.summary.clearedStagesCount} stages</span>{' '}
                          ({formatTimestamp(backupInfo.exportedAt)})
                        </div>
                        <button
                          onClick={handleRestoreBackup}
                          className="px-2.5 py-1 rounded-lg bg-sky-500/15 border border-sky-400/50 text-sky-200 font-display font-bold text-[10px] uppercase tracking-wider hover:bg-sky-500/25 flex items-center gap-1 transition"
                        >
                          <RotateCcw className="w-3 h-3" /> Restore Backup
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Export Save */}
                  <div className="rpg-ornate-card p-3.5 sm:p-4 space-y-2.5 border-amber-400/35">
                    <div className="text-[10px] font-display font-black uppercase tracking-[0.2em] text-amber-300 flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5" /> Export Save Data
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Back up your account or transfer progress to another device via a validated{' '}
                      <span className="text-amber-200 font-mono">.json</span> file or portable Save Code.
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <RpgButton variant="gold" size="md" onClick={handleDownloadJson}>
                        <Download className="w-4 h-4" /> Export .JSON File
                      </RpgButton>
                      <RpgButton variant="cyan" size="md" onClick={handleCopyCode}>
                        {copiedCode ? <Check className="w-4 h-4" /> : <ClipboardCopy className="w-4 h-4" />}
                        {copiedCode ? 'Copied Save Code!' : 'Copy Save Code'}
                      </RpgButton>
                    </div>
                  </div>

                  {/* Import Save with Preview */}
                  <div className="rpg-ornate-card p-3.5 sm:p-4 space-y-3 border-cyan-400/35">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[10px] font-display font-black uppercase tracking-[0.2em] text-cyan-300 flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" /> Import Save Data
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json,application/json,text/plain"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-400/60 text-cyan-200 text-[11px] font-display font-black uppercase tracking-wider hover:bg-cyan-500/25 flex items-center gap-1.5 transition"
                      >
                        <Upload className="w-3.5 h-3.5" /> Load .JSON File
                      </button>
                    </div>

                    <textarea
                      value={importText}
                      onChange={(e) => handleValidateInput(e.target.value)}
                      placeholder="Paste Save Code (SC3:...) or JSON save contents here..."
                      rows={3}
                      className="w-full rounded-xl bg-slate-950/90 border border-slate-700 focus:border-cyan-400 focus:outline-none p-2.5 text-[11px] font-mono text-slate-200 placeholder:text-slate-500 resize-none select-text"
                    />

                    {importPreview && !importPreview.ok && (
                      <div className="px-3 py-2 rounded-xl bg-rose-950/60 border border-rose-500/60 text-xs text-rose-200 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>{importPreview.error}</span>
                      </div>
                    )}

                    {importPreview?.ok && importPreview.summary && (
                      <div className="rounded-xl bg-emerald-950/35 border border-emerald-400/60 p-3 space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-display font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" /> Valid Save Verified — Preview
                          </span>
                          <span className="font-mono text-[10px] text-slate-300">
                            {formatTimestamp(importPreview.exportedAt)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                          <div className="rounded-lg bg-slate-950/80 px-2 py-1.5">
                            <div className="text-[9px] text-slate-400 uppercase">Commander</div>
                            <div className="font-bold text-white truncate">
                              {importPreview.summary.commanderName}
                            </div>
                          </div>
                          <div className="rounded-lg bg-slate-950/80 px-2 py-1.5">
                            <div className="text-[9px] text-slate-400 uppercase">Cleared</div>
                            <div className="font-mono font-black text-cyan-300">
                              {importPreview.summary.clearedStagesCount} Stages
                            </div>
                          </div>
                          <div className="rounded-lg bg-slate-950/80 px-2 py-1.5">
                            <div className="text-[9px] text-slate-400 uppercase">Heroes / Relics</div>
                            <div className="font-mono font-black text-amber-300">
                              {importPreview.summary.heroCount}H • {importPreview.summary.relicCount}R
                            </div>
                          </div>
                          <div className="rounded-lg bg-slate-950/80 px-2 py-1.5">
                            <div className="text-[9px] text-slate-400 uppercase">Gold</div>
                            <div className="font-mono font-black text-amber-200">
                              {importPreview.summary.gold.toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <span className="text-[10px] text-emerald-200/80">
                            Your current save will be auto-backed up before overwriting.
                          </span>
                          <RpgButton
                            variant="emerald"
                            size="sm"
                            onClick={handleConfirmImport}
                            className="font-display font-black uppercase shrink-0"
                          >
                            Confirm Import
                          </RpgButton>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Danger Zone: 2-Step Reset */}
                  <div className="rounded-2xl bg-rose-950/20 border border-rose-500/35 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-display font-black uppercase tracking-[0.2em] text-rose-300 flex items-center gap-1.5">
                          <Trash2 className="w-3.5 h-3.5" /> Danger Zone
                        </div>
                        <div className="text-xs text-slate-400">
                          Start a fresh starter save (an emergency backup is saved first).
                        </div>
                      </div>
                      {!resetConfirmStep && (
                        <button
                          onClick={() => setResetConfirmStep(true)}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/60 text-rose-200 text-[11px] font-display font-black uppercase tracking-wider hover:bg-rose-500/25 transition shrink-0"
                        >
                          Reset Save
                        </button>
                      )}
                    </div>
                    {resetConfirmStep && (
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-rose-500/25">
                        <input
                          type="text"
                          value={resetKeyword}
                          onChange={(e) => setResetKeyword(e.target.value)}
                          placeholder="Type RESET to confirm"
                          className="flex-1 min-w-[160px] rounded-lg bg-slate-950 border border-rose-500/60 px-3 py-1.5 text-xs font-mono text-white focus:outline-none select-text"
                        />
                        <RpgButton variant="rose" size="sm" onClick={handleConfirmReset}>
                          Confirm Reset
                        </RpgButton>
                        <RpgButton
                          variant="slate"
                          size="sm"
                          onClick={() => {
                            setResetConfirmStep(false);
                            setResetKeyword('');
                          }}
                        >
                          Cancel
                        </RpgButton>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* TAB 2: COMMANDER PROFILE */}
              {tab === 'PROFILE' && !combatOnlyMode && (
                <div className="rpg-ornate-card p-4 space-y-4">
                  <div className="text-[10px] font-display font-black uppercase tracking-[0.2em] text-amber-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Commander Identity
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs text-slate-300 font-semibold">
                      Commander Name (shown in Lobby & Save Files)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="text"
                        value={nameInput}
                        maxLength={24}
                        onChange={(e) => setNameInput(e.target.value)}
                        className="flex-1 min-w-[200px] rounded-xl bg-slate-950 border border-amber-400/40 focus:border-amber-300 focus:outline-none px-3.5 py-2 text-sm font-bold text-white select-text"
                      />
                      <RpgButton variant="gold" size="md" onClick={handleSaveCommanderName}>
                        <Check className="w-4 h-4" /> Save Name
                      </RpgButton>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: AUDIO & VISUAL */}
              {tab === 'AUDIO' && (
                <div className="space-y-3.5">
                  <div className="rpg-ornate-card p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-display font-black uppercase tracking-[0.2em] text-cyan-300 flex items-center gap-1.5">
                        <Volume2 className="w-3.5 h-3.5" /> Sound & Music Mixing
                      </div>
                      <button
                        onClick={() => settings.toggleMuted()}
                        className={`px-3 py-1 rounded-lg border text-[11px] font-display font-black uppercase flex items-center gap-1.5 transition ${
                          settings.muted
                            ? 'bg-rose-500/20 border-rose-400 text-rose-200'
                            : 'bg-emerald-500/15 border-emerald-400/60 text-emerald-200'
                        }`}
                      >
                        {settings.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                        {settings.muted ? 'Muted' : 'Sound On'}
                      </button>
                    </div>

                    {/* BGM Slider */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-slate-200">BGM Music Volume</span>
                        <span className="font-mono font-black text-amber-300">
                          {Math.round(settings.bgmVolume * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round(settings.bgmVolume * 100)}
                        onChange={(e) => settings.setBgmVolume(Number(e.target.value) / 100)}
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                    </div>

                    {/* SFX Slider */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-slate-200">Combat & UI SFX Volume</span>
                        <span className="font-mono font-black text-cyan-300">
                          {Math.round(settings.sfxVolume * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round(settings.sfxVolume * 100)}
                        onChange={(e) => settings.setSfxVolume(Number(e.target.value) / 100)}
                        onMouseUp={() => audioManager.playSfx('button')}
                        onTouchEnd={() => audioManager.playSfx('button')}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Visual & Performance Toggles */}
                  <div className="rpg-ornate-card p-4 space-y-3">
                    <div className="text-[10px] font-display font-black uppercase tracking-[0.2em] text-amber-300 flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5" /> Visual & Performance
                    </div>

                    {[
                      {
                        label: 'SSR 1080p Animated Ultimate Video Cut-Ins',
                        desc: 'Turn OFF for instant lightweight static Cut-Ins during fast farming',
                        value: settings.enableUltVideo,
                        onToggle: () => settings.setEnableUltVideo(!settings.enableUltVideo),
                      },
                      {
                        label: 'Combat Camera Shake & Impact Recoil',
                        desc: 'Dynamic screen shake on Criticals, Boss slams, and Ultimates',
                        value: settings.enableScreenShake,
                        onToggle: () => settings.setEnableScreenShake(!settings.enableScreenShake),
                      },
                      {
                        label: 'Floating Damage & Heal Numbers',
                        desc: 'Display live RPG damage popups on battlefield hits',
                        value: settings.enableDamageNumbers,
                        onToggle: () => settings.setEnableDamageNumbers(!settings.enableDamageNumbers),
                      },
                    ].map((row) => (
                      <div
                        key={row.label}
                        className="flex items-center justify-between gap-3 py-2 border-t border-white/10 first:border-t-0 first:pt-0"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white">{row.label}</div>
                          <div className="text-[11px] text-slate-400">{row.desc}</div>
                        </div>
                        <button
                          onClick={() => {
                            audioManager.playSfx('button');
                            row.onToggle();
                          }}
                          className={`px-3 py-1.5 rounded-lg border text-[11px] font-display font-black uppercase tracking-wider shrink-0 transition ${
                            row.value
                              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                              : 'bg-slate-900 border-slate-700 text-slate-400'
                          }`}
                        >
                          {row.value ? 'ON' : 'OFF'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: COMBAT DEFAULTS */}
              {tab === 'COMBAT' && (
                <div className="rpg-ornate-card p-4 space-y-3.5">
                  <div className="text-[10px] font-display font-black uppercase tracking-[0.2em] text-amber-300 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5" /> Default Battle Automation
                  </div>
                  <p className="text-xs text-slate-400">
                    Automatically applied whenever you deploy into Campaign stages or Rift Dungeons.
                  </p>

                  <div className="flex items-center justify-between gap-3 py-2 border-t border-white/10">
                    <div>
                      <div className="text-xs font-bold text-white">Default Battle Speed</div>
                      <div className="text-[11px] text-slate-400">Choose 1× tactical pace or 2× fast farm pace</div>
                    </div>
                    <div className="flex gap-1.5">
                      {([1, 2] as const).map((sp) => (
                        <button
                          key={sp}
                          onClick={() => {
                            audioManager.playSfx('button');
                            settings.setDefaultBattleSpeed(sp);
                          }}
                          className={`px-3 py-1.5 rounded-lg border font-mono text-xs font-black transition ${
                            settings.defaultBattleSpeed === sp
                              ? 'bg-amber-400/25 border-amber-300 text-amber-200'
                              : 'bg-slate-900 border-slate-700 text-slate-400'
                          }`}
                        >
                          {sp}×
                        </button>
                      ))}
                    </div>
                  </div>

                  {[
                    {
                      label: 'Auto-Skill On Deploy',
                      desc: 'Squad automatically casts Skills & Ultimates when SP / Gauge fills',
                      value: settings.defaultAutoSkill,
                      onToggle: () => settings.setDefaultAutoSkill(!settings.defaultAutoSkill),
                    },
                    {
                      label: 'Auto-Move On Deploy',
                      desc: 'Squad automatically advances and engages enemy formations',
                      value: settings.defaultAutoMove,
                      onToggle: () => settings.setDefaultAutoMove(!settings.defaultAutoMove),
                    },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between gap-3 py-2 border-t border-white/10"
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{row.label}</div>
                        <div className="text-[11px] text-slate-400">{row.desc}</div>
                      </div>
                      <button
                        onClick={() => {
                          audioManager.playSfx('button');
                          row.onToggle();
                        }}
                        className={`px-3 py-1.5 rounded-lg border text-[11px] font-display font-black uppercase tracking-wider shrink-0 transition ${
                          row.value
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                            : 'bg-slate-900 border-slate-700 text-slate-400'
                        }`}
                      >
                        {row.value ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  ))}

                  <div className="pt-2 border-t border-white/10 flex justify-end">
                    <button
                      onClick={() => {
                        audioManager.playSfx('button');
                        settings.resetSettings();
                        flashNotice('Restored default Audio, Visual & Combat preferences.', 'ok');
                      }}
                      className="text-[11px] font-bold text-slate-400 hover:text-amber-300 flex items-center gap-1 transition"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Reset Preferences to Defaults
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* FOOTER */}
            <div className="shrink-0 px-4 sm:px-5 py-3 border-t border-white/10 bg-slate-950/80 flex items-center justify-end">
              <RpgButton variant="slate" size="md" onClick={onClose}>
                Done
              </RpgButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
