import React from "react";
import { useNavigate } from "react-router-dom";

const Homepage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-between min-h-screen p-4 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 text-gray-900 font-inter">
      {/* Hero Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-gray-100 max-w-sm sm:max-w-md w-full mt-auto mb-auto text-center animate-fade-in-up">
        {/* Heart Logo */}
        <svg
          className="w-16 h-16 mx-auto mb-4"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="gHeart" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFD700" />
              <stop offset="100%" stopColor="#FFA500" />
            </linearGradient>
          </defs>
          <path
            fill="url(#gHeart)"
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          />
        </svg>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-indigo-700 mb-3">
          Networking Bingo
        </h1>

        <p className="text-sm sm:text-base text-gray-700 mb-5 leading-relaxed">
          A fast-paced ice-breaker game where you race to fill a bingo card by
          finding colleagues who match each square’s prompt.
        </p>

        {/* How-to steps */}
        <ul className="text-left space-y-2 text-xs sm:text-sm text-gray-600 mb-6">
          <li>1️⃣ Admins create a room & pick an industry.</li>
          <li>2️⃣ Players join with the room code.</li>
          <li>3️⃣ Mark squares by meeting people & noting their names.</li>
          <li>4️⃣ First to submit a full card (or most squares) wins!</li>
        </ul>

        {/* CTA Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => navigate("/auth")}
            className="w-full py-3 px-6 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-xl shadow-lg hover:scale-105 transition-transform"
          >
            🚀 Get Started
          </button>

          <button
            onClick={() => navigate("/auth")}
            className="w-full py-3 px-6 bg-white border-2 border-indigo-500 text-indigo-600 font-bold rounded-xl shadow-md hover:scale-105 transition-transform"
          >
            🔑 Already have an account?
          </button>
        </div>
      </div>

      {/* Tiny footer */}
      <p className="text-xs text-gray-400 mt-4">
        Built with 💜 for better networking.
      </p>
    </div>
  );
};

export default Homepage;
