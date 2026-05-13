import { Router } from "express";
import { db, sequencesTable, annotationsTable, userTokensTable, stakingPositionsTable, governanceVotesTable } from "@workspace/db";
import { desc, eq, gte, sql, and, ilike, sum as drizzleSum, count, isNotNull } from "drizzle-orm";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { resolveApiKeyAuth } from "./apikeys";
import { openai } from "@workspace/integrations-openai-ai-server";
import { pinToIPFS } from "../lib/ipfs";
import { uploadToArweave } from "../lib/arweave";
import {
  SubmitSequenceBody,
  GetSequenceParams,
  GetFeedQueryParams,
  GetAnnotationsParams,
  CreateAnnotationBody,
  GetMissionsQueryParams,
  GetMissionHistoryQueryParams,
  GetTokenBalanceQueryParams,
  GetMissionEarningsQueryParams,
  VoteAnnotationBody,
} from "@workspace/api-zod";

const router = Router();

// ─── Solana payment constants ─────────────────────────────────────────────────
const PEPTOMA_CA   = "HopMHHPfSV2kWQLghKt6xR1oWbPRLA2UyxnKGoPpump";
const TREASURY     = "8PAdZPAEEaD5gfJxbC1fFp4q7cpCNHhz4ycQMdT8P8Lg";
const DEEP_PAYMENT = 1000;          // $PEPTM required for deep analysis
const SESSION_TTL  = 24 * 3600_000; // one payment unlocks 24h of deep runs
const SOLANA_RPC   = "https://api.mainnet-beta.solana.com";

// Verify a $PEPTM SPL transfer to treasury of ≥ DEEP_PAYMENT tokens.
// Returns true if valid, throws with descriptive message if not.
async function verifyDeepPayment(txSig: string, payerWallet: string): Promise<void> {
  const conn = new Connection(SOLANA_RPC, "confirmed");

  const statuses = await conn.getSignatureStatuses([txSig], { searchTransactionHistory: true });
  const s = statuses.value[0];
  if (!s)      throw new Error("Payment transaction not found on-chain. Please wait and retry.");
  if (s.err)   throw new Error("Payment transaction failed on-chain.");

  const tx = await conn.getParsedTransaction(txSig, {
    maxSupportedTransactionVersion: 0,
    commitment: "confirmed",
  });
  if (!tx) throw new Error("Could not fetch payment transaction details.");

  // Derive treasury ATA for the PEPTM mint
  const mintPk     = new PublicKey(PEPTOMA_CA);
  const treasuryPk = new PublicKey(TREASURY);
  const treasuryATA = await getAssociatedTokenAddress(mintPk, treasuryPk);
  const ataStr      = treasuryATA.toString();

  // Check token balances: treasury ATA should have received ≥ DEEP_PAYMENT tokens
  const pre  = tx.meta?.preTokenBalances  ?? [];
  const post = tx.meta?.postTokenBalances ?? [];
  const keys = tx.transaction.message.accountKeys.map(k => k.pubkey.toString());

  const preAmt  = pre .find(b => keys[b.accountIndex] === ataStr)?.uiTokenAmount?.uiAmount ?? 0;
  const postAmt = post.find(b => keys[b.accountIndex] === ataStr)?.uiTokenAmount?.uiAmount ?? 0;
  const received = postAmt - preAmt;

  if (received < DEEP_PAYMENT * 0.99) {
    throw new Error(`Payment insufficient. Expected ${DEEP_PAYMENT} $PEPTM, treasury received ${received.toFixed(2)}.`);
  }

  // Payer sanity check — feePayer should match the wallet requesting deep analysis
  const feePayer = tx.transaction.message.accountKeys[0]?.pubkey.toString();
  if (feePayer && feePayer !== payerWallet) {
    throw new Error("Payment transaction feePayer does not match requesting wallet.");
  }
}

// ─── Deterministic biochemistry calculations ────────────────────────────────

function calcBiochemistry(sequence: string) {
  const seq = sequence.toUpperCase();
  const aaMW: Record<string, number> = {
    A: 89, R: 174, N: 132, D: 133, C: 121, E: 147, Q: 146, G: 75,
    H: 155, I: 131, L: 131, K: 146, M: 149, F: 165, P: 115, S: 105,
    T: 119, W: 204, Y: 181, V: 117,
  };
  const hydro: Record<string, number> = {
    A: 1.8, R: -4.5, N: -3.5, D: -3.5, C: 2.5, E: -3.5, Q: -3.5, G: -0.4,
    H: -3.2, I: 4.5, L: 3.8, K: -3.9, M: 1.9, F: 2.8, P: -1.6, S: -0.8,
    T: -0.7, W: -0.9, Y: -1.3, V: 4.2,
  };
  const charge: Record<string, number> = { K: 1, R: 1, H: 0.1, D: -1, E: -1 };

  let mw = 18.02, hydrophobicity = 0, ch = 0;
  for (const aa of seq) {
    mw += (aaMW[aa] ?? 110) - 18.02;
    hydrophobicity += hydro[aa] ?? 0;
    ch += charge[aa] ?? 0;
  }
  hydrophobicity /= seq.length;

  return {
    molecularWeight: Math.round(mw),
    hydrophobicityIndex: Math.round(hydrophobicity * 100) / 100,
    chargeAtPH7: Math.round(ch * 10) / 10,
  };
}

// ─── AI-powered analysis via GPT-4o-mini ────────────────────────────────────

interface AIAnalysisResult {
  structurePrediction: "alpha_helix" | "beta_sheet" | "random_coil" | "mixed";
  bioactivityScore: number;
  bioactivityLabel: string;
  confidenceScore: number;
  halfLife: string;
  toxicityRisk: "low" | "medium" | "high";
  annotationSuggestions: string[];
}

const BIOACTIVITY_LABELS = ["antimicrobial", "anti-inflammatory", "hormonal", "neuropeptide", "immunomodulatory", "antifungal", "antiviral", "anticancer", "wound-healing", "antioxidant"];

async function analyzeSequenceWithAI(
  sequence: string,
  depth: "standard" | "deep",
  diseaseTarget?: string | null,
): Promise<AIAnalysisResult> {
  const seq = sequence.toUpperCase();
  const len = seq.length;

  const systemPrompt = [
    "You are a peptide bioinformatics engine modeled after ProtBERT + ESMFold analysis pipelines.",
    "Given an amino acid sequence (single-letter IUPAC codes), return a JSON object with your scientific analysis.",
    "",
    "Rules:",
    "- Read the actual sequence composition carefully. Cationic peptides (K, R rich) are often antimicrobial.",
    "  Amphipathic helices suggest membrane activity. Prolines break helices. Cysteines suggest disulfide bonds.",
    "- bioactivityScore: 0-100 integer based on sequence features. Peptides 5-40 aa with balanced charge/hydrophobicity score higher.",
    "- confidenceScore: 0-100 integer. Longer sequences with known motifs get higher confidence.",
    "- structurePrediction: 'alpha_helix' | 'beta_sheet' | 'random_coil' | 'mixed'. Use AA propensities.",
    "- bioactivityLabel: one of: antimicrobial, anti-inflammatory, hormonal, neuropeptide, immunomodulatory, antifungal, antiviral, anticancer, wound-healing, antioxidant.",
    "- toxicityRisk: 'low' | 'medium' | 'high'. High cationic + hydrophobic = higher toxicity risk.",
    "- halfLife: e.g. '2h', '4h', '~8h (s.c.)', '24h'. Longer peptides with disulfide bonds have longer half-lives.",
    "- annotationSuggestions: 3-4 specific scientific annotation tasks referencing the actual sequence features.",
    "",
    "Respond ONLY with raw JSON, no markdown, no explanation:",
    '{"structurePrediction":"...","bioactivityScore":0,"bioactivityLabel":"...","confidenceScore":0,"halfLife":"...","toxicityRisk":"...","annotationSuggestions":["...","...","..."]}',
  ].join("\n");

  const userPrompt = [
    `Sequence (${len} aa): ${seq}`,
    diseaseTarget ? `Target context: ${diseaseTarget}` : "",
    `Analysis depth: ${depth}`,
  ].filter(Boolean).join("\n");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_completion_tokens: 400,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  const clean = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(clean) as Partial<AIAnalysisResult>;

  // Validate and clamp all fields to expected ranges
  const bioactivityScore = Math.min(100, Math.max(0, Math.round(Number(parsed.bioactivityScore) || 50)));
  const confidenceScore = Math.min(100, Math.max(0, Math.round(Number(parsed.confidenceScore) || 50)));
  const validStructures = ["alpha_helix", "beta_sheet", "random_coil", "mixed"] as const;
  const structurePrediction = validStructures.includes(parsed.structurePrediction as typeof validStructures[number])
    ? parsed.structurePrediction as typeof validStructures[number]
    : "mixed";
  const toxicityRisk = (["low", "medium", "high"] as const).includes(parsed.toxicityRisk as "low" | "medium" | "high")
    ? parsed.toxicityRisk as "low" | "medium" | "high"
    : "low";
  const bioactivityLabel = BIOACTIVITY_LABELS.includes(parsed.bioactivityLabel ?? "")
    ? parsed.bioactivityLabel!
    : BIOACTIVITY_LABELS[0];
  const halfLife = typeof parsed.halfLife === "string" && parsed.halfLife.length > 0
    ? parsed.halfLife
    : "4h";
  const annotationSuggestions = Array.isArray(parsed.annotationSuggestions) && parsed.annotationSuggestions.length >= 2
    ? parsed.annotationSuggestions.slice(0, 4)
    : [
        `Confirm ${bioactivityLabel} activity for sequence ${seq.slice(0, 6)}...`,
        `Challenge: validate predicted ${structurePrediction} fold via CD spectroscopy.`,
        `Extend: search BIOPEP database for homologous ${bioactivityLabel} peptides.`,
      ];

  return { structurePrediction, bioactivityScore, bioactivityLabel, confidenceScore, halfLife, toxicityRisk, annotationSuggestions };
}

// ─── Fallback heuristic (used only if AI call fails) ────────────────────────

function analyzeSequenceFallback(sequence: string, depth: "standard" | "deep"): AIAnalysisResult {
  const seq = sequence.toUpperCase();
  const hydro: Record<string, number> = {
    A: 1.8, R: -4.5, N: -3.5, D: -3.5, C: 2.5, E: -3.5, Q: -3.5, G: -0.4,
    H: -3.2, I: 4.5, L: 3.8, K: -3.9, M: 1.9, F: 2.8, P: -1.6, S: -0.8,
    T: -0.7, W: -0.9, Y: -1.3, V: 4.2,
  };
  const charge: Record<string, number> = { K: 1, R: 1, H: 0.1, D: -1, E: -1 };

  let hydrophobicity = 0, ch = 0, alphaCount = 0, betaCount = 0;
  const alphaFormers = new Set(["A", "E", "L", "M", "Q", "K", "R", "H"]);
  const betaFormers = new Set(["V", "I", "F", "Y", "W", "T", "C"]);

  for (const aa of seq) {
    hydrophobicity += hydro[aa] ?? 0;
    ch += charge[aa] ?? 0;
    if (alphaFormers.has(aa)) alphaCount++;
    if (betaFormers.has(aa)) betaCount++;
  }
  hydrophobicity /= seq.length;

  let structurePrediction: AIAnalysisResult["structurePrediction"];
  if (alphaCount / seq.length > 0.5) structurePrediction = "alpha_helix";
  else if (betaCount / seq.length > 0.5) structurePrediction = "beta_sheet";
  else if ((alphaCount + betaCount) / seq.length < 0.3) structurePrediction = "random_coil";
  else structurePrediction = "mixed";

  const depthBonus = depth === "deep" ? 10 : 0;
  const bioactivityScore = Math.min(100, Math.max(0,
    Math.round(40 + hydrophobicity * 5 + Math.abs(ch) * 3 + (seq.length > 5 && seq.length < 30 ? 15 : 0) + depthBonus)
  ));
  const confidenceScore = Math.min(100, Math.max(0, Math.round(50 + seq.length * 1.5 + depthBonus)));
  const toxicityScore = Math.abs(ch) + (hydrophobicity > 2 ? 2 : 0);
  const toxicityRisk: "low" | "medium" | "high" = toxicityScore > 4 ? "high" : toxicityScore > 2 ? "medium" : "low";
  const labelIndex = Math.abs(Math.floor(hydrophobicity * 10 + ch * 3)) % BIOACTIVITY_LABELS.length;
  const bioactivityLabel = BIOACTIVITY_LABELS[labelIndex];
  const halfLifeOptions = ["2h", "4h", "8h", "12h", "24h"];
  const halfLife = halfLifeOptions[Math.abs(Math.floor(ch * 2 + hydrophobicity)) % halfLifeOptions.length];

  return {
    structurePrediction,
    bioactivityScore,
    bioactivityLabel,
    confidenceScore,
    halfLife,
    toxicityRisk,
    annotationSuggestions: [
      `Confirm ${bioactivityLabel} activity classification — sequence shows characteristic motifs.`,
      `Challenge: Run MD simulation to verify predicted ${bioactivityLabel} binding affinity.`,
      `Extend: Compare with known target peptide database for homology.`,
    ],
  };
}

// ─── Staking helpers ─────────────────────────────────────────────────────────

const BASE_APY = 0.12;
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function calcPendingReward(pos: { amount: number; multiplier: number; stakedAt: Date; lastClaimedAt: Date | null }): number {
  const from = pos.lastClaimedAt ?? pos.stakedAt;
  const elapsed = Date.now() - from.getTime();
  if (elapsed <= 0) return 0;
  return pos.amount * BASE_APY * pos.multiplier * (elapsed / YEAR_MS);
}

function deriveStakingTier(totalStaked: number): "free" | "researcher" | "pro" | "lab" {
  if (totalStaked >= 10000) return "lab";
  if (totalStaked >= 2000) return "pro";
  if (totalStaked >= 500) return "researcher";
  return "free";
}

function getRunLimit(tier: string): number {
  if (tier === "lab" || tier === "pro") return 0;
  if (tier === "researcher") return 20;
  return 3;
}

function getAnnotationReward(type: string): number {
  switch (type) {
    case "confirm": return 2;
    case "challenge": return 3;
    case "extend": return 5;
    case "tag": return 2;
    default: return 2;
  }
}

// ─── Routes ──────────────────────────────────────────────────────────────────

router.post("/sequences", async (req, res) => {
  const body = SubmitSequenceBody.parse(req.body);
  const depth = (body.depth ?? "standard") as "standard" | "deep";

  const apiKeyAuth = await resolveApiKeyAuth(req.headers.authorization);
  const walletForTier = apiKeyAuth?.walletAddress ?? body.userId;

  const stakeResult = await db.select({ total: drizzleSum(stakingPositionsTable.amount) })
    .from(stakingPositionsTable)
    .where(and(eq(stakingPositionsTable.walletAddress, walletForTier), eq(stakingPositionsTable.status, "active")));
  const totalStaked = Number(stakeResult[0]?.total ?? 0);
  const tier = apiKeyAuth?.tier ?? deriveStakingTier(totalStaked);

  const runLimit = getRunLimit(tier);
  if (runLimit > 0) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const [todayCount] = await db.select({ cnt: count() })
      .from(sequencesTable)
      .where(and(eq(sequencesTable.userId, body.userId), gte(sequencesTable.createdAt, todayStart)));
    const runsToday = Number(todayCount?.cnt ?? 0);
    if (runsToday >= runLimit) {
      return res.status(429).json({
        error: `Daily run limit reached (${runLimit} runs/day for ${tier.toUpperCase()} tier). Resets at midnight UTC.`,
        runsToday,
        runLimit,
        tier,
        upgradeHint: "Higher tier unlocks more runs/day. Staking tiers launching soon at peptoma.xyz/token",
      });
    }
  }

  // ─── Deep analysis payment gate ─────────────────────────────────────────────
  // API key holders are exempt (they've already paid for access via staking).
  // Everyone else must supply a verified $PEPTM paymentTxSig for deep runs.
  // One payment unlocks 24h of deep runs — the txSig is reused within the window.
  let resolvedPaymentTxSig: string | null = null;

  if (depth === "deep" && !apiKeyAuth) {
    const sessionStart = new Date(Date.now() - SESSION_TTL);

    // Check for valid session: a previous deep run from this wallet in the TTL window
    const [existingSession] = await db
      .select({ paymentTxSig: sequencesTable.paymentTxSig })
      .from(sequencesTable)
      .where(and(
        eq(sequencesTable.userId, body.userId),
        eq(sequencesTable.depth, "deep"),
        gte(sequencesTable.createdAt, sessionStart),
        isNotNull(sequencesTable.paymentTxSig),
      ))
      .limit(1);

    if (existingSession?.paymentTxSig) {
      // Reuse the session txSig — no new payment needed
      resolvedPaymentTxSig = existingSession.paymentTxSig;
    } else {
      // New session — require a fresh payment txSig
      if (!body.paymentTxSig) {
        return res.status(402).json({
          error: "Deep analysis requires 1,000 $PEPTM payment. Supply paymentTxSig.",
          code: "PAYMENT_REQUIRED",
        });
      }

      // Verify this txSig hasn't already been used by a different wallet (replay attack)
      const [prevUse] = await db
        .select({ userId: sequencesTable.userId })
        .from(sequencesTable)
        .where(eq(sequencesTable.paymentTxSig, body.paymentTxSig))
        .limit(1);

      if (prevUse && prevUse.userId !== body.userId) {
        return res.status(402).json({
          error: "Payment transaction already used by another wallet.",
          code: "PAYMENT_REPLAYED",
        });
      }

      // Verify on-chain (throws with user-friendly message on failure)
      try {
        await verifyDeepPayment(body.paymentTxSig, body.userId);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Payment verification failed.";
        // If RPC is unavailable, allow but log loudly
        if (msg.includes("not found") || msg.includes("timeout") || msg.includes("fetch")) {
          req.log.error({ paymentTxSig: body.paymentTxSig, userId: body.userId, err: e }, "RPC unavailable for payment verify — allowing");
        } else {
          return res.status(402).json({ error: msg, code: "PAYMENT_INVALID" });
        }
      }

      resolvedPaymentTxSig = body.paymentTxSig;
    }
  }

  // AI analysis — fall back to heuristic if AI call fails
  let aiResult: AIAnalysisResult;
  try {
    aiResult = await analyzeSequenceWithAI(body.sequence, depth, body.diseaseTarget);
  } catch (err) {
    req.log.warn({ err }, "AI analysis failed, using heuristic fallback");
    aiResult = analyzeSequenceFallback(body.sequence, depth);
  }

  const biochem = calcBiochemistry(body.sequence);

  const tags: string[] = [];
  if (body.diseaseTarget) tags.push(body.diseaseTarget);
  if (aiResult.structurePrediction === "alpha_helix") tags.push("helix");
  if (aiResult.bioactivityScore > 70) tags.push("high-activity");
  if (aiResult.toxicityRisk === "low") tags.push("low-toxicity");
  if (depth === "deep") tags.push("deep-analysis");

  const [seq] = await db.insert(sequencesTable).values({
    sequence: body.sequence,
    userId: body.userId,
    diseaseTarget: body.diseaseTarget ?? null,
    notes: body.notes ?? null,
    depth,
    status: "completed",
    tags,
    annotationSuggestions: aiResult.annotationSuggestions,
    structurePrediction: aiResult.structurePrediction,
    bioactivityScore: aiResult.bioactivityScore,
    bioactivityLabel: aiResult.bioactivityLabel,
    confidenceScore: aiResult.confidenceScore,
    halfLife: aiResult.halfLife,
    toxicityRisk: aiResult.toxicityRisk,
    molecularWeight: biochem.molecularWeight,
    hydrophobicityIndex: biochem.hydrophobicityIndex,
    chargeAtPH7: biochem.chargeAtPH7,
    paymentTxSig: resolvedPaymentTxSig,
  }).returning();

  const reportPayload = {
    version: "1.0",
    platform: "PEPTOMA",
    rrid: "RRID:SCR_028424",
    sequenceId: seq.id,
    sequence: body.sequence,
    analysisDepth: depth,
    diseaseTarget: body.diseaseTarget ?? null,
    submittedBy: body.userId,
    analysis: {
      structurePrediction: aiResult.structurePrediction,
      bioactivityScore: aiResult.bioactivityScore,
      bioactivityLabel: aiResult.bioactivityLabel,
      confidenceScore: aiResult.confidenceScore,
      halfLife: aiResult.halfLife,
      toxicityRisk: aiResult.toxicityRisk,
      annotationSuggestions: aiResult.annotationSuggestions,
      biochemistry: biochem,
    },
    timestamp: new Date().toISOString(),
  };

  // Pin to IPFS and Arweave asynchronously (non-blocking, both in parallel)
  Promise.all([
    pinToIPFS(reportPayload),
    uploadToArweave({ ...reportPayload, type: "sequence_analysis" }),
  ]).then(async ([cid, arweaveTxId]) => {
    const updates: Record<string, string> = {};
    if (cid) updates.ipfsCid = cid;
    if (arweaveTxId) updates.arweaveTxId = arweaveTxId;
    if (Object.keys(updates).length > 0) {
      await db.update(sequencesTable).set(updates).where(eq(sequencesTable.id, seq.id));
      req.log.info({ sequenceId: seq.id, cid, arweaveTxId }, "Archived to IPFS + Arweave");
    }
  }).catch((err) => {
    req.log.warn({ err }, "IPFS/Arweave archive failed (non-fatal)");
  });

  const cost = depth === "deep" ? 5 : 1;
  await db.insert(userTokensTable).values({
    userId: body.userId,
    username: body.userId,
    balance: Math.max(0, 10 - cost),
    earnedTotal: 10,
    spentTotal: cost,
    stakedAmount: 0,
    stakingTier: "free",
  }).onConflictDoUpdate({
    target: userTokensTable.userId,
    set: {
      balance: sql`${userTokensTable.balance} + 5 - ${cost}`,
      earnedTotal: sql`${userTokensTable.earnedTotal} + 5`,
      spentTotal: sql`${userTokensTable.spentTotal} + ${cost}`,
    },
  });

  res.status(201).json(seq);
});

router.get("/sequences/:id", async (req, res) => {
  const { id } = GetSequenceParams.parse(req.params);
  const seq = await db.query.sequencesTable.findFirst({ where: eq(sequencesTable.id, id) });
  if (!seq) return res.status(404).json({ error: "Not found" });
  res.json(seq);
});

router.get("/feed", async (req, res) => {
  const params = GetFeedQueryParams.parse(req.query);
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const offset = (page - 1) * limit;
  const sort = params.sort ?? "newest";

  const conditions = [eq(sequencesTable.status, "completed")];
  if (params.disease) conditions.push(ilike(sequencesTable.diseaseTarget, `%${params.disease}%`));
  if (params.minScore !== undefined) conditions.push(gte(sequencesTable.bioactivityScore, params.minScore));

  const where = and(...conditions);

  const orderBy = sort === "score"
    ? desc(sequencesTable.bioactivityScore)
    : sort === "annotations"
    ? desc(sequencesTable.annotationCount)
    : sort === "trending"
    ? desc(sequencesTable.voteCount)
    : desc(sequencesTable.createdAt);

  const [items, [{ count: total }]] = await Promise.all([
    db.select().from(sequencesTable).where(where).orderBy(orderBy).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(sequencesTable).where(where),
  ]);

  res.json({ items, total, page, totalPages: Math.ceil(total / limit) });
});

router.get("/feed/stats", async (_req, res) => {
  const [stats] = await db.select({
    totalAnalyses: sql<number>`count(*)::int`,
    avgBioactivityScore: sql<number>`round(avg(bioactivity_score)::numeric, 1)::float`,
    avgConfidenceScore: sql<number>`round(avg(confidence_score)::numeric, 1)::float`,
    totalAnnotations: sql<number>`(select count(*)::int from annotations)`,
    totalVotes: sql<number>`sum(vote_count)::int`,
    recentActivity: sql<number>`count(*) filter (where created_at > now() - interval '24 hours')::int`,
  }).from(sequencesTable);

  const diseaseRows = await db.select({
    disease: sequencesTable.diseaseTarget,
    count: sql<number>`count(*)::int`,
  }).from(sequencesTable).where(sql`disease_target is not null`).groupBy(sequencesTable.diseaseTarget);

  res.json({
    totalAnalyses: stats.totalAnalyses || 0,
    avgBioactivityScore: stats.avgBioactivityScore || 0,
    avgConfidenceScore: stats.avgConfidenceScore || 0,
    totalAnnotations: stats.totalAnnotations || 0,
    totalVotes: stats.totalVotes || 0,
    recentActivity: stats.recentActivity || 0,
    diseaseBreakdown: diseaseRows.map(r => ({ disease: r.disease || "Unknown", count: r.count })),
  });
});

router.get("/feed/trending", async (_req, res) => {
  const items = await db.select().from(sequencesTable)
    .where(eq(sequencesTable.status, "completed"))
    .orderBy(desc(sequencesTable.voteCount))
    .limit(10);
  res.json(items);
});

router.post("/annotations", async (req, res) => {
  const body = CreateAnnotationBody.parse(req.body);

  const seqExists = await db.query.sequencesTable.findFirst({
    where: eq(sequencesTable.id, body.sequenceId),
    columns: { id: true },
  });
  if (!seqExists) return res.status(404).json({ error: "Sequence not found" });

  const tokensEarned = getAnnotationReward(body.type);

  const [annotation] = await db.insert(annotationsTable).values({
    sequenceId: body.sequenceId,
    userId: body.userId,
    type: body.type,
    content: body.content ?? null,
    tokensEarned,
    score: 0,
  }).returning();

  const voteChange = body.type === "confirm" ? 1 : body.type === "challenge" ? -1 : 0;
  await db.update(sequencesTable)
    .set({
      voteCount: sql`${sequencesTable.voteCount} + ${voteChange}`,
      annotationCount: sql`${sequencesTable.annotationCount} + 1`,
    })
    .where(eq(sequencesTable.id, body.sequenceId));

  await db.insert(userTokensTable).values({
    userId: body.userId,
    username: body.userId,
    balance: tokensEarned,
    earnedTotal: tokensEarned,
    spentTotal: 0,
    stakedAmount: 0,
    stakingTier: "free",
  }).onConflictDoUpdate({
    target: userTokensTable.userId,
    set: {
      balance: sql`${userTokensTable.balance} + ${tokensEarned}`,
      earnedTotal: sql`${userTokensTable.earnedTotal} + ${tokensEarned}`,
    },
  });

  // Archive annotation to Arweave asynchronously (non-blocking)
  uploadToArweave({
    platform: "PEPTOMA",
    version: "1.0",
    rrid: "RRID:SCR_028424",
    type: "annotation",
    sequenceId: body.sequenceId,
    submittedBy: body.userId,
    annotation: {
      id: annotation.id,
      type: body.type,
      content: body.content ?? null,
      tokensEarned,
    },
    timestamp: new Date().toISOString(),
  }).then(async (arweaveTxId) => {
    if (arweaveTxId) {
      await db.update(annotationsTable)
        .set({ arweaveTxId })
        .where(eq(annotationsTable.id, annotation.id));
    }
  }).catch(() => {});

  res.status(201).json(annotation);
});

router.get("/annotations/:sequenceId", async (req, res) => {
  const { sequenceId } = GetAnnotationsParams.parse(req.params);
  const annotations = await db.select().from(annotationsTable)
    .where(eq(annotationsTable.sequenceId, sequenceId))
    .orderBy(desc(annotationsTable.createdAt));
  res.json(annotations);
});

router.post("/annotations/:annotationId/vote", async (req, res) => {
  const annotationId = parseInt(req.params.annotationId);
  const body = VoteAnnotationBody.parse(req.body);
  const delta = body.direction === "up" ? 1 : -1;

  const [updated] = await db.update(annotationsTable)
    .set({ score: sql`${annotationsTable.score} + ${delta}` })
    .where(eq(annotationsTable.id, annotationId))
    .returning({ score: annotationsTable.score });

  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json({ score: updated.score });
});

router.get("/missions", async (req, res) => {
  const { userId } = GetMissionsQueryParams.parse(req.query);

  const [stats, tokenUser, annotationStats, activePositions, recentRuns] = await Promise.all([
    db.select({
      totalRuns: sql<number>`count(*)::int`,
      completedRuns: sql<number>`count(*) filter (where status = 'completed')::int`,
      processingRuns: sql<number>`count(*) filter (where status = 'processing')::int`,
      avgBioactivityScore: sql<number>`round(avg(bioactivity_score)::numeric, 1)::float`,
    }).from(sequencesTable).where(eq(sequencesTable.userId, userId)).then(r => r[0]),

    db.query.userTokensTable.findFirst({ where: eq(userTokensTable.userId, userId) }),

    db.select({ totalAnnotations: sql<number>`count(*)::int` })
      .from(annotationsTable).where(eq(annotationsTable.userId, userId)).then(r => r[0]),

    db.select().from(stakingPositionsTable).where(
      and(eq(stakingPositionsTable.walletAddress, userId), eq(stakingPositionsTable.status, "active"))
    ),

    db.select().from(sequencesTable)
      .where(eq(sequencesTable.userId, userId))
      .orderBy(desc(sequencesTable.createdAt))
      .limit(5),
  ]);

  const totalStaked = activePositions.reduce((sum, p) => sum + p.amount, 0);
  const pendingStakingRewards = activePositions.reduce((sum, p) => sum + calcPendingReward(p), 0);
  const stakingStatus = deriveStakingTier(totalStaked);

  res.json({
    userId,
    totalRuns: stats.totalRuns || 0,
    completedRuns: stats.completedRuns || 0,
    processingRuns: stats.processingRuns || 0,
    totalTokensEarned: tokenUser?.earnedTotal ?? 0,
    totalAnnotations: annotationStats.totalAnnotations || 0,
    stakingStatus,
    stakedAmount: totalStaked,
    pendingStakingRewards,
    activePositions: activePositions.length,
    avgBioactivityScore: stats.avgBioactivityScore || 0,
    recentRuns,
  });
});

router.get("/missions/history", async (req, res) => {
  const { userId, page } = GetMissionHistoryQueryParams.parse(req.query);
  const pg = page ?? 1;
  const limit = 10;
  const offset = (pg - 1) * limit;

  const runs = await db.select().from(sequencesTable)
    .where(eq(sequencesTable.userId, userId))
    .orderBy(desc(sequencesTable.createdAt))
    .limit(limit)
    .offset(offset);
  res.json(runs);
});

router.get("/missions/earnings", async (req, res) => {
  const { userId } = GetMissionEarningsQueryParams.parse(req.query);

  const [annotations, tokenUser, stakingPositions] = await Promise.all([
    db.select({
      type: annotationsTable.type,
      tokensEarned: annotationsTable.tokensEarned,
      createdAt: annotationsTable.createdAt,
    }).from(annotationsTable)
      .where(eq(annotationsTable.userId, userId))
      .orderBy(desc(annotationsTable.createdAt))
      .limit(50),

    db.query.userTokensTable.findFirst({ where: eq(userTokensTable.userId, userId) }),

    db.select().from(stakingPositionsTable).where(
      and(eq(stakingPositionsTable.walletAddress, userId), eq(stakingPositionsTable.status, "active"))
    ),
  ]);

  const totalEarned = tokenUser?.earnedTotal ?? 0;
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thisWeek = annotations.filter(a => new Date(a.createdAt) > oneWeekAgo).reduce((sum, a) => sum + (a.tokensEarned ?? 0), 0);
  const fromAnnotations = annotations.reduce((sum, a) => sum + (a.tokensEarned ?? 0), 0);
  const fromStaking = stakingPositions.reduce((sum, p) => sum + calcPendingReward(p), 0);

  const recentEarnings = annotations.slice(0, 10).map(a => ({
    source: "annotation",
    amount: a.tokensEarned ?? 0,
    label: `${a.type.charAt(0).toUpperCase() + a.type.slice(1)} annotation`,
    createdAt: a.createdAt.toISOString(),
  }));

  res.json({
    userId,
    totalEarned,
    thisWeek: Math.round(thisWeek * 10) / 10,
    fromAnnotations: Math.round(fromAnnotations * 10) / 10,
    fromStaking: Math.round(fromStaking * 1e6) / 1e6,
    fromReferrals: 0,
    recentEarnings,
  });
});

router.get("/token/balance", async (req, res) => {
  const { userId } = GetTokenBalanceQueryParams.parse(req.query);

  let tokenUser = await db.query.userTokensTable.findFirst({ where: eq(userTokensTable.userId, userId) });
  if (!tokenUser) {
    const [created] = await db.insert(userTokensTable).values({
      userId,
      username: userId,
      balance: 0,
      earnedTotal: 0,
      spentTotal: 0,
      stakedAmount: 0,
      stakingTier: "free",
    }).returning();
    tokenUser = created;
  }

  res.json({
    userId: tokenUser.userId,
    balance: tokenUser.balance,
    stakedAmount: tokenUser.stakedAmount,
    earnedTotal: tokenUser.earnedTotal,
    spentTotal: tokenUser.spentTotal,
    stakingTier: tokenUser.stakingTier,
    solanaAddress: tokenUser.solanaAddress,
  });
});

// ─── Events ─────────────────────────────────────────────────────────────────

const EVENT_S1 = {
  id: "season-1",
  name: "Top Contributor Challenge",
  season: "Season 1",
  description: "Compete to be PEPTOMA's top contributor. Submit sequences, annotate discoveries, and earn $PEPTM rewards. Prize pool distributed proportionally — the more you contribute, the larger your share.",
  startAt: new Date("2026-05-06T00:00:00Z"),
  endAt:   new Date("2026-05-13T00:00:00Z"),
  prizePool: 20_000_000,
  distribution: "proportional",
  scoring: { perRun: 10, perAnnotation: 15 },
};

router.get("/events/current", (_req, res) => {
  const now = new Date();
  const status: "upcoming" | "active" | "ended" =
    now < EVENT_S1.startAt ? "upcoming" : now <= EVENT_S1.endAt ? "active" : "ended";
  res.json({
    ...EVENT_S1,
    status,
    startAt: EVENT_S1.startAt.toISOString(),
    endAt:   EVENT_S1.endAt.toISOString(),
    updatedAt: new Date().toISOString(),
  });
});

router.get("/events/leaderboard", async (_req, res) => {
  // Only count activity within the event window
  const start = EVENT_S1.startAt;
  const end   = EVENT_S1.endAt;

  const rows = await db.select({
    userId:            userTokensTable.userId,
    username:          userTokensTable.username,
    totalTokensEarned: userTokensTable.earnedTotal,
    totalRuns: sql<number>`(
      select count(*)::int from sequences
      where user_id = ${userTokensTable.userId}
        and created_at >= ${start.toISOString()}
        and created_at <= ${end.toISOString()}
    )`,
    totalAnnotations: sql<number>`(
      select count(*)::int from annotations
      where user_id = ${userTokensTable.userId}
        and created_at >= ${start.toISOString()}
        and created_at <= ${end.toISOString()}
    )`,
  }).from(userTokensTable).limit(500);

  // Score only users with real activity during event
  const active = rows
    .map(r => ({
      ...r,
      combinedScore: Math.round(
        (r.totalRuns ?? 0) * EVENT_S1.scoring.perRun +
        (r.totalAnnotations ?? 0) * EVENT_S1.scoring.perAnnotation,
      ),
    }))
    .filter(r => r.totalRuns > 0 || r.totalAnnotations > 0)
    .sort((a, b) => b.combinedScore - a.combinedScore);

  // Proportional prize distribution
  const totalScore = active.reduce((s, r) => s + r.combinedScore, 0);
  const pool = EVENT_S1.prizePool;

  const ranked = active.slice(0, 50).map((r, i) => ({
    ...r,
    rank: i + 1,
    estimatedReward: totalScore > 0
      ? Math.round((r.combinedScore / totalScore) * pool)
      : 0,
    sharePercent: totalScore > 0
      ? Math.round((r.combinedScore / totalScore) * 10000) / 100
      : 0,
  }));

  res.json({
    leaderboard: ranked,
    totalParticipants: active.length,
    totalScore,
    updatedAt: new Date().toISOString(),
  });
});

// ─── Wallet activity feed ────────────────────────────────────────────────────

router.get("/wallet/activity", async (req, res) => {
  const userId = String(req.query.userId ?? "");
  const limit = Math.min(100, parseInt(String(req.query.limit ?? "50")));
  if (!userId) return res.status(400).json({ error: "userId required" });

  const [seqs, anns, votes] = await Promise.all([
    db.select({
      id: sequencesTable.id,
      sequence: sequencesTable.sequence,
      bioactivityLabel: sequencesTable.bioactivityLabel,
      bioactivityScore: sequencesTable.bioactivityScore,
      depth: sequencesTable.depth,
      status: sequencesTable.status,
      ipfsCid: sequencesTable.ipfsCid,
      createdAt: sequencesTable.createdAt,
    }).from(sequencesTable)
      .where(eq(sequencesTable.userId, userId))
      .orderBy(desc(sequencesTable.createdAt))
      .limit(limit),

    db.select({
      id: annotationsTable.id,
      sequenceId: annotationsTable.sequenceId,
      type: annotationsTable.type,
      content: annotationsTable.content,
      tokensEarned: annotationsTable.tokensEarned,
      createdAt: annotationsTable.createdAt,
    }).from(annotationsTable)
      .where(eq(annotationsTable.userId, userId))
      .orderBy(desc(annotationsTable.createdAt))
      .limit(limit),

    db.select({
      id: governanceVotesTable.id,
      proposalId: governanceVotesTable.proposalId,
      vote: governanceVotesTable.vote,
      weight: governanceVotesTable.weight,
      stakingTier: governanceVotesTable.stakingTier,
      createdAt: governanceVotesTable.createdAt,
    }).from(governanceVotesTable)
      .where(eq(governanceVotesTable.walletAddress, userId))
      .orderBy(desc(governanceVotesTable.createdAt))
      .limit(limit),
  ]);

  type ActivityItem = {
    id: string;
    type: "sequence_submit" | "annotation" | "governance_vote" | "ipfs_pin" | "nft_mint";
    title: string;
    description: string;
    tokensEarned: number;
    tokensCost: number;
    timestamp: string;
    link: string | null;
    badge: string | null;
    meta: Record<string, unknown>;
  };

  const items: ActivityItem[] = [];

  for (const s of seqs) {
    const cost = s.depth === "deep" ? 5 : 1;
    items.push({
      id: `seq-${s.id}`,
      type: "sequence_submit",
      title: "Submitted peptide sequence",
      description: `${s.sequence.slice(0, 24)}${s.sequence.length > 24 ? "…" : ""} · ${s.bioactivityLabel ?? "Analyzing…"}`,
      tokensEarned: s.status === "completed" ? 5 : 0,
      tokensCost: cost,
      timestamp: s.createdAt.toISOString(),
      link: `/annotate/${s.id}`,
      badge: s.status,
      meta: { sequenceId: s.id, bioactivityScore: s.bioactivityScore, depth: s.depth, ipfsPinned: !!s.ipfsCid },
    });
    if (s.ipfsCid) {
      items.push({
        id: `ipfs-${s.id}`,
        type: "ipfs_pin",
        title: "Sequence pinned to IPFS",
        description: `Immutable record created · CID: ${s.ipfsCid.slice(0, 12)}…`,
        tokensEarned: 0,
        tokensCost: 0,
        timestamp: s.createdAt.toISOString(),
        link: `https://ipfs.io/ipfs/${s.ipfsCid}`,
        badge: "verified",
        meta: { sequenceId: s.id, cid: s.ipfsCid },
      });
    }
  }

  const annotationReward: Record<string, number> = { confirm: 2, challenge: 3, extend: 5, tag: 2 };
  for (const a of anns) {
    items.push({
      id: `ann-${a.id}`,
      type: "annotation",
      title: `${a.type.charAt(0).toUpperCase() + a.type.slice(1)} annotation`,
      description: a.content ? `${a.content.slice(0, 80)}${a.content.length > 80 ? "…" : ""}` : `On sequence #${a.sequenceId}`,
      tokensEarned: a.tokensEarned ?? annotationReward[a.type] ?? 0,
      tokensCost: 0,
      timestamp: a.createdAt.toISOString(),
      link: `/annotate/${a.sequenceId}`,
      badge: a.type,
      meta: { annotationId: a.id, sequenceId: a.sequenceId, annotationType: a.type },
    });
  }

  for (const v of votes) {
    items.push({
      id: `gov-${v.id}`,
      type: "governance_vote",
      title: `Voted ${v.vote.toUpperCase()} on proposal`,
      description: `Proposal #${v.proposalId} · Voting weight: ${v.weight}× (${v.stakingTier} tier)`,
      tokensEarned: 0,
      tokensCost: 0,
      timestamp: v.createdAt.toISOString(),
      link: `/governance`,
      badge: v.vote,
      meta: { proposalId: v.proposalId, weight: v.weight, tier: v.stakingTier },
    });
  }

  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  req.log.info({ userId, count: items.length }, "Wallet activity fetched");
  res.json({ userId, total: items.length, items: items.slice(0, limit) });
});

// ─── Token leaderboard ───────────────────────────────────────────────────────

router.get("/token/leaderboard", async (_req, res) => {
  const leaders = await db.select({
    userId: userTokensTable.userId,
    username: userTokensTable.username,
    totalTokensEarned: userTokensTable.earnedTotal,
    totalContributions: sql<number>`(select count(*)::int from annotations where user_id = ${userTokensTable.userId})`,
  }).from(userTokensTable).orderBy(desc(userTokensTable.earnedTotal)).limit(20);

  res.json(leaders.map((l, i) => ({ ...l, rank: i + 1 })));
});

export default router;
