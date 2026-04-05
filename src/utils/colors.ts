// Maasai-inspired color palette for Dung Craft
// Vibe Jam Required: Red (#FF0000), Blue (#0000FF), Earthy Ochre
export const COLORS = {
  // Maasai traditional colors - VIBE JAM PALETTE
  maasaiRed: '#FF0000',
  maasaiBlue: '#0000FF',
  maasaiOchre: '#CC7722',
  ochre: '#CC7722',
  beadWhite: '#F5F5DC',
  
  // Earth tones for dung and terrain
  earthBrown: '#8B4513',
  dungDark: '#3D2914',
  dungMid: '#5C3D1E',
  dungLight: '#6B4423',
  dungHighlight: '#7D5A3C',
  
  // Savanna environment
  grassGreen: '#228B22',
  grassDry: '#9B8B5A',
  grassLight: '#7CBA3D',
  skyBlue: '#87CEEB',
  sunsetOrange: '#FF6B35',
  
  // Acacia tree colors
  acaciaBark: '#654321',
  acaciaLeaves: '#556B2F',
  acaciaLeavesDark: '#2F4F2F',
  
  // UI colors
  tireGreen: '#4CAF50',
  tireYellow: '#FFC107',
  tireRed: '#F44336',
  
  // Beetle colors
  beetleShell: '#1A1A2E',
  beetleShellHighlight: '#2D2D44',
  beetleLeg: '#0F0F1A',
} as const

// Dung voxel color variations for natural look
export const DUNG_COLORS = [
  COLORS.dungDark,
  COLORS.dungMid,
  COLORS.dungLight,
  COLORS.dungHighlight,
]

// Get random dung color
export function getRandomDungColor(): string {
  return DUNG_COLORS[Math.floor(Math.random() * DUNG_COLORS.length)]
}

// Tire bar color based on percentage
export function getTireColor(tirePercent: number): string {
  if (tirePercent < 50) return COLORS.tireGreen
  if (tirePercent < 80) return COLORS.tireYellow
  return COLORS.tireRed
}

// Convert hex to THREE.js color number
export function hexToNumber(hex: string): number {
  return parseInt(hex.replace('#', ''), 16)
}
