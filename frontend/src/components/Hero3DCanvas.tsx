import React, { useEffect, useRef } from 'react';

/**
 * Hero3DCanvas — Lightweight geometric node constellation canvas.
 * Renders an animated, interactive healthcare queue network mesh.
 * Extremely fast with zero lag (using pure HTML5 2D context with 3D projection math).
 */
export const Hero3DCanvas: React.FC<{ className?: string }> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth * window.devicePixelRatio);
    let height = (canvas.height = canvas.offsetHeight * window.devicePixelRatio);

    // Particle / node definitions
    const numPoints = 28;
    const points: Array<{ x: number; y: number; z: number; vx: number; vy: number; vz: number; pulse: number }> = [];

    for (let i = 0; i < numPoints; i++) {
      points.push({
        x: (Math.random() - 0.5) * 400,
        y: (Math.random() - 0.5) * 300,
        z: (Math.random() - 0.5) * 400,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        vz: (Math.random() - 0.5) * 0.4,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    let angleX = 0;
    let angleY = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      angleY += 0.003;
      angleX = Math.sin(angleY * 0.5) * 0.15;

      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);

      const fov = 450;
      const projected: Array<{ px: number; py: number; scale: number; p: typeof points[0] }> = [];

      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;
        p.pulse += 0.04;

        if (p.x < -200 || p.x > 200) p.vx *= -1;
        if (p.y < -150 || p.y > 150) p.vy *= -1;
        if (p.z < -200 || p.z > 200) p.vz *= -1;

        // 3D rotation
        let x1 = p.x * cosY - p.z * sinY;
        let z1 = p.z * cosY + p.x * sinY;
        let y1 = p.y * cosX - z1 * sinX;
        let z2 = z1 * cosX + p.y * sinX;

        const distance = 400;
        const scale = fov / (fov + z2 + distance);
        const px = x1 * scale + width / 2;
        const py = y1 * scale + height / 2;

        projected.push({ px, py, scale, p });
      }

      // Draw connecting network lines
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const p1 = projected[i];
          const p2 = projected[j];
          const dx = p1.px - p2.px;
          const dy = p1.py - p2.py;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 90 * window.devicePixelRatio) {
            const alpha = (1 - dist / (90 * window.devicePixelRatio)) * 0.25;
            ctx.strokeStyle = `rgba(16, 185, 129, ${alpha})`;
            ctx.lineWidth = 1 * window.devicePixelRatio;
            ctx.beginPath();
            ctx.moveTo(p1.px, p1.py);
            ctx.lineTo(p2.px, p2.py);
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      for (let i = 0; i < projected.length; i++) {
        const { px, py, scale, p } = projected[i];
        const radius = (3.5 + Math.sin(p.pulse) * 1.2) * scale * window.devicePixelRatio;

        const grad = ctx.createRadialGradient(px, py, 0, px, py, radius * 2);
        grad.addColorStop(0, 'rgba(20, 184, 166, 0.9)');
        grad.addColorStop(1, 'rgba(16, 185, 129, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, radius * 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(px, py, Math.max(1, radius * 0.7), 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      height = canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full pointer-events-none ${className}`}
    />
  );
};
