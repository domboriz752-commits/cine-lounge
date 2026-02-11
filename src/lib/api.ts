import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type DbProfile = Tables<"profiles">;
export type DbMyList = Tables<"my_list">;
export type DbRating = Tables<"ratings">;
export type DbWatchHistory = Tables<"watch_history">;
export type DbWatchEvent = Tables<"watch_events">;

// ── Profiles ──

export async function fetchProfiles(): Promise<DbProfile[]> {
  const { data, error } = await supabase.from("profiles").select("*").order("created_at");
  if (error) throw error;
  return data;
}

export async function createProfile(name: string, color: string, icon: string): Promise<DbProfile> {
  const { data, error } = await supabase
    .from("profiles")
    .insert({ name, avatar_color: color, avatar_icon: icon })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProfile(id: string) {
  const { error } = await supabase.from("profiles").delete().eq("id", id);
  if (error) throw error;
}

export async function activateProfile(id: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// ── My List ──

export async function fetchMyList(profileId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("my_list")
    .select("film_id")
    .eq("profile_id", profileId);
  if (error) throw error;
  return data.map(r => r.film_id);
}

export async function addToMyList(profileId: string, filmId: string) {
  const { error } = await supabase
    .from("my_list")
    .upsert({ profile_id: profileId, film_id: filmId }, { onConflict: "profile_id,film_id" });
  if (error) throw error;
}

export async function removeFromMyList(profileId: string, filmId: string) {
  const { error } = await supabase
    .from("my_list")
    .delete()
    .eq("profile_id", profileId)
    .eq("film_id", filmId);
  if (error) throw error;
}

// ── Ratings ──

export async function fetchRating(profileId: string, filmId: string): Promise<DbRating | null> {
  const { data, error } = await supabase
    .from("ratings")
    .select("*")
    .eq("profile_id", profileId)
    .eq("film_id", filmId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertRating(
  profileId: string,
  filmId: string,
  liked: boolean | null,
  surveyEnjoyed?: boolean | null,
  surveyReason?: string | null,
  surveyTags?: string[]
) {
  const { error } = await supabase.from("ratings").upsert(
    {
      profile_id: profileId,
      film_id: filmId,
      liked,
      survey_enjoyed: surveyEnjoyed ?? null,
      survey_reason: surveyReason ?? null,
      survey_tags: surveyTags ?? [],
      updated_at: new Date().toISOString(),
    },
    { onConflict: "profile_id,film_id" }
  );
  if (error) throw error;
}

// ── Watch History ──

export async function fetchWatchHistory(profileId: string): Promise<DbWatchHistory[]> {
  const { data, error } = await supabase
    .from("watch_history")
    .select("*")
    .eq("profile_id", profileId)
    .order("last_watched_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getWatchProgress(profileId: string, filmId: string): Promise<DbWatchHistory | null> {
  const { data, error } = await supabase
    .from("watch_history")
    .select("*")
    .eq("profile_id", profileId)
    .eq("film_id", filmId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateWatchProgress(
  profileId: string,
  filmId: string,
  positionSec: number,
  totalWatchedDeltaSec: number,
  durationSec: number
) {
  // Fetch existing
  const existing = await getWatchProgress(profileId, filmId);
  const totalWatched = (existing?.total_watched_sec ?? 0) + totalWatchedDeltaSec;
  const completionPct = durationSec > 0 ? Math.min((totalWatched / durationSec) * 100, 100) : 0;
  const completed = completionPct >= 90;

  const { error } = await supabase.from("watch_history").upsert(
    {
      profile_id: profileId,
      film_id: filmId,
      last_position_sec: positionSec,
      total_watched_sec: totalWatched,
      duration_sec: durationSec,
      completion_pct: Math.round(completionPct * 100) / 100,
      completed,
      last_watched_at: new Date().toISOString(),
    },
    { onConflict: "profile_id,film_id" }
  );
  if (error) throw error;
  return { completionPct, completed };
}

// ── Watch Events ──

export async function logWatchEvent(
  profileId: string,
  filmId: string,
  eventType: "PLAY" | "PAUSE" | "STOP" | "ENDED",
  positionSec: number
) {
  const { error } = await supabase.from("watch_events").insert({
    profile_id: profileId,
    film_id: filmId,
    event_type: eventType,
    position_sec: positionSec,
  });
  if (error) throw error;
}

// ── Continue Watching ──

export async function fetchContinueWatching(profileId: string): Promise<DbWatchHistory[]> {
  const { data, error } = await supabase
    .from("watch_history")
    .select("*")
    .eq("profile_id", profileId)
    .eq("completed", false)
    .gt("total_watched_sec", 0)
    .order("last_watched_at", { ascending: false })
    .limit(10);
  if (error) throw error;
  return data;
}
