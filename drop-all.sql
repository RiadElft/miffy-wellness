-- Drop All Database Objects Script
-- WARNING: This will completely remove all data and objects from your database
-- Run this only if you want to start completely fresh

-- Drop all triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS update_couples_updated_at ON public.couples;
DROP TRIGGER IF EXISTS update_medications_updated_at ON public.medications;
DROP TRIGGER IF EXISTS update_todos_updated_at ON public.todos;
DROP TRIGGER IF EXISTS update_calendar_events_updated_at ON public.calendar_events;
DROP TRIGGER IF EXISTS update_couple_activities_updated_at ON public.couple_activities;

-- Drop all functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Drop all tables (in dependency order)
DROP TABLE IF EXISTS public.medication_logs CASCADE;
DROP TABLE IF EXISTS public.medications CASCADE;
DROP TABLE IF EXISTS public.mood_entries CASCADE;
DROP TABLE IF EXISTS public.sleep_entries CASCADE;
DROP TABLE IF EXISTS public.todos CASCADE;
DROP TABLE IF EXISTS public.calendar_events CASCADE;
DROP TABLE IF EXISTS public.couple_activities CASCADE;
DROP TABLE IF EXISTS public.couple_members CASCADE;
DROP TABLE IF EXISTS public.couples CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop all custom types
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS medication_frequency CASCADE;
DROP TYPE IF EXISTS mood_type CASCADE;
DROP TYPE IF EXISTS sleep_quality CASCADE;
DROP TYPE IF EXISTS todo_priority CASCADE;
DROP TYPE IF EXISTS todo_status CASCADE;
DROP TYPE IF EXISTS todo_category CASCADE;
DROP TYPE IF EXISTS activity_type CASCADE;
DROP TYPE IF EXISTS activity_priority CASCADE;
DROP TYPE IF EXISTS activity_status CASCADE;

-- Drop all indexes (they should be dropped with tables, but just in case)
-- Note: Indexes are automatically dropped when tables are dropped

-- Revoke permissions
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
REVOKE USAGE ON SCHEMA public FROM anon, authenticated;

-- Optional: Drop the uuid-ossp extension if you want to remove everything
-- DROP EXTENSION IF EXISTS "uuid-ossp";

-- Reset the schema (optional - this will remove all objects from the public schema)
-- DROP SCHEMA IF EXISTS public CASCADE;
-- CREATE SCHEMA public;

-- Grant default permissions back to public schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON SCHEMA public TO anon, authenticated;

-- Verify everything is dropped
DO $$
DECLARE
    table_count INTEGER;
    type_count INTEGER;
    function_count INTEGER;
BEGIN
    -- Count remaining tables
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE';
    
    -- Count remaining types
    SELECT COUNT(*) INTO type_count 
    FROM pg_type 
    WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND typtype = 'e'; -- enum types
    
    -- Count remaining functions
    SELECT COUNT(*) INTO function_count 
    FROM pg_proc 
    WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    
    RAISE NOTICE 'Remaining objects: % tables, % enum types, % functions', 
        table_count, type_count, function_count;
        
    IF table_count = 0 AND type_count = 0 AND function_count = 0 THEN
        RAISE NOTICE 'Database successfully cleared! You can now run the schema script.';
    ELSE
        RAISE NOTICE 'Some objects may still exist. Check the counts above.';
    END IF;
END $$;
