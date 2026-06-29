# Incident Response Playbook

## Overview

This playbook defines Lernza's incident response procedures, escalation chain, communication templates, and post-incident review process. All on-call engineers must familiarize themselves with this document.

## Severity Scale

Incidents are classified by impact to production users:

| Severity | Definition | Examples | Response Time | On-Call |
|----------|-----------|----------|----------------|---------|
| **P1** | Complete service outage or data loss | All users cannot access app, contract exploit, token loss | Immediate | Full team page |
| **P2** | Critical feature broken for majority of users | Deposit/withdraw fails, contract paused, payment processing broken | < 15 min | On-call + tech lead |
| **P3** | Significant feature impaired or partial outage | Some users cannot complete quest, slow RPC responses | < 1 hour | On-call |
| **P4** | Minor issue, workaround exists | UI bug, non-critical feature down, slow performance | < 4 hours | On-call |

## Alert Sources

Incidents may originate from:

1. **Automated Alerts**
   - Error rate threshold exceeded (> 5% of requests fail)
   - RPC endpoint health check failed
   - Vercel deployment failure
   - Smart contract event anomalies

2. **Manual Reports**
   - User support tickets (#support-incidents Slack)
   - Community reports (Discord, GitHub issues)
   - Team observations (Slack #incidents)

3. **Monitoring**
   - Application Performance Monitoring (APM)
   - Contract event logs
   - Transaction tracking via Horizon
   - Status page uptime checks

## Escalation Chain

### On-Call Engineer Rotation

- **Primary on-call**: Responds to all alerts (page or Slack)
- **Secondary on-call**: Escalation backup if primary unresponsive within 5 minutes
- **Tech lead**: Escalated for P1/P2 incidents
- **Founder**: Escalated for P1 incidents impacting mainnet

### Escalation Procedure

1. **Alert received** → Primary on-call acknowledges in Slack/PagerDuty
2. **No response (5 min)** → Page secondary on-call
3. **P1 incident** → Immediately page tech lead + notify #incidents
4. **P1 + mainnet** → Immediately page founder
5. **Unresolved (30 min)** → Escalate to full team for support

### Contact Information

| Role | Slack | Phone | Email |
|------|-------|-------|-------|
| Primary On-Call | @on-call-primary | [See Slack] | [See Slack] |
| Secondary On-Call | @on-call-secondary | [See Slack] | [See Slack] |
| Tech Lead | @[name] | [Phone] | [Email] |
| Founder | @[name] | [Phone] | [Email] |

## Incident Response Flow

### 1. Detection & Acknowledgment (0-2 min)

```
Alert triggered → On-call receives notification → 
Acknowledge in Slack "Incident acknowledged, investigating" →
Create #incident-[date]-[time] channel
```

### 2. Initial Triage (2-10 min)

- **Severity assessment**: Classify as P1/P2/P3/P4
- **Scope**: Which users/features affected?
- **Symptoms**: What exactly is broken?
- **Root cause hypothesis**: Database? Contract? Network? RPC?

**Triage Checklist:**
- [ ] Confirmed reproducible
- [ ] Impact scope documented
- [ ] Root cause hypothesis
- [ ] Severity assigned
- [ ] ETA for fix estimated

### 3. Mitigation (10-30 min)

**For P1 incidents:**
- [ ] Post status page: "Investigating issue affecting [feature]"
- [ ] Page tech lead
- [ ] Begin war room (Zoom link in #incidents)
- [ ] Start live incident document (link in channel)

**For P2 incidents:**
- [ ] Post to #incidents: Severity, what's broken, ETA
- [ ] Update status page to "Degraded"
- [ ] Attempt quick fix or workaround

**For P3/P4:**
- [ ] Post to #incidents with severity and context
- [ ] No immediate status page update needed

**Immediate Actions:**
- Restart service if applicable (e.g., event indexer)
- Check RPC health, switch to fallback if needed
- Check Vercel deployment status
- Review recent contract/code changes

### 4. Resolution (30-120 min)

**Option A: Quick Fix**
- Identify minimal code change
- Test locally or on testnet
- Deploy via standard process
- Monitor for 5 minutes

**Option B: Rollback**
- Revert last deployment
- See [Deployment Rollback Runbook](./deployment-rollback.md)
- Validate service restoration

**Option C: Workaround**
- If permanent fix delayed
- Document workaround for users
- Plan permanent fix for next sprint

### 5. Communication Template

#### Initial Notification (upon discovery)
```
🚨 Incident: [Brief description]
Severity: P[1-4]
Affected: [Users/feature]
Status: Investigating
ETA: [estimate]
Updates: [Channel/link]
```

#### Status Update (every 15 min during incident)
```
Status: Still investigating / Mitigation in progress / Resolved
Progress: [What we've tried]
Next Steps: [What we're doing]
ETA: [Updated estimate]
```

#### Resolution Notification
```
✅ Resolved: [Brief description]
Root Cause: [What happened]
Duration: [HH:MM]
Action Taken: [Fix/rollback/workaround]
Monitoring: [Watching for recurrence]
Post-mortem: [Scheduled date/time]
```

## Post-Incident Review

### Timeline (within 24 hours of incident)

**1. Incident Commander** (on-call who handled it)
- Compile incident timeline in shared doc
- Note exact timestamps, actions taken, outcome
- Link all relevant logs, metrics, commits

**2. Post-Mortem Meeting** (2:1 engineer:observer ratio)
- Attendees: On-call, tech lead, relevant engineers, interested parties
- Duration: 30-60 minutes
- Facilitator: Tech lead or founder

### Post-Mortem Agenda

1. **Timeline Review** (10 min)
   - What happened, when, how it was detected
   - Actions taken and their outcomes

2. **Root Cause Analysis** (10 min)
   - Why did it happen?
   - What conditions made it possible?
   - Why wasn't it caught earlier?

3. **Impact Assessment** (5 min)
   - How many users affected?
   - Duration of outage
   - Any data loss or inconsistency?

4. **Action Items** (10 min)
   - What can we do to prevent recurrence?
   - What can we do to detect faster?
   - What can we do to resolve faster?

5. **Follow-up** (5 min)
   - Assign owners for action items
   - Set target dates
   - Document in GitHub issues

### Action Item Template

- **Owner**: [Name]
- **Action**: [Specific task]
- **Category**: [Prevention / Detection / Resolution]
- **Target Date**: [Date]
- **Tracking**: [GitHub issue link]

Example:
- Owner: Alice
- Action: Add automated contract balance checks to detect funding issues
- Category: Detection
- Target: 2 weeks
- Tracking: #1234

## Special Cases

### RPC Endpoint Failure

1. Automatic failover via health checks should activate
2. If all endpoints down:
   - Page tech lead immediately
   - Switch to public RPC endpoint temporarily (see `frontend/src/lib/contracts/client.ts`)
   - Update status page
   - Investigate RPC provider issue

### Contract Exploit / Exploit Attempt

1. **Immediate actions:**
   - Contact founder / security team
   - Do NOT attempt to fix contract (re-deployment risk)
   - Consider pause operation if available
   - Preserve logs and transaction details

2. **Communication:**
   - P1 severity (likely)
   - Minimal disclosure initially
   - Coordinate with external security if needed
   - See SECURITY.md for detailed procedures

### Data Loss / Corruption

1. **Verify impact:**
   - Confirm data actually lost (not just display bug)
   - Check on-chain contract state
   - Query Horizon transaction history

2. **Escalation:**
   - P1 severity
   - Immediate page of founder
   - War room decision: recovery feasible or user compensation?

## Tools & Resources

### Monitoring & Dashboards

- Vercel Deployments: https://vercel.com/
- Stellar Testnet Explorer: https://stellar.expert/explorer/testnet
- Stellar Mainnet Explorer: https://stellar.expert/explorer/public
- APM Dashboard: [To be configured]
- Status Page: [Link per issue #979]

### Documentation

- [Deployment Rollback Runbook](./deployment-rollback.md)
- [SECURITY.md](../SECURITY.md) - Security incident procedures
- [Contract Upgrade Runbook](./contract-upgrade-runbook.md)

### Slack Channels

- #incidents - Incident discussion
- #on-call - On-call scheduling and handoff
- #support-incidents - User-reported issues
- #deployments - CI/CD status

## On-Call Handoff

At end of shift:

1. **Outgoing on-call**
   - Review open issues in #incidents
   - Brief incoming on-call on status
   - Provide context on any ongoing investigations
   - Update on-call calendar

2. **Incoming on-call**
   - Acknowledge receipt of handoff
   - Review recent incidents
   - Test alert reception
   - Confirm reachability

**Handoff Template:**
```
On-Call Handoff: [Date] [Shift]
Incoming: @[name]
Outgoing: @[name]

Active Issues: [None / List items]
Recent Changes: [What deployed recently]
Watch For: [Any known issues being monitored]
```

## Continuous Improvement

- Review and update this playbook quarterly
- After each P1/P2 incident, assign someone to improve this doc
- Conduct annual incident response drill (simulate P1, test procedures)
- Keep escalation chain and contact info current
