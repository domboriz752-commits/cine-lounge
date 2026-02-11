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
  aiDetails?: {
    generatedAt: string;
    model: string;
    data: Record<string, unknown>;
  } | null;
}

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Resolve display name
export function filmTitle(f: Film): string {
  return f.displayTitle || f.officialTitle || f.title || "Untitled";
}

// Resolve video URL
export function filmVideoUrl(f: Film): string {
  if (f.storagePath) return `${API}${f.storagePath}`;
  if (f.videoUrl) return f.videoUrl;
  return "";
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
