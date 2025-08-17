import React from 'react';

export function TrioBook(): JSX.Element {
  const TRIOS: Array<{ a: string; b: string; c: string; name: string; desc: string }> = [
    { a: 'knight', b: 'paladin', c: 'templar', name: 'Holy Triumvirate', desc: 'Radiant beam + smite burst on hits.' },
    { a: 'archer', b: 'marksman', c: 'sniper', name: 'Arrow Storm', desc: 'Extra projectiles to two random targets.' },
    { a: 'guardian', b: 'champion', c: 'gladiator', name: 'Phalanx Wall', desc: 'Brief DR to adjacent allies with shock visuals.' },
    { a: 'druid', b: 'monk', c: 'paladin', name: 'Sanctuary', desc: 'Bigger extra heal + radiant-green overlay on pulses.' },
    { a: 'sorcerer', b: 'warlock', c: 'witch', name: 'Chaos Nexus', desc: 'Rune bursts damage enemies adjacent to the target.' },
    { a: 'pikeman', b: 'phalanx', c: 'spear', name: 'Piercing Wall', desc: 'Thrust damage continues up to two cells past target.' },
    { a: 'cleric', b: 'monk', c: 'medic', name: 'Hymn of Life', desc: 'Heal pulses add soft HoT ticks with verdant FX.' },
    { a: 'mage', b: 'sorcerer', c: 'stormcaller', name: 'Tempest', desc: 'Bolt + rune-beam combo adds bonus damage.' },
    { a: 'rogue', b: 'assassin', c: 'duelist', name: 'Deathblossom', desc: 'Melee hits apply rip strikes around the target.' },
    { a: 'guardian', b: 'shieldbearer', c: 'shieldman', name: 'Iron Bulwark', desc: 'On melee hit, pulse small shields to adjacent allies.' },
    { a: 'frost', b: 'icearcher', c: 'mystic', name: 'Absolute Zero', desc: 'Slow → chance to freeze and bonus damage with icy FX.' },
    { a: 'ballista', b: 'sentry', c: 'slinger', name: 'Siege Network', desc: 'Launch a bomb that deals small AoE on impact.' },
    { a: 'hunter', b: 'archer', c: 'beastmaster', name: 'Pack Hunt', desc: 'Chance to fire two extra weaker shots at the target.' },
  ];

  return (
    <div className="panel soft soft-scroll" style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: 10, borderBottom: '1px solid var(--panel-border)' }}>
        <div style={{ fontWeight: 900 }}>Trio Synergy Book</div>
      </div>
      <div style={{ padding: 10, display: 'grid', gap: 8 }}>
        {TRIOS.map((t) => (
          <div key={`${t.a}+${t.b}+${t.c}`} style={{ display: 'grid', gap: 4, border: '1px solid var(--panel-border)', borderRadius: 10, padding: 8, background: 'var(--panel)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontWeight: 800 }}>{t.name}</div>
              <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>{t.a} + {t.b} + {t.c}</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text)' }}>{t.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


