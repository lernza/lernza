# Quest suspension

Quest suspension is a temporary incident-response state. The quest remains
readable and its enrollee, milestone, and reward records are retained for
investigation.

The quest owner or the contract administrator can call `suspend_quest` with a
human-readable reason. The contract stores the reason, actor, and ledger
timestamp in `SuspensionInfo`, changes the quest status to `Suspended`, and
emits `quest_suspended`. The same roles call `resume_quest`, which restores
`Active` and emits `quest_resumed`.

While suspended, new enrollment, quest updates, milestone creation or review,
and reward funding or distribution are rejected. Read-only queries, including
`get_quest`, `get_enrollees`, and `get_suspension`, remain available. Existing
records are not deleted, and a suspension does not archive or cancel the
quest.
