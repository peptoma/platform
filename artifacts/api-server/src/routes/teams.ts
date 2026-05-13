import { Router } from "express";
import { db, userTokensTable, teamsTable, teamMembersTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";

const router = Router();

async function getStakingTier(wallet: string): Promise<string | null> {
  const [user] = await db
    .select({ stakingTier: userTokensTable.stakingTier })
    .from(userTokensTable)
    .where(eq(userTokensTable.solanaAddress, wallet));
  return user?.stakingTier ?? null;
}

// POST /teams — create team (Lab tier required)
router.post("/teams", async (req, res) => {
  const { name, description, ownerWallet } = req.body as { name?: string; description?: string; ownerWallet?: string };
  if (!name || !ownerWallet) return res.status(400).json({ error: "name and ownerWallet required" });

  const tier = await getStakingTier(ownerWallet);
  if (tier !== "lab") return res.status(403).json({ error: "Lab tier required to create a team" });

  const [team] = await db
    .insert(teamsTable)
    .values({ name, description, ownerWallet })
    .returning();

  await db.insert(teamMembersTable).values({
    teamId: team.id,
    walletAddress: ownerWallet,
    role: "owner",
    joinedAt: new Date(),
  });

  return res.status(201).json(team);
});

// GET /teams?wallet=... — list teams the wallet belongs to
router.get("/teams", async (req, res) => {
  const wallet = req.query.wallet as string | undefined;
  if (!wallet) return res.status(400).json({ error: "wallet query param required" });

  const memberships = await db
    .select()
    .from(teamMembersTable)
    .where(eq(teamMembersTable.walletAddress, wallet));

  if (memberships.length === 0) return res.json([]);

  const teamIds = memberships.map((m) => m.teamId);
  const teams = await db.select().from(teamsTable).where(inArray(teamsTable.id, teamIds));

  const result = await Promise.all(
    teams.map(async (team) => {
      const members = await db
        .select()
        .from(teamMembersTable)
        .where(eq(teamMembersTable.teamId, team.id));
      const myRole = memberships.find((m) => m.teamId === team.id)?.role ?? "member";
      return { ...team, memberCount: members.length, myRole };
    })
  );

  return res.json(result);
});

// GET /teams/:id — get team with members
router.get("/teams/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid team ID" });

  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, id));
  if (!team) return res.status(404).json({ error: "Team not found" });

  const members = await db
    .select()
    .from(teamMembersTable)
    .where(eq(teamMembersTable.teamId, id));

  return res.json({ ...team, members });
});

// POST /teams/:id/invite — invite a wallet address
router.post("/teams/:id/invite", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid team ID" });

  const { ownerWallet, targetWallet } = req.body as { ownerWallet?: string; targetWallet?: string };
  if (!ownerWallet || !targetWallet) return res.status(400).json({ error: "ownerWallet and targetWallet required" });

  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, id));
  if (!team) return res.status(404).json({ error: "Team not found" });
  if (team.ownerWallet !== ownerWallet) return res.status(403).json({ error: "Only the team owner can invite members" });

  const [existing] = await db
    .select()
    .from(teamMembersTable)
    .where(and(eq(teamMembersTable.teamId, id), eq(teamMembersTable.walletAddress, targetWallet)));
  if (existing) return res.status(409).json({ error: "Wallet is already a member or has a pending invite" });

  const [invite] = await db
    .insert(teamMembersTable)
    .values({ teamId: id, walletAddress: targetWallet, role: "invited" })
    .returning();

  return res.status(201).json(invite);
});

// POST /teams/:id/accept — accept an invitation
router.post("/teams/:id/accept", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid team ID" });

  const { wallet } = req.body as { wallet?: string };
  if (!wallet) return res.status(400).json({ error: "wallet required" });

  const [invite] = await db
    .select()
    .from(teamMembersTable)
    .where(and(eq(teamMembersTable.teamId, id), eq(teamMembersTable.walletAddress, wallet)));

  if (!invite) return res.status(404).json({ error: "Invitation not found" });
  if (invite.role !== "invited") return res.status(409).json({ error: "No pending invitation for this wallet" });

  const [updated] = await db
    .update(teamMembersTable)
    .set({ role: "member", joinedAt: new Date() })
    .where(and(eq(teamMembersTable.teamId, id), eq(teamMembersTable.walletAddress, wallet)))
    .returning();

  return res.json(updated);
});

// DELETE /teams/:id/members/:wallet — remove a member (owner only, or self-leave)
router.delete("/teams/:id/members/:wallet", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid team ID" });

  const targetWallet = req.params.wallet;
  const { ownerWallet } = req.body as { ownerWallet?: string };

  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, id));
  if (!team) return res.status(404).json({ error: "Team not found" });

  const isOwner = ownerWallet === team.ownerWallet;
  const isSelf = targetWallet === ownerWallet;
  if (!isOwner && !isSelf) return res.status(403).json({ error: "Insufficient permissions" });
  if (isOwner && targetWallet === team.ownerWallet) return res.status(400).json({ error: "Owner cannot leave their own team" });

  await db
    .delete(teamMembersTable)
    .where(and(eq(teamMembersTable.teamId, id), eq(teamMembersTable.walletAddress, targetWallet)));

  return res.json({ success: true });
});

export default router;
