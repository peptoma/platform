import { useGetMissions, useGetMissionHistory, useGetMissionEarnings, getGetMissionsQueryKey, getGetMissionHistoryQueryKey, getGetMissionEarningsQueryKey, useGetMyTeams, useCreateTeam, useInviteTeamMember, useRemoveTeamMember, getGetMyTeamsQueryKey } from "@workspace/api-client-react";
import type { SequenceAnalysis, TeamSummary } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Rocket, Activity, CheckCircle, Clock, TrendingUp, Coins, Award, Layers, Microscope, Lock, FlaskConical, MessageSquare, Key, Copy, Check, Trash2, Plus, Vote, Archive, ExternalLink, ArrowRight, Shield, Wallet, Users, UserPlus, Crown, UserX, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useWallet } from "@/contexts/wallet-context";

const BASE = import.meta.env.BASE_URL as string;
const BASE_APY = 0.12;
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

const tierConfig: Record<string, { color: string; minStake: number; label: string; desc: string; runsPerDay: string }> = {
  free:       { color: "text-muted-foreground border-border bg-muted/20",                                                            minStake: 0,      label: "FREE",       desc: "3 runs/day · Standard depth only",                runsPerDay: "3" },
  researcher: { color: "text-[hsl(var(--peptoma-cyan))] border-[hsl(var(--peptoma-cyan))/30] bg-[hsl(var(--peptoma-cyan))/10]",     minStake: 500,    label: "RESEARCHER", desc: "20 runs/day · Deep analysis unlocked",            runsPerDay: "20" },
  pro:        { color: "text-[hsl(var(--peptoma-gold))] border-[hsl(var(--peptoma-gold))/30] bg-[hsl(var(--peptoma-gold))/10]",     minStake: 2000,   label: "PRO",        desc: "Unlimited runs · API access",                    runsPerDay: "∞" },
  lab:        { color: "text-foreground border-white/20 bg-white/5",                                                                minStake: 10000,  label: "LAB",        desc: "All Pro · Governance 3× · Priority compute",    runsPerDay: "∞" },
};

// ── Activity Feed ─────────────────────────────────────────────────────────────

type ActivityType = "sequence_submit" | "annotation" | "governance_vote" | "ipfs_pin" | "nft_mint";

interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  tokensEarned: number;
  tokensCost: number;
  timestamp: string;
  link: string | null;
  badge: string | null;
  meta: Record<string, unknown>;
}

const ACTIVITY_ICON: Record<ActivityType, React.ElementType> = {
  sequence_submit: FlaskConical,
  annotation: MessageSquare,
  governance_vote: Vote,
  ipfs_pin: Archive,
  nft_mint: Shield,
};

const ACTIVITY_COLOR: Record<ActivityType, string> = {
  sequence_submit: "text-[hsl(var(--peptoma-cyan))] bg-[hsl(var(--peptoma-cyan))/10] border-[hsl(var(--peptoma-cyan))/20]",
  annotation: "text-[hsl(var(--peptoma-green))] bg-[hsl(var(--peptoma-green))/10] border-[hsl(var(--peptoma-green))/20]",
  governance_vote: "text-[hsl(var(--peptoma-gold))] bg-[hsl(var(--peptoma-gold))/10] border-[hsl(var(--peptoma-gold))/20]",
  ipfs_pin: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  nft_mint: "text-pink-400 bg-pink-400/10 border-pink-400/20",
};

const BADGE_MAP: Record<string, { label: string; cls: string }> = {
  completed:  { label: "COMPLETED",  cls: "text-[hsl(var(--peptoma-green))] border-[hsl(var(--peptoma-green))/30] bg-[hsl(var(--peptoma-green))/8]" },
  processing: { label: "PROCESSING", cls: "text-[hsl(var(--peptoma-gold))] border-[hsl(var(--peptoma-gold))/30] bg-[hsl(var(--peptoma-gold))/8]" },
  failed:     { label: "FAILED",     cls: "text-red-400 border-red-400/30 bg-red-400/8" },
  confirm:    { label: "CONFIRM",    cls: "text-[hsl(var(--peptoma-green))] border-[hsl(var(--peptoma-green))/30] bg-[hsl(var(--peptoma-green))/8]" },
  challenge:  { label: "CHALLENGE",  cls: "text-red-400 border-red-400/30 bg-red-400/8" },
  extend:     { label: "EXTEND",     cls: "text-[hsl(var(--peptoma-cyan))] border-[hsl(var(--peptoma-cyan))/30] bg-[hsl(var(--peptoma-cyan))/8]" },
  tag:        { label: "TAG",        cls: "text-[hsl(var(--peptoma-gold))] border-[hsl(var(--peptoma-gold))/30] bg-[hsl(var(--peptoma-gold))/8]" },
  yes:        { label: "YES",        cls: "text-[hsl(var(--peptoma-green))] border-[hsl(var(--peptoma-green))/30] bg-[hsl(var(--peptoma-green))/8]" },
  no:         { label: "NO",         cls: "text-red-400 border-red-400/30 bg-red-400/8" },
  verified:   { label: "VERIFIED",   cls: "text-purple-400 border-purple-400/30 bg-purple-400/8" },
};

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function ActivityFeed({ userId }: { userId: string }) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<ActivityType | "all">("all");

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetch(`${BASE}api/wallet/activity?userId=${encodeURIComponent(userId)}&limit=100`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: { items: ActivityItem[] }) => { setItems(d.items); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [userId]);

  const filtered = filter === "all" ? items : items.filter(i => i.type === filter);

  const counts = {
    all: items.length,
    sequence_submit: items.filter(i => i.type === "sequence_submit").length,
    annotation: items.filter(i => i.type === "annotation").length,
    governance_vote: items.filter(i => i.type === "governance_vote").length,
    ipfs_pin: items.filter(i => i.type === "ipfs_pin").length,
  };

  const totalEarned = items.reduce((s, i) => s + i.tokensEarned, 0);
  const totalSpent  = items.reduce((s, i) => s + i.tokensCost, 0);

  return (
    <div className="space-y-4">
      {/* Token summary banner */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Actions", value: String(items.length), color: "text-foreground" },
          { label: "Points Earned", value: `+${totalEarned.toFixed(0)} pts`, color: "text-[hsl(var(--peptoma-green))]" },
          { label: "Points Spent", value: `-${totalSpent.toFixed(0)} pts`, color: "text-[hsl(var(--peptoma-red))]" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-border bg-card/60 p-4 text-center">
            <p className={cn("text-2xl font-bold font-mono", color)}>{value}</p>
            <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {([
          { key: "all", label: "All", count: counts.all },
          { key: "sequence_submit", label: "Lab Runs", count: counts.sequence_submit },
          { key: "annotation", label: "Annotations", count: counts.annotation },
          { key: "governance_vote", label: "Votes", count: counts.governance_vote },
          { key: "ipfs_pin", label: "IPFS Pins", count: counts.ipfs_pin },
        ] as const).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-mono font-bold border transition-all",
              filter === key
                ? "border-[hsl(var(--peptoma-cyan))/40] bg-[hsl(var(--peptoma-cyan))/10] text-[hsl(var(--peptoma-cyan))]"
                : "border-border text-muted-foreground hover:border-border/60 hover:text-foreground"
            )}
          >
            {label}
            <span className={cn("px-1 rounded text-[8px]", filter === key ? "bg-[hsl(var(--peptoma-cyan))/20]" : "bg-muted/40")}>{count}</span>
          </button>
        ))}
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-lg bg-muted/30 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-muted/30 rounded w-2/3" />
                <div className="h-2 bg-muted/20 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12 space-y-2">
          <Activity className="w-8 h-8 text-muted-foreground/30 mx-auto" />
          <p className="font-mono text-sm text-muted-foreground">Failed to load activity</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-3 rounded-xl border border-dashed border-border/40">
          <Activity className="w-10 h-10 text-muted-foreground/20 mx-auto" />
          <p className="font-mono text-sm text-muted-foreground">No activity yet</p>
          <p className="text-xs font-mono text-muted-foreground/60">
            {filter === "all"
              ? "Submit your first peptide sequence in The Lab to get started"
              : `No ${filter.replace("_", " ")} actions found`
            }
          </p>
          {filter === "all" && (
            <Link href="/lab">
              <span className="inline-flex items-center gap-1 px-4 py-2 mt-1 bg-[hsl(var(--peptoma-cyan))] text-black font-mono text-xs font-bold rounded-lg cursor-pointer hover:opacity-90 transition-opacity">
                Go to The Lab <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          )}
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border/40" />
          <div className="space-y-1">
            {filtered.map((item, idx) => {
              const Icon = ACTIVITY_ICON[item.type] ?? Activity;
              const colorCls = ACTIVITY_COLOR[item.type] ?? "text-muted-foreground bg-muted/10 border-border";
              const badge = item.badge ? BADGE_MAP[item.badge] : null;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                  className="flex gap-3 pl-0 group"
                >
                  {/* Icon */}
                  <div className={cn("w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-1 z-10 bg-background", colorCls)}>
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Content */}
                  <div className={cn(
                    "flex-1 rounded-xl border border-border bg-card/40 hover:bg-card/70 p-3.5 transition-colors mb-2",
                    item.link ? "cursor-pointer" : ""
                  )}
                    onClick={() => item.link && (window.location.href = item.link)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold text-foreground">{item.title}</span>
                          {badge && (
                            <span className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase tracking-widest", badge.cls)}>
                              {badge.label}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-mono text-muted-foreground mt-0.5 leading-relaxed truncate">
                          {item.description}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[9px] font-mono text-muted-foreground/50 whitespace-nowrap">
                          {timeAgo(item.timestamp)}
                        </span>
                        <div className="flex items-center gap-1">
                          {item.tokensEarned > 0 && (
                            <span className="text-[9px] font-mono text-[hsl(var(--peptoma-green))] font-bold">
                              +{item.tokensEarned} pts
                            </span>
                          )}
                          {item.tokensCost > 0 && (
                            <span className="text-[9px] font-mono text-muted-foreground/60">
                              −{item.tokensCost} pts
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {item.link && (
                      <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ExternalLink className="w-2.5 h-2.5 text-muted-foreground/40" />
                        <span className="text-[9px] font-mono text-muted-foreground/40">View details</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, highlight, sub }: {
  label: string; value: string | number; icon: React.ElementType; highlight?: boolean; sub?: string;
}) {
  return (
    <div className={cn("rounded-xl border bg-card/60 backdrop-blur-sm p-5 space-y-3", highlight ? "border-[hsl(var(--peptoma-cyan))/30]" : "border-border")}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-muted-foreground tracking-widest uppercase">{label}</span>
        <Icon className={cn("w-4 h-4", highlight ? "text-[hsl(var(--peptoma-cyan))]" : "text-muted-foreground/60")} />
      </div>
      <div className={cn("text-3xl font-bold font-mono", highlight ? "text-[hsl(var(--peptoma-cyan))]" : "text-foreground")}>{value}</div>
      {sub && <p className="text-[10px] font-mono text-muted-foreground/60">{sub}</p>}
    </div>
  );
}

// ── Live reward counter ───────────────────────────────────────────────────────

function LiveRewardCounter({ base, pendingRewards, activePositions }: {
  base: number; pendingRewards: number; activePositions: number;
}) {
  const [live, setLive] = useState(pendingRewards);
  const startRef = useRef({ ts: Date.now(), base: pendingRewards });

  useEffect(() => { startRef.current = { ts: Date.now(), base: pendingRewards }; }, [pendingRewards]);

  useEffect(() => {
    if (activePositions === 0) return;
    const id = setInterval(() => {
      const elapsed = (Date.now() - startRef.current.ts) / YEAR_MS;
      setLive(startRef.current.base + base * BASE_APY * elapsed);
    }, 1000);
    return () => clearInterval(id);
  }, [base, activePositions]);

  return <span className="font-mono text-[hsl(var(--peptoma-cyan))] font-bold">{live.toFixed(6)}</span>;
}

// ── API Key Panel ─────────────────────────────────────────────────────────────

interface ApiKeyRecord { id: number; label: string; tier: string; callCount: number; createdAt: string; lastUsedAt: string | null; keyPreview: string; }

function ApiKeyPanel({ walletAddress, stakingTier }: { walletAddress: string; stakingTier: string }) {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [label, setLabel] = useState("Default");
  const isPro = stakingTier === "pro" || stakingTier === "lab";

  const fetchKeys = useCallback(async () => {
    if (!walletAddress) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE}api/keys?walletAddress=${encodeURIComponent(walletAddress)}`);
      if (res.ok) setKeys(await res.json());
    } finally { setLoading(false); }
  }, [walletAddress]);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`${BASE}api/keys/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, userId: walletAddress, label: label || "Default" }),
      });
      if (res.ok) { const data = await res.json() as { key: string }; setNewKey(data.key); await fetchKeys(); }
    } finally { setGenerating(false); }
  };

  const revoke = async (id: number) => {
    await fetch(`${BASE}api/keys/${id}?walletAddress=${encodeURIComponent(walletAddress)}`, { method: "DELETE" });
    await fetchKeys();
  };

  const copyKey = async (key: string) => {
    await navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-border bg-card/60 overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-[hsl(var(--peptoma-cyan))]" />
          <span className="text-xs font-mono text-muted-foreground tracking-widest uppercase">API Keys</span>
        </div>
        {isPro && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[hsl(var(--peptoma-cyan))/30] text-[hsl(var(--peptoma-cyan))] bg-[hsl(var(--peptoma-cyan))/8]">{keys.length} active</span>
        )}
      </div>

      <div className="p-5 space-y-4">
        {!isPro ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-muted/10">
              <Lock className="w-4 h-4 text-muted-foreground/40 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="font-mono text-sm text-foreground">PRO tier required</p>
                <p className="text-[11px] font-mono text-muted-foreground">
                  API keys available for wallets staking ≥ 2,000 $PEPTOMA. Upgrade on the{" "}
                  <Link href="/token"><span className="text-[hsl(var(--peptoma-cyan))] cursor-pointer hover:underline">Staking page</span></Link>.
                </p>
              </div>
            </div>
            <div className="p-3 rounded-lg border border-[hsl(var(--peptoma-cyan))/20] bg-[hsl(var(--peptoma-cyan))/5] space-y-2">
              <p className="text-[11px] font-mono text-[hsl(var(--peptoma-cyan))] font-bold">No key needed for MCP</p>
              <p className="text-[11px] font-mono text-muted-foreground">Connect any AI agent with just your wallet address:</p>
              <code className="block text-[10px] font-mono text-foreground/70 bg-background/60 border border-border rounded px-2 py-1.5">
                npx peptoma-mcp --wallet {walletAddress || "<your_solana_address>"}
              </code>
              <Link href="/agents"><span className="inline-block text-[11px] font-mono text-[hsl(var(--peptoma-cyan))] hover:underline cursor-pointer">View full Agent & MCP docs →</span></Link>
            </div>
          </div>
        ) : (
          <>
            {newKey && (
              <div className="p-4 rounded-lg border border-[hsl(var(--peptoma-cyan))/40] bg-[hsl(var(--peptoma-cyan))/5] space-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--peptoma-cyan))] animate-pulse" />
                  <p className="text-[10px] font-mono text-[hsl(var(--peptoma-cyan))] tracking-widest uppercase font-bold">New key generated — copy now, shown once only</p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 font-mono text-xs text-foreground break-all bg-background/80 border border-[hsl(var(--peptoma-cyan))/30] rounded px-3 py-2">{newKey}</code>
                  <button onClick={() => copyKey(newKey)} className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border hover:border-[hsl(var(--peptoma-cyan))/40] text-xs font-mono transition-colors">
                    {copied ? <><Check className="w-3.5 h-3.5 text-[hsl(var(--peptoma-cyan))]" /> Copied</> : <><Copy className="w-3.5 h-3.5 text-muted-foreground" /> Copy</>}
                  </button>
                </div>
                <button onClick={() => setNewKey(null)} className="text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors">Dismiss</button>
              </div>
            )}
            <div className="flex gap-2">
              <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Key label (e.g. CI pipeline)" className="flex-1 px-3 py-2 bg-background/60 border border-border rounded-lg font-mono text-xs text-foreground placeholder-muted-foreground/50 focus:outline-none focus:border-[hsl(var(--peptoma-cyan))/40] transition-colors" />
              <button onClick={generate} disabled={generating} className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-[hsl(var(--peptoma-cyan))] text-black font-mono text-xs font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
                <Plus className="w-3.5 h-3.5" />
                {generating ? "Generating…" : "Generate Key"}
              </button>
            </div>
            {loading ? (
              <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-14 bg-muted/20 rounded-lg animate-pulse" />)}</div>
            ) : keys.length === 0 ? (
              <div className="text-center py-6 space-y-1 border border-dashed border-border rounded-lg">
                <Key className="w-5 h-5 text-muted-foreground/30 mx-auto" />
                <p className="text-xs font-mono text-muted-foreground/60">No active API keys</p>
              </div>
            ) : (
              <div className="space-y-2">
                {keys.map(k => (
                  <div key={k.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background/40 hover:bg-background/60 transition-colors">
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-foreground">{k.label}</span>
                        <span className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase", k.tier === "lab" ? "border-white/20 text-foreground bg-white/5" : "border-[hsl(var(--peptoma-gold))/30] text-[hsl(var(--peptoma-gold))] bg-[hsl(var(--peptoma-gold))/8]")}>{k.tier}</span>
                      </div>
                      <code className="text-[10px] font-mono text-muted-foreground">{k.keyPreview}</code>
                      <div className="flex items-center gap-2 text-[9px] font-mono text-muted-foreground/50">
                        <span>Created {new Date(k.createdAt).toLocaleDateString()}</span>
                        {k.lastUsedAt && <><span>·</span><span>Last used {new Date(k.lastUsedAt).toLocaleDateString()}</span></>}
                        {k.callCount > 0 && <><span>·</span><span className="text-[hsl(var(--peptoma-cyan))/80]">{k.callCount.toLocaleString()} calls</span></>}
                      </div>
                    </div>
                    <button onClick={() => revoke(k.id)} title="Revoke key" className="shrink-0 p-1.5 rounded border border-border hover:border-red-500/40 hover:text-red-500 text-muted-foreground/50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="p-3 rounded-lg bg-muted/10 border border-border space-y-1">
              <p className="text-[10px] font-mono text-muted-foreground/60 font-bold uppercase tracking-widest">Usage</p>
              <code className="block text-[10px] font-mono text-foreground/60 bg-background/60 border border-border rounded px-2 py-1.5">Authorization: Bearer &lt;your_key&gt;</code>
              <Link href="/agents"><span className="inline-block text-[10px] font-mono text-[hsl(var(--peptoma-cyan))] hover:underline cursor-pointer">Full API reference →</span></Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Run row ───────────────────────────────────────────────────────────────────

function RunRow({ run, index }: { run: SequenceAnalysis; index: number }) {
  const statusIcon = run.status === "completed" ? CheckCircle : run.status === "processing" ? Clock : Activity;
  const statusColor = run.status === "completed" ? "text-[hsl(var(--peptoma-green))]" : run.status === "processing" ? "text-[hsl(var(--peptoma-gold))]" : "text-[hsl(var(--peptoma-red))]";
  return (
    <motion.tr initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }} className="border-b border-border/40 hover:bg-muted/10 transition-colors">
      <td className="py-3 px-4"><span className="font-mono text-sm text-foreground">{run.sequence.slice(0, 20)}{run.sequence.length > 20 ? "…" : ""}</span></td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1.5">
          {(() => { const Icon = statusIcon; return <Icon className={cn("w-3.5 h-3.5", statusColor)} />; })()}
          <span className={cn("text-xs font-mono uppercase", statusColor)}>{run.status}</span>
        </div>
      </td>
      <td className="py-3 px-4">
        {run.depth ? (
          <div className="flex items-center gap-1">
            {run.depth === "deep" ? <Microscope className="w-3 h-3 text-[hsl(var(--peptoma-gold))]" /> : <Layers className="w-3 h-3 text-muted-foreground" />}
            <span className={cn("text-xs font-mono uppercase", run.depth === "deep" ? "text-[hsl(var(--peptoma-gold))]" : "text-muted-foreground")}>{run.depth}</span>
          </div>
        ) : <span className="text-muted-foreground text-xs font-mono">—</span>}
      </td>
      <td className="py-3 px-4"><span className={cn("text-sm font-mono font-bold", run.bioactivityScore >= 75 ? "text-[hsl(var(--peptoma-cyan))]" : run.bioactivityScore >= 50 ? "text-[hsl(var(--peptoma-gold))]" : "text-muted-foreground")}>{run.bioactivityScore}</span></td>
      <td className="py-3 px-4"><span className="text-sm font-mono text-muted-foreground">{run.confidenceScore}</span></td>
      <td className="py-3 px-4">
        {run.diseaseTarget ? <span className="text-xs font-mono px-2 py-0.5 rounded border border-[hsl(var(--peptoma-gold))/20] text-[hsl(var(--peptoma-gold))/70]">{run.diseaseTarget}</span> : <span className="text-muted-foreground/40 text-xs font-mono">—</span>}
      </td>
    </motion.tr>
  );
}

// ── Teams Tab ─────────────────────────────────────────────────────────────────

function TeamsTab({ walletAddress }: { walletAddress: string }) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [inviteTarget, setInviteTarget] = useState<Record<number, string>>({});
  const [inviteStatus, setInviteStatus] = useState<Record<number, string>>({});

  const { data: teams = [], isLoading } = useGetMyTeams(
    { wallet: walletAddress },
    { query: { queryKey: getGetMyTeamsQueryKey({ wallet: walletAddress }), enabled: !!walletAddress } }
  );

  const createTeam = useCreateTeam({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMyTeamsQueryKey({ wallet: walletAddress }) });
        setShowCreate(false);
        setCreateName("");
        setCreateDesc("");
      },
    },
  });

  const inviteMember = useInviteTeamMember({
    mutation: {
      onSuccess: (_, vars) => {
        const teamId = vars.id;
        setInviteStatus(s => ({ ...s, [teamId]: "invited!" }));
        setInviteTarget(t => ({ ...t, [teamId]: "" }));
        setTimeout(() => setInviteStatus(s => ({ ...s, [teamId]: "" })), 2500);
        queryClient.invalidateQueries({ queryKey: getGetMyTeamsQueryKey({ wallet: walletAddress }) });
      },
      onError: (_, vars) => {
        setInviteStatus(s => ({ ...s, [vars.id]: "error" }));
        setTimeout(() => setInviteStatus(s => ({ ...s, [vars.id]: "" })), 2500);
      },
    },
  });

  const removeMember = useRemoveTeamMember({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMyTeamsQueryKey({ wallet: walletAddress }) });
      },
    },
  });

  if (isLoading) return (
    <div className="space-y-3">
      {[1, 2].map(i => <div key={i} className="h-24 rounded-xl border border-border bg-card/40 animate-pulse" />)}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-mono font-bold text-foreground">Research Teams</h3>
          <p className="text-[11px] font-mono text-muted-foreground mt-0.5">Collaborate with your lab. Lab-tier exclusive.</p>
        </div>
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[hsl(var(--peptoma-cyan))] text-black font-mono text-xs font-bold rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3 h-3" /> New Team
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-[hsl(var(--peptoma-cyan))/30] bg-[hsl(var(--peptoma-cyan))/5] p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[hsl(var(--peptoma-cyan))] tracking-widest uppercase">Create Team</span>
            <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
          </div>
          <input
            value={createName}
            onChange={e => setCreateName(e.target.value)}
            placeholder="Team name"
            className="w-full px-3 py-2 bg-background/60 border border-border rounded-lg font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[hsl(var(--peptoma-cyan))/50]"
          />
          <input
            value={createDesc}
            onChange={e => setCreateDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full px-3 py-2 bg-background/60 border border-border rounded-lg font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[hsl(var(--peptoma-cyan))/50]"
          />
          <button
            disabled={!createName.trim() || createTeam.isPending}
            onClick={() => createTeam.mutate({ data: { name: createName.trim(), description: createDesc.trim() || undefined, ownerWallet: walletAddress } })}
            className="px-4 py-2 bg-[hsl(var(--peptoma-cyan))] text-black font-mono text-xs font-bold rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {createTeam.isPending ? "Creating…" : "Create Team"}
          </button>
        </motion.div>
      )}

      {/* Empty state */}
      {teams.length === 0 && !showCreate && (
        <div className="rounded-xl border border-dashed border-border bg-card/20 p-10 text-center space-y-3">
          <Users className="w-10 h-10 text-muted-foreground/30 mx-auto" />
          <p className="font-mono text-sm text-muted-foreground">No teams yet</p>
          <p className="text-[11px] font-mono text-muted-foreground/60">Create a team to collaborate on research projects with other Lab-tier researchers.</p>
        </div>
      )}

      {/* Team cards */}
      {(teams as TeamSummary[]).map((team) => (
        <motion.div
          key={team.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card/60 p-5 space-y-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Crown className={cn("w-3.5 h-3.5", team.myRole === "owner" ? "text-[hsl(var(--peptoma-gold))]" : "text-muted-foreground/40")} />
                <span className="font-mono font-bold text-foreground text-sm">{team.name}</span>
                <span className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase",
                  team.myRole === "owner" ? "text-[hsl(var(--peptoma-gold))] border-[hsl(var(--peptoma-gold))/20] bg-[hsl(var(--peptoma-gold))/8]"
                  : team.myRole === "invited" ? "text-[hsl(var(--peptoma-cyan))] border-[hsl(var(--peptoma-cyan))/20] bg-[hsl(var(--peptoma-cyan))/8]"
                  : "text-muted-foreground border-border bg-muted/20"
                )}>
                  {team.myRole}
                </span>
              </div>
              {team.description && <p className="text-[11px] font-mono text-muted-foreground">{team.description}</p>}
              <p className="text-[10px] font-mono text-muted-foreground/60">{team.memberCount} member{team.memberCount !== 1 ? "s" : ""}</p>
            </div>
            {team.myRole !== "owner" && (
              <button
                onClick={() => removeMember.mutate({ id: team.id, wallet: walletAddress, data: { ownerWallet: walletAddress } })}
                className="text-muted-foreground/40 hover:text-red-400 transition-colors"
                title="Leave team"
              >
                <UserX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Invite form (owner only) */}
          {team.myRole === "owner" && (
            <div className="pt-3 border-t border-border/60 space-y-2">
              <p className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">Invite Member</p>
              <div className="flex gap-2">
                <input
                  value={inviteTarget[team.id] ?? ""}
                  onChange={e => setInviteTarget(t => ({ ...t, [team.id]: e.target.value }))}
                  placeholder="Wallet address"
                  className="flex-1 px-3 py-1.5 bg-background/60 border border-border rounded-lg font-mono text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[hsl(var(--peptoma-cyan))/50]"
                />
                <button
                  disabled={!inviteTarget[team.id]?.trim() || inviteMember.isPending}
                  onClick={() => inviteMember.mutate({ id: team.id, data: { ownerWallet: walletAddress, targetWallet: inviteTarget[team.id]!.trim() } })}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-[hsl(var(--peptoma-cyan))/40] text-[hsl(var(--peptoma-cyan))] font-mono text-[10px] rounded-lg hover:bg-[hsl(var(--peptoma-cyan))/8] disabled:opacity-40 transition-all"
                >
                  {inviteStatus[team.id] === "invited!" ? <Check className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
                  {inviteStatus[team.id] || "Invite"}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = "overview" | "activity" | "api-keys" | "teams";

export default function Missions() {
  const { userId, connected, shortAddress, connect, connecting } = useWallet();
  const [tab, setTab] = useState<Tab>("overview");

  const queryOpts = { query: { refetchInterval: 30_000 } };
  const { data: missions, isLoading: missionsLoading } = useGetMissions({ userId }, { query: { ...queryOpts.query, queryKey: getGetMissionsQueryKey({ userId }) } });
  const { data: history, isLoading: historyLoading } = useGetMissionHistory({ userId }, { query: { ...queryOpts.query, queryKey: getGetMissionHistoryQueryKey({ userId }) } });
  const { data: earnings } = useGetMissionEarnings({ userId }, { query: { ...queryOpts.query, queryKey: getGetMissionEarningsQueryKey({ userId }) } });

  const stakingTier = (missions?.stakingStatus ?? "free") as keyof typeof tierConfig;
  const tier = tierConfig[stakingTier] ?? tierConfig.free;
  const completionRate = missions && missions.totalRuns > 0 ? Math.round((missions.completedRuns / missions.totalRuns) * 100) : 0;
  const hasStake = (missions?.activePositions ?? 0) > 0;

  const TIER_ORDER: Array<keyof typeof tierConfig> = ["free", "researcher", "pro", "lab"];
  const currentTierIdx = TIER_ORDER.indexOf(stakingTier);
  const nextTier = currentTierIdx < TIER_ORDER.length - 1 ? TIER_ORDER[currentTierIdx + 1] : null;
  const nextTierMin = nextTier ? tierConfig[nextTier].minStake : null;
  const staked = missions?.stakedAmount ?? 0;
  const progressPct = nextTierMin ? Math.min(100, Math.round((staked / nextTierMin) * 100)) : 100;

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "overview",  label: "Overview",   icon: TrendingUp },
    { key: "activity",  label: "Activity",   icon: Activity },
    { key: "api-keys",  label: "API Keys",   icon: Key },
    ...(stakingTier === "lab" ? [{ key: "teams" as Tab, label: "Teams", icon: Users }] : []),
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-1 tracking-widest uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--peptoma-cyan))] animate-pulse" />
          Mission Control
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Wallet Dashboard</h1>
            <p className="text-muted-foreground mt-1 font-mono text-sm">
              Everything your wallet has done on PEPTOMA — contributions, tokens, votes.
            </p>
          </div>
          {connected && (
            <div className="flex items-center gap-2 text-xs font-mono text-[hsl(var(--peptoma-cyan))] bg-[hsl(var(--peptoma-cyan))/8] border border-[hsl(var(--peptoma-cyan))/20] px-3 py-2 rounded-lg shrink-0">
              <Wallet className="w-3.5 h-3.5" />
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--peptoma-cyan))] animate-pulse" />
              {shortAddress}
            </div>
          )}
        </div>
      </div>

      {/* Connect prompt */}
      {!connected && (
        <div className="rounded-xl border border-[hsl(var(--peptoma-cyan))/20] bg-[hsl(var(--peptoma-cyan))/5] p-6 flex items-center justify-between gap-6">
          <div>
            <p className="text-sm font-mono font-bold text-foreground">Connect your Solana wallet to view your dashboard</p>
            <p className="text-xs font-mono text-muted-foreground mt-1">
              All lab runs, annotations, governance votes, and PEPTOMA Points earnings will be tracked and displayed here.
            </p>
          </div>
          <button onClick={connect} disabled={connecting} className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-[hsl(var(--peptoma-cyan))] text-black font-mono text-xs font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
            <Wallet className="w-3.5 h-3.5" />
            {connecting ? "Connecting…" : "Connect Wallet"}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border/60 pb-0 overflow-x-auto scrollbar-none">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 font-mono text-sm transition-all border-b-2 -mb-px whitespace-nowrap shrink-0",
              tab === key
                ? "border-[hsl(var(--peptoma-cyan))] text-[hsl(var(--peptoma-cyan))]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>

          {/* ── OVERVIEW TAB ── */}
          {tab === "overview" && (
            <div className="space-y-6">
              {missionsLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 bg-card/40 rounded-xl border border-border animate-pulse" />)}
                </div>
              ) : missions ? (
                <>
                  <div>
                    <p className="text-[10px] font-mono text-muted-foreground/60 tracking-[0.2em] uppercase mb-3">Research Activity</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <StatCard label="Lab Runs" value={missions.totalRuns} icon={FlaskConical} sub="Total sequences submitted" />
                      <StatCard label="Completed" value={missions.completedRuns} icon={CheckCircle} highlight sub={`${completionRate}% completion rate`} />
                      <StatCard label="Avg Bioactivity" value={`${missions.avgBioactivityScore?.toFixed(1) ?? "0.0"}`} icon={TrendingUp} sub="Across all runs" />
                      <StatCard label="Annotations" value={missions.totalAnnotations} icon={MessageSquare} sub="Peer review contributions" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Staking */}
                    <div className="rounded-xl border border-border bg-card/60 p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Staking Status</span>
                        <Award className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn("px-4 py-2 rounded-lg border font-mono font-bold text-lg uppercase tracking-widest", tier.color)}>{tier.label}</span>
                        <div className="text-xs font-mono text-muted-foreground leading-relaxed">{tier.desc}</div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-muted-foreground">Staked</span>
                          <span className={cn("font-bold", hasStake ? "text-[hsl(var(--peptoma-cyan))]" : "text-muted-foreground")}>
                            {staked.toLocaleString(undefined, { maximumFractionDigits: 2 })} $PEPTOMA
                          </span>
                        </div>
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-muted-foreground">Active positions</span>
                          <span className="text-foreground">{missions.activePositions}</span>
                        </div>
                      </div>
                      {hasStake && (
                        <div className="pt-3 border-t border-border/40">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono text-muted-foreground">Pending staking rewards</span>
                            <LiveRewardCounter base={staked} pendingRewards={missions.pendingStakingRewards ?? 0} activePositions={missions.activePositions} />
                          </div>
                          <p className="text-[10px] font-mono text-muted-foreground/60 mt-1">Live accrual · 12% APY</p>
                        </div>
                      )}
                      {nextTier && nextTierMin && (
                        <div className="pt-3 border-t border-border/40 space-y-2">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-muted-foreground">Progress to {tierConfig[nextTier].label}</span>
                            <span className="text-[hsl(var(--peptoma-cyan))]">{progressPct}%</span>
                          </div>
                          <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                            <motion.div className="h-full bg-[hsl(var(--peptoma-cyan))] rounded-full" initial={{ width: 0 }} animate={{ width: `${progressPct}%` }} transition={{ duration: 1, ease: "easeOut" }} />
                          </div>
                          <p className="text-[10px] font-mono text-muted-foreground/50">
                            Need {(nextTierMin - staked).toLocaleString(undefined, { maximumFractionDigits: 0 })} more $PEPTOMA →{" "}
                            <Link href="/token"><span className="text-[hsl(var(--peptoma-cyan))] cursor-pointer hover:underline">Stake now</span></Link>
                          </p>
                        </div>
                      )}
                      <div className="pt-3 border-t border-border/40 space-y-2">
                        {TIER_ORDER.map((t) => {
                          const tc = tierConfig[t];
                          const isActive = stakingTier === t;
                          return (
                            <div key={t} className={cn("flex items-start gap-2 text-xs font-mono", isActive ? "text-foreground" : "text-muted-foreground/40")}>
                              <span className={cn("w-1.5 h-1.5 rounded-full mt-1 shrink-0", isActive ? "bg-[hsl(var(--peptoma-cyan))]" : "bg-muted/40")} />
                              <div>
                                <span className="font-bold uppercase">{tc.label} </span>
                                <span className="text-[hsl(var(--peptoma-cyan))/60]">{tc.minStake > 0 ? `${tc.minStake.toLocaleString()}+ $PEPTOMA` : "no stake"}</span>
                                <span className="ml-1">· {tc.desc}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Token earnings */}
                    <div className="rounded-xl border border-[hsl(var(--peptoma-gold))/30] bg-card/60 p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-muted-foreground tracking-widest uppercase">PEPTOMA Points Earned</span>
                        <Coins className="w-4 h-4 text-[hsl(var(--peptoma-gold))]" />
                      </div>
                      <div>
                        <div className="text-4xl font-bold font-mono text-[hsl(var(--peptoma-gold))]">
                          {missions.totalTokensEarned.toFixed(0)}
                          <span className="text-base font-normal text-muted-foreground ml-1.5">pts</span>
                        </div>
                        <p className="text-[10px] font-mono text-muted-foreground/60 mt-1">Off-chain activity points — earned from lab runs & annotations</p>
                      </div>
                      <div className="pt-2 border-t border-border/40 space-y-2">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-muted-foreground">This week</span>
                          <span className="text-[hsl(var(--peptoma-gold))]">+{earnings?.thisWeek?.toFixed(1) ?? 0} pts</span>
                        </div>
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-muted-foreground">From annotations</span>
                          <span className="text-foreground">{earnings?.fromAnnotations?.toFixed(0) ?? 0} pts</span>
                        </div>
                        {(earnings?.fromStaking ?? 0) > 0 && (
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-muted-foreground">$PEPTM staking rewards (pending)</span>
                            <span className="text-[hsl(var(--peptoma-cyan))]">{earnings!.fromStaking.toFixed(4)} $PEPTM</span>
                          </div>
                        )}
                      </div>
                      {earnings?.recentEarnings && earnings.recentEarnings.length > 0 && (
                        <div className="pt-2 border-t border-border/40">
                          <p className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase mb-2">Recent Earnings</p>
                          <div className="space-y-1.5">
                            {earnings.recentEarnings.slice(0, 5).map((e, i) => (
                              <div key={i} className="flex items-center justify-between text-xs font-mono">
                                <span className="text-muted-foreground">{e.label}</span>
                                <span className="text-[hsl(var(--peptoma-gold))]">+{e.amount} pts</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="pt-2 border-t border-border/40">
                        <p className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase mb-2">How to earn more</p>
                        <div className="space-y-1 text-[10px] font-mono text-muted-foreground/70">
                          {[
                            { icon: FlaskConical, label: "Standard lab run", reward: "+5" },
                            { icon: Microscope, label: "Deep analysis run", reward: "+5" },
                            { icon: MessageSquare, label: "Extend annotation", reward: "+5" },
                            { icon: MessageSquare, label: "Challenge annotation", reward: "+3" },
                            { icon: MessageSquare, label: "Confirm / Tag", reward: "+2" },
                          ].map(({ icon: I, label, reward }) => (
                            <div key={label} className="flex justify-between items-center">
                              <span className="flex items-center gap-1"><I className="w-3 h-3" />{label}</span>
                              <span className="text-[hsl(var(--peptoma-gold))]">{reward} pts</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Completion rate */}
                  <div className="rounded-xl border border-border bg-card/60 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Run Completion Rate</span>
                      <span className="text-sm font-mono font-bold text-[hsl(var(--peptoma-cyan))]">{completionRate}%</span>
                    </div>
                    <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                      <motion.div className="h-full bg-[hsl(var(--peptoma-cyan))] rounded-full" initial={{ width: 0 }} animate={{ width: `${completionRate}%` }} transition={{ duration: 1, ease: "easeOut" }} />
                    </div>
                    <div className="flex gap-6 text-xs font-mono">
                      <span className="text-[hsl(var(--peptoma-green))]">{missions.completedRuns} completed</span>
                      {missions.processingRuns > 0 && <span className="text-[hsl(var(--peptoma-gold))]">{missions.processingRuns} processing</span>}
                      <span className="text-muted-foreground/50">{missions.totalRuns} total</span>
                    </div>
                  </div>

                  {/* Analysis history table */}
                  <div className="rounded-xl border border-border bg-card/60 overflow-hidden">
                    <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                      <span className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Sequence Submission History</span>
                      <span className="text-xs font-mono text-muted-foreground">{history?.length ?? 0} runs</span>
                    </div>
                    {historyLoading ? (
                      <div className="p-8 space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 bg-muted/20 rounded animate-pulse" />)}</div>
                    ) : history?.length === 0 ? (
                      <div className="p-12 text-center">
                        <Rocket className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="font-mono text-muted-foreground">No runs yet</p>
                        <p className="text-xs font-mono text-muted-foreground/60 mt-1">Head to <Link href="/lab"><span className="text-[hsl(var(--peptoma-cyan))] cursor-pointer hover:underline">The Lab</span></Link> to submit your first peptide sequence</p>
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border/40">
                            {["Sequence", "Status", "Depth", "Bioactivity", "Confidence", "Target"].map(h => (
                              <th key={h} className="text-left py-3 px-4 text-xs font-mono text-muted-foreground tracking-widest uppercase">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>{history?.map((run, i) => <RunRow key={run.id} run={run} index={i} />)}</tbody>
                      </table>
                    )}
                  </div>
                </>
              ) : !connected ? (
                <div className="text-center py-16 space-y-3 rounded-xl border border-dashed border-border/40">
                  <Wallet className="w-10 h-10 text-muted-foreground/20 mx-auto" />
                  <p className="font-mono text-muted-foreground">Connect your wallet to view stats</p>
                </div>
              ) : null}
            </div>
          )}

          {/* ── ACTIVITY TAB ── */}
          {tab === "activity" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-mono font-bold text-foreground">Wallet Activity Timeline</p>
                  <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                    Every action your connected wallet has taken on PEPTOMA — sequences, annotations, governance votes, IPFS pins.
                  </p>
                </div>
              </div>
              {connected ? (
                <ActivityFeed userId={userId} />
              ) : (
                <div className="text-center py-16 space-y-3 rounded-xl border border-dashed border-border/40">
                  <Wallet className="w-10 h-10 text-muted-foreground/20 mx-auto" />
                  <p className="font-mono text-muted-foreground">Connect your wallet to view activity</p>
                  <button onClick={connect} disabled={connecting} className="mt-2 px-5 py-2 bg-[hsl(var(--peptoma-cyan))] text-black font-mono text-xs font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
                    {connecting ? "Connecting…" : "Connect Wallet"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── TEAMS TAB ── */}
          {tab === "teams" && (
            <TeamsTab walletAddress={userId} />
          )}

          {tab === "api-keys" && (
            <div className="space-y-4">
              {/* How-to steps */}
              <div className="rounded-xl border border-[hsl(var(--peptoma-cyan))/20] bg-[hsl(var(--peptoma-cyan))/4] p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-[hsl(var(--peptoma-cyan))]" />
                  <span className="text-xs font-mono text-[hsl(var(--peptoma-cyan))] tracking-widest uppercase">How to get your API key</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { step: "01", title: "Get $PEPTOMA token", desc: "Buy on pump.fun or a Solana DEX." },
                    { step: "02", title: "Stake ≥ 2,000 $PEPTOMA", desc: "Go to Staking tab → stake to reach PRO tier. LAB needs ≥ 10,000." },
                    { step: "03", title: "Generate key below", desc: "Connect wallet → Generate. Save the key — shown only once." },
                  ].map(({ step, title, desc }) => (
                    <div key={step} className="flex items-start gap-3">
                      <span className="text-2xl font-bold font-mono text-[hsl(var(--peptoma-cyan))/30] leading-none mt-0.5 w-8 shrink-0">{step}</span>
                      <div>
                        <p className="text-xs font-mono font-bold text-foreground">{title}</p>
                        <p className="text-[11px] font-mono text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-[hsl(var(--peptoma-cyan))/15] space-y-1.5">
                  <p className="text-[10px] font-mono text-muted-foreground"><span className="text-foreground font-bold">CLI shortcut:</span></p>
                  <code className="block text-[11px] font-mono text-[hsl(var(--peptoma-cyan))] bg-background/60 border border-border rounded px-3 py-2">
                    npx peptoma-mcp --generate-key --wallet &lt;your_solana_address&gt;
                  </code>
                </div>
              </div>

              {connected ? (
                <ApiKeyPanel walletAddress={userId} stakingTier={stakingTier} />
              ) : (
                <div className="rounded-xl border border-border bg-card/60 p-8 text-center space-y-3">
                  <Key className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                  <p className="font-mono text-sm text-muted-foreground">Connect your wallet to manage API keys</p>
                  <button onClick={connect} className="mt-2 px-5 py-2 bg-[hsl(var(--peptoma-cyan))] text-black font-mono text-xs font-bold rounded-lg hover:opacity-90 transition-opacity">
                    Connect Wallet
                  </button>
                </div>
              )}
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
