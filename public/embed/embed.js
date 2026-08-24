(function(){"use strict";const It=`
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
`,A={am:{title:"Kemerbet ኤጀንቶች",subtitle:"ኦንላይን ያሉ ኤጀንቶች ቅድሚያ ይታያሉ። ዲፖዚት ለማድረግ ይምረጡ።",live_now:"አሁን ኦንላይን",recently_online:"በቅርብ ጊዜ ኦንላይን የነበሩ",agents_online:"ኤጀንቶች ኦንላይን ናቸው",no_agents_online:"ምንም ኤጀንት ኦንላይን የለም",live_label:"ኦንላይን",offline_label:"ኦፍላይን",truly_online:"ትክክለኛ ኦንላይን ያሉ",last_seen:"መጨረሻ የታየው",just_now:"አሁን",min_ago_suffix:"ደቂቃ በፊት",hour_unit:"ሰዓት",day_unit:"ቀን",ago:"በፊት",deposit:"ዲፖዚት",agent:"ኤጀንት",live_count:"ኦንላይን",no_agents_title:"ምንም ኤጀንት አሁን ኦንላይን የለም",no_agents_desc:"ከታች በቅርብ ጊዜ ኦንላይን የነበሩ ኤጀንቶችን ይመልከቱ።",loading:"በመጫን ላይ…",updating:"እያዘመነ ነው",warn_title:"ይህ ኤጀንት ኦፍላይን ሊሆን ይችላል",warn_desc:"ኤጀንቱ ለተወሰነ ጊዜ ኦንላይን አልነበረም እና በፍጥነት ላይመልስልዎ ይችላል። መቀጠል ይፈልጋሉ?",cancel:"ይቅር",continue:"ቀጥል",intent_question:"ምን ማድረግ ይፈልጋሉ?",intent_deposit:"ዲፖዚት",intent_deposit_desc:"ኦንላይን ያሉ ኤጀንቶችን አይተው ገንዘብ ያስገቡ",intent_withdraw:"ማውጣት",intent_withdraw_desc:"መጠን ያስገቡ → የሚከፍሉ ኤጀንቶች ይታያሉ",withdraw_title:"ማውጣት",withdraw_amount_label:"ምን ያህል ማውጣት ይፈልጋሉ?",withdraw_min_prefix:"ዝቅተኛ",withdraw_min_error:"ዝቅተኛው መጠን",withdraw_see_agents:"ይህን መጠን የሚከፍሉ ኤጀንቶችን ይመልከቱ",withdraw_own_agent:"የራሴ ኤጀንት",withdraw_own_agent_desc:"በቀጥታ በሳይቱ ላይ ያውጡ",withdraw_note:"የገንዘብ መጠንዎን የሚሸፍኑ ኤጀንቶችን ብቻ እናሳያለን። የቴሌግራም መልእክትዎ ከመጠኑ እና ከኤጀንቱ የማውጫ መለያ ጋር ዝግጁ ሆኖ ይመጣል።",withdraw_howto:"ማውጣት እንዴት እንደሚሰራ",withdraw_howto_sub:"ቪዲዮ",results_title:"ለመጠንዎ ኤጀንቶች",results_withdrawing:"በማውጣት ላይ",results_change:"ቀይር",results_cap_prefix:"እስከ",results_ready:"ኦንላይን · ለመክፈል ዝግጁ",results_withdraw_here:"እዚህ ያውጡ",results_withdraw_partial:"በከፊል ያውጡ",results_none_title:"አሁን ይህን ሙሉ መጠን የሚከፍል ኤጀንት የለም",results_none_desc:"እነዚህ በጣም ቅርብ ናቸው — መጠኑን መከፋፈል፣ ትንሽ መጠን መምረጥ ወይም ቆይተው መመለስ ይችላሉ።",recents_title:"የቅርብ ጊዜ ኤጀንቶችዎ",recents_only_you:"እርስዎ ብቻ ያዩታል",recents_contact:"አግኝ",recents_online:"ኦንላይን",recents_offline:"ኦፍላይን",back:"ተመለስ",payout_title:"ገንዘቡ የሚላክበት መረጃ",payout_name_ph:"ሙሉ ስም",payout_bank_ph:"ባንክ ይምረጡ",payout_account_ph:"የሂሳብ ቁጥር",payout_note:"ይህ መረጃ ለኤጀንቱ በቴሌግራም መልእክት ውስጥ ይላካል። በመሳሪያዎ ላይ ብቻ ይቀመጣል።",depask_title:"ምን ያህል ማስገባት ይፈልጋሉ?",depask_see_agents:"ዝግጁ ኤጀንቶችን ይመልከቱ",player_id_ph:"የተጫዋች መለያ (Player ID)",pid_auto_label:"የተጫዋች መለያ — በራስ-ሰር ተሞልቷል",pid_login_hint:"የተጫዋች መለያዎ በራስ-ሰር እንዲሞላ ወደ ሳይቱ ይግቡ",results_id_label:"የመውጫ መለያ",results_id_copied:"መለያው ተቀድቷል:"},en:{title:"Kemerbet Agents",subtitle:"Live agents are shown first. Tap to deposit.",live_now:"Live Now",recently_online:"Recently online",agents_online:"agents online",no_agents_online:"No agents online",live_label:"Live",offline_label:"Offline",truly_online:"Truly online",last_seen:"Last seen",just_now:"just now",min_ago_suffix:"min ago",hour_unit:"h",day_unit:"d",ago:"ago",deposit:"Deposit",agent:"Agent",live_count:"live",no_agents_title:"No agents live right now",no_agents_desc:"Check below for recently online agents.",loading:"Loading agents…",updating:"Updating",warn_title:"This agent may be offline",warn_desc:"The agent has not been online for a while and may not respond quickly. Do you want to continue?",cancel:"Cancel",continue:"Continue",intent_question:"What do you want to do?",intent_deposit:"Deposit",intent_deposit_desc:"See all online agents and send money",intent_withdraw:"Withdraw",intent_withdraw_desc:"Enter amount → matched to agents who can pay it",withdraw_title:"Withdraw",withdraw_amount_label:"How much do you want to withdraw?",withdraw_min_prefix:"Minimum",withdraw_min_error:"Minimum is",withdraw_see_agents:"See agents who can pay this",withdraw_own_agent:"My own agent",withdraw_own_agent_desc:"withdraw directly on the site",withdraw_note:"We only show agents whose cash covers your amount, so you don't waste time asking. Your Telegram message comes ready with the amount and the agent's Withdrawal ID.",withdraw_howto:"How withdrawal works",withdraw_howto_sub:"Video",results_title:"Agents for your amount",results_withdrawing:"Withdrawing",results_change:"Change",results_cap_prefix:"Up to",results_ready:"Online · ready to pay",results_withdraw_here:"Withdraw here",results_withdraw_partial:"Withdraw partial",results_none_title:"No agent can pay this full amount right now",results_none_desc:"These agents are closest — split your withdrawal, choose a smaller amount, or check back soon.",recents_title:"Your recent agents",recents_only_you:"only you see this",recents_contact:"Contact",recents_online:"Online",recents_offline:"Offline",back:"Back",payout_title:"Where should the agent send the money?",payout_name_ph:"Full name",payout_bank_ph:"Select bank",payout_account_ph:"Account number",payout_note:"This is included in your Telegram message to the agent. Saved only on your device.",depask_title:"How much will you deposit?",depask_see_agents:"See available agents",player_id_ph:"Player ID",pid_auto_label:"Player ID — filled automatically",pid_login_hint:"Log in to fill your Player ID automatically",results_id_label:"Withdrawal ID",results_id_copied:"ID copied:"}},Z="kemerbet_lang";function O(){try{const e=localStorage.getItem(Z);if(e==="am"||e==="en")return e}catch{}return"am"}function Et(e){try{localStorage.setItem(Z,e)}catch{}}const St={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"};function h(e){return String(e).replace(/[&<>"']/g,t=>St[t])}const tt="kemerbet_recent_agents",Lt=20;function et(){try{const e=localStorage.getItem(tt);if(!e)return[];const t=JSON.parse(e);return Array.isArray(t)?t.filter(n=>n&&typeof n.agent_id=="number"&&typeof n.ts=="number"):[]}catch{return[]}}function Tt(e){try{localStorage.setItem(tt,JSON.stringify(e.slice(0,Lt)))}catch{}}function G(e,t){const n=et().filter(a=>a.agent_id!==e);n.unshift({agent_id:e,intent:t,ts:Date.now()}),Tt(n)}function zt(e,t){const n=new Map(e.map(o=>[o.id,o])),a=[];for(const o of et().sort((r,i)=>i.ts-r.ts)){const r=n.get(o.agent_id);if(r&&(a.push({entry:o,agent:r}),a.length>=t))break}return a}function J(e){const t=window.location.origin;let n=e||"/sport/popup/withdrawal";if(/^https?:\/\//i.test(n))try{const a=new URL(n);n=a.pathname+a.search+a.hash}catch{n="/sport/popup/withdrawal"}return n.startsWith("/")||(n="/"+n),t+n}function nt(e,t){var i,d,f;const n=t.withdrawal_id??"",a=((i=t.payout)==null?void 0:i.account)??"",o=(t.player_id??"").trim();return e.replace(/\{amount\}/g,t.amount!=null?t.amount.toLocaleString("en-US"):"").replace(/\{withdrawal_id\}/g,n?"`"+n+"`":"").replace(/\{name\}/g,((d=t.payout)==null?void 0:d.name)??"").replace(/\{bank\}/g,((f=t.payout)==null?void 0:f.bank)??"").replace(/\{account\}/g,a?"`"+a+"`":"").replace(/\{player_id\}/g,o?"`"+o+"`":"").split(`
`).filter(b=>!/^[^:\n]{0,40}:\s*$/.test(b.trim())||b.trim()==="").join(`
`).replace(/\n{3,}/g,`

`).trim()}function K(e,t){return`https://telegram.me/${encodeURIComponent(e)}?text=${encodeURIComponent(t)}`}function Bt(e){const t=nt(e.messageTemplate,{amount:e.amount,withdrawal_id:e.agent.withdrawal_id??"",payout:e.payout??null,player_id:e.playerId??null}),n=K(e.agent.telegram_username,t),a=J(e.redirectPath);window.open(n,"_blank","noopener"),window.location.href=a}function at(e){window.location.href=J(e)}const rt="kemerbet_payout_accounts",At=4;function N(){try{const e=localStorage.getItem(rt);if(!e)return[];const t=JSON.parse(e);return Array.isArray(t)?t.filter(n=>n&&typeof n.name=="string"&&typeof n.bank=="string"&&typeof n.account=="string"):[]}catch{return[]}}function it(e){try{localStorage.setItem(rt,JSON.stringify(e.slice(0,At)))}catch{}}function Mt(e){const t=e.name.trim(),n=e.bank.trim(),a=e.account.trim(),o=(e.playerId??"").trim();if(!t||!n||!a)return;const r=N().filter(i=>!(i.bank===n&&i.account===a));r.unshift({name:t,bank:n,account:a,playerId:o,ts:Date.now()}),it(r)}function Dt(e,t){const n=e.trim(),a=t.trim();it(N().filter(o=>!(o.bank===n&&o.account===a)))}function Ct(e){const t=e.trim();if(!t)return null;const n=N().filter(a=>a.bank===t).sort((a,o)=>o.ts-a.ts)[0];return n?{name:n.name,bank:n.bank,account:n.account,playerId:n.playerId}:null}function ot(e){return N().sort((t,n)=>n.ts-t.ts).slice(0,e).map(t=>({name:t.name,bank:t.bank,account:t.account,playerId:t.playerId}))}const st="kemerbet_player_ids",V=4,Wt=12;function F(){try{const e=localStorage.getItem(st);if(!e)return[];const t=JSON.parse(e);return Array.isArray(t)?t.filter(n=>n&&typeof n.id=="string"&&n.id!==""):[]}catch{return[]}}function dt(e){try{const t=[...e].sort((n,a)=>Math.max(a.depTs??0,a.wdTs??0)-Math.max(n.depTs??0,n.wdTs??0));localStorage.setItem(st,JSON.stringify(t.slice(0,Wt)))}catch{}}function Ht(e,t){const n=e.trim();if(!n)return;const a=F(),o=a.find(i=>i.id===n),r=o??{id:n};r.depTs=Date.now(),o||a.unshift(r),dt(a)}function Pt(e){dt(F().filter(t=>t.id!==e))}function lt(e){const t=F(),n=i=>i.depTs??0,a=i=>i.wdTs??0,r=t.filter(i=>n(i)>0).sort((i,d)=>n(d)-n(i)).slice(0,V).map(i=>i.id);if(r.length<V){const i=t.filter(d=>n(d)===0&&a(d)>0).sort((d,f)=>a(f)-a(d));for(const d of i){if(r.length>=V)break;r.includes(d.id)||r.push(d.id)}}return r}function U(e){if(typeof e!="string"&&typeof e!="number")return null;const t=String(e).trim();return/^[A-Za-z0-9_-]{3,32}$/.test(t)?t:null}function Ot(e){if(typeof e!="string"&&typeof e!="number")return null;const t=String(e).trim().match(/[A-Za-z0-9_-]{3,32}/);return t?t[0]:null}function jt(e){const t=e.indexOf("."),n=t===-1?e:e.slice(0,t),a=t===-1?[]:e.slice(t+1).split(".");for(const o of[sessionStorage,localStorage]){let r=null;try{r=o.getItem(n)}catch{continue}if(r!=null)if(a.length>0)try{let i=JSON.parse(r);for(const f of a)if(i&&typeof i=="object")i=i[f];else{i=void 0;break}const d=U(i);if(d)return d}catch{}else{const i=U(r);if(i)return i;try{const d=JSON.parse(r);for(const f of["id","playerId","player_id","userId","user_id"]){const b=U(d==null?void 0:d[f]);if(b)return b}}catch{}}}return null}function qt(e){try{const n=U(window.KEMERBET_PLAYER_ID);if(n)return n}catch{}if(e.storageKey){const t=jt(e.storageKey.trim());if(t)return t}if(e.domSelector)try{const t=document.querySelector(e.domSelector),n=Ot((t==null?void 0:t.textContent)??(t==null?void 0:t.value)??null);if(n)return n}catch{}return null}let W=0,B={name:"",bank:"",account:""},j="",S={amount:0,playerId:""};function ct(e){return qt({storageKey:e.settings.player_id_storage_key||void 0,domSelector:e.settings.player_id_dom_selector||void 0})}let pt=!1,gt=!1;function Rt(){try{if(window.location.hash.toLowerCase()==="#withdraw")return!0;const e=new URLSearchParams(window.location.search);return e.get("withdraw")==="1"||e.get("intent")==="withdraw"}catch{return!1}}function M(e){return e.toLocaleString("en-US")}function L(e,t){var a;["Home","DepAsk","Deposit","Amount","Results"].forEach(o=>{const r=e.getElementById("screen"+o);r&&r.classList.toggle("active",o.toLowerCase()===t)});const n=t==="depask"?"screenDepAsk":"screen"+t.charAt(0).toUpperCase()+t.slice(1);(a=e.getElementById(n))==null||a.scrollIntoView({block:"nearest"})}function ut(e){if(!e)return null;const t=[/youtube\.com\/watch\?v=([\w\-_]+)/i,/youtube\.com\/embed\/([\w\-_]+)/i,/youtu\.be\/([\w\-_]+)/i];for(const n of t){const a=e.match(n);if(a)return a[1]}return null}function Nt(e,t){return`
    <div class="videobox" data-video="${h(t)}">
      <div class="vplay">▶</div>
      <b>${e.withdraw_howto}</b>
      <small>${e.withdraw_howto_sub}</small>
    </div>`}function Y(e,t){let n=e.getElementById("wToast");n||(n=document.createElement("div"),n.id="wToast",n.className="wtoast",e.appendChild(n)),n.innerHTML=t,n.classList.add("show"),window.setTimeout(()=>n&&n.classList.remove("show"),4500)}function ft(e){const{shadow:t,getData:n}=e,a=n();if(!a)return;const o=O(),r=A[o],i=a.settings.withdrawals_enabled!==!1,d=t.querySelector("#screenDeposit .backrow");if(i)d&&(d.style.display="");else{d&&(d.style.display="none");const g=t.querySelector(".screen.active");(!g||g.id==="screenHome")&&(R(e),L(t,"depask"))}i&&!pt&&Rt()&&(pt=!0,H(e),L(t,"amount")),gt||(gt=!0,window.addEventListener("hashchange",()=>{const g=e.getData();g&&g.settings.withdrawals_enabled!==!1&&window.location.hash.toLowerCase()==="#withdraw"&&(H(e),L(e.shadow,"amount"))}));const f=t.getElementById("noticeWrap"),b=t.getElementById("noticeWrapDep"),v=i?f:b,k=i?b:f;if(k&&(k.innerHTML=""),v){const g=a.notices??[];g.length===0?v.innerHTML="":v.innerHTML=g.map(w=>{const l=(w.video_url?ut(w.video_url):null)?`<div class="videobox nb-video" data-video="${h(w.video_url??"")}"><div class="vplay">▶</div><b>${r.withdraw_howto}</b></div>`:"";return`
            <div class="notice">
              <div class="nb-tag">${w.priority==="urgent"?"📣":"📌"} ${h(w.title||"")}</div>
              <p>${h(w.body)}</p>
              ${l}
            </div>`}).join("")}const x=t.getElementById("recentsWrap");if(x)if(a.settings.recents_enabled){const g=zt(a.directory??[],a.settings.recents_count??5);if(g.length===0)x.style.display="none";else{x.style.display="block";const w=g.map(l=>{const c=l.agent,_=String(c.display_number).padStart(2,"0"),$=c.online,s=$?r.recents_online:r.recents_offline,p=l.entry.intent==="withdrawal",u=p?r.intent_withdraw:r.deposit,I=$?p?"wdr":"dep":"grey";return`
              <div class="recent${$?"":" is-off"}">
                <div class="agent-avatar ${$?"live":"off"}">${_}</div>
                <div class="rc-mid">
                  <div class="rc-name">${r.agent} ${h(String(c.display_number))}</div>
                  <div class="rc-sub">${s}</div>
                </div>
                <div class="rc-btns">
                  <button class="btn-s ${I}" data-recent-main data-agent-id="${c.id}" data-intent="${l.entry.intent}">${u}</button>
                  <button class="btn-s line" data-recent-contact data-agent-id="${c.id}">${r.recents_contact}</button>
                </div>
              </div>`}).join(""),T=t.getElementById("recentsGrid");T&&(T.innerHTML=w)}}else x.style.display="none";const m=t.getElementById("intentQuestion");m&&(m.textContent=r.intent_question)}function mt(e){if(!S.playerId.trim()||S.amount<=0)return null;const t=e.settings.deposit_message||"Hi Kemerbet agent, I want to deposit {amount} ETB. My Player ID: {player_id}";return nt(t,{amount:S.amount,player_id:S.playerId})}function bt(e,t){return e.length===0?"":`<div class="pid-row" data-pid-input="${t}">${e.map(n=>`<span class="pid-chip"><button class="pid-use" data-pid="${h(n)}">${h(n)}</button><button class="pid-x" data-pid-del="${h(n)}">×</button></span>`).join("")}</div>`}function ht(e,t,n){const{shadow:a}=e;a.querySelectorAll(".pid-row .pid-use").forEach(o=>o.addEventListener("click",()=>n(o.dataset.pid||""))),a.querySelectorAll(".pid-row .pid-x").forEach(o=>o.addEventListener("click",()=>{Pt(o.dataset.pidDel||""),t()}))}function R(e){const{shadow:t,getData:n}=e,a=n();if(!a)return;const o=O(),r=A[o],i=t.getElementById("screenDepAsk");if(!i)return;const d=(a.settings.deposit_quick_amounts??[]).map(g=>`<button class="q" data-dep-quick="${g}">${M(g)}</button>`).join("");S.amount=0;const f=ct(a);f&&(S.playerId=f);const b=f?[]:lt();if(!f)for(const g of ot(8)){if(b.length>=4)break;const w=(g.playerId??"").trim();w&&!b.includes(w)&&b.push(w)}i.innerHTML=`
    <div class="backrow" id="depAskBack"><button class="backbtn" data-nav="home">←</button><h2>${r.intent_deposit}</h2></div>
    <div class="payout">
      <div class="payout-title">${r.depask_title}</div>
      <div class="amt-line" style="justify-content:flex-start;padding:0 2px 7px">
        <input id="depAmtInput" type="text" inputmode="numeric" placeholder="0" style="width:130px;background:transparent;border:0;outline:0;color:var(--text-light);font:900 26px 'Inter',sans-serif" />
        <b>ETB</b>
      </div>
      ${d?`<div class="quick" style="margin:8px 0 4px">${d}</div>`:""}
      <div class="pid-note${f?" auto":""}" style="margin-top:8px">${f?r.pid_auto_label:r.pid_login_hint}</div>
      <input class="pf" id="depPidInput" type="text" autocomplete="off" placeholder="${r.player_id_ph}" value="${h(S.playerId)}" />
      ${bt(b.slice(0,4),"depPidInput")}
    </div>
    <button class="bigcta" id="depGo" disabled>${r.depask_see_agents}</button>
  `;const v=t.getElementById("depAmtInput"),k=t.getElementById("depPidInput"),x=t.getElementById("depGo"),m=()=>{if(!v||!x)return;const g=v.value.replace(/[^0-9]/g,"");S.amount=parseInt(g||"0",10),g&&(v.value=M(S.amount)),S.playerId=(k==null?void 0:k.value)??"",x.disabled=!(S.amount>0&&S.playerId.trim()!=="")};v==null||v.addEventListener("input",m),k==null||k.addEventListener("input",m),t.querySelectorAll("#screenDepAsk [data-dep-quick]").forEach(g=>g.addEventListener("click",()=>{v&&(v.value=M(parseInt(g.dataset.depQuick,10))),m()})),ht(e,()=>R(e),g=>{k&&(k.value=g),m()}),m(),x==null||x.addEventListener("click",()=>{S.amount>0&&S.playerId.trim()!==""&&(Ht(S.playerId),L(t,"deposit"))})}function H(e){var D,$t;const{shadow:t,getData:n}=e,a=n();if(!a)return;const o=O(),r=A[o],i=a.settings.withdrawal_min??200,d=a.settings.withdrawal_howto_video_url??"",f=t.getElementById("screenAmount");if(!f)return;const b=a.settings.withdrawal_require_payout_details!==!1,v=a.settings.withdrawal_bank_options??[],k=['<option value="">'+r.payout_bank_ph+"</option>"].concat(v.map(y=>`<option value="${h(y)}">${h(y)}</option>`)).join(""),x=ct(a);x&&(j=x);const m=b?ot(4):[],g=m.map(y=>(y.playerId??"").trim()).filter(Boolean),w=x||m.length>=4?[]:lt().filter(y=>!g.includes(y)).slice(0,4-m.length),T=m.length?`<div class="payout-saved" id="payoutSaved">${m.map((y,P)=>`<div class="psug" data-sug="${P}"><button class="psug-x" data-del="${P}" aria-label="Delete">✕</button><span class="psug-name">${h(y.name)}</span><span class="psug-meta">${h(y.bank)} · ${h(y.account)}${y.playerId?" · ID "+h(y.playerId):""}</span></div>`).join("")}</div>`:"",l=b?`
    <div class="payout">
      <div class="payout-title">${r.payout_title}</div>
      <div class="pid-note${x?" auto":""}">${x?r.pid_auto_label:r.pid_login_hint}</div>
      <input class="pf" id="pfPlayerId" type="text" autocomplete="off" placeholder="${r.player_id_ph}" value="${h(j)}" />
      ${bt(w,"pfPlayerId")}
      <input class="pf" id="pfName" type="text" autocomplete="off" placeholder="${r.payout_name_ph}" value="${h(B.name)}" />
      <select class="pf" id="pfBank">${k}</select>
      <input class="pf" id="pfAccount" type="text" inputmode="numeric" autocomplete="off" placeholder="${r.payout_account_ph}" value="${h(B.account)}" />
      ${T}
    </div>`:"";f.innerHTML=`
    <div class="backrow"><button class="backbtn" data-nav="home">←</button><h2>${r.withdraw_title}</h2></div>
    ${d?Nt(r,d):""}
    ${l}
    <div class="amount-wrap">
      <label>${r.withdraw_amount_label}</label>
      <div class="amt-line">
        <input id="amtInput" type="text" inputmode="numeric" placeholder="0" />
        <b>ETB</b>
      </div>
      <div class="amt-hint" id="amtHint">${r.withdraw_min_prefix} ${M(i)} ETB</div>
    </div>
    <button class="bigcta" id="amtGo" disabled>${r.withdraw_see_agents}</button>
    <button class="ownagent" id="ownAgentBtn"><span class="ow">${r.withdraw_own_agent}<small>${r.withdraw_own_agent_desc}</small></span><span>→</span></button>
  `;const c=t.getElementById("amtInput"),_=t.getElementById("amtHint"),$=t.getElementById("amtGo"),s=t.getElementById("pfPlayerId"),p=t.getElementById("pfName"),u=t.getElementById("pfBank"),I=t.getElementById("pfAccount");u&&B.bank&&(u.value=B.bank);const q=()=>j.trim()===""?!1:b?B.name.trim()!==""&&B.bank.trim()!==""&&B.account.trim()!=="":!0,E=()=>{j=(s==null?void 0:s.value)??"",B={name:(p==null?void 0:p.value)??"",bank:(u==null?void 0:u.value)??"",account:(I==null?void 0:I.value)??""}},z=()=>{if(!c||!_||!$)return;const y=c.value.replace(/[^0-9]/g,"");W=parseInt(y||"0",10),y&&(c.value=M(W));const P=W>=i;W>0&&W<i?(_.textContent=`${r.withdraw_min_error} ${M(i)} ETB`,_.classList.add("err")):(_.textContent=`${r.withdraw_min_prefix} ${M(i)} ETB`,_.classList.remove("err")),$.disabled=!(P&&q())};c==null||c.addEventListener("input",z),s==null||s.addEventListener("input",()=>{E(),z()}),p==null||p.addEventListener("input",()=>{E(),z()}),I==null||I.addEventListener("input",()=>{E(),z()}),u==null||u.addEventListener("change",()=>{E();const y=Ct(B.bank);y&&(p&&!p.value.trim()&&(p.value=y.name),I&&!I.value.trim()&&(I.value=y.account),E()),z()}),ht(e,()=>H(e),y=>{s&&(s.value=y),E(),z()}),t.querySelectorAll("#screenAmount .psug").forEach(y=>{y.addEventListener("click",P=>{const ee=parseInt(y.dataset.sug,10),C=m[ee];if(!C)return;if(P.target.closest("[data-del]")){P.stopPropagation(),Dt(C.bank,C.account),H(e);return}p&&(p.value=C.name),u&&(u.value=C.bank),I&&(I.value=C.account),s&&C.playerId&&!x&&(s.value=C.playerId),E(),z()})}),$==null||$.addEventListener("click",()=>{W>=i&&q()&&(b&&Mt({...B,playerId:j}),Yt(e,W),L(t,"results"))}),(D=t.getElementById("ownAgentBtn"))==null||D.addEventListener("click",()=>{const y=a.settings.withdrawal_redirect_path;Y(t,X(y)),at(y)}),($t=t.querySelector('#screenAmount [data-nav="home"]'))==null||$t.addEventListener("click",()=>L(t,"home")),xt(t),z()}function wt(e){try{if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(e);return}}catch{}try{const t=document.createElement("textarea");t.value=e,t.style.position="fixed",t.style.opacity="0",document.body.appendChild(t),t.select(),document.execCommand("copy"),document.body.removeChild(t)}catch{}}function X(e){const t=J(e);return`Opening the cashier withdrawals — pick <b>AgentEpos</b> and withdraw directly. <br><small>${h(t)}</small>`}function Ut(e){const t=[...e];for(let n=t.length-1;n>0;n--){const a=Math.floor(Math.random()*(n+1));[t[n],t[a]]=[t[a],t[n]]}return t}function Yt(e,t){var T;const{shadow:n,getData:a}=e,o=a();if(!o)return;const r=O(),i=A[r],d=n.getElementById("screenResults");if(!d)return;const f=l=>l.toLowerCase().replace(/[\s_-]+/g,""),b=f(B.bank),v=l=>b?(l.withdrawal_methods??[]).some(c=>f(c.display_name)===b||f(c.slug)===b):!0,k=o.agents.filter(l=>l.status==="live"&&l.accepts_withdrawals&&l.withdrawal_id&&v(l)),x=Ut(k.filter(l=>(l.withdrawal_max??0)>=t));let m,g=!1;x.length>0?m=x:o.settings.withdrawal_no_match_behavior==="closest"?(g=!0,m=[...k].sort((l,c)=>(c.withdrawal_max??0)-(l.withdrawal_max??0)).slice(0,3)):(g=!0,m=[]);const w=m.map(l=>{const c=String(l.display_number).padStart(2,"0"),_=(l.withdrawal_max??0)>=t,$=(l.withdrawal_methods||[]).map(p=>`<span class="bank">${h(p.display_name)}</span>`).join(""),s=_?i.results_withdraw_here:i.results_withdraw_partial;return`
        <div class="agent-card live">
          <div class="agent-top">
            <div class="agent-name-wrap"><div class="agent-avatar live">${c}</div><div class="agent-name">${i.agent} ${h(String(l.display_number))}</div></div>
            <span class="cap-chip">${i.results_cap_prefix} ${M(l.withdrawal_max??0)} ETB</span>
          </div>
          <div class="waiting-text"><span class="typing-dots"><span></span><span></span><span></span></span>${i.results_ready}</div>
          <button class="idchip" data-copy-id="${h(l.withdrawal_id??"")}">${i.results_id_label}: <b>${h(l.withdrawal_id??"")}</b> ⧉</button>
          <div class="banks">${$}</div>
          <button class="deposit-btn gold" data-withdraw-here data-agent-id="${l.id}"><span>${s}</span><span>→</span></button>
        </div>`}).join("");d.innerHTML=`
    <div class="backrow"><button class="backbtn" data-nav="amount">←</button><h2>${i.results_title}</h2></div>
    <div class="res-head">
      <div><small>${i.results_withdrawing}</small><b>${M(t)} ETB</b></div>
      <button data-nav="amount">${i.results_change}</button>
    </div>
    <button class="ownagent" style="margin:0 0 15px" id="ownAgentBtn2"><span class="ow">${i.withdraw_own_agent}<small>${i.withdraw_own_agent_desc}</small></span><span>→</span></button>
    ${g?`<div class="nores"><h4>${i.results_none_title}</h4><p>${i.results_none_desc}</p></div>`:""}
    <div class="agent-grid" id="resList">${w}</div>
  `,n.querySelectorAll('#screenResults [data-nav="amount"]').forEach(l=>l.addEventListener("click",()=>L(n,"amount"))),(T=n.getElementById("ownAgentBtn2"))==null||T.addEventListener("click",()=>{const l=o.settings.withdrawal_redirect_path;Y(n,X(l)),at(l)}),n.querySelectorAll("#screenResults .idchip").forEach(l=>{l.addEventListener("click",()=>{const c=l.dataset.copyId??"";c&&(wt(c),Y(n,`${i.results_id_copied} <b>${h(c)}</b>`))})}),n.querySelectorAll("#screenResults [data-withdraw-here]").forEach(l=>{l.addEventListener("click",()=>{const c=parseInt(l.dataset.agentId,10),_=m.find(s=>s.id===c);if(!_)return;const $=(_.withdrawal_max??0)>=t;e.trackClick(c,"withdrawal",{amount:t,source:$?"list":"partial"}),_.withdrawal_id&&wt(_.withdrawal_id),Y(n,`${i.results_id_copied} <b>${h(_.withdrawal_id??"")}</b> · `+X(o.settings.withdrawal_redirect_path)),Bt({agent:_,amount:t,messageTemplate:o.settings.withdrawal_message_with_amount,redirectPath:o.settings.withdrawal_redirect_path,payout:B,playerId:j})})})}function Gt(e,t,n){const{shadow:a,getData:o}=e,r=o();if(!(!r||!(r.directory??[]).find(d=>d.id===t))){if(n==="withdrawal"){H(e),L(a,"amount");return}R(e),L(a,"depask")}}function Jt(e,t){const n=e.getData();if(!n)return;const a=(n.directory??[]).find(o=>o.id===t);a&&(e.trackClick(t,"contact",{source:"recent"}),window.open(`https://telegram.me/${encodeURIComponent(a.telegram_username)}`,"_blank","noopener"))}function xt(e){e.querySelectorAll(".videobox").forEach(t=>{t.addEventListener("click",()=>{const n=t.dataset.video||"",a=ut(n);a&&(t.innerHTML=`<iframe src="https://www.youtube.com/embed/${a}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen title="How to withdraw"></iframe>`)})})}function Kt(e){const t=[...e];for(let n=t.length-1;n>0;n--){const a=Math.floor(Math.random()*(n+1));[t[n],t[a]]=[t[a],t[n]]}return t}function Vt(e,t){const n=A[t],a=Math.max(0,Math.floor((Date.now()-new Date(e).getTime())/1e3));if(a<60)return`${n.last_seen} ${n.just_now}`;const o=Math.floor(a/60);if(o<60)return`${n.last_seen} ${o} ${n.min_ago_suffix}`;const r=Math.floor(o/60),i=o%60;if(r<24)return t==="am"?i>0?`${n.last_seen} ${r} ${n.hour_unit} ${i} ደቂቃ ${n.ago}`:`${n.last_seen} ${r} ${n.hour_unit} ${n.ago}`:i>0?`${n.last_seen} ${r}${n.hour_unit} ${i}m ${n.ago}`:`${n.last_seen} ${r}${n.hour_unit} ${n.ago}`;const d=Math.floor(r/24);return t==="am"?`${n.last_seen} ${d} ${n.day_unit} ${n.ago}`:`${n.last_seen} ${d}${n.day_unit} ${n.ago}`}const Q="kemerbet_first_seen_at",Ft=1440*60*1e3;function Xt(){try{const e=localStorage.getItem(Q);if(!e)return localStorage.setItem(Q,String(Date.now())),!0;const t=parseInt(e,10);return isNaN(t)?(localStorage.setItem(Q,String(Date.now())),!0):Date.now()-t<Ft}catch{return!0}}function Qt(e){if(!e)return null;const t=[/youtube\.com\/watch\?v=([\w\-_]+)/i,/youtube\.com\/embed\/([\w\-_]+)/i,/youtu\.be\/([\w\-_]+)/i];for(const n of t){const a=e.match(n);if(a)return a[1]}return null}function vt(e,t,n){const a=A[n],o=e.status==="live",r=h(e.telegram_username),i=encodeURIComponent(t),d=`https://telegram.me/${r}?text=${i}`,f=String(e.display_number).padStart(2,"0"),b=(e.payment_methods||[]).map(w=>w.slug),v=h(JSON.stringify(b)),k=(e.payment_methods||[]).map(w=>`<span class="bank">${h(w.display_name)}</span>`).join(""),x=o?`<div class="waiting-text">
         <span class="typing-dots"><span></span><span></span><span></span></span>
         ${a.truly_online}
       </div>`:`<div class="last-seen">⏱ ${e.last_seen_at?Vt(e.last_seen_at,n):""}</div>`,m=o?`<div class="badge live">${a.live_label}</div>`:`<div class="badge offline">${a.offline_label}</div>`,g=o?`<a href="${d}" class="deposit-btn" target="_blank" rel="noopener" data-agent-id="${e.id}" data-tg-user="${r}" data-payment-methods="${v}">
         <span>${a.deposit}</span>
         <span class="arrow">→</span>
       </a>`:`<button class="deposit-btn" data-agent-id="${e.id}" data-tg-user="${r}" data-deposit-url="${h(d)}" data-offline="true" data-payment-methods="${v}">
         <span>${a.deposit}</span>
         <span class="arrow">→</span>
       </button>`;return`
    <div class="agent-card ${o?"live":"offline"}">
      <div class="agent-top">
        <div class="agent-name-wrap">
          <div class="agent-avatar">${f}</div>
          <div>
            <div class="agent-name">${a.agent} ${h(String(e.display_number))}</div>
          </div>
        </div>
        ${m}
      </div>
      ${x}
      <div class="banks">${k}</div>
      ${g}
    </div>
  `}function yt(e,t){var l;const n=O(),a=A[n],o=t.getElementById("videoWrap");if(o){const c=e.settings.onboarding_video_url??"",_=Qt(c);_!==null&&Xt()?o.innerHTML=`
        <div class="kb-video-wrap">
          <iframe
            src="https://www.youtube.com/embed/${_}"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            title="How to Deposit"
          ></iframe>
        </div>
      `:o.innerHTML=""}const r=e.agents.filter(c=>c.status==="live"),i=e.agents.filter(c=>c.status==="recently_offline").sort((c,_)=>{const $=c.last_seen_at?new Date(c.last_seen_at).getTime():0;return(_.last_seen_at?new Date(_.last_seen_at).getTime():0)-$}),d=r.filter(c=>c.is_pinned),f=r.filter(c=>!c.is_pinned),b=[...d,...e.settings.shuffle_live_agents?Kt(f):f],k=mt(e)||((l=e.settings)==null?void 0:l.chat_prefilled_message)||"Hi Kemerbet agent, I want to deposit",x=t.getElementById("liveCountText");x&&(x.textContent=r.length>0?`${r.length} ${a.agents_online}`:a.no_agents_online);const m=t.getElementById("liveCountInline");m&&(m.textContent=`${r.length} ${a.live_count}`);const g=t.getElementById("liveGrid");g&&(r.length===0?g.innerHTML=`
        <div class="empty-state">
          <div class="icon">○</div>
          <h3>${a.no_agents_title}</h3>
          <p>${a.no_agents_desc}</p>
        </div>
      `:g.innerHTML=b.map(c=>vt(c,k,n)).join(""));const w=t.getElementById("offlineWrap"),T=t.getElementById("offlineGrid");w&&T&&(i.length>0?(w.style.display="block",T.innerHTML=i.map(c=>vt(c,k,n)).join("")):w.style.display="none")}function Zt(e){const t=e.dataset.api;if(t)return t;const n=document.querySelectorAll('script[src*="embed.js"]'),a=n[n.length-1];if(a!=null&&a.src)try{return new URL(a.src).origin}catch{}return window.location.origin}function _t(){var c,_,$;const e=document.getElementById("kemerbet-agents");if(!e)return;const t=Zt(e),n=e.attachShadow({mode:"open"}),a=document.createElement("style");a.textContent=It,n.appendChild(a);const o=O();e.setAttribute("lang",o);const r=document.createElement("div");r.innerHTML=te(o),n.appendChild(r),kt(o,n,e),sessionStorage.getItem("kemerbet_visited")||(sessionStorage.setItem("kemerbet_visited","1"),fetch(`${t}/api/public/visit`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({referrer:document.referrer||null})}).catch(()=>{}));let i=null,d=null,f=null,b=null,v=null;function k(){const s=n.getElementById("refreshIndicator");s&&(s.classList.add("show"),setTimeout(()=>s.classList.remove("show"),1400))}function x(s,p){fetch(`${t}/api/public/agents/${s}/click`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({referrer:window.location.href,payment_methods:p&&p.length>0?p:null}),keepalive:!0}).catch(()=>{})}const m={shadow:n,apiBase:t,getData:()=>i,trackClick:(s,p,u)=>{G(s,p),fetch(`${t}/api/public/agents/${s}/click`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({referrer:window.location.href,intent:p,amount:(u==null?void 0:u.amount)??null,source:(u==null?void 0:u.source)??null,payment_methods:u!=null&&u.paymentMethods&&u.paymentMethods.length>0?u.paymentMethods:null}),keepalive:!0}).catch(()=>{})},openOfflineModal:(s,p,u)=>{d=s,f=String(p),b=u,T()}};async function g(){k();try{const s=await fetch(`${t}/api/public/agents`);if(!s.ok)throw new Error(`HTTP ${s.status}`);const p=await s.json();i=p,yt(p,n),ft(m),xt(n)}catch{console.warn("[kemerbet-agents] fetch failed, retrying in 60s")}}function w(){v=window.setTimeout(async()=>{document.hidden||await g(),document.hidden?v=null:w()},6e4)}document.addEventListener("visibilitychange",()=>{document.hidden?v!==null&&(clearTimeout(v),v=null):v===null&&(g(),w())});function T(){var s;(s=n.getElementById("offlineWarnModal"))==null||s.classList.add("show")}function l(){var s;(s=n.getElementById("offlineWarnModal"))==null||s.classList.remove("show"),d=null,f=null,b=null}(c=n.getElementById("confirmDepositBtn"))==null||c.addEventListener("click",()=>{f&&(x(f,b??void 0),G(parseInt(f,10),"deposit")),d&&window.open(d,"_blank","noopener"),l()}),(_=n.getElementById("cancelWarnBtn"))==null||_.addEventListener("click",()=>{l()}),($=n.getElementById("offlineWarnModal"))==null||$.addEventListener("click",s=>{s.target.id==="offlineWarnModal"&&l()}),document.addEventListener("keydown",s=>{if(s.key==="Escape"){const p=n.getElementById("offlineWarnModal");p!=null&&p.classList.contains("show")&&l()}}),n.addEventListener("click",s=>{const u=s.target.closest("[data-agent-id]");if(!u)return;const I=u.dataset.agentId,q=JSON.parse(u.dataset.paymentMethods||"[]"),E=u.dataset.tgUser||"",z=i,D=z?mt(z):null;u.dataset.offline==="true"?(s.preventDefault(),d=D&&E?K(E,D):u.dataset.depositUrl||null,f=I,b=q,T()):(D&&E&&(u.href=K(E,D)),x(I,q),G(parseInt(I,10),"deposit"))}),n.addEventListener("click",s=>{const p=s.target,u=p.closest("[data-intent-choice]");if(u){u.dataset.intentChoice==="withdraw"?(H(m),L(n,"amount")):(R(m),L(n,"depask"));return}if(p.closest('#screenDeposit [data-nav="home"]')){R(m),L(n,"depask");return}if(p.closest('#screenDepAsk [data-nav="home"]')){L(n,"home");return}const E=p.closest("[data-recent-main]");if(E){Gt(m,parseInt(E.dataset.agentId,10),E.dataset.intent);return}const z=p.closest("[data-recent-contact]");if(z){Jt(m,parseInt(z.dataset.agentId,10));return}}),n.querySelectorAll(".lang-btn").forEach(s=>{s.addEventListener("click",()=>{var u;const p=s.dataset.lang;Et(p),kt(p,n,e),i&&(yt(i,n),ft(m),(u=n.getElementById("screenAmount"))!=null&&u.classList.contains("active")&&(H(m),L(n,"amount")))})}),g(),w()}function kt(e,t,n){const a=A[e];n.setAttribute("lang",e),t.querySelectorAll("[data-i18n]").forEach(o=>{const r=o.dataset.i18n;a[r]!==void 0&&(o.textContent=a[r])}),t.querySelectorAll(".lang-btn").forEach(o=>{const r=o;r.classList.toggle("active",r.dataset.lang===e)})}function te(e){const t=A[e];return`
    <div class="refresh-indicator" id="refreshIndicator">
      <div class="spinner"></div>
      <span data-i18n="updating">${t.updating}</span>
    </div>

    <div class="modal-backdrop" id="offlineWarnModal">
      <div class="modal-warn">
        <div class="icon-wrap">⚠️</div>
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
          <button class="lang-btn${e==="am"?" active":""}" data-lang="am">አማ</button>
          <button class="lang-btn${e==="en"?" active":""}" data-lang="en">EN</button>
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

        <!-- intent choice -->
        <div class="section-title"><h2 id="intentQuestion">${t.intent_question}</h2></div>
        <div class="intent">
          <button class="intent-card dep" data-intent-choice="deposit">
            <span class="ic">💰</span>
            <b>${t.intent_deposit}</b>
            <span>${t.intent_deposit_desc}</span>
          </button>
          <button class="intent-card wdr" data-intent-choice="withdraw">
            <span class="ic">🏧</span>
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
        <div class="backrow"><button class="backbtn" data-nav="home">←</button><h2>${t.intent_deposit}</h2></div>

        <div id="noticeWrapDep"></div>
        <div id="videoWrap"></div>

        <div class="section-title">
          <h2 data-i18n="live_now">${t.live_now}</h2>
          <div class="agent-count" id="liveCountInline">—</div>
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
  `}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",_t):_t()})();
