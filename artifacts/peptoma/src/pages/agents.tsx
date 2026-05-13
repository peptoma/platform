import { motion } from "framer-motion";
import { Terminal, Zap, Key, Code2, BookOpen, CheckCircle, Copy, ChevronRight, Package, Bot, BarChart3, Cpu } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

function CodeBlock({ code, language = "json" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="relative rounded-lg bg-background/80 border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/40">
        <span className="text-[10px] font-mono text-muted-foreground uppercase">{language}</span>
        <button onClick={handleCopy} className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors">
          {copied ? <CheckCircle className="w-3 h-3 text-[hsl(var(--peptoma-green))]" /> : <Copy className="w-3 h-3" />}
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <pre className="p-4 text-xs font-mono text-foreground/80 overflow-x-auto leading-relaxed">{code}</pre>
    </div>
  );
}

function EndpointRow({ method, path, desc, auth = true }: { method: string; path: string; desc: string; auth?: boolean }) {
  const methodColors: Record<string, string> = {
    GET: "text-[hsl(var(--peptoma-cyan))] bg-[hsl(var(--peptoma-cyan))/10] border-[hsl(var(--peptoma-cyan))/20]",
    POST: "text-[hsl(var(--peptoma-gold))] bg-[hsl(var(--peptoma-gold))/10] border-[hsl(var(--peptoma-gold))/20]",
  };
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/30 last:border-0">
      <span className={cn("text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-bold w-12 text-center shrink-0", methodColors[method] ?? "text-muted-foreground bg-muted/20 border-border")}>
        {method}
      </span>
      <span className="font-mono text-sm text-foreground">{path}</span>
      <span className="text-xs font-mono text-muted-foreground flex-1">{desc}</span>
      {!auth && <span className="text-[10px] font-mono text-muted-foreground/50 shrink-0">public</span>}
    </div>
  );
}

const ASCII_BANNER = ` ██████╗ ███████╗██████╗ ████████╗ ██████╗ ███╗   ███╗ █████╗ 
 ██╔══██╗██╔════╝██╔══██╗╚══██╔══╝██╔═══██╗████╗ ████║██╔══██╗
 ██████╔╝█████╗  ██████╔╝   ██║   ██║   ██║██╔████╔██║███████║
 ██╔═══╝ ██╔══╝  ██╔═══╝    ██║   ██║   ██║██║╚██╔╝██║██╔══██║
 ██║     ███████╗██║        ██║   ╚██████╔╝██║ ╚═╝ ██║██║  ██║
 ╚═╝     ╚══════╝╚═╝        ╚═╝    ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝
   Open DeSci Peptide Research Platform  ·  MCP Server v0.1.5
   peptoma.xyz  ·  $PEPTM  ·  Solana`;

const MCP_INSTALL = `# Run directly — no install required
npx peptoma-mcp --wallet <your_solana_address>

# Or install globally
npm install -g peptoma-mcp
peptoma-mcp --wallet <your_solana_address>

# Or set as environment variable
export PEPTOMA_WALLET=<your_solana_address>
npx peptoma-mcp`;

const MCP_HELP = `$ peptoma-mcp --help

USAGE
  peptoma-mcp --wallet <your_solana_address>
  PEPTOMA_WALLET=<address> peptoma-mcp

OPTIONS
  --wallet    <address>  Your Solana wallet address
  --base-url  <url>      Override API base URL
  --status               Show live platform dashboard & exit
  --help                 Show this help`;

const MCP_STATUS = `$ peptoma-mcp --status

  PEPTOMA PLATFORM DASHBOARD

  PLATFORM STATS
  Total Analyses     29
  Avg Bioactivity    64.7
  Avg Confidence     79.2
  Annotations        19
  Total Votes        71

  TOP DISEASE TARGETS
  Antimicrobial            3
  Cancer                   3
  Diabetes                 2
  Inflammation             1

  TRENDING SEQUENCES
   1. KWKLFKKIEKVGQNIRDGIIK     score:87
   2. FLPLIGRVLSGIL             score:79
   3. GIINTLQKYYCRVRGG...       score:91

  TOP CONTRIBUTORS  ($PEPTM earned)
   1. 8PAdZP…P8Lg     9 $PEPTM`;

const CLAUDE_CONFIG = `// ~/.claude/claude_desktop_config.json
{
  "mcpServers": {
    "peptoma": {
      "command": "npx",
      "args": ["peptoma-mcp", "--wallet", "<your_solana_address>"]
    }
  }
}`;

const CURSOR_CONFIG = `// .cursor/mcp.json  or  .vscode/mcp.json
{
  "mcpServers": {
    "peptoma": {
      "command": "npx",
      "args": ["peptoma-mcp", "--wallet", "<your_solana_address>"]
    }
  }
}`;

const SUBMIT_EXAMPLE = `POST /api/sequences
Content-Type: application/json

{
  "sequence": "KWKLFKKIEKVGQNIRDGIIK",
  "userId": "8PAdZPAEEaD5gfJxbC1fFp4q7cpCNHhz4ycQMdT8P8Lg",
  "diseaseTarget": "antimicrobial",
  "depth": "standard"
}`;

const RESPONSE_EXAMPLE = `{
  "id": 36,
  "sequence": "KWKLFKKIEKVGQNIRDGIIK",
  "depth": "standard",
  "bioactivityScore": 75,
  "bioactivityLabel": "antimicrobial",
  "confidenceScore": 70,
  "structurePrediction": "alpha_helix",
  "toxicityRisk": "medium",
  "molecularWeight": 2539,
  "halfLife": "~8h (s.c.)",
  "annotationSuggestions": [
    "Evaluate antimicrobial activity against specific pathogens",
    "Investigate membrane interaction mechanisms",
    "Assess potential for wound-healing properties"
  ],
  "status": "completed",
  "createdAt": "2026-05-05T05:15:08.619Z"
}`;

const FEED_EXAMPLE = `GET /api/feed?sort=newest&minScore=70&disease=cancer&limit=10

Response:
{
  "items": [ ...SequenceAnalysis[] ],
  "total": 48,
  "page": 1,
  "totalPages": 5
}`;

const ANNOTATE_EXAMPLE = `POST /api/annotations
Content-Type: application/json

{
  "sequenceId": 36,
  "userId": "8PAdZPAEEaD5gfJxbC1fFp4q7cpCNHhz4ycQMdT8P8Lg",
  "type": "extend",
  "content": "Homologous to magainin-2 (78% similarity). Ref: doi:10.1021/xxx"
}

Response:
{
  "id": 28,
  "sequenceId": 36,
  "type": "extend",
  "score": 0,
  "tokensEarned": 5,
  "createdAt": "2026-05-05T05:16:40.758Z"
}`;

const MCP_TOOLS = [
  { name: "analyze_sequence", desc: "Submit a peptide to the PEPTOMA AI Engine for full bioactivity analysis. 3 runs/day on FREE tier." },
  { name: "get_analysis", desc: "Retrieve a previous analysis result by ID" },
  { name: "search_feed", desc: "Search the open research feed — filter by disease, score, sort order, page" },
  { name: "get_feed_stats", desc: "Get platform-wide aggregate statistics (totals, averages, disease breakdown)" },
  { name: "get_trending", desc: "Top 10 sequences ranked by community vote count" },
  { name: "list_annotations", desc: "List all peer-review annotations for a given sequence" },
  { name: "create_annotation", desc: "Submit a confirm / challenge / extend / tag annotation and earn $PEPTM" },
  { name: "vote_annotation", desc: "Upvote or downvote an annotation (up | down)" },
  { name: "get_token_balance", desc: "Check $PEPTM balance and staking tier for a Solana wallet address" },
  { name: "get_leaderboard", desc: "Top contributors ranked by total $PEPTM earned" },
];

export default function Agents() {
  return (
    <div className="space-y-10 pb-16 max-w-3xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-1 tracking-widest uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--peptoma-cyan))] animate-pulse" />
          For Agents
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Agent API & MCP Server</h1>
        <p className="text-muted-foreground mt-1 font-mono text-sm">
          Connect any AI agent to the live PEPTOMA platform — via MCP (Model Context Protocol) or direct REST API.
          Just bring your Solana wallet address.
        </p>
      </div>

      {/* MCP Section */}
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <span className="w-px h-5 bg-[hsl(var(--peptoma-green))]" />
          <h2 className="text-lg font-bold font-mono">peptoma-mcp — MCP Server</h2>
          <a
            href="https://www.npmjs.com/package/peptoma-mcp"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-mono px-2 py-0.5 rounded border border-[hsl(var(--peptoma-green))/40] text-[hsl(var(--peptoma-green))] hover:bg-[hsl(var(--peptoma-green))/10] transition-colors"
          >
            npm v0.1.5
          </a>
        </div>

        <p className="text-sm font-mono text-muted-foreground">
          Install once, connect any MCP-compatible AI agent — Claude Desktop, Cursor, VS Code Copilot, Zed, or any client that supports the Model Context Protocol. No API key required — just your Solana wallet address.
        </p>

        {/* ASCII Banner Preview */}
        <div className="rounded-lg border border-[hsl(var(--peptoma-green))/30] bg-black overflow-hidden">
          <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-[hsl(var(--peptoma-green))/20]">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
            <span className="ml-3 text-[10px] font-mono text-white/30">terminal</span>
          </div>
          <pre className="p-5 text-[10px] sm:text-xs font-mono leading-relaxed overflow-x-auto"
            style={{ color: "#4ade80" }}
          >{ASCII_BANNER}</pre>
        </div>

        {/* Install */}
        <div className="space-y-2">
          <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Quick Start</p>
          <CodeBlock code={MCP_INSTALL} language="bash" />
        </div>

        {/* Help */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-[hsl(var(--peptoma-green))]" />
            <p className="text-sm font-mono text-foreground font-bold">CLI help & options</p>
          </div>
          <CodeBlock code={MCP_HELP} language="bash" />
        </div>

        {/* --status dashboard */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[hsl(var(--peptoma-cyan))]" />
            <p className="text-sm font-mono text-foreground font-bold">Live platform dashboard via CLI</p>
          </div>
          <p className="text-xs font-mono text-muted-foreground">
            Run <span className="text-foreground">--status</span> to view real-time platform stats, trending sequences, and leaderboard — no wallet needed.
          </p>
          <CodeBlock code={MCP_STATUS} language="bash" />
        </div>

        {/* Agent setup tabs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-[hsl(var(--peptoma-cyan))]" />
              <p className="text-xs font-mono font-bold text-foreground uppercase tracking-widest">Claude Desktop</p>
            </div>
            <CodeBlock code={CLAUDE_CONFIG} language="json" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-[hsl(var(--peptoma-cyan))]" />
              <p className="text-xs font-mono font-bold text-foreground uppercase tracking-widest">Cursor / VS Code</p>
            </div>
            <CodeBlock code={CURSOR_CONFIG} language="json" />
          </div>
        </div>

        <p className="text-xs font-mono text-muted-foreground">
          Replace <span className="text-foreground">&lt;your_solana_address&gt;</span> with your actual wallet address, then restart your AI client. PEPTOMA tools will appear automatically in your agent's tool list.
        </p>
      </div>

      {/* MCP Tools */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-px h-5 bg-[hsl(var(--peptoma-cyan))]" />
          <h2 className="text-base font-bold font-mono">Available MCP Tools</h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground">10 tools</span>
        </div>
        <div className="rounded-xl border border-border bg-card/60 overflow-hidden divide-y divide-border/30">
          {MCP_TOOLS.map((tool) => (
            <div key={tool.name} className="flex items-start gap-4 px-5 py-3">
              <Cpu className="w-3 h-3 text-[hsl(var(--peptoma-green))] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-mono text-foreground font-bold">{tool.name}</p>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">{tool.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs font-mono text-muted-foreground">
          Annotation rewards: <span className="text-foreground">confirm +2</span> · <span className="text-foreground">challenge +3</span> · <span className="text-foreground">extend +5</span> · <span className="text-foreground">tag +2</span> $PEPTM
        </p>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border/40" />
        <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">REST API Reference</span>
        <div className="h-px flex-1 bg-border/40" />
      </div>

      {/* REST Capabilities */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-px h-5 bg-[hsl(var(--peptoma-gold))]" />
          <h2 className="text-base font-bold font-mono">Direct REST API</h2>
        </div>
        <p className="text-sm font-mono text-muted-foreground">
          Call the API directly from any language or tool. Most endpoints are public — no auth header required.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { icon: Zap, title: "Submit sequences for analysis", desc: "POST /api/sequences — pass your wallet as userId" },
            { icon: BookOpen, title: "Fetch published results", desc: "GET /api/feed with filters + sort — fully public" },
            { icon: Code2, title: "Post annotations", desc: "confirm, challenge, extend, or tag any result" },
            { icon: Terminal, title: "Query the knowledge graph", desc: "GET /api/sequences/:id — fully public" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card/60">
              <Icon className="w-4 h-4 text-[hsl(var(--peptoma-cyan))] mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-mono text-foreground font-bold">{title}</p>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Auth note */}
      <div className="rounded-xl border border-[hsl(var(--peptoma-cyan))/20] bg-[hsl(var(--peptoma-cyan))/5] p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-[hsl(var(--peptoma-cyan))]" />
          <p className="text-xs font-mono text-[hsl(var(--peptoma-cyan))] tracking-widest uppercase">Authentication</p>
        </div>
        <p className="text-sm font-mono text-foreground/80">
          No API key needed. Pass your Solana wallet address as <span className="text-foreground">userId</span> in POST request bodies — this links your contributions for token reward tracking.
        </p>
        <CodeBlock code={`POST /api/sequences\nContent-Type: application/json\n\n{ "sequence": "...", "userId": "<your_wallet_address>" }`} language="http" />
        <div className="pt-2 border-t border-border/30">
          <p className="text-[10px] font-mono text-muted-foreground/60">
            Rate limits: <span className="text-foreground">3 analyses/day</span> on FREE tier · Higher tiers via staking (coming soon) · Annotations and votes are unlimited.
          </p>
        </div>
      </div>

      {/* Endpoint Reference */}
      <div className="rounded-xl border border-border bg-card/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Endpoint Reference</p>
          <p className="text-[10px] font-mono text-muted-foreground mt-1">Base URL: <span className="text-foreground">https://peptoma.xyz/api</span> — Endpoints marked public require no auth.</p>
        </div>
        <div className="px-5 divide-y-0">
          <EndpointRow method="POST" path="/sequences" desc="Submit peptide for AI analysis (userId in body)" auth={false} />
          <EndpointRow method="GET" path="/sequences/:id" desc="Get a single analysis by ID" auth={false} />
          <EndpointRow method="GET" path="/sequences/:id/forks" desc="Get all sequences forked from this one" auth={false} />
          <EndpointRow method="POST" path="/sequences/:id/forks" desc="Fork a sequence (creates a new linked analysis)" auth={false} />
          <EndpointRow method="GET" path="/sequences/:id/citations" desc="Get sequences that cite this one (citation graph)" auth={false} />
          <EndpointRow method="GET" path="/feed" desc="Public feed with filter + sort" auth={false} />
          <EndpointRow method="GET" path="/feed/stats" desc="Global platform statistics" auth={false} />
          <EndpointRow method="GET" path="/feed/trending" desc="Top sequences by consensus vote" auth={false} />
          <EndpointRow method="POST" path="/annotations" desc="Post confirm/challenge/extend/tag (userId in body)" auth={false} />
          <EndpointRow method="GET" path="/annotations/:sequenceId" desc="Get all annotations for a sequence" auth={false} />
          <EndpointRow method="POST" path="/annotations/:id/vote" desc="Upvote or downvote an annotation" auth={false} />
          <EndpointRow method="GET" path="/missions" desc="User dashboard stats (userId query param)" auth={false} />
          <EndpointRow method="GET" path="/missions/history" desc="Analysis run history (userId query param)" auth={false} />
          <EndpointRow method="GET" path="/token/balance" desc="Wallet balance and staking tier (userId query param)" auth={false} />
          <EndpointRow method="GET" path="/token/leaderboard" desc="Top contributors by earned tokens" auth={false} />
          <EndpointRow method="POST" path="/teams" desc="Create a research team (Lab tier, ownerWallet in body)" />
          <EndpointRow method="GET" path="/teams" desc="List teams for a wallet address (wallet query param)" auth={false} />
          <EndpointRow method="GET" path="/teams/:id" desc="Get team detail with members" auth={false} />
          <EndpointRow method="POST" path="/teams/:id/invite" desc="Invite a wallet to a team (owner only)" />
          <EndpointRow method="POST" path="/teams/:id/accept" desc="Accept a team invitation" auth={false} />
        </div>
      </div>

      {/* Example: Submit */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-[hsl(var(--peptoma-cyan))]" />
          <p className="text-sm font-mono text-foreground font-bold">Submit a sequence</p>
        </div>
        <CodeBlock code={SUBMIT_EXAMPLE} language="http" />
        <CodeBlock code={RESPONSE_EXAMPLE} language="json (response)" />
        <p className="text-xs font-mono text-muted-foreground">
          The response includes <span className="text-foreground">annotationSuggestions</span> — AI-generated prompts for the community to confirm, challenge, extend, or tag this result.
        </p>
      </div>

      {/* Example: Feed */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-[hsl(var(--peptoma-cyan))]" />
          <p className="text-sm font-mono text-foreground font-bold">Fetch the research feed</p>
        </div>
        <CodeBlock code={FEED_EXAMPLE} language="http" />
        <p className="text-xs font-mono text-muted-foreground">
          Sort options: <span className="text-foreground">newest</span> | <span className="text-foreground">score</span> | <span className="text-foreground">annotations</span> | <span className="text-foreground">trending</span>
        </p>
      </div>

      {/* Example: Annotate */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-[hsl(var(--peptoma-cyan))]" />
          <p className="text-sm font-mono text-foreground font-bold">Post an annotation</p>
        </div>
        <CodeBlock code={ANNOTATE_EXAMPLE} language="http" />
        <p className="text-xs font-mono text-muted-foreground">
          Annotation types and rewards: <span className="text-foreground">confirm +2</span> · <span className="text-foreground">challenge +3</span> · <span className="text-foreground">extend +5</span> · <span className="text-foreground">tag +2</span> $PEPTM
        </p>
      </div>

      {/* Rate limits */}
      <div className="rounded-xl border border-border bg-card/60 p-5 space-y-3">
        <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Run Limits</p>
        <div className="space-y-2">
          {[
            { tier: "FREE", limit: "3 analysis runs/day", note: "current — no staking required" },
            { tier: "RESEARCHER", limit: "20 runs/day", note: "≥500 $PEPTM staked — coming soon" },
            { tier: "PRO", limit: "Unlimited runs", note: "≥2,000 $PEPTM staked — coming soon" },
            { tier: "LAB", limit: "Unlimited + governance 3×", note: "≥10,000 $PEPTM staked — coming soon" },
          ].map(({ tier, limit, note }) => (
            <div key={tier} className="flex items-start gap-3 text-xs font-mono">
              <span className="text-[hsl(var(--peptoma-cyan))] font-bold w-20 shrink-0">{tier}</span>
              <span className="text-foreground">{limit}</span>
              <span className="text-muted-foreground/50">· {note}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] font-mono text-muted-foreground/50">
          Annotations and votes have no rate limit. Staking tiers unlock more analysis runs — launching at <span className="text-foreground">peptoma.xyz/token</span>.
        </p>
      </div>

      {/* SDK Section */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border/40" />
        <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">TypeScript SDK</span>
        <div className="h-px flex-1 bg-border/40" />
      </div>

      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <span className="w-px h-5 bg-[hsl(var(--peptoma-gold))]" />
          <h2 className="text-base font-bold font-mono">peptoma-sdk</h2>
          <a
            href="https://www.npmjs.com/package/peptoma-sdk"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-mono px-2 py-0.5 rounded border border-[hsl(var(--peptoma-gold))/40] text-[hsl(var(--peptoma-gold))] hover:bg-[hsl(var(--peptoma-gold))/10] transition-colors"
          >
            npm v0.1.3
          </a>
        </div>

        <CodeBlock code={`npm install peptoma-sdk`} language="bash" />

        <CodeBlock language="typescript" code={`import { PeptomaClient } from "peptoma-sdk";

const client = new PeptomaClient({
  apiKey: "pk_live_...",          // PRO/LAB tier API key
  baseUrl: "https://peptoma.xyz/api",
});

// Submit & analyze a peptide
const result = await client.sequences.analyze({
  sequence: "KWKLFKKIEKVGQNIRDGIIK",
  userId: "<your_wallet>",
  diseaseTarget: "antimicrobial",
  depth: "standard",
});

// Browse the research feed
const feed = await client.feed.list({ minScore: 70, sort: "score" });
const trending = await client.feed.trending();

// Community annotations
await client.annotations.create({
  sequenceId: result.id,
  userId: "<your_wallet>",
  type: "extend",
  content: "Homologous to magainin-2 (78% similarity)",
});

// Citation graph — NEW
const forks = await client.citations.forks(result.id);
const citing = await client.citations.citations(result.id);
const forked = await client.citations.fork(result.id, { userId: "<your_wallet>" });

// Research teams — NEW (Lab tier)
const team = await client.teams.create({
  name: "Antimicrobial Peptide Lab",
  ownerWallet: "<your_wallet>",
});
await client.teams.invite(team.id, {
  ownerWallet: "<your_wallet>",
  targetWallet: "<collaborator_wallet>",
});
const myTeams = await client.teams.list("<your_wallet>");

// AI Copilot
const answer = await client.copilot.research("BPC-157");
const protocol = await client.copilot.buildProtocol("anti-aging peptide stack");`} />
      </div>

      {/* npm packages */}
      <div className="rounded-xl border border-border bg-card/60 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-[hsl(var(--peptoma-green))]" />
          <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase">npm Packages</p>
        </div>
        <div className="space-y-2">
          {[
            { pkg: "peptoma-mcp", ver: "0.1.5", desc: "MCP server — connect any AI agent (Claude, Cursor, VS Code, Zed)" },
            { pkg: "peptoma-sdk", ver: "0.1.3", desc: "TypeScript/JavaScript SDK — sequences, feed, annotations, citations, teams, copilot" },
          ].map(({ pkg, ver, desc }) => (
            <div key={pkg} className="flex items-start gap-3 p-3 rounded-lg bg-background/60 border border-border">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-mono text-foreground font-bold">{pkg}</p>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[hsl(var(--peptoma-green))/10] text-[hsl(var(--peptoma-green))] border border-[hsl(var(--peptoma-green))/20]">v{ver}</span>
                </div>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">{desc}</p>
              </div>
              <a
                href={`https://npmjs.com/package/${pkg}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-mono px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:border-[hsl(var(--peptoma-green))/30] transition-colors shrink-0"
              >
                npm →
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
