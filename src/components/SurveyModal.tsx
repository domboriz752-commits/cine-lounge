import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThumbsUp, ThumbsDown, X } from "lucide-react";
import { upsertRating } from "@/lib/api";

interface SurveyModalProps {
  profileId: string;
  filmId: string;
  filmTitle: string;
  onClose: () => void;
}

const TAGS = ["Story", "Acting", "Pacing", "Visuals", "Soundtrack", "Too Long", "Not My Type"];

export default function SurveyModal({ profileId, filmId, filmTitle, onClose }: SurveyModalProps) {
  const [liked, setLiked] = useState<boolean | null>(null);
  const [reason, setReason] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleSubmit = async () => {
    await upsertRating(profileId, filmId, liked, liked, reason || null, selectedTags);
    setSubmitted(true);
    setTimeout(onClose, 1200);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="relative w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-2xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={e => e.stopPropagation()}
        >
          <button onClick={onClose} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>

          {submitted ? (
            <div className="py-8 text-center">
              <p className="text-xl font-medium text-foreground">Thanks for your feedback! 🎬</p>
            </div>
          ) : (
            <>
              <h3 className="mb-1 text-lg font-semibold text-foreground">What did you think?</h3>
              <p className="mb-5 text-sm text-muted-foreground">{filmTitle}</p>

              {/* Like / Dislike */}
              <div className="mb-5 flex gap-4">
                <button
                  onClick={() => setLiked(true)}
                  className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
                    liked === true
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ThumbsUp size={16} /> Liked it
                </button>
                <button
                  onClick={() => setLiked(false)}
                  className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
                    liked === false
                      ? "bg-destructive text-destructive-foreground"
                      : "border border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ThumbsDown size={16} /> Didn't like
                </button>
              </div>

              {/* Quick tags */}
              <p className="mb-2 text-xs text-muted-foreground">What stood out? (optional)</p>
              <div className="mb-4 flex flex-wrap gap-2">
                {TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`rounded-full px-3 py-1 text-xs transition-all ${
                      selectedTags.includes(tag)
                        ? "bg-accent text-foreground ring-1 ring-ring"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* Reason */}
              <textarea
                className="mb-4 w-full rounded border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Anything else? (optional)"
                rows={2}
                value={reason}
                onChange={e => setReason(e.target.value)}
              />

              <button
                onClick={handleSubmit}
                disabled={liked === null}
                className="w-full rounded bg-primary py-2.5 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                Submit
              </button>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
