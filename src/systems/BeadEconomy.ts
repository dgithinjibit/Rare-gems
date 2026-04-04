import { useGameStore } from '../stores/gameStore'

export interface BeadConfig {
  // Base rewards
  baseVoxelReward: number
  hotspotMultiplier: number
  pileCompletionBonus: number
  
  // Combo system
  comboTimeoutMs: number
  maxComboMultiplier: number
  comboIncrement: number
}

const DEFAULT_CONFIG: BeadConfig = {
  baseVoxelReward: 1,
  hotspotMultiplier: 2,
  pileCompletionBonus: 50,
  comboTimeoutMs: 2000,
  maxComboMultiplier: 5,
  comboIncrement: 0.1,
}

/**
 * Bead Economy System - Manages currency and rewards
 */
export class BeadEconomy {
  private config: BeadConfig
  private comboTimer: number = 0
  private lastVoxelTime: number = 0
  
  constructor(config: Partial<BeadConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }
  
  /**
   * Award beads for destroying a voxel
   */
  onVoxelDestroyed(isHotspot: boolean = false): number {
    const gameStore = useGameStore.getState()
    const now = Date.now()
    
    // Update combo
    if (now - this.lastVoxelTime < this.config.comboTimeoutMs) {
      gameStore.incrementCombo()
    } else {
      gameStore.resetCombo()
    }
    this.lastVoxelTime = now
    
    // Calculate reward
    let reward = this.config.baseVoxelReward
    
    // Hotspot bonus
    if (isHotspot) {
      reward *= this.config.hotspotMultiplier
    }
    
    // Add beads (combo multiplier applied in store)
    gameStore.addBeads(reward)
    
    return reward
  }
  
  /**
   * Award bonus for completing a pile
   */
  onPileCompleted(level: number, isHotspot: boolean = false): number {
    const gameStore = useGameStore.getState()
    
    let bonus = this.config.pileCompletionBonus * level
    
    if (isHotspot) {
      bonus *= this.config.hotspotMultiplier
    }
    
    gameStore.addBeads(bonus)
    gameStore.clearDungPile()
    
    return bonus
  }
  
  /**
   * Update combo timer (call each frame)
   */
  update(deltaTime: number): void {
    const now = Date.now()
    const gameStore = useGameStore.getState()
    
    // Check combo timeout
    if (
      gameStore.combo > 0 &&
      now - this.lastVoxelTime > this.config.comboTimeoutMs
    ) {
      gameStore.resetCombo()
    }
  }
  
  /**
   * Get current combo multiplier
   */
  getComboMultiplier(): number {
    const combo = useGameStore.getState().combo
    return Math.min(
      1 + combo * this.config.comboIncrement,
      this.config.maxComboMultiplier
    )
  }
  
  /**
   * Check if player can afford upgrade
   */
  canAfford(cost: number): boolean {
    return useGameStore.getState().beads >= cost
  }
  
  /**
   * Purchase an upgrade
   */
  purchaseUpgrade(upgradeId: string): boolean {
    return useGameStore.getState().purchaseUpgrade(upgradeId)
  }
  
  /**
   * Get available upgrades
   */
  getAvailableUpgrades() {
    return useGameStore.getState().upgrades.filter(u => !u.purchased)
  }
  
  /**
   * Get purchased upgrades
   */
  getPurchasedUpgrades() {
    return useGameStore.getState().upgrades.filter(u => u.purchased)
  }
  
  /**
   * Reset economy (for new game)
   */
  reset(): void {
    this.comboTimer = 0
    this.lastVoxelTime = 0
  }
}

// Singleton
let beadEconomyInstance: BeadEconomy | null = null

export function getBeadEconomy(): BeadEconomy {
  if (!beadEconomyInstance) {
    beadEconomyInstance = new BeadEconomy()
  }
  return beadEconomyInstance
}

export function resetBeadEconomy(): void {
  beadEconomyInstance = null
}
