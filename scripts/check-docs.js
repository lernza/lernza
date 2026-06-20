#!/usr/bin/env node

/**
 * Documentation Link and Reference Checker
 *
 * Validates:
 * - Internal file links and anchors
 * - Contract function references
 * - Code paths and directory references
 * - Stale terminology (workspace vs quest)
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Configuration
const DOCS_DIRS = ["docs", ".github", "."];
const DOC_EXTENSIONS = [".md", ".yml", ".yaml"];
const IGNORE_PATTERNS = [
  "node_modules",
  "target",
  "dist",
  ".git",
  "CHANGELOG.md", // Auto-generated
];

// Contract function mappings (actual vs documented)
const CONTRACT_FUNCTIONS = {
  quest: [
    "create_quest",
    "add_enrollee",
    "remove_enrollee",
    "get_quest",
    "get_enrollees",
    "is_enrollee",
    "get_quest_count",
    "archive_quest",
    "set_visibility",
    "list_public_quests",
    "leave_quest",
    "update_quest",
    "get_quests_by_category",
  ],
  milestone: [
    "initialize",
    "create_milestone",
    "verify_completion",
    "submit_for_review",
    "approve_completion",
    "get_milestone",
    "get_milestones",
    "get_milestone_count",
    "is_completed",
    "get_enrollee_completions",
    "set_verification_mode",
    "set_distribution_mode",
  ],
  rewards: [
    "initialize",
    "fund_quest",
    "distribute_reward",
    "get_pool_balance",
    "get_user_earnings",
    "get_total_distributed",
    "get_token",
  ],
};

// Deprecated/stale terminology
const STALE_TERMS = [
  {
    pattern: /\bworkspace_id\b/g,
    replacement: "quest_id",
    context: "parameter name",
  },
  {
    pattern: /\bcreate_workspace\b/g,
    replacement: "create_quest",
    context: "function name",
  },
  {
    pattern: /\bget_workspace\b/g,
    replacement: "get_quest",
    context: "function name",
  },
  {
    pattern: /\bget_workspace_count\b/g,
    replacement: "get_quest_count",
    context: "function name",
  },
  {
    pattern: /\bfund_workspace\b/g,
    replacement: "fund_quest",
    context: "function name",
  },
  {
    pattern: /\bWorkspaceInfo\b/g,
    replacement: "QuestInfo",
    context: "type name",
  },
  {
    pattern: /contracts\/workspace\//g,
    replacement: "contracts/quest/",
    context: "path",
  },
];

// Results tracking
const results = {
  brokenLinks: [],
  staleReferences: [],
  invalidFunctions: [],
  missingFiles: [],
  warnings: [],
};

/**
 * Get all documentation files
 */
function getDocFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    // Skip ignored patterns
    if (IGNORE_PATTERNS.some((pattern) => fullPath.includes(pattern))) {
      continue;
    }

    if (entry.isDirectory()) {
      getDocFiles(fullPath, files);
    } else if (DOC_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Check if a file exists relative to repo root
 */
function fileExists(filePath) {
  const fullPath = path.resolve(filePath);
  return fs.existsSync(fullPath);
}

/**
 * Extract markdown links from content
 */
function extractLinks(content) {
  const links = [];

  // Markdown links: [text](url)
  const mdLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;

  while ((match = mdLinkRegex.exec(content)) !== null) {
    links.push({
      text: match[1],
      url: match[2],
      type: "markdown",
    });
  }

  // HTML links: <a href="url">
  const htmlLinkRegex = /<a\s+(?:[^>]*?\s+)?href=["']([^"']+)["']/g;

  while ((match = htmlLinkRegex.exec(content)) !== null) {
    links.push({
      text: "",
      url: match[1],
      type: "html",
    });
  }

  return links;
}

/**
 * Check internal file links
 */
function checkInternalLinks(filePath, content) {
  const links = extractLinks(content);
  const fileDir = path.dirname(filePath);

  for (const link of links) {
    const url = link.url;

    // Skip external URLs
    if (url.startsWith("http://") || url.startsWith("https://")) {
      continue;
    }

    // Skip anchors only
    if (url.startsWith("#")) {
      continue;
    }

    // Skip mailto and other protocols
    if (url.includes(":")) {
      continue;
    }

    // Extract file path (remove anchor)
    const [linkPath, anchor] = url.split("#");

    if (!linkPath) continue;

    // Resolve relative to current file
    const resolvedPath = path.resolve(fileDir, linkPath);

    if (!fs.existsSync(resolvedPath)) {
      results.brokenLinks.push({
        file: filePath,
        link: url,
        text: link.text,
        reason: "File not found",
      });
    }
  }
}

/**
 * Check for stale terminology
 */
function checkStaleTerms(filePath, content) {
  for (const term of STALE_TERMS) {
    const matches = content.match(term.pattern);

    if (matches) {
      results.staleReferences.push({
        file: filePath,
        term: matches[0],
        replacement: term.replacement,
        context: term.context,
        count: matches.length,
      });
    }
  }
}

/**
 * Check contract function references
 */
function checkContractFunctions(filePath, content) {
  // Look for function calls in code blocks
  const codeBlockRegex = /```[\s\S]*?```/g;
  const codeBlocks = content.match(codeBlockRegex) || [];

  for (const block of codeBlocks) {
    // Check for contract invocations
    const invokeRegex = /(?:contract invoke|--)\s+(\w+)/g;
    let match;

    while ((match = invokeRegex.exec(block)) !== null) {
      const funcName = match[1];

      // Check if it's a known contract function
      const isValid = Object.values(CONTRACT_FUNCTIONS).some((funcs) =>
        funcs.includes(funcName),
      );

      // Check if it's a deprecated function
      const isDeprecated = [
        "create_workspace",
        "get_workspace",
        "get_workspace_count",
        "fund_workspace",
      ].includes(funcName);

      if (isDeprecated) {
        results.invalidFunctions.push({
          file: filePath,
          function: funcName,
          reason: "Deprecated function name (use quest instead of workspace)",
        });
      }
    }
  }
}

/**
 * Check file path references
 */
function checkFilePaths(filePath, content) {
  // Look for file paths in various formats
  const pathPatterns = [
    /`([^`]+\.(rs|ts|tsx|js|jsx|toml|yaml|yml|json))`/g,
    /contracts\/\w+\/[^\s)]+/g,
    /frontend\/[^\s)]+/g,
    /docs\/[^\s)]+/g,
  ];

  for (const pattern of pathPatterns) {
    let match;

    while ((match = pattern.exec(content)) !== null) {
      const referencedPath = match[1] || match[0];

      // Clean up the path
      const cleanPath = referencedPath
        .replace(/`/g, "")
        .replace(/[,;:)]$/, "")
        .trim();

      // Skip if it looks like a placeholder
      if (
        cleanPath.includes("...") ||
        cleanPath.includes("<") ||
        cleanPath.includes(">")
      ) {
        continue;
      }

      // Check if file exists
      if (!fileExists(cleanPath)) {
        // Check if it's a directory
        if (!fs.existsSync(cleanPath)) {
          results.missingFiles.push({
            file: filePath,
            path: cleanPath,
            reason: "Referenced file or directory not found",
          });
        }
      }
    }
  }
}

/**
 * Main checker function
 */
function checkDocumentation() {
  console.log(
    "🔍 Checking documentation for broken links and stale references...\n",
  );

  const allFiles = [];
  for (const dir of DOCS_DIRS) {
    getDocFiles(dir, allFiles);
  }

  console.log(`Found ${allFiles.length} documentation files to check\n`);

  for (const file of allFiles) {
    const content = fs.readFileSync(file, "utf-8");

    checkInternalLinks(file, content);
    checkStaleTerms(file, content);
    checkContractFunctions(file, content);
    checkFilePaths(file, content);
  }

  // Print results
  printResults();

  // Exit with error if issues found
  const hasErrors =
    results.brokenLinks.length > 0 ||
    results.staleReferences.length > 0 ||
    results.invalidFunctions.length > 0 ||
    results.missingFiles.length > 0;

  if (hasErrors) {
    process.exit(1);
  }

  console.log("\n✅ All checks passed!\n");
}

/**
 * Print results
 */
function printResults() {
  if (results.brokenLinks.length > 0) {
    console.log("❌ Broken Links:\n");
    for (const item of results.brokenLinks) {
      console.log(`  ${item.file}`);
      console.log(`    Link: ${item.link}`);
      console.log(`    Text: "${item.text}"`);
      console.log(`    Reason: ${item.reason}\n`);
    }
  }

  if (results.staleReferences.length > 0) {
    console.log("⚠️  Stale References:\n");
    for (const item of results.staleReferences) {
      console.log(`  ${item.file}`);
      console.log(
        `    Found: "${item.term}" (${item.count} occurrence${item.count > 1 ? "s" : ""})`,
      );
      console.log(`    Should be: "${item.replacement}"`);
      console.log(`    Context: ${item.context}\n`);
    }
  }

  if (results.invalidFunctions.length > 0) {
    console.log("❌ Invalid/Deprecated Functions:\n");
    for (const item of results.invalidFunctions) {
      console.log(`  ${item.file}`);
      console.log(`    Function: ${item.function}`);
      console.log(`    Reason: ${item.reason}\n`);
    }
  }

  if (results.missingFiles.length > 0) {
    console.log("⚠️  Missing File References:\n");
    for (const item of results.missingFiles) {
      console.log(`  ${item.file}`);
      console.log(`    Path: ${item.path}`);
      console.log(`    Reason: ${item.reason}\n`);
    }
  }

  // Summary
  const totalIssues =
    results.brokenLinks.length +
    results.staleReferences.length +
    results.invalidFunctions.length +
    results.missingFiles.length;

  if (totalIssues > 0) {
    console.log(
      `\n📊 Summary: Found ${totalIssues} issue${totalIssues > 1 ? "s" : ""}\n`,
    );
  }
}

// Run the checker
if (require.main === module) {
  checkDocumentation();
}

module.exports = { checkDocumentation };
