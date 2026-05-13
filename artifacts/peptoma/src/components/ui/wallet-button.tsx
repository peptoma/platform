import { useEffect, useRef, useState } from "react";
import { Wallet, LogOut, RefreshCw, ChevronDown } from "lucide-react";
import { useWallet } from "@/contexts/wallet-context";
import { cn } from "@/lib/utils";

interface WalletButtonProps {
  size?: "sm" | "md";
  className?: string;
}

function fmt(n: number, decimals = 4): string {
  if (n === 0) return "0";
  if (n < 0.0001) return "<0.0001";
  return n.toLocaleString("en-US", { maximumFractionDigits: decimals, minimumFractionDigits: 0 });
}

export function WalletButton({ size = "sm", className }: WalletButtonProps) {
  const {
    connected, connecting, shortAddress,
    solBalance, peptomBalance, balancesLoading,
    connect, disconnect, refreshBalances,
  } = useWallet();

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!connected) {
    return (
      <button
        onClick={connect}
        disabled={connecting}
        className={cn(
          "flex items-center gap-2 rounded-lg border font-mono transition-colors disabled:opacity-50",
          "border-border text-muted-foreground hover:border-[hsl(var(--peptoma-cyan))/40] hover:text-foreground",
          size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
          className
        )}
      >
        <Wallet className="w-3.5 h-3.5" />
        {connecting ? "Loading..." : "Connect Wallet"}
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2 rounded-lg border font-mono transition-colors",
          "border-[hsl(var(--peptoma-cyan))/30] bg-[hsl(var(--peptoma-cyan))/8] text-[hsl(var(--peptoma-cyan))]",
          "hover:bg-[hsl(var(--peptoma-cyan))/15]",
          size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
          className
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--peptoma-cyan))] animate-pulse shadow-[0_0_5px_hsl(145_100%_42%/0.8)]" />
        {shortAddress}
        <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-64 rounded-xl border border-[hsl(var(--peptoma-cyan))/20] bg-card shadow-xl z-[200] overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--peptoma-cyan))] animate-pulse shrink-0" />
            <span className="font-mono text-xs text-[hsl(var(--peptoma-cyan))] truncate flex-1">{shortAddress}</span>
            <span className="text-[9px] font-mono text-muted-foreground/60 bg-muted/30 px-1.5 py-0.5 rounded uppercase tracking-widest">Solana</span>
          </div>

          <div className="px-4 py-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src="/sol-logo.png" alt="SOL" className="w-5 h-5 rounded-full shrink-0" />
                <span className="text-xs font-mono text-muted-foreground">SOL</span>
              </div>
              {balancesLoading ? (
                <div className="h-3 w-16 bg-muted/40 rounded animate-pulse" />
              ) : (
                <span className="text-xs font-mono font-bold text-foreground">
                  {solBalance !== null ? fmt(solBalance, 4) : "—"}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src="/peptm-logo.png" alt="PEPTM" className="w-5 h-5 rounded-full shrink-0" />
                <span className="text-xs font-mono text-muted-foreground">$PEPTM</span>
              </div>
              {balancesLoading ? (
                <div className="h-3 w-20 bg-muted/40 rounded animate-pulse" />
              ) : (
                <span className={cn(
                  "text-xs font-mono font-bold",
                  peptomBalance && peptomBalance > 0 ? "text-[hsl(var(--peptoma-cyan))]" : "text-muted-foreground"
                )}>
                  {peptomBalance !== null ? fmt(peptomBalance, 0) : "—"}
                </span>
              )}
            </div>
          </div>

          <div className="border-t border-border/60 px-3 py-2 flex items-center gap-1">
            <button
              onClick={() => { refreshBalances(); }}
              disabled={balancesLoading}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors disabled:opacity-40 flex-1"
            >
              <RefreshCw className={cn("w-3 h-3", balancesLoading && "animate-spin")} />
              Refresh
            </button>
            <button
              onClick={() => { setOpen(false); disconnect(); }}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] font-mono text-muted-foreground hover:text-[hsl(var(--peptoma-red))] hover:bg-[hsl(var(--peptoma-red))/8] transition-colors"
            >
              <LogOut className="w-3 h-3" />
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
