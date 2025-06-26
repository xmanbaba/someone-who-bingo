import React, { useState, useEffect, useRef } from 'react';
import { doc, updateDoc } from 'firebase/firestore'; // Import necessary Firestore functions

// Playing Game Component
const PlayingGame = ({ game, player, onSquareClick, gamePlayers, onFinishGame, showError, onAskMore, isGeneratingAskMore, showSuccess, currentUserId, db, appId }) => {
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [message, setMessage] = useState(''); // State for local messages/confirmations
    const [showMessage, setShowMessage] = useState(false);
    const [messageType, setMessageType] = useState('info');

    const timerRef = useRef(null);
    const timerStartedRef = useRef(false);

    // Function to construct the player's bingo board based on game questions and checked squares
    const getPlayerBoard = (questions, gridSize, checkedSquares) => {
        const board = [];
        // Create a map for quick lookup of checked squares and their associated names
        const checkedMap = new Map(checkedSquares.map(s => [s.index, s.names]));
        for (let i = 0; i < gridSize * gridSize; i++) {
            board.push({
                index: i,
                question: questions[i],
                isChecked: checkedMap.has(i), // Check if this square index is in the checkedMap
                names: checkedMap.get(i) || [] // Get names, or an empty array if not found
            });
        }
        return board;
    };

    // Derive the player's board using the helper function
    const playerBoard = game ? getPlayerBoard(game.questions, game.gridSize, player?.checkedSquares || []) : [];

    // Effect hook for managing the game timer
    useEffect(() => {
        // Only start timer if game is playing and startTime exists, and timer hasn't been started yet
        if (game?.status === 'playing' && game.startTime && !timerStartedRef.current) {
            const initialTime = game.timerDuration * 60 * 1000; // Convert minutes to milliseconds
            const elapsed = Date.now() - game.startTime; // Calculate elapsed time since game start
            const remaining = Math.max(0, initialTime - elapsed); // Calculate remaining time, ensure non-negative
            setTimeRemaining(remaining);
            timerStartedRef.current = true; // Mark timer as started

            // Set up interval to update time remaining every second
            timerRef.current = setInterval(() => {
                const newElapsed = Date.now() - game.startTime;
                const newRemaining = Math.max(0, initialTime - newElapsed);
                setTimeRemaining(newRemaining);

                // If time runs out, clear interval and trigger game finish
                if (newRemaining <= 0) {
                    clearInterval(timerRef.current);
                    setMessage("Time's up! The game has ended. Please submit your card!");
                    setMessageType('info');
                    setShowMessage(true);
                    onFinishGame(true); // Call onFinishGame with true to indicate time-up
                }
            }, 1000);
        } else if (game?.status !== 'playing' && timerRef.current) {
            // If game is not playing (e.g., ended, waiting), clear any active timer
            clearInterval(timerRef.current);
            timerStartedRef.current = false;
        }

        // Cleanup function for the useEffect: clear the interval when component unmounts or dependencies change
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [game, onFinishGame]); // Re-run effect if game object or onFinishGame callback changes

    // Helper function to format milliseconds into MM:SS string
    const formatTime = (ms) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    // Handler for submitting the bingo card (shows a confirmation modal)
    const handleSubmitBingo = () => {
        setMessage("Are you sure you want to submit your Bingo card? You cannot make further changes after submission.");
        setMessageType('confirm'); // Use 'confirm' type to trigger confirmation logic in MessageModal
        setShowMessage(true);
    };

    // Handler for confirming the bingo card submission
    const confirmSubmission = async () => {
        setShowMessage(false); // Close the confirmation modal
        if (!player || player.isSubmitted) {
            showError("Your card is already submitted or player data is missing.");
            return;
        }

        try {
            // Update player's document in Firestore to mark card as submitted
            const playerDocRef = doc(db, `artifacts/${appId}/public/data/bingoGames/${game.id}/players`, player.id);
            await updateDoc(playerDocRef, {
                isSubmitted: true,
                submissionTime: Date.now(),
            });
            showSuccess("Bingo card submitted successfully!");
            onFinishGame(false); // Call onFinishGame with false (not time-up)
        } catch (error) {
            console.error("Error submitting bingo card:", error);
            showError(`Failed to submit card: ${error.message}`);
        }
    };

    return (
        <div className="space-y-8 p-6 bg-white rounded-3xl shadow-2xl max-w-4xl mx-auto border-4 border-blue-300">
            <h2 className="text-4xl font-extrabold text-center text-blue-800 mb-6 drop-shadow-md font-inter-rounded">🎮 Bingo Game</h2>

            {/* Timer and Submit Button Section */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-blue-100 border border-blue-300 p-5 rounded-xl shadow-inner mb-6">
                <div className="text-xl font-bold text-blue-700 flex items-center mb-3 sm:mb-0 font-inter-rounded">
                    <svg className="h-7 w-7 mr-3 text-blue-600" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                    Time Remaining: <span className="text-4xl font-extrabold text-blue-900 ml-4">{formatTime(timeRemaining)}</span>
                </div>
                {/* Conditionally render Submit button or "Card Submitted" message */}
                {player && !player.isSubmitted && game?.status === 'playing' && (
                    <button
                        onClick={handleSubmitBingo}
                        disabled={player.isSubmitted}
                        className="bg-gradient-to-r from-purple-500 to-red-500 hover:from-purple-600 hover:to-red-600 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 text-lg font-inter-rounded"
                    >
                        📢 Submit Bingo Card
                    </button>
                )}
                 {player && player.isSubmitted && (
                    <span className="bg-red-100 text-red-700 font-bold py-2 px-4 rounded-full text-lg shadow-inner border border-red-300 font-inter-rounded">
                        Card Submitted! 🎉
                    </span>
                )}
            </div>

            {/* Bingo Grid */}
            <div
                className={`grid gap-2 p-4 border-4 border-blue-400 rounded-2xl shadow-xl bg-blue-50`}
                style={{
                    gridTemplateColumns: `repeat(${game.gridSize}, minmax(0, 1fr))`,
                    aspectRatio: '1 / 1' // Maintain square aspect ratio
                }}
            >
                {playerBoard.map((square) => (
                    <button
                        key={square.index}
                        // Allow clicking only if game is playing and card is not submitted
                        onClick={() => game?.status === 'playing' && !player.isSubmitted && onSquareClick(square.index)}
                        disabled={player.isSubmitted || game?.status !== 'playing'}
                        className={`
                            relative p-3 sm:p-4 rounded-lg flex items-center justify-center text-center
                            font-semibold text-sm sm:text-base md:text-lg lg:text-xl leading-tight
                            shadow-md transition-all duration-200 transform font-inter-rounded
                            ${square.isChecked
                                ? 'bg-gradient-to-br from-purple-400 to-blue-400 text-white border-4 border-purple-700 scale-105 opacity-90' // Styles for checked squares
                                : 'bg-white text-gray-800 border-2 border-gray-200 hover:bg-blue-100 hover:shadow-lg hover:scale-102 cursor-pointer' // Styles for unchecked squares
                            }
                            ${(player.isSubmitted || game?.status !== 'playing') && 'cursor-not-allowed opacity-70'}
                        `}
                        // Ensure squares fill available space
                        style={{
                            minHeight: `calc(100% / ${game.gridSize} - 4px)` // Adjust height based on grid size and gap
                        }}
                    >
                        <span className="relative z-10">{square.question}</span>
                        {square.isChecked && (
                            // Checkmark overlay for checked squares
                            <div className="absolute inset-0 bg-blue-700 bg-opacity-20 flex items-center justify-center rounded-lg">
                                <svg className="w-1/2 h-1/2 text-white opacity-70 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                                </svg>
                            </div>
                        )}
                    </button>
                ))}
            </div>

            {/* Other Players' Icebreakers Section */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border-2 border-gray-100 mt-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center font-inter-rounded">
                    <svg className="w-6 h-6 mr-2 text-purple-500" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                    Other Players' Icebreakers:
                </h3>
                <div className="bg-gray-50 border border-gray-200 p-5 rounded-xl h-48 overflow-y-auto shadow-inner">
                    {gamePlayers.filter(p => p.id !== player?.id).length === 0 ? (
                        <p className="text-gray-500 italic text-center py-4 font-inter-rounded">No other players have joined yet.</p>
                    ) : (
                        <ul className="space-y-3">
                            {gamePlayers.filter(p => p.id !== player?.id).map((otherPlayer) => (
                                <li key={otherPlayer.id} className="text-gray-800 font-medium flex flex-col items-start py-2 px-3 bg-white rounded-lg shadow-sm border border-gray-100 hover:bg-gray-50 transition duration-200">
                                    <div className="flex justify-between items-center w-full">
                                        <div className="flex items-center text-lg font-inter-rounded">
                                            <span className="text-purple-600 mr-2">👤</span> {otherPlayer.name}
                                        </div>
                                        {otherPlayer.id !== currentUserId && otherPlayer.icebreaker && (
                                            <button
                                                onClick={() => onAskMore(otherPlayer)}
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
                                    {otherPlayer.icebreaker && (
                                        <span className="ml-8 text-sm text-gray-500 italic mt-1 font-inter-rounded">
                                            "{otherPlayer.icebreaker}"
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Local Message Modal for confirmation/info messages */}
            {showMessage && messageType === 'confirm' && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="relative bg-white text-gray-800 p-8 rounded-xl shadow-2xl border-4 border-indigo-300 max-w-sm w-full mx-auto text-center transform scale-95 animate-scale-up">
                        <p className="text-xl font-extrabold mb-6 drop-shadow-lg font-inter-rounded">{message}</p>
                        <div className="flex justify-around mt-6">
                            <button
                                onClick={confirmSubmission}
                                className="px-6 py-3 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 transition-all duration-300 shadow-md font-inter-rounded"
                            >
                                Yes, Submit!
                            </button>
                            <button
                                onClick={() => setShowMessage(false)}
                                className="px-6 py-3 bg-gray-300 text-gray-800 font-bold rounded-full hover:bg-gray-400 transition-all duration-300 shadow-md font-inter-rounded"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showMessage && messageType !== 'confirm' && (
                // Re-using the global MessageModal for general info/error messages
                <MessageModal message={message} type={messageType} onClose={() => setShowMessage(false)} />
            )}
        </div>
    );
};

export default PlayingGame;
