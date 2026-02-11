import { Router } from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { read, update } from "../db.js";
import model from "../utils/gemini.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_DIR = path.join(__dirname, "..", "storage", "films");

const router = Router();

function filenameToTitle(name = "") {
  const base = name.replace(/\.[^.]+$/, "");
  return base
    .replace(/[._]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function downloadPoster(url, filmDir) {
  try {
    if (!url || !url.startsWith("http")) return null;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get("content-type") || "";
    let ext = ".jpg";
    if (contentType.includes("png")) ext = ".png";
    else if (contentType.includes("webp")) ext = ".webp";
    const posterPath = path.join(filmDir, `poster${ext}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(posterPath, buffer);
    console.log(`  🖼️  Poster saved: ${posterPath}`);
    return `/storage/films/${path.basename(filmDir)}/poster${ext}`;
  } catch (err) {
    console.warn(`  ⚠️  Poster download failed: ${err.message}`);
    return null;
  }
}

function saveMetaJson(filmDir, aiData) {
  const metaPath = path.join(filmDir, "meta.json");
  fs.writeFileSync(metaPath, JSON.stringify(aiData, null, 2));
  console.log(`  📄 meta.json saved: ${metaPath}`);
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

    // Retry logic for transient errors (503, rate limits, etc.)
    let rawText;
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 5000;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        rawText = response.text();
        break;
      } catch (retryErr) {
        const status = retryErr.status || retryErr.httpStatusCode || 0;
        const isRetryable = status === 503 || status === 429 || status === 500;
        if (isRetryable && attempt < MAX_RETRIES) {
          console.warn(`⚠️  Gemini attempt ${attempt}/${MAX_RETRIES} failed (${status}), retrying in ${RETRY_DELAY_MS / 1000}s...`);
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        } else {
          throw retryErr;
        }
      }
    }
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

    // Ensure film storage directory exists
    const filmDir = path.join(STORAGE_DIR, filmId);
    if (!fs.existsSync(filmDir)) fs.mkdirSync(filmDir, { recursive: true });

    // Download poster to film folder
    let localPosterPath = null;
    if (parsed.posterUrl) {
      localPosterPath = await downloadPoster(parsed.posterUrl, filmDir);
    }

    // Save meta.json with full AI response
    const metaPayload = {
      generatedAt,
      model: "gemini-2.0-flash",
      data: parsed,
    };
    saveMetaJson(filmDir, metaPayload);

    await update((db2) => {
      const f = db2.films?.find((x) => x.id === filmId);
      if (!f) return;

      const cleanTitle = (typeof parsed.title === "string" && parsed.title.trim()) ? parsed.title.trim() : derivedTitle;
      f.officialTitle = cleanTitle;
      f.displayTitle = cleanTitle;

      if (typeof parsed.year === "number" && parsed.year > 0) f.year = parsed.year;
      if (typeof parsed.description === "string") f.description = parsed.description;
      if (Array.isArray(parsed.genres)) f.genres = parsed.genres;
      if (typeof parsed.certification === "string") f.certification = parsed.certification;

      // Use local poster path if downloaded, otherwise keep remote URL
      if (localPosterPath) {
        f.posterPath = localPosterPath;
        f.posterUrl = localPosterPath;
      } else if (typeof parsed.posterUrl === "string") {
        f.posterUrl = parsed.posterUrl;
      }

      f.aiDetails = metaPayload;
    });

    // Read updated film
    const updatedDb = read();
    const updatedFilm = updatedDb.films?.find((x) => x.id === filmId);

    res.json({
      success: true,
      film: updatedFilm || null,
      aiDetails: metaPayload,
      posterSaved: !!localPosterPath,
    });
  } catch (err) {
    console.error("AI enrichment error:", err);
    res.status(500).json({ error: err?.message || "AI enrichment failed" });
  }
});

export default router;
