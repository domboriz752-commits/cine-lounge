import { Play, Plus, Check, Info } from "lucide-react";
import { heroFilm, formatDuration } from "@/data/mockFilms";
import { useProfile } from "@/contexts/ProfileContext";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import heroBackdrop from "@/assets/hero-backdrop.jpg";

export default function HeroBanner() {
  const { toggleMyList, isInMyList } = useProfile();
  const navigate = useNavigate();
  const film = heroFilm;
  const inList = isInMyList(film.id);

  return (
    <div className="relative h-[70vh] w-full md:h-[85vh]">
      <img
        src={heroBackdrop}
        alt={film.title}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="hero-gradient-bottom absolute inset-0" />
      <div className="hero-gradient-left absolute inset-0" />

      <div className="absolute bottom-[15%] left-4 z-10 max-w-xl md:bottom-[20%] md:left-12">
        <motion.h1
          className="mb-3 text-4xl font-bold leading-tight text-foreground md:text-6xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {film.title}
        </motion.h1>
        <motion.div
          className="mb-3 flex items-center gap-3 text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <span className="font-medium text-primary">{film.year}</span>
          <span>{formatDuration(film.duration)}</span>
          <span>{film.genres.join(" · ")}</span>
        </motion.div>
        <motion.p
          className="mb-5 line-clamp-3 text-sm leading-relaxed text-foreground/80 md:text-base"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {film.description}
        </motion.p>
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <button
            onClick={() => navigate(`/film/${film.id}`)}
            className="flex items-center gap-2 rounded bg-foreground px-6 py-2.5 font-semibold text-background transition-opacity hover:opacity-80"
          >
            <Play size={20} fill="currentColor" />
            Play
          </button>
          <button
            onClick={() => toggleMyList(film.id)}
            className="flex items-center gap-2 rounded bg-secondary/80 px-5 py-2.5 font-medium text-foreground backdrop-blur transition-colors hover:bg-secondary"
          >
            {inList ? <Check size={18} /> : <Plus size={18} />}
            My List
          </button>
          <button
            onClick={() => navigate(`/film/${film.id}`)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-muted-foreground/40 text-foreground transition-colors hover:border-foreground"
          >
            <Info size={18} />
          </button>
        </motion.div>
      </div>
    </div>
  );
}
