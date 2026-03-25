import { Component, type ErrorInfo, type ReactNode } from "react"
import { Lightbulb, RotateCcw, RefreshCw, FileCode2, Wifi, Package, Zap } from "lucide-react"

// Types
interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
  githubRepo?: string
}

interface ErrorBoundaryState {
  error: Error | null
  errorInfo: ErrorInfo | null
}

type ErrorKind = "contract" | "network" | "chunk" | "generic"

function classifyError(err: Error): ErrorKind {
  const msg = (err.message ?? "").toLowerCase()
  const name = (err.name ?? "").toLowerCase()

  if (
    msg.includes("contract") ||
    msg.includes("hosterror") ||
    msg.includes("error(contract") ||
    msg.includes("transaction simulation failed") ||
    name.includes("contracterror")
  )
    return "contract"

  if (
    msg.includes("network") ||
    msg.includes("fetch") ||
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("econnrefused") ||
    msg.includes("timeout") ||
    name.includes("networkerror")
  )
    return "network"

  if (msg.includes("loading chunk") || msg.includes("dynamically imported module"))
    return "chunk"

  return "generic"
}

const ERROR_COPY: Record<
  ErrorKind,
  { icon: React.ReactNode; title: string; description: string; hint: string }
> = {
  contract: {
    icon: <FileCode2 size={48} strokeWidth={1.5} />,
    title: "Contract Call Failed",
    description:
      "The blockchain contract rejected this transaction or returned an unexpected result.",
    hint: "Double-check your wallet connection, network selection, and that you have sufficient funds.",
  },
  network: {
    icon: <Wifi size={48} strokeWidth={1.5} />,
    title: "Network Error",
    description: "Unable to reach the network. Your connection may be offline or the RPC endpoint is down.",
    hint: "Check your internet connection, try switching RPC providers, or wait a moment and retry.",
  },
  chunk: {
    icon: <Package size={48} strokeWidth={1.5} />,
    title: "Failed to Load Module",
    description: "A required part of the app could not be downloaded — likely caused by a stale cache after a recent update.",
    hint: "Refreshing the page usually fixes this immediately.",
  },
  generic: {
    icon: <Zap size={48} strokeWidth={1.5} />,
    title: "Something Went Wrong",
    description: "An unexpected error crashed this part of the app.",
    hint: "Try refreshing the page or resetting the view. If the problem persists, please report it.",
  },
}

function devLog(error: Error, info: ErrorInfo | null) {
  if (import.meta.env.DEV) {
    console.group(
      "%c[ErrorBoundary]",
      "color:#e11d48;font-weight:bold;font-size:14px"
    )
    console.error("Error:", error)
    console.error("Message:", error.message)
    console.error("Stack:", error.stack)
    if (info) console.error("Component stack:", info.componentStack)
    console.groupEnd()
  }
}

const GITHUB_REPO = "https://github.com/lernza/lernza"

interface FallbackProps {
  error: Error
  errorInfo: ErrorInfo | null
  onReset: () => void
  onReload: () => void
  githubRepo: string
}

function ErrorFallbackUI({ error, errorInfo, onReset, onReload, githubRepo }: FallbackProps) {
  const kind = classifyError(error)
  const copy = ERROR_COPY[kind]

  const issueTitle = encodeURIComponent(`[Bug] ${error.message.slice(0, 80)}`)
  const issueBody = encodeURIComponent(
    `## What happened\n\n<!-- Describe what you were doing -->\n\n## Error\n\`\`\`\n${error.message}\n\`\`\`\n\n## Stack\n\`\`\`\n${error.stack ?? "N/A"}\n\`\`\`\n\n## Component stack\n\`\`\`\n${errorInfo?.componentStack ?? "N/A"}\n\`\`\``
  )
  const issueUrl = `${githubRepo}/issues/new?title=${issueTitle}&body=${issueBody}`

  return (
    <div
      role="alert"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#fafaf8",
        padding: "24px",
        fontFamily: "'Space Mono', 'Courier New', monospace",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage:
            "linear-gradient(#00000008 1px, transparent 1px), linear-gradient(90deg, #00000008 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 600,
          width: "100%",
        }}
      >
        <div
          style={{
            border: "3px solid #000",
            boxShadow: "8px 8px 0 #000",
            backgroundColor: "#fff",
            padding: "36px 32px 28px",
          }}
        >
          <div
            style={{
              backgroundColor: "#ff3c5f",
              border: "3px solid #000",
              margin: "-36px -32px 28px",
              padding: "12px 20px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ fontSize: 20, letterSpacing: 4, fontWeight: 700, color: "#fff" }}>
              ERROR
            </span>
            <span
              style={{
                marginLeft: "auto",
                backgroundColor: "#000",
                color: "#ff3c5f",
                fontWeight: 700,
                fontSize: 11,
                padding: "2px 8px",
                letterSpacing: 2,
              }}
            >
              {kind.toUpperCase()}
            </span>
          </div>

          <div style={{ marginBottom: 16 }}>
            <span style={{ display: "block", marginBottom: 8 }}>{copy.icon}</span>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 900,
                lineHeight: 1.1,
                letterSpacing: -0.5,
                margin: 0,
              }}
            >
              {copy.title}
            </h1>
          </div>

          <p style={{ margin: "0 0 8px", fontSize: 15, lineHeight: 1.6, color: "#333" }}>
            {copy.description}
          </p>
          <p style={{ margin: "0 0 24px", fontSize: 13, lineHeight: 1.5, color: "#666", display: "flex", alignItems: "flex-start", gap: 6 }}>
            <Lightbulb size={14} style={{ marginTop: 2, flexShrink: 0 }} />
            {copy.hint}
          </p>

          <div
            style={{
              border: "2px solid #000",
              backgroundColor: "#111",
              padding: "12px 14px",
              marginBottom: 24,
              overflowX: "auto",
            }}
          >
            <code style={{ fontSize: 12, color: "#ff3c5f", wordBreak: "break-all" }}>
              {error.message || String(error)}
            </code>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
            <button
              onClick={onReset}
              style={{
                flex: "1 1 140px",
                border: "3px solid #000",
                boxShadow: "4px 4px 0 #000",
                backgroundColor: "#000",
                color: "#fff",
                fontFamily: "inherit",
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: 1,
                padding: "12px 20px",
                cursor: "pointer",
                transition: "transform 80ms, box-shadow 80ms",
              }}
              onMouseDown={e => {
                ;(e.currentTarget as HTMLButtonElement).style.transform = "translate(3px,3px)"
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = "1px 1px 0 #000"
              }}
              onMouseUp={e => {
                ;(e.currentTarget as HTMLButtonElement).style.transform = ""
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = "4px 4px 0 #000"
              }}
            >
              <RotateCcw size={14} style={{ marginRight: 6 }} /> RESET VIEW
            </button>

            <button
              onClick={onReload}
              style={{
                flex: "1 1 140px",
                border: "3px solid #000",
                boxShadow: "4px 4px 0 #000",
                backgroundColor: "#ffe600",
                color: "#000",
                fontFamily: "inherit",
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: 1,
                padding: "12px 20px",
                cursor: "pointer",
                transition: "transform 80ms, box-shadow 80ms",
              }}
              onMouseDown={e => {
                ;(e.currentTarget as HTMLButtonElement).style.transform = "translate(3px,3px)"
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = "1px 1px 0 #000"
              }}
              onMouseUp={e => {
                ;(e.currentTarget as HTMLButtonElement).style.transform = ""
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = "4px 4px 0 #000"
              }}
            >
              <RefreshCw size={14} style={{ marginRight: 6 }} /> RELOAD PAGE
            </button>
          </div>
          <a
            href={issueUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: 700,
              color: "#000",
              textDecoration: "none",
              borderBottom: "2px solid #000",
              paddingBottom: 1,
              letterSpacing: 0.5,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
            </svg>
            REPORT ISSUE ON GITHUB
          </a>
        </div>

        {import.meta.env.DEV && (
          <details
            style={{
              marginTop: 16,
              border: "3px solid #000",
              boxShadow: "6px 6px 0 #000",
              backgroundColor: "#111",
            }}
          >
            <summary
              style={{
                padding: "10px 16px",
                fontFamily: "inherit",
                fontSize: 12,
                fontWeight: 700,
                color: "#ffe600",
                cursor: "pointer",
                letterSpacing: 2,
                userSelect: "none",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Zap size={12} /> DEV — STACK TRACE
            </summary>
            <div style={{ padding: "12px 16px 16px" }}>
              <pre
                style={{
                  margin: 0,
                  fontSize: 11,
                  color: "#aaa",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  lineHeight: 1.6,
                  overflowX: "auto",
                }}
              >
                {error.stack}
                {errorInfo?.componentStack
                  ? `\n\nComponent Stack:${errorInfo.componentStack}`
                  : ""}
              </pre>
            </div>
          </details>
        )}
      </div>
    </div>
  )
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  static defaultProps: Partial<ErrorBoundaryProps> = {
    githubRepo: GITHUB_REPO,
  }

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ errorInfo: info })
    devLog(error, info)
  }

  reset = () => {
    this.setState({ error: null, errorInfo: null })
  }

  reload = () => {
    window.location.reload()
  }

  override render() {
    const { error, errorInfo } = this.state
    const { children, fallback, githubRepo = GITHUB_REPO } = this.props

    if (error) {
      if (fallback) return fallback(error, this.reset)

      return (
        <ErrorFallbackUI
          error={error}
          errorInfo={errorInfo}
          onReset={this.reset}
          onReload={this.reload}
          githubRepo={githubRepo}
        />
      )
    }

    return children
  }
}
