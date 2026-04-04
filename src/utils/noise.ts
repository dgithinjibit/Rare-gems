import { createNoise2D, createNoise3D } from 'simplex-noise'
import alea from 'simplex-noise/dist/esm/alea'

export interface NoiseGenerator {
  noise2D: (x: number, y: number) => number
  noise3D: (x: number, y: number, z: number) => number
}

// Create seeded noise generators
export function createNoiseGenerator(seed: number): NoiseGenerator {
  const prng = alea(seed.toString())
  const noise2D = createNoise2D(prng)
  const noise3D = createNoise3D(prng)
  
  return { noise2D, noise3D }
}

// Fractal Brownian Motion for more natural terrain
export function fbm(
  noise2D: (x: number, y: number) => number,
  x: number,
  y: number,
  octaves: number = 4,
  lacunarity: number = 2.0,
  persistence: number = 0.5
): number {
  let value = 0
  let amplitude = 1
  let frequency = 1
  let maxValue = 0
  
  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise2D(x * frequency, y * frequency)
    maxValue += amplitude
    amplitude *= persistence
    frequency *= lacunarity
  }
  
  return value / maxValue
}

// Normalize noise value from [-1, 1] to [0, 1]
export function normalizeNoise(value: number): number {
  return (value + 1) / 2
}

// Generate clustered points using blue noise approximation
export function generateClusteredPoints(
  noise2D: (x: number, y: number) => number,
  width: number,
  height: number,
  count: number,
  clusterThreshold: number = 0.3
): Array<{ x: number; z: number }> {
  const points: Array<{ x: number; z: number }> = []
  const attempts = count * 10
  
  for (let i = 0; i < attempts && points.length < count; i++) {
    const x = Math.random() * width - width / 2
    const z = Math.random() * height - height / 2
    
    // Use noise to create clusters
    const noiseVal = normalizeNoise(noise2D(x * 0.05, z * 0.05))
    
    if (noiseVal > clusterThreshold) {
      // Check minimum distance from existing points
      const minDist = 5
      const tooClose = points.some(p => {
        const dx = p.x - x
        const dz = p.z - z
        return Math.sqrt(dx * dx + dz * dz) < minDist
      })
      
      if (!tooClose) {
        points.push({ x, z })
      }
    }
  }
  
  return points
}
