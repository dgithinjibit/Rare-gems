/**
 * Game Save Service
 * Handles saving and loading game state with offline support
 */

import type { GameState } from '../stores/gameStore'

// Types
export interface GameSave {
  id: string
  user_id: string
  slot_number: number
  save_name: string
  current_level: number
  beads: number
  total_beads_earned: number
  dung_piles_cleared: number
  play_time_seconds: number
  upgrades: string[]
  selected_beetle: string
  equipped_tire: string
  unlocked_beetles: string[]
  unlocked_tires: string[]
  world_seed: number
  created_at: string
  updated_at: string
}

export interface SaveSlot {
  slot: number
  save: GameSave | null
  isEmpty: boolean
}

// Local storage key prefix
const STORAGE_PREFIX = 'dc_save_'

// API base URL
const API_URL = import.meta.env.VITE_API_URL || ''

class GameSaveService {
  private accessToken: string | null = null
  private isOffline: boolean = false

  /**
   * Set the access token for authenticated requests
   */
  setAccessToken(token: string | null) {
    this.accessToken = token
    this.isOffline = !token
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
   * List all save slots for current user
   */
  async listSaves(): Promise<SaveSlot[]> {
    // Initialize empty slots
    const slots: SaveSlot[] = [1, 2, 3].map(slot => ({
      slot,
      save: null,
      isEmpty: true,
    }))

    if (this.isOffline) {
      // Load from local storage
      for (let i = 1; i <= 3; i++) {
        const saved = localStorage.getItem(`${STORAGE_PREFIX}${i}`)
        if (saved) {
          try {
            slots[i - 1].save = JSON.parse(saved)
            slots[i - 1].isEmpty = false
          } catch (e) {
            console.error(`[v0] Failed to parse save slot ${i}:`, e)
          }
        }
      }
      return slots
    }

    // Load from API
    try {
      const response = await fetch(`${API_URL}/api/game/saves`, {
        headers: this.getHeaders(),
      })

      if (response.ok) {
        const data = await response.json()
        for (const save of data.saves) {
          const slotIndex = save.slot_number - 1
          if (slotIndex >= 0 && slotIndex < 3) {
            slots[slotIndex].save = save
            slots[slotIndex].isEmpty = false
          }
        }
      }
    } catch (error) {
      console.error('[v0] Failed to list saves:', error)
      // Fall back to local storage
      return this.listLocalSaves()
    }

    return slots
  }

  /**
   * List saves from local storage only
   */
  private listLocalSaves(): SaveSlot[] {
    const slots: SaveSlot[] = [1, 2, 3].map(slot => ({
      slot,
      save: null,
      isEmpty: true,
    }))

    for (let i = 1; i <= 3; i++) {
      const saved = localStorage.getItem(`${STORAGE_PREFIX}${i}`)
      if (saved) {
        try {
          slots[i - 1].save = JSON.parse(saved)
          slots[i - 1].isEmpty = false
        } catch (e) {
          console.error(`[v0] Failed to parse local save slot ${i}:`, e)
        }
      }
    }

    return slots
  }

  /**
   * Load a specific save slot
   */
  async loadSave(slot: number): Promise<GameSave | null> {
    if (slot < 1 || slot > 3) {
      throw new Error('Invalid slot number. Must be 1, 2, or 3.')
    }

    if (this.isOffline) {
      const saved = localStorage.getItem(`${STORAGE_PREFIX}${slot}`)
      return saved ? JSON.parse(saved) : null
    }

    try {
      const response = await fetch(`${API_URL}/api/game/saves/${slot}`, {
        headers: this.getHeaders(),
      })

      if (response.ok) {
        const data = await response.json()
        return data.save
      } else if (response.status === 404) {
        return null
      }
    } catch (error) {
      console.error(`[v0] Failed to load save slot ${slot}:`, error)
      // Fall back to local storage
      const saved = localStorage.getItem(`${STORAGE_PREFIX}${slot}`)
      return saved ? JSON.parse(saved) : null
    }

    return null
  }

  /**
   * Save game state to a slot
   */
  async saveGame(slot: number, state: Partial<GameState>, saveName?: string): Promise<GameSave> {
    if (slot < 1 || slot > 3) {
      throw new Error('Invalid slot number. Must be 1, 2, or 3.')
    }

    const saveData: Partial<GameSave> = {
      slot_number: slot,
      save_name: saveName || `Save ${slot}`,
      current_level: state.currentLevel || 1,
      beads: state.beads || 0,
      total_beads_earned: state.beads || 0, // Track cumulative
      dung_piles_cleared: state.dungPilesCleared || 0,
      play_time_seconds: 0, // Should be tracked separately
      upgrades: state.upgrades?.filter(u => u.purchased).map(u => u.id) || [],
      selected_beetle: state.selectedBeetle || 'scarab',
      equipped_tire: state.equippedTire || 'standard',
      unlocked_beetles: state.unlockedBeetles || ['scarab'],
      unlocked_tires: state.unlockedTires || ['standard', 'eco_chitin'],
      world_seed: Date.now(),
      updated_at: new Date().toISOString(),
    }

    // Always save to local storage as backup
    const localSave: GameSave = {
      id: `local_${slot}`,
      user_id: 'local',
      ...saveData,
      created_at: new Date().toISOString(),
    } as GameSave

    localStorage.setItem(`${STORAGE_PREFIX}${slot}`, JSON.stringify(localSave))

    if (this.isOffline) {
      return localSave
    }

    // Save to API
    try {
      const response = await fetch(`${API_URL}/api/game/saves/${slot}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(saveData),
      })

      if (response.ok) {
        const data = await response.json()
        // Update local storage with server response
        localStorage.setItem(`${STORAGE_PREFIX}${slot}`, JSON.stringify(data.save))
        return data.save
      }
    } catch (error) {
      console.error(`[v0] Failed to save to server, using local save:`, error)
    }

    return localSave
  }

  /**
   * Delete a save slot
   */
  async deleteSave(slot: number): Promise<boolean> {
    if (slot < 1 || slot > 3) {
      throw new Error('Invalid slot number. Must be 1, 2, or 3.')
    }

    // Always delete from local storage
    localStorage.removeItem(`${STORAGE_PREFIX}${slot}`)

    if (this.isOffline) {
      return true
    }

    try {
      const response = await fetch(`${API_URL}/api/game/saves/${slot}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      })

      return response.ok
    } catch (error) {
      console.error(`[v0] Failed to delete save from server:`, error)
      return true // Local delete succeeded
    }
  }

  /**
   * Auto-save current game state
   */
  async autoSave(state: Partial<GameState>): Promise<void> {
    const autoSaveKey = `${STORAGE_PREFIX}autosave`
    const autoSaveData = {
      ...state,
      timestamp: Date.now(),
    }
    localStorage.setItem(autoSaveKey, JSON.stringify(autoSaveData))
  }

  /**
   * Load auto-save data
   */
  loadAutoSave(): Partial<GameState> | null {
    const autoSaveKey = `${STORAGE_PREFIX}autosave`
    const saved = localStorage.getItem(autoSaveKey)
    
    if (!saved) return null

    try {
      const data = JSON.parse(saved)
      // Check if auto-save is recent (within 24 hours)
      const maxAge = 24 * 60 * 60 * 1000 // 24 hours
      if (Date.now() - data.timestamp > maxAge) {
        localStorage.removeItem(autoSaveKey)
        return null
      }
      return data
    } catch (e) {
      console.error('[v0] Failed to load auto-save:', e)
      return null
    }
  }

  /**
   * Clear auto-save data
   */
  clearAutoSave(): void {
    localStorage.removeItem(`${STORAGE_PREFIX}autosave`)
  }

  /**
   * Sync local saves to server (for when coming back online)
   */
  async syncLocalSaves(): Promise<void> {
    if (this.isOffline) return

    for (let slot = 1; slot <= 3; slot++) {
      const localSave = localStorage.getItem(`${STORAGE_PREFIX}${slot}`)
      if (!localSave) continue

      try {
        const save = JSON.parse(localSave) as GameSave
        
        // Check if local save is newer than server
        const response = await fetch(`${API_URL}/api/game/saves/${slot}`, {
          headers: this.getHeaders(),
        })

        if (response.ok) {
          const serverData = await response.json()
          const serverSave = serverData.save as GameSave | null

          // If no server save or local is newer, upload
          if (!serverSave || new Date(save.updated_at) > new Date(serverSave.updated_at)) {
            await fetch(`${API_URL}/api/game/saves/${slot}`, {
              method: 'PUT',
              headers: this.getHeaders(),
              body: JSON.stringify(save),
            })
          }
        }
      } catch (error) {
        console.error(`[v0] Failed to sync slot ${slot}:`, error)
      }
    }
  }

  /**
   * Export save data for backup
   */
  exportSaves(): string {
    const saves: Record<string, GameSave | null> = {}
    
    for (let slot = 1; slot <= 3; slot++) {
      const saved = localStorage.getItem(`${STORAGE_PREFIX}${slot}`)
      saves[`slot_${slot}`] = saved ? JSON.parse(saved) : null
    }

    return JSON.stringify({
      version: '1.0',
      exported_at: new Date().toISOString(),
      saves,
    }, null, 2)
  }

  /**
   * Import save data from backup
   */
  importSaves(data: string): boolean {
    try {
      const imported = JSON.parse(data)
      
      if (!imported.saves || imported.version !== '1.0') {
        throw new Error('Invalid save format')
      }

      for (let slot = 1; slot <= 3; slot++) {
        const save = imported.saves[`slot_${slot}`]
        if (save) {
          localStorage.setItem(`${STORAGE_PREFIX}${slot}`, JSON.stringify(save))
        }
      }

      return true
    } catch (error) {
      console.error('[v0] Failed to import saves:', error)
      return false
    }
  }
}

// Export singleton instance
export const gameSaveService = new GameSaveService()
