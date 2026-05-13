import { Router } from "express";
import { db, sequencesTable, annotationsTable, userTokensTable } from "@workspace/db";
import { desc, eq, ilike, or, sql, and } from "drizzle-orm";
import { z } from "zod/v4";

const router = Router();

router.get("/search", async (req, res) => {
  const Query = z.object({
    q: z.string().min(1).max(200),
    type: z.enum(["all", "sequences", "users", "annotations"]).default("all"),
  });

  const parsed = Query.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Missing query" }); return; }
  const { q, type } = parsed.data;
  const term = `%${q}%`;

  const results: {
    sequences: object[];
    users: object[];
    annotations: object[];
  } = { sequences: [], users: [], annotations: [] };

  if (type === "all" || type === "sequences") {
    results.sequences = await db
      .select({
        id: sequencesTable.id,
        sequence: sequencesTable.sequence,
        diseaseTarget: sequencesTable.diseaseTarget,
        bioactivityLabel: sequencesTable.bioactivityLabel,
        bioactivityScore: sequencesTable.bioactivityScore,
        structurePrediction: sequencesTable.structurePrediction,
        toxicityRisk: sequencesTable.toxicityRisk,
        voteCount: sequencesTable.voteCount,
        annotationCount: sequencesTable.annotationCount,
        createdAt: sequencesTable.createdAt,
        userId: sequencesTable.userId,
        tags: sequencesTable.tags,
      })
      .from(sequencesTable)
      .where(
        and(
          eq(sequencesTable.status, "completed"),
          or(
            ilike(sequencesTable.sequence, term),
            ilike(sequencesTable.diseaseTarget, term),
            ilike(sequencesTable.bioactivityLabel, term),
            ilike(sequencesTable.userId, term),
            sql`${sequencesTable.tags}::text ilike ${term}`,
          )
        )
      )
      .orderBy(desc(sequencesTable.bioactivityScore))
      .limit(8);
  }

  if (type === "all" || type === "users") {
    results.users = await db
      .select({
        userId: userTokensTable.userId,
        username: userTokensTable.username,
        stakingTier: userTokensTable.stakingTier,
        earnedTotal: userTokensTable.earnedTotal,
        stakedAmount: userTokensTable.stakedAmount,
        solanaAddress: userTokensTable.solanaAddress,
      })
      .from(userTokensTable)
      .where(
        or(
          ilike(userTokensTable.username, term),
          ilike(userTokensTable.userId, term),
          ilike(userTokensTable.solanaAddress, term),
        )
      )
      .limit(5);
  }

  if (type === "all" || type === "annotations") {
    results.annotations = await db
      .select({
        id: annotationsTable.id,
        sequenceId: annotationsTable.sequenceId,
        type: annotationsTable.type,
        content: annotationsTable.content,
        score: annotationsTable.score,
        userId: annotationsTable.userId,
        createdAt: annotationsTable.createdAt,
      })
      .from(annotationsTable)
      .where(ilike(annotationsTable.content, term))
      .orderBy(desc(annotationsTable.score))
      .limit(5);
  }

  res.json(results);
});

export default router;
