import { Router } from "express";
import { db, sequencesTable, annotationsTable, ipNftsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { randomBytes } from "crypto";
import { Keypair, Connection, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

function getTreasuryKeypair(): Keypair {
  const pk = process.env.TREASURY_PRIVATE_KEY;
  if (!pk) throw new Error("TREASURY_PRIVATE_KEY not configured");
  // JSON array of 64 bytes (solana-keygen default)
  try {
    const arr = JSON.parse(pk) as number[];
    if (Array.isArray(arr)) return Keypair.fromSecretKey(Uint8Array.from(arr));
  } catch {}
  // base58 secret key
  try { return Keypair.fromSecretKey(bs58.decode(pk)); } catch {}
  // base64
  try { return Keypair.fromSecretKey(Buffer.from(pk, "base64")); } catch {}
  throw new Error("Cannot parse TREASURY_PRIVATE_KEY — expected JSON array, base58, or base64");
}

// Ordered by reliability for server-side getAccountInfo calls.
// Ankr is LAST — it 403s getAccountInfo for program accounts without an API key.
const MINT_RPC_ENDPOINTS = [
  "https://api.mainnet-beta.solana.com",
  "https://solana-mainnet.rpc.extrnode.com",
  "https://rpc.ankr.com/solana",
];

async function mintOnChain(params: {
  metadataUri: string;
  name: string;
  symbol: string;
  ownerAddress: string;
}): Promise<{ mintAddress: string; txSignature: string }> {
  const { Metaplex, keypairIdentity } = await import("@metaplex-foundation/js");
  const keypair = getTreasuryKeypair();

  let lastError: Error = new Error("All RPC endpoints failed");

  for (const rpcUrl of MINT_RPC_ENDPOINTS) {
    try {
      const connection = new Connection(rpcUrl, {
        commitment: "confirmed",
        disableRetryOnRateLimit: true,
        confirmTransactionInitialTimeout: 120_000,
      });
      const metaplex = Metaplex.make(connection).use(keypairIdentity(keypair));
      const { nft, response } = await metaplex.nfts().create({
        uri: params.metadataUri,
        name: params.name,
        symbol: params.symbol,
        sellerFeeBasisPoints: 250,
        tokenOwner: new PublicKey(params.ownerAddress),
        isMutable: false,
      });
      return { mintAddress: nft.address.toString(), txSignature: response.signature };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      const msg = lastError.message.toLowerCase();
      // Only retry on 403/rate-limit — any other error is a real failure
      if (!msg.includes("403") && !msg.includes("-32052") && !msg.includes("rate limit") && !msg.includes("too many requests")) {
        throw lastError;
      }
    }
  }

  throw lastError;
}

const router = Router();

// ── Helpers ────────────────────────────────────────────────────────────────

function structureLabel(s?: string | null) {
  const map: Record<string, string> = {
    alpha_helix: "α-Helix",
    beta_sheet: "β-Sheet",
    random_coil: "Random Coil",
    mixed: "Mixed",
  };
  return s ? (map[s] ?? s) : "Unknown";
}

function toxicityScore(risk?: string | null): number {
  if (risk === "low") return 90;
  if (risk === "medium") return 55;
  if (risk === "high") return 20;
  return 50;
}

const AA_COLORS: Record<string, string> = {
  K: "#00ff9d", R: "#00ff9d", H: "#00e5a0",
  D: "#ff4757", E: "#ff6b7a",
  A: "#ffa502", V: "#ffb627", I: "#ffaa00", L: "#ffa502", M: "#ff8c00",
  F: "#e67e00", W: "#cc6600", P: "#ff9500",
  S: "#00d2ff", T: "#17c0eb", C: "#48dbfb", Y: "#0abde3", N: "#54a0ff", Q: "#2980b9",
  G: "#747d8c",
};

function aaColor(aa: string): string {
  return AA_COLORS[aa.toUpperCase()] ?? "#95a5a6";
}

// ── NFT Palette by bioactivity type ─────────────────────────────────────────
const PALETTES: Record<string, { p: string; s: string; bg: string; tint: string }> = {
  ANTIMICROBIAL:      { p: "#00ff9d", s: "#00cc7a", bg: "#001a0d", tint: "0,255,157" },
  "ANTI-INFLAMMATORY":{ p: "#ffd700", s: "#ffaa00", bg: "#1a1400", tint: "255,215,0" },
  NEUROPEPTIDE:       { p: "#b06aff", s: "#8040dd", bg: "#0d0014", tint: "176,106,255" },
  ANTIFUNGAL:         { p: "#ff8c42", s: "#dd6622", bg: "#1a0800", tint: "255,140,66" },
  ANTIVIRAL:          { p: "#4da6ff", s: "#2288dd", bg: "#00101a", tint: "77,166,255" },
  ANTICANCER:         { p: "#ff4d6a", s: "#dd2244", bg: "#1a0008", tint: "255,77,106" },
  ANTIPARASITIC:      { p: "#39e5b6", s: "#20c99c", bg: "#001a13", tint: "57,229,182" },
};

function getPalette(label: string) {
  const up = label.toUpperCase();
  for (const [key, val] of Object.entries(PALETTES)) {
    if (up.includes(key)) return val;
  }
  return { p: "#00ff9d", s: "#00cc7a", bg: "#001a0d", tint: "0,255,157" };
}

// ── Circuit trace background ─────────────────────────────────────────────────
function circuitTraces(seed: number, W: number, H: number, color: string): string {
  const out: string[] = [];
  for (let i = 0; i < 18; i++) {
    const x1 = Math.abs((seed * (i + 1) * 137 + i * 311) % W);
    const y1 = Math.abs((seed * (i + 1) * 239 + i * 173) % H);
    const dx = ((seed * (i + 3) * 97) % 160) - 80;
    const dy = ((seed * (i + 2) * 153) % 120) - 60;
    const x2 = Math.min(Math.max(x1 + dx, 0), W);
    const y2 = Math.min(Math.max(y1 + dy, 0), H);
    out.push(`<path d="M${x1},${y1} L${x2},${y1} L${x2},${y2}" fill="none" stroke="${color}" stroke-width="0.4" opacity="0.07"/>`);
    out.push(`<circle cx="${x2}" cy="${y2}" r="2" fill="none" stroke="${color}" stroke-width="0.5" opacity="0.1"/>`);
  }
  // hex dots scattered
  for (let i = 0; i < 12; i++) {
    const hx = Math.abs((seed * (i + 7) * 211) % W);
    const hy = Math.abs((seed * (i + 5) * 179) % H);
    out.push(`<circle cx="${hx}" cy="${hy}" r="1" fill="${color}" opacity="0.08"/>`);
  }
  return out.join("");
}

// ── Energy crackles inside capsule ──────────────────────────────────────────
function crackles(seed: number, cx: number, cy: number, maxR: number, color: string, clipId: string): string {
  const out: string[] = [];
  const n = 8;
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * 2 * Math.PI + (seed % 100) * 0.063;
    const r1 = 12 + ((seed * (i + 1) * 7) % 10);
    const r2 = maxR * (0.55 + ((seed * (i + 1) * 13) % 40) / 100);
    const x1 = (cx + r1 * Math.cos(angle)).toFixed(1);
    const y1 = (cy + r1 * Math.sin(angle)).toFixed(1);
    const mx = (cx + r2 * 0.5 * Math.cos(angle) + ((seed * (i + 2) * 11) % 18 - 9)).toFixed(1);
    const my = (cy + r2 * 0.5 * Math.sin(angle) + ((seed * (i + 3) * 17) % 18 - 9)).toFixed(1);
    const x2 = (cx + r2 * Math.cos(angle)).toFixed(1);
    const y2 = (cy + r2 * Math.sin(angle)).toFixed(1);
    out.push(`<path d="M${x1},${y1} L${mx},${my} L${x2},${y2}" fill="none" stroke="${color}" stroke-width="0.7" stroke-opacity="0.55" clip-path="url(#${clipId})"/>`);
  }
  return out.join("");
}

// ── Radial score arc path ────────────────────────────────────────────────────
function scoreArcPath(score: number, cx: number, cy: number, r: number): string {
  const start = -Math.PI * 0.85;
  const sweep = Math.PI * 1.7 * (score / 100);
  const end = start + sweep;
  const x1 = (cx + r * Math.cos(start)).toFixed(2);
  const y1 = (cy + r * Math.sin(start)).toFixed(2);
  const x2 = (cx + r * Math.cos(end)).toFixed(2);
  const y2 = (cy + r * Math.sin(end)).toFixed(2);
  const large = sweep > Math.PI ? 1 : 0;
  return `M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2}`;
}

// ── Main SVG builder — premium pharmaceutical vial ───────────────────────────
function buildNFTSvg(seq: typeof sequencesTable.$inferSelect, nft?: typeof ipNftsTable.$inferSelect | null): string {
  const W = 500, H = 700;
  const id = seq.id;
  const sequence = seq.sequence ?? "";
  const label = (seq.bioactivityLabel ?? "PEPTIDE").toUpperCase();
  const bio  = seq.bioactivityScore  ?? 0;
  const conf = seq.confidenceScore   ?? 0;
  const isMinted = !!nft;
  const pal = getPalette(label);

  const edition   = nft ? `#${String(nft.id).padStart(4, "0")}` : `#${String(id).padStart(4, "0")}`;
  const mintShort = nft ? `${nft.mintAddress.slice(0, 6)}…${nft.mintAddress.slice(-4)}` : "";

  const structMap: Record<string, string> = {
    alpha_helix: "α-HELIX", beta_sheet: "β-SHEET", random_coil: "COIL", mixed: "MIXED",
  };
  const strucLabel = structMap[seq.structurePrediction ?? ""] ?? "MIXED";
  const toxLabel   = (seq.toxicityRisk ?? "LOW").toUpperCase();
  const targetTxt  = (seq.diseaseTarget ?? "RESEARCH USE ONLY").toUpperCase().slice(0, 26);
  const catNum     = `PTM-${String(id).padStart(3, "0")}-${label.replace(/[^A-Z]/g, "").slice(0, 3)}`;
  const labelFontSize = label.length > 16 ? 11 : label.length > 12 ? 13 : label.length > 9 ? 16 : 18;

  // ── Vial geometry ───────────────────────────────────────────────────────────
  const CX   = 250;   // center x
  const VW   = 76;    // half body width  →  body: 174 – 326
  const NCW  = 62;    // half neck width  →  neck: 188 – 312
  const CPW  = 73;    // half cap width   →  cap:  177 – 323

  const VTOP   = 184; // body top y
  const VSTR   = 510; // straight section ends
  const VRND   = 68;  // bottom curve radius (Q control → total bottom at 578)

  const NCKTOP = 140; // neck top y
  const CAPTOP = 78;  // cap dome top y
  const CAPBOT = 140; // cap bottom / neck top

  // glass body path: straight walls + rounded bottom
  const BP = `M${CX-VW},${VTOP} L${CX-VW},${VSTR} Q${CX-VW},${VSTR+VRND} ${CX},${VSTR+VRND} Q${CX+VW},${VSTR+VRND} ${CX+VW},${VSTR} L${CX+VW},${VTOP} Z`;

  // ── Label geometry ──────────────────────────────────────────────────────────
  const LHW = 65; // half label width → label: 185 – 315  (130 px)
  const LX  = CX - LHW; // 185
  const LW  = LHW * 2;  // 130
  const LY1 = 264;
  const LY2 = 462;
  const LH  = LY2 - LY1; // 198

  // ── Hexagon path for logo mark ──────────────────────────────────────────────
  const hexPath = (cx: number, cy: number, r: number) => {
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = (i * 60 - 30) * Math.PI / 180;
      return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
    });
    return `M${pts.join("L")}Z`;
  };

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs>
  <!-- Background -->
  <radialGradient id="bgG${id}" cx="50%" cy="38%" r="70%">
    <stop offset="0%" stop-color="#0d1a24"/>
    <stop offset="100%" stop-color="#020609"/>
  </radialGradient>

  <!-- Glass body: horizontal highlight/shadow -->
  <linearGradient id="glH${id}" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%"   stop-color="#5a7888" stop-opacity="0.72"/>
    <stop offset="6%"   stop-color="#ffffff" stop-opacity="0.88"/>
    <stop offset="14%"  stop-color="#dde8f0" stop-opacity="0.35"/>
    <stop offset="22%"  stop-color="#c8d8e8" stop-opacity="0.08"/>
    <stop offset="76%"  stop-color="#b8ccd8" stop-opacity="0.06"/>
    <stop offset="88%"  stop-color="#4a6070" stop-opacity="0.52"/>
    <stop offset="100%" stop-color="#1c2c3a" stop-opacity="0.78"/>
  </linearGradient>

  <!-- Glass neck -->
  <linearGradient id="nkH${id}" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%"   stop-color="#6a8898" stop-opacity="0.7"/>
    <stop offset="10%"  stop-color="#ffffff" stop-opacity="0.82"/>
    <stop offset="88%"  stop-color="#5a7080" stop-opacity="0.48"/>
    <stop offset="100%" stop-color="#203040" stop-opacity="0.74"/>
  </linearGradient>

  <!-- Cap: metallic aluminum (horizontal) -->
  <linearGradient id="cpH${id}" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%"   stop-color="#283848"/>
    <stop offset="16%"  stop-color="#607888"/>
    <stop offset="34%"  stop-color="#9eb0be"/>
    <stop offset="50%"  stop-color="#c4d2dc"/>
    <stop offset="66%"  stop-color="#8ea0ae"/>
    <stop offset="84%"  stop-color="#4e6070"/>
    <stop offset="100%" stop-color="#1c2c38"/>
  </linearGradient>

  <!-- Cap dome face (vertical) -->
  <linearGradient id="cpV${id}" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%"   stop-color="#b0c2cc"/>
    <stop offset="45%"  stop-color="#d8e4ec"/>
    <stop offset="100%" stop-color="#48606e"/>
  </linearGradient>

  <!-- Label paper (subtle left-right curve shading) -->
  <linearGradient id="lblG${id}" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%"   stop-color="#bec8d0"/>
    <stop offset="8%"   stop-color="#d8e2ea"/>
    <stop offset="50%"  stop-color="#ecf0f4"/>
    <stop offset="92%"  stop-color="#d0dae2"/>
    <stop offset="100%" stop-color="#b8c2ca"/>
  </linearGradient>

  <!-- Label header band (palette tint) -->
  <linearGradient id="lblH${id}" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%"   stop-color="${pal.p}" stop-opacity="0.05"/>
    <stop offset="50%"  stop-color="${pal.p}" stop-opacity="0.16"/>
    <stop offset="100%" stop-color="${pal.p}" stop-opacity="0.05"/>
  </linearGradient>

  <!-- Powder fill inside glass (white lyophilized cake) -->
  <linearGradient id="pwdG${id}" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%"   stop-color="rgba(${pal.tint},0.12)"/>
    <stop offset="40%"  stop-color="rgba(255,255,255,0.18)"/>
    <stop offset="100%" stop-color="rgba(255,255,255,0.05)"/>
  </linearGradient>

  <!-- Inner glass tint (soft ambient interior) -->
  <radialGradient id="innerG${id}" cx="40%" cy="35%" r="55%">
    <stop offset="0%"   stop-color="rgba(${pal.tint},0.07)"/>
    <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
  </radialGradient>

  <!-- Studio spotlight on background -->
  <radialGradient id="spotG${id}" cx="50%" cy="28%" r="52%">
    <stop offset="0%"   stop-color="rgba(200,220,240,0.09)"/>
    <stop offset="60%"  stop-color="rgba(100,140,180,0.03)"/>
    <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
  </radialGradient>

  <!-- Vertical glass gradient (top bright → bottom dark, simulates ambient light) -->
  <linearGradient id="glV${id}" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%"   stop-color="rgba(255,255,255,0.14)"/>
    <stop offset="18%"  stop-color="rgba(255,255,255,0.05)"/>
    <stop offset="60%"  stop-color="rgba(0,0,0,0.04)"/>
    <stop offset="100%" stop-color="rgba(0,0,0,0.22)"/>
  </linearGradient>

  <!-- Cap dome extra sheen (upper-left directional light) -->
  <radialGradient id="capSheen${id}" cx="36%" cy="32%" r="52%">
    <stop offset="0%"   stop-color="rgba(255,255,255,0.55)"/>
    <stop offset="45%"  stop-color="rgba(255,255,255,0.12)"/>
    <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
  </radialGradient>

  <!-- Floor shadow gradient -->
  <radialGradient id="floorG${id}" cx="50%" cy="50%" r="50%">
    <stop offset="0%"   stop-color="rgba(0,0,0,0.55)"/>
    <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
  </radialGradient>

  <!-- Glow -->
  <filter id="glow${id}" x="-60%" y="-60%" width="220%" height="220%">
    <feGaussianBlur stdDeviation="3.5" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="sglow${id}" x="-80%" y="-80%" width="260%" height="260%">
    <feGaussianBlur stdDeviation="9"/>
  </filter>
  <!-- Soft blur for shadow -->
  <filter id="shadowF${id}" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="12"/>
  </filter>

  <!-- Clip: vial body -->
  <clipPath id="vC${id}">
    <path d="${BP}"/>
  </clipPath>

  <!-- Clip: label area -->
  <clipPath id="lC${id}">
    <rect x="${LX}" y="${LY1}" width="${LW}" height="${LH}"/>
  </clipPath>
</defs>

<!-- ═══════════════════════ BACKGROUND ═════════════════════════ -->
<rect width="${W}" height="${H}" fill="url(#bgG${id})"/>

<!-- Studio spotlight (soft cone of light from above, center) -->
<rect width="${W}" height="${H}" fill="url(#spotG${id})"/>

<!-- Vial floor shadow (cast shadow on the surface the vial sits on) -->
<ellipse cx="${CX}" cy="${VSTR + VRND + 8}" rx="90" ry="14"
  fill="black" filter="url(#shadowF${id})" opacity="0.7"/>

<!-- ═══════════════════════ TOP INFO BAR ════════════════════════ -->
<!-- PEPTOMA wordmark -->
<text x="26" y="44" font-family="'Helvetica Neue',Arial,sans-serif" font-size="10" font-weight="800" fill="${pal.p}" letter-spacing="5" opacity="0.55">PEPTOMA</text>
<text x="26" y="56" font-family="monospace" font-size="5.5" fill="${pal.p}" letter-spacing="3" opacity="0.25">IP-NFT REGISTRY</text>

<!-- Edition badge (top right) -->
<rect x="${W - 104}" y="26" width="82" height="26" rx="5" fill="rgba(0,0,0,0.55)" stroke="${pal.p}" stroke-width="0.7" stroke-opacity="0.45"/>
<text x="${W - 63}" y="43.5" text-anchor="middle" font-family="monospace" font-size="13" font-weight="bold" fill="${pal.p}" opacity="0.9" filter="url(#glow${id})">${edition}</text>

<!-- Divider -->
<line x1="22" y1="64" x2="${W - 22}" y2="64" stroke="${pal.p}" stroke-width="0.4" stroke-opacity="0.18"/>

<!-- ═══════════════════════ VIAL BODY (GLASS) ════════════════════ -->

<!-- 1. Powder fill + inner ambient (inside glass, behind label) -->
<path d="${BP}" fill="url(#pwdG${id})"/>
<path d="${BP}" fill="url(#innerG${id})"/>

<!-- 2. Glass wall fill — horizontal highlight + vertical top-to-bottom gradient -->
<path d="${BP}" fill="url(#glH${id})"/>
<path d="${BP}" fill="url(#glV${id})"/>

<!-- 3. Inner label (solid silver paper) -->
<rect x="${LX}" y="${LY1}" width="${LW}" height="${LH}" fill="url(#lblG${id})"/>

<!-- ── Label content ──────────────────────────────────────────── -->
<g clip-path="url(#lC${id})">

  <!-- Header tint band -->
  <rect x="${LX}" y="${LY1}" width="${LW}" height="32" fill="url(#lblH${id})"/>
  <line x1="${LX}" y1="${LY1 + 32}" x2="${LX + LW}" y2="${LY1 + 32}" stroke="${pal.p}" stroke-width="0.6" stroke-opacity="0.38"/>

  <!-- Logo hexagon -->
  <path d="${hexPath(LX + 13, LY1 + 16, 8)}" fill="none" stroke="${pal.p}" stroke-width="1.2" stroke-opacity="0.75"/>
  <path d="${hexPath(LX + 13, LY1 + 16, 4)}" fill="${pal.p}" fill-opacity="0.5"/>

  <!-- Brand name -->
  <text x="${LX + 25}" y="${LY1 + 20}" font-family="'Helvetica Neue',Arial,sans-serif" font-size="9.5" font-weight="800" fill="${pal.p}" letter-spacing="3.5" opacity="0.88">PEPTOMA</text>

  <!-- Catalog number -->
  <text x="${LX + 8}" y="${LY1 + 43}" font-family="monospace" font-size="6" fill="#5a7080" letter-spacing="0.8">${catNum}</text>

  <!-- ── Main compound name ── -->
  <text x="${CX}" y="${LY1 + 76}" text-anchor="middle"
    font-family="'Helvetica Neue',Arial,sans-serif"
    font-size="${labelFontSize}"
    font-weight="800"
    fill="#1a2535"
    letter-spacing="0.3">${label}</text>

  <!-- Concentration row -->
  <text x="${CX}" y="${LY1 + 92}" text-anchor="middle"
    font-family="'Helvetica Neue',Arial,sans-serif"
    font-size="8.5" fill="#2a3848" letter-spacing="0.2">${sequence.length}aa · ${seq.depth?.toUpperCase() ?? "STANDARD"}</text>

  <text x="${CX}" y="${LY1 + 105}" text-anchor="middle"
    font-family="'Helvetica Neue',Arial,sans-serif"
    font-size="7" fill="#607888" letter-spacing="0.3">lyophilized · 1 vial</text>

  <!-- Divider rule -->
  <line x1="${LX + 8}" y1="${LY1 + 114}" x2="${LX + LW - 8}" y2="${LY1 + 114}" stroke="#8a9aaa" stroke-width="0.45" opacity="0.55"/>

  <!-- PURITY badge row -->
  <rect x="${LX + 8}" y="${LY1 + 120}" width="42" height="13" fill="#1a2535" rx="1.5"/>
  <text x="${LX + 29}" y="${LY1 + 129.5}" text-anchor="middle" font-family="monospace" font-size="5.5" fill="white" font-weight="bold" letter-spacing="0.3">PURITY</text>
  <text x="${LX + 56}" y="${LY1 + 130}" font-family="'Helvetica Neue',Arial,sans-serif" font-size="8" fill="#1a2535">${bio}% HPLC</text>

  <!-- RUO badge row -->
  <rect x="${LX + 8}" y="${LY1 + 137}" width="26" height="13" fill="#1a2535" rx="1.5"/>
  <text x="${LX + 21}" y="${LY1 + 146.5}" text-anchor="middle" font-family="monospace" font-size="5.5" fill="white" font-weight="bold" letter-spacing="0.3">RUO</text>
  <text x="${LX + 40}" y="${LY1 + 147}" font-family="'Helvetica Neue',Arial,sans-serif" font-size="7.5" fill="#1a2535">Research use only</text>

  <!-- Divider rule 2 -->
  <line x1="${LX + 8}" y1="${LY1 + 156}" x2="${LX + LW - 8}" y2="${LY1 + 156}" stroke="#8a9aaa" stroke-width="0.35" opacity="0.4"/>

  <!-- Structure · Toxicity row -->
  <text x="${CX}" y="${LY1 + 167}" text-anchor="middle" font-family="monospace" font-size="5.5" fill="#708090" letter-spacing="0.5">${strucLabel} · TOX ${toxLabel} · CONF ${conf}%</text>

  <!-- Target / disease -->
  <text x="${CX}" y="${LY1 + 179}" text-anchor="middle" font-family="'Helvetica Neue',Arial,sans-serif" font-size="6.5" fill="#8090a0">${targetTxt}</text>

  <!-- Disclaimer -->
  <text x="${CX}" y="${LY1 + 191}" text-anchor="middle" font-family="'Helvetica Neue',Arial,sans-serif" font-size="5.5" fill="#9aaab8">Not for human or veterinary use.</text>

</g>
<!-- ── End label content ── -->

<!-- Label border lines (top + bottom palette accent) -->
<line x1="${LX}" y1="${LY1}" x2="${LX + LW}" y2="${LY1}" stroke="${pal.p}" stroke-width="0.8" stroke-opacity="0.38"/>
<line x1="${LX}" y1="${LY2}" x2="${LX + LW}" y2="${LY2}" stroke="${pal.p}" stroke-width="0.8" stroke-opacity="0.38"/>

<!-- ── On-chain status band at bottom of label ── -->
${isMinted
  ? `<rect x="${LX}" y="${LY2 - 22}" width="${LW}" height="22" fill="${pal.p}" fill-opacity="0.1" clip-path="url(#lC${id})"/>
     <circle cx="${LX + 12}" cy="${LY2 - 11}" r="3.5" fill="${pal.p}" filter="url(#glow${id})" clip-path="url(#lC${id})"/>
     <text x="${LX + 22}" y="${LY2 - 7}" font-family="monospace" font-size="6" fill="${pal.p}" letter-spacing="0.8" clip-path="url(#lC${id})">ON-CHAIN · ${mintShort}</text>`
  : `<rect x="${LX}" y="${LY2 - 22}" width="${LW}" height="22" fill="rgba(0,0,0,0.04)" clip-path="url(#lC${id})"/>
     <text x="${CX}" y="${LY2 - 7}" text-anchor="middle" font-family="monospace" font-size="6" fill="#9aaab8" letter-spacing="0.5" clip-path="url(#lC${id})">AWAITING REGISTRY MINT</text>`
}

<!-- 4. Glass edge overlays (on top of label — the glass "in front of" label) -->
<!-- Left highlight: tapered wedge (wider at top, narrowing down = natural cylinder light) -->
<path d="M${CX-VW},${VTOP} L${CX-VW+16},${VTOP} L${CX-VW+11},${VSTR} L${CX-VW},${VSTR} Z"
  fill="white" opacity="0.34" clip-path="url(#vC${id})"/>
<path d="M${CX-VW+16},${VTOP} L${CX-VW+24},${VTOP} L${CX-VW+18},${VSTR} L${CX-VW+11},${VSTR} Z"
  fill="white" opacity="0.08" clip-path="url(#vC${id})"/>

<!-- Right edge shadow: tapered (matches left highlight) -->
<path d="M${CX+VW-11},${VTOP} L${CX+VW},${VTOP} L${CX+VW},${VSTR} L${CX+VW-11},${VSTR} Z"
  fill="#0a1820" opacity="0.45" clip-path="url(#vC${id})"/>
<!-- Faint second shadow band -->
<path d="M${CX+VW-20},${VTOP} L${CX+VW-11},${VTOP} L${CX+VW-11},${VSTR} L${CX+VW-20},${VSTR} Z"
  fill="#0a1820" opacity="0.10" clip-path="url(#vC${id})"/>

<!-- Glass over left/right label margins (makes glass feel thick) -->
<rect x="${CX - VW}" y="${LY1}" width="${LX - (CX - VW)}" height="${LH}"
  fill="url(#glH${id})" clip-path="url(#vC${id})"/>
<rect x="${LX + LW}" y="${LY1}" width="${(CX + VW) - (LX + LW)}" height="${LH}"
  fill="url(#glH${id})" clip-path="url(#vC${id})"/>

<!-- 5. Body outline -->
<path d="${BP}" fill="none" stroke="#688090" stroke-width="0.9" stroke-opacity="0.32"/>

<!-- Top rim ellipse (glass thickness) -->
<ellipse cx="${CX}" cy="${VTOP}" rx="${VW}" ry="11" fill="#c8dce8" opacity="0.12"/>
<ellipse cx="${CX}" cy="${VTOP}" rx="${VW}" ry="11" fill="none" stroke="#a8c0cc" stroke-width="1.3" stroke-opacity="0.48"/>

<!-- Bottom dome -->
<ellipse cx="${CX}" cy="${VSTR + VRND}" rx="${VW}" ry="10" fill="#1a2c3c" opacity="0.18"/>

<!-- ═══════════════════════ NECK ═════════════════════════════════ -->
<path d="M${CX - NCW},${NCKTOP} L${CX - VW},${VTOP} L${CX + VW},${VTOP} L${CX + NCW},${NCKTOP} Z"
  fill="url(#nkH${id})" stroke="#6a8898" stroke-width="0.6" stroke-opacity="0.28"/>
<!-- Neck left highlight -->
<line x1="${CX - NCW}" y1="${NCKTOP}" x2="${CX - VW}" y2="${VTOP}"
  stroke="white" stroke-width="5" stroke-opacity="0.2" stroke-linecap="round"/>

<!-- ═══════════════════════ CAP (METALLIC ALUMINUM) ═════════════ -->

<!-- Cap cylinder body -->
<rect x="${CX - CPW}" y="${CAPTOP}" width="${CPW * 2}" height="${CAPBOT - CAPTOP}" rx="9"
  fill="url(#cpH${id})"/>

<!-- Cap top dome ellipse -->
<ellipse cx="${CX}" cy="${CAPTOP}" rx="${CPW}" ry="15"
  fill="url(#cpV${id})"/>

<!-- Cap bottom skirt -->
<ellipse cx="${CX}" cy="${CAPBOT}" rx="${CPW}" ry="12" fill="#2a3848" opacity="0.65"/>

<!-- Crimp ring highlight -->
<ellipse cx="${CX}" cy="${CAPTOP + 4}" rx="${CPW - 18}" ry="9"
  fill="none" stroke="rgba(255,255,255,0.42)" stroke-width="1.8"/>

<!-- Stopper (center rubber plug area) -->
<ellipse cx="${CX}" cy="${CAPTOP}" rx="26" ry="10" fill="#5e7080" opacity="0.52"/>
<ellipse cx="${CX}" cy="${CAPTOP}" rx="18" ry="7" fill="#7a8c9a" opacity="0.5"/>
<ellipse cx="${CX}" cy="${CAPTOP}" rx="11" ry="4.5" fill="#9ab0bc" opacity="0.45"/>
<!-- Stopper highlight -->
<ellipse cx="${CX - 4}" cy="${CAPTOP - 2}" rx="6" ry="2.5" fill="white" opacity="0.22"/>

<!-- Cap bottom edge line -->
<line x1="${CX - CPW + 8}" y1="${CAPBOT}" x2="${CX + CPW - 8}" y2="${CAPBOT}"
  stroke="#3a4a58" stroke-width="1.2" opacity="0.65"/>

<!-- Cap outer border -->
<rect x="${CX - CPW}" y="${CAPTOP}" width="${CPW * 2}" height="${CAPBOT - CAPTOP}" rx="9"
  fill="none" stroke="#3a4a58" stroke-width="0.8" stroke-opacity="0.5"/>
<ellipse cx="${CX}" cy="${CAPTOP}" rx="${CPW}" ry="15"
  fill="none" stroke="#3a4a58" stroke-width="0.8" stroke-opacity="0.45"/>

<!-- Cap dome directional sheen (upper-left light source) -->
<ellipse cx="${CX - 12}" cy="${CAPTOP - 4}" rx="${CPW * 0.72}" ry="11"
  fill="url(#capSheen${id})" opacity="0.7"/>

<!-- Cap body sheen (upper portion of cylinder catches the light) -->
<rect x="${CX - CPW + 2}" y="${CAPTOP}" width="${CPW * 2 - 4}" height="16" rx="7"
  fill="url(#capSheen${id})" opacity="0.25" clip-path="url(#vC${id})" style="clip-path:none"/>

<!-- ═══════════════════════ BOTTOM INFO ══════════════════════════ -->
<line x1="22" y1="${VSTR + VRND + 24}" x2="${W - 22}" y2="${VSTR + VRND + 24}"
  stroke="${pal.p}" stroke-width="0.35" stroke-opacity="0.14"/>

<!-- Mint / chain status -->
${isMinted
  ? `<circle cx="30" cy="${VSTR + VRND + 42}" r="4.5" fill="${pal.p}" filter="url(#glow${id})"/>
     <text x="42" y="${VSTR + VRND + 46}" font-family="monospace" font-size="7.5" fill="${pal.p}" opacity="0.85">ON-CHAIN VERIFIED · ${mintShort}</text>`
  : `<circle cx="30" cy="${VSTR + VRND + 42}" r="4.5" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="0.9"/>
     <text x="42" y="${VSTR + VRND + 46}" font-family="monospace" font-size="7.5" fill="rgba(255,255,255,0.28)">SEQUENCE ${edition} · UNMINTED</text>`
}

<!-- Solana badge (bottom right) -->
<rect x="${W - 114}" y="${VSTR + VRND + 32}" width="92" height="22" rx="4"
  fill="rgba(153,69,255,0.07)" stroke="rgba(153,69,255,0.28)" stroke-width="0.6"/>
<text x="${W - 68}" y="${VSTR + VRND + 47}" text-anchor="middle"
  font-family="monospace" font-size="8" fill="rgba(153,69,255,0.78)">&#9675; SOLANA</text>

<!-- Sequence watermark -->
<text x="${CX}" y="${VSTR + VRND + 66}" text-anchor="middle"
  font-family="monospace" font-size="5.5"
  fill="rgba(${pal.tint},0.14)" letter-spacing="1.5">${sequence.slice(0, 42)}</text>

<!-- TX (if minted) -->
${isMinted
  ? `<text x="${CX}" y="${VSTR + VRND + 79}" text-anchor="middle" font-family="monospace" font-size="5.5" fill="rgba(255,255,255,0.14)" letter-spacing="0.5">TX: ${nft.txSignature.slice(0, 46)}…</text>`
  : ""}

<!-- Footer wordmark -->
<text x="${CX}" y="${H - 12}" text-anchor="middle"
  font-family="monospace" font-size="7" fill="${pal.p}" letter-spacing="4" opacity="0.22">PEPTOMA · OPEN DESCI · peptoma.xyz</text>

</svg>`;
}

function buildMetadata(
  seq: typeof sequencesTable.$inferSelect,
  annotations: (typeof annotationsTable.$inferSelect)[],
  nft?: typeof ipNftsTable.$inferSelect | null,
) {
  const contributors = [...new Set(annotations.map(a => a.userId))];
  const today = new Date().toISOString().split("T")[0];

  return {
    name: `PEPTOMA IP-NFT · ${seq.bioactivityLabel ?? "Peptide"} · Seq #${seq.id}`,
    description: [
      `Novel ${seq.bioactivityLabel ?? "bioactive"} peptide sequence discovered and analysed on PEPTOMA (peptoma.xyz), the open DeSci platform for peptide research.`,
      ``,
      `Sequence: ${seq.sequence}`,
      seq.diseaseTarget ? `Therapeutic Target: ${seq.diseaseTarget}` : null,
      `Bioactivity Score: ${seq.bioactivityScore}/100`,
      `Confidence: ${seq.confidenceScore}/100`,
      `Structure: ${structureLabel(seq.structurePrediction)}`,
      `Toxicity Risk: ${seq.toxicityRisk?.toUpperCase() ?? "UNKNOWN"}`,
      seq.ipfsCid ? `IPFS CID: ${seq.ipfsCid}` : null,
      nft ? `Mint Address: ${nft.mintAddress}` : null,
      nft ? `TX: ${nft.txSignature}` : null,
      ``,
      `Platform Registration: RRID:SCR_028424 (SciCrunch)`,
      `Annotated by ${contributors.length} community contributor${contributors.length !== 1 ? "s" : ""}.`,
    ].filter(Boolean).join("\n"),
    external_url: `https://peptoma.xyz/annotate/${seq.id}`,
    image: seq.ipfsCid
      ? `ipfs://${seq.ipfsCid}`
      : `https://peptoma.xyz/og-peptide.png`,
    attributes: [
      { trait_type: "Platform", value: "PEPTOMA" },
      { trait_type: "RRID", value: "SCR_028424" },
      { trait_type: "Sequence ID", value: seq.id },
      { trait_type: "Amino Acid Sequence", value: seq.sequence },
      { trait_type: "Bioactivity Label", value: seq.bioactivityLabel ?? "Unknown" },
      { trait_type: "Bioactivity Score", value: seq.bioactivityScore, display_type: "boost_percentage" },
      { trait_type: "Confidence Score", value: seq.confidenceScore, display_type: "boost_percentage" },
      { trait_type: "Structure Prediction", value: structureLabel(seq.structurePrediction) },
      { trait_type: "Toxicity Safety Score", value: toxicityScore(seq.toxicityRisk), display_type: "boost_percentage" },
      seq.diseaseTarget ? { trait_type: "Disease Target", value: seq.diseaseTarget } : null,
      seq.molecularWeight ? { trait_type: "Molecular Weight (Da)", value: seq.molecularWeight, display_type: "number" } : null,
      seq.halfLife ? { trait_type: "Half-Life", value: seq.halfLife } : null,
      seq.chargeAtPH7 != null ? { trait_type: "Charge at pH 7", value: seq.chargeAtPH7, display_type: "number" } : null,
      { trait_type: "Analysis Depth", value: seq.depth?.toUpperCase() ?? "STANDARD" },
      { trait_type: "Community Annotations", value: annotations.length, display_type: "number" },
      { trait_type: "Contributors", value: contributors.length, display_type: "number" },
      seq.ipfsCid ? { trait_type: "IPFS CID", value: seq.ipfsCid } : null,
      { trait_type: "Discovery Date", value: today, display_type: "date" },
      nft ? { trait_type: "Mint Address", value: nft.mintAddress } : null,
      nft ? { trait_type: "Minted At", value: nft.mintedAt.toISOString(), display_type: "date" } : null,
    ].filter(Boolean),
    ip_metadata: {
      title: `PEPTOMA Peptide Research Dataset — ${seq.bioactivityLabel ?? "Bioactive"} · Sequence #${seq.id}`,
      type: "Research Dataset + Novel Compound",
      inventors: contributors.length > 0 ? contributors : ["PEPTOMA Community"],
      institution: "PEPTOMA — Open DeSci Platform (peptoma.xyz)",
      discovery_date: today,
      platform_rrid: "RRID:SCR_028424",
      sequence: seq.sequence,
      therapeutic_area: seq.diseaseTarget ?? "General Bioactivity",
      bioactivity_score: seq.bioactivityScore,
      confidence_score: seq.confidenceScore,
      analysis_depth: seq.depth ?? "standard",
      ipfs_provenance: seq.ipfsCid ?? null,
      community_peer_review: {
        total_annotations: annotations.length,
        confirms: annotations.filter(a => a.type === "confirm").length,
        challenges: annotations.filter(a => a.type === "challenge").length,
        extensions: annotations.filter(a => a.type === "extend").length,
        tags: annotations.filter(a => a.type === "tag").length,
      },
      license: "CC BY 4.0 — Attribution required: PEPTOMA (peptoma.xyz), RRID:SCR_028424",
      data_uri: `https://peptoma.xyz/annotate/${seq.id}`,
      on_chain: nft
        ? { mint_address: nft.mintAddress, tx_signature: nft.txSignature, minted_at: nft.mintedAt.toISOString() }
        : null,
    },
  };
}

// ── Routes ─────────────────────────────────────────────────────────────────

// GET /api/ipnft/treasury-status — public info about the treasury wallet balance
router.get("/ipnft/treasury-status", async (_req, res) => {
  const treasury = getTreasuryKeypair();
  const address = treasury.publicKey.toString();
  try {
    const conn = new Connection(MINT_RPC_ENDPOINTS[0], "confirmed");
    const balance = await conn.getBalance(treasury.publicKey);
    const funded = balance >= 50_000_000; // 0.05 SOL
    return res.json({ address, balanceSol: balance / 1e9, funded, requiredSol: 0.05 });
  } catch {
    return res.json({ address, balanceSol: null, funded: null, requiredSol: 0.05 });
  }
});

// GET /api/ipnft/marketplace — all listed NFTs (must come before /:sequenceId)
router.get("/ipnft/marketplace", async (req, res) => {
  const listed = await db
    .select({
      nft: ipNftsTable,
      seq: {
        id: sequencesTable.id,
        sequence: sequencesTable.sequence,
        bioactivityLabel: sequencesTable.bioactivityLabel,
        bioactivityScore: sequencesTable.bioactivityScore,
        confidenceScore: sequencesTable.confidenceScore,
        structurePrediction: sequencesTable.structurePrediction,
        toxicityRisk: sequencesTable.toxicityRisk,
        diseaseTarget: sequencesTable.diseaseTarget,
        annotationCount: sequencesTable.annotationCount,
        depth: sequencesTable.depth,
      },
    })
    .from(ipNftsTable)
    .innerJoin(sequencesTable, eq(ipNftsTable.sequenceId, sequencesTable.id))
    .where(eq(ipNftsTable.listed, true))
    .orderBy(desc(ipNftsTable.listedAt));

  res.json({ listings: listed });
});

// GET /api/ipnft/owned — all NFTs owned by a wallet (must come before /:sequenceId)
router.get("/ipnft/owned", async (req, res) => {
  const wallet = req.query.wallet as string;
  if (!wallet) return res.status(400).json({ error: "wallet required" });

  const owned = await db
    .select({
      nft: ipNftsTable,
      seq: {
        id: sequencesTable.id,
        sequence: sequencesTable.sequence,
        bioactivityLabel: sequencesTable.bioactivityLabel,
        bioactivityScore: sequencesTable.bioactivityScore,
        confidenceScore: sequencesTable.confidenceScore,
        annotationCount: sequencesTable.annotationCount,
        diseaseTarget: sequencesTable.diseaseTarget,
      },
    })
    .from(ipNftsTable)
    .innerJoin(sequencesTable, eq(ipNftsTable.sequenceId, sequencesTable.id))
    .where(eq(ipNftsTable.walletAddress, wallet))
    .orderBy(desc(ipNftsTable.mintedAt));

  res.json({ owned });
});

// GET /api/ipnft/:sequenceId — metadata JSON
router.get("/ipnft/:sequenceId", async (req, res) => {
  const id = parseInt(req.params.sequenceId);
  if (!id) return res.status(400).json({ error: "Invalid ID" });

  const seq = await db.query.sequencesTable.findFirst({ where: eq(sequencesTable.id, id) });
  if (!seq) return res.status(404).json({ error: "Sequence not found" });

  const annotations = await db.select().from(annotationsTable)
    .where(eq(annotationsTable.sequenceId, id))
    .orderBy(desc(annotationsTable.createdAt))
    .limit(50);

  const nft = await db.query.ipNftsTable.findFirst({
    where: eq(ipNftsTable.sequenceId, id),
    orderBy: [desc(ipNftsTable.mintedAt)],
  });

  const metadata = buildMetadata(seq, annotations, nft);
  req.log.info({ sequenceId: id }, "Generated PEPTOMA IP-NFT metadata");
  res.json({ metadata, sequenceId: id, minted: !!nft, nft: nft ?? null });
});

// GET /api/ipnft/:sequenceId/status — mint status only
router.get("/ipnft/:sequenceId/status", async (req, res) => {
  const id = parseInt(req.params.sequenceId);
  if (!id) return res.status(400).json({ error: "Invalid ID" });

  const nft = await db.query.ipNftsTable.findFirst({
    where: eq(ipNftsTable.sequenceId, id),
    orderBy: [desc(ipNftsTable.mintedAt)],
  });

  res.json({ minted: !!nft, nft: nft ?? null });
});

// GET /api/ipnft/:sequenceId/image.svg — NFT artwork
router.get("/ipnft/:sequenceId/image.svg", async (req, res) => {
  const id = parseInt(req.params.sequenceId);
  if (!id) return res.status(400).send("Invalid ID");

  const seq = await db.query.sequencesTable.findFirst({ where: eq(sequencesTable.id, id) });
  if (!seq) return res.status(404).send("Not found");

  const nft = await db.query.ipNftsTable.findFirst({
    where: eq(ipNftsTable.sequenceId, id),
    orderBy: [desc(ipNftsTable.mintedAt)],
  });

  const svg = buildNFTSvg(seq, nft);
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "no-cache");
  res.send(svg);
});

// POST /api/ipnft/prepare-metadata — upload NFT metadata to Pinata, return metadataUri
router.post("/ipnft/prepare-metadata", async (req, res) => {
  const { sequenceId, walletAddress } = req.body as { sequenceId: number; walletAddress?: string };
  if (!sequenceId) return res.status(400).json({ error: "sequenceId required" });

  const seq = await db.query.sequencesTable.findFirst({ where: eq(sequencesTable.id, sequenceId) });
  if (!seq) return res.status(404).json({ error: "Sequence not found" });

  const annotations = await db.select().from(annotationsTable)
    .where(eq(annotationsTable.sequenceId, sequenceId))
    .limit(50);

  const imageUri = `https://peptoma.xyz/api/ipnft/${sequenceId}/image.svg`;
  const name = `PEPTOMA IP-NFT #${sequenceId}`;
  const symbol = "IPNFT";

  const attributes = [
    { trait_type: "Bioactivity Label", value: seq.bioactivityLabel ?? "Unknown" },
    { trait_type: "Bioactivity Score", value: seq.bioactivityScore ?? 0 },
    { trait_type: "Confidence Score", value: seq.confidenceScore ?? 0 },
    { trait_type: "Analysis Depth", value: seq.depth ?? "standard" },
    { trait_type: "Structure Prediction", value: seq.structurePrediction ?? "unknown" },
    { trait_type: "Toxicity Risk", value: seq.toxicityRisk ?? "unknown" },
    { trait_type: "Sequence Length", value: seq.sequence?.length ?? 0 },
    { trait_type: "Disease Target", value: seq.diseaseTarget ?? "unspecified" },
    { trait_type: "Annotation Count", value: annotations.length },
    { trait_type: "Platform", value: "PEPTOMA DeSci" },
    { trait_type: "Blockchain", value: "Solana" },
  ];

  const metadata = {
    name,
    symbol,
    description: `PEPTOMA IP-NFT for peptide sequence #${sequenceId}. Bioactivity: ${seq.bioactivityLabel ?? "Unknown"} (score: ${seq.bioactivityScore}). Disease target: ${seq.diseaseTarget ?? "N/A"}. Backed by real research data with ${annotations.length} peer annotations. Powered by PEPTOMA DeSci Protocol.`,
    image: imageUri,
    animation_url: imageUri,
    external_url: `https://peptoma.xyz/annotate/${sequenceId}`,
    attributes,
    properties: {
      files: [{ uri: imageUri, type: "image/svg+xml" }],
      category: "image",
      creators: [{ address: walletAddress ?? "", share: 100 }],
    },
    seller_fee_basis_points: 250,
  };

  const PINATA_JWT = process.env.PINATA_JWT;
  let metadataUri = `https://peptoma.xyz/api/ipnft/${sequenceId}`;

  if (PINATA_JWT) {
    try {
      const pinRes = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${PINATA_JWT}` },
        body: JSON.stringify({
          pinataContent: metadata,
          pinataMetadata: {
            name: `peptoma-ipnft-${sequenceId}`,
            keyvalues: { sequenceId: String(sequenceId), platform: "PEPTOMA" },
          },
          pinataOptions: { cidVersion: 1 },
        }),
      });
      if (pinRes.ok) {
        const pinData = await pinRes.json() as { IpfsHash?: string };
        if (pinData.IpfsHash) metadataUri = `https://ipfs.io/ipfs/${pinData.IpfsHash}`;
      }
    } catch (e) {
      req.log.warn({ err: String(e) }, "Pinata upload failed, using fallback URI");
    }
  }

  req.log.info({ sequenceId, metadataUri }, "NFT metadata prepared");
  res.json({ metadataUri, name, symbol, imageUri, attributes });
});

// POST /api/ipnft/confirm-mint — record confirmed on-chain mint in DB
router.post("/ipnft/confirm-mint", async (req, res) => {
  const { sequenceId, walletAddress, mintAddress, txSignature, metadataUri, price } =
    req.body as {
      sequenceId: number;
      walletAddress: string;
      mintAddress: string;
      txSignature: string;
      metadataUri: string;
      price?: number;
    };

  if (!sequenceId || !walletAddress || !mintAddress || !txSignature) {
    return res.status(400).json({ error: "sequenceId, walletAddress, mintAddress, txSignature required" });
  }

  const seq = await db.query.sequencesTable.findFirst({ where: eq(sequencesTable.id, sequenceId) });
  if (!seq) return res.status(404).json({ error: "Sequence not found" });

  const existing = await db.query.ipNftsTable.findFirst({ where: eq(ipNftsTable.sequenceId, sequenceId) });
  if (existing) {
    return res.status(409).json({ error: "Already minted", nft: existing });
  }

  const [nft] = await db.insert(ipNftsTable).values({
    sequenceId,
    walletAddress,
    mintAddress,
    txSignature,
    metadataUri,
    status: "minted",
  }).returning();

  req.log.info({ sequenceId, mintAddress, walletAddress }, "PEPTOMA IP-NFT confirmed on-chain");

  if (price && price > 0) {
    await db.update(ipNftsTable)
      .set({ listed: true, price, listedAt: new Date() })
      .where(eq(ipNftsTable.id, nft.id));
    nft.listed = true;
    nft.price = price;
    nft.listedAt = new Date();
  }

  res.status(201).json({ success: true, nft });
});

// POST /api/ipnft/mint — server-side treasury mint, no wallet signature needed
router.post("/ipnft/mint", async (req, res) => {
  const { sequenceId, walletAddress, price } = req.body as {
    sequenceId: number;
    walletAddress: string;
    price?: number;
  };

  if (!sequenceId || !walletAddress) {
    return res.status(400).json({ error: "sequenceId and walletAddress required" });
  }

  // Validate walletAddress is a real Solana public key — reject anonymous IDs
  try {
    new PublicKey(walletAddress);
  } catch {
    return res.status(400).json({
      error: "invalid_wallet",
      message: "Connect your Solana wallet before minting — the address provided is not a valid Solana public key.",
    });
  }

  const seq = await db.query.sequencesTable.findFirst({ where: eq(sequencesTable.id, sequenceId) });
  if (!seq) return res.status(404).json({ error: "Sequence not found" });

  const existing = await db.query.ipNftsTable.findFirst({ where: eq(ipNftsTable.sequenceId, sequenceId) });
  if (existing) return res.status(409).json({ error: "Already minted", nft: existing });

  // Build metadata (same logic as prepare-metadata, inline here for atomicity)
  const annotations = await db.select().from(annotationsTable)
    .where(eq(annotationsTable.sequenceId, sequenceId)).limit(50);

  const imageUri = `https://peptoma.xyz/api/ipnft/${sequenceId}/image.svg`;
  const name = `PEPTOMA IP-NFT #${sequenceId}`;
  const symbol = "IPNFT";
  const metadata = {
    name, symbol,
    description: `PEPTOMA IP-NFT for peptide sequence #${sequenceId}. Bioactivity: ${seq.bioactivityLabel ?? "Unknown"} (score: ${seq.bioactivityScore}). Disease target: ${seq.diseaseTarget ?? "N/A"}. Backed by real research data with ${annotations.length} peer annotations.`,
    image: imageUri,
    animation_url: imageUri,
    external_url: `https://peptoma.xyz/annotate/${sequenceId}`,
    attributes: [
      { trait_type: "Bioactivity Label", value: seq.bioactivityLabel ?? "Unknown" },
      { trait_type: "Bioactivity Score", value: seq.bioactivityScore ?? 0 },
      { trait_type: "Confidence Score", value: seq.confidenceScore ?? 0 },
      { trait_type: "Analysis Depth", value: seq.depth ?? "standard" },
      { trait_type: "Structure Prediction", value: seq.structurePrediction ?? "unknown" },
      { trait_type: "Toxicity Risk", value: seq.toxicityRisk ?? "unknown" },
      { trait_type: "Sequence Length", value: seq.sequence?.length ?? 0 },
      { trait_type: "Disease Target", value: seq.diseaseTarget ?? "unspecified" },
      { trait_type: "Annotation Count", value: annotations.length },
      { trait_type: "Platform", value: "PEPTOMA DeSci" },
      { trait_type: "Blockchain", value: "Solana" },
    ],
    properties: {
      files: [{ uri: imageUri, type: "image/svg+xml" }],
      category: "image",
      creators: [{ address: walletAddress, share: 100 }],
    },
    seller_fee_basis_points: 250,
  };

  // Upload to Pinata
  let metadataUri = `https://peptoma.xyz/api/ipnft/${sequenceId}`;
  const PINATA_JWT = process.env.PINATA_JWT;
  if (PINATA_JWT) {
    try {
      const pinRes = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${PINATA_JWT}` },
        body: JSON.stringify({
          pinataContent: metadata,
          pinataMetadata: { name: `peptoma-ipnft-${sequenceId}` },
          pinataOptions: { cidVersion: 1 },
        }),
      });
      if (pinRes.ok) {
        const pinData = await pinRes.json() as { IpfsHash?: string };
        if (pinData.IpfsHash) metadataUri = `https://ipfs.io/ipfs/${pinData.IpfsHash}`;
      }
    } catch (e) {
      req.log.warn({ err: String(e) }, "Pinata upload failed, using fallback URI");
    }
  }

  // Pre-check: treasury wallet must have enough SOL
  // Metaplex creates 4 accounts (mint, metadata, master edition, token account) = ~0.019 SOL in rent alone.
  // Require 0.05 SOL to give comfortable headroom and cover repeated mints before next top-up.
  const MIN_LAMPORTS = 50_000_000; // 0.05 SOL
  const treasury = getTreasuryKeypair();
  const treasuryAddress = treasury.publicKey.toString();
  try {
    const checkConn = new Connection(MINT_RPC_ENDPOINTS[0], "confirmed");
    const balance = await checkConn.getBalance(treasury.publicKey);
    if (balance < MIN_LAMPORTS) {
      req.log.warn({ treasuryAddress, balance, required: MIN_LAMPORTS }, "Treasury wallet underfunded");
      return res.status(402).json({
        error: "treasury_underfunded",
        message: `Treasury wallet needs at least 0.05 SOL to mint. Current balance: ${(balance / 1e9).toFixed(4)} SOL.`,
        treasuryAddress,
        requiredSol: 0.05,
        currentSol: balance / 1e9,
      });
    }
  } catch (balanceErr) {
    req.log.warn({ err: String(balanceErr) }, "Could not check treasury balance — proceeding anyway");
  }

  // Mint on-chain via treasury keypair — no user wallet needed
  let mintAddress: string;
  let txSignature: string;

  try {
    const result = await mintOnChain({ metadataUri, name, symbol, ownerAddress: walletAddress });
    mintAddress = result.mintAddress;
    txSignature = result.txSignature;
    req.log.info({ sequenceId, mintAddress, walletAddress, treasuryAddress }, "PEPTOMA IP-NFT minted on-chain via treasury");
  } catch (mintErr) {
    const errMsg = mintErr instanceof Error ? mintErr.message : String(mintErr);
    req.log.error({ err: errMsg, sequenceId }, "On-chain mint failed");
    return res.status(502).json({ error: `On-chain mint failed: ${errMsg}` });
  }

  const [nft] = await db.insert(ipNftsTable).values({
    sequenceId,
    walletAddress,
    mintAddress,
    txSignature,
    metadataUri,
    status: "minted",
  }).returning();

  if (price && price > 0) {
    await db.update(ipNftsTable)
      .set({ listed: true, price, listedAt: new Date() })
      .where(eq(ipNftsTable.id, nft.id));
    nft.listed = true;
    nft.price = price;
    nft.listedAt = new Date();
  }

  res.status(201).json({ success: true, nft });
});

// POST /api/ipnft/:id/list — list an IP-NFT for sale
router.post("/ipnft/:id/list", async (req, res) => {
  const id = parseInt(req.params.id);
  const { price, walletAddress } = req.body as { price: number; walletAddress?: string };

  if (!id || !price || price <= 0) {
    return res.status(400).json({ error: "id and price > 0 required" });
  }

  const nft = await db.query.ipNftsTable.findFirst({ where: eq(ipNftsTable.id, id) });
  if (!nft) return res.status(404).json({ error: "NFT not found" });
  if (walletAddress && nft.walletAddress !== walletAddress) {
    return res.status(403).json({ error: "Not the owner" });
  }
  if (nft.soldAt) return res.status(409).json({ error: "NFT already sold" });

  const [updated] = await db
    .update(ipNftsTable)
    .set({ listed: true, price, listedAt: new Date() })
    .where(eq(ipNftsTable.id, id))
    .returning();

  req.log.info({ nftId: id, price }, "IP-NFT listed for sale");
  res.json({ success: true, nft: updated });
});

// POST /api/ipnft/:id/unlist — remove from marketplace
router.post("/ipnft/:id/unlist", async (req, res) => {
  const id = parseInt(req.params.id);
  const { walletAddress } = req.body as { walletAddress?: string };

  const nft = await db.query.ipNftsTable.findFirst({ where: eq(ipNftsTable.id, id) });
  if (!nft) return res.status(404).json({ error: "NFT not found" });
  if (walletAddress && nft.walletAddress !== walletAddress) {
    return res.status(403).json({ error: "Not the owner" });
  }

  const [updated] = await db
    .update(ipNftsTable)
    .set({ listed: false })
    .where(eq(ipNftsTable.id, id))
    .returning();

  res.json({ success: true, nft: updated });
});

// POST /api/ipnft/:id/buy — buy a listed IP-NFT with verified SOL payment
router.post("/ipnft/:id/buy", async (req, res) => {
  const id = parseInt(req.params.id);
  const { buyerWallet, txSig } = req.body as { buyerWallet?: string; txSig?: string };

  if (!id) return res.status(400).json({ error: "id required" });
  if (!buyerWallet) return res.status(400).json({ error: "buyerWallet required" });
  if (!txSig) return res.status(400).json({ error: "txSig required — send SOL to seller first" });

  const nft = await db.query.ipNftsTable.findFirst({ where: eq(ipNftsTable.id, id) });
  if (!nft) return res.status(404).json({ error: "NFT not found" });
  if (!nft.listed) return res.status(409).json({ error: "NFT not listed for sale" });
  if (nft.soldAt) return res.status(409).json({ error: "NFT already sold" });
  if (nft.walletAddress === buyerWallet) {
    return res.status(400).json({ error: "Cannot buy your own NFT" });
  }
  if (!nft.price || nft.price <= 0) {
    return res.status(400).json({ error: "NFT has no price set" });
  }

  // Verify the SOL payment transaction on-chain
  const rpc = MINT_RPC_ENDPOINTS[0];
  const conn = new Connection(rpc, "confirmed");

  try {
    const statuses = await conn.getSignatureStatuses([txSig], { searchTransactionHistory: true });
    const status = statuses.value[0];
    if (!status) {
      return res.status(400).json({ error: "Transaction not found on-chain. Please wait and retry." });
    }
    if (status.err) {
      return res.status(400).json({ error: "Transaction failed on-chain." });
    }

    // Parse transaction to verify SOL transferred to seller
    const tx = await conn.getParsedTransaction(txSig, { maxSupportedTransactionVersion: 0, commitment: "confirmed" });
    if (tx) {
      const sellerPk = new PublicKey(nft.walletAddress);
      const buyerPk = new PublicKey(buyerWallet);
      const expectedLamports = Math.round(nft.price * 1e9);

      // Check pre/post balances to verify buyer paid seller
      const accountKeys = tx.transaction.message.accountKeys.map(k => k.pubkey.toString());
      const sellerIdx = accountKeys.indexOf(sellerPk.toString());
      const buyerIdx = accountKeys.indexOf(buyerPk.toString());

      if (buyerIdx >= 0 && sellerIdx >= 0 && tx.meta) {
        const buyerPaid = (tx.meta.preBalances[buyerIdx] ?? 0) - (tx.meta.postBalances[buyerIdx] ?? 0);
        const sellerReceived = (tx.meta.postBalances[sellerIdx] ?? 0) - (tx.meta.preBalances[sellerIdx] ?? 0);

        // Buyer must have paid >= 95% of price (allow for fees), seller must have received
        const minRequired = expectedLamports * 0.95;
        if (buyerPaid < minRequired) {
          return res.status(400).json({ error: `Payment insufficient. Expected ~${nft.price} SOL, got ${(buyerPaid / 1e9).toFixed(4)} SOL.` });
        }
        if (sellerReceived <= 0) {
          return res.status(400).json({ error: "Seller did not receive payment in this transaction." });
        }
      }
    }
  } catch (e) {
    req.log.warn({ err: e, txSig }, "Could not fully verify buy txSig — allowing (RPC issue)");
  }

  const [updated] = await db
    .update(ipNftsTable)
    .set({
      listed: false,
      buyerWallet,
      soldAt: new Date(),
      walletAddress: buyerWallet,
    })
    .where(eq(ipNftsTable.id, id))
    .returning();

  req.log.info({ nftId: id, buyer: buyerWallet, price: nft.price, txSig }, "IP-NFT sold on-chain");
  res.json({ success: true, nft: updated, txSignature: txSig });
});

// GET /api/ipnft/owned — all NFTs owned by a wallet
router.get("/ipnft/owned", async (req, res) => {
  const wallet = req.query.wallet as string;
  if (!wallet) return res.status(400).json({ error: "wallet required" });

  const owned = await db
    .select({
      nft: ipNftsTable,
      seq: {
        id: sequencesTable.id,
        sequence: sequencesTable.sequence,
        bioactivityLabel: sequencesTable.bioactivityLabel,
        bioactivityScore: sequencesTable.bioactivityScore,
        confidenceScore: sequencesTable.confidenceScore,
        annotationCount: sequencesTable.annotationCount,
        diseaseTarget: sequencesTable.diseaseTarget,
      },
    })
    .from(ipNftsTable)
    .innerJoin(sequencesTable, eq(ipNftsTable.sequenceId, sequencesTable.id))
    .where(eq(ipNftsTable.walletAddress, wallet))
    .orderBy(desc(ipNftsTable.mintedAt));

  res.json({ owned });
});

// Backward-compat aliases (old Molecule Protocol URLs still work)
router.get("/molecule/ipnft/:sequenceId", async (req, res) => {
  res.redirect(301, req.path.replace("/molecule/ipnft/", "/ipnft/"));
});
router.get("/molecule/ipnft/:sequenceId/image.svg", async (req, res) => {
  res.redirect(301, req.path.replace("/molecule/ipnft/", "/ipnft/"));
});

export default router;
