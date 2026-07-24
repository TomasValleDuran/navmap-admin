import { Canvas } from '@react-three/fiber'
import { PointCloud } from './PointCloud'
import { FloorPlane } from './FloorPlane'
import { MarkersLayer } from './MarkersLayer'
import { PlacementController } from './PlacementController'
import { HoverTracker } from './HoverTracker'
import { CloudGizmo } from './CloudGizmo'
import { CameraRig } from './CameraRig'
import { MeasureLayer } from './MeasureLayer'
import { useNavmapStore } from '../store/useNavmapStore'

export function Scene() {
  const mirrorX = useNavmapStore((s) => s.mirrorX)
  const mirrorY = useNavmapStore((s) => s.mirrorY)
  const mirrorZ = useNavmapStore((s) => s.mirrorZ)
  const sx = mirrorX ? -1 : 1
  const sy = mirrorY ? -1 : 1
  const sz = mirrorZ ? -1 : 1
  return (
    <Canvas
      gl={{ antialias: true }}
      dpr={[1, 2]}
      camera={{ fov: 58, near: 0.0005, far: 2000, position: [0, 3, 8] }}
      onCreated={({ gl, raycaster }) => {
        gl.setClearColor(0x0c0f14, 1)
        raycaster.params.Points = { threshold: 0.08 }
      }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={0.7} />
      <gridHelper args={[30, 60, 0x1a2030, 0x1a2030]} />
      <group name="scene-mirror" scale={[sx, sy, sz]}>
        <PointCloud />
        <FloorPlane />
        <MarkersLayer />
        <MeasureLayer />
      </group>
      <PlacementController />
      <HoverTracker />
      <CloudGizmo />
      <CameraRig />
    </Canvas>
  )
}
