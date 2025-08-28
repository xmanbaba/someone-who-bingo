// Scoreboard.jsx
import React, { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

/* ---------- Modal ---------- */
const PlayerBoardModal = ({
  show,
  onClose,
  player,
  game,
  isAdmin,
  db,
  appId,
  onToggleCorrect,
}) => {
  if (!show || !player || !game) return null;

  const grid = [];
  const checkedMap = new Map(
    (player.checkedSquares || []).map((s) => [
      s.index,
      { names: s.names, correct: s.correct ?? null },
    ])
  );

  for (let i = 0; i < game.gridSize * game.gridSize; i++) {
    grid.push({
      index: i,
      question: game.questions[i],
      isChecked: checkedMap.has(i),
      names: checkedMap.get(i)?.names || [],
      correct: checkedMap.get(i)?.correct ?? null,
    });
  }

  const handleMark = async (idx, mark) => {
    try {
      const updated = [...(player.checkedSquares || [])];
      const entry = updated.find((s) => s.index === idx);
      if (entry) {
        entry.correct = mark;
        await updateDoc(
          doc(
            db,
            `artifacts/${appId}/public/data/bingoGames/${game.id}/players`,
            player.id
          ),
          { checkedSquares: updated }
        );
        onToggleCorrect();
      }
    } catch (error) {
      console.error("Error updating player score:", error);
      alert("Failed to update score. Please try again.");
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-4 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold mb-4 text-center">
          {player.name}'s Grid
        </h3>
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${game.gridSize}, minmax(0, 1fr))`,
          }}
        >
          {grid.map((sq) => (
            <div
              key={sq.index}
              className={`p-2 text-xs rounded-md border text-center overflow-hidden ${
                sq.isChecked
                  ? sq.correct === true
                    ? "bg-green-200 border-green-500"
                    : sq.correct === false
                    ? "bg-red-200 border-red-500"
                    : "bg-yellow-200"
                  : "bg-gray-100"
              }`}
            >
              <div className="font-medium text-gray-800 text-xs mb-1 max-h-16 overflow-y-auto break-words">
                {sq.question}
              </div>
              {sq.isChecked && (
                <>
                  <div className="text-gray-700 text-[10px] max-h-12 overflow-y-auto break-words">
                    {sq.names.join(", ")}
                  </div>
                  {isAdmin && (
                    <div className="flex justify-center gap-1 mt-1">
                      <button
                        onClick={() => handleMark(sq.index, true)}
                        className="px-2 py-0.5 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => handleMark(sq.index, false)}
                        className="px-2 py-0.5 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                      >
                        ✗
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Close
        </button>
      </div>
    </div>
  );
};

/* ---------- Scoreboard ---------- */
const Scoreboard = ({
  game,
  players,
  isAdmin,
  onPlayAgain,
  onBackToLogin,
  currentUserId,
  db,
  appId,
  connectionError,
}) => {
  const navigate = useNavigate();
  const [openBoard, setOpenBoard] = useState(null);

  // Add null checks for game and players
  if (!game) {
    return (
      <div className="space-y-6 p-4 sm:p-6 md:p-8 bg-white rounded-3xl shadow-xl max-w-5xl mx-auto border-2 border-purple-300">
        <div className="text-center">
          {connectionError ? (
            <>
              <h2 className="text-2xl font-bold text-red-600 mb-4">
                ⚠️ Connection Error
              </h2>
              <p className="text-gray-600 mb-4">
                Unable to load game data. Please check your connection and try
                again.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Retry
              </button>
            </>
          ) : (
            <>
              <div className="animate-spin h-12 w-12 text-purple-500 mx-auto mb-4">
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
              <p className="text-gray-600">Loading game results...</p>
            </>
          )}
        </div>
        <div className="flex justify-center mt-6">
          <button
            onClick={() => {
              onBackToLogin();
              navigate("/role");
            }}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            🚪 Back to Menu
          </button>
        </div>
      </div>
    );
  }

  if (!players || players.length === 0) {
    return (
      <div className="space-y-6 p-4 sm:p-6 md:p-8 bg-white rounded-3xl shadow-xl max-w-5xl mx-auto border-2 border-purple-300">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-purple-800">
          🏁 Final Scoreboard
        </h2>
        <div className="text-center">
          <p className="text-gray-600 text-lg mb-4">
            No players found in this game.
          </p>
          <button
            onClick={() => {
              onBackToLogin();
              navigate("/role");
            }}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            🚪 Back to Menu
          </button>
        </div>
      </div>
    );
  }

  const computePlayerScore = (player, gameData) => {
    const filled = player?.checkedSquares?.length || 0;
    const correct = (player?.checkedSquares || []).filter(
      (s) => s.correct === true
    ).length;

    const gridSize = gameData?.gridSize || 5;
    const totalSquares = gridSize * gridSize;

    const completionScore = (filled / totalSquares) * 40;
    const accuracyScore = filled === 0 ? 0 : (correct / filled) * 60;

    // Fixed time score calculation - use elapsed time from game start
    let timeScore = Infinity;

    try {
      let gameStartTime = null;
      let playerEndTime = null;

      // Get game start time
      if (gameData?.startTime) {
        if (typeof gameData.startTime.toMillis === "function") {
          gameStartTime = gameData.startTime.toMillis();
        } else if (typeof gameData.startTime === "number") {
          gameStartTime = gameData.startTime;
        } else if (gameData.startTime.seconds) {
          gameStartTime =
            gameData.startTime.seconds * 1000 +
            (gameData.startTime.nanoseconds || 0) / 1000000;
        }
      }

      // Get player's submission/end time (when they actually finished)
      if (player?.submissionTime) {
        if (typeof player.submissionTime.toMillis === "function") {
          playerEndTime = player.submissionTime.toMillis();
        } else if (typeof player.submissionTime === "number") {
          playerEndTime = player.submissionTime;
        } else if (player.submissionTime.seconds) {
          playerEndTime =
            player.submissionTime.seconds * 1000 +
            (player.submissionTime.nanoseconds || 0) / 1000000;
        }
      }

      // Fallback to endTime if submissionTime doesn't exist
      if (!playerEndTime && player?.endTime) {
        if (typeof player.endTime.toMillis === "function") {
          playerEndTime = player.endTime.toMillis();
        } else if (typeof player.endTime === "number") {
          playerEndTime = player.endTime;
        } else if (player.endTime.seconds) {
          playerEndTime =
            player.endTime.seconds * 1000 +
            (player.endTime.nanoseconds || 0) / 1000000;
        }
      }

      // Calculate elapsed time from game start to when player finished
      if (gameStartTime && playerEndTime && playerEndTime >= gameStartTime) {
        const elapsedMs = playerEndTime - gameStartTime;
        timeScore = elapsedMs / 1000; // Convert to seconds

        // Cap at game duration to prevent showing impossible times
        const maxTimeSeconds = (gameData?.timerDuration || 10) * 60;
        timeScore = Math.min(timeScore, maxTimeSeconds);
      }
    } catch (error) {
      console.warn("Error calculating time score:", error);
    }

    return {
      completionScore,
      accuracyScore,
      aggregate: completionScore + accuracyScore,
      timeScore,
      filled,
      correct,
      totalSquares,
    };
  };

  const sortedPlayers = [...players]
    .map((p) => ({ ...p, ...computePlayerScore(p, game) }))
    .sort((a, b) => b.aggregate - a.aggregate);

  const handleShareResults = async () => {
    try {
      // Mark the game as having a public scoreboard
      if (isAdmin && db && appId) {
        await updateDoc(
          doc(db, `artifacts/${appId}/public/data/bingoGames`, game.id),
          { publicScoreboard: true }
        );
      }

      const shareUrl = `${window.location.origin}/public-score/${appId}/${game.id}`;
      navigator.clipboard
        .writeText(shareUrl)
        .then(() =>
          alert(
            "Public scoreboard link copied! Anyone can view this link without needing an account."
          )
        )
        .catch(() => alert("Copy failed – please copy manually"));
    } catch (error) {
      console.error("Error updating public scoreboard flag:", error);
      // Still share the link even if the update fails
      const shareUrl = `${window.location.origin}/public-score/${appId}/${game.id}`;
      navigator.clipboard
        .writeText(shareUrl)
        .then(() => alert("Public scoreboard link copied!"))
        .catch(() => alert("Copy failed – please copy manually"));
    }
  };

  const formatTime = (timeInSeconds) => {
    if (
      timeInSeconds === Infinity ||
      isNaN(timeInSeconds) ||
      timeInSeconds <= 0
    ) {
      return "N/A";
    }

    if (timeInSeconds < 60) {
      return `${timeInSeconds.toFixed(1)}s`;
    } else {
      const minutes = Math.floor(timeInSeconds / 60);
      const seconds = Math.floor(timeInSeconds % 60);
      return `${minutes}m ${seconds}s`;
    }
  };

  return (
    <>
      <div className="space-y-6 p-4 sm:p-6 md:p-8 bg-white rounded-3xl shadow-xl max-w-5xl mx-auto border-2 border-purple-300">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-purple-800">
          🏁 Final Scoreboard
        </h2>

        {/* Game Info */}
        <div className="bg-purple-50 p-4 rounded-xl text-center text-sm sm:text-base">
          <p>
            Game Code: <strong>{game.id}</strong> | Industry:{" "}
            <strong>{game.industry || "Unknown"}</strong> | Grid:{" "}
            <strong>
              {game.gridSize || 5}×{game.gridSize || 5}
            </strong>
          </p>
          <div className="flex justify-center mt-3">
            <button
              onClick={handleShareResults}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
            >
              🔗 Share Scoreboard
            </button>
          </div>
        </div>

        {/* Player Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border border-gray-300 rounded-xl overflow-hidden">
            <thead className="bg-gray-100 text-gray-700 font-semibold">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Player</th>
                <th className="px-3 py-2 text-right">Time</th>
                <th className="px-3 py-2 text-right">Completion</th>
                <th className="px-3 py-2 text-right">Accuracy</th>
                <th className="px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((p, i) => (
                <tr
                  key={p.id}
                  className={`border-t hover:bg-gray-50 cursor-pointer ${
                    p.id === currentUserId ? "bg-blue-50" : ""
                  }`}
                  onClick={() => setOpenBoard(p)}
                >
                  <td className="px-3 py-2">
                    {i === 0 && "🥇"} {i === 1 && "🥈"} {i === 2 && "🥉"}{" "}
                    {i + 1}
                  </td>
                  <td className="px-3 py-2">
                    {p.name} {p.id === currentUserId && "(You)"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatTime(p.timeScore)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {p.completionScore.toFixed(1)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {p.accuracyScore.toFixed(1)}
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-purple-700">
                    {p.aggregate.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          {isAdmin && (
            <button
              onClick={onPlayAgain}
              className="flex-1 py-3 rounded-xl text-white text-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
              🔄 Play Again
            </button>
          )}
          <button
            onClick={() => {
              onBackToLogin();
              navigate("/role");
            }}
            className="flex-1 py-3 rounded-xl text-white text-lg bg-gray-600 hover:bg-gray-700"
          >
            🚪 Exit
          </button>
        </div>
      </div>

      {/* Player Modal */}
      <PlayerBoardModal
        show={openBoard}
        onClose={() => setOpenBoard(null)}
        player={openBoard}
        game={game}
        isAdmin={isAdmin}
        db={db}
        appId={appId}
        onToggleCorrect={() => {}}
      />
    </>
  );
};

export default Scoreboard;
