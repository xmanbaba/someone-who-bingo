import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase"; // adjust path if needed
import { doc, getDoc, collection, getDocs } from "firebase/firestore";

// ✅ import jspdf
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function PublicScoreboard() {
  const { gameId } = useParams();
  const [game, setGame] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchGame = async () => {
      try {
        const gameDoc = await getDoc(doc(db, "games", gameId));
        if (!gameDoc.exists()) {
          setError("Game not found.");
          setLoading(false);
          return;
        }
        setGame({ id: gameDoc.id, ...gameDoc.data() });

        const playersSnap = await getDocs(
          collection(db, "games", gameId, "players")
        );
        const playerList = playersSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        playerList.sort((a, b) => (b.score || 0) - (a.score || 0));
        setPlayers(playerList);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching scoreboard:", err);
        setError("Failed to load scoreboard.");
        setLoading(false);
      }
    };

    fetchGame();
  }, [gameId]);

  // ✅ Download as PDF
  const handleDownloadPDF = () => {
    if (!players.length) return;

    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.text(`${game?.name || "Game"} – Scoreboard`, 14, 20);

    // Table
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

    // Footer
    doc.setFontSize(10);
    doc.text(
      "Generated from Public Scoreboard",
      14,
      doc.internal.pageSize.height - 10
    );

    // Save
    doc.save(`${game?.name || "scoreboard"}_${gameId}.pdf`);
  };

  if (loading) return <p className="p-4 text-gray-500">Loading scoreboard…</p>;
  if (error) return <p className="p-4 text-red-500">{error}</p>;
  if (!game) return null;

  return (
    <div className="max-w-2xl mx-auto p-6">
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

      {/* ✅ Download PDF button */}
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
    </div>
  );
}
 