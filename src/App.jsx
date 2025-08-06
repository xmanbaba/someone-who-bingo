import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthAndGameHandler from "./components/AuthAndGameHandler";

/* Screens */
import Homepage from "./components/Homepage";
import AuthScreen from "./components/AuthScreen";
import LandingPage from "./components/LandingPage";
import AdminSetup from "./components/AdminSetup";
import LoginPage from "./components/LoginPage";
import WaitingRoom from "./components/WaitingRoom";
import PlayingGame from "./components/PlayingGame";
import Scoreboard from "./components/Scoreboard";

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
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
    <span className="ml-3 text-gray-700 text-2xl font-semibold">
      Loading App...
    </span>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <AuthAndGameHandler
        showMessageModal={(msg, type) => alert(`${type}: ${msg}`)}
      >
        {(props) => {
          const {
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
          } = props;

          if (loading) return <LoadingScreen />;

          return (
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Homepage />} />
              <Route
                path="/auth"
                element={
                  !currentUserId ? (
                    <AuthScreen
                      auth={auth}
                      showMessageModal={(msg, type) => alert(`${type}: ${msg}`)}
                      createUserWithEmailAndPassword={
                        createUserWithEmailAndPassword
                      }
                      signInWithEmailAndPassword={signInWithEmailAndPassword}
                      signInWithGoogle={signInWithGoogle}
                    />
                  ) : (
                    <Navigate to="/role" replace />
                  )
                }
              />

              {/* Role selection */}
              <Route
                path="/role"
                element={
                  currentUserId ? (
                    <LandingPage />
                  ) : (
                    <Navigate to="/auth" replace />
                  )
                }
              />

              {/* Admin create game */}
              <Route
                path="/admin/setup"
                element={
                  currentUserId ? (
                    <AdminSetup
                      onGameCreated={handleGameCreated}
                      userId={currentUserId}
                      db={db}
                      appId={appId}
                      geminiApiKey={geminiApiKey}
                      showError={(msg) => alert(`error: ${msg}`)}
                      onBackToRoleSelection={() => window.history.back()}
                      onSignOut={() => signOut()}
                    />
                  ) : (
                    <Navigate to="/role" replace />
                  )
                }
              />

              {/* Player join game */}
              <Route
                path="/player/join"
                element={
                  currentUserId ? (
                    <LoginPage
                      onAdminLogin={handleAdminLogin}
                      onJoinGame={handleJoinGame}
                      showError={(msg) => alert(`error: ${msg}`)}
                      onBackToRoleSelection={() => window.history.back()}
                      onSignOut={() => signOut()}
                    />
                  ) : (
                    <Navigate to="/role" replace />
                  )
                }
              />

              {/* Waiting room */}
              <Route
                path="/waiting/:gameId"
                element={
                  gameId && gameData?.status === "waiting" ? (
                    <WaitingRoom
                      game={gameData}
                      players={gamePlayers}
                      isAdmin={gameData.adminId === currentUserId}
                      roomCode={gameId}
                      db={db}
                      appId={appId}
                      showError={(msg) => alert(`error: ${msg}`)}
                      onAskMore={handleAskMore}
                      currentUserId={currentUserId}
                      isGeneratingAskMore={isGeneratingAskMore}
                      onBackToLogin={handleBackToLogin}
                      showSuccess={(msg) => alert(`success: ${msg}`)}
                    />
                  ) : (
                    <Navigate to="/role" replace />
                  )
                }
              />

              {/* Playing */}
              <Route
                path="/play/:gameId"
                element={
                  gameId && gameData?.status === "playing" && playerData ? (
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
                      onBackToRoleSelection={() => window.history.back()}
                      onSignOut={() => signOut()}
                    />
                  ) : (
                    <Navigate to="/role" replace />
                  )
                }
              />

              {/* Scoreboard */}
              <Route
                path="/score/:gameId"
                element={
                  gameId &&
                  (gameData?.status === "scoring" ||
                    gameData?.status === "ended") ? (
                    <Scoreboard
                      game={gameData}
                      players={gamePlayers}
                      isAdmin={gameData.adminId === currentUserId}
                      onBackToLogin={handleBackToLogin}
                      onPlayAgain={handleAdminLogin}
                      currentUserId={currentUserId}
                      showSuccess={(msg) => alert(`success: ${msg}`)}
                      showError={(msg) => alert(`error: ${msg}`)}
                      db={db}
                      appId={appId}
                      onBackToRoleSelection={() => window.history.back()}
                      onSignOut={() => signOut()}
                    />
                  ) : (
                    <Navigate to="/role" replace />
                  )
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          );
        }}
      </AuthAndGameHandler>
    </BrowserRouter>
  );
}
