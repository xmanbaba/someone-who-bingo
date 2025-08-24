import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";

const ITEMS_PER_PAGE = 10;

// Player Board Modal Component
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

// Enhanced Scoreboard Modal
const ScoreboardModal = ({
  show,
  onClose,
  game,
  initialPlayers,
  isAdmin,
  currentUserId,
  db,
  appId,
}) => {
  const [openBoard, setOpenBoard] = useState(null);
  const [playersData, setPlayersData] = useState(initialPlayers || []);
  const [loading, setLoading] = useState(false);

  // Refresh players data when modal opens
  useEffect(() => {
    if (show && game && db) {
      refreshPlayersData();
    }
  }, [show, game?.id]);

  const refreshPlayersData = async () => {
    if (!game || !db) return;

    setLoading(true);
    try {
      const playersRef = collection(
        db,
        `artifacts/${appId}/public/data/bingoGames/${game.id}/players`
      );
      const playersSnapshot = await getDocs(playersRef);
      const freshPlayers = playersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPlayersData(freshPlayers);
    } catch (error) {
      console.error("Error refreshing players data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!show || !game) return null;

  const computePlayerScore = (player, gameData) => {
    const filled = player?.checkedSquares?.length || 0;
    const correct = (player?.checkedSquares || []).filter(
      (s) => s.correct === true
    ).length;

    const gridSize = gameData?.gridSize || 5;
    const totalSquares = gridSize * gridSize;

    const completionScore = (filled / totalSquares) * 40;
    const accuracyScore = filled === 0 ? 0 : (correct / filled) * 60;

    let timeScore = Infinity;

    try {
      let startTime = null;
      let endTime = null;

      if (player?.startTime) {
        if (typeof player.startTime.toMillis === "function") {
          startTime = player.startTime.toMillis();
        } else if (typeof player.startTime === "number") {
          startTime = player.startTime;
        } else if (player.startTime.seconds) {
          startTime =
            player.startTime.seconds * 1000 +
            (player.startTime.nanoseconds || 0) / 1000000;
        }
      }

      if (!startTime && gameData?.startTime) {
        if (typeof gameData.startTime.toMillis === "function") {
          startTime = gameData.startTime.toMillis();
        } else if (typeof gameData.startTime === "number") {
          startTime = gameData.startTime;
        } else if (gameData.startTime.seconds) {
          startTime =
            gameData.startTime.seconds * 1000 +
            (gameData.startTime.nanoseconds || 0) / 1000000;
        }
      }

      if (player?.endTime) {
        if (typeof player.endTime.toMillis === "function") {
          endTime = player.endTime.toMillis();
        } else if (typeof player.endTime === "number") {
          endTime = player.endTime;
        } else if (player.endTime.seconds) {
          endTime =
            player.endTime.seconds * 1000 +
            (player.endTime.nanoseconds || 0) / 1000000;
        }
      }

      if (!endTime && player?.submissionTime) {
        if (typeof player.submissionTime.toMillis === "function") {
          endTime = player.submissionTime.toMillis();
        } else if (typeof player.submissionTime === "number") {
          endTime = player.submissionTime;
        } else if (player.submissionTime.seconds) {
          endTime =
            player.submissionTime.seconds * 1000 +
            (player.submissionTime.nanoseconds || 0) / 1000000;
        }
      }

      if (startTime && endTime && endTime > startTime) {
        timeScore = (endTime - startTime) / 1000;
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

  const sortedPlayers = [...playersData]
    .map((p) => ({ ...p, ...computePlayerScore(p, game) }))
    .sort((a, b) => b.aggregate - a.aggregate);

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

  const handleShareResults = async () => {
    try {
      if (isAdmin) {
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
      const shareUrl = `${window.location.origin}/public-score/${appId}/${game.id}`;
      navigator.clipboard
        .writeText(shareUrl)
        .then(() => alert("Public scoreboard link copied!"))
        .catch(() => alert("Copy failed – please copy manually"));
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-40 p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl md:text-3xl font-bold text-purple-800">
                🏁 Game Scoreboard
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={refreshPlayersData}
                  disabled={loading}
                  className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 disabled:opacity-50"
                >
                  {loading ? "Refreshing..." : "🔄"}
                </button>
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Game Info */}
            <div className="bg-purple-50 p-4 rounded-xl text-center text-sm sm:text-base">
              <p>
                Game Code: <strong>{game.id}</strong> | Industry:{" "}
                <strong>{game.industry}</strong> | Grid:{" "}
                <strong>
                  {game.gridSize}×{game.gridSize}
                </strong>
              </p>
              <div className="flex justify-center mt-3">
                <button
                  onClick={handleShareResults}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                >
                  🔗 Share Public Scoreboard
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
          </div>
        </div>
      </div>

      {/* Player Board Modal */}
      <PlayerBoardModal
        show={openBoard}
        onClose={() => setOpenBoard(null)}
        player={openBoard}
        game={game}
        isAdmin={isAdmin}
        db={db}
        appId={appId}
        onToggleCorrect={() => {
          // Refresh players data when scores change
          refreshPlayersData();
        }}
      />
    </>
  );
};

const Dashboard = ({ currentUserId, db, appId, auth, onSignOut }) => {
  const navigate = useNavigate();
  const [gameHistory, setGameHistory] = useState([]);
  const [filteredGames, setFilteredGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedGamePlayers, setSelectedGamePlayers] = useState([]);
  const [stats, setStats] = useState({
    totalGames: 0,
    gamesAsAdmin: 0,
    gamesAsPlayer: 0,
    totalWins: 0,
    averageScore: 0,
  });

  useEffect(() => {
    if (!currentUserId || !db) return;

    const loadGameHistory = async () => {
      try {
        setLoading(true);

        const gamesRef = collection(
          db,
          `artifacts/${appId}/public/data/bingoGames`
        );
        const allGamesSnapshot = await getDocs(gamesRef);

        const gameProcessingPromises = allGamesSnapshot.docs.map(
          async (gameDoc) => {
            const gameData = gameDoc.data();

            // Check if user is admin/creator
            const isAdmin =
              gameData.createdBy === currentUserId ||
              gameData.adminId === currentUserId;

            // Check if user is a player
            let isPlayer = false;
            let playerData = null;
            try {
              const playerDocRef = doc(
                db,
                `artifacts/${appId}/public/data/bingoGames/${gameDoc.id}/players`,
                currentUserId
              );
              const playerDocSnap = await getDoc(playerDocRef);
              if (playerDocSnap.exists()) {
                isPlayer = true;
                playerData = playerDocSnap.data();
              }
            } catch (error) {
              console.warn(
                `Error checking player data for game ${gameDoc.id}:`,
                error
              );
            }

            // Only include games where user participated
            if (!isAdmin && !isPlayer) {
              return null;
            }

            return await processGameData(
              gameDoc,
              gameData,
              isAdmin,
              isPlayer,
              playerData
            );
          }
        );

        const gameResults = await Promise.all(gameProcessingPromises);
        const userGames = gameResults.filter(Boolean);

        // Sort by most recent first
        userGames.sort((a, b) => b.playedAt - a.playedAt);
        setGameHistory(userGames);
        setFilteredGames(userGames);

        // Calculate stats
        const totalGames = userGames.length;
        const gamesAsAdmin = userGames.filter(
          (g) => g.userRole === "admin"
        ).length;
        const gamesAsPlayer = userGames.filter(
          (g) => g.userRole === "player"
        ).length;
        const totalWins = userGames.filter((g) => g.isWin).length;
        const averageScore =
          totalGames > 0
            ? userGames.reduce((sum, g) => sum + (g.userScore || 0), 0) /
              totalGames
            : 0;

        setStats({
          totalGames,
          gamesAsAdmin,
          gamesAsPlayer,
          totalWins,
          averageScore: averageScore.toFixed(1),
        });
      } catch (error) {
        console.error("Error loading game history:", error);
      } finally {
        setLoading(false);
      }
    };

    const processGameData = async (
      gameDoc,
      gameData,
      isAdmin,
      isPlayer,
      playerData
    ) => {
      try {
        // Get all players for this game
        const playersRef = collection(
          db,
          `artifacts/${appId}/public/data/bingoGames/${gameDoc.id}/players`
        );
        const allPlayersSnapshot = await getDocs(playersRef);
        const allPlayers = allPlayersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Only process if there are actual players (this helps filter out phantom games)
        if (allPlayers.length === 0 && !isAdmin) {
          console.log(`Skipping game ${gameDoc.id} - no players found`);
          return null;
        }

        // Calculate scores and ranking
        const playersWithScores = allPlayers
          .map((p) => {
            const filled = p.checkedSquares?.length || 0;
            const correct = (p.checkedSquares || []).filter(
              (s) => s.correct === true
            ).length;
            const completionScore =
              (filled / (gameData.gridSize * gameData.gridSize)) * 40;
            const accuracyScore = filled === 0 ? 0 : (correct / filled) * 60;
            return {
              ...p,
              totalScore: completionScore + accuracyScore,
            };
          })
          .sort((a, b) => b.totalScore - a.totalScore);

        const userRank =
          playersWithScores.findIndex((p) => p.id === currentUserId) + 1;
        const userScore =
          playersWithScores.find((p) => p.id === currentUserId)?.totalScore ||
          0;

        // Better timestamp handling
        let playedAt = Date.now();
        const timestampFields = ["startTime", "createdAt", "scoringEndTime"];

        for (const field of timestampFields) {
          if (gameData[field]) {
            try {
              if (typeof gameData[field].toMillis === "function") {
                playedAt = gameData[field].toMillis();
                break;
              } else if (typeof gameData[field].toDate === "function") {
                playedAt = gameData[field].toDate().getTime();
                break;
              } else if (typeof gameData[field] === "number") {
                playedAt = gameData[field];
                break;
              } else if (gameData[field].seconds) {
                playedAt =
                  gameData[field].seconds * 1000 +
                  (gameData[field].nanoseconds || 0) / 1000000;
                break;
              }
            } catch (error) {
              console.warn(`Error processing timestamp field ${field}:`, error);
            }
          }
        }

        return {
          id: gameDoc.id,
          ...gameData,
          userRole: isAdmin ? "admin" : "player",
          playerData: playerData,
          allPlayers: allPlayers,
          rank: userRank > 0 ? userRank : null,
          totalPlayers: allPlayers.length,
          userScore: userScore,
          playedAt: playedAt,
          isWin: userRank === 1 && allPlayers.length > 1,
        };
      } catch (error) {
        console.warn(`Error processing game ${gameDoc.id}:`, error);
        return null;
      }
    };

    loadGameHistory();
  }, [currentUserId, db, appId]);

  // Search and filter effect
  useEffect(() => {
    let filtered = gameHistory;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = gameHistory.filter(
        (game) =>
          game.id.toLowerCase().includes(term) ||
          (game.industry && game.industry.toLowerCase().includes(term)) ||
          (game.topic && game.topic.toLowerCase().includes(term))
      );
    }

    setFilteredGames(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  }, [searchTerm, gameHistory]);

  const handleGameClick = async (game) => {
    setSelectedGame(game);
    setSelectedGamePlayers(game.allPlayers || []);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown date";
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return "Unknown date";

      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.warn("Error formatting date:", error);
      return "Unknown date";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "playing":
        return "bg-green-100 text-green-800";
      case "scoring":
        return "bg-yellow-100 text-yellow-800";
      case "ended":
        return "bg-gray-100 text-gray-800";
      case "waiting":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRankBadge = (rank, totalPlayers) => {
    if (!rank || totalPlayers <= 1) return null;

    if (rank === 1) return <span className="text-yellow-500">🥇</span>;
    if (rank === 2) return <span className="text-gray-400">🥈</span>;
    if (rank === 3) return <span className="text-orange-600">🥉</span>;
    return <span className="text-gray-500">#{rank}</span>;
  };

  // Pagination
  const totalPages = Math.ceil(filteredGames.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentGames = filteredGames.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 text-blue-500 mx-auto">
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
          <p className="mt-4 text-gray-700 text-lg font-semibold">
            Loading Dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate("/role")}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => navigate("/player/join")}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                🎮 Join Game
              </button>
              <button
                onClick={() => navigate("/admin/setup")}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                ➕ Create Game
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-md p-4 text-center border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">
                {stats.totalGames}
              </div>
              <div className="text-sm text-gray-600">Total Games</div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 text-center border border-purple-200">
              <div className="text-2xl font-bold text-purple-600">
                {stats.gamesAsAdmin}
              </div>
              <div className="text-sm text-gray-600">As Admin</div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 text-center border border-green-200">
              <div className="text-2xl font-bold text-green-600">
                {stats.gamesAsPlayer}
              </div>
              <div className="text-sm text-gray-600">As Player</div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 text-center border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600">
                {stats.totalWins}
              </div>
              <div className="text-sm text-gray-600">Wins</div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 text-center border border-indigo-200">
              <div className="text-2xl font-bold text-indigo-600">
                {stats.averageScore}
              </div>
              <div className="text-sm text-gray-600">Avg Score</div>
            </div>
          </div>

          {/* Game History */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                <h2 className="text-xl font-bold text-gray-900">
                  Game History
                </h2>
                <div className="flex items-center space-x-4">
                  <input
                    type="text"
                    placeholder="Search by Game ID or Industry..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {filteredGames.length === 0 ? (
              <div className="px-6 py-12 text-center">
                {searchTerm ? (
                  <>
                    <svg
                      className="w-16 h-16 text-gray-300 mx-auto mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <p className="text-gray-500 text-lg">
                      No games found matching "{searchTerm}"
                    </p>
                    <button
                      onClick={() => setSearchTerm("")}
                      className="mt-2 text-blue-600 hover:text-blue-800"
                    >
                      Clear search
                    </button>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-16 h-16 text-gray-300 mx-auto mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.02-5.7-2.709M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      />
                    </svg>
                    <p className="text-gray-500 text-lg">No games played yet</p>
                    <p className="text-gray-400 text-sm mt-2">
                      Start playing to see your game history!
                    </p>
                    <button
                      onClick={() => navigate("/role")}
                      className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Play Your First Game
                    </button>
                  </>
                )}
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-200">
                  {currentGames.map((game) => (
                    <div
                      key={game.id}
                      className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleGameClick(game)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                game.status
                              )}`}
                            >
                              {game.status}
                            </span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                game.userRole === "admin"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {game.userRole === "admin"
                                ? "👑 Admin"
                                : "👤 Player"}
                            </span>
                            {game.rank && (
                              <span className="flex items-center space-x-1">
                                {getRankBadge(game.rank, game.totalPlayers)}
                                <span className="text-xs text-gray-600">
                                  {game.rank} of {game.totalPlayers}
                                </span>
                              </span>
                            )}
                          </div>

                          <h3 className="font-semibold text-gray-900 mb-1">
                            Game {game.id}
                          </h3>

                          <div className="text-sm text-gray-600 space-y-1">
                            <div>
                              Industry:{" "}
                              <span className="font-medium">
                                {game.industry || "Unknown"}
                              </span>
                            </div>
                            <div>
                              Grid:{" "}
                              <span className="font-medium">
                                {game.gridSize || "Unknown"}×
                                {game.gridSize || "Unknown"}
                              </span>
                            </div>
                            <div>
                              Played:{" "}
                              <span className="font-medium">
                                {formatDate(game.playedAt)}
                              </span>
                            </div>
                            {game.userScore > 0 && (
                              <div>
                                Score:{" "}
                                <span className="font-medium">
                                  {game.userScore.toFixed(1)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end space-y-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGameClick(game);
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            View Scoreboard →
                          </button>
                          {game.status === "ended" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/score/${game.id}`);
                              }}
                              className="text-green-600 hover:text-green-800 text-sm font-medium"
                            >
                              View Results →
                            </button>
                          )}
                          {(game.status === "waiting" ||
                            game.status === "playing") && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (game.status === "waiting")
                                  navigate(`/waiting/${game.id}`);
                                else navigate(`/play/${game.id}`);
                              }}
                              className="text-green-600 hover:text-green-800 text-sm font-medium"
                            >
                              {game.status === "waiting"
                                ? "Rejoin →"
                                : "Continue →"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {startIndex + 1} to{" "}
                      {Math.min(endIndex, filteredGames.length)} of{" "}
                      {filteredGames.length} games
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Previous
                      </button>
                      {Array.from(
                        { length: Math.min(5, totalPages) },
                        (_, i) => {
                          let pageNumber;
                          if (totalPages <= 5) {
                            pageNumber = i + 1;
                          } else if (currentPage <= 3) {
                            pageNumber = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNumber = totalPages - 4 + i;
                          } else {
                            pageNumber = currentPage - 2 + i;
                          }

                          return (
                            <button
                              key={pageNumber}
                              onClick={() => setCurrentPage(pageNumber)}
                              className={`px-3 py-1 border border-gray-300 rounded text-sm ${
                                currentPage === pageNumber
                                  ? "bg-blue-500 text-white border-blue-500"
                                  : "hover:bg-gray-50"
                              }`}
                            >
                              {pageNumber}
                            </button>
                          );
                        }
                      )}
                      <button
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Scoreboard Modal */}
      <ScoreboardModal
        show={selectedGame}
        onClose={() => setSelectedGame(null)}
        game={selectedGame}
        initialPlayers={selectedGamePlayers}
        isAdmin={selectedGame?.userRole === "admin"}
        currentUserId={currentUserId}
        db={db}
        appId={appId}
      />
    </>
  );
};

export default Dashboard;
