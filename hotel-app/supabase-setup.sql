-- ============================================================
-- HOTELOPS — SUPABASE SCHEMA
-- Run this entire file in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. PROFILES TABLE (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'housekeeper', -- 'admin' | 'housekeeper' | 'inspector' | 'maintenance' | 'supervisor'
  floors INTEGER[],                          -- which floors this person is responsible for
  avatar_initial TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. HOTEL CONFIG
CREATE TABLE IF NOT EXISTS hotel_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  name TEXT NOT NULL DEFAULT 'Grand Meridian Hotel',
  address TEXT,
  phone TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO hotel_config (id, name) VALUES (1, 'Grand Meridian Hotel') ON CONFLICT DO NOTHING;

-- 3. ROOMS TABLE
CREATE TABLE IF NOT EXISTS rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_number TEXT NOT NULL UNIQUE,
  floor INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready',
  -- status options: 'occupied' | 'checked_out' | 'in_progress' | 'inspection' | 'ready' | 'maintenance' | 'dnd'
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  clean_effort TEXT,                         -- 'Light' | 'Normal' | 'Heavy'
  priority BOOLEAN DEFAULT FALSE,
  guest_prefs TEXT,
  dnd_since TIMESTAMPTZ,
  last_cleaned_at TIMESTAMPTZ DEFAULT NOW(),
  checkout_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. MAINTENANCE TICKETS
CREATE TABLE IF NOT EXISTS maintenance_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
  note TEXT NOT NULL,
  status TEXT DEFAULT 'open',               -- 'open' | 'resolved'
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ACTIVITY LOG
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_config ENABLE ROW LEVEL SECURITY;

-- Profiles: everyone can read, only self can update own profile
CREATE POLICY "Profiles are viewable by authenticated users" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin can insert profiles" ON profiles
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Rooms: all authenticated users can read and update
CREATE POLICY "Rooms viewable by all staff" ON rooms
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Rooms updatable by all staff" ON rooms
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admin can insert rooms" ON rooms
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admin can delete rooms" ON rooms
  FOR DELETE USING (auth.role() = 'authenticated');

-- Maintenance tickets
CREATE POLICY "Tickets viewable by all staff" ON maintenance_tickets
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Tickets insertable by all staff" ON maintenance_tickets
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Tickets updatable by all staff" ON maintenance_tickets
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Activity log
CREATE POLICY "Log viewable by all staff" ON activity_log
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Log insertable by all staff" ON activity_log
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Hotel config
CREATE POLICY "Config viewable by all staff" ON hotel_config
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Config updatable by all staff" ON hotel_config
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Config insertable" ON hotel_config
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP (trigger)
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email, role, floors, avatar_initial)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'housekeeper'),
    CASE
      WHEN NEW.raw_user_meta_data->'floors' IS NOT NULL
      THEN ARRAY(SELECT (jsonb_array_elements_text(NEW.raw_user_meta_data->'floors'))::INTEGER)
      ELSE NULL
    END,
    UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ENABLE REAL-TIME for live updates
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;
ALTER PUBLICATION supabase_realtime ADD TABLE maintenance_tickets;

-- ============================================================
-- SEED: SAMPLE ROOMS (4 floors, 8 rooms each)
-- Adjust or delete this section for your real hotel layout
-- ============================================================
DO $$
DECLARE
  floor_num INT;
  room_num INT;
  statuses TEXT[] := ARRAY['occupied','occupied','occupied','checked_out','ready','ready','in_progress','dnd'];
BEGIN
  FOR floor_num IN 1..4 LOOP
    FOR room_num IN 1..8 LOOP
      INSERT INTO rooms (room_number, floor, status, last_cleaned_at)
      VALUES (
        floor_num::TEXT || LPAD(room_num::TEXT, 2, '0'),
        floor_num,
        statuses[((floor_num * room_num) % array_length(statuses, 1)) + 1],
        NOW() - (random() * INTERVAL '48 hours')
      )
      ON CONFLICT (room_number) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- ============================================================
-- DONE! Now create your users in Authentication → Users
-- ============================================================
