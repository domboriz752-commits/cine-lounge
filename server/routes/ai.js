import { Router } from "express";
import { read, update } from "../db.js";
import model from "../utils/gemini.js";

const router = Router();

function filenameToTitle(name = "") {
  const base = name.replace(/\.[^.]+$/, "");
  return base
    .replace(/[._]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

router.post("/:id/ai/enrich", async (req, res) => {
  if (!model) {
    return res.status(503).json({ error: "GEMINI_API_KEY not configured" });
  }

  try {
    const filmId = req.params.id;
    const db = read();
    const film = db.films?.find((f) => f.id === filmId);

    if (!film) {
      return res.status(404).json({ error: "Film not found" });
    }

    const derivedTitle = filenameToTitle(film.fileName || film.displayTitle || film.officialTitle || "Untitled");

    const prompt = `
You are a film metadata expert. Given a filename, identify the movie and return accurate metadata.

RULES:
- Output STRICT JSON only. No markdown, no code fences, no explanations.
- "title" must be the CLEAN, official English title of the movie (no year, no resolution, no file extensions, no dots/underscores). Example: filename "The.Dark.Knight.2008.1080p.mkv" → title "The Dark Knight".
- "year" must be the actual release year of the identified movie. If unknown, use 0.
- "posterUrl" must be a WORKING image URL. Use the TMDB image CDN format: https://image.tmdb.org/t/p/w500/<poster_path>. If you know the movie's TMDB poster path, include it. If unsure, return "".
- "description" should be a real 1-2 sentence synopsis of the movie.
- "genres" should be the real genres of the movie.
- "certification" should be the MPAA rating (G, PG, PG-13, R, NC-17) or "Unrated" if unknown.
- Do NOT invent data. If you're not confident about a field, leave it empty/default.

Filename: ${film.fileName || ""}
Cleaned title guess: ${derivedTitle}

Return JSON in this exact format:
{
  "title": "",
  "year": 0,
  "description": "",
  "genres": [],
  "certification": "Unrated",
  "posterUrl": "",
  "logline": "",
  "shortSummary": "",
  "themes": [],
  "moodTags": [],
  "contentWarnings": [],
  "recommendedAudience": "",
  "similarTitles": [{"title":"","reason":""}],
  "discussionQuestions": [],
  "watchAdvice": {"pace":"","bestTime":"","withWho":""},
  "confidence": 0.0
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const rawText = response.text();
    console.log("🤖 Gemini raw response:\n", rawText);

    let parsed;
    try {
      const cleaned = rawText
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Gemini returned invalid JSON:", rawText);
      return res.status(500).json({ error: "Gemini returned invalid JSON", raw: rawText });
    }

    const generatedAt = new Date().toISOString();

    await update((db2) => {
      const f = db2.films?.find((x) => x.id === filmId);
      if (!f) return;

      // Use AI-cleaned title if available, fallback to derived
      const cleanTitle = (typeof parsed.title === "string" && parsed.title.trim()) ? parsed.title.trim() : derivedTitle;
      f.officialTitle = cleanTitle;
      f.displayTitle = cleanTitle;

      if (typeof parsed.year === "number" && parsed.year > 0) f.year = parsed.year;
      if (typeof parsed.description === "string") f.description = parsed.description;
      if (Array.isArray(parsed.genres)) f.genres = parsed.genres;
      if (typeof parsed.certification === "string") f.certification = parsed.certification;
      if (typeof parsed.posterUrl === "string") f.posterUrl = parsed.posterUrl;

      f.aiDetails = {
        generatedAt,
        model: "gemini-2.0-flash",
        data: parsed,
      };
    });

    res.json({
      success: true,
      aiDetails: {
        generatedAt,
        model: "gemini-2.0-flash",
        data: parsed,
      },
    });
  } catch (err) {
    console.error("AI enrichment error:", err);
    res.status(500).json({ error: err?.message || "AI enrichment failed" });
  }
});

export default router;
