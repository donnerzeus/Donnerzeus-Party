import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db } from '../../firebase';
import { ref, onValue } from 'firebase/database';
import { Compass, Trophy, AlertTriangle, Ghost } from 'lucide-react';

const Steering = ({ players, roomCode, onGameOver }) => {
    const [gameState, setGameState] = useState({ posX: 10, posY: 50 });
    const [finished, setFinished] = useState(false);

    // Maze barriers: { x, y, width, height } in percentage
    const barriers = [
        { x: 30, y: 0, w: 5, h: 40 },
        { x: 30, y: 60, w: 5, h: 40 },
        { x: 55, y: 20, w: 5, h: 60 },
        { x: 80, y: 0, w: 5, h: 30 },
        { x: 80, y: 70, w: 5, h: 30 }
    ];

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
                    const sensitivity = 0.08; // Reduced sensitivity
                    setGameState(prev => {
                        const moveX = (totalX / count) * sensitivity;
                        const moveY = (totalY / count) * sensitivity;

                        let nextX = Math.max(2, Math.min(98, prev.posX + moveX));
                        let nextY = Math.max(2, Math.min(98, prev.posY + moveY));

                        // Collision Detection
                        let hasCollision = false;
                        for (const b of barriers) {
                            if (nextX > b.x && nextX < b.x + b.w && nextY > b.y && nextY < b.y + b.h) {
                                hasCollision = true;
                                break;
                            }
                        }

                        if (hasCollision) {
                            // Bounce back or reset slightly
                            return { posX: Math.max(2, prev.posX - moveX * 2), posY: Math.max(2, prev.posY - moveY * 2) };
                        }

                        // Victory Check: Far Right Goal
                        if (nextX > 90 && !finished) {
                            setFinished(true);
                            if (onGameOver) onGameOver();
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
            <h1 className="game-title neon-text">{finished ? "TEAMWORK MAKES THE DREAM WORK!" : "MAZE STEERING"}</h1>
            <p className="game-desc">{finished ? "Incredible coordination!" : "GUIDE THE ORB THROUGH THE BARRIERS!"}</p>

            <div className="steering-canvas glass-panel">
                <div className="grid-overlay" />

                {/* Maze Barriers */}
                {barriers.map((b, i) => (
                    <div
                        key={i}
                        className="barrier"
                        style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%` }}
                    >
                        <div className="barrier-glow" />
                    </div>
                ))}

                <div className="goal-flag">
                    <Trophy size={48} />
                    <span>FINISH</span>
                </div>

                <motion.div
                    className="avatar-orb"
                    animate={{ left: `${gameState.posX}%`, top: `${gameState.posY}%` }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                >
                    <div className="orb-core">
                        <Compass size={40} className="spinner-icon" />
                    </div>
                    <div className="orb-glow" />
                </motion.div>

                <div className="start-zone">START</div>
            </div>

            <style>{`
                .steering-game { width: 100%; height: 100%; gap: 20px; }
                .game-title { font-size: 4rem; }
                .game-desc { font-size: 1.5rem; color: var(--text-dim); margin-bottom: 20px; }
                
                .steering-canvas { 
                    width: 1000px; 
                    height: 600px; 
                    position: relative; 
                    background: rgba(0,0,0,0.6); 
                    border-radius: 40px; 
                    overflow: hidden; 
                    border: 4px solid var(--glass-border);
                }

                .barrier { position: absolute; background: var(--accent-secondary); border-radius: 10px; border: 2px solid rgba(255,255,255,0.2); }
                .barrier-glow { position: absolute; inset: -5px; background: var(--accent-secondary); filter: blur(15px); opacity: 0.2; }

                .start-zone { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: rgba(255,255,255,0.2); font-weight: 800; font-size: 2rem; border-left: 5px solid; padding-left: 10px; }
                .goal-flag {
                    position: absolute; right: 0; top: 0; bottom: 0; width: 100px;
                    background: linear-gradient(90deg, transparent, rgba(0, 255, 68, 0.1));
                    border-left: 3px dashed #00ff44;
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    color: #00ff44; font-weight: 900;
                }

                .avatar-orb { position: absolute; width: 60px; height: 60px; transform: translate(-50%, -50%); z-index: 10; }
                .orb-core { width: 100%; height: 100%; background: var(--accent-primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 30px var(--accent-primary); color: white; position: relative; z-index: 2; }
                .orb-glow { position: absolute; inset: -10px; background: var(--accent-primary); border-radius: 50%; filter: blur(15px); opacity: 0.4; animation: pulse 1.5s infinite; }
                .spinner-icon { animation: spin 4s linear infinite; }
                @keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
                @keyframes pulse { 0%{transform:scale(1);opacity:0.4} 50%{transform:scale(1.2);opacity:0.2} 100%{transform:scale(1);opacity:0.4} }
            `}</style>
        </div>
    );
};

export default Steering;
