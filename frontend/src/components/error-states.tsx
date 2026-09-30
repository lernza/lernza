import { useEffect, useRef, useState } from "react"
import {
  AlertCircle,
  WifiOff,
  FileQuestion,
  Wallet,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  Globe2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { mapContractError, classifyError } from "@/lib/contract-errors"
import { useWallet, type WalletErrorCode } from "@/hooks/use-wallet"

// ─── NetworkMismatchBanner ──────────────────────────────────────────────────

export function NetworkIndicator() {
  const { network, networkName, expectedNetworkName, wrongNetwork } = useWallet()
  const activeName = networkName ?? expectedNetworkName
  const isTestnet = network === "testnet" || (!network && expectedNetworkName === "Testnet")

  return (
    <div
      aria-label={`Active network: ${activeName}`}
      data-testid="network-indicator"
      className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs font-bold shadow-sm ${
        wrongNetwork
          ? "border-warning bg-warning/20 text-foreground"
          : isTestnet
            ? "border-warning bg-warning/15 text-foreground"
            : "border-border bg-secondary text-foreground"
      }`}
    >
      <Globe2 className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{activeName}</span>
      {isTestnet && !wrongNetwork && <span className="sr-only">Test environment</span>}
    </div>
  )
}

export function NetworkMismatchBanner() {
  const { wrongNetwork, networkName, expectedNetworkName, installUrl } = useWallet()

  if (!wrongNetwork) return null

  return (
    <div className="bg-warning/15 border-warning/50 border-b px-4 py-3 text-sm">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="text-warning mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <span>
              <strong>Network Mismatch:</strong> Your wallet is on{" "}
              <span className="font-semibold underline">{networkName ?? "a different network"}</span>,
              but Lernza expects <span className="font-semibold">{expectedNetworkName}</span>.
            </span>
            <ol className="mt-1.5 list-decimal space-y-0.5 pl-4 text-xs opacity-90">
              <li>Click the Freighter icon in your browser toolbar.</li>
              <li>Open the network dropdown at the top of the Freighter popup.</li>
              <li>
                Select <strong>{expectedNetworkName}</strong> from the list.
              </li>
              <li>Come back here — this page updates automatically once you switch.</li>
            </ol>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <a
            href={installUrl}
            target="_blank"
            rel="noreferrer"
            className="text-foreground inline-flex items-center gap-1 font-bold underline hover:opacity-80"
          >
            Freighter Help
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  )
}

// ─── WalletErrorAlert ─────────────────────────────────────────────────────────

/** Step-by-step recovery guidance per wallet error type. */
const RECOVERY_STEPS: Record<WalletErrorCode, string[]> = {
  freighter_not_installed: [
    "Install the Freighter browser extension using the button below.",
    "Refresh this page once installation finishes.",
    "Click \"Connect Wallet\" again.",
  ],
  missing_api: [
    "Open the Freighter extension icon and check for a pending update.",
    "Update Freighter to the latest version.",
    "Reload this page and retry the connection below.",
  ],
  user_rejected: [
    "Click retry below to reopen the Freighter connection prompt.",
    "Approve the request in the Freighter popup.",
    "If no popup appears, check it isn't hidden behind this browser window.",
  ],
  timeout: [
    "Open the Freighter extension and confirm it's unlocked.",
    "Check for a pending prompt left over from a previous attempt.",
    "Click retry below once Freighter is unlocked and idle.",
  ],
  network_error: [
    "Check your internet connection.",
    "Confirm Freighter's extension icon is responsive.",
    "Click retry below once connectivity is restored.",
  ],
  unknown: [
    "Try reloading this page.",
    "Make sure Freighter is unlocked and up to date.",
    "Click retry below to attempt the connection again.",
  ],
}

const BACKOFF_BASE_MS = 1500
const BACKOFF_MAX_MS = 30_000

/** Tracks retry attempts and the exponential-backoff cooldown between them. */
function useRetryBackoff() {
  const [attempt, setAttempt] = useState(0)
  const [remainingMs, setRemainingMs] = useState(0)
  const deadlineRef = useRef(0)

  useEffect(() => {
    if (remainingMs <= 0) return
    const id = setInterval(() => {
      setRemainingMs(Math.max(0, deadlineRef.current - Date.now()))
    }, 250)
    return () => clearInterval(id)
  }, [remainingMs > 0])

  const startCooldown = () => {
    const delayMs = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** attempt)
    setAttempt(a => a + 1)
    deadlineRef.current = Date.now() + delayMs
    setRemainingMs(delayMs)
  }

  const reset = () => {
    setAttempt(0)
    setRemainingMs(0)
  }

  return { attempt, remainingMs, startCooldown, reset }
}

export function WalletErrorAlert() {
  const { error, retryConnect, installUrl } = useWallet()
  const { attempt, remainingMs, startCooldown, reset } = useRetryBackoff()

  useEffect(() => {
    if (!error) reset()
    // Only reset when the error clears (e.g. a retry succeeded) — the
    // backoff should keep growing across repeated failures of the same
    // connection flow, not reset every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!error])

  if (!error) return null

  const isNotInstalled = error.code === "freighter_not_installed"
  const steps = RECOVERY_STEPS[error.code]
  const canRetry = remainingMs <= 0
  const cooldownSeconds = Math.ceil(remainingMs / 1000)

  const handleRetry = async () => {
    startCooldown()
    await retryConnect()
  }

  return (
    <div className="bg-destructive/10 border-destructive animate-fade-in-down border p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertCircle className="text-destructive mt-0.5 h-5 w-5 shrink-0" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold">Wallet Connection Error</h4>
          <p className="text-muted-foreground mt-1 text-xs">{error.message}</p>

          <ol className="text-muted-foreground mt-2 list-decimal space-y-0.5 pl-4 text-xs">
            {steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {isNotInstalled ? (
              <a
                href={installUrl}
                target="_blank"
                rel="noreferrer"
                className="bg-primary text-primary-foreground inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-90"
              >
                Install Freighter Extension
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <Button
                size="sm"
                onClick={handleRetry}
                disabled={!canRetry}
                className="h-8 text-xs"
              >
                <RefreshCw className="mr-1 h-3 w-3" />
                {canRetry
                  ? attempt === 0
                    ? "Try Connecting Again"
                    : "Retry"
                  : `Retry in ${cooldownSeconds}s`}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── WalletRequired ───────────────────────────────────────────────────────────

interface WalletRequiredProps {
  message?: string
  onConnect?: () => void
}

/**
 * Inline error shown inside a page/component when the user needs to connect
 * their wallet to proceed. Page-level guards should use the shared wallet hook directly.
 */
export function WalletRequired({ message, onConnect }: WalletRequiredProps) {
  const { connect, loading, installed, installUrl, wrongNetwork, expectedNetworkName } = useWallet()
  const handleConnect = onConnect ?? (() => void connect())

  return (
    <div className="animate-fade-in-up border-border bg-background border p-8 text-center shadow-md">
      <div className="bg-accent border-border mx-auto mb-4 flex h-14 w-14 items-center justify-center border shadow-md">
        <Wallet className="h-6 w-6" />
      </div>
      <h3 className="mb-2 text-lg font-semibold">Wallet required</h3>
      <p className="text-muted-foreground mb-5 text-sm">
        {message ??
          (!installed
            ? "Freighter wallet is required to interact with on-chain features."
            : wrongNetwork
              ? `Please switch your Freighter network to ${expectedNetworkName}.`
              : "Connect your Freighter wallet to load on-chain data.")}
      </p>

      {!installed ? (
        <a
          href={installUrl}
          target="_blank"
          rel="noreferrer"
          className="bg-primary text-primary-foreground inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold shadow-sm transition-opacity hover:opacity-90"
        >
          Install Freighter
          <ExternalLink className="h-4 w-4" />
        </a>
      ) : (
        <Button onClick={handleConnect} disabled={loading} className="shimmer-on-hover">
          <Wallet className="mr-1 h-4 w-4" />
          {loading ? "Connecting..." : "Connect Wallet"}
        </Button>
      )}
    </div>
  )
}

// ─── NetworkError ─────────────────────────────────────────────────────────────

interface NetworkErrorProps {
  message?: string
  onRetry?: () => void
}

/**
 * Shown when an RPC call or network request fails.
 */
export function NetworkError({ message, onRetry }: NetworkErrorProps) {
  return (
    <div className="animate-fade-in-up border-border bg-background border p-8 text-center shadow-md">
      <div className="border-destructive bg-destructive/10 mx-auto mb-4 flex h-14 w-14 items-center justify-center border shadow-md">
        <WifiOff className="text-destructive h-6 w-6" />
      </div>
      <h3 className="mb-2 text-lg font-semibold">Network error</h3>
      <p className="text-muted-foreground mb-2 text-sm">
        {message ?? "Could not reach the Stellar RPC node. Check your connection and try again."}
      </p>
      <p className="text-muted-foreground mb-5 text-xs">
        If the problem persists, the testnet RPC may be temporarily unavailable.{" "}
        <a
          href="https://status.stellar.org"
          target="_blank"
          rel="noreferrer"
          className="underline hover:opacity-80"
        >
          Check Stellar status
          <ExternalLink className="ml-1 inline h-3 w-3" />
        </a>
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="shimmer-on-hover">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      )}
    </div>
  )
}

// ─── ContractError ────────────────────────────────────────────────────────────

interface ContractErrorProps {
  /** Raw error message from the contract call — will be mapped to friendly text. */
  message: string
  onRetry?: () => void
  /**
   * Contract the failing call targeted (scope name or contract address). Error
   * codes are per-contract, so passing this is what lets `Error(Contract, #1)`
   * read "Quest not found." rather than an unresolved code.
   */
  contract?: string
}

/**
 * Shown when a Soroban contract call fails. Maps `Error(Contract, #N)` codes
 * to human-readable messages.
 */
export function ContractError({ message, onRetry, contract }: ContractErrorProps) {
  const friendlyMessage = mapContractError(message, contract)

  return (
    <div className="animate-fade-in-up border-border bg-background border p-8 text-center shadow-md">
      <div className="border-destructive bg-destructive/10 mx-auto mb-4 flex h-14 w-14 items-center justify-center border shadow-md">
        <AlertCircle className="text-destructive h-6 w-6" />
      </div>
      <h3 className="mb-2 text-lg font-semibold">Contract error</h3>
      <p className="text-muted-foreground mb-5 text-sm">{friendlyMessage}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="shimmer-on-hover">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      )}
    </div>
  )
}

// ─── QuestNotFound ────────────────────────────────────────────────────────────

interface QuestNotFoundProps {
  questId?: number | string
  onBack?: () => void
}

/**
 * Shown when a quest ID does not exist on-chain or is no longer accessible.
 */
export function QuestNotFound({ questId, onBack }: QuestNotFoundProps) {
  return (
    <div className="animate-fade-in-up border-border bg-background border p-8 text-center shadow-md">
      <div className="bg-accent border-border mx-auto mb-4 flex h-14 w-14 items-center justify-center border shadow-md">
        <FileQuestion className="h-6 w-6" />
      </div>
      <h3 className="mb-2 text-lg font-semibold">Quest not found</h3>
      <p className="text-muted-foreground mb-2 text-sm">
        {questId !== undefined
          ? `Quest #${questId} does not exist on the current network.`
          : "This quest does not exist or has been removed."}
      </p>
      <p className="text-muted-foreground mb-5 text-xs">
        Make sure your Freighter wallet is connected to Testnet and the quest ID is correct.
      </p>
      {onBack && (
        <Button onClick={onBack} variant="outline">
          Go Back
        </Button>
      )}
    </div>
  )
}

// ─── SmartError ───────────────────────────────────────────────────────────────

interface SmartErrorProps {
  message: string
  onRetry?: () => void
  onBack?: () => void
  questId?: number | string
  /** Forwarded to `ContractError` so contract codes resolve to the right message. */
  contract?: string
}

/**
 * Classifies the error message and renders the appropriate error component.
 * Use this as a drop-in replacement for the generic ErrorState when you want
 * per-error-type UI automatically.
 */
export function SmartError({ message, onRetry, onBack, questId, contract }: SmartErrorProps) {
  const kind = classifyError(message)

  switch (kind) {
    case "wallet":
      return <WalletRequired message={message} />
    case "network":
      return <NetworkError message={message} onRetry={onRetry} />
    case "not_found":
      return <QuestNotFound questId={questId} onBack={onBack} />
    case "contract":
      return <ContractError message={message} onRetry={onRetry} contract={contract} />
    default:
      return <ContractError message={message} onRetry={onRetry} contract={contract} />
  }
}
