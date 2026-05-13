import { pgTable, serial, text, real, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const stakingPositionStatusEnum = pgEnum("staking_position_status", ["active", "pending_unstake", "completed"]);
export const stakingLockEnum = pgEnum("staking_lock_period", ["flexible", "30d", "90d", "180d"]);

export const stakingPositionsTable = pgTable("staking_positions", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").notNull(),
  amount: real("amount").notNull(),
  lockPeriod: stakingLockEnum("lock_period").notNull().default("flexible"),
  multiplier: real("multiplier").notNull().default(1.0),
  stakedAt: timestamp("staked_at").notNull().defaultNow(),
  unlockAt: timestamp("unlock_at"),
  txSig: text("tx_sig").notNull(),
  status: stakingPositionStatusEnum("status").notNull().default("active"),
  rewardsClaimed: real("rewards_claimed").notNull().default(0),
  lastClaimedAt: timestamp("last_claimed_at"),
  claimTxSig: text("claim_tx_sig"),
});

export const stakingEpochsTable = pgTable("staking_epochs", {
  id: serial("id").primaryKey(),
  epochNumber: integer("epoch_number").notNull(),
  rewardPool: real("reward_pool").notNull().default(0),
  totalWeightedStake: real("total_weighted_stake").notNull().default(0),
  distributedAt: timestamp("distributed_at").notNull().defaultNow(),
  deepRunCount: integer("deep_run_count").notNull().default(0),
});

export const insertStakingPositionSchema = createInsertSchema(stakingPositionsTable).omit({ id: true, stakedAt: true });
export const insertStakingEpochSchema = createInsertSchema(stakingEpochsTable).omit({ id: true, distributedAt: true });

export type StakingPosition = typeof stakingPositionsTable.$inferSelect;
export type InsertStakingPosition = z.infer<typeof insertStakingPositionSchema>;
export type StakingEpoch = typeof stakingEpochsTable.$inferSelect;
