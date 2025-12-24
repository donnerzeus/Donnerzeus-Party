import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db } from '../../firebase';
import { ref, onValue, update } from 'firebase/database';
import { Compass } from 'lucide-react';

const Steering = ({ players, roomCode }) => {
    const [gameState, setGameState] = useState({ posX: 50, posY: 50 });

    useEffect(() => {
        const roomRef = ref(db, `rooms/${roomCode}/players`);
        return onValue(roomRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                let totalX = 0;
                let totalY = 0;
                let count = 0;

                Object.values(data).forEach(p => {
                    if (p.gyro) {
                        // gyro format: { beta: -90 to 90, gamma: -90 to 90 }
                        totalX += (p.gyro.gamma || 0);
                        totalY += (p.gyro.beta || 0);
                        count++;
                    }
                });

                if (count > 0) {
                    const avgX = totalX / count;
                    const avgY = totalY / count;

                    setGameState(prev => ({
                        posX: Math.max(0, Math.min(100, prev.posX + avgX * 0.1)),
                        posY: Math.max(0, Math.min(100, prev.posY + avgY * 0.1))
                    }));
                }
            }
        });
    }, [roomCode]);

    return (
        <div className="game-container">
            <h1 className="neon-text">STEERING - CO-OP</h1>
            <p>Tilt your phones together to move the orb!</p>

            <div className="steering-area glass-panel">
                <motion.div
                    className="steer-orb"
                    animate={{
                        left: `${gameState.posX}%`,
                        top: `${gameState.posY}%`
                    }}
                    transition={{ type: 'spring', damping: 10, stiffness: 100 }}
                >
                    <Compass size={48} color="#00f2ff" />
                </motion.div>

                <div className="target-zone" style={{ top: '20%', left: '80%' }}>ZONE</div>
            </div>

            <style>{`
                .steering-area { width: 600px; height: 400px; position: relative; margin-top: 40px; overflow: hidden; }
                .steer-orb { position: absolute; width: 60px; height: 60px; border-radius: 50%; background: var(--accent-primary); box-shadow: 0 0 20px var(--accent-primary); display: flex; align-items: center; justify-content: center; transform: translate(-50%, -50%); }
                .target-zone { position: absolute; border: 2px dashed rgba(255,255,b255,0.3); padding: 10px; border-radius: 50%; transform: translate(-50%, -50%); }
            `}</style>
        </div>
    );
};

export default Steering;
