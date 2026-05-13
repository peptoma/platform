import { useState, useEffect } from "react";
import { useSubmitSequence } from "@workspace/api-client-react";
import type { SequenceAnalysis } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dna, Activity, Zap, CheckCircle, Clock, ChevronRight, RotateCcw, Layers, Microscope, Lightbulb, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { AICopilot } from "@/components/ui/ai-copilot";
import { useWallet } from "@/contexts/wallet-context";
import { VrilRecommendation } from "@/components/ui/vril-recommendation";
import { LabPaymentModal } from "@/components/ui/lab-payment-modal";

const DEEP_UNLOCK_KEY = "peptoma_deep_unlocked";

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-mono">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground font-bold">{value.toFixed(0)}</span>
      </div>
      <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", color)}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function ToxicityBadge({ risk }: { risk: string }) {
  const colors = {
    low: "text-[hsl(var(--peptoma-green))] border-[hsl(var(--peptoma-green))/30] bg-[hsl(var(--peptoma-green))/10]",
    medium: "text-[hsl(var(--peptoma-gold))] border-[hsl(var(--peptoma-gold))/30] bg-[hsl(var(--peptoma-gold))/10]",
    high: "text-[hsl(var(--peptoma-red))] border-[hsl(var(--peptoma-red))/30] bg-[hsl(var(--peptoma-red))/10]",
  };
  return (
    <span className={cn("text-xs font-mono px-2 py-0.5 rounded border uppercase tracking-widest", colors[risk as keyof typeof colors] ?? colors.low)}>
      {risk} toxicity
    </span>
  );
}

function StructureBadge({ type }: { type: string }) {
  const labels: Record<string, string> = {
    alpha_helix: "α-HELIX",
    beta_sheet: "β-SHEET",
    random_coil: "RANDOM COIL",
    mixed: "MIXED",
  };
  return (
    <span className="text-xs font-mono px-2 py-0.5 rounded border border-[hsl(var(--peptoma-cyan))/30] bg-[hsl(var(--peptoma-cyan))/10] text-[hsl(var(--peptoma-cyan))] uppercase tracking-widest">
      {labels[type] ?? type.toUpperCase()}
    </span>
  );
}

const EXAMPLE_SEQUENCES = [
  { label: "Antimicrobial", seq: "KWKLFKKIEKVGQNIRDGIIKAGPAVAVVGQATQIAK" },
  { label: "Short bioactive", seq: "FLPLIGRVLSGIL" },
  { label: "Epitope", seq: "SIINFEKL" },
];

const ANALYSIS_STEPS_STANDARD = ["Structure prediction...", "Bioactivity scoring...", "Confidence calculation...", "Generating suggestions..."];
const ANALYSIS_STEPS_DEEP = ["Deep structure prediction...", "Bioactivity classification...", "Ensemble confidence scoring...", "Generating annotation suggestions..."];


export default function Lab() {
  const { userId, connected, address, peptomBalance, sendTransaction } = useWallet();
  const [sequence, setSequence] = useState("");
  const [diseaseTarget, setDiseaseTarget] = useState("");
  const [notes, setNotes] = useState("");
  const [depth, setDepth] = useState<"standard" | "deep">("standard");
  const [result, setResult] = useState<SequenceAnalysis | null>(null);
  const [deepUnlocked, setDeepUnlocked] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [deepPaymentTxSig, setDeepPaymentTxSig] = useState<string | null>(null);

  // Restore deep unlock state + txSig from session
  useEffect(() => {
    const stored = sessionStorage.getItem(DEEP_UNLOCK_KEY);
    if (stored) {
      setDeepUnlocked(true);
      setDeepPaymentTxSig(stored); // stored value IS the txSig now
    }
  }, []);

  const { mutateAsync, isPending } = useSubmitSequence();

  const runAnalysis = async (overrideTxSig?: string) => {
    if (!sequence.trim()) return;
    setResult(null);
    try {
      const txSig = overrideTxSig ?? deepPaymentTxSig ?? undefined;
      const res = await mutateAsync({
        data: {
          sequence: sequence.trim().toUpperCase(),
          userId,
          diseaseTarget: diseaseTarget || undefined,
          notes: notes || undefined,
          depth,
          ...(depth === "deep" && txSig ? { paymentTxSig: txSig } : {}),
        }
      });
      setResult(res as SequenceAnalysis);
    } catch (_) {
      // handled by mutation state
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sequence.trim()) return;
    // Standard is free for everyone (anonymous or connected)
    // Deep requires a connected wallet to pay
    if (depth === "deep") {
      if (!connected) return; // must connect for deep
      if (!deepUnlocked) {
        setShowPayment(true);
        return;
      }
    }
    await runAnalysis();
  };

  const handlePaymentSuccess = async (txSig: string) => {
    // Store the actual txSig in sessionStorage so page refreshes keep the session
    sessionStorage.setItem(DEEP_UNLOCK_KEY, txSig);
    setDeepUnlocked(true);
    setDeepPaymentTxSig(txSig);
    setShowPayment(false);
    await runAnalysis(txSig);
  };

  const handleReset = () => {
    setResult(null);
    setSequence("");
    setDiseaseTarget("");
    setNotes("");
  };

  const runCost = depth === "deep" ? 5 : 1;

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-1 tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--peptoma-cyan))] animate-pulse" />
            The Lab
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Sequence Analyzer</h1>
          <p className="text-muted-foreground mt-1 font-mono text-sm leading-relaxed">Submit a peptide sequence — AI will analyze structure, predict bioactivity, and generate annotation suggestions.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Panel */}
        <div className="space-y-4">
          {/* AI Copilot */}
          <AICopilot
            onApply={(s) => {
              setSequence(s.sequence ?? "");
              setDiseaseTarget(s.diseaseTarget ?? "");
              setNotes(s.notes ?? "");
            }}
          />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Dna className="w-4 h-4 text-[hsl(var(--peptoma-cyan))]" />
                <span className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Sequence Input</span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Amino Acid Sequence *</label>
                <textarea
                  value={sequence}
                  onChange={(e) => setSequence(e.target.value.toUpperCase())}
                  placeholder="e.g. KWKLFKKIEKVGQNIRDGIIK… or use AI Copilot above"
                  className="w-full h-28 px-4 py-3 bg-background/60 border border-border rounded-lg font-mono text-sm text-foreground placeholder-muted-foreground/50 resize-none focus:outline-none focus:border-[hsl(var(--peptoma-cyan))/50] transition-colors"
                  spellCheck={false}
                />
                <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                  <span>{sequence.length} / 512 residues</span>
                  {sequence.length > 0 && (
                    <button type="button" onClick={() => setSequence("")} className="hover:text-foreground transition-colors">clear</button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Disease Target</label>
                <input
                  value={diseaseTarget}
                  onChange={(e) => setDiseaseTarget(e.target.value)}
                  placeholder="e.g. Inflammation, Cancer, Antimicrobial..."
                  className="w-full px-4 py-2.5 bg-background/60 border border-border rounded-lg font-mono text-sm text-foreground placeholder-muted-foreground/50 focus:outline-none focus:border-[hsl(var(--peptoma-cyan))/50] transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Notes <span className="opacity-50">(optional)</span></label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Research context, source, modifications..."
                  className="w-full px-4 py-2.5 bg-background/60 border border-border rounded-lg font-mono text-sm text-foreground placeholder-muted-foreground/50 focus:outline-none focus:border-[hsl(var(--peptoma-cyan))/50] transition-colors"
                />
              </div>

              {/* Analysis Depth Toggle */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Analysis Depth</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["standard", "deep"] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDepth(d)}
                      className={cn(
                        "flex flex-col items-center gap-1 px-4 py-3 rounded-lg border font-mono transition-all",
                        depth === d
                          ? "border-[hsl(var(--peptoma-cyan))/50] bg-[hsl(var(--peptoma-cyan))/10] text-[hsl(var(--peptoma-cyan))]"
                          : "border-border text-muted-foreground hover:border-border/60 hover:text-foreground/70"
                      )}
                    >
                      {d === "standard" ? <Layers className="w-4 h-4" /> : <Microscope className="w-4 h-4" />}
                      <span className="text-xs font-bold uppercase tracking-widest">{d}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {d === "standard" ? "FREE" : "1,000 $PEPTM"}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] font-mono text-muted-foreground">
                  {depth === "deep"
                    ? "Deep analysis: extended structure modeling + full annotation suggestions. Higher confidence."
                    : "Standard: fast structure + bioactivity scoring. Good for exploration."}
                  {" "}<span className="text-[hsl(var(--peptoma-cyan))/70]">
                    {depth === "deep"
                      ? "Deep requires wallet + 1,000 $PEPTM · paid once per session."
                      : "Standard is free · no wallet required · connect wallet to track contributions."}
                  </span>
                </p>
              </div>

              <button
                type="submit"
                disabled={isPending || !sequence.trim() || (depth === "deep" && !connected)}
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-6 py-3 font-mono font-bold rounded-lg transition-all",
                  (depth === "standard" || deepUnlocked)
                    ? "bg-[hsl(var(--peptoma-cyan))] text-black hover:bg-[hsl(var(--peptoma-cyan))/90] shadow-[0_0_20px_hsl(145_100%_42%/0.35)] hover:shadow-[0_0_30px_hsl(145_100%_42%/0.5)]"
                    : "bg-card border border-[hsl(var(--peptoma-cyan))/30] text-[hsl(var(--peptoma-cyan))] hover:bg-[hsl(var(--peptoma-cyan))/10]",
                  "disabled:opacity-40 disabled:cursor-not-allowed"
                )}
              >
                {isPending ? (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                      <Activity className="w-4 h-4" />
                    </motion.div>
                    ANALYZING...
                  </>
                ) : depth === "deep" && !connected ? (
                  <>
                    <Lock className="w-4 h-4" />
                    CONNECT WALLET FOR DEEP
                  </>
                ) : depth === "deep" && !deepUnlocked ? (
                  <>
                    <Lock className="w-4 h-4" />
                    UNLOCK DEEP — 1,000 $PEPTM
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    RUN {depth.toUpperCase()} ANALYSIS{depth === "standard" ? " — FREE" : ""}
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Example Sequences */}
          <div className="rounded-xl border border-border bg-card/40 p-4 space-y-2">
            <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase mb-3">Quick Examples</p>
            {EXAMPLE_SEQUENCES.map((ex) => (
              <button
                key={ex.label}
                type="button"
                onClick={() => setSequence(ex.seq)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-background/40 border border-border hover:border-[hsl(var(--peptoma-cyan))/30] hover:bg-[hsl(var(--peptoma-cyan))/5] transition-all group text-left"
              >
                <div>
                  <div className="text-xs font-mono text-[hsl(var(--peptoma-cyan))] mb-0.5">{ex.label}</div>
                  <div className="text-xs font-mono text-muted-foreground truncate max-w-[220px]">{ex.seq}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-[hsl(var(--peptoma-cyan))] transition-colors" />
              </button>
            ))}
          </div>
        </div>

        {/* Results Panel */}
        <div>
          <AnimatePresence mode="wait">
            {isPending && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-xl border border-[hsl(var(--peptoma-cyan))/20] bg-card/60 backdrop-blur-sm p-8 flex flex-col items-center justify-center h-full min-h-[400px] space-y-6"
              >
                <div className="relative">
                  <motion.div
                    className="w-24 h-24 rounded-full border-2 border-[hsl(var(--peptoma-cyan))/30]"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  />
                  <motion.div
                    className="absolute inset-2 rounded-full border-2 border-[hsl(var(--peptoma-cyan))/60] border-t-transparent"
                    animate={{ rotate: -360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Dna className="w-8 h-8 text-[hsl(var(--peptoma-cyan))]" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <p className="font-mono text-[hsl(var(--peptoma-cyan))] text-sm tracking-widest">
                    {depth === "deep" ? "DEEP ANALYSIS IN PROGRESS" : "ANALYSIS IN PROGRESS"}
                  </p>
                  <div className="space-y-1 text-xs font-mono text-muted-foreground">
                    {(depth === "deep" ? ANALYSIS_STEPS_DEEP : ANALYSIS_STEPS_STANDARD).map((step, i) => (
                      <motion.p key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.4 }}>
                        <span className="text-[hsl(var(--peptoma-cyan))]">▶</span> {step}
                      </motion.p>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {result && !isPending && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-[hsl(var(--peptoma-cyan))/30] bg-card/60 backdrop-blur-sm p-6 space-y-5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[hsl(var(--peptoma-green))]" />
                    <span className="text-xs font-mono text-[hsl(var(--peptoma-green))] tracking-widest uppercase">Analysis Complete</span>
                  </div>
                  <button onClick={handleReset} className="flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
                    <RotateCcw className="w-3 h-3" /> New Run
                  </button>
                </div>

                <div className="p-3 bg-background/60 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-mono text-muted-foreground">Sequence</p>
                    {result.depth && (
                      <span className={cn("text-[10px] font-mono px-2 py-0.5 rounded border uppercase tracking-widest",
                        result.depth === "deep"
                          ? "border-[hsl(var(--peptoma-gold))/30] text-[hsl(var(--peptoma-gold))] bg-[hsl(var(--peptoma-gold))/10]"
                          : "border-border text-muted-foreground"
                      )}>
                        {result.depth}
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-sm text-foreground break-all tracking-widest">{result.sequence}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {result.structurePrediction && <StructureBadge type={result.structurePrediction} />}
                  {result.toxicityRisk && <ToxicityBadge risk={result.toxicityRisk} />}
                  {result.bioactivityLabel && (
                    <span className="text-xs font-mono px-2 py-0.5 rounded border border-[hsl(var(--peptoma-cyan))/20] bg-[hsl(var(--peptoma-cyan))/5] text-[hsl(var(--peptoma-cyan))/80] uppercase tracking-widest">
                      {result.bioactivityLabel}
                    </span>
                  )}
                  {result.diseaseTarget && (
                    <span className="text-xs font-mono px-2 py-0.5 rounded border border-[hsl(var(--peptoma-gold))/30] bg-[hsl(var(--peptoma-gold))/10] text-[hsl(var(--peptoma-gold))] uppercase tracking-widest">
                      {result.diseaseTarget}
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <ScoreBar label="Bioactivity Score" value={result.bioactivityScore} color="bg-[hsl(var(--peptoma-cyan))]" />
                  <ScoreBar label="Confidence Score" value={result.confidenceScore} color="bg-[hsl(var(--peptoma-gold))]" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Molecular Weight", value: result.molecularWeight ? `${result.molecularWeight} Da` : "—" },
                    { label: "Hydrophobicity", value: result.hydrophobicityIndex?.toFixed(2) ?? "—" },
                    { label: "Charge @ pH7", value: result.chargeAtPH7?.toFixed(1) ?? "—" },
                    { label: "Half-Life", value: result.halfLife ?? "—" },
                  ].map(({ label, value }) => (
                    <div key={label} className="p-3 bg-background/40 rounded-lg border border-border">
                      <p className="text-xs font-mono text-muted-foreground mb-1 tracking-widest uppercase">{label}</p>
                      <p className="font-mono text-sm text-foreground">{value}</p>
                    </div>
                  ))}
                </div>

                {result.tags && result.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {result.tags.map((tag) => (
                      <span key={tag} className="text-xs font-mono px-2 py-0.5 rounded bg-muted/40 text-muted-foreground border border-border">#{tag}</span>
                    ))}
                  </div>
                )}

                {/* Annotation Suggestions */}
                {result.annotationSuggestions && result.annotationSuggestions.length > 0 && (
                  <div className="rounded-lg border border-[hsl(var(--peptoma-gold))/20] bg-[hsl(var(--peptoma-gold))/5] p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="w-3.5 h-3.5 text-[hsl(var(--peptoma-gold))]" />
                      <p className="text-xs font-mono text-[hsl(var(--peptoma-gold))] tracking-widest uppercase">AI Annotation Suggestions</p>
                    </div>
                    <ul className="space-y-2">
                      {result.annotationSuggestions.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs font-mono text-muted-foreground">
                          <span className="text-[hsl(var(--peptoma-gold))/60] mt-0.5 shrink-0">▸</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                    <p className="text-[10px] font-mono text-muted-foreground/60">Annotate this sequence to earn $PEPTOMA and contribute to the knowledge graph.</p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Link href="/feed">
                    <a className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-[hsl(var(--peptoma-cyan))/30] text-[hsl(var(--peptoma-cyan))] font-mono text-sm rounded-lg hover:bg-[hsl(var(--peptoma-cyan))/10] transition-colors">
                      View in Feed
                    </a>
                  </Link>
                  <Link href={`/annotate/${result.id}`}>
                    <a className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[hsl(var(--peptoma-cyan))] text-black font-mono text-sm font-bold rounded-lg hover:bg-[hsl(var(--peptoma-cyan))/90] transition-colors">
                      Annotate
                    </a>
                  </Link>
                </div>
              </motion.div>
            )}

            {!result && !isPending && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl border border-border/50 bg-card/30 p-8 flex flex-col items-center justify-center h-full min-h-[400px] space-y-4 text-center"
              >
                <div className="w-16 h-16 rounded-full border border-border/50 flex items-center justify-center">
                  <Dna className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <div>
                  <p className="font-mono text-muted-foreground text-sm">Results will appear here</p>
                  <p className="font-mono text-muted-foreground/60 text-xs mt-1">Submit a sequence or ask the AI Copilot to begin</p>
                </div>
                <div className="space-y-1.5 text-xs font-mono text-muted-foreground/50 text-left">
                  <p className="flex items-center gap-2"><span className="text-[hsl(var(--peptoma-cyan))/40]">▸</span> Standard: structure + bioactivity</p>
                  <p className="flex items-center gap-2"><span className="text-[hsl(var(--peptoma-gold))/40]">▸</span> Deep: extended AI modeling + annotation suggestions</p>
                  <p className="flex items-center gap-2"><span className="text-green-400/40">▸</span> Standard free · Deep costs 1,000 $PEPTM/session</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground/40">
                  <Clock className="w-3 h-3" />
                  Typical run: &lt;2s
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Vril serum recommendations — always shown after analysis */}
          {result && !isPending && (
            <VrilRecommendation
              bioactivityLabel={result.bioactivityLabel}
              diseaseTarget={result.diseaseTarget}
            />
          )}
        </div>
      </div>

      {/* Payment modal */}
      <LabPaymentModal
        open={showPayment}
        fromAddress={address}
        peptomBalance={peptomBalance}
        sendTx={sendTransaction}
        onSuccess={handlePaymentSuccess}
        onClose={() => setShowPayment(false)}
      />
    </div>
  );
}
