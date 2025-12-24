import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Clock } from 'lucide-react';

const FastClick = ({ players, status }) => {
    const [timeLeft, setTimeLeft] = useState(10);
    const [gameStarted, setGameStarted] = useState(false);

    useEffect(() => {
        if (timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            setGameStarted(true);
        }
    }, [timeLeft]);

    const sortedPlayers = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));

    return (
        <div className="game-container">
            {!gameStarted ? (
                <motion.div
                    key="countdown"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="countdown-screen"
                >
                    <Clock size={80} className="neon-text" />
                    <h2>Starting in...</h2>
                    <motion.h1
                        key={timeLeft}
                        initial={{ scale: 2, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="big-number"
                    >
                        {timeLeft}
                    </motion.h1>
                </motion.div>
            ) : (
                <div className="leaderboard-screen">
                    <div className="game-header">
                        <h1 className="neon-text">TAP AS FAST AS YOU CAN!</h1>
                    </div>

                    <div className="leaderboard-grid">
                        {sortedPlayers.map((player, index) => (
                            <motion.div
                                key={player.id}
                                layout
                                className={`player-result-card glass-panel ${index === 0 ? 'winner' : ''}`}
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
                                {index === 0 && <Trophy className="trophy-icon" />}
                            </motion.div>
                        ))}
                    </div>
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
        .trophy-icon {
          color: #ffd700;
          position: absolute;
          right: -10px;
          top: -10px;
          width: 60px;
          height: 60px;
          opacity: 0.2;
          transform: rotate(20deg);
        }
      `}</style>
        </div>
    );
};

export default FastClick;
