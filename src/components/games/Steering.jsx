import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db } from '../../firebase';
import { ref, onValue } from 'firebase/database';
import { Compass, Trophy, AlertTriangle, Ghost } from 'lucide-react';

const Steering = ({ players, roomCode, onGameOver }) => {
    const [gameState, setGameState] = useState({ posX: 10, posY: 50 });
    const [finished, setFinished] = useState(false);
    const [trail, setTrail] = useState([]);
    const [sparks, setSparks] = useState([]);

    const barriers = [
        { x: 25, y: 0, w: 4, h: 45 },
        { x: 25, y: 65, w: 4, h: 35 },
        { x: 45, y: 20, w: 4, h: 60 },
        { x: 65, y: 0, w: 4, h: 35 },
        { x: 65, y: 65, w: 4, h: 35 },
        { x: 80, y: 30, w: 4, h: 40 }
    ];

    const addSpark = (x, y) => {
        const id = Date.now() + Math.random();
        setSparks(prev => [...prev.slice(-10), { id, x, y }]);
        setTimeout(() => setSparks(prev => prev.filter(s => s.id !== id)), 600);
    };

    useEffect(() => {
        const roomRef = ref(db, `rooms/${roomCode}/players`);
        const unsubscribe = onValue(roomRef, (snapshot) => {
            const data = snapshot.val();
            if (data && !finished) {
                let totalX = 0, totalY = 0, count = 0;
                Object.values(data).forEach(p => {
                    if (p.gyro) {
                        totalX += (p.gyro.gamma || 0);
                        totalY += (p.gyro.beta || 0);
                        count++;
                    }
                });

                if (count > 0) {
                    const sensitivity = 0.12;
                    setGameState(prev => {
                        const moveX = (totalX / count) * sensitivity;
                        const moveY = (totalY / count) * sensitivity;

                        let nextX = Math.max(2, Math.min(98, prev.posX + moveX));
                        let nextY = Math.max(2, Math.min(98, prev.posY + moveY));

                        // Trail update
                        if (Math.abs(moveX) > 0.1 || Math.abs(moveY) > 0.1) {
                            setTrail(t => [...t.slice(-15), { x: prev.posX, y: prev.posY }]);
                        }

                        let hasCollision = false;
                        for (const b of barriers) {
                            if (nextX > b.x && nextX < b.x + b.w && nextY > b.y && nextY < b.y + b.h) {
                                hasCollision = true;
                                break;
                            }
                        }

                        if (hasCollision) {
                            addSpark(nextX, nextY);
                            return { posX: Math.max(2, prev.posX - moveX * 2.5), posY: Math.max(2, prev.posY - moveY * 2.5) };
                        }

                        if (nextX > 92 && !finished) {
                            setFinished(true);
                            onGameOver();
                        }

                        return { posX: nextX, posY: nextY };
                    });
                }
            }
        });
        return () => unsubscribe();
    }, [roomCode, finished, onGameOver]);

    return (
        <div className="steering-game center-all">
            <div className="game-header">
                <h1 className="neon-text title">{finished ? "TEAMWORK SYNERGY!" : "CO-OP STEERING"}</h1>
                <div className="coop-gauge">
                    <div className="gauge-label">TEAM SYNC</div>
                    <div className="gauge-bar"><div className="gauge-fill" /></div>
                </div>
            </div>

            <div className="steering-canvas">
                <div className="grid-subtle" />

                {barriers.map((b, i) => (
                    <div key={i} className="barrier-laser" style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%` }}>
                        <div className="laser-core" />
                        <div className="laser-glow" />
                    </div>
                ))}

                <div className="goal-portal">
                    <Trophy size={50} className="goal-icon" />
                    <div className="portal-ring" />
                </div>

                <div className="trail-container">
                    {trail.map((t, i) => (
                        <div key={i} className="trail-bit" style={{ left: `${t.x}%`, top: `${t.y}%`, opacity: i / 15 }} />
                    ))}
                </div>

                {sparks.map(s => (
                    <motion.div
                        key={s.id}
                        className="spark"
                        initial={{ scale: 0 }}
                        animate={{ scale: [1, 2], opacity: 0 }}
                        style={{ left: `${s.x}%`, top: `${s.y}%` }}
                    >
                        <AlertTriangle color="#ff4444" size={40} />
                    </motion.div>
                ))}

                <motion.div
                    className="avatar-orb"
                    animate={{ left: `${gameState.posX}%`, top: `${gameState.posY}%` }}
                    transition={{ type: 'spring', damping: 20, stiffness: 150 }}
                >
                    <div className="orb-body">
                        <Compass size={36} className="steering-icon" />
                    </div>
                    <div className="orb-pulse" />
                    <div className="orb-particles" />
                </motion.div>

                <div className="start-line">ZONE A</div>
            </div>

            <style>{`
                .steering-game { width: 100%; height: 100%; gap: 30px; }
                .game-header { width: 1000px; display: flex; justify-content: space-between; align-items: center; }
                .title { font-size: 3.5rem; margin: 0; }
                
                .coop-gauge { width: 250px; }
                .gauge-label { font-size: 0.8rem; font-weight: 950; letter-spacing: 2px; color: var(--accent-primary); margin-bottom: 5px; }
                .gauge-bar { width: 100%; height: 10px; background: rgba(0,0,0,0.4); border-radius: 5px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); }
                .gauge-fill { height: 100%; width: 70%; background: var(--accent-primary); box-shadow: 0 0 15px var(--accent-primary); animation: pulse-bar 2s infinite; }
                @keyframes pulse-bar { 0%, 100% { opacity: 0.8; } 50% { opacity: 1; } }

                .steering-canvas { 
                    width: 1100px; height: 650px; 
                    position: relative; 
                    background: #050508; 
                    border-radius: 30px; 
                    overflow: hidden; 
                    border: 4px solid var(--glass-border);
                    box-shadow: 0 50px 100px rgba(0,0,0,0.6);
                }

                .grid-subtle { position: absolute; inset: 0; background-image: radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px); background-size: 40px 40px; }
                
                .barrier-laser { position: absolute; overflow: visible; }
                .laser-core { width: 100%; height: 100%; background: #ff0044; border-radius: 10px; position: relative; z-index: 2; box-shadow: 0 0 15px #ff0044; }
                .laser-glow { position: absolute; inset: -15px; background: #ff0044; filter: blur(25px); opacity: 0.3; animation: flicker 0.1s infinite; z-index: 1; }
                @keyframes flicker { 0%, 100% { opacity: 0.2; } 50% { opacity: 0.4; } }

                .avatar-orb { position: absolute; width: 65px; height: 65px; transform: translate(-50%, -50%); z-index: 50; }
                .orb-body { width: 100%; height: 100%; background: var(--accent-primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 40px var(--accent-primary); color: black; z-index: 2; position: relative; }
                .steering-icon { animation: spin 4s linear infinite; }
                .trail-bit { position: absolute; width: 15px; height: 15px; background: var(--accent-primary); border-radius: 50%; filter: blur(5px); transform: translate(-50%, -50%); pointer-events: none; }
                .spark { position: absolute; transform: translate(-50%, -50%); pointer-events: none; z-index: 60; }
                
                .goal-portal { position: absolute; right: 0; top: 0; bottom: 0; width: 120px; display: flex; align-items: center; justify-content: center; background: linear-gradient(90deg, transparent, rgba(0,255,100,0.1)); border-left: 4px dashed #00ff66; color: #00ff66; }
                .portal-ring { position: absolute; width: 150px; height: 150px; border: 4px solid #00ff66; border-radius: 50%; filter: blur(10px); opacity: 0.2; animation: portal-pulse 2s infinite; }
                @keyframes portal-pulse { 0% { transform: scale(0.8); opacity: 0.4; } 100% { transform: scale(1.5); opacity: 0; } }

                .start-line { position: absolute; left: 0; top: 0; bottom: 0; width: 80px; display: flex; align-items: center; padding-left: 10px; color: rgba(255,255,255,0.1); font-weight: 950; font-size: 1.5rem; letter-spacing: 5px; writing-mode: vertical-lr; text-transform: uppercase; }
            `}</style>
        </div>
    );
};
export default Steering;
