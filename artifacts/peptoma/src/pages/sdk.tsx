import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy, CheckCircle, ChevronDown, ExternalLink, Package,
  Zap, Shield, Code2, Layers, MessageSquare, Coins, Key,
  ArrowRight, Terminal, FileCode2, Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? <CheckCircle className="w-3 h-3 text-[hsl(var(--peptoma-green))]" /> : <Copy className="w-3 h-3" />}
      {copied ? "copied" : "copy"}
    </button>
  );
}

function CodeBlock({ code, language = "bash", className }: { code: string; language?: string; className?: string }) {
  return (
    <div className={cn("relative rounded-xl bg-[#0d1117] border border-white/8 overflow-hidden", className)}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/6 bg-white/3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--peptoma-red))/60]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--peptoma-gold))/60]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--peptoma-green))/60]" />
          </div>
          <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">{language}</span>
        </div>
        <CopyButton text={code} />
      </div>
      <pre className="p-5 text-xs font-mono leading-relaxed overflow-x-auto">
        <code className="text-green-300/85 whitespace-pre">{code}</code>
      </pre>
    </div>
  );
}

interface AccordionItem {
  id: string;
  method: string;
  signature: string;
  returns: string;
  desc: string;
  code: string;
  badge?: string;
}

function MethodAccordion({ items }: { items: AccordionItem[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
      {items.map(item => (
        <div key={item.id}>
          <button
            onClick={() => setOpen(open === item.id ? null : item.id)}
            className="w-full flex items-center gap-3 px-5 py-3.5 bg-card/60 hover:bg-muted/10 transition-colors text-left"
          >
            <code className="text-[11px] font-mono font-bold text-[hsl(var(--peptoma-cyan))] shrink-0">{item.method}</code>
            <code className="text-[10px] font-mono text-muted-foreground flex-1 hidden sm:block truncate">{item.signature}</code>
            {item.badge && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-[hsl(var(--peptoma-gold))/30] text-[hsl(var(--peptoma-gold))] shrink-0">{item.badge}</span>
            )}
            <span className="text-[10px] font-mono text-muted-foreground/50 shrink-0 hidden sm:block">→ {item.returns}</span>
            <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform", open === item.id && "rotate-180")} />
          </button>
          <AnimatePresence>
            {open === item.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <div className="px-5 py-4 space-y-3 bg-muted/5">
                  <p className="text-xs font-mono text-muted-foreground">{item.desc}</p>
                  <CodeBlock code={item.code} language="typescript" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

const SECTIONS = [
  {
    id: "sequences",
    label: "sequences",
    icon: FileCode2,
    color: "text-[hsl(var(--peptoma-cyan))]",
    bg: "bg-[hsl(var(--peptoma-cyan))/8]",
    border: "border-[hsl(var(--peptoma-cyan))/20]",
    desc: "Submit peptide sequences for AI analysis and retrieve results.",
    methods: [
      {
        id: "analyze",
        method: ".analyze(options)",
        signature: "analyze({ sequence, depth?, diseaseTarget?, notes?, userId? })",
        returns: "Promise<SequenceAnalysis>",
        desc: "Submit a peptide sequence for AI analysis. Returns a full result object with bioactivity score, structure prediction, toxicity risk, confidence score, and annotation suggestions.",
        code: `const result = await client.sequences.analyze({
  sequence: "KWLRRVWRPQKI",       // single-letter amino acid code
  depth: "deep",                  // "standard" (default) | "deep"
  diseaseTarget: "MRSA",          // optional — disease or organism context
  notes: "AMP candidate",         // optional — research notes
  userId: "your_wallet_address",  // optional — link to on-chain identity
});

console.log(result.bioactivityScore);  // 91
console.log(result.bioactivityLabel);  // "antimicrobial"
console.log(result.toxicityRisk);      // "low"
console.log(result.confidenceScore);   // 84
console.log(result.halfLife);          // "2h"`,
      },
      {
        id: "get",
        method: ".get(id)",
        signature: "get(id: number)",
        returns: "Promise<SequenceAnalysis>",
        desc: "Retrieve a previously submitted sequence analysis by its numeric ID.",
        code: `const result = await client.sequences.get(42);
console.log(result.sequence);    // "KWLRRVWRPQKI"
console.log(result.status);      // "completed"`,
      },
    ] as AccordionItem[],
  },
  {
    id: "feed",
    label: "feed",
    icon: Layers,
    color: "text-[hsl(var(--peptoma-gold))]",
    bg: "bg-[hsl(var(--peptoma-gold))/8]",
    border: "border-[hsl(var(--peptoma-gold))/20]",
    desc: "Access the public research feed, trending sequences, and platform statistics.",
    methods: [
      {
        id: "feed-list",
        method: ".list(options?)",
        signature: "list({ limit?, offset?, diseaseTarget?, minScore?, sort? })",
        returns: "Promise<FeedResponse>",
        desc: "Fetch the public research feed. Supports pagination, filtering by disease target, minimum bioactivity score, and sorting.",
        code: `const { sequences, total } = await client.feed.list({
  limit: 20,                // max results per page (default: 20, max: 100)
  offset: 0,               // pagination offset
  diseaseTarget: "Cancer", // filter by disease target
  minScore: 70,            // minimum bioactivity score
  sort: "votes",           // "newest" | "score" | "votes"
});

console.log(\`\${sequences.length} of \${total} sequences\`);`,
      },
      {
        id: "feed-trending",
        method: ".trending()",
        signature: "trending()",
        returns: "Promise<SequenceAnalysis[]>",
        desc: "Fetch the top sequences ranked by community vote count.",
        code: `const trending = await client.feed.trending();
trending.forEach(seq => {
  console.log(seq.sequence, "—", seq.voteCount, "votes");
});`,
      },
      {
        id: "feed-stats",
        method: ".stats()",
        signature: "stats()",
        returns: "Promise<FeedStats>",
        desc: "Get platform-wide aggregate statistics including total sequences, average bioactivity score, and total annotation count.",
        code: `const stats = await client.feed.stats();
// {
//   totalSequences: 1241,
//   avgBioactivityScore: 62.4,
//   totalAnnotations: 8302,
//   totalVotes: 4100
// }`,
      },
    ] as AccordionItem[],
  },
  {
    id: "annotations",
    label: "annotations",
    icon: MessageSquare,
    color: "text-[hsl(var(--peptoma-green))]",
    bg: "bg-[hsl(var(--peptoma-green))/8]",
    border: "border-[hsl(var(--peptoma-green))/20]",
    desc: "Submit and retrieve peer-review annotations. Earn research points redeemable for $PEPTM.",
    methods: [
      {
        id: "ann-list",
        method: ".list(sequenceId)",
        signature: "list(sequenceId: number)",
        returns: "Promise<Annotation[]>",
        desc: "List all peer-review annotations for a given sequence ID.",
        code: `const annotations = await client.annotations.list(42);
annotations.forEach(a => {
  console.log(a.type, a.content, "—", a.score, "pts");
});`,
      },
      {
        id: "ann-create",
        method: ".create(options)",
        signature: "create({ sequenceId, userId, type, content? })",
        returns: "Promise<Annotation>",
        desc: "Submit a peer-review annotation. Types: confirm (+2 pts), challenge (+3 pts), extend (+5 pts), tag (+2 pts). Points accumulate in Mission Control.",
        code: `const annotation = await client.annotations.create({
  sequenceId: 42,
  userId: "your_wallet_address",
  type: "confirm",   // "confirm" | "challenge" | "extend" | "tag"
  content: "Consistent with APD entry #1824. Confirmed membrane-active AMP.",
});

console.log(annotation.tokensEarned); // 2`,
      },
      {
        id: "ann-vote",
        method: ".vote(annotationId, direction)",
        signature: "vote(annotationId: number, direction: 'up' | 'down')",
        returns: "Promise<VoteResult>",
        desc: "Upvote or downvote a peer annotation. Returns the updated score.",
        code: `const { score } = await client.annotations.vote(7, "up");
console.log("New score:", score); // 5`,
      },
    ] as AccordionItem[],
  },
  {
    id: "keys",
    label: "keys",
    icon: Key,
    color: "text-purple-400",
    bg: "bg-purple-400/8",
    border: "border-purple-400/20",
    desc: "Generate, list, and revoke API keys programmatically. Requires PRO or LAB tier.",
    methods: [
      {
        id: "keys-list",
        method: ".list()",
        signature: "list()",
        returns: "Promise<ApiKey[]>",
        badge: "PRO/LAB",
        desc: "List all active API keys associated with your wallet address.",
        code: `const keys = await client.keys.list();
keys.forEach(k => {
  console.log(k.label, k.keyPreview, k.lastUsedAt);
});`,
      },
      {
        id: "keys-gen",
        method: ".generate(options?)",
        signature: "generate({ label? })",
        returns: "Promise<GenerateKeyResult>",
        badge: "PRO/LAB",
        desc: "Generate a new API key. The full key is returned only once — store it securely immediately.",
        code: `const { key, id } = await client.keys.generate({ label: "CI pipeline" });
// key = "pptm_abc123..." — shown only once
// Store in .env or secret manager immediately`,
      },
      {
        id: "keys-revoke",
        method: ".revoke(id)",
        signature: "revoke(id: number)",
        returns: "Promise<{ success: boolean }>",
        badge: "PRO/LAB",
        desc: "Permanently revoke an API key by its ID. The key becomes invalid immediately.",
        code: `const { success } = await client.keys.revoke(3);
console.log(success); // true`,
      },
    ] as AccordionItem[],
  },
  {
    id: "token",
    label: "token",
    icon: Coins,
    color: "text-[hsl(var(--peptoma-gold))]",
    bg: "bg-[hsl(var(--peptoma-gold))/8]",
    border: "border-[hsl(var(--peptoma-gold))/20]",
    desc: "Query token balances, staking tiers, and the contributor leaderboard.",
    methods: [
      {
        id: "token-balance",
        method: ".balance(walletAddress)",
        signature: "balance(walletAddress: string)",
        returns: "Promise<TokenBalance>",
        desc: "Get the $PEPTM token balance, staked amount, tier, and pending rewards for a given wallet address.",
        code: `const data = await client.token.balance(
  "8PAdZPAEEaD5gfJxbC1fFp4q7cpCNHhz4ycQMdT8P8Lg"
);
// { balance, stakedAmount, tier: "pro", pendingRewards }`,
      },
      {
        id: "token-leaderboard",
        method: ".leaderboard()",
        signature: "leaderboard()",
        returns: "Promise<Leaderboard[]>",
        desc: "Fetch the top contributors ranked by cumulative research points.",
        code: `const leaders = await client.token.leaderboard();
leaders.slice(0, 5).forEach((l, i) => {
  console.log(\`#\${i + 1} \${l.userId} — \${l.totalPoints} pts\`);
});`,
      },
    ] as AccordionItem[],
  },
];

export default function SdkPage() {
  const [activeSection, setActiveSection] = useState("sequences");

  return (
    <div className="space-y-0 pb-20">

      {/* Hero */}
      <div className="relative rounded-2xl border border-border bg-card/60 overflow-hidden mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--peptoma-cyan))/4] via-transparent to-[hsl(var(--peptoma-gold))/3] pointer-events-none" />
        <div className="relative px-6 py-10 md:px-10 md:py-14">
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-4 tracking-widest uppercase">
            <Package className="w-3.5 h-3.5 text-[hsl(var(--peptoma-cyan))]" />
            <span>npmjs.com/package/peptoma-sdk</span>
          </div>

          <h1 className="font-display font-extrabold text-4xl md:text-5xl text-foreground mb-3 leading-tight">
            peptoma<span className="text-[hsl(var(--peptoma-cyan))]">-</span>sdk
          </h1>
          <p className="font-mono text-sm text-muted-foreground max-w-lg mb-8 leading-relaxed">
            Official TypeScript / JavaScript SDK for the PEPTOMA platform. AI-powered peptide analysis, community annotations, and on-chain research incentives — in one package.
          </p>

          <div className="flex flex-wrap gap-3 mb-8">
            {[
              { label: "v0.1.0", color: "text-[hsl(var(--peptoma-cyan))] border-[hsl(var(--peptoma-cyan))/30] bg-[hsl(var(--peptoma-cyan))/8]" },
              { label: "TypeScript", color: "text-blue-400 border-blue-400/30 bg-blue-400/8" },
              { label: "CJS + ESM", color: "text-muted-foreground border-border bg-muted/20" },
              { label: "MIT License", color: "text-muted-foreground border-border bg-muted/20" },
            ].map(({ label, color }) => (
              <span key={label} className={cn("text-[10px] font-mono px-2.5 py-1 rounded-full border", color)}>{label}</span>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
            <CodeBlock code="npm install peptoma-sdk" language="npm" />
            <CodeBlock code="pnpm add peptoma-sdk" language="pnpm" />
            <CodeBlock code="yarn add peptoma-sdk" language="yarn" />
          </div>

          <div className="flex flex-wrap gap-3">
            <a href="https://www.npmjs.com/package/peptoma-sdk" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[hsl(var(--peptoma-cyan))] text-black text-xs font-mono font-bold hover:bg-[hsl(var(--peptoma-cyan))/90] transition-colors">
              <ExternalLink className="w-3.5 h-3.5" /> View on npm
            </a>
            <Link href="/docs#api">
              <span className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-xs font-mono text-muted-foreground hover:text-foreground hover:border-[hsl(var(--peptoma-cyan))/30] transition-colors cursor-pointer">
                <Globe className="w-3.5 h-3.5" /> REST API Docs
              </span>
            </Link>
            <a href="/missions#api-keys">
              <span className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-xs font-mono text-muted-foreground hover:text-foreground hover:border-[hsl(var(--peptoma-cyan))/30] transition-colors cursor-pointer">
                <Key className="w-3.5 h-3.5" /> Get API Key
              </span>
            </a>
          </div>
        </div>
      </div>

      {/* Quick Start */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[hsl(var(--peptoma-cyan))]" />
            <h2 className="font-display font-bold text-lg text-foreground">Quick Start</h2>
          </div>
          <CodeBlock language="typescript" code={`import { PeptomaClient } from "peptoma-sdk";

const client = new PeptomaClient({
  apiKey: process.env.PEPTOMA_API_KEY!,
  // baseUrl defaults to https://peptoma.xyz/api
});

// Analyze a peptide sequence
const result = await client.sequences.analyze({
  sequence: "KWLRRVWRPQKI",
  depth: "standard",
  diseaseTarget: "MRSA",
});

console.log(result.bioactivityScore);  // 91
console.log(result.bioactivityLabel);  // "antimicrobial"
console.log(result.toxicityRisk);      // "low"`} />
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[hsl(var(--peptoma-gold))]" />
            <h2 className="font-display font-bold text-lg text-foreground">Screening Pipeline</h2>
          </div>
          <CodeBlock language="typescript" code={`const candidates = [
  "KWLRRVWRPQKI",
  "GIINTLQKYYCRVRGG",
  "ACDEFGHIKLM",
];

const results = await Promise.all(
  candidates.map(seq =>
    client.sequences.analyze({
      sequence: seq, depth: "deep",
    })
  )
);

const hits = results.filter(r =>
  r.bioactivityScore >= 75 &&
  r.toxicityRisk === "low"
);

console.log(\`\${hits.length}/\${results.length} passed\`);

// Annotate confirmed hits
for (const hit of hits) {
  await client.annotations.create({
    sequenceId: hit.id,
    userId: "pipeline_bot",
    type: "confirm",
    content: \`Score: \${hit.bioactivityScore}\`,
  });
}`} />
        </div>
      </div>

      {/* Auth + Rate limits */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="rounded-xl border border-border bg-card/60 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[hsl(var(--peptoma-cyan))]" />
            <h2 className="font-display font-bold text-base text-foreground">Authentication</h2>
          </div>
          <p className="text-xs font-mono text-muted-foreground leading-relaxed">
            API keys are available to <span className="text-foreground font-bold">PRO</span> (≥ 2,000 $PEPTM) and <span className="text-foreground font-bold">LAB</span> (≥ 10,000 $PEPTM) tier stakers. Generate from Mission Control.
          </p>
          <CodeBlock language="typescript" code={`const client = new PeptomaClient({
  apiKey: process.env.PEPTOMA_API_KEY!,
  // key format: pptm_<48-char-hex>
});`} />
          <Link href="/missions">
            <span className="flex items-center gap-2 text-xs font-mono text-[hsl(var(--peptoma-cyan))] hover:underline cursor-pointer">
              Generate API key in Mission Control <ArrowRight className="w-3 h-3" />
            </span>
          </Link>
        </div>

        <div className="rounded-xl border border-border bg-card/60 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[hsl(var(--peptoma-gold))]" />
            <h2 className="font-display font-bold text-base text-foreground">Rate Limits</h2>
          </div>
          <div className="space-y-2">
            {[
              { tier: "FREE", req: "No stake", limit: "3 / day", api: false },
              { tier: "RESEARCHER", req: "≥ 500 $PEPTM", limit: "20 / day", api: false },
              { tier: "PRO", req: "≥ 2,000 $PEPTM", limit: "Unlimited", api: true },
              { tier: "LAB", req: "≥ 10,000 $PEPTM", limit: "Unlimited", api: true },
            ].map(({ tier, req, limit, api }) => (
              <div key={tier} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
                <span className="font-mono text-xs font-bold text-foreground w-24 shrink-0">{tier}</span>
                <span className="font-mono text-[10px] text-muted-foreground flex-1">{req}</span>
                <span className={cn("font-mono text-xs shrink-0", api ? "text-[hsl(var(--peptoma-cyan))]" : "text-muted-foreground/50")}>{limit}</span>
                {api && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-[hsl(var(--peptoma-green))/30] text-[hsl(var(--peptoma-green))] shrink-0">API</span>}
              </div>
            ))}
          </div>
          <p className="text-[10px] font-mono text-muted-foreground/60">Limits reset at midnight UTC. Exceeded limits return HTTP 429.</p>
        </div>
      </div>

      {/* Method Reference */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-[hsl(var(--peptoma-cyan))]" />
          <h2 className="font-display font-bold text-xl text-foreground">Method Reference</h2>
        </div>

        {/* Section tabs */}
        <div className="flex flex-wrap gap-2 mb-2">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border transition-all",
                activeSection === s.id
                  ? cn("border-transparent", s.bg, s.color)
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/10"
              )}
            >
              {(() => { const Icon = s.icon; return <Icon className="w-3 h-3" />; })()}
              client.{s.label}
            </button>
          ))}
        </div>

        {SECTIONS.map(s => (
          <div key={s.id} className={cn(activeSection !== s.id && "hidden")}>
            <div className={cn("rounded-xl border p-4 mb-3 flex items-start gap-3", s.border, s.bg)}>
              {(() => { const Icon = s.icon; return <Icon className={cn("w-4 h-4 shrink-0 mt-0.5", s.color)} />; })()}
              <p className="text-xs font-mono text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
            <MethodAccordion items={s.methods} />
          </div>
        ))}
      </div>

      {/* Error handling */}
      <div className="mt-8 space-y-4">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-[hsl(var(--peptoma-gold))]" />
          <h2 className="font-display font-bold text-xl text-foreground">Error Handling</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CodeBlock language="typescript" code={`import type { PeptomaError } from "peptoma-sdk";

try {
  const result = await client.sequences.analyze({
    sequence: "ACDEF",
  });
} catch (err) {
  const e = err as PeptomaError;

  switch (e.status) {
    case 400: // Bad request
      console.error("Invalid input:", e.message);
      break;
    case 401: // Unauthorized
      console.error("Invalid API key");
      break;
    case 403: // Forbidden
      console.error("Tier not permitted:", e.message);
      break;
    case 429: // Rate limit
      console.error("Daily limit hit — resets midnight UTC");
      break;
    default:
      console.error("Error", e.status, e.body);
  }
}`} />
          <div className="rounded-xl border border-border bg-card/60 overflow-hidden self-start">
            {[
              { code: "400", label: "Bad Request", desc: "Invalid sequence, missing required field, or malformed body." },
              { code: "401", label: "Unauthorized", desc: "Missing or invalid API key. Ensure it starts with pptm_." },
              { code: "403", label: "Forbidden", desc: "Staking tier does not permit this action." },
              { code: "404", label: "Not Found", desc: "Sequence or annotation ID does not exist." },
              { code: "429", label: "Too Many Requests", desc: "Daily limit exceeded. Resets midnight UTC." },
              { code: "500", label: "Server Error", desc: "Internal error. Retry with exponential back-off." },
            ].map(({ code, label, desc }) => (
              <div key={code} className="flex gap-4 px-4 py-3 border-b border-border/30 last:border-0">
                <span className={cn("font-mono text-xs font-bold shrink-0 w-10 pt-0.5",
                  code === "429" ? "text-[hsl(var(--peptoma-red))]" :
                  code.startsWith("4") ? "text-[hsl(var(--peptoma-gold))]" :
                  "text-[hsl(var(--peptoma-red))]"
                )}>{code}</span>
                <div>
                  <p className="font-mono text-xs font-bold text-foreground">{label}</p>
                  <p className="font-mono text-[10px] text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TypeScript types callout */}
      <div className="mt-8 rounded-xl border border-[hsl(var(--peptoma-cyan))/20] bg-[hsl(var(--peptoma-cyan))/5] p-5 flex gap-4">
        <Code2 className="w-5 h-5 text-[hsl(var(--peptoma-cyan))] shrink-0 mt-0.5" />
        <div className="space-y-2 flex-1">
          <p className="font-mono font-bold text-sm text-foreground">Full TypeScript Support</p>
          <p className="font-mono text-xs text-muted-foreground leading-relaxed">
            All types are exported from the package root — no separate <code className="bg-muted/40 px-1 rounded text-[10px]">@types</code> package needed. Every response, option object, and error is fully typed.
          </p>
          <CodeBlock language="typescript" code={`import type {
  PeptomaClientOptions, SequenceAnalysis, AnalyzeOptions,
  AnalysisDepth, FeedOptions, FeedResponse, Annotation,
  AnnotationType, VoteDirection, ApiKey, PeptomaError,
} from "peptoma-sdk";`} />
        </div>
      </div>
    </div>
  );
}
