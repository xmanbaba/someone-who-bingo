import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// AuthScreen Component
const AuthScreen = ({
  showMessageModal,
  onAuthSuccess,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithGoogle,
}) => {
  const navigate = useNavigate();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLoginMode) {
        await signInWithEmailAndPassword(email, password);
        showMessageModal("Logged in!", "success");
      } else {
        await createUserWithEmailAndPassword(email, password);
        showMessageModal("Account created!", "success");
      }
      navigate("/role")
    } catch (error) {
      let msg = "Authentication failed.";
      switch (error.code) {
        case "auth/invalid-email":
          msg = "Invalid email.";
          break;
        case "auth/user-not-found":
        case "auth/wrong-password":
          msg = "Wrong email or password.";
          break;
        case "auth/email-already-in-use":
          msg = "Email already registered.";
          break;
        case "auth/weak-password":
          msg = "≥ 6 characters required.";
          break;
        default:
          msg = error.message;
      }
      showMessageModal(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      showMessageModal("Signed in with Google!", "success");
      navigate("/role");  
    } catch (error) {
      showMessageModal(`Google sign-in failed: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 text-gray-900 font-inter">
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100 max-w-xs w-full sm:max-w-sm">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-center text-indigo-700 mb-2 flex items-center justify-center">
          <svg
            className="w-8 h-8 sm:w-10 sm:h-10 mr-2"
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
          Networking Bingo
        </h2>

        <h3 className="text-xl sm:text-2xl font-bold text-center text-blue-700 mb-6">
          {isLoginMode ? "Log In" : "Sign Up"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-gray-700 text-sm font-semibold mb-1"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              placeholder="you@example.com"
              className="w-full text-sm sm:text-base border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-300"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-gray-700 text-sm font-semibold mb-1"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              placeholder="••••••"
              className="w-full text-sm sm:text-base border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-300"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-transform transform hover:scale-105 disabled:opacity-60"
          >
            {loading ? (
              <svg
                className="animate-spin h-5 w-5 mx-auto"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
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
            ) : isLoginMode ? (
              "🔑 Log In"
            ) : (
              "📝 Sign Up"
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-4">
          {isLoginMode ? "No account?" : "Already have one?"}{" "}
          <button
            onClick={() => setIsLoginMode(!isLoginMode)}
            className="text-indigo-600 font-bold underline"
          >
            {isLoginMode ? "Sign Up" : "Log In"}
          </button>
        </p>

        <div className="relative flex items-center my-4">
          <div className="flex-grow border-t border-gray-300" />
          <span className="flex-shrink mx-2 text-xs text-gray-500">OR</span>
          <div className="flex-grow border-t border-gray-300" />
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center py-2.5 sm:py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl shadow hover:bg-gray-100 transition-transform transform hover:scale-105"
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google logo"
            className="w-5 h-5 mr-2"
          />
          {loading ? "Signing in..." : "Sign in with Google"}
        </button>
      </div>
    </div>
  );
};

export default AuthScreen;
