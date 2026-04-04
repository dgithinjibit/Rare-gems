import { useMemo } from 'react'
import { Sky, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import { COLORS } from '../utils/colors'

interface EnvironmentProps {
  sunPosition?: [number, number, number]
  showContactShadows?: boolean
}

/**
 * Savanna environment - lighting, sky, and atmosphere
 */
export function Environment({
  sunPosition = [50, 50, 50],
  showContactShadows = true,
}: EnvironmentProps) {
  return (
    <>
      {/* Main directional light (sun) */}
      <directionalLight
        position={sunPosition}
        intensity={1.5}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={100}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />
      
      {/* Ambient light for fill */}
      <ambientLight intensity={0.4} color="#fff5e6" />
      
      {/* Hemisphere light for sky/ground color bleed */}
      <hemisphereLight
        args={[COLORS.skyBlue, COLORS.grassDry, 0.3]}
      />
      
      {/* Sky */}
      <Sky
        distance={450000}
        sunPosition={sunPosition}
        inclination={0.5}
        azimuth={0.25}
        rayleigh={0.5}
      />
      
      {/* Contact shadows for grounded feel */}
      {showContactShadows && (
        <ContactShadows
          position={[0, 0, 0]}
          opacity={0.4}
          scale={100}
          blur={2}
          far={10}
          resolution={256}
          color="#000000"
        />
      )}
      
      {/* Fog for depth */}
      <fog attach="fog" args={['#e8d5b7', 30, 100]} />
    </>
  )
}

/**
 * Ground plane with savanna texture
 */
export function Ground({ size = 100 }: { size?: number }) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      receiveShadow
    >
      <planeGeometry args={[size, size, 64, 64]} />
      <meshStandardMaterial
        color={COLORS.grassDry}
        roughness={1}
        metalness={0}
      />
    </mesh>
  )
}

/**
 * Decorative grass tufts
 */
export function GrassTufts({ count = 200, spread = 45 }: { count?: number; spread?: number }) {
  const instances = useMemo(() => {
    const result: Array<{
      position: [number, number, number]
      rotation: number
      scale: number
      color: string
    }> = []
    
    for (let i = 0; i < count; i++) {
      result.push({
        position: [
          (Math.random() - 0.5) * spread * 2,
          0,
          (Math.random() - 0.5) * spread * 2,
        ],
        rotation: Math.random() * Math.PI * 2,
        scale: 0.3 + Math.random() * 0.4,
        color: Math.random() > 0.5 ? COLORS.grassGreen : COLORS.grassLight,
      })
    }
    
    return result
  }, [count, spread])
  
  return (
    <group>
      {instances.map((grass, i) => (
        <GrassTuft key={i} {...grass} />
      ))}
    </group>
  )
}

interface GrassTuftProps {
  position: [number, number, number]
  rotation: number
  scale: number
  color: string
}

const GrassTuft = ({ position, rotation, scale, color }: GrassTuftProps) => {
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      {/* Multiple blades */}
      <mesh position={[-0.1, 0.3, 0]} rotation={[0.1, 0, 0.1]}>
        <coneGeometry args={[0.05, 0.6, 3]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      <mesh position={[0.1, 0.35, 0]} rotation={[-0.1, 0, -0.1]}>
        <coneGeometry args={[0.04, 0.7, 3]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      <mesh position={[0, 0.3, 0.1]} rotation={[0.15, 0, 0]}>
        <coneGeometry args={[0.05, 0.55, 3]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
    </group>
  )
}

/**
 * Distant hills for horizon
 */
export function DistantHills() {
  const hills = useMemo(() => {
    const result: Array<{
      position: [number, number, number]
      scale: [number, number, number]
    }> = []
    
    // Create a ring of hills around the play area
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const radius = 60 + Math.random() * 20
      
      result.push({
        position: [
          Math.cos(angle) * radius,
          -2,
          Math.sin(angle) * radius,
        ],
        scale: [
          20 + Math.random() * 15,
          5 + Math.random() * 8,
          20 + Math.random() * 15,
        ],
      })
    }
    
    return result
  }, [])
  
  return (
    <group>
      {hills.map((hill, i) => (
        <mesh key={i} position={hill.position} scale={hill.scale}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshStandardMaterial
            color="#9b8b6a"
            flatShading
          />
        </mesh>
      ))}
    </group>
  )
}

export default Environment
