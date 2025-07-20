import React, { useState, useEffect, useRef, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInWithCustomToken,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
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

    // Ref to keep track of the Firestore game listener's unsubscribe function
    const gameUnsubscribeRef = useRef(null);
    // Ref to keep track of the Firestore players listener's unsubscribe function
    const playersUnsubscribeRef = useRef(null);

    // Get the app ID from the environment (for Canvas) or use a default for local dev
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

    // Effect for Firebase initialization and authentication state changes
    useEffect(() => {
        const initializeFirebase = async () => {
            try {
                const app = initializeApp(firebaseConfig);
                const firestoreDb = getFirestore(app);
                const firebaseAuth = getAuth(app);
                setDb(firestoreDb);
                setAuth(firebaseAuth);
                console.log("AuthAndGameHandler (Init): Firebase Auth object initialized:", firebaseAuth); 

                // Listen for auth state changes
                const unsubscribeAuth = onAuthStateChanged(firebaseAuth, (user) => {
                    if (user) {
                        setCurrentUserId(user.uid);
                        console.log("AuthAndGameHandler (Auth State): User authenticated, UID:", user.uid); 
                    } else {
                        setCurrentUserId(null); 
                        console.log("AuthAndGameHandler (Auth State): User not authenticated (null UID)"); 
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
                showMessageModal(`Failed to initialize Firebase: ${error.message}`, 'error');
                setLoading(false);
            }
        };

        initializeFirebase();
    }, [showMessageModal]); 

    // Effect for real-time game data listener
    useEffect(() => {
        if (!db || !gameId || !currentUserId) return;

        if (gameUnsubscribeRef.current) gameUnsubscribeRef.current();
        if (playersUnsubscribeRef.current) playersUnsubscribeRef.current();

        const gameDocRef = doc(db, `artifacts/${appId}/public/data/bingoGames`, gameId);
        gameUnsubscribeRef.current = onSnapshot(gameDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setGameData({ id: docSnap.id, ...data });
                if (data.status === 'ended' || data.status === 'scoring') {
                    // Logic to stop timer would be in PlayingGame, but ensure state reflects
                }
            } else {
                console.log("No such game document!");
                setGameId(null);
                setGameData(null);
                setPlayerData(null);
                setGamePlayers([]); 
                showMessageModal("The game you were in no longer exists or has ended.", 'info');
            }
        }, (error) => {
            console.error("Error listening to game document:", error);
            showMessageModal(`Error loading game: ${error.message}`, 'error');
        });

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
            showMessageModal("Firebase not initialized or user not authenticated.", 'error');
            return;
        }

        try {
            const gameQuery = query(
                collection(db, `artifacts/${appId}/public/data/bingoGames`),
                where(documentId(), '==', roomCode) 
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
        showMessageModal(`Game created with code: ${newGameId}`, 'success');
    };

    const handleFinishGame = useCallback((isTimeUp) => {
        if (!db || !gameId || !gameData) return;

        if (isTimeUp && gameData.status === 'playing') { 
            const gameRef = doc(db, `artifacts/${appId}/public/data/bingoGames`, gameId);
            updateDoc(gameRef, {
                status: 'scoring',
                scoringEndTime: Date.now() + (5 * 60 * 1000) 
            }).catch(error => console.error("Error setting scoring status:", error));
        }
    }, [db, gameId, gameData, appId]); 

    const handleAskMore = async (playerToAsk) => {
        setIsGeneratingAskMore(true);
        const prompt = `Generate a fun, open-ended follow-up question for a networking bingo icebreaker.
        The person's icebreaker is: "${playerToAsk.icebreaker}".
        The question should encourage further conversation based on their icebreaker.
        Output only the question, nothing else.`;

        let chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
        const payload = { contents: chatHistory };
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API call failed: ${response.status} - ${errorText}`);
            }
            const result = await response.json();
            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                const question = result.candidates[0].content.parts[0].text;
                showMessageModal(`Ask ${playerToAsk.name}: "${question}"`, 'info');
            } else {
                showMessageModal("Could not generate a follow-up question. Please try again.", 'error');
            }
        } catch (error) {
            console.error("Error generating follow-up question:", error);
            showMessageModal(`Failed to generate question: ${error.message}`, 'error');
        } finally {
            setIsGeneratingAskMore(false);
        }
    };

    const handleBackToLogin = () => {
        setGameId(null);
        setGameData(null);
        setPlayerData(null);
        setGamePlayers([]); 
        showMessageModal("You have exited the game.", 'info');
        if (gameUnsubscribeRef.current) gameUnsubscribeRef.current();
        if (playersUnsubscribeRef.current) playersUnsubscribeRef.current();
    };

    // Safety check: Ensure children is a function before attempting to call it
    if (typeof children !== 'function') {
        console.error("AuthAndGameHandler: Expected 'children' to be a function, but received:", typeof children, children);
        showMessageModal("Application error: Please refresh the page.", 'error');
        return (
            <div className="flex items-center justify-center min-h-screen bg-red-100 text-red-800 font-bold text-xl p-4 text-center">
                An unexpected error occurred. Please refresh your browser.
            </div>
        );
    }

    // DEBUG LOGS: Check the values being passed to children
    console.log("AuthAndGameHandler (Passing Props): auth is", auth);
    console.log("AuthAndGameHandler (Passing Props): typeof createUserWithEmailAndPassword(auth, email, password) is", typeof createUserWithEmailAndPassword);
    console.log("AuthAndGameHandler (Passing Props): typeof signInWithEmailAndPassword(auth, email, password) is", typeof signInWithEmailAndPassword);


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
                // Pass Firebase Auth functions directly, ensuring they are bound to the auth instance
                // This is the correct way to pass them for direct use in AuthScreen
                createUserWithEmailAndPassword: (email, password) => createUserWithEmailAndPassword(auth, email, password),
                signInWithEmailAndPassword: (email, password) => signInWithEmailAndPassword(auth, email, password),
                signOut: () => signOut(auth), 
            })}
        </>
    );
};

export default AuthAndGameHandler;
