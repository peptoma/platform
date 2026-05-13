import type { ToolHandler } from "./index.js";
import type { PeptomaClient } from "peptoma-sdk";

const BASE_URL = "https://peptoma.xyz/api";

async function callAgent(agentType: string, message: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/copilot/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: message }],
      agentType,
    }),
  });
  if (!res.ok) throw new Error(`PEPTOMA API error: HTTP ${res.status}`);
  const data = await res.json() as { reply?: string };
  return data.reply ?? "No response from agent.";
}

export const copilotTools: ToolHandler[] = [
  {
    name: "research_peptide",
    description:
      "Get a structured research profile for a specific peptide from the PEPTOMA Research Agent. Returns: mechanism of action, benefit areas, research status (animal/human/in vitro), dosing reference, safety notes, and key citations.",
    inputSchema: {
      type: "object" as const,
      properties: {
        peptide: {
          type: "string",
          description: "The peptide name to research (e.g. 'BPC-157', 'GHK-Cu', 'Ipamorelin', 'Selank')",
        },
      },
      required: ["peptide"],
    },
    handler: async (_client: PeptomaClient, args: Record<string, unknown>) => {
      const peptide = String(args.peptide ?? "");
      return callAgent("research", `What is ${peptide}? Provide a full research profile.`);
    },
  },

  {
    name: "build_protocol",
    description:
      "Build a curated peptide research stack for a specific health or performance goal using the PEPTOMA Protocol Builder Agent. Supported goals include: longevity, recovery, sleep, fat loss, cognitive support, skin health, inflammation.",
    inputSchema: {
      type: "object" as const,
      properties: {
        goal: {
          type: "string",
          description: "The research or health goal (e.g. 'longevity', 'muscle recovery after training', 'sleep optimization', 'cognitive enhancement')",
        },
      },
      required: ["goal"],
    },
    handler: async (_client: PeptomaClient, args: Record<string, unknown>) => {
      const goal = String(args.goal ?? "");
      return callAgent("protocol", `Build a peptide research protocol stack for: ${goal}`);
    },
  },

  {
    name: "compare_peptides",
    description:
      "Compare two peptides side by side using the PEPTOMA Comparison Agent. Returns a structured table covering: primary use, mechanism, evidence strength, research status, key advantage, main limitation, and stacking compatibility.",
    inputSchema: {
      type: "object" as const,
      properties: {
        peptide_a: {
          type: "string",
          description: "First peptide to compare (e.g. 'BPC-157')",
        },
        peptide_b: {
          type: "string",
          description: "Second peptide to compare (e.g. 'TB-500')",
        },
      },
      required: ["peptide_a", "peptide_b"],
    },
    handler: async (_client: PeptomaClient, args: Record<string, unknown>) => {
      const a = String(args.peptide_a ?? "");
      const b = String(args.peptide_b ?? "");
      return callAgent("compare", `Compare ${a} vs ${b}`);
    },
  },

  {
    name: "summarize_literature",
    description:
      "Summarize a peptide research paper or topic using the PEPTOMA Literature Summarizer Agent. Provide a paper title, abstract, DOI, or research topic. Returns: study type, key findings, dosage model, limitations, and relevance.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Paper title, abstract, DOI, or research topic to summarize (e.g. 'BPC-157 gut healing studies', or paste a full abstract)",
        },
      },
      required: ["query"],
    },
    handler: async (_client: PeptomaClient, args: Record<string, unknown>) => {
      const query = String(args.query ?? "");
      return callAgent("literature", query);
    },
  },

  {
    name: "check_safety",
    description:
      "Get a safety and risk analysis for a peptide or combination from the PEPTOMA Safety Agent. Returns: evidence level, known risks, contraindications, potential interactions, unknown gaps, and research disclaimer.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Peptide name or combination to assess (e.g. 'BPC-157', 'BPC-157 and TB-500 stacked together')",
        },
      },
      required: ["query"],
    },
    handler: async (_client: PeptomaClient, args: Record<string, unknown>) => {
      const query = String(args.query ?? "");
      return callAgent("safety", `Safety analysis for: ${query}`);
    },
  },
];
