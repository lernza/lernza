// k6 load test for Lernza's read path: landing, dashboard, and quest detail.
//
// Usage:
//   k6 run tests/load/read-path.js
//   k6 run -e BASE_URL=https://your-preview.vercel.app -e QUEST_ID=0 tests/load/read-path.js
//
// See tests/load/README.md for how to run this weekly against testnet and
// where to record baseline numbers.

import http from "k6/http"
import { check, group, sleep } from "k6"

const BASE_URL = __ENV.BASE_URL || "http://localhost:5173"
const RPC_URL = __ENV.RPC_URL || "https://soroban-testnet.stellar.org"
const QUEST_ID = __ENV.QUEST_ID || "0"

export const options = {
  // Ramp concurrency up in steps so the report shows where latency/error
  // rate starts to degrade, rather than just a single load level.
  stages: [
    { duration: "30s", target: 10 },
    { duration: "1m", target: 10 },
    { duration: "30s", target: 25 },
    { duration: "1m", target: 25 },
    { duration: "30s", target: 50 },
    { duration: "1m", target: 50 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    "http_req_duration{group:::landing}": ["p(95)<800"],
    "http_req_duration{group:::dashboard}": ["p(95)<800"],
    "http_req_duration{group:::quest detail}": ["p(95)<800"],
    "http_req_duration{group:::rpc read}": ["p(95)<500"],
  },
}

export default function () {
  group("landing", () => {
    const res = http.get(`${BASE_URL}/`)
    check(res, { "status is 200": (r) => r.status === 200 })
  })
  sleep(1)

  group("dashboard", () => {
    const res = http.get(`${BASE_URL}/dashboard`)
    check(res, { "status is 200": (r) => r.status === 200 })
  })
  sleep(1)

  group("quest detail", () => {
    const res = http.get(`${BASE_URL}/quest/${QUEST_ID}`)
    check(res, { "status is 200": (r) => r.status === 200 })
  })
  sleep(1)

  // The frontend has no backend of its own — every read the dashboard and
  // quest detail pages perform ultimately hits Soroban RPC. getHealth is a
  // stand-in for that dependency's baseline latency under the same load.
  group("rpc read", () => {
    const res = http.post(
      RPC_URL,
      JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getHealth" }),
      { headers: { "Content-Type": "application/json" } },
    )
    check(res, { "status is 200": (r) => r.status === 200 })
  })
  sleep(1)
}
