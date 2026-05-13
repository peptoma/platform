const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_ENDPOINT = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

export const IPFS_GATEWAY = "https://ipfs.io/ipfs";

export interface PeptideReport {
  version: string;
  platform: string;
  rrid: string;
  sequenceId: number;
  sequence: string;
  analysisDepth: string;
  diseaseTarget: string | null;
  submittedBy: string;
  analysis: {
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
  timestamp: string;
}

export async function pinToIPFS(data: PeptideReport): Promise<string | null> {
  if (!PINATA_JWT) return null;

  try {
    const response = await fetch(PINATA_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: JSON.stringify({
        pinataContent: data,
        pinataMetadata: {
          name: `PEPTOMA-SEQ-${data.sequenceId}`,
          keyvalues: {
            platform: "PEPTOMA",
            rrid: "SCR_028424",
            sequenceId: String(data.sequenceId),
            bioactivityLabel: data.analysis.bioactivityLabel,
          },
        },
        pinataOptions: { cidVersion: 1 },
      }),
    });

    if (!response.ok) return null;
    const result = (await response.json()) as { IpfsHash: string };
    return result.IpfsHash ?? null;
  } catch {
    return null;
  }
}
