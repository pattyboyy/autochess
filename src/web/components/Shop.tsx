import React from 'react';
import { useGameStore } from '../../world/state';
import { UNIT_TEMPLATES, getUnitVisual, getUnitTraits } from '../../world/units';
import type { GameState, ShopItem, Ability } from '../../world/types';
// no direct imports needed from UnitChip; tooltip mirrors its content

export function Shop(): JSX.Element {
  const shop = useGameStore((s: GameState) => s.shop);
  const gold = useGameStore((s: GameState) => s.gold);
  const level = useGameStore((s: GameState) => s.level);
  const shopLocked = useGameStore((s: GameState) => s.shopLocked);
  const xp = useGameStore((s: GameState) => s.xp);
  const buyXp = useGameStore((s: any) => s.buyXp);
  const board = useGameStore((s: GameState) => s.board);
  const units = useGameStore((s: GameState) => s.units);
  const bench = useGameStore((s: GameState) => s.bench);
  // resolve to ensure selector updates, even though ShopCard also accesses store
  useGameStore((s: any) => s.buyUnit);
  const reroll = useGameStore((s: any) => s.reroll);
  // keep for state updates through FreezeToggle below
  // resolve to ensure selector updates, even though FreezeToggle reads internal state
  useGameStore((s: GameState) => s.shopFrozen ?? {});
  const focusTrait = useGameStore((s: GameState) => s.shopFocusTrait);

  // Compute current player-owned templates and trait counts (board + bench)
  const ownedTemplates = React.useMemo(() => {
    const set = new Set<string>();
    // from board
    for (const [, unitId] of Object.entries(board)) {
      if (!unitId) continue;
      const u = units[unitId];
      if (u && u.team === 'player') set.add(u.templateKey);
    }
    // from bench
    for (const unitId of bench) {
      const u = units[unitId];
      if (u && u.team === 'player') set.add(u.templateKey);
    }
    return set;
  }, [board, bench, units]);

  const traitCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    const addTraits = (templateKey: string) => {
      const traits = getUnitTraits(templateKey);
      for (const t of traits) counts[t] = (counts[t] ?? 0) + 1;
    };
    for (const [, unitId] of Object.entries(board)) {
      if (!unitId) continue;
      const u = units[unitId];
      if (u && u.team === 'player') addTraits(u.templateKey);
    }
    for (const unitId of bench) {
      const u = units[unitId];
      if (u && u.team === 'player') addTraits(u.templateKey);
    }
    return counts;
  }, [board, bench, units]);

  const templateCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    const add = (templateKey: string) => { counts[templateKey] = (counts[templateKey] ?? 0) + 1; };
    for (const [, unitId] of Object.entries(board)) {
      if (!unitId) continue;
      const u = units[unitId];
      if (u && u.team === 'player') add(u.templateKey);
    }
    for (const unitId of bench) {
      const u = units[unitId];
      if (u && u.team === 'player') add(u.templateKey);
    }
    return counts;
  }, [board, bench, units]);

  const DUO_PAIRS: Array<[string, string, string]> = React.useMemo(() => [
    ['frost','marksman','Shatter'],
    ['paladin','sorcerer','Sanctified Nova'],
    ['assassin','rogue','Backstab Bleed'],
    ['guardian','cleric','Bulwark'],
    ['hunter','beastmaster','Pack Volley'],
    ['spear','phalanx','Impale'],
    ['mage','warlock','Arcane Ruin'],
    ['druid','monk','Purify'],
    ['sniper','marksman','Headshot'],
    ['ballista','sentry','Overwatch'],
    ['icearcher','frost','Deep Freeze'],
    ['knight','templar','Holy Bash'],
    ['valkyrie','paladin','Judgement'],
  ], []);

  const tierOf = (n: number) => (n>=6?3:n>=4?2:n>=2?1:0);
  const nextThreshold = (n: number) => (n<2?2:n<4?4:n<6?6:6);

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontWeight: 600 }}>Shop</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Gold: <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{gold}</span> · Lv {level}</div>
      </div>
      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        {shop.map((u: ShopItem) => {
          // Determine if this shop unit's template is currently on the player's board
          let onBoardCount = 0;
          for (const [, unitId] of Object.entries(board)) {
            if (!unitId) continue;
            const unit = units[unitId];
            if (!unit || unit.team !== 'player') continue;
            if (unit.templateKey === u.templateKey) onBoardCount++;
          }
          const isOnBoard = onBoardCount > 0;

          // Synergy analysis: traits and duo
          const traits = getUnitTraits(u.templateKey);
          const traitUps: Array<{ trait: string; from: number; to: number; fromTier: number; toTier: number; need: number }> = [];
          for (const tr of traits) {
            const cur = traitCounts[tr] ?? 0;
            const next = cur + 1;
            const fromTier = tierOf(cur);
            const toTier = tierOf(next);
            if (toTier > fromTier) {
              traitUps.push({ trait: tr, from: cur, to: next, fromTier, toTier, need: 0 });
            } else {
              const need = Math.max(0, nextThreshold(cur) - next);
              traitUps.push({ trait: tr, from: cur, to: next, fromTier, toTier, need });
            }
          }
          // duo potential
          let duo: { label: string; pair: [string,string] } | undefined;
          for (const [a,b,label] of DUO_PAIRS) {
            if (u.templateKey === a && ownedTemplates.has(b)) { duo = { label, pair: [a,b] }; break; }
            if (u.templateKey === b && ownedTemplates.has(a)) { duo = { label, pair: [a,b] }; break; }
          }
          const dupCount = templateCounts[u.templateKey] || 0;
          return (
            <ShopCard
              key={u.id}
              item={u}
              gold={gold}
              focusTrait={focusTrait}
              isOnBoard={isOnBoard}
              onBoardCount={onBoardCount}
              synergy={{ traitUps, duo, dupCount }}
            />
          );
        })}
      </div>
      <div style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <ActionButton
          label={`Reroll (2g)`}
          onClick={() => reroll()}
          disabled={shopLocked || gold < 2}
          accent={getCssVar('--accent')}
          pulse={!shopLocked && gold >= 2}
          variant="filled"
        />
        <LockToggle />
        <div style={{ marginLeft: 'auto', display: 'grid', gap: 6, minWidth: 240, flex: '1 1 260px' }}>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>XP {xp}/{levelXpToNext(level)}</span>
            <ActionButton
              label={`Buy XP (4g)`}
              onClick={() => buyXp()}
              disabled={gold < 4}
              accent={getCssVar('--ok')}
              pulse={gold >= 4}
              variant="filled"
            />
          </div>
          <div style={{ position: 'relative', height: 6, background: 'rgba(0,0,0,0.15)', borderRadius: 999, border: '1px solid var(--panel-border)', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 1, width: `${Math.min(100, Math.max(0, (xp / levelXpToNext(level)) * 100))}%`, background: 'linear-gradient(90deg, #38bdf8, #0ea5e9)', borderRadius: 999 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function describeAbility(a: Ability | undefined): string {
  switch (a?.type) {
    case 'cleave':
      return `Cleave: splash ${Math.round(a.ratio * 100)}% dmg`;
    case 'multishot':
      return `Multishot: +${a.extraTargets} tgt @ ${Math.round(a.ratio * 100)}%`;
    case 'stunOnHit':
      return `On-hit Stun: ${Math.round(a.chance * 100)}% for ${(a.durationMs/1000).toFixed(1)}s`;
    case 'slowOnHit':
      return `On-hit Slow: ${Math.round(a.chance * 100)}% to ${Math.round((a.factor||1)*100)}% for ${(a.durationMs/1000).toFixed(1)}s`;
    case 'healPulse':
      return `Heal Pulse: ${(a.cooldownMs/1000).toFixed(1)}s CD, heal ${a.amount}`;
    case 'pierce':
      return `Pierce: ${Math.round(a.ratio * 100)}% next target`;
    default:
      return 'None';
  }
}

function ShopCard({ item, gold, focusTrait, isOnBoard, onBoardCount, synergy }: { item: ShopItem; gold: number; focusTrait?: string; isOnBoard?: boolean; onBoardCount?: number; synergy?: { traitUps: Array<{ trait: string; from: number; to: number; fromTier: number; toTier: number; need: number }>; duo?: { label: string; pair: [string,string] }; dupCount?: number } }): JSX.Element {
  const t = UNIT_TEMPLATES[item.templateKey];
  const isFrozen = useGameStore((s: GameState) => !!(s.shopFrozen ?? {})[item.id]);
  const buyUnit = useGameStore((s: any) => s.buyUnit);
  const visual = getUnitVisual(item.templateKey);
  const isFocus = !!(focusTrait && getUnitTraits(item.templateKey).includes(focusTrait));
  const [hover, setHover] = React.useState(false);
  const [linger, setLinger] = React.useState(false);
  const [flip, setFlip] = React.useState(false);
  const rarity = rarityOfCost(t.cost);
  const ref = React.useRef<HTMLDivElement | null>(null);
  const hasTierUp = (synergy?.traitUps || []).some((u) => u.toTier > u.fromTier);
  const hasDuo = !!synergy?.duo;
  const hasDup = (synergy?.dupCount || 0) >= 1;
  React.useEffect(() => {
    if (!hover) return;
    try {
      const el = ref.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const tooltipWidth = 260;
        setFlip(rect.right + tooltipWidth > window.innerWidth - 8);
      }
    } catch {}
  }, [hover]);
  React.useEffect(() => {
    let to: any;
    if (!hover && linger) {
      to = setTimeout(() => setLinger(false), 250);
    }
    return () => to && clearTimeout(to);
  }, [hover, linger]);
  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && gold >= item.cost) buyUnit(item.id); }}
      onClick={() => { if (gold >= item.cost) buyUnit(item.id); }}
      onMouseEnter={() => { setHover(true); setLinger(true); }}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid', gridTemplateRows: 'auto auto 1fr auto', alignItems: 'center', gap: 6,
        textAlign: 'left', padding: '10px 12px', position: 'relative',
        background: `linear-gradient(160deg, ${visual.secondary} 0%, ${visual.primary} 100%)`,
        color: '#ffffff', border: hasDuo ? '2px solid #facc15' : (hasTierUp ? '2px solid #0ea5e9' : (isFocus ? '2px solid #f59e0b' : `1px solid ${visual.accent}`)), borderRadius: 10,
        cursor: gold >= item.cost ? 'pointer' : 'not-allowed', opacity: gold >= item.cost ? 1 : 0.7,
        boxShadow: isFrozen
          ? `0 0 0 2px ${visual.accent}55 inset`
          : hasDuo
            ? '0 0 0 3px rgba(250,204,21,0.55) inset, 0 0 44px rgba(250,204,21,0.65)'
            : hasTierUp
              ? '0 0 0 3px rgba(14,165,233,0.5) inset, 0 0 36px rgba(14,165,233,0.6)'
              : (isFocus ? '0 0 0 3px rgba(245,158,11,0.55) inset, 0 0 42px rgba(245,158,11,0.75)' : '0 8px 22px rgba(0,0,0,0.18)') ,
        transform: hover ? 'translateY(-2px) scale(1.01)' : 'none',
        transition: 'transform 160ms ease, box-shadow 160ms ease'
      }}
    >
      {/* contrast overlay to ensure readability on bright gradients */}
      <span style={{ position: 'absolute', inset: 0, borderRadius: 10, background: 'linear-gradient(180deg, rgba(0,0,0,0.14), rgba(0,0,0,0.22))', pointerEvents: 'none' }} />
      {/* rarity ribbon */}
      <div style={{ position: 'absolute', top: -6, right: -6, transform: 'rotate(8deg)', pointerEvents: 'none' }}>
        <span style={{ padding: '2px 6px', fontSize: 10, fontWeight: 900, color: rarity.fg, background: rarity.bg, border: `1px solid ${rarity.border}`, borderRadius: 6, textTransform: 'uppercase', letterSpacing: 0.6 }}>{rarity.label}</span>
      </div>
      {isOnBoard && (
        <>
          {/* On-board match ribbon and check */}
          <div style={{ position: 'absolute', top: -4, left: -4, background: '#22c55e', color: '#052e16', fontWeight: 900, fontSize: 10, padding: '2px 8px', borderRadius: 6, border: '1px solid #16a34a', boxShadow: '0 6px 14px rgba(34,197,94,0.45)' }}>
            MATCH{onBoardCount && onBoardCount > 1 ? ` x${onBoardCount}` : ''}
          </div>
          <svg width={64} height={64} style={{ position: 'absolute', top: -12, right: -12, opacity: 0.18, pointerEvents: 'none' }}>
            <circle cx={32} cy={32} r={20} fill={'#22c55e'} />
            <polyline points={'20,34 28,42 44,24'} fill="none" stroke={'#052e16'} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </>
      )}
      {isFocus && (
        <>
          <span style={{ position: 'absolute', top: 6, right: 6, padding: '2px 6px', fontSize: 10, fontWeight: 900, color: '#111827', background: '#f59e0b', borderRadius: 6, border: '1px solid #b45309' }}>FOCUS</span>
          <span style={{ position: 'absolute', inset: -2, borderRadius: 12, boxShadow: '0 0 0 0 rgba(245,158,11,0.45)', animation: 'focusPulse 1.2s ease-in-out infinite', pointerEvents: 'none' }} />
          <style>{'@keyframes focusPulse { 0% { box-shadow: 0 0 0 0 rgba(245,158,11,0.45); } 70% { box-shadow: 0 0 0 14px rgba(245,158,11,0); } 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0); } }'}</style>
        </>
      )}
      {hasDuo && (
        <span style={{ position: 'absolute', top: 6, left: 6, padding: '2px 6px', fontSize: 10, fontWeight: 900, color: '#111827', background: '#facc15', borderRadius: 6, border: '1px solid #b45309' }} title={`Duo synergy: ${synergy?.duo?.pair.join(' + ')} (${synergy?.duo?.label})`}>
          DUO
        </span>
      )}
      <span style={{ fontWeight: 800, textShadow: '0 1px 4px rgba(0,0,0,0.45)' }}>{item.name}</span>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)' }}>HP {t.stats.hp} · ATK {t.stats.atk} · RNG {t.stats.range}</span>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.95)' }}>Ability: {describeAbility(t.ability)}</span>
      <div style={{ fontSize: 11, color: '#ffffff', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <Tag text={`Cost ${item.cost}g`} accent={visual.accent} />
        <Tag text={t.stats.range >= 3 ? 'Ranged' : t.stats.range === 2 ? 'Mid' : 'Melee'} accent={visual.accent} />
        {isFocus && <Tag text={`Focus: ${focusTrait}`} accent={'#f59e0b'} />}
        {hasDuo && <Tag text={`Duo: ${synergy?.duo?.label}`} accent={'#facc15'} />}
        {hasDup && (synergy?.dupCount || 0) >= 2 && <Tag text={'Complete 2★'} accent={'#22c55e'} />}
        {hasDup && (synergy?.dupCount || 0) === 1 && <Tag text={'Makes Pair'} accent={'#a3e635'} />}
      </div>
      {synergy && synergy.traitUps.length > 0 && (
        <div style={{ display: 'grid', gap: 4, marginTop: 4 }}>
          {synergy.traitUps.map((u, idx) => {
            const up = u.toTier > u.fromTier;
            const label = up ? `${u.trait} ${u.fromTier===0?'':u.fromTier===1?'I':u.fromTier===2?'II':'III'}→${u.toTier===1?'I':u.toTier===2?'II':'III'}` : `${u.trait} +1 (toward next tier)`;
            return <div key={idx} style={{ fontSize: 11, color: up ? '#0ea5e9' : '#e5e7eb' }}>{label}</div>;
          })}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 900, color: visual.accent, textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>{item.cost}g</span>
        <FreezeToggle id={item.id} frozen={isFrozen} />
      </div>
      {/* Tooltip mirror of UnitChip info */}
      {(hover || linger) && (
        <ShopTooltip templateKey={item.templateKey} flip={flip} />
      )}
    </div>
  );
}

function ShopTooltip({ templateKey, flip }: { templateKey: string; flip?: boolean }): JSX.Element {
  const t = UNIT_TEMPLATES[templateKey];
  const base = t.stats;
  const role = base.range >= 3 ? 'Ranged' : base.range === 2 ? 'Mid' : 'Melee';
  const ability = t.ability ? describeAbility(t.ability) : 'None';
  const boxStyle: React.CSSProperties = {
    position: 'absolute', zIndex: 30, pointerEvents: 'none', minWidth: 220, maxWidth: 260,
    background: 'var(--panel)', border: '1px solid var(--panel-border)', borderRadius: 10, color: 'var(--text)', boxShadow: 'var(--shadow)', padding: 10, lineHeight: 1.25,
    top: 0, left: flip ? undefined : '100%', right: flip ? '100%' : undefined, marginLeft: flip ? undefined : 8, marginRight: flip ? 8 : undefined,
  };
  return (
    <div style={boxStyle}>
      <div style={{ fontWeight: 800, marginBottom: 4 }}>{t.name}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{role} · Cost {t.cost}g</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 8, rowGap: 4, fontSize: 12 }}>
        <span style={{ color: 'var(--muted)' }}>HP</span><span>{base.hp}</span>
        <span style={{ color: 'var(--muted)' }}>ATK</span><span>{base.atk}</span>
        <span style={{ color: 'var(--muted)' }}>RNG</span><span>{base.range}</span>
        <span style={{ color: 'var(--muted)' }}>Atk CD</span><span>{(base.atkIntervalMs/1000).toFixed(2)}s</span>
        <span style={{ color: 'var(--muted)' }}>Move CD</span><span>{(base.moveIntervalMs/1000).toFixed(2)}s</span>
        <span style={{ color: 'var(--muted)' }}>Ability</span><span>{ability}</span>
      </div>
      <div style={{ marginTop: 6, fontSize: 11, color: 'var(--muted)' }}>
        Hover shows base stats; star scaling applies after purchase/combines.
      </div>
    </div>
  );
}

function ActionButton({ label, onClick, disabled, accent, pulse, variant }: { label: string; onClick?: () => void; disabled?: boolean; accent: string; pulse?: boolean; variant?: 'filled' | 'outline' }): JSX.Element {
  const isFilled = variant === 'filled';
  const textColor = isFilled ? '#ffffff' : 'var(--text)';
  const base: React.CSSProperties = {
    padding: '10px 16px',
    borderRadius: 10,
    border: `1px solid ${accent}`,
    background: isFilled
      ? `linear-gradient(180deg, ${accent}, ${accent})`
      : `linear-gradient(180deg, ${accent}2A, ${accent}14)`,
    color: textColor,
    fontWeight: 800,
    letterSpacing: 0.4,
    cursor: disabled ? 'default' : 'pointer',
    boxShadow: isFilled
      ? `0 8px 22px ${accent}55, inset 0 0 0 1px ${accent}44`
      : `0 8px 20px ${accent}22, inset 0 0 0 1px ${accent}22`,
    position: 'relative',
    overflow: 'hidden',
    transition: 'transform 120ms ease, box-shadow 120ms ease, opacity 120ms ease, filter 120ms ease',
    opacity: disabled ? 0.6 : 1,
    whiteSpace: 'nowrap',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(1px) scale(0.995)'; }}
      onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0) scale(1)'; }}
      style={base}
    >
      {isFilled && !disabled && (
        <span style={{ position: 'absolute', inset: -6, borderRadius: 14, filter: 'blur(10px)', background: accent, opacity: 0.34, pointerEvents: 'none' }} />
      )}
      {pulse && (
        <span style={{ position: 'absolute', inset: -2, borderRadius: 12, boxShadow: `0 0 0 0 ${isFilled ? '#ffffff66' : accent + '66'}`, animation: 'pulseGlow 1.3s ease-in-out infinite', pointerEvents: 'none' }} />
      )}
      <span style={{ position: 'relative' }}>{label}</span>
      <style>{`@keyframes pulseGlow { 0% { box-shadow: 0 0 0 0 ${isFilled ? '#ffffff66' : accent + '66'}; } 70% { box-shadow: 0 0 0 12px ${isFilled ? '#ffffff00' : accent + '00'}; } 100% { box-shadow: 0 0 0 0 ${isFilled ? '#ffffff00' : accent + '00'}; } }`}</style>
    </button>
  );
}

function getCssVar(name: string): string {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return v && v.trim().length ? v.trim() : '#0ea5e9';
  } catch {
    return '#0ea5e9';
  }
}

function LockToggle(): JSX.Element {
  const locked = useGameStore((s: GameState) => s.shopLocked);
  const setLocked = React.useCallback((v: boolean) => {
    useGameStore.setState((s: GameState) => ({ ...s, shopLocked: v } as any));
  }, []);
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#aeb4c6' }}>
      <input type="checkbox" checked={!!locked} onChange={(e) => setLocked(e.target.checked)} />
      Lock shop
    </label>
  );
}

function levelXpToNext(level: number): number {
  return 4 + level * 2;
}

function rarityOfCost(cost: number): { label: string; bg: string; border: string; fg: string } {
  if (cost >= 5) return { label: 'Legendary', bg: 'linear-gradient(180deg, #f59e0b, #facc15)', border: '#b45309', fg: '#1f2937' };
  if (cost === 4) return { label: 'Epic', bg: 'linear-gradient(180deg, #8b5cf6, #a78bfa)', border: '#6d28d9', fg: '#111827' };
  if (cost === 3) return { label: 'Rare', bg: 'linear-gradient(180deg, #38bdf8, #0ea5e9)', border: '#0369a1', fg: '#0b1220' };
  return { label: 'Common', bg: 'linear-gradient(180deg, #e5e7eb, #cbd5e1)', border: '#94a3b8', fg: '#111827' };
}

function FreezeToggle({ id, frozen }: { id: string; frozen: boolean }): JSX.Element {
  const toggle = React.useCallback(() => {
    useGameStore.setState((s: GameState) => ({ ...s, shopFrozen: { ...(s.shopFrozen ?? {}), [id]: !frozen } } as any));
  }, [id, frozen]);
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer' }}>
      <input type="checkbox" checked={frozen} onChange={toggle} />
      {frozen ? 'Frozen' : 'Freeze'}
    </label>
  );
}

function Tag({ text, accent }: { text: string; accent?: string }): JSX.Element {
  const border = accent || 'var(--panel-border)';
  const bg = accent ? `${accent}33` : 'rgba(14,165,233,0.12)';
  return <span style={{ padding: '2px 6px', border: `1px solid ${border}`, borderRadius: 999, background: bg }}>{text}</span>;
}


