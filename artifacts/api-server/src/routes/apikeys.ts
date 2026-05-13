import { Router } from "express";
import { db, apiKeysTable, stakingPositionsTable } from "@workspace/db";
import { eq, and, isNull, sum as drizzleSum, sql } from "drizzle-orm";
import crypto from "crypto";
import { z } from "zod/v4";

const router = Router();

function deriveStakingTier(totalStaked: number): "free" | "researcher" | "pro" | "lab" {
  if (totalStaked >= 10000) return "lab";
  if (totalStaked >= 2000) return "pro";
  if (totalStaked >= 500) return "researcher";
  return "free";
}

const GenerateKeyBody = z.object({
  walletAddress: z.string().min(32),
  userId: z.string().min(1),
  label: z.string().max(64).optional(),
});

const ListKeysQuery = z.object({
  walletAddress: z.string().min(32),
});

router.post("/keys/generate", async (req, res) => {
  const parsed = GenerateKeyBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request body", issues: parsed.error.issues }); return; }
  const body = parsed.data;

  const stakeResult = await db.select({
    total: drizzleSum(stakingPositionsTable.amount),
  }).from(stakingPositionsTable)
    .where(and(
      eq(stakingPositionsTable.walletAddress, body.walletAddress),
      eq(stakingPositionsTable.status, "active"),
    ));

  const totalStaked = Number(stakeResult[0]?.total ?? 0);
  const tier = deriveStakingTier(totalStaked);

  if (tier !== "pro" && tier !== "lab") {
    return res.status(403).json({
      error: "API key access requires PRO tier (≥2,000 $PEPTM staked) or LAB tier",
      currentTier: tier,
      totalStaked,
    });
  }

  const rawKey = `pptm_${crypto.randomBytes(24).toString("hex")}`;

  const [apiKey] = await db.insert(apiKeysTable).values({
    userId: body.userId,
    walletAddress: body.walletAddress,
    key: rawKey,
    label: body.label ?? "Default",
    tier,
  }).returning();

  res.status(201).json({
    id: apiKey.id,
    key: rawKey,
    label: apiKey.label,
    tier: apiKey.tier,
    createdAt: apiKey.createdAt,
  });
});

router.get("/keys", async (req, res) => {
  const parsed = ListKeysQuery.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "walletAddress is required" }); return; }
  const { walletAddress } = parsed.data;

  const keys = await db.select({
    id: apiKeysTable.id,
    label: apiKeysTable.label,
    tier: apiKeysTable.tier,
    callCount: apiKeysTable.callCount,
    createdAt: apiKeysTable.createdAt,
    lastUsedAt: apiKeysTable.lastUsedAt,
    keyPreview: apiKeysTable.key,
  }).from(apiKeysTable)
    .where(and(
      eq(apiKeysTable.walletAddress, walletAddress),
      isNull(apiKeysTable.revokedAt),
    ));

  res.json(keys.map(k => ({
    ...k,
    keyPreview: `${k.keyPreview.slice(0, 12)}...${k.keyPreview.slice(-4)}`,
  })));
});

router.delete("/keys/:id", async (req, res) => {
  const qp = ListKeysQuery.safeParse(req.query);
  if (!qp.success) { res.status(400).json({ error: "walletAddress is required" }); return; }
  const { walletAddress } = qp.data;
  const id = parseInt(req.params.id);

  const [revoked] = await db.update(apiKeysTable)
    .set({ revokedAt: new Date() })
    .where(and(
      eq(apiKeysTable.id, id),
      eq(apiKeysTable.walletAddress, walletAddress),
      isNull(apiKeysTable.revokedAt),
    ))
    .returning({ id: apiKeysTable.id });

  if (!revoked) return res.status(404).json({ error: "Key not found or already revoked" });
  res.json({ revoked: true });
});

export async function resolveApiKeyAuth(authHeader: string | undefined): Promise<{ walletAddress: string; userId: string; tier: string } | null> {
  if (!authHeader?.startsWith("Bearer pptm_")) return null;
  const key = authHeader.slice(7);

  const [found] = await db.select({
    walletAddress: apiKeysTable.walletAddress,
    userId: apiKeysTable.userId,
    tier: apiKeysTable.tier,
    revokedAt: apiKeysTable.revokedAt,
  }).from(apiKeysTable).where(eq(apiKeysTable.key, key));

  if (!found || found.revokedAt) return null;

  await db.update(apiKeysTable)
    .set({ lastUsedAt: new Date(), callCount: sql`${apiKeysTable.callCount} + 1` })
    .where(eq(apiKeysTable.key, key));

  return { walletAddress: found.walletAddress, userId: found.userId, tier: found.tier };
}

export default router;
