import { useEffect } from 'react'
import { useNavmapStore } from '../store/useNavmapStore'
import { MODE_KEYS, MODE_LABELS } from '../ui/modes'
import { keyGoesToField } from '../lib/keyboard'

export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (keyGoesToField(e.target, e.key)) return
      const m = MODE_KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key]
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
        } else if (s.connectStart) {
          s.setConnectStart(null)
          s.selectNode(null)
          s.setStatus('Conexión entre pisos cancelada.')
        } else if (s.editingNode) {
          s.cancelEdit()
        } else if (s.wallStart) {
          s.cancelWall()
          s.setStatus('Pared cancelada.')
        } else if (s.sightPoint) {
          s.setSightPoint(null)
          s.setStatus('Simulación de visibilidad limpiada.')
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
