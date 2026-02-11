import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuid } from "uuid";
import { read, update } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_DIR = path.join(__dirname, "storage", "films");
const VIDEO_EXTS = [".mp4", ".mkv", ".avi", ".webm", ".mov", ".wmv", ".flv", ".m4v", ".ts"];
const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"];

function parseFilenameTitle(fileName) {
  if (!fileName) return { title: "Untitled", year: 0 };
  let base = fileName.replace(/\.[^.]+$/, "");
  base = base.replace(/[._]+/g, " ");
  let year = 0;
  const yearMatch = base.match(/[\s([\-]*((?:19|20)\d{2})[\s)\]]*(?:$|[\s\-])/i);
  if (yearMatch) {
    year = parseInt(yearMatch[1]);
    base = base.replace(yearMatch[0], " ");
  }
  const tags = /\b(1080p|720p|480p|2160p|4k|uhd|hdr|webrip|web-rip|web-dl|webdl|bluray|blu-ray|brrip|bdrip|dvdrip|hdtv|hdrip|x264|x265|h264|h265|hevc|avc|aac|ac3|dts|atmos|truehd|flac|mp3|remux|remastered|extended|unrated|directors cut|proper|repack|multi|dual|sub|subs|dubbed|eng|ita|fra|ger|spa|por|rus|hin|jpn|kor|chi|10bit|8bit|amzn|nf|hulu|dsnp|hmax|atvp|pcok|yts|rarbg|eztv|ettv|sparks|fgt|ion10|stuttershit|yify|shaanig|ganool|mkvcage|evo|tigole|qxr|ntb|ctrlhd|epsilon|drones|megusta|fleet|playar|vxt|cinemas|cinefile|joy|nogrp)\b/gi;
  base = base.replace(tags, " ");
  base = base.replace(/[\[\](){}]/g, " ").replace(/\s*-\s*/g, " ").replace(/\s+/g, " ").trim();
  return { title: base || "Untitled", year };
}

function findFileByExt(dir, exts) {
  try {
    return fs.readdirSync(dir).find(f => exts.includes(path.extname(f).toLowerCase())) || null;
  } catch { return null; }
}

// Scan storage dir for new films — handles both:
// 1. Loose video files dropped directly into storage/films/
// 2. Subfolders that contain video files but aren't in the DB
export async function scanForNewFilms({ enrich = false } = {}) {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
    console.log("  📁 Created storage directory");
    return [];
  }

  const db = read();
  const knownIds = new Set((db.films || []).map(f => f.id));
  // Also track known storage paths to avoid re-adding moved files
  const knownPaths = new Set((db.films || []).map(f => f.storagePath).filter(Boolean));

  const entries = fs.readdirSync(STORAGE_DIR, { withFileTypes: true });
  const newFilms = [];

  // 1) Loose video files — create a folder and move them in
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!VIDEO_EXTS.includes(ext)) continue;

    const filmId = uuid();
    const filmDir = path.join(STORAGE_DIR, filmId);
    fs.mkdirSync(filmDir, { recursive: true });

    const src = path.join(STORAGE_DIR, entry.name);
    const dest = path.join(filmDir, entry.name);
    fs.renameSync(src, dest);

    const { title, year } = parseFilenameTitle(entry.name);
    const stat = fs.statSync(dest);

    const film = {
      id: filmId,
      officialTitle: title,
      displayTitle: title,
      year,
      description: "",
      genres: [],
      certification: "",
      runtimeSec: 0,
      width: 0,
      height: 0,
      storagePath: `/storage/films/${filmId}/${entry.name}`,
      posterUrl: "",
      posterPath: "",
      fileName: entry.name,
      fileSize: stat.size,
      uploadedAt: new Date().toISOString(),
      aiDetails: null,
    };

    newFilms.push(film);
    console.log(`  📂 Loose file → folder: "${title}" (${filmId})`);
  }

  // 2) Subfolders with video files not yet in DB
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (knownIds.has(entry.name)) continue;

    const folderPath = path.join(STORAGE_DIR, entry.name);
    const videoFile = findFileByExt(folderPath, VIDEO_EXTS);
    if (!videoFile) continue;

    const storagePath = `/storage/films/${entry.name}/${videoFile}`;
    if (knownPaths.has(storagePath)) continue;

    const { title, year } = parseFilenameTitle(videoFile);
    const imageFile = findFileByExt(folderPath, IMAGE_EXTS);
    let fileSize = 0;
    try { fileSize = fs.statSync(path.join(folderPath, videoFile)).size; } catch {}

    const film = {
      id: entry.name,
      officialTitle: title,
      displayTitle: title,
      year,
      description: "",
      genres: [],
      certification: "",
      runtimeSec: 0,
      width: 0,
      height: 0,
      storagePath,
      posterUrl: imageFile ? `/storage/films/${entry.name}/${imageFile}` : "",
      posterPath: imageFile ? `/storage/films/${entry.name}/${imageFile}` : "",
      fileName: videoFile,
      fileSize,
      uploadedAt: new Date().toISOString(),
      aiDetails: null,
    };

    newFilms.push(film);
    console.log(`  📂 Detected folder: "${title}" (${entry.name})`);
  }

  if (newFilms.length === 0) {
    console.log("  ✅ No new films found");
    return [];
  }

  // Save to DB
  await update((db) => {
    if (!db.films) db.films = [];
    db.films.push(...newFilms);
  });

  console.log(`  ✅ Registered ${newFilms.length} new film(s)`);

  // Trigger AI enrichment if requested
  if (enrich) {
    for (const film of newFilms) {
      await triggerEnrichment(film.id);
    }
  }

  return newFilms;
}

async function triggerEnrichment(filmId) {
  const port = process.env.PORT || 3001;
  try {
    console.log(`  🤖 Enriching ${filmId}...`);
    const res = await fetch(`http://localhost:${port}/api/films/${filmId}/ai/enrich`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log(`  ✅ Enriched: "${data.film?.displayTitle || filmId}"`);
  } catch (err) {
    console.warn(`  ⚠️  Enrichment failed for ${filmId}: ${err.message}`);
  }
}
