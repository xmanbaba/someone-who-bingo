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

// Fixed GameDeepLink component - hooks must always be called in the same order
const GameDeepLink = ({ children }) => {
  const { gameId: urlGameId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Always call children as a function - don't conditionally render
  return children({ urlGameId, location, navigate });
};

// Fixed WaitingRoomHandler - separate component to handle auto-join logic
const WaitingRoomHandler = ({
  urlGameId,
  navigate,
  currentUserId,
  gameId,
  gameData,
  connectionError,
  handleAutoJoinFromUrl,
  isAdmin,
  gamePlayers,
  db,
  appId,
  handleAskMore,
  isGeneratingAskMore,
  handleBackToLogin,
  signOut,
  auth,
  retryCount,
}) => {
  // Auto-join logic for deep links - hooks always called
  useEffect(() => {
    if (
      currentUserId &&
      urlGameId &&
      urlGameId !== gameId &&
      !connectionError
    ) {
      handleAutoJoinFromUrl(urlGameId, navigate);
    }
  }, [
    currentUserId,
    urlGameId,
    gameId,
    connectionError,
    handleAutoJoinFromUrl,
    navigate,
  ]);

  // Handle navigation based on game status - FIXED: More specific navigation logic
  useEffect(() => {
    if (gameData && gameId === urlGameId) {
      console.log(
        `WaitingRoom: Game status changed to ${gameData.status} for game ${gameId}`
      );

      if (gameData.status === "playing") {
        console.log(`Navigating from waiting to play/${gameId}`);
        navigate(`/play/${gameId}`, { replace: true });
      } else if (gameData.status === "scoring" || gameData.status === "ended") {
        console.log(`Navigating from waiting to score/${gameId}`);
        navigate(`/score/${gameId}`, { replace: true });
      }
    }
  }, [gameData?.status, gameId, urlGameId, navigate]);

  // Show loading state while waiting for data
  if (!gameData && !connectionError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-blue-50">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 text-blue-500 mx-auto">
            <svg fill="none" viewBox="0 0 24 24">
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
          </div>
          <div className="text-gray-700 text-xl font-semibold">
            Loading Game...
          </div>
        </div>
      </div>
    );
  }

  // Show connection error
  if (connectionError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-blue-50">
        <div className="text-center space-y-4">
          <div className="text-red-600 font-bold text-xl">Connection Issue</div>
          <div className="text-gray-600">
            Reconnecting... (Attempt {retryCount}/3)
          </div>
          <div className="animate-spin h-8 w-8 text-blue-500 mx-auto">
            <svg fill="none" viewBox="0 0 24 24">
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
          </div>
        </div>
      </div>
    );
  }

  // If no game data and no connection error, redirect
  if (!gameData) {
    return <Navigate to="/role" replace />;
  }

  // Render waiting room
  return (
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
  );
};

// Fixed PlayingGameHandler
const PlayingGameHandler = ({
  urlGameId,
  gameId,
  gameData,
  connectionError,
  playerData,
  gamePlayers,
  handleFinishGame,
  handleAskMore,
  isGeneratingAskMore,
  currentUserId,
  db,
  appId,
  signOut,
  auth,
  retryCount,
  navigate,
}) => {
  // Handle navigation based on game status changes - FIXED: Enhanced navigation logic
  useEffect(() => {
    if (gameData && gameId === urlGameId) {
      console.log(
        `PlayingGame: Game status changed to ${gameData.status} for game ${gameId}`
      );

      if (gameData.status === "scoring" || gameData.status === "ended") {
        console.log(`Navigating from playing to score/${gameId}`);
        // Use replace to prevent back navigation to playing screen
        navigate(`/score/${gameId}`, { replace: true });
      }
      // Don't navigate away if status is still "playing" - stay on current screen
    }
  }, [gameData?.status, gameId, urlGameId, navigate]);

  // FIXED: More permissive conditions for showing the playing game
  // Show if we're supposed to be here OR if there's a connection error (for resilience)
  const shouldShow =
    gameData &&
    (gameData.status === "playing" || connectionError || !gameData.status) && // Handle cases where status might be temporarily undefined
    gameId === urlGameId;

  if (!shouldShow && gameData) {
    // Only redirect if we have valid game data and are clearly not supposed to be here
    if (gameData.status === "waiting") {
      return <Navigate to={`/waiting/${gameId}`} replace />;
    } else if (gameData.status === "scoring" || gameData.status === "ended") {
      return <Navigate to={`/score/${gameId}`} replace />;
    }
    return <Navigate to="/role" replace />;
  }

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
      onBackToRoleSelection={() => window.history.back()}
      onSignOut={() => signOut()}
      connectionError={connectionError}
      retryCount={retryCount}
      auth={auth}
    />
  );
};

// NEW: ScoreboardHandler to handle scoreboard-specific navigation
const ScoreboardHandler = ({
  urlGameId,
  gameId,
  gameData,
  connectionError,
  gamePlayers,
  isAdmin,
  currentUserId,
  handleBackToLogin,
  handleAdminLogin,
  db,
  appId,
  signOut,
  auth,
  retryCount,
  navigate,
}) => {
  // Allow access to scoreboard if:
  // 1. Game is in scoring/ended state, OR
  // 2. There's a connection error (for resilience), OR
  // 3. We don't have game data yet (loading state)
  const shouldShow =
    !gameData ||
    connectionError ||
    gameData.status === "scoring" ||
    gameData.status === "ended";

  // If we have game data and it's not in a scoreboard-appropriate state, redirect
  if (gameData && !connectionError) {
    if (gameData.status === "waiting") {
      return <Navigate to={`/waiting/${gameId}`} replace />;
    } else if (gameData.status === "playing") {
      return <Navigate to={`/play/${gameId}`} replace />;
    }
  }

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

          if (loading) return <LoadingScreen />;

          return (
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Homepage />} />

              {/* FIXED: Direct game join route (/:gameId) for autojoin functionality */}
              <Route
                path="/:gameId"
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

              {/* Legacy deep link route for sharing game joins */}
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
                    {({ urlGameId, navigate }) => (
                      <WaitingRoomHandler
                        urlGameId={urlGameId}
                        navigate={navigate}
                        currentUserId={currentUserId}
                        gameId={gameId}
                        gameData={gameData}
                        connectionError={connectionError}
                        handleAutoJoinFromUrl={handleAutoJoinFromUrl}
                        isAdmin={isAdmin}
                        gamePlayers={gamePlayers}
                        db={db}
                        appId={appId}
                        handleAskMore={handleAskMore}
                        isGeneratingAskMore={isGeneratingAskMore}
                        handleBackToLogin={handleBackToLogin}
                        signOut={signOut}
                        auth={auth}
                        retryCount={retryCount}
                      />
                    )}
                  </GameDeepLink>
                }
              />

              {/* Playing */}
              <Route
                path="/play/:gameId"
                element={
                  <GameDeepLink>
                    {({ urlGameId, navigate }) => (
                      <PlayingGameHandler
                        urlGameId={urlGameId}
                        navigate={navigate}
                        gameId={gameId}
                        gameData={gameData}
                        connectionError={connectionError}
                        playerData={playerData}
                        gamePlayers={gamePlayers}
                        handleFinishGame={handleFinishGame}
                        handleAskMore={handleAskMore}
                        isGeneratingAskMore={isGeneratingAskMore}
                        currentUserId={currentUserId}
                        db={db}
                        appId={appId}
                        signOut={signOut}
                        auth={auth}
                        retryCount={retryCount}
                      />
                    )}
                  </GameDeepLink>
                }
              />

              {/* FIXED: Scoreboard - authenticated users */}
              <Route
                path="/score/:gameId"
                element={
                  <GameDeepLink>
                    {({ urlGameId, navigate }) => {
                      // Check if user is authenticated
                      if (!currentUserId) {
                        return <Navigate to="/auth" replace />;
                      }

                      // Use dedicated ScoreboardHandler
                      return (
                        <ScoreboardHandler
                          urlGameId={urlGameId}
                          navigate={navigate}
                          gameId={gameId}
                          gameData={gameData}
                          connectionError={connectionError}
                          gamePlayers={gamePlayers}
                          isAdmin={isAdmin}
                          currentUserId={currentUserId}
                          handleBackToLogin={handleBackToLogin}
                          handleAdminLogin={handleAdminLogin}
                          db={db}
                          appId={appId}
                          signOut={signOut}
                          auth={auth}
                          retryCount={retryCount}
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
