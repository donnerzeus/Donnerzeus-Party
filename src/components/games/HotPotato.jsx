import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase';
import { ref, update, onValue } from 'firebase/database';
import { Bomb } from 'lucide-react';

const HotPotato = ({ players, roomCode, onGameOver }) => {
    const [bombHolder, setBombHolder] = useState(null);
    const [timeLeft, setTimeLeft] = useState(20);
    const [status, setStatus] = useState('active');

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
                setTimeout(() => { if (onGameOver) onGameOver(); }, 3000);
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
        <div className="hot-potato center-all">
            <div className={`danger-glow ${timeLeft < 5 ? 'active' : ''}`} />

            <div className="players-ring">
                {players.map((p, i) => {
                    const angle = (i * (360 / players.length)) * (Math.PI / 180);
                    const radius = 250;
                    const isHolder = p.id === bombHolder?.id;
                    return (
                        <motion.div
                            key={p.id}
                            className={`p-wrapper ${isHolder ? 'holding' : ''}`}
                            animate={{
                                x: Math.cos(angle) * radius,
                                y: Math.sin(angle) * radius,
                                scale: isHolder ? 1.2 : 1,
                            }}
                            transition={{ type: 'spring', damping: 10 }}
                        >
                            <div className="p-avatar" style={{ borderColor: p.color, backgroundColor: p.color + '22' }}>
                                {p.avatar ? <img src={p.avatar} /> : p.name[0]}
                                {isHolder && (
                                    <motion.div
                                        className="panic-aura"
                                        animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.1, 0.3] }}
                                        transition={{ repeat: Infinity, duration: 0.5 }}
                                    />
                                )}
                            </div>
                            <span className="p-label" style={{ backgroundColor: p.color }}>{p.name}</span>
                        </motion.div>
                    );
                })}
            </div>

            <div className="bomb-center">
                <motion.div
                    animate={status === 'exploded' ? {
                        scale: [1, 50],
                        opacity: [1, 0],
                        filter: ['brightness(1)', 'brightness(10)']
                    } : {
                        scale: timeLeft < 5 ? [1, 1.15, 1] : [1, 1.05, 1],
                        rotate: timeLeft < 5 ? [0, 10, -10, 0] : [0, 2, -2, 0]
                    }}
                    transition={{
                        duration: status === 'exploded' ? 0.4 : (timeLeft < 5 ? 0.15 : 0.8),
                        repeat: status === 'exploded' ? 0 : Infinity
                    }}
                    className={`bomb-core ${timeLeft < 5 ? 'near-miss' : ''}`}
                >
                    <Bomb size={180} color={timeLeft < 5 ? '#ff0044' : '#ffffff'} className="bomb-svg" />
                    {status !== 'exploded' && <div className="bomb-timer">{timeLeft}s</div>}
                </motion.div>

                <AnimatePresence>
                    {status === 'exploded' && (
                        <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1.5, opacity: 1 }} className="explosion-overlay">
                            <h1 className="boom-text">BOOM!</h1>
                            <div className="victim-card glass-panel" style={{ '--color': bombHolder?.color }}>
                                <p>ELIMINATED</p>
                                <h2>{bombHolder?.name}</h2>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <style>{`
                .hot-potato { width: 100%; height: 100%; position: relative; overflow: hidden; background: radial-gradient(circle, #222 0%, #000 100%); }
                .danger-glow { position: absolute; inset: 0; background: radial-gradient(circle, rgba(255,0,68,0.2) 0%, transparent 70%); opacity: 0; transition: opacity 0.3s; pointer-events: none; }
                .danger-glow.active { opacity: 1; animation: blink 0.5s infinite; }
                @keyframes blink { 0%, 100% { opacity: 0.2; } 50% { opacity: 0.6; } }

                .players-ring { position: relative; width: 0; height: 0; z-index: 10; }
                .p-wrapper { position: absolute; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; gap: 10px; }
                .p-avatar { width: 80px; height: 80px; border-radius: 20px; border: 4px solid; background: #111; overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: 900; position: relative; }
                .p-avatar img { width: 100%; height: 100%; object-fit: cover; }
                .holding .p-avatar { animation: shimmy 0.1s infinite; border-color: #ff0044 !important; box-shadow: 0 0 30px #ff0044; }
                @keyframes shimmy { 0%, 100% { transform: translate(0, 0); } 25% { transform: translate(2px, -2px); } 75% { transform: translate(-2px, 2px); } }
                
                .panic-aura { position: absolute; inset: -10px; border-radius: 25px; background: #ff0044; z-index: -1; }
                .p-label { padding: 4px 12px; border-radius: 8px; color: black; font-weight: 800; font-size: 0.9rem; }

                .bomb-center { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 5; }
                .bomb-core { position: relative; display: flex; align-items: center; justify-content: center; }
                .bomb-svg { filter: drop-shadow(0 0 20px rgba(255,255,255,0.2)); }
                .near-miss .bomb-svg { filter: drop-shadow(0 0 40px #ff0044); }
                .bomb-timer { position: absolute; bottom: -20px; font-size: 2.5rem; font-weight: 900; color: white; text-shadow: 0 0 15px rgba(0,0,0,0.8); }

                .explosion-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; z-index: 100; pointer-events: none; }
                .boom-text { font-size: 12rem; font-weight: 900; color: #ff0044; text-shadow: 0 0 50px #ff0044; margin: 0; }
                .victim-card { padding: 30px 60px; text-align: center; border-color: var(--color); }
                .victim-card p { font-size: 1.2rem; font-weight: 900; opacity: 0.7; letter-spacing: 4px; margin: 0; }
                .victim-card h2 { font-size: 3rem; font-weight: 900; color: var(--color); margin: 0; }
            `}</style>
        </div>
    );
};

export default HotPotato;
