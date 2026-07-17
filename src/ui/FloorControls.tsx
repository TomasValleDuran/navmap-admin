import { ArrowDownToLine, RefreshCw, RotateCcw, RotateCw } from 'lucide-react'
import { useNavmapStore } from '../store/useNavmapStore'
import { nudgeFloorTilt, realignFloorInPlace } from '../lib/realignFloor'
import { colmapToViewer, viewerToColmap } from '../lib/coordTransforms'
import { SliderWithNumber } from './components/SliderWithNumber'

export function FloorControls() {
  const modelLoaded = useNavmapStore((s) => s.modelLoaded)
  const floorLock = useNavmapStore((s) => s.floorLock)
  const floorHeightViewer = useNavmapStore((s) => s.floorHeightViewer)
  const modelRadius = useNavmapStore((s) => s.modelRadius)
  const setFloorLock = useNavmapStore((s) => s.setFloorLock)
  const setFloorHeightViewer = useNavmapStore((s) => s.setFloorHeightViewer)
  const floors = useNavmapStore((s) => s.floors)
  const activeFloorId = useNavmapStore((s) => s.activeFloorId)
  const setFloorMeta = useNavmapStore((s) => s.setFloorMeta)
  const active = floors.find((f) => f.id === activeFloorId)

  const span = Math.max(modelRadius, 2)

  const reAlign = () => {
    const s = useNavmapStore.getState()
    if (!s.pointCloudGeometry) return
    const info = realignFloorInPlace(s.pointCloudGeometry, s.transform)
    s.setTransform({ alignQ: info.alignQ })
    s.setFloorHeightViewer(info.floorHeightViewer)
    s.setStatus('Piso re-alineado al modelo.')
  }

  const tilt = (axis: 'x' | 'z', deg: number) => {
    const s = useNavmapStore.getState()
    if (!s.pointCloudGeometry) return
    const info = nudgeFloorTilt(s.pointCloudGeometry, s.transform, axis, deg)
    s.setTransform({ alignQ: info.alignQ })
    s.setFloorHeightViewer(info.floorHeightViewer)
    s.setStatus(`Inclinación: ${axis.toUpperCase()} ${deg > 0 ? '+' : ''}${deg}°.`)
  }

  const flattenNodes = () => {
    const s = useNavmapStore.getState()
    if (!s.pois.length && !s.waypoints.length) {
      s.setStatus('No hay nodos para nivelar.')
      return
    }
    const updatedPOIs = s.pois.map((p) => {
      const v = colmapToViewer(p.x, p.y, p.z, s.transform)
      const c = viewerToColmap(v.vx, s.floorHeightViewer, v.vz, s.transform)
      return { ...p, x: c.x, y: c.y, z: c.z }
    })
    const updatedWPs = s.waypoints.map((w) => {
      const v = colmapToViewer(w.x, w.y, w.z, s.transform)
      const c = viewerToColmap(v.vx, s.floorHeightViewer, v.vz, s.transform)
      return { ...w, x: c.x, y: c.y, z: c.z }
    })
    s.updateActiveFloor({ pois: updatedPOIs, waypoints: updatedWPs })
    s.setStatus('Nodos nivelados al plano del piso.')
  }

  return (
    <>
      {active && (
        <div className="space-y-2 rounded-lg border border-border bg-panel-2 p-3">
          <div className="text-xs font-medium uppercase tracking-wider text-muted">
            {active.name}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="font-mono text-[11px] text-muted">
              Nivel
              <input
                type="number"
                step={1}
                value={active.level}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10)
                  if (Number.isFinite(v)) setFloorMeta(active.id, { level: v })
                }}
                className="mt-0.5 w-full rounded-md border border-border bg-panel px-2 py-1 text-xs text-text outline-none focus:border-accent-blue/60"
              />
            </label>
            <label className="font-mono text-[11px] text-muted">
              Elevación (m)
              <input
                type="number"
                step={0.1}
                value={active.elevation_m}
                onChange={(e) => {
                  const v = parseFloat(e.target.value)
                  if (Number.isFinite(v)) setFloorMeta(active.id, { elevation_m: v })
                }}
                className="mt-0.5 w-full rounded-md border border-border bg-panel px-2 py-1 text-xs text-text outline-none focus:border-accent-blue/60"
              />
            </label>
          </div>
        </div>
      )}
      {modelLoaded && (
    <div className="space-y-3 rounded-lg border border-border bg-panel-2 p-3">
      <div className="text-xs font-medium uppercase tracking-wider text-muted">Alineación del piso</div>
      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          checked={floorLock}
          onChange={(e) => setFloorLock(e.target.checked)}
          className="accent-accent-green"
        />
        Marcar en piso (ignorar nube)
      </label>
      <SliderWithNumber
        label="Altura piso"
        value={floorHeightViewer}
        onChange={setFloorHeightViewer}
        min={-span}
        max={span}
        step={span / 200}
        precision={3}
      />
      <div className="space-y-2 border-t border-border pt-2">
        <div className="text-[10px] uppercase tracking-wider text-muted">Inclinación manual</div>
        <div className="grid grid-cols-2 gap-1.5">
          <TiltButton label="X -5°" Icon={RotateCcw} onClick={() => tilt('x', -5)} />
          <TiltButton label="X +5°" Icon={RotateCw} onClick={() => tilt('x', 5)} />
          <TiltButton label="Z -5°" Icon={RotateCcw} onClick={() => tilt('z', -5)} />
          <TiltButton label="Z +5°" Icon={RotateCw} onClick={() => tilt('z', 5)} />
        </div>
      </div>
      <div className="space-y-1.5 border-t border-border pt-2">
        <button
          type="button"
          onClick={reAlign}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-panel px-2 py-1.5 text-xs hover:border-accent-blue/40"
        >
          <RefreshCw size={13} />
          Re-alinear piso al modelo
        </button>
        <button
          type="button"
          onClick={flattenNodes}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-panel px-2 py-1.5 text-xs hover:border-accent-green/40"
        >
          <ArrowDownToLine size={13} />
          Nivelar nodos al piso
        </button>
      </div>
    </div>
      )}
    </>
  )
}

function TiltButton({ label, Icon, onClick }: { label: string; Icon: typeof RotateCw; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-1 rounded-md border border-border bg-panel px-2 py-1.5 text-[11px] hover:border-accent-blue/40"
    >
      <Icon size={12} />
      {label}
    </button>
  )
}
