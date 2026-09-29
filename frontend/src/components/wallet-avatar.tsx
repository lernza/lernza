interface WalletAvatarProps {
  address: string
  size?: "sm" | "md" | "lg"
}

const SIZE_CLASSES: Record<NonNullable<WalletAvatarProps["size"]>, string> = {
  sm: "h-10 w-10",
  md: "h-16 w-16",
  lg: "h-20 w-20",
}

export function WalletAvatar({ address, size = "lg" }: WalletAvatarProps) {
  const colors = ["#FACC15", "#22C55E", "#000000", "#F5F5F4", "#FFFFFF"]
  const cells = Array.from({ length: 16 }, (_, i) => {
    const charCode = address.charCodeAt(i % address.length) || 0
    return colors[charCode % colors.length]
  })

  const sizeClass = SIZE_CLASSES[size]

  return (
    <div
      className={`border-border grid shrink-0 grid-cols-4 overflow-hidden border shadow-md ${sizeClass}`}
      aria-label="Wallet avatar"
      role="img"
    >
      {cells.map((color, i) => (
        <div key={i} style={{ backgroundColor: color }} />
      ))}
    </div>
  )
}
