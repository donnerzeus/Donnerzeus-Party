import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase';
import { ref, update, onValue } from 'firebase/database';
import { BookOpen, Skull, Trophy } from 'lucide-react';

const BookSquirm = ({ players, roomCode, onGameOver }) => {
    const [gameState, setGameState] = useState('countdown');
    const [countdown, setCountdown] = useState(3);
    const [pages, setPages] = useState([]);
    const [deadPlayers, setDeadPlayers] = useState(new Set());
    const [round, setRound] = useState(1);

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

    // Page Spawning Logic
    useEffect(() => {
        if (gameState !== 'playing') return;

        const spawnPage = () => {
            const holeSize = Math.max(10, 25 - round); // Holes get smaller
            const holePos = Math.random() * (100 - holeSize);

            const newPage = {
                id: Date.now(),
                holePos,
                holeSize,
                y: -100, // Starts above
                status: 'falling'
            };

            setPages(prev => [...prev, newPage]);
        };

        const interval = setInterval(() => {
            spawnPage();
            setRound(r => r + 1);
        }, 3000); // New page every 3 seconds

        return () => clearInterval(interval);
    }, [gameState, round]);

    // Physics/Collision Loop
    useEffect(() => {
        if (gameState !== 'playing') return;

        const loop = setInterval(() => {
            setPages(prev => {
                const updated = prev.map(p => ({ ...p, y: p.y + 2 }));

                // Collision check when page passes player's Y level (around 80%)
                updated.forEach(page => {
                    if (page.y > 65 && page.y < 75 && page.status === 'falling') {
                        players.forEach(p => {
                            if (deadPlayers.has(p.id)) return;
                            const pos = p.posX || 50;
                            // Check if player is NOT in the hole
                            if (pos < page.holePos || pos > (page.holePos + page.holeSize)) {
                                setDeadPlayers(prevDead => {
                                    const next = new Set(prevDead);
                                    next.add(p.id);
                                    return next;
                                });
                            }
                        });
                        page.status = 'passed';
                    }
                });

                return updated.filter(p => p.y < 120);
            });

            // Win Condition
            if (players.length > 0 && deadPlayers.size === players.length) {
                setGameState('finished');
            }
        }, 50);

        return () => clearInterval(loop);
    }, [gameState, players, deadPlayers]);

    useEffect(() => {
        if (gameState === 'finished' || (gameState === 'playing' && round > 10)) {
            const alive = players.filter(p => !deadPlayers.has(p.id));
            if (onGameOver) {
                if (alive.length > 0) alive.forEach(p => onGameOver(p.id));
                else onGameOver(null);
            }
            if (round > 10) setGameState('finished');
        }
    }, [gameState, deadPlayers, round]);

    return (
        <div className="book-game center-all">
            <AnimatePresence mode="wait">
                {gameState === 'countdown' && (
                    <motion.div key="cd" className="center-all" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ opacity: 0 }}>
                        <BookOpen size={100} color="#ffaa00" />
                        <h1 className="neon-text">BOOK SQUIRM</h1>
                        <h1 className="big-cd">{countdown}</h1>
                        <p className="hint">Move left/right to fit through the holes!</p>
                    </motion.div>
                )}

                {(gameState === 'playing' || gameState === 'finished') && (
                    <div className="book-arena">
                        <div className="round-counter glass-panel">ROUND {round}</div>

                        <div className="stage-3d">
                            {/* Falling Pages */}
                            {pages.map(page => (
                                <motion.div
                                    key={page.id}
                                    className="falling-page"
                                    style={{ top: `${page.y}%` }}
                                >
                                    <div className="paper-left" style={{ width: `${page.holePos}%` }} />
                                    <div className="paper-right" style={{ left: `${page.holePos + page.holeSize}%` }} />
                                </motion.div>
                            ))}

                            {/* Players */}
                            <div className="players-track">
                                {players.map(p => (
                                    <motion.div
                                        key={p.id}
                                        className={`squirm-avatar ${deadPlayers.has(p.id) ? 'dead' : ''}`}
                                        animate={{
                                            left: `${p.posX || 50}%`,
                                            rotate: deadPlayers.has(p.id) ? 90 : 0,
                                            y: deadPlayers.has(p.id) ? 20 : 0
                                        }}
                                        transition={{ type: 'spring', damping: 15 }}
                                    >
                                        <div className="p-tag" style={{ borderColor: p.color }}>{p.name}</div>
                                        <div className="p-body" style={{ backgroundColor: p.color }}>
                                            {deadPlayers.has(p.id) ? <Skull size={30} /> : <div className="p-initial">{p.name?.[0]}</div>}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .book-game { width: 100%; height: 100%; }
                .big-cd { font-size: 8rem; }
                .round-counter { position: absolute; top: 100px; padding: 10px 30px; font-weight: 900; font-size: 2rem; z-index: 100; color: #ffaa00; }
                
                .book-arena { width: 1000px; height: 700px; position: relative; overflow: hidden; background: #222; border-radius: 40px; border: 4px solid var(--glass-border); }
                .stage-3d { width: 100%; height: 100%; position: relative; }
                
                .falling-page { position: absolute; left: 0; right: 0; height: 15px; z-index: 20; }
                .paper-left, .paper-right { position: absolute; top: 0; bottom: 0; background: white; box-shadow: 0 10px 20px rgba(0,0,0,0.5); }
                .paper-right { right: 0; }
                
                .players-track { position: absolute; top: 70%; left: 0; right: 0; height: 10px; z-index: 10; padding: 0 5%; }
                .squirm-avatar { position: absolute; transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center; gap: 10px; }
                .p-tag { font-size: 0.8rem; font-weight: 800; background: rgba(0,0,0,0.8); padding: 2px 8px; border-radius: 5px; border: 1px solid; white-space: nowrap; }
                .p-body { width: 60px; height: 60px; border-radius: 15px; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 0 15px currentColor; }
                .p-initial { font-size: 2rem; font-weight: 900; color: white; }
                
                .dead { filter: grayscale(1); opacity: 0.5; }
            `}</style>
        </div>
    );
};

export default BookSquirm;
