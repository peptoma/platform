import { Router } from "express";
import { db } from "@workspace/db";
import { sequencesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/sequences/:id/esmfold", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return void res.status(400).json({ error: "Invalid ID" });

  const [seq] = await db
    .select({ sequence: sequencesTable.sequence })
    .from(sequencesTable)
    .where(eq(sequencesTable.id, id))
    .limit(1);

  if (!seq) return void res.status(404).json({ error: "Sequence not found" });

  const sequence = seq.sequence.replace(/[^ACDEFGHIKLMNPQRSTVWY]/gi, "").slice(0, 400);
  if (sequence.length < 4) return void res.status(400).json({ error: "Sequence too short" });

  try {
    const esmRes = await fetch("https://api.esmatlas.com/foldSequence/v1/pdb/", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: sequence,
      signal: AbortSignal.timeout(60_000),
    });
    if (!esmRes.ok) {
      req.log.warn({ status: esmRes.status }, "ESMFold API error");
      return void res.status(502).json({ error: "ESMFold API error", status: esmRes.status });
    }
    const pdbData = await esmRes.text();
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(pdbData);
  } catch (err) {
    req.log.error({ err }, "ESMFold request failed");
    return void res.status(502).json({ error: "ESMFold unavailable" });
  }
});

router.get("/sequences/:id/alphafold", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return void res.status(400).json({ error: "Invalid ID" });

  const [seq] = await db
    .select({ sequence: sequencesTable.sequence })
    .from(sequencesTable)
    .where(eq(sequencesTable.id, id))
    .limit(1);

  if (!seq) return void res.status(404).json({ error: "Sequence not found" });

  const uniprotUrl =
    `https://rest.uniprot.org/uniprotkb/search?query=sequence_exact%3A${encodeURIComponent(seq.sequence)}` +
    `&format=json&fields=accession%2Cprotein_name%2Corganism_name%2Csequence&size=1`;

  try {
    const uniprotRes = await fetch(uniprotUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });

    if (!uniprotRes.ok) {
      return void res.json({ found: false, novel: true });
    }

    const uniprotData = (await uniprotRes.json()) as {
      results?: Array<{
        primaryAccession: string;
        proteinDescription?: {
          recommendedName?: { fullName?: { value?: string } };
          submissionNames?: Array<{ fullName?: { value?: string } }>;
        };
        organism?: { scientificName?: string };
        sequence?: { length?: number };
      }>;
    };

    const results = uniprotData?.results;
    if (!results || results.length === 0) {
      return void res.json({ found: false, novel: true, sequence: seq.sequence });
    }

    const entry = results[0];
    const accession = entry.primaryAccession;
    const proteinName =
      entry.proteinDescription?.recommendedName?.fullName?.value ??
      entry.proteinDescription?.submissionNames?.[0]?.fullName?.value ??
      null;
    const organism = entry.organism?.scientificName ?? null;
    const length = entry.sequence?.length ?? null;

    const afRes = await fetch(`https://alphafold.ebi.ac.uk/api/prediction/${accession}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });

    if (!afRes.ok) {
      return void res.json({
        found: true,
        hasStructure: false,
        accession,
        proteinName,
        organism,
        length,
        uniprotUrl: `https://www.uniprot.org/uniprotkb/${accession}`,
      });
    }

    const afRaw = (await afRes.json()) as Array<{
      meanPlddt?: number;
      pdbUrl?: string;
      cifUrl?: string;
      modelCreatedDate?: string;
      uniprotDescription?: string;
    }>;
    const prediction = Array.isArray(afRaw) ? afRaw[0] : afRaw;

    return void res.json({
      found: true,
      hasStructure: true,
      accession,
      proteinName: proteinName ?? prediction.uniprotDescription ?? null,
      organism,
      length,
      meanPlddt: prediction.meanPlddt ?? null,
      pdbUrl: prediction.pdbUrl ?? null,
      modelCreatedDate: prediction.modelCreatedDate ?? null,
      alphafoldPageUrl: `https://alphafold.ebi.ac.uk/entry/${accession}`,
      uniprotUrl: `https://www.uniprot.org/uniprotkb/${accession}`,
    });
  } catch (err) {
    req.log.error({ err }, "AlphaFold lookup failed");
    return void res.status(500).json({ error: "Lookup failed" });
  }
});

export default router;
