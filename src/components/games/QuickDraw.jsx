import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db } from '../../firebase';
import { ref, onValue, update } from 'firebase/database';
import { Palette } from 'lucide-react';

const QuickDraw = ({ players, roomCode, onGameOver }) => {
    const [word, setWord] = useState('EJDERHA');
    const [phase, setPhase] = useState('lobby'); // lobby, drawing, gallery
    const [timeLeft, setTimeLeft] = useState(30);
    const [drawings, setDrawings] = useState({});
    const words = ['KEDİ', 'UÇAK', 'PIZZA', 'AĞAÇ', 'ROBOT', 'GÜNEŞ', 'DONDURMA', 'ARABA', 'KORSAN'];

    const startRound = () => {
        const randomWord = words[Math.floor(Math.random() * words.length)];
        setWord(randomWord);
        setPhase('drawing');
        setTimeLeft(30);
        update(ref(db, `rooms/${roomCode}`), { gamePhase: 'drawing', currentWord: randomWord });
    };

    useEffect(() => {
        if (phase === 'drawing') {
            if (timeLeft > 0) {
                const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
                return () => clearTimeout(timer);
            } else {
                setPhase('gallery');
                if (onGameOver) onGameOver();
            }
        }
    }, [timeLeft, phase, onGameOver]);

    useEffect(() => {
        const roomRef = ref(db, `rooms/${roomCode}/players`);
        return onValue(roomRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const newDrawings = {};
                Object.entries(data).forEach(([id, p]) => { if (p.drawing) newDrawings[id] = p.drawing; });
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
                    <h1 className="timer-text">{timeLeft}s</h1>
                    <h1>Draw: <span className="neon-text">{word}</span></h1>
                    <div className="draw-count">Drawings: {Object.keys(drawings).length} / {players.length}</div>
                </div>
            )}
            {phase === 'gallery' && (
                <div className="gallery-screen">
                    <h1 className="neon-text">GALLERY: {word}</h1>
                    <div className="drawings-grid">
                        {players.map(player => (
                            <div key={player.id} className="drawing-card glass-panel" style={{ '--color': player.color }}>
                                {drawings[player.id] ? <img src={drawings[player.id]} alt="drawing" /> : <div className="no-draw">Time's Up!</div>}
                                <div className="player-label">{player.name}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <style>{`
                .drawing-screen { text-align: center; }
                .timer-text { font-size: 5rem; color: var(--accent-primary); }
                .drawings-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; width: 100%; margin-top: 20px; }
                .drawing-card { padding: 10px; text-align: center; }
                .drawing-card img { background: white; border-radius: 12px; width: 100%; height: 150px; object-fit: contain; }
                .no-draw { height: 150px; background: rgba(0,0,0,0.3); border-radius: 12px; display: flex; align-items: center; justify-content: center; }
                .player-label { margin-top: 10px; font-weight: 800; color: var(--color); }
            `}</style>
        </div>
    );
};

export default QuickDraw;
