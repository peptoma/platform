import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight, BookOpen, FlaskConical, Brain, Shield, Dna, Leaf, Zap } from "lucide-react";

const SECTIONS = [
  {
    icon: FlaskConical,
    label: "Tissue Repair",
    color: "hsl(var(--peptoma-cyan))",
    title: "Tissue Repair & Regeneration",
    body: `Peptides such as BPC-157 — a gastric-derived 15-residue compound — and TB-500, the synthetic fragment of Thymosin Beta-4, have demonstrated the ability to accelerate healing of tendons, ligaments, muscle fibres, and gut epithelium in preclinical research models. Their mechanism involves upregulation of growth factors including VEGF and EGF, stimulating angiogenesis and cellular migration to injury sites.

For the research community, these compounds represent a model case of sequence-to-function mapping: a short, chemically stable peptide producing highly specific, tissue-protective outcomes. The reproducibility of these effects across multiple independent labs has made them among the most studied short peptides in regenerative biology.`,
  },
  {
    icon: Brain,
    label: "Neuroprotection",
    color: "#a78bfa",
    title: "Neuroprotection & Cognitive Function",
    body: `Several peptides operate directly on the central nervous system. Semax — an ACTH 4–10 analogue — upregulates BDNF (Brain-Derived Neurotrophic Factor) and protects neurons from ischaemic damage. Selank modulates GABAergic and serotonergic transmission, reducing anxiety without sedation or cognitive impairment.

Dihexa, an angiotensin IV analogue and hepatocyte growth factor (HGF) agonist, has demonstrated extraordinary potency in reversing cognitive decline in animal models — estimated at roughly ten million times more potent than BDNF itself at the synapse level. These findings illustrate a fundamental principle: small structural differences in an amino acid sequence can produce dramatically different receptor binding profiles and downstream effects.`,
  },
  {
    icon: Zap,
    label: "Metabolic",
    color: "hsl(var(--peptoma-green))",
    title: "Metabolic Regulation & Obesity Research",
    body: `GLP-1 receptor agonists — a peptide class that includes Semaglutide (GLP-1 mono-agonist), Tirzepatide (GLP-1/GIP dual agonist), and Retatrutide (GLP-1/GIP/Glucagon triple agonist) — represent the most clinically validated peptide applications in contemporary medicine. They reduce appetite signalling, improve glycaemic control, and lower cardiovascular risk markers, with efficacy that has outperformed decades of small-molecule pharmacology.

MOTS-c, a mitochondria-derived peptide encoded within the 12S rRNA, acts as an endogenous exercise mimetic by activating AMPK signalling pathways, improving insulin sensitivity, and reducing adiposity. Unlike synthetic drugs, its mechanism mirrors the body's own metabolic response to physical exertion, raising important questions about how mitochondrial peptide signalling shapes systemic energy homeostasis.`,
  },
  {
    icon: Shield,
    label: "Immune",
    color: "#60a5fa",
    title: "Immune Modulation & Host Defence",
    body: `Thymosin Alpha-1 is a 28-residue thymic peptide that promotes T-cell differentiation, enhances NK cell activity, and has been evaluated in clinical trials for chronic hepatitis B and C with meaningful virological response rates. It acts as a biological immunological calibration signal — not a blunt stimulant, but a precision modulator of adaptive immunity.

KPV — the C-terminal tripeptide of alpha-MSH (Lys-Pro-Val) — carries potent anti-inflammatory signalling while remaining virtually non-toxic at research doses. Its study has clarified how a three-residue sequence can suppress NF-κB activation and downregulate pro-inflammatory cytokines, providing a molecular handle for exploring gut and skin inflammation at their biochemical root.`,
  },
  {
    icon: Leaf,
    label: "Longevity",
    color: "hsl(var(--peptoma-gold))",
    title: "Longevity & Telomere Biology",
    body: `Epithalon — a pineal-derived tetrapeptide (Ala-Glu-Asp-Gly) — has been shown to activate telomerase in somatic cells, the enzyme responsible for maintaining telomere length. Russian longitudinal research spanning over two decades reports improved aging biomarkers and reduced all-cause mortality in treated cohorts. Its four-amino-acid simplicity, combined with its apparent influence on a mechanism as fundamental as telomere maintenance, makes it one of the more scientifically provocative peptides under active study.

NAD+, though not a peptide itself, works synergistically with mitochondria-targeting peptides like SS-31. SS-31 binds cardiolipin on the inner mitochondrial membrane, stabilising the electron transport chain and reducing reactive oxygen species. The combination represents a convergence of bioenergetic and signalling interventions aimed at the cellular processes most closely linked to biological aging.`,
  },
  {
    icon: Dna,
    label: "Skin Biology",
    color: "hsl(var(--peptoma-cyan))",
    title: "Skin Biology & Wound Healing",
    body: `GHK-Cu — glycyl-L-histidyl-L-lysine copper complex — is a naturally occurring plasma tripeptide that declines sharply with age, dropping from approximately 200 ng/mL at age 20 to under 80 ng/mL by age 60. It stimulates collagen and elastin synthesis, activates antioxidant gene expression, and promotes wound closure through both autocrine and paracrine signalling.

Its study has opened an entire subfield in dermal peptide biology, demonstrating that a copper-coordinating tripeptide can remodel extracellular matrix architecture, reduce scar tissue formation, and restore dermal density — all through a molecule smaller than most conventional drugs. GHK-Cu exemplifies a broader principle: the most biologically consequential peptides are often the shortest ones.`,
  },
];

export default function Science() {
  return (
    <div className="max-w-3xl mx-auto pb-24 space-y-16">

      {/* ── Article header ───────────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-5 pt-4"
      >
        <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Peptoma Research</span>
          <span className="text-muted-foreground/30">·</span>
          <span>Science</span>
        </div>

        <h1 className="font-serif italic text-4xl md:text-5xl leading-tight tracking-tight">
          Peptides: The Molecular Architects<br />
          <span className="text-[hsl(var(--peptoma-cyan))]">of Human Health</span>
        </h1>

        <p className="font-mono text-sm text-muted-foreground leading-relaxed max-w-2xl">
          A scientific overview of peptide biology — covering tissue repair, neuroprotection,
          metabolic regulation, immune modulation, longevity research, and skin biology —
          and how open DeSci infrastructure changes what researchers can do with this knowledge.
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          {SECTIONS.map((s) => (
            <span
              key={s.label}
              className="text-[10px] font-mono px-2 py-1 rounded border"
              style={{ color: s.color, borderColor: `${s.color}30`, background: `${s.color}08` }}
            >
              {s.label}
            </span>
          ))}
        </div>

        <div className="h-px bg-border" />
      </motion.header>

      {/* ── Intro ────────────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="space-y-4"
      >
        <h2 className="font-mono font-bold text-base tracking-widest uppercase text-foreground">
          What Are Peptides?
        </h2>
        <p className="font-mono text-sm text-muted-foreground leading-relaxed">
          Peptides are short chains of amino acids — the same building blocks that form proteins — typically consisting of 2 to 50 residues linked by peptide bonds. Unlike full proteins, their compact size allows them to cross biological barriers, interact with specific receptors with high precision, and be synthesised reproducibly under controlled laboratory conditions.
        </p>
        <p className="font-mono text-sm text-muted-foreground leading-relaxed">
          The human body produces thousands of endogenous peptides, each acting as a molecular signal in a finely tuned biological network. From gut-derived regulatory peptides to pineal tetrapeptides that influence telomerase activity, the diversity of their function is remarkable given the simplicity of their structure. A change of a single amino acid can shift a peptide from anti-inflammatory to antimicrobial, from receptor agonist to antagonist.
        </p>
      </motion.section>

      {/* ── Science sections ─────────────────────────────────────────────── */}
      {SECTIONS.map((section, i) => {
        const Icon = section.icon;
        return (
          <motion.section
            key={section.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 + i * 0.06 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${section.color}12`, border: `1px solid ${section.color}25` }}
              >
                <Icon className="w-4 h-4" style={{ color: section.color }} />
              </div>
              <h2 className="font-mono font-bold text-base tracking-wider text-foreground">
                {section.title}
              </h2>
            </div>

            {section.body.trim().split("\n\n").map((para, j) => (
              <p key={j} className="font-mono text-sm text-muted-foreground leading-relaxed">
                {para.trim()}
              </p>
            ))}

            {i < SECTIONS.length - 1 && <div className="h-px bg-border/50 mt-6" />}
          </motion.section>
        );
      })}

      {/* ── The Problem ──────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="space-y-6"
      >
        <div className="h-px bg-border" />
        <h2 className="font-mono font-bold text-base tracking-widest uppercase text-foreground">
          The Core Problem Peptide Science Faces
        </h2>

        <div className="space-y-5">
          {[
            {
              n: "01",
              title: "Fragmented Data",
              text: "Sequence data, bioactivity scores, and clinical observations are scattered across proprietary databases, paywalled journals, and unstructured lab notes. There is no open, queryable knowledge graph that connects a peptide's sequence to its predicted function, known annotations, and community validation.",
            },
            {
              n: "02",
              title: "Reproducibility Crisis",
              text: "Peptide research suffers the same reproducibility failures seen across biomedical science — compounded by the fact that slight differences in sequence, synthesis purity, or administration route can produce entirely different outcomes. Without standardised, verifiable provenance for each analysis, it is impossible to confirm the conditions under which a result was obtained.",
            },
            {
              n: "03",
              title: "Access Inequality",
              text: "AI-powered peptide analysis at institutional grade requires significant computational infrastructure and domain-specific model expertise. Access to this level of tooling has historically been limited to well-funded institutions with established lab networks — creating a structural barrier for independent and resource-constrained researchers.",
            },
          ].map((p) => (
            <div key={p.n} className="flex gap-5">
              <span className="font-mono text-2xl font-bold text-muted-foreground/20 shrink-0 leading-tight pt-0.5">
                {p.n}
              </span>
              <div className="space-y-1.5">
                <p className="font-mono font-bold text-sm text-foreground">{p.title}</p>
                <p className="font-mono text-sm text-muted-foreground leading-relaxed">{p.text}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ── PEPTOMA response ─────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="rounded-2xl overflow-hidden relative"
        style={{ background: "linear-gradient(135deg, #030e12 0%, #051014 100%)" }}
      >
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(hsl(var(--peptoma-cyan)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--peptoma-cyan)) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />
        <div className="relative z-10 p-8 md:p-10 space-y-6">
          <div>
            <p className="text-[10px] font-mono tracking-widest mb-2" style={{ color: "hsl(var(--peptoma-cyan))" }}>
              — WHERE PEPTOMA FITS
            </p>
            <h2 className="font-serif italic text-2xl md:text-3xl text-white leading-snug">
              Open infrastructure for<br />
              <span style={{ color: "hsl(var(--peptoma-cyan))" }}>every peptide researcher on Earth.</span>
            </h2>
          </div>

          <p className="text-white/50 font-mono text-sm leading-relaxed">
            PEPTOMA is an open decentralised science platform built to address all three failures simultaneously. It combines frontier AI models with community-driven annotation and on-chain provenance, making tools previously reserved for elite institutions available to any researcher with a browser.
          </p>

          <div className="space-y-3">
            {[
              { label: "Fragmented Data", response: "Open feed of community-submitted sequences with AI-generated bioactivity profiles — queryable, filterable, and permanently accessible." },
              { label: "Reproducibility", response: "Every analysis is timestamped and linked to its submitted sequence on Solana Mainnet, creating immutable provenance without institutional gatekeeping." },
              { label: "Access Inequality", response: "The PEPTOMA AI Engine runs free of charge for any researcher globally, with no institutional affiliation or subscription required." },
              { label: "Translation Gap", response: "AI analysis is matched against HPLC-verified research compound catalogs. After your run completes, you see the most relevant compounds available to source — with real pricing and direct purchase links." },
            ].map((item) => (
              <div key={item.label} className="flex gap-4">
                <span className="text-[hsl(var(--peptoma-cyan))] font-mono text-xs pt-0.5 shrink-0">▸</span>
                <div>
                  <span className="text-white/70 font-mono text-xs font-bold">{item.label} — </span>
                  <span className="text-white/40 font-mono text-xs leading-relaxed">{item.response}</span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-white/30 font-mono text-sm leading-relaxed border-t border-white/10 pt-5">
            A peptide sequence submitted anywhere in the world becomes an annotated, on-chain, community-validated research record in under two seconds — free of charge.
          </p>

          <div className="flex flex-wrap gap-3 pt-1">
            <Link href="/lab" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[hsl(var(--peptoma-cyan))] text-black font-mono text-xs font-bold rounded-lg hover:bg-[hsl(var(--peptoma-cyan))/90] transition-colors">
              Open The Lab <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link href="/peptides" className="inline-flex items-center gap-2 px-5 py-2.5 border border-white/15 text-white/60 font-mono text-xs rounded-lg hover:border-white/30 hover:text-white transition-colors">
              Browse Peptide Library
            </Link>
          </div>
        </div>
      </motion.section>

      {/* ── Footer cite ──────────────────────────────────────────────────── */}
      <p className="text-[10px] font-mono text-muted-foreground/30 text-center leading-relaxed pb-4">
        PEPTOMA — Open intelligence for peptide science. Powered by PEPTOMA AI Engine and the Solana blockchain.<br />
        $PEPTOMA token aligns researcher incentives with the quality of scientific contribution.
      </p>
    </div>
  );
}
