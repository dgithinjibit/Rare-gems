# Dung Craft: Production-Ready Architecture

## Executive Summary

This document transforms the Dung Craft game jam prototype into a production-ready web application with enterprise-grade infrastructure, security, scalability, and maintainability.

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Database Design](#3-database-design)
4. [API Layer](#4-api-layer)
5. [Security Considerations](#5-security-considerations)
6. [Deployment Strategy](#6-deployment-strategy)
7. [Monitoring & Observability](#7-monitoring--observability)
8. [Performance Optimization](#8-performance-optimization)
9. [Environment Configuration](#9-environment-configuration)

---

## 1. System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  React + Vite + TypeScript                                          │    │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐       │    │
│  │  │ R3F Canvas │ │ Zustand    │ │ TanStack   │ │ Auth       │       │    │
│  │  │ (3D Game)  │ │ (State)    │ │ Query      │ │ Context    │       │    │
│  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTPS / WSS
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              EDGE LAYER                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Vercel Edge Network                                                 │    │
│  │  • CDN for static assets       • Edge caching                       │    │
│  │  • DDoS protection             • SSL termination                    │    │
│  │  • Rate limiting               • Geographic routing                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Vercel Serverless Functions (Edge Runtime)                         │    │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐       │    │
│  │  │ /api/auth  │ │ /api/game  │ │ /api/user  │ │ /api/lb    │       │    │
│  │  │ JWT/OAuth  │ │ Save/Load  │ │ Profile    │ │ Leaderboard│       │    │
│  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA LAYER                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │  Supabase        │  │  Upstash Redis   │  │  Vercel Blob     │          │
│  │  PostgreSQL      │  │  Session Cache   │  │  User Avatars    │          │
│  │  • Users         │  │  • Rate limits   │  │  • Screenshots   │          │
│  │  • Game saves    │  │  • Leaderboard   │  │                  │          │
│  │  • Leaderboards  │  │    cache         │  │                  │          │
│  │  • Achievements  │  │  • Real-time     │  │                  │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React 18 + Vite + TypeScript | UI Framework |
| 3D Engine | React Three Fiber + drei | WebGL rendering |
| State | Zustand + TanStack Query | Client & server state |
| Auth | Supabase Auth / Custom JWT | User management |
| Database | Supabase PostgreSQL | Persistent storage |
| Cache | Upstash Redis | Session & rate limiting |
| Storage | Vercel Blob | Binary assets |
| Hosting | Vercel | Edge deployment |
| Monitoring | Vercel Analytics + Sentry | Observability |

---

## 2. Authentication & Authorization

### Authentication Flow

```
┌─────────┐    ┌──────────┐    ┌───────────┐    ┌──────────┐
│  User   │───▶│  Login   │───▶│  Verify   │───▶│  Issue   │
│         │    │  Form    │    │  Creds    │    │  JWT     │
└─────────┘    └──────────┘    └───────────┘    └──────────┘
                                                      │
                                                      ▼
┌─────────┐    ┌──────────┐    ┌───────────┐    ┌──────────┐
│  Access │◀───│  Refresh │◀───│  Validate │◀───│  Store   │
│  Game   │    │  Token   │    │  Session  │    │  Cookie  │
└─────────┘    └──────────┘    └───────────┘    └──────────┘
```

### Implementation: Auth Context

```typescript
// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

interface User {
  id: string
  email: string
  username: string
  avatar_url?: string
  created_at: string
}

interface AuthState {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, username: string) => Promise<void>
  signOut: () => Promise<void>
  signInWithOAuth: (provider: 'google' | 'discord' | 'github') => Promise<void>
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
)

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await fetchUserProfile(session.user.id)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function fetchUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (data && !error) {
      setUser(data)
    }
    setLoading(false)
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signUp(email: string, password: string, username: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username }
      }
    })
    if (error) throw error

    // Create profile
    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        username,
        email
      })
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
  }

  async function signInWithOAuth(provider: 'google' | 'discord' | 'github') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, signInWithOAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
```

### Custom JWT Authentication (Alternative)

```typescript
// src/lib/auth/jwt.ts
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const JWT_SECRET = process.env.JWT_SECRET!
const REFRESH_SECRET = process.env.REFRESH_SECRET!

interface TokenPayload {
  userId: string
  email: string
  role: 'user' | 'admin'
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' })
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' })
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload
  } catch {
    return null
  }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, REFRESH_SECRET) as TokenPayload
  } catch {
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
```

### Authorization Middleware

```typescript
// src/middleware/auth.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/auth/jwt'

export async function authMiddleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = verifyAccessToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  // Add user info to request headers for downstream handlers
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', payload.userId)
  requestHeaders.set('x-user-role', payload.role)

  return NextResponse.next({
    request: { headers: requestHeaders }
  })
}

// Role-based access control
export function requireRole(allowedRoles: string[]) {
  return async (request: NextRequest) => {
    const role = request.headers.get('x-user-role')
    
    if (!role || !allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.next()
  }
}
```

---

## 3. Database Design

### Schema Definition

```sql
-- migrations/001_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users/Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255), -- NULL for OAuth users
  avatar_url TEXT,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  is_verified BOOLEAN DEFAULT FALSE,
  is_banned BOOLEAN DEFAULT FALSE
);

-- Game saves table
CREATE TABLE game_saves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  slot_number INTEGER NOT NULL CHECK (slot_number BETWEEN 1 AND 3),
  save_name VARCHAR(100),
  
  -- Game state
  current_level INTEGER DEFAULT 1,
  beads INTEGER DEFAULT 0,
  total_beads_earned BIGINT DEFAULT 0,
  dung_piles_cleared INTEGER DEFAULT 0,
  play_time_seconds INTEGER DEFAULT 0,
  
  -- Player stats
  tire_max FLOAT DEFAULT 100,
  tire_regen_rate FLOAT DEFAULT 0.5,
  
  -- Upgrades (JSONB for flexibility)
  upgrades JSONB DEFAULT '[]'::JSONB,
  
  -- Beetle and tire selection
  selected_beetle VARCHAR(50) DEFAULT 'scarab',
  equipped_tire VARCHAR(50) DEFAULT 'standard',
  unlocked_beetles JSONB DEFAULT '["scarab"]'::JSONB,
  unlocked_tires JSONB DEFAULT '["standard", "eco_chitin"]'::JSONB,
  
  -- World state (compressed)
  world_seed BIGINT,
  world_state BYTEA, -- Compressed voxel data
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, slot_number)
);

-- Leaderboard entries
CREATE TABLE leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Metrics
  score BIGINT NOT NULL,
  level_reached INTEGER NOT NULL,
  dung_piles_cleared INTEGER NOT NULL,
  play_time_seconds INTEGER NOT NULL,
  
  -- Metadata
  game_version VARCHAR(20),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Verification
  is_verified BOOLEAN DEFAULT FALSE,
  replay_data BYTEA -- Optional replay for verification
);

-- Achievements
CREATE TABLE achievements (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon_url TEXT,
  points INTEGER DEFAULT 10,
  rarity VARCHAR(20) DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary'))
);

-- User achievements junction
CREATE TABLE user_achievements (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id VARCHAR(50) REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, achievement_id)
);

-- Sessions table (for custom JWT auth)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  refresh_token_hash VARCHAR(255) NOT NULL,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_game_saves_user ON game_saves(user_id);
CREATE INDEX idx_leaderboard_score ON leaderboard_entries(score DESC);
CREATE INDEX idx_leaderboard_user ON leaderboard_entries(user_id);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_refresh ON sessions(refresh_token_hash);

-- Row Level Security policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all, update own
CREATE POLICY profiles_select ON profiles FOR SELECT USING (true);
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (auth.uid() = id);

-- Game saves: Users can only access own saves
CREATE POLICY saves_all ON game_saves FOR ALL USING (auth.uid() = user_id);

-- Leaderboard: Anyone can read, only owner can insert
CREATE POLICY leaderboard_select ON leaderboard_entries FOR SELECT USING (true);
CREATE POLICY leaderboard_insert ON leaderboard_entries FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Achievements: Anyone can read, system inserts
CREATE POLICY achievements_select ON user_achievements FOR SELECT USING (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER game_saves_updated_at BEFORE UPDATE ON game_saves
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Database Client

```typescript
// src/lib/db/client.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client-side (respects RLS)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Server-side (bypasses RLS - use carefully)
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey)

// Type definitions generated from schema
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          username: string
          password_hash: string | null
          avatar_url: string | null
          role: 'user' | 'admin' | 'moderator'
          created_at: string
          updated_at: string
          last_login_at: string | null
          is_verified: boolean
          is_banned: boolean
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      game_saves: {
        Row: {
          id: string
          user_id: string
          slot_number: number
          save_name: string | null
          current_level: number
          beads: number
          total_beads_earned: number
          dung_piles_cleared: number
          play_time_seconds: number
          tire_max: number
          tire_regen_rate: number
          upgrades: string[]
          selected_beetle: string
          equipped_tire: string
          unlocked_beetles: string[]
          unlocked_tires: string[]
          world_seed: number | null
          world_state: Uint8Array | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['game_saves']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['game_saves']['Insert']>
      }
      leaderboard_entries: {
        Row: {
          id: string
          user_id: string
          score: number
          level_reached: number
          dung_piles_cleared: number
          play_time_seconds: number
          game_version: string | null
          submitted_at: string
          is_verified: boolean
          replay_data: Uint8Array | null
        }
        Insert: Omit<Database['public']['Tables']['leaderboard_entries']['Row'], 'id' | 'submitted_at'>
        Update: Partial<Database['public']['Tables']['leaderboard_entries']['Insert']>
      }
    }
  }
}
```

---

## 4. API Layer

### API Route Structure

```
/api/
├── auth/
│   ├── login.ts          POST - Email/password login
│   ├── register.ts       POST - Create account
│   ├── logout.ts         POST - Invalidate session
│   ├── refresh.ts        POST - Refresh access token
│   ├── callback.ts       GET  - OAuth callback
│   └── verify.ts         POST - Email verification
├── user/
│   ├── profile.ts        GET/PATCH - User profile
│   ├── avatar.ts         POST - Upload avatar
│   └── settings.ts       GET/PATCH - User preferences
├── game/
│   ├── saves/
│   │   ├── index.ts      GET - List saves
│   │   ├── [slot].ts     GET/PUT/DELETE - Manage save
│   │   └── sync.ts       POST - Real-time sync
│   └── achievements.ts   GET/POST - Achievements
└── leaderboard/
    ├── index.ts          GET - Top scores
    ├── submit.ts         POST - Submit score
    └── user/[id].ts      GET - User's scores
```

### API Implementation Examples

```typescript
// api/game/saves/[slot].ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db/client'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { z } from 'zod'

const SaveDataSchema = z.object({
  save_name: z.string().max(100).optional(),
  current_level: z.number().int().positive(),
  beads: z.number().int().min(0),
  dung_piles_cleared: z.number().int().min(0),
  play_time_seconds: z.number().int().min(0),
  upgrades: z.array(z.string()),
  selected_beetle: z.string(),
  equipped_tire: z.string(),
  unlocked_beetles: z.array(z.string()),
  unlocked_tires: z.array(z.string()),
  world_seed: z.number().optional(),
})

// GET /api/game/saves/[slot]
export async function GET(
  request: NextRequest,
  { params }: { params: { slot: string } }
) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const slot = parseInt(params.slot)
  if (isNaN(slot) || slot < 1 || slot > 3) {
    return NextResponse.json({ error: 'Invalid slot number' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('game_saves')
    .select('*')
    .eq('user_id', userId)
    .eq('slot_number', slot)
    .single()

  if (error && error.code !== 'PGRST116') { // Not found is OK
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ save: data || null })
}

// PUT /api/game/saves/[slot]
export async function PUT(
  request: NextRequest,
  { params }: { params: { slot: string } }
) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const slot = parseInt(params.slot)
  if (isNaN(slot) || slot < 1 || slot > 3) {
    return NextResponse.json({ error: 'Invalid slot number' }, { status: 400 })
  }

  const body = await request.json()
  const validation = SaveDataSchema.safeParse(body)
  
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid save data', details: validation.error.issues },
      { status: 400 }
    )
  }

  const saveData = {
    user_id: userId,
    slot_number: slot,
    ...validation.data,
  }

  const { data, error } = await supabase
    .from('game_saves')
    .upsert(saveData, { onConflict: 'user_id,slot_number' })
    .select()
    .single()

  if (error) {
    console.error('Save error:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  return NextResponse.json({ save: data })
}

// DELETE /api/game/saves/[slot]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { slot: string } }
) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const slot = parseInt(params.slot)
  
  const { error } = await supabase
    .from('game_saves')
    .delete()
    .eq('user_id', userId)
    .eq('slot_number', slot)

  if (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

```typescript
// api/leaderboard/submit.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db/client'
import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'
import { z } from 'zod'

const redis = Redis.fromEnv()
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 h'), // 5 submissions per hour
})

const ScoreSchema = z.object({
  score: z.number().int().positive(),
  level_reached: z.number().int().positive(),
  dung_piles_cleared: z.number().int().min(0),
  play_time_seconds: z.number().int().positive(),
  game_version: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limiting
  const { success, remaining } = await ratelimit.limit(userId)
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429, headers: { 'X-RateLimit-Remaining': remaining.toString() } }
    )
  }

  const body = await request.json()
  const validation = ScoreSchema.safeParse(body)
  
  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid score data' }, { status: 400 })
  }

  // Anti-cheat validation
  const { score, level_reached, play_time_seconds } = validation.data
  
  // Basic sanity checks
  const maxPossibleScore = level_reached * 10000 // Theoretical max per level
  if (score > maxPossibleScore) {
    return NextResponse.json({ error: 'Score validation failed' }, { status: 400 })
  }
  
  const minTimePerLevel = 30 // seconds
  if (play_time_seconds < level_reached * minTimePerLevel) {
    return NextResponse.json({ error: 'Time validation failed' }, { status: 400 })
  }

  // Insert score
  const { data, error } = await supabase
    .from('leaderboard_entries')
    .insert({
      user_id: userId,
      ...validation.data,
      is_verified: false, // Requires manual or automated verification
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to submit score' }, { status: 500 })
  }

  // Update cached leaderboard
  await redis.zadd('leaderboard:global', { score, member: userId })

  return NextResponse.json({ 
    entry: data,
    rank: await getPlayerRank(userId, score)
  })
}

async function getPlayerRank(userId: string, score: number): Promise<number> {
  const rank = await redis.zrevrank('leaderboard:global', userId)
  return rank !== null ? rank + 1 : -1
}
```

---

## 5. Security Considerations

### Security Checklist

| Category | Implementation | Status |
|----------|---------------|--------|
| **Authentication** | | |
| Password hashing | bcrypt with cost factor 12 | Required |
| JWT token expiry | 15min access, 7d refresh | Required |
| HTTP-only cookies | Secure, SameSite=Strict | Required |
| CSRF protection | Double submit cookie | Required |
| Rate limiting | 5 login attempts/15min | Required |
| **Data Protection** | | |
| Input validation | Zod schemas on all inputs | Required |
| SQL injection | Parameterized queries (Supabase) | Required |
| XSS prevention | React auto-escaping + CSP | Required |
| CORS | Strict origin whitelist | Required |
| **Infrastructure** | | |
| HTTPS enforcement | Vercel automatic | Required |
| Secret management | Environment variables | Required |
| Dependency audit | npm audit + Snyk | Required |
| Error handling | No stack traces in prod | Required |

### Content Security Policy

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://jam.pieter.com", // R3F needs eval
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://jam.pieter.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  response.headers.set('Content-Security-Policy', csp)
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  return response
}
```

### Input Validation

```typescript
// src/lib/validation/schemas.ts
import { z } from 'zod'

export const UsernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be at most 20 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')

export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[0-9]/, 'Password must contain a number')

export const EmailSchema = z
  .string()
  .email('Invalid email address')
  .max(255)

export const RegisterSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  username: UsernameSchema,
})

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Password is required'),
})
```

---

## 6. Deployment Strategy

### Environment Configuration

```bash
# .env.example

# App
VITE_APP_URL=https://dungcraft.vercel.app
VITE_APP_ENV=production

# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ... # Server-side only

# Auth
JWT_SECRET=your-256-bit-secret
REFRESH_SECRET=your-256-bit-refresh-secret

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# Blob Storage
BLOB_READ_WRITE_TOKEN=vercel_blob_xxx

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
VERCEL_ANALYTICS_ID=xxx

# Feature Flags
ENABLE_LEADERBOARD=true
ENABLE_ACHIEVEMENTS=true
MAINTENANCE_MODE=false
```

### Vercel Configuration

```json
// vercel.json
{
  "framework": "vite",
  "buildCommand": "vite build",
  "outputDirectory": "dist",
  "installCommand": "pnpm install",
  "regions": ["iad1", "sfo1", "cdg1"],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-store, must-revalidate" }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/game",
      "destination": "/?autostart=true",
      "permanent": false
    }
  ],
  "rewrites": [
    { "source": "/api/:path*", "destination": "/api/:path*" }
  ]
}
```

### CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build

  deploy-preview:
    needs: test
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## 7. Monitoring & Observability

### Error Tracking (Sentry)

```typescript
// src/lib/sentry.ts
import * as Sentry from '@sentry/react'

export function initSentry() {
  if (import.meta.env.PROD) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.VITE_APP_ENV,
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration(),
      ],
    })
  }
}

// Wrap game errors
export function captureGameError(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    tags: { component: 'game-engine' },
    extra: context,
  })
}
```

### Performance Monitoring

```typescript
// src/lib/analytics.ts
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Analytics />
      <SpeedInsights />
    </>
  )
}

// Custom game events
export function trackGameEvent(event: string, properties?: Record<string, any>) {
  if (typeof window !== 'undefined' && (window as any).va) {
    (window as any).va('event', { name: event, ...properties })
  }
}

// Usage
trackGameEvent('level_complete', { level: 5, score: 15000, time: 120 })
trackGameEvent('purchase', { item: 'shovel_legs', cost: 100 })
trackGameEvent('achievement_unlocked', { achievement: 'speed_demon' })
```

---

## 8. Performance Optimization

### Code Splitting

```typescript
// src/App.tsx
import { lazy, Suspense } from 'react'

// Lazy load heavy components
const GameCanvas = lazy(() => import('./components/GameCanvas'))
const Shop = lazy(() => import('./ui/Shop'))
const Leaderboard = lazy(() => import('./ui/Leaderboard'))

function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <GameCanvas />
    </Suspense>
  )
}
```

### Asset Optimization

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { compression } from 'vite-plugin-compression2'

export default defineConfig({
  plugins: [
    react(),
    compression({ algorithm: 'gzip' }),
    compression({ algorithm: 'brotliCompress', ext: '.br' }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three'],
          'r3f': ['@react-three/fiber', '@react-three/drei'],
          'vendor': ['react', 'react-dom', 'zustand'],
        },
      },
    },
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
})
```

---

## 9. Environment Configuration

### Environment Variables Checklist

```typescript
// src/env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Public (exposed to client)
  readonly VITE_APP_URL: string
  readonly VITE_APP_ENV: 'development' | 'staging' | 'production'
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_SENTRY_DSN?: string
  
  // Feature flags
  readonly VITE_ENABLE_LEADERBOARD?: string
  readonly VITE_ENABLE_ACHIEVEMENTS?: string
  readonly VITE_MAINTENANCE_MODE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

### Configuration Validation

```typescript
// src/lib/config.ts
import { z } from 'zod'

const envSchema = z.object({
  VITE_APP_URL: z.string().url(),
  VITE_APP_ENV: z.enum(['development', 'staging', 'production']),
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
})

export function validateEnv() {
  const result = envSchema.safeParse(import.meta.env)
  
  if (!result.success) {
    console.error('Invalid environment configuration:', result.error.issues)
    throw new Error('Missing or invalid environment variables')
  }
  
  return result.data
}

export const config = validateEnv()
```

---

## Summary

This production architecture provides:

1. **Secure Authentication** - JWT + OAuth with proper session management
2. **Robust Database** - PostgreSQL with RLS policies and optimized queries
3. **Scalable API** - Serverless functions with rate limiting and validation
4. **Enterprise Security** - CSP, input validation, and comprehensive error handling
5. **Modern Deployment** - CI/CD with preview environments and production safeguards
6. **Full Observability** - Error tracking, analytics, and performance monitoring

The system is designed to scale from game jam prototype to production application while maintaining security, performance, and maintainability.
