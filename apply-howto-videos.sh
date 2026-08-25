#!/usr/bin/env bash
# HOW-TO VIDEOS EVERYWHERE + BUNNY SUPPORT
#  - Home (Deposit/Withdraw choice): one notice-board card with two video
#    tiles — "How to deposit" and "How to withdraw" (each shows only if its
#    URL is set).
#  - Deposit questionnaire + deposit agent list: How-to-Deposit video.
#  - Withdrawal amount page + withdrawal results: How-to-Withdraw video.
#  - New admin setting: Settings -> General -> "Deposit how-to video URL"
#    (withdrawal's URL stays in Settings -> Withdrawals).
#  - Video URLs now accept: YouTube, direct .mp4/.webm/.mov, AND Bunny Stream
#    embeds (iframe.mediadelivery.net/...). Bilingual titles.
set -euo pipefail
test -f artisan || { echo "ERROR: run from repo root"; exit 1; }
echo "Writing how-to videos feature..."

cat > 'resources/js/embed/flow.ts' <<'KEMER_EOF'
import { I18N, getLang } from './i18n';
import { esc } from './util';
import { resolveRecents } from './recents';
import {
  buildTelegramUrl,
  fillTemplate,
  withdrawHere,
  withdrawWithoutAgent,
  buildWithdrawalCashierUrl,
  type PayoutDetails,
} from './withdrawal';
import { savePayout, suggestForBank, recentSaved, deletePayout } from './payouts';
import { savePlayerId, deletePlayerId, suggestPlayerIds } from './playerids';
import { detectPlayerId } from './autodetect';
import type { Lang, PublicAgent, PublicAgentsResponse } from './types';

// ---------------------------------------------------------------------------
// Phase 2 flow controller. Owns three screens rendered inside the shadow root:
//   - home     (#screenHome)     : notice/recents/intent live here
//   - amount   (#screenAmount)   : withdrawal amount entry
//   - results  (#screenResults)  : capacity-matched agents
// The existing agent list lives in the home screen's #liveGrid/#offlineGrid,
// rendered by render.ts as before — untouched.
// ---------------------------------------------------------------------------

export type ScreenName = 'home' | 'depask' | 'deposit' | 'amount' | 'results';

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
let currentWPlayerId = '';
let currentDeposit = { amount: 0, playerId: '' };

function autoPlayerId(data: PublicAgentsResponse): string | null {
  return detectPlayerId({
    storageKey: data.settings.player_id_storage_key || undefined,
    domSelector: data.settings.player_id_dom_selector || undefined,
  });
}
let deepLinkHandled = false;
let hashListenerAttached = false;

/**
 * True when the host page URL asks to open the withdrawal screen directly:
 * either a "#withdraw" hash or a "?withdraw=1"/"?intent=withdraw" query param.
 */
function wantsWithdrawDeepLink(): boolean {
  try {
    if (window.location.hash.toLowerCase() === '#withdraw') return true;
    const qs = new URLSearchParams(window.location.search);
    return qs.get('withdraw') === '1' || qs.get('intent') === 'withdraw';
  } catch {
    return false;
  }
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

export function showScreen(shadow: ShadowRoot, name: ScreenName): void {
  ['Home', 'DepAsk', 'Deposit', 'Amount', 'Results'].forEach((s) => {
    const el = shadow.getElementById('screen' + s);
    if (el) el.classList.toggle('active', s.toLowerCase() === name);
  });
  const id = name === 'depask' ? 'screenDepAsk'
    : 'screen' + name.charAt(0).toUpperCase() + name.slice(1);
  shadow.getElementById(id)?.scrollIntoView({ block: 'nearest' });
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

function videoBoxHtml(title: string, sub: string, url: string): string {
  return `
    <div class="videobox" data-video="${esc(url)}">
      <div class="vplay">\u25B6</div>
      <b>${esc(title)}</b>
      ${sub ? `<small>${esc(sub)}</small>` : ''}
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

  // MASTER SWITCH — withdrawals disabled: the widget behaves like the classic
  // deposit-only embed. No intent chooser; the player lands directly on the
  // agent list (deposit screen) with its back button hidden. Player notices
  // render at the top of that screen instead of the (unreachable) home.
  const withdrawalsOn = data.settings.withdrawals_enabled !== false;
  const depBack = shadow.querySelector('#screenDeposit .backrow') as HTMLElement | null;
  if (!withdrawalsOn) {
    if (depBack) depBack.style.display = 'none';
    // Land on the deposit questionnaire unless the player already moved past it.
    const active = shadow.querySelector('.screen.active') as HTMLElement | null;
    if (!active || active.id === 'screenHome') {
      renderDepAskScreen(deps);
      showScreen(shadow, 'depask');
    }
  } else if (depBack) {
    depBack.style.display = '';
  }

  // Deep link: open the withdrawal screen directly (one click from anywhere on
  // the host site via "#withdraw"). Only once per page load, only when the
  // master switch is on.
  if (withdrawalsOn && !deepLinkHandled && wantsWithdrawDeepLink()) {
    deepLinkHandled = true;
    renderAmountScreen(deps);
    showScreen(shadow, 'amount');
  }

  // Also react to the hash changing WHILE the page is open (a "Withdraw"
  // button on the same page as the widget), not just on page load.
  if (!hashListenerAttached) {
    hashListenerAttached = true;
    window.addEventListener('hashchange', () => {
      const d = deps.getData();
      const on = d && d.settings.withdrawals_enabled !== false;
      if (on && window.location.hash.toLowerCase() === '#withdraw') {
        renderAmountScreen(deps);
        showScreen(deps.shadow, 'amount');
      }
    });
  }

  // Player notice board (admin-managed, audience=player/both)
  const noticeWrap = shadow.getElementById('noticeWrap');
  const noticeWrapDep = shadow.getElementById('noticeWrapDep');
  const noticeTarget = withdrawalsOn ? noticeWrap : noticeWrapDep;
  const noticeOther = withdrawalsOn ? noticeWrapDep : noticeWrap;
  if (noticeOther) noticeOther.innerHTML = '';
  // Deposit how-to on the deposit agent list screen.
  const depHowtoWrap = shadow.getElementById('depHowtoWrap');
  if (depHowtoWrap) {
    const dep = data.settings.deposit_howto_video_url || '';
    depHowtoWrap.innerHTML = dep ? videoBoxHtml(t.howto_dep_title, '', dep) : '';
  }

  // How-to videos card (deposit + withdraw) on the home notice board.
  const howtoWrap = shadow.getElementById('howtoWrap');
  if (howtoWrap) {
    const dep = data.settings.deposit_howto_video_url || '';
    const wd = data.settings.withdrawal_howto_video_url || '';
    if (!withdrawalsOn || (!dep && !wd)) {
      howtoWrap.innerHTML = '';
    } else {
      howtoWrap.innerHTML = `
        <div class="notice">
          ${dep ? videoBoxHtml(t.howto_dep_title, '', dep) : ''}
          ${wd ? videoBoxHtml(t.howto_wd_title, '', wd) : ''}
        </div>`;
    }
  }

  if (noticeTarget) {
    const notices = data.notices ?? [];
    if (notices.length === 0) {
      noticeTarget.innerHTML = '';
    } else {
      noticeTarget.innerHTML = notices
        .map((n) => {
          const playable = n.video_url
            ? (youTubeId(n.video_url) !== null || /\.(mp4|webm|mov)(\?|#|$)/i.test(n.video_url))
            : false;
          const videoHtml = playable
            ? `<div class="videobox nb-video" data-video="${esc(n.video_url ?? '')}"><div class="vplay">\u25B6</div><b>${t.withdraw_howto}</b></div>`
            : '';
          return `
            <div class="notice">
              <div class="nb-tag">${n.priority === 'urgent' ? '\uD83D\uDCE3' : '\uD83D\uDCCC'} ${esc(n.title || '')}</div>
              <p>${esc(n.body)}</p>
              ${videoHtml}
            </div>`;
        })
        .join('');
    }
  }
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


/** Compose the deposit Telegram message from the questionnaire, or null. */
export function getDepositMessage(data: PublicAgentsResponse): string | null {
  if (!currentDeposit.playerId.trim() || currentDeposit.amount <= 0) return null;
  const template = data.settings.deposit_message
    || 'Hi Kemerbet agent, I want to deposit {amount} ETB. My Player ID: {player_id}';
  return fillTemplate(template, {
    amount: currentDeposit.amount,
    player_id: currentDeposit.playerId,
  });
}

function playerIdChips(ids: string[], inputId: string): string {
  if (ids.length === 0) return '';
  return `<div class="pid-row" data-pid-input="${inputId}">${ids
    .map((id) => `<span class="pid-chip"><button class="pid-use" data-pid="${esc(id)}">${esc(id)}</button><button class="pid-x" data-pid-del="${esc(id)}">\u00d7</button></span>`)
    .join('')}</div>`;
}

function wirePlayerIdChips(deps: FlowDeps, rerender: () => void, onPick: (id: string) => void): void {
  const { shadow } = deps;
  shadow.querySelectorAll('.pid-row .pid-use').forEach((b) =>
    b.addEventListener('click', () => onPick((b as HTMLElement).dataset.pid || '')),
  );
  shadow.querySelectorAll('.pid-row .pid-x').forEach((b) =>
    b.addEventListener('click', () => {
      deletePlayerId((b as HTMLElement).dataset.pidDel || '');
      rerender();
    }),
  );
}

export function renderDepAskScreen(deps: FlowDeps): void {
  const { shadow, getData } = deps;
  const data = getData();
  if (!data) return;
  const lang = getLang();
  const t = I18N[lang];
  const wrap = shadow.getElementById('screenDepAsk');
  if (!wrap) return;

  const quick = (data.settings.deposit_quick_amounts ?? [])
    .map((v) => `<button class="q" data-dep-quick="${v}">${fmt(v)}</button>`)
    .join('');

  // Amount is never remembered — every visit starts empty.
  currentDeposit.amount = 0;

  // Auto-detect the player ID from the host page. The CURRENT session's ID is
  // authoritative: it always wins over remembered values (players can log out
  // and back in with a different account). Still editable by the player.
  const detectedId = autoPlayerId(data);
  if (detectedId) currentDeposit.playerId = detectedId;

  // ID suggestions: deposit's own history first, topped up with IDs stored
  // inside saved withdrawal accounts (deduped), max 4.
  const depIds: string[] = detectedId ? [] : suggestPlayerIds('deposit');
  if (!detectedId) {
    for (const p of recentSaved(8)) {
      if (depIds.length >= 4) break;
      const pid = (p.playerId ?? '').trim();
      if (pid && !depIds.includes(pid)) depIds.push(pid);
    }
  }

  const depHowto = data.settings.deposit_howto_video_url || '';
  wrap.innerHTML = `
    <div class="backrow" id="depAskBack"><button class="backbtn" data-nav="home">\u2190</button><h2>${t.intent_deposit}</h2></div>
    ${depHowto ? videoBoxHtml(t.howto_dep_title, '', depHowto) : ''}
    <div class="payout">
      <div class="payout-title">${t.depask_title}</div>
      <div class="amt-line" style="justify-content:flex-start;padding:0 2px 7px">
        <input id="depAmtInput" type="text" inputmode="numeric" placeholder="0" style="width:130px;background:transparent;border:0;outline:0;color:var(--text-light);font:900 26px 'Inter',sans-serif" />
        <b>ETB</b>
      </div>
      ${quick ? `<div class="quick" style="margin:8px 0 4px">${quick}</div>` : ''}
      <div class="pid-note${detectedId ? ' auto' : ''}" style="margin-top:8px">${detectedId ? t.pid_auto_label : t.pid_login_hint}</div>
      <input class="pf" id="depPidInput" type="text" autocomplete="off" placeholder="${t.player_id_ph}" value="${esc(currentDeposit.playerId)}" />
      ${playerIdChips(depIds.slice(0, 4), 'depPidInput')}
    </div>
    <button class="bigcta" id="depGo" disabled>${t.depask_see_agents}</button>
  `;

  const amt = shadow.getElementById('depAmtInput') as HTMLInputElement | null;
  const pid = shadow.getElementById('depPidInput') as HTMLInputElement | null;
  const go = shadow.getElementById('depGo') as HTMLButtonElement | null;

  const recompute = () => {
    if (!amt || !go) return;
    const raw = amt.value.replace(/[^0-9]/g, '');
    currentDeposit.amount = parseInt(raw || '0', 10);
    if (raw) amt.value = fmt(currentDeposit.amount);
    currentDeposit.playerId = pid?.value ?? '';
    go.disabled = !(currentDeposit.amount > 0 && currentDeposit.playerId.trim() !== '');
  };
  amt?.addEventListener('input', recompute);
  pid?.addEventListener('input', recompute);
  shadow.querySelectorAll('#screenDepAsk [data-dep-quick]').forEach((b) =>
    b.addEventListener('click', () => {
      if (amt) amt.value = fmt(parseInt((b as HTMLElement).dataset.depQuick!, 10));
      recompute();
    }),
  );
  wirePlayerIdChips(deps, () => renderDepAskScreen(deps), (id) => {
    if (pid) pid.value = id;
    recompute();
  });
  wireVideoBoxes(shadow);
  recompute();
  go?.addEventListener('click', () => {
    if (currentDeposit.amount > 0 && currentDeposit.playerId.trim() !== '') {
      savePlayerId(currentDeposit.playerId, 'deposit');
      showScreen(shadow, 'deposit');
    }
  });
}

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

  const requirePayout = data.settings.withdrawal_require_payout_details !== false;
  const wQuick = (data.settings.withdrawal_quick_amounts ?? [])
    .map((v) => `<button class="q" data-wq="${v}">${fmt(v)}</button>`)
    .join('');
  const banks = data.settings.withdrawal_bank_options ?? [];
  const bankOpts = ['<option value="">' + t.payout_bank_ph + '</option>']
    .concat(banks.map((b) => `<option value="${esc(b)}">${esc(b)}</option>`))
    .join('');

  // Current session's ID is authoritative (see deposit screen note).
  const detectedId = autoPlayerId(data);
  if (detectedId) currentWPlayerId = detectedId;

  const saved = requirePayout ? recentSaved(4) : [];
  // Separate ID-only chips: ONLY deposit-derived IDs, only to top up while
  // fewer than 4 saved accounts exist. A full 4 shows no separate ID chips.
  const savedIds = saved.map((p) => (p.playerId ?? '').trim()).filter(Boolean);
  const wdIdChips = (detectedId || saved.length >= 4)
    ? []
    : suggestPlayerIds('deposit')
        .filter((id) => !savedIds.includes(id))
        .slice(0, 4 - saved.length);
  const savedHtml = saved.length
    ? `<div class="payout-saved" id="payoutSaved">${saved
        .map(
          (s, i) =>
            `<div class="psug" data-sug="${i}"><button class="psug-x" data-del="${i}" aria-label="Delete">\u2715</button><span class="psug-name">${esc(s.name)}</span><span class="psug-meta">${esc(s.bank)} \u00b7 ${esc(s.account)}${s.playerId ? ' \u00b7 ID ' + esc(s.playerId) : ''}</span></div>`,
        )
        .join('')}</div>`
    : '';

  const payoutHtml = requirePayout
    ? `
    <div class="payout">
      <div class="payout-title">${t.payout_title}</div>
      <div class="pid-note${detectedId ? ' auto' : ''}">${detectedId ? t.pid_auto_label : t.pid_login_hint}</div>
      <input class="pf" id="pfPlayerId" type="text" autocomplete="off" placeholder="${t.player_id_ph}" value="${esc(currentWPlayerId)}" />
      ${playerIdChips(wdIdChips, 'pfPlayerId')}
      <input class="pf" id="pfName" type="text" autocomplete="off" placeholder="${t.payout_name_ph}" value="${esc(currentPayout.name)}" />
      <select class="pf" id="pfBank">${bankOpts}</select>
      <input class="pf" id="pfAccount" type="text" inputmode="numeric" autocomplete="off" placeholder="${t.payout_account_ph}" value="${esc(currentPayout.account)}" />
      ${savedHtml}
    </div>`
    : '';

  wrap.innerHTML = `
    <div class="backrow"><button class="backbtn" data-nav="home">\u2190</button><h2>${t.withdraw_title}</h2></div>
    ${howto ? videoBoxHtml(t.howto_wd_title, t.withdraw_howto_sub, howto) : ''}
    ${payoutHtml}
    <div class="amount-wrap">
      <label>${t.withdraw_amount_label}</label>
      <div class="amt-line">
        <input id="amtInput" type="text" inputmode="numeric" placeholder="0" />
        <b>ETB</b>
      </div>
      <div class="amt-hint" id="amtHint">${t.withdraw_min_prefix} ${fmt(min)} ETB</div>
    </div>
    ${wQuick ? `<div class="quick">${wQuick}</div>` : ''}
    <button class="bigcta" id="amtGo" disabled>${t.withdraw_see_agents}</button>
    <button class="ownagent" id="ownAgentBtn"><span class="ow">${t.withdraw_own_agent}<small>${t.withdraw_own_agent_desc}</small></span><span>\u2192</span></button>
  `;

  const input = shadow.getElementById('amtInput') as HTMLInputElement | null;
  const hint = shadow.getElementById('amtHint');
  const go = shadow.getElementById('amtGo') as HTMLButtonElement | null;
  const pfPlayerId = shadow.getElementById('pfPlayerId') as HTMLInputElement | null;
  const pfName = shadow.getElementById('pfName') as HTMLInputElement | null;
  const pfBank = shadow.getElementById('pfBank') as HTMLSelectElement | null;
  const pfAccount = shadow.getElementById('pfAccount') as HTMLInputElement | null;

  // restore previously-selected bank
  if (pfBank && currentPayout.bank) pfBank.value = currentPayout.bank;

  const payoutComplete = (): boolean => {
    if (currentWPlayerId.trim() === '') return false;
    if (!requirePayout) return true;
    return (
      currentPayout.name.trim() !== '' &&
      currentPayout.bank.trim() !== '' &&
      currentPayout.account.trim() !== ''
    );
  };

  const syncPayout = () => {
    currentWPlayerId = pfPlayerId?.value ?? '';
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
  shadow.querySelectorAll('#screenAmount [data-wq]').forEach((b) =>
    b.addEventListener('click', () => {
      if (input) input.value = fmt(parseInt((b as HTMLElement).dataset.wq!, 10));
      recompute();
    }),
  );
  pfPlayerId?.addEventListener('input', () => { syncPayout(); recompute(); });
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

  wirePlayerIdChips(deps, () => renderAmountScreen(deps), (pid) => {
    if (pfPlayerId) pfPlayerId.value = pid;
    syncPayout();
    recompute();
  });

  // Saved-account suggestions: clicking a card fills ALL three fields,
  // replacing whatever was there. The ✕ deletes that saved account instead.
  shadow.querySelectorAll('#screenAmount .psug').forEach((b) => {
    b.addEventListener('click', (e) => {
      const idx = parseInt((b as HTMLElement).dataset.sug!, 10);
      const s = saved[idx];
      if (!s) return;
      const target = e.target as HTMLElement;
      if (target.closest('[data-del]')) {
        // delete this saved account, then re-render the screen
        e.stopPropagation();
        deletePayout(s.bank, s.account);
        renderAmountScreen(deps);
        return;
      }
      if (pfName) pfName.value = s.name;
      if (pfBank) pfBank.value = s.bank;
      if (pfAccount) pfAccount.value = s.account;
      if (pfPlayerId && s.playerId && !detectedId) pfPlayerId.value = s.playerId;
      syncPayout();
      recompute();
    });
  });

  go?.addEventListener('click', () => {
    if (currentAmount >= min && payoutComplete()) {
      if (requirePayout) savePayout({ ...currentPayout, playerId: currentWPlayerId });
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

/** Copy text to the clipboard (secure-context API with a fallback). */
function copyText(text: string): void {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      void navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  } catch {
    /* clipboard unavailable — chip still shows the ID for manual copy */
  }
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
  // player's chosen bank. Matching is case- and space-insensitive so a
  // settings-list name like "Telebirr" still matches the catalog's "TeleBirr".
  const norm = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, '');
  const chosenBank = norm(currentPayout.bank);
  const bankMatches = (a: PublicAgent): boolean => {
    if (!chosenBank) return true; // no bank chosen (payout not required) → no bank filter
    return (a.withdrawal_methods ?? []).some(
      (m) => norm(m.display_name) === chosenBank || norm(m.slug) === chosenBank,
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
          <button class="idchip" data-copy-id="${esc(a.withdrawal_id ?? '')}">${t.results_id_label}: <b>${esc(a.withdrawal_id ?? '')}</b> \u29C9</button>
          <div class="banks">${banks}</div>
          <button class="deposit-btn gold" data-withdraw-here data-agent-id="${a.id}"><span>${label}</span><span>\u2192</span></button>
        </div>`;
    })
    .join('');

  const wHowto = data.settings.withdrawal_howto_video_url || '';
  wrap.innerHTML = `
    <div class="backrow"><button class="backbtn" data-nav="amount">\u2190</button><h2>${t.results_title}</h2></div>
    ${wHowto ? videoBoxHtml(t.howto_wd_title, '', wHowto) : ''}
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
  shadow.querySelectorAll('#screenResults .idchip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const idText = (chip as HTMLElement).dataset.copyId ?? '';
      if (!idText) return;
      copyText(idText);
      toast(shadow, `${t.results_id_copied} <b>${esc(idText)}</b>`);
    });
  });
  wireVideoBoxes(shadow);
  shadow.querySelectorAll('#screenResults [data-withdraw-here]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = parseInt((btn as HTMLElement).dataset.agentId!, 10);
      const agent = list.find((a) => a.id === id);
      if (!agent) return;
      const covers = (agent.withdrawal_max ?? 0) >= amount;
      deps.trackClick(id, 'withdrawal', { amount, source: covers ? 'list' : 'partial' });
      if (agent.withdrawal_id) copyText(agent.withdrawal_id);
      toast(shadow, `${t.results_id_copied} <b>${esc(agent.withdrawal_id ?? '')}</b> \u00b7 ` + cashierToastMsg(data.settings.withdrawal_redirect_path));
      withdrawHere({
        agent,
        amount,
        messageTemplate: data.settings.withdrawal_message_with_amount,
        redirectPath: data.settings.withdrawal_redirect_path,
        payout: currentPayout,
        playerId: currentWPlayerId,
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

  // Recent deposit → through the questionnaire (amount + player ID are
  // required before any deposit), then the agent list.
  renderDepAskScreen(deps);
  showScreen(shadow, 'depask');
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
      if (!url || box.querySelector('iframe, video')) return;

      // Bunny Stream embeds (iframe.mediadelivery.net) play in their iframe.
      if (/iframe\.mediadelivery\.net\//i.test(url)) {
        const sep = url.includes('?') ? '&' : '?';
        box.innerHTML = `<iframe src="${esc(url)}${sep}autoplay=true" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe>`;
        (box as HTMLElement).style.cursor = 'default';
        return;
      }

      // Direct video files (self-hosted MP4/WebM) play natively — no YouTube,
      // no age gate. Anything else goes through the YouTube embed as before.
      if (/\.(mp4|webm|mov)(\?|#|$)/i.test(url)) {
        box.innerHTML = `<video controls autoplay playsinline style="position:absolute;inset:0;width:100%;height:100%;background:#000" src="${esc(url)}"></video>`;
        (box as HTMLElement).style.cursor = 'default';
        return;
      }

      const id = youTubeId(url);
      if (!id) return;
      box.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe>`;
      (box as HTMLElement).style.cursor = 'default';
    });
  });
}
KEMER_EOF
echo '  wrote resources/js/embed/flow.ts'

cat > 'resources/js/embed/main.ts' <<'KEMER_EOF'
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
  type FlowDeps,
} from './flow';
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
  shadow.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const btn = target.closest('[data-agent-id]') as HTMLElement | null;
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
KEMER_EOF
echo '  wrote resources/js/embed/main.ts'

cat > 'resources/js/embed/i18n.ts' <<'KEMER_EOF'
import type { Lang } from './types';

export interface Translations {
  title: string;
  subtitle: string;
  live_now: string;
  recently_online: string;
  agents_online: string;
  no_agents_online: string;
  live_label: string;
  offline_label: string;
  truly_online: string;
  last_seen: string;
  just_now: string;
  min_ago_suffix: string;
  hour_unit: string;
  day_unit: string;
  ago: string;
  deposit: string;
  agent: string;
  live_count: string;
  no_agents_title: string;
  no_agents_desc: string;
  loading: string;
  updating: string;
  warn_title: string;
  warn_desc: string;
  cancel: string;
  continue: string;
  // --- Phase 2: intent + withdrawal flow ---
  intent_question: string;
  intent_deposit: string;
  intent_deposit_desc: string;
  intent_withdraw: string;
  intent_withdraw_desc: string;
  withdraw_title: string;
  withdraw_amount_label: string;
  withdraw_min_prefix: string;
  withdraw_min_error: string;
  withdraw_see_agents: string;
  withdraw_own_agent: string;
  withdraw_own_agent_desc: string;
  withdraw_note: string;
  withdraw_howto: string;
  withdraw_howto_sub: string;
  results_title: string;
  results_withdrawing: string;
  results_change: string;
  results_cap_prefix: string;
  results_ready: string;
  results_withdraw_here: string;
  results_withdraw_partial: string;
  results_none_title: string;
  results_none_desc: string;
  recents_title: string;
  recents_only_you: string;
  recents_contact: string;
  recents_online: string;
  recents_offline: string;
  back: string;
  payout_title: string;
  payout_name_ph: string;
  payout_bank_ph: string;
  payout_account_ph: string;
  payout_note: string;
  depask_title: string;
  depask_see_agents: string;
  player_id_ph: string;
  pid_auto_label: string;
  pid_login_hint: string;
  howto_dep_title: string;
  howto_wd_title: string;
  results_id_label: string;
  results_id_copied: string;
}

export const I18N: Record<Lang, Translations> = {
  am: {
    title: 'Kemerbet ኤጀንቶች',
    subtitle: 'ኦንላይን ያሉ ኤጀንቶች ቅድሚያ ይታያሉ። ዲፖዚት ለማድረግ ይምረጡ።',
    live_now: 'አሁን ኦንላይን',
    recently_online: 'በቅርብ ጊዜ ኦንላይን የነበሩ',
    agents_online: 'ኤጀንቶች ኦንላይን ናቸው',
    no_agents_online: 'ምንም ኤጀንት ኦንላይን የለም',
    live_label: 'ኦንላይን',
    offline_label: 'ኦፍላይን',
    truly_online: 'ትክክለኛ ኦንላይን ያሉ',
    last_seen: 'መጨረሻ የታየው',
    just_now: 'አሁን',
    min_ago_suffix: 'ደቂቃ በፊት',
    hour_unit: 'ሰዓት',
    day_unit: 'ቀን',
    ago: 'በፊት',
    deposit: 'ዲፖዚት',
    agent: 'ኤጀንት',
    live_count: 'ኦንላይን',
    no_agents_title: 'ምንም ኤጀንት አሁን ኦንላይን የለም',
    no_agents_desc: 'ከታች በቅርብ ጊዜ ኦንላይን የነበሩ ኤጀንቶችን ይመልከቱ።',
    loading: 'በመጫን ላይ…',
    updating: 'እያዘመነ ነው',
    warn_title: 'ይህ ኤጀንት ኦፍላይን ሊሆን ይችላል',
    warn_desc: 'ኤጀንቱ ለተወሰነ ጊዜ ኦንላይን አልነበረም እና በፍጥነት ላይመልስልዎ ይችላል። መቀጠል ይፈልጋሉ?',
    cancel: 'ይቅር',
    continue: 'ቀጥል',
    intent_question: 'ምን ማድረግ ይፈልጋሉ?',
    intent_deposit: 'ዲፖዚት',
    intent_deposit_desc: 'ኦንላይን ያሉ ኤጀንቶችን አይተው ገንዘብ ያስገቡ',
    intent_withdraw: 'ማውጣት',
    intent_withdraw_desc: 'መጠን ያስገቡ → የሚከፍሉ ኤጀንቶች ይታያሉ',
    withdraw_title: 'ማውጣት',
    withdraw_amount_label: 'ምን ያህል ማውጣት ይፈልጋሉ?',
    withdraw_min_prefix: 'ዝቅተኛ',
    withdraw_min_error: 'ዝቅተኛው መጠን',
    withdraw_see_agents: 'ይህን መጠን የሚከፍሉ ኤጀንቶችን ይመልከቱ',
    withdraw_own_agent: 'የራሴ ኤጀንት',
    withdraw_own_agent_desc: 'በቀጥታ በሳይቱ ላይ ያውጡ',
    withdraw_note: 'የገንዘብ መጠንዎን የሚሸፍኑ ኤጀንቶችን ብቻ እናሳያለን። የቴሌግራም መልእክትዎ ከመጠኑ እና ከኤጀንቱ የማውጫ መለያ ጋር ዝግጁ ሆኖ ይመጣል።',
    withdraw_howto: 'ማውጣት እንዴት እንደሚሰራ',
    withdraw_howto_sub: 'ቪዲዮ',
    results_title: 'ለመጠንዎ ኤጀንቶች',
    results_withdrawing: 'በማውጣት ላይ',
    results_change: 'ቀይር',
    results_cap_prefix: 'እስከ',
    results_ready: 'ኦንላይን · ለመክፈል ዝግጁ',
    results_withdraw_here: 'እዚህ ያውጡ',
    results_withdraw_partial: 'በከፊል ያውጡ',
    results_none_title: 'አሁን ይህን ሙሉ መጠን የሚከፍል ኤጀንት የለም',
    results_none_desc: 'እነዚህ በጣም ቅርብ ናቸው — መጠኑን መከፋፈል፣ ትንሽ መጠን መምረጥ ወይም ቆይተው መመለስ ይችላሉ።',
    recents_title: 'የቅርብ ጊዜ ኤጀንቶችዎ',
    recents_only_you: 'እርስዎ ብቻ ያዩታል',
    recents_contact: 'አግኝ',
    recents_online: 'ኦንላይን',
    recents_offline: 'ኦፍላይን',
    back: 'ተመለስ',
    payout_title: 'ገንዘቡ የሚላክበት መረጃ',
    payout_name_ph: 'ሙሉ ስም',
    payout_bank_ph: 'ባንክ ይምረጡ',
    payout_account_ph: 'የሂሳብ ቁጥር',
    payout_note: 'ይህ መረጃ ለኤጀንቱ በቴሌግራም መልእክት ውስጥ ይላካል። በመሳሪያዎ ላይ ብቻ ይቀመጣል።',
    depask_title: 'ምን ያህል ማስገባት ይፈልጋሉ?',
    depask_see_agents: 'ዝግጁ ኤጀንቶችን ይመልከቱ',
    player_id_ph: 'የተጫዋች መለያ (Player ID)',
    pid_auto_label: 'የተጫዋች መለያ — በራስ-ሰር ተሞልቷል',
    pid_login_hint: 'የተጫዋች መለያዎ በራስ-ሰር እንዲሞላ ወደ ሳይቱ ይግቡ',
    howto_dep_title: 'እንዴት ገንዘብ ማስገባት እንደሚቻል',
    howto_wd_title: 'እንዴት ገንዘብ ማውጣት እንደሚቻል',
    results_id_label: 'የመውጫ መለያ',
    results_id_copied: 'መለያው ተቀድቷል:',
  },
  en: {
    title: 'Kemerbet Agents',
    subtitle: 'Live agents are shown first. Tap to deposit.',
    live_now: 'Live Now',
    recently_online: 'Recently online',
    agents_online: 'agents online',
    no_agents_online: 'No agents online',
    live_label: 'Live',
    offline_label: 'Offline',
    truly_online: 'Truly online',
    last_seen: 'Last seen',
    just_now: 'just now',
    min_ago_suffix: 'min ago',
    hour_unit: 'h',
    day_unit: 'd',
    ago: 'ago',
    deposit: 'Deposit',
    agent: 'Agent',
    live_count: 'live',
    no_agents_title: 'No agents live right now',
    no_agents_desc: 'Check below for recently online agents.',
    loading: 'Loading agents…',
    updating: 'Updating',
    warn_title: 'This agent may be offline',
    warn_desc: 'The agent has not been online for a while and may not respond quickly. Do you want to continue?',
    cancel: 'Cancel',
    continue: 'Continue',
    intent_question: 'What do you want to do?',
    intent_deposit: 'Deposit',
    intent_deposit_desc: 'See all online agents and send money',
    intent_withdraw: 'Withdraw',
    intent_withdraw_desc: 'Enter amount → matched to agents who can pay it',
    withdraw_title: 'Withdraw',
    withdraw_amount_label: 'How much do you want to withdraw?',
    withdraw_min_prefix: 'Minimum',
    withdraw_min_error: 'Minimum is',
    withdraw_see_agents: 'See agents who can pay this',
    withdraw_own_agent: 'My own agent',
    withdraw_own_agent_desc: 'withdraw directly on the site',
    withdraw_note: 'We only show agents whose cash covers your amount, so you don\'t waste time asking. Your Telegram message comes ready with the amount and the agent\'s Withdrawal ID.',
    withdraw_howto: 'How withdrawal works',
    withdraw_howto_sub: 'Video',
    results_title: 'Agents for your amount',
    results_withdrawing: 'Withdrawing',
    results_change: 'Change',
    results_cap_prefix: 'Up to',
    results_ready: 'Online · ready to pay',
    results_withdraw_here: 'Withdraw here',
    results_withdraw_partial: 'Withdraw partial',
    results_none_title: 'No agent can pay this full amount right now',
    results_none_desc: 'These agents are closest — split your withdrawal, choose a smaller amount, or check back soon.',
    recents_title: 'Your recent agents',
    recents_only_you: 'only you see this',
    recents_contact: 'Contact',
    recents_online: 'Online',
    recents_offline: 'Offline',
    back: 'Back',
    payout_title: 'Where should the agent send the money?',
    payout_name_ph: 'Full name',
    payout_bank_ph: 'Select bank',
    payout_account_ph: 'Account number',
    payout_note: 'This is included in your Telegram message to the agent. Saved only on your device.',
    depask_title: 'How much will you deposit?',
    depask_see_agents: 'See available agents',
    player_id_ph: 'Player ID',
    pid_auto_label: 'Player ID — filled automatically',
    pid_login_hint: 'Log in to fill your Player ID automatically',
    howto_dep_title: 'How to deposit',
    howto_wd_title: 'How to withdraw',
    results_id_label: 'Withdrawal ID',
    results_id_copied: 'ID copied:',
  },
};

export const LANG_KEY = 'kemerbet_lang';

export function getLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'am' || saved === 'en') return saved;
  } catch {
    // localStorage may be unavailable
  }
  return 'am';
}

export function setLang(lang: Lang): void {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // localStorage may be unavailable
  }
}
KEMER_EOF
echo '  wrote resources/js/embed/i18n.ts'

cat > 'resources/js/embed/types.ts' <<'KEMER_EOF'
export interface AgentPaymentMethod {
  slug: string;
  display_name: string;
}

export interface PublicAgent {
  id: number;
  display_number: number;
  telegram_username: string;
  status: 'live' | 'recently_offline';
  is_pinned?: boolean;
  last_seen_at?: string; // ISO 8601, only for recently_offline
  payment_methods: AgentPaymentMethod[];
  // Withdrawal capability — present on every agent in the payload.
  accepts_withdrawals?: boolean;
  withdrawal_max?: number | null;
  withdrawal_id?: string | null;
  withdrawal_methods?: AgentPaymentMethod[];
}

// Compact entry for every active agent, used to resolve a player's stored
// "recent agents" even when the agent isn't in the current live/offline list.
export interface AgentDirectoryEntry {
  id: number;
  display_number: number;
  telegram_username: string;
  online: boolean;
  accepts_withdrawals: boolean;
  withdrawal_max: number | null;
  has_withdrawal_id: boolean;
}

export interface PlayerNotice {
  id: number;
  title: string | null;
  body: string;
  priority: 'urgent' | 'info';
  video_url: string | null;
}

export interface PublicAgentsResponse {
  cached_at: string;
  live_count: number;
  agents: PublicAgent[];
  directory: AgentDirectoryEntry[];
  notices?: PlayerNotice[];
  settings: {
    chat_prefilled_message: string;
    show_offline_agents: boolean;
    shuffle_live_agents: boolean;
    onboarding_video_url: string;
    // --- Withdrawal ---
    withdrawals_enabled: boolean;
    withdrawal_min: number;
    withdrawal_quick_amounts: number[];
    withdrawal_redirect_path: string; // relative, e.g. /sport/popup/withdrawal
    withdrawal_howto_video_url: string;
    deposit_howto_video_url?: string;
    withdrawal_no_match_behavior: 'closest' | 'empty';
    withdrawal_bank_options: string[];
    withdrawal_require_payout_details: boolean;
    withdrawal_message_with_amount: string;
    withdrawal_message_no_amount: string;
    deposit_quick_amounts?: number[];
    deposit_message?: string;
    player_id_storage_key?: string;
    player_id_dom_selector?: string;
    recents_enabled: boolean;
    recents_count: number;
  };
}

export type Lang = 'am' | 'en';
KEMER_EOF
echo '  wrote resources/js/embed/types.ts'

cat > 'database/seeders/SettingSeeder.php' <<'KEMER_EOF'
<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SettingSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $settings = [
                'prefill_message' => 'Hi Kemerbet agent, I want to deposit',
                'agent_hide_after_hours' => 12,
                'public_refresh_interval_seconds' => 60,
                'show_offline_agents' => true,
                'warn_on_offline_click' => true,
                'shuffle_live_agents' => true,
                'onboarding_video_url' => '',

                // --- Withdrawal system ---
                // LAUNCH DARK: withdrawals ship disabled. The widget behaves as
                // the classic deposit-only embed until an admin flips this on in
                // Settings -> Withdrawals (after configuring agent IDs, banks,
                // and templates).
                'withdrawals_enabled' => false,
                'withdrawal_min' => 200,
                'withdrawal_max_default' => 10000,
                'withdrawal_quick_amounts' => [200, 500, 1000, 3000, 5000, 10000, 25000, 50000, 100000],
                // Relative path only — the widget prepends the origin of the
                // domain it is embedded on, so this works across all domains.
                'withdrawal_redirect_path' => '/sport/popup/withdrawal',
                'withdrawal_howto_video_url' => '',
                'deposit_howto_video_url' => '',
                // Shown when no online agent covers the requested amount:
                // 'closest' shows the highest-capacity agents anyway,
                // 'empty' shows only the empty-state message.
                'withdrawal_no_match_behavior' => 'closest',

                // Banks/methods offered in the withdrawal payout form (player
                // picks one). Keep these aligned with the payment-methods
                // catalog names (editable later in Settings -> Withdrawals).
                'withdrawal_bank_options' => [
                    'TeleBirr', 'M-Pesa', 'CBE Birr', 'Dashen Bank',
                    'Awash Bank', 'Bank of Abyssinia', 'Cooperative Bank',
                    'Wegagen Bank',
                ],
                // Require the player to enter payout details (name/bank/account)
                // before they can see matched agents.
                'withdrawal_require_payout_details' => true,

                // --- Auto-message templates ---
                // Placeholders: {amount}, {withdrawal_id}, {name}, {bank}, {account}
                // NOTE: {withdrawal_id} and {account} are wrapped in backticks by
                // the widget so Telegram renders them as tap-to-copy once sent.
                'deposit_prefill_message' => 'Hi Kemerbet agent, I want to deposit',
                // Deposit questionnaire (amount + player id before the list)
                'deposit_quick_amounts' => [200, 300, 500, 1000, 2000, 5000, 10000],
                'deposit_message' => "Hi Kemerbet agent, I want to deposit {amount} ETB.\nMy Player ID: {player_id}",
                // Player-ID auto-detect on the host page (empty = off).
                // Order: window.KEMERBET_PLAYER_ID, then this localStorage key,
                // then this CSS selector.
                'player_id_storage_key' => '',
                'player_id_dom_selector' => '',
                'withdrawal_message_with_amount' => "Hi dear agent, to your Withdrawal ID {withdrawal_id} I want to withdraw {amount} ETB.\nPlease send to:\nName: {name}\nBank: {bank}\nAccount: {account}\nI will share my withdrawal code shortly.",
                'withdrawal_message_no_amount' => 'Hi dear agent, to your Withdrawal ID {withdrawal_id} I want to withdraw — I will share the amount and my withdrawal code shortly.',

                // --- Recents (per-player, client-side) ---
                'recents_enabled' => true,
                'recents_count' => 5,
            ];

            foreach ($settings as $key => $value) {
                // firstOrCreate: only ADD missing keys. Never overwrite a value
                // an admin has edited — this makes the seeder safe to re-run on
                // production (e.g. after a deploy that introduces new settings).
                Setting::firstOrCreate(
                    ['key' => $key],
                    [
                        'value' => $value,
                        'updated_at' => now(),
                    ]
                );
            }
        });
    }
}
KEMER_EOF
echo '  wrote database/seeders/SettingSeeder.php'

cat > 'app/Http/Controllers/Public/PublicAgentsController.php' <<'KEMER_EOF'
<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use App\Models\ClickEvent;
use App\Models\Setting;
use App\Models\StatusEvent;
use App\Models\VisitEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class PublicAgentsController extends Controller
{
    public function index(): JsonResponse
    {
        $data = Cache::remember('public_agents', 60, function () {
            return $this->buildPayload();
        });

        return response()->json($data);
    }

    private function buildPayload(): array
    {
        $now = now();
        $recentThreshold = $now->copy()->subMinutes(30);

        $settings = Setting::whereIn('key', [
            'prefill_message',
            'deposit_prefill_message',
            'deposit_quick_amounts',
            'deposit_message',
            'player_id_storage_key',
            'player_id_dom_selector',
            'show_offline_agents',
            'shuffle_live_agents',
            'onboarding_video_url',
            'withdrawals_enabled',
            'withdrawal_min',
            'withdrawal_quick_amounts',
            'withdrawal_redirect_path',
            'withdrawal_howto_video_url',
            'deposit_howto_video_url',
            'withdrawal_no_match_behavior',
            'withdrawal_bank_options',
            'withdrawal_require_payout_details',
            'withdrawal_message_with_amount',
            'withdrawal_message_no_amount',
            'recents_enabled',
            'recents_count',
        ])->pluck('value', 'key');

        // deposit_prefill_message supersedes the legacy prefill_message key.
        $prefillMessage = $settings['deposit_prefill_message']
            ?? $settings['prefill_message']
            ?? 'Hi Kemerbet agent, I want to deposit';
        $showOffline = filter_var($settings['show_offline_agents'] ?? true, FILTER_VALIDATE_BOOLEAN);
        $shuffleLive = filter_var($settings['shuffle_live_agents'] ?? true, FILTER_VALIDATE_BOOLEAN);
        $withdrawalsEnabled = filter_var($settings['withdrawals_enabled'] ?? true, FILTER_VALIDATE_BOOLEAN);

        $agents = Agent::where('status', Agent::STATUS_ACTIVE)
            ->with(['paymentMethods' => fn ($q) => $q->select('payment_methods.id', 'slug', 'display_name')->orderBy('display_order')])
            ->with(['withdrawalMethods' => fn ($q) => $q->select('payment_methods.id', 'slug', 'display_name')->orderBy('display_order')])
            ->addSelect(['agents.*',
                'last_offline_at' => StatusEvent::select('created_at')
                    ->whereColumn('agent_id', 'agents.id')
                    ->whereIn('event_type', [StatusEvent::EVENT_WENT_OFFLINE, StatusEvent::EVENT_SESSION_EXPIRED])
                    ->latest('created_at')
                    ->limit(1),
            ])
            ->get();

        // Pinned agents render at the top of the live section, oldest pin
        // first; unpinned agents keep display_number order.
        [$pinnedLive, $unpinnedLive] = $agents
            ->filter(fn (Agent $a) => $a->live_until && $a->live_until->gt($now))
            ->partition(fn (Agent $a) => $a->pinned_at !== null);

        $live = $pinnedLive->sortBy('pinned_at')
            ->concat($unpinnedLive->sortBy('display_number'))
            ->values();

        $recentlyOffline = collect();
        if ($showOffline) {
            $recentlyOffline = $agents
                ->filter(function (Agent $a) use ($now, $recentThreshold) {
                    if ($a->live_until && $a->live_until->gt($now)) {
                        return false;
                    }

                    return $a->last_offline_at && $a->last_offline_at >= $recentThreshold;
                })
                ->sortByDesc('last_offline_at')
                ->values();
        }

        $result = [];

        foreach ($live as $agent) {
            $result[] = $this->transformAgent($agent, 'live');
        }

        foreach ($recentlyOffline as $agent) {
            $result[] = $this->transformAgent($agent, 'recently_offline');
        }

        // Compact directory of every active agent, so the widget can resolve a
        // player's stored "recent agents" even when the agent isn't in the
        // current live/offline list. Cheap: a few dozen small rows.
        $directory = $agents->map(function (Agent $a) use ($now) {
            return [
                'id' => $a->id,
                'display_number' => $a->display_number,
                'telegram_username' => $a->telegram_username,
                'online' => $a->live_until && $a->live_until->gt($now),
                'accepts_withdrawals' => $a->canWithdraw(),
                'withdrawal_max' => $a->canWithdraw() ? (float) $a->withdrawal_max : null,
                'has_withdrawal_id' => $a->withdrawal_id !== null && $a->withdrawal_id !== '',
            ];
        })->values()->all();

        $quickAmounts = $settings['withdrawal_quick_amounts']
            ?? [200, 500, 1000, 3000, 5000, 10000, 25000, 50000, 100000];

        return [
            'cached_at' => $now->toIso8601String(),
            'live_count' => $live->count(),
            'agents' => $result,
            'directory' => $directory,
            'notices' => \App\Models\Notice::currentlyVisible(\App\Models\Notice::AUDIENCE_PLAYER)
                ->get()
                ->map(fn (\App\Models\Notice $n) => [
                    'id' => $n->id,
                    'title' => $n->title,
                    'body' => $n->body,
                    'priority' => $n->priority,
                    'video_url' => $n->video_url,
                ])->values()->all(),
            'settings' => [
                'chat_prefilled_message' => $prefillMessage,
                'show_offline_agents' => $showOffline,
                'shuffle_live_agents' => $shuffleLive,
                'onboarding_video_url' => $settings['onboarding_video_url'] ?? '',
                'withdrawals_enabled' => $withdrawalsEnabled,
                'withdrawal_min' => (int) ($settings['withdrawal_min'] ?? 200),
                'withdrawal_quick_amounts' => array_values(array_map('intval', $quickAmounts)),
                'withdrawal_redirect_path' => $settings['withdrawal_redirect_path'] ?? '/sport/popup/withdrawal',
                'deposit_howto_video_url' => (string) ($settings['deposit_howto_video_url'] ?? ''),
                'withdrawal_howto_video_url' => $settings['withdrawal_howto_video_url'] ?? '',
                'withdrawal_no_match_behavior' => $settings['withdrawal_no_match_behavior'] ?? 'closest',
                'withdrawal_bank_options' => array_values(array_filter(array_map(
                    'strval',
                    is_array($settings['withdrawal_bank_options'] ?? null) ? $settings['withdrawal_bank_options'] : []
                ))),
                'withdrawal_require_payout_details' => filter_var(
                    $settings['withdrawal_require_payout_details'] ?? true,
                    FILTER_VALIDATE_BOOLEAN
                ),
                'withdrawal_message_with_amount' => $settings['withdrawal_message_with_amount']
                    ?? 'Hi dear agent, to your Withdrawal ID {withdrawal_id} I want to withdraw {amount} ETB. I will share my withdrawal code shortly.',
                'deposit_quick_amounts' => array_values(array_map('intval',
                    is_array($settings['deposit_quick_amounts'] ?? null) ? $settings['deposit_quick_amounts'] : [200, 300, 500, 1000, 2000, 5000, 10000]
                )),
                'player_id_storage_key' => (string) ($settings['player_id_storage_key'] ?? ''),
                'player_id_dom_selector' => (string) ($settings['player_id_dom_selector'] ?? ''),
                'deposit_message' => $settings['deposit_message']
                    ?? "Hi Kemerbet agent, I want to deposit {amount} ETB.\nMy Player ID: {player_id}",
                'withdrawal_message_no_amount' => $settings['withdrawal_message_no_amount']
                    ?? 'Hi dear agent, to your Withdrawal ID {withdrawal_id} I want to withdraw — I will share the amount and my withdrawal code shortly.',
                'recents_enabled' => filter_var($settings['recents_enabled'] ?? true, FILTER_VALIDATE_BOOLEAN),
                'recents_count' => (int) ($settings['recents_count'] ?? 5),
            ],
        ];
    }

    public function click(Request $request, int $agent): JsonResponse
    {
        $agentModel = Agent::find($agent);

        if (! $agentModel) {
            abort(404);
        }

        if ($agentModel->status === Agent::STATUS_DISABLED) {
            return response()->json(['message' => 'Agent not available'], 422);
        }

        $request->validate([
            'referrer' => 'nullable|string|max:2000',
            'payment_methods' => 'nullable|array|max:10',
            'payment_methods.*' => 'string|max:50',
            'intent' => 'nullable|string|in:deposit,withdrawal,contact',
            'amount' => 'nullable|numeric|min:0|max:100000000',
            'source' => 'nullable|string|in:list,recent,intent',
        ]);

        $intent = $request->input('intent', 'deposit');

        ClickEvent::create([
            'agent_id' => $agentModel->id,
            // click_type retained for backward compatibility with existing
            // analytics; intent is the richer field going forward.
            'click_type' => $intent === 'contact' ? 'contact' : 'deposit',
            'intent' => $intent,
            // Amount only meaningful for withdrawals.
            'amount' => $intent === 'withdrawal' ? $request->input('amount') : null,
            'source' => $request->input('source'),
            'visitor_id' => hash('xxh3', config('app.key').$request->ip().$request->userAgent()),
            'ip_address' => $request->ip(),
            'referrer' => $request->input('referrer'),
            'payment_methods' => $request->input('payment_methods'),
            'created_at' => now(),
        ]);

        return response()->json(['ok' => true]);
    }

    public function visit(Request $request): JsonResponse
    {
        $request->validate([
            'referrer' => 'nullable|string|max:2000',
        ]);

        VisitEvent::create([
            'visitor_id' => hash('xxh3', config('app.key').$request->ip().$request->userAgent()),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'referrer' => $request->input('referrer'),
            'created_at' => now(),
        ]);

        return response()->json(['ok' => true]);
    }

    private function transformAgent(Agent $agent, string $status): array
    {
        $canWithdraw = $agent->canWithdraw();

        $data = [
            'id' => $agent->id,
            'display_number' => $agent->display_number,
            'telegram_username' => $agent->telegram_username,
            'status' => $status,
            'is_pinned' => $agent->pinned_at !== null,
            'accepts_withdrawals' => $canWithdraw,
            'withdrawal_max' => $canWithdraw ? (float) $agent->withdrawal_max : null,
            // withdrawal_id is needed client-side only to build the auto-message;
            // exposed only for withdrawal-capable agents.
            'withdrawal_id' => $canWithdraw ? $agent->withdrawal_id : null,
            'payment_methods' => $agent->paymentMethods->map(fn ($pm) => [
                'slug' => $pm->slug,
                'display_name' => $pm->display_name,
            ])->values()->all(),
            // Banks this agent pays OUT to (withdrawals) — only meaningful when
            // withdrawal-capable; used to match the player's chosen bank.
            'withdrawal_methods' => $canWithdraw
                ? $agent->withdrawalMethods->map(fn ($pm) => [
                    'slug' => $pm->slug,
                    'display_name' => $pm->display_name,
                ])->values()->all()
                : [],
        ];

        if ($status === 'recently_offline') {
            $data['last_seen_at'] = $agent->last_offline_at instanceof \DateTimeInterface
                ? $agent->last_offline_at->toIso8601String()
                : (string) $agent->last_offline_at;
        }

        return $data;
    }
}
KEMER_EOF
echo '  wrote app/Http/Controllers/Public/PublicAgentsController.php'

cat > 'app/Http/Requests/Admin/UpdateSettingsRequest.php' <<'KEMER_EOF'
<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSettingsRequest extends FormRequest
{
    private const KNOWN_KEYS = [
        'prefill_message',
        'agent_hide_after_hours',
        'public_refresh_interval_seconds',
        'show_offline_agents',
        'warn_on_offline_click',
        'shuffle_live_agents',
        'onboarding_video_url',
        // --- Withdrawal system ---
        'withdrawals_enabled',
        'withdrawal_min',
        'withdrawal_max_default',
        'withdrawal_quick_amounts',
        'withdrawal_redirect_path',
        'withdrawal_howto_video_url',
        'deposit_howto_video_url',
        'withdrawal_no_match_behavior',
        'withdrawal_bank_options',
        'withdrawal_require_payout_details',
        'withdrawal_message_with_amount',
        'withdrawal_message_no_amount',
        'deposit_prefill_message',
        'deposit_quick_amounts',
        'deposit_message',
        'player_id_storage_key',
        'player_id_dom_selector',
        'recents_enabled',
        'recents_count',
    ];

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'prefill_message' => ['sometimes', 'string', 'max:200'],
            'agent_hide_after_hours' => ['sometimes', 'integer', 'min:1', 'max:168'],
            'public_refresh_interval_seconds' => ['sometimes', 'integer', 'min:10', 'max:3600'],
            'show_offline_agents' => ['sometimes', 'boolean'],
            'warn_on_offline_click' => ['sometimes', 'boolean'],
            'shuffle_live_agents' => ['sometimes', 'boolean'],
            'onboarding_video_url' => [
                'sometimes',
                'nullable',
                'string',
                'max:500',
                'regex:/^$|^https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w\-_]+|^https?:\/\/\S+\.(mp4|webm|mov)(\?\S*)?$|^https?:\/\/iframe\.mediadelivery\.net\/\S+$/i',
            ],

            // --- Withdrawal system ---
            'withdrawals_enabled' => ['sometimes', 'boolean'],
            'withdrawal_min' => ['sometimes', 'integer', 'min:1', 'max:10000000'],
            'withdrawal_max_default' => ['sometimes', 'integer', 'min:1', 'max:10000000'],
            'withdrawal_quick_amounts' => ['sometimes', 'array', 'max:12'],
            'withdrawal_quick_amounts.*' => ['integer', 'min:1'],
            'withdrawal_redirect_path' => ['sometimes', 'string', 'max:300'],
            'withdrawal_howto_video_url' => [
                'sometimes',
                'nullable',
                'string',
                'max:500',
                'regex:/^$|^https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w\-_]+|^https?:\/\/\S+\.(mp4|webm|mov)(\?\S*)?$|^https?:\/\/iframe\.mediadelivery\.net\/\S+$/i',
            ],
            'deposit_howto_video_url' => [
                'sometimes',
                'nullable',
                'string',
                'max:500',
                'regex:/^$|^https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w\-_]+|^https?:\/\/\S+\.(mp4|webm|mov)(\?\S*)?$|^https?:\/\/iframe\.mediadelivery\.net\/\S+$/i',
            ],
            'withdrawal_no_match_behavior' => ['sometimes', 'string', 'in:closest,empty'],
            'withdrawal_bank_options' => ['sometimes', 'array', 'max:40'],
            'withdrawal_bank_options.*' => ['string', 'max:60'],
            'withdrawal_require_payout_details' => ['sometimes', 'boolean'],
            'withdrawal_message_with_amount' => ['sometimes', 'string', 'max:600'],
            'withdrawal_message_no_amount' => ['sometimes', 'string', 'max:600'],
            'deposit_prefill_message' => ['sometimes', 'string', 'max:200'],
            'deposit_quick_amounts' => ['sometimes', 'array', 'max:12'],
            'deposit_quick_amounts.*' => ['integer', 'min:1'],
            'deposit_message' => ['sometimes', 'string', 'max:600'],
            'player_id_storage_key' => ['sometimes', 'nullable', 'string', 'max:120'],
            'player_id_dom_selector' => ['sometimes', 'nullable', 'string', 'max:300'],
            'recents_enabled' => ['sometimes', 'boolean'],
            'recents_count' => ['sometimes', 'integer', 'min:1', 'max:10'],
        ];
    }

    public function messages(): array
    {
        return [
            'onboarding_video_url.regex' => 'Must be a valid YouTube URL (youtube.com/watch, youtu.be, or youtube.com/embed format) or empty.',
            'withdrawal_howto_video_url.regex' => 'Must be a valid YouTube URL (youtube.com/watch, youtu.be, or youtube.com/embed format) or empty.',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $unknownKeys = array_diff(array_keys($this->all()), self::KNOWN_KEYS);
            foreach ($unknownKeys as $key) {
                $validator->errors()->add($key, "Unknown setting key: {$key}");
            }
        });
    }
}
KEMER_EOF
echo '  wrote app/Http/Requests/Admin/UpdateSettingsRequest.php'

cat > 'app/Http/Requests/Admin/CreateNoticeRequest.php' <<'KEMER_EOF'
<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class CreateNoticeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['nullable', 'string', 'max:150'],
            'body' => ['required', 'string', 'max:1000'],
            'priority' => ['nullable', 'string', 'in:urgent,info'],
            'audience' => ['nullable', 'string', 'in:agent,player,both'],
            'video_url' => ['nullable', 'string', 'max:500', 'regex:/^$|^https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w\-_]+|^https?:\/\/\S+\.(mp4|webm|mov)(\?\S*)?$|^https?:\/\/iframe\.mediadelivery\.net\/\S+$/i'],
            'is_active' => ['nullable', 'boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => $this->filled('starts_at')
                ? ['nullable', 'date', 'after:starts_at']
                : ['nullable', 'date'],
            'send_push' => ['nullable', 'boolean'],
        ];
    }
}
KEMER_EOF
echo '  wrote app/Http/Requests/Admin/CreateNoticeRequest.php'

cat > 'app/Http/Requests/Admin/UpdateNoticeRequest.php' <<'KEMER_EOF'
<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateNoticeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['nullable', 'string', 'max:150'],
            'body' => ['sometimes', 'required', 'string', 'max:1000'],
            'priority' => ['nullable', 'string', 'in:urgent,info'],
            'audience' => ['nullable', 'string', 'in:agent,player,both'],
            'video_url' => ['nullable', 'string', 'max:500', 'regex:/^$|^https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w\-_]+|^https?:\/\/\S+\.(mp4|webm|mov)(\?\S*)?$|^https?:\/\/iframe\.mediadelivery\.net\/\S+$/i'],
            'is_active' => ['nullable', 'boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => $this->filled('starts_at')
                ? ['nullable', 'date', 'after:starts_at']
                : ['nullable', 'date'],
        ];
    }
}
KEMER_EOF
echo '  wrote app/Http/Requests/Admin/UpdateNoticeRequest.php'

cat > 'resources/js/admin/pages/SettingsPage.tsx' <<'KEMER_EOF'
import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import api from '@/api';

// --- Types ---

interface Settings {
    prefill_message: string;
    deposit_quick_amounts: number[];
    deposit_message: string;
    player_id_storage_key: string;
    player_id_dom_selector: string;
    onboarding_video_url: string;
    agent_hide_after_hours: number;
    public_refresh_interval_seconds: number;
    show_offline_agents: boolean;
    warn_on_offline_click: boolean;
    shuffle_live_agents: boolean;
    // --- Withdrawal system ---
    withdrawals_enabled: boolean;
    withdrawal_min: number;
    withdrawal_max_default: number;
    withdrawal_quick_amounts: number[];
    withdrawal_redirect_path: string;
    withdrawal_howto_video_url: string;
    deposit_howto_video_url: string;
    withdrawal_no_match_behavior: string;
    withdrawal_bank_options: string[];
    withdrawal_require_payout_details: boolean;
    withdrawal_message_with_amount: string;
    withdrawal_message_no_amount: string;
    recents_enabled: boolean;
    recents_count: number;
}

interface SettingsResponse {
    settings: Settings;
    embed_base_url: string;
}

const DEFAULT_SETTINGS: Settings = {
    prefill_message: 'Hi Kemerbet agent, I want to deposit',
    deposit_quick_amounts: [200, 300, 500, 1000, 2000, 5000, 10000],
    deposit_message: 'Hi Kemerbet agent, I want to deposit {amount} ETB.\nMy Player ID: {player_id}',
    player_id_storage_key: '',
    player_id_dom_selector: '',
    onboarding_video_url: '',
    agent_hide_after_hours: 12,
    public_refresh_interval_seconds: 60,
    show_offline_agents: true,
    warn_on_offline_click: true,
    shuffle_live_agents: true,
    withdrawals_enabled: true,
    withdrawal_min: 200,
    withdrawal_max_default: 10000,
    withdrawal_quick_amounts: [200, 500, 1000, 3000, 5000, 10000, 25000, 50000, 100000],
    withdrawal_redirect_path: '/sport/popup/withdrawal',
    withdrawal_howto_video_url: '',
    deposit_howto_video_url: '',
    withdrawal_no_match_behavior: 'closest',
    withdrawal_bank_options: [],
    withdrawal_require_payout_details: true,
    withdrawal_message_with_amount: '',
    withdrawal_message_no_amount: '',
    recents_enabled: true,
    recents_count: 5,
};

const YOUTUBE_URL_REGEX = /^$|^https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w\-_]+/i;

// --- Toggle component (inline styles — no .toggle class in admin.css) ---

function Toggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
    return (
        <button
            type="button"
            onClick={() => !disabled && onChange(!value)}
            style={{
                width: 40,
                height: 22,
                borderRadius: 11,
                border: 'none',
                background: value ? 'var(--green)' : 'var(--bg-elev-2)',
                position: 'relative',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'background .2s',
                opacity: disabled ? 0.5 : 1,
            }}
        >
            <span style={{
                position: 'absolute',
                top: 2,
                left: value ? 20 : 2,
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: '#fff',
                transition: 'left .2s',
            }} />
        </button>
    );
}

function ToggleRow({ title, desc, value, onChange, disabled }: {
    title: string;
    desc: string;
    value: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', gap: 16 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{title}</div>
                <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>
            </div>
            <Toggle value={value} onChange={onChange} disabled={disabled} />
        </div>
    );
}

// --- Security Tab ---

function SecurityTab() {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [success, setSuccess] = useState(false);

    const canSubmit = currentPassword.length > 0 && newPassword.length > 0 && confirmPassword.length > 0 && !submitting;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        setErrors({});
        setSuccess(false);

        try {
            await api.post('/api/admin/auth/change-password', {
                current_password: currentPassword,
                new_password: newPassword,
                new_password_confirmation: confirmPassword,
            });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setSuccess(true);
            setTimeout(() => setSuccess(false), 5000);
        } catch (err: unknown) {
            const resp = (err as { response?: { data?: { errors?: Record<string, string[]> } } }).response;
            if (resp?.data?.errors) {
                setErrors(resp.data.errors);
            } else {
                setErrors({ current_password: ['Something went wrong. Please try again.'] });
            }
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="panel">
            <div className="panel-head">
                <div className="panel-title">Change Password</div>
            </div>
            <form onSubmit={handleSubmit}>
                <div className="panel-body">
                    <div className="form-grid">
                        <div className="form-row">
                            <label className="form-label" htmlFor="current-password">Current Password</label>
                            <input
                                id="current-password"
                                type="password"
                                className={`form-input${errors.current_password ? ' error' : ''}`}
                                value={currentPassword}
                                onChange={(e) => { setCurrentPassword(e.target.value); setErrors({}); }}
                                autoComplete="current-password"
                            />
                            {errors.current_password && (
                                <div className="form-error">{errors.current_password[0]}</div>
                            )}
                        </div>
                        <div className="form-row">
                            <label className="form-label" htmlFor="new-password">New Password</label>
                            <input
                                id="new-password"
                                type="password"
                                className={`form-input${errors.new_password ? ' error' : ''}`}
                                value={newPassword}
                                onChange={(e) => { setNewPassword(e.target.value); setErrors({}); }}
                                autoComplete="new-password"
                            />
                            {errors.new_password && (
                                <div className="form-error">{errors.new_password[0]}</div>
                            )}
                            <div className="form-help">Minimum 8 characters.</div>
                        </div>
                        <div className="form-row">
                            <label className="form-label" htmlFor="confirm-password">Confirm New Password</label>
                            <input
                                id="confirm-password"
                                type="password"
                                className={`form-input${errors.new_password_confirmation ? ' error' : ''}`}
                                value={confirmPassword}
                                onChange={(e) => { setConfirmPassword(e.target.value); setErrors({}); }}
                                autoComplete="new-password"
                            />
                        </div>
                    </div>
                    {success && (
                        <div style={{
                            marginTop: 14,
                            padding: '10px 14px',
                            background: 'rgba(34,197,94,0.08)',
                            border: '1px solid rgba(34,197,94,0.25)',
                            borderRadius: 8,
                            fontSize: '.85rem',
                            color: 'var(--green)',
                        }}>
                            Password updated successfully.
                        </div>
                    )}
                </div>
                <div className="panel-foot">
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={!canSubmit}
                    >
                        {submitting ? <><Loader2 size={14} className="loader-spin" /> Updating&hellip;</> : 'Update Password'}
                    </button>
                </div>
            </form>
        </div>
    );
}

// --- Main Component ---

export default function SettingsPage() {
    const [savedSettings, setSavedSettings] = useState<Settings | null>(null);
    const [form, setForm] = useState<Settings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('general');
    const [embedBaseUrl, setEmbedBaseUrl] = useState<string>('');
    const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');

    const fetchSettings = useCallback(() => {
        setLoading(true);
        setError(null);
        api.get('/api/admin/settings')
            .then((res) => {
                const data = res.data.data as SettingsResponse;
                setSavedSettings(data.settings);
                setForm(data.settings);
                setEmbedBaseUrl(data.embed_base_url);
            })
            .catch(() => setError('Failed to load settings'))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    // Unsaved changes guard
    const isDirty = savedSettings !== null && JSON.stringify(form) !== JSON.stringify(savedSettings);

    useEffect(() => {
        if (!isDirty) return;
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [isDirty]);

    function updateField<K extends keyof Settings>(key: K, value: Settings[K]) {
        setForm((prev) => ({ ...prev, [key]: value }));
        setSaveSuccess(false);
        setSaveError(null);
    }

    async function handleSave() {
        if (!savedSettings || !isDirty) return;
        setSaving(true);
        setSaveError(null);
        setSaveSuccess(false);

        const diff: Partial<Settings> = {};
        for (const key of Object.keys(form) as (keyof Settings)[]) {
            if (form[key] !== savedSettings[key]) {
                (diff as Record<string, unknown>)[key] = form[key];
            }
        }

        try {
            const res = await api.patch('/api/admin/settings', diff);
            const data = res.data.data as SettingsResponse;
            setSavedSettings(data.settings);
            setForm(data.settings);
            setEmbedBaseUrl(data.embed_base_url);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err: unknown) {
            const resp = (err as { response?: { data?: { message?: string } } }).response;
            setSaveError(resp?.data?.message ?? 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    }

    async function handleCopySnippet() {
        const snippet = `<div id="kemerbet-agents"></div>\n<script src="${embedBaseUrl}/embed/embed.js"></script>`;
        try {
            await navigator.clipboard.writeText(snippet);
            setCopyState('copied');
            setTimeout(() => setCopyState('idle'), 2000);
        } catch {
            // Older browsers / restricted environments
        }
    }

    function handleDiscard() {
        if (savedSettings) {
            setForm(savedSettings);
            setSaveError(null);
            setSaveSuccess(false);
        }
    }

    if (loading) {
        return (
            <div className="empty-state">
                <Loader2 size={28} className="loader-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="dash-error">
                <span>{error}</span>
                <button className="btn btn-sm btn-danger" onClick={fetchSettings}>Retry</button>
            </div>
        );
    }

    return (
        <>
            <div className="page-head">
                <div>
                    <h1>Settings</h1>
                    <div className="subtitle">Global configuration for the agent system</div>
                </div>
            </div>

            <div className="settings-tabs">
                {(['general', 'withdrawals', 'public', 'security', 'account'] as const).map((tab) => (
                    <button
                        key={tab}
                        className={`settings-tab${activeTab === tab ? ' active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab === 'general' ? 'General' : tab === 'withdrawals' ? 'Withdrawals' : tab === 'public' ? 'Public Page' : tab === 'security' ? 'Security' : 'Account'}
                    </button>
                ))}
            </div>

            {activeTab === 'general' ? (
                <>
                    {/* Telegram Pre-filled Message */}
                    <div className="panel">
                        <div className="panel-head">
                            <div className="panel-title">Telegram Pre-filled Message</div>
                        </div>
                        <div className="panel-body">
                            <div className="form-grid">
                                <div className="form-row">
                                    <label className="form-label">
                                        Deposit quick amounts <span className="hint">comma-separated; shown on the deposit questionnaire</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={form.deposit_quick_amounts.join(', ')}
                                        onChange={(e) => updateField('deposit_quick_amounts',
                                            e.target.value.split(',').map((x) => parseInt(x.trim(), 10)).filter((n) => !isNaN(n) && n > 0))}
                                        placeholder="200, 300, 500, 1000"
                                    />
                                </div>
                                <div className="form-row">
                                    <label className="form-label">
                                        Deposit message with details <span className="hint">{'placeholders: {amount} {player_id} — used when the player fills the questionnaire'}</span>
                                    </label>
                                    <textarea
                                        className="form-textarea"
                                        rows={3}
                                        style={{ fontSize: '.9rem' }}
                                        value={form.deposit_message}
                                        onChange={(e) => updateField('deposit_message', e.target.value)}
                                        maxLength={600}
                                    />
                                </div>
                                <div className="form-row">
                                    <label className="form-label">
                                        Player-ID auto-detect: storage key <span className="hint">{'optional; sessionStorage then localStorage; supports key.field for JSON (e.g. player.id)'}</span>
                                    </label>
                                    <input type="text" className="form-input" value={form.player_id_storage_key}
                                        onChange={(e) => updateField('player_id_storage_key', e.target.value)} placeholder="e.g. player.id" />
                                </div>
                                <div className="form-row">
                                    <label className="form-label">
                                        Player-ID auto-detect: CSS selector <span className="hint">optional; element on the site showing the logged-in ID</span>
                                    </label>
                                    <input type="text" className="form-input" value={form.player_id_dom_selector}
                                        onChange={(e) => updateField('player_id_dom_selector', e.target.value)} placeholder=".user-panel .player-id" />
                                </div>
                                <div className="form-row">
                                    <label className="form-label">Message Sent When Player Clicks Deposit</label>
                                    <textarea
                                        className="form-textarea"
                                        rows={3}
                                        style={{ fontSize: '.9rem' }}
                                        value={form.prefill_message}
                                        onChange={(e) => updateField('prefill_message', e.target.value)}
                                        maxLength={200}
                                    />
                                    <div className="form-help">
                                        This message auto-fills in Telegram when a player clicks &ldquo;Deposit&rdquo; on any agent card.
                                        Players can edit before sending.
                                        <span style={{ float: 'right', color: form.prefill_message.length > 180 ? 'var(--gold)' : 'var(--text-dim)' }}>
                                            {form.prefill_message.length}/200
                                        </span>
                                    </div>
                                </div>
                                <div style={{ background: 'var(--bg-elev-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                                    <div style={{ fontSize: '.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>PREVIEW</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg)', borderRadius: 8, padding: 10, border: '1px solid var(--border)' }}>
                                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#229ED9,#1c7fad)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.9rem', flexShrink: 0 }}>
                                            &#128232;
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '.78rem', fontWeight: 700 }}>@DOITFAST21 (Agent 7)</div>
                                            <div style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginTop: 2, fontStyle: 'italic' }}>
                                                {form.prefill_message || '(empty message)'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="panel-foot">
                            {isDirty && <button className="btn btn-secondary" onClick={handleDiscard} disabled={saving}>Reset</button>}
                            <button className="btn btn-primary" onClick={handleSave} disabled={!isDirty || saving}>
                                {saving ? <><Loader2 size={14} className="loader-spin" /> Saving&hellip;</> : 'Save'}
                            </button>
                        </div>
                    </div>

                    {/* Onboarding Video */}
                    <div className="panel">
                        <div className="panel-head">
                            <div className="panel-title">Onboarding Video</div>
                        </div>
                        <div className="panel-body">
                            <div className="form-grid">
                                <div style={{ fontSize: '.86rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                                    A short tutorial video shown to new visitors at the top of the embed widget.
                                </div>
                                <div className="form-row">
                                    <label className="form-label" htmlFor="onboarding-video-url">Video URL (YouTube)</label>
                                    <input
                                        id="onboarding-video-url"
                                        type="text"
                                        className="form-input"
                                        placeholder="https://youtu.be/..."
                                        value={form.onboarding_video_url}
                                        onChange={(e) => updateField('onboarding_video_url', e.target.value)}
                                    />
                                    {form.onboarding_video_url === '' ? (
                                        <div className="form-help">Leave empty to disable the video.</div>
                                    ) : YOUTUBE_URL_REGEX.test(form.onboarding_video_url) ? (
                                        <div className="form-help" style={{ color: 'var(--green)' }}>Valid YouTube URL</div>
                                    ) : (
                                        <div className="form-help" style={{ color: 'var(--red)' }}>Must be a valid YouTube URL (youtube.com/watch, youtu.be, or youtube.com/embed format)</div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="panel-foot">
                            {isDirty && <button className="btn btn-secondary" onClick={handleDiscard} disabled={saving}>Reset</button>}
                            <button className="btn btn-primary" onClick={handleSave} disabled={!isDirty || saving}>
                                {saving ? <><Loader2 size={14} className="loader-spin" /> Saving&hellip;</> : 'Save'}
                            </button>
                        </div>
                    </div>

                    {/* Install Embed */}
                    <div className="panel">
                        <div className="panel-head">
                            <div className="panel-title">Install Embed</div>
                        </div>
                        <div className="panel-body">
                            <div style={{ marginBottom: 12, fontSize: '.86rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                                Paste this snippet anywhere on the betting site where you want the agents block to appear. The widget loads live agents and updates automatically.
                            </div>

                            <div style={{
                                background: 'var(--bg-elev-2)',
                                border: '1px solid var(--border)',
                                borderRadius: 8,
                                padding: 14,
                                fontFamily: "'SF Mono', ui-monospace, monospace",
                                fontSize: '.82rem',
                                color: 'var(--text)',
                                whiteSpace: 'pre',
                                overflowX: 'auto',
                            }}>
                                {`<div id="kemerbet-agents"></div>\n<script src="${embedBaseUrl}/embed/embed.js"></script>`}
                            </div>

                            <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={handleCopySnippet}
                                >
                                    {copyState === 'copied' ? '\u2713 Copied!' : '\uD83D\uDCCB Copy snippet'}
                                </button>
                                <a
                                    href="/embed-test.html"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-secondary btn-sm"
                                    style={{ textDecoration: 'none' }}
                                >
                                    &#128269; Preview embed
                                </a>
                            </div>

                            <div style={{
                                marginTop: 14,
                                padding: '10px 14px',
                                background: 'rgba(59,130,246,0.06)',
                                border: '1px solid rgba(59,130,246,0.18)',
                                borderRadius: 8,
                                fontSize: '.78rem',
                                color: 'var(--text-muted)',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 8,
                            }}>
                                <span>&#8505;</span>
                                <span>The widget uses Shadow DOM, so its styling won&apos;t conflict with the host site&apos;s CSS. The current public refresh interval is <strong>{form.public_refresh_interval_seconds} seconds</strong> (configurable below).</span>
                            </div>
                        </div>
                    </div>

                    {/* Agent Behavior */}
                    <div className="panel">
                        <div className="panel-head">
                            <div className="panel-title">Agent Behavior</div>
                        </div>
                        <div className="panel-body">
                            <div className="form-grid">
                                <ToggleRow
                                    title="Show offline agents on public page"
                                    desc="Display recently-offline agents below the live ones (faded)"
                                    value={form.show_offline_agents}
                                    onChange={(v) => updateField('show_offline_agents', v)}
                                />
                                <div className="form-row">
                                    <label className="form-label">Hide offline agents after</label>
                                    <select
                                        className="form-select"
                                        style={{ maxWidth: 300 }}
                                        value={form.agent_hide_after_hours}
                                        onChange={(e) => updateField('agent_hide_after_hours', parseInt(e.target.value))}
                                    >
                                        <option value={6}>6 hours</option>
                                        <option value={12}>12 hours</option>
                                        <option value={24}>24 hours</option>
                                        <option value={72}>3 days</option>
                                        <option value={168}>Never hide (7 days)</option>
                                    </select>
                                    <div className="form-help">Agents not seen within this window won&apos;t show on the public page</div>
                                </div>
                                <div className="form-row">
                                    <label className="form-label">Public page refresh interval</label>
                                    <select
                                        className="form-select"
                                        style={{ maxWidth: 300 }}
                                        value={form.public_refresh_interval_seconds}
                                        onChange={(e) => updateField('public_refresh_interval_seconds', parseInt(e.target.value))}
                                    >
                                        <option value={30}>30 seconds</option>
                                        <option value={60}>1 minute (recommended)</option>
                                        <option value={120}>2 minutes</option>
                                        <option value={180}>3 minutes</option>
                                    </select>
                                    <div className="form-help">How often the public page polls for live status updates</div>
                                </div>
                                <ToggleRow
                                    title="Warn players before clicking offline agents"
                                    desc="Show a confirmation dialog when player clicks an offline agent"
                                    value={form.warn_on_offline_click}
                                    onChange={(v) => updateField('warn_on_offline_click', v)}
                                />
                                <ToggleRow
                                    title="Shuffle live agents on each refresh"
                                    desc="Randomize order so no agent gets unfair top position"
                                    value={form.shuffle_live_agents}
                                    onChange={(v) => updateField('shuffle_live_agents', v)}
                                />
                            </div>
                        </div>
                        <div className="panel-foot">
                            {isDirty && <button className="btn btn-secondary" onClick={handleDiscard} disabled={saving}>Discard</button>}
                            <button className="btn btn-primary" onClick={handleSave} disabled={!isDirty || saving}>
                                {saving ? <><Loader2 size={14} className="loader-spin" /> Saving&hellip;</> : 'Save Changes'}
                            </button>
                        </div>
                    </div>

                    {/* Notification Reminders (read-only) */}
                    <div className="panel">
                        <div className="panel-head">
                            <div className="panel-title">Agent Notification Reminders</div>
                        </div>
                        <div className="panel-body">
                            <div style={{
                                padding: '10px 14px',
                                background: 'rgba(245,197,24,0.08)',
                                border: '1px solid rgba(245,197,24,0.25)',
                                borderRadius: 8,
                                margin: '0 0 14px 0',
                                fontSize: '.82rem',
                                color: 'var(--gold)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                            }}>
                                <span>&#128679;</span>
                                <span><strong>Preview &mdash; not yet functional.</strong> These notification settings will become editable in Phase H. The values shown are placeholders.</span>
                            </div>
                            <div className="form-grid">
                                <ToggleRow
                                    title="Enable browser notifications globally"
                                    desc="Master switch for all agent reminder notifications"
                                    value={true}
                                    onChange={() => {}}
                                    disabled
                                />
                                <div style={{ border: '1px dashed var(--border)', borderRadius: 10, padding: 14, background: 'var(--bg-elev-2)' }}>
                                    <div style={{ fontSize: '.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>
                                        REMINDER SCHEDULE
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '.85rem' }}>
                                        {[
                                            '10 minutes before live time ends',
                                            '5 minutes before live time ends',
                                            'When agent goes offline',
                                            '1 hour after going offline (come back reminder)',
                                        ].map((label) => (
                                            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg)', borderRadius: 6 }}>
                                                <span>{label}</span>
                                                <Toggle value={true} onChange={() => {}} disabled />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="panel-foot">
                            <button className="btn btn-primary" disabled>Save</button>
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="panel" style={{ borderColor: 'rgba(239,68,68,0.25)' }}>
                        <div className="panel-head" style={{ borderColor: 'rgba(239,68,68,0.15)' }}>
                            <div className="panel-title" style={{ color: 'var(--red)' }}>&#9888; Danger Zone</div>
                        </div>
                        <div className="panel-body">
                            <div style={{
                                padding: '10px 14px',
                                background: 'rgba(245,197,24,0.08)',
                                border: '1px solid rgba(245,197,24,0.25)',
                                borderRadius: 8,
                                margin: '0 0 14px 0',
                                fontSize: '.82rem',
                                color: 'var(--gold)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                            }}>
                                <span>&#128679;</span>
                                <span><strong>Not yet wired up.</strong> These actions will become available in Phase H.</span>
                            </div>
                            <div className="form-grid">
                                <div className="danger-row">
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '.9rem' }}>Force all agents offline</div>
                                        <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: 2 }}>Sets every live agent&apos;s status to offline immediately.</div>
                                    </div>
                                    <button className="btn btn-danger" disabled>Force Offline All</button>
                                </div>
                                <div className="danger-row">
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '.9rem' }}>Regenerate all agent tokens</div>
                                        <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: 2 }}>Invalidates every existing token.</div>
                                    </div>
                                    <button className="btn btn-danger" disabled>Regenerate All</button>
                                </div>
                                <div className="danger-row">
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '.9rem' }}>Clear all analytics data</div>
                                        <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: 2 }}>Deletes all click and visit events. Cannot be undone.</div>
                                    </div>
                                    <button className="btn btn-danger" disabled>Clear Data</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {saveSuccess && (
                        <div className="toast show success" style={{ position: 'fixed', top: 20, right: 20, zIndex: 300 }}>
                            <span className="toast-icon">&#10003;</span>
                            <span>Settings saved</span>
                        </div>
                    )}
                    {saveError && (
                        <div className="dash-error" style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', maxWidth: 500, zIndex: 300 }}>
                            <span>{saveError}</span>
                            <button className="btn btn-sm btn-danger" onClick={() => setSaveError(null)}>Dismiss</button>
                        </div>
                    )}
                </>
            ) : activeTab === 'withdrawals' ? (
                <>
                    {/* Withdrawal toggles */}
                    <div className="panel">
                        <div className="panel-head">
                            <div className="panel-title">Withdrawal system</div>
                        </div>
                        <div className="panel-body">
                            <ToggleRow
                                title="Withdrawals enabled"
                                desc="Master switch for the whole withdrawal flow on the widget."
                                value={form.withdrawals_enabled}
                                onChange={(v) => updateField('withdrawals_enabled', v)}
                            />
                            <ToggleRow
                                title="Require payout details"
                                desc="Player must enter Name / Bank / Account before seeing matched agents."
                                value={form.withdrawal_require_payout_details}
                                onChange={(v) => updateField('withdrawal_require_payout_details', v)}
                            />
                            <ToggleRow
                                title="Show closest agents when none cover the amount"
                                desc="If on, over-max requests still show the highest-capacity agents. If off, an empty state is shown."
                                value={form.withdrawal_no_match_behavior === 'closest'}
                                onChange={(v) => updateField('withdrawal_no_match_behavior', v ? 'closest' : 'empty')}
                            />
                        </div>
                    </div>

                    {/* Amounts */}
                    <div className="panel">
                        <div className="panel-head">
                            <div className="panel-title">Amounts</div>
                        </div>
                        <div className="panel-body">
                            <div className="form-grid">
                                <div className="form-row">
                                    <label className="form-label">Minimum withdrawal (ETB)</label>
                                    <input
                                        type="number"
                                        min={1}
                                        className="form-input"
                                        value={form.withdrawal_min}
                                        onChange={(e) => updateField('withdrawal_min', parseInt(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="form-row">
                                    <label className="form-label">
                                        Default max per agent (ETB) <span className="hint">ceiling agents can set themselves to</span>
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        className="form-input"
                                        value={form.withdrawal_max_default}
                                        onChange={(e) => updateField('withdrawal_max_default', parseInt(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="form-row">
                                    <label className="form-label">
                                        Quick amounts <span className="hint">comma-separated; shown on the withdrawal amount screen</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={form.withdrawal_quick_amounts.join(', ')}
                                        onChange={(e) => updateField('withdrawal_quick_amounts',
                                            e.target.value.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n) && n > 0))}
                                        placeholder="200, 500, 1000, 5000"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bank options */}
                    <div className="panel">
                        <div className="panel-head">
                            <div className="panel-title">Bank options</div>
                        </div>
                        <div className="panel-body">
                            <div className="form-row">
                                <label className="form-label">
                                    Banks in the player dropdown <span className="hint">one per line</span>
                                </label>
                                <textarea
                                    className="form-textarea"
                                    rows={6}
                                    value={form.withdrawal_bank_options.join('\n')}
                                    onChange={(e) => updateField('withdrawal_bank_options',
                                        e.target.value.split('\n').map((s) => s.trim()).filter((s) => s.length > 0))}
                                    placeholder={'Telebirr\nCBE\nAwash Bank'}
                                />
                                <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
                                    These are the banks a player can pick when withdrawing. Each agent&apos;s
                                    accepted withdrawal banks are set per-agent in the agent editor.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Redirect + video */}
                    <div className="panel">
                        <div className="panel-head">
                            <div className="panel-title">Redirect &amp; how-to</div>
                        </div>
                        <div className="panel-body">
                            <div className="form-grid">
                                <div className="form-row">
                                    <label className="form-label">
                                        Cashier withdrawal path <span className="hint">relative; widget prepends the current domain</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={form.withdrawal_redirect_path}
                                        onChange={(e) => updateField('withdrawal_redirect_path', e.target.value)}
                                        placeholder="/sport/popup/withdrawal"
                                    />
                                </div>
                                <div className="form-row">
                                    <label className="form-label">How-to video URL <span className="hint">YouTube; shown on the amount screen</span></label>
                                    <input
                                        type="text"
                                        className={`form-input${form.withdrawal_howto_video_url && !(YOUTUBE_URL_REGEX.test(form.withdrawal_howto_video_url) || /\.(mp4|webm|mov)(\?|$)/i.test(form.withdrawal_howto_video_url)) ? ' input-error' : ''}`}
                                        value={form.withdrawal_howto_video_url}
                                        onChange={(e) => updateField('withdrawal_howto_video_url', e.target.value)}
                                        placeholder="https://www.youtube.com/watch?v=..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Message template */}
                    <div className="panel">
                        <div className="panel-head">
                            <div className="panel-title">Telegram message template</div>
                        </div>
                        <div className="panel-body">
                            <div className="form-row">
                                <label className="form-label">
                                    Message with amount <span className="hint">{'placeholders: {amount} {withdrawal_id} {name} {bank} {account}'}</span>
                                </label>
                                <textarea
                                    className="form-textarea"
                                    rows={5}
                                    value={form.withdrawal_message_with_amount}
                                    onChange={(e) => updateField('withdrawal_message_with_amount', e.target.value)}
                                />
                                <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
                                    The account number and withdrawal ID are automatically made tap-to-copy in Telegram.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Save bar */}
                    <div className="panel">
                        <div className="panel-body" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                            {isDirty && <button className="btn btn-secondary" onClick={handleDiscard} disabled={saving}>Reset</button>}
                            <button className="btn btn-primary" onClick={handleSave} disabled={!isDirty || saving}>
                                {saving ? <><Loader2 size={14} className="loader-spin" /> Saving&hellip;</> : 'Save'}
                            </button>
                        </div>
                    </div>

                    {saveSuccess && (
                        <div className="toast show success" style={{ position: 'fixed', top: 20, right: 20, zIndex: 300 }}>
                            <span className="toast-icon">&#10003;</span>
                            <span>Settings saved</span>
                        </div>
                    )}
                    {saveError && (
                        <div className="dash-error" style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', maxWidth: 500, zIndex: 300 }}>
                            <span>{saveError}</span>
                            <button className="btn btn-sm btn-danger" onClick={() => setSaveError(null)}>Dismiss</button>
                        </div>
                    )}
                </>
            ) : activeTab === 'security' ? (
                <SecurityTab />
            ) : (
                <div className="panel">
                    <div className="empty-state">
                        <div className="icon">&#9881;</div>
                        <h3>
                            {activeTab === 'public' ? 'Public Page' : 'Account'} Settings
                        </h3>
                        <p>
                            {activeTab === 'public' && 'This section will let you customize the public agent listing \u2014 header text, branding, layout, and visibility rules. Available in Phase H.'}
                            {activeTab === 'account' && 'This section will manage your admin profile \u2014 name, email, notification preferences. Available in Phase H.'}
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}
KEMER_EOF
echo '  wrote resources/js/admin/pages/SettingsPage.tsx'
echo ""
echo "Build (npm run build — admin changed), must succeed, then commit/push"
echo "staging, merge to main, push, deploy production."
echo "Then ONCE on production Commands: php artisan db:seed --class=SettingSeeder --force"
