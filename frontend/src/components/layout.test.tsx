import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

function walkFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  return entries.flatMap(entry => {
    const resolved = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      return walkFiles(resolved)
    }
    return resolved.endsWith(".ts") || resolved.endsWith(".tsx") ? [resolved] : []
  })
}

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const sourceFiles = walkFiles(rootDir)

describe("Layout import regression", () => {
  it("does not import Layout from @/components/layout anywhere in source", () => {
    const layoutImports = sourceFiles.flatMap(file => {
      const contents = fs.readFileSync(file, "utf8")
      return contents.match(/from\s+["']@\/components\/layout["']/g) ?? []
    })

    expect(layoutImports).toHaveLength(0)
  })
})
