/**
 * Vercel Analytics tracking utility.
 * Wraps the window.va object provided by @vercel/analytics.
 */
export function track(event: string, data = {}) {
  if (typeof window !== "undefined") {
    // @ts-ignore - va is injected by Vercel Analytics
    window.va?.track(event, data);
  }
}
