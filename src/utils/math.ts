import * as THREE from 'three'

// Vector3 helpers
export function distance2D(
  x1: number,
  z1: number,
  x2: number,
  z2: number
): number {
  const dx = x2 - x1
  const dz = z2 - z1
  return Math.sqrt(dx * dx + dz * dz)
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

// Smooth step interpolation
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

// Generate unique ID
let idCounter = 0
export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${idCounter++}_${Date.now()}`
}

// Random in range
export function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

// Random integer in range (inclusive)
export function randomInt(min: number, max: number): number {
  return Math.floor(randomInRange(min, max + 1))
}

// Angle between two 2D points
export function angleBetween(
  x1: number,
  z1: number,
  x2: number,
  z2: number
): number {
  return Math.atan2(z2 - z1, x2 - x1)
}

// Rotate point around origin
export function rotatePoint(
  x: number,
  z: number,
  angle: number
): { x: number; z: number } {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return {
    x: x * cos - z * sin,
    z: x * sin + z * cos,
  }
}

// Check if point is within bounds
export function isInBounds(
  x: number,
  z: number,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number
): boolean {
  return x >= minX && x <= maxX && z >= minZ && z <= maxZ
}

// Create a temporary Object3D for matrix calculations
const tempObject = new THREE.Object3D()

export function setInstanceMatrix(
  instancedMesh: THREE.InstancedMesh,
  index: number,
  position: THREE.Vector3 | [number, number, number],
  scale: number = 1
): void {
  if (Array.isArray(position)) {
    tempObject.position.set(position[0], position[1], position[2])
  } else {
    tempObject.position.copy(position)
  }
  tempObject.scale.setScalar(scale)
  tempObject.updateMatrix()
  instancedMesh.setMatrixAt(index, tempObject.matrix)
}

// Ease functions
export const ease = {
  linear: (t: number) => t,
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeOutBounce: (t: number) => {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375
    }
  },
}
