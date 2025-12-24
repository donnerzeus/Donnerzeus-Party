import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase';
import { ref, update, onValue } from 'firebase/database';
import { Zap, Trophy } from 'lucide-react';

const ShakeIt = ({ players, roomCode, onGameOver }) => {
    const [phase, setPhase] = useState('countdown'); // countdown, shaking, finished
    const [countdown, setCountdown] = useState(3);
    const [winner, setWinner] = useState(null);

    useEffect(() => {
        if (phase === 'countdown') {
            if (countdown > 0) {
                const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
                return () => clearTimeout(timer);
            } else {
                setPhase('shaking');
                update(ref(db, `rooms/${roomCode}`), { gamePhase: 'shaking' });
            }
        }
    }, [countdown, phase, roomCode]);

    useEffect(() => {
        // Find the winner (first to 100 shakes)
        const winThreshold = 100;
        const winnerPlayer = players.find(p => (p.shakeCount || 0) >= winThreshold);
        if (winnerPlayer && phase === 'shaking') {
            setWinner(winnerPlayer);
            setPhase('finished');
            if (onGameOver) onGameOver(winnerPlayer.id);
        }
    }, [players, phase, onGameOver]);

    return (
        <div className="shake-game center-all">
            <AnimatePresence mode="wait">
                {phase === 'countdown' && (
                    <motion.div key="cd" className="center-all" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 1.5, opacity: 0 }}>
                        <h1 className="neon-text CD">GET READY</h1>
                        <h1 className="big-cd">{countdown}</h1>
                    </motion.div>
                )}

                {phase === 'shaking' && (
                    <motion.div key="shake" className="shake-arena center-all" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <h1 className="neon-text">SHAKE YOUR PHONE!!!</h1>
                        <div className="shake-grid">
                            {players.map(p => (
                                <div key={p.id} className="player-bottle">
                                    <div className="bottle-label">{p.name}</div>
                                    <div className="bottle-container">
                                        <motion.div
                                            className="foam"
                                            style={{ backgroundColor: p.color, height: `${Math.min(100, (p.shakeCount || 0))}%` }}
                                            animate={{ y: [0, -5, 0] }}
                                            transition={{ repeat: Infinity, duration: 0.1 }}
                                        />
                                    </div>
                                    <div className="count">{p.shakeCount || 0}%</div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {phase === 'finished' && (
                    <motion.div key="win" className="center-all" initial={{ y: 50 }} animate={{ y: 0 }}>
                        <Trophy size={120} color="#ffd700" className="trophy-glow" />
                        <h1 className="winner-name" style={{ color: winner?.color }}>{winner?.name} WINS!</h1>
                        <p>The fastest shaker in the room!</p>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                .shake-game { width: 100%; height: 100%; }
                .big-cd { font-size: 15rem; font-weight: 900; color: var(--accent-primary); line-height: 1; }
                .shake-arena { width: 100%; }
                .shake-grid { display: flex; gap: 40px; margin-top: 50px; justify-content: center; width: 100%; flex-wrap: wrap; }
                
                .player-bottle { display: flex; flex-direction: column; align-items: center; gap: 15px; }
                .bottle-container { width: 80px; height: 300px; border: 4px solid var(--glass-border); border-radius: 20px; overflow: hidden; position: relative; background: rgba(0,0,0,0.3); }
                .foam { position: absolute; bottom: 0; left: 0; right: 0; filter: brightness(1.2); box-shadow: 0 0 20px currentColor; }
                .bottle-label { font-weight: 800; font-size: 1.2rem; }
                .count { font-family: monospace; font-weight: 800; color: var(--text-dim); }
                
                .winner-name { font-size: 6rem; margin-top: 20px; text-shadow: 0 0 30px currentColor; }
                .trophy-glow { filter: drop-shadow(0 0 30px #ffd700); }
            `}</style>
        </div>
    );
};

export default ShakeIt;
