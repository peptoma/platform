// Static SVG structural formula diagrams — no animation, no canvas.
// Drawn in standard chemistry style: atom circles + bond lines.

const ATOM_COLORS: Record<string, { bg: string; text: string }> = {
  C: { bg: "#059669", text: "#fff" },
  N: { bg: "#2563eb", text: "#fff" },
  O: { bg: "#ea580c", text: "#fff" },
  S: { bg: "#ca8a04", text: "#fff" },
};

type BondType = "single" | "double";

interface Atom { label: string; el: keyof typeof ATOM_COLORS }
interface Bond { from: number; to: number; type: BondType }

const MOLECULES: {
  name: string;
  formula: string;
  bio: string;
  atoms: Atom[];
  bonds: Bond[];
  aromatic: boolean;
}[] = [
  {
    name: "Imidazole",
    formula: "C₃H₄N₂",
    bio: "Histidine · Purine bases",
    atoms: [
      { label: "N", el: "N" },
      { label: "C", el: "C" },
      { label: "N", el: "N" },
      { label: "C", el: "C" },
      { label: "C", el: "C" },
    ],
    bonds: [
      { from: 0, to: 1, type: "single" },
      { from: 1, to: 2, type: "double" },
      { from: 2, to: 3, type: "single" },
      { from: 3, to: 4, type: "double" },
      { from: 4, to: 0, type: "single" },
    ],
    aromatic: true,
  },
  {
    name: "Furanose",
    formula: "C₄H₈O",
    bio: "Deoxyribose · DNA backbone",
    atoms: [
      { label: "O", el: "O" },
      { label: "C", el: "C" },
      { label: "C", el: "C" },
      { label: "C", el: "C" },
      { label: "C", el: "C" },
    ],
    bonds: [
      { from: 0, to: 1, type: "single" },
      { from: 1, to: 2, type: "single" },
      { from: 2, to: 3, type: "single" },
      { from: 3, to: 4, type: "single" },
      { from: 4, to: 0, type: "single" },
    ],
    aromatic: false,
  },
  {
    name: "Pyrrole",
    formula: "C₄H₅N",
    bio: "Heme · Porphyrin · Chlorophyll",
    atoms: [
      { label: "N", el: "N" },
      { label: "C", el: "C" },
      { label: "C", el: "C" },
      { label: "C", el: "C" },
      { label: "C", el: "C" },
    ],
    bonds: [
      { from: 0, to: 1, type: "single" },
      { from: 1, to: 2, type: "double" },
      { from: 2, to: 3, type: "single" },
      { from: 3, to: 4, type: "double" },
      { from: 4, to: 0, type: "single" },
    ],
    aromatic: true,
  },
  {
    name: "Thiazole",
    formula: "C₃H₃NS",
    bio: "Thiamine (B1) · Coenzyme A",
    atoms: [
      { label: "S", el: "S" },
      { label: "C", el: "C" },
      { label: "N", el: "N" },
      { label: "C", el: "C" },
      { label: "C", el: "C" },
    ],
    bonds: [
      { from: 0, to: 1, type: "single" },
      { from: 1, to: 2, type: "double" },
      { from: 2, to: 3, type: "single" },
      { from: 3, to: 4, type: "double" },
      { from: 4, to: 0, type: "single" },
    ],
    aromatic: true,
  },
];

// Compute regular pentagon vertices (top vertex first, clockwise)
function pentVerts(cx: number, cy: number, r: number) {
  return Array.from({ length: 5 }, (_, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / 5;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });
}

interface RingProps {
  cx: number;
  cy: number;
  r: number;
  atoms: Atom[];
  bonds: Bond[];
  aromatic: boolean;
}

function RingDiagram({ cx, cy, r, atoms, bonds, aromatic }: RingProps) {
  const verts = pentVerts(cx, cy, r);
  const atomR = r * 0.27; // atom circle radius
  const bondColor = "#334155";
  const bondW = 1.6;

  return (
    <g>
      {/* Aromatic inner dashed circle */}
      {aromatic && (
        <circle
          cx={cx}
          cy={cy}
          r={r * 0.46}
          fill="none"
          stroke={bondColor}
          strokeWidth={1}
          strokeDasharray="3 3"
          opacity={0.45}
        />
      )}

      {/* Bonds */}
      {bonds.map((b, i) => {
        const p1 = verts[b.from];
        const p2 = verts[b.to];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        // Shorten bond to not overlap atom circles
        const shrink = atomR + 2;
        const ux = dx / len;
        const uy = dy / len;
        const x1 = p1.x + ux * shrink;
        const y1 = p1.y + uy * shrink;
        const x2 = p2.x - ux * shrink;
        const y2 = p2.y - uy * shrink;

        if (b.type === "single") {
          return (
            <line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={bondColor}
              strokeWidth={bondW}
              strokeLinecap="round"
            />
          );
        }
        // double bond: two parallel lines offset perpendicular
        const nx = -uy * 2.8;
        const ny = ux * 2.8;
        return (
          <g key={i}>
            <line
              x1={x1 + nx} y1={y1 + ny} x2={x2 + nx} y2={y2 + ny}
              stroke={bondColor} strokeWidth={bondW} strokeLinecap="round"
            />
            <line
              x1={x1 - nx} y1={y1 - ny} x2={x2 - nx} y2={y2 - ny}
              stroke={bondColor} strokeWidth={bondW} strokeLinecap="round"
            />
          </g>
        );
      })}

      {/* Atom circles */}
      {atoms.map((atom, i) => {
        const { x, y } = verts[i];
        const col = ATOM_COLORS[atom.el] ?? ATOM_COLORS["C"];
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={atomR} fill={col.bg} />
            <text
              x={x} y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={atomR * 1.1}
              fontFamily="'Space Mono', 'Courier New', monospace"
              fontWeight="700"
              fill={col.text}
            >
              {atom.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

// Layout: 4 rings in a row inside a single SVG
const VB_W = 680;
const VB_H = 200;
const RING_R = 46;
const RING_Y = 90;
const RING_CXS = [85, 255, 425, 595];

export function PeptideChain({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full ${className}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {MOLECULES.map((mol, mi) => {
        const cx = RING_CXS[mi];
        return (
          <g key={mol.name}>
            <RingDiagram
              cx={cx}
              cy={RING_Y}
              r={RING_R}
              atoms={mol.atoms}
              bonds={mol.bonds}
              aromatic={mol.aromatic}
            />
            {/* Name */}
            <text
              x={cx} y={RING_Y + RING_R + 16}
              textAnchor="middle"
              fontSize="9.5"
              fontFamily="'Space Mono', monospace"
              fontWeight="700"
              fill="#334155"
            >
              {mol.name}
            </text>
            {/* Formula */}
            <text
              x={cx} y={RING_Y + RING_R + 29}
              textAnchor="middle"
              fontSize="8.5"
              fontFamily="'Space Mono', monospace"
              fill="#10b981"
            >
              {mol.formula}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// Element legend
export function AminoAcidLegend() {
  const elements = [
    { label: "Carbon (C)", color: "#059669" },
    { label: "Nitrogen (N)", color: "#2563eb" },
    { label: "Oxygen (O)", color: "#ea580c" },
    { label: "Sulfur (S)", color: "#ca8a04" },
  ];
  return (
    <div className="flex flex-wrap gap-4">
      {elements.map((e) => (
        <div key={e.label} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: e.color }} />
          <span className="text-[10px] font-mono text-muted-foreground tracking-wide">{e.label}</span>
        </div>
      ))}
    </div>
  );
}
