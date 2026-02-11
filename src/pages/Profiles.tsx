import { useState } from "react";
import { motion } from "framer-motion";
import { useProfile, PROFILE_COLORS, PROFILE_ICONS, Profile } from "@/contexts/ProfileContext";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, X } from "lucide-react";

export default function Profiles() {
  const { profiles, selectProfile, addProfile, deleteProfile } = useProfile();
  const navigate = useNavigate();
  const [isManaging, setIsManaging] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PROFILE_COLORS[0]);
  const [newIcon, setNewIcon] = useState(PROFILE_ICONS[0]);

  const handleSelect = (profile: Profile) => {
    if (isManaging) return;
    selectProfile(profile);
    navigate("/home");
  };

  const handleAdd = () => {
    if (!newName.trim()) return;
    addProfile(newName.trim(), newColor, newIcon);
    setNewName("");
    setShowAdd(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <motion.h1
        className="mb-10 text-3xl font-medium text-foreground md:text-5xl"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Who's watching?
      </motion.h1>

      <div className="flex flex-wrap justify-center gap-6">
        {profiles.map((profile, i) => (
          <motion.button
            key={profile.id}
            className="group flex flex-col items-center gap-2"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1, duration: 0.3 }}
            onClick={() => handleSelect(profile)}
          >
            <div className="relative">
              <div
                className="flex h-24 w-24 items-center justify-center rounded-md text-4xl transition-all duration-200 group-hover:ring-2 group-hover:ring-foreground md:h-32 md:w-32"
                style={{ backgroundColor: profile.color }}
              >
                {profile.icon}
              </div>
              {isManaging && profiles.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); deleteProfile(profile.id); }}
                  className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <span className="text-sm text-muted-foreground transition-colors group-hover:text-foreground">
              {profile.name}
            </span>
          </motion.button>
        ))}

        {profiles.length < 5 && !showAdd && (
          <motion.button
            className="group flex flex-col items-center gap-2"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: profiles.length * 0.1 }}
            onClick={() => setShowAdd(true)}
          >
            <div className="flex h-24 w-24 items-center justify-center rounded-md border-2 border-muted-foreground/30 text-muted-foreground transition-colors group-hover:border-foreground group-hover:text-foreground md:h-32 md:w-32">
              <Plus size={48} />
            </div>
            <span className="text-sm text-muted-foreground">Add Profile</span>
          </motion.button>
        )}
      </div>

      {showAdd && (
        <motion.div
          className="mt-8 w-full max-w-sm rounded-lg border border-border bg-card p-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-medium text-foreground">Add Profile</h3>
            <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground">
              <X size={20} />
            </button>
          </div>
          <input
            className="mb-4 w-full rounded border border-border bg-secondary px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            autoFocus
          />
          <div className="mb-4 flex gap-2">
            {PROFILE_COLORS.map(c => (
              <button
                key={c}
                className={`h-8 w-8 rounded-full transition-all ${newColor === c ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""}`}
                style={{ backgroundColor: c }}
                onClick={() => setNewColor(c)}
              />
            ))}
          </div>
          <div className="mb-4 flex gap-2">
            {PROFILE_ICONS.map(icon => (
              <button
                key={icon}
                className={`flex h-10 w-10 items-center justify-center rounded text-xl transition-all ${newIcon === icon ? "bg-accent ring-2 ring-foreground" : "bg-secondary"}`}
                onClick={() => setNewIcon(icon)}
              >
                {icon}
              </button>
            ))}
          </div>
          <button
            onClick={handleAdd}
            className="w-full rounded bg-primary py-2 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Add
          </button>
        </motion.div>
      )}

      <motion.button
        className="mt-10 rounded border border-muted-foreground/40 px-6 py-2 text-sm text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        onClick={() => setIsManaging(!isManaging)}
      >
        {isManaging ? "Done" : "Manage Profiles"}
      </motion.button>
    </div>
  );
}
