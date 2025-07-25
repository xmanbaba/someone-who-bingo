import React, { useState } from "react";
import Homepage from "./components/HomePage"; // ← NEW
import AuthAndGameHandler from "./components/AuthAndGameHandler";
import AuthScreen from "./components/AuthScreen";
import LandingPage from "./components/LandingPage";
import AdminSetup from "./components/AdminSetup";
import LoginPage from "./components/LoginPage";
import WaitingRoom from "./components/WaitingRoom";
import PlayingGame from "./components/PlayingGame";
import Scoreboard from "./components/Scoreboard";

const App = () => {
  // NEW: track which screen to show
  const [screen, setScreen] = useState("home"); // home | auth | game...
  const [selectedRole, setSelectedRole] = useState(null);

  const LoadingScreen = () => (
    <div className="flex items-center justify-center min-h-screen bg-blue-50">
      <svg
        className="animate-spin h-8 w-8 text-indigo-500"
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
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        ></path>
      </svg>
      <span className="ml-3 text-gray-700 text-2xl font-semibold">
        Loading App...
      </span>
    </div>
  );

  // ---------- ROUTING LOGIC ----------
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

        // NEW: Homepage → Auth → Role → Game
        if (!currentUserId) {
          if (screen === "home") {
            return <Homepage onNavigate={() => setScreen("auth")} />;
          }
          return (
            <AuthScreen
              auth={auth}
              showMessageModal={(msg, type) => alert(`${type}: ${msg}`)}
              onAuthSuccess={() => setScreen("role")}
              createUserWithEmailAndPassword={createUserWithEmailAndPassword}
              signInWithEmailAndPassword={signInWithEmailAndPassword}
              signInWithGoogle={signInWithGoogle}
            />
          );
        }

        if (screen === "role" || selectedRole === null) {
          return <LandingPage onSelectRole={(r) => setSelectedRole(r)} />;
        }

        // ... same role / game flow you already had ...
        if (selectedRole === "admin" && !gameId) {
          return (
            <AdminSetup
              onGameCreated={handleGameCreated}
              userId={currentUserId}
              db={db}
              appId={appId}
              showError={(msg) => alert(`error: ${msg}`)}
              geminiApiKey={geminiApiKey}
              onBackToRoleSelection={() => setSelectedRole(null)}
              onSignOut={() => signOut()}
            />
          );
        }

        if (selectedRole === "player" && !gameId) {
          return (
            <LoginPage
              onAdminLogin={handleAdminLogin}
              onJoinGame={handleJoinGame}
              showError={(msg) => alert(`error: ${msg}`)}
              onBackToRoleSelection={() => setSelectedRole(null)}
              onSignOut={() => signOut()}
            />
          );
        }

        if (gameId && gameData?.status === "waiting") {
          return (
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
              onBackToRoleSelection={() => setSelectedRole(null)}
              onSignOut={() => signOut()}
            />
          );
        }

        if (gameId && gameData?.status === "playing" && playerData) {
          return (
            <PlayingGame
              game={gameData}
              player={playerData}
              gamePlayers={gamePlayers}
              onFinishGame={handleFinishGame}
              showError={(msg) => alert(`error: ${msg}`)}
              showSuccess={(msg) => alert(`success: ${msg}`)}
              onAskMore={handleAskMore}
              isGeneratingAskMore={isGeneratingAskMore}
              currentUserId={currentUserId}
              db={db}
              appId={appId}
              onBackToRoleSelection={() => setSelectedRole(null)}
              onSignOut={() => signOut()}
            />
          );
        }

        if (
          gameId &&
          (gameData?.status === "scoring" || gameData?.status === "ended")
        ) {
          return (
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
              onBackToRoleSelection={() => setSelectedRole(null)}
              onSignOut={() => signOut()}
            />
          );
        }

        return <LoadingScreen />;
      }}
    </AuthAndGameHandler>
  );
};

export default App;
