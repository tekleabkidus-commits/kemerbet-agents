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

/**
 * Fill a message template's placeholders. Supported: {amount}, {withdrawal_id}.
 * Amount is formatted with thousands separators; a missing amount yields the
 * no-amount template being used instead (caller decides which template).
 */
export function fillTemplate(
  template: string,
  vars: { amount?: number | null; withdrawal_id?: string | null },
): string {
  return template
    .replace(/\{amount\}/g, vars.amount != null ? vars.amount.toLocaleString('en-US') : '')
    .replace(/\{withdrawal_id\}/g, vars.withdrawal_id ?? '');
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
}): void {
  const message = fillTemplate(opts.messageTemplate, {
    amount: opts.amount,
    withdrawal_id: opts.agent.withdrawal_id ?? '',
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
