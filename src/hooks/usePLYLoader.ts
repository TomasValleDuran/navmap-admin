import { useCallback } from 'react'
import { buildModelFromBuffer, readFileAsArrayBuffer } from '../lib/loadPLYFile'
import { useNavmapStore } from '../store/useNavmapStore'

export function usePLYLoader() {
  const setLoading = useNavmapStore((s) => s.setLoading)
  const setStatus = useNavmapStore((s) => s.setStatus)
  const setPointCloud = useNavmapStore((s) => s.setPointCloud)
  const setTransform = useNavmapStore((s) => s.setTransform)
  const setModelLoaded = useNavmapStore((s) => s.setModelLoaded)
  const setFloorHeightViewer = useNavmapStore((s) => s.setFloorHeightViewer)

  return useCallback(
    async (file: File) => {
      setLoading(true)
      setStatus(`Cargando ${file.name}...`)
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
        setTransform({
          cx: m.cx,
          cy: m.cy,
          cz: m.cz,
          scale: m.scale,
          alignQ: m.alignQ,
        })
        setFloorHeightViewer(m.floorHeightViewer)
        setPointCloud({
          geometry: m.geometry,
          hasColor: m.hasColor,
          pointSize: m.pointSize,
          modelRadius: m.modelRadius,
        })
        setModelLoaded(true)
        setStatus(`${file.name} cargado: ${m.count.toLocaleString()} puntos.`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setStatus(`Error cargando PLY: ${msg}`)
        alert('Error cargando PLY: ' + msg)
      } finally {
        setLoading(false)
      }
    },
    [setLoading, setStatus, setPointCloud, setTransform, setModelLoaded, setFloorHeightViewer],
  )
}
