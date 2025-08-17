import React from 'react';

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

interface SynergyBookProps {
  onClose: () => void;
}

export function SynergyBook({ onClose }: SynergyBookProps): JSX.Element {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Synergy Book</h2>
          <button style={styles.closeButton} onClick={onClose}>&times;</button>
        </div>
        <div style={styles.content}>
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Trio Synergies</h3>
            <div style={styles.grid}>
              {TRIOS.map((t) => (
                <div key={t.name} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <div style={styles.cardTitle}>{t.name}</div>
                    <div style={styles.cardMembers}>{`${t.a} + ${t.b} + ${t.c}`}</div>
                  </div>
                  <div style={styles.cardDesc}>{t.desc}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Duo Synergies</h3>
            <div style={styles.grid}>
              {DUOS.map((d) => (
                <div key={d.name} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <div style={styles.cardTitle}>{d.name}</div>
                    <div style={styles.cardMembers}>{`${d.a} + ${d.b}`}</div>
                  </div>
                  <div style={styles.cardDesc}>{d.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'var(--panel)',
    border: '1px solid var(--panel-border)',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '800px',
    height: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    borderBottom: '1px solid var(--panel-border)',
  },
  title: {
    margin: 0,
    fontWeight: 900,
    fontSize: '20px',
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    fontSize: '28px',
    cursor: 'pointer',
    color: 'var(--muted)',
  },
  content: {
    padding: '16px 24px',
    overflowY: 'auto',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: '12px',
    borderBottom: '1px solid var(--panel-border)',
    paddingBottom: '8px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '12px',
  },
  card: {
    background: 'var(--panel-raised)',
    border: '1px solid var(--panel-border)',
    borderRadius: '8px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
  },
  cardTitle: {
    fontWeight: 800,
    fontSize: '14px',
  },
  cardMembers: {
    fontSize: '11px',
    color: 'var(--muted)',
    textTransform: 'capitalize',
    flexShrink: 0,
  },
  cardDesc: {
    fontSize: '12px',
  },
};
