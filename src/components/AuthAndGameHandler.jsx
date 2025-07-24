import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useContext, // ✅ Fixed: added this import
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
} from "firebase/firestore";

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
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [gameData, setGameData] = useState(null);
  const [playerData, setPlayerData] = useState(null);
  const [gamePlayers, setGamePlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGeneratingAskMore, setIsGeneratingAskMore] = useState(false);

  const gameUnsubscribeRef = useRef(null);
  const playersUnsubscribeRef = useRef(null);

  const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";

  useEffect(() => {
    const initializeFirebase = async () => {
      try {
        const app = initializeApp(firebaseConfig);
        const firestoreDb = getFirestore(app);
        const firebaseAuth = getAuth(app);
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

  useEffect(() => {
    if (!db || !gameId || !currentUserId) return;

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
        }
      },
      (error) => {
        console.error("Error listening to game document:", error);
        showMessageModal(`Error loading game: ${error.message}`, "error");
      }
    );

        const playersCollectionRef = collection(db, `artifacts/${appId}/public/data/bingoGames/${gameId}/players`);
        playersUnsubscribeRef.current = onSnapshot(playersCollectionRef, (snapshot) => {
            const playersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setGamePlayers(playersList);
            const currentPlayer = playersList.find(p => p.id === currentUserId);
            setPlayerData(currentPlayer);
        }, (error) => {
            console.error("Error listening to players collection:", error);
            showMessageModal(`Error loading players: ${error.message}`, 'error');
        });

        return () => {
            if (gameUnsubscribeRef.current) gameUnsubscribeRef.current();
            if (playersUnsubscribeRef.current) playersUnsubscribeRef.current();
        };
    }, [db, gameId, currentUserId, appId, showMessageModal]);

  const handleAdminLogin = () => {
    setGameId(null);
    setGameData(null);
    setPlayerData(null);
    setGamePlayers([]);
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
      const gameQuery = query(
        collection(db, `artifacts/${appId}/public/data/bingoGames`),
        where(documentId(), "==", roomCode)
      );
      const gameSnapshot = await getDocs(gameQuery);

            if (gameSnapshot.empty) {
                showMessageModal("Game not found with this code. Please check the code or try again.", 'error');
                return;
            }

      const gameDoc = gameSnapshot.docs[0];
      const gameDataFound = { id: gameDoc.id, ...gameDoc.data() };

            if (gameDataFound.status !== 'waiting' && gameDataFound.status !== 'playing') {
                showMessageModal("This game is not in a joinable state (e.g., it might be over).", 'error');
                return;
            }

            setGameId(gameDataFound.id);
            setGameData(gameDataFound);

            const playerDocRef = doc(db, `artifacts/${appId}/public/data/bingoGames/${gameDataFound.id}/players`, currentUserId);
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
                showMessageModal(`Joined game ${gameDataFound.id} as ${playerName}!`, 'success');
            } else {
                await updateDoc(playerDocRef, {
                    name: playerName,
                    icebreaker: icebreaker,
                });
                showMessageModal(`Rejoined game ${gameDataFound.id} as ${playerName}!`, 'success');
            }

        } catch (error) {
            console.error("Error joining game:", error);
            showMessageModal(`Failed to join game: ${error.message}`, 'error');
        }
    };

  const handleGameCreated = (newGameId, initialGameData) => {
    setGameId(newGameId);
    setGameData(initialGameData);
    showMessageModal(`Game created with code: ${newGameId}`, "success");
  };

  const handleFinishGame = useCallback(
    (isTimeUp) => {
      if (!db || !gameId || !gameData) return;

      if (isTimeUp && gameData.status === "playing") {
        const gameRef = doc(
          db,
          `artifacts/${appId}/public/data/bingoGames`,
          gameId
        );
        updateDoc(gameRef, {
          status: "scoring",
          scoringEndTime: Date.now() + 5 * 60 * 1000,
        }).catch((error) =>
          console.error("Error setting scoring status:", error)
        );
      }
    },
    [db, gameId, gameData, appId]
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
    setGameId(null);
    setGameData(null);
    setPlayerData(null);
    setGamePlayers([]);
    showMessageModal("You have exited the game.", "info");
    if (gameUnsubscribeRef.current) gameUnsubscribeRef.current();
    if (playersUnsubscribeRef.current) playersUnsubscribeRef.current();
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
