-- Add unique constraints for all tables to prevent duplicates and enable upsert operations

-- Medication logs: One log per medication per time per date per user
ALTER TABLE public.medication_logs 
ADD CONSTRAINT medication_logs_medication_id_scheduled_time_scheduled_date_user_id_key 
UNIQUE (medication_id, scheduled_time, scheduled_date, user_id);

-- Sleep entries: One entry per user per date
ALTER TABLE public.sleep_entries 
ADD CONSTRAINT sleep_entries_user_id_date_key 
UNIQUE (user_id, date);

-- Mood entries: One entry per user per day (optional - remove if you want multiple mood entries per day)
-- ALTER TABLE public.mood_entries 
-- ADD CONSTRAINT mood_entries_user_id_date_key 
-- UNIQUE (user_id, DATE(created_at));

-- Couple members: One membership per user per couple
ALTER TABLE public.couple_members 
ADD CONSTRAINT couple_members_couple_id_user_id_key 
UNIQUE (couple_id, user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_medication_logs_unique 
ON public.medication_logs (medication_id, scheduled_time, scheduled_date, user_id);

CREATE INDEX IF NOT EXISTS idx_sleep_entries_unique 
ON public.sleep_entries (user_id, date);

CREATE INDEX IF NOT EXISTS idx_couple_members_unique 
ON public.couple_members (couple_id, user_id);


