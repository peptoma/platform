import type { PeptomaClient } from "peptoma-sdk";
import type { ToolHandler } from "./index.js";

export const sequenceTools: ToolHandler[] = [
  {
    name: "analyze_sequence",
    description:
      "Submit a peptide sequence to the PEPTOMA AI Engine for analysis. Returns bioactivity score (0-100), bioactivity label (antimicrobial, antiviral, hormonal, anticancer, etc.), structure prediction (alpha_helix, beta_sheet, random_coil, mixed), toxicity risk (low/medium/high), molecular weight, hydrophobicity index, charge at pH7, half-life estimate, confidence score, and AI-generated annotation suggestions.",
    inputSchema: {
      type: "object",
      properties: {
        sequence: {
          type: "string",
          description:
            "Peptide sequence in single-letter amino acid code (e.g. KWLRRVWRPQKI) or FASTA format. Must be 3–512 residues.",
        },
        depth: {
          type: "string",
          enum: ["standard", "deep"],
          description:
            "Analysis depth. 'standard' is fast (~2s) and covers all core metrics. 'deep' adds extended structure modeling and richer annotation suggestions. Defaults to 'standard'.",
        },
        diseaseTarget: {
          type: "string",
          description:
            "Optional disease target or organism context (e.g. 'MRSA', 'Cancer', 'E. coli', 'HIV'). Improves classification accuracy and feed discoverability.",
        },
        userId: {
          type: "string",
          description:
            "Optional user identifier (Solana wallet address). Links the analysis to an on-chain identity and enables token reward tracking.",
        },
        notes: {
          type: "string",
          description: "Optional research notes or context for this sequence.",
        },
      },
      required: ["sequence"],
    },
    handler: async (client: PeptomaClient, args: Record<string, unknown>) => {
      const result = await client.sequences.analyze({
        sequence: args.sequence as string,
        depth: (args.depth as "standard" | "deep") ?? "standard",
        diseaseTarget: args.diseaseTarget as string | undefined,
        userId: args.userId as string | undefined,
        notes: args.notes as string | undefined,
      });
      return result;
    },
  },
  {
    name: "get_analysis",
    description:
      "Retrieve a previously completed PEPTOMA sequence analysis by its numeric ID. Returns the full analysis result including all AI-generated metrics and community annotation counts.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "number",
          description: "The numeric ID of the sequence analysis to retrieve.",
        },
      },
      required: ["id"],
    },
    handler: async (client: PeptomaClient, args: Record<string, unknown>) => {
      return client.sequences.get(args.id as number);
    },
  },
];
