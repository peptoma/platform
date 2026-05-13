import { useEffect, useRef, memo } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  label: string;
  pulsePhase: number;
  type: "atom" | "node";
}

const SINGLE = ["A","R","N","D","C","Q","E","G","H","I","L","K","M","F","P","S","T","W","Y","V"];

const R = 0, G = 155, B = 75;

const MAX_PARTICLES = 60;

export const MoleculeNetwork = memo(function MoleculeNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: Particle[] = [];
    let rafId: number;
    let t = 0;
    let resizeTimer: ReturnType<typeof setTimeout>;

    const init = () => {
      particles = [];
      const rawCount = Math.floor((canvas.width * canvas.height) / 20000);
      const count = Math.min(rawCount, MAX_PARTICLES);
      for (let i = 0; i < count; i++) {
        const isAtom = Math.random() < 0.3;
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.22,
          size: isAtom ? Math.random() * 2.5 + 2 : Math.random() * 1.2 + 0.8,
          opacity: Math.random() * 0.2 + 0.06,
          label: SINGLE[Math.floor(Math.random() * SINGLE.length)],
          pulsePhase: Math.random() * Math.PI * 2,
          type: isAtom ? "atom" : "node",
        });
      }
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(init, 150);
    };

    const CONNECT_DIST = 110;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += 0.016;

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DIST) {
            const alpha = (1 - dist / CONNECT_DIST) * 0.09;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(${R},${G},${B},${alpha})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      }

      for (const p of particles) {
        const pulse = 1 + Math.sin(t * 1.1 + p.pulsePhase) * 0.12;

        if (p.type === "atom") {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 3.5 * pulse, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${R},${G},${B},${p.opacity * 0.28})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2.0 * pulse, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${R},${G},${B},${p.opacity * 0.45})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * pulse, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${R},${G},${B},${p.opacity * 0.85})`;
          ctx.fill();

          if (p.size > 2.8) {
            ctx.font = `${6 + p.size}px monospace`;
            ctx.fillStyle = `rgba(${R},${G},${B},${p.opacity * 0.6})`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(p.label, p.x, p.y + p.size * 4.5 * pulse);
          }
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * pulse, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${R},${G},${B},${p.opacity * 0.7})`;
          ctx.fill();
        }

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -20) p.x = canvas.width + 20;
        if (p.x > canvas.width + 20) p.x = -20;
        if (p.y < -20) p.y = canvas.height + 20;
        if (p.y > canvas.height + 20) p.y = -20;
      }

      rafId = requestAnimationFrame(draw);
    };

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    init();
    draw();
    window.addEventListener("resize", resize, { passive: true });

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafId);
      clearTimeout(resizeTimer);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[-1] opacity-70"
    />
  );
});
