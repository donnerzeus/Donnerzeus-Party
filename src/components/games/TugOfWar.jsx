import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase';
import { ref, update, onValue, set } from 'firebase/database';
import { Swords, Trophy } from 'lucide-react';

const TugOfWar = ({ players, roomCode, onGameOver }) => {
    const [ropePos, setRopePos] = useState(50); // 0 (Red Win) to 100 (Blue Win)
    const [teams, setTeams] = useState({ red: [], blue: [] });
    const [gameState, setGameState] = useState('active'); // active, finished
    const [winnerTeam, setWinnerTeam] = useState(null);

    useEffect(() => {
        // Assign teams
        const red = [];
        const blue = [];
        players.forEach((p, i) => {
            if (i % 2 === 0) red.push(p);
            else blue.push(p);
        });
        setTeams({ red, blue });

        // Sync teams to DB so controllers know their team
        const teamUpdates = {};
        red.forEach(p => teamUpdates[`rooms/${roomCode}/players/${p.id}/team`] = 'red');
        blue.forEach(p => teamUpdates[`rooms/${roomCode}/players/${p.id}/team`] = 'blue');
        update(ref(db), teamUpdates);

        // Listen for pulls
        const roomRef = ref(db, `rooms/${roomCode}/players`);
        return onValue(roomRef, (snapshot) => {
            const data = snapshot.val();
            if (data && gameState === 'active') {
                let redPull = 0;
                let bluePull = 0;
                Object.entries(data).forEach(([id, p]) => {
                    const pullPower = p.score || 0;
                    if (p.team === 'red') redPull += pullPower;
                    if (p.team === 'blue') bluePull += pullPower;
                });

                // Calculate rope position based on relative pull total
                // This is a simple tug logic: diff determines trend
                setRopePos(prev => {
                    const diff = (bluePull - redPull) * 0.05; // Adjust sensitivity
                    const next = Math.max(0, Math.min(100, 50 + diff));

                    if (next <= 5 && gameState === 'active') {
                        finishGame('Red');
                    } else if (next >= 95 && gameState === 'active') {
                        finishGame('Blue');
                    }
                    return next;
                });
            }
        });
    }, [players.length, gameState]);

    const finishGame = (winner) => {
        setWinnerTeam(winner);
        setGameState('finished');
        if (onGameOver) {
            // Find all players in the winning team and reward them
            const winners = teams[winner.toLowerCase()];
            winners.forEach(p => onGameOver(p.id));
        }
    };

    return (
        <div className="tug-game center-all">
            <h1 className="neon-text game-title">TUG OF WAR</h1>
            <div className="team-headers">
                <div className="team-label red">TEAM RED</div>
                <div className="vs-icon"><Swords size={40} /></div>
                <div className="team-label blue">TEAM BLUE</div>
            </div>

            <div className="game-arena">
                <div className="win-zone red">WIN</div>
                <div className="rope-track">
                    <motion.div
                        className="rope"
                        animate={{ left: `${ropePos}%` }}
                        transition={{ type: 'spring', damping: 20 }}
                    >
                        <div className="rope-flag">
                            <div className="knot" />
                        </div>
                    </motion.div>
                </div>
                <div className="win-zone blue">WIN</div>
            </div>

            <div className="players-vs">
                <div className="red-list">
                    {teams.red.map(p => <div key={p.id} className="p-mini" style={{ background: p.color }}>{p.name?.[0]}</div>)}
                </div>
                <div className="blue-list">
                    {teams.blue.map(p => <div key={p.id} className="p-mini" style={{ background: p.color }}>{p.name?.[0]}</div>)}
                </div>
            </div>

            <AnimatePresence>
                {gameState === 'finished' && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="winner-overlay center-all">
                        <Trophy size={100} color="#ffd700" />
                        <h1 className={`win-text ${winnerTeam.toLowerCase()}`}>{winnerTeam} TEAM WINS!</h1>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                .tug-game { width: 100%; height: 100%; gap: 40px; }
                .game-title { font-size: 5rem; letter-spacing: 10px; }
                .team-headers { display: flex; align-items: center; gap: 50px; }
                .team-label { font-size: 2.5rem; font-weight: 900; }
                .red { color: #ff4444; text-shadow: 0 0 20px rgba(255,68,68,0.5); }
                .blue { color: #4444ff; text-shadow: 0 0 20px rgba(68,68,255,0.5); }
                
                .game-arena { width: 1000px; height: 150px; display: flex; align-items: center; position: relative; gap: 10px; }
                .win-zone { width: 80px; height: 100%; border: 3px dashed white; border-radius: 20px; display: flex; align-items: center; justify-content: center; font-weight: 900; opacity: 0.3; }
                .win-zone.red { border-color: #ff4444; color: #ff4444; }
                .win-zone.blue { border-color: #4444ff; color: #4444ff; }
                
                .rope-track { flex: 1; height: 20px; background: rgba(255,255,255,0.1); border-radius: 10px; position: relative; border: 2px solid var(--glass-border); }
                .rope { position: absolute; top: 50%; transform: translate(-50%, -50%); width: 100%; height: 10px; background: #8b4513; box-shadow: 0 0 10px rgba(0,0,0,0.5); }
                .rope::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; top: 0; background-image: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.2) 10px, rgba(0,0,0,0.2) 20px); }
                
                .rope-flag { position: absolute; left: 50%; top: 50%; width: 4px; height: 80px; background: white; transform: translate(-50%, -50%); }
                .knot { width: 30px; height: 30px; background: #ffaa00; border-radius: 50%; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); box-shadow: 0 0 15px #ffaa00; }

                .players-vs { display: flex; justify-content: space-between; width: 800px; }
                .red-list, .blue-list { display: flex; gap: 10px; }
                .p-mini { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; border: 2px solid white; }

                .winner-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.8); z-index: 100; border-radius: 40px; }
                .win-text { font-size: 6rem; margin-top: 20px; }
            `}</style>
        </div>
    );
};

export default TugOfWar;
