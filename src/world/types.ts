export type Phase = 'prep' | 'combat' | 'result' | 'gameover';

export interface UnitStats {
  hp: number;
  atk: number;
  range: number; // Manhattan range
  atkIntervalMs: number;
  moveIntervalMs: number;
}

export type Ability =
  | { type: 'cleave'; ratio: number }
  | { type: 'multishot'; extraTargets: number; ratio: number }
  | { type: 'stunOnHit'; chance: number; durationMs: number }
  | { type: 'slowOnHit'; chance: number; factor: number; durationMs: number }
  | { type: 'healPulse'; cooldownMs: number; amount: number }
  | { type: 'pierce'; ratio: number };

export interface UnitTemplate {
  key: string;
  name: string;
  cost: number;
  stats: UnitStats;
  ability?: Ability;
  abilityLevels?: { [star: number]: Ability };
  traits?: string[]; // e.g., 'Ranger', 'Vanguard', 'Caster', 'Support', 'Skirmisher', 'Lancer'
}

export interface UnitInstance {
  id: string;
  templateKey: string;
  team: 'player' | 'enemy';
  hp: number;
  lastAttackAt: number;
  lastMoveAt: number;
  specialLastAt: number;
  status?: {
    stunnedUntil?: number;
    slowUntil?: number;
    slowFactor?: number;
    bleedUntil?: number;
    bleedDps?: number; // damage per second
  };
  star: number; // 1..3
  shieldHp?: number; // temporary shield applied by items/synergies at round start
  items?: ItemKey[]; // equipped item keys
  // Placement/cover buffs for this combat
  coverAtkBonus?: number; // added to base atk for this combat (frontline protector)
  damageReductionPct?: number; // 0..1 damage reduction applied before shields
}

export type BoardPos = { r: number; c: number };

export interface ShopItem {
  id: string; // unique instance id to buy from shop
  templateKey: string;
  name: string;
  cost: number;
}

export type Effect =
  | {
      id: string;
      type: 'projectile';
      from: BoardPos;
      to: BoardPos;
      color: string;
      shape?: 'arrow' | 'orb' | 'bolt' | 'shard' | 'bullet' | 'spear' | 'beam' | 'chakram' | 'feather' | 'saber' | 'bomb';
      startedAt: number;
      durationMs: number;
      tier?: number; // star level for visuals
      trail?: boolean; // draw motion trail
      sizeScale?: number; // scale projectile size
      glow?: number; // 0..1 additional glow opacity
      color2?: string; // optional secondary color for gradient-ish layering
    }
  | {
      id: string;
      type: 'hit';
      at: BoardPos;
      color: string;
      shape?: 'slash' | 'burst' | 'impact' | 'smite' | 'thrust' | 'shock' | 'rip';
      startedAt: number;
      durationMs: number;
      tier?: number;
      particles?: number; // number of burst rays/particles
      sizeScale?: number;
      glow?: number;
    }
  | {
      id: string;
      type: 'ring';
      at: BoardPos;
      color: string;
      startedAt: number;
      durationMs: number;
      maxRadiusCells?: number; // how many cells radius expands to
      tier?: number;
      rings?: number; // number of concentric rings
      glow?: number;
    }
  | {
      id: string;
      type: 'special';
      at: BoardPos;
      shape: string; // semantic shape id: 'crest' | 'reticle' | 'rune' | 'leaf' | 'snow' | 'lightning' | ...
      color: string;
      color2?: string;
      startedAt: number;
      durationMs: number;
      sizeScale?: number;
      glow?: number;
      rotate?: boolean;
    }
  | {
      id: string;
      type: 'text';
      at: BoardPos;
      value: string;
      color: string;
      startedAt: number;
      durationMs: number;
      sizeScale?: number;
    }
  | {
      id: string;
      type: 'decal';
      at: BoardPos;
      color: string;
      shape?: 'slashmark' | 'scorch' | 'frostcrack';
      startedAt: number;
      durationMs: number;
      sizeScale?: number;
      rotationDeg?: number;
    };

export interface GameState {
  phase: Phase;
  round: number;
  gold: number;
  health: number;
  runStartTs: number; // perf timestamp for run duration
  level: number; // player level affects shop odds
  xp: number; // current experience toward next level
  cellSize: number; // px size of each board cell
  combatSpeed?: number; // 0.5..3 speed multiplier for combat timings
  paused?: boolean; // pause flag for combat loop/animations
  bench: string[]; // unit ids
  units: Record<string, UnitInstance>; // id -> unit
  board: Record<string, string | undefined>; // "r,c" -> unitId
  shop: ShopItem[];
  shopSlots?: number;
  shopFrozen?: Record<string, boolean>; // shopItemId -> true if frozen
  shopLocked?: boolean;
  log: string[];
  recentHpAnim?: { from: number; to: number; startedAt: number; durationMs: number };
  // Saved player placements at the start of combat: unitId -> cellKey "r,c"
  savedPlacement?: Record<string, string>;
  // Placement used in the previous completed round
  lastRoundPlayerPlacement?: Record<string, string>;
  effects: Effect[];
  // Damage dealt per unit id for the current round
  damageThisRound?: Record<string, number>;
  // Player unit ids that participated at round start (for damage panel)
  damageParticipants?: string[];
  // Enemy symmetric economy
  enemyGold: number;
  enemyLevel: number;
  enemyXp: number;
  enemyShop: ShopItem[];
  enemyShopSlots?: number;
  enemyShopFrozen?: Record<string, boolean>;
  // Synergy and meta
  lastOutcome?: 'win' | 'loss' | 'draw';
  winStreak?: number;
  loseStreak?: number;
  // Bias player shop
  shopFocusTrait?: string;
  // transient screen shake trigger
  shakeKey?: string;
  shakeMs?: number;
  // UI settings
  alwaysShowRanges?: boolean;
  shakeIntensity?: number; // 0..2 multiplier for camera shake
  toasts?: Toast[];
  roundResult?: { wasWin: boolean; hpLoss: number };
}

export type ToastType = 'info' | 'ok' | 'warn' | 'bad';

export interface Toast {
  id: string;
  type: ToastType;
  text: string;
  startedAt: number;
  durationMs: number;
}

export type RunRecord = {
  id: string;
  when: number; // Date.now()
  rounds: number; // round reached
  durationMs: number;
  level: number; // final player level
  hp: number; // final hp (0)
  comp: Array<{ templateKey: string; star: number }>; // final comp summary
};

// Items/Augments
export type ItemKey =
  | 'berserker_axe' // +10 atk
  | 'swift_gloves'  // -10% attack interval
  | 'vampiric_fang' // 15% lifesteal
  | 'frost_rune'    // 20% chance to slow on hit (30% for ranged)
  | 'shield_amulet' // +30 shield at round start (scaled by star)
  | 'barbed_blade'; // 20% chance to inflict bleed for 3s at 8 DPS



