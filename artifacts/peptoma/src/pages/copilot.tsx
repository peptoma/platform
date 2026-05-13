import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Send, User, RotateCcw, Copy, Check,
  Dna, FlaskConical, GitCompare, BookOpen, ShieldAlert,
  History, Trash2, Clock, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWallet } from "@/contexts/wallet-context";

const BASE = import.meta.env.BASE_URL;

type AgentType = "research" | "protocol" | "compare" | "literature" | "safety";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AgentConfig {
  id: AgentType;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  color: "cyan" | "gold" | "purple" | "green" | "red";
  tagline: string;
  placeholder: string;
  suggestions: string[];
}

const AGENTS: AgentConfig[] = [
  {
    id: "research",
    label: "Peptide Research",
    shortLabel: "Research",
    icon: Dna,
    color: "cyan",
    tagline: "Mechanism · Benefits · Dosing · Citations",
    placeholder: 'e.g. "What is BPC-157?" or "Explain GHK-Cu mechanism"',
    suggestions: [
      "What is BPC-157 and how does it work?",
      "Explain the mechanism of action of TB-500",
      "What does GHK-Cu do for skin regeneration?",
      "How does Selank reduce anxiety at the molecular level?",
      "What is the research status of Epithalon?",
      "Explain how Ipamorelin stimulates growth hormone",
    ],
  },
  {
    id: "protocol",
    label: "Protocol Builder",
    shortLabel: "Protocol",
    icon: FlaskConical,
    color: "gold",
    tagline: "Goal-based stacks · Rationale · Caution notes",
    placeholder: 'e.g. "Build a longevity stack" or "Recovery from injury protocol"',
    suggestions: [
      "Build a longevity and anti-aging peptide stack",
      "What peptides support muscle recovery after training?",
      "Design a sleep optimization protocol",
      "Suggest peptides for fat loss and metabolic support",
      "Build a cognitive enhancement stack",
      "Peptides for skin health and collagen support",
    ],
  },
  {
    id: "compare",
    label: "Comparison",
    shortLabel: "Compare",
    icon: GitCompare,
    color: "purple",
    tagline: "Side-by-side · Mechanism · Evidence · Use cases",
    placeholder: 'e.g. "BPC-157 vs TB-500" or "CJC-1295 vs Ipamorelin"',
    suggestions: [
      "Compare BPC-157 vs TB-500 for tissue repair",
      "CJC-1295 vs Ipamorelin — which is better?",
      "Semax vs Selank for cognitive support",
      "Compare GLP-1 vs GIP receptor agonists",
      "Epithalon vs Thymalin for longevity",
      "Tesamorelin vs Sermorelin differences",
    ],
  },
  {
    id: "literature",
    label: "Literature",
    shortLabel: "Literature",
    icon: BookOpen,
    color: "green",
    tagline: "Paper summaries · Key findings · Plain language",
    placeholder: "Paste an abstract, DOI, or paper title for a structured summary",
    suggestions: [
      "Summarize research on BPC-157 for gut healing",
      "Key findings from TB-500 animal studies",
      "What does literature say about GHK-Cu wound healing?",
      "Summarize semaglutide vs tirzepatide clinical trials",
      "What studies exist on Selank for anxiety?",
      "Overview of peptide research in longevity science",
    ],
  },
  {
    id: "safety",
    label: "Safety",
    shortLabel: "Safety",
    icon: ShieldAlert,
    color: "red",
    tagline: "Risks · Contraindications · Red flags · Warnings",
    placeholder: 'e.g. "Is BPC-157 safe?" or "Can I stack TB-500 with BPC-157?"',
    suggestions: [
      "What are the safety considerations for BPC-157?",
      "Is it safe to combine BPC-157 and TB-500?",
      "Risks of long-term GH peptide use",
      "Contraindications for GLP-1 agonist peptides",
      "Safety profile of Epithalon — what is known?",
      "Red flags with growth hormone secretagogues",
    ],
  },
];

type ColorKey = "cyan" | "gold" | "purple" | "green" | "red";

const C: Record<ColorKey, {
  bg: string; border: string; text: string;
  dot: string; activeBg: string; activeBorder: string;
  btnBg: string; suggBorder: string;
}> = {
  cyan: {
    bg: "bg-[hsl(145_100%_42%/0.06)]",
    border: "border-[hsl(145_100%_42%/0.22)]",
    text: "text-[hsl(145_100%_42%)]",
    dot: "bg-[hsl(145_100%_42%)]",
    activeBg: "bg-[hsl(145_100%_42%/0.10)]",
    activeBorder: "border-[hsl(145_100%_42%/0.45)]",
    btnBg: "bg-[hsl(145_100%_42%)]",
    suggBorder: "hover:border-[hsl(145_100%_42%/0.40)]",
  },
  gold: {
    bg: "bg-[hsl(45_95%_55%/0.06)]",
    border: "border-[hsl(45_95%_55%/0.22)]",
    text: "text-[hsl(45_95%_55%)]",
    dot: "bg-[hsl(45_95%_55%)]",
    activeBg: "bg-[hsl(45_95%_55%/0.10)]",
    activeBorder: "border-[hsl(45_95%_55%/0.45)]",
    btnBg: "bg-[hsl(45_95%_55%)]",
    suggBorder: "hover:border-[hsl(45_95%_55%/0.40)]",
  },
  purple: {
    bg: "bg-purple-500/[0.06]",
    border: "border-purple-500/[0.22]",
    text: "text-purple-400",
    dot: "bg-purple-400",
    activeBg: "bg-purple-500/[0.10]",
    activeBorder: "border-purple-500/[0.45]",
    btnBg: "bg-purple-500",
    suggBorder: "hover:border-purple-400/40",
  },
  green: {
    bg: "bg-emerald-500/[0.06]",
    border: "border-emerald-500/[0.22]",
    text: "text-emerald-400",
    dot: "bg-emerald-400",
    activeBg: "bg-emerald-500/[0.10]",
    activeBorder: "border-emerald-500/[0.45]",
    btnBg: "bg-emerald-500",
    suggBorder: "hover:border-emerald-400/40",
  },
  red: {
    bg: "bg-red-500/[0.06]",
    border: "border-red-500/[0.22]",
    text: "text-red-400",
    dot: "bg-red-400",
    activeBg: "bg-red-500/[0.10]",
    activeBorder: "border-red-500/[0.45]",
    btnBg: "bg-red-500",
    suggBorder: "hover:border-red-400/40",
  },
};

function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**"))
      return <strong key={i} className="font-semibold text-foreground">{p.slice(2, -2)}</strong>;
    if (p.startsWith("`") && p.endsWith("`"))
      return <code key={i} className="bg-foreground/8 px-1 rounded text-[11px] text-foreground/90">{p.slice(1, -1)}</code>;
    return <span key={i}>{p}</span>;
  });
}

function MarkdownText({ content, color }: { content: string; color: ColorKey }) {
  const c = C[color];
  const lines = content.split("\n");
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  let numbered: string[] = [];
  let tableLines: string[] = [];

  const flushTable = (key: string) => {
    if (!tableLines.length) return;
    const rows = tableLines.filter(l => !/^[\s|:-]+$/.test(l));
    if (rows.length >= 2) {
      const headers = rows[0].split("|").map(h => h.trim()).filter(Boolean);
      const body = rows.slice(1);
      blocks.push(
        <div key={key} className="overflow-x-auto my-3 rounded-lg border border-border">
          <table className="w-full text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {headers.map((h, i) => (
                  <th key={i} className={cn("text-left py-2 px-3 font-semibold", c.text)}>{renderInline(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, ri) => {
                const cells = row.split("|").map(cel => cel.trim()).filter(Boolean);
                return (
                  <tr key={ri} className="border-b border-border/30 last:border-0 hover:bg-foreground/2 transition-colors">
                    {cells.map((cell, ci) => (
                      <td key={ci} className={cn("py-2 px-3", ci === 0 ? "font-medium text-foreground/80" : "text-foreground/65")}>{renderInline(cell)}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }
    tableLines = [];
  };

  const flushBullets = (key: string) => {
    if (bullets.length) {
      blocks.push(
        <ul key={key} className="space-y-1.5 my-2">
          {bullets.map((item, i) => (
            <li key={i} className="flex gap-2 items-start">
              <span className={cn("shrink-0 mt-1 w-1.5 h-1.5 rounded-full", c.dot)} />
              <span className="text-foreground/85 leading-relaxed">{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      bullets = [];
    }
    if (numbered.length) {
      blocks.push(
        <ol key={key + "ol"} className="space-y-1.5 my-2">
          {numbered.map((item, i) => (
            <li key={i} className="flex gap-2.5 items-start">
              <span className={cn("shrink-0 font-mono text-xs tabular-nums w-4 mt-0.5 font-semibold", c.text)}>{i + 1}.</span>
              <span className="text-foreground/85 leading-relaxed">{renderInline(item)}</span>
            </li>
          ))}
        </ol>
      );
      numbered = [];
    }
  };

  lines.forEach((line, i) => {
    const t = line.trim();
    if (t.startsWith("|")) { flushBullets(`pre-tbl-${i}`); tableLines.push(t); return; }
    if (tableLines.length) flushTable(`tbl-${i}`);

    if (/^#{1,3} /.test(t)) {
      flushBullets(`h-${i}`);
      const text = t.replace(/^#+\s/, "");
      blocks.push(
        <div key={i} className="flex items-center gap-2 mt-5 mb-1.5">
          <div className={cn("w-0.5 h-3.5 rounded-full shrink-0", c.dot)} />
          <span className={cn("text-[10px] font-mono font-bold tracking-widest uppercase", c.text)}>{text}</span>
        </div>
      );
    } else if (/^[-*] /.test(t)) {
      if (numbered.length) flushBullets(`ul-${i}`);
      bullets.push(t.slice(2));
    } else if (/^\d+\. /.test(t)) {
      if (bullets.length) flushBullets(`ol-${i}`);
      numbered.push(t.replace(/^\d+\.\s/, ""));
    } else if (t.startsWith("> ") || (t.startsWith("*") && t.endsWith("*") && t.length > 10)) {
      flushBullets(`bq-${i}`);
      const isNote = t.startsWith("*This") || t.startsWith("*For") || t.startsWith("*Note");
      blocks.push(
        <div key={i} className={cn(
          "flex gap-2 items-start px-3 py-2 rounded-lg border text-xs font-mono mt-3",
          isNote ? "bg-red-500/5 border-red-500/20 text-red-400/80" : cn(c.bg, c.border, c.text)
        )}>
          <span className="shrink-0">{isNote ? "⚠️" : "💡"}</span>
          <span>{renderInline(isNote ? t.replace(/\*/g, "") : t.slice(2))}</span>
        </div>
      );
    } else if (t === "") {
      flushBullets(`empty-${i}`);
      flushTable(`tbl-empty-${i}`);
      blocks.push(<div key={i} className="h-1" />);
    } else {
      flushBullets(`p-${i}`);
      blocks.push(<p key={i} className="text-foreground/85 leading-relaxed">{renderInline(t)}</p>);
    }
  });

  flushBullets("end");
  flushTable("tbl-end");

  return <div className="space-y-0.5 text-sm font-mono">{blocks}</div>;
}

function MessageBubble({ msg, color }: { msg: Message; color: ColorKey }) {
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === "user";
  const c = C[color];

  return (
    <div className={cn("flex gap-2.5 group", isUser ? "flex-row-reverse" : "flex-row")}>
      <div className={cn(
        "w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-1",
        isUser ? "bg-foreground/10 border border-border" : cn(c.bg, c.border, "border")
      )}>
        {isUser
          ? <User className="w-3 h-3 text-muted-foreground" />
          : <Bot className={cn("w-3 h-3", c.text)} />}
      </div>

      <div className={cn("max-w-[84%] space-y-1", isUser ? "items-end" : "items-start")}>
        <div className={cn(
          "px-3.5 py-2.5 rounded-xl text-sm leading-relaxed",
          isUser
            ? "bg-foreground text-background font-mono rounded-tr-sm"
            : "bg-card border border-border font-mono rounded-tl-sm"
        )}>
          {isUser ? msg.content : <MarkdownText content={msg.content} color={color} />}
        </div>
        {!isUser && (
          <button
            onClick={async () => { await navigator.clipboard.writeText(msg.content); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[9px] font-mono text-muted-foreground hover:text-foreground px-0.5"
          >
            {copied ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
    </div>
  );
}

function Dots({ color }: { color: ColorKey }) {
  const c = C[color];
  return (
    <div className="flex gap-2.5 items-center">
      <div className={cn("w-6 h-6 rounded-md flex items-center justify-center border", c.bg, c.border)}>
        <Bot className={cn("w-3 h-3", c.text)} />
      </div>
      <div className="bg-card border border-border rounded-xl rounded-tl-sm px-3.5 py-2.5 flex items-center gap-1.5">
        {[0, 1, 2].map(i => (
          <motion.div key={i} className={cn("w-1.5 h-1.5 rounded-full", c.dot)}
            animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18 }} />
        ))}
      </div>
    </div>
  );
}

interface ConvRecord {
  id: number;
  title: string;
  agentType: string;
  createdAt: string;
  updatedAt: string;
}

function timeAgo(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

const AGENT_TYPE_COLOR: Record<string, string> = {
  research: "text-[hsl(var(--peptoma-cyan))]",
  protocol: "text-[hsl(var(--peptoma-gold))]",
  compare: "text-purple-400",
  literature: "text-emerald-400",
  safety: "text-red-400",
};

export default function Copilot() {
  const { userId, connected } = useWallet();
  const [active, setActive] = useState<AgentType>("research");
  const [history, setHistory] = useState<Record<AgentType, Message[]>>({
    research: [], protocol: [], compare: [], literature: [], safety: [],
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [convs, setConvs] = useState<ConvRecord[]>([]);
  const [convsLoading, setConvsLoading] = useState(false);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  const agent = AGENTS.find(a => a.id === active)!;
  const messages = history[active];
  const c = C[agent.color];

  useEffect(() => {
    const el = chatAreaRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [history, loading, active]);

  const fetchConvs = useCallback(async () => {
    if (!connected || !userId) return;
    setConvsLoading(true);
    try {
      const r = await fetch(`${BASE}api/copilot/conversations?userId=${encodeURIComponent(userId)}`);
      if (r.ok) setConvs(await r.json());
    } finally {
      setConvsLoading(false);
    }
  }, [connected, userId]);

  useEffect(() => {
    if (showHistory) fetchConvs();
  }, [showHistory, fetchConvs]);

  const saveConversation = useCallback(async (agentType: AgentType, msgs: Message[]) => {
    if (!connected || !userId || msgs.length < 2) return;
    try {
      await fetch(`${BASE}api/copilot/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, agentType, msgs }),
      });
      if (showHistory) fetchConvs();
    } catch {}
  }, [connected, userId, showHistory, fetchConvs]);

  const loadConversation = async (conv: ConvRecord) => {
    const r = await fetch(`${BASE}api/copilot/conversations/${conv.id}/messages`);
    if (!r.ok) return;
    const msgs: Array<{ role: string; content: string }> = await r.json();
    const typed = msgs.map(m => ({ role: m.role as "user" | "assistant", content: m.content }));
    const agentType = (conv.agentType as AgentType) ?? "research";
    setActive(agentType);
    setHistory(p => ({ ...p, [agentType]: typed }));
    setShowHistory(false);
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const deleteConversation = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`${BASE}api/copilot/conversations/${id}`, { method: "DELETE" });
    setConvs(p => p.filter(c => c.id !== id));
  };

  const switchAgent = (id: AgentType) => {
    setActive(id);
    setError(null);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const userMsg: Message = { role: "user", content: trimmed };
    const next = [...messages, userMsg];
    setHistory(p => ({ ...p, [active]: next }));
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}api/copilot/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-10), agentType: active }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { reply: string };
      const finalMsgs = [...next, { role: "assistant" as const, content: data.reply }];
      setHistory(p => ({ ...p, [active]: finalMsgs }));
      if (finalMsgs.length >= 2 && finalMsgs.length % 4 === 0) {
        saveConversation(active, finalMsgs);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  return (
    <div className="pb-16 space-y-4">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold tracking-widest border", c.bg, c.border, c.text)}>
              <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", c.dot)} />
              PEPTOMA AI
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">5 research agents</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground">
            AI Research Agents
          </h1>
          <p className="text-xs font-mono text-muted-foreground max-w-lg">
            Structured peptide intelligence — profiles, protocols, comparisons, literature, and safety.
          </p>
        </div>
        {connected && (
          <button
            onClick={() => setShowHistory(p => !p)}
            className={cn(
              "flex items-center gap-1.5 text-[10px] font-mono px-3 py-1.5 rounded-lg border transition-all shrink-0",
              showHistory
                ? "border-[hsl(var(--peptoma-cyan))/40] bg-[hsl(var(--peptoma-cyan))/8] text-[hsl(var(--peptoma-cyan))]"
                : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
            )}
          >
            <History className="w-3.5 h-3.5" />
            History
            {convs.length > 0 && (
              <span className="ml-0.5 text-[9px] bg-[hsl(var(--peptoma-cyan))/20] text-[hsl(var(--peptoma-cyan))] px-1.5 py-0.5 rounded-full font-bold">
                {convs.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* History panel */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-border bg-card/60 overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">Saved Conversations</span>
                </div>
                {convsLoading && <span className="text-[9px] font-mono text-muted-foreground animate-pulse">Loading…</span>}
              </div>
              {convs.length === 0 && !convsLoading ? (
                <div className="px-4 py-8 text-center space-y-1">
                  <Clock className="w-6 h-6 text-muted-foreground/30 mx-auto" />
                  <p className="text-[11px] font-mono text-muted-foreground">No saved chats yet</p>
                  <p className="text-[9px] font-mono text-muted-foreground/50">Conversations are auto-saved every 4 exchanges</p>
                </div>
              ) : (
                <div className="divide-y divide-border/40 max-h-60 overflow-y-auto">
                  {convs.map(conv => (
                    <button key={conv.id} onClick={() => loadConversation(conv)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors text-left group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={cn("text-[9px] font-mono font-bold uppercase", AGENT_TYPE_COLOR[conv.agentType] ?? "text-muted-foreground")}>
                            {conv.agentType}
                          </span>
                          <span className="text-[9px] font-mono text-muted-foreground/50">{timeAgo(conv.updatedAt)}</span>
                        </div>
                        <p className="text-[11px] font-mono text-foreground truncate">{conv.title}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => deleteConversation(conv.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:text-red-400 text-muted-foreground/50 transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <ChevronRight className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Agent tabs — horizontal scroll on mobile */}
      <div
        ref={tabsRef}
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-5"
        style={{ scrollbarWidth: "none" }}
      >
        {AGENTS.map(a => {
          const Icon = a.icon;
          const isActive = a.id === active;
          const tc = C[a.color];
          const hasChat = history[a.id].length > 0;
          return (
            <button
              key={a.id}
              onClick={() => switchAgent(a.id)}
              className={cn(
                "relative flex flex-col items-start gap-2 p-3 rounded-xl border transition-all shrink-0 w-[140px] sm:w-auto text-left",
                isActive
                  ? cn(tc.activeBg, tc.activeBorder, "shadow-sm")
                  : "border-border bg-card hover:bg-muted/30 hover:border-border/80"
              )}
            >
              <div className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center border",
                isActive ? cn(tc.bg, tc.border) : "bg-muted border-border"
              )}>
                <Icon className={cn("w-3.5 h-3.5", isActive ? tc.text : "text-muted-foreground")} />
              </div>
              <div className="min-w-0 w-full">
                <p className={cn("text-[11px] font-mono font-bold leading-none", isActive ? tc.text : "text-foreground")}>
                  {a.shortLabel}
                </p>
                <p className="text-[9px] font-mono text-muted-foreground mt-1 leading-tight line-clamp-2">
                  {a.tagline.split(" · ")[0]}
                </p>
              </div>
              {hasChat && !isActive && (
                <span className={cn("absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full", tc.dot)} />
              )}
              {isActive && (
                <span className={cn("absolute bottom-0 inset-x-0 h-0.5 rounded-b-xl", tc.dot)} />
              )}
            </button>
          );
        })}
      </div>

      {/* Chat panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
          className="rounded-xl border border-border bg-card overflow-hidden flex flex-col"
          style={{ minHeight: 500 }}
        >
          {/* Panel bar */}
          <div className={cn("flex items-center justify-between px-4 py-2 border-b border-border shrink-0", c.bg)}>
            <div className="flex items-center gap-2 min-w-0">
              <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse shrink-0", c.dot)} />
              <span className={cn("text-[10px] font-mono font-bold tracking-widest shrink-0", c.text)}>
                {agent.shortLabel.toUpperCase()}
              </span>
              <span className="text-muted-foreground text-[10px] font-mono">·</span>
              <span className="text-[10px] font-mono text-muted-foreground truncate">{agent.tagline}</span>
            </div>
            {messages.length > 0 && (
              <button
                onClick={() => { setHistory(p => ({ ...p, [active]: [] })); setError(null); }}
                className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-2"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                Clear
              </button>
            )}
          </div>

          {/* Message area */}
          <div ref={chatAreaRef} className="overflow-y-auto px-4 py-5 space-y-4" style={{ height: 440 }}>
            {messages.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-full min-h-[340px] gap-5">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border", c.bg, c.border)}>
                  {(() => { const Icon = agent.icon; return <Icon className={cn("w-6 h-6", c.text)} />; })()}
                </div>
                <div className="text-center space-y-1">
                  <p className="font-display font-bold text-base text-foreground">{agent.label} Agent</p>
                  <p className="text-xs font-mono text-muted-foreground max-w-xs leading-relaxed">{agent.tagline}</p>
                </div>
                <div className="w-full max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {agent.suggestions.map((q, i) => (
                    <button key={i} onClick={() => send(q)}
                      className={cn(
                        "text-left px-3 py-2.5 rounded-lg border border-border bg-background text-[11px] font-mono text-muted-foreground hover:text-foreground transition-all group",
                        c.suggBorder
                      )}>
                      <span className={cn("mr-1.5 opacity-40 group-hover:opacity-100 transition-opacity", c.text)}>›</span>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} color={agent.color} />
            ))}

            <AnimatePresence>
              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Dots color={agent.color} />
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <div className="text-xs font-mono text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2.5">
                ⚠ {error}
              </div>
            )}

          </div>

          {/* Input bar */}
          <div className="border-t border-border bg-background/60 px-3 py-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={agent.placeholder}
                rows={1}
                disabled={loading}
                className="flex-1 resize-none bg-card border border-border rounded-lg px-3 py-2.5 font-mono text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-border/80 transition-colors leading-relaxed"
                style={{ maxHeight: 120 }}
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || loading}
                className={cn(
                  "w-9 h-9 flex items-center justify-center rounded-lg text-white transition-opacity shrink-0 disabled:opacity-35",
                  c.btnBg
                )}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[9px] font-mono text-muted-foreground/40 mt-2 text-center">
              Enter to send · Shift+Enter for new line · Research purposes only, not medical advice
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Bottom info row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: Dna, label: "5 Agents", desc: "Research, Protocol, Compare, Literature, Safety" },
          { icon: BookOpen, label: "Evidence-Based", desc: "Grounded in published research and studies" },
          { icon: ShieldAlert, label: "Safety First", desc: "Risks and contraindications always flagged" },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="flex flex-col gap-1.5 p-3 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] font-mono font-bold text-foreground">{label}</span>
            </div>
            <p className="text-[9px] font-mono text-muted-foreground leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
