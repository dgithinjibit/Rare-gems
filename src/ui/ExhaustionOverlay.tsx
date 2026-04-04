import { useEffect, useState } from 'react'
import { useGameStore } from '../stores/gameStore'

/**
 * Overlay shown when player reaches 100% tire (exhaustion)
 */
export function ExhaustionOverlay() {
  const tireState = useGameStore(state => state.tireState)
  const setGamePhase = useGameStore(state => state.setGamePhase)
  
  const [countdown, setCountdown] = useState(5)
  const isExhausted = tireState === 'EXHAUSTED'
  
  useEffect(() => {
    if (!isExhausted) {
      setCountdown(5)
      return
    }
    
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          setGamePhase('playing')
          return 5
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(interval)
  }, [isExhausted, setGamePhase])
  
  if (!isExhausted) return null
  
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
      {/* Red vignette overlay */}
      <div 
        className="absolute inset-0 screen-shake"
        style={{
          background: 'radial-gradient(circle, transparent 30%, rgba(227, 27, 35, 0.6) 100%)',
        }}
      />
      
      {/* Exhaustion message */}
      <div className="relative flex flex-col items-center gap-4 text-center">
        <div className="bg-maasai-red/90 px-8 py-4 rounded-lg maasai-border">
          <h2 className="font-display text-3xl text-white uppercase tracking-wider animate-pulse">
            Exhausted!
          </h2>
        </div>
        
        <p className="text-maasai-white text-lg">
          Recovering in <span className="font-display text-2xl text-maasai-ochre">{countdown}</span> seconds...
        </p>
        
        <p className="text-maasai-white/60 text-sm max-w-xs">
          Rest under Acacia trees to recover faster and avoid exhaustion
        </p>
        
        {/* Pulsing indicator */}
        <div className="mt-4">
          <div className="w-16 h-16 rounded-full border-4 border-maasai-red animate-ping" />
        </div>
      </div>
    </div>
  )
}

export default ExhaustionOverlay
