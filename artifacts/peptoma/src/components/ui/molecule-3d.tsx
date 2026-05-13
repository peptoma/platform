import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Atom { el: string; x: number; y: number; z: number; color: string }
interface Bond { from: number; to: number; order: 1 | 2 }
interface MolData {
  id: string; name: string; formula: string; bio: string;
  mw: string; pka?: string; accent: string; desc: string;
  properties: { label: string; value: string }[];
  atoms: Atom[]; bonds: Bond[];
}

const R = 46;
const ANGLES = [90, 18, -54, -126, -198].map(d => (d * Math.PI) / 180);
const V = ANGLES.map(a => ({ x: R * Math.cos(a), y: -R * Math.sin(a), z: 0 }));

const C = "#6b7280", N = "#3b82f6", O = "#ef4444", S = "#d97706";

const MOLECULES: MolData[] = [
  {
    id: "imidazole", name: "Imidazole", formula: "C₃H₄N₂",
    bio: "Histidine · Purine", mw: "68.08 Da", pka: "6.04", accent: "#3b82f6",
    desc: "5-membered aromatic ring with two nitrogen atoms. Present in histidine side chains and at the catalytic site of serine proteases. Acts as both H-bond donor and acceptor near physiological pH.",
    properties: [
      { label: "Ring type", value: "Aromatic" }, { label: "π electrons", value: "6 (4n+2)" },
      { label: "pKa (BH⁺)", value: "6.04" }, { label: "MW", value: "68.08 Da" },
      { label: "Dipole", value: "3.61 D" }, { label: "Found in", value: "His, ATP, NAD⁺" },
    ],
    atoms: [
      { el: "N", ...V[0], color: N }, { el: "C", ...V[1], color: C },
      { el: "N", ...V[2], color: N }, { el: "C", ...V[3], color: C },
      { el: "C", ...V[4], color: C },
    ],
    bonds: [
      { from: 0, to: 1, order: 1 }, { from: 1, to: 2, order: 2 },
      { from: 2, to: 3, order: 1 }, { from: 3, to: 4, order: 2 },
      { from: 4, to: 0, order: 1 },
    ],
  },
  {
    id: "furanose", name: "Furanose", formula: "C₄H₈O",
    bio: "DNA/RNA sugar", mw: "88.11 Da", accent: "#f97316",
    desc: "5-membered oxygen-containing ring forming the backbone sugar of DNA (deoxyribose) and RNA (ribose). Exists in envelope or twist conformations. Essential for nucleotide polymerisation.",
    properties: [
      { label: "Ring type", value: "Non-aromatic" }, { label: "Conformation", value: "C2′-endo" },
      { label: "MW", value: "88.11 Da" }, { label: "Heteroatom", value: "O (×1)" },
      { label: "Bond angles", value: "~104.5°" }, { label: "Found in", value: "Ribose, Deoxyribose" },
    ],
    atoms: [
      { el: "O", ...V[0], color: O }, { el: "C", ...V[1], color: C },
      { el: "C", ...V[2], color: C }, { el: "C", ...V[3], color: C },
      { el: "C", ...V[4], color: C },
    ],
    bonds: [
      { from: 0, to: 1, order: 1 }, { from: 1, to: 2, order: 1 },
      { from: 2, to: 3, order: 1 }, { from: 3, to: 4, order: 1 },
      { from: 4, to: 0, order: 1 },
    ],
  },
  {
    id: "pyrrole", name: "Pyrrole", formula: "C₄H₅N",
    bio: "Heme · Chlorophyll", mw: "67.09 Da", accent: "#8b5cf6",
    desc: "Aromatic 5-membered ring with nitrogen donating its lone pair to the π system. Core building block of heme, chlorophyll, vitamin B12, and bile pigments. Nitrogen is non-basic unlike imidazole.",
    properties: [
      { label: "Ring type", value: "Aromatic" }, { label: "π electrons", value: "6 (4n+2)" },
      { label: "pKa (N-H)", value: "17.5" }, { label: "MW", value: "67.09 Da" },
      { label: "N lone pair", value: "In π system" }, { label: "Found in", value: "Heme, Chl-a, B12" },
    ],
    atoms: [
      { el: "N", ...V[0], color: N }, { el: "C", ...V[1], color: C },
      { el: "C", ...V[2], color: C }, { el: "C", ...V[3], color: C },
      { el: "C", ...V[4], color: C },
    ],
    bonds: [
      { from: 0, to: 1, order: 1 }, { from: 1, to: 2, order: 2 },
      { from: 2, to: 3, order: 1 }, { from: 3, to: 4, order: 2 },
      { from: 4, to: 0, order: 1 },
    ],
  },
  {
    id: "thiazole", name: "Thiazole", formula: "C₃H₃NS",
    bio: "Vitamin B1", mw: "85.13 Da", pka: "2.44", accent: "#d97706",
    desc: "5-membered aromatic ring with both N and S heteroatoms. Central scaffold in thiamine (B1) and many antibiotics including bleomycin. Sulfur's larger p-orbitals give unique electronic properties.",
    properties: [
      { label: "Ring type", value: "Aromatic" }, { label: "π electrons", value: "6 (4n+2)" },
      { label: "pKa (BH⁺)", value: "2.44" }, { label: "MW", value: "85.13 Da" },
      { label: "Heteroatoms", value: "N + S" }, { label: "Found in", value: "Thiamine (B1), Bleomycin" },
    ],
    atoms: [
      { el: "N", ...V[0], color: N }, { el: "C", ...V[1], color: C },
      { el: "S", ...V[2], color: S }, { el: "C", ...V[3], color: C },
      { el: "C", ...V[4], color: C },
    ],
    bonds: [
      { from: 0, to: 1, order: 2 }, { from: 1, to: 2, order: 1 },
      { from: 2, to: 3, order: 1 }, { from: 3, to: 4, order: 2 },
      { from: 4, to: 0, order: 1 },
    ],
  },
];

function ry(p: { x: number; y: number; z: number }, a: number) {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c };
}
function rx(p: { x: number; y: number; z: number }, a: number) {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
}
function proj(p: { x: number; y: number; z: number }, cx: number, cy: number, f = 260) {
  const zf = p.z + f;
  const sc = f / zf;
  return { px: cx + p.x * sc, py: cy + p.y * sc, scale: sc, pz: p.z };
}

function MoleculeCanvas({ mol, active }: { mol: MolData; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const angleRef = useRef(Math.random() * Math.PI * 2);
  const speedRef = useRef(0.022);

  useEffect(() => { speedRef.current = active ? 0.006 : 0.022; }, [active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height, cx = W / 2, cy = H / 2;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      angleRef.current += speedRef.current;
      const a = angleRef.current;

      const pts = mol.atoms.map(atom => {
        let p = { x: atom.x, y: atom.y, z: atom.z };
        p = ry(p, a);
        p = rx(p, 0.38);
        return { ...atom, ...proj(p, cx, cy) };
      });

      const sortedBonds = [...mol.bonds].sort((ba, bb) => {
        const za = (pts[ba.from].pz + pts[ba.to].pz) / 2;
        const zb = (pts[bb.from].pz + pts[bb.to].pz) / 2;
        return za - zb;
      });

      for (const bond of sortedBonds) {
        const a0 = pts[bond.from], a1 = pts[bond.to];
        const avgZ = (a0.pz + a1.pz) / 2;
        const alpha = Math.max(0.2, Math.min(0.7, 0.4 + 0.25 * ((avgZ + 55) / 110)));
        ctx.globalAlpha = alpha;

        if (bond.order === 2) {
          const dx = a1.px - a0.px, dy = a1.py - a0.py;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx = (-dy / len) * 3.5, ny = (dx / len) * 3.5;
          for (const [ox, oy] of [[nx, ny], [-nx, -ny]]) {
            ctx.beginPath();
            ctx.moveTo(a0.px + ox, a0.py + oy);
            ctx.lineTo(a1.px + ox, a1.py + oy);
            ctx.strokeStyle = "#94a3b8";
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        } else {
          ctx.beginPath();
          ctx.moveTo(a0.px, a0.py);
          ctx.lineTo(a1.px, a1.py);
          ctx.strokeStyle = "#94a3b8";
          ctx.lineWidth = 2.2;
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      const sorted = [...pts].sort((a, b) => a.pz - b.pz);
      for (const atom of sorted) {
        const baseR = atom.el === "S" ? 12 : atom.el === "O" ? 10.5 : atom.el === "N" ? 10 : 8.5;
        const r = baseR * atom.scale;
        const alpha = Math.max(0.45, Math.min(1, 0.65 + 0.35 * ((atom.pz + 55) / 110)));

        if (active) {
          const glow = ctx.createRadialGradient(atom.px, atom.py, 0, atom.px, atom.py, r * 3);
          glow.addColorStop(0, atom.color + "35");
          glow.addColorStop(1, "transparent");
          ctx.beginPath();
          ctx.arc(atom.px, atom.py, r * 3, 0, Math.PI * 2);
          ctx.fillStyle = glow;
          ctx.fill();
        }

        const grad = ctx.createRadialGradient(
          atom.px - r * 0.3, atom.py - r * 0.35, r * 0.08,
          atom.px, atom.py, r
        );
        grad.addColorStop(0, atom.color + "ff");
        grad.addColorStop(0.65, atom.color + "d0");
        grad.addColorStop(1, atom.color + "55");

        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(atom.px, atom.py, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.font = `bold ${Math.max(8, Math.round(10.5 * atom.scale))}px monospace`;
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(atom.el, atom.px, atom.py);
        ctx.globalAlpha = 1;
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [mol]);

  return (
    <canvas
      ref={canvasRef}
      width={160}
      height={160}
      className="w-full h-full"
    />
  );
}

export function MoleculeViewer3D() {
  const [selected, setSelected] = useState<string | null>(null);
  const active = MOLECULES.find(m => m.id === selected);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {MOLECULES.map(mol => {
          const isActive = selected === mol.id;
          return (
            <motion.button
              key={mol.id}
              onClick={() => setSelected(prev => prev === mol.id ? null : mol.id)}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className={cn(
                "relative flex flex-col items-center rounded-xl border p-3 transition-all duration-200 text-left cursor-pointer",
                isActive
                  ? "border-[hsl(var(--peptoma-cyan))/60] bg-[hsl(var(--peptoma-cyan))/5] shadow-lg shadow-[hsl(var(--peptoma-cyan))/8]"
                  : "border-border bg-card hover:border-[hsl(var(--peptoma-cyan))/35] hover:bg-muted/30"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeDot"
                  className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[hsl(var(--peptoma-cyan))]"
                  style={{ boxShadow: "0 0 6px hsl(var(--peptoma-cyan))" }}
                />
              )}
              <div className="w-full h-[130px]">
                <MoleculeCanvas mol={mol} active={isActive} />
              </div>
              <div className="w-full text-center mt-1 space-y-0.5">
                <p className="font-mono font-bold text-xs text-foreground">{mol.name}</p>
                <p className="font-mono text-[9px]" style={{ color: mol.accent }}>{mol.formula}</p>
                <p className="font-mono text-[9px] text-muted-foreground">{mol.bio}</p>
              </div>
              <div className="mt-2 text-[9px] font-mono text-muted-foreground/60">
                {isActive ? "↑ click to close" : "click for details"}
              </div>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {active && (
          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="rounded-xl border bg-card overflow-hidden"
            style={{ borderColor: active.accent + "40" }}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: active.accent + "25", background: active.accent + "08" }}>
              <div className="flex items-center gap-3">
                <div className="w-0.5 h-5 rounded-full" style={{ background: active.accent }} />
                <span className="font-mono font-bold text-sm text-foreground">{active.name}</span>
                <span className="font-mono text-sm" style={{ color: active.accent }}>{active.formula}</span>
                {active.pka && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-border text-muted-foreground">
                    pKa {active.pka}
                  </span>
                )}
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-border text-muted-foreground">
                  {active.mw}
                </span>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="w-6 h-6 flex items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <p className="text-xs font-mono text-muted-foreground leading-relaxed max-w-3xl">
                {active.desc}
              </p>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-x-4 gap-y-3 pt-1 border-t border-border">
                {active.properties.map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[9px] font-mono text-muted-foreground tracking-widest uppercase">{label}</p>
                    <p className="text-xs font-mono font-bold text-foreground mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap gap-3 px-1">
        {[
          { el: "C", color: "#6b7280", label: "Carbon (C)" },
          { el: "N", color: "#3b82f6", label: "Nitrogen (N)" },
          { el: "O", color: "#ef4444", label: "Oxygen (O)" },
          { el: "S", color: "#d97706", label: "Sulfur (S)" },
        ].map(({ el, color, label }) => (
          <div key={el} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: color }} />
            <span className="text-[9px] font-mono text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
