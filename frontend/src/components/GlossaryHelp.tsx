import { useState } from "react";

const TERMS: Record<string, { title: string; def: string; note: string }> = {
  wallet: { title: "Wallet", def: "A Stellar keypair that signs transactions to enroll, submit, and claim rewards.", note: "Testnet: friendbot-funded. Production: holds real funds." },
  testnet: { title: "Testnet", def: "Stellar's test network. Tokens have no value and the network resets.", note: "Use testnet to try quests risk-free." },
  escrow: { title: "Escrow", def: "Tokens locked in the contract until milestones are verified, then released.", note: "Testnet uses test tokens. Production locks real value." },
  contract: { title: "Contract", def: "On-chain Soroban program (quest, milestone, rewards) enforcing rules without a central server.", note: "Testnet and mainnet have different contract addresses." },
  verification: { title: "Verification", def: "Review step confirming milestone completion — owner or peer-review.", note: "Testnet may mock verification. Production is always on-chain." },
  transaction: { title: "Transaction", def: "A Stellar ledger operation signed by a wallet and submitted via RPC.", note: "Testnet is free. Production costs a small fee." },
};

export function GlossaryLink({ term, children }: { term: keyof typeof TERMS; children?: string }) {
  const [open, setOpen] = useState(false);
  const info = TERMS[term];
  if (!info) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      {children ?? info.title}
      <button
        type="button"
        aria-label={`What is ${info.title}?`}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 18, height: 18, borderRadius: "50%", border: "1px solid var(--border)",
          background: "var(--muted)", fontSize: 11, lineHeight: "16px", cursor: "pointer"
        }}
      >
        ?
      </button>
      {open && (
        <span role="dialog" aria-label={`${info.title} definition`} style={{ position: "absolute", zIndex: 20, maxWidth: 320, padding: 12, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "var(--shadow)" }}>
          <strong>{info.title}</strong>: {info.def} <em>{info.note}</em> <a href="/docs/GLOSSARY.md" style={{ textDecoration: "underline" }}>Glossary</a>
        </span>
      )}
    </span>
  );
}
