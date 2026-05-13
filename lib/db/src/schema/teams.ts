import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const teamMemberRoleEnum = pgEnum("team_member_role", ["owner", "member", "invited"]);

export const teamsTable = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  ownerWallet: text("owner_wallet").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const teamMembersTable = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teamsTable.id),
  walletAddress: text("wallet_address").notNull(),
  role: teamMemberRoleEnum("role").notNull().default("member"),
  invitedAt: timestamp("invited_at").notNull().defaultNow(),
  joinedAt: timestamp("joined_at"),
});

export const insertTeamSchema = createInsertSchema(teamsTable).omit({ id: true, createdAt: true });
export const insertTeamMemberSchema = createInsertSchema(teamMembersTable).omit({ id: true, invitedAt: true });

export type Team = typeof teamsTable.$inferSelect;
export type TeamMember = typeof teamMembersTable.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
