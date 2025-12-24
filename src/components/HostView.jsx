import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import { ref, onValue, update, set } from 'firebase/database';
import { Users, LogOut, Play, Zap, MousePointer2, Palette, Bomb, Compass, ListChecks, Home } from 'lucide-react';

import FastClick from './games/FastClick';
import ReactionTime from './games/ReactionTime';
import SimonSays from './games/SimonSays';
import QuickDraw from './games/QuickDraw';
import HotPotato from './games/HotPotato';
import Steering from './games/Steering';

const HostView = ({ roomCode, user, setView }) => {
  const [players, setPlayers] = useState([]);
  const [status, setStatus] = useState('lobby');
  const [selectedGame, setSelectedGame] = useState('fast-click');
  const [gameType, setGameType] = useState('');
  const [isGameOver, setIsGameOver] = useState(false);

  useEffect(() => {
    const roomRef = ref(db, `rooms/${roomCode}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setStatus(data.status);
        setGameType(data.gameType || '');
        if (data.players) {
          setPlayers(Object.entries(data.players).map(([id, p]) => ({ id, ...p })));
        } else {
          setPlayers([]);
        }

        // If game exploded/finished in some way
        if (data.gamePhase === 'finished') {
          setIsGameOver(true);
        }
      }
    });
    return () => unsubscribe();
  }, [roomCode]);

  const startGame = () => {
    setIsGameOver(false);
    const updates = {};
    players.forEach(p => {
      updates[`rooms/${roomCode}/players/${p.id}/score`] = 0;
      updates[`rooms/${roomCode}/players/${p.id}/lastClick`] = 0;
      updates[`rooms/${roomCode}/players/${p.id}/drawing`] = null;
      updates[`rooms/${roomCode}/players/${p.id}/gyro`] = null;
    });

    updates[`rooms/${roomCode}/status`] = 'playing';
    updates[`rooms/${roomCode}/gameType`] = selectedGame;
    updates[`rooms/${roomCode}/gamePhase`] = 'starting';
    updates[`rooms/${roomCode}/startedAt`] = Date.now();

    update(ref(db), updates);
  };

  const backToLobby = () => {
    setIsGameOver(false);
    update(ref(db, `rooms/${roomCode}`), {
      status: 'lobby',
      gameType: '',
      gamePhase: ''
    });
  };

  const handleGameOver = () => {
    setIsGameOver(true);
    update(ref(db, `rooms/${roomCode}`), { gamePhase: 'finished' });
  };

  const joinUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;

  if (status === 'playing') {
    return (
      <div className="host-container">
        <div className="game-overlay">
          <button className="neon-button mini quit-btn" onClick={backToLobby}>
            {isGameOver ? <Home size={18} /> : <LogOut size={18} />}
            <span>{isGameOver ? "BACK TO LOBBY" : "QUIT"}</span>
          </button>
        </div>

        {gameType === 'fast-click' && <FastClick players={players} roomCode={roomCode} onGameOver={handleGameOver} />}
        {gameType === 'reaction-time' && <ReactionTime players={players} roomCode={roomCode} onGameOver={handleGameOver} />}
        {gameType === 'simon-says' && <SimonSays players={players} roomCode={roomCode} onGameOver={handleGameOver} />}
        {gameType === 'quick-draw' && <QuickDraw players={players} roomCode={roomCode} onGameOver={handleGameOver} />}
        {gameType === 'hot-potato' && <HotPotato players={players} roomCode={roomCode} onGameOver={handleGameOver} />}
        {gameType === 'steering' && <Steering players={players} roomCode={roomCode} onGameOver={handleGameOver} />}
      </div>
    );
  }

  const games = [
    { id: 'fast-click', name: 'Fast Click', icon: MousePointer2 },
    { id: 'reaction-time', name: 'Reaction', icon: Zap },
    { id: 'simon-says', name: 'Simon Says', icon: ListChecks },
    { id: 'quick-draw', name: 'Quick Draw', icon: Palette },
    { id: 'hot-potato', name: 'Hot Potato', icon: Bomb },
    { id: 'steering', name: 'Steering', icon: Compass },
  ];

  return (
    <div className="host-container">
      <div className="host-header">
        <div className="room-info">
          <span className="label">ROOM CODE</span>
          <h2 className="room-code neon-text">{roomCode}</h2>
        </div>
        <button className="neon-button secondary" onClick={() => setView('landing')}>EXIT</button>
      </div>

      <div className="host-content">
        <div className="lobby-left">
          <div className="glass-panel qr-section">
            <QRCodeSVG value={joinUrl} size={150} bgColor={"transparent"} fgColor={"#00f2ff"} level={"H"} includeMargin={true} />
            <p className="qr-hint">Scan to join</p>
          </div>

          <div className="game-selector glass-panel">
            <h3>Select Game</h3>
            <div className="game-options-grid">
              {games.map(game => (
                <div key={game.id} className={`game-option ${selectedGame === game.id ? 'active' : ''}`} onClick={() => setSelectedGame(game.id)}>
                  <game.icon size={20} />
                  <span>{game.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lobby-right">
          <div className="players-list">
            <div className="section-title"><Users size={24} /><h3>Players ({players.length})</h3></div>
            <div className="players-grid">
              <AnimatePresence>
                {players.map((p) => (
                  <motion.div key={p.id} initial={{ scale: 0 }} animate={{ scale: 1 }} className="player-token" style={{ '--color': p.color }}>
                    <div className="avatar">{p.name ? p.name[0].toUpperCase() : '?'}</div>
                    <span className="player-name">{p.name}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
          <div className="controls">
            <button className="neon-button start-btn" disabled={players.length === 0} onClick={startGame}>
              <Play size={24} /> START {selectedGame.toUpperCase().replace('-', ' ')}
            </button>
          </div>
        </div>
      </div>

      <style>{`
                .host-container { width: 90vw; height: 85vh; display: flex; flex-direction: column; gap: 20px; position: relative; }
                .game-overlay { position: absolute; top: 0; right: 0; z-index: 100; }
                .quit-btn { border-radius: 0 0 0 12px; background: rgba(255,b255,255,0.1); display: flex; align-items: center; gap: 10px; padding: 10px 20px; }
                .host-content { display: grid; grid-template-columns: 1fr 2fr; gap: 40px; flex: 1; }
                .game-options-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                .game-option { display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 10px; background: rgba(255,255,255,0.05); cursor: pointer; transition: all 0.3s; border: 1px solid transparent; font-size: 0.8rem; }
                .game-option.active { background: rgba(0, 242, 255, 0.1); border-color: var(--accent-primary); color: var(--accent-primary); }
                .players-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 15px; }
                .avatar { width: 50px; height: 50px; background: var(--card-bg); border: 2px solid var(--color); box-shadow: 0 0 10px var(--color); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; color: var(--color); }
                .player-name { font-size: 0.8rem; }
            `}</style>
    </div>
  );
};

export default HostView;
