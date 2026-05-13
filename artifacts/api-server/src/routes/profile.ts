import { Router } from "express";
import { db, sequencesTable, annotationsTable, userTokensTable, governanceVotesTable } from "@workspace/db";
import { eq, desc, sql, count } from "drizzle-orm";

const router = Router();

router.get("/profile/:wallet", async (req, res) => {
  const { wallet } = req.params;
  if (!wallet || wallet.length < 10) { res.status(400).json({ error: "Invalid wallet" }); return; }

  const [
    tokenUser,
    sequenceStats,
    annotationStats,
    recentSequences,
    recentAnnotations,
    governanceCount,
    annotationBreakdown,
  ] = await Promise.all([
    db.query.userTokensTable.findFirst({ where: eq(userTokensTable.userId, wallet) }),

    db.select({
      total: sql<number>`count(*)::int`,
      completed: sql<number>`count(*) filter (where status = 'completed')::int`,
      avgScore: sql<number>`round(avg(bioactivity_score) filter (where status = 'completed')::numeric, 1)::float`,
      totalVotesReceived: sql<number>`coalesce(sum(vote_count), 0)::int`,
      totalAnnotationsReceived: sql<number>`coalesce(sum(annotation_count), 0)::int`,
    }).from(sequencesTable).where(eq(sequencesTable.userId, wallet)).then(r => r[0]),

    db.select({ total: sql<number>`count(*)::int` })
      .from(annotationsTable).where(eq(annotationsTable.userId, wallet)).then(r => r[0]),

    db.select({
      id: sequencesTable.id,
      sequence: sequencesTable.sequence,
      diseaseTarget: sequencesTable.diseaseTarget,
      bioactivityLabel: sequencesTable.bioactivityLabel,
      bioactivityScore: sequencesTable.bioactivityScore,
      structurePrediction: sequencesTable.structurePrediction,
      toxicityRisk: sequencesTable.toxicityRisk,
      voteCount: sequencesTable.voteCount,
      annotationCount: sequencesTable.annotationCount,
      status: sequencesTable.status,
      createdAt: sequencesTable.createdAt,
      depth: sequencesTable.depth,
    }).from(sequencesTable)
      .where(eq(sequencesTable.userId, wallet))
      .orderBy(desc(sequencesTable.createdAt))
      .limit(6),

    db.select({
      id: annotationsTable.id,
      sequenceId: annotationsTable.sequenceId,
      type: annotationsTable.type,
      content: annotationsTable.content,
      score: annotationsTable.score,
      tokensEarned: annotationsTable.tokensEarned,
      createdAt: annotationsTable.createdAt,
    }).from(annotationsTable)
      .where(eq(annotationsTable.userId, wallet))
      .orderBy(desc(annotationsTable.createdAt))
      .limit(5),

    db.select({ total: sql<number>`count(*)::int` })
      .from(governanceVotesTable).where(eq(governanceVotesTable.walletAddress, wallet)).then(r => r[0]),

    db.select({
      type: annotationsTable.type,
      count: sql<number>`count(*)::int`,
      earned: sql<number>`coalesce(sum(tokens_earned), 0)::int`,
    }).from(annotationsTable)
      .where(eq(annotationsTable.userId, wallet))
      .groupBy(annotationsTable.type),
  ]);

  if (!tokenUser && sequenceStats.total === 0) {
    res.status(404).json({ error: "Researcher not found" });
    return;
  }

  res.json({
    wallet,
    username: tokenUser?.username ?? null,
    stakingTier: tokenUser?.stakingTier ?? "free",
    balance: tokenUser?.balance ?? 0,
    stakedAmount: tokenUser?.stakedAmount ?? 0,
    earnedTotal: tokenUser?.earnedTotal ?? 0,
    solanaAddress: tokenUser?.solanaAddress ?? wallet,
    totalSequences: sequenceStats.total,
    completedSequences: sequenceStats.completed,
    avgBioactivityScore: sequenceStats.avgScore ?? 0,
    totalVotesReceived: sequenceStats.totalVotesReceived,
    totalAnnotationsReceived: sequenceStats.totalAnnotationsReceived,
    totalAnnotationsMade: annotationStats.total,
    totalGovernanceVotes: governanceCount.total,
    annotationBreakdown,
    recentSequences,
    recentAnnotations,
  });
});

export default router;
