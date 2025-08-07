import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useContext,
} from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  documentId,
  connectFirestoreEmulator,
} from "firebase/firestore";
import { useNavigate, Navigate} from "react-router-dom";

const firebaseConfig = {
  apiKey: "AIzaSyBNkwfo1M0YKkOLoguixQhn42qwyCxFX4c",
  authDomain: "find-someone-who-bingo.firebaseapp.com",
  projectId: "find-someone-who-bingo",
  storageBucket: "find-someone-who-bingo.firebasestorage.app",
  messagingSenderId: "136531916308",
  appId: "1:136531916308:web:497b7e7d4b234113629901",
};

const geminiApiKey = "AIzaSyANMkgevmn9i8mdRu_Pa0W-M4AI16rnOzI";

const AuthAndGameHandler = ({ children, showMessageModal }) => {
  const navigate = useNavigate();
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [gameData, setGameData] = useState(null);
  const [playerData, setPlayerData] = useState(null);
  const [gamePlayers, setGamePlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGeneratingAskMore, setIsGeneratingAskMore] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false); // Track if current user is admin

  const gameUnsubscribeRef = useRef(null);
  const playersUnsubscribeRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const isReconnectingRef = useRef(false); // Prevent multiple reconnection attempts
  const maxRetries = 3;

  const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";

  // Clear retry timeout on cleanup
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
  if (
    gameId &&
    (gameData?.status === "scoring" || gameData?.status === "ended")
  ) {
    console.log("✅ Game finished. Navigating to scoreboard...");
    navigate(`/score/${gameId}`, { replace: true });
  }
}, [gameData?.status, gameId, navigate]);


  useEffect(() => {
    const initializeFirebase = async () => {
      try {
        const app = initializeApp(firebaseConfig);
        const firestoreDb = getFirestore(app);
        const firebaseAuth = getAuth(app);

        // Configure Firestore settings for better connection handling
        if (typeof window !== "undefined") {
          // Enable offline persistence
          try {
            // Note: enableNetwork and other settings might need to be adjusted based on your needs
          } catch (persistenceError) {
            console.warn(
              "Could not enable offline persistence:",
              persistenceError
            );
          }
        }

        setDb(firestoreDb);
        setAuth(firebaseAuth);

        const unsubscribeAuth = onAuthStateChanged(firebaseAuth, (user) => {
          setCurrentUserId(user ? user.uid : null);
          setLoading(false);
        });

        return () => {
          unsubscribeAuth();
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
  }, [showMessageModal]);

  const setupGameListeners = useCallback(
    (gameIdToWatch) => {
      if (!db || !gameIdToWatch || !currentUserId) return;

      // Prevent multiple reconnection attempts
      if (isReconnectingRef.current) {
        console.log("Already reconnecting, skipping new listener setup");
        return;
      }

      // Clear existing listeners
      if (gameUnsubscribeRef.current) {
        gameUnsubscribeRef.current();
        gameUnsubscribeRef.current = null;
      }
      if (playersUnsubscribeRef.current) {
        playersUnsubscribeRef.current();
        playersUnsubscribeRef.current = null;
      }

      const gameDocRef = doc(
        db,
        `artifacts/${appId}/public/data/bingoGames`,
        gameIdToWatch
      );

      // Game document listener with improved error handling
      gameUnsubscribeRef.current = onSnapshot(
        gameDocRef,
        (docSnap) => {
          setConnectionError(false);
          setRetryCount(0);
          isReconnectingRef.current = false;

          if (docSnap.exists()) {
            const data = docSnap.data();
            const newGameData = { id: docSnap.id, ...data };
            setGameData(newGameData);

            // Check if current user is admin
            setIsAdmin(newGameData.createdBy === currentUserId);
          } else {
            console.log("Game document no longer exists");
            setGameData((prevData) =>
              prevData ? { ...prevData, status: "not_found" } : null
            );
          }
        },
        (error) => {
          console.error("Error listening to game document:", error);

          // Only handle specific connection errors, not all errors
          if (
            error.code === "unavailable" ||
            error.code === "permission-denied"
          ) {
            setConnectionError(true);
            handleConnectionError(gameIdToWatch);
          } else {
            // For other errors, show message but don't auto-retry
            showMessageModal(`Error loading game: ${error.message}`, "error");
          }
        }
      );

      // Players collection listener with improved error handling
      const playersCollectionRef = collection(
        db,
        `artifacts/${appId}/public/data/bingoGames/${gameIdToWatch}/players`
      );

      playersUnsubscribeRef.current = onSnapshot(
        playersCollectionRef,
        (snapshot) => {
          setConnectionError(false);
          setRetryCount(0);
          isReconnectingRef.current = false;

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

          // Only handle specific connection errors
          if (
            error.code === "unavailable" ||
            error.code === "permission-denied"
          ) {
            setConnectionError(true);
            handleConnectionError(gameIdToWatch);
          } else {
            showMessageModal(
              `Error loading players: ${error.message}`,
              "error"
            );
          }
        }
      );
    },
    [db, currentUserId, appId, showMessageModal]
  );

  const handleConnectionError = useCallback(
    (gameIdToReconnect) => {
      // Prevent multiple simultaneous reconnection attempts
      if (isReconnectingRef.current) {
        console.log("Already attempting to reconnect, skipping");
        return;
      }

      if (retryCount >= maxRetries) {
        console.log("Max retries reached, stopping reconnection attempts");
        showMessageModal(
          "Connection lost. Please refresh the page to reconnect.",
          "error"
        );
        return;
      }

      isReconnectingRef.current = true;
      const retryDelay = Math.min(2000 * Math.pow(2, retryCount), 10000); // Exponential backoff, max 10 seconds
      console.log(
        `Attempting to reconnect in ${retryDelay}ms (attempt ${
          retryCount + 1
        }/${maxRetries})`
      );

      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }

      retryTimeoutRef.current = setTimeout(() => {
        setRetryCount((prev) => prev + 1);
        console.log("Reconnecting listeners...");
        setupGameListeners(gameIdToReconnect);
      }, retryDelay);
    },
    [retryCount, maxRetries, setupGameListeners, showMessageModal]
  );

  useEffect(() => {
    if (gameId) {
      setupGameListeners(gameId);
    }

    return () => {
      if (gameUnsubscribeRef.current) gameUnsubscribeRef.current();
      if (playersUnsubscribeRef.current) playersUnsubscribeRef.current();
      isReconnectingRef.current = false;
    };
  }, [gameId, setupGameListeners]);

  const handleAdminLogin = () => {
    setGameId(null);
    setGameData(null);
    setPlayerData(null);
    setGamePlayers([]);
    setConnectionError(false);
    setRetryCount(0);
    setIsAdmin(false);
    isReconnectingRef.current = false;
  };

  const handleJoinGame = async (roomCode, playerName, icebreaker) => {
    if (!db || !currentUserId) {
      showMessageModal(
        "Firebase not initialized or user not authenticated.",
        "error"
      );
      return;
    }

    try {
      // First, check if we're already connected to this game
      if (gameId === roomCode && gameData && playerData) {
        console.log("Already connected to this game, updating player info");
        const playerDocRef = doc(
          db,
          `artifacts/${appId}/public/data/bingoGames/${roomCode}/players`,
          currentUserId
        );

        await updateDoc(playerDocRef, {
          name: playerName,
          icebreaker: icebreaker,
        });

        showMessageModal(`Updated your info in game ${roomCode}!`, "success");
        return roomCode;
      }

      const gameQuery = query(
        collection(db, `artifacts/${appId}/public/data/bingoGames`),
        where(documentId(), "==", roomCode)
      );
      const gameSnapshot = await getDocs(gameQuery);

      if (gameSnapshot.empty) {
        showMessageModal(
          "Game not found with this code. Please check the code or try again.",
          "error"
        );
        return;
      }

      const gameDoc = gameSnapshot.docs[0];
      const gameDataFound = { id: gameDoc.id, ...gameDoc.data() };

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

      // Set game data first, then set up listeners
      setGameId(gameDataFound.id);
      setGameData(gameDataFound);
      setIsAdmin(gameDataFound.createdBy === currentUserId);

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
        await updateDoc(playerDocRef, {
          name: playerName,
          icebreaker: icebreaker,
        });
        showMessageModal(
          `Rejoined game ${gameDataFound.id} as ${playerName}!`,
          "success"
        );
      }

      return gameDataFound.id;
    } catch (error) {
      console.error("Error joining game:", error);
      showMessageModal(`Failed to join game: ${error.message}`, "error");
    }
  };

  const handleGameCreated = (newGameId, initialGameData) => {
    setGameId(newGameId);
    setGameData(initialGameData);
    setIsAdmin(true);
    setConnectionError(false);
    setRetryCount(0);
    isReconnectingRef.current = false;
    showMessageModal(`Game created with code: ${newGameId}`, "success");
  };

  const handleFinishGame = useCallback(
  (isTimeUp) => {
    if (!db || !gameId || !gameData) return;

    if (gameData.status !== "playing") {
      console.log("Game is not in a playable state, skipping finish");
      return;
    }

    const gameRef = doc(
      db,
      `artifacts/${appId}/public/data/bingoGames`,
      gameId
    );

    const scoringEndTime = Date.now() + 5 * 60 * 1000;

    updateDoc(gameRef, {
      status: "scoring",
      scoringEndTime,
      endedBy: isTimeUp ? "timer" : currentUserId,
    }).catch((error) =>
      console.error("Error setting scoring status:", error)
    );
  },
  [db, gameId, gameData, appId, currentUserId, isAdmin]
);


  const handleAskMore = async (playerToAsk) => {
    setIsGeneratingAskMore(true);
    const prompt = `Generate a fun, open-ended follow-up question for a networking bingo icebreaker.
        The person's icebreaker is: "${playerToAsk.icebreaker}".
        Output only the question.`;

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
      const question =
        result?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;

      if (question) {
        showMessageModal(`Ask ${playerToAsk.name}: "${question}"`, "info");
      } else {
        showMessageModal("No follow-up question generated.", "error");
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

  const handleBackToLogin = () => {
    // Clean up all state
    setGameId(null);
    setGameData(null);
    setPlayerData(null);
    setGamePlayers([]);
    setConnectionError(false);
    setRetryCount(0);
    setIsAdmin(false);
    isReconnectingRef.current = false;

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    // Clean up listeners
    if (gameUnsubscribeRef.current) {
      gameUnsubscribeRef.current();
      gameUnsubscribeRef.current = null;
    }
    if (playersUnsubscribeRef.current) {
      playersUnsubscribeRef.current();
      playersUnsubscribeRef.current = null;
    }

    showMessageModal("You have exited the game.", "info");
  };

  if (typeof children !== "function") {
    console.error("AuthAndGameHandler: Expected 'children' to be a function.");
    showMessageModal("Application error: Please refresh the page.", "error");
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-100 text-red-800 font-bold text-xl p-4 text-center">
        An unexpected error occurred. Please refresh your browser.
      </div>
    );
  }

  return (
    <>
      {children({
        currentUserId,
        gameId,
        gameData,
        playerData,
        gamePlayers,
        loading,
        isGeneratingAskMore,
        connectionError,
        retryCount,
        isAdmin, // Add isAdmin to the context
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
        createUserWithEmailAndPassword: (email, password) =>
          createUserWithEmailAndPassword(auth, email, password),
        signInWithEmailAndPassword: (email, password) =>
          signInWithEmailAndPassword(auth, email, password),
        signInWithGoogle: async () => {
          const provider = new GoogleAuthProvider();
          try {
            await signInWithPopup(auth, provider);
          } catch (error) {
            if (error.code === "auth/popup-closed-by-user") {
              showMessageModal("Google sign-in cancelled.", "info");
            } else {
              console.error("Google sign-in error:", error);
              showMessageModal(
                `Google sign-in failed: ${error.message}`,
                "error"
              );
            }
          }
        },
        signOut: () => signOut(auth),
      })}
    </>
  );
};

export default AuthAndGameHandler;
