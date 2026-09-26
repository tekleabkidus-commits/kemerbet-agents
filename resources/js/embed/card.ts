import { esc } from './util';
import { I18N } from './i18n';
import type { Lang, PublicAgent } from './types';

// Agent card markup, shared by the classic list and the pair-rule list.
// Players never see agent numbers: every card is simply "Agent" with a person
// icon in the avatar.

export const AGENT_ICON =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">' +
  '<path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2.25c-4.14 0-7.5 2.35-7.5 5.25 0 .83.67 1.5 1.5 1.5h12c.83 0 1.5-.67 1.5-1.5 0-2.9-3.36-5.25-7.5-5.25Z"/>' +
  '</svg>';

export function formatLastSeen(isoTimestamp: string, lang: Lang): string {
  const t = I18N[lang];
  const secondsAgo = Math.max(0, Math.floor((Date.now() - new Date(isoTimestamp).getTime()) / 1000));

  if (secondsAgo < 60) return `${t.last_seen} ${t.just_now}`;

  const m = Math.floor(secondsAgo / 60);
  if (m < 60) return `${t.last_seen} ${m} ${t.min_ago_suffix}`;

  const h = Math.floor(m / 60);
  const remM = m % 60;
  if (h < 24) {
    if (lang === 'am') {
      return remM > 0
        ? `${t.last_seen} ${h} ${t.hour_unit} ${remM} ደቂቃ ${t.ago}`
        : `${t.last_seen} ${h} ${t.hour_unit} ${t.ago}`;
    }
    return remM > 0
      ? `${t.last_seen} ${h}${t.hour_unit} ${remM}m ${t.ago}`
      : `${t.last_seen} ${h}${t.hour_unit} ${t.ago}`;
  }

  const days = Math.floor(h / 24);
  if (lang === 'am') return `${t.last_seen} ${days} ${t.day_unit} ${t.ago}`;
  return `${t.last_seen} ${days}${t.day_unit} ${t.ago}`;
}

export function renderCard(agent: PublicAgent, prefillMsg: string, lang: Lang): string {
  const t = I18N[lang];
  const isLive = agent.status === 'live';
  const username = esc(agent.telegram_username);
  const encodedMsg = encodeURIComponent(prefillMsg);
  const depositUrl = `https://telegram.me/${username}?text=${encodedMsg}`;

  const methodSlugs = (agent.payment_methods || []).map((m) => m.slug);
  const methodsAttr = esc(JSON.stringify(methodSlugs));

  const banks = (agent.payment_methods || [])
    .map((m) => `<span class="bank">${esc(m.display_name)}</span>`)
    .join('');

  const statusLine = isLive
    ? `<div class="waiting-text">
         <span class="typing-dots"><span></span><span></span><span></span></span>
         ${t.truly_online}
       </div>`
    : `<div class="last-seen">⏱ ${agent.last_seen_at ? formatLastSeen(agent.last_seen_at, lang) : ''}</div>`;

  const badge = isLive
    ? `<div class="badge live">${t.live_label}</div>`
    : `<div class="badge offline">${t.offline_label}</div>`;

  const depositLink = isLive
    ? `<a href="${depositUrl}" class="deposit-btn" target="_blank" rel="noopener" data-agent-id="${agent.id}" data-tg-user="${username}" data-payment-methods="${methodsAttr}">
         <span>${t.deposit}</span>
         <span class="arrow">→</span>
       </a>`
    : `<button class="deposit-btn" data-agent-id="${agent.id}" data-tg-user="${username}" data-deposit-url="${esc(depositUrl)}" data-offline="true" data-payment-methods="${methodsAttr}">
         <span>${t.deposit}</span>
         <span class="arrow">→</span>
       </button>`;

  return `
    <div class="agent-card ${isLive ? 'live' : 'offline'}">
      <div class="agent-top">
        <div class="agent-name-wrap">
          <div class="agent-avatar">${AGENT_ICON}</div>
          <div>
            <div class="agent-name">${t.agent}</div>
          </div>
        </div>
        ${badge}
      </div>
      ${statusLine}
      <div class="banks">${banks}</div>
      ${depositLink}
    </div>
  `;
}
