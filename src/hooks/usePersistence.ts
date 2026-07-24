import { useEffect } from 'react'
import * as THREE from 'three'
import { useNavmapStore } from '../store/useNavmapStore'
import {
  deleteGeom,
  loadSnapshot,
  primaryGeomKey,
  saveDoc,
  saveGeom,
  secondaryGeomKey,
} from '../lib/persist'

const SAVE_DEBOUNCE_MS = 500

/**
 * Auto-persists the session to IndexedDB and restores it on mount. Mount once (in App).
 *
 * Geometry is written only when a cloud's geometry identity changes (load / add) and deleted when
 * the cloud goes away, so frequent annotation/transform edits only rewrite the small doc.
 */
export function usePersistence() {
  useEffect(() => {
    let disposed = false
    let unsub = () => {}
    // geom key → the BufferGeometry we've already written for it (identity check avoids rewrites)
    const persistedGeom = new Map<string, THREE.BufferGeometry>()

    const sync = () => {
      const s = useNavmapStore.getState()
      const desired = new Set<string>()

      for (const [fid, cloud] of Object.entries(s.floorClouds)) {
        const key = primaryGeomKey(fid)
        desired.add(key)
        if (persistedGeom.get(key) !== cloud.geometry) {
          persistedGeom.set(key, cloud.geometry)
          void saveGeom(key, cloud.geometry)
        }
      }
      for (const [fid, arr] of Object.entries(s.floorSecondaryClouds)) {
        for (const cloud of arr) {
          const key = secondaryGeomKey(fid, cloud.id)
          desired.add(key)
          if (persistedGeom.get(key) !== cloud.geometry) {
            persistedGeom.set(key, cloud.geometry)
            void saveGeom(key, cloud.geometry)
          }
        }
      }
      for (const key of [...persistedGeom.keys()]) {
        if (!desired.has(key)) {
          persistedGeom.delete(key)
          void deleteGeom(key)
        }
      }

      void saveDoc(s)
    }

    ;(async () => {
      try {
        const snap = await loadSnapshot()
        if (disposed) return
        if (snap) {
          useNavmapStore.getState().hydrateState(snap)
          // record what we just loaded as already-persisted so we don't rewrite it
          for (const [fid, cloud] of Object.entries(snap.floorClouds)) {
            persistedGeom.set(primaryGeomKey(fid), cloud.geometry)
          }
          for (const [fid, arr] of Object.entries(snap.floorSecondaryClouds)) {
            for (const cloud of arr) persistedGeom.set(secondaryGeomKey(fid, cloud.id), cloud.geometry)
          }
          const nodes = snap.floors.reduce((n, f) => n + f.pois.length + f.waypoints.length, 0)
          useNavmapStore
            .getState()
            .setStatus(`Sesión restaurada: ${snap.floors.length} pisos · ${nodes} nodos.`)
        }
      } catch (e) {
        console.warn('No se pudo restaurar la sesión:', e)
      }

      if (disposed) return
      let timer: number | undefined
      unsub = useNavmapStore.subscribe(() => {
        if (timer) clearTimeout(timer)
        timer = window.setTimeout(sync, SAVE_DEBOUNCE_MS)
      })
    })()

    return () => {
      disposed = true
      unsub()
    }
  }, [])
}
