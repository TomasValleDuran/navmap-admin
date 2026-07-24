# Task 2 — Multiple point clouds per floor (manual align + gizmo)

## Goal
Let the editor load **more than one point cloud onto the same floor** and move each one
around all axes (Unity-style translate / rotate / **uniform-scale** gizmo), so a floor that
COLMAP split into two partitions (sequential reconstruction "lost itself" and started a fresh
sub-model) can be re-assembled **visually** to guide POI/waypoint placement.

The extra clouds are **visual scaffolding only** — POIs are authored in the editor's viewer
coordinate space, so the clouds never need rigorous registration.

## Why uniform scale matters (background)
Monocular SfM (COLMAP) is scale-ambiguous: each independent reconstruction fixes its own
arbitrary **global** gauge (3 translation + 3 rotation + **1 scale** = 7 DOF). Same phone / same
intrinsics does **not** make two partitions share a metric scale — each initialized from a
different image pair, so partition B is uniformly too big/small vs A by one constant. Within a
single cloud, proportions are correct; only the global factor differs between clouds. Therefore
the full mismatch between two clean partitions is exactly a **similarity transform**
(rotate + translate + one uniform scale) — a gizmo with those DOF can align them perfectly, and
you only ever need **one** scale number per secondary cloud (no per-region warping).

## Key architectural finding (makes placement free)
- Picking raycasts `model-group.children` **recursively** (`lib/pointPicking.ts`:
  `intersectObjects(modelGroup.children, true)`); three.js returns `intersection.point` in
  **world space** regardless of nested transforms.
- `three/HoverTracker.tsx` then un-mirrors that world point and runs `viewerToColmap` with the
  **floor's single `transform`**.

So a secondary cloud rendered as a nested `<group matrix=gizmo>` **inside `model-group`** yields
node coordinates in the same viewer frame as the primary cloud's nodes — **no special casing**.
The gizmo only has to put B's points where they visually belong; correctness follows.

**Consequences:**
- The floor's `transform` / calibration stays owned by the **primary** cloud; never touched.
- **Export is unchanged** — POIs bake into viewer coords at placement time, so
  `navmap_building.json` is structurally identical. Task 2 is fully decoupled from Task 1 (mobile)
  and needs **no `FORMAT.md` change**.

---

## Phase 1 — Core (multi-cloud + alignment + placement)

### 1. Data model — `src/types/navmap.ts`
Add `SecondaryCloud`:
```
{ id, name (source filename), geometry, hasColor, pointSize, modelRadius,
  transform: { position:[x,y,z], quaternion:[x,y,z,w], scale:number /* uniform */ },
  visible, tint }
```
Store shape: add a **parallel** `floorSecondaryClouds: Record<floorId, SecondaryCloud[]>`
(keeps existing `floorClouds` / `cloudMirror` code untouched — preferred over widening
`FloorCloud`). Runtime-only, like `floorClouds` (geometry never serialized).

### 2. Store — `src/store/useNavmapStore.ts`
- `addSecondaryCloud(floorId, cloud)` — push with an initial offset transform so it doesn't spawn
  exactly on top of the primary.
- `updateSecondaryCloudTransform(id, patch)` — write position/quaternion/scale; **enforce uniform
  scale** (see 4).
- `removeSecondaryCloud(id)`, `toggleSecondaryVisible(id)`, `selectSecondaryCloud(id|null)` plus
  `selectedCloudId` state.
- Mirror these in `setActiveFloor` (lines ~353–368), `deleteFloor` (~333–343), `importState`
  (~567–590), alongside existing `floorClouds` handling.

### 3. Load path — `src/hooks/usePLYLoader.ts` (+ UI entry)
- Existing loader (`buildModelFromBuffer` → `setTransform` + `setPointCloud` + `setModelLoaded`) is
  the **primary** path — leave it.
- Add an `addCloud` variant: same `buildModelFromBuffer(buffer)` (already recenters + normalizes
  each cloud via `prepareModelGeometry`), route result to `addSecondaryCloud`, and **do NOT** call
  `setTransform` (don't disturb the floor frame). Gate on "primary already loaded on this floor".

### 4. Rendering — `src/three/PointCloud.tsx` / new `src/three/SecondaryClouds.tsx`
- Render each secondary cloud as a nested `<group>` **inside `model-group`** carrying its
  transform (so picking keeps working unchanged).
- Distinct tint/opacity per secondary so A vs B is obvious during alignment.

### 5. Gizmo + numeric alignment
- Use `@react-three/drei` `<TransformControls>` (already a dep) attached to the selected secondary
  group; translate/rotate/scale mode toggle.
- **Enforce uniform scale**: on `objectChange`, read `object.scale`, collapse to one value (the
  changed component), write `x=y=z` back.
- Wire `dragging-changed` to disable OrbitControls/`CameraRig` while dragging.
- **Also ship numeric inputs** (x/y/z, uniform scale, Y-rotation) in the cloud panel — mirror-immune,
  always-reliable, and the fallback for risk #7.

### 6. UI — `src/ui/FloorControls.tsx` or new `src/ui/CloudsPanel.tsx`
- "＋ Add point cloud" button (file picker → `addCloud`).
- Per-floor cloud list: primary (locked) + secondaries with select / visibility / delete / numeric
  transform fields / gizmo-mode toggle.

### 7. RISK to validate early — mirror × gizmo
Scene wraps everything in `<group name="scene-mirror" scale={[sx,sy,sz]}>` with default
`mirrorX=mirrorY=true` (negative-scale parent). `TransformControls` under a negative-determinant
parent can render **inverted/confusing handles**. Plan: prototype the gizmo under `scene-mirror`
first (keeps picking's un-mirror logic intact). If handles feel inverted, the **numeric inputs
(5) are the guaranteed-correct fallback**; then decide whether to (a) neutralize mirror during
alignment or (b) bake mirror into geometry for secondaries. Don't pre-engineer.

### 8. "Connecting" partitions = existing edge tool
Once B is gizmo'd into place, two co-located partitions on the **same** floor are joined with
**ordinary waypoints + edges** across the seam — tools already exist. No new intra-floor
connection concept (`FloorConnection`s are cross-floor + cost-bearing). *Confirm intent.*

---

## Phase 2 — Persistence (optional; after Phase 1 feels right)
Phase 1 clouds are a **live authoring aid** — reopening a project re-drops PLYs and re-aligns.
To avoid re-aligning:
- Serialize per-floor secondary-cloud **descriptors** `{ id, sourceFileName, transform }` into the
  project (geometry still never serialized, matching today's `floorClouds` convention).
- On import, restore descriptors; when the user re-drops a PLY whose filename matches, reattach
  geometry and reapply the saved transform.
- Namespace editor-only (e.g. `floor._editor.clouds`) so the mobile parser ignores it (Gson drops
  unknown fields → zero mobile impact).

---

## Explicitly out of scope
- No geometric registration / ICP (eyeball chosen).
- No change to calibration ownership — calibrate on the **primary**; measuring on B is the QA
  scale-check, not a calibration source.
- No export / format / mobile changes.

## Manual test checklist
1. Load primary PLY → add second PLY → appears offset + tinted.
2. Gizmo translate/rotate/**uniform-scale** B until the seam lines up with A.
3. Measure a known real length on B → confirms scale eyeball (within tolerance).
4. Place POIs/waypoints on both A and B; draw edges across the seam.
5. Export → open JSON → B's nodes have sane `position_ar`, edge weights read as real meters.

## Open decisions (answer before/at execution)
1. **Store shape:** parallel `floorSecondaryClouds` map (recommended) vs. fold into `FloorCloud`?
2. **Phase 2 persistence:** in scope now, or ship Phase 1 live-only first?
3. **"Connect" = ordinary edges** across the seam — confirm (vs. wanting auto-snap/registration)?

## Status: Task 1 (mobile multi-floor) is ON HOLD by decision. This plan is Task 2 only.
