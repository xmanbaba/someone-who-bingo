import React from 'react';
import { doc, updateDoc } from 'firebase/firestore'; // Import necessary Firestore functions

// Scoreboard Component
const Scoreboard = ({ game, players, isAdmin, onBackToLogin, onPlayAgain, currentUserId, showSuccess, showError, db, appId }) => {
    // Sort players for display: by score (desc), then submission time (asc) for ties, then submitted status
    const sortedPlayers = [...players].sort((a, b) => {
        if (a.score !== b.score) {
            return b.score - a.score; // Higher score first
        }
        if (a.isSubmitted && b.isSubmitted) {
            return a.submissionTime - b.submissionTime; // Earlier submission first for submitted ties
        }
        if (a.isSubmitted && !b.isSubmitted) {
            return -1; // Submitted players before unsubmitted
        }
        if (!a.isSubmitted && b.isSubmitted) {
            return 1; // Unsubmitted players after submitted
        }
        return 0; // Maintain current order if all else is equal
    });

    // Handler for the "Play Again" button (Admin only)
    const handlePlayAgain = async () => {
        if (!isAdmin) {
            showError("Only the admin can start a new game.");
            return;
        }
        try {
            // Update the game status to 'ended' to signal game completion and allow admin to start fresh
            const gameRef = doc(db, `artifacts/${appId}/public/data/bingoGames`, game.id);
            await updateDoc(gameRef, {
                status: 'ended', // Set to 'ended' so a new game can be created
            });
            showSuccess("Game session ended. Admin can now create a new game.");
            onPlayAgain(); // Callback to the parent (App.jsx) to reset to admin login
        } catch (error) {
            console.error("Error resetting game:", error);
            showError(`Failed to reset game: ${error.message}`);
        }
    };

    return (
        <div className="space-y-8 p-6 bg-white rounded-3xl shadow-2xl max-w-3xl mx-auto border-4 border-purple-300">
            <h2 className="text-4xl font-extrabold text-center text-purple-800 mb-6 drop-shadow-md font-inter-rounded">🏆 Game Over! Scoreboard</h2>

            {/* Game Summary Details */}
            <div className="bg-purple-50 border border-purple-200 p-6 rounded-xl shadow-inner space-y-4 text-center">
                <p className="text-xl font-semibold text-purple-700 font-inter-rounded">Game Code: <span className="text-purple-900 font-extrabold text-2xl">{game?.id}</span></p>
                <p className="text-lg text-gray-700 font-inter-rounded">Industry: <span className="font-semibold">{game?.industry}</span> | Grid Size: <span className="font-semibold">{game?.gridSize}x{game?.gridSize}</span></p>
            </div>

            {/* Player Ranks Section */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border-2 border-gray-100">
                <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center font-inter-rounded">
                    <svg className="w-6 h-6 mr-2 text-yellow-500" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM10 4h4v2h-4V4zm10 15H4V8h16v11zM9 10H7v5h2v-5zm4 0h-2v7h2v-7zm4 0h-2v3h2v-3z"/></svg>
                    Player Ranks:
                </h3>
                <div className="bg-gray-50 border border-gray-200 p-5 rounded-xl h-64 overflow-y-auto shadow-inner">
                    {players.length === 0 ? (
                        <p className="text-gray-500 italic text-center py-4 font-inter-rounded">No players to show scores for.</p>
                    ) : (
                        <ul className="space-y-3">
                            {sortedPlayers.map((player, index) => (
                                <li key={player.id} className={`
                                    flex items-center justify-between p-4 rounded-lg shadow-md border-2
                                    ${index === 0 && player.isSubmitted ? 'bg-yellow-100 border-yellow-400' : 'bg-white border-gray-200'}
                                    ${player.id === currentUserId ? 'ring-4 ring-blue-300' : ''}
                                `}>
                                    <div className="flex flex-col">
                                        {/* Player Rank and Name */}
                                        <span className={`font-extrabold text-2xl mr-3 ${index === 0 && player.isSubmitted ? 'text-yellow-600' : 'text-gray-600'} font-inter-rounded`}>
                                            {index + 1}.
                                        </span>
                                        <span className={`font-bold text-lg ${player.id === currentUserId ? 'text-blue-800' : 'text-gray-800'} font-inter-rounded`}>
                                            {player.name} {player.id === currentUserId && "(You)"}
                                        </span>
                                        {/* Submission status and time */}
                                        <span className="text-sm text-gray-500 italic font-inter-rounded">
                                            {player.isSubmitted ? `Submitted at: ${new Date(player.submissionTime).toLocaleTimeString()}` : "Not Submitted"}
                                        </span>
                                    </div>
                                    {/* Player Score */}
                                    <span className={`font-extrabold text-2xl ${index === 0 && player.isSubmitted ? 'text-yellow-700' : 'text-purple-700'} font-inter-rounded`}>
                                        Score: {player.score}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Action Buttons: Play Again (Admin) and Exit Game */}
            <div className="flex flex-col sm:flex-row gap-5 mt-10">
                {isAdmin && (
                    <button
                        onClick={handlePlayAgain}
                        className="flex-1 font-extrabold py-5 px-6 rounded-2xl text-2xl bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 transition-all duration-300 shadow-xl transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-blue-400 font-inter-rounded"
                    >
                        🔄 Play Again (Admin Only)
                    </button>
                )}
                <button
                    onClick={onBackToLogin}
                    className={`flex-1 font-extrabold py-5 px-6 rounded-2xl text-2xl bg-gradient-to-r from-gray-500 to-gray-700 text-white hover:from-gray-600 hover:to-gray-800 transition-all duration-300 shadow-xl transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-gray-400 ${isAdmin ? '' : 'w-full'} font-inter-rounded`}
                >
                    🚪 Exit Game
                </button>
            </div>
        </div>
    );
};

export default Scoreboard;
