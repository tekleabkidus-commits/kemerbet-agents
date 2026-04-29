import { I18N, getLang } from './i18n';
import type { Lang, PublicAgent, PublicAgentsResponse } from './types';

const ESC_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ESC_MAP[c]);
}

export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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
  const depositUrl = `https://t.me/${username}?text=${encodedMsg}`;
  const num = String(agent.display_number).padStart(2, '0');

  const banks = (agent.payment_methods || [])
    .map((m) => `<span class="bank">${esc(m.display_name)}</span>`)
    .join('');

  const statusLine = isLive
    ? `<div class="waiting-text">
         <span class="typing-dots"><span></span><span></span><span></span></span>
         ${t.truly_online}
       </div>`
    : `<div class="last-seen">\u23F1 ${agent.last_seen_at ? formatLastSeen(agent.last_seen_at, lang) : ''}</div>`;

  const badge = isLive
    ? `<div class="badge live">${t.live_label}</div>`
    : `<div class="badge offline">${t.offline_label}</div>`;

  const depositLink = isLive
    ? `<a href="${depositUrl}" class="deposit-btn" target="_blank" rel="noopener" data-agent-id="${agent.id}">
         <span>${t.deposit}</span>
         <span class="arrow">\u2192</span>
       </a>`
    : `<button class="deposit-btn" data-agent-id="${agent.id}" data-deposit-url="${esc(depositUrl)}" data-offline="true">
         <span>${t.deposit}</span>
         <span class="arrow">\u2192</span>
       </button>`;

  return `
    <div class="agent-card ${isLive ? 'live' : 'offline'}">
      <div class="agent-top">
        <div class="agent-name-wrap">
          <div class="agent-avatar">${num}</div>
          <div>
            <div class="agent-name">${t.agent} ${esc(String(agent.display_number))}</div>
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

export function renderPage(data: PublicAgentsResponse, shadow: ShadowRoot): void {
  const lang = getLang();
  const t = I18N[lang];

  const liveAgents = data.agents.filter((a) => a.status === 'live');
  const offlineAgents = data.agents
    .filter((a) => a.status === 'recently_offline')
    .sort((a, b) => {
      // Most recent first (defensive sort — API already sorts)
      const aTime = a.last_seen_at ? new Date(a.last_seen_at).getTime() : 0;
      const bTime = b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0;
      return bTime - aTime;
    });

  const displayLive = data.settings.shuffle_live_agents ? shuffleArray(liveAgents) : liveAgents;
  const prefillMsg = data.settings?.chat_prefilled_message || 'Hi Kemerbet agent, I want to deposit';

  const liveCountText = shadow.getElementById('liveCountText');
  if (liveCountText) {
    liveCountText.textContent =
      liveAgents.length > 0 ? `${liveAgents.length} ${t.agents_online}` : t.no_agents_online;
  }

  const liveCountInline = shadow.getElementById('liveCountInline');
  if (liveCountInline) {
    liveCountInline.textContent = `${liveAgents.length} ${t.live_count}`;
  }

  const liveGrid = shadow.getElementById('liveGrid');
  if (liveGrid) {
    if (liveAgents.length === 0) {
      liveGrid.innerHTML = `
        <div class="empty-state">
          <div class="icon">\u25CB</div>
          <h3>${t.no_agents_title}</h3>
          <p>${t.no_agents_desc}</p>
        </div>
      `;
    } else {
      liveGrid.innerHTML = displayLive.map((a) => renderCard(a, prefillMsg, lang)).join('');
    }
  }

  const offlineWrap = shadow.getElementById('offlineWrap');
  const offlineGrid = shadow.getElementById('offlineGrid');
  if (offlineWrap && offlineGrid) {
    if (offlineAgents.length > 0) {
      offlineWrap.style.display = 'block';
      offlineGrid.innerHTML = offlineAgents.map((a) => renderCard(a, prefillMsg, lang)).join('');
    } else {
      offlineWrap.style.display = 'none';
    }
  }
}
