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
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize, Minimize, Settings, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SurveyModal from "@/components/SurveyModal";

const SURVEY_THRESHOLD = 0.15;

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

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
  const [showSettings, setShowSettings] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"main" | "speed">("main");
  const hideTimeout = useRef<number>();
  const lastSavedTime = useRef(0);

  // Check if film has subtitles
  const hasSubtitles = !!(film && (film as any).subtitlePath);

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

  // Apply playback speed
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = playbackSpeed;
  }, [playbackSpeed]);

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

  const toggleSettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSettings(!showSettings);
    setSettingsTab("main");
  };

  if (!film) return <div className="flex h-screen items-center justify-center bg-black text-foreground">Loading...</div>;

  const title = filmTitle(film);
  const videoSrc = filmVideoUrl(film);
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
        onClick={(e) => {
          if (showSettings) { setShowSettings(false); return; }
          togglePlay();
        }}
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
          {/* Top bar */}
          <div className="flex items-center gap-4 bg-gradient-to-b from-black/60 to-transparent px-4 py-4 md:px-8">
            <button onClick={handleExit} className="text-foreground hover:text-primary">
              <ArrowLeft size={24} />
            </button>
            <h2 className="text-lg font-medium text-foreground">{title}</h2>
          </div>

          {/* Center play button */}
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

          {/* Bottom controls */}
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
              <div className="flex items-center gap-3">
                {/* Settings button */}
                <div className="relative">
                  <button onClick={toggleSettings} className="text-foreground hover:text-primary transition">
                    <Settings size={20} />
                  </button>
                  <AnimatePresence>
                    {showSettings && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bottom-10 right-0 w-56 rounded-lg border border-border bg-card/95 backdrop-blur-lg shadow-xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {settingsTab === "main" && (
                          <div className="py-1">
                            {/* Speed */}
                            <button
                              onClick={() => setSettingsTab("speed")}
                              className="flex w-full items-center justify-between px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition"
                            >
                              <span>Playback speed</span>
                              <span className="text-xs text-muted-foreground">{playbackSpeed === 1 ? "Normal" : `${playbackSpeed}x`}</span>
                            </button>

                            {/* Subtitles */}
                            <button
                              onClick={() => {
                                if (hasSubtitles) setSubtitlesEnabled(!subtitlesEnabled);
                              }}
                              className={`flex w-full items-center justify-between px-4 py-2.5 text-sm transition ${
                                hasSubtitles ? "text-foreground hover:bg-muted/50 cursor-pointer" : "text-muted-foreground/50 cursor-not-allowed"
                              }`}
                            >
                              <span>Subtitles</span>
                              <span className="text-xs">
                                {hasSubtitles
                                  ? subtitlesEnabled ? "On" : "Off"
                                  : "Unavailable"
                                }
                              </span>
                            </button>
                          </div>
                        )}

                        {settingsTab === "speed" && (
                          <div className="py-1">
                            <button
                              onClick={() => setSettingsTab("main")}
                              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50 border-b border-border transition"
                            >
                              <ArrowLeft size={14} />
                              <span>Playback speed</span>
                            </button>
                            {SPEED_OPTIONS.map((speed) => (
                              <button
                                key={speed}
                                onClick={() => { setPlaybackSpeed(speed); setSettingsTab("main"); }}
                                className="flex w-full items-center justify-between px-4 py-2 text-sm text-foreground hover:bg-muted/50 transition"
                              >
                                <span>{speed === 1 ? "Normal" : `${speed}x`}</span>
                                {playbackSpeed === speed && <Check size={14} className="text-primary" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <button onClick={toggleFullscreen} className="text-foreground">
                  {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                </button>
              </div>
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
