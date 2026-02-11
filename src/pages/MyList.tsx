import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import FilmCard from "@/components/FilmCard";
import { useProfile } from "@/contexts/ProfileContext";
import { fetchFilms } from "@/lib/api";
import { type Film } from "@/data/mockFilms";
import { motion } from "framer-motion";

export default function MyList() {
  const { myList } = useProfile();
  const [films, setFilms] = useState<Film[]>([]);

  useEffect(() => {
    fetchFilms().then(setFilms).catch(console.error);
  }, []);

  const listFilms = films.filter(f => myList.includes(f.id));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="px-4 pt-24 md:px-12">
        <h1 className="mb-8 text-3xl font-bold text-foreground">My List</h1>
        {listFilms.length === 0 ? (
          <p className="text-muted-foreground">
            Your list is empty. Browse films and add them to your list.
          </p>
        ) : (
          <motion.div
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {listFilms.map(film => (
              <FilmCard key={film.id} film={film} />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
