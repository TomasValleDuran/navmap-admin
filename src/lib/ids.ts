// Human-readable, stable node IDs.
//
// Node IDs double as the default QR payload printed on walls (the AR app scans a
// QR whose text is a node ID), so they must be readable and URL-safe — not the
// old `poi_${Date.now()}` opaque timestamps. See apps/FORMAT.md.

/** Accent-stripped, lowercased, hyphenated slug. `"Aula 101 º"` → `"aula-101"`. */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics (á → a)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Returns `base` if unused, else `base-2`, `base-3`, … so IDs stay unique across
 * every node and anchor (edges and QR codes reference these IDs).
 */
export function uniqueId(base: string, existing: Set<string>): string {
  const b = base || 'node'
  if (!existing.has(b)) return b
  let i = 2
  while (existing.has(`${b}-${i}`)) i++
  return `${b}-${i}`
}
