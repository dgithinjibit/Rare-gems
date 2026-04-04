import { useRef, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useWorldStore } from '../stores/worldStore'
import { VoxelManager, createVoxelManager } from './VoxelManager'
import { COLORS, hexToNumber } from '../utils/colors'

interface DungEngineProps {
  onVoxelClick?: (voxelId: string, position: THREE.Vector3) => void
  voxelSize?: number
  maxVoxels?: number
}

/**
 * DungEngine - Core voxel rendering engine using InstancedMesh
 * Renders thousands of voxels in a single draw call for 60fps performance
 */
export function DungEngine({
  onVoxelClick,
  voxelSize = 0.8,
  maxVoxels = 5000,
}: DungEngineProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const voxelManagerRef = useRef<VoxelManager | null>(null)
  const { raycaster, camera, pointer } = useThree()
  
  const voxels = useWorldStore(state => state.voxels)
  const damageVoxel = useWorldStore(state => state.damageVoxel)
  
  // Create box geometry and material
  const geometry = useMemo(() => {
    const geo = new THREE.BoxGeometry(1, 1, 1)
    // Flat shading for voxel look
    geo.computeVertexNormals()
    return geo
  }, [])
  
  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      vertexColors: false,
      flatShading: true,
      roughness: 0.8,
      metalness: 0.1,
    })
  }, [])
  
  // Initialize voxel manager
  useEffect(() => {
    if (!meshRef.current) return
    
    const manager = createVoxelManager({
      maxInstances: maxVoxels,
      voxelSize,
    })
    manager.setInstancedMesh(meshRef.current)
    voxelManagerRef.current = manager
    
    return () => {
      manager.clear()
    }
  }, [maxVoxels, voxelSize])
  
  // Sync voxels from store to renderer
  useEffect(() => {
    const manager = voxelManagerRef.current
    if (!manager || !meshRef.current) return
    
    // Clear existing and re-add all voxels
    manager.clear()
    manager.addVoxelsFromMap(voxels)
    
    // Update instance count
    meshRef.current.count = manager.getInstanceCount()
  }, [voxels])
  
  // Handle click detection
  const handleClick = (event: THREE.Event) => {
    if (!meshRef.current || !onVoxelClick) return
    
    // Cast ray from camera
    raycaster.setFromCamera(pointer, camera)
    const intersects = raycaster.intersectObject(meshRef.current)
    
    if (intersects.length > 0) {
      const hit = intersects[0]
      const instanceId = hit.instanceId
      
      if (instanceId !== undefined) {
        // Find the voxel at this instance
        const manager = voxelManagerRef.current
        if (manager) {
          // Get position from matrix
          const matrix = new THREE.Matrix4()
          meshRef.current.getMatrixAt(instanceId, matrix)
          const position = new THREE.Vector3()
          position.setFromMatrixPosition(matrix)
          
          // Find voxel by position
          const voxel = manager.findVoxelAtPosition(position, voxelSize)
          if (voxel) {
            onVoxelClick(voxel.id, position)
          }
        }
      }
    }
  }
  
  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, maxVoxels]}
      onClick={handleClick}
      castShadow
      receiveShadow
      frustumCulled
    />
  )
}

/**
 * Ground plane for the savanna
 */
export function SavannaGround({ size = 100 }: { size?: number }) {
  const geometry = useMemo(() => {
    return new THREE.PlaneGeometry(size, size, 32, 32)
  }, [size])
  
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      receiveShadow
    >
      <primitive object={geometry} />
      <meshStandardMaterial
        color={COLORS.grassDry}
        roughness={1}
        metalness={0}
        flatShading
      />
    </mesh>
  )
}

/**
 * Grass patches for visual variety
 */
export function GrassPatches({ count = 100, spread = 45 }: { count?: number; spread?: number }) {
  const instances = useMemo(() => {
    const result: Array<{
      position: [number, number, number]
      rotation: number
      scale: number
    }> = []
    
    for (let i = 0; i < count; i++) {
      result.push({
        position: [
          (Math.random() - 0.5) * spread * 2,
          0.1,
          (Math.random() - 0.5) * spread * 2,
        ],
        rotation: Math.random() * Math.PI * 2,
        scale: 0.5 + Math.random() * 0.5,
      })
    }
    
    return result
  }, [count, spread])
  
  return (
    <group>
      {instances.map((grass, i) => (
        <mesh
          key={i}
          position={grass.position}
          rotation={[0, grass.rotation, 0]}
          scale={grass.scale}
        >
          <coneGeometry args={[0.2, 0.8, 4]} />
          <meshStandardMaterial
            color={COLORS.grassGreen}
            flatShading
          />
        </mesh>
      ))}
    </group>
  )
}

export default DungEngine
