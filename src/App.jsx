import React, { useState, useEffect, createContext, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query, addDoc, getDocs } from 'firebase/firestore';
import { geminiApiKey } from '/src/firebase.js'; // Ensure this works after fixing firebase.js

// Rest of the code remains the same

// Context for Firebase and User
const AppContext = createContext(null);

const AppProvider = ({ children }) => {
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [userId, setUserId] = useState(null);
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

    useEffect(() => {
        try {
            const firebaseConfig = {
                apiKey: "AIzaSyBNkwfo1M0YKkOLoguixQhn42qwyCxFX4c",
                authDomain: "find-someone-who-bingo.firebaseapp.com",
                projectId: "find-someone-who-bingo",
                storageBucket: "find-someone-who-bingo.firebasestorage.app",
                messagingSenderId: "136531916308",
                appId: "1:136531916308:web:497b7e7d4b234113629901",
                geminiApiKey: "AIzaSyANMkgevmn9i8mdRu_Pa0W-M4AI16rnOzI"
            };
            const app = initializeApp(firebaseConfig);
            const firestoreDb = getFirestore(app);
            const firebaseAuth = getAuth(app);

            setDb(firestoreDb);
            setAuth(firebaseAuth);

            // Listen for auth state changes
            const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
                if (user) {
                    setCurrentUser(user);
                    setUserId(user.uid);
                } else {
                    // Sign in anonymously if no custom token is provided
                    const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : '';
                    if (initialAuthToken) {
                        try {
                            await signInWithCustomToken(firebaseAuth, initialAuthToken);
                        } catch (error) {
                            console.error("Error signing in with custom token:", error);
                            await signInAnonymously(firebaseAuth);
                        }
                    } else {
                        await signInAnonymously(firebaseAuth);
                    }
                }
                setIsAuthReady(true);
            });

            return () => unsubscribe();
        } catch (error) {
            console.error("Failed to initialize Firebase:", error);
            // Handle initialization error gracefully
        }
    }, []);

    return (
        <AppContext.Provider value={{ db, auth, currentUser, isAuthReady, userId, appId }}>
            {children}
        </AppContext.Provider>
    );
};

// Main App Component
const App = () => {
    const { db, auth, userId, isAuthReady, appId } = useContext(AppContext);
    const [page, setPage] = useState('login'); // 'login', 'adminSetup', 'waitingRoom', 'gamePlay', 'leaderboard'
    const [roomCode, setRoomCode] = useState('');
    const [playerName, setPlayerName] = useState('');
    const [playerFact, setPlayerFact] = useState(''); // New state for player's fun fact
    const [game, setGame] = useState(null);
    const [players, setPlayers] = useState([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState(''); // New state for success messages
    const [showSuccessModal, setShowSuccessModal] = useState(false); // New state for success modal
    const [isGeneratingIcebreaker, setIsGeneratingIcebreaker] = useState(false);

    // New states for "Ask More" feature
    const [showAskMoreModal, setShowAskMoreModal] = useState(false);
    const [askMorePlayerName, setAskMorePlayerName] = useState('');
    const [askMoreQuestions, setAskMoreQuestions] = useState([]);
    const [isGeneratingAskMore, setIsGeneratingAskMore] = useState(false);

    const showError = (message) => {
        setErrorMessage(message);
        setShowErrorModal(true);
    };

    const hideError = () => {
        setErrorMessage('');
        setShowErrorModal(false);
    };

    // New function to show success messages
    const showSuccess = (message) => {
        setSuccessMessage(message);
        setShowSuccessModal(true);
    };

    const hideSuccess = () => {
        setSuccessMessage('');
        setShowSuccessModal(false);
    };

    // Function to generate player icebreaker (existing LLM feature)
    const generatePlayerIcebreaker = async (fact) => {
        if (!fact) return "";
        setIsGeneratingIcebreaker(true);
        const prompt = `Given the following keywords or fun fact about a person: '${fact}'. Generate a short, engaging icebreaker statement (1-2 sentences) about them that could be used in a 'Find someone who...' game context. Focus on making it sound like a unique fact about them. Output only the statement as a plain string.`;

        let chatHistory = [];
        chatHistory.push({ role: "user", parts: [{ text: prompt }] });

        const payload = {
            contents: chatHistory,
            generationConfig: {
                responseMimeType: "text/plain" // We want a plain string back
            }
        };

        const apiKey = geminiApiKey; // Use imported Gemini API key
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        console.log("Generating Icebreaker. API URL:", apiUrl); // Debugging log

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
                return result.candidates[0].content.parts[0].text;
            } else {
                return "A player with a unique fact!"; // Fallback
            }
        } catch (error) {
            console.error("Error generating icebreaker:", error);
            showError(`Failed to generate icebreaker: ${error.message}`);
            return "A player with a unique fact!"; // Fallback on error
        } finally {
            setIsGeneratingIcebreaker(false);
        }
    };

    // New LLM feature: Generate "Ask More" questions
    const generateAskMoreQuestions = async (playerFact) => {
        setIsGeneratingAskMore(true);
        const prompt = `Given the fun fact about a person: '${playerFact}'. Generate 2-3 open-ended follow-up questions that someone could ask to learn more about this fact. Output these questions as a JSON array of strings.`;

        const responseSchema = {
            type: "ARRAY",
            items: { "type": "STRING" }
        };

        let chatHistory = [];
        chatHistory.push({ role: "user", parts: [{ text: prompt }] });

        const payload = {
            contents: chatHistory,
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: responseSchema
            }
        };

        const apiKey = geminiApiKey; // Use imported Gemini API key
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        console.log("Generating 'Ask More' Questions. API URL:", apiUrl); // Debugging log

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
                const jsonString = result.candidates[0].content.parts[0].text;
                return JSON.parse(jsonString); // Parse the JSON array
            } else {
                return ["Tell me more!", "What inspired this?", "Any fun stories related to this?"]; // Fallback
            }
        } catch (error) {
            console.error("Error generating 'Ask More' questions:", error);
            showError(`Failed to generate questions: ${error.message}`);
            return ["Tell me more!", "What inspired this?", "Any fun stories related to this?"]; // Fallback on error
        } finally {
            setIsGeneratingAskMore(false);
        }
    };

    const handleAskMore = async (player) => {
        setAskMorePlayerName(player.name);
        setAskMoreQuestions([]); // Clear previous questions
        setShowAskMoreModal(true);
        const questions = await generateAskMoreQuestions(player.icebreaker || player.name); // Use icebreaker if available, else name
        setAskMoreQuestions(questions);
    };

    const handleCloseAskMoreModal = () => {
        setShowAskMoreModal(false);
        setAskMorePlayerName('');
        setAskMoreQuestions([]);
    };

    // Listen for game state changes and player list changes
    useEffect(() => {
        if (!db || !roomCode || !isAuthReady) return;

        // Listener for game state
        const gameRef = doc(db, `artifacts/${appId}/public/data/bingoGames`, roomCode);
        const unsubscribeGame = onSnapshot(gameRef, (docSnap) => {
            if (docSnap.exists()) {
                const gameData = docSnap.data();
                setGame(gameData);
                // Determine admin status
                setIsAdmin(userId === gameData.adminId);

                // Navigate based on game status
                if (gameData.status === 'playing') {
                    setPage('gamePlay');
                } else if (gameData.status === 'scoring') {
                    setPage('gamePlay'); // Still on gamePlay page but with scoring enabled
                } else if (gameData.status === 'finished') {
                    setPage('leaderboard');
                } else if (gameData.status === 'waiting') {
                    setPage('waitingRoom');
                }
            } else {
                setGame(null);
                setPage('login'); // If game doesn't exist, go back to login
                // Only show error if a roomCode was actively being watched and it's not just initial load
                // (e.g., if the game was deleted or doesn't exist after a join attempt)
                if (roomCode && game?.id === roomCode) { // Check if the current roomCode was associated with a game
                    showError('Game room not found or has ended. Please check the code.');
                }
            }
        }, (error) => {
            console.error("Error listening to game changes:", error);
            showError("Error loading game data.");
        });

        // Listener for players in the room
        const playersCollectionRef = collection(db, `artifacts/${appId}/public/data/bingoGames/${roomCode}/players`);
        const unsubscribePlayers = onSnapshot(playersCollectionRef, (snapshot) => {
            const playersList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setPlayers(playersList);
        }, (error) => {
            console.error("Error listening to players changes:", error);
            showError("Error loading player data.");
        });

        return () => {
            unsubscribeGame();
            unsubscribePlayers();
        };
    }, [db, roomCode, userId, isAuthReady, appId, game]);

    // Admin setup handler
    const handleAdminSetup = (newRoomCode, newGameData) => {
        setRoomCode(newRoomCode);
        setGame(newGameData);
        setIsAdmin(true);
        setPlayerName('Admin'); // Auto-set admin's name for simplicity
        setPage('waitingRoom');
    };

    // Join room handler
    const handleJoinRoom = async () => {
        console.log("handleJoinRoom called.");
        console.log("Player name attempting to join:", playerName);
        console.log("Room code attempting to join with (from state):", roomCode);

        if (!roomCode || !playerName) {
            showError('Please enter both room code and your name.');
            return;
        }
        if (!db || !userId) {
            showError('Firebase not initialized or user ID missing. Please try again.');
            return;
        }

        try {
            const gameRef = doc(db, `artifacts/${appId}/public/data/bingoGames`, roomCode);
            console.log("Firestore path for gameRef:", gameRef.path);
            const gameSnap = await getDoc(gameRef);

            console.log("Game document snapshot exists:", gameSnap.exists());

            if (!gameSnap.exists()) {
                console.error("Game room not found for code:", roomCode);
                showError('Game room not found. Please check the code.');
                return;
            } else {
                console.log(`Game room "${roomCode}" found. Proceeding to join.`);
            }

            const gameData = gameSnap.data();
            console.log("Game data status:", gameData.status);

            if (gameData.status !== 'waiting') {
                showError('Game has already started or finished. Cannot join now.');
                return;
            }

            // Generate icebreaker if playerFact is provided
            const icebreaker = await generatePlayerIcebreaker(playerFact);
            console.log("Generated icebreaker:", icebreaker);

            // Add player to the subcollection
            const playerDocRef = doc(db, `artifacts/${appId}/public/data/bingoGames/${roomCode}/players`, userId);
            console.log(`Attempting to set player document for userId: ${userId} in room: ${roomCode}`);
            await setDoc(playerDocRef, {
                name: playerName,
                checkedSquares: [],
                submissionTime: null,
                isSubmitted: false,
                score: 0,
                icebreaker: icebreaker, // Store the generated icebreaker
            });
            console.log("Player document successfully written.");

            setGame(gameData); // Update game state
            setPage('waitingRoom'); // Navigate to waiting room
            console.log("Page set to 'waitingRoom'.");

        } catch (error) {
            console.error("Error joining room:", error);
            showError(`Failed to join room: ${error.message}`);
        }
    };

    // Function to handle navigating back to login page
    const handleBackToLogin = () => {
        setPage('login');
        setRoomCode('');
        setGame(null);
        setPlayers([]);
        setIsAdmin(false);
        setPlayerName('');
        setPlayerFact('');
        // Also ensure any error/success messages are cleared
        hideError();
        hideSuccess();
    };

    // Render different pages based on `page` state
    let currentPage;
    switch (page) {
        case 'login':
            currentPage = (
                <Login
                    roomCode={roomCode}
                    setRoomCode={setRoomCode}
                    playerName={playerName}
                    setPlayerName={setPlayerName}
                    playerFact={playerFact} // Pass playerFact
                    setPlayerFact={setPlayerFact} // Pass setPlayerFact
                    onJoinRoom={handleJoinRoom}
                    onAdminSetup={() => setPage('adminSetup')}
                    userId={userId} // Pass userId to Login for display
                    isGeneratingIcebreaker={isGeneratingIcebreaker}
                />
            );
            break;
        case 'adminSetup':
            currentPage = (
                <AdminSetup
                    onGameCreated={handleAdminSetup}
                    userId={userId}
                    db={db}
                    appId={appId}
                    showError={showError}
                />
            );
            break;
        case 'waitingRoom':
            currentPage = (
                <WaitingRoom
                    game={game}
                    players={players}
                    isAdmin={isAdmin}
                    roomCode={roomCode}
                    db={db}
                    appId={appId}
                    showError={showError}
                    onAskMore={handleAskMore} // Pass the new handler
                    currentUserId={userId} // Pass current user ID for conditional rendering
                    isGeneratingAskMore={isGeneratingAskMore}
                    onBackToLogin={handleBackToLogin} // Pass new handler to WaitingRoom
                    showSuccess={showSuccess} // Pass showSuccess to WaitingRoom
                />
            );
            break;
        case 'gamePlay':
            currentPage = (
                <GamePlay
                    game={game}
                    players={players}
                    userId={userId}
                    isAdmin={isAdmin}
                    db={db}
                    roomCode={roomCode}
                    appId={appId}
                    showError={showError}
                    onAskMore={handleAskMore} // Pass the new handler
                    currentUserId={userId} // Pass current user ID for conditional rendering
                    isGeneratingAskMore={isGeneratingAskMore}
                    showSuccess={showSuccess} // Pass showSuccess to GamePlay
                />
            );
            break;
        case 'leaderboard':
            currentPage = (
                <Leaderboard
                    game={game}
                    players={players}
                    db={db}
                    roomCode={roomCode}
                    appId={appId}
                    showError={showError}
                />
            );
            break;
        default:
            currentPage = <p>Loading...</p>;
    }

    if (!isAuthReady) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
                <div className="flex items-center space-x-2 text-gray-700">
                    {/* Spinner Icon (Inline SVG) */}
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-lg">Initializing app...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center font-inter p-4">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-4xl border border-gray-200">
                <h1 className="text-4xl font-extrabold text-center text-indigo-700 mb-8">
                    Find Someone Who... Bingo!
                </h1>
                {currentPage}

                {/* Error Modal */}
                {showErrorModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-lg shadow-lg max-w-sm w-full text-center">
                            <h3 className="text-xl font-semibold mb-3">Error!</h3>
                            <p className="mb-5">{errorMessage}</p>
                            <button
                                onClick={hideError}
                                className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-300 shadow-md"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}

                {/* Success Modal */}
                {showSuccessModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-green-50 border border-green-200 text-green-700 p-6 rounded-lg shadow-lg max-w-sm w-full text-center">
                            <h3 className="text-xl font-semibold mb-3">Success!</h3>
                            <p className="mb-5">{successMessage}</p>
                            <button
                                onClick={hideSuccess}
                                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-300 shadow-md"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}

                {/* Ask More Questions Modal */}
                {showAskMoreModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full text-center space-y-4">
                            <h3 className="text-2xl font-semibold text-gray-800">Questions for {askMorePlayerName}</h3>
                            {isGeneratingAskMore ? (
                                <div className="flex items-center justify-center py-4">
                                    <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <p className="text-lg text-gray-700">Generating questions...</p>
                                </div>
                            ) : (
                                askMoreQuestions.length > 0 ? (
                                    <ul className="text-left list-disc list-inside text-gray-700 space-y-2">
                                        {askMoreQuestions.map((q, idx) => (
                                            <li key={idx}>{q}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-gray-500 italic">Could not generate questions. Try again later.</p>
                                )
                            )}
                            <button
                                onClick={handleCloseAskMoreModal}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition duration-300 shadow-md mt-4"
                            >
                                Got It!
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Login Component
const Login = ({ roomCode, setRoomCode, playerName, setPlayerName, playerFact, setPlayerFact, onJoinRoom, onAdminSetup, userId, isGeneratingIcebreaker }) => {
    return (
        <div className="space-y-6">
            <p className="text-center text-gray-600 text-sm">Your User ID: <span className="font-mono text-gray-800 break-all">{userId}</span></p>
            <div className="mb-6">
                <label htmlFor="playerName" className="block text-gray-700 text-sm font-bold mb-2">
                    Your Name:
                </label>
                <input
                    type="text"
                    id="playerName"
                    className="shadow appearance-none border rounded-md w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition duration-200"
                    placeholder="Enter your name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    required
                />
            </div>
            <div className="mb-6">
                <label htmlFor="playerFact" className="block text-gray-700 text-sm font-bold mb-2">
                    Optional: A fun fact or keywords about you (e.g., "loves hiking, cat person, can juggle") ✨
                </label>
                <input
                    type="text"
                    id="playerFact"
                    className="shadow appearance-none border rounded-md w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition duration-200"
                    placeholder="e.g., 'plays guitar', 'loves sci-fi movies'"
                    value={playerFact}
                    onChange={(e) => setPlayerFact(e.target.value)}
                />
                {isGeneratingIcebreaker && (
                    <p className="text-sm text-indigo-600 mt-2 flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating icebreaker...
                    </p>
                )}
            </div>
            <div className="mb-6">
                <label htmlFor="roomCode" className="block text-gray-700 text-sm font-bold mb-2">
                    Room Code:
                </label>
                <input
                    type="text"
                    id="roomCode"
                    className="shadow appearance-none border rounded-md w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition duration-200"
                    placeholder="Enter room code"
                    value={roomCode}
                    onChange={(e) => {
                        let newValue = e.target.value;
                        console.log("Login: Raw Room Code input changed to:", newValue);

                        // Attempt to extract room code if a URL is pasted
                        try {
                            const url = new URL(newValue);
                            // Look for the last path segment that looks like a Firestore ID (alphanumeric, at least 15 chars)
                            const pathSegments = url.pathname.split('/').filter(segment => segment !== '');
                            const potentialRoomCode = pathSegments[pathSegments.length - 1];

                            if (potentialRoomCode && potentialRoomCode.length >= 15 && /^[a-zA-Z0-9]+$/.test(potentialRoomCode)) {
                                newValue = potentialRoomCode;
                                console.log("Login: Successfully extracted Room Code from URL:", newValue);
                            } else {
                                console.log("Login: URL provided, but no valid Room Code found in path segments. Using raw input.");
                            }
                        } catch (error) {
                            // Not a valid URL, or error parsing. Assume it's a direct code or simple text.
                            console.log("Login: Not a URL format or parsing error. Using raw input.", error.message);
                        }

                        // Trim any leading/trailing whitespace after potential URL parsing
                        setRoomCode(newValue.trim());
                    }}
                    required
                />
            </div>
            <button
                onClick={onJoinRoom}
                disabled={isGeneratingIcebreaker} // Disable join button during icebreaker generation
                className={`w-full font-bold py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-300 shadow-lg transform hover:scale-105
                    ${isGeneratingIcebreaker ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-400'}`}
            >
                Join Game
            </button>
            <div className="text-center text-gray-600 my-4">
                — OR —
            </div>
            <button
                onClick={onAdminSetup}
                disabled={isGeneratingIcebreaker} // Disable admin setup button too
                className={`w-full font-bold py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-300 shadow-lg transform hover:scale-105
                    ${isGeneratingIcebreaker ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-400'}`}
            >
                Create New Game (Admin)
            </button>
        </div>
    );
};

// Admin Setup Component
const AdminSetup = ({ onGameCreated, userId, db, appId, showError }) => {
    // Existing states
    const [industry, setIndustry] = useState('Human Resources'); // Default to Human Resources
    const [gridSize, setGridSize] = useState(5); // Default 5x5
    const [loadingQuestions, setLoadingQuestions] = useState(false);

    // New states for custom timer and question management
    const [customTimerDuration, setCustomTimerDuration] = useState(30); // User input for timer
    const [manualQuestionsInput, setManualQuestionsInput] = useState('');
    const [uploadedFile, setUploadedFile] = useState(null);
    const [currentQuestions, setCurrentQuestions] = useState([]); // Array of questions for preview and saving

    const industries = [
        'Human Resources', // Added Human Resources as the first option
        'Technology', 'Healthcare', 'Finance', 'Education', 'Manufacturing',
        'Retail', 'Automotive', 'Energy', 'Food & Beverage', 'Media', 'Real Estate',
        'Pharmaceutical', // Moved Pharmaceutical here to keep HR at top
    ];
    const gridSizes = [4, 5, 6, 7]; // Still restrict grid size as it dictates number of questions for AI

    // Utility function to shuffle an array
    const shuffleArray = (array) => {
        let currentIndex = array.length, randomIndex;
        while (currentIndex !== 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [
                array[randomIndex], array[currentIndex]];
        }
        return array;
    };

    // --- Question Generation/Input Handlers ---

    // AI Question Generation (existing logic, modified to update currentQuestions)
    const generateQuestionsAI = async () => {
        setLoadingQuestions(true);
        const prompt = `Generate ${gridSize * gridSize} unique "Find someone who..." bingo statements.
        These statements should be relevant to the ${industry} industry, including a mix of:
        - Professional skills/experience (e.g., "Find someone who has led a team of 10+ engineers")
        - Personal/fun facts (e.g., "Find someone who loves to cook")
        - General workplace networking questions (e.g., "Find someone who has worked remotely for over 2 years")
        Ensure variety and relevance. Output each statement as a separate item in a JSON array.`;

        const responseSchema = { type: "ARRAY", items: { "type": "STRING" } };
        let chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
        const payload = { contents: chatHistory, generationConfig: { responseMimeType: "application/json", responseSchema: responseSchema } };
        const apiKey = geminiApiKey; // Use imported Gemini API key
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        console.log("Generating AI Questions. API URL:", apiUrl); // Debugging log

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
                const jsonString = result.candidates[0].content.parts[0].text;
                const questions = JSON.parse(jsonString);
                if (questions.length < gridSize * gridSize) {
                    showError(`Generated only ${questions.length} questions, need ${gridSize * gridSize}. Please try again.`);
                    setCurrentQuestions([]); // Clear if not enough
                    return;
                }
                setCurrentQuestions(questions.slice(0, gridSize * gridSize)); // Update current questions
            } else {
                showError("No questions generated. Please try again.");
                setCurrentQuestions([]);
            }
        } catch (error) {
            console.error("Error generating questions:", error);
            showError(`Failed to generate questions: ${error.message}`);
            setCurrentQuestions([]);
        } finally {
            setLoadingQuestions(false);
        }
    };

    // Manual input handler
    const handleParseManualQuestions = () => {
        if (!manualQuestionsInput.trim()) {
            showError("Manual input is empty. Please type some questions.");
            return;
        }
        const parsedQuestions = manualQuestionsInput.split('\n')
            .map(line => line.trim())
            .filter(line => line !== '')
            .map(line => line.replace(/^\d+\.\s*/, '')); // Remove numbering like "1. Question"
        if (parsedQuestions.length === 0) {
            showError("No valid questions found in manual input. Please check the format.");
            return;
        }
        setCurrentQuestions(parsedQuestions);
    };

    // File upload handler
    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) {
            setUploadedFile(null);
            return;
        }

        setUploadedFile(file);
        const reader = new FileReader();

        reader.onload = (e) => {
            const content = e.target.result;
            let parsedQuestions = [];

            if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
                // Simple CSV parsing: assume one question per line/cell for now
                parsedQuestions = content.split('\n')
                    .map(line => line.split(',')[0]?.trim()) // Take first column, trim
                    .filter(line => line !== '')
                    .map(line => line.replace(/^\d+\.\s*/, '')); // Remove numbering
            } else {
                // Assume plain text, questions numbered or not
                parsedQuestions = content.split('\n')
                    .map(line => line.trim())
                    .filter(line => line !== '')
                    .map(line => line.replace(/^\d+\.\s*/, '')); // Remove numbering
            }

            if (parsedQuestions.length === 0) {
                showError("No valid questions found in the uploaded file. Please check its content.");
                setCurrentQuestions([]);
            } else {
                setCurrentQuestions(parsedQuestions);
            }
        };

        reader.onerror = (e) => {
            showError("Error reading file: " + reader.error);
            setCurrentQuestions([]);
        };

        reader.readAsText(file);
    };

    const handleShuffleQuestions = () => {
        if (currentQuestions.length === 0) {
            showError("No questions to shuffle. Generate or input questions first.");
            return;
        }
        setCurrentQuestions(shuffleArray([...currentQuestions])); // Shuffle a copy
    };

    const handleCreateGame = async () => {
        if (!userId || !db) {
            showError("Firebase not initialized. Cannot create game.");
            return;
        }
        if (currentQuestions.length === 0) {
            showError("No questions available. Please generate or input questions.");
            return;
        }
        if (currentQuestions.length !== gridSize * gridSize) {
            showError(`The number of questions (${currentQuestions.length}) does not match the selected grid size (${gridSize}x${gridSize} = ${gridSize * gridSize}). Please adjust questions or grid size.`);
            return;
        }
        if (customTimerDuration <= 0) {
            showError("Please set a valid game timer duration (greater than 0 minutes).");
            return;
        }

        try {
            const gamesCollectionRef = collection(db, `artifacts/${appId}/public/data/bingoGames`);
            const newGameRef = await addDoc(gamesCollectionRef, {
                adminId: userId,
                industry: industry,
                gridSize: gridSize,
                timerDuration: customTimerDuration, // Use custom duration
                status: 'waiting',
                questions: currentQuestions, // Use currentQuestions
                startTime: null,
                scoringEndTime: null,
            });

            console.log("Admin: Game created with ID:", newGameRef.id); // Added log

            const playerDocRef = doc(db, `artifacts/${appId}/public/data/bingoGames/${newGameRef.id}/players`, userId);
            await setDoc(playerDocRef, {
                name: "Admin",
                checkedSquares: [],
                submissionTime: null,
                isSubmitted: false,
                score: 0,
                icebreaker: "The game master who sets the stage for fun! ✨",
            });

            onGameCreated(newGameRef.id, {
                id: newGameRef.id,
                adminId: userId,
                industry,
                gridSize,
                timerDuration: customTimerDuration,
                status: 'waiting',
                questions: currentQuestions,
                startTime: null,
                scoringEndTime: null,
            });
        } catch (error) {
            console.error("Error creating game:", error);
            showError(`Failed to create game: ${error.message}`);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Set Up New Game</h2>

            {/* General Game Settings */}
            <div className="p-4 bg-gray-50 rounded-lg shadow-inner space-y-4">
                <h3 className="text-xl font-semibold text-gray-700">Game Settings</h3>
                <div>
                    <label htmlFor="industry" className="block text-gray-700 text-sm font-bold mb-2">
                        Select Industry:
                    </label>
                    <select
                        id="industry"
                        className="shadow border rounded-md w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-400 transition duration-200"
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                    >
                        {industries.map((ind) => (
                            <option key={ind} value={ind}>
                                {ind}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label htmlFor="gridSize" className="block text-gray-700 text-sm font-bold mb-2">
                        Grid Size:
                    </label>
                    <select
                        id="gridSize"
                        className="shadow border rounded-md w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-400 transition duration-200"
                        value={gridSize}
                        onChange={(e) => setGridSize(parseInt(e.target.value))}
                    >
                        {gridSizes.map((size) => (
                            <option key={size} value={size}>
                                {size}x{size} ({size * size} questions)
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label htmlFor="customTimerDuration" className="block text-gray-700 text-sm font-bold mb-2">
                        Game Timer (minutes):
                    </label>
                    <input
                        type="number"
                        id="customTimerDuration"
                        className="shadow appearance-none border rounded-md w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition duration-200"
                        placeholder="e.g., 25"
                        value={customTimerDuration}
                        onChange={(e) => setCustomTimerDuration(parseInt(e.target.value) || 0)}
                        min="1"
                        required
                    />
                </div>
            </div>

            {/* Question Generation/Input Options */}
            <div className="p-4 bg-gray-50 rounded-lg shadow-inner space-y-6">
                <h3 className="text-xl font-semibold text-gray-700">Question Source</h3>

                {/* AI Generation */}
                <div>
                    <h4 className="text-lg font-medium text-gray-800 mb-2">Generate Questions with AI:</h4>
                    <button
                        onClick={generateQuestionsAI}
                        disabled={loadingQuestions}
                        className={`w-full py-2 px-4 rounded-md font-bold transition duration-300 shadow-sm
                            ${loadingQuestions ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                    >
                        {loadingQuestions ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Generating...
                            </span>
                        ) : (
                            'Generate AI Questions'
                        )}
                    </button>
                </div>

                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-gray-300"></div>
                    <span className="flex-shrink mx-4 text-gray-400">OR</span>
                    <div className="flex-grow border-t border-gray-300"></div>
                </div>

                {/* Manual Input */}
                <div>
                    <h4 className="text-lg font-medium text-gray-800 mb-2">Enter Questions Manually:</h4>
                    <textarea
                        className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-400 transition duration-200"
                        rows="6"
                        placeholder="Enter one question per line, e.g.:
1. Find someone who loves coffee.
2. Find someone who speaks more than two languages.
3. Find someone who has traveled to another continent."
                        value={manualQuestionsInput}
                        onChange={(e) => setManualQuestionsInput(e.target.value)}
                    ></textarea>
                    <button
                        onClick={handleParseManualQuestions}
                        className="w-full mt-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md shadow-sm transition duration-300"
                    >
                        Use Manual Questions
                    </button>
                </div>

                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-gray-300"></div>
                    <span className="flex-shrink mx-4 text-gray-400">OR</span>
                    <div className="flex-grow border-t border-gray-300"></div>
                </div>

                {/* File Upload */}
                <div>
                    <h4 className="text-lg font-medium text-gray-800 mb-2">Upload Questions (CSV/Text):</h4>
                    <input
                        type="file"
                        accept=".txt,.csv"
                        onChange={handleFileUpload}
                        className="block w-full text-sm text-gray-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-md file:border-0
                            file:text-sm file:font-semibold
                            file:bg-purple-50 file:text-purple-700
                            hover:file:bg-purple-100 transition duration-300"
                    />
                    {uploadedFile && <p className="text-sm text-gray-600 mt-2">Selected file: {uploadedFile.name}</p>}
                </div>
            </div>

            {/* Question Management & Preview */}
            {currentQuestions.length > 0 && (
                <div className="p-4 bg-gray-50 rounded-lg shadow-inner space-y-4">
                    <h3 className="text-xl font-semibold text-gray-700">Question Preview ({currentQuestions.length} questions)</h3>
                    <div className="flex gap-4">
                        <button
                            onClick={handleShuffleQuestions}
                            className="flex-1 py-2 px-4 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-md shadow-sm transition duration-300"
                        >
                            Shuffle Questions
                        </button>
                        <button
                            onClick={() => setCurrentQuestions([])}
                            className="flex-1 py-2 px-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-md shadow-sm transition duration-300"
                        >
                            Clear Questions
                        </button>
                    </div>
                    <div className="bg-white border border-gray-200 p-4 rounded-md h-64 overflow-y-auto">
                        <ul className="list-decimal list-inside text-gray-700 space-y-1">
                            {currentQuestions.map((q, index) => (
                                <li key={index}>{q}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Create Game Button */}
            <button
                onClick={handleCreateGame}
                disabled={loadingQuestions || currentQuestions.length === 0 || customTimerDuration <= 0 || currentQuestions.length !== gridSize * gridSize}
                className={`w-full font-bold py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-300 shadow-lg transform hover:scale-105
                    ${(loadingQuestions || currentQuestions.length === 0 || customTimerDuration <= 0 || currentQuestions.length !== gridSize * gridSize) ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-400'}`}
            >
                Create Game
            </button>
        </div>
    );
};

// Waiting Room Component
const WaitingRoom = ({ game, players, isAdmin, roomCode, db, appId, showError, onAskMore, currentUserId, isGeneratingAskMore, onBackToLogin, showSuccess }) => {
    const handleStartGame = async () => {
        if (!db || !game || !roomCode) {
            showError("Game data not available.");
            return;
        }
        try {
            const gameRef = doc(db, `artifacts/${appId}/public/data/bingoGames`, roomCode);
            await updateDoc(gameRef, {
                status: 'playing',
                startTime: Date.now(), // Record start time
            });
        } catch (error) {
            console.error("Error starting game:", error);
            showError(`Failed to start game: ${error.message}`);
        }
    };

    const handleCopyRoomCode = () => {
        const textField = document.createElement('textarea');
        textField.innerText = roomCode;
        document.body.appendChild(textField);
        textField.select();
        try {
            document.execCommand('copy');
            showSuccess('Room code copied to clipboard!'); // Use showSuccess
            console.log("Copied room code to clipboard:", roomCode); // Added log
        } catch (err) {
            console.error('Failed to copy text: ', err);
            showError('Failed to copy room code. Please copy manually.'); // Added instruction
        } finally {
            document.body.removeChild(textField);
        }
    };

    // Placeholder for QR code generation
    const qrCodeLink = `https://bingo-game.com?room=${roomCode}`; // Example, replace with actual app URL

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold text-center text-gray-800">Waiting Room</h2>

            <div className="bg-indigo-50 border border-indigo-200 text-indigo-700 p-6 rounded-lg shadow-md text-center space-y-3">
                <p className="text-xl font-semibold">Game Room Code:</p>
                <div className="flex items-center justify-center space-x-3">
                    <span className="text-5xl font-extrabold text-indigo-800 tracking-wide">{roomCode}</span>
                    <button
                        onClick={handleCopyRoomCode}
                        className="p-3 bg-indigo-200 text-indigo-700 rounded-full hover:bg-indigo-300 transition duration-200 shadow-sm"
                        aria-label="Copy room code"
                    >
                        {/* Copy Icon (Inline SVG) */}
                        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M16 1H4C2.9 1 2 1.9 2 3v14h2V3h12V1zm3 4H8C6.9 5 6 5.9 6 7v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                        </svg>
                    </button>
                </div>
                <p className="text-sm mt-4">Share this code with other players!</p>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                    {/* QR Code Icon (Inline SVG) */}
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zm10-12h8V3h-8v8zm2-6h4v4h-4V5zM15 21h8v-8h-8v8zm2-6h4v4h-4v-4zM11 5h2v2h-2V5zm0 4h2v2h-2V9zm0 8h2v2h-2v-2zm-4 0h2v2h-2v-2z"/>
                    </svg>
                    <a href={qrCodeLink} target="_blank" rel="noopener noreferrer" className="underline hover:text-indigo-800">
                        Generate QR Code (or share link)
                        {/* External Link Alt Icon (Inline SVG) */}
                        <svg className="inline-block h-3 w-3 ml-1" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59L9.41 12.17l1.41 1.41L19 6.41V10h2V3h-7z"/>
                        </svg>
                    </a>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div>
                    <h3 className="text-2xl font-semibold text-gray-800 mb-4">Game Details:</h3>
                    <ul className="list-disc list-inside text-gray-700 space-y-2">
                        <li><span className="font-medium">Industry:</span> {game?.industry}</li>
                        <li><span className="font-medium">Grid Size:</span> {game?.gridSize}x{game?.gridSize}</li>
                        <li><span className="font-medium">Timer:</span> {game?.timerDuration} minutes</li>
                    </ul>
                </div>
                <div>
                    <h3 className="text-2xl font-semibold text-gray-800 mb-4">Players Joined ({players.length}):</h3>
                    <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg h-48 overflow-y-auto shadow-inner">
                        {players.length === 0 ? (
                            <p className="text-gray-500 italic">No players joined yet...</p>
                        ) : (
                            <ul className="space-y-2">
                                {players.map((player) => (
                                    <li key={player.id} className="text-gray-800 font-medium flex flex-col items-start py-1">
                                        <div className="flex justify-between items-center w-full">
                                            <div className="flex items-center">
                                                {/* Check Circle Icon (Inline SVG) */}
                                                <svg className="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                                </svg>
                                                {player.name}
                                            </div>
                                            {player.id !== currentUserId && player.icebreaker && (
                                                <button
                                                    onClick={() => onAskMore(player)}
                                                    disabled={isGeneratingAskMore}
                                                    className="ml-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-md text-sm hover:bg-purple-200 transition duration-200 flex items-center"
                                                >
                                                    ✨ Ask More
                                                </button>
                                            )}
                                        </div>
                                        {player.icebreaker && (
                                            <span className="ml-7 text-sm text-gray-500 italic">
                                                - {player.icebreaker}
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            {isAdmin && (
                <div className="flex flex-col sm:flex-row gap-4 mt-8">
                    <button
                        onClick={handleStartGame}
                        disabled={players.length < 1} // Can start with just admin, or enforce minimum players
                        className={`flex-1 font-bold py-4 px-6 rounded-md text-2xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-300 shadow-xl transform hover:scale-105
                            ${players.length < 1 ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-400'}`}
                    >
                        Start Game
                    </button>
                    <button
                        onClick={onBackToLogin}
                        className="flex-1 font-bold py-4 px-6 rounded-md text-2xl bg-red-500 text-white hover:bg-red-600 transition duration-300 shadow-xl transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400"
                    >
                        Back to Login / Exit Game
                    </button>
                </div>
            )}
            {!isAdmin && (
                <p className="text-center text-gray-600 italic">
                    Waiting for the admin to start the game...
                </p>
            )}
        </div>
    );
};

// Game Play Component
const GamePlay = ({ game, players, userId, isAdmin, db, roomCode, appId, showError, onAskMore, currentUserId, isGeneratingAskMore, showSuccess }) => {
    const [timeLeft, setTimeLeft] = useState(0);
    const [myPlayer, setMyPlayer] = useState(null);
    // checkedSquares now stores objects: { index: number, people: string[] }
    const [checkedSquares, setCheckedSquares] = useState([]);
    const [isScoringPhase, setIsScoringPhase] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    // States for the new square detail/name input modal
    const [showSquareModal, setShowSquareModal] = useState(false);
    const [selectedSquareIndex, setSelectedSquareIndex] = useState(null);
    const [currentModalNames, setCurrentModalNames] = useState([]);
    const [currentModalIsChecked, setCurrentModalIsChecked] = useState(false);
    const [nameInput, setNameInput] = useState(''); // Input field for new names

    useEffect(() => {
        if (game) {
            // Update local checked squares for the current player
            const player = players.find(p => p.id === userId);
            if (player) {
                setMyPlayer(player);
                // Ensure checkedSquares is always an array, handle potential old formats
                setCheckedSquares(player.checkedSquares || []);
                setIsSubmitted(player.isSubmitted || false);
            }

            // Check for scoring phase
            if (game.status === 'scoring') {
                setIsScoringPhase(true);
            } else {
                setIsScoringPhase(false);
            }
        }
    }, [game, players, userId]);

    // Timer logic
    useEffect(() => {
        if (!game || !game.startTime || game.status === 'finished') {
            setTimeLeft(0);
            return;
        }

        const calculateTimeLeft = () => {
            const now = Date.now();
            const gameEndTime = game.startTime + game.timerDuration * 60 * 1000; // Game timer end
            const scoringEndTime = game.scoringEndTime;

            if (game.status === 'scoring' && scoringEndTime) {
                // If in scoring phase, countdown for scoring
                return Math.max(0, Math.floor((scoringEndTime - now) / 1000));
            } else if (game.status === 'playing') {
                // If playing, countdown for game
                return Math.max(0, Math.floor((gameEndTime - now) / 1000));
            }
            return 0;
        };

        setTimeLeft(calculateTimeLeft());

        const timerInterval = setInterval(() => {
            const newTimeLeft = calculateTimeLeft();
            setTimeLeft(newTimeLeft);

            // Transition to scoring phase if game timer runs out
            if (newTimeLeft === 0 && game.status === 'playing') {
                handleGameEnd();
            }
            // Transition to finished if scoring timer runs out
            if (newTimeLeft === 0 && game.status === 'scoring') {
                handleScoringEnd();
            }
        }, 1000);

        return () => clearInterval(timerInterval);
    }, [game, db, roomCode, appId]);

    const handleGameEnd = async () => {
        if (!db || !roomCode || game.status !== 'playing') return;
        try {
            const gameRef = doc(db, `artifacts/${appId}/public/data/bingoGames`, roomCode);
            // Set scoring phase for 5 minutes
            await updateDoc(gameRef, {
                status: 'scoring',
                scoringEndTime: Date.now() + 5 * 60 * 1000,
            });
        } catch (error) {
            console.error("Error transitioning to scoring phase:", error);
            showError("Failed to transition to scoring phase.");
        }
    };

    const handleScoringEnd = async () => {
        if (!db || !roomCode || game.status !== 'scoring') return;
        try {
            const gameRef = doc(db, `artifacts/${appId}/public/data/bingoGames`, roomCode);
            await updateDoc(gameRef, {
                status: 'finished',
            });
        } catch (error) {
            console.error("Error transitioning to finished phase:", error);
            showError("Failed to transition to finished phase.");
        }
    };

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    // Handles opening the modal for a square
    const handleSquareClick = (index) => {
        if (!game || game.status !== 'playing') return; // Only allow checking during playing phase
        if (isScoringPhase) return; // Disallow checking in scoring phase
        if (isSubmitted) return; // Disallow checking after submission

        setSelectedSquareIndex(index);
        const existingSquare = checkedSquares.find(sq => sq.index === index);
        setCurrentModalNames(existingSquare ? existingSquare.people : []);
        setCurrentModalIsChecked(!!existingSquare);
        setNameInput(''); // Clear input for new entry
        setShowSquareModal(true);
    };

    // Handles adding a name in the modal
    const handleAddName = () => {
        if (nameInput.trim() === '') {
            showError("Please enter a name.");
            return;
        }
        if (currentModalNames.length >= 3) {
            showError("You can add a maximum of 3 names per square.");
            return;
        }
        setCurrentModalNames([...currentModalNames, nameInput.trim()]);
        setNameInput('');
    };

    // Handles removing a name from the modal
    const handleRemoveName = (nameToRemove) => {
        setCurrentModalNames(currentModalNames.filter(name => name !== nameToRemove));
    };

    // Handles saving the changes from the modal to the game state and Firestore
    const handleSaveSquare = async () => {
        if (currentModalIsChecked && currentModalNames.length === 0) {
            showError("You must add at least one person's name if the square is checked.");
            return;
        }

        let newCheckedSquaresArray;
        if (currentModalIsChecked) {
            // Add or update the square with names
            const existingIndex = checkedSquares.findIndex(sq => sq.index === selectedSquareIndex);
            if (existingIndex > -1) {
                newCheckedSquaresArray = [...checkedSquares];
                newCheckedSquaresArray[existingIndex] = { index: selectedSquareIndex, people: currentModalNames };
            } else {
                newCheckedSquaresArray = [...checkedSquares, { index: selectedSquareIndex, people: currentModalNames }];
            }
        } else {
            // Remove the square if unchecked
            newCheckedSquaresArray = checkedSquares.filter(sq => sq.index !== selectedSquareIndex);
        }

        setCheckedSquares(newCheckedSquaresArray);
        setShowSquareModal(false);

        if (!db || !userId || !roomCode) {
            showError("Firebase not initialized or user/room data missing.");
            return;
        }

        try {
            const playerDocRef = doc(db, `artifacts/${appId}/public/data/bingoGames/${roomCode}/players`, userId);
            await updateDoc(playerDocRef, {
                checkedSquares: newCheckedSquaresArray,
                score: newCheckedSquaresArray.length, // Score is simply the count of checked squares
            });
        } catch (error) {
            console.error("Error updating checked squares:", error);
            showError("Failed to update bingo square.");
        }
    };

    // Handles canceling the modal
    const handleCancelSquare = () => {
        setShowSquareModal(false);
        setSelectedSquareIndex(null);
        setCurrentModalNames([]);
        setCurrentModalIsChecked(false);
        setNameInput('');
    };

    const handleSubmitFinalAnswers = async () => {
        if (!db || !userId || !roomCode || isSubmitted) return;
        try {
            const playerDocRef = doc(db, `artifacts/${appId}/public/data/bingoGames/${roomCode}/players`, userId);
            await updateDoc(playerDocRef, {
                isSubmitted: true,
                submissionTime: Date.now(),
            });
            setIsSubmitted(true);
            showSuccess("Your answers have been submitted!");
        } catch (error) {
            console.error("Error submitting answers:", error);
            showError("Failed to submit answers.");
        }
    };

    if (!game || !game.questions) {
        return <p className="text-center text-gray-600">Loading game data...</p>;
    }

    const gridStyle = {
        gridTemplateColumns: `repeat(${game.gridSize}, minmax(0, 1fr))`,
    };

    const sortedPlayers = [...players].sort((a, b) => {
        // Sort by submitted status (submitted first), then by score (desc), then by submission time (asc)
        if (a.isSubmitted && !b.isSubmitted) return -1;
        if (!a.isSubmitted && b.isSubmitted) return 1;
        if (b.score !== a.score) return b.score - a.score;
        return (a.submissionTime || Infinity) - (b.submissionTime || Infinity);
    });

    const isGameActive = game.status === 'playing' || game.status === 'scoring';

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-center bg-indigo-50 border border-indigo-200 text-indigo-700 p-4 rounded-lg shadow-md mb-6">
                <div className="text-center md:text-left mb-4 md:mb-0">
                    <p className="text-xl font-semibold">Time Remaining:</p>
                    <p className="text-4xl font-extrabold">{formatTime(timeLeft)}</p>
                </div>
                <div className="text-center">
                    <p className="text-xl font-semibold">Status:</p>
                    <p className="text-2xl font-bold">
                        {game.status === 'playing' && "Game Active"}
                        {game.status === 'scoring' && "Scoring Phase"}
                        {game.status === 'finished' && "Game Over"}
                    </p>
                </div>
                <div className="text-center md:text-right">
                    <p className="text-xl font-semibold">Players Online:</p>
                    <p className="text-4xl font-extrabold">{players.length}</p>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                    <h3 className="text-2xl font-semibold text-gray-800 mb-4">Bingo Card:</h3>
                    <div className="grid gap-2 p-2 bg-gray-50 rounded-lg shadow-inner" style={gridStyle}>
                        {game.questions.map((question, index) => {
                            const isChecked = checkedSquares.some(sq => sq.index === index);
                            const namesForSquare = checkedSquares.find(sq => sq.index === index)?.people || [];
                            return (
                                <button
                                    key={index}
                                    onClick={() => handleSquareClick(index)}
                                    disabled={!isGameActive || isScoringPhase || isSubmitted}
                                    className={`
                                        relative flex flex-col items-center justify-center text-center p-3 sm:p-4 border rounded-lg shadow-sm
                                        font-medium text-sm sm:text-base leading-tight
                                        transition-all duration-200 ease-in-out transform hover:scale-102
                                        ${isChecked
                                            ? 'bg-green-500 text-white border-green-600 ring-2 ring-green-400'
                                            : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-100'
                                        }
                                        ${!isGameActive || isScoringPhase || isSubmitted ? 'cursor-not-allowed opacity-70' : ''}
                                    `}
                                >
                                    <span className="absolute top-1 left-2 text-xs font-semibold text-gray-400 opacity-70">
                                        {index + 1}.
                                    </span>
                                    <span className="mt-2">{question}</span> {/* Adjusted padding for number */}
                                    {isChecked && namesForSquare.length > 0 && (
                                        <div className="absolute bottom-1 right-1 bg-green-700 text-white text-xs px-2 py-1 rounded-full opacity-90">
                                            {namesForSquare.length} found
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div>
                    <h3 className="text-2xl font-semibold text-gray-800 mb-4">Players & Scores:</h3>
                    <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg h-96 overflow-y-auto shadow-inner">
                        <ul className="space-y-3">
                            {sortedPlayers.map((player) => (
                                <li key={player.id} className={`flex flex-col items-start p-3 rounded-md shadow-sm
                                    ${player.id === userId ? 'bg-indigo-100 border border-indigo-300' : 'bg-white border border-gray-200'}`}
                                >
                                    <div className="flex justify-between items-center w-full mb-1">
                                        <div className="flex items-center">
                                            {player.id === userId && <span className="mr-2 text-indigo-600 font-bold">(You)</span>}
                                            <span className="font-semibold text-gray-800">{player.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-indigo-700">{player.score || 0}/{game.gridSize * game.gridSize}</p>
                                            {player.isSubmitted && game.status === 'scoring' && (
                                                <span className="text-xs text-green-600 font-medium flex items-center">
                                                    {/* Check Circle Icon (Inline SVG) */}
                                                    <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                                    </svg>
                                                    Submitted!
                                                </span>
                                            )}
                                            {player.isSubmitted && game.status === 'finished' && (
                                                <span className="text-xs text-green-600 font-medium flex items-center">
                                                    {/* Check Circle Icon (Inline SVG) */}
                                                    <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                                    </svg>
                                                    Submitted!
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {player.icebreaker && (
                                        <div className="flex justify-between items-center w-full">
                                            <p className="text-sm text-gray-500 italic mt-1">{player.icebreaker}</p>
                                            {player.id !== currentUserId && (
                                                <button
                                                    onClick={() => onAskMore(player)}
                                                    disabled={isGeneratingAskMore}
                                                    className="ml-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-md text-sm hover:bg-purple-200 transition duration-200 flex items-center"
                                                >
                                                    ✨ Ask More
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* New "I'm Done! Submit My Card" button (for playing phase) */}
            {myPlayer && game.status === 'playing' && !isSubmitted && (
                <div className="text-center mt-8">
                    <button
                        onClick={handleSubmitFinalAnswers}
                        disabled={isSubmitted}
                        className={`font-bold py-3 px-6 rounded-md text-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-300 shadow-lg transform hover:scale-105
                            ${isSubmitted ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-400'}`}
                    >
                        I'm Done! Submit My Card
                    </button>
                </div>
            )}

            {/* Square Detail Modal */}
            {showSquareModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50flex items-center justify-center z-50 p-4">
    <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full text-center space-y-4">
        <h3 className="text-2xl font-semibold text-gray-800">Square Details</h3>
        <p className="text-gray-700">{game.questions[selectedSquareIndex]}</p>
        <div className="flex flex-col items-center space-y-2">
            <label className="flex items-center">
                <input
                    type="checkbox"
                    checked={currentModalIsChecked}
                    onChange={(e) => setCurrentModalIsChecked(e.target.checked)}
                    className="mr-2 leading-tight"
                />
                <span className="text-gray-700">Mark as Found</span>
            </label>
            {currentModalIsChecked && (
                <>
                    <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        placeholder="Enter a name (e.g., John Doe)"
                        className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <button
                        onClick={handleAddName}
                        className="w-full py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition duration-200"
                    >
                        Add Name
                    </button>
                    {currentModalNames.length > 0 && (
                        <div className="w-full text-left space-y-1">
                            <p className="text-sm text-gray-600">Added Names:</p>
                            {currentModalNames.map((name, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-gray-100 p-2 rounded-md">
                                    <span className="text-gray-800">{name}</span>
                                    <button
                                        onClick={() => handleRemoveName(name)}
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
        <div className="flex justify-between">
            <button
                onClick={handleCancelSquare}
                className="flex-1 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition duration-200 mr-2"
            >
                Cancel
            </button>
            <button
                onClick={handleSaveSquare}
                disabled={currentModalIsChecked && currentModalNames.length === 0}
                className={`flex-1 py-2 rounded-md transition duration-200 ${currentModalIsChecked && currentModalNames.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
            >
                Save
            </button>
        </div>
    </div>
</div>
            )}

            {/* Admin Controls (Start Scoring or End Game) */}
            {isAdmin && game.status === 'playing' && timeLeft === 0 && (
                <div className="text-center mt-8">
                    <button
                        onClick={handleGameEnd}
                        className="font-bold py-3 px-6 rounded-md text-xl bg-yellow-500 text-white hover:bg-yellow-600 transition duration-300 shadow-lg transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400"
                    >
                        Start Scoring Phase
                    </button>
                </div>
            )}
            {isAdmin && game.status === 'scoring' && timeLeft === 0 && (
                <div className="text-center mt-8">
                    <button
                        onClick={handleScoringEnd}
                        className="font-bold py-3 px-6 rounded-md text-xl bg-red-500 text-white hover:bg-red-600 transition duration-300 shadow-lg transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400"
                    >
                        End Game
                    </button>
                </div>
            )}
        </div>
    );
};

// Leaderboard Component
const Leaderboard = ({ game, players, db, roomCode, appId, showError }) => {
    if (!game || !game.questions) {
        return <p className="text-center text-gray-600">Loading leaderboard...</p>;
    }

    const sortedPlayers = [...players].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (a.submissionTime || Infinity) - (b.submissionTime || Infinity);
    });

    return (
        <div className="space-y-8">
            <h2 className="text-4xl font-extrabold text-center text-indigo-700">Game Over! 🎉</h2>
            <h3 className="text-2xl font-semibold text-center text-gray-800">Leaderboard</h3>
            <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg shadow-inner overflow-y-auto max-h-96">
                {sortedPlayers.length === 0 ? (
                    <p className="text-center text-gray-500 italic">No players to display.</p>
                ) : (
                    <ol className="space-y-4">
                        {sortedPlayers.map((player, index) => (
                            <li key={player.id} className="flex items-center justify-between p-4 bg-white rounded-md shadow-sm border border-gray-100">
                                <div className="flex items-center space-x-4">
                                    <span className="text-2xl font-bold text-indigo-600">{index + 1}</span>
                                    <div>
                                        <p className="text-lg font-semibold text-gray-800">{player.name}</p>
                                        <p className="text-sm text-gray-500">
                                            Score: {player.score || 0}/{game.gridSize * game.gridSize}
                                        </p>
                                        {player.icebreaker && (
                                            <p className="text-sm text-gray-500 italic mt-1">{player.icebreaker}</p>
                                        )}
                                    </div>
                                </div>
                                {player.isSubmitted && (
                                    <span className="text-green-600 font-medium flex items-center">
                                        <svg className="h-5 w-5 mr-1" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                        </svg>
                                        Submitted
                                    </span>
                                )}
                            </li>
                        ))}
                    </ol>
                )}
            </div>
            <div className="text-center">
                <p className="text-gray-600 italic">Thanks for playing! Start a new game or join another room.</p>
            </div>
        </div>
    );
};

// Root component with provider
const Root = () => (
    <AppProvider>
        <App />
    </AppProvider>
);

export default Root;