import { Router } from "express";
import { read, update } from "../db.js";
import openai from "../utils/openai.js";

const router = Router();

router.post("/:id/ai/enrich", async (req, res) => {
  if (!openai) {
    return res.status(503).json({ error: "OPENAI_API_KEY not configured" });
  }

  try {
    const filmId = req.params.id;
    const db = read();
    const film = db.films?.find(f => f.id === filmId);

    if (!film) {
      return res.status(404).json({ error: "Film not found" });
    }

    const prompt = `
You are an AI film metadata generator. Given ONLY a filename, generate complete metadata for this movie/show.

Rules:
- Identify the film from the filename (it often contains the title, year, quality info).
- If you recognize the title, use your knowledge to fill in accurate metadata.
- If you don't recognize it, make reasonable inferences from the filename.
- For posterUrl: find a real publicly accessible poster/thumbnail image URL from TMDB, IMDb, or similar. Use the format https://image.tmdb.org/t/p/w500/... if you know the TMDB poster path, or provide any known working poster URL. If unsure, return "".
- Do NOT invent age ratings — use real ones or "Unrated".
- Output STRICT JSON only. No markdown. No explanations.

Filename: ${film.fileName || film.displayTitle || film.officialTitle || "Unknown"}

Return JSON in this exact format:
{
  "title": "",
  "year": 0,
  "description": "",
  "genres": [],
  "certification": "",
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

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
      temperature: 0.7,
    });

    const rawText = response.output_text;
    let parsed;
    try {
      // Strip markdown code fences if present
      const cleaned = rawText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("AI returned invalid JSON:", rawText);
      return res.status(500).json({ error: "AI returned invalid JSON", raw: rawText });
    }

    // Update the film with AI-generated metadata
    await update(db => {
      const f = db.films?.find(f => f.id === filmId);
      if (!f) return;

      // Set core metadata from AI
      if (parsed.title) {
        f.officialTitle = parsed.title;
        f.displayTitle = parsed.title;
      }
      if (parsed.year) f.year = parsed.year;
      if (parsed.description) f.description = parsed.description;
      if (parsed.genres?.length) f.genres = parsed.genres;
      if (parsed.certification) f.certification = parsed.certification;
      if (parsed.posterUrl) f.posterUrl = parsed.posterUrl;

      f.aiDetails = {
        generatedAt: new Date().toISOString(),
        model: "gpt-4.1-mini",
        data: parsed,
      };
    });

    res.json({ success: true, aiDetails: { generatedAt: new Date().toISOString(), model: "gpt-4.1-mini", data: parsed } });
  } catch (err) {
    console.error("AI enrichment error:", err);
    res.status(500).json({ error: err.message || "AI enrichment failed" });
  }
});

export default router;
