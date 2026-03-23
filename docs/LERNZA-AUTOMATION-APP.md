# Lernza Automation GitHub App

A GitHub App that replaces all GitHub Actions project automation with a single, instant webhook-based bot. Shows as "lernza-automation[bot]" in all actions.

## Why Replace Actions with a GitHub App

| | GitHub Actions (current) | GitHub App (this) |
|---|---|---|
| Identity | Shows as your personal account | Shows as `lernza-automation[bot]` |
| Speed | ~20-30s (VM startup) | Instant (<1s webhook response) |
| Board → Issue sync | Can't detect board drags | Can via `projects_v2_item` webhook |
| Cost | Free (public repo) | Free (Vercel/Cloudflare free tier) |
| CI minutes | Burns ~1 min per event | Zero CI minutes |
| Complexity | YAML workflows | TypeScript app to maintain |

## Architecture

```
GitHub Events (webhooks)
        │
        ▼
┌─────────────────────┐
│  Vercel Serverless   │  ← POST /api/webhook
│  (TypeScript)        │
│                      │
│  1. Verify signature │
│  2. Route event      │
│  3. Call GitHub API   │
│  4. Update project   │
└─────────────────────┘
        │
        ▼
GitHub Projects API (GraphQL)
```

Single serverless function on Vercel. No database, no state, no background jobs. Each webhook is processed independently.

## Step 1: Create the GitHub App

1. Go to **https://github.com/organizations/lernza/settings/apps/new**
2. Fill in:

| Field | Value |
|-------|-------|
| App name | `lernza-automation` |
| Description | Project board automation for Lernza |
| Homepage URL | `https://github.com/lernza/lernza` |
| Webhook URL | `https://lernza-automation.vercel.app/api/webhook` (update after deploy) |
| Webhook secret | Generate a strong random string: `openssl rand -hex 32` |
| Permissions | See table below |
| Subscribe to events | See table below |
| Where it can be installed | Only on this account |

### Permissions needed

| Category | Permission | Access |
|----------|-----------|--------|
| Repository | Issues | Read & Write |
| Repository | Pull requests | Read & Write |
| Repository | Metadata | Read |
| Organization | Projects | Read & Write |

### Webhook events to subscribe

Check ALL of these:

- [x] Issues
- [x] Pull request
- [x] Pull request review
- [x] Projects v2 item (this is the one Actions CAN'T do)

3. Click **Create GitHub App**
4. Note the **App ID** and **Client ID**
5. Generate a **Private Key** (download the `.pem` file)
6. Click **Install App** → install on the `lernza` organization → select `lernza/lernza` repo

## Step 2: Create the App Repository

```bash
mkdir lernza-automation
cd lernza-automation
npm init -y
npm install @octokit/webhooks @octokit/auth-app @octokit/graphql
npm install -D typescript @types/node vercel
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "esModuleInterop": true,
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

### `vercel.json`

```json
{
  "functions": {
    "api/webhook.ts": {
      "maxDuration": 30
    }
  }
}
```

### `.env.local` (for local development)

```bash
APP_ID=123456                          # From GitHub App settings
PRIVATE_KEY="-----BEGIN RSA..."        # Contents of the .pem file
WEBHOOK_SECRET=your-webhook-secret     # The secret you generated
```

## Step 3: Project Constants

### `src/constants.ts`

```typescript
// Project board configuration
// Update these if you ever reconfigure the board statuses
export const PROJECT = {
  id: "PVT_kwDOC20SDc4BRpIZ",
  owner: "lernza",
  repo: "lernza",
  number: 1,
  field: {
    statusId: "PVTSSF_lADOC20SDc4BRpIZzg_aUc4",
  },
  status: {
    backlog: "9ee49bec",
    inProgress: "2f115854",
    inReview: "cb65cf8c",
    done: "9e0f6df4",
    invalid: "c099a7e2",
  },
} as const;

// Status hierarchy — higher number = further along
export const STATUS_ORDER: Record<string, number> = {
  Backlog: 0,
  "In Progress": 1,
  "In Review": 2,
  Done: 3,
  Invalid: 3,
};
```

## Step 4: GitHub Client

### `src/github.ts`

```typescript
import { createAppAuth } from "@octokit/auth-app";
import { graphql } from "@octokit/graphql";
import { PROJECT, STATUS_ORDER } from "./constants";

// Create authenticated GraphQL client for a specific installation
export async function createClient(installationId: number) {
  const auth = createAppAuth({
    appId: process.env.APP_ID!,
    privateKey: process.env.PRIVATE_KEY!,
    installationId,
  });

  const { token } = await auth({ type: "installation" });

  return graphql.defaults({
    headers: { authorization: `token ${token}` },
  });
}

// ─── Project Board Helpers ─────────────────────────────────────

export async function findProjectItem(
  gql: typeof graphql,
  issueNumber: number
): Promise<{ itemId: string; status: string } | null> {
  const result = await gql<any>(`
    query($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          items(first: 100) {
            nodes {
              id
              content { ... on Issue { number } }
              fieldValueByName(name: "Status") {
                ... on ProjectV2ItemFieldSingleSelectValue { name }
              }
            }
          }
        }
      }
    }
  `, { projectId: PROJECT.id });

  // Handle pagination if needed (>100 items)
  const allItems = result.node.items.nodes;
  const item = allItems.find(
    (n: any) => n.content?.number === issueNumber
  );

  if (!item) return null;

  return {
    itemId: item.id,
    status: item.fieldValueByName?.name ?? "",
  };
}

export async function addToProject(
  gql: typeof graphql,
  issueNodeId: string
): Promise<string> {
  const result = await gql<any>(`
    mutation($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: {
        projectId: $projectId
        contentId: $contentId
      }) {
        item { id }
      }
    }
  `, {
    projectId: PROJECT.id,
    contentId: issueNodeId,
  });

  return result.addProjectV2ItemById.item.id;
}

export async function setStatus(
  gql: typeof graphql,
  itemId: string,
  statusOptionId: string
): Promise<void> {
  await gql(`
    mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $projectId
        itemId: $itemId
        fieldId: $fieldId
        value: { singleSelectOptionId: $optionId }
      }) {
        projectV2Item { id }
      }
    }
  `, {
    projectId: PROJECT.id,
    itemId,
    fieldId: PROJECT.field.statusId,
    optionId: statusOptionId,
  });
}

// Move status only if it's a forward move (or specific allowed backward move)
export async function moveStatusIf(
  gql: typeof graphql,
  issueNumber: number,
  targetStatusId: string,
  targetStatusName: string,
  allowedFrom: string[]
): Promise<{ moved: boolean; previous: string }> {
  const item = await findProjectItem(gql, issueNumber);
  if (!item) return { moved: false, previous: "not in project" };

  const currentStatus = item.status || "Backlog";

  if (allowedFrom.length > 0 && !allowedFrom.includes(currentStatus)) {
    return { moved: false, previous: currentStatus };
  }

  await setStatus(gql, item.itemId, targetStatusId);
  return { moved: true, previous: currentStatus };
}

// ─── Linked Issues Helper ──────────────────────────────────────

export async function getLinkedIssues(
  gql: typeof graphql,
  prNumber: number
): Promise<number[]> {
  try {
    const result = await gql<any>(`
      query($owner: String!, $repo: String!, $pr: Int!) {
        repository(owner: $owner, name: $repo) {
          pullRequest(number: $pr) {
            closingIssuesReferences(first: 10) {
              nodes { number }
            }
          }
        }
      }
    `, {
      owner: PROJECT.owner,
      repo: PROJECT.repo,
      pr: prNumber,
    });

    return result.repository.pullRequest.closingIssuesReferences.nodes.map(
      (n: any) => n.number
    );
  } catch {
    return [];
  }
}

// Check if any OTHER open non-draft PRs link to an issue
export async function hasOtherOpenPRs(
  gql: typeof graphql,
  issueNumber: number,
  excludePR: number
): Promise<boolean> {
  const result = await gql<any>(`
    query($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        pullRequests(states: OPEN, first: 50) {
          nodes {
            number
            isDraft
            closingIssuesReferences(first: 10) {
              nodes { number }
            }
          }
        }
      }
    }
  `, { owner: PROJECT.owner, repo: PROJECT.repo });

  return result.repository.pullRequests.nodes.some(
    (pr: any) =>
      pr.number !== excludePR &&
      !pr.isDraft &&
      pr.closingIssuesReferences.nodes.some(
        (i: any) => i.number === issueNumber
      )
  );
}

// Get issue assignee count
export async function getAssigneeCount(
  gql: typeof graphql,
  issueNumber: number
): Promise<number> {
  const result = await gql<any>(`
    query($owner: String!, $repo: String!, $number: Int!) {
      repository(owner: $owner, name: $repo) {
        issue(number: $number) {
          assignees(first: 10) { totalCount }
        }
      }
    }
  `, {
    owner: PROJECT.owner,
    repo: PROJECT.repo,
    number: issueNumber,
  });

  return result.repository.issue.assignees.totalCount;
}

// Close an issue
export async function closeIssue(
  gql: typeof graphql,
  issueNumber: number,
  reason: "COMPLETED" | "NOT_PLANNED" = "COMPLETED"
): Promise<void> {
  const result = await gql<any>(`
    query($owner: String!, $repo: String!, $number: Int!) {
      repository(owner: $owner, name: $repo) {
        issue(number: $number) { id }
      }
    }
  `, { owner: PROJECT.owner, repo: PROJECT.repo, number: issueNumber });

  await gql(`
    mutation($issueId: ID!, $reason: IssueClosedStateReason!) {
      closeIssue(input: { issueId: $issueId, stateReason: $reason }) {
        issue { id }
      }
    }
  `, {
    issueId: result.repository.issue.id,
    reason,
  });
}
```

## Step 5: Event Handlers

### `src/handlers.ts`

```typescript
import { graphql } from "@octokit/graphql";
import { PROJECT } from "./constants";
import {
  moveStatusIf,
  getLinkedIssues,
  hasOtherOpenPRs,
  getAssigneeCount,
  closeIssue,
} from "./github";

type GQL = typeof graphql;

// ─── Issue Events ──────────────────────────────────────────────

export async function onIssueAssigned(gql: GQL, issueNumber: number) {
  return moveStatusIf(
    gql,
    issueNumber,
    PROJECT.status.inProgress,
    "In Progress",
    ["Backlog", ""]
  );
}

export async function onIssueUnassigned(gql: GQL, issueNumber: number) {
  const count = await getAssigneeCount(gql, issueNumber);
  if (count > 0) return { moved: false, previous: "still has assignees" };

  return moveStatusIf(
    gql,
    issueNumber,
    PROJECT.status.backlog,
    "Backlog",
    ["In Progress"]
  );
}

export async function onIssueClosed(
  gql: GQL,
  issueNumber: number,
  stateReason: string
) {
  if (stateReason === "not_planned") {
    return moveStatusIf(
      gql,
      issueNumber,
      PROJECT.status.invalid,
      "Invalid",
      [] // Move from any status
    );
  }
  // "completed" is handled by the built-in Item closed → Done workflow
  // But we can also handle it here for reliability
  return moveStatusIf(
    gql,
    issueNumber,
    PROJECT.status.done,
    "Done",
    [] // Move from any status
  );
}

export async function onIssueReopened(gql: GQL, issueNumber: number) {
  return moveStatusIf(
    gql,
    issueNumber,
    PROJECT.status.backlog,
    "Backlog",
    [] // Move from any status
  );
}

// ─── PR Events ─────────────────────────────────────────────────

export async function onPROpened(
  gql: GQL,
  prNumber: number,
  isDraft: boolean
) {
  const issues = await getLinkedIssues(gql, prNumber);

  for (const num of issues) {
    if (isDraft) {
      await moveStatusIf(gql, num, PROJECT.status.inProgress, "In Progress", [
        "Backlog",
        "",
      ]);
    } else {
      await moveStatusIf(gql, num, PROJECT.status.inReview, "In Review", [
        "Backlog",
        "In Progress",
        "",
      ]);
    }
  }
}

export async function onPRReadyForReview(gql: GQL, prNumber: number) {
  const issues = await getLinkedIssues(gql, prNumber);

  for (const num of issues) {
    await moveStatusIf(gql, num, PROJECT.status.inReview, "In Review", [
      "Backlog",
      "In Progress",
      "",
    ]);
  }
}

export async function onPRConvertedToDraft(gql: GQL, prNumber: number) {
  const issues = await getLinkedIssues(gql, prNumber);

  for (const num of issues) {
    await moveStatusIf(
      gql,
      num,
      PROJECT.status.inProgress,
      "In Progress",
      ["In Review"]
    );
  }
}

export async function onReviewRequested(gql: GQL, prNumber: number) {
  const issues = await getLinkedIssues(gql, prNumber);

  for (const num of issues) {
    await moveStatusIf(gql, num, PROJECT.status.inReview, "In Review", [
      "Backlog",
      "In Progress",
      "",
    ]);
  }
}

export async function onChangesRequested(gql: GQL, prNumber: number) {
  const issues = await getLinkedIssues(gql, prNumber);

  for (const num of issues) {
    const otherPRs = await hasOtherOpenPRs(gql, num, prNumber);
    if (otherPRs) continue;

    await moveStatusIf(
      gql,
      num,
      PROJECT.status.inProgress,
      "In Progress",
      ["In Review"]
    );
  }
}

export async function onPRClosedNotMerged(gql: GQL, prNumber: number) {
  const issues = await getLinkedIssues(gql, prNumber);

  for (const num of issues) {
    const otherPRs = await hasOtherOpenPRs(gql, num, prNumber);
    if (otherPRs) continue;

    const assignees = await getAssigneeCount(gql, num);
    if (assignees > 0) {
      await moveStatusIf(gql, num, PROJECT.status.inProgress, "In Progress", [
        "In Review",
        "Backlog",
        "",
      ]);
    } else {
      await moveStatusIf(gql, num, PROJECT.status.backlog, "Backlog", [
        "In Review",
        "In Progress",
        "",
      ]);
    }
  }
}

// ─── Board Events (the thing Actions CAN'T do) ────────────────

export async function onProjectItemStatusChanged(
  gql: GQL,
  issueNumber: number,
  newStatus: string
) {
  // Board drag to Done → close the issue
  if (newStatus === "Done") {
    await closeIssue(gql, issueNumber, "COMPLETED");
  }

  // Board drag to Invalid → close as not planned
  if (newStatus === "Invalid") {
    await closeIssue(gql, issueNumber, "NOT_PLANNED");
  }
}
```

## Step 6: Webhook Handler

### `api/webhook.ts`

```typescript
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Webhooks } from "@octokit/webhooks";
import { createClient } from "../src/github";
import * as handlers from "../src/handlers";

const webhooks = new Webhooks({
  secret: process.env.WEBHOOK_SECRET!,
});

// ─── Issue Events ──────────────────────────────────────────────

webhooks.on("issues.assigned", async ({ payload }) => {
  const gql = await createClient(payload.installation!.id);
  await handlers.onIssueAssigned(gql, payload.issue.number);
});

webhooks.on("issues.unassigned", async ({ payload }) => {
  const gql = await createClient(payload.installation!.id);
  await handlers.onIssueUnassigned(gql, payload.issue.number);
});

webhooks.on("issues.closed", async ({ payload }) => {
  const gql = await createClient(payload.installation!.id);
  await handlers.onIssueClosed(
    gql,
    payload.issue.number,
    payload.issue.state_reason ?? "completed"
  );
});

webhooks.on("issues.reopened", async ({ payload }) => {
  const gql = await createClient(payload.installation!.id);
  await handlers.onIssueReopened(gql, payload.issue.number);
});

// ─── PR Events ─────────────────────────────────────────────────

webhooks.on("pull_request.opened", async ({ payload }) => {
  const gql = await createClient(payload.installation!.id);
  await handlers.onPROpened(
    gql,
    payload.pull_request.number,
    payload.pull_request.draft ?? false
  );
});

webhooks.on("pull_request.ready_for_review", async ({ payload }) => {
  const gql = await createClient(payload.installation!.id);
  await handlers.onPRReadyForReview(gql, payload.pull_request.number);
});

webhooks.on("pull_request.converted_to_draft", async ({ payload }) => {
  const gql = await createClient(payload.installation!.id);
  await handlers.onPRConvertedToDraft(gql, payload.pull_request.number);
});

webhooks.on("pull_request.review_requested", async ({ payload }) => {
  const gql = await createClient(payload.installation!.id);
  await handlers.onReviewRequested(gql, payload.pull_request.number);
});

webhooks.on("pull_request.closed", async ({ payload }) => {
  if (payload.pull_request.merged) return; // Merged PRs auto-close issues
  const gql = await createClient(payload.installation!.id);
  await handlers.onPRClosedNotMerged(gql, payload.pull_request.number);
});

// ─── Review Events ─────────────────────────────────────────────

webhooks.on("pull_request_review.submitted", async ({ payload }) => {
  if (payload.review.state !== "changes_requested") return;
  const gql = await createClient(payload.installation!.id);
  await handlers.onChangesRequested(gql, payload.pull_request.number);
});

// ─── Board Events (the killer feature) ─────────────────────────
// This is what GitHub Actions CANNOT do.

webhooks.on("projects_v2_item.edited" as any, async ({ payload }: any) => {
  // Only handle status field changes
  const changes = payload.changes?.field_value;
  if (!changes || changes.field_type !== "single_select") return;

  const newStatus = changes.to?.name;
  const issueNumber = payload.projects_v2_item?.content_node_id;

  if (!newStatus || !issueNumber) return;

  // Resolve issue number from node ID
  const gql = await createClient(payload.installation!.id);

  try {
    const result = await gql<any>(`
      query($id: ID!) {
        node(id: $id) {
          ... on Issue { number }
        }
      }
    `, { id: issueNumber });

    const num = result.node?.number;
    if (num) {
      await handlers.onProjectItemStatusChanged(gql, num, newStatus);
    }
  } catch {
    // Not an issue (might be a draft item), ignore
  }
});

// ─── Vercel Handler ────────────────────────────────────────────

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  try {
    const id = req.headers["x-github-delivery"] as string;
    const name = req.headers["x-github-event"] as string;
    const signature = req.headers["x-hub-signature-256"] as string;
    const body = JSON.stringify(req.body);

    await webhooks.verifyAndReceive({
      id,
      name: name as any,
      signature,
      payload: body,
    });

    res.status(200).send("OK");
  } catch (error: any) {
    console.error("Webhook error:", error.message);
    res.status(400).send(error.message);
  }
}
```

## Step 7: Deploy

```bash
# Set environment variables on Vercel
vercel env add APP_ID          # Your GitHub App ID
vercel env add PRIVATE_KEY     # Contents of the .pem file
vercel env add WEBHOOK_SECRET  # The secret you generated

# Deploy
vercel --prod
```

After deploy, update the GitHub App's webhook URL to your Vercel URL:
`https://lernza-automation.vercel.app/api/webhook`

## Step 8: Migrate from Actions

Once the app is working:

1. **Test both running in parallel** for a few days
2. **Disable built-in project workflows** (the app handles everything)
3. **Delete** `.github/workflows/project-automation.yml`
4. **Delete** `.github/workflows/stale.yml` (add stale logic to the app if needed)
5. **Remove** `PROJECT_TOKEN` secret (app uses its own auth)
6. **Keep** `.github/workflows/ci.yml` (build/test stays as Actions — that's what it's for)

## Step 9: What the App Handles (Complete)

### Things Actions workflow currently does

| Event | Action | App handles? |
|-------|--------|-------------|
| Issue assigned | → In Progress | ✅ |
| Issue unassigned | → Backlog | ✅ |
| Issue closed (completed) | → Done | ✅ |
| Issue closed (not planned) | → Invalid | ✅ |
| Issue reopened | → Backlog | ✅ |
| PR opened (draft) | → In Progress | ✅ |
| PR opened (ready) | → In Review | ✅ |
| PR ready for review | → In Review | ✅ |
| Review requested | → In Review | ✅ |
| Converted to draft | → In Progress | ✅ |
| Changes requested | → In Progress | ✅ |
| PR closed (not merged) | → In Progress/Backlog | ✅ |

### Things ONLY the app can do (not possible with Actions)

| Event | Action |
|-------|--------|
| **Board drag to Done** | Closes the issue |
| **Board drag to Invalid** | Closes issue as not planned |
| **Board drag to Backlog** | Could reopen issue if closed |
| **Board drag to In Progress** | Could auto-assign if unassigned |

## Local Development

```bash
# Install smee for local webhook forwarding
npm install -g smee-client

# Create a channel at https://smee.io/new
# Update your GitHub App webhook URL to the smee URL temporarily

# Run smee proxy
smee --url https://smee.io/YOUR_CHANNEL --path /api/webhook --port 3000

# Run local dev server
vercel dev
```

## File Structure

```
lernza-automation/
├── api/
│   └── webhook.ts          # Vercel serverless function entry
├── src/
│   ├── constants.ts        # Project IDs, status option IDs
│   ├── github.ts           # GraphQL helpers (find item, set status, etc.)
│   └── handlers.ts         # Event handler logic
├── package.json
├── tsconfig.json
├── vercel.json
├── .env.local              # Local dev secrets (not committed)
└── .gitignore
```

## Monitoring

- **Vercel dashboard** → function logs show every webhook processed
- **GitHub App** → Advanced tab → "Recent Deliveries" shows every webhook sent
- Both give you full request/response for debugging
