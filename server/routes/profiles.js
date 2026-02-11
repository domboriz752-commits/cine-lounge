import { Router } from "express";
import { v4 as uuid } from "uuid";
import { read, update } from "../db.js";

const router = Router();

// GET /api/profiles
router.get("/", (req, res) => {
  const db = read();
  res.json(db.profiles);
});

// POST /api/profiles
router.post("/", async (req, res) => {
  const { name, color, icon } = req.body;
  if (!name) return res.status(400).json({ error: "Name required" });
  const profile = {
    id: uuid(),
    name,
    avatar: { color: color || "#e50914", icon: icon || "👤" },
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  };
  await update(db => {
    db.profiles.push(profile);
    db.interactions[profile.id] = {
      myList: [],
      likes: [],
      dislikes: [],
      watchHistory: {},
      surveyResponses: {},
      events: [],
    };
  });
  res.json(profile);
});

// DELETE /api/profiles/:id
router.delete("/:id", async (req, res) => {
  await update(db => {
    db.profiles = db.profiles.filter(p => p.id !== req.params.id);
    delete db.interactions[req.params.id];
  });
  res.json({ ok: true });
});

// POST /api/profiles/:id/activate
router.post("/:id/activate", async (req, res) => {
  await update(db => {
    const p = db.profiles.find(p => p.id === req.params.id);
    if (p) p.lastActiveAt = new Date().toISOString();
  });
  res.json({ ok: true });
});

export default router;
