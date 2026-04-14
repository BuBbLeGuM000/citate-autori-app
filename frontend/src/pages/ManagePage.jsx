import { useState, useEffect, useCallback } from "react";
import { getQuotes, addQuote, updateQuote, deleteQuote, fetchAuthorImage } from "../api/quotesAPi";
import { Plus, Trash2, Edit2, X, Image as ImageIcon, Loader2 } from "lucide-react";

export default function ManagePage() {
  const [quotes, setQuotes] = useState([]);
  const [author, setAuthor] = useState("");
  const [quoteText, setQuoteText] = useState("");
  
  // Stări pentru Laboratorul 7 (Wikipedia Integration)
  const [imageUrl, setImageUrl] = useState("");
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState({ text: "", type: "" });

  const showMsg = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 3000);
  };

  // useCallback pentru a stabiliza funcția și a respecta regulile hooks
  const loadQuotes = useCallback(async () => {
    try {
      const data = await getQuotes();
      setQuotes(data);
    } catch (err) {
      // Varianta A: Folosim variabila 'err' pentru feedback
      showMsg(err.message || "Eroare la încărcarea datelor", "error");
    }
  }, []);

  useEffect(() => {
    loadQuotes();
  }, [loadQuotes]);

  async function handleFetchImage() {
    if (!author.trim()) {
      setImageError("Introdu numele autorului mai întâi");
      return;
    }
    setImageLoading(true);
    setImageError("");
    try {
      const data = await fetchAuthorImage(author);
      setImageUrl(data.imageUrl);
      showMsg("Imagine găsită pe Wikipedia!", "success");
    } catch (err) {
      // Varianta A: Folosim variabila 'err' pentru a seta eroarea imaginii
      setImageError(err.message || "Nu s-a putut prelua imaginea");
      setImageUrl("");
    } finally {
      setImageLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = { author, quote: quoteText, imageUrl };

    try {
      if (editingId) {
        await updateQuote(editingId, payload);
        showMsg("Citat actualizat cu succes!", "success");
      } else {
        await addQuote(payload);
        showMsg("Citat adăugat cu succes!", "success");
      }
      resetForm();
      loadQuotes();
    } catch (err) {
      // Varianta A: Folosim 'err' pentru a afișa de ce a eșuat salvarea
      showMsg(err.message || "Eroare la salvarea datelor", "error");
    }
  }

  function resetForm() {
    setAuthor("");
    setQuoteText("");
    setImageUrl("");
    setImageError("");
    setEditingId(null);
  }

  function handleEdit(q) {
    setEditingId(q.id);
    setAuthor(q.author);
    setQuoteText(q.quote);
    setImageUrl(q.imageUrl || "");
    setImageError("");
  }

  async function handleDelete(id) {
    if (window.confirm("Sigur vrei să ștergi acest citat?")) {
      try {
        await deleteQuote(id);
        loadQuotes();
        showMsg("Citatul a fost șters.", "success");
      } catch (err) {
        showMsg(err.message || "Eroare la ștergere", "error");
      }
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Administrare Citate</h1>
      </header>

      {message.text && (
        <div className={`p-4 mb-6 rounded-lg border ${
          message.type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm mb-10 border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Autor</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Ex: Albert Einstein"
                required
              />
              <button 
                type="button"
                onClick={handleFetchImage}
                disabled={imageLoading || !author.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-100 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {imageLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                Wiki
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Citat</label>
            <input
              type="text"
              value={quoteText}
              onChange={(e) => setQuoteText(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Introdu textul citatului..."
              required
            />
          </div>
        </div>

        {imageUrl && (
          <div className="mb-6 flex items-center gap-4 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
            <img 
              src={`http://localhost:5000${imageUrl}`} 
              alt="Preview" 
              className="w-16 h-16 object-cover rounded-full border-2 border-white shadow-sm"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Imagine detectată</p>
              <p className="text-xs text-indigo-600 truncate">{imageUrl}</p>
            </div>
            <button type="button" onClick={() => setImageUrl("")} className="p-1.5 hover:bg-indigo-200 rounded-full text-indigo-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {imageError && <p className="text-red-500 text-xs mb-4 font-medium">⚠️ {imageError}</p>}

        <button 
          type="submit" 
          className={`w-full py-3 px-4 rounded-lg font-bold text-white transition-all flex items-center justify-center gap-2 shadow-sm ${
            editingId ? "bg-amber-500 hover:bg-amber-600" : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {editingId ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {editingId ? "Salvează modificările" : "Adaugă citatul în colecție"}
        </button>
        
        {editingId && (
          <button type="button" onClick={resetForm} className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700 underline">
            Renunță la editare
          </button>
        )}
      </form>

      <div className="grid grid-cols-1 gap-4">
        <h2 className="text-xl font-bold text-gray-700 mb-2">Citate existente ({quotes.length})</h2>
        {quotes.map((q) => (
          <div key={q.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center group hover:border-indigo-200 transition-colors">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 shrink-0 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                {q.imageUrl ? (
                  <img src={`http://localhost:5000${q.imageUrl}`} className="w-full h-full object-cover" alt={q.author} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-xs">
                    {q.author.charAt(0)}
                  </div>
                )}
              </div>
              <div className="truncate">
                <p className="font-bold text-gray-900">{q.author}</p>
                <p className="text-gray-600 italic text-sm truncate">"{q.quote}"</p>
              </div>
            </div>
            <div className="flex gap-1 ml-4">
              <button onClick={() => handleEdit(q)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(q.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}