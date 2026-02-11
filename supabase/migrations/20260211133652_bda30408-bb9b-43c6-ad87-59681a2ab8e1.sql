
-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  avatar_color TEXT NOT NULL DEFAULT '#e50914',
  avatar_icon TEXT NOT NULL DEFAULT '👤',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Public access (no auth users - profiles ARE the users in this app)
CREATE POLICY "Allow all access to profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- My List (per profile)
CREATE TABLE public.my_list (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  film_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, film_id)
);

ALTER TABLE public.my_list ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to my_list" ON public.my_list FOR ALL USING (true) WITH CHECK (true);

-- Ratings / Survey
CREATE TABLE public.ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  film_id TEXT NOT NULL,
  liked BOOLEAN,
  survey_enjoyed BOOLEAN,
  survey_reason TEXT,
  survey_tags TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, film_id)
);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to ratings" ON public.ratings FOR ALL USING (true) WITH CHECK (true);

-- Watch History
CREATE TABLE public.watch_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  film_id TEXT NOT NULL,
  last_position_sec DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_watched_sec DOUBLE PRECISION NOT NULL DEFAULT 0,
  duration_sec DOUBLE PRECISION NOT NULL DEFAULT 0,
  completion_pct DOUBLE PRECISION NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  last_watched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, film_id)
);

ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to watch_history" ON public.watch_history FOR ALL USING (true) WITH CHECK (true);

-- Watch Events (play/pause/stop/ended)
CREATE TABLE public.watch_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  film_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('PLAY', 'PAUSE', 'STOP', 'ENDED')),
  position_sec DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.watch_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to watch_events" ON public.watch_events FOR ALL USING (true) WITH CHECK (true);

-- Indexes for common queries
CREATE INDEX idx_my_list_profile ON public.my_list(profile_id);
CREATE INDEX idx_ratings_profile ON public.ratings(profile_id);
CREATE INDEX idx_watch_history_profile ON public.watch_history(profile_id);
CREATE INDEX idx_watch_history_continue ON public.watch_history(profile_id) WHERE completed = false AND total_watched_sec > 0;
CREATE INDEX idx_watch_events_profile ON public.watch_events(profile_id, film_id);
