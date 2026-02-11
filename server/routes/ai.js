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
You are generating metadata for a locally uploaded video file.

Rules:
- Do NOT claim you watched the film.
- You are allowed to infer likely metadata from the filename.
- Do NOT invent official age ratings. If unknown, return "Unrated".
- Output STRICT JSON only. No markdown. No explanations. No code fences.
- Keep title exactly as provided.
- posterUrl must be a direct, publicly accessible image URL (ideally TMDB w500). If unsure, return "".

Title (from filename): ${derivedTitle}
Original filename: ${film.fileName || ""}

Return JSON in this exact format:
{
  "title": "${derivedTitle}",
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

      f.officialTitle = derivedTitle;
      f.displayTitle = derivedTitle;

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
