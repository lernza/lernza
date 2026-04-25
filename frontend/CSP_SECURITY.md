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
  report-uri /api/csp-report;
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

### CSP Violation Monitoring
The app includes CSP violation monitoring:
```javascript
document.addEventListener('securitypolicyviolation', (e) => {
    console.error('CSP Violation:', {
        blockedURI: e.blockedURI,
        violatedDirective: e.violatedDirective,
        originalPolicy: e.originalPolicy
    });
});
```

Violations are also reported server-side via `report-uri /api/csp-report`, which logs reports in the deployment's function logs.

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
