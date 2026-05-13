import { Router } from "express";
import { db, governanceProposalsTable, governanceVotesTable, stakingPositionsTable } from "@workspace/db";
import { eq, and, isNull, sum as drizzleSum } from "drizzle-orm";
import { z } from "zod/v4";

const router = Router();

function deriveStakingTier(totalStaked: number): "free" | "researcher" | "pro" | "lab" {
  if (totalStaked >= 10000) return "lab";
  if (totalStaked >= 2000) return "pro";
  if (totalStaked >= 500) return "researcher";
  return "free";
}

function voteWeight(tier: string, staked: number): number {
  if (tier === "lab") return Math.max(3, staked / 1000);
  if (tier === "pro") return Math.max(2, staked / 2000);
  if (tier === "researcher") return Math.max(1.5, staked / 2000);
  return 1;
}

async function seedProposals() {
  const existing = await db.select({ id: governanceProposalsTable.id }).from(governanceProposalsTable).limit(1);
  if (existing.length > 0) return;

  const now = new Date();
  const d = (days: number) => new Date(now.getTime() + days * 86400_000);

  await db.insert(governanceProposalsTable).values([
    {
      title: "Increase Extend Annotation Reward from +5 to +8 pts",
      description: "Extend annotations require significant research effort to compose meaningful additions. Raising the reward from +5 to +8 pts better compensates contributors and incentivizes higher-quality extensions. This proposal has no impact on token emission — points are off-chain activity scores.",
      category: "reward_rate",
      status: "active",
      yesVotes: 12400,
      noVotes: 3100,
      yesCount: 18,
      noCount: 5,
      quorum: 10000,
      endsAt: d(5),
    },
    {
      title: "Lower RESEARCHER Tier Threshold from 500 to 300 $PEPTM",
      description: "Reducing the RESEARCHER tier entry threshold from 500 to 300 $PEPTM would lower the barrier for new contributors to access deep analysis and 20 runs/day. More researchers in the ecosystem benefits the science graph. LAB and PRO thresholds are unchanged.",
      category: "tier_requirement",
      status: "active",
      yesVotes: 8700,
      noVotes: 9200,
      yesCount: 12,
      noCount: 14,
      quorum: 10000,
      endsAt: d(3),
    },
    {
      title: "Add Peptide Toxicity Flag as New Annotation Type",
      description: "Proposal to introduce a fifth annotation type: 'Flag Toxicity'. This would allow community members to formally flag sequences showing unexpected toxicity signals in literature. Reward: +4 pts per flag, with challenge mechanism. Requires scoring weight update.",
      category: "scoring",
      status: "active",
      yesVotes: 21000,
      noVotes: 1800,
      yesCount: 29,
      noCount: 3,
      quorum: 10000,
      endsAt: d(7),
    },
    {
      title: "Set Maximum API Rate Limit to 500 Requests/Hour for PRO",
      description: "Currently PRO tier has unlimited API requests which may impact server performance as agent usage scales. Proposal: cap PRO at 500 req/hour, LAB at 2000 req/hour. Existing PRO users would be notified 7 days before enforcement.",
      category: "policy",
      status: "passed",
      yesVotes: 33000,
      noVotes: 4500,
      yesCount: 41,
      noCount: 6,
      quorum: 10000,
      endsAt: new Date(now.getTime() - 2 * 86400_000),
    },
  ]);
}

seedProposals().catch(() => {});

router.get("/governance/proposals", async (req, res) => {
  const walletAddress = req.query.wallet as string | undefined;

  const proposals = await db.select().from(governanceProposalsTable).orderBy(governanceProposalsTable.createdAt);

  let userVotes: Record<number, string> = {};
  if (walletAddress) {
    const votes = await db.select({
      proposalId: governanceVotesTable.proposalId,
      vote: governanceVotesTable.vote,
    }).from(governanceVotesTable).where(eq(governanceVotesTable.walletAddress, walletAddress));
    userVotes = Object.fromEntries(votes.map(v => [v.proposalId, v.vote]));
  }

  const now = new Date();
  const result = proposals.map(p => ({
    ...p,
    totalWeight: p.yesVotes + p.noVotes,
    yesPct: (p.yesVotes + p.noVotes) > 0 ? Math.round((p.yesVotes / (p.yesVotes + p.noVotes)) * 100) : 0,
    quorumReached: (p.yesVotes + p.noVotes) >= p.quorum,
    isExpired: new Date(p.endsAt) < now,
    userVote: userVotes[p.id] ?? null,
  }));

  res.json(result);
});

router.post("/governance/proposals", async (req, res) => {
  const Body = z.object({
    title: z.string().min(10).max(200),
    description: z.string().min(30).max(2000),
    category: z.enum(["reward_rate", "tier_requirement", "scoring", "policy", "other"]),
    durationDays: z.number().int().min(3).max(30).default(7),
    authorWallet: z.string().min(32),
  });

  const parsed = Body.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid body", issues: parsed.error.issues }); return; }
  const { title, description, category, durationDays, authorWallet } = parsed.data;

  const endsAt = new Date(Date.now() + durationDays * 86400_000);

  const [proposal] = await db.insert(governanceProposalsTable).values({
    title, description, category, authorWallet, endsAt,
    status: "active", yesVotes: 0, noVotes: 0, yesCount: 0, noCount: 0, quorum: 10000,
  }).returning();

  res.status(201).json(proposal);
});

router.post("/governance/proposals/:id/vote", async (req, res) => {
  const id = parseInt(req.params.id);
  const VoteBody = z.object({
    walletAddress: z.string().min(32),
    vote: z.enum(["yes", "no"]),
  });

  const parsed = VoteBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid body" }); return; }
  const { walletAddress, vote } = parsed.data;

  const [proposal] = await db.select().from(governanceProposalsTable).where(eq(governanceProposalsTable.id, id));
  if (!proposal) { res.status(404).json({ error: "Proposal not found" }); return; }
  if (proposal.status !== "active") { res.status(400).json({ error: "Proposal is not active" }); return; }
  if (new Date(proposal.endsAt) < new Date()) { res.status(400).json({ error: "Voting period has ended" }); return; }

  const [existing] = await db.select().from(governanceVotesTable).where(
    and(eq(governanceVotesTable.proposalId, id), eq(governanceVotesTable.walletAddress, walletAddress))
  );
  if (existing) { res.status(409).json({ error: "Already voted on this proposal", vote: existing.vote }); return; }

  const stakeResult = await db.select({ total: drizzleSum(stakingPositionsTable.amount) })
    .from(stakingPositionsTable)
    .where(and(eq(stakingPositionsTable.walletAddress, walletAddress), eq(stakingPositionsTable.status, "active")));
  const totalStaked = Number(stakeResult[0]?.total ?? 0);
  const tier = deriveStakingTier(totalStaked);
  const weight = voteWeight(tier, totalStaked);

  await db.insert(governanceVotesTable).values({ proposalId: id, walletAddress, vote, weight, stakingTier: tier });

  if (vote === "yes") {
    await db.update(governanceProposalsTable).set({
      yesVotes: proposal.yesVotes + weight,
      yesCount: proposal.yesCount + 1,
    }).where(eq(governanceProposalsTable.id, id));
  } else {
    await db.update(governanceProposalsTable).set({
      noVotes: proposal.noVotes + weight,
      noCount: proposal.noCount + 1,
    }).where(eq(governanceProposalsTable.id, id));
  }

  res.json({ success: true, vote, weight, tier });
});

export default router;
