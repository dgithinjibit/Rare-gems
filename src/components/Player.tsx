import { useRef, useEffect, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../stores/gameStore'
import { useWorldStore } from '../stores/worldStore'
import { COLORS } from '../utils/colors'
import { clamp } from '../utils/math'
import { getTireSystem } from '../systems/TireSystem'
import { getBeadEconomy } from '../systems/BeadEconomy'
import { getUpgradeSystem } from '../systems/UpgradeSystem'

interface PlayerProps {
  initialPosition?: [number, number, number]
  speed?: number
  onEat?: (voxelId: string) => void
}

/**
 * Procedural Dung Beetle player controller
 */
export function Player({
  initialPosition = [0, 0.5, 0],
  speed = 8,
  onEat,
}: PlayerProps) {
  const groupRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Mesh>(null)
  
  const [keys, setKeys] = useState({
    forward: false,
    backward: false,
    left: false,
    right: false,
  })
  
  const [isMoving, setIsMoving] = useState(false)
  const [rollAngle, setRollAngle] = useState(0)
  
  const { camera } = useThree()
  
  const gamePhase = useGameStore(state => state.gamePhase)
  const setPlayerPosition = useGameStore(state => state.setPlayerPosition)
  const tireState = useGameStore(state => state.tireState)
  
  const voxels = useWorldStore(state => state.voxels)
  const damageVoxel = useWorldStore(state => state.damageVoxel)
  
  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          setKeys(k => ({ ...k, forward: true }))
          break
        case 'KeyS':
        case 'ArrowDown':
          setKeys(k => ({ ...k, backward: true }))
          break
        case 'KeyA':
        case 'ArrowLeft':
          setKeys(k => ({ ...k, left: true }))
          break
        case 'KeyD':
        case 'ArrowRight':
          setKeys(k => ({ ...k, right: true }))
          break
      }
    }
    
    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          setKeys(k => ({ ...k, forward: false }))
          break
        case 'KeyS':
        case 'ArrowDown':
          setKeys(k => ({ ...k, backward: false }))
          break
        case 'KeyA':
        case 'ArrowLeft':
          setKeys(k => ({ ...k, left: false }))
          break
        case 'KeyD':
        case 'ArrowRight':
          setKeys(k => ({ ...k, right: false }))
          break
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])
  
  // Game loop
  useFrame((_, delta) => {
    if (!groupRef.current) return
    if (gamePhase !== 'playing') return
    if (tireState === 'EXHAUSTED') return // Freeze during exhaustion
    
    const group = groupRef.current
    const pos = group.position
    
    // Calculate movement direction
    let moveX = 0
    let moveZ = 0
    
    if (keys.forward) moveZ -= 1
    if (keys.backward) moveZ += 1
    if (keys.left) moveX -= 1
    if (keys.right) moveX += 1
    
    const moving = moveX !== 0 || moveZ !== 0
    setIsMoving(moving)
    
    if (moving) {
      // Normalize diagonal movement
      const length = Math.sqrt(moveX * moveX + moveZ * moveZ)
      moveX /= length
      moveZ /= length
      
      // Apply movement
      const actualSpeed = speed * delta
      pos.x += moveX * actualSpeed
      pos.z += moveZ * actualSpeed
      
      // Clamp to world bounds
      pos.x = clamp(pos.x, -45, 45)
      pos.z = clamp(pos.z, -45, 45)
      
      // Rotate beetle to face movement direction
      const targetRotation = Math.atan2(moveX, moveZ)
      group.rotation.y = THREE.MathUtils.lerp(
        group.rotation.y,
        targetRotation,
        0.1
      )
      
      // Rolling animation
      setRollAngle(prev => prev + delta * 10)
      
      // Update tire system for movement
      getTireSystem().update(delta, true)
      
      // Check for passive clear upgrade
      if (getUpgradeSystem().hasPassiveClear()) {
        checkPassiveClear(pos)
      }
    } else {
      // Passive tire recovery
      getTireSystem().update(delta, false)
    }
    
    // Update player position in store
    setPlayerPosition([pos.x, pos.y, pos.z])
    
    // Update camera to follow player
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, pos.x, 0.05)
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, pos.z + 15, 0.05)
    camera.lookAt(pos.x, 0, pos.z)
    
    // Update economy system
    getBeadEconomy().update(delta)
  })
  
  // Check for voxels to clear passively (rolling mastery upgrade)
  const checkPassiveClear = (pos: THREE.Vector3) => {
    const clearRadius = 1.5
    
    voxels.forEach((voxel, id) => {
      const dx = voxel.position[0] - pos.x
      const dz = voxel.position[2] - pos.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      
      if (dist < clearRadius) {
        handleVoxelDamage(id)
      }
    })
  }
  
  // Handle voxel damage/destruction
  const handleVoxelDamage = (voxelId: string) => {
    const upgrade = getUpgradeSystem()
    const damage = upgrade.getEffectiveDamage(1)
    
    const destroyed = damageVoxel(voxelId, damage)
    
    if (destroyed) {
      // Award beads
      const voxel = voxels.get(voxelId)
      const pile = useWorldStore.getState().dungPiles.find(
        p => p.id === voxel?.pileId
      )
      
      getBeadEconomy().onVoxelDestroyed(pile?.isHotspot ?? false)
      getTireSystem().onVoxelDestroyed()
      
      if (onEat) {
        onEat(voxelId)
      }
    }
  }
  
  // Click to eat voxels
  const handleClick = () => {
    if (gamePhase !== 'playing') return
    if (tireState === 'EXHAUSTED') return
    
    const pos = groupRef.current?.position
    if (!pos) return
    
    // Find nearest voxel in front of beetle
    let nearestId: string | null = null
    let nearestDist = 2 // Max eat range
    
    voxels.forEach((voxel, id) => {
      const dx = voxel.position[0] - pos.x
      const dz = voxel.position[2] - pos.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      
      if (dist < nearestDist) {
        nearestDist = dist
        nearestId = id
      }
    })
    
    if (nearestId) {
      handleVoxelDamage(nearestId)
    }
  }
  
  return (
    <group
      ref={groupRef}
      position={initialPosition}
      onClick={handleClick}
    >
      {/* Beetle Body */}
      <BeetleBody
        ref={bodyRef}
        isMoving={isMoving}
        rollAngle={rollAngle}
      />
    </group>
  )
}

/**
 * Procedural beetle body geometry
 */
interface BeetleBodyProps {
  isMoving: boolean
  rollAngle: number
}

const BeetleBody = ({ isMoving, rollAngle }: BeetleBodyProps) => {
  const legAngle = isMoving ? Math.sin(rollAngle * 3) * 0.3 : 0
  
  return (
    <group>
      {/* Main shell */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <sphereGeometry args={[0.5, 8, 6]} />
        <meshStandardMaterial
          color={COLORS.beetleShell}
          roughness={0.3}
          metalness={0.2}
          flatShading
        />
      </mesh>
      
      {/* Shell highlight */}
      <mesh position={[0, 0.4, -0.1]} castShadow>
        <sphereGeometry args={[0.35, 6, 4]} />
        <meshStandardMaterial
          color={COLORS.beetleShellHighlight}
          roughness={0.4}
          metalness={0.1}
          flatShading
        />
      </mesh>
      
      {/* Head */}
      <mesh position={[0, 0.25, -0.4]} castShadow>
        <sphereGeometry args={[0.25, 6, 4]} />
        <meshStandardMaterial
          color={COLORS.beetleShell}
          roughness={0.3}
          flatShading
        />
      </mesh>
      
      {/* Mandibles */}
      <mesh position={[-0.1, 0.2, -0.6]} rotation={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.05, 0.05, 0.15]} />
        <meshStandardMaterial color={COLORS.beetleLeg} flatShading />
      </mesh>
      <mesh position={[0.1, 0.2, -0.6]} rotation={[0, -0.3, 0]} castShadow>
        <boxGeometry args={[0.05, 0.05, 0.15]} />
        <meshStandardMaterial color={COLORS.beetleLeg} flatShading />
      </mesh>
      
      {/* Legs - Left */}
      <BeetleLeg position={[-0.4, 0.1, -0.2]} angle={legAngle} side="left" />
      <BeetleLeg position={[-0.45, 0.1, 0]} angle={-legAngle} side="left" />
      <BeetleLeg position={[-0.4, 0.1, 0.2]} angle={legAngle} side="left" />
      
      {/* Legs - Right */}
      <BeetleLeg position={[0.4, 0.1, -0.2]} angle={-legAngle} side="right" />
      <BeetleLeg position={[0.45, 0.1, 0]} angle={legAngle} side="right" />
      <BeetleLeg position={[0.4, 0.1, 0.2]} angle={-legAngle} side="right" />
    </group>
  )
}

interface BeetleLegProps {
  position: [number, number, number]
  angle: number
  side: 'left' | 'right'
}

const BeetleLeg = ({ position, angle, side }: BeetleLegProps) => {
  const rotationZ = side === 'left' ? -0.5 + angle : 0.5 - angle
  
  return (
    <group position={position}>
      <mesh rotation={[0, 0, rotationZ]} castShadow>
        <boxGeometry args={[0.3, 0.05, 0.05]} />
        <meshStandardMaterial color={COLORS.beetleLeg} flatShading />
      </mesh>
    </group>
  )
}

export default Player
