import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { type Film, type Episode, filmTitle, filmVideoUrl, filmPosterColor, filmPosterUrl, formatDuration, getSortedEpisodes, episodeLabel } from "@/data/mockFilms";
import { useProfile } from "@/contexts/ProfileContext";
import { fetchFilm, fetchRating, upsertRating, getSeriesProgress } from "@/lib/api";
import { ArrowLeft, Play, Plus, Check, ThumbsUp, ThumbsDown, ImagePlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function FilmDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeProfile, toggleMyList, isInMyList } = useProfile();
  const [film, setFilm] = useState<Film | null>(null);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [liked, setLiked] = useState<boolean | null>(null);
  const [episodeProgress, setEpisodeProgress] = useState<Record<string, any>>({});
  const videoRef = useRef<HTMLVideoElement>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) { navigate("/home"); return; }
    fetchFilm(id).then(setFilm).catch(() => navigate("/home"));
  }, [id]);

  useEffect(() => {
    if (!film || !activeProfile) return;
    fetchRating(activeProfile.id, film.id).then(r => {
      if (r) setLiked(r.liked);
    }).catch(() => {});
    // Load episode progress for series
    if (film.isSeries) {
      getSeriesProgress(activeProfile.id, film.id)
        .then(setEpisodeProgress)
        .catch(() => {});
    }
  }, [film, activeProfile]);

  const handlePlay = (episodeId?: string) => {
    setIsFadingOut(true);
    setTimeout(() => {
      if (episodeId) {
        navigate(`/watch/${film!.id}?episode=${episodeId}`);
      } else {
        navigate(`/watch/${film!.id}`);
      }
    }, 450);
  };

  // For series: find the episode to resume (first incomplete or first)
  const getResumeEpisode = (): Episode | undefined => {
    if (!film?.isSeries || !film.episodes?.length) return undefined;
    const sorted = getSortedEpisodes(film);
    // Find first episode not completed
    for (const ep of sorted) {
      const prog = episodeProgress[ep.id];
      if (!prog || !prog.completed) return ep;
    }
    // All completed, return last
    return sorted[sorted.length - 1];
  };

  const handleLike = async (value: boolean) => {
    if (!film || !activeProfile) return;
    const newVal = liked === value ? null : value;
    setLiked(newVal);
    await upsertRating(activeProfile.id, film.id, newVal).catch(console.error);
  };

  const handlePosterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !film) return;
    const formData = new FormData();
    formData.append("poster", file);
    try {
      const res = await fetch(`${API}/api/films/${film.id}/poster`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setFilm(prev => prev ? { ...prev, posterUrl: data.posterUrl } : prev);
      toast.success("Cover updated!");
    } catch (err) {
      toast.error("Failed to update cover");
    }
  };

  if (!film) return <div className="flex h-screen items-center justify-center bg-background text-foreground">Loading...</div>;

  const title = filmTitle(film);
  const videoSrc = filmVideoUrl(film);
  const poster = filmPosterUrl(film);
  const inList = isInMyList(film.id);
  const duration = film.runtimeSec || film.duration || 0;
  const aiData = film.aiDetails?.data as Record<string, unknown> | undefined;
  const isSeries = film.isSeries && film.episodes && film.episodes.length > 0;
  const sortedEpisodes = isSeries ? getSortedEpisodes(film) : [];
  const resumeEpisode = getResumeEpisode();

  return (
    <div className="relative min-h-screen bg-background">
      <Navbar />
      <input
        ref={posterInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePosterUpload}
      />

      {/* Background: video preview or poster */}
      <div className="absolute inset-0 h-screen w-full overflow-hidden">
        {videoSrc ? (
          <motion.video
            ref={videoRef}
            src={videoSrc}
            className="h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            animate={{ scale: isFadingOut ? 1.0 : 1.05 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        ) : poster ? (
          <img src={poster} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className={`h-full w-full bg-gradient-to-br ${filmPosterColor(film)}`} />
        )}
      </div>

      {/* Gradient overlays */}
      <div className="absolute inset-0 h-screen" style={{ background: "linear-gradient(to right, rgba(0,0,0,0.88), rgba(0,0,0,0.45), rgba(0,0,0,0))" }} />
      <div className="absolute inset-0 h-screen" style={{ background: "linear-gradient(to top, hsl(0 0% 4%) 0%, transparent 50%)" }} />

      {/* Content overlay */}
      <AnimatePresence>
        {!isFadingOut && (
          <motion.div
            className="relative z-10 flex min-h-screen flex-col justify-end px-4 pb-20 pt-24 md:px-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Back button */}
            <button
              onClick={() => navigate(-1)}
              className="absolute left-4 top-20 flex items-center gap-1 text-sm text-foreground/70 hover:text-foreground transition md:left-12"
            >
              <ArrowLeft size={18} /> Back
            </button>

            <div className="max-w-2xl">
              {/* Title */}
              <motion.h1
                className="mb-3 text-4xl font-bold leading-tight text-foreground md:text-6xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                {title}
              </motion.h1>

              {/* Metadata row */}
              <motion.div
                className="mb-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
              >
                {film.year > 0 && <span className="font-medium text-primary">{film.year}</span>}
                {isSeries && <span className="rounded border border-primary/40 px-1.5 py-0.5 text-xs font-medium text-primary">Series · {sortedEpisodes.length} Episodes</span>}
                {!isSeries && duration > 0 && <span>{formatDuration(duration)}</span>}
                {film.certification && film.certification !== "Unrated" && (
                  <span className="rounded border border-muted-foreground/40 px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {film.certification}
                  </span>
                )}
              </motion.div>

              {/* Genres */}
              {film.genres?.length > 0 && (
                <motion.div
                  className="mb-4 flex flex-wrap gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {film.genres.map(g => (
                    <span key={g} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground/80">
                      {g}
                    </span>
                  ))}
                </motion.div>
              )}

              {/* Description */}
              {film.description && (
                <motion.p
                  className="mb-6 line-clamp-4 text-sm leading-relaxed text-foreground/80 md:text-base"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 }}
                >
                  {film.description}
                </motion.p>
              )}

              {/* Action buttons */}
              <motion.div
                className="flex flex-wrap items-center gap-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <button
                  onClick={() => handlePlay(resumeEpisode?.id)}
                  className="flex items-center gap-2 rounded bg-foreground px-8 py-3 text-lg font-semibold text-background transition-opacity hover:opacity-80"
                >
                  <Play size={22} fill="currentColor" />
                  {isSeries && resumeEpisode
                    ? `Play ${episodeLabel(resumeEpisode)}`
                    : "Play"
                  }
                </button>
                <button
                  onClick={() => toggleMyList(film.id)}
                  className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-muted-foreground/50 text-foreground transition hover:border-foreground"
                  title={inList ? "Remove from list" : "Add to list"}
                >
                  {inList ? <Check size={20} /> : <Plus size={20} />}
                </button>
                <button
                  onClick={() => handleLike(true)}
                  className={`flex h-11 w-11 items-center justify-center rounded-full border-2 transition ${
                    liked === true
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-muted-foreground/50 text-foreground hover:border-foreground"
                  }`}
                  title="Like"
                >
                  <ThumbsUp size={18} />
                </button>
                <button
                  onClick={() => handleLike(false)}
                  className={`flex h-11 w-11 items-center justify-center rounded-full border-2 transition ${
                    liked === false
                      ? "border-destructive bg-destructive/20 text-destructive"
                      : "border-muted-foreground/50 text-foreground hover:border-foreground"
                  }`}
                  title="Dislike"
                >
                  <ThumbsDown size={18} />
                </button>
                <button
                  onClick={() => posterInputRef.current?.click()}
                  className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-muted-foreground/50 text-foreground transition hover:border-foreground"
                  title="Change cover"
                >
                  <ImagePlus size={18} />
                </button>
              </motion.div>

              {/* AI Details extras */}
              {aiData && (
                <motion.div
                  className="mt-8 space-y-2 text-sm text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  {typeof aiData.logline === "string" && aiData.logline && (
                    <p className="italic text-foreground/60">"{aiData.logline}"</p>
                  )}
                  {Array.isArray(aiData.moodTags) && aiData.moodTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {(aiData.moodTags as string[]).map(tag => (
                        <span key={tag} className="rounded bg-accent px-2 py-0.5 text-xs text-accent-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            {/* Episodes list for series */}
            {isSeries && (
              <motion.div
                className="mt-10 max-w-3xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <h3 className="mb-4 text-xl font-semibold text-foreground">Episodes</h3>
                <div className="space-y-2">
                  {sortedEpisodes.map((ep) => {
                    const prog = episodeProgress[ep.id];
                    const pct = prog?.completionPct || 0;
                    const isCompleted = prog?.completed || false;
                    return (
                      <button
                        key={ep.id}
                        onClick={() => handlePlay(ep.id)}
                        className="group flex w-full items-center gap-4 rounded-lg bg-card/50 px-4 py-3 text-left transition hover:bg-card/80 border border-border/30"
                      >
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-secondary text-foreground/70 group-hover:bg-primary group-hover:text-primary-foreground transition">
                          <Play size={16} fill="currentColor" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">
                              {episodeLabel(ep)}
                            </span>
                            {ep.title && (
                              <span className="text-sm text-muted-foreground truncate">
                                — {ep.title}
                              </span>
                            )}
                          </div>
                          {pct > 0 && (
                            <div className="mt-1 h-1 w-full max-w-[200px] rounded bg-muted overflow-hidden">
                              <div
                                className="h-full rounded bg-primary transition-all"
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-xs text-muted-foreground">
                          {isCompleted ? (
                            <span className="text-primary">✓ Watched</span>
                          ) : pct > 0 ? (
                            <span>{Math.round(pct)}%</span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
