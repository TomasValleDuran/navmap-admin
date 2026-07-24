import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { TransformControls } from '@react-three/drei'
import { useNavmapStore } from '../store/useNavmapStore'

/**
 * Unity-style translate / rotate / uniform-scale gizmo for the selected secondary cloud.
 *
 * The target group lives **inside** `model-group` (under `scene-mirror`); `TransformControls`
 * edits the group's *local* transform accounting for parent world matrix, so reading position /
 * quaternion / scale straight back and storing them round-trips correctly even under the mirror's
 * negative scale. Uniform scale is enforced on every change (see TASK2_PLAN.md §5, risk §7 — the
 * numeric inputs in CloudsPanel are the mirror-immune fallback).
 *
 * drei's `TransformControls` disables the default OrbitControls while dragging on its own.
 */
export function CloudGizmo() {
  const selectedCloudId = useNavmapStore((s) => s.selectedCloudId)
  const gizmoMode = useNavmapStore((s) => s.gizmoMode)
  const secondaryClouds = useNavmapStore((s) => s.secondaryClouds)
  const { scene } = useThree()
  const [target, setTarget] = useState<THREE.Object3D | null>(null)

  const selected = secondaryClouds.find((c) => c.id === selectedCloudId && c.visible)
  const selectedId = selected?.id ?? null

  // Resolve the mounted group by name after commit — a just-added cloud's group isn't in the scene
  // graph yet during this render, so syncing it into state (one render later) is the correct pattern.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing to a three object that mounts a render later
    setTarget(selectedId ? scene.getObjectByName(`secondary-${selectedId}`) ?? null : null)
  }, [selectedId, scene, secondaryClouds])

  if (!target || !selectedId) return null

  const handleChange = () => {
    const store = useNavmapStore.getState()
    const cloud = store.secondaryClouds.find((c) => c.id === selectedId)
    if (!cloud) return
    const p = target.position
    const q = target.quaternion
    let scale = cloud.transform.scale
    if (store.gizmoMode === 'scale') {
      // TransformControls can scale axes independently; collapse to the component that moved most.
      const prev = cloud.transform.scale
      let best = prev
      let bestDelta = -1
      for (const v of [target.scale.x, target.scale.y, target.scale.z]) {
        const d = Math.abs(v - prev)
        if (d > bestDelta) {
          bestDelta = d
          best = v
        }
      }
      scale = best > 1e-4 ? best : prev
      target.scale.setScalar(scale) // keep the visual uniform immediately
    }
    store.updateSecondaryCloudTransform(selectedId, {
      position: [p.x, p.y, p.z],
      quaternion: [q.x, q.y, q.z, q.w],
      scale,
    })
  }

  return <TransformControls object={target} mode={gizmoMode} onObjectChange={handleChange} />
}
