import { useState, memo, useMemo } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Search, FlaskConical, ExternalLink, Dna, BookOpen, Activity, Shield, Clock, TrendingUp, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { PEPTIDE_DB, PEPTIDE_CATEGORIES, PEPTIDE_STATUSES } from "@/lib/peptide-db";
import type { Grade, Status, PeptideEntry } from "@/lib/peptide-db";

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

function ScoreBar({ value, color = "cyan" }: { value: number; color?: string }) {
  return (
    <div className="w-full h-1 bg-muted/30 rounded-full overflow-hidden">
      <motion.div
        className={cn("h-full rounded-full", color === "cyan" ? "bg-[hsl(var(--peptoma-cyan))]" : "bg-[hsl(var(--peptoma-gold))]")}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.7 }}
      />
    </div>
  );
}

const PeptideCard = memo(function PeptideCard({ peptide, index }: { peptide: PeptideEntry; index: number }) {
  const labSequence = peptide.sequence.replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, "");
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="bg-card border border-border rounded-xl p-5 hover:border-[hsl(var(--peptoma-cyan))/30] transition-all group relative overflow-hidden flex flex-col gap-3"
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--peptoma-cyan))/15] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-sm text-foreground">{peptide.name}</span>
            <span className={cn("text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border", GRADE_COLORS[peptide.grade])}>
              {peptide.grade}
            </span>
          </div>
          <p className="text-[10px] font-mono text-muted-foreground mt-0.5 truncate">{peptide.fullName}</p>
        </div>
        <span className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded border whitespace-nowrap shrink-0", STATUS_COLORS[peptide.status])}>
          {peptide.status}
        </span>
      </div>

      {/* Sequence preview */}
      <div className="font-mono text-[10px] text-[hsl(var(--peptoma-cyan))/70] bg-background/50 border border-border/60 rounded px-3 py-2 tracking-widest truncate">
        {peptide.sequence.length > 28 ? peptide.sequence.slice(0, 28) + "…" : peptide.sequence}
      </div>

      {/* Targets */}
      <div className="flex flex-wrap gap-1">
        {peptide.targets.map(t => (
          <span key={t} className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-border text-muted-foreground bg-muted/20">
            {t}
          </span>
        ))}
      </div>

      {/* Bioactivity */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-mono">
          <span className="text-muted-foreground">BIOACTIVITY SCORE</span>
          <span className="text-foreground">{peptide.bioactivityScore}/100</span>
        </div>
        <ScoreBar value={peptide.bioactivityScore} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { icon: BookOpen, value: peptide.pubmedRefs.toLocaleString(), label: "PubMed" },
          { icon: Activity, value: peptide.recruitingTrials.toString(), label: "Trials" },
          { icon: Clock, value: peptide.halfLife, label: "Half-life" },
        ].map(({ icon: Icon, value, label }) => (
          <div key={label} className="bg-background/40 border border-border/60 rounded p-1.5 space-y-0.5">
            <Icon className="w-3 h-3 text-muted-foreground mx-auto" />
            <p className="text-[10px] font-mono font-bold text-foreground leading-none">{value}</p>
            <p className="text-[9px] font-mono text-muted-foreground/60">{label}</p>
          </div>
        ))}
      </div>

      {/* Summary */}
      <p className="text-[11px] font-mono text-muted-foreground leading-relaxed line-clamp-2">{peptide.summary}</p>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-border/40 mt-auto">
        <Link href={`/peptides/${peptide.id}`}>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[hsl(var(--peptoma-cyan))] text-white font-mono text-[10px] font-bold rounded-lg hover:opacity-90 transition-opacity cursor-pointer">
            <FlaskConical className="w-3 h-3" />
            ANALYZE
          </div>
        </Link>
        <a
          href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(peptide.name)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-muted-foreground font-mono text-[10px] rounded-lg hover:text-foreground hover:border-foreground/20 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          PUBMED
        </a>
        <a
          href={`https://clinicaltrials.gov/search?query=${encodeURIComponent(peptide.name)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-muted-foreground font-mono text-[10px] rounded-lg hover:text-foreground hover:border-foreground/20 transition-colors"
        >
          <Activity className="w-3 h-3" />
          TRIALS
        </a>
      </div>
    </motion.div>
  );
});

export default function Peptides() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [status, setStatus] = useState<string>("All");

  const filtered = useMemo(() => PEPTIDE_DB.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = search.length < 2
      || p.name.toLowerCase().includes(q)
      || p.targets.some(t => t.toLowerCase().includes(q))
      || p.fullName.toLowerCase().includes(q);
    const matchCat = category === "All" || p.category === category;
    const matchStatus = status === "All" || p.status === status;
    return matchSearch && matchCat && matchStatus;
  }), [search, category, status]);

  const totalPubmed = useMemo(() => PEPTIDE_DB.reduce((s, p) => s + p.pubmedRefs, 0), []);
  const totalTrials = useMemo(() => PEPTIDE_DB.reduce((s, p) => s + p.recruitingTrials, 0), []);
  const approved = useMemo(() => PEPTIDE_DB.filter(p => p.status === "FDA Approved").length, []);

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-1 tracking-widest uppercase">
          <Dna className="w-3.5 h-3.5 text-[hsl(var(--peptoma-cyan))]" />
          Peptide Library
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Research Peptide Database</h1>
        <p className="text-muted-foreground mt-1 font-mono text-sm leading-relaxed">
          Curated library of well-studied research peptides with real scientific metadata — grades, PubMed references, clinical trial counts, and direct analysis links.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Peptides indexed", value: PEPTIDE_DB.length, icon: Dna, color: "cyan" },
          { label: "PubMed references", value: totalPubmed.toLocaleString(), icon: BookOpen, color: "gold" },
          { label: "Active trials", value: totalTrials, icon: Activity, color: "green" },
          { label: "FDA approved", value: approved, icon: Shield, color: "cyan" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={cn(
            "rounded-xl border p-4 flex items-center gap-3",
            color === "cyan" ? "border-[hsl(var(--peptoma-cyan))/20] bg-[hsl(var(--peptoma-cyan))/5]" :
            color === "gold" ? "border-[hsl(var(--peptoma-gold))/20] bg-[hsl(var(--peptoma-gold))/5]" :
            "border-[hsl(var(--peptoma-green))/20] bg-[hsl(var(--peptoma-green))/5]"
          )}>
            <Icon className={cn("w-4 h-4 shrink-0",
              color === "cyan" ? "text-[hsl(var(--peptoma-cyan))]" :
              color === "gold" ? "text-[hsl(var(--peptoma-gold))]" :
              "text-[hsl(var(--peptoma-green))]"
            )} />
            <div>
              <p className="text-base font-bold font-mono leading-tight">{value}</p>
              <p className="text-[9px] font-mono text-muted-foreground tracking-widest uppercase">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search peptides by name or target..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-lg font-mono text-sm placeholder:text-muted-foreground focus:outline-none focus:border-[hsl(var(--peptoma-cyan))/50] transition-colors"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 border border-border rounded-lg px-3 py-2 bg-background">
            <Filter className="w-3 h-3 text-muted-foreground" />
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="text-xs font-mono text-foreground bg-transparent focus:outline-none cursor-pointer"
            >
              {PEPTIDE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1.5 border border-border rounded-lg px-3 py-2 bg-background">
            <TrendingUp className="w-3 h-3 text-muted-foreground" />
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="text-xs font-mono text-foreground bg-transparent focus:outline-none cursor-pointer"
            >
              {PEPTIDE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
        <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--peptoma-cyan))] animate-pulse" />
        {filtered.length} peptide{filtered.length !== 1 ? "s" : ""} found
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((p, i) => <PeptideCard key={p.id} peptide={p} index={i} />)}
      </div>

      {filtered.length === 0 && (
        <div className="py-20 text-center">
          <Dna className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-mono text-muted-foreground">No peptides match your filters.</p>
          <button onClick={() => { setSearch(""); setCategory("All"); setStatus("All"); }} className="mt-3 text-[11px] font-mono text-[hsl(var(--peptoma-cyan))] hover:opacity-70 transition-opacity">
            Clear filters
          </button>
        </div>
      )}

      {/* CTA */}
      <div
        className="rounded-xl overflow-hidden relative"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}cta-bg.png)`,
          backgroundSize: "cover",
          backgroundPosition: "center 50%",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/55 to-black/30 pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-[hsl(var(--peptoma-cyan))/60] via-[hsl(var(--peptoma-cyan))/30] to-transparent" />
        <div className="relative z-10 p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h3 className="font-display font-extrabold text-xl text-white mb-2 drop-shadow-sm">Don't see your peptide?</h3>
            <p className="text-sm text-white/70 font-mono max-w-md leading-relaxed">
              Submit any peptide sequence to The Lab for full AI analysis — bioactivity prediction, structure classification, toxicity assessment, and community peer review.
            </p>
          </div>
          <Link href="/lab">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-[hsl(var(--peptoma-cyan))] text-white font-mono text-sm font-bold rounded-lg hover:opacity-90 transition-opacity cursor-pointer shadow-lg whitespace-nowrap">
              <FlaskConical className="w-4 h-4" />
              OPEN THE LAB
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
