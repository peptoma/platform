import { pgTable, serial, text, real, integer, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const structureEnum = pgEnum("structure_prediction", ["alpha_helix", "beta_sheet", "random_coil", "mixed"]);
export const toxicityEnum = pgEnum("toxicity_risk", ["low", "medium", "high"]);
export const statusEnum = pgEnum("sequence_status", ["processing", "completed", "failed"]);
export const analysisDepthEnum = pgEnum("analysis_depth", ["standard", "deep"]);
export const annotationTypeEnum = pgEnum("annotation_type", ["confirm", "challenge", "extend", "tag"]);
export const stakingStatusEnum = pgEnum("staking_status", ["free", "researcher", "pro", "lab"]);

export const sequencesTable = pgTable("sequences", {
  id: serial("id").primaryKey(),
  sequence: text("sequence").notNull(),
  userId: text("user_id").notNull(),
  diseaseTarget: text("disease_target"),
  notes: text("notes"),
  depth: analysisDepthEnum("depth").notNull().default("standard"),
  structurePrediction: structureEnum("structure_prediction"),
  bioactivityScore: real("bioactivity_score").notNull().default(0),
  bioactivityLabel: text("bioactivity_label"),
  confidenceScore: real("confidence_score").notNull().default(0),
  molecularWeight: real("molecular_weight"),
  hydrophobicityIndex: real("hydrophobicity_index"),
  chargeAtPH7: real("charge_at_ph7"),
  halfLife: text("half_life"),
  toxicityRisk: toxicityEnum("toxicity_risk"),
  tags: text("tags").array().notNull().default([]),
  annotationSuggestions: text("annotation_suggestions").array().notNull().default([]),
  voteCount: integer("vote_count").notNull().default(0),
  annotationCount: integer("annotation_count").notNull().default(0),
  status: statusEnum("status").notNull().default("processing"),
  ipfsCid: text("ipfs_cid"),
  arweaveTxId: text("arweave_tx_id"),
  paymentTxSig: text("payment_tx_sig"),
  forkedFromId: integer("forked_from_id"),
  citedSequenceIds: integer("cited_sequence_ids").array().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const annotationsTable = pgTable("annotations", {
  id: serial("id").primaryKey(),
  sequenceId: integer("sequence_id").notNull().references(() => sequencesTable.id),
  userId: text("user_id").notNull(),
  type: annotationTypeEnum("type").notNull(),
  content: text("content"),
  score: integer("score").notNull().default(0),
  tokensEarned: real("tokens_earned").default(0),
  arweaveTxId: text("arweave_tx_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userTokensTable = pgTable("user_tokens", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  username: text("username").notNull(),
  balance: real("balance").notNull().default(0),
  stakedAmount: real("staked_amount").notNull().default(0),
  earnedTotal: real("earned_total").notNull().default(0),
  spentTotal: real("spent_total").notNull().default(0),
  stakingTier: stakingStatusEnum("staking_tier").notNull().default("free"),
  solanaAddress: text("solana_address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const apiKeysTable = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  walletAddress: text("wallet_address").notNull(),
  key: text("key").notNull().unique(),
  label: text("label").notNull().default("Default"),
  tier: stakingStatusEnum("tier").notNull().default("pro"),
  callCount: integer("call_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at"),
  revokedAt: timestamp("revoked_at"),
});

export const insertApiKeySchema = createInsertSchema(apiKeysTable).omit({ id: true, createdAt: true });
export type ApiKey = typeof apiKeysTable.$inferSelect;

// ── Governance ─────────────────────────────────────────────────────────────
export const proposalStatusEnum = pgEnum("proposal_status", ["active", "passed", "failed", "pending"]);
export const proposalCategoryEnum = pgEnum("proposal_category", ["reward_rate", "tier_requirement", "scoring", "policy", "other"]);

export const governanceProposalsTable = pgTable("governance_proposals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: proposalCategoryEnum("category").notNull().default("other"),
  status: proposalStatusEnum("status").notNull().default("active"),
  authorWallet: text("author_wallet"),
  yesVotes: real("yes_votes").notNull().default(0),
  noVotes: real("no_votes").notNull().default(0),
  yesCount: integer("yes_count").notNull().default(0),
  noCount: integer("no_count").notNull().default(0),
  quorum: real("quorum").notNull().default(1000),
  endsAt: timestamp("ends_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const governanceVotesTable = pgTable("governance_votes", {
  id: serial("id").primaryKey(),
  proposalId: integer("proposal_id").notNull().references(() => governanceProposalsTable.id),
  walletAddress: text("wallet_address").notNull(),
  vote: text("vote").notNull(),
  weight: real("weight").notNull().default(1),
  stakingTier: text("staking_tier").notNull().default("free"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type GovernanceProposal = typeof governanceProposalsTable.$inferSelect;
export type GovernanceVote = typeof governanceVotesTable.$inferSelect;

// ── IP-NFT Registry ────────────────────────────────────────────────────────
export const ipNftStatusEnum = pgEnum("ip_nft_status", ["minted", "revoked"]);

export const ipNftsTable = pgTable("ip_nfts", {
  id: serial("id").primaryKey(),
  sequenceId: integer("sequence_id").notNull().references(() => sequencesTable.id),
  walletAddress: text("wallet_address").notNull(),
  mintAddress: text("mint_address").notNull(),
  txSignature: text("tx_signature").notNull(),
  metadataUri: text("metadata_uri"),
  status: ipNftStatusEnum("status").notNull().default("minted"),
  // marketplace
  listed: boolean("listed").notNull().default(false),
  price: real("price"),
  listedAt: timestamp("listed_at"),
  buyerWallet: text("buyer_wallet"),
  soldAt: timestamp("sold_at"),
  mintedAt: timestamp("minted_at").notNull().defaultNow(),
});

export type IpNft = typeof ipNftsTable.$inferSelect;

export const insertSequenceSchema = createInsertSchema(sequencesTable).omit({ id: true, createdAt: true });
export const insertAnnotationSchema = createInsertSchema(annotationsTable).omit({ id: true, createdAt: true });
export const insertUserTokenSchema = createInsertSchema(userTokensTable).omit({ id: true, createdAt: true });

export type Sequence = typeof sequencesTable.$inferSelect;
export type InsertSequence = z.infer<typeof insertSequenceSchema>;
export type Annotation = typeof annotationsTable.$inferSelect;
export type InsertAnnotation = z.infer<typeof insertAnnotationSchema>;
export type UserToken = typeof userTokensTable.$inferSelect;
export type InsertUserToken = z.infer<typeof insertUserTokenSchema>;
