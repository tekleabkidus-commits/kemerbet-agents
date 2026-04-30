import { STYLES } from './styles';
import { I18N, getLang, setLang } from './i18n';
import { renderPage } from './render';
import type { Lang, PublicAgentsResponse } from './types';

function getApiBase(container: HTMLElement): string {
  const explicit = container.dataset.api;
  if (explicit) return explicit;

  const scripts = document.querySelectorAll('script[src*="embed.js"]');
  const lastScript = scripts[scripts.length - 1] as HTMLScriptElement | undefined;
  if (lastScript?.src) {
    try {
      return new URL(lastScript.src).origin;
    } catch {
      // invalid URL
    }
  }

  return window.location.origin;
}

function init(): void {
  const container = document.getElementById('kemerbet-agents');
  if (!container) return;

  const apiBase = getApiBase(container);
  const shadow = container.attachShadow({ mode: 'open' });

  // Inject styles
  const style = document.createElement('style');
  style.textContent = STYLES;
  shadow.appendChild(style);

  // Set initial lang attribute on shadow host
  const lang = getLang();
  container.setAttribute('lang', lang);

  // Build skeleton DOM (matches mockup HTML structure)
  const wrapper = document.createElement('div');
  wrapper.innerHTML = buildShellHTML(lang);
  shadow.appendChild(wrapper);

  // Apply i18n to static elements
  applyLang(lang, shadow, container);

  // --- Visit tracking (once per browser session) ---
  if (!sessionStorage.getItem('kemerbet_visited')) {
    sessionStorage.setItem('kemerbet_visited', '1');
    fetch(`${apiBase}/api/public/visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referrer: document.referrer || null }),
    }).catch(() => {});
  }

  // --- State ---
  let lastApiData: PublicAgentsResponse | null = null;
  let pendingDepositUrl: string | null = null;
  let pendingAgentId: string | null = null;
  let pendingPaymentMethods: string[] | null = null;
  let pollTimer: number | null = null;

  // --- Refresh indicator ---
  function showRefreshIndicator(): void {
    const ind = shadow.getElementById('refreshIndicator');
    if (ind) {
      ind.classList.add('show');
      setTimeout(() => ind.classList.remove('show'), 1400);
    }
  }

  // --- Click tracking (fire-and-forget) ---
  function trackClick(agentId: string, paymentMethods?: string[]): void {
    fetch(`${apiBase}/api/public/agents/${agentId}/click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        referrer: window.location.href,
        payment_methods: paymentMethods && paymentMethods.length > 0 ? paymentMethods : null,
      }),
      keepalive: true,
    }).catch(() => {});
  }

  // --- Fetch + render ---
  async function fetchAndRender(): Promise<void> {
    showRefreshIndicator();
    try {
      const res = await fetch(`${apiBase}/api/public/agents`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: PublicAgentsResponse = await res.json();
      lastApiData = data;
      renderPage(data, shadow);
    } catch {
      console.warn('[kemerbet-agents] fetch failed, retrying in 60s');
    }
  }

  // --- Polling (chained setTimeout) ---
  function schedulePoll(): void {
    pollTimer = window.setTimeout(async () => {
      if (!document.hidden) {
        await fetchAndRender();
      }
      // Re-check after async work — tab may have been hidden during fetch
      if (!document.hidden) {
        schedulePoll();
      } else {
        pollTimer = null;
      }
    }, 60_000);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (pollTimer !== null) {
        clearTimeout(pollTimer);
        pollTimer = null;
      }
    } else if (pollTimer === null) {
      fetchAndRender();
      schedulePoll();
    }
  });

  // --- Modal ---
  function showModal(): void {
    shadow.getElementById('offlineWarnModal')?.classList.add('show');
  }

  function closeModal(): void {
    shadow.getElementById('offlineWarnModal')?.classList.remove('show');
    pendingDepositUrl = null;
    pendingAgentId = null;
    pendingPaymentMethods = null;
  }

  // Modal: confirm button
  shadow.getElementById('confirmDepositBtn')?.addEventListener('click', () => {
    if (pendingAgentId) trackClick(pendingAgentId, pendingPaymentMethods ?? undefined);
    if (pendingDepositUrl) window.open(pendingDepositUrl, '_blank', 'noopener');
    closeModal();
  });

  // Modal: cancel button
  shadow.getElementById('cancelWarnBtn')?.addEventListener('click', () => {
    closeModal();
  });

  // Modal: backdrop click
  shadow.getElementById('offlineWarnModal')?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).id === 'offlineWarnModal') closeModal();
  });

  // Modal: ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = shadow.getElementById('offlineWarnModal');
      if (modal?.classList.contains('show')) closeModal();
    }
  });

  // --- Deposit click delegation ---
  shadow.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const btn = target.closest('[data-agent-id]') as HTMLElement | null;
    if (!btn) return;

    const agentId = btn.dataset.agentId!;
    const methods: string[] = JSON.parse(btn.dataset.paymentMethods || '[]');

    if (btn.dataset.offline === 'true') {
      e.preventDefault();
      pendingDepositUrl = btn.dataset.depositUrl || null;
      pendingAgentId = agentId;
      pendingPaymentMethods = methods;
      showModal();
    } else {
      // Live link: tracking fires in parallel, <a target="_blank"> proceeds naturally
      trackClick(agentId, methods);
    }
  });

  // --- Language toggle ---
  shadow.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const newLang = (btn as HTMLElement).dataset.lang as Lang;
      setLang(newLang);
      applyLang(newLang, shadow, container);
      if (lastApiData) renderPage(lastApiData, shadow);
    });
  });

  // --- Init: fetch + poll ---
  fetchAndRender();
  schedulePoll();
}

function applyLang(lang: Lang, shadow: ShadowRoot, host: HTMLElement): void {
  const t = I18N[lang];
  host.setAttribute('lang', lang);

  shadow.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = (el as HTMLElement).dataset.i18n as keyof typeof t;
    if (t[key] !== undefined) el.textContent = t[key];
  });

  shadow.querySelectorAll('.lang-btn').forEach((btn) => {
    const btnEl = btn as HTMLElement;
    btnEl.classList.toggle('active', btnEl.dataset.lang === lang);
  });
}

function buildShellHTML(lang: Lang): string {
  const t = I18N[lang];
  return `
    <div class="refresh-indicator" id="refreshIndicator">
      <div class="spinner"></div>
      <span data-i18n="updating">${t.updating}</span>
    </div>

    <div class="modal-backdrop" id="offlineWarnModal">
      <div class="modal-warn">
        <div class="icon-wrap">\u26A0\uFE0F</div>
        <h3 data-i18n="warn_title">${t.warn_title}</h3>
        <p data-i18n="warn_desc">${t.warn_desc}</p>
        <div class="modal-actions">
          <button class="modal-btn cancel" id="cancelWarnBtn" data-i18n="cancel">${t.cancel}</button>
          <button class="modal-btn confirm" id="confirmDepositBtn" data-i18n="continue">${t.continue}</button>
        </div>
      </div>
    </div>

    <div class="agents-wrapper">
      <div class="topbar">
        <div class="lang-switcher" role="group" aria-label="Language">
          <button class="lang-btn${lang === 'am' ? ' active' : ''}" data-lang="am">\u12A0\u121B</button>
          <button class="lang-btn${lang === 'en' ? ' active' : ''}" data-lang="en">EN</button>
        </div>
      </div>

      <div class="header">
        <div class="header-logo">
          <span class="live-indicator"></span>
          <span id="liveCountText">${t.loading}</span>
        </div>
        <h1 data-i18n="title">${t.title}</h1>
        <p data-i18n="subtitle">${t.subtitle}</p>
      </div>

      <div class="section-title">
        <h2 data-i18n="live_now">${t.live_now}</h2>
        <div class="agent-count" id="liveCountInline">\u2014</div>
      </div>

      <div class="agent-grid" id="liveGrid">
        <div class="empty-state"><h3 data-i18n="loading">${t.loading}</h3></div>
      </div>

      <div id="offlineWrap" style="display:none">
        <div class="offline-divider" data-i18n="recently_online">${t.recently_online}</div>
        <div class="agent-grid" id="offlineGrid"></div>
      </div>
    </div>
  `;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
