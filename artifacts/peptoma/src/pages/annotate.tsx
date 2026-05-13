import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useWallet } from "@/contexts/wallet-context";
import { useGetSequence, useGetAnnotations, useCreateAnnotation, getGetAnnotationsQueryKey, useGetSequenceForks, useGetSequenceCitations, useForkSequence, getGetSequenceForksQueryKey, getGetSequenceCitationsQueryKey } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { ArrowLeft, MessageSquare, FlaskConical, CheckCircle, AlertTriangle, Plus, Tag, ThumbsUp, Lightbulb, BookOpen, ExternalLink, Activity, Share2, Copy, Check, Twitter, Dna, Loader2, HelpCircle, Archive, FlaskRound, X, Coins, Download, GitFork, GitBranch, Quote } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryClient, useQuery } from "@tanstack/react-query";

const ANNOTATION_TYPES = [
  { type: "confirm", label: "CONFIRM", icon: CheckCircle, earn: 2, desc: "Agree with the AI's classification" },
  { type: "challenge", label: "CHALLENGE", icon: AlertTriangle, earn: 3, desc: "Dispute the AI result with reasoning" },
  { type: "extend", label: "EXTEND", icon: Plus, earn: 5, desc: "Add related sequence or supporting data" },
  { type: "tag", label: "TAG", icon: Tag, earn: 2, desc: "Add a disease/target label" },
] as const;

const TYPE_COLORS: Record<string, string> = {
  confirm: "text-[hsl(var(--peptoma-green))] border-[hsl(var(--peptoma-green))/20] bg-[hsl(var(--peptoma-green))/10]",
  challenge: "text-[hsl(var(--peptoma-red))] border-[hsl(var(--peptoma-red))/20] bg-[hsl(var(--peptoma-red))/10]",
  extend: "text-[hsl(var(--peptoma-cyan))] border-[hsl(var(--peptoma-cyan))/20] bg-[hsl(var(--peptoma-cyan))/10]",
  tag: "text-[hsl(var(--peptoma-gold))] border-[hsl(var(--peptoma-gold))/20] bg-[hsl(var(--peptoma-gold))/10]",
};

function StructureLabel(type?: string) {
  const labels: Record<string, string> = { alpha_helix: "α-HELIX", beta_sheet: "β-SHEET", random_coil: "RANDOM COIL", mixed: "MIXED" };
  return labels[type ?? ""] ?? (type?.toUpperCase() ?? "—");
}

function ShareButton({ seqId, label }: { seqId: number; label?: string | null }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}${import.meta.env.BASE_URL}annotate/${seqId}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const tweetText = label
    ? `Analyzing peptide sequence on @Peptoma_xyz — ${label} detected. Check the data and annotate to earn $PEPTM:`
    : `Check out this peptide analysis on @Peptoma_xyz. Annotate to earn $PEPTM:`;
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(url)}`;

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={copyLink}
        className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground hover:text-foreground border border-border hover:border-[hsl(var(--peptoma-cyan))/40] rounded-lg px-2.5 py-1.5 transition-all"
      >
        {copied ? <Check className="w-3 h-3 text-[hsl(var(--peptoma-cyan))]" /> : <Copy className="w-3 h-3" />}
        {copied ? "Copied!" : "Copy link"}
      </button>
      <a
        href={tweetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-[10px] font-mono text-sky-400 border border-sky-400/20 hover:border-sky-400/50 bg-sky-400/5 hover:bg-sky-400/10 rounded-lg px-2.5 py-1.5 transition-all"
      >
        <Twitter className="w-3 h-3" />
        Share
      </a>
    </div>
  );
}

type AlphaFoldResult =
  | { found: false; novel?: boolean }
  | { found: true; hasStructure: false; accession: string; proteinName: string | null; organism: string | null; length: number | null; uniprotUrl: string }
  | { found: true; hasStructure: true; accession: string; proteinName: string | null; organism: string | null; length: number | null; meanPlddt: number | null; pdbUrl: string | null; modelCreatedDate: string | null; alphafoldPageUrl: string; uniprotUrl: string };

declare global {
  interface Window { $3Dmol?: Record<string, unknown> & { createViewer: (el: HTMLElement, opts: Record<string, unknown>) => Record<string, (...args: unknown[]) => unknown> }; }
}

function StructureViewer3D({ pdbData, label, source }: { pdbData: string; label: string; source: "alphafold" | "esmfold" }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<ReturnType<NonNullable<Window["$3Dmol"]>["createViewer"]> | null>(null);

  useEffect(() => {
    if (!containerRef.current || !pdbData) return;

    const init = () => {
      if (!window.$3Dmol || !containerRef.current) return;
      if (viewerRef.current) return;
      const viewer = window.$3Dmol.createViewer(containerRef.current, {
        backgroundColor: "0x0a0a0a",
        antialias: true,
        id: `viewer-${Math.random()}`,
      });
      viewerRef.current = viewer;
      viewer.addModel(pdbData, "pdb");
      if (source === "esmfold") {
        viewer.setStyle({}, { cartoon: { colorscheme: { prop: "b", gradient: "rwb", min: 50, max: 90 } } });
      } else {
        viewer.setStyle({}, { cartoon: { colorscheme: "ssJmol" } });
      }
      viewer.zoomTo();
      viewer.render();
      viewer.zoom(0.85, 800);
    };

    if (window.$3Dmol) {
      init();
    } else {
      const existing = document.getElementById("3dmol-script");
      if (existing) {
        existing.addEventListener("load", init);
      } else {
        const script = document.createElement("script");
        script.id = "3dmol-script";
        script.src = "https://3dmol.csb.pitt.edu/build/3Dmol-min.js";
        script.onload = init;
        document.head.appendChild(script);
      }
    }
    return () => { viewerRef.current = null; };
  }, [pdbData, source]);

  return (
    <div className="space-y-1.5">
      <div className="relative w-full rounded-xl overflow-hidden border border-[hsl(var(--peptoma-cyan))/20] bg-[#050505]" style={{ height: 260 }}>
        <div ref={containerRef} className="w-full h-full" />
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5">
          <div className={cn("w-1.5 h-1.5 rounded-full", source === "esmfold" ? "bg-[hsl(var(--peptoma-gold))]" : "bg-[hsl(var(--peptoma-cyan))]")} />
          <span className="text-[8px] font-mono text-white/70 uppercase tracking-widest">{source === "esmfold" ? "ESMFold v1" : "AlphaFold DB"}</span>
        </div>
        <div className="absolute bottom-2 right-2 text-[8px] font-mono text-white/30">drag to rotate · scroll to zoom</div>
      </div>
      {source === "esmfold" && (
        <div className="flex items-start gap-1.5 px-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--peptoma-gold))] shrink-0 mt-0.5" />
          <p className="text-[9px] font-mono text-muted-foreground/60 leading-relaxed">
            Color = ESMFold pLDDT confidence: <span className="text-blue-400">blue = high</span> · <span className="text-red-400">red = low</span>. Novel sequence — no UniProt reference.
          </p>
        </div>
      )}
      <p className="text-[8px] font-mono text-muted-foreground/40 text-center">{label}</p>
    </div>
  );
}

function plddtColor(score: number) {
  if (score >= 90) return { bar: "bg-[hsl(var(--peptoma-green))]", text: "text-[hsl(var(--peptoma-green))]", label: "Very high" };
  if (score >= 70) return { bar: "bg-[hsl(var(--peptoma-cyan))]", text: "text-[hsl(var(--peptoma-cyan))]", label: "High" };
  if (score >= 50) return { bar: "bg-[hsl(var(--peptoma-gold))]", text: "text-[hsl(var(--peptoma-gold))]", label: "Low" };
  return { bar: "bg-[hsl(var(--peptoma-red))]", text: "text-[hsl(var(--peptoma-red))]", label: "Very low" };
}

// ── Citation & Fork Panel ─────────────────────────────────────────────────────

function CitationPanel({
  seqId,
  userId,
  seq,
}: {
  seqId: number;
  userId: string;
  seq: { forkedFromId?: number; citedSequenceIds?: number[] };
}) {
  const queryClient = useQueryClient();
  const [forking, setForking] = useState(false);
  const [forkDone, setForkDone] = useState(false);

  const { data: forks = [] } = useGetSequenceForks(seqId, {
    query: { queryKey: getGetSequenceForksQueryKey(seqId) },
  });
  const { data: citations = [] } = useGetSequenceCitations(seqId, {
    query: { queryKey: getGetSequenceCitationsQueryKey(seqId) },
  });

  const forkMut = useForkSequence({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSequenceForksQueryKey(seqId) });
        setForkDone(true);
        setForking(false);
        setTimeout(() => setForkDone(false), 3000);
      },
      onSettled: () => setForking(false),
    },
  });

  const hasCitedIds = (seq.citedSequenceIds?.length ?? 0) > 0;
  const hasForkedFrom = !!seq.forkedFromId;

  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="w-3.5 h-3.5 text-[hsl(var(--peptoma-cyan))]" />
          <p className="text-xs font-mono text-[hsl(var(--peptoma-cyan))] tracking-widest uppercase">Citation Graph</p>
        </div>
        <button
          disabled={forking || forkDone || !userId}
          onClick={() => {
            setForking(true);
            forkMut.mutate({ id: seqId, data: { userId } });
          }}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-[10px] border transition-all",
            forkDone
              ? "text-[hsl(var(--peptoma-green))] border-[hsl(var(--peptoma-green))/30] bg-[hsl(var(--peptoma-green))/8]"
              : "text-[hsl(var(--peptoma-cyan))] border-[hsl(var(--peptoma-cyan))/30] hover:bg-[hsl(var(--peptoma-cyan))/8] disabled:opacity-40"
          )}
        >
          {forkDone ? <Check className="w-2.5 h-2.5" /> : <GitFork className="w-2.5 h-2.5" />}
          {forkDone ? "Forked!" : forking ? "Forking…" : "Fork"}
        </button>
      </div>

      {/* Provenance */}
      {hasForkedFrom && (
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
          <GitFork className="w-2.5 h-2.5 shrink-0" />
          Forked from{" "}
          <Link href={`/annotate/${seq.forkedFromId}`} className="text-[hsl(var(--peptoma-cyan))] hover:underline">
            #{seq.forkedFromId}
          </Link>
        </div>
      )}
      {hasCitedIds && (
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground flex-wrap">
          <Quote className="w-2.5 h-2.5 shrink-0" />
          Cites:{" "}
          {seq.citedSequenceIds!.map((cid, i) => (
            <span key={cid}>
              <Link href={`/annotate/${cid}`} className="text-[hsl(var(--peptoma-gold))] hover:underline">#{cid}</Link>
              {i < seq.citedSequenceIds!.length - 1 ? ", " : ""}
            </span>
          ))}
        </div>
      )}

      {/* Counters */}
      <div className="flex gap-4">
        <div className="text-center">
          <p className="text-base font-mono font-bold text-foreground">{(forks as unknown[]).length}</p>
          <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">Forks</p>
        </div>
        <div className="text-center">
          <p className="text-base font-mono font-bold text-foreground">{(citations as unknown[]).length}</p>
          <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">Cited by</p>
        </div>
      </div>

      {/* Fork list */}
      {(forks as unknown[]).length > 0 && (
        <div className="space-y-1 pt-1 border-t border-border/40">
          <p className="text-[9px] font-mono text-muted-foreground tracking-widest uppercase">Forks</p>
          {(forks as Array<{ id: number; userId: string }>).slice(0, 3).map(f => (
            <Link key={f.id} href={`/annotate/${f.id}`} className="flex items-center gap-1.5 text-[10px] font-mono text-foreground hover:text-[hsl(var(--peptoma-cyan))] transition-colors">
              <GitFork className="w-2.5 h-2.5 shrink-0" /> #{f.id} · {f.userId.slice(0, 8)}…
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function AlphaFoldPanel({ seqId }: { seqId: number }) {
  const BASE = import.meta.env.BASE_URL;
  const [pdbData, setPdbData] = useState<string | null>(null);
  const [pdbSource, setPdbSource] = useState<"alphafold" | "esmfold">("esmfold");
  const [pdbLabel, setPdbLabel] = useState("");
  const [esmLoading, setEsmLoading] = useState(false);
  const [esmError, setEsmError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery<AlphaFoldResult>({
    queryKey: ["alphafold", seqId],
    queryFn: async () => {
      const r = await fetch(`${BASE}api/sequences/${seqId}/alphafold`);
      if (!r.ok) throw new Error("lookup failed");
      return r.json() as Promise<AlphaFoldResult>;
    },
    staleTime: 1000 * 60 * 60,
  });

  const loadAlphaFoldPdb = async (pdbUrl: string, label: string) => {
    setEsmLoading(true);
    setEsmError(null);
    try {
      const r = await fetch(pdbUrl);
      if (!r.ok) throw new Error("Failed to fetch PDB");
      const text = await r.text();
      setPdbData(text);
      setPdbSource("alphafold");
      setPdbLabel(label);
    } catch {
      setEsmError("Could not load AlphaFold PDB file.");
    } finally {
      setEsmLoading(false);
    }
  };

  const loadEsmFold = async () => {
    setEsmLoading(true);
    setEsmError(null);
    setPdbData(null);
    try {
      const r = await fetch(`${BASE}api/sequences/${seqId}/esmfold`);
      if (!r.ok) {
        const e = await r.json() as { error?: string };
        throw new Error(e.error ?? "ESMFold failed");
      }
      const text = await r.text();
      setPdbData(text);
      setPdbSource("esmfold");
      setPdbLabel(`ESMFold prediction · Seq #${seqId}`);
    } catch (e) {
      setEsmError(e instanceof Error ? e.message : "ESMFold prediction failed");
    } finally {
      setEsmLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dna className="w-3.5 h-3.5 text-[hsl(var(--peptoma-cyan))]" />
          <p className="text-xs font-mono text-[hsl(var(--peptoma-cyan))] tracking-widest uppercase">Structure Prediction</p>
        </div>
        <a
          href="https://alphafold.ebi.ac.uk"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[9px] font-mono text-muted-foreground/50 hover:text-muted-foreground flex items-center gap-1 transition-colors"
        >
          EBI <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground py-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          Querying UniProt + AlphaFold DB…
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground/60 py-1">
          <HelpCircle className="w-3.5 h-3.5 shrink-0" />
          Could not reach AlphaFold DB
        </div>
      )}

      {data && !data.found && (
        <div className="space-y-3">
          <p className="text-xs font-mono text-muted-foreground">No UniProt match — novel or synthetic sequence. Predict structure with ESMFold (Meta AI).</p>
          <button
            onClick={loadEsmFold}
            disabled={esmLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[hsl(var(--peptoma-gold))/10] border border-[hsl(var(--peptoma-gold))/30] rounded-lg font-mono text-[10px] text-[hsl(var(--peptoma-gold))] hover:bg-[hsl(var(--peptoma-gold))/20] disabled:opacity-60 transition-all"
          >
            {esmLoading ? <><Loader2 className="w-3 h-3 animate-spin" /> Predicting… (30–60s)</> : <><Dna className="w-3 h-3" /> Predict 3D Structure · ESMFold</>}
          </button>
        </div>
      )}

      {data && data.found && (
        <div className="space-y-3">
          {data.proteinName && (
            <div>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Protein</p>
              <p className="text-xs font-mono text-foreground leading-snug mt-0.5">{data.proteinName}</p>
            </div>
          )}
          {data.organism && (
            <div>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Organism</p>
              <p className="text-xs font-mono text-foreground italic">{data.organism}</p>
            </div>
          )}

          {data.hasStructure && data.meanPlddt != null && (() => {
            const c = plddtColor(data.meanPlddt);
            return (
              <div>
                <div className="flex items-center justify-between text-xs font-mono mb-1">
                  <span className="text-muted-foreground uppercase tracking-widest text-[10px]">pLDDT Confidence</span>
                  <span className={cn("font-bold", c.text)}>{data.meanPlddt.toFixed(1)} · {c.label}</span>
                </div>
                <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                  <motion.div
                    className={cn("h-full rounded-full", c.bar)}
                    initial={{ width: 0 }}
                    animate={{ width: `${data.meanPlddt}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
                <p className="text-[9px] font-mono text-muted-foreground/50 mt-1">
                  pLDDT is AlphaFold's per-residue confidence score (0–100). &gt;90 = very high, 70–90 = high.
                </p>
              </div>
            );
          })()}

          {!data.hasStructure && (
            <p className="text-xs font-mono text-muted-foreground/70">UniProt match found but no AlphaFold structure model available.</p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {data.uniprotUrl && (
              <a
                href={data.uniprotUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-foreground border border-border hover:border-[hsl(var(--peptoma-cyan))/30] rounded px-2 py-1 transition-all"
              >
                UniProt · {data.accession} <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
            {data.hasStructure && data.pdbUrl && (
              <button
                onClick={() => loadAlphaFoldPdb(
                  (data as Extract<AlphaFoldResult, { hasStructure: true }>).pdbUrl!,
                  `AlphaFold · ${(data as Extract<AlphaFoldResult, { hasStructure: true }>).accession}`
                )}
                disabled={esmLoading}
                className="flex items-center gap-1 text-[10px] font-mono text-[hsl(var(--peptoma-cyan))/80] hover:text-[hsl(var(--peptoma-cyan))] border border-[hsl(var(--peptoma-cyan))/20] hover:border-[hsl(var(--peptoma-cyan))/40] rounded px-2 py-1 transition-all disabled:opacity-60"
              >
                {esmLoading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Dna className="w-2.5 h-2.5" />}
                View 3D Structure
              </button>
            )}
            {(!data.hasStructure || !data.pdbUrl) && (
              <button
                onClick={loadEsmFold}
                disabled={esmLoading}
                className="flex items-center gap-1 text-[10px] font-mono text-[hsl(var(--peptoma-gold))/70] hover:text-[hsl(var(--peptoma-gold))] border border-[hsl(var(--peptoma-gold))/20] hover:border-[hsl(var(--peptoma-gold))/40] rounded px-2 py-1 transition-all disabled:opacity-60"
              >
                {esmLoading ? <><Loader2 className="w-2.5 h-2.5 animate-spin" /> Predicting…</> : <><Dna className="w-2.5 h-2.5" /> Predict · ESMFold</>}
              </button>
            )}
          </div>
        </div>
      )}

      {esmError && (
        <div className="flex items-center gap-2 text-[10px] font-mono text-[hsl(var(--peptoma-red))/70] bg-[hsl(var(--peptoma-red))/5] border border-[hsl(var(--peptoma-red))/20] rounded-lg px-3 py-2">
          <AlertTriangle className="w-3 h-3 shrink-0" /> {esmError}
        </div>
      )}

      {pdbData && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <StructureViewer3D pdbData={pdbData} label={pdbLabel} source={pdbSource} />
        </motion.div>
      )}
    </div>
  );
}

type IPNFTMetadata = {
  name: string;
  description: string;
  external_url: string;
  attributes: { trait_type: string; value: string | number; display_type?: string }[];
  ip_metadata: {
    title: string;
    sequence: string;
    therapeutic_area: string;
    bioactivity_score: number;
    confidence_score: number;
    ipfs_provenance: string | null;
    community_peer_review: { total_annotations: number; confirms: number; challenges: number; extensions: number; tags: number };
    license: string;
    inventors: string[];
    on_chain: { mint_address: string; tx_signature: string; minted_at: string } | null;
  };
};

type NftRecord = {
  id: number;
  sequenceId: number;
  walletAddress: string;
  mintAddress: string;
  txSignature: string;
  metadataUri: string | null;
  status: string;
  mintedAt: string;
  listed: boolean;
  price: number | null;
};

type IPNFTResponse = {
  metadata: IPNFTMetadata;
  sequenceId: number;
  minted: boolean;
  nft: NftRecord | null;
};


function PeptomaIPNFTModal({ seqId, onClose }: { seqId: number; onClose: () => void }) {
  const BASE = import.meta.env.BASE_URL;
  const { userId, connected, connect, address } = useWallet();
  const [tab, setTab] = useState<"overview" | "metadata" | "onchain">("overview");
  const [mintStatus, setMintStatus] = useState<"idle" | "minting" | "success" | "error">("idle");
  const [mintStep, setMintStep] = useState("");
  const [mintError, setMintError] = useState("");
  const [listPrice, setListPrice] = useState("");
  const [listStatus, setListStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery<IPNFTResponse>({
    queryKey: ["ipnft-metadata", seqId],
    queryFn: async () => {
      const r = await fetch(`${BASE}api/ipnft/${seqId}`);
      if (!r.ok) throw new Error("Failed to generate metadata");
      return r.json() as Promise<IPNFTResponse>;
    },
    staleTime: 1000 * 60 * 2,
  });

  const isMinted = data?.minted ?? false;
  const nft = data?.nft ?? null;

  const handleMint = async () => {
    const priceNum = parseFloat(listPrice);
    if (!listPrice || isNaN(priceNum) || priceNum <= 0) {
      setMintError("Enter a listing price in SOL to continue");
      return;
    }
    if (!connected || !address) {
      connect();
      return;
    }

    setMintStatus("minting");
    setMintStep("Minting via PEPTOMA treasury…");
    setMintError("");

    try {
      const res = await fetch(`${BASE}api/ipnft/mint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sequenceId: seqId, walletAddress: address, price: priceNum }),
      });
      const d = await res.json() as { nft?: NftRecord; error?: string };
      if (!res.ok && res.status !== 409) throw new Error(d.error ?? "Mint failed");

      setMintStep("Done!");
      setMintStatus("success");
      queryClient.invalidateQueries({ queryKey: ["ipnft-metadata", seqId] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMintStatus("error");
      setMintStep("");
      setMintError(msg);
    }
  };

  const handleToggleListing = async () => {
    if (!nft) return;
    setListStatus("loading");
    try {
      if (nft.listed) {
        await fetch(`${BASE}api/ipnft/${nft.id}/unlist`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress: userId }),
        });
      } else {
        const priceNum = parseFloat(listPrice);
        if (!listPrice || isNaN(priceNum) || priceNum <= 0) {
          setListStatus("error");
          return;
        }
        await fetch(`${BASE}api/ipnft/${nft.id}/list`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ price: priceNum, walletAddress: userId }),
        });
      }
      setListStatus("success");
      queryClient.invalidateQueries({ queryKey: ["ipnft-metadata", seqId] });
    } catch {
      setListStatus("error");
    }
  };

  const handleDownload = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data.metadata, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `peptoma-ipnft-seq-${seqId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[hsl(var(--peptoma-gold))]" />
            <h2 className="text-sm font-mono font-bold tracking-widest uppercase text-foreground">PEPTOMA IP-NFT</h2>
            {isMinted ? (
              <span className="flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-[hsl(var(--peptoma-green))/10] border border-[hsl(var(--peptoma-green))/30] text-[hsl(var(--peptoma-green))]">
                <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--peptoma-green))]" />
                MINTED
              </span>
            ) : (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[hsl(var(--peptoma-gold))/10] border border-[hsl(var(--peptoma-gold))/20] text-[hsl(var(--peptoma-gold))]">
                REGISTRY
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs font-mono text-muted-foreground leading-relaxed">
          Register this peptide discovery as a native PEPTOMA IP-NFT — tokenising the research dataset with on-chain intellectual property rights, community ownership, and immutable provenance.
        </p>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted/20 rounded-lg border border-border">
          {(["overview", "metadata", "onchain"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn("flex-1 py-1.5 font-mono text-[10px] uppercase tracking-widest rounded-md transition-all",
                tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "overview" ? "IP Overview" : t === "metadata" ? "Metadata" : "On-Chain"}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs font-mono">Loading IP-NFT registry…</span>
          </div>
        )}

        {isError && (
          <div className="py-6 text-center">
            <p className="text-xs font-mono text-[hsl(var(--peptoma-red))]">Failed to load registry. Try again.</p>
          </div>
        )}

        {data && tab === "overview" && (
          <div className="space-y-3">
            {/* NFT Artwork */}
            <div className="relative rounded-xl overflow-hidden border border-[hsl(var(--peptoma-gold))/30] bg-[#060b14]">
              <img
                src={`${BASE}api/ipnft/${seqId}/image.svg?t=${isMinted ? "1" : "0"}`}
                alt="PEPTOMA IP-NFT Artwork"
                className="w-full block"
                style={{ imageRendering: "crisp-edges" }}
              />
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full border border-white/10">
                <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--peptoma-gold))] animate-pulse" />
                <span className="text-[9px] font-mono text-white/70">PEPTOMA Registry</span>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: "Bioactivity", value: `${data.metadata.ip_metadata.bioactivity_score}`, unit: "/100", color: "text-[hsl(var(--peptoma-gold))]" },
                { label: "Confidence", value: `${data.metadata.ip_metadata.confidence_score}`, unit: "/100", color: "text-[hsl(var(--peptoma-cyan))]" },
                { label: "Annotations", value: String(data.metadata.ip_metadata.community_peer_review.total_annotations), unit: "", color: "text-foreground" },
                { label: "Contributors", value: String(data.metadata.ip_metadata.inventors.length), unit: "", color: "text-foreground" },
              ].map(({ label, value, unit, color }) => (
                <div key={label} className="p-2 bg-muted/20 rounded-lg border border-border text-center">
                  <p className={cn("text-sm font-mono font-bold", color)}>{value}<span className="text-[9px] text-muted-foreground">{unit}</span></p>
                  <p className="text-[8px] font-mono text-muted-foreground uppercase tracking-widest mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Peer review breakdown */}
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: "Confirms", value: data.metadata.ip_metadata.community_peer_review.confirms, color: "text-[hsl(var(--peptoma-green))]" },
                { label: "Challenges", value: data.metadata.ip_metadata.community_peer_review.challenges, color: "text-[hsl(var(--peptoma-red))]" },
                { label: "Extensions", value: data.metadata.ip_metadata.community_peer_review.extensions, color: "text-[hsl(var(--peptoma-cyan))]" },
                { label: "Tags", value: data.metadata.ip_metadata.community_peer_review.tags, color: "text-[hsl(var(--peptoma-gold))]" },
              ].map(({ label, value, color }) => (
                <div key={label} className="p-2 bg-muted/10 rounded-lg border border-border/40 text-center">
                  <p className={cn("text-sm font-mono font-bold", color)}>{value}</p>
                  <p className="text-[8px] font-mono text-muted-foreground uppercase tracking-widest mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* License + IPFS + Registry */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/10 border border-border">
                <span className="text-[9px] font-mono text-muted-foreground">License</span>
                <span className="text-[9px] font-mono text-foreground">CC BY 4.0</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/10 border border-border">
                <span className="text-[9px] font-mono text-muted-foreground">Registry</span>
                <span className="text-[9px] font-mono text-[hsl(var(--peptoma-gold))]">PEPTOMA Native · RRID:SCR_028424</span>
              </div>
              {data.metadata.ip_metadata.ipfs_provenance && (
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[hsl(var(--peptoma-green))/5] border border-[hsl(var(--peptoma-green))/20]">
                  <CheckCircle className="w-3 h-3 text-[hsl(var(--peptoma-green))] shrink-0" />
                  <span className="text-[9px] font-mono text-[hsl(var(--peptoma-green))]">IPFS provenance verified — immutable fingerprint</span>
                </div>
              )}
              {isMinted && nft && (
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[hsl(var(--peptoma-gold))/5] border border-[hsl(var(--peptoma-gold))/20]">
                  <CheckCircle className="w-3 h-3 text-[hsl(var(--peptoma-gold))] shrink-0" />
                  <span className="text-[9px] font-mono text-[hsl(var(--peptoma-gold))]">
                    On-chain · Minted {new Date(nft.mintedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {data && tab === "metadata" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">NFT Metadata JSON</span>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground hover:text-foreground border border-border hover:border-[hsl(var(--peptoma-gold))/30] rounded px-2 py-1 transition-all"
              >
                <Download className="w-2.5 h-2.5" /> Download
              </button>
            </div>
            <pre className="text-[9px] font-mono text-muted-foreground bg-muted/20 rounded-xl p-3 overflow-auto max-h-64 leading-relaxed whitespace-pre-wrap break-words border border-border">
              {JSON.stringify(data.metadata, null, 2)}
            </pre>
          </div>
        )}

        {data && tab === "onchain" && (
          <div className="space-y-3">
            {isMinted && nft ? (
              <>
                <div className="rounded-xl border border-[hsl(var(--peptoma-green))/30] bg-[hsl(var(--peptoma-green))/5] p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[hsl(var(--peptoma-green))]" />
                    <span className="text-xs font-mono font-bold text-[hsl(var(--peptoma-green))] uppercase tracking-widest">Registered On-Chain</span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-0.5">Mint Address</p>
                      <a
                        href={`https://solscan.io/token/${nft.mintAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-mono text-[hsl(var(--peptoma-cyan))] break-all leading-snug hover:underline"
                      >{nft.mintAddress}</a>
                    </div>
                    <div>
                      <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-0.5">TX Signature</p>
                      <a
                        href={`https://solscan.io/tx/${nft.txSignature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-mono text-[hsl(var(--peptoma-green))] break-all leading-snug hover:underline"
                      >{nft.txSignature}</a>
                    </div>
                    <div>
                      <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-0.5">Wallet</p>
                      <a
                        href={`https://solscan.io/account/${nft.walletAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-mono text-muted-foreground break-all leading-snug hover:text-foreground hover:underline"
                      >{nft.walletAddress}</a>
                    </div>
                    <div>
                      <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-0.5">Minted At</p>
                      <p className="text-[10px] font-mono text-foreground break-all leading-snug">{new Date(nft.mintedAt).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-0.5">Metadata URI</p>
                      {nft.metadataUri && nft.metadataUri !== "—" ? (
                        <a
                          href={nft.metadataUri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-mono text-[hsl(var(--peptoma-gold))] break-all leading-snug hover:underline"
                        >{nft.metadataUri}</a>
                      ) : (
                        <p className="text-[10px] font-mono text-foreground">—</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-muted/10 p-3 space-y-1.5">
                  <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">Peer Review Score</p>
                  <div className="flex gap-4 text-xs font-mono">
                    <span className="text-[hsl(var(--peptoma-green))]">{data.metadata.ip_metadata.community_peer_review.confirms} confirms</span>
                    <span className="text-[hsl(var(--peptoma-red))]">{data.metadata.ip_metadata.community_peer_review.challenges} challenges</span>
                    <span className="text-[hsl(var(--peptoma-cyan))]">{data.metadata.ip_metadata.community_peer_review.extensions} extensions</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-border bg-muted/10 p-5 text-center space-y-3">
                <Activity className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                <p className="text-xs font-mono text-muted-foreground">This IP-NFT has not been minted yet.</p>
                <p className="text-[10px] font-mono text-muted-foreground/60 leading-relaxed">
                  Minting registers this peptide discovery permanently on the PEPTOMA protocol registry — creating an immutable on-chain record of the research dataset.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Mint / action footer */}
        {data && (
          <div className="pt-1 border-t border-border space-y-3">

            {!isMinted ? (
              <>
                {/* Price input — required before mint */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
                    Listing Price <span className="text-[hsl(var(--peptoma-gold))]">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min={0.001}
                        step={0.01}
                        value={listPrice}
                        onChange={e => { setListPrice(e.target.value); setMintError(""); }}
                        placeholder="e.g. 1.5"
                        disabled={mintStatus === "minting"}
                        className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[hsl(var(--peptoma-gold))/60] transition-colors pr-14 disabled:opacity-50"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground">SOL</span>
                    </div>
                  </div>
                  <p className="text-[9px] font-mono text-muted-foreground/60">Set your asking price in SOL — buyers pay this on Solana to acquire full IP rights.</p>
                </div>

                {/* Minting step progress */}
                {mintStatus === "minting" && mintStep && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[hsl(var(--peptoma-gold))/5] border border-[hsl(var(--peptoma-gold))/20]">
                    <Loader2 className="w-3 h-3 animate-spin text-[hsl(var(--peptoma-gold))] shrink-0" />
                    <span className="text-[10px] font-mono text-[hsl(var(--peptoma-gold))]">{mintStep}</span>
                  </div>
                )}

                {mintError && (
                  <p className="text-[9px] font-mono text-[hsl(var(--peptoma-red))] bg-[hsl(var(--peptoma-red))/8] border border-[hsl(var(--peptoma-red))/20] rounded-lg px-3 py-2">{mintError}</p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleDownload}
                    disabled={mintStatus === "minting"}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 border border-border rounded-lg font-mono text-xs text-muted-foreground hover:text-foreground hover:border-[hsl(var(--peptoma-gold))/40] transition-all disabled:opacity-40"
                  >
                    <Download className="w-3 h-3" />
                  </button>
                  <button
                    onClick={handleMint}
                    disabled={mintStatus === "minting"}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[hsl(var(--peptoma-gold))] text-black font-mono font-bold text-xs rounded-lg hover:bg-[hsl(var(--peptoma-gold))/90] disabled:opacity-60 transition-colors"
                  >
                    {mintStatus === "minting" ? (
                      <><Loader2 className="w-3 h-3 animate-spin" /> Minting on Solana…</>
                    ) : !connected ? (
                      <><Activity className="w-3 h-3" /> Connect Wallet &amp; Mint</>
                    ) : (
                      <><BookOpen className="w-3 h-3" /> Mint &amp; List IP-NFT</>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Post-mint: listing management */}
                <div className="rounded-xl border border-[hsl(var(--peptoma-green))/30] bg-[hsl(var(--peptoma-green))/5] p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-[hsl(var(--peptoma-green))]" />
                      <span className="font-mono text-xs text-[hsl(var(--peptoma-green))] font-bold">IP-NFT Minted</span>
                    </div>
                    {nft?.listed ? (
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[hsl(var(--peptoma-cyan))/10] border border-[hsl(var(--peptoma-cyan))/30] text-[hsl(var(--peptoma-cyan))]">
                        LISTED · {nft.price} SOL
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-muted/30 border border-border text-muted-foreground">
                        NOT LISTED
                      </span>
                    )}
                  </div>
                  {!nft?.listed && (
                    <div className="flex items-center gap-2 pt-1">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          min={0.001}
                          step={0.01}
                          value={listPrice}
                          onChange={e => setListPrice(e.target.value)}
                          placeholder="Price in SOL"
                          className="w-full bg-muted/20 border border-border rounded-lg px-3 py-1.5 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[hsl(var(--peptoma-cyan))/60] transition-colors pr-14"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground">SOL</span>
                      </div>
                      <button
                        onClick={handleToggleListing}
                        disabled={listStatus === "loading"}
                        className="px-3 py-1.5 bg-[hsl(var(--peptoma-cyan))] text-black font-mono font-bold text-[10px] rounded-lg disabled:opacity-60 transition-colors whitespace-nowrap"
                      >
                        {listStatus === "loading" ? <Loader2 className="w-3 h-3 animate-spin" /> : "List for Sale"}
                      </button>
                    </div>
                  )}
                  {nft?.listed && (
                    <button
                      onClick={handleToggleListing}
                      disabled={listStatus === "loading"}
                      className="w-full py-1.5 border border-[hsl(var(--peptoma-red))/40] text-[hsl(var(--peptoma-red))] font-mono text-[10px] rounded-lg hover:bg-[hsl(var(--peptoma-red))/5] disabled:opacity-60 transition-colors"
                    >
                      {listStatus === "loading" ? <Loader2 className="w-3 h-3 animate-spin inline" /> : "Remove from Marketplace"}
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleDownload}
                    className="flex items-center justify-center gap-2 py-2 px-4 border border-border rounded-lg font-mono text-xs text-muted-foreground hover:text-foreground hover:border-[hsl(var(--peptoma-gold))/40] transition-all"
                  >
                    <Download className="w-3 h-3" />
                  </button>
                  <a
                    href={`${BASE}marketplace`}
                    className="flex-1 flex items-center justify-center gap-2 py-2 border border-border rounded-lg font-mono text-xs text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-all"
                  >
                    View on Marketplace →
                  </a>
                </div>
              </>
            )}
          </div>
        )}

        {mintStatus === "error" && (
          <p className="text-[10px] font-mono text-[hsl(var(--peptoma-red))]">{mintError}</p>
        )}
      </motion.div>
    </div>
  );
}

function BenchlingExportModal({ seqId, onClose }: { seqId: number; onClose: () => void }) {
  const BASE = import.meta.env.BASE_URL;
  const [tenant, setTenant] = useState(() => localStorage.getItem("benchling_tenant") ?? "");
  const [apiKey, setApiKey] = useState("");
  const [folderId, setFolderId] = useState(() => localStorage.getItem("benchling_folder") ?? "");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<{ entryName: string; webURL: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const loadPreview = async () => {
    const r = await fetch(`${BASE}api/benchling/preview/${seqId}`);
    const d = await r.json() as { markdown: string };
    setPreview(d.markdown);
    setShowPreview(true);
  };

  const handleExport = async () => {
    if (!tenant.trim() || !apiKey.trim()) return;
    setStatus("loading");
    setErrorMsg("");
    localStorage.setItem("benchling_tenant", tenant.trim());
    if (folderId.trim()) localStorage.setItem("benchling_folder", folderId.trim());

    try {
      const r = await fetch(`${BASE}api/benchling/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sequenceId: seqId,
          benchlingTenant: tenant.trim(),
          benchlingApiKey: apiKey.trim(),
          folderId: folderId.trim() || undefined,
        }),
      });
      const d = await r.json() as { success?: boolean; entryName?: string; webURL?: string; error?: string; detail?: string };
      if (!r.ok || !d.success) {
        setStatus("error");
        setErrorMsg(d.detail ?? d.error ?? "Export failed");
        return;
      }
      setResult({ entryName: d.entryName!, webURL: d.webURL! });
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMsg("Network error — check your tenant URL and API key");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg space-y-5 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskRound className="w-4 h-4 text-[hsl(var(--peptoma-cyan))]" />
            <h2 className="text-sm font-mono font-bold tracking-widest uppercase text-foreground">Export to Benchling</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs font-mono text-muted-foreground leading-relaxed">
          Export this analysis as a structured ELN entry directly into your Benchling project. Includes sequence, AI scores, biochemistry, community annotations, and IPFS provenance.
        </p>

        {status !== "success" ? (
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1 block">
                Benchling Tenant <span className="text-[hsl(var(--peptoma-red))]">*</span>
              </label>
              <div className="flex items-center gap-0 border border-border rounded-lg overflow-hidden focus-within:border-[hsl(var(--peptoma-cyan))/40] transition-colors">
                <span className="text-[10px] font-mono text-muted-foreground bg-muted/30 px-2.5 py-2.5 shrink-0 border-r border-border">https://</span>
                <input
                  type="text"
                  value={tenant}
                  onChange={e => setTenant(e.target.value)}
                  placeholder="yourlab"
                  className="flex-1 px-3 py-2.5 bg-transparent font-mono text-xs text-foreground placeholder-muted-foreground/50 focus:outline-none"
                />
                <span className="text-[10px] font-mono text-muted-foreground bg-muted/30 px-2.5 py-2.5 shrink-0 border-l border-border">.benchling.com</span>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1 block">
                API Key <span className="text-[hsl(var(--peptoma-red))]">*</span>
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-••••••••••••••••••••"
                className="w-full px-3 py-2.5 bg-transparent border border-border rounded-lg font-mono text-xs text-foreground placeholder-muted-foreground/50 focus:outline-none focus:border-[hsl(var(--peptoma-cyan))/40] transition-colors"
              />
              <p className="text-[9px] font-mono text-muted-foreground/50 mt-1">
                Get your key at: your-tenant.benchling.com → Settings → API Keys
              </p>
            </div>

            <div>
              <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1 block">
                Folder ID <span className="text-muted-foreground/50">(optional)</span>
              </label>
              <input
                type="text"
                value={folderId}
                onChange={e => setFolderId(e.target.value)}
                placeholder="lib_xxxxxxxxxx"
                className="w-full px-3 py-2.5 bg-transparent border border-border rounded-lg font-mono text-xs text-foreground placeholder-muted-foreground/50 focus:outline-none focus:border-[hsl(var(--peptoma-cyan))/40] transition-colors"
              />
              <p className="text-[9px] font-mono text-muted-foreground/50 mt-1">
                Find in Benchling URL when inside a project folder
              </p>
            </div>

            {status === "error" && (
              <div className="p-3 bg-[hsl(var(--peptoma-red))/5] border border-[hsl(var(--peptoma-red))/20] rounded-lg">
                <p className="text-[10px] font-mono text-[hsl(var(--peptoma-red))] break-all">{errorMsg}</p>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={loadPreview}
                className="flex-1 py-2.5 border border-border rounded-lg font-mono text-xs text-muted-foreground hover:text-foreground hover:border-[hsl(var(--peptoma-cyan))/40] transition-all"
              >
                Preview ELN Entry
              </button>
              <button
                onClick={handleExport}
                disabled={status === "loading" || !tenant.trim() || !apiKey.trim()}
                className="flex-1 py-2.5 bg-[hsl(var(--peptoma-cyan))] text-black font-mono font-bold text-xs rounded-lg hover:bg-[hsl(var(--peptoma-cyan))/90] disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
              >
                {status === "loading" ? <><Loader2 className="w-3 h-3 animate-spin" /> Exporting…</> : "Export to Benchling"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-[hsl(var(--peptoma-green))/5] border border-[hsl(var(--peptoma-green))/20] rounded-lg">
              <span className="w-2 h-2 rounded-full bg-[hsl(var(--peptoma-green))] shrink-0" />
              <p className="text-xs font-mono text-[hsl(var(--peptoma-green))]">Successfully exported to Benchling ELN</p>
            </div>
            <div>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Entry Name</p>
              <p className="text-xs font-mono text-foreground">{result?.entryName}</p>
            </div>
            <a
              href={result?.webURL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 border border-[hsl(var(--peptoma-cyan))/30] text-[hsl(var(--peptoma-cyan))] font-mono text-xs rounded-lg hover:bg-[hsl(var(--peptoma-cyan))/5] transition-all"
            >
              Open in Benchling <ExternalLink className="w-3 h-3" />
            </a>
            <button onClick={onClose} className="w-full py-2.5 border border-border rounded-lg font-mono text-xs text-muted-foreground hover:text-foreground transition-colors">
              Close
            </button>
          </div>
        )}

        {showPreview && preview && (
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">ELN Entry Preview</p>
              <button onClick={() => setShowPreview(false)} className="text-[9px] font-mono text-muted-foreground hover:text-foreground">hide</button>
            </div>
            <pre className="text-[9px] font-mono text-muted-foreground bg-muted/20 rounded-lg p-3 overflow-auto max-h-48 leading-relaxed whitespace-pre-wrap break-words">{preview}</pre>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function generateGenBankFile(seq: {
  id: number; sequence: string; bioactivityScore?: number | null; bioactivityLabel?: string | null;
  confidenceScore?: number | null; structurePrediction?: string | null; toxicityRisk?: string | null;
  diseaseTarget?: string | null; molecularWeight?: number | null; createdAt?: string | null;
}) {
  const length = seq.sequence.length;
  const date = seq.createdAt ? new Date(seq.createdAt).toISOString().slice(0, 10).replace(/-/g, "-") : new Date().toISOString().slice(0, 10);
  const label = seq.bioactivityLabel ?? seq.diseaseTarget ?? "bioactive";
  const locusName = `PEPTOMA_${seq.id}`.padEnd(16);
  const seqFormatted = seq.sequence.toLowerCase().match(/.{1,10}/g)?.reduce((acc, chunk, i) => {
    if (i % 6 === 0) acc += `\n${String((i * 10) + 1).padStart(9)} `;
    else acc += " ";
    return acc + chunk;
  }, "") ?? "";

  return [
    `LOCUS       ${locusName} ${String(length).padStart(4)} aa            linear   PRT ${date}`,
    `DEFINITION  ${label} peptide. PEPTOMA AI analysis (score: ${seq.bioactivityScore ?? "N/A"}/100, confidence: ${seq.confidenceScore ?? "N/A"}/100).`,
    `ACCESSION   PEPTOMA_${seq.id}`,
    `VERSION     PEPTOMA_${seq.id}.1`,
    `KEYWORDS    peptide; DeSci; PEPTOMA; ${label}.`,
    `SOURCE      Synthetic construct`,
    `  ORGANISM  synthetic construct`,
    `            other sequences; artificial sequences.`,
    `REFERENCE   1  (residues 1 to ${length})`,
    `  AUTHORS   PEPTOMA Community`,
    `  TITLE     PEPTOMA Open DeSci Platform - AI Peptide Analysis #${seq.id}`,
    `  JOURNAL   PEPTOMA (2026) peptoma.xyz/annotate/${seq.id}`,
    `COMMENT     Deposited from PEPTOMA platform. This sequence was analyzed by the`,
    `            PEPTOMA AI Engine and peer-reviewed by the community.`,
    `            MW: ${seq.molecularWeight ?? "N/A"} Da`,
    `FEATURES             Location/Qualifiers`,
    `     Peptide         1..${length}`,
    `                     /note="bioactivity_score=${seq.bioactivityScore ?? "N/A"}"`,
    `                     /note="confidence_score=${seq.confidenceScore ?? "N/A"}"`,
    seq.structurePrediction ? `                     /note="structure_prediction=${seq.structurePrediction}"` : null,
    seq.toxicityRisk ? `                     /note="toxicity_risk=${seq.toxicityRisk}"` : null,
    seq.diseaseTarget ? `                     /note="disease_target=${seq.diseaseTarget}"` : null,
    `ORIGIN     ${seqFormatted}`,
    `//`,
  ].filter(Boolean).join("\n");
}

function generateOpentronsProtocol(seq: {
  id: number; sequence: string; bioactivityScore?: number | null; bioactivityLabel?: string | null;
  structurePrediction?: string | null; toxicityRisk?: string | null; diseaseTarget?: string | null;
  molecularWeight?: number | null;
}) {
  const label = seq.bioactivityLabel ?? seq.diseaseTarget ?? "bioactive peptide";
  const date = new Date().toISOString().slice(0, 10);
  const residues = seq.sequence.toUpperCase().split("");

  // Standard Fmoc amino acid building blocks (20 canonical AAs)
  const FMOC_BLOCKS: Record<string, string> = {
    A: "Fmoc-Ala-OH", R: "Fmoc-Arg(Pbf)-OH", N: "Fmoc-Asn(Trt)-OH",
    D: "Fmoc-Asp(OtBu)-OH", C: "Fmoc-Cys(Trt)-OH", E: "Fmoc-Glu(OtBu)-OH",
    Q: "Fmoc-Gln(Trt)-OH", G: "Fmoc-Gly-OH", H: "Fmoc-His(Trt)-OH",
    I: "Fmoc-Ile-OH", L: "Fmoc-Leu-OH", K: "Fmoc-Lys(Boc)-OH",
    M: "Fmoc-Met-OH", F: "Fmoc-Phe-OH", P: "Fmoc-Pro-OH",
    S: "Fmoc-Ser(tBu)-OH", T: "Fmoc-Thr(tBu)-OH", W: "Fmoc-Trp(Boc)-OH",
    Y: "Fmoc-Tyr(tBu)-OH", V: "Fmoc-Val-OH",
  };

  // Unique building blocks needed
  const uniqueAA = [...new Set(residues)].filter(aa => FMOC_BLOCKS[aa]);
  const reagentMap = uniqueAA.reduce((acc, aa, i) => {
    acc[aa] = { well: `A${i + 1}`, block: FMOC_BLOCKS[aa] };
    return acc;
  }, {} as Record<string, { well: string; block: string }>);

  const couplingSteps = [...residues].reverse().map((aa, i) => {
    const info = reagentMap[aa];
    if (!info) return `    # Residue ${i + 1}: ${aa} — no building block defined, skip\n    protocol.comment("Skipping ${aa} at position ${i + 1}")`;
    return `
    # === Cycle ${i + 1}/${residues.length}: Add ${aa} (${info.block}) ===
    protocol.comment("Cycle ${i + 1}: ${info.block}")

    # Deprotection — 20% piperidine in DMF (2 x 5 min)
    for deprotect_round in range(2):
        p300.transfer(200, deprotection_trough["A1"], resin_column["A1"], new_tip="never")
        protocol.delay(minutes=5, msg=f"Deprotection round {deprotect_round + 1}")
        p300.transfer(200, resin_column["A1"], waste["A1"], new_tip="never")

    # DMF wash (3x)
    for _ in range(3):
        p300.transfer(200, dmf_trough["A1"], resin_column["A1"], new_tip="never")
        protocol.delay(seconds=30)
        p300.transfer(200, resin_column["A1"], waste["A1"], new_tip="never")

    # Coupling — AA + HATU/DIPEA (45 min)
    p300.transfer(150, aa_plate["${info.well}"], resin_column["A1"], new_tip="never")
    p300.transfer(50, activator_trough["A1"], resin_column["A1"], new_tip="never")
    protocol.delay(minutes=45, msg="Coupling ${aa}")

    # DMF wash (3x) post-coupling
    for _ in range(3):
        p300.transfer(200, dmf_trough["A1"], resin_column["A1"], new_tip="never")
        protocol.delay(seconds=30)
        p300.transfer(200, resin_column["A1"], waste["A1"], new_tip="never")`;
  }).join("\n");

  return `# =============================================================
# PEPTOMA Opentrons OT-2 Fmoc SPPS Protocol
# Sequence ID  : PEPTOMA-${seq.id}
# Sequence     : ${seq.sequence}
# Length       : ${seq.sequence.length} amino acids
# Label        : ${label}
# Bioactivity  : ${seq.bioactivityScore ?? "N/A"}/100
# Structure    : ${seq.structurePrediction?.replace(/_/g, " ") ?? "N/A"}
# Toxicity     : ${seq.toxicityRisk ?? "N/A"}
# MW (est.)    : ${seq.molecularWeight ?? "N/A"} Da
# Generated    : ${date}
# Platform     : peptoma.xyz
# =============================================================
#
# REQUIRED REAGENTS (prepare before run):
# ----------------------------------------
${uniqueAA.map(aa => `# ${reagentMap[aa]?.well?.padEnd(4)} ${(FMOC_BLOCKS[aa] ?? aa).padEnd(30)} (0.2 M in DMF, 150 µL per cycle)`).join("\n")}
#
# CONSUMABLES:
# - Wang resin or Rink amide resin (pre-loaded in resin column)
# - 20% piperidine in DMF (deprotection, slot 2 trough A1)
# - DMF wash solvent (slot 3 trough A1)
# - HATU/DIPEA activator mix (slot 4 trough A1)
# - 300 µL tip rack (slot 1)
# - Waste reservoir (slot 8)
#
# NOTE: Review all volumes and timings before running on actual hardware.
# This protocol is generated from computational data — wet-lab validation required.
# =============================================================

from opentrons import protocol_api

metadata = {
    "protocolName": "PEPTOMA-${seq.id} Fmoc SPPS — ${seq.sequence}",
    "author": "PEPTOMA Platform (peptoma.xyz)",
    "description": "Automated Fmoc solid-phase peptide synthesis for PEPTOMA sequence #${seq.id} (${label}). Bioactivity score: ${seq.bioactivityScore ?? "N/A"}/100.",
    "apiLevel": "2.15",
}

requirements = {"robotType": "OT-2"}


def run(protocol: protocol_api.ProtocolContext):
    protocol.comment("PEPTOMA SPPS Protocol — Sequence: ${seq.sequence}")
    protocol.comment("Total cycles: ${seq.sequence.length} | Label: ${label}")

    # ── Labware ──────────────────────────────────────────────
    tips        = protocol.load_labware("opentrons_96_tiprack_300ul", 1)
    deprotection_trough = protocol.load_labware("nest_12_reservoir_15ml", 2)
    dmf_trough  = protocol.load_labware("nest_12_reservoir_15ml", 3)
    activator_trough = protocol.load_labware("nest_12_reservoir_15ml", 4)
    aa_plate    = protocol.load_labware("nest_96_wellplate_2ml_deep", 5)
    resin_column = protocol.load_labware("nest_96_wellplate_2ml_deep", 6)
    waste       = protocol.load_labware("nest_12_reservoir_15ml", 8)

    # ── Instrument ───────────────────────────────────────────
    p300 = protocol.load_instrument("p300_single_gen2", "left", tip_racks=[tips])
    p300.pick_up_tip()

    # ── Resin Pre-swell (DMF, 15 min) ───────────────────────
    protocol.comment("Pre-swelling resin in DMF")
    p300.transfer(200, dmf_trough["A1"], resin_column["A1"], new_tip="never")
    protocol.delay(minutes=15, msg="Resin pre-swell")
    p300.transfer(200, resin_column["A1"], waste["A1"], new_tip="never")

    # ── Coupling Cycles (C→N direction, ${seq.sequence.length} cycles) ─────────
    # Building blocks in aa_plate wells:
${uniqueAA.map(aa => `    # ${(reagentMap[aa]?.well ?? "??").padEnd(4)}: ${FMOC_BLOCKS[aa] ?? aa}`).join("\n")}
${couplingSteps}

    # ── Final Fmoc Deprotection ──────────────────────────────
    protocol.comment("Final Fmoc removal")
    for _ in range(2):
        p300.transfer(200, deprotection_trough["A1"], resin_column["A1"], new_tip="never")
        protocol.delay(minutes=5)
        p300.transfer(200, resin_column["A1"], waste["A1"], new_tip="never")
    for _ in range(3):
        p300.transfer(200, dmf_trough["A1"], resin_column["A1"], new_tip="never")
        protocol.delay(seconds=30)
        p300.transfer(200, resin_column["A1"], waste["A1"], new_tip="never")

    p300.drop_tip()
    protocol.comment("SPPS complete. Proceed to TFA cleavage and HPLC purification.")
    protocol.comment("Expected product: ${seq.sequence}")
    protocol.comment("PEPTOMA record: https://peptoma.xyz/annotate/${seq.id}")
`;
}

function generateBioRxivTemplate(seq: {
  id: number; sequence: string; bioactivityScore?: number | null; bioactivityLabel?: string | null;
  confidenceScore?: number | null; structurePrediction?: string | null; toxicityRisk?: string | null;
  diseaseTarget?: string | null; molecularWeight?: number | null; annotationSuggestions?: string[] | null;
}) {
  const label = seq.bioactivityLabel ?? seq.diseaseTarget ?? "bioactive peptide";
  const date = new Date().toISOString().slice(0, 10);
  return `# Preprint Draft — PEPTOMA Sequence #${seq.id}
Generated: ${date} | Source: peptoma.xyz/annotate/${seq.id}

---

## Title
AI-Assisted Discovery and Community Peer-Review of a Novel ${label.charAt(0).toUpperCase() + label.slice(1)} Peptide via the PEPTOMA Open DeSci Platform

## Authors
[Your Name], [Affiliation] — add co-authors from the PEPTOMA community

## Abstract
We report the computational identification and open peer-review of a ${label} peptide sequence (PEPTOMA ID: ${seq.id}) using the PEPTOMA AI Engine on the decentralized science (DeSci) platform peptoma.xyz. The sequence **${seq.sequence}** (${seq.sequence.length} amino acids, MW: ${seq.molecularWeight ?? "N/A"} Da) was analyzed for bioactivity, structural prediction, and toxicity risk. AI analysis yielded a bioactivity score of **${seq.bioactivityScore ?? "N/A"}/100** (${seq.bioactivityLabel ?? "N/A"}) with a confidence score of **${seq.confidenceScore ?? "N/A"}/100**. Predicted secondary structure: **${seq.structurePrediction?.replace("_", " ") ?? "N/A"}**. Toxicity risk classification: **${seq.toxicityRisk ?? "N/A"}**. This analysis was made publicly available under CC BY 4.0 and subjected to community peer-review via the PEPTOMA annotation system.

## Introduction
[Background on ${label} peptides and their therapeutic relevance]

## Methods
### Sequence Analysis
Peptide sequence submitted to PEPTOMA AI Engine (peptoma.xyz/lab) for computational analysis. Analysis depth: standard. Platform version: PEPTOMA v1.0.

### Sequence Details
- **Sequence:** \`${seq.sequence}\`
- **Length:** ${seq.sequence.length} amino acids
- **Molecular Weight:** ${seq.molecularWeight ?? "N/A"} Da
- **Bioactivity Score:** ${seq.bioactivityScore ?? "N/A"}/100
- **Confidence Score:** ${seq.confidenceScore ?? "N/A"}/100
- **Structure Prediction:** ${seq.structurePrediction?.replace(/_/g, " ") ?? "N/A"}
- **Toxicity Risk:** ${seq.toxicityRisk ?? "N/A"}
- **Disease Target:** ${seq.diseaseTarget ?? label}

### Community Peer-Review
Analysis was submitted to open peer-review via the PEPTOMA annotation system. Community annotations (confirm/challenge/extend/tag) were collected on-chain and stored with IPFS provenance.

## AI-Suggested Research Directions
${(seq.annotationSuggestions ?? []).map((s, i) => `${i + 1}. ${s}`).join("\n")}

## Results
[Add wet-lab validation results here, or describe computational findings]

## Discussion
[Interpret bioactivity score, structural features, potential therapeutic applications]

## Data Availability
All data for this analysis is publicly available at:
https://peptoma.xyz/annotate/${seq.id}

Raw analysis data deposited to PEPTOMA platform under CC BY 4.0.
GenBank submission pending (use the GenBank export from PEPTOMA).

## References
[Add relevant literature references here]

---
*This preprint was generated with the PEPTOMA bioRxiv Template Tool. Submit at: biorxiv.org/submit*
*Platform: peptoma.xyz | Token: $PEPTM | Chain: Solana*`;
}

export default function Annotate() {
  const { userId } = useWallet();
  const { id } = useParams<{ id: string }>();
  const seqId = Number(id);
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [activeType, setActiveType] = useState<"confirm" | "challenge" | "extend" | "tag">("confirm");
  const [showBenchling, setShowBenchling] = useState(false);
  const [showMolecule, setShowMolecule] = useState(false);
  const [genBankCopied, setGenBankCopied] = useState(false);
  const [bioRxivCopied, setBioRxivCopied] = useState(false);
  const [opentronsDownloaded, setOpentronsDownloaded] = useState(false);

  const { data: seq, isLoading: seqLoading } = useGetSequence(seqId, {
    query: { enabled: !!seqId, queryKey: ["sequence", seqId] }
  });

  const { data: annotations, isLoading: annsLoading } = useGetAnnotations(seqId, {
    query: { enabled: !!seqId, queryKey: getGetAnnotationsQueryKey(seqId) }
  });

  const { mutateAsync, isPending } = useCreateAnnotation();

  const handleSubmit = async () => {
    await mutateAsync({
      data: {
        sequenceId: seqId,
        userId,
        type: activeType,
        content: comment.trim() || undefined,
      }
    });
    setComment("");
    queryClient.invalidateQueries({ queryKey: getGetAnnotationsQueryKey(seqId) });
    queryClient.invalidateQueries({ queryKey: ["sequence", seqId] });
  };

  if (seqLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-20 bg-card/40 rounded-xl border border-border animate-pulse" />)}
      </div>
    );
  }

  if (!seq) {
    return (
      <div className="py-20 text-center space-y-4">
        <FlaskConical className="w-12 h-12 text-muted-foreground/30 mx-auto" />
        <p className="font-mono text-muted-foreground">Sequence not found</p>
        <Link href="/feed" className="text-xs font-mono text-[hsl(var(--peptoma-cyan))] hover:underline">Back to Feed</Link>
      </div>
    );
  }

  const activeConfig = ANNOTATION_TYPES.find(t => t.type === activeType);

  return (
    <div className="space-y-6 pb-16 max-w-6xl">
      {showBenchling && <BenchlingExportModal seqId={seqId} onClose={() => setShowBenchling(false)} />}
      {showMolecule && <PeptomaIPNFTModal seqId={seqId} onClose={() => setShowMolecule(false)} />}
      <div className="flex items-center justify-between gap-3">
        <Link href="/feed" className="flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Feed
        </Link>
        <ShareButton seqId={seqId} label={seq?.bioactivityLabel} />
      </div>

      <div>
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-1 tracking-widest uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--peptoma-cyan))] animate-pulse" />
          Community Annotation
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Annotate Sequence #{seqId}</h1>
        <p className="text-muted-foreground mt-1 font-mono text-sm">Confirm, challenge, extend, or tag this analysis to earn PEPTOMA Points.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
        {/* Sequence Detail */}
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card/60 p-5 space-y-4">
            <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Sequence</p>
            <p className="font-mono text-xs text-foreground break-all leading-relaxed overflow-hidden">{seq.sequence}</p>

            {(seq.bioactivityLabel || seq.depth) && (
              <div className="flex flex-wrap gap-2">
                {seq.bioactivityLabel && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded border border-[hsl(var(--peptoma-cyan))/20] bg-[hsl(var(--peptoma-cyan))/5] text-[hsl(var(--peptoma-cyan))/80] uppercase tracking-widest">
                    {seq.bioactivityLabel}
                  </span>
                )}
                {seq.depth && (
                  <span className={cn("text-xs font-mono px-2 py-0.5 rounded border uppercase tracking-widest",
                    seq.depth === "deep" ? "border-[hsl(var(--peptoma-gold))/30] text-[hsl(var(--peptoma-gold))] bg-[hsl(var(--peptoma-gold))/10]" : "border-border text-muted-foreground"
                  )}>
                    {seq.depth}
                  </span>
                )}
              </div>
            )}

            <div className="space-y-3">
              {[
                { label: "Bioactivity", value: seq.bioactivityScore, color: "bg-[hsl(var(--peptoma-cyan))]" },
                { label: "Confidence", value: seq.confidenceScore, color: "bg-[hsl(var(--peptoma-gold))]" },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-foreground">{value}</span>
                  </div>
                  <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                    <motion.div className={cn("h-full rounded-full", color)} initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.8 }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              {seq.structurePrediction && (
                <div className="col-span-2 p-2 bg-background/40 rounded border border-border">
                  <div className="text-muted-foreground">Structure</div>
                  <div className="text-[hsl(var(--peptoma-cyan))]">{StructureLabel(seq.structurePrediction)}</div>
                </div>
              )}
              {seq.molecularWeight && (
                <div className="p-2 bg-background/40 rounded border border-border">
                  <div className="text-muted-foreground">MW</div>
                  <div className="text-foreground">{seq.molecularWeight} Da</div>
                </div>
              )}
              {seq.halfLife && (
                <div className="p-2 bg-background/40 rounded border border-border">
                  <div className="text-muted-foreground">t½</div>
                  <div className="text-foreground">{seq.halfLife}</div>
                </div>
              )}
              {seq.diseaseTarget && (
                <div className="col-span-2 p-2 bg-background/40 rounded border border-[hsl(var(--peptoma-gold))/20]">
                  <div className="text-muted-foreground">Target</div>
                  <div className="text-[hsl(var(--peptoma-gold))]">{seq.diseaseTarget}</div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground pt-2 border-t border-border">
              <span><MessageSquare className="w-3.5 h-3.5 inline mr-1" />{seq.annotationCount} annotations</span>
              <span className={cn((seq.voteCount ?? 0) > 0 ? "text-[hsl(var(--peptoma-green))]" : (seq.voteCount ?? 0) < 0 ? "text-[hsl(var(--peptoma-red))]" : "text-muted-foreground")}>
                {(seq.voteCount ?? 0) > 0 ? `+${seq.voteCount}` : seq.voteCount ?? 0} consensus
              </span>
            </div>
          </div>

          {/* Annotation Suggestions from AI */}
          {seq.annotationSuggestions && seq.annotationSuggestions.length > 0 && (
            <div className="rounded-xl border border-[hsl(var(--peptoma-gold))/20] bg-[hsl(var(--peptoma-gold))/5] p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-3.5 h-3.5 text-[hsl(var(--peptoma-gold))]" />
                <p className="text-xs font-mono text-[hsl(var(--peptoma-gold))] tracking-widest uppercase">AI Suggestions</p>
              </div>
              <ul className="space-y-2">
                {seq.annotationSuggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs font-mono text-muted-foreground">
                    <span className="text-[hsl(var(--peptoma-gold))/60] mt-0.5 shrink-0">▸</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* IPFS Permanence Badge */}
          <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Archive className="w-3.5 h-3.5 text-[hsl(var(--peptoma-green))]" />
                <p className="text-xs font-mono text-[hsl(var(--peptoma-green))] tracking-widest uppercase">IPFS Permanence</p>
              </div>
              <a
                href="https://ipfs.tech"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9px] font-mono text-muted-foreground/50 hover:text-muted-foreground flex items-center gap-1 transition-colors"
              >
                ipfs.tech <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            {(seq as unknown as { ipfsCid?: string }).ipfsCid ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--peptoma-green))] shrink-0" />
                    <span className="text-[10px] font-mono text-[hsl(var(--peptoma-green))]">Pinned to IPFS</span>
                  </div>
                  <a
                    href={`https://ipfs.io/ipfs/${(seq as unknown as { ipfsCid?: string }).ipfsCid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-mono text-[hsl(var(--peptoma-green))/70] hover:text-[hsl(var(--peptoma-green))] border border-[hsl(var(--peptoma-green))/20] hover:border-[hsl(var(--peptoma-green))/50] rounded px-2 py-0.5 transition-all"
                  >
                    View <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <p className="text-[9px] font-mono text-muted-foreground/60 break-all leading-relaxed overflow-hidden">{(seq as unknown as { ipfsCid?: string }).ipfsCid}</p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground py-1">
                <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                Pinning to IPFS network…
              </div>
            )}
          </div>

          {/* Arweave Permanence */}
          <div className="rounded-xl border border-[hsl(var(--peptoma-cyan))/20] bg-[hsl(var(--peptoma-cyan))/3] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-[hsl(var(--peptoma-cyan))] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
                </svg>
                <p className="text-xs font-mono text-[hsl(var(--peptoma-cyan))] tracking-widest uppercase">Arweave Archive</p>
              </div>
              <a
                href="https://irys.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9px] font-mono text-muted-foreground/50 hover:text-muted-foreground flex items-center gap-1 transition-colors"
              >
                irys.xyz <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            {(seq as unknown as { arweaveTxId?: string }).arweaveTxId ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--peptoma-cyan))] shrink-0" />
                    <span className="text-[10px] font-mono text-[hsl(var(--peptoma-cyan))]">Permanently archived</span>
                  </div>
                  <a
                    href={`https://arweave.net/${(seq as unknown as { arweaveTxId?: string }).arweaveTxId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-mono text-[hsl(var(--peptoma-cyan))/70] hover:text-[hsl(var(--peptoma-cyan))] border border-[hsl(var(--peptoma-cyan))/20] hover:border-[hsl(var(--peptoma-cyan))/50] rounded px-2 py-0.5 transition-all"
                  >
                    View <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <p className="text-[9px] font-mono text-muted-foreground/60 break-all leading-relaxed overflow-hidden">{(seq as unknown as { arweaveTxId?: string }).arweaveTxId}</p>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <CheckCircle className="w-3 h-3 text-[hsl(var(--peptoma-cyan))] shrink-0" />
                  <span className="text-[9px] font-mono text-muted-foreground/70">Pay once · Store forever · Immutable</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground py-0.5">
                  <Loader2 className="w-3 h-3 animate-spin shrink-0 text-[hsl(var(--peptoma-cyan))/50]" />
                  <span className="text-[10px]">Archiving to Arweave network…</span>
                </div>
                <p className="text-[9px] font-mono text-muted-foreground/50 leading-relaxed">
                  Requires <span className="text-[hsl(var(--peptoma-cyan))/70]">ARWEAVE_KEY</span> env var to be set with a funded AR wallet.
                </p>
              </div>
            )}
          </div>

          {/* Citation & Fork Graph */}
          <CitationPanel seqId={seqId} userId={userId} seq={seq as unknown as { forkedFromId?: number; citedSequenceIds?: number[] }} />

          {/* AlphaFold Reference */}
          <AlphaFoldPanel seqId={seqId} />

          {/* PEPTOMA IP-NFT Registry */}
          <div className="rounded-xl border border-[hsl(var(--peptoma-gold))/20] bg-[hsl(var(--peptoma-gold))/4] p-3 space-y-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-[hsl(var(--peptoma-gold))]" />
              <p className="text-xs font-mono text-[hsl(var(--peptoma-gold))] tracking-widest uppercase">IP-NFT</p>
              <span className="text-[9px] font-mono px-1 py-0.5 rounded border border-[hsl(var(--peptoma-gold))/20] text-[hsl(var(--peptoma-gold))/70]">PEPTOMA Registry</span>
            </div>
            <p className="text-[9px] font-mono text-muted-foreground leading-relaxed">
              Register this peptide discovery as a native PEPTOMA IP-NFT — immutable on-chain record with community ownership and research IP rights.
            </p>
            <button
              onClick={() => setShowMolecule(true)}
              className="w-full py-2 border border-[hsl(var(--peptoma-gold))/30] text-[hsl(var(--peptoma-gold))] font-mono text-[10px] rounded-lg hover:bg-[hsl(var(--peptoma-gold))/5] hover:border-[hsl(var(--peptoma-gold))/50] transition-all flex items-center justify-center gap-2"
            >
              <BookOpen className="w-3 h-3" />
              Open IP-NFT Registry
            </button>
          </div>

          {/* Links + Export */}
          <div className="rounded-xl border border-border bg-card/60 p-3 space-y-1">
            {[
              {
                icon: BookOpen,
                label: "PubMed",
                href: `https://pubmed.ncbi.nlm.nih.gov/?term=peptide+${encodeURIComponent(seq.diseaseTarget ?? "bioactivity")}`,
              },
              {
                icon: Activity,
                label: "ClinicalTrials.gov",
                href: `https://clinicaltrials.gov/search?query=${encodeURIComponent(seq.diseaseTarget ?? "peptide therapy")}`,
              },
            ].map(({ icon: Icon, label, href }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/30 transition-all group"
              >
                <Icon className="w-3 h-3 text-muted-foreground group-hover:text-[hsl(var(--peptoma-cyan))] shrink-0" />
                <span className="text-[10px] font-mono text-foreground flex-1">{label}</span>
                <ExternalLink className="w-2.5 h-2.5 text-muted-foreground/40 shrink-0" />
              </a>
            ))}
            <div className="border-t border-border/60 pt-1 mt-1 space-y-0.5">
              <button
                onClick={() => setShowBenchling(true)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[hsl(var(--peptoma-cyan))/5] transition-all w-full group"
              >
                <FlaskRound className="w-3 h-3 text-[hsl(var(--peptoma-cyan))] shrink-0" />
                <span className="text-[10px] font-mono text-[hsl(var(--peptoma-cyan))] flex-1 text-left">Export to Benchling ELN</span>
                <ExternalLink className="w-2.5 h-2.5 text-[hsl(var(--peptoma-cyan))/40] shrink-0" />
              </button>
              <button
                onClick={() => {
                  const content = generateGenBankFile(seq as Parameters<typeof generateGenBankFile>[0]);
                  const blob = new Blob([content], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `PEPTOMA_${seqId}_genbank.gp`;
                  a.click();
                  URL.revokeObjectURL(url);
                  setGenBankCopied(true);
                  setTimeout(() => setGenBankCopied(false), 2000);
                }}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[hsl(var(--peptoma-green))/5] transition-all w-full group"
              >
                {genBankCopied
                  ? <Check className="w-3 h-3 text-[hsl(var(--peptoma-green))] shrink-0" />
                  : <Download className="w-3 h-3 text-[hsl(var(--peptoma-green))] shrink-0" />}
                <span className="text-[10px] font-mono text-[hsl(var(--peptoma-green))] flex-1 text-left">
                  {genBankCopied ? "Downloaded!" : "GenBank Deposit (.gp file)"}
                </span>
                <span className="text-[9px] font-mono text-muted-foreground/40 shrink-0">NCBI</span>
              </button>
              <button
                onClick={() => {
                  const content = generateBioRxivTemplate(seq as Parameters<typeof generateBioRxivTemplate>[0]);
                  const blob = new Blob([content], { type: "text/markdown" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `PEPTOMA_${seqId}_biorxiv_preprint.md`;
                  a.click();
                  URL.revokeObjectURL(url);
                  setBioRxivCopied(true);
                  setTimeout(() => setBioRxivCopied(false), 2000);
                }}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[hsl(var(--peptoma-gold))/5] transition-all w-full group"
              >
                {bioRxivCopied
                  ? <Check className="w-3 h-3 text-[hsl(var(--peptoma-gold))] shrink-0" />
                  : <BookOpen className="w-3 h-3 text-[hsl(var(--peptoma-gold))] shrink-0" />}
                <span className="text-[10px] font-mono text-[hsl(var(--peptoma-gold))] flex-1 text-left">
                  {bioRxivCopied ? "Downloaded!" : "bioRxiv Preprint Template (.md)"}
                </span>
                <span className="text-[9px] font-mono text-muted-foreground/40 shrink-0">bioRxiv</span>
              </button>
              <button
                onClick={() => {
                  const content = generateOpentronsProtocol(seq as Parameters<typeof generateOpentronsProtocol>[0]);
                  const blob = new Blob([content], { type: "text/x-python" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `PEPTOMA_${seqId}_opentrons_spps.py`;
                  a.click();
                  URL.revokeObjectURL(url);
                  setOpentronsDownloaded(true);
                  setTimeout(() => setOpentronsDownloaded(false), 2000);
                }}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[hsl(var(--peptoma-cyan))/5] transition-all w-full group"
              >
                {opentronsDownloaded
                  ? <Check className="w-3 h-3 text-[hsl(var(--peptoma-cyan))] shrink-0" />
                  : <FlaskConical className="w-3 h-3 text-[hsl(var(--peptoma-cyan))] shrink-0" />}
                <span className="text-[10px] font-mono text-[hsl(var(--peptoma-cyan))] flex-1 text-left">
                  {opentronsDownloaded ? "Downloaded!" : "Opentrons SPPS Protocol (.py)"}
                </span>
                <span className="text-[9px] font-mono text-muted-foreground/40 shrink-0">OT-2</span>
              </button>
            </div>
          </div>
        </div>

        {/* Annotation Area */}
        <div className="space-y-5">
          {/* Annotation Type Selector */}
          <div className="rounded-xl border border-border bg-card/60 p-5 space-y-4">
            {/* Section header */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-mono text-foreground font-bold tracking-widest uppercase">Choose Annotation Type</p>
                <p className="text-[10px] font-mono text-muted-foreground mt-0.5">Select a type to contribute — you'll earn PEPTOMA Points for each accepted annotation</p>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[hsl(var(--peptoma-gold))/10] border border-[hsl(var(--peptoma-gold))/20] shrink-0">
                <Coins className="w-3 h-3 text-[hsl(var(--peptoma-gold))]" />
                <span className="text-[9px] font-mono text-[hsl(var(--peptoma-gold))] font-bold">PEPTOMA Points</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {ANNOTATION_TYPES.map(({ type, label, icon: Icon, earn, desc }) => (
                <button
                  key={type}
                  onClick={() => setActiveType(type)}
                  className={cn(
                    "flex flex-col items-start gap-1.5 p-3 rounded-lg border transition-all text-left",
                    activeType === type
                      ? TYPE_COLORS[type]
                      : "border-border text-muted-foreground hover:border-border/60 hover:bg-muted/10"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5" />
                      <span className="text-xs font-mono font-bold uppercase">{label}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground leading-snug">{desc}</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Coins className="w-2.5 h-2.5 text-[hsl(var(--peptoma-gold))]" />
                    <span className="text-[10px] font-mono text-[hsl(var(--peptoma-gold))] font-bold">+{earn} pts</span>
                  </div>
                </button>
              ))}
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                activeType === "confirm" ? "Describe why you confirm this classification..." :
                activeType === "challenge" ? "Provide evidence or reasoning to challenge the AI result..." :
                activeType === "extend" ? "Add related sequence, cite a paper, or contribute supporting data..." :
                "Add disease/target label (e.g. Alzheimer's, antimicrobial, cancer)..."
              }
              className="w-full h-28 px-4 py-3 bg-background/60 border border-border rounded-lg font-mono text-sm text-foreground placeholder-muted-foreground/50 resize-none focus:outline-none focus:border-[hsl(var(--peptoma-cyan))/40] transition-colors"
            />

            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="w-full py-3 bg-[hsl(var(--peptoma-cyan))] text-black font-mono font-bold rounded-lg hover:bg-[hsl(var(--peptoma-cyan))/90] disabled:opacity-40 transition-colors shadow-[0_0_15px_hsl(145_100%_42%/0.3)]"
            >
              {isPending ? "SUBMITTING..." : `SUBMIT ${activeConfig?.label} (+${activeConfig?.earn} PEPTOMA POINTS)`}
            </button>

            {/* What are PEPTOMA Points? */}
            <div className="rounded-lg border border-[hsl(var(--peptoma-gold))/20] bg-[hsl(var(--peptoma-gold))/5] p-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-[hsl(var(--peptoma-gold))]" />
                <span className="text-[10px] font-mono text-[hsl(var(--peptoma-gold))] font-bold uppercase tracking-widest">What are PEPTOMA Points?</span>
              </div>
              <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">
                <span className="text-foreground font-bold">PEPTOMA Points are off-chain activity points</span> you earn by contributing annotations and running analyses. They track your research impact on the platform — separate from <span className="text-foreground font-bold">$PEPTM</span>, the real Solana token used for staking tier upgrades and governance voting.
              </p>
              <a href="/token" className="inline-flex items-center gap-1 text-[9px] font-mono text-[hsl(var(--peptoma-gold))] hover:underline mt-0.5">
                Learn about $PEPTM token — staking tiers & governance <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>

          {/* Annotations List */}
          <div className="space-y-3">
            <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase">
              {annotations?.length ?? 0} Annotation{annotations?.length !== 1 ? "s" : ""}
            </p>
            {annsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 bg-card/40 rounded-xl border border-border animate-pulse" />
              ))
            ) : annotations?.length === 0 ? (
              <div className="py-10 text-center rounded-xl border border-border/40 bg-card/20">
                <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="font-mono text-muted-foreground text-sm">No annotations yet</p>
                <p className="font-mono text-muted-foreground/60 text-xs mt-1">Be the first to contribute — earn PEPTOMA Points</p>
              </div>
            ) : (
              annotations?.map((ann) => (
                <motion.div
                  key={ann.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-border bg-card/60 p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-foreground">{ann.userId}</span>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-[10px] font-mono px-2 py-0.5 rounded border uppercase",
                        TYPE_COLORS[ann.type] ?? "text-muted-foreground bg-muted/20 border-border"
                      )}>
                        {ann.type}
                      </span>
                      {ann.tokensEarned && ann.tokensEarned > 0 ? (
                        <span className="text-[10px] font-mono text-[hsl(var(--peptoma-gold))]">+{ann.tokensEarned} pts</span>
                      ) : null}
                    </div>
                  </div>
                  {ann.content && (
                    <p className="text-sm font-mono text-foreground/80 leading-relaxed">{ann.content}</p>
                  )}
                  {ann.score !== undefined && (
                    <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                      <ThumbsUp className="w-3 h-3" /> {ann.score} upvotes
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
