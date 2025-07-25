import React, { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import SquareDetailsModal from "./SquareDetailsModal";

const Scoreboard = ({
  game,
  players,
  isAdmin,
  onBackToLogin,
  onPlayAgain,
  currentUserId,
  showSuccess,
  showError,
  db,
  appId,
}) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);

  const handleSelectPlayer = async (playerId) => {
    if (isAdmin && playerId !== currentUserId) {
      setSelectedPlayerId(playerId);
    }
  };

  const handleAdminViewBoard = async () => {
    if (!selectedPlayerId) return;
    const playerRef = doc(
      db,
      `artifacts/${appId}/public/data/bingoGames/${game.id}/players/${selectedPlayerId}`
    );
    try {
      const playerDoc = await getDoc(playerRef);
      if (playerDoc.exists()) {
        const playerBoard = playerDoc.data().checkedSquares;
        // Logic to display player board
        console.log(playerBoard);
      }
    } catch (error) {
      showError(`Failed to fetch player board: ${error.message}`);
    }
  };

  const calculateScore = (checkedSquares) => checkedSquares.length;

  const playerBoard = selectedPlayerId
    ? players.find((p) => p.id === selectedPlayerId)?.checkedSquares
    : [];

  return (
    <div className="space-y-8 p-6 bg-white rounded-3xl shadow-2xl max-w-3xl mx-auto border-4 border-purple-300">
      <h2 className="text-4xl font-extrabold text-center text-purple-800">
        🏆 Game Over! Scoreboard
      </h2>

      <div className="bg-purple-50 border border-purple-200 p-6 rounded-xl shadow-inner text-center space-y-4">
        <p className="text-2xl font-bold text-purple-700 font-inter-rounded">
          Game Code:{" "}
          <span className="text-purple-900 font-extrabold text-2xl">
            {game?.id}
          </span>
        </p>
        <p className="text-lg text-gray-700 font-inter-rounded">
          Industry: <span className="font-semibold">{game?.industry}</span> |
          Grid Size:{" "}
          <span className="font-semibold">
            {game?.gridSize}x{game?.gridSize}
          </span>
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-lg border-2 border-gray-100">
        <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
          <svg
            className="w-8 h-8 mr-3 text-yellow-500"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M20 6h-4V4c0-1.1.1.9-2 0-2-2H6c-1.1 0-2 .9-2 2v2H4v14h14V6zm-8 4h4v2H8V8zm-4 4h2v6h-2V8zm4 0h-2v2h2V8z" />
          </svg>
          Player Ranks:
        </h3>
        <div className="bg-gray-50 rounded p-5 max-h-48 overflow-y-auto shadow-inner">
          <ul className="space-y-3">
            {players.map((player, index) => (
              <li
                key={player.id}
                className={`flex items-center justify-between p-4 rounded-lg shadow-md border-2 ${
                  index === 0
                    ? "bg-yellow-100 border-yellow-400"
                    : "bg-white border-gray-200"
                }`}
              >
                <div className="flex flex-col">
                  <span
                    className={`font-extrabold text-2xl mr-3 ${
                      index === 0 ? "text-yellow-600" : "text-gray-600"
                    }`}
                  >
                    {index + 1}.
                  </span>
                  <span
                    className={`font-bold text-lg ${
                      player.id === currentUserId
                        ? "text-blue-800"
                        : "text-gray-800"
                    }`}
                  >
                    {player.name} {player.id === currentUserId && "(You)"}
                  </span>
                  <span className="text-sm text-gray-500 italic mt-1">
                    {player.isSubmitted
                      ? `Submitted at: ${new Date(
                          player.submissionTime
                        ).toLocaleTimeString()}`
                      : "Not Submitted"}
                  </span>
                </div>
                <span
                  className={`font-extrabold text-2xl ${
                    index === 0 ? "text-yellow-700" : "text-purple-700"
                  }`}
                >
                  Score: {calculateScore(player.checkedSquares)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-5 mt-10">
        {isAdmin && (
          <button
            onClick={onPlayAgain}
            className="flex-1 font-extrabold py-5 px-6 rounded-2xl text-2xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-purple-400"
          >
            🔄 Play Again (Admin Only)
          </button>
        )}
        <button
          onClick={onBackToLogin}
          className={`flex-1 font-extrabold py-5 px-6 rounded-2xl text-2xl bg-gradient-to-r from-gray-500 to-gray-700 text-white hover:from-gray-600 hover:to-gray-800 transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-gray-400 ${
            isAdmin ? "" : "w-full"
          }`}
        >
          🚪 Exit Game
        </button>
      </div>
    </div>
  );
};

export default Scoreboard;
