import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { COLORS } from '../utils/colors'
import type { PortalData } from '../stores/worldStore'

interface PortalProps {
  position: [number, number, number]
  type: 'level' | 'global'
  active?: boolean
  onEnter?: () => void
}

/**
 * Portal component - Level transitions and Vibe Jam webring
 */
export function Portal({
  position,
  type,
  active = true,
  onEnter,
}: PortalProps) {
  const groupRef = useRef<THREE.Group>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const innerRef = useRef<THREE.Mesh>(null)
  
  const color = type === 'level' ? COLORS.maasaiBlue : COLORS.maasaiRed
  const secondaryColor = type === 'level' ? COLORS.maasaiOchre : COLORS.maasaiBlue
  
  // Animation
  useFrame((state) => {
    if (!groupRef.current || !ringRef.current || !innerRef.current) return
    if (!active) return
    
    const t = state.clock.elapsedTime
    
    // Rotate ring
    ringRef.current.rotation.z = t * 0.5
    ringRef.current.rotation.y = Math.sin(t * 0.3) * 0.2
    
    // Pulse inner portal
    const pulse = 1 + Math.sin(t * 2) * 0.1
    innerRef.current.scale.setScalar(pulse)
    
    // Float up and down
    groupRef.current.position.y = position[1] + Math.sin(t) * 0.2
  })
  
  if (!active) return null
  
  return (
    <group ref={groupRef} position={position}>
      {/* Outer ring with Maasai pattern */}
      <mesh ref={ringRef}>
        <torusGeometry args={[1.5, 0.15, 8, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          roughness={0.3}
          metalness={0.5}
        />
      </mesh>
      
      {/* Inner decorative rings */}
      <mesh rotation={[0, 0, Math.PI / 4]}>
        <torusGeometry args={[1.3, 0.08, 6, 16]} />
        <meshStandardMaterial
          color={secondaryColor}
          emissive={secondaryColor}
          emissiveIntensity={0.2}
        />
      </mesh>
      
      {/* Portal surface */}
      <mesh ref={innerRef}>
        <circleGeometry args={[1.2, 24]} />
        <meshStandardMaterial
          color={type === 'level' ? '#1a1a3e' : '#3e1a1a'}
          emissive={color}
          emissiveIntensity={0.5}
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Particle-like decorations */}
      <PortalParticles color={color} />
      
      {/* Label */}
      <PortalLabel type={type} />
      
      {/* Ground glow */}
      <mesh
        position={[0, -position[1] + 0.05, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[2, 16]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.3}
          emissive={color}
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  )
}

interface PortalParticlesProps {
  color: string
}

const PortalParticles = ({ color }: PortalParticlesProps) => {
  const particles = useMemo(() => {
    const result: Array<{
      position: [number, number, number]
      speed: number
      offset: number
    }> = []
    
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2
      result.push({
        position: [Math.cos(angle) * 1.5, 0, Math.sin(angle) * 1.5],
        speed: 1 + Math.random() * 0.5,
        offset: Math.random() * Math.PI * 2,
      })
    }
    
    return result
  }, [])
  
  return (
    <group>
      {particles.map((p, i) => (
        <PortalParticle key={i} {...p} color={color} />
      ))}
    </group>
  )
}

interface PortalParticleProps {
  position: [number, number, number]
  speed: number
  offset: number
  color: string
}

const PortalParticle = ({ position, speed, offset, color }: PortalParticleProps) => {
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.elapsedTime * speed + offset
    
    meshRef.current.position.y = Math.sin(t) * 0.5
    meshRef.current.scale.setScalar(0.5 + Math.sin(t * 2) * 0.2)
  })
  
  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.08, 4, 4]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.8}
      />
    </mesh>
  )
}

interface PortalLabelProps {
  type: 'level' | 'global'
}

const PortalLabel = ({ type }: PortalLabelProps) => {
  // Simple floating indicator
  return (
    <mesh position={[0, 2.5, 0]}>
      <boxGeometry args={[0.3, 0.3, 0.3]} />
      <meshStandardMaterial
        color={type === 'level' ? COLORS.maasaiBlue : COLORS.maasaiRed}
        emissive={type === 'level' ? COLORS.maasaiBlue : COLORS.maasaiRed}
        emissiveIntensity={0.5}
      />
    </mesh>
  )
}

/**
 * Render all portals from world store
 */
interface PortalsProps {
  portals: PortalData[]
  onEnterPortal?: (portal: PortalData) => void
}

export function Portals({ portals, onEnterPortal }: PortalsProps) {
  return (
    <group>
      {portals.map((portal) => (
        <Portal
          key={portal.id}
          position={portal.position}
          type={portal.type}
          active={portal.active}
          onEnter={() => onEnterPortal?.(portal)}
        />
      ))}
    </group>
  )
}

export default Portal
