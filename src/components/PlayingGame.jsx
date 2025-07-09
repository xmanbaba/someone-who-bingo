import React, { useState, useEffect, useRef } from "react";
import { doc, updateDoc } from "firebase/firestore";
import SquareDetailsModal from "./SquareDetailsModal";

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
}) => {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalChecked, setModalChecked] = useState(false);
  const [modalNames, setModalNames] = useState([]);
  const [nameInput, setNameInput] = useState("");

  const timerRef = useRef(null);
  const timerStartedRef = useRef(false);

  const getPlayerBoard = (questions, gridSize, checkedSquares) => {
    const board = [];
    const checkedMap = new Map(checkedSquares.map((s) => [s.index, s.names]));
    for (let i = 0; i < gridSize * gridSize; i++) {
      board.push({
        index: i,
        question: questions[i],
        isChecked: checkedMap.has(i),
        names: checkedMap.get(i) || [],
      });
    }
    return board;
  };

  const playerBoard = game
    ? getPlayerBoard(
        game.questions,
        game.gridSize,
        player?.checkedSquares || []
      )
    : [];

  useEffect(() => {
    if (
      game?.status === "playing" &&
      game.startTime &&
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

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [game, onFinishGame]);

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  };

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
    if (!selectedSquare) return;

    const updated = [...(player?.checkedSquares || [])];
    const existing = updated.find((s) => s.index === selectedSquare.index);

    if (modalChecked) {
      if (existing) {
        existing.names = modalNames;
      } else {
        updated.push({ index: selectedSquare.index, names: modalNames });
      }
    } else {
      // Remove if unchecked
      const indexToRemove = updated.findIndex(
        (s) => s.index === selectedSquare.index
      );
      if (indexToRemove !== -1) {
        updated.splice(indexToRemove, 1);
      }
    }

    try {
      const playerRef = doc(
        db,
        `artifacts/${appId}/public/data/bingoGames/${game.id}/players`,
        player.id
      );
      await updateDoc(playerRef, { checkedSquares: updated });
      showSuccess("Square updated successfully!");
      closeModal();
    } catch (error) {
      console.error("Update square error:", error);
      showError("Failed to update square.");
    }
  };

  const addName = () => {
    if (nameInput.trim()) {
      setModalNames([...modalNames, nameInput.trim()]);
      setNameInput("");
    }
  };

  const removeName = (name) => {
    setModalNames(modalNames.filter((n) => n !== name));
  };

  const handleSubmitCard = async () => {
    if (!player || player.isSubmitted) return;

    try {
      const playerRef = doc(
        db,
        `artifacts/${appId}/public/data/bingoGames/${game.id}/players`,
        player.id
      );
      await updateDoc(playerRef, {
        isSubmitted: true,
        submissionTime: Date.now(),
      });
      showSuccess("Card submitted!");
      onFinishGame(false);
    } catch (error) {
      console.error("Submit card error:", error);
      showError("Failed to submit card.");
    }
  };

  const handleAdminEndGame = () => {
    onFinishGame(false);
  };

  return (
    <div className="space-y-8 p-4 sm:p-6 bg-white rounded-3xl shadow-2xl max-w-6xl mx-auto border-4 border-blue-300">
      <h2 className="text-3xl sm:text-4xl font-extrabold text-center text-blue-800">
        🎮 Bingo Game
      </h2>

      <div className="flex flex-col sm:flex-row justify-between items-center bg-blue-100 border border-blue-300 p-4 sm:p-5 rounded-xl">
        <div className="text-lg sm:text-xl font-bold text-blue-700 flex items-center mb-3 sm:mb-0">
          Time Left:{" "}
          <span className="ml-2 text-2xl">{formatTime(timeRemaining)}</span>
        </div>

        {player?.id === game.createdBy && game.status === "playing" && (
          <button
            onClick={handleAdminEndGame}
            className="bg-red-600 text-white px-4 py-2 rounded-lg shadow hover:bg-red-700"
          >
            🛑 End Game (Admin)
          </button>
        )}

        {!player?.isSubmitted && game?.status === "playing" && (
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

      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${game.gridSize}, 1fr)` }}
      >
        {playerBoard.map((square) => (
          <button
            key={square.index}
            disabled={player.isSubmitted || game.status !== "playing"}
            onClick={() => openModal(square)}
            className={`relative p-2 sm:p-3 text-xs sm:text-sm md:text-base break-words whitespace-normal rounded-md transition-all border
              ${
                square.isChecked
                  ? "bg-green-300 border-green-500 text-white"
                  : "bg-white text-gray-800 border-gray-300 hover:bg-blue-100"
              }
              ${player.isSubmitted ? "opacity-50 cursor-not-allowed" : ""}
            `}
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

      <div className="mt-6">
        <h3 className="text-xl font-bold mb-3">Other Players:</h3>
        <ul className="space-y-2">
          {gamePlayers
            .filter((p) => p.id !== player?.id)
            .map((p) => (
              <li key={p.id} className="p-3 bg-gray-100 rounded-md">
                <div className="font-bold">{p.name}</div>
                <div className="italic text-sm">"{p.icebreaker}"</div>
                <button
                  onClick={() => onAskMore(p)}
                  disabled={isGeneratingAskMore}
                  className="text-purple-600 hover:underline mt-1 text-sm"
                >
                  ✨ Ask More
                </button>
              </li>
            ))}
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
 