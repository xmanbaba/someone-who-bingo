import React, { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";

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
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-4 max-w-sm w-full"
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
              className={`p-2 text-xs rounded-md border break-words text-center ${
                sq.isChecked
                  ? sq.correct === true
                    ? "bg-green-200 border-green-500"
                    : sq.correct === false
                    ? "bg-red-200 border-red-500"
                    : "bg-yellow-200"
                  : "bg-gray-100"
              }`}
            >
              <div className="truncate">{sq.question}</div>
              {sq.isChecked && (
                <>
                  <div className="text-xs text-gray-600 mt-1 break-words">
                    {sq.names.join(", ")}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 mt-1">
                      <button
                        onClick={() => handleMark(sq.index, true)}
                        className="px-1 py-0.5 bg-green-500 text-white rounded text-xs"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => handleMark(sq.index, false)}
                        className="px-1 py-0.5 bg-red-500 text-white rounded text-xs"
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

  /* ---------- SCORE HELPERS ---------- */
  const now = Date.now();
  const maxTime = game.timerDuration * 60 * 1000;

  const computeScores = (p) => {
    const filled = p.checkedSquares?.length || 0;
    const correct = (p.checkedSquares || []).filter(
      (s) => s.correct === true
    ).length;
    const time = p.submissionTime || now;

    const completionScore = (filled / (game.gridSize * game.gridSize)) * 40;
    const accuracyScore = filled === 0 ? 0 : (correct / filled) * 60;
    const timeScore = p.isSubmitted
      ? Math.max(0, ((maxTime - (time - game.startTime)) / maxTime) * 10)
      : 0;

    return {
      completionScore,
      accuracyScore,
      timeScore,
      aggregate: completionScore + accuracyScore + timeScore,
    };
  };

  /* ---------- SORT ---------- */
  const sortedPlayers = [...players]
    .map((p) => ({ ...p, ...computeScores(p) }))
    .sort((a, b) => {
      if (a.aggregate !== b.aggregate) return b.aggregate - a.aggregate;
      if (a.isSubmitted && !b.isSubmitted) return -1;
      if (!a.isSubmitted && b.isSubmitted) return 1;
      return (a.submissionTime || 0) - (b.submissionTime || 0);
    });

  return (
    <>
      <div className="space-y-8 p-6 bg-white rounded-3xl shadow-2xl max-w-3xl mx-auto border-4 border-purple-300">
        <h2 className="text-4xl font-extrabold text-center text-purple-800 mb-6">
          🏆 Game Over! Scoreboard
        </h2>

        {/* Game Details */}
        <div className="bg-purple-50 border border-purple-200 p-6 rounded-xl shadow-inner text-center">
          <p className="text-xl font-bold text-purple-700">
            Game Code:{" "}
            <span className="text-purple-900 font-extrabold">{game.id}</span>
          </p>
          <p className="text-lg text-gray-700">
            Industry: <span className="font-semibold">{game.industry}</span> |
            Grid Size:{" "}
            <span className="font-semibold">
              {game.gridSize}×{game.gridSize}
            </span>
          </p>
        </div>

        {/* Player List */}
        <div className="bg-white p-6 rounded-2xl shadow-lg border-2 border-gray-100">
          <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
            <svg
              className="w-6 h-6 mr-2 text-yellow-500"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M20 6h-4V4c0-1.1.1.9-2 0-2-2H6c-1.1 0-2 .9-2 2v2H4v14h14V6z" />
            </svg>
            Player Ranks:
          </h3>
          <div className="bg-gray-50 rounded p-5 max-h-64 overflow-y-auto shadow-inner">
            <ul className="space-y-3">
              {sortedPlayers.map((player, idx) => (
                <li
                  key={player.id}
                  className={`flex flex-col sm:flex-row justify-between items-center p-4 rounded-lg shadow-md border-2 cursor-pointer ${
                    idx === 0
                      ? "bg-yellow-100 border-yellow-400"
                      : "bg-white border-gray-200"
                  }`}
                  onClick={() => setOpenBoard(player)}
                >
                  <div className="flex items-center mb-2 sm:mb-0">
                    <span className="font-extrabold text-xl mr-3">
                      {idx + 1}.
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
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-purple-700">
                      {player.aggregate.toFixed(1)} pts
                    </div>
                    <div className="text-xs text-gray-500">
                      {player.isSubmitted ? "Submitted" : "Not Submitted"}
                    </div>
                  </div>
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
        isAdmin={isAdmin}
        db={db}
        appId={appId}
        onToggleCorrect={() => setOpenBoard(null)}
      />
    </>
  );
};

export default Scoreboard;
