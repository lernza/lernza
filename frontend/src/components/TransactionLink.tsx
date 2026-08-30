import { env } from "@/lib/env"

type TxStatus = "confirmed" | "pending" | "failed"

interface TransactionLinkProps {
  txHash: string
  status: TxStatus
  label?: string
}

function getExplorerBase(): string {
  const passphrase = env.VITE_SOROBAN_NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015"
  const isPublic = passphrase.toLowerCase().includes("public")
  return isPublic
    ? "https://stellar.expert/explorer/public/tx/"
    : "https://stellar.expert/explorer/testnet/tx/"
}

export function TransactionLink({ txHash, status, label }: TransactionLinkProps) {
  if (status !== "confirmed" || !txHash) {
    return (
      <span className="font-mono text-xs text-zinc-400" aria-label={`${status} transaction`}>
        {label ?? txHash ?? "pending"}
      </span>
    )
  }
  const href = `${getExplorerBase()}${txHash}`
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`View confirmed transaction ${txHash} on Stellar Explorer`}
      className="rounded px-1 font-mono text-xs text-blue-600 hover:underline focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:text-blue-400"
    >
      {label ?? `${txHash.slice(0, 8)}…${txHash.slice(-6)}`} ↗
    </a>
  )
}
