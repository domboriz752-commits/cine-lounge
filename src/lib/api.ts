const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ── Types ──

export interface DbProfile {
  id: string;
  name: string;
  avatar: { color: string; icon: string };
  createdAt: string;
  lastActiveAt: string;
}

export interface DbWatchHistory {
  film_id: string;
  lastPositionSec: number;
  totalWatchedSec: number;
  durationSec: number;
  completionPct: number;
  completed: boolean;
  lastWatchedAt: string;
}

export interface DbRating {
  liked: boolean | null;
  surveyEnjoyed: boolean | null;
  feedbackText: string;
  selectedTags: string[];
  answeredAt: string;
}

async function api(path: string, opts?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Profiles ──

export async function fetchProfiles(): Promise<DbProfile[]> {
  return api("/api/profiles");
}

export async function createProfile(name: string, color: string, icon: string): Promise<DbProfile> {
  return api("/api/profiles", {
    method: "POST",
    body: JSON.stringify({ name, color, icon }),
  });
}

export async function deleteProfile(id: string) {
  return api(`/api/profiles/${id}`, { method: "DELETE" });
}

export async function activateProfile(id: string) {
  return api(`/api/profiles/${id}/activate`, { method: "POST" });
}

// ── My List ──

export async function fetchMyList(profileId: string): Promise<string[]> {
  return api(`/api/profiles/${profileId}/my-list`);
}

export async function addToMyList(profileId: string, filmId: string) {
  return api(`/api/profiles/${profileId}/my-list/add`, {
    method: "POST",
    body: JSON.stringify({ filmId }),
  });
}

export async function removeFromMyList(profileId: string, filmId: string) {
  return api(`/api/profiles/${profileId}/my-list/remove`, {
    method: "POST",
    body: JSON.stringify({ filmId }),
  });
}

// ── Ratings ──

export async function fetchRating(profileId: string, filmId: string): Promise<DbRating | null> {
  return api(`/api/profiles/${profileId}/film/${filmId}/rating`);
}

export async function upsertRating(
  profileId: string,
  filmId: string,
  liked: boolean | null,
  surveyEnjoyed?: boolean | null,
  surveyReason?: string | null,
  surveyTags?: string[]
) {
  return api(`/api/profiles/${profileId}/film/${filmId}/rating`, {
    method: "POST",
    body: JSON.stringify({ liked, surveyEnjoyed, surveyReason, surveyTags }),
  });
}

// ── Watch History ──

export async function fetchWatchHistory(profileId: string): Promise<DbWatchHistory[]> {
  return api(`/api/profiles/${profileId}/watch-history`);
}

export async function getWatchProgress(profileId: string, filmId: string): Promise<DbWatchHistory | null> {
  return api(`/api/profiles/${profileId}/film/${filmId}/progress`);
}

export async function updateWatchProgress(
  profileId: string,
  filmId: string,
  positionSec: number,
  totalWatchedDeltaSec: number,
  durationSec: number
) {
  return api(`/api/profiles/${profileId}/film/${filmId}/progress`, {
    method: "POST",
    body: JSON.stringify({ positionSec, totalWatchedDeltaSec, durationSec }),
  });
}

// ── Events ──

export async function logWatchEvent(
  profileId: string,
  filmId: string,
  eventType: "PLAY" | "PAUSE" | "STOP" | "ENDED",
  positionSec: number
) {
  return api(`/api/profiles/${profileId}/film/${filmId}/event`, {
    method: "POST",
    body: JSON.stringify({ type: eventType, positionSec }),
  });
}

// ── Continue Watching ──

export async function fetchContinueWatching(profileId: string): Promise<DbWatchHistory[]> {
  return api(`/api/profiles/${profileId}/continue-watching`);
}

// ── Films ──

import type { Film } from "@/data/mockFilms";

export async function fetchFilms(): Promise<Film[]> {
  return api("/api/films");
}

export async function fetchFilm(id: string): Promise<Film> {
  return api(`/api/films/${id}`);
}

export async function uploadFilm(formData: FormData): Promise<{ success: boolean; film: Film }> {
  const res = await fetch(`${API}/api/films/upload`, {
    method: "POST",
    body: formData, // no Content-Type header — let browser set multipart boundary
  });
  if (!res.ok) throw new Error(`Upload failed: ${await res.text()}`);
  return res.json();
}

export async function uploadFilmFromUrl(data: {
  url: string;
  title?: string;
  year?: number;
  description?: string;
  genres?: string[];
}): Promise<{ success: boolean; film: Film }> {
  return api("/api/films/upload-url", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteFilm(id: string) {
  return api(`/api/films/${id}`, { method: "DELETE" });
}

// ── AI Enrichment ──

export interface AiEnrichmentData {
  logline: string;
  shortSummary: string;
  themes: string[];
  moodTags: string[];
  contentWarnings: string[];
  recommendedAudience: string;
  similarTitles: { title: string; reason: string }[];
  discussionQuestions: string[];
  watchAdvice: { pace: string; bestTime: string; withWho: string };
  confidence: number;
}

export interface AiDetails {
  generatedAt: string;
  model: string;
  data: AiEnrichmentData;
}

export async function enrichFilmWithAI(filmId: string): Promise<{ success: boolean; aiDetails: AiDetails }> {
  return api(`/api/films/${filmId}/ai/enrich`, { method: "POST" });
}
