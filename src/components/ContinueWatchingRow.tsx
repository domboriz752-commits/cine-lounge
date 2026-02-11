import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { getFilmById, formatDuration } from "@/data/mockFilms";
import type { DbWatchHistory } from "@/lib/api";

interface ContinueWatchingRowProps {
  items: DbWatchHistory[];
}

export default function ContinueWatchingRow({ items }: ContinueWatchingRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 10);
    setShowRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <div className="group/row relative mb-8">
      <h2 className="mb-3 px-4 text-lg font-semibold text-foreground md:px-12">
        Continue Watching
      </h2>
      <div className="relative">
        {showLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-0 z-10 flex h-full w-10 items-center justify-center bg-background/60 opacity-0 transition-opacity group-hover/row:opacity-100 md:w-12"
          >
            <ChevronLeft className="text-foreground" size={28} />
          </button>
        )}
        <div ref={scrollRef} onScroll={checkScroll} className="scrollbar-hide flex gap-2 overflow-x-auto px-4 md:px-12">
          {items.map(item => {
            const film = getFilmById(item.film_id);
            if (!film) return null;
            return (
              <div
                key={item.film_id}
                className="relative flex-shrink-0 cursor-pointer overflow-hidden rounded transition-transform duration-300 hover:scale-105"
                style={{ width: "280px" }}
                onClick={() => navigate(`/film/${film.id}`)}
              >
                <div className={`aspect-video w-full bg-gradient-to-br ${film.posterColor} flex items-end`}>
                  <div className="film-card-overlay absolute inset-0 flex flex-col justify-end p-3">
                    <p className="mb-1 text-sm font-semibold text-foreground">{film.title}</p>
                    <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{Math.round(item.completion_pct)}% watched</span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1 w-full rounded bg-muted">
                      <div
                        className="h-full rounded bg-primary"
                        style={{ width: `${Math.min(item.completion_pct, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground/20 backdrop-blur">
                      <Play size={16} className="text-foreground" fill="currentColor" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {showRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-0 z-10 flex h-full w-10 items-center justify-center bg-background/60 opacity-0 transition-opacity group-hover/row:opacity-100 md:w-12"
          >
            <ChevronRight className="text-foreground" size={28} />
          </button>
        )}
      </div>
    </div>
  );
}
