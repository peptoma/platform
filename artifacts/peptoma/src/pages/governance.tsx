import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Vote, CheckCircle, XCircle, Clock, Zap, Users, Shield, Award, ChevronRight, AlertCircle, Plus, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWallet } from "@/contexts/wallet-context";
import { Link } from "wouter";

const BASE = import.meta.env.BASE_URL;

interface Proposal {
  id: number;
  title: string;
  description: string;
  category: string;
  status: string;
  yesVotes: number;
  noVotes: number;
  yesCount: number;
  noCount: number;
  quorum: number;
  totalWeight: number;
  yesPct: number;
  quorumReached: boolean;
  isExpired: boolean;
  endsAt: string;
  createdAt: string;
  userVote: string | null;
  authorWallet?: string | null;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  reward_rate:      { label: "Reward Rate",      color: "text-[hsl(var(--peptoma-gold))] border-[hsl(var(--peptoma-gold))/30] bg-[hsl(var(--peptoma-gold))/8]" },
  tier_requirement: { label: "Tier Requirement", color: "text-[hsl(var(--peptoma-cyan))] border-[hsl(var(--peptoma-cyan))/30] bg-[hsl(var(--peptoma-cyan))/8]" },
  scoring:          { label: "Scoring",           color: "text-purple-400 border-purple-400/30 bg-purple-400/8" },
  policy:           { label: "Policy",            color: "text-muted-foreground border-border bg-muted/20" },
  other:            { label: "Other",             color: "text-muted-foreground border-border bg-muted/20" },
};

const CATEGORY_OPTIONS = [
  { value: "reward_rate",      label: "Reward Rate" },
  { value: "tier_requirement", label: "Tier Requirement" },
  { value: "scoring",          label: "Scoring" },
  { value: "policy",           label: "Policy" },
  { value: "other",            label: "Other" },
];

function useCountdown(endsAt: string) {
  const [str, setStr] = useState("");
  useEffect(() => {
    const update = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) { setStr("Ended"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setStr(d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`);
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [endsAt]);
  return str;
}

function ProposalCard({ proposal, onVote, voting }: {
  proposal: Proposal;
  onVote: (id: number, vote: "yes" | "no") => void;
  voting: boolean;
}) {
  const countdown = useCountdown(proposal.endsAt);
  const cat = CATEGORY_LABELS[proposal.category] ?? CATEGORY_LABELS.other;
  const canVote = proposal.status === "active" && !proposal.isExpired && !proposal.userVote;
  const total = proposal.yesCount + proposal.noCount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border bg-card/60 overflow-hidden",
        proposal.status === "passed" ? "border-[hsl(var(--peptoma-cyan))/30]" : "border-border"
      )}
    >
      <div className="px-5 py-4 border-b border-border/60 flex items-start gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("text-[10px] font-mono px-2 py-0.5 rounded border uppercase tracking-wider", cat.color)}>
              {cat.label}
            </span>
            {proposal.status === "passed" && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[hsl(var(--peptoma-cyan))/30] text-[hsl(var(--peptoma-cyan))] bg-[hsl(var(--peptoma-cyan))/8] uppercase">✓ Passed</span>
            )}
            {proposal.status === "failed" && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-red-500/30 text-red-400 bg-red-500/8 uppercase">✗ Failed</span>
            )}
            {proposal.status === "active" && !proposal.isExpired && (
              <span className="flex items-center gap-1 text-[10px] font-mono text-[hsl(var(--peptoma-green))]">
                <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--peptoma-green))] animate-pulse" />
                LIVE
              </span>
            )}
            {proposal.authorWallet && (
              <span className="text-[9px] font-mono text-muted-foreground/60 ml-auto">
                by {proposal.authorWallet.slice(0, 6)}…{proposal.authorWallet.slice(-4)}
              </span>
            )}
          </div>
          <h3 className="font-mono font-bold text-sm text-foreground leading-snug">{proposal.title}</h3>
          <p className="text-[11px] font-mono text-muted-foreground leading-relaxed">{proposal.description}</p>
        </div>
      </div>

      <div className="px-5 py-3 space-y-2">
        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className="text-[hsl(var(--peptoma-cyan))] font-bold">YES {proposal.yesPct}%</span>
          <span className="text-muted-foreground">{total} voters · {proposal.totalWeight.toLocaleString(undefined, { maximumFractionDigits: 0 })} weighted pts</span>
          <span className="text-red-400 font-bold">NO {100 - proposal.yesPct}%</span>
        </div>
        <div className="h-2.5 bg-red-500/15 rounded-full overflow-hidden">
          <motion.div className="h-full bg-[hsl(var(--peptoma-cyan))] rounded-full"
            initial={{ width: 0 }} animate={{ width: `${proposal.yesPct}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
          <span>
            Quorum: {proposal.totalWeight.toLocaleString(undefined, { maximumFractionDigits: 0 })} / {proposal.quorum.toLocaleString()} pts
            {proposal.quorumReached && <span className="text-[hsl(var(--peptoma-green))] ml-1">✓ reached</span>}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {proposal.isExpired ? "Voting ended" : `Ends in ${countdown}`}
          </span>
        </div>
      </div>

      <div className="px-5 pb-4 pt-1">
        {proposal.userVote ? (
          <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-mono font-bold w-fit",
            proposal.userVote === "yes"
              ? "border-[hsl(var(--peptoma-cyan))/40] text-[hsl(var(--peptoma-cyan))] bg-[hsl(var(--peptoma-cyan))/8]"
              : "border-red-500/40 text-red-400 bg-red-500/8")}>
            {proposal.userVote === "yes"
              ? <><CheckCircle className="w-3.5 h-3.5" /> You voted YES</>
              : <><XCircle className="w-3.5 h-3.5" /> You voted NO</>}
          </div>
        ) : canVote ? (
          <div className="flex gap-2">
            <button onClick={() => onVote(proposal.id, "yes")} disabled={voting}
              className="flex items-center gap-1.5 px-4 py-2 bg-[hsl(var(--peptoma-cyan))] text-black font-mono text-xs font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
              <CheckCircle className="w-3.5 h-3.5" /> Vote YES
            </button>
            <button onClick={() => onVote(proposal.id, "no")} disabled={voting}
              className="flex items-center gap-1.5 px-4 py-2 border border-red-500/40 text-red-400 font-mono text-xs font-bold rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-50">
              <XCircle className="w-3.5 h-3.5" /> Vote NO
            </button>
          </div>
        ) : !proposal.isExpired && proposal.status === "active" ? (
          <p className="text-[11px] font-mono text-muted-foreground">Connect wallet to vote</p>
        ) : null}
      </div>
    </motion.div>
  );
}

// ── Submit Proposal Modal ────────────────────────────────────────────────────
function SubmitProposalModal({ onClose, onSuccess, walletAddress }: {
  onClose: () => void;
  onSuccess: () => void;
  walletAddress: string;
}) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "other" as string,
    durationDays: 7,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.title.trim().length < 10) { setError("Title must be at least 10 characters"); return; }
    if (form.description.trim().length < 30) { setError("Description must be at least 30 characters"); return; }

    setSubmitting(true);
    try {
      const r = await fetch(`${BASE}api/governance/proposals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, authorWallet: walletAddress }),
      });
      const data = await r.json();
      if (r.ok) {
        onSuccess();
        onClose();
      } else {
        setError(data.error ?? "Failed to submit proposal");
      }
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[hsl(var(--peptoma-cyan))]" />
            <span className="font-mono font-bold text-sm">Submit Proposal</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">Proposal Title</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Increase Extend Reward from +5 to +7 pts"
              maxLength={200}
              className="w-full px-3 py-2.5 bg-background border border-border rounded-lg font-mono text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[hsl(var(--peptoma-cyan))/50] transition-colors"
            />
            <div className="flex justify-between">
              <span className="text-[10px] font-mono text-muted-foreground">Min 10 characters</span>
              <span className="text-[10px] font-mono text-muted-foreground">{form.title.length}/200</span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Explain the rationale, expected impact, and any relevant data supporting this proposal..."
              rows={5}
              maxLength={2000}
              className="w-full px-3 py-2.5 bg-background border border-border rounded-lg font-mono text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[hsl(var(--peptoma-cyan))/50] transition-colors resize-none"
            />
            <div className="flex justify-between">
              <span className="text-[10px] font-mono text-muted-foreground">Min 30 characters</span>
              <span className="text-[10px] font-mono text-muted-foreground">{form.description.length}/2000</span>
            </div>
          </div>

          {/* Category + Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg font-mono text-sm text-foreground focus:outline-none focus:border-[hsl(var(--peptoma-cyan))/50] transition-colors"
              >
                {CATEGORY_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">Voting Duration</label>
              <select
                value={form.durationDays}
                onChange={e => setForm(f => ({ ...f, durationDays: Number(e.target.value) }))}
                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg font-mono text-sm text-foreground focus:outline-none focus:border-[hsl(var(--peptoma-cyan))/50] transition-colors"
              >
                <option value={3}>3 days</option>
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
              </select>
            </div>
          </div>

          {/* Author info */}
          <div className="px-3 py-2.5 bg-muted/20 rounded-lg border border-border flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground">Submitting as:</span>
            <span className="text-[10px] font-mono text-[hsl(var(--peptoma-cyan))]">
              {walletAddress.slice(0, 8)}…{walletAddress.slice(-6)}
            </span>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-xs font-mono text-red-400">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-[hsl(var(--peptoma-cyan))] text-black font-mono text-sm font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <span className="animate-pulse">Submitting…</span>
            ) : (
              <><Plus className="w-4 h-4" /> Submit Proposal</>
            )}
          </button>

          <p className="text-[10px] font-mono text-muted-foreground/60 text-center">
            Proposals require 10,000 weighted pts quorum to pass. Voting weight scales with staked $PEPTM.
          </p>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Main Governance Page ─────────────────────────────────────────────────────
export default function Governance() {
  const { connected, userId } = useWallet();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "passed" | "failed">("all");
  const [showSubmit, setShowSubmit] = useState(false);
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchProposals = async () => {
    const url = `${BASE}api/governance/proposals${connected && userId ? `?wallet=${encodeURIComponent(userId)}` : ""}`;
    const r = await fetch(url);
    if (r.ok) setProposals(await r.json());
    setLoading(false);
  };

  useEffect(() => { fetchProposals(); }, [connected, userId]);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 3500);
  };

  const handleVote = async (proposalId: number, vote: "yes" | "no") => {
    if (!connected || !userId) { showToast("Connect your wallet to vote", false); return; }
    setVoting(proposalId);
    try {
      const r = await fetch(`${BASE}api/governance/proposals/${proposalId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: userId, vote }),
      });
      const data = await r.json();
      if (r.ok) {
        showToast(`Vote recorded — weight: ${data.weight.toFixed(1)} pts (${data.tier.toUpperCase()} tier)`, true);
        await fetchProposals();
      } else {
        showToast(data.error ?? "Vote failed", false);
      }
    } finally {
      setVoting(null);
    }
  };

  const filtered = proposals.filter(p => filter === "all" ? true : p.status === filter);
  const active = proposals.filter(p => p.status === "active" && !p.isExpired).length;
  const totalVoters = proposals.reduce((s, p) => s + p.yesCount + p.noCount, 0);

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-1 tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--peptoma-cyan))] animate-pulse" />
            Governance
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Protocol Voting</h1>
          <p className="text-muted-foreground mt-1 font-mono text-sm">
            $PEPTM holders vote on protocol changes. Voting power is weighted by staked amount — LAB tier counts 3×.
          </p>
        </div>
        {connected && userId && (
          <button
            onClick={() => setShowSubmit(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[hsl(var(--peptoma-cyan))] text-black font-mono text-xs font-bold rounded-lg hover:opacity-90 transition-opacity shrink-0 mt-1"
          >
            <Plus className="w-3.5 h-3.5" />
            New Proposal
          </button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Active Proposals", value: active, icon: Vote, color: "text-[hsl(var(--peptoma-cyan))]" },
          { label: "Total Proposals",  value: proposals.length, icon: Shield, color: "text-foreground" },
          { label: "Total Votes Cast", value: totalVoters, icon: Users, color: "text-[hsl(var(--peptoma-gold))]" },
          { label: "Your Tier", value: connected ? "Connected" : "No wallet", icon: Award, color: connected ? "text-[hsl(var(--peptoma-green))]" : "text-muted-foreground" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-border bg-card/60 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">{label}</span>
              <Icon className={cn("w-3.5 h-3.5", color)} />
            </div>
            <div className={cn("text-2xl font-bold font-mono", color)}>{value}</div>
          </div>
        ))}
      </div>

      {/* Voting weight explainer */}
      <div className="rounded-xl border border-[hsl(var(--peptoma-cyan))/20] bg-[hsl(var(--peptoma-cyan))/4] p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[hsl(var(--peptoma-cyan))]" />
          <span className="text-xs font-mono text-[hsl(var(--peptoma-cyan))] tracking-widest uppercase font-bold">Voting Power</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { tier: "FREE",       stake: "0 $PEPTM",       weight: "1× weight" },
            { tier: "RESEARCHER", stake: "≥500 $PEPTM",    weight: "1.5× weight" },
            { tier: "PRO",        stake: "≥2,000 $PEPTM",  weight: "2× weight" },
            { tier: "LAB",        stake: "≥10,000 $PEPTM", weight: "3× weight" },
          ].map(({ tier, stake, weight }) => (
            <div key={tier} className="space-y-0.5">
              <p className="text-[10px] font-mono font-bold text-foreground">{tier}</p>
              <p className="text-[10px] font-mono text-muted-foreground">{stake}</p>
              <p className="text-[10px] font-mono text-[hsl(var(--peptoma-cyan))]">{weight}</p>
            </div>
          ))}
        </div>
        {!connected ? (
          <Link href="/missions">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[hsl(var(--peptoma-cyan))] hover:underline cursor-pointer">
              Connect wallet to vote & propose <ChevronRight className="w-3 h-3" />
            </div>
          </Link>
        ) : (
          <button onClick={() => setShowSubmit(true)} className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[hsl(var(--peptoma-cyan))] hover:underline">
            <Plus className="w-3 h-3" /> Submit a new proposal
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5">
        {(["all", "active", "passed", "failed"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn("px-3 py-1.5 rounded-lg font-mono text-xs transition-all border",
              filter === f
                ? "border-[hsl(var(--peptoma-cyan))/40] bg-[hsl(var(--peptoma-cyan))/10] text-[hsl(var(--peptoma-cyan))]"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === "active" && active > 0 && (
              <span className="ml-1.5 text-[9px] bg-[hsl(var(--peptoma-cyan))] text-black px-1 py-0.5 rounded-sm font-bold">{active}</span>
            )}
          </button>
        ))}
      </div>

      {/* Proposal list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-48 bg-card/40 rounded-xl border border-border animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center space-y-3">
          <Vote className="w-10 h-10 text-muted-foreground/30 mx-auto" />
          <p className="font-mono text-muted-foreground">No {filter !== "all" ? filter : ""} proposals</p>
          {connected && (
            <button onClick={() => setShowSubmit(true)}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-[hsl(var(--peptoma-cyan))] hover:underline">
              <Plus className="w-3 h-3" /> Submit the first proposal
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(p => (
            <ProposalCard key={p.id} proposal={p} onVote={handleVote} voting={voting === p.id} />
          ))}
        </div>
      )}

      {/* Submit Proposal Modal */}
      <AnimatePresence>
        {showSubmit && connected && userId && (
          <SubmitProposalModal
            walletAddress={userId}
            onClose={() => setShowSubmit(false)}
            onSuccess={() => { showToast("Proposal submitted successfully!", true); fetchProposals(); }}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={cn(
              "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-xl border shadow-xl font-mono text-sm",
              toast.ok
                ? "border-[hsl(var(--peptoma-cyan))/40] bg-card text-[hsl(var(--peptoma-cyan))]"
                : "border-red-500/40 bg-card text-red-400"
            )}
          >
            {toast.ok ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
