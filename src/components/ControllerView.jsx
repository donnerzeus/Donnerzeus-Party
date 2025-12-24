import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import { ref, update, onValue } from 'firebase/database';
import { User, CheckCircle, AlertCircle, Zap, Palette, Bomb, Compass, ListChecks } from 'lucide-react';

const ControllerView = ({ roomCode, user, setView }) => {
    const [name, setName] = useState('');
    const [joined, setJoined] = useState(false);
    const [roomData, setRoomData] = useState(null);
    const [playerData, setPlayerData] = useState(null);
    const [isError, setIsError] = useState(false);

    // QuickDraw Canvas Ref
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        if (!roomCode || !user) return;

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
    }, [roomCode, user]);

    // Gyroscope Effect
    useEffect(() => {
        if (roomData?.gameType === 'steering' && roomData?.status === 'playing' && user) {
            const handleMotion = (e) => {
                if (e.beta || e.gamma) {
                    update(ref(db, `rooms/${roomCode}/players/${user.uid}/gyro`), {
                        beta: e.beta,
                        gamma: e.gamma
                    });
                }
            };

            // Request permission for iOS
            if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
                DeviceOrientationEvent.requestPermission().catch(console.error);
            }

            window.addEventListener('deviceorientation', handleMotion);
            return () => window.removeEventListener('deviceorientation', handleMotion);
        }
    }, [roomData?.gameType, roomData?.status, roomCode, user]);

    const handleJoin = (e) => {
        e.preventDefault();
        if (!name.trim() || !user) return;

        const colors = ['#00f2ff', '#7000ff', '#ff00aa', '#00ff44', '#ffaa00', '#f1c40f', '#e67e22', '#e74c3c'];
        update(ref(db, `rooms/${roomCode}/players/${user.uid}`), {
            name: name.trim(),
            color: colors[Math.floor(Math.random() * colors.length)],
            joinedAt: Date.now(),
            score: 0,
            lastClick: 0
        });
        setJoined(true);
    };

    const handleAction = (type, val) => {
        if (roomData?.status !== 'playing' || !user) return;
        if (navigator.vibrate) navigator.vibrate(50);

        if (roomData.gameType === 'fast-click') {
            update(ref(db, `rooms/${roomCode}/players/${user.uid}`), {
                lastClick: Date.now(),
                score: (playerData?.score || 0) + 1
            });
        } else if (roomData.gameType === 'reaction-time') {
            if (!playerData?.lastClick) {
                update(ref(db, `rooms/${roomCode}/players/${user.uid}`), {
                    lastClick: Date.now()
                });
            }
        } else if (roomData.gameType === 'simon-says') {
            update(ref(db, `rooms/${roomCode}/players/${user.uid}`), {
                lastMove: val,
                lastClick: Date.now()
            });
        } else if (roomData.gameType === 'hot-potato') {
            if (roomData.bombHolderId === user.uid) {
                const otherPlayers = Object.keys(roomData.players).filter(id => id !== user.uid);
                if (otherPlayers.length > 0) {
                    const nextId = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
                    update(ref(db, `rooms/${roomCode}`), { bombHolderId: nextId });
                }
            }
        }
    };

    // QuickDraw Logic
    const startDrawing = (e) => {
        setIsDrawing(true);
        draw(e);
    };
    const draw = (e) => {
        if (!isDrawing || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'black';
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    };
    const stopDrawing = () => {
        setIsDrawing(false);
        const canvas = canvasRef.current;
        if (canvas && user) {
            const dataUrl = canvas.toDataURL('image/png');
            update(ref(db, `rooms/${roomCode}/players/${user.uid}`), { drawing: dataUrl });
        }
    };

    if (isError) return (
        <div className="controller-container glass-panel">
            <AlertCircle size={48} color="#ff4444" />
            <h2>ROOM NOT FOUND</h2>
            <button className="neon-button" onClick={() => setView('landing')}>BACK HOME</button>
        </div>
    );

    return (
        <div className="controller-container">
            <AnimatePresence mode="wait">
                {!joined ? (
                    <motion.div key="join" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel">
                        <User size={48} className="neon-text" />
                        <h3>Enter Name</h3>
                        <form onSubmit={handleJoin} style={{ width: '100%' }}>
                            <input className="name-input" value={name} onChange={e => setName(e.target.value)} placeholder="Nickname" />
                            <button className="neon-button full">JOIN</button>
                        </form>
                    </motion.div>
                ) : (
                    <div className="panel-content">
                        {roomData?.status === 'lobby' ? (
                            <div className="glass-panel">
                                <CheckCircle size={64} color="#00ff44" />
                                <h2>CONNECTED</h2>
                                <p>Wait for host...</p>
                                <div className="room-badge">{roomCode}</div>
                            </div>
                        ) : (
                            <div className="game-screen">
                                {roomData.gameType === 'fast-click' && (
                                    <button className="action-trigger fast-click-btn" onClick={handleAction}>
                                        TAP!
                                        <span className="current-score">{playerData?.score || 0}</span>
                                    </button>
                                )}

                                {roomData.gameType === 'reaction-time' && (
                                    <button className={`action-trigger reaction-btn ${roomData.gamePhase}`} onClick={handleAction}>
                                        {roomData.gamePhase === 'tap' ? 'TAP NOW!' : 'WAIT...'}
                                    </button>
                                )}

                                {roomData.gameType === 'simon-says' && (
                                    <div className="simon-buttons">
                                        {['#ff4444', '#44ff44', '#4444ff', '#ffff44'].map((c, i) => (
                                            <button key={i} className="simon-btn" style={{ background: c }} onClick={() => handleAction('simon', i)} />
                                        ))}
                                    </div>
                                )}

                                {roomData.gameType === 'quick-draw' && (
                                    <div className="canvas-container">
                                        <h3>Çiz: {roomData.currentWord}</h3>
                                        <canvas ref={canvasRef} width={300} height={400} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />
                                        <button className="neon-button mini" onClick={() => {
                                            const ctx = canvasRef.current.getContext('2d');
                                            ctx.clearRect(0, 0, 300, 400);
                                        }}>CLEAR</button>
                                    </div>
                                )}

                                {roomData.gameType === 'hot-potato' && (
                                    <div className={`bomb-controller ${roomData.bombHolderId === user.uid ? 'has-bomb' : ''}`}>
                                        {roomData.bombHolderId === user.uid ? (
                                            <div className="bomb-task">
                                                <Bomb size={80} className="shake" />
                                                <h2>YOU HAVE THE BOMB!</h2>
                                                <button className="neon-button full" onClick={handleAction}>PASS IT!!!</button>
                                            </div>
                                        ) : (
                                            <div className="bomb-safe">
                                                <CheckCircle size={80} />
                                                <h2>YOU ARE SAFE... FOR NOW</h2>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {roomData.gameType === 'steering' && (
                                    <div className="steering-controller">
                                        <Compass size={100} className="neon-text" />
                                        <h2>TILT YOUR PHONE</h2>
                                        <p>Moving together is key!</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .controller-container { width: 100%; max-width: 400px; padding: 20px; text-align: center; }
                .name-input { background: rgba(255,255,b255,0.1); border: 1px solid var(--accent-primary); padding: 15px; border-radius: 12px; color: white; width: 100%; margin-bottom: 20px; text-align: center; font-size: 1.2rem; }
                .action-trigger { width: 250px; height: 250px; border-radius: 50%; border: none; color: white; font-size: 2rem; font-weight: 800; cursor: pointer; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
                .fast-click-btn { background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary)); }
                .reaction-btn.waiting { background: #800; }
                .reaction-btn.tap { background: #080; animation: pulse 0.5s infinite; }
                .simon-buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; width: 100%; height: 300px; }
                .simon-btn { border-radius: 15px; border: none; cursor: pointer; }
                .canvas-container { background: white; padding: 10px; border-radius: 20px; color: black; }
                canvas { border: 1px solid #ccc; width: 100%; touch-action: none; background: white; cursor: crosshair; }
                .bomb-controller { padding: 40px; border-radius: 24px; }
                .has-bomb { background: rgba(255,0,0,0.2); animation: bombPulse 0.5s infinite; }
                .room-badge { background: var(--accent-secondary); padding: 5px 15px; border-radius: 20px; font-weight: 800; margin-top: 10px; display: inline-block; }
                @keyframes bombPulse { 0% { background: rgba(255,0,0,0.2); } 50% { background: rgba(255,0,0,0.4); } 100% { background: rgba(255,0,0,0.2); } }
                .shake { animation: shake 0.2s infinite; }
                @keyframes shake { 0% { transform: rotate(0deg); } 25% { transform: rotate(5deg); } 75% { transform: rotate(-5deg); } 100% { transform: rotate(0deg); } }
                @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
            `}</style>
        </div>
    );
};

export default ControllerView;
