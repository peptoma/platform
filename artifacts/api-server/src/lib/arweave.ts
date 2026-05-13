import Arweave from "arweave";
import type { JWKInterface } from "arweave/node/lib/wallet";

const ARWEAVE_KEY = process.env.ARWEAVE_KEY;

const arweave = Arweave.init({
  host: "arweave.net",
  port: 443,
  protocol: "https",
  timeout: 20000,
});

export const ARWEAVE_GATEWAY = "https://arweave.net";

export interface ArweaveRecord {
  platform: string;
  version: string;
  rrid: string;
  type: "sequence_analysis" | "annotation";
  sequenceId: number;
  sequence?: string;
  analysisDepth?: string;
  diseaseTarget?: string | null;
  submittedBy: string;
  analysis?: {
    structurePrediction: string;
    bioactivityScore: number;
    bioactivityLabel: string;
    confidenceScore: number;
    halfLife: string;
    toxicityRisk: string;
    annotationSuggestions: string[];
    biochemistry: {
      molecularWeight: number;
      hydrophobicityIndex: number;
      chargeAtPH7: number;
    };
  };
  annotation?: {
    id: number;
    type: string;
    content: string | null;
    tokensEarned: number;
  };
  timestamp: string;
}

export async function uploadToArweave(data: ArweaveRecord): Promise<string | null> {
  if (!ARWEAVE_KEY) return null;

  try {
    const key = JSON.parse(ARWEAVE_KEY) as JWKInterface;
    const tx = await arweave.createTransaction({ data: JSON.stringify(data) }, key);

    tx.addTag("Content-Type", "application/json");
    tx.addTag("App-Name", "PEPTOMA");
    tx.addTag("App-Version", "1.0");
    tx.addTag("RRID", "SCR_028424");
    tx.addTag("Type", data.type);
    tx.addTag("Sequence-ID", String(data.sequenceId));
    if (data.analysis?.bioactivityLabel) {
      tx.addTag("Bioactivity-Label", data.analysis.bioactivityLabel);
    }
    if (data.annotation?.type) {
      tx.addTag("Annotation-Type", data.annotation.type);
    }
    tx.addTag("Platform", "PEPTOMA");
    tx.addTag("Timestamp", data.timestamp);

    await arweave.transactions.sign(tx, key);
    const response = await arweave.transactions.post(tx);

    if (response.status === 200 || response.status === 202) {
      return tx.id;
    }
    return null;
  } catch {
    return null;
  }
}
