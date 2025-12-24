import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase';
import { ref, onValue, update } from 'firebase/database';
import { Palette, Play } from 'lucide-react';

const QuickDraw = ({ players, roomCode }) => {
    const [word, setWord] = useState('EJDERHA');
    const [phase, setPhase] = useState('lobby'); // lobby, drawing, gallery
    const [timeLeft, setTimeLeft] = useState(30);
    const [drawings, setDrawings] = useState({});

    const words = ['KEDİ', 'UÇAK', 'PIZZA', 'AĞAÇ', 'ROBOT', 'GÜNEŞ', 'DONDURMA', 'ARABA'];

    const startRound = () => {
        const randomWord = words[Math.floor(Math.random() * words.length)];
        setWord(randomWord);
        setPhase('drawing');
        setTimeLeft(30);
        update(ref(db, `rooms/${roomCode}`), {
            status: 'playing',
            gameType: 'quick-draw',
            gamePhase: 'drawing',
            currentWord: randomWord
        });
    };

    useEffect(() => {
        if (phase === 'drawing' && timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        } else if (timeLeft === 0 && phase === 'drawing') {
            setPhase('gallery');
        }
    }, [timeLeft, phase]);

    // Listen for drawings
    useEffect(() => {
        const roomRef = ref(db, `rooms/${roomCode}/players`);
        return onValue(roomRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const newDrawings = {};
                Object.entries(data).forEach(([id, p]) => {
                    if (p.drawing) newDrawings[id] = p.drawing;
                });
                setDrawings(newDrawings);
            }
        });
    }, [roomCode]);

    return (
        <div className="game-container">
            {phase === 'lobby' && (
                <div className="center-content">
                    <Palette size={80} className="neon-text" />
                    <h1>QUICK DRAW</h1>
                    <p>Draw the secret word on your phone!</p>
                    <button className="neon-button start-btn" onClick={startRound}>START DRAWING</button>
                </div>
            )}

            {phase === 'drawing' && (
                <div className="drawing-screen">
                    <div className="timer-circle">
                        <svg viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" className="bg" />
                            <motion.circle
                                cx="50" cy="50" r="45"
                                className="fill"
                                initial={{ pathLength: 1 }}
                                animate={{ pathLength: timeLeft / 30 }}
                            />
                        </svg>
                        <span className="time">{timeLeft}</span>
                    </div>
                    <h1>Çizilecek Kelime: <span className="neon-text">{word}</span></h1>
                    <div className="draw-count">Drawings received: {Object.keys(drawings).length} / {players.length}</div>
                </div>
            )}

            {phase === 'gallery' && (
                <div className="gallery-screen">
                    <h1 className="neon-text">GALLERY: {word}</h1>
                    <div className="drawings-grid">
                        {players.map(player => (
                            <div key={player.id} className="drawing-card glass-panel">
                                {drawings[player.id] ? (
                                    <img src={drawings[player.id]} alt="drawing" />
                                ) : (
                                    <div className="no-draw">Zaman bitti!</div>
                                )}
                                <div className="player-label" style={{ backgroundColor: player.color }}>
                                    {player.name}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <style>{`
                .drawing-screen { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 30px; }
                .timer-circle { position: relative; width: 120px; height: 120px; }
                .timer-circle svg { transform: rotate(-90deg); }
                .timer-circle circle { fill: none; stroke-width: 8; }
                .timer-circle .bg { stroke: rgba(255,255,255,0.1); }
                .timer-circle .fill { stroke: var(--accent-primary); stroke-linecap: round; }
                .timer-circle .time { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 2rem; font-weight: 800; }
                .drawings-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; width: 100%; margin-top: 40px; }
                .drawing-card { padding: 10px; display: flex; flex-direction: column; gap: 10px; }
                .drawing-card img { background: white; border-radius: 12px; width: 100%; height: 200px; object-fit: contain; }
                .no-draw { height: 200px; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.3); border-radius: 12px; color: var(--text-dim); }
                .player-label { padding: 5px 15px; border-radius: 20px; font-weight: 800; color: white; align-self: center; }
            `}</style>
        </div>
    );
};

export default QuickDraw;
