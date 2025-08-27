import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useContext,
} from "react";
import { initializeApp, getApps, getApp } from "firebase/app";
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
import { useNavigate, useLocation } from "react-router-dom";
import ProfileIcon from "./ProfileIcon";

const firebaseConfig = {
  apiKey: "AIzaSyBNkwfo1M0YKkOLoguixQhn42qwyCxFX4c",
  authDomain: "find-someone-who-bingo.firebaseapp.com",
  projectId: "find-someone-who-bingo",
  storageBucket: "find-someone-who-bingo.firebasestorage.app",
  messagingSenderId: "136531916308",
  appId: "1:136531916308:web:497b7e7d4b234113629901",
};

const geminiApiKey = "AIzaSyANMkgevmn9i8mdRu_Pa0W-M4AI16rnOzI";

// Session storage keys
const SESSION_KEYS = {
  GAME_ID: "bingo_game_id",
  PLAYER_NAME: "bingo_player_name",
  PLAYER_ICEBREAKER: "bingo_player_icebreaker",
  LAST_ROUTE: "bingo_last_route",
  PLAYER_START_TIME: "bingo_player_start_time",
};

// Routes that should NOT trigger auto-join logic
const NON_GAME_ROUTES = [
  "auth",
  "role",
  "admin",
  "player",
  "dashboard",
  "public-score",
];

const AuthAndGameHandler = ({ children, showMessageModal, onSignOut }) => {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [sessionRestored, setSessionRestored] = useState(false);

  const gameUnsubscribeRef = useRef(null);
  const playersUnsubscribeRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const isReconnectingRef = useRef(false);
  const maxRetries = 3;

  const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";

  // Session management functions
  const saveSession = useCallback((data) => {
    try {
      Object.entries(data).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          sessionStorage.setItem(
            key,
            typeof value === "string" ? value : JSON.stringify(value)
          );
        }
      });
    } catch (error) {
      console.warn("Failed to save session data:", error);
    }
  }, []);

  const getSession = useCallback((key) => {
    try {
      const value = sessionStorage.getItem(key);
      if (!value) return null;

      // Try to parse as JSON, fall back to string
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      console.warn("Failed to get session data:", error);
      return null;
    }
  }, []);

  const clearSession = useCallback(() => {
    try {
      Object.values(SESSION_KEYS).forEach((key) => {
        sessionStorage.removeItem(key);
      });
    } catch (error) {
      console.warn("Failed to clear session data:", error);
    }
  }, []);

  // Clear retry timeout on cleanup
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Replace the existing useEffect that handles player time tracking (around lines 154-195)
  // with this corrected version:

  // Handle player time tracking when game status changes - FIXED TIMING ISSUE
  useEffect(() => {
    if (gameId && gameData?.status && currentUserId) {
      // Save current route to session
      saveSession({ [SESSION_KEYS.LAST_ROUTE]: location.pathname });

      // Handle player time tracking when game starts
      if (gameData.status === "playing") {
        // Only record start time if player doesn't already have one
        // This prevents overwriting the actual start time when status changes
        if (db && playerData && !playerData.startTime) {
          // Use the game's start time as the player's start time
          // This ensures all players have the same reference point
          const gameStartTime =
            gameData.startTime?.toMillis?.() ||
            gameData.startTime ||
            Date.now();

          const playerDocRef = doc(
            db,
            `artifacts/${appId}/public/data/bingoGames/${gameId}/players`,
            currentUserId
          );

          updateDoc(playerDocRef, {
            startTime: gameStartTime,
          }).catch((error) => {
            console.warn("Failed to update player start time:", error);
          });

          // Also save to session for backup
          saveSession({ [SESSION_KEYS.PLAYER_START_TIME]: gameStartTime });
        }
      } else if (gameData.status === "scoring" || gameData.status === "ended") {
        // Record end time for player when game ends
        if (db && playerData && !playerData.endTime) {
          const endTime = Date.now();

          // Get start time from player data first, then fallback to game start time
          const startTime =
            playerData.startTime?.toMillis?.() ||
            playerData.startTime ||
            getSession(SESSION_KEYS.PLAYER_START_TIME) ||
            gameData.startTime?.toMillis?.() ||
            gameData.startTime ||
            endTime; // final fallback

          const playerDocRef = doc(
            db,
            `artifacts/${appId}/public/data/bingoGames/${gameId}/players`,
            currentUserId
          );

          updateDoc(playerDocRef, {
            endTime: endTime,
            startTime: startTime, // Ensure start time is recorded if missing
          }).catch((error) => {
            console.warn("Failed to update player end time:", error);
          });
        }
      }
    }
  }, [
    gameData?.status,
    gameId,
    location.pathname,
    saveSession,
    currentUserId,
    db,
    playerData,
    getSession,
  ]);

  // Helper function to determine if a path segment is a valid game ID
  const isValidGameId = (segment) => {
    if (!segment || NON_GAME_ROUTES.includes(segment)) {
      return false;
    }
    // Additional validation - game IDs are typically alphanumeric
    return /^[a-zA-Z0-9_-]+$/.test(segment) && segment.length >= 3;
  };

  // Check for URL-based game join on auth state change
  useEffect(() => {
    if (currentUserId && !sessionRestored) {
      const urlParams = new URLSearchParams(location.search);
      const joinGameId = urlParams.get("join");

      // Only extract game ID from specific game routes
      let pathGameId = null;
      const pathSegments = location.pathname.split("/").filter(Boolean);

      // Only consider path-based game IDs from game-specific routes
      if (pathSegments.length >= 2) {
        const routeType = pathSegments[0];
        const possibleGameId = pathSegments[1];

        if (
          (routeType === "waiting" ||
            routeType === "play" ||
            routeType === "score") &&
          isValidGameId(possibleGameId)
        ) {
          pathGameId = possibleGameId;
        }
      }

      // Restore session data
      const savedGameId = getSession(SESSION_KEYS.GAME_ID);
      const savedPlayerName = getSession(SESSION_KEYS.PLAYER_NAME);
      const savedIcebreaker = getSession(SESSION_KEYS.PLAYER_ICEBREAKER);
      const savedRoute = getSession(SESSION_KEYS.LAST_ROUTE);

      // Prioritize URL-based join, then path-based game ID, then session restore
      const targetGameId =
        joinGameId ||
        pathGameId ||
        (savedPlayerName && savedIcebreaker ? savedGameId : null);

      if (targetGameId && isValidGameId(targetGameId)) {
        if (savedPlayerName && savedIcebreaker) {
          // Auto-rejoin with saved credentials
          handleAutoJoinFromUrl(
            targetGameId,
            navigate,
            savedPlayerName,
            savedIcebreaker
          );
        } else {
          // Need to collect player info first
          navigate(`/player/join?autoJoin=${targetGameId}`);
        }
      } else if (
        savedRoute &&
        savedRoute !== "/auth" &&
        savedRoute !== "/" &&
        !location.pathname.includes("/dashboard") &&
        !location.pathname.includes("/role")
      ) {
        // Restore last route if no specific game to join and not on protected routes
        navigate(savedRoute, { replace: true });
      }

      setSessionRestored(true);
    }
  }, [currentUserId, location, navigate, getSession, sessionRestored]);

  useEffect(() => {
    const initializeFirebase = async () => {
      try {
        const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
        const firestoreDb = getFirestore(app);
        const firebaseAuth = getAuth(app);

        setDb(firestoreDb);
        setAuth(firebaseAuth);

        const unsubscribeAuth = onAuthStateChanged(firebaseAuth, (user) => {
          setCurrentUserId(user ? user.uid : null);
          if (!user) {
            // Clear session when user logs out
            clearSession();
          }
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
  }, [showMessageModal, clearSession]);

  const setupGameListeners = useCallback(
    (gameIdToWatch) => {
      if (!db || !gameIdToWatch || !currentUserId) return;

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

      // Game document listener
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
            setIsAdmin(
              newGameData.createdBy === currentUserId ||
                newGameData.adminId === currentUserId
            );

            // Save to session
            saveSession({ [SESSION_KEYS.GAME_ID]: gameIdToWatch });
          } else {
            console.log("Game document no longer exists");
            setGameData((prevData) =>
              prevData ? { ...prevData, status: "not_found" } : null
            );
          }
        },
        (error) => {
          console.error("Error listening to game document:", error);
          if (
            error.code === "unavailable" ||
            error.code === "permission-denied"
          ) {
            setConnectionError(true);
            handleConnectionError(gameIdToWatch);
          } else {
            showMessageModal(`Error loading game: ${error.message}`, "error");
          }
        }
      );

      // Players collection listener
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

          // Save player data to session if it exists
          if (currentPlayer) {
            saveSession({
              [SESSION_KEYS.PLAYER_NAME]: currentPlayer.name,
              [SESSION_KEYS.PLAYER_ICEBREAKER]: currentPlayer.icebreaker,
            });
          }
        },
        (error) => {
          console.error("Error listening to players collection:", error);
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
    [db, currentUserId, appId, showMessageModal, saveSession]
  );

  const handleConnectionError = useCallback(
    (gameIdToReconnect) => {
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
      const retryDelay = Math.min(2000 * Math.pow(2, retryCount), 10000);
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
    clearSession();
  };

  const handleAutoJoinFromUrl = async (
    roomCode,
    navigateFunction = navigate,
    savedName = null,
    savedIcebreaker = null
  ) => {
    if (!db || !currentUserId) return;

    try {
      // Check if game exists first
      const gameQuery = query(
        collection(db, `artifacts/${appId}/public/data/bingoGames`),
        where(documentId(), "==", roomCode)
      );
      const gameSnapshot = await getDocs(gameQuery);

      if (gameSnapshot.empty) {
        showMessageModal("Game not found. Please check the code.", "error");
        navigateFunction("/role");
        return;
      }

      const gameDoc = gameSnapshot.docs[0];
      const gameDataFound = { id: gameDoc.id, ...gameDoc.data() };

      // Set up game state
      setGameId(gameDataFound.id);
      setGameData(gameDataFound);
      setIsAdmin(
        gameDataFound.createdBy === currentUserId ||
          gameDataFound.adminId === currentUserId
      );

      // Check if player already exists in this game
      const playerDocRef = doc(
        db,
        `artifacts/${appId}/public/data/bingoGames/${gameDataFound.id}/players`,
        currentUserId
      );
      const playerDocSnap = await getDoc(playerDocRef);

      if (playerDocSnap.exists()) {
        // Player already in game - rejoin
        const existingPlayer = playerDocSnap.data();
        showMessageModal(`Rejoined game as ${existingPlayer.name}!`, "success");

        // Navigate to appropriate screen based on game status
        switch (gameDataFound.status) {
          case "waiting":
            navigateFunction(`/waiting/${gameDataFound.id}`);
            break;
          case "playing":
            navigateFunction(`/play/${gameDataFound.id}`);
            break;
          case "scoring":
          case "ended":
            navigateFunction(`/score/${gameDataFound.id}`);
            break;
          default:
            navigateFunction(`/waiting/${gameDataFound.id}`);
        }
      } else if (savedName && savedIcebreaker) {
        // Auto-join with saved credentials
        await setDoc(playerDocRef, {
          name: savedName,
          checkedSquares: [],
          submissionTime: null,
          isSubmitted: false,
          score: 0,
          icebreaker: savedIcebreaker,
        });

        showMessageModal(`Joined game as ${savedName}!`, "success");
        navigateFunction(`/waiting/${gameDataFound.id}`);
      } else {
        // Need player info - redirect to join page with auto-join flag
        navigateFunction(`/player/join?autoJoin=${roomCode}`);
      }
    } catch (error) {
      console.error("Error auto-joining game:", error);
      showMessageModal(`Failed to join game: ${error.message}`, "error");
      navigateFunction("/role");
    }
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
      // Check if we're already connected to this game
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

        // Save to session
        saveSession({
          [SESSION_KEYS.GAME_ID]: roomCode,
          [SESSION_KEYS.PLAYER_NAME]: playerName,
          [SESSION_KEYS.PLAYER_ICEBREAKER]: icebreaker,
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
      setIsAdmin(
        gameDataFound.createdBy === currentUserId ||
          gameDataFound.adminId === currentUserId
      );

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
          // Initialize time tracking fields
          startTime: null,
          endTime: null,
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

      // Save to session
      saveSession({
        [SESSION_KEYS.GAME_ID]: gameDataFound.id,
        [SESSION_KEYS.PLAYER_NAME]: playerName,
        [SESSION_KEYS.PLAYER_ICEBREAKER]: icebreaker,
      });

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

    // Save to session
    saveSession({
      [SESSION_KEYS.GAME_ID]: newGameId,
    });

    showMessageModal(`Game created with code: ${newGameId}`, "success");
  };

  const handleFinishGame = useCallback(
    (isTimeUp) => {
      if (!db || !gameId || !gameData) return;

      if (gameData.status !== "playing") {
        console.log("Game is not in a playable state, skipping finish");
        return;
      }

      // Only allow game to end if:
      // 1. Time is up, OR
      // 2. Current user is the admin
      if (
        !isTimeUp &&
        gameData.adminId !== currentUserId &&
        gameData.createdBy !== currentUserId
      ) {
        console.log("Only admin or timer can end the game");
        return;
      }

      // Record end time for current player when game finishes
      if (currentUserId && playerData) {
        const endTime = Date.now();
        const playerDocRef = doc(
          db,
          `artifacts/${appId}/public/data/bingoGames/${gameId}/players`,
          currentUserId
        );

        // Get start time from various sources
        const startTime =
          getSession(SESSION_KEYS.PLAYER_START_TIME) ||
          playerData.startTime ||
          gameData.startTime?.toMillis?.() ||
          gameData.startTime ||
          endTime; // fallback

        updateDoc(playerDocRef, {
          endTime: endTime,
          startTime: startTime, // Ensure start time is recorded
        }).catch((error) => {
          console.warn("Failed to update player times on game finish:", error);
        });
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
        endedAt: Date.now(), // Add end timestamp for the game
      }).catch((error) =>
        console.error("Error setting scoring status:", error)
      );
    },
    [db, gameId, gameData, appId, currentUserId, playerData, getSession]
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

    // Clear session
    clearSession();

    showMessageModal("You have exited the game.", "info");
  };

  // Handle sign out
  const handleSignOut = useCallback(() => {
    clearSession();
    signOut(auth);
  }, [auth, clearSession]);

  if (typeof children !== "function") {
    console.error("AuthAndGameHandler: Expected 'children' to be a function.");
    showMessageModal("Application error: Please refresh the page.", "error");
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-100 text-red-800 font-bold text-xl p-4 text-center">
        An unexpected error occurred. Please refresh your browser.
      </div>
    );
  }

  // Add this method to AuthAndGameHandler to handle direct game access
  const handleDirectGameAccess = async (gameIdFromUrl) => {
    if (!db || !currentUserId || !gameIdFromUrl) return false;

    try {
      console.log(`Attempting to load game directly: ${gameIdFromUrl}`);

      // Check if game exists
      const gameDocRef = doc(
        db,
        `artifacts/${appId}/public/data/bingoGames`,
        gameIdFromUrl
      );
      const gameDocSnap = await getDoc(gameDocRef);

      if (!gameDocSnap.exists()) {
        console.log(`Game ${gameIdFromUrl} not found`);
        return false;
      }

      const gameDataFound = { id: gameDocSnap.id, ...gameDocSnap.data() };

      // Check if user has access to this game (either as admin or player)
      const isAdmin =
        gameDataFound.createdBy === currentUserId ||
        gameDataFound.adminId === currentUserId;

      let hasPlayerAccess = false;
      try {
        const playerDocRef = doc(
          db,
          `artifacts/${appId}/public/data/bingoGames/${gameIdFromUrl}/players`,
          currentUserId
        );
        const playerDocSnap = await getDoc(playerDocRef);
        hasPlayerAccess = playerDocSnap.exists();
      } catch (error) {
        console.warn(
          `Error checking player access for game ${gameIdFromUrl}:`,
          error
        );
      }

      if (!isAdmin && !hasPlayerAccess) {
        console.log(
          `User ${currentUserId} has no access to game ${gameIdFromUrl}`
        );
        return false;
      }

      // Set up game state and listeners
      console.log(`Loading game ${gameIdFromUrl} for user ${currentUserId}`);
      setGameId(gameIdFromUrl);
      setGameData(gameDataFound);
      setIsAdmin(isAdmin);

      // Set up listeners will be triggered by the gameId change
      return true;
    } catch (error) {
      console.error(`Error loading game ${gameIdFromUrl}:`, error);
      return false;
    }
  };

  return (
    <>
      {/* Only show ProfileIcon when user is authenticated AND not on homepage */}
      {currentUserId && location.pathname !== "/" && (
        <div className="absolute top-6 right-6 z-50">
          <ProfileIcon
            currentUserId={currentUserId}
            onSignOut={handleSignOut}
            auth={auth}
          />
        </div>
      )}
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
        isAdmin,
        db,
        appId,
        geminiApiKey,
        handleAdminLogin,
        handleJoinGame,
        handleGameCreated,
        handleFinishGame,
        handleAskMore,
        handleBackToLogin,
        handleAutoJoinFromUrl,
        handleDirectGameAccess,
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
        signOut: handleSignOut,
        // Session management utilities
        saveSession,
        getSession,
        clearSession,
      })}
    </>
  );
};

export default AuthAndGameHandler;
