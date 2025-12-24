import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase';
import { ref, update, onValue } from 'firebase/database';
import { Bomb } from 'lucide-react';

const HotPotato = ({ players, roomCode, onGameOver }) => {
    const [bombHolder, setBombHolder] = useState(null);
    const [timeLeft, setTimeLeft] = useState(20);
    const [status, setStatus] = useState('active'); // active, exploded

    useEffect(() => {
        if (players.length > 0 && !bombHolder) {
            const randomPlayer = players[Math.floor(Math.random() * players.length)];
            setBombHolder(randomPlayer);
            updateStore(randomPlayer.id);
        }

        const timer = setInterval(() => {
            if (timeLeft > 0 && status === 'active') {
                setTimeLeft(prev => prev - 1);
            } else if (timeLeft <= 0 && status === 'active') {
                setStatus('exploded');
                if (onGameOver) onGameOver();
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [players, bombHolder, timeLeft, status]);

    const updateStore = (playerId) => {
        update(ref(db, `rooms/${roomCode}`), { bombHolderId: playerId, bombStatus: 'active' });
    };

    useEffect(() => {
        const roomRef = ref(db, `rooms/${roomCode}`);
        return onValue(roomRef, (snapshot) => {
            const data = snapshot.val();
            if (data?.bombHolderId && data.bombHolderId !== bombHolder?.id) {
                const newHolder = players.find(p => p.id === data.bombHolderId);
                if (newHolder) setBombHolder(newHolder);
            }
        });
    }, [bombHolder, players, roomCode]);

    return (
        <div className="game-container">
            <h1 className="neon-text">DON'T GET BLOWN UP!</h1>
            <div className="bomb-area">
                <motion.div
                    animate={{
                        scale: status === 'exploded' ? [1, 20] : [1, 1.1, 1],
                        rotate: status === 'exploded' ? 0 : [0, 5, -5, 0],
                        opacity: status === 'exploded' ? [1, 0] : 1
                    }}
                    transition={{
                        duration: status === 'exploded' ? 0.5 : (timeLeft < 5 ? 0.2 : 0.5),
                        repeat: status === 'exploded' ? 0 : Infinity
                    }}
                    className={`bomb-icon ${timeLeft < 5 ? 'urgent' : ''}`}
                >
                    <Bomb size={200} color={status === 'exploded' ? '#ff0000' : '#ffffff'} />
                </motion.div>
                {status === 'exploded' ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="explosion-text">
                        BOOM!
                        <p className="loser">{bombHolder?.name} exploded!</p>
                    </motion.div>
                ) : (
                    <div className="holder-info">
                        <p>The bomb is with:</p>
                        <h2 style={{ color: bombHolder?.color }}>{bombHolder?.name || 'Choosing...'}</h2>
                        <div className="timer-bar"><motion.div className="timer-fill" animate={{ width: `${(timeLeft / 20) * 100}%` }} style={{ backgroundColor: timeLeft < 5 ? '#ff4444' : '#00f2ff' }} /></div>
                    </div>
                )}
            </div>
            <style>{`
                .bomb-area { display: flex; flex-direction: column; align-items: center; margin-top: 50px; gap: 30px; }
                .urgent { filter: drop-shadow(0 0 20px #ff0000); }
                .holder-info h2 { font-size: 3rem; text-align: center; }
                .timer-bar { width: 400px; height: 10px; background: rgba(255,255,255,0.1); border-radius: 5px; overflow: hidden; margin-top: 20px; }
                .timer-fill { height: 100%; transition: width 1s linear; }
                .explosion-text { font-size: 6rem; font-weight: 800; color: #ff0000; text-align: center; }
                .loser { font-size: 2rem; color: white; margin-top: 10px; }
            `}</style>
        </div>
    );
};

export default HotPotato;
