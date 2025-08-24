import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";
import AuthAndGameHandler from "./components/AuthAndGameHandler";
import { useEffect } from "react";
/* Screens */
import Homepage from "./components/HomePage";
import AuthScreen from "./components/AuthScreen";
import LandingPage from "./components/LandingPage";
import AdminSetup from "./components/AdminSetup";
import LoginPage from "./components/LoginPage";
import WaitingRoom from "./components/WaitingRoom";
import PlayingGame from "./components/PlayingGame";
import Scoreboard from "./components/Scoreboard";
import Dashboard from "./components/Dashboard";
import PublicScoreboard from "./components/PublicScoreboard";

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

// Component to handle deep linking to games
const GameDeepLink = ({ children }) => {
  const { gameId: urlGameId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  return children({ urlGameId, location, navigate });
};

// Helper function to determine if we should show a game route or redirect
const shouldShowGameRoute = (
  gameId,
  gameData,
  connectionError,
  expectedStatus = null,
  urlGameId = null
) => {
  // If there's a connection error, allow the route to show (don't redirect)
  if (connectionError && (gameId || urlGameId)) {
    return true;
  }

  // If we have a URL game ID that doesn't match current game, allow it (for deep links)
  if (urlGameId && gameId !== urlGameId) {
    return true;
  }

  // If no gameId at all, redirect
  if (!gameId && !urlGameId) {
    return false;
  }

  // If we have gameId but no gameData yet, allow it (might be loading)
  if (!gameData) {
    return true;
  }

  // If we expect a specific status, check it
  if (expectedStatus) {
    return gameData.status === expectedStatus;
  }

  // Default to allowing the route
  return true;
};

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
            connectionError,
            retryCount,
            isAdmin,
            db,
            appId,
            geminiApiKey,
            handleAdminLogin,
            handleJoinGame,
            handleGameCreated,
            handleFinishGame,
            handleAskMore,
            handleBackToLogin,
            handleAutoJoinFromUrl,
            auth,
            createUserWithEmailAndPassword,
            signInWithEmailAndPassword,
            signInWithGoogle,
            signOut,
            getSession,
          } = props;

          const navigate = useNavigate();

          if (loading) return <LoadingScreen />;

          return (
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Homepage />} />

              {/* Deep link route for sharing game joins */}
              <Route
                path="/game/:gameId"
                element={
                  <GameDeepLink>
                    {({ urlGameId }) => {
                      // If user is not authenticated, redirect to auth with game info
                      if (!currentUserId) {
                        return (
                          <Navigate to={`/auth?join=${urlGameId}`} replace />
                        );
                      }

                      // If user is authenticated, auto-join the game
                      return <Navigate to={`/waiting/${urlGameId}`} replace />;
                    }}
                  </GameDeepLink>
                }
              />

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
                      onAutoJoinFromUrl={handleAutoJoinFromUrl}
                    />
                  ) : (
                    <Navigate to="/role" replace />
                  )
                }
              />

              {/* Dashboard route */}
              <Route
                path="/dashboard"
                element={
                  currentUserId ? (
                    <Dashboard
                      currentUserId={currentUserId}
                      db={db}
                      appId={appId}
                      auth={auth}
                      onSignOut={signOut}
                    />
                  ) : (
                    <Navigate to="/auth" replace />
                  )
                }
              />

              {/* Role selection */}
              <Route
                path="/role"
                element={
                  currentUserId ? (
                    <LandingPage
                      currentUserId={currentUserId}
                      auth={auth}
                      onSignOut={signOut}
                    />
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
                      auth={auth}
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
                      getSession={getSession}
                      currentUserId={currentUserId}
                      auth={auth}
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
                  <GameDeepLink>
                    {({ urlGameId, navigate }) => {
                      // Auto-join logic for deep links
                      useEffect(() => {
                        if (
                          currentUserId &&
                          urlGameId &&
                          urlGameId !== gameId &&
                          !connectionError
                        ) {
                          handleAutoJoinFromUrl(urlGameId, navigate);
                        }
                      }, [currentUserId, urlGameId, gameId, connectionError]);

                      // Allow route to show for URL game ID or current game ID
                      return shouldShowGameRoute(
                        gameId,
                        gameData,
                        connectionError,
                        null,
                        urlGameId
                      ) ? (
                        // Check status only if we have game data
                        gameData?.status === "playing" &&
                        gameId === urlGameId ? (
                          <Navigate to={`/play/${gameId}`} replace />
                        ) : (gameData?.status === "scoring" ||
                            gameData?.status === "ended") &&
                          gameId === urlGameId ? (
                          <Navigate to={`/score/${gameId}`} replace />
                        ) : (
                          <WaitingRoom
                            game={gameData}
                            players={gamePlayers}
                            isAdmin={
                              isAdmin ||
                              gameData?.adminId === currentUserId ||
                              gameData?.createdBy === currentUserId
                            }
                            roomCode={gameId || urlGameId}
                            db={db}
                            appId={appId}
                            showError={(msg) => alert(`error: ${msg}`)}
                            onAskMore={handleAskMore}
                            currentUserId={currentUserId}
                            isGeneratingAskMore={isGeneratingAskMore}
                            onBackToLogin={handleBackToLogin}
                            showSuccess={(msg) => alert(`success: ${msg}`)}
                            connectionError={connectionError}
                            retryCount={retryCount}
                            auth={auth}
                            onSignOut={signOut}
                          />
                        )
                      ) : (
                        <Navigate to="/role" replace />
                      );
                    }}
                  </GameDeepLink>
                }
              />

              {/* Playing */}
              <Route
                path="/play/:gameId"
                element={
                  <GameDeepLink>
                    {({ urlGameId }) => {
                      return shouldShowGameRoute(
                        gameId,
                        gameData,
                        connectionError,
                        null,
                        urlGameId
                      ) &&
                        ((gameData?.status === "playing" &&
                          gameId === urlGameId) ||
                          connectionError) ? (
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
                          connectionError={connectionError}
                          retryCount={retryCount}
                          auth={auth}
                        />
                      ) : (
                        <Navigate to="/role" replace />
                      );
                    }}
                  </GameDeepLink>
                }
              />

              {/* Scoreboard - authenticated users - FIXED ROUTING */}
              <Route
                path="/score/:gameId"
                element={
                  <GameDeepLink>
                    {({ urlGameId }) => {
                      // Check if user is authenticated
                      if (!currentUserId) {
                        return <Navigate to="/auth" replace />;
                      }

                      // Always allow access to scoreboards for authenticated users
                      // This fixes the issue where direct links weren't working
                      return (
                        <Scoreboard
                          game={gameData}
                          players={gamePlayers}
                          isAdmin={
                            isAdmin ||
                            gameData?.adminId === currentUserId ||
                            gameData?.createdBy === currentUserId
                          }
                          onBackToLogin={handleBackToLogin}
                          onPlayAgain={handleAdminLogin}
                          currentUserId={currentUserId}
                          showSuccess={(msg) => alert(`success: ${msg}`)}
                          showError={(msg) => alert(`error: ${msg}`)}
                          db={db}
                          appId={appId}
                          onBackToRoleSelection={() => window.history.back()}
                          onSignOut={() => signOut()}
                          connectionError={connectionError}
                          retryCount={retryCount}
                          auth={auth}
                        />
                      );
                    }}
                  </GameDeepLink>
                }
              />

              {/* Public Scoreboard - no authentication required */}
              <Route
                path="/public-score/:appId/:gameId"
                element={<PublicScoreboard />}
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
