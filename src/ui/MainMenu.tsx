import { useGameStore } from '../stores/gameStore'
import { usePortalStore } from '../stores/portalStore'

interface MainMenuProps {
  onStartGame: () => void
}

/**
 * Main menu / landing screen
 */
export function MainMenu({ onStartGame }: MainMenuProps) {
  const hasInboundPortal = usePortalStore(state => state.hasInboundPortal)
  const inboundParams = usePortalStore(state => state.inboundParams)
  
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-earth-dark via-earth-brown/50 to-earth-dark">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <MaasaiPattern />
      </div>
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-4 text-center">
        {/* Title */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="font-display text-5xl md:text-7xl text-maasai-white uppercase tracking-wider">
            Dung Craft
          </h1>
          <p className="font-display text-xl md:text-2xl text-maasai-ochre uppercase tracking-wide">
            Savanna Strategist
          </p>
        </div>
        
        {/* Beetle illustration */}
        <div className="w-32 h-32 md:w-40 md:h-40">
          <BeetleIllustration />
        </div>
        
        {/* Portal welcome */}
        {hasInboundPortal && inboundParams?.username && (
          <div className="bg-maasai-blue/20 border border-maasai-blue rounded-lg px-6 py-3">
            <p className="text-maasai-white">
              Welcome, traveler{' '}
              <span className="text-maasai-ochre font-bold">
                {inboundParams.username}
              </span>
              !
            </p>
            <p className="text-sm text-maasai-white/60">
              You arrived through the Vibe Jam portal
            </p>
          </div>
        )}
        
        {/* Start button */}
        <button
          onClick={onStartGame}
          className="group relative px-12 py-4 bg-maasai-red hover:bg-maasai-red/80 text-white font-display text-xl uppercase tracking-wider rounded-lg transition-all maasai-border"
        >
          <span className="relative z-10">Start Game</span>
          <div className="absolute inset-0 bg-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
        
        {/* Instructions */}
        <div className="max-w-md text-maasai-white/70 text-sm leading-relaxed">
          <p className="mb-2">
            You are a dung beetle in the Maasai Mara. Process dung piles to collect beads while managing your tire (stamina).
          </p>
          <p>
            Rest under Acacia trees to recover. Visit the Trading Post to upgrade your abilities.
          </p>
        </div>
        
        {/* Controls */}
        <div className="flex flex-wrap justify-center gap-4 text-xs text-maasai-white/50">
          <span><kbd className="px-2 py-1 bg-earth-brown/50 rounded">WASD</kbd> Move</span>
          <span><kbd className="px-2 py-1 bg-earth-brown/50 rounded">Click</kbd> Eat</span>
          <span><kbd className="px-2 py-1 bg-earth-brown/50 rounded">E</kbd> Interact</span>
        </div>
        
        {/* Vibe Jam badge */}
        <div className="mt-4 text-xs text-maasai-white/40">
          Made for Vibe Coding Game Jam 2026
        </div>
      </div>
    </div>
  )
}

/**
 * Decorative Maasai pattern
 */
function MaasaiPattern() {
  return (
    <svg
      className="w-full h-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <defs>
        <pattern
          id="maasai-pattern"
          x="0"
          y="0"
          width="20"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <rect x="0" y="0" width="10" height="10" fill="#E31B23" />
          <rect x="10" y="0" width="10" height="10" fill="#0057B8" />
          <rect x="0" y="10" width="10" height="10" fill="#0057B8" />
          <rect x="10" y="10" width="10" height="10" fill="#E31B23" />
          <circle cx="10" cy="10" r="3" fill="#F5F5DC" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#maasai-pattern)" />
    </svg>
  )
}

/**
 * Stylized beetle illustration
 */
function BeetleIllustration() {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      {/* Shell */}
      <ellipse cx="50" cy="55" rx="35" ry="30" fill="#1A1A2E" />
      <ellipse cx="50" cy="50" rx="28" ry="22" fill="#2D2D44" />
      
      {/* Shell lines */}
      <path d="M50 30 L50 75" stroke="#1A1A2E" strokeWidth="2" />
      <path d="M30 50 Q50 35 70 50" stroke="#1A1A2E" strokeWidth="1.5" fill="none" />
      
      {/* Head */}
      <ellipse cx="50" cy="25" rx="15" ry="12" fill="#1A1A2E" />
      
      {/* Eyes */}
      <circle cx="42" cy="22" r="4" fill="#0F0F1A" />
      <circle cx="58" cy="22" r="4" fill="#0F0F1A" />
      <circle cx="43" cy="21" r="1.5" fill="#F5F5DC" />
      <circle cx="59" cy="21" r="1.5" fill="#F5F5DC" />
      
      {/* Mandibles */}
      <path d="M40 30 L35 38" stroke="#0F0F1A" strokeWidth="3" strokeLinecap="round" />
      <path d="M60 30 L65 38" stroke="#0F0F1A" strokeWidth="3" strokeLinecap="round" />
      
      {/* Legs */}
      <g stroke="#0F0F1A" strokeWidth="3" strokeLinecap="round">
        {/* Left legs */}
        <path d="M20 45 L10 35" />
        <path d="M18 55 L5 55" />
        <path d="M20 65 L10 75" />
        {/* Right legs */}
        <path d="M80 45 L90 35" />
        <path d="M82 55 L95 55" />
        <path d="M80 65 L90 75" />
      </g>
      
      {/* Decorative beads */}
      <circle cx="50" cy="85" r="5" fill="#E31B23" />
      <circle cx="38" cy="82" r="3" fill="#0057B8" />
      <circle cx="62" cy="82" r="3" fill="#0057B8" />
    </svg>
  )
}

export default MainMenu
