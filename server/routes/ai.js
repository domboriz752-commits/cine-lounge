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
You are generating AI enrichment for a movie.

Rules:
- Do NOT claim you watched the film.
- Base output only on the metadata provided.
- Do NOT invent official age ratings.
- Output STRICT JSON only.
- No markdown. No explanations.

Metadata:
Title: ${film.displayTitle || film.officialTitle || film.title || "Unknown"}
Year: ${film.year || "Unknown"}
Genres: ${(film.genres || []).join(", ") || "Unknown"}
Description: ${film.description || "None"}
Runtime (minutes): ${Math.round((film.runtimeSec || film.runtime || 0) / 60)}

Return JSON in this exact format:
{
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
      parsed = JSON.parse(rawText);
    } catch {
      console.error("AI returned invalid JSON:", rawText);
      return res.status(500).json({ error: "AI returned invalid JSON", raw: rawText });
    }

    const aiDetails = {
      generatedAt: new Date().toISOString(),
      model: "gpt-4.1-mini",
      data: parsed,
    };

    await update(db => {
      const f = db.films?.find(f => f.id === filmId);
      if (f) f.aiDetails = aiDetails;
    });

    res.json({ success: true, aiDetails });
  } catch (err) {
    console.error("AI enrichment error:", err);
    res.status(500).json({ error: err.message || "AI enrichment failed" });
  }
});

export default router;
