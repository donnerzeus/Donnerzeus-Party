import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase';
import { ref, update, onValue, set } from 'firebase/database';
import { Music as MusicIcon, Zap, Star, Disc } from 'lucide-react';
import { sounds } from '../../utils/sounds';

const COLORS = ['#ff4444', '#44ff44', '#4444ff', '#ffff44'];

const RhythmHero = ({ players, roomCode, onGameOver }) => {
    const [gameState, setGameState] = useState('intro'); // intro, playing, finished
    const [notes, setNotes] = useState([]);
    const [scores, setScores] = useState({});
    const [combos, setCombos] = useState({});
    const [timeLeft, setTimeLeft] = useState(45);
    const lastNoteSpawn = useRef(0);

    useEffect(() => {
        if (gameState === 'intro') {
            sounds.playStart();
            const timer = setTimeout(() => {
                setGameState('playing');
                update(ref(db, `rooms/${roomCode}`), { gamePhase: 'playing' });
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [gameState]);

    // Game Loop
    useEffect(() => {
        if (gameState !== 'playing') return;

        const interval = setInterval(() => {
            // Move notes
            setNotes(prev => prev.map(n => ({ ...n, y: n.y + 5 })).filter(n => n.y < 110));

            // Spawn notes
            if (Date.now() - lastNoteSpawn.current > 600) {
                const newNotes = players.map(p => ({
                    id: Math.random(),
                    playerId: p.id,
                    type: Math.floor(Math.random() * 4), // 0, 1, 2, 3 correlated to COLORS
                    y: -10
                })).filter(() => Math.random() > 0.4); // Randomly skip notes

                setNotes(prev => [...prev, ...newNotes]);
                lastNoteSpawn.current = Date.now();
            }

            setTimeLeft(t => t - 0.016); // ~60fps
        }, 16);

        return () => clearInterval(interval);
    }, [gameState, players]);

    // Listen for hits from Firebase
    useEffect(() => {
        const hitsRef = ref(db, `rooms/${roomCode}/rhythmHits`);
        return onValue(hitsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                Object.entries(data).forEach(([hitId, hit]) => {
                    handleHit(hit.playerId, hit.type);
                    set(ref(db, `rooms/${roomCode}/rhythmHits/${hitId}`), null);
                });
            }
        });
    }, [roomCode]);

    const handleHit = (playerId, type) => {
        setNotes(prev => {
            let found = false;
            const next = prev.filter(n => {
                if (!found && n.playerId === playerId && n.type === type && n.y > 75 && n.y < 95) {
                    found = true;
                    setScores(s => ({ ...s, [playerId]: (s[playerId] || 0) + 10 }));
                    setCombos(c => ({ ...c, [playerId]: (c[playerId] || 0) + 1 }));
                    return false;
                }
                return true;
            });
            if (!found) {
                setCombos(c => ({ ...c, [playerId]: 0 }));
            }
            return next;
        });
    };

    useEffect(() => {
        if (timeLeft <= 0 && gameState === 'playing') {
            setGameState('finished');
            const winner = Object.entries(scores).reduce((a, b) => (a[1] > b[1] ? a : b), [null, 0])[0];
            setTimeout(() => onGameOver(winner), 5000);
        }
    }, [timeLeft, gameState]);

    return (
        <div className="rhythm-game center-all">
            <div className="game-hud">
                <div className="hud-item glass-panel timer accent">
                    <MusicIcon size={24} />
                    <span>{Math.ceil(timeLeft)}s</span>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {gameState === 'intro' ? (
                    <motion.div key="intro" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 2 }} className="center-all">
                        <Disc size={150} className="glow-icon spinning" />
                        <h1 className="title-mansion">NEON RHYTHM</h1>
                        <p className="subtitle">FEEL THE BEAT, HIT THE LIGHTS</p>
                    </motion.div>
                ) : (
                    <div className="rhythm-arena">
                        {players.map((p, pIdx) => (
                            <div key={p.id} className="player-track" style={{ '--p-color': p.color }}>
                                <div className="track-header">
                                    <div className="p-score">{scores[p.id] || 0}</div>
                                    <div className="p-name">{p.name}</div>
                                    {combos[p.id] > 5 && <motion.div animate={{ scale: [1, 1.2, 1] }} className="combo-tag">{combos[p.id]} COMBO!</motion.div>}
                                </div>
                                <div className="lanes-container">
                                    {[0, 1, 2, 3].map(lane => (
                                        <div key={lane} className="lane">
                                            <div className="hit-zone" style={{ backgroundColor: COLORS[lane] }} />
                                        </div>
                                    ))}
                                    {notes.filter(n => n.playerId === p.id).map(n => (
                                        <motion.div
                                            key={n.id}
                                            className="note"
                                            style={{
                                                top: `${n.y}%`,
                                                left: `${n.type * 25}%`,
                                                backgroundColor: COLORS[n.type],
                                                boxShadow: `0 0 15px ${COLORS[n.type]}`
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .rhythm-game { width: 100%; height: 100%; background: #050510; overflow: hidden; }
                .spinning { animation: spin 4s linear infinite; }
                @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }

                .rhythm-arena { display: flex; gap: 40px; height: 80%; width: 90%; justify-content: center; align-items: flex-end; }
                .player-track { flex: 1; height: 100%; max-width: 250px; display: flex; flex-direction: column; position: relative; }
                
                .track-header { height: 120px; text-align: center; display: flex; flex-direction: column; justify-content: flex-end; margin-bottom: 20px; }
                .p-score { font-size: 2.5rem; font-weight: 900; color: var(--accent-primary); }
                .p-name { font-weight: 800; color: var(--text-dim); text-transform: uppercase; }
                .combo-tag { color: var(--accent-tertiary); font-weight: 950; font-size: 1.2rem; }

                .lanes-container { flex: 1; background: rgba(255,255,255,0.03); border: 2px solid rgba(255,255,255,0.1); border-radius: 20px; display: flex; position: relative; overflow: hidden; }
                .lane { flex: 1; border-right: 1px solid rgba(255,255,255,0.05); position: relative; }
                .lane:last-child { border-right: none; }

                .hit-zone { position: absolute; bottom: 10%; left: 10%; right: 10%; height: 10px; border-radius: 10px; opacity: 0.3; filter: blur(5px); }
                .note { position: absolute; width: 25%; height: 20px; border-radius: 5px; z-index: 10; border: 2px solid rgba(0,0,0,0.5); }
                
                .lanes-container::after { content: ''; position: absolute; bottom: 10%; left: 0; right: 0; height: 2px; background: rgba(255,255,255,0.5); z-index: 5; }
            `}</style>
        </div>
    );
};

export default RhythmHero;
