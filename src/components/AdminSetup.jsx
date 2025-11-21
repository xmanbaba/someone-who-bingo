import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  addDoc,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import ProfileIcon from "./ProfileIcon";
import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";

// PDF worker setup for pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const AdminSetup = ({
  onGameCreated,
  userId,
  db,
  appId,
  showError,
  geminiApiKey,
  onSignOut,
  auth,
}) => {
  const navigate = useNavigate();
  const [selectedIndustry, setSelectedIndustry] = useState("Human Resources");
  const [customIndustry, setCustomIndustry] = useState("");
  const [gridSize, setGridSize] = useState(5);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [customTimerDuration, setCustomTimerDuration] = useState(30);
  const [manualQuestionsInput, setManualQuestionsInput] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [currentQuestions, setCurrentQuestions] = useState([]);
  const [currentProvider, setCurrentProvider] = useState("");

  const topics = [
    "General",
    "Human Resources",
    "Technology",
    "Healthcare",
    "Finance",
    "Education",
    "Manufacturing",
    "Retail",
    "Automotive",
    "Energy",
    "Food & Beverage",
    "Media",
    "Real Estate",
    "Pharmaceutical",
  ];
  const gridSizes = [3, 4, 5, 6, 7];

  const shuffleArray = (array) => {
    const arr = [...array];
    let currentIndex = arr.length,
      randomIndex;
    while (currentIndex !== 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      [arr[currentIndex], arr[randomIndex]] = [
        arr[randomIndex],
        arr[currentIndex],
      ];
    }
    return arr;
  };

  // OpenRouter API call (using DeepSeek via OpenRouter - WORKING!)
  const generateWithOpenRouter = async (prompt, numQuestions) => {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${geminiApiKey}`,
          "HTTP-Referer": window.location.origin,
        },
        body: JSON.stringify({
          model: "deepseek/deepseek-chat",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant that generates icebreaker questions. Always respond with valid JSON arrays only."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.8,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenRouter Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error("Invalid response structure from OpenRouter");
      }

      let content = data.choices[0].message.content.trim();
      
      // Clean markdown formatting
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Parse JSON
      let questions = JSON.parse(content);
      
      if (!Array.isArray(questions)) {
        throw new Error("Response is not an array");
      }

      return questions.slice(0, numQuestions);
    } catch (error) {
      console.error("OpenRouter failed:", error);
      throw error;
    }
  };

  // Together.ai API call (fallback option if you add a key)
  const generateWithTogether = async (prompt, numQuestions) => {
    // Check if Together API key is available
    const togetherKey = import.meta.env.VITE_TOGETHER_API_KEY;
    if (!togetherKey || togetherKey === "YOUR_TOGETHER_API_KEY") {
      throw new Error("Together.ai API key not configured");
    }

    try {
      const response = await fetch("https://api.together.xyz/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${togetherKey}`,
        },
        body: JSON.stringify({
          model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant that generates icebreaker questions. Always respond with valid JSON arrays only."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.8,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Together.ai Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error("Invalid response structure from Together.ai");
      }

      let content = data.choices[0].message.content.trim();
      
      // Clean markdown formatting
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Parse JSON
      let questions = JSON.parse(content);
      
      if (!Array.isArray(questions)) {
        throw new Error("Response is not an array");
      }

      return questions.slice(0, numQuestions);
    } catch (error) {
      console.error("Together.ai failed:", error);
      throw error;
    }
  };

  // Gemini API call (improved with better error handling)
  const generateWithGemini = async (prompt, numQuestions) => {
    // Only try Gemini if a separate Gemini key is available
    const geminiKey = import.meta.env.VITE_GEMINI_BACKUP_API_KEY;
    if (!geminiKey) {
      throw new Error("Gemini API key not configured");
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ 
              role: "user", 
              parts: [{ text: prompt }] 
            }],
            generationConfig: { 
              temperature: 0.8,
              maxOutputTokens: 2048,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Gemini Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();

      // Robust error checking
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts) {
        console.error('Unexpected Gemini response structure:', data);
        throw new Error('Invalid response format from Gemini API');
      }

      let text = data.candidates[0].content.parts[0].text.trim();
      
      // Clean markdown formatting
      if (text.startsWith('```json')) {
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (text.startsWith('```')) {
        text = text.replace(/```\n?/g, '');
      }
      text = text.trim();

      // Try to parse JSON
      let questions;
      try {
        questions = JSON.parse(text);
      } catch (parseError) {
        // Fallback: Extract questions manually
        const lines = text.split('\n').filter(line => line.trim());
        questions = lines
          .map(line => line.trim().replace(/^[\d\.\-\*]+\s*/, '').replace(/^["']|["']$/g, ''))
          .filter(line => line.toLowerCase().includes('someone who') || line.toLowerCase().includes('find someone'));
      }

      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('No valid questions generated');
      }

      return questions.slice(0, numQuestions);
    } catch (error) {
      console.error("Gemini failed:", error);
      throw error;
    }
  };

  // Main generation function with fallback logic
  const generateQuestionsAI = async () => {
    setLoadingQuestions(true);
    setCurrentProvider("");

    const finalIndustry =
      selectedIndustry === "Other" ? customIndustry : selectedIndustry;

    if (!finalIndustry) {
      showError("Please select or enter a topic");
      setLoadingQuestions(false);
      return;
    }

    const numQuestions = gridSize * gridSize;
    const prompt = `Generate exactly ${numQuestions} unique "Find someone who..." or "Someone who..." bingo statements relevant to ${finalIndustry}. 

Requirements:
- Each statement should be a conversation starter
- Make them appropriate for professional settings
- Ensure they're engaging and fun
- Return ONLY a JSON array of strings, nothing else
- No explanations, just the array

Example format:
["Someone who has worked in ${finalIndustry} for over 10 years", "Someone who speaks three or more languages"]

Generate ${numQuestions} statements now:`;

    // Prioritize OpenRouter (working), then fallbacks
    const providers = [
      { name: "OpenRouter (DeepSeek)", fn: generateWithOpenRouter },
      { name: "Together.ai", fn: generateWithTogether },
      { name: "Gemini", fn: generateWithGemini },
    ];

    let lastError = null;

    for (const provider of providers) {
      try {
        setCurrentProvider(`Trying ${provider.name}...`);
        console.log(`Attempting generation with ${provider.name}`);
        
        const questions = await provider.fn(prompt, numQuestions);
        
        if (questions && questions.length > 0) {
          setCurrentQuestions(questions);
          setCurrentProvider(`✅ Generated with ${provider.name}`);
          setLoadingQuestions(false);
          
          // Clear success message after 3 seconds
          setTimeout(() => setCurrentProvider(""), 3000);
          return;
        }
      } catch (error) {
        console.error(`${provider.name} failed:`, error);
        lastError = error;
        // Continue to next provider
      }
    }

    // All providers failed
    setLoadingQuestions(false);
    setCurrentProvider("");
    showError(
      `All AI providers failed. Last error: ${lastError?.message || 'Unknown error'}. Please use manual entry or file upload.`
    );
    setCurrentQuestions([]);
  };

  const handleParseManualQuestions = () => {
    const list = manualQuestionsInput
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.replace(/^\d+\.\s*/, ""));
    if (!list.length) return showError("No valid questions");
    setCurrentQuestions(list);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);

    try {
      if (file.type === "text/plain" || file.name.endsWith(".txt")) {
        const text = await file.text();
        processText(text);
      } else if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        const text = await file.text();
        const lines = text.split("\n").map((l) => l.split(",")[0]?.trim());
        processText(lines.join("\n"));
      } else if (
        file.type === "application/pdf" ||
        file.name.endsWith(".pdf")
      ) {
        const pdf = await pdfjsLib.getDocument(await file.arrayBuffer())
          .promise;
        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map((s) => s.str).join(" ") + "\n";
        }
        processText(text);
      } else if (
        file.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.name.endsWith(".docx")
      ) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        processText(result.value);
      } else {
        showError("Unsupported file type. Use TXT, CSV, PDF, or DOCX.");
      }
    } catch (err) {
      showError("Failed to read file: " + err.message);
    }
  };

  const processText = (text) => {
    const list = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.replace(/^\d+\.\s*/, ""));
    if (!list.length) return showError("No valid questions found");
    setCurrentQuestions(list);
  };

  const handleShuffleQuestions = () => {
    if (!currentQuestions.length) return showError("Nothing to shuffle");
    setCurrentQuestions(shuffleArray([...currentQuestions]));
  };

  const handleCreateGame = async () => {
    if (
      !currentQuestions.length ||
      currentQuestions.length !== gridSize * gridSize
    )
      return showError(`Need exactly ${gridSize * gridSize} questions`);
    if (customTimerDuration <= 0) return showError("Timer must be > 0");

    const finalIndustry =
      selectedIndustry === "Other" ? customIndustry : selectedIndustry;

    if (!finalIndustry) return showError("Please select or enter a topic");

    let newGameId;

    try {
      const gamesCollectionRef = collection(
        db,
        `artifacts/${appId}/public/data/bingoGames`
      );
      const newGame = await addDoc(gamesCollectionRef, {
        adminId: userId,
        industry: finalIndustry,
        gridSize,
        timerDuration: customTimerDuration,
        status: "waiting",
        questions: currentQuestions,
        startTime: null,
        scoringEndTime: null,
        createdAt: serverTimestamp(),
      });

      newGameId = newGame.id;

      await setDoc(
        doc(
          db,
          `artifacts/${appId}/public/data/bingoGames/${newGameId}/players`,
          userId
        ),
        {
          name: "Admin",
          checkedSquares: [],
          submissionTime: null,
          isSubmitted: false,
          score: 0,
          icebreaker: "The game master who sets the stage for fun! ✨",
        }
      );

      onGameCreated(newGameId, {
        id: newGameId,
        adminId: userId,
        industry: finalIndustry,
        gridSize,
        timerDuration: customTimerDuration,
        status: "waiting",
        questions: currentQuestions,
      });

      navigate(`/waiting/${newGameId}`);
    } catch (e) {
      showError(`Create failed: ${e.message}`);
      return;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 bg-white rounded-2xl shadow-2xl max-w-sm sm:max-w-md md:max-w-lg mx-auto border-4 border-purple-200">
      {/* Profile Icon in top right */}
      <div className="absolute top-6 right-6">
        <ProfileIcon currentUserId={userId} onSignOut={onSignOut} auth={auth} />
      </div>
      <h2 className="text-2xl sm:text-3xl font-extrabold text-center text-purple-800 mb-4 flex items-center justify-center">
        <svg
          className="w-7 h-7 sm:w-10 sm:h-10 mr-2"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 2L1 12h3v8h16v-8h3L12 2zm0 3.96L17.06 9H6.94L12 5.96zM15 17H9v-5h6v5z" />
        </svg>
        Set Up New Game
      </h2>

      {/* Game Settings */}
      <div className="space-y-4 bg-blue-50 p-4 rounded-xl shadow-inner border border-blue-100">
        <h3 className="text-lg sm:text-xl font-bold text-blue-700">
          Game Settings
        </h3>
        {/* Industry */}
        <div>
          <label className="block text-sm font-semibold mb-1">Topic</label>
          <select
            value={selectedIndustry}
            onChange={(e) => setSelectedIndustry(e.target.value)}
            className="w-full border border-blue-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-blue-300"
          >
            <option value="">Select a topic</option>
            {topics.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
            <option value="Other">Other</option>
          </select>

          {selectedIndustry === "Other" && (
            <input
              type="text"
              placeholder="Enter any topic of choice"
              value={customIndustry}
              onChange={(e) => setCustomIndustry(e.target.value)}
              className="mt-2 w-full border border-blue-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-blue-300"
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Grid Size</label>
          <select
            value={gridSize}
            onChange={(e) => setGridSize(Number(e.target.value))}
            className="w-full border border-blue-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-blue-300"
          >
            {gridSizes.map((s) => (
              <option key={s} value={s}>
                {s}×{s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">
            Timer (min)
          </label>
          <input
            type="number"
            min="1"
            value={customTimerDuration}
            onChange={(e) => setCustomTimerDuration(Number(e.target.value))}
            className="w-full border border-blue-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-blue-300"
          />
        </div>
      </div>

      {/* Question Source */}
      <div className="space-y-4 bg-purple-50 p-4 rounded-xl shadow-inner border border-purple-100">
        <h3 className="text-lg sm:text-xl font-bold text-purple-700">
          Question Source
        </h3>

        <button
          onClick={generateQuestionsAI}
          disabled={loadingQuestions}
          className={`w-full py-2.5 rounded-lg font-bold text-sm transition-all ${
            loadingQuestions
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-purple-500 hover:bg-purple-600 text-white"
          }`}
        >
          {loadingQuestions ? "Generating..." : "✨ Generate AI Questions"}
        </button>

        {/* Provider status */}
        {currentProvider && (
          <div className="text-center text-sm text-gray-600 italic">
            {currentProvider}
          </div>
        )}

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="mx-2 text-xs text-gray-500">OR</span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>

        <textarea
          rows="4"
          placeholder="One question per line"
          value={manualQuestionsInput}
          onChange={(e) => setManualQuestionsInput(e.target.value)}
          className="w-full border border-red-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-red-300"
        />
        <button
          onClick={handleParseManualQuestions}
          className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold text-sm"
        >
          📝 Use Manual
        </button>

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="mx-2 text-xs text-gray-500">OR</span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>

        <input
          type="file"
          accept=".txt,.csv,.pdf,.docx"
          onChange={handleFileUpload}
          className="block w-full text-xs file:mr-2 file:py-2 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
        />
      </div>

      {/* Question Preview */}
      {currentQuestions.length > 0 && (
        <div className="space-y-3 bg-purple-50 p-4 rounded-xl shadow-inner border border-purple-100">
          <h3 className="text-lg font-bold text-purple-700">
            Preview ({currentQuestions.length})
          </h3>
          <div className="flex gap-2">
            <button
              onClick={handleShuffleQuestions}
              className="flex-1 py-2 bg-indigo-400 hover:bg-indigo-500 text-white rounded-lg text-sm"
            >
              🔀 Shuffle
            </button>
            <button
              onClick={() => setCurrentQuestions([])}
              className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm"
            >
              🗑️ Clear
            </button>
          </div>
          <ul className="bg-white border border-gray-200 rounded-lg max-h-48 overflow-y-auto p-2 space-y-1 text-sm">
            {currentQuestions.map((q, i) => (
              <li key={i} className="px-2 py-1 bg-gray-50 rounded">
                {q}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Create Game */}
      <button
        onClick={handleCreateGame}
        disabled={
          loadingQuestions ||
          currentQuestions.length === 0 ||
          customTimerDuration <= 0 ||
          currentQuestions.length !== gridSize * gridSize
        }
        className={`w-full font-bold py-3 rounded-xl text-base sm:text-lg transition-transform ${
          loadingQuestions ||
          currentQuestions.length === 0 ||
          customTimerDuration <= 0 ||
          currentQuestions.length !== gridSize * gridSize
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:scale-105"
        }`}
      >
        🚀 Create Game
      </button>

      {/* Back button */}
      <button
        onClick={() => navigate("/role")}
        className="w-full font-bold py-3 mt-6 bg-gray-500 text-white rounded-xl shadow-md hover:bg-gray-600 transition-transform transform hover:scale-105"
      >
        ⬅️ Back to Role Selection
      </button>
    </div>
  );
};

export default AdminSetup;