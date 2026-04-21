require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Joi = require("joi");
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");

const app = express();
app.use(cors());
app.use(express.json());

const JSON_SERVER_URL = "http://localhost:3000/quotes";

// Inițializăm clientul OpenAI
const openai = new OpenAI({
  baseURL: "https://models.inference.ai.azure.com",
  apiKey: process.env.GITHUB_TOKEN,
});

const validateId = (req, res, next) => {
  if (isNaN(req.params.id)) {
    return res.status(400).json({ error: "Invalid ID format" });
  }
  next();
};

const quoteSchema = Joi.object({
  author: Joi.string().min(2).required(),
  quote: Joi.string().min(5).required(),
  imageUrl: Joi.string().allow("").optional(),
  category: Joi.string()
    .valid("intelepciune", "motivatie", "umor", "filosofie", "stiinta")
    .allow("")
    .optional(),
});

app.get("/", (req, res) => {
  res.send("Printing Quotes API is running...");
});

// --- RUTE API ---

app.get("/api/quotes", async (req, res) => {
  try {
    const response = await fetch(JSON_SERVER_URL);
    const data = await response.json();
    const { search, category } = req.query;

    let result = data;
    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      result = result.filter(
        (q) =>
          q.author.toLowerCase().includes(term) ||
          q.quote.toLowerCase().includes(term),
      );
    }
    // Aplicăm filtrul de categorie (dacă există și nu este "all")
    // Citatele fără categorie setată sunt excluse din filtrele specifice
    if (category && category !== "all") {
      result = result.filter((q) => q.category === category);
    }
    res.status(200).json(result);
  } catch (error) {
    console.error("Eroare la preluarea citatelor:", error.message);
    res.status(500).json({ error: "Nu s-au putut prelua citatele." });
  }
});

app.post("/api/quotes", async (req, res) => {
  const { error } = quoteSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const response = await fetch(JSON_SERVER_URL);
    const quotes = await response.json();
    const newId =
      quotes.length > 0 ? Math.max(...quotes.map((q) => Number(q.id))) + 1 : 1;
    const newQuote = { id: newId.toString(), ...req.body };

    const postResponse = await fetch(JSON_SERVER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newQuote),
    });

    const data = await postResponse.json();
    res.status(postResponse.status).json(data);
  } catch (error) {
    console.error("Error adding quote:", error);
    res.status(500).json({ error: "Failed to add quote" });
  }
});

const IMAGES_DIR = path.join(__dirname, "images");
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

app.post("/api/quotes/fetch-image", async (req, res) => {
  const { author } = req.body;
  if (!author || !author.trim()) {
    return res
      .status(400)
      .json({ error: "Numele autorului este obligatoriu." });
  }

  try {
    const wikiName = author.trim().replace(/\s+/g, "_");
    const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiName)}`;

    const wikiResponse = await fetch(wikiUrl, {
      headers: { "User-Agent": "PrintingQuotesApp/1.0" },
    });

    if (!wikiResponse.ok) {
      return res
        .status(404)
        .json({ error: `Autorul "${author}" nu a fost găsit pe Wikipedia.` });
    }

    const wikiData = await wikiResponse.json();
    if (!wikiData.thumbnail?.source) {
      return res.status(404).json({
        error: `Nu există imagine disponibilă pentru autorul "${author}" pe Wikipedia.`,
      });
    }

    const imageUrl = wikiData.thumbnail.source;
    const ext = imageUrl.split(".").pop().split("?")[0].toLowerCase();
    const fileName = `${author.trim().toLowerCase().replace(/\s+/g, "_")}.${ext}`;
    const filePath = path.join(IMAGES_DIR, fileName);

    if (fs.existsSync(filePath)) {
      console.log(`Imagine existenta returnata: ${fileName}`);
      return res.status(200).json({ imageUrl: `/images/${fileName}` });
    }

    const imgResponse = await fetch(imageUrl);
    if (!imgResponse.ok) {
      return res
        .status(500)
        .json({ error: "Nu s-a putut descărca imaginea de pe Wikipedia." });
    }
    const buffer = Buffer.from(await imgResponse.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
    console.log(`Imagine salvată: ${fileName}`);

    res.status(200).json({ imageUrl: `/images/${fileName}` });
  } catch (error) {
    console.error("Eroare la preluarea imaginii:", error.message);
    res.status(500).json({ error: "Eroare internă la preluarea imaginii." });
  }
});

// Ruta AI pentru generare citat
app.post("/api/quotes/generate-quote", async (req, res) => {
  const { author } = req.body;
  if (!author || !author.trim()) {
    return res
      .status(400)
      .json({ error: "Numele autorului este obligatoriu." });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Ești un cunoscător în literatură și filosofie. Generezi citate scurte, inspiraționale și autentice. Răspunzi DOAR cu citatul, fără ghilimele, fără numele autorului, fără explicații suplimentare. Maxim 2 propoziții.",
        },
        {
          role: "user",
          content: `Scrie un citat autentic specific lui ${author.trim()}. Dacă autorul are citate celebre cunoscute, folosește unul dintre ele. Dacă nu, generează unul în stilul și filosofia sa.`,
        },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    const generatedQuote = completion.choices[0].message.content.trim();
    res.status(200).json({ quote: generatedQuote });
  } catch (error) {
    console.error("Eroare OpenAI:", error.message);
    if (error.status === 401) {
      return res.status(500).json({ error: "Cheie API OpenAI invalidă." });
    }
    res.status(500).json({ error: "Nu s-a putut genera citatul." });
  }
});

// Ruta AI pentru info autor
app.post("/api/quotes/author-info", async (req, res) => {
  const { author } = req.body;
  if (!author || !author.trim()) {
    return res
      .status(400)
      .json({ error: "Numele autorului este obligatoriu." });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Ești un asistent concis care descrie personalități istorice. Răspunzi doar în limba română. Răspunsul conține EXACT două propoziții scurte. Menționezi: domeniul, perioada și contribuția principală. Fără introduceri, fără 'Sigur!', fără explicații extra.",
        },
        {
          role: "user",
          content: `Descrie pe ${author.trim()} în exact 2 propoziții.`,
        },
      ],
      max_tokens: 120,
      temperature: 0.5,
    });

    const info = completion.choices[0].message.content.trim();
    res.status(200).json({ info });
  } catch (error) {
    console.error("Eroare author-info:", error.message);
    res.status(500).json({ error: "Nu s-au putut prelua informațiile." });
  }
});

app.put("/api/quotes/:id", validateId, async (req, res) => {
  const { error } = quoteSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const quoteId = req.params.id;
    const updatedQuote = { id: quoteId, ...req.body };

    const response = await fetch(`${JSON_SERVER_URL}/${quoteId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedQuote),
    });

    if (!response.ok) {
      return res.status(404).json({ error: "Quote not found" });
    }

    const data = await response.json();
    const reorderedData = {
      id: data.id,
      author: data.author,
      quote: data.quote,
    };

    res.status(response.status).json(reorderedData);
  } catch (error) {
    console.error("Error updating quote:", error);
    res.status(500).json({ error: "Failed to update quote" });
  }
});

app.delete("/api/quotes/:id", validateId, async (req, res) => {
  try {
    const quoteId = req.params.id;
    const response = await fetch(`${JSON_SERVER_URL}/${quoteId}`);

    if (!response.ok) {
      return res.status(404).json({ error: "Quote not found" });
    }

    await fetch(`${JSON_SERVER_URL}/${quoteId}`, { method: "DELETE" });
    res.status(200).json({ message: "Quote deleted successfully" });
  } catch (error) {
    console.error("Eroare la stergere:", error);
    res.status(500).json({ error: "Failed to delete quote" });
  }
});

app.use("/images", express.static(path.join(__dirname, "images")));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Serving static images from: ${path.join(__dirname, "images")}`);
});
