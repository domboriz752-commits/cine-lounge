import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { read, update } from "./db.js";
import model from "./utils/gemini.js";

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
    const files = fs.readdirSync(dir);
    return files.find(f => exts.includes(path.extname(f).toLowerCase())) || null;
  } catch { return null; }
}

// Scan storage dir for folders not yet in DB and register them
export async function scanForNewFilms() {
  if (!fs.existsSync(STORAGE_DIR)) return;

  const db = read();
  const knownIds = new Set((db.films || []).map(f => f.id));
  const folders = fs.readdirSync(STORAGE_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  const newFilms = [];

  for (const folderId of folders) {
    if (knownIds.has(folderId)) continue;

    const folderPath = path.join(STORAGE_DIR, folderId);
    const videoFile = findFileByExt(folderPath, VIDEO_EXTS);
    if (!videoFile) continue; // No video file, skip

    const videoExt = path.extname(videoFile).toLowerCase();
    const { title, year } = parseFilenameTitle(videoFile);
    const imageFile = findFileByExt(folderPath, IMAGE_EXTS);

    const film = {
      id: folderId,
      officialTitle: title,
      displayTitle: title,
      year,
      description: "",
      genres: [],
      certification: "",
      runtimeSec: 0,
      width: 0,
      height: 0,
      storagePath: `/storage/films/${folderId}/${videoFile}`,
      posterUrl: imageFile ? `/storage/films/${folderId}/${imageFile}` : "",
      posterPath: imageFile ? `/storage/films/${folderId}/${imageFile}` : "",
      fileName: videoFile,
      fileSize: 0,
      uploadedAt: new Date().toISOString(),
      aiDetails: null,
    };

    try {
      const stat = fs.statSync(path.join(folderPath, videoFile));
      film.fileSize = stat.size;
    } catch {}

    newFilms.push(film);
    console.log(`  📂 Detected new film: "${title}" (${folderId})`);
  }

  if (newFilms.length === 0) return;

  // Save all new films to DB
  await update((db) => {
    if (!db.films) db.films = [];
    db.films.push(...newFilms);
  });

  console.log(`  ✅ Registered ${newFilms.length} new film(s)`);

  // Trigger AI enrichment for each (non-blocking)
  for (const film of newFilms) {
    triggerEnrichment(film.id).catch(err =>
      console.warn(`  ⚠️  Auto-enrichment failed for ${film.id}: ${err.message}`)
    );
  }
}

async function triggerEnrichment(filmId) {
  if (!model) {
    console.log(`  ⏭️  Skipping AI enrichment for ${filmId} (no Gemini key)`);
    return;
  }

  // Call our own enrichment endpoint internally
  const port = process.env.PORT || 3001;
  try {
    const res = await fetch(`http://localhost:${port}/api/films/${filmId}/ai/enrich`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log(`  🤖 AI enrichment complete for "${data.film?.displayTitle || filmId}"`);
  } catch (err) {
    console.warn(`  ⚠️  AI enrichment request failed for ${filmId}: ${err.message}`);
  }
}

// Watch for new folders being added
export function startWatcher() {
  if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });

  console.log(`  👀 Watching for new films in ${STORAGE_DIR}`);

  // Initial scan on startup
  setTimeout(() => scanForNewFilms(), 2000);

  // Watch for changes
  let debounceTimer = null;
  fs.watch(STORAGE_DIR, { recursive: false }, (eventType, filename) => {
    // Debounce — files may be copied slowly
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => scanForNewFilms(), 5000);
  });
}
