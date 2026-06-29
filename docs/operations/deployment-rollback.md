# Deployment Rollback Runbook

## Overview

This document covers how to roll back a failed or problematic frontend or contract deployment. Rollbacks should be executed when a deployment introduces critical bugs, security issues, or causes service degradation.

## Prerequisites

- Access to GitHub repository
- Access to Vercel dashboard (for frontend)
- Stellar test/mainnet contract authority account (for contracts)
- Slack access for team communication
- Deployment status page access

## Frontend Rollback (Vercel)

### Quick Rollback via Previous Build

1. **Identify the previous stable build**
   - Visit Vercel dashboard: https://vercel.com/
   - Navigate to the lernza project
   - Look for the last deployment marked as "Production"
   - Note the commit hash and timestamp

2. **Revert to previous build**
   - In Vercel dashboard, find the stable deployment
   - Click the three-dot menu → "Redeploy"
   - Confirm the rollback

3. **Verify deployment**
   - Check Vercel deployment status
   - Test frontend at production URL
   - Verify all critical user flows work

### Git-Based Rollback

1. **Identify the stable commit**
   ```bash
   git log --oneline frontend/ | head -20
   ```

2. **Create a rollback commit**
   ```bash
   git revert <bad-commit-hash>
   git push origin main
   ```

3. **Wait for CI/CD**
   - GitHub Actions will run automatically
   - Vercel will auto-deploy on merge to main
   - Monitor deployment in Vercel dashboard

### Environment Variable Restoration

If the rollback requires reverting environment variable changes:

1. **Access Vercel Settings**
   - Project Settings → Environment Variables
   - Compare current vs. previous values

2. **Restore previous values**
   - Update environment variables to pre-deployment state
   - Redeploy with "Redeploy Project" button

3. **Notify team**
   - Document which env vars were changed
   - Update status page

## Contract Rollback (Stellar)

### Pre-Rollback Checks

1. **Verify contract authority**
   - Confirm you have access to the contract admin account
   - Check account balance for transaction fees

2. **Identify stable version**
   ```bash
   git log --oneline contracts/ | head -20
   ```

3. **Locate previous contract WASM**
   - Check GitHub releases or build artifacts
   - Verify integrity against tag/commit hash

### Rollback Process

1. **Build the stable contract**
   ```bash
   git checkout <stable-commit-hash>
   stellar contract build
   ```

2. **Deploy the rollback contract**
   - Use the stable WASM binary
   - Submit via Soroban RPC (testnet or mainnet)
   - Monitor transaction status

3. **Verify contract state**
   - Inspect on-chain storage
   - Run contract views to confirm data integrity
   - Test contract operations via frontend

### Post-Rollback Validation

- Confirm contract address in environment config
- Update frontend with new contract address if changed
- Redeploy frontend to pick up new address
- Run smoke tests end-to-end

## Communication & Status Page

### Notify Team

1. **Slack announcement** (immediate)
   - Channel: #incidents
   - Message: "Rollback initiated for [service] due to [reason]. ETA: [time]"

2. **Update status page**
   - Set service to "Degraded" or "Maintenance"
   - Post: "We are rolling back a recent deployment to restore stability"

3. **Post-mortem notification** (after rollback succeeds)
   - "Rollback complete. Service restored. Post-mortem scheduled for [date]"

## Post-Rollback Steps

1. **Verify all systems operational**
   - Test critical user flows
   - Monitor error logs and metrics
   - Confirm alerts are healthy

2. **Document what went wrong**
   - Collect logs and error traces
   - Note the exact symptom/failure mode
   - Identify root cause

3. **Schedule post-mortem**
   - Within 24 hours of incident
   - Include on-call engineer and affected teams
   - Create action items to prevent recurrence

4. **Implement fix and retry**
   - Once root cause identified
   - Deploy fix with additional testing
   - Use canary deployment to verify before full rollout

## Automation & Safeguards

### Deployment Safeguards

- GitHub branch protection: require code review before merge
- Pre-deployment smoke tests: automated checks before Vercel deploy
- Staged rollout: consider canary deployment for large changes
- Feature flags: allow disabling features without rollback

### Quick Links

- Vercel Dashboard: https://vercel.com/
- GitHub Releases: https://github.com/lernza/lernza/releases
- Stellar Testnet Explorer: https://stellar.expert/explorer/testnet
- Stellar Mainnet Explorer: https://stellar.expert/explorer/public
- Status Page: [to be configured per issue #979]

## Escalation

If rollback fails or causes further issues:

1. **Immediate response**
   - Page the on-call engineer
   - Escalate to tech lead
   - Consider disabling the affected feature

2. **Communication**
   - Update status page: "Investigating rollback failure"
   - Post detailed incident description to #incidents
   - Provide ETA for resolution

3. **Investigation**
   - Preserve logs and transaction details
   - Do not attempt multiple rollbacks without review
   - Schedule immediate war room if critical
