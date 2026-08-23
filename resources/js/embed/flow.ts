import { I18N, getLang } from './i18n';
import { esc } from './render';
import { resolveRecents } from './recents';
import {
  buildTelegramUrl,
  fillTemplate,
  withdrawHere,
  withdrawWithoutAgent,
  buildWithdrawalCashierUrl,
  type PayoutDetails,
} from './withdrawal';
import { savePayout, suggestForBank, recentSaved } from './payouts';
import type { Lang, PublicAgent, PublicAgentsResponse } from './types';

// ---------------------------------------------------------------------------
// Phase 2 flow controller. Owns three screens rendered inside the shadow root:
//   - home     (#screenHome)     : notice/recents/intent live here
//   - amount   (#screenAmount)   : withdrawal amount entry
//   - results  (#screenResults)  : capacity-matched agents
// The existing agent list lives in the home screen's #liveGrid/#offlineGrid,
// rendered by render.ts as before — untouched.
// ---------------------------------------------------------------------------

export type ScreenName = 'home' | 'deposit' | 'amount' | 'results';

export interface FlowDeps {
  shadow: ShadowRoot;
  apiBase: string;
  getData: () => PublicAgentsResponse | null;
  trackClick: (
    agentId: number,
    intent: 'deposit' | 'withdrawal' | 'contact',
    opts?: { amount?: number; source?: string; paymentMethods?: string[] },
  ) => void;
  openOfflineModal: (depositUrl: string, agentId: number, methods: string[]) => void;
}

let currentAmount = 0;
let currentPayout: PayoutDetails = { name: '', bank: '', account: '' };

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

export function showScreen(shadow: ShadowRoot, name: ScreenName): void {
  ['Home', 'Deposit', 'Amount', 'Results'].forEach((s) => {
    const el = shadow.getElementById('screen' + s);
    if (el) el.classList.toggle('active', s.toLowerCase() === name);
  });
  shadow.getElementById('screen' + name.charAt(0).toUpperCase() + name.slice(1))
    ?.scrollIntoView({ block: 'nearest' });
}

function youTubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /youtube\.com\/watch\?v=([\w\-_]+)/i,
    /youtube\.com\/embed\/([\w\-_]+)/i,
    /youtu\.be\/([\w\-_]+)/i,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function videoBoxHtml(t: (typeof I18N)[Lang], howtoUrl: string): string {
  return `
    <div class="videobox" data-video="${esc(howtoUrl)}">
      <div class="vplay">\u25B6</div>
      <b>${t.withdraw_howto}</b>
      <small>${t.withdraw_howto_sub}</small>
    </div>`;
}

// ---- toast -----------------------------------------------------------------

function toast(shadow: ShadowRoot, html: string): void {
  let el = shadow.getElementById('wToast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'wToast';
    el.className = 'wtoast';
    shadow.appendChild(el);
  }
  el.innerHTML = html;
  el.classList.add('show');
  window.setTimeout(() => el && el.classList.remove('show'), 4500);
}

// ---- HOME: recents + intent ------------------------------------------------

export function renderHomeExtras(deps: FlowDeps): void {
  const { shadow, getData } = deps;
  const data = getData();
  if (!data) return;
  const lang = getLang();
  const t = I18N[lang];

  // Recents
  const recentsWrap = shadow.getElementById('recentsWrap');
  if (recentsWrap) {
    if (data.settings.recents_enabled) {
      const recents = resolveRecents(data.directory ?? [], data.settings.recents_count ?? 5);
      if (recents.length === 0) {
        recentsWrap.style.display = 'none';
      } else {
        recentsWrap.style.display = 'block';
        const rows = recents
          .map((r) => {
            const a = r.agent;
            const num = String(a.display_number).padStart(2, '0');
            const online = a.online;
            const sub = online ? t.recents_online : t.recents_offline;
            // Which transaction button: match the intent they last used.
            const isWithdraw = r.entry.intent === 'withdrawal';
            const mainLabel = isWithdraw ? t.intent_withdraw : t.deposit;
            const mainClass = online ? (isWithdraw ? 'wdr' : 'dep') : 'grey';
            return `
              <div class="recent${online ? '' : ' is-off'}">
                <div class="agent-avatar ${online ? 'live' : 'off'}">${num}</div>
                <div class="rc-mid">
                  <div class="rc-name">${t.agent} ${esc(String(a.display_number))}</div>
                  <div class="rc-sub">${sub}</div>
                </div>
                <div class="rc-btns">
                  <button class="btn-s ${mainClass}" data-recent-main data-agent-id="${a.id}" data-intent="${r.entry.intent}">${mainLabel}</button>
                  <button class="btn-s line" data-recent-contact data-agent-id="${a.id}">${t.recents_contact}</button>
                </div>
              </div>`;
          })
          .join('');
        const grid = shadow.getElementById('recentsGrid');
        if (grid) grid.innerHTML = rows;
      }
    } else {
      recentsWrap.style.display = 'none';
    }
  }

  // Intent labels (static text set once; refresh on lang change)
  const iq = shadow.getElementById('intentQuestion');
  if (iq) iq.textContent = t.intent_question;
}

// ---- AMOUNT ----------------------------------------------------------------

export function renderAmountScreen(deps: FlowDeps): void {
  const { shadow, getData } = deps;
  const data = getData();
  if (!data) return;
  const lang = getLang();
  const t = I18N[lang];
  const min = data.settings.withdrawal_min ?? 200;
  const howto = data.settings.withdrawal_howto_video_url ?? '';

  const wrap = shadow.getElementById('screenAmount');
  if (!wrap) return;

  const quick = (data.settings.withdrawal_quick_amounts ?? [])
    .map((v) => `<button class="q" data-quick="${v}">${fmt(v)}</button>`)
    .join('');

  const requirePayout = data.settings.withdrawal_require_payout_details !== false;
  const banks = data.settings.withdrawal_bank_options ?? [];
  const bankOpts = ['<option value="">' + t.payout_bank_ph + '</option>']
    .concat(banks.map((b) => `<option value="${esc(b)}">${esc(b)}</option>`))
    .join('');

  const saved = requirePayout ? recentSaved(3) : [];
  const savedHtml = saved.length
    ? `<div class="payout-saved" id="payoutSaved">${saved
        .map(
          (s, i) =>
            `<button class="psug" data-sug="${i}"><span class="psug-name">${esc(s.name)}</span><span class="psug-meta">${esc(s.bank)} \u00b7 ${esc(s.account)}</span></button>`,
        )
        .join('')}</div>`
    : '';

  const payoutHtml = requirePayout
    ? `
    <div class="payout">
      <div class="payout-title">${t.payout_title}</div>
      <input class="pf" id="pfName" type="text" autocomplete="off" placeholder="${t.payout_name_ph}" value="${esc(currentPayout.name)}" />
      <select class="pf" id="pfBank">${bankOpts}</select>
      <input class="pf" id="pfAccount" type="text" inputmode="numeric" autocomplete="off" placeholder="${t.payout_account_ph}" value="${esc(currentPayout.account)}" />
      ${savedHtml}
      <div class="payout-note">${t.payout_note}</div>
    </div>`
    : '';

  wrap.innerHTML = `
    <div class="backrow"><button class="backbtn" data-nav="home">\u2190</button><h2>${t.withdraw_title}</h2></div>
    ${howto ? videoBoxHtml(t, howto) : ''}
    ${payoutHtml}
    <div class="amount-wrap">
      <label>${t.withdraw_amount_label}</label>
      <div class="amt-line">
        <input id="amtInput" type="text" inputmode="numeric" placeholder="0" />
        <b>ETB</b>
      </div>
      <div class="amt-hint" id="amtHint">${t.withdraw_min_prefix} ${fmt(min)} ETB</div>
    </div>
    <div class="quick">${quick}</div>
    <button class="bigcta" id="amtGo" disabled>${t.withdraw_see_agents}</button>
    <button class="ownagent" id="ownAgentBtn"><span class="ow">${t.withdraw_own_agent}<small>${t.withdraw_own_agent_desc}</small></span><span>\u2192</span></button>
    <p class="amt-note">${t.withdraw_note}</p>
  `;

  const input = shadow.getElementById('amtInput') as HTMLInputElement | null;
  const hint = shadow.getElementById('amtHint');
  const go = shadow.getElementById('amtGo') as HTMLButtonElement | null;
  const pfName = shadow.getElementById('pfName') as HTMLInputElement | null;
  const pfBank = shadow.getElementById('pfBank') as HTMLSelectElement | null;
  const pfAccount = shadow.getElementById('pfAccount') as HTMLInputElement | null;

  // restore previously-selected bank
  if (pfBank && currentPayout.bank) pfBank.value = currentPayout.bank;

  const payoutComplete = (): boolean => {
    if (!requirePayout) return true;
    return (
      currentPayout.name.trim() !== '' &&
      currentPayout.bank.trim() !== '' &&
      currentPayout.account.trim() !== ''
    );
  };

  const syncPayout = () => {
    currentPayout = {
      name: pfName?.value ?? '',
      bank: pfBank?.value ?? '',
      account: pfAccount?.value ?? '',
    };
  };

  const recompute = () => {
    if (!input || !hint || !go) return;
    const raw = input.value.replace(/[^0-9]/g, '');
    currentAmount = parseInt(raw || '0', 10);
    if (raw) input.value = fmt(currentAmount);
    const amountOk = currentAmount >= min;
    if (currentAmount > 0 && currentAmount < min) {
      hint.textContent = `${t.withdraw_min_error} ${fmt(min)} ETB`;
      hint.classList.add('err');
    } else {
      hint.textContent = `${t.withdraw_min_prefix} ${fmt(min)} ETB`;
      hint.classList.remove('err');
    }
    go.disabled = !(amountOk && payoutComplete());
  };

  input?.addEventListener('input', recompute);
  pfName?.addEventListener('input', () => { syncPayout(); recompute(); });
  pfAccount?.addEventListener('input', () => { syncPayout(); recompute(); });
  pfBank?.addEventListener('change', () => {
    syncPayout();
    // When the player picks a bank they've used before, prefill name+account.
    const s = suggestForBank(currentPayout.bank);
    if (s) {
      if (pfName && !pfName.value.trim()) pfName.value = s.name;
      if (pfAccount && !pfAccount.value.trim()) pfAccount.value = s.account;
      syncPayout();
    }
    recompute();
  });

  // Saved-account suggestions: clicking one fills ALL three fields, replacing
  // whatever was there (even hand-typed values).
  shadow.querySelectorAll('#screenAmount .psug').forEach((b) => {
    b.addEventListener('click', () => {
      const idx = parseInt((b as HTMLElement).dataset.sug!, 10);
      const s = saved[idx];
      if (!s) return;
      if (pfName) pfName.value = s.name;
      if (pfBank) pfBank.value = s.bank;
      if (pfAccount) pfAccount.value = s.account;
      syncPayout();
      recompute();
    });
  });

  shadow.querySelectorAll('#screenAmount .q').forEach((b) => {
    b.addEventListener('click', () => {
      if (input) input.value = fmt(parseInt((b as HTMLElement).dataset.quick!, 10));
      recompute();
      input?.focus();
    });
  });
  go?.addEventListener('click', () => {
    if (currentAmount >= min && payoutComplete()) {
      if (requirePayout) savePayout(currentPayout);
      renderResultsScreen(deps, currentAmount);
      showScreen(shadow, 'results');
    }
  });
  shadow.getElementById('ownAgentBtn')?.addEventListener('click', () => {
    const path = data.settings.withdrawal_redirect_path;
    toast(shadow, cashierToastMsg(path));
    withdrawWithoutAgent(path);
  });
  shadow.querySelector('#screenAmount [data-nav="home"]')?.addEventListener('click', () => showScreen(shadow, 'home'));
  wireVideoBoxes(shadow);
  recompute();
}

function cashierToastMsg(path: string): string {
  const url = buildWithdrawalCashierUrl(path);
  return `Opening the cashier withdrawals — pick <b>AgentEpos</b> and withdraw directly. <br><small>${esc(url)}</small>`;
}

// ---- RESULTS ---------------------------------------------------------------

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function renderResultsScreen(deps: FlowDeps, amount: number): void {
  const { shadow, getData } = deps;
  const data = getData();
  if (!data) return;
  const lang = getLang();
  const t = I18N[lang];

  const wrap = shadow.getElementById('screenResults');
  if (!wrap) return;

  // Only LIVE, withdrawal-capable agents whose WITHDRAWAL banks include the
  // player's chosen bank (exact match). Offline never appears. Covering agents
  // are shuffled; if none cover, show closest few (still bank-matched).
  const chosenBank = currentPayout.bank.trim();
  const bankMatches = (a: PublicAgent): boolean => {
    if (!chosenBank) return true; // no bank chosen (payout not required) → no bank filter
    return (a.withdrawal_methods ?? []).some(
      (m) => m.display_name === chosenBank || m.slug === chosenBank,
    );
  };

  const liveWithdrawers = data.agents.filter(
    (a) =>
      a.status === 'live' &&
      a.accepts_withdrawals &&
      a.withdrawal_id &&
      bankMatches(a),
  );
  const covering = shuffle(
    liveWithdrawers.filter((a) => (a.withdrawal_max ?? 0) >= amount),
  );

  let list: PublicAgent[];
  let showNone = false;
  if (covering.length > 0) {
    list = covering;
  } else if (data.settings.withdrawal_no_match_behavior === 'closest') {
    showNone = true;
    list = [...liveWithdrawers]
      .sort((a, b) => (b.withdrawal_max ?? 0) - (a.withdrawal_max ?? 0))
      .slice(0, 3);
  } else {
    showNone = true;
    list = [];
  }

  const cards = list
    .map((a) => {
      const num = String(a.display_number).padStart(2, '0');
      const covers = (a.withdrawal_max ?? 0) >= amount;
      // Show the agent's WITHDRAWAL banks (what they pay out to), not deposit.
      const banks = (a.withdrawal_methods || [])
        .map((m) => `<span class="bank">${esc(m.display_name)}</span>`)
        .join('');
      const label = covers ? t.results_withdraw_here : t.results_withdraw_partial;
      return `
        <div class="agent-card live">
          <div class="agent-top">
            <div class="agent-name-wrap"><div class="agent-avatar live">${num}</div><div class="agent-name">${t.agent} ${esc(String(a.display_number))}</div></div>
            <span class="cap-chip">${t.results_cap_prefix} ${fmt(a.withdrawal_max ?? 0)} ETB</span>
          </div>
          <div class="waiting-text"><span class="typing-dots"><span></span><span></span><span></span></span>${t.results_ready}</div>
          <div class="banks">${banks}</div>
          <button class="deposit-btn gold" data-withdraw-here data-agent-id="${a.id}"><span>${label}</span><span>\u2192</span></button>
        </div>`;
    })
    .join('');

  wrap.innerHTML = `
    <div class="backrow"><button class="backbtn" data-nav="amount">\u2190</button><h2>${t.results_title}</h2></div>
    <div class="res-head">
      <div><small>${t.results_withdrawing}</small><b>${fmt(amount)} ETB</b></div>
      <button data-nav="amount">${t.results_change}</button>
    </div>
    <button class="ownagent" style="margin:0 0 15px" id="ownAgentBtn2"><span class="ow">${t.withdraw_own_agent}<small>${t.withdraw_own_agent_desc}</small></span><span>\u2192</span></button>
    ${showNone ? `<div class="nores"><h4>${t.results_none_title}</h4><p>${t.results_none_desc}</p></div>` : ''}
    <div class="agent-grid" id="resList">${cards}</div>
  `;

  // wiring
  shadow.querySelectorAll('#screenResults [data-nav="amount"]').forEach((b) =>
    b.addEventListener('click', () => showScreen(shadow, 'amount')),
  );
  shadow.getElementById('ownAgentBtn2')?.addEventListener('click', () => {
    const path = data.settings.withdrawal_redirect_path;
    toast(shadow, cashierToastMsg(path));
    withdrawWithoutAgent(path);
  });
  shadow.querySelectorAll('#screenResults [data-withdraw-here]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = parseInt((btn as HTMLElement).dataset.agentId!, 10);
      const agent = list.find((a) => a.id === id);
      if (!agent) return;
      deps.trackClick(id, 'withdrawal', { amount, source: 'list' });
      toast(shadow, cashierToastMsg(data.settings.withdrawal_redirect_path));
      withdrawHere({
        agent,
        amount,
        messageTemplate: data.settings.withdrawal_message_with_amount,
        redirectPath: data.settings.withdrawal_redirect_path,
        payout: currentPayout,
      });
    });
  });
}

// ---- recents actions (called from main via delegation) ---------------------

export function handleRecentMain(deps: FlowDeps, agentId: number, intent: string): void {
  const { shadow, getData } = deps;
  const data = getData();
  if (!data) return;
  const dirEntry = (data.directory ?? []).find((d) => d.id === agentId);
  if (!dirEntry) return;

  if (intent === 'withdrawal') {
    // Recent withdrawal → go through the amount page (needs amount + max check).
    renderAmountScreen(deps);
    showScreen(shadow, 'amount');
    return;
  }

  // Recent deposit → straight to Telegram with deposit prefill.
  const url = buildTelegramUrl(dirEntry.telegram_username, data.settings.chat_prefilled_message);
  if (!dirEntry.online) {
    deps.openOfflineModal(url, agentId, []);
  } else {
    deps.trackClick(agentId, 'deposit', { source: 'recent' });
    window.open(url, '_blank', 'noopener');
  }
}

export function handleRecentContact(deps: FlowDeps, agentId: number): void {
  const data = deps.getData();
  if (!data) return;
  const dirEntry = (data.directory ?? []).find((d) => d.id === agentId);
  if (!dirEntry) return;
  // Contact = open Telegram with an EMPTY message box. No gating, even offline.
  deps.trackClick(agentId, 'contact', { source: 'recent' });
  window.open(`https://telegram.me/${encodeURIComponent(dirEntry.telegram_username)}`, '_blank', 'noopener');
}

// ---- video boxes -----------------------------------------------------------

export function wireVideoBoxes(shadow: ShadowRoot): void {
  shadow.querySelectorAll('.videobox').forEach((box) => {
    box.addEventListener('click', () => {
      const url = (box as HTMLElement).dataset.video || '';
      const id = youTubeId(url);
      if (!id) return;
      (box as HTMLElement).innerHTML =
        `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen title="How to withdraw"></iframe>`;
    });
  });
}
