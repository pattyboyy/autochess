import React from 'react';

type RunRow = {
  id: string;
  when: number;
  rounds: number;
  durationMs: number;
  level: number;
  hp: number;
  comp: Array<{ templateKey: string; star: number }>;
};

export function Leaderboard(): JSX.Element {
  const [rows, setRows] = React.useState<RunRow[]>([]);
  React.useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem('leaderboard') || '[]');
      if (Array.isArray(data)) setRows(data.sort((a, b) => b.when - a.when));
    } catch {}
  }, []);

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontWeight: 800, letterSpacing: 0.3, color: 'var(--text)' }}>Leaderboard</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => {
              try {
                const data = JSON.parse(localStorage.getItem('leaderboard') || '[]');
                if (Array.isArray(data)) setRows(data.sort((a, b) => b.when - a.when));
              } catch {}
            }}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--panel-border)', background: 'rgba(14,165,233,0.08)', color: 'var(--text)', cursor: 'pointer' }}
          >
            Refresh
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('leaderboard');
              setRows([]);
            }}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(220,38,38,0.35)', background: 'rgba(220,38,38,0.08)', color: 'var(--bad)', cursor: 'pointer' }}
          >
            Clear
          </button>
        </div>
      </div>
      {rows.length === 0 ? (
        <div style={{ color: 'var(--muted)', fontSize: 12 }}>No runs recorded yet. Lose a game to record your first run.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ color: 'var(--muted)', textAlign: 'left' }}>
              <th style={{ padding: '8px 10px', width: '36%' }}>When</th>
              <th style={{ padding: '8px 10px', width: '10%' }}>Round</th>
              <th style={{ padding: '8px 10px', width: '14%' }}>Duration</th>
              <th style={{ padding: '8px 10px', width: '10%' }}>Level</th>
              <th style={{ padding: '8px 10px', width: '10%' }}>HP</th>
              <th style={{ padding: '8px 10px' }}>Comp</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid var(--panel-border)', verticalAlign: 'middle' }}>
                <td style={{ padding: '8px 10px', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{new Date(r.when).toLocaleString()}</td>
                <td style={{ padding: '8px 10px', color: 'var(--text)' }}>{r.rounds}</td>
                <td style={{ padding: '8px 10px', color: 'var(--text)' }}>{formatDuration(r.durationMs)}</td>
                <td style={{ padding: '8px 10px', color: 'var(--text)' }}>{r.level}</td>
                <td style={{ padding: '8px 10px', color: r.hp <= 0 ? 'var(--bad)' : 'var(--text)' }}>{r.hp}</td>
                <td style={{ padding: '8px 10px' }}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {r.comp.slice(0, 8).map((u, i) => (
                      <span key={i} style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.25)', borderRadius: 999, padding: '1px 6px', color: 'var(--text)', fontWeight: 600, fontSize: 11, lineHeight: '16px' }}>
                        {u.templateKey} {u.star}★
                      </span>
                    ))}
                    {r.comp.length > 8 && <span style={{ color: 'var(--muted)', fontSize: 11, paddingLeft: 4 }}>+{r.comp.length - 8} more</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}m ${ss}s`;
}


