(function(){"use strict";const D=`
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
`,v={am:{title:"Kemerbet ኤጀንቶች",subtitle:"ኦንላይን ያሉ ኤጀንቶች ቅድሚያ ይታያሉ። ዲፖዚት ለማድረግ ይምረጡ።",live_now:"አሁን ኦንላይን",recently_online:"በቅርብ ጊዜ ኦንላይን የነበሩ",agents_online:"ኤጀንቶች ኦንላይን ናቸው",no_agents_online:"ምንም ኤጀንት ኦንላይን የለም",live_label:"ኦንላይን",offline_label:"ኦፍላይን",truly_online:"ትክክለኛ ኦንላይን ያሉ",last_seen:"መጨረሻ የታየው",just_now:"አሁን",min_ago_suffix:"ደቂቃ በፊት",hour_unit:"ሰዓት",day_unit:"ቀን",ago:"በፊት",deposit:"ዲፖዚት",agent:"ኤጀንት",live_count:"ኦንላይን",no_agents_title:"ምንም ኤጀንት አሁን ኦንላይን የለም",no_agents_desc:"ከታች በቅርብ ጊዜ ኦንላይን የነበሩ ኤጀንቶችን ይመልከቱ።",loading:"በመጫን ላይ…",updating:"እያዘመነ ነው",warn_title:"ይህ ኤጀንት ኦፍላይን ሊሆን ይችላል",warn_desc:"ኤጀንቱ ለተወሰነ ጊዜ ኦንላይን አልነበረም እና በፍጥነት ላይመልስልዎ ይችላል። መቀጠል ይፈልጋሉ?",cancel:"ይቅር",continue:"ቀጥል"},en:{title:"Kemerbet Agents",subtitle:"Live agents are shown first. Tap to deposit.",live_now:"Live Now",recently_online:"Recently online",agents_online:"agents online",no_agents_online:"No agents online",live_label:"Live",offline_label:"Offline",truly_online:"Truly online",last_seen:"Last seen",just_now:"just now",min_ago_suffix:"min ago",hour_unit:"h",day_unit:"d",ago:"ago",deposit:"Deposit",agent:"Agent",live_count:"live",no_agents_title:"No agents live right now",no_agents_desc:"Check below for recently online agents.",loading:"Loading agents…",updating:"Updating",warn_title:"This agent may be offline",warn_desc:"The agent has not been online for a while and may not respond quickly. Do you want to continue?",cancel:"Cancel",continue:"Continue"}},E="kemerbet_lang";function I(){try{const t=localStorage.getItem(E);if(t==="am"||t==="en")return t}catch{}return"am"}function N(t){try{localStorage.setItem(E,t)}catch{}}const C={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"};function y(t){return String(t).replace(/[&<>"']/g,a=>C[a])}function j(t){const a=[...t];for(let e=a.length-1;e>0;e--){const n=Math.floor(Math.random()*(e+1));[a[e],a[n]]=[a[n],a[e]]}return a}function O(t,a){const e=v[a],n=Math.max(0,Math.floor((Date.now()-new Date(t).getTime())/1e3));if(n<60)return`${e.last_seen} ${e.just_now}`;const o=Math.floor(n/60);if(o<60)return`${e.last_seen} ${o} ${e.min_ago_suffix}`;const i=Math.floor(o/60),d=o%60;if(i<24)return a==="am"?d>0?`${e.last_seen} ${i} ${e.hour_unit} ${d} ደቂቃ ${e.ago}`:`${e.last_seen} ${i} ${e.hour_unit} ${e.ago}`:d>0?`${e.last_seen} ${i}${e.hour_unit} ${d}m ${e.ago}`:`${e.last_seen} ${i}${e.hour_unit} ${e.ago}`;const g=Math.floor(i/24);return a==="am"?`${e.last_seen} ${g} ${e.day_unit} ${e.ago}`:`${e.last_seen} ${g}${e.day_unit} ${e.ago}`}const k="kemerbet_first_seen_at",Y=1440*60*1e3;function R(){try{const t=localStorage.getItem(k);if(!t)return localStorage.setItem(k,String(Date.now())),!0;const a=parseInt(t,10);return isNaN(a)?(localStorage.setItem(k,String(Date.now())),!0):Date.now()-a<Y}catch{return!0}}function W(t){if(!t)return null;const a=[/youtube\.com\/watch\?v=([\w\-_]+)/i,/youtube\.com\/embed\/([\w\-_]+)/i,/youtu\.be\/([\w\-_]+)/i];for(const e of a){const n=t.match(e);if(n)return n[1]}return null}function T(t,a,e){const n=v[e],o=t.status==="live",i=y(t.telegram_username),d=encodeURIComponent(a),g=`https://t.me/${i}?text=${d}`,f=String(t.display_number).padStart(2,"0"),m=(t.payment_methods||[]).map(s=>s.slug),p=y(JSON.stringify(m)),h=(t.payment_methods||[]).map(s=>`<span class="bank">${y(s.display_name)}</span>`).join(""),b=o?`<div class="waiting-text">
         <span class="typing-dots"><span></span><span></span><span></span></span>
         ${n.truly_online}
       </div>`:`<div class="last-seen">⏱ ${t.last_seen_at?O(t.last_seen_at,e):""}</div>`,u=o?`<div class="badge live">${n.live_label}</div>`:`<div class="badge offline">${n.offline_label}</div>`,x=o?`<a href="${g}" class="deposit-btn" target="_blank" rel="noopener" data-agent-id="${t.id}" data-payment-methods="${p}">
         <span>${n.deposit}</span>
         <span class="arrow">→</span>
       </a>`:`<button class="deposit-btn" data-agent-id="${t.id}" data-deposit-url="${y(g)}" data-offline="true" data-payment-methods="${p}">
         <span>${n.deposit}</span>
         <span class="arrow">→</span>
       </button>`;return`
    <div class="agent-card ${o?"live":"offline"}">
      <div class="agent-top">
        <div class="agent-name-wrap">
          <div class="agent-avatar">${f}</div>
          <div>
            <div class="agent-name">${n.agent} ${y(String(t.display_number))}</div>
          </div>
        </div>
        ${u}
      </div>
      ${b}
      <div class="banks">${h}</div>
      ${x}
    </div>
  `}function L(t,a){var x;const e=I(),n=v[e],o=a.getElementById("videoWrap");if(o){const s=t.settings.onboarding_video_url??"",c=W(s);c!==null&&R()?o.innerHTML=`
        <div class="kb-video-wrap">
          <iframe
            src="https://www.youtube.com/embed/${c}"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            title="How to Deposit"
          ></iframe>
        </div>
      `:o.innerHTML=""}const i=t.agents.filter(s=>s.status==="live"),d=t.agents.filter(s=>s.status==="recently_offline").sort((s,c)=>{const w=s.last_seen_at?new Date(s.last_seen_at).getTime():0;return(c.last_seen_at?new Date(c.last_seen_at).getTime():0)-w}),g=t.settings.shuffle_live_agents?j(i):i,f=((x=t.settings)==null?void 0:x.chat_prefilled_message)||"Hi Kemerbet agent, I want to deposit",m=a.getElementById("liveCountText");m&&(m.textContent=i.length>0?`${i.length} ${n.agents_online}`:n.no_agents_online);const p=a.getElementById("liveCountInline");p&&(p.textContent=`${i.length} ${n.live_count}`);const h=a.getElementById("liveGrid");h&&(i.length===0?h.innerHTML=`
        <div class="empty-state">
          <div class="icon">○</div>
          <h3>${n.no_agents_title}</h3>
          <p>${n.no_agents_desc}</p>
        </div>
      `:h.innerHTML=g.map(s=>T(s,f,e)).join(""));const b=a.getElementById("offlineWrap"),u=a.getElementById("offlineGrid");b&&u&&(d.length>0?(b.style.display="block",u.innerHTML=d.map(s=>T(s,f,e)).join("")):b.style.display="none")}function P(t){const a=t.dataset.api;if(a)return a;const e=document.querySelectorAll('script[src*="embed.js"]'),n=e[e.length-1];if(n!=null&&n.src)try{return new URL(n.src).origin}catch{}return window.location.origin}function S(){var w,$,B;const t=document.getElementById("kemerbet-agents");if(!t)return;const a=P(t),e=t.attachShadow({mode:"open"}),n=document.createElement("style");n.textContent=D,e.appendChild(n);const o=I();t.setAttribute("lang",o);const i=document.createElement("div");i.innerHTML=H(o),e.appendChild(i),z(o,e,t),sessionStorage.getItem("kemerbet_visited")||(sessionStorage.setItem("kemerbet_visited","1"),fetch(`${a}/api/public/visit`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({referrer:document.referrer||null})}).catch(()=>{}));let d=null,g=null,f=null,m=null,p=null;function h(){const r=e.getElementById("refreshIndicator");r&&(r.classList.add("show"),setTimeout(()=>r.classList.remove("show"),1400))}function b(r,l){fetch(`${a}/api/public/agents/${r}/click`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({referrer:window.location.href,payment_methods:l&&l.length>0?l:null}),keepalive:!0}).catch(()=>{})}async function u(){h();try{const r=await fetch(`${a}/api/public/agents`);if(!r.ok)throw new Error(`HTTP ${r.status}`);const l=await r.json();d=l,L(l,e)}catch{console.warn("[kemerbet-agents] fetch failed, retrying in 60s")}}function x(){p=window.setTimeout(async()=>{document.hidden||await u(),document.hidden?p=null:x()},6e4)}document.addEventListener("visibilitychange",()=>{document.hidden?p!==null&&(clearTimeout(p),p=null):p===null&&(u(),x())});function s(){var r;(r=e.getElementById("offlineWarnModal"))==null||r.classList.add("show")}function c(){var r;(r=e.getElementById("offlineWarnModal"))==null||r.classList.remove("show"),g=null,f=null,m=null}(w=e.getElementById("confirmDepositBtn"))==null||w.addEventListener("click",()=>{f&&b(f,m??void 0),g&&window.open(g,"_blank","noopener"),c()}),($=e.getElementById("cancelWarnBtn"))==null||$.addEventListener("click",()=>{c()}),(B=e.getElementById("offlineWarnModal"))==null||B.addEventListener("click",r=>{r.target.id==="offlineWarnModal"&&c()}),document.addEventListener("keydown",r=>{if(r.key==="Escape"){const l=e.getElementById("offlineWarnModal");l!=null&&l.classList.contains("show")&&c()}}),e.addEventListener("click",r=>{const _=r.target.closest("[data-agent-id]");if(!_)return;const M=_.dataset.agentId,A=JSON.parse(_.dataset.paymentMethods||"[]");_.dataset.offline==="true"?(r.preventDefault(),g=_.dataset.depositUrl||null,f=M,m=A,s()):b(M,A)}),e.querySelectorAll(".lang-btn").forEach(r=>{r.addEventListener("click",()=>{const l=r.dataset.lang;N(l),z(l,e,t),d&&L(d,e)})}),u(),x()}function z(t,a,e){const n=v[t];e.setAttribute("lang",t),a.querySelectorAll("[data-i18n]").forEach(o=>{const i=o.dataset.i18n;n[i]!==void 0&&(o.textContent=n[i])}),a.querySelectorAll(".lang-btn").forEach(o=>{const i=o;i.classList.toggle("active",i.dataset.lang===t)})}function H(t){const a=v[t];return`
    <div class="refresh-indicator" id="refreshIndicator">
      <div class="spinner"></div>
      <span data-i18n="updating">${a.updating}</span>
    </div>

    <div class="modal-backdrop" id="offlineWarnModal">
      <div class="modal-warn">
        <div class="icon-wrap">⚠️</div>
        <h3 data-i18n="warn_title">${a.warn_title}</h3>
        <p data-i18n="warn_desc">${a.warn_desc}</p>
        <div class="modal-actions">
          <button class="modal-btn cancel" id="cancelWarnBtn" data-i18n="cancel">${a.cancel}</button>
          <button class="modal-btn confirm" id="confirmDepositBtn" data-i18n="continue">${a.continue}</button>
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

      <div class="header">
        <div class="header-logo">
          <span class="live-indicator"></span>
          <span id="liveCountText">${a.loading}</span>
        </div>
        <h1 data-i18n="title">${a.title}</h1>
        <p data-i18n="subtitle">${a.subtitle}</p>
      </div>

      <div id="videoWrap"></div>

      <div class="section-title">
        <h2 data-i18n="live_now">${a.live_now}</h2>
        <div class="agent-count" id="liveCountInline">—</div>
      </div>

      <div class="agent-grid" id="liveGrid">
        <div class="empty-state"><h3 data-i18n="loading">${a.loading}</h3></div>
      </div>

      <div id="offlineWrap" style="display:none">
        <div class="offline-divider" data-i18n="recently_online">${a.recently_online}</div>
        <div class="agent-grid" id="offlineGrid"></div>
      </div>
    </div>
  `}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",S):S()})();
