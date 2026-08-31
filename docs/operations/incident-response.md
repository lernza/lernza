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

## Testnet Incident Response & Emergency Pause Procedures

### Common Testnet Incident Scenarios

1. **Faulty Contract Deployment or Misconfiguration**
   - **Symptoms:** Contract reverts on basic invocations, invalid contract IDs set in frontend, mismatched WASM hashes.
   - **Response:** Trigger rollback or update deployment config, verify WASM hash against release manifest, issue frontend patch.

2. **Compromised Privileged Admin Wallet**
   - **Symptoms:** Unauthorized contract parameter modifications, unexpected `pause`/`unpause` calls, unauthorized admin key transfer attempt.
   - **Response:** Execute emergency key rotation (`transfer_admin` to secure multi-sig keypair), pause target contracts, audit recent transactions on Stellar Horizon.

3. **Harmful Contract Behavior or Exploitation Attempt**
   - **Symptoms:** Token balance drain attempt, double claim of rewards, state corruption.
   - **Response:** Execute emergency `pause` on Rewards and Milestone contracts immediately, investigate transaction payload, prepare emergency patch release.

4. **Stellar RPC Network Outage or Degradation**
   - **Symptoms:** Frontend transaction timeout, RPC node 5xx errors, RPC sync lag.
   - **Response:** Switch frontend fallback RPC endpoints (`frontend/src/lib/contracts/client.ts`), update status page, monitor Stellar Testnet status.

5. **Token Pool Drainage / Unauthorized Reward Claims**
   - **Symptoms:** Sudden drop in contract token balance without matching milestone completions.
   - **Response:** Pause Rewards contract (`stellar contract invoke --fn pause`), verify enrollee signatures, audit event log indexer.

---

## Privileged Operations & Authorization Matrix

| Privileged Operation | Target Contract(s) | Function Signature | Required Authorization | Impact / Purpose |
|----------------------|--------------------|--------------------|------------------------|------------------|
| **Emergency Pause** | Rewards, Milestone | `pause(admin: Address)` | Admin Signature (Single / 2-of-3 Multi-Sig) | Blocks state-changing calls (fund, claim, distribute) |
| **Emergency Unpause** | Rewards, Milestone | `unpause(admin: Address)` | Admin Signature (Single / 2-of-3 Multi-Sig) | Restores regular contract operations |
| **Admin Key Rotation** | All Contracts | `transfer_admin(new_admin: Address)` | Current Admin Signature | Rotates privileged key to secure keypair or multi-sig |
| **Contract Upgrade** | All Contracts | `upgrade(new_wasm_hash: BytesN<32>)` | Admin Signature (with timelock when enabled) | Replaces WASM bytecode on-chain |

---

## Non-Production Emergency Action Testing Procedures

Before executing emergency actions on live testnet or mainnet, emergency pause capabilities must be verified in non-production environments:

### 1. Automated Unit/Integration Test Verification
Run local cargo tests to confirm contract pause invariants:
```bash
cargo test -p rewards test_pause_unpause
cargo test -p milestone test_pause_blocks_milestone_writes_until_unpaused
```

### 2. Standalone / Testnet Non-Production Dry-Run
Execute pause command on standalone test node before live intervention:
```bash
# 1. Execute Pause in dry-run mode
stellar contract invoke \
  --id <REWARDS_CONTRACT_ID> \
  --source admin-keypair \
  --network testnet \
  -- pause

# 2. Verify that state-changing functions revert when paused
stellar contract invoke \
  --id <REWARDS_CONTRACT_ID> \
  --source user-keypair \
  --network testnet \
  -- distribute_reward --quest_id 1 --user <USER_ADDRESS>
# Expected output: Error(Contract, #ErrorCode)

# 3. Resume operation via Unpause
stellar contract invoke \
  --id <REWARDS_CONTRACT_ID> \
  --source admin-keypair \
  --network testnet \
  -- unpause
```

---

## User-Facing Communication Templates

### Template 1: Initial Testnet Incident Notice (Discord / Status Page)
```markdown
🚨 **Testnet Incident Notice**
**Status:** Investigating
**Impact:** [Affected feature: e.g., Reward claims / Milestone submissions]
**Details:** We are currently investigating an issue impacting [Feature] on Stellar Testnet. Further updates will be provided as soon as possible.
**Action Required:** Users do not need to resubmit transactions at this time.
```

### Template 2: Service Degraded / Emergency Pause Enacted
```markdown
⚠️ **Testnet Service Update: Emergency Pause Active**
**Status:** Action Enacted
**Impact:** Smart contract operations temporarily paused on Testnet.
**Details:** To protect token funds and user state, the Lernza team has executed an emergency pause on [Rewards / Milestone] contracts following [Brief reason / suspicious activity].
**Estimated Duration:** [ETA or 'Until further notice']
```

### Template 3: Resolution & Service Restoration
```markdown
✅ **Testnet Incident Resolved**
**Status:** Operational
**Impact:** Service restored on Stellar Testnet.
**Details:** The underlying issue with [Feature / Contract] has been resolved and verified. Contract pause has been lifted.
**Post-Mortem:** A detailed post-incident review will be published in `docs/operations/`.
```

---

## Special Cases


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
