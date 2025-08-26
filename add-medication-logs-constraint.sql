-- Add unique constraint for medication_logs to prevent duplicates
-- This allows upsert operations to work properly

ALTER TABLE public.medication_logs 
ADD CONSTRAINT medication_logs_medication_id_scheduled_time_scheduled_date_user_id_key 
UNIQUE (medication_id, scheduled_time, scheduled_date, user_id);

-- Add index for better performance on this constraint
CREATE INDEX IF NOT EXISTS idx_medication_logs_unique 
ON public.medication_logs (medication_id, scheduled_time, scheduled_date, user_id);


