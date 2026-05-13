import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Dna, User, MessageSquare, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

const BASE = import.meta.env.BASE_URL;

interface SearchResults {
  sequences: Array<{
    id: number; sequence: string; diseaseTarget?: string | null;
    bioactivityLabel?: string | null; bioactivityScore: number;
    structurePrediction?: string | null; toxicityRisk?: string | null;
    voteCount: number; annotationCount: number; userId: string;
    tags: string[];
  }>;
  users: Array<{
    userId: string; username: string; stakingTier: string;
    earnedTotal: number; stakedAmount: number; solanaAddress?: string | null;
  }>;
  annotations: Array<{
    id: number; sequenceId: number; type: string;
    content?: string | null; score: number; userId: string;
  }>;
}

const TIER_COLORS: Record<string, string> = {
  free: "text-muted-foreground",
  researcher: "text-[hsl(var(--peptoma-cyan))]",
  pro: "text-[hsl(var(--peptoma-gold))]",
  lab: "text-purple-400",
};

const ANNOTATION_TYPE_COLORS: Record<string, string> = {
  confirm: "text-[hsl(var(--peptoma-green))]",
  challenge: "text-red-400",
  extend: "text-[hsl(var(--peptoma-cyan))]",
  tag: "text-[hsl(var(--peptoma-gold))]",
};

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults(null);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (open) onClose(); else onClose();
      }
      if (e.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) { setResults(null); return; }
    setLoading(true);
    try {
      const r = await fetch(`${BASE}api/search?q=${encodeURIComponent(q.trim())}`);
      if (r.ok) setResults(await r.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  const total = results ? results.sequences.length + results.users.length + results.annotations.length : 0;

  const goTo = (path: string) => { navigate(path); onClose(); };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-start justify-center pt-16 px-4 bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              {loading
                ? <Loader2 className="w-4 h-4 text-muted-foreground shrink-0 animate-spin" />
                : <Search className="w-4 h-4 text-muted-foreground shrink-0" />}
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search sequences, researchers, annotations…"
                className="flex-1 bg-transparent font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded border border-border text-[10px] font-mono text-muted-foreground">ESC</kbd>
                <button onClick={onClose} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto">
              {!query.trim() && (
                <div className="px-4 py-8 text-center space-y-2">
                  <Search className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                  <p className="font-mono text-sm text-muted-foreground">Type to search sequences, researchers, or annotations</p>
                  <p className="text-[10px] font-mono text-muted-foreground/50">Press <kbd className="px-1 py-0.5 rounded border border-border text-[9px]">⌘K</kbd> to open anytime</p>
                </div>
              )}

              {query.trim().length > 0 && query.trim().length < 2 && (
                <div className="px-4 py-8 text-center">
                  <p className="font-mono text-sm text-muted-foreground">Keep typing…</p>
                </div>
              )}

              {results && total === 0 && (
                <div className="px-4 py-8 text-center space-y-1">
                  <p className="font-mono text-sm text-muted-foreground">No results for "{query}"</p>
                  <p className="text-[10px] font-mono text-muted-foreground/60">Try different keywords or check spelling</p>
                </div>
              )}

              {results && results.sequences.length > 0 && (
                <div>
                  <div className="px-4 py-2 border-b border-border/40 bg-muted/10">
                    <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase flex items-center gap-1.5">
                      <Dna className="w-3 h-3" /> Sequences ({results.sequences.length})
                    </span>
                  </div>
                  {results.sequences.map(s => (
                    <button key={s.id} onClick={() => goTo(`/annotate/${s.id}`)}
                      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors border-b border-border/20 text-left group">
                      <div className="w-8 h-8 rounded-lg bg-[hsl(var(--peptoma-cyan))/10] border border-[hsl(var(--peptoma-cyan))/20] flex items-center justify-center shrink-0 mt-0.5">
                        <Dna className="w-4 h-4 text-[hsl(var(--peptoma-cyan))]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono text-xs font-bold text-foreground truncate">
                            {s.sequence.slice(0, 20)}{s.sequence.length > 20 ? "…" : ""}
                          </span>
                          {s.bioactivityLabel && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-[hsl(var(--peptoma-cyan))/30] text-[hsl(var(--peptoma-cyan))] bg-[hsl(var(--peptoma-cyan))/8] shrink-0 uppercase">
                              {s.bioactivityLabel}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
                          {s.diseaseTarget && <span>Target: {s.diseaseTarget}</span>}
                          <span>Score: {s.bioactivityScore}</span>
                          <span>{s.annotationCount} annotations</span>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0 mt-1" />
                    </button>
                  ))}
                </div>
              )}

              {results && results.users.length > 0 && (
                <div>
                  <div className="px-4 py-2 border-b border-border/40 bg-muted/10">
                    <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase flex items-center gap-1.5">
                      <User className="w-3 h-3" /> Researchers ({results.users.length})
                    </span>
                  </div>
                  {results.users.map(u => (
                    <button key={u.userId} onClick={() => goTo(`/profile/${u.userId}`)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors border-b border-border/20 text-left group">
                      <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono text-xs font-bold text-foreground truncate">{u.username || u.userId.slice(0, 12) + "…"}</span>
                          <span className={cn("text-[9px] font-mono uppercase font-bold", TIER_COLORS[u.stakingTier] ?? "text-muted-foreground")}>
                            {u.stakingTier}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground">
                          {u.earnedTotal.toLocaleString()} pts earned · {u.stakedAmount.toLocaleString()} staked
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {results && results.annotations.length > 0 && (
                <div>
                  <div className="px-4 py-2 border-b border-border/40 bg-muted/10">
                    <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase flex items-center gap-1.5">
                      <MessageSquare className="w-3 h-3" /> Annotations ({results.annotations.length})
                    </span>
                  </div>
                  {results.annotations.map(a => (
                    <button key={a.id} onClick={() => goTo(`/annotate/${a.sequenceId}`)}
                      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors border-b border-border/20 text-left group">
                      <div className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0 mt-0.5">
                        <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={cn("text-[9px] font-mono uppercase font-bold", ANNOTATION_TYPE_COLORS[a.type] ?? "text-muted-foreground")}>
                            {a.type}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">seq #{a.sequenceId}</span>
                        </div>
                        <p className="font-mono text-xs text-foreground line-clamp-2 leading-relaxed">{a.content ?? "—"}</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0 mt-1" />
                    </button>
                  ))}
                </div>
              )}

              {/* Footer hint */}
              {results && total > 0 && (
                <div className="px-4 py-2.5 bg-muted/10 border-t border-border/40">
                  <p className="text-[10px] font-mono text-muted-foreground">{total} result{total !== 1 ? "s" : ""} found · Click any result to navigate</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
