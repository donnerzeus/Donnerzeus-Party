import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase';
import { ref, onValue, update, set } from 'firebase/database';
import { Palette, Trophy, Sparkles, HelpCircle, PenTool, Search } from 'lucide-react';
import { sounds } from '../../utils/sounds';

const QuickDraw = ({ players, roomCode, onGameOver }) => {
    const [gameState, setGameState] = useState('starting'); // starting, writing, drawing, showcase, reveal, ranking
    const [timeLeft, setTimeLeft] = useState(30);
    const [currentDrawingIndex, setCurrentDrawingIndex] = useState(0);
    const [showcasePhase, setShowcasePhase] = useState('fake_input'); // fake_input, voting, results
    const [drawings, setDrawings] = useState([]);
    const [prompts, setPrompts] = useState({});
    const [fakePrompts, setFakePrompts] = useState({});
    const [votes, setVotes] = useState({});

    // 1. Initial Start
    useEffect(() => {
        const timer = setTimeout(() => {
            setGameState('writing');
            update(ref(db, `rooms/${roomCode}`), { gamePhase: 'writing', drawings: null, prompts: null });
            setTimeLeft(45);
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    // 2. Main Game Loop / Timer
    useEffect(() => {
        if (timeLeft <= 0) {
            handlePhaseEnd();
            return;
        }
        const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft, gameState, showcasePhase]);

    const handlePhaseEnd = () => {
        if (gameState === 'writing') {
            setGameState('drawing');
            assignPrompts();
            setTimeLeft(60);
        } else if (gameState === 'drawing') {
            startShowcase();
        } else if (gameState === 'showcase') {
            if (showcasePhase === 'fake_input') {
                setShowcasePhase('voting');
                setTimeLeft(20);
                update(ref(db, `rooms/${roomCode}`), { gamePhase: 'voting' });
            } else if (showcasePhase === 'voting') {
                setShowcasePhase('results');
                setTimeLeft(10);
                update(ref(db, `rooms/${roomCode}`), { gamePhase: 'results' });
            } else if (showcasePhase === 'results') {
                if (currentDrawingIndex < drawings.length - 1) {
                    setCurrentDrawingIndex(prev => prev + 1);
                    setShowcasePhase('fake_input');
                    setTimeLeft(30);
                    update(ref(db, `rooms/${roomCode}`), {
                        gamePhase: 'fake_input',
                        currentArtist: drawings[currentDrawingIndex + 1].playerId
                    });
                } else {
                    setGameState('ranking');
                    setTimeout(() => onGameOver('team_victory'), 8000);
                }
            }
        }
    };

    const assignPrompts = () => {
        // Collect all prompts from DB
        onValue(ref(db, `rooms/${roomCode}/prompts`), (snap) => {
            const data = snap.val() || {};
            const availablePrompts = Object.entries(data).map(([pid, text]) => ({ pid, text }));

            // Randomly assign prompts to different players
            const assignments = {};
            players.forEach((p, i) => {
                // Simplified: Give p[i] the prompt from p[i+1]
                const targetIdx = (i + 1) % availablePrompts.length;
                assignments[p.id] = availablePrompts[targetIdx].text;
            });

            update(ref(db, `rooms/${roomCode}`), {
                gamePhase: 'drawing',
                assignments,
                drawings: null
            });
        }, { onlyOnce: true });
    };

    const startShowcase = () => {
        // Collect all drawings
        onValue(ref(db, `rooms/${roomCode}/players`), (snap) => {
            const data = snap.val() || {};
            const drawList = Object.entries(data)
                .filter(([id, p]) => p.drawing)
                .map(([id, p]) => ({ playerId: id, drawing: p.drawing, originalPrompt: p.assignedPrompt }));

            setDrawings(drawList);
            setGameState('showcase');
            setShowcasePhase('fake_input');
            setTimeLeft(30);
            update(ref(db, `rooms/${roomCode}`), {
                gamePhase: 'fake_input',
                currentArtist: drawList[0].playerId
            });
        }, { onlyOnce: true });
    };

    // Listen for real-time updates of fakes and votes
    useEffect(() => {
        return onValue(ref(db, `rooms/${roomCode}`), (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setFakePrompts(data.fakeInput || {});
                setVotes(data.votes || {});
            }
        });
    }, [roomCode]);

    const renderShowcase = () => {
        const currentItem = drawings[currentDrawingIndex];
        if (!currentItem) return null;

        const artist = players.find(p => p.id === currentItem.playerId);
        const fakes = Object.values(fakePrompts);
        const options = [...fakes, currentItem.originalPrompt].sort(); // Shuffle options

        return (
            <div className="showcase-area center-all">
                <div className="drawing-frame glass-panel floating">
                    <img src={currentItem.drawing} alt="The Masterpiece" />
                    <div className="artist-tag" style={{ backgroundColor: artist?.color }}>
                        Artist: {artist?.name}
                    </div>
                </div>

                <div className="phase-content center-all">
                    {showcasePhase === 'fake_input' && (
                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                            <h2 className="glitch-text">FOOL THE OTHERS!</h2>
                            <p>What could this drawing be? Write a convincing title!</p>
                            <div className="waiting-list">
                                {players.filter(p => p.id !== artist?.id).map(p => (
                                    <div key={p.id} className={`status-tag ${fakePrompts[p.id] ? 'ready' : ''}`}>
                                        {p.name} {fakePrompts[p.id] ? '✓' : '...'}
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {showcasePhase === 'voting' && (
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                            <h2 className="neon-text">FIND THE TRUTH</h2>
                            <div className="options-grid">
                                {options.map((opt, i) => (
                                    <div key={i} className="option-card glass-panel">
                                        {opt}
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {showcasePhase === 'results' && (
                        <motion.div initial={{ y: 50 }} animate={{ y: 0 }} className="results-reveal">
                            <h2 className="correct-answer">REAL PROMPT: <span className="neon-text">{currentItem.originalPrompt}</span></h2>
                            <div className="stats-grid">
                                {Object.entries(votes || {}).map(([voterId, targetPrompt]) => {
                                    const voter = players.find(p => p.id === voterId);
                                    const isCorrect = targetPrompt === currentItem.originalPrompt;
                                    return (
                                        <div key={voterId} className="vote-reveal">
                                            <span style={{ color: voter?.color }}>{voter?.name}</span> guessed <span className={isCorrect ? 'text-success' : 'text-danger'}>{targetPrompt}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="drawful-game center-all">
            <div className="game-hud">
                <div className="hud-item glass-panel timer accent">
                    <PenTool size={24} />
                    <span>{timeLeft}s</span>
                </div>
                <div className="hud-item glass-panel">
                    <Sparkles size={24} />
                    <span>{gameState.toUpperCase()}</span>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {gameState === 'starting' && (
                    <motion.div key="cd" className="center-all" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ opacity: 0, scale: 2 }}>
                        <Palette size={150} className="glow-icon" />
                        <h1 className="title-mansion">DRAWING MANSION</h1>
                        <p className="subtitle">THE TRUTH IS IN THE INK</p>
                    </motion.div>
                )}

                {gameState === 'writing' && (
                    <motion.div key="writing" className="center-all" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <HelpCircle size={100} color="var(--accent-secondary)" />
                        <h2 className="neon-text">SUBMIT A PROMPT</h2>
                        <p>Write something weird for others to draw!</p>
                        <div className="waiting-grid">
                            {players.map(p => (
                                <div key={p.id} className={`p-bubble ${prompts[p.id] ? 'ready' : ''}`} style={{ borderColor: p.color }}>
                                    {p.name}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {gameState === 'drawing' && (
                    <motion.div key="drawing" className="center-all" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <PenTool size={100} color="var(--accent-primary)" />
                        <h2 className="neon-text">TIME TO DRAW!</h2>
                        <p>Check your phone and draw the assigned prompt!</p>
                        <div className="progress-bar-glow">
                            <div className="indicator" style={{ width: `${(timeLeft / 60) * 100}%` }} />
                        </div>
                    </motion.div>
                )}

                {gameState === 'showcase' && renderShowcase()}
            </AnimatePresence>

            <style>{`
                .drawful-game { width: 100%; height: 100%; overflow: hidden; background: radial-gradient(circle at center, #0f0a1f 0%, #05050a 100%); }
                .subtitle { letter-spacing: 5px; opacity: 0.6; font-weight: 800; }
                
                .waiting-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-top: 40px; }
                .p-bubble { padding: 15px 25px; border-radius: 50px; border: 2px solid; background: rgba(0,0,0,0.3); font-weight: 800; transition: all 0.3s; }
                .p-bubble.ready { background: white; color: black; transform: scale(1.1); box-shadow: 0 0 20px rgba(255,255,255,0.2); }

                .drawing-frame { position: relative; width: 600px; height: 500px; background: white; border: 10px solid #1a1a1a; padding: 20px; border-radius: 20px; transform: rotate(-2deg); }
                .drawing-frame img { width: 100%; height: 100%; object-fit: contain; }
                .artist-tag { position: absolute; bottom: -20px; right: 20px; padding: 10px 20px; border-radius: 10px; color: white; font-weight: 900; box-shadow: 0 5px 15px rgba(0,0,0,0.4); }

                .waiting-list { display: flex; gap: 15px; margin-top: 30px; }
                .status-tag { padding: 8px 16px; border-radius: 20px; background: rgba(255,255,255,0.05); color: var(--text-dim); }
                .status-tag.ready { color: var(--accent-primary); border: 1px solid var(--accent-primary); }

                .options-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 40px; width: 800px; }
                .option-card { padding: 25px; font-size: 1.4rem; font-weight: 700; text-align: center; color: white; border: 2px solid var(--glass-border); }

                .correct-answer { margin-bottom: 30px; font-size: 3rem; }
                .text-success { color: #00ff44; }
                .text-danger { color: #ff0044; }
            `}</style>
        </div>
    );
};

export default QuickDraw;
