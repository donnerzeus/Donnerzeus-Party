import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase';
import { ref, onValue, update } from 'firebase/database';
import { Palette, Trophy, Star } from 'lucide-react';

const QuickDraw = ({ players, roomCode, onGameOver }) => {
    const [word, setWord] = useState('EJDERHA');
    const [phase, setPhase] = useState('drawing'); // drawing, exhibition, voting, results
    const [timeLeft, setTimeLeft] = useState(30);
    const [drawings, setDrawings] = useState({});
    const [votes, setVotes] = useState({});
    const [winner, setWinner] = useState(null);

    const words = ['KEDİ', 'UÇAK', 'PIZZA', 'AĞAÇ', 'ROBOT', 'GÜNEŞ', 'DONDURMA', 'ARABA', 'KORSAN', 'UZAYLI', 'KAYKAY'];

    useEffect(() => {
        const randomWord = words[Math.floor(Math.random() * words.length)];
        setWord(randomWord);
        update(ref(db, `rooms/${roomCode}`), { gamePhase: 'drawing', currentWord: randomWord });
    }, []);

    useEffect(() => {
        if (phase === 'drawing') {
            if (timeLeft > 0) {
                const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
                return () => clearTimeout(timer);
            } else {
                setPhase('voting');
                update(ref(db, `rooms/${roomCode}`), { gamePhase: 'voting' });
                setTimeLeft(15); // 15 seconds to vote
            }
        } else if (phase === 'voting') {
            if (timeLeft > 0) {
                const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
                return () => clearTimeout(timer);
            } else {
                calculateWinner();
            }
        }
    }, [timeLeft, phase]);

    useEffect(() => {
        const roomRef = ref(db, `rooms/${roomCode}`);
        return onValue(roomRef, (snapshot) => {
            const data = snapshot.val();
            if (data?.players) {
                const newDrawings = {};
                const newVotes = {};
                Object.entries(data.players).forEach(([id, p]) => {
                    if (p.drawing) newDrawings[id] = p.drawing;
                    if (p.vote) {
                        newVotes[p.vote] = (newVotes[p.vote] || 0) + 1;
                    }
                });
                setDrawings(newDrawings);
                setVotes(newVotes);
            }
        });
    }, [roomCode]);

    const calculateWinner = () => {
        let maxVotes = -1;
        let winPlayer = null;
        players.forEach(p => {
            const vCount = votes[p.id] || 0;
            if (vCount > maxVotes) {
                maxVotes = vCount;
                winPlayer = p;
            }
        });
        setWinner(winPlayer);
        setPhase('results');
        if (onGameOver && winPlayer) onGameOver(winPlayer.id);
    };

    return (
        <div className="game-container center-all">
            <AnimatePresence mode="wait">
                {phase === 'drawing' && (
                    <motion.div key="drawing" className="center-all" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <h1 className="timer-text neon-text">{timeLeft}</h1>
                        <h1 className="draw-title">Draw: <span className="neon-text accent">{word}</span></h1>
                        <p className="hint">Draw on your phone now!</p>
                        <div className="progress-list">
                            {players.map(p => (
                                <div key={p.id} className={`p-indicator ${drawings[p.id] ? 'ready' : ''}`}>
                                    {p.name} {drawings[p.id] ? '✓' : '...'}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {phase === 'voting' && (
                    <motion.div key="voting" className="gallery-container center-all" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <h1 className="timer-text neon-text">{timeLeft}</h1>
                        <h1>WHO DREW IT BEST?</h1>
                        <p className="hint">Vote for your favorite on your phone!</p>
                        <div className="drawings-grid">
                            {players.map(player => (
                                <motion.div key={player.id} className="drawing-card glass-panel" style={{ '--color': player.color }}>
                                    <div className="canvas-frame">
                                        {drawings[player.id] ? <img src={drawings[player.id]} alt="drawing" /> : <div className="no-draw">No Drawing</div>}
                                    </div>
                                    <div className="vote-count">
                                        <Star size={20} className={votes[player.id] ? 'active' : ''} />
                                        <span>{votes[player.id] || 0}</span>
                                    </div>
                                    <div className="player-name">{player.name}</div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {phase === 'results' && (
                    <motion.div key="results" className="center-all" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                        <Trophy size={120} color="#ffd700" className="trophy-glow" />
                        <h2 className="neon-text">ARTIST OF THE ROUND</h2>
                        <h1 className="winner-name" style={{ color: winner?.color }}>{winner?.name}</h1>
                        <div className="result-img glass-panel">
                            <img src={drawings[winner?.id]} alt="winner drawing" />
                        </div>
                        <p className="vote-total">Received {votes[winner?.id] || 0} votes!</p>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                .game-container { width: 100%; height: 100%; }
                .timer-text { font-size: 6rem; font-weight: 900; margin-bottom: 20px; }
                .draw-title { font-size: 4rem; margin-bottom: 10px; }
                .accent { color: var(--accent-secondary); }
                .hint { color: var(--text-dim); font-size: 1.5rem; }
                
                .progress-list { display: flex; gap: 15px; margin-top: 40px; flex-wrap: wrap; justify-content: center; }
                .p-indicator { padding: 10px 20px; border-radius: 20px; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); color: var(--text-dim); }
                .p-indicator.ready { border-color: var(--accent-primary); color: var(--accent-primary); box-shadow: 0 0 10px rgba(0,242,255,0.2); }

                .drawings-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 30px; width: 100%; max-width: 1200px; margin-top: 40px; }
                .drawing-card { padding: 20px; display: flex; flex-direction: column; gap: 15px; align-items: center; position: relative; }
                .canvas-frame { background: white; border-radius: 15px; width: 100%; height: 220px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
                .canvas-frame img { width: 100%; height: 100%; object-fit: contain; }
                .no-draw { color: #ccc; }
                .vote-count { display: flex; align-items: center; gap: 8px; font-weight: 900; font-size: 1.5rem; color: #ffd700; }
                .vote-count .active { filter: drop-shadow(0 0 5px #ffd700); }
                
                .winner-name { font-size: 6rem; margin: 20px 0; text-shadow: 0 0 30px currentColor; }
                .result-img { padding: 20px; background: white; border-radius: 30px; max-width: 500px; width: 100%; margin: 30px 0; }
                .result-img img { width: 100%; border-radius: 15px; }
                .vote-total { font-size: 1.5rem; font-weight: 600; color: var(--text-dim); }
            `}</style>
        </div>
    );
};

export default QuickDraw;
