import { Router } from "express";
import { db, sequencesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

// GET /sequences/:id/forks — sequences forked from this one
router.get("/sequences/:id/forks", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid sequence ID" });

  const [original] = await db.select({ id: sequencesTable.id }).from(sequencesTable).where(eq(sequencesTable.id, id));
  if (!original) return res.status(404).json({ error: "Sequence not found" });

  const forks = await db
    .select()
    .from(sequencesTable)
    .where(eq(sequencesTable.forkedFromId, id));

  return res.json(forks);
});

// GET /sequences/:id/citations — sequences that cite this one
router.get("/sequences/:id/citations", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid sequence ID" });

  const [original] = await db.select({ id: sequencesTable.id }).from(sequencesTable).where(eq(sequencesTable.id, id));
  if (!original) return res.status(404).json({ error: "Sequence not found" });

  const citations = await db
    .select()
    .from(sequencesTable)
    .where(sql`${id} = ANY(${sequencesTable.citedSequenceIds})`);

  return res.json(citations);
});

// POST /sequences/:id/fork — fork a sequence (copies its metadata, status=processing)
router.post("/sequences/:id/fork", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid sequence ID" });

  const { userId } = req.body as { userId?: string };
  if (!userId) return res.status(400).json({ error: "userId required" });

  const [original] = await db.select().from(sequencesTable).where(eq(sequencesTable.id, id));
  if (!original) return res.status(404).json({ error: "Sequence not found" });

  const [fork] = await db
    .insert(sequencesTable)
    .values({
      sequence: original.sequence,
      userId,
      diseaseTarget: original.diseaseTarget,
      notes: original.notes ? `[Forked from #${id}] ${original.notes}` : `[Forked from #${id}]`,
      depth: original.depth,
      forkedFromId: id,
      citedSequenceIds: [id],
      status: "processing",
    })
    .returning();

  return res.status(201).json(fork);
});

export default router;
