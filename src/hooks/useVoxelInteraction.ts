import { useCallback, useRef, useState } from 'react'
import { useWorldStore } from '../stores/worldStore'
import { useGameStore } from '../stores/gameStore'
import { getBeadEconomy } from '../systems/BeadEconomy'
import { getTireSystem } from '../systems/TireSystem'
import { getUpgradeSystem } from '../systems/UpgradeSystem'

export interface VoxelInteractionOptions {
  holdDelay?: number // ms before continuous eating starts
  holdInterval?: number // ms between continuous eats
}

/**
 * Hook for handling voxel click/hold interactions
 */
export function useVoxelInteraction(options: VoxelInteractionOptions = {}) {
  const { holdDelay = 300, holdInterval = 150 } = options
  
  const damageVoxel = useWorldStore(state => state.damageVoxel)
  const voxels = useWorldStore(state => state.voxels)
  const dungPiles = useWorldStore(state => state.dungPiles)
  const markPileCleared = useWorldStore(state => state.markPileCleared)
  
  const tireState = useGameStore(state => state.tireState)
  const gamePhase = useGameStore(state => state.gamePhase)
  
  const [isHolding, setIsHolding] = useState(false)
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null)
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const targetVoxelRef = useRef<string | null>(null)
  
  /**
   * Process damage to a voxel
   */
  const processVoxelDamage = useCallback((voxelId: string): boolean => {
    if (gamePhase !== 'playing' || tireState === 'EXHAUSTED') {
      return false
    }
    
    const voxel = voxels.get(voxelId)
    if (!voxel) return false
    
    const upgrade = getUpgradeSystem()
    const damage = upgrade.getEffectiveDamage(1)
    
    const destroyed = damageVoxel(voxelId, damage)
    
    if (destroyed) {
      // Find the pile this voxel belonged to
      const pile = dungPiles.find(p => p.id === voxel.pileId)
      
      // Award beads
      getBeadEconomy().onVoxelDestroyed(pile?.isHotspot ?? false)
      
      // Increase tire
      getTireSystem().onVoxelDestroyed()
      
      // Check if pile is now cleared
      if (pile && pile.remainingVoxels <= 1) {
        markPileCleared(pile.id)
        getBeadEconomy().onPileCompleted(
          useGameStore.getState().currentLevel,
          pile.isHotspot
        )
      }
      
      return true
    }
    
    return false
  }, [gamePhase, tireState, voxels, dungPiles, damageVoxel, markPileCleared])
  
  /**
   * Start eating a voxel (called on mousedown)
   */
  const startEating = useCallback((voxelId: string) => {
    if (gamePhase !== 'playing' || tireState === 'EXHAUSTED') return
    
    targetVoxelRef.current = voxelId
    
    // Immediate first hit
    processVoxelDamage(voxelId)
    
    // Start hold timer for continuous eating
    holdTimerRef.current = setTimeout(() => {
      setIsHolding(true)
      
      // Start continuous eating
      holdIntervalRef.current = setInterval(() => {
        if (targetVoxelRef.current) {
          const stillExists = processVoxelDamage(targetVoxelRef.current)
          
          if (!stillExists) {
            // Voxel destroyed, find next nearest
            stopEating()
          }
        }
      }, holdInterval)
    }, holdDelay)
  }, [gamePhase, tireState, holdDelay, holdInterval, processVoxelDamage])
  
  /**
   * Stop eating (called on mouseup or mouseleave)
   */
  const stopEating = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
    
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current)
      holdIntervalRef.current = null
    }
    
    setIsHolding(false)
    targetVoxelRef.current = null
  }, [])
  
  /**
   * Single click eat (for quick taps)
   */
  const clickEat = useCallback((voxelId: string) => {
    if (gamePhase !== 'playing' || tireState === 'EXHAUSTED') return
    
    processVoxelDamage(voxelId)
  }, [gamePhase, tireState, processVoxelDamage])
  
  return {
    startEating,
    stopEating,
    clickEat,
    isHolding,
  }
}

export default useVoxelInteraction
