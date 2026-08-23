// Ported verbatim from the approved concept mockup
// (Kemerbet Agents new experience). Adaptations for the embed:
//   1. :root{} / body{} -> :host{} (Shadow DOM has no body; CSS vars on :host)
//   2. The whole widget is capped to a centered mobile-width column (max 420px),
//      matching the phone-frame mockup, since the embed may sit in a wide slot.
//   3. Mockup phone-frame chrome (tabs, bezel) is NOT included — the three
//      screens (home/amount/results) are switched in-place instead.

export const STYLES = `
:host{
  --bg-dark:#0a1628;
  --bg-darker:#050d1a;
  --green-primary:#00a86b;
  --green-dark:#078343;
  --green-light:#1dd88c;
  --green-glow:#22ff9a;
  --gold:#f5c518;
  --gold-light:#ffd93d;
  --text-light:#ffffff;
  --text-muted:#a8b3c1;
  --text-dim:#6b7a8f;
  --card-bg:rgba(255,255,255,0.04);
  --card-border:rgba(255,255,255,0.08);
  --red:#ef4444;

  display:block;
  font-family:'Inter','Noto Sans Ethiopic',system-ui,-apple-system,sans-serif;
  color:var(--text-light);
  -webkit-font-smoothing:antialiased;
  background:var(--bg-dark);
  background-image:
    radial-gradient(circle at 20% 0%,rgba(0,168,107,0.15) 0%,transparent 50%),
    radial-gradient(circle at 80% 100%,rgba(245,197,24,0.08) 0%,transparent 50%);
}

*{box-sizing:border-box;margin:0;padding:0}

.agents-wrapper{max-width:420px;margin:0 auto;padding:20px 18px 48px;min-height:100vh}

.screen{display:none}
.screen.active{display:block}

.topbar{display:flex;align-items:center;justify-content:flex-end;margin-bottom:14px}
.lang-switcher{display:inline-flex;background:var(--card-bg);border:1px solid var(--card-border);border-radius:999px;padding:3px;gap:2px;backdrop-filter:blur(10px)}
.lang-btn{padding:5px 12px;border:none;background:transparent;color:var(--text-muted);font-family:inherit;font-weight:700;font-size:.72rem;border-radius:999px;cursor:pointer;transition:all .25s ease;letter-spacing:.5px}
.lang-btn:hover{color:var(--text-light)}
.lang-btn.active{background:linear-gradient(135deg,var(--gold),var(--gold-light));color:var(--bg-darker);box-shadow:0 2px 8px rgba(245,197,24,.3)}

.header{text-align:center;margin-bottom:20px}
.header-logo{display:inline-flex;align-items:center;gap:9px;padding:7px 15px;background:rgba(0,168,107,.15);border:1px solid rgba(0,168,107,.4);border-radius:999px;font-size:.72rem;font-weight:800;color:var(--green-light);letter-spacing:1.2px;text-transform:uppercase;margin-bottom:14px}
:host([lang="am"]) .header-logo{letter-spacing:.3px;text-transform:none}
.live-indicator{width:8px;height:8px;background:var(--green-glow);border-radius:50%;box-shadow:0 0 12px var(--green-glow);animation:headerPulse 1.4s ease-in-out infinite}
@keyframes headerPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.7)}}
.header h1{font-size:1.55rem;font-weight:900;background:linear-gradient(135deg,var(--gold),var(--gold-light));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:-.5px;margin-bottom:6px}
.header p{color:var(--text-muted);font-size:.8rem;line-height:1.55;max-width:340px;margin:0 auto}
:host([lang="am"]) .header p{font-size:.82rem;line-height:1.7}

.section-title{display:flex;align-items:center;justify-content:space-between;margin-bottom:13px}
.section-title h2{font-size:.98rem;font-weight:800;display:flex;align-items:center;gap:9px;letter-spacing:-.2px}
.section-title h2::before{content:"";width:4px;height:18px;background:linear-gradient(180deg,var(--gold),var(--green-primary));border-radius:2px}
.section-title span{font-size:.68rem;color:var(--text-dim);font-weight:600}
.agent-count{background:rgba(0,168,107,.15);color:var(--green-light);padding:5px 11px;border-radius:999px;font-size:.72rem;font-weight:800;border:1px solid rgba(0,168,107,.3)}

.backrow{display:flex;align-items:center;gap:10px;margin-bottom:16px}
.backbtn{width:34px;height:34px;border-radius:11px;background:var(--card-bg);border:1px solid var(--card-border);color:var(--text-muted);font-size:15px;cursor:pointer;display:grid;place-items:center;font-family:inherit}
.backbtn:hover{color:var(--text-light)}
.backrow h2{font-size:1.05rem;font-weight:800;letter-spacing:-.3px;display:flex;align-items:center;gap:9px}
.backrow h2::before{content:"";width:4px;height:19px;background:linear-gradient(180deg,var(--gold),var(--green-primary));border-radius:2px}

.intent{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.intent-card{border:1px solid transparent;border-radius:18px;padding:19px 14px 16px;text-align:left;cursor:pointer;color:#fff;position:relative;overflow:hidden;transition:.2s;font-family:inherit}
.intent-card:hover{transform:translateY(-3px)}
.intent-card:active{transform:scale(.97)}
.intent-card .ic{font-size:22px;margin-bottom:9px;display:block}
.intent-card b{font-size:1rem;font-weight:900;display:block;margin-bottom:4px;letter-spacing:-.3px}
.intent-card span{font-size:.68rem;opacity:.9;line-height:1.45;display:block;font-weight:600}
:host([lang="am"]) .intent-card span{font-size:.72rem}
.intent-card.dep{background:linear-gradient(135deg,var(--green-primary),var(--green-dark));box-shadow:0 8px 24px rgba(0,168,107,.3)}
.intent-card.wdr{background:linear-gradient(135deg,rgba(245,197,24,.16),rgba(245,197,24,.05));border-color:rgba(245,197,24,.45)}
.intent-card.wdr b{background:linear-gradient(135deg,var(--gold),var(--gold-light));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.intent-card.wdr span{color:var(--text-muted)}

.recents{display:flex;flex-direction:column;gap:9px;margin-bottom:22px}
.recent{background:var(--card-bg);backdrop-filter:blur(10px);border:1px solid var(--card-border);border-radius:14px;padding:11px 12px;display:flex;align-items:center;gap:11px;transition:.25s}
.recent:hover{border-color:rgba(0,168,107,.35)}
.recent.is-off{opacity:.6;filter:saturate(.65)}
.rc-mid{flex:1;min-width:0}
.rc-name{font-size:.85rem;font-weight:800;letter-spacing:-.2px}
.rc-sub{font-size:.66rem;color:var(--text-dim);margin-top:2px;font-weight:600}
.rc-btns{display:flex;gap:6px;flex:0 0 auto}
.btn-s{border:0;border-radius:9px;font:800 .68rem 'Inter',sans-serif;padding:8px 11px;cursor:pointer;transition:.2s;letter-spacing:.3px;font-family:inherit}
.btn-s:active{transform:scale(.95)}
.btn-s.dep{background:linear-gradient(135deg,var(--green-primary),var(--green-dark));color:#fff;box-shadow:0 3px 9px rgba(0,168,107,.25)}
.btn-s.wdr{background:linear-gradient(135deg,var(--gold),var(--gold-light));color:var(--bg-darker);box-shadow:0 3px 9px rgba(245,197,24,.25)}
.btn-s.grey{background:rgba(255,255,255,.08);color:var(--text-muted)}
.btn-s.line{background:transparent;border:1px solid var(--card-border);color:var(--text-muted)}
.btn-s.line:hover{color:var(--text-light);border-color:rgba(255,255,255,.2)}

.agent-avatar{width:40px;height:40px;border-radius:11px;background:linear-gradient(135deg,var(--green-primary),var(--green-dark));display:flex;align-items:center;justify-content:center;font-weight:900;font-size:.85rem;color:#fff;border:1.5px solid rgba(255,255,255,.12);flex-shrink:0;position:relative}
.agent-avatar.off{background:linear-gradient(135deg,#3a4a64,#2a3850)}
.agent-avatar.live::after{content:"";position:absolute;bottom:-2px;right:-2px;width:11px;height:11px;background:var(--green-glow);border:2.5px solid var(--bg-dark);border-radius:50%;box-shadow:0 0 8px var(--green-glow);animation:avatarBlink 1s infinite}
@keyframes avatarBlink{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.85)}}

.agent-grid{display:flex;flex-direction:column;gap:14px}
.agent-card{background:var(--card-bg);backdrop-filter:blur(10px);border:1px solid var(--card-border);border-radius:16px;padding:16px 16px 14px;transition:all .3s ease;position:relative;overflow:hidden;display:flex;flex-direction:column}
.agent-card::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--green-primary),var(--gold));opacity:0;transition:opacity .3s ease}
.agent-card:hover{transform:translateY(-3px);border-color:rgba(0,168,107,.4);box-shadow:0 12px 36px rgba(0,0,0,.4)}
.agent-card:hover::before{opacity:1}
.agent-card.live{border-color:rgba(34,255,154,.22);background:linear-gradient(135deg,rgba(0,168,107,.07) 0%,rgba(255,255,255,.04) 100%);animation:cardBreathe 3s ease-in-out infinite}
@keyframes cardBreathe{0%,100%{box-shadow:0 0 0 0 rgba(34,255,154,.08)}50%{box-shadow:0 0 0 1px rgba(34,255,154,.3),0 0 22px rgba(34,255,154,.08)}}
.agent-card.offline{opacity:.55;filter:saturate(.6);animation:none}
.agent-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.agent-name-wrap{display:flex;align-items:center;gap:11px}
.agent-name{font-weight:800;font-size:.95rem;letter-spacing:-.2px}
.badge{font-size:.6rem;padding:5px 10px;border-radius:999px;font-weight:900;letter-spacing:1.3px;text-transform:uppercase}
.badge.live{position:relative;background:linear-gradient(135deg,var(--green-primary),var(--green-dark));color:#fff;padding-left:19px;border:1px solid rgba(34,255,154,.4);animation:headerPulse 1.5s infinite}
:host([lang="am"]) .badge.live{letter-spacing:.3px;text-transform:none;padding-left:20px}
.badge.live::before{content:"";position:absolute;left:8px;top:50%;transform:translateY(-50%);width:7px;height:7px;background:var(--green-glow);border-radius:50%;box-shadow:0 0 8px var(--green-glow)}
.badge.offline{background:rgba(255,255,255,.07);color:var(--text-dim);border:1px solid var(--card-border)}
:host([lang="am"]) .badge.offline{letter-spacing:.3px;text-transform:none}
.waiting-text{font-size:.7rem;color:var(--green-light);margin-bottom:11px;display:flex;align-items:center;gap:7px;font-weight:700}
:host([lang="am"]) .waiting-text{font-size:.8rem}
.typing-dots{display:inline-flex;gap:3px}
.typing-dots span{width:3px;height:3px;background:var(--green-light);border-radius:50%;animation:typing 1.4s ease-in-out infinite}
.typing-dots span:nth-child(2){animation-delay:.2s}
.typing-dots span:nth-child(3){animation-delay:.4s}
@keyframes typing{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-2px)}}
.last-seen{font-size:.7rem;color:var(--text-dim);margin-bottom:11px;font-weight:600}
:host([lang="am"]) .last-seen{font-size:.8rem}
.banks{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:13px;padding-top:11px;border-top:1px solid var(--card-border)}
.bank{background:linear-gradient(135deg,rgba(255,255,255,.1),rgba(255,255,255,.05));border:1px solid rgba(255,255,255,.14);padding:4px 9px;font-size:.64rem;border-radius:6px;font-weight:800;letter-spacing:.3px}
.agent-card.live .bank{background:linear-gradient(135deg,rgba(0,168,107,.2),rgba(0,168,107,.08));border-color:rgba(0,168,107,.32)}
.deposit-btn{margin-top:auto;display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:11px 14px;background:linear-gradient(135deg,var(--green-primary),var(--green-dark));color:#fff;text-decoration:none;border-radius:10px;font-size:.82rem;font-weight:800;transition:all .2s ease;border:none;cursor:pointer;letter-spacing:.3px;box-shadow:0 4px 12px rgba(0,168,107,.25);position:relative;overflow:hidden;font-family:inherit}
:host([lang="am"]) .deposit-btn{font-size:.9rem;letter-spacing:0}
.deposit-btn::after{content:"";position:absolute;top:0;left:-100%;width:100%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent)}
.agent-card.live .deposit-btn::after{animation:shimmer 3s ease-in-out infinite}
@keyframes shimmer{0%{left:-100%}60%,100%{left:100%}}
.deposit-btn:active{transform:scale(.98)}
.deposit-btn.gold{background:linear-gradient(135deg,var(--gold),var(--gold-light));color:var(--bg-darker);box-shadow:0 4px 12px rgba(245,197,24,.25)}
.deposit-btn.grey{background:rgba(255,255,255,.08);color:var(--text-muted);box-shadow:none}
.offline-divider{display:flex;align-items:center;gap:14px;margin:22px 0 14px;color:var(--text-dim);font-size:.64rem;font-weight:800;text-transform:uppercase;letter-spacing:1.5px}
:host([lang="am"]) .offline-divider{text-transform:none;letter-spacing:0;font-size:.75rem}
.offline-divider::before,.offline-divider::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,transparent,var(--card-border),transparent)}

.empty-state{text-align:center;padding:30px 16px;color:var(--text-dim)}
.empty-state .icon{font-size:26px;margin-bottom:10px;opacity:.5}
.empty-state h3{font-size:.9rem;font-weight:700;margin-bottom:5px;color:var(--text-muted)}
.empty-state p{font-size:.72rem}

.cap-chip{display:inline-flex;align-items:center;font-size:.66rem;font-weight:800;padding:5px 10px;border-radius:999px;background:rgba(245,197,24,.12);color:var(--gold);border:1px solid rgba(245,197,24,.35);letter-spacing:.3px;white-space:nowrap}

.videobox{position:relative;border-radius:14px;overflow:hidden;border:1px solid var(--card-border);background:linear-gradient(135deg,#0e1d33,#0a1628);aspect-ratio:16/9;margin-bottom:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:9px;transition:.2s}
.videobox:hover{border-color:rgba(245,197,24,.45)}
.videobox::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 50% 40%,rgba(0,168,107,.16),transparent 65%)}
.videobox .vplay{width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--gold-light));display:grid;place-items:center;font-size:17px;color:var(--bg-darker);box-shadow:0 6px 20px rgba(245,197,24,.35);position:relative;z-index:1}
.videobox b{font-size:.8rem;font-weight:800;position:relative;z-index:1}
.videobox small{font-size:.62rem;color:var(--text-dim);font-weight:600;position:relative;z-index:1}
.videobox iframe{position:absolute;inset:0;width:100%;height:100%;border:0}

.amount-wrap{background:var(--card-bg);backdrop-filter:blur(10px);border:1px solid var(--card-border);border-radius:20px;padding:24px 18px;text-align:center;margin-bottom:16px}
.amount-wrap label{font-size:.74rem;color:var(--text-muted);display:block;margin-bottom:12px;font-weight:600}
.amt-line{display:flex;align-items:baseline;justify-content:center;gap:8px;border-bottom:2px solid rgba(245,197,24,.5);padding-bottom:10px;margin-bottom:8px}
.amt-line input{background:none;border:0;outline:0;color:var(--text-light);font:900 32px 'Inter',sans-serif;width:168px;text-align:right;letter-spacing:-1px}
.amt-line input::placeholder{color:#26344b}
.amt-line b{font-size:.9rem;color:var(--gold);font-weight:800}
.amt-hint{font-size:.66rem;color:var(--text-dim);font-weight:600}
.amt-hint.err{color:var(--red)}
.quick{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:14px 0 6px}
.q{background:var(--card-bg);border:1px solid var(--card-border);color:var(--text-muted);font:700 .72rem 'Inter',sans-serif;padding:8px 13px;border-radius:999px;cursor:pointer;transition:.2s}
.q:hover{color:var(--gold);border-color:rgba(245,197,24,.4)}
.bigcta{width:100%;border:0;border-radius:12px;padding:14px;font:900 .88rem 'Inter',sans-serif;background:linear-gradient(135deg,var(--gold),var(--gold-light));color:var(--bg-darker);cursor:pointer;transition:.2s;box-shadow:0 4px 14px rgba(245,197,24,.25);letter-spacing:.2px}
:host([lang="am"]) .bigcta{font-size:.95rem}
.bigcta:disabled{background:rgba(255,255,255,.08);color:var(--text-dim);cursor:default;box-shadow:none}
.bigcta:not(:disabled):active{transform:scale(.98)}
.ownagent{width:100%;margin-top:10px;display:flex;align-items:center;justify-content:center;gap:8px;background:linear-gradient(135deg,var(--green-primary),var(--green-dark));color:#fff;border:0;border-radius:12px;padding:13px;font:900 .82rem 'Inter',sans-serif;cursor:pointer;box-shadow:0 4px 12px rgba(0,168,107,.25);letter-spacing:.3px;transition:.2s;font-family:inherit}
.ownagent:active{transform:scale(.98)}
.ownagent .ow{text-align:center}
.ownagent small{font-size:.6rem;font-weight:700;opacity:.85;display:block;letter-spacing:.2px}
.amt-note{margin-top:15px;font-size:.68rem;color:var(--text-dim);line-height:1.65;text-align:center}
:host([lang="am"]) .amt-note{font-size:.74rem;line-height:1.8}

.res-head{background:rgba(245,197,24,.08);border:1px solid rgba(245,197,24,.3);border-radius:13px;padding:11px 14px;display:flex;justify-content:space-between;align-items:center;margin-bottom:15px}
.res-head small{font-size:.62rem;color:var(--text-muted);display:block;font-weight:600;text-transform:uppercase;letter-spacing:.8px}
.res-head b{font-size:.98rem;background:linear-gradient(135deg,var(--gold),var(--gold-light));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.res-head button{background:none;border:0;color:var(--green-light);font:700 .7rem 'Inter',sans-serif;cursor:pointer;text-decoration:underline}
.nores{background:var(--card-bg);border:1px dashed rgba(255,255,255,.2);border-radius:16px;padding:18px 15px;text-align:center;margin-bottom:15px}
.nores h4{font-size:.85rem;font-weight:800;margin-bottom:5px}
.nores p{font-size:.72rem;color:var(--text-muted);line-height:1.6}

.notice{background:linear-gradient(135deg,rgba(245,197,24,.12),rgba(0,168,107,.07));border:1px solid rgba(245,197,24,.35);border-radius:16px;padding:14px;margin-bottom:20px;position:relative}
.notice .close{position:absolute;top:10px;right:12px;background:none;border:0;color:var(--text-dim);font-size:14px;cursor:pointer;font-family:inherit}
.nb-tag{display:inline-flex;align-items:center;gap:6px;font-size:.62rem;font-weight:800;letter-spacing:1.2px;color:var(--gold);text-transform:uppercase;margin-bottom:7px}
.notice h3{font-size:.92rem;font-weight:800;margin-bottom:5px;letter-spacing:-.2px}
.notice p{font-size:.76rem;color:var(--text-muted);line-height:1.55;margin-bottom:11px}
.notice .vid{display:flex;align-items:center;gap:10px;background:rgba(5,13,26,.55);border:1px solid var(--card-border);border-radius:12px;padding:9px 11px;cursor:pointer;transition:.2s}
.notice .vid:hover{border-color:rgba(245,197,24,.4)}
.notice .vid .play{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--gold-light));display:grid;place-items:center;font-size:11px;color:var(--bg-darker);flex:0 0 auto}
.notice .vid b{font-size:.78rem;font-weight:700;display:block}
.notice .vid small{font-size:.66rem;color:var(--text-dim)}

.refresh-indicator{position:fixed;top:16px;left:16px;display:flex;align-items:center;gap:8px;background:var(--card-bg);border:1px solid var(--card-border);border-radius:999px;padding:6px 13px;font-size:.7rem;color:var(--text-muted);opacity:0;transition:opacity .3s ease;z-index:50;backdrop-filter:blur(10px)}
.refresh-indicator.show{opacity:1}
.refresh-indicator .spinner{width:10px;height:10px;border:2px solid var(--card-border);border-top-color:var(--green-light);border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

.modal-backdrop{position:fixed;inset:0;background:rgba(5,13,26,.8);display:none;align-items:center;justify-content:center;z-index:100;padding:20px}
.modal-backdrop.show{display:flex}
.modal-warn{background:#0e1d33;border:1px solid var(--card-border);border-radius:20px;padding:26px 22px;width:100%;max-width:360px;text-align:center;animation:pop .22s ease}
@keyframes pop{from{transform:scale(.92);opacity:0}to{transform:none;opacity:1}}
.modal-warn .icon-wrap{font-size:30px;margin-bottom:10px}
.modal-warn h3{font-size:.98rem;font-weight:800;margin-bottom:6px}
.modal-warn p{font-size:.76rem;color:var(--text-muted);line-height:1.6;margin-bottom:17px}
.modal-actions{display:flex;gap:9px}
.modal-btn{flex:1;border:0;border-radius:11px;padding:12px;font:800 .78rem 'Inter',sans-serif;cursor:pointer;font-family:inherit}
.modal-btn.cancel{background:rgba(255,255,255,.08);color:var(--text-muted)}
.modal-btn.confirm{background:linear-gradient(135deg,var(--green-primary),var(--green-dark));color:#fff;box-shadow:0 4px 12px rgba(0,168,107,.25)}

.wtoast{position:fixed;left:16px;right:16px;bottom:18px;max-width:420px;margin:auto;background:#0e1d33;border:1px solid rgba(34,255,154,.4);border-radius:13px;padding:12px 14px;font-size:.7rem;line-height:1.6;color:var(--text-light);z-index:9999;display:none;box-shadow:0 12px 36px rgba(0,0,0,.5)}
.wtoast.show{display:block}
.wtoast b{color:var(--green-light)}

.kb-video-wrap{position:relative;padding-bottom:56.25%;height:0;margin:0 0 16px 0;border-radius:12px;overflow:hidden;background:#000}
.kb-video-wrap iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:0}

/* ---- payout details form (above amount) ---- */
.payout{background:var(--card-bg);border:1px solid var(--card-border);border-radius:16px;padding:16px;margin-bottom:16px}
.payout-title{font-size:.78rem;font-weight:800;letter-spacing:-.2px;margin-bottom:12px;display:flex;align-items:center;gap:8px}
.payout-title::before{content:"";width:4px;height:15px;background:linear-gradient(180deg,var(--gold),var(--green-primary));border-radius:2px}
.pf{width:100%;background:rgba(5,13,26,.5);border:1px solid var(--card-border);border-radius:11px;padding:12px 13px;color:var(--text-light);font:700 .84rem 'Inter',sans-serif;outline:0;transition:.2s;margin-bottom:9px;font-family:inherit}
.pf::placeholder{color:var(--text-dim)}
.pf:focus{border-color:var(--green-primary)}
select.pf{appearance:none;-webkit-appearance:none;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7a8f' stroke-width='3'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 13px center;padding-right:34px}
select.pf option{background:#0e1d33;color:var(--text-light)}
.payout-note{font-size:.64rem;color:var(--text-dim);line-height:1.6;margin-top:3px}
:host([lang="am"]) .payout-note{font-size:.7rem}
`;
