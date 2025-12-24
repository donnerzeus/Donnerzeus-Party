import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase';
import { ref, update, onValue } from 'firebase/database';
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

                // Sensitivity: Increased significantly
                // Each click diff now weight 2.5% of the total track
                const diff = (bluePull - redPull) * 2.5;
                setRopePos(prev => {
                    const next = Math.max(0, Math.min(100, 50 + diff));

                    if (next <= 2 && gameState === 'active') { // Larger win zones
                        finishGame('Red');
                    } else if (next >= 98 && gameState === 'active') {
                        finishGame('Blue');
                    }
                    return next;
                });
            }
        });
    }, [players.length, gameState, roomCode]);

    const finishGame = (winner) => {
        if (gameState !== 'active') return;
        setWinnerTeam(winner);
        setGameState('finished');
        if (onGameOver) {
            const winners = teams[winner.toLowerCase()];
            // Reward all winners
            winners.forEach(p => onGameOver(p.id));
            // Ensure HostView knows it's over even if no winners (though here there are)
            if (winners.length === 0) onGameOver(null);
        }
    };

    return (
        <div className="tug-game center-all">
            <h1 className="neon-text game-title">TUG OF WAR</h1>
            <div className="team-headers">
                <div className="team-label red">TEAM RED</div>
                <div className="vs-icon"><Swords size={60} /></div>
                <div className="team-label blue">TEAM BLUE</div>
            </div>

            <div className="game-arena">
                <div className={`win-zone red ${ropePos < 20 ? 'winning' : ''}`}>WIN</div>
                <div className="rope-track">
                    <motion.div
                        className="rope"
                        animate={{ x: `${(ropePos - 50) * 10}px` }} // Visual scaling of the rope move
                        transition={{ type: 'spring', damping: 25, stiffness: 120 }}
                    >
                        <div className="rope-flag">
                            <div className="knot" />
                        </div>
                    </motion.div>
                </div>
                <div className={`win-zone blue ${ropePos > 80 ? 'winning' : ''}`}>WIN</div>
            </div>

            <div className="players-vs-grid">
                <div className="team-side red-side">
                    {teams.red.map(p => (
                        <div key={p.id} className="p-card" style={{ borderColor: p.color }}>
                            <div className="p-mini" style={{ background: p.color }}>{p.name?.[0]}</div>
                            <span>{p.name}</span>
                        </div>
                    ))}
                </div>
                <div className="team-side blue-side">
                    {teams.blue.map(p => (
                        <div key={p.id} className="p-card" style={{ borderColor: p.color }}>
                            <span>{p.name}</span>
                            <div className="p-mini" style={{ background: p.color }}>{p.name?.[0]}</div>
                        </div>
                    ))}
                </div>
            </div>

            <AnimatePresence>
                {gameState === 'finished' && (
                    <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="winner-overlay center-all">
                        <Trophy size={150} color="#ffd700" className="trophy-bounce" />
                        <h1 className={`win-text ${winnerTeam.toLowerCase()}`}>{winnerTeam} TEAM WINS!</h1>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                .tug-game { width: 100%; height: 100%; gap: 60px; }
                .game-title { font-size: 6rem; letter-spacing: 15px; }
                .team-headers { display: flex; align-items: center; gap: 80px; }
                .team-label { font-size: 3.5rem; font-weight: 900; }
                .red { color: #ff4444; text-shadow: 0 0 20px rgba(255,68,68,0.5); }
                .blue { color: #4444ff; text-shadow: 0 0 20px rgba(68,68,255,0.5); }
                
                .game-arena { width: 1200px; height: 200px; display: flex; align-items: center; position: relative; gap: 20px; }
                .win-zone { width: 120px; height: 100%; border: 4px dashed white; border-radius: 30px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.5rem; opacity: 0.2; transition: all 0.3s; }
                .win-zone.winning { opacity: 0.8; transform: scale(1.1); box-shadow: 0 0 40px currentColor; }
                .win-zone.red { border-color: #ff4444; color: #ff4444; }
                .win-zone.blue { border-color: #4444ff; color: #4444ff; }
                
                .rope-track { flex: 1; height: 30px; background: rgba(255,b255,255,0.1); border-radius: 15px; position: relative; border: 3px solid var(--glass-border); overflow: hidden; }
                .rope { position: absolute; top: 50%; left: 0%; transform: translateY(-50%); width: 200%; height: 15px; background: #8b4513; }
                .rope::after { content: ''; position: absolute; inset: 0; background-image: repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(0,0,0,0.3) 15px, rgba(0,0,0,0.3) 30px); }
                
                .rope-flag { position: absolute; left: 50%; top: 50%; width: 6px; height: 120px; background: white; transform: translate(-50%, -50%); z-index: 10; }
                .knot { width: 50px; height: 50px; background: #ffaa00; border-radius: 50%; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); box-shadow: 0 0 30px #ffaa00; border: 4px solid white; }

                .players-vs-grid { display: flex; justify-content: space-between; width: 1000px; }
                .team-side { display: flex; flex-direction: column; gap: 15px; }
                .p-card { display: flex; align-items: center; gap: 15px; padding: 10px 20px; background: rgba(0,0,0,0.3); border-radius: 15px; border: 2px solid; font-weight: 800; font-size: 1.2rem; }
                .p-mini { width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; border: 2px solid white; }

                .winner-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.9); z-index: 100; border-radius: 40px; }
                .win-text { font-size: 8rem; margin-top: 30px; text-shadow: 0 0 50px currentColor; }
                .trophy-bounce { filter: drop-shadow(0 0 50px #ffd700); animation: bounce 1s infinite alternate; }
                @keyframes bounce { from{transform:scale(1)} to{transform:scale(1.2)} }
            `}</style>
        </div>
    );
};

export default TugOfWar;
