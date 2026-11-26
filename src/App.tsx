import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { audioManager } from './engine/AudioManager';
import { usePlayerStore } from './store/usePlayerStore';
import type { ScreenId } from './types/game';
import { CodexScreen } from './ui/CodexScreen';
import { CombatHUD } from './ui/CombatHUD';
import { GachaScreen } from './ui/GachaScreen';
import { LobbyScreen } from './ui/LobbyScreen';
import { SquadScreen } from './ui/SquadScreen';
import { TitleScreen } from './ui/TitleScreen';

export const App: React.FC = () => {
  const [entered, setEntered] = useState(false);
  const [screen, setScreen] = useState<ScreenId>('LOBBY');
  const [activeStageId, setActiveStageId] = useState<string>('stage_1_1');

  useEffect(() => {
    if (entered && screen !== 'COMBAT') {
      audioManager.playBgm('lobby');
    }
  }, [entered, screen]);

  const handleStartCombat = (stageId: string) => {
    usePlayerStore.getState().setSelectedStage(stageId);
    setActiveStageId(stageId);
    setScreen('COMBAT');
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
            <TitleScreen onEnterLobby={() => setEntered(true)} />
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
              <LobbyScreen onNavigate={setScreen} onStartCombat={handleStartCombat} />
            )}
            {screen === 'COMBAT' && (
              <CombatHUD
                stageId={activeStageId}
                onSelectStage={handleStartCombat}
                onExit={() => setScreen('LOBBY')}
              />
            )}
            {screen === 'SQUAD' && <SquadScreen onBack={() => setScreen('LOBBY')} />}
            {screen === 'GACHA' && <GachaScreen onBack={() => setScreen('LOBBY')} />}
            {screen === 'CODEX' && <CodexScreen onBack={() => setScreen('LOBBY')} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
