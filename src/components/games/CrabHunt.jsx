import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase';
import { ref, update, onValue } from 'firebase/database';
import { Ghost, Skull, Target, Crosshair, Trophy } from 'lucide-react';

const CrabHunt = ({ players, roomCode, onGameOver }) => {
    const [gameState, setGameState] = useState('countdown'); // countdown, playing, results
    const [countdown, setCountdown] = useState(3);
    const [fishermanId, setFishermanId] = useState(null);
    const [crabStates, setCrabStates] = useState({}); // { id: { x, y, dead } }
    const [targetPos, setTargetPos] = useState({ x: 50, y: 50 });
    const [timeLeft, setTimeLeft] = useState(30);

    useEffect(() => {
        if (players.length > 0 && !fishermanId) {
            // Pick a random fisherman
            const fisher = players[Math.floor(Math.random() * players.length)].id;
            setFishermanId(fisher);

            // Assign roles in DB
            const updates = {};
            players.forEach(p => {
                updates[`rooms/${roomCode}/players/${p.id}/role`] = (p.id === fisher) ? 'fisher' : 'crab';
                updates[`rooms/${roomCode}/players/${p.id}/posX`] = 50;
                updates[`rooms/${roomCode}/players/${p.id}/posY`] = 50;
                updates[`rooms/${roomCode}/players/${p.id}/status`] = 'alive';
            });
            update(ref(db), updates);
        }
    }, [players, fishermanId, roomCode]);

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

    useEffect(() => {
        if (gameState !== 'playing') return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    setGameState('results');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState]);

    useEffect(() => {
        const roomRef = ref(db, `rooms/${roomCode}/players`);
        return onValue(roomRef, (snapshot) => {
            const data = snapshot.val();
            if (data && gameState === 'playing') {
                const newStates = {};
                Object.entries(data).forEach(([id, p]) => {
                    const x = p.posX || 50;
                    const y = p.posY || 50;

                    if (id === fishermanId) {
                        setTargetPos({ x, y });

                        // Check for smash action
                        if (p.action === 'smash') {
                            // Collision check for all alive crabs
                            Object.entries(data).forEach(([cid, cp]) => {
                                if (cid !== fishermanId && cp.status === 'alive') {
                                    const cx = cp.posX || 50;
                                    const cy = cp.posY || 50;
                                    const dist = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2));
                                    if (dist < 8) { // Hit radius
                                        update(ref(db, `rooms/${roomCode}/players/${cid}`), { status: 'dead' });
                                    }
                                }
                            });
                            // Reset smash action immediately
                            update(ref(db, `rooms/${roomCode}/players/${id}`), { action: 'idle' });
                        }
                    } else {
                        newStates[id] = { x, y, status: p.status || 'alive' };
                    }
                });
                setCrabStates(newStates);

                // Win check: all crabs dead?
                const crabsAlive = Object.values(newStates).filter(s => s.status === 'alive').length;
                if (crabsAlive === 0 && players.length > 1) {
                    setGameState('results');
                }
            }
        });
    }, [roomCode, fishermanId, gameState, players.length]);

    useEffect(() => {
        if (gameState === 'results') {
            const crabsAlive = Object.values(crabStates).filter(s => s.status === 'alive').length;
            if (onGameOver) {
                if (crabsAlive === 0) onGameOver(fishermanId);
                else {
                    // Crabs win
                    players.forEach(p => {
                        if (p.id !== fishermanId) onGameOver(p.id);
                    });
                }
            }
        }
    }, [gameState]);

    const fisherMan = players.find(p => p.id === fishermanId);

    return (
        <div className="crab-game center-all">
            <AnimatePresence mode="wait">
                {gameState === 'countdown' && (
                    <motion.div key="cd" className="center-all" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ opacity: 0 }}>
                        <div className="role-reveal">
                            <Crosshair size={80} color="#ff4444" className="spinner" />
                            <h1 className="neon-text">CRAB HUNT</h1>
                            <p>Fisherman: <span style={{ color: fisherMan?.color }}>{fisherMan?.name}</span></p>
                        </div>
                        <h1 className="big-cd">{countdown}</h1>
                    </motion.div>
                )}

                {(gameState === 'playing' || gameState === 'results') && (
                    <div className="arena-container">
                        <div className="game-hud">
                            <div className="timer glass-panel">{timeLeft}s</div>
                        </div>

                        <div className="crab-arena glass-panel">
                            {/* Fisher Target */}
                            <motion.div
                                className="fisher-target"
                                animate={{ left: `${targetPos.x}%`, top: `${targetPos.y}%` }}
                                transition={{ type: 'spring', damping: 20, stiffness: 150 }}
                            >
                                <Crosshair size={120} color={fisherMan?.color} />
                                <div className="target-pulse" style={{ backgroundColor: fisherMan?.color }} />
                            </motion.div>

                            {/* Crabs */}
                            {players.filter(p => p.id !== fishermanId).map(p => (
                                <motion.div
                                    key={p.id}
                                    className={`crab-avatar ${crabStates[p.id]?.status === 'dead' ? 'dead' : ''}`}
                                    animate={{
                                        left: `${crabStates[p.id]?.x || 50}%`,
                                        top: `${crabStates[p.id]?.y || 50}%`,
                                        scale: crabStates[p.id]?.status === 'dead' ? 0.5 : 1
                                    }}
                                >
                                    <div className="p-bubble" style={{ backgroundColor: p.color }}>
                                        {crabStates[p.id]?.status === 'dead' ? <Skull size={30} /> : <div className="letter">{p.name?.[0]}</div>}
                                    </div>
                                    <span className="p-name">{p.name}</span>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .crab-game { width: 100%; height: 100%; }
                .role-reveal { text-align: center; margin-bottom: 20px; }
                .spinner { animation: rotate 2s linear infinite; }
                @keyframes rotate { from{transform:rotate(0)} to{transform:rotate(360deg)} }
                .big-cd { font-size: 8rem; }

                .arena-container { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; padding: 40px; }
                .crab-arena { width: 1000px; height: 600px; background: rgba(0,0,0,0.5); position: relative; overflow: hidden; border-radius: 40px; }
                
                .fisher-target { position: absolute; transform: translate(-50%, -50%); z-index: 20; color: #ff4444; }
                .target-pulse { position: absolute; inset: 20px; border-radius: 50%; opacity: 0.2; animation: pulse 1s infinite alternate; }
                @keyframes pulse { from{scale:0.8} to{scale:1.5; opacity:0} }

                .crab-avatar { position: absolute; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; gap: 8px; z-index: 10; }
                .p-bubble { width: 60px; height: 60px; border-radius: 20px; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 0 20px rgba(255,b255,255,0.3); }
                .letter { font-size: 2rem; font-weight: 900; color: white; }
                .p-name { font-size: 0.9rem; font-weight: 800; background: rgba(0,0,0,0.5); padding: 2px 8px; border-radius: 5px; }

                .dead { opacity: 0.4; filter: grayscale(1); }
            `}</style>
        </div>
    );
};

export default CrabHunt;
