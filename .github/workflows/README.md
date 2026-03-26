# GitHub Actions Workflows Guide

This directory contains the automation workflows for Lernza. Because several of these workflows interact with project boards and repositories outside the default scope of a GitHub App token, they require precise secrets and permissions.

---

## 1. Project Automation (`project-automation.yml`)

Syncs issues and pull requests across the GitHub Project Board (V2) automatically as their states change.

- **Required Secrets:** 
  - `PROJECT_TOKEN`: A Personal Access Token (PAT) belonging to a maintainer. The default `GITHUB_TOKEN` cannot access org-level or cross-repository Project V2 boards.
- **Required Permissions (Scopes):** 
  - `issues: write`
  - `pull-requests: read`
  - `repository-projects: write`
- **Failure Mode:** 
  - If the token expires, is rotated, or lacks the necessary scopes, the workflow fails silently or throws GraphQL authorization errors. Issues will fall out of sync with the project board (e.g., sticking in "Backlog" despite being closed).

## 2. Stale Issue Cleanup (`stale.yml`)

Monitors the repository for inactive assigned issues and automatically unassigns them to free them up for other contributors.

- **Required Secrets:** 
  - `PROJECT_TOKEN`: Reuses the maintainer PAT for expanded API rate limits and consistent identity representation.
- **Required Permissions (Scopes):** 
  - `issues: write`
- **Failure Mode:** 
  - If the secret is missing or invalid, the scheduled workflow drops. Inactive assignments will clog the backlog, meaning active contributors are deterred by "claimed" but abandoned issues.

## 3. Release (`release.yml`)

Uses Release Please to automate changelog generation, version tagging, and WASM binary building/uploading.

- **Required Secrets:** 
  - `GITHUB_TOKEN`: The default Actions token provided automatically per run. No custom PAT is needed.
- **Required Permissions (Scopes):** 
  - `contents: write` (for uploading releases, tags, and assets)
  - `pull-requests: write` (for opening and updating the Release PR)
- **Failure Mode:** 
  - If the repository settings under *Settings > Actions > General > Workflow permissions* are set to "Read repository contents" instead of "Read and write permissions", this workflow fails to push tags, update the changelog, or upload WASM binaries.
