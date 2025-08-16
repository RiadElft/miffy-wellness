-- Miffy Wellness App Database Schema (idempotent)
-- Safe to re-run without duplicate object errors

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types (safe on re-run)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('owner', 'partner', 'guardian');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE medication_frequency AS ENUM ('daily', 'twice_daily', 'three_times_daily', 'weekly', 'as_needed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE mood_type AS ENUM ('sunny', 'partly-cloudy', 'cloudy', 'rainy', 'stormy', 'rainbow', 'starry');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE sleep_quality AS ENUM ('excellent', 'good', 'fair', 'poor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE todo_priority AS ENUM ('low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE todo_status AS ENUM ('pending', 'in_progress', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE todo_category AS ENUM ('wellness', 'daily', 'social', 'work', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE activity_type AS ENUM ('movie', 'game', 'date', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE activity_priority AS ENUM ('low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE activity_status AS ENUM ('wishlist', 'planned', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    date_of_birth DATE,
    emergency_contact TEXT,
    emergency_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Couples table
CREATE TABLE IF NOT EXISTS public.couples (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT,
    created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Couple members table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.couple_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    role user_role DEFAULT 'partner',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(couple_id, user_id)
);

-- Medications table
CREATE TABLE IF NOT EXISTS public.medications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    frequency medication_frequency NOT NULL,
    times TEXT[] NOT NULL, -- Array of time strings like ["09:00", "21:00"]
    color TEXT NOT NULL, -- CSS color class
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Medication logs table
CREATE TABLE IF NOT EXISTS public.medication_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    medication_id UUID REFERENCES public.medications(id) ON DELETE CASCADE,
    couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    scheduled_time TIME NOT NULL,
    scheduled_date DATE NOT NULL,
    taken_at TIMESTAMP WITH TIME ZONE,
    skipped BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(medication_id, scheduled_time, scheduled_date)
);

-- Handle column name migration if needed
DO $$ 
BEGIN
    -- Check if the table exists but with different column name
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'medication_logs' 
        AND table_schema = 'public' 
        AND column_name = 'date'
    ) THEN
        -- Rename 'date' to 'scheduled_date' if it exists
        ALTER TABLE public.medication_logs RENAME COLUMN date TO scheduled_date;
    END IF;
END $$;

-- Mood entries table
CREATE TABLE IF NOT EXISTS public.mood_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
    mood_id mood_type NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sleep entries table
CREATE TABLE IF NOT EXISTS public.sleep_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    bedtime TIME NOT NULL,
    wake_time TIME NOT NULL,
    quality INTEGER NOT NULL CHECK (quality >= 1 AND quality <= 5),
    duration DECIMAL(4,1) NOT NULL, -- Hours with one decimal place
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Todos table
CREATE TABLE IF NOT EXISTS public.todos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    priority todo_priority DEFAULT 'medium',
    status todo_status DEFAULT 'pending',
    category todo_category DEFAULT 'other',
    due_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Calendar events table
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    location TEXT,
    event_type TEXT DEFAULT 'appointment',
    is_all_day BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Couples activities table
CREATE TABLE IF NOT EXISTS public.couple_activities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE,
    added_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type activity_type NOT NULL,
    description TEXT,
    priority activity_priority DEFAULT 'medium',
    status activity_status DEFAULT 'wishlist',
    planned_date DATE,
    completed_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_medications_couple_id ON public.medications(couple_id);
CREATE INDEX IF NOT EXISTS idx_medications_user_id ON public.medications(user_id);
CREATE INDEX IF NOT EXISTS idx_medication_logs_medication_id ON public.medication_logs(medication_id);
CREATE INDEX IF NOT EXISTS idx_medication_logs_couple_id ON public.medication_logs(couple_id);
CREATE INDEX IF NOT EXISTS idx_medication_logs_date ON public.medication_logs(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_mood_entries_couple_id ON public.mood_entries(couple_id);
CREATE INDEX IF NOT EXISTS idx_mood_entries_user_id ON public.mood_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_entries_created_at ON public.mood_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_sleep_entries_couple_id ON public.sleep_entries(couple_id);
CREATE INDEX IF NOT EXISTS idx_sleep_entries_user_id ON public.sleep_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_sleep_entries_date ON public.sleep_entries(date);
CREATE INDEX IF NOT EXISTS idx_todos_couple_id ON public.todos(couple_id);
CREATE INDEX IF NOT EXISTS idx_todos_user_id ON public.todos(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_status ON public.todos(status);
CREATE INDEX IF NOT EXISTS idx_calendar_events_couple_id ON public.calendar_events(couple_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON public.calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON public.calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_couple_activities_couple_id ON public.couple_activities(couple_id);
CREATE INDEX IF NOT EXISTS idx_couple_members_couple_id ON public.couple_members(couple_id);
CREATE INDEX IF NOT EXISTS idx_couple_members_user_id ON public.couple_members(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- (Re)create triggers for updated_at (drop first to avoid duplicates)
DO $$ BEGIN
    DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
    CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END $$;

DO $$ BEGIN
    DROP TRIGGER IF EXISTS update_couples_updated_at ON public.couples;
    CREATE TRIGGER update_couples_updated_at BEFORE UPDATE ON public.couples FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END $$;

DO $$ BEGIN
    DROP TRIGGER IF EXISTS update_medications_updated_at ON public.medications;
    CREATE TRIGGER update_medications_updated_at BEFORE UPDATE ON public.medications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END $$;

DO $$ BEGIN
    DROP TRIGGER IF EXISTS update_todos_updated_at ON public.todos;
    CREATE TRIGGER update_todos_updated_at BEFORE UPDATE ON public.todos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END $$;

DO $$ BEGIN
    DROP TRIGGER IF EXISTS update_calendar_events_updated_at ON public.calendar_events;
    CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END $$;

DO $$ BEGIN
    DROP TRIGGER IF EXISTS update_couple_activities_updated_at ON public.couple_activities;
    CREATE TRIGGER update_couple_activities_updated_at BEFORE UPDATE ON public.couple_activities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END $$;

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sleep_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop and recreate for idempotency)

-- Users policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
    CREATE POLICY "Users can view own profile" ON public.users
        FOR SELECT USING (auth.uid() = id);
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
    CREATE POLICY "Users can update own profile" ON public.users
        FOR UPDATE USING (auth.uid() = id);
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
    CREATE POLICY "Users can insert own profile" ON public.users
        FOR INSERT WITH CHECK (auth.uid() = id);
END $$;

-- Couples policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Couple members can view couple" ON public.couples;
    CREATE POLICY "Couple members can view couple" ON public.couples
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.couple_members 
                WHERE couple_id = id AND user_id = auth.uid()
            )
        );
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Couple owners can update couple" ON public.couples;
    CREATE POLICY "Couple owners can update couple" ON public.couples
        FOR UPDATE USING (created_by = auth.uid());
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can create couples" ON public.couples;
    CREATE POLICY "Users can create couples" ON public.couples
        FOR INSERT WITH CHECK (created_by = auth.uid());
END $$;

-- Couple members policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Couple members can view members" ON public.couple_members;
    CREATE POLICY "Couple members can view members" ON public.couple_members
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.couple_members cm
                WHERE cm.couple_id = couple_id AND cm.user_id = auth.uid()
            )
        );
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Couple owners can manage members" ON public.couple_members;
    CREATE POLICY "Couple owners can manage members" ON public.couple_members
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM public.couples c
                WHERE c.id = couple_id AND c.created_by = auth.uid()
            )
        );
END $$;

-- Medications policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Couple members can view medications" ON public.medications;
    CREATE POLICY "Couple members can view medications" ON public.medications
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.couple_members 
                WHERE couple_id = medications.couple_id AND user_id = auth.uid()
            )
        );
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can manage own medications" ON public.medications;
    CREATE POLICY "Users can manage own medications" ON public.medications
        FOR ALL USING (user_id = auth.uid());
END $$;

-- Medication logs policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Couple members can view medication logs" ON public.medication_logs;
    CREATE POLICY "Couple members can view medication logs" ON public.medication_logs
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.couple_members 
                WHERE couple_id = medication_logs.couple_id AND user_id = auth.uid()
            )
        );
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can manage own medication logs" ON public.medication_logs;
    CREATE POLICY "Users can manage own medication logs" ON public.medication_logs
        FOR ALL USING (user_id = auth.uid());
END $$;

-- Mood entries policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Couple members can view mood entries" ON public.mood_entries;
    CREATE POLICY "Couple members can view mood entries" ON public.mood_entries
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.couple_members 
                WHERE couple_id = mood_entries.couple_id AND user_id = auth.uid()
            )
        );
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can manage own mood entries" ON public.mood_entries;
    CREATE POLICY "Users can manage own mood entries" ON public.mood_entries
        FOR ALL USING (user_id = auth.uid());
END $$;

-- Sleep entries policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Couple members can view sleep entries" ON public.sleep_entries;
    CREATE POLICY "Couple members can view sleep entries" ON public.sleep_entries
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.couple_members 
                WHERE couple_id = sleep_entries.couple_id AND user_id = auth.uid()
            )
        );
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can manage own sleep entries" ON public.sleep_entries;
    CREATE POLICY "Users can manage own sleep entries" ON public.sleep_entries
        FOR ALL USING (user_id = auth.uid());
END $$;

-- Todos policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Couple members can view todos" ON public.todos;
    CREATE POLICY "Couple members can view todos" ON public.todos
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.couple_members 
                WHERE couple_id = todos.couple_id AND user_id = auth.uid()
            )
        );
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can manage own todos" ON public.todos;
    CREATE POLICY "Users can manage own todos" ON public.todos
        FOR ALL USING (user_id = auth.uid());
END $$;

-- Calendar events policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Couple members can view calendar events" ON public.calendar_events;
    CREATE POLICY "Couple members can view calendar events" ON public.calendar_events
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.couple_members 
                WHERE couple_id = calendar_events.couple_id AND user_id = auth.uid()
            )
        );
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can manage own calendar events" ON public.calendar_events;
    CREATE POLICY "Users can manage own calendar events" ON public.calendar_events
        FOR ALL USING (user_id = auth.uid());
END $$;

-- Couple activities policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Couple members can view activities" ON public.couple_activities;
    CREATE POLICY "Couple members can view activities" ON public.couple_activities
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.couple_members 
                WHERE couple_id = couple_activities.couple_id AND user_id = auth.uid()
            )
        );
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Couple members can manage activities" ON public.couple_activities;
    CREATE POLICY "Couple members can manage activities" ON public.couple_activities
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM public.couple_members 
                WHERE couple_id = couple_activities.couple_id AND user_id = auth.uid()
            )
        );
END $$;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user profile on signup
DO $$ BEGIN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
END $$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Migration section to handle any existing schema inconsistencies
DO $$ 
BEGIN
    -- Ensure medication_logs has the correct column name
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'medication_logs' 
        AND table_schema = 'public' 
        AND column_name = 'date'
    ) THEN
        ALTER TABLE public.medication_logs RENAME COLUMN date TO scheduled_date;
    END IF;
    
    -- Add any missing columns that might be needed
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'medication_logs' 
        AND table_schema = 'public' 
        AND column_name = 'scheduled_date'
    ) THEN
        ALTER TABLE public.medication_logs ADD COLUMN scheduled_date DATE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'medication_logs' 
        AND table_schema = 'public' 
        AND column_name = 'scheduled_time'
    ) THEN
        ALTER TABLE public.medication_logs ADD COLUMN scheduled_time TIME;
    END IF;
    
    -- Add category column to todos if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'todos' 
        AND table_schema = 'public' 
        AND column_name = 'category'
    ) THEN
        ALTER TABLE public.todos ADD COLUMN category todo_category DEFAULT 'other';
    END IF;
END $$;


