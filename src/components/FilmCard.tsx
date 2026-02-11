import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Plus, Check } from "lucide-react";
import { type Film, filmTitle, filmPosterColor, filmPosterUrl, formatDuration } from "@/data/mockFilms";
import { useProfile } from "@/contexts/ProfileContext";
import { motion } from "framer-motion";

interface FilmCardProps {
  film: Film;
}

export default function FilmCard({ film }: FilmCardProps) {
  const navigate = useNavigate();
  const { toggleMyList, isInMyList } = useProfile();
  const [hovered, setHovered] = useState(false);
  const inList = isInMyList(film.id);
  const title = filmTitle(film);
  const poster = filmPosterUrl(film);
  const duration = film.runtimeSec || film.duration || 0;

  return (
    <motion.div
      className="relative flex-shrink-0 cursor-pointer overflow-hidden rounded transition-transform duration-300"
      style={{ width: "200px" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileHover={{ scale: 1.05, zIndex: 10 }}
      onClick={() => navigate(`/film/${film.id}`)}
    >
      {poster ? (
        <div className="aspect-[2/3] w-full overflow-hidden">
          <img src={poster} alt={title} className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className={`aspect-[2/3] w-full bg-gradient-to-br ${filmPosterColor(film)} flex items-end`}>
          <div className="w-full p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-white/60">{film.year > 0 ? film.year : ""}</p>
            <p className="mt-0.5 text-sm font-semibold leading-tight text-white">{title}</p>
          </div>
        </div>
      )}

      {hovered && (
        <motion.div
          className="film-card-overlay absolute inset-0 flex flex-col justify-end p-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          <p className="mb-1 text-xs text-muted-foreground">
            {duration > 0 ? formatDuration(duration) : ""}{film.genres?.[0] ? ` · ${film.genres[0]}` : ""}
          </p>
          <div className="flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/watch/${film.id}`); }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background transition hover:opacity-80"
            >
              <Play size={14} fill="currentColor" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); toggleMyList(film.id); }}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-muted-foreground/50 text-foreground transition hover:border-foreground"
            >
              {inList ? <Check size={14} /> : <Plus size={14} />}
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
