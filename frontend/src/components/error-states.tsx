import { AlertCircle, WifiOff, FileQuestion, Wallet, RefreshCw, ExternalLink, AlertTriangle, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { mapContractError, classifyError } from "@/lib/contract-errors"
import { useWallet } from "@/hooks/use-wallet"

// ─── NetworkMismatchBanner ──────────────────────────────────────────────────

export function NetworkMismatchBanner() {
  const { wrongNetwork, networkName, expectedNetworkName, installUrl } = useWallet()

  if (!wrongNetwork) return null

  return (
    <div className="bg-warning/15 border-warning/50 border-b px-4 py-3 text-sm">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-warning h-5 w-5 shrink-0" />
          <span>
            <strong>Network Mismatch:</strong> Your wallet is on{" "}
            <span className="font-semibold underline">{networkName ?? "a different network"}</span>, but Lernza expects{" "}
            <span className="font-semibold">{expectedNetworkName}</span>.
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span>Switch networks in Freighter extension settings.</span>
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

export function WalletErrorAlert() {
  const { error, retryConnect, installUrl } = useWallet()

  if (!error) return null

  const isNotInstalled = error.code === "freighter_not_installed"
  const isRejected = error.code === "user_rejected"
  const isTimeout = error.code === "timeout"

  return (
    <div className="bg-destructive/10 border-destructive border p-4 shadow-sm animate-fade-in-down">
      <div className="flex items-start gap-3">
        <AlertCircle className="text-destructive h-5 w-5 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-sm">Wallet Connection Error</h4>
          <p className="text-muted-foreground text-xs mt-1">{error.message}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {isNotInstalled ? (
              <a
                href={installUrl}
                target="_blank"
                rel="noreferrer"
                className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1.5 inline-flex items-center gap-1 hover:opacity-90 transition-opacity"
              >
                Install Freighter Extension
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <Button size="sm" onClick={retryConnect} className="text-xs h-8">
                <RefreshCw className="h-3 w-3 mr-1" />
                {isTimeout || isRejected ? "Try Connecting Again" : "Retry"}
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
  const handleConnect = onConnect ?? connect

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
          className="bg-primary text-primary-foreground hover:opacity-90 inline-flex items-center gap-2 px-5 py-2.5 font-bold text-sm shadow-sm transition-opacity"
        >
          Install Freighter
          <ExternalLink className="h-4 w-4" />
        </a>
      ) : (
        <Button onClick={handleConnect} disabled={loading} className="shimmer-on-hover">
          <Wallet className="h-4 w-4 mr-1" />
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
}

/**
 * Shown when a Soroban contract call fails. Maps `Error(Contract, #N)` codes
 * to human-readable messages.
 */
export function ContractError({ message, onRetry }: ContractErrorProps) {
  const friendlyMessage = mapContractError(message)

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
}

/**
 * Classifies the error message and renders the appropriate error component.
 * Use this as a drop-in replacement for the generic ErrorState when you want
 * per-error-type UI automatically.
 */
export function SmartError({ message, onRetry, onBack, questId }: SmartErrorProps) {
  const kind = classifyError(message)

  switch (kind) {
    case "wallet":
      return <WalletRequired message={message} />
    case "network":
      return <NetworkError message={message} onRetry={onRetry} />
    case "not_found":
      return <QuestNotFound questId={questId} onBack={onBack} />
    case "contract":
      return <ContractError message={message} onRetry={onRetry} />
    default:
      return <ContractError message={message} onRetry={onRetry} />
  }
}
