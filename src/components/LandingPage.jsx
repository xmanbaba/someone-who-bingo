import React from "react";

const LandingPage = ({ onSelectRole }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 text-gray-900 font-inter">
      <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-xl border border-gray-100 max-w-md w-full animate-fade-in-up transform scale-95 text-center">
        <h2 className="text-4xl font-extrabold text-center text-indigo-700 mb-8 drop-shadow-md font-inter-rounded flex items-center justify-center">
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

        <p className="text-xl text-gray-700 mb-8 font-semibold font-inter-rounded">
          Welcome! Please choose your role to begin.
        </p>

        <div className="space-y-6">
          <button
            onClick={() => onSelectRole("player")}
            className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-extrabold rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-105 text-xl font-inter-rounded"
          >
            👤 I'm a Regular Player
          </button>

          <div className="relative flex py-5 items-center">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink mx-4 text-gray-500 text-sm font-bold font-inter-rounded">
              OR
            </span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>

          <button
            onClick={() => onSelectRole("admin")}
            className="w-full py-4 px-6 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-extrabold rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-105 text-xl font-inter-rounded"
          >
            👑 I'm an Admin
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
