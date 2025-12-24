import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import { ref, update, onValue } from 'firebase/database';
import { User, CheckCircle, AlertCircle, Zap } from 'lucide-react';

const ControllerView = ({ roomCode, user, setView }) => {
    const [name, setName] = useState('');
    const [joined, setJoined] = useState(false);
    const [roomData, setRoomData] = useState(null);
    const [playerData, setPlayerData] = useState(null);
    const [isError, setIsError] = useState(false);

    useEffect(() => {
        if (!roomCode) return;

        const roomRef = ref(db, `rooms/${roomCode}`);
        const unsubscribe = onValue(roomRef, (snapshot) => {
            if (!snapshot.exists()) {
                setIsError(true);
                return;
            }
            const data = snapshot.val();
            setRoomData(data);

            if (data.players && data.players[user.uid]) {
                setJoined(true);
                setPlayerData(data.players[user.uid]);
            } else {
                setJoined(false);
            }
        });

        return () => unsubscribe();
    }, [roomCode, user.uid]);

    const handleJoin = (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        const colors = ['#00f2ff', '#7000ff', '#ff00aa', '#00ff44', '#ffaa00'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        update(ref(db, `rooms/${roomCode}/players/${user.uid}`), {
            name: name.trim(),
            color: randomColor,
            joinedAt: Date.now(),
            score: 0,
            lastClick: 0
        });
        setJoined(true);
    };

    const handleAction = () => {
        if (roomData?.status !== 'playing') return;

        // Vibrate on tap
        if (navigator.vibrate) navigator.vibrate(50);

        if (roomData.gameType === 'fast-click') {
            const currentScore = playerData?.score || 0;
            update(ref(db, `rooms/${roomCode}/players/${user.uid}`), {
                lastClick: Date.now(),
                score: currentScore + 1
            });
        } else if (roomData.gameType === 'reaction-time') {
            // Only allow one tap in reaction time
            if (playerData?.lastClick > 0) return;

            update(ref(db, `rooms/${roomCode}/players/${user.uid}`), {
                lastClick: Date.now()
            });
        }
    };

    if (isError) {
        return (
            <div className="controller-container glass-panel">
                <AlertCircle size={48} color="#ff4444" />
                <h2>ROOM NOT FOUND</h2>
                <button className="neon-button" onClick={() => setView('landing')}>BACK HOME</button>
            </div>
        );
    }

    const gameType = roomData?.gameType;
    const gamePhase = roomData?.gamePhase;

    return (
        <div className="controller-container">
            <AnimatePresence mode="wait">
                {!joined ? (
                    <motion.div
                        key="join"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-panel join-form"
                    >
                        <User size={48} className="neon-text" />
                        <h3>Enter Name</h3>
                        <form onSubmit={handleJoin} style={{ width: '100%' }}>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Nickname..."
                                className="name-input"
                                autoFocus
                            />
                            <button className="neon-button full" type="submit">JOIN</button>
                        </form>
                    </motion.div>
                ) : (
                    <motion.div
                        key="status"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="panel-content"
                    >
                        {roomData?.status === 'lobby' ? (
                            <div className="glass-panel lobby-waiting">
                                <CheckCircle size={64} color="#00ff44" />
                                <h2>CONNECTED</h2>
                                <p>Wait for host to start...</p>
                                <div className="room-badge">{roomCode}</div>
                            </div>
                        ) : roomData?.status === 'playing' ? (
                            <div className={`game-controller ${gameType} ${gamePhase}`}>
                                {gameType === 'fast-click' && (
                                    <button className="action-trigger fast-click-btn" onClick={handleAction}>
                                        TAP!
                                        <span className="current-score">{playerData?.score || 0}</span>
                                    </button>
                                )}

                                {gameType === 'reaction-time' && (
                                    <div className="reaction-container">
                                        {playerData?.lastClick > 0 ? (
                                            <div className="glass-panel result-waiting">
                                                <CheckCircle size={48} color="#00ff44" />
                                                <h3>TAPPED!</h3>
                                                <p>Check the main screen</p>
                                            </div>
                                        ) : (
                                            <button
                                                className={`action-trigger reaction-btn ${gamePhase}`}
                                                onClick={handleAction}
                                                disabled={gamePhase === 'starting'}
                                            >
                                                {gamePhase === 'starting' ? 'GET READY' :
                                                    gamePhase === 'tap' ? 'TAP NOW!' : 'WAIT...'}
                                                {gamePhase === 'tap' && <Zap className="zap-icon" />}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </motion.div>
                )}
            </AnimatePresence>

            <style jsx>{`
                .controller-container { width: 100%; max-width: 400px; padding: 20px; }
                .glass-panel { padding: 30px; display: flex; flex-direction: column; align-items: center; gap: 20px; text-align: center; }
                .name-input { 
                    background: rgba(255, 255, 255, 0.05); border: 1px solid var(--glass-border); 
                    padding: 15px; border-radius: 12px; color: white; width: 100%; 
                    font-size: 1.2rem; text-align: center; margin-bottom: 20px; 
                }
                .full { width: 100%; }
                .room-badge { background: var(--accent-secondary); padding: 5px 15px; border-radius: 20px; font-weight: 800; }
                .action-trigger {
                    width: 250px; height: 250px; border-radius: 50%; border: none;
                    color: white; font-size: 2rem; font-weight: 800; cursor: pointer;
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    transition: all 0.2s; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                }
                .fast-click-btn { 
                    background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
                    box-shadow: 0 10px 30px rgba(0, 242, 255, 0.3);
                }
                .fast-click-btn:active { transform: scale(0.95); }
                .reaction-btn { background: #333; }
                .reaction-btn.starting { background: #555; opacity: 0.5; cursor: wait; }
                .reaction-btn.waiting { background: #800; box-shadow: 0 0 20px rgba(255,0,0,0.3); }
                .reaction-btn.tap { background: #080; box-shadow: 0 0 40px rgba(0,255,0,0.5); font-size: 2.5rem; }
                .reaction-btn:active:not(.starting) { transform: scale(0.95); }
                .current-score { font-size: 1.2rem; opacity: 0.8; margin-top: 10px; }
                .result-waiting { padding: 40px; }
                .zap-icon { margin-top: 10px; animation: pulse 0.5s infinite; }
                @keyframes pulse { 0% { scale: 1; } 50% { scale: 1.2; } 100% { scale: 1; } }
            `}</style>
        </div>
    );
};

export default ControllerView;
