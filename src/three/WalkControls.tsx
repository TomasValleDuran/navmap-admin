import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useNavmapStore } from '../store/useNavmapStore'

const UP = new THREE.Vector3(0, 1, 0)
const FWD = new THREE.Vector3()
const RIGHT = new THREE.Vector3()

function isTyping(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  const t = el.tagName
  return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || el.isContentEditable
}

const MOVE_KEYS = new Set(['w', 'a', 's', 'd', 'q', 'e'])
const LOOK_KEYS = new Set(['arrowup', 'arrowdown', 'arrowleft', 'arrowright'])
const HELD_KEYS = new Set([...MOVE_KEYS, ...LOOK_KEYS])

export function WalkControls() {
  const { camera, gl } = useThree()
  const yaw = useRef(0)
  const pitch = useRef(0)
  const keys = useRef(new Set<string>())
  const dragging = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const dir = new THREE.Vector3()
    camera.getWorldDirection(dir)
    yaw.current = Math.atan2(dir.x, dir.z)
    pitch.current = Math.asin(Math.max(-1, Math.min(1, dir.y)))

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return
      const k = e.key.toLowerCase()
      if (HELD_KEYS.has(k)) {
        keys.current.add(k)
        e.preventDefault()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      keys.current.delete(e.key.toLowerCase())
    }

    const dom = gl.domElement
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      dragging.current = { x: e.clientX, y: e.clientY }
    }
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging.current) return
      const dx = e.clientX - dragging.current.x
      const dy = e.clientY - dragging.current.y
      dragging.current = { x: e.clientX, y: e.clientY }
      yaw.current += dx * 0.0032
      pitch.current += dy * 0.0032
      const lim = Math.PI / 2 - 0.01
      pitch.current = Math.max(-lim, Math.min(lim, pitch.current))
    }
    const onPointerUp = () => {
      dragging.current = null
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const step = useNavmapStore.getState().modelRadius * 0.05
      const fwd = new THREE.Vector3()
      camera.getWorldDirection(fwd)
      camera.position.addScaledVector(fwd, e.deltaY > 0 ? -step : step)
    }
    const onBlur = () => keys.current.clear()

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    dom.addEventListener('pointerdown', onPointerDown)
    dom.addEventListener('pointermove', onPointerMove)
    dom.addEventListener('pointerup', onPointerUp)
    dom.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      dom.removeEventListener('pointerdown', onPointerDown)
      dom.removeEventListener('pointermove', onPointerMove)
      dom.removeEventListener('pointerup', onPointerUp)
      dom.removeEventListener('wheel', onWheel)
      keys.current.clear()
      dragging.current = null
    }
  }, [camera, gl])

  useFrame((_, dt) => {
    const k = keys.current

    const lookSpeed = 1.6 * dt
    if (k.has('arrowleft')) yaw.current += lookSpeed
    if (k.has('arrowright')) yaw.current -= lookSpeed
    if (k.has('arrowup')) pitch.current = Math.min(Math.PI / 2 - 0.01, pitch.current + lookSpeed)
    if (k.has('arrowdown')) pitch.current = Math.max(-Math.PI / 2 + 0.01, pitch.current - lookSpeed)

    const cy = Math.cos(yaw.current)
    const sy = Math.sin(yaw.current)
    const cp = Math.cos(pitch.current)
    const sp = Math.sin(pitch.current)
    const lookX = camera.position.x + sy * cp
    const lookY = camera.position.y + sp
    const lookZ = camera.position.z + cy * cp
    camera.lookAt(lookX, lookY, lookZ)

    const speed = Math.max(0.4, useNavmapStore.getState().modelRadius * 0.7) * dt
    FWD.set(sy, 0, cy).normalize()
    RIGHT.copy(FWD).cross(UP).normalize()

    if (k.has('w')) camera.position.addScaledVector(FWD, speed)
    if (k.has('s')) camera.position.addScaledVector(FWD, -speed)
    if (k.has('a')) camera.position.addScaledVector(RIGHT, -speed)
    if (k.has('d')) camera.position.addScaledVector(RIGHT, speed)
    if (k.has('q')) camera.position.y -= speed
    if (k.has('e')) camera.position.y += speed
  })

  return null
}
