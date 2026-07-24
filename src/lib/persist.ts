import * as THREE from 'three'
import type {
  Floor,
  FloorCloud,
  FloorConnection,
  RoutingProfiles,
  SecondaryCloud,
  SecondaryCloudTransform,
} from '../types/navmap'

/**
 * Local auto-persistence for the whole editor session, so reopening the tab restores annotations,
 * clouds and their alignment without re-uploading PLYs.
 *
 * Why IndexedDB and not localStorage: point clouds are megabytes of Float32 data — well past
 * localStorage's ~5 MB string quota. Small state (floors, nodes, cloud transforms) is written on
 * every change (debounced by the caller); heavy geometry is written once per cloud under its own
 * key and deleted when the cloud is removed, so annotation edits never rewrite the point data.
 */

const DB_NAME = 'navmap-admin'
const STORE = 'kv'
const DOC_KEY = 'doc'
const DATA_VERSION = 1

// ---- minimal IndexedDB key/value wrapper (no dependency) -------------------

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const store = db.transaction(STORE, mode).objectStore(STORE)
        const req = run(store)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
  )
}

const idbGet = <T>(key: string) => tx<T>('readonly', (s) => s.get(key) as IDBRequest<T>)
const idbSet = (key: string, val: unknown) => tx('readwrite', (s) => s.put(val, key))
const idbDel = (key: string) => tx('readwrite', (s) => s.delete(key))
const idbKeys = () => tx<IDBValidKey[]>('readonly', (s) => s.getAllKeys())

// ---- serialized shapes -----------------------------------------------------

interface StoredGeom {
  position: Float32Array
  color: Float32Array | null
}

interface CloudMeta {
  hasColor: boolean
  pointSize: number
  modelRadius: number
}

interface SecondaryMeta extends CloudMeta {
  id: string
  name: string
  transform: SecondaryCloudTransform
  visible: boolean
  tint: string
}

interface StoredTransform {
  cx: number
  cy: number
  cz: number
  scale: number
  alignQ: number[] | null
}

type StoredFloor = Omit<Floor, 'transform'> & { transform: StoredTransform }

interface PersistedDoc {
  version: number
  floors: StoredFloor[]
  activeFloorId: string
  connections: FloorConnection[]
  routingProfiles: RoutingProfiles
  /** floorId → primary-cloud meta (geometry lives under `geomP:<floorId>`). */
  primary: Record<string, CloudMeta>
  /** floorId → secondary-cloud meta+transform (geometry under `geomS:<floorId>:<id>`). */
  secondary: Record<string, SecondaryMeta[]>
}

const geomPKey = (floorId: string) => `geomP:${floorId}`
const geomSKey = (floorId: string, cloudId: string) => `geomS:${floorId}:${cloudId}`

// ---- floor (de)serialization: alignQ is a THREE.Quaternion ----------------

function serializeFloor(f: Floor): StoredFloor {
  return {
    ...f,
    transform: {
      cx: f.transform.cx,
      cy: f.transform.cy,
      cz: f.transform.cz,
      scale: f.transform.scale,
      alignQ: f.transform.alignQ ? f.transform.alignQ.toArray() : null,
    },
  }
}

function deserializeFloor(sf: StoredFloor): Floor {
  const alignQ = sf.transform.alignQ ? new THREE.Quaternion().fromArray(sf.transform.alignQ) : null
  return {
    ...sf,
    transform: {
      cx: sf.transform.cx,
      cy: sf.transform.cy,
      cz: sf.transform.cz,
      scale: sf.transform.scale,
      alignQ,
      alignQInv: alignQ ? alignQ.clone().invert() : null,
    },
  }
}

// ---- geometry (de)serialization -------------------------------------------

function extractGeom(g: THREE.BufferGeometry): StoredGeom {
  const position = g.attributes.position.array as Float32Array
  const colorAttr = g.attributes.color as THREE.BufferAttribute | undefined
  return { position, color: colorAttr ? (colorAttr.array as Float32Array) : null }
}

function rebuildGeom(stored: StoredGeom): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(stored.position, 3))
  if (stored.color) g.setAttribute('color', new THREE.Float32BufferAttribute(stored.color, 3))
  g.computeBoundingBox()
  g.computeBoundingSphere()
  return g
}

// ---- public API ------------------------------------------------------------

export interface StoreSnapshot {
  floors: Floor[]
  activeFloorId: string
  connections: FloorConnection[]
  routingProfiles: RoutingProfiles
  floorClouds: Record<string, FloorCloud>
  floorSecondaryClouds: Record<string, SecondaryCloud[]>
}

/** Writes the small doc (annotations + cloud transforms/meta). Geometry is saved separately. */
export async function saveDoc(s: StoreSnapshot): Promise<void> {
  const primary: Record<string, CloudMeta> = {}
  for (const [fid, c] of Object.entries(s.floorClouds)) {
    primary[fid] = { hasColor: c.hasColor, pointSize: c.pointSize, modelRadius: c.modelRadius }
  }
  const secondary: Record<string, SecondaryMeta[]> = {}
  for (const [fid, arr] of Object.entries(s.floorSecondaryClouds)) {
    if (!arr.length) continue
    secondary[fid] = arr.map((c) => ({
      id: c.id,
      name: c.name,
      hasColor: c.hasColor,
      pointSize: c.pointSize,
      modelRadius: c.modelRadius,
      transform: c.transform,
      visible: c.visible,
      tint: c.tint,
    }))
  }
  const doc: PersistedDoc = {
    version: DATA_VERSION,
    floors: s.floors.map(serializeFloor),
    activeFloorId: s.activeFloorId,
    connections: s.connections,
    routingProfiles: s.routingProfiles,
    primary,
    secondary,
  }
  await idbSet(DOC_KEY, doc)
}

export const saveGeom = (key: string, g: THREE.BufferGeometry) => idbSet(key, extractGeom(g))
export const deleteGeom = (key: string) => idbDel(key)
export const primaryGeomKey = geomPKey
export const secondaryGeomKey = geomSKey

/** Deletes every persisted record (used by "Borrar todo"). */
export async function clearPersisted(): Promise<void> {
  const keys = await idbKeys()
  await Promise.all(keys.map((k) => idbDel(String(k))))
}

/**
 * Loads and rebuilds the full snapshot, or null if nothing was ever saved. Rebuilt geometries are
 * ready-to-render (they were stored already recentered/aligned/scaled by prepareModelGeometry).
 */
export async function loadSnapshot(): Promise<StoreSnapshot | null> {
  const doc = await idbGet<PersistedDoc>(DOC_KEY)
  if (!doc || doc.version !== DATA_VERSION || !doc.floors?.length) return null

  const floorClouds: Record<string, FloorCloud> = {}
  for (const [fid, meta] of Object.entries(doc.primary ?? {})) {
    const stored = await idbGet<StoredGeom>(geomPKey(fid))
    if (!stored) continue
    floorClouds[fid] = { geometry: rebuildGeom(stored), ...meta }
  }

  const floorSecondaryClouds: Record<string, SecondaryCloud[]> = {}
  for (const [fid, metas] of Object.entries(doc.secondary ?? {})) {
    const clouds: SecondaryCloud[] = []
    for (const m of metas) {
      const stored = await idbGet<StoredGeom>(geomSKey(fid, m.id))
      if (!stored) continue
      clouds.push({
        id: m.id,
        name: m.name,
        geometry: rebuildGeom(stored),
        hasColor: m.hasColor,
        pointSize: m.pointSize,
        modelRadius: m.modelRadius,
        transform: m.transform,
        visible: m.visible,
        tint: m.tint,
      })
    }
    if (clouds.length) floorSecondaryClouds[fid] = clouds
  }

  return {
    floors: doc.floors.map(deserializeFloor),
    activeFloorId: doc.activeFloorId,
    connections: doc.connections ?? [],
    routingProfiles: doc.routingProfiles,
    floorClouds,
    floorSecondaryClouds,
  }
}
