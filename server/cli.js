#!/usr/bin/env node
import { read, update } from "./db.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { scanForNewFilms } from "./watcher.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_DIR = path.join(__dirname, "storage", "films");

const args = process.argv.slice(2);
const command = args[0];

function printHelp() {
  console.log(`
  🎬 Vetro CLI

  Commands:
    list                   List all films
    scan                   Scan storage for new films & register them
    scan --enrich          Scan + run AI enrichment on new films
    remove <id>            Remove a film by ID
    remove-all             Remove ALL films
    info <id>              Show details for a film
    help                   Show this help

  Examples:
    node cli.js list
    node cli.js scan
    node cli.js scan --enrich
    node cli.js remove abc-123
    node cli.js remove-all
  `);
}

function listFilms() {
  const db = read();
  const films = db.films || [];
  if (films.length === 0) {
    console.log("  No films in database.");
    return;
  }
  console.log(`\n  📽️  ${films.length} film(s):\n`);
  for (const f of films) {
    const title = f.displayTitle || f.officialTitle || f.fileName || "Untitled";
    const size = f.fileSize ? `${(f.fileSize / (1024 * 1024)).toFixed(1)} MB` : "?";
    console.log(`  ${f.id}  ${title}  (${f.year || "?"})  [${size}]`);
  }
  console.log();
}

async function removeFilm(filmId) {
  const db = read();
  const film = (db.films || []).find((f) => f.id === filmId);
  if (!film) {
    console.error(`  ❌ Film not found: ${filmId}`);
    process.exit(1);
  }

  const title = film.displayTitle || film.officialTitle || film.fileName || "Untitled";

  await update((db) => {
    db.films = (db.films || []).filter((f) => f.id !== filmId);
    for (const profileId of Object.keys(db.interactions || {})) {
      const inter = db.interactions[profileId];
      if (inter.myList) inter.myList = inter.myList.filter((f) => f !== filmId);
      if (inter.likes) inter.likes = inter.likes.filter((f) => f !== filmId);
      if (inter.dislikes) inter.dislikes = inter.dislikes.filter((f) => f !== filmId);
      if (inter.watchHistory) delete inter.watchHistory[filmId];
      if (inter.surveyResponses) delete inter.surveyResponses[filmId];
    }
  });

  const filmDir = path.join(STORAGE_DIR, filmId);
  if (fs.existsSync(filmDir)) {
    fs.rmSync(filmDir, { recursive: true, force: true });
  }

  console.log(`  ✅ Removed: "${title}" (${filmId})`);
}

async function removeAll() {
  const db = read();
  const count = (db.films || []).length;
  if (count === 0) {
    console.log("  No films to remove.");
    return;
  }

  const ids = (db.films || []).map((f) => f.id);

  await update((db) => {
    db.films = [];
    for (const profileId of Object.keys(db.interactions || {})) {
      const inter = db.interactions[profileId];
      if (inter.myList) inter.myList = [];
      if (inter.likes) inter.likes = [];
      if (inter.dislikes) inter.dislikes = [];
      if (inter.watchHistory) inter.watchHistory = {};
      if (inter.surveyResponses) inter.surveyResponses = {};
    }
  });

  for (const id of ids) {
    const filmDir = path.join(STORAGE_DIR, id);
    if (fs.existsSync(filmDir)) {
      fs.rmSync(filmDir, { recursive: true, force: true });
    }
  }

  console.log(`  ✅ Removed all ${count} film(s) and their storage files.`);
}

function showInfo(filmId) {
  const db = read();
  const film = (db.films || []).find((f) => f.id === filmId);
  if (!film) {
    console.error(`  ❌ Film not found: ${filmId}`);
    process.exit(1);
  }
  console.log(`\n  📽️  Film Details:\n`);
  console.log(JSON.stringify(film, null, 2));
  console.log();
}

// ── Run ──
switch (command) {
  case "list":
  case "ls":
    listFilms();
    break;
  case "scan": {
    const enrich = args.includes("--enrich");
    console.log(`\n  🔍 Scanning for new films...${enrich ? " (with AI enrichment)" : ""}\n`);
    await scanForNewFilms({ enrich });
    break;
  }
  case "remove":
  case "rm":
  case "delete":
    if (!args[1]) { console.error("  Usage: node cli.js remove <film-id>"); process.exit(1); }
    await removeFilm(args[1]);
    break;
  case "remove-all":
  case "clear":
    await removeAll();
    break;
  case "info":
    if (!args[1]) { console.error("  Usage: node cli.js info <film-id>"); process.exit(1); }
    showInfo(args[1]);
    break;
  default:
    printHelp();
    break;
}
