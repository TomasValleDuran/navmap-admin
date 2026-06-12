import { useEffect } from 'react'
import { useNavmapStore } from '../store/useNavmapStore'
import { MODE_LABELS } from '../ui/ModePicker'
import type { Mode } from '../types/navmap'

const MODE_KEYS: Record<string, Mode> = {
  '1': 'view',
  '2': 'poi',
  '3': 'waypoint',
  '4': 'edge',
  '5': 'select',
  '6': 'measure',
  '7': 'anchor',
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return
      const m = MODE_KEYS[e.key]
      if (m) {
        const { setMode, setStatus } = useNavmapStore.getState()
        setMode(m)
        setStatus(MODE_LABELS[m].hint)
        return
      }
      if (e.key === 'p' || e.key === 'P') {
        const { cameraMode, setCameraMode, setStatus } = useNavmapStore.getState()
        const next = cameraMode === 'orbit' ? 'walk' : 'orbit'
        setCameraMode(next)
        setStatus(next === 'orbit' ? 'Modo cámara: Órbita.' : 'Modo cámara: Caminar.')
        return
      }
      if (e.key === 't' || e.key === 'T') {
        const { cameraMode, setCameraMode, setStatus } = useNavmapStore.getState()
        const next = cameraMode === 'plan' ? 'orbit' : 'plan'
        setCameraMode(next)
        setStatus(next === 'plan' ? 'Vista en planta (T para volver).' : 'Modo cámara: Órbita.')
        return
      }
      if (e.key === 'f' || e.key === 'F') {
        useNavmapStore.getState().requestFocus()
        return
      }
      if (e.key === 'Escape') {
        const s = useNavmapStore.getState()
        if (s.edgeStart) {
          s.setEdgeStart(null)
          s.setStatus('Conexión cancelada.')
        } else if (s.editingNode) {
          s.cancelEdit()
        } else if (s.pendingPoint) {
          s.setPendingPoint(null)
        } else if (s.measurePoints.length > 0) {
          s.clearMeasure()
          s.setStatus('Medición reiniciada.')
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
