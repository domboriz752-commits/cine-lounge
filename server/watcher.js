import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuid } from "uuid";
import { read, update } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_DIR = path.join(__dirname, "storage", "films");
const VIDEO_EXTS = [".mp4", ".mkv", ".avi", ".webm", ".mov", ".wmv", ".flv", ".m4v", ".ts"];
const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"];

// Detect S01E01 / S1E1 / S01.E01 patterns
const EPISODE_RE = /[.\s_-]*S(\d{1,2})[.\s_-]*E(\d{1,3})/i;

function parseFilenameTitle(fileName) {
  if (!fileName) return { title: "Untitled", year: 0, season: 0, episode: 0 };
  let base = fileName.replace(/\.[^.]+$/, "");
  base = base.replace(/[._]+/g, " ");

  // Extract episode info BEFORE stripping
  let season = 0, episode = 0;
  const epMatch = base.match(EPISODE_RE);
  if (epMatch) {
    season = parseInt(epMatch[1]);
    episode = parseInt(epMatch[2]);
    // Remove episode tag and everything after it for the series title
    base = base.substring(0, epMatch.index);
  }

  let year = 0;
  const yearMatch = base.match(/[\s([\-]*((?:19|20)\d{2})[\s)\]]*(?:$|[\s\-])/i);
  if (yearMatch) {
    year = parseInt(yearMatch[1]);
    base = base.replace(yearMatch[0], " ");
  }

  const tags = /\b(1080p|720p|480p|2160p|4k|uhd|hdr|webrip|web-rip|web-dl|webdl|bluray|blu-ray|brrip|bdrip|dvdrip|hdtv|hdrip|x264|x265|h264|h265|hevc|avc|aac|ac3|dts|atmos|truehd|flac|mp3|remux|remastered|extended|unrated|directors cut|proper|repack|multi|dual|sub|subs|dubbed|eng|ita|fra|ger|spa|por|rus|hin|jpn|kor|chi|10bit|8bit|amzn|nf|hulu|dsnp|hmax|atvp|pcok|yts|rarbg|eztv|ettv|sparks|fgt|ion10|stuttershit|yify|shaanig|ganool|mkvcage|evo|tigole|qxr|ntb|ctrlhd|epsilon|drones|megusta|fleet|playar|vxt|cinemas|cinefile|joy|nogrp)\b/gi;
  base = base.replace(tags, " ");
  base = base.replace(/[\[\](){}]/g, " ").replace(/\s*-\s*/g, " ").replace(/\s+/g, " ").trim();
  return { title: base || "Untitled", year, season, episode };
}

function findFileByExt(dir, exts) {
  try {
    return fs.readdirSync(dir).find(f => exts.includes(path.extname(f).toLowerCase())) || null;
  } catch { return null; }
}

function findAllVideoFiles(dir) {
  try {
    return fs.readdirSync(dir).filter(f => VIDEO_EXTS.includes(path.extname(f).toLowerCase()));
  } catch { return []; }
}

// Normalize series title for matching (lowercase, no extra spaces)
function normalizeSeriesKey(title) {
  return title.toLowerCase().replace(/\s+/g, " ").trim();
}

export async function scanForNewFilms({ enrich = false } = {}) {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
    console.log("  📁 Created storage directory");
    return [];
  }

  const db = read();
  const knownIds = new Set((db.films || []).map(f => f.id));
  const knownPaths = new Set((db.films || []).map(f => f.storagePath).filter(Boolean));
  // Also collect all known episode storage paths
  for (const f of (db.films || [])) {
    if (f.episodes) {
      for (const ep of f.episodes) {
        if (ep.storagePath) knownPaths.add(ep.storagePath);
      }
    }
  }

  const entries = fs.readdirSync(STORAGE_DIR, { withFileTypes: true });
  const newFilms = [];
  // Track series we're building: normalizedTitle -> film object
  const seriesMap = new Map();

  // Pre-load existing series from DB for appending episodes
  for (const f of (db.films || [])) {
    if (f.isSeries) {
      const key = normalizeSeriesKey(f.displayTitle || f.officialTitle || "");
      if (key) seriesMap.set(key, f);
    }
  }

  // 1) Loose video files — detect if episode or standalone
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!VIDEO_EXTS.includes(ext)) continue;

    const { title, year, season, episode } = parseFilenameTitle(entry.name);
    const isEpisode = season > 0 && episode > 0;
    const seriesKey = isEpisode ? normalizeSeriesKey(title) : null;

    if (isEpisode && seriesKey) {
      // Handle as episode of a series
      let series = seriesMap.get(seriesKey);
      if (!series) {
        // Create new series entry
        const seriesId = uuid();
        const seriesDir = path.join(STORAGE_DIR, seriesId);
        fs.mkdirSync(seriesDir, { recursive: true });
        const episodesDir = path.join(seriesDir, "Episodes");
        fs.mkdirSync(episodesDir, { recursive: true });

        series = {
          id: seriesId,
          isSeries: true,
          officialTitle: title,
          displayTitle: title,
          year,
          description: "",
          genres: [],
          certification: "",
          runtimeSec: 0,
          width: 0,
          height: 0,
          storagePath: "",
          posterUrl: "",
          posterPath: "",
          fileName: entry.name,
          fileSize: 0,
          uploadedAt: new Date().toISOString(),
          aiDetails: null,
          episodes: [],
        };
        seriesMap.set(seriesKey, series);
        newFilms.push(series);
        console.log(`  📺 New series detected: "${title}" (${seriesId})`);
      }

      // Move file into Episodes folder
      const src = path.join(STORAGE_DIR, entry.name);
      const episodesDir = path.join(STORAGE_DIR, series.id, "Episodes");
      if (!fs.existsSync(episodesDir)) fs.mkdirSync(episodesDir, { recursive: true });
      const dest = path.join(episodesDir, entry.name);
      const epStoragePath = `/storage/films/${series.id}/Episodes/${entry.name}`;

      if (knownPaths.has(epStoragePath)) continue; // already registered

      fs.renameSync(src, dest);
      const stat = fs.statSync(dest);

      const epId = uuid();
      series.episodes.push({
        id: epId,
        season,
        episode,
        fileName: entry.name,
        storagePath: epStoragePath,
        fileSize: stat.size,
      });
      series.fileSize = (series.fileSize || 0) + stat.size;

      console.log(`  📺 Episode S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")} added to "${title}"`);
    } else {
      // Regular standalone film
      const filmId = uuid();
      const filmDir = path.join(STORAGE_DIR, filmId);
      fs.mkdirSync(filmDir, { recursive: true });

      const src = path.join(STORAGE_DIR, entry.name);
      const dest = path.join(filmDir, entry.name);
      fs.renameSync(src, dest);

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
  }

  // 2) Subfolders with video files not yet in DB
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (knownIds.has(entry.name)) continue;

    const folderPath = path.join(STORAGE_DIR, entry.name);

    // Check if folder has an Episodes subfolder with videos
    const episodesDir = path.join(folderPath, "Episodes");
    if (fs.existsSync(episodesDir) && fs.statSync(episodesDir).isDirectory()) {
      const videoFiles = findAllVideoFiles(episodesDir);
      if (videoFiles.length > 0) {
        // Parse first file to get series title
        const { title, year } = parseFilenameTitle(videoFiles[0]);
        const imageFile = findFileByExt(folderPath, IMAGE_EXTS);

        const episodes = [];
        let totalSize = 0;
        for (const vf of videoFiles) {
          const parsed = parseFilenameTitle(vf);
          let fSize = 0;
          try { fSize = fs.statSync(path.join(episodesDir, vf)).size; } catch {}
          totalSize += fSize;
          episodes.push({
            id: uuid(),
            season: parsed.season || 1,
            episode: parsed.episode || episodes.length + 1,
            fileName: vf,
            storagePath: `/storage/films/${entry.name}/Episodes/${vf}`,
            fileSize: fSize,
          });
        }
        // Sort episodes
        episodes.sort((a, b) => a.season - b.season || a.episode - b.episode);

        const film = {
          id: entry.name,
          isSeries: true,
          officialTitle: title,
          displayTitle: title,
          year,
          description: "",
          genres: [],
          certification: "",
          runtimeSec: 0,
          width: 0,
          height: 0,
          storagePath: "",
          posterUrl: imageFile ? `/storage/films/${entry.name}/${imageFile}` : "",
          posterPath: imageFile ? `/storage/films/${entry.name}/${imageFile}` : "",
          fileName: videoFiles[0],
          fileSize: totalSize,
          uploadedAt: new Date().toISOString(),
          aiDetails: null,
          episodes,
        };
        newFilms.push(film);
        console.log(`  📺 Detected series folder: "${title}" with ${episodes.length} episodes (${entry.name})`);
        continue;
      }
    }

    // Regular folder with a single video
    const videoFile = findFileByExt(folderPath, VIDEO_EXTS);
    if (!videoFile) continue;

    const storagePath = `/storage/films/${entry.name}/${videoFile}`;
    if (knownPaths.has(storagePath)) continue;

    const { title, year, season, episode: epNum } = parseFilenameTitle(videoFile);
    const imageFile = findFileByExt(folderPath, IMAGE_EXTS);
    let fileSize = 0;
    try { fileSize = fs.statSync(path.join(folderPath, videoFile)).size; } catch {}

    // If the single video is an episode, still create as series
    if (season > 0 && epNum > 0) {
      const epId = uuid();
      const film = {
        id: entry.name,
        isSeries: true,
        officialTitle: title,
        displayTitle: title,
        year,
        description: "",
        genres: [],
        certification: "",
        runtimeSec: 0,
        width: 0,
        height: 0,
        storagePath: "",
        posterUrl: imageFile ? `/storage/films/${entry.name}/${imageFile}` : "",
        posterPath: imageFile ? `/storage/films/${entry.name}/${imageFile}` : "",
        fileName: videoFile,
        fileSize,
        uploadedAt: new Date().toISOString(),
        aiDetails: null,
        episodes: [{
          id: epId,
          season,
          episode: epNum,
          fileName: videoFile,
          storagePath,
          fileSize,
        }],
      };
      newFilms.push(film);
      console.log(`  📺 Detected series folder: "${title}" (${entry.name})`);
    } else {
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
  }

  if (newFilms.length === 0) {
    // Check if existing series got new episodes dropped in their Episodes folder
    let updatedExisting = false;
    for (const f of (db.films || [])) {
      if (!f.isSeries) continue;
      const episodesDir = path.join(STORAGE_DIR, f.id, "Episodes");
      if (!fs.existsSync(episodesDir)) continue;
      const existingEpPaths = new Set((f.episodes || []).map(e => e.storagePath));
      const videoFiles = findAllVideoFiles(episodesDir);
      for (const vf of videoFiles) {
        const sp = `/storage/films/${f.id}/Episodes/${vf}`;
        if (existingEpPaths.has(sp)) continue;
        const parsed = parseFilenameTitle(vf);
        let fSize = 0;
        try { fSize = fs.statSync(path.join(episodesDir, vf)).size; } catch {}
        if (!f.episodes) f.episodes = [];
        f.episodes.push({
          id: uuid(),
          season: parsed.season || 1,
          episode: parsed.episode || f.episodes.length + 1,
          fileName: vf,
          storagePath: sp,
          fileSize: fSize,
        });
        f.episodes.sort((a, b) => a.season - b.season || a.episode - b.episode);
        updatedExisting = true;
        console.log(`  📺 New episode added to "${f.displayTitle}": S${String(parsed.season).padStart(2,"0")}E${String(parsed.episode).padStart(2,"0")}`);
      }
    }
    if (updatedExisting) {
      await update(d => { d.films = db.films; });
      console.log("  ✅ Updated existing series with new episodes");
    } else {
      console.log("  ✅ No new films found");
    }
    return [];
  }

  // Save to DB
  await update((d) => {
    if (!d.films) d.films = [];
    // For series that already exist in DB, update episodes instead of adding duplicate
    for (const nf of newFilms) {
      const existing = d.films.find(f => f.id === nf.id);
      if (existing && existing.isSeries && nf.isSeries) {
        existing.episodes = nf.episodes;
        existing.fileSize = nf.fileSize;
      } else if (!existing) {
        d.films.push(nf);
      }
    }
  });

  console.log(`  ✅ Registered ${newFilms.length} new item(s)`);

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
