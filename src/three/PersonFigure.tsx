import { useEffect, useMemo } from 'react'
import { BoxGeometry } from 'three'
import { Billboard, Text } from '@react-three/drei'
import { useNavmapStore } from '../store/useNavmapStore'
import { colmapToViewer } from '../lib/coordTransforms'
import type { PersonMarker } from '../types/navmap'

const PERSON_COLOR = '#38bdf8'
const PERSON_HEIGHT_M = 1.8
const PERSON_WIDTH_M = 0.4

/**
 * Figura humana parada en una coordenada COLMAP escrita a mano.
 *
 * Dibuja tres cosas, porque las tres responden preguntas distintas:
 *   - el bloque de 1.8 x 0.4 m parado EN EL PISO, para leer la escala de un vistazo;
 *   - un punto en la coordenada exacta que se escribio, que casi nunca esta en el piso
 *     (una pose del servidor es la posicion de la CAMARA, ~1.3 m mas arriba);
 *   - una linea entre los dos, para que se vea de donde a donde va esa diferencia.
 *
 * La altura sale de `metersPerViewerUnit`, o sea que necesita la escala calibrada
 * (Medir, tecla 6). Sin calibrar no hay forma de saber cuanto mide un metro en la nube:
 * en ese caso la figura se dibuja con un tamaño relativo al modelo y el panel lo avisa.
 */
export function PersonFigure({ person }: { person: PersonMarker }) {
  const transform = useNavmapStore((s) => s.transform)
  const floorHeightViewer = useNavmapStore((s) => s.floorHeightViewer)
  const metersPerViewerUnit = useNavmapStore((s) => s.metersPerViewerUnit)
  const mirrorY = useNavmapStore((s) => s.mirrorY)
  const modelRadius = useNavmapStore((s) => s.modelRadius)

  const { vx, vy, vz } = useMemo(
    () => colmapToViewer(person.x, person.y, person.z, transform),
    [person.x, person.y, person.z, transform],
  )

  // Dentro de <group name="scene-mirror"> el eje Y esta escalado por -1 cuando mirrorY
  // esta activo, asi que "hacia arriba" en estas coordenadas es -1 en ese caso.
  const up = mirrorY ? -1 : 1

  const calibrated = metersPerViewerUnit != null && isFinite(metersPerViewerUnit) && metersPerViewerUnit > 0
  const toViewerUnits = (meters: number) =>
    calibrated ? meters / (metersPerViewerUnit as number) : (meters / PERSON_HEIGHT_M) * Math.max(1, modelRadius) * 0.25

  const h = toViewerUnits(PERSON_HEIGHT_M)
  const w = toViewerUnits(PERSON_WIDTH_M)

  const feetY = floorHeightViewer
  const centerY = feetY + up * (h / 2)
  const headY = feetY + up * h

  // `edgesGeometry` recibe una instancia concreta: memoizarla y liberarla a mano, porque
  // una nueva por render deja geometrias colgadas en la GPU.
  const boxGeo = useMemo(() => new BoxGeometry(w, h, w), [w, h])
  useEffect(() => () => boxGeo.dispose(), [boxGeo])

  // Tramo entre el piso y la coordenada escrita (0 si la coordenada ya esta en el piso).
  const dropLen = Math.abs(vy - feetY)
  const dropMidY = (vy + feetY) / 2

  return (
    <group>
      {/* el cuerpo, parado en el piso */}
      <mesh position={[vx, centerY, vz]}>
        <boxGeometry args={[w, h, w]} />
        <meshStandardMaterial
          color={PERSON_COLOR}
          transparent
          opacity={0.42}
          roughness={0.5}
          depthWrite={false}
        />
      </mesh>
      {/* aristas, para que se lea el volumen contra la nube de puntos */}
      <lineSegments position={[vx, centerY, vz]}>
        <edgesGeometry args={[boxGeo]} />
        <lineBasicMaterial color={PERSON_COLOR} transparent opacity={0.9} />
      </lineSegments>

      {/* la coordenada exacta que se escribio */}
      <mesh position={[vx, vy, vz]} renderOrder={999}>
        <sphereGeometry args={[Math.max(w * 0.16, 1e-4), 16, 12]} />
        <meshBasicMaterial color="#fbbf24" depthTest={false} depthWrite={false} />
      </mesh>

      {/* de la coordenada al piso */}
      {dropLen > 1e-6 && (
        <mesh position={[vx, dropMidY, vz]} renderOrder={998}>
          <cylinderGeometry args={[Math.max(w * 0.03, 1e-5), Math.max(w * 0.03, 1e-5), dropLen, 8]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.75} depthTest={false} />
        </mesh>
      )}

      <Billboard position={[vx, headY + up * w * 0.6, vz]}>
        <Text
          fontSize={Math.max(w * 0.5, 1e-3)}
          color={PERSON_COLOR}
          anchorX="center"
          anchorY="middle"
          outlineWidth={Math.max(w * 0.04, 1e-4)}
          outlineColor="#0c0f14"
        >
          {person.label}
        </Text>
      </Billboard>
    </group>
  )
}
