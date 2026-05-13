import { Router } from "express";
import { db, sequencesTable, annotationsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

function structureLabel(s?: string | null) {
  const map: Record<string, string> = {
    alpha_helix: "α-Helix",
    beta_sheet: "β-Sheet",
    random_coil: "Random Coil",
    mixed: "Mixed",
  };
  return s ? (map[s] ?? s) : "Unknown";
}

function toxicityScore(risk?: string | null): number {
  if (risk === "low") return 90;
  if (risk === "medium") return 55;
  if (risk === "high") return 20;
  return 50;
}

router.get("/molecule/ipnft/:sequenceId", async (req, res) => {
  const id = parseInt(req.params.sequenceId);
  if (!id) return res.status(400).json({ error: "Invalid ID" });

  const seq = await db.query.sequencesTable.findFirst({
    where: eq(sequencesTable.id, id),
  });
  if (!seq) return res.status(404).json({ error: "Sequence not found" });

  const annotations = await db.select().from(annotationsTable)
    .where(eq(annotationsTable.sequenceId, id))
    .orderBy(desc(annotationsTable.createdAt))
    .limit(50);

  const contributors = [...new Set(annotations.map(a => a.userId))];
  const today = new Date().toISOString().split("T")[0];

  const metadata = {
    name: `PEPTOMA IP-NFT · ${seq.bioactivityLabel ?? "Peptide"} · Seq #${seq.id}`,
    description: [
      `Novel ${seq.bioactivityLabel ?? "bioactive"} peptide sequence discovered and analysed on PEPTOMA (peptoma.xyz), the open DeSci platform for peptide research.`,
      ``,
      `Sequence: ${seq.sequence}`,
      seq.diseaseTarget ? `Therapeutic Target: ${seq.diseaseTarget}` : null,
      `Bioactivity Score: ${seq.bioactivityScore}/100`,
      `Confidence: ${seq.confidenceScore}/100`,
      `Structure: ${structureLabel(seq.structurePrediction)}`,
      `Toxicity Risk: ${seq.toxicityRisk?.toUpperCase() ?? "UNKNOWN"}`,
      seq.ipfsCid ? `IPFS CID: ${seq.ipfsCid}` : null,
      ``,
      `Platform Registration: RRID:SCR_028424 (SciCrunch)`,
      `Annotated by ${contributors.length} community contributor${contributors.length !== 1 ? "s" : ""}.`,
    ].filter(Boolean).join("\n"),
    external_url: `https://peptoma.xyz/annotate/${seq.id}`,
    image: seq.ipfsCid
      ? `ipfs://${seq.ipfsCid}`
      : `https://peptoma.xyz/og-peptide.png`,
    attributes: [
      { trait_type: "Platform", value: "PEPTOMA" },
      { trait_type: "RRID", value: "SCR_028424" },
      { trait_type: "Sequence ID", value: seq.id },
      { trait_type: "Amino Acid Sequence", value: seq.sequence },
      { trait_type: "Bioactivity Label", value: seq.bioactivityLabel ?? "Unknown" },
      { trait_type: "Bioactivity Score", value: seq.bioactivityScore, display_type: "boost_percentage" },
      { trait_type: "Confidence Score", value: seq.confidenceScore, display_type: "boost_percentage" },
      { trait_type: "Structure Prediction", value: structureLabel(seq.structurePrediction) },
      { trait_type: "Toxicity Safety Score", value: toxicityScore(seq.toxicityRisk), display_type: "boost_percentage" },
      seq.diseaseTarget ? { trait_type: "Disease Target", value: seq.diseaseTarget } : null,
      seq.molecularWeight ? { trait_type: "Molecular Weight (Da)", value: seq.molecularWeight, display_type: "number" } : null,
      seq.halfLife ? { trait_type: "Half-Life", value: seq.halfLife } : null,
      seq.chargeAtPH7 != null ? { trait_type: "Charge at pH 7", value: seq.chargeAtPH7, display_type: "number" } : null,
      { trait_type: "Analysis Depth", value: seq.depth?.toUpperCase() ?? "STANDARD" },
      { trait_type: "Community Annotations", value: annotations.length, display_type: "number" },
      { trait_type: "Contributors", value: contributors.length, display_type: "number" },
      seq.ipfsCid ? { trait_type: "IPFS CID", value: seq.ipfsCid } : null,
      { trait_type: "Discovery Date", value: today, display_type: "date" },
    ].filter(Boolean),
    ip_metadata: {
      title: `PEPTOMA Peptide Research Dataset — ${seq.bioactivityLabel ?? "Bioactive"} · Sequence #${seq.id}`,
      type: "Research Dataset + Novel Compound",
      inventors: contributors.length > 0 ? contributors : ["PEPTOMA Community"],
      institution: "PEPTOMA — Open DeSci Platform (peptoma.xyz)",
      discovery_date: today,
      platform_rrid: "RRID:SCR_028424",
      sequence: seq.sequence,
      therapeutic_area: seq.diseaseTarget ?? "General Bioactivity",
      bioactivity_score: seq.bioactivityScore,
      confidence_score: seq.confidenceScore,
      analysis_depth: seq.depth ?? "standard",
      ipfs_provenance: seq.ipfsCid ?? null,
      community_peer_review: {
        total_annotations: annotations.length,
        confirms: annotations.filter(a => a.type === "confirm").length,
        challenges: annotations.filter(a => a.type === "challenge").length,
        extensions: annotations.filter(a => a.type === "extend").length,
        tags: annotations.filter(a => a.type === "tag").length,
      },
      license: "CC BY 4.0 — Attribution required: PEPTOMA (peptoma.xyz), RRID:SCR_028424",
      data_uri: `https://peptoma.xyz/annotate/${seq.id}`,
    },
  };

  req.log.info({ sequenceId: id }, "Generated Molecule IP-NFT metadata");
  res.json({ metadata, sequenceId: id });
});

const AA_COLORS: Record<string, string> = {
  K: "#00ff9d", R: "#00ff9d", H: "#00e5a0",
  D: "#ff4757", E: "#ff6b7a",
  A: "#ffa502", V: "#ffb627", I: "#ffaa00", L: "#ffa502", M: "#ff8c00", F: "#e67e00", W: "#cc6600", P: "#ff9500",
  S: "#00d2ff", T: "#17c0eb", C: "#48dbfb", Y: "#0abde3", N: "#54a0ff", Q: "#2980b9",
  G: "#747d8c",
};

function aaColor(aa: string): string {
  return AA_COLORS[aa.toUpperCase()] ?? "#95a5a6";
}

function buildNFTSvg(seq: typeof sequencesTable.$inferSelect): string {
  const W = 500, H = 500;
  const sequence = seq.sequence ?? "";
  const label = (seq.bioactivityLabel ?? "peptide").toUpperCase();
  const bio = seq.bioactivityScore ?? 0;
  const conf = seq.confidenceScore ?? 0;
  const hasIpfs = !!seq.ipfsCid;

  const cols = 20;
  const dotR = 9;
  const gapX = (W - 40) / cols;
  const startY = 165;
  const rows = Math.ceil(sequence.length / cols);

  const dots = sequence.split("").map((aa, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = 20 + col * gapX + gapX / 2;
    const cy = startY + row * (dotR * 2 + 4);
    const color = aaColor(aa);
    return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${dotR}" fill="${color}" fill-opacity="0.9">
      <title>${aa}</title>
    </circle>
    <text x="${cx.toFixed(1)}" y="${(cy + 4).toFixed(1)}" text-anchor="middle" font-family="monospace" font-size="7" fill="#000" font-weight="bold">${aa}</text>`;
  }).join("\n");

  const seqHeight = rows * (dotR * 2 + 4) + 16;
  const barY = startY + seqHeight + 16;
  const bioW = Math.round((bio / 100) * 200);
  const confW = Math.round((conf / 100) * 200);

  const ipfsBadge = hasIpfs
    ? `<rect x="20" y="${H - 42}" width="130" height="22" rx="11" fill="#00ff9d" fill-opacity="0.15" stroke="#00ff9d" stroke-opacity="0.4" stroke-width="1"/>
       <circle cx="34" cy="${H - 31}" r="4" fill="#00ff9d"/>
       <text x="44" y="${H - 27}" font-family="monospace" font-size="9" fill="#00ff9d">IPFS VERIFIED</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#111827"/>
      <stop offset="100%" stop-color="#060b14"/>
    </radialGradient>
    <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#ffffff" stroke-opacity="0.03" stroke-width="0.5"/>
    </pattern>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)" rx="16"/>
  <rect width="${W}" height="${H}" fill="url(#grid)" rx="16"/>
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" fill="none" stroke="#ffa502" stroke-opacity="0.25" stroke-width="1.5" rx="15"/>

  <text x="20" y="32" font-family="monospace" font-size="10" fill="#ffa502" fill-opacity="0.7" letter-spacing="3">PEPTOMA × MOLECULE PROTOCOL</text>

  <text x="20" y="68" font-family="monospace" font-size="22" font-weight="bold" fill="#ffffff">IP-NFT #${seq.id}</text>
  <text x="20" y="90" font-family="monospace" font-size="11" fill="#ffa502" letter-spacing="2">${label}</text>

  <line x1="20" y1="104" x2="${W - 20}" y2="104" stroke="#ffffff" stroke-opacity="0.08" stroke-width="1"/>
  <text x="20" y="120" font-family="monospace" font-size="8" fill="#6b7280" letter-spacing="1">AMINO ACID SEQUENCE · ${sequence.length} RESIDUES</text>

  ${dots}

  <text x="20" y="${barY}" font-family="monospace" font-size="8" fill="#6b7280" letter-spacing="1">BIOACTIVITY</text>
  <text x="${W - 20}" y="${barY}" text-anchor="end" font-family="monospace" font-size="9" font-weight="bold" fill="#ffa502">${bio}/100</text>
  <rect x="20" y="${barY + 5}" width="200" height="5" rx="2.5" fill="#ffffff" fill-opacity="0.06"/>
  <rect x="20" y="${barY + 5}" width="${bioW}" height="5" rx="2.5" fill="#ffa502"/>

  <text x="20" y="${barY + 26}" font-family="monospace" font-size="8" fill="#6b7280" letter-spacing="1">CONFIDENCE</text>
  <text x="${W - 20}" y="${barY + 26}" text-anchor="end" font-family="monospace" font-size="9" font-weight="bold" fill="#00d2ff">${conf}/100</text>
  <rect x="20" y="${barY + 31}" width="200" height="5" rx="2.5" fill="#ffffff" fill-opacity="0.06"/>
  <rect x="20" y="${barY + 31}" width="${confW}" height="5" rx="2.5" fill="#00d2ff"/>

  ${ipfsBadge}

  <text x="${W - 20}" y="${H - 20}" text-anchor="end" font-family="monospace" font-size="8" fill="#374151">RRID:SCR_028424 · peptoma.xyz</text>
</svg>`;
}

router.get("/molecule/ipnft/:sequenceId/image.svg", async (req, res) => {
  const id = parseInt(req.params.sequenceId);
  if (!id) return res.status(400).send("Invalid ID");

  const seq = await db.query.sequencesTable.findFirst({ where: eq(sequencesTable.id, id) });
  if (!seq) return res.status(404).send("Not found");

  const svg = buildNFTSvg(seq);
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.send(svg);
});

export default router;
