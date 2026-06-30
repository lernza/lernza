// Vercel edge function — receives CSP violation reports and forwards them to
// Sentry's security endpoint so violations appear in the Sentry Issues dashboard.
export const config = { runtime: "edge" }

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(null, { status: 405 })
  }

  const sentryDsn = process.env.VITE_SENTRY_DSN
  if (sentryDsn) {
    try {
      const dsnUrl = new URL(sentryDsn)
      const key = dsnUrl.username
      const projectId = dsnUrl.pathname.replace(/^\//, "")
      const host = dsnUrl.hostname
      const sentryEndpoint = `https://${host}/api/${projectId}/security/?sentry_key=${key}`

      const body = await request.text()
      // Fire-and-forget: we don't want report forwarding to delay the 204 response.
      void fetch(sentryEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": request.headers.get("content-type") ?? "application/csp-report",
        },
        body,
      })
    } catch {
      // Silently swallow — violations must never cause user-visible errors.
    }
  }

  return new Response(null, { status: 204 })
}
