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
    <div className="wd-zone">
      <div className="wd-zh">
        <h3>Withdrawal settings</h3>
        {accepts && <span className="wd-cap">Up to {fmt(max)} ETB</span>}
      </div>

      {/* mode toggle */}
      <div className="wd-seg">
        <button
          type="button"
          className={!accepts ? 'on' : ''}
          disabled={isProcessing}
          onClick={() => setAccepts(false)}
        >
          Deposit only
        </button>
        <button
          type="button"
          className={accepts ? 'on' : ''}
          disabled={isProcessing}
          onClick={() => setAccepts(true)}
        >
          Deposit + Withdraw
        </button>
      </div>

      {accepts && (
        <div className="wd-frow">
          <label>Maximum I can pay out right now</label>
          <div className="wd-stepper">
            <button
              type="button"
              disabled={isProcessing || max <= min}
              onClick={() => setMax(clamp(max - step))}
            >
              &minus;
            </button>
            <div className="val">{fmt(max)} ETB</div>
            <button
              type="button"
              disabled={isProcessing || max >= ceiling}
              onClick={() => setMax(clamp(max + step))}
            >
              +
            </button>
          </div>
          <div className="wd-fnote">
            Lower this any time you&apos;re running out of cash &mdash; players asking
            for more than this won&apos;t see you. Minimum withdrawal ({fmt(min)} ETB)
            and maximum ({fmt(ceiling)} ETB) are set by admin.
          </div>
        </div>
      )}

      {/* admin-managed withdrawal ID - read only */}
      <div className="wd-frow">
        <label>
          My Withdrawal ID <span className="adm">&middot; set by admin</span>
        </label>
        <div className="wd-tin">
          <span>{settings.withdrawal_id ?? 'Not set'}</span>
          <span className="lock">&#128274; READ ONLY</span>
        </div>
        <div className="wd-fnote">
          {hasId
            ? "Players' auto-message includes this ID so they can start the withdrawal immediately. Wrong or changed ID? Contact admin - only they can edit it. Agents without an ID don't appear for withdrawals."
            : "You have no Withdrawal ID yet, so you won't appear for withdrawals. Contact admin to set one."}
        </div>
      </div>

      <button
        type="button"
        className="wd-savebar"
        disabled={isProcessing || !dirty}
        onClick={() => onSave(accepts, accepts ? max : null)}
      >
        Save withdrawal settings
      </button>
    </div>
  );
}
