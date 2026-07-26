# Load Testing

A [k6](https://k6.io/) script that establishes a baseline for the read path — the
part of Lernza that a large enrollment campaign will exercise hardest: the
landing page, the dashboard, and a quest detail view, plus the Soroban RPC
calls those pages depend on (there is no backend of our own — RPC is the
backend).

## Running

Install k6 ([docs](https://grafana.com/docs/k6/latest/set-up/install-k6/)), then:

```bash
# Against a local dev server
pnpm --dir frontend dev &
k6 run -e BASE_URL=http://localhost:5173 tests/load/read-path.js

# Against a deployed preview or testnet frontend
k6 run \
  -e BASE_URL=https://<your-deployment> \
  -e RPC_URL=https://soroban-testnet.stellar.org \
  -e QUEST_ID=<an existing quest id> \
  tests/load/read-path.js
```

The script ramps concurrency from 10 to 50 virtual users in steps and reports
p95 latency and error rate per page (`landing`, `dashboard`, `quest detail`)
and for the underlying RPC call (`rpc read`).

## Recording a baseline

Run this weekly against testnet. After each run, append the summary block
k6 prints at the end (request counts, p95 latency, error rate per group) to
`tests/load/BASELINE.md` with the date and commit SHA, so regressions show up
as a diff against the previous entry rather than requiring a second run to
compare against.
