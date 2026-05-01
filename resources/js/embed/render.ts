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

const FIRST_SEEN_KEY = 'kemerbet_first_seen_at';
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

function isNewVisitor(): boolean {
  try {
    const stored = localStorage.getItem(FIRST_SEEN_KEY);
    if (!stored) {
      localStorage.setItem(FIRST_SEEN_KEY, String(Date.now()));
      return true;
    }
    const firstSeen = parseInt(stored, 10);
    if (isNaN(firstSeen)) {
      localStorage.setItem(FIRST_SEEN_KEY, String(Date.now()));
      return true;
    }
    return Date.now() - firstSeen < TWENTY_FOUR_HOURS;
  } catch {
    return true;
  }
}

function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /youtube\.com\/watch\?v=([\w\-_]+)/i,
    /youtube\.com\/embed\/([\w\-_]+)/i,
    /youtu\.be\/([\w\-_]+)/i,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function renderCard(agent: PublicAgent, prefillMsg: string, lang: Lang): string {
  const t = I18N[lang];
  const isLive = agent.status === 'live';
  const username = esc(agent.telegram_username);
  const encodedMsg = encodeURIComponent(prefillMsg);
  const depositUrl = `https://t.me/${username}?text=${encodedMsg}`;
  const num = String(agent.display_number).padStart(2, '0');

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
    : `<div class="last-seen">\u23F1 ${agent.last_seen_at ? formatLastSeen(agent.last_seen_at, lang) : ''}</div>`;

  const badge = isLive
    ? `<div class="badge live">${t.live_label}</div>`
    : `<div class="badge offline">${t.offline_label}</div>`;

  const depositLink = isLive
    ? `<a href="${depositUrl}" class="deposit-btn" target="_blank" rel="noopener" data-agent-id="${agent.id}" data-payment-methods="${methodsAttr}">
         <span>${t.deposit}</span>
         <span class="arrow">\u2192</span>
       </a>`
    : `<button class="deposit-btn" data-agent-id="${agent.id}" data-deposit-url="${esc(depositUrl)}" data-offline="true" data-payment-methods="${methodsAttr}">
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

  // --- Onboarding video ---
  const videoWrap = shadow.getElementById('videoWrap');
  if (videoWrap) {
    const videoUrl = data.settings.onboarding_video_url ?? '';
    const videoId = getYouTubeVideoId(videoUrl);
    const shouldShow = videoId !== null && isNewVisitor();

    if (shouldShow) {
      videoWrap.innerHTML = `
        <div class="kb-video-wrap">
          <iframe
            src="https://www.youtube.com/embed/${videoId}"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            title="How to Deposit"
          ></iframe>
        </div>
      `;
    } else {
      videoWrap.innerHTML = '';
    }
  }

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
