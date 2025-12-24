import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase';
import { ref, update, onValue } from 'firebase/database';
import { Flame, Activity, ShieldCheck, Skull } from 'lucide-react';

const LavaJump = ({ players, roomCode, onGameOver }) => {
    const [gameState, setGameState] = useState('countdown'); // countdown, playing, results
    const [countdown, setCountdown] = useState(3);
    const [obstacles, setObstacles] = useState([]);
    const [deadPlayers, setDeadPlayers] = useState(new Set());
    const [gameTime, setGameTime] = useState(30);

    const PLATFORM_Y = 80; // Ground position in %

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

        const interval = setInterval(() => {
            setGameTime(prev => {
                if (prev <= 0) {
                    setGameState('results');
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });

            // Spawn obstacles
            if (Math.random() > 0.6) {
                const newObs = {
                    id: Date.now(),
                    x: 100, // Starts from right
                    speed: 1.5 + (30 - gameTime) * 0.1, // Speeds up over time
                    width: 5 + Math.random() * 10
                };
                setObstacles(prev => [...prev, newObs]);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [gameState, gameTime]);

    useEffect(() => {
        if (gameState !== 'playing') return;

        const gameLoop = setInterval(() => {
            setObstacles(prev => {
                const updated = prev.map(o => ({ ...o, x: o.x - o.speed })).filter(o => o.x > -20);

                // Collision check
                players.forEach(p => {
                    if (deadPlayers.has(p.id)) return;

                    const playerX = p.pos || 50; // We'll assume center if no movement, or tilt
                    const isJumping = (p.action === 'jump');

                    // Simple collision: if obstacle is at player's X (around 50) and player is NOT jumping
                    updated.forEach(o => {
                        if (o.x > 45 && o.x < 55 && !isJumping) {
                            setDeadPlayers(prevDead => new Set([...prevDead, p.id]));
                        }
                    });
                });

                return updated;
            });

            // If everyone is dead
            if (players.length > 0 && deadPlayers.size === players.length) {
                setGameState('results');
            }
        }, 30);

        return () => clearInterval(gameLoop);
    }, [gameState, players, deadPlayers]);

    useEffect(() => {
        if (gameState === 'results') {
            const alive = players.filter(p => !deadPlayers.has(p.id));
            if (onGameOver) {
                alive.forEach(p => onGameOver(p.id));
            }
        }
    }, [gameState]);

    return (
        <div className="lava-game center-all">
            <AnimatePresence mode="wait">
                {gameState === 'countdown' && (
                    <motion.div key="cd" className="center-all" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ opacity: 0 }}>
                        <h1 className="neon-text CD">WATCH OUT!</h1>
                        <h1 className="big-cd">{countdown}</h1>
                        <p className="hint">JUMP to avoid the obstacles!</p>
                    </motion.div>
                )}

                {(gameState === 'playing' || gameState === 'results') && (
                    <div className="lava-arena center-all">
                        <div className="game-hud">
                            <div className="timer"><Activity size={24} /> <span>{gameTime}s</span></div>
                            <div className="survivors">Survivors: {players.length - deadPlayers.size}</div>
                        </div>

                        <div className="stage">
                            <div className="platform-track" />

                            {/* Players */}
                            <div className="players-layer">
                                {players.map(p => (
                                    <motion.div
                                        key={p.id}
                                        className={`p-avatar ${deadPlayers.has(p.id) ? 'dead' : ''}`}
                                        animate={{
                                            y: p.action === 'jump' ? -150 : 0,
                                            rotate: deadPlayers.has(p.id) ? 90 : 0,
                                            opacity: deadPlayers.has(p.id) ? 0.3 : 1
                                        }}
                                        style={{ '--color': p.color }}
                                    >
                                        <div className="name-tag">{p.name}</div>
                                        <div className="char">
                                            {deadPlayers.has(p.id) ? <Skull size={40} /> : <div className="p-icon" style={{ background: p.color }}>{p.name?.[0]}</div>}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Obstacles */}
                            {obstacles.map(o => (
                                <motion.div
                                    key={o.id}
                                    className="obstacle"
                                    style={{ left: `${o.x}%`, width: `${o.width}%` }}
                                >
                                    <Flame size={40} color="#ffaa00" />
                                    <div className="fire-glow" />
                                </motion.div>
                            ))}

                            <div className="lava-pit" />
                        </div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .lava-game { width: 100%; height: 100%; position: relative; }
                .big-cd { font-size: 15rem; color: #ff0044; }
                
                .lava-arena { width: 100%; height: 100%; display: flex; flex-direction: column; }
                .game-hud { position: absolute; top: 40px; width: 100%; display: flex; justify-content: space-around; font-size: 2rem; font-weight: 800; }
                
                .stage { width: 100%; height: 600px; position: relative; overflow: hidden; margin-top: 100px; }
                .platform-track { position: absolute; top: 80%; left: 0; right: 0; height: 10px; background: rgba(255,255,255,0.2); border-radius: 5px; }
                
                .players-layer { position: absolute; top: 80%; left: 0; right: 0; display: flex; justify-content: center; gap: 20px; align-items: flex-end; transform: translateY(-100%); }
                .p-avatar { display: flex; flex-direction: column; align-items: center; gap: 10px; position: relative; }
                .name-tag { font-size: 0.9rem; font-weight: 800; background: rgba(0,0,0,0.5); padding: 2px 8px; border-radius: 5px; }
                .p-icon { width: 60px; height: 60px; border-radius: 15px; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: 900; border: 3px solid white; box-shadow: 0 0 20px var(--color); }
                
                .obstacle { position: absolute; top: 80%; height: 60px; transform: translateY(-100%); background: linear-gradient(0deg, #ff4400, transparent); display: flex; justify-content: center; align-items: center; border-radius: 10px 10px 0 0; }
                .fire-glow { position: absolute; inset: 0; background: #ff4400; filter: blur(20px); opacity: 0.3; }

                .lava-pit { position: absolute; bottom: 0; left: 0; right: 0; height: 10%; background: linear-gradient(0deg, #ff0000, #ffaa00); filter: blur(10px); opacity: 0.6; }

                .dead { filter: grayscale(1); }
            `}</style>
        </div>
    );
};

export default LavaJump;
