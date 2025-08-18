import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function PublicScoreboard() {
  const { gameId } = useParams();
  const [game, setGame] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [debugInfo, setDebugInfo] = useState([]);

  // Try multiple possible paths
  const possiblePaths = [
    // Original path you were using
    `games/${gameId}`,
    // Path with artifacts (you'll need to replace 'your-app-id' with your actual appId)
    `artifacts/1:136531916308:web:497b7e7d4b234113629901/public/data/bingoGames/${gameId}`,
    // Alternative paths
    `bingoGames/${gameId}`,
    `gameData/${gameId}`,
    // Add more if you suspect other structures
  ];

  useEffect(() => {
    const tryMultiplePaths = async () => {
      const debugResults = [];
      let foundGame = null;
      let foundPlayers = [];

      for (const path of possiblePaths) {
        try {
          console.log(`Trying path: ${path}`);
          debugResults.push(`Trying path: ${path}`);

          const gameDoc = await getDoc(doc(db, ...path.split("/")));

          if (gameDoc.exists()) {
            console.log(`✅ Found game at: ${path}`, gameDoc.data());
            debugResults.push(`✅ Found game at: ${path}`);
            foundGame = { id: gameDoc.id, ...gameDoc.data() };

            // Try to get players
            try {
              const playersSnap = await getDocs(
                collection(db, ...path.split("/"), "players")
              );
              foundPlayers = playersSnap.docs.map((d) => ({
                id: d.id,
                ...d.data(),
              }));
              debugResults.push(`✅ Found ${foundPlayers.length} players`);
              console.log(
                `Found ${foundPlayers.length} players:`,
                foundPlayers
              );
            } catch (playerErr) {
              debugResults.push(
                `❌ Error getting players: ${playerErr.message}`
              );
              console.log("Error getting players:", playerErr);
            }

            break; // Stop trying other paths
          } else {
            console.log(`❌ No game at: ${path}`);
            debugResults.push(`❌ No game at: ${path}`);
          }
        } catch (err) {
          console.log(`❌ Error trying ${path}:`, err);
          debugResults.push(`❌ Error trying ${path}: ${err.message}`);
        }
      }

      setDebugInfo(debugResults);

      if (foundGame) {
        setGame(foundGame);
        foundPlayers.sort((a, b) => (b.score || 0) - (a.score || 0));
        setPlayers(foundPlayers);
      } else {
        setError(
          "Game not found in any of the expected paths. Check debug info below."
        );
      }

      setLoading(false);
    };

    tryMultiplePaths();
  }, [gameId]);

  const handleDownloadPDF = () => {
    if (!players.length) return;

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`${game?.name || "Game"} – Scoreboard`, 14, 20);

    const tableColumn = ["Rank", "Player", "Score"];
    const tableRows = players.map((p, i) => [
      i + 1,
      p.name || "Unnamed",
      p.score ?? 0,
    ]);

    doc.autoTable({
      startY: 30,
      head: [tableColumn],
      body: tableRows,
      theme: "striped",
    });

    doc.setFontSize(10);
    doc.text(
      "Generated from Public Scoreboard",
      14,
      doc.internal.pageSize.height - 10
    );

    doc.save(`${game?.name || "scoreboard"}_${gameId}.pdf`);
  };

  if (loading) return <p className="p-4 text-gray-500">Loading scoreboard…</p>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Debug Information */}
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-bold mb-2">Debug Information:</h3>
        <p className="text-sm mb-2">
          Game ID from URL: <code>{gameId}</code>
        </p>
        <div className="text-xs space-y-1">
          {debugInfo.map((info, index) => (
            <div key={index} className="font-mono">
              {info}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {game ? (
        <>
          <h1 className="text-2xl font-bold text-center mb-4">
            {game.name} – Scoreboard
          </h1>

          <div className="bg-white shadow rounded-lg p-4">
            {players.length === 0 ? (
              <p className="text-center text-gray-500">No players yet.</p>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-2">Rank</th>
                    <th className="p-2">Player</th>
                    <th className="p-2 text-right">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p, index) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="p-2">{index + 1}</td>
                      <td className="p-2">{p.name || "Unnamed"}</td>
                      <td className="p-2 text-right">{p.score ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {players.length > 0 && (
            <div className="text-center mt-4">
              <button
                onClick={handleDownloadPDF}
                className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow"
              >
                Download Scoreboard (PDF)
              </button>
            </div>
          )}

          <p className="mt-4 text-center text-xs text-gray-400">
            Shared scoreboard – view only
          </p>
        </>
      ) : (
        <div className="text-center">
          <p className="text-gray-500">No game found</p>
        </div>
      )}
    </div>
  );
}
