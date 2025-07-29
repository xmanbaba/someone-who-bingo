import React, { useState } from "react";
import { doc, getDoc } from "firebase/firestore";

/* ---------- Modal ---------- */
const PlayerBoardModal = ({ show, onClose, player, game }) => {
  if (!show || !player || !game) return null;

  const grid = [];
  const checkedMap = new Map(
    (player.checkedSquares || []).map((s) => [s.index, s.names])
  );
  for (let i = 0; i < game.gridSize * game.gridSize; i++) {
    grid.push({
      index: i,
      question: game.questions[i],
      isChecked: checkedMap.has(i),
      names: checkedMap.get(i) || [],
    });
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-4 max-w-xs w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold mb-3 text-center">
          {player.name}'s Card
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
              className={`p-2 text-xs rounded-md border ${
                sq.isChecked ? "bg-green-200" : "bg-gray-100"
              }`}
            >
              <div className="truncate">{sq.question}</div>
              {sq.isChecked && (
                <div className="text-xs text-gray-600 mt-1 break-words">
                  {sq.names.join(", ")}
                </div>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full py-2 bg-blue-500 text-white rounded"
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
  onBackToLogin,
  onPlayAgain,
  currentUserId,
  showSuccess,
  showError,
  db,
  appId,
}) => {
  const [openBoard, setOpenBoard] = useState(null);

  const calculateScore = (checkedSquares) => checkedSquares?.length || 0;

  return (
    <>
      <div className="space-y-8 p-6 bg-white rounded-3xl shadow-2xl max-w-3xl mx-auto border-4 border-purple-300">
        <h2 className="text-4xl font-extrabold text-center text-purple-800 mb-6">
          🏆 Game Over! Scoreboard
        </h2>

        {/* Game Details */}
        <div className="bg-purple-50 border border-purple-200 p-6 rounded-xl shadow-inner text-center space-y-4">
          <p className="text-xl font-bold text-purple-700">
            Game Code:{" "}
            <span className="text-purple-900 font-extrabold text-2xl">
              {game?.id}
            </span>
          </p>
          <p className="text-lg text-gray-700">
            Industry: <span className="font-semibold">{game?.industry}</span> |
            Grid Size:{" "}
            <span className="font-semibold">
              {game?.gridSize}x{game?.gridSize}
            </span>
          </p>
        </div>

        {/* Player Ranks */}
        <div className="bg-white p-6 rounded-2xl shadow-lg border-2 border-gray-100">
          <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
            <svg
              className="w-6 h-6 mr-2 text-yellow-500"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M20 6h-4V4c0-1.1.1.9-2 0-2-2H6c-1.1 0-2 .9-2 2v2H4v14h14V6zm-8 8h4v2H8V8zm-4 4h2v6h-2V8z" />
            </svg>
            Player Ranks:
          </h3>
          <div className="bg-gray-50 rounded p-5 max-h-64 overflow-y-auto shadow-inner">
            <ul className="space-y-3">
              {players
                .sort((a, b) => {
                  if (a.score !== b.score) return b.score - a.score;
                  if (a.isSubmitted && b.isSubmitted)
                    return a.submissionTime - b.submissionTime;
                  return a.isSubmitted ? -1 : 1;
                })
                .map((player, index) => (
                  <li
                    key={player.id}
                    className={`flex items-center justify-between p-4 rounded-lg shadow-md border-2 cursor-pointer ${
                      index === 0 && player.isSubmitted
                        ? "bg-yellow-100 border-yellow-400"
                        : "bg-white border-gray-200"
                    }`}
                    onClick={() => setOpenBoard(player)}
                  >
                    <div className="flex flex-col">
                      <span
                        className={`font-extrabold text-2xl mr-3 ${
                          index === 0 && player.isSubmitted
                            ? "text-yellow-600"
                            : "text-gray-600"
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
                        index === 0 && player.isSubmitted
                          ? "text-yellow-700"
                          : "text-purple-700"
                      }`}
                    >
                      Score: {calculateScore(player.checkedSquares)}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-5 mt-10">
          {isAdmin && (
            <button
              onClick={onPlayAgain}
              className="flex-1 font-extrabold py-5 px-6 rounded-2xl text-2xl bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 transition-transform transform hover:scale-105"
            >
              🔄 Play Again (Admin Only)
            </button>
          )}
          <button
            onClick={onBackToLogin}
            className={`flex-1 font-extrabold py-5 px-6 rounded-2xl text-2xl bg-gradient-to-r from-gray-500 to-gray-700 text-white hover:from-gray-600 hover:to-gray-800 transition-transform transform hover:scale-105 ${
              isAdmin ? "" : "w-full"
            }`}
          >
            🚪 Exit Game
          </button>
        </div>
      </div>

      {/* Modal */}
      <PlayerBoardModal
        show={openBoard}
        onClose={() => setOpenBoard(null)}
        player={openBoard}
        game={game}
      />
    </>
  );
};

export default Scoreboard;
