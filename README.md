# NavMap Admin

A browser-based 3D annotation tool for COLMAP point clouds. Load a `.ply` reconstruction **per floor** of a building, mark points of interest and waypoints on each floor, connect them with edges to form a navigation graph, link floors with stair/elevator connections, calibrate each floor against a real-world measurement, and export the whole building to a single JSON (`navmap_building.json`, v3.0) for a downstream viewer.

Multi-floor model: each floor is its own independently-calibrated COLMAP cloud (one video per floor — a single video that climbs stairs loses tracking). Floors are joined logically by **connections** (stairs/elevator/ramp/escalator) that carry physical facts (`kind`, `accessible`, `rise_m`, `steps`); the downstream router turns those into a traversal cost via tunable **routing profiles** (a `default` profile and an `accessible` one that excludes stairs). See `../FORMAT.md`.

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

0. **Set up floors** — in the *Pisos* panel (left sidebar) add one floor per building level (`+ Piso`), name them, and set each floor's `level` and `elevation_m` (right panel). The active floor is what every other panel edits. Switch floors by clicking them; the green dot shows which floors have a cloud loaded.
1. **Load a point cloud per floor** — select a floor, click *Cargar .PLY* (header) or the upload icon on the floor row, and pick that floor's COLMAP `.ply`. The model is recentered, scaled, floor-aligned, and cleaned of isolated outlier points automatically (the status bar reports how many were filtered). Each floor keeps its own cloud, transform and calibration.
2. **Fix the orientation** — if the model looks mirrored vs. reality, toggle the *Espejar X/Y/Z* buttons in the left sidebar. COLMAP reconstructions usually need Y mirrored (default).
3. **Tweak the floor** — in the right *Piso* panel, slide the floor height, nudge the tilt by ±5° on X/Z, or hit *Re-alinear piso al modelo* to recompute it from the point cloud.
4. **Calibrate scale** — pick *Medir* mode (`6`). A live preview marker shows exactly where the click will land on the cloud (picking is robust against floating noise points). Click two points whose real-world distance you know, type the meters, and hit *+ Muestra*. Add several measurements — preferably long ones — and the factor is fitted across all of them by least squares; each sample shows its residual vs. the fit so a bad one (>3% off, shown in red) can be deleted. Without calibration, exports won't include metric values.
5. **Place AR anchors** — *Ancla AR* mode (`7`): click 2–3 physical features that are easy to identify on site (door corners, signs, a QR you'll stick on a wall). The AR viewer matches these against the real world to solve the full map-to-world alignment.
6. **Place nodes** — switch to *POI* (`2`) or *Waypoint* (`3`) and click on the floor. A modal opens to set the name/type/description. Use *Marcar en piso* in the right panel to force placement on the floor plane (ignoring the cloud).
7. **Connect nodes** — *Conectar* mode (`4`), then click two nodes to add an edge between them (within a floor).
8. **Connect floors** — *Conectar pisos* mode (`8`): click a stair/elevator node on one floor, switch to another floor in the *Pisos* panel, click the matching node, then set the connection's `kind` (stairs/elevator/ramp/escalator), whether it's `accessible`, the `rise_m`, and optional `steps`/`length_m`. Up/down cones mark connection endpoints on the active floor (green = accessible, orange = stairs).
9. **Preview routes** — in the right *Vista previa de ruta* panel pick a start and end node and a profile (*Normal* / *Accesible*) to sanity-check what the router will do: the *Accesible* profile excludes stairs, so it should switch to the elevator.
10. **Inspect / edit** — *Seleccionar* mode (`5`) to click a node and see its info; double-click in the list to edit.
11. **Validate** — hit *Validar* in the left sidebar: it flags orphan nodes, disconnected components, missing calibration/anchors, edges that cross walls, floors with no connection, and floors that aren't reachable step-free under the accessible profile. Export also runs this check.
12. **Export** — *Exportar JSON* in the header writes `navmap_building.json` (v3.0): every floor with its own transform/anchors/nodes/edges and metric/AR coordinates, plus the cross-floor `connections` and the `routing_profiles`.
13. **Re-import** — *Importar JSON* restores all floors, connections and routing profiles. Old single-floor v1/v2.0 files are migrated to one floor 0. Point clouds aren't stored in JSON — reload each floor's `.PLY` after importing.

## Modes (left sidebar)

| Key | Mode | What a click does |
| --- | ----------- | ----------------- |
| `1` | Ver         | Camera only, no editing |
| `2` | POI         | Place a POI on the floor; opens the POI modal |
| `3` | Waypoint    | Place a waypoint on the floor; opens the waypoint modal |
| `4` | Conectar    | Click two nodes to connect them with an edge |
| `5` | Seleccionar | Click a node to inspect it in the right panel |
| `6` | Medir       | Click two points on the model to measure / calibrate |
| `7` | Ancla AR    | Click a physical feature to add an AR alignment anchor |
| `8` | Conectar pisos | Click a node, switch floor in the *Pisos* panel, click another node to link them (stairs/elevator) |

## Keyboard shortcuts

Global (ignored while typing in an input):

| Key | Action |
| --- | ------ |
| `1`–`7` | Switch mode (see table above) |
| `P` | Toggle camera mode (Órbita ↔ Caminar) |
| `T` | Toggle top-down orthographic plan view (Planta) |
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

**Plan view (`T`):**
- Top-down orthographic projection, handy for measuring hallways and placing waypoints in straight lines
- Left/right-drag — pan
- Scroll — zoom

**Placement (all modes):**
- A click that drags more than ~5 pixels is treated as a camera move, not a placement, so you can orbit without accidentally dropping nodes.

## Layout

The left and right panels are resizable (drag the edge) and collapsible (the chevron at the top). The layout is persisted in `localStorage` under `navmap.panelLayout`.

## Export format (v3.0)

The full contract lives in `../FORMAT.md`. In short, a building is an array of floors plus the
cross-floor connections and routing profiles:

```jsonc
{
  "version": "3.0",
  "coordinate_space": "colmap_original",
  "building": { "name": "..." },
  "routing_profiles": {
    "default":    { "floor_change_penalty_m": 5, "stairs_penalty_m": 15, "elevator_penalty_m": 25, "ramp_penalty_m": 8, "escalator_penalty_m": 12 },
    "accessible": { "floor_change_penalty_m": 5, "stairs_penalty_m": "excluded", "elevator_penalty_m": 10, "ramp_penalty_m": 6, "escalator_penalty_m": "excluded" }
  },
  "floors": [
    {
      "id": "floor_0", "level": 0, "name": "Planta baja", "elevation_m": 0,
      "transform_info": {
        "center_offset": { "cx": ..., "cy": ..., "cz": ..., "scale": ..., "alignQ": [x,y,z,w] },
        "floor_height_viewer": ..., "meters_per_viewer_unit": ..., "meters_per_colmap_unit": ...,
        "calibrated": true, "mirror_x": false, "mirror_y": true, "mirror_z": false,
        "calibration_samples": [ { "id": "cal_...", "a": {x,y,z}, "b": {x,y,z}, "real_m": 7.4 } ]
      },
      "anchors": [ { "id": "anchor_...", "label": ..., "floor": 0, "position": {...}, "position_m": {...}, "position_ar": {...} } ],
      "nodes":   [ { "id": "poi_...", "node_type": "poi", "name": ..., "poi_type": ..., "position": {...}, "position_ar": {...} } ],
      "edges":   [ { "id": ..., "from": ..., "to": ..., "weight_3d": ..., "weight_2d": ..., "length_3d_m": ..., "length_2d_m": ... } ]
    }
  ],
  "connections": [
    { "id": "conn_...", "kind": "stairs", "accessible": false,
      "from": "wp_f0_stair", "to": "wp_f1_stair", "floor_from": 0, "floor_to": 1,
      "rise_m": 3.1, "steps": 18, "length_m": null }
  ]
}
```

Each `floors[]` entry is the former single-floor document, so all the coordinate rules are
per-floor: `position` is raw COLMAP, `position_m` is meters, `position_world_m` adds the mirror
flags, and `position_ar` is AR-ready metres in that floor's frame. The router computes a path
over every floor's edges plus the `connections`, where `connection_cost = profile[kind]_penalty_m
+ floor_change_penalty_m + (length_m ?? 0)` and `"excluded"` drops the connection (e.g. stairs in
the accessible profile).

`anchors` are physical reference points marked in the cloud. In the AR viewer, after the user identifies 2–3 of them on site (e.g. by scanning a QR placed at each one), solve the rigid/similarity transform between the anchor positions here and their detected ARCore poses (Umeyama/Kabsch) to align the whole map — more robust than relying on mirror flags and a manual origin.

`calibration_samples` are the raw measurements behind `meters_per_viewer_unit` (fitted by least squares over all samples), kept for traceability and recalibration without re-measuring.

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
