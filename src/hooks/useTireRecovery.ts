import { useEffect, useRef } from 'react'
import { useGameStore } from '../stores/gameStore'
import { useWorldStore } from '../stores/worldStore'
import { distance2D } from '../utils/math'

export interface TireRecoveryOptions {
  shadeRadius?: number
  baseRecoveryRate?: number
  shadeMultiplier?: number
  updateInterval?: number // ms
}

/**
 * Hook for managing tire recovery based on proximity to shade
 */
export function useTireRecovery(options: TireRecoveryOptions = {}) {
  const {
    shadeRadius = 6,
    baseRecoveryRate = 0.3,
    shadeMultiplier = 3,
    updateInterval = 100,
  } = options
  
  const playerPosition = useGameStore(state => state.playerPosition)
  const tireState = useGameStore(state => state.tireState)
  const decreaseTire = useGameStore(state => state.decreaseTire)
  const gamePhase = useGameStore(state => state.gamePhase)
  
  const trees = useWorldStore(state => state.trees)
  
  const lastUpdateRef = useRef<number>(Date.now())
  const isInShadeRef = useRef<boolean>(false)
  
  // Check if player is in shade
  const checkShadeProximity = (): boolean => {
    for (const tree of trees) {
      const dist = distance2D(
        playerPosition[0],
        playerPosition[2],
        tree.position[0],
        tree.position[2]
      )
      
      if (dist < shadeRadius) {
        return true
      }
    }
    return false
  }
  
  // Passive recovery tick
  useEffect(() => {
    if (gamePhase !== 'playing') return
    if (tireState === 'EXHAUSTED') return
    
    const interval = setInterval(() => {
      const now = Date.now()
      const deltaTime = (now - lastUpdateRef.current) / 1000
      lastUpdateRef.current = now
      
      const inShade = checkShadeProximity()
      isInShadeRef.current = inShade
      
      // Calculate recovery rate
      const recoveryRate = inShade
        ? baseRecoveryRate * shadeMultiplier
        : baseRecoveryRate
      
      // Apply recovery
      decreaseTire(recoveryRate * deltaTime)
    }, updateInterval)
    
    return () => clearInterval(interval)
  }, [
    gamePhase,
    tireState,
    playerPosition,
    trees,
    baseRecoveryRate,
    shadeMultiplier,
    updateInterval,
    decreaseTire,
  ])
  
  return {
    isInShade: isInShadeRef.current,
    checkShadeProximity,
  }
}

export default useTireRecovery
