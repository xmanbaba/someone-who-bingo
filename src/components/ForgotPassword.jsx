import React, { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";

const ForgotPassword = ({ auth, onBack, showMessageModal }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      showMessageModal("Please enter your email address.", "error");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setEmailSent(true);
      showMessageModal(
        "Password reset email sent! Check your inbox.",
        "success"
      );
    } catch (error) {
      console.error("Password reset error:", error);
      let msg = "Failed to send password reset email.";

      switch (error.code) {
        case "auth/user-not-found":
          msg = "No account found with this email address.";
          break;
        case "auth/invalid-email":
          msg = "Invalid email address format.";
          break;
        case "auth/too-many-requests":
          msg = "Too many requests. Please try again later.";
          break;
        case "auth/network-request-failed":
          msg = "Network error. Please check your connection.";
          break;
        default:
          msg = error.message || "Failed to send password reset email.";
      }

      showMessageModal(msg, "error");
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
            fill="currentColor"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          Reset Password
        </h2>

        {!emailSent ? (
          <>
            <p className="text-center text-gray-600 mb-6 text-sm">
              Enter your email address and we'll send you a link to reset your
              password.
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label
                  htmlFor="reset-email"
                  className="block text-gray-700 text-sm font-semibold mb-1"
                >
                  Email Address
                </label>
                <input
                  type="email"
                  id="reset-email"
                  placeholder="you@example.com"
                  className="w-full text-sm sm:text-base border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-300"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-transform transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
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
                ) : (
                  "🔑 Send Reset Email"
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg
                className="w-8 h-8 text-green-600"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-green-600">Email Sent!</h3>
            <p className="text-sm text-gray-600">
              We've sent a password reset link to <strong>{email}</strong>.
              Check your inbox and follow the instructions to reset your
              password.
            </p>
            <p className="text-xs text-gray-500">
              Don't see the email? Check your spam folder.
            </p>
          </div>
        )}

        <button
          onClick={onBack}
          className="w-full mt-6 py-2.5 sm:py-3 bg-gray-200 text-gray-700 font-bold rounded-xl shadow-md hover:bg-gray-300 transition-transform transform hover:scale-105"
          disabled={loading}
        >
          ⬅️ Back to Login
        </button>
      </div>
    </div>
  );
};

export default ForgotPassword;
