/**
 * Beetle Garage UI
 * 
 * A comprehensive selection interface for choosing beetles and equipping tires.
 * Features detailed stats, compatibility checks, and sustainability ratings.
 */

import { useState } from 'react'
import { useGameStore } from '../stores/gameStore'
import {
  BEETLE_PROFILES,
  TIRE_DEFINITIONS,
  getTireCompatibility,
  type BeetleSpecies,
  type TireType,
} from '../systems/BeetleTireSystem'
import { COLORS } from '../utils/colors'

interface BeetleGarageProps {
  onClose: () => void
  onConfirm: () => void
}

export function BeetleGarage({ onClose, onConfirm }: BeetleGarageProps) {
  const {
    selectedBeetle,
    equippedTire,
    unlockedBeetles,
    unlockedTires,
    beads,
    currentLevel,
    selectBeetle,
    equipTire,
    spendBeads,
    unlockBeetle,
    unlockTire,
  } = useGameStore()

  const [activeTab, setActiveTab] = useState<'beetles' | 'tires'>('beetles')
  const [hoveredBeetle, setHoveredBeetle] = useState<BeetleSpecies | null>(null)
  const [hoveredTire, setHoveredTire] = useState<TireType | null>(null)

  const beetleList = Object.values(BEETLE_PROFILES)
  const tireList = Object.values(TIRE_DEFINITIONS).filter(
    t => t.unlockLevel <= currentLevel + 2
  )

  // Calculate unlock costs
  const getBeetleUnlockCost = (species: BeetleSpecies): number => {
    const costs: Record<BeetleSpecies, number> = {
      scarab: 0,
      dung_roller: 500,
      jewel_beetle: 750,
      stag_beetle: 1000,
      rhino_beetle: 1500,
      goliath: 3000,
    }
    return costs[species]
  }

  const handleBeetleSelect = (species: BeetleSpecies) => {
    if (unlockedBeetles.includes(species)) {
      selectBeetle(species)
    } else {
      const cost = getBeetleUnlockCost(species)
      if (beads >= cost && spendBeads(cost)) {
        unlockBeetle(species)
        selectBeetle(species)
      }
    }
  }

  const handleTireEquip = (tireType: TireType) => {
    const tire = TIRE_DEFINITIONS[tireType]
    
    if (!getTireCompatibility(selectedBeetle, tireType)) {
      return // Incompatible
    }
    
    if (unlockedTires.includes(tireType)) {
      equipTire(tireType)
    } else if (tire.unlockLevel <= currentLevel) {
      if (beads >= tire.cost && spendBeads(tire.cost)) {
        unlockTire(tireType)
        equipTire(tireType)
      }
    }
  }

  const renderStatBar = (value: number, max: number, color: string) => (
    <div className="h-2 bg-background/50 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{
          width: `${(value / max) * 100}%`,
          backgroundColor: color,
        }}
      />
    </div>
  )

  const renderSustainabilityBadge = (score: number) => {
    let label = 'Low'
    let color = COLORS.exhausted
    
    if (score >= 80) {
      label = 'Excellent'
      color = COLORS.active
    } else if (score >= 60) {
      label = 'Good'
      color = COLORS.tireYellow
    } else if (score >= 40) {
      label = 'Fair'
      color = COLORS.maasaiOchre
    }
    
    return (
      <span
        className="px-2 py-0.5 rounded text-xs font-medium"
        style={{ backgroundColor: color, color: '#fff' }}
      >
        {label}
      </span>
    )
  }

  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="bg-card border-2 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        style={{ borderColor: COLORS.maasaiOchre }}
      >
        {/* Header */}
        <div
          className="p-4 border-b flex items-center justify-between"
          style={{ borderColor: COLORS.maasaiOchre, backgroundColor: COLORS.savannaDark }}
        >
          <h2 className="text-2xl font-bold text-foreground">Beetle Garage</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: COLORS.beadWhite }}
              />
              <span className="text-foreground font-medium">{beads} Beads</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded hover:bg-background/50 transition-colors text-foreground"
            >
              Close
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: COLORS.maasaiOchre }}>
          <button
            onClick={() => setActiveTab('beetles')}
            className={`flex-1 px-4 py-3 font-medium transition-colors ${
              activeTab === 'beetles'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background hover:bg-accent text-foreground'
            }`}
          >
            Beetle Selection
          </button>
          <button
            onClick={() => setActiveTab('tires')}
            className={`flex-1 px-4 py-3 font-medium transition-colors ${
              activeTab === 'tires'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background hover:bg-accent text-foreground'
            }`}
          >
            Tire Equipment
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {activeTab === 'beetles' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {beetleList.map((beetle) => {
                const isUnlocked = unlockedBeetles.includes(beetle.species)
                const isSelected = selectedBeetle === beetle.species
                const cost = getBeetleUnlockCost(beetle.species)
                const canAfford = beads >= cost

                return (
                  <div
                    key={beetle.species}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected ? 'ring-2 ring-primary' : ''
                    } ${!isUnlocked && !canAfford ? 'opacity-50' : ''}`}
                    style={{
                      borderColor: isSelected ? COLORS.maasaiRed : COLORS.maasaiOchre,
                      backgroundColor: isSelected ? COLORS.savannaDark : 'var(--card)',
                    }}
                    onClick={() => handleBeetleSelect(beetle.species)}
                    onMouseEnter={() => setHoveredBeetle(beetle.species)}
                    onMouseLeave={() => setHoveredBeetle(null)}
                  >
                    {/* Beetle Icon */}
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                        style={{ backgroundColor: COLORS.dungBrown }}
                      >
                        {beetle.species === 'scarab' && '🪲'}
                        {beetle.species === 'dung_roller' && '🔄'}
                        {beetle.species === 'rhino_beetle' && '🦏'}
                        {beetle.species === 'jewel_beetle' && '💎'}
                        {beetle.species === 'stag_beetle' && '🦌'}
                        {beetle.species === 'goliath' && '👑'}
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground">{beetle.name}</h3>
                        {!isUnlocked && (
                          <span className="text-sm" style={{ color: COLORS.tireYellow }}>
                            {cost} Beads
                          </span>
                        )}
                        {isUnlocked && isSelected && (
                          <span className="text-sm" style={{ color: COLORS.active }}>
                            Equipped
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mb-3">
                      {beetle.description}
                    </p>

                    {/* Stats */}
                    <div className="space-y-2 text-sm">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-muted-foreground">Strength</span>
                          <span className="text-foreground">{beetle.baseStats.strength}/5</span>
                        </div>
                        {renderStatBar(beetle.baseStats.strength, 5, COLORS.maasaiRed)}
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-muted-foreground">Speed</span>
                          <span className="text-foreground">{beetle.baseStats.speed}/5</span>
                        </div>
                        {renderStatBar(beetle.baseStats.speed, 5, COLORS.maasaiBlue)}
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-muted-foreground">Durability</span>
                          <span className="text-foreground">{beetle.baseStats.durability}/5</span>
                        </div>
                        {renderStatBar(beetle.baseStats.durability, 5, COLORS.active)}
                      </div>
                    </div>

                    {/* Special Ability */}
                    <div
                      className="mt-3 p-2 rounded text-xs"
                      style={{ backgroundColor: COLORS.savannaDark }}
                    >
                      <span className="font-medium" style={{ color: COLORS.tireYellow }}>
                        Special:
                      </span>{' '}
                      <span className="text-foreground">{beetle.specialAbility}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Current Beetle Compatibility Notice */}
              <div
                className="p-3 rounded-lg text-sm"
                style={{ backgroundColor: COLORS.savannaDark }}
              >
                <span className="text-muted-foreground">
                  Showing tires compatible with{' '}
                </span>
                <span className="font-medium text-foreground">
                  {BEETLE_PROFILES[selectedBeetle].name}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tireList.map((tire) => {
                  const isCompatible = getTireCompatibility(selectedBeetle, tire.type)
                  const isUnlocked = unlockedTires.includes(tire.type)
                  const isEquipped = equippedTire === tire.type
                  const canUnlock = tire.unlockLevel <= currentLevel
                  const canAfford = beads >= tire.cost

                  const sustainabilityScore =
                    tire.sustainability.recyclability * 25 +
                    (tire.sustainability.bioMaterialPercentage / 100) * 25 +
                    (tire.sustainability.carbonFootprint === 'low' ? 30 : 
                     tire.sustainability.carbonFootprint === 'medium' ? 15 : 0) +
                    (tire.sustainability.renewableSource ? 20 : 0)

                  return (
                    <div
                      key={tire.type}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        !isCompatible ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                      } ${isEquipped ? 'ring-2 ring-primary' : ''}`}
                      style={{
                        borderColor: isEquipped ? COLORS.maasaiRed : 
                                    isCompatible ? COLORS.maasaiOchre : COLORS.savannaDark,
                        backgroundColor: isEquipped ? COLORS.savannaDark : 'var(--card)',
                      }}
                      onClick={() => isCompatible && handleTireEquip(tire.type)}
                      onMouseEnter={() => setHoveredTire(tire.type)}
                      onMouseLeave={() => setHoveredTire(null)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-bold text-foreground">{tire.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {tire.treadPattern} / {tire.chitinComposition}
                          </p>
                        </div>
                        {!isUnlocked && canUnlock && (
                          <span
                            className="text-sm font-medium"
                            style={{ color: canAfford ? COLORS.tireYellow : COLORS.exhausted }}
                          >
                            {tire.cost} Beads
                          </span>
                        )}
                        {!canUnlock && (
                          <span className="text-xs text-muted-foreground">
                            Level {tire.unlockLevel}
                          </span>
                        )}
                        {isUnlocked && isEquipped && (
                          <span className="text-sm" style={{ color: COLORS.active }}>
                            Equipped
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground mb-3">
                        {tire.description}
                      </p>

                      {/* Performance Stats */}
                      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                        <div>
                          <span className="text-muted-foreground">Speed:</span>{' '}
                          <span
                            className="font-medium"
                            style={{
                              color: tire.performance.speedModifier >= 1 
                                ? COLORS.active 
                                : COLORS.exhausted,
                            }}
                          >
                            {tire.performance.speedModifier >= 1 ? '+' : ''}
                            {Math.round((tire.performance.speedModifier - 1) * 100)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Durability:</span>{' '}
                          <span
                            className="font-medium"
                            style={{
                              color: tire.performance.durabilityModifier >= 1 
                                ? COLORS.active 
                                : COLORS.exhausted,
                            }}
                          >
                            {tire.performance.durabilityModifier >= 1 ? '+' : ''}
                            {Math.round((tire.performance.durabilityModifier - 1) * 100)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Grip:</span>{' '}
                          <span
                            className="font-medium"
                            style={{
                              color: tire.performance.gripModifier >= 1 
                                ? COLORS.active 
                                : COLORS.exhausted,
                            }}
                          >
                            {tire.performance.gripModifier >= 1 ? '+' : ''}
                            {Math.round((tire.performance.gripModifier - 1) * 100)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Recovery:</span>{' '}
                          <span
                            className="font-medium"
                            style={{ color: COLORS.active }}
                          >
                            +{Math.round(tire.performance.recoveryBonus * 100)}%
                          </span>
                        </div>
                      </div>

                      {/* Climate Adaptation */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {tire.climateAdaptation.heatResistance > 0.6 && (
                          <span className="px-2 py-0.5 rounded text-xs bg-orange-500/20 text-orange-300">
                            Heat Resistant
                          </span>
                        )}
                        {tire.climateAdaptation.wetGrip > 0.6 && (
                          <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-300">
                            Wet Grip
                          </span>
                        )}
                        {tire.climateAdaptation.dustProtection > 0.6 && (
                          <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-300">
                            Dust Shield
                          </span>
                        )}
                      </div>

                      {/* Sensors */}
                      {(tire.sensorIntegration.hasTerrainScanner ||
                        tire.sensorIntegration.hasProximityAlert) && (
                        <div className="flex gap-1 mb-2">
                          {tire.sensorIntegration.hasTerrainScanner && (
                            <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-300">
                              Terrain Scanner
                            </span>
                          )}
                          {tire.sensorIntegration.hasProximityAlert && (
                            <span className="px-2 py-0.5 rounded text-xs bg-cyan-500/20 text-cyan-300">
                              Proximity Alert
                            </span>
                          )}
                        </div>
                      )}

                      {/* Sustainability */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Sustainability:
                        </span>
                        {renderSustainabilityBadge(sustainabilityScore)}
                      </div>

                      {/* Incompatible Warning */}
                      {!isCompatible && (
                        <div
                          className="mt-2 p-2 rounded text-xs text-center"
                          style={{ backgroundColor: COLORS.exhausted + '33' }}
                        >
                          Not compatible with {BEETLE_PROFILES[selectedBeetle].name}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="p-4 border-t flex items-center justify-between"
          style={{ borderColor: COLORS.maasaiOchre }}
        >
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {BEETLE_PROFILES[selectedBeetle].name}
            </span>
            {' with '}
            <span className="font-medium text-foreground">
              {TIRE_DEFINITIONS[equippedTire].name}
            </span>
          </div>
          <button
            onClick={onConfirm}
            className="px-6 py-2 rounded-lg font-medium text-primary-foreground transition-colors"
            style={{ backgroundColor: COLORS.maasaiRed }}
          >
            Confirm Selection
          </button>
        </div>
      </div>
    </div>
  )
}
