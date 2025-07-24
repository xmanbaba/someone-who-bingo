import React, { useState, useEffect } from "react";

// AuthScreen Component: Handles user login and signup with email/password and Google
const AuthScreen = ({
  showMessageModal,
  onAuthSuccess,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithGoogle, // New prop for Google Sign-in
}) => {
  const [isLoginMode, setIsLoginMode] = useState(true); // true for login, false for signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Debug logs to inspect props - Keep these for now if still debugging auth issues
  useEffect(() => {
    console.log(
      "AuthScreen (Props): createUserWithEmailAndPassword prop type:",
      typeof createUserWithEmailAndPassword
    );
    console.log(
      "AuthScreen (Props): signInWithEmailAndPassword prop type:",
      typeof signInWithEmailAndPassword
    );
    console.log(
      "AuthScreen (Props): signInWithGoogle prop type:",
      typeof signInWithGoogle
    );
  }, [
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithGoogle,
  ]);

    const handleSubmit = async (e) => {
        e.preventDefault(); // Prevent default form submission
        setLoading(true);

    try {
      if (isLoginMode) {
        if (typeof signInWithEmailAndPassword !== "function") {
          throw new Error(
            "signInWithEmailAndPassword is not a function. Check AuthAndGameHandler prop passing."
          );
        }
        await signInWithEmailAndPassword(email, password);
        showMessageModal("Logged in successfully!", "success");
      } else {
        if (typeof createUserWithEmailAndPassword !== "function") {
          throw new Error(
            "createUserWithEmailAndPassword is not a function. Check AuthAndGameHandler prop passing."
          );
        }
        await createUserWithEmailAndPassword(email, password);
        showMessageModal(
          "Account created successfully! You are now logged in.",
          "success"
        );
      }
      onAuthSuccess();
    } catch (error) {
      console.error("Authentication error:", error);
      let errorMessage = "An unexpected error occurred. Please try again.";
      if (error.code) {
        switch (error.code) {
          case "auth/invalid-email":
            errorMessage = "Invalid email address format.";
            break;
          case "auth/user-disabled":
            errorMessage = "Your account has been disabled.";
            break;
          case "auth/user-not-found":
          case "auth/wrong-password":
            errorMessage = "Invalid email or password.";
            break;
          case "auth/email-already-in-use":
            errorMessage =
              "This email is already registered. Please login or use a different email.";
            break;
          case "auth/weak-password":
            errorMessage = "Password should be at least 6 characters.";
            break;
          case "auth/too-many-requests":
            errorMessage =
              "Too many failed login attempts. Please try again later.";
            break;
          default:
            errorMessage = `Authentication failed: ${error.message}`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      showMessageModal(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      if (typeof signInWithGoogle !== "function") {
        throw new Error(
          "signInWithGoogle is not a function. Check AuthAndGameHandler prop passing."
        );
      }
      await signInWithGoogle();
      showMessageModal("Signed in with Google successfully!", "success");
      onAuthSuccess();
    } catch (error) {
      console.error("Google sign-in error:", error);
      // Specific error handling for user closing popup is in AuthAndGameHandler,
      // so this catches other potential errors.
      showMessageModal(`Google sign-in failed: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 text-gray-900 font-inter">
            <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-xl border border-gray-100 max-w-md w-full animate-fade-in-up transform scale-95">
                <h2 className="text-4xl font-extrabold text-center text-indigo-700 mb-8 drop-shadow-md font-inter-rounded flex items-center justify-center">
                    <svg className="w-12 h-12 mr-3" width="48" height="48" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <linearGradient id="gradientHeartGold" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style={{stopColor: '#FFD700', stopOpacity: 1}} />
                                <stop offset="100%" style={{stopColor: '#FFA500', stopOpacity: 1}} />
                            </linearGradient>
                        </defs>
                        <path fill="url(#gradientHeartGold)" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                    Networking Bingo
                </h2>

                <h3 className="text-2xl font-bold text-center text-blue-700 mb-6 font-inter-rounded">
                    {isLoginMode ? 'Log In' : 'Sign Up'}
                </h3>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-gray-700 text-base font-semibold mb-2 font-inter-rounded">
                            Email:
                        </label>
                        <input
                            type="email"
                            id="email"
                            className="shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 transition duration-300 ease-in-out bg-white placeholder-gray-400 font-inter-rounded"
                            placeholder="your@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-gray-700 text-base font-semibold mb-2 font-inter-rounded">
                            Password:
                        </label>
                        <input
                            type="password"
                            id="password"
                            className="shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 transition duration-300 ease-in-out bg-white placeholder-gray-400 font-inter-rounded"
                            placeholder="********"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-extrabold rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-105 text-xl font-inter-rounded flex items-center justify-center"
                    >
                        {loading ? (
                            <svg className="animate-spin h-6 w-6 mr-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : isLoginMode ? '🔑 Log In' : '📝 Sign Up'}
                    </button>
                </form>

        <p className="text-center text-gray-600 mt-6 font-inter-rounded">
          {isLoginMode ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => setIsLoginMode(!isLoginMode)}
            className="text-indigo-600 hover:text-indigo-800 font-bold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 rounded px-1 -mx-1"
          >
            {isLoginMode ? "Sign Up" : "Log In"}
          </button>
        </p>

        <div className="relative flex py-5 items-center">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="flex-shrink mx-4 text-gray-500 text-sm font-bold font-inter-rounded">
            OR
          </span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>

        {/* Google Sign-in Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-3 px-6 bg-white border border-gray-300 text-gray-700 font-semibold rounded-2xl shadow-md hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 flex items-center justify-center font-inter-rounded"
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google logo"
            className="w-6 h-6 mr-3"
          />
          {loading ? "Signing in..." : "Sign in with Google"}
        </button>
      </div>
    </div>
  );
};

export default AuthScreen;
