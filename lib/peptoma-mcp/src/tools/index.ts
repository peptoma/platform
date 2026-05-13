import type { PeptomaClient } from "peptoma-sdk";
import { sequenceTools } from "./sequences.js";
import { feedTools } from "./feed.js";
import { annotationTools } from "./annotations.js";
import { tokenTools } from "./token.js";
import { copilotTools } from "./copilot.js";

export interface ToolHandler {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  handler: (client: PeptomaClient, args: Record<string, unknown>) => Promise<unknown>;
}

export const TOOLS: ToolHandler[] = [
  ...sequenceTools,
  ...feedTools,
  ...annotationTools,
  ...tokenTools,
  ...copilotTools,
];
