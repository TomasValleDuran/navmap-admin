import { useCallback } from 'react'
import { buildModelFromBuffer, readFileAsArrayBuffer } from '../lib/loadPLYFile'
import { useNavmapStore } from '../store/useNavmapStore'

/**
 * Loads an extra PLY onto the active floor as a secondary alignment cloud. Unlike the primary
 * loader (`usePLYLoader`) this never touches the floor's `transform` — the cloud is normalized and
 * recentered by `buildModelFromBuffer`, then placed with its own gizmo transform. See TASK2_PLAN.md.
 */
export function useSecondaryCloudLoader() {
  const setLoading = useNavmapStore((s) => s.setLoading)
  const setStatus = useNavmapStore((s) => s.setStatus)
  const addSecondaryCloud = useNavmapStore((s) => s.addSecondaryCloud)

  return useCallback(
    async (file: File) => {
      if (!useNavmapStore.getState().modelLoaded) {
        setStatus('Cargá primero la nube principal del piso.')
        return
      }
      setLoading(true)
      setStatus(`Cargando nube secundaria ${file.name}...`)
      try {
        const buffer = await readFileAsArrayBuffer(file)
        const m = await new Promise<ReturnType<typeof buildModelFromBuffer>>((resolve, reject) => {
          setTimeout(() => {
            try {
              resolve(buildModelFromBuffer(buffer))
            } catch (e) {
              reject(e)
            }
          }, 50)
        })
        addSecondaryCloud({
          name: file.name,
          geometry: m.geometry,
          hasColor: m.hasColor,
          pointSize: m.pointSize,
          modelRadius: m.modelRadius,
        })
        setStatus(`Nube secundaria ${file.name} agregada: ${m.count.toLocaleString()} puntos. Alineala con el gizmo.`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setStatus(`Error cargando nube secundaria: ${msg}`)
        alert('Error cargando nube secundaria: ' + msg)
      } finally {
        setLoading(false)
      }
    },
    [setLoading, setStatus, addSecondaryCloud],
  )
}
