import { Component, type ErrorInfo, type ReactNode } from "react"
import { Lightbulb, RotateCcw, RefreshCw, FileCode2, Wifi, Package, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"

// Types
interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
  githubRepo?: string
  /** Short label surfaced in the primary CTA, e.g. "Quest", "Dashboard". */
  routeLabel?: string
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

  if (msg.includes("loading chunk") || msg.includes("dynamically imported module")) return "chunk"

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
    description:
      "Unable to reach the network. Your connection may be offline or the RPC endpoint is down.",
    hint: "Check your internet connection, try switching RPC providers, or wait a moment and retry.",
  },
  chunk: {
    icon: <Package size={48} strokeWidth={1.5} />,
    title: "Failed to Load Module",
    description:
      "A required part of the app could not be downloaded — likely caused by a stale cache after a recent update.",
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
    console.group("%c[ErrorBoundary]", "color:#e11d48;font-weight:bold;font-size:14px")
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
  /** Short label for the primary CTA button, e.g. "Quest", "Dashboard". */
  routeLabel?: string
}

function ErrorFallbackUI({ error, errorInfo, onReset, onReload, githubRepo, routeLabel }: FallbackProps) {
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
      className="bg-background min-h-screen flex items-center justify-center px-6 font-mono transition-colors duration-300"
    >
      {/* Decorative grid texture — uses border token so it adapts to dark mode */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-border) 1px,transparent 1px),linear-gradient(90deg,var(--color-border) 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 w-full max-w-[600px]">
        {/* Main card */}
        <div className="bg-card border-border border-[3px] shadow-xl px-8 pt-9 pb-7">
          {/* Error header stripe */}
          <div className="bg-destructive border-border -mx-8 -mt-9 mb-7 flex items-center gap-2.5 border-b-[3px] px-5 py-3">
            <span className="text-destructive-foreground text-xl font-black tracking-[4px]">
              ERROR
            </span>
            <span className="bg-card text-destructive ml-auto px-2 py-0.5 text-[11px] font-black tracking-[2px]">
              {kind.toUpperCase()}
            </span>
          </div>

          {/* Icon + title */}
          <div className="mb-4">
            <span className="mb-2 block">{copy.icon}</span>
            <h1 className="text-[26px] font-black leading-tight tracking-tight">{copy.title}</h1>
          </div>

          {/* Description */}
          <p className="text-foreground mb-2 text-[15px] leading-relaxed">{copy.description}</p>

          {/* Hint */}
          <p className="text-muted-foreground mb-6 flex items-start gap-1.5 text-sm leading-normal">
            <Lightbulb size={14} className="mt-0.5 shrink-0" />
            {copy.hint}
          </p>

          {/* Error code block */}
          <div className="border-border mb-6 overflow-x-auto border-[2px] bg-black px-3.5 py-3">
            <code className="text-destructive break-all text-xs">
              {error.message || String(error)}
            </code>
          </div>

          {/* Actions */}
          <div className="mb-5 flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={onReset}
              className="flex-1 basis-[140px] font-black tracking-wider uppercase"
            >
              <RotateCcw size={14} />
              {routeLabel ? `Reload ${routeLabel}` : "Reset View"}
            </Button>
            <Button
              onClick={onReload}
              className="flex-1 basis-[140px] font-black tracking-wider uppercase"
            >
              <RefreshCw size={14} /> Reload Page
            </Button>
          </div>

          {/* Report link */}
          <a
            href={issueUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground border-foreground inline-flex items-center gap-1.5 border-b-2 pb-px text-xs font-black tracking-[0.5px]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
            </svg>
            REPORT ISSUE ON GITHUB
          </a>
        </div>

        {/* Dev-only stack trace panel */}
        {import.meta.env.DEV && (
          <details className="border-border mt-4 border-[3px] bg-black shadow-lg">
            <summary className="text-primary flex cursor-pointer select-none items-center gap-2 px-4 py-2.5 text-xs font-black tracking-[2px] uppercase">
              <Zap size={12} /> DEV — STACK TRACE
            </summary>
            <div className="px-4 pb-4 pt-3">
              <pre className="text-muted-foreground m-0 overflow-x-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed">
                {error.stack}
                {errorInfo?.componentStack ? `\n\nComponent Stack:${errorInfo.componentStack}` : ""}
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
    const { children, fallback, githubRepo = GITHUB_REPO, routeLabel } = this.props

    if (error) {
      if (fallback) return fallback(error, this.reset)

      return (
        <ErrorFallbackUI
          error={error}
          errorInfo={errorInfo}
          onReset={this.reset}
          onReload={this.reload}
          githubRepo={githubRepo}
          routeLabel={routeLabel}
        />
      )
    }

    return children
  }
}
