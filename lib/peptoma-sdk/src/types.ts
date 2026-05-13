export interface PeptomaClientOptions {
  apiKey?: string;
  walletAddress?: string;
  baseUrl?: string;
}

export type AnalysisDepth = "standard" | "deep";
export type AnnotationType = "confirm" | "challenge" | "extend" | "tag";
export type VoteDirection = "up" | "down";
export type ToxicityRisk = "low" | "medium" | "high";
export type SequenceStatus = "completed" | "processing" | "failed";
export type StakingTier = "free" | "researcher" | "pro" | "lab";
export type StructurePrediction = "alpha_helix" | "beta_sheet" | "random_coil" | "mixed";
export type SortOption = "newest" | "score" | "annotations" | "trending";

export interface SequenceAnalysis {
  id: number;
  sequence: string;
  userId: string | null;
  diseaseTarget: string | null;
  notes: string | null;
  depth: AnalysisDepth | null;
  structurePrediction: StructurePrediction | null;
  bioactivityScore: number;
  bioactivityLabel: string | null;
  confidenceScore: number;
  molecularWeight: number | null;
  hydrophobicityIndex: number | null;
  chargeAtPH7: number | null;
  halfLife: string | null;
  toxicityRisk: ToxicityRisk | null;
  tags: string[] | null;
  annotationSuggestions: string[] | null;
  voteCount: number | null;
  annotationCount: number | null;
  status: SequenceStatus;
  forkedFromId: number | null;
  citedSequenceIds: number[] | null;
  createdAt: string;
}

export interface AnalyzeOptions {
  sequence: string;
  userId?: string;
  diseaseTarget?: string;
  notes?: string;
  depth?: AnalysisDepth;
}

export interface FeedOptions {
  limit?: number;
  page?: number;
  disease?: string;
  minScore?: number;
  sort?: SortOption;
}

export interface FeedResponse {
  items: SequenceAnalysis[];
  total: number;
  page: number;
  totalPages: number;
}

export interface DiseaseBreakdownItem {
  disease: string;
  count: number;
}

export interface FeedStats {
  totalAnalyses: number;
  avgBioactivityScore: number;
  avgConfidenceScore: number;
  totalAnnotations: number;
  totalVotes: number;
  recentActivity: number;
  diseaseBreakdown: DiseaseBreakdownItem[];
}

export interface Annotation {
  id: number;
  sequenceId: number;
  userId: string;
  type: AnnotationType;
  content: string | null;
  tokensEarned: number | null;
  score: number;
  createdAt: string;
}

export interface CreateAnnotationOptions {
  sequenceId: number;
  userId: string;
  type: AnnotationType;
  content?: string;
}

export interface VoteResult {
  score: number;
}

export interface ApiKey {
  id: number;
  label: string;
  tier: string;
  createdAt: string;
  lastUsedAt: string | null;
  keyPreview: string;
}

export interface GenerateKeyOptions {
  label?: string;
}

export interface GenerateKeyResult {
  key: string;
  id: number;
  label: string;
  tier: string;
  createdAt: string;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  totalTokensEarned: number;
  totalContributions: number;
  rank: number;
}

export interface TokenBalance {
  userId: string;
  balance: number;
  stakedAmount: number;
  earnedTotal: number;
  spentTotal: number;
  stakingTier: StakingTier;
  solanaAddress: string | null;
}

export interface PeptomaError extends Error {
  status: number;
  body: unknown;
}

// ── Teams ─────────────────────────────────────────────────────────────────────

export type TeamMemberRole = "owner" | "member" | "invited";

export interface Team {
  id: number;
  name: string;
  description: string | null;
  ownerWallet: string;
  createdAt: string;
}

export interface TeamMember {
  id: number;
  teamId: number;
  walletAddress: string;
  role: TeamMemberRole;
  invitedAt: string;
  joinedAt: string | null;
}

export interface TeamDetail extends Team {
  members: TeamMember[];
}

export interface TeamSummary extends Team {
  memberCount: number;
  myRole: TeamMemberRole;
}

export interface CreateTeamOptions {
  name: string;
  description?: string;
  ownerWallet: string;
}

export interface InviteMemberOptions {
  ownerWallet: string;
  targetWallet: string;
}

// ── Citations ─────────────────────────────────────────────────────────────────

export interface ForkOptions {
  userId: string;
}

export type AgentType = "research" | "protocol" | "compare" | "literature" | "safety";

export interface CopilotMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CopilotOptions {
  agentType: AgentType;
  message: string;
  history?: CopilotMessage[];
}

export interface CopilotResponse {
  reply: string;
  agentType: AgentType;
}
