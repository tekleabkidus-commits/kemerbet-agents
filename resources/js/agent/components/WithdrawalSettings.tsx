import { useState, useEffect } from 'react';
import type { AgentWithdrawalSettings } from '../types';

interface Props {
  settings: AgentWithdrawalSettings;
  isProcessing: boolean;
  onSave: (accepts: boolean, max: number | null) => void;
}

// Colors match the concept mockup (navy/green/gold).
const GOLD = '#f5c518';
const GREEN = '#00a86b';

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

export default function WithdrawalSettings({ settings, isProcessing, onSave }: Props) {
  const [accepts, setAccepts] = useState(settings.accepts_withdrawals);
  const [max, setMax] = useState<number>(
    settings.withdrawal_max ?? settings.global_max_default,
  );

  // Re-sync when the server sends fresh state (e.g. after save or refetch).
  useEffect(() => {
    setAccepts(settings.accepts_withdrawals);
    setMax(settings.withdrawal_max ?? settings.global_max_default);
  }, [settings.accepts_withdrawals, settings.withdrawal_max, settings.global_max_default]);

  const min = settings.global_min;
  const ceiling = settings.global_max_default;
  const step = 1000;

  const clamp = (v: number) => Math.max(min, Math.min(v, ceiling));
  const dirty =
    accepts !== settings.accepts_withdrawals ||
    (accepts && max !== (settings.withdrawal_max ?? settings.global_max_default));

  const hasId = !!settings.withdrawal_id;

  return (
    <div className="withdrawal-settings" style={styles.wrap}>
      <div style={styles.header}>
        <span style={styles.title}>Withdrawal settings</span>
        {accepts && (
          <span style={styles.capChip}>Up to {fmt(max)} ETB</span>
        )}
      </div>

      {/* mode toggle */}
      <div style={styles.seg}>
        <button
          type="button"
          disabled={isProcessing}
          onClick={() => setAccepts(false)}
          style={{ ...styles.segBtn, ...(!accepts ? styles.segOnDeposit : {}) }}
        >
          Deposit only
        </button>
        <button
          type="button"
          disabled={isProcessing}
          onClick={() => setAccepts(true)}
          style={{ ...styles.segBtn, ...(accepts ? styles.segOnBoth : {}) }}
        >
          Deposit + Withdraw
        </button>
      </div>

      {accepts && (
        <div style={styles.field}>
          <label style={styles.label}>Maximum I can pay out right now</label>
          <div style={styles.stepper}>
            <button
              type="button"
              disabled={isProcessing || max <= min}
              onClick={() => setMax(clamp(max - step))}
              style={styles.stepBtn}
            >
              −
            </button>
            <div style={styles.stepVal}>{fmt(max)} ETB</div>
            <button
              type="button"
              disabled={isProcessing || max >= ceiling}
              onClick={() => setMax(clamp(max + step))}
              style={styles.stepBtn}
            >
              +
            </button>
          </div>
          <div style={styles.note}>
            Lower this any time you&apos;re running low on cash — players asking for
            more than this won&apos;t see you. Range: {fmt(min)}–{fmt(ceiling)} ETB
            (set by admin).
          </div>
        </div>
      )}

      {/* admin-managed withdrawal ID — read only */}
      <div style={styles.field}>
        <label style={styles.label}>
          My Withdrawal ID <span style={{ color: GOLD, textTransform: 'none', letterSpacing: 0 }}>· set by admin</span>
        </label>
        <div style={styles.readonly}>
          <span>{settings.withdrawal_id ?? 'Not set'}</span>
          <span style={styles.lock}>🔒 READ ONLY</span>
        </div>
        <div style={styles.note}>
          {hasId
            ? "Players' auto-message includes this ID so they can start the withdrawal immediately. Wrong ID? Contact admin — only they can change it."
            : "You have no Withdrawal ID yet, so you won't appear for withdrawals. Contact admin to set one."}
        </div>
      </div>

      <button
        type="button"
        disabled={isProcessing || !dirty}
        onClick={() => onSave(accepts, accepts ? max : null)}
        style={{ ...styles.save, ...(!dirty || isProcessing ? styles.saveDisabled : {}) }}
      >
        Save withdrawal settings
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 },
  title: { fontSize: '0.85rem', fontWeight: 800, letterSpacing: '-0.2px' },
  capChip: {
    fontSize: '0.66rem', fontWeight: 800, padding: '5px 10px', borderRadius: 999,
    background: 'rgba(245,197,24,0.12)', color: GOLD, border: '1px solid rgba(245,197,24,0.35)',
  },
  seg: { display: 'flex', background: 'rgba(5,13,26,0.5)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 3, marginBottom: 14 },
  segBtn: { flex: 1, border: 0, background: 'transparent', color: '#6b7a8f', fontWeight: 800, fontSize: '0.68rem', padding: '9px 4px', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit' },
  segOnBoth: { background: `linear-gradient(135deg,${GOLD},#ffd93d)`, color: '#050d1a', boxShadow: '0 2px 8px rgba(245,197,24,0.3)' },
  segOnDeposit: { background: `linear-gradient(135deg,${GREEN},#078343)`, color: '#fff', boxShadow: '0 2px 8px rgba(0,168,107,0.3)' },
  field: { marginBottom: 13 },
  label: { fontSize: '0.64rem', color: '#a8b3c1', display: 'block', marginBottom: 6, fontWeight: 800, letterSpacing: '0.6px', textTransform: 'uppercase' },
  stepper: { display: 'flex', alignItems: 'center', gap: 9 },
  stepBtn: { width: 40, height: 42, borderRadius: 11, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: GOLD, fontSize: 17, cursor: 'pointer', fontWeight: 800 },
  stepVal: { flex: 1, textAlign: 'center', background: 'rgba(245,197,24,0.07)', border: '1px solid rgba(245,197,24,0.4)', borderRadius: 11, padding: 11, fontWeight: 900, fontSize: '0.95rem', color: GOLD },
  note: { fontSize: '0.6rem', color: '#6b7a8f', marginTop: 6, lineHeight: 1.6 },
  readonly: { width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 11, padding: '11px 12px', color: '#a8b3c1', fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  lock: { fontSize: '0.58rem', color: '#6b7a8f', fontWeight: 700 },
  save: { width: '100%', border: 0, borderRadius: 12, padding: 13, background: `linear-gradient(135deg,${GREEN},#078343)`, color: '#fff', fontWeight: 900, fontSize: '0.82rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,168,107,0.25)', letterSpacing: '0.3px', fontFamily: 'inherit', marginTop: 2 },
  saveDisabled: { background: 'rgba(255,255,255,0.08)', color: '#6b7a8f', boxShadow: 'none', cursor: 'default' },
};
