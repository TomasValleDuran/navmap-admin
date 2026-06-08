import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { useNavmapStore } from '../store/useNavmapStore'
import { viewerToColmap } from '../lib/coordTransforms'

const DRAG_PIXELS = 5
const tmpPlane = new THREE.Plane()
const tmpHit = new THREE.Vector3()

function shouldPickFloor(): boolean {
  const s = useNavmapStore.getState()
  return s.floorLock || s.mode === 'poi' || s.mode === 'waypoint'
}

export function PlacementController() {
  const { camera, gl, scene } = useThree()
  const downRef = useRef<{ x: number; y: number } | null>(null)
  const raycaster = useRef(new THREE.Raycaster())
  const ndc = useRef(new THREE.Vector2())

  useEffect(() => {
    raycaster.current.params.Points = { threshold: 0.08 }
    const dom = gl.domElement

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      downRef.current = { x: e.clientX, y: e.clientY }
    }
    const onUp = (e: PointerEvent) => {
      const d = downRef.current
      downRef.current = null
      if (!d || e.button !== 0) return
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > DRAG_PIXELS) return
      const state = useNavmapStore.getState()
      if (!state.modelLoaded) return
      if (state.mode !== 'poi' && state.mode !== 'waypoint') return

      const rect = dom.getBoundingClientRect()
      ndc.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      ndc.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.current.setFromCamera(ndc.current, camera)

      let point: THREE.Vector3 | null = null
      if (shouldPickFloor()) {
        const floor = scene.getObjectByName('floor-solid')
        if (floor) {
          const h = raycaster.current.intersectObject(floor, false)
          if (h.length) point = h[0].point.clone()
        }
        if (!point) {
          tmpPlane.setFromNormalAndCoplanarPoint(
            new THREE.Vector3(0, 1, 0),
            tmpHit.set(0, state.floorHeightViewer, 0),
          )
          if (raycaster.current.ray.intersectPlane(tmpPlane, tmpHit)) point = tmpHit.clone()
        }
      } else {
        const model = scene.getObjectByName('model-group')
        if (model) {
          const h = raycaster.current.intersectObjects(model.children, true)
          if (h.length) point = h[0].point.clone()
        }
      }
      if (!point) {
        state.setStatus('No se encontró un punto en el modelo.')
        return
      }
      const c = viewerToColmap(point.x, point.y, point.z, state.transform)
      state.setPendingPoint({ x: c.x, y: c.y, z: c.z, vx: point.x, vy: point.y, vz: point.z })
    }

    dom.addEventListener('pointerdown', onDown)
    dom.addEventListener('pointerup', onUp)
    return () => {
      dom.removeEventListener('pointerdown', onDown)
      dom.removeEventListener('pointerup', onUp)
    }
  }, [camera, gl, scene])

  return null
}
