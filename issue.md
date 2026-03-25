#263 documentation: update sequence diagrams to use create_quest/fund_quest and current auth requirements
Repo Avatar
lernza/lernza
Problem
Several flow docs still teach the old workspace-era function names and interaction order.

Evidence
Examples include docs/quest-creation-flow.md, docs/enrollment-flow.md, and docs/milestone-reward-flow.md.
Why this matters
Flow diagrams are supposed to reduce cognitive load, but right now they encode stale APIs.

Acceptance Criteria
Refresh the diagrams to current contract names and auth flows.
Validate each diagram against the real contract interfaces before publishing.


#188 documentation(contracts): update security audit and architecture docs to reflect the post-workspace contract names
Repo Avatar
lernza/lernza
Problem
Multiple docs still speak in workspace terms even though the repo and contracts now use quest.

Evidence
Examples: README.md, docs/security-audit.md, and the flow diagrams still reference workspace, create_workspace, and fund_workspace.
Why this matters
The documentation currently teaches contributors the wrong API surface and makes audits harder to trust.

Acceptance Criteria
Update docs to the current naming and contract signatures.
Remove references that imply the old workspace crate still exists.

#265 documentation: add an explicit section describing the current frontend-to-contract integration status
Repo Avatar
lernza/lernza
Problem
The root docs describe architecture and flows as if the frontend is already orchestrating the three contracts, but the UI remains mostly mock-driven.

Evidence
This gap shows up across README.md and the flow docs.
Why this matters
Contributors need a crisp distinction between implemented, stubbed, and planned product areas.

Acceptance Criteria
Add a current-status matrix for quest reads, writes, milestones, rewards, and profile data.
Keep it updated as integration work lands.