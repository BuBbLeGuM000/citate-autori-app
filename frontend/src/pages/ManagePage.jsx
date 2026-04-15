import { useState, useEffect, useCallback } from "react";
import { getAllQuotes, addQuote, updateQuote, deleteQuote, fetchAuthorImage } from "../api/quotesApi";
import { Plus, Trash2, Edit2, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { useFormValidation } from "../hooks/useFormValidation";

// Regulile de validare
const VALIDATION_RULES = {
  author: {
    required: true,
    requiredMsg: "Autorul este obligatoriu.",
    minLength: 2,
    minLengthMsg: "Autorul trebuie să aibă cel puțin 2 caractere.",
  },
  quote: {
    required: true,
    requiredMsg: "Citatul este obligatoriu.",
    minLength: 5,
    minLengthMsg: "Citatul trebuie să aibă cel puțin 5 caractere.",
  },
};

export default function ManagePage() {
  const [quotes, setQuotes] = useState([]);
  const [editingQuote, setEditingQuote] = useState(null);
  const [formData, setFormData] = useState({ author: "", quote: "" });
  const [imageUrl, setImageUrl] = useState("");
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });

  const { errors, validate, clearErrors } = useFormValidation(VALIDATION_RULES);

  const showFeedback = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 3000);
  };

  const loadQuotes = useCallback(async () => {
    try {
      const data = await getAllQuotes();
      setQuotes(data);
    } catch (err) {
      showFeedback(err.message || "Eroare la încărcarea datelor", "error");
    }
  }, []);

  useEffect(() => {
    loadQuotes();
  }, [loadQuotes]);

  function handleChange(e) {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleFetchImage() {
    if (!formData.author.trim()) {
      setImageError("Introduceți mai întâi numele autorului.");
      return;
    }
    setImageLoading(true);
    setImageError("");
    try {
      const result = await fetchAuthorImage(formData.author);
      setImageUrl(result.imageUrl);
      showFeedback("Imagine găsită pe Wikipedia!", "success");
    } catch (err) {
      setImageError(err.message || "Nu s-a putut prelua imaginea");
      setImageUrl("");
    } finally {
      setImageLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate(formData)) return;
    
    const payload = { ...formData, imageUrl };

    try {
      if (editingQuote) {
        await updateQuote(editingQuote.id, payload);
        showFeedback("Citat actualizat cu succes.", "success");
      } else {
        await addQuote(payload);
        showFeedback("Citat adăugat cu succes.", "success");
      }
      resetForm();
      loadQuotes();
    } catch (err) {
      showFeedback(err.message || "Eroare la salvarea datelor", "error");
    }
  }

  function resetForm() {
    setEditingQuote(null);
    setFormData({ author: "", quote: "" });
    setImageUrl("");
    setImageError("");
    clearErrors();
  }

  function handleEdit(q) {
    setEditingQuote(q);
    setFormData({ author: q.author, quote: q.quote });
    setImageUrl(q.imageUrl || "");
    setImageError("");
    clearErrors();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id) {
    if (window.confirm("Ești sigur că vrei să ștergi acest citat?")) {
      try {
        await deleteQuote(id);
        loadQuotes();
        showFeedback("Citatul a fost șters.", "success");
      } catch (err) {
        showFeedback(err.message || "Eroare la ștergere", "error");
      }
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-indigo-600">Administrare Citate</h1>

      {message.text && (
        <div className={`p-4 mb-6 rounded-lg border ${
          message.type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-md mb-10 border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Autor</label>
            <div className="flex gap-2">
              <input
                name="author"
                type="text"
                value={formData.author}
                onChange={handleChange}
                className={`w-full p-2.5 border rounded-lg outline-none focus:ring-2 ${errors.author ? 'border-red-500' : 'border-gray-300 focus:ring-indigo-500'}`}
                placeholder="Ex: Albert Einstein"
              />
              <button 
                type="button"
                onClick={handleFetchImage}
                disabled={imageLoading || !formData.author.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors whitespace-nowrap"
              >
                {imageLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                Wiki
              </button>
            </div>
            {errors.author && <p className="text-red-500 text-xs mt-1">{errors.author}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Citat</label>
            <input
              name="quote"
              type="text"
              value={formData.quote}
              onChange={handleChange}
              className={`w-full p-2.5 border rounded-lg outline-none focus:ring-2 ${errors.quote ? 'border-red-500' : 'border-gray-300 focus:ring-indigo-500'}`}
              placeholder="Introdu textul citatului..."
            />
            {errors.quote && <p className="text-red-500 text-xs mt-1">{errors.quote}</p>}
          </div>
        </div>

        {imageUrl && !imageError && (
          <div className="mt-3 flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 mb-6">
            <img
              src={`http://localhost:5000${imageUrl}`}
              alt={formData.author}
              className="w-16 h-16 object-cover rounded-full border-2 border-indigo-200"
              onError={e => { e.target.style.display = 'none'; }}
            />  
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-700">{formData.author}</p>
              <p className="text-xs text-gray-400 truncate">{imageUrl}</p>
            </div>
            <button 
              type="button" 
              onClick={() => {setImageUrl(""); setImageError("");}} 
              className="p-1.5 hover:bg-red-50 rounded-full text-red-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {imageError && <p className="text-red-500 text-xs mb-4 font-medium">⚠️ {imageError}</p>}

        <button 
          type="submit" 
          className={`w-full py-3 px-4 rounded-lg font-bold text-white transition-all flex items-center justify-center gap-2 shadow-sm ${
            editingQuote ? "bg-amber-500 hover:bg-amber-600" : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {editingQuote ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {editingQuote ? "Salvează modificările" : "Adaugă citat"}
        </button>
        
        {editingQuote && (
          <button type="button" onClick={resetForm} className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700 underline">
            Renunță la editare
          </button>
        )}
      </form>

      <div className="grid grid-cols-1 gap-4">
        <h2 className="text-xl font-bold text-gray-700 mb-2">Citate existente</h2>
        {quotes.map((q) => (
          <div key={q.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center group hover:border-indigo-200 transition-colors">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 shrink-0 bg-gray-100 rounded-full overflow-hidden border border-gray-200 flex items-center justify-center">
                {q.imageUrl ? (
                  <img src={`http://localhost:5000${q.imageUrl}`} className="w-full h-full object-cover" alt={q.author} />
                ) : (
                  <div className="text-indigo-600 font-bold text-sm">
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