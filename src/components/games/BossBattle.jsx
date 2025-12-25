import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase';
import { ref, update, onValue } from 'firebase/database';
import { Shield, Zap, Skull, Heart, Target } from 'lucide-react';
import { sounds } from '../../utils/sounds';

const BossBattle = ({ players, roomCode, onGameOver }) => {
    const [gameState, setGameState] = useState('intro');
    const [bossHp, setBossHp] = useState(1000);
    const [bossMaxHp] = useState(1000);
    const [bossState, setBossState] = useState('idle'); // idle, attacking, hurt
    const [vfx, setVfx] = useState([]); // {id, x, y, type}
    const [projectiles, setProjectiles] = useState([]); // {id, x, y, type, target}
    const [teamEnergy, setTeamEnergy] = useState(100);
    const [timeLeft, setTimeLeft] = useState(60);

    const arenaRef = useRef(null);

    useEffect(() => {
        if (gameState === 'intro') {
            sounds.playStart();
            const timer = setTimeout(() => {
                setGameState('playing');
                update(ref(db, `rooms/${roomCode}`), { gamePhase: 'playing', bossHp: 1000 });
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [gameState]);

    useEffect(() => {
        if (gameState !== 'playing') return;

        // Listen for player actions from Firebase
        const actionsRef = ref(db, `rooms/${roomCode}/bossActions`);
        const unsubscribe = onValue(actionsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                Object.entries(data).forEach(([id, action]) => {
                    handlePlayerAction(action.playerId, action.type);
                    // Clear action
                    update(ref(db, `rooms/${roomCode}/bossActions/${id}`), null);
                });
            }
        });

        // Boss Attack Loop
        const attackInterval = setInterval(() => {
            const attackType = Math.random() > 0.6 ? 'slam' : 'laser';
            setBossState('attacking');
            sounds.playExplosion();

            setTimeout(() => {
                setBossState('idle');
                const damage = attackType === 'slam' ? 10 : 15;
                setTeamEnergy(prev => Math.max(0, prev - damage));
            }, 1000);
        }, 4000);

        // Timer Loop
        const timerInterval = setInterval(() => {
            setTimeLeft(t => t - 1);
        }, 1000);

        return () => {
            unsubscribe();
            clearInterval(attackInterval);
            clearInterval(timerInterval);
        };
    }, [gameState]);

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
    }, [bossHp, teamEnergy, timeLeft, gameState]);

    const handlePlayerAction = (playerId, type) => {
        const p = players.find(player => player.id === playerId);
        if (!p) return;

        if (type === 'attack') {
            setBossHp(prev => Math.max(0, prev - 10));
            setBossState('hurt');
            addVfx(50, 40, 'hit');
            setTimeout(() => setBossState('idle'), 200);
        } else if (type === 'heal') {
            setTeamEnergy(prev => Math.min(100, prev + 5));
            addVfx(50, 80, 'heal');
        }
    };

    const addVfx = (x, y, type) => {
        const id = Date.now() + Math.random();
        setVfx(prev => [...prev, { id, x, y, type }]);
        setTimeout(() => setVfx(prev => prev.filter(v => v.id !== id)), 1000);
    };

    return (
        <div className="boss-battle center-all">
            <div className="battle-hud">
                <div className="team-stats">
                    <div className="stat-item energy">
                        <Zap color="#00f2ff" />
                        <div className="bar-bg"><motion.div className="bar-fill" animate={{ width: `${teamEnergy}%` }} /></div>
                    </div>
                </div>
                <div className="boss-stats">
                    <h2 className="boss-name">ULTRA VOID GUARDIAN</h2>
                    <div className="stat-item hp">
                        <div className="bar-bg"><motion.div className="bar-fill hp" animate={{ width: `${(bossHp / bossMaxHp) * 100}%` }} /></div>
                        <Heart color="#ff0044" />
                    </div>
                </div>
                <div className="timer-badge">{timeLeft}s</div>
            </div>

            <AnimatePresence>
                {gameState === 'intro' && (
                    <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 2, opacity: 0 }} className="boss-intro center-all">
                        <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity }} className="boss-shadow">
                            <Skull size={200} color="#ff0044" />
                        </motion.div>
                        <h1 className="neon-text">FINAL BOSS</h1>
                        <p>ATTACK THE GUARDIAN! PROTECT THE TEAM!</p>
                    </motion.div>
                )}

                {gameState === 'playing' && (
                    <div className="arena" ref={arenaRef}>
                        <motion.div
                            className={`boss-entity ${bossState}`}
                            animate={{
                                y: bossState === 'attacking' ? [0, -20, 50, 0] : [0, 10, 0],
                                scale: bossState === 'hurt' ? 0.95 : 1,
                                filter: bossState === 'hurt' ? 'brightness(2)' : 'brightness(1)'
                            }}
                            transition={{ repeat: bossState === 'idle' ? Infinity : 0, duration: 2 }}
                        >
                            <div className="boss-eye-glow" />
                            <Skull size={300} color={bossState === 'attacking' ? '#ffaa00' : '#4400aa'} />
                            <div className="boss-aura" />
                        </motion.div>

                        <div className="players-ring">
                            {players.map((p, i) => (
                                <motion.div
                                    key={p.id}
                                    className="player-vessel"
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    style={{
                                        left: `${50 + 35 * Math.cos(i * (2 * Math.PI / players.length))}%`,
                                        top: `${70 + 20 * Math.sin(i * (2 * Math.PI / players.length))}%`,
                                        borderColor: p.color
                                    }}
                                >
                                    <div className="p-avatar" style={{ backgroundColor: p.color }}>
                                        {p.avatar ? <img src={p.avatar} /> : p.name?.[0]}
                                    </div>
                                    <div className="p-tag" style={{ backgroundColor: p.color }}>{p.name}</div>
                                </motion.div>
                            ))}
                        </div>

                        {vfx.map(v => (
                            <motion.div
                                key={v.id}
                                className={`vfx ${v.type}`}
                                initial={{ scale: 0, opacity: 1, x: '-50%', y: '-50%' }}
                                animate={{ scale: [1, 2], opacity: 0 }}
                                style={{ left: `${v.x}%`, top: `${v.y}%` }}
                            >
                                {v.type === 'hit' && <Zap size={80} color="#ffaa00" />}
                                {v.type === 'heal' && <Heart size={80} color="#00ff44" />}
                            </motion.div>
                        ))}
                    </div>
                )}

                {gameState === 'victory' && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="boss-result victory center-all">
                        <Trophy size={150} color="#ffd700" />
                        <h1 className="neon-text">BOSS DEFEATED!</h1>
                        <h2>EPIC TEAMWORK!</h2>
                    </motion.div>
                )}

                {gameState === 'defeat' && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="boss-result defeat center-all">
                        <Skull size={150} color="#ff0044" />
                        <h1 className="neon-text">TEAM WIPED OUT</h1>
                        <h2>THE GUARDIAN PREVAILS...</h2>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                .boss-battle { width: 100%; height: 100%; position: relative; background: radial-gradient(circle, #1a0033 0%, #000 100%); overflow: hidden; }
                .battle-hud { position: absolute; top: 20px; left: 20px; right: 20px; display: flex; justify-content: space-between; align-items: center; z-index: 100; }
                .stat-item { display: flex; align-items: center; gap: 15px; background: rgba(0,0,0,0.5); padding: 10px 20px; border-radius: 15px; border: 1px solid rgba(255,b255,255,0.1); }
                .bar-bg { width: 300px; height: 15px; background: rgba(255,255,255,0.1); border-radius: 10px; overflow: hidden; }
                .bar-fill { height: 100%; background: #00f2ff; box-shadow: 0 0 15px #00f2ff; }
                .bar-fill.hp { background: #ff0044; box-shadow: 0 0 15px #ff0044; }
                
                .boss-name { font-size: 1.2rem; font-weight: 900; color: #ff0044; letter-spacing: 3px; margin-bottom: 5px; text-shadow: 0 0 10px #ff0044; }
                .timer-badge { font-size: 2.5rem; background: rgba(0,0,0,0.8); padding: 10px 30px; border-radius: 20px; border: 2px solid #ffd700; color: #ffd700; }

                .arena { width: 100%; height: 100%; position: relative; }
                .boss-entity { position: absolute; left: 50%; top: 40%; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; z-index: 10; }
                .boss-eye-glow { position: absolute; top: 35%; width: 150px; height: 40px; background: #ff0044; filter: blur(30px); opacity: 0.5; }
                .boss-aura { position: absolute; inset: -50px; background: radial-gradient(circle, rgba(112, 0, 255, 0.2) 0%, transparent 70%); animation: pulse 2s infinite; }
                
                @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.2); opacity: 0.8; } }

                .players-ring { position: absolute; inset: 0; pointer-events: none; }
                .player-vessel { position: absolute; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; gap: 5px; }
                .player-vessel .p-avatar { width: 60px; height: 60px; border-radius: 50%; border: 3px solid; overflow: hidden; font-size: 1.5rem; font-weight: 800; display: flex; align-items: center; justify-content: center; }
                .p-tag { font-size: 0.7rem; font-weight: 800; padding: 2px 8px; border-radius: 5px; color: black; }

                .vfx { position: absolute; pointer-events: none; z-index: 50; }
                .boss-result { position: absolute; inset: 0; background: rgba(0,0,0,0.9); z-index: 200; gap: 30px; }
                .victory { color: #ffd700; }
                .defeat { color: #ff0044; }
            `}</style>
        </div>
    );
};

export default BossBattle;
