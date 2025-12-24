import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase';
import { ref, update, onValue } from 'firebase/database';
import { Heart, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Trophy } from 'lucide-react';

const LoveArrows = ({ players, roomCode, onGameOver }) => {
    const [gameState, setGameState] = useState('countdown'); // countdown, playing, results
    const [countdown, setCountdown] = useState(3);
    const [timeLeft, setTimeLeft] = useState(30);
    const [scores, setScores] = useState({});

    useEffect(() => {
        if (gameState === 'countdown') {
            if (countdown > 0) {
                const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
                return () => clearTimeout(timer);
            } else {
                setGameState('playing');
                update(ref(db, `rooms/${roomCode}`), { gamePhase: 'playing' });
            }
        }
    }, [countdown, gameState, roomCode]);

    useEffect(() => {
        if (gameState !== 'playing') return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    setGameState('results');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState]);

    useEffect(() => {
        const roomRef = ref(db, `rooms/${roomCode}/players`);
        return onValue(roomRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const newScores = {};
                Object.entries(data).forEach(([id, p]) => {
                    newScores[id] = p.score || 0;
                });
                setScores(newScores);
            }
        });
    }, [roomCode]);

    useEffect(() => {
        if (gameState === 'results') {
            let max = -1;
            let winnerId = null;
            players.forEach(p => {
                const score = scores[p.id] || 0;
                if (score > max) {
                    max = score;
                    winnerId = p.id;
                }
            });
            if (onGameOver) onGameOver(winnerId);
        }
    }, [gameState]);

    return (
        <div className="love-game center-all">
            <AnimatePresence mode="wait">
                {gameState === 'countdown' && (
                    <motion.div key="cd" className="center-all" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ opacity: 0 }}>
                        <Heart size={100} color="#ff00aa" fill="#ff00aa" className="pulse" />
                        <h1 className="neon-text cd-title">LOVE ARROWS</h1>
                        <h1 className="big-cd">{countdown}</h1>
                        <p className="hint">Follow the arrows as fast as you can!</p>
                    </motion.div>
                )}

                {(gameState === 'playing' || gameState === 'results') && (
                    <div className="love-arena center-all">
                        <div className="love-hud">
                            <div className="timer glass-panel">TIME: {timeLeft}s</div>
                        </div>

                        <div className="players-grid">
                            {players.map(p => (
                                <motion.div
                                    key={p.id}
                                    className="player-score-card glass-panel"
                                    animate={{ scale: p.lastClick ? [1, 1.1, 1] : 1 }}
                                    style={{ '--pcolor': p.color }}
                                >
                                    <div className="p-header" style={{ backgroundColor: p.color }}>
                                        <span className="p-initial">{p.name?.[0]}</span>
                                    </div>
                                    <div className="p-info">
                                        <h4>{p.name}</h4>
                                        <div className="score-val neon-text">{scores[p.id] || 0}</div>
                                    </div>
                                    <div className="arrows-feedback">
                                        {p.lastMove === 0 && <ArrowUp size={30} />}
                                        {p.lastMove === 1 && <ArrowDown size={30} />}
                                        {p.lastMove === 2 && <ArrowLeft size={30} />}
                                        {p.lastMove === 3 && <ArrowRight size={30} />}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .love-game { width: 100%; height: 100%; }
                .pulse { animation: heartPulse 1s infinite alternate; filter: drop-shadow(0 0 20px #ff00aa); }
                @keyframes heartPulse { from{scale:1} to{scale:1.2} }
                .big-cd { font-size: 10rem; }
                
                .love-hud { position: absolute; top: 100px; z-index: 5; }
                .timer { padding: 15px 40px; font-size: 2rem; font-weight: 900; border-radius: 20px; border-color: var(--accent-tertiary); }
                
                .players-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 30px; width: 100%; max-width: 1200px; margin-top: 100px; }
                .player-score-card { padding: 20px; display: flex; align-items: center; gap: 20px; position: relative; overflow: hidden; }
                .p-header { width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.5rem; color: white; }
                .p-info h4 { font-size: 1.2rem; color: var(--text-dim); margin-bottom: 5px; }
                .score-val { font-size: 2.5rem; font-weight: 900; color: #ff00aa !important; text-shadow: 0 0 15px rgba(255,0,170,0.5); }
                
                .arrows-feedback { position: absolute; right: 20px; opacity: 0.3; color: white; }
            `}</style>
        </div>
    );
};

export default LoveArrows;
