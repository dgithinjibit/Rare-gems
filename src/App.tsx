import { Suspense, useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Stats } from '@react-three/drei'
import * as THREE from 'three'
import { create } from 'zustand'
import { ShoppingBag, X, ChevronRight, Map, Zap, Shield } from 'lucide-react'

// ============================================================================
// COLORS - Vibe Jam Palette: Red (#FF0000), Blue (#0000FF), Earthy Ochre
// ============================================================================
const COLORS = {
  maasaiRed: '#FF0000',
  maasaiBlue: '#0000FF',
  ochre: '#CC7722',
  beadWhite: '#F5F5DC',
  earthBrown: '#8B4513',
  earthDark: '#3D2914',
  grassDry: '#9B8B5A',
  grassGreen: '#228B22',
  dungMid: '#5C3D1E',
  dungLight: '#6B4423',
}

// ============================================================================
// ZUSTAND STORE - Game State
// ============================================================================
interface DungVoxel {
  id: string
  position: THREE.Vector3
  active: boolean
}

interface GameState {
  // Core stats
  tire: number
  beads: number
  isExhausted: boolean
  exhaustionTimer: number
  
  // World
  voxels: DungVoxel[]
  playerPosition: THREE.Vector3
  isNearTree: boolean
  
  // UI
  shopOpen: boolean
  gameStarted: boolean
  
  // Upgrades
  hasShovelLegs: boolean
  hasRollingShell: boolean
  
  // Actions
  setTire: (tire: number) => void
  addBeads: (amount: number) => void
  setExhausted: (exhausted: boolean) => void
  setExhaustionTimer: (timer: number) => void
  removeVoxel: (id: string) => void
  setPlayerPosition: (pos: THREE.Vector3) => void
  setIsNearTree: (near: boolean) => void
  setShopOpen: (open: boolean) => void
  setGameStarted: (started: boolean) => void
  purchaseUpgrade: (upgrade: 'shovelLegs' | 'rollingShell') => boolean
  initVoxels: () => void
}

const useGameStore = create<GameState>((set, get) => ({
  tire: 0,
  beads: 0,
  isExhausted: false,
  exhaustionTimer: 0,
  voxels: [],
  playerPosition: new THREE.Vector3(0, 0.5, 0),
  isNearTree: false,
  shopOpen: false,
  gameStarted: false,
  hasShovelLegs: false,
  hasRollingShell: false,
  
  setTire: (tire) => set({ tire: Math.max(0, Math.min(100, tire)) }),
  addBeads: (amount) => set((s) => ({ beads: s.beads + amount })),
  setExhausted: (exhausted) => set({ isExhausted: exhausted }),
  setExhaustionTimer: (timer) => set({ exhaustionTimer: timer }),
  removeVoxel: (id) => set((s) => ({ 
    voxels: s.voxels.map(v => v.id === id ? { ...v, active: false } : v) 
  })),
  setPlayerPosition: (pos) => set({ playerPosition: pos }),
  setIsNearTree: (near) => set({ isNearTree: near }),
  setShopOpen: (open) => set({ shopOpen: open }),
  setGameStarted: (started) => set({ gameStarted: started }),
  
  purchaseUpgrade: (upgrade) => {
    const state = get()
    const cost = upgrade === 'shovelLegs' ? 50 : 100
    
    if (state.beads >= cost) {
      set((s) => ({
        beads: s.beads - cost,
        ...(upgrade === 'shovelLegs' ? { hasShovelLegs: true } : { hasRollingShell: true }),
      }))
      return true
    }
    return false
  },
  
  initVoxels: () => {
    const voxels: DungVoxel[] = []
    const pileCenter = new THREE.Vector3(0, 0.5, -5)
    
    // Create 100+ voxels in a pile shape
    for (let x = -3; x <= 3; x++) {
      for (let z = -3; z <= 3; z++) {
        const dist = Math.sqrt(x * x + z * z)
        const height = Math.max(1, Math.floor(4 - dist))
        
        for (let y = 0; y < height; y++) {
          voxels.push({
            id: `voxel-${x}-${y}-${z}`,
            position: new THREE.Vector3(
              pileCenter.x + x,
              pileCenter.y + y,
              pileCenter.z + z
            ),
            active: true,
          })
        }
      }
    }
    
    set({ voxels })
  },
}))

// ============================================================================
// 3D COMPONENTS
// ============================================================================

/** Procedural Beetle - Sphere body + 6 cone legs, follows mouse/pointer */
function Beetle() {
  const groupRef = useRef<THREE.Group>(null)
  const { camera, pointer } = useThree()
  
  const setPlayerPosition = useGameStore((s) => s.setPlayerPosition)
  const setIsNearTree = useGameStore((s) => s.setIsNearTree)
  const isExhausted = useGameStore((s) => s.isExhausted)
  const gameStarted = useGameStore((s) => s.gameStarted)
  
  const [legAngles, setLegAngles] = useState([0, 0, 0, 0, 0, 0])
  
  useFrame((state, delta) => {
    if (!groupRef.current || !gameStarted) return
    
    // Get world position from pointer
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(pointer, camera)
    
    const target = new THREE.Vector3()
    raycaster.ray.intersectPlane(plane, target)
    
    // Clamp to world bounds
    target.x = Math.max(-40, Math.min(40, target.x))
    target.z = Math.max(-40, Math.min(40, target.z))
    
    // Smooth movement
    const speed = isExhausted ? 0 : 0.08
    groupRef.current.position.lerp(new THREE.Vector3(target.x, 0.5, target.z), speed)
    
    // Rotate to face movement direction
    const direction = target.clone().sub(groupRef.current.position)
    if (direction.length() > 0.1) {
      const angle = Math.atan2(direction.x, direction.z)
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, angle, 0.1)
      
      // Animate legs
      const t = state.clock.elapsedTime * 10
      setLegAngles([
        Math.sin(t) * 0.4,
        Math.sin(t + 1) * 0.4,
        Math.sin(t + 2) * 0.4,
        Math.sin(t + 3) * 0.4,
        Math.sin(t + 4) * 0.4,
        Math.sin(t + 5) * 0.4,
      ])
    }
    
    // Update store position
    setPlayerPosition(groupRef.current.position.clone())
    
    // Check if near tree (within 5 units)
    const treePos = new THREE.Vector3(15, 0, 10)
    const distToTree = groupRef.current.position.distanceTo(treePos)
    setIsNearTree(distToTree < 5)
  })
  
  return (
    <group ref={groupRef} position={[0, 0.5, 0]}>
      {/* Body - Sphere */}
      <mesh castShadow>
        <sphereGeometry args={[0.6, 16, 12]} />
        <meshStandardMaterial color={COLORS.earthDark} flatShading roughness={0.6} />
      </mesh>
      
      {/* Shell highlight */}
      <mesh position={[0, 0.1, -0.1]} castShadow>
        <sphereGeometry args={[0.45, 12, 8]} />
        <meshStandardMaterial color={COLORS.ochre} flatShading roughness={0.5} metalness={0.1} />
      </mesh>
      
      {/* Head */}
      <mesh position={[0, 0, -0.5]} castShadow>
        <sphereGeometry args={[0.25, 8, 6]} />
        <meshStandardMaterial color={COLORS.earthDark} flatShading />
      </mesh>
      
      {/* 6 Legs - Cones */}
      {[-1, 1].map((side) =>
        [0, 1, 2].map((idx) => (
          <group
            key={`leg-${side}-${idx}`}
            position={[side * 0.5, -0.2, (idx - 1) * 0.35]}
            rotation={[0, 0, side * (0.8 + legAngles[side === -1 ? idx : idx + 3])]}
          >
            <mesh castShadow>
              <coneGeometry args={[0.06, 0.5, 6]} />
              <meshStandardMaterial color={COLORS.earthBrown} flatShading />
            </mesh>
          </group>
        ))
      )}
    </group>
  )
}

/** Dung Pile - InstancedMesh of 100+ cubes */
function DungPile() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const voxels = useGameStore((s) => s.voxels)
  const removeVoxel = useGameStore((s) => s.removeVoxel)
  const playerPosition = useGameStore((s) => s.playerPosition)
  const isExhausted = useGameStore((s) => s.isExhausted)
  const tire = useGameStore((s) => s.tire)
  const setTire = useGameStore((s) => s.setTire)
  const addBeads = useGameStore((s) => s.addBeads)
  const setExhausted = useGameStore((s) => s.setExhausted)
  const setExhaustionTimer = useGameStore((s) => s.setExhaustionTimer)
  const hasShovelLegs = useGameStore((s) => s.hasShovelLegs)
  
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const colors = useMemo(() => [COLORS.dungMid, COLORS.dungLight, COLORS.earthBrown], [])
  
  // Update instances
  useEffect(() => {
    if (!meshRef.current) return
    
    const activeVoxels = voxels.filter(v => v.active)
    
    activeVoxels.forEach((voxel, i) => {
      dummy.position.copy(voxel.position)
      dummy.updateMatrix()
      meshRef.current!.setMatrixAt(i, dummy.matrix)
      
      // Vary colors
      const color = new THREE.Color(colors[i % colors.length])
      meshRef.current!.setColorAt(i, color)
    })
    
    meshRef.current.count = activeVoxels.length
    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true
  }, [voxels, dummy, colors])
  
  // Click handler - eat voxels
  const handleClick = useCallback((e: { instanceId?: number }) => {
    if (isExhausted) return
    
    const instanceId = e.instanceId
    if (instanceId === undefined) return
    
    const activeVoxels = voxels.filter(v => v.active)
    const clickedVoxel = activeVoxels[instanceId]
    
    if (clickedVoxel) {
      // Check if player is close enough (within 2 units)
      const dist = playerPosition.distanceTo(clickedVoxel.position)
      if (dist > 3) return
      
      // Remove voxel
      removeVoxel(clickedVoxel.id)
      
      // Increase Tire by 5% (or 10% with Shovel Legs)
      const tireIncrease = hasShovelLegs ? 10 : 5
      const newTire = tire + tireIncrease
      
      if (newTire >= 100) {
        // EXHAUSTION - disable for 5 seconds
        setTire(100)
        setExhausted(true)
        setExhaustionTimer(5)
      } else {
        setTire(newTire)
      }
      
      // Add 10 beads
      addBeads(10)
    }
  }, [voxels, playerPosition, isExhausted, tire, hasShovelLegs, removeVoxel, setTire, addBeads, setExhausted, setExhaustionTimer])
  
  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, 200]}
      onClick={(e) => handleClick({ instanceId: e.instanceId })}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[0.9, 0.9, 0.9]} />
      <meshStandardMaterial vertexColors flatShading roughness={0.9} />
    </instancedMesh>
  )
}

/** Acacia Tree - Procedural shade zone */
function AcaciaTree() {
  return (
    <group position={[15, 0, 10]}>
      {/* Trunk */}
      <mesh position={[0, 2, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.5, 4, 8]} />
        <meshStandardMaterial color="#654321" flatShading />
      </mesh>
      
      {/* Canopy - flat umbrella shape */}
      <mesh position={[0, 4.5, 0]} castShadow>
        <cylinderGeometry args={[4, 3, 0.8, 12]} />
        <meshStandardMaterial color={COLORS.grassGreen} flatShading />
      </mesh>
      
      {/* Shade indicator on ground */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[5, 24]} />
        <meshStandardMaterial color={COLORS.grassGreen} transparent opacity={0.2} />
      </mesh>
    </group>
  )
}

/** Portal - Torus with Maasai pattern */
function Portal() {
  const ringRef = useRef<THREE.Mesh>(null)
  const playerPosition = useGameStore((s) => s.playerPosition)
  const tire = useGameStore((s) => s.tire)
  
  useFrame((state) => {
    if (!ringRef.current) return
    ringRef.current.rotation.z = state.clock.elapsedTime * 0.5
    ringRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.2
    
    // Check collision with player
    const portalPos = new THREE.Vector3(-35, 1.5, 0)
    const dist = playerPosition.distanceTo(portalPos)
    
    if (dist < 2) {
      // Trigger portal navigation
      const username = 'Beetle'
      const hp = Math.floor(tire)
      window.location.href = `https://jam.pieter.com/portal/2026?username=${username}&hp=${hp}`
    }
  })
  
  return (
    <group position={[-35, 1.5, 0]}>
      {/* Outer ring - Red */}
      <mesh ref={ringRef}>
        <torusGeometry args={[1.8, 0.2, 8, 32]} />
        <meshStandardMaterial 
          color={COLORS.maasaiRed} 
          emissive={COLORS.maasaiRed} 
          emissiveIntensity={0.4}
        />
      </mesh>
      
      {/* Middle ring - Blue */}
      <mesh rotation={[0, 0, Math.PI / 6]}>
        <torusGeometry args={[1.5, 0.15, 8, 24]} />
        <meshStandardMaterial 
          color={COLORS.maasaiBlue} 
          emissive={COLORS.maasaiBlue} 
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Inner ring - Ochre */}
      <mesh rotation={[0, 0, -Math.PI / 6]}>
        <torusGeometry args={[1.2, 0.1, 6, 20]} />
        <meshStandardMaterial 
          color={COLORS.ochre} 
          emissive={COLORS.ochre} 
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Portal surface */}
      <mesh>
        <circleGeometry args={[1.1, 24]} />
        <meshStandardMaterial
          color="#1a0a2e"
          emissive={COLORS.maasaiBlue}
          emissiveIntensity={0.3}
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Ground glow */}
      <mesh position={[0, -1.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.5, 16]} />
        <meshStandardMaterial
          color={COLORS.maasaiRed}
          transparent
          opacity={0.25}
        />
      </mesh>
    </group>
  )
}

/** Savanna Ground - Flat shaded plane */
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[100, 100, 32, 32]} />
      <meshStandardMaterial color={COLORS.grassDry} flatShading roughness={1} />
    </mesh>
  )
}

/** Environment - Lighting */
function Environment() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[20, 30, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={100}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />
      <hemisphereLight args={['#87CEEB', COLORS.grassDry, 0.3]} />
      <fog attach="fog" args={['#d4c4a8', 40, 80]} />
    </>
  )
}

/** Game Logic - Tire decay, exhaustion timer */
function GameLogic() {
  const tire = useGameStore((s) => s.tire)
  const setTire = useGameStore((s) => s.setTire)
  const isExhausted = useGameStore((s) => s.isExhausted)
  const setExhausted = useGameStore((s) => s.setExhausted)
  const exhaustionTimer = useGameStore((s) => s.exhaustionTimer)
  const setExhaustionTimer = useGameStore((s) => s.setExhaustionTimer)
  const isNearTree = useGameStore((s) => s.isNearTree)
  const gameStarted = useGameStore((s) => s.gameStarted)
  const hasRollingShell = useGameStore((s) => s.hasRollingShell)
  
  useFrame((_, delta) => {
    if (!gameStarted) return
    
    if (isExhausted) {
      // Count down exhaustion timer
      const newTimer = exhaustionTimer - delta
      if (newTimer <= 0) {
        setExhausted(false)
        setExhaustionTimer(0)
        setTire(50) // Reset to 50% after exhaustion
      } else {
        setExhaustionTimer(newTimer)
      }
    } else if (tire > 0) {
      // Tire decreases by 2% per second (4% with Rolling Shell recovery bonus near trees)
      let decayRate = 2
      
      if (isNearTree) {
        // 2x faster recovery under tree
        decayRate = hasRollingShell ? 6 : 4
      }
      
      setTire(tire - decayRate * delta)
    }
  })
  
  return null
}

// ============================================================================
// UI COMPONENTS (Tailwind)
// ============================================================================

/** HUD - Tire Gauge, Bead Counter */
function HUD() {
  const tire = useGameStore((s) => s.tire)
  const beads = useGameStore((s) => s.beads)
  const isExhausted = useGameStore((s) => s.isExhausted)
  const exhaustionTimer = useGameStore((s) => s.exhaustionTimer)
  const isNearTree = useGameStore((s) => s.isNearTree)
  const setShopOpen = useGameStore((s) => s.setShopOpen)
  
  const tireColor = tire < 50 ? '#4CAF50' : tire < 80 ? '#FFC107' : '#F44336'
  
  return (
    <div className="fixed inset-0 pointer-events-none z-10">
      {/* Top Left - Tire Gauge */}
      <div className="absolute top-4 left-4 flex flex-col gap-2">
        <div className="bg-[#3D2914]/90 px-4 py-3 rounded-lg border-2 border-[#FF0000]">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={16} className="text-[#F5F5DC]" />
            <span className="text-[#F5F5DC] text-sm font-bold uppercase tracking-wide">
              Tire
            </span>
            <span className="text-[#F5F5DC] text-sm ml-auto">{Math.floor(tire)}%</span>
          </div>
          <div className="w-48 h-4 bg-[#1a1a1a] rounded-full overflow-hidden border border-[#0000FF]">
            <div
              className="h-full transition-all duration-150"
              style={{ width: `${tire}%`, backgroundColor: tireColor }}
            />
          </div>
          {isNearTree && !isExhausted && (
            <p className="text-[#228B22] text-xs mt-1">Recovering in shade (2x)</p>
          )}
        </div>
        
        {/* Exhaustion warning */}
        {isExhausted && (
          <div className="bg-[#FF0000]/90 px-4 py-2 rounded-lg animate-pulse">
            <p className="text-white text-sm font-bold">EXHAUSTED!</p>
            <p className="text-white/80 text-xs">Wait {Math.ceil(exhaustionTimer)}s...</p>
          </div>
        )}
      </div>
      
      {/* Top Right - Bead Counter */}
      <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
        <div className="bg-[#3D2914]/90 px-4 py-3 rounded-lg border-2 border-[#0000FF]">
          <div className="flex items-center gap-3">
            <BeadIcon />
            <span className="text-[#F5F5DC] text-2xl font-bold">{beads}</span>
          </div>
        </div>
        
        {/* Shop Button */}
        <button
          onClick={() => setShopOpen(true)}
          className="pointer-events-auto bg-[#CC7722] hover:bg-[#CC7722]/80 px-4 py-2 rounded-lg flex items-center gap-2 border-2 border-[#FF0000] transition-colors"
        >
          <ShoppingBag size={18} className="text-white" />
          <span className="text-white font-bold text-sm uppercase">Shop</span>
        </button>
      </div>
      
      {/* Controls hint */}
      <div className="absolute bottom-4 left-4 bg-[#3D2914]/70 px-3 py-2 rounded-lg">
        <p className="text-[#F5F5DC]/70 text-xs">Move: Mouse/Touch</p>
        <p className="text-[#F5F5DC]/70 text-xs">Eat: Click/Tap dung</p>
      </div>
    </div>
  )
}

/** MiniMap - 2D canvas overlay */
function MiniMapCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const playerPosition = useGameStore((s) => s.playerPosition)
  const voxels = useGameStore((s) => s.voxels)
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const size = 120
    const worldSize = 100
    const scale = size / worldSize
    
    // Clear
    ctx.fillStyle = '#2a2a1a'
    ctx.fillRect(0, 0, size, size)
    
    // Border - Maasai pattern
    ctx.strokeStyle = COLORS.maasaiRed
    ctx.lineWidth = 3
    ctx.strokeRect(0, 0, size, size)
    ctx.strokeStyle = COLORS.maasaiBlue
    ctx.lineWidth = 1
    ctx.strokeRect(3, 3, size - 6, size - 6)
    
    // Dung pile center
    const activeVoxels = voxels.filter(v => v.active)
    if (activeVoxels.length > 0) {
      const px = (0 + worldSize / 2) * scale
      const py = (-5 + worldSize / 2) * scale
      ctx.fillStyle = COLORS.earthBrown
      ctx.beginPath()
      ctx.arc(px, py, 6, 0, Math.PI * 2)
      ctx.fill()
      
      // Voxel count
      ctx.fillStyle = COLORS.beadWhite
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(String(activeVoxels.length), px, py + 3)
    }
    
    // Tree
    const tx = (15 + worldSize / 2) * scale
    const ty = (10 + worldSize / 2) * scale
    ctx.fillStyle = COLORS.grassGreen
    ctx.beginPath()
    ctx.arc(tx, ty, 5, 0, Math.PI * 2)
    ctx.fill()
    
    // Portal
    const portX = (-35 + worldSize / 2) * scale
    const portY = (0 + worldSize / 2) * scale
    ctx.fillStyle = COLORS.maasaiRed
    ctx.beginPath()
    ctx.arc(portX, portY, 5, 0, Math.PI * 2)
    ctx.fill()
    
    // Player
    const playerX = (playerPosition.x + worldSize / 2) * scale
    const playerY = (playerPosition.z + worldSize / 2) * scale
    
    // Player glow
    const gradient = ctx.createRadialGradient(playerX, playerY, 0, playerX, playerY, 8)
    gradient.addColorStop(0, 'rgba(255, 0, 0, 0.6)')
    gradient.addColorStop(1, 'rgba(255, 0, 0, 0)')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(playerX, playerY, 8, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.fillStyle = COLORS.maasaiRed
    ctx.beginPath()
    ctx.arc(playerX, playerY, 4, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.fillStyle = COLORS.beadWhite
    ctx.beginPath()
    ctx.arc(playerX, playerY, 2, 0, Math.PI * 2)
    ctx.fill()
    
  }, [playerPosition, voxels])
  
  return (
    <div className="absolute top-20 right-4 pointer-events-none">
      <div className="flex items-center gap-1 mb-1">
        <Map size={14} className="text-[#F5F5DC]/70" />
        <span className="text-[#F5F5DC]/70 text-xs uppercase">Map</span>
      </div>
      <canvas
        ref={canvasRef}
        width={120}
        height={120}
        className="rounded-lg"
        style={{ imageRendering: 'pixelated' }}
      />
      <div className="flex gap-2 mt-1 text-xs text-[#F5F5DC]/60">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#FF0000]" /> You
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#228B22]" /> Tree
        </span>
      </div>
    </div>
  )
}

/** Shop - Slide-out sidebar */
function Shop() {
  const shopOpen = useGameStore((s) => s.shopOpen)
  const setShopOpen = useGameStore((s) => s.setShopOpen)
  const beads = useGameStore((s) => s.beads)
  const purchaseUpgrade = useGameStore((s) => s.purchaseUpgrade)
  const hasShovelLegs = useGameStore((s) => s.hasShovelLegs)
  const hasRollingShell = useGameStore((s) => s.hasRollingShell)
  
  if (!shopOpen) return null
  
  const upgrades = [
    {
      id: 'shovelLegs' as const,
      name: 'Shovel Legs',
      description: 'Double tire gain per voxel (5% -> 10%)',
      cost: 50,
      owned: hasShovelLegs,
      icon: <Zap size={24} className="text-[#CC7722]" />,
    },
    {
      id: 'rollingShell' as const,
      name: 'Rolling Shell',
      description: '50% faster recovery under trees',
      cost: 100,
      owned: hasRollingShell,
      icon: <Shield size={24} className="text-[#0000FF]" />,
    },
  ]
  
  return (
    <div className="fixed inset-0 z-50 pointer-events-auto">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={() => setShopOpen(false)} />
      
      {/* Sidebar */}
      <div className="absolute right-0 top-0 bottom-0 w-80 bg-[#3D2914] border-l-4 border-[#FF0000] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b-2 border-[#0000FF]">
          <h2 className="text-[#F5F5DC] text-xl font-bold uppercase tracking-wide">
            Trading Post
          </h2>
          <button onClick={() => setShopOpen(false)} className="text-[#F5F5DC]/60 hover:text-[#F5F5DC]">
            <X size={24} />
          </button>
        </div>
        
        {/* Bead balance */}
        <div className="px-4 py-3 bg-[#2a1f14] flex items-center gap-2">
          <BeadIcon />
          <span className="text-[#F5F5DC] font-bold text-lg">{beads}</span>
          <span className="text-[#F5F5DC]/60 text-sm">beads</span>
        </div>
        
        {/* Upgrades */}
        <div className="p-4 space-y-3">
          {upgrades.map((upgrade) => (
            <div
              key={upgrade.id}
              className={`p-4 rounded-lg border-2 ${
                upgrade.owned 
                  ? 'border-[#228B22] bg-[#228B22]/10' 
                  : 'border-[#CC7722] bg-[#1a1510]'
              }`}
            >
              <div className="flex items-start gap-3">
                {upgrade.icon}
                <div className="flex-1">
                  <h3 className="text-[#F5F5DC] font-bold">{upgrade.name}</h3>
                  <p className="text-[#F5F5DC]/60 text-sm mt-1">{upgrade.description}</p>
                </div>
              </div>
              
              {upgrade.owned ? (
                <div className="mt-3 text-[#228B22] text-sm font-bold uppercase">Owned</div>
              ) : (
                <button
                  onClick={() => purchaseUpgrade(upgrade.id)}
                  disabled={beads < upgrade.cost}
                  className={`mt-3 w-full py-2 rounded font-bold text-sm uppercase flex items-center justify-center gap-2 ${
                    beads >= upgrade.cost
                      ? 'bg-[#FF0000] hover:bg-[#FF0000]/80 text-white'
                      : 'bg-[#555] text-[#888] cursor-not-allowed'
                  }`}
                >
                  <BeadIcon size={14} />
                  <span>{upgrade.cost}</span>
                  <ChevronRight size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Maasai Bead Icon */
function BeadIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8" fill={COLORS.maasaiRed} />
      <circle cx="10" cy="10" r="6" fill={COLORS.maasaiBlue} />
      <circle cx="10" cy="10" r="4" fill={COLORS.beadWhite} />
      <circle cx="10" cy="10" r="2" fill={COLORS.ochre} />
    </svg>
  )
}

/** Main Menu */
function MainMenu() {
  const setGameStarted = useGameStore((s) => s.setGameStarted)
  const initVoxels = useGameStore((s) => s.initVoxels)
  
  const handleStart = () => {
    initVoxels()
    setGameStarted(true)
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3D2914]">
      <div className="text-center px-8">
        <h1 className="text-5xl font-bold text-[#F5F5DC] mb-2 tracking-tight">
          DUNG CRAFT
        </h1>
        <p className="text-[#CC7722] text-xl mb-1 uppercase tracking-widest">
          Savanna Strategist
        </p>
        <p className="text-[#F5F5DC]/60 text-sm mb-8">
          2026 Vibe Coding Game Jam
        </p>
        
        <button
          onClick={handleStart}
          className="px-8 py-4 bg-[#FF0000] hover:bg-[#FF0000]/80 text-white font-bold text-xl uppercase tracking-wide rounded-lg border-4 border-[#0000FF] transition-all hover:scale-105"
        >
          Start Game
        </button>
        
        <div className="mt-8 text-[#F5F5DC]/50 text-sm">
          <p>Move with mouse/touch</p>
          <p>Click dung to eat and fill your tire</p>
          <p>Rest under trees to recover</p>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN APP
// ============================================================================
export default function App() {
  const gameStarted = useGameStore((s) => s.gameStarted)
  const setGameStarted = useGameStore((s) => s.setGameStarted)
  const initVoxels = useGameStore((s) => s.initVoxels)
  
// Vibe Jam compliance - load widget and check portal param
  useEffect(() => {
    // Load Vibe Jam widget
    const script = document.createElement('script')
    script.src = 'https://jam.pieter.com/2026/widget.js'
    script.async = true
    document.body.appendChild(script)
    
    // Check for portal param to skip intro
    const params = new URLSearchParams(window.location.search)
    if (params.get('portal') === 'true') {
      initVoxels()
      setGameStarted(true)
    }
    
    return () => {
      document.body.removeChild(script)
    }
  }, [initVoxels, setGameStarted])
  
  return (
    <div className="fixed inset-0 bg-[#3D2914]">
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 12, 18], fov: 50 }}
        shadows
        style={{ width: '100%', height: '100%', touchAction: 'none' }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <Environment />
          <Ground />
          <DungPile />
          <Beetle />
          <AcaciaTree />
          <Portal />
          <GameLogic />
        </Suspense>
        
        {/* Performance Stats - positioned by drei */}
        <Stats />
      </Canvas>
      
      {/* UI Layer */}
      {!gameStarted && <MainMenu />}
      {gameStarted && (
        <>
          <HUD />
          <MiniMapCanvas />
          <Shop />
        </>
      )}
    </div>
  )
}
