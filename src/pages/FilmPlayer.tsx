import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState, useCallback } from "react";
import { getFilmById, formatDuration } from "@/data/mockFilms";
import { useProfile } from "@/contexts/ProfileContext";
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize, Minimize } from "lucide-react";
import { motion } from "framer-motion";

export default function FilmPlayer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const film = getFilmById(id || "");
  const { getPlaybackTime, setPlaybackTime } = useProfile();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideTimeout = useRef<number>();

  useEffect(() => {
    if (!film) { navigate("/home"); return; }
    const saved = getPlaybackTime(film.id);
    if (videoRef.current && saved > 0) {
      videoRef.current.currentTime = saved;
    }
  }, [film]);

  const saveTime = useCallback(() => {
    if (film && videoRef.current) {
      setPlaybackTime(film.id, videoRef.current.currentTime);
    }
  }, [film, setPlaybackTime]);

  useEffect(() => {
    const interval = setInterval(saveTime, 5000);
    return () => { clearInterval(interval); saveTime(); };
  }, [saveTime]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    } else {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Number(e.target.value);
    setCurrentTime(v.currentTime);
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    hideTimeout.current = window.setTimeout(() => { if (playing) setShowControls(false); }, 3000);
  };

  if (!film) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div
      ref={containerRef}
      className="relative flex h-screen w-full items-center justify-center bg-black"
      onMouseMove={handleMouseMove}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={film.videoUrl}
        className="h-full w-full object-contain"
        muted={muted}
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
        onEnded={() => setPlaying(false)}
      />

      {/* Controls overlay */}
      <motion.div
        className="absolute inset-0 flex flex-col justify-between"
        animate={{ opacity: showControls ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        style={{ pointerEvents: showControls ? "auto" : "none" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-center gap-4 bg-gradient-to-b from-black/60 to-transparent px-4 py-4 md:px-8">
          <button onClick={() => { saveTime(); navigate(-1); }} className="text-foreground hover:text-primary">
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-lg font-medium text-foreground">{film.title}</h2>
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
          {/* Progress bar */}
          <div className="group relative mb-3 h-1 w-full cursor-pointer rounded bg-muted">
            <div className="h-full rounded bg-primary" style={{ width: `${progress}%` }} />
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
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
  );
}
