import React from 'react';
import { useGameStore } from '../../world/state';

export function EffectsLayer(props: { rows: number; cols: number; cellSize: number; gap?: number }): JSX.Element {
  const { rows, cols, cellSize, gap = 4 } = props;
  const effects = useGameStore((s) => s.effects);
  const phase = useGameStore((s) => s.phase);
  const paused = useGameStore((s) => s.paused || false);

  // animation ticker for smooth projectile motion (decoupled from game tick)
  const [animNow, setAnimNow] = React.useState(0);
  React.useEffect(() => {
    if (phase !== 'combat' || effects.length === 0) return;
    let raf = 0;
    const loop = () => {
      if (!useGameStore.getState().paused) setAnimNow(performance.now());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, effects.length]);

  // purge expired effects each frame without forcing extra updates
  React.useEffect(() => {
    const id = requestAnimationFrame(() => {
      useGameStore.setState((prev) => {
        const now = performance.now();
        const filtered = prev.effects.filter((fx) => now - fx.startedAt < fx.durationMs + 20);
        if (filtered.length === prev.effects.length) return prev;
        return { ...prev, effects: filtered };
      });
    });
    return () => cancelAnimationFrame(id);
  }, [animNow]);

  const width = cols * cellSize + (cols - 1) * gap;
  const height = rows * cellSize + (rows - 1) * gap;

  return (
    <svg width={width} height={height} style={{ position: 'absolute', inset: 8, pointerEvents: 'none' }}>
      {effects.map((fx) => {
        if ((fx as any).type === 'special') {
          const t = Math.min(1, (animNow - (fx as any).startedAt) / (fx as any).durationMs);
          const x = (fx as any).at.c * (cellSize + gap) + cellSize / 2;
          const y = (fx as any).at.r * (cellSize + gap) + cellSize / 2;
          const isSynergy = (fx as any).power === 'synergy';
          const size = Math.max(6, cellSize * 0.28) * ((fx as any).sizeScale ?? 1) * (isSynergy ? 1.35 : 1);
          const color = (fx as any).color;
          const color2 = (fx as any).color2 || color;
          const shape = (fx as any).shape || 'rune';
          const rot = (fx as any).rotate ? (t * 360) : 0;
          const fade = 1 - t;
          const thick = Math.max(2, cellSize * 0.04) * (isSynergy ? 1.2 : 1);
          if (shape === 'crest') {
            return (
              <g key={(fx as any).id} opacity={(isSynergy ? 1 : 0.8) * fade} transform={`rotate(${rot.toFixed(1)}, ${x}, ${y})`}>
                <path d={`M ${x} ${y - size * 0.8} Q ${x + size * 0.5} ${y - size * 0.4}, ${x + size * 0.36} ${y} Q ${x} ${y + size}, ${x - size * 0.36} ${y} Q ${x - size * 0.5} ${y - size * 0.4}, ${x} ${y - size * 0.8}`} fill={color} opacity={0.15} />
                <path d={`M ${x} ${y - size * 0.7} Q ${x + size * 0.4} ${y - size * 0.3}, ${x + size * 0.28} ${y} Q ${x} ${y + size * 0.8}, ${x - size * 0.28} ${y} Q ${x - size * 0.4} ${y - size * 0.3}, ${x} ${y - size * 0.7}`} stroke={color} strokeWidth={thick} fill="none" />
              </g>
            );
          }
          if (shape === 'reticle') {
            return (
              <g key={(fx as any).id} opacity={0.9 * fade}>
                <circle cx={x} cy={y} r={size} stroke={color} strokeWidth={thick} fill="none" />
                <line x1={x - size} y1={y} x2={x - size * 0.4} y2={y} stroke={color2} strokeWidth={thick * 0.8} />
                <line x1={x + size * 0.4} y1={y} x2={x + size} y2={y} stroke={color2} strokeWidth={thick * 0.8} />
                <line x1={x} y1={y - size} x2={x} y2={y - size * 0.4} stroke={color2} strokeWidth={thick * 0.8} />
                <line x1={x} y1={y + size * 0.4} x2={x} y2={y + size} stroke={color2} strokeWidth={thick * 0.8} />
              </g>
            );
          }
          if (shape === 'rune') {
            return (
              <g key={(fx as any).id} opacity={0.85 * fade} transform={`rotate(${rot.toFixed(1)}, ${x}, ${y})`}>
                <circle cx={x} cy={y} r={size * 0.8} stroke={color} strokeWidth={thick} fill="none" />
                <polygon points={`${x},${y - size * 0.6} ${x + size * 0.2},${y - size * 0.2} ${x + size * 0.6},${y} ${x + size * 0.2},${y + size * 0.2} ${x},${y + size * 0.6} ${x - size * 0.2},${y + size * 0.2} ${x - size * 0.6},${y} ${x - size * 0.2},${y - size * 0.2}`} fill={color2} opacity={0.3} />
              </g>
            );
          }
          if (shape === 'leaf') {
            return (
              <g key={(fx as any).id} opacity={0.85 * fade}>
                <path d={`M ${x} ${y - size * 0.6} q ${size * 0.6} ${-size * 0.4} 0 ${-size} q ${-size * 0.6} ${size * 0.4} 0 ${size}`} fill={color} opacity={0.18} />
                <path d={`M ${x - size * 0.18} ${y - size * 0.2} q ${size * 0.28} ${-size * 0.18} 0 ${-size * 0.42}`} stroke={color2} strokeWidth={thick * 0.8} fill="none" />
              </g>
            );
          }
          if (shape === 'snow') {
            return (
              <g key={(fx as any).id} opacity={0.9 * fade} transform={`rotate(${rot.toFixed(1)}, ${x}, ${y})`}>
                <circle cx={x} cy={y} r={size * 0.7} stroke={color} strokeWidth={thick} fill="none" />
                <line x1={x - size * 0.6} y1={y} x2={x + size * 0.6} y2={y} stroke={color2} strokeWidth={thick * 0.8} />
                <line x1={x} y1={y - size * 0.6} x2={x} y2={y + size * 0.6} stroke={color2} strokeWidth={thick * 0.8} />
                <line x1={x - size * 0.42} y1={y - size * 0.42} x2={x + size * 0.42} y2={y + size * 0.42} stroke={color2} strokeWidth={thick * 0.8} />
                <line x1={x - size * 0.42} y1={y + size * 0.42} x2={x + size * 0.42} y2={y - size * 0.42} stroke={color2} strokeWidth={thick * 0.8} />
              </g>
            );
          }
          if (shape === 'lightning') {
            return (
              <g key={(fx as any).id} opacity={0.9 * fade}>
                <polyline points={`${x - size * 0.5},${y - size * 0.2} ${x - size * 0.1},${y - size * 0.5} ${x + size * 0.2},${y - size * 0.1} ${x + size * 0.5},${y - size * 0.4}`} fill="none" stroke={color} strokeWidth={thick * 0.8} />
                <polyline points={`${x - size * 0.4},${y + size * 0.2} ${x - size * 0.1},${y - size * 0.1} ${x + size * 0.2},${y + size * 0.1} ${x + size * 0.4},${y - size * 0.2}`} fill="none" stroke={color2} strokeWidth={thick * 0.6} />
              </g>
            );
          }
          return null;
        }
        if ((fx as any).type === 'text') {
          const t = Math.min(1, (animNow - (fx as any).startedAt) / (fx as any).durationMs);
          const x = (fx as any).at.c * (cellSize + gap) + cellSize / 2;
          const y = (fx as any).at.r * (cellSize + gap) + cellSize / 2;
          const dy = -Math.sin(t * Math.PI) * Math.max(10, cellSize * 0.4);
          const opacity = 1 - t;
          const fs = (10 * ((fx as any).sizeScale ?? 1) + cellSize * 0.08) * (((fx as any).power === 'synergy') ? 1.2 : 1);
          return (
            <text key={(fx as any).id} x={x} y={y + dy} fill={(fx as any).color} fontSize={fs} fontWeight={900} textAnchor="middle" opacity={opacity} style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.65)', strokeWidth: 2 }}>
              {(fx as any).value}
            </text>
          );
        }
        if ((fx as any).type === 'decal') {
          const t = Math.min(1, (animNow - (fx as any).startedAt) / (fx as any).durationMs);
          const x = (fx as any).at.c * (cellSize + gap) + cellSize / 2;
          const y = (fx as any).at.r * (cellSize + gap) + cellSize / 2;
          const size = Math.max(6, cellSize * 0.24) * ((fx as any).sizeScale ?? 1) * (((fx as any).power === 'synergy') ? 1.25 : 1);
          const fade = 1 - t;
          const rot = (fx as any).rotationDeg || 0;
          const shape = (fx as any).shape || 'slashmark';
          if (shape === 'slashmark') {
            return (
              <g key={(fx as any).id} opacity={0.5 * fade} transform={`rotate(${rot}, ${x}, ${y})`}>
                <rect x={x - size * 0.6} y={y - 2} width={size * 1.2} height={4} fill={(fx as any).color} rx={2} />
              </g>
            );
          }
          if (shape === 'scorch') {
            return (
              <g key={(fx as any).id} opacity={0.4 * fade}>
                <circle cx={x} cy={y} r={size * 0.6} fill={(fx as any).color} />
              </g>
            );
          }
          if (shape === 'frostcrack') {
            return (
              <g key={(fx as any).id} opacity={0.4 * fade}>
                <circle cx={x} cy={y} r={size * 0.5} fill={(fx as any).color} />
              </g>
            );
          }
        }
        if ((fx as any).type === 'foot') {
          const t = Math.max(0, Math.min(1, (animNow - (fx as any).startedAt) / (fx as any).durationMs));
          const x = (fx as any).at.c * (cellSize + gap) + cellSize / 2;
          const y = (fx as any).at.r * (cellSize + gap) + cellSize / 2;
          const sz = Math.max(3, cellSize * 0.08) * ((fx as any).sizeScale ?? 1);
          const fade = 1 - t;
          const spread = Math.max(0, Math.max(4, cellSize * 0.14) * t);
          const dir = (fx as any).dir || { dr: 0, dc: 0 };
          const stepPx = (cellSize + gap);
          // Use fixed placement along the step to avoid sliding prints
          const dist = (fx as any).dist ?? 0.3; // progress along step where imprint appears
          const forward = dist; // lock position at designated fraction
          let ox = x + (dir.dc || 0) * stepPx * forward;
          let oy = y + (dir.dr || 0) * stepPx * forward + cellSize * 0.28; // near feet
          // lateral offset to simulate alternating left/right steps if provided
          const side = (fx as any).side ?? (seed % 2 === 0 ? 1 : -1);
          // Fade over lifetime; fixed position prevents sliding
          const weight = 1 - t;
          // lateral offset perpendicular to motion
          const len = Math.hypot(dir.dc || 0, dir.dr || 0) || 1;
          const px = (-(dir.dr || 0) / len) * side * Math.max(2, cellSize * 0.08);
          const py = ((dir.dc || 0) / len) * side * Math.max(2, cellSize * 0.08);
          ox += px;
          oy += py;
          const color = (fx as any).color || '#94a3b8';
          const color2 = (fx as any).color2 || color;
          const variant = (fx as any).variant || 'dust';
          const tier = (fx as any).tier || 1;
          // deterministic randomness per id
          const seed = Math.abs(((fx as any).id || '').split('').reduce((h: number, ch: string) => (h * 31 + ch.charCodeAt(0)) | 0, 0));
          const rand = (a: number, b: number, s: number) => a + (s % 997) / 997 * (b - a);
          const rot = rand(-10, 10, seed) * (1 + (tier - 1) * 0.15);
          const jitterX = rand(-1, 1, seed >> 2) * (1 + (tier - 1) * 0.15);
          const jitterY = rand(-0.5, 0.5, seed >> 4) * (1 + (tier - 1) * 0.15);
          const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
          if (variant === 'ice') {
            return (
              <g key={(fx as any).id} opacity={0.85 * weight} transform={`translate(${jitterX.toFixed(2)}, ${jitterY.toFixed(2)}) rotate(${rot.toFixed(2)}, ${ox}, ${oy})`}>
                <ellipse cx={ox - spread * 0.15} cy={oy} rx={clamp(sz * (1 + t * 0.4), 0.1, 9999)} ry={clamp(sz * 0.45 * (1 + t * 0.3), 0.1, 9999)} fill={color2} opacity={0.5} />
                <ellipse cx={ox + spread * 0.15} cy={oy + 2} rx={clamp(sz * 0.7 * (1 + t * 0.4), 0.1, 9999)} ry={clamp(sz * 0.35 * (1 + t * 0.3), 0.1, 9999)} fill={color} />
              </g>
            );
          }
          if (variant === 'leaves') {
            const leaf = (dxs: number, dys: number, rot: number, scale: number, key: string) => (
              <g key={key} transform={`translate(${ox + dxs + jitterX}, ${oy + dys + jitterY}) rotate(${rot + rot * 0.2})`} opacity={0.75 * fade}>
                <path d={`M 0 0 q ${6 * scale} ${-4 * scale} 0 ${-10 * scale} q ${-6 * scale} ${4 * scale} 0 ${10 * scale}`} fill={color} />
                <path d={`M 0 ${-5 * scale} q ${3 * scale} ${-2 * scale} 0 ${-5 * scale}`} fill={color2} opacity={0.6} />
              </g>
            );
            return (
              <g key={(fx as any).id} opacity={weight}>
                {leaf(-spread * 0.2, 0, -20, 0.5 + t * 0.3, 'l1')}
                {leaf(spread * 0.15, 2, 15, 0.4 + t * 0.2, 'l2')}
              </g>
            );
          }
          if (variant === 'sparks') {
            return (
              <g key={(fx as any).id} opacity={0.9 * weight} transform={`translate(${jitterX.toFixed(2)}, ${jitterY.toFixed(2)})`}>
                <circle cx={ox - spread * 0.15} cy={oy} r={clamp(sz * 0.3 * (1 + t * 0.3), 0.1, 9999)} fill={color} />
                <circle cx={ox + spread * 0.12} cy={oy + 2} r={clamp(sz * 0.22 * (1 + t * 0.3), 0.1, 9999)} fill={color2} opacity={0.8} />
              </g>
            );
          }
          if (variant === 'motes') {
            return (
              <g key={(fx as any).id} opacity={0.8 * weight} transform={`translate(${jitterX.toFixed(2)}, ${jitterY.toFixed(2)})`}>
                <circle cx={ox - spread * 0.12} cy={oy - 6} r={clamp(sz * 0.22, 0.1, 9999)} fill={color2} opacity={0.7} />
                <circle cx={ox + spread * 0.12} cy={oy - 10} r={clamp(sz * 0.18, 0.1, 9999)} fill={color} opacity={0.5} />
              </g>
            );
          }
          if (variant === 'shadow') {
            return (
              <g key={(fx as any).id} opacity={0.7 * weight} transform={`translate(${jitterX.toFixed(2)}, ${jitterY.toFixed(2)}) rotate(${rot.toFixed(2)}, ${ox}, ${oy})`}>
                <ellipse cx={ox - spread * 0.2} cy={oy} rx={clamp(sz * (1 + t * 0.5), 0.1, 9999)} ry={clamp(sz * 0.5 * (1 + t * 0.3), 0.1, 9999)} fill={color} />
                <ellipse cx={ox + spread * 0.25} cy={oy + 1} rx={clamp(sz * 0.6 * (1 + t * 0.4), 0.1, 9999)} ry={clamp(sz * 0.3 * (1 + t * 0.3), 0.1, 9999)} fill={color2} opacity={0.6} />
              </g>
            );
          }
          if (variant === 'sand') {
            return (
              <g key={(fx as any).id} opacity={0.75 * weight} transform={`translate(${jitterX.toFixed(2)}, ${jitterY.toFixed(2)})`}>
                <ellipse cx={ox - spread * 0.22} cy={oy} rx={clamp(sz * (1 + t * 0.6), 0.1, 9999)} ry={clamp(sz * 0.4 * (1 + t * 0.3), 0.1, 9999)} fill={color} />
                <ellipse cx={ox + spread * 0.18} cy={oy + 1} rx={clamp(sz * 0.7 * (1 + t * 0.5), 0.1, 9999)} ry={clamp(sz * 0.28 * (1 + t * 0.3), 0.1, 9999)} fill={color2} opacity={0.6} />
              </g>
            );
          }
          if (variant === 'skid') {
            return (
              <g key={(fx as any).id} opacity={0.85 * weight} transform={`translate(${jitterX.toFixed(2)}, ${jitterY.toFixed(2)}) rotate(${rot.toFixed(2)}, ${ox}, ${oy})`}>
                <rect x={ox - spread * 0.3} y={oy - sz * 0.16} width={Math.max(0.1, spread * 0.6 + sz * 0.8)} height={Math.max(0.1, sz * 0.22)} rx={Math.max(0.1, sz * 0.1)} fill={color} />
                <rect x={ox - spread * 0.15} y={oy - sz * 0.08} width={Math.max(0.1, spread * 0.3 + sz * 0.6)} height={Math.max(0.1, sz * 0.14)} rx={Math.max(0.1, sz * 0.07)} fill={color2} opacity={0.6} />
              </g>
            );
          }
          if (variant === 'feather') {
            return (
              <g key={(fx as any).id} opacity={0.8 * weight} transform={`translate(${jitterX.toFixed(2)}, ${jitterY.toFixed(2)}) rotate(${rot.toFixed(2)}, ${ox}, ${oy})`}>
                <path d={`M ${ox - spread * 0.18} ${oy} q -6 -6 -2 -12 q 8 2 12 6 q -6 2 -10 6`} fill={color} />
                <path d={`M ${ox + spread * 0.12} ${oy + 2} q -6 -6 -2 -12 q 8 2 12 6 q -6 2 -10 6`} fill={color2} opacity={0.7} />
              </g>
            );
          }
          if (variant === 'track') {
            return (
              <g key={(fx as any).id} opacity={0.75 * fade} transform={`translate(${jitterX.toFixed(2)}, ${jitterY.toFixed(2)})`}>
                <rect x={ox - spread * 0.22} y={oy - 2} width={Math.max(0.1, spread * 0.44 + sz * 0.6)} height={3} fill={color} />
                <rect x={ox - spread * 0.12} y={oy + 2} width={Math.max(0.1, spread * 0.24 + sz * 0.4)} height={2} fill={color2} />
              </g>
            );
          }
          // default dust
          return (
            <g key={(fx as any).id} opacity={0.8 * fade} transform={`translate(${jitterX.toFixed(2)}, ${jitterY.toFixed(2)}) rotate(${rot.toFixed(2)}, ${ox}, ${oy})`}>
              <ellipse cx={ox - spread * 0.2} cy={oy} rx={clamp(sz * (1 + t * 0.6), 0.1, 9999)} ry={clamp(sz * 0.5 * (1 + t * 0.4), 0.1, 9999)} fill={color} />
              <ellipse cx={ox + spread * 0.2} cy={oy + 2} rx={clamp(sz * 0.8 * (1 + t * 0.5), 0.1, 9999)} ry={clamp(sz * 0.4 * (1 + t * 0.3), 0.1, 9999)} fill={color} opacity={0.7} />
            </g>
          );
        }
        if (fx.type === 'projectile') {
          const tRaw = Math.min(1, (animNow - fx.startedAt) / fx.durationMs);
          const easeInOut = (u: number) => (u < 0.5 ? 2 * u * u : -1 + (4 - 2 * u) * u);
          const easeOut = (u: number) => 1 - Math.pow(1 - u, 2);
          const t = fx.shape === 'bolt' || fx.shape === 'orb' ? easeInOut(tRaw) : fx.shape === 'beam' ? tRaw : easeOut(tRaw);
          const x1 = fx.from.c * (cellSize + gap) + cellSize / 2;
          const y1 = fx.from.r * (cellSize + gap) + cellSize / 2;
          const x2 = fx.to.c * (cellSize + gap) + cellSize / 2;
          const y2 = fx.to.r * (cellSize + gap) + cellSize / 2;
          const dx = x2 - x1;
          const dy = y2 - y1;
          const baseX = x1 + dx * t;
          const baseY = y1 + dy * t;
          const len = Math.hypot(dx, dy) || 1;
          const ox = -dy / len;
          const oy = dx / len;
          let curve = 0;
          if (fx.shape === 'arrow' || fx.shape === 'spear') curve = Math.sin(Math.PI * t) * Math.max(4, cellSize * 0.12);
          if (fx.shape === 'bolt') curve = (Math.sin(16 * Math.PI * t) + Math.sin(22 * Math.PI * t + 0.6)) * Math.max(2, cellSize * 0.05);
          const x = baseX + ox * curve;
          const y = baseY + oy * curve;
          const isSynergy = (fx as any).power === 'synergy';
          const sizeScale = (fx.sizeScale ?? 1) * (isSynergy ? 1.25 : 1);
          const glow = (fx.glow ?? 0) * (isSynergy ? 1.5 : 1);
          const tier = (fx as any).tier ?? 1;
          // motion trail elements (drawn behind the projectile shape)
          let trailSvg: JSX.Element | null = null;
          if (fx.trail) {
            const trailLen = 6;
            const items = [] as JSX.Element[];
            for (let i = 1; i <= trailLen; i++) {
              const tt = Math.max(0, t - i * 0.04);
              const bx = x1 + dx * tt; const by = y1 + dy * tt;
              items.push(<circle key={`tr-${i}`} cx={bx} cy={by} r={Math.max(1, (cellSize * 0.03) * sizeScale)} fill={fx.color} opacity={0.08 * (1 - i / trailLen)} />);
            }
            trailSvg = <g>{items}</g>;
          }
          if (fx.shape === 'arrow') {
            const angle = Math.atan2(y2 - y1, x2 - x1);
            const len = Math.max(10, cellSize * 0.5) * sizeScale;
            const w = Math.max(3, cellSize * 0.1) * sizeScale;
            return (
              <g key={fx.id}>
                {trailSvg}
                <g transform={`translate(${x},${y}) rotate(${(angle * 180) / Math.PI})`} opacity={0.95}>
                  {glow > 0 && (
                    <>
                      <rect x={-len * 0.5} y={-w / 2} width={len * 0.7} height={w} fill={fx.color} rx={w} opacity={glow * 0.35} />
                      <polygon points={`${len * 0.25},${-w} ${len * 0.5},0 ${len * 0.25},${w}`} fill={fx.color} opacity={glow * 0.35} />
                    </>
                  )}
                  <rect x={-len * 0.5} y={-w / 2} width={len * 0.7} height={w} fill={fx.color} rx={w / 2} />
                  <polygon points={`${len * 0.25},${-w} ${len * 0.5},0 ${len * 0.25},${w}`} fill={fx.color} />
                  {fx.trail && (
                    <line x1={-len} y1={0} x2={-len * 0.2} y2={0} stroke={fx.color2 || fx.color} strokeWidth={w * 0.4} opacity={0.3} />
                  )}
                  {tier >= 3 && (
                    <g opacity={0.5}>
                      <polygon points={`${len * 0.1},${-w*1.3} ${len * 0.3},${-w*0.8} ${len * 0.1},${-w*0.3}`} fill={fx.color2 || '#fff'} />
                      <polygon points={`${-len * 0.2},${w*1.1} ${-len * 0.05},${w*0.7} ${-len * 0.2},${w*0.3}`} fill={fx.color2 || '#fff'} />
                    </g>
                  )}
                </g>
              </g>
            );
          }
          if (fx.shape === 'bolt') {
            const angle = Math.atan2(y2 - y1, x2 - x1);
            const len = Math.max(12, cellSize * 0.54) * sizeScale;
            const w = Math.max(3, cellSize * 0.1) * sizeScale;
            return (
              <g key={fx.id}>
                {trailSvg}
                <g transform={`translate(${x},${y}) rotate(${(angle * 180) / Math.PI})`}>
                  <rect x={-len * 0.5} y={-w / 3} width={len} height={w / 1.5} fill={fx.color} rx={w} />
                  <rect x={-len * 0.3} y={-w / 2.2} width={len * 0.6} height={w / 3} fill={fx.color2 || '#fff'} opacity={0.6} rx={w} />
                </g>
              </g>
            );
          }
          if ((fx as any).shape === 'chakram') {
            const angle = Math.atan2(y2 - y1, x2 - x1);
            const r = Math.max(6, cellSize * 0.18) * sizeScale;
            return (
              <g key={fx.id}>
                {trailSvg}
                <g transform={`translate(${x},${y}) rotate(${(angle * 180) / Math.PI})`} opacity={0.95}>
                  <circle cx={0} cy={0} r={r} stroke={fx.color} strokeWidth={Math.max(2, r * 0.3)} fill="none" />
                  <circle cx={0} cy={0} r={r * 0.6} stroke={fx.color2 || '#fff'} strokeWidth={Math.max(1, r * 0.18)} fill="none" opacity={0.6} />
                </g>
              </g>
            );
          }
          if ((fx as any).shape === 'feather') {
            const angle = Math.atan2(y2 - y1, x2 - x1);
            const r = Math.max(5, cellSize * 0.16) * sizeScale;
            return (
              <g key={fx.id}>
                {trailSvg}
                <g transform={`translate(${x},${y}) rotate(${(angle * 180) / Math.PI})`} opacity={0.9}>
                  <path d={`M ${-r} 0 q ${r * 0.6} ${-r * 0.4} 0 ${-r} q ${-r * 0.6} ${r * 0.4} 0 ${r}`} fill={fx.color} />
                  <path d={`M ${-r * 0.6} ${-r * 0.2} q ${r * 0.3} ${-r * 0.2} 0 ${-r * 0.5}`} fill={fx.color2 || '#fff'} opacity={0.7} />
                </g>
              </g>
            );
          }
          if ((fx as any).shape === 'saber') {
            const angle = Math.atan2(y2 - y1, x2 - x1);
            const len = Math.max(16, cellSize * 0.6) * sizeScale;
            const w = Math.max(3, cellSize * 0.08) * sizeScale;
            return (
              <g key={fx.id}>
                {trailSvg}
                <g transform={`translate(${x},${y}) rotate(${(angle * 180) / Math.PI})`} opacity={0.95}>
                  <rect x={-len * 0.5} y={-w / 2} width={len} height={w} fill={fx.color} rx={w} />
                  <rect x={-len * 0.4} y={-w / 3} width={len * 0.8} height={w / 2} fill={fx.color2 || '#fff'} opacity={0.6} rx={w} />
                </g>
              </g>
            );
          }
          if ((fx as any).shape === 'bomb') {
            const angle = Math.atan2(y2 - y1, x2 - x1);
            const r = Math.max(6, cellSize * 0.14) * sizeScale;
            return (
              <g key={fx.id}>
                {trailSvg}
                <g transform={`translate(${x},${y}) rotate(${(angle * 180) / Math.PI})`} opacity={0.95}>
                  <circle cx={0} cy={0} r={r} fill={fx.color} />
                  <rect x={-r * 0.2} y={-r * 0.9} width={r * 0.4} height={r * 0.4} fill={fx.color2 || '#fff'} />
                </g>
              </g>
            );
          }
          if (fx.shape === 'shard') {
            const r = Math.max(3, cellSize * 0.12) * sizeScale;
            return (
              <g key={fx.id} opacity={0.95}>
                {trailSvg}
                <polygon points={`${x-r},${y} ${x},${y-r*1.6} ${x+r},${y}`} fill={fx.color} />
                {fx.color2 && <polygon points={`${x-r*0.6},${y} ${x},${y-r} ${x+r*0.6},${y}`} fill={fx.color2} opacity={0.7} />}
              </g>
            );
          }
          if (fx.shape === 'bullet') {
            const r = Math.max(3, cellSize * 0.09) * sizeScale;
            return (
              <g key={fx.id}>
                {trailSvg}
                <circle cx={x} cy={y} r={r} fill={fx.color} stroke={fx.color2 || '#fff'} strokeWidth={1} opacity={0.95} />
              </g>
            );
          }
          if (fx.shape === 'spear') {
            const angle = Math.atan2(y2 - y1, x2 - x1);
            const len = Math.max(16, cellSize * 0.7) * sizeScale;
            const w = Math.max(3, cellSize * 0.1) * sizeScale;
            return (
              <g key={fx.id}>
                {trailSvg}
                <g transform={`translate(${x},${y}) rotate(${(angle * 180) / Math.PI})`} opacity={0.95}>
                  <rect x={-len * 0.6} y={-w / 6} width={len * 0.9} height={w / 3} fill={fx.color} rx={w} />
                  <polygon points={`${len * 0.25},${-w*0.7} ${len * 0.55},0 ${len * 0.25},${w*0.7}`} fill={fx.color2 || fx.color} />
                </g>
              </g>
            );
          }
          if (fx.shape === 'beam') {
            const angle = Math.atan2(y2 - y1, x2 - x1);
            const len = Math.hypot(x2 - x1, y2 - y1);
            const w = Math.max(4, cellSize * 0.14) * sizeScale;
            return (
              <g key={fx.id}>
                {trailSvg}
                <g transform={`translate(${x1},${y1}) rotate(${(angle * 180) / Math.PI})`} opacity={0.8}>
                  <rect x={0} y={-w / 2} width={len * t} height={w} fill={fx.color} rx={w} />
                  <rect x={0} y={-w / 4} width={len * t} height={w / 2} fill={fx.color2 || '#fff'} opacity={0.8} rx={w} />
                </g>
              </g>
            );
          }
          // orb
          const r = Math.max(3, cellSize * 0.14) * sizeScale;
          return (
            <g key={fx.id} opacity={0.95}>
              {trailSvg}
              {glow > 0 && <circle cx={x} cy={y} r={r * 1.6} fill={fx.color} opacity={glow * 0.25} />}
              {fx.color2 && <circle cx={x} cy={y} r={r * 1.15} fill={fx.color2} opacity={0.6} />}
              <circle cx={x} cy={y} r={r} fill={fx.color} />
              {tier >= 3 && <circle cx={x} cy={y} r={r * 0.5} fill={'#fff'} opacity={0.35} />}
            </g>
          );
        }
        if (fx.type === 'hit') {
          const t = Math.min(1, (animNow - fx.startedAt) / fx.durationMs);
          const x = fx.at.c * (cellSize + gap) + cellSize / 2;
          const y = fx.at.r * (cellSize + gap) + cellSize / 2;
            const sizeScale = fx.sizeScale ?? 1;
            const isSynergy = (fx as any).power === 'synergy';
            const glow = (fx.glow ?? 0) * (isSynergy ? 1.5 : 1);
            if (fx.shape === 'slash') {
              const length = Math.max(12, cellSize * 0.6) * (1 - t) * sizeScale * (isSynergy ? 1.25 : 1);
              const h = 4 * sizeScale;
              return (
                <g key={fx.id}>
                  {glow > 0 && <rect x={x - length / 2} y={y - h} width={length} height={h * 2} fill={fx.color} opacity={glow * 0.25 * (1 - t)} rx={h} />}
                  <rect x={x - length / 2} y={y - h / 2} width={length} height={h} fill={fx.color} opacity={0.7 * (1 - t)} rx={h / 2} />
                </g>
              );
          }
            if ((fx as any).shape === 'rip') {
              const length = Math.max(10, cellSize * 0.5) * (1 - t) * sizeScale * (isSynergy ? 1.3 : 1);
              const h = 3 * sizeScale;
              return (
                <g key={fx.id} opacity={0.9}>
                  <g transform={`rotate(-30, ${x}, ${y})`}>
                    <rect x={x - length / 2} y={y - h / 2} width={length} height={h} fill={fx.color} opacity={0.8 * (1 - t)} rx={h / 2} />
                  </g>
                  <g transform={`rotate(30, ${x}, ${y})`}>
                    <rect x={x - length / 2} y={y - h / 2} width={length} height={h} fill={fx.color2 || fx.color} opacity={0.6 * (1 - t)} rx={h / 2} />
                  </g>
                </g>
              );
            }
            if (fx.shape === 'impact') {
              const radius = ((1 - t) * (cellSize * 0.28) + 3) * sizeScale * (isSynergy ? 1.25 : 1);
              return (
                <g key={fx.id}>
                  <circle cx={x} cy={y} r={radius} fill={fx.color} opacity={0.4 * (1 - t)} />
                  <circle cx={x} cy={y} r={radius * 0.6} fill={fx.color2 || '#fff'} opacity={0.3 * (1 - t)} />
                </g>
              );
            }
            if ((fx as any).shape === 'thrust') {
              const length = Math.max(16, cellSize * 0.7) * (1 - t) * sizeScale * (isSynergy ? 1.25 : 1);
              const w = Math.max(3, cellSize * 0.08) * sizeScale;
              return (
                <g key={fx.id} opacity={0.95}>
                  <polygon points={`${x - length/2},${y - w/2} ${x + length/2},${y} ${x - length/2},${y + w/2}`} fill={fx.color} opacity={0.8 * (1 - t)} />
                </g>
              );
            }
            if (fx.shape === 'smite') {
              const radius = ((1 - t) * (cellSize * 0.34) + 4) * sizeScale * (isSynergy ? 1.3 : 1);
              return (
                <g key={fx.id}>
                  <polygon points={`${x-4},${y-radius} ${x+4},${y-radius} ${x+8},${y} ${x-8},${y}`} fill={fx.color} opacity={0.5 * (1 - t)} />
                  <circle cx={x} cy={y} r={radius * 0.5} fill={fx.color2 || fx.color} opacity={0.35 * (1 - t)} />
                </g>
              );
            }
            if ((fx as any).shape === 'shock') {
              const radius = ((1 - t) * (cellSize * 0.36) + 6) * sizeScale * (isSynergy ? 1.25 : 1);
              return (
                <g key={fx.id} opacity={0.9 * (1 - t)}>
                  <circle cx={x} cy={y} r={radius} stroke={fx.color} strokeWidth={Math.max(2, cellSize * 0.04)} fill="none" />
                  <circle cx={x} cy={y} r={radius * 0.6} stroke={fx.color2 || fx.color} strokeWidth={Math.max(1, cellSize * 0.03)} fill="none" opacity={0.6} />
                </g>
              );
            }
            const particles = Math.max(6, ((fx.particles ?? 12) * (((fx as any).power === 'synergy') ? 1.3 : 1)) | 0);
            const radius = ((1 - t) * (cellSize * 0.3) + 4) * (fx.sizeScale ?? 1) * (((fx as any).power === 'synergy') ? 1.25 : 1);
            return (
              <g key={fx.id}>
                {glow > 0 && <circle cx={x} cy={y} r={radius * 1.6} fill={fx.color} opacity={glow * 0.2 * (1 - t)} />}
                {[...Array(particles)].map((_, i) => {
                  const ang = (i / particles) * Math.PI * 2;
                  const px = x + Math.cos(ang) * radius;
                  const py = y + Math.sin(ang) * radius;
                  return <line key={i} x1={x} y1={y} x2={px} y2={py} stroke={fx.color} strokeWidth={1.2} opacity={0.5 * (1 - t)} />;
                })}
                {[...Array(Math.floor(particles / 2))].map((_, i) => {
                  const ang = (i / (particles / 2)) * Math.PI * 2;
                  const px = x + Math.cos(ang) * radius * 0.6;
                  const py = y + Math.sin(ang) * radius * 0.6;
                  return <circle key={`c${i}`} cx={px} cy={py} r={Math.max(1.2, (cellSize * 0.04) * (1 - t))} fill={fx.color2 || fx.color} opacity={0.7 * (1 - t)} />;
                })}
              </g>
            );
        }
        if (fx.type === 'ring') {
          const t = Math.min(1, (animNow - fx.startedAt) / fx.durationMs);
          const x = fx.at.c * (cellSize + gap) + cellSize / 2;
          const y = fx.at.r * (cellSize + gap) + cellSize / 2;
          // expand radius over time up to N cells
          const cells = fx.maxRadiusCells ?? 2;
          const maxPx = cells * (cellSize + gap) + cellSize * 0.5;
          const r = Math.max(2, maxPx * t);
            const isSynergy = (fx as any).power === 'synergy';
            const glow = (fx.glow ?? 0) * (isSynergy ? 1.5 : 1);
            const rings = Math.max(3, (fx.rings ?? 3) + (isSynergy ? 2 : 0));
            const strokeBase = 4;
            const items = [...Array(rings)].map((_, i) => {
              const frac = 1 - i / rings;
              return (
                <circle key={i} cx={x} cy={y} r={r * frac} stroke={fx.color} strokeWidth={strokeBase * Math.max(0.4, frac)} fill="none" opacity={(0.8 * (1 - t)) * Math.max(0.3, frac)} strokeDasharray={`${Math.max(10, r * 0.4)} ${Math.max(14, r * 0.6)}`} strokeDashoffset={r * t * 0.6} />
              );
            });
            return (
              <g key={fx.id} transform={`rotate(${t * 90}, ${x}, ${y})`}>
                {glow > 0 && <circle cx={x} cy={y} r={r * 1.2} fill={fx.color} opacity={glow * 0.15 * (1 - t)} />}
                {items}
              </g>
            );
        }
        return null;
      })}
    </svg>
  );
}


