import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase';
import { ref, update, onValue } from 'firebase/database';
import { Mountain, CloudLightning, Trophy, AlertTriangle } from 'lucide-react';

const SocialClimbers = ({ players, roomCode, onGameOver }) => {
    const [gameState, setGameState] = useState('countdown');
    const [countdown, setCountdown] = useState(3);
    const [stormActive, setStormActive] = useState(false);
    const [winner, setWinner] = useState(null);

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

    // Storm Logic
    useEffect(() => {
        if (gameState !== 'playing') return;

        const scheduleStorm = () => {
            const delay = 3000 + Math.random() * 5000;
            return setTimeout(() => {
                setStormActive(true);
                update(ref(db, `rooms/${roomCode}`), { storm: true });

                setTimeout(() => {
                    setStormActive(false);
                    update(ref(db, `rooms/${roomCode}`), { storm: false });
                    scheduleStorm();
                }, 2000); // Storm lasts 2 seconds
            }, delay);
        };

        const timer = scheduleStorm();
        return () => clearTimeout(timer);
    }, [gameState, roomCode]);

    useEffect(() => {
        const roomRef = ref(db, `rooms/${roomCode}/players`);
        return onValue(roomRef, (snapshot) => {
            const data = snapshot.val();
            if (data && gameState === 'playing') {
                Object.entries(data).forEach(([id, p]) => {
                    if ((p.climbPos || 0) >= 100 && !winner) {
                        const winPlayer = players.find(pl => pl.id === id);
                        setWinner(winPlayer);
                        setGameState('finished');
                        if (onGameOver) onGameOver(id);
                    }

                    // If storm is active and player is moving (lastClick is recent), penalize them
                    if (stormActive && (Date.now() - (p.lastClick || 0)) < 100) {
                        const current = p.climbPos || 0;
                        update(ref(db, `rooms/${roomCode}/players/${id}`), {
                            climbPos: Math.max(0, current - 5),
                            lastClick: 0 // Reset to stop sliding more
                        });
                    }
                });
            }
        });
    }, [roomCode, gameState, stormActive, winner, players, onGameOver]);

    return (
        <div className="climb-game center-all">
            <AnimatePresence mode="wait">
                {gameState === 'countdown' && (
                    <motion.div key="cd" className="center-all" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ opacity: 0 }}>
                        <Mountain size={100} className="neon-text" />
                        <h1 className="neon-text">SOCIAL CLIMBERS</h1>
                        <h1 className="big-cd">{countdown}</h1>
                        <p className="hint">MASH to climb, STOP during the Storm!</p>
                    </motion.div>
                )}

                {(gameState === 'playing' || gameState === 'finished') && (
                    <div className="mountain-arena center-all">
                        <div className={`storm-overlay ${stormActive ? 'active' : ''}`}>
                            <CloudLightning size={100} color="#fff" />
                            <h2>STORM ACTIVE! STOP CLIMBING!</h2>
                        </div>

                        <div className="mountain-track">
                            <div className="goal-line">FINISH</div>
                            <div className="climbers-area">
                                {players.map(p => (
                                    <div key={p.id} className="climber-lane">
                                        <motion.div
                                            className="climber-avatar"
                                            animate={{ bottom: `${p.climbPos || 0}%` }}
                                            transition={{ type: 'spring', damping: 15 }}
                                        >
                                            <div className="p-tag" style={{ borderColor: p.color }}>{p.name}</div>
                                            <div className="p-body" style={{ backgroundColor: p.color }}>
                                                <Mountain size={24} />
                                            </div>
                                        </motion.div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {gameState === 'finished' && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="winner-overlay center-all">
                        <Trophy size={120} color="#ffd700" />
                        <h1>{winner?.name} REACHED THE PEAK!</h1>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                .climb-game { width: 100%; height: 100%; }
                .big-cd { font-size: 8rem; }
                
                .mountain-arena { width: 100%; height: 100%; position: relative; }
                .storm-overlay { position: absolute; inset: 0; background: rgba(0,100,255,0.4); z-index: 50; display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.3s; }
                .storm-overlay.active { opacity: 1; animation: flash 0.5s infinite alternate; }
                @keyframes flash { from{background: rgba(0,100,255,0.4)} to{background: rgba(255,255,255,0.3)} }
                
                .mountain-track { width: 800px; height: 600px; background: linear-gradient(0deg, #111, #333); border-radius: 40px; position: relative; border: 4px solid var(--glass-border); overflow: hidden; }
                .goal-line { position: absolute; top: 5%; left: 0; right: 0; height: 60px; background: repeating-linear-gradient(45deg, #fb0, #fb0 20px, #000 20px, #000 40px); display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 2rem; color: #000; }
                
                .climbers-area { display: flex; justify-content: space-around; height: 100%; padding: 0 50px; }
                .climber-lane { width: 4px; height: 100%; background: rgba(255,255,255,0.1); position: relative; }
                .climber-avatar { position: absolute; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 10px; }
                .p-tag { font-size: 0.8rem; font-weight: 800; background: rgba(0,0,0,0.8); padding: 2px 8px; border-radius: 5px; border: 1px solid; white-space: nowrap; }
                .p-body { width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 0 15px currentColor; }
            `}</style>
        </div>
    );
};

export default SocialClimbers;
