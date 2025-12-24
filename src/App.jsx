import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from './firebase';
import { ref, set, onValue, push, update } from 'firebase/database';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import HostView from './components/HostView';
import ControllerView from './components/ControllerView';
import { Sparkles, Gamepad2, Users, Monitor } from 'lucide-react';

const VERSION = "v1.0.3";

function App() {
  const [view, setView] = useState('loading'); // loading, landing, host, controller
  const [user, setUser] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);

      // If we have a room in URL, go straight to controller after auth is ready
      const params = new URLSearchParams(window.location.search);
      const room = params.get('room');
      if (room) {
        setRoomCode(room.toUpperCase());
        setView('controller');
      } else {
        setView('landing');
      }
    });

    return () => unsubscribe();
  }, []);

  const generateRoomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const startHost = () => {
    const code = generateRoomCode();
    setRoomCode(code);
    set(ref(db, `rooms/${code}`), {
      host: user.uid,
      status: 'lobby',
      createdAt: Date.now(),
      gameData: {}
    });
    setView('host');
  };

  const joinRoom = (code) => {
    if (!code || code.length !== 4) return;
    setRoomCode(code.toUpperCase());
    setView('controller');
  };

  return (
    <div className="app-container">
      <div className="version-tag">{VERSION}</div>
      <AnimatePresence mode="wait">
        {!isAuthReady || view === 'loading' ? (
          <motion.div key="loading" className="loading-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="spinner"></div>
            <p>Gathering the party...</p>
          </motion.div>
        ) : view === 'landing' ? (
          <motion.div key="landing" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="landing-page">
            <div className="hero-section">
              <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 5 }} className="logo-icon">
                <Gamepad2 size={80} color="#00f2ff" />
              </motion.div>
              <h1 className="neon-text">PARTY GAMES</h1>
              <p className="subtitle">Transform your phone into a controller!</p>
              <div className="action-cards">
                <motion.div whileHover={{ scale: 1.05 }} className="glass-panel action-card" onClick={startHost}>
                  <Monitor size={48} />
                  <h3>Host Game</h3>
                  <p>Display on big screen</p>
                </motion.div>
                <div className="glass-panel action-card">
                  <Users size={48} />
                  <h3>Join Game</h3>
                  <div className="join-input-group">
                    <input type="text" placeholder="CODE" maxLength={4} onChange={(e) => setRoomCode(e.target.value)} className="room-input" />
                    <button className="neon-button mini" onClick={() => joinRoom(roomCode)}>GO</button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : view === 'host' ? (
          <HostView key="host" roomCode={roomCode} user={user} setView={setView} />
        ) : view === 'controller' ? (
          <ControllerView key="controller" roomCode={roomCode} user={user} setView={setView} />
        ) : null}
      </AnimatePresence>

      <style>{`
        .app-container { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; position: relative; }
        .version-tag { position: absolute; top: 10px; left: 10px; font-size: 0.7rem; color: var(--text-dim); opacity: 0.5; font-family: monospace; z-index: 1000; }
        .loading-screen { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 20px; }
        .spinner { width: 50px; height: 50px; border: 3px solid rgba(0, 242, 255, 0.1); border-top: 3px solid var(--accent-primary); border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .landing-page { text-align: center; max-width: 800px; width: 100%; }
        .hero-section h1 { font-size: 5rem; font-weight: 800; margin-bottom: 10px; letter-spacing: -2px; }
        .subtitle { color: var(--text-dim); font-size: 1.2rem; margin-bottom: 50px; }
        .action-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 40px; }
        .action-card { padding: 40px; display: flex; flex-direction: column; align-items: center; gap: 15px; transition: border-color 0.3s; border: 1px solid var(--glass-border); border-radius: 24px; }
        .action-card:hover { border-color: var(--accent-primary); }
        .action-card h3 { font-size: 1.5rem; }
        .action-card p { color: var(--text-dim); }
        .join-input-group { display: flex; gap: 10px; margin-top: 10px; }
        .room-input { background: rgba(255, 255, 255, 0.05); border: 1px solid var(--glass-border); border-radius: 8px; color: white; padding: 8px; width: 100px; text-align: center; font-size: 1.2rem; font-family: 'Outfit', sans-serif; font-weight: 600; text-transform: uppercase; }
        .neon-button.mini { padding: 8px 16px; }
        @media (max-width: 600px) { .action-cards { grid-template-columns: 1fr; } .hero-section h1 { font-size: 3rem; } }
      `}</style>
    </div>
  );
}

export default App;
