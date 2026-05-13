import { useEffect, useRef } from "react";

interface DnaHelixProps {
  width?: number;
  height?: number;
  className?: string;
}

export function DnaHelix({ width = 180, height = 420, className = "" }: DnaHelixProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    // On light background: use deeper greens and darker gold
    const STRAND1 = "hsl(145, 85%, 30%)";      // deep green
    const STRAND1_LITE = "hsl(145, 85%, 50%)";  // lighter for front nodes
    const STRAND2 = "hsl(38, 88%, 42%)";         // amber/gold
    const STRAND2_LITE = "hsl(38, 88%, 58%)";    // lighter for front nodes

    const amplitude = width * 0.27;
    const cx = width / 2;
    const wavelength = 88;
    const rungSpacing = 12;

    let offset = 0;
    let rafId: number;

    function draw() {
      ctx!.clearRect(0, 0, width, height);

      const numPoints = Math.ceil(height / rungSpacing) + 4;

      const strand1: { x: number; y: number; z: number }[] = [];
      const strand2: { x: number; y: number; z: number }[] = [];

      for (let i = 0; i < numPoints; i++) {
        const y = i * rungSpacing - (offset % rungSpacing);
        const t = (y / wavelength) * Math.PI * 2 + offset * 0.03;
        const sinT = Math.sin(t);

        strand1.push({ x: cx + amplitude * sinT, y, z: sinT });
        strand2.push({ x: cx - amplitude * sinT, y, z: -sinT });
      }

      // Base-pair rungs
      for (let i = 0; i < numPoints - 1; i++) {
        const p1 = strand1[i];
        const p2 = strand2[i];
        if (p1.y < -rungSpacing || p1.y > height + rungSpacing) continue;

        const depth = (p1.z + 1) / 2;
        const alpha = 0.08 + depth * 0.22;
        const lw = 0.6 + depth * 1.0;

        ctx!.beginPath();
        ctx!.moveTo(p1.x, p1.y);
        ctx!.lineTo(p2.x, p2.y);

        const grad = ctx!.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
        grad.addColorStop(0, `hsla(145, 85%, 30%, ${alpha})`);
        grad.addColorStop(0.5, `hsla(145, 85%, 45%, ${alpha * 0.6})`);
        grad.addColorStop(1, `hsla(38, 88%, 42%, ${alpha})`);

        ctx!.strokeStyle = grad;
        ctx!.lineWidth = lw;
        ctx!.stroke();

        // Mid node
        const mx = (p1.x + p2.x) / 2;
        const my = (p1.y + p2.y) / 2;
        if (Math.abs(p1.x - p2.x) > amplitude * 0.3) {
          ctx!.beginPath();
          ctx!.arc(mx, my, 1.2 + depth, 0, Math.PI * 2);
          ctx!.fillStyle = `hsla(145, 85%, 40%, ${alpha * 0.7})`;
          ctx!.fill();
        }
      }

      // Strand segments
      const drawStrand = (points: { x: number; y: number; z: number }[], primary: string, lite: string) => {
        for (let i = 0; i < points.length - 1; i++) {
          const p = points[i];
          const pNext = points[i + 1];
          if (p.y < -rungSpacing || p.y > height + rungSpacing) continue;

          const depth = (p.z + 1) / 2;
          const alpha = 0.35 + depth * 0.55;
          const lw = 1.2 + depth * 2;

          ctx!.beginPath();
          ctx!.moveTo(p.x, p.y);
          ctx!.lineTo(pNext.x, pNext.y);
          ctx!.strokeStyle = depth > 0.5 ? lite : primary;
          ctx!.globalAlpha = alpha;
          ctx!.lineWidth = lw;
          ctx!.lineCap = "round";
          ctx!.stroke();
          ctx!.globalAlpha = 1;
        }
      };

      drawStrand(strand1, STRAND1, STRAND1_LITE);
      drawStrand(strand2, STRAND2, STRAND2_LITE);

      // Nucleotide nodes
      for (let i = 0; i < numPoints; i++) {
        const p1 = strand1[i];
        const p2 = strand2[i];
        if (p1.y < 0 || p1.y > height) continue;

        const d1 = (p1.z + 1) / 2;
        const d2 = (p2.z + 1) / 2;

        // Strand 1 node
        ctx!.beginPath();
        ctx!.arc(p1.x, p1.y, 1.5 + d1 * 2, 0, Math.PI * 2);
        ctx!.fillStyle = d1 > 0.5 ? STRAND1_LITE : STRAND1;
        ctx!.globalAlpha = 0.5 + d1 * 0.45;
        ctx!.fill();
        ctx!.globalAlpha = 1;

        // Strand 2 node
        ctx!.beginPath();
        ctx!.arc(p2.x, p2.y, 1.5 + d2 * 2, 0, Math.PI * 2);
        ctx!.fillStyle = d2 > 0.5 ? STRAND2_LITE : STRAND2;
        ctx!.globalAlpha = 0.5 + d2 * 0.45;
        ctx!.fill();
        ctx!.globalAlpha = 1;
      }

      // Fade top & bottom (match white bg: #f4f6f8 ≈ rgb(244,246,248))
      const maskTop = ctx!.createLinearGradient(0, 0, 0, height * 0.14);
      maskTop.addColorStop(0, "rgba(244,246,248,1)");
      maskTop.addColorStop(1, "rgba(244,246,248,0)");
      ctx!.fillStyle = maskTop;
      ctx!.fillRect(0, 0, width, height * 0.14);

      const maskBottom = ctx!.createLinearGradient(0, height * 0.86, 0, height);
      maskBottom.addColorStop(0, "rgba(244,246,248,0)");
      maskBottom.addColorStop(1, "rgba(244,246,248,1)");
      ctx!.fillStyle = maskBottom;
      ctx!.fillRect(0, height * 0.86, width, height * 0.14);

      offset += 0.5;
      rafId = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(rafId);
  }, [width, height]);

  return <canvas ref={canvasRef} style={{ width, height }} className={className} />;
}
