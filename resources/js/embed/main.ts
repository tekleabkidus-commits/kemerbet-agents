import { STYLES } from './styles';
import { I18N, getLang, setLang, LANG_KEY } from './i18n';
import type { Lang } from './types';

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

  // TODO: D4B — wire render functions
  // TODO: D4C — wire polling, click handlers, modal, language toggle
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
