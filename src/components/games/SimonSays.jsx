import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase';
import { ref, update, onValue } from 'firebase/database';

const SimonSays = ({ players, roomCode }) => {
    const [sequence, setSequence] = useState([]);
    const [phase, setPhase] = useState('showing'); // showing, waiting, failed, success
    const [currentStep, setCurrentStep] = useState(0);
    const [round, setRound] = useState(1);
    const colors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44'];
    const [activeColor, setActiveColor] = useState(null);

    // Initialize game
    useEffect(() => {
        generateNextStep();
    }, []);

    const generateNextStep = () => {
        const nextColor = Math.floor(Math.random() * 4);
        setSequence(prev => {
            const newSeq = [...prev, nextColor];
            playSequence(newSeq);
            return newSeq;
        });
        update(ref(db, `rooms/${roomCode}`), {
            gamePhase: 'showing',
            sequenceLength: sequence.length + 1
        });
    };

    const playSequence = async (seq) => {
        setPhase('showing');
        for (let i = 0; i < seq.length; i++) {
            await new Promise(r => setTimeout(r, 600));
            setActiveColor(seq[i]);
            await new Promise(r => setTimeout(r, 400));
            setActiveColor(null);
        }
        setPhase('waiting');
        update(ref(db, `rooms/${roomCode}`), {
            gamePhase: 'waiting',
            currentRound: round
        });
    };

    useEffect(() => {
        const roomRef = ref(db, `rooms/${roomCode}`);
        const unsubscribe = onValue(roomRef, (snapshot) => {
            const data = snapshot.val();
            if (data?.lastMove && phase === 'waiting') {
                // In a real multiplayer Simon Says, we'd check everyone.
                // For simplicity here, the first person to finish or fail moves the game.
                // Or we check the "host" logic. 
            }
        });
        return () => unsubscribe();
    }, [phase]);

    return (
        <div className="game-container">
            <h1 className="neon-text">SIMON SAYS - ROUND {round}</h1>

            <div className="simon-grid">
                {colors.map((color, i) => (
                    <motion.div
                        key={i}
                        className="simon-pad"
                        animate={{
                            backgroundColor: activeColor === i ? color : 'rgba(255,255,255,0.1)',
                            boxShadow: activeColor === i ? `0 0 30px ${color}` : 'none',
                            scale: activeColor === i ? 1.05 : 1
                        }}
                        style={{ border: `2px solid ${color}` }}
                    />
                ))}
            </div>

            <div className="status-msg">
                {phase === 'showing' ? "Watch closely..." : "Your turn!"}
            </div>

            <style jsx>{`
                .simon-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    width: 300px;
                    height: 300px;
                    margin: 40px auto;
                }
                .simon-pad {
                    border-radius: 15px;
                    transition: background-color 0.2s;
                }
                .status-msg {
                    font-size: 1.5rem;
                    color: var(--text-dim);
                }
            `}</style>
        </div>
    );
};

export default SimonSays;
