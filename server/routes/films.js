import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { v4 as uuid } from "uuid";
import { read, update } from "../db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_DIR = path.join(__dirname, "..", "storage", "films");

const router = Router();

// Robust filename → clean title parser
function parseFilenameTitle(fileName) {
  if (!fileName) return "Untitled";
  let base = fileName.replace(/\.[^.]+$/, "");
  base = base.replace(/[._]+/g, " ");
  // Remove year
  base = base.replace(/[\s([\-]*((?:19|20)\d{2})[\s)\]]*(?:$|[\s\-])/i, " ");
  // Strip common tags
  const tags = /\b(1080p|720p|480p|2160p|4k|uhd|hdr|webrip|web-rip|web-dl|webdl|bluray|blu-ray|brrip|bdrip|dvdrip|hdtv|hdrip|x264|x265|h264|h265|hevc|avc|aac|ac3|dts|atmos|truehd|flac|mp3|remux|remastered|extended|unrated|directors cut|proper|repack|multi|dual|sub|subs|dubbed|eng|ita|fra|ger|spa|por|rus|hin|jpn|kor|chi|10bit|8bit|amzn|nf|hulu|dsnp|hmax|atvp|pcok|yts|rarbg|eztv|ettv|sparks|fgt|ion10|stuttershit|yify|shaanig|ganool|mkvcage|evo|tigole|qxr|ntb|ctrlhd|epsilon|drones|megusta|fleet|playar|vxt|cinemas|cinefile|joy|nogrp)\b/gi;
  base = base.replace(tags, " ");
  base = base.replace(/[\[\](){}]/g, " ").replace(/\s*-\s*/g, " ").replace(/\s+/g, " ").trim();
  return base || "Untitled";
}

// Multer config — store in temp, then move to structured folder
const upload = multer({ dest: path.join(__dirname, "..", "tmp") });

// ── List all films ──
router.get("/", (req, res) => {
  const db = read();
  res.json(db.films || []);
});

// ── Get single film ──
router.get("/:id", (req, res) => {
  const db = read();
  const film = (db.films || []).find((f) => f.id === req.params.id);
  if (!film) return res.status(404).json({ error: "Film not found" });
  res.json(film);
});

// ── Upload film (multipart: video file + optional metadata) ──
router.post("/upload", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No video file provided" });
    }

    const filmId = uuid();
    const ext = path.extname(req.file.originalname).toLowerCase() || ".mp4";
    const filmDir = path.join(STORAGE_DIR, filmId);
    if (!fs.existsSync(filmDir)) fs.mkdirSync(filmDir, { recursive: true });

    // Move uploaded file to storage
    const videoPath = path.join(filmDir, `video${ext}`);
    fs.renameSync(req.file.path, videoPath);

    const title = req.body.title || parseFilenameTitle(req.file.originalname);

    const film = {
      id: filmId,
      officialTitle: title,
      displayTitle: title,
      year: parseInt(req.body.year) || 0,
      description: req.body.description || "",
      genres: req.body.genres ? JSON.parse(req.body.genres) : [],
      certification: req.body.certification || "",
      runtimeSec: 0,
      width: 0,
      height: 0,
      storagePath: `/storage/films/${filmId}/video${ext}`,
      posterUrl: "",
      posterPath: "",
      fileName: req.file.originalname,
      fileSize: req.file.size,
      uploadedAt: new Date().toISOString(),
      aiDetails: null,
    };

    await update((db) => {
      if (!db.films) db.films = [];
      db.films.push(film);
    });

    res.json({ success: true, film });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── Upload from URL (download a file from a remote URL) ──
router.post("/upload-url", async (req, res) => {
  try {
    const { url, title, year, description, genres } = req.body;
    if (!url) return res.status(400).json({ error: "No URL provided" });

    const filmId = uuid();
    const filmDir = path.join(STORAGE_DIR, filmId);
    if (!fs.existsSync(filmDir)) fs.mkdirSync(filmDir, { recursive: true });

    // Download the file
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

    const contentType = response.headers.get("content-type") || "";
    let ext = ".mp4";
    if (contentType.includes("webm")) ext = ".webm";
    else if (contentType.includes("avi")) ext = ".avi";
    else if (contentType.includes("mkv")) ext = ".mkv";

    const videoPath = path.join(filmDir, `video${ext}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(videoPath, buffer);

    const fileName = url.split("/").pop() || "video";
    const filmTitle = title || parseFilenameTitle(fileName);

    const film = {
      id: filmId,
      officialTitle: filmTitle,
      displayTitle: filmTitle,
      year: parseInt(year) || 0,
      description: description || "",
      genres: genres || [],
      certification: "",
      runtimeSec: 0,
      width: 0,
      height: 0,
      storagePath: `/storage/films/${filmId}/video${ext}`,
      posterUrl: "",
      posterPath: "",
      fileName,
      fileSize: buffer.length,
      uploadedAt: new Date().toISOString(),
      aiDetails: null,
    };

    await update((db) => {
      if (!db.films) db.films = [];
      db.films.push(film);
    });

    res.json({ success: true, film });
  } catch (err) {
    console.error("URL upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── Delete film ──
router.delete("/:id", async (req, res) => {
  const filmId = req.params.id;
  const filmDir = path.join(STORAGE_DIR, filmId);

  await update((db) => {
    db.films = (db.films || []).filter((f) => f.id !== filmId);
    // Clean up interactions referencing this film
    for (const profileId of Object.keys(db.interactions || {})) {
      const inter = db.interactions[profileId];
      if (inter.myList) inter.myList = inter.myList.filter((f) => f !== filmId);
      if (inter.likes) inter.likes = inter.likes.filter((f) => f !== filmId);
      if (inter.dislikes) inter.dislikes = inter.dislikes.filter((f) => f !== filmId);
      if (inter.watchHistory) delete inter.watchHistory[filmId];
      if (inter.surveyResponses) delete inter.surveyResponses[filmId];
    }
  });

  // Remove storage folder
  if (fs.existsSync(filmDir)) {
    fs.rmSync(filmDir, { recursive: true, force: true });
  }

  res.json({ ok: true });
});

// ── Upload custom poster ──
const posterUpload = multer({ dest: path.join(__dirname, "..", "tmp") });
router.post("/:id/poster", posterUpload.single("poster"), async (req, res) => {
  try {
    const filmId = req.params.id;
    if (!req.file) return res.status(400).json({ error: "No image file" });

    const filmDir = path.join(STORAGE_DIR, filmId);
    if (!fs.existsSync(filmDir)) fs.mkdirSync(filmDir, { recursive: true });

    const ext = path.extname(req.file.originalname).toLowerCase() || ".jpg";
    const posterPath = path.join(filmDir, `poster${ext}`);
    fs.renameSync(req.file.path, posterPath);

    const posterUrl = `/storage/films/${filmId}/poster${ext}`;

    await update((db) => {
      const f = (db.films || []).find((x) => x.id === filmId);
      if (f) {
        f.posterUrl = posterUrl;
        f.posterPath = posterUrl;
      }
    });

    res.json({ success: true, posterUrl });
  } catch (err) {
    console.error("Poster upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
