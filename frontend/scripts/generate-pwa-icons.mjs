/**
 * Generates the PWA raster icons from the Lernza mark, with zero dependencies.
 *
 * Why hand-rolled instead of sharp/resvg: the mark is a single 6-vertex
 * polygon, so a scanline rasterizer plus a minimal PNG encoder is ~200 lines
 * and needs no native build step on any contributor machine or CI runner. The
 * output is committed to `public/icons/`, and this script exists so the icons
 * are reproducible rather than opaque binaries.
 *
 * The geometry mirrors `public/logo.svg` (512x512 viewBox):
 *   - shadow: the mark translated +14/+14, solid black
 *   - mark:   the mark filled #FACC15 with an 8px #000000 centred stroke
 *
 * Two variants are produced per size:
 *   - "any"      : mark scaled to sit comfortably inside the canvas
 *   - "maskable" : solid full-bleed background, mark scaled into the 80%
 *                  safe zone so Android's adaptive-icon crop never clips it
 *
 * Usage: node scripts/generate-pwa-icons.mjs
 */
import { deflateSync } from "node:zlib"
import { writeFileSync, mkdirSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(scriptDir, "..")
const outputDir = path.join(frontendRoot, "public/icons")

/** Canvas background. Matches the app background and manifest background_color. */
const BACKGROUND = [0xfb, 0xfa, 0xf7, 0xff]
const SHADOW_COLOR = [0x00, 0x00, 0x00, 0xff]
const MARK_FILL = [0xfa, 0xcc, 0x15, 0xff]
const MARK_STROKE = [0x00, 0x00, 0x00, 0xff]

/** The mark in the source 512x512 logo coordinate space. */
const MARK = [
  [149, 117],
  [149, 382],
  [349, 382],
  [349, 317],
  [214, 317],
  [214, 117],
]
const STROKE_WIDTH = 8
const SHADOW_OFFSET = 14

/** 4x4 supersampling grid per output pixel — cheap antialiasing. */
const SAMPLES_PER_AXIS = 4

// ─── Geometry ────────────────────────────────────────────────────────────────

/** Even-odd point-in-polygon test (ray casting). */
function isInsidePolygon(points, x, y) {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i]
    const [xj, yj] = points[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

/** Shortest distance from a point to any edge of the polygon. */
function distanceToPolygonEdges(points, x, y) {
  let min = Infinity
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [x1, y1] = points[j]
    const [x2, y2] = points[i]
    const dx = x2 - x1
    const dy = y2 - y1
    const lengthSquared = dx * dx + dy * dy
    // Degenerate edge: treat as a point distance.
    const t = lengthSquared === 0 ? 0 : clamp01(((x - x1) * dx + (y - y1) * dy) / lengthSquared)
    const distance = Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy))
    if (distance < min) min = distance
  }
  return min
}

function clamp01(value) {
  return value < 0 ? 0 : value > 1 ? 1 : value
}

function translatePolygon(points, dx, dy) {
  return points.map(([x, y]) => [x + dx, y + dy])
}

/**
 * Builds the painter for one variant: returns the colour of a single sample
 * point in canvas space. Paint order mirrors SVG (fill then stroke on top).
 */
function createSampler({ scale, offsetX, offsetY, opaque }) {
  const mark = MARK.map(([x, y]) => [offsetX + x * scale, offsetY + y * scale])
  const shadow = translatePolygon(mark, SHADOW_OFFSET * scale, SHADOW_OFFSET * scale)
  const strokeHalf = (STROKE_WIDTH / 2) * scale

  return function sample(x, y) {
    // Stroke paints last, so it wins over both the fill and the shadow.
    if (distanceToPolygonEdges(mark, x, y) <= strokeHalf) return MARK_STROKE
    if (isInsidePolygon(mark, x, y)) return MARK_FILL
    if (isInsidePolygon(shadow, x, y)) return SHADOW_COLOR
    return opaque ? BACKGROUND : [0, 0, 0, 0]
  }
}

// ─── Rasterizer ──────────────────────────────────────────────────────────────

function renderIcon(size, { scale, offsetX, offsetY, opaque }) {
  const sample = createSampler({ scale, offsetX, offsetY, opaque })
  const step = 1 / SAMPLES_PER_AXIS
  const totalSamples = SAMPLES_PER_AXIS * SAMPLES_PER_AXIS
  const pixels = Buffer.alloc(size * size * 4)

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (let sy = 0; sy < SAMPLES_PER_AXIS; sy++) {
        for (let sx = 0; sx < SAMPLES_PER_AXIS; sx++) {
          const [sr, sg, sb, sa] = sample(px + (sx + 0.5) * step, py + (sy + 0.5) * step)
          r += sr * sa
          g += sg * sa
          b += sb * sa
          a += sa
        }
      }
      const offset = (py * size + px) * 4
      if (a === 0) {
        // Fully transparent sample: leave the destination untouched.
        pixels[offset + 3] = 0
        continue
      }
      // Un-premultiply so edge pixels keep their colour as alpha falls off.
      pixels[offset] = Math.round(r / a)
      pixels[offset + 1] = Math.round(g / a)
      pixels[offset + 2] = Math.round(b / a)
      pixels[offset + 3] = Math.round(a / totalSamples)
    }
  }

  return pixels
}

// ─── PNG encoder ─────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buffer) {
  let c = 0xffffffff
  for (let i = 0; i < buffer.length; i++) c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typeAndData), 0)
  return Buffer.concat([length, typeAndData, crc])
}

function encodePng(size, pixels) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr.writeUInt8(8, 8) // bit depth
  ihdr.writeUInt8(6, 9) // colour type: RGBA
  ihdr.writeUInt8(0, 10) // compression
  ihdr.writeUInt8(0, 11) // filter
  ihdr.writeUInt8(0, 12) // interlace

  // Each scanline is prefixed with filter type 0 (None).
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1)
    raw[rowStart] = 0
    pixels.copy(raw, rowStart + 1, y * size * 4, (y + 1) * size * 4)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ])
}

// ─── Variant geometry ────────────────────────────────────────────────────────

/** The mark's bounding box in logo space (see public/logo.svg). */
const MARK_WIDTH = 200
const MARK_HEIGHT = 265

/**
 * Lernza mark spans 200x265 in logo space. Both variants centre the scaled
 * mark on the canvas so every size reads identically.
 */
function anyLayout(size) {
  // Height-fitted to 62% of the canvas: the mark keeps ~19% breathing room on
  // each side, which is what a launcher expects for a non-maskable icon.
  const scale = (size * 0.62) / MARK_HEIGHT
  return centreOn(markBounds(scale, 0), size)
}

function maskableLayout(size) {
  // Android's adaptive-icon crop can mask to a circle of 80% diameter, so the
  // mark is sized against its *diagonal* (plus the shadow offset) rather than
  // its bounding box: fitting the diagonal to 80% of the canvas keeps every
  // corner of the artwork inside the safe zone for any rotation of the crop.
  const diagonal = Math.hypot(MARK_WIDTH, MARK_HEIGHT) + SHADOW_OFFSET
  const scale = (size * 0.8) / diagonal
  return centreOn(markBounds(scale, SHADOW_OFFSET), size)
}

function markBounds(scale, padding) {
  const xs = MARK.map(([x]) => x * scale + padding)
  const ys = MARK.map(([, y]) => y * scale + padding)
  return {
    scale,
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  }
}

function centreOn(bounds, size) {
  const dx = (size - (bounds.minX + bounds.maxX)) / 2
  const dy = (size - (bounds.minY + bounds.maxY)) / 2
  return { scale: bounds.scale, offsetX: dx, offsetY: dy }
}

// ─── Entry point ─────────────────────────────────────────────────────────────

const VARIANTS = [
  { file: "icon-192.png", size: 192, layout: anyLayout, opaque: false },
  { file: "icon-512.png", size: 512, layout: anyLayout, opaque: false },
  { file: "icon-maskable-192.png", size: 192, layout: maskableLayout, opaque: true },
  { file: "icon-maskable-512.png", size: 512, layout: maskableLayout, opaque: true },
]

mkdirSync(outputDir, { recursive: true })

for (const variant of VARIANTS) {
  const layout = variant.layout(variant.size)
  const pixels = renderIcon(variant.size, { ...layout, opaque: variant.opaque })
  const png = encodePng(variant.size, pixels)
  const destination = path.join(outputDir, variant.file)
  writeFileSync(destination, png)
  console.log(`wrote ${path.relative(frontendRoot, destination)} (${png.length} bytes)`)
}
