# Content Security Policy Implementation

## Overview
This document outlines the Content Security Policy (CSP) and security headers implemented for Lernza's Netlify deployment.

## Security Headers Added

### Content Security Policy (CSP)
```
Content-Security-Policy: "
  default-src 'self';
  script-src 'self' 'nonce-%nonce%' https://vercel.app;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net;
  font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com https://cdn.jsdelivr.net;
  img-src 'self' data: blob: https:;
  connect-src 'self' https://soroban-testnet.stellar.org https://soroban-futurenet.stellar.org https://horizon-testnet.stellar.org https://vercel.app;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
"
```

### Additional Security Headers
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-Content-Type-Options: nosniff` - Prevents MIME-type sniffing
- `Referrer-Policy: strict-origin-when-cross-origin` - Controls referrer information
- `Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()` - Disables unnecessary browser features
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` - Forces HTTPS
- `X-XSS-Protection: 1; mode=block` - Legacy XSS protection

## Allowed Domains

### Script Sources
- `'self'` - Same origin
- `'nonce-%nonce%'` - Inline scripts with nonce (for Vercel Analytics)
- `https://vercel.app` - Vercel Analytics

### Style Sources
- `'self'` - Same origin
- `'unsafe-inline'` - Inline styles (required for some UI components)
- `https://fonts.googleapis.com` - Google Fonts
- `https://cdn.jsdelivr.net` - CDN libraries

### Font Sources
- `'self'` - Same origin
- `https://fonts.googleapis.com` - Google Fonts
- `https://fonts.gstatic.com` - Google Fonts static assets
- `https://cdn.jsdelivr.net` - CDN fonts

### Connect Sources
- `'self'` - Same origin
- `https://soroban-testnet.stellar.org` - Stellar Soroban RPC (testnet)
- `https://soroban-futurenet.stellar.org` - Stellar Soroban RPC (futurenet)
- `https://horizon-testnet.stellar.org` - Stellar Horizon API (testnet)
- `https://vercel.app` - Vercel Analytics

## Security Features

### XSS Protection
- Blocks inline scripts unless they have a valid nonce
- Only allows scripts from trusted domains
- Prevents data injection attacks

### Clickjacking Protection
- `X-Frame-Options: DENY` prevents site from being embedded in iframes
- `frame-ancestors 'none'` in CSP provides additional protection

### Data Protection
- Controls referrer information leakage
- Disables unnecessary browser features that could be exploited
- Forces HTTPS connections

## Testing

### Local Development
Security headers are only applied during Netlify deployment, not in local development. To test:

1. Deploy to Netlify preview
2. Use browser devtools to check headers
3. Monitor console for CSP violations
4. Test with SecurityHeaders.com

### CSP Violation Reporting
CSP violations are forwarded to Sentry via two mechanisms:

**`report-uri`** (legacy, all browsers):
```
report-uri /api/csp-report
```
The `/api/csp-report` Vercel edge function (`frontend/api/csp-report.ts`) receives
`application/csp-report` POST payloads and forwards them to Sentry's security
endpoint (`https://<host>/api/<project>/security/?sentry_key=<key>`) using the
`VITE_SENTRY_DSN` environment variable.

**`report-to`** (modern Reporting API, Chrome/Edge):
```
report-to csp-endpoint
```
Paired with the `Report-To` response header pointing at the same `/api/csp-report` endpoint.

To verify the receiver is working: open DevTools → Application → Content Security Policy,
or deliberately violate the policy (e.g. `eval(1)` in the browser console) and check the
Sentry Issues dashboard for a new security event within a few seconds.

## Deployment Notes

- Headers are configured in `netlify.toml`
- Applied to all routes with `for = "/*"`
- Netlify processes these headers during build and deployment
- Local development with Vite will not have these headers

## Security Rating

This configuration aims for an A+ rating on SecurityHeaders.com by:
- Implementing comprehensive CSP
- Adding all recommended security headers
- Following modern security best practices
- Minimizing attack surface while maintaining functionality
