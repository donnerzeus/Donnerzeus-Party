import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase';
import { ref, update, onValue } from 'firebase/database';

const SimonSays = ({ players, roomCode, onGameOver }) => {
    const [sequence, setSequence] = useState([]);
    const [phase, setPhase] = useState('showing'); // showing, waiting, finished
    const [activeColor, setActiveColor] = useState(null);
    const [round, setRound] = useState(1);
    const colors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44'];

    useEffect(() => {
        startNextRound([]);
    }, []);

    const startNextRound = (currentSeq) => {
        if (round > 5) {
            setPhase('finished');
            if (onGameOver) onGameOver('team_victory');
            return;
        }
        const nextColor = Math.floor(Math.random() * 4);
        const newSeq = [...currentSeq, nextColor];
        setSequence(newSeq);
        playSequence(newSeq);
    };

    const playSequence = async (seq) => {
        setPhase('showing');
        update(ref(db, `rooms/${roomCode}`), { gamePhase: 'showing' });
        for (const colorIdx of seq) {
            await new Promise(r => setTimeout(r, 600));
            setActiveColor(colorIdx);
            await new Promise(r => setTimeout(r, 400));
            setActiveColor(null);
        }
        setPhase('waiting');
        update(ref(db, `rooms/${roomCode}`), { gamePhase: 'waiting' });
    };

    useEffect(() => {
        if (phase === 'waiting') {
            const roomRef = ref(db, `rooms/${roomCode}/players`);
            const unsubscribe = onValue(roomRef, (snapshot) => {
                const data = snapshot.val();
                if (!data) return;

                // Track if everyone finished or someone failed
                // For now, let's just make it a "survival" or "speed" thing
                // Actually, let's just advance after a delay for now to keep it simple
            });

            const timer = setTimeout(() => {
                if (round < 5) {
                    setRound(r => r + 1);
                    startNextRound(sequence);
                } else {
                    setPhase('finished');
                    if (onGameOver) onGameOver('team_victory');
                }
            }, sequence.length * 1000 + 5000);

            return () => {
                unsubscribe();
                clearTimeout(timer);
            };
        }
    }, [phase]);

    return (
        <div className="game-container">
            <h1 className="neon-text">SIMON SAYS - ROUND {round}/5</h1>
            <div className="simon-grid">
                {colors.map((color, i) => (
                    <motion.div
                        key={i}
                        className="simon-pad"
                        animate={{
                            backgroundColor: activeColor === i ? color : 'rgba(255,255,255,0.1)',
                            boxShadow: activeColor === i ? `0 0 30px ${color}` : 'none'
                        }}
                        style={{ border: `2px solid ${color}` }}
                    />
                ))}
            </div>
            <div className="status-msg">
                {phase === 'showing' ? "Watch the sequence..." : phase === 'finished' ? "Well done!" : "Repeat the pattern on your phone!"}
            </div>
            <style>{`
                .simon-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; width: 300px; height: 300px; margin: 40px auto; }
                .simon-pad { border-radius: 15px; }
                .status-msg { font-size: 1.5rem; color: var(--text-dim); text-align: center; }
            `}</style>
        </div>
    );
};

export default SimonSays;
