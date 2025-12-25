import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase';
import { ref, update, onValue } from 'firebase/database';
import { Brain, Trophy, CheckCircle, XCircle } from 'lucide-react';

const MemoryMatch = ({ players, roomCode, onGameOver }) => {
    const [gameState, setGameState] = useState('countdown');
    const [countdown, setCountdown] = useState(3);
    const [sequence, setSequence] = useState([]);
    const [showSequence, setShowSequence] = useState(false);
    const [round, setRound] = useState(1);
    const [playerResults, setPlayerResults] = useState({});

    useEffect(() => {
        if (gameState === 'countdown') {
            if (countdown > 0) {
                const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
                return () => clearTimeout(timer);
            } else {
                startNewRound();
            }
        }
    }, [countdown, gameState]);

    const startNewRound = () => {
        setGameState('playing');
        const newSeq = [];
        for (let i = 0; i < 2 + round; i++) newSeq.push(Math.floor(Math.random() * 4));
        setSequence(newSeq);
        setShowSequence(true);
        setPlayerResults({});

        // Sync sequence to DB so controllers can display it or know what to expect
        update(ref(db, `rooms/${roomCode}`), {
            gamePhase: 'showing',
            currentSequence: newSeq
        });

        // Hide sequence after 2s + complexity
        setTimeout(() => {
            setShowSequence(false);
            update(ref(db, `rooms/${roomCode}`), { gamePhase: 'input' });
        }, 1500 + round * 500);
    };

    useEffect(() => {
        const roomRef = ref(db, `rooms/${roomCode}/players`);
        return onValue(roomRef, (snapshot) => {
            const data = snapshot.val();
            if (data && gameState === 'playing' && !showSequence) {
                const results = {};
                Object.entries(data).forEach(([id, p]) => {
                    if (p.memoryStatus) results[id] = p.memoryStatus;
                });
                setPlayerResults(results);

                // If everyone finished or round is over
                const finishedCount = Object.keys(results).length;
                if (finishedCount === players.length && players.length > 0) {
                    if (round >= 5) {
                        setGameState('finished');
                    } else {
                        setTimeout(() => {
                            setRound(r => r + 1);
                            startNewRound();
                        }, 2000);
                    }
                }
            }
        });
    }, [roomCode, gameState, showSequence, players.length, round]);

    useEffect(() => {
        if (gameState === 'finished') {
            // Reward top scorers (this might need actual scoring in controller)
            if (onGameOver) onGameOver(); // Global winner check based on points in players list
        }
    }, [gameState]);

    const COLORS = ['#ff4444', '#44ff44', '#4444ff', '#ffff44'];

    return (
        <div className="memory-game center-all">
            <AnimatePresence mode="wait">
                {gameState === 'countdown' && (
                    <motion.div key="cd" className="center-all" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ opacity: 0 }}>
                        <Brain size={100} color="#00f2ff" />
                        <h1 className="neon-text">MEMORY MATCH</h1>
                        <h1 className="big-cd">{countdown}</h1>
                        <p className="hint">Memorize the sequence and repeat it!</p>
                    </motion.div>
                )}

                {gameState === 'playing' && (
                    <div className="memory-arena center-all">
                        <div className="round-badge glass-panel">ROUND {round}</div>

                        <div className="sequence-display-big">
                            {showSequence ? (
                                <div className="seq-list">
                                    {sequence.map((idx, i) => (
                                        <motion.div
                                            key={i}
                                            className="seq-item"
                                            style={{ backgroundColor: COLORS[idx] }}
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ delay: i * 0.3 }}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <h1 className="neon-text blink">REPEAT THE PATTERN!</h1>
                            )}
                        </div>

                        <div className="players-status-grid">
                            {players.map(p => (
                                <div key={p.id} className="p-status-card glass-panel" style={{ '--pcolor': p.color }}>
                                    <div className="p-head" style={{ backgroundColor: p.color }}>{p.name?.[0]}</div>
                                    <div className="p-info">
                                        <h4>{p.name}</h4>
                                        <div className="res-icon">
                                            {playerResults[p.id] === 'success' && <CheckCircle color="#00ff44" size={32} />}
                                            {playerResults[p.id] === 'fail' && <XCircle color="#ff0044" size={32} />}
                                            {!playerResults[p.id] && <div className="thinking-dots">...</div>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {gameState === 'finished' && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="center-all">
                        <Trophy size={150} color="#ffd700" />
                        <h1 className="neon-text">GAME OVER</h1>
                        <p>Total scores added to Hall of Fame!</p>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                .memory-game { width: 100%; height: 100%; }
                .round-badge { position: absolute; top: 100px; padding: 10px 30px; font-weight: 900; font-size: 2rem; }
                
                .sequence-display-big { height: 200px; display: flex; align-items: center; justify-content: center; margin-bottom: 50px; }
                .seq-list { display: flex; gap: 20px; }
                .seq-item { width: 80px; height: 80px; border-radius: 20px; border: 4px solid white; box-shadow: 0 0 20px rgba(255,255,255,0.3); }
                .blink { animation: blink 1s infinite alternate; }
                @keyframes blink { from{opacity:0.3} to{opacity:1} }

                .players-status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; width: 80%; }
                .p-status-card { display: flex; align-items: center; gap: 15px; padding: 15px; }
                .p-head { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; color: white; border: 2px solid white; }
                .thinking-dots { font-size: 2rem; color: var(--text-dim); }
                .res-icon { filter: drop-shadow(0 0 10px currentColor); }
            `}</style>
        </div>
    );
};

export default MemoryMatch;
