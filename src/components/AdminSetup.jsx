import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, doc, setDoc } from "firebase/firestore";

const AdminSetup = ({
  onGameCreated,
  userId,
  db,
  appId,
  showError,
  geminiApiKey,
}) => {
 const navigate = useNavigate(); 
  const [industry, setIndustry] = useState("Human Resources");
  const [gridSize, setGridSize] = useState(5);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [customTimerDuration, setCustomTimerDuration] = useState(30);
  const [manualQuestionsInput, setManualQuestionsInput] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [currentQuestions, setCurrentQuestions] = useState([]);

  const industries = [
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
  const gridSizes = [3, 4, 5, 6, 7]; // ← 3×3 added

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

  const generateQuestionsAI = async () => {
    setLoadingQuestions(true);
    const prompt = `Generate ${
      gridSize * gridSize
    } unique "Find someone who..." bingo statements relevant to the ${industry} industry. Output a JSON array of strings.`;
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        }
      );
      const data = await res.json();
      const arr = JSON.parse(data.candidates[0].content.parts[0].text);
      setCurrentQuestions(arr.slice(0, gridSize * gridSize));
    } catch (e) {
      showError(e.message || "AI generation failed");
      setCurrentQuestions([]);
    } finally {
      setLoadingQuestions(false);
    }
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

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      let lines = ev.target.result.split("\n");
      if (file.type === "text/csv" || file.name.endsWith(".csv"))
        lines = lines.map((l) => l.split(",")[0]?.trim());
      const list = lines
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => l.replace(/^\d+\.\s*/, ""));
      setCurrentQuestions(list);
    };
    reader.readAsText(file);
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
      return showError(`Need ${gridSize * gridSize} questions`);
    if (customTimerDuration <= 0) return showError("Timer must be > 0");

    try {
      const gamesCollectionRef = collection(
        db,
        `artifacts/${appId}/public/data/bingoGames`
      );
      const newGame = await addDoc(gamesCollectionRef, {
        adminId: userId,
        industry,
        gridSize,
        timerDuration: customTimerDuration,
        status: "waiting",
        questions: currentQuestions,
        startTime: null,
        scoringEndTime: null,
      });

      await setDoc(
        doc(
          db,
          `artifacts/${appId}/public/data/bingoGames/${newGame.id}/players`,
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

      onGameCreated(newGame.id, {
        id: newGame.id,
        adminId: userId,
        industry,
        gridSize,
        timerDuration: customTimerDuration,
        status: "waiting",
        questions: currentQuestions,
      });
    } catch (e) {
      showError(`Create failed: ${e.message}`);
    }
    navigate(`/waiting/${newGameId}`);
  };

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 bg-white rounded-2xl shadow-2xl max-w-sm sm:max-w-md md:max-w-lg mx-auto border-4 border-purple-200">
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
        <div>
          <label className="block text-sm font-semibold mb-1">Industry</label>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="w-full border border-blue-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-blue-300"
          >
            {industries.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
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
          accept=".txt,.csv"
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
            : "bg-gradient-to-r from-purple-600 to-blue-600 text-white"
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
