import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  fetchProfiles,
  createProfile as apiCreateProfile,
  deleteProfile as apiDeleteProfile,
  activateProfile,
  fetchMyList,
  addToMyList,
  removeFromMyList,
  type DbProfile,
} from "@/lib/api";

export interface Profile {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface ProfileContextType {
  profiles: Profile[];
  activeProfile: Profile | null;
  loading: boolean;
  selectProfile: (profile: Profile) => void;
  addProfile: (name: string, color: string, icon: string) => Promise<void>;
  removeProfile: (id: string) => Promise<void>;
  logout: () => void;
  myList: string[];
  toggleMyList: (filmId: string) => void;
  isInMyList: (filmId: string) => boolean;
  refreshMyList: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | null>(null);

const PROFILE_COLORS = ["#e50914", "#0071eb", "#b4d455", "#e8b708", "#6d28d9", "#f97316"];
const PROFILE_ICONS = ["👤", "🎬", "🍿", "🎭", "🌟", "🎯"];

function dbToProfile(p: DbProfile): Profile {
  return { id: p.id, name: p.name, color: p.avatar?.color || "#e50914", icon: p.avatar?.icon || "👤" };
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [myList, setMyList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfiles()
      .then(data => {
        const mapped = data.map(dbToProfile);
        setProfiles(mapped);
        const cachedId = localStorage.getItem("stream_active_profile_id");
        if (cachedId) {
          const found = mapped.find(p => p.id === cachedId);
          if (found) setActiveProfile(found);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const refreshMyList = useCallback(async () => {
    if (!activeProfile) { setMyList([]); return; }
    try {
      const list = await fetchMyList(activeProfile.id);
      setMyList(list);
    } catch (e) {
      console.error(e);
    }
  }, [activeProfile]);

  useEffect(() => { refreshMyList(); }, [refreshMyList]);

  const selectProfile = useCallback((profile: Profile) => {
    setActiveProfile(profile);
    localStorage.setItem("stream_active_profile_id", profile.id);
    activateProfile(profile.id).catch(console.error);
  }, []);

  const addProfile = useCallback(async (name: string, color: string, icon: string) => {
    const created = await apiCreateProfile(name, color, icon);
    setProfiles(prev => [...prev, dbToProfile(created)]);
  }, []);

  const removeProfile = useCallback(async (id: string) => {
    await apiDeleteProfile(id);
    setProfiles(prev => prev.filter(p => p.id !== id));
    setActiveProfile(prev => (prev?.id === id ? null : prev));
    if (localStorage.getItem("stream_active_profile_id") === id) {
      localStorage.removeItem("stream_active_profile_id");
    }
  }, []);

  const logout = useCallback(() => {
    setActiveProfile(null);
    localStorage.removeItem("stream_active_profile_id");
  }, []);

  const toggleMyList = useCallback(async (filmId: string) => {
    if (!activeProfile) return;
    if (myList.includes(filmId)) {
      setMyList(prev => prev.filter(f => f !== filmId));
      await removeFromMyList(activeProfile.id, filmId).catch(console.error);
    } else {
      setMyList(prev => [...prev, filmId]);
      await addToMyList(activeProfile.id, filmId).catch(console.error);
    }
  }, [activeProfile, myList]);

  const isInMyList = useCallback((filmId: string) => myList.includes(filmId), [myList]);

  return (
    <ProfileContext.Provider value={{
      profiles, activeProfile, loading, selectProfile, addProfile, removeProfile, logout,
      myList, toggleMyList, isInMyList, refreshMyList,
    }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}

export { PROFILE_COLORS, PROFILE_ICONS };
