import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

// LoginPage Component: Handles an authenticated player joining a game
const LoginPage = ({ onJoinGame, showError, onSignOut, getSession }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [icebreaker, setIcebreaker] = useState("");

  // Load saved data and URL parameters on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const autoJoinGameId = urlParams.get("autoJoin");

    // Load from session storage
    const savedName = getSession?.("bingo_player_name") || "";
    const savedIcebreaker = getSession?.("bingo_player_icebreaker") || "";

    // Set form values
    if (autoJoinGameId) {
      setRoomCode(autoJoinGameId);
    }
    if (savedName) {
      setPlayerName(savedName);
    }
    if (savedIcebreaker) {
      setIcebreaker(savedIcebreaker);
    }
  }, [location.search, getSession]);

  // Handler for the "Join Game" action
  const handleJoinGame = async () => {
    if (!roomCode.trim() || !playerName.trim() || !icebreaker.trim()) {
      showError("Please enter Room Code, Player Name, and a fun Icebreaker.");
      return;
    }

    try {
      const joinedGameId = await onJoinGame(
        roomCode.trim(),
        playerName.trim(),
        icebreaker.trim()
      );
      if (joinedGameId) {
        navigate(`/waiting/${joinedGameId}`);
      }
    } catch (err) {
      showError("Failed to join game. Please try again.");
    }
  };

  return (
    // Main container for the login page, with modern styling
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 text-gray-900 font-inter">
      <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-xl border border-gray-100 max-w-md w-full animate-fade-in-up transform scale-95">
        <h2 className="text-4xl font-extrabold text-center text-indigo-700 mb-8 drop-shadow-md font-inter-rounded flex items-center justify-center">
          {/* Modernized Heart/Bingo Icon using a linear gradient for visual appeal */}
          <svg
            className="w-12 h-12 mr-3"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient
                id="gradientHeartGold"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop
                  offset="0%"
                  style={{ stopColor: "#FFD700", stopOpacity: 1 }}
                />
                <stop
                  offset="100%"
                  style={{ stopColor: "#FFA500", stopOpacity: 1 }}
                />
              </linearGradient>
            </defs>
            <path
              fill="url(#gradientHeartGold)"
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            />
          </svg>
          Networking Bingo
        </h2>

        {/* Show auto-join info if applicable */}
        {new URLSearchParams(location.search).get("autoJoin") && (
          <div className="bg-blue-100 border border-blue-300 p-3 rounded-lg mb-6 text-center">
            <p className="text-sm font-semibold text-blue-800">
              🎮 After login, you'll join game:{" "}
              <span className="font-mono">
                {new URLSearchParams(location.search).get("autoJoin")}
              </span>
            </p>
          </div>
        )}

        {/* Section for Joining an Existing Game */}
        <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl shadow-inner space-y-5 mb-8">
          <h3 className="text-2xl font-bold text-blue-700 flex items-center font-inter-rounded mb-4">
            {/* User Icon */}
            <svg
              className="w-8 h-8 mr-3"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
            Join a Game
          </h3>
          <div>
            <label
              htmlFor="roomCode"
              className="block text-gray-700 text-base font-semibold mb-2 font-inter-rounded"
            >
              Room Code:
            </label>
            <input
              type="text"
              id="roomCode"
              className="shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 transition duration-300 ease-in-out bg-white placeholder-gray-400 font-inter-rounded"
              placeholder="e.g., ABCDE"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              required
            />
          </div>
          <div>
            <label
              htmlFor="playerName"
              className="block text-gray-700 text-base font-semibold mb-2 font-inter-rounded"
            >
              Your Name:
            </label>
            <input
              type="text"
              id="playerName"
              className="shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 transition duration-300 ease-in-out bg-white placeholder-gray-400 font-inter-rounded"
              placeholder="e.g., Jane Doe"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              required
            />
          </div>
          <div>
            <label
              htmlFor="icebreaker"
              className="block text-gray-700 text-base font-semibold mb-2 font-inter-rounded"
            >
              Your Fun Icebreaker:
            </label>
            <input
              type="text"
              id="icebreaker"
              className="shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 transition duration-300 ease-in-out bg-white placeholder-gray-400 font-inter-rounded"
              placeholder="e.g., 'Loves to pet dogs!'"
              value={icebreaker}
              onChange={(e) => setIcebreaker(e.target.value)}
              required
            />
          </div>
          <button
            onClick={handleJoinGame}
            className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-extrabold rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-105 text-xl font-inter-rounded animate-pulse-light"
          >
            🚀 Join Game
          </button>
        </div>

        {/* Navigation Buttons for Player */}
        <div className="flex flex-col space-y-4 mt-8">
          <button
            onClick={() => navigate("/role")}
            className="w-full py-3 px-6 bg-gray-200 text-gray-800 font-bold rounded-2xl hover:bg-gray-300 transition-all duration-300 shadow-md transform hover:scale-105 text-lg font-inter-rounded"
          >
            ⬅️ Back to Role Selection
          </button>
          <button
            onClick={onSignOut}
            className="w-full py-3 px-6 bg-red-100 text-red-700 font-bold rounded-2xl hover:bg-red-200 transition-all duration-300 shadow-md transform hover:scale-105 text-lg font-inter-rounded"
          >
            🚪 Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
