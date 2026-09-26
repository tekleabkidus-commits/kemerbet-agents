(function(){"use strict";const Xe=`
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

.videobox{position:relative;border-radius:14px;overflow:hidden;border:1px solid var(--card-border);background:linear-gradient(135deg,#0e1d33,#0a1628);aspect-ratio:16/9;margin-bottom:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:9px;transition:.2s}
.videobox:hover{border-color:rgba(245,197,24,.45)}
.videobox::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 50% 40%,rgba(0,168,107,.16),transparent 65%)}
.videobox .vplay{width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--gold-light));display:grid;place-items:center;font-size:17px;color:var(--bg-darker);box-shadow:0 6px 20px rgba(245,197,24,.35);position:relative;z-index:1}
.videobox b{font-size:.8rem;font-weight:800;position:relative;z-index:1}
.videobox small{font-size:.62rem;color:var(--text-dim);font-weight:600;position:relative;z-index:1}
.videobox iframe{position:absolute;inset:0;width:100%;height:100%;border:0}

.amount-wrap{background:var(--card-bg);backdrop-filter:blur(10px);border:1px solid var(--card-border);border-radius:16px;padding:14px 16px;text-align:center;margin-bottom:12px}
.amount-wrap label{font-size:.72rem;color:var(--text-muted);display:block;margin-bottom:8px;font-weight:600}
.amt-line{display:flex;align-items:baseline;justify-content:center;gap:8px;border-bottom:2px solid rgba(245,197,24,.5);padding-bottom:7px;margin-bottom:6px}
.amt-line input{background:none;border:0;outline:0;color:var(--text-light);font:900 28px 'Inter',sans-serif;width:150px;text-align:right;letter-spacing:-1px}
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
.payout{background:var(--card-bg);border:1px solid var(--card-border);border-radius:16px;padding:13px 14px;margin-bottom:12px}
.payout-title{font-size:.78rem;font-weight:800;letter-spacing:-.2px;margin-bottom:10px;display:flex;align-items:center;gap:8px}
.payout-title::before{content:"";width:4px;height:15px;background:linear-gradient(180deg,var(--gold),var(--green-primary));border-radius:2px}
.pf{width:100%;background:rgba(5,13,26,.5);border:1px solid var(--card-border);border-radius:11px;padding:10px 12px;color:var(--text-light);font:700 .84rem 'Inter',sans-serif;outline:0;transition:.2s;margin-bottom:7px;font-family:inherit}
.pf::placeholder{color:var(--text-dim)}
.pf:focus{border-color:var(--green-primary)}
select.pf{appearance:none;-webkit-appearance:none;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7a8f' stroke-width='3'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 13px center;padding-right:34px}
select.pf option{background:#0e1d33;color:var(--text-light)}
.payout-note{font-size:.64rem;color:var(--text-dim);line-height:1.6;margin-top:3px}
:host([lang="am"]) .payout-note{font-size:.7rem}
.payout-saved{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:2px 0 10px}
.psug{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:1px;width:100%;text-align:left;background:rgba(0,168,107,.07);border:1px solid rgba(0,168,107,.28);border-radius:10px;padding:9px 11px 9px 11px;cursor:pointer;transition:.2s;font-family:inherit;overflow:hidden}
.psug:hover{border-color:rgba(0,168,107,.55);background:rgba(0,168,107,.12)}
.psug:active{transform:scale(.98)}
.psug-x{position:absolute;top:4px;left:4px;width:18px;height:18px;border-radius:6px;border:0;background:rgba(239,68,68,.15);color:#ef4444;font-size:10px;line-height:1;cursor:pointer;display:grid;place-items:center;font-family:inherit;padding:0;z-index:2}
.psug-x:hover{background:rgba(239,68,68,.3)}
.psug-name{font-size:.76rem;font-weight:800;color:var(--text-light);padding-left:20px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.psug-meta{font-size:.62rem;color:var(--text-muted);font-weight:600;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nb-video{margin-top:11px;margin-bottom:0}
.idchip{display:inline-flex;align-items:center;gap:6px;background:rgba(245,197,24,.08);border:1px solid rgba(245,197,24,.35);color:var(--gold);border-radius:9px;padding:6px 10px;font:700 .7rem 'Inter',sans-serif;cursor:pointer;transition:.2s;margin:2px 0 10px;font-family:inherit}
.idchip:hover{background:rgba(245,197,24,.16);border-color:rgba(245,197,24,.6)}
.idchip:active{transform:scale(.97)}
.idchip b{font-weight:900;letter-spacing:.4px}
.pid-row{display:flex;flex-wrap:wrap;gap:6px;margin:2px 0 9px}
.pid-chip{display:inline-flex;align-items:center;background:rgba(0,168,107,.07);border:1px solid rgba(0,168,107,.28);border-radius:9px;overflow:hidden}
.pid-use{background:transparent;border:0;color:var(--text-light);font:800 .72rem 'Inter',sans-serif;padding:6px 4px 6px 10px;cursor:pointer;font-family:inherit}
.pid-x{background:transparent;border:0;color:var(--text-dim);font-size:.9rem;font-weight:800;padding:6px 8px;cursor:pointer;line-height:1;font-family:inherit}
.pid-x:hover{color:#ff6b6b}
.psug-wrap{display:flex;align-items:stretch;gap:0}
.psug-wrap .psug{flex:1;border-top-right-radius:0;border-bottom-right-radius:0}
.psug-wrap .psug-x{border:1px solid rgba(0,168,107,.28);border-left:0;border-radius:0 10px 10px 0;background:rgba(0,168,107,.07)}
.pid-note{font-size:.66rem;font-weight:700;color:var(--text-dim);margin:2px 2px 5px;display:flex;align-items:center;gap:5px}
.pid-note.auto{color:var(--green-primary)}
.pid-note.auto::before{content:"\\2713";font-weight:900}
.pf-locked{display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:default;user-select:all;-webkit-user-select:all;letter-spacing:.3px}
.pf-locked .lock{font-size:.72rem;opacity:.7;user-select:none;-webkit-user-select:none}
.pid-missing{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.35);border-radius:11px;padding:11px 12px;margin-bottom:7px;display:flex;flex-direction:column;gap:4px}
.pid-missing b{font-size:.8rem;font-weight:800;color:#ff6b6b}
.pid-missing span{font-size:.7rem;color:var(--text-muted);line-height:1.55}
.pid-retry{align-self:flex-start;margin-top:5px;background:transparent;border:1px solid rgba(255,255,255,.2);color:var(--text-light);border-radius:9px;padding:6px 12px;font:800 .72rem 'Inter',sans-serif;cursor:pointer;font-family:inherit}
.pid-retry:hover{border-color:var(--gold);color:var(--gold)}
.pair-retry{margin-top:10px}
`,M={am:{title:"Kemerbet ኤጀንቶች",subtitle:"ኦንላይን ያሉ ኤጀንቶች ቅድሚያ ይታያሉ። ዲፖዚት ለማድረግ ይምረጡ።",live_now:"አሁን ኦንላይን",recently_online:"በቅርብ ጊዜ ኦንላይን የነበሩ",agents_online:"ኤጀንቶች ኦንላይን ናቸው",no_agents_online:"ምንም ኤጀንት ኦንላይን የለም",live_label:"ኦንላይን",offline_label:"ኦፍላይን",truly_online:"ትክክለኛ ኦንላይን ያሉ",last_seen:"መጨረሻ የታየው",just_now:"አሁን",min_ago_suffix:"ደቂቃ በፊት",hour_unit:"ሰዓት",day_unit:"ቀን",ago:"በፊት",deposit:"ዲፖዚት",agent:"ኤጀንት",live_count:"ኦንላይን",no_agents_title:"ምንም ኤጀንት አሁን ኦንላይን የለም",no_agents_desc:"ከታች በቅርብ ጊዜ ኦንላይን የነበሩ ኤጀንቶችን ይመልከቱ።",loading:"በመጫን ላይ…",updating:"እያዘመነ ነው",warn_title:"ይህ ኤጀንት ኦፍላይን ሊሆን ይችላል",warn_desc:"ኤጀንቱ ለተወሰነ ጊዜ ኦንላይን አልነበረም እና በፍጥነት ላይመልስልዎ ይችላል። መቀጠል ይፈልጋሉ?",cancel:"ይቅር",continue:"ቀጥል",intent_question:"ምን ማድረግ ይፈልጋሉ?",intent_deposit:"ዲፖዚት",intent_deposit_desc:"ኦንላይን ያሉ ኤጀንቶችን አይተው ገንዘብ ያስገቡ",intent_withdraw:"ማውጣት",intent_withdraw_desc:"መጠን ያስገቡ → የሚከፍሉ ኤጀንቶች ይታያሉ",withdraw_title:"ማውጣት",withdraw_amount_label:"ምን ያህል ማውጣት ይፈልጋሉ?",withdraw_min_prefix:"ዝቅተኛ",withdraw_min_error:"ዝቅተኛው መጠን",withdraw_see_agents:"ይህን መጠን የሚከፍሉ ኤጀንቶችን ይመልከቱ",withdraw_own_agent:"የራሴ ኤጀንት",withdraw_own_agent_desc:"በቀጥታ በሳይቱ ላይ ያውጡ",withdraw_note:"የገንዘብ መጠንዎን የሚሸፍኑ ኤጀንቶችን ብቻ እናሳያለን። የቴሌግራም መልእክትዎ ከመጠኑ እና ከኤጀንቱ የማውጫ መለያ ጋር ዝግጁ ሆኖ ይመጣል።",withdraw_howto:"ማውጣት እንዴት እንደሚሰራ",withdraw_howto_sub:"ቪዲዮ",results_title:"ለመጠንዎ ኤጀንቶች",results_withdrawing:"በማውጣት ላይ",results_change:"ቀይር",results_cap_prefix:"እስከ",results_ready:"ኦንላይን · ለመክፈል ዝግጁ",results_withdraw_here:"እዚህ ያውጡ",results_withdraw_partial:"በከፊል ያውጡ",results_none_title:"አሁን ይህን ሙሉ መጠን የሚከፍል ኤጀንት የለም",results_none_desc:"እነዚህ በጣም ቅርብ ናቸው — መጠኑን መከፋፈል፣ ትንሽ መጠን መምረጥ ወይም ቆይተው መመለስ ይችላሉ።",recents_title:"የቅርብ ጊዜ ኤጀንቶችዎ",recents_only_you:"እርስዎ ብቻ ያዩታል",recents_contact:"አግኝ",recents_online:"ኦንላይን",recents_offline:"ኦፍላይን",back:"ተመለስ",payout_title:"ገንዘቡ የሚላክበት መረጃ",payout_name_ph:"ሙሉ ስም",payout_bank_ph:"ባንክ ይምረጡ",payout_account_ph:"የሂሳብ ቁጥር",payout_note:"ይህ መረጃ ለኤጀንቱ በቴሌግራም መልእክት ውስጥ ይላካል። በመሳሪያዎ ላይ ብቻ ይቀመጣል።",depask_title:"ምን ያህል ማስገባት ይፈልጋሉ?",depask_see_agents:"ዝግጁ ኤጀንቶችን ይመልከቱ",player_id_ph:"የተጫዋች መለያ (Player ID)",pid_auto_label:"የተጫዋች መለያ — በራስ-ሰር ተሞልቷል",pid_login_hint:"የተጫዋች መለያዎ በራስ-ሰር እንዲሞላ ወደ ሳይቱ ይግቡ",howto_dep_title:"እንዴት ገንዘብ ማስገባት እንደሚቻል",howto_wd_title:"እንዴት ገንዘብ ማውጣት እንደሚቻል",results_id_label:"የመውጫ መለያ",results_id_copied:"መለያው ተቀድቷል:",agents_online_plain:"ኤጀንቶች ኦንላይን ናቸው",pair_loading:"ኤጀንቶችዎን በመፈለግ ላይ…",pair_error:"ኤጀንቶችን መጫን አልተቻለም። ግንኙነትዎን አረጋግጠው እንደገና ይሞክሩ።",pair_none_desc:"እባክዎ ከጥቂት ደቂቃዎች በኋላ እንደገና ይሞክሩ።",pid_locked_label:"የተጫዋች መለያዎ (ከአካውንትዎ የተወሰደ)",pid_missing_title:"የተጫዋች መለያ (Player ID) አልተገኘም",pid_missing_desc:"ለመቀጠል ወደ አካውንትዎ ይግቡ፣ ከዚያ «እንደገና ሞክር» ይጫኑ።",pid_retry:"እንደገና ሞክር"},en:{title:"Kemerbet Agents",subtitle:"Live agents are shown first. Tap to deposit.",live_now:"Live Now",recently_online:"Recently online",agents_online:"agents online",no_agents_online:"No agents online",live_label:"Live",offline_label:"Offline",truly_online:"Truly online",last_seen:"Last seen",just_now:"just now",min_ago_suffix:"min ago",hour_unit:"h",day_unit:"d",ago:"ago",deposit:"Deposit",agent:"Agent",live_count:"live",no_agents_title:"No agents live right now",no_agents_desc:"Check below for recently online agents.",loading:"Loading agents…",updating:"Updating",warn_title:"This agent may be offline",warn_desc:"The agent has not been online for a while and may not respond quickly. Do you want to continue?",cancel:"Cancel",continue:"Continue",intent_question:"What do you want to do?",intent_deposit:"Deposit",intent_deposit_desc:"See all online agents and send money",intent_withdraw:"Withdraw",intent_withdraw_desc:"Enter amount → matched to agents who can pay it",withdraw_title:"Withdraw",withdraw_amount_label:"How much do you want to withdraw?",withdraw_min_prefix:"Minimum",withdraw_min_error:"Minimum is",withdraw_see_agents:"See agents who can pay this",withdraw_own_agent:"My own agent",withdraw_own_agent_desc:"withdraw directly on the site",withdraw_note:"We only show agents whose cash covers your amount, so you don't waste time asking. Your Telegram message comes ready with the amount and the agent's Withdrawal ID.",withdraw_howto:"How withdrawal works",withdraw_howto_sub:"Video",results_title:"Agents for your amount",results_withdrawing:"Withdrawing",results_change:"Change",results_cap_prefix:"Up to",results_ready:"Online · ready to pay",results_withdraw_here:"Withdraw here",results_withdraw_partial:"Withdraw partial",results_none_title:"No agent can pay this full amount right now",results_none_desc:"These agents are closest — split your withdrawal, choose a smaller amount, or check back soon.",recents_title:"Your recent agents",recents_only_you:"only you see this",recents_contact:"Contact",recents_online:"Online",recents_offline:"Offline",back:"Back",payout_title:"Where should the agent send the money?",payout_name_ph:"Full name",payout_bank_ph:"Select bank",payout_account_ph:"Account number",payout_note:"This is included in your Telegram message to the agent. Saved only on your device.",depask_title:"How much will you deposit?",depask_see_agents:"See available agents",player_id_ph:"Player ID",pid_auto_label:"Player ID — filled automatically",pid_login_hint:"Log in to fill your Player ID automatically",howto_dep_title:"How to deposit",howto_wd_title:"How to withdraw",results_id_label:"Withdrawal ID",results_id_copied:"ID copied:",agents_online_plain:"Agents online",pair_loading:"Finding your agents…",pair_error:"Couldn’t load your agents. Check your connection and try again.",pair_none_desc:"Please check back in a few minutes.",pid_locked_label:"Your Player ID (from your account)",pid_missing_title:"Player ID not detected",pid_missing_desc:"Log in to your account to continue, then tap Try again.",pid_retry:"Try again"}},we="kemerbet_lang";function W(){try{const t=localStorage.getItem(we);if(t==="am"||t==="en")return t}catch{}return"am"}function Ze(t){try{localStorage.setItem(we,t)}catch{}}const Qe={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"};function y(t){return String(t).replace(/[&<>"']/g,e=>Qe[e])}const ve="kemerbet_recent_agents",et=20;function xe(){try{const t=localStorage.getItem(ve);if(!t)return[];const e=JSON.parse(t);return Array.isArray(e)?e.filter(n=>n&&typeof n.agent_id=="number"&&typeof n.ts=="number"):[]}catch{return[]}}function tt(t){try{localStorage.setItem(ve,JSON.stringify(t.slice(0,et)))}catch{}}function ee(t,e){const n=xe().filter(a=>a.agent_id!==t);n.unshift({agent_id:t,intent:e,ts:Date.now()}),tt(n)}function nt(t,e){const n=new Map(t.map(r=>[r.id,r])),a=[];for(const r of xe().sort((i,o)=>o.ts-i.ts)){const i=n.get(r.agent_id);if(i&&(a.push({entry:r,agent:i}),a.length>=e))break}return a}function te(t){const e=window.location.origin;let n=t||"/sport/popup/withdrawal";if(/^https?:\/\//i.test(n))try{const a=new URL(n);n=a.pathname+a.search+a.hash}catch{n="/sport/popup/withdrawal"}return n.startsWith("/")||(n="/"+n),e+n}function ye(t,e){var o,s,u;const n=e.withdrawal_id??"",a=((o=e.payout)==null?void 0:o.account)??"",r=(e.player_id??"").trim();return t.replace(/\{amount\}/g,e.amount!=null?e.amount.toLocaleString("en-US"):"").replace(/\{withdrawal_id\}/g,n?"`"+n+"`":"").replace(/\{name\}/g,((s=e.payout)==null?void 0:s.name)??"").replace(/\{bank\}/g,((u=e.payout)==null?void 0:u.bank)??"").replace(/\{account\}/g,a?"`"+a+"`":"").replace(/\{player_id\}/g,r?"`"+r+"`":"").split(`
`).filter(d=>!/^[^:\n]{0,40}:\s*$/.test(d.trim())||d.trim()==="").join(`
`).replace(/\n{3,}/g,`

`).trim()}function ne(t,e){return`https://telegram.me/${encodeURIComponent(t)}?text=${encodeURIComponent(e)}`}function at(t){const e=ye(t.messageTemplate,{amount:t.amount,withdrawal_id:t.agent.withdrawal_id??"",payout:t.payout??null,player_id:t.playerId??null}),n=ne(t.agent.telegram_username,e),a=te(t.redirectPath);window.open(n,"_blank","noopener"),window.location.href=a}function _e(t){window.location.href=te(t)}const ke="kemerbet_payout_accounts",it=4;function V(){try{const t=localStorage.getItem(ke);if(!t)return[];const e=JSON.parse(t);return Array.isArray(e)?e.filter(n=>n&&typeof n.name=="string"&&typeof n.bank=="string"&&typeof n.account=="string"):[]}catch{return[]}}function $e(t){try{localStorage.setItem(ke,JSON.stringify(t.slice(0,it)))}catch{}}function rt(t){const e=t.name.trim(),n=t.bank.trim(),a=t.account.trim(),r=(t.playerId??"").trim();if(!e||!n||!a)return;const i=V().filter(o=>!(o.bank===n&&o.account===a));i.unshift({name:e,bank:n,account:a,playerId:r,ts:Date.now()}),$e(i)}function ot(t,e){const n=t.trim(),a=e.trim();$e(V().filter(r=>!(r.bank===n&&r.account===a)))}function st(t){const e=t.trim();if(!e)return null;const n=V().filter(a=>a.bank===e).sort((a,r)=>r.ts-a.ts)[0];return n?{name:n.name,bank:n.bank,account:n.account,playerId:n.playerId}:null}function Ie(t){return V().sort((e,n)=>n.ts-e.ts).slice(0,t).map(e=>({name:e.name,bank:e.bank,account:e.account,playerId:e.playerId}))}const Ee="kemerbet_player_ids",ae=4,dt=12;function ie(){try{const t=localStorage.getItem(Ee);if(!t)return[];const e=JSON.parse(t);return Array.isArray(e)?e.filter(n=>n&&typeof n.id=="string"&&n.id!==""):[]}catch{return[]}}function Le(t){try{const e=[...t].sort((n,a)=>Math.max(a.depTs??0,a.wdTs??0)-Math.max(n.depTs??0,n.wdTs??0));localStorage.setItem(Ee,JSON.stringify(e.slice(0,dt)))}catch{}}function lt(t,e){const n=t.trim();if(!n)return;const a=ie(),r=a.find(o=>o.id===n),i=r??{id:n};i.depTs=Date.now(),r||a.unshift(i),Le(a)}function ct(t){Le(ie().filter(e=>e.id!==t))}function Se(t){const e=ie(),n=o=>o.depTs??0,a=o=>o.wdTs??0,i=e.filter(o=>n(o)>0).sort((o,s)=>n(s)-n(o)).slice(0,ae).map(o=>o.id);if(i.length<ae){const o=e.filter(s=>n(s)===0&&a(s)>0).sort((s,u)=>a(u)-a(s));for(const s of o){if(i.length>=ae)break;i.includes(s.id)||i.push(s.id)}}return i}function F(t){if(typeof t!="string"&&typeof t!="number")return null;const e=String(t).trim();return/^[A-Za-z0-9_-]{3,32}$/.test(e)?e:null}function pt(t){if(typeof t!="string"&&typeof t!="number")return null;const e=String(t).trim().match(/[A-Za-z0-9_-]{3,32}/);return e?e[0]:null}function gt(t){const e=t.indexOf("."),n=e===-1?t:t.slice(0,e),a=e===-1?[]:t.slice(e+1).split(".");for(const r of[sessionStorage,localStorage]){let i=null;try{i=r.getItem(n)}catch{continue}if(i!=null)if(a.length>0)try{let o=JSON.parse(i);for(const u of a)if(o&&typeof o=="object")o=o[u];else{o=void 0;break}const s=F(o);if(s)return s}catch{}else{const o=F(i);if(o)return o;try{const s=JSON.parse(i);for(const u of["id","playerId","player_id","userId","user_id"]){const d=F(s==null?void 0:s[u]);if(d)return d}}catch{}}}return null}function ut(t){try{const n=F(window.KEMERBET_PLAYER_ID);if(n)return n}catch{}if(t.storageKey){const e=gt(t.storageKey.trim());if(e)return e}if(t.domSelector)try{const e=document.querySelector(t.domSelector),n=pt((e==null?void 0:e.textContent)??(e==null?void 0:e.value)??null);if(n)return n}catch{}return null}const re='<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2.25c-4.14 0-7.5 2.35-7.5 5.25 0 .83.67 1.5 1.5 1.5h12c.83 0 1.5-.67 1.5-1.5 0-2.9-3.36-5.25-7.5-5.25Z"/></svg>';function ft(t,e){const n=M[e],a=Math.max(0,Math.floor((Date.now()-new Date(t).getTime())/1e3));if(a<60)return`${n.last_seen} ${n.just_now}`;const r=Math.floor(a/60);if(r<60)return`${n.last_seen} ${r} ${n.min_ago_suffix}`;const i=Math.floor(r/60),o=r%60;if(i<24)return e==="am"?o>0?`${n.last_seen} ${i} ${n.hour_unit} ${o} ደቂቃ ${n.ago}`:`${n.last_seen} ${i} ${n.hour_unit} ${n.ago}`:o>0?`${n.last_seen} ${i}${n.hour_unit} ${o}m ${n.ago}`:`${n.last_seen} ${i}${n.hour_unit} ${n.ago}`;const s=Math.floor(i/24);return e==="am"?`${n.last_seen} ${s} ${n.day_unit} ${n.ago}`:`${n.last_seen} ${s}${n.day_unit} ${n.ago}`}function oe(t,e,n){const a=M[n],r=t.status==="live",i=y(t.telegram_username),o=encodeURIComponent(e),s=`https://telegram.me/${i}?text=${o}`,u=(t.payment_methods||[]).map(g=>g.slug),d=y(JSON.stringify(u)),b=(t.payment_methods||[]).map(g=>`<span class="bank">${y(g.display_name)}</span>`).join(""),m=r?`<div class="waiting-text">
         <span class="typing-dots"><span></span><span></span><span></span></span>
         ${a.truly_online}
       </div>`:`<div class="last-seen">⏱ ${t.last_seen_at?ft(t.last_seen_at,n):""}</div>`,k=r?`<div class="badge live">${a.live_label}</div>`:`<div class="badge offline">${a.offline_label}</div>`,f=r?`<a href="${s}" class="deposit-btn" target="_blank" rel="noopener" data-agent-id="${t.id}" data-tg-user="${i}" data-payment-methods="${d}">
         <span>${a.deposit}</span>
         <span class="arrow">→</span>
       </a>`:`<button class="deposit-btn" data-agent-id="${t.id}" data-tg-user="${i}" data-deposit-url="${y(s)}" data-offline="true" data-payment-methods="${d}">
         <span>${a.deposit}</span>
         <span class="arrow">→</span>
       </button>`;return`
    <div class="agent-card ${r?"live":"offline"}">
      <div class="agent-top">
        <div class="agent-name-wrap">
          <div class="agent-avatar">${re}</div>
          <div>
            <div class="agent-name">${a.agent}</div>
          </div>
        </div>
        ${k}
      </div>
      ${m}
      <div class="banks">${b}</div>
      ${f}
    </div>
  `}const Te="kemerbet_device_id",Be="kemerbet_pair_synced",mt=/^[A-Za-z0-9-]{16,64}$/;let se=null,de=null;function Ae(){try{if(typeof crypto<"u"&&typeof crypto.randomUUID=="function")return crypto.randomUUID()}catch{}const t=new Uint8Array(16);try{crypto.getRandomValues(t)}catch{for(let n=0;n<t.length;n++)t[n]=Math.floor(Math.random()*256)}const e=Array.from(t,n=>n.toString(16).padStart(2,"0")).join("");return`${e.slice(0,8)}-${e.slice(8,12)}-${e.slice(12,16)}-${e.slice(16,20)}-${e.slice(20)}`}function le(){try{const t=localStorage.getItem(Te);if(t&&mt.test(t))return t;const e=Ae();return localStorage.setItem(Te,e),e}catch{return se||(se=Ae()),se}}async function ze(t,e){const n=await fetch(`${t}/api/public/pair`,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({device_id:le(),player_id:e.playerId,intent:e.intent,amount:e.amount??null,bank:e.bank?e.bank:null})});if(!n.ok)throw new Error(`HTTP ${n.status}`);const a=await n.json();return{enabled:(a==null?void 0:a.enabled)===!0,agents:Array.isArray(a==null?void 0:a.agents)?a.agents:[],partial:(a==null?void 0:a.partial)===!0}}function ce(t,e){const n=`${le()}|${e.trim().toLowerCase()}`;try{if(localStorage.getItem(Be)===n)return}catch{}de!==n&&(de=n,fetch(`${t}/api/public/pair/sync`,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({device_id:le(),player_id:e.trim()})}).then(a=>a.ok?a.json():null).then(a=>{if(a&&a.ok===!0)try{localStorage.setItem(Be,n)}catch{}}).catch(()=>{}).finally(()=>{de=null}))}function De(t,e){if(!e||e.length===0){const a=[...t];for(let r=a.length-1;r>0;r--){const i=Math.floor(Math.random()*(r+1));[a[r],a[i]]=[a[i],a[r]]}return a}const n=a=>{const r=e.indexOf(a);return r===-1?Number.MAX_SAFE_INTEGER:r};return[...t].sort((a,r)=>n(a.id)-n(r.id))}let O=0,z={name:"",bank:"",account:""},C="",I={amount:0,playerId:""};function K(t){return ut({storageKey:t.settings.player_id_storage_key||void 0,domSelector:t.settings.player_id_dom_selector||void 0})}function ht(t){return K(t)}function G(t){return t.settings.pair_mode_enabled===!0}let Y=[],pe=[],ge=0,ue=0;function Me(t,e,n){return e?`
      <div class="pid-note auto">${t.pid_locked_label}</div>
      <div class="pf pf-locked">${y(e)}<span class="lock">🔒</span></div>`:`
    <div class="pid-missing">
      <b>${t.pid_missing_title}</b>
      <span>${t.pid_missing_desc}</span>
      <button class="pid-retry" id="${n}">${t.pid_retry}</button>
    </div>`}let Ce=!1,Pe=!1;function bt(){try{if(window.location.hash.toLowerCase()==="#withdraw")return!0;const t=new URLSearchParams(window.location.search);return t.get("withdraw")==="1"||t.get("intent")==="withdraw"}catch{return!1}}function D(t){return t.toLocaleString("en-US")}function S(t,e){var a;["Home","DepAsk","Deposit","Amount","Results"].forEach(r=>{const i=t.getElementById("screen"+r);i&&i.classList.toggle("active",r.toLowerCase()===e)});const n=e==="depask"?"screenDepAsk":"screen"+e.charAt(0).toUpperCase()+e.slice(1);(a=t.getElementById(n))==null||a.scrollIntoView({block:"nearest"})}function He(t){if(!t)return null;const e=[/youtube\.com\/watch\?v=([\w\-_]+)/i,/youtube\.com\/embed\/([\w\-_]+)/i,/youtu\.be\/([\w\-_]+)/i];for(const n of e){const a=t.match(n);if(a)return a[1]}return null}function J(t,e,n){return`
    <div class="videobox" data-video="${y(n)}">
      <div class="vplay">▶</div>
      <b>${y(t)}</b>
      ${e?`<small>${y(e)}</small>`:""}
    </div>`}function X(t,e){let n=t.getElementById("wToast");n||(n=document.createElement("div"),n.id="wToast",n.className="wtoast",t.appendChild(n)),n.innerHTML=e,n.classList.add("show"),window.setTimeout(()=>n&&n.classList.remove("show"),4500)}function We(t){const{shadow:e,getData:n}=t,a=n();if(!a)return;const r=W(),i=M[r],o=a.settings.withdrawals_enabled!==!1,s=e.querySelector("#screenDeposit .backrow");if(o)s&&(s.style.display="");else{s&&(s.style.display="none");const l=e.querySelector(".screen.active");(!l||l.id==="screenHome")&&(R(t),S(e,"depask"))}o&&!Ce&&bt()&&(Ce=!0,P(t),S(e,"amount")),Pe||(Pe=!0,window.addEventListener("hashchange",()=>{const l=t.getData();l&&l.settings.withdrawals_enabled!==!1&&window.location.hash.toLowerCase()==="#withdraw"&&(P(t),S(t.shadow,"amount"))}));const u=e.getElementById("noticeWrap"),d=e.getElementById("noticeWrapDep"),b=o?u:d,m=o?d:u;m&&(m.innerHTML="");const k=e.getElementById("depHowtoWrap");if(k){const l=a.settings.deposit_howto_video_url||"";k.innerHTML=l?J(i.howto_dep_title,"",l):""}const f=e.getElementById("howtoWrap");if(f){const l=a.settings.deposit_howto_video_url||"",w=a.settings.withdrawal_howto_video_url||"";!o||!l&&!w?f.innerHTML="":f.innerHTML=`
        <div class="notice">
          ${l?J(i.howto_dep_title,"",l):""}
          ${w?J(i.howto_wd_title,"",w):""}
        </div>`}if(b){const l=a.notices??[];l.length===0?b.innerHTML="":b.innerHTML=l.map(w=>{const _=(w.video_url?He(w.video_url)!==null||/\.(mp4|webm|mov)(\?|#|$)/i.test(w.video_url):!1)?`<div class="videobox nb-video" data-video="${y(w.video_url??"")}"><div class="vplay">▶</div><b>${i.withdraw_howto}</b></div>`:"";return`
            <div class="notice">
              <div class="nb-tag">${w.priority==="urgent"?"📣":"📌"} ${y(w.title||"")}</div>
              <p>${y(w.body)}</p>
              ${_}
            </div>`}).join("")}const g=e.getElementById("recentsWrap");if(g)if(a.settings.recents_enabled&&!G(a)){const l=nt(a.directory??[],a.settings.recents_count??5);if(l.length===0)g.style.display="none";else{g.style.display="block";const w=l.map(_=>{const L=_.agent,p=L.online,v=p?i.recents_online:i.recents_offline,h=_.entry.intent==="withdrawal",A=h?i.intent_withdraw:i.deposit,T=p?h?"wdr":"dep":"grey";return`
              <div class="recent${p?"":" is-off"}">
                <div class="agent-avatar ${p?"live":"off"}">${re}</div>
                <div class="rc-mid">
                  <div class="rc-name">${i.agent}</div>
                  <div class="rc-sub">${v}</div>
                </div>
                <div class="rc-btns">
                  <button class="btn-s ${T}" data-recent-main data-agent-id="${L.id}" data-intent="${_.entry.intent}">${A}</button>
                  <button class="btn-s line" data-recent-contact data-agent-id="${L.id}">${i.recents_contact}</button>
                </div>
              </div>`}).join(""),c=e.getElementById("recentsGrid");c&&(c.innerHTML=w)}}else g.style.display="none";const $=e.getElementById("intentQuestion");$&&($.textContent=i.intent_question)}function fe(t){if(!I.playerId.trim()||I.amount<=0)return null;const e=t.settings.deposit_message||"Hi Kemerbet agent, I want to deposit {amount} ETB. My Player ID: {player_id}";return ye(e,{amount:I.amount,player_id:I.playerId})}function je(t,e){return t.length===0?"":`<div class="pid-row" data-pid-input="${e}">${t.map(n=>`<span class="pid-chip"><button class="pid-use" data-pid="${y(n)}">${y(n)}</button><button class="pid-x" data-pid-del="${y(n)}">×</button></span>`).join("")}</div>`}function qe(t,e,n){const{shadow:a}=t;a.querySelectorAll(".pid-row .pid-use").forEach(r=>r.addEventListener("click",()=>n(r.dataset.pid||""))),a.querySelectorAll(".pid-row .pid-x").forEach(r=>r.addEventListener("click",()=>{ct(r.dataset.pidDel||""),e()}))}function R(t,e={}){var w;const{shadow:n,getData:a}=t,r=a();if(!r)return;const i=W(),o=M[i],s=n.getElementById("screenDepAsk");if(!s)return;const u=G(r),d=(r.settings.deposit_quick_amounts??[]).map(c=>`<button class="q" data-dep-quick="${c}">${D(c)}</button>`).join("");e.keepAmount||(I.amount=0);const b=K(r);u?(I.playerId=b??"",b&&ce(t.apiBase,b)):b&&(I.playerId=b);const m=b||u?[]:Se();if(!b&&!u)for(const c of Ie(8)){if(m.length>=4)break;const _=(c.playerId??"").trim();_&&!m.includes(_)&&m.push(_)}const k=r.settings.deposit_howto_video_url||"";s.innerHTML=`
    <div class="backrow" id="depAskBack"><button class="backbtn" data-nav="home">←</button><h2>${o.intent_deposit}</h2></div>
    ${k?J(o.howto_dep_title,"",k):""}
    <div class="payout">
      <div class="payout-title">${o.depask_title}</div>
      <div class="amt-line" style="justify-content:flex-start;padding:0 2px 7px">
        <input id="depAmtInput" type="text" inputmode="numeric" placeholder="0" value="${e.keepAmount&&I.amount>0?D(I.amount):""}" style="width:130px;background:transparent;border:0;outline:0;color:var(--text-light);font:900 26px 'Inter',sans-serif" />
        <b>ETB</b>
      </div>
      ${d?`<div class="quick" style="margin:8px 0 4px">${d}</div>`:""}
      ${u?`<div style="margin-top:8px">${Me(o,b,"depPidRetry")}</div>`:`<div class="pid-note${b?" auto":""}" style="margin-top:8px">${b?o.pid_auto_label:o.pid_login_hint}</div>
      <input class="pf" id="depPidInput" type="text" autocomplete="off" placeholder="${o.player_id_ph}" value="${y(I.playerId)}" />
      ${je(m.slice(0,4),"depPidInput")}`}
    </div>
    <button class="bigcta" id="depGo" disabled>${o.depask_see_agents}</button>
  `;const f=n.getElementById("depAmtInput"),g=n.getElementById("depPidInput"),$=n.getElementById("depGo"),l=()=>{if(!f||!$)return;const c=f.value.replace(/[^0-9]/g,"");I.amount=parseInt(c||"0",10),c&&(f.value=D(I.amount)),u||(I.playerId=(g==null?void 0:g.value)??""),$.disabled=!(I.amount>0&&I.playerId.trim()!=="")};f==null||f.addEventListener("input",l),g==null||g.addEventListener("input",l),n.querySelectorAll("#screenDepAsk [data-dep-quick]").forEach(c=>c.addEventListener("click",()=>{f&&(f.value=D(parseInt(c.dataset.depQuick,10))),l()})),qe(t,()=>R(t),c=>{g&&(g.value=c),l()}),(w=n.getElementById("depPidRetry"))==null||w.addEventListener("click",()=>R(t,{keepAmount:!0})),Q(n),l(),$==null||$.addEventListener("click",()=>{if(I.amount>0&&I.playerId.trim()!==""){if(u){S(n,"deposit"),me(t,!0);return}lt(I.playerId),S(n,"deposit")}})}function me(t,e){const{shadow:n,getData:a,apiBase:r}=t,i=a();if(!i||!G(i))return;const o=M[W()],s=n.getElementById("liveGrid");if(!s)return;const u=K(i),d=I.playerId.trim();if(!e&&!u)return;if(!d||!u||u!==d){R(t),S(n,"depask");return}e&&(Y=[],pe=[],s.innerHTML=`<div class="empty-state"><h3>${o.pair_loading}</h3></div>`);const b=++ge;ze(r,{playerId:d,intent:"deposit"}).then(m=>{if(b===ge){if(!m.enabled){t.onPairDisabled();return}Y=De(m.agents,e?null:pe),pe=Y.map(k=>k.id),Oe(t)}}).catch(()=>{var m;b===ge&&(!e&&Y.length>0||(s.innerHTML=`
        <div class="empty-state">
          <div class="icon">!</div>
          <h3>${o.pair_error}</h3>
          <button class="pid-retry pair-retry" id="depPairRetry">${o.pid_retry}</button>
        </div>`,(m=n.getElementById("depPairRetry"))==null||m.addEventListener("click",()=>me(t,!0))))})}function Oe(t){const e=t.getData();if(!e)return;const n=W(),a=M[n],r=t.shadow.getElementById("liveGrid");if(!r)return;if(Y.length===0){r.innerHTML=`
      <div class="empty-state">
        <div class="icon">○</div>
        <h3>${a.no_agents_title}</h3>
        <p>${a.pair_none_desc}</p>
      </div>`;return}const i=fe(e)||e.settings.chat_prefilled_message||"";r.innerHTML=Y.map(o=>oe(o,i,n)).join("")}function Re(t,e){const n=t.getData();if(!n||!G(n))return;const a=t.shadow.querySelector(".screen.active");(a==null?void 0:a.id)==="screenDeposit"&&(e?me(t,!1):Oe(t))}function P(t){var Ke,Ve,Fe;const{shadow:e,getData:n}=t,a=n();if(!a)return;const r=W(),i=M[r],o=a.settings.withdrawal_min??200,s=a.settings.withdrawal_howto_video_url??"",u=e.getElementById("screenAmount");if(!u)return;const d=a.settings.withdrawal_require_payout_details!==!1,b=(a.settings.withdrawal_quick_amounts??[]).map(x=>`<button class="q" data-wq="${x}">${D(x)}</button>`).join(""),m=a.settings.withdrawal_bank_options??[],k=['<option value="">'+i.payout_bank_ph+"</option>"].concat(m.map(x=>`<option value="${y(x)}">${y(x)}</option>`)).join(""),f=G(a),g=K(a);f?(C=g??"",g&&ce(t.apiBase,g)):g&&(C=g);const $=d?Ie(4):[],l=$.map(x=>(x.playerId??"").trim()).filter(Boolean),w=f||g||$.length>=4?[]:Se().filter(x=>!l.includes(x)).slice(0,4-$.length),c=$.length?`<div class="payout-saved" id="payoutSaved">${$.map((x,U)=>`<div class="psug" data-sug="${U}"><button class="psug-x" data-del="${U}" aria-label="Delete">✕</button><span class="psug-name">${y(x.name)}</span><span class="psug-meta">${y(x.bank)} · ${y(x.account)}${x.playerId&&!f?" · ID "+y(x.playerId):""}</span></div>`).join("")}</div>`:"",_=f?Me(i,g,"wdPidRetry"):`<div class="pid-note${g?" auto":""}">${g?i.pid_auto_label:i.pid_login_hint}</div>
      <input class="pf" id="pfPlayerId" type="text" autocomplete="off" placeholder="${i.player_id_ph}" value="${y(C)}" />
      ${je(w,"pfPlayerId")}`,L=d?`
    <div class="payout">
      <div class="payout-title">${i.payout_title}</div>
      ${_}
      <input class="pf" id="pfName" type="text" autocomplete="off" placeholder="${i.payout_name_ph}" value="${y(z.name)}" />
      <select class="pf" id="pfBank">${k}</select>
      <input class="pf" id="pfAccount" type="text" inputmode="numeric" autocomplete="off" placeholder="${i.payout_account_ph}" value="${y(z.account)}" />
      ${c}
    </div>`:f?`<div class="payout">${_}</div>`:"";u.innerHTML=`
    <div class="backrow"><button class="backbtn" data-nav="home">←</button><h2>${i.withdraw_title}</h2></div>
    ${s?J(i.howto_wd_title,i.withdraw_howto_sub,s):""}
    ${L}
    <div class="amount-wrap">
      <label>${i.withdraw_amount_label}</label>
      <div class="amt-line">
        <input id="amtInput" type="text" inputmode="numeric" placeholder="0" />
        <b>ETB</b>
      </div>
      <div class="amt-hint" id="amtHint">${i.withdraw_min_prefix} ${D(o)} ETB</div>
    </div>
    ${b?`<div class="quick">${b}</div>`:""}
    <button class="bigcta" id="amtGo" disabled>${i.withdraw_see_agents}</button>
    <button class="ownagent" id="ownAgentBtn"><span class="ow">${i.withdraw_own_agent}<small>${i.withdraw_own_agent_desc}</small></span><span>→</span></button>
  `;const p=e.getElementById("amtInput"),v=e.getElementById("amtHint"),h=e.getElementById("amtGo"),A=e.getElementById("pfPlayerId"),T=e.getElementById("pfName"),E=e.getElementById("pfBank"),B=e.getElementById("pfAccount");E&&z.bank&&(E.value=z.bank);const j=()=>C.trim()===""?!1:d?z.name.trim()!==""&&z.bank.trim()!==""&&z.account.trim()!=="":!0,N=()=>{A&&(C=A.value),z={name:(T==null?void 0:T.value)??"",bank:(E==null?void 0:E.value)??"",account:(B==null?void 0:B.value)??""}},H=()=>{if(!p||!v||!h)return;const x=p.value.replace(/[^0-9]/g,"");O=parseInt(x||"0",10),x&&(p.value=D(O));const U=O>=o;O>0&&O<o?(v.textContent=`${i.withdraw_min_error} ${D(o)} ETB`,v.classList.add("err")):(v.textContent=`${i.withdraw_min_prefix} ${D(o)} ETB`,v.classList.remove("err")),h.disabled=!(U&&j())};p==null||p.addEventListener("input",H),e.querySelectorAll("#screenAmount [data-wq]").forEach(x=>x.addEventListener("click",()=>{p&&(p.value=D(parseInt(x.dataset.wq,10))),H()})),A==null||A.addEventListener("input",()=>{N(),H()}),T==null||T.addEventListener("input",()=>{N(),H()}),B==null||B.addEventListener("input",()=>{N(),H()}),E==null||E.addEventListener("change",()=>{N();const x=st(z.bank);x&&(T&&!T.value.trim()&&(T.value=x.name),B&&!B.value.trim()&&(B.value=x.account),N()),H()}),qe(t,()=>P(t),x=>{A&&(A.value=x),N(),H()}),(Ke=e.getElementById("wdPidRetry"))==null||Ke.addEventListener("click",()=>P(t)),e.querySelectorAll("#screenAmount .psug").forEach(x=>{x.addEventListener("click",U=>{const Lt=parseInt(x.dataset.sug,10),q=$[Lt];if(!q)return;if(U.target.closest("[data-del]")){U.stopPropagation(),ot(q.bank,q.account),P(t);return}T&&(T.value=q.name),E&&(E.value=q.bank),B&&(B.value=q.account),A&&q.playerId&&!g&&(A.value=q.playerId),N(),H()})}),h==null||h.addEventListener("click",()=>{O>=o&&j()&&(d&&rt({...z,playerId:C}),Ue(t,O),S(e,"results"))}),(Ve=e.getElementById("ownAgentBtn"))==null||Ve.addEventListener("click",()=>{const x=a.settings.withdrawal_redirect_path;X(e,he(x)),_e(x)}),(Fe=e.querySelector('#screenAmount [data-nav="home"]'))==null||Fe.addEventListener("click",()=>S(e,"home")),Q(e),H()}function Ne(t){try{if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(t);return}}catch{}try{const e=document.createElement("textarea");e.value=t,e.style.position="fixed",e.style.opacity="0",document.body.appendChild(e),e.select(),document.execCommand("copy"),document.body.removeChild(e)}catch{}}function he(t){const e=te(t);return`Opening the cashier withdrawals — pick <b>AgentEpos</b> and withdraw directly. <br><small>${y(e)}</small>`}function wt(t){const e=[...t];for(let n=e.length-1;n>0;n--){const a=Math.floor(Math.random()*(n+1));[e[n],e[a]]=[e[a],e[n]]}return e}function Ue(t,e){const{getData:n}=t,a=n();if(!a)return;if(G(a)){const m=K(a);if(!m||m!==C.trim()){P(t),S(t.shadow,"amount");return}const k=++ue;Z(t,e,[],!1,"loading"),ze(t.apiBase,{playerId:C.trim(),intent:"withdrawal",amount:e,bank:z.bank||void 0}).then(f=>{if(k!==ue)return;if(!f.enabled){t.onPairDisabled();return}const g=De(f.agents,null);Z(t,e,g,f.partial||g.length===0)}).catch(()=>{k===ue&&Z(t,e,[],!1,"error")});return}const r=m=>m.toLowerCase().replace(/[\s_-]+/g,""),i=r(z.bank),o=m=>i?(m.withdrawal_methods??[]).some(k=>r(k.display_name)===i||r(k.slug)===i):!0,s=a.agents.filter(m=>m.status==="live"&&m.accepts_withdrawals&&m.withdrawal_id&&o(m)),u=wt(s.filter(m=>(m.withdrawal_max??0)>=e));let d,b=!1;u.length>0?d=u:a.settings.withdrawal_no_match_behavior==="closest"?(b=!0,d=[...s].sort((m,k)=>(k.withdrawal_max??0)-(m.withdrawal_max??0)).slice(0,3)):(b=!0,d=[]),Z(t,e,d,b)}function Z(t,e,n,a,r="ready"){var g,$;const{shadow:i,getData:o}=t,s=o();if(!s)return;const u=W(),d=M[u],b=i.getElementById("screenResults");if(!b)return;const m=n.map(l=>{const w=(l.withdrawal_max??0)>=e,c=(l.withdrawal_methods||[]).map(L=>`<span class="bank">${y(L.display_name)}</span>`).join(""),_=w?d.results_withdraw_here:d.results_withdraw_partial;return`
        <div class="agent-card live">
          <div class="agent-top">
            <div class="agent-name-wrap"><div class="agent-avatar live">${re}</div><div class="agent-name">${d.agent}</div></div>
            <span class="cap-chip">${d.results_cap_prefix} ${D(l.withdrawal_max??0)} ETB</span>
          </div>
          <div class="waiting-text"><span class="typing-dots"><span></span><span></span><span></span></span>${d.results_ready}</div>
          <button class="idchip" data-copy-id="${y(l.withdrawal_id??"")}">${d.results_id_label}: <b>${y(l.withdrawal_id??"")}</b> ⧉</button>
          <div class="banks">${c}</div>
          <button class="deposit-btn gold" data-withdraw-here data-agent-id="${l.id}"><span>${_}</span><span>→</span></button>
        </div>`}).join(""),k=r==="loading"?`<div class="empty-state"><h3>${d.pair_loading}</h3></div>`:r==="error"?`<div class="empty-state"><div class="icon">!</div><h3>${d.pair_error}</h3><button class="pid-retry pair-retry" id="resPairRetry">${d.pid_retry}</button></div>`:m,f=s.settings.withdrawal_howto_video_url||"";b.innerHTML=`
    <div class="backrow"><button class="backbtn" data-nav="amount">←</button><h2>${d.results_title}</h2></div>
    ${f?J(d.howto_wd_title,"",f):""}
    <div class="res-head">
      <div><small>${d.results_withdrawing}</small><b>${D(e)} ETB</b></div>
      <button data-nav="amount">${d.results_change}</button>
    </div>
    <button class="ownagent" style="margin:0 0 15px" id="ownAgentBtn2"><span class="ow">${d.withdraw_own_agent}<small>${d.withdraw_own_agent_desc}</small></span><span>→</span></button>
    ${a?`<div class="nores"><h4>${d.results_none_title}</h4><p>${d.results_none_desc}</p></div>`:""}
    <div class="agent-grid" id="resList">${k}</div>
  `,i.querySelectorAll('#screenResults [data-nav="amount"]').forEach(l=>l.addEventListener("click",()=>S(i,"amount"))),(g=i.getElementById("resPairRetry"))==null||g.addEventListener("click",()=>Ue(t,e)),($=i.getElementById("ownAgentBtn2"))==null||$.addEventListener("click",()=>{const l=s.settings.withdrawal_redirect_path;X(i,he(l)),_e(l)}),i.querySelectorAll("#screenResults .idchip").forEach(l=>{l.addEventListener("click",()=>{const w=l.dataset.copyId??"";w&&(Ne(w),X(i,`${d.results_id_copied} <b>${y(w)}</b>`))})}),Q(i),i.querySelectorAll("#screenResults [data-withdraw-here]").forEach(l=>{l.addEventListener("click",()=>{const w=parseInt(l.dataset.agentId,10),c=n.find(L=>L.id===w);if(!c)return;const _=(c.withdrawal_max??0)>=e;t.trackClick(w,"withdrawal",{amount:e,source:_?"list":"partial"}),c.withdrawal_id&&Ne(c.withdrawal_id),X(i,`${d.results_id_copied} <b>${y(c.withdrawal_id??"")}</b> · `+he(s.settings.withdrawal_redirect_path)),at({agent:c,amount:e,messageTemplate:s.settings.withdrawal_message_with_amount,redirectPath:s.settings.withdrawal_redirect_path,payout:z,playerId:C})})})}function vt(t,e,n){const{shadow:a,getData:r}=t,i=r();if(!(!i||!(i.directory??[]).find(s=>s.id===e))){if(n==="withdrawal"){P(t),S(a,"amount");return}R(t),S(a,"depask")}}function xt(t,e){const n=t.getData();if(!n)return;const a=(n.directory??[]).find(r=>r.id===e);a&&(t.trackClick(e,"contact",{source:"recent"}),window.open(`https://telegram.me/${encodeURIComponent(a.telegram_username)}`,"_blank","noopener"))}function Q(t){t.querySelectorAll(".videobox").forEach(e=>{e.addEventListener("click",()=>{const n=e.dataset.video||"";if(!n||e.querySelector("iframe, video"))return;if(/(?:iframe|player)\.mediadelivery\.net\//i.test(n)){const r=n.includes("?")?"&":"?";e.innerHTML=`<iframe src="${y(n)}${r}autoplay=true" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe>`,e.style.cursor="default";return}if(/\.(mp4|webm|mov)(\?|#|$)/i.test(n)){e.innerHTML=`<video controls autoplay playsinline style="position:absolute;inset:0;width:100%;height:100%;background:#000" src="${y(n)}"></video>`,e.style.cursor="default";return}const a=He(n);a&&(e.innerHTML=`<iframe src="https://www.youtube-nocookie.com/embed/${a}?autoplay=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe>`,e.style.cursor="default")})})}function yt(t){const e=[...t];for(let n=e.length-1;n>0;n--){const a=Math.floor(Math.random()*(n+1));[e[n],e[a]]=[e[a],e[n]]}return e}const be="kemerbet_first_seen_at",_t=1440*60*1e3;function kt(){try{const t=localStorage.getItem(be);if(!t)return localStorage.setItem(be,String(Date.now())),!0;const e=parseInt(t,10);return isNaN(e)?(localStorage.setItem(be,String(Date.now())),!0):Date.now()-e<_t}catch{return!0}}function $t(t){if(!t)return null;const e=[/youtube\.com\/watch\?v=([\w\-_]+)/i,/youtube\.com\/embed\/([\w\-_]+)/i,/youtu\.be\/([\w\-_]+)/i];for(const n of e){const a=t.match(n);if(a)return a[1]}return null}function Ge(t,e){var w;const n=W(),a=M[n],r=e.getElementById("videoWrap");if(r){const c=t.settings.onboarding_video_url??"",_=$t(c);_!==null&&kt()?r.innerHTML=`
        <div class="kb-video-wrap">
          <iframe
            src="https://www.youtube.com/embed/${_}"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            title="How to Deposit"
          ></iframe>
        </div>
      `:r.innerHTML=""}const i=t.agents.filter(c=>c.status==="live"),o=t.agents.filter(c=>c.status==="recently_offline").sort((c,_)=>{const L=c.last_seen_at?new Date(c.last_seen_at).getTime():0;return(_.last_seen_at?new Date(_.last_seen_at).getTime():0)-L}),s=i.filter(c=>c.is_pinned),u=i.filter(c=>!c.is_pinned),d=[...s,...t.settings.shuffle_live_agents?yt(u):u],m=fe(t)||((w=t.settings)==null?void 0:w.chat_prefilled_message)||"Hi Kemerbet agent, I want to deposit";if(t.settings.pair_mode_enabled){const c=e.getElementById("liveCountText");c&&(c.textContent=t.agents_available?a.agents_online_plain:a.no_agents_online);const _=e.getElementById("liveCountInline");_&&(_.style.display="none");const L=e.getElementById("offlineWrap");L&&(L.style.display="none");return}const k=e.getElementById("liveCountText");k&&(k.textContent=i.length>0?`${i.length} ${a.agents_online}`:a.no_agents_online);const f=e.getElementById("liveCountInline");f&&(f.style.display="",f.textContent=`${i.length} ${a.live_count}`);const g=e.getElementById("liveGrid");g&&(i.length===0?g.innerHTML=`
        <div class="empty-state">
          <div class="icon">○</div>
          <h3>${a.no_agents_title}</h3>
          <p>${a.no_agents_desc}</p>
        </div>
      `:g.innerHTML=d.map(c=>oe(c,m,n)).join(""));const $=e.getElementById("offlineWrap"),l=e.getElementById("offlineGrid");$&&l&&(o.length>0?($.style.display="block",l.innerHTML=o.map(c=>oe(c,m,n)).join("")):$.style.display="none")}function It(t){const e=t.dataset.api;if(e)return e;const n=document.querySelectorAll('script[src*="embed.js"]'),a=n[n.length-1];if(a!=null&&a.src)try{return new URL(a.src).origin}catch{}return window.location.origin}function Ye(){var c,_,L;const t=document.getElementById("kemerbet-agents");if(!t)return;const e=It(t),n=t.attachShadow({mode:"open"}),a=document.createElement("style");a.textContent=Xe,n.appendChild(a);const r=W();t.setAttribute("lang",r);const i=document.createElement("div");i.innerHTML=Et(r),n.appendChild(i),Je(r,n,t),sessionStorage.getItem("kemerbet_visited")||(sessionStorage.setItem("kemerbet_visited","1"),fetch(`${e}/api/public/visit`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({referrer:document.referrer||null})}).catch(()=>{}));let o=null,s=null,u=null,d=null,b=null;function m(){const p=n.getElementById("refreshIndicator");p&&(p.classList.add("show"),setTimeout(()=>p.classList.remove("show"),1400))}function k(p,v){fetch(`${e}/api/public/agents/${p}/click`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({referrer:window.location.href,payment_methods:v&&v.length>0?v:null}),keepalive:!0}).catch(()=>{})}const f={shadow:n,apiBase:e,getData:()=>o,trackClick:(p,v,h)=>{ee(p,v),fetch(`${e}/api/public/agents/${p}/click`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({referrer:window.location.href,intent:v,amount:(h==null?void 0:h.amount)??null,source:(h==null?void 0:h.source)??null,payment_methods:h!=null&&h.paymentMethods&&h.paymentMethods.length>0?h.paymentMethods:null}),keepalive:!0}).catch(()=>{})},openOfflineModal:(p,v,h)=>{s=p,u=String(v),d=h,l()},onPairDisabled:()=>{g()}};async function g(){m();try{const p=await fetch(`${e}/api/public/agents`);if(!p.ok)throw new Error(`HTTP ${p.status}`);const v=await p.json();if(o=v,Ge(v,n),We(f),Q(n),v.settings.pair_mode_enabled){const h=ht(v);h&&ce(e,h),Re(f,!0)}}catch{console.warn("[kemerbet-agents] fetch failed, retrying in 60s")}}function $(){b=window.setTimeout(async()=>{document.hidden||await g(),document.hidden?b=null:$()},6e4)}document.addEventListener("visibilitychange",()=>{document.hidden?b!==null&&(clearTimeout(b),b=null):b===null&&(g(),$())});function l(){var p;(p=n.getElementById("offlineWarnModal"))==null||p.classList.add("show")}function w(){var p;(p=n.getElementById("offlineWarnModal"))==null||p.classList.remove("show"),s=null,u=null,d=null}(c=n.getElementById("confirmDepositBtn"))==null||c.addEventListener("click",()=>{u&&(k(u,d??void 0),ee(parseInt(u,10),"deposit")),s&&window.open(s,"_blank","noopener"),w()}),(_=n.getElementById("cancelWarnBtn"))==null||_.addEventListener("click",()=>{w()}),(L=n.getElementById("offlineWarnModal"))==null||L.addEventListener("click",p=>{p.target.id==="offlineWarnModal"&&w()}),document.addEventListener("keydown",p=>{if(p.key==="Escape"){const v=n.getElementById("offlineWarnModal");v!=null&&v.classList.contains("show")&&w()}}),n.addEventListener("click",p=>{const h=p.target.closest("#liveGrid [data-agent-id], #offlineGrid [data-agent-id]");if(!h)return;const A=h.dataset.agentId,T=JSON.parse(h.dataset.paymentMethods||"[]"),E=h.dataset.tgUser||"",B=o,j=B?fe(B):null;h.dataset.offline==="true"?(p.preventDefault(),s=j&&E?ne(E,j):h.dataset.depositUrl||null,u=A,d=T,l()):(j&&E&&(h.href=ne(E,j)),k(A,T),ee(parseInt(A,10),"deposit"))}),n.addEventListener("click",p=>{const v=p.target,h=v.closest("[data-intent-choice]");if(h){h.dataset.intentChoice==="withdraw"?(P(f),S(n,"amount")):(R(f),S(n,"depask"));return}if(v.closest('#screenDeposit [data-nav="home"]')){R(f),S(n,"depask");return}if(v.closest('#screenDepAsk [data-nav="home"]')){S(n,"home");return}const E=v.closest("[data-recent-main]");if(E){vt(f,parseInt(E.dataset.agentId,10),E.dataset.intent);return}const B=v.closest("[data-recent-contact]");if(B){xt(f,parseInt(B.dataset.agentId,10));return}}),n.querySelectorAll(".lang-btn").forEach(p=>{p.addEventListener("click",()=>{var h;const v=p.dataset.lang;Ze(v),Je(v,n,t),o&&(Ge(o,n),We(f),Re(f,!1),(h=n.getElementById("screenAmount"))!=null&&h.classList.contains("active")&&(P(f),S(n,"amount")))})}),g(),$()}function Je(t,e,n){const a=M[t];n.setAttribute("lang",t),e.querySelectorAll("[data-i18n]").forEach(r=>{const i=r.dataset.i18n;a[i]!==void 0&&(r.textContent=a[i])}),e.querySelectorAll(".lang-btn").forEach(r=>{const i=r;i.classList.toggle("active",i.dataset.lang===t)})}function Et(t){const e=M[t];return`
    <div class="refresh-indicator" id="refreshIndicator">
      <div class="spinner"></div>
      <span data-i18n="updating">${e.updating}</span>
    </div>

    <div class="modal-backdrop" id="offlineWarnModal">
      <div class="modal-warn">
        <div class="icon-wrap">⚠️</div>
        <h3 data-i18n="warn_title">${e.warn_title}</h3>
        <p data-i18n="warn_desc">${e.warn_desc}</p>
        <div class="modal-actions">
          <button class="modal-btn cancel" id="cancelWarnBtn" data-i18n="cancel">${e.cancel}</button>
          <button class="modal-btn confirm" id="confirmDepositBtn" data-i18n="continue">${e.continue}</button>
        </div>
      </div>
    </div>

    <div class="agents-wrapper">
      <div class="topbar">
        <div class="lang-switcher" role="group" aria-label="Language">
          <button class="lang-btn${t==="am"?" active":""}" data-lang="am">አማ</button>
          <button class="lang-btn${t==="en"?" active":""}" data-lang="en">EN</button>
        </div>
      </div>

      <!-- ============ HOME ============ -->
      <div class="screen active" id="screenHome">
        <div class="header">
          <div class="header-logo">
            <span class="live-indicator"></span>
            <span id="liveCountText">${e.loading}</span>
          </div>
          <h1 data-i18n="title">${e.title}</h1>
          <p data-i18n="subtitle">${e.subtitle}</p>
        </div>

        <!-- player notice board (admin-managed) -->
        <div id="noticeWrap"></div>
        <div id="howtoWrap"></div>

        <!-- intent choice -->
        <div class="section-title"><h2 id="intentQuestion">${e.intent_question}</h2></div>
        <div class="intent">
          <button class="intent-card dep" data-intent-choice="deposit">
            <span class="ic">💰</span>
            <b>${e.intent_deposit}</b>
            <span>${e.intent_deposit_desc}</span>
          </button>
          <button class="intent-card wdr" data-intent-choice="withdraw">
            <span class="ic">🏧</span>
            <b>${e.intent_withdraw}</b>
            <span>${e.intent_withdraw_desc}</span>
          </button>
        </div>

        <!-- recents -->
        <div id="recentsWrap" style="display:none">
          <div class="section-title" style="margin-top:22px"><h2>${e.recents_title}</h2><span>${e.recents_only_you}</span></div>
          <div class="recents" id="recentsGrid"></div>
        </div>
      </div>

      <!-- ============ DEPOSIT (own screen) ============ -->
      <div class="screen" id="screenDepAsk"></div>

      <div class="screen" id="screenDeposit">
        <div class="backrow"><button class="backbtn" data-nav="home">←</button><h2>${e.intent_deposit}</h2></div>

        <div id="noticeWrapDep"></div>
        <div id="depHowtoWrap"></div>
        <div id="videoWrap"></div>

        <div class="section-title">
          <h2 data-i18n="live_now">${e.live_now}</h2>
          <div class="agent-count" id="liveCountInline">—</div>
        </div>

        <div class="agent-grid" id="liveGrid">
          <div class="empty-state"><h3 data-i18n="loading">${e.loading}</h3></div>
        </div>

        <div id="offlineWrap" style="display:none">
          <div class="offline-divider" data-i18n="recently_online">${e.recently_online}</div>
          <div class="agent-grid" id="offlineGrid"></div>
        </div>
      </div>

      <!-- ============ AMOUNT ============ -->
      <div class="screen" id="screenAmount"></div>

      <!-- ============ RESULTS ============ -->
      <div class="screen" id="screenResults"></div>
    </div>
  `}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",Ye):Ye()})();
