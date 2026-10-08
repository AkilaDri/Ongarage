import type { BreakdownId } from '../constants/breakdowns';
import type { DisputeTopic } from '../types';

// Words the rules provider looks for, in English, Sinhala and Singlish (Sinhala typed
// in English letters). Sinhala entries are stems ("ටයර" matches ටයරය, ටයර්), and
// matching ignores zero-width joiners, so "බ්‍රේක්" and "බ්රේක්" are the same word.
// Keep this list in step with how owners actually write; it is also the starting
// point for the labelled examples a learned model (Claude prompts, Laya fine-tuning)
// will need.

/** Service category id → words. */
export const CATEGORY_WORDS: Record<string, string[]> = {
  '1': ['engine', 'gearbox', 'gear box', 'clutch', 'timing belt', 'knocking', 'engine noise', 'එන්ජිම', 'එන්ජින', 'ගියර', 'ක්ලච', 'ගැටෙන', 'engine eka', 'gear eka', 'sadde'],
  '2': ['wiring', 'alternator', 'starter', 'fuse', 'dashboard', 'lights flicker', 'electrical', 'වයර', 'ඩෑෂ්බෝඩ', 'ස්ටාටර', 'ඇල්ටනේටර', 'ෆියුස', 'ලයිට', 'light eka', 'wire eka'],
  '3': ['hybrid', 'inverter', 'ready light', 'electric vehicle', 'හයිබ්‍රිඩ', 'hybrid eka'],
  '4': ['a/c', 'aircon', 'air con', 'air conditioner', 'cold air', 'not cooling', 'ඒසී', 'සීතල', 'වායු සමීකරණ', 'ac eka', 'seethala'],
  '5': ['check engine', 'ecu', 'scan', 'error code', 'remap', 'diagnostic', 'චෙක් එන්ජින', 'ස්කෑන', 'check engine light'],
  '6': ['tyre', 'tire', 'wheel', 'alignment', 'balancing', 'puncture', 'ටයර', 'රෝද', 'පන්චර', 'tyre eka', 'panchar'],
  '7': ['brake', 'pads', 'abs', 'shock absorber', 'suspension', 'squeak', 'බ්‍රේක', 'පෑඩ', 'සස්පෙන්ෂන', 'ෂොක', 'brake eka'],
  '8': ['paint', 'dent', 'scratch', 'bumper', 'body work', 'පින්තාරු', 'තීන්ත', 'සීරීම', 'බම්පර', 'ඩෙන්ට', 'dent eka'],
  '9': ['wash', 'cleaning', 'detailing', 'wax', 'polish', 'සේදීම', 'පිරිසිදු', 'වොෂ', 'wash karanna'],
  '10': ['tuning', 'tune', 'turbo', 'exhaust', 'performance', 'dyno', 'ටියුන', 'ටර්බෝ'],
  '11': ['battery', 'jump start', 'terminal', 'not starting', "won't start", 'බැටරි', 'පණගන්නේ නැ', 'පණගන්වන්න', 'battery eka', 'start wenne na'],
  '12': ['tow', 'towing', 'flatbed', 'recovery', 'ටෝ', 'ඇදගෙන', 'tow karanna'],
};

/** SOS breakdown → words. */
export const BREAKDOWN_WORDS: Record<BreakdownId, string[]> = {
  tire: ['tyre', 'tire', 'puncture', 'flat', 'ටයර', 'පන්චර', 'බැස්සා', 'panchar'],
  battery: ['battery', 'jump', "won't start", 'not starting', 'බැටරි', 'පණගන්නේ නැ', 'ලයිට් අඳුරු', 'start wenne na'],
  fuel: ['fuel', 'petrol', 'diesel', 'out of gas', 'ඉන්ධන', 'පෙට්‍රල', 'ඩීසල', 'තෙල් ඉවර', 'petrol iwara'],
  overheating: ['overheat', 'temperature', 'radiator', 'coolant', 'steam', 'රත්වෙ', 'රත් වෙ', 'ටෙම්පරේචර', 'රේඩියේටර', 'දුමාරය'],
  lockout: ['locked', 'key inside', 'lost key', 'යතුර', 'අගුල', 'key eka'],
  towing: ['tow', 'towing', 'ටෝ', 'ඇදගෙන'],
  winching: ['ditch', 'mud', 'stuck', 'winch', 'කානුව', 'මඩ', 'හිරවෙලා', 'වින්ච'],
  accident: ['accident', 'crash', 'collision', 'hit', 'අනතුර', 'හැප්පුණා', 'හැප්පිලා', 'accident una'],
  mechanical: ['engine', 'stopped', 'breakdown', 'gear', 'එන්ජිම', 'නතර වුණා', 'නතර උනා', 'ගියර'],
};

/** Canonical part names (the same names the garage and parts apps use) → words. */
export const PART_WORDS: Record<string, string[]> = {
  'Brake pads (front)': ['brake pad', 'pads', 'පෑඩ', 'brake pad eka'],
  'Brake disc': ['brake disc', 'disc', 'rotor', 'ඩිස්ක'],
  'Brake fluid': ['brake fluid', 'brake oil', 'බ්‍රේක් ඔයිල', 'බ්‍රේක් තෙල'],
  'Battery 12V 45Ah': ['battery', 'බැටරි', 'battery eka'],
  'Battery terminals': ['terminal', 'ටර්මිනල'],
  'Timing belt': ['timing belt', 'ටයිමිං බෙල්ට'],
  'Engine oil 4L': ['engine oil', 'oil change', 'ඔයිල් මාරු', 'එන්ජින් ඔයිල', 'oil eka'],
  'Oil filter': ['oil filter', 'ඔයිල් ෆිල්ටර'],
  'Air filter': ['air filter', 'එයාර් ෆිල්ටර'],
  'Cabin filter': ['cabin filter', 'ac filter'],
  'Spark plugs (set)': ['spark plug', 'plugs', 'ප්ලග', 'plug eka'],
  'Alternator': ['alternator', 'ඇල්ටනේටර', 'dynamo', 'ඩයිනමෝ'],
  'Starter motor': ['starter', 'ස්ටාටර'],
  'Clutch plate': ['clutch plate', 'clutch', 'ක්ලච'],
  'O2 sensor': ['o2 sensor', 'oxygen sensor', 'ඔක්සිජන් සෙන්සර'],
  'AC gas': ['ac gas', 'gas refill', 'ඒසී ගෑස', 'ac gas eka'],
  'AC compressor': ['compressor', 'කම්ප්‍රෙසර'],
  'Shock absorbers (pair)': ['shock absorber', 'shocks', 'ෂොක'],
  'Wiper blades': ['wiper', 'වයිපර'],
  'Tyre': ['new tyre', 'tyre replace', 'ටයරයක් මාරු', 'අලුත් ටයර'],
  Radiator: ['radiator', 'රේඩියේටර'],
  Headlight: ['headlight', 'head light', 'හෙඩ්ලයිට'],
  'Fan belt': ['fan belt', 'v belt', 'ෆෑන් බෙල්ට්'],
  'Wheel bearing': ['wheel bearing', 'බෙයාරිං'],
  'Fuel pump': ['fuel pump', 'පෙට්‍රල් පොම්ප', 'fuel pump eka'],
  'Tie rod end': ['tie rod', 'ටයි රොඩ්'],
  'Ball joint': ['ball joint', 'බෝල් ජොයින්ට්'],
};

export const URGENT_WORDS = ['urgent', 'asap', 'today', 'right now', 'emergency', 'stuck', 'ඉක්මනින්', 'හදිසි', 'අදම', 'දැන්ම', 'නතර', 'ikmanata', 'adama'];
export const LOW_URGENCY_WORDS = ['no rush', 'whenever', 'next week', 'next month', 'ලබන සතියේ', 'ලබන මාසේ', 'හෙමින්'];

/** Complaint topic → words (checked in this order; damage and wrong parts first). */
export const COMPLAINT_WORDS: [DisputeTopic, string[]][] = [
  ['damage', ['damage', 'damaged', 'broke', 'broken', 'scratch', 'scratched', 'dent', 'dented', 'හානි', 'කැඩුණා', 'කැඩිලා', 'සීරීම්', 'කැඩුවා']],
  ['wrongPart', ['wrong part', 'recon instead', 'not genuine', 'fake part', 'වැරදි කොටස', 'ජෙනුයින් නෙවෙයි', 'රීකන්ඩිෂන් දාලා']],
  ['quality', ['not fixed', 'still', 'again', 'same problem', 'came back', 'හැදුවේ නැ', 'ආයෙත්', 'තවමත්', 'එම ප්‍රශ්නය', 'hadala na']],
  ['price', ['overcharged', 'expensive', 'extra charge', 'more than quoted', 'hidden', 'ගාස්තුව වැඩි', 'මිල වැඩි', 'අමතර', 'ගණන වැඩි']],
  ['delay', ['late', 'delay', 'waited', 'hours', 'days', 'පරක්කු', 'ප්‍රමාද', 'බලාගෙන', 'parakku']],
  ['behaviour', ['rude', 'shouted', 'behaviour', 'unprofessional', 'හැසිරීම', 'අකාරුණික', 'බැන්නා', 'කෑගැහුවා']],
];

export const REFUND_WORDS = ['refund', 'money back', 'return my money', 'ආපසු ගෙවන්න', 'මුදල් ආපසු', 'සල්ලි ආපහු', 'salli apahu'];
export const ESCALATE_WORDS = ['police', 'court', 'lawyer', 'consumer affairs', 'පොලිසිය', 'නඩු', 'නීතිඥ', 'පාරිභෝගික අධිකාරිය'];

/** Moving the deal off the app. */
export const OFF_PLATFORM_PAYMENT_WORDS = ['pay cash directly', 'pay me directly', 'outside the app', 'without the app', 'bank transfer to me', 'cheaper without', 'කෙලින්ම ගෙවන්න', 'ඇප් එකෙන් නොවී', 'ඇප් එක නැතුව', 'app eken nathuwa', 'kelinma gewanna'];
export const OFF_PLATFORM_CHAT_WORDS = ['whatsapp', 'viber', 'imo', 'call me on', 'my number', 'වට්සැප්', 'වයිබර්', 'මගේ අංකය', 'මට කෝල් කරන්න', 'mage number eka'];

/** Kept short on purpose: these route a review to a person, they don't reject it on their own. */
export const ABUSE_WORDS = ['idiot', 'stupid', 'useless', 'bastard', 'මෝඩ', 'පල් ', 'ගොන්'];
export const ACCUSATION_WORDS = ['scam', 'cheat', 'fraud', 'thief', 'හොරා', 'වංචා', 'හොරකම', 'scam ekak'];
