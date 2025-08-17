import React from 'react';
import { useGameStore } from '../../world/state';
import { getUnitById, getUnitVisual, UNIT_TEMPLATES, getUnitTraits } from '../../world/units';

export function UnitChip(props: {
  unitId: string;
  draggable?: boolean;
  onDropToBoard?: (pos: { r: number; c: number }) => void;
  onClear?: () => void;
  onSell?: () => void;
  compact?: boolean;
}): JSX.Element {
  const { unitId, draggable, onDropToBoard, onClear, onSell, compact } = props;
  const unit = getUnitById(unitId);
  const visual = getUnitVisual(unit.templateKey);
  const inst = useGameStore((s) => s.units[unitId]);
  const phase = useGameStore((s) => s.phase);
  const star = inst?.star ?? 1;
  const scaledAtk = unit.stats.atk * star;
  const scaledAtkCd = Math.max(200, Math.floor(unit.stats.atkIntervalMs / star));
  const scaledMoveCd = Math.max(120, Math.floor(unit.stats.moveIntervalMs / star));

  const ref = React.useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = React.useState(false);
  const [flip, setFlip] = React.useState(false);
  const nameRef = React.useRef<HTMLDivElement | null>(null);
  const [nameFontPx, setNameFontPx] = React.useState(10);

  React.useLayoutEffect(() => {
    if (!compact) return;
    const compute = () => {
      try {
        const root = ref.current;
        if (!root) return;
        const available = Math.max(20, root.clientWidth - 8);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        let px = 10;
        // measure and shrink until it fits or we hit min size
        while (px >= 7) {
          ctx.font = `${px}px Inter, system-ui, Arial, sans-serif`;
          const metrics = ctx.measureText(unit.name);
          if (metrics.width <= available) break;
          px -= 1;
        }
        setNameFontPx(px);
      } catch {}
    };
    compute();
    const onResize = () => compute();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [compact, unit.name]);

  return (
    <div
      ref={ref}
      draggable={draggable ?? true}
      onMouseEnter={() => {
        setHover(true);
        try {
          const el = ref.current;
          if (el) {
            const rect = el.getBoundingClientRect();
            const tooltipWidth = 280;
            setFlip(rect.right + tooltipWidth > window.innerWidth - 8);
          }
        } catch {}
      }}
      onMouseLeave={() => setHover(false)}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', unitId);
        e.currentTarget.style.opacity = '0.85';
      }}
      onDragEnd={() => {
        if (ref.current) ref.current.style.opacity = '1';
      }}
      style={{
        userSelect: 'none',
        background: `linear-gradient(160deg, ${visual.secondary} 0%, ${visual.primary} 100%)`,
        border: `1px solid ${visual.accent}`,
        borderRadius: compact ? 6 : 10,
        padding: compact ? 4 : '6px 8px',
        fontSize: compact ? 11 : 12,
        display: compact ? 'grid' : 'grid',
        gridTemplateColumns: compact ? '1fr' : '28px 1fr auto',
        gridTemplateRows: compact ? 'auto auto' : undefined,
        gap: compact ? 2 : 8,
        alignItems: 'center',
        width: compact ? '100%' : undefined,
        height: compact ? '100%' : undefined,
        overflow: 'visible',
        justifyItems: compact ? 'center' : undefined,
        textAlign: compact ? 'center' : 'left',
        boxSizing: 'border-box',
        color: compact ? undefined : '#ffffff',
        position: 'relative',
      }}
    >
      <div style={{ width: compact ? 24 : 28, height: compact ? 24 : 28, borderRadius: 6, background: visual.accent, display: 'grid', placeItems: 'center' }}>
        <Emblem kind={visual.emblem} color={visual.secondary} />
      </div>
      <div style={{ maxWidth: '100%', minWidth: 0 }}>
        <div
          ref={nameRef}
          title={`${unit.name}${inst?.star && inst.star > 1 ? ` ★${inst.star}` : ''}`}
          style={compact ? {
            fontWeight: 900,
            overflow: 'hidden',
            color: '#ffffff',
            fontSize: nameFontPx,
            lineHeight: 1.1,
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            minWidth: 0,
            textShadow: '0 1px 2px rgba(0,0,0,0.9)',
            background: 'rgba(0,0,0,0.38)',
            padding: '1px 3px',
            borderRadius: 4,
          } : {
            fontWeight: 800,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            color: '#ffffff',
            textShadow: '0 1px 4px rgba(0,0,0,0.9)',
            minWidth: 0,
          }}
        >
          {unit.name} {!compact && inst?.star && inst.star > 1 ? `★${inst.star}` : ''}
        </div>
        {/* Trait badges with thresholds tooltip */}
        <div style={{ display: 'flex', gap: 4, marginTop: compact ? 2 : 4, flexWrap: 'wrap' }}>
          {getUnitTraits(unit.templateKey).slice(0, 2).map((t) => (
            <span
              key={t}
              title={`${t} · thresholds 2/4/6`}
              style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 999, background: 'rgba(255,255,255,0.18)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.35)' }}
            >
              {t}
            </span>
          ))}
        </div>
        {!compact && (
          <div style={{ color: 'rgba(255,255,255,0.9)', opacity: 1, fontSize: 11 }}>
            HP {unit.stats.hp * star} · ATK {scaledAtk} · RNG {unit.stats.range} · CD {(scaledAtkCd/1000).toFixed(2)}s
          </div>
        )}
      </div>
      {!compact && phase === 'prep' && (
        <div style={{ display: 'flex', gap: 6 }}>
          {onClear && (
            <button onClick={() => onClear()} style={{ padding: '4px 6px' }}>X</button>
          )}
          {onSell && (
            <button
              onClick={() => onSell()}
              onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(1px) scale(0.995)'; }}
              onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0) scale(1)'; }}
              style={{
                padding: '8px 10px',
                borderRadius: 10,
                border: '1px solid var(--bad)',
                background: 'var(--bad)',
                color: '#ffffff',
                fontWeight: 800,
                letterSpacing: 0.4,
                boxShadow: '0 6px 12px rgba(220,38,38,0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
              title="Sell unit"
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="#fff" aria-hidden>
                <path d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 7h2v8h-2v-8zm4 0h2v8h-2v-8zM7 10h2v8H7v-8z" />
              </svg>
              Sell
            </button>
          )}
        </div>
      )}
      {/* Tooltip */}
      {hover && (
        <UnitTooltip unitId={unitId} compact={!!compact} flip={flip} />
      )}
      {compact && (
        <div
          style={{
            position: 'absolute',
            top: 2,
            right: 2,
            padding: '1px 4px',
            borderRadius: 6,
            fontSize: 10,
            fontWeight: 900,
            color: (star >= 3 ? '#ffd166' : star === 2 ? '#c3e88d' : '#ffffff'),
            background: 'rgba(0,0,0,0.55)',
            border: `1px solid ${visual.accent}`,
            textShadow: '0 1px 2px rgba(0,0,0,0.8)'
          }}
          title={`${star}★`}
        >
          ★{star}
        </div>
      )}
    </div>
  );
}

function Emblem({ kind, color }: { kind: 'sword' | 'bow' | 'orb' | 'shield' | 'dagger' | 'spear' | 'plus'; color: string }): JSX.Element {
  if (kind === 'sword') {
    return (
      <svg width={18} height={18} viewBox="0 0 24 24">
        <path fill={color} d="M7 21l3-3-4-4-3 3v4h4zm5.586-7.414l2.829 2.828L22 10.828 18.172 7l-4.586 4.586L9 16l3 3 2.586-5.414z" />
      </svg>
    );
  }
  if (kind === 'bow') {
    return (
      <svg width={18} height={18} viewBox="0 0 24 24">
        <path fill={color} d="M21 3l-6 6 2 2 6-6-2-2zM3 21s6-2 9-5 5-9 5-9l-2-2s-6 2-9 5-5 9-5 9l2 2z" />
      </svg>
    );
  }
  if (kind === 'shield') {
    return (
      <svg width={18} height={18} viewBox="0 0 24 24">
        <path fill={color} d="M12 2l7 4v6c0 5-3.5 9.74-7 10-3.5-.26-7-5-7-10V6l7-4z" />
      </svg>
    );
  }
  if (kind === 'dagger') {
    return (
      <svg width={18} height={18} viewBox="0 0 24 24">
        <path fill={color} d="M2 22l7-7 2 2-7 7H2v-2zm9-9l8-8 2 2-8 8-2-2z" />
      </svg>
    );
  }
  if (kind === 'spear') {
    return (
      <svg width={18} height={18} viewBox="0 0 24 24">
        <path fill={color} d="M2 22l8-8 2 2-8 8H2v-2zm9-9L20 4l2 2-9 9-2-2z" />
      </svg>
    );
  }
  if (kind === 'plus') {
    return (
      <svg width={18} height={18} viewBox="0 0 24 24">
        <path fill={color} d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" />
      </svg>
    );
  }
  return (
    <svg width={18} height={18} viewBox="0 0 24 24">
      <circle cx={12} cy={12} r={6} fill={color} />
    </svg>
  );
}

function UnitTooltip({ unitId, compact, flip }: { unitId: string; compact: boolean; flip?: boolean }): JSX.Element {
  const inst = useGameStore((s) => s.units[unitId]);
  const t = UNIT_TEMPLATES[inst.templateKey];
  const base = t.stats;
  const star = inst.star || 1;
  const maxHp = base.hp * star;
  const scaledAtk = base.atk * star;
  const scaledAtkCd = Math.max(200, Math.floor(base.atkIntervalMs / star));
  const scaledMoveCd = Math.max(120, Math.floor(base.moveIntervalMs / star));
  const role = base.range >= 3 ? 'Ranged' : base.range === 2 ? 'Mid' : 'Melee';
  const abilityObj = (t as any).abilityLevels && (t as any).abilityLevels[star] ? (t as any).abilityLevels[star] : t.ability;
  const ability = abilityObj ? describeAbility(abilityObj) : 'None';
  const boxStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: 30,
    pointerEvents: 'none',
    minWidth: 220,
    maxWidth: 260,
    background: 'var(--panel)',
    border: '1px solid var(--panel-border)',
    borderRadius: 10,
    color: 'var(--text)',
    boxShadow: 'var(--shadow)',
    padding: 10,
    lineHeight: 1.25,
    top: compact ? -8 : 0,
    left: flip ? undefined : '100%',
    right: flip ? '100%' : undefined,
    marginLeft: flip ? undefined : 8,
    marginRight: flip ? 8 : undefined,
    transform: compact ? 'translateY(-50%)' : undefined,
  };
  return (
    <div style={boxStyle}>
      <div style={{ fontWeight: 800, marginBottom: 4 }}>{t.name} {star > 1 ? `★${star}` : ''}</div>
      <div style={{ fontSize: 12, color: '#aeb4c6', marginBottom: 6 }}>{role} · Cost {t.cost}g</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 8, rowGap: 4, fontSize: 12 }}>
        <span style={{ color: '#9fb0d7' }}>HP</span><span>{inst.hp}/{maxHp}</span>
        <span style={{ color: '#9fb0d7' }}>ATK</span><span>{scaledAtk}</span>
        <span style={{ color: '#9fb0d7' }}>RNG</span><span>{base.range}</span>
        <span style={{ color: '#9fb0d7' }}>Atk CD</span><span>{(scaledAtkCd/1000).toFixed(2)}s</span>
        <span style={{ color: '#9fb0d7' }}>Move CD</span><span>{(scaledMoveCd/1000).toFixed(2)}s</span>
        <span style={{ color: '#9fb0d7' }}>Ability</span><span>{ability}</span>
      </div>
    </div>
  );
}

function describeAbility(a: any): string {
  switch (a?.type) {
    case 'cleave':
      return `Cleave: splash ${Math.round(a.ratio * 100)}% damage to adjacent enemies`;
    case 'multishot':
      return `Multishot: hits ${a.extraTargets} extra target(s) for ${Math.round(a.ratio * 100)}% damage`;
    case 'stunOnHit':
      return `On-hit Stun: ${Math.round(a.chance * 100)}% to stun for ${(a.durationMs/1000).toFixed(2)}s`;
    case 'slowOnHit':
      return `On-hit Slow: ${Math.round(a.chance * 100)}% to slow to ${Math.round((a.factor||1)*100)}% for ${(a.durationMs/1000).toFixed(2)}s`;
    case 'healPulse':
      return `Heal Pulse: every ${(a.cooldownMs/1000).toFixed(2)}s, heal nearby allies for ${a.amount}`;
    case 'pierce':
      return `Pierce: projectile continues to next enemy for ${Math.round(a.ratio * 100)}% damage`;
    default:
      return 'None';
  }
}


