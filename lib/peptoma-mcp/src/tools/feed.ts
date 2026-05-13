import type { PeptomaClient } from "peptoma-sdk";
import type { ToolHandler } from "./index.js";

export const feedTools: ToolHandler[] = [
  {
    name: "search_feed",
    description:
      "Search and filter the PEPTOMA open research feed — the public database of all AI-analyzed peptide sequences. Supports filtering by disease target, minimum bioactivity score, and sorting. Returns paginated results with full analysis data for each sequence.",
    inputSchema: {
      type: "object",
      properties: {
        disease: {
          type: "string",
          description:
            "Filter by disease target or organism (e.g. 'Cancer', 'MRSA', 'HIV', 'E. coli'). Case-insensitive partial match.",
        },
        minScore: {
          type: "number",
          description:
            "Minimum bioactivity score (0-100). Use 70+ for high-confidence hits, 85+ for top candidates.",
        },
        sort: {
          type: "string",
          enum: ["newest", "score", "annotations", "trending"],
          description:
            "Sort order. 'newest' = most recent submissions, 'score' = highest bioactivity score, 'annotations' = most peer-reviewed, 'trending' = high recent vote activity. Defaults to 'newest'.",
        },
        limit: {
          type: "number",
          description: "Number of results per page (1-100). Defaults to 20.",
        },
        page: {
          type: "number",
          description: "Page number (1-indexed). Defaults to 1.",
        },
      },
      required: [],
    },
    handler: async (client: PeptomaClient, args: Record<string, unknown>) => {
      return client.feed.list({
        disease: args.disease as string | undefined,
        minScore: args.minScore as number | undefined,
        sort: args.sort as "newest" | "score" | "annotations" | "trending" | undefined,
        limit: args.limit as number | undefined,
        page: args.page as number | undefined,
      });
    },
  },
  {
    name: "get_feed_stats",
    description:
      "Get platform-wide aggregate statistics for the PEPTOMA research feed. Returns total analyses, average bioactivity and confidence scores, total annotations, total votes, recent activity count (last 24h), and a breakdown of submissions by disease target.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
    handler: async (client: PeptomaClient) => {
      return client.feed.stats();
    },
  },
  {
    name: "get_trending",
    description:
      "Get the top 10 trending peptide sequences on PEPTOMA ranked by community vote count. These are the sequences receiving the most scientific attention from the global research community right now.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
    handler: async (client: PeptomaClient) => {
      return client.feed.trending();
    },
  },
];
