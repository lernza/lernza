import { useEffect, useState } from "react"
import { ExternalLink, Loader2, Sparkles, Wallet, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { getAllWalletAdapters, type WalletAdapter, type WalletId } from "@/lib/wallets"

interface WalletConnectionModalProps {
  open: boolean
  onClose: () => void
  onSelectWallet: (walletId: WalletId) => Promise<void>
  connectingWalletId?: WalletId | null
  error?: string | null
}

interface WalletItemStatus {
  adapter: WalletAdapter
  installed: boolean
}

export function WalletConnectionModal({
  open,
  onClose,
  onSelectWallet,
  connectingWalletId,
  error,
}: WalletConnectionModalProps) {
  const [walletStatuses, setWalletStatuses] = useState<WalletItemStatus[]>([])

  useEffect(() => {
    let active = true
    const checkWallets = async () => {
      const adapters = getAllWalletAdapters()
      const statuses = await Promise.all(
        adapters.map(async adapter => {
          const installed = await Promise.resolve(adapter.isInstalled())
          return { adapter, installed }
        })
      )
      if (active) {
        setWalletStatuses(statuses)
      }
    }

    if (open) {
      void checkWallets()
    }

    return () => {
      active = false
    }
  }, [open])

  if (!open) return null

  return (
    <Dialog open={open}>
      <DialogContent className="border-border bg-card max-w-md border-2 p-6 shadow-xl">
        <div className="flex items-center justify-between pb-3">
          <DialogHeader className="mb-0">
            <div className="flex items-center gap-2">
              <div className="bg-accent/10 border-border flex h-8 w-8 items-center justify-center border">
                <Wallet className="text-accent h-4 w-4" />
              </div>
              <DialogTitle className="text-xl font-bold">Connect Wallet</DialogTitle>
            </div>
            <DialogDescription className="text-muted-foreground text-xs">
              Choose your preferred Stellar wallet to sign in and interact with on-chain quests.
            </DialogDescription>
          </DialogHeader>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="border-border hover:bg-secondary text-muted-foreground hover:text-foreground flex h-8 w-8 cursor-pointer items-center justify-center border transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="bg-destructive/10 border-destructive/20 text-destructive my-3 rounded-lg border p-3 text-xs font-medium">
            {error}
          </div>
        )}

        <div className="mt-2 space-y-2.5">
          {walletStatuses.map(({ adapter, installed }) => {
            const isConnecting = connectingWalletId === adapter.id

            return (
              <div
                key={adapter.id}
                className="border-border bg-background hover:bg-secondary/60 flex items-center justify-between border-2 p-3 transition-all"
              >
                <button
                  type="button"
                  disabled={Boolean(connectingWalletId)}
                  onClick={() => onSelectWallet(adapter.id)}
                  className="flex flex-1 cursor-pointer items-center gap-3 text-left focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="bg-card border-border flex h-10 w-10 shrink-0 items-center justify-center border p-1.5 shadow-sm">
                    {adapter.id === "freighter" ? (
                      <Sparkles className="text-accent h-5 w-5" />
                    ) : adapter.id === "xbull" ? (
                      <Wallet className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    ) : adapter.id === "albedo" ? (
                      <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Wallet className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground text-sm font-bold">{adapter.name}</span>
                      {adapter.id === "freighter" && (
                        <Badge variant="outline" className="text-[10px] uppercase">
                          Recommended
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground line-clamp-1 text-xs">{adapter.description}</p>
                  </div>
                </button>

                <div className="ml-2 flex items-center gap-2">
                  {isConnecting ? (
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span className="text-muted-foreground hidden sm:inline">Connecting</span>
                    </div>
                  ) : installed ? (
                    <button
                      type="button"
                      onClick={() => onSelectWallet(adapter.id)}
                      className="bg-accent text-accent-foreground border-border hover:bg-accent/90 cursor-pointer border px-3 py-1.5 text-xs font-bold shadow-sm transition-all"
                    >
                      Connect
                    </button>
                  ) : (
                    <a
                      href={adapter.installUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border-border bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground flex items-center gap-1 border px-2.5 py-1.5 text-xs font-semibold transition-all"
                    >
                      Install <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="border-border bg-secondary/50 mt-4 border p-3 text-center">
          <p className="text-muted-foreground text-xs">
            Need help? Make sure your chosen wallet is unlocked and set to Testnet or Mainnet.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
