import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, X, Loader2, Lightbulb, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopilotSuggestion {
  sequence: string;
  diseaseTarget: string;
  notes: string;
  suggestions: string[];
}

interface AICopilotProps {
  onApply: (s: CopilotSuggestion) => void;
}

const QUICK_PROMPTS = [
  "Antimicrobial peptide against gram-positive bacteria",
  "Short anti-inflammatory peptide for joint therapy",
  "Anticancer peptide targeting breast cancer cells",
  "Antifungal peptide for Candida infection",
  "Neuropeptide for pain modulation",
];

export function AICopilot({ onApply }: AICopilotProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CopilotSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && textareaRef.current) textareaRef.current.focus();
  }, [open]);

  const submit = async (desc: string) => {
    if (!desc.trim() || loading) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/copilot/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: desc.trim() }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json() as CopilotSuggestion;
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!result) return;
    onApply(result);
    setOpen(false);
    setResult(null);
    setInput("");
  };

  return (
    <div className="rounded-xl border border-[hsl(var(--peptoma-cyan))/25] bg-[hsl(var(--peptoma-cyan))/4] overflow-hidden">
      {/* Header toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-[hsl(var(--peptoma-cyan))/8] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-sm bg-[hsl(var(--peptoma-cyan))] flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="text-left">
            <p className="text-xs font-mono font-bold text-foreground tracking-wide">AI Copilot</p>
            <p className="text-[10px] font-mono text-muted-foreground">Describe what you need — AI will fill the form</p>
          </div>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 space-y-4">
              {/* Quick prompts */}
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => { setInput(p); submit(p); }}
                    className="text-[10px] font-mono px-2.5 py-1 rounded-full border border-[hsl(var(--peptoma-cyan))/25] text-[hsl(var(--peptoma-cyan))] hover:bg-[hsl(var(--peptoma-cyan))/10] transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(input); }
                  }}
                  placeholder="e.g. I need a short antimicrobial peptide targeting S. aureus biofilms..."
                  className="flex-1 h-20 px-3 py-2 text-xs font-mono bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground/50 resize-none focus:outline-none focus:border-[hsl(var(--peptoma-cyan))/50] transition-colors"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => submit(input)}
                  disabled={!input.trim() || loading}
                  className="self-end px-3 py-2 bg-[hsl(var(--peptoma-cyan))] text-white rounded-lg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>

              {/* Error */}
              {error && (
                <p className="text-xs font-mono text-red-500">{error}</p>
              )}

              {/* Loading */}
              {loading && (
                <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                  <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}>
                    <Sparkles className="w-3.5 h-3.5 text-[hsl(var(--peptoma-cyan))]" />
                  </motion.div>
                  AI is generating a peptide suggestion…
                </div>
              )}

              {/* Result */}
              {result && !loading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border border-[hsl(var(--peptoma-cyan))/25] bg-card p-4 space-y-3"
                >
                  <div className="flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-[hsl(var(--peptoma-gold))]" />
                    <span className="text-[10px] font-mono text-[hsl(var(--peptoma-gold))] tracking-widest uppercase">Suggestion Ready</span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="text-[9px] font-mono text-muted-foreground tracking-widest uppercase mb-0.5">Sequence</p>
                      <p className="font-mono text-sm text-[hsl(var(--peptoma-cyan))] break-all tracking-wider">{result.sequence}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-0.5">Disease Target</p>
                        <p className="text-foreground">{result.diseaseTarget}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-0.5">Length</p>
                        <p className="text-foreground">{result.sequence?.length ?? 0} aa</p>
                      </div>
                    </div>
                    {result.notes && (
                      <div>
                        <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-0.5">Context</p>
                        <p className="text-xs font-mono text-muted-foreground leading-relaxed">{result.notes}</p>
                      </div>
                    )}
                    {result.suggestions?.length > 0 && (
                      <div>
                        <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Annotation Hints</p>
                        <ul className="space-y-1">
                          {result.suggestions.slice(0, 3).map((s, i) => (
                            <li key={i} className="text-[10px] font-mono text-muted-foreground flex items-start gap-1.5">
                              <span className="text-[hsl(var(--peptoma-cyan))] mt-0.5 shrink-0">▸</span> {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleApply}
                      className="flex-1 px-3 py-2 bg-[hsl(var(--peptoma-cyan))] text-white font-mono text-xs font-bold rounded-lg hover:opacity-90 transition-opacity"
                    >
                      APPLY TO FORM
                    </button>
                    <button
                      type="button"
                      onClick={() => { setResult(null); setInput(""); }}
                      className="px-3 py-2 border border-border text-muted-foreground font-mono text-xs rounded-lg hover:bg-muted transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
