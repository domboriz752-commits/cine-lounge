import { useState, useMemo } from "react";
import { searchFilms, films as allFilms } from "@/data/mockFilms";
import Navbar from "@/components/Navbar";
import FilmCard from "@/components/FilmCard";
import { Search as SearchIcon } from "lucide-react";
import { motion } from "framer-motion";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => (query.trim() ? searchFilms(query) : allFilms), [query]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="px-4 pt-24 md:px-12">
        <div className="relative mb-8 max-w-lg">
          <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full rounded border border-border bg-secondary py-2.5 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Search titles, genres..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        <motion.div
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {results.map(film => (
            <FilmCard key={film.id} film={film} />
          ))}
        </motion.div>
        {results.length === 0 && query.trim() && (
          <p className="mt-12 text-center text-muted-foreground">No results for "{query}"</p>
        )}
      </div>
    </div>
  );
}
