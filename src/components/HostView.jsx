import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import { ref, onValue, update, set } from 'firebase/database';
import { Users, LogOut, Play, Zap, MousePointer2, Palette, Bomb, Compass, ListChecks, Home, Trophy, BarChart3, Swords, Flame, Heart, Crosshair, Mountain, Car, BookOpen, Brain, Calculator, Sparkles, Ghost as SharkAttackIcon } from 'lucide-react';

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
import MathRace from './games/MathRace';
import SharkAttack from './games/SharkAttack';
import { sounds } from '../utils/sounds';

const HostView = ({ roomCode, user, setView }) => {
  const [players, setPlayers] = useState([]);
  const [status, setStatus] = useState('lobby');
  const [selectedGame, setSelectedGame] = useState('fast-click');
  const [gameType, setGameType] = useState('');
  const [isGameOver, setIsGameOver] = useState(false);
  const [scores, setScores] = useState({}); // cross-game global scores
  const [isTournament, setIsTournament] = useState(false);
  const [tournamentCount, setTournamentCount] = useState(0);
  const [activeReactions, setActiveReactions] = useState([]);

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
        if (data.reactions) {
          const list = Object.entries(data.reactions).map(([id, r]) => ({ id, ...r }));
          setActiveReactions(list);
          // Cleanup old reactions from DB after 3s
          setTimeout(() => {
            list.forEach(r => {
              if (Date.now() - parseInt(r.id) > 2000) {
                set(ref(db, `rooms/${roomCode}/reactions/${r.id}`), null);
              }
            });
          }, 2500);
        } else {
          setActiveReactions([]);
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
      updates[`rooms/${roomCode}/players/${p.id}/eliminated`] = false;
      updates[`rooms/${roomCode}/players/${p.id}/posX`] = 50;
      updates[`rooms/${roomCode}/players/${p.id}/posY`] = 50;
      updates[`rooms/${roomCode}/players/${p.id}/shakeCount`] = 0;
    });

    sounds.playStart();

    updates[`rooms/${roomCode}/status`] = 'playing';
    updates[`rooms/${roomCode}/gameType`] = selectedGame;
    updates[`rooms/${roomCode}/gamePhase`] = 'starting';
    updates[`rooms/${roomCode}/startedAt`] = Date.now();

    update(ref(db), updates);
  };

  const startTournament = () => {
    setIsGameOver(false);
    setTournamentCount(0);
    setIsTournament(true);
    // Pick first game randomly
    const randomGame = games[Math.floor(Math.random() * games.length)].id;
    setSelectedGame(randomGame);

    // Start it
    const updates = {};
    players.forEach(p => {
      updates[`rooms/${roomCode}/players/${p.id}/score`] = 0;
      updates[`rooms/${roomCode}/players/${p.id}/distance`] = 0;
      updates[`rooms/${roomCode}/players/${p.id}/shakeCount`] = 0;
    });

    updates[`rooms/${roomCode}/status`] = 'playing';
    updates[`rooms/${roomCode}/gameType`] = randomGame;
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
    if (winnerId === 'fish_team') {
      sounds.playWin();
      players.filter(p => p.id !== gameType.sharkId).forEach(p => {
        set(ref(db, `rooms/${roomCode}/globalScores/${p.id}`), (scores[p.id] || 0) + 10);
      });
    } else if (winnerId) {
      sounds.playWin();
      const currentScore = scores[winnerId] || 0;
      set(ref(db, `rooms/${roomCode}/globalScores/${winnerId}`), currentScore + 10); // Reward 10 pts
    } else {
      sounds.playLoss();
    }
    update(ref(db, `rooms/${roomCode}`), { gamePhase: 'finished' });

    if (isTournament && tournamentCount < 4) { // Play 5 games total
      setTimeout(() => {
        const nextGame = games[Math.floor(Math.random() * games.length)].id;
        const updates = {};
        players.forEach(p => {
          updates[`rooms/${roomCode}/players/${p.id}/score`] = 0;
          updates[`rooms/${roomCode}/players/${p.id}/distance`] = 0;
          updates[`rooms/${roomCode}/players/${p.id}/action`] = 'idle';
        });
        updates[`rooms/${roomCode}/status`] = 'playing';
        updates[`rooms/${roomCode}/gameType`] = nextGame;
        updates[`rooms/${roomCode}/gamePhase`] = 'starting';
        update(ref(db), updates);
        setTournamentCount(prev => prev + 1);
        setIsGameOver(false);
      }, 5000);
    }
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
    { id: 'math-race', name: 'Math Race', icon: Calculator, desc: 'Solve problems to race!' },
    { id: 'shark-attack', name: 'Shark Attack', icon: SharkAttackIcon, desc: '1 vs All: Push or survive!' },
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
          {gameType === 'math-race' && <MathRace players={players} roomCode={roomCode} onGameOver={handleGameOver} />}
          {gameType === 'shark-attack' && <SharkAttack players={players} roomCode={roomCode} onGameOver={handleGameOver} />}

          {isGameOver && isTournament && tournamentCount >= 4 && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="tournament-celebration glass-panel center-all">
              <Trophy size={150} color="#ffd700" className="glow-icon" />
              <h1 className="neon-text">GRAND PRIX CHAMPION</h1>
              {players.sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0)).slice(0, 1).map(p => (
                <div key={p.id} className="champion-reveal center-all">
                  <motion.div initial={{ y: 50 }} animate={{ y: 0 }} className="champ-crown">👑</motion.div>
                  <div className="champ-avatar" style={{ borderColor: p.color }}>
                    {p.avatar ? <img src={p.avatar} /> : p.name?.[0]}
                  </div>
                  <h2>{p.name}</h2>
                  <div className="p-score">{scores[p.id] || 0} TOTAL POINTS</div>
                  <p>All hail the Party King/Queen!</p>
                </div>
              ))}
            </motion.div>
          )}
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
            <div className="playground-container glass-panel">
              <div className="section-title"><h3>INTERACTIVE LOBBY</h3> <p>Move your avatars!</p></div>
              <div className="playground-area">
                {players.map(p => (
                  <motion.div
                    key={p.id}
                    className="lobby-avatar"
                    animate={{
                      left: `${p.lobbyX ?? Math.random() * 80 + 10}%`,
                      top: `${p.lobbyY ?? Math.random() * 80 + 10}%`
                    }}
                    transition={{ type: 'spring', damping: 20 }}
                  >
                    <div className="avatar-body" style={{ borderColor: p.color }}>
                      {p.avatar ? <img src={p.avatar} /> : p.name?.[0].toUpperCase()}
                      {p.prop === 'crown' && <div className="prop-crown">👑</div>}
                      {p.prop === 'hat' && <div className="prop-hat">🎩</div>}
                      {p.prop === 'cool' && <div className="prop-cool">😎</div>}
                    </div>
                    <div className="avatar-label" style={{ backgroundColor: p.color }}>{p.name}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          <section className="lobby-right">
            <div className="lobby-controls glass-panel">
              <div className="mode-toggle">
                <button className={`mode-btn ${!isTournament ? 'active' : ''}`} onClick={() => setIsTournament(false)}>SINGLE GAME</button>
                <button className={`mode-btn ${isTournament ? 'active' : ''}`} onClick={() => setIsTournament(true)}><Trophy size={16} /> GRAND PRIX</button>
              </div>

              {!isTournament ? (
                <div className="game-grid-container">
                  <div className="section-title"><h3>GAMES</h3></div>
                  <div className="games-grid">
                    {games.map(game => (
                      <motion.div
                        key={game.id}
                        className={`game-card glass-panel ${selectedGame === game.id ? 'active' : ''}`}
                        onClick={() => setSelectedGame(game.id)}
                        whileHover={{ scale: 1.05 }}
                      >
                        <game.icon size={28} className="icon" />
                        <div className="game-info">
                          <h4>{game.name}</h4>
                        </div>
                        {selectedGame === game.id && <div className="active-glow" />}
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="tournament-info center-all">
                  <Sparkles size={60} color="#ffd700" />
                  <h2>GRAND PRIX MODE</h2>
                  <p>5 random games in a row. Final winner gets the CROWN!</p>
                  <ul className="t-rules">
                    <li>5 Random Rounds</li>
                    <li>Cumulative Score</li>
                    <li>Final Ceremony</li>
                  </ul>
                </div>
              )}

              <button
                className={`neon-button start-game-btn ${isTournament ? 'tournament' : ''}`}
                disabled={players.length === 0}
                onClick={isTournament ? startTournament : startGame}
              >
                {isTournament ? <Trophy size={24} /> : <Play size={24} />}
                {isTournament ? 'START GRAND PRIX' : 'START GAME'}
              </button>
            </div>

            <div className="players-container glass-panel mini">
              <div className="section-title"><Users size={20} /> <h3>PLAYERS ({players.length})</h3></div>
              <div className="players-list-scroll">
                {players.map(p => (
                  <div key={p.id} className="player-row-mini">
                    <div className="avatar-mini" style={{ backgroundColor: p.color }}>
                      {p.avatar ? <img src={p.avatar} /> : p.name?.[0]}
                    </div>
                    <span className="p-name">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>

      <style>{`
        .lobby-view { width: 100vw; height: 100vh; padding: 30px; }
        .lobby-container { width: 100%; height: 100%; display: flex; flex-direction: column; padding: 25px; gap: 20px; }
        .lobby-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .room-badge h1 { font-size: 4rem; margin-top: -5px; line-height: 1; }
        .label { font-size: 0.8rem; font-weight: 800; color: var(--text-dim); letter-spacing: 2px; }

        .lobby-main { display: grid; grid-template-columns: 280px 1fr 340px; gap: 20px; flex: 1; min-height: 0; }
        
        /* Sections */
        .lobby-left, .lobby-center, .lobby-right { display: flex; flex-direction: column; gap: 20px; min-height: 0; }

        /* Left Column */
        .qr-container { padding: 20px; text-align: center; }
        .qr-container svg { width: 100% !important; height: auto !important; max-width: 200px; margin: 0 auto; }
        .qr-hint { margin-top: 10px; font-size: 0.8rem; color: var(--text-dim); }
        .leaderboard-section { flex: 1; display: flex; flex-direction: column; gap: 10px; min-height: 0; }
        .leaderboard-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
        .leaderboard-item { display: flex; padding: 10px 15px; background: rgba(255,255,255,0.05); border-radius: 12px; align-items: center; font-size: 0.9rem; }
        .rank { width: 35px; font-weight: 800; color: var(--accent-primary); }
        .name { flex: 1; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 10px; }
        .score { font-weight: 800; color: var(--accent-secondary); }

        /* Center Column - Playground */
        .playground-container { flex: 1; display: flex; flex-direction: column; padding: 20px; gap: 15px; }
        .playground-area { flex: 1; background: rgba(0,0,0,0.2); border-radius: 30px; position: relative; overflow: hidden; border: 2px dashed rgba(255,255,255,0.05); }
        .lobby-avatar { position: absolute; display: flex; flex-direction: column; align-items: center; gap: 5px; transform: translate(-50%, -50%); z-index: 10; }
        .avatar-body { width: 60px; height: 60px; border-radius: 18px; border: 3px solid; background: #111; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; font-weight: 900; overflow: hidden; }
        .avatar-body img { width: 100%; height: 100%; object-fit: cover; }
        .avatar-label { font-size: 0.65rem; font-weight: 800; padding: 2px 8px; border-radius: 6px; color: black; white-space: nowrap; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }

        /* Right Column - Controls & Players */
        .lobby-controls { flex: 2; display: flex; flex-direction: column; gap: 15px; padding: 15px; min-height: 0; }
        .mode-toggle { display: grid; grid-template-columns: 1fr 1fr; background: rgba(0,0,0,0.3); padding: 4px; border-radius: 12px; }
        .mode-btn { padding: 8px; border: none; background: transparent; color: var(--text-dim); font-weight: 800; font-size: 0.7rem; border-radius: 9px; cursor: pointer; transition: all 0.2s; }
        .mode-btn.active { background: var(--accent-primary); color: black; }
        
        .game-grid-container { flex: 1; display: flex; flex-direction: column; min-height: 0; margin-top: 5px; }
        .games-grid { flex: 1; display: grid; grid-template-columns: 1fr; gap: 8px; overflow-y: auto; padding-right: 8px; }
        .game-card { padding: 12px; border-radius: 12px; transition: all 0.2s; border: 1px solid rgba(255,255,255,0.05); cursor: pointer; }
        .game-card.active { border-color: var(--accent-primary); background: rgba(0, 242, 255, 0.05); }
        .game-card h4 { font-size: 0.85rem; font-weight: 700; }
        .active-glow { position: absolute; inset: 0; border: 2px solid var(--accent-primary); border-radius: 12px; pointer-events: none; opacity: 0.3; }

        .tournament-info { flex: 1; text-align: center; gap: 15px; padding: 10px; }
        .t-rules { text-align: left; background: rgba(255,255,255,0.03); padding: 15px; border-radius: 12px; list-style: none; font-size: 0.8rem; font-weight: 700; color: #ffd700; }
        .t-rules li::before { content: "★ "; }

        .start-game-btn { width: 100%; padding: 14px; font-size: 1.1rem; border-radius: 12px; margin-top: auto; }
        .start-game-btn.tournament { background: linear-gradient(135deg, #ffd700, #ff8800); color: black; border: none; box-shadow: 0 0 20px rgba(255, 215, 0, 0.2); }

        .players-container.mini { flex: 1; padding: 15px; min-height: 0; display: flex; flex-direction: column; gap: 10px; }
        .players-list-scroll { flex: 1; overflow-y: auto; padding-right: 8px; display: flex; flex-direction: column; gap: 6px; }
        .player-row-mini { display: flex; align-items: center; gap: 10px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 10px; }
        .avatar-mini { width: 30px; height: 30px; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 900; background: #333; }
        .avatar-mini img { width: 100%; height: 100%; object-fit: cover; }
        .p-name { font-size: 0.85rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .section-title { display: flex; align-items: center; justify-content: space-between; color: var(--text-dim); margin-bottom: 5px; }
        .section-title h3 { font-size: 0.8rem; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; }
        .section-title p { font-size: 0.7rem; opacity: 0.7; }

        /* Shared Components */
        .reaction-overlay { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 1000; }
        .floating-reaction { position: absolute; display: flex; flex-direction: column; align-items: center; gap: 5px; }
        .r-bubble { font-size: 2.5rem; background: rgba(0,0,0,0.6); padding: 10px; border-radius: 50%; border: 2px solid; backdrop-filter: blur(8px); }
        .r-sender { font-size: 0.7rem; font-weight: 800; background: rgba(0,0,0,0.8); padding: 2px 8px; border-radius: 6px; color: white; }

        .tournament-celebration { position: absolute; inset: 40px; z-index: 10000; background: rgba(0,0,0,0.95); border: 8px solid #ffd700; border-radius: 40px; }
        .champion-reveal { margin-top: 30px; gap: 20px; text-align: center; }
        .champ-avatar { width: 180px; height: 180px; border-radius: 40px; border: 8px solid; overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 6rem; font-weight: 900; background: #111; }
        .champ-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .champ-crown { font-size: 5rem; text-shadow: 0 0 30px #ffd700; margin-bottom: -40px; z-index: 100; }
        
        .prop-crown { position: absolute; top: -25px; font-size: 2.5rem; }
        .prop-hat { position: absolute; top: -25px; font-size: 2.5rem; }
        .prop-cool { position: absolute; bottom: 5px; font-size: 1.5rem; }
        .game-view { width: 100vw; height: 100vh; position: relative; overflow: hidden; background: #050505; }
        .game-hud { position: absolute; top: 20px; right: 20px; z-index: 9999; }
        .game-hud .neon-button { background: rgba(0,0,0,0.8); backdrop-filter: blur(10px); }
        .active-game-container { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; padding: 30px; }
      `}</style>
    </div>
  );
};

export default HostView;
