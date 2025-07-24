import React, { useState } from "react";
import AuthAndGameHandler from "./components/AuthAndGameHandler";
import AuthScreen from "./components/AuthScreen";
import LandingPage from "./components/LandingPage";
import AdminSetup from "./components/AdminSetup";
import LoginPage from "./components/LoginPage";
import WaitingRoom from "./components/WaitingRoom";
import PlayingGame from "./components/PlayingGame";
import SquareDetailsModal from "./components/SquareDetailsModal";
import Scoreboard from "./components/Scoreboard";

const App = () => {
  const [selectedRole, setSelectedRole] = useState(null);

  const handleSelectRole = (role) => {
    setSelectedRole(role);
  };

  const handleBackToRoleSelection = () => {
    setSelectedRole(null);
  };

  const handleAuthSuccess = (user) => {
    console.log("Authenticated User:", user);
  };

  const handleSignOut = async (signOutFn) => {
    try {
      await signOutFn();
      setSelectedRole(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const LoadingScreen = () => (
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

  return (
    <AuthAndGameHandler
      showMessageModal={(msg, type) => alert(`${type}: ${msg}`)}
    >
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
        signInWithGoogle,
        signOut,
      }) => {
        if (loading) return <LoadingScreen />;

        let currentView;

        if (!currentUserId) {
          currentView = (
            <AuthScreen
              auth={auth}
              showMessageModal={(msg, type) => alert(`${type}: ${msg}`)}
              onAuthSuccess={handleAuthSuccess}
              createUserWithEmailAndPassword={createUserWithEmailAndPassword}
              signInWithEmailAndPassword={signInWithEmailAndPassword}
              signInWithGoogle={signInWithGoogle}
            />
          );
        } else if (selectedRole === null) {
          currentView = <LandingPage onSelectRole={handleSelectRole} />;
        } else if (selectedRole === "admin" && !gameId) {
          currentView = (
            <AdminSetup
              onGameCreated={handleGameCreated}
              userId={currentUserId}
              db={db}
              appId={appId}
              showError={(msg) => alert(`error: ${msg}`)}
              geminiApiKey={geminiApiKey}
              onBackToRoleSelection={handleBackToRoleSelection}
              onSignOut={() => handleSignOut(signOut)}
            />
          );
        } else if (selectedRole === "player" && !gameId) {
          currentView = (
            <LoginPage
              onAdminLogin={handleAdminLogin}
              onJoinGame={handleJoinGame}
              showError={(msg) => alert(`error: ${msg}`)}
              onBackToRoleSelection={handleBackToRoleSelection}
              onSignOut={() => handleSignOut(signOut)}
            />
          );
        } else if (gameId && gameData?.status === "waiting") {
          currentView = (
            <WaitingRoom
              game={gameData}
              players={gamePlayers}
              isAdmin={selectedRole === "admin"}
              roomCode={gameId}
              db={db}
              appId={appId}
              showError={(msg) => alert(`error: ${msg}`)}
              onAskMore={handleAskMore}
              currentUserId={currentUserId}
              isGeneratingAskMore={isGeneratingAskMore}
              onBackToLogin={handleBackToLogin}
              showSuccess={(msg) => alert(`success: ${msg}`)}
              onBackToRoleSelection={handleBackToRoleSelection}
              onSignOut={() => handleSignOut(signOut)}
            />
          );
        } else if (gameId && gameData?.status === "playing" && playerData) {
          currentView = (
            <PlayingGame
              game={gameData}
              player={playerData}
              onSquareClick={() => {}}
              gamePlayers={gamePlayers}
              onFinishGame={handleFinishGame}
              showError={(msg) => alert(`error: ${msg}`)}
              onAskMore={handleAskMore}
              isGeneratingAskMore={isGeneratingAskMore}
              showSuccess={(msg) => alert(`success: ${msg}`)}
              currentUserId={currentUserId}
              db={db}
              appId={appId}
              onBackToRoleSelection={handleBackToRoleSelection}
              onSignOut={() => handleSignOut(signOut)}
            />
          );
        } else if (
          gameId &&
          (gameData?.status === "scoring" || gameData?.status === "ended")
        ) {
          currentView = (
            <Scoreboard
              game={gameData}
              players={gamePlayers}
              isAdmin={selectedRole === "admin"}
              onBackToLogin={handleBackToLogin}
              onPlayAgain={handleAdminLogin}
              currentUserId={currentUserId}
              showSuccess={(msg) => alert(`success: ${msg}`)}
              showError={(msg) => alert(`error: ${msg}`)}
              db={db}
              appId={appId}
              onBackToRoleSelection={handleBackToRoleSelection}
              onSignOut={() => handleSignOut(signOut)}
            />
          );
        } else {
          currentView = (
            <AuthScreen
              auth={auth}
              showMessageModal={(msg, type) => alert(`${type}: ${msg}`)}
              onAuthSuccess={handleAuthSuccess}
              createUserWithEmailAndPassword={createUserWithEmailAndPassword}
              signInWithEmailAndPassword={signInWithEmailAndPassword}
              signInWithGoogle={signInWithGoogle}
            />
          );
        }

        return currentView;
      }}
    </AuthAndGameHandler>
  );
};

export default App;
