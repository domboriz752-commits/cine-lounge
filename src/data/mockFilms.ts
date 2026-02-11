export interface Film {
  id: string;
  title: string;
  year: number;
  description: string;
  genres: string[];
  duration: number; // seconds
  posterColor: string; // gradient for poster placeholder
  backdropUrl?: string;
  videoUrl: string;
}

// Public domain / sample video for demo
const SAMPLE_VIDEO = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

export const films: Film[] = [
  {
    id: "1",
    title: "The Last Horizon",
    year: 2024,
    description: "A lone astronaut stranded on a dying planet must navigate treacherous landscapes and uncover ancient secrets to find a way home before time runs out.",
    genres: ["Sci-Fi", "Drama", "Adventure"],
    duration: 7920,
    posterColor: "from-blue-900 to-indigo-950",
    videoUrl: SAMPLE_VIDEO,
  },
  {
    id: "2",
    title: "Crimson Tide Rising",
    year: 2024,
    description: "When a submarine crew discovers a conspiracy that could start a world war, one officer must choose between duty and conscience.",
    genres: ["Thriller", "Action"],
    duration: 7200,
    posterColor: "from-red-900 to-rose-950",
    videoUrl: SAMPLE_VIDEO,
  },
  {
    id: "3",
    title: "Whispers in the Dark",
    year: 2023,
    description: "A psychological thriller about a therapist who begins to suspect her newest patient is connected to a series of unsolved disappearances.",
    genres: ["Thriller", "Mystery"],
    duration: 6600,
    posterColor: "from-gray-800 to-slate-950",
    videoUrl: SAMPLE_VIDEO,
  },
  {
    id: "4",
    title: "Neon Dreams",
    year: 2024,
    description: "In a cyberpunk metropolis, a street artist discovers her murals can alter reality, attracting dangerous attention from corporate overlords.",
    genres: ["Sci-Fi", "Action"],
    duration: 7800,
    posterColor: "from-purple-800 to-fuchsia-950",
    videoUrl: SAMPLE_VIDEO,
  },
  {
    id: "5",
    title: "The Garden of Echoes",
    year: 2023,
    description: "A haunting love story spanning centuries, told through the memories of an ancient garden that connects souls across time.",
    genres: ["Romance", "Fantasy", "Drama"],
    duration: 7500,
    posterColor: "from-emerald-800 to-green-950",
    videoUrl: SAMPLE_VIDEO,
  },
  {
    id: "6",
    title: "Ironclad",
    year: 2024,
    description: "A retired boxer returns to the ring one last time to save her community center, facing the undefeated champion in a bout that will change everything.",
    genres: ["Drama", "Sports"],
    duration: 7100,
    posterColor: "from-amber-800 to-orange-950",
    videoUrl: SAMPLE_VIDEO,
  },
  {
    id: "7",
    title: "Shadow Protocol",
    year: 2023,
    description: "An elite spy uncovers a mole within her own agency and must go rogue to expose the truth before a catastrophic attack.",
    genres: ["Action", "Thriller"],
    duration: 7600,
    posterColor: "from-zinc-800 to-neutral-950",
    videoUrl: SAMPLE_VIDEO,
  },
  {
    id: "8",
    title: "Starfall",
    year: 2024,
    description: "When a meteor shower brings alien organisms to Earth, a team of scientists races to understand them before the military destroys everything.",
    genres: ["Sci-Fi", "Drama"],
    duration: 8100,
    posterColor: "from-cyan-800 to-teal-950",
    videoUrl: SAMPLE_VIDEO,
  },
  {
    id: "9",
    title: "The Baker's Daughter",
    year: 2023,
    description: "A heartfelt comedy about a young woman who inherits a failing bakery in Paris and must learn to bake—and love—from scratch.",
    genres: ["Comedy", "Romance"],
    duration: 6300,
    posterColor: "from-pink-800 to-rose-950",
    videoUrl: SAMPLE_VIDEO,
  },
  {
    id: "10",
    title: "Depths Unknown",
    year: 2024,
    description: "A deep-sea exploration team discovers an underwater civilization that challenges everything humanity knows about its own origins.",
    genres: ["Adventure", "Sci-Fi", "Mystery"],
    duration: 8400,
    posterColor: "from-blue-800 to-sky-950",
    videoUrl: SAMPLE_VIDEO,
  },
  {
    id: "11",
    title: "Ember and Ash",
    year: 2023,
    description: "In a post-apocalyptic world, two siblings search for a rumored sanctuary while evading ruthless scavengers and the harsh elements.",
    genres: ["Drama", "Adventure"],
    duration: 7300,
    posterColor: "from-orange-800 to-red-950",
    videoUrl: SAMPLE_VIDEO,
  },
  {
    id: "12",
    title: "The Clockmaker's Secret",
    year: 2024,
    description: "A brilliant but reclusive clockmaker discovers his creations can manipulate time, leading him into a dangerous game with powerful forces.",
    genres: ["Fantasy", "Thriller"],
    duration: 6900,
    posterColor: "from-yellow-800 to-amber-950",
    videoUrl: SAMPLE_VIDEO,
  },
  {
    id: "13",
    title: "Voices of the Canyon",
    year: 2023,
    description: "A documentary filmmaker journeys through the American Southwest, capturing stories of resilience from communities living on the edge.",
    genres: ["Documentary", "Drama"],
    duration: 5400,
    posterColor: "from-stone-700 to-stone-950",
    videoUrl: SAMPLE_VIDEO,
  },
  {
    id: "14",
    title: "Phantom Circuit",
    year: 2024,
    description: "An underground racing league in a near-future city becomes the battleground for a hacker trying to expose corporate corruption.",
    genres: ["Action", "Sci-Fi"],
    duration: 7000,
    posterColor: "from-violet-800 to-indigo-950",
    videoUrl: SAMPLE_VIDEO,
  },
  {
    id: "15",
    title: "The Last Waltz",
    year: 2023,
    description: "An aging ballroom dancer gets one final chance to compete at the world championships, reigniting old rivalries and lost love.",
    genres: ["Drama", "Romance"],
    duration: 6700,
    posterColor: "from-rose-800 to-pink-950",
    videoUrl: SAMPLE_VIDEO,
  },
];

export const filmCategories = [
  { title: "Trending Now", films: films.slice(0, 6) },
  { title: "New Releases", films: films.slice(4, 10) },
  { title: "Action & Thriller", films: films.filter(f => f.genres.some(g => ["Action", "Thriller"].includes(g))) },
  { title: "Sci-Fi & Fantasy", films: films.filter(f => f.genres.some(g => ["Sci-Fi", "Fantasy"].includes(g))) },
  { title: "Drama", films: films.filter(f => f.genres.includes("Drama")) },
  { title: "Romance & Comedy", films: films.filter(f => f.genres.some(g => ["Romance", "Comedy"].includes(g))) },
];

export const heroFilm = films[0];

export function getFilmById(id: string): Film | undefined {
  return films.find(f => f.id === id);
}

export function searchFilms(query: string): Film[] {
  const q = query.toLowerCase();
  return films.filter(
    f => f.title.toLowerCase().includes(q) || f.genres.some(g => g.toLowerCase().includes(q))
  );
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
