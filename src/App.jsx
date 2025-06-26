import React, { useState, useCallback } from 'react';
import { doc, updateDoc } from 'firebase/firestore'; 

// Import the core logic handler
import AuthAndGameHandler from './components/AuthAndGameHandler.jsx'; 

// Import all individual game stage components
import LoginPage from './components/LoginPage.jsx'; 
import AdminSetup from './components/AdminSetup.jsx'; 
import WaitingRoom from './components/WaitingRoom.jsx'; 
import PlayingGame from './components/PlayingGame.jsx'; 
import SquareDetailsModal from './components/SquareDetailsModal.jsx'; 
import Scoreboard from './components/Scoreboard.jsx'; 


// Utility for displaying messages (This can be moved to a CommonUIComponents.jsx later if needed)
const MessageModal = ({ message, type, onClose }) => {
    if (!message) return null;

    const bgColor = type === 'error' ? 'bg-gradient-to-br from-red-500 to-red-700' : 'bg-gradient-to-br from-indigo-500 to-indigo-700';
    const borderColor = type === 'error' ? 'border-red-800' : 'border-indigo-800';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className={`relative ${bgColor} text-white p-8 rounded-xl shadow-2xl border-4 ${borderColor} max-w-sm w-full mx-auto text-center transform scale-95 animate-scale-up`}>
                <p className="text-xl font-extrabold mb-6 drop-shadow-lg font-inter-rounded">{message}</p>
                <button
                    onClick={onClose}
                    className="mt-4 px-8 py-3 bg-white text-gray-800 font-bold rounded-full hover:bg-gray-100 transition-all duration-300 shadow-lg transform hover:scale-105 font-inter-rounded"
                >
                    Got It!
                </button>
            </div>
        </div>
    );
};


// Main App Component
const App = () => {
    // Message state remains here for global messaging capability
    const [message, setMessage] = useState(null);
    const [messageType, setMessageType] = useState('info');

    // Callback for showMessageModal to be passed down
    const showMessageModal = useCallback((msg, type) => {
        setMessage(msg);
        setMessageType(type);
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex items-center justify-center p-4 font-inter">
            <style>
                {`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
                .font-inter {
                    font-family: 'Inter', sans-serif;
                }
                .font-inter-rounded {
                    font-family: 'Inter', sans-serif;
                    font-weight: 600;
                    letter-spacing: -0.01em;
                }
                h1, h2, h3, h4 {
                    font-weight: 700;
                }
                .animate-fade-in {
                    animation: fadeIn 0.3s ease-out forwards;
                }
                .animate-fade-in-up {
                    animation: fadeInUp 0.5s ease-out forwards;
                }
                .animate-scale-up {
                    animation: scaleUp 0.3s ease-out forwards;
                }
                .animate-pulse {
                    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
                @keyframes pulse {
                    0%, 100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: .7;
                    }
                }
                .animate-bounce-slow {
                    animation: bounceSlow 3s infinite ease-in-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { transform: translateY(0); }
                }
                @keyframes scaleUp {
                    from { transform: scale(0.95); opacity: 0.8; }
                    to { transform: scale(1); opacity: 1; }
                }
                @keyframes bounceSlow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                `}
            </style>

            {/* AuthAndGameHandler wraps the main application logic and provides state/handlers */}
            <AuthAndGameHandler showMessageModal={showMessageModal}>
                {({ currentUserId, isAdmin, gameId, gameData, playerData, gamePlayers, loading, isGeneratingAskMore, db, appId, geminiApiKey, handleAdminLogin, handleJoinGame, handleGameCreated, handleFinishGame, handleAskMore, handleBackToLogin }) => {

                    // State for Square Details Modal (kept here for now, will move later if needed)
                    // These states and their handlers are directly tied to the SquareDetailsModal logic
                    // and will move with it in the CommonUIComponents.jsx extraction if appropriate.
                    const [showSquareModal, setShowSquareModal] = useState(false);
                    const [selectedSquareIndex, setSelectedSquareIndex] = useState(null);
                    const [modalNames, setModalNames] = useState([]);
                    const [modalNameInput, setModalNameInput] = useState('');

                    // handleSquareClick and related modal functions will need access to playerData, db, appId, currentUserId
                    const handleSquareClick = (index) => {
                        if (playerData?.isSubmitted || gameData?.status !== 'playing') {
                            showMessageModal("You cannot edit your card after submission or when the game is not playing.", 'error');
                            return;
                        }
                        setSelectedSquareIndex(index);
                        const existingSquare = playerData?.checkedSquares?.find(s => s.index === index);
                        setModalNames(existingSquare ? existingSquare.names : []);
                        setModalNameInput('');
                        setShowSquareModal(true);
                    };

                    const handleSaveSquareDetails = async () => {
                        if (selectedSquareIndex === null || !db || !gameId || !currentUserId || !playerData) return;

                        const updatedCheckedSquares = playerData.checkedSquares.filter(s => s.index !== selectedSquareIndex);
                        if (modalNames.length > 0) {
                            updatedCheckedSquares.push({ index: selectedSquareIndex, names: modalNames });
                        }

                        const newScore = updatedCheckedSquares.length;

                        try {
                            const playerDocRef = doc(db, `artifacts/${appId}/public/data/bingoGames/${gameId}/players`, currentUserId);
                            await updateDoc(playerDocRef, {
                                checkedSquares: updatedCheckedSquares,
                                score: newScore,
                            });
                            showMessageModal("Square updated successfully!", 'success');
                        } catch (error) {
                            console.error("Error updating square:", error);
                            showMessageModal(`Failed to update square: ${error.message}`, 'error');
                        } finally {
                            setShowSquareModal(false);
                            setSelectedSquareIndex(null);
                        }
                    };

                    const handleModalToggleCheck = () => {
                        const isCurrentlyChecked = modalNames.length > 0;
                        if (isCurrentlyChecked) {
                            setModalNames([]); // If currently checked, uncheck by clearing names
                        } else {
                            setModalNames([]); // If currently unchecked, set to checked with empty names array
                        }
                    };

                    const handleModalAddName = () => {
                        const trimmedName = modalNameInput.trim();
                        if (trimmedName && !modalNames.includes(trimmedName)) {
                            setModalNames([...modalNames, trimmedName]);
                            setModalNameInput('');
                        } else if (!trimmedName) {
                            showMessageModal("Please enter a name to add.", 'error');
                        } else if (modalNames.includes(trimmedName)) {
                            showMessageModal("This name has already been added.", 'error');
                        }
                    };

                    const handleModalRemoveName = (nameToRemove) => {
                        setModalNames(modalNames.filter(name => name !== nameToRemove));
                    };


                    if (loading) {
                        return (
                            <div className="flex items-center justify-center min-h-screen bg-gray-100 font-inter">
                                <div className="text-center text-gray-700 text-2xl font-semibold flex items-center font-inter-rounded">
                                    <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Loading App...
                                </div>
                            </div>
                        );
                    }

                    let currentView;
                    if (!gameId && !isAdmin) {
                        currentView = <LoginPage onAdminLogin={handleAdminLogin} onJoinGame={handleJoinGame} showError={showMessageModal} />;
                    } else if (isAdmin && !gameId) {
                        currentView = <AdminSetup onGameCreated={handleGameCreated} userId={currentUserId} db={db} appId={appId} showError={showMessageModal} geminiApiKey={geminiApiKey} />;
                    } else if (gameId && gameData?.status === 'waiting') {
                        currentView = <WaitingRoom game={gameData} players={gamePlayers} isAdmin={isAdmin} roomCode={gameId} db={db} appId={appId} showError={showMessageModal} onAskMore={handleAskMore} currentUserId={currentUserId} isGeneratingAskMore={isGeneratingAskMore} onBackToLogin={handleBackToLogin} showSuccess={showMessageModal} />;
                    } else if (gameId && gameData?.status === 'playing' && playerData) {
                        currentView = (
                            <>
                                <PlayingGame
                                    game={gameData}
                                    player={playerData}
                                    onSquareClick={handleSquareClick}
                                    gamePlayers={gamePlayers}
                                    onFinishGame={handleFinishGame}
                                    showError={showMessageModal}
                                    onAskMore={handleAskMore}
                                    isGeneratingAskMore={isGeneratingAskMore}
                                    showSuccess={showMessageModal}
                                    currentUserId={currentUserId}
                                    db={db} // Pass db explicitly to PlayingGame
                                    appId={appId} // Pass appId explicitly to PlayingGame
                                />
                                <SquareDetailsModal
                                    show={showSquareModal}
                                    onClose={() => setShowSquareModal(false)}
                                    onSave={handleSaveSquareDetails}
                                    question={gameData?.questions[selectedSquareIndex]}
                                    currentNames={modalNames}
                                    isChecked={modalNames.length > 0} // Determine if checked based on names presence
                                    onToggleCheck={handleModalToggleCheck}
                                    onAddName={handleModalAddName}
                                    onRemoveName={handleModalRemoveName}
                                    nameInput={modalNameInput}
                                    onNameInputChange={(e) => setModalNameInput(e.target.value)}
                                />
                            </>
                        );
                    } else if (gameId && (gameData?.status === 'scoring' || gameData?.status === 'ended')) {
                        currentView = <Scoreboard game={gameData} players={gamePlayers} isAdmin={isAdmin} onBackToLogin={handleBackToLogin} onPlayAgain={handleAdminLogin} currentUserId={currentUserId} showSuccess={showMessageModal} showError={showMessageModal} db={db} appId={appId} />;
                    } else {
                        currentView = <LoginPage onAdminLogin={handleAdminLogin} onJoinGame={handleJoinGame} showError={showMessageModal} />;
                    }

                    return currentView;
                }}
            </AuthAndGameHandler>

            <MessageModal message={message} type={messageType} onClose={() => setMessage(null)} />
        </div>
    );
};

export default App;
