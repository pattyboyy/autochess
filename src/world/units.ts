import { UnitTemplate, UnitInstance } from './types';

export const UNIT_TEMPLATES: Record<string, UnitTemplate> = {
  warrior: {
    key: 'warrior',
    name: 'Warrior',
    cost: 2,
    stats: { hp: 120, atk: 18, range: 1, atkIntervalMs: 900, moveIntervalMs: 400 },
    ability: { type: 'cleave', ratio: 0.4 },
    abilityLevels: {
      2: { type: 'cleave', ratio: 0.55 },
      3: { type: 'cleave', ratio: 0.75 },
    },
  },
  archer: {
    key: 'archer',
    name: 'Archer',
    cost: 3,
    stats: { hp: 80, atk: 20, range: 5, atkIntervalMs: 800, moveIntervalMs: 450 },
    ability: { type: 'multishot', extraTargets: 1, ratio: 0.6 },
    abilityLevels: {
      2: { type: 'multishot', extraTargets: 2, ratio: 0.65 },
      3: { type: 'multishot', extraTargets: 3, ratio: 0.7 },
    },
  },
  mage: {
    key: 'mage',
    name: 'Mage',
    cost: 3,
    stats: { hp: 70, atk: 26, range: 4, atkIntervalMs: 1100, moveIntervalMs: 500 },
    ability: { type: 'stunOnHit', chance: 0.14, durationMs: 800 },
    abilityLevels: {
      2: { type: 'stunOnHit', chance: 0.2, durationMs: 900 },
      3: { type: 'stunOnHit', chance: 0.28, durationMs: 1100 },
    },
  },
  knight: {
    key: 'knight',
    name: 'Knight',
    cost: 3,
    stats: { hp: 160, atk: 16, range: 1, atkIntervalMs: 950, moveIntervalMs: 420 },
    ability: { type: 'cleave', ratio: 0.35 },
  },
  rogue: {
    key: 'rogue',
    name: 'Rogue',
    cost: 3,
    stats: { hp: 70, atk: 28, range: 1, atkIntervalMs: 700, moveIntervalMs: 350 },
    ability: { type: 'slowOnHit', chance: 0.22, factor: 0.7, durationMs: 900 },
    abilityLevels: {
      2: { type: 'slowOnHit', chance: 0.28, factor: 0.6, durationMs: 1100 },
      3: { type: 'slowOnHit', chance: 0.35, factor: 0.55, durationMs: 1300 },
    },
  },
  spear: {
    key: 'spear',
    name: 'Spearman',
    cost: 2,
    stats: { hp: 100, atk: 18, range: 2, atkIntervalMs: 820, moveIntervalMs: 420 },
    ability: { type: 'pierce', ratio: 0.35 },
    abilityLevels: {
      2: { type: 'pierce', ratio: 0.5 },
      3: { type: 'pierce', ratio: 0.7 },
    },
  },
  cleric: {
    key: 'cleric',
    name: 'Cleric',
    cost: 2,
    stats: { hp: 85, atk: 14, range: 3, atkIntervalMs: 900, moveIntervalMs: 460 },
    ability: { type: 'healPulse', cooldownMs: 2600, amount: 16 },
    abilityLevels: {
      2: { type: 'healPulse', cooldownMs: 2300, amount: 22 },
      3: { type: 'healPulse', cooldownMs: 2000, amount: 28 },
    },
  },
  sniper: {
    key: 'sniper',
    name: 'Sniper',
    cost: 4,
    stats: { hp: 70, atk: 34, range: 6, atkIntervalMs: 1200, moveIntervalMs: 480 },
    ability: { type: 'pierce', ratio: 0.5 },
    abilityLevels: {
      2: { type: 'pierce', ratio: 0.65 },
      3: { type: 'pierce', ratio: 0.8 },
    },
  },
  guardian: {
    key: 'guardian',
    name: 'Guardian',
    cost: 4,
    stats: { hp: 220, atk: 14, range: 1, atkIntervalMs: 1000, moveIntervalMs: 420 },
    ability: { type: 'cleave', ratio: 0.28 },
    abilityLevels: {
      2: { type: 'cleave', ratio: 0.45 },
      3: { type: 'cleave', ratio: 0.6 },
    },
  },
  berserker: {
    key: 'berserker',
    name: 'Berserker',
    cost: 3,
    stats: { hp: 110, atk: 16, range: 1, atkIntervalMs: 500, moveIntervalMs: 360 },
    ability: { type: 'cleave', ratio: 0.22 },
    abilityLevels: {
      2: { type: 'cleave', ratio: 0.35 },
      3: { type: 'cleave', ratio: 0.5 },
    },
  },
  frost: {
    key: 'frost',
    name: 'Frost Mage',
    cost: 3,
    stats: { hp: 75, atk: 22, range: 4, atkIntervalMs: 950, moveIntervalMs: 500 },
    ability: { type: 'slowOnHit', chance: 0.3, factor: 0.6, durationMs: 1100 },
    abilityLevels: {
      2: { type: 'slowOnHit', chance: 0.38, factor: 0.55, durationMs: 1300 },
      3: { type: 'slowOnHit', chance: 0.48, factor: 0.5, durationMs: 1500 },
    },
  },
  paladin: {
    key: 'paladin',
    name: 'Paladin',
    cost: 4,
    stats: { hp: 180, atk: 20, range: 1, atkIntervalMs: 900, moveIntervalMs: 400 },
    ability: { type: 'healPulse', cooldownMs: 2300, amount: 20 },
    abilityLevels: {
      2: { type: 'healPulse', cooldownMs: 2000, amount: 26 },
      3: { type: 'healPulse', cooldownMs: 1800, amount: 34 },
    },
  },
  hunter: {
    key: 'hunter',
    name: 'Hunter',
    cost: 3,
    stats: { hp: 90, atk: 22, range: 4, atkIntervalMs: 850, moveIntervalMs: 440 },
    ability: { type: 'multishot', extraTargets: 1, ratio: 0.55 },
    abilityLevels: {
      2: { type: 'multishot', extraTargets: 2, ratio: 0.6 },
      3: { type: 'multishot', extraTargets: 3, ratio: 0.65 },
    },
  },
  // Rare/Special units
  assassin: {
    key: 'assassin',
    name: 'Assassin',
    cost: 4,
    stats: { hp: 85, atk: 30, range: 1, atkIntervalMs: 600, moveIntervalMs: 340 },
    ability: { type: 'stunOnHit', chance: 0.16, durationMs: 600 },
    abilityLevels: {
      2: { type: 'stunOnHit', chance: 0.22, durationMs: 750 },
      3: { type: 'stunOnHit', chance: 0.3, durationMs: 950 },
    },
  },
  ballista: {
    key: 'ballista',
    name: 'Ballista',
    cost: 5,
    stats: { hp: 90, atk: 34, range: 7, atkIntervalMs: 1150, moveIntervalMs: 520 },
    ability: { type: 'multishot', extraTargets: 2, ratio: 0.65 },
    abilityLevels: {
      2: { type: 'multishot', extraTargets: 3, ratio: 0.7 },
      3: { type: 'multishot', extraTargets: 4, ratio: 0.75 },
    },
  },
  sorcerer: {
    key: 'sorcerer',
    name: 'Sorcerer',
    cost: 5,
    stats: { hp: 85, atk: 32, range: 5, atkIntervalMs: 1000, moveIntervalMs: 500 },
    ability: { type: 'stunOnHit', chance: 0.2, durationMs: 750 },
    abilityLevels: {
      2: { type: 'stunOnHit', chance: 0.28, durationMs: 900 },
      3: { type: 'stunOnHit', chance: 0.36, durationMs: 1100 },
    },
  },
  champion: {
    key: 'champion',
    name: 'Champion',
    cost: 5,
    stats: { hp: 240, atk: 22, range: 1, atkIntervalMs: 850, moveIntervalMs: 400 },
    ability: { type: 'cleave', ratio: 0.5 },
    abilityLevels: {
      2: { type: 'cleave', ratio: 0.7 },
      3: { type: 'cleave', ratio: 0.85 },
    },
  },
  templar: {
    key: 'templar',
    name: 'Templar',
    cost: 5,
    stats: { hp: 200, atk: 18, range: 2, atkIntervalMs: 900, moveIntervalMs: 420 },
    ability: { type: 'healPulse', cooldownMs: 2100, amount: 24 },
    abilityLevels: {
      2: { type: 'healPulse', cooldownMs: 1900, amount: 30 },
      3: { type: 'healPulse', cooldownMs: 1700, amount: 38 },
    },
  },
  // New additions
  monk: {
    key: 'monk',
    name: 'Monk',
    cost: 2,
    stats: { hp: 90, atk: 14, range: 2, atkIntervalMs: 880, moveIntervalMs: 420 },
    ability: { type: 'healPulse', cooldownMs: 2500, amount: 14 },
    abilityLevels: {
      2: { type: 'healPulse', cooldownMs: 2200, amount: 20 },
      3: { type: 'healPulse', cooldownMs: 1900, amount: 26 },
    },
  },
  crossbow: {
    key: 'crossbow',
    name: 'Crossbowman',
    cost: 2,
    stats: { hp: 75, atk: 18, range: 4, atkIntervalMs: 780, moveIntervalMs: 440 },
    ability: { type: 'multishot', extraTargets: 1, ratio: 0.55 },
    abilityLevels: {
      2: { type: 'multishot', extraTargets: 2, ratio: 0.6 },
      3: { type: 'multishot', extraTargets: 3, ratio: 0.65 },
    },
  },
  pikeman: {
    key: 'pikeman',
    name: 'Pikeman',
    cost: 2,
    stats: { hp: 105, atk: 17, range: 2, atkIntervalMs: 830, moveIntervalMs: 420 },
    ability: { type: 'pierce', ratio: 0.4 },
    abilityLevels: {
      2: { type: 'pierce', ratio: 0.55 },
      3: { type: 'pierce', ratio: 0.7 },
    },
  },
  valkyrie: {
    key: 'valkyrie',
    name: 'Valkyrie',
    cost: 4,
    stats: { hp: 170, atk: 22, range: 1, atkIntervalMs: 850, moveIntervalMs: 380 },
    ability: { type: 'cleave', ratio: 0.45 },
    abilityLevels: {
      2: { type: 'cleave', ratio: 0.65 },
      3: { type: 'cleave', ratio: 0.8 },
    },
  },
  warlock: {
    key: 'warlock',
    name: 'Warlock',
    cost: 4,
    stats: { hp: 80, atk: 28, range: 5, atkIntervalMs: 1000, moveIntervalMs: 500 },
    ability: { type: 'stunOnHit', chance: 0.22, durationMs: 850 },
    abilityLevels: {
      2: { type: 'stunOnHit', chance: 0.3, durationMs: 950 },
      3: { type: 'stunOnHit', chance: 0.36, durationMs: 1150 },
    },
  },
  druid: {
    key: 'druid',
    name: 'Druid',
    cost: 3,
    stats: { hp: 100, atk: 12, range: 3, atkIntervalMs: 920, moveIntervalMs: 460 },
    ability: { type: 'healPulse', cooldownMs: 2400, amount: 18 },
    abilityLevels: {
      2: { type: 'healPulse', cooldownMs: 2100, amount: 24 },
      3: { type: 'healPulse', cooldownMs: 1800, amount: 30 },
    },
  },
  icearcher: {
    key: 'icearcher',
    name: 'Ice Archer',
    cost: 3,
    stats: { hp: 80, atk: 18, range: 5, atkIntervalMs: 820, moveIntervalMs: 450 },
    ability: { type: 'slowOnHit', chance: 0.26, factor: 0.65, durationMs: 1000 },
    abilityLevels: {
      2: { type: 'slowOnHit', chance: 0.34, factor: 0.6, durationMs: 1200 },
      3: { type: 'slowOnHit', chance: 0.42, factor: 0.55, durationMs: 1400 },
    },
  },
  gladiator: {
    key: 'gladiator',
    name: 'Gladiator',
    cost: 3,
    stats: { hp: 150, atk: 18, range: 1, atkIntervalMs: 900, moveIntervalMs: 380 },
    ability: { type: 'cleave', ratio: 0.3 },
    abilityLevels: {
      2: { type: 'cleave', ratio: 0.45 },
      3: { type: 'cleave', ratio: 0.6 },
    },
  },
  marksman: {
    key: 'marksman',
    name: 'Marksman',
    cost: 4,
    stats: { hp: 75, atk: 30, range: 6, atkIntervalMs: 980, moveIntervalMs: 480 },
    ability: { type: 'pierce', ratio: 0.6 },
    abilityLevels: {
      2: { type: 'pierce', ratio: 0.75 },
      3: { type: 'pierce', ratio: 0.9 },
    },
  },
  // Basic units
  recruit: {
    key: 'recruit',
    name: 'Recruit',
    cost: 1,
    stats: { hp: 90, atk: 14, range: 1, atkIntervalMs: 900, moveIntervalMs: 420 },
    ability: { type: 'cleave', ratio: 0.15 },
    abilityLevels: {
      2: { type: 'cleave', ratio: 0.25 },
      3: { type: 'cleave', ratio: 0.35 },
    },
  },
  slinger: {
    key: 'slinger',
    name: 'Slinger',
    cost: 1,
    stats: { hp: 70, atk: 14, range: 3, atkIntervalMs: 720, moveIntervalMs: 440 },
    ability: { type: 'multishot', extraTargets: 1, ratio: 0.5 },
    abilityLevels: {
      2: { type: 'multishot', extraTargets: 2, ratio: 0.55 },
      3: { type: 'multishot', extraTargets: 2, ratio: 0.6 },
    },
  },
  javelin: {
    key: 'javelin',
    name: 'Javelin Thrower',
    cost: 2,
    stats: { hp: 85, atk: 18, range: 3, atkIntervalMs: 820, moveIntervalMs: 440 },
    ability: { type: 'pierce', ratio: 0.4 },
    abilityLevels: {
      2: { type: 'pierce', ratio: 0.55 },
      3: { type: 'pierce', ratio: 0.7 },
    },
  },
  mystic: {
    key: 'mystic',
    name: 'Mystic',
    cost: 2,
    stats: { hp: 75, atk: 16, range: 4, atkIntervalMs: 1000, moveIntervalMs: 500 },
    ability: { type: 'stunOnHit', chance: 0.14, durationMs: 700 },
    abilityLevels: {
      2: { type: 'stunOnHit', chance: 0.2, durationMs: 850 },
      3: { type: 'stunOnHit', chance: 0.26, durationMs: 1000 },
    },
  },
  medic: {
    key: 'medic',
    name: 'Medic',
    cost: 1,
    stats: { hp: 80, atk: 10, range: 3, atkIntervalMs: 980, moveIntervalMs: 500 },
    ability: { type: 'healPulse', cooldownMs: 2700, amount: 12 },
    abilityLevels: {
      2: { type: 'healPulse', cooldownMs: 2400, amount: 16 },
      3: { type: 'healPulse', cooldownMs: 2100, amount: 20 },
    },
  },
  shieldman: {
    key: 'shieldman',
    name: 'Shieldman',
    cost: 1,
    stats: { hp: 120, atk: 12, range: 1, atkIntervalMs: 980, moveIntervalMs: 420 },
    ability: { type: 'cleave', ratio: 0.12 },
    abilityLevels: {
      2: { type: 'cleave', ratio: 0.22 },
      3: { type: 'cleave', ratio: 0.32 },
    },
  },
  // New unique units
  sentry: {
    key: 'sentry',
    name: 'Sentry',
    cost: 2,
    stats: { hp: 85, atk: 17, range: 4, atkIntervalMs: 820, moveIntervalMs: 460 },
    ability: { type: 'pierce', ratio: 0.35 },
    abilityLevels: {
      2: { type: 'pierce', ratio: 0.5 },
      3: { type: 'pierce', ratio: 0.65 },
    },
  },
  alchemist: {
    key: 'alchemist',
    name: 'Alchemist',
    cost: 3,
    stats: { hp: 90, atk: 12, range: 3, atkIntervalMs: 980, moveIntervalMs: 480 },
    ability: { type: 'healPulse', cooldownMs: 2400, amount: 18 },
    abilityLevels: {
      2: { type: 'healPulse', cooldownMs: 2100, amount: 24 },
      3: { type: 'healPulse', cooldownMs: 1800, amount: 30 },
    },
  },
  shieldbearer: {
    key: 'shieldbearer',
    name: 'Shieldbearer',
    cost: 2,
    stats: { hp: 150, atk: 14, range: 1, atkIntervalMs: 980, moveIntervalMs: 420 },
    ability: { type: 'cleave', ratio: 0.2 },
    abilityLevels: {
      2: { type: 'cleave', ratio: 0.32 },
      3: { type: 'cleave', ratio: 0.45 },
    },
  },
  duelist: {
    key: 'duelist',
    name: 'Duelist',
    cost: 3,
    stats: { hp: 95, atk: 26, range: 1, atkIntervalMs: 640, moveIntervalMs: 340 },
    ability: { type: 'stunOnHit', chance: 0.18, durationMs: 600 },
    abilityLevels: {
      2: { type: 'stunOnHit', chance: 0.24, durationMs: 750 },
      3: { type: 'stunOnHit', chance: 0.3, durationMs: 900 },
    },
  },
  stormcaller: {
    key: 'stormcaller',
    name: 'Stormcaller',
    cost: 4,
    stats: { hp: 80, atk: 28, range: 5, atkIntervalMs: 980, moveIntervalMs: 500 },
    ability: { type: 'stunOnHit', chance: 0.22, durationMs: 800 },
    abilityLevels: {
      2: { type: 'stunOnHit', chance: 0.28, durationMs: 950 },
      3: { type: 'stunOnHit', chance: 0.34, durationMs: 1100 },
    },
  },
  phalanx: {
    key: 'phalanx',
    name: 'Phalanx',
    cost: 3,
    stats: { hp: 130, atk: 18, range: 2, atkIntervalMs: 880, moveIntervalMs: 420 },
    ability: { type: 'pierce', ratio: 0.42 },
    abilityLevels: {
      2: { type: 'pierce', ratio: 0.58 },
      3: { type: 'pierce', ratio: 0.72 },
    },
  },
  witch: {
    key: 'witch',
    name: 'Witch',
    cost: 3,
    stats: { hp: 78, atk: 20, range: 4, atkIntervalMs: 980, moveIntervalMs: 500 },
    ability: { type: 'slowOnHit', chance: 0.28, factor: 0.65, durationMs: 1100 },
    abilityLevels: {
      2: { type: 'slowOnHit', chance: 0.36, factor: 0.6, durationMs: 1300 },
      3: { type: 'slowOnHit', chance: 0.44, factor: 0.55, durationMs: 1500 },
    },
  },
  beastmaster: {
    key: 'beastmaster',
    name: 'Beastmaster',
    cost: 4,
    stats: { hp: 110, atk: 22, range: 4, atkIntervalMs: 900, moveIntervalMs: 440 },
    ability: { type: 'multishot', extraTargets: 1, ratio: 0.6 },
    abilityLevels: {
      2: { type: 'multishot', extraTargets: 2, ratio: 0.65 },
      3: { type: 'multishot', extraTargets: 3, ratio: 0.7 },
    },
  },
};

export function createUnit(templateKey: string, team: 'player' | 'enemy', id?: string): UnitInstance {
  const t = UNIT_TEMPLATES[templateKey];
  const unitId = id ?? `${templateKey}-${team}-${Math.random().toString(36).slice(2, 9)}`;
  return {
    id: unitId,
    templateKey: t.key,
    team,
    hp: t.stats.hp,
    lastAttackAt: 0,
    lastMoveAt: 0,
    specialLastAt: 0,
    star: 1,
  };
}

export function getUnitById(id: string): { name: string; stats: UnitTemplate['stats']; templateKey: string } {
  const [templateKey] = id.split('-');
  const t = UNIT_TEMPLATES[templateKey];
  return { name: t.name, stats: t.stats, templateKey: t.key };
}

export type EmblemKind = 'sword' | 'bow' | 'orb' | 'shield' | 'dagger' | 'spear' | 'plus';
export const UNIT_VISUALS: Record<string, { primary: string; secondary: string; accent: string; glow: string; emblem: EmblemKind }> = {
  warrior: { primary: '#5B8CFF', secondary: '#1E2B52', accent: '#B3C9FF', glow: '#5B8CFF', emblem: 'sword' },
  archer:  { primary: '#6FCF97', secondary: '#1F3A30', accent: '#BFE8D0', glow: '#6FCF97', emblem: 'bow' },
  mage:    { primary: '#BB6BD9', secondary: '#2F1E40', accent: '#E0C3F6', glow: '#BB6BD9', emblem: 'orb' },
  knight:  { primary: '#F2C94C', secondary: '#3D3314', accent: '#F6E0A3', glow: '#F2C94C', emblem: 'shield' },
  rogue:   { primary: '#EB5757', secondary: '#3D1919', accent: '#F2B6B6', glow: '#EB5757', emblem: 'dagger' },
  spear:   { primary: '#56CCF2', secondary: '#163341', accent: '#B9E8F8', glow: '#56CCF2', emblem: 'spear' },
  cleric:  { primary: '#27AE60', secondary: '#0F2A1D', accent: '#A8E0C0', glow: '#27AE60', emblem: 'plus' },
  sniper:  { primary: '#95A5A6', secondary: '#2C3E50', accent: '#D5DBDB', glow: '#95A5A6', emblem: 'bow' },
  guardian:{ primary: '#F39C12', secondary: '#3B2A12', accent: '#F9D09B', glow: '#F39C12', emblem: 'shield' },
  berserker:{ primary: '#E74C3C', secondary: '#3A1411', accent: '#F5B7B1', glow: '#E74C3C', emblem: 'sword' },
  frost:   { primary: '#74B9FF', secondary: '#1B2A44', accent: '#C7E6FF', glow: '#74B9FF', emblem: 'orb' },
  paladin: { primary: '#F1C40F', secondary: '#3B3108', accent: '#F7E79E', glow: '#F1C40F', emblem: 'plus' },
  hunter:  { primary: '#58D68D', secondary: '#153226', accent: '#BDEFD3', glow: '#58D68D', emblem: 'bow' },
  assassin:{ primary: '#FF7675', secondary: '#3A1B1B', accent: '#FFB3B3', glow: '#FF7675', emblem: 'dagger' },
  ballista:{ primary: '#A3E4D7', secondary: '#1A3D36', accent: '#D6FFF4', glow: '#A3E4D7', emblem: 'bow' },
  sorcerer:{ primary: '#D980FA', secondary: '#2B1C3A', accent: '#EED0FF', glow: '#D980FA', emblem: 'orb' },
  champion:{ primary: '#FAD961', secondary: '#3D2C0F', accent: '#FFF1B8', glow: '#FAD961', emblem: 'shield' },
  templar: { primary: '#F9E79F', secondary: '#2E2A12', accent: '#FFF6CC', glow: '#F9E79F', emblem: 'plus' },
  monk:    { primary: '#C0EBA6', secondary: '#2A3A29', accent: '#E0F7CF', glow: '#C0EBA6', emblem: 'plus' },
  crossbow:{ primary: '#93C5FD', secondary: '#1E2B52', accent: '#D1E8FF', glow: '#93C5FD', emblem: 'bow' },
  pikeman: { primary: '#67E8F9', secondary: '#163341', accent: '#BFF6FB', glow: '#67E8F9', emblem: 'spear' },
  valkyrie:{ primary: '#FBCFE8', secondary: '#3B1E3F', accent: '#FDE7F5', glow: '#FBCFE8', emblem: 'sword' },
  warlock: { primary: '#A78BFA', secondary: '#2B1C3A', accent: '#E9D5FF', glow: '#A78BFA', emblem: 'orb' },
  druid:   { primary: '#86EFAC', secondary: '#143224', accent: '#CFF8DA', glow: '#86EFAC', emblem: 'plus' },
  icearcher:{ primary: '#BAE6FD', secondary: '#1B2A44', accent: '#E0F2FE', glow: '#BAE6FD', emblem: 'bow' },
  gladiator:{ primary: '#FDE68A', secondary: '#3D2C0F', accent: '#FEF3C7', glow: '#FDE68A', emblem: 'shield' },
  marksman:{ primary: '#A7F3D0', secondary: '#1A3D36', accent: '#D1FAE5', glow: '#A7F3D0', emblem: 'bow' },
  sentry:   { primary: '#60A5FA', secondary: '#1E3A8A', accent: '#BFDBFE', glow: '#60A5FA', emblem: 'shield' },
  alchemist:{ primary: '#FDE68A', secondary: '#3D2C0F', accent: '#FEF3C7', glow: '#FDE68A', emblem: 'orb' },
  shieldbearer:{ primary: '#93C5FD', secondary: '#1E3A8A', accent: '#DBEAFE', glow: '#93C5FD', emblem: 'shield' },
  duelist:  { primary: '#FCA5A5', secondary: '#3A1B1B', accent: '#FECACA', glow: '#FCA5A5', emblem: 'sword' },
  stormcaller:{ primary: '#A78BFA', secondary: '#2B1C3A', accent: '#E9D5FF', glow: '#A78BFA', emblem: 'orb' },
  phalanx:  { primary: '#67E8F9', secondary: '#163341', accent: '#BFF6FB', glow: '#67E8F9', emblem: 'spear' },
  witch:    { primary: '#C4B5FD', secondary: '#312E81', accent: '#DDD6FE', glow: '#C4B5FD', emblem: 'orb' },
  beastmaster:{ primary: '#86EFAC', secondary: '#143224', accent: '#CFF8DA', glow: '#86EFAC', emblem: 'bow' },
  recruit:  { primary: '#CBD5E1', secondary: '#334155', accent: '#E2E8F0', glow: '#CBD5E1', emblem: 'shield' },
  slinger:  { primary: '#FCA5A5', secondary: '#3A1B1B', accent: '#FECACA', glow: '#FCA5A5', emblem: 'bow' },
  javelin:  { primary: '#67E8F9', secondary: '#163341', accent: '#BFF6FB', glow: '#67E8F9', emblem: 'spear' },
  mystic:   { primary: '#A78BFA', secondary: '#2B1C3A', accent: '#E9D5FF', glow: '#A78BFA', emblem: 'orb' },
  medic:    { primary: '#86EFAC', secondary: '#143224', accent: '#CFF8DA', glow: '#86EFAC', emblem: 'plus' },
  shieldman:{ primary: '#93C5FD', secondary: '#1E3A8A', accent: '#DBEAFE', glow: '#93C5FD', emblem: 'shield' },
};

export function getUnitVisual(templateKey: string): { primary: string; secondary: string; accent: string; glow: string; emblem: EmblemKind } {
  return UNIT_VISUALS[templateKey] ?? { primary: '#7f8c8d', secondary: '#2c3e50', accent: '#bdc3c7', glow: '#95a5a6', emblem: 'sword' };
}




// Traits mapping for synergy system
export function getUnitTraits(templateKey: string): string[] {
  switch (templateKey) {
    case 'warrior': return ['Vanguard', 'Skirmisher'];
    case 'archer': return ['Ranger'];
    case 'mage': return ['Caster'];
    case 'knight': return ['Vanguard'];
    case 'rogue': return ['Skirmisher'];
    case 'spear': return ['Lancer'];
    case 'cleric': return ['Support','Caster'];
    case 'sniper': return ['Ranger'];
    case 'guardian': return ['Vanguard'];
    case 'berserker': return ['Skirmisher'];
    case 'frost': return ['Caster'];
    case 'paladin': return ['Vanguard','Support'];
    case 'hunter': return ['Ranger'];
    case 'assassin': return ['Skirmisher'];
    case 'ballista': return ['Ranger'];
    case 'sorcerer': return ['Caster'];
    case 'champion': return ['Vanguard'];
    case 'templar': return ['Vanguard','Support'];
    case 'monk': return ['Support'];
    case 'crossbow': return ['Ranger'];
    case 'pikeman': return ['Lancer','Vanguard'];
    case 'valkyrie': return ['Vanguard','Ranger'];
    case 'warlock': return ['Caster'];
    case 'druid': return ['Support','Caster'];
    case 'icearcher': return ['Ranger','Caster'];
    case 'gladiator': return ['Vanguard'];
    case 'marksman': return ['Ranger'];
    case 'sentry': return ['Ranger','Vanguard'];
    case 'alchemist': return ['Support','Caster'];
    case 'shieldbearer': return ['Vanguard'];
    case 'duelist': return ['Skirmisher'];
    case 'stormcaller': return ['Caster'];
    case 'phalanx': return ['Lancer','Vanguard'];
    case 'witch': return ['Caster'];
    case 'beastmaster': return ['Ranger','Support'];
    case 'recruit': return ['Vanguard'];
    case 'slinger': return ['Ranger'];
    case 'javelin': return ['Lancer'];
    case 'mystic': return ['Caster'];
    case 'medic': return ['Support'];
    case 'shieldman': return ['Vanguard'];
    default: return [];
  }
}