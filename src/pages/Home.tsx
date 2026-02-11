import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import HeroBanner from "@/components/HeroBanner";
import ContentRow from "@/components/ContentRow";
import ContinueWatchingRow from "@/components/ContinueWatchingRow";
import { filmCategories } from "@/data/mockFilms";
import { useProfile } from "@/contexts/ProfileContext";
import { fetchContinueWatching, type DbWatchHistory } from "@/lib/api";
import { motion } from "framer-motion";

export default function Home() {
  const { activeProfile } = useProfile();
  const [continueWatching, setContinueWatching] = useState<DbWatchHistory[]>([]);

  useEffect(() => {
    if (!activeProfile) return;
    fetchContinueWatching(activeProfile.id)
      .then(setContinueWatching)
      .catch(console.error);
  }, [activeProfile]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroBanner />
      <motion.div
        className="-mt-20 relative z-10 pb-16"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {continueWatching.length > 0 && (
          <ContinueWatchingRow items={continueWatching} />
        )}
        {filmCategories.map(cat => (
          <ContentRow key={cat.title} title={cat.title} films={cat.films} />
        ))}
      </motion.div>
    </div>
  );
}
