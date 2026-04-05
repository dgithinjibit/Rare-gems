/**
 * Leaderboard Service
 * Handles score submission and leaderboard retrieval
 */

// Types
export interface LeaderboardEntry {
  id: string
  user_id: string
  username: string
  avatar_url?: string
  score: number
  level_reached: number
  dung_piles_cleared: number
  play_time_seconds: number
  submitted_at: string
  rank: number
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[]
  total_count: number
  page: number
  per_page: number
  user_rank?: number
  user_entry?: LeaderboardEntry
}

export interface ScoreSubmission {
  score: number
  level_reached: number
  dung_piles_cleared: number
  play_time_seconds: number
  game_version?: string
}

export type LeaderboardTimeframe = 'all_time' | 'monthly' | 'weekly' | 'daily'

// API base URL
const API_URL = import.meta.env.VITE_API_URL || ''

// Local storage for offline caching
const CACHE_KEY = 'dc_leaderboard_cache'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

class LeaderboardService {
  private accessToken: string | null = null
  private cache: Map<string, { data: LeaderboardResponse; timestamp: number }> = new Map()

  /**
   * Set the access token for authenticated requests
   */
  setAccessToken(token: string | null) {
    this.accessToken = token
  }

  /**
   * Get headers for API requests
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`
    }
    return headers
  }

  /**
   * Get cache key for a request
   */
  private getCacheKey(timeframe: LeaderboardTimeframe, page: number, perPage: number): string {
    return `${timeframe}_${page}_${perPage}`
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(key: string): boolean {
    const cached = this.cache.get(key)
    if (!cached) return false
    return Date.now() - cached.timestamp < CACHE_TTL
  }

  /**
   * Get leaderboard entries
   */
  async getLeaderboard(
    timeframe: LeaderboardTimeframe = 'all_time',
    page: number = 1,
    perPage: number = 20
  ): Promise<LeaderboardResponse> {
    const cacheKey = this.getCacheKey(timeframe, page, perPage)

    // Check cache first
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey)!.data
    }

    try {
      const params = new URLSearchParams({
        timeframe,
        page: page.toString(),
        per_page: perPage.toString(),
      })

      const response = await fetch(`${API_URL}/api/leaderboard?${params}`, {
        headers: this.getHeaders(),
      })

      if (response.ok) {
        const data: LeaderboardResponse = await response.json()
        
        // Cache the response
        this.cache.set(cacheKey, {
          data,
          timestamp: Date.now(),
        })

        // Also save to local storage for offline access
        this.saveToLocalCache(cacheKey, data)

        return data
      }
    } catch (error) {
      console.error('[v0] Failed to fetch leaderboard:', error)
    }

    // Fall back to local cache
    return this.getFromLocalCache(cacheKey) || {
      entries: [],
      total_count: 0,
      page: 1,
      per_page: perPage,
    }
  }

  /**
   * Get user's rank and surrounding entries
   */
  async getUserRank(userId: string): Promise<{
    rank: number
    entry: LeaderboardEntry | null
    surrounding: LeaderboardEntry[]
  }> {
    try {
      const response = await fetch(`${API_URL}/api/leaderboard/user/${userId}`, {
        headers: this.getHeaders(),
      })

      if (response.ok) {
        return await response.json()
      }
    } catch (error) {
      console.error('[v0] Failed to fetch user rank:', error)
    }

    return {
      rank: -1,
      entry: null,
      surrounding: [],
    }
  }

  /**
   * Submit a score to the leaderboard
   */
  async submitScore(submission: ScoreSubmission): Promise<{
    success: boolean
    entry?: LeaderboardEntry
    rank?: number
    is_personal_best?: boolean
    error?: string
  }> {
    if (!this.accessToken) {
      return {
        success: false,
        error: 'Must be logged in to submit scores',
      }
    }

    // Validate submission locally first
    const validation = this.validateSubmission(submission)
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      }
    }

    try {
      const response = await fetch(`${API_URL}/api/leaderboard/submit`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          ...submission,
          game_version: submission.game_version || '1.0.0',
        }),
      })

      if (response.ok) {
        const data = await response.json()
        
        // Invalidate cache
        this.cache.clear()
        
        return {
          success: true,
          entry: data.entry,
          rank: data.rank,
          is_personal_best: data.is_personal_best,
        }
      } else {
        const error = await response.json()
        return {
          success: false,
          error: error.message || 'Failed to submit score',
        }
      }
    } catch (error) {
      console.error('[v0] Failed to submit score:', error)
      
      // Queue for later submission
      this.queueOfflineSubmission(submission)
      
      return {
        success: false,
        error: 'Network error. Score saved for later submission.',
      }
    }
  }

  /**
   * Basic client-side validation
   */
  private validateSubmission(submission: ScoreSubmission): { valid: boolean; error?: string } {
    // Score must be positive
    if (submission.score <= 0) {
      return { valid: false, error: 'Invalid score' }
    }

    // Level must be at least 1
    if (submission.level_reached < 1) {
      return { valid: false, error: 'Invalid level' }
    }

    // Play time sanity check (at least 10 seconds per level)
    const minTime = submission.level_reached * 10
    if (submission.play_time_seconds < minTime) {
      return { valid: false, error: 'Play time too short' }
    }

    // Score sanity check (max 10,000 points per level seems reasonable)
    const maxScore = submission.level_reached * 10000
    if (submission.score > maxScore) {
      return { valid: false, error: 'Score exceeds maximum possible' }
    }

    return { valid: true }
  }

  /**
   * Queue submission for when back online
   */
  private queueOfflineSubmission(submission: ScoreSubmission): void {
    const queueKey = 'dc_leaderboard_queue'
    const queue = JSON.parse(localStorage.getItem(queueKey) || '[]')
    queue.push({
      ...submission,
      queued_at: Date.now(),
    })
    localStorage.setItem(queueKey, JSON.stringify(queue))
  }

  /**
   * Process queued submissions
   */
  async processQueue(): Promise<void> {
    if (!this.accessToken) return

    const queueKey = 'dc_leaderboard_queue'
    const queue = JSON.parse(localStorage.getItem(queueKey) || '[]')
    
    if (queue.length === 0) return

    const successful: number[] = []

    for (let i = 0; i < queue.length; i++) {
      const submission = queue[i]
      const result = await this.submitScore(submission)
      if (result.success) {
        successful.push(i)
      }
    }

    // Remove successful submissions from queue
    const remaining = queue.filter((_: unknown, i: number) => !successful.includes(i))
    localStorage.setItem(queueKey, JSON.stringify(remaining))
  }

  /**
   * Save to local storage cache
   */
  private saveToLocalCache(key: string, data: LeaderboardResponse): void {
    try {
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
      cache[key] = {
        data,
        timestamp: Date.now(),
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
    } catch (e) {
      console.error('[v0] Failed to save leaderboard cache:', e)
    }
  }

  /**
   * Get from local storage cache
   */
  private getFromLocalCache(key: string): LeaderboardResponse | null {
    try {
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
      const entry = cache[key]
      if (entry && Date.now() - entry.timestamp < CACHE_TTL * 10) { // Longer TTL for offline
        return entry.data
      }
    } catch (e) {
      console.error('[v0] Failed to read leaderboard cache:', e)
    }
    return null
  }

  /**
   * Format play time for display
   */
  static formatPlayTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    }
    return `${secs}s`
  }

  /**
   * Format score for display
   */
  static formatScore(score: number): string {
    return score.toLocaleString()
  }

  /**
   * Get rank badge/tier
   */
  static getRankTier(rank: number): {
    name: string
    color: string
    icon: string
  } {
    if (rank === 1) {
      return { name: 'Champion', color: '#FFD700', icon: '👑' }
    } else if (rank === 2) {
      return { name: 'Runner-up', color: '#C0C0C0', icon: '🥈' }
    } else if (rank === 3) {
      return { name: 'Third Place', color: '#CD7F32', icon: '🥉' }
    } else if (rank <= 10) {
      return { name: 'Top 10', color: '#FF0000', icon: '🔥' }
    } else if (rank <= 50) {
      return { name: 'Top 50', color: '#0000FF', icon: '⭐' }
    } else if (rank <= 100) {
      return { name: 'Top 100', color: '#CC7722', icon: '🏅' }
    }
    return { name: 'Competitor', color: '#888888', icon: '🎮' }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear()
    localStorage.removeItem(CACHE_KEY)
  }
}

// Export singleton instance
export const leaderboardService = new LeaderboardService()
