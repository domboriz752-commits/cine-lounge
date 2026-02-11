import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import FilmCard from "./FilmCard";
import { type Film } from "@/data/mockFilms";

interface ContentRowProps {
  title: string;
  films: Film[];
}

export default function ContentRow({ title, films }: ContentRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
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

  if (!films.length) return null;

  return (
    <div className="group/row relative mb-8">
      <h2 className="mb-3 px-4 text-lg font-semibold text-foreground md:px-12">
        {title}
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
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="scrollbar-hide flex gap-2 overflow-x-auto px-4 md:px-12"
        >
          {films.map(film => (
            <FilmCard key={film.id} film={film} />
          ))}
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
