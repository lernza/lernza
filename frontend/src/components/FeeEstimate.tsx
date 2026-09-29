interface Props {
  estimatedFee?: string | null
  resourceEstimates?: { cpuInstructions?: number; writeBytes?: number } | null
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
}

export function FeeEstimate({ estimatedFee, resourceEstimates, isLoading, error, onRetry }: Props) {
  if (isLoading) {
    return (
      <div style={{ padding: 12, background: "#f9fafb", borderRadius: 8, fontSize: 13 }}>
        Estimating network costs…
      </div>
    )
  }
  if (error) {
    return (
      <div
        style={{
          padding: 12,
          background: "#fef2f2",
          borderRadius: 8,
          border: "1px solid #fecaca",
          fontSize: 13,
        }}
      >
        <p style={{ color: "#dc2626", marginBottom: 4 }}>Fee estimation failed: {error}</p>
        <p style={{ color: "#6b7280", fontSize: 12 }}>
          You can still proceed — final costs may vary. This is an estimate, not a guarantee.
        </p>
        {onRetry && (
          <button onClick={onRetry} style={{ marginTop: 6, fontSize: 12, color: "#0057FF" }}>
            Retry estimate
          </button>
        )}
      </div>
    )
  }
  if (!estimatedFee && !resourceEstimates) {
    return (
      <div
        style={{
          padding: 12,
          background: "#f9fafb",
          borderRadius: 8,
          fontSize: 13,
          color: "#6b7280",
        }}
      >
        No estimate available — transaction may still succeed. Final network costs may vary.
      </div>
    )
  }
  return (
    <div
      style={{
        padding: 12,
        background: "#f0f4ff",
        borderRadius: 8,
        border: "1px solid #dbeafe",
        fontSize: 13,
      }}
    >
      <p style={{ fontWeight: 600, marginBottom: 4 }}>Estimated network cost</p>
      {estimatedFee && (
        <p>
          Fee: <strong>{estimatedFee} XLM</strong>{" "}
          <span style={{ color: "#6b7280" }}>(estimated — final cost may vary)</span>
        </p>
      )}
      {resourceEstimates && (
        <p style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>
          Resources: {resourceEstimates.cpuInstructions?.toLocaleString() ?? "—"} CPU instructions,{" "}
          {resourceEstimates.writeBytes?.toLocaleString() ?? "—"} write bytes
        </p>
      )}
      <p style={{ color: "#6b7280", fontSize: 12, marginTop: 6 }}>
        This distinguishes estimated fees from reward amounts. Network congestion may affect final
        fee.
      </p>
    </div>
  )
}

export default FeeEstimate
