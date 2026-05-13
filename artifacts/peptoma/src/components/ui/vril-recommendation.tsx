import { ExternalLink, Sparkles, ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";

// ─── Real Vril Peptides Catalog (scraped from vrilpeptides.com/shop) ────────────
interface VrilProduct {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  quantity: string;
  purity: string;
  tags: string[];
  bioactivityMatch: string[];
  diseaseKeywords: string[];
  accent: string;
}

const VRIL_CATALOG: VrilProduct[] = [
  {
    id: "bpc-157",
    name: "BPC-157",
    category: "Peptide Therapy",
    description: "Gastric-derived 15-residue peptide. Tissue-repair and angiogenesis research.",
    price: 49,
    quantity: "10mg",
    purity: "99.4%",
    tags: ["anti-inflammatory", "tissue repair", "angiogenesis", "neuroprotective"],
    bioactivityMatch: ["anti-inflammatory", "neuropeptide", "immunomodulatory"],
    diseaseKeywords: ["tendon", "muscle", "gi", "gut", "neuroprotect", "repair", "inflammation", "tissue", "wound", "angiogenesis"],
    accent: "hsl(187 100% 42%)",
  },
  {
    id: "bpc-tb-blend",
    name: "BPC-157 + TB-500 Blend",
    category: "Blend",
    description: "Tissue-repair duo. The most requested blend for recovery and regenerative research.",
    price: 79,
    quantity: "20mg",
    purity: "99.2%",
    tags: ["anti-inflammatory", "tissue repair", "recovery", "blend"],
    bioactivityMatch: ["anti-inflammatory", "immunomodulatory"],
    diseaseKeywords: ["muscle", "tendon", "repair", "inflammation", "recovery", "wound", "tissue"],
    accent: "hsl(187 100% 42%)",
  },
  {
    id: "tb-500",
    name: "TB-500",
    category: "Peptide Therapy",
    description: "Thymosin Beta-4 fragment. Actin-sequestering tissue-repair peptide.",
    price: 39,
    quantity: "10mg",
    purity: "99.3%",
    tags: ["anti-inflammatory", "muscle repair", "immunomodulatory"],
    bioactivityMatch: ["anti-inflammatory", "immunomodulatory"],
    diseaseKeywords: ["muscle", "inflammation", "repair", "immune", "angiogenesis", "wound", "actin"],
    accent: "hsl(187 100% 42%)",
  },
  {
    id: "ghk-cu",
    name: "GHK-Cu",
    category: "Anti-aging",
    description: "Copper-binding tripeptide. Collagen induction and skin-matrix research.",
    price: 42,
    quantity: "100mg",
    purity: "99.6%",
    tags: ["anti-aging", "collagen", "wound healing", "anti-inflammatory"],
    bioactivityMatch: ["anti-inflammatory"],
    diseaseKeywords: ["aging", "skin", "wound", "collagen", "hair", "oxidative", "anti-aging", "dermal", "matrix"],
    accent: "hsl(45 100% 50%)",
  },
  {
    id: "glow-stack",
    name: "GLOW Stack",
    category: "Blend",
    description: "Triple-compound aesthetic and dermal regeneration stack.",
    price: 89,
    quantity: "70mg",
    purity: "99.1%",
    tags: ["anti-aging", "dermal", "aesthetic", "collagen"],
    bioactivityMatch: ["anti-inflammatory"],
    diseaseKeywords: ["skin", "aging", "collagen", "dermal", "aesthetic", "hair", "glow"],
    accent: "hsl(45 100% 50%)",
  },
  {
    id: "kpv",
    name: "KPV",
    category: "Anti-inflammatory",
    description: "α-MSH C-terminal tripeptide. Anti-inflammatory research.",
    price: 31,
    quantity: "5mg",
    purity: "99.2%",
    tags: ["anti-inflammatory", "antimicrobial", "immunomodulatory"],
    bioactivityMatch: ["anti-inflammatory", "antimicrobial", "immunomodulatory"],
    diseaseKeywords: ["inflammation", "immune", "skin", "infection", "msh", "antimicrobial"],
    accent: "hsl(187 100% 42%)",
  },
  {
    id: "thymosin-a1",
    name: "Thymosin Alpha-1",
    category: "Immunomodulator",
    description: "Thymic-derived 28-residue peptide. T-cell maturation research.",
    price: 73,
    quantity: "10mg",
    purity: "99.3%",
    tags: ["immunomodulatory", "T-cell", "thymic", "antiviral"],
    bioactivityMatch: ["immunomodulatory", "antimicrobial", "antiviral", "antifungal"],
    diseaseKeywords: ["immune", "infection", "virus", "cancer", "t-cell", "thymus", "antiviral", "bacteria"],
    accent: "#60a5fa",
  },
  {
    id: "selank",
    name: "Selank",
    category: "Nootropic",
    description: "Russian-developed anxiolytic heptapeptide. Cognitive stability.",
    price: 31,
    quantity: "5mg",
    purity: "99.2%",
    tags: ["neuropeptide", "nootropic", "anxiolytic", "cognitive"],
    bioactivityMatch: ["neuropeptide", "immunomodulatory"],
    diseaseKeywords: ["cognitive", "anxiety", "nootropic", "neuro", "brain", "gaba", "memory", "serotonin", "stress"],
    accent: "#a78bfa",
  },
  {
    id: "semax",
    name: "Semax",
    category: "Nootropic",
    description: "ACTH(4-10) fragment. Neuroprotective and BDNF-upregulating.",
    price: 31,
    quantity: "5mg",
    purity: "99.3%",
    tags: ["neuropeptide", "nootropic", "BDNF", "neuroprotective"],
    bioactivityMatch: ["neuropeptide"],
    diseaseKeywords: ["cognitive", "bdnf", "neuro", "brain", "acth", "neuroprotect", "memory", "stroke"],
    accent: "#a78bfa",
  },
  {
    id: "dihexa",
    name: "Dihexa",
    category: "Nootropic",
    description: "Angiotensin IV analog. Hepatocyte growth factor agonist.",
    price: 80,
    quantity: "10mg",
    purity: "99.4%",
    tags: ["neuropeptide", "nootropic", "HGF", "cognitive"],
    bioactivityMatch: ["neuropeptide"],
    diseaseKeywords: ["cognitive", "alzheimer", "neuro", "brain", "dementia", "hgf", "memory", "neurodegeneration"],
    accent: "#a78bfa",
  },
  {
    id: "oxytocin",
    name: "Oxytocin",
    category: "Neuropeptide",
    description: "The nine-residue neuropeptide. Bonding and social-cognitive research.",
    price: 45,
    quantity: "2mg",
    purity: "99.1%",
    tags: ["neuropeptide", "social", "bonding", "cognitive"],
    bioactivityMatch: ["neuropeptide"],
    diseaseKeywords: ["social", "autism", "bonding", "anxiety", "brain", "cognitive", "mental"],
    accent: "#a78bfa",
  },
  {
    id: "dsip",
    name: "DSIP",
    category: "Neuropeptide",
    description: "Delta Sleep-Inducing Peptide. Slow-wave sleep architecture.",
    price: 27,
    quantity: "5mg",
    purity: "99.0%",
    tags: ["neuropeptide", "sleep", "delta-wave", "circadian"],
    bioactivityMatch: ["neuropeptide"],
    diseaseKeywords: ["sleep", "insomnia", "delta", "circadian", "brain", "cognitive", "rest"],
    accent: "#818cf8",
  },
  {
    id: "tirzepatide",
    name: "Tirzepatide",
    category: "GLP-1 / GIP",
    description: "Dual GLP-1 / GIP agonist. Clinical-grade metabolic research.",
    price: 136,
    quantity: "40mg",
    purity: "99.5%",
    tags: ["hormonal", "metabolic", "GLP-1", "GIP", "obesity"],
    bioactivityMatch: ["hormonal"],
    diseaseKeywords: ["obesity", "weight", "diabetes", "glp", "metabolic", "cardiovascular", "glycemic", "insulin", "fat"],
    accent: "hsl(142 76% 36%)",
  },
  {
    id: "retatrutide",
    name: "Retatrutide",
    category: "Triple Agonist",
    description: "Triple agonist (GLP-1 / GIP / Glucagon). Next-generation metabolic compound.",
    price: 83,
    quantity: "30mg",
    purity: "99.4%",
    tags: ["hormonal", "metabolic", "GLP-1", "glucagon"],
    bioactivityMatch: ["hormonal"],
    diseaseKeywords: ["obesity", "weight", "diabetes", "metabolic", "cardiovascular", "fat", "glucagon"],
    accent: "hsl(142 76% 36%)",
  },
  {
    id: "cjc-ipa",
    name: "CJC-1295 + Ipamorelin",
    category: "Growth Hormone",
    description: "GH-secretagogue pairing. Pulsatile release research protocol.",
    price: 41,
    quantity: "10mg",
    purity: "99.3%",
    tags: ["hormonal", "growth hormone", "muscle", "anti-aging"],
    bioactivityMatch: ["hormonal"],
    diseaseKeywords: ["growth", "hormone", "muscle", "fat", "gh", "body composition", "anti-aging", "age"],
    accent: "hsl(142 76% 36%)",
  },
  {
    id: "tesamorelin",
    name: "Tesamorelin",
    category: "Growth Hormone",
    description: "Stabilized GHRH analog. Visceral adipose research.",
    price: 73,
    quantity: "10mg",
    purity: "99.2%",
    tags: ["hormonal", "GHRH", "fat loss", "visceral"],
    bioactivityMatch: ["hormonal"],
    diseaseKeywords: ["fat", "adipose", "visceral", "hormone", "growth", "gh", "body composition"],
    accent: "hsl(142 76% 36%)",
  },
  {
    id: "epithalon",
    name: "Epithalon",
    category: "Longevity",
    description: "Pineal-derived tetrapeptide. Telomerase activation research.",
    price: 31,
    quantity: "10mg",
    purity: "99.5%",
    tags: ["anti-aging", "longevity", "telomere", "circadian"],
    bioactivityMatch: ["hormonal"],
    diseaseKeywords: ["aging", "longevity", "telomere", "circadian", "pineal", "anti-aging", "sleep"],
    accent: "hsl(45 100% 50%)",
  },
  {
    id: "mots-c",
    name: "MOTS-c",
    category: "Metabolic",
    description: "Mitochondrial-derived peptide. Metabolic resilience.",
    price: 52,
    quantity: "10mg",
    purity: "99.3%",
    tags: ["hormonal", "metabolic", "insulin", "mitochondria"],
    bioactivityMatch: ["hormonal"],
    diseaseKeywords: ["metabolic", "insulin", "obesity", "diabetes", "mitochondria", "fat", "glucose", "exercise"],
    accent: "hsl(142 76% 36%)",
  },
  {
    id: "nad",
    name: "NAD+",
    category: "Longevity",
    description: "Mitochondrial coenzyme. Sirtuin pathway and energy metabolism.",
    price: 83,
    quantity: "500mg",
    purity: "99.0%",
    tags: ["anti-aging", "mitochondria", "sirtuin", "energy"],
    bioactivityMatch: ["hormonal"],
    diseaseKeywords: ["aging", "longevity", "mitochondria", "energy", "sirtuin", "nad", "metabolic"],
    accent: "hsl(45 100% 50%)",
  },
  {
    id: "ss-31",
    name: "SS-31",
    category: "Antioxidant",
    description: "Mitochondria-targeted tetrapeptide. Cardiolipin-binding antioxidant research.",
    price: 34,
    quantity: "10mg",
    purity: "99.3%",
    tags: ["anti-inflammatory", "antioxidant", "mitochondria", "cardioprotective"],
    bioactivityMatch: ["anti-inflammatory"],
    diseaseKeywords: ["oxidative", "mitochondria", "heart", "cardiac", "antioxidant", "aging", "ischemia"],
    accent: "hsl(187 100% 42%)",
  },
  {
    id: "kisspeptin-10",
    name: "Kisspeptin-10",
    category: "HPG Axis",
    description: "HPG-axis ignition peptide. GnRH stimulation research.",
    price: 34,
    quantity: "5mg",
    purity: "99.1%",
    tags: ["hormonal", "GnRH", "fertility", "HPG-axis"],
    bioactivityMatch: ["hormonal"],
    diseaseKeywords: ["fertility", "testosterone", "gnrh", "hpg", "hormone", "reproduction", "libido"],
    accent: "hsl(142 76% 36%)",
  },
  {
    id: "pt-141",
    name: "PT-141",
    category: "Libido",
    description: "Bremelanotide. Central-acting libido research compound.",
    price: 41,
    quantity: "10mg",
    purity: "99.2%",
    tags: ["hormonal", "libido", "melanocortin", "CNS"],
    bioactivityMatch: ["hormonal"],
    diseaseKeywords: ["libido", "sexual", "erectile", "melanocortin", "desire"],
    accent: "#f472b6",
  },
  {
    id: "melanotan-ii",
    name: "Melanotan II",
    category: "Melanocortin",
    description: "α-MSH analog. Melanogenesis and libido research.",
    price: 32,
    quantity: "10mg",
    purity: "99.0%",
    tags: ["hormonal", "melanogenesis", "libido", "tanning"],
    bioactivityMatch: ["hormonal"],
    diseaseKeywords: ["melanin", "skin", "libido", "sexual", "msh", "pigmentation"],
    accent: "#f472b6",
  },
  {
    id: "gonadorelin",
    name: "Gonadorelin",
    category: "HPG Axis",
    description: "Synthetic GnRH decapeptide. HPG-axis research.",
    price: 48,
    quantity: "5mg",
    purity: "99.4%",
    tags: ["hormonal", "GnRH", "HPG-axis", "fertility"],
    bioactivityMatch: ["hormonal"],
    diseaseKeywords: ["fertility", "testosterone", "gnrh", "hpg", "hormone", "reproduction", "puberty"],
    accent: "hsl(142 76% 36%)",
  },
  {
    id: "cjc-no-dac",
    name: "CJC-1295 No DAC",
    category: "Growth Hormone",
    description: "GHRH analog without DAC. Short-pulse secretagogue research.",
    price: 24,
    quantity: "5mg",
    purity: "99.3%",
    tags: ["hormonal", "GHRH", "growth hormone", "secretagogue"],
    bioactivityMatch: ["hormonal"],
    diseaseKeywords: ["growth", "hormone", "muscle", "fat", "gh", "secretagogue"],
    accent: "hsl(142 76% 36%)",
  },
];

// ─── Recommendation engine ──────────────────────────────────────────────────────
const FALLBACK_IDS = ["bpc-157", "thymosin-a1", "kpv"];

function getRecommendations(
  bioactivityLabel?: string | null,
  diseaseTarget?: string | null
): VrilProduct[] {
  const label = (bioactivityLabel ?? "").toLowerCase();
  const target = (diseaseTarget ?? "").toLowerCase();

  const scored = VRIL_CATALOG.map((p) => {
    let score = 0;
    if (p.bioactivityMatch.some((m) => label.includes(m) || m.includes(label))) score += 3;
    if (target) {
      for (const kw of p.diseaseKeywords) {
        if (target.includes(kw) || kw.split(" ").some((w) => w.length > 3 && target.includes(w))) score += 1;
      }
    }
    return { product: p, score };
  });

  const matched = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.product);

  // Always return 3 products — fill gaps with popular fallbacks
  if (matched.length >= 3) return matched;
  const fallbacks = VRIL_CATALOG.filter(
    (p) => FALLBACK_IDS.includes(p.id) && !matched.find((m) => m.id === p.id)
  );
  return [...matched, ...fallbacks].slice(0, 3);
}

// ─── Component ──────────────────────────────────────────────────────────────────
interface VrilRecommendationProps {
  bioactivityLabel?: string | null;
  diseaseTarget?: string | null;
}

export function VrilRecommendation({ bioactivityLabel, diseaseTarget }: VrilRecommendationProps) {
  const recs = getRecommendations(bioactivityLabel, diseaseTarget);
  if (recs.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-xl border border-border bg-card/60 p-5 space-y-4 mt-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[hsl(var(--peptoma-gold))]" />
          <span className="text-xs font-mono text-muted-foreground tracking-widest uppercase">
            Relevant Vril Compounds
          </span>
        </div>
        <a
          href="https://vrilpeptides.com/shop"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] font-mono text-muted-foreground hover:text-[hsl(var(--peptoma-cyan))] transition-colors flex items-center gap-1"
        >
          Browse all <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Match context */}
      {(bioactivityLabel || diseaseTarget) && (
        <p className="text-[10px] font-mono text-muted-foreground/60 leading-relaxed">
          Matched to:{" "}
          {bioactivityLabel && (
            <span className="text-[hsl(var(--peptoma-cyan))]">{bioactivityLabel}</span>
          )}
          {bioactivityLabel && diseaseTarget && " · "}
          {diseaseTarget && (
            <span className="text-[hsl(var(--peptoma-gold))]">{diseaseTarget}</span>
          )}
        </p>
      )}

      {/* Product cards */}
      <div className="space-y-3">
        {recs.map((product, i) => (
          <motion.a
            key={product.id}
            href={`https://vrilpeptides.com/product.html?id=${product.id}`}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 + i * 0.07 }}
            className="flex items-center gap-4 p-3 rounded-lg border border-border hover:border-[hsl(var(--peptoma-cyan))/30] hover:bg-muted/30 transition-all group"
          >
            {/* Product image */}
            <img
              src={`https://vrilpeptides.com/assets/compounds/${product.id}.png`}
              alt={product.name}
              className="w-14 h-14 rounded-lg object-contain bg-background/60 border border-border shrink-0 p-1"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <p className="font-mono font-bold text-sm text-foreground">{product.name}</p>
                <span
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded border tracking-widest whitespace-nowrap"
                  style={{ color: product.accent, borderColor: `${product.accent}40`, background: `${product.accent}10` }}
                >
                  {product.category.toUpperCase()}
                </span>
              </div>
              <p className="text-xs font-mono text-muted-foreground leading-snug line-clamp-2 mb-2">
                {product.description}
              </p>
              <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground/60">
                <span className="text-foreground font-bold">${product.price}</span>
                <span>{product.quantity}</span>
                <span className="text-[hsl(var(--peptoma-green))]">{product.purity} HPLC</span>
              </div>
            </div>

            {/* CTA */}
            <div className="shrink-0 flex flex-col items-center gap-1">
              <ShoppingCart className="w-4 h-4 text-muted-foreground/40 group-hover:text-[hsl(var(--peptoma-cyan))] transition-colors" />
              <span className="text-[9px] font-mono text-muted-foreground/40 group-hover:text-[hsl(var(--peptoma-cyan))] transition-colors">
                SHOP
              </span>
            </div>
          </motion.a>
        ))}
      </div>

      {/* Footer */}
      <p className="text-[9px] font-mono text-muted-foreground/35 leading-relaxed border-t border-border pt-3">
        Recommendations based on bioactivity classification from your sequence analysis.
        Research compounds only — not approved drugs. Verify suitability with a qualified researcher.
        Sourced from <span className="text-muted-foreground/60">vrilpeptides.com</span> · HPLC-verified, Europe.
      </p>
    </motion.div>
  );
}
