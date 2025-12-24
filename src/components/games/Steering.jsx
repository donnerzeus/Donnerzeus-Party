import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db } from '../../firebase';
import { ref, onValue } from 'firebase/database';
import { Compass, Trophy } from 'lucide-react';

const Steering = ({ players, roomCode, onGameOver }) => {
    const [gameState, setGameState] = useState({ posX: 50, posY: 50 });
    const [finished, setFinished] = useState(false);

    useEffect(() => {
        const roomRef = ref(db, `rooms/${roomCode}/players`);
        const unsubscribe = onValue(roomRef, (snapshot) => {
            const data = snapshot.val();
            if (data && !finished) {
                let totalX = 0, totalY = 0, count = 0;
                Object.values(data).forEach(p => {
                    // Check if player has gyro data
                    if (p.gyro) {
                        // gamma is tilt around y axis (left/right)
                        // beta is tilt around x axis (front/back)
                        totalX += (p.gyro.gamma || 0);
                        totalY += (p.gyro.beta || 0);
                        count++;
                    }
                });

                if (count > 0) {
                    const avgX = totalX / count;
                    const avgY = totalY / count;

                    // Improved physics: acceleration based
                    setGameState(prev => {
                        // Deadzone and scaling
                        const moveX = Math.abs(avgX) > 2 ? avgX * 0.15 : 0;
                        const moveY = Math.abs(avgY) > 2 ? avgY * 0.15 : 0;

                        const newX = Math.max(2, Math.min(98, prev.posX + moveX));
                        const newY = Math.max(2, Math.min(98, prev.posY + moveY));

                        // Victory Check: Bottom Right (90, 90) zone
                        if (newX > 85 && newY > 85 && !finished) {
                            setFinished(true);
                            if (onGameOver) onGameOver();
                        }
                        return { posX: newX, posY: newY };
                    });
                }
            }
        });
        return () => unsubscribe();
    }, [roomCode, finished, onGameOver]);

    return (
        <div className="steering-game center-all">
            <h1 className="game-title neon-text">{finished ? "MISSION SUCCESS!" : "STEERING CHALLENGE"}</h1>
            <p className="game-desc">{finished ? "Legendary teamwork!" : "TILT your phones together to reach the GOAL ZONE!"}</p>

            <div className="steering-canvas glass-panel">
                {/* Visual obstacles or grid can go here */}
                <div className="grid-overlay" />

                <div className="goal-zone">
                    <Trophy size={48} />
                    <span>GOAL</span>
                </div>

                <motion.div
                    className="avatar-orb"
                    animate={{ left: `${gameState.posX}%`, top: `${gameState.posY}%` }}
                    transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                >
                    <div className="orb-core">
                        <Compass size={40} className="spinner-icon" />
                    </div>
                    <div className="orb-glow" />
                </motion.div>

                {/* Visual indicator of average tilt */}
            </div>

            <style>{`
                .steering-game { width: 100%; height: 100%; display: flex; flex-direction: column; gap: 20px; }
                .game-title { font-size: 4rem; }
                .game-desc { font-size: 1.5rem; color: var(--text-dim); margin-bottom: 20px; }
                
                .steering-canvas { 
                    width: 900px; 
                    height: 550px; 
                    position: relative; 
                    background: rgba(0,0,0,0.4); 
                    border-radius: 40px; 
                    overflow: hidden; 
                    border: 4px solid var(--glass-border);
                }
                .grid-overlay {
                    position: absolute; inset: 0;
                    background-image: radial-gradient(circle, rgba(255,b255,255,0.05) 1px, transparent 1px);
                    background-size: 40px 40px;
                }

                .goal-zone {
                    position: absolute;
                    bottom: 20px;
                    right: 20px;
                    width: 150px;
                    height: 150px;
                    background: rgba(0, 255, 68, 0.1);
                    border: 3px dashed #00ff44;
                    border-radius: 30px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    color: #00ff44;
                    font-weight: 900;
                    box-shadow: inset 0 0 20px rgba(0,255,0,0.2);
                }

                .avatar-orb {
                    position: absolute;
                    width: 80px;
                    height: 80px;
                    transform: translate(-50%, -50%);
                    z-index: 10;
                }
                .orb-core {
                    width: 100%; height: 100%;
                    background: var(--accent-primary);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 0 30px var(--accent-primary);
                    color: white;
                    position: relative;
                    z-index: 2;
                }
                .orb-glow {
                    position: absolute; inset: -10px;
                    background: var(--accent-primary);
                    border-radius: 50%;
                    filter: blur(20px);
                    opacity: 0.3;
                    animation: pulse 2s infinite;
                }
                .spinner-icon { animation: spin 4s linear infinite; }
                @keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
                @keyframes pulse { 0%{transform:scale(1);opacity:0.3} 50%{transform:scale(1.2);opacity:0.1} 100%{transform:scale(1);opacity:0.3} }
            `}</style>
        </div>
    );
};

export default Steering;
