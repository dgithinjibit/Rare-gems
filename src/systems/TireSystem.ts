import { useGameStore, type TireState } from '../stores/gameStore'
import { useWorldStore } from '../stores/worldStore'
import { distance2D } from '../utils/math'

export interface TireConfig {
  // Increase rates
  increasePerVoxel: number
  increasePerSecondMoving: number
  
  // Decrease rates
  passiveDecayRate: number
  shadeRecoveryMultiplier: number
  shadeRadius: number
  
  // Exhaustion
  exhaustionPenaltyMs: number
  exhaustionRecoveryRate: number
  
  // Thresholds
  fatigueThreshold: number
  exhaustionThreshold: number
}

const DEFAULT_CONFIG: TireConfig = {
  increasePerVoxel: 2,
  increasePerSecondMoving: 0.5,
  passiveDecayRate: 0.3,
  shadeRecoveryMultiplier: 3,
  shadeRadius: 6,
  exhaustionPenaltyMs: 5000,
  exhaustionRecoveryRate: 2,
  fatigueThreshold: 50,
  exhaustionThreshold: 100,
}

/**
 * Tire System - Manages stamina/fatigue mechanics
 * 
 * State Machine:
 * ACTIVE (0-49%) → Normal operation
 * FATIGUED (50-99%) → Warning state, visual cues
 * EXHAUSTED (100%) → Penalty freeze
 * RECOVERING → Transitioning back from exhausted
 */
export class TireSystem {
  private config: TireConfig
  private exhaustionTimer: number = 0
  private isExhausted: boolean = false
  private lastUpdateTime: number = 0
  
  constructor(config: Partial<TireConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }
  
  /**
   * Update tire state based on delta time
   */
  update(deltaTime: number, isMoving: boolean = false): void {
    const gameStore = useGameStore.getState()
    const worldStore = useWorldStore.getState()
    
    // Handle exhaustion freeze
    if (this.isExhausted) {
      this.exhaustionTimer -= deltaTime * 1000
      
      if (this.exhaustionTimer <= 0) {
        this.isExhausted = false
        gameStore.setTireState('RECOVERING')
        // Start recovery from exhaustion
        gameStore.decreaseTire(this.config.exhaustionRecoveryRate * deltaTime)
      }
      return
    }
    
    // Check for exhaustion trigger
    if (gameStore.tire >= this.config.exhaustionThreshold) {
      this.triggerExhaustion()
      return
    }
    
    // Calculate tire change
    let tireChange = 0
    
    // Moving increases tire
    if (isMoving) {
      tireChange += this.config.increasePerSecondMoving * deltaTime
    }
    
    // Check if near Acacia tree (shade recovery)
    const isInShade = this.checkShadeProximity(
      gameStore.playerPosition,
      worldStore.trees
    )
    
    // Passive decay (faster in shade)
    const decayMultiplier = isInShade ? this.config.shadeRecoveryMultiplier : 1
    tireChange -= this.config.passiveDecayRate * decayMultiplier * deltaTime
    
    // Apply tire change
    if (tireChange > 0) {
      gameStore.increaseTire(tireChange)
    } else if (tireChange < 0) {
      gameStore.decreaseTire(Math.abs(tireChange))
    }
  }
  
  /**
   * Called when player destroys a voxel
   */
  onVoxelDestroyed(): void {
    if (this.isExhausted) return
    
    const gameStore = useGameStore.getState()
    gameStore.increaseTire(this.config.increasePerVoxel)
  }
  
  /**
   * Trigger exhaustion state
   */
  private triggerExhaustion(): void {
    this.isExhausted = true
    this.exhaustionTimer = this.config.exhaustionPenaltyMs
    
    const gameStore = useGameStore.getState()
    gameStore.setTireState('EXHAUSTED')
    gameStore.setGamePhase('exhausted')
  }
  
  /**
   * Check if player is near any Acacia tree
   */
  private checkShadeProximity(
    playerPos: [number, number, number],
    trees: Array<{ position: [number, number, number] }>
  ): boolean {
    for (const tree of trees) {
      const dist = distance2D(
        playerPos[0],
        playerPos[2],
        tree.position[0],
        tree.position[2]
      )
      
      if (dist < this.config.shadeRadius) {
        return true
      }
    }
    return false
  }
  
  /**
   * Get current tire state
   */
  getTireState(): TireState {
    return useGameStore.getState().tireState
  }
  
  /**
   * Check if player can perform actions
   */
  canAct(): boolean {
    return !this.isExhausted
  }
  
  /**
   * Get exhaustion timer remaining (ms)
   */
  getExhaustionTimeRemaining(): number {
    return Math.max(0, this.exhaustionTimer)
  }
  
  /**
   * Reset the tire system
   */
  reset(): void {
    this.isExhausted = false
    this.exhaustionTimer = 0
    
    const gameStore = useGameStore.getState()
    gameStore.decreaseTire(100) // Reset to 0
    gameStore.setTireState('ACTIVE')
  }
}

// Singleton instance for global access
let tireSystemInstance: TireSystem | null = null

export function getTireSystem(): TireSystem {
  if (!tireSystemInstance) {
    tireSystemInstance = new TireSystem()
  }
  return tireSystemInstance
}

export function resetTireSystem(): void {
  tireSystemInstance = null
}
