import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, ShoppingCart, Tag, CheckCircle, Loader2, ArrowRight,
  TrendingUp, Users, Activity, Filter, X, FlaskConical, ExternalLink,
  Coins, AlertTriangle, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWallet } from "@/contexts/wallet-context";
import { Transaction, SystemProgram, LAMPORTS_PER_SOL, Connection, PublicKey } from "@solana/web3.js";

const BASE = import.meta.env.BASE_URL;

type NftListing = {
  nft: {
    id: number;
    sequenceId: number;
    walletAddress: string;
    mintAddress: string;
    txSignature: string;
    price: number | null;
    listed: boolean;
    listedAt: string | null;
    mintedAt: string;
    status: string;
  };
  seq: {
    id: number;
    sequence: string;
    bioactivityLabel: string | null;
    bioactivityScore: number;
    confidenceScore: number;
    structurePrediction: string | null;
    toxicityRisk: string | null;
    diseaseTarget: string | null;
    annotationCount: number;
    depth: string;
  };
};

type OwnedNft = {
  nft: {
    id: number;
    sequenceId: number;
    walletAddress: string;
    mintAddress: string;
    txSignature: string;
    price: number | null;
    listed: boolean;
    soldAt: string | null;
    mintedAt: string;
  };
  seq: {
    id: number;
    sequence: string;
    bioactivityLabel: string | null;
    bioactivityScore: number;
    confidenceScore: number;
    annotationCount: number;
    diseaseTarget: string | null;
  };
};

function toxLabel(r?: string | null) {
  if (r === "low") return { label: "Low Risk", color: "text-[hsl(var(--peptoma-green))] bg-[hsl(var(--peptoma-green))/8] border-[hsl(var(--peptoma-green))/20]" };
  if (r === "medium") return { label: "Med Risk", color: "text-[hsl(var(--peptoma-gold))] bg-[hsl(var(--peptoma-gold))/8] border-[hsl(var(--peptoma-gold))/20]" };
  if (r === "high") return { label: "High Risk", color: "text-[hsl(var(--peptoma-red))] bg-[hsl(var(--peptoma-red))/8] border-[hsl(var(--peptoma-red))/20]" };
  return { label: "Unknown", color: "text-muted-foreground bg-muted/20 border-border" };
}

function timeAgo(dateStr: string) {
  const d = Date.now() - new Date(dateStr).getTime();
  if (d < 60000) return "just now";
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}

function NFTCard({ listing, onBuy, buying, currentWallet }: {
  listing: NftListing;
  onBuy: (id: number) => void;
  buying: boolean;
  currentWallet?: string | null;
}) {
  const { nft, seq } = listing;
  const tox = toxLabel(seq.toxicityRisk);
  const isOwner = !!currentWallet && currentWallet === nft.walletAddress;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[hsl(var(--peptoma-gold))/20] bg-card/80 overflow-hidden hover:border-[hsl(var(--peptoma-gold))/40] transition-all group"
    >
      {/* NFT Artwork */}
      <div className="relative bg-[#060b14] border-b border-[hsl(var(--peptoma-gold))/15] overflow-hidden">
        <img
          src={`${BASE}api/ipnft/${seq.id}/image.svg`}
          alt={`IP-NFT #${nft.id}`}
          className="w-full block group-hover:scale-[1.02] transition-transform duration-500"
          style={{ imageRendering: "crisp-edges" }}
        />
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-full border border-white/10">
          <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--peptoma-gold))] animate-pulse" />
          <span className="text-[9px] font-mono text-[hsl(var(--peptoma-gold))]">LISTED</span>
        </div>
        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-full border border-white/10">
          <span className="text-[10px] font-mono font-bold text-white">{nft.price} SOL</span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-mono text-muted-foreground">IP-NFT #{nft.id}</p>
            <p className="text-sm font-mono font-bold text-foreground leading-tight">
              {seq.bioactivityLabel ?? "Unknown"} · Seq #{seq.id}
            </p>
          </div>
          <span className={cn("text-[8px] font-mono px-1.5 py-0.5 rounded border uppercase tracking-widest shrink-0", tox.color)}>
            {tox.label}
          </span>
        </div>

        {/* Sequence snippet */}
        <p className="text-[9px] font-mono text-muted-foreground/60 break-all leading-relaxed line-clamp-1">
          {seq.sequence.slice(0, 40)}{seq.sequence.length > 40 ? "…" : ""}
        </p>

        {/* Scores */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Bioactivity", value: seq.bioactivityScore, color: "bg-[hsl(var(--peptoma-gold))]", text: "text-[hsl(var(--peptoma-gold))]" },
            { label: "Confidence", value: seq.confidenceScore, color: "bg-[hsl(var(--peptoma-cyan))]", text: "text-[hsl(var(--peptoma-cyan))]" },
          ].map(({ label, value, color, text }) => (
            <div key={label}>
              <div className="flex justify-between text-[9px] font-mono mb-0.5">
                <span className="text-muted-foreground">{label}</span>
                <span className={text}>{value}</span>
              </div>
              <div className="h-1 bg-muted/30 rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full", color)} style={{ width: `${value}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-[9px] font-mono text-muted-foreground">
          {seq.diseaseTarget && (
            <span className="text-[hsl(var(--peptoma-gold))/70] truncate">{seq.diseaseTarget}</span>
          )}
          <span>{seq.annotationCount} annotations</span>
          {nft.listedAt && <span className="ml-auto">{timeAgo(nft.listedAt)}</span>}
        </div>

        {/* Seller */}
        <div className="flex items-center gap-1.5 text-[9px] font-mono text-muted-foreground/50">
          <span>{isOwner ? "You:" : "Seller:"}</span>
          <span className={cn("font-mono", isOwner ? "text-[hsl(var(--peptoma-gold))]" : "text-muted-foreground/70")}>
            {nft.walletAddress.slice(0, 8)}…{nft.walletAddress.slice(-4)}
          </span>
          <a
            href={`https://solscan.io/token/${nft.mintAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="ml-auto text-[8px] text-[hsl(var(--peptoma-cyan))/60] hover:text-[hsl(var(--peptoma-cyan))] hover:underline"
          >Mint: {nft.mintAddress.slice(0, 6)}…</a>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          <Link href={`/annotate/${seq.id}`}>
            <button className="flex items-center justify-center gap-1.5 px-3 py-2 border border-border rounded-lg font-mono text-[10px] text-muted-foreground hover:text-foreground hover:border-[hsl(var(--peptoma-cyan))/30] transition-all">
              <ExternalLink className="w-3 h-3" /> View
            </button>
          </Link>
          {isOwner ? (
            <div className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-[hsl(var(--peptoma-gold))/30] rounded-lg font-mono text-[10px] text-[hsl(var(--peptoma-gold))] bg-[hsl(var(--peptoma-gold))/5]">
              ✦ Your IP-NFT
            </div>
          ) : (
            <button
              onClick={() => onBuy(nft.id)}
              disabled={buying}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[hsl(var(--peptoma-gold))] text-black font-mono font-bold text-[10px] rounded-lg hover:bg-[hsl(var(--peptoma-gold))/90] disabled:opacity-60 transition-colors"
            >
              {buying ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> Buying…</>
              ) : (
                <><ShoppingCart className="w-3 h-3" /> Buy {nft.price} SOL</>
              )}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ListModal({ nft, onClose, onList }: {
  nft: OwnedNft;
  onClose: () => void;
  onList: (nftId: number, price: number) => Promise<void>;
}) {
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [err, setErr] = useState("");

  const handleSubmit = async () => {
    const p = parseFloat(price);
    if (!p || p <= 0) { setErr("Enter a valid price"); return; }
    setStatus("loading");
    setErr("");
    try {
      await onList(nft.nft.id, p);
      setStatus("success");
    } catch (e: unknown) {
      setStatus("error");
      setErr(e instanceof Error ? e.message : "Failed to list");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-[hsl(var(--peptoma-gold))]" />
            <h2 className="text-sm font-mono font-bold tracking-widest uppercase">List for Sale</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {status === "success" ? (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 p-3 bg-[hsl(var(--peptoma-green))/5] border border-[hsl(var(--peptoma-green))/20] rounded-lg">
              <CheckCircle className="w-4 h-4 text-[hsl(var(--peptoma-green))]" />
              <p className="text-xs font-mono text-[hsl(var(--peptoma-green))]">Listed on PEPTOMA Marketplace!</p>
            </div>
            <button onClick={onClose} className="w-full py-2.5 border border-border rounded-lg font-mono text-xs text-muted-foreground hover:text-foreground">
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-border bg-muted/10 p-3 space-y-1">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">NFT</p>
              <p className="text-xs font-mono font-bold">{nft.seq.bioactivityLabel ?? "Unknown"} · IP-NFT #{nft.nft.id}</p>
              <p className="text-[9px] font-mono text-muted-foreground/50 break-all">{nft.seq.sequence.slice(0, 50)}…</p>
            </div>

            <div>
              <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1.5 block">
                Price <span className="text-[hsl(var(--peptoma-red))]">*</span>
              </label>
              <div className="flex items-center gap-0 border border-border rounded-lg overflow-hidden focus-within:border-[hsl(var(--peptoma-gold))/40]">
                <input
                  type="number"
                  min="1"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="500"
                  className="flex-1 px-3 py-2.5 bg-transparent font-mono text-sm text-foreground placeholder-muted-foreground/50 focus:outline-none"
                />
                <span className="text-[10px] font-mono text-muted-foreground bg-muted/30 px-3 py-2.5 border-l border-border shrink-0">SOL</span>
              </div>
              <p className="text-[9px] font-mono text-muted-foreground/50 mt-1">
                Buyer pays this price in SOL. Platform fee: 2.5%.
              </p>
            </div>

            {err && <p className="text-[10px] font-mono text-[hsl(var(--peptoma-red))]">{err}</p>}

            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-lg font-mono text-xs text-muted-foreground hover:text-foreground transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={status === "loading" || !price}
                className="flex-1 py-2.5 bg-[hsl(var(--peptoma-gold))] text-black font-mono font-bold text-xs rounded-lg hover:bg-[hsl(var(--peptoma-gold))/90] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {status === "loading" ? <><Loader2 className="w-3 h-3 animate-spin" /> Listing…</> : <><Tag className="w-3 h-3" /> List for Sale</>}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

function BuySuccessModal({ nft, txSig, onClose }: { nft: NftListing; txSig: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-[hsl(var(--peptoma-green))/30] rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-5"
      >
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[hsl(var(--peptoma-green))/10] border border-[hsl(var(--peptoma-green))/30] flex items-center justify-center mx-auto">
            <CheckCircle className="w-6 h-6 text-[hsl(var(--peptoma-green))]" />
          </div>
          <h2 className="text-lg font-mono font-bold text-foreground">IP-NFT Purchased!</h2>
          <p className="text-xs font-mono text-muted-foreground">
            You now own <span className="text-foreground font-bold">{nft.seq.bioactivityLabel ?? "Unknown"} · IP-NFT #{nft.nft.id}</span>
          </p>
        </div>

        <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-3">
          <div>
            <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-0.5">Transaction</p>
            <a
              href={`https://solscan.io/tx/${txSig}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-mono text-[hsl(var(--peptoma-green))] break-all hover:underline"
            >{txSig.slice(0, 40)}…</a>
          </div>
          <div>
            <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-0.5">Mint Address</p>
            <a
              href={`https://solscan.io/token/${nft.nft.mintAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-mono text-[hsl(var(--peptoma-cyan))] break-all hover:underline"
            >{nft.nft.mintAddress}</a>
          </div>
          <div>
            <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-0.5">Price Paid</p>
            <p className="text-sm font-mono font-bold text-[hsl(var(--peptoma-gold))]">{nft.nft.price} SOL</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-lg font-mono text-xs text-muted-foreground hover:text-foreground transition-colors">
            Continue Shopping
          </button>
          <Link href="/missions" className="flex-1">
            <button className="w-full py-2.5 bg-[hsl(var(--peptoma-cyan))] text-black font-mono font-bold text-xs rounded-lg hover:bg-[hsl(var(--peptoma-cyan))/90]">
              View My NFTs
            </button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default function Marketplace() {
  const { userId, connected, address, sendTransaction, refreshBalances } = useWallet();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "antimicrobial" | "neuropeptide" | "anti-inflammatory" | "antifungal">("all");
  const [sort, setSort] = useState<"newest" | "price_asc" | "price_desc" | "score">("newest");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"listings" | "my_nfts">("listings");
  const [buyingId, setBuyingId] = useState<number | null>(null);
  const [listingNft, setListingNft] = useState<OwnedNft | null>(null);
  const [buySuccess, setBuySuccess] = useState<{ listing: NftListing; txSig: string } | null>(null);

  const { data: marketData, isLoading: marketLoading } = useQuery<{ listings: NftListing[] }>({
    queryKey: ["ipnft-marketplace"],
    queryFn: async () => {
      const r = await fetch(`${BASE}api/ipnft/marketplace`);
      if (!r.ok) throw new Error("Failed to load marketplace");
      return r.json() as Promise<{ listings: NftListing[] }>;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { data: ownedData, isLoading: ownedLoading } = useQuery<{ owned: OwnedNft[] }>({
    queryKey: ["ipnft-owned", userId],
    queryFn: async () => {
      if (!userId) return { owned: [] };
      const r = await fetch(`${BASE}api/ipnft/owned?wallet=${encodeURIComponent(userId)}`);
      if (!r.ok) throw new Error("Failed to load owned NFTs");
      return r.json() as Promise<{ owned: OwnedNft[] }>;
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  const handleBuy = async (nftId: number) => {
    const listing = marketData?.listings.find(l => l.nft.id === nftId);
    if (!listing) return;

    if (!connected || !address) {
      alert("Connect your Solana wallet to buy.");
      return;
    }
    if (!listing.nft.price || listing.nft.price <= 0) {
      alert("Invalid listing price.");
      return;
    }
    if (listing.nft.walletAddress === address) {
      alert("Cannot buy your own NFT.");
      return;
    }

    setBuyingId(nftId);
    try {
      // Step 1: Send real SOL from buyer to seller via Phantom
      const conn = new Connection(`${window.location.origin}/api/rpc/solana`, "confirmed");
      const sellerPk = new PublicKey(listing.nft.walletAddress);
      const buyerPk = new PublicKey(address);
      const lamports = Math.round(listing.nft.price * LAMPORTS_PER_SOL);

      const tx = new Transaction().add(
        SystemProgram.transfer({ fromPubkey: buyerPk, toPubkey: sellerPk, lamports })
      );
      const { blockhash } = await conn.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = buyerPk;

      let txSig: string;
      try {
        txSig = await sendTransaction(tx, conn);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        alert(msg.includes("rejected") ? "Transaction rejected." : `Payment failed: ${msg.slice(0, 100)}`);
        return;
      }

      // Wait briefly for confirmation
      await conn.confirmTransaction(txSig, "confirmed").catch(() => {});

      // Step 2: Notify backend with verified txSig
      const r = await fetch(`${BASE}api/ipnft/${nftId}/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyerWallet: address, txSig }),
      });
      const d = await r.json() as { success?: boolean; nft?: NftListing["nft"]; txSignature?: string; error?: string };
      if (!r.ok || !d.success) {
        alert(d.error ?? "Purchase failed");
        return;
      }
      setBuySuccess({ listing, txSig: d.txSignature ?? txSig });
      refreshBalances();
      queryClient.invalidateQueries({ queryKey: ["ipnft-marketplace"] });
      queryClient.invalidateQueries({ queryKey: ["ipnft-owned", userId] });
    } finally {
      setBuyingId(null);
    }
  };

  const handleList = async (nftId: number, price: number) => {
    const r = await fetch(`${BASE}api/ipnft/${nftId}/list`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price, walletAddress: userId }),
    });
    const d = await r.json() as { success?: boolean; error?: string };
    if (!r.ok || !d.success) throw new Error(d.error ?? "Failed to list");
    queryClient.invalidateQueries({ queryKey: ["ipnft-marketplace"] });
    queryClient.invalidateQueries({ queryKey: ["ipnft-owned", userId] });
  };

  const handleUnlist = async (nftId: number) => {
    const r = await fetch(`${BASE}api/ipnft/${nftId}/unlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress: userId }),
    });
    if (!r.ok) { alert("Failed to unlist"); return; }
    queryClient.invalidateQueries({ queryKey: ["ipnft-marketplace"] });
    queryClient.invalidateQueries({ queryKey: ["ipnft-owned", userId] });
  };

  // Filter + sort listings
  const filteredListings = (marketData?.listings ?? []).filter(l => {
    if (filter !== "all") {
      const label = l.seq.bioactivityLabel?.toLowerCase() ?? "";
      if (!label.includes(filter.replace(/-/g, " "))) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      return (
        l.seq.sequence.toLowerCase().includes(q) ||
        (l.seq.bioactivityLabel?.toLowerCase().includes(q) ?? false) ||
        (l.seq.diseaseTarget?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  }).sort((a, b) => {
    if (sort === "price_asc") return (a.nft.price ?? 0) - (b.nft.price ?? 0);
    if (sort === "price_desc") return (b.nft.price ?? 0) - (a.nft.price ?? 0);
    if (sort === "score") return b.seq.bioactivityScore - a.seq.bioactivityScore;
    return new Date(b.nft.listedAt ?? 0).getTime() - new Date(a.nft.listedAt ?? 0).getTime();
  });

  const totalVolume = (ownedData?.owned ?? []).reduce((s, o) => s + (o.nft.price ?? 0), 0);

  return (
    <div className="space-y-6 pb-16 max-w-6xl">
      {listingNft && (
        <ListModal
          nft={listingNft}
          onClose={() => setListingNft(null)}
          onList={handleList}
        />
      )}
      {buySuccess && (
        <BuySuccessModal
          nft={buySuccess.listing}
          txSig={buySuccess.txSig}
          onClose={() => setBuySuccess(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-1 tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--peptoma-gold))] animate-pulse" />
            PEPTOMA Protocol
          </div>
          <h1 className="text-3xl font-bold tracking-tight">IP-NFT Marketplace</h1>
          <p className="text-muted-foreground mt-1 font-mono text-sm">
            Buy and sell peptide research IP-NFTs. Every NFT represents a real research dataset — minted only by annotating sequences.
          </p>
        </div>
        <Link href="/lab">
          <button className="shrink-0 flex items-center gap-2 px-4 py-2 bg-[hsl(var(--peptoma-cyan))] text-black font-mono font-bold text-xs rounded-lg hover:bg-[hsl(var(--peptoma-cyan))/90] transition-colors">
            <FlaskConical className="w-3.5 h-3.5" /> Create NFT in Lab
          </button>
        </Link>
      </div>

      {/* How it works banner */}
      <div className="rounded-xl border border-[hsl(var(--peptoma-cyan))/20] bg-[hsl(var(--peptoma-cyan))/4] p-4">
        <p className="text-[10px] font-mono text-muted-foreground/70 uppercase tracking-widest mb-3">How IP-NFT Works</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { step: "01", icon: FlaskConical, title: "Submit & Annotate", desc: "Analyse a peptide sequence in The Lab. Annotate it to build research value.", color: "text-[hsl(var(--peptoma-cyan))]" },
            { step: "02", icon: BookOpen, title: "Mint IP-NFT", desc: "Open the IP-NFT registry on any annotate page and mint it to the PEPTOMA protocol.", color: "text-[hsl(var(--peptoma-gold))]" },
            { step: "03", icon: ShoppingCart, title: "List & Trade", desc: "List your IP-NFT for sale in SOL. Buyers get full ownership and research IP rights.", color: "text-[hsl(var(--peptoma-green))]" },
          ].map(({ step, icon: Icon, title, desc, color }) => (
            <div key={step} className="flex items-start gap-3">
              <div className={cn("w-8 h-8 rounded-lg border flex items-center justify-center shrink-0", color === "text-[hsl(var(--peptoma-cyan))]" ? "border-[hsl(var(--peptoma-cyan))/20] bg-[hsl(var(--peptoma-cyan))/8]" : color === "text-[hsl(var(--peptoma-gold))]" ? "border-[hsl(var(--peptoma-gold))/20] bg-[hsl(var(--peptoma-gold))/8]" : "border-[hsl(var(--peptoma-green))/20] bg-[hsl(var(--peptoma-green))/8]")}>
                <Icon className={cn("w-3.5 h-3.5", color)} />
              </div>
              <div>
                <p className="text-[9px] font-mono text-muted-foreground/50 tracking-widest">STEP {step}</p>
                <p className="text-xs font-mono font-bold text-foreground">{title}</p>
                <p className="text-[10px] font-mono text-muted-foreground leading-snug mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Listings", value: String(filteredListings.length), icon: Tag, color: "text-[hsl(var(--peptoma-gold))]" },
          { label: "Unique Sellers", value: String(new Set(marketData?.listings.map(l => l.nft.walletAddress)).size), icon: Users, color: "text-foreground" },
          { label: "My NFTs", value: String(ownedData?.owned.length ?? 0), icon: BookOpen, color: "text-[hsl(var(--peptoma-cyan))]" },
          { label: "Floor Price", value: filteredListings.length ? `${Math.min(...filteredListings.map(l => l.nft.price ?? Infinity))} SOL` : "—", icon: TrendingUp, color: "text-[hsl(var(--peptoma-green))]" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-border bg-card/60 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon className={cn("w-3.5 h-3.5", color)} />
              <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">{label}</span>
            </div>
            <p className={cn("text-xl font-mono font-bold", color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted/20 rounded-xl border border-border w-fit">
        {([
          { key: "listings", label: "Market Listings", icon: ShoppingCart },
          { key: "my_nfts", label: "My NFTs", icon: BookOpen },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg font-mono text-[11px] transition-all",
              tab === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* ── LISTINGS TAB ── */}
      {tab === "listings" && (
        <div className="space-y-5">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-1.5 bg-card/60 focus-within:border-[hsl(var(--peptoma-gold))/40] transition-colors">
              <Search className="w-3 h-3 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search sequences…"
                className="bg-transparent font-mono text-xs text-foreground placeholder-muted-foreground/50 focus:outline-none w-40"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Category filter */}
            <div className="flex items-center gap-1">
              <Filter className="w-3 h-3 text-muted-foreground" />
              {(["all", "antimicrobial", "neuropeptide", "anti-inflammatory"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-2.5 py-1 text-[9px] font-mono uppercase tracking-widest rounded-md border transition-all",
                    filter === f
                      ? "border-[hsl(var(--peptoma-gold))/40] bg-[hsl(var(--peptoma-gold))/8] text-[hsl(var(--peptoma-gold))]"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {f === "all" ? "All" : f}
                </button>
              ))}
            </div>

            {/* Sort */}
            <select
              value={sort}
              onChange={e => setSort(e.target.value as typeof sort)}
              className="ml-auto text-[10px] font-mono border border-border rounded-lg px-2.5 py-1.5 bg-card text-foreground focus:outline-none focus:border-[hsl(var(--peptoma-gold))/40]"
            >
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low → High</option>
              <option value="price_desc">Price: High → Low</option>
              <option value="score">Bioactivity Score</option>
            </select>
          </div>

          {/* Listings grid */}
          {marketLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-xl border border-border bg-card/40 h-80 animate-pulse" />
              ))}
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="py-20 text-center rounded-xl border border-border bg-card/20 space-y-4">
              <BookOpen className="w-10 h-10 text-muted-foreground/20 mx-auto" />
              <p className="font-mono text-muted-foreground text-sm">No IP-NFTs listed yet</p>
              <p className="font-mono text-muted-foreground/60 text-xs max-w-sm mx-auto">
                To create an IP-NFT: submit a sequence in The Lab → annotate it → open IP-NFT Registry → mint → list for sale here.
              </p>
              <Link href="/lab">
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-[hsl(var(--peptoma-gold))] text-black font-mono font-bold text-xs rounded-lg hover:bg-[hsl(var(--peptoma-gold))/90] mt-2">
                  <FlaskConical className="w-3.5 h-3.5" /> Go to The Lab <ArrowRight className="w-3 h-3" />
                </button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {filteredListings.map(listing => (
                  <NFTCard
                    key={listing.nft.id}
                    listing={listing}
                    onBuy={handleBuy}
                    buying={buyingId === listing.nft.id}
                    currentWallet={userId}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* ── MY NFTS TAB ── */}
      {tab === "my_nfts" && (
        <div className="space-y-4">
          {!userId ? (
            <div className="py-16 text-center rounded-xl border border-border bg-card/20 space-y-3">
              <BookOpen className="w-10 h-10 text-muted-foreground/20 mx-auto" />
              <p className="font-mono text-muted-foreground">Connect your wallet to see your IP-NFTs</p>
            </div>
          ) : ownedLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2].map(i => <div key={i} className="h-56 rounded-xl border border-border bg-card/40 animate-pulse" />)}
            </div>
          ) : (ownedData?.owned.length ?? 0) === 0 ? (
            <div className="py-16 text-center rounded-xl border border-border bg-card/20 space-y-4">
              <BookOpen className="w-10 h-10 text-muted-foreground/20 mx-auto" />
              <p className="font-mono text-muted-foreground text-sm">You don't own any IP-NFTs yet</p>
              <p className="font-mono text-muted-foreground/60 text-xs max-w-sm mx-auto">
                Submit a peptide sequence in The Lab, annotate it, then mint an IP-NFT from the annotation page.
              </p>
              <div className="flex items-center justify-center gap-2">
                <Link href="/lab">
                  <button className="inline-flex items-center gap-2 px-4 py-2 bg-[hsl(var(--peptoma-cyan))] text-black font-mono font-bold text-xs rounded-lg">
                    <FlaskConical className="w-3.5 h-3.5" /> The Lab
                  </button>
                </Link>
                <Link href="/feed">
                  <button className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg font-mono text-xs text-muted-foreground hover:text-foreground">
                    Browse Feed
                  </button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              {totalVolume > 0 && (
                <div className="rounded-xl border border-[hsl(var(--peptoma-gold))/20] bg-[hsl(var(--peptoma-gold))/4] p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">Portfolio Value</p>
                    <p className="text-2xl font-mono font-bold text-[hsl(var(--peptoma-gold))]">{totalVolume} <span className="text-sm font-normal text-muted-foreground">SOL</span></p>
                  </div>
                  <Activity className="w-8 h-8 text-[hsl(var(--peptoma-gold))/30]" />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ownedData?.owned.map(owned => (
                  <motion.div
                    key={owned.nft.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-border bg-card/80 overflow-hidden"
                  >
                    <div className="relative bg-[#060b14] border-b border-border/40">
                      <img
                        src={`${BASE}api/ipnft/${owned.seq.id}/image.svg`}
                        alt={`IP-NFT #${owned.nft.id}`}
                        className="w-full block"
                        style={{ imageRendering: "crisp-edges" }}
                      />
                      {owned.nft.listed && (
                        <div className="absolute top-2 left-2 flex items-center gap-1 bg-[hsl(var(--peptoma-gold))/80] backdrop-blur-sm px-2 py-1 rounded-full">
                          <Tag className="w-2.5 h-2.5 text-black" />
                          <span className="text-[9px] font-mono font-bold text-black">LISTED · {owned.nft.price} SOL</span>
                        </div>
                      )}
                      {owned.nft.soldAt && (
                        <div className="absolute top-2 left-2 flex items-center gap-1 bg-[hsl(var(--peptoma-red))/80] backdrop-blur-sm px-2 py-1 rounded-full">
                          <span className="text-[9px] font-mono font-bold text-white">SOLD</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <p className="text-[10px] font-mono text-muted-foreground">IP-NFT #{owned.nft.id}</p>
                        <p className="text-sm font-mono font-bold">{owned.seq.bioactivityLabel ?? "Unknown"} · Seq #{owned.seq.id}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="p-2 bg-muted/10 rounded border border-border/40">
                          <p className="text-muted-foreground text-[9px]">Bioactivity</p>
                          <p className="text-[hsl(var(--peptoma-gold))] font-bold">{owned.seq.bioactivityScore}</p>
                        </div>
                        <div className="p-2 bg-muted/10 rounded border border-border/40">
                          <p className="text-muted-foreground text-[9px]">Annotations</p>
                          <p className="text-foreground font-bold">{owned.seq.annotationCount}</p>
                        </div>
                      </div>
                      <a
                        href={`https://solscan.io/token/${owned.nft.mintAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] font-mono text-[hsl(var(--peptoma-cyan))/50] hover:text-[hsl(var(--peptoma-cyan))] hover:underline"
                      >Mint: {owned.nft.mintAddress.slice(0, 10)}… ↗</a>
                      <a
                        href={`https://solscan.io/tx/${owned.nft.txSignature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-[9px] font-mono text-[hsl(var(--peptoma-green))/50] hover:text-[hsl(var(--peptoma-green))] hover:underline"
                      >TX: {owned.nft.txSignature.slice(0, 10)}… ↗</a>
                      <div className="flex gap-2">
                        <Link href={`/annotate/${owned.seq.id}`}>
                          <button className="flex items-center gap-1 px-3 py-2 border border-border rounded-lg font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                            <ExternalLink className="w-3 h-3" /> View
                          </button>
                        </Link>
                        {!owned.nft.soldAt && !owned.nft.listed ? (
                          <button
                            onClick={() => setListingNft(owned)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[hsl(var(--peptoma-gold))] text-black font-mono font-bold text-[10px] rounded-lg hover:bg-[hsl(var(--peptoma-gold))/90]"
                          >
                            <Tag className="w-3 h-3" /> List for Sale
                          </button>
                        ) : owned.nft.listed ? (
                          <button
                            onClick={() => handleUnlist(owned.nft.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-[hsl(var(--peptoma-red))/30] text-[hsl(var(--peptoma-red))] font-mono text-[10px] rounded-lg hover:bg-[hsl(var(--peptoma-red))/5]"
                          >
                            <X className="w-3 h-3" /> Unlist
                          </button>
                        ) : (
                          <div className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-border rounded-lg font-mono text-[10px] text-muted-foreground">
                            <CheckCircle className="w-3 h-3" /> Sold
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Warning note */}
      <div className="rounded-xl border border-[hsl(var(--peptoma-gold))/15] bg-[hsl(var(--peptoma-gold))/3] p-4 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-[hsl(var(--peptoma-gold))/60] shrink-0 mt-0.5" />
        <p className="text-[10px] font-mono text-muted-foreground/60 leading-relaxed">
          <span className="text-foreground font-bold">IP-NFTs are research IP tokens, not financial products.</span> Each NFT is backed by a real peptide research dataset stored on the PEPTOMA protocol and IPFS. All transactions are denominated in SOL on Solana Mainnet. Always verify the mint address before transacting.
        </p>
      </div>
    </div>
  );
}
