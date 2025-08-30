// Minimal TS port from root hexagons.js (redblobgames) plus HexOps
// CC0 — http://www.redblobgames.com/grids/hexagons/

export class Point {
  x: number
  y: number
  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }
}

export class Hex {
  q: number
  r: number
  s: number
  constructor(q: number, r: number, s: number) {
    this.q = q
    this.r = r
    this.s = s
    if (Math.round(q + r + s) !== 0) throw new Error('q + r + s must be 0')
  }
  add(b: Hex) {
    return new Hex(this.q + b.q, this.r + b.r, this.s + b.s)
  }
  subtract(b: Hex) {
    return new Hex(this.q - b.q, this.r - b.r, this.s - b.s)
  }
  scale(k: number) {
    return new Hex(this.q * k, this.r * k, this.s * k)
  }
  rotateLeft() {
    return new Hex(-this.s, -this.q, -this.r)
  }
  rotateRight() {
    return new Hex(-this.r, -this.s, -this.q)
  }
  static direction(direction: number) {
    return Hex.directions[direction]
  }
  neighbor(direction: number) {
    return this.add(Hex.direction(direction))
  }
  diagonalNeighbor(direction: number) {
    return this.add(Hex.diagonals[direction])
  }
  len() {
    return (Math.abs(this.q) + Math.abs(this.r) + Math.abs(this.s)) / 2
  }
  distance(b: Hex) {
    return this.subtract(b).len()
  }
  round() {
    let qi = Math.round(this.q)
    let ri = Math.round(this.r)
    let si = Math.round(this.s)
    const q_diff = Math.abs(qi - this.q)
    const r_diff = Math.abs(ri - this.r)
    const s_diff = Math.abs(si - this.s)
    if (q_diff > r_diff && q_diff > s_diff) {
      qi = -ri - si
    } else if (r_diff > s_diff) {
      ri = -qi - si
    } else {
      si = -qi - ri
    }
    return new Hex(qi, ri, si)
  }
  lerp(b: Hex, t: number) {
    return new Hex(this.q * (1.0 - t) + b.q * t, this.r * (1.0 - t) + b.r * t, this.s * (1.0 - t) + b.s * t)
  }
  linedraw(b: Hex) {
    const N = this.distance(b)
    const a_nudge = new Hex(this.q + 1e-6, this.r + 1e-6, this.s - 2e-6)
    const b_nudge = new Hex(b.q + 1e-6, b.r + 1e-6, b.s - 2e-6)
    const results: Hex[] = []
    const step = 1.0 / Math.max(N, 1)
    for (let i = 0; i <= N; i++) {
      results.push(a_nudge.lerp(b_nudge, step * i).round())
    }
    return results
  }
  static directions: Hex[]
  static diagonals: Hex[]
}

Hex.directions = [new Hex(1, 0, -1), new Hex(1, -1, 0), new Hex(0, -1, 1), new Hex(-1, 0, 1), new Hex(-1, 1, 0), new Hex(0, 1, -1)]
Hex.diagonals = [new Hex(2, -1, -1), new Hex(1, -2, 1), new Hex(-1, -1, 2), new Hex(-2, 1, 1), new Hex(-1, 2, -1), new Hex(1, 1, -2)]

export class OffsetCoord {
  col: number
  row: number
  constructor(col: number, row: number) {
    this.col = col
    this.row = row
  }
  static qoffsetFromCube(offset: number, h: Hex) {
    const parity = h.q & 1
    const col = h.q
    const row = h.r + (h.q + offset * parity) / 2
    if (offset !== OffsetCoord.EVEN && offset !== OffsetCoord.ODD) {
      throw new Error('offset must be EVEN (+1) or ODD (-1)')
    }
    return new OffsetCoord(col, row)
  }
  static qoffsetToCube(offset: number, h: OffsetCoord) {
    const parity = h.col & 1
    const q = h.col
    const r = h.row - (h.col + offset * parity) / 2
    const s = -q - r
    if (offset !== OffsetCoord.EVEN && offset !== OffsetCoord.ODD) {
      throw new Error('offset must be EVEN (+1) or ODD (-1)')
    }
    return new Hex(q, r, s)
  }
  static roffsetFromCube(offset: number, h: Hex) {
    const parity = h.r & 1
    const col = h.q + (h.r + offset * parity) / 2
    const row = h.r
    if (offset !== OffsetCoord.EVEN && offset !== OffsetCoord.ODD) {
      throw new Error('offset must be EVEN (+1) or ODD (-1)')
    }
    return new OffsetCoord(col, row)
  }
  static roffsetToCube(offset: number, h: OffsetCoord) {
    const parity = h.row & 1
    const q = h.col - (h.row + offset * parity) / 2
    const r = h.row
    const s = -q - r
    if (offset !== OffsetCoord.EVEN && offset !== OffsetCoord.ODD) {
      throw new Error('offset must be EVEN (+1) or ODD (-1)')
    }
    return new Hex(q, r, s)
  }
  static qoffsetFromQdoubled(offset: number, h: DoubledCoord) {
    const parity = h.col & 1
    return new OffsetCoord(h.col, (h.row + offset * parity) / 2)
  }
  static qoffsetToQdoubled(offset: number, h: OffsetCoord) {
    const parity = h.col & 1
    return new DoubledCoord(h.col, 2 * h.row - offset * parity)
  }
  static roffsetFromRdoubled(offset: number, h: DoubledCoord) {
    const parity = h.row & 1
    return new OffsetCoord((h.col + offset * parity) / 2, h.row)
  }
  static roffsetToRdoubled(offset: number, h: OffsetCoord) {
    const parity = h.row & 1
    return new DoubledCoord(2 * h.col - offset * parity, h.row)
  }
  static EVEN = 1
  static ODD = -1
}

export class DoubledCoord {
  col: number
  row: number
  constructor(col: number, row: number) {
    this.col = col
    this.row = row
  }
  static qdoubledFromCube(h: Hex) {
    const col = h.q
    const row = 2 * h.r + h.q
    return new DoubledCoord(col, row)
  }
  qdoubledToCube() {
    const q = this.col
    const r = (this.row - this.col) / 2
    const s = -q - r
    return new Hex(q, r, s)
  }
  static rdoubledFromCube(h: Hex) {
    const col = 2 * h.q + h.r
    const row = h.r
    return new DoubledCoord(col, row)
  }
  rdoubledToCube() {
    const q = (this.col - this.row) / 2
    const r = this.row
    const s = -q - r
    return new Hex(q, r, s)
  }
}

export class Orientation {
  f0: number
  f1: number
  f2: number
  f3: number
  b0: number
  b1: number
  b2: number
  b3: number
  start_angle: number
  constructor(f0: number, f1: number, f2: number, f3: number, b0: number, b1: number, b2: number, b3: number, start_angle: number) {
    this.f0 = f0
    this.f1 = f1
    this.f2 = f2
    this.f3 = f3
    this.b0 = b0
    this.b1 = b1
    this.b2 = b2
    this.b3 = b3
    this.start_angle = start_angle
  }
}

export class Layout {
  orientation: Orientation
  size: Point
  origin: Point
  constructor(orientation: Orientation, size: Point, origin: Point) {
    this.orientation = orientation
    this.size = size
    this.origin = origin
  }
  hexToPixel(h: Hex) {
    const M = this.orientation
    const size = this.size
    const origin = this.origin
    const x = (M.f0 * h.q + M.f1 * h.r) * size.x
    const y = (M.f2 * h.q + M.f3 * h.r) * size.y
    return new Point(x + origin.x, y + origin.y)
  }
  pixelToHexFractional(p: Point) {
    const M = this.orientation
    const size = this.size
    const origin = this.origin
    const pt = new Point((p.x - origin.x) / size.x, (p.y - origin.y) / size.y)
    const q = M.b0 * pt.x + M.b1 * pt.y
    const r = M.b2 * pt.x + M.b3 * pt.y
    return new Hex(q, r, -q - r)
  }
  pixelToHexRounded(p: Point) {
    return this.pixelToHexFractional(p).round()
  }
  hexCornerOffset(corner: number) {
    const M = this.orientation
    const size = this.size
    const angle = (2.0 * Math.PI * (M.start_angle - corner)) / 6.0
    return new Point(size.x * Math.cos(angle), size.y * Math.sin(angle))
  }
  polygonCorners(h: Hex) {
    const corners: Point[] = []
    const center = this.hexToPixel(h)
    for (let i = 0; i < 6; i++) {
      const offset = this.hexCornerOffset(i)
      corners.push(new Point(center.x + offset.x, center.y + offset.y))
    }
    return corners
  }
  static pointy = new Orientation(Math.sqrt(3.0), Math.sqrt(3.0) / 2.0, 0.0, 3.0 / 2.0, Math.sqrt(3.0) / 3.0, -1.0 / 3.0, 0.0, 2.0 / 3.0, 0.5)
  static flat = new Orientation(3.0 / 2.0, 0.0, Math.sqrt(3.0) / 2.0, Math.sqrt(3.0), 2.0 / 3.0, 0.0, -1.0 / 3.0, Math.sqrt(3.0) / 3.0, 0.0)
}

// =====================================
// HexOps 扩展区域（后续会持续补充）
// =====================================
export const HexOps = {
  axialToCube(q: number, r: number) {
    return new Hex(q, r, -q - r)
  },
  cubeToAxial(hex: Hex) {
    return { q: hex.q, r: hex.r }
  },
  key(hex: Hex) {
    return hex.q + ',' + hex.r + ',' + hex.s
  },
  fromKey(key: string) {
    const parts = key.split(',').map(Number)
    return new Hex(parts[0], parts[1], parts[2])
  },
  neighbors(hex: Hex) {
    const result: Hex[] = []
    for (let d = 0; d < 6; d++) result.push(hex.neighbor(d))
    return result
  },
  range(center: Hex, radius: number) {
    const results: Hex[] = []
    for (let dq = -radius; dq <= radius; dq++) {
      for (let dr = Math.max(-radius, -dq - radius); dr <= Math.min(radius, -dq + radius); dr++) {
        const ds = -dq - dr
        results.push(center.add(new Hex(dq, dr, ds)))
      }
    }
    return results
  },
  ring(center: Hex, radius: number) {
    if (radius === 0) return [center]
    const results: Hex[] = []
    let hex = center.add(Hex.direction(4).scale(radius))
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < radius; j++) {
        results.push(hex)
        hex = hex.neighbor(i)
      }
    }
    return results
  },
  spiral(center: Hex, radius: number) {
    const results: Hex[] = [center]
    for (let k = 1; k <= radius; k++) {
      const ringHexes = HexOps.ring(center, k)
      for (let i = 0; i < ringHexes.length; i++) results.push(ringHexes[i])
    }
    return results
  },
  pixelToHex(layout: Layout, x: number, y: number) {
    return layout.pixelToHexRounded(new Point(x, y))
  },
  hexToPixel(layout: Layout, hex: Hex) {
    return layout.hexToPixel(hex)
  },
  corners(layout: Layout, hex: Hex) {
    return layout.polygonCorners(hex)
  },
  hexagon(center: Hex, radius: number) {
    return HexOps.range(center, radius)
  },
  rectangleOddR(width: number, height: number) {
    const results: Hex[] = []
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const oc = new OffsetCoord(col, row)
        const cube = OffsetCoord.roffsetToCube(OffsetCoord.ODD, oc)
        results.push(cube)
      }
    }
    return results
  },
}
