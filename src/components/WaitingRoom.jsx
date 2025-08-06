import React from "react";
import { doc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const WaitingRoom = ({
  game,
  players,
  isAdmin,
  roomCode,
  db,
  appId,
  showError,
  onAskMore,
  currentUserId,
  isGeneratingAskMore,
  showSuccess,
}) => {
  const navigate = useNavigate();

  const handleStartGame = async () => {
    if (!db || !game || !roomCode) return showError("Game data not available.");
    try {
      const gameRef = doc(
        db,
        `artifacts/${appId}/public/data/bingoGames`,
        roomCode
      );
      await updateDoc(gameRef, { status: "playing", startTime: Date.now() });
    } catch (e) {
      showError(`Start failed: ${e.message}`);
    }
  };

  const handleCopyRoomCode = () => {
    navigator.clipboard
      .writeText(roomCode)
      .then(() => showSuccess("Room code copied!"))
      .catch(() => showError("Copy failed – please copy manually"));
  };

  const qrLink = `https://bingo-game.com?room=${roomCode}`;

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 bg-white rounded-2xl shadow-2xl w-full max-w-xs sm:max-w-sm md:max-w-md mx-auto border-4 border-blue-300">
      <h2 className="text-xl sm:text-2xl font-extrabold text-center text-blue-800 drop-shadow-md break-words">
        🛋️ Waiting Room
      </h2>

      {/* Room Code Card */}
      <div className="bg-blue-100 border border-blue-300 p-3 rounded-xl shadow-md text-center space-y-2">
        <p className="text-sm sm:text-base font-bold">Game Room Code</p>
        <div className="flex items-center justify-center space-x-2">
          <span
            className="
              inline-block
              text-[clamp(1.2rem,4vw,2.5rem)]
              font-extrabold
              text-blue-900
              tracking-tighter
              bg-blue-200
              px-2
              rounded
              whitespace-nowrap
            "
          >
            {roomCode}
          </span>
          <button
            onClick={handleCopyRoomCode}
            className="p-1.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition transform hover:scale-110"
            aria-label="Copy"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 1H4C2.9 1 2 1.9 2 3v14h2V3h12V1zm3 4H8C6.9 5 6 5.9 6 7v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
            </svg>
          </button>
        </div>
        <a
          href={qrLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-700 underline text-xs break-words"
        >
          Share link / QR
        </a>
      </div>

      {/* Game Details */}
      <div className="bg-white p-3 rounded-lg shadow border border-gray-200">
        <h3 className="text-sm sm:text-base font-bold mb-1 flex items-center">
          <svg
            className="w-4 h-4 mr-1 text-blue-500"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
          </svg>
          Game Details
        </h3>
        <ul className="text-xs sm:text-sm space-y-0.5">
          <li>
            <span className="font-semibold">Industry:</span> {game?.industry}
          </li>
          <li>
            <span className="font-semibold">Grid:</span> {game?.gridSize}×
            {game?.gridSize}
          </li>
          <li>
            <span className="font-semibold">Timer:</span> {game?.timerDuration}{" "}
            min
          </li>
        </ul>
      </div>

      {/* Players */}
      <div className="bg-white p-3 rounded-lg shadow border border-gray-200">
        <h3 className="text-sm sm:text-base font-bold mb-1 flex items-center">
          <svg
            className="w-4 h-4 mr-1 text-purple-500"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3z" />
          </svg>
          Players ({players.length})
        </h3>
        <div className="bg-gray-50 rounded p-2 max-h-40 overflow-y-auto text-xs space-y-1">
          {players.length === 0 ? (
            <p className="text-gray-500 italic">No players yet… be first!</p>
          ) : (
            players.map((p) => (
              <div
                key={p.id}
                className="bg-white p-1.5 rounded shadow-sm flex flex-col"
              >
                <div className="flex items-start justify-between">
                  <span className="font-semibold break-all">👤 {p.name}</span>
                  {p.id !== currentUserId && p.icebreaker && (
                    <button
                      onClick={() => onAskMore(p)}
                      disabled={isGeneratingAskMore}
                      className="ml-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs"
                    >
                      {isGeneratingAskMore ? "…" : "✨ Ask"}
                    </button>
                  )}
                </div>
                {p.icebreaker && (
                  <p className="text-gray-600 italic text-xs break-words mt-0.5">
                    “{p.icebreaker}”
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Controls */}
      {isAdmin ? (
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleStartGame}
            disabled={players.length < 1}
            className={`flex-1 font-bold py-2.5 rounded-lg text-sm transition-transform ${
              players.length < 1
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:scale-105"
            }`}
          >
            🏁 Start
          </button>
          <button
            onClick={() => navigate("/role")}
            className="flex-1 font-bold py-2.5 rounded-lg bg-gray-500 text-white hover:bg-gray-600 hover:scale-105 text-sm"
          >
            🚪 Exit
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <p className="text-center text-gray-600 italic text-xs animate-bounce-slow">
            Waiting for admin…
          </p>
          <button
            onClick={() => navigate("/role")}
            className="w-full font-bold py-2.5 rounded-lg bg-gray-500 text-white hover:bg-gray-600 hover:scale-105 text-sm"
          >
            🚪 Exit
          </button>
        </div>
      )}
    </div>
  );
};

export default WaitingRoom;
