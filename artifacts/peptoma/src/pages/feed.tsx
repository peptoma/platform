import { useState } from "react";
import { useGetFeed, useGetAnnotations, useCreateAnnotation, getGetFeedQueryKey } from "@workspace/api-client-react";
import { useWallet } from "@/contexts/wallet-context";
import type { SequenceAnalysis, Annotation } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, ChevronRight, Filter, Search, Activity, SortAsc, CheckCircle, AlertTriangle, Plus, Tag, ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

const ANNOTATION_TYPES = [
  { type: "confirm", label: "CONFIRM", icon: CheckCircle, color: "text-[hsl(var(--peptoma-green))]", earn: 2, desc: "Agree with AI classification" },
  { type: "challenge", label: "CHALLENGE", icon: AlertTriangle, color: "text-[hsl(var(--peptoma-red))]", earn: 3, desc: "Dispute with reasoning" },
  { type: "extend", label: "EXTEND", icon: Plus, color: "text-[hsl(var(--peptoma-cyan))]", earn: 5, desc: "Add related data / sequence" },
  { type: "tag", label: "TAG", icon: Tag, color: "text-[hsl(var(--peptoma-gold))]", earn: 2, desc: "Add disease/target label" },
] as const;

const ANNOTATION_COLORS: Record<string, string> = {
  confirm: "text-[hsl(var(--peptoma-green))] bg-[hsl(var(--peptoma-green))/10] border-[hsl(var(--peptoma-green))/20]",
  challenge: "text-[hsl(var(--peptoma-red))] bg-[hsl(var(--peptoma-red))/10] border-[hsl(var(--peptoma-red))/20]",
  extend: "text-[hsl(var(--peptoma-cyan))] bg-[hsl(var(--peptoma-cyan))/10] border-[hsl(var(--peptoma-cyan))/20]",
  tag: "text-[hsl(var(--peptoma-gold))] bg-[hsl(var(--peptoma-gold))/10] border-[hsl(var(--peptoma-gold))/20]",
};

function ToxicityDot({ risk }: { risk?: string }) {
  const colors = { low: "bg-[hsl(var(--peptoma-green))]", medium: "bg-[hsl(var(--peptoma-gold))]", high: "bg-[hsl(var(--peptoma-red))]" };
  return <span className={cn("inline-block w-2 h-2 rounded-full", colors[(risk ?? "low") as keyof typeof colors])} title={`Toxicity: ${risk}`} />;
}

function StructureTag({ type }: { type?: string }) {
  if (!type) return null;
  const labels: Record<string, string> = { alpha_helix: "α-HELIX", beta_sheet: "β-SHEET", random_coil: "COIL", mixed: "MIXED" };
  return (
    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-[hsl(var(--peptoma-cyan))/20] text-[hsl(var(--peptoma-cyan))/70]">
      {labels[type] ?? type}
    </span>
  );
}

function ScorePill({ value, label }: { value: number; label: string }) {
  const color = value >= 75 ? "text-[hsl(var(--peptoma-cyan))]" : value >= 50 ? "text-[hsl(var(--peptoma-gold))]" : "text-muted-foreground";
  return (
    <div className="text-center">
      <div className={cn("text-lg font-bold font-mono", color)}>{value}</div>
      <div className="text-[10px] font-mono text-muted-foreground tracking-widest">{label}</div>
    </div>
  );
}

function AnnotationCard({ ann }: { ann: Annotation }) {
  const { userId } = useWallet();
  const [score, setScore] = useState(ann.score ?? 0);
  const [voted, setVoted] = useState<"up" | "down" | null>(null);
  const [voting, setVoting] = useState(false);

  const vote = async (direction: "up" | "down") => {
    if (voting || voted) return;
    setVoting(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/annotations/${ann.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction, ...(userId ? { userId } : {}) }),
      });
      if (res.ok) {
        const data = await res.json() as { score: number };
        setScore(data.score);
        setVoted(direction);
      }
    } finally {
      setVoting(false);
    }
  };

  return (
    <div className="p-3 rounded-lg bg-background/40 border border-border space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-mono text-muted-foreground truncate">{ann.userId}</span>
        <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded border uppercase shrink-0", ANNOTATION_COLORS[ann.type] ?? "text-muted-foreground bg-muted/20 border-border")}>
          {ann.type}
        </span>
      </div>
      {ann.content && <p className="text-xs font-mono text-foreground/80">{ann.content}</p>}
      <div className="flex items-center justify-between">
        {ann.tokensEarned !== null && ann.tokensEarned !== undefined && ann.tokensEarned > 0 && (
          <p className="text-[10px] font-mono text-[hsl(var(--peptoma-gold))]">+{ann.tokensEarned} $PEPTOMA</p>
        )}
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => vote("up")}
            disabled={voting || voted !== null}
            className={cn(
              "flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors",
              voted === "up"
                ? "text-[hsl(var(--peptoma-cyan))] bg-[hsl(var(--peptoma-cyan))/10]"
                : "text-muted-foreground hover:text-[hsl(var(--peptoma-cyan))] hover:bg-[hsl(var(--peptoma-cyan))/8] disabled:opacity-40"
            )}
          >
            <ThumbsUp className="w-2.5 h-2.5" />
          </button>
          <span className={cn("text-[10px] font-mono w-5 text-center", score > 0 ? "text-[hsl(var(--peptoma-cyan))]" : score < 0 ? "text-[hsl(var(--peptoma-red))]" : "text-muted-foreground")}>
            {score > 0 ? `+${score}` : score}
          </span>
          <button
            onClick={() => vote("down")}
            disabled={voting || voted !== null}
            className={cn(
              "flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors",
              voted === "down"
                ? "text-[hsl(var(--peptoma-red))] bg-[hsl(var(--peptoma-red))/10]"
                : "text-muted-foreground hover:text-[hsl(var(--peptoma-red))] hover:bg-[hsl(var(--peptoma-red))/8] disabled:opacity-40"
            )}
          >
            <ThumbsDown className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function AnnotationPanel({ sequence, onClose }: { sequence: SequenceAnalysis; onClose: () => void }) {
  const { userId } = useWallet();
  const [comment, setComment] = useState("");
  const [activeType, setActiveType] = useState<"confirm" | "challenge" | "extend" | "tag">("confirm");
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<"success" | "error" | null>(null);
  const [errMsg, setErrMsg] = useState("");
  const queryClient = useQueryClient();

  const { data: annotations, isLoading } = useGetAnnotations(sequence.id, {
    query: { queryKey: ["annotations", sequence.id] }
  });
  const { mutateAsync } = useCreateAnnotation();

  const needsComment = activeType === "extend" || activeType === "tag";

  const handleSubmitAnnotation = async () => {
    if (submitting) return;
    if (needsComment && !comment.trim()) {
      setErrMsg("Please add a comment for this annotation type.");
      return;
    }
    setSubmitting(true);
    setSubmitResult(null);
    setErrMsg("");
    try {
      await mutateAsync({
        data: {
          sequenceId: sequence.id,
          userId,
          type: activeType,
          content: comment.trim() || undefined,
        }
      });
      setComment("");
      setSubmitResult("success");
      queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() });
      queryClient.invalidateQueries({ queryKey: ["annotations", sequence.id] });
      setTimeout(() => setSubmitResult(null), 3000);
    } catch (e) {
      setSubmitResult("error");
      setErrMsg(e instanceof Error ? e.message : "Submission failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-card/95 backdrop-blur-xl border-l border-border z-[60] flex flex-col"
    >
      <div className="flex items-start justify-between p-6 border-b border-border">
        <div>
          <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase mb-1">Sequence Detail</p>
          <p className="font-mono text-sm text-foreground break-all">{sequence.sequence.slice(0, 30)}{sequence.sequence.length > 30 ? "..." : ""}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="p-4 rounded-lg bg-background/60 border border-border font-mono text-sm text-foreground break-all tracking-widest">
          {sequence.sequence}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <ScorePill value={sequence.bioactivityScore} label="BIOACTIVITY" />
          <ScorePill value={sequence.confidenceScore} label="CONFIDENCE" />
          <div className="text-center">
            <ToxicityDot risk={sequence.toxicityRisk} />
            <div className="text-[10px] font-mono text-muted-foreground tracking-widest mt-1">TOXICITY</div>
          </div>
        </div>

        {sequence.bioactivityLabel && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded border border-[hsl(var(--peptoma-cyan))/20] bg-[hsl(var(--peptoma-cyan))/5] text-[hsl(var(--peptoma-cyan))/80] uppercase tracking-widest">
              {sequence.bioactivityLabel}
            </span>
            {sequence.depth && (
              <span className={cn("text-xs font-mono px-2 py-0.5 rounded border uppercase tracking-widest",
                sequence.depth === "deep" ? "border-[hsl(var(--peptoma-gold))/30] text-[hsl(var(--peptoma-gold))] bg-[hsl(var(--peptoma-gold))/10]" : "border-border text-muted-foreground"
              )}>
                {sequence.depth}
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs">
          {sequence.molecularWeight && (
            <div className="p-2 bg-background/40 rounded border border-border">
              <div className="text-muted-foreground font-mono">MW</div>
              <div className="text-foreground font-mono">{sequence.molecularWeight} Da</div>
            </div>
          )}
          {sequence.halfLife && (
            <div className="p-2 bg-background/40 rounded border border-border">
              <div className="text-muted-foreground font-mono">t½</div>
              <div className="text-foreground font-mono">{sequence.halfLife}</div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
          <span><MessageSquare className="w-3 h-3 inline mr-1" />{sequence.annotationCount} annotations</span>
          <span className="text-[hsl(var(--peptoma-cyan))]">{(sequence.voteCount ?? 0) > 0 ? `+${sequence.voteCount}` : sequence.voteCount ?? 0} consensus</span>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Community Annotations</p>
          {isLoading ? (
            <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-14 bg-muted/20 rounded-lg animate-pulse" />)}</div>
          ) : annotations && annotations.length > 0 ? (
            <div className="space-y-3">
              {annotations.map((ann) => <AnnotationCard key={ann.id} ann={ann} />)}
            </div>
          ) : (
            <p className="text-xs font-mono text-muted-foreground italic">No annotations yet — be the first.</p>
          )}
        </div>
      </div>

      <div className="p-6 border-t border-border space-y-3">
        <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Add Annotation</p>
        <div className="grid grid-cols-2 gap-2">
          {ANNOTATION_TYPES.map(({ type, label, earn }) => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={cn("flex flex-col items-center gap-0.5 py-2 text-[10px] font-mono rounded border transition-all",
                activeType === type
                  ? "border-[hsl(var(--peptoma-cyan))/40] bg-[hsl(var(--peptoma-cyan))/10] text-[hsl(var(--peptoma-cyan))]"
                  : "border-border text-muted-foreground hover:border-border/60"
              )}
            >
              <span>{label}</span>
              <span className="text-[hsl(var(--peptoma-gold))] text-[9px]">+{earn} $PEPTOMA</span>
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={
            activeType === "confirm" ? "Why do you confirm the AI classification?" :
            activeType === "challenge" ? "What evidence disputes this? Provide reasoning..." :
            activeType === "extend" ? "Add related sequence, supporting data, or references..." :
            "Add disease/target label..."
          }
          className="w-full h-20 px-3 py-2 bg-background/60 border border-border rounded-lg font-mono text-xs text-foreground placeholder-muted-foreground/50 resize-none focus:outline-none focus:border-[hsl(var(--peptoma-cyan))/40] transition-colors"
        />
        {errMsg && (
          <p className="text-[10px] font-mono text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{errMsg}</p>
        )}
        {submitResult === "success" && (
          <p className="text-[10px] font-mono text-[hsl(var(--peptoma-green))] bg-[hsl(var(--peptoma-green))/10] border border-[hsl(var(--peptoma-green))/20] rounded-lg px-3 py-2 flex items-center gap-1.5">
            <CheckCircle className="w-3 h-3" /> Annotation submitted! Points earned.
          </p>
        )}
        <button
          onClick={handleSubmitAnnotation}
          disabled={submitting || (needsComment && !comment.trim())}
          className="w-full py-2 bg-[hsl(var(--peptoma-cyan))] text-black font-mono text-sm font-bold rounded-lg hover:bg-[hsl(var(--peptoma-cyan))/90] active:bg-[hsl(var(--peptoma-cyan))/80] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {submitting ? (
            <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="inline-block"><Activity className="w-4 h-4" /></motion.div>SUBMITTING...</>
          ) : (
            <>SUBMIT + EARN $PEPTOMA</>
          )}
        </button>
      </div>
    </motion.div>
  );
}

function SequenceCard({ seq, onClick }: { seq: SequenceAnalysis; onClick: () => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-5 hover:border-[hsl(var(--peptoma-cyan))/20] transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <p className="font-mono text-sm text-foreground break-all tracking-widest leading-relaxed">
            {seq.sequence.slice(0, 40)}{seq.sequence.length > 40 ? <span className="text-muted-foreground">...</span> : ""}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <ToxicityDot risk={seq.toxicityRisk} />
            <StructureTag type={seq.structurePrediction} />
            {seq.bioactivityLabel && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-[hsl(var(--peptoma-cyan))/15] text-[hsl(var(--peptoma-cyan))/60]">
                {seq.bioactivityLabel}
              </span>
            )}
            {seq.diseaseTarget && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-[hsl(var(--peptoma-gold))/20] text-[hsl(var(--peptoma-gold))/70]">
                {seq.diseaseTarget}
              </span>
            )}
            {seq.depth === "deep" && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-[hsl(var(--peptoma-gold))/20] text-[hsl(var(--peptoma-gold))/50]">deep</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground min-w-0">
            <span className="shrink-0"><MessageSquare className="w-3 h-3 inline mr-1" />{seq.annotationCount}</span>
            <span className={cn("font-mono text-xs shrink-0", (seq.voteCount ?? 0) > 0 ? "text-[hsl(var(--peptoma-green))]" : (seq.voteCount ?? 0) < 0 ? "text-[hsl(var(--peptoma-red))]" : "text-muted-foreground")}>
              {(seq.voteCount ?? 0) > 0 ? `+${seq.voteCount}` : seq.voteCount ?? 0} consensus
            </span>
            <span className="text-muted-foreground/60 truncate min-w-0">{seq.userId}</span>
          </div>
        </div>
        <div className="flex-shrink-0 flex flex-col items-end gap-2">
          <div className="text-right">
            <div className={cn("text-2xl font-bold font-mono",
              seq.bioactivityScore >= 75 ? "text-[hsl(var(--peptoma-cyan))]" : seq.bioactivityScore >= 50 ? "text-[hsl(var(--peptoma-gold))]" : "text-muted-foreground"
            )}>{seq.bioactivityScore}</div>
            <div className="text-[10px] font-mono text-muted-foreground">BIOACTIVITY</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold font-mono text-muted-foreground">{seq.confidenceScore}</div>
            <div className="text-[10px] font-mono text-muted-foreground/60">CONFIDENCE</div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-[hsl(var(--peptoma-cyan))] transition-colors mt-1" />
        </div>
      </div>
    </motion.div>
  );
}

const SORT_OPTIONS = [
  { value: "newest", label: "NEWEST" },
  { value: "score", label: "HIGHEST SCORE" },
  { value: "annotations", label: "MOST ANNOTATED" },
  { value: "trending", label: "TRENDING" },
] as const;

export default function Feed() {
  const [disease, setDisease] = useState("");
  const [minScore, setMinScore] = useState("");
  const [sort, setSort] = useState<"newest" | "score" | "annotations" | "trending">("newest");
  const [selected, setSelected] = useState<SequenceAnalysis | null>(null);

  const queryParams = {
    disease: disease || undefined,
    minScore: minScore ? Number(minScore) : undefined,
    sort,
  };

  const { data, isLoading } = useGetFeed(queryParams, {
    query: { queryKey: getGetFeedQueryKey(queryParams) }
  });

  return (
    <div className="space-y-6 pb-16">
      <div>
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-1 tracking-widest uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--peptoma-cyan))] animate-pulse" />
          Sequences Feed
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Live Research Feed</h1>
        <p className="text-muted-foreground mt-1 font-mono text-sm">All community peptide analyses — filter, sort, annotate.</p>
      </div>

      {/* Filters & Sort */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={disease}
            onChange={(e) => setDisease(e.target.value)}
            placeholder="Filter by disease..."
            className="pl-9 pr-4 py-2 bg-card/60 border border-border rounded-lg font-mono text-sm text-foreground placeholder-muted-foreground/50 focus:outline-none focus:border-[hsl(var(--peptoma-cyan))/40] transition-colors"
          />
        </div>
        <div className="relative">
          <Filter className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="number"
            value={minScore}
            onChange={(e) => setMinScore(e.target.value)}
            placeholder="Min score (0-100)"
            className="pl-9 pr-4 py-2 bg-card/60 border border-border rounded-lg font-mono text-sm text-foreground placeholder-muted-foreground/50 focus:outline-none focus:border-[hsl(var(--peptoma-cyan))/40] transition-colors w-44"
          />
        </div>

        {/* Sort */}
        <div className="relative">
          <SortAsc className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="pl-9 pr-8 py-2 bg-card/60 border border-border rounded-lg font-mono text-xs text-foreground focus:outline-none focus:border-[hsl(var(--peptoma-cyan))/40] transition-colors appearance-none cursor-pointer"
          >
            {SORT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value} className="bg-background">{label}</option>
            ))}
          </select>
        </div>

        {(disease || minScore) && (
          <button
            onClick={() => { setDisease(""); setMinScore(""); }}
            className="px-3 py-2 text-xs font-mono text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors"
          >
            Clear Filters
          </button>
        )}
        <div className="ml-auto flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <Activity className="w-3.5 h-3.5" />
          {data?.total ?? 0} sequences
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-card/40 border border-border animate-pulse" />
          ))
        ) : data?.items?.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Activity className="w-10 h-10 text-muted-foreground/30 mx-auto" />
            <p className="font-mono text-muted-foreground">No sequences match your filters</p>
          </div>
        ) : (
          data?.items?.map((seq) => (
            <SequenceCard key={seq.id} seq={seq} onClick={() => setSelected(seq)} />
          ))
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[59]"
              onClick={() => setSelected(null)}
            />
            <AnnotationPanel sequence={selected} onClose={() => setSelected(null)} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
