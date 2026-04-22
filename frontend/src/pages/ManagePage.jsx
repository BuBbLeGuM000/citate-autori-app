import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  getAllQuotes,
  addQuote,
  updateQuote,
  deleteQuote,
  fetchAuthorImage,
  generateQuote,
} from "../api/quotesApi";
import QuoteCard from "../components/QuoteCard";
import { Plus, Edit2, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { useFormValidation } from "../hooks/useFormValidation";
import { CATEGORIES } from "../constants/categories";

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
  const [loadingQuotes, setLoadingQuotes] = useState(true);

  // Stări pentru funcționalitatea AI de generare citat
  const [aiLoading, setAiLoading] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);

  const { errors, validate, clearErrors } = useFormValidation(VALIDATION_RULES);

  const [category, setCategory] = useState("");
  const showFeedback = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 3000);
  };

  const loadQuotes = useCallback(async () => {
    setLoadingQuotes(true);
    try {
      const data = await getAllQuotes();
      setQuotes(data);
    } catch (err) {
      showFeedback(err.message || "Eroare la încărcarea datelor", "error");
    } finally {
      setLoadingQuotes(false);
    }
  }, []);

  useEffect(() => {
    loadQuotes();
  }, [loadQuotes]);

  // Debounce de 3 secunde pe câmpul autor pentru generare AI
  useEffect(() => {
    if (
      formData.author.trim().length < 3 ||
      editingQuote ||
      formData.quote.trim().length > 0
    )
      return;

    const timer = setTimeout(async () => {
      setAiLoading(true);
      try {
        const result = await generateQuote(formData.author);
        setFormData((prev) => ({ ...prev, quote: result.quote }));
        setAiGenerated(true);
      } catch (err) {
        console.warn("Generare AI eșuată:", err.message);
      } finally {
        setAiLoading(false);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [formData.author, editingQuote, formData.quote]);

  function handleChange(e) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

    // Resetăm flag-ul dacă utilizatorul modifică manual citatul
    if (e.target.name === "quote") {
      setAiGenerated(false);
    }
  }

  function handleEdit(quote) {
    setEditingQuote(quote);
    setFormData({ author: quote.author, quote: quote.quote });
    setImageUrl(quote.imageUrl || "");
    setCategory(quote.category || "");
    setImageError("");
    clearErrors();
    window.scrollTo({ top: 0, behavior: "smooth" });
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

    const payload = { ...formData, imageUrl, category };

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
    setCategory("");
    setAiGenerated(false);
    clearErrors();
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

  const inputClass = (field) =>
    `w-full p-2.5 border rounded-lg outline-none focus:ring-2 transition ${
      errors[field]
        ? "border-red-500 focus:ring-red-200 bg-red-50"
        : "border-gray-300 focus:ring-indigo-500 bg-white"
    }`;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white shadow-sm mb-8">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-indigo-600">
            Administrare citate
          </h1>
          <Link
            to="/"
            className="px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-colors duration-200"
          >
            ← Înapoi la citate
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pb-12 space-y-10">
        {message.text && (
          <div
            className={`px-4 py-3 rounded-lg text-sm font-medium transition-opacity duration-300 ${
              message.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2
            className={`text-lg font-semibold mb-6 ${editingQuote ? "text-amber-600" : "text-indigo-600"}`}
          >
            {editingQuote ? "Editează citatul" : "+ Adaugă citat nou"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="grid grid-cols-1 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Autor
                </label>
                <div className="flex gap-2">
                  <input
                    name="author"
                    type="text"
                    value={formData.author}
                    onChange={handleChange}
                    className={inputClass("author")}
                    placeholder="Ex: Marcus Aurelius"
                  />
                  <button
                    type="button"
                    onClick={handleFetchImage}
                    disabled={imageLoading || !formData.author.trim()}
                    className="flex-1 max-w-30 flex justify-center items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                  >
                    {imageLoading ? (
                      <Loader2 className="animate-spin w-4 h-4" />
                    ) : (
                      <ImageIcon className="w-4 h-4" />
                    )}
                    Wiki
                  </button>
                </div>
                {errors.author && (
                  <p className="text-red-500 text-xs mt-1">{errors.author}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="quote"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Citat
                  </label>
                  {aiLoading && (
                    <span className="text-xs text-indigo-500 flex items-center gap-1 animate-pulse">
                      <span>✨</span> AI generează citat...
                    </span>
                  )}
                  {aiGenerated && !aiLoading && (
                    <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-200">
                      ✨ Generat de AI
                    </span>
                  )}
                </div>

                <textarea
                  id="quote"
                  name="quote"
                  value={formData.quote}
                  onChange={handleChange}
                  placeholder={
                    aiLoading
                      ? "Se generează citatul..."
                      : "Introduceți citatul sau așteptați generarea automată..."
                  }
                  rows={4}
                  className={`${inputClass("quote")} resize-none transition-all ${aiLoading ? "bg-indigo-50 border-indigo-200" : ""}`}
                />
                <div className="flex justify-between mt-1 items-start">
                  <div className="flex flex-col gap-1">
                    {errors.quote && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <span>⚠️</span> {errors.quote}
                      </p>
                    )}
                    {aiGenerated && !aiLoading && (
                      <p className="text-xs text-gray-400 italic">
                        ▲ Citat sugerat de AI - verificați autenticitatea
                        înainte de salvare.
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-xs ml-auto shrink-0 ${formData.quote.length > 450 ? "text-red-400" : "text-gray-400"}`}
                  >
                    {formData.quote.length}/500
                  </span>
                </div>
                {/* — Dropdown categorie — */}
                <div>
                  <label
                    htmlFor="category"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Categorie
                    <span className="ml-1 text-gray-400 font-normal">
                      (opțional)
                    </span>
                  </label>

                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 text-gray-700 transition"
                  >
                    <option value="">— Fără categorie —</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.emoji} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {imageUrl && !imageError && (
              <div className="mt-3 flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <img
                  src={`http://localhost:5000${imageUrl}`}
                  alt={formData.author}
                  className="w-16 h-16 object-cover rounded-full border-2 border-indigo-200"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700">
                    {formData.author}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{imageUrl}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setImageUrl("");
                    setImageError("");
                  }}
                  className="px-3 py-2 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  X
                </button>
              </div>
            )}

            {imageError && (
              <p className="text-red-500 text-xs mt-1">⚠️ {imageError}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className={`flex-1 py-2.5 text-sm font-semibold text-white rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 ${
                  editingQuote
                    ? "bg-amber-500 hover:bg-amber-600"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {editingQuote ? (
                  <Edit2 className="w-4 h-4" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {editingQuote ? "Salvează modificările" : "Adaugă citat"}
              </button>

              {editingQuote && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Anulează
                </button>
              )}
            </div>
          </form>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            Citate existente
            <span className="ml-2 text-sm font-normal text-gray-400">
              ({quotes.length})
            </span>
          </h2>

          {loadingQuotes ? (
            <p className="text-center text-indigo-500 animate-pulse py-10">
              Se încarcă...
            </p>
          ) : quotes.length === 0 ? (
            <p className="text-center text-gray-400 py-10">
              Nu există citate. Adaugă primul folosind formularul de mai sus.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {quotes.map((q) => (
                <QuoteCard
                  key={q.id}
                  quote={q}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
