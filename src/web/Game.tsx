import React, { useMemo, useState } from 'react';
import { useGameStore } from '../world/state';
import { Board } from './components/Board';
import { Bench } from './components/Bench';
import { Shop } from './components/Shop';
import { Controls } from './components/Controls';
import { Leaderboard } from './components/Leaderboard';
import { getUnitTraits } from '../world/units';
import { SynergyBook } from './components/SynergyBook';

function DuoPanel(): JSX.Element {
  const board = useGameStore((s) => s.board);
  const units = useGameStore((s) => s.units);
  const items = useMemo(() => {
    const posByTemplate = new Map<string, number>();
    for (const id of Object.values(board)) {
      if (!id) continue;
      const u = units[id];
      if (!u || u.team !== 'player') continue;
      posByTemplate.set(u.templateKey, (posByTemplate.get(u.templateKey) ?? 0) + 1);
    }
    const DUOS: Array<[string, string, string, string, string]> = [
      ['frost','marksman','Shatter','#60a5fa','#bae6fd'],
      ['paladin','sorcerer','Sanctified Nova','#fde68a','#fbbf24'],
      ['assassin','rogue','Backstab Bleed','#ef4444','#f59e0b'],
      ['guardian','cleric','Bulwark Blessing','#60a5fa','#93c5fd'],
      ['hunter','beastmaster','Pack Volley','#22c55e','#10b981'],
      ['spear','phalanx','Impale','#67e8f9','#0ea5e9'],
      ['mage','warlock','Arcane Ruin','#a78bfa','#7c3aed'],
      ['druid','monk','Purifying Grove','#86efac','#bbf7d0'],
      ['sniper','marksman','Headshot','#facc15','#f59e0b'],
      ['ballista','sentry','Overwatch','#60a5fa','#1d4ed8'],
      ['icearcher','frost','Deep Freeze','#93c5fd','#e0f2fe'],
      ['knight','templar','Holy Bash','#fcd34d','#f59e0b'],
      ['valkyrie','paladin','Judgement','#fde68a','#fbbf24'],
      ['archer','crossbow','Volley Spread','#22c55e','#10b981'],
      ['sorcerer','stormcaller','Chain Bolt','#a78bfa','#7c3aed'],
      ['warrior','berserker','Rage Shock','#ef4444','#f59e0b'],
      ['assassin','duelist','Lunge','#fca5a5','#f87171'],
      ['pikeman','javelin','Long Reach','#67e8f9','#0ea5e9'],
      ['guardian','paladin','Aegis','#60a5fa','#fde68a'],
      ['valkyrie','templar','Wings','#fde68a','#f59e0b'],
      ['knight','guardian','Wall','#93c5fd','#fcd34d'],
      ['paladin','templar','Holy Radiance','#fcd34d','#fde68a'],
      ['mage','frost','Glacier','#93c5fd','#a78bfa'],
      ['warlock','witch','Hex','#a78bfa','#c4b5fd'],
      ['sniper','crossbow','Piercing Round','#facc15','#f59e0b'],
      ['druid','beastmaster','Pack Mending','#86efac','#10b981'],
      ['cleric','medic','Field Triage','#22c55e','#86efac'],
      ['gladiator','champion','Arena Roar','#f59e0b','#fcd34d'],
      ['knight','paladin','Oathkeeper','#60a5fa','#fde68a'],
      ['archer','hunter','Falcon Volley','#22c55e','#10b981'],
      ['warlock','mystic','Hexburst','#a78bfa','#c4b5fd'],
      ['ballista','slinger','Explosive Load','#f59e0b','#fbbf24'],
      ['alchemist','cleric','Elixir','#86efac','#22c55e'],
      ['gladiator','valkyrie','Skyfall','#fde68a','#f59e0b'],
      ['rogue','mystic','Bewilder','#fca5a5','#a78bfa'],
      ['guardian','champion','Bulwark Roar','#93c5fd','#fcd34d'],
      ['druid','paladin','Blessed Grove','#86efac','#fde68a'],
      ['sentry','marksman','Focus Fire','#60a5fa','#f59e0b'],
      ['guardian','valkyrie','Aerial Bulwark','#93c5fd','#fde68a'],
      ['monk','paladin','Serenity','#22c55e','#fde68a'],
    ];
    const TRIOS: Array<[string, string, string, string, string, string]> = [
      ['knight','paladin','templar','Holy Triumvirate','#fde68a','#fbbf24'],
      ['archer','marksman','sniper','Arrow Storm','#22c55e','#10b981'],
      ['guardian','champion','gladiator','Phalanx Wall','#f59e0b','#93c5fd'],
      ['druid','monk','paladin','Sanctuary','#86efac','#fde68a'],
      ['sorcerer','warlock','witch','Chaos Nexus','#a78bfa','#7c3aed'],
      ['pikeman','phalanx','spear','Piercing Wall','#67e8f9','#0ea5e9'],
      ['cleric','monk','medic','Hymn of Life','#22c55e','#86efac'],
      ['mage','sorcerer','stormcaller','Tempest','#a78bfa','#7c3aed'],
      ['rogue','assassin','duelist','Deathblossom','#ef4444','#f87171'],
      ['guardian','shieldbearer','shieldman','Iron Bulwark','#93c5fd','#60a5fa'],
      ['frost','icearcher','mystic','Absolute Zero','#60a5fa','#e0f2fe'],
      ['ballista','sentry','slinger','Siege Network','#f59e0b','#fbbf24'],
      ['hunter','archer','beastmaster','Pack Hunt','#22c55e','#10b981'],
    ];
    const active: Array<{ key: string; name: string; members: string[]; c1: string; c2: string; desc: string; kind: 'duo' | 'trio' }> = [];
    const DESC: Record<string, string> = {
      Shatter: 'Bonus damage to slowed enemies with icy burst.',
      'Sanctified Nova': 'Paladin pulses also damage nearby foes.',
      'Backstab Bleed': 'Isolated targets suffer heavy bleed.',
      'Bulwark Blessing': 'Cleric pulses also grant shields.',
      'Pack Volley': 'Rangers fire an extra weaker shot.',
      Impale: 'Bonus damage to the cell behind the target.',
      'Arcane Ruin': 'Splash damage around the struck target.',
      'Purifying Grove': 'Cleanse and small extra heal on pulses.',
      Headshot: 'Chance to massively amplify a ranged hit.',
      Overwatch: 'Auto-fire at a random enemy after a hit.',
      'Deep Freeze': 'Slow may briefly stun on hit.',
      'Holy Bash': 'Smite in a small cone behind the target.',
      Judgement: 'On kill, smite adjacent enemies.',
      'Volley Spread': 'Extra arrows to nearby enemies.',
      'Chain Bolt': 'Lightning arcs to an adjacent enemy.',
      'Rage Shock': 'Shock damage on hit; screenshake.',
      Lunge: 'Brief slow on low-HP enemies on hit.',
      'Long Reach': 'Extra spear jab to the same target.',
      Aegis: 'Heal pulses grant damage reduction.',
      Wings: 'Smite ring on Valkyrie melee hits.',
      Wall: 'Shield ally directly behind attacker.',
      'Holy Radiance': 'Radiant ring when Paladin heals.',
      Glacier: 'Extra frost ring + damage on slowed foes.',
      Hex: 'Brief slow on hit with arcane rune.',
      'Piercing Round': 'Try to hit the enemy behind the target.',
      'Pack Mending': 'Heal a nearby ally on Beastmaster hit.',
      'Field Triage': 'Heal the lowest-HP ally on heal pulse.',
      'Arena Roar': 'Damage/shield effect to nearby units.',
      Oathkeeper: 'Knight gains a small shield on hit.',
      'Falcon Volley': 'Extra arrow to the same target.',
      Hexburst: 'Bonus damage vs slowed or stunned enemies.',
      'Explosive Load': 'Small AoE around the target.',
      Elixir: 'Heal pulses grant small shields.',
      Skyfall: 'Smite ring at target on melee hit.',
      Bewilder: 'Chance to stun low-HP targets.',
      'Bulwark Roar': 'Grants shields to adjacent allies.',
      'Blessed Grove': 'Extra heals around Paladin pulses.',
      'Focus Fire': 'Chance to refire at the same target.',
      'Aerial Bulwark': 'Valkyrie shield when near Guardian.',
      Serenity: 'Monk gains a small HoT after hits.',
      // Trios
      'Holy Triumvirate': 'Radiant beam + smite burst on hits.',
      'Arrow Storm': 'Extra projectiles to two random targets.',
      'Phalanx Wall': 'Brief DR to adjacent allies with shock.',
      Sanctuary: 'Bigger extra heal + radiant-green overlay on pulses.',
      'Chaos Nexus': 'Rune bursts damage enemies adjacent to the target.',
      'Piercing Wall': 'Thrust damage continues past target.',
      'Hymn of Life': 'Heal pulses add soft HoT ticks with verdant FX.',
      Tempest: 'Bolt + rune-beam combo adds bonus damage.',
      Deathblossom: 'Melee hits apply rip strikes around the target.',
      'Iron Bulwark': 'On melee hit, pulse small shields to adjacent allies.',
      'Absolute Zero': 'Slow → chance to freeze and bonus damage with icy FX.',
      'Siege Network': 'Launch a bomb that deals small AoE on impact.',
      'Pack Hunt': 'Chance to fire two extra weaker shots at the target.',
    };
    for (const [a,b,label,c1,c2] of DUOS) {
      if ((posByTemplate.get(a) ?? 0) > 0 && (posByTemplate.get(b) ?? 0) > 0) {
        active.push({ key: `${a}+${b}`, name: label, members: [a,b], c1, c2, desc: DESC[label] || '', kind: 'duo' });
      }
    }
    for (const [a,b,c,label,c1,c2] of TRIOS) {
      if ((posByTemplate.get(a) ?? 0) > 0 && (posByTemplate.get(b) ?? 0) > 0 && (posByTemplate.get(c) ?? 0) > 0) {
        active.push({ key: `${a}+${b}+${c}`, name: label, members: [a,b,c], c1, c2, desc: DESC[label] || '', kind: 'trio' });
      }
    }
    // sort: trios first then duos
    active.sort((x, y) => (x.kind === y.kind ? 0 : x.kind === 'trio' ? -1 : 1));
    return active;
  }, [board, units]);
  return (
    <div className="panel soft" style={{ padding: 8, position: 'sticky', top: 96, marginTop: 40 }}>
      <div style={{ fontWeight: 900, marginBottom: 8 }}>Active Duos & Trios</div>
      <div style={{ display: 'grid', gap: 6 }}>
        {items.length === 0 && <div style={{ fontSize: 12, color: 'var(--muted)' }}>No duo or trio synergies active.</div>}
        {items.map((p) => (
          <div key={p.key} style={{ display: 'grid', gap: 4, padding: 8, border: '1px solid var(--panel-border)', borderRadius: 10, background: 'var(--panel)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: 999, background: p.c1, boxShadow: `0 0 10px ${p.c1}` }} />
              <div style={{ width: 10, height: 10, borderRadius: 999, background: p.c2, boxShadow: `0 0 10px ${p.c2}` }} />
              <div style={{ fontWeight: 800 }}>{p.name}</div>
              <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>{p.members.join(' + ')}</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text)' }}>{p.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FocusButton({ trait }: { trait: string }): JSX.Element {
  const current = useGameStore((s) => s.shopFocusTrait);
  const setFocus = useGameStore((s) => s.setShopFocusTrait);
  const selected = current === trait;
  return (
    <button
      onClick={() => setFocus(selected ? undefined : trait)}
      style={{
        padding: '4px 8px',
        borderRadius: 8,
        border: selected ? '1px solid #0ea5e9' : '1px solid var(--panel-border)',
        background: selected ? 'linear-gradient(180deg, #0ea5e9, #0284c7)' : 'var(--panel)',
        color: selected ? '#fff' : 'var(--text)',
        fontWeight: 800,
        cursor: 'pointer',
        boxShadow: selected ? '0 0 0 2px #0ea5e944, 0 0 24px #0ea5e999' : 'var(--shadow)'
      }}
      title={selected ? 'Focused (click to clear)' : 'Focus in shop'}
    >
      Focus in shop
    </button>
  );
}

function SynergyStrip({ onOpenSynergyBook }: { onOpenSynergyBook: () => void }): JSX.Element {
  const board = useGameStore((s) => s.board);
  const units = useGameStore((s) => s.units);
  const [open, setOpen] = useState(false);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const id of Object.values(board)) {
      if (!id) continue;
      const u = units[id];
      if (!u || u.team !== 'player') continue;
      const traits: string[] = getUnitTraits(u.templateKey);
      for (const tr of traits) c[tr] = (c[tr] ?? 0) + 1;
    }
    return c;
  }, [board, units]);
  const setFocus = useGameStore((s) => s.setShopFocusTrait);
  const entries = Object.entries(counts).sort((a,b) => b[1]-a[1]);
  const tierOf = (n: number) => (n>=6?3:n>=4?2:n>=2?1:0);
  const label = (t: number) => t===3?'III':t===2?'II':t===1?'I':'';
  const THRESHOLDS: Record<string, number[]> = { Vanguard: [2,4,6], Ranger: [2,4,6], Skirmisher: [2,4,6], Support: [2,4,6], Caster: [2,4,6], Lancer: [2,4,6] };
  const INFO: Record<string, string> = {
    Vanguard: 'Start of combat: grant team shields (14/26/40 per star) and small ATK (+1/+3/+5).',
    Ranger: 'Increase team attack speed by 8%/14%/20%.',
    Skirmisher: 'Increase team move speed by 8%/14%/20%.',
    Support: 'Increase healing done by 15%/25%/40%.',
    Caster: 'Increase healing by 5%/10%/15% and on-hit slow chance by +5%/+8%/+12%.',
    Lancer: 'No set bonus yet (future spear-line effects).',
  };
  return (
    <div style={{ position: 'absolute', top: 8, left: 8, right: 8, display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none', zIndex: 1 }}>
      <div style={{ display: 'flex', gap: 8, pointerEvents: 'auto' }}>
        <button onClick={() => setOpen(true)} style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid var(--panel-border)', background: 'var(--panel)', color: 'var(--text)', fontWeight: 800, cursor: 'pointer', boxShadow: 'var(--shadow)' }}>Synergies</button>
        <button onClick={() => setOpen(true)} title="Open synergy help" style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid var(--panel-border)', background: 'var(--panel)', color: 'var(--text)', fontWeight: 800, cursor: 'pointer', boxShadow: 'var(--shadow)' }}>?</button>
        <button onClick={onOpenSynergyBook} style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid var(--panel-border)', background: 'var(--panel)', color: 'var(--text)', fontWeight: 800, cursor: 'pointer', boxShadow: 'var(--shadow)' }}>Duo/Trio Book</button>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', pointerEvents: 'auto' }}>
        {entries.length > 0 && entries.map(([name, n]) => {
        const tier = tierOf(n);
        const color = tier>=3?'#22c55e':tier===2?'#0ea5e9':tier===1?'#64748b':'#94a3b8';
        const th = THRESHOLDS[name] || [2,4,6];
        const next = th.find((t) => n < t) ?? th[th.length-1];
        return (
          <div key={name} style={{ pointerEvents: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 10px', borderRadius: 999, background: 'var(--panel)', border: '1px solid var(--panel-border)', boxShadow: 'var(--shadow)', color: 'var(--text)', cursor: 'pointer' }} title={`${name}: ${n} (${th.join('/')})`} onClick={() => setFocus(name)}>
            <span style={{ fontWeight: 900, letterSpacing: 0.4, color: 'var(--text)' }}>{name}</span>
            <span style={{ fontWeight: 900, color }}>{label(tier)}</span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{n}/{next}</span>
          </div>
        );
      })}
      {open && (
        <div style={{ position: 'absolute', top: 36, left: 8, right: 8, margin: '0 auto', maxWidth: 680, background: 'var(--panel)', border: '1px solid var(--panel-border)', borderRadius: 12, boxShadow: 'var(--shadow)', padding: 12, pointerEvents: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontWeight: 900, fontSize: 14, color: 'var(--text)' }}>Synergies</div>
            <button onClick={() => setOpen(false)} style={{ marginLeft: 'auto', padding: '4px 8px', borderRadius: 8, border: '1px solid var(--panel-border)', background: 'var(--panel)', color: 'var(--text)', cursor: 'pointer', boxShadow: 'var(--shadow)' }}>Close</button>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {['Vanguard','Ranger','Skirmisher','Support','Caster','Lancer'].map((name) => {
              const n = counts[name] || 0;
              const tier = tierOf(n);
              const th = THRESHOLDS[name];
              const color = tier>=3?'#22c55e':tier===2?'#0ea5e9':tier===1?'#64748b':'#94a3b8';
              return (
                <div key={name} style={{ border: '1px solid var(--panel-border)', borderRadius: 10, padding: 8, background: 'var(--panel)', color: 'var(--text)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontWeight: 900, color: 'var(--text)' }}>{name}</div>
                    <div style={{ fontWeight: 900, color }}>{label(tier)}</div>
                    <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>{n} on board · thresholds {th.join('/')}</div>
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4, color: 'var(--text)' }}>{INFO[name]}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <FocusButton trait={name} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

function SettingsMenu(): JSX.Element {
  const [open, setOpen] = useState(false);
  const alwaysShowRanges = useGameStore((s) => s.alwaysShowRanges || false);
  const shakeIntensity = useGameStore((s) => s.shakeIntensity || 1);
  const setAlwaysShowRanges = (v: boolean) => useGameStore.setState((s) => ({ ...s, alwaysShowRanges: v }));
  const setShakeIntensity = (v: number) => useGameStore.setState((s) => ({ ...s, shakeIntensity: Math.max(0, Math.min(2, Math.round(v * 100) / 100)) }));
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} className="pill" style={{ cursor: 'pointer' }}>
        <span className="key">UI</span> <strong>Settings</strong>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, background: 'var(--panel)', border: '1px solid var(--panel-border)', borderRadius: 10, boxShadow: 'var(--shadow)', padding: 10, zIndex: 5, width: 240 }}>
          <div style={{ display: 'grid', gap: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 12, color: 'var(--text)' }}>
              <span>Always show ranges</span>
              <input type="checkbox" checked={!!alwaysShowRanges} onChange={(e) => setAlwaysShowRanges(e.target.checked)} />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, color: 'var(--text)' }}>
              <span>Shake intensity</span>
              <input type="range" min={0} max={2} step={0.1} value={shakeIntensity} onChange={(e) => setShakeIntensity(Number(e.target.value))} />
              <div style={{ textAlign: 'right', color: 'var(--muted)' }}>{shakeIntensity.toFixed(1)}x</div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

function DamagePanel(): JSX.Element {
  const participants = useGameStore((s) => s.damageParticipants || []);
  const units = useGameStore((s) => s.units);
  const dmg = useGameStore((s) => s.damageThisRound || {});
  // Use the snapshot of participants to keep units visible after death
  const entries: Array<{ id: string; name: string; value: number }> = participants
    .map((id) => {
      const u = units[id];
      if (!u) return null;
      const name = (u.templateKey.charAt(0).toUpperCase() + u.templateKey.slice(1)).replace(/^[a-z]/, (m) => m.toUpperCase());
      return { id: id, name, value: dmg[id] || 0 };
    })
    .filter(Boolean) as Array<{ id: string; name: string; value: number }>;
  entries.sort((a, b) => b.value - a.value);
  const max = Math.max(1, ...entries.map((e) => e.value));
  return (
    <div style={{ padding: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Damage This Round</div>
      <div style={{ display: 'grid', gap: 8 }}>
        {entries.map((e) => (
          <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--text)' }}>{e.name}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{e.value}</div>
            <div style={{ gridColumn: '1 / span 2', height: 6, background: 'rgba(0,0,0,0.15)', borderRadius: 999, overflow: 'hidden', border: '1px solid var(--panel-border)' }}>
              <div style={{ width: `${(e.value / max) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #38bdf8, #0ea5e9)', borderRadius: 999 }} />
            </div>
          </div>
        ))}
        {entries.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 12 }}>No player units deployed.</div>}
      </div>
    </div>
  );
}

function CompactLog(): JSX.Element {
  const log = useGameStore((s) => s.log);
  const [expanded, setExpanded] = useState(false);
  const items = log.slice(-8);
  return (
    <div className="panel soft soft-scroll" style={{ marginTop: 6, maxHeight: expanded ? 180 : 110 }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: 10, borderBottom: '1px solid var(--panel-border)' }}>
        <div style={{ fontWeight: 800 }}>Activity</div>
        <button onClick={() => setExpanded((v) => !v)} style={{ marginLeft: 'auto', padding: '4px 8px', borderRadius: 8, border: '1px solid var(--panel-border)', background: 'rgba(0,0,0,0.04)', cursor: 'pointer' }}>{expanded ? 'Less' : 'More'}</button>
      </div>
      <div style={{ padding: 10, display: 'grid', gap: 6 }}>
        {items.length === 0 && <div style={{ fontSize: 12, color: 'var(--muted)' }}>No recent events.</div>}
        {items.map((line, idx) => (
          <div key={idx} style={{ fontSize: 12, color: 'var(--text)' }}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

function HpDrop({ from, to, startedAt, durationMs }: { from: number; to: number; startedAt: number; durationMs: number }): JSX.Element {
  const [now, setNow] = React.useState(performance.now());
  React.useEffect(() => {
    let raf = 0;
    const loop = () => {
      setNow(performance.now());
      if (performance.now() - startedAt < durationMs + 100) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [startedAt, durationMs]);
  const t = Math.min(1, (now - startedAt) / durationMs);
  const ease = (u: number) => 1 - Math.pow(1 - u, 3);
  const val = Math.round(from + (to - from) * ease(t));
  const hpMax = 100; // player max HP baseline
  const pct = Math.max(0, Math.min(1, val / hpMax));
  return (
    <div style={{ marginTop: '1.5rem', pointerEvents: 'none' }}>
      <div style={{ fontSize: '1.25rem', color: '#fff', textAlign: 'center', marginBottom: '0.5rem', textShadow: '0 0 0.5rem #000' }}>HP {val}</div>
      <div style={{ position: 'relative', width: '100%', maxWidth: 300, height: 16, border: '2px solid rgba(255,255,255,0.2)', borderRadius: 999, overflow: 'hidden', background: 'rgba(0,0,0,0.6)' }}>
        <div style={{ position: 'absolute', inset: 0, width: `${pct * 100}%`, background: 'linear-gradient(90deg, #ef4444, #b91c1c)', borderRadius: 999, boxShadow: '0 0 1rem rgba(220,38,38,0.7) inset', transition: 'width 200ms ease-out' }} />
      </div>
    </div>
  );
}

function ResultOverlay(): JSX.Element {
  const phase = useGameStore((s) => s.phase);
  const roundResult = useGameStore((s) => s.roundResult);
  const visible = phase === 'result';
  const wasWin = roundResult?.wasWin ?? false;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 300ms ease-in-out',
        pointerEvents: visible ? 'auto' : 'none',
        zIndex: 10,
      }}
    >
      <div
        style={{
          transform: visible ? 'scale(1)' : 'scale(0.9)',
          opacity: visible ? 1 : 0,
          transition: 'transform 400ms cubic-bezier(0.5, 1.5, 0.5, 1), opacity 300ms ease-in-out',
          background: 'rgba(17, 24, 39, 0.8)',
          padding: '2rem 3rem',
          borderRadius: '1rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: '4rem', fontWeight: 900, color: wasWin ? '#22c55e' : '#ef4444', textShadow: '0 0 1rem #000, 0 0 2rem #000' }}>
          {wasWin ? 'Victory' : 'Round Lost'}
        </h1>
        {!wasWin && roundResult?.hpLoss && (
          <div style={{ marginTop: '-0.5rem', fontSize: '1.5rem', color: '#f87171', textShadow: '0 0 0.75rem #000' }}>
            -{roundResult.hpLoss} HP
          </div>
        )}
        {!wasWin && useGameStore.getState().recentHpAnim && <HpDrop {...useGameStore.getState().recentHpAnim!} />}
      </div>
    </div>
  );
}

function GameOverOverlay(): JSX.Element {
  const health = useGameStore((s) => s.health);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (health <= 0) {
      setTimeout(() => setVisible(true), 100); // Delay to allow other animations to settle
    } else {
      setVisible(false);
    }
  }, [health]);

  if (health > 0 && !visible) return <></>;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 500ms ease-in-out',
        zIndex: 20,
      }}
    >
      <div
        style={{
          transform: visible ? 'scale(1)' : 'scale(0.95)',
          opacity: visible ? 1 : 0,
          transition: 'transform 500ms cubic-bezier(0.5, 1.5, 0.5, 1) 100ms, opacity 500ms ease-in-out 100ms',
          background: 'rgba(17, 24, 39, 0.85)',
          padding: '2.5rem 4rem',
          borderRadius: '1.25rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 15px 40px rgba(0, 0, 0, 0.6)',
          textAlign: 'center',
          display: 'grid',
          gap: '2rem',
        }}
      >
        <h1 style={{ fontSize: '5rem', fontWeight: 900, color: '#dc2626', textShadow: '0 0 1.5rem #b91c1c, 0 0 3rem #b91c1c' }}>
          GAME OVER
        </h1>
        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center' }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0.75rem',
              border: '1px solid #b91c1c',
              background: 'linear-gradient(180deg, #ef4444, #dc2626)',
              color: '#fff',
              fontSize: '1.1rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 8px 25px rgba(220, 38, 38, 0.4)',
              transition: 'transform 200ms ease, box-shadow 200ms ease',
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(220, 38, 38, 0.5)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(220, 38, 38, 0.4)'; }}
          >
            Retry
          </button>
          <button
            onClick={() => window.location.reload()} // Simplified for now
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0.75rem',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(31, 41, 55, 0.5)',
              color: '#d1d5db',
              fontSize: '1.1rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'background 200ms ease, color 200ms ease',
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(55, 65, 81, 0.7)'; e.currentTarget.style.color = '#fff'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(31, 41, 55, 0.5)'; e.currentTarget.style.color = '#d1d5db'; }}
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}

export function Game(): JSX.Element {
  const phase = useGameStore((s) => s.phase);
  const round = useGameStore((s) => s.round);
  const gold = useGameStore((s) => s.gold);
  const health = useGameStore((s) => s.health);
    const shakeKey = useGameStore((s) => s.shakeKey);
  const [showSynergyBook, setShowSynergyBook] = useState(false);
  const togglePause = useGameStore((s) => s.togglePause as any);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (useGameStore.getState().phase === 'combat') togglePause && togglePause();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePause]);

  return (
    <div className="game-grid">
      <div className="left-panel">
        <div className="panel soft soft-scroll">
          <Shop />
        </div>
        <div style={{
          marginTop: 8,
          padding: '10px 16px',
          borderRadius: 10,
          border: '1px solid #38bdf8',
          background: 'linear-gradient(110deg, #0ea5e9 0%, #38bdf8 50%, #0ea5e9 100%)',
          color: '#ffffff',
          fontWeight: 800,
          textAlign: 'center',
          textShadow: '0 1px 3px rgba(0,0,0,0.5)',
          boxShadow: '0 10px 25px rgba(14, 165, 233, 0.4), inset 0 1px 1px rgba(255,255,255,0.2)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <span style={{ position: 'absolute', inset: -2, borderRadius: 12, boxShadow: '0 0 0 0 rgba(56, 189, 248, 0.7)', animation: 'pulseGlow 1.8s ease-in-out infinite', pointerEvents: 'none' }} />
          <span style={{ position: 'absolute', top: 0, left: '-100%', width: '100%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)', animation: 'shimmer 3s infinite', animationDelay: '0.5s', pointerEvents: 'none' }} />
          <span style={{ position: 'relative' }}>Level up to place more units on the board!</span>
          <style>{`
            @keyframes pulseGlow {
              0% { box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.7); }
              70% { box-shadow: 0 0 0 16px rgba(56, 189, 248, 0); }
              100% { box-shadow: 0 0 0 0 rgba(56, 189, 248, 0); }
            }
            @keyframes shimmer {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(200%); }
            }
          `}</style>
        </div>
      </div>
      <div className="center-panel">
        <div className="hud">
          <div className="pill">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="#94a3b8" aria-hidden style={{ marginRight: 4 }}>
              <circle cx="12" cy="12" r="10" />
            </svg>
            <span className="key">Phase</span> <strong>{phase}</strong>
          </div>
          <div className="pill">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="#94a3b8" aria-hidden style={{ marginRight: 4 }}>
              <path d="M7 4h10v2H7zM7 11h10v2H7zM7 18h10v2H7z" />
            </svg>
            <span className="key">Round</span> <strong>{round}</strong>
          </div>
          <div className="pill ok">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="var(--accent)" aria-hidden style={{ marginRight: 4 }}>
              <path d="M12 2l3 7h7l-5.5 4.1L18 21l-6-4-6 4 1.5-7.9L2 9h7z" />
            </svg>
            <span className="key">Gold</span> <strong style={{ color: 'var(--accent)' }}>{gold}</strong>
          </div>
          <div className="pill warn">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="var(--warn)" aria-hidden style={{ marginRight: 4 }}>
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41 1.01 4.22 2.55C11.09 5.01 12.76 4 14.5 4 17 4 19 6 19 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <span className="key">HP</span> <strong style={{ color: 'var(--warn)' }}>{health}</strong>
          </div>
          <SettingsMenu />
        </div>
        <div style={{ position: 'relative', transition: 'transform 60ms ease', transform: shakeKey ? `translate(${(Math.random()*4-2)*(useGameStore.getState().shakeIntensity||1)}px, ${(Math.random()*4-2)*(useGameStore.getState().shakeIntensity||1)}px)` : 'none' }} className="panel soft" >
          <SynergyStrip onOpenSynergyBook={() => setShowSynergyBook(true)} />
          <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 8, alignItems: 'start' }}>
            <DuoPanel />
            <Board />
          </div>
          <ResultOverlay />
          <GameOverOverlay />
        </div>
        <div className="panel soft" style={{ marginTop: 6, position: 'sticky', top: 8, zIndex: 2 }}>
          <Controls />
        </div>
        <div className="panel soft" style={{ marginTop: 6 }}>
          <Bench />
        </div>
        <CompactLog />
      </div>
      <div className="right-panel stack-16">
        <div className="panel soft soft-scroll" style={{ maxHeight: '46vh' }}>
          <DamagePanel />
        </div>
        <div className="panel soft soft-scroll" style={{ maxHeight: '46vh' }}>
          <Leaderboard />
        </div>
      </div>
      {showSynergyBook && <SynergyBook onClose={() => setShowSynergyBook(false)} />}
    </div>
  );
}


