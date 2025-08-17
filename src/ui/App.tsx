import React from 'react';
import { useGameStore } from '../world/state';
import { Game } from '../web/Game';
import StrategyGuide from './StrategyGuide';

export function App(): JSX.Element {
  return (
    <div className="app-root">
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 className="app-title">Auto-Chess MVP</h1>
          <StrategyGuideButton />
          <ThemeToggle />
          <div style={{ marginLeft: 'auto' }} />
          <QuickHUD />
        </div>
      </header>
      <main>
        <Game />
        <ToastHost />
      </main>
    </div>
  );
}

function StrategyGuideButton(): JSX.Element {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          marginLeft: 'auto',
          padding: '6px 10px',
          borderRadius: 8,
          border: '1px solid var(--panel-border)',
          background: 'var(--panel)',
          color: 'var(--text)',
          fontWeight: 800,
          cursor: 'pointer',
          boxShadow: 'var(--shadow)'
        }}
        title="Open Strategy Guide"
      >
        Strategy Guide
      </button>
      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99 }} onClick={() => setOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: 70,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'min(1000px, 92vw)',
              maxHeight: '80vh',
              overflow: 'auto',
              background: 'var(--panel)',
              border: '1px solid var(--panel-border)',
              borderRadius: 12,
              boxShadow: 'var(--shadow)',
              padding: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>Strategy Guide</div>
              <button onClick={() => setOpen(false)} style={{ marginLeft: 'auto', padding: '4px 8px', borderRadius: 8, border: '1px solid var(--panel-border)', background: 'rgba(0,0,0,0.04)', cursor: 'pointer' }}>Close</button>
            </div>
            <StrategyGuide />
          </div>
        </div>
      )}
    </>
  );
}



function ThemeToggle(): JSX.Element {
  const [mode, setMode] = React.useState<string>(() => {
    try { return localStorage.getItem('themeMode') || (localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'); } catch { return 'light'; }
  });
  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-dark','theme-ocean','theme-forest','theme-ember');
    if (mode === 'dark') root.classList.add('theme-dark');
    else if (mode === 'ocean') root.classList.add('theme-ocean');
    else if (mode === 'forest') root.classList.add('theme-forest');
    else if (mode === 'ember') root.classList.add('theme-ember');
    try { localStorage.setItem('themeMode', mode); } catch {}
  }, [mode]);
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <select value={mode} onChange={(e) => setMode(e.target.value)}
        style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--panel-border)', background: 'var(--panel)', color: 'var(--text)', fontWeight: 800, cursor: 'pointer', boxShadow: 'var(--shadow)' }}
        title="Theme">
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="ocean">Ocean</option>
        <option value="forest">Forest</option>
        <option value="ember">Ember</option>
      </select>
    </div>
  );
}

function QuickHUD(): JSX.Element {
  const level = useGameStore((s) => s.level);
  const xp = useGameStore((s) => s.xp);
  const units = useGameStore((s) => s.units);
  const board = useGameStore((s) => s.board);
  const used = React.useMemo(() => Object.values(board).filter(Boolean).filter((id) => {
    const u = units[id as string]; return !!u && u.team === 'player';
  }).length, [board, units]);
  const cap = Math.min(15, level);
  const xpToNext = 4 + level * 2;
  const pct = Math.max(0, Math.min(1, xp / xpToNext));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div className="pill" title={`Level ${level} · XP ${xp}/${xpToNext}`} style={{ cursor: 'default' }}>
        <span className="key">Lv</span> <strong>{level}</strong>
        <div style={{ width: 80, height: 6, background: 'rgba(0,0,0,0.15)', borderRadius: 999, overflow: 'hidden', border: '1px solid var(--panel-border)', marginLeft: 8 }}>
          <div style={{ width: `${pct*100}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent), #fff)', borderRadius: 999 }} />
        </div>
      </div>
      <div className="pill" title="Units on board" style={{ cursor: 'default' }}>
        <span className="key">Units</span> <strong>{used}/{cap}</strong>
      </div>
    </div>
  );
}

function ToastHost(): JSX.Element {
  const toasts = useGameStore((s) => s.toasts || []);
  const dismiss = (id: string) => useGameStore.getState().dismissToast(id as any);
  React.useEffect(() => {
    const timers: number[] = [];
    for (const t of toasts) {
      const remain = Math.max(0, t.durationMs - (performance.now() - t.startedAt));
      timers.push(window.setTimeout(() => dismiss(t.id), remain));
    }
    return () => { timers.forEach((id) => clearTimeout(id)); };
  }, [toasts]);
  return (
    <div className="toast-host">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`} onClick={() => dismiss(t.id)} style={{ cursor: 'pointer' }}>
          <div className="dot" />
          <div style={{ fontWeight: 800, fontSize: 12 }}>{t.text}</div>
        </div>
      ))}
    </div>
  );
}

