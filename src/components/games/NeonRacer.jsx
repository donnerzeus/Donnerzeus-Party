import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase';
import { ref, update, onValue } from 'firebase/database';
import { Car, Bomb, Trophy, Zap } from 'lucide-react';

const NeonRacer = ({ players, roomCode, onGameOver }) => {
    const [gameState, setGameState] = useState('countdown');
    const [countdown, setCountdown] = useState(3);
    const [obstacles, setObstacles] = useState([]);

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
    }, [countdown, gameState]);

    useEffect(() => {
        if (gameState !== 'playing') return;

        const spawnInterval = setInterval(() => {
            setObstacles(prev => [
                ...prev,
                { id: Date.now(), lane: Math.floor(Math.random() * 3), y: -20 }
            ]);
        }, 1200);

        const moveInterval = setInterval(() => {
            setObstacles(prev => {
                const updated = prev.map(o => ({ ...o, y: o.y + 4 })).filter(o => o.y < 120);
                players.forEach(p => {
                    const plane = p.lane ?? 1;
                    updated.forEach(o => {
                        if (o.lane === plane && o.y > 75 && o.y < 90) {
                            const currentDist = p.distance || 0;
                            update(ref(db, `rooms/${roomCode}/players/${p.id}`), {
                                distance: Math.max(0, currentDist - 8)
                            });
                        }
                    });
                });
                return updated;
            });

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
    }, [gameState, players, roomCode]);

    return (
        <div className="neon-racer center-all">
            <div className="speed-lines" />

            <AnimatePresence mode="wait">
                {gameState === 'countdown' && (
                    <motion.div key="cd" className="center-all cd-box" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ opacity: 0, scale: 2 }}>
                        <Car size={120} color="#00f2ff" className="glow-icon" />
                        <h1 className="neon-text title">NEON RUSH</h1>
                        <h1 className="big-cd">{countdown}</h1>
                        <div className="instruction-box glass-panel">
                            <p>MASH THE THROTTLE TO GAIN SPEED!</p>
                            <p>SWIPE TO DODGE THE MINES!</p>
                        </div>
                    </motion.div>
                )}

                {(gameState === 'playing' || gameState === 'finished') && (
                    <div className="racing-arena">
                        <div className="highway">
                            {[0, 1, 2].map(l => (
                                <div key={l} className="lane">
                                    <div className="asphalt-marking" />
                                </div>
                            ))}

                            {obstacles.map(o => (
                                <motion.div
                                    key={o.id}
                                    className="mine"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1.2, top: `${o.y}%`, left: `${o.lane * 33.3 + 16.6}%` }}
                                >
                                    <Bomb size={45} color="#ff0044" />
                                    <div className="mine-pulse" />
                                </motion.div>
                            ))}

                            <div className="racers-layer">
                                {players.map(p => (
                                    <motion.div
                                        key={p.id}
                                        className="racer-unit"
                                        animate={{
                                            left: `${(p.lane ?? 1) * 33.3 + 16.6}%`,
                                            rotate: (p.lane ?? 1) === 0 ? -5 : (p.lane === 2 ? 5 : 0),
                                            y: Math.random() * 2 // Vibration
                                        }}
                                        transition={{ type: 'spring', damping: 20, stiffness: 120 }}
                                    >
                                        <div className="neon-car" style={{ '--car-color': p.color }}>
                                            <div className="car-chassis">
                                                <div className="cockpit">
                                                    {p.avatar ? <img src={p.avatar} /> : p.name[0]}
                                                </div>
                                                <div className="thrusters">
                                                    <motion.div className="flame" animate={{ scaleX: [1, 1.5, 1], opacity: [0.8, 1, 0.8] }} transition={{ repeat: Infinity, duration: 0.1 }} />
                                                </div>
                                            </div>
                                            <div className="underglow" />
                                        </div>
                                        <div className="racer-hud">
                                            <div className="racer-name">{p.name}</div>
                                            <div className="progress-mini">
                                                <div className="bar" style={{ width: `${p.distance || 0}%`, backgroundColor: p.color }} />
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .neon-racer { width: 100%; height: 100%; perspective: 1500px; overflow: hidden; background: #010108; }
                .speed-lines { position: absolute; inset: 0; background-image: linear-gradient(to bottom, transparent 95%, rgba(0,242,255,0.1) 95%); background-size: 100% 40px; animation: speedLine 0.2s linear infinite; pointer-events: none; }
                @keyframes speedLine { from { transform: translateY(0); } to { transform: translateY(40px); } }

                .racing-arena { width: 900px; height: 800px; transform: rotateX(25deg); position: relative; }
                .highway { width: 100%; height: 100%; background: #050510; border: 6px solid #1a1a3a; border-radius: 40px; position: relative; overflow: hidden; display: flex; box-shadow: 0 40px 100px rgba(0,0,0,0.8); }
                
                .lane { flex: 1; border-right: 3px dashed rgba(0,242,255,0.05); position: relative; }
                .asphalt-marking { position: absolute; inset: 0; background: repeating-linear-gradient(0deg, transparent, transparent 100px, rgba(0,242,255,0.05) 100px, rgba(0,242,255,0.05) 200px); animation: moveRoad 0.4s linear infinite; }
                @keyframes moveRoad { from { background-position: 0 0; } to { background-position: 0 200px; } }

                .mine { position: absolute; transform: translate(-50%, -50%); z-index: 5; }
                .mine-pulse { position: absolute; inset: -15px; background: #ff0044; border-radius: 50%; filter: blur(20px); opacity: 0.3; animation: blink 0.5s infinite; }
                @keyframes blink { 0%, 100% { opacity: 0.2; } 50% { opacity: 0.6; } }

                .racer-unit { position: absolute; bottom: 150px; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 20px; z-index: 20; }
                .neon-car { position: relative; width: 80px; height: 130px; }
                .car-chassis { width: 100%; height: 100%; background: #111; border: 4px solid var(--car-color); border-radius: 15px; position: relative; z-index: 2; box-shadow: 0 15px 30px rgba(0,0,0,0.5); }
                .underglow { position: absolute; inset: -10px; background: var(--car-color); filter: blur(25px); opacity: 0.5; z-index: 1; border-radius: 20px; }
                
                .cockpit { width: 50px; height: 50px; background: rgba(0,0,0,0.8); border: 2px solid rgba(255,255,255,0.1); border-radius: 12px; margin: 15px auto; overflow: hidden; display: flex; align-items: center; justify-content: center; font-weight: 950; font-size: 1.5rem; color: white; }
                .cockpit img { width: 100%; height: 100%; object-fit: cover; }

                .thrusters { position: absolute; bottom: -20px; left: 0; right: 0; display: flex; justify-content: center; gap: 10px; }
                .flame { width: 30px; height: 40px; background: linear-gradient(to bottom, #00f2ff, transparent); border-radius: 50% / 20% 20% 80% 80%; }

                .racer-hud { background: rgba(0,0,0,0.9); padding: 8px 15px; border-radius: 15px; border: 1px solid rgba(255,255,255,0.1); width: 150px; }
                .racer-name { font-weight: 900; font-size: 0.9rem; text-align: center; margin-bottom: 5px; }
                .progress-mini { height: 10px; background: rgba(255,255,255,0.05); border-radius: 5px; overflow: hidden; }
                .progress-mini .bar { height: 100%; box-shadow: 0 0 10px currentColor; transition: width 0.3s; }

                .big-cd { font-size: 12rem; color: #00f2ff; text-shadow: 0 0 50px rgba(0,242,255,0.5); margin: 0; }
                .instruction-box { padding: 20px 40px; text-align: center; font-weight: 800; font-size: 1.1rem; color: #ffd700; margin-top: 30px; }
            `}</style>
        </div>
    );
};
export default NeonRacer;
