# NavMap Admin

A browser-based 3D annotation tool for COLMAP point clouds. Load a `.ply` reconstruction of a building, mark points of interest and waypoints on the floor, connect them with edges to form a navigation graph, calibrate the scene against a real-world measurement, and export everything to JSON for a downstream viewer.

Built with React 19, Vite, Three.js (via `@react-three/fiber` + `drei`), Zustand, and Tailwind.

## Getting it running

Requirements: Node 20+ (any recent LTS works) and npm.

```bash
npm install
npm run dev      # start Vite dev server (default: http://localhost:5173)
npm run build    # type-check + production build into dist/
npm run preview  # serve the production build locally
npm run lint     # eslint
```

## Typical workflow

1. **Load a point cloud** — click *Cargar .PLY* in the header and pick a COLMAP `.ply` file. The model is recentered, scaled, and floor-aligned automatically.
2. **Fix the orientation** — if the model looks mirrored vs. reality, toggle the *Espejar X/Y/Z* buttons in the left sidebar. COLMAP reconstructions usually need Y mirrored (default).
3. **Tweak the floor** — in the right *Piso* panel, slide the floor height, nudge the tilt by ±5° on X/Z, or hit *Re-alinear piso al modelo* to recompute it from the point cloud.
4. **Calibrate scale** — pick *Medir* mode (`6`), click two points on the model whose real-world distance you know, type the distance in meters, and hit *Calibrar*. Without this step, exports won't include metric values.
5. **Place nodes** — switch to *POI* (`2`) or *Waypoint* (`3`) and click on the floor. A modal opens to set the name/type/description. Use *Marcar en piso* in the right panel to force placement on the floor plane (ignoring the cloud).
6. **Connect nodes** — *Conectar* mode (`4`), then click two nodes to add an edge between them.
7. **Inspect / edit** — *Seleccionar* mode (`5`) to click a node and see its info; double-click in the list to edit.
8. **Export** — *Exportar JSON* in the header. The file (`navmap_annotations.json`) contains the COLMAP-space positions, the transform parameters, and — if calibrated — `position_m` and `position_world_m` fields in meters.
9. **Re-import** — *Importar JSON* restores nodes, edges, transform, calibration, and mirror flags. Both v1 and v2.0 formats are accepted.

## Modes (left sidebar)

| Key | Mode | What a click does |
| --- | ----------- | ----------------- |
| `1` | Ver         | Camera only, no editing |
| `2` | POI         | Place a POI on the floor; opens the POI modal |
| `3` | Waypoint    | Place a waypoint on the floor; opens the waypoint modal |
| `4` | Conectar    | Click two nodes to connect them with an edge |
| `5` | Seleccionar | Click a node to inspect it in the right panel |
| `6` | Medir       | Click two points on the model to measure / calibrate |

## Keyboard shortcuts

Global (ignored while typing in an input):

| Key | Action |
| --- | ------ |
| `1`–`6` | Switch mode (see table above) |
| `P` | Toggle camera mode (Órbita ↔ Caminar) |
| `F` | Recenter camera on the model |
| `Esc` | Cancel current action: pending edge, open edit modal, pending placement, or measurement |

Walk camera (`P` to enable):

| Key | Action |
| --- | ------ |
| `W` / `S` | Move forward / backward |
| `A` / `D` | Strafe left / right |
| `Q` / `E` | Move down / up |
| `↑` / `↓` | Look up / down |
| `←` / `→` | Look left / right |

## Mouse

**Orbit camera (default):**
- Left-drag — rotate
- Right-drag — pan
- Middle-drag / scroll — dolly / zoom

**Walk camera:**
- Left-drag — look around
- Scroll — move along view direction

**Placement (all modes):**
- A click that drags more than ~5 pixels is treated as a camera move, not a placement, so you can orbit without accidentally dropping nodes.

## Layout

The left and right panels are resizable (drag the edge) and collapsible (the chevron at the top). The layout is persisted in `localStorage` under `navmap.panelLayout`.

## Export format (v2.0)

```jsonc
{
  "version": "2.0",
  "coordinate_space": "colmap_original",
  "transform_info": {
    "center_offset": { "cx": ..., "cy": ..., "cz": ..., "scale": ..., "alignQ": [x,y,z,w] },
    "floor_height_viewer": ...,
    "meters_per_viewer_unit": ...,
    "meters_per_colmap_unit": ...,
    "calibrated": true,
    "mirror_x": false, "mirror_y": true, "mirror_z": false
  },
  "nodes": [
    { "id": "poi_...", "node_type": "poi", "name": ..., "poi_type": ..., "position": {...}, "position_m": {...}, "position_world_m": {...} },
    { "id": "wp_...",  "node_type": "waypoint", "label": ..., "position": {...}, ... }
  ],
  "edges": [
    { "id": ..., "from": ..., "to": ..., "weight_3d": ..., "weight_2d": ..., "length_3d_m": ..., "length_2d_m": ... }
  ]
}
```

`position` is always in raw COLMAP space. `position_m` is the same point scaled to meters. `position_world_m` additionally applies the mirror flags, so it matches the real-world axis convention the viewer should use.

## Project layout

```
src/
  three/      r3f scene, camera rigs, placement and measurement layers
  ui/         React panels, modals, header, status bar
  hooks/      PLY loader, keyboard shortcuts
  lib/        PLY parsing, model prep, coordinate transforms, JSON I/O, floor alignment
  store/      Zustand store (single source of truth)
  types/      shared types
```
