import { Tool } from "@modelcontextprotocol/sdk/types.js";

/**
 * The static catalog of MCP tools exposed by the Lernza server.
 *
 * Each tool maps to a read-only operation over Lernza's quest/milestone/rewards
 * data. Mutation tools (funding, distribution) are intentionally omitted to keep
 * the MCP surface read-only; those flows require wallet auth handled by the
 * Freighter-connected frontend.
 */
export const LERNZA_TOOLS: Tool[] = [
  {
    name: "get_quest",
    description:
      "Retrieve details for a single Lernza quest by its on-chain ID.",
    inputSchema: {
      type: "object",
      properties: {
        quest_id: {
          type: "number",
          description: "The numeric quest identifier.",
        },
      },
      required: ["quest_id"],
    },
  },
  {
    name: "list_quests",
    description: "List all active quests with optional pagination.",
    inputSchema: {
      type: "object",
      properties: {
        offset: {
          type: "number",
          description: "Zero-based index of the first result to return.",
          default: 0,
        },
        limit: {
          type: "number",
          description: "Maximum number of quests to return (1–100).",
          default: 20,
        },
      },
      required: [],
    },
  },
  {
    name: "get_milestones",
    description: "List all milestones for a given quest.",
    inputSchema: {
      type: "object",
      properties: {
        quest_id: {
          type: "number",
          description: "The quest whose milestones to retrieve.",
        },
      },
      required: ["quest_id"],
    },
  },
  {
    name: "get_enrollees",
    description: "Return the list of enrolled learners for a quest.",
    inputSchema: {
      type: "object",
      properties: {
        quest_id: {
          type: "number",
          description: "The quest to inspect.",
        },
      },
      required: ["quest_id"],
    },
  },
  {
    name: "get_pool_balance",
    description: "Return the token balance in a quest's reward pool.",
    inputSchema: {
      type: "object",
      properties: {
        quest_id: {
          type: "number",
          description: "The quest whose pool balance to query.",
        },
      },
      required: ["quest_id"],
    },
  },
  {
    name: "get_user_earnings",
    description: "Return total token earnings for a Stellar address.",
    inputSchema: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "The learner's Stellar public key (G…).",
        },
      },
      required: ["address"],
    },
  },
];
