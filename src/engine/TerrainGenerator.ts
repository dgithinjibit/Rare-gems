import { createNoiseGenerator, fbm, normalizeNoise } from '../utils/noise'
import { generateId, randomInRange } from '../utils/math'
import { getRandomDungColor } from '../utils/colors'
import type { DungPile, VoxelData, TreeData } from '../stores/worldStore'

export interface TerrainConfig {
  worldSize: number
  dungPileCount: number
  dungPileDensity: number
  treeCount: number
  hotspotChance: number
}

export interface TerrainData {
  heightMap: Float32Array
  width: number
  height: number
  seed: number
}

export interface GeneratedWorld {
  dungPiles: DungPile[]
  voxels: Map<string, VoxelData>
  trees: TreeData[]
  terrain: TerrainData
}

const DEFAULT_CONFIG: TerrainConfig = {
  worldSize: 100,
  dungPileCount: 6,
  dungPileDensity: 0.8,
  treeCount: 12,
  hotspotChance: 0.2,
}

export class TerrainGenerator {
  private config: TerrainConfig
  private noise: ReturnType<typeof createNoiseGenerator>
  private seed: number
  
  constructor(seed: number, config: Partial<TerrainConfig> = {}) {
    this.seed = seed
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.noise = createNoiseGenerator(seed)
  }
  
  /**
   * Generate the height map for the terrain
   */
  generateHeightMap(resolution: number = 64): TerrainData {
    const { worldSize } = this.config
    const heightMap = new Float32Array(resolution * resolution)
    
    for (let z = 0; z < resolution; z++) {
      for (let x = 0; x < resolution; x++) {
        // Convert to world coordinates
        const worldX = (x / resolution - 0.5) * worldSize
        const worldZ = (z / resolution - 0.5) * worldSize
        
        // Use FBM for natural-looking terrain
        const height = fbm(
          this.noise.noise2D,
          worldX * 0.02,
          worldZ * 0.02,
          4,
          2.0,
          0.5
        )
        
        // Normalize and scale
        heightMap[z * resolution + x] = normalizeNoise(height) * 2
      }
    }
    
    return {
      heightMap,
      width: resolution,
      height: resolution,
      seed: this.seed,
    }
  }
  
  /**
   * Get height at a specific world position
   */
  getHeightAt(x: number, z: number): number {
    const height = fbm(
      this.noise.noise2D,
      x * 0.02,
      z * 0.02,
      4,
      2.0,
      0.5
    )
    return normalizeNoise(height) * 2
  }
  
  /**
   * Generate dung pile positions using clustered distribution
   */
  generateDungPilePositions(): Array<{ x: number; z: number; isHotspot: boolean }> {
    const { worldSize, dungPileCount, hotspotChance } = this.config
    const positions: Array<{ x: number; z: number; isHotspot: boolean }> = []
    
    // Generate potential positions using noise-based clustering
    const attempts = dungPileCount * 10
    const minDistance = 12
    
    for (let i = 0; i < attempts && positions.length < dungPileCount; i++) {
      const x = randomInRange(-worldSize * 0.4, worldSize * 0.4)
      const z = randomInRange(-worldSize * 0.4, worldSize * 0.4)
      
      // Check cluster suitability with noise
      const clusterVal = normalizeNoise(
        this.noise.noise2D(x * 0.1, z * 0.1)
      )
      
      // Only place in "suitable" areas
      if (clusterVal > 0.4) {
        // Check minimum distance from other piles
        const tooClose = positions.some(pos => {
          const dx = pos.x - x
          const dz = pos.z - z
          return Math.sqrt(dx * dx + dz * dz) < minDistance
        })
        
        if (!tooClose) {
          positions.push({
            x,
            z,
            isHotspot: positions.length === 0 || Math.random() < hotspotChance,
          })
        }
      }
    }
    
    return positions
  }
  
  /**
   * Generate voxels for a dung pile
   */
  generateDungPileVoxels(
    pileId: string,
    centerX: number,
    centerZ: number,
    baseVoxelCount: number = 25
  ): VoxelData[] {
    const voxels: VoxelData[] = []
    
    // Vary count based on noise
    const countVariation = normalizeNoise(
      this.noise.noise2D(centerX * 0.5, centerZ * 0.5)
    )
    const voxelCount = Math.floor(
      baseVoxelCount * (0.6 + countVariation * 0.8)
    )
    
    // Pile radius based on count
    const pileRadius = 1.5 + Math.sqrt(voxelCount) * 0.3
    
    for (let i = 0; i < voxelCount; i++) {
      // Use golden angle for even distribution
      const goldenAngle = Math.PI * (3 - Math.sqrt(5))
      const angle = i * goldenAngle
      const radiusFactor = Math.sqrt(i / voxelCount)
      const radius = radiusFactor * pileRadius
      
      // Add noise to position
      const noiseOffset = this.noise.noise2D(i * 0.5, this.seed) * 0.3
      
      const voxelX = centerX + Math.cos(angle) * radius + noiseOffset
      const voxelZ = centerZ + Math.sin(angle) * radius + noiseOffset
      
      // Height based on distance from center (pile shape)
      const distFromCenter = Math.sqrt(
        Math.pow(voxelX - centerX, 2) + Math.pow(voxelZ - centerZ, 2)
      )
      const heightFactor = 1 - (distFromCenter / pileRadius)
      const baseHeight = heightFactor * 1.5 + 0.3
      
      // Stack voxels vertically for depth
      const stackHeight = Math.floor(heightFactor * 3) + 1
      
      for (let y = 0; y < stackHeight; y++) {
        const voxelId = generateId('voxel')
        voxels.push({
          id: voxelId,
          position: [voxelX, y * 0.8 + 0.4, voxelZ],
          color: getRandomDungColor(),
          health: 3,
          maxHealth: 3,
          pileId,
        })
      }
    }
    
    return voxels
  }
  
  /**
   * Generate Acacia tree positions
   */
  generateTreePositions(
    dungPilePositions: Array<{ x: number; z: number }>
  ): TreeData[] {
    const { worldSize, treeCount } = this.config
    const trees: TreeData[] = []
    const minDistFromPile = 10
    const minDistFromTree = 8
    const attempts = treeCount * 15
    
    for (let i = 0; i < attempts && trees.length < treeCount; i++) {
      const x = randomInRange(-worldSize * 0.45, worldSize * 0.45)
      const z = randomInRange(-worldSize * 0.45, worldSize * 0.45)
      
      // Check distance from dung piles
      const tooCloseToPile = dungPilePositions.some(pile => {
        const dx = pile.x - x
        const dz = pile.z - z
        return Math.sqrt(dx * dx + dz * dz) < minDistFromPile
      })
      
      if (tooCloseToPile) continue
      
      // Check distance from other trees
      const tooCloseToTree = trees.some(tree => {
        const dx = tree.position[0] - x
        const dz = tree.position[2] - z
        return Math.sqrt(dx * dx + dz * dz) < minDistFromTree
      })
      
      if (tooCloseToTree) continue
      
      // Use noise for natural placement preference
      const placementVal = normalizeNoise(
        this.noise.noise2D(x * 0.05, z * 0.05)
      )
      
      if (placementVal > 0.3) {
        trees.push({
          id: generateId('tree'),
          position: [x, 0, z],
          scale: randomInRange(0.7, 1.3),
          rotation: randomInRange(0, Math.PI * 2),
        })
      }
    }
    
    return trees
  }
  
  /**
   * Generate complete world
   */
  generateWorld(): GeneratedWorld {
    const terrain = this.generateHeightMap()
    const pilePositions = this.generateDungPilePositions()
    
    const dungPiles: DungPile[] = []
    const voxels = new Map<string, VoxelData>()
    
    // Generate each dung pile with its voxels
    pilePositions.forEach((pos, index) => {
      const pileId = generateId('pile')
      const pileVoxels = this.generateDungPileVoxels(pileId, pos.x, pos.z)
      
      // Add voxels to map
      pileVoxels.forEach(voxel => {
        voxels.set(voxel.id, voxel)
      })
      
      dungPiles.push({
        id: pileId,
        position: [pos.x, 0, pos.z],
        voxelCount: pileVoxels.length,
        remainingVoxels: pileVoxels.length,
        isHotspot: pos.isHotspot,
        isCleared: false,
      })
    })
    
    // Generate trees
    const trees = this.generateTreePositions(pilePositions)
    
    return {
      terrain,
      dungPiles,
      voxels,
      trees,
    }
  }
}

// Factory function for easy instantiation
export function createTerrainGenerator(
  seed: number = Date.now(),
  config?: Partial<TerrainConfig>
): TerrainGenerator {
  return new TerrainGenerator(seed, config)
}
