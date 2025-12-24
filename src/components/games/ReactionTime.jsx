import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Clock, AlertTriangle } from 'lucide-react';
import { db } from '../../firebase';
import { ref, update } from 'firebase/database';

const ReactionTime = ({ players, roomCode, onGameOver }) => {
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
                const delay = Math.random() * 3000 + 2000;
                setTimeout(() => {
                    setPhase('tap');
                    const now = Date.now();
                    setStartTime(now);
                    update(ref(db, `rooms/${roomCode}`), { gamePhase: 'tap', tapStartTime: now });
                }, delay);
            }
        }
    }, [countdown, phase, roomCode]);

    useEffect(() => {
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

        if (players.length > 0 && newResults.length === players.length && phase === 'tap') {
            setPhase('finished');
            if (onGameOver) onGameOver();
        }
    }, [players, startTime, phase, onGameOver]);

    return (
        <div className="game-container">
            <AnimatePresence mode="wait">
                {phase === 'countdown' && (
                    <motion.div key="countdown" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.2 }} className="center-content">
                        <Clock size={80} className="neon-text" />
                        <h2>Reaction Test!</h2>
                        <h1 className="big-number">{countdown}</h1>
                    </motion.div>
                )}
                {phase === 'waiting' && <div className="full-screen-state waiting"><h1>WAIT FOR GREEN...</h1></div>}
                {phase === 'tap' && <div className="full-screen-state tap"><h1>TAP NOW!!!</h1></div>}
                {phase === 'finished' && (
                    <motion.div key="results" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="leaderboard-screen">
                        <h1 className="neon-text">FASTEST REFLEXES</h1>
                        <div className="leaderboard-grid">
                            {results.map((res, index) => (
                                <div key={res.id} className="player-result-card glass-panel" style={{ '--color': res.color }}>
                                    <div className="rank">#{index + 1}</div>
                                    <div className="name">{res.name}</div>
                                    <div className="score">{(res.time / 1000).toFixed(3)}s</div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <style>{`
                .game-container { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%; }
                .center-content { text-align: center; }
                .big-number { font-size: 10rem; color: var(--accent-primary); }
                .full-screen-state { position: fixed; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; font-size: 4rem; font-weight: 800; z-index: 10; }
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
