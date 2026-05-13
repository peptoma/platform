import { Router } from "express";
import { db } from "@workspace/db";
import { stakingPositionsTable, stakingEpochsTable } from "@workspace/db";
import { eq, sum, and, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, getAccount } from "@solana/spl-token";
import bs58 from "bs58";

const router = Router();

// ─── Constants ────────────────────────────────────────────────────────────────
const PEPTOMA_CA = "HopMHHPfSV2kWQLghKt6xR1oWbPRLA2UyxnKGoPpump";
const PEPTM_DECIMALS = 6;
const RPC = "https://api.mainnet-beta.solana.com";
const BASE_APY = 0.12; // 12% annual base rate
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

const LOCK_MULTIPLIERS: Record<string, number> = {
  flexible: 1.0,
  "30d": 1.25,
  "90d": 1.75,
  "180d": 2.5,
};

const LOCK_DAYS: Record<string, number> = {
  flexible: 0,
  "30d": 30,
  "90d": 90,
  "180d": 180,
};

// ─── Reward helper ────────────────────────────────────────────────────────────
function calcPending(pos: {
  amount: number;
  multiplier: number;
  stakedAt: Date;
  lastClaimedAt: Date | null;
}): number {
  const from = pos.lastClaimedAt ?? pos.stakedAt;
  const elapsed = Date.now() - from.getTime();
  if (elapsed <= 0) return 0;
  return pos.amount * BASE_APY * pos.multiplier * (elapsed / YEAR_MS);
}

// ─── Treasury SPL helper ──────────────────────────────────────────────────────
async function sendRewardFromTreasury(toWallet: string, amount: number): Promise<string> {
  const privKey = process.env.TREASURY_PRIVATE_KEY;
  if (!privKey) throw new Error("TREASURY_PRIVATE_KEY not configured");

  const conn = new Connection(RPC, "confirmed");
  const treasury = Keypair.fromSecretKey(bs58.decode(privKey));
  const mintPk = new PublicKey(PEPTOMA_CA);
  const toPk = new PublicKey(toWallet);

  const fromATA = await getAssociatedTokenAddress(mintPk, treasury.publicKey);
  const toATA = await getAssociatedTokenAddress(mintPk, toPk);

  const tx = new Transaction();

  // Create recipient ATA if it doesn't exist
  try {
    await getAccount(conn, toATA);
  } catch {
    tx.add(createAssociatedTokenAccountInstruction(treasury.publicKey, toATA, toPk, mintPk));
  }

  const rawAmount = BigInt(Math.floor(amount * 10 ** PEPTM_DECIMALS));
  if (rawAmount <= 0n) throw new Error("Reward amount too small");

  tx.add(createTransferInstruction(fromATA, toATA, treasury.publicKey, rawAmount, [], TOKEN_PROGRAM_ID));

  const { blockhash } = await conn.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = treasury.publicKey;

  const sig = await conn.sendTransaction(tx, [treasury]);
  await conn.confirmTransaction(sig, "confirmed");
  return sig;
}

// ─── Validators ───────────────────────────────────────────────────────────────
const StakeBody = z.object({
  walletAddress: z.string().min(32),
  amount: z.number().positive(),
  lockPeriod: z.enum(["flexible", "30d", "90d", "180d"]),
  txSig: z.string().min(10),
});

const UnstakeParams = z.object({ id: z.coerce.number().int().positive() });

// ─── Routes ───────────────────────────────────────────────────────────────────
router.get("/staking/pool", async (_req, res) => {
  const positions = await db
    .select({
      totalStaked: sum(stakingPositionsTable.amount),
      totalWeighted: sql<number>`sum(${stakingPositionsTable.amount} * ${stakingPositionsTable.multiplier})`,
      positionCount: sql<number>`count(*)::int`,
    })
    .from(stakingPositionsTable)
    .where(eq(stakingPositionsTable.status, "active"));

  const epochs = await db
    .select()
    .from(stakingEpochsTable)
    .orderBy(sql`${stakingEpochsTable.epochNumber} desc`)
    .limit(4);

  const totalStaked = Number(positions[0]?.totalStaked ?? 0);
  const totalWeighted = Number(positions[0]?.totalWeighted ?? 0);
  const positionCount = Number(positions[0]?.positionCount ?? 0);

  const totalRewardPaid = epochs.reduce((s, e) => s + e.rewardPool, 0);
  const weeklyPool = epochs.length > 0 ? epochs[0].rewardPool : 0;
  const estimatedWeeklyReward = weeklyPool > 0 ? weeklyPool : 700;
  const aprPct = totalStaked > 0 ? BASE_APY * 100 : 12;

  res.json({
    totalStaked, totalWeighted, positionCount,
    estimatedWeeklyReward,
    aprPct: Math.round(aprPct * 10) / 10,
    totalRewardPaid,
    recentEpochs: epochs,
    baseApy: BASE_APY,
  });
});

router.get("/staking/positions", async (req, res) => {
  const { wallet } = z.object({ wallet: z.string().min(32) }).parse(req.query);
  const positions = await db
    .select()
    .from(stakingPositionsTable)
    .where(eq(stakingPositionsTable.walletAddress, wallet))
    .orderBy(sql`${stakingPositionsTable.stakedAt} desc`);

  // Attach pending rewards to each position
  const withRewards = positions.map(p => ({
    ...p,
    pendingRewards: p.status === "active" ? calcPending(p) : 0,
  }));

  res.json(withRewards);
});

router.get("/staking/rewards", async (req, res) => {
  const { wallet } = z.object({ wallet: z.string().min(32) }).parse(req.query);
  const positions = await db
    .select()
    .from(stakingPositionsTable)
    .where(and(
      eq(stakingPositionsTable.walletAddress, wallet),
      eq(stakingPositionsTable.status, "active"),
    ));

  const rewardsByPosition = positions.map(p => ({
    id: p.id,
    amount: p.amount,
    lockPeriod: p.lockPeriod,
    multiplier: p.multiplier,
    pendingRewards: calcPending(p),
    lastClaimedAt: p.lastClaimedAt,
    rewardsClaimed: p.rewardsClaimed,
  }));

  const totalPending = rewardsByPosition.reduce((s, r) => s + r.pendingRewards, 0);
  const totalClaimed = rewardsByPosition.reduce((s, r) => s + r.rewardsClaimed, 0);

  res.json({ positions: rewardsByPosition, totalPending, totalClaimed });
});

router.post("/staking/claim", async (req, res) => {
  const { walletAddress } = z.object({ walletAddress: z.string().min(32) }).parse(req.body);

  const positions = await db
    .select()
    .from(stakingPositionsTable)
    .where(and(
      eq(stakingPositionsTable.walletAddress, walletAddress),
      eq(stakingPositionsTable.status, "active"),
    ));

  const totalPending = positions.reduce((s, p) => s + calcPending(p), 0);

  if (totalPending < 0.000001) {
    res.status(400).json({ error: "No rewards to claim (minimum 0.000001 $PEPTM)" });
    return;
  }

  const txSig = await sendRewardFromTreasury(walletAddress, totalPending);
  const now = new Date();

  for (const pos of positions) {
    const earned = calcPending(pos);
    await db
      .update(stakingPositionsTable)
      .set({
        rewardsClaimed: pos.rewardsClaimed + earned,
        lastClaimedAt: now,
        claimTxSig: txSig,
      })
      .where(eq(stakingPositionsTable.id, pos.id));
  }

  res.json({ txSig, claimed: totalPending, positions: positions.length });
});

router.post("/staking/stake", async (req, res) => {
  const body = StakeBody.parse(req.body);

  // Verify txSig exists and is confirmed on-chain
  try {
    const conn = new Connection(RPC, "confirmed");
    const statuses = await conn.getSignatureStatuses([body.txSig], { searchTransactionHistory: true });
    const status = statuses.value[0];
    if (!status) {
      res.status(400).json({ error: "Transaction not found on-chain. Please wait a moment and retry." });
      return;
    }
    if (status.err) {
      res.status(400).json({ error: "Transaction failed on-chain. Please try again." });
      return;
    }
  } catch (e) {
    req.log?.warn({ err: e }, "Could not verify stake txSig — allowing (RPC may be slow)");
  }

  const multiplier = LOCK_MULTIPLIERS[body.lockPeriod];
  const lockDays = LOCK_DAYS[body.lockPeriod];
  const unlockAt = lockDays > 0 ? new Date(Date.now() + lockDays * 86400_000) : null;

  const [position] = await db
    .insert(stakingPositionsTable)
    .values({
      walletAddress: body.walletAddress,
      amount: body.amount,
      lockPeriod: body.lockPeriod,
      multiplier,
      unlockAt,
      txSig: body.txSig,
      status: "active",
      rewardsClaimed: 0,
      lastClaimedAt: new Date(),
    })
    .returning();

  res.status(201).json(position);
});

router.post("/staking/unstake/:id", async (req, res) => {
  const { id } = UnstakeParams.parse(req.params);
  const { wallet } = z.object({ wallet: z.string().min(32) }).parse(req.body);

  const position = await db.query.stakingPositionsTable.findFirst({
    where: and(
      eq(stakingPositionsTable.id, id),
      eq(stakingPositionsTable.walletAddress, wallet),
      eq(stakingPositionsTable.status, "active")
    ),
  });

  if (!position) {
    res.status(404).json({ error: "Position not found or not active" });
    return;
  }

  if (position.unlockAt && position.unlockAt > new Date()) {
    res.status(400).json({ error: "Lock period not expired", unlockAt: position.unlockAt });
    return;
  }

  // Send principal + pending rewards back to user from treasury in one transfer
  const pending = calcPending(position);
  const totalReturn = position.amount + (pending >= 0.000001 ? pending : 0);
  let returnTxSig: string | undefined;

  if (process.env.TREASURY_PRIVATE_KEY) {
    try {
      returnTxSig = await sendRewardFromTreasury(wallet, totalReturn);
    } catch (e) {
      req.log.error({ err: e, wallet, amount: totalReturn }, "Failed to return staked tokens");
      res.status(500).json({ error: "Could not return staked tokens from treasury. Please contact support." });
      return;
    }
  }

  const [updated] = await db
    .update(stakingPositionsTable)
    .set({
      status: "completed",
      rewardsClaimed: position.rewardsClaimed + pending,
      lastClaimedAt: new Date(),
      claimTxSig: returnTxSig ?? position.claimTxSig ?? undefined,
    })
    .where(eq(stakingPositionsTable.id, id))
    .returning();

  res.json({ ...updated, pendingRewards: pending, returnTxSig, returnedAmount: totalReturn });
});

router.get("/staking/leaderboard", async (_req, res) => {
  const rows = await db
    .select({
      walletAddress: stakingPositionsTable.walletAddress,
      totalStaked: sql<number>`sum(${stakingPositionsTable.amount})`,
      totalWeighted: sql<number>`sum(${stakingPositionsTable.amount} * ${stakingPositionsTable.multiplier})`,
      positionCount: sql<number>`count(*)::int`,
    })
    .from(stakingPositionsTable)
    .where(eq(stakingPositionsTable.status, "active"))
    .groupBy(stakingPositionsTable.walletAddress)
    .orderBy(sql`sum(${stakingPositionsTable.amount} * ${stakingPositionsTable.multiplier}) desc`)
    .limit(20);

  res.json(rows.map((r, i) => ({
    rank: i + 1,
    walletAddress: r.walletAddress,
    shortAddress: `${r.walletAddress.slice(0, 4)}…${r.walletAddress.slice(-4)}`,
    totalStaked: Number(r.totalStaked),
    totalWeighted: Number(r.totalWeighted),
    positionCount: Number(r.positionCount),
  })));
});

export default router;
