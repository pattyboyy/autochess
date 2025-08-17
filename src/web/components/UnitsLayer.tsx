import React from 'react';
import { useGameStore } from '../../world/state';
import { UNIT_TEMPLATES, getUnitVisual } from '../../world/units';

export function UnitsLayer(props: { rows: number; cols: number; cellSize: number; gap?: number }): JSX.Element {
  const { rows, cols, cellSize, gap = 4 } = props;
  const board = useGameStore((s) => s.board);
  const units = useGameStore((s) => s.units);
  const phase = useGameStore((s) => s.phase);
  const paused = useGameStore((s) => s.paused || false);

  // animation ticker during combat for idle bob/rotation
  const [animNow, setAnimNow] = React.useState(0);
  React.useEffect(() => {
    if (phase !== 'combat') return;
    let raf = 0;
    const loop = () => {
      if (!useGameStore.getState().paused) setAnimNow(performance.now());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const width = cols * cellSize + (cols - 1) * gap;
  const height = rows * cellSize + (rows - 1) * gap;

  return (
    <svg width={width} height={height} style={{ position: 'absolute', inset: 8, pointerEvents: 'none' }}>
      {Object.entries(board).map(([cellKey, unitId]) => {
        if (!unitId) return null;
        const [r, c] = cellKey.split(',').map(Number);
        const x = c * (cellSize + gap) + cellSize / 2;
        const y = r * (cellSize + gap) + cellSize / 2;
        const u = units[unitId];
        if (!u) return null;
        const v = getUnitVisual(u.templateKey);
        const outline = u.team === 'player' ? '#2ecc71' : '#e74c3c';
        const baseHp = UNIT_TEMPLATES[u.templateKey]?.stats.hp ?? 100;
        const maxHp = baseHp * (u.star || 1);
        const hpPct = Math.max(0, Math.min(1, u.hp / maxHp));
        const radius = Math.max(10, cellSize * 0.35);

        // idle bob/phase per unit id
        const seed = hashString(unitId) * Math.PI * 2;
        const bob = Math.sin((animNow / 700) + seed) * (cellSize * 0.03);
        const spin = ((animNow / 20) + seed * 57) % 360;

        return (
          <g key={unitId} transform={`translate(0, ${bob.toFixed(2)})`}>
            <defs>
              <radialGradient id={`g-${unitId}`} cx="50%" cy="40%" r="60%">
                <stop offset="0%" stopColor={v.accent} stopOpacity="0.95" />
                <stop offset="100%" stopColor={v.primary} stopOpacity="0.9" />
              </radialGradient>
              <filter id={`glow-${unitId}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {/* Ground shadow and detailed model */}
            <ellipse cx={x} cy={y + radius * 0.82} rx={radius * 0.78} ry={radius * 0.26} fill="rgba(0,0,0,0.25)" />
            {renderModel(u.templateKey, x, y, radius, v, spin, outline)}

            {/* HP Bar with shield overlay */}
            <rect x={x - cellSize * 0.32} y={y - cellSize * 0.58} width={cellSize * 0.64} height={5} fill="#1a233a" rx={3} />
            <rect
              x={x - cellSize * 0.32}
              y={y - cellSize * 0.58}
              width={cellSize * 0.64 * hpPct}
              height={5}
              fill={u.team === 'player' ? '#2ecc71' : '#e74c3c'}
              rx={3}
            />
            {u.shieldHp && u.shieldHp > 0 && (
              <rect
                x={x - cellSize * 0.32}
                y={y - cellSize * 0.58}
                width={Math.min(cellSize * 0.64, (cellSize * 0.64) * (u.shieldHp / Math.max(1, maxHp)))}
                height={5}
                fill="#60a5fa"
                opacity={0.6}
                rx={3}
              />
            )}

            {/* Star indicator */}
            {u.star && u.star >= 1 && (
              <g>
                {/* badge backdrop */}
                <rect x={x - radius * 0.5} y={y - radius - 14} width={radius} height={14} rx={7} fill="rgba(0,0,0,0.55)" />
                {/* stars */}
                {Array.from({ length: u.star }).map((_, i) => (
                  <path
                    key={i}
                    d={starPath(x - (u.star - 1) * 7 + i * 14, y - radius - 7, 4)}
                    fill={u.star >= 3 ? '#ffd166' : u.star === 2 ? '#c3e88d' : '#e0e0e0'}
                    opacity={0.95}
                  />
                ))}
              </g>
            )}

            {/* Status orbit icons */}
            {(() => {
              const icons: React.ReactNode[] = [];
              const t = (animNow / 700) % 1;
              const baseAng = (t * Math.PI * 2) + seed * 2 * Math.PI;
              const place = (idx: number, color: string, draw: (cx: number, cy: number) => React.ReactNode) => {
                const ang = baseAng + idx * (Math.PI / 2);
                const rr = radius * 0.95;
                const cx = x + Math.cos(ang) * rr;
                const cy = y + Math.sin(ang) * rr;
                icons.push(<g key={`st-${idx}`} opacity={0.95}>{draw(cx, cy)}</g>);
              };
              let idx = 0;
              if ((u.status?.stunnedUntil || 0) > animNow) {
                place(idx++, '#fcd34d', (cx, cy) => (
                  <g>
                    <path d={`M ${cx - 4} ${cy - 2} L ${cx - 1} ${cy - 2} L ${cx - 2} ${cy + 2} L ${cx + 2} ${cy + 2}`} stroke="#fcd34d" strokeWidth={2} fill="none" />
                    <circle cx={cx} cy={cy} r={6} stroke="#f59e0b" strokeWidth={1} fill="none" opacity={0.6} />
                  </g>
                ));
              }
              if ((u.status?.slowUntil || 0) > animNow) {
                place(idx++, '#60a5fa', (cx, cy) => (
                  <g>
                    <circle cx={cx} cy={cy} r={5} stroke="#60a5fa" strokeWidth={2} fill="none" />
                    <line x1={cx} y1={cy - 3} x2={cx} y2={cy + 1} stroke="#93c5fd" strokeWidth={1.5} />
                    <line x1={cx} y1={cy} x2={cx + 3} y2={cy} stroke="#93c5fd" strokeWidth={1.5} />
                  </g>
                ));
              }
              if ((u.status?.bleedUntil || 0) > animNow) {
                place(idx++, '#ef4444', (cx, cy) => (
                  <path d={`M ${cx} ${cy - 5} q 4 6 0 9 q -4 -3 0 -9`} fill="#ef4444" stroke="#b91c1c" strokeWidth={1} />
                ));
              }
              if ((u.shieldHp || 0) > 0) {
                place(idx++, '#60a5fa', (cx, cy) => (
                  <g>
                    <path d={`M ${cx} ${cy - 6} L ${cx + 6} ${cy - 2} L ${cx + 4} ${cy + 6} L ${cx - 4} ${cy + 6} L ${cx - 6} ${cy - 2} Z`} fill="#60a5fa" opacity={0.5} />
                    <path d={`M ${cx} ${cy - 6} L ${cx + 6} ${cy - 2} L ${cx + 4} ${cy + 6} L ${cx - 4} ${cy + 6} L ${cx - 6} ${cy - 2} Z`} stroke="#3b82f6" strokeWidth={1.5} fill="none" />
                  </g>
                ));
              }
              return icons;
            })()}
          </g>
        );
      })}
    </svg>
  );
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0) / 2 ** 32;
}

function renderModel(
  templateKey: string,
  x: number,
  y: number,
  radius: number,
  colors: { primary: string; secondary: string; accent: string },
  spinDeg: number,
  outline: string
): React.ReactNode {
  const size = radius * 1.2;
  const torsoWidth = size * 0.44;
  const torsoHeight = size * 0.56;
  const headR = Math.max(6, radius * 0.32);
  const armLen = size * 0.34;
  const legLen = size * 0.34;

  const Body = (
    <g>
      <path d={`M ${x} ${y - headR * 0.2} C ${x - torsoWidth} ${y + torsoHeight * 0.05}, ${x - torsoWidth} ${y + torsoHeight * 0.9}, ${x} ${y + torsoHeight * 0.95} C ${x + torsoWidth} ${y + torsoHeight * 0.9}, ${x + torsoWidth} ${y + torsoHeight * 0.05}, ${x} ${y - headR * 0.2}`} fill={colors.secondary} opacity={0.18} />
      <rect x={x - torsoWidth / 2} y={y - torsoHeight * 0.15} width={torsoWidth} height={torsoHeight} rx={torsoWidth * 0.2} fill={colors.primary} stroke={outline} strokeWidth={2} opacity={0.95} />
      <rect x={x - torsoWidth / 2} y={y + torsoHeight * 0.12} width={torsoWidth} height={torsoHeight * 0.12} fill={colors.secondary} opacity={0.8} />
      <circle cx={x} cy={y - torsoHeight * 0.35} r={headR} fill={colors.secondary} stroke={outline} strokeWidth={2} />
      <rect x={x - torsoWidth * 0.24} y={y + torsoHeight * 0.45} width={torsoWidth * 0.18} height={legLen} rx={4} fill={colors.secondary} opacity={0.9} />
      <rect x={x + torsoWidth * 0.06} y={y + torsoHeight * 0.45} width={torsoWidth * 0.18} height={legLen} rx={4} fill={colors.secondary} opacity={0.9} />
      <rect x={x - torsoWidth * 0.6} y={y - torsoHeight * 0.05} width={armLen} height={torsoWidth * 0.16} rx={6} fill={colors.secondary} opacity={0.9} />
      <rect x={x + torsoWidth * 0.05} y={y - torsoHeight * 0.05} width={armLen} height={torsoWidth * 0.16} rx={6} fill={colors.secondary} opacity={0.9} />
      <rect x={x - torsoWidth / 2 + 3} y={y - torsoHeight * 0.15 + 3} width={torsoWidth - 6} height={torsoHeight - 6} rx={torsoWidth * 0.18} stroke={colors.accent} strokeWidth={2} fill="none" opacity={0.6} />
    </g>
  );

  // lightweight per-frame animation helpers derived from spinDeg
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const swaySmall = Math.sin(toRad(spinDeg) * 1.3) * (radius * 0.06);
  const swayTiny = Math.cos(toRad(spinDeg) * 1.7) * (radius * 0.04);
  const pulse01 = (Math.sin(toRad(spinDeg * 0.8)) + 1) / 2; // 0..1
  const flapY = Math.sin(toRad(spinDeg) * 2.2) * (radius * 0.08);

  switch (templateKey) {
    case 'warrior':
    case 'knight':
    case 'guardian':
    case 'paladin':
    case 'champion':
    case 'gladiator':
    case 'shieldman':
    case 'shieldbearer':
    case 'templar':
    case 'recruit':
      return (
        <g>
          {Body}
          {/* Knight cape */}
          {templateKey === 'knight' && (
            <path d={`M ${x} ${y - headR * 0.2} C ${x - torsoWidth * 0.8} ${y + torsoHeight * 0.1}, ${x - torsoWidth * 0.6} ${y + torsoHeight * 0.9}, ${x} ${y + torsoHeight * 1.0} C ${x + torsoWidth * 0.6} ${y + torsoHeight * 0.9}, ${x + torsoWidth * 0.8} ${y + torsoHeight * 0.1}, ${x} ${y - headR * 0.2}`} fill={colors.secondary} opacity={0.12} />
          )}
          {/* head adornment for elites */}
          {(templateKey === 'knight' || templateKey === 'champion' || templateKey === 'gladiator') && (
            <path d={`M ${x - headR * 0.6} ${y - torsoHeight * 0.5} q ${headR * 0.6} ${-headR * 0.8} ${headR * 1.2} 0`} fill={colors.accent} opacity={0.7} />
          )}
          {/* shield variants */}
          {(() => {
            if (templateKey === 'knight') {
              // kite shield
              return (
                <g>
                  <path d={`M ${x - torsoWidth * 0.95} ${y - torsoHeight * 0.28} L ${x - torsoWidth * 0.55} ${y - torsoHeight * 0.1} L ${x - torsoWidth * 0.7} ${y + torsoHeight * 0.7} L ${x - torsoWidth * 1.05} ${y + torsoHeight * 0.2} Z`} fill={colors.secondary} opacity={0.22} stroke={outline} strokeWidth={2} />
                  <path d={`M ${x - torsoWidth * 0.95} ${y - torsoHeight * 0.24} L ${x - torsoWidth * 0.62} ${y + torsoHeight * 0.1} L ${x - torsoWidth * 0.78} ${y + torsoHeight * 0.58}`} stroke={colors.accent} strokeWidth={3} />
                </g>
              );
            }
            if (templateKey === 'guardian') {
              return (
                <g>
                  <rect x={x - torsoWidth * 1.0} y={y - torsoHeight * 0.3} width={torsoWidth * 0.7} height={torsoHeight * 1.1} rx={8} fill={colors.accent} opacity={0.22} stroke={outline} strokeWidth={2} />
                  <rect x={x - torsoWidth * 0.98} y={y - torsoHeight * 0.28} width={torsoWidth * 0.66} height={torsoHeight * 1.06} rx={8} fill="none" stroke={colors.accent} strokeWidth={2} opacity={0.35} />
                  {Array.from({ length: 4 }).map((_, i) => (
                    <circle key={i} cx={x - torsoWidth * 0.65} cy={y - torsoHeight * 0.2 + i * (torsoHeight * 0.34)} r={2} fill={outline} opacity={0.7} />
                  ))}
                  {/* helmet ridge */}
                  <path d={`M ${x - headR * 0.6} ${y - torsoHeight * 0.5} q ${headR * 0.6} ${-headR * 0.6} ${headR * 1.2} 0`} stroke={colors.secondary} strokeWidth={3} />
                </g>
              );
            }
            if (templateKey === 'shieldbearer') {
              return (
                <rect x={x - torsoWidth * 1.05} y={y - torsoHeight * 0.15} width={torsoWidth * 0.8} height={torsoHeight * 0.9} rx={6} fill={colors.accent} opacity={0.22} stroke={outline} strokeWidth={2} />
              );
            }
            if (templateKey === 'shieldman' || templateKey === 'recruit') {
              return (
                <g>
                  <circle cx={x - torsoWidth * 0.7} cy={y + torsoHeight * 0.05} r={torsoWidth * 0.28} fill={colors.accent} opacity={0.22} stroke={outline} strokeWidth={2} />
                  {templateKey === 'recruit' && (
                    <>
                      <line x1={x - torsoWidth * 0.84} y1={y + torsoHeight * 0.05} x2={x - torsoWidth * 0.56} y2={y + torsoHeight * 0.05} stroke={colors.secondary} strokeWidth={2} opacity={0.7} />
                      <line x1={x - torsoWidth * 0.8} y1={y - torsoHeight * 0.08} x2={x - torsoWidth * 0.6} y2={y + torsoHeight * 0.18} stroke={colors.secondary} strokeWidth={2} opacity={0.5} />
                    </>
                  )}
                  {templateKey === 'shieldman' && (
                    <>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <circle key={i} cx={x - torsoWidth * 0.7 + Math.cos((i / 5) * Math.PI * 2) * (torsoWidth * 0.18)} cy={y + torsoHeight * 0.05 + Math.sin((i / 5) * Math.PI * 2) * (torsoWidth * 0.18)} r={2} fill={outline} opacity={0.8} />
                      ))}
                    </>
                  )}
                </g>
              );
            }
            if (templateKey === 'templar' || templateKey === 'paladin') {
              return (
                <g>
                  <path d={`M ${x - torsoWidth * 0.9} ${y - torsoHeight * 0.2} Q ${x - torsoWidth * 0.3} ${y - torsoHeight * 0.4}, ${x - torsoWidth * 0.2} ${y} Q ${x - torsoWidth * 0.4} ${y + torsoHeight * 0.6}, ${x - torsoWidth * 0.9} ${y} Q ${x - torsoWidth * 1.0} ${y - torsoHeight * 0.4}, ${x - torsoWidth * 0.9} ${y - torsoHeight * 0.2}`} fill={colors.accent} opacity={0.22} stroke={outline} strokeWidth={2} />
                  <rect x={x - torsoWidth * 0.62} y={y - torsoHeight * 0.02} width={torsoWidth * 0.24} height={4} fill={colors.accent} />
                  <rect x={x - torsoWidth * 0.62 + (torsoWidth * 0.24 - 4) / 2} y={y - torsoHeight * 0.12} width={4} height={torsoHeight * 0.24} fill={colors.accent} />
                  <rect x={x - torsoWidth * 0.72} y={y - torsoHeight * 0.02} width={torsoWidth * 0.44} height={2} fill="#fff" opacity={0.5} />
                  <rect x={x - torsoWidth * 0.5} y={y - torsoHeight * 0.16} width={2} height={torsoHeight * 0.32} fill="#fff" opacity={0.5} />
                </g>
              );
            }
            // default roundish shield
            return (
              <path d={`M ${x - torsoWidth * 0.9} ${y - torsoHeight * 0.2} Q ${x - torsoWidth * 0.3} ${y - torsoHeight * 0.4}, ${x - torsoWidth * 0.2} ${y} Q ${x - torsoWidth * 0.4} ${y + torsoHeight * 0.6}, ${x - torsoWidth * 0.9} ${y} Q ${x - torsoWidth * 1.0} ${y - torsoHeight * 0.4}, ${x - torsoWidth * 0.9} ${y - torsoHeight * 0.2}`} fill={colors.accent} opacity={0.22} stroke={outline} strokeWidth={2} />
            );
          })()}
          {/* weapon variants */}
          {(() => {
            if (templateKey === 'guardian') {
              return (
                <g transform={`rotate(${(spinDeg * 0.03).toFixed(1)}, ${x + torsoWidth * 0.82}, ${y - torsoHeight * 0.1})`}>
                  <rect x={x + torsoWidth * 0.82 - 2} y={y - torsoHeight * 0.36} width={4} height={size * 0.5} fill={colors.accent} rx={2} />
                  <circle cx={x + torsoWidth * 0.82} cy={y + torsoHeight * 0.22} r={6} fill={colors.accent} />
                </g>
              );
            }
            if (templateKey === 'knight') {
              // straight sword with fuller
              return (
                <g transform={`rotate(${(spinDeg * 0.03).toFixed(1)}, ${x + torsoWidth * 0.78}, ${y - torsoHeight * 0.22})`}>
                  <rect x={x + torsoWidth * 0.78 - 2} y={y - torsoHeight * 0.62} width={4} height={size * 0.6} fill={colors.accent} rx={2} />
                  <rect x={x + torsoWidth * 0.78 - 0.6} y={y - torsoHeight * 0.6} width={1.2} height={size * 0.5} fill={'#fff'} opacity={0.4} />
                </g>
              );
            }
            if (templateKey === 'gladiator') {
              return (
                <g>
                  <rect x={x + torsoWidth * 0.58 - 2} y={y - size * 0.28} width={4} height={size * 0.42} fill={colors.accent} rx={2} />
                  <g opacity={0.6}>
                    <line x1={x - torsoWidth * 0.6} y1={y - torsoHeight * 0.1} x2={x - torsoWidth * 0.2} y2={y + torsoHeight * 0.1} stroke={colors.secondary} strokeWidth={1.2} />
                    <line x1={x - torsoWidth * 0.6} y1={y + torsoHeight * 0.1} x2={x - torsoWidth * 0.2} y2={y - torsoHeight * 0.1} stroke={colors.secondary} strokeWidth={1.2} />
                    <line x1={x - torsoWidth * 0.4} y1={y - torsoHeight * 0.18} x2={x - torsoWidth * 0.4} y2={y + torsoHeight * 0.18} stroke={colors.secondary} strokeWidth={1.2} />
                  </g>
                  {/* crest plume */}
                  <path d={`M ${x - headR * 0.8} ${y - torsoHeight * 0.52} q ${headR * 0.8} ${-headR * 0.5} ${headR * 1.6} 0`} stroke={colors.accent} strokeWidth={3} />
                </g>
              );
            }
            if (templateKey === 'duelist') {
              return (
                <rect x={x + torsoWidth * 0.7 - 1} y={y - size * 0.38} width={2} height={size * 0.6} fill={colors.accent} rx={1} />
              );
            }
            if (templateKey === 'recruit') {
              return (
                <g>
                  <rect x={x + torsoWidth * 0.74 - 1.5} y={y - torsoHeight * 0.5} width={3} height={size * 0.42} fill={colors.secondary} rx={1.5} />
                  <rect x={x + torsoWidth * 0.74 - 3.5} y={y - torsoHeight * 0.5} width={7} height={3} fill={colors.accent} />
                </g>
              );
            }
            if (templateKey === 'paladin') {
              // hammer
      return (
        <g>
                  <rect x={x + torsoWidth * 0.78 - 2} y={y - torsoHeight * 0.5} width={4} height={size * 0.6} fill={colors.secondary} rx={1.5} />
                  <rect x={x + torsoWidth * 0.78 - 8} y={y - torsoHeight * 0.6} width={16} height={10} fill={colors.accent} rx={2} />
                </g>
              );
            }
            // default sword
            return (
              <g transform={`rotate(${(spinDeg * 0.05).toFixed(1)}, ${x + torsoWidth * 0.8}, ${y - torsoHeight * 0.25})`}>
                <rect x={x + torsoWidth * 0.8 - 2} y={y - torsoHeight * 0.6} width={4} height={size * 0.58} fill={colors.accent} rx={2} />
                <polygon points={`${x + torsoWidth * 0.8 - 6},${y - torsoHeight * 0.6} ${x + torsoWidth * 0.8 + 6},${y - torsoHeight * 0.6} ${x + torsoWidth * 0.8},${y - torsoHeight * 0.82}`} fill={colors.accent} />
              </g>
            );
          })()}
          {/* paladin halo */}
          {templateKey === 'paladin' && (
            <g>
              <circle cx={x} cy={y - torsoHeight * 0.58} r={headR * 0.9} stroke={colors.accent} strokeWidth={2} fill="none" opacity={0.6} />
              <rect x={x - torsoWidth * 0.12} y={y + torsoHeight * 0.05} width={torsoWidth * 0.24} height={torsoHeight * 0.5} fill={colors.secondary} opacity={0.7} />
              <rect x={x - 2} y={y + torsoHeight * 0.05} width={4} height={torsoHeight * 0.5} fill={colors.accent} opacity={0.9} />
            </g>
          )}
          {/* knight visor */}
          {templateKey === 'knight' && (
            <rect x={x - headR * 0.7} y={y - torsoHeight * 0.38} width={headR * 1.4} height={headR * 0.38} rx={6} fill={colors.primary} stroke={outline} strokeWidth={1.5} />
          )}
          {/* templar crusader helm */}
          {templateKey === 'templar' && (
            <g opacity={0.95}>
              <rect x={x - headR * 0.6} y={y - torsoHeight * 0.44} width={headR * 1.2} height={headR * 0.48} rx={4} fill={colors.primary} stroke={outline} strokeWidth={1.5} />
              <rect x={x - 2} y={y - torsoHeight * 0.42} width={4} height={headR * 0.42} fill={colors.accent} />
              <rect x={x - headR * 0.44} y={y - torsoHeight * 0.28} width={headR * 0.88} height={3} fill={colors.accent} />
            </g>
          )}
          {/* champion crown */}
          {templateKey === 'champion' && (
            <polygon points={`${x - 16},${y - radius} ${x - 6},${y - radius - 10} ${x},${y - radius} ${x + 6},${y - radius - 10} ${x + 16},${y - radius}`} fill={colors.accent} opacity={0.9} />
          )}
          {/* champion regal cape and crest */}
          {templateKey === 'champion' && (
            <g opacity={0.85}>
              <path d={`M ${x} ${y - headR * 0.2} C ${x - torsoWidth * 0.9} ${y + torsoHeight * 0.0}, ${x - torsoWidth * 0.7} ${y + torsoHeight * 1.0}, ${x} ${y + torsoHeight * 1.1} C ${x + torsoWidth * 0.7} ${y + torsoHeight * 1.0}, ${x + torsoWidth * 0.9} ${y + torsoHeight * 0.0}, ${x} ${y - headR * 0.2}`} fill={colors.secondary} opacity={0.14} />
              <circle cx={x} cy={y - torsoHeight * 0.06} r={torsoWidth * 0.14} fill={colors.secondary} stroke={colors.accent} strokeWidth={2} />
              <path d={`M ${x - 6} ${y - torsoHeight * 0.06} L ${x} ${y + torsoHeight * 0.06} L ${x + 6} ${y - torsoHeight * 0.06}`} stroke={colors.accent} strokeWidth={2} fill="none" />
            </g>
          )}
          {/* shoulder pads & chest plate V for elites */}
          {(templateKey === 'warrior' || templateKey === 'champion') && (
            <g opacity={0.9}>
              <circle cx={x - torsoWidth * 0.26} cy={y - torsoHeight * 0.02} r={torsoWidth * 0.14} fill={colors.secondary} stroke={colors.accent} strokeWidth={2} />
              <circle cx={x + torsoWidth * 0.26} cy={y - torsoHeight * 0.02} r={torsoWidth * 0.14} fill={colors.secondary} stroke={colors.accent} strokeWidth={2} />
              <path d={`M ${x - torsoWidth * 0.22} ${y} L ${x} ${y + torsoHeight * 0.22} L ${x + torsoWidth * 0.22} ${y}`} stroke={colors.accent} strokeWidth={3} fill="none" />
            </g>
          )}
          {templateKey === 'warrior' && (
            <g opacity={0.9}>
              <rect x={x - torsoWidth * 0.36} y={y + torsoHeight * 0.06} width={torsoWidth * 0.72} height={6} fill={colors.secondary} stroke={colors.accent} strokeWidth={2} />
              <circle cx={x - torsoWidth * 0.28} cy={y - torsoHeight * 0.02} r={torsoWidth * 0.16} fill={colors.secondary} stroke={colors.accent} strokeWidth={2} />
              <circle cx={x + torsoWidth * 0.28} cy={y - torsoHeight * 0.02} r={torsoWidth * 0.16} fill={colors.secondary} stroke={colors.accent} strokeWidth={2} />
            </g>
          )}
        </g>
      );
    case 'archer':
    case 'hunter':
    case 'sniper':
    case 'crossbow':
    case 'marksman':
    case 'icearcher':
    case 'sentry':
    case 'beastmaster':
      return (
        <g>
          {Body}
          {templateKey !== 'crossbow' ? (
            <>
              {/* archer recurved limbs */}
              <path d={`M ${x - size * 0.42} ${y - size * 0.2} Q ${x - size * 0.56} ${y}, ${x - size * 0.42} ${y + size * 0.2}`} stroke={colors.accent} strokeWidth={3} fill="none" />
              <line x1={x - size * 0.42} y1={y - size * 0.2} x2={x - size * 0.42} y2={y + size * 0.2} stroke={colors.accent} strokeWidth={1.5} opacity={0.8} />
              <line x1={x - size * 0.42} y1={y} x2={x + size * 0.18} y2={y} stroke={colors.accent} strokeWidth={2} />
              <polygon points={`${x + size * 0.18},${y - 4} ${x + size * 0.18},${y + 4} ${x + size * 0.28},${y}`} fill={colors.accent} />
              {/* quiver */}
              <rect x={x + torsoWidth * 0.52} y={y - torsoHeight * 0.24} width={6} height={14} fill={colors.secondary} stroke={outline} strokeWidth={1.5} />
              {Array.from({ length: 3 }).map((_, i) => (
                <polygon key={i} points={`${x + torsoWidth * 0.55},${y - torsoHeight * (0.3 + i*0.02)} ${x + torsoWidth * 0.63},${y - torsoHeight * (0.28 + i*0.02)} ${x + torsoWidth * 0.59},${y - torsoHeight * (0.2 + i*0.02)}`} fill={colors.accent} />
              ))}
            </>
          ) : (
            <g>
              <rect x={x - size * 0.18} y={y - size * 0.08} width={size * 0.36} height={size * 0.16} fill={colors.accent} opacity={0.7} rx={3} />
              <line x1={x - size * 0.28} y1={y - size * 0.18} x2={x - size * 0.02} y2={y} stroke={colors.accent} strokeWidth={3} />
              <line x1={x - size * 0.28} y1={y + size * 0.18} x2={x - size * 0.02} y2={y} stroke={colors.accent} strokeWidth={3} />
              <line x1={x + size * 0.02} y1={y} x2={x + size * 0.28} y2={y} stroke={colors.accent} strokeWidth={3} />
            </g>
          )}
          <rect x={x - size * 0.58} y={y - size * 0.22} width={6} height={size * 0.44} fill={colors.accent} opacity={0.35} />
          {/* marks for specific rangers */}
          {templateKey === 'marksman' && (
            <g>
              <circle cx={x + size * 0.28} cy={y - size * 0.28} r={6} stroke={colors.accent} strokeWidth={2} fill="none" />
              <rect x={x - torsoWidth * 0.4} y={y + torsoHeight * 0.05} width={torsoWidth * 0.8} height={6} fill={colors.secondary} opacity={0.7} />
              {/* bandolier */}
              <path d={`M ${x - torsoWidth * 0.34} ${y - torsoHeight * 0.04} L ${x + torsoWidth * 0.34} ${y + torsoHeight * 0.32}`} stroke={colors.accent} strokeWidth={3} />
            </g>
          )}
          {templateKey === 'icearcher' && (
            <g opacity={0.9}>
              {/* crystal arrowhead */}
              <polygon points={`${x + size * 0.24},${y - 6} ${x + size * 0.24},${y + 6} ${x + size * 0.34},${y}`} fill={colors.accent} />
              {/* crystalline bow limbs */}
              <path d={`M ${x - size * 0.42} ${y - size * 0.2} Q ${x - size * 0.56} ${y}, ${x - size * 0.42} ${y + size * 0.2}`} stroke={'#e0f2fe'} strokeWidth={5} opacity={0.45} />
              {/* frosty breath */}
              <ellipse cx={x + torsoWidth * 0.42} cy={y - torsoHeight * 0.36} rx={4 + pulse01 * 2} ry={2 + pulse01} fill={'#e0f2fe'} opacity={0.4} />
              {/* snowflake crest */}
              <g transform={`rotate(${(spinDeg * 0.4).toFixed(1)}, ${x + size * 0.28}, ${y - size * 0.28})`}>
                <circle cx={x + size * 0.28} cy={y - size * 0.28} r={5} stroke={'#93c5fd'} strokeWidth={2} fill="none" />
                <line x1={x + size * 0.28 - 5} y1={y - size * 0.28} x2={x + size * 0.28 + 5} y2={y - size * 0.28} stroke={'#93c5fd'} strokeWidth={1.5} />
                <line x1={x + size * 0.28} y1={y - size * 0.28 - 5} x2={x + size * 0.28} y2={y - size * 0.28 + 5} stroke={'#93c5fd'} strokeWidth={1.5} />
              </g>
            </g>
          )}
          {templateKey === 'sentry' && (
            <g>
              <rect x={x - torsoWidth * 0.9} y={y + torsoHeight * 0.02} width={torsoWidth * 0.5} height={torsoHeight * 0.28} rx={4} fill={colors.secondary} opacity={0.6} stroke={outline} strokeWidth={2} />
              {Array.from({ length: 4 }).map((_, i) => (
                <circle key={i} cx={x - torsoWidth * 0.65 + (i - 1.5) * (torsoWidth * 0.12)} cy={y + torsoHeight * 0.14} r={2} fill={outline} opacity={0.8} />
              ))}
              <line x1={x - torsoWidth * 0.65} y1={y - torsoHeight * 0.1} x2={x - torsoWidth * 0.65} y2={y + torsoHeight * 0.02} stroke={colors.accent} strokeWidth={2} />
              <circle cx={x - torsoWidth * 0.65} cy={y - torsoHeight * 0.12} r={3} fill={colors.accent} />
            </g>
          )}
          {templateKey === 'beastmaster' && (
            <g opacity={0.85}>
              <circle cx={x + torsoWidth * 0.52} cy={y - torsoHeight * 0.38} r={4} fill={colors.accent} />
              <circle cx={x + torsoWidth * 0.46} cy={y - torsoHeight * 0.48} r={3} fill={colors.accent} />
              <polygon points={`${x + torsoWidth * 0.44},${y - torsoHeight * 0.52} ${x + torsoWidth * 0.5},${y - torsoHeight * 0.62} ${x + torsoWidth * 0.56},${y - torsoHeight * 0.52}`} fill={colors.secondary} />
              <circle cx={x - torsoWidth * 0.1} cy={y - torsoHeight * 0.02} r={4} fill={colors.secondary} stroke={outline} strokeWidth={1.5} />
              <circle cx={x - torsoWidth * 0.1} cy={y - torsoHeight * 0.04} r={1.4} fill={colors.accent} />
              <circle cx={x - torsoWidth * 0.14} cy={y - torsoHeight * 0.0} r={1} fill={colors.accent} />
              <circle cx={x - torsoWidth * 0.06} cy={y - torsoHeight * 0.0} r={1} fill={colors.accent} />
              <circle cx={x - torsoWidth * 0.1} cy={y + torsoHeight * 0.02} r={1} fill={colors.accent} />
            </g>
          )}
          {templateKey === 'crossbow' && (
            <g opacity={0.9}>
              {/* bolt magazine */}
              <rect x={x + size * 0.06} y={y - size * 0.08} width={7} height={size * 0.16} rx={2} fill={colors.secondary} stroke={outline} strokeWidth={1} />
              {Array.from({ length: 3 }).map((_, i) => (
                <rect key={i} x={x + size * 0.07} y={y - size * (0.06 - i*0.02)} width={5} height={2} fill={colors.accent} opacity={0.8} />
              ))}
              {/* crank */}
              <circle cx={x - size * 0.06} cy={y + size * 0.02} r={3} fill={colors.secondary} stroke={outline} strokeWidth={1} />
              <line x1={x - size * 0.06} y1={y + size * 0.02} x2={x - size * 0.12} y2={y + size * 0.06} stroke={colors.accent} strokeWidth={2} />
              {/* stock */}
              <rect x={x - size * 0.28} y={y + size * 0.02} width={size * 0.16} height={6} fill={colors.secondary} stroke={outline} strokeWidth={1} />
            </g>
          )}
          {/* subtle bow draw sway */}
          {templateKey !== 'crossbow' && (
            <g transform={`translate(${swayTiny.toFixed(2)}, 0)`}>
              <line x1={x - size * 0.42} y1={y} x2={x + size * 0.18} y2={y} stroke={colors.accent} strokeWidth={1} opacity={0.4} />
            </g>
          )}
          {templateKey === 'hunter' && (
            <g>
              <path d={`M ${x + size * 0.15} ${y - size * 0.35} q -8 8 -14 0`} stroke={colors.accent} strokeWidth={2} fill="none" />
              <path d={`M ${x + size * 0.08} ${y - size * 0.34} q -6 6 -10 0`} stroke={colors.accent} strokeWidth={2} fill="none" />
              {/* fur cloak */}
              <path d={`M ${x} ${y - headR * 0.2} C ${x - torsoWidth} ${y + torsoHeight * 0.0}, ${x - torsoWidth * 0.8} ${y + torsoHeight * 0.9}, ${x} ${y + torsoHeight * 1.0}`} fill={colors.secondary} opacity={0.12} />
              {/* tooth necklace */}
              {Array.from({ length: 5 }).map((_, i) => (
                <path key={i} d={`M ${x - 8 + i * 4} ${y - torsoHeight * 0.2} q 2 3 0 5`} stroke={colors.accent} strokeWidth={2} />
              ))}
            </g>
          )}
          {templateKey === 'archer' && (
            <g opacity={0.9}>
              {/* armguard */}
              <rect x={x + torsoWidth * 0.18} y={y - torsoHeight * 0.08} width={8} height={6} fill={colors.secondary} stroke={colors.accent} strokeWidth={1.5} />
            </g>
          )}
          {templateKey === 'sniper' && (
            <g opacity={0.9}>
              <circle cx={x + size * 0.28} cy={y - size * 0.28} r={6} stroke={colors.accent} strokeWidth={2} fill="none" />
              <line x1={x + size * 0.22} y1={y - size * 0.28} x2={x + size * 0.34} y2={y - size * 0.28} stroke={colors.accent} strokeWidth={2} />
              <line x1={x + size * 0.28} y1={y - size * 0.34} x2={x + size * 0.28} y2={y - size * 0.22} stroke={colors.accent} strokeWidth={2} />
              {/* scope and stabilizer */}
              <circle cx={x + size * 0.16} cy={y - size * 0.06} r={3} fill={colors.secondary} stroke={outline} strokeWidth={1.5} />
              <line x1={x + size * 0.2} y1={y + size * 0.02} x2={x + size * 0.36} y2={y + size * 0.04} stroke={colors.secondary} strokeWidth={2} />
            </g>
          )}
        </g>
      );
    case 'mage':
    case 'sorcerer':
    case 'warlock':
    case 'mystic':
    case 'witch':
    case 'stormcaller':
    case 'druid':
    case 'cleric':
    case 'monk':
    case 'paladin':
      return (
        <g>
          {Body}
          {/* Staff with glowing gem */}
          {templateKey === 'sorcerer' && (
            <g>
              <rect x={x + torsoWidth * 0.6} y={y - size * 0.32} width={4} height={size * 0.74} fill={colors.secondary} />
              <circle cx={x + torsoWidth * 0.62} cy={y - size * 0.32} r={6 + pulse01 * 2} fill={colors.accent} opacity={0.7} />
              <circle cx={x + torsoWidth * 0.62} cy={y - size * 0.32} r={3 + pulse01} fill={'#fff'} opacity={0.5} />
            </g>
          )}
          {/* mage orb focus and robe lines */}
          {templateKey === 'mage' && (
            <g opacity={0.95}>
              <circle cx={x + torsoWidth * 0.66} cy={y - torsoHeight * 0.22} r={5 + pulse01} fill={colors.accent} opacity={0.75} />
              <rect x={x - torsoWidth * 0.22} y={y - torsoHeight * 0.08} width={torsoWidth * 0.44} height={2} fill={colors.accent} opacity={0.5} />
              <rect x={x - 1.5} y={y - torsoHeight * 0.08} width={3} height={torsoHeight * 0.5} fill={colors.accent} opacity={0.7} />
            </g>
          )}
          {/* cleric censer and aura */}
          {templateKey === 'cleric' && (
            <g opacity={0.9}>
              <line x1={x + torsoWidth * 0.6} y1={y - size * 0.2} x2={x + torsoWidth * 0.6} y2={y + size * 0.1} stroke={colors.secondary} strokeWidth={2} />
              <circle cx={x + torsoWidth * 0.6} cy={y + size * 0.12} r={5} fill={colors.accent} />
              <ellipse cx={x} cy={y + torsoHeight * 0.62} rx={torsoWidth * 0.6} ry={torsoWidth * 0.18} fill={colors.accent} opacity={0.12} />
            </g>
          )}
          {/* monk prayer beads and sash */}
          {templateKey === 'monk' && (
            <g opacity={0.95}>
              {Array.from({ length: 8 }).map((_, i) => {
                const ang = (-Math.PI / 2) + (i / 7) * Math.PI;
                const bx = x + Math.cos(ang) * (torsoWidth * 0.28);
                const by = y - torsoHeight * 0.22 + Math.sin(ang) * (torsoWidth * 0.2);
                return <circle key={i} cx={bx} cy={by} r={2.4} fill={colors.accent} />;
              })}
              <path d={`M ${x - torsoWidth * 0.4} ${y - torsoHeight * 0.08} L ${x + torsoWidth * 0.4} ${y + torsoHeight * 0.26}`} stroke={colors.secondary} strokeWidth={4} />
            </g>
          )}
          <rect x={x + torsoWidth * 0.6} y={y - size * 0.3} width={4} height={size * 0.7} fill={colors.accent} />
          <g transform={`rotate(${spinDeg.toFixed(1)}, ${x}, ${y - torsoHeight * 0.35})`}>
            <circle cx={x} cy={y - torsoHeight * 0.35} r={radius * 0.56} stroke={colors.accent} strokeDasharray="6 6" strokeWidth={3} fill="none" opacity={0.85} />
            <circle cx={x} cy={y - torsoHeight * 0.35} r={radius * 0.36} stroke={colors.accent} strokeDasharray="4 6" strokeWidth={2} fill="none" opacity={0.7} />
            <circle cx={x + radius * 0.56} cy={y - torsoHeight * 0.35} r={4} fill={colors.accent} />
          </g>
          {/* specialized caster visuals */}
          {templateKey === 'stormcaller' && (
            <g opacity={0.9}>
              <polyline points={`${x - 10},${y - torsoHeight * 0.5} ${x - 2},${y - torsoHeight * 0.62} ${x + 6},${y - torsoHeight * 0.54} ${x + 14},${y - torsoHeight * 0.68}`} fill="none" stroke={colors.accent} strokeWidth={2} />
              <polyline points={`${x - 6},${y - torsoHeight * 0.42} ${x + 2},${y - torsoHeight * 0.54} ${x + 10},${y - torsoHeight * 0.46} ${x + 18},${y - torsoHeight * 0.6}`} fill="none" stroke={colors.accent} strokeWidth={2} opacity={0.8} />
              {/* shoulder coils */}
              <g opacity={0.85}>
                <circle cx={x - torsoWidth * 0.26} cy={y - torsoHeight * 0.02} r={torsoWidth * 0.14} stroke={colors.accent} strokeWidth={2} fill="none" />
                <circle cx={x + torsoWidth * 0.26} cy={y - torsoHeight * 0.02} r={torsoWidth * 0.14} stroke={colors.accent} strokeWidth={2} fill="none" />
                <circle cx={x - torsoWidth * 0.26} cy={y - torsoHeight * 0.02} r={torsoWidth * 0.08 + pulse01 * 1.5} fill={colors.accent} opacity={0.35} />
                <circle cx={x + torsoWidth * 0.26} cy={y - torsoHeight * 0.02} r={torsoWidth * 0.08 + pulse01 * 1.5} fill={colors.accent} opacity={0.35} />
              </g>
            </g>
          )}
          {templateKey === 'sorcerer' && (
            <g opacity={0.95}>
              {Array.from({ length: 3 }).map((_, i) => (
                <circle key={i} cx={x + Math.cos(toRad(spinDeg * 0.6 + i * 2.094)) * (radius * 0.6)} cy={y - torsoHeight * 0.1 + Math.sin(toRad(spinDeg * 0.6 + i * 2.094)) * (radius * 0.3)} r={4} fill={colors.accent} />
              ))}
            </g>
          )}
          {templateKey === 'warlock' && (
            <g opacity={0.9}>
              <polygon points={`${x},${y - radius * 0.6} ${x + 6},${y - radius * 0.5} ${x - 6},${y - radius * 0.5}`} fill={colors.accent} />
              <polygon points={`${x - radius * 0.5},${y} ${x - radius * 0.42},${y - 6} ${x - radius * 0.58},${y - 6}`} fill={colors.accent} opacity={0.8} />
              {/* floating tomes */}
              {Array.from({ length: 2 }).map((_, i) => {
                const ang = toRad(spinDeg * 0.8 + i * Math.PI);
                const bx = x + Math.cos(ang) * (radius * 0.7);
                const by = y - torsoHeight * 0.05 + Math.sin(ang) * (radius * 0.35);
                return (
                  <g key={i} opacity={0.85}>
                    <rect x={bx - 6} y={by - 4} width={12} height={8} rx={1.5} fill={colors.secondary} stroke={outline} strokeWidth={1.5} />
                    <line x1={bx - 4} y1={by} x2={bx + 4} y2={by} stroke={colors.accent} strokeWidth={1.5} />
                  </g>
                );
              })}
            </g>
          )}
          {templateKey === 'druid' && (
            <g opacity={0.85}>
              <path d={`M ${x + 10} ${y - 8} q 8 -6 0 -14 q -8 6 0 14`} fill={colors.accent} opacity={0.35} />
              <path d={`M ${x - 10} ${y + 8} q -8 6 0 14 q 8 -6 0 -14`} fill={colors.accent} opacity={0.35} />
              {/* antlers */}
              <path d={`M ${x - headR * 0.8} ${y - torsoHeight * 0.48} q -6 -8 -2 -14`} stroke={colors.secondary} strokeWidth={3} fill="none" />
              <path d={`M ${x + headR * 0.8} ${y - torsoHeight * 0.48} q 6 -8 2 -14`} stroke={colors.secondary} strokeWidth={3} fill="none" />
              {/* vine belt */}
              <path d={`M ${x - torsoWidth * 0.4} ${y + torsoHeight * 0.02} q ${torsoWidth * 0.4} ${torsoHeight * 0.2} ${torsoWidth * 0.8} 0`} stroke={colors.accent} strokeWidth={3} />
            </g>
          )}
        </g>
      );
    case 'frost':
      return (
        <g opacity={0.95}>
          {Body}
          <g transform={`rotate(${spinDeg.toFixed(1)}, ${x}, ${y - torsoHeight * 0.2})`}>
            <line x1={x - radius * 0.6} y1={y - torsoHeight * 0.2} x2={x + radius * 0.6} y2={y - torsoHeight * 0.2} stroke={colors.accent} strokeWidth={2} />
            <line x1={x} y1={y - torsoHeight * 0.2 - radius * 0.6} x2={x} y2={y - torsoHeight * 0.2 + radius * 0.6} stroke={colors.accent} strokeWidth={2} />
            <line x1={x - radius * 0.42} y1={y - torsoHeight * 0.2 - radius * 0.42} x2={x + radius * 0.42} y2={y - torsoHeight * 0.2 + radius * 0.42} stroke={colors.accent} strokeWidth={2} />
            <line x1={x - radius * 0.42} y1={y - torsoHeight * 0.2 + radius * 0.42} x2={x + radius * 0.42} y2={y - torsoHeight * 0.2 - radius * 0.42} stroke={colors.accent} strokeWidth={2} />
          </g>
          {/* ice crown shards */}
          <g opacity={0.9}>
            {Array.from({ length: 5 }).map((_, i) => {
              const ang = (-Math.PI / 4) + (i / 4) * (Math.PI / 2);
              const bx = x + Math.cos(ang) * (headR * 0.9);
              const by = y - torsoHeight * 0.5 + Math.sin(ang) * (headR * 0.6);
              return <polygon key={i} points={`${bx},${by} ${bx + 4},${by - 8} ${bx - 4},${by - 8}`} fill={colors.accent} opacity={0.8} />;
            })}
          </g>
        </g>
      );
    case 'rogue':
    case 'berserker':
    case 'assassin':
    case 'duelist':
      return (
        <g>
          {Body}
          {/* twin daggers default; rogue gets hood */}
          <g transform={`rotate(35, ${x}, ${y})`}>
            <rect x={x - 2} y={y - size * 0.35} width={4} height={size * 0.52} fill={colors.accent} rx={2} />
          </g>
          <g transform={`rotate(-35, ${x}, ${y})`}>
            <rect x={x - 2} y={y - size * 0.35} width={4} height={size * 0.52} fill={colors.accent} rx={2} />
          </g>
          {templateKey === 'rogue' && (
            <path d={`M ${x - headR} ${y - torsoHeight * 0.48} q ${headR} ${-headR * 0.6} ${headR * 2} 0`} fill={colors.secondary} opacity={0.7} />
          )}
          {templateKey === 'berserker' && (
            <g opacity={0.9}>
              {/* dual axes */}
              <g transform={`rotate(${(-20 + swaySmall).toFixed(1)}, ${x - torsoWidth * 0.72}, ${y - torsoHeight * 0.04})`}>
                <rect x={x - torsoWidth * 0.78} y={y - torsoHeight * 0.32} width={3} height={size * 0.46} fill={colors.secondary} />
                <polygon points={`${x - torsoWidth * 0.78 - 8},${y - torsoHeight * 0.2} ${x - torsoWidth * 0.78 + 8},${y - torsoHeight * 0.2} ${x - torsoWidth * 0.78},${y - torsoHeight * 0.05}`} fill={colors.accent} />
              </g>
              <g transform={`rotate(${(20 - swaySmall).toFixed(1)}, ${x + torsoWidth * 0.86}, ${y - torsoHeight * 0.02})`}>
                <rect x={x + torsoWidth * 0.84} y={y - torsoHeight * 0.34} width={3} height={size * 0.48} fill={colors.secondary} />
                <polygon points={`${x + torsoWidth * 0.84 - 8},${y - torsoHeight * 0.22} ${x + torsoWidth * 0.84 + 8},${y - torsoHeight * 0.22} ${x + torsoWidth * 0.84},${y - torsoHeight * 0.06}`} fill={colors.accent} />
              </g>
              {/* shoulder spikes */}
              <polygon points={`${x - torsoWidth * 0.26},${y - torsoHeight * 0.02} ${x - torsoWidth * 0.36},${y + torsoHeight * 0.05} ${x - torsoWidth * 0.24},${y + torsoHeight * 0.08}`} fill={colors.accent} />
              <polygon points={`${x + torsoWidth * 0.26},${y - torsoHeight * 0.02} ${x + torsoWidth * 0.36},${y + torsoHeight * 0.05} ${x + torsoWidth * 0.24},${y + torsoHeight * 0.08}`} fill={colors.accent} />
              {/* ember sparks */}
              <circle cx={x} cy={y - size * 0.15} r={3 + pulse01} fill={colors.accent} />
              <circle cx={x} cy={y + size * 0.15} r={2.5 + pulse01 * 0.6} fill={colors.accent} />
            </g>
          )}
          {templateKey === 'assassin' && (
            <path d={`M ${x - headR} ${y - torsoHeight * 0.48} q ${headR} ${-headR * 0.8} ${headR * 2} 0`} fill={colors.secondary} opacity={0.8} />
          )}
          {templateKey === 'duelist' && (
            <g>
              {/* rapier with guard */}
              <rect x={x + torsoWidth * 0.72 - 1} y={y - size * 0.38} width={2} height={size * 0.6} fill={colors.accent} rx={1} />
              <circle cx={x + torsoWidth * 0.72} cy={y - size * 0.06} r={5} fill={colors.secondary} stroke={colors.accent} strokeWidth={2} />
              {/* feathered hat */}
              <path d={`M ${x - headR * 0.8} ${y - torsoHeight * 0.55} q ${headR * 0.8} ${-headR * 0.4} ${headR * 1.6} 0`} stroke={colors.secondary} strokeWidth={3} />
              <path d={`M ${x + headR * 0.2} ${y - torsoHeight * 0.6} q 8 -6 0 -12`} stroke={colors.accent} strokeWidth={2} />
            </g>
          )}
          {/* rogue cloak sway */}
          {(templateKey === 'rogue' || templateKey === 'assassin' || templateKey === 'duelist') && (
            <path d={`M ${x} ${y - headR * 0.2} C ${x - torsoWidth} ${y + torsoHeight * 0.05}, ${x - torsoWidth} ${y + torsoHeight * 0.9}, ${x + swaySmall} ${y + torsoHeight * 0.95}`} fill={colors.secondary} opacity={0.16} />
          )}
        </g>
      );
    case 'spear':
    case 'pikeman':
    case 'javelin':
    case 'phalanx':
      return (
        <g>
          {Body}
          <rect x={x + torsoWidth * 0.66} y={y - size * 0.48} width={templateKey === 'javelin' ? 3 : 4} height={templateKey === 'javelin' ? size * 0.56 : size * 0.76} fill={colors.accent} rx={2} />
          <polygon points={`${x + torsoWidth * 0.66 - 6},${y - size * 0.48} ${x + torsoWidth * 0.66 + 6},${y - size * 0.48} ${x + torsoWidth * 0.66},${y - (templateKey === 'javelin' ? size * 0.64 : size * 0.78)}`} fill={colors.accent} />
          {templateKey === 'spear' && (
            <g opacity={0.85}>
              {/* simple round shield */}
              <circle cx={x - torsoWidth * 0.78} cy={y + torsoHeight * 0.02} r={torsoWidth * 0.18} fill={colors.secondary} stroke={outline} strokeWidth={2} />
            </g>
          )}
          {templateKey === 'javelin' && (
            <g opacity={0.85}>
              {/* arm banding */}
              <rect x={x + torsoWidth * 0.06} y={y - torsoHeight * 0.02} width={torsoWidth * 0.24} height={3} fill={colors.secondary} />
              <rect x={x + torsoWidth * 0.06} y={y + torsoHeight * 0.06} width={torsoWidth * 0.22} height={3} fill={colors.accent} opacity={0.7} />
            </g>
          )}
          {templateKey === 'phalanx' && (
            <g>
              <rect x={x - torsoWidth * 0.9} y={y - torsoHeight * 0.05} width={torsoWidth * 0.42} height={torsoHeight * 0.5} rx={6} fill={colors.accent} opacity={0.18} stroke={outline} strokeWidth={2} />
              {/* shield boss and crest */}
              <circle cx={x - torsoWidth * 0.69} cy={y + torsoHeight * 0.16} r={torsoWidth * 0.06} fill={colors.secondary} stroke={outline} strokeWidth={1.5} />
              <path d={`M ${x - torsoWidth * 0.86} ${y + torsoHeight * 0.06} q ${torsoWidth * 0.2} ${-torsoHeight * 0.12} ${torsoWidth * 0.28} 0`} stroke={colors.accent} strokeWidth={2} />
            </g>
          )}
          {templateKey === 'pikeman' && (
            <g opacity={0.85}>
              {/* pennant */}
              <polygon points={`${x + torsoWidth * 0.78},${y - size * 0.22} ${x + torsoWidth * 1.02},${y - size * 0.18} ${x + torsoWidth * 0.86},${y - size * 0.08}`} fill={colors.secondary} />
            </g>
          )}
        </g>
      );
    case 'valkyrie':
      return (
        <g>
          {Body}
          {/* large wings */}
          <path d={`M ${x - 22} ${y - radius - 4} q 12 -10 24 0`} stroke={colors.accent} strokeWidth={3} fill="none" />
          <path d={`M ${x - 22} ${y - radius + 2} q 12 -10 24 0`} stroke={colors.accent} strokeWidth={2} fill="none" />
          {/* spear with banner */}
          <rect x={x - 2} y={y - size * 0.35} width={4} height={size * 0.52} fill={colors.accent} rx={2} />
          <polygon points={`${x + 4},${y - size * 0.22} ${x + 18},${y - size * 0.16} ${x + 4},${y - size * 0.08}`} fill={colors.secondary} opacity={0.6} />
          {/* wing flap overlay */}
          <g transform={`translate(0, ${flapY.toFixed(2)})`} opacity={0.75}>
            <path d={`M ${x - 22} ${y - radius - 8} q 12 -10 24 0`} stroke={colors.accent} strokeWidth={2} fill="none" />
          </g>
        </g>
      );
    case 'ballista':
      return (
        <g>
          {Body}
          {/* carriage */}
          <rect x={x - size * 0.34} y={y + size * 0.2} width={size * 0.68} height={size * 0.16} fill={colors.accent} opacity={0.6} rx={4} />
          {/* bow arms */}
          <line x1={x - size * 0.16} y1={y + size * 0.02} x2={x - size * 0.36} y2={y - size * 0.08} stroke={colors.secondary} strokeWidth={3} />
          <line x1={x + size * 0.16} y1={y + size * 0.02} x2={x + size * 0.36} y2={y - size * 0.08} stroke={colors.secondary} strokeWidth={3} />
          {/* bolt */}
          <polygon points={`${x - size * 0.1},${y + size * 0.0} ${x + size * 0.1},${y + size * 0.0} ${x},${y - size * 0.22}`} fill={colors.accent} />
          {/* wheels */}
          <circle cx={x - size * 0.24} cy={y + size * 0.36} r={size * 0.06} fill={colors.secondary} stroke={outline} strokeWidth={2} />
          <circle cx={x + size * 0.24} cy={y + size * 0.36} r={size * 0.06} fill={colors.secondary} stroke={outline} strokeWidth={2} />
        </g>
      );
    case 'slinger':
      return (
        <g>
          {Body}
          <path d={`M ${x - size * 0.36} ${y - size * 0.08} Q ${x - size * 0.14} ${y - size * 0.32}, ${x + size * 0.18} ${y - size * 0.04}`} stroke={colors.accent} strokeWidth={2} fill="none" />
          <circle cx={x + size * 0.18} cy={y - size * 0.04} r={3} fill={colors.accent} />
          {/* pouch */}
          <rect x={x - torsoWidth * 0.12} y={y + torsoHeight * 0.22} width={8} height={6} fill={colors.secondary} stroke={outline} strokeWidth={1.5} />
          {/* wrist wraps */}
          <rect x={x + torsoWidth * 0.12} y={y - torsoHeight * 0.02} width={torsoWidth * 0.16} height={3} fill={colors.accent} opacity={0.7} />
        </g>
      );
    case 'alchemist':
      return (
        <g>
          {Body}
          <g transform={`rotate(${(spinDeg * 0.1).toFixed(1)}, ${x + torsoWidth * 0.64}, ${y - torsoHeight * 0.22})`}>
            <rect x={x + torsoWidth * 0.6} y={y - torsoHeight * 0.28} width={8} height={14} rx={3} fill={colors.accent} opacity={0.8} />
            <circle cx={x + torsoWidth * 0.64} cy={y - torsoHeight * 0.14} r={6} fill={colors.accent} opacity={0.35} />
          </g>
          {/* bubbles */}
          {Array.from({ length: 3 }).map((_, i) => (
            <circle key={i} cx={x + torsoWidth * 0.64 + i * 4} cy={y - torsoHeight * 0.2 - i * 6 - pulse01 * 4} r={2} fill={colors.accent} opacity={0.6 - i * 0.15} />
          ))}
        </g>
      );
    case 'medic':
      return (
        <g>
          {Body}
          {/* satchel */}
          <rect x={x - torsoWidth * 0.1} y={y + torsoHeight * 0.18} width={torsoWidth * 0.2} height={torsoHeight * 0.18} rx={4} fill={colors.accent} opacity={0.25} />
          {/* cross emblem */}
          <rect x={x - 2} y={y + torsoHeight * 0.22} width={4} height={torsoHeight * 0.1} fill={colors.accent} />
          <rect x={x - 8} y={y + torsoHeight * 0.26} width={16} height={4} fill={colors.accent} />
          {/* stethoscope-like loop */}
          <path d={`M ${x - torsoWidth * 0.18} ${y - torsoHeight * 0.1} q ${torsoWidth * 0.18} ${torsoHeight * 0.12} ${torsoWidth * 0.36} 0`} stroke={colors.secondary} strokeWidth={2} fill="none" />
        </g>
      );
    case 'mystic':
      return (
        <g>
          {Body}
          <path d={`M ${x - 8} ${y - torsoHeight * 0.5} q 8 -12 16 0`} stroke={colors.accent} strokeWidth={2} fill="none" />
          <circle cx={x} cy={y - torsoHeight * 0.42} r={3} fill={colors.accent} />
          <rect x={x - torsoWidth * 0.22} y={y - torsoHeight * 0.1} width={torsoWidth * 0.44} height={2} fill={colors.accent} opacity={0.6} />
          <rect x={x - 1.5} y={y - torsoHeight * 0.1} width={3} height={torsoHeight * 0.5} fill={colors.accent} opacity={0.8} />
          {Array.from({ length: 3 }).map((_, i) => (
            <circle key={i} cx={x + Math.cos(((spinDeg * 1.2) * Math.PI/180) + i * 2.094) * (radius * 0.5)} cy={y - torsoHeight * 0.2 + Math.sin(((spinDeg * 1.2) * Math.PI/180) + i * 2.094) * (radius * 0.24)} r={2} fill={'#fff'} opacity={0.35} />
          ))}
        </g>
      );
    case 'witch':
      return (
        <g>
          {Body}
          {/* hat with band and star */}
          <polygon points={`${x - headR},${y - torsoHeight * 0.58} ${x},${y - torsoHeight * 0.88} ${x + headR},${y - torsoHeight * 0.58}`} fill={colors.secondary} stroke={outline} strokeWidth={2} />
          <rect x={x - headR * 0.6} y={y - torsoHeight * 0.6} width={headR * 1.2} height={4} fill={colors.accent} />
          <path d={`M ${x + headR * 0.4} ${y - torsoHeight * 0.66} l 4 -6 l 4 6 l -4 -2 Z`} fill={'#ffd166'} />
          {/* small broom strapped on back */}
          <g opacity={0.6}>
            <rect x={x - torsoWidth * 0.64} y={y - torsoHeight * 0.06} width={torsoWidth * 0.3} height={3} fill={colors.secondary} />
            <rect x={x - torsoWidth * 0.38} y={y - torsoHeight * 0.1} width={6} height={10} fill={colors.accent} />
          </g>
          <rect x={x + torsoWidth * 0.6} y={y - size * 0.24} width={4} height={size * 0.62} fill={colors.accent} />
        </g>
      );
    default:
      return (
        <g>
          {Body}
        </g>
      );
  }
}

function starPath(cx: number, cy: number, r: number): string {
  const spikes = 5;
  let rot = Math.PI / 2 * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;
  let path = `M ${cx} ${cy - r}`;
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * r;
    y = cy + Math.sin(rot) * r;
    path += ` L ${x} ${y}`;
    rot += step;
    x = cx + Math.cos(rot) * (r / 2);
    y = cy + Math.sin(rot) * (r / 2);
    path += ` L ${x} ${y}`;
    rot += step;
  }
  path += ' Z';
  return path;
}


