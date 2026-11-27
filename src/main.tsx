import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import './index.css';

// Purge legacy art caches so updated sprites, world map art & all 10 region emblems load immediately
if (typeof window !== 'undefined' && 'caches' in window) {
  window.caches.delete('starlight-art-cache').catch(() => {});
  window.caches.delete('starlight-art-v2').catch(() => {});
  window.caches.delete('starlight-art-v3').catch(() => {});
  window.caches.delete('starlight-art-v4').catch(() => {});
  window.caches.delete('starlight-art-v5').catch(() => {});
  window.caches.delete('starlight-art-v6').catch(() => {});
  window.caches.delete('starlight-art-v7').catch(() => {});
  window.caches.delete('starlight-art-v8').catch(() => {});
  window.caches.delete('starlight-art-v9').catch(() => {});
  window.caches.delete('starlight-art-v10').catch(() => {});
}

// Register PWA Service Worker cleanly without jarring mid-session auto-reloads after deploys!
// If a new SW version finishes installing while the user is still on the Welcome Screen (hasn't clicked Start yet),
// apply it quietly before they enter; once in Lobby/Combat, never force-reload and kick them back to Welcome!
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    try {
      const alreadyInLobby = window.sessionStorage.getItem('starlight_session_entered') === '1';
      if (!alreadyInLobby) {
        updateSW(true);
      }
    } catch {
      // Let the new SW activate cleanly on the user's next visit
    }
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
