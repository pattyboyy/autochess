import React from 'react';
import { useGameStore } from '../../world/state';
import { UnitChip } from './UnitChip';
import { UNIT_TEMPLATES } from '../../world/units';

export function Bench(): JSX.Element {
  const bench = useGameStore((s) => s.bench);
  const board = useGameStore((s) => s.board);
  const units = useGameStore((s) => s.units);
  const moveUnitToBoard = useGameStore((s) => s.moveUnitToBoard);
  const sellUnit = useGameStore((s) => s.sellUnit);
  const phase = useGameStore((s) => s.phase);
  const storeUnit = useGameStore((s) => s.storeUnit);
  const [isOver, setIsOver] = React.useState(false);

  const ownedByTemplate = React.useMemo(() => {
    const set = new Set<string>();
    for (const [, id] of Object.entries(board)) {
      if (!id) continue;
      const u = units[id];
      if (u && u.team === 'player') set.add(u.templateKey);
    }
    return set;
  }, [board, units]);

  const duoPairs: Array<[string, string]> = React.useMemo(() => [
    ['frost','marksman'], ['paladin','sorcerer'], ['assassin','rogue'], ['guardian','cleric'],
    ['hunter','beastmaster'], ['spear','phalanx'], ['mage','warlock'], ['druid','monk'],
    ['sniper','marksman'], ['ballista','sentry'], ['icearcher','frost'], ['knight','templar'],
    ['valkyrie','paladin'], ['archer','crossbow'], ['sorcerer','stormcaller'], ['warrior','berserker'],
    ['assassin','duelist'], ['pikeman','javelin'], ['guardian','paladin'], ['valkyrie','templar'],
    ['knight','guardian'], ['paladin','templar'], ['mage','frost'], ['warlock','witch'],
    ['sniper','crossbow'], ['druid','beastmaster'], ['cleric','medic'], ['gladiator','champion'],
    ['knight','paladin'], ['archer','hunter'], ['warlock','mystic'], ['ballista','slinger']
  ], []);

  // Trio definitions for readiness check
  const trioTriples: Array<[string, string, string]> = React.useMemo(() => [
    ['knight','paladin','templar'],
    ['archer','marksman','sniper'],
    ['guardian','champion','gladiator'],
    ['druid','monk','paladin'],
    ['sorcerer','warlock','witch'],
    ['pikeman','phalanx','spear'],
    ['cleric','monk','medic'],
    ['mage','sorcerer','stormcaller'],
    ['rogue','assassin','duelist'],
    ['guardian','shieldbearer','shieldman'],
    ['frost','icearcher','mystic'],
    ['ballista','sentry','slinger'],
    ['hunter','archer','beastmaster'],
  ], []);

  const benchHints = React.useMemo(() => {
    const map: Record<string, { canPair: boolean; partner?: string; canTrio: boolean }> = {};
    for (const id of bench) {
      const u = units[id];
      if (!u) continue;
      // Duo readiness: one matching partner already on the board
      let canPair = false; let partner: string | undefined;
      for (const [a,b] of duoPairs) {
        if (u.templateKey === a && ownedByTemplate.has(b)) { canPair = true; partner = b; break; }
        if (u.templateKey === b && ownedByTemplate.has(a)) { canPair = true; partner = a; break; }
      }
      // Trio readiness: the other two members already on the board
      let canTrio = false;
      for (const [a,b,c] of trioTriples) {
        if (u.templateKey === a && ownedByTemplate.has(b) && ownedByTemplate.has(c)) { canTrio = true; break; }
        if (u.templateKey === b && ownedByTemplate.has(a) && ownedByTemplate.has(c)) { canTrio = true; break; }
        if (u.templateKey === c && ownedByTemplate.has(a) && ownedByTemplate.has(b)) { canTrio = true; break; }
      }
      map[id] = { canPair, partner, canTrio };
    }
    return map;
  }, [bench, units, ownedByTemplate, duoPairs, trioTriples]);

  // Sort bench for display: Trio-ready first, then Duo-ready, then by cost desc
  const sortedBench = React.useMemo(() => {
    const score = (id: string) => {
      const hint = benchHints[id];
      return (hint?.canTrio ? 2 : 0) + (hint?.canPair ? 1 : 0);
    };
    const costOf = (id: string) => UNIT_TEMPLATES[units[id]?.templateKey || 'recruit']?.cost || 0;
    return [...bench].sort((a, b) => {
      const sa = score(a), sb = score(b);
      if (sb !== sa) return sb - sa;
      const ca = costOf(a), cb = costOf(b);
      if (cb !== ca) return cb - ca;
      return 0;
    });
  }, [bench, benchHints, units]);

  return (
    <div
      onDragOver={(e) => {
        if (phase !== 'prep') return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }}
      onDragEnter={() => phase === 'prep' && setIsOver(true)}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        if (phase !== 'prep') return;
        const id = e.dataTransfer.getData('text/plain');
        if (id) storeUnit(id);
      }}
      style={{ background: 'var(--panel)', border: '1px solid var(--panel-border)', borderRadius: 12, padding: 8, marginTop: 8, boxShadow: 'var(--shadow)', transition: 'box-shadow 120ms ease', boxSizing: 'border-box' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6, color: 'var(--text)' }}>
        <div style={{ fontWeight: 800 }}>Bench</div>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>{bench.length} slot(s)</div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', boxShadow: isOver ? 'inset 0 0 0 2px rgba(14,165,233,0.45)' : undefined, borderRadius: 10, padding: isOver ? 4 : 0 }}>
        {sortedBench.map((id) => {
          const hint = benchHints[id];
          return (
            <div key={id} style={{ position: 'relative' }}>
              <UnitChip
                unitId={id}
                draggable
                onDropToBoard={(pos) => phase === 'prep' && moveUnitToBoard(id, pos)}
                onSell={() => phase === 'prep' && sellUnit(id)}
              />
              {hint?.canTrio ? (
                <>
                  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 10, boxShadow: '0 0 0 2px rgba(167,139,250,0.9), 0 0 26px rgba(167,139,250,0.6) inset' }} />
                  <div style={{ position: 'absolute', top: -8, left: -8, background: '#a78bfa', color: '#0b1020', fontWeight: 900, fontSize: 10, padding: '2px 6px', borderRadius: 6, border: '1px solid #6d28d9', pointerEvents: 'none' }} title="Placing this will activate a trio synergy">
                    TRIO READY
                  </div>
                </>
              ) : hint?.canPair && (
                <>
                  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 10, boxShadow: '0 0 0 2px rgba(250,204,21,0.8), 0 0 22px rgba(250,204,21,0.6) inset' }} />
                  <div style={{ position: 'absolute', top: -8, left: -8, background: '#facc15', color: '#111827', fontWeight: 900, fontSize: 10, padding: '2px 6px', borderRadius: 6, border: '1px solid #b45309', pointerEvents: 'none' }} title={`Placing this will activate a duo synergy with ${UNIT_TEMPLATES[hint.partner!]?.name || hint.partner}`}>
                    {`DUO READY WITH ${UNIT_TEMPLATES[hint.partner!]?.name?.toUpperCase() || (hint.partner || '').toUpperCase()}`}
                  </div>
                </>
              )}
            </div>
          );
        })}
        {bench.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 12 }}>Empty</div>}
      </div>
    </div>
  );
}


