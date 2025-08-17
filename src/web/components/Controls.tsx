import React from 'react';
import { useGameStore } from '../../world/state';

export function Controls(): JSX.Element {
	const phase = useGameStore((s) => s.phase);
	const startCombat = useGameStore((s) => s.startCombat);
	const nextRound = useGameStore((s) => s.nextRound);
	const cellSize = useGameStore((s) => s.cellSize);
	const setCellSize = useGameStore((s) => s.setCellSize);
	const combatSpeed = useGameStore((s) => s.combatSpeed || 0.5);
	const setCombatSpeed = useGameStore((s) => s.setCombatSpeed as any);
	const round = useGameStore((s) => s.round);
  const paused = useGameStore((s) => s.paused || false);
  const togglePause = useGameStore((s) => s.togglePause as any);

	return (
		<div style={{ marginTop: 8 }}>
			<div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
				{phase === 'prep' && (
					<FancyButton
						label={`Start Combat · R${round}`}
						accent={'var(--accent)'}
						variant="filled"
						onClick={() => startCombat()}
					/>
				)}
				{phase === 'combat' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <FancyButton label={paused ? 'Resume' : 'Pause'} accent={paused ? '#22c55e' : '#f59e0b'} variant="filled" onClick={() => togglePause && togglePause()} />
            <FancyButton label={paused ? 'Paused' : 'Simulating…'} accent="#9aa3b2" variant="filled" disabled pulse={!paused} />
          </div>
        )}
				{phase === 'result' && (
					<FancyButton label="Next Round" accent="#22c55e" variant="filled" pulse onClick={() => nextRound()} />
				)}
			</div>
			<div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
				<span style={{ fontSize: 12, color: 'var(--muted)' }}>Board size</span>
				<input
					type="range"
					min={48}
					max={240}
					step={2}
					value={cellSize}
					onChange={(e) => setCellSize(Number(e.target.value))}
				/>
				<span style={{ width: 36, textAlign: 'right', fontSize: 12 }}>{cellSize}px</span>
				<span style={{ marginLeft: 14, fontSize: 12, color: 'var(--muted)' }}>Speed</span>
				<input
					type="range"
					min={0.1}
					max={4}
					step={0.05}
					value={combatSpeed}
					onChange={(e) => setCombatSpeed && setCombatSpeed(Math.max(0.1, Math.min(4, Number(e.target.value))))}
				/>
				<span style={{ width: 36, textAlign: 'right', fontSize: 12 }}>{combatSpeed.toFixed(2)}x</span>
			</div>
		</div>
	);
}

function FancyButton({ label, onClick, disabled, accent, pulse, variant }: { label: string; onClick?: () => void; disabled?: boolean; accent: string; pulse?: boolean; variant?: 'filled' | 'outline' }): JSX.Element {
  const isFilled = variant === 'filled';
  const base = {
    padding: '12px 18px',
    minHeight: 40,
    borderRadius: 12,
    border: `1px solid ${accent}`,
    background: isFilled ? `linear-gradient(180deg, ${accent}, ${accent})` : `linear-gradient(180deg, ${accent}2A, ${accent}14)`,
    color: isFilled ? '#ffffff' : 'var(--text)',
    fontWeight: 900,
    fontSize: 14,
    letterSpacing: 0.6,
    cursor: disabled ? 'default' as const : 'pointer' as const,
    boxShadow: isFilled ? `0 8px 24px ${accent}55, 0 0 0 1px ${accent}55 inset` : `0 8px 20px ${accent}22, inset 0 0 0 1px ${accent}22`,
    position: 'relative' as const,
    overflow: 'hidden' as const,
    transition: 'transform 120ms ease, box-shadow 120ms ease, filter 120ms ease',
    userSelect: 'none' as const,
    whiteSpace: 'nowrap' as const,
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    maxWidth: '100%',
    flex: '0 0 auto' as const,
    animation: pulse && !disabled ? 'btnPulse 1.4s ease-in-out infinite' : undefined,
    gap: 8,
  };
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      onMouseDown={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(1px) scale(0.995)';
      }}
      onMouseUp={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0) scale(1)';
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0) scale(1.03) rotate(-0.4deg)';
        (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.06) saturate(1.2)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0) scale(1)';
        (e.currentTarget as HTMLButtonElement).style.filter = 'none';
      }}
      style={base as React.CSSProperties}
    >
      {isFilled && !disabled && (
        <span style={{ position: 'absolute', inset: -6, borderRadius: 16, filter: 'blur(12px)', background: 'var(--accent)', opacity: 0.35, pointerEvents: 'none' }} />
      )}
      {/* glossy top highlight */}
      <span style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '46%', background: 'linear-gradient(180deg, rgba(255,255,255,0.25), rgba(255,255,255,0))', pointerEvents: 'none' }} />
      {/* animated diagonal texture for depth */}
      <span style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient( 45deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 2px, transparent 2px, transparent 8px )', mixBlendMode: 'overlay', backgroundSize: '200% 200%', animation: 'slantMove 6s linear infinite', pointerEvents: 'none' }} />
      {pulse && !disabled && (
        <>
          <span style={{ position: 'absolute', inset: -3, borderRadius: 14, boxShadow: `0 0 18px ${accent}88, 0 0 36px ${accent}55`, pointerEvents: 'none' }} />
          <span style={{ position: 'absolute', top: 0, left: '-30%', width: '30%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)', transform: 'skewX(-20deg)', animation: 'sheen 1.8s linear infinite', pointerEvents: 'none' }} />
        </>
      )}
      {/* sparkle accents */}
      {isFilled && !disabled && (
        <>
          <span style={{ position: 'absolute', top: 6, left: 10, width: 6, height: 6, borderRadius: 999, background: '#fff', filter: 'blur(0.5px)', opacity: 0.85, animation: 'spark 1.8s ease-in-out infinite' }} />
          <span style={{ position: 'absolute', bottom: 6, right: 12, width: 5, height: 5, borderRadius: 999, background: '#fff', filter: 'blur(0.5px)', opacity: 0.85, animation: 'spark 2.2s 0.4s ease-in-out infinite' }} />
          <span style={{ position: 'absolute', top: 10, right: 18, width: 4, height: 4, borderRadius: 999, background: '#fff', filter: 'blur(0.5px)', opacity: 0.8, animation: 'spark 2.6s 0.2s ease-in-out infinite' }} />
        </>
      )}
      <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        {label.toLowerCase().includes('start') && (
          <svg width={16} height={16} viewBox="0 0 24 24" fill="#fff" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
        {label.toLowerCase().includes('next') && (
          <svg width={16} height={16} viewBox="0 0 24 24" fill="#fff" aria-hidden>
            <path d="M12 4l1.41 1.41L8.83 10H20v2H8.83l4.58 4.59L12 18l-8-8 8-8z" />
          </svg>
        )}
        {label.toLowerCase().includes('simulating') && (
          <svg width={16} height={16} viewBox="0 0 24 24" fill="#fff" aria-hidden>
            <path d="M12 6v12m-6-6h12" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {label}
      </span>
      <style>{`
        @keyframes btnPulse { 0% { transform: scale(1); } 50% { transform: scale(1.02); } 100% { transform: scale(1); } }
        @keyframes sheen { 0% { left: -30%; } 100% { left: 130%; } }
        @keyframes slantMove { 0% { background-position: 0% 0%; } 100% { background-position: 200% 200%; } }
        @keyframes spark { 0%, 100% { transform: scale(0.8); opacity: 0.55; } 50% { transform: scale(1.15); opacity: 1; } }
      `}</style>
    </button>
  );
}


