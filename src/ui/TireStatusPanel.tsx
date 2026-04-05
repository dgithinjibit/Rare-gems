/**
 * Tire Status Panel
 * 
 * Displays real-time tire performance, wear, and sensor data.
 * Provides warnings and recommendations based on current conditions.
 */

import { useEffect, useState } from 'react'
import { useGameStore } from '../stores/gameStore'
import {
  BEETLE_PROFILES,
  TIRE_DEFINITIONS,
  getBeetleTireSystem,
  type TirePerformanceResult,
} from '../systems/BeetleTireSystem'
import { COLORS } from '../utils/colors'

interface TireStatusPanelProps {
  expanded?: boolean
  onToggle?: () => void
}

export function TireStatusPanel({ expanded = false, onToggle }: TireStatusPanelProps) {
  const { selectedBeetle, equippedTire, tireWear, tire, tireState } = useGameStore()
  const [performance, setPerformance] = useState<TirePerformanceResult | null>(null)
  const [showDetails, setShowDetails] = useState(expanded)

  const beetleProfile = BEETLE_PROFILES[selectedBeetle]
  const tireDef = TIRE_DEFINITIONS[equippedTire]

  useEffect(() => {
    const system = getBeetleTireSystem()
    system.setBeetle(selectedBeetle)
    system.equipTire(equippedTire)
    
    const updatePerformance = () => {
      setPerformance(system.calculatePerformance())
    }
    
    updatePerformance()
    const interval = setInterval(updatePerformance, 1000)
    return () => clearInterval(interval)
  }, [selectedBeetle, equippedTire])

  const getWearColor = (wear: number) => {
    if (wear > 70) return COLORS.active
    if (wear > 40) return COLORS.tireYellow
    if (wear > 20) return COLORS.maasaiOchre
    return COLORS.exhausted
  }

  const getTireStateColor = (state: string) => {
    switch (state) {
      case 'ACTIVE': return COLORS.active
      case 'FATIGUED': return COLORS.tireYellow
      case 'EXHAUSTED': return COLORS.exhausted
      case 'RECOVERING': return COLORS.maasaiBlue
      default: return COLORS.savannaMid
    }
  }

  const renderMiniBar = (value: number, max: number, color: string) => (
    <div className="h-1.5 bg-background/50 rounded-full overflow-hidden flex-1">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{
          width: `${Math.min(100, (value / max) * 100)}%`,
          backgroundColor: color,
        }}
      />
    </div>
  )

  return (
    <div
      className="rounded-lg border overflow-hidden transition-all duration-300"
      style={{
        borderColor: COLORS.maasaiOchre,
        backgroundColor: COLORS.savannaDark + 'ee',
        width: showDetails ? '280px' : '200px',
      }}
    >
      {/* Header - Always Visible */}
      <button
        onClick={() => {
          setShowDetails(!showDetails)
          onToggle?.()
        }}
        className="w-full p-2 flex items-center justify-between hover:bg-background/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full animate-pulse"
            style={{ backgroundColor: getTireStateColor(tireState) }}
          />
          <span className="text-sm font-medium text-foreground">
            {tireDef.name.split(' ')[0]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-mono"
            style={{ color: getWearColor(tireWear) }}
          >
            {Math.round(tireWear)}%
          </span>
          <svg
            className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Compact View */}
      {!showDetails && (
        <div className="px-2 pb-2 space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground w-12">Tire:</span>
            {renderMiniBar(100 - tire, 100, getTireStateColor(tireState))}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground w-12">Wear:</span>
            {renderMiniBar(tireWear, 100, getWearColor(tireWear))}
          </div>
        </div>
      )}

      {/* Expanded View */}
      {showDetails && (
        <div className="p-3 border-t space-y-3" style={{ borderColor: COLORS.maasaiOchre + '44' }}>
          {/* Beetle & Tire Info */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: COLORS.dungBrown }}
            >
              <span className="text-lg">
                {selectedBeetle === 'scarab' && '🪲'}
                {selectedBeetle === 'dung_roller' && '🔄'}
                {selectedBeetle === 'rhino_beetle' && '🦏'}
                {selectedBeetle === 'jewel_beetle' && '💎'}
                {selectedBeetle === 'stag_beetle' && '🦌'}
                {selectedBeetle === 'goliath' && '👑'}
              </span>
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-foreground">
                {beetleProfile.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {tireDef.name}
              </div>
            </div>
          </div>

          {/* Tire Fatigue Bar */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Tire Fatigue</span>
              <span style={{ color: getTireStateColor(tireState) }}>
                {tireState}
              </span>
            </div>
            <div className="h-2 bg-background/50 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${tire}%`,
                  backgroundColor: getTireStateColor(tireState),
                }}
              />
            </div>
          </div>

          {/* Wear Bar */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Tire Wear</span>
              <span style={{ color: getWearColor(tireWear) }}>
                {Math.round(tireWear)}%
              </span>
            </div>
            <div className="h-2 bg-background/50 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${tireWear}%`,
                  backgroundColor: getWearColor(tireWear),
                }}
              />
            </div>
          </div>

          {/* Performance Stats */}
          {performance && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Speed</span>
                <span
                  className="font-mono"
                  style={{
                    color: performance.effectiveSpeed >= 1 ? COLORS.active : COLORS.exhausted,
                  }}
                >
                  {(performance.effectiveSpeed * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Grip</span>
                <span
                  className="font-mono"
                  style={{
                    color: performance.effectiveGrip >= 1 ? COLORS.active : COLORS.exhausted,
                  }}
                >
                  {(performance.effectiveGrip * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Durability</span>
                <span
                  className="font-mono"
                  style={{
                    color: performance.effectiveDurability >= 1 ? COLORS.active : COLORS.tireYellow,
                  }}
                >
                  {(performance.effectiveDurability * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Recovery</span>
                <span className="font-mono" style={{ color: COLORS.maasaiBlue }}>
                  {(performance.recoveryRate * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          )}

          {/* Sensor Data */}
          {tireDef.sensorIntegration.hasTerrainScanner && (
            <div
              className="p-2 rounded text-xs"
              style={{ backgroundColor: COLORS.savannaMid + '44' }}
            >
              <div className="flex items-center gap-1 mb-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
                  />
                </svg>
                <span className="text-muted-foreground">Sensors Active</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {tireDef.sensorIntegration.hasTirePressureSensor && (
                  <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                    Pressure
                  </span>
                )}
                {tireDef.sensorIntegration.hasTemperatureSensor && (
                  <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300">
                    Temp
                  </span>
                )}
                {tireDef.sensorIntegration.hasTerrainScanner && (
                  <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-300">
                    Terrain
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Warnings */}
          {performance && performance.warnings.length > 0 && (
            <div
              className="p-2 rounded text-xs"
              style={{ backgroundColor: COLORS.exhausted + '22' }}
            >
              {performance.warnings.map((warning, i) => (
                <div key={i} className="flex items-start gap-1">
                  <span style={{ color: COLORS.tireYellow }}>!</span>
                  <span className="text-foreground">{warning}</span>
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {performance && performance.recommendations.length > 0 && (
            <div
              className="p-2 rounded text-xs"
              style={{ backgroundColor: COLORS.maasaiBlue + '22' }}
            >
              {performance.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-1">
                  <span style={{ color: COLORS.maasaiBlue }}>i</span>
                  <span className="text-muted-foreground">{rec}</span>
                </div>
              ))}
            </div>
          )}

          {/* Low Wear Warning */}
          {tireWear < 30 && (
            <div
              className="p-2 rounded text-xs text-center animate-pulse"
              style={{ backgroundColor: COLORS.exhausted + '44', color: COLORS.exhausted }}
            >
              Critical Wear - Visit Garage!
            </div>
          )}
        </div>
      )}
    </div>
  )
}
