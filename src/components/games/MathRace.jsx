import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase';
import { ref, update, onValue } from 'firebase/database';
import { Calculator, Trophy, Zap } from 'lucide-react';

const MathRace = ({ players, roomCode, onGameOver }) => {
    const [gameState, setGameState] = useState('countdown');
    const [countdown, setCountdown] = useState(3);
    const [problem, setProblem] = useState({ q: '', a: 0, choices: [] });
    const [round, setRound] = useState(1);

    useEffect(() => {
        if (gameState === 'countdown') {
            if (countdown > 0) {
                const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
                return () => clearTimeout(timer);
            } else {
                generateProblem();
            }
        }
    }, [countdown, gameState]);

    const generateProblem = () => {
        setGameState('playing');
        const ops = ['+', '-', '*'];
        const op = ops[Math.floor(Math.random() * (round > 5 ? 3 : 2))]; // Add multiplication later
        let n1, n2, ans;

        if (op === '+') {
            n1 = Math.floor(Math.random() * 50) + 1;
            n2 = Math.floor(Math.random() * 50) + 1;
            ans = n1 + n2;
        } else if (op === '-') {
            n1 = Math.floor(Math.random() * 100) + 1;
            n2 = Math.floor(Math.random() * n1) + 1;
            ans = n1 - n2;
        } else {
            n1 = Math.floor(Math.random() * 12) + 1;
            n2 = Math.floor(Math.random() * 10) + 1;
            ans = n1 * n2;
        }

        const choices = [ans];
        while (choices.length < 4) {
            const c = ans + (Math.floor(Math.random() * 20) - 10);
            if (c > 0 && !choices.includes(c)) choices.push(c);
        }

        const payload = {
            q: `${n1} ${op} ${n2} = ?`,
            a: ans,
            choices: choices.sort(() => Math.random() - 0.5)
        };

        setProblem(payload);
        update(ref(db, `rooms/${roomCode}`), {
            gamePhase: 'playing',
            currentProblem: payload.q,
            choices: payload.choices,
            correctAnswer: ans
        });
    };

    useEffect(() => {
        // Sync distance with score in this game logic
        players.forEach(p => {
            if ((p.distance || 0) >= 100 && gameState === 'playing') {
                setGameState('finished');
                if (onGameOver) onGameOver(p.id);
            }
        });
    }, [players, gameState]);

    // Problem refresh logic when everyone answers? No, just keep racing.
    // Actually, we need to refresh the problem when someone gets it right.
    useEffect(() => {
        const scores = players.map(p => p.score || 0);
        const totalScore = scores.reduce((a, b) => a + b, 0);
        if (totalScore > 0 && gameState === 'playing') {
            const timer = setTimeout(() => {
                setRound(r => r + 1);
                generateProblem();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [players.map(p => p.score).join(',')]);

    return (
        <div className="math-race center-all">
            <AnimatePresence mode="wait">
                {gameState === 'countdown' && (
                    <motion.div key="cd" className="center-all" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ opacity: 0 }}>
                        <Calculator size={100} color="#00f2ff" />
                        <h1 className="neon-text">MATH RACE</h1>
                        <h1 className="big-cd">{countdown}</h1>
                        <p className="hint">Solve problems to move forward!</p>
                    </motion.div>
                )}

                {(gameState === 'playing' || gameState === 'finished') && (
                    <div className="math-arena">
                        <div className="problem-card glass-panel">
                            <h2>{problem.q}</h2>
                        </div>

                        <div className="race-track">
                            {players.map(p => (
                                <motion.div
                                    key={p.id}
                                    className="racer-row"
                                    animate={{ x: `${(p.distance || 0)}%` }}
                                    transition={{ type: 'spring', damping: 15 }}
                                >
                                    <div className="racer-avatar" style={{ backgroundColor: p.color }}>
                                        {p.avatar ? <img src={p.avatar} /> : p.name?.[0]}
                                        <div className="racer-name">{p.name}</div>
                                    </div>
                                    <div className="exhaust" />
                                </motion.div>
                            ))}
                            <div className="finish-line">FINISH</div>
                        </div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .math-race { width: 100%; height: 100%; }
                .problem-card { padding: 40px 100px; margin-bottom: 50px; border-radius: 40px; border: 4px solid var(--accent-primary); }
                .problem-card h2 { font-size: 5rem; font-weight: 900; letter-spacing: 5px; }
                
                .race-track { width: 90%; height: 500px; background: rgba(0,0,0,0.4); border-radius: 40px; border: 2px solid var(--glass-border); padding: 40px; display: flex; flex-direction: column; justify-content: space-around; position: relative; }
                .racer-row { position: relative; width: 100px; z-index: 10; }
                .racer-avatar { width: 80px; height: 80px; border-radius: 20px; border: 4px solid white; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: 900; position: relative; }
                .racer-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 16px; }
                .racer-name { position: absolute; top: -30px; left: 50%; transform: translateX(-50%); font-size: 0.8rem; font-weight: 800; white-space: nowrap; background: rgba(0,0,0,0.8); padding: 2px 8px; border-radius: 5px; }
                
                .finish-line { position: absolute; right: 20px; top: 0; bottom: 0; width: 100px; border-left: 10px dashed white; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 3rem; transform: rotate(90deg); opacity: 0.2; pointer-events: none; }
                .exhaust { position: absolute; left: -20px; top: 50%; width: 20px; height: 10px; background: orange; filter: blur(5px); display: none; }
            `}</style>
        </div>
    );
};

export default MathRace;
