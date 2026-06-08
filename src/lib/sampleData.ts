import * as THREE from 'three'
import { prepareModelGeometry, type PreparedModelInfo } from './prepareModel'

export interface SampleModel {
  geometry: THREE.BufferGeometry
  count: number
  info: PreparedModelInfo
  pointSize: number
}

export function buildSampleLCorridor(): SampleModel {
  const pos: number[] = []
  const col: number[] = []

  const addWall = (
    x0: number, x1: number,
    z0: number, z1: number,
    y0: number, y1: number,
    cr: number, cg: number, cb: number,
    density = 0.07,
  ) => {
    for (let x = x0; x <= x1; x += density)
      for (let y = y0; y <= y1; y += density)
        for (let z = z0; z <= z1; z += density) {
          pos.push(x, y, z)
          col.push(cr, cg, cb)
        }
  }

  addWall(-4, 4, -0.05, 0.05, -1.2, 1.2, 0.42, 0.42, 0.45)
  addWall(0.8, 4, -0.05, 0.05, -1.2, 4.5, 0.42, 0.42, 0.45)
  addWall(-4, 4, 2.5, 2.6, -1.2, 1.2, 0.6, 0.62, 0.65)
  addWall(0.8, 4, 2.5, 2.6, -1.2, 4.5, 0.6, 0.62, 0.65)
  addWall(-4, -3.9, 0, 2.5, -1.2, 1.2, 0.55, 0.57, 0.6)
  addWall(-4, 4, 0, 2.5, -1.2, -1.1, 0.5, 0.52, 0.55, 0.08)
  addWall(-4, 4, 0, 2.5, 1.1, 1.2, 0.5, 0.52, 0.55, 0.08)
  addWall(0.8, 4, 0, 2.5, 4.4, 4.5, 0.5, 0.52, 0.55, 0.08)
  addWall(3.9, 4, 0, 2.5, -1.2, 4.5, 0.55, 0.57, 0.6, 0.08)

  for (let i = 0; i < 500; i++) {
    pos.push((Math.random() - 0.5) * 8, Math.random() * 2.5, (Math.random() - 0.5) * 6)
    col.push(0.35 + Math.random() * 0.1, 0.35 + Math.random() * 0.1, 0.37 + Math.random() * 0.1)
  }

  const count = pos.length / 3
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  const info = prepareModelGeometry(geometry, count)
  return { geometry, count, info, pointSize: 0.04 }
}
