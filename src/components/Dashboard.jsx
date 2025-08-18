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
} from "firebase/firestore";
//import ProfileIcon from "./ProfileIcon";

const Dashboard = ({ currentUserId, db, appId, auth, onSignOut }) => {
  const navigate = useNavigate();
  const [gameHistory, setGameHistory] = useState([]);
  const [loading, setLoading] = useState(true);
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

        // Get all games where the user participated
        const gamesRef = collection(
          db,
          `artifacts/${appId}/public/data/bingoGames`
        );
        const gamesSnapshot = await getDocs(gamesRef);

        const userGames = [];

        // Check each game for user participation
        for (const gameDoc of gamesSnapshot.docs) {
          const gameData = gameDoc.data();

          // Check if user was admin/creator
          const isAdmin =
            gameData.adminId === currentUserId ||
            gameData.createdBy === currentUserId;

          // Check if user was a player
          const playersRef = collection(
            db,
            `artifacts/${appId}/public/data/bingoGames/${gameDoc.id}/players`
          );
          const playerDoc = await getDoc(doc(playersRef, currentUserId));

          if (isAdmin || playerDoc.exists()) {
            const playerData = playerDoc.exists() ? playerDoc.data() : null;

            // Get all players for this game to determine ranking
            const allPlayersSnapshot = await getDocs(playersRef);
            const allPlayers = allPlayersSnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));

            // Calculate scores and ranking
            const playersWithScores = allPlayers
              .map((p) => {
                const filled = p.checkedSquares?.length || 0;
                const correct = (p.checkedSquares || []).filter(
                  (s) => s.correct === true
                ).length;
                const completionScore =
                  (filled / (gameData.gridSize * gameData.gridSize)) * 40;
                const accuracyScore =
                  filled === 0 ? 0 : (correct / filled) * 60;
                return {
                  ...p,
                  totalScore: completionScore + accuracyScore,
                };
              })
              .sort((a, b) => b.totalScore - a.totalScore);

            const userRank =
              playersWithScores.findIndex((p) => p.id === currentUserId) + 1;
            const userScore =
              playersWithScores.find((p) => p.id === currentUserId)
                ?.totalScore || 0;

            userGames.push({
              id: gameDoc.id,
              ...gameData,
              userRole: isAdmin ? "admin" : "player",
              playerData: playerData,
              rank: userRank > 0 ? userRank : null,
              totalPlayers: allPlayers.length,
              userScore: userScore,
              playedAt:
                gameData.startTime?.toMillis?.() ||
                gameData.createdAt?.toMillis?.() ||
                gameData.scoringEndTime?.toMillis?.() ||
                null,

              isWin: userRank === 1 && allPlayers.length > 1,
            });
          }
        }

        // Sort by most recent first
        userGames.sort((a, b) => b.playedAt - a.playedAt);
        setGameHistory(userGames);

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
          userGames.length > 0
            ? userGames.reduce((sum, g) => sum + (g.userScore || 0), 0) /
              userGames.length
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

    loadGameHistory();
  }, [currentUserId, db, appId]);

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown date";
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
          {/* <ProfileIcon
            currentUserId={currentUserId}
            onSignOut={onSignOut}
            auth={auth}
          /> */}
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
            <h2 className="text-xl font-bold text-gray-900">Game History</h2>
          </div>

          {gameHistory.length === 0 ? (
            <div className="px-6 py-12 text-center">
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
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {gameHistory.map((game) => (
                <div
                  key={game.id}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors"
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
                          {game.userRole === "admin" ? "👑 Admin" : "👤 Player"}
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
                          <span className="font-medium">{game.industry}</span>
                        </div>
                        <div>
                          Grid:{" "}
                          <span className="font-medium">
                            {game.gridSize}×{game.gridSize}
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
                      {game.status === "ended" && (
                        <button
                          onClick={() => navigate(`/score/${game.id}`)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View Results →
                        </button>
                      )}
                      {(game.status === "waiting" ||
                        game.status === "playing") && (
                        <button
                          onClick={() => {
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
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
