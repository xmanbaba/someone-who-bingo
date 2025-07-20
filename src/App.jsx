import React, { useState, useCallback, useEffect } from "react"; // Added useEffect
import { doc, updateDoc } from "firebase/firestore";

// Import the core logic handler
import AuthAndGameHandler from "/src/components/AuthAndGameHandler.jsx";

// Import all individual game stage components
import AuthScreen from "/src/components/AuthScreen.jsx"; // New: Import AuthScreen
import LandingPage from "/src/components/LandingPage.jsx";
import LoginPage from "/src/components/LoginPage.jsx";
import AdminSetup from "/src/components/AdminSetup.jsx";
import WaitingRoom from "/src/components/WaitingRoom.jsx";
import PlayingGame from "/src/components/PlayingGame.jsx";
import SquareDetailsModal from "/src/components/SquareDetailsModal.jsx";
import Scoreboard from "/src/components/Scoreboard.jsx";

// Utility for displaying messages
const MessageModal = ({ message, type, onClose }) => {
  if (!message) return null;

  const bgColor =
    type === "error"
      ? "bg-gradient-to-br from-red-500 to-red-700"
      : "bg-gradient-to-br from-indigo-500 to-indigo-700";
  const borderColor = type === "error" ? "border-red-800" : "border-indigo-800";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div
        className={`relative ${bgColor} text-white p-8 rounded-xl shadow-2xl border-4 ${borderColor} max-w-sm w-full mx-auto text-center transform scale-95 animate-scale-up`}
      >
        <p className="text-xl font-extrabold mb-6 drop-shadow-lg font-inter-rounded">
          {message}
        </p>
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
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState("info");
  const [selectedRole, setSelectedRole] = useState(null); // 'player', 'admin', or null
  const [isAdminState, setIsAdminState] = useState(false); // New state to manage admin role based on user selection

  const showMessageModal = useCallback((msg, type) => {
    setMessage(msg);
    setMessageType(type);
  }, []);

  // Callback for LandingPage to set the selected role
  const handleSelectRole = useCallback((role) => {
    setSelectedRole(role);
    setIsAdminState(role === "admin"); // Set isAdminState based on role selection
  }, []);

  // Callback to go back to role selection (from AdminSetup or LoginPage)
  const handleBackToRoleSelection = useCallback(() => {
    setSelectedRole(null);
    setIsAdminState(false); // Reset admin state
    // Also clear game-related states if user goes back to role selection
    // This will be handled by AuthAndGameHandler's handleBackToLogin
  }, []);

  // Callback for AuthScreen after successful login/signup
  const handleAuthSuccess = useCallback(() => {
    // After successful authentication, automatically transition to role selection
    setSelectedRole(null); // Ensure role selection is shown
  }, []);

  // Callback for signing out
  const handleSignOut = useCallback(
    async (signOutFirebase) => {
      try {
        await signOutFirebase(); // Call Firebase signOut function passed from AuthAndGameHandler
        showMessageModal("Logged out successfully!", "success");
        setSelectedRole(null); // Reset role selection
        setIsAdminState(false); // Reset admin state
        // AuthAndGameHandler's onAuthStateChanged will handle clearing currentUserId
        // handleBackToLogin will clear game-related states
      } catch (error) {
        console.error("Error signing out:", error);
        showMessageModal(`Failed to log out: ${error.message}`, "error");
      }
    },
    [showMessageModal]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4 font-inter text-gray-900">
      {/* Main content wrapper with max-w for desktop and centering */}
      <div className="w-full max-w-screen-xl mx-auto lg:w-3/4">
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
          {({
            currentUserId,
            gameId,
            gameData,
            playerData,
            gamePlayers,
            loading,
            isGeneratingAskMore,
            db,
            appId,
            geminiApiKey,
            handleAdminLogin,
            handleJoinGame,
            handleGameCreated,
            handleFinishGame,
            handleAskMore,
            handleBackToLogin,
            auth,
            createUserWithEmailAndPassword,
            signInWithEmailAndPassword,
            signOut,
          }) => {
            // State for Square Details Modal
            const [showSquareModal, setShowSquareModal] = useState(false);
            const [selectedSquareIndex, setSelectedSquareIndex] =
              useState(null);
            const [modalNames, setModalNames] = useState([]);
            const [modalNameInput, setModalNameInput] = useState("");

            // handleSquareClick and related modal functions
            const handleSquareClick = (index) => {
              if (playerData?.isSubmitted || gameData?.status !== "playing") {
                showMessageModal(
                  "You cannot edit your card after submission or when the game is not playing.",
                  "error"
                );
                return;
              }
              setSelectedSquareIndex(index);
              const existingSquare = playerData?.checkedSquares?.find(
                (s) => s.index === index
              );
              setModalNames(existingSquare ? existingSquare.names : []);
              setModalNameInput("");
              setShowSquareModal(true);
            };

            const handleSaveSquareDetails = async () => {
              if (
                selectedSquareIndex === null ||
                !db ||
                !gameId ||
                !currentUserId ||
                !playerData
              )
                return;

              const updatedCheckedSquares = playerData.checkedSquares.filter(
                (s) => s.index !== selectedSquareIndex
              );
              if (modalNames.length > 0) {
                updatedCheckedSquares.push({
                  index: selectedSquareIndex,
                  names: modalNames,
                });
              }

              const newScore = updatedCheckedSquares.length;

              try {
                const playerDocRef = doc(
                  db,
                  `artifacts/${appId}/public/data/bingoGames/${gameId}/players`,
                  currentUserId
                );
                await updateDoc(playerDocRef, {
                  checkedSquares: updatedCheckedSquares,
                  score: newScore,
                });
                showMessageModal("Square updated successfully!", "success");
              } catch (error) {
                console.error("Error updating square:", error);
                showMessageModal(
                  `Failed to update square: ${error.message}`,
                  "error"
                );
              } finally {
                setShowSquareModal(false);
                setSelectedSquareIndex(null);
              }
            };

            const handleModalToggleCheck = () => {
              const isCurrentlyChecked = modalNames.length > 0;
              if (isCurrentlyChecked) {
                setModalNames([]);
              } else {
                setModalNames([]);
              }
            };

            const handleModalAddName = () => {
              const trimmedName = modalNameInput.trim();
              if (trimmedName && !modalNames.includes(trimmedName)) {
                setModalNames([...modalNames, trimmedName]);
                setModalNameInput("");
              } else if (!trimmedName) {
                showMessageModal("Please enter a name to add.", "error");
              } else if (modalNames.includes(trimmedName)) {
                showMessageModal("This name has already been added.", "error");
              }
            };

            const handleModalRemoveName = (nameToRemove) => {
              setModalNames(modalNames.filter((name) => name !== nameToRemove));
            };

            if (loading) {
              return (
                <div className="flex items-center justify-center min-h-screen bg-blue-50 font-inter">
                  <div className="text-center text-gray-700 text-2xl font-semibold flex items-center font-inter-rounded">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-8 w-8 text-indigo-500"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Loading App...
                  </div>
                </div>
              );
            }

            let currentView;
            // New logic to determine which component to render based on authentication and selected role
            if (!currentUserId) {
              // If not authenticated, show AuthScreen
              currentView = (
                <AuthScreen
                  auth={auth}
                  showMessageModal={showMessageModal}
                  onAuthSuccess={handleAuthSuccess}
                />
              );
            } else if (selectedRole === null) {
              // If authenticated but role not selected, show LandingPage
              currentView = <LandingPage onSelectRole={handleSelectRole} />;
            } else if (selectedRole === "admin" && !gameId) {
              // Authenticated admin, no game created yet
              currentView = (
                <AdminSetup
                  onGameCreated={handleGameCreated}
                  userId={currentUserId}
                  db={db}
                  appId={appId}
                  showError={showMessageModal}
                  geminiApiKey={geminiApiKey}
                  onBackToRoleSelection={handleBackToRoleSelection}
                  onSignOut={() => handleSignOut(signOut)}
                />
              );
            } else if (selectedRole === "player" && !gameId) {
              // Authenticated player, not joined a game yet
              currentView = (
                <LoginPage
                  onAdminLogin={handleAdminLogin}
                  onJoinGame={handleJoinGame}
                  showError={showMessageModal}
                  onBackToRoleSelection={handleBackToRoleSelection}
                  onSignOut={() => handleSignOut(signOut)}
                />
              );
            } else if (gameId && gameData?.status === "waiting") {
              currentView = (
                <WaitingRoom
                  game={gameData}
                  players={gamePlayers}
                  isAdmin={isAdminState}
                  roomCode={gameId}
                  db={db}
                  appId={appId}
                  showError={showMessageModal}
                  onAskMore={handleAskMore}
                  currentUserId={currentUserId}
                  isGeneratingAskMore={isGeneratingAskMore}
                  onBackToLogin={handleBackToLogin}
                  showSuccess={showMessageModal}
                  onBackToRoleSelection={handleBackToRoleSelection}
                  onSignOut={() => handleSignOut(signOut)}
                />
              );
            } else if (gameId && gameData?.status === "playing" && playerData) {
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
                    db={db}
                    appId={appId}
                    onBackToRoleSelection={handleBackToRoleSelection}
                    onSignOut={() => handleSignOut(signOut)}
                  />
                  <SquareDetailsModal
                    show={showSquareModal}
                    onClose={() => setShowSquareModal(false)}
                    onSave={handleSaveSquareDetails}
                    question={gameData?.questions[selectedSquareIndex]}
                    currentNames={modalNames}
                    isChecked={modalNames.length > 0}
                    onToggleCheck={handleModalToggleCheck}
                    onAddName={handleModalAddName}
                    onRemoveName={handleModalRemoveName}
                    nameInput={modalNameInput}
                    onNameInputChange={(e) => setModalNameInput(e.target.value)}
                  />
                </>
              );
            } else if (
              gameId &&
              (gameData?.status === "scoring" || gameData?.status === "ended")
            ) {
              currentView = (
                <Scoreboard
                  game={gameData}
                  players={gamePlayers}
                  isAdmin={isAdminState}
                  onBackToLogin={handleBackToLogin}
                  onPlayAgain={handleAdminLogin}
                  currentUserId={currentUserId}
                  showSuccess={showMessageModal}
                  showError={showMessageModal}
                  db={db}
                  appId={appId}
                  onBackToRoleSelection={handleBackToRoleSelection}
                  onSignOut={() => handleSignOut(signOut)}
                />
              );
            } else {
              // Fallback to AuthScreen if state is unexpected (e.g., game ended, but user still authenticated)
              currentView = (
                <AuthScreen
                  auth={auth}
                  showMessageModal={showMessageModal}
                  onAuthSuccess={handleAuthSuccess}
                />
              );
            }

            return currentView;
          }}
        </AuthAndGameHandler>
      </div>
      <MessageModal
        message={message}
        type={messageType}
        onClose={() => setMessage(null)}
      />
    </div>
  );
};

export default App;
