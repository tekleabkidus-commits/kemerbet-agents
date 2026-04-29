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
