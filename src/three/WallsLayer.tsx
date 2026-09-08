import { useMemo } from 'react'
import * as THREE from 'three'
import { colmapToViewer } from '../lib/coordTransforms'
import { useNavmapStore } from '../store/useNavmapStore'
import type { WallSegment } from '../types/navmap'

const WALL_COLOR = 0xe05555
const RAILING_COLOR = 0x40d4c4
const PENDING_COLOR = 0xfacc15
/** La pared elegida en la lista: se prende para poder decir cuál es cuál. */
const HIGHLIGHT_COLOR = 0xfacc15

/** Alto con el que se dibuja una pared, en metros. Sólo visual: el dato es el segmento. */
const WALL_HEIGHT_M = 2.2
const RAILING_HEIGHT_M = 1.1

/**
 * Las paredes marcadas a mano, dibujadas como paños verticales sobre el piso.
 *
 * Se dibujan con altura sólo para que se lean como paredes al orbitar; el dato exportado es el
 * segmento en planta. Las barandas van más bajas y translúcidas — que se vea a través es
 * literalmente lo que las distingue de un muro para la app.
 */
export function WallsLayer() {
  const walls = useNavmapStore((s) => s.walls)
  const showWalls = useNavmapStore((s) => s.showWalls)
  const wallStart = useNavmapStore((s) => s.wallStart)
  const wallKind = useNavmapStore((s) => s.wallKind)
  const hover = useNavmapStore((s) => s.measureHover)
  const mode = useNavmapStore((s) => s.mode)
  const transform = useNavmapStore((s) => s.transform)
  const floorHeightViewer = useNavmapStore((s) => s.floorHeightViewer)
  const metersPerViewerUnit = useNavmapStore((s) => s.metersPerViewerUnit)
  const modelRadius = useNavmapStore((s) => s.modelRadius)
  const modelLoaded = useNavmapStore((s) => s.modelLoaded)
  const mirrorY = useNavmapStore((s) => s.mirrorY)
  const selectedWallId = useNavmapStore((s) => s.selectedWallId)
  const hoveredWallId = useNavmapStore((s) => s.hoveredWallId)

  // Dentro de <group name="scene-mirror"> el eje Y está escalado por -1 cuando mirrorY está
  // activo, así que "hacia arriba" en estas coordenadas es -1 en ese caso. Misma convención que
  // PersonFigure y Marker: sin esto la pared crece hacia abajo y queda enterrada bajo el piso.
  const up = mirrorY ? -1 : 1

  // Alto en unidades viewer. Sin calibrar no hay metros, así que se cae a una fracción del
  // modelo: el objetivo es que se vea, no que mida.
  const heightFor = (kind: WallSegment['kind']) => {
    const m = kind === 'railing' ? RAILING_HEIGHT_M : WALL_HEIGHT_M
    return metersPerViewerUnit ? m / metersPerViewerUnit : Math.max(1, modelRadius) * 0.08
  }

  const quads = useMemo(
    () =>
      walls.map((w) => {
        const a = colmapToViewer(w.ax, w.ay, w.az, transform)
        const b = colmapToViewer(w.bx, w.by, w.bz, transform)
        const len = Math.hypot(b.vx - a.vx, b.vz - a.vz)
        const h = heightFor(w.kind)
        return {
          id: w.id,
          kind: w.kind,
          len,
          h,
          center: [
            (a.vx + b.vx) / 2,
            floorHeightViewer + up * (h / 2),
            (a.vz + b.vz) / 2,
          ] as [number, number, number],
          // El paño se extiende A LO LARGO del segmento, así que su eje X local tiene que
          // apuntar de A a B. Rotando sobre Y por θ, el +X local va a parar a (cos θ, 0, −sen θ):
          // de ahí el atan2(−dz, dx). Con el rumbo a secas el plano queda perpendicular, cruzado
          // sobre la mediana del segmento en vez de apoyado sobre él.
          rotY: Math.atan2(-(b.vz - a.vz), b.vx - a.vx),
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [walls, transform, floorHeightViewer, metersPerViewerUnit, modelRadius, up],
  )

  const pendingGeom = useMemo(() => {
    if (mode !== 'wall' || !wallStart || !hover) return null
    const g = new THREE.BufferGeometry()
    g.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array([
          wallStart.vx, wallStart.vy, wallStart.vz,
          hover.vx, hover.vy, hover.vz,
        ]),
        3,
      ),
    )
    return g
  }, [mode, wallStart, hover])

  if (!modelLoaded || !showWalls) return null

  return (
    <group name="walls-group">
      {quads.map((q) => {
        const lit = q.id === selectedWallId || q.id === hoveredWallId
        return (
          <mesh
            key={q.id}
            position={q.center}
            rotation={[0, q.rotY, 0]}
            // La resaltada se dibuja después y sin depthTest, para que se vea aunque quede
            // detrás de otra pared o de la nube: es la que estás tratando de ubicar.
            renderOrder={lit ? 995 : 3}
            raycast={() => null}
          >
            <planeGeometry args={[q.len, q.h]} />
            <meshBasicMaterial
              color={lit ? HIGHLIGHT_COLOR : q.kind === 'railing' ? RAILING_COLOR : WALL_COLOR}
              transparent
              opacity={lit ? 0.75 : q.kind === 'railing' ? 0.28 : 0.5}
              side={THREE.DoubleSide}
              depthWrite={false}
              depthTest={!lit}
            />
          </mesh>
        )
      })}
      {wallStart && (
        <mesh position={[wallStart.vx, wallStart.vy, wallStart.vz]} renderOrder={999}>
          <sphereGeometry args={[Math.max(0.02, heightFor(wallKind) * 0.04), 12, 12]} />
          <meshBasicMaterial color={PENDING_COLOR} depthTest={false} />
        </mesh>
      )}
      {pendingGeom && (
        <lineSegments renderOrder={999}>
          <primitive object={pendingGeom} attach="geometry" />
          <lineBasicMaterial color={PENDING_COLOR} transparent opacity={0.95} depthTest={false} />
        </lineSegments>
      )}
    </group>
  )
}
