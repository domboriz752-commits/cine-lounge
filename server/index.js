import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import profileRoutes from "./routes/profiles.js";
import interactionRoutes from "./routes/interactions.js";
import aiRoutes from "./routes/ai.js";
import filmRoutes from "./routes/films.js";
import { read, getDbPath } from "./db.js";
import { checkGemini } from "./utils/gemini.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ── Serve stored films with Range support ──
const STORAGE_DIR = path.join(__dirname, "storage", "films");
if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });

app.use("/storage/films", express.static(STORAGE_DIR, { acceptRanges: true }));

// ── API Routes ──
app.use("/api/profiles", profileRoutes);
app.use("/api/profiles", interactionRoutes);
app.use("/api/films", filmRoutes);
app.use("/api/films", aiRoutes);

// ── Export DB ──
app.get("/api/export", (req, res) => {
  res.download(getDbPath(), "db.json");
});

// ── Import DB ──
app.post("/api/import", (req, res) => {
  try {
    const data = req.body;
    if (!data.version) return res.status(400).json({ error: "Invalid db format" });
    fs.writeFileSync(getDbPath(), JSON.stringify(data, null, 2));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Health check ──
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", profiles: read().profiles.length });
});

// ── Serve frontend build (production) ──
const distDir = path.join(__dirname, "..", "dist");
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.listen(PORT, async () => {
  console.log(`\n  🎬 Vetro server running at http://localhost:${PORT}`);
  console.log(`  📁 Database: ${getDbPath()}`);
  console.log(`  🎞️  Film storage: ${STORAGE_DIR}\n`);
  await checkGemini();
});
