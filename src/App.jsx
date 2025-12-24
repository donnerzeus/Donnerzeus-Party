import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from './firebase';
import { ref, set, onValue, push, update } from 'firebase/database';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import HostView from './components/HostView';
import ControllerView from './components/ControllerView';
import { Sparkles, Gamepad2, Users, Monitor } from 'lucide-react';

function App() {
  const [view, setView] = useState('landing'); // landing, host, controller
  const [user, setUser] = useState(null);
  const [roomCode, setRoomCode] = useState('');

  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    onAuthStateChanged(auth, (u) => setUser(u));

    // Handle initial room code from URL if present
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
      setRoomCode(room.toUpperCase());
      setView('controller');
    }
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

    // Initialize room in RTDB
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
    const cleanCode = code.toUpperCase();
    setRoomCode(cleanCode);
    setView('controller');
  };

  return (
    <div className="app-container">
      <AnimatePresence mode="wait">
        {view === 'landing' && (
          <motion.div
            key="landing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="landing-page"
          >
            <div className="hero-section">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 5 }}
                className="logo-icon"
              >
                <Gamepad2 size={80} color="#00f2ff" />
              </motion.div>
              <h1 className="neon-text">PARTY GAMES</h1>
              <p className="subtitle">Transform your phone into a controller!</p>

              <div className="action-cards">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="glass-panel action-card"
                  onClick={startHost}
                >
                  <Monitor size={48} />
                  <h3>Host Game</h3>
                  <p>Display on big screen</p>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="glass-panel action-card"
                >
                  <Users size={48} />
                  <h3>Join Game</h3>
                  <div className="join-input-group">
                    <input
                      type="text"
                      placeholder="CODE"
                      maxLength={4}
                      onChange={(e) => setRoomCode(e.target.value)}
                      className="room-input"
                    />
                    <button
                      className="neon-button mini"
                      onClick={() => joinRoom(roomCode)}
                    >
                      GO
                    </button>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'host' && (
          <HostView roomCode={roomCode} user={user} setView={setView} />
        )}

        {view === 'controller' && (
          <ControllerView roomCode={roomCode} user={user} setView={setView} />
        )}
      </AnimatePresence>

      <style>{`
        .app-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 20px;
        }
        .landing-page {
          text-align: center;
          max-width: 800px;
          width: 100%;
        }
        .hero-section h1 {
          font-size: 5rem;
          font-weight: 800;
          margin-bottom: 10px;
          letter-spacing: -2px;
        }
        .subtitle {
          color: var(--text-dim);
          font-size: 1.2rem;
          margin-bottom: 50px;
        }
        .action-cards {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-top: 40px;
        }
        .action-card {
          padding: 40px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 15px;
          transition: border-color 0.3s;
        }
        .action-card:hover {
          border-color: var(--accent-primary);
        }
        .action-card h3 {
          font-size: 1.5rem;
        }
        .action-card p {
          color: var(--text-dim);
        }
        .join-input-group {
          display: flex;
          gap: 10px;
          margin-top: 10px;
        }
        .room-input {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--glass-border);
          border-radius: 8px;
          color: white;
          padding: 8px;
          width: 100px;
          text-align: center;
          font-size: 1.2rem;
          font-family: 'Outfit', sans-serif;
          font-weight: 600;
          text-transform: uppercase;
        }
        .neon-button.mini {
          padding: 8px 16px;
        }
        @media (max-width: 600px) {
          .action-cards {
            grid-template-columns: 1fr;
          }
          .hero-section h1 {
            font-size: 3rem;
          }
        }
      `}</style>
    </div>
  );
}

export default App;
