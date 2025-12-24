import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase';
import { ref, update, onValue } from 'firebase/database';
import { Car, Bomb, Trophy, Zap } from 'lucide-react';

const NeonRacer = ({ players, roomCode, onGameOver }) => {
    const [gameState, setGameState] = useState('countdown');
    const [countdown, setCountdown] = useState(3);
    const [obstacles, setObstacles] = useState([]);
    const [winners, setWinners] = useState([]);

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

    // Obstacle Spawner & Game Loop
    useEffect(() => {
        if (gameState !== 'playing') return;

        const spawnInterval = setInterval(() => {
            setObstacles(prev => [
                ...prev,
                { id: Date.now(), lane: Math.floor(Math.random() * 3), y: -20 }
            ]);
        }, 1500);

        const moveInterval = setInterval(() => {
            setObstacles(prev => {
                const updated = prev.map(o => ({ ...o, y: o.y + 2 })).filter(o => o.y < 120);

                // Collision check
                players.forEach(p => {
                    const plane = p.lane ?? 1; // 0, 1, 2
                    updated.forEach(o => {
                        if (o.lane === plane && o.y > 80 && o.y < 95) {
                            // COLLISION! Slow down distance
                            const currentDist = p.distance || 0;
                            update(ref(db, `rooms/${roomCode}/players/${p.id}`), {
                                distance: Math.max(0, currentDist - 5)
                            });
                        }
                    });
                });

                return updated;
            });

            // Win check
            players.forEach(p => {
                if ((p.distance || 0) >= 100 && gameState === 'playing') {
                    setGameState('finished');
                    if (onGameOver) onGameOver(p.id);
                }
            });
        }, 50);

        return () => {
            clearInterval(spawnInterval);
            clearInterval(moveInterval);
        };
    }, [gameState, players, roomCode, onGameOver]);

    return (
        <div className="neon-racer center-all">
            <AnimatePresence mode="wait">
                {gameState === 'countdown' && (
                    <motion.div key="cd" className="center-all" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ opacity: 0 }}>
                        <Zap size={100} color="#00f2ff" fill="#00f2ff" className="glow-icon" />
                        <h1 className="neon-text">NEON RACER</h1>
                        <h1 className="big-cd">{countdown}</h1>
                        <p className="hint">MASH to accelerate, MOVE to avoid obstacles!</p>
                    </motion.div>
                )}

                {(gameState === 'playing' || gameState === 'finished') && (
                    <div className="racing-world center-all">
                        <div className="lanes-container">
                            {[0, 1, 2].map(l => (
                                <div key={l} className="lane-track">
                                    <div className="lane-marking" />
                                </div>
                            ))}

                            {/* Obstacles */}
                            {obstacles.map(o => (
                                <motion.div
                                    key={o.id}
                                    className="obstacle-car"
                                    style={{ left: `${o.lane * 33.3 + 16.6}%`, top: `${o.y}%` }}
                                >
                                    <Bomb size={40} color="#ff0044" />
                                    <div className="threat-glow" />
                                </motion.div>
                            ))}

                            {/* Players */}
                            <div className="racer-players">
                                {players.map(p => (
                                    <motion.div
                                        key={p.id}
                                        className="player-car-wrapper"
                                        animate={{
                                            left: `${(p.lane ?? 1) * 33.3 + 16.6}%`,
                                            scale: (p.distance || 0) / 100 + 0.5
                                        }}
                                        transition={{ type: 'spring', damping: 15 }}
                                    >
                                        <div className="car-body" style={{ backgroundColor: p.color }}>
                                            <div className="p-initial">{p.name?.[0]}</div>
                                            <div className="headlights" />
                                        </div>
                                        <div className="dist-gauge">
                                            <div className="dist-fill" style={{ width: `${p.distance || 0}%` }} />
                                        </div>
                                        <span className="car-name">{p.name}</span>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .neon-racer { width: 100%; height: 100%; }
                .glow-icon { filter: drop-shadow(0 0 20px #00f2ff); animation: pulse 1s infinite; }
                @keyframes pulse { from{scale:1} to{scale:1.1} }
                .big-cd { font-size: 8rem; }
                
                .racing-world { width: 800px; height: 700px; position: relative; perspective: 1000px; }
                .lanes-container { width: 100%; height: 100%; background: #050510; border-radius: 40px; border: 4px solid var(--glass-border); position: relative; overflow: hidden; display: flex; transform: rotateX(20deg); }
                
                .lane-track { flex: 1; border-right: 2px dashed rgba(255,255,255,0.1); position: relative; }
                .lane-marking { position: absolute; inset: 0; background: repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(255,255,255,0.05) 50px, rgba(255,255,255,0.05) 100px); animation: road-move 0.5s linear infinite; }
                @keyframes road-move { from{background-position: 0 0} to{background-position: 0 100px} }

                .obstacle-car { position: absolute; transform: translate(-50%, -50%); z-index: 5; }
                .threat-glow { position: absolute; inset: -10px; background: #ff0044; filter: blur(20px); opacity: 0.3; border-radius: 50%; }
                
                .racer-players { position: absolute; inset: 0; pointer-events: none; }
                .player-car-wrapper { position: absolute; bottom: 10%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 10px; z-index: 10; }
                .car-body { width: 60px; height: 90px; border-radius: 12px; border: 3px solid white; display: flex; align-items: center; justify-content: center; position: relative; box-shadow: 0 10px 20px rgba(0,0,0,0.5); }
                .p-initial { font-size: 2rem; font-weight: 900; color: white; }
                .headlights { position: absolute; top: -10px; left: 0; right: 0; display: flex; justify-content: space-between; padding: 0 10px; }
                .headlights::before, .headlights::after { content: ''; width: 12px; height: 12px; background: #fff; border-radius: 50%; box-shadow: 0 -10px 20px #fff; }

                .dist-gauge { width: 80px; height: 6px; background: rgba(255,255,255,0.2); border-radius: 3px; overflow: hidden; }
                .dist-fill { height: 100%; background: #00f2ff; box-shadow: 0 0 10px #00f2ff; }
                .car-name { font-size: 0.9rem; font-weight: 800; background: rgba(0,0,0,0.8); padding: 2px 10px; border-radius: 5px; }
            `}</style>
        </div>
    );
};

export default NeonRacer;
