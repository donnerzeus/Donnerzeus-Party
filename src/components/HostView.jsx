import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import { ref, onValue, update, set } from 'firebase/database';
import { Users, LogOut, Play, Zap, MousePointer2, Palette, Bomb, Compass, ListChecks, Home, Trophy, BarChart3, Swords, Flame, Heart, Crosshair, Mountain, Car, BookOpen, Brain } from 'lucide-react';

import FastClick from './games/FastClick';
import ReactionTime from './games/ReactionTime';
import SimonSays from './games/SimonSays';
import QuickDraw from './games/QuickDraw';
import HotPotato from './games/HotPotato';
import Steering from './games/Steering';
import ShakeIt from './games/ShakeIt';
import TugOfWar from './games/TugOfWar';
import LavaJump from './games/LavaJump';
import LoveArrows from './games/LoveArrows';
import CrabHunt from './games/CrabHunt';
import SocialClimbers from './games/SocialClimbers';
import NeonRacer from './games/NeonRacer';
import BookSquirm from './games/BookSquirm';
import MemoryMatch from './games/MemoryMatch';

const HostView = ({ roomCode, user, setView }) => {
  const [players, setPlayers] = useState([]);
  const [status, setStatus] = useState('lobby');
  const [selectedGame, setSelectedGame] = useState('fast-click');
  const [gameType, setGameType] = useState('');
  const [isGameOver, setIsGameOver] = useState(false);
  const [scores, setScores] = useState({}); // cross-game global scores

  useEffect(() => {
    const roomRef = ref(db, `rooms/${roomCode}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setStatus(data.status);
        setGameType(data.gameType || '');
        if (data.players) {
          const playerList = Object.entries(data.players).map(([id, p]) => ({ id, ...p }));
          setPlayers(playerList);
        } else {
          setPlayers([]);
        }
        if (data.gamePhase === 'finished') {
          setIsGameOver(true);
        }
        if (data.globalScores) {
          setScores(data.globalScores);
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
      updates[`rooms/${roomCode}/players/${p.id}/shakeCount`] = 0;
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

  const handleGameOver = (winnerId) => {
    setIsGameOver(true);
    if (winnerId) {
      const currentScore = scores[winnerId] || 0;
      set(ref(db, `rooms/${roomCode}/globalScores/${winnerId}`), currentScore + 10); // Reward 10 pts
    }
    update(ref(db, `rooms/${roomCode}`), { gamePhase: 'finished' });
  };

  const joinUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?room=${roomCode}`;

  const games = [
    { id: 'fast-click', name: 'Fast Click', icon: MousePointer2, desc: 'Tap as fast as you can!' },
    { id: 'reaction-time', name: 'Reaction', icon: Zap, desc: 'Tap when the screen turns green!' },
    { id: 'simon-says', name: 'Simon Says', icon: ListChecks, desc: 'Repeat the memory pattern!' },
    { id: 'quick-draw', name: 'Quick Draw', icon: Palette, desc: 'Draw the prompt on your phone!' },
    { id: 'hot-potato', name: 'Hot Potato', icon: Bomb, desc: 'Pass the bomb before it explodes!' },
    { id: 'steering', name: 'Steering', icon: Compass, desc: 'Work together to guide the orb!' },
    { id: 'shake-it', name: 'Shake It!', icon: Zap, desc: 'Shake your phone like crazy!' },
    { id: 'tug-of-war', name: 'Tug of War', icon: Swords, desc: 'Mash together to pull the rope!' },
    { id: 'lava-jump', name: 'Lava Jump', icon: Flame, desc: 'Jump over fire obstacles!' },
    { id: 'love-arrows', name: 'Love Arrows', icon: Heart, desc: 'Follow the arrows as fast as you can!' },
    { id: 'crab-hunt', name: 'Crab Hunt', icon: Crosshair, desc: '1 vs All: Fisherman vs Crabs!' },
    { id: 'social-climbers', name: 'Social Climbers', icon: Mountain, desc: 'CLIMB! But stop during the storm!' },
    { id: 'neon-racer', name: 'Neon Racer', icon: Car, desc: 'Race and avoid the obstacles!' },
    { id: 'book-squirm', name: 'Book Squirm', icon: BookOpen, desc: 'Avoid the paper by fitting through holes!' },
    { id: 'memory-match', name: 'Memory Match', icon: Brain, desc: 'Remember the sequence!' },
  ];

  if (status === 'playing') {
    return (
      <div className="game-view">
        <div className="game-hud">
          <button className="neon-button secondary mini" onClick={backToLobby}>
            {isGameOver ? <Home size={18} /> : <LogOut size={18} />}
            <span>{isGameOver ? "BACK TO LOBBY" : "QUIT"}</span>
          </button>
        </div>

        <div className="active-game-container">
          {gameType === 'fast-click' && <FastClick players={players} roomCode={roomCode} onGameOver={handleGameOver} />}
          {gameType === 'reaction-time' && <ReactionTime players={players} roomCode={roomCode} onGameOver={handleGameOver} />}
          {gameType === 'simon-says' && <SimonSays players={players} roomCode={roomCode} onGameOver={handleGameOver} />}
          {gameType === 'quick-draw' && <QuickDraw players={players} roomCode={roomCode} onGameOver={handleGameOver} />}
          {gameType === 'hot-potato' && <HotPotato players={players} roomCode={roomCode} onGameOver={handleGameOver} />}
          {gameType === 'steering' && <Steering players={players} roomCode={roomCode} onGameOver={handleGameOver} />}
          {gameType === 'shake-it' && <ShakeIt players={players} roomCode={roomCode} onGameOver={handleGameOver} />}
          {gameType === 'tug-of-war' && <TugOfWar players={players} roomCode={roomCode} onGameOver={handleGameOver} />}
          {gameType === 'lava-jump' && <LavaJump players={players} roomCode={roomCode} onGameOver={handleGameOver} />}
          {gameType === 'love-arrows' && <LoveArrows players={players} roomCode={roomCode} onGameOver={handleGameOver} />}
          {gameType === 'crab-hunt' && <CrabHunt players={players} roomCode={roomCode} onGameOver={handleGameOver} />}
          {gameType === 'social-climbers' && <SocialClimbers players={players} roomCode={roomCode} onGameOver={handleGameOver} />}
          {gameType === 'neon-racer' && <NeonRacer players={players} roomCode={roomCode} onGameOver={handleGameOver} />}
          {gameType === 'book-squirm' && <BookSquirm players={players} roomCode={roomCode} onGameOver={handleGameOver} />}
          {gameType === 'memory-match' && <MemoryMatch players={players} roomCode={roomCode} onGameOver={handleGameOver} />}
        </div>
      </div>
    );
  }

  return (
    <div className="lobby-view center-all">
      <div className="lobby-container glass-panel">
        <header className="lobby-header">
          <div className="room-badge">
            <span className="label">ROOM CODE</span>
            <h1 className="neon-text">{roomCode}</h1>
          </div>
          <div className="lobby-actions">
            <button className="neon-button secondary" onClick={() => setView('landing')}>EXIT</button>
          </div>
        </header>

        <main className="lobby-main">
          <section className="lobby-left">
            <div className="qr-container glass-panel">
              <QRCodeSVG value={joinUrl} size={250} bgColor={"transparent"} fgColor={"#00f2ff"} level={"H"} includeMargin={true} />
              <p className="qr-hint">Scan with your phone to join!</p>
            </div>

            <div className="leaderboard-section">
              <div className="section-title"><BarChart3 size={24} /> <h3>HALL OF FAME</h3></div>
              <div className="leaderboard-list">
                {players.length === 0 ? <p className="empty">No heroes yet...</p> :
                  players.sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0)).slice(0, 5).map((p, i) => (
                    <div key={p.id} className="leaderboard-item">
                      <span className="rank">#{i + 1}</span>
                      <span className="name">{p.name}</span>
                      <span className="score">{scores[p.id] || 0} PTS</span>
                    </div>
                  ))}
              </div>
            </div>
          </section>

          <section className="lobby-center">
            <div className="game-grid-container">
              <div className="section-title"><h3>SELECT A MINI-GAME</h3></div>
              <div className="games-grid">
                {games.map(game => (
                  <motion.div
                    key={game.id}
                    className={`game-card glass-panel ${selectedGame === game.id ? 'active' : ''}`}
                    onClick={() => setSelectedGame(game.id)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <game.icon size={40} className="icon" />
                    <div className="game-info">
                      <h4>{game.name}</h4>
                      <p>{game.desc}</p>
                    </div>
                    {selectedGame === game.id && <div className="active-glow" />}
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          <section className="lobby-right">
            <div className="players-container glass-panel">
              <div className="section-title"><Users size={24} /> <h3>PLAYERS ({players.length})</h3></div>
              <div className="players-list-scroll">
                <AnimatePresence>
                  {players.map(p => (
                    <motion.div key={p.id} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="player-row">
                      <div className="avatar" style={{ backgroundColor: p.color }}>{p.name?.[0].toUpperCase()}</div>
                      <span className="player-name">{p.name}</span>
                      {scores[p.id] > 0 && <span className="player-points">{scores[p.id]}</span>}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <button className="neon-button start-game-btn" disabled={players.length === 0} onClick={startGame}>
                <Play size={24} /> START GAME
              </button>
            </div>
          </section>
        </main>
      </div>

      <style>{`
        .lobby-view { width: 100vw; height: 100vh; padding: 40px; }
        .lobby-container { width: 100%; height: 100%; display: flex; flex-direction: column; padding: 30px; gap: 30px; }
        .lobby-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .room-badge h1 { font-size: 5rem; margin-top: -10px; }
        .label { font-size: 0.9rem; font-weight: 800; color: var(--text-dim); letter-spacing: 2px; }

        .lobby-main { display: grid; grid-template-columns: 350px 1fr 350px; gap: 30px; flex: 1; min-height: 0; }
        
        /* Left Section */
        .lobby-left { display: flex; flex-direction: column; gap: 30px; }
        .qr-container { padding: 30px; text-align: center; }
        .qr-hint { margin-top: 15px; font-weight: 600; color: var(--text-dim); }
        .leaderboard-section { flex: 1; display: flex; flex-direction: column; gap: 15px; }
        .leaderboard-list { display: flex; flex-direction: column; gap: 8px; }
        .leaderboard-item { display: flex; padding: 12px 20px; background: rgba(255,255,255,0.05); border-radius: 12px; align-items: center; }
        .rank { width: 40px; font-weight: 800; color: var(--accent-primary); }
        .name { flex: 1; font-weight: 600; }
        .score { font-weight: 800; color: var(--accent-secondary); }

        /* Center Section */
        .lobby-center { display: flex; flex-direction: column; height: 100%; min-height: 0; }
        .game-grid-container { flex: 1; display: flex; flex-direction: column; gap: 20px; overflow: hidden; }
        .games-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; overflow-y: auto; padding-right: 15px; flex: 1; }
        .game-card { padding: 25px; cursor: pointer; display: flex; align-items: center; gap: 20px; position: relative; border-color: rgba(255,255,255,0.05); }
        .game-card.active { border-color: var(--accent-primary); background: rgba(0, 242, 255, 0.05); }
        .game-card .icon { color: var(--accent-primary); }
        .game-card h4 { font-size: 1.5rem; margin-bottom: 5px; }
        .game-card p { color: var(--text-dim); font-size: 0.9rem; }
        .active-glow { position: absolute; inset: 0; border: 2px solid var(--accent-primary); border-radius: 20px; box-shadow: 0 0 20px rgba(0, 242, 255, 0.3); pointer-events: none; }

        /* Right Section */
        .lobby-right { }
        .players-container { height: 100%; display: flex; flex-direction: column; padding: 25px; gap: 20px; }
        .players-list-scroll { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding-right: 10px; }
        .player-row { display: flex; align-items: center; gap: 15px; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 15px; }
        .avatar { width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; color: white; border: 2px solid rgba(255,255,255,0.2); }
        .player-name { flex: 1; font-weight: 600; font-size: 1.1rem; }
        .player-points { font-weight: 800; background: var(--accent-secondary); padding: 4px 10px; border-radius: 8px; font-size: 0.8rem; }
        .start-game-btn { width: 100%; padding: 20px; font-size: 1.5rem; margin-top: auto; }

        .section-title { display: flex; align-items: center; gap: 10px; color: var(--text-dim); }
        .section-title h3 { font-size: 1rem; font-weight: 800; letter-spacing: 2px; }

        /* HUD */
        .game-view { width: 100vw; height: 100vh; position: relative; overflow: hidden; }
        .game-hud { position: absolute; top: 20px; right: 20px; z-index: 9999; }
        .game-hud .neon-button { background: rgba(0,0,0,0.8); backdrop-filter: blur(5px); }
        .active-game-container { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; padding: 40px; }
      `}</style>
    </div>
  );
};

export default HostView;
