import js from "@eslint/js"
import globals from "globals"
import react from "eslint-plugin-react"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import tseslint from "typescript-eslint"
import prettier from "eslint-config-prettier"
import unusedImports from "eslint-plugin-unused-imports"
import { defineConfig, globalIgnores } from "eslint/config"

const imperativeButtonVerbs = new Set([
  "add",
  "back",
  "build",
  "cancel",
  "close",
  "connect",
  "copy",
  "create",
  "delete",
  "disconnect",
  "edit",
  "enroll",
  "enrol",
  "export",
  "find",
  "follow",
  "fund",
  "go",
  "import",
  "launch",
  "learn",
  "load",
  "manage",
  "open",
  "preview",
  "continue",
  "refresh",
  "reload",
  "remove",
  "return",
  "retry",
  "reset",
  "save",
  "search",
  "see",
  "set",
  "share",
  "show",
  "sort",
  "start",
  "submit",
  "next",
  "switch",
  "toggle",
  "try",
  "update",
  "verify",
  "view",
  "join",
  "approve",
  "reject",
])

function getJsxName(name) {
  return name.type === "JSXIdentifier" ? name.name : null
}

function getLiteralText(node) {
  if (node.type === "JSXText") return node.value

  if (
    node.type === "JSXExpressionContainer" &&
    node.expression.type === "Literal" &&
    typeof node.expression.value === "string"
  ) {
    return node.expression.value
  }

  if (node.type === "JSXElement") {
    return node.children.map(getLiteralText).join(" ")
  }

  return ""
}

const buttonCopyPlugin = {
  rules: {
    "imperative-button-labels": {
      meta: {
        type: "suggestion",
        docs: {
          description:
            "Require visible button copy to start with an imperative verb so labels stay action-oriented.",
        },
        schema: [],
      },
      create(context) {
        return {
          JSXElement(node) {
            const tagName = getJsxName(node.openingElement.name)
            if (tagName !== "button" && tagName !== "Button") return

            const ariaLabeled = node.openingElement.attributes.some(attribute => {
              if (attribute.type !== "JSXAttribute" || attribute.name.name !== "aria-label") {
                return false
              }

              return true
            })

            if (ariaLabeled) return

            const label = node.children.map(getLiteralText).join(" ").replace(/\s+/g, " ").trim()
            if (!label) return

            const firstWord = label.match(/[A-Za-z]+/)?.[0]?.toLowerCase()
            if (!firstWord || imperativeButtonVerbs.has(firstWord)) return

            context.report({
              node: node.openingElement,
              message:
                'Button labels must start with an imperative verb (for example: "View", "Open", "Create").',
            })
          },
        }
      },
    },
  },
}

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      prettier,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      react,
      "unused-imports": unusedImports,
      "button-copy": buttonCopyPlugin,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      'react/no-danger': 'error',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
      ],
      'button-copy/imperative-button-labels': 'error',
      // The React Compiler rules from eslint-plugin-react-hooks@6 surface design
      // notes ("we couldn't auto-memoize this", "setState in effect is a smell").
      // Keep them visible as warnings rather than errors — they're guidance about
      // optimization and patterns, not correctness bugs that should fail CI.
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      // Ban legacy "workspace" identifiers — use "quest" equivalents instead.
      // The only allowed file is the redirect shim that bridges /workspace/:id → /quest/:id.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Identifier[name=/[Ww]orkspace/]',
          message:
            'The "workspace" identifier is deprecated. Use the "quest" equivalent instead. ' +
            'Only src/components/workspace-redirect.tsx is exempt.',
        },
      ],
    },
  },
  // Allow-list: the redirect shim is the sole permitted home for workspace identifiers.
  {
    files: ['src/components/workspace-redirect.tsx'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
])
