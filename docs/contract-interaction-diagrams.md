# Contract Interaction Diagrams

These diagrams document how the frontend coordinates Lernza's contracts for the main MVP flows.

## Flows

- [Quest creation flow](./quest-creation-flow.md)
- [Enrollment flow](./enrollment-flow.md)
- [Funding flow](./funding-flow.md)
- [Milestone completion and reward distribution flow](./milestone-reward-flow.md)

## Notes

- The frontend is the orchestration layer for MVP flows. Lernza contracts do not call each other directly.
- Not every flow touches all three contracts. The frontend only calls the contracts needed for that user action.
- Funding and payout flows also interact with the Stellar asset contract that backs the reward token.
