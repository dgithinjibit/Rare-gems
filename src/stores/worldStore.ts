import { create } from 'zustand'
import { generateId } from '../utils/math'
import { getRandomDungColor } from '../utils/colors'

export interface VoxelData {
  id: string
  position: [number, number, number]
  color: string
  health: number
  maxHealth: number
  pileId: string
}

export interface DungPile {
  id: string
  position: [number, number, number]
  voxelCount: number
  remainingVoxels: number
  isHotspot: boolean
  isCleared: boolean
}

export interface TreeData {
  id: string
  position: [number, number, number]
  scale: number
  rotation: number
}

export interface PortalData {
  id: string
  position: [number, number, number]
  type: 'level' | 'global'
  targetUrl?: string
  active: boolean
}

export interface WorldState {
  // World configuration
  seed: number
  worldSize: number
  
  // Entities
  voxels: Map<string, VoxelData>
  dungPiles: DungPile[]
  trees: TreeData[]
  portals: PortalData[]
  
  // Actions
  setSeed: (seed: number) => void
  
  // Voxel management
  addVoxel: (voxel: VoxelData) => void
  removeVoxel: (id: string) => VoxelData | undefined
  damageVoxel: (id: string, damage: number) => boolean
  getVoxelsForPile: (pileId: string) => VoxelData[]
  
  // Dung pile management
  addDungPile: (pile: DungPile) => void
  updateDungPile: (id: string, updates: Partial<DungPile>) => void
  markPileCleared: (id: string) => void
  
  // Tree management
  addTree: (tree: TreeData) => void
  setTrees: (trees: TreeData[]) => void
  
  // Portal management
  addPortal: (portal: PortalData) => void
  removePortal: (id: string) => void
  activatePortal: (id: string) => void
  
  // World generation
  generateWorld: (seed: number) => void
  clearWorld: () => void
}

export const useWorldStore = create<WorldState>()((set, get) => ({
  // Initial state
  seed: Date.now(),
  worldSize: 100,
  voxels: new Map(),
  dungPiles: [],
  trees: [],
  portals: [],
  
  // Actions
  setSeed: (seed) => set({ seed }),
  
  // Voxel management
  addVoxel: (voxel) => {
    set((state) => {
      const newVoxels = new Map(state.voxels)
      newVoxels.set(voxel.id, voxel)
      return { voxels: newVoxels }
    })
  },
  
  removeVoxel: (id) => {
    const state = get()
    const voxel = state.voxels.get(id)
    
    if (voxel) {
      set((state) => {
        const newVoxels = new Map(state.voxels)
        newVoxels.delete(id)
        
        // Update pile remaining count
        const pileIndex = state.dungPiles.findIndex(p => p.id === voxel.pileId)
        if (pileIndex !== -1) {
          const updatedPiles = [...state.dungPiles]
          updatedPiles[pileIndex] = {
            ...updatedPiles[pileIndex],
            remainingVoxels: updatedPiles[pileIndex].remainingVoxels - 1,
          }
          return { voxels: newVoxels, dungPiles: updatedPiles }
        }
        
        return { voxels: newVoxels }
      })
    }
    
    return voxel
  },
  
  damageVoxel: (id, damage) => {
    const state = get()
    const voxel = state.voxels.get(id)
    
    if (!voxel) return false
    
    const newHealth = voxel.health - damage
    
    if (newHealth <= 0) {
      // Voxel destroyed
      get().removeVoxel(id)
      return true
    }
    
    // Update voxel health
    set((state) => {
      const newVoxels = new Map(state.voxels)
      newVoxels.set(id, { ...voxel, health: newHealth })
      return { voxels: newVoxels }
    })
    
    return false
  },
  
  getVoxelsForPile: (pileId) => {
    const state = get()
    return Array.from(state.voxels.values()).filter(v => v.pileId === pileId)
  },
  
  // Dung pile management
  addDungPile: (pile) => {
    set((state) => ({
      dungPiles: [...state.dungPiles, pile],
    }))
  },
  
  updateDungPile: (id, updates) => {
    set((state) => ({
      dungPiles: state.dungPiles.map(p =>
        p.id === id ? { ...p, ...updates } : p
      ),
    }))
  },
  
  markPileCleared: (id) => {
    set((state) => ({
      dungPiles: state.dungPiles.map(p =>
        p.id === id ? { ...p, isCleared: true, remainingVoxels: 0 } : p
      ),
    }))
  },
  
  // Tree management
  addTree: (tree) => {
    set((state) => ({
      trees: [...state.trees, tree],
    }))
  },
  
  setTrees: (trees) => set({ trees }),
  
  // Portal management
  addPortal: (portal) => {
    set((state) => ({
      portals: [...state.portals, portal],
    }))
  },
  
  removePortal: (id) => {
    set((state) => ({
      portals: state.portals.filter(p => p.id !== id),
    }))
  },
  
  activatePortal: (id) => {
    set((state) => ({
      portals: state.portals.map(p =>
        p.id === id ? { ...p, active: true } : p
      ),
    }))
  },
  
  // World generation
  generateWorld: (seed) => {
    const worldSize = 100
    const dungPiles: DungPile[] = []
    const voxels = new Map<string, VoxelData>()
    const trees: TreeData[] = []
    
    // Generate dung piles
    const pileCount = 5 + Math.floor(Math.random() * 3)
    
    for (let i = 0; i < pileCount; i++) {
      const pileId = generateId('pile')
      const pileX = (Math.random() - 0.5) * worldSize * 0.8
      const pileZ = (Math.random() - 0.5) * worldSize * 0.8
      
      // Create voxels for this pile
      const voxelCount = 15 + Math.floor(Math.random() * 20)
      const pileRadius = 2 + Math.random() * 2
      
      for (let j = 0; j < voxelCount; j++) {
        const angle = Math.random() * Math.PI * 2
        const radius = Math.random() * pileRadius
        const voxelX = pileX + Math.cos(angle) * radius
        const voxelZ = pileZ + Math.sin(angle) * radius
        const voxelY = Math.random() * 1.5 + 0.5
        
        const voxelId = generateId('voxel')
        voxels.set(voxelId, {
          id: voxelId,
          position: [voxelX, voxelY, voxelZ],
          color: getRandomDungColor(),
          health: 3,
          maxHealth: 3,
          pileId,
        })
      }
      
      dungPiles.push({
        id: pileId,
        position: [pileX, 0, pileZ],
        voxelCount,
        remainingVoxels: voxelCount,
        isHotspot: i === 0, // First pile is always hotspot
        isCleared: false,
      })
    }
    
    // Generate Acacia trees
    const treeCount = 8 + Math.floor(Math.random() * 5)
    
    for (let i = 0; i < treeCount; i++) {
      const treeX = (Math.random() - 0.5) * worldSize * 0.9
      const treeZ = (Math.random() - 0.5) * worldSize * 0.9
      
      // Make sure trees aren't too close to dung piles
      const tooClose = dungPiles.some(pile => {
        const dx = pile.position[0] - treeX
        const dz = pile.position[2] - treeZ
        return Math.sqrt(dx * dx + dz * dz) < 8
      })
      
      if (!tooClose) {
        trees.push({
          id: generateId('tree'),
          position: [treeX, 0, treeZ],
          scale: 0.8 + Math.random() * 0.4,
          rotation: Math.random() * Math.PI * 2,
        })
      }
    }
    
    set({
      seed,
      worldSize,
      voxels,
      dungPiles,
      trees,
      portals: [],
    })
  },
  
  clearWorld: () => {
    set({
      voxels: new Map(),
      dungPiles: [],
      trees: [],
      portals: [],
    })
  },
}))

// Selectors
export const selectVoxels = (state: WorldState) => state.voxels
export const selectDungPiles = (state: WorldState) => state.dungPiles
export const selectTrees = (state: WorldState) => state.trees
export const selectPortals = (state: WorldState) => state.portals
