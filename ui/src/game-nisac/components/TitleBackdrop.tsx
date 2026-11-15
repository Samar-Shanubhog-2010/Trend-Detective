import { useEffect, useRef } from 'react';

interface TitleBackdropProps {
  active: boolean;
  theme?: 'dark' | 'light';
}

export function TitleBackdrop({ active, theme = 'dark' }: TitleBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const isLight = theme === 'light';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let rafId = 0;
    let phase = 0;
    let lastTime = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const onPointerMove = (e: PointerEvent) => {
      const w = window.innerWidth || 1440;
      const h = window.innerHeight || 900;
      pointerRef.current.x = (e.clientX / w - 0.5) * 2;
      pointerRef.current.y = (e.clientY / h - 0.5) * 2;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    // Precomputed deterministic station dots on unit sphere (lat, lon)
    const stations: Array<{ lat: number; lon: number; tone: string }> = [
      { lat: -10.5, lon: -61, tone: '#f59e0b' }, // Amazon
      { lat: 39.9, lon: 116.4, tone: '#10b981' }, // Beijing
      { lat: 78.0, lon: -145, tone: '#06b6d4' }, // Arctic
      { lat: 14.5, lon: 2, tone: '#f59e0b' }, // Sahel
      { lat: 28.6, lon: 77.2, tone: '#f43f5e' }, // Delhi
      { lat: 38.3, lon: -76.2, tone: '#06b6d4' }, // Chesapeake
      { lat: -23, lon: 133, tone: '#38bdf8' },
      { lat: 48, lon: 11, tone: '#38bdf8' },
      { lat: -34, lon: 18, tone: '#38bdf8' },
      { lat: 35, lon: -110, tone: '#38bdf8' },
      { lat: 60, lon: 95, tone: '#38bdf8' },
      { lat: -15, lon: -47, tone: '#38bdf8' },
    ];

    const renderFrame = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0), 0.05);
      if (active && !reducedMotion) {
        phase += dt * 0.22;
      }

      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;

      ctx.clearRect(0, 0, w, h);

      // Deep orbital backdrop gradient (dark vs daylight sky)
      const bgGrad = ctx.createRadialGradient(
        w * 0.72,
        h * 0.48,
        40,
        w * 0.65,
        h * 0.5,
        Math.max(w, h) * 0.85,
      );
      if (isLight) {
        bgGrad.addColorStop(0, '#bae6fd');
        bgGrad.addColorStop(0.55, '#e2e8f0');
        bgGrad.addColorStop(1, '#f1f5f9');
      } else {
        bgGrad.addColorStop(0, '#122038');
        bgGrad.addColorStop(0.55, '#0b111e');
        bgGrad.addColorStop(1, '#070b14');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Keep left ~40% calm negative space for title lockup; position Earth on right ~68%
      const isNarrow = w < 900;
      const cx = (isNarrow ? w * 0.5 : w * 0.7) + pointerRef.current.x * 10;
      const cy = (isNarrow ? h * 0.68 : h * 0.5) + pointerRef.current.y * 8;
      const radius = isNarrow ? Math.min(w, h) * 0.26 : Math.min(w * 0.26, h * 0.37);

      // Subtle atmospheric halo
      const halo = ctx.createRadialGradient(cx, cy, radius * 0.88, cx, cy, radius * 1.24);
      halo.addColorStop(0, isLight ? 'rgba(2, 132, 199, 0.22)' : 'rgba(6, 182, 212, 0.16)');
      halo.addColorStop(0.6, isLight ? 'rgba(2, 132, 199, 0.08)' : 'rgba(6, 182, 212, 0.05)');
      halo.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.24, 0, Math.PI * 2);
      ctx.fill();

      // Globe body
      const sphereGrad = ctx.createRadialGradient(
        cx - radius * 0.35,
        cy - radius * 0.35,
        radius * 0.1,
        cx,
        cy,
        radius,
      );
      if (isLight) {
        sphereGrad.addColorStop(0, '#0ea5e9');
        sphereGrad.addColorStop(0.62, '#0284c7');
        sphereGrad.addColorStop(1, '#075985');
      } else {
        sphereGrad.addColorStop(0, '#162947');
        sphereGrad.addColorStop(0.7, '#0f1b30');
        sphereGrad.addColorStop(1, '#09101d');
      }
      ctx.fillStyle = sphereGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = isLight ? 'rgba(7, 89, 133, 0.55)' : 'rgba(56, 189, 248, 0.28)';
      ctx.lineWidth = 1.25;
      ctx.stroke();

      // Clip interior for graticule lines
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 1, 0, Math.PI * 2);
      ctx.clip();

      const tilt = 0.34;
      const cosTilt = Math.cos(tilt);
      const sinTilt = Math.sin(tilt);

      const project = (latDeg: number, lonDeg: number) => {
        const lat = (latDeg * Math.PI) / 180;
        const lon = (lonDeg * Math.PI) / 180 + phase;
        const x0 = Math.cos(lat) * Math.sin(lon);
        const y0 = Math.sin(lat);
        const z0 = Math.cos(lat) * Math.cos(lon);

        const y1 = y0 * cosTilt - z0 * sinTilt;
        const z1 = y0 * sinTilt + z0 * cosTilt;
        return {
          x: cx + x0 * radius,
          y: cy - y1 * radius,
          z: z1,
        };
      };

      // Latitude parallels
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        let started = false;
        for (let lon = -180; lon <= 180; lon += 6) {
          const p = project(lat, lon - (phase * 180) / Math.PI);
          if (p.z > 0) {
            if (!started) {
              ctx.moveTo(p.x, p.y);
              started = true;
            } else {
              ctx.lineTo(p.x, p.y);
            }
          } else {
            started = false;
          }
        }
        ctx.lineWidth = lat === 0 ? (isLight ? 1.6 : 1.1) : isLight ? 1.15 : 1;
        ctx.strokeStyle = isLight
          ? lat === 0
            ? 'rgba(255, 255, 255, 0.85)'
            : 'rgba(255, 255, 255, 0.48)'
          : lat === 0
            ? 'rgba(6, 182, 212, 0.25)'
            : 'rgba(148, 163, 184, 0.12)';
        ctx.stroke();
      }

      // Rotating meridians (longitudes)
      for (let lon = 0; lon < 360; lon += 30) {
        ctx.beginPath();
        let started = false;
        for (let lat = -84; lat <= 84; lat += 6) {
          const p = project(lat, lon);
          if (p.z > 0) {
            if (!started) {
              ctx.moveTo(p.x, p.y);
              started = true;
            } else {
              ctx.lineTo(p.x, p.y);
            }
          } else {
            started = false;
          }
        }
        ctx.lineWidth = lon === 0 ? (isLight ? 1.4 : 1) : isLight ? 1.15 : 1;
        ctx.strokeStyle = isLight
          ? lon === 0
            ? 'rgba(255, 255, 255, 0.78)'
            : 'rgba(255, 255, 255, 0.44)'
          : 'rgba(148, 163, 184, 0.11)';
        ctx.stroke();
      }

      // Subtle climate data wave bands across globe
      for (let band = 0; band < 3; band++) {
        ctx.beginPath();
        const baseLat = -25 + band * 28;
        let started = false;
        for (let lon = -180; lon <= 180; lon += 5) {
          const waveLat =
            baseLat + Math.sin((lon * Math.PI) / 60 + phase * 3 + band) * 7;
          const p = project(waveLat, lon);
          if (p.z > 0.05) {
            if (!started) {
              ctx.moveTo(p.x, p.y);
              started = true;
            } else {
              ctx.lineTo(p.x, p.y);
            }
          } else {
            started = false;
          }
        }
        ctx.strokeStyle = isLight
          ? band === 1
            ? 'rgba(254, 240, 138, 0.72)'
            : 'rgba(224, 242, 254, 0.65)'
          : band === 1
            ? 'rgba(245, 158, 11, 0.28)'
            : 'rgba(6, 182, 212, 0.26)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Observation station nodes
      for (const st of stations) {
        const p = project(st.lat, st.lon);
        if (p.z > 0.08) {
          ctx.fillStyle = st.tone;
          ctx.globalAlpha = Math.min(1, 0.35 + p.z * 0.65);
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = st.tone;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 7.5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }

      ctx.restore();

      // Tilted satellite orbital ring around globe
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.36);
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.32, radius * 0.34, 0, 0, Math.PI * 2);
      ctx.strokeStyle = isLight ? 'rgba(3, 105, 161, 0.35)' : 'rgba(56, 189, 248, 0.22)';
      ctx.setLineDash([4, 6]);
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.setLineDash([]);

      // Orbiting Earth-observation satellite icon
      const satAngle = phase * 2.1;
      const sx = Math.cos(satAngle) * radius * 1.32;
      const sy = Math.sin(satAngle) * radius * 0.34;
      ctx.fillStyle = isLight ? '#0f172a' : '#e2e8f0';
      ctx.fillRect(sx - 3, sy - 3, 6, 6);
      ctx.fillStyle = isLight ? '#0284c7' : '#06b6d4';
      ctx.fillRect(sx - 11, sy - 1.5, 6, 3);
      ctx.fillRect(sx + 5, sy - 1.5, 6, 3);
      ctx.restore();

      if (active && !reducedMotion) {
        rafId = requestAnimationFrame(renderFrame);
      }
    };

    rafId = requestAnimationFrame(renderFrame);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, [active, isLight]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 h-full w-full pointer-events-none"
    />
  );
}
