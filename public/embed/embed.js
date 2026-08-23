(function(){"use strict";const ae=`
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
`,T={am:{title:"Kemerbet ኤጀንቶች",subtitle:"ኦንላይን ያሉ ኤጀንቶች ቅድሚያ ይታያሉ። ዲፖዚት ለማድረግ ይምረጡ።",live_now:"አሁን ኦንላይን",recently_online:"በቅርብ ጊዜ ኦንላይን የነበሩ",agents_online:"ኤጀንቶች ኦንላይን ናቸው",no_agents_online:"ምንም ኤጀንት ኦንላይን የለም",live_label:"ኦንላይን",offline_label:"ኦፍላይን",truly_online:"ትክክለኛ ኦንላይን ያሉ",last_seen:"መጨረሻ የታየው",just_now:"አሁን",min_ago_suffix:"ደቂቃ በፊት",hour_unit:"ሰዓት",day_unit:"ቀን",ago:"በፊት",deposit:"ዲፖዚት",agent:"ኤጀንት",live_count:"ኦንላይን",no_agents_title:"ምንም ኤጀንት አሁን ኦንላይን የለም",no_agents_desc:"ከታች በቅርብ ጊዜ ኦንላይን የነበሩ ኤጀንቶችን ይመልከቱ።",loading:"በመጫን ላይ…",updating:"እያዘመነ ነው",warn_title:"ይህ ኤጀንት ኦፍላይን ሊሆን ይችላል",warn_desc:"ኤጀንቱ ለተወሰነ ጊዜ ኦንላይን አልነበረም እና በፍጥነት ላይመልስልዎ ይችላል። መቀጠል ይፈልጋሉ?",cancel:"ይቅር",continue:"ቀጥል",intent_question:"ምን ማድረግ ይፈልጋሉ?",intent_deposit:"ዲፖዚት",intent_deposit_desc:"ኦንላይን ያሉ ኤጀንቶችን አይተው ገንዘብ ያስገቡ",intent_withdraw:"ማውጣት",intent_withdraw_desc:"መጠን ያስገቡ → የሚከፍሉ ኤጀንቶች ይታያሉ",withdraw_title:"ማውጣት",withdraw_amount_label:"ምን ያህል ማውጣት ይፈልጋሉ?",withdraw_min_prefix:"ዝቅተኛ",withdraw_min_error:"ዝቅተኛው መጠን",withdraw_see_agents:"ይህን መጠን የሚከፍሉ ኤጀንቶችን ይመልከቱ",withdraw_own_agent:"የራሴ ኤጀንት",withdraw_own_agent_desc:"በቀጥታ በሳይቱ ላይ ያውጡ",withdraw_note:"የገንዘብ መጠንዎን የሚሸፍኑ ኤጀንቶችን ብቻ እናሳያለን። የቴሌግራም መልእክትዎ ከመጠኑ እና ከኤጀንቱ የማውጫ መለያ ጋር ዝግጁ ሆኖ ይመጣል።",withdraw_howto:"ማውጣት እንዴት እንደሚሰራ",withdraw_howto_sub:"ቪዲዮ",results_title:"ለመጠንዎ ኤጀንቶች",results_withdrawing:"በማውጣት ላይ",results_change:"ቀይር",results_cap_prefix:"እስከ",results_ready:"ኦንላይን · ለመክፈል ዝግጁ",results_withdraw_here:"እዚህ ያውጡ",results_withdraw_partial:"በከፊል ያውጡ",results_none_title:"አሁን ይህን ሙሉ መጠን የሚከፍል ኤጀንት የለም",results_none_desc:"እነዚህ በጣም ቅርብ ናቸው — መጠኑን መከፋፈል፣ ትንሽ መጠን መምረጥ ወይም ቆይተው መመለስ ይችላሉ።",recents_title:"የቅርብ ጊዜ ኤጀንቶችዎ",recents_only_you:"እርስዎ ብቻ ያዩታል",recents_contact:"አግኝ",recents_online:"ኦንላይን",recents_offline:"ኦፍላይን",back:"ተመለስ",payout_title:"ገንዘቡ የሚላክበት መረጃ",payout_name_ph:"ሙሉ ስም",payout_bank_ph:"ባንክ ይምረጡ",payout_account_ph:"የሂሳብ ቁጥር",payout_note:"ይህ መረጃ ለኤጀንቱ በቴሌግራም መልእክት ውስጥ ይላካል። በመሳሪያዎ ላይ ብቻ ይቀመጣል።"},en:{title:"Kemerbet Agents",subtitle:"Live agents are shown first. Tap to deposit.",live_now:"Live Now",recently_online:"Recently online",agents_online:"agents online",no_agents_online:"No agents online",live_label:"Live",offline_label:"Offline",truly_online:"Truly online",last_seen:"Last seen",just_now:"just now",min_ago_suffix:"min ago",hour_unit:"h",day_unit:"d",ago:"ago",deposit:"Deposit",agent:"Agent",live_count:"live",no_agents_title:"No agents live right now",no_agents_desc:"Check below for recently online agents.",loading:"Loading agents…",updating:"Updating",warn_title:"This agent may be offline",warn_desc:"The agent has not been online for a while and may not respond quickly. Do you want to continue?",cancel:"Cancel",continue:"Continue",intent_question:"What do you want to do?",intent_deposit:"Deposit",intent_deposit_desc:"See all online agents and send money",intent_withdraw:"Withdraw",intent_withdraw_desc:"Enter amount → matched to agents who can pay it",withdraw_title:"Withdraw",withdraw_amount_label:"How much do you want to withdraw?",withdraw_min_prefix:"Minimum",withdraw_min_error:"Minimum is",withdraw_see_agents:"See agents who can pay this",withdraw_own_agent:"My own agent",withdraw_own_agent_desc:"withdraw directly on the site",withdraw_note:"We only show agents whose cash covers your amount, so you don't waste time asking. Your Telegram message comes ready with the amount and the agent's Withdrawal ID.",withdraw_howto:"How withdrawal works",withdraw_howto_sub:"Video",results_title:"Agents for your amount",results_withdrawing:"Withdrawing",results_change:"Change",results_cap_prefix:"Up to",results_ready:"Online · ready to pay",results_withdraw_here:"Withdraw here",results_withdraw_partial:"Withdraw partial",results_none_title:"No agent can pay this full amount right now",results_none_desc:"These agents are closest — split your withdrawal, choose a smaller amount, or check back soon.",recents_title:"Your recent agents",recents_only_you:"only you see this",recents_contact:"Contact",recents_online:"Online",recents_offline:"Offline",back:"Back",payout_title:"Where should the agent send the money?",payout_name_ph:"Full name",payout_bank_ph:"Select bank",payout_account_ph:"Account number",payout_note:"This is included in your Telegram message to the agent. Saved only on your device."}},q="kemerbet_lang";function W(){try{const n=localStorage.getItem(q);if(n==="am"||n==="en")return n}catch{}return"am"}function re(n){try{localStorage.setItem(q,n)}catch{}}const ie={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"};function _(n){return String(n).replace(/[&<>"']/g,e=>ie[e])}function oe(n){const e=[...n];for(let t=e.length-1;t>0;t--){const a=Math.floor(Math.random()*(t+1));[e[t],e[a]]=[e[a],e[t]]}return e}function se(n,e){const t=T[e],a=Math.max(0,Math.floor((Date.now()-new Date(n).getTime())/1e3));if(a<60)return`${t.last_seen} ${t.just_now}`;const i=Math.floor(a/60);if(i<60)return`${t.last_seen} ${i} ${t.min_ago_suffix}`;const r=Math.floor(i/60),o=i%60;if(r<24)return e==="am"?o>0?`${t.last_seen} ${r} ${t.hour_unit} ${o} ደቂቃ ${t.ago}`:`${t.last_seen} ${r} ${t.hour_unit} ${t.ago}`:o>0?`${t.last_seen} ${r}${t.hour_unit} ${o}m ${t.ago}`:`${t.last_seen} ${r}${t.hour_unit} ${t.ago}`;const m=Math.floor(r/24);return e==="am"?`${t.last_seen} ${m} ${t.day_unit} ${t.ago}`:`${t.last_seen} ${m}${t.day_unit} ${t.ago}`}const j="kemerbet_first_seen_at",de=1440*60*1e3;function le(){try{const n=localStorage.getItem(j);if(!n)return localStorage.setItem(j,String(Date.now())),!0;const e=parseInt(n,10);return isNaN(e)?(localStorage.setItem(j,String(Date.now())),!0):Date.now()-e<de}catch{return!0}}function ce(n){if(!n)return null;const e=[/youtube\.com\/watch\?v=([\w\-_]+)/i,/youtube\.com\/embed\/([\w\-_]+)/i,/youtu\.be\/([\w\-_]+)/i];for(const t of e){const a=n.match(t);if(a)return a[1]}return null}function P(n,e,t){const a=T[t],i=n.status==="live",r=_(n.telegram_username),o=encodeURIComponent(e),m=`https://telegram.me/${r}?text=${o}`,b=String(n.display_number).padStart(2,"0"),$=(n.payment_methods||[]).map(u=>u.slug),v=_(JSON.stringify($)),E=(n.payment_methods||[]).map(u=>`<span class="bank">${_(u.display_name)}</span>`).join(""),h=i?`<div class="waiting-text">
         <span class="typing-dots"><span></span><span></span><span></span></span>
         ${a.truly_online}
       </div>`:`<div class="last-seen">⏱ ${n.last_seen_at?se(n.last_seen_at,t):""}</div>`,y=i?`<div class="badge live">${a.live_label}</div>`:`<div class="badge offline">${a.offline_label}</div>`,k=i?`<a href="${m}" class="deposit-btn" target="_blank" rel="noopener" data-agent-id="${n.id}" data-payment-methods="${v}">
         <span>${a.deposit}</span>
         <span class="arrow">→</span>
       </a>`:`<button class="deposit-btn" data-agent-id="${n.id}" data-deposit-url="${_(m)}" data-offline="true" data-payment-methods="${v}">
         <span>${a.deposit}</span>
         <span class="arrow">→</span>
       </button>`;return`
    <div class="agent-card ${i?"live":"offline"}">
      <div class="agent-top">
        <div class="agent-name-wrap">
          <div class="agent-avatar">${b}</div>
          <div>
            <div class="agent-name">${a.agent} ${_(String(n.display_number))}</div>
          </div>
        </div>
        ${y}
      </div>
      ${h}
      <div class="banks">${E}</div>
      ${k}
    </div>
  `}function Y(n,e){var d;const t=W(),a=T[t],i=e.getElementById("videoWrap");if(i){const s=n.settings.onboarding_video_url??"",g=ce(s);g!==null&&le()?i.innerHTML=`
        <div class="kb-video-wrap">
          <iframe
            src="https://www.youtube.com/embed/${g}"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            title="How to Deposit"
          ></iframe>
        </div>
      `:i.innerHTML=""}const r=n.agents.filter(s=>s.status==="live"),o=n.agents.filter(s=>s.status==="recently_offline").sort((s,g)=>{const x=s.last_seen_at?new Date(s.last_seen_at).getTime():0;return(g.last_seen_at?new Date(g.last_seen_at).getTime():0)-x}),m=r.filter(s=>s.is_pinned),b=r.filter(s=>!s.is_pinned),$=[...m,...n.settings.shuffle_live_agents?oe(b):b],v=((d=n.settings)==null?void 0:d.chat_prefilled_message)||"Hi Kemerbet agent, I want to deposit",E=e.getElementById("liveCountText");E&&(E.textContent=r.length>0?`${r.length} ${a.agents_online}`:a.no_agents_online);const h=e.getElementById("liveCountInline");h&&(h.textContent=`${r.length} ${a.live_count}`);const y=e.getElementById("liveGrid");y&&(r.length===0?y.innerHTML=`
        <div class="empty-state">
          <div class="icon">○</div>
          <h3>${a.no_agents_title}</h3>
          <p>${a.no_agents_desc}</p>
        </div>
      `:y.innerHTML=$.map(s=>P(s,v,t)).join(""));const k=e.getElementById("offlineWrap"),u=e.getElementById("offlineGrid");k&&u&&(o.length>0?(k.style.display="block",u.innerHTML=o.map(s=>P(s,v,t)).join("")):k.style.display="none")}const G="kemerbet_recent_agents",pe=20;function J(){try{const n=localStorage.getItem(G);if(!n)return[];const e=JSON.parse(n);return Array.isArray(e)?e.filter(t=>t&&typeof t.agent_id=="number"&&typeof t.ts=="number"):[]}catch{return[]}}function ge(n){try{localStorage.setItem(G,JSON.stringify(n.slice(0,pe)))}catch{}}function O(n,e){const t=J().filter(a=>a.agent_id!==n);t.unshift({agent_id:n,intent:e,ts:Date.now()}),ge(t)}function ue(n,e){const t=new Map(n.map(i=>[i.id,i])),a=[];for(const i of J().sort((r,o)=>o.ts-r.ts)){const r=t.get(i.agent_id);if(r&&(a.push({entry:i,agent:r}),a.length>=e))break}return a}function N(n){const e=window.location.origin;let t=n||"/sport/popup/withdrawal";if(/^https?:\/\//i.test(t))try{const a=new URL(t);t=a.pathname+a.search+a.hash}catch{t="/sport/popup/withdrawal"}return t.startsWith("/")||(t="/"+t),e+t}function me(n,e){var i,r,o;const t=e.withdrawal_id??"",a=((i=e.payout)==null?void 0:i.account)??"";return n.replace(/\{amount\}/g,e.amount!=null?e.amount.toLocaleString("en-US"):"").replace(/\{withdrawal_id\}/g,t?"`"+t+"`":"").replace(/\{name\}/g,((r=e.payout)==null?void 0:r.name)??"").replace(/\{bank\}/g,((o=e.payout)==null?void 0:o.bank)??"").replace(/\{account\}/g,a?"`"+a+"`":"")}function K(n,e){return`https://telegram.me/${encodeURIComponent(n)}?text=${encodeURIComponent(e)}`}function fe(n){const e=me(n.messageTemplate,{amount:n.amount,withdrawal_id:n.agent.withdrawal_id??"",payout:n.payout??null}),t=K(n.agent.telegram_username,e),a=N(n.redirectPath);window.open(t,"_blank","noopener"),window.location.href=a}function V(n){window.location.href=N(n)}const F="kemerbet_payout_accounts",be=4;function D(){try{const n=localStorage.getItem(F);if(!n)return[];const e=JSON.parse(n);return Array.isArray(e)?e.filter(t=>t&&typeof t.name=="string"&&typeof t.bank=="string"&&typeof t.account=="string"):[]}catch{return[]}}function Q(n){try{localStorage.setItem(F,JSON.stringify(n.slice(0,be)))}catch{}}function he(n){const e=n.name.trim(),t=n.bank.trim(),a=n.account.trim();if(!e||!t||!a)return;const i=D().filter(r=>!(r.bank===t&&r.account===a));i.unshift({name:e,bank:t,account:a,ts:Date.now()}),Q(i)}function xe(n,e){const t=n.trim(),a=e.trim();Q(D().filter(i=>!(i.bank===t&&i.account===a)))}function we(n){const e=n.trim();if(!e)return null;const t=D().filter(a=>a.bank===e).sort((a,i)=>i.ts-a.ts)[0];return t?{name:t.name,bank:t.bank,account:t.account}:null}function ve(n){return D().sort((e,t)=>t.ts-e.ts).slice(0,n).map(e=>({name:e.name,bank:e.bank,account:e.account}))}let M=0,I={name:"",bank:"",account:""};function C(n){return n.toLocaleString("en-US")}function S(n,e){var t;["Home","Deposit","Amount","Results"].forEach(a=>{const i=n.getElementById("screen"+a);i&&i.classList.toggle("active",a.toLowerCase()===e)}),(t=n.getElementById("screen"+e.charAt(0).toUpperCase()+e.slice(1)))==null||t.scrollIntoView({block:"nearest"})}function X(n){if(!n)return null;const e=[/youtube\.com\/watch\?v=([\w\-_]+)/i,/youtube\.com\/embed\/([\w\-_]+)/i,/youtu\.be\/([\w\-_]+)/i];for(const t of e){const a=n.match(t);if(a)return a[1]}return null}function ye(n,e){return`
    <div class="videobox" data-video="${_(e)}">
      <div class="vplay">▶</div>
      <b>${n.withdraw_howto}</b>
      <small>${n.withdraw_howto_sub}</small>
    </div>`}function R(n,e){let t=n.getElementById("wToast");t||(t=document.createElement("div"),t.id="wToast",t.className="wtoast",n.appendChild(t)),t.innerHTML=e,t.classList.add("show"),window.setTimeout(()=>t&&t.classList.remove("show"),4500)}function Z(n){const{shadow:e,getData:t}=n,a=t();if(!a)return;const i=W(),r=T[i],o=a.settings.withdrawals_enabled!==!1,m=e.querySelector("#screenDeposit .backrow");o?m&&(m.style.display=""):(m&&(m.style.display="none"),S(e,"deposit"));const b=e.getElementById("noticeWrap"),$=e.getElementById("noticeWrapDep"),v=o?b:$,E=o?$:b;if(E&&(E.innerHTML=""),v){const k=a.notices??[];k.length===0?v.innerHTML="":v.innerHTML=k.map(u=>{const s=(u.video_url?X(u.video_url):null)?`<div class="videobox nb-video" data-video="${_(u.video_url??"")}"><div class="vplay">▶</div><b>${r.withdraw_howto}</b></div>`:"";return`
            <div class="notice">
              <div class="nb-tag">${u.priority==="urgent"?"📣":"📌"} ${_(u.title||"")}</div>
              <p>${_(u.body)}</p>
              ${s}
            </div>`}).join("")}const h=e.getElementById("recentsWrap");if(h)if(a.settings.recents_enabled){const k=ue(a.directory??[],a.settings.recents_count??5);if(k.length===0)h.style.display="none";else{h.style.display="block";const u=k.map(s=>{const g=s.agent,x=String(g.display_number).padStart(2,"0"),f=g.online,l=f?r.recents_online:r.recents_offline,p=s.entry.intent==="withdrawal",c=p?r.intent_withdraw:r.deposit,L=f?p?"wdr":"dep":"grey";return`
              <div class="recent${f?"":" is-off"}">
                <div class="agent-avatar ${f?"live":"off"}">${x}</div>
                <div class="rc-mid">
                  <div class="rc-name">${r.agent} ${_(String(g.display_number))}</div>
                  <div class="rc-sub">${l}</div>
                </div>
                <div class="rc-btns">
                  <button class="btn-s ${L}" data-recent-main data-agent-id="${g.id}" data-intent="${s.entry.intent}">${c}</button>
                  <button class="btn-s line" data-recent-contact data-agent-id="${g.id}">${r.recents_contact}</button>
                </div>
              </div>`}).join(""),d=e.getElementById("recentsGrid");d&&(d.innerHTML=u)}}else h.style.display="none";const y=e.getElementById("intentQuestion");y&&(y.textContent=r.intent_question)}function H(n){var L,z;const{shadow:e,getData:t}=n,a=t();if(!a)return;const i=W(),r=T[i],o=a.settings.withdrawal_min??200,m=a.settings.withdrawal_howto_video_url??"",b=e.getElementById("screenAmount");if(!b)return;const $=a.settings.withdrawal_require_payout_details!==!1,v=a.settings.withdrawal_bank_options??[],E=['<option value="">'+r.payout_bank_ph+"</option>"].concat(v.map(w=>`<option value="${_(w)}">${_(w)}</option>`)).join(""),h=$?ve(4):[],y=h.length?`<div class="payout-saved" id="payoutSaved">${h.map((w,B)=>`<div class="psug" data-sug="${B}"><button class="psug-x" data-del="${B}" aria-label="Delete">✕</button><span class="psug-name">${_(w.name)}</span><span class="psug-meta">${_(w.bank)} · ${_(w.account)}</span></div>`).join("")}</div>`:"",k=$?`
    <div class="payout">
      <div class="payout-title">${r.payout_title}</div>
      <input class="pf" id="pfName" type="text" autocomplete="off" placeholder="${r.payout_name_ph}" value="${_(I.name)}" />
      <select class="pf" id="pfBank">${E}</select>
      <input class="pf" id="pfAccount" type="text" inputmode="numeric" autocomplete="off" placeholder="${r.payout_account_ph}" value="${_(I.account)}" />
      ${y}
    </div>`:"";b.innerHTML=`
    <div class="backrow"><button class="backbtn" data-nav="home">←</button><h2>${r.withdraw_title}</h2></div>
    ${m?ye(r,m):""}
    ${k}
    <div class="amount-wrap">
      <label>${r.withdraw_amount_label}</label>
      <div class="amt-line">
        <input id="amtInput" type="text" inputmode="numeric" placeholder="0" />
        <b>ETB</b>
      </div>
      <div class="amt-hint" id="amtHint">${r.withdraw_min_prefix} ${C(o)} ETB</div>
    </div>
    <button class="bigcta" id="amtGo" disabled>${r.withdraw_see_agents}</button>
    <button class="ownagent" id="ownAgentBtn"><span class="ow">${r.withdraw_own_agent}<small>${r.withdraw_own_agent_desc}</small></span><span>→</span></button>
  `;const u=e.getElementById("amtInput"),d=e.getElementById("amtHint"),s=e.getElementById("amtGo"),g=e.getElementById("pfName"),x=e.getElementById("pfBank"),f=e.getElementById("pfAccount");x&&I.bank&&(x.value=I.bank);const l=()=>$?I.name.trim()!==""&&I.bank.trim()!==""&&I.account.trim()!=="":!0,p=()=>{I={name:(g==null?void 0:g.value)??"",bank:(x==null?void 0:x.value)??"",account:(f==null?void 0:f.value)??""}},c=()=>{if(!u||!d||!s)return;const w=u.value.replace(/[^0-9]/g,"");M=parseInt(w||"0",10),w&&(u.value=C(M));const B=M>=o;M>0&&M<o?(d.textContent=`${r.withdraw_min_error} ${C(o)} ETB`,d.classList.add("err")):(d.textContent=`${r.withdraw_min_prefix} ${C(o)} ETB`,d.classList.remove("err")),s.disabled=!(B&&l())};u==null||u.addEventListener("input",c),g==null||g.addEventListener("input",()=>{p(),c()}),f==null||f.addEventListener("input",()=>{p(),c()}),x==null||x.addEventListener("change",()=>{p();const w=we(I.bank);w&&(g&&!g.value.trim()&&(g.value=w.name),f&&!f.value.trim()&&(f.value=w.account),p()),c()}),e.querySelectorAll("#screenAmount .psug").forEach(w=>{w.addEventListener("click",B=>{const Le=parseInt(w.dataset.sug,10),A=h[Le];if(!A)return;if(B.target.closest("[data-del]")){B.stopPropagation(),xe(A.bank,A.account),H(n);return}g&&(g.value=A.name),x&&(x.value=A.bank),f&&(f.value=A.account),p(),c()})}),s==null||s.addEventListener("click",()=>{M>=o&&l()&&($&&he(I),ke(n,M),S(e,"results"))}),(L=e.getElementById("ownAgentBtn"))==null||L.addEventListener("click",()=>{const w=a.settings.withdrawal_redirect_path;R(e,U(w)),V(w)}),(z=e.querySelector('#screenAmount [data-nav="home"]'))==null||z.addEventListener("click",()=>S(e,"home")),ee(e),c()}function U(n){const e=N(n);return`Opening the cashier withdrawals — pick <b>AgentEpos</b> and withdraw directly. <br><small>${_(e)}</small>`}function _e(n){const e=[...n];for(let t=e.length-1;t>0;t--){const a=Math.floor(Math.random()*(t+1));[e[t],e[a]]=[e[a],e[t]]}return e}function ke(n,e){var u;const{shadow:t,getData:a}=n,i=a();if(!i)return;const r=W(),o=T[r],m=t.getElementById("screenResults");if(!m)return;const b=I.bank.trim(),$=d=>b?(d.withdrawal_methods??[]).some(s=>s.display_name===b||s.slug===b):!0,v=i.agents.filter(d=>d.status==="live"&&d.accepts_withdrawals&&d.withdrawal_id&&$(d)),E=_e(v.filter(d=>(d.withdrawal_max??0)>=e));let h,y=!1;E.length>0?h=E:i.settings.withdrawal_no_match_behavior==="closest"?(y=!0,h=[...v].sort((d,s)=>(s.withdrawal_max??0)-(d.withdrawal_max??0)).slice(0,3)):(y=!0,h=[]);const k=h.map(d=>{const s=String(d.display_number).padStart(2,"0"),g=(d.withdrawal_max??0)>=e,x=(d.withdrawal_methods||[]).map(l=>`<span class="bank">${_(l.display_name)}</span>`).join(""),f=g?o.results_withdraw_here:o.results_withdraw_partial;return`
        <div class="agent-card live">
          <div class="agent-top">
            <div class="agent-name-wrap"><div class="agent-avatar live">${s}</div><div class="agent-name">${o.agent} ${_(String(d.display_number))}</div></div>
            <span class="cap-chip">${o.results_cap_prefix} ${C(d.withdrawal_max??0)} ETB</span>
          </div>
          <div class="waiting-text"><span class="typing-dots"><span></span><span></span><span></span></span>${o.results_ready}</div>
          <div class="banks">${x}</div>
          <button class="deposit-btn gold" data-withdraw-here data-agent-id="${d.id}"><span>${f}</span><span>→</span></button>
        </div>`}).join("");m.innerHTML=`
    <div class="backrow"><button class="backbtn" data-nav="amount">←</button><h2>${o.results_title}</h2></div>
    <div class="res-head">
      <div><small>${o.results_withdrawing}</small><b>${C(e)} ETB</b></div>
      <button data-nav="amount">${o.results_change}</button>
    </div>
    <button class="ownagent" style="margin:0 0 15px" id="ownAgentBtn2"><span class="ow">${o.withdraw_own_agent}<small>${o.withdraw_own_agent_desc}</small></span><span>→</span></button>
    ${y?`<div class="nores"><h4>${o.results_none_title}</h4><p>${o.results_none_desc}</p></div>`:""}
    <div class="agent-grid" id="resList">${k}</div>
  `,t.querySelectorAll('#screenResults [data-nav="amount"]').forEach(d=>d.addEventListener("click",()=>S(t,"amount"))),(u=t.getElementById("ownAgentBtn2"))==null||u.addEventListener("click",()=>{const d=i.settings.withdrawal_redirect_path;R(t,U(d)),V(d)}),t.querySelectorAll("#screenResults [data-withdraw-here]").forEach(d=>{d.addEventListener("click",()=>{const s=parseInt(d.dataset.agentId,10),g=h.find(f=>f.id===s);if(!g)return;const x=(g.withdrawal_max??0)>=e;n.trackClick(s,"withdrawal",{amount:e,source:x?"list":"partial"}),R(t,U(i.settings.withdrawal_redirect_path)),fe({agent:g,amount:e,messageTemplate:i.settings.withdrawal_message_with_amount,redirectPath:i.settings.withdrawal_redirect_path,payout:I})})})}function $e(n,e,t){const{shadow:a,getData:i}=n,r=i();if(!r)return;const o=(r.directory??[]).find(b=>b.id===e);if(!o)return;if(t==="withdrawal"){H(n),S(a,"amount");return}const m=K(o.telegram_username,r.settings.chat_prefilled_message);o.online?(n.trackClick(e,"deposit",{source:"recent"}),window.open(m,"_blank","noopener")):n.openOfflineModal(m,e,[])}function Ee(n,e){const t=n.getData();if(!t)return;const a=(t.directory??[]).find(i=>i.id===e);a&&(n.trackClick(e,"contact",{source:"recent"}),window.open(`https://telegram.me/${encodeURIComponent(a.telegram_username)}`,"_blank","noopener"))}function ee(n){n.querySelectorAll(".videobox").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.video||"",a=X(t);a&&(e.innerHTML=`<iframe src="https://www.youtube.com/embed/${a}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen title="How to withdraw"></iframe>`)})})}function Ie(n){const e=n.dataset.api;if(e)return e;const t=document.querySelectorAll('script[src*="embed.js"]'),a=t[t.length-1];if(a!=null&&a.src)try{return new URL(a.src).origin}catch{}return window.location.origin}function te(){var g,x,f;const n=document.getElementById("kemerbet-agents");if(!n)return;const e=Ie(n),t=n.attachShadow({mode:"open"}),a=document.createElement("style");a.textContent=ae,t.appendChild(a);const i=W();n.setAttribute("lang",i);const r=document.createElement("div");r.innerHTML=Se(i),t.appendChild(r),ne(i,t,n),sessionStorage.getItem("kemerbet_visited")||(sessionStorage.setItem("kemerbet_visited","1"),fetch(`${e}/api/public/visit`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({referrer:document.referrer||null})}).catch(()=>{}));let o=null,m=null,b=null,$=null,v=null;function E(){const l=t.getElementById("refreshIndicator");l&&(l.classList.add("show"),setTimeout(()=>l.classList.remove("show"),1400))}function h(l,p){fetch(`${e}/api/public/agents/${l}/click`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({referrer:window.location.href,payment_methods:p&&p.length>0?p:null}),keepalive:!0}).catch(()=>{})}const y={shadow:t,apiBase:e,getData:()=>o,trackClick:(l,p,c)=>{O(l,p),fetch(`${e}/api/public/agents/${l}/click`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({referrer:window.location.href,intent:p,amount:(c==null?void 0:c.amount)??null,source:(c==null?void 0:c.source)??null,payment_methods:c!=null&&c.paymentMethods&&c.paymentMethods.length>0?c.paymentMethods:null}),keepalive:!0}).catch(()=>{})},openOfflineModal:(l,p,c)=>{m=l,b=String(p),$=c,d()}};async function k(){E();try{const l=await fetch(`${e}/api/public/agents`);if(!l.ok)throw new Error(`HTTP ${l.status}`);const p=await l.json();o=p,Y(p,t),Z(y),ee(t)}catch{console.warn("[kemerbet-agents] fetch failed, retrying in 60s")}}function u(){v=window.setTimeout(async()=>{document.hidden||await k(),document.hidden?v=null:u()},6e4)}document.addEventListener("visibilitychange",()=>{document.hidden?v!==null&&(clearTimeout(v),v=null):v===null&&(k(),u())});function d(){var l;(l=t.getElementById("offlineWarnModal"))==null||l.classList.add("show")}function s(){var l;(l=t.getElementById("offlineWarnModal"))==null||l.classList.remove("show"),m=null,b=null,$=null}(g=t.getElementById("confirmDepositBtn"))==null||g.addEventListener("click",()=>{b&&(h(b,$??void 0),O(parseInt(b,10),"deposit")),m&&window.open(m,"_blank","noopener"),s()}),(x=t.getElementById("cancelWarnBtn"))==null||x.addEventListener("click",()=>{s()}),(f=t.getElementById("offlineWarnModal"))==null||f.addEventListener("click",l=>{l.target.id==="offlineWarnModal"&&s()}),document.addEventListener("keydown",l=>{if(l.key==="Escape"){const p=t.getElementById("offlineWarnModal");p!=null&&p.classList.contains("show")&&s()}}),t.addEventListener("click",l=>{const c=l.target.closest("[data-agent-id]");if(!c)return;const L=c.dataset.agentId,z=JSON.parse(c.dataset.paymentMethods||"[]");c.dataset.offline==="true"?(l.preventDefault(),m=c.dataset.depositUrl||null,b=L,$=z,d()):(h(L,z),O(parseInt(L,10),"deposit"))}),t.addEventListener("click",l=>{const p=l.target,c=p.closest("[data-intent-choice]");if(c){c.dataset.intentChoice==="withdraw"?(H(y),S(t,"amount")):S(t,"deposit");return}if(p.closest('#screenDeposit [data-nav="home"]')){S(t,"home");return}const z=p.closest("[data-recent-main]");if(z){$e(y,parseInt(z.dataset.agentId,10),z.dataset.intent);return}const w=p.closest("[data-recent-contact]");if(w){Ee(y,parseInt(w.dataset.agentId,10));return}}),t.querySelectorAll(".lang-btn").forEach(l=>{l.addEventListener("click",()=>{var c;const p=l.dataset.lang;re(p),ne(p,t,n),o&&(Y(o,t),Z(y),(c=t.getElementById("screenAmount"))!=null&&c.classList.contains("active")&&(H(y),S(t,"amount")))})}),k(),u()}function ne(n,e,t){const a=T[n];t.setAttribute("lang",n),e.querySelectorAll("[data-i18n]").forEach(i=>{const r=i.dataset.i18n;a[r]!==void 0&&(i.textContent=a[r])}),e.querySelectorAll(".lang-btn").forEach(i=>{const r=i;r.classList.toggle("active",r.dataset.lang===n)})}function Se(n){const e=T[n];return`
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
  `}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",te):te()})();
