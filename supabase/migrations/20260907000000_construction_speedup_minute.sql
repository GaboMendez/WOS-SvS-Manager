-- Replace the unused mondaySpeedupDay weight with constructionSpeedupMinute (points per minute,
-- converted from mon_speedup_days via daysToMinutes), mirroring researchSpeedupMinute.
UPDATE public.settings
SET weights = (weights - 'mondaySpeedupDay') || '{"constructionSpeedupMinute": 30}'::jsonb
WHERE id = 1;
