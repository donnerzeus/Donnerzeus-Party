import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import { ref, onValue, update, set } from 'firebase/database';
import { Users, LogOut, Play, Zap, MousePointer2 } from 'lucide-react';
import FastClick from './games/FastClick';
import ReactionTime from './games/ReactionTime';

const HostView = ({ roomCode, user, setView }) => {
  const [players, setPlayers] = useState([]);
  const [status, setStatus] = useState('lobby');
  const [selectedGame, setSelectedGame] = useState('fast-click');
  const [gameType, setGameType] = useState('');

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
      }
    });

    return () => unsubscribe();
  }, [roomCode]);

  const startGame = () => {
    // Reset player scores and last clicks before starting
    const updates = {};
    players.forEach(p => {
      updates[`rooms/${roomCode}/players/${p.id}/score`] = 0;
      updates[`rooms/${roomCode}/players/${p.id}/lastClick`] = 0;
    });

    updates[`rooms/${roomCode}/status`] = 'playing';
    updates[`rooms/${roomCode}/gameType`] = selectedGame;
    updates[`rooms/${roomCode}/gamePhase`] = 'starting';
    updates[`rooms/${roomCode}/startedAt`] = Date.now();

    update(ref(db), updates);
  };

  const backToLobby = () => {
    update(ref(db, `rooms/${roomCode}`), {
      status: 'lobby',
      gameType: '',
      gamePhase: ''
    });
  };

  const joinUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;

  if (status === 'playing') {
    return (
      <div className="host-container">
        <div className="game-overlay">
          <button className="neon-button mini quit-btn" onClick={backToLobby}>
            QUIT TO LOBBY
          </button>
        </div>
        {gameType === 'fast-click' && <FastClick players={players} roomCode={roomCode} />}
        {gameType === 'reaction-time' && <ReactionTime players={players} roomCode={roomCode} />}
      </div>
    );
  }

  return (
    <div className="host-container">
      <div className="host-header">
        <div className="room-info">
          <span className="label">ROOM CODE</span>
          <h2 className="room-code neon-text">{roomCode}</h2>
        </div>
        <button className="neon-button secondary" onClick={() => setView('landing')}>
          <LogOut size={18} /> Exit
        </button>
      </div>

      <div className="host-content">
        <div className="lobby-left">
          <div className="glass-panel qr-section">
            <QRCodeSVG
              value={joinUrl}
              size={200}
              bgColor={"transparent"}
              fgColor={"#00f2ff"}
              level={"H"}
              includeMargin={true}
            />
            <p className="qr-hint">Scan to join</p>
          </div>

          <div className="game-selector glass-panel">
            <h3>Select Game</h3>
            <div className="game-options">
              <div
                className={`game-option ${selectedGame === 'fast-click' ? 'active' : ''}`}
                onClick={() => setSelectedGame('fast-click')}
              >
                <MousePointer2 size={24} />
                <span>Fast Click</span>
              </div>
              <div
                className={`game-option ${selectedGame === 'reaction-time' ? 'active' : ''}`}
                onClick={() => setSelectedGame('reaction-time')}
              >
                <Zap size={24} />
                <span>Reaction</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lobby-right">
          <div className="players-list">
            <div className="section-title">
              <Users size={24} />
              <h3>Players ({players.length})</h3>
            </div>

            <div className="players-grid">
              <AnimatePresence>
                {players.map((player) => (
                  <motion.div
                    key={player.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="player-token"
                    style={{ '--color': player.color }}
                  >
                    <div className="avatar">
                      {player.name ? player.name[0].toUpperCase() : '?'}
                    </div>
                    <span className="player-name">{player.name}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
              {players.length === 0 && (
                <p className="waiting-msg">Waiting for players...</p>
              )}
            </div>
          </div>

          <div className="controls">
            <button
              className="neon-button start-btn"
              disabled={players.length === 0}
              onClick={startGame}
            >
              <Play size={24} /> START {selectedGame.replace('-', ' ').toUpperCase()}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
                .host-container { width: 90vw; height: 85vh; display: flex; flex-direction: column; gap: 20px; position: relative; }
                .game-overlay { position: absolute; top: 0; right: 0; z-index: 100; }
                .quit-btn { border-radius: 0 0 0 12px; background: rgba(255,0,0,0.2); }
                .host-header { display: flex; justify-content: space-between; align-items: center; }
                .room-info { display: flex; flex-direction: column; }
                .label { color: var(--text-dim); font-size: 0.8rem; letter-spacing: 2px; }
                .room-code { font-size: 3rem; margin-top: -5px; }
                .host-content { display: grid; grid-template-columns: 1fr 2fr; gap: 40px; flex: 1; }
                .lobby-left { display: flex; flex-direction: column; gap: 20px; }
                .qr-section { padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
                .qr-hint { color: var(--text-dim); font-size: 0.9rem; }
                .game-selector { padding: 20px; }
                .game-selector h3 { margin-bottom: 15px; font-size: 1rem; color: var(--text-dim); text-transform: uppercase; }
                .game-options { display: flex; flex-direction: column; gap: 10px; }
                .game-option { 
                    display: flex; align-items: center; gap: 15px; padding: 12px; 
                    border-radius: 12px; background: rgba(255,255,255,0.05); 
                    cursor: pointer; transition: all 0.3s; border: 1px solid transparent;
                }
                .game-option.active { 
                    background: rgba(0, 242, 255, 0.1); 
                    border-color: var(--accent-primary);
                    color: var(--accent-primary);
                }
                .section-title { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; color: var(--accent-primary); }
                .players-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 15px; }
                .player-token { display: flex; flex-direction: column; align-items: center; gap: 8px; }
                .avatar { 
                    width: 60px; height: 60px; background: var(--card-bg); border: 2px solid var(--color); 
                    box-shadow: 0 0 10px var(--color); border-radius: 50%; display: flex; 
                    align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 800; color: var(--color); 
                }
                .player-name { font-weight: 600; font-size: 0.9rem; }
                .controls { margin-top: auto; display: flex; justify-content: flex-end; }
                .start-btn { padding: 15px 40px; font-size: 1.2rem; }
                .start-btn:disabled { opacity: 0.3; filter: grayscale(1); }
            `}</style>
    </div>
  );
};

export default HostView;
