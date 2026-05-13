import type { PeptomaClient } from "peptoma-sdk";
import type { ToolHandler } from "./index.js";

export const annotationTools: ToolHandler[] = [
  {
    name: "list_annotations",
    description:
      "List all peer-review annotations for a specific PEPTOMA sequence analysis. Returns the annotation type, content, author, vote score, and tokens earned for each annotation.",
    inputSchema: {
      type: "object",
      properties: {
        sequenceId: {
          type: "number",
          description: "The numeric ID of the sequence to fetch annotations for.",
        },
      },
      required: ["sequenceId"],
    },
    handler: async (client: PeptomaClient, args: Record<string, unknown>) => {
      return client.annotations.list(args.sequenceId as number);
    },
  },
  {
    name: "create_annotation",
    description:
      "Submit a peer-review annotation on a PEPTOMA sequence analysis. Earns $PEPTM tokens when accepted by community consensus. " +
      "Annotation types: " +
      "'confirm' (+2 $PEPTM) — agree with the AI classification based on expertise or evidence. " +
      "'challenge' (+3 $PEPTM) — dispute the result with literature or experimental evidence. " +
      "'extend' (+5 $PEPTM) — add related sequences, supporting studies, or additional analysis. " +
      "'tag' (+2 $PEPTM) — apply a disease or organism label to improve discoverability.",
    inputSchema: {
      type: "object",
      properties: {
        sequenceId: {
          type: "number",
          description: "The numeric ID of the sequence to annotate.",
        },
        userId: {
          type: "string",
          description:
            "Your Solana wallet address or user identifier. Required to receive $PEPTM token rewards for this annotation.",
        },
        type: {
          type: "string",
          enum: ["confirm", "challenge", "extend", "tag"],
          description:
            "Annotation type. Each type has a different reward: confirm (+2), challenge (+3), extend (+5), tag (+2) $PEPTM.",
        },
        content: {
          type: "string",
          description:
            "The annotation content. Should include your scientific reasoning, evidence, or data that supports your annotation type. More detailed and evidence-backed annotations earn higher community votes.",
        },
      },
      required: ["sequenceId", "userId", "type"],
    },
    handler: async (client: PeptomaClient, args: Record<string, unknown>) => {
      return client.annotations.create({
        sequenceId: args.sequenceId as number,
        userId: args.userId as string,
        type: args.type as "confirm" | "challenge" | "extend" | "tag",
        content: args.content as string | undefined,
      });
    },
  },
  {
    name: "vote_annotation",
    description:
      "Upvote or downvote a peer-review annotation on PEPTOMA. Voting helps surface high-quality scientific contributions and determines which annotations earn $PEPTM rewards.",
    inputSchema: {
      type: "object",
      properties: {
        annotationId: {
          type: "number",
          description: "The numeric ID of the annotation to vote on.",
        },
        direction: {
          type: "string",
          enum: ["up", "down"],
          description: "'up' to upvote (supports this annotation), 'down' to downvote (disputes this annotation).",
        },
      },
      required: ["annotationId", "direction"],
    },
    handler: async (client: PeptomaClient, args: Record<string, unknown>) => {
      return client.annotations.vote(
        args.annotationId as number,
        args.direction as "up" | "down"
      );
    },
  },
];
