import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Clock, Zap, FlaskConical, MessageSquare, Star, Users, RefreshCw, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EventInfo {
  id: string;
  name: string;
  season: string;
  description: string;
  startAt: string;
  endAt: string;
  status: "upcoming" | "active" | "ended";
  prizePool: number;
  distribution: string;
  scoring: { perRun: number; perAnnotation: number; perTokenEarned: number };
  updatedAt: string;
}

interface EventEntry {
  rank: number;
  userId: string;
  username: string;
  totalRuns: number;
  totalAnnotations: number;
  totalTokensEarned: number;
  combinedScore: number;
  estimatedReward: number;
  sharePercent: number;
}

interface LeaderboardResponse {
  leaderboard: EventEntry[];
  totalParticipants: number;
  totalScore: number;
  updatedAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2).replace(/\.?0+$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.?0+$/, "") + "K";
  return n.toLocaleString();
}

function fmtFull(n: number) { return n.toLocaleString(); }

function timeAgo(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 5)  return "just now";
  if (secs < 60) return `${secs}s ago`;
  return `${Math.floor(secs / 60)}m ago`;
}

function useCountdown(targetIso: string | undefined) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!targetIso) return;
    const tick = () => setRemaining(Math.max(0, new Date(targetIso).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);
  const s = Math.floor(remaining / 1000);
  return {
    days:    Math.floor(s / 86400),
    hours:   Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    done:    remaining === 0,
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 min-w-[3.5rem]">
      <div className="font-mono font-bold text-3xl sm:text-4xl text-[hsl(var(--peptoma-cyan))] tabular-nums text-center">
        {String(value).padStart(2, "0")}
      </div>
      <div className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">{label}</div>
    </div>
  );
}

function ScoreBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
      <div
        className="h-full bg-[hsl(var(--peptoma-cyan))] rounded-full"
        style={{ width: `${pct}%`, transition: "width 0.6s ease" }}
      />
    </div>
  );
}

function RankDisplay({ rank }: { rank: number }) {
  if (rank === 1) return <span className="font-mono text-sm text-yellow-400 font-bold">#1</span>;
  if (rank === 2) return <span className="font-mono text-sm text-zinc-300 font-bold">#2</span>;
  if (rank === 3) return <span className="font-mono text-sm text-orange-400 font-bold">#3</span>;
  return <span className="font-mono text-xs text-muted-foreground">#{rank}</span>;
}

function LiveDot() {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--peptoma-cyan))] animate-pulse" />
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Events() {
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const { data: event, isLoading: eventLoading } = useQuery<EventInfo>({
    queryKey: ["events", "current"],
    queryFn: async () => {
      const r = await fetch("/api/events/current");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    refetchInterval: 30_000,
  });

  const { data: boardData, isLoading: boardLoading, dataUpdatedAt } = useQuery<LeaderboardResponse>({
    queryKey: ["events", "leaderboard"],
    queryFn: async () => {
      const r = await fetch("/api/events/leaderboard");
      if (!r.ok) throw new Error("Failed");
      const data = await r.json();
      setLastUpdated(new Date().toISOString());
      return data;
    },
    refetchInterval: 10_000,
  });

  const board = boardData?.leaderboard ?? [];
  const totalParticipants = boardData?.totalParticipants ?? 0;
  const totalScore = boardData?.totalScore ?? 0;
  const maxScore = board[0]?.combinedScore ?? 1;
  const countdown = useCountdown(event?.status === "active" ? event.endAt : event?.startAt);

  const statusMeta = {
    active:   { label: "● LIVE", cls: "bg-[hsl(var(--peptoma-cyan))/10] text-[hsl(var(--peptoma-cyan))] border-[hsl(var(--peptoma-cyan))/30]" },
    upcoming: { label: "Upcoming", cls: "bg-yellow-400/10 text-yellow-400 border-yellow-400/30" },
    ended:    { label: "Ended", cls: "bg-muted text-muted-foreground border-border" },
  };
  const sm = event ? statusMeta[event.status] : null;

  return (
    <div className="space-y-6 pb-16">

      {/* ── Hero card ── */}
      <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-6 sm:p-8 space-y-5">

        {/* badges */}
        <div className="flex flex-wrap items-center gap-2">
          {sm && (
            <span className={cn("text-[10px] font-mono tracking-widest uppercase px-2.5 py-1 rounded-sm border", sm.cls)}>
              {sm.label}
            </span>
          )}
          <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase border border-border px-2.5 py-1 rounded-sm">
            {event?.season ?? "Season 1"}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase border border-border px-2.5 py-1 rounded-sm">
            Proportional Distribution
          </span>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
            <Trophy className="w-7 h-7 text-yellow-400 shrink-0" />
            {eventLoading ? "Loading…" : (event?.name ?? "Top Contributor Challenge")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl leading-relaxed">
            {event?.description}
          </p>
        </div>

        {/* Prize pool */}
        <div className="flex flex-wrap gap-3">
          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-yellow-400/30 bg-yellow-400/5">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="font-mono font-bold text-yellow-400 text-xl">{fmt(event?.prizePool ?? 20_000_000)}</span>
            <span className="font-mono text-yellow-400/70 text-sm">$PEPTM prize pool</span>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-muted/20">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="font-mono text-sm">
              <span className="font-bold text-foreground">{totalParticipants}</span>
              <span className="text-muted-foreground ml-1">contributors</span>
            </span>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-muted/20">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <span className="font-mono text-sm">
              <span className="font-bold text-foreground">{fmt(totalScore)}</span>
              <span className="text-muted-foreground ml-1">total pts</span>
            </span>
          </div>
        </div>

        {/* Countdown */}
        {event && (
          <div>
            <div className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase mb-3 flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              {event.status === "active" ? "Event ends in" : event.status === "upcoming" ? "Event starts in" : "Event has ended"}
            </div>
            {event.status !== "ended" && !countdown.done ? (
              <div className="flex items-center gap-3 sm:gap-5">
                <CountdownUnit value={countdown.days}    label="Days"    />
                <span className="text-2xl font-mono text-muted-foreground/30 pb-4">:</span>
                <CountdownUnit value={countdown.hours}   label="Hours"   />
                <span className="text-2xl font-mono text-muted-foreground/30 pb-4">:</span>
                <CountdownUnit value={countdown.minutes} label="Mins"    />
                <span className="text-2xl font-mono text-muted-foreground/30 pb-4">:</span>
                <CountdownUnit value={countdown.seconds} label="Secs"    />
              </div>
            ) : (
              <p className="font-mono text-sm text-muted-foreground">—</p>
            )}
          </div>
        )}
      </div>

      {/* ── Scoring rules ── */}
      <div className="rounded-xl border border-border bg-card/60 p-5 sm:p-6 space-y-4">
        <h2 className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase flex items-center gap-1.5">
          <Star className="w-3 h-3" /> Scoring & Distribution
        </h2>
        <p className="text-xs text-muted-foreground font-mono leading-relaxed">
          Your <span className="text-foreground font-bold">Combined Score</span> = (Runs × {event?.scoring.perRun ?? 10}) + (Annotations × {event?.scoring.perAnnotation ?? 15}).
          {" "}Only activity <span className="text-foreground font-bold">during the event window</span> counts.
          Prize pool is split among <span className="text-foreground font-bold">all participants</span> proportionally to their score.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { icon: FlaskConical,  label: "Lab Run",    desc: "Submit a peptide sequence for analysis", pts: `+${event?.scoring.perRun ?? 10} pts per run`     },
            { icon: MessageSquare, label: "Annotation", desc: "Confirm, challenge, extend, or tag",     pts: `+${event?.scoring.perAnnotation ?? 15} pts each` },
          ].map(({ icon: Icon, label, desc, pts }) => (
            <div key={label} className="rounded-lg border border-border bg-background/40 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-[hsl(var(--peptoma-cyan))]" />
                  <span className="text-xs font-mono font-semibold">{label}</span>
                </div>
                <span className="text-[11px] font-mono text-[hsl(var(--peptoma-cyan))] font-bold">{pts}</span>
              </div>
              <p className="text-[11px] text-muted-foreground font-mono">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Live leaderboard ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase flex items-center gap-2">
            <LiveDot /> Live Leaderboard
          </h2>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/50">
            <RefreshCw className="w-3 h-3" />
            {lastUpdated ? timeAgo(lastUpdated) : "—"}
          </div>
        </div>

        {boardLoading ? (
          <div className="rounded-xl border border-border bg-card/60 p-10 text-center font-mono text-sm text-muted-foreground animate-pulse">
            Loading…
          </div>

        ) : board.length === 0 ? (
          /* Empty state — event just started, no activity yet */
          <div className="rounded-xl border border-border bg-card/60 p-10 sm:p-14 text-center space-y-4">
            <Trophy className="w-10 h-10 text-yellow-400/30 mx-auto" />
            <div className="space-y-1">
              <p className="font-mono font-semibold text-sm">No contributors yet</p>
              <p className="font-mono text-xs text-muted-foreground">
                The event just started — be the first to submit a sequence or annotate a discovery.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-yellow-400/30 bg-yellow-400/5 text-xs font-mono text-yellow-400">
              <Trophy className="w-3.5 h-3.5" />
              First contributor claims the top spot and leads the prize share
            </div>
          </div>

        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            {/* Header */}
            <div className="grid items-center gap-2 px-4 py-2.5 bg-muted/30 border-b border-border text-[10px] font-mono text-muted-foreground tracking-widest uppercase"
              style={{ gridTemplateColumns: "3rem 1fr 5rem 5rem 5rem 6rem 7rem" }}>
              <div className="text-center">Rank</div>
              <div>Contributor</div>
              <div className="text-right hidden md:block">Runs</div>
              <div className="text-right hidden md:block">Annots</div>
              <div className="text-right hidden lg:block">Score</div>
              <div className="text-right hidden sm:block">Share</div>
              <div className="text-right">Est. Reward</div>
            </div>

            {board.map((entry) => {
              const isTop = entry.rank <= 3;
              return (
                <div
                  key={entry.userId}
                  className={cn(
                    "grid items-center gap-2 px-4 py-3.5 border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors",
                    isTop && "bg-[hsl(var(--peptoma-cyan))/3]"
                  )}
                  style={{ gridTemplateColumns: "3rem 1fr 5rem 5rem 5rem 6rem 7rem" }}
                >
                  {/* Rank */}
                  <div className="flex justify-center">
                    <RankDisplay rank={entry.rank} />
                  </div>

                  {/* Name + bar */}
                  <div className="min-w-0 space-y-1.5">
                    <div className="font-mono text-sm font-semibold truncate">
                      {entry.username
                        ? entry.username
                        : `${entry.userId.slice(0, 6)}…${entry.userId.slice(-4)}`}
                    </div>
                    <ScoreBar value={entry.combinedScore} max={maxScore} />
                  </div>

                  {/* Runs */}
                  <div className="text-right font-mono text-xs text-muted-foreground hidden md:block">
                    {entry.totalRuns}
                  </div>

                  {/* Annotations */}
                  <div className="text-right font-mono text-xs text-muted-foreground hidden md:block">
                    {entry.totalAnnotations}
                  </div>

                  {/* Score */}
                  <div className="text-right font-mono text-xs text-foreground hidden lg:block font-semibold">
                    {fmtFull(entry.combinedScore)}
                  </div>

                  {/* Share % */}
                  <div className="text-right font-mono text-xs text-[hsl(var(--peptoma-cyan))] hidden sm:block">
                    {entry.sharePercent.toFixed(2)}%
                  </div>

                  {/* Estimated reward */}
                  <div className={cn(
                    "text-right font-mono text-sm font-bold",
                    isTop ? "text-yellow-400" : "text-foreground"
                  )}>
                    {fmt(entry.estimatedReward)}
                    <span className="text-[10px] font-normal text-muted-foreground ml-0.5">$PEPTM</span>
                  </div>
                </div>
              );
            })}

            {/* Footer note */}
            <div className="px-4 py-3 bg-muted/20 border-t border-border text-[10px] font-mono text-muted-foreground text-center">
              Estimated rewards update in real time as more contributors join. Final distribution calculated at event end.
            </div>
          </div>
        )}
      </div>

      {/* ── How to participate ── */}
      <div className="rounded-xl border border-[hsl(var(--peptoma-cyan))/20] bg-[hsl(var(--peptoma-cyan))/3] p-5 sm:p-6 space-y-3">
        <h2 className="text-[10px] font-mono text-[hsl(var(--peptoma-cyan))] tracking-widest uppercase">How to Participate</h2>
        <ol className="space-y-2 list-none">
          {[
            "Connect your Solana wallet on any page — your wallet address is your identity",
            "Go to The Lab and submit peptide sequences for AI analysis",
            "Visit the Feed and annotate sequences from the community (confirm, challenge, extend, tag)",
            "Your score and estimated reward update automatically every 10 seconds",
            "Final prizes distributed proportionally when the event ends on May 13, 2026",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm font-mono text-muted-foreground">
              <span className="text-[hsl(var(--peptoma-cyan))] font-bold shrink-0">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

    </div>
  );
}
