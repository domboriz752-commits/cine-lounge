// ── Canonical genre list ──

export const GENRES = [
  "Action", "Adventure", "Animation", "Biography", "Comedy", "Crime",
  "Documentary", "Drama", "Family", "Fantasy", "Film-Noir", "History",
  "Horror", "Music", "Musical", "Mystery", "Romance", "Sci-Fi",
  "Sport", "Thriller", "War", "Western",
] as const;

export type Genre = (typeof GENRES)[number];

// Normalize a genre string to its canonical form (case-insensitive match)
export function normalizeGenre(raw: string): Genre | null {
  const lower = raw.toLowerCase().trim();
  // Common aliases
  const aliases: Record<string, Genre> = {
    "science fiction": "Sci-Fi",
    "sci fi": "Sci-Fi",
    "scifi": "Sci-Fi",
    "noir": "Film-Noir",
    "film noir": "Film-Noir",
    "biographical": "Biography",
    "biopic": "Biography",
    "suspense": "Thriller",
    "animated": "Animation",
    "war film": "War",
    "romantic": "Romance",
    "love": "Romance",
    "scary": "Horror",
    "sports": "Sport",
    "historical": "History",
    "comedic": "Comedy",
    "action-adventure": "Action",
    "docu": "Documentary",
  };
  if (aliases[lower]) return aliases[lower];
  return GENRES.find(g => g.toLowerCase() === lower) ?? null;
}

// Filter an array of raw genre strings to only canonical ones
export function normalizeGenres(raw: string[]): Genre[] {
  const result: Genre[] = [];
  const seen = new Set<Genre>();
  for (const r of raw) {
    const g = normalizeGenre(r);
    if (g && !seen.has(g)) { seen.add(g); result.push(g); }
  }
  return result;
}

// ── Film type & helpers (no more mock data) ──

export interface Film {
  id: string;
  officialTitle?: string;
  displayTitle?: string;
  title?: string; // compat
  year: number;
  description: string;
  genres: string[];
  runtimeSec?: number;
  duration?: number; // compat alias
  storagePath?: string;
  posterPath?: string;
  posterUrl?: string;
  posterColor?: string;
  videoUrl?: string;
  certification?: string;
  fileName?: string;
  fileSize?: number;
  uploadedAt?: string;
  subtitlePath?: string;
  width?: number;
  height?: number;
  aiDetails?: {
    generatedAt: string;
    model: string;
    data: Record<string, unknown>;
  } | null;
}

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Robust filename → clean title parser
export function parseFilenameTitle(fileName?: string): { title: string; year?: number } {
  if (!fileName) return { title: "Untitled" };
  // Remove extension
  let base = fileName.replace(/\.[^.]+$/, "");
  // Replace dots/underscores with spaces
  base = base.replace(/[._]+/g, " ");
  // Extract year (4 digits in parens or standalone 19xx/20xx)
  let year: number | undefined;
  const yearMatch = base.match(/[\s([\-]*((?:19|20)\d{2})[\s)\]]*(?:$|[\s\-])/);
  if (yearMatch) {
    year = parseInt(yearMatch[1]);
    base = base.replace(yearMatch[0], " ");
  }
  // Strip common tags
  const tags = /\b(1080p|720p|480p|2160p|4k|uhd|hdr|webrip|web-rip|web-dl|webdl|bluray|blu-ray|brrip|bdrip|dvdrip|hdtv|hdrip|x264|x265|h264|h265|hevc|avc|aac|ac3|dts|atmos|truehd|flac|mp3|remux|remastered|extended|unrated|directors cut|proper|repack|multi|dual|sub|subs|dubbed|eng|ita|fra|ger|spa|por|rus|hin|jpn|kor|chi|10bit|8bit|amzn|nf|hulu|dsnp|hmax|atvp|pcok|yts|rarbg|eztv|ettv|sparks|fgt|ion10|stuttershit|yify|shaanig|ganool|mkvcage|evo|tigole|qxr|ntb|ctrlhd|epsilon|drones|megusta|fleet|playar|vxt|cinemas|cinefile|joy|nogrp)\b/gi;
  base = base.replace(tags, " ");
  // Clean up extra spaces/hyphens
  base = base.replace(/[\[\](){}]/g, " ").replace(/\s*-\s*/g, " ").replace(/\s+/g, " ").trim();
  return { title: base || "Untitled", year };
}

// Resolve display name with full fallback chain
export function filmTitle(f: Film): string {
  return (
    f.displayTitle ||
    f.officialTitle ||
    f.title ||
    (f.aiDetails?.data as any)?.title ||
    parseFilenameTitle(f.fileName).title ||
    "Untitled"
  );
}

// Resolve video URL
export function filmVideoUrl(f: Film): string {
  if (f.storagePath) return `${API}${f.storagePath}`;
  if (f.videoUrl) return f.videoUrl;
  return "";
}

// Resolve poster URL (prepend API base if relative path)
export function filmPosterUrl(f: Film): string {
  const raw = f.posterPath || f.posterUrl || "";
  if (!raw) return "";
  if (raw.startsWith("http")) return raw;
  return `${API}${raw}`;
}

// Resolve poster gradient (fallback)
const PALETTE = [
  "from-blue-900 to-indigo-950",
  "from-red-900 to-rose-950",
  "from-emerald-800 to-green-950",
  "from-purple-800 to-fuchsia-950",
  "from-amber-800 to-orange-950",
  "from-cyan-800 to-teal-950",
  "from-pink-800 to-rose-950",
  "from-violet-800 to-indigo-950",
];

export function filmPosterColor(f: Film): string {
  if (f.posterColor) return f.posterColor;
  // Deterministic color from ID
  let hash = 0;
  for (const c of f.id) hash = (hash * 31 + c.charCodeAt(0)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
