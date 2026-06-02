# [FIXED]880 perf(milestone): paginate get_enrollee_progress
Repo Avatar
lernza/lernza
Problem
get_enrollee_progress iterates every milestone for a quest. A quest with 100 milestones consumes significant gas per read.

Where
contracts/milestone/src/lib.rs.

Approach
Add offset/limit parameters or split into get_enrollee_completion_details(offset, limit).

Acceptance
 Function rejects unbounded ranges


 #877 feat(quest): include timestamp + actor on enrollment events
Repo Avatar
lernza/lernza
Problem
enrollee_added events emit (quest_id, enrollee) only. Indexers cannot reconstruct chronology or distinguish self-join from owner-add.

Where
contracts/quest/src/lib.rs — add_enrollee, join_quest, join_quest_with_invite.

Approach
Standardize payload to (quest_id, enrollee, actor, timestamp, join_mode) across all three call sites.

Acceptance
 EVENT_REFERENCE.md updated
 Existing tests adapted

# [FIXED]894 fix(frontend): show specific UI for DUPLICATE / ERROR submit statuses
Repo Avatar
lernza/lernza
Problem
signAndSubmit reports a generic 'Submission failed' for all non-PENDING statuses. Users have no hint whether to retry, wait, or re-sign.

Where
frontend/src/lib/contracts/client.ts lines 63-89.

Approach
Map each status code to a specific message + action (retry, wait, contact support).

Acceptance
 User-facing copy for each status

# [FIXED]890 fix(frontend): detect account change after signing
Repo Avatar
lernza/lernza
Problem
signAndSubmit does not re-check the wallet address after Freighter returns. A user who switches accounts between request and sign can submit a tx with envelope from account A but submitted as account B.

Where
frontend/src/lib/contracts/client.ts.

Approach
Parse the signed envelope's source account and compare to the currently selected wallet address.

Acceptance
 Mismatch aborts submission with a toast asking the user to re-confirm

