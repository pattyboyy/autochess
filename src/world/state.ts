import { create } from 'zustand';
import { produce } from 'immer';
import { BoardPos, GameState, ShopItem, UnitInstance, RunRecord, ItemKey, Toast } from './types';
import { UNIT_TEMPLATES, createUnit, getUnitTraits, getUnitVisual } from './units';

const BOARD_ROWS = 8;
const BOARD_COLS = 8;

type GameActions = {
  moveUnitToBoard: (unitId: string, pos: BoardPos) => void;
  moveUnit: (unitId: string, pos: BoardPos) => void;
  removeUnit: (pos: BoardPos) => void;
  storeUnit: (unitId: string) => void; // move from board to bench
  buyUnit: (shopItemId: string) => void;
  sellUnit: (unitId: string) => void;
  reroll: () => void;
  buyXp: () => void;
  startCombat: () => void;
  nextRound: () => void;
  logLine: (line: string) => void;
  setCellSize: (px: number) => void;
  setShopFocusTrait: (trait?: string) => void;
  setCombatSpeed: (multiplier: number) => void;
  togglePause: () => void;
  setPaused: (v: boolean) => void;
  pushToast: (t: Toast) => void;
  dismissToast: (id: string) => void;
};

export const useGameStore = create<GameState & GameActions>()((set, get) => ({
  phase: 'prep',
  round: 1,
  gold: 10,
  health: 100,
  runStartTs: performance.now(),
  level: 3,
  combatSpeed: 0.5,
  paused: false,
  xp: 0,
  cellSize: 100,
  bench: [],
  units: {},
  board: {},
  shop: initialShop(3),
  shopSlots: 5,
  shopFrozen: {},
  enemyGold: 8,
  enemyLevel: 3,
  enemyXp: 0,
  enemyShop: initialShop(3),
  enemyShopSlots: 5,
  enemyShopFrozen: {},
  log: [],
  effects: [],
  alwaysShowRanges: false,
  shakeIntensity: 1,
  toasts: [],
  roundResult: undefined,
  // not in store type: we keep leaderboard in localStorage; expose helpers via actions if needed

  moveUnitToBoard: (unitId, pos) =>
    set(
      produce((s: GameState) => {
        if (s.phase !== 'prep') return;
        const key = keyOf(pos);
        // restrict player placement to bottom half of the board
        const halfRow = Math.floor(BOARD_ROWS / 2);
        const unit = s.units[unitId];
        if (unit && unit.team === 'player') {
          const [rr] = key.split(',').map(Number);
          if (rr < halfRow) return;
          // enforce unit cap based on player level
          const cap = maxUnitsForLevel(s.level);
          const current = countUnitsOnBoard(s, 'player');
          if (current >= cap) return;
        }
        if (s.board[key]) return; // occupied
        // defensively clear any previous occurrences of this unit on the board
        for (const [k, id] of Object.entries(s.board)) if (id === unitId) s.board[k] = undefined;
        // remove from bench if present
        s.bench = s.bench.filter((id) => id !== unitId);
        s.board[key] = unitId;
        if (!s.units[unitId]) {
          // instantiate unit if somehow missing (shouldn't happen)
          s.units[unitId] = createUnit(unitId.split('-')[0], 'player', unitId);
        }
      })
    ),

  moveUnit: (unitId, pos) =>
    set(
      produce((s: GameState) => {
        if (s.phase !== 'prep') return;
        const dest = keyOf(pos);
        // restrict player movement to bottom half of the board
        const halfRow = Math.floor(BOARD_ROWS / 2);
        const unit = s.units[unitId];
        if (unit && unit.team === 'player') {
          const [rr] = dest.split(',').map(Number);
          if (rr < halfRow) return;
        }
        if (s.board[dest]) return;
        // find current position
        const currentKey = findUnitOnBoard(s.board, unitId);
        if (currentKey) s.board[currentKey] = undefined;
        // clear any stale duplicates
        for (const [k, id] of Object.entries(s.board)) if (id === unitId) s.board[k] = undefined;
        s.board[dest] = unitId;
      })
    ),

  removeUnit: (pos) =>
    set(
      produce((s: GameState) => {
        if (s.phase !== 'prep') return;
        const key = keyOf(pos);
        const unitId = s.board[key];
        if (!unitId) return;
        s.board[key] = undefined;
        s.bench.push(unitId);
      })
    ),

  storeUnit: (unitId) =>
    set(
      produce((s: GameState) => {
        if (s.phase !== 'prep') return;
        if (!s.units[unitId]) return;
        // if already on bench, ignore
        if (s.bench.includes(unitId)) return;
        const key = findUnitOnBoard(s.board, unitId);
        if (!key) return;
        s.board[key] = undefined;
        s.bench.push(unitId);
      })
    ),

  buyUnit: (shopItemId) =>
    set(
      produce((s: GameState) => {
        if (s.phase !== 'prep') return;
        const item = s.shop.find((i) => i.id === shopItemId);
        if (!item) return;
        if (s.gold < item.cost) return;
        s.gold -= item.cost;
        const u = createUnit(item.templateKey, 'player');
        s.units[u.id] = u;
        s.bench.push(u.id);
        tryCombine(s, u.templateKey, 'player');
        s.shop = s.shop.filter((i) => i.id !== item.id);
      })
    ),

  sellUnit: (unitId) =>
    set(
      produce((s: GameState) => {
        if (s.phase !== 'prep') return;
        const u = s.units[unitId];
        if (!u) return;
        const cost = UNIT_TEMPLATES[u.templateKey].cost;
        s.gold += Math.ceil(cost * 0.7);
        delete s.units[unitId];
        s.bench = s.bench.filter((id) => id !== unitId);
        const key = findUnitOnBoard(s.board, unitId);
        if (key) s.board[key] = undefined;
      })
    ),

  reroll: () =>
    set(
      produce((s: GameState) => {
        if (s.phase !== 'prep') return;
        const cost = 2;
        if (s.gold < cost) return;
        s.gold -= cost;
        if (!s.shopLocked) s.shop = refreshShop(s);
      })
    ),

  buyXp: () =>
    set(
      produce((s: GameState) => {
        if (s.phase !== 'prep') return;
        const cost = 4;
        const gained = 4;
        if (s.gold < cost) return;
        s.gold -= cost;
        levelGainXp(s, gained);
      })
    ),

  startCombat: () => {
    if (get().phase !== 'prep') return;
    // spawn enemies and run simulation
    set(
      produce((s: GameState) => {
        s.phase = 'combat';
        s.paused = false;
        if (!s.runStartTs) s.runStartTs = performance.now();
        s.log.push(`Round ${s.round} begins`);
        s.recentHpAnim = undefined;
        s.damageThisRound = {};
        // snapshot player unit ids at combat start for the damage panel
        s.damageParticipants = Object.values(s.board)
          .filter(Boolean)
          .map((id) => s.units[id as string])
          .filter((u): u is UnitInstance => !!u && u.team === 'player')
          .map((u) => u.id);
        // snapshot current player placement to restore next prep
        s.savedPlacement = {};
        for (const [k, id] of Object.entries(s.board)) {
          if (!id) continue;
          const u = s.units[id];
          if (u && u.team === 'player') s.savedPlacement[id] = k;
        }
        // Enemy should base buying decisions on last completed round's placement, not the latest edits
        const analysis = analyzePlayerBoardFromMap(s, s.lastRoundPlayerPlacement ?? s.savedPlacement ?? {});
        enemyBuyPhaseWithAnalysis(s, analysis);
        spawnEnemiesFromRoster(s);
        applySynergyPreBuffs(s, 'player');
        applySynergyPreBuffs(s, 'enemy');
        applyEnemyVarietyModifiers(s);
        applyFrontlineProtector(s);
        // Announce special duo synergies if active
        if (teamHasTemplates(s, 'player', ['frost','marksman'])) s.log.push('Special synergy activated: Frost + Marksman → Shatter strike');
        if (teamHasTemplates(s, 'player', ['paladin','sorcerer'])) s.log.push('Special synergy activated: Paladin + Sorcerer → Sanctified Nova');
        if (teamHasTemplates(s, 'player', ['assassin','rogue'])) s.log.push('Special synergy activated: Assassin + Rogue → Backstab Bleed');
        if (teamHasTemplates(s, 'player', ['guardian','cleric'])) s.log.push('Special synergy activated: Guardian + Cleric → Bulwark Blessing');
        if (teamHasTemplates(s, 'player', ['hunter','beastmaster'])) s.log.push('Special synergy activated: Hunter + Beastmaster → Pack Volley');
        if (teamHasTemplates(s, 'player', ['spear','phalanx'])) s.log.push('Special synergy activated: Spear + Phalanx → Impale');
        if (teamHasTemplates(s, 'player', ['mage','warlock'])) s.log.push('Special synergy activated: Mage + Warlock → Arcane Ruin');
        if (teamHasTemplates(s, 'player', ['druid','monk'])) s.log.push('Special synergy activated: Druid + Monk → Purifying Grove');
        if (teamHasTemplates(s, 'player', ['sniper','marksman'])) s.log.push('Special synergy activated: Sniper + Marksman → Headshot');
        if (teamHasTemplates(s, 'player', ['ballista','sentry'])) s.log.push('Special synergy activated: Ballista + Sentry → Overwatch');
        if (teamHasTemplates(s, 'player', ['icearcher','frost'])) s.log.push('Special synergy activated: Ice Archer + Frost → Deep Freeze');
        if (teamHasTemplates(s, 'player', ['knight','templar'])) s.log.push('Special synergy activated: Knight + Templar → Holy Bash');
        if (teamHasTemplates(s, 'player', ['valkyrie','paladin'])) s.log.push('Special synergy activated: Valkyrie + Paladin → Judgement');
        if (teamHasTemplates(s, 'enemy', ['frost','marksman'])) s.log.push('Enemy synergy active: Frost + Marksman');
        if (teamHasTemplates(s, 'enemy', ['paladin','sorcerer'])) s.log.push('Enemy synergy active: Paladin + Sorcerer');
        if (teamHasTemplates(s, 'enemy', ['assassin','rogue'])) s.log.push('Enemy synergy active: Assassin + Rogue');
        if (teamHasTemplates(s, 'enemy', ['guardian','cleric'])) s.log.push('Enemy synergy active: Guardian + Cleric');
        if (teamHasTemplates(s, 'enemy', ['hunter','beastmaster'])) s.log.push('Enemy synergy active: Hunter + Beastmaster');
        if (teamHasTemplates(s, 'enemy', ['spear','phalanx'])) s.log.push('Enemy synergy active: Spear + Phalanx');
        if (teamHasTemplates(s, 'enemy', ['mage','warlock'])) s.log.push('Enemy synergy active: Mage + Warlock');
        if (teamHasTemplates(s, 'enemy', ['druid','monk'])) s.log.push('Enemy synergy active: Druid + Monk');
        if (teamHasTemplates(s, 'enemy', ['sniper','marksman'])) s.log.push('Enemy synergy active: Sniper + Marksman');
        if (teamHasTemplates(s, 'enemy', ['ballista','sentry'])) s.log.push('Enemy synergy active: Ballista + Sentry');
        if (teamHasTemplates(s, 'enemy', ['icearcher','frost'])) s.log.push('Enemy synergy active: Ice Archer + Frost');
        if (teamHasTemplates(s, 'enemy', ['knight','templar'])) s.log.push('Enemy synergy active: Knight + Templar');
        if (teamHasTemplates(s, 'enemy', ['valkyrie','paladin'])) s.log.push('Enemy synergy active: Valkyrie + Paladin');
      })
    );
    runCombatLoop(set, get);
  },

  nextRound: () =>
    set(
      produce((s: GameState) => {
        if (s.phase !== 'result') return;
        s.phase = 'prep';
        s.paused = false;
        s.round += 1;
        // Player income: base + modest interest + modest streak bonus
        let income = 5;
        const interest = Math.min(3, Math.floor(s.gold / 20));
        income += interest;
        const winStreak = s.winStreak ?? 0;
        const loseStreak = s.loseStreak ?? 0;
        const playerStreak = (s.lastOutcome === 'win' ? winStreak : s.lastOutcome === 'loss' ? loseStreak : 0) || 0;
        if (playerStreak >= 3) income += Math.min(2, Math.floor(playerStreak / 3));
        s.gold += income;

        // Enemy symmetric income: base + interest + opposing streak bonus
        let enemyIncome = 5;
        const enemyInterest = Math.min(3, Math.floor(s.enemyGold / 20));
        enemyIncome += enemyInterest;
        const enemyStreak = (s.lastOutcome === 'win' ? (s.winStreak ?? 0) : s.lastOutcome === 'loss' ? (s.loseStreak ?? 0) : 0) || 0;
        // If player is on a win streak, enemy gets comeback bonus; if player on lose streak, enemy win streak bonus
        if (enemyStreak >= 3) enemyIncome += Math.min(2, Math.floor(enemyStreak / 3));
        s.enemyGold += enemyIncome;
        // passive xp per round
        levelGainXp(s, 2);
        enemyLevelGainXp(s, 2);
        if (!s.shopLocked) s.shop = refreshShop(s);
        s.enemyShop = refreshEnemyShop(s);
        // Enemy buy phase in response to previous round's board
        const analysis = analyzePlayerBoardFromMap(s, s.lastRoundPlayerPlacement ?? {});
        enemyBuyPhaseWithAnalysis(s, analysis);
        // cleanup enemies and reset/restore player units
        const playerUnits = Object.values(s.units).filter((u) => u.team === 'player');
        const enemyUnits = Object.values(s.units).filter((u) => u.team === 'enemy');
        // keep both players' rosters across rounds
        s.units = Object.fromEntries([...playerUnits, ...enemyUnits].map((u) => [u.id, u]));
        for (const u of [...playerUnits, ...enemyUnits]) {
          const stats = UNIT_TEMPLATES[u.templateKey].stats;
          const starMult = u.star ?? 1;
          u.hp = stats.hp * starMult;
          u.lastAttackAt = 0;
          u.lastMoveAt = 0;
        }
        // rebuild board only with player units using saved placement; fall back to bench
        const newBoard: GameState['board'] = {};
        const saved = s.savedPlacement ?? {};
        const cap = maxUnitsForLevel(s.level);
        let placed = 0;
        for (const [unitId, cellKey] of Object.entries(saved)) {
          if (!s.units[unitId]) continue;
          if (placed >= cap) break;
          newBoard[cellKey] = unitId;
          placed++;
        }
        s.board = newBoard;
        // ensure any player unit not on board remains in bench
        const placedUnitIds = new Set(Object.values(newBoard).filter(Boolean) as string[]);
        const allPlayerIds = playerUnits.map((u) => u.id);
        s.bench = allPlayerIds.filter((id) => !placedUnitIds.has(id));
        // remember this round's placement to use for enemy analysis next round
        s.lastRoundPlayerPlacement = saved;
        s.savedPlacement = undefined;
        s.log.push('Prep phase');
        tryGrantRandomItemToTeam(s, 'player', 0.15);
        tryGrantRandomItemToTeam(s, 'enemy', 0.12);
      })
    ),

  logLine: (line) => set(produce((s: GameState) => void s.log.push(line))),
  setCellSize: (px) => set(produce((s: GameState) => { s.cellSize = Math.max(40, Math.min(240, Math.round(px))); })),
  setShopFocusTrait: (trait) => set(produce((s: GameState) => {
    s.shopFocusTrait = trait;
  })),
  setCombatSpeed: (multiplier) => set(produce((s: GameState) => {
        s.combatSpeed = Math.max(0.1, Math.min(4, Math.round(multiplier * 100) / 100));
  })),
  togglePause: () => set(produce((s: GameState) => {
    if (s.phase === 'combat') s.paused = !s.paused;
  })),
  setPaused: (v: boolean) => set(produce((s: GameState) => {
    if (s.phase === 'combat') s.paused = !!v;
  })),
  pushToast: (t: Toast) =>
    set(
      produce((s: GameState) => {
        if (!s.toasts) s.toasts = [];
        s.toasts.push({ ...t, id: t.id ?? `toast-${Math.random()}` });
      })
    ),

  dismissToast: (id: string) =>
    set(
      produce((s: GameState) => {
        s.toasts = s.toasts?.filter((t) => t.id !== id) ?? [];
      })
    ),
}));

// --- HELPERS ---

export const keyOf = (p: BoardPos) => `${p.r},${p.c}`;
export const posOf = (k: string) => {
  const [r, c] = k.split(',').map(Number);
  return { r, c };
};

function findUnitOnBoard(board: GameState['board'], unitId: string): string | undefined {
  for (const [k, v] of Object.entries(board)) if (v === unitId) return k;
  return undefined;
}

function initialShop(level: number, slots: number = 5): ShopItem[] {
  const pool = rollTemplatesByLevel(level, slots);
  return pool.map((k) => {
    const t = UNIT_TEMPLATES[k];
    return { id: `shop-${Math.random().toString(36).slice(2, 8)}`, templateKey: k, name: t.name, cost: t.cost };
  });
}

function refreshShop(s: GameState): ShopItem[] {
  const slots = s.shopSlots ?? 5;
  const frozen = s.shopFrozen ?? {};
  const kept: ShopItem[] = s.shop.filter((it) => frozen[it.id]);
  const needed = Math.max(0, slots - kept.length);
  const fresh = initialShop(s.level, needed);
  // clear frozen flags for items not kept (ids changed on reroll)
  s.shopFrozen = Object.fromEntries(kept.map((k) => [k.id, true]));
  return [...kept, ...fresh];
}

function rollTemplatesByLevel(level: number, count: number): string[] {
  const commons = Object.keys(UNIT_TEMPLATES).filter((k) => UNIT_TEMPLATES[k].cost <= 2);
  const rares = Object.keys(UNIT_TEMPLATES).filter((k) => UNIT_TEMPLATES[k].cost === 3);
  const epics = Object.keys(UNIT_TEMPLATES).filter((k) => UNIT_TEMPLATES[k].cost === 4);
  const legendaries = Object.keys(UNIT_TEMPLATES).filter((k) => UNIT_TEMPLATES[k].cost >= 5);
  const odds = levelOdds(level);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const r = Math.random();
    if (r < odds.common && commons.length) out.push(commons[Math.floor(Math.random() * commons.length)]);
    else if (r < odds.common + odds.rare && rares.length) out.push(rares[Math.floor(Math.random() * rares.length)]);
    else if (r < odds.common + odds.rare + odds.epic && epics.length) out.push(epics[Math.floor(Math.random() * epics.length)]);
    else if (legendaries.length) out.push(legendaries[Math.floor(Math.random() * legendaries.length)]);
    else out.push(commons[Math.floor(Math.random() * commons.length)]);
  }
  return out;
}

function levelOdds(level: number): { common: number; rare: number; epic: number; legendary: number } {
  switch (true) {
    case level <= 3: return { common: 0.78, rare: 0.2, epic: 0.02, legendary: 0 };
    case level <= 5: return { common: 0.6, rare: 0.32, epic: 0.07, legendary: 0.01 };
    case level <= 7: return { common: 0.45, rare: 0.4, epic: 0.12, legendary: 0.03 };
    default: return { common: 0.3, rare: 0.45, epic: 0.18, legendary: 0.07 };
  }
}

function maxUnitsForLevel(level: number): number {
  // Simple rule: your level equals your max units on board (cap at 15)
  return Math.max(1, Math.min(15, level));
}

function countUnitsOnBoard(s: GameState, team: 'player' | 'enemy'): number {
  let n = 0;
  for (const id of Object.values(s.board)) {
    if (!id) continue;
    const u = s.units[id];
    if (u && u.team === team) n++;
  }
  return n;
}

function levelXpToNext(level: number): number {
  // simple curve
  return 4 + level * 2; // Lv3->4: 10, Lv4->5: 12, etc.
}

function levelGainXp(s: GameState, amount: number): void {
  s.xp += amount;
  let needed = levelXpToNext(s.level);
  while (s.xp >= needed) {
    s.xp -= needed;
    s.level += 1;
    s.log.push(`Level up! Reached Lv ${s.level}`);
    // toast UI signal
    if (!s.toasts) s.toasts = [];
    s.toasts.push({ id: `toast-${Math.random().toString(36).slice(2,8)}`, type: 'ok', text: `Level Up: Lv ${s.level}`, startedAt: performance.now(), durationMs: 3000 });
    // refresh shop on level up if not locked
    if (!s.shopLocked) s.shop = refreshShop(s);
    needed = levelXpToNext(s.level);
  }
}

function enemyLevelGainXp(s: GameState, amount: number): void {
  s.enemyXp += amount;
  let needed = levelXpToNext(s.enemyLevel);
  while (s.enemyXp >= needed) {
    s.enemyXp -= needed;
    s.enemyLevel += 1;
    s.log.push(`Enemy leveled to Lv ${s.enemyLevel}`);
    s.enemyShop = refreshEnemyShop(s);
    needed = levelXpToNext(s.enemyLevel);
  }
}

function refreshEnemyShop(s: GameState): ShopItem[] {
  const slots = s.enemyShopSlots ?? 5;
  const frozen = s.enemyShopFrozen ?? {};
  const kept: ShopItem[] = s.enemyShop.filter((it) => frozen[it.id]);
  const needed = Math.max(0, slots - kept.length);
  const fresh = initialShop(s.enemyLevel, needed);
  s.enemyShopFrozen = Object.fromEntries(kept.map((k) => [k.id, true]));
  return [...kept, ...fresh];
}


function enemyBuyPhaseWithAnalysis(s: GameState, analysis: PlayerAnalysis): void {
  const playerLevel = s.level;

  // Step 0: If behind on level and have spare gold, buy XP to catch up (simple rubber-band)
  while (s.enemyLevel < playerLevel && s.enemyGold >= 4) {
    s.enemyGold -= 4;
    enemyLevelGainXp(s, 4);
  }

  // Helper to count existing enemy units by template and traits
  const enemyUnits = Object.values(s.units).filter((u) => u.team === 'enemy');
  const countByTemplate: Record<string, number> = {};
  const countByTrait: Record<string, number> = {};
  for (const u of enemyUnits) {
    countByTemplate[u.templateKey] = (countByTemplate[u.templateKey] ?? 0) + 1;
    for (const t of getUnitTraits(u.templateKey)) countByTrait[t] = (countByTrait[t] ?? 0) + 1;
  }

  // Desired spend loop: try to spend most gold on good counters and finishing pairs
  let rerolls = 0;
  // scale rerolls by round to raise difficulty
  const maxRerolls = Math.min(8, 2 + Math.floor(s.round / 2));
  const purchasedIds = new Set<string>();

  const tryBuyFromShop = () => {
    let boughtSomething = false;
    // score items: counter score + pair/triple bonuses
    const scored = s.enemyShop.map((it) => {
      let score = scoreTemplateAgainst(it.templateKey, analysis);
      const have = countByTemplate[it.templateKey] ?? 0;
      if (have >= 2) score -= 3; // complete triple strongly preferred
      else if (have === 1) score -= 1; // make a pair
      // Synergy pressure: push to 2/4/6 thresholds on owned traits
      const traits = getUnitTraits(it.templateKey);
      for (const t of traits) {
        const n = countByTrait[t] ?? 0;
        if (n === 1) score -= 1.5; // hit 2 quickly
        else if (n === 3) score -= 1.2; // approach 4
        else if (n === 5) score -= 1.0; // approach 6
        else if (n > 0) score -= 0.25; // mild bias to deepen sets
      }
      // prefer cheaper units slightly when low on gold
      if (s.enemyGold < 6) score -= Math.max(0, 3 - it.cost) * 0.1;
      return { it, score };
    });
    scored.sort((a, b) => a.score - b.score);
    for (const { it } of scored) {
      if (s.enemyGold < it.cost) continue;
      s.enemyGold -= it.cost;
      const unit = createUnit(it.templateKey, 'enemy');
      s.units[unit.id] = unit;
      purchasedIds.add(it.id);
      countByTemplate[it.templateKey] = (countByTemplate[it.templateKey] ?? 0) + 1;
      boughtSomething = true;
      // try to chain multiple buys per roll
    }
    return boughtSomething;
  };

  // Keep buying/rerolling while we can afford to improve
  while (s.enemyGold >= 2 && (rerolls < maxRerolls)) {
    const bought = tryBuyFromShop();
    if (!bought) {
      if (s.enemyGold >= 2) {
        s.enemyGold -= 2;
        s.enemyShop = refreshEnemyShop(s);
        rerolls++;
      } else {
        break;
      }
    } else {
      // After purchases, remove bought from shop (ids change on refresh anyway)
      if (purchasedIds.size > 0) s.enemyShop = s.enemyShop.filter((x) => !purchasedIds.has(x.id));
      // attempt combines mid-loop to open space for further buys
      const enemyTemplates = Array.from(new Set(Object.keys(countByTemplate)));
      for (const t of enemyTemplates) tryCombine(s, t, 'enemy');
      // Opportunistically freeze top 1-2 desirable items we can't afford yet
      const unaffordable = s.enemyShop.filter((x) => x.cost > s.enemyGold);
      unaffordable.sort((a, b) => {
        // include synergy factor in freeze priority
        const sa = scoreTemplateAgainst(a.templateKey, analysis) + synergyScoreBias(a.templateKey, countByTrait);
        const sb = scoreTemplateAgainst(b.templateKey, analysis) + synergyScoreBias(b.templateKey, countByTrait);
        return sa - sb;
      });
      s.enemyShopFrozen = {};
      for (const itm of unaffordable.slice(0, 2)) s.enemyShopFrozen[itm.id] = true;
      // consider another pass without reroll if still gold and items remain
      if (s.enemyGold < 2) break;
      // if no more useful items (e.g., all too expensive), the next loop will reroll
    }
  }

  // Final cleanup: remove any purchased ids from shop (if not refreshed yet)
  if (purchasedIds.size > 0) s.enemyShop = s.enemyShop.filter((x) => !purchasedIds.has(x.id));

  // Final combine pass
  const enemyTemplates = Array.from(new Set(Object.keys(countByTemplate)));
  for (const t of enemyTemplates) tryCombine(s, t, 'enemy');
}

function synergyScoreBias(templateKey: string, countByTrait: Record<string, number>): number {
  let bias = 0;
  for (const t of getUnitTraits(templateKey)) {
    const n = countByTrait[t] ?? 0;
    if (n === 1) bias -= 1.2;
    else if (n === 3) bias -= 1.0;
    else if (n === 5) bias -= 0.8;
    else if (n > 0) bias -= 0.2;
  }
  return bias;
}

// Combat: place existing enemy roster each combat
function spawnEnemiesFromRoster(s: GameState): void {
  const analysis = analyzePlayerBoard(s);
  const roster = Object.values(s.units).filter((u) => u.team === 'enemy');
  // Enforce enemy unit cap based on enemy level
  const cap = maxUnitsForLevel(s.enemyLevel);
  const rosterSorted = [...roster].sort((a, b) => {
    const sa = a.star || 1;
    const sb = b.star || 1;
    if (sb !== sa) return sb - sa;
    const ca = UNIT_TEMPLATES[a.templateKey].cost;
    const cb = UNIT_TEMPLATES[b.templateKey].cost;
    if (cb !== ca) return cb - ca;
    const ha = UNIT_TEMPLATES[a.templateKey].stats.hp;
    const hb = UNIT_TEMPLATES[b.templateKey].stats.hp;
    return hb - ha;
  });
  const toDeploy = rosterSorted.slice(0, cap);
  const placements = planEnemyPlacement(toDeploy.map((u) => u.templateKey), analysis);
  // clear enemy from board first
  for (const [k, id] of Object.entries(s.board)) {
    if (!id) continue;
    const u = s.units[id];
    if (u && u.team === 'enemy') s.board[k] = undefined;
  }
  for (let i = 0; i < toDeploy.length && i < placements.length; i++) {
    s.board[keyOf(placements[i])] = toDeploy[i].id;
  }
  s.log.push(`Enemy deploys ${toDeploy.length} units`);
}

type PlayerAnalysis = {
  meleeCount: number;
  rangedCount: number;
  hotColumns: number[]; // columns sorted by density desc
  cleaveThreatColumns: number[]; // columns containing player cleave melee
  hasHealer: boolean;
};

function analyzePlayerBoard(s: GameState): PlayerAnalysis {
  const playerIds = new Set(
    Object.values(s.units)
      .filter((u) => u.team === 'player' && u.hp > 0)
      .map((u) => u.id)
  );
  const countsByCol: Record<number, number> = {};
  const cleaveCols = new Set<number>();
  let hasHealer = false;
  let meleeCount = 0;
  let rangedCount = 0;
  for (const [k, id] of Object.entries(s.board)) {
    if (!id || !playerIds.has(id)) continue;
    const [r, c] = k.split(',').map(Number);
    countsByCol[c] = (countsByCol[c] ?? 0) + 1;
    const u = s.units[id];
    const t = UNIT_TEMPLATES[u.templateKey];
    const stats = t.stats;
    if (stats.range >= 3) rangedCount++; else meleeCount++;
    if (t.ability?.type === 'cleave') cleaveCols.add(c);
    if (t.ability?.type === 'healPulse') hasHealer = true;
  }
  const hotColumns = Array.from({ length: BOARD_COLS }, (_, c) => c)
    .sort((a, b) => (countsByCol[b] ?? 0) - (countsByCol[a] ?? 0));
  return { meleeCount, rangedCount, hotColumns, cleaveThreatColumns: Array.from(cleaveCols), hasHealer };
}

function analyzePlayerBoardFromMap(s: GameState, placement: Record<string, string>): PlayerAnalysis {
  const countsByCol: Record<number, number> = {};
  const cleaveCols = new Set<number>();
  let hasHealer = false;
  let meleeCount = 0;
  let rangedCount = 0;
  for (const [unitId, cellKey] of Object.entries(placement)) {
    const u = s.units[unitId];
    if (!u || u.team !== 'player') continue;
    const [r, c] = cellKey.split(',').map(Number);
    countsByCol[c] = (countsByCol[c] ?? 0) + 1;
    const t = UNIT_TEMPLATES[u.templateKey];
    const stats = t.stats;
    if (stats.range >= 3) rangedCount++; else meleeCount++;
    if (t.ability?.type === 'cleave') cleaveCols.add(c);
    if (t.ability?.type === 'healPulse') hasHealer = true;
  }
  const hotColumns = Array.from({ length: BOARD_COLS }, (_, c) => c)
    .sort((a, b) => (countsByCol[b] ?? 0) - (countsByCol[a] ?? 0));
  return { meleeCount, rangedCount, hotColumns, cleaveThreatColumns: Array.from(cleaveCols), hasHealer };
}

function scoreTemplateAgainst(tKey: string, analysis: PlayerAnalysis): number {
  const t = UNIT_TEMPLATES[tKey];
  const r = t.stats.range;
  let score = 0;
  // Prefer ranged vs melee-heavy and melee/assassins vs ranged-heavy
  if (analysis.meleeCount >= analysis.rangedCount) score += r >= 3 ? -2 : r === 2 ? -1 : 1;
  else score += r <= 1 ? -2 : r === 2 ? -1 : 1;
  // Prefer CC vs melee-heavy
  if (analysis.meleeCount > analysis.rangedCount && (t.ability?.type === 'stunOnHit' || t.ability?.type === 'slowOnHit')) score -= 1.5;
  // Prefer healers if player has cleave or longer fights
  if (analysis.cleaveThreatColumns.length > 0 && t.ability?.type === 'healPulse') score -= 1.5;
  // Prefer multishot/pierce vs clustered columns (hotColumns density)
  if (t.ability?.type === 'multishot' || t.ability?.type === 'pierce') score -= 0.8;
  // Prefer sturdy frontliners when player is ranged-heavy
  if (analysis.rangedCount > analysis.meleeCount && r <= 1 && t.stats.hp >= 140) score -= 1.2;
  return score;
}

function playerPowerEstimate(s: GameState): number {
  // estimate based on cost * star for player units on board and bench
  const playerUnits = Object.values(s.units).filter((u) => u.team === 'player');
  let value = 0;
  for (const u of playerUnits) {
    const cost = UNIT_TEMPLATES[u.templateKey].cost;
    value += cost * (u.star || 1);
  }
  return value;
}

function generateEnemyRoster(s: GameState, analysis: PlayerAnalysis): string[] {
  const round = s.round;
  const keys = Object.keys(UNIT_TEMPLATES);
  // Budget scales with round and with player's current power and gold
  const playerValue = playerPowerEstimate(s);
  let budget = Math.min(60, Math.max(10, Math.floor(5 + round * 2 + playerValue * 0.9 + s.gold * 0.5)));
  const roster: string[] = [];
  // Pools
  const melee = keys.filter((k) => UNIT_TEMPLATES[k].stats.range <= 1);
  const ranged = keys.filter((k) => UNIT_TEMPLATES[k].stats.range >= 3);
  const mids = keys.filter((k) => UNIT_TEMPLATES[k].stats.range === 2);
  function tryAdd(pool: string[]): boolean {
    if (pool.length === 0) return false;
    const k = pool[Math.floor(Math.random() * pool.length)];
    const cost = UNIT_TEMPLATES[k].cost;
    if (cost > budget) return false;
    roster.push(k);
    budget -= cost;
    return true;
  }
  // seed based on player's comp
  if (analysis.meleeCount >= analysis.rangedCount) {
    // player is melee-heavy → seed more ranged + a tank
    tryAdd(ranged);
    tryAdd(ranged);
    tryAdd(melee);
  } else {
    // player is ranged-heavy → seed divers + melee
    tryAdd(melee);
    tryAdd(melee);
    tryAdd(mids);
  }
  // chance to force a triple for early 2★ as round increases
  if (round >= 3 && budget > 0) {
    const pool = analysis.meleeCount > analysis.rangedCount ? ranged : melee;
    const k = pool[Math.floor(Math.random() * pool.length)];
    const cost = UNIT_TEMPLATES[k].cost;
    if (budget >= cost * 3) {
      roster.push(k, k, k);
      budget -= cost * 3;
    }
  }
  // fill remaining budget
  let attempts = 0;
  while (budget > 0 && attempts < 50) {
    attempts++;
    // bias choice according to player comp
    const biasPool = analysis.meleeCount > analysis.rangedCount ? ranged.concat(mids) : melee.concat(mids);
    const pickPool = Math.random() < 0.7 ? biasPool : keys;
    const k = pickPool[Math.floor(Math.random() * pickPool.length)];
    const cost = UNIT_TEMPLATES[k].cost;
    if (cost <= budget) {
      roster.push(k);
      budget -= cost;
    } else if (attempts > 10) {
      // try cheaper options
      const cheaper = pickPool.filter((t) => UNIT_TEMPLATES[t].cost <= budget);
      if (cheaper.length === 0) break;
      const kk = cheaper[Math.floor(Math.random() * cheaper.length)];
      roster.push(kk);
      budget -= UNIT_TEMPLATES[kk].cost;
    }
  }
  return roster;
}

function planEnemyPlacement(roster: string[], analysis: PlayerAnalysis): BoardPos[] {
  // Smarter formation: focus hot columns, avoid LOS blocking, protect ranged, spread vs cleave
  const positions: BoardPos[] = [];
  let tankIdx = 0;
  let rangedIdx = 0;
  let midIdx = 0;
  let ccIdx = 0;
  const hot = analysis.hotColumns;
  const flanks = [...hot].reverse();
  const centerCol = hot[Math.floor(hot.length / 2)] ?? 0;
  const isCC = (k: string) => {
    const a = UNIT_TEMPLATES[k].ability?.type;
    return a === 'stunOnHit' || a === 'slowOnHit';
  };
  const isHealer = (k: string) => UNIT_TEMPLATES[k].ability?.type === 'healPulse';
  const isTank = (k: string) => UNIT_TEMPLATES[k].stats.range <= 1 && UNIT_TEMPLATES[k].stats.hp >= 140;
  const isRanged = (k: string) => UNIT_TEMPLATES[k].stats.range >= 3;

  for (const k of roster) {
    const stats = UNIT_TEMPLATES[k].stats;
    if (isHealer(k)) {
      positions.push({ r: 1, c: centerCol }); // central auras
    } else if (isTank(k)) {
      positions.push({ r: 2 + (tankIdx % 1), c: hot[tankIdx % hot.length] });
      tankIdx++;
    } else if (isCC(k)) {
      positions.push({ r: 1, c: flanks[ccIdx % flanks.length] });
      ccIdx++;
    } else if (stats.range === 2) {
      // midliners: stagger to avoid cleave columns
      const col = hot[midIdx % hot.length];
      positions.push({ r: 2, c: (col + (midIdx % 2 === 0 ? 1 : BOARD_COLS - 1)) % BOARD_COLS });
      midIdx++;
    } else if (stats.range >= 3) {
      // ranged: try to avoid friendly blocking—offset from tanks
      const col = hot[rangedIdx % hot.length];
      positions.push({ r: 0, c: (col + (rangedIdx % 2 === 0 ? 1 : BOARD_COLS - 2)) % BOARD_COLS });
      rangedIdx++;
    } else {
      // generic melee
      positions.push({ r: 2, c: hot[tankIdx % hot.length] });
      tankIdx++;
    }
  }

  // Ensure uniqueness of cells by pushing later ones to next free column on same row
  const used = new Set<string>();
  return positions.map((p) => {
    let { r, c } = p;
    let tries = 0;
    while (used.has(`${r},${c}`) && tries < BOARD_COLS) {
      c = (c + 1) % BOARD_COLS;
      tries++;
    }
    used.add(`${r},${c}`);
    return { r, c };
  });
}

function runCombatLoop(set: (fn: any) => void, get: () => GameState & GameActions): void {
  const baseTickMs = 100;
  let running = true;
  const start = performance.now();

  const step = () => {
    if (!running) return;
    const now = performance.now();
    set(
      produce((s: GameState) => {
        if (s.phase !== 'combat') {
          running = false;
          return;
        }
        if (s.paused) {
          return;
        }
        // update screen shake countdown
        const spd = Math.max(0.2, Math.min(4, s.combatSpeed || 1));
        const dt = Math.max(10, Math.floor(baseTickMs / spd));
        if ((s.shakeMs || 0) > 0) {
          s.shakeMs = Math.max(0, (s.shakeMs || 0) - dt);
          s.shakeKey = s.shakeMs > 0 ? `sk-${Math.random().toString(36).slice(2, 6)}` : undefined;
        }
        simulateTick(s, now, Math.max(10, Math.floor(baseTickMs / spd)));
        const outcome = checkOutcome(s);
        if (outcome) {
          // drop to gameover if health <= 0
          if (s.health <= 0) {
            s.phase = 'gameover';
            // record run
            recordRun(s);
          } else {
            s.phase = 'result';
          }
          s.lastOutcome = outcome.result;
          if (outcome.result === 'win') {
            s.winStreak = (s.winStreak ?? 0) + 1;
            s.loseStreak = 0;
          } else if (outcome.result === 'loss') {
            s.loseStreak = (s.loseStreak ?? 0) + 1;
            s.winStreak = 0;
          }
          s.log.push(outcome.message);
          s.effects = [];
          running = false;
        }
      })
    );

    const spd = Math.max(0.2, Math.min(4, get().combatSpeed || 1));
    const nextTick = Math.max(10, Math.floor(baseTickMs / spd));
    if (running) setTimeout(step, nextTick);
  };

  const spd0 = Math.max(0.2, Math.min(4, get().combatSpeed || 1));
  setTimeout(step, Math.max(10, Math.floor(baseTickMs / spd0)));
}

function recordRun(s: GameState): void {
  try {
    const durationMs = Math.max(0, performance.now() - (s.runStartTs || performance.now()));
    const compMap = new Map<string, number>();
    for (const u of Object.values(s.units)) {
      if (u.team !== 'player') continue;
      const key = `${u.templateKey}-${u.star}`;
      compMap.set(key, (compMap.get(key) ?? 0) + 1);
    }
    const comp = Array.from(compMap.entries()).map(([k, count]) => {
      const [templateKey, starStr] = k.split('-');
      return { templateKey, star: Number(starStr) } as any;
    });
    const rec: RunRecord = {
      id: `run-${Math.random().toString(36).slice(2, 10)}`,
      when: Date.now(),
      rounds: s.round,
      durationMs,
      level: s.level,
      hp: s.health,
      comp,
    };
    const prev = JSON.parse(localStorage.getItem('leaderboard') || '[]');
    prev.push(rec);
    // keep last 50
    while (prev.length > 50) prev.shift();
    localStorage.setItem('leaderboard', JSON.stringify(prev));
  } catch {}
}

function simulateTick(state: GameState, now: number, tickMs: number): void {
  const positions = Object.entries(state.board).filter(([_, id]) => Boolean(id)) as Array<[
    string,
    string
  ]>;

  // Sort by team then random to provide fair ordering
  positions.sort(() => Math.random() - 0.5);

  const playerTiers = computeSynergyTiers(state, 'player');
  const enemyTiers = computeSynergyTiers(state, 'enemy');

  for (const [cellKey, unitId] of positions) {
    const unit = state.units[unitId];
    if (!unit) continue;
    if (unit.hp <= 0) continue;
    const [rStr, cStr] = cellKey.split(',');
    let r = Number(rStr);
    let c = Number(cStr);

    if (unit.status?.bleedUntil && unit.status.bleedUntil > now && unit.status.bleedDps) {
      const bleedDmg = (unit.status.bleedDps * tickMs) / 1000;
      applyDamage(unit, bleedDmg);
    }

    const enemyIds = Object.values(state.units)
      .filter((u) => u.team !== unit.team && u.hp > 0)
      .map((u) => u.id);
    if (enemyIds.length === 0) return;

    // find closest enemy by Manhattan distance on board
    let targetId: string | null = null;
    let bestDist = Number.MAX_SAFE_INTEGER;
    for (const [k, id] of Object.entries(state.board)) {
      if (!id || !enemyIds.includes(id)) continue;
      const [er, ec] = k.split(',').map(Number);
      const dist = Math.abs(er - r) + Math.abs(ec - c);
      if (dist < bestDist) {
        bestDist = dist;
        targetId = id;
      }
    }
    if (!targetId) continue;

    const template = UNIT_TEMPLATES[unit.templateKey];
    const starMult = unit.star ?? 1;
    const baseStats = template.stats;
    const stats = baseStats; // keep name, but we will use starMult-scaled timings/damage below
    // pick star-leveled ability if defined
    const ability = (template.abilityLevels && template.abilityLevels[starMult]) || template.ability;
    const speedMul = Math.max(0.2, Math.min(4, (state.combatSpeed || 1)));
    let scaledAtkCd = Math.max(120, Math.floor((stats.atkIntervalMs / starMult) / speedMul));
    let atkBonus = 0;
    let moveCd = Math.max(80, Math.floor((stats.moveIntervalMs / starMult) / speedMul));
    const tiers = unit.team === 'player' ? playerTiers : enemyTiers;
    if (tiers.Ranger) scaledAtkCd = Math.floor(scaledAtkCd * (1 - [0, 0.08, 0.14, 0.2][tiers.Ranger]));
    if (tiers.Skirmisher) moveCd = Math.floor(moveCd * (1 - [0, 0.08, 0.14, 0.2][tiers.Skirmisher]));
    if (tiers.Vanguard) atkBonus += [0, 1, 3, 5][tiers.Vanguard];
    if (unit.coverAtkBonus) atkBonus += unit.coverAtkBonus;

    // special: heal pulse support ability
    if (ability?.type === 'healPulse') {
      if (now - (unit.specialLastAt || 0) >= ability.cooldownMs) {
        unit.specialLastAt = now;
        const radiusCells = 2;
        // ring effect centered on caster
        state.effects.push({
          id: `fx-${Math.random().toString(36).slice(2, 8)}`,
          type: 'ring',
          at: { r, c },
          color: '#22c55e',
          startedAt: now,
          durationMs: 600,
          maxRadiusCells: radiusCells,
          tier: starMult,
          rings: 4 + (starMult - 1),
          glow: 0.45,
        });
        // heal allies in radius (including self)
        for (const [k, id] of Object.entries(state.board)) {
          if (!id) continue;
          const ally = state.units[id];
          if (!ally || ally.team !== unit.team) continue;
          const [rr, cc] = k.split(',').map(Number);
          const dist = Math.abs(rr - r) + Math.abs(cc - c);
          if (dist <= radiusCells) {
            const baseHp = UNIT_TEMPLATES[ally.templateKey].stats.hp;
            const maxHp = baseHp * (ally.star || 1);
            const healMult = (tiers.Support ? 1 + [0, 0.15, 0.25, 0.4][tiers.Support] : 1) * (tiers.Caster ? 1 + [0, 0.05, 0.1, 0.15][tiers.Caster] : 1);
            const heal = Math.floor(ability.amount * (unit.star || 1) * healMult);
            const before = ally.hp;
            ally.hp = Math.min(maxHp, ally.hp + heal);
            state.effects.push({ id: `fx-${Math.random().toString(36).slice(2, 8)}`, type: 'text' as any, at: { r: rr, c: cc }, value: `+${ally.hp - before}`, color: '#22c55e', startedAt: now, durationMs: 700, sizeScale: 0.9 } as any);
            state.effects.push({
              id: `fx-${Math.random().toString(36).slice(2, 8)}`,
              type: 'hit',
              at: { r: rr, c: cc },
              color: '#22c55e',
              shape: 'burst',
              startedAt: now,
              durationMs: 360,
              tier: starMult,
              particles: 12,
              glow: 0.5,
            });
          }
        }
        // unique special overlays per healer with per-template colors
        const visHealer = getUnitVisual(unit.templateKey);
        const specColor = visHealer.accent;
        const specColor2 = visHealer.primary;
        state.effects.push({ id: `fx-${Math.random().toString(36).slice(2, 8)}`, type: 'special' as any, at: { r, c }, shape: unit.templateKey === 'paladin' ? 'crest' : unit.templateKey === 'monk' ? 'rune' : 'leaf', color: specColor, color2: specColor2, startedAt: now, durationMs: 600, sizeScale: 1.1, glow: 0.35, rotate: unit.templateKey === 'monk' } as any);
        state.log.push(`${unit.templateKey} casts heal`);

        // Guardian + Cleric → Bulwark Blessing: cleric grants shields to allies in radius
        if (unit.templateKey === 'cleric' && teamHasTemplates(state, unit.team, ['guardian','cleric'])) {
          for (const [k, id] of Object.entries(state.board)) {
            if (!id) continue;
            const ally = state.units[id];
            if (!ally || ally.team !== unit.team) continue;
            const [rr, cc] = k.split(',').map(Number);
            const dist = Math.abs(rr - r) + Math.abs(cc - c);
            if (dist <= radiusCells) {
              const addShield = 16 * (unit.star || 1);
              ally.shieldHp = (ally.shieldHp || 0) + addShield;
              state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'ring' as any, at: { r: rr, c: cc }, color: '#60a5fa', startedAt: now, durationMs: 260, maxRadiusCells: 0.8, rings: 2, glow: 0.3 } as any);
            }
          }
          state.log.push('Bulwark Blessing: allies gain shields');
        }

        // Druid + Monk → Purifying Grove: cleanse and minor heal in radius
        if ((unit.templateKey === 'druid' || unit.templateKey === 'monk') && teamHasTemplates(state, unit.team, ['druid','monk'])) {
          for (const [k, id] of Object.entries(state.board)) {
            if (!id) continue;
            const ally = state.units[id];
            if (!ally || ally.team !== unit.team) continue;
            const [rr, cc] = k.split(',').map(Number);
            const dist = Math.abs(rr - r) + Math.abs(cc - c);
            if (dist <= radiusCells) {
              if (ally.status) {
                ally.status.slowUntil = 0;
                ally.status.stunnedUntil = 0;
              }
              const baseHp = UNIT_TEMPLATES[ally.templateKey].stats.hp;
              const maxHp = baseHp * (ally.star || 1);
              const extra = 6 * (unit.star || 1);
              ally.hp = Math.min(maxHp, ally.hp + extra);
              state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'special' as any, at: { r: rr, c: cc }, shape: 'leaf', color: '#86efac', color2: '#bbf7d0', startedAt: now, durationMs: 360, sizeScale: 0.9, glow: 0.25 } as any);
            }
          }
          state.log.push('Purifying Grove: allies cleansed');
        }

        // Guardian + Paladin → Aegis: grant brief damage reduction to allies in radius
        if ((unit.templateKey === 'paladin' || unit.templateKey === 'guardian') && teamHasTemplates(state, unit.team, ['guardian','paladin'])) {
          for (const [k, id] of Object.entries(state.board)) {
            if (!id) continue;
            const ally = state.units[id];
            if (!ally || ally.team !== unit.team) continue;
            const [rr, cc] = k.split(',').map(Number);
            const dist = Math.abs(rr - r) + Math.abs(cc - c);
            if (dist <= radiusCells) {
              ally.damageReductionPct = Math.min(0.2, (ally.damageReductionPct || 0) + 0.1);
              state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'ring' as any, at: { r: rr, c: cc }, color: '#60a5fa', startedAt: now, durationMs: 280, maxRadiusCells: 0.8, rings: 3, glow: 0.5, power: 'synergy' } as any);
            }
          }
        }

        // Paladin + Templar → Holy Radiance: small smite ring centered on paladin when heal pulses
        if (unit.templateKey === 'paladin' && teamHasTemplates(state, unit.team, ['paladin','templar'])) {
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'ring' as any, at: { r, c }, color: '#fcd34d', startedAt: now, durationMs: 260, maxRadiusCells: 0.8, rings: 4, glow: 0.5, power: 'synergy' } as any);
        }

        // Alchemist + Cleric → Elixir: heal pulse also grants small shield to allies in radius
        if (unit.templateKey === 'alchemist' && teamHasTemplates(state, unit.team, ['alchemist','cleric'])) {
          for (const [k, id] of Object.entries(state.board)) {
            if (!id) continue;
            const ally = state.units[id];
            if (!ally || ally.team !== unit.team) continue;
            const [rr, cc] = k.split(',').map(Number);
            const dist = Math.abs(rr - r) + Math.abs(cc - c);
            if (dist <= radiusCells) {
              ally.shieldHp = (ally.shieldHp || 0) + 10 * (unit.star || 1);
              state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'ring' as any, at: { r: rr, c: cc }, color: '#86efac', startedAt: now, durationMs: 240, maxRadiusCells: 0.6, rings: 3, glow: 0.45, power: 'synergy' } as any);
            }
          }
        }

        // Druid + Paladin → Blessed Grove: extra small heal and ring on allies in radius
        if (unit.templateKey === 'paladin' && teamHasTemplates(state, unit.team, ['druid','paladin'])) {
          for (const [k, id] of Object.entries(state.board)) {
            if (!id) continue;
            const ally = state.units[id];
            if (!ally || ally.team !== unit.team) continue;
            const [rr, cc] = k.split(',').map(Number);
            const dist = Math.abs(rr - r) + Math.abs(cc - c);
            if (dist <= radiusCells) {
              const baseHp = UNIT_TEMPLATES[ally.templateKey].stats.hp * (ally.star || 1);
              const extra = 5 * (unit.star || 1);
              ally.hp = Math.min(baseHp, ally.hp + extra);
              state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'ring' as any, at: { r: rr, c: cc }, color: '#86efac', startedAt: now, durationMs: 220, maxRadiusCells: 0.6, rings: 3, glow: 0.4, power: 'synergy' } as any);
            }
          }
        }

        // Trio: Druid + Monk + Paladin → Sanctuary: larger pulse heal and radiant-green overlay
        if (teamHasAll(state, unit.team, ['druid','monk','paladin']) && unit.templateKey === 'paladin') {
          for (const [k, id] of Object.entries(state.board)) {
            if (!id) continue;
            const ally = state.units[id];
            if (!ally || ally.team !== unit.team) continue;
            const [rr, cc] = k.split(',').map(Number);
            const dist = Math.abs(rr - r) + Math.abs(cc - c);
            if (dist <= radiusCells) {
              const baseHp = UNIT_TEMPLATES[ally.templateKey].stats.hp * (ally.star || 1);
              const extra = 8 * (unit.star || 1);
              ally.hp = Math.min(baseHp, ally.hp + extra);
              state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'special' as any, at: { r: rr, c: cc }, shape: 'leaf', color: '#86efac', color2: '#fde68a', startedAt: now, durationMs: 320, sizeScale: 1.1, glow: 0.6, power: 'synergy' } as any);
            }
          }
        }

        // Trio: Cleric + Monk + Medic → Hymn of Life: small extra heal-over-time on pulse
        if (teamHasAll(state, unit.team, ['cleric','monk','medic']) && unit.templateKey === 'cleric') {
          for (const [k, id] of Object.entries(state.board)) {
            if (!id) continue;
            const ally = state.units[id];
            if (!ally || ally.team !== unit.team) continue;
            const [rr, cc] = k.split(',').map(Number);
            const dist = Math.abs(rr - r) + Math.abs(cc - c);
            if (dist <= radiusCells) {
              const baseHp = UNIT_TEMPLATES[ally.templateKey].stats.hp * (ally.star || 1);
              const extra = 4 * (unit.star || 1);
              const before = ally.hp;
              ally.hp = Math.min(baseHp, ally.hp + extra);
              if (ally.hp > before) {
                state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'text' as any, at: { r: rr, c: cc }, value: `+${ally.hp - before}`, color: '#22c55e', startedAt: now, durationMs: 600, sizeScale: 0.9, power: 'synergy' } as any);
                state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'special' as any, at: { r: rr, c: cc }, shape: 'leaf', color: '#86efac', color2: '#22c55e', startedAt: now, durationMs: 260, sizeScale: 0.9, glow: 0.45, power: 'synergy' } as any);
              }
            }
          }
        }
      }
    }
    // attack if in range and cooldown ready
    // skip actions if stunned
    if (unit.status?.stunnedUntil && unit.status.stunnedUntil > now) continue;
    if (bestDist <= stats.range && now - unit.lastAttackAt >= scaledAtkCd) {
      unit.lastAttackAt = now;
      const target = state.units[targetId];
      // spawn a projectile or instant hit effect depending on range
      const [tr, tc] = Object.entries(state.board).find(([_, id]) => id === targetId)![0]
        .split(',')
        .map(Number);
      if (stats.range > 1) {
        // choose projectile visuals per unit template
        const k = UNIT_TEMPLATES[unit.templateKey].key;
        let shape: any = 'orb';
        let color = '#7cf';
        let color2: string | undefined;
        const extraProjectiles: GameState['effects'] = [];
        if (k === 'archer' || k === 'hunter' || k === 'sniper' || k === 'marksman' || k === 'crossbow' || k === 'icearcher' || k === 'slinger' || k === 'sentry' || k === 'beastmaster' || k === 'ballista' || k === 'javelin' || k === 'spear' ) {
          // individualized projectile shapes/colors per template
          const vis = getUnitVisual(unit.templateKey);
          switch (k) {
            case 'crossbow':
              shape = 'bullet'; color = vis.accent; color2 = vis.primary; break;
            case 'marksman':
              shape = 'bullet'; color = vis.accent; color2 = '#ffffff'; break;
            case 'sniper':
              shape = 'saber'; color = vis.accent; color2 = '#ffffff'; break;
            case 'icearcher':
              shape = 'arrow'; color = '#60a5fa'; color2 = '#e0f2fe'; break;
            case 'archer':
              shape = 'arrow'; color = vis.accent; color2 = vis.primary; break;
            case 'hunter':
              shape = 'feather'; color = vis.accent; color2 = vis.primary; break;
            case 'slinger':
              shape = 'bomb'; color = vis.accent; color2 = vis.primary; break;
            case 'sentry':
              shape = 'chakram'; color = vis.accent; color2 = vis.primary; break;
            case 'beastmaster':
              shape = 'chakram'; color = vis.accent; color2 = '#86efac'; break;
            case 'ballista':
              shape = 'shard'; color = vis.accent; color2 = vis.primary; break;
            case 'javelin':
            case 'spear':
              shape = 'spear'; color = '#67e8f9'; color2 = '#0ea5e9'; break;
            default:
              shape = 'orb'; color = vis.accent; color2 = vis.primary; break;
          }
          if (starMult === 3) {
            // Twin shot visual
            extraProjectiles.push({
              id: `fx-${Math.random().toString(36).slice(2, 8)}`,
              type: 'projectile',
              from: { r, c },
              to: { r: tr, c: tc },
              color: color,
              color2: '#ffffff',
              shape: shape,
              startedAt: now,
              durationMs: 260,
              tier: starMult,
              trail: true,
              sizeScale: 0.9,
              glow: 0.35,
            });
            if (k === 'sniper' || k === 'marksman') {
              // add thin tracer
              extraProjectiles.push({
                id: `fx-${Math.random().toString(36).slice(2, 8)}`,
                type: 'projectile',
                from: { r, c },
                to: { r: tr, c: tc },
                color: '#ffffff',
                color2: '#ffffff',
                shape: 'bullet',
                startedAt: now,
                durationMs: 220,
                tier: starMult,
                trail: true,
                sizeScale: 0.6,
                glow: 0.25,
              });
            }
          }
        } else if (k === 'mage' || k === 'sorcerer' || k === 'warlock' || k === 'frost' || k === 'mystic' || k === 'witch' || k === 'stormcaller' || k === 'cleric' || k === 'monk' || k === 'druid' || k === 'paladin') {
          const vis = getUnitVisual(unit.templateKey);
          shape = (k === 'stormcaller') ? 'bolt' : (k === 'witch' ? 'chakram' : 'orb');
          color = k === 'frost' ? '#93c5fd' : vis.accent;
          color2 = vis.primary;
          if (starMult === 3 && (k === 'sorcerer' || k === 'mage')) {
            // upgrade to beam visual for 3★ casters
            shape = 'beam'; color2 = '#ffffff';
          }
        } else if (k === 'pikeman' || k === 'templar') {
          shape = 'spear'; color = '#67e8f9'; color2 = '#0ea5e9';
        } else if (k === 'ballista') {
          shape = 'shard';
          color = '#a3e4d7';
          color2 = '#d6fff4';
        }
        // pre-hit AOE telegraph at target
        state.effects.push({
          id: `fx-${Math.random().toString(36).slice(2, 8)}`,
          type: 'ring',
          at: { r: tr, c: tc },
          color: (getUnitVisual(unit.templateKey)).accent,
          startedAt: now,
          durationMs: Math.floor(300 * (starMult === 3 ? 0.75 : starMult === 2 ? 0.88 : 1)),
          maxRadiusCells: 0.7,
          tier: starMult,
          rings: 3,
          glow: 0.12,
        });
        state.effects.push({
          id: `fx-${Math.random().toString(36).slice(2, 8)}`,
          type: 'projectile',
          from: { r, c },
          to: { r: tr, c: tc },
          color,
          color2,
          shape,
          startedAt: now,
          durationMs: Math.floor(300 * (starMult === 3 ? 0.75 : starMult === 2 ? 0.88 : 1)),
          tier: starMult,
          trail: true,
          sizeScale: 1 + (starMult - 1) * 0.28,
          glow: starMult >= 3 ? 0.7 : starMult === 2 ? 0.4 : 0.2,
        });
        // unique ranged special overlays
        const specAt = { r, c };
        const visR = getUnitVisual(unit.templateKey);
        const c1 = visR.accent;
        const c2 = visR.primary;
        if (k === 'sniper' || k === 'marksman') {
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2, 8)}`, type: 'special', at: specAt, shape: 'reticle', color: c1, color2: c2, startedAt: now, durationMs: 320, sizeScale: 0.9, glow: 0.2 } as any);
        } else if (k === 'icearcher' || k === 'frost') {
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2, 8)}`, type: 'special', at: specAt, shape: 'snow', color: c1, color2: c2, startedAt: now, durationMs: 360, sizeScale: 1, glow: 0.25, rotate: true } as any);
        } else if (k === 'sorcerer' || k === 'warlock' || k === 'mage' || k === 'mystic' || k === 'witch' || k === 'stormcaller') {
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2, 8)}`, type: 'special', at: specAt, shape: k === 'stormcaller' ? 'lightning' : 'rune', color: c1, color2: c2, startedAt: now, durationMs: 380, sizeScale: 1.1, glow: 0.35, rotate: k !== 'stormcaller' } as any);
        } else {
          // default ranged overlay for any other shooter (archer, hunter, crossbow, slinger, sentry, beastmaster, ballista)
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2, 8)}`, type: 'special', at: specAt, shape: 'reticle', color: c1, color2: c2, startedAt: now, durationMs: 260, sizeScale: 0.85, glow: 0.18 } as any);
        }
          // push extra visuals (no extra damage) for 2★/3★ forms
          for (const fx of extraProjectiles) state.effects.push(fx as any);
          if (starMult >= 2) {
            const vis = getUnitVisual(unit.templateKey);
            state.effects.push({ id: `fx-${Math.random().toString(36).slice(2, 8)}`, type: 'special' as any, at: { r, c }, shape: 'reticle', color: vis.accent, color2: vis.primary, startedAt: now, durationMs: 260, sizeScale: 0.8 + (starMult - 1) * 0.2, glow: 0.2 + (starMult - 1) * 0.15 } as any);
          }
      } else {
        // melee impact visuals per template
        const k = UNIT_TEMPLATES[unit.templateKey].key;
        let shape: any = 'slash';
        let color = '#fc7';
        let color2: string | undefined;
        const visMelee = getUnitVisual(unit.templateKey);
        if (k === 'warrior' || k === 'knight' || k === 'guardian' || k === 'gladiator' || k === 'valkyrie' || k === 'champion' || k === 'berserker') {
          shape = 'slash'; color = visMelee.accent; color2 = visMelee.primary;
        } else if (k === 'rogue' || k === 'assassin' || k === 'duelist') {
          shape = 'rip'; color = visMelee.accent; color2 = visMelee.primary;
        } else if (k === 'paladin' || k === 'templar' || k === 'monk' || k === 'druid' || k === 'cleric') {
          shape = 'smite'; color = visMelee.accent; color2 = visMelee.primary;
        } else if (k === 'spear' || k === 'pikeman' || k === 'phalanx' || k === 'javelin') {
          shape = 'thrust'; color = '#67e8f9'; color2 = '#0ea5e9';
        } else {
          shape = 'impact'; color = visMelee.accent; color2 = visMelee.primary;
        }
        // quick melee telegraph
        state.effects.push({
          id: `fx-${Math.random().toString(36).slice(2, 8)}`,
          type: 'ring',
          at: { r: tr, c: tc },
          color: getUnitVisual(unit.templateKey).accent,
          startedAt: now,
          durationMs: 160,
          maxRadiusCells: 0.55,
          tier: starMult,
          rings: 2,
          glow: 0.1,
        });
        state.effects.push({
          id: `fx-${Math.random().toString(36).slice(2, 8)}`,
          type: 'hit',
          at: { r: tr, c: tc },
          color,
          color2,
          shape,
          startedAt: now,
          durationMs: Math.floor(200 * (starMult === 3 ? 0.85 : starMult === 2 ? 0.92 : 1)),
          tier: starMult,
          sizeScale: 1 + (starMult - 1) * 0.3,
          glow: starMult >= 3 ? 0.6 : starMult === 2 ? 0.35 : 0.15,
          particles: 10 + (starMult - 1) * 6,
        });

        // Valkyrie + Templar → Wings: smite ring around target on valkyrie hit
        if (unit.templateKey === 'valkyrie' && teamHasTemplates(state, unit.team, ['valkyrie','templar'])) {
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'hit' as any, at: { r: tr, c: tc }, color: '#fde68a', shape: 'smite', startedAt: now, durationMs: 240, glow: 0.7, power: 'synergy' } as any);
        }

        // Knight + Guardian → Wall: grant shield to ally behind the attacker in same column
        if ((unit.templateKey === 'knight' || unit.templateKey === 'guardian') && teamHasTemplates(state, unit.team, ['knight','guardian'])) {
          const br = unit.team === 'player' ? r + 1 : r - 1;
          const bc = c;
          if (br >= 0 && br < BOARD_ROWS && bc >= 0 && bc < BOARD_COLS) {
            const idB = state.board[`${br},${bc}`];
            if (idB) {
              const allyB = state.units[idB];
              if (allyB && allyB.team === unit.team) {
                allyB.shieldHp = (allyB.shieldHp || 0) + 14 * (unit.star || 1);
                state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'ring' as any, at: { r: br, c: bc }, color: '#60a5fa', startedAt: now, durationMs: 240, maxRadiusCells: 0.6, rings: 3, glow: 0.5, power: 'synergy' } as any);
              }
            }
          }
        }
        // unique melee special overlays
        if (['warrior','knight','guardian','gladiator','valkyrie','champion','berserker','templar','paladin'].includes(k)) {
          const visM = getUnitVisual(unit.templateKey);
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2, 8)}`, type: 'special', at: { r, c }, shape: 'crest', color: visM.accent, color2: visM.primary, startedAt: now, durationMs: 280, sizeScale: 0.9, glow: 0.25 } as any);
        } else if (['rogue','assassin','duelist'].includes(k)) {
          const visM = getUnitVisual(unit.templateKey);
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2, 8)}`, type: 'special', at: { r, c }, shape: 'rune', color: visM.accent, color2: visM.primary, startedAt: now, durationMs: 260, sizeScale: 0.8, glow: 0.2, rotate: true } as any);
        } else if (['spear','pikeman','phalanx','javelin'].includes(k)) {
          const visM = getUnitVisual(unit.templateKey);
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2, 8)}`, type: 'special', at: { r, c }, shape: 'reticle', color: visM.accent, color2: visM.primary, startedAt: now, durationMs: 260, sizeScale: 0.8, glow: 0.2 } as any);
        } else {
          // fallback melee overlay for any other melee template
          const visM = getUnitVisual(unit.templateKey);
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2, 8)}`, type: 'special', at: { r, c }, shape: 'crest', color: visM.accent, color2: visM.primary, startedAt: now, durationMs: 220, sizeScale: 0.8, glow: 0.2 } as any);
        }
        if (starMult === 3) {
          // add secondary flourish per melee archetype
          if (['warrior','knight','guardian','gladiator','valkyrie','champion','berserker'].includes(k)) {
            state.effects.push({
              id: `fx-${Math.random().toString(36).slice(2, 8)}`,
              type: 'hit',
              at: { r: tr, c: tc },
              color: '#f59e0b',
              shape: 'slash',
              startedAt: now,
              durationMs: 140,
              tier: starMult,
              sizeScale: 1.1,
              glow: 0.3,
              particles: 6,
            });
          } else if (['spear','pikeman'].includes(k)) {
            state.effects.push({
              id: `fx-${Math.random().toString(36).slice(2, 8)}`,
              type: 'hit',
              at: { r: tr, c: tc },
              color: '#67e8f9',
              color2: '#0ea5e9',
              shape: 'impact',
              startedAt: now,
              durationMs: 160,
              tier: starMult,
              sizeScale: 1.1,
              glow: 0.3,
              particles: 8,
            });
          } else if (['paladin','templar','monk','druid','cleric'].includes(k)) {
            state.effects.push({
              id: `fx-${Math.random().toString(36).slice(2, 8)}`,
              type: 'ring',
              at: { r: tr, c: tc },
              color: '#22c55e',
              startedAt: now,
              durationMs: 220,
              maxRadiusCells: 1,
              tier: starMult,
              rings: 3,
              glow: 0.25,
            });
          }
          // extra per-template star-tier flourishes
          const visT = getUnitVisual(unit.templateKey);
          if (k === 'berserker') {
            state.effects.push({ id: `fx-${Math.random().toString(36).slice(2, 8)}`, type: 'hit', at: { r: tr, c: tc }, color: visT.accent, color2: visT.primary, shape: 'shock', startedAt: now, durationMs: 200, tier: starMult, sizeScale: 1.1, glow: 0.5 } as any);
          } else if (k === 'duelist') {
            state.effects.push({ id: `fx-${Math.random().toString(36).slice(2, 8)}`, type: 'hit', at: { r: tr, c: tc }, color: visT.accent, color2: visT.primary, shape: 'rip', startedAt: now, durationMs: 180, tier: starMult, sizeScale: 1.1, glow: 0.4 } as any);
          } else if (['spear','pikeman','phalanx','javelin'].includes(k)) {
            const dr = Math.sign(tr - r);
            const dc = Math.sign(tc - c);
            const br = tr + dr;
            const bc = tc + dc;
            if (br >= 0 && br < BOARD_ROWS && bc >= 0 && bc < BOARD_COLS) {
              state.effects.push({ id: `fx-${Math.random().toString(36).slice(2, 8)}`, type: 'hit', at: { r: br, c: bc }, color: '#67e8f9', color2: '#0ea5e9', shape: 'impact', startedAt: now, durationMs: 200, tier: starMult, sizeScale: 0.9, glow: 0.3 } as any);
            }
          }
        }
      }
      let damage = Math.floor((stats.atk + atkBonus) * starMult);
      const items = unit.items || [];
      if (items.includes('berserker_axe')) damage += 10;
      // on-hit statuses
      if (ability?.type === 'stunOnHit' && Math.random() < ability.chance) {
        target.status = target.status ?? {};
        target.status.stunnedUntil = now + ability.durationMs;
        state.log.push(`${unit.templateKey} stuns ${target.templateKey}`);
        // stun burst visual
        state.effects.push({
          id: `fx-${Math.random().toString(36).slice(2, 8)}`,
          type: 'hit',
          at: { r: tr, c: tc },
          color: '#ffd166',
          shape: 'burst',
          startedAt: now,
          durationMs: 300,
          tier: starMult,
          particles: 14 + (starMult - 1) * 4,
          glow: 0.65,
        });
      }
      const slowChanceBonus = tiers.Caster ? [0, 0.05, 0.08, 0.12][tiers.Caster] : 0;
      if (ability?.type === 'slowOnHit' && Math.random() < (ability.chance + slowChanceBonus)) {
        target.status = target.status ?? {};
        target.status.slowUntil = now + ability.durationMs;
        target.status.slowFactor = ability.factor;
        // frost burst visual
        state.effects.push({
          id: `fx-${Math.random().toString(36).slice(2, 8)}`,
          type: 'hit',
          at: { r: tr, c: tc },
          color: '#60a5fa',
          shape: 'burst',
          startedAt: now,
          durationMs: 320,
          tier: starMult,
          particles: 14 + (starMult - 1) * 4,
          glow: 0.7,
        });
        state.effects.push({
          id: `fx-${Math.random().toString(36).slice(2, 8)}`,
          type: 'ring',
          at: { r: tr, c: tc },
          color: '#60a5fa',
          startedAt: now,
          durationMs: 400,
          maxRadiusCells: 1,
          tier: starMult,
          rings: 3,
          glow: 0.25,
        });
      }
      if (items.includes('frost_rune') && Math.random() < 0.2) {
        target.status = target.status ?? {};
        target.status.slowUntil = now + 900;
        target.status.slowFactor = 0.7;
      }
      if (items.includes('barbed_blade') && Math.random() < 0.2) {
        target.status = target.status ?? {};
        target.status.bleedUntil = now + 3000;
        target.status.bleedDps = 8;
      }
      // LOS penalty for ranged and flanking bonus for melee
      if (stats.range > 1) {
        const blocked = isLineBlocked(state, r, c, tr, tc, unit.team);
        if (blocked && !(unit.templateKey === 'sniper' || unit.templateKey === 'marksman')) {
          damage = Math.floor(damage * 0.8);
        }
      } else {
        const side = r === tr && Math.abs(c - tc) === 1;
        const isolated = countAdjacentAllies(state, tr, tc, target.team) === 0;
        if (side) damage = Math.floor(damage * 1.1);
        if (isolated) damage = Math.floor(damage * 1.08);
      }
      const beforeHp = target.hp;
      applyDamage(target, damage);
      const afterHp = target.hp;
      // floating damage numbers
      const heavy = (beforeHp - afterHp) >= Math.max(12, UNIT_TEMPLATES[target.templateKey].stats.hp * 0.22);
      const dmgColor = heavy ? '#facc15' : '#f87171';
      state.effects.push({ id: `fx-${Math.random().toString(36).slice(2, 8)}`, type: 'text' as any, at: { r: tr, c: tc }, value: `-${Math.max(1, beforeHp - afterHp)}`, color: dmgColor, startedAt: now, durationMs: 720, sizeScale: (1 + (starMult - 1) * 0.2) * (heavy ? 1.1 : 1) } as any);
      if (heavy) {
        // crit flash overlay
        state.effects.push({ id: `fx-${Math.random().toString(36).slice(2, 8)}`, type: 'hit' as any, at: { r: tr, c: tc }, color: '#fde68a', shape: 'impact', startedAt: now, durationMs: 180, tier: starMult, sizeScale: 1.1, glow: 0.6 } as any);
      }
      if (heavy) {
        state.shakeMs = Math.max(state.shakeMs || 0, 240);
        state.shakeKey = `sk-${Math.random().toString(36).slice(2, 6)}`;
      }
      // shield break indicator
      if ((target.shieldHp || 0) === 0 && beforeHp > afterHp && beforeHp !== target.hp) {
        state.effects.push({ id: `fx-${Math.random().toString(36).slice(2, 8)}`, type: 'decal' as any, at: { r: tr, c: tc }, color: '#60a5fa', shape: 'scorch', startedAt: now, durationMs: 500, sizeScale: 0.8 } as any);
      }
      if (items.includes('vampiric_fang')) {
        const baseHp = UNIT_TEMPLATES[unit.templateKey].stats.hp;
        const maxHp = baseHp * (unit.star || 1);
        const gain = Math.floor(damage * 0.15);
        unit.hp = Math.min(maxHp, unit.hp + gain);
        if (gain > 0) state.effects.push({ id: `fx-${Math.random().toString(36).slice(2, 8)}`, type: 'text' as any, at: { r, c }, value: `+${gain}`, color: '#22c55e', startedAt: now, durationMs: 700, sizeScale: 0.9 } as any);
      }
      // ensure a visible impact for ranged hits even without status procs + target lock
      if (stats.range > 1) {
        state.effects.push({ id: `fx-${Math.random().toString(36).slice(2, 8)}`, type: 'hit', at: { r: tr, c: tc }, color: '#0ea5e9', shape: 'impact', startedAt: now, durationMs: 220, tier: starMult, sizeScale: 1, glow: 0.35 });
        const visLock = getUnitVisual(unit.templateKey);
        state.effects.push({ id: `fx-${Math.random().toString(36).slice(2, 8)}`, type: 'special' as any, at: { r: tr, c: tc }, shape: 'reticle', color: visLock.accent, color2: visLock.primary, startedAt: now, durationMs: 180, sizeScale: 0.7, glow: 0.2 } as any);
      }
      // track damage for player units only
      if (unit.team === 'player') {
        state.damageThisRound = state.damageThisRound || {};
        state.damageThisRound[unit.id] = (state.damageThisRound[unit.id] || 0) + damage;
      }
      state.log.push(`${unit.templateKey}${starMult>1?`(${starMult}★)`:''} hits ${target.templateKey} for ${damage}`);

      // --- Special Duo Synergies ---
      // --- Trio Synergies ---
      // T1) Knight + Paladin + Templar: Holy Triumvirate — holy beam smite at interval on hit
      if (teamHasAll(state, unit.team, ['knight','paladin','templar'])) {
        if (Math.random() < 0.2) {
          const [er, ec] = Object.entries(state.board).find(([_, id]) => id === target.id)![0].split(',').map(Number);
          // central beam
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'projectile' as any, from: { r, c }, to: { r: er, c: ec }, color: '#fde68a', color2: '#ffffff', shape: 'beam', startedAt: now, durationMs: 260, trail: true, sizeScale: 1.1, glow: 1, power: 'synergy' } as any);
          // impact smite burst
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'hit' as any, at: { r: er, c: ec }, color: '#fde68a', color2: '#f59e0b', shape: 'smite', startedAt: now, durationMs: 260, glow: 1, sizeScale: 1.3, power: 'synergy' } as any);
          const holy = Math.floor(damage * 0.5);
          applyDamage(target, holy);
          if (unit.team === 'player') {
            state.damageThisRound = state.damageThisRound || {};
            state.damageThisRound[unit.id] = (state.damageThisRound[unit.id] || 0) + holy;
          }
        }
      }

      // T2) Archer + Marksman + Sniper: Arrow Storm — multishot to 2 random targets with tracers
      if (teamHasAll(state, unit.team, ['archer','marksman','sniper']) && stats.range > 1) {
        const candidates: string[] = [];
        for (const [k, id] of Object.entries(state.board)) {
          if (!id || id === target.id) continue;
          const u2 = state.units[id];
          if (!u2 || u2.team === unit.team || u2.hp <= 0) continue;
          const [er, ec] = k.split(',').map(Number);
          const dist = Math.abs(er - r) + Math.abs(ec - c);
          if (dist <= stats.range) candidates.push(id);
        }
        const picks = candidates.sort(() => Math.random() - 0.5).slice(0, 2);
        for (const tid of picks) {
          const t2 = state.units[tid]; if (!t2) continue;
          const [er, ec] = Object.entries(state.board).find(([_, id]) => id === tid)![0].split(',').map(Number);
          const volley = Math.floor(damage * 0.4);
          applyDamage(t2, volley);
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'projectile' as any, from: { r, c }, to: { r: er, c: ec }, color: '#facc15', color2: '#ffffff', shape: 'arrow', startedAt: now, durationMs: 240, trail: true, sizeScale: 1.1, glow: 0.8, power: 'synergy' } as any);
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'projectile' as any, from: { r, c }, to: { r: er, c: ec }, color: '#ffffff', color2: '#ffffff', shape: 'bullet', startedAt: now, durationMs: 220, trail: true, sizeScale: 0.7, glow: 0.5, power: 'synergy' } as any);
          if (unit.team === 'player') {
            state.damageThisRound = state.damageThisRound || {};
            state.damageThisRound[unit.id] = (state.damageThisRound[unit.id] || 0) + volley;
          }
        }
      }

      // T3) Guardian + Champion + Gladiator: Phalanx Wall — grant DR and retaliatory shock to adjacent allies
      if (teamHasAll(state, unit.team, ['guardian','champion','gladiator']) && stats.range <= 1) {
        const neighbors = [ [r+1, c], [r-1, c], [r, c+1], [r, c-1] ];
        for (const [er, ec] of neighbors) {
          if (er < 0 || er >= BOARD_ROWS || ec < 0 || ec >= BOARD_COLS) continue;
          const idn = state.board[`${er},${ec}`];
          if (!idn) continue;
          const ally = state.units[idn];
          if (!ally || ally.team !== unit.team) continue;
          ally.damageReductionPct = Math.min(0.2, (ally.damageReductionPct || 0) + 0.08);
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'hit' as any, at: { r: er, c: ec }, color: '#f59e0b', shape: 'shock', startedAt: now, durationMs: 220, glow: 0.6, power: 'synergy' } as any);
        }
      }

      // T4) Sorcerer + Warlock + Witch: Chaos Nexus — rune burst plus bonus damage around target
      if (teamHasAll(state, unit.team, ['sorcerer','warlock','witch'])) {
        const [er, ec] = Object.entries(state.board).find(([_, id]) => id === target.id)![0].split(',').map(Number);
        const fringe = [ [er+1, ec], [er-1, ec], [er, ec+1], [er, ec-1] ];
        for (const [rr, cc] of fringe) {
          if (rr < 0 || rr >= BOARD_ROWS || cc < 0 || cc >= BOARD_COLS) continue;
          const idn = state.board[`${rr},${cc}`]; if (!idn) continue;
          const foe = state.units[idn]; if (!foe || foe.team === unit.team || foe.hp <= 0) continue;
          const extra = Math.floor(damage * 0.25);
          applyDamage(foe, extra);
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'special' as any, at: { r: rr, c: cc }, shape: 'rune', color: '#a78bfa', color2: '#7c3aed', startedAt: now, durationMs: 260, sizeScale: 1, glow: 0.7, power: 'synergy' } as any);
          if (unit.team === 'player') {
            state.damageThisRound = state.damageThisRound || {};
            state.damageThisRound[unit.id] = (state.damageThisRound[unit.id] || 0) + extra;
          }
        }
      }

      // T5) Pikeman + Phalanx + Spear: Piercing Wall — line thrust through target up to 2 cells
      if (teamHasAll(state, unit.team, ['pikeman','phalanx','spear'])) {
        const [er, ec] = Object.entries(state.board).find(([_, id]) => id === target.id)![0].split(',').map(Number);
        const dr = Math.sign(er - r); const dc = Math.sign(ec - c);
        let pr = er + dr; let pc = ec + dc;
        for (let i = 0; i < 2; i++) {
          if (pr < 0 || pr >= BOARD_ROWS || pc < 0 || pc >= BOARD_COLS) break;
          const idn = state.board[`${pr},${pc}`];
          if (idn) {
            const foe = state.units[idn];
            if (foe && foe.team !== unit.team && foe.hp > 0) {
              const pierce = Math.floor(damage * 0.25);
              applyDamage(foe, pierce);
              state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'hit' as any, at: { r: pr, c: pc }, color: '#67e8f9', shape: 'thrust', startedAt: now, durationMs: 220, glow: 0.6, power: 'synergy' } as any);
            }
          }
          pr += dr; pc += dc;
        }
      }

      // T6) Mage + Sorcerer + Stormcaller: Tempest — bolt + rune beam combo on hit
      if (teamHasAll(state, unit.team, ['mage','sorcerer','stormcaller'])) {
        if (stats.range > 1 && Math.random() < 0.2) {
          const [er, ec] = Object.entries(state.board).find(([_, id]) => id === target.id)![0].split(',').map(Number);
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'projectile' as any, from: { r, c }, to: { r: er, c: ec }, color: '#a78bfa', color2: '#7c3aed', shape: 'bolt', startedAt: now, durationMs: 220, trail: true, sizeScale: 1, glow: 0.8, power: 'synergy' } as any);
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'projectile' as any, from: { r, c }, to: { r: er, c: ec }, color: '#7c3aed', color2: '#ffffff', shape: 'beam', startedAt: now, durationMs: 260, trail: true, sizeScale: 1.1, glow: 0.9, power: 'synergy' } as any);
          const extra = Math.floor(damage * 0.45);
          applyDamage(target, extra);
          if (unit.team === 'player') {
            state.damageThisRound = state.damageThisRound || {};
            state.damageThisRound[unit.id] = (state.damageThisRound[unit.id] || 0) + extra;
          }
        }
      }

      // T7) Rogue + Assassin + Duelist: Deathblossom — multi-rip around the target
      if (teamHasAll(state, unit.team, ['rogue','assassin','duelist']) && stats.range <= 1) {
        const [er, ec] = Object.entries(state.board).find(([_, id]) => id === target.id)![0].split(',').map(Number);
        const ring = [ [er+1, ec], [er-1, ec], [er, ec+1], [er, ec-1] ];
        for (const [rr, cc] of ring) {
          if (rr < 0 || rr >= BOARD_ROWS || cc < 0 || cc >= BOARD_COLS) continue;
          const idn = state.board[`${rr},${cc}`];
          if (!idn) continue;
          const foe = state.units[idn];
          if (foe && foe.team !== unit.team) {
            const bleed = Math.floor(damage * 0.2);
            applyDamage(foe, bleed);
            state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'hit' as any, at: { r: rr, c: cc }, color: '#ef4444', shape: 'rip', startedAt: now, durationMs: 220, glow: 0.8, power: 'synergy' } as any);
          }
        }
      }

      // T8) Guardian + Shieldbearer + Shieldman: Iron Bulwark — on melee hit, pulse small shields to adjacent allies
      if (teamHasAll(state, unit.team, ['guardian','shieldbearer','shieldman']) && stats.range <= 1) {
        const neighbors = [ [r+1, c], [r-1, c], [r, c+1], [r, c-1] ];
        let granted = false;
        for (const [rr, cc] of neighbors) {
          if (rr < 0 || rr >= BOARD_ROWS || cc < 0 || cc >= BOARD_COLS) continue;
          const aid = state.board[`${rr},${cc}`];
          if (!aid) continue;
          const ally = state.units[aid];
          if (ally && ally.team === unit.team) {
            const shield = Math.floor(10 * (unit.star || 1));
            ally.shieldHp = (ally.shieldHp || 0) + shield;
            state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'ring' as any, at: { r: rr, c: cc }, color: '#93c5fd', startedAt: now, durationMs: 240, maxRadiusCells: 1, glow: 0.6, power: 'synergy' } as any);
            granted = true;
          }
        }
        if (granted) {
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'special' as any, at: { r, c }, shape: 'crest', color: '#60a5fa', color2: '#93c5fd', startedAt: now, durationMs: 260, sizeScale: 1, glow: 0.7, power: 'synergy' } as any);
        }
      }

      // T9) Frost + Ice Archer + Mystic: Absolute Zero — if target is slowed, high chance to freeze briefly and deal bonus damage
      if (teamHasAll(state, unit.team, ['frost','icearcher','mystic'])) {
        if (target.status?.slowUntil && target.status.slowUntil > now && Math.random() < 0.35) {
          const [er, ec] = Object.entries(state.board).find(([_, id]) => id === target.id)![0].split(',').map(Number);
          const freezeMs = 650 + 50 * (unit.star || 1);
          target.status = target.status || {};
          target.status.stunnedUntil = Math.max(target.status.stunnedUntil || 0, now + freezeMs);
          const bonus = Math.floor(damage * 0.3);
          applyDamage(target, bonus);
          if (unit.team === 'player') {
            state.damageThisRound = state.damageThisRound || {};
            state.damageThisRound[unit.id] = (state.damageThisRound[unit.id] || 0) + bonus;
          }
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'hit' as any, at: { r: er, c: ec }, color: '#bae6fd', shape: 'burst', startedAt: now, durationMs: 260, glow: 1, sizeScale: 1.1, power: 'synergy' } as any);
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'special' as any, at: { r: er, c: ec }, shape: 'snow', color: '#60a5fa', color2: '#e0f2fe', startedAt: now, durationMs: 300, sizeScale: 1, glow: 0.8, power: 'synergy' } as any);
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'decal' as any, at: { r: er, c: ec }, color: '#93c5fd', shape: 'frostcrack', startedAt: now, durationMs: 900, sizeScale: 1, rotationDeg: 0 } as any);
        }
      }

      // T10) Ballista + Sentry + Slinger: Siege Network — chance to launch a bomb to a nearby enemy causing small AoE
      if (teamHasAll(state, unit.team, ['ballista','sentry','slinger']) && stats.range > 1 && Math.random() < 0.2) {
        const [er, ec] = Object.entries(state.board).find(([_, id]) => id === target.id)![0].split(',').map(Number);
        // find a neighbor enemy of the target
        const neigh = [ [er+1, ec], [er-1, ec], [er, ec+1], [er, ec-1] ];
        let victim: { id: string; r: number; c: number } | null = null;
        for (const [rr, cc] of neigh) {
          const idn = state.board[`${rr},${cc}`];
          if (!idn) continue;
          const foe = state.units[idn];
          if (foe && foe.team !== unit.team) { victim = { id: idn, r: rr, c: cc }; break; }
        }
        const vr = victim?.r ?? er;
        const vc = victim?.c ?? ec;
        state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'projectile' as any, from: { r, c }, to: { r: vr, c: vc }, color: '#f59e0b', color2: '#fbbf24', shape: 'bomb', startedAt: now, durationMs: 260, trail: true, sizeScale: 1.1, glow: 0.9, power: 'synergy' } as any);
        // AoE at impact
        const splashCells = [ [vr, vc], [vr+1, vc], [vr-1, vc], [vr, vc+1], [vr, vc-1] ];
        for (const [rr, cc] of splashCells) {
          const idn = state.board[`${rr},${cc}`];
          if (!idn) continue;
          const foe = state.units[idn];
          if (foe && foe.team !== unit.team) {
            const extra = Math.floor(damage * 0.25);
            applyDamage(foe, extra);
          }
        }
        state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'hit' as any, at: { r: vr, c: vc }, color: '#fbbf24', shape: 'impact', startedAt: now, durationMs: 280, glow: 1, sizeScale: 1.3, power: 'synergy' } as any);
      }

      // T11) Hunter + Archer + Beastmaster: Pack Hunt — chance to fire two extra weaker shots at the same target
      if (teamHasAll(state, unit.team, ['hunter','archer','beastmaster']) && stats.range > 1 && Math.random() < 0.25) {
        const [er, ec] = Object.entries(state.board).find(([_, id]) => id === target.id)![0].split(',').map(Number);
        const extraDmg = Math.floor(damage * 0.2);
        for (let i = 0; i < 2; i++) {
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'projectile' as any, from: { r, c }, to: { r: er, c: ec }, color: '#22c55e', color2: '#10b981', shape: 'chakram', startedAt: now, durationMs: 200 + i*30, trail: true, sizeScale: 0.9, glow: 0.8, power: 'synergy' } as any);
        }
        applyDamage(target, extraDmg * 2);
        if (unit.team === 'player') {
          state.damageThisRound = state.damageThisRound || {};
          state.damageThisRound[unit.id] = (state.damageThisRound[unit.id] || 0) + extraDmg * 2;
        }
      }
      // 1) Frost + Marksman: bonus shatter damage to slowed targets
      if (teamHasTemplates(state, unit.team, ['frost','marksman'])) {
        const isSlowed = !!(target.status?.slowUntil && target.status.slowUntil > now);
        if (isSlowed) {
          const bonus = Math.floor(damage * 0.35);
          const tBefore = target.hp;
          applyDamage(target, bonus);
          const [er, ec] = Object.entries(state.board).find(([_, id]) => id === target.id)![0]
            .split(',')
            .map(Number);
          // icy shard burst (flashier for synergy)
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'hit' as any, at: { r: er, c: ec }, color: '#93c5fd', shape: 'burst', startedAt: now, durationMs: 320, tier: starMult, particles: 18, glow: 0.9, power: 'synergy' } as any);
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'decal' as any, at: { r: er, c: ec }, color: '#e0f2fe', shape: 'frostcrack', startedAt: now, durationMs: 900, sizeScale: 1.1, power: 'synergy' } as any);
          // shard projectiles inwards
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'projectile' as any, from: { r: er, c: Math.max(0, ec-1) }, to: { r: er, c: ec }, color: '#bae6fd', color2: '#60a5fa', shape: 'shard', startedAt: now, durationMs: 160, tier: 1, trail: true, sizeScale: 0.7, glow: 0.25 } as any);
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'projectile' as any, from: { r: er, c: Math.min(11, ec+1) }, to: { r: er, c: ec }, color: '#bae6fd', color2: '#60a5fa', shape: 'shard', startedAt: now, durationMs: 160, tier: 1, trail: true, sizeScale: 0.7, glow: 0.25 } as any);
          if (unit.team === 'player') {
            state.damageThisRound = state.damageThisRound || {};
            state.damageThisRound[unit.id] = (state.damageThisRound[unit.id] || 0) + Math.max(0, tBefore - target.hp);
          }
        }
      }

      // 2) Paladin + Sorcerer: Paladin heal pulse also damages nearby enemies
      if (unit.templateKey === 'paladin' && teamHasTemplates(state, unit.team, ['paladin','sorcerer'])) {
        // piggyback on healPulse timing: if just cast, emit nova
        if (unit.specialLastAt === now) {
          const radius = 2;
          for (const [k, id2] of Object.entries(state.board)) {
            if (!id2) continue;
            const other = state.units[id2];
            if (!other || other.team === unit.team) continue;
            const [er, ec] = k.split(',').map(Number);
            const dist = Math.abs(er - r) + Math.abs(ec - c);
            if (dist <= radius) {
              const radiant = Math.floor(10 * (unit.star || 1));
              applyDamage(other, radiant);
              // radiant ring + smite
              state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'ring' as any, at: { r: er, c: ec }, color: '#fde68a', startedAt: now, durationMs: 320, maxRadiusCells: 1, rings: 5, glow: 0.6, power: 'synergy' } as any);
              state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'hit' as any, at: { r: er, c: ec }, color: '#fbbf24', shape: 'smite', startedAt: now, durationMs: 260, glow: 0.8, sizeScale: 1.2, power: 'synergy' } as any);
            }
          }
          // central radiant crest
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'special' as any, at: { r, c }, shape: 'crest', color: '#fde68a', color2: '#fbbf24', startedAt: now, durationMs: 260, sizeScale: 1.1, glow: 0.4 } as any);
        }
      }

      // 3) Assassin + Rogue: apply strong bleed to isolated targets on hit
      if ((unit.templateKey === 'assassin' || unit.templateKey === 'rogue') && teamHasTemplates(state, unit.team, ['assassin','rogue'])) {
        const [erIso, ecIso] = Object.entries(state.board).find(([_, id]) => id === target.id)![0]
          .split(',')
          .map(Number);
        const adjAllies = countAdjacentAllies(state, erIso, ecIso, target.team);
        if (adjAllies === 0) {
          target.status = target.status ?? {};
          // potent bleed, overrides weaker
          target.status.bleedUntil = now + 2500;
          target.status.bleedDps = Math.max(target.status.bleedDps || 0, 12);
          // flashy rip mark
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'hit' as any, at: { r: erIso, c: ecIso }, color: '#ef4444', shape: 'rip', startedAt: now, durationMs: 320, glow: 0.8, sizeScale: 1.25, power: 'synergy' } as any);
        }
      }

      // 4) Hunter + Beastmaster: Pack Volley — one extra weak projectile to a new target
      if ((unit.templateKey === 'hunter' || unit.templateKey === 'beastmaster') && teamHasTemplates(state, unit.team, ['hunter','beastmaster'])) {
        const candidates: string[] = [];
        for (const [k, id] of Object.entries(state.board)) {
          if (!id || id === target.id) continue;
          const uu = state.units[id];
          if (!uu || uu.team === unit.team || uu.hp <= 0) continue;
          const [er, ec] = k.split(',').map(Number);
          const dist = Math.abs(er - r) + Math.abs(ec - c);
          if (dist <= stats.range) candidates.push(id);
        }
        if (candidates.length > 0) {
          const tid = candidates[Math.floor(Math.random() * candidates.length)];
          const t2 = state.units[tid];
          if (t2) {
            const [er, ec] = Object.entries(state.board).find(([_, id]) => id === tid)![0]
              .split(',')
              .map(Number);
            const volleyDmg = Math.floor(damage * 0.4);
            applyDamage(t2, volleyDmg);
            state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'projectile' as any, from: { r, c }, to: { r: er, c: ec }, color: '#22c55e', color2: '#10b981', shape: 'chakram', startedAt: now, durationMs: 260, tier: starMult, trail: true, sizeScale: 0.9, glow: 0.3 } as any);
            state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'hit' as any, at: { r: er, c: ec }, color: '#10b981', shape: 'impact', startedAt: now, durationMs: 200, glow: 0.35 } as any);
            if (unit.team === 'player') {
              state.damageThisRound = state.damageThisRound || {};
              state.damageThisRound[unit.id] = (state.damageThisRound[unit.id] || 0) + volleyDmg;
            }
          }
        }
      }

      // 7) Sniper + Marksman: Headshot — chance to deal big bonus damage on ranged hits
      if ((unit.templateKey === 'sniper' || unit.templateKey === 'marksman') && teamHasTemplates(state, unit.team, ['sniper','marksman']) && stats.range > 1) {
        if (Math.random() < 0.18) {
          const headshot = Math.floor(damage * 0.8);
          const [er, ec] = Object.entries(state.board).find(([_, id]) => id === target.id)![0].split(',').map(Number);
          applyDamage(target, headshot);
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'special' as any, at: { r: er, c: ec }, shape: 'reticle', color: '#fde68a', color2: '#f59e0b', startedAt: now, durationMs: 240, sizeScale: 1.0, glow: 0.45 } as any);
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'hit' as any, at: { r: er, c: ec }, color: '#f59e0b', shape: 'impact', startedAt: now, durationMs: 200, glow: 0.6, sizeScale: 1.15 } as any);
          if (unit.team === 'player') {
            state.damageThisRound = state.damageThisRound || {};
            state.damageThisRound[unit.id] = (state.damageThisRound[unit.id] || 0) + headshot;
          }
        }
      }

      // 8) Ballista + Sentry: Overwatch — low chance to auto-fire at a random enemy in range after hit
      if ((unit.templateKey === 'ballista' || unit.templateKey === 'sentry') && teamHasTemplates(state, unit.team, ['ballista','sentry']) && stats.range > 1) {
        if (Math.random() < 0.2) {
          const enemiesInRange: string[] = [];
          for (const [k, id] of Object.entries(state.board)) {
            if (!id) continue;
            const u2 = state.units[id];
            if (!u2 || u2.team === unit.team || u2.hp <= 0) continue;
            const [er, ec] = k.split(',').map(Number);
            const dist = Math.abs(er - r) + Math.abs(ec - c);
            if (dist <= stats.range) enemiesInRange.push(id);
          }
          if (enemiesInRange.length > 0) {
            const tid = enemiesInRange[Math.floor(Math.random() * enemiesInRange.length)];
            const t3 = state.units[tid]!;
            const [er, ec] = Object.entries(state.board).find(([_, id]) => id === tid)![0].split(',').map(Number);
            const ovDmg = Math.floor(damage * 0.35);
            applyDamage(t3, ovDmg);
            state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'projectile' as any, from: { r, c }, to: { r: er, c: ec }, color: '#60a5fa', color2: '#1d4ed8', shape: 'chakram', startedAt: now, durationMs: 240, tier: starMult, trail: true, sizeScale: 0.85, glow: 0.3 } as any);
            state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'hit' as any, at: { r: er, c: ec }, color: '#1d4ed8', shape: 'impact', startedAt: now, durationMs: 180, glow: 0.4 } as any);
            if (unit.team === 'player') {
              state.damageThisRound = state.damageThisRound || {};
              state.damageThisRound[unit.id] = (state.damageThisRound[unit.id] || 0) + ovDmg;
            }
          }
        }
      }

      // 9) Ice Archer + Frost: Deep Freeze — chance to stun slowed targets briefly on hit
      if ((unit.templateKey === 'icearcher' || unit.templateKey === 'frost') && teamHasTemplates(state, unit.team, ['icearcher','frost'])) {
        const isSlowed = !!(target.status?.slowUntil && target.status.slowUntil > now);
        if (isSlowed && Math.random() < 0.2) {
          const [er, ec] = Object.entries(state.board).find(([_, id]) => id === target.id)![0].split(',').map(Number);
          target.status = target.status || {};
          target.status.stunnedUntil = Math.max(target.status.stunnedUntil || 0, now + 400);
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'hit' as any, at: { r: er, c: ec }, color: '#93c5fd', shape: 'burst', startedAt: now, durationMs: 200, glow: 0.7 } as any);
        }
      }

      // 10) Knight + Templar: Holy Bash — small cone smite behind the target
      if ((unit.templateKey === 'knight' || unit.templateKey === 'templar') && teamHasTemplates(state, unit.team, ['knight','templar']) && stats.range <= 1) {
        const [er, ec] = Object.entries(state.board).find(([_, id]) => id === target.id)![0].split(',').map(Number);
        const dr = Math.sign(er - r);
        const dc = Math.sign(ec - c);
        const cells = [
          [er + dr, ec + dc],
          [er + dr + (dc !== 0 ? 0 : 1), ec + dc + (dc !== 0 ? 1 : 0)],
          [er + dr - (dc !== 0 ? 0 : 1), ec + dc - (dc !== 0 ? 1 : 0)],
        ];
        for (const [rr, cc] of cells) {
          if (rr < 0 || rr >= BOARD_ROWS || cc < 0 || cc >= BOARD_COLS) continue;
          const id2 = state.board[`${rr},${cc}`];
          if (!id2) continue;
          const v = state.units[id2];
          if (!v || v.team === unit.team) continue;
          const bash = Math.floor(damage * 0.25);
          applyDamage(v, bash);
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'hit' as any, at: { r: rr, c: cc }, color: '#fcd34d', shape: 'smite', startedAt: now, durationMs: 280, glow: 0.9, power: 'synergy' } as any);
        }
      }

      // 11) Valkyrie + Paladin: Judgement — if target dies from this hit, smite nearby enemies
      if ((unit.templateKey === 'valkyrie' || unit.templateKey === 'paladin') && teamHasTemplates(state, unit.team, ['valkyrie','paladin'])) {
        if (target.hp <= 0) {
          const [er, ec] = Object.entries(state.board).find(([_, id]) => id === target.id)![0].split(',').map(Number);
          for (const [k, id2] of Object.entries(state.board)) {
            if (!id2) continue;
            const o = state.units[id2];
            if (!o || o.team === unit.team || o.hp <= 0) continue;
            const [rr, cc] = k.split(',').map(Number);
            if (Math.abs(rr - er) + Math.abs(cc - ec) === 1) {
              const smite = Math.floor((stats.atk * (unit.star || 1)) * 0.5);
              applyDamage(o, smite);
              state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'hit' as any, at: { r: rr, c: cc }, color: '#fde68a', shape: 'smite', startedAt: now, durationMs: 220, glow: 0.55 } as any);
            }
          }
        }
      }

      // 12) Archer + Crossbow: Volley Spread — extra arrows to up to 2 nearby enemies
      if ((unit.templateKey === 'archer' || unit.templateKey === 'crossbow') && teamHasTemplates(state, unit.team, ['archer','crossbow']) && stats.range > 1) {
        const candidates: string[] = [];
        for (const [k, id] of Object.entries(state.board)) {
          if (!id || id === target.id) continue;
          const uu = state.units[id];
          if (!uu || uu.team === unit.team || uu.hp <= 0) continue;
          const [er, ec] = k.split(',').map(Number);
          const dist = Math.abs(er - r) + Math.abs(ec - c);
          if (dist <= stats.range) candidates.push(id);
        }
        const spreadTargets = candidates.slice(0, 2);
        for (const tid of spreadTargets) {
          const t2 = state.units[tid];
          if (!t2) continue;
          const [er, ec] = Object.entries(state.board).find(([_, id]) => id === tid)![0].split(',').map(Number);
          const volley = Math.floor(damage * 0.3);
          applyDamage(t2, volley);
          const vis = getUnitVisual(unit.templateKey);
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'projectile' as any, from: { r, c }, to: { r: er, c: ec }, color: vis.accent, color2: vis.primary, shape: 'arrow', startedAt: now, durationMs: 260, tier: starMult, trail: true, sizeScale: 0.9, glow: 0.4, power: 'synergy' } as any);
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'hit' as any, at: { r: er, c: ec }, color: vis.accent, shape: 'impact', startedAt: now, durationMs: 220, glow: 0.6, power: 'synergy' } as any);
          if (unit.team === 'player') {
            state.damageThisRound = state.damageThisRound || {};
            state.damageThisRound[unit.id] = (state.damageThisRound[unit.id] || 0) + volley;
          }
        }
      }

      // 13) Sorcerer + Stormcaller: Chain Bolt — arc to adjacent enemy from the target
      if ((unit.templateKey === 'sorcerer' || unit.templateKey === 'stormcaller') && teamHasTemplates(state, unit.team, ['sorcerer','stormcaller'])) {
        const [er0, ec0] = Object.entries(state.board).find(([_, id]) => id === target.id)![0].split(',').map(Number);
        const neighbors = [ [er0+1, ec0], [er0-1, ec0], [er0, ec0+1], [er0, ec0-1] ];
        for (const [er, ec] of neighbors) {
          if (er < 0 || er >= BOARD_ROWS || ec < 0 || ec >= BOARD_COLS) continue;
          const idn = state.board[`${er},${ec}`];
          if (!idn) continue;
          const other = state.units[idn];
          if (!other || other.team === unit.team || other.hp <= 0) continue;
          const bolt = Math.floor(damage * 0.35);
          applyDamage(other, bolt);
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'projectile' as any, from: { r: er0, c: ec0 }, to: { r: er, c: ec }, color: '#a78bfa', color2: '#7c3aed', shape: 'bolt', startedAt: now, durationMs: 220, tier: starMult, trail: true, sizeScale: 1, glow: 0.6, power: 'synergy' } as any);
          if (unit.team === 'player') {
            state.damageThisRound = state.damageThisRound || {};
            state.damageThisRound[unit.id] = (state.damageThisRound[unit.id] || 0) + bolt;
          }
          break; // single chain
        }
      }

      // 14) Warrior + Berserker: Rage Shock — extra shock damage and shake on melee hit
      if ((unit.templateKey === 'warrior' || unit.templateKey === 'berserker') && teamHasTemplates(state, unit.team, ['warrior','berserker']) && stats.range <= 1) {
        const [er, ec] = Object.entries(state.board).find(([_, id]) => id === target.id)![0].split(',').map(Number);
        const shock = Math.floor(damage * 0.25);
        applyDamage(target, shock);
        state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'hit' as any, at: { r: er, c: ec }, color: '#ef4444', color2: '#f59e0b', shape: 'shock', startedAt: now, durationMs: 240, glow: 0.8, power: 'synergy' } as any);
        state.shakeMs = Math.max(state.shakeMs || 0, 200);
        state.shakeKey = `sk-${Math.random().toString(36).slice(2, 6)}`;
        if (unit.team === 'player') {
          state.damageThisRound = state.damageThisRound || {};
          state.damageThisRound[unit.id] = (state.damageThisRound[unit.id] || 0) + shock;
        }
      }

      // 15) Assassin + Duelist: Lunge — briefly slow low-HP targets
      if ((unit.templateKey === 'assassin' || unit.templateKey === 'duelist') && teamHasTemplates(state, unit.team, ['assassin','duelist'])) {
        const baseHp = UNIT_TEMPLATES[target.templateKey].stats.hp * (target.star || 1);
        if (target.hp <= Math.floor(baseHp * 0.5)) {
          target.status = target.status || {};
          target.status.slowUntil = Math.max(target.status.slowUntil || 0, now + 600);
          target.status.slowFactor = Math.min(target.status.slowFactor || 1, 0.7);
          const [er, ec] = Object.entries(state.board).find(([_, id]) => id === target.id)![0].split(',').map(Number);
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'hit' as any, at: { r: er, c: ec }, color: '#fca5a5', shape: 'impact', startedAt: now, durationMs: 200, glow: 0.7, power: 'synergy' } as any);
        }
      }

      // 16) Pikeman + Javelin: Long Reach — extra spear jab to same target
      if ((unit.templateKey === 'pikeman' || unit.templateKey === 'javelin') && teamHasTemplates(state, unit.team, ['pikeman','javelin'])) {
        const [er, ec] = Object.entries(state.board).find(([_, id]) => id === target.id)![0].split(',').map(Number);
        const jab = Math.floor(damage * 0.25);
        applyDamage(target, jab);
        state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'projectile' as any, from: { r, c }, to: { r: er, c: ec }, color: '#67e8f9', color2: '#0ea5e9', shape: 'spear', startedAt: now, durationMs: 220, tier: starMult, trail: true, sizeScale: 0.9, glow: 0.6, power: 'synergy' } as any);
        if (unit.team === 'player') {
          state.damageThisRound = state.damageThisRound || {};
          state.damageThisRound[unit.id] = (state.damageThisRound[unit.id] || 0) + jab;
        }
      }

      // 17) Mage + Frost: Glacier — if target is slowed, add frost ring and bonus damage
      if ((unit.templateKey === 'mage' || unit.templateKey === 'frost') && teamHasTemplates(state, unit.team, ['mage','frost'])) {
        const isSlowed = !!(target.status?.slowUntil && target.status.slowUntil > now);
        if (isSlowed) {
          const [er, ec] = Object.entries(state.board).find(([_, id]) => id === target.id)![0].split(',').map(Number);
          const extra = Math.floor(damage * 0.2);
          applyDamage(target, extra);
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'ring' as any, at: { r: er, c: ec }, color: '#93c5fd', startedAt: now, durationMs: 260, maxRadiusCells: 0.8, rings: 3, glow: 0.6, power: 'synergy' } as any);
          if (unit.team === 'player') {
            state.damageThisRound = state.damageThisRound || {};
            state.damageThisRound[unit.id] = (state.damageThisRound[unit.id] || 0) + extra;
          }
        }
      }

      // 18) Warlock + Witch: Hex — apply brief slow on hit with arcane visuals
      if ((unit.templateKey === 'warlock' || unit.templateKey === 'witch') && teamHasTemplates(state, unit.team, ['warlock','witch'])) {
        target.status = target.status || {};
        target.status.slowUntil = Math.max(target.status.slowUntil || 0, now + 500);
        target.status.slowFactor = Math.min(target.status.slowFactor || 1, 0.8);
        const [er, ec] = Object.entries(state.board).find(([_, id]) => id === target.id)![0].split(',').map(Number);
        state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'special' as any, at: { r: er, c: ec }, shape: 'rune', color: '#a78bfa', color2: '#7c3aed', startedAt: now, durationMs: 240, sizeScale: 1, glow: 0.6, power: 'synergy' } as any);
      }

      // 19) Sniper + Crossbow: Piercing Round — attempt to hit one enemy behind target
      if ((unit.templateKey === 'sniper' || unit.templateKey === 'crossbow') && teamHasTemplates(state, unit.team, ['sniper','crossbow']) && stats.range > 1) {
        const [trr, tcc] = Object.entries(state.board).find(([_, id]) => id === target.id)![0].split(',').map(Number);
        const dr = Math.sign(trr - r);
        const dc = Math.sign(tcc - c);
        const br = trr + dr;
        const bc = tcc + dc;
        if (br >= 0 && br < BOARD_ROWS && bc >= 0 && bc < BOARD_COLS) {
          const behindId = state.board[`${br},${bc}`];
          if (behindId) {
            const other = state.units[behindId];
            if (other && other.team !== unit.team) {
              const pierce = Math.floor(damage * 0.35);
              applyDamage(other, pierce);
              state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'projectile' as any, from: { r: trr, c: tcc }, to: { r: br, c: bc }, color: '#facc15', color2: '#f59e0b', shape: 'bullet', startedAt: now, durationMs: 180, tier: starMult, trail: true, sizeScale: 0.8, glow: 0.6, power: 'synergy' } as any);
              if (unit.team === 'player') {
                state.damageThisRound = state.damageThisRound || {};
                state.damageThisRound[unit.id] = (state.damageThisRound[unit.id] || 0) + pierce;
              }
            }
          }
        }
      }

      // 20) Druid + Beastmaster: Pack Mending — small heal to a nearby ally on beastmaster hit
      if (unit.templateKey === 'beastmaster' && teamHasTemplates(state, unit.team, ['druid','beastmaster'])) {
        const [er0, ec0] = Object.entries(state.board).find(([_, id]) => id === unit.id)![0].split(',').map(Number);
        const neighbors = [ [er0+1, ec0], [er0-1, ec0], [er0, ec0+1], [er0, ec0-1] ];
        for (const [er, ec] of neighbors) {
          if (er < 0 || er >= BOARD_ROWS || ec < 0 || ec >= BOARD_COLS) continue;
          const aid = state.board[`${er},${ec}`];
          if (!aid) continue;
          const ally = state.units[aid];
          if (!ally || ally.team !== unit.team) continue;
          const baseHp = UNIT_TEMPLATES[ally.templateKey].stats.hp * (ally.star || 1);
          const heal = Math.floor(6 * (unit.star || 1));
          const before = ally.hp;
          ally.hp = Math.min(baseHp, ally.hp + heal);
          if (ally.hp > before) {
            state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'text' as any, at: { r: er, c: ec }, value: `+${ally.hp - before}`, color: '#22c55e', startedAt: now, durationMs: 600, sizeScale: 0.9, power: 'synergy' } as any);
          }
          break;
        }
      }
      // 5) Spear + Phalanx: Impale — bonus damage to the cell behind target
      if ((unit.templateKey === 'spear' || unit.templateKey === 'phalanx' || unit.templateKey === 'pikeman' || unit.templateKey === 'javelin') && teamHasTemplates(state, unit.team, ['spear','phalanx'])) {
        const dr = Math.sign((Object.entries(state.board).find(([_, id]) => id === target.id)![0].split(',').map(Number)[0]) - r);
        const dc = Math.sign((Object.entries(state.board).find(([_, id]) => id === target.id)![0].split(',').map(Number)[1]) - c);
        const [trc, tcc] = Object.entries(state.board).find(([_, id]) => id === target.id)![0]
          .split(',')
          .map(Number);
        const br = trc + dr;
        const bc = tcc + dc;
        const keyBehind = `${br},${bc}`;
        const idBehind = state.board[keyBehind];
        if (idBehind && state.units[idBehind] && state.units[idBehind].team !== unit.team) {
          const victim = state.units[idBehind];
          const impale = Math.floor(damage * 0.3);
          applyDamage(victim, impale);
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'hit' as any, at: { r: br, c: bc }, color: '#67e8f9', shape: 'thrust', startedAt: now, durationMs: 200, glow: 0.35 } as any);
          if (unit.team === 'player') {
            state.damageThisRound = state.damageThisRound || {};
            state.damageThisRound[unit.id] = (state.damageThisRound[unit.id] || 0) + impale;
          }
        }
      }

      // 6) Mage + Warlock: Arcane Ruin — splash damage around target
      if ((unit.templateKey === 'mage' || unit.templateKey === 'warlock') && teamHasTemplates(state, unit.team, ['mage','warlock'])) {
        const [er, ec] = Object.entries(state.board).find(([_, id]) => id === target.id)![0]
          .split(',')
          .map(Number);
        const aoe = Math.floor(damage * 0.2);
        for (const [k, id] of Object.entries(state.board)) {
          if (!id || id === target.id) continue;
          const other = state.units[id];
          if (!other || other.team === unit.team || other.hp <= 0) continue;
          const [rr, cc] = k.split(',').map(Number);
          if (Math.abs(rr - er) + Math.abs(cc - ec) === 1) {
            applyDamage(other, aoe);
            state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'hit' as any, at: { r: rr, c: cc }, color: '#a78bfa', shape: 'burst', startedAt: now, durationMs: 220, glow: 0.5 } as any);
            state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'special' as any, at: { r: rr, c: cc }, shape: 'rune', color: '#c4b5fd', color2: '#7c3aed', startedAt: now, durationMs: 220, sizeScale: 0.9, glow: 0.35 } as any);
            if (unit.team === 'player') {
              state.damageThisRound = state.damageThisRound || {};
              state.damageThisRound[unit.id] = (state.damageThisRound[unit.id] || 0) + aoe;
            }
          }
        }
      }
      // cleave
      if (ability?.type === 'cleave') {
        const cleaveDmg = Math.floor(damage * ability.ratio);
        for (const [k, id] of Object.entries(state.board)) {
          if (!id || id === target.id) continue;
          const [er, ec] = k.split(',').map(Number);
          if (Math.abs(er - tr) + Math.abs(ec - tc) === 1) {
            const aoe = state.units[id];
            if (aoe && aoe.team !== unit.team) {
              aoe.hp -= cleaveDmg;
              if (unit.team === 'player') {
                state.damageThisRound = state.damageThisRound || {};
                state.damageThisRound[unit.id] = (state.damageThisRound[unit.id] || 0) + cleaveDmg;
              }
              state.effects.push({
                id: `fx-${Math.random().toString(36).slice(2, 8)}`,
                type: 'hit',
                at: { r: er, c: ec },
                color: '#f96',
                shape: 'slash',
                startedAt: now,
                durationMs: 200,
                tier: starMult,
                sizeScale: 1 + (starMult - 1) * 0.15,
              glow: Math.max(0.4, starMult >= 3 ? 0.5 : 0.4),
                particles: 8 + (starMult - 1) * 4,
              });
            }
          }
        }
      }

      // 21) Gladiator + Valkyrie: Skyfall — on melee hit, add small smite ring at target
      if ((unit.templateKey === 'gladiator' || unit.templateKey === 'valkyrie') && teamHasTemplates(state, unit.team, ['gladiator','valkyrie']) && stats.range <= 1) {
        const [er, ec] = Object.entries(state.board).find(([_, id]) => id === target.id)![0].split(',').map(Number);
        state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'hit' as any, at: { r: er, c: ec }, color: '#fde68a', shape: 'smite', startedAt: now, durationMs: 220, glow: 0.6, power: 'synergy' } as any);
      }

      // 22) Rogue + Mystic: Bewilder — small chance to stun low-HP target on hit
      if ((unit.templateKey === 'rogue' || unit.templateKey === 'mystic') && teamHasTemplates(state, unit.team, ['rogue','mystic'])) {
        const baseHp = UNIT_TEMPLATES[target.templateKey].stats.hp * (target.star || 1);
        if (target.hp <= Math.floor(baseHp * 0.35) && Math.random() < 0.15) {
          target.status = target.status || {};
          target.status.stunnedUntil = Math.max(target.status.stunnedUntil || 0, now + 450);
          const [er, ec] = Object.entries(state.board).find(([_, id]) => id === target.id)![0].split(',').map(Number);
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'special' as any, at: { r: er, c: ec }, shape: 'rune', color: '#fca5a5', color2: '#a78bfa', startedAt: now, durationMs: 220, sizeScale: 0.9, glow: 0.5, power: 'synergy' } as any);
        }
      }

      // 23) Guardian + Champion: Bulwark Roar — small shield to allies adjacent to attacker
      if ((unit.templateKey === 'guardian' || unit.templateKey === 'champion') && teamHasTemplates(state, unit.team, ['guardian','champion']) && stats.range <= 1) {
        const neighbors = [ [r+1, c], [r-1, c], [r, c+1], [r, c-1] ];
        for (const [er, ec] of neighbors) {
          if (er < 0 || er >= BOARD_ROWS || ec < 0 || ec >= BOARD_COLS) continue;
          const idn = state.board[`${er},${ec}`];
          if (!idn) continue;
          const ally = state.units[idn];
          if (!ally || ally.team !== unit.team) continue;
          ally.shieldHp = (ally.shieldHp || 0) + 10 * (unit.star || 1);
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'ring' as any, at: { r: er, c: ec }, color: '#93c5fd', startedAt: now, durationMs: 200, maxRadiusCells: 0.5, rings: 2, glow: 0.4, power: 'synergy' } as any);
        }
      }

      // 24) Sentry + Marksman: Focus Fire — small chance to immediately refire at the same target
      if ((unit.templateKey === 'sentry' || unit.templateKey === 'marksman') && teamHasTemplates(state, unit.team, ['sentry','marksman']) && stats.range > 1) {
        if (Math.random() < 0.18) {
          const [er, ec] = Object.entries(state.board).find(([_, id]) => id === target.id)![0].split(',').map(Number);
          const extra = Math.floor(damage * 0.35);
          applyDamage(target, extra);
          const vis = getUnitVisual(unit.templateKey);
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'projectile' as any, from: { r, c }, to: { r: er, c: ec }, color: vis.accent, color2: vis.primary, shape: 'chakram', startedAt: now, durationMs: 200, tier: starMult, trail: true, sizeScale: 0.8, glow: 0.6, power: 'synergy' } as any);
          if (unit.team === 'player') {
            state.damageThisRound = state.damageThisRound || {};
            state.damageThisRound[unit.id] = (state.damageThisRound[unit.id] || 0) + extra;
          }
        }
      }

      // 25) Guardian + Valkyrie: Aerial Bulwark — grant shield to valkyrie when close to guardian
      if ((unit.templateKey === 'guardian' || unit.templateKey === 'valkyrie') && teamHasTemplates(state, unit.team, ['guardian','valkyrie'])) {
        // if both are adjacent in same column, valkyrie gains shield on hit
        const isV = unit.templateKey === 'valkyrie';
        const partner = Object.entries(state.board).find(([_, id]) => {
          if (!id) return false;
          const u = state.units[id];
          return u && u.team === unit.team && (u.templateKey === (isV ? 'guardian' : 'valkyrie'));
        });
        if (partner) {
          const [pr, pc] = partner[0].split(',').map(Number);
          if (pc === c && Math.abs(pr - r) === 1 && isV) {
            unit.shieldHp = (unit.shieldHp || 0) + 12 * (unit.star || 1);
            state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'ring' as any, at: { r, c }, color: '#93c5fd', startedAt: now, durationMs: 200, maxRadiusCells: 0.5, rings: 2, glow: 0.4, power: 'synergy' } as any);
          }
        }
      }

      // 26) Monk + Paladin: Serenity — small heal-over-time to the monk after attacking
      if ((unit.templateKey === 'monk' || unit.templateKey === 'paladin') && teamHasTemplates(state, unit.team, ['monk','paladin'])) {
        if (unit.templateKey === 'monk') {
          const baseHp = UNIT_TEMPLATES[unit.templateKey].stats.hp * (unit.star || 1);
          unit.hp = Math.min(baseHp, unit.hp + 3);
          state.effects.push({ id: `fx-${Math.random().toString(36).slice(2,8)}`, type: 'text' as any, at: { r, c }, value: `+3`, color: '#22c55e', startedAt: now, durationMs: 500, sizeScale: 0.8, power: 'synergy' } as any);
        }
      }
      // pierce: continue through target and hit the next enemy along the line
      if (ability?.type === 'pierce') {
        const dr = Math.sign(tr - r);
        const dc = Math.sign(tc - c);
        let pr = tr + dr;
        let pc = tc + dc;
        let piercedId: string | null = null;
        // scan forward up to range cells
        for (let step = 1; step <= stats.range; step++) {
          const key = `${pr},${pc}`;
          const id = state.board[key];
          if (id && state.units[id] && state.units[id].team !== unit.team) {
            piercedId = id;
            break;
          }
          pr += dr;
          pc += dc;
          if (pr < 0 || pr >= BOARD_ROWS || pc < 0 || pc >= BOARD_COLS) break;
        }
        if (piercedId) {
          const target2 = state.units[piercedId];
          const pierceDmg = Math.floor(damage * ability.ratio);
          target2.hp -= pierceDmg;
          if (unit.team === 'player') {
            state.damageThisRound = state.damageThisRound || {};
            state.damageThisRound[unit.id] = (state.damageThisRound[unit.id] || 0) + pierceDmg;
          }
          // visual: extra projectile or burst to the pierced target
          if (stats.range > 1) {
            const [er, ec] = Object.entries(state.board).find(([_, id]) => id === piercedId)![0]
              .split(',')
              .map(Number);
            state.effects.push({
              id: `fx-${Math.random().toString(36).slice(2, 8)}`,
              type: 'projectile',
              from: { r: tr, c: tc },
              to: { r: er, c: ec },
              color: '#a3e4d7',
              color2: '#d6fff4',
              shape: 'shard',
              startedAt: now,
              durationMs: Math.floor(220 * (starMult === 3 ? 0.8 : starMult === 2 ? 0.9 : 1)),
              tier: starMult,
              trail: starMult >= 2,
              sizeScale: 1 + (starMult - 1) * 0.15,
              glow: starMult >= 3 ? 0.5 : 0,
            });
            state.effects.push({
              id: `fx-${Math.random().toString(36).slice(2, 8)}`,
              type: 'hit',
              at: { r: er, c: ec },
              color: '#0ea5e9',
              shape: 'impact',
              startedAt: now,
              durationMs: 220,
              tier: starMult,
              sizeScale: 1.1,
              glow: 0.4,
            });
          } else {
            state.effects.push({
              id: `fx-${Math.random().toString(36).slice(2, 8)}`,
              type: 'hit',
              at: { r: pr, c: pc },
              color: '#0ea5e9',
              shape: 'burst',
              startedAt: now,
              durationMs: 240,
              glow: 0.4,
            });
          }
        }
      }
      // multishot
      if (ability?.type === 'multishot') {
        const extraTargets = ability.extraTargets;
        const ratio = ability.ratio;
        const candidates: string[] = [];
        for (const [k, id] of Object.entries(state.board)) {
          if (!id || id === target.id) continue;
          const [er, ec] = k.split(',').map(Number);
          const dist = Math.abs(er - r) + Math.abs(ec - c);
          if (dist <= stats.range) candidates.push(id);
        }
        candidates.slice(0, extraTargets).forEach((tid) => {
          const t2 = state.units[tid];
          if (!t2 || t2.team === unit.team) return;
          const [er, ec] = Object.entries(state.board).find(([_, id]) => id === tid)![0]
            .split(',')
            .map(Number);
          // fire additional projectile to each extra target
          state.effects.push({
            id: `fx-${Math.random().toString(36).slice(2, 8)}`,
            type: 'projectile',
            from: { r, c },
            to: { r: er, c: ec },
            color: '#0ea5e9',
            color2: '#fff',
            shape: 'arrow',
            startedAt: now,
            durationMs: Math.floor(300 * (starMult === 3 ? 0.8 : starMult === 2 ? 0.9 : 1)),
            tier: starMult,
            trail: true,
            sizeScale: 1 + (starMult - 1) * 0.15,
            glow: starMult >= 2 ? 0.35 : 0,
          });
          state.effects.push({
            id: `fx-${Math.random().toString(36).slice(2, 8)}`,
            type: 'hit',
            at: { r: er, c: ec },
            color: '#0ea5e9',
            shape: 'impact',
            startedAt: now,
            durationMs: 220,
            tier: starMult,
            sizeScale: 1.05,
            glow: 0.35,
          });
          const dmg2 = Math.floor(damage * ratio);
          t2.hp -= dmg2;
          if (unit.team === 'player') {
            state.damageThisRound = state.damageThisRound || {};
            state.damageThisRound[unit.id] = (state.damageThisRound[unit.id] || 0) + dmg2;
          }
        });
      }
      if (target.hp <= 0) {
        for (const [k, id] of Object.entries(state.board)) if (id === target.id) state.board[k] = undefined;
        state.log.push(`${target.templateKey} dies`);
        // death effects
        const visDeath = getUnitVisual(target.templateKey);
        state.effects.push({ id: `fx-${Math.random().toString(36).slice(2, 8)}`, type: 'decal' as any, at: { r: tr, c: tc }, color: visDeath.primary, shape: 'slashmark', startedAt: now, durationMs: 900, sizeScale: 1.1, rotationDeg: Math.floor(Math.random()*60-30) } as any);
        state.effects.push({ id: `fx-${Math.random().toString(36).slice(2, 8)}`, type: 'ring', at: { r: tr, c: tc }, color: '#111827', startedAt: now, durationMs: 500, maxRadiusCells: 1, tier: 1, rings: 2, glow: 0.1 });
      }
      continue; // skip movement this tick if attacked
    }

    // move towards target if out of range and cooldown ready
    const slowFactor = unit.status?.slowUntil && unit.status.slowUntil > now ? (unit.status.slowFactor ?? 1) : 1;
    if ((unit.items || []).includes('swift_gloves')) moveCd = Math.floor(moveCd * 0.95);
    const effectiveMoveMs = Math.floor(moveCd / slowFactor);
    if (bestDist > stats.range && (now - unit.lastMoveAt >= effectiveMoveMs)) {
      unit.lastMoveAt = now;
      const [tr, tc] = Object.entries(state.board).find(([_, id]) => id === targetId)![0]
        .split(',')
        .map(Number);
      // consider all 4 neighbors and pick empty with smallest distance to target
      const neighbors = [
        { nr: r + 1, nc: c },
        { nr: r - 1, nc: c },
        { nr: r, nc: c + 1 },
        { nr: r, nc: c - 1 },
      ].filter(({ nr, nc }) => nr >= 0 && nr < BOARD_ROWS && nc >= 0 && nc < BOARD_COLS);
      const scored = neighbors
        .filter(({ nr, nc }) => !state.board[`${nr},${nc}`])
        .map(({ nr, nc }) => ({ nr, nc, dist: Math.abs(tr - nr) + Math.abs(tc - nc) }));
      if (scored.length > 0) {
        scored.sort((a, b) => a.dist - b.dist || Math.random() - 0.5);
        const best = scored[0];
        const fromR = r;
        const fromC = c;
        const fromKey = `${fromR},${fromC}`;
        const toKey = `${best.nr},${best.nc}`;
        // spawn a small footstep dust effect at the origin tile when moving
        const tKey = UNIT_TEMPLATES[unit.templateKey];
        const vis = getUnitVisual(unit.templateKey);
        const dustScale = tKey.stats.range <= 1 ? 1 : tKey.stats.range === 2 ? 0.9 : 0.8;
        // class-thematic variant & colors
        let variant: 'dust' | 'ice' | 'leaves' | 'sparks' | 'motes' | 'shadow' = 'dust';
        let color = unit.team === 'player' ? '#94a3b8' : '#9ca3af';
        let color2: string | undefined = undefined;
        switch (unit.templateKey) {
          case 'frost':
          case 'icearcher':
            variant = 'ice';
            color = '#93c5fd';
            color2 = '#e0f2fe';
            break;
          case 'druid':
            variant = 'leaves';
            color = '#86efac';
            color2 = '#bbf7d0';
            break;
          case 'berserker':
            variant = 'sparks';
            color = '#f59e0b';
            color2 = '#ef4444';
            break;
          case 'warlock':
          case 'sorcerer':
          case 'mage':
          case 'mystic':
          case 'witch':
            variant = 'motes';
            color = '#a78bfa';
            color2 = '#e9d5ff';
            break;
          case 'gladiator':
          case 'champion':
          case 'guardian':
          case 'warrior':
            variant = 'sand';
            color = '#e9d5b1';
            color2 = '#f1e3c2';
            break;
          case 'pikeman':
          case 'spear':
          case 'phalanx':
          case 'javelin':
            variant = 'skid';
            color = '#67e8f9';
            color2 = '#0ea5e9';
            break;
          case 'valkyrie':
            variant = 'feather';
            color = '#fde68a';
            color2 = '#fbcfe8';
            break;
          case 'ballista':
            variant = 'track';
            color = '#9ca3af';
            color2 = '#6b7280';
            break;
          case 'paladin':
          case 'cleric':
          case 'monk':
            variant = 'motes';
            color = '#22c55e';
            color2 = '#a7f3d0';
            break;
          case 'rogue':
          case 'assassin':
            variant = 'shadow';
            color = '#0f172a';
            color2 = '#1f2937';
            break;
          default:
            // lightly tint to unit accent for diversity
            color = vis.secondary;
            color2 = vis.accent;
        }
        const starMult = unit.star || 1;
        const baseEffect = {
          id: `fx-${Math.random().toString(36).slice(2, 8)}`,
          type: 'foot',
          at: { r: fromR, c: fromC },
          color,
          color2,
          variant,
          startedAt: now,
          durationMs: 700,
          sizeScale: dustScale * (1 + (starMult - 1) * 0.18),
          dir: { dr: best.nr - fromR, dc: best.nc - fromC },
          glow: 0,
          tier: starMult,
        } as any;
        // three discrete footprints along the step, offset left/right
        state.effects.push({ ...baseEffect, id: `fx-${Math.random().toString(36).slice(2, 8)}`, dist: 0.18, side: 1 });
        state.effects.push({ ...baseEffect, id: `fx-${Math.random().toString(36).slice(2, 8)}`, dist: 0.42, side: -1 });
        state.effects.push({ ...baseEffect, id: `fx-${Math.random().toString(36).slice(2, 8)}`, dist: 0.68, side: 1 });
        state.board[fromKey] = undefined;
        state.board[toKey] = unit.id;
        r = best.nr;
        c = best.nc;
      }
    }
  }
}

function checkOutcome(state: GameState): { result: 'win' | 'loss'; message: string } | null {
  const boardIds = new Set(Object.values(state.board).filter(Boolean) as string[]);
  const playersAlive = Array.from(boardIds).some((id) => {
    const u = state.units[id];
    return u && u.team === 'player' && u.hp > 0;
  });
  const enemiesAlive = Array.from(boardIds).some((id) => {
    const u = state.units[id];
    return u && u.team === 'enemy' && u.hp > 0;
  });

  if (playersAlive && enemiesAlive) return null;

  if (playersAlive && !enemiesAlive) {
    state.roundResult = { wasWin: true, hpLoss: 0 };
    state.log.push('You win!');
    return { result: 'win', message: 'Victory! Click Next Round.' };
  }

  if (!playersAlive && enemiesAlive) {
    const survivingEnemies = Array.from(boardIds)
      .map((id) => state.units[id])
      .filter((u) => u && u.team === 'enemy' && u.hp > 0);
    const hpLoss = survivingEnemies.reduce((total, u) => total + (u.star || 1), 2);
    const oldHealth = state.health;
    state.health = Math.max(0, oldHealth - hpLoss);
    state.recentHpAnim = { from: oldHealth, to: state.health, startedAt: performance.now(), durationMs: 900 };
    state.roundResult = { wasWin: false, hpLoss };
    state.log.push(`You lose the round, taking ${hpLoss} damage.`);
    return { result: 'loss', message: 'Defeat. Click Next Round.' };
  }

  // both dead → draw
  state.roundResult = { wasWin: false, hpLoss: 0 };
  return { result: 'loss', message: 'Draw. Click Next Round.' };
}

// Three-of-a-kind combination into higher star
function tryCombine(state: GameState, templateKey: string, team: 'player' | 'enemy'): void {
  // Collect all units of this template and team by star
  const players = Object.values(state.units).filter((u) => u.team === team && u.templateKey === templateKey);
  const byStar = new Map<number, UnitInstance[]>();
  for (const u of players) {
    const arr = byStar.get(u.star) ?? [];
    arr.push(u);
    byStar.set(u.star, arr);
  }
  // attempt combine for star 1 -> 2, then 2 -> 3
  for (const star of [1, 2]) {
    const list = byStar.get(star);
    if (!list || list.length < 3) continue;
    // take any three
    const group = list.slice(0, 3);
    // determine placement: use the position of the first unit if on board, else bench
    const primary = group[0];
    const primaryPosKey = findUnitOnBoard(state.board, primary.id);
    // remove the three units
    for (const u of group) {
      delete state.units[u.id];
      state.bench = state.bench.filter((id) => id !== u.id);
      const k = findUnitOnBoard(state.board, u.id);
      if (k) state.board[k] = undefined;
    }
    // create the upgraded unit
    const upgraded = createUnit(templateKey, team);
    upgraded.star = star + 1;
    // scale stats by star: 1x, 2x, 3x baseline
    const base = UNIT_TEMPLATES[templateKey].stats;
    const scale = upgraded.star; // 2 or 3
    upgraded.hp = base.hp * scale;
    state.units[upgraded.id] = upgraded;
    if (primaryPosKey) {
      state.board[primaryPosKey] = upgraded.id;
    } else {
      if (team === 'player') {
        state.bench.push(upgraded.id);
      } else {
        // place enemy upgraded unit at first available top-half cell
        let placed = false;
        for (let rr = 0; rr < Math.min(3, BOARD_ROWS); rr++) {
          for (let cc = 0; cc < BOARD_COLS; cc++) {
            const kk = `${rr},${cc}`;
            if (!state.board[kk]) {
              state.board[kk] = upgraded.id;
              placed = true;
              break;
            }
          }
          if (placed) break;
        }
        if (!placed) {
          // as a fallback, discard to avoid leaking into player's bench
          delete state.units[upgraded.id];
        }
      }
    }
    state.log.push(`${templateKey} combined to ${upgraded.star}-star!`);
    // recursive combine in case this creates another triple
    tryCombine(state, templateKey, team);
    break;
  }
}

// --- Synergies & Items helpers ---
function computeSynergyTiers(state: GameState, team: 'player' | 'enemy'): Record<string, 0 | 1 | 2 | 3> {
  const counts: Record<string, number> = {};
  for (const [cell, id] of Object.entries(state.board)) {
    if (!id) continue;
    const u = state.units[id];
    if (!u || u.team !== team) continue;
    const traits = getUnitTraits(u.templateKey);
    for (const t of traits) counts[t] = (counts[t] ?? 0) + 1;
  }
  const tiers: Record<string, 0 | 1 | 2 | 3> = {} as any;
  for (const [trait, n] of Object.entries(counts)) {
    let tier: 0 | 1 | 2 | 3 = 0;
    if (n >= 6) tier = 3; else if (n >= 4) tier = 2; else if (n >= 2) tier = 1; else tier = 0;
    tiers[trait] = tier;
  }
  return tiers;
}

function applySynergyPreBuffs(state: GameState, team: 'player' | 'enemy'): void {
  const tiers = computeSynergyTiers(state, team);
  // Vanguard shield at round start
  const shield = [0, 14, 26, 40][tiers.Vanguard || 0];
  if (shield > 0) {
    for (const id of Object.values(state.board)) {
      if (!id) continue;
      const u = state.units[id];
      if (!u || u.team !== team) continue;
      u.shieldHp = Math.max(u.shieldHp || 0, shield * (u.star || 1));
    }
  }
}

function teamHasTemplates(s: GameState, team: 'player' | 'enemy', keys: [string, string]): boolean {
  const have = new Set(
    Object.values(s.units)
      .filter((u) => u.team === team)
      .map((u) => u.templateKey)
  );
  return have.has(keys[0]) && have.has(keys[1]);
}

function teamHasAll(s: GameState, team: 'player' | 'enemy', keys: string[]): boolean {
  const have = new Set(
    Object.values(s.units)
      .filter((u) => u.team === team)
      .map((u) => u.templateKey)
  );
  for (const k of keys) if (!have.has(k)) return false;
  return true;
}

function applyDamage(u: UnitInstance, amount: number): void {
  let remaining = amount;
  if (u.damageReductionPct && u.damageReductionPct > 0) {
    remaining = remaining * (1 - Math.max(0, Math.min(0.9, u.damageReductionPct)));
  }
  if (u.shieldHp && u.shieldHp > 0) {
    const absorb = Math.min(u.shieldHp, remaining);
    u.shieldHp -= absorb;
    remaining -= absorb;
  }
  if (remaining > 0) u.hp -= Math.floor(remaining);
}

function tryGrantRandomItemToTeam(s: GameState, team: 'player' | 'enemy', chance: number): void {
  if (Math.random() >= chance) return;
  const roster = Object.values(s.units).filter((u) => u.team === team);
  if (roster.length === 0) return;
  const items: ItemKey[] = ['berserker_axe','swift_gloves','vampiric_fang','frost_rune','shield_amulet','barbed_blade'];
  const picked = items[Math.floor(Math.random() * items.length)];
  const u = roster[Math.floor(Math.random() * roster.length)];
  u.items = u.items || [];
  if (u.items.length >= 2) return; // cap lower to avoid runaway
  u.items.push(picked);
  if (team === 'player') s.log.push(`Found item: ${picked.replace(/_/g,' ')}, equipped to ${u.templateKey}.`);
  if (picked === 'shield_amulet') {
    const base = 24 * (u.star || 1);
    u.shieldHp = (u.shieldHp || 0) + base;
  }
}

function applyEnemyVarietyModifiers(s: GameState): void {
  // Simple themed rounds: every 5th round is Elite, every 10th is Boss
  if (s.round % 10 === 0) {
    // Boss: enemies gain +25% hp and +15% atk this round
    for (const u of Object.values(s.units)) {
      if (u.team !== 'enemy') continue;
      const base = UNIT_TEMPLATES[u.templateKey].stats;
      u.hp = Math.floor(u.hp * 1.25);
      // store a temporary marker via shieldHp negative to avoid schema bloat (not ideal, but simple)
      // damage calculation multiplies atk via bonus applied elsewhere; here we can piggyback via star-based damage scaling at source
    }
    s.log.push('Boss modifiers active: enemy strength increased.');
  } else if (s.round % 5 === 0) {
    // Elite: enemies gain small shield (scaled slightly higher)
    for (const u of Object.values(s.units)) if (u.team === 'enemy') u.shieldHp = (u.shieldHp || 0) + 26 * (u.star || 1);
    s.log.push('Elite modifiers active: enemy shields fortified.');
  }
}

// --- Placement mechanics ---
function applyFrontlineProtector(s: GameState): void {
  // Reset per-combat placement buffs
  for (const u of Object.values(s.units)) {
    u.coverAtkBonus = 0;
    u.damageReductionPct = 0;
  }
  // For each column, scan from the player's side inward and award cover
  for (let c = 0; c < BOARD_COLS; c++) {
    // Player side: bottom half
    for (let r = BOARD_ROWS - 1; r >= Math.floor(BOARD_ROWS / 2); r--) {
      const id = s.board[`${r},${c}`];
      const behindId = s.board[`${r - 1},${c}`];
      if (!id || !behindId) continue;
      const front = s.units[id];
      const back = s.units[behindId];
      if (!front || !back) continue;
      if (front.team === 'player' && back.team === 'player') {
        const frontStats = UNIT_TEMPLATES[front.templateKey].stats;
        const backStats = UNIT_TEMPLATES[back.templateKey].stats;
        if (frontStats.range <= 1 && backStats.range >= 3) {
          back.coverAtkBonus = (back.coverAtkBonus || 0) + 3; // small atk bump
          back.damageReductionPct = Math.min(0.2, (back.damageReductionPct || 0) + 0.12); // DR vs incoming
        }
      }
    }
    // Enemy side: top half
    for (let r = 0; r < Math.floor(BOARD_ROWS / 2) - 1; r++) {
      const id = s.board[`${r},${c}`];
      const behindId = s.board[`${r + 1},${c}`];
      if (!id || !behindId) continue;
      const front = s.units[id];
      const back = s.units[behindId];
      if (!front || !back) continue;
      if (front.team === 'enemy' && back.team === 'enemy') {
        const frontStats = UNIT_TEMPLATES[front.templateKey].stats;
        const backStats = UNIT_TEMPLATES[back.templateKey].stats;
        if (frontStats.range <= 1 && backStats.range >= 3) {
          back.coverAtkBonus = (back.coverAtkBonus || 0) + 3;
          back.damageReductionPct = Math.min(0.2, (back.damageReductionPct || 0) + 0.12);
        }
      }
    }
  }
}

function isLineBlocked(s: GameState, r: number, c: number, tr: number, tc: number, team: 'player' | 'enemy'): boolean {
  // Only consider axis-aligned direct lines to avoid heavy math; diagonal assumed clear
  if (r !== tr && c !== tc) return false;
  if (r === tr) {
    const step = c < tc ? 1 : -1;
    for (let cc = c + step; cc !== tc; cc += step) {
      const id = s.board[`${r},${cc}`];
      if (!id) continue;
      const u = s.units[id];
      if (u && u.hp > 0) return true;
    }
  } else {
    const step = r < tr ? 1 : -1;
    for (let rr = r + step; rr !== tr; rr += step) {
      const id = s.board[`${rr},${c}`];
      if (!id) continue;
      const u = s.units[id];
      if (u && u.hp > 0) return true;
    }
  }
  return false;
}

function countAdjacentAllies(s: GameState, r: number, c: number, team: 'player' | 'enemy'): number {
  let count = 0;
  const neigh = [
    [r + 1, c],
    [r - 1, c],
    [r, c + 1],
    [r, c - 1],
  ];
  for (const [rr, cc] of neigh) {
    if (rr < 0 || rr >= BOARD_ROWS || cc < 0 || cc >= BOARD_COLS) continue;
    const id = s.board[`${rr},${cc}`];
    if (!id) continue;
    const u = s.units[id];
    if (u && u.team === team && u.hp > 0) count++;
  }
  return count;
}

