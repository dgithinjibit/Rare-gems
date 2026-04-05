-- Dung Craft: Initial Database Schema
-- Run this script in your Supabase SQL editor or PostgreSQL database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- User accounts and profile information
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255), -- NULL for OAuth users
  avatar_url TEXT,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
  
  -- Stats
  total_beads_earned BIGINT DEFAULT 0,
  highest_level INTEGER DEFAULT 0,
  total_play_time_seconds INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  
  -- Status
  is_verified BOOLEAN DEFAULT FALSE,
  is_banned BOOLEAN DEFAULT FALSE
);

-- ============================================
-- GAME SAVES TABLE
-- Player game progress and state
-- ============================================
CREATE TABLE IF NOT EXISTS game_saves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  slot_number INTEGER NOT NULL CHECK (slot_number BETWEEN 1 AND 3),
  save_name VARCHAR(100) DEFAULT 'New Save',
  
  -- Game progress
  current_level INTEGER DEFAULT 1,
  beads INTEGER DEFAULT 0,
  total_beads_earned BIGINT DEFAULT 0,
  dung_piles_cleared INTEGER DEFAULT 0,
  play_time_seconds INTEGER DEFAULT 0,
  
  -- Player configuration
  tire_max FLOAT DEFAULT 100,
  tire_regen_rate FLOAT DEFAULT 0.5,
  
  -- Upgrades and unlocks (JSONB for flexibility)
  upgrades JSONB DEFAULT '[]'::JSONB,
  selected_beetle VARCHAR(50) DEFAULT 'scarab',
  equipped_tire VARCHAR(50) DEFAULT 'standard',
  unlocked_beetles JSONB DEFAULT '["scarab"]'::JSONB,
  unlocked_tires JSONB DEFAULT '["standard", "eco_chitin"]'::JSONB,
  
  -- World state
  world_seed BIGINT,
  world_state BYTEA, -- Compressed voxel data for large worlds
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one save per slot per user
  UNIQUE(user_id, slot_number)
);

-- ============================================
-- LEADERBOARD ENTRIES TABLE
-- Global and periodic high scores
-- ============================================
CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Score metrics
  score BIGINT NOT NULL,
  level_reached INTEGER NOT NULL,
  dung_piles_cleared INTEGER NOT NULL,
  play_time_seconds INTEGER NOT NULL,
  
  -- Metadata
  game_version VARCHAR(20),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Verification
  is_verified BOOLEAN DEFAULT FALSE,
  replay_data BYTEA, -- Optional replay for verification
  verification_notes TEXT
);

-- ============================================
-- ACHIEVEMENTS TABLE
-- Achievement definitions
-- ============================================
CREATE TABLE IF NOT EXISTS achievements (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon_url TEXT,
  points INTEGER DEFAULT 10,
  rarity VARCHAR(20) DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  
  -- Requirements (JSONB for flexible conditions)
  requirements JSONB DEFAULT '{}'::JSONB,
  
  -- Hidden achievements
  is_hidden BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USER ACHIEVEMENTS TABLE
-- Junction table for user achievement unlocks
-- ============================================
CREATE TABLE IF NOT EXISTS user_achievements (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id VARCHAR(50) REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, achievement_id)
);

-- ============================================
-- SESSIONS TABLE
-- For custom JWT authentication
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  refresh_token_hash VARCHAR(255) NOT NULL,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

-- ============================================
-- INDEXES
-- Performance optimization
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_game_saves_user ON game_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_game_saves_updated ON game_saves(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard_entries(score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_user ON leaderboard_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_date ON leaderboard_entries(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh ON sessions(refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- Supabase security policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
-- Anyone can read public profile info
CREATE POLICY profiles_select ON profiles 
  FOR SELECT USING (true);

-- Users can only update their own profile
CREATE POLICY profiles_update ON profiles 
  FOR UPDATE USING (auth.uid() = id);

-- Game saves policies
-- Users can only access their own saves
CREATE POLICY saves_select ON game_saves 
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY saves_insert ON game_saves 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY saves_update ON game_saves 
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY saves_delete ON game_saves 
  FOR DELETE USING (auth.uid() = user_id);

-- Leaderboard policies
-- Anyone can read leaderboard
CREATE POLICY leaderboard_select ON leaderboard_entries 
  FOR SELECT USING (true);

-- Users can only insert their own scores
CREATE POLICY leaderboard_insert ON leaderboard_entries 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User achievements policies
-- Anyone can read achievements (for profile pages)
CREATE POLICY user_achievements_select ON user_achievements 
  FOR SELECT USING (true);

-- Sessions policies (admin only for direct access)
CREATE POLICY sessions_select ON sessions 
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS
-- Automatic timestamp updates
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to profiles
DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at 
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to game_saves
DROP TRIGGER IF EXISTS game_saves_updated_at ON game_saves;
CREATE TRIGGER game_saves_updated_at 
  BEFORE UPDATE ON game_saves
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INITIAL DATA
-- Seed achievements
-- ============================================

INSERT INTO achievements (id, name, description, points, rarity) VALUES
  ('first_bite', 'First Bite', 'Destroy your first dung voxel', 5, 'common'),
  ('pile_clearer', 'Pile Clearer', 'Clear your first complete dung pile', 10, 'common'),
  ('level_5', 'Rising Star', 'Reach level 5', 20, 'common'),
  ('level_10', 'Experienced Beetle', 'Reach level 10', 50, 'uncommon'),
  ('level_25', 'Dung Master', 'Reach level 25', 100, 'rare'),
  ('level_50', 'Savanna Legend', 'Reach level 50', 250, 'epic'),
  ('bead_collector_100', 'Bead Collector', 'Earn 100 beads', 15, 'common'),
  ('bead_collector_1000', 'Bead Hoarder', 'Earn 1,000 beads', 50, 'uncommon'),
  ('bead_collector_10000', 'Bead Baron', 'Earn 10,000 beads', 150, 'rare'),
  ('speed_demon', 'Speed Demon', 'Clear 10 voxels in 5 seconds', 30, 'uncommon'),
  ('combo_master', 'Combo Master', 'Achieve a 50x combo', 75, 'rare'),
  ('no_exhaustion', 'Iron Will', 'Complete a level without exhaustion', 40, 'uncommon'),
  ('first_upgrade', 'Tool Time', 'Purchase your first upgrade', 10, 'common'),
  ('all_upgrades', 'Fully Equipped', 'Purchase all upgrades', 200, 'epic'),
  ('portal_traveler', 'Portal Traveler', 'Use the global portal', 25, 'common'),
  ('beetle_collector', 'Beetle Collector', 'Unlock all beetle types', 150, 'rare'),
  ('tire_specialist', 'Tire Specialist', 'Unlock all tire types', 150, 'rare'),
  ('marathon', 'Marathon Runner', 'Play for 1 hour total', 50, 'uncommon'),
  ('dedicated', 'Dedicated', 'Play for 10 hours total', 200, 'rare'),
  ('perfect_run', 'Perfect Run', 'Clear 100 piles without dying', 500, 'legendary')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- VIEWS
-- Convenient data access
-- ============================================

-- Leaderboard view with user info
CREATE OR REPLACE VIEW leaderboard_view AS
SELECT 
  le.id,
  le.user_id,
  p.username,
  p.avatar_url,
  le.score,
  le.level_reached,
  le.dung_piles_cleared,
  le.play_time_seconds,
  le.submitted_at,
  le.is_verified,
  RANK() OVER (ORDER BY le.score DESC) as rank
FROM leaderboard_entries le
JOIN profiles p ON le.user_id = p.id
WHERE p.is_banned = false
ORDER BY le.score DESC;

-- User stats view
CREATE OR REPLACE VIEW user_stats_view AS
SELECT 
  p.id as user_id,
  p.username,
  p.total_beads_earned,
  p.highest_level,
  p.total_play_time_seconds,
  COUNT(DISTINCT ua.achievement_id) as achievements_count,
  COALESCE(SUM(a.points), 0) as achievement_points,
  (SELECT MAX(score) FROM leaderboard_entries WHERE user_id = p.id) as best_score,
  (SELECT MIN(rank) FROM leaderboard_view WHERE user_id = p.id) as best_rank
FROM profiles p
LEFT JOIN user_achievements ua ON p.id = ua.user_id
LEFT JOIN achievements a ON ua.achievement_id = a.id
GROUP BY p.id, p.username, p.total_beads_earned, p.highest_level, p.total_play_time_seconds;

-- ============================================
-- FUNCTIONS
-- Helper functions
-- ============================================

-- Function to get user's rank
CREATE OR REPLACE FUNCTION get_user_rank(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_rank INTEGER;
BEGIN
  SELECT rank INTO v_rank
  FROM leaderboard_view
  WHERE user_id = p_user_id
  ORDER BY submitted_at DESC
  LIMIT 1;
  
  RETURN COALESCE(v_rank, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION check_achievements(p_user_id UUID)
RETURNS TABLE(achievement_id VARCHAR(50), newly_unlocked BOOLEAN) AS $$
DECLARE
  v_stats RECORD;
BEGIN
  -- Get user stats
  SELECT * INTO v_stats FROM user_stats_view WHERE user_id = p_user_id;
  
  -- Check each achievement (simplified - expand as needed)
  -- This would be called after game events
  
  RETURN QUERY
  SELECT a.id, NOT EXISTS(
    SELECT 1 FROM user_achievements ua 
    WHERE ua.user_id = p_user_id AND ua.achievement_id = a.id
  )
  FROM achievements a
  WHERE a.id NOT IN (
    SELECT ua.achievement_id FROM user_achievements ua WHERE ua.user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql;
