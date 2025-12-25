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
    const [ripples, setRipples] = useState([]);
    const arenaRef = useRef(null);

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

    const addRipple = (x, y, type = 'small') => {
        const id = Date.now() + Math.random();
        setRipples(prev => [...prev, { id, x, y, type }]);
        setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 1000);
    };

    useEffect(() => {
        if (gameState === 'playing' && timeLeft > 0) {
            const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
            return () => clearInterval(timer);
        } else if (timeLeft === 0 && gameState === 'playing') {
            setGameState('gameover');
            onGameOver('fish_team');
        }
    }, [timeLeft, gameState]);

    useEffect(() => {
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

            // Random ocean ripples
            if (Math.random() > 0.95) addRipple(Math.random() * 80 + 10, Math.random() * 80 + 10, 'ambient');

            fish.forEach(f => {
                const fX = f.posX || 50;
                const fY = f.posY || 50;
                const sX = shark?.posX || 50;
                const sY = shark?.posY || 50;

                const dist = Math.sqrt(Math.pow(fX - sX, 2) + Math.pow(fY - sY, 2));
                if (dist < 8) { // Collision
                    addRipple(fX, fY, 'splash');
                    const angle = Math.atan2(fY - sY, fX - sX);
                    const pushX = Math.cos(angle) * 8;
                    const pushY = Math.sin(angle) * 8;

                    const nextX = fX + pushX;
                    const nextY = fY + pushY;

                    const centerDist = Math.sqrt(Math.pow(nextX - 50, 2) + Math.pow(nextY - 50, 2));
                    if (centerDist > 45) {
                        addRipple(nextX, nextY, 'eliminate');
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
                        <Shark size={120} color="#ff4444" className="heavy-glow" />
                        <h1 className="neon-text title">SHARK ATTACK</h1>
                        <h1 className="big-cd">{countdown}</h1>
                        <p className="instruction">Shark: PUSH EVERYONE OUT! | Fish: SURVIVE THE WATER!</p>
                    </motion.div>
                )}

                {gameState === 'playing' && (
                    <div className="arena-circle" ref={arenaRef}>
                        <div className="water-texture" />

                        <AnimatePresence>
                            {ripples.map(r => (
                                <motion.div
                                    key={r.id}
                                    className={`ripple ${r.type}`}
                                    initial={{ scale: 0, opacity: 0.6 }}
                                    animate={{ scale: r.type === 'eliminate' ? 4 : 2, opacity: 0 }}
                                    style={{ left: `${r.x}%`, top: `${r.y}%` }}
                                />
                            ))}
                        </AnimatePresence>

                        {players.map(p => !p.eliminated && (
                            <motion.div
                                key={p.id}
                                className={`entity ${p.id === sharkId ? 'shark' : 'fish'}`}
                                animate={{
                                    left: `${p.posX || 50}%`,
                                    top: `${p.posY || 50}%`
                                }}
                                style={{ borderColor: p.color }}
                                transition={{ type: 'spring', damping: 15, stiffness: 100 }}
                            >
                                <div className="avatar-wrapper">
                                    <div className="p-avatar">
                                        {p.avatar ? <img src={p.avatar} /> : p.name?.[0]}
                                    </div>
                                    {p.id === sharkId && <div className="shark-aura" />}
                                </div>
                                {p.id === sharkId && <Shark size={44} className="shark-icon" />}
                                <span className="p-label" style={{ backgroundColor: p.color }}>{p.name}</span>
                            </motion.div>
                        ))}
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .shark-attack { width: 100%; height: 100%; position: relative; perspective: 1000px; }
                .timer-badge { position: absolute; top: 20px; font-size: 3.5rem; background: rgba(0,0,0,0.8); padding: 10px 40px; border-radius: 25px; border: 3px solid #00f2ff; box-shadow: 0 0 20px rgba(0,242,255,0.4); z-index: 100; }
                
                .arena-circle { 
                    width: 750px; height: 750px; 
                    background: radial-gradient(circle, #005577 0%, #001a33 100%); 
                    border: 12px solid rgba(255,255,255,0.15); 
                    border-radius: 50%; 
                    position: relative; 
                    box-shadow: 0 50px 100px rgba(0,0,0,0.5), inset 0 0 100px rgba(0,242,255,0.1);
                    overflow: hidden;
                    transform: rotateX(20deg);
                }

                .water-texture { position: absolute; inset: 0; background: url('https://www.transparenttextures.com/patterns/water.png'); opacity: 0.2; animation: drift 20s linear infinite; }
                @keyframes drift { from { background-position: 0 0; } to { background-position: 500px 500px; } }

                .ripple { position: absolute; border: 2px solid rgba(0,242,255,0.4); border-radius: 50%; transform: translate(-50%, -50%); pointer-events: none; }
                .ripple.splash { border-color: rgba(255,255,255,0.6); border-width: 4px; }
                .ripple.eliminate { border-color: #ff4444; border-width: 6px; }
                
                .entity { position: absolute; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; gap: 8px; z-index: 5; }
                .avatar-wrapper { position: relative; }
                .shark-aura { position: absolute; inset: -15px; background: radial-gradient(circle, rgba(255,0,0,0.4) 0%, transparent 70%); border-radius: 50%; animation: pulse 1.5s infinite; }
                
                .fish { width: 65px; height: 65px; }
                .shark { width: 110px; height: 110px; }
                
                .p-avatar { width: 100%; height: 100%; border-radius: 50%; border: 4px solid; background: #111; overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; font-weight: 950; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
                .shark .p-avatar { border-width: 6px; border-color: #ff4444 !important; }
                .p-avatar img { width: 100%; height: 100%; object-fit: cover; }
                
                .shark-icon { position: absolute; top: -45px; color: #ff4444; filter: drop-shadow(0 0 15px #ff4444); animation: snap 0.4s infinite; }
                @keyframes snap { 0%, 100% { transform: scale(1) rotate(-5deg); } 50% { transform: scale(1.3) rotate(5deg); } }
                @keyframes pulse { 0%, 100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.2); } }
                
                .p-label { font-size: 0.8rem; font-weight: 900; color: black; padding: 3px 12px; border-radius: 8px; white-space: nowrap; box-shadow: 0 4px 8px rgba(0,0,0,0.3); }
                .big-cd { font-size: 10rem; color: #ff4444; text-shadow: 0 0 50px rgba(255,68,68,0.5); margin: 0; }
                .heavy-glow { filter: drop-shadow(0 0 30px #ff4444); }
                .instruction { font-size: 1.2rem; background: rgba(0,0,0,0.5); padding: 10px 20px; border-radius: 15px; }
            `}</style>
        </div>
    );
};
export default SharkAttack;
