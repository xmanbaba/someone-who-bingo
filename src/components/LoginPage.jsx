import React, { useState } from 'react';

// Login Page Component
const LoginPage = ({ onAdminLogin, onJoinGame, showError }) => {
    const [roomCode, setRoomCode] = useState('');
    const [playerName, setPlayerName] = useState('');
    const [icebreaker, setIcebreaker] = useState('');

    const handleJoinGame = () => {
        if (!roomCode.trim() || !playerName.trim() || !icebreaker.trim()) {
            showError("Please enter Room Code, Player Name, and a fun Icebreaker.");
            return;
        }
        onJoinGame(roomCode.trim(), playerName.trim(), icebreaker.trim());
    };

    return (
        <div className="space-y-8 p-6 bg-blue-50 rounded-3xl shadow-2xl max-w-2xl mx-auto border-4 border-blue-200 animate-fade-in-up">
            <h2 className="text-4xl font-extrabold text-center text-blue-800 mb-8 drop-shadow-md font-inter-rounded flex items-center justify-center">
                <svg className="w-10 h-10 mr-3" viewBox="0 0 24 24" fill="url(#gradientHeart)" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="gradientHeart" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style={{stopColor: 'gold', stopOpacity: 1}} />
                            <stop offset="100%" style={{stopColor: 'yellow', stopOpacity: 1}} />
                        </linearGradient>
                    </defs>
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                Join the Networking Bingo!
            </h2>

            <div className="bg-white border border-blue-100 p-6 rounded-2xl shadow-inner space-y-5">
                <h3 className="text-2xl font-bold text-blue-700 flex items-center font-inter-rounded">
                    <svg className="w-7 h-7 mr-3 text-blue-600" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                    Join an Existing Game
                </h3>
                <div>
                    <label htmlFor="roomCode" className="block text-gray-700 text-base font-semibold mb-2 font-inter-rounded">
                        Room Code:
                    </label>
                    <input
                        type="text"
                        id="roomCode"
                        className="shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 transition duration-300 ease-in-out bg-white placeholder-gray-400 font-inter-rounded"
                        placeholder="e.g., ABCDE"
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="playerName" className="block text-gray-700 text-base font-semibold mb-2 font-inter-rounded">
                        Your Name:
                    </label>
                    <input
                        type="text"
                        id="playerName"
                        className="shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 transition duration-300 ease-in-out bg-white placeholder-gray-400 font-inter-rounded"
                        placeholder="e.g., Jane Doe"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="icebreaker" className="block text-gray-700 text-base font-semibold mb-2 font-inter-rounded">
                        Your Fun Icebreaker:
                    </label>
                    <input
                        type="text"
                        id="icebreaker"
                        className="shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 transition duration-300 ease-in-out bg-white placeholder-gray-400 font-inter-rounded"
                        placeholder="e.g., 'Loves to pet dogs!'"
                        value={icebreaker}
                        onChange={(e) => setIcebreaker(e.target.value)}
                        required
                    />
                </div>
                <button
                    onClick={handleJoinGame}
                    className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-extrabold rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-105 text-xl font-inter-rounded"
                >
                    🚀 Join Game
                </button>
            </div>

            <div className="relative flex py-5 items-center">
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="flex-shrink mx-4 text-gray-500 text-sm font-bold font-inter-rounded">OR</span>
                <div className="flex-grow border-t border-gray-300"></div>
            </div>

            <button
                onClick={onAdminLogin}
                className="w-full py-4 px-6 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-extrabold rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-105 text-xl font-inter-rounded"
            >
                👑 Be the Admin (Start New Game)
            </button>
        </div>
    );
};

export default LoginPage;
