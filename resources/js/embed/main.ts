import { STYLES } from './styles';
import { I18N, getLang, setLang } from './i18n';
import { renderPage } from './render';
import { recordRecent } from './recents';
import { buildTelegramUrl } from './withdrawal';
import {
  showScreen,
  renderHomeExtras,
  renderAmountScreen,
  renderDepAskScreen,
  getDepositMessage,
  handleRecentMain,
  handleRecentContact,
  wireVideoBoxes,
  refreshPairScreens,
  detectedPlayerId,
  type FlowDeps,
} from './flow';
import { syncLogin } from './pairing';
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

  // --- Flow controller deps (Phase 2) ---
  const flowDeps: FlowDeps = {
    shadow,
    apiBase,
    getData: () => lastApiData,
    trackClick: (agentId, intent, opts) => {
      recordRecent(agentId, intent);
      fetch(`${apiBase}/api/public/agents/${agentId}/click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referrer: window.location.href,
          intent,
          amount: opts?.amount ?? null,
          source: opts?.source ?? null,
          payment_methods:
            opts?.paymentMethods && opts.paymentMethods.length > 0
              ? opts.paymentMethods
              : null,
        }),
        keepalive: true,
      }).catch(() => {});
    },
    openOfflineModal: (depositUrl, agentId, methods) => {
      pendingDepositUrl = depositUrl;
      pendingAgentId = String(agentId);
      pendingPaymentMethods = methods;
      showModal();
    },
    // Pair rule switched off by admin while the page was open: reload data;
    // the classic list takes over on the next render.
    onPairDisabled: () => {
      void fetchAndRender();
    },
  };

  // --- Fetch + render ---
  async function fetchAndRender(): Promise<void> {
    showRefreshIndicator();
    try {
      const res = await fetch(`${apiBase}/api/public/agents`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: PublicAgentsResponse = await res.json();
      lastApiData = data;
      renderPage(data, shadow);
      renderHomeExtras(flowDeps);
      wireVideoBoxes(shadow);
      if (data.settings.pair_mode_enabled) {
        // Pair rule: a detected login links this device to the player ID on
        // the server (once per device + ID), and an open deposit list is
        // refreshed so it only ever shows online agents.
        const pid = detectedPlayerId(data);
        if (pid) syncLogin(apiBase, pid);
        refreshPairScreens(flowDeps, true);
      }
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
    if (pendingAgentId) {
      trackClick(pendingAgentId, pendingPaymentMethods ?? undefined);
      recordRecent(parseInt(pendingAgentId, 10), 'deposit');
    }
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
  // Only the deposit list's cards. (Withdraw buttons on the results screen and
  // the recents buttons also carry data-agent-id; they track their own clicks
  // and must not ALSO be counted as deposits.)
  shadow.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const btn = target.closest('#liveGrid [data-agent-id], #offlineGrid [data-agent-id]') as HTMLElement | null;
    if (!btn) return;

    const agentId = btn.dataset.agentId!;
    const methods: string[] = JSON.parse(btn.dataset.paymentMethods || '[]');

    const tgUser = btn.dataset.tgUser || '';
    const d = lastApiData;
    const composed = d ? getDepositMessage(d) : null;

    if (btn.dataset.offline === 'true') {
      e.preventDefault();
      pendingDepositUrl = composed && tgUser
        ? buildTelegramUrl(tgUser, composed)
        : (btn.dataset.depositUrl || null);
      pendingAgentId = agentId;
      pendingPaymentMethods = methods;
      showModal();
    } else {
      // Live link: rewrite href with the questionnaire message (amount +
      // player ID, tap-to-copy) just before the browser follows it.
      if (composed && tgUser) {
        (btn as HTMLAnchorElement).href = buildTelegramUrl(tgUser, composed);
      }
      trackClick(agentId, methods);
      recordRecent(parseInt(agentId, 10), 'deposit');
    }
  });

  // --- Intent choice + recents delegation (Phase 2) ---
  shadow.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;

    const intentBtn = target.closest('[data-intent-choice]') as HTMLElement | null;
    if (intentBtn) {
      const choice = intentBtn.dataset.intentChoice;
      if (choice === 'withdraw') {
        renderAmountScreen(flowDeps);
        showScreen(shadow, 'amount');
      } else {
        // Deposit questionnaire first (amount + player ID), then the list.
        renderDepAskScreen(flowDeps);
        showScreen(shadow, 'depask');
      }
      return;
    }

    // Back buttons: deposit list -> questionnaire; questionnaire -> home
    const depBack = target.closest('#screenDeposit [data-nav="home"]') as HTMLElement | null;
    if (depBack) {
      renderDepAskScreen(flowDeps);
      showScreen(shadow, 'depask');
      return;
    }
    const depAskBack = target.closest('#screenDepAsk [data-nav="home"]') as HTMLElement | null;
    if (depAskBack) {
      showScreen(shadow, 'home');
      return;
    }

    const recentMain = target.closest('[data-recent-main]') as HTMLElement | null;
    if (recentMain) {
      handleRecentMain(flowDeps, parseInt(recentMain.dataset.agentId!, 10), recentMain.dataset.intent!);
      return;
    }

    const recentContact = target.closest('[data-recent-contact]') as HTMLElement | null;
    if (recentContact) {
      handleRecentContact(flowDeps, parseInt(recentContact.dataset.agentId!, 10));
      return;
    }
  });

  // --- Language toggle ---
  shadow.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const newLang = (btn as HTMLElement).dataset.lang as Lang;
      setLang(newLang);
      applyLang(newLang, shadow, container);
      if (lastApiData) {
        renderPage(lastApiData, shadow);
        renderHomeExtras(flowDeps);
        refreshPairScreens(flowDeps, false);
        // If the amount screen is currently showing, re-render it in the new
        // language. (Results re-render whenever re-entered from amount.)
        if (shadow.getElementById('screenAmount')?.classList.contains('active')) {
          renderAmountScreen(flowDeps);
          showScreen(shadow, 'amount');
        }
      }
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

      <!-- ============ HOME ============ -->
      <div class="screen active" id="screenHome">
        <div class="header">
          <div class="header-logo">
            <span class="live-indicator"></span>
            <span id="liveCountText">${t.loading}</span>
          </div>
          <h1 data-i18n="title">${t.title}</h1>
          <p data-i18n="subtitle">${t.subtitle}</p>
        </div>

        <!-- player notice board (admin-managed) -->
        <div id="noticeWrap"></div>
        <div id="howtoWrap"></div>

        <!-- intent choice -->
        <div class="section-title"><h2 id="intentQuestion">${t.intent_question}</h2></div>
        <div class="intent">
          <button class="intent-card dep" data-intent-choice="deposit">
            <span class="ic">\uD83D\uDCB0</span>
            <b>${t.intent_deposit}</b>
            <span>${t.intent_deposit_desc}</span>
          </button>
          <button class="intent-card wdr" data-intent-choice="withdraw">
            <span class="ic">\uD83C\uDFE7</span>
            <b>${t.intent_withdraw}</b>
            <span>${t.intent_withdraw_desc}</span>
          </button>
        </div>

        <!-- recents -->
        <div id="recentsWrap" style="display:none">
          <div class="section-title" style="margin-top:22px"><h2>${t.recents_title}</h2><span>${t.recents_only_you}</span></div>
          <div class="recents" id="recentsGrid"></div>
        </div>
      </div>

      <!-- ============ DEPOSIT (own screen) ============ -->
      <div class="screen" id="screenDepAsk"></div>

      <div class="screen" id="screenDeposit">
        <div class="backrow"><button class="backbtn" data-nav="home">\u2190</button><h2>${t.intent_deposit}</h2></div>

        <div id="noticeWrapDep"></div>
        <div id="depHowtoWrap"></div>
        <div id="videoWrap"></div>

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

      <!-- ============ AMOUNT ============ -->
      <div class="screen" id="screenAmount"></div>

      <!-- ============ RESULTS ============ -->
      <div class="screen" id="screenResults"></div>
    </div>
  `;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
