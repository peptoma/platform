import { Router } from "express";
import { db, sequencesTable, annotationsTable, userTokensTable } from "@workspace/db";
import { gte, lte, and, eq, sql } from "drizzle-orm";

const router = Router();

const EVENT_START = new Date("2026-05-06T00:00:00Z");
const EVENT_END   = new Date("2026-05-13T23:59:59Z");
const PRIZE_POOL  = 20_000_000;
const PTS_PER_RUN = 10;
const PTS_PER_ANN = 15;

const CURRENT_EVENT = {
  id: "season1-top-contributor",
  name: "Top Contributor Challenge",
  season: "Season 1",
  description:
    "Compete globally by submitting peptide sequences and annotating discoveries. " +
    "Earn points for every analysis run and community annotation. " +
    "Prize pool distributed proportionally — the more you contribute, the more you earn.",
  startAt: EVENT_START.toISOString(),
  endAt: EVENT_END.toISOString(),
  status: ((): "upcoming" | "active" | "ended" => {
    const now = Date.now();
    if (now < EVENT_START.getTime()) return "upcoming";
    if (now > EVENT_END.getTime()) return "ended";
    return "active";
  })(),
  prizePool: PRIZE_POOL,
  distribution: "proportional",
  scoring: { perRun: PTS_PER_RUN, perAnnotation: PTS_PER_ANN, perTokenEarned: 0 },
  updatedAt: new Date().toISOString(),
};

router.get("/events/current", (_req, res) => {
  res.json({ ...CURRENT_EVENT, status: computeStatus(), updatedAt: new Date().toISOString() });
});

function computeStatus(): "upcoming" | "active" | "ended" {
  const now = Date.now();
  if (now < EVENT_START.getTime()) return "upcoming";
  if (now > EVENT_END.getTime()) return "ended";
  return "active";
}

router.get("/events/leaderboard", async (_req, res) => {
  const [runsRaw, annsRaw] = await Promise.all([
    db.select({
      userId: sequencesTable.userId,
      runs: sql<number>`count(*)::int`,
    })
      .from(sequencesTable)
      .where(and(
        gte(sequencesTable.createdAt, EVENT_START),
        lte(sequencesTable.createdAt, EVENT_END),
        eq(sequencesTable.status, "completed"),
      ))
      .groupBy(sequencesTable.userId),

    db.select({
      userId: annotationsTable.userId,
      annotations: sql<number>`count(*)::int`,
    })
      .from(annotationsTable)
      .where(and(
        gte(annotationsTable.createdAt, EVENT_START),
        lte(annotationsTable.createdAt, EVENT_END),
      ))
      .groupBy(annotationsTable.userId),
  ]);

  const runMap = new Map(runsRaw.map(r => [r.userId, r.runs]));
  const annMap = new Map(annsRaw.map(a => [a.userId, a.annotations]));
  const allUserIds = new Set([...runMap.keys(), ...annMap.keys()]);

  if (allUserIds.size === 0) {
    res.json({ leaderboard: [], totalParticipants: 0, totalScore: 0, updatedAt: new Date().toISOString() });
    return;
  }

  const usernames = await db.select({ userId: userTokensTable.userId, username: userTokensTable.username })
    .from(userTokensTable)
    .where(sql`${userTokensTable.userId} = ANY(${[...allUserIds]})`);
  const usernameMap = new Map(usernames.map(u => [u.userId, u.username]));

  const entries = [...allUserIds].map(uid => {
    const runs = runMap.get(uid) ?? 0;
    const annotations = annMap.get(uid) ?? 0;
    const combinedScore = runs * PTS_PER_RUN + annotations * PTS_PER_ANN;
    return { userId: uid, username: usernameMap.get(uid) ?? "", totalRuns: runs, totalAnnotations: annotations, combinedScore };
  }).sort((a, b) => b.combinedScore - a.combinedScore);

  const totalScore = entries.reduce((s, e) => s + e.combinedScore, 0);

  const leaderboard = entries.map((e, i) => ({
    rank: i + 1,
    ...e,
    sharePercent: totalScore > 0 ? (e.combinedScore / totalScore) * 100 : 0,
    estimatedReward: totalScore > 0 ? Math.floor((e.combinedScore / totalScore) * PRIZE_POOL) : 0,
    totalTokensEarned: 0,
  }));

  res.json({ leaderboard, totalParticipants: leaderboard.length, totalScore, updatedAt: new Date().toISOString() });
});

export default router;
