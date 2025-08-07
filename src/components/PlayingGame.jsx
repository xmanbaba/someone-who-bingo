import React, { useState, useEffect, useRef } from "react";
import { doc, updateDoc } from "firebase/firestore";
import SquareDetailsModal from "./SquareDetailsModal";
import { useNavigate } from "react-router-dom";

const PlayingGame = ({
  game,
  player,
  gamePlayers,
  onFinishGame,
  showError,
  showSuccess,
  onAskMore,
  isGeneratingAskMore,
  currentUserId,
  db,
  appId,
  onSignOut,
  connectionError, // Added from updated App.jsx
  retryCount,      // Added from updated App.jsx
}) => {
  const navigate = useNavigate();
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalChecked, setModalChecked] = useState(false);
  const [modalNames, setModalNames] = useState([]);
  const [nameInput, setNameInput] = useState("");

  const timerRef = useRef(null);
  const timerStartedRef = useRef(false);


  // Handle case where game or player data might be temporarily null during connection issues
  const getPlayerBoard = (questions, gridSize, checkedSquares) => {
    if (!questions || !gridSize) return [];
    
    const board = [];
    const checkedMap = new Map(
      checkedSquares?.map((s) => [s.index, s.names]) || []
    );
    for (let i = 0; i < gridSize * gridSize; i++) {
      board.push({
        index: i,
        question: questions[i] || `Question ${i + 1}`, // Fallback for missing questions
        isChecked: checkedMap.has(i),
        names: checkedMap.get(i) || [],
      });
    }
    return board;
  };

  const playerBoard = game && game.questions && game.gridSize
    ? getPlayerBoard(game.questions, game.gridSize, player?.checkedSquares)
    : [];

  /* ---------- TIMER ---------- */
  useEffect(() => {
    if (
      game?.status === "playing" &&
      game.startTime &&
      game.timerDuration &&
      !timerStartedRef.current
    ) {
      const startTime =
        typeof game.startTime.toMillis === "function"
          ? game.startTime.toMillis()
          : game.startTime;
      const initialTime = game.timerDuration * 60 * 1000;
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, initialTime - elapsed);
      setTimeRemaining(remaining);
      timerStartedRef.current = true;

      timerRef.current = setInterval(() => {
        const nowElapsed = Date.now() - startTime;
        const nowRemaining = Math.max(0, initialTime - nowElapsed);
        setTimeRemaining(nowRemaining);
        if (nowRemaining <= 0) {
          clearInterval(timerRef.current);
          onFinishGame(true);
        }
      }, 1000);
    }
    return () => timerRef.current && clearInterval(timerRef.current);
  }, [game?.status, game?.startTime, game?.timerDuration, onFinishGame]);

  /* ---------- AUTO-SUBMIT ON FULL CARD ---------- */
  useEffect(() => {
    if (
      game?.status === "playing" &&
      game?.gridSize &&
      player?.checkedSquares?.length === game.gridSize * game.gridSize &&
      !player.isSubmitted
    ) {
      handleSubmitCard();
    }
  }, [
    player?.checkedSquares?.length, // More specific dependency
    game?.gridSize,
    player?.isSubmitted,
    game?.status,
  ]);

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  };

  /* ---------- MODAL HANDLERS ---------- */
  const openModal = (square) => {
    setSelectedSquare(square);
    setModalChecked(square.isChecked);
    setModalNames(square.names || []);
    setNameInput("");
    setIsModalOpen(true);
  };
  
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedSquare(null);
    setModalChecked(false);
    setModalNames([]);
    setNameInput("");
  };

  const saveSquareChanges = async () => {
    if (!selectedSquare || !player?.id || !game?.id) return;
    
    const updated = [...(player?.checkedSquares || [])];
    const existing = updated.find((s) => s.index === selectedSquare.index);
    
    if (modalChecked) {
      if (existing) {
        existing.names = modalNames;
      } else {
        updated.push({ index: selectedSquare.index, names: modalNames });
      }
    } else {
      const idx = updated.findIndex((s) => s.index === selectedSquare.index);
      if (idx !== -1) updated.splice(idx, 1);
    }
    
    try {
      await updateDoc(
        doc(
          db,
          `artifacts/${appId}/public/data/bingoGames/${game.id}/players`,
          currentUserId // Use currentUserId instead of player.id for consistency
        ),
        { checkedSquares: updated }
      );
  //     showSuccess("Square updated!");
     closeModal();
    } catch (e) {
      console.error("Error updating square:", e);
      showError("Failed to update square.");
    }
  };

  const addName = () => {
    if (nameInput.trim()) {
      setModalNames([...modalNames, nameInput.trim()]);
      setNameInput("");
    }
  };
  
  const removeName = (name) =>
    setModalNames(modalNames.filter((n) => n !== name));

  const handleSubmitCard = async () => {
    if (!player || player.isSubmitted || !game?.id) return;
    
    try {
      await updateDoc(
        doc(
          db,
          `artifacts/${appId}/public/data/bingoGames/${game.id}/players`,
          currentUserId
        ),
        { isSubmitted: true, submissionTime: Date.now() }
      );
      showSuccess("Card submitted!");
      onFinishGame(false);
    } catch (e) {
      console.error("Error submitting card:", e);
      showError("Failed to submit card.");
    }
  };

  const handleAdminEndGame = () => onFinishGame(false);

  // Show loading/connection state when data is missing
  if (!game || !player) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-blue-50">
        <div className="text-center p-8">
          {connectionError ? (
            <div className="space-y-4">
              <div className="text-red-600 font-bold text-xl">
                Connection Issue
              </div>
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
          ) : (
            <div className="space-y-4">
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
          )}
        </div>
      </div>
    );
  }

  /* ---------- RENDER ---------- */
  return (
    <div className="space-y-8 p-4 sm:p-6 bg-white rounded-3xl shadow-2xl max-w-6xl mx-auto border-4 border-blue-300">
      {/* Connection status indicator */}
      {connectionError && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <strong>Connection Issue:</strong> Reconnecting... (Attempt {retryCount}/3)
        </div>
      )}
      
      <h2 className="text-3xl sm:text-4xl font-extrabold text-center text-blue-800">
        🎮 Bingo Game
      </h2>

      {/* Timer & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-blue-100 border border-blue-300 p-4 sm:p-5 rounded-xl">
        <div className="text-lg sm:text-xl font-bold text-blue-700 flex items-center mb-3 sm:mb-0">
          Time Left:{" "}
          <span className="ml-2 text-2xl">{formatTime(timeRemaining)}</span>
        </div>

        {/* Fixed: Use correct admin check */}
        {game.adminId === currentUserId && game.status === "playing" && (
          <button
            onClick={handleAdminEndGame}
            className="bg-red-600 text-white px-4 py-2 rounded-lg shadow hover:bg-red-700"
          >
            🛑 End Game (Admin)
          </button>
        )}

        {!player?.isSubmitted && game.status === "playing" && (
          <button
            onClick={handleSubmitCard}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg shadow hover:bg-purple-700"
          >
            📢 Submit Card
          </button>
        )}
        {player?.isSubmitted && (
          <span className="text-green-600 font-semibold">✅ Submitted</span>
        )}
      </div>

      {/* Grid */}
      {game.gridSize && (
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${game.gridSize}, minmax(0, 1fr))`,
          }}
        >
          {playerBoard.map((square) => (
            <button
              key={square.index}
              disabled={player.isSubmitted || game.status !== "playing" || connectionError}
              onClick={() => openModal(square)}
              className={`relative p-2 sm:p-3 text-xs sm:text-sm break-words rounded-md transition-all border ${
                square.isChecked
                  ? "bg-green-300 border-green-500 text-white"
                  : "bg-white text-gray-800 border-gray-300 hover:bg-blue-100"
              } ${player.isSubmitted || connectionError ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {square.question}
              {square.isChecked && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-10 rounded-md">
                  ✅
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Other Players */}
      <div className="mt-6">
        <h3 className="text-xl font-bold mb-3">Other Players:</h3>
        <ul className="space-y-2">
          {gamePlayers
            ?.filter((p) => p.id !== currentUserId) // Use currentUserId for consistency
            .map((p) => (
              <li key={p.id} className="p-3 bg-gray-100 rounded-md">
                <div className="font-bold">{p.name}</div>
                <div className="italic text-sm">"{p.icebreaker}"</div>
                <button
                  onClick={() => onAskMore(p)}
                  disabled={isGeneratingAskMore || connectionError}
                  className="text-purple-600 hover:underline mt-1 text-sm disabled:opacity-50"
                >
                  {isGeneratingAskMore ? "…" : "✨ Ask More"}
                </button>
              </li>
            )) || []}
        </ul>
      </div>

      {/* Modal */}
      <SquareDetailsModal
        show={isModalOpen}
        onClose={closeModal}
        onSave={saveSquareChanges}
        question={selectedSquare?.question}
        currentNames={modalNames}
        isChecked={modalChecked}
        onToggleCheck={() => setModalChecked(!modalChecked)}
        onAddName={addName}
        onRemoveName={removeName}
        nameInput={nameInput}
        onNameInputChange={(e) => setNameInput(e.target.value)}
      />
    </div>
  );
};

export default PlayingGame;