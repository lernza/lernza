// Generate a random 32-byte invite code (hex string)
export function generateInviteCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("")
}

// Hash an invite code to create a commitment (SHA-256)
export async function hashInviteCode(code: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(code)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
}

// Verify an invite code against a commitment
export async function verifyInviteCode(code: string, commitment: string): Promise<boolean> {
  const hash = await hashInviteCode(code)
  return hash.toLowerCase() === commitment.toLowerCase()
}

// Generate a shareable invite link
export function generateInviteLink(questId: number, code: string): string {
  const baseUrl = window.location.origin
  return `${baseUrl}/quest/${questId}/redeem?code=${encodeURIComponent(code)}`
}

// Extract code from URL search params
export function extractInviteCode(searchParams: URLSearchParams): string | null {
  return searchParams.get("code")
}
