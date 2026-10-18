import { getAi } from '../ai';
import { SUGGEST_MIN_CONFIDENCE } from '../ai/types';
import type { ChatSide } from '../types';

// The chat between a vehicle owner and a garage about one job. Both sides see the same conversation; a message that tries to
// move the deal off the app (a phone number, paying elsewhere, another chat app) is held back, as in OnMart. There is always a
// call button, so a voice talk is one tap away.

/** Ready-made lines for each side, shown as one-tap replies above the box. */
export const CHAT_QUICK: Record<ChatSide, string[]> = {
  shop: ['මිල දැන් එවන්නම්', 'තොගයේ ඇත', 'ඇණවුම සූදානම් කරමින්', 'කොටස් අංකය තහවුරු කරන්න', 'වෙළඳසැලෙන් රැගෙන යන්න'],
  tech: ['ස්ථානයට ළඟා වෙනවා', 'වාහනය පරීක්ෂා කරමින්', 'අමතර වැඩක් හමු වුණා', 'වැඩේ අවසන් කළා', 'ගාස්තුව තහවුරු කරන්න'],
  owner: ['වැඩේ කොහොමද?', 'කවදා වෙද්දී ඉවර වෙයිද?', 'වාහනය ගන්න එන්නද?', 'මිල ගැන විස්තරයක් දෙන්න', 'ස්තූතියි!'],
  garage: ['වාහනය ලැබුණා, පරීක්ෂා කරනවා', 'අමතර වැඩක් හමු වුණා, අනුමත කරන්න', 'වැඩේ අවසන්, ගන්න එන්න', 'ඡායාරූපයක් එවන්න පුළුවන්ද?', 'ස්තූතියි!'],
};

/** False when the message looks like moving the deal off the app (a phone number, paying elsewhere, another chat app). */
export const chatAllowed = async (text: string) => {
  const check = await getAi().checkOffPlatform(text);
  return !(check.confidence >= SUGGEST_MIN_CONFIDENCE && check.value.flagged);
};

const has = (text: string, words: string[]) => words.some((w) => text.toLowerCase().includes(w));

/**
 * What the other side answers in the simulation (a backend carries the real person's reply). `replier` is who is answering.
 * Keyword based, in Sinhala, like the rest of the simulations.
 */
export const simulatedChatReply = (replier: ChatSide, incoming: string): string => {
  if (has(incoming, ['ස්තූති', 'thanks', 'thank'])) return replier !== 'owner' ? 'ඔබටත් ස්තූතියි! 🙏' : 'හරි, ස්තූතියි! 🙏';
  if (replier === 'shop') {
    if (has(incoming, ['මිල', 'කීය', 'ගාන', 'price'])) return 'මිල ඔබට එවා ඇති මිල ගණන්වල ඇත — ඇණවුම් කළාම කොටස තහවුරු කරලා යවන්නම්.';
    if (has(incoming, ['තොග', 'ඇත', 'තියෙ', 'stock'])) return 'තොගයේ ඇත — ඉක්මනින් තහවුරු කර දැනුම් දෙන්නම්.';
    if (has(incoming, ['කවද', 'වෙලා', 'යවන', 'ගෙනාවා', 'when'])) return 'තහවුරු කළ පසු පැයක් ඇතුළත යවන්නම්, නැත්නම් කවුන්ටරයෙන් රැගෙන යන්න.';
    return 'හරි, අපි පරීක්ෂා කර ඉක්මනින් දැනුම් දෙන්නම්.';
  }
  if (replier === 'tech') {
    if (has(incoming, ['කවද', 'වෙලා', 'ළඟා', 'එන්නේ', 'when'])) return 'මිනිත්තු කිහිපයකින් ළඟා වෙනවා.';
    if (has(incoming, ['මිල', 'කීය', 'ගාන', 'ගාස්තු', 'price'])) return 'පරීක්ෂා කළාට පස්සේ නිවැරදි ගාස්තුව කියන්නම්.';
    if (has(incoming, ['කොහොම', 'තත්ත්ව', 'වැඩේ'])) return 'වැඩේ හොඳින් සිදුවෙමින් පවතී.';
    return 'හරි, ඉක්මනින් දැනුම් දෙන්නම්.';
  }
  if (replier === 'garage') {
    if (has(incoming, ['කවද', 'වෙලා', 'ඉවර', 'කොයි', 'when'])) return 'අද සවස 5ට පෙර අවසන් කරන්න බලාපොරොත්තු වෙනවා. අවසන් වූ විට දන්වන්නම්.';
    if (has(incoming, ['මිල', 'කීය', 'ගාන', 'price'])) return 'මිල ගැන සම්පූර්ණ විස්තර පරීක්ෂා වාර්තාවේ ඇත. ඔබ අනුමත කළ පේළි පමණක් අය කෙරේ.';
    if (has(incoming, ['කොහොම', 'තත්ත්ව', 'වැඩේ'])) return 'වැඩේ හොඳින් සිදුවෙමින් පවතී. ඊළඟ පියවර ගැන දන්වන්නම්.';
    if (has(incoming, ['එන්න', 'ගන්න', 'ගෙන'])) return 'ගරාජය විවෘතයි — ඔබට පහසු වේලාවක එන්න. වාහනය භාර ගැනීමේදී ඔබගේ කේතය අවශ්‍යයි.';
    return 'හරි, අපි බලලා ඉක්මනින් දැනුම් දෙන්නම්.';
  }
  if (has(incoming, ['අනුමත', 'approve'])) return 'ඔබ එවූ විස්තරය බැලුවා, හරි — කරගෙන යන්න.';
  if (has(incoming, ['ඡායාරූප', 'photo'])) return 'හරි, පසුව එවන්නම්.';
  if (has(incoming, ['අවසන්', 'ගන්න එන්න', 'ලැබුණා'])) return 'හොඳයි, මම එන්නම්.';
  return 'හරි, ස්තූතියි.';
};
