import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, CheckCircle, XCircle, Loader2, ExternalLink, Lock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Transaction, Connection, PublicKey } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createTransferCheckedInstruction,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

const PEPTM_MINT = "HopMHHPfSV2kWQLghKt6xR1oWbPRLA2UyxnKGoPpump";
const TREASURY_WALLET = "8PAdZPAEEaD5gfJxbC1fFp4q7cpCNHhz4ycQMdT8P8Lg";
const PAYMENT_AMOUNT = 1000;
const TOKEN_DECIMALS = 6;
// Route via our API proxy to avoid browser CORS/403 on public RPC
const RPC_URL = `${window.location.origin}/api/rpc/solana`;

type Status = "idle" | "building" | "awaiting_approval" | "sending" | "confirming" | "success" | "error";

type SendTxFn = (tx: Transaction, conn: Connection) => Promise<string>;

async function buildAndSendPayment(fromAddress: string, sendTx: SendTxFn): Promise<string> {
  const conn = new Connection(RPC_URL, "confirmed");
  const mint = new PublicKey(PEPTM_MINT);
  const from = new PublicKey(fromAddress);
  const treasury = new PublicKey(TREASURY_WALLET);

  const fromATA = await getAssociatedTokenAddress(mint, from);
  const toATA = await getAssociatedTokenAddress(mint, treasury);

  const tx = new Transaction();

  const toAccInfo = await conn.getAccountInfo(toATA);
  if (!toAccInfo) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        from, toATA, treasury, mint,
        TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  tx.add(
    createTransferCheckedInstruction(
      fromATA, mint, toATA, from,
      BigInt(PAYMENT_AMOUNT) * BigInt(10 ** TOKEN_DECIMALS),
      TOKEN_DECIMALS, [], TOKEN_PROGRAM_ID
    )
  );

  tx.feePayer = from;
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
  tx.recentBlockhash = blockhash;

  const signature = await sendTx(tx, conn);
  await conn.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");

  return signature;
}

interface Props {
  open: boolean;
  fromAddress: string | null;
  peptomBalance: number | null;
  sendTx: SendTxFn;
  onSuccess: (txSig: string) => void;
  onClose: () => void;
}

export function LabPaymentModal({ open, fromAddress, peptomBalance, sendTx, onSuccess, onClose }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [txSig, setTxSig] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string>("");

  const hasEnough = peptomBalance !== null && peptomBalance >= PAYMENT_AMOUNT;

  const handlePay = async () => {
    if (!fromAddress) return;
    setErrMsg("");
    try {
      setStatus("building");
      await new Promise(r => setTimeout(r, 400));
      setStatus("awaiting_approval");
      const sig = await buildAndSendPayment(fromAddress, sendTx);
      setStatus("confirming");
      setTxSig(sig);
      await new Promise(r => setTimeout(r, 600));
      setStatus("success");
      setTimeout(() => onSuccess(sig), 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("rejected") || msg.includes("cancelled") || msg.includes("canceled")) {
        setStatus("idle");
      } else {
        setErrMsg(msg.slice(0, 160));
        setStatus("error");
      }
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => status === "idle" || status === "error" ? onClose() : undefined}
            className="fixed inset-0 z-[300] bg-background/80 backdrop-blur-sm"
          />
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[301] flex items-center justify-center p-4"
          >
            <div className="w-full max-w-sm rounded-2xl border border-[hsl(var(--peptoma-cyan))/25] bg-card shadow-2xl overflow-hidden">
              <div className="px-6 pt-6 pb-4 border-b border-border/60">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-[hsl(var(--peptoma-cyan))/15] border border-[hsl(var(--peptoma-cyan))/30] flex items-center justify-center">
                    <Lock className="w-4 h-4 text-[hsl(var(--peptoma-cyan))]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base tracking-tight">Unlock The Lab</h3>
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">One-time access payment</p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div className="rounded-xl border border-[hsl(var(--peptoma-cyan))/20] bg-[hsl(var(--peptoma-cyan))/5] p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Coins className="w-5 h-5 text-[hsl(var(--peptoma-cyan))]" />
                    <div>
                      <p className="text-xs font-mono text-muted-foreground">Payment amount</p>
                      <p className="text-xl font-bold font-mono text-[hsl(var(--peptoma-cyan))]">
                        1,000 <span className="text-sm font-normal">$PEPTM</span>
                      </p>
                    </div>
                  </div>
                  {peptomBalance !== null && (
                    <div className="text-right">
                      <p className="text-[10px] font-mono text-muted-foreground">Your balance</p>
                      <p className={cn("text-sm font-mono font-bold", hasEnough ? "text-[hsl(var(--peptoma-green))]" : "text-red-400")}>
                        {peptomBalance.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">Destination</p>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border">
                    <div className="w-2 h-2 rounded-full bg-[hsl(var(--peptoma-cyan))] animate-pulse shrink-0" />
                    <span className="font-mono text-xs text-foreground flex-1 truncate">{TREASURY_WALLET}</span>
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground/60">PEPTOMA Treasury · Solana Mainnet</p>
                </div>

                {!hasEnough && peptomBalance !== null && (
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-400/8 border border-red-400/20">
                    <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs font-mono text-red-400">
                      Insufficient balance. You need {(PAYMENT_AMOUNT - (peptomBalance ?? 0)).toLocaleString()} more $PEPTM.
                    </p>
                  </div>
                )}

                {status === "error" && errMsg && (
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-400/8 border border-red-400/20">
                    <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs font-mono text-red-400">{errMsg}</p>
                  </div>
                )}

                {status === "success" && txSig && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[hsl(var(--peptoma-green))/8] border border-[hsl(var(--peptoma-green))/20]">
                    <CheckCircle className="w-4 h-4 text-[hsl(var(--peptoma-green))] shrink-0" />
                    <p className="text-xs font-mono text-[hsl(var(--peptoma-green))] flex-1">Payment confirmed! Unlocking...</p>
                    <a href={`https://solscan.io/tx/${txSig}`} target="_blank" rel="noopener noreferrer" className="text-[hsl(var(--peptoma-cyan))] shrink-0">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}

                {(status === "building" || status === "awaiting_approval" || status === "sending" || status === "confirming") && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[hsl(var(--peptoma-cyan))/8] border border-[hsl(var(--peptoma-cyan))/20]">
                    <Loader2 className="w-4 h-4 text-[hsl(var(--peptoma-cyan))] animate-spin shrink-0" />
                    <p className="text-xs font-mono text-[hsl(var(--peptoma-cyan))]">
                      {status === "building" && "Building transaction..."}
                      {status === "awaiting_approval" && "Approve in your wallet..."}
                      {status === "sending" && "Sending transaction..."}
                      {status === "confirming" && "Confirming on-chain..."}
                    </p>
                  </div>
                )}
              </div>

              <div className="px-6 pb-6 flex gap-3">
                <button
                  onClick={onClose}
                  disabled={status !== "idle" && status !== "error" && status !== "success"}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-border font-mono text-sm text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePay}
                  disabled={!hasEnough || (status !== "idle" && status !== "error")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-mono text-sm font-bold transition-all",
                    hasEnough
                      ? "bg-[hsl(var(--peptoma-cyan))] text-black hover:bg-[hsl(var(--peptoma-cyan))/90] shadow-[0_0_20px_hsl(145_100%_42%/0.35)] disabled:opacity-60 disabled:cursor-not-allowed"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  )}
                >
                  {status === "idle" || status === "error" ? (
                    <><Zap className="w-4 h-4" />Pay & Unlock</>
                  ) : status === "success" ? (
                    <><CheckCircle className="w-4 h-4" />Unlocked!</>
                  ) : (
                    <><Loader2 className="w-4 h-4 animate-spin" />{status === "awaiting_approval" ? "Approve..." : "Processing..."}</>
                  )}
                </button>
              </div>

              <div className="px-6 pb-4 -mt-2">
                <p className="text-[10px] font-mono text-muted-foreground/50 text-center leading-relaxed">
                  Payment goes directly to PEPTOMA Treasury on Solana mainnet. Transaction is irreversible.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
