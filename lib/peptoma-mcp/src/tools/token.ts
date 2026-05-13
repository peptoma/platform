import type { PeptomaClient } from "peptoma-sdk";
import type { ToolHandler } from "./index.js";

export const tokenTools: ToolHandler[] = [
  {
    name: "get_token_balance",
    description:
      "Get the $PEPTM token balance and staking information for a PEPTOMA user or Solana wallet. Returns current balance, staked amount, total earned from research contributions, total spent on analyses, current staking tier (free/researcher/pro/lab), and linked Solana address.",
    inputSchema: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description:
            "The Solana wallet address or user ID to query. This is the same identifier used when submitting sequences or annotations.",
        },
      },
      required: ["userId"],
    },
    handler: async (client: PeptomaClient, args: Record<string, unknown>) => {
      return client.token.balance(args.userId as string);
    },
  },
  {
    name: "get_leaderboard",
    description:
      "Get the PEPTOMA contributor leaderboard — the top researchers ranked by total $PEPTM tokens earned through peer-review contributions. Returns rank, userId, username, total tokens earned, and total contributions for each entry.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
    handler: async (client: PeptomaClient) => {
      return client.token.leaderboard();
    },
  },
];
