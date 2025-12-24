import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import { ref, update, onValue } from 'firebase/database';
import { User, CheckCircle, AlertCircle, Zap, Palette, Bomb, Compass, ListChecks, ShieldCheck } from 'lucide-react';

const ControllerView = ({ roomCode, user, setView }) => {
    const [name, setName] = useState('');
    const [joined, setJoined] = useState(false);
    const [roomData, setRoomData] = useState(null);
    const [playerData, setPlayerData] = useState(null);
    const [isError, setIsError] = useState(false);
    const [sensorsActive, setSensorsActive] = useState(false);

    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        if (!roomCode || !user) return;
        const roomRef = ref(db, `rooms/${roomCode}`);
        return onValue(roomRef, (snapshot) => {
            if (!snapshot.exists()) { setIsError(true); return; }
            const data = snapshot.val();
            setRoomData(data);
            if (data.players && data.players[user.uid]) {
                setJoined(true);
                setPlayerData(data.players[user.uid]);
            } else { setJoined(false); }
        });
    }, [roomCode, user]);

    // Gyroscope Effect Fix
    useEffect(() => {
        if (roomData?.gameType === 'steering' && roomData?.status === 'playing' && sensorsActive) {
            const handleMotion = (e) => {
                if (e.beta || e.gamma) {
                    update(ref(db, `rooms/${roomCode}/players/${user.uid}/gyro`), {
                        beta: e.beta,
                        gamma: e.gamma
                    });
                }
            };
            window.addEventListener('deviceorientation', handleMotion);
            return () => window.removeEventListener('deviceorientation', handleMotion);
        }
    }, [roomData?.gameType, roomData?.status, sensorsActive, roomCode, user]);

    // Shake It Logic
    useEffect(() => {
        if (roomData?.gameType === 'shake-it' && roomData?.status === 'playing' && sensorsActive) {
            let lastShake = 0;
            const handleMotion = (e) => {
                const acc = e.accelerationIncludingGravity;
                if (!acc) return;
                const totalAcc = Math.abs(acc.x || 0) + Math.abs(acc.y || 0) + Math.abs(acc.z || 0);

                if (totalAcc > 25 && Date.now() - lastShake > 100) {
                    lastShake = Date.now();
                    const current = playerData?.shakeCount || 0;
                    if (current < 100) {
                        update(ref(db, `rooms/${roomCode}/players/${user.uid}`), { shakeCount: current + 1 });
                    }
                    if (navigator.vibrate) navigator.vibrate(40);
                }
            };
            window.addEventListener('devicemotion', handleMotion);
            return () => window.removeEventListener('devicemotion', handleMotion);
        }
    }, [roomData?.gameType, roomData?.status, sensorsActive, roomCode, user, playerData?.shakeCount]);

    const requestSensorPermission = async () => {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
                const permission = await DeviceOrientationEvent.requestPermission();
                if (permission === 'granted') setSensorsActive(true);
            } catch (e) { console.error(e); }
        } else {
            setSensorsActive(true); // Browsers that don't need permission
        }
        if (navigator.vibrate) navigator.vibrate(100);
    };

    const handleJoin = (e) => {
        e.preventDefault();
        if (!name.trim() || !user) return;
        const colors = ['#00f2ff', '#7000ff', '#ff00aa', '#00ff44', '#ffaa00', '#f1c40f', '#e67e22', '#e74c3c'];
        update(ref(db, `rooms/${roomCode}/players/${user.uid}`), {
            name: name.trim(),
            color: colors[Math.floor(Math.random() * colors.length)],
            joinedAt: Date.now(), score: 0, lastClick: 0
        });
        setJoined(true);
        requestSensorPermission();
    };

    const handleAction = (type, val) => {
        if (roomData?.status !== 'playing' || !user) return;
        if (navigator.vibrate) navigator.vibrate(60);

        if (roomData.gameType === 'fast-click') {
            update(ref(db, `rooms/${roomCode}/players/${user.uid}`), {
                lastClick: Date.now(),
                score: (playerData?.score || 0) + 1
            });
        } else if (roomData.gameType === 'reaction-time') {
            if (!playerData?.lastClick) update(ref(db, `rooms/${roomCode}/players/${user.uid}`), { lastClick: Date.now() });
        } else if (roomData.gameType === 'simon-says') {
            update(ref(db, `rooms/${roomCode}/players/${user.uid}`), { lastMove: val, lastClick: Date.now() });
        } else if (roomData.gameType === 'quick-draw') {
            if (roomData.gamePhase === 'voting') {
                update(ref(db, `rooms/${roomCode}/players/${user.uid}`), { vote: val }); // val is the id of player voted
            }
        } else if (roomData.gameType === 'hot-potato') {
            if (roomData.bombHolderId === user.uid) {
                const other = Object.keys(roomData.players).filter(id => id !== user.uid);
                if (other.length > 0) update(ref(db, `rooms/${roomCode}`), { bombHolderId: other[Math.floor(Math.random() * other.length)] });
            }
        } else if (roomData.gameType === 'tug-of-war') {
            update(ref(db, `rooms/${roomCode}/players/${user.uid}`), { score: (playerData?.score || 0) + 1 });
        } else if (roomData.gameType === 'lava-jump') {
            // Instant jump action
            update(ref(db, `rooms/${roomCode}/players/${user.uid}`), { action: 'jump' });
            setTimeout(() => {
                update(ref(db, `rooms/${roomCode}/players/${user.uid}`), { action: 'idle' });
            }, 500);
        }
    };

    // Canvas Draw
    const startDrawing = (e) => { setIsDrawing(true); draw(e); };
    const draw = (e) => {
        if (!isDrawing || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX || (e.touches ? e.touches[0].clientX : 0);
        const clientY = e.clientY || (e.touches ? e.touches[0].clientY : 0);
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.strokeStyle = '#000'; ctx.lineTo(x, y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y);
    };
    const stopDrawing = () => {
        setIsDrawing(false);
        if (canvasRef.current && user) update(ref(db, `rooms/${roomCode}/players/${user.uid}`), { drawing: canvasRef.current.toDataURL() });
    };

    if (isError) return <div className="controller-view center-all"><div className="glass-panel error-panel"><h2>ROOM NOT FOUND</h2><button className="neon-button" onClick={() => setView('landing')}>EXIT</button></div></div>;

    const globalScore = roomData?.globalScores?.[user.uid] || 0;

    return (
        <div className="controller-view center-all">
            <AnimatePresence mode="wait">
                {!joined ? (
                    <motion.div key="join" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="glass-panel setup-panel">
                        <User size={64} className="neon-text" />
                        <h2>CHOOSE NICKNAME</h2>
                        <form onSubmit={handleJoin}>
                            <input className="controller-input" value={name} onChange={e => setName(e.target.value)} placeholder="Player Name" autoFocus />
                            <button className="neon-button full" type="submit">ENTER LOBBY</button>
                        </form>
                    </motion.div>
                ) : (
                    <motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="main-controller">
                        {roomData?.status === 'lobby' ? (
                            <div className="glass-panel lobby-info">
                                <div className="player-badge" style={{ borderColor: playerData?.color }}>
                                    <span className="p-name">{playerData?.name}</span>
                                    <span className="p-score">{globalScore} PTS</span>
                                </div>
                                <ShieldCheck size={80} color="#00ff44" className="success-icon" />
                                <h2>CONNECTED!</h2>
                                <p>Get ready for the next game...</p>

                                {!sensorsActive && (
                                    <button className="neon-button mini sensor-btn" onClick={requestSensorPermission}>
                                        <Compass size={18} /> ENABLE MOTION
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="game-interface center-all">
                                {roomData.gameType === 'fast-click' && (
                                    <motion.button whileTap={{ scale: 0.9 }} className="action-circle fast-click" onClick={handleAction}>
                                        TAP!
                                        <span className="sub">{playerData?.score || 0}</span>
                                    </motion.button>
                                )}

                                {roomData.gameType === 'reaction-time' && (
                                    <button className={`action-circle reaction ${roomData.gamePhase}`} onClick={handleAction} disabled={roomData.gamePhase !== 'tap'}>
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
                                    <div className="draw-interface glass-panel">
                                        {roomData.gamePhase === 'drawing' ? (
                                            <>
                                                <h3>DRAW: {roomData.currentWord}</h3>
                                                <div className="canvas-wrapper">
                                                    <canvas ref={canvasRef} width={300} height={400} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />
                                                </div>
                                                <button className="neon-button secondary mini" onClick={() => canvasRef.current.getContext('2d').clearRect(0, 0, 300, 400)}>CLEAR</button>
                                            </>
                                        ) : roomData.gamePhase === 'voting' ? (
                                            <div className="voting-ui center-all">
                                                <h3>VOTE FOR BEST!</h3>
                                                <div className="vote-list">
                                                    {Object.entries(roomData.players)
                                                        .filter(([id]) => id !== user.uid)
                                                        .map(([id, p]) => (
                                                            <button
                                                                key={id}
                                                                className={`neon-button mini ${playerData?.vote === id ? 'active' : ''}`}
                                                                onClick={() => handleAction('quick-draw', id)}
                                                                style={{ borderColor: p.color, width: '100%' }}
                                                            >
                                                                {p.name}
                                                            </button>
                                                        ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="results-waiting center-all">
                                                <Trophy size={64} className="neon-text" />
                                                <h3>STAY TUNED!</h3>
                                                <p>Checking the judges...</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {roomData.gameType === 'hot-potato' && (
                                    <div className={`bomb-ui ${roomData.bombHolderId === user.uid ? 'active' : ''}`}>
                                        {roomData.bombHolderId === user.uid ? (
                                            <div className="task-area">
                                                <Bomb size={120} className="shake-anim" />
                                                <h2>YOU HAVE IT!</h2>
                                                <button className="neon-button full" onClick={handleAction}>PASS THE BOMB!!!</button>
                                            </div>
                                        ) : (
                                            <div className="safe-area">
                                                <ShieldCheck size={100} />
                                                <h2>SAFE</h2>
                                                <p>For now...</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {roomData.gameType === 'steering' && (
                                    <div className="steering-ui">
                                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 4, ease: "linear" }}>
                                            <Compass size={150} className="neon-text" />
                                        </motion.div>
                                        <h2>TILT TO MOVE</h2>
                                        <p>Watch the big screen!</p>
                                        {!sensorsActive && <button className="neon-button" onClick={requestSensorPermission}>ENABLE SENSORS</button>}
                                    </div>
                                )}

                                {roomData.gameType === 'shake-it' && (
                                    <div className="shake-ui center-all">
                                        <motion.div
                                            animate={{
                                                rotate: [0, 10, -10, 0],
                                                scale: [1, 1.1, 1]
                                            }}
                                            transition={{ repeat: Infinity, duration: 0.2 }}
                                        >
                                            <Zap size={150} color="#ffaa00" />
                                        </motion.div>
                                        <h2>SHAKE IT!!!</h2>
                                        <div className="progress-bar-container">
                                            <div className="progress-fill" style={{ width: `${playerData?.shakeCount || 0}%` }} />
                                        </div>
                                        <p className="neon-text cd">{playerData?.shakeCount || 0}%</p>
                                        {!sensorsActive && <button className="neon-button" style={{ marginTop: 20 }} onClick={requestSensorPermission}>ENABLE SENSORS</button>}
                                    </div>
                                )}

                                {roomData.gameType === 'tug-of-war' && (
                                    <div className="tug-ui center-all">
                                        <div className={`team-indicator ${playerData?.team}`}>TEAM {playerData?.team?.toUpperCase()}</div>
                                        <motion.button
                                            whileTap={{ scale: 0.9 }}
                                            className={`action-circle pull-btn ${playerData?.team}`}
                                            onClick={handleAction}
                                        >
                                            PULL!!!
                                        </motion.button>
                                        <p>Tap as fast as you can to win!</p>
                                    </div>
                                )}

                                {roomData.gameType === 'lava-jump' && (
                                    <div className="lava-ui center-all">
                                        <motion.button
                                            whileTap={{ scale: 0.8 }}
                                            className="action-circle jump-btn"
                                            onClick={handleAction}
                                        >
                                            JUMP!
                                        </motion.button>
                                        <p>Watch the screen and jump over fire!</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                .controller-view { width: 100vw; height: 100vh; padding: 20px; position: relative; }
                .setup-panel, .error-panel, .lobby-info { width: 100%; max-width: 400px; padding: 40px; text-align: center; display: flex; flex-direction: column; gap: 20px; align-items: center; }
                
                .controller-input { background: rgba(255,255,255,0.1); border: 2px solid var(--glass-border); padding: 20px; border-radius: 15px; color: white; width: 100%; text-align: center; font-size: 1.5rem; font-weight: 800; outline: none; }
                .controller-input:focus { border-color: var(--accent-primary); }
                .full { width: 100%; }

                .player-badge { border: 2px solid white; padding: 10px 20px; border-radius: 15px; display: flex; justify-content: space-between; width: 100%; font-weight: 800; margin-bottom: 20px; }
                .success-icon { filter: drop-shadow(0 0 10px #00ff44); }
                .sensor-btn { margin-top: 20px; font-size: 0.8rem; padding: 10px 20px; }

                .action-circle { width: 280px; height: 280px; border-radius: 50%; border: none; font-size: 3rem; font-weight: 900; color: white; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 15px 40px rgba(0,0,0,0.5); }
                .fast-click { background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary)); }
                .fast-click .sub { font-size: 1.5rem; opacity: 0.7; }
                
                .reaction.starting, .reaction.waiting { background: #500; opacity: 0.5; }
                .reaction.tap { background: #080; animation: glowPulse 0.5s infinite; }
                @keyframes glowPulse { 0% { box-shadow: 0 0 0 rgba(0,255,0,0); } 50% { box-shadow: 0 0 30px rgba(0,255,0,0.6); } 100% { box-shadow: 0 0 0 rgba(0,255,0,0); } }

                .simon-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; width: 300px; height: 300px; }
                .simon-pad { border-radius: 20px; border: none; box-shadow: 0 5px 15px rgba(0,0,0,0.3); }

                .draw-interface { padding: 15px; background: white; color: black; border-radius: 30px; width: 100%; max-width: 320px; min-height: 450px; }
                .voting-ui { width: 100%; gap: 10px; }
                .vote-list { display: flex; flex-direction: column; gap: 10px; width: 100%; margin-top: 20px; }
                .neon-button.active { background: var(--accent-primary); color: white; }
                .canvas-wrapper { border: 2px solid #ddd; background: #fff; margin: 10px 0; border-radius: 15px; overflow: hidden; touch-action: none; }
                canvas { width: 100%; cursor: crosshair; }

                .bomb-ui { transition: all 0.3s; padding: 40px; border-radius: 40px; width: 100%; max-width: 350px; }
                .bomb-ui.active { background: rgba(255,0,0,0.2); border: 2px solid #f00; }
                .shake-anim { animation: shake 0.2s infinite; }
                @keyframes shake { 0%{transform:rotate(0)} 25%{transform:rotate(3deg)} 75%{transform:rotate(-3deg)} 100%{transform:rotate(0)} }
                
                .steering-ui { text-align: center; }
                .steering-ui h2 { margin-top: 30px; }

                .shake-ui { text-align: center; }
                .progress-bar-container { width: 100%; height: 30px; background: rgba(0,0,0,0.3); border-radius: 15px; margin: 30px 0; border: 2px solid var(--glass-border); overflow: hidden; }
                .progress-fill { height: 100%; background: linear-gradient(90deg, #ffaa00, #ff00aa); transition: width 0.1s; }
                .cd { font-size: 2rem; font-weight: 900; }

                .team-indicator { font-size: 1.5rem; font-weight: 900; margin-bottom: 20px; padding: 10px 30px; border-radius: 15px; }
                .team-indicator.red { background: rgba(255,0,0,0.2); color: #ff4444; border: 2px solid #ff4444; }
                .team-indicator.blue { background: rgba(0,0,255,0.2); color: #4444ff; border: 2px solid #4444ff; }
                
                .pull-btn.red { background: #ff4444; box-shadow: 0 0 30px rgba(255,68,68,0.5); }
                .pull-btn.blue { background: #4444ff; box-shadow: 0 0 30px rgba(68,68,255,0.5); }
                
                .jump-btn { background: #ff8800; box-shadow: 0 0 30px rgba(255,136,0,0.5); }
            `}</style>
        </div>
    );
};

export default ControllerView;
