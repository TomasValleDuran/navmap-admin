import { Canvas } from '@react-three/fiber'
import { PointCloud } from './PointCloud'
import { FloorPlane } from './FloorPlane'
import { MarkersLayer } from './MarkersLayer'
import { PlacementController } from './PlacementController'
import { HoverTracker } from './HoverTracker'
import { CameraRig } from './CameraRig'
import { MeasureLayer } from './MeasureLayer'

export function Scene() {
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
      <PointCloud />
      <FloorPlane />
      <MarkersLayer />
      <MeasureLayer />
      <PlacementController />
      <HoverTracker />
      <CameraRig />
    </Canvas>
  )
}
