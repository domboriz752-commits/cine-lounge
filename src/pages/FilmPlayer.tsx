import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState, useCallback } from "react";
import { type Film, filmTitle, filmVideoUrl, formatDuration } from "@/data/mockFilms";
import { useProfile } from "@/contexts/ProfileContext";
import {
  fetchFilm,
  getWatchProgress,
  updateWatchProgress,
  logWatchEvent,
  fetchRating,
} from "@/lib/api";
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize, Minimize } from "lucide-react";
import { motion } from "framer-motion";
import SurveyModal from "@/components/SurveyModal";

const SURVEY_THRESHOLD = 0.15;

export default function FilmPlayer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeProfile } = useProfile();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [film, setFilm] = useState<Film | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyAnswered, setSurveyAnswered] = useState(false);
  const hideTimeout = useRef<number>();
  const lastSavedTime = useRef(0);

  useEffect(() => {
    if (!id) { navigate("/home"); return; }
    fetchFilm(id).then(setFilm).catch(() => navigate("/home"));
  }, [id]);

  useEffect(() => {
    if (!film || !activeProfile) return;
    getWatchProgress(activeProfile.id, film.id).then(prog => {
      if (prog && videoRef.current) {
        const pos = prog.lastPositionSec ?? (prog as any).last_position_sec ?? 0;
        videoRef.current.currentTime = pos;
        setCurrentTime(pos);
      }
    }).catch(console.error);
    fetchRating(activeProfile.id, film.id).then(r => {
      if (r && r.liked !== null) setSurveyAnswered(true);
    }).catch(console.error);
  }, [film, activeProfile]);

  const saveProgress = useCallback(async () => {
    if (!film || !activeProfile || !videoRef.current) return;
    const pos = videoRef.current.currentTime;
    const delta = pos - lastSavedTime.current;
    if (Math.abs(delta) < 1) return;
    lastSavedTime.current = pos;
    await updateWatchProgress(
      activeProfile.id, film.id, pos, Math.max(0, delta),
      videoRef.current.duration || film.runtimeSec || film.duration || 0
    ).catch(console.error);
  }, [film, activeProfile]);

  useEffect(() => {
    const interval = setInterval(saveProgress, 10000);
    return () => { clearInterval(interval); saveProgress(); };
  }, [saveProgress]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v || !film || !activeProfile) return;
    if (v.paused) {
      v.play(); setPlaying(true);
      logWatchEvent(activeProfile.id, film.id, "PLAY", v.currentTime).catch(console.error);
    } else {
      v.pause(); setPlaying(false);
      logWatchEvent(activeProfile.id, film.id, "PAUSE", v.currentTime).catch(console.error);
    }
  };

  const handleEnded = async () => {
    setPlaying(false);
    if (!film || !activeProfile) return;
    await logWatchEvent(activeProfile.id, film.id, "ENDED", videoRef.current?.duration || 0).catch(console.error);
    await saveProgress();
    if (!surveyAnswered) setShowSurvey(true);
  };

  const handleExit = async () => {
    if (film && activeProfile && videoRef.current) {
      await logWatchEvent(activeProfile.id, film.id, "STOP", videoRef.current.currentTime).catch(console.error);
      await saveProgress();
      const watchedPct = duration > 0 ? currentTime / duration : 0;
      if (!surveyAnswered && watchedPct >= SURVEY_THRESHOLD) {
        setShowSurvey(true);
        return;
      }
    }
    navigate(-1);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen(); setIsFullscreen(false);
    } else {
      containerRef.current.requestFullscreen(); setIsFullscreen(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Number(e.target.value);
    setCurrentTime(v.currentTime);
    lastSavedTime.current = v.currentTime;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    hideTimeout.current = window.setTimeout(() => { if (playing) setShowControls(false); }, 3000);
  };

  if (!film) return <div className="flex h-screen items-center justify-center bg-black text-foreground">Loading...</div>;

  const title = filmTitle(film);
  const videoSrc = filmVideoUrl(film);
  const filmDuration = film.runtimeSec || film.duration || 0;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <>
      <div
        ref={containerRef}
        className="relative flex h-screen w-full items-center justify-center bg-black"
        onMouseMove={handleMouseMove}
        onClick={togglePlay}
      >
        <video
          ref={videoRef}
          src={videoSrc}
          className="h-full w-full object-contain"
          muted={muted}
          onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
          onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
          onEnded={handleEnded}
        />
        <motion.div
          className="absolute inset-0 flex flex-col justify-between"
          animate={{ opacity: showControls ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          style={{ pointerEvents: showControls ? "auto" : "none" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-4 bg-gradient-to-b from-black/60 to-transparent px-4 py-4 md:px-8">
            <button onClick={handleExit} className="text-foreground hover:text-primary">
              <ArrowLeft size={24} />
            </button>
            <h2 className="text-lg font-medium text-foreground">{title}</h2>
          </div>
          {!playing && (
            <div className="flex items-center justify-center">
              <button
                onClick={togglePlay}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-foreground/20 backdrop-blur transition hover:bg-foreground/30"
              >
                <Play size={32} className="text-foreground" fill="currentColor" />
              </button>
            </div>
          )}
          <div className="bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-8 md:px-8">
            <div className="group relative mb-3 h-1 w-full cursor-pointer rounded bg-muted">
              <div className="h-full rounded bg-primary" style={{ width: `${progress}%` }} />
              <input
                type="range" min={0} max={duration || 0} step={0.1} value={currentTime}
                onChange={handleSeek}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={togglePlay} className="text-foreground">
                  {playing ? <Pause size={22} /> : <Play size={22} fill="currentColor" />}
                </button>
                <button onClick={() => setMuted(!muted)} className="text-foreground">
                  {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <span className="text-xs text-muted-foreground">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
              <button onClick={toggleFullscreen} className="text-foreground">
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
      {showSurvey && activeProfile && film && (
        <SurveyModal
          profileId={activeProfile.id}
          filmId={film.id}
          filmTitle={title}
          onClose={() => {
            setShowSurvey(false);
            setSurveyAnswered(true);
            navigate(-1);
          }}
        />
      )}
    </>
  );
}
