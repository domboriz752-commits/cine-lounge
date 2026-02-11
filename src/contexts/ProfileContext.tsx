import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface Profile {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface ProfileContextType {
  profiles: Profile[];
  activeProfile: Profile | null;
  selectProfile: (profile: Profile) => void;
  addProfile: (name: string, color: string, icon: string) => void;
  deleteProfile: (id: string) => void;
  logout: () => void;
  myList: string[];
  toggleMyList: (filmId: string) => void;
  isInMyList: (filmId: string) => boolean;
  getPlaybackTime: (filmId: string) => number;
  setPlaybackTime: (filmId: string, time: number) => void;
}

const ProfileContext = createContext<ProfileContextType | null>(null);

const PROFILE_COLORS = ["#e50914", "#0071eb", "#b4d455", "#e8b708", "#6d28d9", "#f97316"];
const PROFILE_ICONS = ["👤", "🎬", "🍿", "🎭", "🌟", "🎯"];

const STORAGE_KEYS = {
  profiles: "stream_profiles",
  active: "stream_active_profile",
  myList: (id: string) => `stream_mylist_${id}`,
  playback: (profileId: string) => `stream_playback_${profileId}`,
};

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>(() =>
    loadJSON(STORAGE_KEYS.profiles, [
      { id: "1", name: "User 1", color: PROFILE_COLORS[0], icon: PROFILE_ICONS[0] },
      { id: "2", name: "User 2", color: PROFILE_COLORS[1], icon: PROFILE_ICONS[1] },
    ])
  );

  const [activeProfile, setActiveProfile] = useState<Profile | null>(() =>
    loadJSON(STORAGE_KEYS.active, null)
  );

  const [myList, setMyList] = useState<string[]>([]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.profiles, JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    if (activeProfile) {
      localStorage.setItem(STORAGE_KEYS.active, JSON.stringify(activeProfile));
      setMyList(loadJSON(STORAGE_KEYS.myList(activeProfile.id), []));
    } else {
      localStorage.removeItem(STORAGE_KEYS.active);
    }
  }, [activeProfile]);

  useEffect(() => {
    if (activeProfile) {
      localStorage.setItem(STORAGE_KEYS.myList(activeProfile.id), JSON.stringify(myList));
    }
  }, [myList, activeProfile]);

  const selectProfile = useCallback((profile: Profile) => setActiveProfile(profile), []);

  const addProfile = useCallback((name: string, color: string, icon: string) => {
    const newProfile: Profile = { id: Date.now().toString(), name, color, icon };
    setProfiles(prev => [...prev, newProfile]);
  }, []);

  const deleteProfile = useCallback((id: string) => {
    setProfiles(prev => prev.filter(p => p.id !== id));
    setActiveProfile(prev => (prev?.id === id ? null : prev));
  }, []);

  const logout = useCallback(() => setActiveProfile(null), []);

  const toggleMyList = useCallback((filmId: string) => {
    setMyList(prev => prev.includes(filmId) ? prev.filter(f => f !== filmId) : [...prev, filmId]);
  }, []);

  const isInMyList = useCallback((filmId: string) => myList.includes(filmId), [myList]);

  const getPlaybackTime = useCallback((filmId: string) => {
    if (!activeProfile) return 0;
    const data = loadJSON<Record<string, number>>(STORAGE_KEYS.playback(activeProfile.id), {});
    return data[filmId] || 0;
  }, [activeProfile]);

  const setPlaybackTime = useCallback((filmId: string, time: number) => {
    if (!activeProfile) return;
    const key = STORAGE_KEYS.playback(activeProfile.id);
    const data = loadJSON<Record<string, number>>(key, {});
    data[filmId] = time;
    localStorage.setItem(key, JSON.stringify(data));
  }, [activeProfile]);

  return (
    <ProfileContext.Provider value={{
      profiles, activeProfile, selectProfile, addProfile, deleteProfile, logout,
      myList, toggleMyList, isInMyList, getPlaybackTime, setPlaybackTime,
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
