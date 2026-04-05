/**
 * Shared Game Types
 * Extracted to avoid circular dependencies between stores and systems
 */

// ============================================================================
// TIRE SYSTEM TYPES
// ============================================================================

export type TireState = 'ACTIVE' | 'FATIGUED' | 'EXHAUSTED' | 'RECOVERING'

// ============================================================================
// BEETLE SPECIES DEFINITIONS
// ============================================================================

export type BeetleSpecies = 
  | 'scarab'           // Balanced all-rounder
  | 'dung_roller'      // Speed specialist
  | 'rhino_beetle'     // Tank/strength
  | 'jewel_beetle'     // Agility specialist
  | 'stag_beetle'      // Combat/defense
  | 'goliath'          // Heavy duty

// ============================================================================
// TIRE TYPE DEFINITIONS
// ============================================================================

export type TireType =
  | 'standard'         // Default balanced tire
  | 'speed_tread'      // Optimized for fast movement
  | 'heavy_duty'       // Built for durability
  | 'all_terrain'      // Versatile multi-surface
  | 'mud_terrain'      // Specialized for wet/muddy conditions
  | 'sand_runner'      // Optimized for sandy/loose soil
  | 'precision'        // High-grip fine control
  | 'lightweight'      // Reduced weight, faster movement
  | 'reinforced'       // Extra durability
  | 'armored'          // Maximum protection
  | 'adaptive'         // Self-adjusting smart tire
  | 'eco_chitin'       // Sustainable bio-materials
  | 'sensor_array'     // Full sensor integration
  | 'industrial'       // Heavy machinery grade

// ============================================================================
// UPGRADE TYPES
// ============================================================================

export interface Upgrade {
  id: string
  name: string
  description: string
  cost: number
  effect: string
  purchased: boolean
}
