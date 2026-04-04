import { useState } from 'react'
import { useGameStore, type Upgrade } from '../stores/gameStore'

interface ShopProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Maasai Trading Post - Upgrade shop
 */
export function Shop({ isOpen, onClose }: ShopProps) {
  const beads = useGameStore(state => state.beads)
  const upgrades = useGameStore(state => state.upgrades)
  const purchaseUpgrade = useGameStore(state => state.purchaseUpgrade)
  
  const [selectedUpgrade, setSelectedUpgrade] = useState<string | null>(null)
  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null)
  
  const handlePurchase = (upgradeId: string) => {
    const success = purchaseUpgrade(upgradeId)
    
    if (success) {
      setPurchaseMessage('Purchase successful!')
      setTimeout(() => setPurchaseMessage(null), 2000)
    } else {
      setPurchaseMessage('Not enough beads!')
      setTimeout(() => setPurchaseMessage(null), 2000)
    }
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      
      {/* Shop panel */}
      <div className="relative bg-earth-dark rounded-lg maasai-border max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-maasai-red">
          <h2 className="font-display text-2xl text-maasai-white uppercase tracking-wide">
            Maasai Trading Post
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <BeadIcon />
              <span className="text-maasai-white font-bold text-xl">{beads}</span>
            </div>
            <button
              onClick={onClose}
              className="text-maasai-white/60 hover:text-maasai-white text-2xl leading-none"
            >
              &times;
            </button>
          </div>
        </div>
        
        {/* Purchase message */}
        {purchaseMessage && (
          <div className={`px-6 py-2 text-center ${purchaseMessage.includes('successful') ? 'bg-savanna-grass/20 text-savanna-grass' : 'bg-maasai-red/20 text-maasai-red'}`}>
            {purchaseMessage}
          </div>
        )}
        
        {/* Upgrades grid */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upgrades.map(upgrade => (
              <UpgradeCard
                key={upgrade.id}
                upgrade={upgrade}
                canAfford={beads >= upgrade.cost}
                isSelected={selectedUpgrade === upgrade.id}
                onSelect={() => setSelectedUpgrade(upgrade.id)}
                onPurchase={() => handlePurchase(upgrade.id)}
              />
            ))}
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t-2 border-maasai-blue bg-earth-brown/20">
          <p className="text-sm text-maasai-white/60 text-center">
            Gather beads by processing dung. Visit Acacia trees to rest and recover.
          </p>
        </div>
      </div>
    </div>
  )
}

interface UpgradeCardProps {
  upgrade: Upgrade
  canAfford: boolean
  isSelected: boolean
  onSelect: () => void
  onPurchase: () => void
}

function UpgradeCard({
  upgrade,
  canAfford,
  isSelected,
  onSelect,
  onPurchase,
}: UpgradeCardProps) {
  const isPurchased = upgrade.purchased
  
  return (
    <div
      className={`
        relative p-4 rounded-lg border-2 transition-all cursor-pointer
        ${isPurchased 
          ? 'border-savanna-grass/50 bg-savanna-grass/10' 
          : isSelected 
            ? 'border-maasai-ochre bg-maasai-ochre/10' 
            : 'border-earth-brown hover:border-maasai-ochre/50 bg-earth-brown/20'
        }
      `}
      onClick={onSelect}
    >
      {/* Purchased badge */}
      {isPurchased && (
        <div className="absolute top-2 right-2 bg-savanna-grass text-white text-xs px-2 py-0.5 rounded">
          OWNED
        </div>
      )}
      
      {/* Upgrade name */}
      <h3 className="font-display text-lg text-maasai-white mb-1">
        {upgrade.name}
      </h3>
      
      {/* Description */}
      <p className="text-sm text-maasai-white/70 mb-3">
        {upgrade.description}
      </p>
      
      {/* Effect indicator */}
      <div className="flex items-center gap-2 mb-3">
        <EffectIcon effect={upgrade.effect} />
        <span className="text-xs text-maasai-ochre uppercase">
          {getEffectLabel(upgrade.effect)}
        </span>
      </div>
      
      {/* Price and buy button */}
      {!isPurchased && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <BeadIcon size={16} />
            <span className={`font-bold ${canAfford ? 'text-maasai-white' : 'text-maasai-red'}`}>
              {upgrade.cost}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onPurchase()
            }}
            disabled={!canAfford}
            className={`
              px-4 py-1.5 rounded font-display text-sm uppercase tracking-wide transition-all
              ${canAfford 
                ? 'bg-maasai-red hover:bg-maasai-red/80 text-white' 
                : 'bg-earth-brown/50 text-maasai-white/30 cursor-not-allowed'
              }
            `}
          >
            Buy
          </button>
        </div>
      )}
    </div>
  )
}

function EffectIcon({ effect }: { effect: string }) {
  const iconMap: Record<string, string> = {
    damage_x3: '⚔',
    tire_slow_50: '🛡',
    recovery_x2: '💚',
    bead_bonus_25: '💎',
    passive_clear: '🔄',
  }
  
  return (
    <span className="text-lg">{iconMap[effect] || '✨'}</span>
  )
}

function getEffectLabel(effect: string): string {
  const labelMap: Record<string, string> = {
    damage_x3: '3x Damage',
    tire_slow_50: '50% Less Tire',
    recovery_x2: '2x Recovery',
    bead_bonus_25: '+25% Beads',
    passive_clear: 'Auto Clear',
  }
  
  return labelMap[effect] || effect
}

function BeadIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
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

export default Shop
