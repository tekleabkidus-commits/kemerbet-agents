import { getDepositMessage } from './flow';
import { esc } from './util';
export { esc };
import { I18N, getLang } from './i18n';
import { renderCard, formatLastSeen } from './card';
export { renderCard, formatLastSeen };
import type { PublicAgentsResponse } from './types';



export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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

  // Pinned agents keep their API order (pinned first); shuffle only applies
  // to the unpinned remainder so pins always stay at the top.
  const pinnedLive = liveAgents.filter((a) => a.is_pinned);
  const unpinnedLive = liveAgents.filter((a) => !a.is_pinned);
  const displayLive = [
    ...pinnedLive,
    ...(data.settings.shuffle_live_agents && !data.settings.server_ranked_agents ? shuffleArray(unpinnedLive) : unpinnedLive),
  ];
  const composed = getDepositMessage(data);
  const prefillMsg = composed
    || data.settings?.chat_prefilled_message
    || 'Hi Kemerbet agent, I want to deposit';

  // PAIR RULE: the player's own agents are fetched and painted by flow.ts
  // (renderDepositPair). The full list never reaches the browser, so here we
  // only show a count-free header and leave the agent grid alone.
  if (data.settings.pair_mode_enabled) {
    const liveCountText = shadow.getElementById('liveCountText');
    if (liveCountText) {
      liveCountText.textContent = data.agents_available ? t.agents_online_plain : t.no_agents_online;
    }
    const liveCountInline = shadow.getElementById('liveCountInline');
    if (liveCountInline) liveCountInline.style.display = 'none';
    const offlineWrapPair = shadow.getElementById('offlineWrap');
    if (offlineWrapPair) offlineWrapPair.style.display = 'none';
    return;
  }

  const liveCountText = shadow.getElementById('liveCountText');
  if (liveCountText) {
    liveCountText.textContent =
      liveAgents.length > 0 ? `${liveAgents.length} ${t.agents_online}` : t.no_agents_online;
  }

  const liveCountInline = shadow.getElementById('liveCountInline');
  if (liveCountInline) {
    liveCountInline.style.display = '';
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
