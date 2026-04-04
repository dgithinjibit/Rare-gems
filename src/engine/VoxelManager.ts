import * as THREE from 'three'
import type { VoxelData } from '../stores/worldStore'

export interface VoxelInstance {
  id: string
  matrixIndex: number
  position: THREE.Vector3
  color: THREE.Color
  health: number
  maxHealth: number
  pileId: string
}

export interface VoxelManagerConfig {
  maxInstances: number
  voxelSize: number
}

const DEFAULT_CONFIG: VoxelManagerConfig = {
  maxInstances: 5000,
  voxelSize: 0.8,
}

/**
 * Manages voxel instances for efficient rendering using InstancedMesh
 */
export class VoxelManager {
  private config: VoxelManagerConfig
  private instances: Map<string, VoxelInstance>
  private freeIndices: number[]
  private instancedMesh: THREE.InstancedMesh | null
  private tempObject: THREE.Object3D
  private tempColor: THREE.Color
  
  constructor(config: Partial<VoxelManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.instances = new Map()
    this.freeIndices = []
    this.instancedMesh = null
    this.tempObject = new THREE.Object3D()
    this.tempColor = new THREE.Color()
    
    // Initialize free indices pool
    for (let i = this.config.maxInstances - 1; i >= 0; i--) {
      this.freeIndices.push(i)
    }
  }
  
  /**
   * Set the instanced mesh reference
   */
  setInstancedMesh(mesh: THREE.InstancedMesh): void {
    this.instancedMesh = mesh
    
    // Ensure instance color attribute exists
    if (!mesh.instanceColor) {
      const colors = new Float32Array(this.config.maxInstances * 3)
      mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3)
    }
  }
  
  /**
   * Add a voxel to the manager
   */
  addVoxel(data: VoxelData): VoxelInstance | null {
    if (this.freeIndices.length === 0) {
      console.warn('VoxelManager: Max instances reached')
      return null
    }
    
    const matrixIndex = this.freeIndices.pop()!
    
    const instance: VoxelInstance = {
      id: data.id,
      matrixIndex,
      position: new THREE.Vector3(...data.position),
      color: new THREE.Color(data.color),
      health: data.health,
      maxHealth: data.maxHealth,
      pileId: data.pileId,
    }
    
    this.instances.set(data.id, instance)
    this.updateInstanceMatrix(instance)
    this.updateInstanceColor(instance)
    
    return instance
  }
  
  /**
   * Remove a voxel from the manager
   */
  removeVoxel(id: string): boolean {
    const instance = this.instances.get(id)
    if (!instance) return false
    
    // Hide the instance by scaling to 0
    this.tempObject.position.set(0, -1000, 0) // Move off-screen
    this.tempObject.scale.setScalar(0)
    this.tempObject.updateMatrix()
    
    if (this.instancedMesh) {
      this.instancedMesh.setMatrixAt(instance.matrixIndex, this.tempObject.matrix)
      this.instancedMesh.instanceMatrix.needsUpdate = true
    }
    
    // Return index to pool
    this.freeIndices.push(instance.matrixIndex)
    this.instances.delete(id)
    
    return true
  }
  
  /**
   * Damage a voxel and check if destroyed
   */
  damageVoxel(id: string, damage: number): { destroyed: boolean; instance?: VoxelInstance } {
    const instance = this.instances.get(id)
    if (!instance) return { destroyed: false }
    
    instance.health -= damage
    
    if (instance.health <= 0) {
      this.removeVoxel(id)
      return { destroyed: true, instance }
    }
    
    // Update visual to show damage (darken color)
    const healthPercent = instance.health / instance.maxHealth
    this.updateInstanceColor(instance, healthPercent)
    
    return { destroyed: false, instance }
  }
  
  /**
   * Update the instance matrix for positioning
   */
  private updateInstanceMatrix(instance: VoxelInstance): void {
    if (!this.instancedMesh) return
    
    this.tempObject.position.copy(instance.position)
    this.tempObject.scale.setScalar(this.config.voxelSize)
    this.tempObject.updateMatrix()
    
    this.instancedMesh.setMatrixAt(instance.matrixIndex, this.tempObject.matrix)
    this.instancedMesh.instanceMatrix.needsUpdate = true
  }
  
  /**
   * Update instance color
   */
  private updateInstanceColor(instance: VoxelInstance, healthMultiplier: number = 1): void {
    if (!this.instancedMesh?.instanceColor) return
    
    this.tempColor.copy(instance.color)
    
    // Darken based on damage
    if (healthMultiplier < 1) {
      this.tempColor.multiplyScalar(0.5 + healthMultiplier * 0.5)
    }
    
    this.instancedMesh.setColorAt(instance.matrixIndex, this.tempColor)
    this.instancedMesh.instanceColor.needsUpdate = true
  }
  
  /**
   * Bulk add voxels from map
   */
  addVoxelsFromMap(voxelMap: Map<string, VoxelData>): number {
    let added = 0
    voxelMap.forEach(data => {
      if (this.addVoxel(data)) {
        added++
      }
    })
    return added
  }
  
  /**
   * Clear all voxels
   */
  clear(): void {
    this.instances.forEach((_, id) => {
      this.removeVoxel(id)
    })
    this.instances.clear()
    
    // Reset free indices
    this.freeIndices = []
    for (let i = this.config.maxInstances - 1; i >= 0; i--) {
      this.freeIndices.push(i)
    }
  }
  
  /**
   * Get instance by ID
   */
  getInstance(id: string): VoxelInstance | undefined {
    return this.instances.get(id)
  }
  
  /**
   * Get all instances for a pile
   */
  getInstancesForPile(pileId: string): VoxelInstance[] {
    return Array.from(this.instances.values()).filter(
      inst => inst.pileId === pileId
    )
  }
  
  /**
   * Get instance count
   */
  getInstanceCount(): number {
    return this.instances.size
  }
  
  /**
   * Find voxel at position (for raycasting)
   */
  findVoxelAtPosition(
    position: THREE.Vector3,
    threshold: number = 0.5
  ): VoxelInstance | null {
    for (const instance of this.instances.values()) {
      if (instance.position.distanceTo(position) < threshold) {
        return instance
      }
    }
    return null
  }
  
  /**
   * Find nearest voxel to position
   */
  findNearestVoxel(position: THREE.Vector3): VoxelInstance | null {
    let nearest: VoxelInstance | null = null
    let nearestDist = Infinity
    
    for (const instance of this.instances.values()) {
      const dist = instance.position.distanceTo(position)
      if (dist < nearestDist) {
        nearestDist = dist
        nearest = instance
      }
    }
    
    return nearest
  }
}

// Factory function
export function createVoxelManager(
  config?: Partial<VoxelManagerConfig>
): VoxelManager {
  return new VoxelManager(config)
}
