import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import { ref, update, onValue, set } from 'firebase/database';
import { User, LogOut, CheckCircle } from 'lucide-react';

const ControllerView = ({ roomCode, user, setView }) => {
    const [name, setName] = useState('');
    const [joined, setJoined] = useState(false);
    const [roomStatus, setRoomStatus] = useState('lobby');
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
            setRoomStatus(data.status);

            // Check if I'm already in this room
            if (data.players && data.players[user.uid]) {
                setJoined(true);
                setPlayerData(data.players[user.uid]);
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
            score: 0
        });
        setJoined(true);
    };

    const handleAction = () => {
        // Basic action for the "Fast Click" demo
        const currentScore = playerData?.score || 0;
        update(ref(db, `rooms/${roomCode}/players/${user.uid}`), {
            lastClick: Date.now(),
            score: currentScore + 1
        });
    };

    if (isError) {
        return (
            <div className="controller-container glass-panel">
                <h2 className="neon-text">OOPS!</h2>
                <p>Room not found or expired.</p>
                <button className="neon-button" onClick={() => setView('landing')}>BACK HOME</button>
            </div>
        );
    }

    return (
        <div className="controller-container">
            <AnimatePresence mode="wait">
                {!joined ? (
                    <motion.div
                        key="join"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="glass-panel join-form"
                    >
                        <User size={48} className="neon-text" />
                        <h3>Your Name</h3>
                        <form onSubmit={handleJoin}>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter nickname..."
                                className="name-input"
                                autoFocus
                            />
                            <button className="neon-button full" type="submit">
                                JOIN PARTY
                            </button>
                        </form>
                    </motion.div>
                ) : (
                    <motion.div
                        key="status"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="panel-content"
                    >
                        {roomStatus === 'lobby' ? (
                            <div className="glass-panel lobby-waiting">
                                <CheckCircle size={64} className="success-icon" />
                                <h2>READY!</h2>
                                <p>Waiting for the host to start...</p>
                                <div className="room-badge">Room: {roomCode}</div>
                            </div>
                        ) : roomStatus === 'playing' ? (
                            <div className="game-controller">
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    className="action-trigger"
                                    onClick={handleAction}
                                >
                                    TAP!
                                </motion.button>
                            </div>
                        ) : null}
                    </motion.div>
                )}
            </AnimatePresence>

            <style jsx>{`
        .controller-container {
          width: 100%;
          max-width: 400px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .join-form {
          padding: 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }
        .name-input {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--glass-border);
          padding: 15px;
          border-radius: 12px;
          color: white;
          width: 100%;
          font-size: 1.2rem;
          text-align: center;
          margin-bottom: 20px;
        }
        .full { width: 100%; }
        .lobby-waiting {
          padding: 60px 40px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }
        .success-icon {
          color: #00ff44;
          filter: drop-shadow(0 0 10px rgba(0, 255, 68, 0.4));
        }
        .room-badge {
          background: var(--accent-secondary);
          padding: 5px 15px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 800;
        }
        .game-controller {
          height: 300px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .action-trigger {
          width: 200px;
          height: 200px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
          border: none;
          color: white;
          font-size: 2rem;
          font-weight: 800;
          box-shadow: 0 10px 30px rgba(0, 242, 255, 0.5);
          cursor: pointer;
        }
      `}</style>
        </div>
    );
};

export default ControllerView;
