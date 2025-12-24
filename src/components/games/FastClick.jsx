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
              {phase === 'playing' ? `TAP! (${playTime}s)` : 'GAME OVER!'}
            </h1>
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
                  <div className="avatar" style={{ background: player.color }}>
                    {player.name[0].toUpperCase()}
                  </div>
                  <span className="name">{player.name}</span>
                </div>
                <div className="score-box">
                  <span className="score">{player.score || 0}</span>
                  <span className="unit">CLICKS</span>
                </div>
                {index === 0 && phase === 'result' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
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
        .game-header {
          text-align: center;
        }
        .leaderboard-grid {
          display: flex;
          flex-direction: column;
          gap: 15px;
          max-width: 800px;
          margin: 0 auto;
          width: 100%;
        }
        .player-result-card {
          display: flex;
          align-items: center;
          padding: 20px 30px;
          gap: 20px;
          position: relative;
          overflow: hidden;
          transition: all 0.5s ease;
        }
        .player-result-card.final {
          transform: scale(1.05);
        }
        .player-result-card.winner {
          border-color: #ffd700;
          box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
        }
        .rank {
          font-size: 1.5rem;
          font-weight: 800;
          opacity: 0.5;
          width: 50px;
        }
        .player-info {
          display: flex;
          align-items: center;
          gap: 15px;
          flex: 1;
        }
        .avatar {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          color: white;
          box-shadow: 0 0 10px rgba(0,0,0,0.3);
        }
        .name {
          font-size: 1.5rem;
          font-weight: 600;
        }
        .score-box {
          text-align: right;
        }
        .score {
          font-size: 2.5rem;
          font-weight: 800;
          color: var(--accent-primary);
          line-height: 1;
          display: block;
        }
        .unit {
          font-size: 0.7rem;
          color: var(--text-dim);
          font-weight: 800;
        }
        .trophy-wrapper {
          position: absolute;
          right: 20px;
        }
        .trophy-icon-gold {
          color: #ffd700;
          width: 40px;
          height: 40px;
          filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.5));
        }
        .actions {
          text-align: center;
          margin-top: 20px;
        }
        .hint {
          color: var(--text-dim);
          font-style: italic;
        }
      `}</style>
    </div>
  );
};

export default FastClick;
