/**
 * Comprehensive Beetle Tire System
 * 
 * This system defines various tire types suitable for different beetle species
 * and environmental conditions in Dung Craft: Savanna Strategist.
 * 
 * Design Considerations:
 * - Tread patterns for different terrains
 * - Chitin compositions for durability
 * - Leg designs for performance
 * - Climate adaptations
 * - Sensor integrations
 * - Sustainability aspects
 */

import { useGameStore } from '../stores/gameStore'
import { useWorldStore } from '../stores/worldStore'
import { distance2D, lerp, clamp } from '../utils/math'
import type { BeetleSpecies, TireType, TireState } from '../types/game'

// Re-export types for external use
export type { BeetleSpecies, TireType, TireState } from '../types/game'

export interface BeetleProfile {
  species: BeetleSpecies
  name: string
  description: string
  baseStats: BeetleBaseStats
  compatibleTires: TireType[]
  specialAbility: string
}

export interface BeetleBaseStats {
  maxTire: number           // Maximum tire capacity (100-150)
  tireEfficiency: number    // How efficiently tire is used (0.5-1.5)
  recoveryRate: number      // Base recovery multiplier (0.5-2.0)
  strength: number          // Digging power (1-5)
  speed: number             // Movement speed (1-5)
  durability: number        // Damage resistance (1-5)
}

export const BEETLE_PROFILES: Record<BeetleSpecies, BeetleProfile> = {
  scarab: {
    species: 'scarab',
    name: 'Sacred Scarab',
    description: 'The versatile worker beetle, balanced in all aspects.',
    baseStats: {
      maxTire: 100,
      tireEfficiency: 1.0,
      recoveryRate: 1.0,
      strength: 3,
      speed: 3,
      durability: 3,
    },
    compatibleTires: ['standard', 'all_terrain', 'eco_chitin'],
    specialAbility: 'Solar Charge: Recovers tire 20% faster in direct sunlight',
  },
  dung_roller: {
    species: 'dung_roller',
    name: 'Swift Roller',
    description: 'Speed-optimized beetle that excels at rapid collection.',
    baseStats: {
      maxTire: 80,
      tireEfficiency: 1.3,
      recoveryRate: 0.8,
      strength: 2,
      speed: 5,
      durability: 2,
    },
    compatibleTires: ['speed_tread', 'lightweight', 'sensor_array'],
    specialAbility: 'Rolling Thunder: 50% speed boost when tire below 30%',
  },
  rhino_beetle: {
    species: 'rhino_beetle',
    name: 'Rhino Crusher',
    description: 'Powerful beetle built for heavy-duty dung processing.',
    baseStats: {
      maxTire: 150,
      tireEfficiency: 0.7,
      recoveryRate: 1.2,
      strength: 5,
      speed: 2,
      durability: 4,
    },
    compatibleTires: ['heavy_duty', 'reinforced', 'mud_terrain'],
    specialAbility: 'Titan Strength: 3x damage when tire above 80%',
  },
  jewel_beetle: {
    species: 'jewel_beetle',
    name: 'Jewel Dancer',
    description: 'Agile beetle that moves gracefully through obstacles.',
    baseStats: {
      maxTire: 90,
      tireEfficiency: 1.1,
      recoveryRate: 1.5,
      strength: 2,
      speed: 4,
      durability: 2,
    },
    compatibleTires: ['precision', 'lightweight', 'adaptive'],
    specialAbility: 'Evasive Steps: Reduces tire gain from movement by 40%',
  },
  stag_beetle: {
    species: 'stag_beetle',
    name: 'Stag Guardian',
    description: 'Defensive beetle with strong mandibles for protection.',
    baseStats: {
      maxTire: 120,
      tireEfficiency: 0.9,
      recoveryRate: 0.9,
      strength: 4,
      speed: 2,
      durability: 5,
    },
    compatibleTires: ['armored', 'reinforced', 'all_terrain'],
    specialAbility: 'Mandible Guard: Immune to exhaustion once per level',
  },
  goliath: {
    species: 'goliath',
    name: 'Goliath Titan',
    description: 'Massive beetle capable of moving mountains of dung.',
    baseStats: {
      maxTire: 200,
      tireEfficiency: 0.5,
      recoveryRate: 0.6,
      strength: 5,
      speed: 1,
      durability: 5,
    },
    compatibleTires: ['heavy_duty', 'industrial', 'mud_terrain'],
    specialAbility: 'Unstoppable: Cannot be slowed by terrain',
  },
}

// ============================================================================
// TIRE TREAD AND COMPOSITION TYPES
// ============================================================================

export type TreadPattern = 
  | 'symmetric'      // Balanced performance
  | 'directional'    // Speed optimized
  | 'asymmetric'     // Cornering grip
  | 'blocky'         // Off-road traction
  | 'ribbed'         // Low rolling resistance
  | 'compound'       // Multi-terrain

export type ChitinComposition = 
  | 'standard'       // Regular beetle chitin
  | 'hardened'       // Reinforced for durability
  | 'lightweight'    // Reduced weight
  | 'flexible'       // Better grip
  | 'bio_composite'  // Eco-friendly mix
  | 'nano_enhanced'  // High-tech sensors

export type SidewallDesign = 
  | 'standard'
  | 'reinforced'
  | 'flexible'
  | 'armored'
  | 'vented'

export interface TireDefinition {
  type: TireType
  name: string
  description: string
  
  // Physical properties
  treadPattern: TreadPattern
  chitinComposition: ChitinComposition
  sidewallDesign: SidewallDesign
  
  // Performance modifiers
  performance: TirePerformance
  
  // Climate adaptations
  climateAdaptation: ClimateAdaptation
  
  // Technology features
  sensorIntegration: SensorFeatures
  
  // Sustainability
  sustainability: SustainabilityProfile
  
  // Manufacturing
  manufacturing: ManufacturingProfile
  
  // Cost and availability
  cost: number
  unlockLevel: number
}

export interface TirePerformance {
  speedModifier: number           // 0.5 - 1.5
  durabilityModifier: number      // 0.5 - 2.0
  gripModifier: number            // 0.5 - 1.5
  tireDecayModifier: number       // 0.5 - 1.5 (lower is better)
  recoveryBonus: number           // 0 - 0.5
  terrainBonus: TerrainBonus
}

export interface TerrainBonus {
  grass: number      // -0.5 to 0.5
  sand: number
  mud: number
  rock: number
  water: number
  shade: number
}

export interface ClimateAdaptation {
  heatResistance: number     // 0 - 1 (savanna heat)
  coldPerformance: number    // 0 - 1 (night conditions)
  wetGrip: number            // 0 - 1 (rainy season)
  dustProtection: number     // 0 - 1 (dry season)
}

export interface SensorFeatures {
  hasTirePressureSensor: boolean
  hasTemperatureSensor: boolean
  hasWearIndicator: boolean
  hasTerrainScanner: boolean
  hasProximityAlert: boolean
  dataAccuracy: number  // 0 - 1
}

export interface SustainabilityProfile {
  recyclability: number           // 0 - 1
  bioMaterialPercentage: number   // 0 - 100
  carbonFootprint: 'low' | 'medium' | 'high'
  lifespan: number                // In-game days
  renewableSource: boolean
}

export interface ManufacturingProfile {
  complexity: 'simple' | 'moderate' | 'complex' | 'advanced'
  requiredMaterials: string[]
  productionTime: number  // In-game hours
  qualityVariance: number // 0 - 1 (lower is more consistent)
}

// ============================================================================
// TIRE DEFINITIONS
// ============================================================================

export const TIRE_DEFINITIONS: Record<TireType, TireDefinition> = {
  standard: {
    type: 'standard',
    name: 'Standard Chitin Treads',
    description: 'Reliable all-purpose leg covers for everyday dung collection.',
    treadPattern: 'symmetric',
    chitinComposition: 'standard',
    sidewallDesign: 'standard',
    performance: {
      speedModifier: 1.0,
      durabilityModifier: 1.0,
      gripModifier: 1.0,
      tireDecayModifier: 1.0,
      recoveryBonus: 0,
      terrainBonus: { grass: 0, sand: 0, mud: 0, rock: 0, water: -0.2, shade: 0.1 },
    },
    climateAdaptation: {
      heatResistance: 0.5,
      coldPerformance: 0.5,
      wetGrip: 0.5,
      dustProtection: 0.5,
    },
    sensorIntegration: {
      hasTirePressureSensor: false,
      hasTemperatureSensor: false,
      hasWearIndicator: true,
      hasTerrainScanner: false,
      hasProximityAlert: false,
      dataAccuracy: 0.5,
    },
    sustainability: {
      recyclability: 0.8,
      bioMaterialPercentage: 90,
      carbonFootprint: 'low',
      lifespan: 30,
      renewableSource: true,
    },
    manufacturing: {
      complexity: 'simple',
      requiredMaterials: ['chitin_flakes', 'natural_resin'],
      productionTime: 2,
      qualityVariance: 0.2,
    },
    cost: 0,
    unlockLevel: 1,
  },
  
  speed_tread: {
    type: 'speed_tread',
    name: 'Swift Runner Treads',
    description: 'Lightweight directional treads for maximum rolling speed.',
    treadPattern: 'directional',
    chitinComposition: 'lightweight',
    sidewallDesign: 'flexible',
    performance: {
      speedModifier: 1.4,
      durabilityModifier: 0.7,
      gripModifier: 0.9,
      tireDecayModifier: 1.2,
      recoveryBonus: 0,
      terrainBonus: { grass: 0.2, sand: -0.1, mud: -0.3, rock: 0, water: -0.3, shade: 0 },
    },
    climateAdaptation: {
      heatResistance: 0.4,
      coldPerformance: 0.6,
      wetGrip: 0.3,
      dustProtection: 0.4,
    },
    sensorIntegration: {
      hasTirePressureSensor: true,
      hasTemperatureSensor: false,
      hasWearIndicator: true,
      hasTerrainScanner: false,
      hasProximityAlert: false,
      dataAccuracy: 0.6,
    },
    sustainability: {
      recyclability: 0.7,
      bioMaterialPercentage: 75,
      carbonFootprint: 'medium',
      lifespan: 20,
      renewableSource: true,
    },
    manufacturing: {
      complexity: 'moderate',
      requiredMaterials: ['chitin_flakes', 'silk_fibers', 'natural_resin'],
      productionTime: 4,
      qualityVariance: 0.3,
    },
    cost: 150,
    unlockLevel: 2,
  },
  
  heavy_duty: {
    type: 'heavy_duty',
    name: 'Titan Grippers',
    description: 'Massive reinforced treads for heavy-duty operations.',
    treadPattern: 'blocky',
    chitinComposition: 'hardened',
    sidewallDesign: 'reinforced',
    performance: {
      speedModifier: 0.7,
      durabilityModifier: 2.0,
      gripModifier: 1.3,
      tireDecayModifier: 0.6,
      recoveryBonus: 0.1,
      terrainBonus: { grass: 0, sand: 0.1, mud: 0.3, rock: 0.2, water: 0, shade: 0.1 },
    },
    climateAdaptation: {
      heatResistance: 0.7,
      coldPerformance: 0.4,
      wetGrip: 0.6,
      dustProtection: 0.8,
    },
    sensorIntegration: {
      hasTirePressureSensor: true,
      hasTemperatureSensor: true,
      hasWearIndicator: true,
      hasTerrainScanner: false,
      hasProximityAlert: false,
      dataAccuracy: 0.7,
    },
    sustainability: {
      recyclability: 0.6,
      bioMaterialPercentage: 60,
      carbonFootprint: 'high',
      lifespan: 50,
      renewableSource: false,
    },
    manufacturing: {
      complexity: 'complex',
      requiredMaterials: ['hardened_chitin', 'mineral_deposits', 'resin_composite'],
      productionTime: 8,
      qualityVariance: 0.15,
    },
    cost: 300,
    unlockLevel: 4,
  },
  
  all_terrain: {
    type: 'all_terrain',
    name: 'Savanna Explorers',
    description: 'Versatile compound treads that adapt to any terrain.',
    treadPattern: 'compound',
    chitinComposition: 'flexible',
    sidewallDesign: 'vented',
    performance: {
      speedModifier: 0.95,
      durabilityModifier: 1.2,
      gripModifier: 1.2,
      tireDecayModifier: 0.9,
      recoveryBonus: 0.05,
      terrainBonus: { grass: 0.1, sand: 0.1, mud: 0.1, rock: 0.1, water: 0, shade: 0.1 },
    },
    climateAdaptation: {
      heatResistance: 0.6,
      coldPerformance: 0.6,
      wetGrip: 0.6,
      dustProtection: 0.6,
    },
    sensorIntegration: {
      hasTirePressureSensor: true,
      hasTemperatureSensor: true,
      hasWearIndicator: true,
      hasTerrainScanner: true,
      hasProximityAlert: false,
      dataAccuracy: 0.75,
    },
    sustainability: {
      recyclability: 0.75,
      bioMaterialPercentage: 70,
      carbonFootprint: 'medium',
      lifespan: 35,
      renewableSource: true,
    },
    manufacturing: {
      complexity: 'moderate',
      requiredMaterials: ['chitin_flakes', 'flexible_membrane', 'natural_resin'],
      productionTime: 5,
      qualityVariance: 0.2,
    },
    cost: 200,
    unlockLevel: 3,
  },
  
  mud_terrain: {
    type: 'mud_terrain',
    name: 'Swamp Crawlers',
    description: 'Deep-lug treads designed for wet season mud pits.',
    treadPattern: 'blocky',
    chitinComposition: 'flexible',
    sidewallDesign: 'vented',
    performance: {
      speedModifier: 0.85,
      durabilityModifier: 1.3,
      gripModifier: 1.4,
      tireDecayModifier: 0.8,
      recoveryBonus: 0.1,
      terrainBonus: { grass: -0.1, sand: -0.2, mud: 0.5, rock: -0.1, water: 0.3, shade: 0 },
    },
    climateAdaptation: {
      heatResistance: 0.4,
      coldPerformance: 0.5,
      wetGrip: 0.9,
      dustProtection: 0.3,
    },
    sensorIntegration: {
      hasTirePressureSensor: true,
      hasTemperatureSensor: false,
      hasWearIndicator: true,
      hasTerrainScanner: true,
      hasProximityAlert: false,
      dataAccuracy: 0.6,
    },
    sustainability: {
      recyclability: 0.7,
      bioMaterialPercentage: 65,
      carbonFootprint: 'medium',
      lifespan: 25,
      renewableSource: true,
    },
    manufacturing: {
      complexity: 'moderate',
      requiredMaterials: ['flexible_chitin', 'water_resistant_coating', 'drainage_channels'],
      productionTime: 6,
      qualityVariance: 0.25,
    },
    cost: 225,
    unlockLevel: 3,
  },
  
  sand_runner: {
    type: 'sand_runner',
    name: 'Dune Dancers',
    description: 'Wide-surface treads that float over sandy terrain.',
    treadPattern: 'ribbed',
    chitinComposition: 'lightweight',
    sidewallDesign: 'flexible',
    performance: {
      speedModifier: 1.1,
      durabilityModifier: 0.9,
      gripModifier: 0.8,
      tireDecayModifier: 1.0,
      recoveryBonus: 0,
      terrainBonus: { grass: 0, sand: 0.5, mud: -0.3, rock: -0.2, water: -0.2, shade: 0 },
    },
    climateAdaptation: {
      heatResistance: 0.9,
      coldPerformance: 0.3,
      wetGrip: 0.2,
      dustProtection: 0.9,
    },
    sensorIntegration: {
      hasTirePressureSensor: true,
      hasTemperatureSensor: true,
      hasWearIndicator: true,
      hasTerrainScanner: false,
      hasProximityAlert: false,
      dataAccuracy: 0.65,
    },
    sustainability: {
      recyclability: 0.8,
      bioMaterialPercentage: 80,
      carbonFootprint: 'low',
      lifespan: 28,
      renewableSource: true,
    },
    manufacturing: {
      complexity: 'moderate',
      requiredMaterials: ['lightweight_chitin', 'heat_resistant_coating', 'silk_fibers'],
      productionTime: 4,
      qualityVariance: 0.2,
    },
    cost: 175,
    unlockLevel: 2,
  },
  
  precision: {
    type: 'precision',
    name: 'Jewel Steps',
    description: 'Fine-tuned treads for precise movement and cornering.',
    treadPattern: 'asymmetric',
    chitinComposition: 'flexible',
    sidewallDesign: 'standard',
    performance: {
      speedModifier: 1.0,
      durabilityModifier: 0.8,
      gripModifier: 1.3,
      tireDecayModifier: 1.1,
      recoveryBonus: 0.05,
      terrainBonus: { grass: 0.1, sand: 0, mud: -0.1, rock: 0.2, water: -0.1, shade: 0.1 },
    },
    climateAdaptation: {
      heatResistance: 0.5,
      coldPerformance: 0.5,
      wetGrip: 0.7,
      dustProtection: 0.5,
    },
    sensorIntegration: {
      hasTirePressureSensor: true,
      hasTemperatureSensor: false,
      hasWearIndicator: true,
      hasTerrainScanner: true,
      hasProximityAlert: true,
      dataAccuracy: 0.85,
    },
    sustainability: {
      recyclability: 0.7,
      bioMaterialPercentage: 70,
      carbonFootprint: 'medium',
      lifespan: 22,
      renewableSource: true,
    },
    manufacturing: {
      complexity: 'complex',
      requiredMaterials: ['precision_chitin', 'sensor_nodes', 'calibrated_resin'],
      productionTime: 7,
      qualityVariance: 0.1,
    },
    cost: 250,
    unlockLevel: 4,
  },
  
  lightweight: {
    type: 'lightweight',
    name: 'Feather Treads',
    description: 'Ultra-light chitin construction for maximum agility.',
    treadPattern: 'directional',
    chitinComposition: 'lightweight',
    sidewallDesign: 'flexible',
    performance: {
      speedModifier: 1.3,
      durabilityModifier: 0.5,
      gripModifier: 0.9,
      tireDecayModifier: 1.3,
      recoveryBonus: 0.15,
      terrainBonus: { grass: 0.2, sand: 0.1, mud: -0.4, rock: -0.2, water: -0.3, shade: 0.1 },
    },
    climateAdaptation: {
      heatResistance: 0.3,
      coldPerformance: 0.7,
      wetGrip: 0.4,
      dustProtection: 0.3,
    },
    sensorIntegration: {
      hasTirePressureSensor: false,
      hasTemperatureSensor: false,
      hasWearIndicator: true,
      hasTerrainScanner: false,
      hasProximityAlert: false,
      dataAccuracy: 0.4,
    },
    sustainability: {
      recyclability: 0.9,
      bioMaterialPercentage: 95,
      carbonFootprint: 'low',
      lifespan: 15,
      renewableSource: true,
    },
    manufacturing: {
      complexity: 'simple',
      requiredMaterials: ['ultra_light_chitin', 'silk_fibers'],
      productionTime: 3,
      qualityVariance: 0.35,
    },
    cost: 125,
    unlockLevel: 2,
  },
  
  reinforced: {
    type: 'reinforced',
    name: 'Fortress Treads',
    description: 'Multi-layer construction for extreme durability.',
    treadPattern: 'symmetric',
    chitinComposition: 'hardened',
    sidewallDesign: 'reinforced',
    performance: {
      speedModifier: 0.8,
      durabilityModifier: 1.8,
      gripModifier: 1.1,
      tireDecayModifier: 0.5,
      recoveryBonus: 0,
      terrainBonus: { grass: 0, sand: 0, mud: 0.1, rock: 0.3, water: 0, shade: 0 },
    },
    climateAdaptation: {
      heatResistance: 0.6,
      coldPerformance: 0.6,
      wetGrip: 0.5,
      dustProtection: 0.7,
    },
    sensorIntegration: {
      hasTirePressureSensor: true,
      hasTemperatureSensor: true,
      hasWearIndicator: true,
      hasTerrainScanner: false,
      hasProximityAlert: false,
      dataAccuracy: 0.7,
    },
    sustainability: {
      recyclability: 0.5,
      bioMaterialPercentage: 50,
      carbonFootprint: 'high',
      lifespan: 60,
      renewableSource: false,
    },
    manufacturing: {
      complexity: 'complex',
      requiredMaterials: ['hardened_chitin', 'mineral_composites', 'bonding_agents'],
      productionTime: 10,
      qualityVariance: 0.1,
    },
    cost: 350,
    unlockLevel: 5,
  },
  
  armored: {
    type: 'armored',
    name: 'Battle Plate Treads',
    description: 'Combat-grade protection with defensive spikes.',
    treadPattern: 'blocky',
    chitinComposition: 'hardened',
    sidewallDesign: 'armored',
    performance: {
      speedModifier: 0.6,
      durabilityModifier: 2.0,
      gripModifier: 1.2,
      tireDecayModifier: 0.4,
      recoveryBonus: 0,
      terrainBonus: { grass: -0.1, sand: 0, mud: 0.2, rock: 0.4, water: 0.1, shade: 0 },
    },
    climateAdaptation: {
      heatResistance: 0.7,
      coldPerformance: 0.4,
      wetGrip: 0.6,
      dustProtection: 0.8,
    },
    sensorIntegration: {
      hasTirePressureSensor: true,
      hasTemperatureSensor: true,
      hasWearIndicator: true,
      hasTerrainScanner: true,
      hasProximityAlert: true,
      dataAccuracy: 0.8,
    },
    sustainability: {
      recyclability: 0.4,
      bioMaterialPercentage: 40,
      carbonFootprint: 'high',
      lifespan: 70,
      renewableSource: false,
    },
    manufacturing: {
      complexity: 'advanced',
      requiredMaterials: ['battle_chitin', 'mineral_plating', 'shock_absorbers'],
      productionTime: 12,
      qualityVariance: 0.05,
    },
    cost: 500,
    unlockLevel: 6,
  },
  
  adaptive: {
    type: 'adaptive',
    name: 'Morphing Treads',
    description: 'Smart chitin that reshapes based on terrain.',
    treadPattern: 'compound',
    chitinComposition: 'nano_enhanced',
    sidewallDesign: 'flexible',
    performance: {
      speedModifier: 1.05,
      durabilityModifier: 1.1,
      gripModifier: 1.25,
      tireDecayModifier: 0.85,
      recoveryBonus: 0.1,
      terrainBonus: { grass: 0.15, sand: 0.15, mud: 0.15, rock: 0.15, water: 0.1, shade: 0.15 },
    },
    climateAdaptation: {
      heatResistance: 0.7,
      coldPerformance: 0.7,
      wetGrip: 0.7,
      dustProtection: 0.7,
    },
    sensorIntegration: {
      hasTirePressureSensor: true,
      hasTemperatureSensor: true,
      hasWearIndicator: true,
      hasTerrainScanner: true,
      hasProximityAlert: true,
      dataAccuracy: 0.95,
    },
    sustainability: {
      recyclability: 0.6,
      bioMaterialPercentage: 55,
      carbonFootprint: 'medium',
      lifespan: 40,
      renewableSource: false,
    },
    manufacturing: {
      complexity: 'advanced',
      requiredMaterials: ['nano_chitin', 'adaptive_polymers', 'sensor_network'],
      productionTime: 15,
      qualityVariance: 0.1,
    },
    cost: 600,
    unlockLevel: 7,
  },
  
  eco_chitin: {
    type: 'eco_chitin',
    name: 'Green Harmony Treads',
    description: '100% sustainable treads that regenerate over time.',
    treadPattern: 'symmetric',
    chitinComposition: 'bio_composite',
    sidewallDesign: 'standard',
    performance: {
      speedModifier: 0.95,
      durabilityModifier: 0.9,
      gripModifier: 1.0,
      tireDecayModifier: 0.9,
      recoveryBonus: 0.2,
      terrainBonus: { grass: 0.2, sand: 0, mud: 0, rock: -0.1, water: 0, shade: 0.3 },
    },
    climateAdaptation: {
      heatResistance: 0.5,
      coldPerformance: 0.5,
      wetGrip: 0.6,
      dustProtection: 0.4,
    },
    sensorIntegration: {
      hasTirePressureSensor: false,
      hasTemperatureSensor: false,
      hasWearIndicator: true,
      hasTerrainScanner: false,
      hasProximityAlert: false,
      dataAccuracy: 0.5,
    },
    sustainability: {
      recyclability: 1.0,
      bioMaterialPercentage: 100,
      carbonFootprint: 'low',
      lifespan: 25,
      renewableSource: true,
    },
    manufacturing: {
      complexity: 'simple',
      requiredMaterials: ['organic_chitin', 'plant_fibers', 'natural_oils'],
      productionTime: 3,
      qualityVariance: 0.3,
    },
    cost: 100,
    unlockLevel: 1,
  },
  
  sensor_array: {
    type: 'sensor_array',
    name: 'Neural Network Treads',
    description: 'High-tech treads with full sensor integration.',
    treadPattern: 'asymmetric',
    chitinComposition: 'nano_enhanced',
    sidewallDesign: 'vented',
    performance: {
      speedModifier: 1.0,
      durabilityModifier: 0.85,
      gripModifier: 1.15,
      tireDecayModifier: 1.0,
      recoveryBonus: 0.05,
      terrainBonus: { grass: 0.1, sand: 0.1, mud: 0.1, rock: 0.1, water: 0.1, shade: 0.1 },
    },
    climateAdaptation: {
      heatResistance: 0.6,
      coldPerformance: 0.6,
      wetGrip: 0.6,
      dustProtection: 0.6,
    },
    sensorIntegration: {
      hasTirePressureSensor: true,
      hasTemperatureSensor: true,
      hasWearIndicator: true,
      hasTerrainScanner: true,
      hasProximityAlert: true,
      dataAccuracy: 1.0,
    },
    sustainability: {
      recyclability: 0.5,
      bioMaterialPercentage: 45,
      carbonFootprint: 'high',
      lifespan: 30,
      renewableSource: false,
    },
    manufacturing: {
      complexity: 'advanced',
      requiredMaterials: ['sensor_chitin', 'neural_fibers', 'data_processors'],
      productionTime: 12,
      qualityVariance: 0.08,
    },
    cost: 450,
    unlockLevel: 6,
  },
  
  industrial: {
    type: 'industrial',
    name: 'Factory Worker Treads',
    description: 'Built for continuous heavy-duty operation.',
    treadPattern: 'blocky',
    chitinComposition: 'hardened',
    sidewallDesign: 'armored',
    performance: {
      speedModifier: 0.65,
      durabilityModifier: 2.5,
      gripModifier: 1.4,
      tireDecayModifier: 0.3,
      recoveryBonus: 0,
      terrainBonus: { grass: -0.1, sand: 0.1, mud: 0.4, rock: 0.3, water: 0.1, shade: 0 },
    },
    climateAdaptation: {
      heatResistance: 0.8,
      coldPerformance: 0.5,
      wetGrip: 0.7,
      dustProtection: 0.9,
    },
    sensorIntegration: {
      hasTirePressureSensor: true,
      hasTemperatureSensor: true,
      hasWearIndicator: true,
      hasTerrainScanner: true,
      hasProximityAlert: true,
      dataAccuracy: 0.85,
    },
    sustainability: {
      recyclability: 0.3,
      bioMaterialPercentage: 30,
      carbonFootprint: 'high',
      lifespan: 100,
      renewableSource: false,
    },
    manufacturing: {
      complexity: 'advanced',
      requiredMaterials: ['industrial_chitin', 'steel_reinforcement', 'hydraulic_dampeners'],
      productionTime: 20,
      qualityVariance: 0.05,
    },
    cost: 750,
    unlockLevel: 8,
  },
}

// ============================================================================
// TERRAIN TYPES
// ============================================================================

export type TerrainType = 'grass' | 'sand' | 'mud' | 'rock' | 'water' | 'shade'

export interface TerrainCondition {
  type: TerrainType
  intensity: number  // 0-1
  wetness: number    // 0-1
  temperature: number // Celsius equivalent
}

// ============================================================================
// CLIMATE CONDITIONS
// ============================================================================

export type Season = 'dry' | 'wet' | 'harmattan' | 'mild'
export type TimeOfDay = 'dawn' | 'morning' | 'noon' | 'afternoon' | 'dusk' | 'night'

export interface ClimateCondition {
  season: Season
  timeOfDay: TimeOfDay
  temperature: number      // 15-45 Celsius
  humidity: number         // 0-1
  windSpeed: number        // 0-1
  dustLevel: number        // 0-1 (dry season)
  rainIntensity: number    // 0-1 (wet season)
}

// ============================================================================
// COMPREHENSIVE BEETLE TIRE SYSTEM
// ============================================================================

export interface BeetleTireConfig {
  beetleProfile: BeetleProfile
  equippedTire: TireDefinition
  currentTerrain: TerrainCondition
  currentClimate: ClimateCondition
  wearLevel: number        // 0-100 (100 = new)
  sensorData: SensorReadout
}

export interface SensorReadout {
  tirePressure: number | null
  temperature: number | null
  wearPercentage: number
  terrainType: TerrainType | null
  nearbyObstacles: number
  dataTimestamp: number
}

export interface TirePerformanceResult {
  effectiveSpeed: number
  effectiveGrip: number
  effectiveDurability: number
  tireDecayRate: number
  recoveryRate: number
  warnings: string[]
  recommendations: string[]
}

export class BeetleTireSystem {
  private config: BeetleTireConfig
  private lastUpdateTime: number = 0
  
  constructor(
    species: BeetleSpecies = 'scarab',
    tireType: TireType = 'standard'
  ) {
    const beetleProfile = BEETLE_PROFILES[species]
    const tireDef = TIRE_DEFINITIONS[tireType]
    
    this.config = {
      beetleProfile,
      equippedTire: tireDef,
      currentTerrain: {
        type: 'grass',
        intensity: 0.5,
        wetness: 0.2,
        temperature: 28,
      },
      currentClimate: {
        season: 'dry',
        timeOfDay: 'morning',
        temperature: 28,
        humidity: 0.4,
        windSpeed: 0.2,
        dustLevel: 0.3,
        rainIntensity: 0,
      },
      wearLevel: 100,
      sensorData: {
        tirePressure: null,
        temperature: null,
        wearPercentage: 100,
        terrainType: null,
        nearbyObstacles: 0,
        dataTimestamp: Date.now(),
      },
    }
  }
  
  /**
   * Calculate comprehensive tire performance based on all factors
   */
  calculatePerformance(): TirePerformanceResult {
    const { beetleProfile, equippedTire, currentTerrain, currentClimate, wearLevel } = this.config
    const perf = equippedTire.performance
    const climate = equippedTire.climateAdaptation
    const warnings: string[] = []
    const recommendations: string[] = []
    
    // Base modifiers from tire
    let speedMod = perf.speedModifier
    let gripMod = perf.gripModifier
    let durabilityMod = perf.durabilityModifier
    let decayRate = perf.tireDecayModifier
    let recoveryRate = 1 + perf.recoveryBonus
    
    // Apply beetle base stats
    speedMod *= beetleProfile.baseStats.speed / 3
    durabilityMod *= beetleProfile.baseStats.durability / 3
    recoveryRate *= beetleProfile.baseStats.recoveryRate
    decayRate *= beetleProfile.baseStats.tireEfficiency
    
    // Apply terrain bonus
    const terrainBonus = perf.terrainBonus[currentTerrain.type]
    speedMod += terrainBonus * 0.2
    gripMod += terrainBonus * 0.3
    
    // Apply climate effects
    const tempFactor = this.calculateTemperatureFactor(currentClimate.temperature)
    
    // Heat resistance
    if (currentClimate.temperature > 35) {
      const heatPenalty = (1 - climate.heatResistance) * 0.3
      speedMod -= heatPenalty
      decayRate += heatPenalty * 0.5
      if (climate.heatResistance < 0.5) {
        warnings.push('High temperature affecting tire performance')
        recommendations.push('Consider heat-resistant treads')
      }
    }
    
    // Cold performance
    if (currentClimate.temperature < 20) {
      const coldPenalty = (1 - climate.coldPerformance) * 0.2
      gripMod -= coldPenalty
      if (climate.coldPerformance < 0.5) {
        warnings.push('Low temperature reducing grip')
      }
    }
    
    // Wet conditions
    if (currentClimate.rainIntensity > 0.3 || currentTerrain.wetness > 0.5) {
      const wetPenalty = (1 - climate.wetGrip) * 0.4
      gripMod -= wetPenalty
      speedMod -= wetPenalty * 0.2
      if (climate.wetGrip < 0.5) {
        warnings.push('Wet conditions compromising traction')
        recommendations.push('Switch to mud terrain or all-terrain treads')
      }
    }
    
    // Dust conditions
    if (currentClimate.dustLevel > 0.5) {
      const dustPenalty = (1 - climate.dustProtection) * 0.2
      durabilityMod -= dustPenalty
      if (climate.dustProtection < 0.5) {
        warnings.push('Dust accumulation accelerating wear')
      }
    }
    
    // Apply wear degradation
    const wearFactor = wearLevel / 100
    speedMod *= lerp(0.7, 1.0, wearFactor)
    gripMod *= lerp(0.5, 1.0, wearFactor)
    durabilityMod *= wearFactor
    
    if (wearLevel < 30) {
      warnings.push('Critical tire wear - replace soon')
      recommendations.push('Visit Maasai Trading Post for new treads')
    } else if (wearLevel < 50) {
      warnings.push('Tire wear moderate - monitor closely')
    }
    
    // Shade recovery bonus
    if (currentTerrain.type === 'shade') {
      recoveryRate *= 1 + perf.terrainBonus.shade
    }
    
    return {
      effectiveSpeed: clamp(speedMod, 0.3, 2.0),
      effectiveGrip: clamp(gripMod, 0.3, 2.0),
      effectiveDurability: clamp(durabilityMod, 0.2, 3.0),
      tireDecayRate: clamp(decayRate, 0.2, 2.0),
      recoveryRate: clamp(recoveryRate, 0.5, 3.0),
      warnings,
      recommendations,
    }
  }
  
  /**
   * Calculate temperature impact factor
   */
  private calculateTemperatureFactor(temp: number): number {
    // Optimal range: 22-30 Celsius
    if (temp >= 22 && temp <= 30) return 1.0
    if (temp < 22) return lerp(0.7, 1.0, temp / 22)
    if (temp > 30) return lerp(1.0, 0.6, (temp - 30) / 15)
    return 1.0
  }
  
  /**
   * Update tire wear based on usage
   */
  applyWear(deltaTime: number, isMoving: boolean, isDigging: boolean): void {
    const perf = this.calculatePerformance()
    let wearAmount = 0
    
    if (isMoving) {
      wearAmount += 0.01 * deltaTime / perf.effectiveDurability
    }
    
    if (isDigging) {
      wearAmount += 0.02 * deltaTime / perf.effectiveDurability
    }
    
    // Apply terrain wear factor
    const terrainWear: Record<TerrainType, number> = {
      grass: 1.0,
      sand: 1.2,
      mud: 1.1,
      rock: 1.5,
      water: 0.9,
      shade: 0.8,
    }
    wearAmount *= terrainWear[this.config.currentTerrain.type]
    
    this.config.wearLevel = Math.max(0, this.config.wearLevel - wearAmount)
    this.updateSensorData()
  }
  
  /**
   * Update sensor readout
   */
  private updateSensorData(): void {
    const sensors = this.config.equippedTire.sensorIntegration
    
    this.config.sensorData = {
      tirePressure: sensors.hasTirePressureSensor 
        ? 32 - (100 - this.config.wearLevel) * 0.1 
        : null,
      temperature: sensors.hasTemperatureSensor 
        ? this.config.currentClimate.temperature + Math.random() * 5 
        : null,
      wearPercentage: sensors.hasWearIndicator 
        ? this.config.wearLevel * sensors.dataAccuracy 
        : 0,
      terrainType: sensors.hasTerrainScanner 
        ? this.config.currentTerrain.type 
        : null,
      nearbyObstacles: sensors.hasProximityAlert ? 0 : 0,
      dataTimestamp: Date.now(),
    }
  }
  
  /**
   * Set current terrain
   */
  setTerrain(terrain: Partial<TerrainCondition>): void {
    this.config.currentTerrain = { ...this.config.currentTerrain, ...terrain }
  }
  
  /**
   * Set climate conditions
   */
  setClimate(climate: Partial<ClimateCondition>): void {
    this.config.currentClimate = { ...this.config.currentClimate, ...climate }
  }
  
  /**
   * Equip a new tire
   */
  equipTire(tireType: TireType): boolean {
    const tireDef = TIRE_DEFINITIONS[tireType]
    const compatible = this.config.beetleProfile.compatibleTires.includes(tireType)
    
    if (!compatible) {
      console.warn(`Tire ${tireType} not compatible with ${this.config.beetleProfile.species}`)
      return false
    }
    
    this.config.equippedTire = tireDef
    this.config.wearLevel = 100
    this.updateSensorData()
    return true
  }
  
  /**
   * Change beetle species
   */
  setBeetle(species: BeetleSpecies): void {
    this.config.beetleProfile = BEETLE_PROFILES[species]
    
    // Check tire compatibility
    if (!this.config.beetleProfile.compatibleTires.includes(this.config.equippedTire.type)) {
      // Switch to first compatible tire
      const defaultTire = this.config.beetleProfile.compatibleTires[0]
      this.equipTire(defaultTire)
    }
  }
  
  /**
   * Get current configuration
   */
  getConfig(): BeetleTireConfig {
    return { ...this.config }
  }
  
  /**
   * Get sensor data
   */
  getSensorData(): SensorReadout {
    return { ...this.config.sensorData }
  }
  
  /**
   * Check if tire needs replacement
   */
  needsReplacement(): boolean {
    return this.config.wearLevel < 20
  }
  
  /**
   * Calculate sustainability score for current setup
   */
  getSustainabilityScore(): number {
    const sus = this.config.equippedTire.sustainability
    return (
      sus.recyclability * 25 +
      (sus.bioMaterialPercentage / 100) * 25 +
      (sus.carbonFootprint === 'low' ? 30 : sus.carbonFootprint === 'medium' ? 15 : 0) +
      (sus.renewableSource ? 20 : 0)
    )
  }
  
  /**
   * Get recommended tires for current conditions
   */
  getRecommendedTires(): TireType[] {
    const compatible = this.config.beetleProfile.compatibleTires
    const { currentTerrain, currentClimate } = this.config
    
    const scores: Array<{ type: TireType; score: number }> = []
    
    for (const tireType of compatible) {
      const tire = TIRE_DEFINITIONS[tireType]
      let score = 0
      
      // Terrain match
      score += tire.performance.terrainBonus[currentTerrain.type] * 20
      
      // Climate match
      if (currentClimate.temperature > 30) {
        score += tire.climateAdaptation.heatResistance * 15
      }
      if (currentClimate.rainIntensity > 0.3) {
        score += tire.climateAdaptation.wetGrip * 15
      }
      if (currentClimate.dustLevel > 0.5) {
        score += tire.climateAdaptation.dustProtection * 10
      }
      
      // General performance
      score += tire.performance.durabilityModifier * 5
      score += tire.performance.gripModifier * 5
      
      scores.push({ type: tireType, score })
    }
    
    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(s => s.type)
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

let beetleTireSystemInstance: BeetleTireSystem | null = null

export function getBeetleTireSystem(): BeetleTireSystem {
  if (!beetleTireSystemInstance) {
    beetleTireSystemInstance = new BeetleTireSystem()
  }
  return beetleTireSystemInstance
}

export function createBeetleTireSystem(
  species: BeetleSpecies,
  tireType: TireType
): BeetleTireSystem {
  return new BeetleTireSystem(species, tireType)
}

export function resetBeetleTireSystem(): void {
  beetleTireSystemInstance = null
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function getTireCompatibility(
  species: BeetleSpecies,
  tireType: TireType
): boolean {
  return BEETLE_PROFILES[species].compatibleTires.includes(tireType)
}

export function getAllTiresForBeetle(species: BeetleSpecies): TireDefinition[] {
  return BEETLE_PROFILES[species].compatibleTires.map(t => TIRE_DEFINITIONS[t])
}

export function getTiresUnlockedAtLevel(level: number): TireDefinition[] {
  return Object.values(TIRE_DEFINITIONS).filter(t => t.unlockLevel <= level)
}

export function calculateManufacturingCost(tireType: TireType): number {
  const tire = TIRE_DEFINITIONS[tireType]
  const complexityMultiplier = {
    simple: 1,
    moderate: 1.5,
    complex: 2,
    advanced: 3,
  }
  return Math.floor(tire.cost * 0.7 * complexityMultiplier[tire.manufacturing.complexity])
}

export function estimateLifespan(
  tireType: TireType,
  avgTerrainDifficulty: number,
  avgClimateHarshness: number
): number {
  const tire = TIRE_DEFINITIONS[tireType]
  const baseDays = tire.sustainability.lifespan
  const terrainFactor = 1 - avgTerrainDifficulty * 0.3
  const climateFactor = 1 - avgClimateHarshness * 0.2
  return Math.floor(baseDays * terrainFactor * climateFactor)
}
