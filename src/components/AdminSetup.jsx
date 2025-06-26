import React, { useState } from 'react';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore'; // Import necessary Firestore functions

// AdminSetup Component: Handles the creation of a new game by an admin
const AdminSetup = ({ onGameCreated, userId, db, appId, showError, geminiApiKey }) => {
    // Existing states for game settings and question management
    const [industry, setIndustry] = useState('Human Resources'); // Default to Human Resources
    const [gridSize, setGridSize] = useState(5); // Default 5x5
    const [loadingQuestions, setLoadingQuestions] = useState(false);
    const [customTimerDuration, setCustomTimerDuration] = useState(30); // User input for timer
    const [manualQuestionsInput, setManualQuestionsInput] = useState('');
    const [uploadedFile, setUploadedFile] = useState(null);
    const [currentQuestions, setCurrentQuestions] = useState([]); // Array of questions for preview and saving

    const industries = [
        'Human Resources', 'Technology', 'Healthcare', 'Finance', 'Education', 'Manufacturing',
        'Retail', 'Automotive', 'Energy', 'Food & Beverage', 'Media', 'Real Estate', 'Pharmaceutical',
    ];
    const gridSizes = [4, 5, 6, 7];

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

    // AI Question Generation
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
                const jsonString = result.candidates[0].content.parts[0].text;
                const questions = JSON.parse(jsonString);
                if (questions.length < gridSize * gridSize) {
                    showError(`Generated only ${questions.length} questions, need ${gridSize * gridSize}. Please try again.`);
                    setCurrentQuestions([]);
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
            // Using a fixed appId for local development as we're not in Canvas
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

            console.log("Admin: Game created with ID:", newGameRef.id);

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
        <div className="space-y-8 p-6 bg-white rounded-3xl shadow-2xl max-w-2xl mx-auto border-4 border-purple-200">
            <h2 className="text-4xl font-extrabold text-center text-purple-800 mb-8 drop-shadow-md font-inter-rounded flex items-center justify-center">
                <svg className="w-10 h-10 mr-3 text-purple-600" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L1 12h3v8h16v-8h3L12 2zm0 3.96L17.06 9H6.94L12 5.96zM15 17H9v-5h6v5z"/>
                </svg>
                Set Up New Game
            </h2>

            {/* General Game Settings */}
            <div className="p-6 bg-blue-50 rounded-2xl shadow-inner space-y-5 border-2 border-blue-100">
                <h3 className="text-2xl font-bold text-blue-700 flex items-center font-inter-rounded">
                    <svg className="w-7 h-7 mr-3 text-blue-600" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                    </svg>
                    Game Settings
                </h3>
                <div>
                    <label htmlFor="industry" className="block text-gray-700 text-base font-semibold mb-2 font-inter-rounded">
                        Select Industry:
                    </label>
                    <select
                        id="industry"
                        className="shadow-md border border-blue-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-4 focus:ring-blue-300 transition duration-300 ease-in-out bg-blue-50 appearance-none font-inter-rounded"
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
                    <label htmlFor="gridSize" className="block text-gray-700 text-base font-semibold mb-2 font-inter-rounded">
                        Grid Size:
                    </label>
                    <select
                        id="gridSize"
                        className="shadow-md border border-blue-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-4 focus:ring-blue-300 transition duration-300 ease-in-out bg-blue-50 appearance-none font-inter-rounded"
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
                    <label htmlFor="customTimerDuration" className="block text-gray-700 text-base font-semibold mb-2 font-inter-rounded">
                        Game Timer (minutes):
                    </label>
                    <input
                        type="number"
                        id="customTimerDuration"
                        className="shadow-md appearance-none border border-blue-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-4 focus:ring-blue-300 transition duration-300 ease-in-out bg-blue-50 font-inter-rounded"
                        placeholder="e.g., 25"
                        value={customTimerDuration}
                        onChange={(e) => setCustomTimerDuration(parseInt(e.target.value) || 0)}
                        min="1"
                        required
                    />
                </div>
            </div>

            {/* Question Generation/Input Options */}
            <div className="p-6 bg-purple-50 rounded-2xl shadow-inner space-y-6 border-2 border-purple-100">
                <h3 className="text-2xl font-bold text-purple-700 flex items-center font-inter-rounded">
                    <svg className="w-7 h-7 mr-3 text-purple-600" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M14 10H2V5h12v5zm0 2H2v5h12v-5zm0 5h-2v-3h2v3zM22 17h-6v-3h6v3zM22 5h-6v3h6V5z"/></svg>
                    Question Source
                </h3>

                {/* AI Generation */}
                <div>
                    <h4 className="text-xl font-semibold text-gray-800 mb-3 font-inter-rounded">Generate Questions with AI:</h4>
                    <button
                        onClick={generateQuestionsAI}
                        disabled={loadingQuestions}
                        className={`w-full py-3 px-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg transform hover:scale-105 font-inter-rounded
                            ${loadingQuestions ? 'bg-purple-300 cursor-not-allowed' : 'bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 text-white'}`}
                    >
                        {loadingQuestions ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Generating...
                            </span>
                        ) : (
                            '✨ Generate AI Questions'
                        )}
                    </button>
                </div>

                <div className="relative flex py-3 items-center">
                    <div className="flex-grow border-t border-gray-300"></div>
                    <span className="flex-shrink mx-4 text-gray-500 text-sm font-bold font-inter-rounded">OR</span>
                    <div className="flex-grow border-t border-gray-300"></div>
                </div>

                {/* Manual Input */}
                <div>
                    <h4 className="text-xl font-semibold text-gray-800 mb-3 font-inter-rounded">Enter Questions Manually:</h4>
                    <textarea
                        className="shadow-md appearance-none border border-red-400 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-4 focus:ring-red-300 transition duration-300 ease-in-out bg-red-50 font-inter-rounded"
                        rows="6"
                        placeholder="1. Enter one question per line, e.g.:
2. Find someone who loves coffee.
3. Find someone who speaks more than two languages.
4. Find someone who has traveled to another continent."
                        value={manualQuestionsInput}
                        onChange={(e) => setManualQuestionsInput(e.target.value)}
                    ></textarea>
                    <button
                        onClick={handleParseManualQuestions}
                        className="w-full mt-3 py-3 px-4 bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white font-bold rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 font-inter-rounded"
                    >
                        📝 Use Manual Questions
                    </button>
                </div>

                <div className="relative flex py-3 items-center">
                    <div className="flex-grow border-t border-gray-300"></div>
                    <span className="flex-shrink mx-4 text-gray-500 text-sm font-bold font-inter-rounded">OR</span>
                    <div className="flex-grow border-t border-gray-300"></div>
                </div>

                {/* File Upload */}
                <div>
                    <h4 className="text-xl font-semibold text-gray-800 mb-3 font-inter-rounded">Upload Questions (CSV/Text):</h4>
                    <input
                        type="file"
                        accept=".txt,.csv"
                        onChange={handleFileUpload}
                        className="block w-full text-base text-gray-600
                            file:mr-4 file:py-3 file:px-6
                            file:rounded-full file:border-0
                            file:text-base file:font-semibold
                            file:bg-blue-100 file:text-blue-700
                            hover:file:bg-blue-200 transition-all duration-300 cursor-pointer font-inter-rounded"
                    />
                    {uploadedFile && <p className="text-sm text-gray-600 mt-3 font-inter-rounded">Selected file: <span className="font-medium text-blue-700">{uploadedFile.name}</span></p>}
                </div>
            </div>

            {/* Question Management & Preview */}
            {currentQuestions.length > 0 && (
                <div className="p-6 bg-purple-50 rounded-2xl shadow-inner space-y-5 border-2 border-purple-100">
                    <h3 className="text-2xl font-bold text-purple-700 flex items-center font-inter-rounded">
                        <svg className="w-7 h-7 mr-3 text-purple-600" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 13H5v-2h14v2zm0 4H5v-2h14v2zm0-8H5V7h14v2z"/></svg>
                        Question Preview ({currentQuestions.length} questions)
                    </h3>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={handleShuffleQuestions}
                            className="flex-1 py-3 px-4 bg-gradient-to-r from-indigo-400 to-indigo-600 hover:from-indigo-500 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 font-inter-rounded"
                        >
                            🔀 Shuffle Questions
                        </button>
                        <button
                            onClick={() => setCurrentQuestions([])}
                            className="flex-1 py-3 px-4 bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white font-bold rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 font-inter-rounded"
                        >
                            🗑️ Clear Questions
                        </button>
                    </div>
                    <div className="bg-white border border-gray-200 p-5 rounded-lg h-64 overflow-y-auto shadow-md">
                        <ul className="list-decimal list-inside text-gray-800 space-y-2 text-lg font-inter-rounded">
                            {currentQuestions.map((q, index) => (
                                <li key={index} className="px-2 py-1 bg-gray-50 rounded-md hover:bg-gray-100 transition duration-200">{q}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Create Game Button */}
            <button
                onClick={handleCreateGame}
                disabled={loadingQuestions || currentQuestions.length === 0 || customTimerDuration <= 0 || currentQuestions.length !== gridSize * gridSize}
                className={`w-full font-extrabold py-4 px-6 rounded-2xl text-2xl focus:outline-none focus:ring-4 focus:ring-offset-2 transition-all duration-300 shadow-xl transform hover:scale-105 font-inter-rounded
                    ${(loadingQuestions || currentQuestions.length === 0 || customTimerDuration <= 0 || currentQuestions.length !== gridSize * gridSize) ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white focus:ring-purple-400'}`}
            >
                🚀 Create Game
            </button>
        </div>
    );
};

export default AdminSetup;
