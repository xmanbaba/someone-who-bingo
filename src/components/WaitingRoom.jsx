import React from 'react';
import { doc, updateDoc } from 'firebase/firestore'; // Import necessary Firestore functions

// Waiting Room Component
const WaitingRoom = ({ game, players, isAdmin, roomCode, db, appId, showError, onAskMore, currentUserId, isGeneratingAskMore, onBackToLogin, showSuccess }) => {
    const handleStartGame = async () => {
        if (!db || !game || !roomCode) {
            showError("Game data not available.");
            return;
        }
        try {
            const gameRef = doc(db, `artifacts/${appId}/public/data/bingoGames`, roomCode);
            await updateDoc(gameRef, {
                status: 'playing',
                startTime: Date.now(),
            });
        } catch (error) {
            console.error("Error starting game:", error);
            showError(`Failed to start game: ${error.message}`);
        }
    };

    const handleCopyRoomCode = () => {
        const textField = document.createElement('textarea');
        textField.innerText = roomCode;
        document.body.appendChild(textField);
        textField.select();
        try {
            document.execCommand('copy');
            showSuccess('Room code copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy text: ', err);
            showError('Failed to copy room code. Please copy manually.');
        } finally {
            document.body.removeChild(textField);
        }
    };

    const qrCodeLink = `https://bingo-game.com?room=${roomCode}`;

    return (
        <div className="space-y-10 p-8 bg-white rounded-3xl shadow-2xl max-w-3xl mx-auto border-4 border-blue-300">
            <h2 className="text-4xl font-extrabold text-center text-blue-800 mb-8 drop-shadow-md font-inter-rounded">🛋️ Waiting Room</h2>

            <div className="bg-blue-100 border border-blue-300 text-blue-800 p-7 rounded-2xl shadow-lg text-center space-y-4">
                <p className="text-2xl font-bold font-inter-rounded">Game Room Code:</p>
                <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4">
                    <span className="text-6xl font-extrabold text-blue-900 tracking-wider bg-blue-200 px-6 py-3 rounded-xl shadow-inner border border-blue-300 animate-pulse font-inter-rounded">{roomCode}</span>
                    <button
                        onClick={handleCopyRoomCode}
                        className="p-4 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition duration-300 shadow-md transform hover:scale-110"
                        aria-label="Copy room code"
                    >
                        <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M16 1H4C2.9 1 2 1.9 2 3v14h2V3h12V1zm3 4H8C6.9 5 6 5.9 6 7v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                        </svg>
                    </button>
                </div>
                <p className="text-base mt-5 text-blue-700 font-medium font-inter-rounded">Share this code with other players to join the fun!</p>
                <div className="flex items-center justify-center space-x-3 text-sm text-gray-700">
                    <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zm10-12h8V3h-8v8zm2-6h4v4h-4V5zM15 21h8v-8h-8v8zm2-6h4v4h-4v-4zM11 5h2v2h-2V5zm0 4h2v2h-2V9zm0 8h2v2h-2v-2zm-4 0h2v2h-2v-2z"/>
                    </svg>
                    <a href={qrCodeLink} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900 font-semibold flex items-center font-inter-rounded">
                        Generate QR Code / Share Link
                        <svg className="inline-block h-4 w-4 ml-2 text-blue-600" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59L9.41 12.17l1.41 1.41L19 6.41V10h2V3h-7z"/>
                        </svg>
                    </a>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-2xl shadow-lg border-2 border-gray-100">
                    <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center font-inter-rounded">
                        <svg className="w-6 h-6 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 6h2v2h-2V7zm0 4h2v6h-2v-6z"/></svg>
                        Game Details:
                    </h3>
                    <ul className="list-disc list-inside text-gray-700 space-y-3 text-lg font-inter-rounded">
                        <li><span className="font-semibold text-gray-900">Industry:</span> {game?.industry}</li>
                        <li><span className="font-semibold text-gray-900">Grid Size:</span> {game?.gridSize}x{game?.gridSize}</li>
                        <li><span className="font-semibold text-gray-900">Timer:</span> {game?.timerDuration} minutes</li>
                    </ul>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-lg border-2 border-gray-100">
                    <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center font-inter-rounded">
                        <svg className="w-6 h-6 mr-2 text-purple-500" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-4 0c1.66 0 2.99-1.34 2.99-3S13.66 5 12 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-4 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm8 4c-2.33 0-7 1.17-7 3.5V19h14v-1.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                        Players Joined ({players.length}):
                    </h3>
                    <div className="bg-gray-50 border border-gray-200 p-5 rounded-xl h-48 overflow-y-auto shadow-inner">
                        {players.length === 0 ? (
                            <p className="text-gray-500 italic text-center py-4 font-inter-rounded">No players joined yet... be the first!</p>
                        ) : (
                            <ul className="space-y-3">
                                {players.map((player) => (
                                    <li key={player.id} className="text-gray-800 font-medium flex flex-col items-start py-2 px-3 bg-white rounded-lg shadow-sm border border-gray-100 hover:bg-gray-50 transition duration-200">
                                        <div className="flex justify-between items-center w-full">
                                            <div className="flex items-center text-lg font-inter-rounded">
                                                <span className="text-purple-600 mr-2">👤</span> {player.name}
                                            </div>
                                            {player.id !== currentUserId && player.icebreaker && (
                                                <button
                                                    onClick={() => onAskMore(player)}
                                                    disabled={isGeneratingAskMore}
                                                    className="ml-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold hover:bg-purple-200 transition duration-200 flex items-center shadow-sm font-inter-rounded"
                                                >
                                                    {isGeneratingAskMore ? (
                                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-purple-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                    ) : '✨ Ask More'}
                                                </button>
                                            )}
                                        </div>
                                        {player.icebreaker && (
                                            <span className="ml-8 text-sm text-gray-500 italic mt-1 font-inter-rounded">
                                                "{player.icebreaker}"
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            {isAdmin && (
                <div className="flex flex-col sm:flex-row gap-5 mt-10">
                    <button
                        onClick={handleStartGame}
                        disabled={players.length < 1}
                        className={`flex-1 font-extrabold py-5 px-6 rounded-2xl text-2xl focus:outline-none focus:ring-4 focus:ring-offset-2 transition-all duration-300 shadow-xl transform hover:scale-105 font-inter-rounded
                            ${players.length < 1 ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white focus:ring-blue-400'}`}
                    >
                        🏁 Start Game
                    </button>
                    <button
                        onClick={onBackToLogin}
                        className="flex-1 font-extrabold py-5 px-6 rounded-2xl text-2xl bg-gradient-to-r from-gray-500 to-gray-700 text-white hover:from-gray-600 hover:to-gray-800 transition-all duration-300 shadow-xl transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-gray-400 font-inter-rounded"
                    >
                        🚪 Exit Game
                    </button>
                </div>
            )}
            {!isAdmin && (
                <p className="text-center text-gray-600 italic text-lg mt-8 motion-safe:animate-bounce-slow font-inter-rounded">
                    Waiting for the admin to start the game...
                </p>
            )}
        </div>
    );
};

export default WaitingRoom;
