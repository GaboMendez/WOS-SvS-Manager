
CREATE TABLE public.imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  raw_csv text NOT NULL,
  row_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.imports TO anon, authenticated;
GRANT ALL ON public.imports TO service_role;
ALTER TABLE public.imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "imports_public" ON public.imports FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.players (
  player_id text PRIMARY KEY,
  name text NOT NULL,
  alliance text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.players TO anon, authenticated;
GRANT ALL ON public.players TO service_role;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "players_public" ON public.players FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.submissions (
  player_id text PRIMARY KEY REFERENCES public.players(player_id) ON DELETE CASCADE,
  import_id uuid REFERENCES public.imports(id) ON DELETE SET NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  requests_monday boolean NOT NULL DEFAULT false,
  mon_normal_fc numeric NOT NULL DEFAULT 0,
  mon_refined_fc numeric NOT NULL DEFAULT 0,
  mon_speedup_days numeric NOT NULL DEFAULT 0,
  mon_hours integer[] NOT NULL DEFAULT '{}',
  requests_tuesday boolean NOT NULL DEFAULT false,
  tue_speedup_days numeric NOT NULL DEFAULT 0,
  tue_shards numeric NOT NULL DEFAULT 0,
  tue_hours integer[] NOT NULL DEFAULT '{}',
  requests_thursday boolean NOT NULL DEFAULT false,
  thu_speedup_days numeric NOT NULL DEFAULT 0,
  thu_hours integer[] NOT NULL DEFAULT '{}',
  comment text NOT NULL DEFAULT ''
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.submissions TO anon, authenticated;
GRANT ALL ON public.submissions TO service_role;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "submissions_public" ON public.submissions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day text NOT NULL,
  slot text NOT NULL,
  player_id text NOT NULL,
  alliance text NOT NULL DEFAULT '',
  score numeric NOT NULL DEFAULT 0,
  UNIQUE (day, slot)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO anon, authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appointments_public" ON public.appointments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day text NOT NULL,
  player_id text NOT NULL,
  alliance text NOT NULL DEFAULT '',
  score numeric NOT NULL DEFAULT 0,
  reason text NOT NULL DEFAULT 'no capacity in preferred hours',
  UNIQUE (day, player_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.waitlist TO anon, authenticated;
GRANT ALL ON public.waitlist TO service_role;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "waitlist_public" ON public.waitlist FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.settings (
  id integer PRIMARY KEY DEFAULT 1,
  weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT settings_single_row CHECK (id = 1)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO anon, authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_public" ON public.settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO public.settings (id, weights) VALUES (1, '{
  "normalFireCrystal": 2000,
  "refinedFireCrystal": 30000,
  "mondaySpeedupDay": 0,
  "fireCrystalShard": 1000,
  "researchSpeedupMinute": 30,
  "daysToMinutes": 1440,
  "trainingSpeedupDay": 1
}'::jsonb);
