import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function PublicScoreboard() {
  const { appId, gameId } = useParams();
  const [game, setGame] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [debugInfo, setDebugInfo] = useState([]);

  useEffect(() => {
    const fetchGameData = async () => {
      const debugResults = [];

      if (!appId || !gameId) {
        setError("Missing appId or gameId in URL");
        setLoading(false);
        return;
      }

      try {
        const gamePath = `artifacts/${appId}/public/data/bingoGames/${gameId}`;
        debugResults.push(`Fetching from path: ${gamePath}`);
        console.log(`Fetching game from: ${gamePath}`);

        const gameDocRef = doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "bingoGames",
          gameId
        );
        const gameDoc = await getDoc(gameDocRef);

        if (gameDoc.exists()) {
          console.log(`✅ Found game:`, gameDoc.data());
          debugResults.push(`✅ Found game successfully`);

          const gameData = { id: gameDoc.id, ...gameDoc.data() };
          setGame(gameData);

          const playersRef = collection(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "bingoGames",
            gameId,
            "players"
          );

          const unsubscribe = onSnapshot(
            playersRef,
            (snapshot) => {
              const foundPlayers = snapshot.docs.map((d) => ({
                id: d.id,
                ...d.data(),
              }));

              debugResults.push(`✅ Found ${foundPlayers.length} players`);
              console.log(
                `Found ${foundPlayers.length} players:`,
                foundPlayers
              );

              foundPlayers.sort((a, b) => {
                const aScore = computePlayerScore(a, gameData);
                const bScore = computePlayerScore(b, gameData);
                return bScore.aggregate - aScore.aggregate;
              });

              setPlayers(foundPlayers);
              setLoading(false);
            },
            (error) => {
              console.error("Error listening to players:", error);
              debugResults.push(
                `❌ Error listening to players: ${error.message}`
              );
              getDocs(playersRef)
                .then((snapshot) => {
                  const foundPlayers = snapshot.docs.map((d) => ({
                    id: d.id,
                    ...d.data(),
                  }));
                  foundPlayers.sort((a, b) => {
                    const aScore = computePlayerScore(a, gameData);
                    const bScore = computePlayerScore(b, gameData);
                    return bScore.aggregate - aScore.aggregate;
                  });
                  setPlayers(foundPlayers);
                })
                .catch((playerErr) => {
                  debugResults.push(
                    `❌ Fallback error getting players: ${playerErr.message}`
                  );
                  console.error("Fallback error getting players:", playerErr);
                  setError(
                    `Found game but couldn't load players: ${playerErr.message}`
                  );
                });
              setLoading(false);
            }
          );

          return unsubscribe;
        } else {
          console.log(`❌ No game found at: ${gamePath}`);
          debugResults.push(`❌ No game found`);
          setError(
            `Game not found. This scoreboard may not be publicly available yet.`
          );
          setLoading(false);
        }
      } catch (err) {
        console.error(`❌ Error fetching game:`, err);
        debugResults.push(`❌ Error fetching game: ${err.message}`);
        setError(`Error loading scoreboard: ${err.message}`);
        setLoading(false);
      }

      setDebugInfo(debugResults);
    };

    const cleanup = fetchGameData();

    return () => {
      if (cleanup && typeof cleanup.then === "function") {
        cleanup.then((unsubscribe) => {
          if (typeof unsubscribe === "function") {
            unsubscribe();
          }
        });
      }
    };
  }, [appId, gameId]);

  /* ---------- Compute Player Score ---------- */
const computePlayerScore = (player, gameData) => {
  const filled = player?.checkedSquares?.length || 0;
  const correct = (player?.checkedSquares || []).filter(
    (s) => s.correct === true
  ).length;

  const gridSize = gameData?.gridSize || 5;
  const totalSquares = gridSize * gridSize;

  const completionScore = (filled / totalSquares) * 40;
  const accuracyScore = filled === 0 ? 0 : (correct / filled) * 60;

  let timeSpent = null;

  try {
    let startTime = null;
    let endTime = null;

    /* ---------- Start Time ---------- */
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

    /* ---------- End Time ---------- */
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

    if (!endTime && gameData?.endedAt) {
      if (typeof gameData.endedAt.toMillis === "function") {
        endTime = gameData.endedAt.toMillis();
      } else if (typeof gameData.endedAt === "number") {
        endTime = gameData.endedAt;
      } else if (gameData.endedAt.seconds) {
        endTime =
          gameData.endedAt.seconds * 1000 +
          (gameData.endedAt.nanoseconds || 0) / 1000000;
      }
    }

    /* ---------- Time Spent (clamped) ---------- */
    if (startTime && endTime && endTime > startTime) {
      const rawSeconds = (endTime - startTime) / 1000;
      const maxSeconds = gameData?.timerDuration
        ? gameData.timerDuration * 60
        : rawSeconds;

      timeSpent = Math.min(rawSeconds, maxSeconds);
    }
  } catch (error) {
    console.warn(
      "Error calculating time score for player:",
      player?.name,
      error
    );
  }

  return {
    completionScore,
    accuracyScore,
    aggregate: completionScore + accuracyScore,
    timeScore:timeSpent,
    filled,
    correct,
    totalSquares,
  };
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

  const handleDownloadPDF = () => {
    if (!players.length) return;

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`${game?.name || "Game"} – Scoreboard`, 14, 20);

    const tableColumn = [
      "Rank",
      "Player",
      "Time",
      "Completion",
      "Accuracy",
      "Total",
    ];
    const tableRows = players.map((player, i) => {
      const scores = computePlayerScore(player, game);
      return [
        i + 1,
        player.name || "Unnamed",
        formatTime(scores.timeScore),
        scores.completionScore.toFixed(1),
        scores.accuracyScore.toFixed(1),
        scores.aggregate.toFixed(1),
      ];
    });

    autoTable(doc, {
      startY: 30,
      head: [tableColumn],
      body: tableRows,
      theme: "striped",
    });

    doc.setFontSize(10);
    doc.text(
      "Generated from Public Scoreboard",
      14,
      doc.internal.pageSize.height - 10
    );

    doc.save(`${game?.name || "scoreboard"}_${gameId}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading scoreboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          <h3 className="font-bold mb-2">Error Loading Scoreboard</h3>
          <p>{error}</p>
          {process.env.NODE_ENV === "development" && (
            <div className="mt-2 text-sm">
              <p>
                Expected path:{" "}
                <code>
                  artifacts/{appId}/public/data/bingoGames/{gameId}
                </code>
              </p>
            </div>
          )}
        </div>
      )}

      {game ? (
        <>
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
              <h1 className="text-3xl font-bold text-center mb-2">
                🏆 {game.name || "Game"} Results
              </h1>
              <div className="text-center text-purple-100 text-sm">
                <p>
                  {game.industry && (
                    <>
                      Industry:{" "}
                      <span className="capitalize">{game.industry}</span>
                      {" | "}
                    </>
                  )}
                  {game.gridSize && (
                    <>
                      Grid Size: {game.gridSize}×{game.gridSize}
                      {" | "}
                    </>
                  )}
                  Game Completed:{" "}
                  {game.endedAt
                    ? new Date(game.endedAt).toLocaleDateString()
                    : "Recently"}
                </p>
              </div>
            </div>

            <div className="p-6">
              {players.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No players have completed the game yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-200 text-left">
                        <th className="py-3 px-2 font-semibold text-gray-700">
                          #
                        </th>
                        <th className="py-3 px-2 font-semibold text-gray-700">
                          Player
                        </th>
                        <th className="py-3 px-2 font-semibold text-gray-700 text-right">
                          Time
                        </th>
                        <th className="py-3 px-2 font-semibold text-gray-700 text-right">
                          Completion
                        </th>
                        <th className="py-3 px-2 font-semibold text-gray-700 text-right">
                          Accuracy
                        </th>
                        <th className="py-3 px-2 font-semibold text-gray-700 text-right">
                          Total Score
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {players.map((player, index) => {
                        const scores = computePlayerScore(player, game);
                        return (
                          <tr
                            key={player.id}
                            className="border-b border-gray-100 hover:bg-gray-50"
                          >
                            <td className="py-3 px-2">
                              <span className="flex items-center">
                                {index === 0 && (
                                  <span className="mr-1">🥇</span>
                                )}
                                {index === 1 && (
                                  <span className="mr-1">🥈</span>
                                )}
                                {index === 2 && (
                                  <span className="mr-1">🥉</span>
                                )}
                                {index + 1}
                              </span>
                            </td>
                            <td className="py-3 px-2 font-medium">
                              {player.name || "Unnamed Player"}
                            </td>
                            <td className="py-3 px-2 text-right text-gray-600">
                              {formatTime(scores.timeScore)}
                            </td>
                            <td className="py-3 px-2 text-right">
                              <div className="text-gray-900">
                                {scores.completionScore.toFixed(1)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {scores.filled}/{scores.totalSquares}
                              </div>
                            </td>
                            <td className="py-3 px-2 text-right">
                              <div className="text-gray-900">
                                {scores.accuracyScore.toFixed(1)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {scores.filled > 0
                                  ? `${scores.correct}/${scores.filled}`
                                  : "0/0"}
                              </div>
                            </td>
                            <td className="py-3 px-2 text-right">
                              <span className="font-bold text-lg text-purple-700">
                                {scores.aggregate.toFixed(1)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {players.length > 0 && (
            <div className="text-center mt-6">
              <button
                onClick={handleDownloadPDF}
                className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-6 py-3 rounded-lg shadow transition-colors duration-200"
              >
                📄 Download Scoreboard (PDF)
              </button>
            </div>
          )}

          <p className="mt-6 text-center text-xs text-gray-400">
            Public Results • This scoreboard is view-only and updates
            automatically
          </p>
        </>
      ) : (
        !error && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No game found</p>
            <p className="text-gray-400 text-sm mt-2">
              Please check the URL and try again
            </p>
          </div>
        )
      )}
    </div>
  );
}
