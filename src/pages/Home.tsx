import { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/Navbar";
import HeroBanner from "@/components/HeroBanner";
import ContentRow from "@/components/ContentRow";
import ContinueWatchingRow from "@/components/ContinueWatchingRow";
import { useProfile } from "@/contexts/ProfileContext";
import { fetchContinueWatching, fetchFilms, type DbWatchHistory } from "@/lib/api";
import { type Film } from "@/data/mockFilms";
import { motion } from "framer-motion";
import { Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const { activeProfile } = useProfile();
  const navigate = useNavigate();
  const [continueWatching, setContinueWatching] = useState<DbWatchHistory[]>([]);
  const [films, setFilms] = useState<Film[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFilms()
      .then(setFilms)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeProfile) return;
    fetchContinueWatching(activeProfile.id)
      .then(setContinueWatching)
      .catch(console.error);
  }, [activeProfile]);

  const categories = useMemo(() => {
    if (!films.length) return [];
    const cats: { title: string; films: Film[] }[] = [];

    const recent = [...films].sort((a, b) =>
      new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime()
    );
    if (recent.length) cats.push({ title: "Recently Added", films: recent.slice(0, 10) });

    const genres = new Set<string>();
    films.forEach(f => f.genres?.forEach(g => genres.add(g)));
    for (const genre of genres) {
      const genreFilms = films.filter(f => f.genres?.includes(genre));
      if (genreFilms.length >= 1) cats.push({ title: genre, films: genreFilms });
    }
    return cats;
  }, [films]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {films.length > 0 ? (
        <>
          <HeroBanner films={films} />
          <motion.div
            className="-mt-20 relative z-10 pb-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {continueWatching.length > 0 && (
              <ContinueWatchingRow items={continueWatching} films={films} />
            )}
            {categories.map(cat => (
              <ContentRow key={cat.title} title={cat.title} films={cat.films} />
            ))}
          </motion.div>
        </>
      ) : (
        <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 pt-20">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-secondary">
            <Upload size={40} className="text-muted-foreground" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-foreground">No films yet</h2>
          <p className="mb-6 text-center text-muted-foreground">
            Upload your first film to get started
          </p>
          <button
            onClick={() => navigate("/upload")}
            className="rounded bg-primary px-6 py-2.5 font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Upload Film
          </button>
        </div>
      )}
    </div>
  );
}
