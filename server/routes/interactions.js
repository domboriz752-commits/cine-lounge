import { Router } from "express";
import { read, update } from "../db.js";

const router = Router();

function ensureInteractions(db, profileId) {
  if (!db.interactions[profileId]) {
    db.interactions[profileId] = {
      myList: [],
      likes: [],
      dislikes: [],
      watchHistory: {},
      surveyResponses: {},
      events: [],
    };
  }
  return db.interactions[profileId];
}

// ── My List ──

router.get("/:id/my-list", (req, res) => {
  const db = read();
  const inter = db.interactions[req.params.id];
  res.json(inter?.myList || []);
});

router.post("/:id/my-list/add", async (req, res) => {
  const { filmId } = req.body;
  await update(db => {
    const inter = ensureInteractions(db, req.params.id);
    if (!inter.myList.includes(filmId)) inter.myList.push(filmId);
  });
  res.json({ ok: true });
});

router.post("/:id/my-list/remove", async (req, res) => {
  const { filmId } = req.body;
  await update(db => {
    const inter = ensureInteractions(db, req.params.id);
    inter.myList = inter.myList.filter(f => f !== filmId);
  });
  res.json({ ok: true });
});

// ── Ratings / Survey ──

router.get("/:id/film/:filmId/rating", (req, res) => {
  const db = read();
  const inter = db.interactions[req.params.id];
  const survey = inter?.surveyResponses?.[req.params.filmId];
  res.json(survey || null);
});

router.post("/:id/film/:filmId/rating", async (req, res) => {
  const { liked, surveyEnjoyed, surveyReason, surveyTags } = req.body;
  await update(db => {
    const inter = ensureInteractions(db, req.params.id);
    inter.surveyResponses[req.params.filmId] = {
      liked,
      surveyEnjoyed: surveyEnjoyed ?? null,
      feedbackText: surveyReason ?? "",
      selectedTags: surveyTags ?? [],
      answeredAt: new Date().toISOString(),
    };
    // Also update likes/dislikes arrays
    const fid = req.params.filmId;
    inter.likes = inter.likes.filter(f => f !== fid);
    inter.dislikes = inter.dislikes.filter(f => f !== fid);
    if (liked === true) inter.likes.push(fid);
    if (liked === false) inter.dislikes.push(fid);
  });
  res.json({ ok: true });
});

// ── Watch History ──

router.get("/:id/watch-history", (req, res) => {
  const db = read();
  const inter = db.interactions[req.params.id];
  if (!inter?.watchHistory) return res.json([]);
  const items = Object.entries(inter.watchHistory).map(([filmId, data]) => ({
    film_id: filmId,
    ...data,
  }));
  items.sort((a, b) => new Date(b.lastWatchedAt || 0).getTime() - new Date(a.lastWatchedAt || 0).getTime());
  res.json(items);
});

router.get("/:id/film/:filmId/progress", (req, res) => {
  const db = read();
  const inter = db.interactions[req.params.id];
  const wh = inter?.watchHistory?.[req.params.filmId];
  res.json(wh || null);
});

router.post("/:id/film/:filmId/progress", async (req, res) => {
  const { positionSec, totalWatchedDeltaSec, durationSec } = req.body;
  let result = {};
  await update(db => {
    const inter = ensureInteractions(db, req.params.id);
    if (!inter.watchHistory) inter.watchHistory = {};
    const existing = inter.watchHistory[req.params.filmId] || {
      lastPositionSec: 0,
      totalWatchedSec: 0,
      durationSec: 0,
      completionPct: 0,
      completed: false,
      lastWatchedAt: null,
    };
    const totalWatched = existing.totalWatchedSec + Math.max(0, totalWatchedDeltaSec || 0);
    const completionPct = durationSec > 0 ? Math.min((totalWatched / durationSec) * 100, 100) : 0;
    const completed = completionPct >= 90;
    inter.watchHistory[req.params.filmId] = {
      lastPositionSec: positionSec,
      totalWatchedSec: totalWatched,
      durationSec,
      completionPct: Math.round(completionPct * 100) / 100,
      completed,
      lastWatchedAt: new Date().toISOString(),
    };
    result = { completionPct, completed };
  });
  res.json(result);
});

// ── Continue Watching ──

router.get("/:id/continue-watching", (req, res) => {
  const db = read();
  const inter = db.interactions[req.params.id];
  if (!inter?.watchHistory) return res.json([]);
  const items = Object.entries(inter.watchHistory)
    .filter(([, d]) => !d.completed && d.totalWatchedSec > 0)
    .map(([filmId, d]) => ({ film_id: filmId, ...d }))
    .sort((a, b) => new Date(b.lastWatchedAt || 0).getTime() - new Date(a.lastWatchedAt || 0).getTime())
    .slice(0, 10);
  res.json(items);
});

// ── Events ──

router.post("/:id/film/:filmId/event", async (req, res) => {
  const { type, positionSec } = req.body;
  await update(db => {
    const inter = ensureInteractions(db, req.params.id);
    if (!inter.events) inter.events = [];
    inter.events.push({
      type,
      filmId: req.params.filmId,
      positionSec: positionSec || 0,
      at: new Date().toISOString(),
    });
  });
  res.json({ ok: true });
});

export default router;
