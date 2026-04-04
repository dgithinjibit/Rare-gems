import { useRef, useEffect } from 'react'
import { useGameStore } from '../stores/gameStore'
import { useWorldStore } from '../stores/worldStore'
import { COLORS } from '../utils/colors'

interface MiniMapProps {
  size?: number
  worldSize?: number
}

/**
 * Canvas-based minimap showing player, piles, and trees
 */
export function MiniMap({ size = 150, worldSize = 100 }: MiniMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  const playerPosition = useGameStore(state => state.playerPosition)
  const dungPiles = useWorldStore(state => state.dungPiles)
  const trees = useWorldStore(state => state.trees)
  const portals = useWorldStore(state => state.portals)
  
  // Scale world coordinates to minimap
  const worldToMap = (x: number, z: number): [number, number] => {
    const scale = size / worldSize
    const mapX = (x + worldSize / 2) * scale
    const mapY = (z + worldSize / 2) * scale
    return [mapX, mapY]
  }
  
  // Draw minimap
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Clear canvas
    ctx.fillStyle = '#2a2a1a'
    ctx.fillRect(0, 0, size, size)
    
    // Draw border
    ctx.strokeStyle = COLORS.maasaiRed
    ctx.lineWidth = 3
    ctx.strokeRect(0, 0, size, size)
    
    // Inner border (Maasai pattern)
    ctx.strokeStyle = COLORS.maasaiBlue
    ctx.lineWidth = 1
    ctx.strokeRect(3, 3, size - 6, size - 6)
    
    // Draw trees (green dots)
    ctx.fillStyle = COLORS.grassGreen
    trees.forEach(tree => {
      const [x, y] = worldToMap(tree.position[0], tree.position[2])
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fill()
    })
    
    // Draw dung piles
    dungPiles.forEach(pile => {
      const [x, y] = worldToMap(pile.position[0], pile.position[2])
      
      if (pile.isCleared) {
        // Cleared pile - dim
        ctx.fillStyle = '#444'
      } else if (pile.isHotspot) {
        // Hotspot - gold
        ctx.fillStyle = COLORS.ochre
      } else {
        // Normal pile - brown
        ctx.fillStyle = COLORS.earthBrown
      }
      
      ctx.beginPath()
      ctx.arc(x, y, pile.isHotspot ? 6 : 5, 0, Math.PI * 2)
      ctx.fill()
      
      // Hotspot glow
      if (pile.isHotspot && !pile.isCleared) {
        ctx.strokeStyle = COLORS.ochre
        ctx.lineWidth = 2
        ctx.stroke()
      }
    })
    
    // Draw portals
    portals.forEach(portal => {
      if (!portal.active) return
      
      const [x, y] = worldToMap(portal.position[0], portal.position[2])
      ctx.fillStyle = portal.type === 'level' ? COLORS.maasaiBlue : COLORS.maasaiRed
      
      // Draw star shape for portal
      ctx.beginPath()
      for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2
        const radius = i === 0 ? 6 : 6
        const px = x + Math.cos(angle) * radius
        const py = y + Math.sin(angle) * radius
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.fill()
    })
    
    // Draw player (triangle pointing in movement direction)
    const [px, py] = worldToMap(playerPosition[0], playerPosition[2])
    
    // Player glow
    const gradient = ctx.createRadialGradient(px, py, 0, px, py, 10)
    gradient.addColorStop(0, 'rgba(227, 27, 35, 0.5)')
    gradient.addColorStop(1, 'rgba(227, 27, 35, 0)')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(px, py, 10, 0, Math.PI * 2)
    ctx.fill()
    
    // Player marker
    ctx.fillStyle = COLORS.maasaiRed
    ctx.beginPath()
    ctx.arc(px, py, 5, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.fillStyle = COLORS.beadWhite
    ctx.beginPath()
    ctx.arc(px, py, 2, 0, Math.PI * 2)
    ctx.fill()
    
  }, [playerPosition, dungPiles, trees, portals, size, worldSize])
  
  return (
    <div className="absolute top-4 right-4 pointer-events-none">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="rounded-lg shadow-lg"
        style={{
          imageRendering: 'pixelated',
        }}
      />
      
      {/* Legend */}
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-maasai-white/70 bg-earth-dark/60 px-2 py-1 rounded">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-maasai-red" /> You
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-earth-brown" /> Dung
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-savanna-grass" /> Shade
        </span>
      </div>
    </div>
  )
}

export default MiniMap
