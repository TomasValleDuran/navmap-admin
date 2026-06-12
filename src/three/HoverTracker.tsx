import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { useNavmapStore } from '../store/useNavmapStore'
import { viewerToColmap } from '../lib/coordTransforms'
import { pickPointOnModel } from '../lib/pointPicking'

const tmpPlane = new THREE.Plane()
const tmpHit = new THREE.Vector3()

export function HoverTracker() {
  const { camera, gl, scene } = useThree()
  const raycasterRef = useRef(new THREE.Raycaster())
  const ndcRef = useRef(new THREE.Vector2())
  const rafRef = useRef<number | null>(null)
  const lastSetRef = useRef<number>(0)

  useEffect(() => {
    raycasterRef.current.params.Points = { threshold: 0.08 }
    const dom = gl.domElement

    const computeAndSet = () => {
      rafRef.current = null
      const state = useNavmapStore.getState()
      if (!state.modelLoaded) return
      raycasterRef.current.setFromCamera(ndcRef.current, camera)

      const modelGroup = scene.getObjectByName('model-group')
      const floorMesh = scene.getObjectByName('floor-solid')
      const measuring = state.mode === 'measure' || state.mode === 'anchor'

      let point: THREE.Vector3 | null = null
      if (measuring) {
        // mirror the click path exactly: model-only, precise robust pick
        if (modelGroup) {
          point = pickPointOnModel(raycasterRef.current, modelGroup, state.modelRadius, {
            precise: true,
          })
        }
      } else {
        if (floorMesh) {
          const fHits = raycasterRef.current.intersectObject(floorMesh, false)
          if (fHits.length) point = fHits[0].point.clone()
        }
        if (!point && modelGroup) {
          point = pickPointOnModel(raycasterRef.current, modelGroup, state.modelRadius)
        }
        if (!point) {
          const sy = state.mirrorY ? -1 : 1
          tmpPlane.setFromNormalAndCoplanarPoint(
            new THREE.Vector3(0, 1, 0),
            tmpHit.set(0, state.floorHeightViewer * sy, 0),
          )
          if (raycasterRef.current.ray.intersectPlane(tmpPlane, tmpHit)) point = tmpHit.clone()
        }
      }
      if (!point) {
        state.setCoordHover(null)
        if (state.measureHover) state.setMeasureHover(null)
        return
      }
      if (state.mirrorX) point.x *= -1
      if (state.mirrorY) point.y *= -1
      if (state.mirrorZ) point.z *= -1
      if (measuring) {
        state.setMeasureHover({ vx: point.x, vy: point.y, vz: point.z })
      } else if (state.measureHover) {
        state.setMeasureHover(null)
      }
      const c = viewerToColmap(point.x, point.y, point.z, state.transform)
      state.setCoordHover(c)
    }

    const onMove = (e: PointerEvent) => {
      const now = performance.now()
      if (now - lastSetRef.current < 16) return
      lastSetRef.current = now
      const rect = dom.getBoundingClientRect()
      ndcRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      ndcRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      if (rafRef.current == null) rafRef.current = requestAnimationFrame(computeAndSet)
    }

    const onLeave = () => {
      const s = useNavmapStore.getState()
      s.setCoordHover(null)
      s.setMeasureHover(null)
    }

    dom.addEventListener('pointermove', onMove)
    dom.addEventListener('pointerleave', onLeave)
    return () => {
      dom.removeEventListener('pointermove', onMove)
      dom.removeEventListener('pointerleave', onLeave)
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [camera, gl, scene])

  return null
}
