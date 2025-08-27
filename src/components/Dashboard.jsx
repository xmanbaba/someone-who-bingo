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

// Player Board Modal Component - Mobile Optimized
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
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-3 sm:p-4 w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-center break-words">
          {player.name}'s Grid
        </h3>
        <div className="flex-1 overflow-y-auto">
          <div
            className="grid gap-1 sm:gap-2"
            style={{
              gridTemplateColumns: `repeat(${game.gridSize}, minmax(0, 1fr))`,
            }}
          >
            {grid.map((sq) => (
              <div
                key={sq.index}
                className={`p-1 sm:p-2 text-xs rounded-md border text-center min-h-[60px] sm:min-h-[80px] flex flex-col ${
                  sq.isChecked
                    ? sq.correct === true
                      ? "bg-green-200 border-green-500"
                      : sq.correct === false
                      ? "bg-red-200 border-red-500"
                      : "bg-yellow-200"
                    : "bg-gray-100"
                }`}
              >
                <div className="font-medium text-gray-800 text-[10px] sm:text-xs mb-1 flex-1 overflow-hidden">
                  <div className="break-words hyphens-auto line-clamp-3">
                    {sq.question}
                  </div>
                </div>
                {sq.isChecked && (
                  <>
                    <div className="text-gray-700 text-[8px] sm:text-[10px] mb-1 overflow-hidden">
                      <div className="break-words hyphens-auto line-clamp-2">
                        {sq.names.join(", ")}
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex justify-center gap-0.5 sm:gap-1">
                        <button
                          onClick={() => handleMark(sq.index, true)}
                          className="px-1 py-0.5 bg-green-600 text-white rounded text-[8px] sm:text-xs hover:bg-green-700 min-w-[16px] sm:min-w-[20px] flex-shrink-0"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => handleMark(sq.index, false)}
                          className="px-1 py-0.5 bg-red-600 text-white rounded text-[8px] sm:text-xs hover:bg-red-700 min-w-[16px] sm:min-w-[20px] flex-shrink-0"
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
        </div>
        <button
          onClick={onClose}
          className="mt-3 sm:mt-4 w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm sm:text-base flex-shrink-0"
        >
          Close
        </button>
      </div>
    </div>
  );
};

// Enhanced Scoreboard Modal - Mobile Optimized
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
        className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-40 p-2 sm:p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl p-3 sm:p-4 lg:p-6 w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex-shrink-0 space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-purple-800 break-words min-w-0">
                🏁 Game Scoreboard
              </h2>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={refreshPlayersData}
                  disabled={loading}
                  className="px-2 sm:px-3 py-1 bg-gray-500 text-white rounded text-xs sm:text-sm hover:bg-gray-600 disabled:opacity-50 flex-shrink-0"
                >
                  {loading ? "..." : "🔄"}
                </button>
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700 text-xl sm:text-2xl font-bold flex-shrink-0"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Game Info */}
            <div className="bg-purple-50 p-3 sm:p-4 rounded-xl text-center text-xs sm:text-sm lg:text-base">
              <div className="flex flex-col space-y-2">
                <div className="flex flex-col sm:flex-row justify-center items-center gap-1 sm:gap-4 text-xs sm:text-sm">
                  <span className="break-words truncate">
                    Code: <strong className="break-all">{game.id}</strong>
                  </span>
                  <span className="hidden sm:inline">|</span>
                  <span className="break-words truncate">
                    Industry:{" "}
                    <strong className="break-words">{game.industry}</strong>
                  </span>
                  <span className="hidden sm:inline">|</span>
                  <span className="whitespace-nowrap">
                    Grid:{" "}
                    <strong>
                      {game.gridSize}×{game.gridSize}
                    </strong>
                  </span>
                </div>
                <div className="flex justify-center mt-2">
                  <button
                    onClick={handleShareResults}
                    className="px-3 sm:px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-xs sm:text-sm whitespace-nowrap"
                  >
                    🔗 Share Public Scoreboard
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Player Table - Mobile Responsive with proper overflow handling */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-auto">
              <div className="min-w-full">
                <table className="w-full text-xs sm:text-sm table-fixed">
                  <thead className="bg-gray-100 text-gray-700 font-semibold sticky top-0">
                    <tr>
                      <th className="px-2 py-2 text-left w-12 sm:w-16">#</th>
                      <th className="px-2 py-2 text-left min-w-0">Player</th>
                      <th className="px-2 py-2 text-right w-16 sm:w-20 hidden sm:table-cell">
                        Time
                      </th>
                      <th className="px-2 py-2 text-right w-20 hidden md:table-cell">
                        Complete
                      </th>
                      <th className="px-2 py-2 text-right w-20 hidden md:table-cell">
                        Accuracy
                      </th>
                      <th className="px-2 py-2 text-right w-16 sm:w-20">
                        Total
                      </th>
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
                        <td className="px-2 py-2">
                          <div className="flex items-center">
                            {i === 0 && <span className="mr-1">🥇</span>}
                            {i === 1 && <span className="mr-1">🥈</span>}
                            {i === 2 && <span className="mr-1">🥉</span>}
                            <span className="text-xs">{i + 1}</span>
                          </div>
                        </td>
                        <td className="px-2 py-2 min-w-0">
                          <div className="overflow-hidden">
                            <div className="font-medium truncate">{p.name}</div>
                            {p.id === currentUserId && (
                              <span className="text-[10px] sm:text-xs text-blue-600 block">
                                (You)
                              </span>
                            )}
                            {/* Mobile-only stats */}
                            <div className="sm:hidden text-[10px] text-gray-500 mt-1">
                              <div className="truncate">
                                Time: {formatTime(p.timeScore)}
                              </div>
                              <div className="truncate">
                                C: {p.completionScore.toFixed(0)} | A:{" "}
                                {p.accuracyScore.toFixed(0)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-2 text-right hidden sm:table-cell">
                          <div className="truncate">
                            {formatTime(p.timeScore)}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-right hidden md:table-cell">
                          {p.completionScore.toFixed(1)}
                        </td>
                        <td className="px-2 py-2 text-right hidden md:table-cell">
                          {p.accuracyScore.toFixed(1)}
                        </td>
                        <td className="px-2 py-2 text-right font-bold text-purple-700">
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

  // Improved timestamp extraction function
  const extractTimestamp = (gameData) => {
    const timestampFields = [
      "createdAt",
      "startTime",
      "scoringEndTime",
      "endedAt",
    ];

    for (const field of timestampFields) {
      if (gameData[field]) {
        try {
          if (typeof gameData[field].toMillis === "function") {
            const timestamp = gameData[field].toMillis();
            const now = Date.now();
            const year2020 = new Date("2020-01-01").getTime();
            if (timestamp <= now && timestamp >= year2020) {
              return timestamp;
            }
          } else if (typeof gameData[field].toDate === "function") {
            const timestamp = gameData[field].toDate().getTime();
            const now = Date.now();
            const year2020 = new Date("2020-01-01").getTime();
            if (timestamp <= now && timestamp >= year2020) {
              return timestamp;
            }
          } else if (typeof gameData[field] === "number") {
            const now = Date.now();
            const year2020 = new Date("2020-01-01").getTime();
            if (gameData[field] <= now && gameData[field] >= year2020) {
              return gameData[field];
            }
          } else if (gameData[field].seconds) {
            const timestamp =
              gameData[field].seconds * 1000 +
              (gameData[field].nanoseconds || 0) / 1000000;
            const now = Date.now();
            const year2020 = new Date("2020-01-01").getTime();
            if (timestamp <= now && timestamp >= year2020) {
              return timestamp;
            }
          }
        } catch (error) {
          console.warn(`Error processing timestamp field ${field}:`, error);
        }
      }
    }

    console.warn(
      "No valid timestamp found for game:",
      gameData.id || "unknown"
    );
    return null;
  };

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

            const isAdmin =
              gameData.createdBy === currentUserId ||
              gameData.adminId === currentUserId;

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

        userGames.sort((a, b) => {
          if (a.playedAt && b.playedAt) {
            return b.playedAt - a.playedAt;
          }
          if (a.playedAt && !b.playedAt) {
            return -1;
          }
          if (!a.playedAt && b.playedAt) {
            return 1;
          }
          return (b.id || "").localeCompare(a.id || "");
        });

        setGameHistory(userGames);
        setFilteredGames(userGames);

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
        const playersRef = collection(
          db,
          `artifacts/${appId}/public/data/bingoGames/${gameDoc.id}/players`
        );
        const allPlayersSnapshot = await getDocs(playersRef);
        const allPlayers = allPlayersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        if (allPlayers.length === 0 && !isAdmin) {
          console.log(`Skipping game ${gameDoc.id} - no players found`);
          return null;
        }

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

        const playedAt = extractTimestamp(gameData);

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
    setCurrentPage(1);
  }, [searchTerm, gameHistory]);

  const handleGameClick = async (game) => {
    setSelectedGame(game);
    setSelectedGamePlayers(game.allPlayers || []);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) {
      return "Unknown date";
    }

    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return "Unknown date";
      }

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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
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
          <p className="mt-4 text-gray-700 text-base sm:text-lg font-semibold">
            Loading Dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 overflow-x-hidden">
        {/* Header - Mobile Optimized */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                <button
                  onClick={() => navigate("/role")}
                  className="p-1.5 sm:p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                >
                  <svg
                    className="w-5 h-5 sm:w-6 sm:h-6"
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
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate min-w-0">
                  Dashboard
                </h1>
              </div>
              <div className="flex space-x-2 sm:space-x-3 w-full sm:w-auto flex-shrink-0">
                <button
                  onClick={() => navigate("/player/join")}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm sm:text-base whitespace-nowrap"
                >
                  <span className="sm:hidden">🎮 Join</span>
                  <span className="hidden sm:inline">🎮 Join Game</span>
                </button>
                <button
                  onClick={() => navigate("/admin/setup")}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm sm:text-base whitespace-nowrap"
                >
                  <span className="sm:hidden">➕ Create</span>
                  <span className="hidden sm:inline">➕ Create Game</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
          {/* Stats Cards - Mobile Responsive */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4 mb-6 sm:mb-8">
            <div className="bg-white rounded-xl shadow-md p-3 sm:p-4 text-center border border-blue-200 min-w-0 overflow-hidden">
              <div className="text-xl sm:text-2xl font-bold text-blue-600 truncate">
                {stats.totalGames}
              </div>
              <div className="text-xs sm:text-sm text-gray-600 break-words">
                Total Games
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-3 sm:p-4 text-center border border-purple-200 min-w-0 overflow-hidden">
              <div className="text-xl sm:text-2xl font-bold text-purple-600 truncate">
                {stats.gamesAsAdmin}
              </div>
              <div className="text-xs sm:text-sm text-gray-600 break-words">
                As Admin
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-3 sm:p-4 text-center border border-green-200 col-span-2 sm:col-span-1 min-w-0 overflow-hidden">
              <div className="text-xl sm:text-2xl font-bold text-green-600 truncate">
                {stats.gamesAsPlayer}
              </div>
              <div className="text-xs sm:text-sm text-gray-600 break-words">
                As Player
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-3 sm:p-4 text-center border border-yellow-200 min-w-0 overflow-hidden">
              <div className="text-xl sm:text-2xl font-bold text-yellow-600 truncate">
                {stats.totalWins}
              </div>
              <div className="text-xs sm:text-sm text-gray-600 break-words">
                Wins
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-3 sm:p-4 text-center border border-indigo-200 min-w-0 overflow-hidden">
              <div className="text-xl sm:text-2xl font-bold text-indigo-600 truncate">
                {stats.averageScore}
              </div>
              <div className="text-xs sm:text-sm text-gray-600 break-words">
                Avg Score
              </div>
            </div>
          </div>

          {/* Game History - Mobile Optimized */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 min-w-0 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate min-w-0">
                  Game History
                </h2>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto min-w-0">
                  <input
                    type="text"
                    placeholder="Search games..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base w-full sm:w-auto min-w-0 max-w-full"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="text-gray-500 hover:text-gray-700 text-sm self-center sm:self-auto flex-shrink-0"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {filteredGames.length === 0 ? (
              <div className="px-4 sm:px-6 py-8 sm:py-12 text-center">
                {searchTerm ? (
                  <>
                    <svg
                      className="w-12 sm:w-16 h-12 sm:h-16 text-gray-300 mx-auto mb-4"
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
                    <p className="text-gray-500 text-base sm:text-lg break-words">
                      No games found matching "{searchTerm}"
                    </p>
                    <button
                      onClick={() => setSearchTerm("")}
                      className="mt-2 text-blue-600 hover:text-blue-800 text-sm sm:text-base"
                    >
                      Clear search
                    </button>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-12 sm:w-16 h-12 sm:h-16 text-gray-300 mx-auto mb-4"
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
                    <p className="text-gray-500 text-base sm:text-lg">
                      No games played yet
                    </p>
                    <p className="text-gray-400 text-xs sm:text-sm mt-2">
                      Start playing to see your game history!
                    </p>
                    <button
                      onClick={() => navigate("/role")}
                      className="mt-4 px-4 sm:px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm sm:text-base whitespace-nowrap"
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
                      className="px-4 sm:px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleGameClick(game)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0 min-w-0 overflow-hidden">
                        <div className="flex-1 min-w-0 overflow-hidden">
                          {/* Status badges - Mobile first */}
                          <div className="flex flex-wrap items-center gap-2 mb-2 overflow-hidden">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(
                                game.status
                              )}`}
                            >
                              {game.status}
                            </span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
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
                              <span className="flex items-center space-x-1 whitespace-nowrap">
                                {getRankBadge(game.rank, game.totalPlayers)}
                                <span className="text-xs text-gray-600">
                                  {game.rank} of {game.totalPlayers}
                                </span>
                              </span>
                            )}
                          </div>

                          <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base break-all">
                            Game {game.id}
                          </h3>

                          <div className="text-xs sm:text-sm text-gray-600 space-y-1 min-w-0 overflow-hidden">
                            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-1 sm:gap-x-4">
                              <span className="break-words truncate">
                                Industry:{" "}
                                <span className="font-medium">
                                  {game.industry || "Unknown"}
                                </span>
                              </span>
                              <span className="whitespace-nowrap">
                                Grid:{" "}
                                <span className="font-medium">
                                  {game.gridSize || "Unknown"}×
                                  {game.gridSize || "Unknown"}
                                </span>
                              </span>
                            </div>
                            <div className="break-words truncate">
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

                        {/* Action buttons - Mobile optimized */}
                        <div className="flex flex-col space-y-2 sm:ml-4 flex-shrink-0 min-w-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGameClick(game);
                            }}
                            className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-medium text-left sm:text-right whitespace-nowrap"
                          >
                            View Scoreboard →
                          </button>
                          {game.status === "ended" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/score/${game.id}`);
                              }}
                              className="text-green-600 hover:text-green-800 text-xs sm:text-sm font-medium text-left sm:text-right whitespace-nowrap"
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
                              className="text-green-600 hover:text-green-800 text-xs sm:text-sm font-medium text-left sm:text-right whitespace-nowrap"
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

                {/* Pagination - Mobile Responsive */}
                {totalPages > 1 && (
                  <div className="px-4 sm:px-6 py-4 border-t border-gray-200">
                    <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
                      <div className="text-xs sm:text-sm text-gray-700 order-2 sm:order-1 text-center sm:text-left">
                        Showing {startIndex + 1} to{" "}
                        {Math.min(endIndex, filteredGames.length)} of{" "}
                        {filteredGames.length} games
                      </div>
                      <div className="flex items-center space-x-1 sm:space-x-2 order-1 sm:order-2 overflow-x-auto max-w-full">
                        <button
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="px-2 sm:px-3 py-1 border border-gray-300 rounded text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 flex-shrink-0"
                        >
                          <span className="sm:hidden">‹</span>
                          <span className="hidden sm:inline">Previous</span>
                        </button>

                        {/* Page numbers - Responsive */}
                        <div className="flex space-x-1 overflow-x-auto">
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
                                  className={`px-2 sm:px-3 py-1 border border-gray-300 rounded text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
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
                        </div>

                        <button
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="px-2 sm:px-3 py-1 border border-gray-300 rounded text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 flex-shrink-0"
                        >
                          <span className="sm:hidden">›</span>
                          <span className="hidden sm:inline">Next</span>
                        </button>
                      </div>
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
