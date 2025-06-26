import React, { useState, useEffect, useRef, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, addDoc, setDoc, updateDoc, onSnapshot, collection, query, where, getDocs, getDoc } from 'firebase/firestore';

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
    const [currentUserId, setCurrentUserId] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [gameId, setGameId] = useState(null);
    const [gameData, setGameData] = useState(null);
    const [playerData, setPlayerData] = useState(null);
    const [gamePlayers, setGamePlayers] = useState([]); // All players in the current game
    const [loading, setLoading] = useState(true);
    const [isGeneratingAskMore, setIsGeneratingAskMore] = useState(false);

    // Initial Firebase Auth State setup
    useEffect(() => {
        // Since auth is initialized directly above, we just need to listen to auth state changes
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setCurrentUserId(user.uid);
                // Check if user is an admin for any game (simplified check)
                const adminQuerySnap = await getDocs(query(collection(db, `artifacts/${appId}/public/data/bingoGames`), where("adminId", "==", user.uid)));
                if (!adminQuerySnap.empty) {
                    setIsAdmin(true);
                    setGameId(adminQuerySnap.docs[0].id);
                    setLoading(false);
                    return; // Admin found, proceed to load game
                }

                // Try to find if user is a player in any active game
                const playerGamesQuery = query(
                    collection(db, `artifacts/${appId}/public/data/bingoGames`),
                    where("status", "in", ['waiting', 'playing']) // Look for active games
                );
                const playerGamesSnapshot = await getDocs(playerGamesQuery);
                let foundGame = null;
                for (const gameDoc of playerGamesSnapshot.docs) {
                    const playerDocRef = doc(db, `artifacts/${appId}/public/data/bingoGames/${gameDoc.id}/players`, user.uid);
                    const playerDocSnap = await getDoc(playerDocRef);
                    if (playerDocSnap.exists()) {
                        foundGame = gameDoc.id;
                        break;
                    }
                }

                if (foundGame) {
                    setGameId(foundGame);
                }
                setLoading(false);

            } else {
                // If no user is logged in, sign in anonymously
                const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
                try {
                    if (initialAuthToken) {
                        await signInWithCustomToken(auth, initialAuthToken);
                    } else {
                        await signInAnonymously(auth);
                    }
                } catch (error) {
                    console.error("Error signing in anonymously:", error);
                    showMessageModal(`Authentication failed: ${error.message}`, 'error');
                } finally {
                    setLoading(false);
                }
            }
        });

        return () => unsubscribe();
    }, [showMessageModal]);

    // Real-time listener for game data
    useEffect(() => {
        if (!db || !gameId) return;

        const gameRef = doc(db, `artifacts/${appId}/public/data/bingoGames`, gameId);
        const unsubscribeGame = onSnapshot(gameRef, (docSnap) => {
            if (docSnap.exists()) {
                setGameData({ id: docSnap.id, ...docSnap.data() });
            } else {
                console.log("Game no longer exists or has been removed.");
                setGameId(null);
                setGameData(null);
                setPlayerData(null);
                setGamePlayers([]);
                setIsAdmin(false); // If game is gone, reset admin status for that game
                showMessageModal("The game you were in has ended or was deleted.", 'info');
            }
        }, (error) => {
            console.error("Error listening to game data:", error);
            showMessageModal(`Failed to load game data: ${error.message}`, 'error');
        });

        return () => unsubscribeGame();
    }, [db, gameId, appId, showMessageModal]);

    // Real-time listener for current player's data
    useEffect(() => {
        if (!db || !gameId || !currentUserId) return;

        const playerDocRef = doc(db, `artifacts/${appId}/public/data/bingoGames/${gameId}/players`, currentUserId);
        const unsubscribePlayer = onSnapshot(playerDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setPlayerData({ id: docSnap.id, ...docSnap.data() });
            } else {
                console.log("Player data not found for this game.");
                setPlayerData(null);
                // If player data is gone, assume they exited or were removed
                if (gameData?.status !== 'ended') { // Only prompt if game hasn't officially ended for everyone
                    showMessageModal("Your player data was removed from the game or you left. Returning to login.", 'info');
                    setGameId(null);
                    setGameData(null);
                }
            }
        }, (error) => {
            console.error("Error listening to player data:", error);
            showMessageModal(`Failed to load player data: ${error.message}`, 'error');
        });

        return () => unsubscribePlayer();
    }, [db, gameId, currentUserId, appId, gameData, showMessageModal]);

    // Real-time listener for all players in the game
    useEffect(() => {
        if (!db || !gameId) return;

        const playersCollectionRef = collection(db, `artifacts/${appId}/public/data/bingoGames/${gameId}/players`);
        const q = query(playersCollectionRef); // No orderBy to avoid index issues
        const unsubscribePlayers = onSnapshot(q, (snapshot) => {
            const playersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setGamePlayers(playersList);
        }, (error) => {
            console.error("Error listening to game players:", error);
            showMessageModal(`Failed to load players: ${error.message}`, 'error');
        });

        return () => unsubscribePlayers();
    }, [db, gameId, appId, showMessageModal]);

    const handleAdminLogin = () => {
        setIsAdmin(true);
        setGameId(null); // Reset gameId to allow new game creation
    };

    const handleJoinGame = async (code, name, icebreaker) => {
        if (!db || !currentUserId) {
            showMessageModal("Firebase not initialized. Cannot join game.", 'error');
            return;
        }

        try {
            const gameRef = doc(db, `artifacts/${appId}/public/data/bingoGames`, code);
            const gameSnap = await getDoc(gameRef);

            if (!gameSnap.exists()) {
                showMessageModal("Game not found with this code. Please check the code or try again.", 'error');
                return;
            }

            const existingGame = { id: gameSnap.id, ...gameSnap.data() };
            if (existingGame.status === 'ended') {
                showMessageModal("This game has already ended. Please join another game or ask the admin to start a new one.", 'error');
                return;
            }
            if (existingGame.status === 'playing') {
                showMessageModal("This game is already in progress. You can still join, but may have less time to complete.", 'info');
                // Allow joining even if playing, but warn the user.
            }

            // Add player to the game
            const playerDocRef = doc(db, `artifacts/${appId}/public/data/bingoGames/${code}/players`, currentUserId);
            await setDoc(playerDocRef, {
                name: name,
                checkedSquares: [],
                submissionTime: null,
                isSubmitted: false,
                score: 0,
                icebreaker: icebreaker,
            }, { merge: true }); // Use merge to avoid overwriting existing data if player rejoins

            setGameId(code);
            setIsAdmin(false); // Ensure non-admin status
            showMessageModal("Successfully joined the game!", 'success');
        } catch (error) {
            console.error("Error joining game:", error);
            showMessageModal(`Failed to join game: ${error.message}`, 'error');
        }
    };

    const handleGameCreated = (newGameId, initialGameData) => {
        setGameId(newGameId);
        setGameData(initialGameData);
        setIsAdmin(true); // Confirm admin status
        showMessageModal("Game created successfully!", 'success');
    };

    const handleFinishGame = async (isTimeUp) => {
        if (!db || !gameId || !gameData) return;

        // If time is up, ensure all non-submitted players have their cards marked as submitted
        if (isTimeUp && gameData.status === 'playing') {
            try {
                const playersCollectionRef = collection(db, `artifacts/${appId}/public/data/bingoGames/${gameId}/players`);
                const q = query(playersCollectionRef, where("isSubmitted", "==", false));
                const nonSubmittedPlayersSnapshot = await getDocs(q);

                const updates = nonSubmittedPlayersSnapshot.docs.map(playerDoc => {
                    return updateDoc(doc(db, `artifacts/${appId}/public/data/bingoGames/${gameId}/players`, playerDoc.id), {
                        isSubmitted: true,
                        submissionTime: Date.now(),
                    });
                });
                await Promise.all(updates);
                console.log("All non-submitted cards marked as submitted due to time up.");
                showMessageModal("All cards are now submitted. Redirecting to scoreboard.", 'info');
            } catch (error) {
                console.error("Error marking non-submitted cards:", error);
                showMessageModal(`Error during auto-submission: ${error.message}`, 'error');
            }
        }

        if (gameData.status === 'playing') {
            try {
                const gameRef = doc(db, `artifacts/${appId}/public/data/bingoGames`, gameId);
                const finalScoringEndTime = gameData.startTime + (gameData.timerDuration * 60 * 1000);
                await updateDoc(gameRef, {
                    status: 'scoring',
                    scoringEndTime: finalScoringEndTime,
                });
                showMessageModal("Game has moved to scoring phase. Please check the scoreboard!", 'info');
            } catch (error) {
                console.error("Error updating game status to scoring:", error);
                showMessageModal(`Failed to update game status: ${error.message}`, 'error');
            }
        }
    };

    // Ask More - AI interaction
    const handleAskMore = async (targetPlayer) => {
        if (!geminiApiKey) {
            showMessageModal("AI functionality is not configured (API Key missing).", 'error');
            return;
        }

        setIsGeneratingAskMore(true);
        const prompt = `Given the icebreaker "${targetPlayer.icebreaker}", generate a single, engaging, and unique follow-up question for a networking bingo game. The question should encourage further interaction and be relevant to the icebreaker. Output only the question text.`;

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
                const followUpQuestion = result.candidates[0].content.parts[0].text.trim();
                showMessageModal(`For ${targetPlayer.name} (Icebreaker: "${targetPlayer.icebreaker}"): Suggested question: "${followUpQuestion}"`, 'info');
            } else {
                showMessageModal("Could not generate a follow-up question at this time. Please try again.", 'error');
            }
        } catch (error) {
            console.error("Error generating 'Ask More' question:", error);
            showMessageModal(`Failed to generate follow-up question: ${error.message}`, 'error');
        } finally {
            setIsGeneratingAskMore(false);
        }
    };

    const handleBackToLogin = () => {
        setGameId(null);
        setGameData(null);
        setPlayerData(null);
        setGamePlayers([]);
        setIsAdmin(false);
        showMessageModal("You have exited the game.", 'info');
    };

    // Pass all necessary state and handlers via props to children
    const contextValue = {
        currentUserId,
        isAdmin,
        gameId,
        gameData,
        playerData,
        gamePlayers,
        loading,
        isGeneratingAskMore,
        db, // Firebase db instance
        appId, // Firebase appId
        geminiApiKey, // Gemini API Key
        handleAdminLogin,
        handleJoinGame,
        handleGameCreated,
        handleFinishGame,
        handleAskMore,
        handleBackToLogin,
        showMessageModal,
        // Also pass down the Firebase auth instance if needed by child components directly (e.g., for signInWithCustomToken)
        auth,
    };

    // Render children, passing contextValue as props
    return children(contextValue);
};

export default AuthAndGameHandler;