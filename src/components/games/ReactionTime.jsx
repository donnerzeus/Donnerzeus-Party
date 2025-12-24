import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Clock, AlertTriangle } from 'lucide-react';
import { db } from '../../firebase';
import { ref, update } from 'firebase/database';

const ReactionTime = ({ players, roomCode }) => {
    const [phase, setPhase] = useState('countdown'); // countdown, waiting, tap, finished
    const [countdown, setCountdown] = useState(3);
    const [startTime, setStartTime] = useState(0);
    const [results, setResults] = useState([]);

    useEffect(() => {
        if (phase === 'countdown') {
            if (countdown > 0) {
                const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
                return () => clearTimeout(timer);
            } else {
                setPhase('waiting');
                // Set a random delay between 2 and 5 seconds
                const delay = Math.random() * 3000 + 2000;
                setTimeout(() => {
                    setPhase('tap');
                    const now = Date.now();
                    setStartTime(now);
                    // Inform RTDB that the tap phase has started so controllers can show green
                    update(ref(db, `rooms/${roomCode}`), {
                        gamePhase: 'tap',
                        tapStartTime: now
                    });
                }, delay);
            }
        }
    }, [countdown, phase, roomCode]);

    useEffect(() => {
        // Calculate results when players tap
        const newResults = players
            .filter(p => p.lastClick && p.lastClick >= startTime)
            .map(p => ({
                id: p.id,
                name: p.name,
                color: p.color,
                time: p.lastClick - startTime
            }))
            .sort((a, b) => a.time - b.time);

        setResults(newResults);

        // If everyone has tapped or 5 seconds passed, finish
        if (players.length > 0 && newResults.length === players.length) {
            setPhase('finished');
        }
    }, [players, startTime]);

    return (
        <div className="game-container">
            <AnimatePresence mode="wait">
                {phase === 'countdown' && (
                    <motion.div
                        key="countdown"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.2 }}
                        className="center-content"
                    >
                        <Clock size={80} className="neon-text" />
                        <h2>Reaction Test!</h2>
                        <h1 className="big-number">{countdown}</h1>
                    </motion.div>
                )}

                {phase === 'waiting' && (
                    <motion.div
                        key="waiting"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="full-screen-state waiting"
                    >
                        <AlertTriangle size={120} />
                        <h1>WAIT FOR GREEN...</h1>
                    </motion.div>
                )}

                {phase === 'tap' && (
                    <motion.div
                        key="tap"
                        initial={{ opacity: 0, scale: 1.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="full-screen-state tap"
                    >
                        <Zap size={150} />
                        <h1>TAP NOW!!!</h1>
                    </motion.div>
                )}

                {phase === 'finished' && (
                    <motion.div
                        key="results"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="leaderboard-screen"
                    >
                        <h1 className="neon-text">FASTEST REFLEXES</h1>
                        <div className="leaderboard-grid">
                            {results.map((res, index) => (
                                <div key={res.id} className="player-result-card glass-panel" style={{ '--color': res.color }}>
                                    <div className="rank">#{index + 1}</div>
                                    <div className="name">{res.name}</div>
                                    <div className="score-box">
                                        <span className="score">{(res.time / 1000).toFixed(3)}s</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style jsx>{`
                .game-container, .center-content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    width: 100%;
                }
                .big-number { font-size: 10rem; color: var(--accent-primary); }
                .full-screen-state {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    z-index: 10;
                }
                .waiting { background: #800; color: white; }
                .tap { background: #080; color: white; }
                .leaderboard-screen { width: 100%; max-width: 600px; }
                .leaderboard-grid { margin-top: 30px; display: flex; flex-direction: column; gap: 10px; }
                .player-result-card { display: flex; align-items: center; padding: 15px 25px; gap: 20px; border-left: 5px solid var(--color); }
                .rank { font-weight: 800; opacity: 0.5; width: 40px; }
                .name { flex: 1; text-align: left; font-size: 1.2rem; font-weight: 600; }
                .score { font-family: monospace; font-size: 1.5rem; color: var(--accent-primary); }
            `}</style>
        </div>
    );
};

export default ReactionTime;
