import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Clock } from 'lucide-react';

const FastClick = ({ players, status, onGameOver }) => {
  const [countdown, setCountdown] = useState(5);
  const [playTime, setPlayTime] = useState(10);
  const [phase, setPhase] = useState('countdown'); // countdown, playing, result

  useEffect(() => {
    if (phase === 'countdown') {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        setPhase('playing');
      }
    } else if (phase === 'playing') {
      if (playTime > 0) {
        const timer = setTimeout(() => setPlayTime(playTime - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        setPhase('result');
        if (onGameOver) onGameOver();
      }
    }
  }, [countdown, playTime, phase]);

  const sortedPlayers = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));

  return (
    <div className="game-container">
      {phase === 'countdown' ? (
        <motion.div
          key="countdown"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="countdown-screen"
        >
          <Clock size={80} className="neon-text" />
          <h2>Get Ready!</h2>
          <motion.h1
            key={countdown}
            initial={{ scale: 2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="big-number"
          >
            {countdown}
          </motion.h1>
        </motion.div>
      ) : (
        <div className="leaderboard-screen">
          <div className="game-header">
            <h1 className="neon-text">
              {phase === 'playing' ? `TAP AS FAST AS YOU CAN!` : 'FINAL STANDINGS'}
            </h1>
            {phase === 'playing' && (
              <div className="timer-bar-container">
                <motion.div
                  className="timer-bar"
                  initial={{ width: '100%' }}
                  animate={{ width: `${(playTime / 10) * 100}%` }}
                  transition={{ duration: 1, ease: "linear" }}
                />
              </div>
            )}
          </div>

          <div className="leaderboard-grid">
            {sortedPlayers.map((player, index) => (
              <motion.div
                key={player.id}
                layout
                className={`player-result-card glass-panel ${index === 0 ? 'winner' : ''} ${phase === 'result' ? 'final' : ''}`}
                style={{ '--color': player.color }}
              >
                <div className="rank">#{index + 1}</div>
                <div className="player-info">
                  <div className="avatar" style={{ border: `3px solid ${player.color}` }}>
                    {player.avatar ? <img src={player.avatar} alt="" /> : player.name[0].toUpperCase()}
                  </div>
                  <div className="name-box">
                    <span className="name">{player.name}</span>
                    <div className="p-progress-bg">
                      <motion.div
                        className="p-progress-fill"
                        animate={{ width: `${Math.min(100, (player.score || 0) / 0.5)}%` }}
                        style={{ backgroundColor: player.color }}
                      />
                    </div>
                  </div>
                </div>
                <div className="score-box">
                  <span className="score">{player.score || 0}</span>
                  <span className="unit">CLICKS</span>
                </div>
                {index === 0 && phase === 'result' && (
                  <motion.div
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="trophy-wrapper"
                  >
                    <Trophy className="trophy-icon-gold" />
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>

          {phase === 'result' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="actions"
            >
              <div className="winner-announcement">
                <h2 style={{ color: sortedPlayers[0]?.color }}>{sortedPlayers[0]?.name} IS THE CHAMPION!</h2>
              </div>
              <p className="hint">Waiting for host to select next game...</p>
            </motion.div>
          )}
        </div>
      )}

      <style jsx>{`
        .game-container {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .countdown-screen {
          text-align: center;
        }
        .big-number {
          font-size: 15rem;
          line-height: 1;
          margin: 0;
          color: var(--accent-primary);
        }
        .leaderboard-screen {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 40px;
        }
        .timer-bar-container { width: 100%; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; mt: 10px; overflow: hidden; }
        .timer-bar { height: 100%; background: var(--accent-primary); box-shadow: 0 0 15px var(--accent-primary); }
        
        .p-progress-bg { width: 200px; height: 6px; background: rgba(0,0,0,0.3); border-radius: 3px; overflow: hidden; margin-top: 5px; }
        .p-progress-fill { height: 100%; box-shadow: 0 0 10px currentColor; transition: width 0.2s; }
        .name-box { display: flex; flex-direction: column; }

        .player-result-card {
          display: flex;
          align-items: center;
          padding: 15px 30px;
          gap: 20px;
          position: relative;
          overflow: hidden;
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 20px;
        }
        .avatar {
          width: 55px;
          height: 55px;
          border-radius: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          background: #111;
          overflow: hidden;
        }
        .avatar img { width: 100%; height: 100%; object-fit: cover; }
        .winner-announcement h2 { font-size: 2.5rem; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 0 20px rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
};

export default FastClick;
