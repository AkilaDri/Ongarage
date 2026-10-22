import { Platform } from 'react-native';

// The Latin letters and numbers use the Apple system font (San Francisco) wherever it exists: "-apple-system" / "SF Pro" on an iPhone, iPad or Mac.
// Apple's font cannot be shipped with an app, so on every other machine (Windows, Android, Linux) the app loads Inter, the face designed to match
// San Francisco, so the text looks the same everywhere. Sinhala is set in Apple's own Sinhala face (Sinhala Sangam MN) where it exists, and in Noto Sans Sinhala (clear, evenly weighted) everywhere else. On the web one family list does all of it: the browser
// takes each character from the first font in the list that has it. An app that does not load Inter (the other apps) skips that name and falls
// back to Noto Sans Sinhala for everything, as before. The system font has no family name per weight, so the weight is added as fontWeight
// (themedStyles does it from the style's family, see `fontWeightOf`). Phones take a single family per style, so there it stays Noto Sans Sinhala.
const APPLE = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display'";
const pair = (inter: string, noto: string) => (Platform.OS === 'web' ? `${APPLE}, ${inter}, 'Sinhala Sangam MN', ${noto}` : noto);

export const FONTS = {
  titleBold: pair('Inter_700Bold', 'NotoSansSinhala_700Bold'),
  titleSemiBold: pair('Inter_600SemiBold', 'NotoSansSinhala_600SemiBold'),
  titleMedium: pair('Inter_500Medium', 'NotoSansSinhala_500Medium'),
  bodyBold: pair('Inter_700Bold', 'NotoSansSinhala_700Bold'),
  bodySemiBold: pair('Inter_600SemiBold', 'NotoSansSinhala_600SemiBold'),
  bodyMedium: pair('Inter_500Medium', 'NotoSansSinhala_500Medium'),
  bodyRegular: pair('Inter_400Regular', 'NotoSansSinhala_400Regular'),
};

/** The CSS weight a style's family stands for (web only: the system font takes its weight from fontWeight, not from its name). */
export const fontWeightOf = (family: unknown): '400' | '500' | '600' | '700' | undefined => {
  if (Platform.OS !== 'web' || typeof family !== 'string' || !family.includes('NotoSansSinhala_')) return undefined;
  if (family.includes('_700')) return '700';
  if (family.includes('_600')) return '600';
  if (family.includes('_500')) return '500';
  return '400';
};
