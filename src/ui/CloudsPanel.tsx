import { useRef } from 'react'
import { Eye, EyeOff, Move3d, Plus, Rotate3d, Scaling, Trash2 } from 'lucide-react'
import * as THREE from 'three'
import { useNavmapStore } from '../store/useNavmapStore'
import { useSecondaryCloudLoader } from '../hooks/useSecondaryCloudLoader'
import type { GizmoMode, SecondaryCloud } from '../types/navmap'

/**
 * Panel to load and align extra point clouds on the active floor (Task 2). The gizmo (translate /
 * rotate / uniform-scale) and these numeric inputs both drive the same store transform; the numeric
 * inputs are the mirror-immune fallback if the gizmo handles read inverted under scene-mirror.
 */
export function CloudsPanel() {
  const modelLoaded = useNavmapStore((s) => s.modelLoaded)
  const clouds = useNavmapStore((s) => s.secondaryClouds)
  const loadSecondary = useSecondaryCloudLoader()
  const fileRef = useRef<HTMLInputElement>(null)

  if (!modelLoaded) return null

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) loadSecondary(file)
    e.target.value = '' // allow re-picking the same file
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-panel-2 p-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wider text-muted">Nubes del piso</div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1 rounded-md border border-border bg-panel px-2 py-1 text-[11px] hover:border-accent-blue/40"
        >
          <Plus size={12} />
          Agregar nube
        </button>
        <input ref={fileRef} type="file" accept=".ply" className="hidden" onChange={onPick} />
      </div>

      {/* Primary cloud row — locked; it owns the floor's calibration/transform. */}
      <div className="flex items-center gap-2 rounded-md border border-border bg-panel px-2 py-1.5 text-xs text-text">
        <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-[#aabbcc]" />
        <span className="truncate">Nube principal</span>
        <span className="ml-auto text-[10px] uppercase tracking-wider text-muted">fija</span>
      </div>

      {clouds.length === 0 && (
        <div className="px-1 text-[11px] leading-snug text-muted">
          Agregá una segunda nube (p. ej. otra partición COLMAP del mismo piso) y alineala con el
          gizmo para guiar la colocación de POIs.
        </div>
      )}

      {clouds.map((c) => (
        <SecondaryRow key={c.id} cloud={c} />
      ))}
    </div>
  )
}

const _euler = new THREE.Euler()
const _quat = new THREE.Quaternion()

/** Yaw (deg, around Y) extracted from the cloud's quaternion for the numeric field. */
function yawDeg(q: [number, number, number, number]): number {
  _quat.set(q[0], q[1], q[2], q[3])
  _euler.setFromQuaternion(_quat, 'YXZ')
  return THREE.MathUtils.radToDeg(_euler.y)
}

function SecondaryRow({ cloud }: { cloud: SecondaryCloud }) {
  const selectedCloudId = useNavmapStore((s) => s.selectedCloudId)
  const gizmoMode = useNavmapStore((s) => s.gizmoMode)
  const select = useNavmapStore((s) => s.selectSecondaryCloud)
  const setGizmoMode = useNavmapStore((s) => s.setGizmoMode)
  const toggleVisible = useNavmapStore((s) => s.toggleSecondaryVisible)
  const remove = useNavmapStore((s) => s.removeSecondaryCloud)
  const updateTransform = useNavmapStore((s) => s.updateSecondaryCloudTransform)

  const selected = selectedCloudId === cloud.id
  const { position, scale } = cloud.transform

  const setPos = (axis: 0 | 1 | 2, v: number) => {
    const p: [number, number, number] = [...position]
    p[axis] = v
    updateTransform(cloud.id, { position: p })
  }

  const setYaw = (deg: number) => {
    _quat.setFromEuler(_euler.set(0, THREE.MathUtils.degToRad(deg), 0, 'YXZ'))
    updateTransform(cloud.id, { quaternion: [_quat.x, _quat.y, _quat.z, _quat.w] })
  }

  return (
    <div
      className={`space-y-2 rounded-md border px-2 py-2 ${
        selected ? 'border-accent-blue/60 bg-panel' : 'border-border bg-panel'
      }`}
    >
      <div className="flex items-center gap-2 text-xs">
        <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: cloud.tint }} />
        <button
          type="button"
          onClick={() => select(selected ? null : cloud.id)}
          className="min-w-0 flex-1 truncate text-left text-text hover:text-accent-blue"
          title={selected ? 'Deseleccionar' : 'Seleccionar para alinear'}
        >
          {cloud.name}
        </button>
        <button
          type="button"
          onClick={() => toggleVisible(cloud.id)}
          className="rounded p-0.5 text-muted hover:text-text"
          title={cloud.visible ? 'Ocultar' : 'Mostrar'}
        >
          {cloud.visible ? <Eye size={13} /> : <EyeOff size={13} />}
        </button>
        <button
          type="button"
          onClick={() => remove(cloud.id)}
          className="rounded p-0.5 text-muted hover:text-accent-red"
          title="Eliminar nube"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {selected && (
        <>
          <div className="grid grid-cols-3 gap-1">
            <ModeButton mode="translate" active={gizmoMode} onClick={setGizmoMode} Icon={Move3d} label="Mover" />
            <ModeButton mode="rotate" active={gizmoMode} onClick={setGizmoMode} Icon={Rotate3d} label="Rotar" />
            <ModeButton mode="scale" active={gizmoMode} onClick={setGizmoMode} Icon={Scaling} label="Escala" />
          </div>
          <div className="grid grid-cols-3 gap-1">
            <NumField label="X" value={position[0]} step={0.05} onChange={(v) => setPos(0, v)} />
            <NumField label="Y" value={position[1]} step={0.05} onChange={(v) => setPos(1, v)} />
            <NumField label="Z" value={position[2]} step={0.05} onChange={(v) => setPos(2, v)} />
          </div>
          <div className="grid grid-cols-2 gap-1">
            <NumField
              label="Escala"
              value={scale}
              step={0.01}
              min={0.05}
              onChange={(v) => updateTransform(cloud.id, { scale: Math.max(0.05, v) })}
            />
            <NumField label="Rot Y°" value={yawDeg(cloud.transform.quaternion)} step={1} onChange={setYaw} />
          </div>
        </>
      )}
    </div>
  )
}

function ModeButton({
  mode,
  active,
  onClick,
  Icon,
  label,
}: {
  mode: GizmoMode
  active: GizmoMode
  onClick: (m: GizmoMode) => void
  Icon: typeof Move3d
  label: string
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(mode)}
      className={`flex items-center justify-center gap-1 rounded-md border px-1.5 py-1 text-[10px] ${
        active === mode
          ? 'border-accent-blue/60 bg-accent-blue/15 text-text'
          : 'border-border bg-panel-2 text-muted hover:border-accent-blue/40'
      }`}
    >
      <Icon size={12} />
      {label}
    </button>
  )
}

function NumField({
  label,
  value,
  onChange,
  step,
  min,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  step: number
  min?: number
}) {
  return (
    <label className="font-mono text-[10px] text-muted">
      {label}
      <input
        type="number"
        step={step}
        min={min}
        value={Number.isFinite(value) ? Number(value.toFixed(3)) : 0}
        onChange={(e) => {
          const v = parseFloat(e.target.value)
          if (Number.isFinite(v)) onChange(v)
        }}
        className="mt-0.5 w-full rounded-md border border-border bg-panel px-1.5 py-1 text-[11px] text-text outline-none focus:border-accent-blue/60"
      />
    </label>
  )
}
