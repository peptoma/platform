
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Lock, Award, Vote, Check, Copy, Zap, ChevronDown, Wallet, BarChart3, Timer, Unlock, Sparkles, CheckCircle, XCircle, ChevronRight } from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useWallet } from "@/contexts/wallet-context";
import { Link } from "wouter";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createTransferCheckedInstruction,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

// ─── Constants ───────────────────────────────────────────────────────────────
const PEPTOMA_CA = "HopMHHPfSV2kWQLghKt6xR1oWbPRLA2UyxnKGoPpump";
const TREASURY = "8PAdZPAEEaD5gfJxbC1fFp4q7cpCNHhz4ycQMdT8P8Lg";
const PEPTM_DECIMALS = 6;
// Route via our API proxy to avoid browser CORS/403 on public RPC
const RPC = `${window.location.origin}/api/rpc/solana`;

const LOCK_OPTIONS = [
  { key: "flexible", label: "Flexible", days: 0, multiplier: 1.0, color: "text-muted-foreground", border: "border-border" },
  { key: "30d",      label: "30 Days",  days: 30,  multiplier: 1.25, color: "text-[hsl(var(--peptoma-cyan))]",  border: "border-[hsl(var(--peptoma-cyan))/30]" },
  { key: "90d",      label: "90 Days",  days: 90,  multiplier: 1.75, color: "text-[hsl(var(--peptoma-gold))]",  border: "border-[hsl(var(--peptoma-gold))/30]" },
  { key: "180d",     label: "180 Days", days: 180, multiplier: 2.5,  color: "text-purple-400",                 border: "border-purple-400/30" },
];


// ─── API helpers ─────────────────────────────────────────────────────────────
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type PoolStats = {
  totalStaked: number; totalWeighted: number; positionCount: number;
  estimatedWeeklyReward: number; aprPct: number; totalRewardPaid: number;
};

async function fetchPool(): Promise<PoolStats> {
  const r = await fetch(`${BASE}/api/staking/pool`);
  return r.json();
}

type StakingLeaderEntry = {
  rank: number; walletAddress: string; shortAddress: string;
  totalStaked: number; totalWeighted: number; positionCount: number;
};

async function fetchStakingLeaderboard(): Promise<StakingLeaderEntry[]> {
  const r = await fetch(`${BASE}/api/staking/leaderboard`);
  return r.json();
}

async function fetchPositions(wallet: string) {
  const r = await fetch(`${BASE}/api/staking/positions?wallet=${wallet}`);
  return r.json() as Promise<Array<{
    id: number; walletAddress: string; amount: number; lockPeriod: string;
    multiplier: number; stakedAt: string; unlockAt: string | null;
    txSig: string; status: string; rewardsClaimed: number;
  }>>;
}

async function postStake(body: { walletAddress: string; amount: number; lockPeriod: string; txSig: string }) {
  const r = await fetch(`${BASE}/api/staking/stake`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function postUnstake(id: number, wallet: string) {
  const r = await fetch(`${BASE}/api/staking/unstake/${id}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wallet }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

type RewardsData = {
  positions: Array<{ id: number; amount: number; lockPeriod: string; multiplier: number; pendingRewards: number; rewardsClaimed: number }>;
  totalPending: number;
  totalClaimed: number;
};

async function fetchRewards(wallet: string): Promise<RewardsData> {
  const r = await fetch(`${BASE}/api/staking/rewards?wallet=${wallet}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function postClaim(walletAddress: string): Promise<{ txSig: string; claimed: number }> {
  const r = await fetch(`${BASE}/api/staking/claim`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ walletAddress }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: "Claim failed" }));
    throw new Error(err.error ?? "Claim failed");
  }
  return r.json();
}

// ─── SPL transfer helper ──────────────────────────────────────────────────────
type SendTxFn = (tx: Transaction, conn: Connection) => Promise<string>;

async function sendStake(walletAddress: string, amount: number, sendTx: SendTxFn): Promise<string> {
  const conn = new Connection(RPC, "confirmed");
  const mintPk = new PublicKey(PEPTOMA_CA);
  const from = new PublicKey(walletAddress);
  const to = new PublicKey(TREASURY);

  const fromATA = await getAssociatedTokenAddress(mintPk, from);
  const toATA = await getAssociatedTokenAddress(mintPk, to);

  const tx = new Transaction();

  // Create treasury ATA on-chain if it doesn't exist yet
  const toAccInfo = await conn.getAccountInfo(toATA);
  if (!toAccInfo) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        from, toATA, to, mintPk,
        TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
      )
    );
  }

  tx.add(
    createTransferCheckedInstruction(
      fromATA, mintPk, toATA, from,
      BigInt(Math.round(amount * 10 ** PEPTM_DECIMALS)),
      PEPTM_DECIMALS, [], TOKEN_PROGRAM_ID,
    )
  );

  tx.feePayer = from;
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
  tx.recentBlockhash = blockhash;

  const signature = await sendTx(tx, conn);
  // Wait for on-chain confirmation before returning
  await conn.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");

  return signature;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function TokenCABanner() {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(PEPTOMA_CA); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="rounded-xl border border-[hsl(var(--peptoma-cyan))/30] bg-[hsl(var(--peptoma-cyan))/5] p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--peptoma-cyan))] animate-pulse" />
        <p className="text-[10px] font-mono tracking-widest text-[hsl(var(--peptoma-cyan))] uppercase">$PEPTM · Live on Solana Mainnet</p>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <button onClick={copy} className="flex items-center gap-3 min-w-0 group">
          <span className="font-mono text-xs text-[hsl(var(--peptoma-cyan))] truncate">{PEPTOMA_CA}</span>
          <span className={cn("shrink-0 flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-md border transition-colors",
            copied ? "border-[hsl(var(--peptoma-green))/30] bg-[hsl(var(--peptoma-green))/10] text-[hsl(var(--peptoma-green))]"
                   : "border-[hsl(var(--peptoma-cyan))/20] bg-[hsl(var(--peptoma-cyan))/8] text-[hsl(var(--peptoma-cyan))]")}>
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? "COPIED" : "COPY"}
          </span>
        </button>
        <div className="flex items-center gap-3 sm:ml-auto shrink-0">
          {[
            { label: "SOLSCAN", href: `https://solscan.io/token/${PEPTOMA_CA}` },
            { label: "BIRDEYE", href: `https://birdeye.so/token/${PEPTOMA_CA}?chain=solana` },
            { label: "RAYDIUM", href: `https://raydium.io/swap/?inputMint=sol&outputMint=${PEPTOMA_CA}` },
          ].map(({ label, href }) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer"
              className="text-[10px] font-mono text-muted-foreground hover:text-[hsl(var(--peptoma-cyan))] transition-colors">
              {label} ↗
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function PoolStatsGrid({ pool }: { pool: PoolStats }) {
  const stats = [
    { label: "Total Staked", value: `${pool.totalStaked.toLocaleString()} $PEPTM`, icon: Lock },
    { label: "Active Stakers", value: pool.positionCount.toString(), icon: BarChart3 },
    { label: "Est. Weekly Reward", value: `${pool.estimatedWeeklyReward.toLocaleString()} $PEPTM`, icon: TrendingUp },
    { label: "Est. APR", value: `${pool.aprPct}%`, icon: Zap },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map(({ label, value, icon: Icon }) => (
        <div key={label} className="rounded-xl border border-border bg-card/60 p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Icon className="w-3.5 h-3.5" />
            <span className="text-[10px] font-mono tracking-widest uppercase">{label}</span>
          </div>
          <p className="font-mono font-bold text-sm text-foreground">{value}</p>
        </div>
      ))}
    </div>
  );
}

// Live reward counter that ticks up every second based on APY
const BASE_APY = 0.12;
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function useLiveReward(amount: number, multiplier: number, lastClaimedAt: string | null, stakedAt: string, enabled: boolean) {
  const [reward, setReward] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) { setReward(0); return; }
    const from = lastClaimedAt ? new Date(lastClaimedAt).getTime() : new Date(stakedAt).getTime();
    const rate = (amount * BASE_APY * multiplier) / YEAR_MS; // $PEPTM per ms
    const tick = () => setReward((Date.now() - from) * rate);
    tick();
    ref.current = setInterval(tick, 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [amount, multiplier, lastClaimedAt, stakedAt, enabled]);

  return reward;
}

function PositionRow({ pos, wallet, onUnstake }: {
  pos: { id: number; amount: number; lockPeriod: string; multiplier: number; stakedAt: string; unlockAt: string | null; status: string; lastClaimedAt?: string | null };
  wallet: string;
  onUnstake: (id: number) => void;
}) {
  const opt = LOCK_OPTIONS.find(o => o.key === pos.lockPeriod) ?? LOCK_OPTIONS[0];
  const unlockDate = pos.unlockAt ? new Date(pos.unlockAt) : null;
  const canUnstake = pos.status === "active" && (!unlockDate || unlockDate <= new Date());
  const daysLeft = unlockDate && unlockDate > new Date()
    ? Math.ceil((unlockDate.getTime() - Date.now()) / 86400_000)
    : 0;
  const liveReward = useLiveReward(pos.amount, pos.multiplier, pos.lastClaimedAt ?? null, pos.stakedAt, pos.status === "active");

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 last:border-0 gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", pos.status === "active" ? "bg-[hsl(var(--peptoma-green))] animate-pulse" : "bg-muted")} />
        <div className="min-w-0">
          <p className="font-mono font-bold text-sm text-foreground">{pos.amount.toLocaleString()} <span className="text-muted-foreground font-normal">$PEPTM</span></p>
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-mono text-muted-foreground">{opt.label} · {pos.multiplier}× · {new Date(pos.stakedAt).toLocaleDateString()}</p>
            {pos.status === "active" && (
              <span className="text-[10px] font-mono text-[hsl(var(--peptoma-gold))]">
                +{liveReward.toFixed(6)} $PEPTM
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {daysLeft > 0 && (
          <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
            <Timer className="w-3 h-3" />
            {daysLeft}d
          </span>
        )}
        {pos.status === "pending_unstake" ? (
          <span className="text-[10px] font-mono text-muted-foreground px-2 py-1 rounded border border-border">PENDING</span>
        ) : (
          <button
            onClick={() => onUnstake(pos.id)}
            disabled={!canUnstake}
            className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Unlock className="w-3 h-3" />
            Unstake
          </button>
        )}
      </div>
    </div>
  );
}

function TotalLiveReward({ positions }: { positions: Array<{ amount: number; multiplier: number; lastClaimedAt?: string | null; stakedAt: string }> }) {
  const [total, setTotal] = useState(0);
  useEffect(() => {
    const rates = positions.map(p => {
      const from = p.lastClaimedAt ? new Date(p.lastClaimedAt).getTime() : new Date(p.stakedAt).getTime();
      return { from, rate: (p.amount * BASE_APY * p.multiplier) / YEAR_MS };
    });
    const tick = () => setTotal(rates.reduce((s, { from, rate }) => s + (Date.now() - from) * rate, 0));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [positions]);
  return <span className="font-mono font-bold text-2xl text-[hsl(var(--peptoma-gold))]">{total.toFixed(6)}</span>;
}

type StakeStatus = "idle" | "building" | "awaiting_approval" | "confirming" | "success" | "error";

function StakingPanel() {
  const qc = useQueryClient();
  const { connected, address, peptomBalance, refreshBalances, sendTransaction } = useWallet();
  const [amount, setAmount] = useState("");
  const [lock, setLock] = useState<string>("flexible");
  const [stakeStatus, setStakeStatus] = useState<StakeStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lockOpen, setLockOpen] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  const { data: pool, isLoading: poolLoading } = useQuery({ queryKey: ["staking-pool"], queryFn: fetchPool, refetchInterval: 30_000 });
  const { data: positions } = useQuery({
    queryKey: ["staking-positions", address],
    queryFn: () => fetchPositions(address!),
    enabled: !!address,
    refetchInterval: 60_000,
  });

  const claimMut = useMutation({
    mutationFn: () => postClaim(address!),
    onSuccess: (data) => {
      setClaimSuccess(`Claimed ${data.claimed.toFixed(4)} $PEPTM → tx ${data.txSig.slice(0, 8)}…`);
      refreshBalances();
      qc.invalidateQueries({ queryKey: ["staking-positions", address] });
      setTimeout(() => setClaimSuccess(null), 6000);
    },
    onError: (e: Error) => { setClaimError(e.message); setTimeout(() => setClaimError(null), 5000); },
  });

  const unstakeMut = useMutation({
    mutationFn: ({ id }: { id: number }) => postUnstake(id, address!),
    onSuccess: () => {
      refreshBalances();
      qc.invalidateQueries({ queryKey: ["staking-positions", address] });
    },
  });

  const selectedOpt = LOCK_OPTIONS.find(o => o.key === lock)!;
  const numAmount = parseFloat(amount) || 0;
  const weightedAmount = numAmount * selectedOpt.multiplier;
  const shareOfPool = pool && pool.totalWeighted > 0
    ? (weightedAmount / (pool.totalWeighted + weightedAmount)) * 100
    : 100;
  const weeklyEst = pool ? (shareOfPool / 100) * pool.estimatedWeeklyReward : 0;

  const handleStake = useCallback(async () => {
    if (!address || numAmount <= 0) return;
    setError(null);
    setStakeStatus("building");
    try {
      setStakeStatus("awaiting_approval");
      const txSig = await sendStake(address, numAmount, sendTransaction);
      setStakeStatus("confirming");
      await postStake({ walletAddress: address, amount: numAmount, lockPeriod: lock, txSig });
      setStakeStatus("success");
      setAmount("");
      refreshBalances();
      qc.invalidateQueries({ queryKey: ["staking-pool"] });
      qc.invalidateQueries({ queryKey: ["staking-positions", address] });
      setTimeout(() => setStakeStatus("idle"), 4000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("rejected") || msg.includes("cancelled") || msg.includes("canceled")) {
        setStakeStatus("idle");
      } else {
        setError(msg.slice(0, 160));
        setStakeStatus("error");
      }
    }
  }, [address, numAmount, lock, qc, refreshBalances, sendTransaction]);

  const activePositions = positions?.filter(p => p.status === "active" || p.status === "pending_unstake") ?? [];
  const activeOnly = positions?.filter(p => p.status === "active") ?? [];

  return (
    <div className="space-y-4">
      {/* Pool Stats */}
      {poolLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted/20 animate-pulse" />)}
        </div>
      ) : pool ? (
        <PoolStatsGrid pool={pool} />
      ) : null}

      {/* Rewards Panel — only if wallet connected + has active positions */}
      {connected && activeOnly.length > 0 && (
        <div className="rounded-xl border border-[hsl(var(--peptoma-gold))/30] bg-[hsl(var(--peptoma-gold))/5] p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[hsl(var(--peptoma-gold))]" />
                <p className="text-[10px] font-mono tracking-widest text-[hsl(var(--peptoma-gold))] uppercase">Claimable Rewards</p>
              </div>
              <div className="flex items-baseline gap-2">
                <TotalLiveReward positions={activeOnly} />
                <span className="font-mono text-sm text-muted-foreground">$PEPTM</span>
              </div>
              <p className="text-[10px] font-mono text-muted-foreground/60">12% base APY × lock multiplier · accruing in real-time</p>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <button
                onClick={() => claimMut.mutate()}
                disabled={claimMut.isPending}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[hsl(var(--peptoma-gold))] text-black font-mono font-bold text-sm rounded-lg hover:bg-[hsl(var(--peptoma-gold))/90] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_hsl(43_100%_50%/0.2)]"
              >
                {claimMut.isPending ? (
                  <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}><Zap className="w-4 h-4" /></motion.div>CLAIMING...</>
                ) : (
                  <><Sparkles className="w-4 h-4" />CLAIM ALL</>
                )}
              </button>
              {claimSuccess && (
                <p className="text-[10px] font-mono text-[hsl(var(--peptoma-green))] text-center">{claimSuccess}</p>
              )}
              {claimError && (
                <p className="text-[10px] font-mono text-red-400 text-center max-w-[200px]">{claimError}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Stake Form */}
        <div className="rounded-xl border border-border bg-card/60 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Stake $PEPTM</p>
          </div>

          {!connected ? (
            <div className="py-6 text-center space-y-2">
              <Wallet className="w-8 h-8 text-muted-foreground/30 mx-auto" />
              <p className="text-xs font-mono text-muted-foreground">Connect wallet to stake</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Amount */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono text-muted-foreground tracking-widest">AMOUNT ($PEPTM)</label>
                  <button onClick={() => setAmount((peptomBalance ?? 0).toString())}
                    className="text-[10px] font-mono text-[hsl(var(--peptoma-cyan))] hover:underline">
                    MAX: {(peptomBalance ?? 0).toLocaleString()}
                  </button>
                </div>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0"
                  min={0}
                  className="w-full px-3 py-2.5 rounded-lg bg-background border border-border font-mono text-sm focus:outline-none focus:border-[hsl(var(--peptoma-cyan))] transition-colors"
                />
              </div>

              {/* Lock Period */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-muted-foreground tracking-widest">LOCK PERIOD</label>
                <div className="relative">
                  <button
                    onClick={() => setLockOpen(o => !o)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-background border border-border font-mono text-sm hover:border-[hsl(var(--peptoma-cyan))/50] transition-colors"
                  >
                    <span className={selectedOpt.color}>{selectedOpt.label} · {selectedOpt.multiplier}×</span>
                    <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", lockOpen && "rotate-180")} />
                  </button>
                  <AnimatePresence>
                    {lockOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                        className="absolute top-full left-0 right-0 mt-1 z-20 rounded-lg border border-border bg-card shadow-lg overflow-hidden"
                      >
                        {LOCK_OPTIONS.map(opt => (
                          <button key={opt.key} onClick={() => { setLock(opt.key); setLockOpen(false); }}
                            className={cn("w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-muted/20 transition-colors border-b border-border/40 last:border-0",
                              lock === opt.key && "bg-muted/20")}>
                            <div>
                              <span className={cn("font-mono text-sm font-bold", opt.color)}>{opt.label}</span>
                              {opt.days > 0 && <span className="text-[10px] font-mono text-muted-foreground ml-2">{opt.days}d lock</span>}
                            </div>
                            <span className={cn("font-mono text-sm font-bold", opt.color)}>{opt.multiplier}×</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Estimate */}
              {numAmount > 0 && pool && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="rounded-lg bg-[hsl(var(--peptoma-cyan))/5] border border-[hsl(var(--peptoma-cyan))/20] p-3 space-y-1.5">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-muted-foreground">Weighted stake</span>
                    <span className="text-foreground">{weightedAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })} $PEPTM</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-muted-foreground">Pool share (est.)</span>
                    <span className="text-foreground">{shareOfPool.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-muted-foreground">Est. weekly reward</span>
                    <span className="text-[hsl(var(--peptoma-cyan))] font-bold">{weeklyEst.toFixed(0)} $PEPTM</span>
                  </div>
                </motion.div>
              )}

              {/* Status feedback */}
              {(stakeStatus === "building" || stakeStatus === "awaiting_approval" || stakeStatus === "confirming") && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[hsl(var(--peptoma-cyan))/8] border border-[hsl(var(--peptoma-cyan))/20]">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                    <Zap className="w-4 h-4 text-[hsl(var(--peptoma-cyan))]" />
                  </motion.div>
                  <p className="text-xs font-mono text-[hsl(var(--peptoma-cyan))]">
                    {stakeStatus === "building" && "Preparing transaction..."}
                    {stakeStatus === "awaiting_approval" && "Approve in your wallet..."}
                    {stakeStatus === "confirming" && "Confirming on-chain..."}
                  </p>
                </div>
              )}

              {stakeStatus === "error" && error && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-400/8 border border-red-400/20">
                  <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] font-mono text-red-400">{error}</p>
                </div>
              )}

              <button
                disabled
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-muted/40 text-muted-foreground font-mono font-bold text-sm rounded-lg cursor-not-allowed border border-border"
              >
                <Sparkles className="w-4 h-4" />
                COMING SOON
              </button>

              <p className="text-[10px] font-mono text-muted-foreground/60 leading-relaxed">
                Tokens are sent to the PEPTOMA treasury. Rewards distributed weekly from 70% of platform fees. Unstaking pending period applies.
              </p>
            </div>
          )}
        </div>

        {/* Positions */}
        <div className="rounded-xl border border-border bg-card/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Your Positions</p>
            </div>
            {activePositions.length > 0 && (
              <span className="text-[10px] font-mono text-[hsl(var(--peptoma-cyan))]">
                {activePositions.reduce((s, p) => s + p.amount, 0).toLocaleString()} $PEPTM staked
              </span>
            )}
          </div>
          {!connected ? (
            <div className="p-8 text-center">
              <Wallet className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs font-mono text-muted-foreground">Connect wallet to view positions</p>
            </div>
          ) : activePositions.length === 0 ? (
            <div className="p-8 text-center">
              <Lock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs font-mono text-muted-foreground">No active positions</p>
              <p className="text-[10px] font-mono text-muted-foreground/60 mt-1">Stake $PEPTM to start earning rewards</p>
            </div>
          ) : (
            <div>
              {activePositions.map(pos => (
                <PositionRow key={pos.id} pos={pos} wallet={address!} onUnstake={id => unstakeMut.mutate({ id })} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Distribution logic */}
      <div className="rounded-xl border border-border bg-card/60 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Reward Distribution Logic</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { step: "01", title: "Fee Collection", desc: "1,000 $PEPTM per Deep analysis session flows to treasury" },
            { step: "02", title: "Weekly Split", desc: "Every 7 days: 70% → staker rewards, 30% → treasury operations" },
            { step: "03", title: "Weighted Share", desc: "Your share = (amount × lock multiplier) ÷ total weighted pool" },
          ].map(({ step, title, desc }) => (
            <div key={step} className="p-3 rounded-lg bg-background/40 border border-border space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-[hsl(var(--peptoma-cyan))]">{step}</span>
                <span className="text-xs font-mono font-bold text-foreground">{title}</span>
              </div>
              <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 pt-1">
          {LOCK_OPTIONS.map(opt => (
            <div key={opt.key} className={cn("flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1.5 rounded-lg border", opt.border)}>
              <span className={opt.color}>{opt.label}</span>
              <span className="text-muted-foreground">·</span>
              <span className={cn("font-bold", opt.color)}>{opt.multiplier}× multiplier</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StakingLeaderRow({ entry, index }: { entry: StakingLeaderEntry; index: number }) {
  const medals: Record<number, string> = { 1: "text-yellow-400", 2: "text-gray-300", 3: "text-amber-600" };
  const isTop3 = entry.rank <= 3;
  const opt = LOCK_OPTIONS.find(o => o.multiplier === Math.max(...[entry.totalWeighted / entry.totalStaked].map(m => parseFloat(m.toFixed(2)))));
  return (
    <motion.tr initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }}
      className="border-b border-border/40 hover:bg-muted/10 transition-colors">
      <td className="py-3 px-4">
        <span className={cn("font-mono font-bold text-sm", isTop3 ? medals[entry.rank] : "text-muted-foreground")}>#{entry.rank}</span>
      </td>
      <td className="py-3 px-4">
        <span className="font-mono text-sm text-[hsl(var(--peptoma-cyan))]">{entry.shortAddress}</span>
      </td>
      <td className="py-3 px-4">
        <span className="font-mono text-sm text-foreground font-bold">{entry.totalStaked.toLocaleString()}</span>
        <span className="text-xs font-mono text-muted-foreground ml-1">$PEPTM</span>
      </td>
      <td className="py-3 px-4">
        <span className="font-mono text-sm text-[hsl(var(--peptoma-gold))] font-bold">{entry.totalWeighted.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        <span className="text-[10px] font-mono text-muted-foreground ml-1">weighted</span>
      </td>
      <td className="py-3 px-4">
        <span className="font-mono text-xs text-muted-foreground">{entry.positionCount} pos.</span>
      </td>
    </motion.tr>
  );
}

// ─── Governance Preview (shown on Token page) ─────────────────────────────────
interface GovProposal {
  id: number; title: string; category: string; status: string;
  yesPct: number; yesCount: number; noCount: number;
  totalWeight: number; quorum: number; quorumReached: boolean;
  isExpired: boolean; endsAt: string; userVote: string | null;
}

const GOV_CAT_COLORS: Record<string, string> = {
  reward_rate:      "text-[hsl(var(--peptoma-gold))] border-[hsl(var(--peptoma-gold))/30] bg-[hsl(var(--peptoma-gold))/8]",
  tier_requirement: "text-[hsl(var(--peptoma-cyan))] border-[hsl(var(--peptoma-cyan))/30] bg-[hsl(var(--peptoma-cyan))/8]",
  scoring:          "text-purple-400 border-purple-400/30 bg-purple-400/8",
  policy:           "text-muted-foreground border-border bg-muted/20",
  other:            "text-muted-foreground border-border bg-muted/20",
};
const GOV_CAT_LABELS: Record<string, string> = {
  reward_rate: "Reward Rate", tier_requirement: "Tier", scoring: "Scoring", policy: "Policy", other: "Other",
};

function GovernancePreview() {
  const [proposals, setProposals] = useState<GovProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<number | null>(null);
  const [voted, setVoted] = useState<Record<number, string>>({});
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const { connected, userId } = useWallet();
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchGov = async () => {
    const url = `${BASE}/api/governance/proposals${connected && userId ? `?wallet=${encodeURIComponent(userId)}` : ""}`;
    const r = await fetch(url);
    if (r.ok) {
      const all: GovProposal[] = await r.json();
      setProposals(all.filter(p => p.status === "active" && !p.isExpired).slice(0, 2));
    }
    setLoading(false);
  };

  useEffect(() => { fetchGov(); }, [connected, userId]);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 3000);
  };

  const handleVote = async (proposalId: number, vote: "yes" | "no") => {
    if (!connected || !userId) { showToast("Connect wallet to vote", false); return; }
    setVoting(proposalId);
    try {
      const r = await fetch(`${BASE}/api/governance/proposals/${proposalId}/vote`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: userId, vote }),
      });
      const data = await r.json();
      if (r.ok) {
        showToast(`Voted! Weight: ${data.weight.toFixed(1)}× (${data.tier.toUpperCase()})`, true);
        setVoted(v => ({ ...v, [proposalId]: vote }));
        await fetchGov();
      } else {
        showToast(data.error ?? "Vote failed", false);
      }
    } finally {
      setVoting(null);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card/60 overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Vote className="w-4 h-4 text-muted-foreground" />
          <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Governance · Active Votes</p>
          <span className="flex items-center gap-1 text-[9px] font-mono text-[hsl(var(--peptoma-green))] ml-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--peptoma-green))] animate-pulse" />
            LIVE
          </span>
        </div>
        <Link href="/governance">
          <div className="flex items-center gap-1 text-[11px] font-mono text-[hsl(var(--peptoma-cyan))] hover:underline cursor-pointer">
            All proposals <ChevronRight className="w-3 h-3" />
          </div>
        </Link>
      </div>

      {loading ? (
        <div className="p-5 space-y-3">
          {[1, 2].map(i => <div key={i} className="h-20 bg-muted/20 rounded-lg animate-pulse" />)}
        </div>
      ) : proposals.length === 0 ? (
        <div className="p-8 text-center">
          <Vote className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="font-mono text-xs text-muted-foreground">No active proposals right now</p>
          <Link href="/governance"><div className="text-xs font-mono text-[hsl(var(--peptoma-cyan))] mt-1 hover:underline cursor-pointer">View all proposals →</div></Link>
        </div>
      ) : (
        <div className="divide-y divide-border/60">
          {proposals.map(p => {
            const myVote = p.userVote ?? voted[p.id] ?? null;
            const catColor = GOV_CAT_COLORS[p.category] ?? GOV_CAT_COLORS.other;
            return (
              <div key={p.id} className="px-5 py-4 space-y-3">
                <div className="flex items-start gap-2">
                  <span className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase shrink-0 mt-0.5", catColor)}>
                    {GOV_CAT_LABELS[p.category] ?? "Other"}
                  </span>
                  <p className="text-xs font-mono text-foreground leading-snug font-medium">{p.title}</p>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-[hsl(var(--peptoma-cyan))]">YES {p.yesPct}%</span>
                    <span className="text-muted-foreground">{p.yesCount + p.noCount} voters</span>
                    <span className="text-red-400">NO {100 - p.yesPct}%</span>
                  </div>
                  <div className="h-1.5 bg-red-500/15 rounded-full overflow-hidden">
                    <div className="h-full bg-[hsl(var(--peptoma-cyan))] rounded-full transition-all duration-700" style={{ width: `${p.yesPct}%` }} />
                  </div>
                </div>
                {myVote ? (
                  <div className={cn("inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-lg border font-bold",
                    myVote === "yes" ? "border-[hsl(var(--peptoma-cyan))/40] text-[hsl(var(--peptoma-cyan))] bg-[hsl(var(--peptoma-cyan))/8]"
                                    : "border-red-500/40 text-red-400 bg-red-500/8")}>
                    {myVote === "yes" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    You voted {myVote.toUpperCase()}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => handleVote(p.id, "yes")} disabled={voting === p.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-[hsl(var(--peptoma-cyan))] text-black font-mono text-[11px] font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
                      <CheckCircle className="w-3 h-3" /> YES
                    </button>
                    <button onClick={() => handleVote(p.id, "no")} disabled={voting === p.id}
                      className="flex items-center gap-1 px-3 py-1.5 border border-red-500/40 text-red-400 font-mono text-[11px] font-bold rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-50">
                      <XCircle className="w-3 h-3" /> NO
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={cn("mx-5 mb-4 flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-mono",
              toast.ok ? "border-[hsl(var(--peptoma-cyan))/40] text-[hsl(var(--peptoma-cyan))] bg-[hsl(var(--peptoma-cyan))/8]"
                       : "border-red-500/40 text-red-400 bg-red-500/8")}>
            {toast.ok ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Token() {
  const { data: stakers, isLoading: stakersLoading } = useQuery({
    queryKey: ["staking-leaderboard"],
    queryFn: fetchStakingLeaderboard,
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-1 tracking-widest uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--peptoma-gold))] animate-pulse" />
          Token Layer
        </div>
        <h1 className="text-3xl font-bold tracking-tight">$PEPTOMA Token</h1>
        <p className="text-muted-foreground mt-1 font-mono text-sm">Stake $PEPTM to earn platform rewards. Standard is free — Deep analysis costs 1,000 $PEPTM/session.</p>
      </div>

      <TokenCABanner />

      {/* Live Staking */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-muted-foreground" />
          <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Staking Pool</p>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-[hsl(var(--peptoma-green))/30] text-[hsl(var(--peptoma-green))] bg-[hsl(var(--peptoma-green))/10] ml-auto">LIVE</span>
        </div>
        <StakingPanel />
      </div>


      {/* Governance */}
      <GovernancePreview />

      {/* Earn Guide */}
      <div className="rounded-xl border border-border bg-card/60 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase">How to Earn $PEPTOMA Points</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { action: "Submit Sequence", earn: "+5", desc: "Run AI analysis on any peptide sequence" },
            { action: "Confirm",          earn: "+2", desc: "Agree with the AI classification" },
            { action: "Challenge",        earn: "+3", desc: "Dispute with evidence and reasoning" },
            { action: "Extend",           earn: "+5", desc: "Add related data or supporting sequences" },
          ].map(({ action, earn, desc }) => (
            <div key={action} className="p-3 rounded-lg bg-background/40 border border-border space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-foreground font-bold">{action}</span>
                <span className="text-xs font-mono text-[hsl(var(--peptoma-gold))] font-bold">{earn}</span>
              </div>
              <p className="text-[10px] font-mono text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] font-mono text-muted-foreground/60">Contributions are tracked on-chain via wallet. Connect your wallet to link contributions to your address.</p>
      </div>

      {/* Live Staking Leaderboard */}
      <div className="rounded-xl border border-border bg-card/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Active Stakers</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--peptoma-green))] animate-pulse" />
            <span className="text-xs font-mono text-[hsl(var(--peptoma-green))]">Live · updates every 30s</span>
          </div>
        </div>
        {stakersLoading ? (
          <div className="p-8 space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-muted/20 rounded animate-pulse" />)}</div>
        ) : !stakers || stakers.length === 0 ? (
          <div className="p-12 text-center">
            <Lock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-mono text-muted-foreground">No active stakers yet</p>
            <p className="text-xs font-mono text-muted-foreground/60 mt-1">Be the first — connect your wallet and stake $PEPTM above</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/40">
                {["Rank", "Wallet", "Staked", "Weighted", "Positions"].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-mono text-muted-foreground tracking-widest uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stakers.map((entry, i) => <StakingLeaderRow key={entry.walletAddress} entry={entry} index={i} />)}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
