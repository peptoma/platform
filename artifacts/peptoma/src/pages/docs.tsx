import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BookOpen, Dna, Coins, Rocket, Bot, ChevronRight,
  Zap, Users, Shield, CheckCircle, Copy, Globe, FlaskConical,
  MessageSquare, TrendingUp, AlertTriangle, Info, Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative rounded-lg bg-[#0d1117] border border-border overflow-hidden my-4">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 bg-muted/10">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{language}</span>
        <button
          onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? <CheckCircle className="w-3 h-3 text-[hsl(var(--peptoma-green))]" /> : <Copy className="w-3 h-3" />}
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <pre className="p-4 text-xs font-mono text-green-300/80 overflow-x-auto leading-relaxed whitespace-pre-wrap">{code}</pre>
    </div>
  );
}

function Note({ type = "info", children }: { type?: "info" | "warn" | "tip"; children: React.ReactNode }) {
  const cfg = {
    info: { border: "border-[hsl(var(--peptoma-cyan))/30]", bg: "bg-[hsl(var(--peptoma-cyan))/6]", icon: Info, color: "text-[hsl(var(--peptoma-cyan))]" },
    warn: { border: "border-[hsl(var(--peptoma-gold))/30]", bg: "bg-[hsl(var(--peptoma-gold))/6]", icon: AlertTriangle, color: "text-[hsl(var(--peptoma-gold))]" },
    tip: { border: "border-[hsl(var(--peptoma-green))/30]", bg: "bg-[hsl(var(--peptoma-green))/6]", icon: Star, color: "text-[hsl(var(--peptoma-green))]" },
  }[type];
  const Icon = cfg.icon;
  return (
    <div className={cn("flex gap-3 p-4 rounded-lg border my-4", cfg.border, cfg.bg)}>
      <Icon className={cn("w-4 h-4 shrink-0 mt-0.5", cfg.color)} />
      <p className="text-sm font-mono text-foreground/80 leading-relaxed">{children}</p>
    </div>
  );
}

function H1({ id, children }: { id: string; children: React.ReactNode }) {
  return <h1 id={id} className="font-display font-extrabold text-3xl text-foreground mb-4 mt-2 scroll-mt-20">{children}</h1>;
}
function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return <h2 id={id} className="font-display font-bold text-xl text-foreground mt-10 mb-3 scroll-mt-20 border-b border-border pb-2">{children}</h2>;
}
function H3({ id, children }: { id?: string; children: React.ReactNode }) {
  return <h3 id={id} className="font-display font-bold text-base text-foreground mt-6 mb-2 scroll-mt-20">{children}</h3>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-mono text-muted-foreground leading-relaxed mb-3">{children}</p>;
}
function Li({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2 text-sm font-mono text-muted-foreground">
      <ChevronRight className="w-3.5 h-3.5 text-[hsl(var(--peptoma-cyan))] mt-0.5 shrink-0" />
      <span>{text}</span>
    </li>
  );
}
function UL({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 mb-4 ml-1">
      {items.map((item, i) => <Li key={i} text={item} />)}
    </ul>
  );
}

const NAV_SECTIONS = [
  { id: "overview", label: "Overview", icon: Globe },
  { id: "how-it-works", label: "How It Works", icon: Zap },
  { id: "the-lab", label: "The Lab", icon: FlaskConical },
  { id: "feed", label: "Feed & Annotations", icon: MessageSquare },
  { id: "missions", label: "Mission Control", icon: Rocket },
  { id: "token", label: "$PEPTOMA Token", icon: Coins },
  { id: "benefits", label: "Benefits", icon: TrendingUp },
  { id: "api", label: "API Reference", icon: Bot },
  { id: "api-auth", label: "↳ Authentication", icon: Shield },
  { id: "api-endpoints", label: "↳ Endpoints", icon: Globe },
  { id: "api-sdk", label: "↳ SDK", icon: Star },
  { id: "api-errors", label: "↳ Errors", icon: AlertTriangle },
  { id: "faq", label: "FAQ", icon: BookOpen },
];

export default function Docs() {
  const [active, setActive] = useState("overview");
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );
    NAV_SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActive(id);
  };

  return (
    <div className="flex gap-8 pb-20">
      {/* Sidebar */}
      <aside className="hidden lg:block w-48 shrink-0">
        <div className="sticky top-4 space-y-0.5">
          <p className="text-[9px] font-mono text-muted-foreground tracking-widest uppercase mb-3 px-3">Documentation</p>
          {NAV_SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-sm text-xs font-mono text-left transition-all",
                active === id
                  ? "bg-[hsl(var(--peptoma-cyan))/10] text-[hsl(var(--peptoma-cyan))] border border-[hsl(var(--peptoma-cyan))/25]"
                  : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
              )}
            >
              <Icon className="w-3 h-3 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </aside>

      {/* Content */}
      <div ref={contentRef} className="flex-1 min-w-0 max-w-3xl">

        {/* ── Overview ── */}
        <section>
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-2 tracking-widest uppercase">
            <Globe className="w-3.5 h-3.5" />
            <span>docs.peptoma.xyz</span>
          </div>
          <H1 id="overview">What is PEPTOMA?</H1>
          <P>
            PEPTOMA is an open, decentralised science (DeSci) platform built for peptide research. It combines
            AI-powered sequence analysis, community peer-review, and on-chain incentive mechanics on Solana —
            so that peptide research is open, verifiable, and contributor-rewarded.
          </P>
          <P>
            Traditional drug and biotech research is closed. Results are gated behind journals, companies hoard
            data, and researchers get little credit for early contributions. PEPTOMA changes that: every sequence,
            annotation, and vote is permanently recorded and attributed on-chain, and contributors earn $PEPTOMA
            tokens for advancing the shared knowledge graph.
          </P>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-6">
            {[
              { icon: Dna, title: "Open Research", desc: "All analyses and annotations are public, permanent, and freely accessible." },
              { icon: Shield, title: "On-chain Provenance", desc: "Contributions are linked to wallet addresses — no one can claim or erase your work." },
              { icon: Users, title: "Community-Powered", desc: "Consensus emerges from annotators, not a single gatekeeper lab." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-4 rounded-lg border border-border bg-card/60 space-y-2">
                <Icon className="w-4 h-4 text-[hsl(var(--peptoma-cyan))]" />
                <p className="text-sm font-bold font-mono text-foreground">{title}</p>
                <p className="text-xs font-mono text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ── */}
        <section>
          <H2 id="how-it-works">How It Works</H2>
          <P>The PEPTOMA pipeline has four steps that turn raw amino-acid strings into peer-reviewed, on-chain research records.</P>

          <div className="space-y-3 my-5">
            {[
              { step: "01", title: "Submit a Sequence", desc: "Paste any peptide sequence in single-letter or FASTA format. Optionally set a disease target and research notes. Choose Standard or Deep analysis depth.", color: "text-[hsl(var(--peptoma-cyan))]" },
              { step: "02", title: "AI Runs Analysis", desc: "The PEPTOMA AI Engine predicts bioactivity class and score, estimates 3D conformation and structure confidence. A consensus engine cross-references known peptide databases. Results are ready within seconds.", color: "text-[hsl(var(--peptoma-gold))]" },
              { step: "03", title: "Community Annotates", desc: "Any user can Confirm, Challenge, Extend, or Tag an analysis. Annotations are stake-weighted: Pro and Lab tier researchers carry more consensus weight.", color: "text-[hsl(var(--peptoma-green))]" },
              { step: "04", title: "Earn $PEPTOMA", desc: "Every quality contribution earns research points that convert to $PEPTOMA tokens at launch. The more you contribute, the higher your tier and the more weight your future annotations carry.", color: "text-[hsl(var(--peptoma-cyan))]" },
            ].map(({ step, title, desc, color }) => (
              <div key={step} className="flex gap-4 p-4 rounded-lg border border-border bg-card/60">
                <span className={cn("font-display font-extrabold text-2xl leading-none mt-0.5 shrink-0", color)}>{step}</span>
                <div>
                  <p className="font-mono font-bold text-sm text-foreground mb-1">{title}</p>
                  <p className="text-xs font-mono text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── The Lab ── */}
        <section>
          <H2 id="the-lab">The Lab</H2>
          <P>The Lab is the core analysis interface. Navigate to <strong className="text-foreground font-mono">/lab</strong> or click "The Lab" in the navigation bar.</P>

          <H3>Submitting a Sequence</H3>
          <UL items={[
            "Paste a peptide sequence in single-letter amino-acid code (e.g. KWLRRVWRPQKI) or FASTA format.",
            "Optionally add a disease target (e.g. E. coli, MRSA, Cancer) to contextualise the analysis.",
            "Add research notes for any additional context you want the AI to consider.",
            "Choose your analysis depth — Standard or Deep.",
            "Click ANALYZE to submit. Results appear in seconds.",
          ]} />

          <H3>Analysis Depth</H3>
          <div className="grid grid-cols-2 gap-3 my-4">
            {[
              { label: "Standard", cost: "1 pt", features: ["AI bioactivity score & label", "Structure class prediction", "Confidence estimate", "~5–10 sec turnaround"] },
              { label: "Deep", cost: "5 pts", features: ["Everything in Standard", "Extended 3D structure modeling", "Higher confidence scoring", "Disease-target cross-reference", "AI annotation suggestions"] },
            ].map(({ label, cost, features }) => (
              <div key={label} className="p-4 rounded-lg border border-border bg-card/60 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-mono font-bold text-sm text-foreground">{label}</p>
                  <span className="text-[10px] font-mono text-[hsl(var(--peptoma-gold))] bg-[hsl(var(--peptoma-gold))/10] border border-[hsl(var(--peptoma-gold))/20] px-2 py-0.5 rounded">{cost}</span>
                </div>
                <ul className="space-y-1">
                  {features.map(f => (
                    <li key={f} className="text-[10px] font-mono text-muted-foreground flex items-center gap-1.5">
                      <CheckCircle className="w-2.5 h-2.5 text-[hsl(var(--peptoma-green))] shrink-0" />{f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <H3>Reading Results</H3>
          <UL items={[
            "Bioactivity Score (0–100) — confidence that the peptide is biologically active against its target.",
            "Structure Class — predicted fold: α-helix, β-sheet, random coil, or mixed.",
            "Toxicity Risk — low / medium / high, based on hemolysis and cytotoxicity models.",
            "Structure Confidence — only in Deep mode; extended confidence scoring of the 3D structure prediction.",
            "Suggestions — AI-generated annotation hints to guide community review.",
          ]} />

          <H3>AI Copilot</H3>
          <P>The Lab includes an AI Copilot panel (toggle with the lightbulb button in the header). Type any question about your sequence or click a quick-prompt chip to get instant help from GPT. The suggested text can be applied directly to your submission form.</P>
        </section>

        {/* ── Feed ── */}
        <section>
          <H2 id="feed">Feed & Annotations</H2>
          <P>The Feed at <strong className="text-foreground font-mono">/feed</strong> shows all submitted sequences ordered by vote count. Click any card to open the Annotation Panel and contribute your expert review.</P>

          <H3>Annotation Types</H3>
          <div className="space-y-2 my-4">
            {[
              { type: "CONFIRM", earn: "+2 pts", color: "text-[hsl(var(--peptoma-green))]", border: "border-[hsl(var(--peptoma-green))/20]", bg: "bg-[hsl(var(--peptoma-green))/8]", desc: "Agree with the AI's classification or bioactivity score. Use when the result matches known literature or your own expertise." },
              { type: "CHALLENGE", earn: "+3 pts", color: "text-[hsl(var(--peptoma-red))]", border: "border-[hsl(var(--peptoma-red))/20]", bg: "bg-[hsl(var(--peptoma-red))/8]", desc: "Dispute the result with evidence or reasoning (literature reference, alternative score, structural argument). Earns more because it adds high-value signal to the knowledge graph." },
              { type: "EXTEND", earn: "+5 pts", color: "text-[hsl(var(--peptoma-cyan))]", border: "border-[hsl(var(--peptoma-cyan))/20]", bg: "bg-[hsl(var(--peptoma-cyan))/8]", desc: "Add a related sequence, supporting data, or complementary analysis. The highest-earning annotation type — designed for researchers adding original contributions." },
              { type: "TAG", earn: "+2 pts", color: "text-[hsl(var(--peptoma-gold))]", border: "border-[hsl(var(--peptoma-gold))/20]", bg: "bg-[hsl(var(--peptoma-gold))/8]", desc: "Add a disease or target label. Helps organise the knowledge graph and improves searchability across the platform." },
            ].map(({ type, earn, color, border, bg, desc }) => (
              <div key={type} className={cn("p-3 rounded-lg border", border, bg)}>
                <div className="flex items-center gap-3 mb-1.5">
                  <span className={cn("text-xs font-mono font-bold tracking-widest", color)}>{type}</span>
                  <span className={cn("text-[10px] font-mono", color)}>{earn}</span>
                </div>
                <p className="text-xs font-mono text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <Note type="tip">Connect your Solana wallet before annotating. This links all contributions to your wallet address so they count towards your $PEPTOMA allocation at launch.</Note>

          <H3>Full Annotate Page</H3>
          <P>From the Feed, click "ANNOTATE" on any card to open the full detail view at <strong className="text-foreground font-mono">/annotate/:id</strong>. Here you can read the complete AI analysis, review all existing annotations, and submit your own.</P>
        </section>

        {/* ── Missions ── */}
        <section>
          <H2 id="missions">Mission Control</H2>
          <P>Mission Control at <strong className="text-foreground font-mono">/missions</strong> is your personal research dashboard. It tracks all activity tied to your wallet address or anonymous session ID.</P>

          <H3>What's Tracked</H3>
          <UL items={[
            "Total Runs — how many sequences you have submitted to The Lab.",
            "Completed Runs — analyses that finished successfully.",
            "Avg Bioactivity — average bioactivity score across your submissions.",
            "Annotations Made — total confirm / challenge / extend / tag annotations you have submitted.",
            "Research Points — cumulative points earned; these convert to $PEPTOMA at token launch.",
            "Staking Tier — your current access tier (FREE for everyone during pre-launch).",
            "Run Completion Rate — percentage of submitted sequences that completed analysis.",
            "Run History — paginated list of all your past submissions with status, score, and timestamp.",
          ]} />

          <H3>Staking Tiers</H3>
          <P>All tiers are FREE during pre-launch. Staking activates at token launch.</P>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 my-4">
            {[
              { tier: "FREE", req: "0 staked", perks: "3 runs/day · Standard only" },
              { tier: "RESEARCHER", req: "500 $PEPTOMA", perks: "20 runs/day · Deep access" },
              { tier: "PRO", req: "2,000 $PEPTOMA", perks: "Unlimited · API access · 2× vote" },
              { tier: "LAB", req: "10,000 $PEPTOMA", perks: "All Pro · 3× vote · Research grants" },
            ].map(({ tier, req, perks }) => (
              <div key={tier} className="p-3 rounded-lg border border-border bg-card/60 space-y-1">
                <p className="text-xs font-mono font-bold text-foreground">{tier}</p>
                <p className="text-[10px] font-mono text-[hsl(var(--peptoma-gold))]">{req}</p>
                <p className="text-[10px] font-mono text-muted-foreground">{perks}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Token ── */}
        <section>
          <H2 id="token">$PEPTOMA Token</H2>
          <P>$PEPTOMA is the platform's Solana SPL token, live on Solana Mainnet. Contract address: <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded select-all">HopMHHPfSV2kWQLghKt6xR1oWbPRLA2UyxnKGoPpump</code>. Research contributions are tracked on-chain and linked to your Solana wallet address.</P>

          <Note type="info">The official $PEPTOMA token is live. Always verify the contract address above before any transaction. Solscan · Birdeye · Raydium — links available on the $PEPTOMA page.</Note>

          <H3>How to Earn</H3>
          <UL items={[
            "Submit a sequence → +5 pts per successful analysis.",
            "Confirm annotation → +2 pts.",
            "Challenge annotation → +3 pts (must include reasoning).",
            "Extend annotation → +5 pts (add new sequence or supporting data).",
            "Tag annotation → +2 pts.",
            "Staking bonus (post-launch) → Pro and Lab tier stakers earn multiplied rewards on all contributions.",
          ]} />

          <H3>Token Distribution Plan</H3>
          <div className="space-y-2 my-4 rounded-lg border border-border bg-card/60 p-4">
            {[
              { label: "Community Rewards", pct: "40%", note: "Annotation, contribution, staking" },
              { label: "Ecosystem & Grants", pct: "20%", note: "Partner integrations, DeSci grants" },
              { label: "Team", pct: "15%", note: "2-year vest, 6-month cliff" },
              { label: "Treasury", pct: "15%", note: "Operational runway" },
              { label: "Public Sale", pct: "10%", note: "Launch event" },
            ].map(({ label, pct, note }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <span className="text-sm font-mono text-foreground">{label}</span>
                <div className="text-right">
                  <span className="text-sm font-mono font-bold text-foreground">{pct}</span>
                  <span className="text-[10px] font-mono text-muted-foreground ml-2">{note}</span>
                </div>
              </div>
            ))}
          </div>

          <H3>Governance (Post-Launch)</H3>
          <P>After token launch, $PEPTOMA holders participate in on-chain governance: propose and vote on changes to reward rates, staking requirements, annotation scoring weights, and API access policies. Vote power is proportional to staked amount.</P>
        </section>

        {/* ── Benefits ── */}
        <section>
          <H2 id="benefits">Benefits</H2>

          <H3>For Researchers & Scientists</H3>
          <UL items={[
            "Free access to AI-powered peptide analysis via the PEPTOMA AI Engine without running your own compute.",
            "Immutable, on-chain attribution for every sequence and annotation you contribute.",
            "Earn tokens for knowledge contributions — not just publishing in closed journals.",
            "Peer-review at internet speed: get community feedback in hours, not months.",
            "Access to a growing, curated peptide knowledge graph for literature searches and hit identification.",
          ]} />

          <H3>For Biotech & Pharma Teams</H3>
          <UL items={[
            "Scout early-stage peptide hits from an open, auditable database at no cost.",
            "Fund targeted research via grants from the Ecosystem allocation.",
            "Stake $PEPTOMA to get Lab tier API access for automated screening pipelines.",
            "Contribute proprietary data to the knowledge graph and receive on-chain attribution credit.",
          ]} />

          <H3>For AI Agents & Developers</H3>
          <UL items={[
            "Programmatic REST API access for sequence submission, retrieval, and annotation.",
            "Structured JSON outputs — no scraping or PDF parsing required.",
            "Build scoring pipelines, integrate into drug-discovery workflows, automate literature tracking.",
            "Pro/Lab tier API keys unlocked by staking $PEPTOMA (available post-launch).",
          ]} />

          <H3>For the DeSci Community</H3>
          <UL items={[
            "Every analysis and annotation is open-access and permanently citable.",
            "On-chain provenance — no institution can retract or bury data.",
            "Stake-weighted consensus produces more reliable signals than single-lab results.",
            "Open-source codebase — anyone can audit, fork, or extend the platform.",
          ]} />
        </section>

        {/* ── API Reference ── */}
        <section>
          <H2 id="api">API Reference</H2>
          <P>PEPTOMA exposes a fully documented REST API at <strong className="text-foreground font-mono">https://peptoma.xyz/api</strong>. GET (read) endpoints are publicly accessible. POST/DELETE (write) endpoints require a Bearer API key issued to PRO or LAB tier stakers.</P>

          <div className="grid grid-cols-3 gap-3 my-5">
            {[
              { label: "Base URL", value: "peptoma.xyz/api", icon: Globe },
              { label: "Format", value: "JSON", icon: CheckCircle },
              { label: "Auth", value: "Bearer token", icon: Shield },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="p-3 rounded-lg border border-border bg-card/60 text-center space-y-1">
                <Icon className="w-4 h-4 text-[hsl(var(--peptoma-cyan))] mx-auto" />
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{label}</p>
                <p className="text-xs font-mono font-bold text-foreground">{value}</p>
              </div>
            ))}
          </div>

          {/* Auth */}
          <H3 id="api-auth">Authentication</H3>
          <P>Generate an API key from <strong className="text-foreground">Mission Control → API Keys</strong> (requires PRO or LAB staking tier). Pass the key as a Bearer token on every request.</P>
          <CodeBlock language="bash" code={`# All write requests need this header
Authorization: Bearer pptm_your48hexkeyhere`} />

          <Note type="warn">API keys are shown only once at generation time. Store them securely (environment variable or secret manager). Revoke any leaked key immediately from Mission Control.</Note>

          <div className="rounded-lg border border-border bg-card/60 overflow-hidden my-4">
            <div className="px-4 py-2 border-b border-border/40 bg-muted/10">
              <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">Rate Limits by Tier</span>
            </div>
            {[
              { tier: "FREE", runs: "3 / day", api: "No", note: "Public read endpoints always accessible" },
              { tier: "RESEARCHER", runs: "20 / day", api: "No", note: "≥500 $PEPTM staked" },
              { tier: "PRO", runs: "Unlimited", api: "Yes", note: "≥2,000 $PEPTM — API key generation unlocked" },
              { tier: "LAB", runs: "Unlimited", api: "Yes", note: "≥10,000 $PEPTM — all Pro benefits" },
            ].map(({ tier, runs, api, note }) => (
              <div key={tier} className="flex items-center gap-3 py-3 px-4 border-b border-border/30 last:border-0">
                <span className="font-mono text-xs font-bold text-foreground w-24 shrink-0">{tier}</span>
                <span className="font-mono text-xs text-[hsl(var(--peptoma-cyan))] w-24 shrink-0">{runs}</span>
                <span className={cn("font-mono text-xs w-8 shrink-0", api === "Yes" ? "text-[hsl(var(--peptoma-green))]" : "text-muted-foreground/50")}>{api}</span>
                <span className="font-mono text-[10px] text-muted-foreground hidden sm:block">{note}</span>
              </div>
            ))}
          </div>
          <P>Limits reset at <strong className="text-foreground">midnight UTC</strong>. Exceeded limits return HTTP <code className="text-xs font-mono bg-muted px-1 rounded">429</code>.</P>

          {/* Endpoints */}
          <H3 id="api-endpoints">Endpoints</H3>

          {/* Endpoint table */}
          <div className="rounded-lg border border-border bg-card/60 overflow-hidden my-4">
            {[
              { method: "POST", path: "/sequences", auth: true, desc: "Submit a peptide sequence for AI analysis" },
              { method: "GET", path: "/sequences/:id", auth: false, desc: "Retrieve a single sequence analysis result" },
              { method: "GET", path: "/feed", auth: false, desc: "List all public sequences (paginated, filterable)" },
              { method: "GET", path: "/feed/trending", auth: false, desc: "Top sequences ranked by community vote count" },
              { method: "GET", path: "/feed/stats", auth: false, desc: "Platform-wide aggregate statistics" },
              { method: "POST", path: "/annotations", auth: true, desc: "Submit a peer-review annotation on a sequence" },
              { method: "GET", path: "/annotations/:seqId", auth: false, desc: "List all annotations for a sequence" },
              { method: "POST", path: "/annotations/:id/vote", auth: false, desc: "Upvote or downvote an annotation" },
              { method: "GET", path: "/token/balance", auth: false, desc: "Get wallet token balance and staking tier" },
              { method: "GET", path: "/token/leaderboard", auth: false, desc: "Top contributors by research points" },
              { method: "POST", path: "/keys/generate", auth: true, desc: "Generate a new API key (PRO/LAB only)" },
              { method: "GET", path: "/keys", auth: true, desc: "List all active API keys for a wallet" },
              { method: "DELETE", path: "/keys/:id", auth: true, desc: "Revoke an API key" },
            ].map(({ method, path, auth, desc }) => {
              const colors: Record<string, string> = {
                GET: "text-[hsl(var(--peptoma-cyan))] bg-[hsl(var(--peptoma-cyan))/10] border-[hsl(var(--peptoma-cyan))/20]",
                POST: "text-[hsl(var(--peptoma-gold))] bg-[hsl(var(--peptoma-gold))/10] border-[hsl(var(--peptoma-gold))/20]",
                DELETE: "text-[hsl(var(--peptoma-red))] bg-[hsl(var(--peptoma-red))/10] border-[hsl(var(--peptoma-red))/20]",
              };
              return (
                <div key={path} className="flex items-center gap-3 py-2.5 px-4 border-b border-border/30 last:border-0">
                  <span className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase font-bold w-12 text-center shrink-0", colors[method])}>{method}</span>
                  <span className="font-mono text-xs text-foreground flex-1">{path}</span>
                  {auth && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-[hsl(var(--peptoma-gold))/30] text-[hsl(var(--peptoma-gold))] shrink-0">KEY</span>}
                  <span className="text-[10px] font-mono text-muted-foreground hidden md:block w-56 shrink-0">{desc}</span>
                </div>
              );
            })}
          </div>

          <H3>POST /sequences — Submit a Sequence</H3>
          <CodeBlock language="bash" code={`curl -X POST https://peptoma.xyz/api/sequences \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer pptm_your_api_key" \\
  -d '{
    "sequence": "KWLRRVWRPQKI",
    "userId": "your_wallet_address",
    "diseaseTarget": "MRSA",
    "notes": "AMP candidate from screen",
    "depth": "standard"
  }'`} />
          <CodeBlock language="json" code={`{
  "id": 42,
  "sequence": "KWLRRVWRPQKI",
  "status": "completed",
  "bioactivityScore": 91,
  "bioactivityLabel": "antimicrobial",
  "confidenceScore": 84,
  "structurePrediction": "alpha_helix",
  "toxicityRisk": "low",
  "molecularWeight": 1561.9,
  "hydrophobicityIndex": 0.42,
  "chargeAtPH7": 4,
  "halfLife": "2h",
  "tags": ["membrane-active"],
  "annotationSuggestions": [
    "Confirm antimicrobial activity — typical membrane-disrupting motif.",
    "Challenge: verify hemolytic activity at therapeutic concentrations."
  ],
  "voteCount": 14,
  "annotationCount": 3,
  "diseaseTarget": "MRSA",
  "createdAt": "2026-05-01T12:00:00Z"
}`} />

          <H3>GET /feed — List Sequences</H3>
          <CodeBlock language="bash" code={`curl "https://peptoma.xyz/api/feed?limit=20&minScore=70&sort=votes"

# Query params:
#   limit        integer   max results (default 20, max 100)
#   offset       integer   pagination offset (default 0)
#   diseaseTarget string  filter by target (e.g. "MRSA", "Cancer")
#   minScore     integer   minimum bioactivityScore
#   sort         string    "newest" | "score" | "votes"`} />

          <H3>POST /annotations — Annotate a Sequence</H3>
          <CodeBlock language="bash" code={`curl -X POST https://peptoma.xyz/api/annotations \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer pptm_your_api_key" \\
  -d '{
    "sequenceId": 42,
    "userId": "your_wallet_address",
    "type": "confirm",
    "content": "Matches APD database entry #1824. Confirmed membrane-active AMP."
  }'`} />
          <Note type="tip">Annotation types: <code className="text-xs font-mono bg-muted px-1 rounded">confirm</code> (+2 pts) · <code className="text-xs font-mono bg-muted px-1 rounded">challenge</code> (+3 pts) · <code className="text-xs font-mono bg-muted px-1 rounded">extend</code> (+5 pts) · <code className="text-xs font-mono bg-muted px-1 rounded">tag</code> (+2 pts). Points accumulate in your Mission Control dashboard.</Note>

          <H3>POST /annotations/:id/vote</H3>
          <CodeBlock language="bash" code={`curl -X POST https://peptoma.xyz/api/annotations/7/vote \\
  -H "Content-Type: application/json" \\
  -d '{ "direction": "up" }'
# Returns: { "score": 5 }`} />

          {/* SDK */}
          <H3 id="api-sdk">TypeScript SDK</H3>
          <P>Install the official SDK to interact with the PEPTOMA API from Node.js, Bun, Deno, or any TypeScript project. Full type safety included — no manual type definitions needed.</P>

          <CodeBlock language="bash" code={`npm install peptoma-sdk
# or
pnpm add peptoma-sdk`} />

          <CodeBlock language="typescript" code={`import { PeptomaClient } from "peptoma-sdk";

const client = new PeptomaClient({
  apiKey: process.env.PEPTOMA_API_KEY!, // pptm_...
});

// Analyze a peptide
const result = await client.sequences.analyze({
  sequence: "KWLRRVWRPQKI",
  depth: "standard",
  diseaseTarget: "MRSA",
});
console.log(result.bioactivityScore);  // 91
console.log(result.bioactivityLabel);  // "antimicrobial"
console.log(result.toxicityRisk);      // "low"

// List trending sequences
const trending = await client.feed.trending();

// Submit annotation
await client.annotations.create({
  sequenceId: result.id,
  userId: "your_wallet_address",
  type: "confirm",
  content: "Matches known AMPs — consistent membrane-disruptive mechanism.",
});

// Vote on an annotation
await client.annotations.vote(7, "up");`} />

          <H3>SDK — Screening Pipeline Example</H3>
          <CodeBlock language="typescript" code={`import { PeptomaClient } from "peptoma-sdk";

const client = new PeptomaClient({ apiKey: process.env.PEPTOMA_API_KEY! });

const candidates = ["KWLRRVWRPQKI", "ACDEFGHIKLM", "GIINTLQKYYCR"];

const results = await Promise.all(
  candidates.map(seq =>
    client.sequences.analyze({ sequence: seq, depth: "deep", diseaseTarget: "MRSA" })
  )
);

const hits = results.filter(
  r => r.bioactivityScore >= 75 &&
       r.bioactivityLabel === "antimicrobial" &&
       r.toxicityRisk === "low"
);

console.log(\`\${hits.length}/\${results.length} candidates passed screening\`);

// Auto-annotate confirmed hits
for (const hit of hits) {
  await client.annotations.create({
    sequenceId: hit.id,
    userId: "pipeline_bot",
    type: "confirm",
    content: \`Automated screen: score \${hit.bioactivityScore}, confidence \${hit.confidenceScore}\`,
  });
}`} />

          <Note type="info">The SDK is available on npm as <code className="text-xs font-mono bg-muted px-1 rounded">peptoma-sdk</code>. Source on GitHub at <code className="text-xs font-mono bg-muted px-1 rounded">github.com/peptoma/peptoma-sdk</code>. Full TypeScript definitions included — no <code className="text-xs font-mono bg-muted px-1 rounded">@types</code> package needed.</Note>

          {/* Error codes */}
          <H3 id="api-errors">Error Codes</H3>
          <div className="rounded-lg border border-border bg-card/60 overflow-hidden my-4">
            {[
              { code: "400", label: "Bad Request", desc: "Invalid sequence format, missing required field, or malformed request body." },
              { code: "401", label: "Unauthorized", desc: "Missing or invalid Authorization header. Ensure key starts with pptm_." },
              { code: "403", label: "Forbidden", desc: "Your staking tier does not permit this action (e.g. FREE tier generating API keys)." },
              { code: "404", label: "Not Found", desc: "Sequence or annotation ID does not exist." },
              { code: "429", label: "Too Many Requests", desc: "Daily run limit reached. Resets at midnight UTC. Upgrade tier to increase limits." },
              { code: "500", label: "Server Error", desc: "Internal server error. Retry with exponential back-off." },
            ].map(({ code, label, desc }) => (
              <div key={code} className="flex gap-4 py-3 px-4 border-b border-border/30 last:border-0">
                <span className={cn("font-mono text-xs font-bold shrink-0 w-10 pt-0.5", code.startsWith("4") ? "text-[hsl(var(--peptoma-gold))]" : code.startsWith("5") ? "text-[hsl(var(--peptoma-red))]" : "text-[hsl(var(--peptoma-cyan))]")}>{code}</span>
                <div>
                  <p className="font-mono text-xs font-bold text-foreground mb-0.5">{label}</p>
                  <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <CodeBlock language="typescript" code={`import { PeptomaClient } from "peptoma-sdk";
import type { PeptomaError } from "peptoma-sdk";

try {
  await client.sequences.analyze({ sequence: "ACDEF" });
} catch (err) {
  const e = err as PeptomaError;
  if (e.status === 429) {
    console.error("Daily limit hit — upgrade tier or wait for midnight UTC reset");
  } else if (e.status === 401) {
    console.error("Invalid API key");
  } else {
    console.error(e.message, e.body);
  }
}`} />
        </section>

        {/* ── FAQ ── */}
        <section>
          <H2 id="faq">Frequently Asked Questions</H2>

          <div className="space-y-0">
            {[
              {
                q: "Do I need a wallet to use PEPTOMA?",
                a: "No. You can browse the Feed, read analyses, and submit sequences without a wallet. However, connecting a Solana wallet (Phantom recommended) links contributions to your address, ensuring you receive $PEPTOMA tokens at launch.",
              },
              {
                q: "Is the $PEPTOMA token live?",
                a: "$PEPTOMA is live on Solana Mainnet. CA: HopMHHPfSV2kWQLghKt6xR1oWbPRLA2UyxnKGoPpump. Available on Raydium, trackable on Birdeye and Solscan. Always verify the official contract address before any transaction.",
              },
              {
                q: "How accurate are the AI analyses?",
                a: "The PEPTOMA AI Engine is built for peptide-specific analysis, combining deterministic biochemical computation with AI inference. Standard analysis is reliable for initial screening. Deep analysis adds extended structure modeling and higher-confidence predictions. Community annotations (Confirm/Challenge) are the primary quality filter.",
              },
              {
                q: "What peptide formats are accepted?",
                a: "Single-letter amino-acid code (e.g. KWLRRVWRPQKI) or FASTA format. Sequences should be between 3 and 200 residues. Non-standard residues may reduce prediction quality.",
              },
              {
                q: "Can I use PEPTOMA for commercial research?",
                a: "Yes. All analyses are open-access and results can be used freely. If you are building products on top of PEPTOMA data, consider contributing back to the knowledge graph and staking $PEPTOMA to support the ecosystem.",
              },
              {
                q: "How do Challenge annotations work?",
                a: "A Challenge disputes the AI's result. You must include a reason — a literature reference, alternative classification, or structural argument. Well-reasoned challenges that the community agrees with can shift the consensus classification and earn higher rewards.",
              },
              {
                q: "Is the source code open?",
                a: "Yes. PEPTOMA is open-source. The repository is available at github.com/peptoma.",
              },
              {
                q: "How do I connect my Solana wallet?",
                a: "Click 'Connect Wallet' on any page (The Lab, Mission Control, or $PEPTOMA Token). PEPTOMA supports Phantom Wallet. If Phantom is not installed, you will be redirected to phantom.app to install it.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="py-4 border-b border-border/40 last:border-0">
                <p className="font-mono font-bold text-sm text-foreground mb-2">{q}</p>
                <p className="font-mono text-xs text-muted-foreground leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
