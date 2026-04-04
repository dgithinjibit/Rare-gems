import { useGameStore } from '../stores/gameStore'
import { getTireColor } from '../utils/colors'

/**
 * Heads-Up Display - Shows tire bar, beads, combo, and upgrades
 */
export function HUD() {
  const tire = useGameStore(state => state.tire)
  const tireState = useGameStore(state => state.tireState)
  const beads = useGameStore(state => state.beads)
  const combo = useGameStore(state => state.combo)
  const currentLevel = useGameStore(state => state.currentLevel)
  const dungPilesCleared = useGameStore(state => state.dungPilesCleared)
  const totalDungPilesInLevel = useGameStore(state => state.totalDungPilesInLevel)
  
  const tireColor = getTireColor(tire)
  const isFatigued = tireState === 'FATIGUED'
  const isExhausted = tireState === 'EXHAUSTED'
  
  return (
    <div className="fixed inset-0 pointer-events-none z-10">
      {/* Top bar */}
      <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-4">
        {/* Left side - Tire and Level */}
        <div className="flex flex-col gap-3">
          {/* Tire meter */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-maasai-white font-display text-sm uppercase tracking-wide">
                Tire
              </span>
              <span 
                className={`text-xs font-bold ${isFatigued ? 'text-yellow-400 tire-warning' : ''} ${isExhausted ? 'text-red-500 tire-warning' : ''}`}
                style={{ color: isExhausted ? '#F44336' : isFatigued ? '#FFC107' : '#F5F5DC' }}
              >
                {Math.round(tire)}%
              </span>
            </div>
            <div className="w-48 h-4 bg-earth-dark rounded-full overflow-hidden maasai-border">
              <div
                className={`h-full transition-all duration-200 ${isFatigued ? 'tire-warning' : ''}`}
                style={{
                  width: `${tire}%`,
                  backgroundColor: tireColor,
                }}
              />
            </div>
            {tireState === 'RECOVERING' && (
              <span className="text-xs text-savanna-grass">Recovering in shade...</span>
            )}
          </div>
          
          {/* Level progress */}
          <div className="flex items-center gap-2 bg-earth-dark/80 px-3 py-1.5 rounded">
            <span className="text-maasai-white font-display text-sm">
              Level {currentLevel}
            </span>
            <span className="text-maasai-ochre text-xs">
              {dungPilesCleared}/{totalDungPilesInLevel} piles
            </span>
          </div>
        </div>
        
        {/* Right side - Beads and Combo */}
        <div className="flex flex-col items-end gap-2">
          {/* Bead counter */}
          <div className="flex items-center gap-2 bg-earth-dark/80 px-4 py-2 rounded maasai-border">
            <BeadIcon />
            <span className="text-maasai-white font-display text-xl font-bold">
              {beads}
            </span>
          </div>
          
          {/* Combo indicator */}
          {combo > 0 && (
            <div className="flex items-center gap-1 bg-maasai-red/80 px-3 py-1 rounded animate-pulse">
              <span className="text-white font-display text-sm">
                COMBO x{combo}
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Controls hint */}
      <div className="absolute bottom-4 left-4 bg-earth-dark/60 px-3 py-2 rounded">
        <div className="flex flex-col gap-1 text-xs text-maasai-white/70">
          <span><kbd className="px-1 bg-earth-brown rounded">WASD</kbd> Move</span>
          <span><kbd className="px-1 bg-earth-brown rounded">Click</kbd> Eat dung</span>
          <span><kbd className="px-1 bg-earth-brown rounded">E</kbd> Interact</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Maasai bead icon
 */
function BeadIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="10" cy="10" r="8" fill="#E31B23" />
      <circle cx="10" cy="10" r="6" fill="#0057B8" />
      <circle cx="10" cy="10" r="4" fill="#F5F5DC" />
      <circle cx="10" cy="10" r="2" fill="#CC7722" />
    </svg>
  )
}

export default HUD
