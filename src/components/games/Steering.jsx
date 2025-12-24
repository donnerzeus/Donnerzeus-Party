import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db } from '../../firebase';
import { ref, onValue, update } from 'firebase/database';
import { Compass, Trophy } from 'lucide-react';

const Steering = ({ players, roomCode, onGameOver }) => {
    const [gameState, setGameState] = useState({ posX: 50, posY: 50 });
    const [finished, setFinished] = useState(false);

    useEffect(() => {
        const roomRef = ref(db, `rooms/${roomCode}/players`);
        return onValue(roomRef, (snapshot) => {
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
                    const sensitivity = 0.2;
                    setGameState(prev => {
                        const newX = Math.max(0, Math.min(100, prev.posX + (totalX / count) * sensitivity));
                        const newY = Math.max(0, Math.min(100, prev.posY + (totalY / count) * sensitivity));

                        // Victory condition: Top right corner
                        if (newX > 85 && newY < 15) {
                            setFinished(true);
                            if (onGameOver) onGameOver();
                        }
                        return { posX: newX, posY: newY };
                    });
                }
            }
        });
    }, [roomCode, finished, onGameOver]);

    return (
        <div className="game-container">
            <h1 className="neon-text">{finished ? "MISSION SUCCESS!" : "STEERING - CO-OP"}</h1>
            <p>{finished ? "Everyone worked together!" : "Tilt your phones to move the orb to the green zone!"}</p>
            <div className="steering-area glass-panel">
                <div className="target-zone">GOAL</div>
                <motion.div
                    className="steer-orb"
                    animate={{ left: `${gameState.posX}%`, top: `${gameState.posY}%` }}
                    transition={{ type: 'spring', damping: 15, stiffness: 150 }}
                >
                    {finished ? <Trophy color="#ffd700" size={32} /> : <Compass size={32} color="#00f2ff" />}
                </motion.div>
            </div>
            <style>{`
                .steering-area { width: 600px; height: 400px; position: relative; margin-top: 40px; overflow: hidden; background: rgba(255,b255,255,0.02); }
                .steer-orb { position: absolute; width: 60px; height: 60px; border-radius: 50%; background: var(--accent-primary); box-shadow: 0 0 20px var(--accent-primary); display: flex; align-items: center; justify-content: center; transform: translate(-50%, -50%); z-index: 2; }
                .target-zone { position: absolute; top: 0; right: 0; width: 100px; height: 100px; background: rgba(0,255,0,0.2); border: 2px dashed #0f0; display: flex; align-items: center; justify-content: center; font-weight: 800; color: #0f0; }
            `}</style>
        </div>
    );
};

export default Steering;
