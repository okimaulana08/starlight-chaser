import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ShopCategory } from './data/materials';
import { audioManager } from './engine/AudioManager';
import { useCombatStore } from './store/useCombatStore';
import { usePlayerStore } from './store/usePlayerStore';
import type { DungeonId, Faction, ScreenId } from './types/game';
import { CodexScreen } from './ui/CodexScreen';
import { CombatHUD } from './ui/CombatHUD';
import { DungeonScreen } from './ui/DungeonScreen';
import { GachaScreen } from './ui/GachaScreen';
import { LobbyScreen } from './ui/LobbyScreen';
import { ShopScreen } from './ui/ShopScreen';
import { SpireScreen } from './ui/SpireScreen';
import { SquadScreen } from './ui/SquadScreen';
import { TitleScreen } from './ui/TitleScreen';

const SESSION_ENTERED_KEY = 'starlight_session_entered';

export const App: React.FC = () => {
  const [entered, setEntered] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && window.sessionStorage.getItem(SESSION_ENTERED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [screen, setScreen] = useState<ScreenId>('LOBBY');
  const [activeStageId, setActiveStageId] = useState<string>('stage_1_1');
  const [combatReturnScreen, setCombatReturnScreen] = useState<'LOBBY' | 'DUNGEON' | 'SPIRE'>('LOBBY');
  const [shopTab, setShopTab] = useState<ShopCategory>('GROWTH');
  const [dungeonFocus, setDungeonFocus] = useState<{
    dungeonId: DungeonId;
    faction?: Faction;
  }>({ dungeonId: 'GOLD_VAULT' });

  const handleEnterLobby = () => {
    try {
      window.sessionStorage.setItem(SESSION_ENTERED_KEY, '1');
    } catch {
      // Ignore storage restrictions
    }
    setEntered(true);
  };

  useEffect(() => {
    if (entered && screen !== 'COMBAT') {
      audioManager.playBgm('lobby');
    }
  }, [entered, screen]);

  const handleStartCombat = (
    stageId: string,
    returnTo: 'LOBBY' | 'DUNGEON' | 'SPIRE' = 'LOBBY',
  ) => {
    // Synchronously wipe stale Victory/Defeat state BEFORE mounting CombatHUD (prevents Stage Cleared flash!)
    useCombatStore.getState().resetForStage(stageId, '', 1);
    if (!stageId.startsWith('dungeon__') && !stageId.startsWith('spire__')) {
      usePlayerStore.getState().setSelectedStage(stageId);
    }
    setCombatReturnScreen(returnTo);
    setActiveStageId(stageId);
    setScreen('COMBAT');
  };

  const handleExitCombat = () => {
    useCombatStore.getState().setCombatResult(null);
    setScreen(combatReturnScreen);
  };

  const handleOpenShop = (initialTab: ShopCategory = 'GROWTH') => {
    setShopTab(initialTab);
    setScreen('SHOP');
  };

  const handleOpenDungeon = (dungeonId: DungeonId = 'GOLD_VAULT', faction?: Faction) => {
    setDungeonFocus({ dungeonId, faction });
    setScreen('DUNGEON');
  };

  return (
    <div className="w-screen h-[100dvh] overflow-hidden bg-[#050712] text-slate-100">
      <AnimatePresence mode="wait">
        {!entered ? (
          <motion.div
            key="title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.03 }}
            transition={{ duration: 0.28 }}
            className="w-full h-full"
          >
            <TitleScreen onEnterLobby={handleEnterLobby} />
          </motion.div>
        ) : (
          <motion.div
            key={`${screen}_${activeStageId}`}
            initial={{ opacity: 0, scale: 1.012 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="w-full h-full"
          >
            {screen === 'LOBBY' && (
              <LobbyScreen
                onNavigate={setScreen}
                onStartCombat={(stageId) => handleStartCombat(stageId, 'LOBBY')}
                onOpenDungeon={handleOpenDungeon}
              />
            )}
            {screen === 'COMBAT' && (
              <CombatHUD
                stageId={activeStageId}
                onSelectStage={(stageId) => handleStartCombat(stageId, combatReturnScreen)}
                onExit={handleExitCombat}
              />
            )}
            {screen === 'DUNGEON' && (
              <DungeonScreen
                initialDungeonId={dungeonFocus.dungeonId}
                initialFaction={dungeonFocus.faction}
                onBack={() => setScreen('LOBBY')}
                onDeployDungeon={(stageId) => handleStartCombat(stageId, 'DUNGEON')}
                onOpenShop={handleOpenShop}
              />
            )}
            {screen === 'SPIRE' && (
              <SpireScreen
                onBack={() => setScreen('LOBBY')}
                onDeploySpire={(stageId) => handleStartCombat(stageId, 'SPIRE')}
              />
            )}
            {screen === 'SQUAD' && (
              <SquadScreen
                onBack={() => setScreen('LOBBY')}
                onOpenShop={handleOpenShop}
                onOpenDungeon={handleOpenDungeon}
              />
            )}
            {screen === 'SHOP' && (
              <ShopScreen
                initialTab={shopTab}
                onBack={() => setScreen('LOBBY')}
              />
            )}
            {screen === 'GACHA' && <GachaScreen onBack={() => setScreen('LOBBY')} />}
            {screen === 'CODEX' && <CodexScreen onBack={() => setScreen('LOBBY')} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
