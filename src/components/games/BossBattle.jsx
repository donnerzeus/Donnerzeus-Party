import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase';
import { ref, update, onValue, set } from 'firebase/database';
import { Shield, Zap, Skull, Heart, Target, Trophy } from 'lucide-react';
import { sounds } from '../../utils/sounds';

const BossBattle = ({ players, roomCode, onGameOver }) => {
    const [gameState, setGameState] = useState('intro'); // intro, playing, victory, defeat
    const [bossHp, setBossHp] = useState(1000);
    const [bossMaxHp] = useState(1000);
    const [bossState, setBossState] = useState('idle'); // idle, attacking, hurt
    const [vfx, setVfx] = useState([]);
    const [teamEnergy, setTeamEnergy] = useState(100);
    const [timeLeft, setTimeLeft] = useState(60);
    const [shake, setShake] = useState(false);

    // Initial state sync to Firebase
    useEffect(() => {
        if (gameState === 'intro') {
            sounds.playStart();
            // Ensure Firebase has initial boss state for Controller
            update(ref(db, `rooms/${roomCode}`), {
                bossHp: 1000,
                teamEnergy: 100,
                gamePhase: 'starting'
            });

            const timer = setTimeout(() => {
                setGameState('playing');
                update(ref(db, `rooms/${roomCode}`), {
                    gamePhase: 'playing'
                });
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [gameState, roomCode]);

    // Timer Interval - Runs once when playing starts
    useEffect(() => {
        if (gameState !== 'playing') return;

        const timerInterval = setInterval(() => {
            setTimeLeft(t => Math.max(0, t - 1));
        }, 1000);

        return () => clearInterval(timerInterval);
    }, [gameState]);

    // Boss Attack Cycle - Dependencies: enraged state
    useEffect(() => {
        if (gameState !== 'playing') return;

        const isEnraged = bossHp < 500;
        const attackInterval = setInterval(() => {
            const attackType = Math.random() > 0.6 ? 'slam' : 'laser';
            setBossState('attacking');
            sounds.playExplosion();

            setShake(true);
            setTimeout(() => setShake(false), 500);

            setTimeout(() => {
                setBossState('idle');
                const damage = (attackType === 'slam' ? 10 : 15) * (isEnraged ? 1.5 : 1);
                setTeamEnergy(prev => {
                    const next = Math.max(0, prev - damage);
                    update(ref(db, `rooms/${roomCode}`), { teamEnergy: next });
                    return next;
                });
            }, 1000);
        }, isEnraged ? 2500 : 4000);

        return () => clearInterval(attackInterval);
    }, [gameState, bossHp < 500]); // Only resets when enraged status changes

    // Action Listener
    useEffect(() => {
        if (gameState !== 'playing') return;

        const actionsRef = ref(db, `rooms/${roomCode}/bossActions`);
        const unsubscribe = onValue(actionsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                Object.entries(data).forEach(([id, action]) => {
                    handlePlayerAction(action.playerId, action.type);
                    set(ref(db, `rooms/${roomCode}/bossActions/${id}`), null);
                });
            }
        });

        return () => unsubscribe();
    }, [gameState, roomCode]);

    useEffect(() => {
        if (gameState === 'playing') {
            if (bossHp <= 0) {
                setGameState('victory');
                sounds.playWin();
                setTimeout(() => onGameOver('team_victory'), 5000);
            } else if (teamEnergy <= 0 || timeLeft <= 0) {
                setGameState('defeat');
                sounds.playLoss();
                setTimeout(() => onGameOver(null), 5000);
            }
        }
    }, [bossHp, teamEnergy, timeLeft, gameState, onGameOver]);

    const handlePlayerAction = (playerId, type) => {
        if (type === 'attack') {
            setBossHp(prev => {
                const next = Math.max(0, prev - 15);
                update(ref(db, `rooms/${roomCode}`), { bossHp: next });
                return next;
            });
            setBossState('hurt');
            addVfx(50, 40, 'hit');
            setTimeout(() => setBossState('idle'), 200);
        } else if (type === 'heal') {
            setTeamEnergy(prev => {
                const next = Math.min(100, prev + 10);
                update(ref(db, `rooms/${roomCode}`), { teamEnergy: next });
                return next;
            });
            addVfx(50, 80, 'heal');
        }
    };

    const addVfx = (x, y, type) => {
        const id = Date.now() + Math.random();
        setVfx(prev => [...prev, { id, x, y, type }]);
        setTimeout(() => setVfx(prev => prev.filter(v => v.id !== id)), 1000);
    };

    const isEnraged = bossHp < 500;

    return (
        <div className={`boss-battle center-all ${shake ? 'screenshake' : ''} ${isEnraged ? 'enraged' : ''}`}>
            <div className="battle-hud">
                <div className="team-stats">
                    <div className="stat-item energy">
                        <Zap color="#00f2ff" size={20} />
                        <div className="bar-bg mini"><motion.div className="bar-fill" animate={{ width: `${teamEnergy}%` }} /></div>
                    </div>
                    <div className="team-label">TEAM STAMINA</div>
                </div>

                <div className="boss-stats-center">
                    <h2 className={`boss-name ${isEnraged ? 'glitch-text' : ''}`}>
                        {isEnraged ? "VOID ARCHON: OVERDRIVE" : "VOID GUARDIAN"}
                    </h2>
                    <div className="boss-hp-container">
                        <div className="bar-bg giant">
                            <motion.div
                                className={`bar-fill hp ${isEnraged ? 'enraged-bar' : ''}`}
                                animate={{ width: `${(bossHp / bossMaxHp) * 100}%` }}
                            />
                        </div>
                        <Heart size={30} color={isEnraged ? "#fff" : "#ff0044"} className="hp-icon" />
                    </div>
                </div>

                <div className="timer-badge">
                    <div className="label">TIME</div>
                    <div className="val">{timeLeft}</div>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {gameState === 'intro' ? (
                    <motion.div
                        key="intro"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 2, opacity: 0 }}
                        className="boss-intro center-all absolute-center"
                    >
                        <div className="intro-glow" />
                        <motion.div animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="boss-shadow">
                            <Skull size={250} color="#ff0044" />
                        </motion.div>
                        <h1 className="neon-text title giant">FINAL DEFIANCE</h1>
                        <p className="subtext">COOPERATE OR PERISH</p>
                    </motion.div>
                ) : gameState === 'playing' ? (
                    <div className="arena absolute-center">
                        <motion.div
                            className={`boss-entity ${bossState} ${isEnraged ? 'enraged-mode' : ''}`}
                            animate={{
                                y: bossState === 'attacking' ? [0, -30, 80, 0] : [0, 20, 0],
                                scale: bossState === 'hurt' ? 0.9 : (isEnraged ? 1.2 : 1),
                                rotate: isEnraged ? [0, 2, -2, 0] : 0
                            }}
                            transition={{ repeat: bossState === 'idle' ? Infinity : 0, duration: isEnraged ? 1 : 2 }}
                        >
                            <div className="boss-eye-glow" />
                            <Skull size={isEnraged ? 350 : 300} color={isEnraged ? '#fff' : (bossState === 'attacking' ? '#ffaa00' : '#4400aa')} />
                            <div className="boss-aura" />
                            {isEnraged && <div className="dark-fire" />}
                        </motion.div>

                        <div className="players-ring">
                            {players.map((p, i) => (
                                <motion.div
                                    key={p.id}
                                    className="player-vessel"
                                    animate={{
                                        left: `${50 + 38 * Math.cos(i * (2 * Math.PI / Math.max(1, players.length)))}%`,
                                        top: `${75 + 18 * Math.sin(i * (2 * Math.PI / Math.max(1, players.length)))}%`,
                                        scale: 1,
                                        opacity: 1
                                    }}
                                    style={{ borderColor: p.color }}
                                >
                                    <div className="p-avatar" style={{ backgroundColor: p.color }}>
                                        {p.avatar ? <img src={p.avatar} /> : p.name?.[0]}
                                    </div>
                                    <div className="p-tag" style={{ backgroundColor: p.color }}>{p.name}</div>
                                    <div className="p-glow" style={{ background: p.color }} />
                                </motion.div>
                            ))}
                        </div>

                        {vfx.map(v => (
                            <motion.div
                                key={v.id}
                                className={`vfx ${v.type}`}
                                initial={{ scale: 0, opacity: 1, x: '-50%', y: '-50%' }}
                                animate={{ scale: [1, 3], opacity: 0 }}
                                style={{ left: `${v.x}%`, top: `${v.y}%` }}
                            >
                                {v.type === 'hit' && <Zap size={100} color="#ffaa00" />}
                                {v.type === 'heal' && <Heart size={100} color="#00ff44" />}
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <motion.div
                        key="result"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`boss-result ${gameState} center-all absolute-center`}
                    >
                        <div className="result-content glass-panel center-all">
                            {gameState === 'victory' ? (
                                <>
                                    <Trophy size={180} color="#ffd700" className="glow-icon" />
                                    <h1 className="neon-text giant">GUILD VICTORIOUS</h1>
                                    <p>The Void has been sealed.</p>
                                </>
                            ) : (
                                <>
                                    <Skull size={180} color="#ff0044" className="heavy-glow" />
                                    <h1 className="neon-text giant">OBLIVION</h1>
                                    <p>The Guardian claims another soul...</p>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                .boss-battle { width: 100%; height: 100%; position: relative; background: #010005; overflow: hidden; transition: background 0.5s; }
                .enraged { background: #1a0000; }
                
                .battle-hud { position: absolute; top: 0; left: 0; right: 0; height: 120px; padding: 0 40px; display: flex; justify-content: space-between; align-items: center; background: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent); z-index: 100; }
                
                .team-stats { display: flex; flex-direction: column; gap: 5px; }
                .stat-item { display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.5); padding: 5px 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); }
                .team-label { font-size: 0.7rem; font-weight: 900; color: #00f2ff; letter-spacing: 2px; }
                
                .boss-stats-center { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 10px; }
                .boss-hp-container { display: flex; align-items: center; gap: 15px; }
                .bar-bg.giant { width: 600px; height: 30px; border: 2px solid rgba(255,255,255,0.1); box-shadow: inset 0 0 20px rgba(0,0,0,0.5); border-radius: 15px; overflow: hidden; }
                .bar-fill.hp { background: linear-gradient(90deg, #ff0044, #880022); filter: drop-shadow(0 0 10px #ff0044); height: 100%; }
                .enraged-bar { background: linear-gradient(90deg, #fff, #ff0000) !important; animation: flicker 0.1s infinite; }

                .timer-badge { text-align: center; background: rgba(0,0,0,0.8); border: 2px solid #ffd700; border-radius: 15px; padding: 5px 20px; }
                .timer-badge .label { font-size: 0.6rem; color: #ffd700; font-weight: 900; }
                .timer-badge .val { font-size: 2rem; color: #ffd700; font-weight: 800; font-family: monospace; }

                .absolute-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
                .boss-intro { z-index: 200; gap: 30px; text-align: center; }
                .intro-glow { position: absolute; width: 600px; height: 600px; background: radial-gradient(circle, rgba(70,0,150,0.3) 0%, transparent 70%); filter: blur(50px); z-index: -1; }
                .subtext { font-size: 1.5rem; color: var(--text-dim); letter-spacing: 5px; font-weight: 800; }

                .arena { z-index: 10; }
                .boss-entity { position: absolute; left: 50%; top: 40%; transform: translate(-50%, -50%); z-index: 10; filter: drop-shadow(0 0 50px rgba(70,0,150,0.5)); }
                .boss-aura { position: absolute; inset: -50px; border: 2px solid rgba(70,0,150,0.2); border-radius: 50%; animation: aura-pulse 3s infinite; }
                @keyframes aura-pulse { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(1.5); opacity: 0; } }

                .players-ring { position: absolute; inset: 0; pointer-events: none; }
                .player-vessel { position: absolute; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; gap: 8px; }
                .player-vessel .p-avatar { width: 75px; height: 75px; border-radius: 20px; border: 4px solid; background: #111; overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 2.2rem; font-weight: 950; position: relative; z-index: 2; box-shadow: 0 10px 20px rgba(0,0,0,0.5); }
                .player-vessel img { width: 100%; height: 100%; object-fit: cover; }
                .p-tag { font-size: 0.8rem; font-weight: 950; padding: 2px 10px; border-radius: 8px; color: black; z-index: 3; }
                .p-glow { position: absolute; inset: -10px; filter: blur(20px); opacity: 0.3; border-radius: 30px; z-index: 1; }

                .screenshake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
                @keyframes shake { 10%, 90% { transform: translate3d(-2px, 0, 0); } 20%, 80% { transform: translate3d(4px, 1px, 0); } 30%, 50%, 70% { transform: translate3d(-6px, -2px, 0); } 40%, 60% { transform: translate3d(6px, 2px, 0); } }
                @keyframes flicker { 0%, 100% { opacity: 0.8; } 50% { opacity: 1; } }

                .vfx { position: absolute; pointer-events: none; z-index: 100; }
                .boss-result { background: rgba(0,0,0,0.95); z-index: 1000; }
                .result-content { padding: 60px; border-radius: 40px; gap: 40px; max-width: 800px; border: 4px solid currentColor; }
                .giant { font-size: 5rem !important; }
            `}</style>
        </div>
    );
};
export default BossBattle;
