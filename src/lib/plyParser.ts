export interface ParsedPLY {
  pos: number[]
  col: number[]
  hasC: boolean
  count: number
}

const SIZES: Record<string, number> = {
  float: 4, float32: 4, double: 8, float64: 8,
  int: 4, int32: 4, uint: 4, uint32: 4,
  short: 2, int16: 2, ushort: 2, uint16: 2,
  char: 1, int8: 1, uchar: 1, uint8: 1,
}

const MAX_VERTICES = 2_500_000

interface Prop {
  name: string
  type: string
  sz: number
}

export function parsePLY(buffer: ArrayBuffer): ParsedPLY {
  const hdrBytes = Math.min(16384, buffer.byteLength)
  const hdrText = new TextDecoder().decode(new Uint8Array(buffer, 0, hdrBytes))
  const lines = hdrText.split('\n')

  let vCount = 0
  let isBin = false
  let isLE = true
  let hdrLen = 0
  const props: Prop[] = []
  let inVert = false

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim()
    if (l.startsWith('format binary_little')) {
      isBin = true
      isLE = true
    } else if (l.startsWith('format binary_big')) {
      isBin = true
      isLE = false
    } else if (l.startsWith('element vertex')) {
      vCount = parseInt(l.split(' ')[2])
      inVert = true
    } else if (l.startsWith('element') && !l.startsWith('element vertex')) {
      inVert = false
    } else if (l.startsWith('property') && inVert) {
      const p = l.split(/\s+/)
      if (p[1] !== 'list') props.push({ name: p[2], type: p[1], sz: SIZES[p[1]] ?? 4 })
    }
    if (l === 'end_header') {
      hdrLen = new TextEncoder().encode(lines.slice(0, i + 1).join('\n') + '\n').length
      break
    }
  }

  const pi: Record<string, number> = {}
  props.forEach((p, i) => (pi[p.name] = i))
  const xi = pi.x ?? 0
  const yi = pi.y ?? 1
  const zi = pi.z ?? 2
  const ri = pi.red ?? pi.r ?? pi.diffuse_red ?? -1
  const gi = pi.green ?? pi.g ?? pi.diffuse_green ?? -1
  const bi = pi.blue ?? pi.b ?? pi.diffuse_blue ?? -1
  const hasC = ri >= 0 && gi >= 0 && bi >= 0

  const pos: number[] = []
  const col: number[] = []

  if (isBin) {
    const offs: number[] = []
    let cum = 0
    props.forEach((p) => {
      offs.push(cum)
      cum += p.sz
    })
    const stride = cum
    const dv = new DataView(buffer)
    let base = hdrLen
    const rv = (ii: number, b: number): number => {
      const o = b + offs[ii]
      const t = props[ii].type
      if (t === 'float' || t === 'float32') return dv.getFloat32(o, isLE)
      if (t === 'double' || t === 'float64') return dv.getFloat64(o, isLE)
      if (t === 'uchar' || t === 'uint8') return dv.getUint8(o)
      if (t === 'char' || t === 'int8') return dv.getInt8(o)
      if (t === 'ushort' || t === 'uint16') return dv.getUint16(o, isLE)
      if (t === 'short' || t === 'int16') return dv.getInt16(o, isLE)
      if (t === 'uint' || t === 'uint32') return dv.getUint32(o, isLE)
      if (t === 'int' || t === 'int32') return dv.getInt32(o, isLE)
      return dv.getFloat32(o, isLE)
    }
    for (let i = 0; i < vCount && i < MAX_VERTICES; i++, base += stride) {
      try {
        pos.push(rv(xi, base), rv(yi, base), rv(zi, base))
        if (hasC) {
          const t = props[ri].type
          const ft = t.startsWith('float') || t.startsWith('double')
          col.push(
            ft ? rv(ri, base) : rv(ri, base) / 255,
            ft ? rv(gi, base) : rv(gi, base) / 255,
            ft ? rv(bi, base) : rv(bi, base) / 255,
          )
        }
      } catch {
        break
      }
    }
  } else {
    const txt = new TextDecoder().decode(buffer)
    let past = false
    let cnt = 0
    for (const l of txt.split('\n')) {
      if (l.trim() === 'end_header') {
        past = true
        continue
      }
      if (!past) continue
      const p = l.trim().split(/\s+/)
      if (p.length >= 3) {
        pos.push(parseFloat(p[xi]), parseFloat(p[yi]), parseFloat(p[zi]))
        if (hasC) {
          const rv = parseFloat(p[ri])
          const gv = parseFloat(p[gi])
          const bv = parseFloat(p[bi])
          const ft = rv <= 1 && gv <= 1 && bv <= 1 && (rv % 1 !== 0 || gv % 1 !== 0 || bv % 1 !== 0)
          col.push(ft ? rv : rv / 255, ft ? gv : gv / 255, ft ? bv : bv / 255)
        }
        if (++cnt >= MAX_VERTICES) break
      }
    }
  }
  return { pos, col, hasC, count: pos.length / 3 }
}

export function adaptivePointSize(count: number): number {
  return count > 800_000 ? 0.0004 : count > 200_000 ? 0.0007 : 0.0012
}
