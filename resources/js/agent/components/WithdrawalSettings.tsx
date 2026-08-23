import { useState, useEffect } from 'react';
import type { AgentWithdrawalSettings } from '../types';

interface Props {
  settings: AgentWithdrawalSettings;
  isProcessing: boolean;
  onSave: (accepts: boolean, max: number | null) => void;
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

export default function WithdrawalSettings({ settings, isProcessing, onSave }: Props) {
  const [accepts, setAccepts] = useState(settings.accepts_withdrawals);
  const [max, setMax] = useState<number>(
    settings.withdrawal_max ?? settings.global_max_default,
  );

  // Re-sync when the server sends fresh state (after save or periodic refetch).
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
    <div className="go-live-section">
      <div className="section-title">
        Withdrawal settings
        {accepts && <span className="wd-cap">Up to {fmt(max)} ETB</span>}
      </div>

      {/* mode toggle */}
      <div className="wd-seg">
        <button
          type="button"
          className={!accepts ? 'on-dep' : ''}
          disabled={isProcessing}
          onClick={() => setAccepts(false)}
        >
          Deposit only
        </button>
        <button
          type="button"
          className={accepts ? 'on-both' : ''}
          disabled={isProcessing}
          onClick={() => setAccepts(true)}
        >
          Deposit + Withdraw
        </button>
      </div>

      {accepts && (
        <div className="wd-field">
          <label className="wd-label">Maximum I can pay out now</label>
          <div className="wd-stepper">
            <button
              type="button"
              className="wd-step"
              disabled={isProcessing || max <= min}
              onClick={() => setMax(clamp(max - step))}
            >
              &minus;
            </button>
            <div className="wd-val">{fmt(max)} ETB</div>
            <button
              type="button"
              className="wd-step"
              disabled={isProcessing || max >= ceiling}
              onClick={() => setMax(clamp(max + step))}
            >
              +
            </button>
          </div>
          <div className="wd-note">
            Lower this any time you&apos;re running low on cash &mdash; players asking for
            more than this won&apos;t see you. Range: {fmt(min)}&ndash;{fmt(ceiling)} ETB
            (set by admin).
          </div>
        </div>
      )}

      {/* admin-managed withdrawal ID - read only */}
      <div className="wd-field">
        <label className="wd-label">
          My Withdrawal ID <span className="adm">&middot; set by admin</span>
        </label>
        <div className="wd-readonly">
          <span>{settings.withdrawal_id ?? 'Not set'}</span>
          <span className="wd-lock">&#128274; READ ONLY</span>
        </div>
        <div className="wd-note">
          {hasId
            ? "Players' auto-message includes this ID so they can start the withdrawal immediately. Wrong ID? Contact admin - only they can change it."
            : "You have no Withdrawal ID yet, so you won't appear for withdrawals. Contact admin to set one."}
        </div>
      </div>

      <button
        type="button"
        className="wd-save"
        disabled={isProcessing || !dirty}
        onClick={() => onSave(accepts, accepts ? max : null)}
      >
        Save withdrawal settings
      </button>
    </div>
  );
}
