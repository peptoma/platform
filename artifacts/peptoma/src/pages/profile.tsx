import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { motion } from "framer-motion";
import { User, Dna, MessageSquare, Vote, Coins, Award, ArrowLeft, ExternalLink, TrendingUp, Activity, Shield, CheckCircle, AlertTriangle, Plus, Tag, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL;

interface ProfileData {
  wallet: string;
  username: string | null;
  stakingTier: string;
  balance: number;
  stakedAmount: number;
  earnedTotal: number;
  solanaAddress: string;
  totalSequences: number;
  completedSequences: number;
  avgBioactivityScore: number;
  totalVotesReceived: number;
  totalAnnotationsReceived: number;
  totalAnnotationsMade: number;
  totalGovernanceVotes: number;
  annotationBreakdown: Array<{ type: string; count: number; earned: number }>;
  recentSequences: Array<{
    id: number; sequence: string; diseaseTarget?: string | null;
    bioactivityLabel?: string | null; bioactivityScore: number;
    structurePrediction?: string | null; toxicityRisk?: string | null;
    voteCount: number; annotationCount: number; status: string;
    createdAt: string; depth: string;
  }>;
  recentAnnotations: Array<{
    id: number; sequenceId: number; type: string;
    content?: string | null; score: number; tokensEarned: number;
    createdAt: string;
  }>;
}

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  free:       { label: "FREE",       color: "text-muted-foreground",                     bg: "bg-muted/20",                      border: "border-border" },
  researcher: { label: "RESEARCHER", color: "text-[hsl(var(--peptoma-cyan))]",           bg: "bg-[hsl(var(--peptoma-cyan))/8]",  border: "border-[hsl(var(--peptoma-cyan))/30]" },
  pro:        { label: "PRO",        color: "text-[hsl(var(--peptoma-gold))]",           bg: "bg-[hsl(var(--peptoma-gold))/8]",  border: "border-[hsl(var(--peptoma-gold))/30]" },
  lab:        { label: "LAB",        color: "text-purple-400",                            bg: "bg-purple-400/8",                  border: "border-purple-400/30" },
};

const ANNOTATION_ICON: Record<string, React.ElementType> = {
  confirm: CheckCircle, challenge: AlertTriangle, extend: Plus, tag: Tag,
};
const ANNOTATION_COLOR: Record<string, string> = {
  confirm: "text-[hsl(var(--peptoma-green))]",
  challenge: "text-red-400",
  extend: "text-[hsl(var(--peptoma-cyan))]",
  tag: "text-[hsl(var(--peptoma-gold))]",
};

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <button onClick={handleCopy} className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors">
      {copied ? <Check className="w-3 h-3 text-[hsl(var(--peptoma-green))]" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied!" : label}
    </button>
  );
}

function StatCard({ label, value, icon: Icon, color = "text-foreground" }: {
  label: string; value: string | number; icon: React.ElementType; color?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">{label}</span>
        <Icon className={cn("w-3.5 h-3.5", color)} />
      </div>
      <div className={cn("text-2xl font-bold font-mono", color)}>{value}</div>
    </div>
  );
}

export default function Profile() {
  const { wallet } = useParams<{ wallet: string }>();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!wallet) return;
    setLoading(true);
    setNotFound(false);
    fetch(`${BASE}api/profile/${encodeURIComponent(wallet)}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then(data => { if (data) setProfile(data); })
      .finally(() => setLoading(false));
  }, [wallet]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-card/40 rounded-xl border border-border animate-pulse" />)}
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="py-20 text-center space-y-4">
        <User className="w-12 h-12 text-muted-foreground/30 mx-auto" />
        <p className="font-mono text-muted-foreground">Researcher not found</p>
        <p className="text-[11px] font-mono text-muted-foreground/60">{wallet}</p>
        <Link href="/feed" className="text-xs font-mono text-[hsl(var(--peptoma-cyan))] hover:underline block">Back to Feed</Link>
      </div>
    );
  }

  const tier = TIER_CONFIG[profile.stakingTier] ?? TIER_CONFIG.free;
  const displayName = profile.username ?? `${profile.wallet.slice(0, 6)}…${profile.wallet.slice(-4)}`;
  const totalAnnotationsEarned = profile.annotationBreakdown.reduce((s, a) => s + a.earned, 0);

  return (
    <div className="space-y-8 pb-16 max-w-4xl">
      {/* Back */}
      <Link href="/feed" className="flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" /> Back to Feed
      </Link>

      {/* Profile header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card/60 p-6 space-y-4">
        <div className="flex items-start gap-5">
          {/* Avatar placeholder */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(var(--peptoma-cyan))/20] to-[hsl(var(--peptoma-cyan))/5] border border-[hsl(var(--peptoma-cyan))/20] flex items-center justify-center shrink-0">
            <User className="w-8 h-8 text-[hsl(var(--peptoma-cyan))/60]" />
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-bold text-xl tracking-tight font-mono">{displayName}</h1>
              <span className={cn("text-[10px] font-mono px-2 py-0.5 rounded border font-bold uppercase tracking-wider", tier.color, tier.bg, tier.border)}>
                {tier.label}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
              <span className="truncate max-w-[220px]">{profile.wallet}</span>
              <CopyButton text={profile.wallet} />
            </div>
            <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground">
              <a href={`https://solscan.io/account/${profile.solanaAddress}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-[hsl(var(--peptoma-cyan))] transition-colors">
                <ExternalLink className="w-3 h-3" /> Solscan
              </a>
              <a href={`https://pump.fun/coin/HopMHHPfSV2kWQLghKt6xR1oWbPRLA2UyxnKGoPpump`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-[hsl(var(--peptoma-cyan))] transition-colors">
                <ExternalLink className="w-3 h-3" /> $PEPTM on pump.fun
              </a>
            </div>
          </div>

          {/* Token balance */}
          <div className="text-right shrink-0 hidden sm:block">
            <p className="text-2xl font-bold font-mono text-[hsl(var(--peptoma-cyan))]">{profile.balance.toLocaleString()}</p>
            <p className="text-[10px] font-mono text-muted-foreground">$PEPTM balance</p>
            {profile.stakedAmount > 0 && (
              <p className="text-[10px] font-mono text-muted-foreground/60">{profile.stakedAmount.toLocaleString()} staked</p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Sequences" value={profile.completedSequences} icon={Dna} color="text-[hsl(var(--peptoma-cyan))]" />
        <StatCard label="Annotations" value={profile.totalAnnotationsMade} icon={MessageSquare} color="text-[hsl(var(--peptoma-gold))]" />
        <StatCard label="Tokens Earned" value={profile.earnedTotal.toLocaleString()} icon={Coins} color="text-[hsl(var(--peptoma-green))]" />
        <StatCard label="Gov. Votes" value={profile.totalGovernanceVotes} icon={Vote} color="text-foreground" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Avg. Score" value={profile.avgBioactivityScore ? `${profile.avgBioactivityScore}/100` : "—"} icon={TrendingUp} color="text-foreground" />
        <StatCard label="Votes Received" value={profile.totalVotesReceived} icon={Activity} color="text-muted-foreground" />
        <StatCard label="Peer Reviews" value={profile.totalAnnotationsReceived} icon={Shield} color="text-muted-foreground" />
        <StatCard label="Tier" value={tier.label} icon={Award} color={tier.color} />
      </div>

      {/* Annotation breakdown */}
      {profile.annotationBreakdown.length > 0 && (
        <div className="rounded-xl border border-border bg-card/60 p-5 space-y-4">
          <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Annotation Breakdown</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {profile.annotationBreakdown.map(a => {
              const Icon = ANNOTATION_ICON[a.type] ?? MessageSquare;
              return (
                <div key={a.type} className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Icon className={cn("w-3.5 h-3.5", ANNOTATION_COLOR[a.type])} />
                    <span className={cn("text-[10px] font-mono font-bold uppercase", ANNOTATION_COLOR[a.type])}>{a.type}</span>
                  </div>
                  <p className="text-xl font-bold font-mono text-foreground">{a.count}</p>
                  <p className="text-[10px] font-mono text-muted-foreground">+{a.earned} $PEPTM earned</p>
                </div>
              );
            })}
          </div>
          <div className="pt-3 border-t border-border/60 text-[11px] font-mono text-muted-foreground">
            Total from annotations: <span className="text-[hsl(var(--peptoma-gold))] font-bold">+{totalAnnotationsEarned} $PEPTM</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent sequences */}
        {profile.recentSequences.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase flex items-center gap-2">
              <Dna className="w-3.5 h-3.5 text-[hsl(var(--peptoma-cyan))]" /> Recent Analyses
            </p>
            <div className="space-y-2">
              {profile.recentSequences.map(s => (
                <Link key={s.id} href={`/annotate/${s.id}`}>
                  <motion.div whileHover={{ x: 2 }}
                    className="rounded-xl border border-border bg-card/40 hover:border-[hsl(var(--peptoma-cyan))/30] hover:bg-card/60 transition-all p-3 cursor-pointer group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-xs text-foreground truncate tracking-widest">
                          {s.sequence.slice(0, 22)}{s.sequence.length > 22 ? "…" : ""}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {s.bioactivityLabel && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-[hsl(var(--peptoma-cyan))/25] text-[hsl(var(--peptoma-cyan))] bg-[hsl(var(--peptoma-cyan))/8] uppercase">
                              {s.bioactivityLabel}
                            </span>
                          )}
                          {s.diseaseTarget && (
                            <span className="text-[9px] font-mono text-muted-foreground truncate">{s.diseaseTarget}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={cn("text-sm font-bold font-mono",
                          s.bioactivityScore >= 75 ? "text-[hsl(var(--peptoma-cyan))]" :
                          s.bioactivityScore >= 50 ? "text-[hsl(var(--peptoma-gold))]" : "text-muted-foreground"
                        )}>{s.bioactivityScore}</p>
                        <p className="text-[9px] font-mono text-muted-foreground">{s.annotationCount} ann.</p>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recent annotations */}
        {profile.recentAnnotations.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-[hsl(var(--peptoma-gold))]" /> Recent Annotations
            </p>
            <div className="space-y-2">
              {profile.recentAnnotations.map(a => {
                const Icon = ANNOTATION_ICON[a.type] ?? MessageSquare;
                return (
                  <Link key={a.id} href={`/annotate/${a.sequenceId}`}>
                    <motion.div whileHover={{ x: 2 }}
                      className="rounded-xl border border-border bg-card/40 hover:border-[hsl(var(--peptoma-gold))/20] hover:bg-card/60 transition-all p-3 cursor-pointer group">
                      <div className="flex items-start gap-2">
                        <Icon className={cn("w-3.5 h-3.5 shrink-0 mt-0.5", ANNOTATION_COLOR[a.type])} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={cn("text-[9px] font-mono font-bold uppercase", ANNOTATION_COLOR[a.type])}>{a.type}</span>
                            <span className="text-[9px] font-mono text-muted-foreground">seq #{a.sequenceId}</span>
                            <span className="text-[9px] font-mono text-[hsl(var(--peptoma-gold))] ml-auto">+{a.tokensEarned} $PEPTM</span>
                          </div>
                          {a.content && (
                            <p className="text-[11px] font-mono text-muted-foreground line-clamp-2 leading-relaxed">{a.content}</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Empty state for new researchers */}
      {profile.totalSequences === 0 && profile.totalAnnotationsMade === 0 && (
        <div className="py-12 text-center space-y-3">
          <Dna className="w-10 h-10 text-muted-foreground/30 mx-auto" />
          <p className="font-mono text-muted-foreground">No research activity yet</p>
          <Link href="/lab">
            <span className="text-xs font-mono text-[hsl(var(--peptoma-cyan))] hover:underline cursor-pointer">Start analyzing peptides →</span>
          </Link>
        </div>
      )}
    </div>
  );
}
