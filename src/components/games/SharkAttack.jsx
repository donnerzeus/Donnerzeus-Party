import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase';
import { ref, update } from 'firebase/database';
import { Ghost as Shark } from 'lucide-react';

const SharkAttack = ({ players, roomCode, onGameOver }) => {
    const [gameState, setGameState] = useState('countdown');
    const [countdown, setCountdown] = useState(3);
    const [timeLeft, setTimeLeft] = useState(30);
    const [sharkId, setSharkId] = useState(null);
    const arenaRef = useRef(null);

    // Positions state local to Host for smooth rendering, but based on Firebase
    const [localPositions, setLocalPositions] = useState({});

    useEffect(() => {
        if (gameState === 'countdown') {
            if (countdown > 0) {
                const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
                return () => clearTimeout(timer);
            } else {
                const sId = players[Math.floor(Math.random() * players.length)].id;
                setSharkId(sId);
                setGameState('playing');
                update(ref(db, `rooms/${roomCode}`), { sharkId: sId, gamePhase: 'playing' });
            }
        }
    }, [countdown, gameState]);

    useEffect(() => {
        if (gameState === 'playing' && timeLeft > 0) {
            const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
            return () => clearInterval(timer);
        } else if (timeLeft === 0 && gameState === 'playing') {
            // Fish win if time runs out
            setGameState('gameover');
            onGameOver('fish_team');
        }
    }, [timeLeft, gameState]);

    useEffect(() => {
        // Physics Loop (Simple)
        if (gameState !== 'playing') return;

        const loop = setInterval(() => {
            const shark = players.find(p => p.id === sharkId);
            const fish = players.filter(p => p.id !== sharkId && !p.eliminated);

            if (fish.length === 0) {
                setGameState('gameover');
                onGameOver(sharkId);
                clearInterval(loop);
                return;
            }

            fish.forEach(f => {
                const fX = f.posX || 50;
                const fY = f.posY || 50;
                const sX = shark?.posX || 50;
                const sY = shark?.posY || 50;

                const dist = Math.sqrt(Math.pow(fX - sX, 2) + Math.pow(fY - sY, 2));
                if (dist < 8) { // Collision
                    const angle = Math.atan2(fY - sY, fX - sX);
                    const pushX = Math.cos(angle) * 5;
                    const pushY = Math.sin(angle) * 5;

                    const nextX = fX + pushX;
                    const nextY = fY + pushY;

                    // Check if out of bounds (Circular arena)
                    const centerDist = Math.sqrt(Math.pow(nextX - 50, 2) + Math.pow(nextY - 50, 2));
                    if (centerDist > 45) {
                        update(ref(db, `rooms/${roomCode}/players/${f.id}`), { eliminated: true });
                    } else {
                        update(ref(db, `rooms/${roomCode}/players/${f.id}`), { posX: nextX, posY: nextY });
                    }
                }
            });
        }, 100);

        return () => clearInterval(loop);
    }, [players, sharkId, gameState]);

    return (
        <div className="shark-attack center-all">
            <h2 className="timer-badge">{timeLeft}s</h2>

            <AnimatePresence mode="wait">
                {gameState === 'countdown' && (
                    <motion.div key="cd" className="center-all" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ opacity: 0 }}>
                        <Shark size={100} color="#ff4444" />
                        <h1 className="neon-text">SHARK ATTACK</h1>
                        <h1 className="big-cd">{countdown}</h1>
                        <p>Shark: Push everyone out! | Fish: Stay in the circle!</p>
                    </motion.div>
                )}

                {gameState === 'playing' && (
                    <div className="arena-circle" ref={arenaRef}>
                        {players.map(p => !p.eliminated && (
                            <motion.div
                                key={p.id}
                                className={`entity ${p.id === sharkId ? 'shark' : 'fish'}`}
                                style={{
                                    left: `${p.posX || 50}%`,
                                    top: `${p.posY || 50}%`,
                                    borderColor: p.color
                                }}
                                transition={{ type: 'spring', damping: 20 }}
                            >
                                <div className="p-avatar">
                                    {p.avatar ? <img src={p.avatar} /> : p.name?.[0]}
                                </div>
                                {p.id === sharkId && <Shark size={40} className="shark-icon" />}
                                <span className="p-label" style={{ backgroundColor: p.color }}>{p.name}</span>
                            </motion.div>
                        ))}
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .shark-attack { width: 100%; height: 100%; position: relative; }
                .timer-badge { position: absolute; top: 0; font-size: 3rem; background: rgba(0,0,0,0.5); padding: 10px 30px; border-radius: 20px; }
                
                .arena-circle { 
                    width: 700px; height: 700px; 
                    background: radial-gradient(circle, #004466 0%, #001122 100%); 
                    border: 10px solid rgba(255,255,255,0.1); 
                    border-radius: 50%; 
                    position: relative; 
                    box-shadow: 0 0 50px rgba(0,242,255,0.2);
                    overflow: hidden;
                }
                
                .entity { position: absolute; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; gap: 5px; z-index: 5; }
                .fish { width: 60px; height: 60px; }
                .shark { width: 100px; height: 100px; }
                
                .p-avatar { width: 100%; height: 100%; border-radius: 50%; border: 4px solid; background: #222; overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 900; }
                .shark .p-avatar { border-width: 6px; border-color: #ff4444 !important; }
                .p-avatar img { width: 100%; height: 100%; object-fit: cover; }
                
                .shark-icon { position: absolute; top: -30px; color: #ff4444; filter: drop-shadow(0 0 10px #ff4444); animation: snap 0.5s infinite; }
                @keyframes snap { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }
                
                .p-label { font-size: 0.7rem; font-weight: 800; color: black; padding: 2px 8px; border-radius: 5px; white-space: nowrap; }
            `}</style>
        </div>
    );
};

export default SharkAttack;
