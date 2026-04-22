const BASE_URL = "/api/quotes";

export async function getAllQuotes(search = "", category = "") {
  // Construim query string-ul dinamic
  const params = new URLSearchParams();
  if (search.trim()) params.append("search", search.trim());
  if (category && category !== "all") params.append("category", category);
  // URLSearchParams.toString() generează "search=x&category=y"
  const queryString = params.toString();
  const url = queryString ? `${BASE_URL}?${queryString}` : BASE_URL;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Nu s-au putut prelua citatele.");
  return response.json();
}

export async function addQuote(quoteData) {
  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(quoteData),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.errors?.join(", ") || "Nu s-a putut adăuga citatul.");
  }
  return response.json();
}

export async function updateQuote(id, quoteData) {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(quoteData),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(
      err.errors?.join(", ") || "Nu s-a putut actualiza citatul.",
    );
  }
  return response.json();
}

export async function deleteQuote(id) {
  const response = await fetch(`${BASE_URL}/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Nu s-a putut şterge citatul.");
}

export async function fetchAuthorImage(author) {
  const response = await fetch(
    `${BASE_URL.replace("/quotes", "")}/quotes/fetch-image`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author }),
    },
  );
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Nu s-a putut prelua imaginea.");
  }
  return response.json();
}

export async function generateQuote(author) {
  const response = await fetch(
    `${BASE_URL.replace("/quotes", "")}/quotes/generate-quote`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author }),
    },
  );
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Nu s-a putut genera citatul.");
  }
  return response.json();
}

export async function fetchAuthorInfo(author) {
  const response = await fetch(
    `${BASE_URL.replace("/quotes", "")}/quotes/author-info`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author }),
    },
  );
  if (!response.ok) {
    throw new Error("Nu s-au putut prelua informațiile despre autor.");
  }
  return response.json();
}
