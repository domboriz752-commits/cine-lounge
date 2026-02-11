import Navbar from "@/components/Navbar";
import HeroBanner from "@/components/HeroBanner";
import ContentRow from "@/components/ContentRow";
import { filmCategories } from "@/data/mockFilms";
import { motion } from "framer-motion";

export default function Home() {
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
        {filmCategories.map(cat => (
          <ContentRow key={cat.title} title={cat.title} films={cat.films} />
        ))}
      </motion.div>
    </div>
  );
}
