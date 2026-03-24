// Brave Search API — BRAVE_SEARCH_API_KEY must be set in Vercel env vars
// Key is stored locally at ~/.openclaw/.env as BRAVE_API_KEY

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const query = req.query.q || req.body?.query;
  if (!query) return res.status(400).json({ error: "Missing query" });

  const BRAVE_KEY = process.env.BRAVE_SEARCH_API_KEY;

  try {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5&country=AU&search_lang=en`;
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": BRAVE_KEY,
      }
    });
    const data = await response.json();

    // Return clean summarised results for George to speak
    const results = (data.web?.results || []).slice(0, 5).map(r => ({
      title: r.title,
      snippet: r.description,
      url: r.url,
    }));

    return res.status(200).json({
      query,
      results,
      summary: results.map((r, i) => `${i+1}. ${r.title}: ${r.snippet}`).join(" | ")
    });
  } catch (err) {
    return res.status(500).json({ error: "Search failed", detail: err.message });
  }
}
