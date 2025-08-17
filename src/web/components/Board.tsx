import React from 'react';
import { useGameStore } from '../../world/state';
import { UNIT_TEMPLATES } from '../../world/units';
import { EffectsLayer } from './EffectsLayer';
import { UnitsLayer } from './UnitsLayer';
import { UnitChip } from './UnitChip';

const BOARD_ROWS = 8;
const BOARD_COLS = 8;
const GAP = 4;

export function Board(): JSX.Element {
  const board = useGameStore((s) => s.board);
  const units = useGameStore((s) => s.units);
  const moveUnit = useGameStore((s) => s.moveUnit);
  const moveUnitToBoard = useGameStore((s) => s.moveUnitToBoard);
  const removeUnit = useGameStore((s) => s.removeUnit);
  const phase = useGameStore((s) => s.phase);
  const bench = useGameStore((s) => s.bench);
  const level = useGameStore((s) => s.level);
  const [hoveredId, setHoveredId] = React.useState<string | undefined>();

  const cellSize = useGameStore((s) => s.cellSize);
  const cap = Math.max(1, Math.min(15, level));
  const cur = Object.values(board).filter((id) => !!id && useGameStore.getState().units[id!]?.team === 'player').length;
  return (
    <div style={{ position: 'relative', background: 'transparent', border: 'none', borderRadius: 12, padding: 8, marginBottom: 8, width: 'max-content', marginInline: 'auto' }}>
      <style>{`
        @keyframes bgShift { 0% { background-position: 0% 0%; } 100% { background-position: 120% 120%; } }
      `}</style>
      <div
        style={{ display: 'grid', gridTemplateColumns: `repeat(${BOARD_COLS}, ${cellSize}px)`, gap: GAP, position: 'relative' }}
        onDragOver={(e) => e.preventDefault()}
      >
        {Array.from({ length: BOARD_ROWS * BOARD_COLS }).map((_, idx) => {
          const r = Math.floor(idx / BOARD_COLS);
          const c = idx % BOARD_COLS;
          const cellKey = `${r},${c}`;
          const unitId = board[cellKey];
          const u = unitId ? units[unitId] : undefined;
          return (
            <Cell
              key={cellKey}
              r={r}
              c={c}
              unitId={unitId}
              cellSize={cellSize}
              allowDrop={phase === 'prep' && !unitId && r >= Math.floor(BOARD_ROWS / 2)}
              isCombat={phase === 'combat'}
              onDropUnit={(dragId) => {
                if (phase !== 'prep') return;
                if (bench.includes(dragId)) moveUnitToBoard(dragId, { r, c });
                else moveUnit(dragId, { r, c });
              }}
              onClear={() => phase === 'prep' && unitId && removeUnit({ r, c })}
              onHover={phase === 'prep' && u && u.team === 'player' ? () => setHoveredId(unitId) : undefined}
              onUnhover={phase === 'prep' ? () => setHoveredId((cur) => (cur === unitId ? undefined : cur)) : undefined}
            />
          );
        })}
        {/* Range overlay on hover (prep only, player units) */}
        {(phase === 'prep' || useGameStore.getState().alwaysShowRanges) && (hoveredId || useGameStore.getState().alwaysShowRanges) && (() => {
          const u = units[hoveredId];
          const idToUse = hoveredId || Object.values(board).find((id) => !!id && units[id!]?.team === 'player');
          if (!idToUse) return null;
          const uu = units[idToUse!];
          if (!uu || uu.team !== 'player') return null;
          const cellKey = Object.entries(board).find(([, id]) => id === idToUse)?.[0];
          if (!cellKey) return null;
          const [r, c] = cellKey.split(',').map(Number);
          const cx = c * (cellSize + GAP) + cellSize / 2;
          const cy = r * (cellSize + GAP) + cellSize / 2;
          const rng = UNIT_TEMPLATES[uu.templateKey].stats.range;
          const rpx = rng * (cellSize + GAP) + cellSize * 0.5;
          return (
            <svg key={`rng-overlay`} width={BOARD_COLS * cellSize + (BOARD_COLS - 1) * GAP} height={BOARD_ROWS * cellSize + (BOARD_ROWS - 1) * GAP} style={{ position: 'absolute', pointerEvents: 'none', inset: 0 }}>
              <defs>
                <radialGradient id="rngFill" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(59,130,246,0.16)" />
                  <stop offset="100%" stopColor="rgba(59,130,246,0.06)" />
                </radialGradient>
              </defs>
              <circle cx={cx} cy={cy} r={rpx} fill="url(#rngFill)" stroke="rgba(59,130,246,0.6)" strokeDasharray="6 8" />
            </svg>
          );
        })()}
      </div>
      {/* Special synergy overlay (prep and combat) */}
      <SynergyOverlay board={board} units={units} cellSize={cellSize} hoveredId={hoveredId} />
      {/* Player placement outline during prep */}
      {phase === 'prep' && (() => {
        const gridWidth = BOARD_COLS * cellSize + (BOARD_COLS - 1) * GAP + 2; // include 1px border on each side
        const halfRow = Math.floor(BOARD_ROWS / 2);
        const allowedRows = BOARD_ROWS - halfRow;
        const allowedTop = halfRow * (cellSize + GAP) - 1; // account for top border
        const allowedHeight = allowedRows * cellSize + (allowedRows - 1) * GAP + 2; // include borders
        return (
          <>
            {/* Halo layer (outside, pulsing) */}
            <div
              style={{
                position: 'absolute',
                top: 8 + allowedTop - 6,
                left: 8 - 1 - 6,
                width: gridWidth + 12,
                height: allowedHeight + 12,
                borderRadius: 16,
                pointerEvents: 'none',
                background: 'transparent',
                boxShadow: '0 0 0 rgba(34,197,94,0)',
                animation: 'pulseHalo 1.6s ease-in-out infinite',
              }}
            />
            {/* Border layer (aligned to tiles) */}
            <div
              style={{
                position: 'absolute',
                top: 8 + allowedTop,
                left: 8 - 1,
                width: gridWidth,
                height: allowedHeight,
                boxSizing: 'border-box',
                border: '2px solid #22c55e',
                borderRadius: 10,
                background: 'transparent',
                pointerEvents: 'none',
                boxShadow: '0 0 18px rgba(34,197,94,0.28)',
                animation: 'pulseOutline 1.6s ease-in-out infinite',
              }}
            />
            <style>{`
              @keyframes pulseOutline {
                0% { box-shadow: 0 0 10px rgba(34,197,94,0.18); }
                50% { box-shadow: 0 0 34px rgba(34,197,94,0.55); }
                100% { box-shadow: 0 0 10px rgba(34,197,94,0.18); }
              }
              @keyframes pulseHalo {
                0% { transform: scale(1); box-shadow: 0 0 0 rgba(34,197,94,0); }
                50% { transform: scale(1.02); box-shadow: 0 0 64px rgba(34,197,94,0.45); }
                100% { transform: scale(1); box-shadow: 0 0 0 rgba(34,197,94,0); }
              }
            `}</style>
          </>
        );
      })()}
      {/* Bench drop zone removed: units can be dragged directly onto the bench now */}
      {phase === 'prep' && (
        <div style={{ marginTop: 6, textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>Units on board: {cur}/{cap}</div>
      )}
      {phase === 'combat' && <UnitsLayer rows={BOARD_ROWS} cols={BOARD_COLS} cellSize={cellSize} gap={GAP} />}
      <EffectsLayer rows={BOARD_ROWS} cols={BOARD_COLS} cellSize={cellSize} gap={GAP} />
    </div>
  );
}

function SynergyOverlay({ board, units, cellSize, hoveredId }: { board: Record<string, string | undefined>; units: Record<string, any>; cellSize: number; hoveredId?: string }): JSX.Element | null {
  const phase = useGameStore((s) => s.phase);
  // animation ticker
  const [now, setNow] = React.useState(0);
  const [tip, setTip] = React.useState<{ x: number; y: number; label: string; desc: string } | null>(null);
  React.useEffect(() => {
    let raf = 0;
    const loop = () => { setNow(performance.now()); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  // Build map from template -> list of player unit positions
  const posByTemplate = new Map<string, Array<{ r: number; c: number; x: number; y: number; id: string }>>();
  for (const [k, id] of Object.entries(board)) {
    if (!id) continue;
    const u = units[id];
    if (!u || u.team !== 'player') continue;
    const [r, c] = k.split(',').map(Number);
    const x = c * (cellSize + GAP) + cellSize / 2;
    const y = r * (cellSize + GAP) + cellSize / 2;
    const arr = posByTemplate.get(u.templateKey) || [];
    arr.push({ r, c, x, y, id });
    posByTemplate.set(u.templateKey, arr);
  }
  // Duo definitions: [a,b,label,color1,color2]
  const DUOS: Array<[string, string, string, string, string]> = [
    ['frost','marksman','Shatter','#60a5fa','#bae6fd'],
    ['paladin','sorcerer','Nova','#fde68a','#fbbf24'],
    ['assassin','rogue','Backstab','#ef4444','#f59e0b'],
    ['guardian','cleric','Bulwark','#60a5fa','#93c5fd'],
    ['hunter','beastmaster','Pack','#22c55e','#10b981'],
    ['spear','phalanx','Impale','#67e8f9','#0ea5e9'],
    ['mage','warlock','Ruin','#a78bfa','#7c3aed'],
    ['druid','monk','Grove','#86efac','#bbf7d0'],
    ['sniper','marksman','Headshot','#facc15','#f59e0b'],
    ['ballista','sentry','Overwatch','#60a5fa','#1d4ed8'],
    ['icearcher','frost','Freeze','#93c5fd','#e0f2fe'],
    ['knight','templar','Bash','#fcd34d','#f59e0b'],
    ['valkyrie','paladin','Judgement','#fde68a','#fbbf24'],
    ['archer','crossbow','Volley','#22c55e','#10b981'],
    ['sorcerer','stormcaller','Chain','#a78bfa','#7c3aed'],
    ['warrior','berserker','Rage','#ef4444','#f59e0b'],
    ['assassin','duelist','Lunge','#fca5a5','#f87171'],
    ['pikeman','javelin','Reach','#67e8f9','#0ea5e9'],
    ['guardian','paladin','Aegis','#60a5fa','#fde68a'],
    ['valkyrie','templar','Wings','#fde68a','#f59e0b'],
    ['knight','guardian','Wall','#93c5fd','#fcd34d'],
    ['paladin','templar','Radiance','#fcd34d','#fde68a'],
    ['mage','frost','Glacier','#93c5fd','#a78bfa'],
    ['warlock','witch','Hex','#a78bfa','#c4b5fd'],
    ['sniper','crossbow','Pierce','#facc15','#f59e0b'],
    ['druid','beastmaster','Mending','#86efac','#10b981'],
    ['cleric','medic','Triage','#22c55e','#86efac'],
    ['gladiator','champion','Roar','#f59e0b','#fcd34d'],
    ['knight','paladin','Oath','#60a5fa','#fde68a'],
    ['archer','hunter','Falcon','#22c55e','#10b981'],
    ['warlock','mystic','Hexburst','#a78bfa','#c4b5fd'],
    ['ballista','slinger','Explosive','#f59e0b','#fbbf24'],
    ['alchemist','cleric','Elixir','#86efac','#22c55e'],
    ['gladiator','valkyrie','Skyfall','#fde68a','#f59e0b'],
    ['rogue','mystic','Bewilder','#fca5a5','#a78bfa'],
    ['guardian','champion','Bulwark','#93c5fd','#fcd34d'],
    ['druid','paladin','Blessed','#86efac','#fde68a'],
    ['sentry','marksman','Focus','#60a5fa','#f59e0b'],
    ['guardian','valkyrie','Aerial','#93c5fd','#fde68a'],
    ['monk','paladin','Serenity','#22c55e','#fde68a'],
  ];
  // Trio labels for overlay tooltip clarity only (not drawn as separate arcs)
  const TRIOS: Array<{ keys: string[]; label: string }> = [
    { keys: ['knight','paladin','templar'], label: 'Holy Triumvirate' },
    { keys: ['archer','marksman','sniper'], label: 'Arrow Storm' },
    { keys: ['guardian','champion','gladiator'], label: 'Phalanx Wall' },
    { keys: ['druid','monk','paladin'], label: 'Sanctuary' },
    { keys: ['sorcerer','warlock','witch'], label: 'Chaos Nexus' },
    { keys: ['pikeman','phalanx','spear'], label: 'Piercing Wall' },
    { keys: ['cleric','monk','medic'], label: 'Hymn of Life' },
    { keys: ['mage','sorcerer','stormcaller'], label: 'Tempest' },
    { keys: ['rogue','assassin','duelist'], label: 'Deathblossom' },
    { keys: ['guardian','shieldbearer','shieldman'], label: 'Iron Bulwark' },
    { keys: ['frost','icearcher','mystic'], label: 'Absolute Zero' },
    { keys: ['ballista','sentry','slinger'], label: 'Siege Network' },
    { keys: ['hunter','archer','beastmaster'], label: 'Pack Hunt' },
  ];
  const width = BOARD_COLS * cellSize + (BOARD_COLS - 1) * GAP;
  const height = BOARD_ROWS * cellSize + (BOARD_ROWS - 1) * GAP;
  const speedMul = useGameStore.getState().phase === 'combat' ? 1.6 : 1.0;
  const dashOffset = Math.floor((now / (20 / speedMul)) % 200);
  const rot = (now / (1200 / speedMul)) % 360;
  const particlePhase = (now / (1000 / speedMul));
  const MAX_LINKS_PER_DUO = 2;

  const DESC: Record<string, string> = {
    Shatter: 'Bonus damage to slowed enemies with icy burst.',
    Nova: 'Paladin pulses also damage nearby foes.',
    Backstab: 'Isolated targets suffer heavy bleed.',
    Bulwark: 'Allies gain brief shields/DR.',
    Pack: 'Rangers fire an extra weaker shot.',
    Impale: 'Extra damage to the cell behind the target.',
    Ruin: 'Splash damage around the struck target.',
    Grove: 'Cleanse and small extra heal on pulses.',
    Headshot: 'Chance to massively amplify a ranged hit.',
    Overwatch: 'Auto-fire at a random enemy after a hit.',
    Freeze: 'Slow may briefly stun on hit.',
    Bash: 'Smite in a small cone behind the target.',
    Judgement: 'On kill, smite adjacent enemies.',
    Volley: 'Extra arrows to nearby enemies.',
    Chain: 'Lightning jumps to a nearby enemy.',
    Rage: 'Shock damage on melee hit; screenshake.',
    Lunge: 'Brief slow on low-HP enemies on hit.',
    Reach: 'Extra spear jab to the same target.',
    Aegis: 'Heal pulses grant damage reduction.',
    Wings: 'Smite ring on Valkyrie melee hits.',
    Wall: 'Shield ally directly behind attacker.',
    Radiance: 'Radiant ring when Paladin heals.',
    Glacier: 'Extra frost ring + damage on slowed foes.',
    Hex: 'Brief slow on hit with arcane rune.',
    Pierce: 'Try to hit the enemy behind the target.',
    Mending: 'Heal a nearby ally on Beastmaster hit.',
    Triage: 'Heal the lowest-HP ally on heal pulse.',
    Roar: 'Damage or shield effect to nearby units.',
    Oath: 'Knight gains a small shield on hit.',
    Falcon: 'Extra arrow to same target.',
    Hexburst: 'Bonus damage vs slowed or stunned enemies.',
    Explosive: 'Small AoE around the target.',
    Blessed: 'Extra small heals around Paladin pulses.',
    Focus: 'Chance to refire at same target.',
    Aerial: 'Valkyrie shield when near Guardian.',
    Serenity: 'Monk gains a small HoT after hits.',
  };

  // Build trio-active labels for tooltip summary
  const trioActive: string[] = [];
  for (const t of TRIOS) {
    const have = t.keys.every((k) => (posByTemplate.get(k) || []).length > 0);
    if (have) trioActive.push(t.label);
  }

  function qPoint(ax: number, ay: number, cx: number, cy: number, bx: number, by: number, t: number): { x: number; y: number } {
    const x = (1 - t) * (1 - t) * ax + 2 * (1 - t) * t * cx + t * t * bx;
    const y = (1 - t) * (1 - t) * ay + 2 * (1 - t) * t * cy + t * t * by;
    return { x, y };
  }
  function qTangent(ax: number, ay: number, cx: number, cy: number, bx: number, by: number, t: number): { x: number; y: number } {
    const x = 2 * (1 - t) * (cx - ax) + 2 * t * (bx - cx);
    const y = 2 * (1 - t) * (cy - ay) + 2 * t * (by - cy);
    const len = Math.max(1e-6, Math.hypot(x, y));
    return { x: x / len, y: y / len };
  }
  const arcs: React.ReactNode[] = [];
  const labels: React.ReactNode[] = [];
  const halos: React.ReactNode[] = [];
  const particles: React.ReactNode[] = [];
  const endcaps: React.ReactNode[] = [];
  for (const [a, b, label, c1, c2] of DUOS) {
    const pa = posByTemplate.get(a) || [];
    const pb = posByTemplate.get(b) || [];
    if (pa.length === 0 || pb.length === 0) continue;
    // build candidate links and pick up to MAX_LINKS_PER_DUO without reusing same unit
    const candidates: Array<{ A: typeof pa[number]; B: typeof pb[number]; d: number }> = [];
    for (const A of pa) for (const B of pb) {
      const d = Math.abs(A.r - B.r) + Math.abs(A.c - B.c);
      candidates.push({ A, B, d });
    }
    candidates.sort((x, y) => x.d - y.d);
    const used = new Set<string>();
    const picks: Array<{ A: typeof pa[number]; B: typeof pb[number] }> = [];
    for (const cand of candidates) {
      if (picks.length >= MAX_LINKS_PER_DUO) break;
      if (used.has(cand.A.id) || used.has(cand.B.id)) continue;
      picks.push({ A: cand.A, B: cand.B });
      used.add(cand.A.id); used.add(cand.B.id);
    }
    if (picks.length === 0) continue;
    const emphasize = hoveredId && picks.some(p => p.A.id === hoveredId || p.B.id === hoveredId);
    const baseOpacity = emphasize ? 1 : 0.9;
    const glowOpacity = emphasize ? 0.12 : 0.08;
    for (const { A, B } of picks) {
      // curved path control point (bezier) slightly above midpoint
      const mx = (A.x + B.x) / 2;
      const my = (A.y + B.y) / 2;
      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const nx = -dy; const ny = dx; // perpendicular
      const len = Math.max(20, Math.hypot(dx, dy) * 0.12);
      const cx = mx + (nx / Math.max(1, Math.hypot(nx, ny))) * len * (A.x < B.x ? 1 : -1);
      const cy = my + (ny / Math.max(1, Math.hypot(nx, ny))) * len * (A.y < B.y ? -1 : 1);
      const gradId = `duo-${a}-${b}-${A.id.slice(-3)}-${B.id.slice(-3)}`;
      arcs.push(
        <g key={`arc-${a}-${b}-${A.id}-${B.id}`} opacity={baseOpacity} style={{ pointerEvents: 'visibleStroke', cursor: 'help' as any }}
           onMouseEnter={() => setTip({ x: mid.x, y: mid.y, label, desc: DESC[label] || '' })}
           onMouseLeave={() => setTip(null)}
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={c1} />
              <stop offset="100%" stopColor={c2} />
            </linearGradient>
          </defs>
          <path d={`M ${A.x} ${A.y} Q ${cx} ${cy} ${B.x} ${B.y}`} stroke={`url(#${gradId})`} strokeWidth={4} fill="none" strokeDasharray="10 8" strokeLinecap="round" style={{ mixBlendMode: 'screen' as any }} strokeDashoffset={dashOffset} />
          <path d={`M ${A.x} ${A.y} Q ${cx} ${cy} ${B.x} ${B.y}`} stroke={c2} strokeWidth={8} fill="none" opacity={glowOpacity} />
        </g>
      );
      // mid rotating glyph & label
      const mid = qPoint(A.x, A.y, cx, cy, B.x, B.y, 0.5);
      labels.push(
        <g key={`lbl-${a}-${b}-${A.id}-${B.id}`} opacity={emphasize ? 1 : 0.95}>
          <g transform={`rotate(${rot.toFixed(1)}, ${mid.x}, ${mid.y})`}>
            <polygon points={`${mid.x-4},${mid.y} ${mid.x},${mid.y-8} ${mid.x+4},${mid.y} ${mid.x},${mid.y+8}`} fill={c1} opacity={0.6} />
            <polygon points={`${mid.x-6},${mid.y} ${mid.x},${mid.y-12} ${mid.x+6},${mid.y} ${mid.x},${mid.y+12}`} fill={c2} opacity={0.2} />
          </g>
          <rect x={mid.x - 28} y={mid.y - 16} width={56} height={20} rx={10} fill={'rgba(0,0,0,0.45)'} stroke={c2} strokeWidth={1.5} />
          <text x={mid.x} y={mid.y - 6} fill={c1} fontSize={10} fontWeight={900} textAnchor="middle" dominantBaseline="central" style={{ letterSpacing: 0.6 }}>{label}</text>
        </g>
      );
      // halo rings around participants
      const ringR = Math.max(10, cellSize * 0.42);
      const haloO = 0.5 + 0.5 * Math.sin(now / (400 / speedMul));
      halos.push(
        <g key={`ha-${A.id}`} opacity={0.85}>
          <circle cx={A.x} cy={A.y} r={ringR} stroke={c1} strokeWidth={2} fill="none" strokeDasharray="6 6" />
          <circle cx={A.x} cy={A.y} r={ringR * (0.82 + 0.04 * haloO)} stroke={c2} strokeWidth={1.5} fill="none" opacity={0.6} />
        </g>
      );
      halos.push(
        <g key={`hb-${B.id}`} opacity={0.85}>
          <circle cx={B.x} cy={B.y} r={ringR} stroke={c1} strokeWidth={2} fill="none" strokeDasharray="6 6" />
          <circle cx={B.x} cy={B.y} r={ringR * (0.82 + 0.04 * haloO)} stroke={c2} strokeWidth={1.5} fill="none" opacity={0.6} />
        </g>
      );
      // flowing particles along arc
      for (let i = 0; i < 3; i++) {
        const u = (particlePhase + i * 0.33) % 1;
        const p = qPoint(A.x, A.y, cx, cy, B.x, B.y, u);
        particles.push(
          <circle key={`pt-${a}-${b}-${A.id}-${B.id}-${i}`} cx={p.x} cy={p.y} r={2.5} fill={c1} opacity={0.85} />
        );
      }
      // endcaps indicating direction
      const tA = qTangent(A.x, A.y, cx, cy, B.x, B.y, 0.08);
      const tB = qTangent(A.x, A.y, cx, cy, B.x, B.y, 0.92);
      const cap = (x: number, y: number, tx: number, ty: number, key: string) => (
        <g key={key} opacity={0.9}>
          <g transform={`translate(${x}, ${y}) rotate(${(Math.atan2(ty, tx) * 180 / Math.PI).toFixed(1)})`}>
            <polygon points={`0,0 8,3 8,-3`} fill={c2} opacity={0.8} />
          </g>
        </g>
      );
      endcaps.push(cap(A.x + tA.x * 10, A.y + tA.y * 10, tA.x, tA.y, `capA-${A.id}-${B.id}`));
      endcaps.push(cap(B.x - tB.x * 10, B.y - tB.y * 10, -tB.x, -tB.y, `capB-${A.id}-${B.id}`));
    }
  }
  if (arcs.length === 0) return null;
  return (
    <svg width={width} height={height} style={{ position: 'absolute', inset: 8, pointerEvents: phase === 'prep' ? 'none' : 'auto' }}>
      {arcs}
      {labels}
      {halos}
      {particles}
      {endcaps}
      {trioActive.length > 0 && (
        <g>
          <rect x={8} y={8} width={220} height={18 + trioActive.length * 14} rx={8} fill={'rgba(0,0,0,0.6)'} stroke={'#ffffff22'} strokeWidth={1} />
          <text x={18} y={20} fill={'#ffffff'} fontSize={11} fontWeight={900}>Trios Active</text>
          {trioActive.map((s, i) => (
            <text key={s} x={18} y={36 + i * 14} fill={'#e5e7eb'} fontSize={10}>{s}</text>
          ))}
        </g>
      )}
      {tip && (
        <g>
          <rect x={tip.x - 80} y={tip.y - 42} width={160} height={36} rx={8} fill={'rgba(0,0,0,0.7)'} stroke={'#ffffff22'} strokeWidth={1} />
          <text x={tip.x} y={tip.y - 30} fill={'#ffffff'} fontSize={11} fontWeight={900} textAnchor="middle">{tip.label}</text>
          <text x={tip.x} y={tip.y - 16} fill={'#e5e7eb'} fontSize={10} textAnchor="middle">{DESC[tip.label] || ''}</text>
        </g>
      )}
    </svg>
  );
}

function Cell(props: {
  r: number;
  c: number;
  unitId?: string;
  cellSize: number;
  allowDrop: boolean;
  isCombat: boolean;
  onDropUnit: (id: string) => void;
  onClear: () => void;
  onHover?: () => void;
  onUnhover?: () => void;
}): JSX.Element {
  const { r, c, unitId, cellSize, allowDrop, isCombat, onDropUnit, onClear, onHover, onUnhover } = props;
  // no local dragged id cache; always trust dataTransfer to avoid stale IDs
  const [isOver, setIsOver] = React.useState(false);

  return (
    <div
      onDragOver={(e) => {
        if (!allowDrop) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/plain');
        setIsOver(false);
          if (id && allowDrop) onDropUnit(id);
      }}
      onDragEnter={() => allowDrop && setIsOver(true)}
      onDragLeave={() => setIsOver(false)}
      onMouseEnter={() => onHover && onHover()}
      onMouseLeave={() => onUnhover && onUnhover()}
      style={{
        background: (r < Math.floor(BOARD_ROWS / 2)
          ? `linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 60%), rgba(14, 165, 233, 0.22)`
          : `linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 60%), rgba(99, 102, 241, 0.18)`),
        border: (r < Math.floor(BOARD_ROWS / 2)
          ? '1px solid rgba(14, 165, 233, 0.45)'
          : '1px solid rgba(99, 102, 241, 0.4)'),
        borderRadius: 6,
        width: cellSize,
        height: cellSize,
        position: 'relative',
        boxShadow: isOver ? '0 0 0 2px rgba(14,165,233,0.7) inset' : undefined,
        opacity: allowDrop || unitId ? 1 : 0.6,
        boxSizing: 'border-box',
        backgroundSize: '200% 200%',
        animation: 'bgShift 12s linear infinite',
      }}
    >
      {unitId ? (
        !isCombat ? (
          <div style={{ position: 'absolute', inset: 2 }}>
            <UnitChip unitId={unitId} compact />
          </div>
        ) : <div />
      ) : (
        <div />
      )}
    </div>
  );
}


