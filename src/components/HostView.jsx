import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import { ref, onValue, update } from 'firebase/database';
import { Users, LogOut, Play } from 'lucide-react';
import FastClick from './games/FastClick';

const HostView = ({ roomCode, user, setView }) => {
    const [players, setPlayers] = useState([]);
    const [status, setStatus] = useState('lobby');

    useEffect(() => {
        const roomRef = ref(db, `rooms/${roomCode}`);

        const unsubscribe = onValue(roomRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setStatus(data.status);
                if (data.players) {
                    setPlayers(Object.entries(data.players).map(([id, p]) => ({ id, ...p })));
                } else {
                    setPlayers([]);
                }
            }
        });

        return () => unsubscribe();
    }, [roomCode]);

    const startGame = () => {
        update(ref(db, `rooms/${roomCode}`), {
            status: 'playing',
            gameType: 'fast-click', // First game
            startedAt: Date.now()
        });
    };

    const joinUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;

    if (status === 'playing') {
        return (
            <div className="host-container">
                <FastClick players={players} status={status} />
            </div>
        );
    }

    return (
        <div className="host-container">
            <div className="host-header">
                <div className="room-info">
                    <span className="label">ROOM CODE</span>
                    <h2 className="room-code neon-text">{roomCode}</h2>
                </div>
                <button className="neon-button secondary" onClick={() => setView('landing')}>
                    <LogOut size={18} /> Exit
                </button>
            </div>

            <div className="host-content">
                <div className="lobby-left">
                    <div className="glass-panel qr-section">
                        <QRCodeSVG
                            value={joinUrl}
                            size={256}
                            bgColor={"transparent"}
                            fgColor={"#00f2ff"}
                            level={"H"}
                            includeMargin={true}
                        />
                        <p className="qr-hint">Scan to join with your phone</p>
                        <div className="url-box">{joinUrl}</div>
                    </div>
                </div>

                <div className="lobby-right">
                    <div className="players-list">
                        <div className="section-title">
                            <Users size={24} />
                            <h3>Players ({players.length})</h3>
                        </div>

                        <div className="players-grid">
                            <AnimatePresence>
                                {players.map((player, index) => (
                                    <motion.div
                                        key={player.id}
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0, opacity: 0 }}
                                        className="player-token"
                                        style={{ '--color': player.color || '#7000ff' }}
                                    >
                                        <div className="avatar">
                                            {player.name ? player.name[0].toUpperCase() : '?'}
                                        </div>
                                        <span className="player-name">{player.name || 'Joining...'}</span>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            {players.length === 0 && (
                                <p className="waiting-msg">Waiting for players to join...</p>
                            )}
                        </div>
                    </div>

                    <div className="controls">
                        <button
                            className="neon-button start-btn"
                            disabled={players.length === 0}
                            onClick={startGame}
                        >
                            <Play size={24} /> START GAME
                        </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
        .host-container {
          width: 90vw;
          height: 85vh;
          display: flex;
          flex-direction: column;
          gap: 30px;
        }
        .host-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .room-info {
          display: flex;
          flex-direction: column;
        }
        .label {
          color: var(--text-dim);
          font-size: 0.8rem;
          letter-spacing: 2px;
        }
        .room-code {
          font-size: 3rem;
          margin-top: -5px;
        }
        .host-content {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 40px;
          flex: 1;
        }
        .qr-section {
          padding: 30px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          height: 100%;
          justify-content: center;
        }
        .qr-hint {
          color: var(--text-dim);
          font-weight: 500;
        }
        .url-box {
          font-size: 0.7rem;
          color: var(--text-dim);
          word-break: break-all;
          opacity: 0.5;
        }
        .players-list {
          flex: 1;
        }
        .section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          color: var(--accent-primary);
        }
        .players-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 20px;
          min-height: 200px;
        }
        .player-token {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        .avatar {
          width: 80px;
          height: 80px;
          background: var(--card-bg);
          border: 3px solid var(--color);
          box-shadow: 0 0 15px var(--color);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          font-weight: 800;
          color: var(--color);
        }
        .player-name {
          font-weight: 600;
          font-size: 1.1rem;
        }
        .waiting-msg {
          grid-column: 1 / -1;
          text-align: center;
          color: var(--text-dim);
          padding-top: 50px;
          font-style: italic;
        }
        .controls {
          margin-top: auto;
          display: flex;
          justify-content: flex-end;
          padding-top: 20px;
        }
        .start-btn {
          padding: 20px 60px;
          font-size: 1.5rem;
        }
        .start-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
          filter: grayscale(1);
        }
      `}</style>
        </div>
    );
};

export default HostView;
