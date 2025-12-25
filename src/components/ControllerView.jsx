import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import { ref, update, onValue } from 'firebase/database';
import { User, CheckCircle, AlertCircle, Zap, Palette, Bomb, Compass, ListChecks, ShieldCheck, Trophy, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Crosshair, Heart, Car, Mountain, BookOpen, Brain, Camera, Upload, Smile, Calculator, Ghost as Shark, Skull } from 'lucide-react';

const HoldButton = ({ children, className, onAction }) => {
    const timer = useRef(null);
    const start = () => {
        onAction();
        timer.current = setInterval(onAction, 100);
    };
    const stop = () => {
        if (timer.current) clearInterval(timer.current);
        timer.current = null;
    };
    return (
        <button
            className={className}
            onMouseDown={start} onMouseUp={stop} onMouseLeave={stop}
            onTouchStart={start} onTouchEnd={stop}
        >
            {children}
        </button>
    );
};

const ControllerView = ({ roomCode, user, setView }) => {
    const [name, setName] = useState('');
    const [joined, setJoined] = useState(false);
    const [roomData, setRoomData] = useState(null);
    const [playerData, setPlayerData] = useState(null);
    const [isError, setIsError] = useState(false);
    const [avatar, setAvatar] = useState(null);
    const [sensorsActive, setSensorsActive] = useState(false);
    const [loveSequence, setLoveSequence] = useState([]);
    const [loveStep, setLoveStep] = useState(0);
    const [memoryInput, setMemoryInput] = useState([]);

    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        if (!roomCode || !user) return;
        const roomRef = ref(db, `rooms/${roomCode}`);

        const cleanup = () => {
            // When player unmounts/leaves, clear their avatar and data
            if (user?.uid) {
                update(ref(db, `rooms/${roomCode}/players/${user.uid}`), {
                    avatar: null,
                    online: false
                });
            }
        };

        const substribe = onValue(roomRef, (snapshot) => {
            if (!snapshot.exists()) { setIsError(true); return; }
            const data = snapshot.val();
            setRoomData(data);
            if (data.players && data.players[user.uid]) {
                setJoined(true);
                setPlayerData(data.players[user.uid]);
            } else { setJoined(false); }
        });

        return () => {
            substribe();
            cleanup();
        };
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

    // Love Arrows sequence generation
    useEffect(() => {
        if (roomData?.gameType === 'love-arrows' && roomData?.status === 'playing' && loveSequence.length === 0) {
            generateLoveSequence();
        }
    }, [roomData?.gameType, roomData?.status]);

    const generateLoveSequence = () => {
        const seq = [];
        for (let i = 0; i < 4; i++) seq.push(Math.floor(Math.random() * 4));
        setLoveSequence(seq);
        setLoveStep(0);
    };

    // Reset memory input when round changes
    useEffect(() => {
        if (roomData?.gamePhase === 'showing') {
            setMemoryInput([]);
            update(ref(db, `rooms/${roomCode}/players/${user.uid}`), { memoryStatus: null });
        }
    }, [roomData?.gamePhase]);

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
            avatar: avatar,
            joinedAt: Date.now(), score: 0, lastClick: 0
        });
        setJoined(true);
        requestSensorPermission();
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    // Create canvas for compression
                    const canvas = document.createElement('canvas');
                    const MAX_SIZE = 100; // Small but enough for icons
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Compress to JPG for smaller size than PNG
                    const compressed = canvas.toDataURL('image/jpeg', 0.6);
                    setAvatar(compressed);
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAction = (type, val) => {
        if (!user) return;
        if (navigator.vibrate) navigator.vibrate(60);

        if (roomData?.status === 'lobby') {
            const step = 5;
            let nextX = playerData?.lobbyX ?? Math.random() * 80 + 10;
            let nextY = playerData?.lobbyY ?? Math.random() * 80 + 10;
            if (val === 0) nextY = Math.max(0, nextY - step);
            if (val === 1) nextY = Math.min(100, nextY + step);
            if (val === 2) nextX = Math.max(0, nextX - step);
            if (val === 3) nextX = Math.min(100, nextX + step);
            update(ref(db, `rooms/${roomCode}/players/${user.uid}`), { lobbyX: nextX, lobbyY: nextY });
            return;
        }

        if (type === 'reaction') {
            const reactionId = Date.now();
            update(ref(db, `rooms/${roomCode}/reactions/${reactionId}`), {
                emoji: val,
                sender: playerData?.name || '?',
                color: playerData?.color || '#fff'
            });
            return;
        }

        if (type === 'set-prop') {
            update(ref(db, `rooms/${roomCode}/players/${user.uid}`), { prop: val });
            return;
        }

        if (type === 'boss-attack' || type === 'boss-heal') {
            const actionId = Date.now() + Math.random();
            update(ref(db, `rooms/${roomCode}/bossActions/${actionId}`), {
                playerId: user.uid,
                type: type === 'boss-attack' ? 'attack' : 'heal'
            });
            return;
        }

        if (roomData?.status !== 'playing') return;

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
                if (other.length > 0) {
                    update(ref(db, `rooms/${roomCode}`), { bombHolderId: other[Math.floor(Math.random() * other.length)] });
                    if (navigator.vibrate) navigator.vibrate([50, 20, 50]);
                }
            }
        } else if (roomData.gameType === 'math-race') {
            const answer = parseInt(val);
            if (answer === roomData.correctAnswer) {
                update(ref(db, `rooms/${roomCode}/players/${user.uid}`), {
                    score: (playerData?.score || 0) + 1,
                    distance: (playerData?.distance || 0) + 5
                });
                if (navigator.vibrate) navigator.vibrate(100);
            } else {
                if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
            }
        } else if (roomData.gameType === 'shark-attack') {
            const step = roomData.sharkId === user.uid ? 8 : 4;
            let nextX = playerData?.posX ?? 50;
            let nextY = playerData?.posY ?? 50;
            if (val === 0) nextY = Math.max(0, nextY - step);
            if (val === 1) nextY = Math.min(100, nextY + step);
            if (val === 2) nextX = Math.max(0, nextX - step);
            if (val === 3) nextX = Math.min(100, nextX + step);
            update(ref(db, `rooms/${roomCode}/players/${user.uid}`), { posX: nextX, posY: nextY });
        } else if (roomData.gameType === 'tug-of-war') {
            update(ref(db, `rooms/${roomCode}/players/${user.uid}`), { score: (playerData?.score || 0) + 1 });
        } else if (roomData.gameType === 'lava-jump') {
            update(ref(db, `rooms/${roomCode}/players/${user.uid}`), { action: 'jump' });
            setTimeout(() => {
                update(ref(db, `rooms/${roomCode}/players/${user.uid}`), { action: 'idle' });
            }, 500);
        } else if (roomData.gameType === 'love-arrows') {
            if (val === loveSequence[loveStep]) {
                const nextStep = loveStep + 1;
                if (nextStep >= loveSequence.length) {
                    update(ref(db, `rooms/${roomCode}/players/${user.uid}`), {
                        score: (playerData?.score || 0) + 1,
                        lastMove: val,
                        lastClick: Date.now()
                    });
                    generateLoveSequence();
                } else {
                    setLoveStep(nextStep);
                    update(ref(db, `rooms/${roomCode}/players/${user.uid}`), { lastMove: val });
                }
            } else {
                // Wrong move: reset sequence
                setLoveStep(0);
                if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
            }
        } else if (roomData.gameType === 'crab-hunt') {
            const step = 5;
            let nextX = playerData?.posX || 50;
            let nextY = playerData?.posY || 50;
            if (val === 0) nextY = Math.max(0, nextY - step);
            if (val === 1) nextY = Math.min(100, nextY + step);
            if (val === 2) nextX = Math.max(0, nextX - step);
            if (val === 3) nextX = Math.min(100, nextX + step);

            const updates = { posX: nextX, posY: nextY };
            if (type === 'smash') updates.action = 'smash';
            update(ref(db, `rooms/${roomCode}/players/${user.uid}`), updates);
        } else if (roomData.gameType === 'social-climbers') {
            update(ref(db, `rooms/${roomCode}/players/${user.uid}`), {
                climbPos: (playerData?.climbPos || 0) + 1,
                lastClick: Date.now()
            });
        } else if (roomData.gameType === 'neon-racer') {
            const updates = {};
            if (type === 'move') {
                const currentLane = playerData?.lane ?? 1;
                if (val === 2) updates.lane = Math.max(0, currentLane - 1);
                if (val === 3) updates.lane = Math.min(2, currentLane + 1);
            } else {
                updates.distance = (playerData?.distance || 0) + 1;
            }
            update(ref(db, `rooms/${roomCode}/players/${user.uid}`), updates);
        } else if (roomData.gameType === 'book-squirm') {
            const step = 8;
            let nextX = playerData?.posX || 50;
            if (val === 2) nextX = Math.max(0, nextX - step);
            if (val === 3) nextX = Math.min(100, nextX + step);
            update(ref(db, `rooms/${roomCode}/players/${user.uid}`), { posX: nextX });
        } else if (roomData.gameType === 'memory-match') {
            if (roomData.gamePhase !== 'input' || playerData?.memoryStatus) return;
            const nextInput = [...memoryInput, val];
            setMemoryInput(nextInput);

            const targetSeq = roomData.currentSequence || [];
            // Check if wrong
            if (val !== targetSeq[nextInput.length - 1]) {
                update(ref(db, `rooms/${roomCode}/players/${user.uid}`), { memoryStatus: 'fail' });
                if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
            } else if (nextInput.length === targetSeq.length) {
                update(ref(db, `rooms/${roomCode}/players/${user.uid}`), {
                    memoryStatus: 'success',
                    score: (playerData?.score || 0) + 1
                });
                if (navigator.vibrate) navigator.vibrate(100);
            }
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
                        <form onSubmit={handleJoin} className="setup-form">
                            <div className="avatar-picker-section">
                                <label className="avatar-preview-box glass-panel">
                                    {avatar ? (
                                        <img src={avatar} alt="Avatar" className="avatar-img" />
                                    ) : (
                                        <Camera size={40} opacity={0.5} />
                                    )}
                                    <input type="file" accept="image/*" onChange={handleAvatarChange} hidden />
                                    <div className="upload-badge"><Upload size={14} /></div>
                                </label>
                                <p className="hint">FOTOĞRAF EKLE</p>
                            </div>
                            <input className="controller-input" value={name} onChange={e => setName(e.target.value)} placeholder="Takma Adın" autoFocus />
                            <button className="neon-button full" type="submit">LOBİYE GİR</button>
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
                                <p>Move your avatar in the lobby!</p>
                                <div className="arrow-controls lobby-arrows">
                                    <HoldButton className="arrow-btn" onAction={() => handleAction('move', 0)}><ArrowUp /></HoldButton>
                                    <div className="mid-arrows">
                                        <HoldButton className="arrow-btn" onAction={() => handleAction('move', 2)}><ArrowLeft /></HoldButton>
                                        <div className="lobby-icon-center">{playerData?.avatar ? <img src={playerData.avatar} style={{ width: '100%', height: '100%', borderRadius: '50%' }} /> : <User />}</div>
                                        <HoldButton className="arrow-btn" onAction={() => handleAction('move', 3)}><ArrowRight /></HoldButton>
                                    </div>
                                    <HoldButton className="arrow-btn" onAction={() => handleAction('move', 1)}><ArrowDown /></HoldButton>
                                </div>

                                <div className="lobby-actions-row">
                                    {!sensorsActive && (
                                        <button className="neon-button mini sensor-btn" onClick={requestSensorPermission}>
                                            <Compass size={18} /> ENABLE MOTION
                                        </button>
                                    )}
                                    <button className="neon-button mini react-btn" onClick={() => handleAction('reaction', '🔥')}>
                                        <Smile size={18} /> REACTION
                                    </button>
                                </div>

                                <div className="prop-chooser-row">
                                    <button className="prop-btn" onClick={() => handleAction('set-prop', 'hat')}>🎩</button>
                                    <button className="prop-btn" onClick={() => handleAction('set-prop', 'cool')}>😎</button>
                                    <button className="prop-btn" onClick={() => handleAction('set-prop', 'crown')}>👑</button>
                                    <button className="prop-btn" onClick={() => handleAction('set-prop', null)}>❌</button>
                                </div>
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

                                {roomData.gameType === 'love-arrows' && (
                                    <div className="love-ui center-all">
                                        <div className="sequence-display">
                                            {loveSequence.map((dir, i) => (
                                                <div key={i} className={`arrow-hint ${i < loveStep ? 'done' : ''} ${i === loveStep ? 'active' : ''}`}>
                                                    {dir === 0 && <ArrowUp />}
                                                    {dir === 1 && <ArrowDown />}
                                                    {dir === 2 && <ArrowLeft />}
                                                    {dir === 3 && <ArrowRight />}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="arrow-controls">
                                            <button className="arrow-btn up" onClick={() => handleAction('move', 0)}><ArrowUp size={40} /></button>
                                            <div className="mid-arrows">
                                                <button className="arrow-btn left" onClick={() => handleAction('move', 2)}><ArrowLeft size={40} /></button>
                                                <button className="arrow-btn right" onClick={() => handleAction('move', 3)}><ArrowRight size={40} /></button>
                                            </div>
                                            <button className="arrow-btn down" onClick={() => handleAction('move', 1)}><ArrowDown size={40} /></button>
                                        </div>
                                    </div>
                                )}

                                {roomData.gameType === 'crab-hunt' && (
                                    <div className="crab-ui center-all">
                                        <div className="role-tag">{playerData?.role?.toUpperCase()}</div>
                                        <div className="arrow-controls">
                                            <HoldButton className="arrow-btn up" onAction={() => handleAction('move', 0)}><ArrowUp size={40} /></HoldButton>
                                            <div className="mid-arrows">
                                                <HoldButton className="arrow-btn left" onAction={() => handleAction('move', 2)}><ArrowLeft size={40} /></HoldButton>
                                                {playerData?.role === 'fisher' ? (
                                                    <button className="smash-btn" onClick={() => handleAction('smash')}><Crosshair size={50} /></button>
                                                ) : <div style={{ width: 80 }} />}
                                                <HoldButton className="arrow-btn right" onAction={() => handleAction('move', 3)}><ArrowRight size={40} /></HoldButton>
                                            </div>
                                            <HoldButton className="arrow-btn down" onAction={() => handleAction('move', 1)}><ArrowDown size={40} /></HoldButton>
                                        </div>
                                        <p>{playerData?.role === 'fisher' ? 'Move target and SMASH crabs!' : 'RUN AWAY from the fisherman!'}</p>
                                        {playerData?.status === 'dead' && (
                                            <div className="dead-overlay center-all">
                                                <Skull size={100} />
                                                <h2>YOU ARE SMASHED!</h2>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {roomData.gameType === 'social-climbers' && (
                                    <div className="climb-ui center-all">
                                        <motion.button
                                            whileTap={{ scale: 0.9 }}
                                            className="action-circle climb-btn"
                                            onClick={handleAction}
                                            disabled={roomData.storm}
                                        >
                                            CLIMB!
                                        </motion.button>
                                        {roomData.storm && <div className="storm-warning"><AlertCircle color="#ff0044" /> STORM: STOP!</div>}
                                        <div className="progress-mini">
                                            <div className="fill" style={{ width: `${playerData?.climbPos || 0}%` }} />
                                        </div>
                                    </div>
                                )}

                                {roomData.gameType === 'neon-racer' && (
                                    <div className="racer-ui center-all">
                                        <div className="racer-controls">
                                            <HoldButton className="racer-btn side" onAction={() => handleAction('move', 2)}><ArrowLeft size={40} /></HoldButton>
                                            <HoldButton className="racer-btn main" onAction={() => handleAction('gas')}>
                                                <Zap size={50} />
                                                GAS!
                                            </HoldButton>
                                            <HoldButton className="racer-btn side" onAction={() => handleAction('move', 3)}><ArrowRight size={40} /></HoldButton>
                                        </div>
                                        <div className="dist-track">
                                            <div className="fill" style={{ width: `${playerData?.distance || 0}%` }} />
                                        </div>
                                    </div>
                                )}

                                {roomData.gameType === 'book-squirm' && (
                                    <div className="book-ui center-all">
                                        <div className="arrow-controls side-only">
                                            <HoldButton className="arrow-btn" onAction={() => handleAction('move', 2)}><ArrowLeft size={50} /></HoldButton>
                                            <BookOpen size={100} className="neon-text" />
                                            <HoldButton className="arrow-btn" onAction={() => handleAction('move', 3)}><ArrowRight size={50} /></HoldButton>
                                        </div>
                                        <div className="pos-bar">
                                            <div className="indicator" style={{ left: `${playerData?.posX || 50}%` }} />
                                        </div>
                                        <p>STAY IN THE HOLE!</p>
                                    </div>
                                )}

                                {roomData.gameType === 'math-race' && (
                                    <div className="math-ui center-all">
                                        <Calculator size={80} color="#00f2ff" />
                                        <div className="simon-grid">
                                            {(roomData.choices || []).map((choice, i) => (
                                                <button
                                                    key={choice}
                                                    className="simon-pad math-btn"
                                                    onClick={() => handleAction('answer', choice)}
                                                >
                                                    {choice}
                                                </button>
                                            ))}
                                        </div>
                                        <p>CHOOSE CORRECT ANSWER!</p>
                                    </div>
                                )}

                                {roomData.gameType === 'shark-attack' && (
                                    <div className="shark-ui center-all">
                                        <h2>{roomData.sharkId === user.uid ? 'YOU ARE THE SHARK!' : 'SURVIVE!'}</h2>
                                        <p>{roomData.sharkId === user.uid ? 'Hunt the fish!' : 'Avoid the shark!'}</p>
                                        <div className="arrow-controls">
                                            <HoldButton className="arrow-btn" onAction={() => handleAction('move', 0)}><ArrowUp size={40} /></HoldButton>
                                            <div className="mid-arrows">
                                                <HoldButton className="arrow-btn" onAction={() => handleAction('move', 2)}><ArrowLeft size={40} /></HoldButton>
                                                <div className="lobby-icon-center">{roomData.sharkId === user.uid ? <Shark size={40} /> : <ShieldCheck size={40} />}</div>
                                                <HoldButton className="arrow-btn" onAction={() => handleAction('move', 3)}><ArrowRight size={40} /></HoldButton>
                                            </div>
                                            <HoldButton className="arrow-btn" onAction={() => handleAction('move', 1)}><ArrowDown size={40} /></HoldButton>
                                        </div>
                                        {playerData?.eliminated && <div className="dead-overlay center-all"><h2>ELIMINATED!</h2></div>}
                                    </div>
                                )}

                                {roomData.gameType === 'boss-battle' && (
                                    <div className="boss-ui center-all">
                                        <div className="boss-header">
                                            <Skull size={60} color="#ff0044" />
                                            <h2>VOID GUARDIAN</h2>
                                        </div>
                                        <div className="boss-actions-grid">
                                            <motion.button
                                                whileTap={{ scale: 0.9 }}
                                                className="boss-btn attack"
                                                onClick={() => handleAction('boss-attack')}
                                            >
                                                <Target size={40} />
                                                <span>ATTACK</span>
                                            </motion.button>
                                            <motion.button
                                                whileTap={{ scale: 0.9 }}
                                                className="boss-btn heal"
                                                onClick={() => handleAction('boss-heal')}
                                            >
                                                <Heart size={40} />
                                                <span>HEAL TEAM</span>
                                            </motion.button>
                                        </div>
                                        <p>TEAM ENERGY: {roomData.teamEnergy}%</p>
                                    </div>
                                )}

                                {roomData.gameType === 'memory-match' && (
                                    <div className="memory-ui center-all">
                                        <h3>{roomData.gamePhase === 'showing' ? 'MEMORIZE!' : 'INPUT NOW!'}</h3>
                                        <div className="simon-grid">
                                            {['#ff4444', '#44ff44', '#4444ff', '#ffff44'].map((c, i) => (
                                                <button
                                                    key={i}
                                                    className="simon-pad"
                                                    style={{ backgroundColor: c, opacity: roomData.gamePhase === 'input' ? 1 : 0.3 }}
                                                    onClick={() => handleAction('input', i)}
                                                    disabled={roomData.gamePhase !== 'input' || playerData?.memoryStatus}
                                                />
                                            ))}
                                        </div>
                                        <div className="input-progress">
                                            {memoryInput.map((_, i) => <div key={i} className="dot active" />)}
                                            {Array(Math.max(0, (roomData.currentSequence?.length || 0) - memoryInput.length)).fill(0).map((_, i) => <div key={i} className="dot" />)}
                                        </div>
                                    </div>
                                )}

                                {roomData.gameType === 'math-race' && (
                                    <div className="math-ui center-all">
                                        <Calculator size={80} color="#00f2ff" />
                                        <div className="simon-grid">
                                            {(roomData.choices || []).map((choice, i) => (
                                                <button
                                                    key={i}
                                                    className="simon-pad math-btn"
                                                    onClick={() => handleAction('answer', choice)}
                                                >
                                                    {choice}
                                                </button>
                                            ))}
                                        </div>
                                        <p>CHOOSE CORRECT ANSER!</p>
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
                .setup-form { width: 100%; display: flex; flex-direction: column; gap: 20px; }
                
                .avatar-picker-section { display: flex; flex-direction: column; align-items: center; gap: 10px; margin-bottom: 10px; }
                .avatar-preview-box { width: 100px; height: 100px; border-radius: 30px; border: 3px dashed rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; position: relative; cursor: pointer; overflow: hidden; transition: all 0.3s; background: rgba(255,255,255,0.05); }
                .avatar-img { width: 100%; height: 100%; object-fit: cover; }
                .upload-badge { position: absolute; bottom: 5px; right: 5px; background: var(--accent-primary); color: black; padding: 4px; border-radius: 8px; display: flex; align-items: center; justify-content: center; z-index: 2; }
                .avatar-picker-section .hint { font-size: 0.7rem; font-weight: 800; color: var(--text-dim); letter-spacing: 1px; }

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

                .arrow-controls { display: flex; flex-direction: column; align-items: center; gap: 10px; margin: 20px 0; }
                .mid-arrows { display: flex; gap: 10px; align-items: center; }
                .arrow-btn { width: 80px; height: 80px; border-radius: 20px; border: 2px solid var(--glass-border); background: rgba(255,255,255,0.1); color: white; display: flex; align-items: center; justify-content: center; }
                .arrow-btn:active { background: var(--accent-primary); color: black; }
                
                .sequence-display { display: flex; gap: 15px; margin-bottom: 20px; }
                .arrow-hint { width: 60px; height: 60px; border-radius: 12px; border: 2px solid var(--glass-border); display: flex; align-items: center; justify-content: center; opacity: 0.3; }
                .arrow-hint.active { opacity: 1; border-color: #ff00aa; color: #ff00aa; transform: scale(1.2); box-shadow: 0 0 15px #ff00aa; }
                .arrow-hint.done { opacity: 1; border-color: #00ff44; color: #00ff44; }

                .role-tag { font-size: 1.5rem; font-weight: 900; color: var(--accent-primary); letter-spacing: 3px; }
                .smash-btn { width: 100px; height: 100px; border-radius: 50%; background: #ff4444; border: none; color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px rgba(255,68,68,0.5); }
                .dead-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.8); z-index: 100; border-radius: 40px; color: #ff4444; }

                .climb-btn { background: linear-gradient(135deg, #111, #444); border: 4px solid var(--accent-primary); box-shadow: 0 0 30px rgba(0,242,255,0.3); }
                .climb-btn:disabled { opacity: 0.3; filter: grayscale(1); }
                .storm-warning { color: #ff0044; font-weight: 800; font-size: 1.5rem; margin-top: 20px; display: flex; align-items: center; gap: 10px; }
                .progress-mini { width: 100%; height: 10px; background: rgba(0,0,0,0.3); border-radius: 5px; margin-top: 30px; overflow: hidden; }
                .progress-mini .fill { height: 100%; background: var(--accent-primary); transition: width 0.3s; }

                .racer-ui { width: 100%; gap: 30px; }
                .racer-controls { display: flex; align-items: center; gap: 20px; }
                .racer-btn { border-radius: 20px; border: 2px solid var(--glass-border); color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(255,255,255,0.1); }
                .racer-btn.side { width: 80px; height: 120px; }
                .racer-btn.main { width: 150px; height: 150px; background: linear-gradient(135deg, #00f2ff, #7000ff); font-weight: 900; font-size: 1.5rem; gap: 10px; }
                .dist-track { width: 80%; height: 10px; background: rgba(0,0,0,0.3); border-radius: 5px; overflow: hidden; }
                .dist-track .fill { height: 100%; background: #00f2ff; box-shadow: 0 0 10px #00f2ff; transition: width 0.3s; }

                .side-only { flex-direction: row; align-items: center; gap: 30px; }
                .pos-bar { width: 90%; height: 15px; background: rgba(255,255,255,0.1); border-radius: 10px; position: relative; margin-top: 20px; }
                .pos-bar .indicator { width: 30px; height: 30px; background: var(--accent-primary); border-radius: 50%; position: absolute; top: 50%; transform: translate(-50%, -50%); box-shadow: 0 0 15px var(--accent-primary); transition: left 0.2s; }

                .lobby-arrows { margin-top: 30px; scale: 1.2; }
                .lobby-icon-center { width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; color: var(--accent-primary); background: rgba(0,242,255,0.1); border-radius: 50%; }
                .lobby-actions-row { display: flex; gap: 10px; margin-top: 20px; }
                .sensor-btn { background: #ffaa00; color: black; border: none; }
                .react-btn { background: rgba(255,255,255,0.1); }
                .prop-chooser-row { display: flex; gap: 15px; margin-top: 15px; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 15px; }
                .prop-btn { font-size: 1.5rem; background: none; border: none; cursor: pointer; transition: transform 0.2s; }
                .prop-btn:active { transform: scale(1.3); }

                .input-progress { display: flex; gap: 10px; margin-top: 20px; }
                .input-progress .dot { width: 12px; height: 12px; border-radius: 50%; background: rgba(255,255,255,0.2); }
                .input-progress .dot.active { background: #00f2ff; box-shadow: 0 0 10px #00f2ff; }

                .math-btn { font-size: 2rem !important; font-weight: 900; color: white; background: rgba(255,255,255,0.1) !important; border: 2px solid var(--glass-border) !important; }
                .math-btn:active { background: var(--accent-primary) !important; color: black; }

                .boss-ui { width: 100%; gap: 30px; }
                .boss-header { display: flex; flex-direction: column; align-items: center; gap: 10px; }
                .boss-actions-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; width: 100%; }
                .boss-btn { height: 160px; border-radius: 30px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 15px; border: none; color: white; font-weight: 800; font-size: 1.2rem; }
                .boss-btn.attack { background: linear-gradient(135deg, #ff4400, #ff0044); box-shadow: 0 10px 30px rgba(255,0,68,0.4); }
                .boss-btn.heal { background: linear-gradient(135deg, #00ff44, #008822); box-shadow: 0 10px 30px rgba(0,255,68,0.3); }
            `}</style>
        </div>
    );
};

export default ControllerView;
