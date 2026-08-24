(function(){"use strict";const he=`
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
`,M={am:{title:"Kemerbet ኤጀንቶች",subtitle:"ኦንላይን ያሉ ኤጀንቶች ቅድሚያ ይታያሉ። ዲፖዚት ለማድረግ ይምረጡ።",live_now:"አሁን ኦንላይን",recently_online:"በቅርብ ጊዜ ኦንላይን የነበሩ",agents_online:"ኤጀንቶች ኦንላይን ናቸው",no_agents_online:"ምንም ኤጀንት ኦንላይን የለም",live_label:"ኦንላይን",offline_label:"ኦፍላይን",truly_online:"ትክክለኛ ኦንላይን ያሉ",last_seen:"መጨረሻ የታየው",just_now:"አሁን",min_ago_suffix:"ደቂቃ በፊት",hour_unit:"ሰዓት",day_unit:"ቀን",ago:"በፊት",deposit:"ዲፖዚት",agent:"ኤጀንት",live_count:"ኦንላይን",no_agents_title:"ምንም ኤጀንት አሁን ኦንላይን የለም",no_agents_desc:"ከታች በቅርብ ጊዜ ኦንላይን የነበሩ ኤጀንቶችን ይመልከቱ።",loading:"በመጫን ላይ…",updating:"እያዘመነ ነው",warn_title:"ይህ ኤጀንት ኦፍላይን ሊሆን ይችላል",warn_desc:"ኤጀንቱ ለተወሰነ ጊዜ ኦንላይን አልነበረም እና በፍጥነት ላይመልስልዎ ይችላል። መቀጠል ይፈልጋሉ?",cancel:"ይቅር",continue:"ቀጥል",intent_question:"ምን ማድረግ ይፈልጋሉ?",intent_deposit:"ዲፖዚት",intent_deposit_desc:"ኦንላይን ያሉ ኤጀንቶችን አይተው ገንዘብ ያስገቡ",intent_withdraw:"ማውጣት",intent_withdraw_desc:"መጠን ያስገቡ → የሚከፍሉ ኤጀንቶች ይታያሉ",withdraw_title:"ማውጣት",withdraw_amount_label:"ምን ያህል ማውጣት ይፈልጋሉ?",withdraw_min_prefix:"ዝቅተኛ",withdraw_min_error:"ዝቅተኛው መጠን",withdraw_see_agents:"ይህን መጠን የሚከፍሉ ኤጀንቶችን ይመልከቱ",withdraw_own_agent:"የራሴ ኤጀንት",withdraw_own_agent_desc:"በቀጥታ በሳይቱ ላይ ያውጡ",withdraw_note:"የገንዘብ መጠንዎን የሚሸፍኑ ኤጀንቶችን ብቻ እናሳያለን። የቴሌግራም መልእክትዎ ከመጠኑ እና ከኤጀንቱ የማውጫ መለያ ጋር ዝግጁ ሆኖ ይመጣል።",withdraw_howto:"ማውጣት እንዴት እንደሚሰራ",withdraw_howto_sub:"ቪዲዮ",results_title:"ለመጠንዎ ኤጀንቶች",results_withdrawing:"በማውጣት ላይ",results_change:"ቀይር",results_cap_prefix:"እስከ",results_ready:"ኦንላይን · ለመክፈል ዝግጁ",results_withdraw_here:"እዚህ ያውጡ",results_withdraw_partial:"በከፊል ያውጡ",results_none_title:"አሁን ይህን ሙሉ መጠን የሚከፍል ኤጀንት የለም",results_none_desc:"እነዚህ በጣም ቅርብ ናቸው — መጠኑን መከፋፈል፣ ትንሽ መጠን መምረጥ ወይም ቆይተው መመለስ ይችላሉ።",recents_title:"የቅርብ ጊዜ ኤጀንቶችዎ",recents_only_you:"እርስዎ ብቻ ያዩታል",recents_contact:"አግኝ",recents_online:"ኦንላይን",recents_offline:"ኦፍላይን",back:"ተመለስ",payout_title:"ገንዘቡ የሚላክበት መረጃ",payout_name_ph:"ሙሉ ስም",payout_bank_ph:"ባንክ ይምረጡ",payout_account_ph:"የሂሳብ ቁጥር",payout_note:"ይህ መረጃ ለኤጀንቱ በቴሌግራም መልእክት ውስጥ ይላካል። በመሳሪያዎ ላይ ብቻ ይቀመጣል።",depask_title:"ምን ያህል ማስገባት ይፈልጋሉ?",depask_see_agents:"ዝግጁ ኤጀንቶችን ይመልከቱ",player_id_ph:"የተጫዋች መለያ (Player ID)",results_id_label:"የመውጫ መለያ",results_id_copied:"መለያው ተቀድቷል:"},en:{title:"Kemerbet Agents",subtitle:"Live agents are shown first. Tap to deposit.",live_now:"Live Now",recently_online:"Recently online",agents_online:"agents online",no_agents_online:"No agents online",live_label:"Live",offline_label:"Offline",truly_online:"Truly online",last_seen:"Last seen",just_now:"just now",min_ago_suffix:"min ago",hour_unit:"h",day_unit:"d",ago:"ago",deposit:"Deposit",agent:"Agent",live_count:"live",no_agents_title:"No agents live right now",no_agents_desc:"Check below for recently online agents.",loading:"Loading agents…",updating:"Updating",warn_title:"This agent may be offline",warn_desc:"The agent has not been online for a while and may not respond quickly. Do you want to continue?",cancel:"Cancel",continue:"Continue",intent_question:"What do you want to do?",intent_deposit:"Deposit",intent_deposit_desc:"See all online agents and send money",intent_withdraw:"Withdraw",intent_withdraw_desc:"Enter amount → matched to agents who can pay it",withdraw_title:"Withdraw",withdraw_amount_label:"How much do you want to withdraw?",withdraw_min_prefix:"Minimum",withdraw_min_error:"Minimum is",withdraw_see_agents:"See agents who can pay this",withdraw_own_agent:"My own agent",withdraw_own_agent_desc:"withdraw directly on the site",withdraw_note:"We only show agents whose cash covers your amount, so you don't waste time asking. Your Telegram message comes ready with the amount and the agent's Withdrawal ID.",withdraw_howto:"How withdrawal works",withdraw_howto_sub:"Video",results_title:"Agents for your amount",results_withdrawing:"Withdrawing",results_change:"Change",results_cap_prefix:"Up to",results_ready:"Online · ready to pay",results_withdraw_here:"Withdraw here",results_withdraw_partial:"Withdraw partial",results_none_title:"No agent can pay this full amount right now",results_none_desc:"These agents are closest — split your withdrawal, choose a smaller amount, or check back soon.",recents_title:"Your recent agents",recents_only_you:"only you see this",recents_contact:"Contact",recents_online:"Online",recents_offline:"Offline",back:"Back",payout_title:"Where should the agent send the money?",payout_name_ph:"Full name",payout_bank_ph:"Select bank",payout_account_ph:"Account number",payout_note:"This is included in your Telegram message to the agent. Saved only on your device.",depask_title:"How much will you deposit?",depask_see_agents:"See available agents",player_id_ph:"Player ID",results_id_label:"Withdrawal ID",results_id_copied:"ID copied:"}},F="kemerbet_lang";function D(){try{const n=localStorage.getItem(F);if(n==="am"||n==="en")return n}catch{}return"am"}function we(n){try{localStorage.setItem(F,n)}catch{}}const xe={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"};function b(n){return String(n).replace(/[&<>"']/g,e=>xe[e])}function ve(n){const e=[...n];for(let t=e.length-1;t>0;t--){const a=Math.floor(Math.random()*(t+1));[e[t],e[a]]=[e[a],e[t]]}return e}function ye(n,e){const t=M[e],a=Math.max(0,Math.floor((Date.now()-new Date(n).getTime())/1e3));if(a<60)return`${t.last_seen} ${t.just_now}`;const o=Math.floor(a/60);if(o<60)return`${t.last_seen} ${o} ${t.min_ago_suffix}`;const r=Math.floor(o/60),i=o%60;if(r<24)return e==="am"?i>0?`${t.last_seen} ${r} ${t.hour_unit} ${i} ደቂቃ ${t.ago}`:`${t.last_seen} ${r} ${t.hour_unit} ${t.ago}`:i>0?`${t.last_seen} ${r}${t.hour_unit} ${i}m ${t.ago}`:`${t.last_seen} ${r}${t.hour_unit} ${t.ago}`;const l=Math.floor(r/24);return e==="am"?`${t.last_seen} ${l} ${t.day_unit} ${t.ago}`:`${t.last_seen} ${l}${t.day_unit} ${t.ago}`}const U="kemerbet_first_seen_at",_e=1440*60*1e3;function ke(){try{const n=localStorage.getItem(U);if(!n)return localStorage.setItem(U,String(Date.now())),!0;const e=parseInt(n,10);return isNaN(e)?(localStorage.setItem(U,String(Date.now())),!0):Date.now()-e<_e}catch{return!0}}function $e(n){if(!n)return null;const e=[/youtube\.com\/watch\?v=([\w\-_]+)/i,/youtube\.com\/embed\/([\w\-_]+)/i,/youtu\.be\/([\w\-_]+)/i];for(const t of e){const a=n.match(t);if(a)return a[1]}return null}function X(n,e,t){const a=M[t],o=n.status==="live",r=b(n.telegram_username),i=encodeURIComponent(e),l=`https://telegram.me/${r}?text=${i}`,c=String(n.display_number).padStart(2,"0"),m=(n.payment_methods||[]).map(h=>h.slug),v=b(JSON.stringify(m)),$=(n.payment_methods||[]).map(h=>`<span class="bank">${b(h.display_name)}</span>`).join(""),f=o?`<div class="waiting-text">
         <span class="typing-dots"><span></span><span></span><span></span></span>
         ${a.truly_online}
       </div>`:`<div class="last-seen">⏱ ${n.last_seen_at?ye(n.last_seen_at,t):""}</div>`,y=o?`<div class="badge live">${a.live_label}</div>`:`<div class="badge offline">${a.offline_label}</div>`,x=o?`<a href="${l}" class="deposit-btn" target="_blank" rel="noopener" data-agent-id="${n.id}" data-tg-user="${r}" data-payment-methods="${v}">
         <span>${a.deposit}</span>
         <span class="arrow">→</span>
       </a>`:`<button class="deposit-btn" data-agent-id="${n.id}" data-tg-user="${r}" data-deposit-url="${b(l)}" data-offline="true" data-payment-methods="${v}">
         <span>${a.deposit}</span>
         <span class="arrow">→</span>
       </button>`;return`
    <div class="agent-card ${o?"live":"offline"}">
      <div class="agent-top">
        <div class="agent-name-wrap">
          <div class="agent-avatar">${c}</div>
          <div>
            <div class="agent-name">${a.agent} ${b(String(n.display_number))}</div>
          </div>
        </div>
        ${y}
      </div>
      ${f}
      <div class="banks">${$}</div>
      ${x}
    </div>
  `}function Q(n,e){var I;const t=D(),a=M[t],o=e.getElementById("videoWrap");if(o){const s=n.settings.onboarding_video_url??"",g=$e(s);g!==null&&ke()?o.innerHTML=`
        <div class="kb-video-wrap">
          <iframe
            src="https://www.youtube.com/embed/${g}"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            title="How to Deposit"
          ></iframe>
        </div>
      `:o.innerHTML=""}const r=n.agents.filter(s=>s.status==="live"),i=n.agents.filter(s=>s.status==="recently_offline").sort((s,g)=>{const w=s.last_seen_at?new Date(s.last_seen_at).getTime():0;return(g.last_seen_at?new Date(g.last_seen_at).getTime():0)-w}),l=r.filter(s=>s.is_pinned),c=r.filter(s=>!s.is_pinned),m=[...l,...n.settings.shuffle_live_agents?ve(c):c],v=((I=n.settings)==null?void 0:I.chat_prefilled_message)||"Hi Kemerbet agent, I want to deposit",$=e.getElementById("liveCountText");$&&($.textContent=r.length>0?`${r.length} ${a.agents_online}`:a.no_agents_online);const f=e.getElementById("liveCountInline");f&&(f.textContent=`${r.length} ${a.live_count}`);const y=e.getElementById("liveGrid");y&&(r.length===0?y.innerHTML=`
        <div class="empty-state">
          <div class="icon">○</div>
          <h3>${a.no_agents_title}</h3>
          <p>${a.no_agents_desc}</p>
        </div>
      `:y.innerHTML=m.map(s=>X(s,v,t)).join(""));const x=e.getElementById("offlineWrap"),h=e.getElementById("offlineGrid");x&&h&&(i.length>0?(x.style.display="block",h.innerHTML=i.map(s=>X(s,v,t)).join("")):x.style.display="none")}const Z="kemerbet_recent_agents",Ie=20;function ee(){try{const n=localStorage.getItem(Z);if(!n)return[];const e=JSON.parse(n);return Array.isArray(e)?e.filter(t=>t&&typeof t.agent_id=="number"&&typeof t.ts=="number"):[]}catch{return[]}}function Ee(n){try{localStorage.setItem(Z,JSON.stringify(n.slice(0,Ie)))}catch{}}function Y(n,e){const t=ee().filter(a=>a.agent_id!==n);t.unshift({agent_id:n,intent:e,ts:Date.now()}),Ee(t)}function Le(n,e){const t=new Map(n.map(o=>[o.id,o])),a=[];for(const o of ee().sort((r,i)=>i.ts-r.ts)){const r=t.get(o.agent_id);if(r&&(a.push({entry:o,agent:r}),a.length>=e))break}return a}function G(n){const e=window.location.origin;let t=n||"/sport/popup/withdrawal";if(/^https?:\/\//i.test(t))try{const a=new URL(t);t=a.pathname+a.search+a.hash}catch{t="/sport/popup/withdrawal"}return t.startsWith("/")||(t="/"+t),e+t}function te(n,e){var i,l,c;const t=e.withdrawal_id??"",a=((i=e.payout)==null?void 0:i.account)??"",o=(e.player_id??"").trim();return n.replace(/\{amount\}/g,e.amount!=null?e.amount.toLocaleString("en-US"):"").replace(/\{withdrawal_id\}/g,t?"`"+t+"`":"").replace(/\{name\}/g,((l=e.payout)==null?void 0:l.name)??"").replace(/\{bank\}/g,((c=e.payout)==null?void 0:c.bank)??"").replace(/\{account\}/g,a?"`"+a+"`":"").replace(/\{player_id\}/g,o?"`"+o+"`":"").split(`
`).filter(m=>!/^[^:\n]{0,40}:\s*$/.test(m.trim())||m.trim()==="").join(`
`).replace(/\n{3,}/g,`

`).trim()}function O(n,e){return`https://telegram.me/${encodeURIComponent(n)}?text=${encodeURIComponent(e)}`}function Se(n){const e=te(n.messageTemplate,{amount:n.amount,withdrawal_id:n.agent.withdrawal_id??"",payout:n.payout??null,player_id:n.playerId??null}),t=O(n.agent.telegram_username,e),a=G(n.redirectPath);window.open(t,"_blank","noopener"),window.location.href=a}function ne(n){window.location.href=G(n)}const ae="kemerbet_payout_accounts",Te=4;function P(){try{const n=localStorage.getItem(ae);if(!n)return[];const e=JSON.parse(n);return Array.isArray(e)?e.filter(t=>t&&typeof t.name=="string"&&typeof t.bank=="string"&&typeof t.account=="string"):[]}catch{return[]}}function re(n){try{localStorage.setItem(ae,JSON.stringify(n.slice(0,Te)))}catch{}}function ze(n){const e=n.name.trim(),t=n.bank.trim(),a=n.account.trim();if(!e||!t||!a)return;const o=P().filter(r=>!(r.bank===t&&r.account===a));o.unshift({name:e,bank:t,account:a,ts:Date.now()}),re(o)}function Be(n,e){const t=n.trim(),a=e.trim();re(P().filter(o=>!(o.bank===t&&o.account===a)))}function Ae(n){const e=n.trim();if(!e)return null;const t=P().filter(a=>a.bank===e).sort((a,o)=>o.ts-a.ts)[0];return t?{name:t.name,bank:t.bank,account:t.account}:null}function Me(n){return P().sort((e,t)=>t.ts-e.ts).slice(0,n).map(e=>({name:e.name,bank:e.bank,account:e.account}))}const ie="kemerbet_player_ids",J=4,Ce=12;function K(){try{const n=localStorage.getItem(ie);if(!n)return[];const e=JSON.parse(n);return Array.isArray(e)?e.filter(t=>t&&typeof t.id=="string"&&t.id!==""):[]}catch{return[]}}function oe(n){try{const e=[...n].sort((t,a)=>Math.max(a.depTs??0,a.wdTs??0)-Math.max(t.depTs??0,t.wdTs??0));localStorage.setItem(ie,JSON.stringify(e.slice(0,Ce)))}catch{}}function se(n,e){const t=n.trim();if(!t)return;const a=K(),o=a.find(i=>i.id===t),r=o??{id:t};e==="deposit"?r.depTs=Date.now():r.wdTs=Date.now(),o||a.unshift(r),oe(a)}function De(n){oe(K().filter(e=>e.id!==n))}function We(n){const e=K(),t=i=>(n==="deposit"?i.depTs:i.wdTs)??0,a=i=>(n==="deposit"?i.wdTs:i.depTs)??0,r=e.filter(i=>t(i)>0).sort((i,l)=>t(l)-t(i)).slice(0,J).map(i=>i.id);if(r.length<J){const i=e.filter(l=>t(l)===0&&a(l)>0).sort((l,c)=>a(c)-a(l));for(const l of i){if(r.length>=J)break;r.includes(l.id)||r.push(l.id)}}return r}let C=0,z={name:"",bank:"",account:""},q="",E={amount:0,playerId:""},de=!1,le=!1;function He(){try{if(window.location.hash.toLowerCase()==="#withdraw")return!0;const n=new URLSearchParams(window.location.search);return n.get("withdraw")==="1"||n.get("intent")==="withdraw"}catch{return!1}}function A(n){return n.toLocaleString("en-US")}function S(n,e){var a;["Home","DepAsk","Deposit","Amount","Results"].forEach(o=>{const r=n.getElementById("screen"+o);r&&r.classList.toggle("active",o.toLowerCase()===e)});const t=e==="depask"?"screenDepAsk":"screen"+e.charAt(0).toUpperCase()+e.slice(1);(a=n.getElementById(t))==null||a.scrollIntoView({block:"nearest"})}function ce(n){if(!n)return null;const e=[/youtube\.com\/watch\?v=([\w\-_]+)/i,/youtube\.com\/embed\/([\w\-_]+)/i,/youtu\.be\/([\w\-_]+)/i];for(const t of e){const a=n.match(t);if(a)return a[1]}return null}function je(n,e){return`
    <div class="videobox" data-video="${b(e)}">
      <div class="vplay">▶</div>
      <b>${n.withdraw_howto}</b>
      <small>${n.withdraw_howto_sub}</small>
    </div>`}function R(n,e){let t=n.getElementById("wToast");t||(t=document.createElement("div"),t.id="wToast",t.className="wtoast",n.appendChild(t)),t.innerHTML=e,t.classList.add("show"),window.setTimeout(()=>t&&t.classList.remove("show"),4500)}function pe(n){const{shadow:e,getData:t}=n,a=t();if(!a)return;const o=D(),r=M[o],i=a.settings.withdrawals_enabled!==!1,l=e.querySelector("#screenDeposit .backrow");if(i)l&&(l.style.display="");else{l&&(l.style.display="none");const x=e.querySelector(".screen.active");(!x||x.id==="screenHome")&&(N(n),S(e,"depask"))}i&&!de&&He()&&(de=!0,W(n),S(e,"amount")),le||(le=!0,window.addEventListener("hashchange",()=>{const x=n.getData();x&&x.settings.withdrawals_enabled!==!1&&window.location.hash.toLowerCase()==="#withdraw"&&(W(n),S(n.shadow,"amount"))}));const c=e.getElementById("noticeWrap"),m=e.getElementById("noticeWrapDep"),v=i?c:m,$=i?m:c;if($&&($.innerHTML=""),v){const x=a.notices??[];x.length===0?v.innerHTML="":v.innerHTML=x.map(h=>{const s=(h.video_url?ce(h.video_url):null)?`<div class="videobox nb-video" data-video="${b(h.video_url??"")}"><div class="vplay">▶</div><b>${r.withdraw_howto}</b></div>`:"";return`
            <div class="notice">
              <div class="nb-tag">${h.priority==="urgent"?"📣":"📌"} ${b(h.title||"")}</div>
              <p>${b(h.body)}</p>
              ${s}
            </div>`}).join("")}const f=e.getElementById("recentsWrap");if(f)if(a.settings.recents_enabled){const x=Le(a.directory??[],a.settings.recents_count??5);if(x.length===0)f.style.display="none";else{f.style.display="block";const h=x.map(s=>{const g=s.agent,w=String(g.display_number).padStart(2,"0"),k=g.online,d=k?r.recents_online:r.recents_offline,u=s.entry.intent==="withdrawal",p=u?r.intent_withdraw:r.deposit,L=k?u?"wdr":"dep":"grey";return`
              <div class="recent${k?"":" is-off"}">
                <div class="agent-avatar ${k?"live":"off"}">${w}</div>
                <div class="rc-mid">
                  <div class="rc-name">${r.agent} ${b(String(g.display_number))}</div>
                  <div class="rc-sub">${d}</div>
                </div>
                <div class="rc-btns">
                  <button class="btn-s ${L}" data-recent-main data-agent-id="${g.id}" data-intent="${s.entry.intent}">${p}</button>
                  <button class="btn-s line" data-recent-contact data-agent-id="${g.id}">${r.recents_contact}</button>
                </div>
              </div>`}).join(""),I=e.getElementById("recentsGrid");I&&(I.innerHTML=h)}}else f.style.display="none";const y=e.getElementById("intentQuestion");y&&(y.textContent=r.intent_question)}function qe(n){if(!E.playerId.trim()||E.amount<=0)return null;const e=n.settings.deposit_message||"Hi Kemerbet agent, I want to deposit {amount} ETB. My Player ID: {player_id}";return te(e,{amount:E.amount,player_id:E.playerId})}function ge(n,e){const t=We(n);return t.length===0?"":`<div class="pid-row" data-pid-ctx="${n}" data-pid-input="${e}">${t.map(a=>`<span class="pid-chip"><button class="pid-use" data-pid="${b(a)}">${b(a)}</button><button class="pid-x" data-pid-del="${b(a)}">×</button></span>`).join("")}</div>`}function Oe(n,e,t){const{shadow:a}=n;a.querySelectorAll(".pid-row .pid-use").forEach(o=>o.addEventListener("click",()=>t(o.dataset.pid||""))),a.querySelectorAll(".pid-row .pid-x").forEach(o=>o.addEventListener("click",()=>{De(o.dataset.pidDel||""),e()}))}function N(n){const{shadow:e,getData:t}=n,a=t();if(!a)return;const o=D(),r=M[o],i=e.getElementById("screenDepAsk");if(!i)return;const l=(a.settings.deposit_quick_amounts??[]).map(f=>`<button class="q" data-dep-quick="${f}">${A(f)}</button>`).join("");i.innerHTML=`
    <div class="backrow" id="depAskBack"><button class="backbtn" data-nav="home">←</button><h2>${r.intent_deposit}</h2></div>
    <div class="payout">
      <div class="payout-title">${r.depask_title}</div>
      <div class="amt-line" style="justify-content:flex-start;padding:0 2px 7px">
        <input id="depAmtInput" type="text" inputmode="numeric" placeholder="0" style="width:130px;background:transparent;border:0;outline:0;color:var(--text-light);font:900 26px 'Inter',sans-serif" />
        <b>ETB</b>
      </div>
      ${l?`<div class="quick" style="margin:8px 0 4px">${l}</div>`:""}
      <input class="pf" id="depPidInput" type="text" autocomplete="off" placeholder="${r.player_id_ph}" value="${b(E.playerId)}" style="margin-top:8px" />
      ${ge("deposit","depPidInput")}
    </div>
    <button class="bigcta" id="depGo" disabled>${r.depask_see_agents}</button>
  `;const c=e.getElementById("depAmtInput"),m=e.getElementById("depPidInput"),v=e.getElementById("depGo");c&&E.amount>0&&(c.value=A(E.amount));const $=()=>{if(!c||!v)return;const f=c.value.replace(/[^0-9]/g,"");E.amount=parseInt(f||"0",10),f&&(c.value=A(E.amount)),E.playerId=(m==null?void 0:m.value)??"",v.disabled=!(E.amount>0&&E.playerId.trim()!=="")};c==null||c.addEventListener("input",$),m==null||m.addEventListener("input",$),e.querySelectorAll("#screenDepAsk [data-dep-quick]").forEach(f=>f.addEventListener("click",()=>{c&&(c.value=A(parseInt(f.dataset.depQuick,10))),$()})),Oe(n,()=>N(n),f=>{m&&(m.value=f),$()}),$(),v==null||v.addEventListener("click",()=>{E.amount>0&&E.playerId.trim()!==""&&(se(E.playerId,"deposit"),S(e,"deposit"))})}function W(n){var H,B;const{shadow:e,getData:t}=n,a=t();if(!a)return;const o=D(),r=M[o],i=a.settings.withdrawal_min??200,l=a.settings.withdrawal_howto_video_url??"",c=e.getElementById("screenAmount");if(!c)return;const m=a.settings.withdrawal_require_payout_details!==!1,v=a.settings.withdrawal_bank_options??[],$=['<option value="">'+r.payout_bank_ph+"</option>"].concat(v.map(_=>`<option value="${b(_)}">${b(_)}</option>`)).join(""),f=m?Me(4):[],y=f.length?`<div class="payout-saved" id="payoutSaved">${f.map((_,T)=>`<div class="psug" data-sug="${T}"><button class="psug-x" data-del="${T}" aria-label="Delete">✕</button><span class="psug-name">${b(_.name)}</span><span class="psug-meta">${b(_.bank)} · ${b(_.account)}</span></div>`).join("")}</div>`:"",x=m?`
    <div class="payout">
      <div class="payout-title">${r.payout_title}</div>
      <input class="pf" id="pfPlayerId" type="text" autocomplete="off" placeholder="${r.player_id_ph}" value="${b(q)}" />
      ${ge("withdrawal","pfPlayerId")}
      <input class="pf" id="pfName" type="text" autocomplete="off" placeholder="${r.payout_name_ph}" value="${b(z.name)}" />
      <select class="pf" id="pfBank">${$}</select>
      <input class="pf" id="pfAccount" type="text" inputmode="numeric" autocomplete="off" placeholder="${r.payout_account_ph}" value="${b(z.account)}" />
      ${y}
    </div>`:"";c.innerHTML=`
    <div class="backrow"><button class="backbtn" data-nav="home">←</button><h2>${r.withdraw_title}</h2></div>
    ${l?je(r,l):""}
    ${x}
    <div class="amount-wrap">
      <label>${r.withdraw_amount_label}</label>
      <div class="amt-line">
        <input id="amtInput" type="text" inputmode="numeric" placeholder="0" />
        <b>ETB</b>
      </div>
      <div class="amt-hint" id="amtHint">${r.withdraw_min_prefix} ${A(i)} ETB</div>
    </div>
    <button class="bigcta" id="amtGo" disabled>${r.withdraw_see_agents}</button>
    <button class="ownagent" id="ownAgentBtn"><span class="ow">${r.withdraw_own_agent}<small>${r.withdraw_own_agent_desc}</small></span><span>→</span></button>
  `;const h=e.getElementById("amtInput"),I=e.getElementById("amtHint"),s=e.getElementById("amtGo"),g=e.getElementById("pfPlayerId"),w=e.getElementById("pfName"),k=e.getElementById("pfBank"),d=e.getElementById("pfAccount");k&&z.bank&&(k.value=z.bank);const u=()=>q.trim()===""?!1:m?z.name.trim()!==""&&z.bank.trim()!==""&&z.account.trim()!=="":!0,p=()=>{q=(g==null?void 0:g.value)??"",z={name:(w==null?void 0:w.value)??"",bank:(k==null?void 0:k.value)??"",account:(d==null?void 0:d.value)??""}},L=()=>{if(!h||!I||!s)return;const _=h.value.replace(/[^0-9]/g,"");C=parseInt(_||"0",10),_&&(h.value=A(C));const T=C>=i;C>0&&C<i?(I.textContent=`${r.withdraw_min_error} ${A(i)} ETB`,I.classList.add("err")):(I.textContent=`${r.withdraw_min_prefix} ${A(i)} ETB`,I.classList.remove("err")),s.disabled=!(T&&u())};h==null||h.addEventListener("input",L),g==null||g.addEventListener("input",()=>{p(),L()}),w==null||w.addEventListener("input",()=>{p(),L()}),d==null||d.addEventListener("input",()=>{p(),L()}),k==null||k.addEventListener("change",()=>{p();const _=Ae(z.bank);_&&(w&&!w.value.trim()&&(w.value=_.name),d&&!d.value.trim()&&(d.value=_.account),p()),L()}),e.querySelectorAll("#screenAmount .psug").forEach(_=>{_.addEventListener("click",T=>{const Je=parseInt(_.dataset.sug,10),j=f[Je];if(!j)return;if(T.target.closest("[data-del]")){T.stopPropagation(),Be(j.bank,j.account),W(n);return}w&&(w.value=j.name),k&&(k.value=j.bank),d&&(d.value=j.account),p(),L()})}),s==null||s.addEventListener("click",()=>{C>=i&&u()&&(m&&ze(z),se(q,"withdrawal"),Re(n,C),S(e,"results"))}),(H=e.getElementById("ownAgentBtn"))==null||H.addEventListener("click",()=>{const _=a.settings.withdrawal_redirect_path;R(e,V(_)),ne(_)}),(B=e.querySelector('#screenAmount [data-nav="home"]'))==null||B.addEventListener("click",()=>S(e,"home")),me(e),L()}function ue(n){try{if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(n);return}}catch{}try{const e=document.createElement("textarea");e.value=n,e.style.position="fixed",e.style.opacity="0",document.body.appendChild(e),e.select(),document.execCommand("copy"),document.body.removeChild(e)}catch{}}function V(n){const e=G(n);return`Opening the cashier withdrawals — pick <b>AgentEpos</b> and withdraw directly. <br><small>${b(e)}</small>`}function Pe(n){const e=[...n];for(let t=e.length-1;t>0;t--){const a=Math.floor(Math.random()*(t+1));[e[t],e[a]]=[e[a],e[t]]}return e}function Re(n,e){var I;const{shadow:t,getData:a}=n,o=a();if(!o)return;const r=D(),i=M[r],l=t.getElementById("screenResults");if(!l)return;const c=s=>s.toLowerCase().replace(/[\s_-]+/g,""),m=c(z.bank),v=s=>m?(s.withdrawal_methods??[]).some(g=>c(g.display_name)===m||c(g.slug)===m):!0,$=o.agents.filter(s=>s.status==="live"&&s.accepts_withdrawals&&s.withdrawal_id&&v(s)),f=Pe($.filter(s=>(s.withdrawal_max??0)>=e));let y,x=!1;f.length>0?y=f:o.settings.withdrawal_no_match_behavior==="closest"?(x=!0,y=[...$].sort((s,g)=>(g.withdrawal_max??0)-(s.withdrawal_max??0)).slice(0,3)):(x=!0,y=[]);const h=y.map(s=>{const g=String(s.display_number).padStart(2,"0"),w=(s.withdrawal_max??0)>=e,k=(s.withdrawal_methods||[]).map(u=>`<span class="bank">${b(u.display_name)}</span>`).join(""),d=w?i.results_withdraw_here:i.results_withdraw_partial;return`
        <div class="agent-card live">
          <div class="agent-top">
            <div class="agent-name-wrap"><div class="agent-avatar live">${g}</div><div class="agent-name">${i.agent} ${b(String(s.display_number))}</div></div>
            <span class="cap-chip">${i.results_cap_prefix} ${A(s.withdrawal_max??0)} ETB</span>
          </div>
          <div class="waiting-text"><span class="typing-dots"><span></span><span></span><span></span></span>${i.results_ready}</div>
          <button class="idchip" data-copy-id="${b(s.withdrawal_id??"")}">${i.results_id_label}: <b>${b(s.withdrawal_id??"")}</b> ⧉</button>
          <div class="banks">${k}</div>
          <button class="deposit-btn gold" data-withdraw-here data-agent-id="${s.id}"><span>${d}</span><span>→</span></button>
        </div>`}).join("");l.innerHTML=`
    <div class="backrow"><button class="backbtn" data-nav="amount">←</button><h2>${i.results_title}</h2></div>
    <div class="res-head">
      <div><small>${i.results_withdrawing}</small><b>${A(e)} ETB</b></div>
      <button data-nav="amount">${i.results_change}</button>
    </div>
    <button class="ownagent" style="margin:0 0 15px" id="ownAgentBtn2"><span class="ow">${i.withdraw_own_agent}<small>${i.withdraw_own_agent_desc}</small></span><span>→</span></button>
    ${x?`<div class="nores"><h4>${i.results_none_title}</h4><p>${i.results_none_desc}</p></div>`:""}
    <div class="agent-grid" id="resList">${h}</div>
  `,t.querySelectorAll('#screenResults [data-nav="amount"]').forEach(s=>s.addEventListener("click",()=>S(t,"amount"))),(I=t.getElementById("ownAgentBtn2"))==null||I.addEventListener("click",()=>{const s=o.settings.withdrawal_redirect_path;R(t,V(s)),ne(s)}),t.querySelectorAll("#screenResults .idchip").forEach(s=>{s.addEventListener("click",()=>{const g=s.dataset.copyId??"";g&&(ue(g),R(t,`${i.results_id_copied} <b>${b(g)}</b>`))})}),t.querySelectorAll("#screenResults [data-withdraw-here]").forEach(s=>{s.addEventListener("click",()=>{const g=parseInt(s.dataset.agentId,10),w=y.find(d=>d.id===g);if(!w)return;const k=(w.withdrawal_max??0)>=e;n.trackClick(g,"withdrawal",{amount:e,source:k?"list":"partial"}),w.withdrawal_id&&ue(w.withdrawal_id),R(t,`${i.results_id_copied} <b>${b(w.withdrawal_id??"")}</b> · `+V(o.settings.withdrawal_redirect_path)),Se({agent:w,amount:e,messageTemplate:o.settings.withdrawal_message_with_amount,redirectPath:o.settings.withdrawal_redirect_path,payout:z,playerId:q})})})}function Ne(n,e,t){const{shadow:a,getData:o}=n,r=o();if(!r)return;const i=(r.directory??[]).find(c=>c.id===e);if(!i)return;if(t==="withdrawal"){W(n),S(a,"amount");return}const l=O(i.telegram_username,r.settings.chat_prefilled_message);i.online?(n.trackClick(e,"deposit",{source:"recent"}),window.open(l,"_blank","noopener")):n.openOfflineModal(l,e,[])}function Ue(n,e){const t=n.getData();if(!t)return;const a=(t.directory??[]).find(o=>o.id===e);a&&(n.trackClick(e,"contact",{source:"recent"}),window.open(`https://telegram.me/${encodeURIComponent(a.telegram_username)}`,"_blank","noopener"))}function me(n){n.querySelectorAll(".videobox").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.video||"",a=ce(t);a&&(e.innerHTML=`<iframe src="https://www.youtube.com/embed/${a}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen title="How to withdraw"></iframe>`)})})}function Ye(n){const e=n.dataset.api;if(e)return e;const t=document.querySelectorAll('script[src*="embed.js"]'),a=t[t.length-1];if(a!=null&&a.src)try{return new URL(a.src).origin}catch{}return window.location.origin}function fe(){var g,w,k;const n=document.getElementById("kemerbet-agents");if(!n)return;const e=Ye(n),t=n.attachShadow({mode:"open"}),a=document.createElement("style");a.textContent=he,t.appendChild(a);const o=D();n.setAttribute("lang",o);const r=document.createElement("div");r.innerHTML=Ge(o),t.appendChild(r),be(o,t,n),sessionStorage.getItem("kemerbet_visited")||(sessionStorage.setItem("kemerbet_visited","1"),fetch(`${e}/api/public/visit`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({referrer:document.referrer||null})}).catch(()=>{}));let i=null,l=null,c=null,m=null,v=null;function $(){const d=t.getElementById("refreshIndicator");d&&(d.classList.add("show"),setTimeout(()=>d.classList.remove("show"),1400))}function f(d,u){fetch(`${e}/api/public/agents/${d}/click`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({referrer:window.location.href,payment_methods:u&&u.length>0?u:null}),keepalive:!0}).catch(()=>{})}const y={shadow:t,apiBase:e,getData:()=>i,trackClick:(d,u,p)=>{Y(d,u),fetch(`${e}/api/public/agents/${d}/click`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({referrer:window.location.href,intent:u,amount:(p==null?void 0:p.amount)??null,source:(p==null?void 0:p.source)??null,payment_methods:p!=null&&p.paymentMethods&&p.paymentMethods.length>0?p.paymentMethods:null}),keepalive:!0}).catch(()=>{})},openOfflineModal:(d,u,p)=>{l=d,c=String(u),m=p,I()}};async function x(){$();try{const d=await fetch(`${e}/api/public/agents`);if(!d.ok)throw new Error(`HTTP ${d.status}`);const u=await d.json();i=u,Q(u,t),pe(y),me(t)}catch{console.warn("[kemerbet-agents] fetch failed, retrying in 60s")}}function h(){v=window.setTimeout(async()=>{document.hidden||await x(),document.hidden?v=null:h()},6e4)}document.addEventListener("visibilitychange",()=>{document.hidden?v!==null&&(clearTimeout(v),v=null):v===null&&(x(),h())});function I(){var d;(d=t.getElementById("offlineWarnModal"))==null||d.classList.add("show")}function s(){var d;(d=t.getElementById("offlineWarnModal"))==null||d.classList.remove("show"),l=null,c=null,m=null}(g=t.getElementById("confirmDepositBtn"))==null||g.addEventListener("click",()=>{c&&(f(c,m??void 0),Y(parseInt(c,10),"deposit")),l&&window.open(l,"_blank","noopener"),s()}),(w=t.getElementById("cancelWarnBtn"))==null||w.addEventListener("click",()=>{s()}),(k=t.getElementById("offlineWarnModal"))==null||k.addEventListener("click",d=>{d.target.id==="offlineWarnModal"&&s()}),document.addEventListener("keydown",d=>{if(d.key==="Escape"){const u=t.getElementById("offlineWarnModal");u!=null&&u.classList.contains("show")&&s()}}),t.addEventListener("click",d=>{const p=d.target.closest("[data-agent-id]");if(!p)return;const L=p.dataset.agentId,H=JSON.parse(p.dataset.paymentMethods||"[]"),B=p.dataset.tgUser||"",_=i,T=_?qe(_):null;p.dataset.offline==="true"?(d.preventDefault(),l=T&&B?O(B,T):p.dataset.depositUrl||null,c=L,m=H,I()):(T&&B&&(p.href=O(B,T)),f(L,H),Y(parseInt(L,10),"deposit"))}),t.addEventListener("click",d=>{const u=d.target,p=u.closest("[data-intent-choice]");if(p){p.dataset.intentChoice==="withdraw"?(W(y),S(t,"amount")):(N(y),S(t,"depask"));return}if(u.closest('#screenDeposit [data-nav="home"]')){N(y),S(t,"depask");return}if(u.closest('#screenDepAsk [data-nav="home"]')){S(t,"home");return}const B=u.closest("[data-recent-main]");if(B){Ne(y,parseInt(B.dataset.agentId,10),B.dataset.intent);return}const _=u.closest("[data-recent-contact]");if(_){Ue(y,parseInt(_.dataset.agentId,10));return}}),t.querySelectorAll(".lang-btn").forEach(d=>{d.addEventListener("click",()=>{var p;const u=d.dataset.lang;we(u),be(u,t,n),i&&(Q(i,t),pe(y),(p=t.getElementById("screenAmount"))!=null&&p.classList.contains("active")&&(W(y),S(t,"amount")))})}),x(),h()}function be(n,e,t){const a=M[n];t.setAttribute("lang",n),e.querySelectorAll("[data-i18n]").forEach(o=>{const r=o.dataset.i18n;a[r]!==void 0&&(o.textContent=a[r])}),e.querySelectorAll(".lang-btn").forEach(o=>{const r=o;r.classList.toggle("active",r.dataset.lang===n)})}function Ge(n){const e=M[n];return`
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
          <button class="lang-btn${n==="am"?" active":""}" data-lang="am">አማ</button>
          <button class="lang-btn${n==="en"?" active":""}" data-lang="en">EN</button>
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
  `}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",fe):fe()})();
