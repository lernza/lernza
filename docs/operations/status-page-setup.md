# Public Status Page Setup

## Overview

This document describes Lernza's public status page for communicating platform availability and health to users. A status page provides transparency during incidents and builds user confidence in platform reliability.

## Rationale

Users need visibility into:
- Is the app working or is it a local issue?
- Are there known service disruptions?
- When will service be restored?

A public status page:
- Reduces support burden during outages
- Demonstrates platform reliability
- Enables users to plan usage around maintenance windows
- Provides accountability and transparency

## Status Page Service Selection

### Options Evaluated

| Service | Pros | Cons | Cost |
|---------|------|------|------|
| **Betterstack** | Simple, good design, Slack integration | Limited customization | $49/mo |
| **Vercel Status** | Native Vercel integration, included | Limited to Vercel, basic design | Included |
| **Statuspage.io** | Powerful, industry-standard, many integrations | Complex, learning curve | $50/mo |
| **Self-hosted** | Full control, open-source options | Requires maintenance | $5-20/mo hosting |

**Recommendation**: Start with **Vercel Status** (included, minimal setup), graduate to **Betterstack** if additional features needed.

## Vercel Status Setup (Recommended)

### 1. Enable Vercel Status Page

1. Log in to Vercel dashboard
2. Navigate to Project Settings → Monitoring → Status Page
3. Toggle "Status Page" on
4. Copy the public status page URL

### 2. Add Components to Monitor

Components represent different parts of the platform:

1. **Frontend** (Vercel deployment)
   - Automatically created
   - Displays deployment status

2. **Soroban RPC** (Custom component)
   - Name: "Soroban RPC Endpoint"
   - Status: Operational (default)
   - Description: "Stellar blockchain RPC connectivity"

3. **Contract Functions** (Custom component)
   - Name: "Smart Contracts"
   - Description: "Quest and reward contract operations"

4. **Database / Indexer** (Custom component)
   - Name: "Event Indexer"
   - Description: "Off-chain event processing and quest state tracking"

### 3. Configure Uptime Monitors

Create health checks via Vercel integrations or external service:

**For Frontend:**
- Vercel handles automatically
- Monitors deployment success

**For RPC:**
- External healthcheck script or third-party service
- Check endpoint health every 60 seconds
- Consider: `getHealth()` RPC call or simple HTTP ping

**For Contracts:**
- Test critical contract views
- Simulate user workflow (read quest state)
- Run every 2 minutes

**For Indexer:**
- Monitor event lag (time since last indexed event)
- Alert if lag > 10 minutes
- Run every 5 minutes

### 4. Configure Incident Webhooks

Trigger status page updates from alerts:

1. Create webhook endpoint in Vercel integrations
2. Wire up to alerting system (Sentry, custom monitoring)
3. Auto-update status on incident detection
4. Manually resolve in dashboard after fix

**Webhook Payload Example:**
```json
{
  "component": "soroban-rpc",
  "status": "degraded",
  "message": "Increased latency detected (avg 8s response time)"
}
```

## Betterstack Setup (Advanced)

### 1. Create Betterstack Account

1. Go to https://betterstack.com/status-page
2. Sign up for team account
3. Create new status page for lernza.com

### 2. Add Monitors

Create monitors for key services:

```yaml
Monitors:
  - Name: "Frontend"
    Type: HTTPS
    URL: https://lernza.com
    Interval: 60 seconds
    Expected: Status 200
    
  - Name: "Soroban RPC"
    Type: HTTP POST
    URL: https://soroban-testnet.stellar.org/
    Body: RPC health check
    Interval: 60 seconds
    
  - Name: "Contract Read"
    Type: HTTP GET
    URL: [Your RPC endpoint with contract read]
    Interval: 120 seconds
    
  - Name: "Quest Service"
    Type: HTTPS
    URL: https://lernza.com/api/health
    Interval: 60 seconds
```

### 3. Configure Incident Management

1. **Escalation Policy**
   - Primary: On-call engineer (Slack)
   - Secondary: Tech lead (email + Slack)
   - Critical: Founder (SMS + call)

2. **Notification Channels**
   - Slack: #incidents channel
   - Email: on-call email
   - SMS: escalation phone (optional)

3. **Status Transitions**
   - Automatic: Operational (all monitors green)
   - Automatic: Investigating (any monitor red for 5 min)
   - Manual: Identified (team confirms issue and scope)
   - Manual: Monitoring (fix deployed, validating)
   - Manual: Resolved (incident complete)

### 4. Customization

1. **Branding**
   - Upload lernza logo
   - Set primary color to match brand
   - Add custom domain: status.lernza.com (optional)

2. **Templates**
   - Create incident templates for common scenarios
   - Database downtime, RPC failure, deployment rollback

3. **Subscribers**
   - Embed subscriber widget on lernza.com
   - Allow users to get email/SMS on incidents
   - Display subscriber count as proof of transparency

## Website Integration

### 1. Footer Link

Add to lernza.com footer:

```html
<footer>
  ...
  <a href="https://status.lernza.com" target="_blank">
    Status Page
  </a>
  ...
</footer>
```

### 2. Status Widget (Optional)

Embed mini status widget on homepage:

```html
<!-- Betterstack embed (if using) -->
<script src="https://uptime.betterstack.com/status-page-widget/js/embed.js"></script>
<div class="better-status-page"
     data-status-page-url="https://lernza.betterstack.com">
</div>
```

### 3. Help Center Reference

Link from FAQ / support pages:

> **Is the app down?** Check our [Status Page](https://status.lernza.com) for real-time updates.

## Incident Communication Protocol

### Status Page Updates During Incident

1. **Incident starts** (0 min)
   - Create incident in status page
   - Status: "Investigating"
   - Message: "We're investigating reports of [symptom]"

2. **Every 15-30 minutes** (ongoing)
   - Post progress update
   - Message: "Root cause identified: [brief description]. Working on fix."

3. **Mitigation deployed** (e.g., 45 min)
   - Update status to "Monitoring"
   - Message: "Fix deployed. Monitoring for stability."

4. **Resolved** (e.g., 60 min)
   - Update status to "Resolved"
   - Message: "Incident resolved. All systems operational. Post-mortem scheduled for [date]."

### Example Incident Communication

```
Initial (0 min):
"🔴 Investigating: Quest deposit feature temporarily unavailable. 
We're looking into the issue and will provide updates every 15 minutes."

Update (15 min):
"🟡 Identified: RPC endpoint latency spike (8s avg response time). 
Failover in progress."

Update (30 min):
"🟡 Mitigation: Switched to backup RPC endpoint. Monitoring stability."

Resolution (45 min):
"🟢 Resolved: Service fully restored at 14:45 UTC. 
Thanks for your patience. We're conducting a post-mortem."
```

## Monitoring & Alerting Setup

### Health Check Scripts

**Option 1: External Service (Betterstack / Uptime Robot)**
- Pre-configured monitoring
- Automatic incident triggers
- Status page updates

**Option 2: Custom Scripts**

```bash
#!/bin/bash
# health-check.sh - Run as cron job every 60 seconds

check_frontend() {
  http_code=$(curl -s -o /dev/null -w "%{http_code}" \
    -I https://lernza.com)
  [ "$http_code" = "200" ]
}

check_rpc() {
  response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"getHealth","params":[],"id":1}' \
    https://soroban-testnet.stellar.org/)
  echo $response | grep -q "healthy" || echo $response | grep -q "result"
}

check_contract() {
  # Contract view call via RPC
  # Returns error if contract unavailable
  rpc_call "get_quest" "address:test"
}

# Send results to status page API
for check in frontend rpc contract; do
  if ! $check; then
    curl -X POST https://status-api.example.com/incident \
      -d "{\"component\":\"$check\",\"status\":\"down\"}"
  fi
done
```

**Option 3: GitHub Actions Workflow**

```yaml
name: Health Check
on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Check services
        run: |
          # Test frontend
          curl -f https://lernza.com || exit 1
          # Test RPC
          curl -f -X POST https://soroban-testnet.stellar.org/ || exit 1
      - name: Report status
        if: failure()
        run: |
          curl -X POST https://status-api.example.com/incident \
            -d '{"severity":"P2","message":"Health check failed"}'
```

## Dashboard & Analytics

### Key Metrics to Track

1. **Uptime %**: Target 99.5% (max 3.6 hours downtime/month)
2. **MTTR** (Mean Time To Resolve): Target < 30 min for P2
3. **MTBF** (Mean Time Between Failures): Track trend
4. **Incident Count**: P1/P2/P3/P4 breakdown
5. **User Impact**: Rough count of affected users per incident

### Betterstack Analytics

Betterstack provides:
- Uptime trends (daily/weekly/monthly)
- Incident timeline
- On-call response times
- Subscriber engagement

## FAQ & Support

### Add to Help Center

> **Why do you have a status page?**
> Our status page provides real-time visibility into platform health. 
> Subscribe to get notified of incidents and maintenance windows.

> **How do I report an issue?**
> If something seems broken but status page shows green, 
> please contact support@lernza.com with details.

> **How often do you update the status page?**
> We update status during active incidents. Our on-call team aims 
> to post initial updates within 5 minutes of detection.

## Maintenance Windows

Schedule planned maintenance via status page:

1. **Announcement**: 1 week before
   - Post scheduled maintenance notification
   - Specify affected components and time window

2. **During maintenance**: 
   - Update status to "Scheduled Maintenance"
   - Reassure users

3. **After maintenance**:
   - Update status to "Operational"
   - Thank users for patience

**Example**:
```
🔵 Scheduled Maintenance: Contract upgrade
Scheduled: June 15, 2024, 02:00-04:00 UTC
Duration: Up to 2 hours
Affected: Quest creation and deposit features
We apologize for any inconvenience.
```

## Launch Checklist

- [ ] Create status page account (Vercel Status or Betterstack)
- [ ] Add all service components
- [ ] Configure monitors and health checks
- [ ] Set up incident automation / webhooks
- [ ] Add status page link to lernza.com footer
- [ ] Create incident communication templates
- [ ] Train on-call on incident workflow
- [ ] Announce status page to users (email, Discord, Twitter)
- [ ] Test incident workflow (simulation)
- [ ] Monitor for first week, adjust as needed

## References

- Vercel Status: https://vercel.com/docs/concepts/deployments/status-page
- Betterstack: https://betterstack.com/docs/uptime/
- Statuspage.io: https://www.atlassian.com/software/statuspage
- [Incident Response Playbook](./incident-response.md)
- [Deployment Rollback](./deployment-rollback.md)
