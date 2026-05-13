import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { PeptomaClient } from "peptoma-sdk";
import { TOOLS } from "./tools/index.js";
import type { ToolHandler } from "./tools/index.js";

interface ServerOptions {
  apiKey?: string;
  walletAddress?: string;
  baseUrl?: string;
}

const TOOLS_WITH_USER_ID = new Set([
  "analyze_sequence",
  "create_annotation",
  "get_token_balance",
]);

export async function createServer(options: ServerOptions): Promise<void> {
  const client = new PeptomaClient({
    apiKey: options.apiKey,
    walletAddress: options.walletAddress,
    ...(options.baseUrl ? { baseUrl: options.baseUrl } : {}),
  });

  const server = new Server(
    {
      name: "peptoma-mcp",
      version: "0.1.6",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const tool = TOOLS.find((t) => t.name === req.params.name) as ToolHandler | undefined;

    if (!tool) {
      return {
        content: [{ type: "text" as const, text: `Unknown tool: ${req.params.name}` }],
        isError: true,
      };
    }

    try {
      const args = { ...(req.params.arguments ?? {}) };

      if (
        options.walletAddress &&
        TOOLS_WITH_USER_ID.has(tool.name) &&
        !args.userId
      ) {
        args.userId = options.walletAddress;
      }

      const result = await tool.handler(client, args);
      return {
        content: [{
          type: "text" as const,
          text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
        }],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[peptoma-mcp] Server running — connected to peptoma.xyz");
}
