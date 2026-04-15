const express = require('express');
const cors = require('cors');
const Joi = require("joi");
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const JSON_SERVER_URL = "http://localhost:3000/quotes";

// Middleware: verificăm dacă id-ul din PUT și DELETE este un număr valid
const validateId = (req, res, next) => {
    if (isNaN(req.params.id)) {
        return res.status(400).json({ error: "Invalid ID format" });
    }
    next();
};

// Schema Joi pentru validarea citatelor (body validation)
const quoteSchema = Joi.object({
    author: Joi.string().min(2).required(),
    quote: Joi.string().min(5).required(),
    imageUrl: Joi.string().allow("").optional(), // [cite: 140]
});
// API route placeholder
app.get("/", (req, res) => {
    res.send("Printing Quotes API is running...");
});

// --- RUTE API ---

// Extragem citatele cu functionalitate de căutare
app.get("/api/quotes", async (req, res) => {
    try {
        const response = await fetch(JSON_SERVER_URL);
        const data = await response.json();
        
        const { search } = req.query; 

        if (search && search.trim()) {
            const term = search.trim().toLowerCase();
            const filtered = data.filter(q =>
                q.author.toLowerCase().includes(term) ||
                q.quote.toLowerCase().includes(term)
            );
            return res.status(200).json(filtered);
        }

        res.status(200).json(data);
    } catch (error) {
        console.error("Eroare la preluarea citatelor:", error);
        res.status(500).json({ error: "Nu s-au putut prelua citatele" });
    }
});

// 2. Adaugă un nou citat (cu validare Joi)
app.post("/api/quotes", async (req, res) => {
    const { error } = quoteSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    try {
        const response = await fetch(JSON_SERVER_URL);
        const quotes = await response.json();

        // generăm un ID numeric
        const newId = quotes.length > 0 ? Math.max(...quotes.map(q => Number(q.id))) + 1 : 1;
        const newQuote = { id: newId.toString(), ...req.body };

        // trimite la json-server
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

// Configurare director imagini [cite: 48, 49]
const IMAGES_DIR = path.join(__dirname, "images");
if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true }); // [cite: 54]
}

// Ruta pentru preluarea imaginii de pe Wikipedia [cite: 64]
app.post("/api/quotes/fetch-image", async (req, res) => {
    const { author } = req.body;
    if (!author || !author.trim()) {
        return res.status(400).json({ error: "Numele autorului este obligatoriu." }); // [cite: 66, 67]
    }

    try {
        const wikiName = author.trim().replace(/\s+/g, "_"); // [cite: 74]
        const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiName)}`; // [cite: 78]

        const wikiResponse = await fetch(wikiUrl, {
            headers: { "User-Agent": "PrintingQuotesApp/1.0" } // [cite: 85]
        });

        if (!wikiResponse.ok) {
            return res.status(404).json({ error: `Autorul "${author}" nu a fost găsit pe Wikipedia.` }); // [cite: 90]
        }

        const wikiData = await wikiResponse.json();
        if (!wikiData.thumbnail?.source) {
            return res.status(404).json({ error: `Nu există imagine disponibilă pentru autorul "${author}". pe Wikipedia.` }); // [cite: 98]
        }

        const imageUrl = wikiData.thumbnail.source;
        const ext = imageUrl.split(".").pop().split("?")[0].toLowerCase(); // [cite: 103]
        const fileName = `${author.trim().toLowerCase().replace(/\s+/g, "_")}.${ext}`; // [cite: 106, 107]
        const filePath = path.join(IMAGES_DIR, fileName);

        // Verificăm dacă imaginea există deja local [cite: 111]
        if (fs.existsSync(filePath)) {
            console.log('Imagine existenta returnata: ${fileName}'); // [cite: 112]
            return res.status(200).json({ imageUrl: `/images/${fileName}` }); // [cite: 114]
        }

        // Descărcăm și salvăm imaginea [cite: 115, 116]
        const imgResponse = await fetch(imageUrl);
        if (!imgResponse.ok) {
            return res.status(500).json({ error: "Nu s-a putut descărca imaginea de pe Wikipedia." }); // [cite: 118]
        }
        const buffer = Buffer.from(await imgResponse.arrayBuffer()); // [cite: 125]
        fs.writeFileSync(filePath, buffer); // [cite: 126]
        console.log(`Imagine salvată: ${fileName}`); // [cite: 127]

        res.status(200).json({ imageUrl: `/images/${fileName}` }); // [cite: 129]
    } catch (error) {
        console.error("Eroare la preluarea imaginii:", error.message);
        res.status(500).json({ error: "Eroare internă la preluarea imaginii." }); // [cite: 132]
    }
});

// 3. Actualizăm un citat (cu validare ID și Joi body)
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

        // verificăm dacă există citatul
        if (!response.ok) {
            return res.status(404).json({ error: "Quote not found" });
        }

        const data = await response.json();
        const reorderedData = { id: data.id, author: data.author, quote: data.quote };

        res.status(response.status).json(reorderedData);
    } catch (error) {
        console.error("Error updating quote:", error);
        res.status(500).json({ error: "Failed to update quote" });
    }
});

// 4. Ștergem un citat (cu validare ID)
app.delete("/api/quotes/:id", validateId, async (req, res) => {
    try {
        const quoteId = req.params.id;
        const response = await fetch(`${JSON_SERVER_URL}/${quoteId}`);
        
        // verificăm dacă există citatul înainte de ștergere
        if (!response.ok) {
            return res.status(404).json({ error: "Quote not found" });
        }

        await fetch(`${JSON_SERVER_URL}/${quoteId}`, { method: "DELETE" });
        res.status(200).json({ message: "Quote deleted successfully" });
    } catch (error) {
        next(error);
    }
});
// // Adauga un nou citat 
// app.post("/api/quotes", async (req, res) => {
//     try {
//         const response = await fetch(JSON_SERVER_URL);
//         const quotes = await response.json();

//         // generam un ID numeric (urmatorul numar disponibil)
//         const newId = quotes.length > 0 ? Math.max(...quotes.map(q => Number(q.id))) + 1 : 1;

//         const newQuote = { id: newId.toString(), ...req.body }; // convertim ID-ul in sir pentru a se potrivi cu formatul db.json

//         // trimite la json-server
//         const postResponse = await fetch(JSON_SERVER_URL, {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify(newQuote),
//         });

//         const data = await postResponse.json();
//         res.status(postResponse.status).json(data);
//     } catch (error) {
//         console.error("Error adding quote:", error);
//         res.status(500).json({ error: "Failed to add quote" });
//     }
// });

// Actualizam un citat
// app.put("/api/quotes/:id", async (req, res) => {
//     try {
//         const quoteId = req.params.id;

//         // construiti obiectul actualizat, asigurandu-va ca `id` este prima cheie
//         const updatedQuote = { id: quoteId, ...req.body };

//         const response = await fetch(`${JSON_SERVER_URL}/${quoteId}`, {
//             method: "PUT",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify(updatedQuote),
//         });

//         const data = await response.json();

//         // creati un nou obiect cu `id` ca prima cheie
//         const reorderedData = { id: data.id, author: data.author, quote: data.quote };

//         res.status(response.status).json(reorderedData);
//     } catch (error) {
//         console.error("Error updating quote:", error);
//         res.status(500).json({ error: "Failed to update quote" });
//     }
// });

// Stergem un citat
// app.delete("/api/quotes/:id", async (req, res) => {
//     try {
//         const response = await fetch(`${JSON_SERVER_URL}/${req.params.id}`, {
//             method: "DELETE",
//         });

//         if (response.ok) {
//             res.status(200).json({ message: "Quote deleted" });
//         } else {
//             res.status(response.status).json({ error: "Failed to delete quote" });
//         }
//     } catch (error) {
//         console.error("Error deleting quote:", error);
//         res.status(500).json({ error: "Failed to delete quote" });
//     }
// });

app.use("/images", express.static(path.join(__dirname, 'images')));

// app.get("/", (req, res) => {
//     res.json({ message: "Printing Quates API is running...",endpoints: {
//         quotes: "/api/quotes",
//         health: "/api/health"
//     }});
// });

// DATE INIȚIALE (stocate în memorie). În producție, acestea vor fi
// stocate într-o bază de date

// let quotes = [
//   { id: 1, author: "Socrates", quote: "The only true wisdom is in knowing you know nothing." },
//   { id: 2, author: "Albert Einstein", quote: "Life is like riding a bicycle. To keep your balance you must keep moving." }
// ];

// GET /api/quotes - Returnează lista completă a citatelor. Statusul 200
// (OK) este implicit, dar îl adaugam ca bune practici

// app.get("/api/quotes", (req, res) => {
//   res.status(200).json(quotes);
// });

// POST /api/quotes - Adaugă un citat nou trimis în corpul cererii
// (req.body). Clientul trebuie să trimită: { "author": "...", "quote": "..."
// }. Răspundem cu statusul 201 (Created) și obiectul nou creat.

// app.post("/api/quotes", (req, res) => {
//   const { author, quote } = req.body;
//   const newQuote = {
//     id: quotes.length + 1, // Generăm un ID unic
//     author,
//     quote
//   };
//   quotes.push(newQuote);
//   res.status(201).json(newQuote);
// });

// PUT /api/quotes/:id - Actualizează citatul cu ID-ul specificat in URL.
// `:id` este un parametru dinamic, accesibil prin req.params.id.

// app.put("/api/quotes/:id", (req, res) => {
//   const id = parseInt(req.params.id);
//   const { author, quote } = req.body;

//   const index = quotes.findIndex(q => q.id === id);

//   if (index === -1) {
//     // 404 Not Found - citatul cu ID-ul respectiv nu există
//     return res.status(404).json({ message: "Citatul nu a fost găsit." });
//   }

//   // Actualizăm intrarea păstrând ID-ul neschimbat
//   quotes[index] = { id, author, quote };
//   res.status(200).json(quotes[index]);
// });
// DELETE /api/quotes/:id - Șterge citatul cu ID-ul specificat din array;
// splice() elimină elementul direct din memorie.

// app.delete("/api/quotes/:id", (req, res) => {
//   const id = parseInt(req.params.id);
//   const index = quotes.findIndex(q => q.id === id);

//   if (index === -1) {
//     return res.status(404).json({ message: "Citatul nu a fost găsit." });
//   }

//   quotes.splice(index, 1);
//   res.status(200).json({ message: "Citatul a fost șters cu succes." });
// });

// Limitare - Datele sunt stocate exclusiv în memorie. La fiecare
// repornire a serverului, modificările se pierd și lista revine la valorile
// inițiale. Într-o aplicație reală, se folosește o bază de date (MongoDB,
// PostgreSQL etc.) pentru persistență.


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Serving static images from: ${path.join(__dirname, "images")}`);
});
// Verificăm repornirea automată a serverului
console.log("Server restarted!");