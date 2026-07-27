#!/usr/bin/env node
/**
 * check-events.js
 *
 * Scans every *.rs file under contracts/ for Soroban event symbols emitted via
 *   env.events().publish((Symbol::new(&env, "..."),), ...)
 * and verifies that each symbol string appears in docs/EVENT_REFERENCE.md.
 *
 * Exit 0 — all symbols documented.
 * Exit 1 — one or more symbols are missing from the doc.
 *
 * Usage:
 *   node scripts/check-events.js
 */

const fs = require("fs");
const path = require("path");

// ── Paths ────────────────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(__dirname, "..");
const CONTRACTS_DIR = path.join(REPO_ROOT, "contracts");
const EVENT_DOC = path.join(REPO_ROOT, "docs", "EVENT_REFERENCE.md");

// ── Collect Rust source files ─────────────────────────────────────────────────

function walkRs(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkRs(full));
    } else if (entry.isFile() && entry.name.endsWith(".rs")) {
      results.push(full);
    }
  }
  return results;
}

// ── Extract event symbols from Rust source ────────────────────────────────────
//
// Matches the pattern:
//   Symbol::new(&env, "some_event_name")
//
// This covers both the topic tuple and any inline symbol usages. We only care
// about strings that appear immediately after an events().publish call in the
// same function, but a simple regex over the whole file is sufficient because
// non-event Symbol::new usages (e.g. join_mode symbols) are short identifiers
// that will also appear in docs if they are event names, and symbols that are
// NOT event names (like "owner" / "self") will naturally not be looked up in
// the event doc — see the allowlist below.

const SYMBOL_RE = /Symbol::new\s*\(\s*&env\s*,\s*"([^"]+)"\s*\)/g;

// Symbols that appear in contract source via Symbol::new but are NOT event
// topic names. These are used as inline data values, not as event topics, so
// they are intentionally absent from EVENT_REFERENCE.md.
const ALLOWLISTED_NON_EVENT_SYMBOLS = new Set([
  "owner", // join_mode value in enrollee_added data payload
  "self", // join_mode value in enrollee_added data payload
]);

function extractSymbols(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const symbols = new Set();
  let m;
  SYMBOL_RE.lastIndex = 0;
  while ((m = SYMBOL_RE.exec(source)) !== null) {
    const sym = m[1];
    if (!ALLOWLISTED_NON_EVENT_SYMBOLS.has(sym)) {
      symbols.add(sym);
    }
  }
  return symbols;
}

// ── Load EVENT_REFERENCE.md ───────────────────────────────────────────────────

function loadDocSymbols(docPath) {
  const content = fs.readFileSync(docPath, "utf8");
  // Collect every quoted string that looks like an event name in the doc.
  // We match both backtick-wrapped (`reward_funded`) and plain Symbol("...") forms.
  const patterns = [
    /`([a-z][a-z0-9_]+)`/g, // backtick identifier
    /Symbol\("([^"]+)"\)/g, // Symbol("...") notation
  ];
  const found = new Set();
  for (const re of patterns) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(content)) !== null) {
      found.add(m[1]);
    }
  }
  return found;
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  if (!fs.existsSync(CONTRACTS_DIR)) {
    console.error(`ERROR: contracts/ directory not found at ${CONTRACTS_DIR}`);
    process.exit(1);
  }
  if (!fs.existsSync(EVENT_DOC)) {
    console.error(`ERROR: ${EVENT_DOC} not found`);
    process.exit(1);
  }

  const rsFiles = walkRs(CONTRACTS_DIR);
  if (rsFiles.length === 0) {
    console.error("ERROR: no .rs files found under contracts/");
    process.exit(1);
  }

  // Collect all event symbols from source, tracking which file each came from.
  const symbolSources = new Map(); // symbol -> [file, ...]
  for (const file of rsFiles) {
    for (const sym of extractSymbols(file)) {
      if (!symbolSources.has(sym)) symbolSources.set(sym, []);
      symbolSources.get(sym).push(path.relative(REPO_ROOT, file));
    }
  }

  const docSymbols = loadDocSymbols(EVENT_DOC);

  // Find symbols present in source but absent from the doc.
  const missing = [];
  for (const [sym, files] of symbolSources) {
    if (!docSymbols.has(sym)) {
      missing.push({ sym, files });
    }
  }

  const relDoc = path.relative(REPO_ROOT, EVENT_DOC);

  if (missing.length === 0) {
    console.log(`✓ All ${symbolSources.size} event symbols are documented in ${relDoc}`);
    // Print the full list for visibility in CI logs.
    for (const sym of [...symbolSources.keys()].sort()) {
      console.log(`  • ${sym}`);
    }
    process.exit(0);
  }

  console.error(
    `✗ ${missing.length} event symbol(s) found in contract source but missing from ${relDoc}:\n`
  );
  for (const { sym, files } of missing) {
    console.error(`  "${sym}"`);
    for (const f of files) {
      console.error(`      ${f}`);
    }
  }
  console.error(
    `\nAdd a section for each missing symbol to ${relDoc}, or add the symbol to\n` +
    `ALLOWLISTED_NON_EVENT_SYMBOLS in scripts/check-events.js if it is not an event topic.`
  );
  process.exit(1);
}

main();
