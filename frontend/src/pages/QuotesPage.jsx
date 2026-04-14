import { useState, useEffect } from "react";
import { getQuotes } from "../api/quotesAPi";
import QuoteCard from "../components/QuoteCard";
import { Search, X } from "lucide-react";

export default function QuotesPage() {
  const [quotes, setQuotes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        const data = await getQuotes();
        setQuotes(data);
      } catch (err) {
        console.error("Eroare la preluarea citatelor:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuotes();
  }, []);

  // Filtrare bazată pe termenul de căutare
  const filteredQuotes = quotes.filter((q) =>
    q.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.quote.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="text-center p-10">Se încarcă citatele...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="relative mb-10 max-w-md mx-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Caută un autor sau un citat..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-10 py-3 border-2 border-gray-100 rounded-2xl focus:border-blue-500 focus:ring-0 transition-all outline-none shadow-sm"
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {filteredQuotes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredQuotes.map((item) => (
            <QuoteCard key={item.id} quote={item} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <p className="text-gray-500">Nu am găsit niciun citat care să se potrivească căutării tale.</p>
        </div>
      )}
    </div>
  );
}