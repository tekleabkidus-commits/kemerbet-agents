import type { PublicAgent } from './types';

/**
 * Build the absolute URL for the sportsbook withdrawal cashier from a
 * RELATIVE path stored in settings (e.g. "/sport/popup/withdrawal").
 *
 * The widget is embedded on several different domains. We deliberately do NOT
 * store a full domain in settings — instead we prepend the origin of whatever
 * domain the widget is currently running on. That way the same setting works
 * everywhere the embed is placed, with no per-domain configuration.
 *
 * Only same-origin relative paths are honored. If an absolute URL somehow ends
 * up in the setting, we fall back to just its path on the current origin, so a
 * misconfiguration can never redirect players to an unexpected host.
 */
export function buildWithdrawalCashierUrl(redirectPath: string): string {
  const origin = window.location.origin;

  let path = redirectPath || '/sport/popup/withdrawal';

  // If someone stored a full URL, strip it back to path + query + hash.
  if (/^https?:\/\//i.test(path)) {
    try {
      const u = new URL(path);
      path = u.pathname + u.search + u.hash;
    } catch {
      path = '/sport/popup/withdrawal';
    }
  }

  if (!path.startsWith('/')) path = '/' + path;

  return origin + path;
}

export interface PayoutDetails {
  name: string;
  bank: string;
  account: string;
  playerId?: string;
}

/**
 * Fill a message template's placeholders.
 * Supported: {amount}, {withdrawal_id}, {name}, {bank}, {account}, {player_id}.
 *
 * {withdrawal_id} and {account} are wrapped in single backticks: Telegram
 * parses them on SEND into monospace tap-to-copy (confirmed working). They
 * appear as literal backticks in the compose box until the player sends.
 * Lines whose placeholders resolve empty (e.g. "Name:" with no name) are
 * removed so the message never shows a blank payout skeleton.
 */
export function fillTemplate(
  template: string,
  vars: {
    amount?: number | null;
    withdrawal_id?: string | null;
    payout?: PayoutDetails | null;
    player_id?: string | null;
  },
): string {
  const id = vars.withdrawal_id ?? '';
  const account = vars.payout?.account ?? '';
  const playerId = (vars.player_id ?? '').trim();
  const filled = template
    .replace(/\{amount\}/g, vars.amount != null ? vars.amount.toLocaleString('en-US') : '')
    .replace(/\{withdrawal_id\}/g, id ? '`' + id + '`' : '')
    .replace(/\{name\}/g, vars.payout?.name ?? '')
    .replace(/\{bank\}/g, vars.payout?.bank ?? '')
    .replace(/\{account\}/g, account ? '`' + account + '`' : '')
    .replace(/\{player_id\}/g, playerId ? '`' + playerId + '`' : '');

  // Remove label-only lines left behind by empty placeholders ("Name:",
  // "Please send to:", etc.) and collapse repeated blank lines.
  return filled
    .split('\n')
    .filter((line) => !/^[^:\n]{0,40}:\s*$/.test(line.trim()) || line.trim() === '')
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Build the Telegram deep link that opens the agent's chat with a prepared
 * message already in the compose box.
 */
export function buildTelegramUrl(username: string, message: string): string {
  return `https://telegram.me/${encodeURIComponent(username)}?text=${encodeURIComponent(message)}`;
}

/**
 * Execute the "Withdraw here" dual action.
 *
 * IMPORTANT ordering: window.open (new tab -> Telegram) MUST run first and
 * synchronously inside the click handler, otherwise the browser's popup
 * blocker suppresses it. Only after that do we redirect the current tab to the
 * cashier. Both happen from a single user gesture.
 *
 * We only ever OPEN the cashier at its method list. We never fill or submit
 * anything on the cashier (it is a cross-origin iframe we cannot and must not
 * drive). The player picks the method and enters the amount themselves.
 */
export function withdrawHere(opts: {
  agent: PublicAgent;
  amount: number;
  messageTemplate: string;
  redirectPath: string;
  payout?: PayoutDetails | null;
  playerId?: string | null;
}): void {
  const message = fillTemplate(opts.messageTemplate, {
    amount: opts.amount,
    withdrawal_id: opts.agent.withdrawal_id ?? '',
    payout: opts.payout ?? null,
    player_id: opts.playerId ?? null,
  });

  const telegramUrl = buildTelegramUrl(opts.agent.telegram_username, message);
  const cashierUrl = buildWithdrawalCashierUrl(opts.redirectPath);

  // 1) New tab to Telegram — first, synchronously, or it gets blocked.
  window.open(telegramUrl, '_blank', 'noopener');

  // 2) Current tab to the cashier withdrawal method list.
  window.location.href = cashierUrl;
}

/**
 * "My own agent" — no agent involved, straight to the cashier withdrawal list.
 */
export function withdrawWithoutAgent(redirectPath: string): void {
  window.location.href = buildWithdrawalCashierUrl(redirectPath);
}
