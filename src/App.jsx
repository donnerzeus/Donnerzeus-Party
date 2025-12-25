import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from './firebase';
import { ref, set, onValue, update } from 'firebase/database';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import HostView from './components/HostView';
import ControllerView from './components/ControllerView';
import { Gamepad2, Users, Monitor, AlertCircle } from 'lucide-react';

const VERSION = "v2.1.0";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error("Game Error:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-screen center-all glass-panel">
          <AlertCircle size={80} color="#ff0044" className="glow-icon" />
          <h1 className="glitch-text">GLITCH IN THE MATRIX</h1>
          <p>The mansion's code has collapsed. Don't panic!</p>
          <div className="error-details glass-panel mini">
            <code>{this.state.error?.toString()}</code>
          </div>
          <button className="neon-button" onClick={() => window.location.reload()}>REBOOT SYSTEM</button>
          <style>{`
            .error-screen { 
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                padding: 40px; text-align: center; gap: 30px; border: 2px solid #ff0044; 
                background: rgba(10, 5, 20, 0.95); z-index: 10000;
                display: flex; flex-direction: column; align-items: center; justify-content: center;
            }
            .error-details { padding: 15px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,0,0,0.3); max-width: 80%; overflow-x: auto; margin: 20px 0; border-radius: 12px; }
            .error-details code { color: #ff5555; font-family: monospace; font-size: 0.9rem; }
          `}</style>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [view, setView] = useState('loading'); // loading, landing, host, controller
  const [user, setUser] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const savedCode = localStorage.getItem('party_roomCode');
    const savedView = localStorage.getItem('party_view');

    signInAnonymously(auth).catch(console.error);
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);

      const params = new URLSearchParams(window.location.search);
      const room = params.get('room');
      if (room) {
        const upCode = room.toUpperCase();
        setRoomCode(upCode);
        setView('controller');
        localStorage.setItem('party_roomCode', upCode);
        localStorage.setItem('party_view', 'controller');
      } else if (savedCode && savedView) {
        setRoomCode(savedCode);
        setView(savedView);
      } else {
        setView('landing');
      }
    });

    return () => unsubscribe();
  }, []);

  const setAndPersistView = (v) => {
    setView(v);
    localStorage.setItem('party_view', v);
  };

  const setAndPersistRoom = (c) => {
    setRoomCode(c);
    localStorage.setItem('party_roomCode', c);
  };

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
    setAndPersistRoom(code);
    set(ref(db, `rooms/${code}`), {
      host: user.uid,
      status: 'lobby',
      createdAt: Date.now(),
      gameType: ''
    });
    setAndPersistView('host');
  };

  const joinRoom = (code) => {
    if (!code || code.length !== 4) return;
    setAndPersistRoom(code.toUpperCase());
    setAndPersistView('controller');
  };

  return (
    <ErrorBoundary>
      <div className="app-container">
        <div className="crt-overlay" />
        <div className="version-tag">{VERSION}</div>
        <AnimatePresence mode="wait">
          {!isAuthReady || view === 'loading' ? (
            <motion.div key="loading" className="loading-screen center-all" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="spinner"></div>
              <p className="neon-text">GATHERING THE PARTY...</p>
            </motion.div>
          ) : view === 'landing' ? (
            <motion.div key="landing" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="landing-page center-all">
              <div className="hero-section center-all">
                <motion.div animate={{ rotate: [0, 5, -5, 0], y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4 }} className="logo-icon">
                  <Gamepad2 size={120} color="#00f2ff" style={{ filter: 'drop-shadow(0 0 20px #00f2ff)' }} />
                </motion.div>
                <h1 className="neon-text main-title">DONNERZEUS'S MANSION</h1>
                <p className="subtitle">Your phone is the controller. The screen is the playground.</p>

                <div className="action-cards">
                  <motion.div whileHover={{ y: -10, borderColor: '#00f2ff' }} className="glass-panel action-card" onClick={startHost}>
                    <Monitor size={64} className="icon" />
                    <h3>HOST GAME</h3>
                    <p>Display on your TV/Monitor</p>
                  </motion.div>

                  <div className="glass-panel action-card join-card">
                    <Users size={64} className="icon" />
                    <h3>JOIN GAME</h3>
                    <div className="join-input-group">
                      <input type="text" placeholder="CODE" maxLength={4} onChange={(e) => setRoomCode(e.target.value)} className="room-input" />
                      <button className="neon-button" onClick={() => joinRoom(roomCode)}>JOIN</button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : view === 'host' ? (
            <HostView key="host" roomCode={roomCode} user={user} setView={setAndPersistView} />
          ) : view === 'controller' ? (
            <ControllerView key="controller" roomCode={roomCode} user={user} setView={setAndPersistView} />
          ) : null}
        </AnimatePresence>

        <style>{`
          .app-container { 
            width: 100vw; 
            height: 100vh; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            position: relative;
            background: transparent;
          }
          .version-tag { position: absolute; top: 15px; left: 15px; font-size: 0.75rem; color: var(--text-dim); opacity: 0.6; font-family: monospace; z-index: 1000; }
          .loading-screen p { margin-top: 20px; font-weight: 800; letter-spacing: 3px; }
          .spinner { width: 60px; height: 60px; border: 4px solid rgba(0, 242, 255, 0.1); border-top: 4px solid var(--accent-primary); border-radius: 50%; animation: spin 1s linear infinite; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          
          .main-title { font-size: 5.5rem; margin: 20px 0; font-weight: 900; }
          .subtitle { font-size: 1.4rem; color: var(--text-dim); margin-bottom: 60px; }
          
          .action-cards { display: flex; gap: 40px; justify-content: center; width: 100%; max-width: 1000px; }
          .action-card { padding: 50px; flex: 1; display: flex; flex-direction: column; align-items: center; gap: 20px; text-align: center; cursor: pointer; transition: all 0.3s ease; }
          .action-card h3 { font-size: 2rem; }
          .action-card .icon { color: var(--accent-primary); transition: transform 0.3s; }
          .action-card:hover .icon { transform: scale(1.1); }
          .join-card { cursor: default; }
          
          .join-input-group { display: flex; flex-direction: column; gap: 15px; width: 100%; margin-top: 10px; }
          .room-input { 
            background: rgba(255, 255, 255, 0.05); 
            border: 2px solid var(--glass-border); 
            border-radius: 12px; 
            color: white; 
            padding: 15px; 
            width: 100%; 
            text-align: center; 
            font-size: 1.8rem; 
            font-family: 'Outfit', sans-serif; 
            font-weight: 800; 
            text-transform: uppercase; 
            outline: none;
          }
          .room-input:focus { border-color: var(--accent-primary); box-shadow: 0 0 15px rgba(0, 242, 255, 0.2); }

          @media (max-width: 1024px) {
            .main-title { font-size: 3.5rem; }
            .action-cards { flex-direction: column; align-items: center; }
            .action-card { width: 100%; max-width: 500px; padding: 30px; }
          }
        `}</style>
      </div>
    </ErrorBoundary>
  );
}

export default App;
