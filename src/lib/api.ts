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
