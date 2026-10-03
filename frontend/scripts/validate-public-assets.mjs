import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(scriptDir, "..")

const requiredFiles = [
  { relativePath: "public/favicon.svg", label: "favicon" },
  { relativePath: "public/og-image.png", label: "open-graph image" },
  { relativePath: "public/logo.svg", label: "logo" },
  { relativePath: "public/robots.txt", label: "robots.txt" },
  { relativePath: "public/sitemap.xml", label: "sitemap.xml" },
  // PWA manifest icons. Lighthouse fails the installability audit without a
  // 192px and a 512px raster icon, and Android crops the "maskable" variants,
  // so both purposes are required rather than optional extras.
  { relativePath: "public/icons/icon-192.png", label: "PWA icon (any, 192x192)" },
  { relativePath: "public/icons/icon-512.png", label: "PWA icon (any, 512x512)" },
  {
    relativePath: "public/icons/icon-maskable-192.png",
    label: "PWA icon (maskable, 192x192)",
  },
  {
    relativePath: "public/icons/icon-maskable-512.png",
    label: "PWA icon (maskable, 512x512)",
  },
]

const requiredIndexHtmlIncludes = [
  "%BASE_URL%favicon.svg",
  "%BASE_URL%og-image.png",
  "%BASE_URL%icons/icon-192.png",
]

function fileExistsAndNotEmpty(absolutePath) {
  try {
    const stat = fs.statSync(absolutePath)
    return stat.isFile() && stat.size > 0
  } catch {
    return false
  }
}

const errors = []

for (const file of requiredFiles) {
  const absolutePath = path.join(frontendRoot, file.relativePath)
  if (!fileExistsAndNotEmpty(absolutePath)) {
    errors.push(`Missing or empty ${file.label}: ${file.relativePath}`)
  }
}

const indexHtmlPath = path.join(frontendRoot, "index.html")
let indexHtml = ""

try {
  indexHtml = fs.readFileSync(indexHtmlPath, "utf8")
} catch {
  errors.push("Unable to read frontend/index.html")
}

for (const needle of requiredIndexHtmlIncludes) {
  if (indexHtml && !indexHtml.includes(needle)) {
    errors.push(`frontend/index.html is missing "${needle}"`)
  }
}

if (errors.length > 0) {
  console.error("Public asset validation failed:\n")
  for (const error of errors) console.error(`- ${error}`)
  console.error("\nFix the above issues before deploying/building.")
  process.exit(1)
}

console.log("Public asset validation passed.")
