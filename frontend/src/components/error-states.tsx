import { AlertCircle, WifiOff, FileQuestion, Wallet, RefreshCw, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { mapContractError, classifyError } from "@/lib/contract-errors"
import { useWallet } from "@/hooks/use-wallet"

// ─── WalletRequired ───────────────────────────────────────────────────────────

interface WalletRequiredProps {
  message?: string
  onConnect?: () => void
}

/**
 * Inline error shown inside a page/component when the user needs to connect
 * their wallet to proceed. Not a route guard — use WalletRequiredRoute for that.
 */
export function WalletRequired({ message, onConnect }: WalletRequiredProps) {
  const { connect, loading } = useWallet()
  const handleConnect = onConnect ?? connect

  return (
    <div className="animate-fade-in-up border-border bg-background border-[3px] p-8 text-center shadow-[4px_4px_0_var(--color-border)]">
      <div className="bg-primary border-border mx-auto mb-4 flex h-14 w-14 items-center justify-center border-[3px] shadow-[3px_3px_0_var(--color-border)]">
        <Wallet className="h-6 w-6" />
      </div>
      <h3 className="mb-2 text-lg font-black">Wallet required</h3>
      <p className="text-muted-foreground mb-5 text-sm">
        {message ?? "Connect your Freighter wallet to load on-chain data."}
      </p>
      <Button onClick={handleConnect} disabled={loading} className="shimmer-on-hover">
        <Wallet className="h-4 w-4" />
        {loading ? "Connecting..." : "Connect Wallet"}
      </Button>
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
    <div className="animate-fade-in-up border-border bg-background border-[3px] p-8 text-center shadow-[4px_4px_0_var(--color-border)]">
      <div className="border-destructive bg-destructive/10 mx-auto mb-4 flex h-14 w-14 items-center justify-center border-[3px] shadow-[3px_3px_0_var(--color-border)]">
        <WifiOff className="text-destructive h-6 w-6" />
      </div>
      <h3 className="mb-2 text-lg font-black">Network error</h3>
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
    <div className="animate-fade-in-up border-border bg-background border-[3px] p-8 text-center shadow-[4px_4px_0_var(--color-border)]">
      <div className="border-destructive bg-destructive/10 mx-auto mb-4 flex h-14 w-14 items-center justify-center border-[3px] shadow-[3px_3px_0_var(--color-border)]">
        <AlertCircle className="text-destructive h-6 w-6" />
      </div>
      <h3 className="mb-2 text-lg font-black">Contract error</h3>
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
    <div className="animate-fade-in-up border-border bg-background border-[3px] p-8 text-center shadow-[4px_4px_0_var(--color-border)]">
      <div className="bg-primary border-border mx-auto mb-4 flex h-14 w-14 items-center justify-center border-[3px] shadow-[3px_3px_0_var(--color-border)]">
        <FileQuestion className="h-6 w-6" />
      </div>
      <h3 className="mb-2 text-lg font-black">Quest not found</h3>
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
