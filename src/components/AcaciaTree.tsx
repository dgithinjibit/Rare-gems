import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { COLORS } from '../utils/colors'
import type { TreeData } from '../stores/worldStore'

interface AcaciaTreeProps {
  position: [number, number, number]
  scale?: number
  rotation?: number
}

/**
 * Procedural Acacia tree - provides shade for tire recovery
 */
export function AcaciaTree({
  position,
  scale = 1,
  rotation = 0,
}: AcaciaTreeProps) {
  const groupRef = useRef<THREE.Group>(null)
  
  // Subtle sway animation
  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime
    groupRef.current.rotation.z = Math.sin(t * 0.5 + position[0]) * 0.02
  })
  
  return (
    <group
      ref={groupRef}
      position={position}
      rotation={[0, rotation, 0]}
      scale={scale}
    >
      {/* Trunk */}
      <mesh position={[0, 2, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.25, 4, 6]} />
        <meshStandardMaterial
          color={COLORS.acaciaBark}
          roughness={0.9}
          flatShading
        />
      </mesh>
      
      {/* Main branches */}
      <Branch position={[0, 3.5, 0]} rotation={[0.2, 0, 0.3]} length={2} />
      <Branch position={[0, 3.5, 0]} rotation={[0.2, 1.5, -0.3]} length={2.2} />
      <Branch position={[0, 3.5, 0]} rotation={[-0.1, 3, 0.2]} length={1.8} />
      <Branch position={[0, 3.5, 0]} rotation={[0.15, 4.5, -0.25]} length={2} />
      
      {/* Flat top canopy (characteristic of Acacia) */}
      <Canopy position={[0, 4.5, 0]} />
      
      {/* Shade indicator (ground circle) */}
      <mesh
        position={[0, 0.01, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <circleGeometry args={[5, 16]} />
        <meshStandardMaterial
          color={COLORS.grassGreen}
          transparent
          opacity={0.3}
        />
      </mesh>
    </group>
  )
}

interface BranchProps {
  position: [number, number, number]
  rotation: [number, number, number]
  length: number
}

const Branch = ({ position, rotation, length }: BranchProps) => {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[length / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.05, 0.1, length, 4]} />
        <meshStandardMaterial
          color={COLORS.acaciaBark}
          roughness={0.9}
          flatShading
        />
      </mesh>
    </group>
  )
}

interface CanopyProps {
  position: [number, number, number]
}

const Canopy = ({ position }: CanopyProps) => {
  // Create flat, umbrella-like canopy
  const segments = useMemo(() => {
    const result: Array<{
      position: [number, number, number]
      scale: [number, number, number]
    }> = []
    
    // Create multiple overlapping flat ellipsoids
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const radius = 2 + Math.random() * 1
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      
      result.push({
        position: [x, Math.random() * 0.3, z],
        scale: [2 + Math.random(), 0.3, 2 + Math.random()],
      })
    }
    
    // Center cluster
    for (let i = 0; i < 4; i++) {
      result.push({
        position: [
          (Math.random() - 0.5) * 2,
          Math.random() * 0.2,
          (Math.random() - 0.5) * 2,
        ],
        scale: [3 + Math.random(), 0.4, 3 + Math.random()],
      })
    }
    
    return result
  }, [])
  
  return (
    <group position={position}>
      {segments.map((seg, i) => (
        <mesh
          key={i}
          position={seg.position}
          scale={seg.scale}
          castShadow
        >
          <sphereGeometry args={[1, 6, 4]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? COLORS.acaciaLeaves : COLORS.acaciaLeavesDark}
            roughness={0.9}
            flatShading
          />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Render multiple Acacia trees from world store
 */
interface AcaciaTreesProps {
  trees: TreeData[]
}

export function AcaciaTrees({ trees }: AcaciaTreesProps) {
  return (
    <group>
      {trees.map((tree) => (
        <AcaciaTree
          key={tree.id}
          position={tree.position}
          scale={tree.scale}
          rotation={tree.rotation}
        />
      ))}
    </group>
  )
}

export default AcaciaTree
