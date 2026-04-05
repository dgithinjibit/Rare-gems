import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { BeetleSpecies, TireType } from '../systems/BeetleTireSystem'

// Tire states following the state machine pattern
export type TireState = 'ACTIVE' | 'FATIGUED' | 'EXHAUSTED' | 'RECOVERING'

export interface Upgrade {
  id: string
  name: string
  description: string
  cost: number
  effect: string
  purchased: boolean
}

export interface GameState {
  // Game phase
  gamePhase: 'menu' | 'playing' | 'paused' | 'exhausted' | 'beetle_select'
  
  // Player stats
  tire: number // 0-100 percentage
  tireState: TireState
  beads: number
  combo: number
  comboTimer: number
  
  // Beetle and Tire selection
  selectedBeetle: BeetleSpecies
  equippedTire: TireType
  tireWear: number // 0-100 (100 = new)
  unlockedBeetles: BeetleSpecies[]
  unlockedTires: TireType[]
  
  // Upgrades
  upgrades: Upgrade[]
  
  // Level progress
  currentLevel: number
  dungPilesCleared: number
  totalDungPilesInLevel: number
  
  // Player position (for systems that need it)
  playerPosition: [number, number, number]
  
  // Configuration
  config: {
    tireIncreasePerVoxel: number
    passiveDecayRate: number
    shadeRecoveryMultiplier: number
    exhaustionPenaltyMs: number
    comboTimeoutMs: number
  }
  
  // Actions
  setGamePhase: (phase: GameState['gamePhase']) => void
  increaseTire: (amount: number) => void
  decreaseTire: (amount: number) => void
  setTireState: (state: TireState) => void
  addBeads: (amount: number) => void
  spendBeads: (amount: number) => boolean
  incrementCombo: () => void
  resetCombo: () => void
  purchaseUpgrade: (upgradeId: string) => boolean
  clearDungPile: () => void
  nextLevel: () => void
  setPlayerPosition: (pos: [number, number, number]) => void
  resetGame: () => void
  
  // Beetle and Tire actions
  selectBeetle: (species: BeetleSpecies) => void
  equipTire: (tire: TireType) => void
  applyTireWear: (amount: number) => void
  unlockBeetle: (species: BeetleSpecies) => void
  unlockTire: (tire: TireType) => void
  repairTire: () => void
}

// Default upgrades available in the shop
const DEFAULT_UPGRADES: Upgrade[] = [
  {
    id: 'shovel_legs',
    name: 'Shovel Legs',
    description: 'Your legs become more efficient at processing dung',
    cost: 100,
    effect: 'damage_x3',
    purchased: false,
  },
  {
    id: 'chitin_plating',
    name: 'Chitin Plating',
    description: 'Stronger shell reduces tire buildup by 50%',
    cost: 150,
    effect: 'tire_slow_50',
    purchased: false,
  },
  {
    id: 'rolling_mastery',
    name: 'Rolling Mastery',
    description: 'Automatically process dung while rolling over it',
    cost: 250,
    effect: 'passive_clear',
    purchased: false,
  },
  {
    id: 'shade_seeker',
    name: 'Shade Seeker',
    description: 'Double recovery rate under Acacia trees',
    cost: 200,
    effect: 'recovery_x2',
    purchased: false,
  },
  {
    id: 'bead_magnet',
    name: 'Bead Magnet',
    description: 'Collect 25% more beads from each voxel',
    cost: 175,
    effect: 'bead_bonus_25',
    purchased: false,
  },
]

const DEFAULT_CONFIG = {
  tireIncreasePerVoxel: 2,
  passiveDecayRate: 0.5,
  shadeRecoveryMultiplier: 3,
  exhaustionPenaltyMs: 5000,
  comboTimeoutMs: 2000,
}

export const useGameStore = create<GameState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    gamePhase: 'menu',
    tire: 0,
    tireState: 'ACTIVE',
    beads: 0,
    combo: 0,
    comboTimer: 0,
    
    // Beetle and Tire initial state
    selectedBeetle: 'scarab' as BeetleSpecies,
    equippedTire: 'standard' as TireType,
    tireWear: 100,
    unlockedBeetles: ['scarab'] as BeetleSpecies[],
    unlockedTires: ['standard', 'eco_chitin'] as TireType[],
    
    upgrades: DEFAULT_UPGRADES,
    currentLevel: 1,
    dungPilesCleared: 0,
    totalDungPilesInLevel: 5,
    playerPosition: [0, 0.5, 0],
    config: DEFAULT_CONFIG,
    
    // Actions
    setGamePhase: (phase) => set({ gamePhase: phase }),
    
    increaseTire: (amount) => {
      const state = get()
      
      // Check if chitin plating upgrade is active
      const hasChitinPlating = state.upgrades.find(
        u => u.id === 'chitin_plating' && u.purchased
      )
      const modifier = hasChitinPlating ? 0.5 : 1
      
      const newTire = Math.min(100, state.tire + amount * modifier)
      
      // Determine new tire state
      let newTireState: TireState = state.tireState
      if (newTire >= 100) {
        newTireState = 'EXHAUSTED'
      } else if (newTire >= 50) {
        newTireState = 'FATIGUED'
      }
      
      set({ tire: newTire, tireState: newTireState })
    },
    
    decreaseTire: (amount) => {
      const state = get()
      
      // Check for shade seeker upgrade
      const hasShadeSeeker = state.upgrades.find(
        u => u.id === 'shade_seeker' && u.purchased
      )
      const modifier = hasShadeSeeker ? 2 : 1
      
      const newTire = Math.max(0, state.tire - amount * modifier)
      
      // Determine new tire state
      let newTireState: TireState = state.tireState
      if (state.tireState === 'EXHAUSTED' && newTire < 100) {
        newTireState = 'RECOVERING'
      } else if (state.tireState === 'RECOVERING' && newTire < 50) {
        newTireState = 'ACTIVE'
      } else if (newTire < 50) {
        newTireState = 'ACTIVE'
      } else if (newTire < 100) {
        newTireState = 'FATIGUED'
      }
      
      set({ tire: newTire, tireState: newTireState })
    },
    
    setTireState: (state) => set({ tireState: state }),
    
    addBeads: (amount) => {
      const state = get()
      
      // Check for bead magnet upgrade
      const hasBeadMagnet = state.upgrades.find(
        u => u.id === 'bead_magnet' && u.purchased
      )
      const modifier = hasBeadMagnet ? 1.25 : 1
      
      // Apply combo multiplier
      const comboMultiplier = 1 + state.combo * 0.1
      
      const finalAmount = Math.floor(amount * modifier * comboMultiplier)
      set({ beads: state.beads + finalAmount })
    },
    
    spendBeads: (amount) => {
      const state = get()
      if (state.beads >= amount) {
        set({ beads: state.beads - amount })
        return true
      }
      return false
    },
    
    incrementCombo: () => {
      set((state) => ({ combo: state.combo + 1 }))
    },
    
    resetCombo: () => set({ combo: 0 }),
    
    purchaseUpgrade: (upgradeId) => {
      const state = get()
      const upgrade = state.upgrades.find(u => u.id === upgradeId)
      
      if (!upgrade || upgrade.purchased || state.beads < upgrade.cost) {
        return false
      }
      
      set({
        beads: state.beads - upgrade.cost,
        upgrades: state.upgrades.map(u =>
          u.id === upgradeId ? { ...u, purchased: true } : u
        ),
      })
      return true
    },
    
    clearDungPile: () => {
      const state = get()
      const newCleared = state.dungPilesCleared + 1
      
      // Bonus beads for completing a pile
      const bonus = 50 * state.currentLevel
      
      set({
        dungPilesCleared: newCleared,
        beads: state.beads + bonus,
      })
    },
    
    nextLevel: () => {
      set((state) => ({
        currentLevel: state.currentLevel + 1,
        dungPilesCleared: 0,
        totalDungPilesInLevel: 5 + state.currentLevel,
      }))
    },
    
    setPlayerPosition: (pos) => set({ playerPosition: pos }),
    
    resetGame: () => set({
      gamePhase: 'menu',
      tire: 0,
      tireState: 'ACTIVE',
      beads: 0,
      combo: 0,
      comboTimer: 0,
      upgrades: DEFAULT_UPGRADES,
      currentLevel: 1,
      dungPilesCleared: 0,
      totalDungPilesInLevel: 5,
      playerPosition: [0, 0.5, 0],
      tireWear: 100,
    }),
    
    // Beetle and Tire actions
    selectBeetle: (species) => {
      const state = get()
      if (state.unlockedBeetles.includes(species)) {
        set({ selectedBeetle: species })
      }
    },
    
    equipTire: (tire) => {
      const state = get()
      if (state.unlockedTires.includes(tire)) {
        set({ equippedTire: tire, tireWear: 100 })
      }
    },
    
    applyTireWear: (amount) => {
      set((state) => ({
        tireWear: Math.max(0, state.tireWear - amount),
      }))
    },
    
    unlockBeetle: (species) => {
      set((state) => ({
        unlockedBeetles: state.unlockedBeetles.includes(species)
          ? state.unlockedBeetles
          : [...state.unlockedBeetles, species],
      }))
    },
    
    unlockTire: (tire) => {
      set((state) => ({
        unlockedTires: state.unlockedTires.includes(tire)
          ? state.unlockedTires
          : [...state.unlockedTires, tire],
      }))
    },
    
    repairTire: () => {
      set({ tireWear: 100 })
    },
  }))
)

// Selectors for common state slices
export const selectTire = (state: GameState) => state.tire
export const selectTireState = (state: GameState) => state.tireState
export const selectBeads = (state: GameState) => state.beads
export const selectCombo = (state: GameState) => state.combo
export const selectUpgrades = (state: GameState) => state.upgrades
export const selectGamePhase = (state: GameState) => state.gamePhase
