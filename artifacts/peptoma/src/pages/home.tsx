import { useGetFeedStats, useGetTrendingSequences } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
  Dna, Activity, Users, ShieldAlert, TrendingUp, ArrowRight,
  Beaker, Microscope, Atom, Zap, FlaskConical, Network,
  ChevronRight, Check, Coins, BookOpen, Shield,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// ── Sequence Terminal ────────────────────────────────────────────────────────
const DEMO_SEQS = [
  { seq: "KWKLFKKIEKVGRIVRIK", label: "ANTIMICROBIAL", score: 87, target: "E. coli membrane" },
  { seq: "GIGKFLHSAKKFGKAFVGEIMNS", label: "ANTI-INFLAMMATORY", score: 91, target: "IL-6 receptor" },
  { seq: "ACTHHRIIGL", label: "NEUROPEPTIDE", score: 74, target: "GPCR · CNS signaling" },
  { seq: "FLPIGRLVPRGL", label: "ANTIFUNGAL", score: 82, target: "Candida cell wall" },
];

function SequenceTerminal() {
  const [idx, setIdx] = useState(0);
  const [chars, setChars] = useState(0);
  const [phase, setPhase] = useState<"typing" | "analyzing" | "result">("typing");
  const [prog, setProg] = useState({ pb: 0, esm: 0 });
  const cur = DEMO_SEQS[idx];

  useEffect(() => {
    setChars(0); setProg({ pb: 0, esm: 0 }); setPhase("typing");
  }, [idx]);

  useEffect(() => {
    if (phase === "typing") {
      if (chars < cur.seq.length) {
        const t = setTimeout(() => setChars(c => c + 1), 55);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setPhase("analyzing"), 300);
      return () => clearTimeout(t);
    }
    if (phase === "analyzing") {
      const iv = setInterval(() => {
        setProg(p => {
          const next = { pb: Math.min(100, p.pb + 4), esm: Math.min(100, p.esm + 3) };
          if (next.pb >= 100 && next.esm >= 100) { clearInterval(iv); setTimeout(() => setPhase("result"), 200); }
          return next;
        });
      }, 40);
      return () => clearInterval(iv);
    }
    if (phase === "result") {
      const t = setTimeout(() => setIdx(i => (i + 1) % DEMO_SEQS.length), 3200);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [phase, chars, cur.seq.length]);

  const AA_COLORS: Record<string, string> = {
    K: "#3b82f6", R: "#3b82f6", H: "#818cf8",
    D: "#ef4444", E: "#ef4444",
    S: "#22c55e", T: "#22c55e", N: "#4ade80", Q: "#4ade80",
    C: "#eab308", M: "#d97706",
    F: "#a78bfa", Y: "#c084fc", W: "#e879f9",
    A: "#94a3b8", G: "#94a3b8", V: "#94a3b8", L: "#94a3b8", I: "#94a3b8", P: "#94a3b8",
  };

  const Bar = ({ val, color }: { val: number; color: string }) => (
    <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
      <motion.div className="h-full rounded-full" style={{ background: color }} animate={{ width: `${val}%` }} transition={{ duration: 0.1 }} />
    </div>
  );

  return (
    <div
      className="w-full rounded-xl border overflow-hidden font-mono text-[11px]"
      style={{ background: "#020a0c", borderColor: "hsl(var(--peptoma-cyan) / 0.2)" }}
    >
      {/* Terminal top bar */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b" style={{ borderColor: "hsl(var(--peptoma-cyan) / 0.12)", background: "#030d10" }}>
        <div className="w-2 h-2 rounded-full bg-red-500/70" />
        <div className="w-2 h-2 rounded-full bg-yellow-500/70" />
        <div className="w-2 h-2 rounded-full bg-green-500/70" />
        <span className="ml-2 text-white/25 tracking-widest text-[9px]">PEPTOMA · SEQUENCE ANALYZER v2.1</span>
        <motion.div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: "hsl(var(--peptoma-cyan))" }} animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
      </div>

      <div className="p-4 space-y-3">
        {/* Input line */}
        <div>
          <span className="text-white/30">$ </span>
          <span style={{ color: "hsl(var(--peptoma-cyan))" }}>analyze</span>
          <span className="text-white/40"> --depth=deep --engine=peptoma-ai</span>
        </div>

        {/* Sequence display */}
        <div className="flex flex-wrap gap-0.5 min-h-[28px]">
          {cur.seq.split("").slice(0, chars).map((aa, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.08 }}
              className="inline-block w-5 h-5 rounded text-center leading-5 text-[10px] font-bold"
              style={{ background: (AA_COLORS[aa] ?? "#94a3b8") + "25", color: AA_COLORS[aa] ?? "#94a3b8" }}
            >
              {aa}
            </motion.span>
          ))}
          {phase === "typing" && chars < cur.seq.length && (
            <motion.span className="inline-block w-0.5 h-5 bg-white/60 ml-0.5" animate={{ opacity: [1, 0] }} transition={{ duration: 0.6, repeat: Infinity }} />
          )}
        </div>

        {/* Progress bars */}
        {(phase === "analyzing" || phase === "result") && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 pt-1 border-t border-white/8">
            <div className="flex items-center gap-2">
              <span className="text-white/40 w-16">BioAI</span>
              <Bar val={prog.pb} color="hsl(var(--peptoma-cyan))" />
              <span style={{ color: "hsl(var(--peptoma-cyan))" }}>{prog.pb}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/40 w-16">Structure</span>
              <Bar val={prog.esm} color="hsl(var(--peptoma-green))" />
              <span style={{ color: "hsl(var(--peptoma-green))" }}>{prog.esm}%</span>
            </div>
          </motion.div>
        )}

        {/* Result */}
        <AnimatePresence>
          {phase === "result" && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="pt-2 border-t space-y-1.5"
              style={{ borderColor: "hsl(var(--peptoma-cyan) / 0.2)" }}
            >
              <div className="flex justify-between">
                <span className="text-white/35">BIOACTIVITY LABEL</span>
                <span className="font-bold" style={{ color: "hsl(var(--peptoma-cyan))" }}>{cur.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/35">SCORE</span>
                <span className="font-bold text-white">{cur.score}<span className="text-white/30">/100</span></span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/35">TARGET</span>
                <span style={{ color: "hsl(var(--peptoma-gold))" }}>{cur.target}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-white/35">LENGTH</span>
                <span className="text-white/60">{cur.seq.length} aa</span>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <div className="w-1 h-1 rounded-full" style={{ background: "hsl(var(--peptoma-green))" }} />
                <span style={{ color: "hsl(var(--peptoma-green))" }}>ANALYSIS COMPLETE · SAVED TO CHAIN</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Floating chemical formula chip
function FormulaChip({ formula, delay = 0 }: { formula: string; delay?: number }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: [0.25, 0.55, 0.25], y: [0, -5, 0] }}
      transition={{ duration: 5 + delay, repeat: Infinity, ease: "easeInOut", delay }}
      className="inline-block px-2 py-0.5 border border-[hsl(var(--peptoma-cyan))/15] bg-[hsl(var(--peptoma-cyan))/4] rounded text-[9px] font-mono text-[hsl(var(--peptoma-cyan))/45] backdrop-blur-sm"
    >
      {formula}
    </motion.span>
  );
}

function StatPanel({
  label, value, icon: Icon, color = "cyan",
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color?: "cyan" | "gold" | "green";
}) {
  const colorClass = {
    cyan: "text-[hsl(var(--peptoma-cyan))] border-[hsl(var(--peptoma-cyan))/20] bg-[hsl(var(--peptoma-cyan))/5]",
    gold: "text-[hsl(var(--peptoma-gold))] border-[hsl(var(--peptoma-gold))/20] bg-[hsl(var(--peptoma-gold))/5]",
    green: "text-[hsl(var(--peptoma-green))] border-[hsl(var(--peptoma-green))/20] bg-[hsl(var(--peptoma-green))/5]",
  }[color];

  const dotColor = {
    cyan: "bg-[hsl(var(--peptoma-cyan))]",
    gold: "bg-[hsl(var(--peptoma-gold))]",
    green: "bg-[hsl(var(--peptoma-green))]",
  }[color];

  return (
    <div className={`rounded-sm border p-3 flex items-center gap-3 ${colorClass}`}>
      <Icon className="w-4 h-4 shrink-0 opacity-80" />
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-mono text-muted-foreground tracking-widest uppercase mb-0.5">{label}</p>
        <p className="text-base font-bold font-mono leading-tight">{value}</p>
      </div>
      <motion.div
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`}
        animate={{ opacity: [1, 0.2, 1] }}
        transition={{ duration: 1.8, repeat: Infinity }}
      />
    </div>
  );
}

const HOW_STEPS = [
  {
    num: "01",
    icon: FlaskConical,
    title: "Submit a Sequence",
    desc: "Enter any peptide sequence in single-letter or FASTA format. Choose Standard or Deep analysis depth — Deep runs extended structure modeling and generates comprehensive annotation suggestions.",
    tag: "THE LAB",
    href: "/lab",
  },
  {
    num: "02",
    icon: Atom,
    title: "AI Runs the Analysis",
    desc: "The PEPTOMA AI Engine computes bioactivity scores, predicts structure conformation, and cross-references known peptide databases. Results land in the feed within seconds.",
    tag: "AUTOMATED",
    href: "/feed",
  },
  {
    num: "03",
    icon: Users,
    title: "Community Annotates",
    desc: "Researchers confirm, challenge, or extend results. Each annotation is weighted by the annotator's stake tier. Consensus emerges from the crowd, not a single lab.",
    tag: "ANNOTATE",
    href: "/feed",
  },
  {
    num: "04",
    icon: Coins,
    title: "Earn $PEPTOMA",
    desc: "Stake to unlock higher analysis depth, API access, and multiplied annotation rewards. Pro and Lab tier stakers earn bonus emissions on every validated annotation.",
    tag: "$PEPTOMA",
    href: "/token",
  },
];

const PEPTOMA_CA = "HopMHHPfSV2kWQLghKt6xR1oWbPRLA2UyxnKGoPpump";

function CABox() {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(PEPTOMA_CA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const short = `${PEPTOMA_CA.slice(0, 6)}...${PEPTOMA_CA.slice(-6)}`;
  return (
    <div className="relative z-10 flex flex-col items-center gap-3 pt-4 pb-10 px-6">
      <p className="text-[9px] font-mono tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
        CONTRACT ADDRESS · SPL TOKEN · SOLANA MAINNET
      </p>
      <button
        onClick={copy}
        className="group flex items-center gap-3 px-5 py-3 rounded-xl border transition-all hover:scale-[1.02]"
        style={{
          borderColor: "hsl(var(--peptoma-cyan) / 0.2)",
          background: "hsl(var(--peptoma-cyan) / 0.04)",
        }}
      >
        <span className="hidden sm:block font-mono text-xs tracking-widest" style={{ color: "hsl(var(--peptoma-cyan))" }}>
          {PEPTOMA_CA}
        </span>
        <span className="sm:hidden font-mono text-xs tracking-widest" style={{ color: "hsl(var(--peptoma-cyan))" }}>
          {short}
        </span>
        <span
          className="shrink-0 flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-md transition-colors"
          style={{
            background: copied ? "hsl(var(--peptoma-green) / 0.15)" : "hsl(var(--peptoma-cyan) / 0.1)",
            color: copied ? "hsl(var(--peptoma-green))" : "hsl(var(--peptoma-cyan))",
          }}
        >
          {copied ? <Check className="w-3 h-3" /> : <Coins className="w-3 h-3" />}
          {copied ? "COPIED" : "COPY CA"}
        </span>
      </button>
      <div className="flex items-center gap-4">
        <a
          href={`https://solscan.io/token/${PEPTOMA_CA}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[9px] font-mono tracking-widest transition-opacity hover:opacity-100"
          style={{ color: "rgba(255,255,255,0.25)" }}
        >
          SOLSCAN ↗
        </a>
        <span style={{ color: "rgba(255,255,255,0.1)" }}>·</span>
        <a
          href={`https://birdeye.so/token/${PEPTOMA_CA}?chain=solana`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[9px] font-mono tracking-widest transition-opacity hover:opacity-100"
          style={{ color: "rgba(255,255,255,0.25)" }}
        >
          BIRDEYE ↗
        </a>
        <span style={{ color: "rgba(255,255,255,0.1)" }}>·</span>
        <a
          href={`https://raydium.io/swap/?inputMint=sol&outputMint=${PEPTOMA_CA}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[9px] font-mono tracking-widest transition-opacity hover:opacity-100"
          style={{ color: "rgba(255,255,255,0.25)" }}
        >
          RAYDIUM ↗
        </a>
      </div>
    </div>
  );
}

const FAQ_ITEMS = [
  {
    q: "What is PEPTOMA?",
    a: "PEPTOMA is an open DeSci (Decentralised Science) platform for peptide research. It combines the proprietary PEPTOMA AI Engine with a community annotation layer and on-chain provenance on Solana — giving any researcher in the world access to institutional-grade peptide analysis tools.",
  },
  {
    q: "Do I need a PhD or lab affiliation to use PEPTOMA?",
    a: "No. All you need is a Solana wallet (Phantom, Backpack, etc.). Any researcher, citizen scientist, biotech founder, or AI developer can submit sequences, annotate results, and earn $PEPTOMA — regardless of institutional affiliation.",
  },
  {
    q: "How accurate are the AI predictions?",
    a: "The PEPTOMA AI Engine combines biochemical computation with AI inference to produce bioactivity scores, structure predictions, toxicity assessments, and confidence ratings. All results should be treated as computational pre-screens — not final experimental validation. Wet-lab confirmation is required before therapeutic claims.",
  },
  {
    q: "What is $PEPTOMA and how do I earn it?",
    a: "$PEPTOMA is the native protocol token. It is earned by submitting annotations that reach community consensus. Higher stake tiers (Pro, Lab) earn higher reward multipliers. It is spent to run analyses: Standard analysis is free, Deep analysis runs extended AI modeling. Token launch terms and distribution are to be announced.",
  },
  {
    q: "Is the data on PEPTOMA public?",
    a: "Yes. Every sequence analysis and annotation is public and permanently recorded on Solana. This creates an auditable, immutable research record — no paywalls, no embargoes, and no retroactive IP disputes. The entire peptide knowledge graph is open to query by anyone.",
  },
  {
    q: "Can AI agents or developer tools access PEPTOMA?",
    a: "Yes. Pro and Lab tier stakers get REST API access for programmatic sequence submission, result fetching, and annotation posting. This enables AI agents and biotech pipelines to integrate PEPTOMA's intelligence layer at scale.",
  },
  {
    q: "What chains does PEPTOMA run on?",
    a: "PEPTOMA runs on Solana Mainnet for on-chain provenance and token infrastructure. Solana's high throughput and low fees make it ideal for recording research annotations at scale. Analysis computation runs on our off-chain AI infrastructure.",
  },
  {
    q: "Where can I buy $PEPTOMA?",
    a: "$PEPTOMA is live on Solana Mainnet. CA: HopMHHPfSV2kWQLghKt6xR1oWbPRLA2UyxnKGoPpump — available on Raydium and trackable on Birdeye and Solscan. Always verify the contract address before any transaction.",
  },
];

function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section>
      <div className="flex items-center gap-2 mb-5 border-b border-border pb-3">
        <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
        <p className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">FAQ — Frequently Asked Questions</p>
      </div>
      <div className="space-y-2">
        {FAQ_ITEMS.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * i }}
            className="rounded-xl border border-border bg-card overflow-hidden"
          >
            <button
              className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left hover:bg-muted/40 transition-colors"
              onClick={() => setOpen(open === i ? null : i)}
            >
              <span className="font-mono font-bold text-sm text-foreground">{item.q}</span>
              <motion.span
                animate={{ rotate: open === i ? 45 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-muted-foreground shrink-0 mt-0.5 text-lg leading-none"
              >+</motion.span>
            </button>
            <AnimatePresence>
              {open === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 border-t border-border pt-3">
                    <p className="text-xs font-mono text-muted-foreground leading-relaxed">{item.a}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function ActivityTicker({ items }: { items: string[] }) {
  if (items.length === 0) {
    return (
      <div className="h-4 w-full bg-muted/20 rounded animate-pulse" />
    );
  }
  return (
    <div className="overflow-hidden relative">
      <motion.div
        className="flex gap-8 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
      >
        {[...items, ...items].map((item, i) => (
          <span key={i} className="inline-flex items-center gap-2 text-[10px] font-mono text-muted-foreground tracking-wide shrink-0">
            <span className="w-1 h-1 rounded-full bg-[hsl(var(--peptoma-cyan))] opacity-60" />
            {item}
          </span>
        ))}
      </motion.div>
      <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-background to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none" />
    </div>
  );
}

export default function Home() {
  const { data: stats, isLoading: statsLoading } = useGetFeedStats();
  const { data: trending, isLoading: trendingLoading } = useGetTrendingSequences();

  const tickerItems = (trending ?? []).map((seq) => {
    const seq12 = seq.sequence.slice(0, 12);
    const label = seq.bioactivityLabel?.toUpperCase() ?? "ANALYZED";
    const target = seq.diseaseTarget ? ` · ${seq.diseaseTarget.toUpperCase()}` : "";
    const score = seq.bioactivityScore != null ? ` · score ${seq.bioactivityScore}` : "";
    return `${seq12} · ${label}${target}${score}`;
  });

  return (
    <div className="space-y-10 pb-16">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative rounded-2xl overflow-hidden"
        style={{ background: "linear-gradient(145deg, #030e12 0%, #050d10 60%, #040c0f 100%)" }}
      >
        {/* Grid bg */}
        <div className="absolute inset-0 opacity-[0.035]" style={{
          backgroundImage: "linear-gradient(hsl(var(--peptoma-cyan)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--peptoma-cyan)) 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }} />

        {/* Scan line sweep */}
        <motion.div
          className="absolute inset-x-0 h-px opacity-20 pointer-events-none"
          style={{ background: "linear-gradient(90deg, transparent, hsl(var(--peptoma-cyan)), transparent)" }}
          animate={{ top: ["0%", "100%", "0%"] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />

        {/* Corner HUD brackets */}
        {[["top-3 left-3", "border-t border-l"], ["top-3 right-3", "border-t border-r"], ["bottom-3 left-3", "border-b border-l"], ["bottom-3 right-3", "border-b border-r"]].map(([pos, border]) => (
          <div key={pos} className={`absolute ${pos} w-4 h-4 ${border} opacity-30`} style={{ borderColor: "hsl(var(--peptoma-cyan))" }} />
        ))}

        <div className="relative z-10 p-6 md:p-10">
          {/* Status bar */}
          <div className="flex items-center gap-4 mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-mono tracking-widest" style={{ borderColor: "hsl(var(--peptoma-cyan) / 0.25)", color: "hsl(var(--peptoma-cyan))", background: "hsl(var(--peptoma-cyan) / 0.05)" }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "hsl(var(--peptoma-cyan))" }} />
              PIPELINE ONLINE · SOLANA MAINNET
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono" style={{ color: "hsl(var(--peptoma-green))" }}>
              <span className="w-1 h-1 rounded-full" style={{ background: "hsl(var(--peptoma-green))" }} />
              AI MODELS READY
            </div>
          </div>

          {/* Two columns */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-12">
            {/* Left — headline */}
            <div className="flex-1">
              <motion.h1
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15, duration: 0.55 }}
                className="font-serif italic text-4xl md:text-5xl xl:text-6xl text-white leading-[1.1] tracking-tight mb-5"
              >
                Open Intelligence<br />
                for{" "}
                <span style={{ color: "hsl(var(--peptoma-cyan))" }}>
                  Peptide Science.
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-white/50 font-mono text-sm leading-relaxed max-w-md mb-7"
              >
                Run by AI, powered by community, secured on Solana. Submit peptide sequences, earn $PEPTOMA by annotating, and build the open decentralised research graph.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-wrap gap-3 mb-7"
              >
                <Link href="/lab">
                  <div className="inline-flex items-center gap-2 px-5 py-2.5 font-mono text-sm font-bold rounded-lg cursor-pointer group shadow-lg transition-opacity hover:opacity-90"
                    style={{ background: "hsl(var(--peptoma-cyan))", color: "#020e12" }}>
                    <Dna className="w-4 h-4" />
                    START RUN
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
                <Link href="/feed">
                  <div className="inline-flex items-center gap-2 px-5 py-2.5 border font-mono text-sm rounded-lg cursor-pointer transition-colors hover:bg-white/5"
                    style={{ borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)" }}>
                    EXPLORE FEED
                  </div>
                </Link>
              </motion.div>

              {/* Key stats row */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex flex-wrap gap-5"
              >
                {[
                  { icon: Shield, label: "On-chain provenance" },
                  { icon: Atom, label: "PEPTOMA AI Engine" },
                  { icon: Users, label: "Stake-weighted consensus" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-1.5 text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>
                    <Icon className="w-3 h-3" style={{ color: "hsl(var(--peptoma-cyan))" }} />
                    {label}
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right — live terminal */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25, duration: 0.55 }}
              className="w-full lg:w-[400px] xl:w-[440px] shrink-0"
            >
              <SequenceTerminal />
              <div className="flex items-center gap-2 mt-3">
                <span className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>
                  DEMO · CPK colour scheme · K=Lys R=Arg H=His D=Asp E=Glu
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Live activity ticker */}
      <div className="py-2 border-y border-border/50">
        <div className="flex items-center gap-3 mb-1.5">
          <span className="text-[9px] font-mono text-muted-foreground tracking-widest uppercase shrink-0">LIVE ACTIVITY</span>
          <motion.div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--peptoma-cyan))]" animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />
        </div>
        <ActivityTicker items={tickerItems} />
      </div>

      {/* Platform Readout */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Beaker className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">Platform Readout</p>
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--peptoma-green))] ml-1"
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-card/40 rounded-sm border border-border animate-pulse" />
            ))
          ) : (
            <>
              <StatPanel label="Total Analyses" value={stats?.totalAnalyses ?? 0} icon={Microscope} color="cyan" />
              <StatPanel label="Avg Bioactivity" value={stats?.avgBioactivityScore != null ? `${Number(stats.avgBioactivityScore).toFixed(1)}/100` : "—"} icon={Atom} color="gold" />
              <StatPanel label="Annotations" value={stats?.totalAnnotations ?? 0} icon={Users} color="green" />
              <StatPanel label="24h Activity" value={`${stats?.recentActivity ?? 0} runs`} icon={Zap} color="cyan" />
            </>
          )}
        </div>
      </section>

      {/* Trending sequences */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-xs font-mono font-bold flex items-center gap-2 text-muted-foreground tracking-widest uppercase">
            <TrendingUp className="text-[hsl(var(--peptoma-cyan))] w-3.5 h-3.5" />
            TRENDING SEQUENCES
          </h2>
          <Link href="/feed">
            <span className="text-[hsl(var(--peptoma-cyan))] hover:opacity-70 font-mono text-[10px] cursor-pointer tracking-widest transition-opacity">
              VIEW ALL →
            </span>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {trendingLoading ? (
            Array(3).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-sm bg-card border border-border" />
            ))
          ) : trending?.slice(0, 3).map((seq, i) => (
            <motion.div
              key={seq.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Link href={`/annotate/${seq.id}`}>
                <div className="bg-card border border-border rounded-sm p-4 hover:border-[hsl(var(--peptoma-cyan))/40] transition-all duration-200 cursor-pointer group relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--peptoma-cyan))/20] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="flex justify-between items-start mb-3">
                    <div className="font-mono text-[hsl(var(--peptoma-cyan))] text-sm truncate max-w-[160px]">
                      {seq.sequence.substring(0, 14)}…
                    </div>
                    <div className="text-[10px] font-mono text-[hsl(var(--peptoma-gold))] bg-[hsl(var(--peptoma-gold))/10] border border-[hsl(var(--peptoma-gold))/20] px-1.5 py-0.5 rounded-sm">
                      {seq.voteCount} VOTES
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-muted-foreground tracking-widest">BIOACTIVITY</span>
                      <span className="text-foreground">{seq.bioactivityScore}/100</span>
                    </div>
                    <div className="w-full bg-background h-0.5 rounded-full overflow-hidden">
                      <motion.div
                        className="bg-[hsl(var(--peptoma-cyan))] h-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${seq.bioactivityScore}%` }}
                        transition={{ duration: 0.8, delay: i * 0.15 }}
                      />
                    </div>
                    {seq.bioactivityLabel && (
                      <div className="text-[10px] font-mono text-[hsl(var(--peptoma-cyan))/55] uppercase tracking-widest">
                        {seq.bioactivityLabel}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-border flex justify-between items-center text-[10px] font-mono text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" />
                      {seq.diseaseTarget || "UNKNOWN"}
                    </div>
                    <div>{seq.annotationCount} ANNOTATIONS</div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section>
        <div className="flex items-center gap-2 mb-6 border-b border-border pb-3">
          <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">How It Works</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {HOW_STEPS.map(({ num, icon: Icon, title, desc, tag, href }, i) => (
            <Link key={num} href={href}>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08 }}
                className="bg-card border border-border rounded-sm p-5 relative group hover:border-[hsl(var(--peptoma-cyan))/30] transition-colors cursor-pointer h-full"
              >
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--peptoma-cyan))/20] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-start justify-between mb-4">
                  <div className="w-9 h-9 rounded-sm bg-[hsl(var(--peptoma-cyan))/8] border border-[hsl(var(--peptoma-cyan))/20] flex items-center justify-center group-hover:bg-[hsl(var(--peptoma-cyan))/15] transition-colors">
                    <Icon className="w-4 h-4 text-[hsl(var(--peptoma-cyan))]" />
                  </div>
                  <span className="font-display font-extrabold text-2xl text-muted-foreground/20 leading-none">{num}</span>
                </div>
                <p className="font-display font-bold text-sm text-foreground mb-2">{title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed font-mono mb-4">{desc}</p>
                <span className="text-[10px] font-mono text-[hsl(var(--peptoma-cyan))] tracking-widest group-hover:opacity-70 transition-opacity">
                  {tag} →
                </span>
              </motion.div>
            </Link>
          ))}
        </div>
      </section>

      {/* Research Impact (real data) */}
      <section>
        <div className="flex items-center gap-2 mb-4 border-b border-border pb-3">
          <Network className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">Research Impact</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-card/40 rounded-sm border border-border animate-pulse" />
            ))
          ) : (
            [
              { label: "Sequences analyzed", value: stats?.totalAnalyses ?? 0, color: "cyan" },
              { label: "Total annotations", value: stats?.totalAnnotations ?? 0, color: "green" },
              { label: "Avg bioactivity score", value: stats?.avgBioactivityScore != null ? `${Number(stats.avgBioactivityScore).toFixed(1)}/100` : "—", color: "gold" },
              { label: "Active today (runs)", value: stats?.recentActivity ?? 0, color: "cyan" },
            ].map(({ label, value, color }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 * i }}
                className="bg-card border border-border rounded-sm p-4"
              >
                <p className={`text-2xl font-display font-extrabold mb-0.5 ${
                  color === "cyan" ? "text-[hsl(var(--peptoma-cyan))]" :
                  color === "gold" ? "text-[hsl(var(--peptoma-gold))]" :
                  "text-[hsl(var(--peptoma-green))]"
                }`}>{typeof value === "number" ? value.toLocaleString() : value}</p>
                <p className="text-[10px] font-mono text-muted-foreground leading-snug">{label}</p>
              </motion.div>
            ))
          )}
        </div>
      </section>

      {/* Token Section */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15 }}
        className="rounded-2xl overflow-hidden relative"
        style={{ background: "linear-gradient(160deg, #040f12 0%, #060d10 50%, #040c0f 100%)" }}
      >
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: "linear-gradient(hsl(var(--peptoma-cyan)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--peptoma-cyan)) 1px, transparent 1px)",
          backgroundSize: "48px 48px"
        }} />

        {/* Headline */}
        <div className="relative z-10 text-center pt-14 pb-4 px-6">
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="font-serif italic text-4xl md:text-5xl lg:text-6xl text-white leading-tight tracking-tight"
          >
            the token at the{" "}
            <span style={{ color: "hsl(var(--peptoma-gold))" }}>
              core of the ecosystem.
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-white/45 font-mono text-xs md:text-sm mt-4 max-w-lg mx-auto leading-relaxed"
          >
            $PEPTOMA powers research analysis, stake-weighted governance, and protocol revenue sharing.
            Token launch terms to be announced.
          </motion.p>
        </div>

        {/* HUD + Coin Visual */}
        <div className="relative flex items-center justify-center" style={{ height: 400 }}>
          {/* SVG Rings */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 400 400"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Tick ring */}
            {Array.from({ length: 72 }).map((_, i) => {
              const angle = (i * 5) * Math.PI / 180;
              const outer = 185;
              const len = i % 9 === 0 ? 14 : i % 3 === 0 ? 8 : 4;
              const x1 = 200 + outer * Math.cos(angle);
              const y1 = 200 + outer * Math.sin(angle);
              const x2 = 200 + (outer - len) * Math.cos(angle);
              const y2 = 200 + (outer - len) * Math.sin(angle);
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(var(--peptoma-cyan))" strokeOpacity={i % 9 === 0 ? 0.5 : 0.2} strokeWidth={i % 9 === 0 ? 1.5 : 0.8} />;
            })}
            {/* Outer border circle */}
            <circle cx="200" cy="200" r="185" stroke="hsl(var(--peptoma-cyan))" strokeOpacity="0.12" strokeWidth="1" fill="none" />
            {/* Inner rings */}
            <circle cx="200" cy="200" r="160" stroke="hsl(var(--peptoma-cyan))" strokeOpacity="0.08" strokeWidth="1" fill="none" strokeDasharray="3 9" />
            <circle cx="200" cy="200" r="130" stroke="hsl(var(--peptoma-cyan))" strokeOpacity="0.1" strokeWidth="1" fill="none" />
            <circle cx="200" cy="200" r="100" stroke="hsl(var(--peptoma-cyan))" strokeOpacity="0.07" strokeWidth="1" fill="none" strokeDasharray="2 6" />
            {/* Cross hairs */}
            <line x1="15" y1="200" x2="385" y2="200" stroke="hsl(var(--peptoma-cyan))" strokeOpacity="0.06" strokeWidth="0.5" />
            <line x1="200" y1="15" x2="200" y2="385" stroke="hsl(var(--peptoma-cyan))" strokeOpacity="0.06" strokeWidth="0.5" />
            {/* Corner brackets */}
            {[[-1,-1],[1,-1],[1,1],[-1,1]].map(([sx, sy], i) => (
              <g key={i}>
                <line x1={200 + sx * 175} y1={200 + sy * 160} x2={200 + sx * 175} y2={200 + sy * 175} stroke="hsl(var(--peptoma-cyan))" strokeOpacity="0.35" strokeWidth="1.5" />
                <line x1={200 + sx * 160} y1={200 + sy * 175} x2={200 + sx * 175} y2={200 + sy * 175} stroke="hsl(var(--peptoma-cyan))" strokeOpacity="0.35" strokeWidth="1.5" />
              </g>
            ))}
          </svg>

          {/* Rotating orbital ring */}
          <motion.div
            className="absolute rounded-full border border-dashed"
            style={{
              width: 320, height: 320,
              borderColor: "hsl(var(--peptoma-cyan) / 0.15)",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            {/* Orbital dot */}
            <div
              className="absolute w-3 h-3 rounded-full"
              style={{
                top: -6, left: "calc(50% - 6px)",
                background: "hsl(var(--peptoma-cyan))",
                boxShadow: "0 0 14px hsl(var(--peptoma-cyan)), 0 0 30px hsl(var(--peptoma-cyan) / 0.4)",
              }}
            />
          </motion.div>

          {/* Slow counter-rotate ring */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 260, height: 260,
              border: "1px solid hsl(var(--peptoma-cyan) / 0.12)",
            }}
            animate={{ rotate: -360 }}
            transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
          />

          {/* 3D Coin */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
            style={{ perspective: 900 }}
            className="relative z-10"
          >
            <motion.div
              animate={{ rotateY: [-18, -10, -18] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              className="w-36 h-36 md:w-44 md:h-44 rounded-full flex flex-col items-center justify-center relative"
              style={{
                background: "radial-gradient(circle at 35% 32%, #f5d070, #c8922a 55%, #7a520e)",
                boxShadow: "-14px 14px 45px rgba(0,0,0,0.85), inset -8px -8px 20px rgba(0,0,0,0.35), inset 6px 6px 16px rgba(255,255,255,0.18), 0 0 60px rgba(200,146,42,0.25)",
                transformStyle: "preserve-3d",
              }}
            >
              {/* Coin rim effect */}
              <div className="absolute inset-2 rounded-full" style={{ border: "1px solid rgba(255,255,255,0.12)" }} />
              <div className="absolute inset-4 rounded-full" style={{ border: "1px solid rgba(255,255,255,0.06)" }} />
              <span
                className="font-serif italic font-bold text-xl md:text-2xl relative z-10"
                style={{ color: "#1a0f00", textShadow: "0 1px 2px rgba(255,200,50,0.3)" }}
              >
                $PEPTOMA
              </span>
              <span
                className="font-mono text-[7px] md:text-[8px] tracking-widest relative z-10 mt-0.5"
                style={{ color: "rgba(30,15,0,0.6)" }}
              >
                ECOSYSTEM
              </span>
            </motion.div>
          </motion.div>
        </div>

        {/* Supply Stats */}
        <div className="relative z-10 text-center pb-6">
          <p className="text-[9px] font-mono tracking-widest mb-3" style={{ color: "hsl(var(--peptoma-cyan) / 0.45)" }}>
            — FIXED SUPPLY
          </p>
          <motion.p
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="font-mono font-extrabold text-4xl md:text-5xl lg:text-6xl tabular-nums tracking-tight"
            style={{ color: "hsl(var(--peptoma-cyan))", textShadow: "0 0 40px hsl(var(--peptoma-cyan) / 0.25)" }}
          >
            1,000,000,000
          </motion.p>
          <p className="text-[9px] font-mono tracking-widest mt-2" style={{ color: "hsl(var(--peptoma-cyan) / 0.35)" }}>
            ONE BILLION $PEPTOMA · IMMUTABLE
          </p>
        </div>

        {/* Pill badges */}
        <div className="relative z-10 flex flex-wrap justify-center gap-3 px-6">
          {[
            { label: "LAUNCH", value: "FAIRLAUNCH", color: "hsl(var(--peptoma-cyan))" },
            { label: "MODEL", value: "SUBSCRIPTION", color: "hsl(var(--peptoma-gold))" },
            { label: "NETWORK", value: "SOLANA", color: "hsl(var(--peptoma-green))" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-mono"
              style={{ borderColor: `${color}30`, background: `${color}0a` }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
              <span style={{ color: "rgba(255,255,255,0.4)" }}>{label}</span>
              <span style={{ color }} className="font-bold tracking-wider">{value}</span>
            </div>
          ))}
        </div>

        {/* Contract Address */}
        <CABox />

      </motion.section>

      {/* Feature tiles */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            icon: Beaker,
            title: "THE LAB",
            desc: "Submit any peptide sequence. Standard or Deep AI analysis — structure prediction, bioactivity scoring, toxicity assessment, and confidence scoring.",
            href: "/lab",
            cta: "OPEN LAB",
          },
          {
            icon: Microscope,
            title: "ANNOTATE",
            desc: "Confirm, challenge, extend, or tag community analyses. Earn $PEPTOMA for every contribution to the decentralized peptide knowledge graph.",
            href: "/feed",
            cta: "VIEW FEED",
          },
          {
            icon: Atom,
            title: "FOR AGENTS",
            desc: "AI agents can submit sequences, fetch results, and post annotations programmatically via REST API. Pro and Lab tier stakers get API key access.",
            href: "/agents",
            cta: "API DOCS",
          },
        ].map(({ icon: Icon, title, desc, href, cta }, i) => (
          <Link key={title} href={href}>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="border border-border bg-card/60 rounded-sm p-5 group hover:border-[hsl(var(--peptoma-cyan))/30] transition-colors relative overflow-hidden cursor-pointer h-full"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--peptoma-cyan))/25] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-8 h-8 rounded-sm border border-[hsl(var(--peptoma-cyan))/20] bg-[hsl(var(--peptoma-cyan))/5] flex items-center justify-center mb-4 group-hover:bg-[hsl(var(--peptoma-cyan))/15] transition-colors">
                <Icon className="w-4 h-4 text-[hsl(var(--peptoma-cyan))]" />
              </div>
              <p className="font-mono text-foreground font-bold text-sm mb-2 tracking-widest">{title}</p>
              <p className="font-mono text-muted-foreground text-xs leading-relaxed mb-4">{desc}</p>
              <span className="text-[10px] font-mono text-[hsl(var(--peptoma-cyan))] tracking-widest group-hover:opacity-70 transition-opacity">
                {cta} →
              </span>
            </motion.div>
          </Link>
        ))}
      </section>

      {/* ── Vril Integration Announcement ─────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl overflow-hidden relative border border-[hsl(var(--peptoma-cyan))/20]"
        style={{ background: "linear-gradient(135deg, #030f13 0%, #041210 60%, #050f0a 100%)" }}
      >
        {/* Grid texture */}
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: "linear-gradient(hsl(var(--peptoma-cyan)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--peptoma-cyan)) 1px, transparent 1px)",
          backgroundSize: "32px 32px"
        }} />
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-24 rounded-full blur-3xl opacity-20" style={{ background: "hsl(var(--peptoma-cyan))" }} />

        <div className="relative z-10 p-7 md:p-10">
          <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
            {/* Icon + label */}
            <div className="shrink-0 flex flex-col items-start gap-3">
              <span className="text-[10px] font-mono tracking-widest px-2.5 py-1 rounded border border-[hsl(var(--peptoma-cyan))/30] text-[hsl(var(--peptoma-cyan))] bg-[hsl(var(--peptoma-cyan))/8]">
                ◈ ECOSYSTEM UPDATE
              </span>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[hsl(var(--peptoma-cyan))] animate-pulse" />
                <span className="text-[10px] font-mono text-white/30 tracking-widest">LIVE · MAY 2025</span>
              </div>
            </div>

            {/* Main content */}
            <div className="flex-1">
              <h2 className="font-serif italic text-2xl md:text-3xl text-white leading-snug mb-3">
                PEPTOMA × Vril Peptides —
                <span style={{ color: "hsl(var(--peptoma-cyan))" }}> ecosystem integration is live.</span>
              </h2>
              <p className="text-white/50 font-mono text-sm leading-relaxed">
                Every sequence analysis in The Lab now generates a bioactivity profile that is matched against the full Vril Peptides compound catalog.
                After your analysis completes, you will see a curated list of relevant HPLC-verified research compounds — with real pricing, purity data, and direct purchase links — matched specifically to your peptide's predicted function.
              </p>
              <div className="mt-4 flex flex-wrap gap-4 text-[11px] font-mono text-white/35">
                <span className="flex items-center gap-1.5">
                  <span style={{ color: "hsl(var(--peptoma-cyan))" }}>▸</span>
                  AI classifies bioactivity label from your sequence
                </span>
                <span className="flex items-center gap-1.5">
                  <span style={{ color: "hsl(var(--peptoma-cyan))" }}>▸</span>
                  Disease target feeds keyword matching
                </span>
                <span className="flex items-center gap-1.5">
                  <span style={{ color: "hsl(var(--peptoma-cyan))" }}>▸</span>
                  Top 3 Vril compounds recommended with specs &amp; price
                </span>
              </div>
            </div>

            {/* CTA */}
            <div className="shrink-0 flex flex-col gap-2">
              <a
                href="https://vrilpeptides.com/shop"
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-lg font-mono text-xs font-bold text-black bg-[hsl(var(--peptoma-cyan))] hover:bg-[hsl(var(--peptoma-cyan))/90] transition-colors text-center whitespace-nowrap"
              >
                Browse Vril Shop ↗
              </a>
              <Link href="/lab" className="px-5 py-2.5 rounded-lg font-mono text-xs text-white/60 border border-white/10 hover:border-[hsl(var(--peptoma-cyan))/30] hover:text-white transition-colors text-center whitespace-nowrap">
                Try The Lab →
              </Link>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── About ─────────────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl overflow-hidden relative"
        style={{ background: "linear-gradient(135deg, #030e12 0%, #051014 100%)" }}
      >
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(hsl(var(--peptoma-cyan)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--peptoma-cyan)) 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }} />
        <div className="relative z-10 p-8 md:p-12">
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start">
            {/* Left */}
            <div className="flex-1">
              <p className="text-[10px] font-mono tracking-widest mb-3" style={{ color: "hsl(var(--peptoma-cyan))" }}>— ABOUT PEPTOMA</p>
              <h2 className="font-serif italic text-3xl md:text-4xl text-white leading-tight mb-5">
                Science shouldn't be<br />
                <span style={{ color: "hsl(var(--peptoma-cyan))" }}>locked behind walls.</span>
              </h2>
              <p className="text-white/50 font-mono text-sm leading-relaxed mb-4">
                PEPTOMA is an open decentralised science (DeSci) platform purpose-built for peptide research. We combine the proprietary PEPTOMA AI Engine with a community-driven annotation layer and on-chain provenance on Solana, giving any researcher in the world access to tools previously reserved for well-funded institutions.
              </p>
              <p className="text-white/40 font-mono text-sm leading-relaxed">
                Every sequence submitted, every annotation made, and every consensus reached is permanently recorded on Solana. No paywall. No editorial gatekeeping. No retroactive IP disputes. Just open, verifiable, community-owned peptide science.
              </p>
            </div>
            {/* Right — key numbers */}
            <div className="w-full lg:w-80 shrink-0 grid grid-cols-2 gap-3">
              {[
                { num: "100+", label: "Bioactivity classes recognized by PEPTOMA AI Engine" },
                { num: "<2s", label: "Average Standard analysis turnaround time" },
                { num: "7,000+", label: "Approved peptide drugs globally as of 2024" },
                { num: "$50B+", label: "Projected peptide therapeutics market by 2030" },
              ].map(({ num, label }) => (
                <div key={num} className="rounded-xl border p-4" style={{ borderColor: "hsl(var(--peptoma-cyan) / 0.12)", background: "hsl(var(--peptoma-cyan) / 0.04)" }}>
                  <p className="font-mono font-extrabold text-2xl mb-1" style={{ color: "hsl(var(--peptoma-cyan))" }}>{num}</p>
                  <p className="text-white/35 font-mono text-[10px] leading-snug">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── Vision & Mission ───────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-5 border-b border-border pb-3">
          <Atom className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">Vision &amp; Mission</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Vision */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-border bg-card p-7 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl" style={{ background: "hsl(var(--peptoma-cyan))" }} />
            <p className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase mb-3">VISION</p>
            <p className="font-serif italic text-2xl text-foreground leading-snug mb-4">
              "A world where every breakthrough in peptide science is open, verifiable, and built by the global research community — not owned by a single institution."
            </p>
            <p className="text-xs font-mono text-muted-foreground leading-relaxed">
              We envision a future where the next generation of antimicrobial peptides, cancer therapies, and metabolic drugs are discovered through open networks — not closed labs — and where every researcher who contributes is directly rewarded for their work.
            </p>
          </motion.div>

          {/* Mission */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-xl border border-border bg-card p-7 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl" style={{ background: "hsl(var(--peptoma-gold))" }} />
            <p className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase mb-3">MISSION</p>
            <div className="space-y-3">
              {[
                { icon: "⬡", text: "Democratise access to frontier AI protein models for every researcher, regardless of institutional affiliation." },
                { icon: "⬡", text: "Build the world's largest open, community-validated peptide knowledge graph — permanent and on-chain." },
                { icon: "⬡", text: "Align incentives so that sharing discoveries is more rewarding than hoarding them." },
                { icon: "⬡", text: "Accelerate the path from sequence idea to validated drug candidate through community consensus." },
              ].map(({ icon, text }, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-xs mt-0.5 shrink-0" style={{ color: "hsl(var(--peptoma-gold))" }}>{icon}</span>
                  <p className="text-xs font-mono text-muted-foreground leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Use Cases ─────────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-5 border-b border-border pb-3">
          <FlaskConical className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">Use Cases</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              tag: "DRUG DISCOVERY",
              color: "hsl(var(--peptoma-cyan))",
              title: "Pre-screen peptide drug candidates",
              desc: "Use PEPTOMA AI Engine bioactivity scoring and structure prediction to filter thousands of peptide candidates computationally before committing to costly wet-lab synthesis. Reduce screening timelines from months to minutes.",
              bullets: ["Antimicrobial peptide (AMP) screening", "Bioactivity pre-assessment", "Structure confidence scoring"],
            },
            {
              tag: "ACADEMIC RESEARCH",
              color: "hsl(var(--peptoma-gold))",
              title: "Open peer validation without journals",
              desc: "Submit your research sequences and receive stake-weighted community annotations from researchers worldwide. Build a permanent, timestamped on-chain provenance record — no journal embargo, no retraction risk.",
              bullets: ["Community peer review on-chain", "Permanent IP timestamp on Solana", "Cross-lab annotation consensus"],
            },
            {
              tag: "CITIZEN SCIENCE",
              color: "hsl(var(--peptoma-green))",
              title: "Contribute & earn without a lab",
              desc: "No PhD required. Annotate sequences, confirm or challenge results, and earn $PEPTOMA directly for every validated contribution. Stake to unlock higher rewards and governance rights.",
              bullets: ["Annotate from anywhere in the world", "Earn $PEPTOMA for valid contributions", "Stake to amplify your influence"],
            },
            {
              tag: "AI AGENTS & DEV",
              color: "#a78bfa",
              title: "Programmatic peptide intelligence",
              desc: "AI agents and biotech tools can submit sequences, fetch analysis results, and post annotations via REST API. Build research pipelines that automatically surface high-potential peptide candidates at scale.",
              bullets: ["Full REST API for programmatic access", "Batch sequence submission", "Pro/Lab tier stakers get private endpoints"],
            },
          ].map(({ tag, color, title, desc, bullets }, i) => (
            <motion.div
              key={tag}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.07 * i }}
              className="rounded-xl border border-border bg-card p-6 hover:border-[hsl(var(--peptoma-cyan))/25] transition-colors group"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full border font-bold tracking-widest" style={{ color, borderColor: `${color}30`, background: `${color}10` }}>{tag}</span>
              </div>
              <p className="font-display font-bold text-sm text-foreground mb-2">{title}</p>
              <p className="text-xs font-mono text-muted-foreground leading-relaxed mb-4">{desc}</p>
              <div className="space-y-1.5 pt-3 border-t border-border">
                {bullets.map((b) => (
                  <div key={b} className="flex items-start gap-2 text-[10px] font-mono text-muted-foreground">
                    <span className="mt-0.5 shrink-0" style={{ color }}>→</span>
                    {b}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <FAQSection />

      {/* CTA banner */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl overflow-hidden relative"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}cta-bg.png)`,
          backgroundSize: "cover",
          backgroundPosition: "center 60%",
        }}
      >
        {/* Dark gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/55 to-black/30 pointer-events-none" />
        {/* Cyan tint strip at top */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-[hsl(var(--peptoma-cyan))/60] via-[hsl(var(--peptoma-cyan))/30] to-transparent" />

        <div className="relative z-10 p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h3 className="font-display font-extrabold text-2xl text-white mb-2 drop-shadow-sm">
              Join the open peptide graph.
            </h3>
            <p className="text-sm text-white/70 font-mono max-w-md leading-relaxed">
              Every annotation you submit becomes part of a permanently auditable, on-chain research record. Science that can't be buried.
            </p>
            <div className="flex flex-wrap gap-4 mt-3">
              {["Stake-weighted consensus", "On-chain provenance", "AI-augmented review"].map((f) => (
                <div key={f} className="flex items-center gap-1.5 text-[10px] font-mono text-[hsl(var(--peptoma-cyan))]">
                  <Check className="w-3 h-3" />
                  {f}
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Link href="/token">
              <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-[hsl(var(--peptoma-cyan))] text-white font-mono text-sm font-bold rounded-lg hover:opacity-90 transition-opacity cursor-pointer shadow-lg">
                GET $PEPTOMA
                <ChevronRight className="w-4 h-4" />
              </div>
            </Link>
            <Link href="/agents">
              <div className="inline-flex items-center gap-2 px-5 py-2.5 border border-white/30 text-white font-mono text-sm rounded-lg hover:bg-white/10 transition-colors cursor-pointer backdrop-blur-sm">
                API DOCS
              </div>
            </Link>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
