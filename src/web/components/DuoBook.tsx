import React from 'react';

export function DuoBook(): JSX.Element {
  const DUOS: Array<{ a: string; b: string; name: string; desc: string }> = [
    { a: 'frost', b: 'marksman', name: 'Shatter', desc: 'Bonus damage to slowed enemies with icy burst.' },
    { a: 'paladin', b: 'sorcerer', name: 'Sanctified Nova', desc: 'Paladin pulses also damage nearby foes.' },
    { a: 'assassin', b: 'rogue', name: 'Backstab Bleed', desc: 'Isolated targets suffer heavy bleed.' },
    { a: 'guardian', b: 'cleric', name: 'Bulwark Blessing', desc: 'Heal pulses also grant shields.' },
    { a: 'hunter', b: 'beastmaster', name: 'Pack Volley', desc: 'Rangers fire an extra weaker shot.' },
    { a: 'spear', b: 'phalanx', name: 'Impale', desc: 'Bonus damage to the cell behind the target.' },
    { a: 'mage', b: 'warlock', name: 'Arcane Ruin', desc: 'Splash damage around the struck target.' },
    { a: 'druid', b: 'monk', name: 'Purifying Grove', desc: 'Cleanse and small extra heal on pulses.' },
    { a: 'sniper', b: 'marksman', name: 'Headshot', desc: 'Chance to massively amplify a ranged hit.' },
    { a: 'ballista', b: 'sentry', name: 'Overwatch', desc: 'Auto-fire at a random enemy after a hit.' },
    { a: 'icearcher', b: 'frost', name: 'Deep Freeze', desc: 'Slow may briefly stun on hit.' },
    { a: 'knight', b: 'templar', name: 'Holy Bash', desc: 'Smite in a small cone behind the target.' },
    { a: 'valkyrie', b: 'paladin', name: 'Judgement', desc: 'On kill, smite adjacent enemies.' },
    { a: 'archer', b: 'crossbow', name: 'Volley Spread', desc: 'Fires extra arrows to up to two nearby enemies.' },
    { a: 'sorcerer', b: 'stormcaller', name: 'Chain Bolt', desc: 'Lightning arcs from the struck target to a nearby enemy.' },
    { a: 'warrior', b: 'berserker', name: 'Rage Shock', desc: 'Extra shock damage on melee hits plus brief screen shake.' },
    { a: 'assassin', b: 'duelist', name: 'Lunge', desc: 'Brief slow on low-HP enemies when hit.' },
    { a: 'pikeman', b: 'javelin', name: 'Long Reach', desc: 'Extra spear jab to the same target.' },
    { a: 'guardian', b: 'paladin', name: 'Aegis', desc: 'Heal pulses grant brief damage reduction.' },
    { a: 'valkyrie', b: 'templar', name: 'Wings', desc: 'Smite ring on Valkyrie melee hits.' },
    { a: 'knight', b: 'guardian', name: 'Wall', desc: 'Shield ally directly behind the attacker.' },
    { a: 'paladin', b: 'templar', name: 'Holy Radiance', desc: 'Radiant ring at Paladin on heal pulse.' },
    { a: 'mage', b: 'frost', name: 'Glacier', desc: 'Frost ring + bonus damage vs slowed enemies.' },
    { a: 'warlock', b: 'witch', name: 'Hex', desc: 'Brief slow on hit with arcane visuals.' },
    { a: 'sniper', b: 'crossbow', name: 'Piercing Round', desc: 'Attempts to hit the enemy behind the target.' },
    { a: 'druid', b: 'beastmaster', name: 'Pack Mending', desc: 'Beastmaster hit heals a nearby ally.' },
    { a: 'cleric', b: 'medic', name: 'Field Triage', desc: 'Heal lowest-HP nearby ally on pulse.' },
    { a: 'gladiator', b: 'champion', name: 'Arena Roar', desc: 'Damage adjacent enemies around the target.' },
    { a: 'knight', b: 'paladin', name: 'Oathkeeper', desc: 'Knight gains a small shield on hit.' },
    { a: 'archer', b: 'hunter', name: 'Falcon Volley', desc: 'Extra arrow to the same target.' },
    { a: 'warlock', b: 'mystic', name: 'Hexburst', desc: 'Bonus damage if target is slowed or stunned.' },
    { a: 'ballista', b: 'slinger', name: 'Explosive Load', desc: 'Small AoE around the target.' },
    { a: 'druid', b: 'paladin', name: 'Blessed Grove', desc: 'Extra small heal and ring on allies in radius when Paladin heals.' },
    { a: 'sentry', b: 'marksman', name: 'Focus Fire', desc: 'Chance to immediately refire at the same target.' },
    { a: 'guardian', b: 'valkyrie', name: 'Aerial Bulwark', desc: 'Valkyrie gains shield when near Guardian in same column.' },
    { a: 'monk', b: 'paladin', name: 'Serenity', desc: 'Monk gains small self heal after attacking.' },
  ];

  return (
    <div className="panel soft soft-scroll" style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: 10, borderBottom: '1px solid var(--panel-border)' }}>
        <div style={{ fontWeight: 900 }}>Duo Synergy Book</div>
      </div>
      <div style={{ padding: 10, display: 'grid', gap: 8 }}>
        {DUOS.map((d) => (
          <div key={`${d.a}+${d.b}`} style={{ display: 'grid', gap: 4, border: '1px solid var(--panel-border)', borderRadius: 10, padding: 8, background: 'var(--panel)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontWeight: 800 }}>{d.name}</div>
              <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>{d.a} + {d.b}</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text)' }}>{d.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


