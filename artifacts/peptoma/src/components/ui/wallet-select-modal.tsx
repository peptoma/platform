import { useEffect } from "react";
import { X, AlertTriangle } from "lucide-react";
import { type WalletId, getProvider } from "@/contexts/wallet-utils";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (id: WalletId) => void;
  error?: string | null;
}

const WALLETS: { id: WalletId; name: string; icon: string; url: string }[] = [
  {
    id: "phantom",
    name: "Phantom",
    icon: "/phantom-logo.png",
    url: "https://phantom.app",
  },
  {
    id: "solflare",
    name: "Solflare",
    icon: "/solflare-logo.png",
    url: "https://solflare.com",
  },
];

export function WalletSelectModal({ open, onClose, onSelect, error }: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-sm mx-4 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/60">
          <div>
            <h2 className="text-base font-semibold text-foreground" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              Connect Wallet
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Select a Solana wallet to continue</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-3 mt-3 flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl border border-red-500/25 bg-red-500/8 text-red-400">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <p className="text-[11px] font-mono leading-relaxed">{error}</p>
          </div>
        )}

        {/* Wallet list */}
        <div className="p-3 space-y-2">
          {WALLETS.map((w) => {
            const installed = getProvider(w.id) !== null;
            return (
              <button
                key={w.id}
                onClick={() => onSelect(w.id)}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all text-left group"
                style={{
                  borderColor: installed ? "hsl(var(--peptoma-cyan) / 0.25)" : "hsl(var(--border))",
                  background: installed ? "hsl(var(--peptoma-cyan) / 0.04)" : "transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "hsl(var(--peptoma-cyan) / 0.5)";
                  e.currentTarget.style.background = "hsl(var(--peptoma-cyan) / 0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = installed ? "hsl(var(--peptoma-cyan) / 0.25)" : "hsl(var(--border))";
                  e.currentTarget.style.background = installed ? "hsl(var(--peptoma-cyan) / 0.04)" : "transparent";
                }}
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center shrink-0 overflow-hidden border border-border/40">
                  <img
                    src={w.icon}
                    alt={w.name}
                    className="w-7 h-7 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      e.currentTarget.parentElement!.innerHTML = `<span class="text-lg font-bold text-muted-foreground">${w.name[0]}</span>`;
                    }}
                  />
                </div>

                {/* Label */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-foreground">{w.name}</span>
                    {installed && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full uppercase tracking-widest"
                        style={{ background: "hsl(var(--peptoma-cyan) / 0.15)", color: "hsl(var(--peptoma-cyan))" }}>
                        Detected
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                    {installed ? "Click to connect" : "Not installed — click to install"}
                  </p>
                </div>

                {/* Arrow */}
                <span className="text-muted-foreground group-hover:text-foreground transition-colors text-sm">→</span>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/40 text-center">
          <p className="text-[10px] font-mono text-muted-foreground/60">
            Solana · Secure non-custodial connection
          </p>
        </div>
      </div>
    </div>
  );
}
