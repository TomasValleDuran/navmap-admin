import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useNavmapStore } from '../store/useNavmapStore'
import { WalkControls } from './WalkControls'

export function CameraRig() {
  const cameraMode = useNavmapStore((s) => s.cameraMode)
  const focusRequestId = useNavmapStore((s) => s.focusRequestId)
  const modelRadius = useNavmapStore((s) => s.modelRadius)
  const modelLoaded = useNavmapStore((s) => s.modelLoaded)
  const { camera } = useThree()
  const orbitRef = useRef<OrbitControlsImpl | null>(null)

  useEffect(() => {
    if (!modelLoaded || focusRequestId === 0) return
    const r = Math.max(modelRadius * 2.2, 6)
    camera.position.set(r * 0.6, r * 0.5, r * 0.8)
    camera.lookAt(0, 0, 0)
    if (orbitRef.current) {
      orbitRef.current.target.set(0, 0, 0)
      orbitRef.current.update()
    }
  }, [focusRequestId, modelLoaded, modelRadius, camera])

  return cameraMode === 'orbit' ? (
    <OrbitControls
      ref={orbitRef as unknown as React.Ref<OrbitControlsImpl>}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      mouseButtons={{ LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
    />
  ) : (
    <WalkControls />
  )
}
