import { motion } from "framer-motion";
import {
  Database, FlaskConical, Link2, Globe, Dna, Layers,
  Microscope, Network, BookOpen, ExternalLink, Cpu, Shield,
  Beaker, Atom,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  {
    id: "databases",
    label: "Scientific Databases",
    icon: Database,
    color: "cyan",
    desc: "Open molecular and protein databases that PEPTOMA cross-references during analysis and that researchers can link to for deeper study.",
    items: [
      {
        name: "UniProt / SwissProt",
        url: "https://uniprot.org",
        tag: "Protein DB",
        status: "integrated",
        desc: "Gold-standard curated protein sequence and functional annotation database. PEPTOMA cross-references UniProt entries to identify known homologs and annotated bioactivities for submitted peptides.",
      },
      {
        name: "Protein Data Bank (PDB)",
        url: "https://www.rcsb.org",
        tag: "Structure DB",
        status: "integrated",
        desc: "World repository of 3D macromolecular structure data. Deep mode structure predictions are cross-referenced against PDB homologs to validate structural confidence scores.",
      },
      {
        name: "ChEMBL",
        url: "https://www.ebi.ac.uk/chembl",
        tag: "Bioactivity DB",
        status: "integrated",
        desc: "Large-scale bioactivity database from the EMBL-EBI. PEPTOMA AI Engine bioactivity labels are cross-referenced with ChEMBL assay data to contextualise antimicrobial, anticancer, and other functional calls.",
      },
      {
        name: "PubChem",
        url: "https://pubchem.ncbi.nlm.nih.gov",
        tag: "Chemical DB",
        status: "planned",
        desc: "NIH's free chemistry database covering compounds, biological activities, and assays. Planned integration will surface compound-level data for peptide scaffolds and analogues.",
      },
      {
        name: "NCBI / PubMed",
        url: "https://pubmed.ncbi.nlm.nih.gov",
        tag: "Literature",
        status: "planned",
        desc: "Biomedical literature index from the US National Library of Medicine. Planned integration will automatically surface relevant publications for each submitted peptide sequence.",
      },
      {
        name: "APD3 — Antimicrobial Peptide Database",
        url: "https://aps.unmc.edu",
        tag: "Peptide DB",
        status: "integrated",
        desc: "Dedicated antimicrobial peptide database with >3,800 curated entries. Classification labels in PEPTOMA's AI model are benchmarked against APD3 for antimicrobial annotation accuracy.",
      },
    ],
  },
  {
    id: "desci",
    label: "DeSci Protocols & Networks",
    icon: Network,
    color: "green",
    desc: "Decentralised science organisations and protocols that PEPTOMA aligns with or plans to integrate for funding, IP, governance, and research coordination.",
    items: [
      {
        name: "PEPTOMA IP-NFT Registry",
        url: "https://peptoma.xyz",
        tag: "IP / Registry",
        status: "integrated",
        desc: "Native PEPTOMA IP-NFT infrastructure — tokenises peptide research datasets directly on the PEPTOMA protocol registry. Every sequence analysis can be minted as an on-chain IP-NFT with immutable provenance, community peer-review scores, and research IP rights. No external protocol dependency.",
      },
      {
        name: "Molecule Protocol",
        url: "https://www.molecule.to",
        tag: "IP / Funding",
        status: "planned",
        desc: "Decentralised bio-IP protocol for tokenising pharmaceutical IP as IP-NFTs and funding early-stage research via bio-DAOs. Future integration planned for cross-protocol IP-NFT bridging.",
      },
      {
        name: "Pump Science",
        url: "https://www.pump.science",
        tag: "Solana DeSci",
        status: "planned",
        desc: "Solana-native DeSci platform enabling researchers to tokenise research compounds and raise community funding. PEPTOMA's high-scoring peptide hits can be listed on Pump Science for community-funded validation.",
      },
      {
        name: "VitaDAO",
        url: "https://vitadao.com",
        tag: "Longevity DAO",
        status: "planned",
        desc: "Community-funded longevity research DAO. Peptides with anti-aging or senolytics-relevant annotations (e.g. FOXO pathway, mTOR) will be surfaced to VitaDAO for potential funding consideration.",
      },
      {
        name: "ValleyDAO",
        url: "https://www.valleydao.bio",
        tag: "Synthetic Biology",
        status: "planned",
        desc: "Synthetic biology focused DeSci DAO. PEPTOMA peptide sequences with synthetic-biology relevance (AMPs, enzyme peptides) can be submitted to ValleyDAO's grant pipeline.",
      },
      {
        name: "ResearchHub",
        url: "https://www.researchhub.com",
        tag: "Open Science",
        status: "planned",
        desc: "Academic knowledge-sharing platform where researchers earn RSC tokens for peer review. PEPTOMA annotations can be exported as ResearchHub papers, bridging on-chain peer review with traditional academic credit.",
      },
      {
        name: "DeSci Nodes",
        url: "https://nodes.desci.com",
        tag: "Infrastructure",
        status: "planned",
        desc: "Permanent, IPFS-backed repository for research objects built by DeSci Labs. PEPTOMA analysis reports — sequences, AI analysis outputs, community annotations — will be publishable as citable DeSci Nodes with on-chain DOIs.",
      },
    ],
  },
  {
    id: "ai",
    label: "AI & Computational Biology",
    icon: Cpu,
    color: "gold",
    desc: "State-of-the-art AI models and computational tools that power PEPTOMA's analysis pipeline or that researchers can use alongside PEPTOMA.",
    items: [
      {
        name: "PEPTOMA AI Engine",
        url: "https://peptoma.xyz/lab",
        tag: "Core AI",
        status: "integrated",
        desc: "Proprietary AI analysis engine powering all PEPTOMA sequence analysis. Combines deterministic biochemical computation with AI inference for bioactivity scoring, structure prediction, toxicity assessment, and annotation generation.",
      },
      {
        name: "AlphaFold DB",
        url: "https://alphafold.ebi.ac.uk",
        tag: "Structure DB",
        status: "integrated",
        desc: "DeepMind/EBI repository of AlphaFold structure predictions for >200 million proteins. Live integration: on every sequence annotation page, PEPTOMA queries UniProt for an exact match and fetches the AlphaFold pLDDT structure confidence score as an independent reference anchor.",
      },
      {
        name: "Boltz-1 (MIT)",
        url: "https://github.com/jwohlwend/boltz",
        tag: "Structure AI",
        status: "roadmap",
        desc: "Open-source biomolecular structure prediction model that handles protein-ligand, protein-protein, and protein-nucleic acid co-folding. Roadmap: Deep+ analysis tier powered by Boltz-1 for peptide-target complex prediction.",
      },
      {
        name: "RFdiffusion",
        url: "https://github.com/RosettaCommons/RFdiffusion",
        tag: "Design AI",
        status: "roadmap",
        desc: "Diffusion model for de novo protein and peptide design from RosettaCommons. Roadmap: PEPTOMA Lab will offer an optional 'Design' mode where RFdiffusion generates novel peptide candidates targeting a disease input.",
      },
      {
        name: "OpenFold",
        url: "https://github.com/aqlaboratory/openfold",
        tag: "Open Source",
        status: "roadmap",
        desc: "Fully open-source, trainable AlphaFold2 implementation. Part of PEPTOMA's commitment to open infrastructure — community-fine-tuned OpenFold models will be offered as analysis alternatives to commercial APIs.",
      },
    ],
  },
  {
    id: "infrastructure",
    label: "On-chain & Storage Infrastructure",
    icon: Shield,
    color: "cyan",
    desc: "Blockchain and decentralised storage layers that provide permanence, verifiability, and censorship-resistance to PEPTOMA research records.",
    items: [
      {
        name: "Solana",
        url: "https://solana.com",
        tag: "L1 Blockchain",
        status: "integrated",
        desc: "PEPTOMA's primary blockchain. Wallet connections, token ($PEPTOMA), staking, governance, and on-chain annotation provenance all live on Solana mainnet. Sub-second finality and low fees make it practical for research-scale transaction volumes.",
      },
      {
        name: "IPFS",
        url: "https://ipfs.tech",
        tag: "Decentralised Storage",
        status: "integrated",
        desc: "InterPlanetary File System — content-addressed, peer-to-peer storage. Every completed analysis report (sequence, AI scores, biochemistry, annotation suggestions) is automatically pinned to IPFS via Pinata. The CID is stored in the database and displayed on each sequence's annotation page, making every result permanently retrievable by content hash.",
      },
      {
        name: "Arweave / AO",
        url: "https://arweave.org",
        tag: "Permanent Storage",
        status: "planned",
        desc: "Permanent, pay-once decentralised storage. Planned: critical research objects (sequence, analysis result, full annotation thread) will be stored on Arweave for 200-year guaranteed permanence — making PEPTOMA research truly censorship-proof.",
      },
      {
        name: "Ocean Protocol",
        url: "https://oceanprotocol.com",
        tag: "Data Marketplace",
        status: "roadmap",
        desc: "Decentralised data marketplace with compute-to-data. Roadmap: curated PEPTOMA peptide datasets (filtered by disease target, bioactivity class, annotation consensus level) will be publishable as Ocean Data NFTs for licensed access.",
      },
    ],
  },
  {
    id: "labtools",
    label: "Wet Lab & LIMS Tools",
    icon: Beaker,
    color: "green",
    desc: "Physical laboratory instruments, automation platforms, and information systems that PEPTOMA aims to bridge with — closing the gap between in-silico prediction and wet-lab validation.",
    items: [
      {
        name: "Benchling",
        url: "https://benchling.com",
        tag: "LIMS / ELN",
        status: "integrated",
        desc: "Cloud-based laboratory information management and electronic lab notebook platform used by 700+ biotech companies. PEPTOMA analysis reports — sequence, AI scores, structure prediction, biochemistry, community annotations, and IPFS provenance — are exportable directly into any Benchling project as structured ELN entries via the 'Export to Benchling' button on each sequence's annotation page.",
      },
      {
        name: "Opentrons",
        url: "https://opentrons.com",
        tag: "Lab Automation",
        status: "roadmap",
        desc: "Open-source liquid handling robots for automated laboratory workflows. Roadmap: PEPTOMA will generate Opentrons-compatible synthesis protocols for top-ranked peptide hits, enabling automated peptide synthesis validation runs.",
      },
      {
        name: "Twist Bioscience",
        url: "https://www.twistbioscience.com",
        tag: "DNA Synthesis",
        status: "roadmap",
        desc: "High-throughput gene and peptide synthesis provider. Roadmap: PEPTOMA users will be able to add peptide sequences directly to a Twist synthesis order from the Lab interface, bridging digital prediction and physical synthesis.",
      },
      {
        name: "Peptide 2.0",
        url: "https://www.peptide2.com",
        tag: "Peptide CRO",
        status: "roadmap",
        desc: "Custom peptide synthesis contract research organisation. Roadmap: validated, high-scoring peptides can be ordered for synthesis directly from PEPTOMA's analysis result page via Peptide 2.0 integration.",
      },
    ],
  },
];

const STATUS_CONFIG = {
  integrated: { label: "INTEGRATED", color: "text-[hsl(var(--peptoma-green))]", bg: "bg-[hsl(var(--peptoma-green))/10]", border: "border-[hsl(var(--peptoma-green))/25]" },
  planned: { label: "PLANNED", color: "text-[hsl(var(--peptoma-cyan))]", bg: "bg-[hsl(var(--peptoma-cyan))/10]", border: "border-[hsl(var(--peptoma-cyan))/25]" },
  roadmap: { label: "ROADMAP", color: "text-[hsl(var(--peptoma-gold))]", bg: "bg-[hsl(var(--peptoma-gold))/10]", border: "border-[hsl(var(--peptoma-gold))/25]" },
} as const;

const COLOR_MAP = {
  cyan: { icon: "text-[hsl(var(--peptoma-cyan))]", bg: "bg-[hsl(var(--peptoma-cyan))/8]", border: "border-[hsl(var(--peptoma-cyan))/20]" },
  green: { icon: "text-[hsl(var(--peptoma-green))]", bg: "bg-[hsl(var(--peptoma-green))/8]", border: "border-[hsl(var(--peptoma-green))/20]" },
  gold: { icon: "text-[hsl(var(--peptoma-gold))]", bg: "bg-[hsl(var(--peptoma-gold))/8]", border: "border-[hsl(var(--peptoma-gold))/20]" },
};

function EcosystemCard({ item, delay }: { item: typeof CATEGORIES[0]["items"][0]; delay: number }) {
  const status = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="group relative bg-card border border-border rounded-xl p-5 hover:border-[hsl(var(--peptoma-cyan))/30] transition-all duration-200 flex flex-col gap-3"
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--peptoma-cyan))/15] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-mono font-bold text-sm text-foreground">{item.name}</p>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border text-muted-foreground/70 border-border bg-muted/20">{item.tag}</span>
          </div>
        </div>
        <span className={cn("text-[9px] font-mono px-2 py-0.5 rounded border shrink-0 font-bold tracking-widest", status.color, status.bg, status.border)}>
          {status.label}
        </span>
      </div>

      <p className="text-xs font-mono text-muted-foreground leading-relaxed flex-1">{item.desc}</p>

      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-[10px] font-mono text-[hsl(var(--peptoma-cyan))/60] hover:text-[hsl(var(--peptoma-cyan))] transition-colors w-fit"
      >
        <Globe className="w-3 h-3" />
        {item.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
      </a>
    </motion.div>
  );
}

export default function Ecosystem() {
  const totalIntegrated = CATEGORIES.flatMap(c => c.items).filter(i => i.status === "integrated").length;
  const totalPlanned = CATEGORIES.flatMap(c => c.items).filter(i => i.status === "planned").length;
  const totalRoadmap = CATEGORIES.flatMap(c => c.items).filter(i => i.status === "roadmap").length;

  return (
    <div className="space-y-10 pb-16">
      {/* Banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
        className="relative w-full rounded-2xl overflow-hidden"
        style={{ height: 320 }}
      >
        <img
          src={`${import.meta.env.BASE_URL}ecosystem-bg.png`}
          alt="DeSci Ecosystem"
          className="w-full h-full object-cover object-center"
        />
        {/* Bottom fade to page background */}
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-background to-transparent" />
        {/* Dark overlay for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />

        {/* Corner HUD brackets */}
        {[
          "top-3 left-3 border-t border-l",
          "top-3 right-3 border-t border-r",
          "bottom-3 left-3 border-b border-l",
          "bottom-3 right-3 border-b border-r",
        ].map((cls) => (
          <div key={cls} className={`absolute ${cls} w-4 h-4 border-white/20`} />
        ))}

        {/* Content overlay */}
        <div className="absolute inset-0 flex flex-col justify-end p-7 pb-8">
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest uppercase text-white/50 mb-2">
            <Network className="w-3 h-3" />
            DeSci Ecosystem
          </div>
          <h1 className="font-serif italic text-3xl md:text-4xl text-white leading-tight mb-3 drop-shadow-lg">
            Ecosystem &amp; Integrations
          </h1>
          <p className="font-mono text-xs text-white/60 max-w-xl leading-relaxed">
            PEPTOMA sits at the intersection of AI-powered bioinformatics, open science infrastructure, and decentralised laboratory networks.
          </p>
        </div>
      </motion.div>

      {/* Status counts */}
      <div className="flex flex-wrap gap-3">
        {[
          { count: totalIntegrated, ...STATUS_CONFIG.integrated, label: "Currently Integrated" },
          { count: totalPlanned, ...STATUS_CONFIG.planned, label: "In Development" },
          { count: totalRoadmap, ...STATUS_CONFIG.roadmap, label: "On Roadmap" },
        ].map(({ label, count, color, bg, border }) => (
          <div key={label} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono", bg, border)}>
            <span className={cn("font-bold text-sm", color)}>{count}</span>
            <span className="text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* Sub-headline */}
      <p className="text-muted-foreground font-mono text-sm max-w-2xl leading-relaxed -mt-6">
        Below is the full ecosystem of real scientific databases, DeSci protocols, AI models, and wet-lab tools that PEPTOMA connects to or is building towards.
      </p>

      {/* Category sections */}
      {CATEGORIES.map((cat, ci) => {
        const colors = COLOR_MAP[cat.color as keyof typeof COLOR_MAP];
        const Icon = cat.icon;
        return (
          <section key={cat.id}>
            <div className={cn("flex items-center gap-3 p-4 rounded-xl border mb-5", colors.bg, colors.border)}>
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", colors.bg, colors.border, "border")}>
                <Icon className={cn("w-4 h-4", colors.icon)} />
              </div>
              <div>
                <p className={cn("text-xs font-mono font-bold tracking-widest uppercase", colors.icon)}>{cat.label}</p>
                <p className="text-xs font-mono text-muted-foreground mt-0.5 max-w-2xl">{cat.desc}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cat.items.map((item, ii) => (
                <EcosystemCard key={item.name} item={item} delay={ci * 0.05 + ii * 0.04} />
              ))}
            </div>
          </section>
        );
      })}

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-xl overflow-hidden relative"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}cta-bg.png)`,
          backgroundSize: "cover",
          backgroundPosition: "center 40%",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/55 to-black/30 pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-[hsl(var(--peptoma-cyan))/60] via-[hsl(var(--peptoma-cyan))/30] to-transparent" />
        <div className="relative z-10 p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h3 className="font-display font-extrabold text-xl text-white mb-2 drop-shadow-sm">Want to integrate with PEPTOMA?</h3>
            <p className="text-sm text-white/70 font-mono max-w-lg leading-relaxed">
              If you run a wet lab, DeSci protocol, or AI model and want to partner or integrate — reach out via GitHub or X. All integration proposals are publicly discussed and community-voted.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <a
              href="https://github.com/peptoma"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-white/30 text-white font-mono text-sm rounded-lg hover:bg-white/10 transition-colors backdrop-blur-sm"
            >
              GitHub
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href="https://x.com/Peptoma_xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[hsl(var(--peptoma-cyan))] text-white font-mono text-sm font-bold rounded-lg hover:opacity-90 transition-opacity shadow-lg"
            >
              Contact on X
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
