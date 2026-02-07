import React, { useState, useEffect, useRef } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
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
  connectionError,
  retryCount,
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
  const gameStartTimeRef = useRef(null);
  const timerDurationRef = useRef(null);

  const getPlayerBoard = (questions, gridSize, checkedSquares) => {
    if (!questions || !gridSize) return [];
    const board = [];
    const checkedMap = new Map(
      checkedSquares?.map((s) => [s.index, s.names]) || []
    );
    for (let i = 0; i < gridSize * gridSize; i++) {
      board.push({
        index: i,
        question: questions[i] || `Question ${i + 1}`,
        isChecked: checkedMap.has(i),
        names: checkedMap.get(i) || [],
      });
    }
    return board;
  };

  const playerBoard =
    game && game.questions && game.gridSize
      ? getPlayerBoard(game.questions, game.gridSize, player?.checkedSquares)
      : [];

  // ---------- TIMER ----------
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (game?.status === "playing" && game.startTime && game.timerDuration) {
      const startTime =
        typeof game.startTime.toMillis === "function"
          ? game.startTime.toMillis()
          : new Date(game.startTime).getTime();

      gameStartTimeRef.current = startTime;
      timerDurationRef.current = game.timerDuration;

      const totalDurationMs = game.timerDuration * 60 * 1000;
      const initialRemaining = Math.max(
        0,
        totalDurationMs - (Date.now() - startTime)
      );

      setTimeRemaining(initialRemaining);
      timerStartedRef.current = true;

      timerRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = now - gameStartTimeRef.current;
        const remaining = Math.max(
          0,
          timerDurationRef.current * 60 * 1000 - elapsed
        );

        setTimeRemaining(remaining);

        if (remaining <= 0) {
          clearInterval(timerRef.current);
          timerRef.current = null;

          if (!player?.isSubmitted) {
            handleTimeoutSubmission();
          }

          if (game.adminId === currentUserId) {
            setTimeout(() => onFinishGame(true), 2000);
          }
        }
      }, 1000);
    } else {
      timerStartedRef.current = false;
      setTimeRemaining(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [game?.status, game?.startTime, game?.timerDuration, game?.id]);

  useEffect(() => {
    if (game?.status === "playing" && gamePlayers && gamePlayers.length > 0) {
      const allSubmitted = gamePlayers.every((p) => p.isSubmitted);
      if (allSubmitted) {
        setTimeout(() => onFinishGame(false), 1000);
      }
    }
  }, [gamePlayers, game?.status, onFinishGame]);

  useEffect(() => {
    if (player?.isSubmitted && timerRef.current) {
      // Timer continues for display, but no auto-submit
    }
  }, [player?.isSubmitted]);

  const formatTime = (ms) => {
    if (!ms || isNaN(ms)) return "00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  };

  // ---------- ENSURE PLAYER START TIME SAVED ----------
  useEffect(() => {
    if (game?.status === "playing" && db && player && !player.startTime) {
      const startTime = Date.now();

      // Save to Firestore
      const playerDocRef = doc(
        db,
        `artifacts/${appId}/public/data/bingoGames/${game.id}/players`,
        currentUserId
      );

      updateDoc(playerDocRef, { startTime })
        .then(() => {
          console.log("Player startTime set:", startTime);
        })
        .catch((error) => {
          console.warn("Failed to update player start time:", error);
        });
    }
  }, [game?.status, db, player, appId, game?.id, currentUserId]);

  // ---------- MODAL HANDLERS ----------
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

    const pendingName = nameInput.trim();
    const namesToSave =
      pendingName && !modalNames.includes(pendingName)
        ? [...modalNames, pendingName]
        : modalNames;

    const updated = [...(player?.checkedSquares || [])];
    const existing = updated.find((s) => s.index === selectedSquare.index);

    if (modalChecked) {
      if (existing) {
        existing.names = namesToSave;
      } else {
        updated.push({ index: selectedSquare.index, names: namesToSave });
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
          currentUserId
        ),
        { checkedSquares: updated }
      );
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

  // Replace the handleTimeoutSubmission function with this corrected version:

 const handleTimeoutSubmission = async () => {
   try {
     const playerDocRef = doc(
       db,
       `artifacts/${appId}/public/data/bingoGames/${game.id}/players`,
       currentUserId
     );
     const snap = await getDoc(playerDocRef);

     if (snap.exists() && snap.data().isSubmitted) {
       console.log(
         "⏱️ Skipping timeout auto-submit, player already submitted."
       );
       return;
     }

     // proceed with timeout submission
     const gameStartTime =
       typeof game.startTime?.toMillis === "function"
         ? game.startTime.toMillis()
         : new Date(game.startTime).getTime();

     const gameDurationMs = game.timerDuration * 60 * 1000;
     const submissionTime = gameStartTime + gameDurationMs;

     await updateDoc(playerDocRef, {
       isSubmitted: true,
       submissionTime,
       endTime: submissionTime,
       finishedByTimeout: true,
       startTime: snap.data()?.startTime || gameStartTime,
     });

     showSuccess("Time's up! Your card has been automatically submitted.");
   } catch (e) {
     console.error("Error auto-submitting card:", e);
     showError("Failed to auto-submit card.");
   }
 };


  // Also replace the handleSubmitCard function to ensure proper timing:

  const handleSubmitCard = async () => {
    if (!player || player.isSubmitted || !game?.id) return;

    try {
      const submissionTime = Date.now();

      await updateDoc(
        doc(
          db,
          `artifacts/${appId}/public/data/bingoGames/${game.id}/players`,
          currentUserId
        ),
        {
          isSubmitted: true,
          submissionTime,
          endTime: submissionTime,
          finishedByTimeout: false,
          // ✅ ensure startTime always exists
          startTime: player?.startTime
            ? typeof player.startTime?.toMillis === "function"
              ? player.startTime.toMillis()
              : new Date(player.startTime).getTime()
            : submissionTime,
        }
      );

      showSuccess("Card submitted successfully!");
    } catch (e) {
      console.error("Error submitting card:", e);
      showError("Failed to submit card.");
    }
  };

  const handleAdminEndGame = () => onFinishGame(false);

  /* ---------- RENDER ---------- */
  return (
    <div className="space-y-8 p-4 sm:p-6 bg-white rounded-3xl shadow-2xl max-w-6xl mx-auto border-4 border-blue-300">
      {/* Show loading/connection state when data is missing */}
      {!game || !player ? (
        <div className="flex items-center justify-center min-h-screen bg-blue-50 w-full">
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
      ) : (
        <>
          {/* Connection status indicator */}
          {connectionError && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
              <strong>Connection Issue:</strong> Reconnecting... (Attempt{" "}
              {retryCount}/3)
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

            {/* Admin End Game Button */}
            {game.adminId === currentUserId && game.status === "playing" && (
              <button
                onClick={handleAdminEndGame}
                className="bg-red-600 text-white px-4 py-2 rounded-lg shadow hover:bg-red-700"
              >
                🛑 End Game (Admin)
              </button>
            )}

            {/* Player Submit Button */}
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
                  disabled={
                    player.isSubmitted ||
                    game.status !== "playing" ||
                    connectionError
                  }
                  onClick={() => openModal(square)}
                  className={`relative p-2 sm:p-3 text-xs sm:text-sm break-words rounded-md transition-all border ${
                    square.isChecked
                      ? "bg-green-300 border-green-500 text-white"
                      : "bg-white text-gray-800 border-gray-300 hover:bg-blue-100"
                  } ${
                    player.isSubmitted || connectionError
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
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
                ?.filter((p) => p.id !== currentUserId)
                .map((p) => (
                  <li key={p.id} className="p-3 bg-gray-100 rounded-md">
                    <div className="font-bold flex items-center justify-between">
                      <span>{p.name}</span>
                      {p.isSubmitted && (
                        <span className="text-green-600 text-sm">
                          ✅ Submitted
                        </span>
                      )}
                    </div>
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
        </>
      )}
    </div>
  );
};

export default PlayingGame;
