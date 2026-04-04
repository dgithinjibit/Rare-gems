import { usePortalStore, type InboundPortalParams } from '../stores/portalStore'
import { useWorldStore, type PortalData } from '../stores/worldStore'
import { useGameStore } from '../stores/gameStore'
import { generateId } from '../utils/math'

export interface PortalConfig {
  jamBaseUrl: string
  levelPortalSpawnDelay: number
  globalPortalSpawnChance: number
}

const DEFAULT_CONFIG: PortalConfig = {
  jamBaseUrl: 'https://jam.pieter.com/portal/2026',
  levelPortalSpawnDelay: 1000,
  globalPortalSpawnChance: 0.15,
}

/**
 * Portal Manager - Handles Vibe Jam webring and level transitions
 */
export class PortalManager {
  private config: PortalConfig
  
  constructor(config: Partial<PortalConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }
  
  /**
   * Initialize portal system - parse URL params
   */
  initialize(): InboundPortalParams | null {
    const portalStore = usePortalStore.getState()
    portalStore.parseInboundParams()
    
    const params = portalStore.inboundParams
    
    if (params?.portal) {
      this.handleInboundPortal(params)
    }
    
    return params
  }
  
  /**
   * Handle incoming portal parameters
   */
  private handleInboundPortal(params: InboundPortalParams): void {
    const gameStore = useGameStore.getState()
    
    // Apply incoming stats
    if (params.hp !== undefined) {
      // Convert HP to tire (inverse relationship)
      const tireFromHp = 100 - params.hp
      if (tireFromHp > 0) {
        gameStore.increaseTire(tireFromHp)
      }
    }
    
    // Could apply other bonuses based on params
    // e.g., starting beads based on ref
  }
  
  /**
   * Spawn level portal when pile is cleared
   */
  spawnLevelPortal(position: [number, number, number]): PortalData {
    const worldStore = useWorldStore.getState()
    
    const portal: PortalData = {
      id: generateId('portal'),
      position: [position[0], position[1] + 1, position[2]],
      type: 'level',
      active: true,
    }
    
    worldStore.addPortal(portal)
    
    // Possibly spawn global portal too
    if (Math.random() < this.config.globalPortalSpawnChance) {
      this.spawnGlobalPortal([
        position[0] + 3,
        position[1],
        position[2],
      ])
    }
    
    return portal
  }
  
  /**
   * Spawn global portal (Vibe Jam webring)
   */
  spawnGlobalPortal(position: [number, number, number]): PortalData {
    const worldStore = useWorldStore.getState()
    
    const portal: PortalData = {
      id: generateId('global-portal'),
      position,
      type: 'global',
      targetUrl: this.config.jamBaseUrl,
      active: true,
    }
    
    worldStore.addPortal(portal)
    
    return portal
  }
  
  /**
   * Enter level portal - regenerate world
   */
  enterLevelPortal(portalId: string): void {
    const worldStore = useWorldStore.getState()
    const gameStore = useGameStore.getState()
    
    // Remove the portal
    worldStore.removePortal(portalId)
    
    // Advance to next level
    gameStore.nextLevel()
    
    // Regenerate world with new seed
    const newSeed = Date.now()
    worldStore.generateWorld(newSeed)
  }
  
  /**
   * Enter global portal - redirect to Vibe Jam
   */
  enterGlobalPortal(): void {
    const portalStore = usePortalStore.getState()
    const gameStore = useGameStore.getState()
    
    // Build player state for outbound
    const playerState = {
      username: 'DungBeetle',
      hp: Math.max(0, 100 - gameStore.tire),
      beads: gameStore.beads,
    }
    
    portalStore.triggerGlobalPortal(playerState)
  }
  
  /**
   * Check if player is touching a portal
   */
  checkPortalCollision(
    playerPos: [number, number, number],
    threshold: number = 2
  ): PortalData | null {
    const portals = useWorldStore.getState().portals
    
    for (const portal of portals) {
      if (!portal.active) continue
      
      const dx = playerPos[0] - portal.position[0]
      const dz = playerPos[2] - portal.position[2]
      const dist = Math.sqrt(dx * dx + dz * dz)
      
      if (dist < threshold) {
        return portal
      }
    }
    
    return null
  }
  
  /**
   * Handle portal interaction
   */
  interactWithPortal(portal: PortalData): void {
    if (portal.type === 'level') {
      this.enterLevelPortal(portal.id)
    } else if (portal.type === 'global') {
      this.enterGlobalPortal()
    }
  }
  
  /**
   * Get all active portals
   */
  getActivePortals(): PortalData[] {
    return useWorldStore.getState().portals.filter(p => p.active)
  }
}

// Singleton
let portalManagerInstance: PortalManager | null = null

export function getPortalManager(): PortalManager {
  if (!portalManagerInstance) {
    portalManagerInstance = new PortalManager()
  }
  return portalManagerInstance
}

export function resetPortalManager(): void {
  portalManagerInstance = null
}
