(function(){"use strict";const K=`
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
}

*{box-sizing:border-box;margin:0;padding:0}

:host{
  font-family:'Inter','Noto Sans Ethiopic',system-ui,-apple-system,sans-serif;
  background:var(--bg-dark);
  background-image:
    radial-gradient(circle at 20% 0%,rgba(0,168,107,0.15) 0%,transparent 50%),
    radial-gradient(circle at 80% 100%,rgba(245,197,24,0.08) 0%,transparent 50%);
  color:var(--text-light);
  min-height:100vh;
  -webkit-font-smoothing:antialiased;
  display:block;
}

.agents-wrapper{
  max-width:1280px;
  margin:auto;
  padding:24px 20px 80px;
}

/* TOP BAR */
.topbar{
  display:flex;
  justify-content:flex-end;
  align-items:center;
  margin-bottom:20px;
}

.lang-switcher{
  display:inline-flex;
  background:var(--card-bg);
  border:1px solid var(--card-border);
  border-radius:999px;
  padding:3px;
  gap:2px;
  backdrop-filter:blur(10px);
}

.lang-btn{
  padding:6px 14px;
  border:none;
  background:transparent;
  color:var(--text-muted);
  font-family:inherit;
  font-weight:700;
  font-size:.78rem;
  border-radius:999px;
  cursor:pointer;
  transition:all .25s ease;
  letter-spacing:.5px;
}

.lang-btn:hover{color:var(--text-light)}

.lang-btn.active{
  background:linear-gradient(135deg,var(--gold),var(--gold-light));
  color:var(--bg-darker);
  box-shadow:0 2px 8px rgba(245,197,24,0.3);
}

/* HEADER */
.header{
  text-align:center;
  margin-bottom:36px;
  padding:8px 0 16px;
}

.header-logo{
  display:inline-flex;
  align-items:center;
  gap:10px;
  margin-bottom:14px;
  padding:8px 18px;
  background:rgba(0,168,107,0.15);
  border:1px solid rgba(0,168,107,0.4);
  border-radius:999px;
  font-size:.78rem;
  font-weight:800;
  color:var(--green-light);
  letter-spacing:1.2px;
  text-transform:uppercase;
}

.header-logo .live-indicator{
  width:8px;
  height:8px;
  background:var(--green-glow);
  border-radius:50%;
  box-shadow:0 0 12px var(--green-glow);
  animation:headerPulse 1.4s ease-in-out infinite;
}

@keyframes headerPulse{
  0%,100%{opacity:1;transform:scale(1)}
  50%{opacity:.4;transform:scale(.7)}
}

.header h1{
  font-size:2.6rem;
  font-weight:900;
  background:linear-gradient(135deg,var(--gold),var(--gold-light));
  -webkit-background-clip:text;
  -webkit-text-fill-color:transparent;
  background-clip:text;
  letter-spacing:-1px;
  margin-bottom:10px;
}

:host([lang="am"]) .header h1{
  font-size:2.2rem;
  letter-spacing:-.5px;
}

.header p{
  color:var(--text-muted);
  font-size:.95rem;
  max-width:560px;
  margin:0 auto;
}

:host([lang="am"]) .header p{
  font-size:.92rem;
  line-height:1.6;
}

/* SECTION TITLE */
.section-title{
  display:flex;
  align-items:center;
  justify-content:space-between;
  margin-bottom:18px;
  flex-wrap:wrap;
  gap:12px;
}

.section-title h2{
  font-size:1.4rem;
  font-weight:800;
  color:var(--text-light);
  display:flex;
  align-items:center;
  gap:10px;
  letter-spacing:-.3px;
}

:host([lang="am"]) .section-title h2{
  font-size:1.25rem;
  letter-spacing:0;
}

.section-title h2::before{
  content:"";
  width:4px;
  height:22px;
  background:linear-gradient(180deg,var(--gold),var(--green-primary));
  border-radius:2px;
}

.agent-count{
  background:rgba(0,168,107,0.15);
  color:var(--green-light);
  padding:6px 13px;
  border-radius:999px;
  font-size:.82rem;
  font-weight:800;
  border:1px solid rgba(0,168,107,0.3);
  letter-spacing:.3px;
}

:host([lang="am"]) .agent-count{letter-spacing:0;font-size:.78rem}

/* OFFLINE DIVIDER */
.offline-divider{
  display:flex;
  align-items:center;
  gap:14px;
  margin:32px 0 18px;
  color:var(--text-dim);
  font-size:.74rem;
  font-weight:800;
  text-transform:uppercase;
  letter-spacing:1.5px;
}

:host([lang="am"]) .offline-divider{
  text-transform:none;
  letter-spacing:0;
  font-size:.85rem;
}

.offline-divider::before,
.offline-divider::after{
  content:"";
  flex:1;
  height:1px;
  background:linear-gradient(90deg,transparent,var(--card-border),transparent);
}

/* VIDEO */
.kb-video-wrap{
  position:relative;
  padding-bottom:56.25%;
  height:0;
  margin:0 0 16px 0;
  border-radius:12px;
  overflow:hidden;
  background:#000;
}
.kb-video-wrap iframe{
  position:absolute;
  top:0;
  left:0;
  width:100%;
  height:100%;
  border:0;
}

/* GRID */
.agent-grid{
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(290px,1fr));
  gap:16px;
}

/* CARD */
.agent-card{
  background:var(--card-bg);
  backdrop-filter:blur(10px);
  border:1px solid var(--card-border);
  border-radius:16px;
  padding:16px 16px 14px;
  transition:all .3s ease;
  position:relative;
  overflow:hidden;
  display:flex;
  flex-direction:column;
}

.agent-card::before{
  content:"";
  position:absolute;
  top:0;
  left:0;
  right:0;
  height:2px;
  background:linear-gradient(90deg,var(--green-primary),var(--gold));
  opacity:0;
  transition:opacity .3s ease;
}

.agent-card:hover{
  transform:translateY(-3px);
  border-color:rgba(0,168,107,0.4);
  box-shadow:0 12px 36px rgba(0,0,0,.4);
}

.agent-card:hover::before{opacity:1}

.agent-card.live{
  border-color:rgba(34,255,154,0.22);
  background:linear-gradient(135deg,rgba(0,168,107,0.07) 0%,rgba(255,255,255,0.04) 100%);
  animation:cardBreathe 3s ease-in-out infinite;
}

@keyframes cardBreathe{
  0%,100%{box-shadow:0 0 0 0 rgba(34,255,154,0.08)}
  50%{box-shadow:0 0 0 1px rgba(34,255,154,0.3),0 0 22px rgba(34,255,154,0.08)}
}

.agent-card.live:hover{
  animation:none;
  border-color:rgba(34,255,154,0.5);
  box-shadow:0 12px 36px rgba(0,0,0,.4),0 0 0 1px rgba(34,255,154,0.4),0 0 28px rgba(34,255,154,0.12);
}

.agent-card.offline{
  opacity:0.55;
  filter:saturate(0.6);
}

.agent-card.offline:hover{
  opacity:0.8;
  filter:saturate(0.85);
}

.agent-top{
  display:flex;
  justify-content:space-between;
  align-items:center;
  margin-bottom:12px;
}

.agent-name-wrap{
  display:flex;
  align-items:center;
  gap:11px;
}

.agent-avatar{
  width:42px;
  height:42px;
  border-radius:11px;
  background:linear-gradient(135deg,var(--green-primary),var(--green-dark));
  display:flex;
  align-items:center;
  justify-content:center;
  font-weight:900;
  font-size:.95rem;
  color:#fff;
  border:1.5px solid rgba(255,255,255,0.12);
  letter-spacing:-.5px;
  flex-shrink:0;
  position:relative;
}

.agent-card.offline .agent-avatar{
  background:linear-gradient(135deg,#3a4a64,#2a3850);
}

.agent-card.live .agent-avatar::after{
  content:"";
  position:absolute;
  bottom:-2px;
  right:-2px;
  width:12px;
  height:12px;
  background:var(--green-glow);
  border:2.5px solid var(--bg-dark);
  border-radius:50%;
  box-shadow:0 0 8px var(--green-glow);
  animation:avatarBlink 1s ease-in-out infinite;
}

@keyframes avatarBlink{
  0%,100%{opacity:1;transform:scale(1)}
  50%{opacity:.5;transform:scale(.85)}
}

.agent-name{
  font-weight:800;
  font-size:1rem;
  color:var(--text-light);
  line-height:1.1;
  letter-spacing:-.2px;
}

/* LIVE BADGE */
.badge.live{
  position:relative;
  background:linear-gradient(135deg,var(--green-primary),var(--green-dark));
  color:#fff;
  font-size:.66rem;
  padding:5px 10px 5px 19px;
  border-radius:999px;
  font-weight:900;
  letter-spacing:1.5px;
  text-transform:uppercase;
  border:1px solid rgba(34,255,154,0.4);
  animation:liveBadgePulse 1.5s ease-in-out infinite;
}

:host([lang="am"]) .badge.live{
  letter-spacing:.3px;
  text-transform:none;
  font-size:.72rem;
  padding:5px 11px 5px 20px;
}

.badge.live::before{
  content:"";
  position:absolute;
  left:8px;
  top:50%;
  transform:translateY(-50%);
  width:7px;
  height:7px;
  background:var(--green-glow);
  border-radius:50%;
  box-shadow:0 0 10px var(--green-glow);
  animation:liveBadgeBlink .9s ease-in-out infinite;
}

@keyframes liveBadgePulse{
  0%,100%{box-shadow:0 0 0 0 rgba(34,255,154,0.5)}
  50%{box-shadow:0 0 0 6px rgba(34,255,154,0)}
}

@keyframes liveBadgeBlink{
  0%,100%{opacity:1;transform:translateY(-50%) scale(1)}
  50%{opacity:.3;transform:translateY(-50%) scale(.7)}
}

.badge.offline{
  background:rgba(255,255,255,0.04);
  color:var(--text-dim);
  font-size:.66rem;
  padding:5px 10px;
  border-radius:999px;
  font-weight:800;
  letter-spacing:1px;
  text-transform:uppercase;
  border:1px solid var(--card-border);
  display:flex;
  align-items:center;
  gap:5px;
}

:host([lang="am"]) .badge.offline{
  text-transform:none;
  letter-spacing:0;
  font-size:.72rem;
}

.badge.offline::before{
  content:"";
  width:6px;
  height:6px;
  background:var(--text-dim);
  border-radius:50%;
}

/* WAITING / LAST SEEN */
.waiting-text{
  font-size:.74rem;
  color:var(--green-light);
  margin-bottom:11px;
  display:flex;
  align-items:center;
  gap:7px;
  font-weight:700;
  letter-spacing:.3px;
}

:host([lang="am"]) .waiting-text{font-size:.82rem;letter-spacing:0}

.waiting-text .typing-dots{display:inline-flex;gap:3px}

.waiting-text .typing-dots span{
  width:3px;
  height:3px;
  background:var(--green-light);
  border-radius:50%;
  animation:typing 1.4s ease-in-out infinite;
}

.waiting-text .typing-dots span:nth-child(2){animation-delay:.2s}
.waiting-text .typing-dots span:nth-child(3){animation-delay:.4s}

@keyframes typing{
  0%,60%,100%{opacity:.3;transform:translateY(0)}
  30%{opacity:1;transform:translateY(-2px)}
}

.last-seen{
  font-size:.74rem;
  color:var(--text-dim);
  margin-bottom:11px;
  display:flex;
  align-items:center;
  gap:6px;
  font-weight:600;
}

:host([lang="am"]) .last-seen{font-size:.82rem}

/* BANKS */
.banks{
  display:flex;
  flex-wrap:wrap;
  gap:5px;
  margin-bottom:13px;
  padding-top:11px;
  border-top:1px solid var(--card-border);
}

.bank{
  background:linear-gradient(135deg,rgba(255,255,255,0.1),rgba(255,255,255,0.05));
  border:1px solid rgba(255,255,255,0.14);
  padding:5px 10px;
  font-size:.72rem;
  border-radius:6px;
  font-weight:800;
  color:var(--text-light);
  letter-spacing:.3px;
  text-shadow:0 1px 0 rgba(0,0,0,0.2);
}

.agent-card.live .bank{
  background:linear-gradient(135deg,rgba(0,168,107,0.2),rgba(0,168,107,0.08));
  border-color:rgba(0,168,107,0.32);
}

.agent-card.offline .bank{
  background:rgba(255,255,255,0.04);
  border-color:var(--card-border);
  color:var(--text-muted);
  font-weight:700;
}

/* DEPOSIT BUTTON */
.deposit-btn{
  margin-top:auto;
  display:flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  width:100%;
  padding:11px 14px;
  background:linear-gradient(135deg,var(--green-primary),var(--green-dark));
  color:#fff;
  text-decoration:none;
  border-radius:10px;
  font-size:.88rem;
  font-weight:800;
  transition:all .2s ease;
  border:none;
  cursor:pointer;
  letter-spacing:.3px;
  box-shadow:0 4px 12px rgba(0,168,107,0.25);
  position:relative;
  overflow:hidden;
  font-family:inherit;
}

:host([lang="am"]) .deposit-btn{font-size:.95rem;letter-spacing:0}

.deposit-btn::after{
  content:"";
  position:absolute;
  top:0;
  left:-100%;
  width:100%;
  height:100%;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent);
}

.agent-card.live .deposit-btn::after{
  animation:shimmer 3s ease-in-out infinite;
}

@keyframes shimmer{
  0%{left:-100%}
  60%,100%{left:100%}
}

.deposit-btn .arrow{transition:transform .2s ease}

.deposit-btn:hover{
  transform:translateY(-1px);
  box-shadow:0 8px 20px rgba(0,168,107,0.4);
  background:linear-gradient(135deg,var(--green-light),var(--green-primary));
}

.deposit-btn:hover .arrow{transform:translateX(3px)}

.agent-card.offline .deposit-btn{
  background:linear-gradient(135deg,#3a4a64,#2a3850);
  box-shadow:none;
}

.agent-card.offline .deposit-btn:hover{
  background:linear-gradient(135deg,var(--green-primary),var(--green-dark));
  box-shadow:0 4px 12px rgba(0,168,107,0.25);
}

/* EMPTY STATE */
.empty-state{
  grid-column:1/-1;
  text-align:center;
  padding:48px 20px;
  color:var(--text-muted);
  background:var(--card-bg);
  border:1px dashed var(--card-border);
  border-radius:14px;
}

.empty-state .icon{font-size:2.2rem;margin-bottom:12px;opacity:.5}

.empty-state h3{
  font-size:1.05rem;
  margin-bottom:6px;
  color:var(--text-light);
  font-weight:700;
}

/* REFRESH INDICATOR */
.refresh-indicator{
  position:fixed;
  top:18px;
  left:18px;
  background:rgba(0,168,107,0.15);
  border:1px solid rgba(0,168,107,0.3);
  color:var(--green-light);
  padding:7px 12px;
  border-radius:999px;
  font-size:.72rem;
  font-weight:700;
  display:flex;
  align-items:center;
  gap:7px;
  opacity:0;
  transform:translateY(-8px);
  transition:all .3s ease;
  z-index:50;
  backdrop-filter:blur(10px);
}

.refresh-indicator.show{opacity:1;transform:translateY(0)}

.refresh-indicator .spinner{
  width:9px;
  height:9px;
  border:1.5px solid rgba(29,216,140,0.3);
  border-top-color:var(--green-light);
  border-radius:50%;
  animation:spin .8s linear infinite;
}

@keyframes spin{to{transform:rotate(360deg)}}

/* OFFLINE WARNING MODAL */
.modal-backdrop{
  position:fixed;
  inset:0;
  background:rgba(0,0,0,0.75);
  backdrop-filter:blur(8px);
  z-index:200;
  display:none;
  align-items:center;
  justify-content:center;
  padding:20px;
  animation:fadeIn .2s ease;
}

.modal-backdrop.show{display:flex}

@keyframes fadeIn{from{opacity:0}to{opacity:1}}

.modal-warn{
  background:linear-gradient(135deg,var(--bg-darker),var(--bg-dark));
  border:1px solid rgba(245,197,24,0.3);
  border-radius:18px;
  padding:28px 24px 22px;
  max-width:420px;
  width:100%;
  text-align:center;
  position:relative;
  animation:slideUpModal .3s cubic-bezier(.4,0,.2,1);
  box-shadow:0 20px 60px rgba(0,0,0,0.5),0 0 0 1px rgba(245,197,24,0.15),0 0 60px rgba(245,197,24,0.1);
}

@keyframes slideUpModal{
  from{transform:translateY(20px) scale(.96);opacity:0}
  to{transform:translateY(0) scale(1);opacity:1}
}

.modal-warn .icon-wrap{
  width:64px;
  height:64px;
  margin:0 auto 16px;
  background:linear-gradient(135deg,rgba(245,197,24,0.2),rgba(245,197,24,0.1));
  border:2px solid rgba(245,197,24,0.4);
  border-radius:50%;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:2rem;
  animation:warnPulse 2s ease-in-out infinite;
}

@keyframes warnPulse{
  0%,100%{box-shadow:0 0 0 0 rgba(245,197,24,0.4)}
  50%{box-shadow:0 0 0 10px rgba(245,197,24,0)}
}

.modal-warn h3{
  font-size:1.2rem;
  font-weight:800;
  color:var(--text-light);
  margin-bottom:14px;
  letter-spacing:-.3px;
}

:host([lang="am"]) .modal-warn h3{font-size:1.15rem;letter-spacing:0;line-height:1.4}

.modal-warn p{
  font-size:.92rem;
  color:var(--text-muted);
  line-height:1.55;
  margin-bottom:22px;
}

:host([lang="am"]) .modal-warn p{font-size:.9rem;line-height:1.65}

.modal-actions{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:10px;
}

.modal-btn{
  padding:13px 14px;
  border-radius:11px;
  border:none;
  font-family:inherit;
  font-weight:800;
  font-size:.88rem;
  cursor:pointer;
  transition:all .2s;
  letter-spacing:.3px;
}

:host([lang="am"]) .modal-btn{font-size:.92rem;letter-spacing:0}

.modal-btn.cancel{
  background:rgba(255,255,255,0.06);
  color:var(--text-muted);
  border:1px solid var(--card-border);
}

.modal-btn.cancel:hover{
  background:rgba(255,255,255,0.1);
  color:var(--text-light);
}

.modal-btn.confirm{
  background:linear-gradient(135deg,var(--green-primary),var(--green-dark));
  color:#fff;
  box-shadow:0 4px 12px rgba(0,168,107,0.3);
}

.modal-btn.confirm:hover{
  background:linear-gradient(135deg,var(--green-light),var(--green-primary));
  transform:translateY(-1px);
  box-shadow:0 6px 16px rgba(0,168,107,0.45);
}

@media(max-width:768px){
  .header h1{font-size:2rem}
  :host([lang="am"]) .header h1{font-size:1.7rem}
  .agents-wrapper{padding:18px 14px 60px}
  .agent-grid{grid-template-columns:1fr;gap:12px}
  .refresh-indicator{top:12px;left:12px}
}

/* ===================================================================
   PHASE 2 — intent popup, withdrawal flow, recents
   =================================================================== */

/* screen switching: only one .screen visible at a time */
.screen{display:none}
.screen.active{display:block}

.backrow{display:flex;align-items:center;gap:10px;margin-bottom:16px}
.backbtn{width:34px;height:34px;border-radius:11px;background:var(--card-bg);border:1px solid var(--card-border);color:var(--text-muted);font-size:15px;cursor:pointer;display:grid;place-items:center;font-family:inherit}
.backbtn:hover{color:var(--text-light)}
.backrow h2{font-size:1.05rem;font-weight:800;letter-spacing:-.3px;display:flex;align-items:center;gap:9px}
.backrow h2::before{content:"";width:4px;height:19px;background:linear-gradient(180deg,var(--gold),var(--green-primary));border-radius:2px}

/* --- intent cards --- */
.intent{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:4px}
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

/* --- boxy how-to video --- */
.videobox{position:relative;border-radius:14px;overflow:hidden;border:1px solid var(--card-border);background:linear-gradient(135deg,#0e1d33,#0a1628);aspect-ratio:16/9;margin-bottom:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:9px;transition:.2s}
.videobox:hover{border-color:rgba(245,197,24,.45)}
.videobox::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 50% 40%,rgba(0,168,107,.16),transparent 65%)}
.videobox .vplay{width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--gold-light));display:grid;place-items:center;font-size:17px;color:var(--bg-darker);box-shadow:0 6px 20px rgba(245,197,24,.35);position:relative;z-index:1}
.videobox b{font-size:.8rem;font-weight:800;position:relative;z-index:1}
.videobox small{font-size:.62rem;color:var(--text-dim);font-weight:600;position:relative;z-index:1}
.videobox iframe{position:absolute;inset:0;width:100%;height:100%;border:0}

/* --- amount page --- */
.amount-wrap{background:var(--card-bg);backdrop-filter:blur(10px);border:1px solid var(--card-border);border-radius:20px;padding:24px 18px;text-align:center;margin-bottom:16px}
.amount-wrap label{font-size:.74rem;color:var(--text-muted);display:block;margin-bottom:12px;font-weight:600}
.amt-line{display:flex;align-items:baseline;justify-content:center;gap:8px;border-bottom:2px solid rgba(245,197,24,.5);padding-bottom:10px;margin-bottom:8px}
.amt-line input{background:none;border:0;outline:0;color:var(--text-light);font:900 32px 'Inter',sans-serif;width:168px;text-align:right;letter-spacing:-1px}
.amt-line input::placeholder{color:#26344b}
.amt-line b{font-size:.9rem;color:var(--gold);font-weight:800}
.amt-hint{font-size:.66rem;color:var(--text-dim);font-weight:600}
.amt-hint.err{color:#ef4444}
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

/* --- results header --- */
.res-head{background:rgba(245,197,24,.08);border:1px solid rgba(245,197,24,.3);border-radius:13px;padding:11px 14px;display:flex;justify-content:space-between;align-items:center;margin-bottom:15px}
.res-head small{font-size:.62rem;color:var(--text-muted);display:block;font-weight:600;text-transform:uppercase;letter-spacing:.8px}
.res-head b{font-size:.98rem;background:linear-gradient(135deg,var(--gold),var(--gold-light));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.res-head button{background:none;border:0;color:var(--green-light);font:700 .7rem 'Inter',sans-serif;cursor:pointer;text-decoration:underline}
.nores{background:var(--card-bg);border:1px dashed rgba(255,255,255,.2);border-radius:16px;padding:18px 15px;text-align:center;margin-bottom:15px}
.nores h4{font-size:.85rem;font-weight:800;margin-bottom:5px}
.nores p{font-size:.72rem;color:var(--text-muted);line-height:1.6}
.cap-chip{display:inline-flex;align-items:center;font-size:.66rem;font-weight:800;padding:5px 10px;border-radius:999px;background:rgba(245,197,24,.12);color:var(--gold);border:1px solid rgba(245,197,24,.35);letter-spacing:.3px;white-space:nowrap}
.deposit-btn.gold{background:linear-gradient(135deg,var(--gold),var(--gold-light));color:var(--bg-darker);box-shadow:0 4px 12px rgba(245,197,24,.25)}

/* --- recents --- */
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

/* --- toast (dual-action explainer / status) --- */
.wtoast{position:fixed;left:16px;right:16px;bottom:18px;max-width:520px;margin:auto;background:#0e1d33;border:1px solid rgba(34,255,154,.4);border-radius:13px;padding:12px 14px;font-size:.7rem;line-height:1.6;color:var(--text-light);z-index:9999;display:none;box-shadow:0 12px 36px rgba(0,0,0,.5)}
.wtoast.show{display:block}

/* section title reuse for home */
.section-title span{font-size:.68rem;color:var(--text-dim);font-weight:600}
.intent-mini{font-family:'Noto Sans Ethiopic';font-size:.66rem;opacity:.75;display:block;margin-top:6px}
`,k={am:{title:"Kemerbet ኤጀንቶች",subtitle:"ኦንላይን ያሉ ኤጀንቶች ቅድሚያ ይታያሉ። ዲፖዚት ለማድረግ ይምረጡ።",live_now:"አሁን ኦንላይን",recently_online:"በቅርብ ጊዜ ኦንላይን የነበሩ",agents_online:"ኤጀንቶች ኦንላይን ናቸው",no_agents_online:"ምንም ኤጀንት ኦንላይን የለም",live_label:"ኦንላይን",offline_label:"ኦፍላይን",truly_online:"ትክክለኛ ኦንላይን ያሉ",last_seen:"መጨረሻ የታየው",just_now:"አሁን",min_ago_suffix:"ደቂቃ በፊት",hour_unit:"ሰዓት",day_unit:"ቀን",ago:"በፊት",deposit:"ዲፖዚት",agent:"ኤጀንት",live_count:"ኦንላይን",no_agents_title:"ምንም ኤጀንት አሁን ኦንላይን የለም",no_agents_desc:"ከታች በቅርብ ጊዜ ኦንላይን የነበሩ ኤጀንቶችን ይመልከቱ።",loading:"በመጫን ላይ…",updating:"እያዘመነ ነው",warn_title:"ይህ ኤጀንት ኦፍላይን ሊሆን ይችላል",warn_desc:"ኤጀንቱ ለተወሰነ ጊዜ ኦንላይን አልነበረም እና በፍጥነት ላይመልስልዎ ይችላል። መቀጠል ይፈልጋሉ?",cancel:"ይቅር",continue:"ቀጥል",intent_question:"ምን ማድረግ ይፈልጋሉ?",intent_deposit:"ዲፖዚት",intent_deposit_desc:"ኦንላይን ያሉ ኤጀንቶችን አይተው ገንዘብ ያስገቡ",intent_withdraw:"ማውጣት",intent_withdraw_desc:"መጠን ያስገቡ → የሚከፍሉ ኤጀንቶች ይታያሉ",withdraw_title:"ማውጣት",withdraw_amount_label:"ምን ያህል ማውጣት ይፈልጋሉ?",withdraw_min_prefix:"ዝቅተኛ",withdraw_min_error:"ዝቅተኛው መጠን",withdraw_see_agents:"ይህን መጠን የሚከፍሉ ኤጀንቶችን ይመልከቱ",withdraw_own_agent:"የራሴ ኤጀንት",withdraw_own_agent_desc:"በቀጥታ በሳይቱ ላይ ያውጡ",withdraw_note:"የገንዘብ መጠንዎን የሚሸፍኑ ኤጀንቶችን ብቻ እናሳያለን። የቴሌግራም መልእክትዎ ከመጠኑ እና ከኤጀንቱ የማውጫ መለያ ጋር ዝግጁ ሆኖ ይመጣል።",withdraw_howto:"ማውጣት እንዴት እንደሚሰራ",withdraw_howto_sub:"ቪዲዮ",results_title:"ለመጠንዎ ኤጀንቶች",results_withdrawing:"በማውጣት ላይ",results_change:"ቀይር",results_cap_prefix:"እስከ",results_ready:"ኦንላይን · ለመክፈል ዝግጁ",results_withdraw_here:"እዚህ ያውጡ",results_withdraw_partial:"በከፊል ያውጡ",results_none_title:"አሁን ይህን ሙሉ መጠን የሚከፍል ኤጀንት የለም",results_none_desc:"እነዚህ በጣም ቅርብ ናቸው — መጠኑን መከፋፈል፣ ትንሽ መጠን መምረጥ ወይም ቆይተው መመለስ ይችላሉ።",recents_title:"የቅርብ ጊዜ ኤጀንቶችዎ",recents_only_you:"እርስዎ ብቻ ያዩታል",recents_contact:"አግኝ",recents_online:"ኦንላይን",recents_offline:"ኦፍላይን",back:"ተመለስ"},en:{title:"Kemerbet Agents",subtitle:"Live agents are shown first. Tap to deposit.",live_now:"Live Now",recently_online:"Recently online",agents_online:"agents online",no_agents_online:"No agents online",live_label:"Live",offline_label:"Offline",truly_online:"Truly online",last_seen:"Last seen",just_now:"just now",min_ago_suffix:"min ago",hour_unit:"h",day_unit:"d",ago:"ago",deposit:"Deposit",agent:"Agent",live_count:"live",no_agents_title:"No agents live right now",no_agents_desc:"Check below for recently online agents.",loading:"Loading agents…",updating:"Updating",warn_title:"This agent may be offline",warn_desc:"The agent has not been online for a while and may not respond quickly. Do you want to continue?",cancel:"Cancel",continue:"Continue",intent_question:"What do you want to do?",intent_deposit:"Deposit",intent_deposit_desc:"See all online agents and send money",intent_withdraw:"Withdraw",intent_withdraw_desc:"Enter amount → matched to agents who can pay it",withdraw_title:"Withdraw",withdraw_amount_label:"How much do you want to withdraw?",withdraw_min_prefix:"Minimum",withdraw_min_error:"Minimum is",withdraw_see_agents:"See agents who can pay this",withdraw_own_agent:"My own agent",withdraw_own_agent_desc:"withdraw directly on the site",withdraw_note:"We only show agents whose cash covers your amount, so you don't waste time asking. Your Telegram message comes ready with the amount and the agent's Withdrawal ID.",withdraw_howto:"How withdrawal works",withdraw_howto_sub:"Video",results_title:"Agents for your amount",results_withdrawing:"Withdrawing",results_change:"Change",results_cap_prefix:"Up to",results_ready:"Online · ready to pay",results_withdraw_here:"Withdraw here",results_withdraw_partial:"Withdraw partial",results_none_title:"No agent can pay this full amount right now",results_none_desc:"These agents are closest — split your withdrawal, choose a smaller amount, or check back soon.",recents_title:"Your recent agents",recents_only_you:"only you see this",recents_contact:"Contact",recents_online:"Online",recents_offline:"Offline",back:"Back"}},W="kemerbet_lang";function T(){try{const n=localStorage.getItem(W);if(n==="am"||n==="en")return n}catch{}return"am"}function Q(n){try{localStorage.setItem(W,n)}catch{}}const X={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"};function y(n){return String(n).replace(/[&<>"']/g,e=>X[e])}function Z(n){const e=[...n];for(let t=e.length-1;t>0;t--){const a=Math.floor(Math.random()*(t+1));[e[t],e[a]]=[e[a],e[t]]}return e}function ee(n,e){const t=k[e],a=Math.max(0,Math.floor((Date.now()-new Date(n).getTime())/1e3));if(a<60)return`${t.last_seen} ${t.just_now}`;const i=Math.floor(a/60);if(i<60)return`${t.last_seen} ${i} ${t.min_ago_suffix}`;const r=Math.floor(i/60),o=i%60;if(r<24)return e==="am"?o>0?`${t.last_seen} ${r} ${t.hour_unit} ${o} ደቂቃ ${t.ago}`:`${t.last_seen} ${r} ${t.hour_unit} ${t.ago}`:o>0?`${t.last_seen} ${r}${t.hour_unit} ${o}m ${t.ago}`:`${t.last_seen} ${r}${t.hour_unit} ${t.ago}`;const g=Math.floor(r/24);return e==="am"?`${t.last_seen} ${g} ${t.day_unit} ${t.ago}`:`${t.last_seen} ${g}${t.day_unit} ${t.ago}`}const B="kemerbet_first_seen_at",te=1440*60*1e3;function ne(){try{const n=localStorage.getItem(B);if(!n)return localStorage.setItem(B,String(Date.now())),!0;const e=parseInt(n,10);return isNaN(e)?(localStorage.setItem(B,String(Date.now())),!0):Date.now()-e<te}catch{return!0}}function ae(n){if(!n)return null;const e=[/youtube\.com\/watch\?v=([\w\-_]+)/i,/youtube\.com\/embed\/([\w\-_]+)/i,/youtu\.be\/([\w\-_]+)/i];for(const t of e){const a=n.match(t);if(a)return a[1]}return null}function O(n,e,t){const a=k[t],i=n.status==="live",r=y(n.telegram_username),o=encodeURIComponent(e),g=`https://telegram.me/${r}?text=${o}`,f=String(n.display_number).padStart(2,"0"),v=(n.payment_methods||[]).map(h=>h.slug),d=y(JSON.stringify(v)),w=(n.payment_methods||[]).map(h=>`<span class="bank">${y(h.display_name)}</span>`).join(""),b=i?`<div class="waiting-text">
         <span class="typing-dots"><span></span><span></span><span></span></span>
         ${a.truly_online}
       </div>`:`<div class="last-seen">⏱ ${n.last_seen_at?ee(n.last_seen_at,t):""}</div>`,x=i?`<div class="badge live">${a.live_label}</div>`:`<div class="badge offline">${a.offline_label}</div>`,s=i?`<a href="${g}" class="deposit-btn" target="_blank" rel="noopener" data-agent-id="${n.id}" data-payment-methods="${d}">
         <span>${a.deposit}</span>
         <span class="arrow">→</span>
       </a>`:`<button class="deposit-btn" data-agent-id="${n.id}" data-deposit-url="${y(g)}" data-offline="true" data-payment-methods="${d}">
         <span>${a.deposit}</span>
         <span class="arrow">→</span>
       </button>`;return`
    <div class="agent-card ${i?"live":"offline"}">
      <div class="agent-top">
        <div class="agent-name-wrap">
          <div class="agent-avatar">${f}</div>
          <div>
            <div class="agent-name">${a.agent} ${y(String(n.display_number))}</div>
          </div>
        </div>
        ${x}
      </div>
      ${b}
      <div class="banks">${w}</div>
      ${s}
    </div>
  `}function j(n,e){var p;const t=T(),a=k[t],i=e.getElementById("videoWrap");if(i){const c=n.settings.onboarding_video_url??"",_=ae(c);_!==null&&ne()?i.innerHTML=`
        <div class="kb-video-wrap">
          <iframe
            src="https://www.youtube.com/embed/${_}"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            title="How to Deposit"
          ></iframe>
        </div>
      `:i.innerHTML=""}const r=n.agents.filter(c=>c.status==="live"),o=n.agents.filter(c=>c.status==="recently_offline").sort((c,_)=>{const I=c.last_seen_at?new Date(c.last_seen_at).getTime():0;return(_.last_seen_at?new Date(_.last_seen_at).getTime():0)-I}),g=r.filter(c=>c.is_pinned),f=r.filter(c=>!c.is_pinned),v=[...g,...n.settings.shuffle_live_agents?Z(f):f],d=((p=n.settings)==null?void 0:p.chat_prefilled_message)||"Hi Kemerbet agent, I want to deposit",w=e.getElementById("liveCountText");w&&(w.textContent=r.length>0?`${r.length} ${a.agents_online}`:a.no_agents_online);const b=e.getElementById("liveCountInline");b&&(b.textContent=`${r.length} ${a.live_count}`);const x=e.getElementById("liveGrid");x&&(r.length===0?x.innerHTML=`
        <div class="empty-state">
          <div class="icon">○</div>
          <h3>${a.no_agents_title}</h3>
          <p>${a.no_agents_desc}</p>
        </div>
      `:x.innerHTML=v.map(c=>O(c,d,t)).join(""));const s=e.getElementById("offlineWrap"),h=e.getElementById("offlineGrid");s&&h&&(o.length>0?(s.style.display="block",h.innerHTML=o.map(c=>O(c,d,t)).join("")):s.style.display="none")}const H="kemerbet_recent_agents",re=20;function q(){try{const n=localStorage.getItem(H);if(!n)return[];const e=JSON.parse(n);return Array.isArray(e)?e.filter(t=>t&&typeof t.agent_id=="number"&&typeof t.ts=="number"):[]}catch{return[]}}function ie(n){try{localStorage.setItem(H,JSON.stringify(n.slice(0,re)))}catch{}}function A(n,e){const t=q().filter(a=>a.agent_id!==n);t.unshift({agent_id:n,intent:e,ts:Date.now()}),ie(t)}function oe(n,e){const t=new Map(n.map(i=>[i.id,i])),a=[];for(const i of q().sort((r,o)=>o.ts-r.ts)){const r=t.get(i.agent_id);if(r&&(a.push({entry:i,agent:r}),a.length>=e))break}return a}function M(n){const e=window.location.origin;let t=n||"/sport/popup/withdrawal";if(/^https?:\/\//i.test(t))try{const a=new URL(t);t=a.pathname+a.search+a.hash}catch{t="/sport/popup/withdrawal"}return t.startsWith("/")||(t="/"+t),e+t}function se(n,e){return n.replace(/\{amount\}/g,e.amount!=null?e.amount.toLocaleString("en-US"):"").replace(/\{withdrawal_id\}/g,e.withdrawal_id??"")}function U(n,e){return`https://telegram.me/${encodeURIComponent(n)}?text=${encodeURIComponent(e)}`}function de(n){const e=se(n.messageTemplate,{amount:n.amount,withdrawal_id:n.agent.withdrawal_id??""}),t=U(n.agent.telegram_username,e),a=M(n.redirectPath);window.open(t,"_blank","noopener"),window.location.href=a}function Y(n){window.location.href=M(n)}let E=0;function $(n){return n.toLocaleString("en-US")}function L(n,e){var t;["Home","Amount","Results"].forEach(a=>{const i=n.getElementById("screen"+a);i&&i.classList.toggle("active",a.toLowerCase()===e)}),(t=n.getElementById("screen"+e.charAt(0).toUpperCase()+e.slice(1)))==null||t.scrollIntoView({block:"nearest"})}function le(n){if(!n)return null;const e=[/youtube\.com\/watch\?v=([\w\-_]+)/i,/youtube\.com\/embed\/([\w\-_]+)/i,/youtu\.be\/([\w\-_]+)/i];for(const t of e){const a=n.match(t);if(a)return a[1]}return null}function ce(n,e){return`
    <div class="videobox" data-video="${y(e)}">
      <div class="vplay">▶</div>
      <b>${n.withdraw_howto}</b>
      <small>${n.withdraw_howto_sub}</small>
    </div>`}function C(n,e){let t=n.getElementById("wToast");t||(t=document.createElement("div"),t.id="wToast",t.className="wtoast",n.appendChild(t)),t.innerHTML=e,t.classList.add("show"),window.setTimeout(()=>t&&t.classList.remove("show"),4500)}function P(n){const{shadow:e,getData:t}=n,a=t();if(!a)return;const i=T(),r=k[i],o=e.getElementById("recentsWrap");if(o)if(a.settings.recents_enabled){const f=oe(a.directory??[],a.settings.recents_count??5);if(f.length===0)o.style.display="none";else{o.style.display="block";const v=f.map(w=>{const b=w.agent,x=String(b.display_number).padStart(2,"0"),s=b.online,h=s?r.recents_online:r.recents_offline,p=w.entry.intent==="withdrawal",c=p?r.intent_withdraw:r.deposit,_=s?p?"wdr":"dep":"grey";return`
              <div class="recent${s?"":" is-off"}">
                <div class="agent-avatar ${s?"live":"off"}">${x}</div>
                <div class="rc-mid">
                  <div class="rc-name">${r.agent} ${y(String(b.display_number))}</div>
                  <div class="rc-sub">${h}</div>
                </div>
                <div class="rc-btns">
                  <button class="btn-s ${_}" data-recent-main data-agent-id="${b.id}" data-intent="${w.entry.intent}">${c}</button>
                  <button class="btn-s line" data-recent-contact data-agent-id="${b.id}">${r.recents_contact}</button>
                </div>
              </div>`}).join(""),d=e.getElementById("recentsGrid");d&&(d.innerHTML=v)}}else o.style.display="none";const g=e.getElementById("intentQuestion");g&&(g.textContent=r.intent_question)}function D(n){var s,h;const{shadow:e,getData:t}=n,a=t();if(!a)return;const i=T(),r=k[i],o=a.settings.withdrawal_min??200,g=a.settings.withdrawal_howto_video_url??"",f=e.getElementById("screenAmount");if(!f)return;const v=(a.settings.withdrawal_quick_amounts??[]).map(p=>`<button class="q" data-quick="${p}">${$(p)}</button>`).join("");f.innerHTML=`
    <div class="backrow"><button class="backbtn" data-nav="home">←</button><h2>${r.withdraw_title}</h2></div>
    ${g?ce(r,g):""}
    <div class="amount-wrap">
      <label>${r.withdraw_amount_label}</label>
      <div class="amt-line">
        <input id="amtInput" type="text" inputmode="numeric" placeholder="0" />
        <b>ETB</b>
      </div>
      <div class="amt-hint" id="amtHint">${r.withdraw_min_prefix} ${$(o)} ETB</div>
    </div>
    <div class="quick">${v}</div>
    <button class="bigcta" id="amtGo" disabled>${r.withdraw_see_agents}</button>
    <button class="ownagent" id="ownAgentBtn"><span class="ow">${r.withdraw_own_agent}<small>${r.withdraw_own_agent_desc}</small></span><span>→</span></button>
    <p class="amt-note">${r.withdraw_note}</p>
  `;const d=e.getElementById("amtInput"),w=e.getElementById("amtHint"),b=e.getElementById("amtGo"),x=()=>{if(!d||!w||!b)return;const p=d.value.replace(/[^0-9]/g,"");E=parseInt(p||"0",10),p&&(d.value=$(E)),E>0&&E<o?(w.textContent=`${r.withdraw_min_error} ${$(o)} ETB`,w.classList.add("err"),b.disabled=!0):(w.textContent=`${r.withdraw_min_prefix} ${$(o)} ETB`,w.classList.remove("err"),b.disabled=E<o)};d==null||d.addEventListener("input",x),e.querySelectorAll("#screenAmount .q").forEach(p=>{p.addEventListener("click",()=>{d&&(d.value=$(parseInt(p.dataset.quick,10))),x(),d==null||d.focus()})}),b==null||b.addEventListener("click",()=>{E>=o&&(pe(n,E),L(e,"results"))}),(s=e.getElementById("ownAgentBtn"))==null||s.addEventListener("click",()=>{const p=a.settings.withdrawal_redirect_path;C(e,N(p)),Y(p)}),(h=e.querySelector('#screenAmount [data-nav="home"]'))==null||h.addEventListener("click",()=>L(e,"home")),G(e),x()}function N(n){const e=M(n);return`Opening the cashier withdrawals — pick <b>AgentEpos</b> and withdraw directly. <br><small>${y(e)}</small>`}function ge(n){const e=[...n];for(let t=e.length-1;t>0;t--){const a=Math.floor(Math.random()*(t+1));[e[t],e[a]]=[e[a],e[t]]}return e}function pe(n,e){var x;const{shadow:t,getData:a}=n,i=a();if(!i)return;const r=T(),o=k[r],g=t.getElementById("screenResults");if(!g)return;const f=i.agents.filter(s=>s.status==="live"&&s.accepts_withdrawals&&s.withdrawal_id),v=ge(f.filter(s=>(s.withdrawal_max??0)>=e));let d,w=!1;v.length>0?d=v:i.settings.withdrawal_no_match_behavior==="closest"?(w=!0,d=[...f].sort((s,h)=>(h.withdrawal_max??0)-(s.withdrawal_max??0)).slice(0,3)):(w=!0,d=[]);const b=d.map(s=>{const h=String(s.display_number).padStart(2,"0"),p=(s.withdrawal_max??0)>=e,c=(s.payment_methods||[]).map(I=>`<span class="bank">${y(I.display_name)}</span>`).join(""),_=p?o.results_withdraw_here:o.results_withdraw_partial;return`
        <div class="agent-card live">
          <div class="agent-top">
            <div class="agent-name-wrap"><div class="agent-avatar live">${h}</div><div class="agent-name">${o.agent} ${y(String(s.display_number))}</div></div>
            <span class="cap-chip">${o.results_cap_prefix} ${$(s.withdrawal_max??0)} ETB</span>
          </div>
          <div class="waiting-text"><span class="typing-dots"><span></span><span></span><span></span></span>${o.results_ready}</div>
          <div class="banks">${c}</div>
          <button class="deposit-btn gold" data-withdraw-here data-agent-id="${s.id}"><span>${_}</span><span>→</span></button>
        </div>`}).join("");g.innerHTML=`
    <div class="backrow"><button class="backbtn" data-nav="amount">←</button><h2>${o.results_title}</h2></div>
    <div class="res-head">
      <div><small>${o.results_withdrawing}</small><b>${$(e)} ETB</b></div>
      <button data-nav="amount">${o.results_change}</button>
    </div>
    <button class="ownagent" style="margin:0 0 15px" id="ownAgentBtn2"><span class="ow">${o.withdraw_own_agent}<small>${o.withdraw_own_agent_desc}</small></span><span>→</span></button>
    ${w?`<div class="nores"><h4>${o.results_none_title}</h4><p>${o.results_none_desc}</p></div>`:""}
    <div class="agent-grid" id="resList">${b}</div>
  `,t.querySelectorAll('#screenResults [data-nav="amount"]').forEach(s=>s.addEventListener("click",()=>L(t,"amount"))),(x=t.getElementById("ownAgentBtn2"))==null||x.addEventListener("click",()=>{const s=i.settings.withdrawal_redirect_path;C(t,N(s)),Y(s)}),t.querySelectorAll("#screenResults [data-withdraw-here]").forEach(s=>{s.addEventListener("click",()=>{const h=parseInt(s.dataset.agentId,10),p=d.find(c=>c.id===h);p&&(n.trackClick(h,"withdrawal",{amount:e,source:"list"}),C(t,N(i.settings.withdrawal_redirect_path)),de({agent:p,amount:e,messageTemplate:i.settings.withdrawal_message_with_amount,redirectPath:i.settings.withdrawal_redirect_path}))})})}function me(n,e,t){const{shadow:a,getData:i}=n,r=i();if(!r)return;const o=(r.directory??[]).find(f=>f.id===e);if(!o)return;if(t==="withdrawal"){D(n),L(a,"amount");return}const g=U(o.telegram_username,r.settings.chat_prefilled_message);o.online?(n.trackClick(e,"deposit",{source:"recent"}),window.open(g,"_blank","noopener")):n.openOfflineModal(g,e,[])}function ue(n,e){const t=n.getData();if(!t)return;const a=(t.directory??[]).find(i=>i.id===e);a&&(n.trackClick(e,"contact",{source:"recent"}),window.open(`https://telegram.me/${encodeURIComponent(a.telegram_username)}`,"_blank","noopener"))}function G(n){n.querySelectorAll(".videobox").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.video||"",a=le(t);a&&(e.innerHTML=`<iframe src="https://www.youtube.com/embed/${a}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen title="How to withdraw"></iframe>`)})})}function fe(n){const e=n.dataset.api;if(e)return e;const t=document.querySelectorAll('script[src*="embed.js"]'),a=t[t.length-1];if(a!=null&&a.src)try{return new URL(a.src).origin}catch{}return window.location.origin}function V(){var _,I,R;const n=document.getElementById("kemerbet-agents");if(!n)return;const e=fe(n),t=n.attachShadow({mode:"open"}),a=document.createElement("style");a.textContent=K,t.appendChild(a);const i=T();n.setAttribute("lang",i);const r=document.createElement("div");r.innerHTML=be(i),t.appendChild(r),F(i,t,n),sessionStorage.getItem("kemerbet_visited")||(sessionStorage.setItem("kemerbet_visited","1"),fetch(`${e}/api/public/visit`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({referrer:document.referrer||null})}).catch(()=>{}));let o=null,g=null,f=null,v=null,d=null;function w(){const l=t.getElementById("refreshIndicator");l&&(l.classList.add("show"),setTimeout(()=>l.classList.remove("show"),1400))}function b(l,u){fetch(`${e}/api/public/agents/${l}/click`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({referrer:window.location.href,payment_methods:u&&u.length>0?u:null}),keepalive:!0}).catch(()=>{})}const x={shadow:t,apiBase:e,getData:()=>o,trackClick:(l,u,m)=>{A(l,u),fetch(`${e}/api/public/agents/${l}/click`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({referrer:window.location.href,intent:u,amount:(m==null?void 0:m.amount)??null,source:(m==null?void 0:m.source)??null,payment_methods:m!=null&&m.paymentMethods&&m.paymentMethods.length>0?m.paymentMethods:null}),keepalive:!0}).catch(()=>{})},openOfflineModal:(l,u,m)=>{g=l,f=String(u),v=m,p()}};async function s(){w();try{const l=await fetch(`${e}/api/public/agents`);if(!l.ok)throw new Error(`HTTP ${l.status}`);const u=await l.json();o=u,j(u,t),P(x),G(t)}catch{console.warn("[kemerbet-agents] fetch failed, retrying in 60s")}}function h(){d=window.setTimeout(async()=>{document.hidden||await s(),document.hidden?d=null:h()},6e4)}document.addEventListener("visibilitychange",()=>{document.hidden?d!==null&&(clearTimeout(d),d=null):d===null&&(s(),h())});function p(){var l;(l=t.getElementById("offlineWarnModal"))==null||l.classList.add("show")}function c(){var l;(l=t.getElementById("offlineWarnModal"))==null||l.classList.remove("show"),g=null,f=null,v=null}(_=t.getElementById("confirmDepositBtn"))==null||_.addEventListener("click",()=>{f&&(b(f,v??void 0),A(parseInt(f,10),"deposit")),g&&window.open(g,"_blank","noopener"),c()}),(I=t.getElementById("cancelWarnBtn"))==null||I.addEventListener("click",()=>{c()}),(R=t.getElementById("offlineWarnModal"))==null||R.addEventListener("click",l=>{l.target.id==="offlineWarnModal"&&c()}),document.addEventListener("keydown",l=>{if(l.key==="Escape"){const u=t.getElementById("offlineWarnModal");u!=null&&u.classList.contains("show")&&c()}}),t.addEventListener("click",l=>{const m=l.target.closest("[data-agent-id]");if(!m)return;const S=m.dataset.agentId,z=JSON.parse(m.dataset.paymentMethods||"[]");m.dataset.offline==="true"?(l.preventDefault(),g=m.dataset.depositUrl||null,f=S,v=z,p()):(b(S,z),A(parseInt(S,10),"deposit"))}),t.addEventListener("click",l=>{var J;const u=l.target,m=u.closest("[data-intent-choice]");if(m){m.dataset.intentChoice==="withdraw"?(D(x),L(t,"amount")):(J=t.getElementById("liveGrid"))==null||J.scrollIntoView({behavior:"smooth",block:"start"});return}const S=u.closest("[data-recent-main]");if(S){me(x,parseInt(S.dataset.agentId,10),S.dataset.intent);return}const z=u.closest("[data-recent-contact]");if(z){ue(x,parseInt(z.dataset.agentId,10));return}}),t.querySelectorAll(".lang-btn").forEach(l=>{l.addEventListener("click",()=>{var m;const u=l.dataset.lang;Q(u),F(u,t,n),o&&(j(o,t),P(x),(m=t.getElementById("screenAmount"))!=null&&m.classList.contains("active")&&(D(x),L(t,"amount")))})}),s(),h()}function F(n,e,t){const a=k[n];t.setAttribute("lang",n),e.querySelectorAll("[data-i18n]").forEach(i=>{const r=i.dataset.i18n;a[r]!==void 0&&(i.textContent=a[r])}),e.querySelectorAll(".lang-btn").forEach(i=>{const r=i;r.classList.toggle("active",r.dataset.lang===n)})}function be(n){const e=k[n];return`
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

        <div id="videoWrap"></div>

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

        <!-- live agent list (deposit) -->
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
  `}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",V):V()})();
