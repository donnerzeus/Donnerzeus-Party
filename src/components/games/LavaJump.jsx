import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase';
import { ref, update, onValue } from 'firebase/database';
import { Flame, Activity, ShieldCheck, Skull } from 'lucide-react';
import { sounds } from '../../utils/sounds';

const LavaJump = ({ players, roomCode, onGameOver }) => {
    const [gameState, setGameState] = useState('countdown'); // countdown, playing, results
    const [countdown, setCountdown] = useState(3);
    const [obstacles, setObstacles] = useState([]);
    const [deadPlayers, setDeadPlayers] = useState(new Set());
    const [gameTime, setGameTime] = useState(30);

    useEffect(() => {
        if (gameState === 'countdown') {
            if (countdown === 3) sounds.playStart();
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

        const interval = setInterval(() => {
            setGameTime(prev => {
                if (prev <= 1) {
                    setGameState('results');
                    return 0;
                }
                return prev - 1;
            });

            // Spawn obstacles
            if (Math.random() > 0.4) {
                const newObs = {
                    id: Date.now() + Math.random(),
                    x: 110,
                    speed: 0.8 + (30 - gameTime) * 0.05,
                    width: 4 + Math.random() * 6
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

                    const isJumping = (p.action === 'jump');

                    // Collision: if obstacle is at player's zone (around 48-52%) and player is NOT jumping
                    updated.forEach(o => {
                        if (o.x > 47 && o.x < 53 && !isJumping) {
                            setDeadPlayers(prevDead => {
                                const next = new Set(prevDead);
                                next.add(p.id);
                                return next;
                            });
                        }
                    });
                });

                return updated;
            });

            if (players.length > 0 && deadPlayers.size === players.length) {
                setGameState('results');
            }
        }, 20);

        return () => clearInterval(gameLoop);
    }, [gameState, players, deadPlayers]);

    useEffect(() => {
        if (gameState === 'results') {
            // Mark dead players as eliminated in Firebase so HostView can filter them
            deadPlayers.forEach(id => {
                update(ref(db, `rooms/${roomCode}/players/${id}`), { eliminated: true });
            });

            if (onGameOver) {
                onGameOver('team_victory');
            }
        }
    }, [gameState]);

    return (
        <div className="lava-game center-all">
            <div className="game-hud">
                <div className="hud-item glass-panel accent">
                    <Activity size={28} />
                    <span>{gameTime}s</span>
                </div>
                <div className="hud-item glass-panel">
                    <Activity size={28} />
                    <span>LIVE: {players.length - deadPlayers.size}</span>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {gameState === 'countdown' && (
                    <motion.div key="cd" className="center-all" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ opacity: 0, scale: 2 }}>
                        <Flame size={120} color="#ff4400" className="glow-icon" />
                        <h1 className="neon-text title">LAVA JUMP</h1>
                        <h1 className="big-cd">{countdown}</h1>
                        <div className="instruction-box glass-panel">
                            <p>WATCH THE GROUND! JUMP TO AVOID THE INCOMING LAVA WAVES!</p>
                        </div>
                    </motion.div>
                )}

                {(gameState === 'playing' || gameState === 'results') && (
                    <div className="lava-arena">
                        <div className="stage-area">
                            <div className="platform-line" />

                            <div className="players-layer">
                                {players.map(p => (
                                    <motion.div
                                        key={p.id}
                                        className={`p-avatar-box ${deadPlayers.has(p.id) ? 'is-dead' : ''}`}
                                        animate={{
                                            y: p.action === 'jump' ? -180 : 0,
                                            rotate: deadPlayers.has(p.id) ? 90 : 0,
                                            opacity: deadPlayers.has(p.id) ? 0.3 : 1
                                        }}
                                        transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                                    >
                                        <div className="name-tag" style={{ borderColor: p.color }}>{p.name}</div>
                                        <div className="character-body" style={{ backgroundColor: p.color }}>
                                            {deadPlayers.has(p.id) ? <Skull size={30} /> : <div className="p-initial">{p.name?.[0]}</div>}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {obstacles.map(o => (
                                <motion.div
                                    key={o.id}
                                    className="lava-obstacle"
                                    style={{ left: `${o.x}%`, width: `${o.width}%` }}
                                >
                                    <Flame size={40} className="flame-icon" />
                                    <div className="glow-effect" />
                                </motion.div>
                            ))}

                            <div className="lava-floor" />
                        </div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .lava-game { width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative; }
                .cd-title { font-size: 5rem; color: #ff0044; }
                .big-cd { font-size: 15rem; font-weight: 900; }
                
                .lava-arena { width: 100%; height: 100%; position: relative; }
                .lava-hud { position: absolute; top: 100px; left: 0; right: 0; display: flex; justify-content: center; gap: 40px; z-index: 5; }
                .timer-box, .survivors-box { padding: 15px 30px; font-size: 2rem; font-weight: 900; display: flex; align-items: center; gap: 15px; border-radius: 20px; }
                
                .stage-area { width: 100%; height: 100%; position: relative; background: radial-gradient(circle at bottom, #300, transparent); }
                .platform-line { position: absolute; top: 70%; left: 0; right: 0; height: 4px; background: rgba(255,255,255,0.2); }
                
                .players-layer { position: absolute; top: 70%; left: 0; right: 0; display: flex; justify-content: center; gap: 30px; align-items: flex-end; transform: translateY(-100%); z-index: 5; }
                .p-avatar-box { display: flex; flex-direction: column; align-items: center; gap: 10px; }
                .name-tag { font-size: 1.2rem; font-weight: 800; background: rgba(0,0,0,0.8); padding: 5px 15px; border-radius: 10px; border: 2px solid; color: white; }
                .character-body { width: 70px; height: 70px; border-radius: 20px; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 0 20px rgba(255,255,255,0.3); }
                .p-initial { font-size: 2.5rem; font-weight: 900; color: white; }
                
                .lava-obstacle { position: absolute; top: 70%; height: 80px; transform: translateY(-100%); background: linear-gradient(0deg, #ff4400, #ffaa00); border-radius: 15px 15px 0 0; display: flex; align-items: center; justify-content: center; }
                .flame-icon { color: white; filter: drop-shadow(0 0 10px #ffaa00); }
                .glow-effect { position: absolute; inset: 0; background: #ff4400; filter: blur(20px); opacity: 0.3; }

                .lava-floor { position: absolute; bottom: 0; left: 0; right: 0; height: 15%; background: linear-gradient(0deg, #ff0000, #ffcc00); filter: blur(10px); opacity: 0.8; animation: lava-wave 3s infinite alternate; }
                @keyframes lava-wave { from { transform: translateY(0); } to { transform: translateY(10px); } }

                .is-dead { filter: grayscale(1); }
            `}</style>
        </div>
    );
};

export default LavaJump;
