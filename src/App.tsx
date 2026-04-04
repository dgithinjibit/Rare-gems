import { Suspense, useEffect, useState, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { useGameStore } from './stores/gameStore'
import { useWorldStore } from './stores/worldStore'
import { usePortalParams } from './hooks/usePortalParams'
import { useTireRecovery } from './hooks/useTireRecovery'
import { getPortalManager } from './systems/PortalManager'

// 3D Components
import { Player } from './components/Player'
import { AcaciaTrees } from './components/AcaciaTree'
import { Portals } from './components/Portal'
import { Environment, Ground, GrassTufts, DistantHills } from './components/Environment'
import { DungEngine, SavannaGround, GrassPatches } from './engine/DungEngine'

// UI Components
import { HUD } from './ui/HUD'
import { MiniMap } from './ui/MiniMap'
import { Shop } from './ui/Shop'
import { MainMenu } from './ui/MainMenu'
import { ExhaustionOverlay } from './ui/ExhaustionOverlay'

/**
 * Main Game Scene - 3D Canvas content
 */
function GameScene() {
  const trees = useWorldStore(state => state.trees)
  const portals = useWorldStore(state => state.portals)
  const voxels = useWorldStore(state => state.voxels)
  const damageVoxel = useWorldStore(state => state.damageVoxel)
  
  // Handle voxel clicks
  const handleVoxelClick = useCallback((voxelId: string) => {
    damageVoxel(voxelId, 1)
  }, [damageVoxel])
  
  // Handle portal interaction
  const handlePortalEnter = useCallback((portal: { id: string; type: 'level' | 'global' }) => {
    const portalManager = getPortalManager()
    
    if (portal.type === 'level') {
      portalManager.enterLevelPortal(portal.id)
    } else {
      portalManager.enterGlobalPortal()
    }
  }, [])
  
  return (
    <>
      {/* Environment */}
      <Environment />
      <Ground size={100} />
      <GrassTufts count={150} spread={45} />
      <DistantHills />
      
      {/* Dung voxels */}
      <DungEngine
        onVoxelClick={handleVoxelClick}
        maxVoxels={3000}
      />
      
      {/* Acacia trees */}
      <AcaciaTrees trees={trees} />
      
      {/* Portals */}
      <Portals portals={portals} onEnterPortal={handlePortalEnter} />
      
      {/* Player */}
      <Player />
    </>
  )
}

/**
 * Game UI Overlay
 */
function GameUI({ onOpenShop }: { onOpenShop: () => void }) {
  // Activate tire recovery hook
  useTireRecovery()
  
  return (
    <>
      <HUD />
      <MiniMap />
      <ExhaustionOverlay />
      
      {/* Shop button */}
      <button
        onClick={onOpenShop}
        className="fixed bottom-4 right-4 z-20 px-4 py-2 bg-maasai-ochre hover:bg-maasai-ochre/80 text-white font-display uppercase tracking-wide rounded maasai-border transition-all pointer-events-auto"
      >
        Trading Post
      </button>
    </>
  )
}

/**
 * Loading screen
 */
function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-earth-dark">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-maasai-red border-t-transparent rounded-full animate-spin" />
        <p className="text-maasai-white font-display uppercase tracking-wide">
          Loading Savanna...
        </p>
      </div>
    </div>
  )
}

/**
 * Main App Component
 */
export default function App() {
  const gamePhase = useGameStore(state => state.gamePhase)
  const setGamePhase = useGameStore(state => state.setGamePhase)
  const generateWorld = useWorldStore(state => state.generateWorld)
  
  const [isShopOpen, setIsShopOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  // Initialize portal params
  usePortalParams()
  
  // Initialize game world
  useEffect(() => {
    // Generate initial world
    const seed = Date.now()
    generateWorld(seed)
    
    // Initialize portal manager
    getPortalManager().initialize()
    
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 500)
    
    return () => clearTimeout(timer)
  }, [generateWorld])
  
  // Start game handler
  const handleStartGame = useCallback(() => {
    setGamePhase('playing')
  }, [setGamePhase])
  
  // Show loading screen
  if (isLoading) {
    return <LoadingScreen />
  }
  
  return (
    <div className="w-full h-full relative">
      {/* 3D Canvas */}
      <Canvas
        camera={{
          position: [0, 15, 20],
          fov: 50,
          near: 0.1,
          far: 200,
        }}
        shadows
        className="w-full h-full"
      >
        <Suspense fallback={null}>
          <GameScene />
        </Suspense>
      </Canvas>
      
      {/* UI Layer */}
      {gamePhase === 'menu' && (
        <MainMenu onStartGame={handleStartGame} />
      )}
      
      {gamePhase === 'playing' && (
        <GameUI onOpenShop={() => setIsShopOpen(true)} />
      )}
      
      {/* Shop modal */}
      <Shop isOpen={isShopOpen} onClose={() => setIsShopOpen(false)} />
    </div>
  )
}
