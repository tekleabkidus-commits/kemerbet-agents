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
