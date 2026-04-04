import { useGameStore, type Upgrade } from '../stores/gameStore'

export interface UpgradeEffects {
  damageMultiplier: number
  tireReduction: number
  recoveryMultiplier: number
  beadBonus: number
  passiveClear: boolean
}

/**
 * Upgrade System - Manages player upgrades and their effects
 */
export class UpgradeSystem {
  /**
   * Calculate combined effects from all purchased upgrades
   */
  getActiveEffects(): UpgradeEffects {
    const upgrades = useGameStore.getState().upgrades
    const purchased = upgrades.filter(u => u.purchased)
    
    const effects: UpgradeEffects = {
      damageMultiplier: 1,
      tireReduction: 0,
      recoveryMultiplier: 1,
      beadBonus: 0,
      passiveClear: false,
    }
    
    for (const upgrade of purchased) {
      switch (upgrade.effect) {
        case 'damage_x3':
          effects.damageMultiplier *= 3
          break
        case 'tire_slow_50':
          effects.tireReduction += 0.5
          break
        case 'recovery_x2':
          effects.recoveryMultiplier *= 2
          break
        case 'bead_bonus_25':
          effects.beadBonus += 0.25
          break
        case 'passive_clear':
          effects.passiveClear = true
          break
      }
    }
    
    return effects
  }
  
  /**
   * Get effective damage per click
   */
  getEffectiveDamage(baseDamage: number = 1): number {
    const effects = this.getActiveEffects()
    return baseDamage * effects.damageMultiplier
  }
  
  /**
   * Get effective tire increase (after reductions)
   */
  getEffectiveTireIncrease(baseIncrease: number): number {
    const effects = this.getActiveEffects()
    return baseIncrease * (1 - effects.tireReduction)
  }
  
  /**
   * Get effective recovery rate
   */
  getEffectiveRecoveryRate(baseRate: number): number {
    const effects = this.getActiveEffects()
    return baseRate * effects.recoveryMultiplier
  }
  
  /**
   * Get effective bead reward
   */
  getEffectiveBeadReward(baseReward: number): number {
    const effects = this.getActiveEffects()
    return Math.floor(baseReward * (1 + effects.beadBonus))
  }
  
  /**
   * Check if passive clear is active
   */
  hasPassiveClear(): boolean {
    return this.getActiveEffects().passiveClear
  }
  
  /**
   * Get upgrade by ID
   */
  getUpgrade(id: string): Upgrade | undefined {
    return useGameStore.getState().upgrades.find(u => u.id === id)
  }
  
  /**
   * Check if upgrade is purchased
   */
  hasUpgrade(id: string): boolean {
    const upgrade = this.getUpgrade(id)
    return upgrade?.purchased ?? false
  }
  
  /**
   * Get all upgrades
   */
  getAllUpgrades(): Upgrade[] {
    return useGameStore.getState().upgrades
  }
  
  /**
   * Get available (unpurchased) upgrades
   */
  getAvailableUpgrades(): Upgrade[] {
    return useGameStore.getState().upgrades.filter(u => !u.purchased)
  }
  
  /**
   * Get purchased upgrades
   */
  getPurchasedUpgrades(): Upgrade[] {
    return useGameStore.getState().upgrades.filter(u => u.purchased)
  }
  
  /**
   * Try to purchase an upgrade
   */
  purchase(id: string): boolean {
    return useGameStore.getState().purchaseUpgrade(id)
  }
  
  /**
   * Get total spent on upgrades
   */
  getTotalSpent(): number {
    const purchased = this.getPurchasedUpgrades()
    return purchased.reduce((sum, u) => sum + u.cost, 0)
  }
}

// Singleton
let upgradeSystemInstance: UpgradeSystem | null = null

export function getUpgradeSystem(): UpgradeSystem {
  if (!upgradeSystemInstance) {
    upgradeSystemInstance = new UpgradeSystem()
  }
  return upgradeSystemInstance
}

export function resetUpgradeSystem(): void {
  upgradeSystemInstance = null
}
