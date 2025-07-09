import React, { useState, useEffect, useRef, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, addDoc, setDoc, updateDoc, onSnapshot, collection, query, where, getDocs, getDoc,documentId } from 'firebase/firestore';

// ====================================================================================================
// IMPORTANT: FOR LOCAL DEVELOPMENT (e.g., in VS Code)
// You MUST replace the placeholder values below with YOUR ACTUAL Firebase project configuration.
// Get these details from your Firebase project settings -> Project settings -> General -> Your apps.
// This is necessary for the app to connect to your Firebase project.
// ====================================================================================================
const firebaseConfig = {
    apiKey: "AIzaSyBNkwfo1M0YKkOLoguixQhn42qwyCxFX4c", // <--- REPLACE THIS
    authDomain: "find-someone-who-bingo.firebaseapp.com", // <--- REPLACE THIS (e.g., your-project-id.firebaseapp.com)
    projectId: "find-someone-who-bingo", // <--- REPLACE THIS
    storageBucket: "find-someone-who-bingo.firebasestorage.app", // <--- REPLACE THIS (e.g., your-project-id.appspot.com)
    messagingSenderId: "136531916308", // <--- REPLACE THIS
    appId: "1:136531916308:web:497b7e7d4b234113629901" // <--- REPLACE THIS
};

// ====================================================================================================
// IMPORTANT: REPLACE THIS WITH YOUR ACTUAL GEMINI API KEY
// This key is used for AI functionalities within the application (e.g., question generation).
// ====================================================================================================
const geminiApiKey = "AIzaSyANMkgevmn9i8mdRu_Pa0W-M4AI16rnOzI"; // <--- REPLACE THIS with your actual Gemini API Key


// Initialize Firebase App globally for this component
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Default app ID for Firestore paths.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';


// AuthAndGameHandler Component: Manages authentication and core game state
const AuthAndGameHandler = ({ children, showMessageModal }) => {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [gameId, setGameId] = useState(null);
  const [gameData, setGameData] = useState(null);
  const [playerData, setPlayerData] = useState(null);
  const [gamePlayers, setGamePlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGeneratingAskMore, setIsGeneratingAskMore] = useState(false);

  // Ref to keep track of the Firestore game listener's unsubscribe function
  const gameUnsubscribeRef = useRef(null);
  // Ref to keep track of the Firestore players listener's unsubscribe function
  const playersUnsubscribeRef = useRef(null);

  // Get the app ID from the environment (for Canvas) or use a default for local dev
  const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";

  // Effect for Firebase initialization and authentication state changes
  useEffect(() => {
    const initializeFirebase = async () => {
      try {
        const app = initializeApp(firebaseConfig);
        const firestoreDb = getFirestore(app);
        const firebaseAuth = getAuth(app);
        setDb(firestoreDb);
        setAuth(firebaseAuth);

        // Listen for auth state changes
        const unsubscribeAuth = onAuthStateChanged(
          firebaseAuth,
          async (user) => {
            if (user) {
              setCurrentUserId(user.uid);
              // Check if the user is an admin based on their UID (e.g., a predefined admin UID)
              // For now, let's assume the first user to create a game is the admin, or a specific UID
              // This needs to be more robust for production (e.g., admin role stored in Firestore)
              // For testing, we can hardcode an admin UID or use a simple flag.
              // For now, isAdmin is set by handleAdminLogin.
            } else {
              // Sign in anonymously if no user is logged in
              try {
                // Use __initial_auth_token if available (from Canvas environment)
                if (
                  typeof __initial_auth_token !== "undefined" &&
                  __initial_auth_token
                ) {
                  await signInWithCustomToken(
                    firebaseAuth,
                    __initial_auth_token
                  );
                } else {
                  await signInAnonymously(firebaseAuth);
                }
              } catch (error) {
                console.error("Error signing in anonymously:", error);
                showMessageModal(
                  `Authentication failed: ${error.message}`,
                  "error"
                );
              }
            }
            setLoading(false); // Authentication state is ready
          }
        );

        return () => {
          unsubscribeAuth(); // Clean up auth listener
          if (gameUnsubscribeRef.current) gameUnsubscribeRef.current();
          if (playersUnsubscribeRef.current) playersUnsubscribeRef.current();
        };
      } catch (error) {
        console.error("Error initializing Firebase:", error);
        showMessageModal(
          `Failed to initialize Firebase: ${error.message}`,
          "error"
        );
        setLoading(false);
      }
    };

    initializeFirebase();
  }, [showMessageModal]); // Dependency on showMessageModal to avoid stale closure

  // Effect for real-time game data listener
  useEffect(() => {
    if (!db || !gameId || !currentUserId) return;

    // Unsubscribe from previous listeners if gameId changes
    if (gameUnsubscribeRef.current) gameUnsubscribeRef.current();
    if (playersUnsubscribeRef.current) playersUnsubscribeRef.current();

    const gameDocRef = doc(
      db,
      `artifacts/${appId}/public/data/bingoGames`,
      gameId
    );
    gameUnsubscribeRef.current = onSnapshot(
      gameDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setGameData({ id: docSnap.id, ...data });
          // If game status becomes 'ended' or 'scoring', ensure timer is stopped
          if (data.status === "ended" || data.status === "scoring") {
            // Logic to stop timer would be in PlayingGame, but ensure state reflects
          }
        } else {
          console.log("No such game document!");
          setGameId(null);
          setGameData(null);
          setPlayerData(null);
          setGamePlayers([]);
          showMessageModal(
            "The game you were in no longer exists or has ended.",
            "info"
          );
          setIsAdmin(false); // Reset admin state if game disappears
        }
      },
      (error) => {
        console.error("Error listening to game document:", error);
        showMessageModal(`Error loading game: ${error.message}`, "error");
      }
    );

    const playersCollectionRef = collection(
      db,
      `artifacts/${appId}/public/data/bingoGames/${gameId}/players`
    );
    playersUnsubscribeRef.current = onSnapshot(
      playersCollectionRef,
      (snapshot) => {
        const playersList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setGamePlayers(playersList);
        const currentPlayer = playersList.find((p) => p.id === currentUserId);
        setPlayerData(currentPlayer);
      },
      (error) => {
        console.error("Error listening to players collection:", error);
        showMessageModal(`Error loading players: ${error.message}`, "error");
      }
    );

    // Cleanup function for this effect
    return () => {
      if (gameUnsubscribeRef.current) gameUnsubscribeRef.current();
      if (playersUnsubscribeRef.current) playersUnsubscribeRef.current();
    };
  }, [db, gameId, currentUserId, appId, showMessageModal]);

  // Admin login handler (sets isAdmin true and clears gameId to go to AdminSetup)
  const handleAdminLogin = () => {
    setIsAdmin(true);
    setGameId(null); // Clear gameId to ensure AdminSetup is shown
    setGameData(null);
    setPlayerData(null);
    setGamePlayers([]);
  };

  // Player joins game handler
  const handleJoinGame = async (roomCode, playerName, icebreaker) => {
    if (!db || !currentUserId) {
      showMessageModal(
        "Firebase not initialized or user not authenticated.",
        "error"
      );
      return;
    }

    try {
      // Query for the game document using the roomCode
      const gameDocRef = doc(
        db,
        `artifacts/${appId}/public/data/bingoGames`,
        roomCode
      );
      const gameDocSnap = await getDoc(gameDocRef);

      if (!gameDocSnap.exists()) {
        showMessageModal(
          "Game not found with this code. Please check the code or try again.",
          "error"
        );
        return;
      }

      const gameDataFound = { id: gameDocSnap.id, ...gameDocSnap.data() };

      

      if (
        gameDataFound.status !== "waiting" &&
        gameDataFound.status !== "playing"
      ) {
        showMessageModal(
          "This game is not in a joinable state (e.g., it might be over).",
          "error"
        );
        return;
      }

      setGameId(gameDataFound.id);
      setGameData(gameDataFound);
      setIsAdmin(false); // Ensure player is not marked as admin

      // Add player to the game's subcollection if not already there
      const playerDocRef = doc(
        db,
        `artifacts/${appId}/public/data/bingoGames/${gameDataFound.id}/players`,
        currentUserId
      );
      const playerDocSnap = await getDoc(playerDocRef);

      if (!playerDocSnap.exists()) {
        await setDoc(playerDocRef, {
          name: playerName,
          checkedSquares: [],
          submissionTime: null,
          isSubmitted: false,
          score: 0,
          icebreaker: icebreaker,
        });
        showMessageModal(
          `Joined game ${gameDataFound.id} as ${playerName}!`,
          "success"
        );
      } else {
        // Update player's name and icebreaker if they already exist (e.g., rejoining)
        await updateDoc(playerDocRef, {
          name: playerName,
          icebreaker: icebreaker,
        });
        showMessageModal(
          `Rejoined game ${gameDataFound.id} as ${playerName}!`,
          "success"
        );
      }
    } catch (error) {
      console.error("Error joining game:", error);
      showMessageModal(`Failed to join game: ${error.message}`, "error");
    }
  };

  // Handler when admin successfully creates a game
  const handleGameCreated = (newGameId, initialGameData) => {
    setGameId(newGameId);
    setGameData(initialGameData);
    setIsAdmin(true); // Ensure admin status is maintained
    showMessageModal(`Game created with code: ${newGameId}`, "success");
  };

  // Handler for when a game finishes (from PlayingGame)
  const handleFinishGame = useCallback(
    (isTimeUp) => {
      if (!db || !gameId || !gameData) return;

      // If it's time up and current user is admin, change status to scoring
      if (isTimeUp && isAdmin && gameData.status === "playing") {
        const gameRef = doc(
          db,
          `artifacts/${appId}/public/data/bingoGames`,
          gameId
        );
        updateDoc(gameRef, {
          status: "scoring",
          scoringEndTime: Date.now() + 5 * 60 * 1000, // 5 minutes for scoring
        }).catch((error) =>
          console.error("Error setting scoring status:", error)
        );
      }
      // Transition to scoreboard regardless if time is up or manually submitted
      // The game state listener will pick up the 'scoring' or 'ended' status
    },
    [db, gameId, gameData, isAdmin, appId]
  );

  // Handler for AI "Ask More" feature
  const handleAskMore = async (playerToAsk) => {
    setIsGeneratingAskMore(true);
    const prompt = `Generate a fun, open-ended follow-up question for a networking bingo icebreaker.
        The person's icebreaker is: "${playerToAsk.icebreaker}".
        The question should encourage further conversation based on their icebreaker.
        Example: If icebreaker is "Loves to pet dogs!", a question could be "What's your favorite dog breed and why?"
        Output only the question, nothing else.`;

    let chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
    const payload = { contents: chatHistory };
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API call failed: ${response.status} - ${errorText}`);
      }
      const result = await response.json();
      if (
        result.candidates &&
        result.candidates.length > 0 &&
        result.candidates[0].content &&
        result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0
      ) {
        const question = result.candidates[0].content.parts[0].text;
        showMessageModal(`Ask ${playerToAsk.name}: "${question}"`, "info");
      } else {
        showMessageModal(
          "Could not generate a follow-up question. Please try again.",
          "error"
        );
      }
    } catch (error) {
      console.error("Error generating follow-up question:", error);
      showMessageModal(
        `Failed to generate question: ${error.message}`,
        "error"
      );
    } finally {
      setIsGeneratingAskMore(false);
    }
  };

  // Handler to go back to login/admin choice (e.g., from Waiting Room for admin)
  const handleBackToLogin = () => {
    setGameId(null);
    setGameData(null);
    setPlayerData(null);
    setGamePlayers([]);
    setIsAdmin(false); // Reset admin status
    // Unsubscribe from any active game/player listeners
    if (gameUnsubscribeRef.current) gameUnsubscribeRef.current();
    if (playersUnsubscribeRef.current) playersUnsubscribeRef.current();
  };

  return (
    <>
      {/* Conditional rendering for children: only call if it's a function */}
      {typeof children === "function" ? (
        children({
          currentUserId,
          isAdmin,
          gameId,
          gameData,
          playerData,
          gamePlayers,
          loading,
          isGeneratingAskMore,
          db,
          appId,
          geminiApiKey,
          handleAdminLogin,
          handleJoinGame,
          handleGameCreated,
          handleFinishGame,
          handleAskMore,
          handleBackToLogin,
          auth,
        })
      ) : (
        <div className="flex items-center justify-center min-h-screen bg-red-100 text-red-800 font-bold text-xl p-4 text-center">
          Application error: Expected content not found. Please refresh your
          browser.
        </div>
      )}
    </>
  );
};

export default AuthAndGameHandler;
