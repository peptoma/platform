import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useSubmitSequence } from "@workspace/api-client-react";
import type { SequenceAnalysis } from "@workspace/api-client-react";
import { useWallet } from "@/contexts/wallet-context";
import {
  ArrowLeft, Dna, Activity, BookOpen, ExternalLink, Clock, Shield,
  CheckCircle, AlertTriangle, Zap, ChevronRight, FlaskConical,
  MessageSquare, Send, Bot, RotateCcw, Copy, Check, TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VrilRecommendation } from "@/components/ui/vril-recommendation";

import { PEPTIDE_DB } from "@/lib/peptide-db";
import type { Grade, Status } from "@/lib/peptide-db";


const GRADE_COLORS: Record<Grade, string> = {
  "A+": "text-[hsl(var(--peptoma-cyan))] border-[hsl(var(--peptoma-cyan))/30] bg-[hsl(var(--peptoma-cyan))/10]",
  "A":  "text-[hsl(var(--peptoma-green))] border-[hsl(var(--peptoma-green))/30] bg-[hsl(var(--peptoma-green))/10]",
  "B":  "text-[hsl(var(--peptoma-gold))] border-[hsl(var(--peptoma-gold))/30] bg-[hsl(var(--peptoma-gold))/10]",
  "C":  "text-muted-foreground border-border bg-muted/20",
};

const STATUS_COLORS: Record<Status, string> = {
  "FDA Approved": "text-[hsl(var(--peptoma-cyan))] bg-[hsl(var(--peptoma-cyan))/8] border-[hsl(var(--peptoma-cyan))/25]",
  "Phase III":    "text-[hsl(var(--peptoma-green))] bg-[hsl(var(--peptoma-green))/8] border-[hsl(var(--peptoma-green))/25]",
  "Phase II":     "text-[hsl(var(--peptoma-gold))] bg-[hsl(var(--peptoma-gold))/8] border-[hsl(var(--peptoma-gold))/25]",
  "Research":     "text-muted-foreground bg-muted/20 border-border",
  "Pre-clinical": "text-muted-foreground bg-muted/10 border-border/60",
};

const STRUCTURE_LABELS: Record<string, string> = {
  alpha_helix: "α-Helix", beta_sheet: "β-Sheet", random_coil: "Random Coil", mixed: "Mixed",
};

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-mono">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold">{value.toFixed(0)}</span>
      </div>
      <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
        <motion.div className={cn("h-full rounded-full", color)} initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.8 }} />
      </div>
    </div>
  );
}

interface ChatMessage { role: "user" | "assistant"; content: string; }

function MiniCopilot({ peptideName, target }: { peptideName: string; target: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const STARTERS = [
    `What is the mechanism of action of ${peptideName}?`,
    `What are known side effects or safety data for ${peptideName}?`,
    `How does ${peptideName} compare to similar peptides?`,
  ];

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/copilot/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newHistory.slice(-20) }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json() as { reply: string };
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Could not reach Copilot. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card/60 flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/20 shrink-0">
        <Bot className="w-3.5 h-3.5 text-[hsl(var(--peptoma-cyan))]" />
        <span className="text-[10px] font-mono text-muted-foreground tracking-widest">RESEARCH COPILOT — {peptideName.toUpperCase()} CONTEXT</span>
        {messages.length > 0 && (
          <button onClick={() => setMessages([])} className="ml-auto text-[9px] font-mono text-muted-foreground hover:text-foreground flex items-center gap-1">
            <RotateCcw className="w-2.5 h-2.5" /> Reset
          </button>
        )}
      </div>

      <div className="flex-1 p-4 space-y-3 overflow-y-auto" style={{ maxHeight: 260 }}>
        {messages.length === 0 && !loading && (
          <div className="space-y-2">
            <p className="text-[10px] font-mono text-muted-foreground">Suggested questions:</p>
            {STARTERS.map((q, i) => (
              <button key={i} onClick={() => send(q)}
                className="w-full text-left px-3 py-2 rounded-lg border border-border bg-background/40 hover:border-[hsl(var(--peptoma-cyan))/40] hover:bg-[hsl(var(--peptoma-cyan))/4] transition-all text-[10px] font-mono text-muted-foreground hover:text-foreground group">
                <span className="text-[hsl(var(--peptoma-cyan))/60] mr-1.5 group-hover:text-[hsl(var(--peptoma-cyan))]">›</span>{q}
              </button>
            ))}
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-2", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
            <div className={cn("w-5 h-5 rounded shrink-0 flex items-center justify-center mt-0.5",
              msg.role === "user" ? "bg-foreground/10 border border-border" : "bg-[hsl(var(--peptoma-cyan))/10] border border-[hsl(var(--peptoma-cyan))/25]")}>
              {msg.role === "user" ? <span className="text-[8px] font-mono">YOU</span> : <Bot className="w-2.5 h-2.5 text-[hsl(var(--peptoma-cyan))]" />}
            </div>
            <div className={cn("max-w-[85%] px-3 py-2 rounded-lg text-[11px] font-mono leading-relaxed",
              msg.role === "user" ? "bg-foreground text-background rounded-tr-sm" : "bg-background border border-border rounded-tl-sm text-foreground")}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="w-5 h-5 rounded bg-[hsl(var(--peptoma-cyan))/10] border border-[hsl(var(--peptoma-cyan))/25] flex items-center justify-center">
              <Bot className="w-2.5 h-2.5 text-[hsl(var(--peptoma-cyan))]" />
            </div>
            <div className="bg-background border border-border rounded-lg px-3 py-2 flex items-center gap-1">
              {[0, 1, 2].map(i => (
                <motion.div key={i} className="w-1 h-1 rounded-full bg-[hsl(var(--peptoma-cyan))/60]"
                  animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                  transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border p-2.5 bg-background/50 shrink-0 flex items-center gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") send(input); }}
          placeholder={`Ask about ${peptideName}...`}
          disabled={loading}
          className="flex-1 bg-transparent font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <button onClick={() => send(input)} disabled={!input.trim() || loading}
          className="w-7 h-7 flex items-center justify-center bg-[hsl(var(--peptoma-cyan))] text-white rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0">
          <Send className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

const ANALYSIS_STEPS = [
  "Structure prediction...",
  "Bioactivity scoring...",
  "Toxicity assessment...",
  "Generating annotation suggestions...",
];

export default function PeptideDetail() {
  const { id } = useParams<{ id: string }>();
  const peptide = PEPTIDE_DB.find(p => p.id === id);
  const { userId } = useWallet();
  const [result, setResult] = useState<SequenceAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const hasRun = useRef(false);

  const { mutateAsync, isPending } = useSubmitSequence();

  const cleanSeq = peptide?.sequence.replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, "") ?? "";

  useEffect(() => {
    if (!peptide || hasRun.current || cleanSeq.length < 3) return;
    hasRun.current = true;

    mutateAsync({
      data: {
        sequence: cleanSeq,
        userId,
        diseaseTarget: peptide.targets[0],
        notes: `Curated peptide: ${peptide.fullName}`,
        depth: "standard",
      }
    })
      .then(res => setResult(res as SequenceAnalysis))
      .catch(e => setAnalysisError(e instanceof Error ? e.message : "Analysis failed"));
  }, [peptide]);

  const rerun = () => {
    hasRun.current = false;
    setResult(null);
    setAnalysisError(null);
    if (!peptide || cleanSeq.length < 3) return;
    hasRun.current = true;
    mutateAsync({
      data: { sequence: cleanSeq, userId, diseaseTarget: peptide.targets[0], notes: `Curated peptide: ${peptide.fullName}`, depth: "standard" }
    })
      .then(res => setResult(res as SequenceAnalysis))
      .catch(e => setAnalysisError(e instanceof Error ? e.message : "Analysis failed"));
  };

  const copySeq = async () => {
    if (!peptide) return;
    await navigator.clipboard.writeText(peptide.sequence);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!peptide) {
    return (
      <div className="py-24 text-center space-y-4">
        <Dna className="w-12 h-12 text-muted-foreground/30 mx-auto" />
        <p className="font-mono text-muted-foreground">Peptide not found.</p>
        <Link href="/peptides"><div className="inline-flex items-center gap-2 text-xs font-mono text-[hsl(var(--peptoma-cyan))] hover:opacity-70 transition-opacity cursor-pointer"><ArrowLeft className="w-3 h-3" /> Back to Peptide Library</div></Link>
      </div>
    );
  }

  return (
    <div className="pb-16 space-y-6">
      {/* Back */}
      <Link href="/peptides">
        <div className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5" /> Peptide Library
        </div>
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{peptide.name}</h1>
            <span className={cn("text-xs font-mono font-bold px-2 py-0.5 rounded border", GRADE_COLORS[peptide.grade])}>
              Grade {peptide.grade}
            </span>
            <span className={cn("text-[10px] font-mono px-2 py-0.5 rounded border", STATUS_COLORS[peptide.status])}>
              {peptide.status}
            </span>
          </div>
          <p className="text-muted-foreground font-mono text-sm">{peptide.fullName}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <a href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(peptide.name)}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-muted-foreground font-mono text-[10px] rounded-lg hover:text-foreground hover:border-foreground/20 transition-colors">
            <BookOpen className="w-3 h-3" /> PubMed ({peptide.pubmedRefs.toLocaleString()})
          </a>
          {peptide.recruitingTrials > 0 && (
            <a href={`https://clinicaltrials.gov/search?query=${encodeURIComponent(peptide.name)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-muted-foreground font-mono text-[10px] rounded-lg hover:text-foreground hover:border-foreground/20 transition-colors">
              <Activity className="w-3 h-3" /> {peptide.recruitingTrials} Trials
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — profile */}
        <div className="space-y-4">
          {/* Sequence */}
          <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">Sequence</span>
              <button onClick={copySeq} className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground hover:text-foreground transition-colors">
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="font-mono text-xs text-[hsl(var(--peptoma-cyan))] bg-background/50 border border-border/60 rounded px-3 py-2 tracking-widest break-all leading-relaxed">
              {peptide.sequence}
            </p>
            <div className="text-[10px] font-mono text-muted-foreground">{cleanSeq.length} residues (canonical) · {peptide.mw}</div>
          </div>

          {/* Metadata */}
          <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
            <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">Profile</span>
            <div className="space-y-2">
              {[
                { label: "Category", value: peptide.category },
                { label: "Structure class", value: STRUCTURE_LABELS[peptide.structureClass] ?? peptide.structureClass },
                { label: "Half-life", value: peptide.halfLife, icon: Clock },
                { label: "PubMed refs", value: peptide.pubmedRefs.toLocaleString(), icon: BookOpen },
                { label: "Active trials", value: peptide.recruitingTrials.toString(), icon: Activity },
                { label: "Mol. weight", value: peptide.mw, icon: TrendingUp },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center justify-between py-1 border-b border-border/40 last:border-0">
                  <div className="flex items-center gap-1.5">
                    {Icon && <Icon className="w-2.5 h-2.5 text-muted-foreground/60" />}
                    <span className="text-[10px] font-mono text-muted-foreground">{label}</span>
                  </div>
                  <span className="text-[10px] font-mono text-foreground font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Targets */}
          <div className="rounded-xl border border-border bg-card/60 p-4 space-y-2">
            <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">Research Targets</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {peptide.targets.map(t => (
                <span key={t} className="text-[10px] font-mono px-2 py-1 rounded-lg border border-[hsl(var(--peptoma-cyan))/25] bg-[hsl(var(--peptoma-cyan))/8] text-[hsl(var(--peptoma-cyan))/80]">{t}</span>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-xl border border-border bg-card/60 p-4 space-y-2">
            <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">Summary</span>
            <p className="text-xs font-mono text-muted-foreground leading-relaxed">{peptide.summary}</p>
          </div>

          {/* Literature links */}
          <div className="rounded-xl border border-[hsl(var(--peptoma-cyan))/20] bg-[hsl(var(--peptoma-cyan))/4] p-4 space-y-2">
            <span className="text-[10px] font-mono text-[hsl(var(--peptoma-cyan))] tracking-widest uppercase">Literature</span>
            {[
              { label: "Search PubMed", href: `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(peptide.name)}`, count: `${peptide.pubmedRefs}+ refs` },
              { label: "ClinicalTrials.gov", href: `https://clinicaltrials.gov/search?query=${encodeURIComponent(peptide.name)}`, count: `${peptide.recruitingTrials} active` },
              { label: "Google Scholar", href: `https://scholar.google.com/scholar?q=${encodeURIComponent(peptide.name + " peptide")}`, count: "Open access" },
            ].map(({ label, href, count }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between p-2 rounded-lg border border-border/60 bg-background/40 hover:border-[hsl(var(--peptoma-cyan))/40] hover:bg-background transition-all group">
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-[hsl(var(--peptoma-cyan))] transition-colors" />
                  <span className="text-[10px] font-mono text-foreground">{label}</span>
                </div>
                <span className="text-[9px] font-mono text-muted-foreground">{count}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Right column — analysis + copilot */}
        <div className="lg:col-span-2 space-y-5">
          {/* AI Analysis results */}
          <div className="rounded-xl border border-border bg-card/60 p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[hsl(var(--peptoma-cyan))]" />
                <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">AI Analysis — Standard</span>
              </div>
              {result && !isPending && (
                <button onClick={rerun} className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground hover:text-foreground transition-colors">
                  <RotateCcw className="w-3 h-3" /> Re-run
                </button>
              )}
            </div>

            <AnimatePresence mode="wait">
              {isPending && (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-16 space-y-6">
                  <div className="relative">
                    <motion.div className="w-16 h-16 rounded-full border-2 border-[hsl(var(--peptoma-cyan))/25]"
                      animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} />
                    <motion.div className="absolute inset-1.5 rounded-full border-2 border-[hsl(var(--peptoma-cyan))/60] border-t-transparent"
                      animate={{ rotate: -360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Dna className="w-5 h-5 text-[hsl(var(--peptoma-cyan))]" />
                    </div>
                  </div>
                  <div className="text-center space-y-1.5">
                    <p className="font-mono text-[hsl(var(--peptoma-cyan))] text-xs tracking-widest">ANALYZING {peptide.name.toUpperCase()}</p>
                    {ANALYSIS_STEPS.map((step, i) => (
                      <motion.p key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.5 }}
                        className="text-[10px] font-mono text-muted-foreground">
                        <span className="text-[hsl(var(--peptoma-cyan))]">▶</span> {step}
                      </motion.p>
                    ))}
                  </div>
                </motion.div>
              )}

              {analysisError && !isPending && (
                <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="py-8 text-center space-y-3">
                  <AlertTriangle className="w-8 h-8 text-[hsl(var(--peptoma-red))] mx-auto opacity-60" />
                  <p className="text-xs font-mono text-muted-foreground">Analysis failed: {analysisError}</p>
                  <button onClick={rerun} className="text-[10px] font-mono text-[hsl(var(--peptoma-cyan))] hover:opacity-70 transition-opacity flex items-center gap-1 mx-auto">
                    <RotateCcw className="w-3 h-3" /> Try again
                  </button>
                </motion.div>
              )}

              {result && !isPending && (
                <motion.div key="result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-[hsl(var(--peptoma-green))]" />
                    <span className="text-[10px] font-mono text-[hsl(var(--peptoma-green))] tracking-widest">ANALYSIS COMPLETE</span>
                    {result.id && (
                      <Link href={`/annotate/${result.id}`}>
                        <div className="ml-auto flex items-center gap-1 text-[9px] font-mono text-[hsl(var(--peptoma-cyan))] hover:opacity-70 transition-opacity cursor-pointer">
                          View in Feed <ChevronRight className="w-2.5 h-2.5" />
                        </div>
                      </Link>
                    )}
                  </div>

                  {/* Scores */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <ScoreBar label="Bioactivity Score" value={result.bioactivityScore ?? 0} color="bg-[hsl(var(--peptoma-cyan))]" />
                      <ScoreBar label="Confidence Score" value={result.confidenceScore ?? 0} color="bg-[hsl(var(--peptoma-gold))]" />
                    </div>
                    <div className="space-y-2">
                      {result.structurePrediction && (
                        <div className="p-2.5 bg-background/60 rounded-lg border border-border">
                          <p className="text-[9px] font-mono text-muted-foreground mb-1">Structure Prediction</p>
                          <span className="text-xs font-mono font-bold text-[hsl(var(--peptoma-cyan))]">
                            {STRUCTURE_LABELS[result.structurePrediction] ?? result.structurePrediction}
                          </span>
                        </div>
                      )}
                      {result.toxicityRisk && (
                        <div className="p-2.5 bg-background/60 rounded-lg border border-border">
                          <p className="text-[9px] font-mono text-muted-foreground mb-1">Toxicity Risk</p>
                          <span className={cn("text-xs font-mono font-bold",
                            result.toxicityRisk === "low" ? "text-[hsl(var(--peptoma-green))]" :
                            result.toxicityRisk === "medium" ? "text-[hsl(var(--peptoma-gold))]" :
                            "text-[hsl(var(--peptoma-red))]"
                          )}>{result.toxicityRisk?.toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Molecular properties */}
                  {(result.molecularWeight || result.halfLife || result.bioactivityLabel) && (
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "MW", value: result.molecularWeight ? `${result.molecularWeight} Da` : null },
                        { label: "Half-life", value: result.halfLife },
                        { label: "Classification", value: result.bioactivityLabel },
                      ].filter(r => r.value).map(({ label, value }) => (
                        <div key={label} className="p-2.5 bg-background/60 rounded-lg border border-border text-center">
                          <p className="text-[9px] font-mono text-muted-foreground">{label}</p>
                          <p className="text-[10px] font-mono font-bold text-foreground mt-0.5">{value}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Annotation suggestions */}
                  {result.annotationSuggestions && result.annotationSuggestions.length > 0 && (
                    <div className="rounded-lg border border-[hsl(var(--peptoma-gold))/20] bg-[hsl(var(--peptoma-gold))/5] p-4 space-y-2">
                      <p className="text-[10px] font-mono text-[hsl(var(--peptoma-gold))] tracking-widest uppercase">AI Annotation Suggestions</p>
                      {result.annotationSuggestions.map((s, i) => (
                        <p key={i} className="text-[11px] font-mono text-muted-foreground flex gap-2">
                          <span className="text-[hsl(var(--peptoma-gold))/60] shrink-0">▸</span>{s}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Annotate CTA */}
                  {result.id && (
                    <Link href={`/annotate/${result.id}`}>
                      <div className="flex items-center justify-between p-3.5 rounded-lg border border-[hsl(var(--peptoma-cyan))/25] bg-[hsl(var(--peptoma-cyan))/5] hover:bg-[hsl(var(--peptoma-cyan))/10] transition-colors cursor-pointer group">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-[hsl(var(--peptoma-cyan))]" />
                          <span className="text-xs font-mono text-foreground font-medium">Annotate this analysis · earn $PEPTOMA</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-[hsl(var(--peptoma-cyan))] transition-colors" />
                      </div>
                    </Link>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Vril Recommendation */}
          {result && (
            <VrilRecommendation
              bioactivityLabel={result.bioactivityLabel}
              diseaseTarget={peptide.targets[0]}
            />
          )}

          {/* Research Copilot */}
          <MiniCopilot peptideName={peptide.name} target={peptide.targets[0]} />

          {/* Related peptides */}
          <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
            <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">Related Peptides</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PEPTIDE_DB
                .filter(p => p.id !== peptide.id && (p.category === peptide.category || p.targets.some(t => peptide.targets.includes(t))))
                .slice(0, 4)
                .map(p => (
                  <Link key={p.id} href={`/peptides/${p.id}`}>
                    <div className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border bg-background/40 hover:border-[hsl(var(--peptoma-cyan))/30] hover:bg-[hsl(var(--peptoma-cyan))/4] transition-all cursor-pointer group">
                      <Dna className="w-3.5 h-3.5 text-muted-foreground group-hover:text-[hsl(var(--peptoma-cyan))] transition-colors shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-mono font-bold text-foreground">{p.name}</span>
                          <span className={cn("text-[8px] font-mono px-1 py-0.5 rounded border", GRADE_COLORS[p.grade])}>{p.grade}</span>
                        </div>
                        <p className="text-[9px] font-mono text-muted-foreground truncate">{p.targets[0]}</p>
                      </div>
                      <ChevronRight className="w-3 h-3 text-muted-foreground/30 group-hover:text-muted-foreground/70 transition-colors shrink-0" />
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
