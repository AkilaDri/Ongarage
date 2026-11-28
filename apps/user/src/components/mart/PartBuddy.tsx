import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, getAi, getThemeMode, SUGGEST_MIN_CONFIDENCE, themedStyles, type PartCategoryOption } from '@ongarage/shared';
import { FlowButton } from '../FlowButton';
import { FlowField } from '../FlowField';

export type PartSuggestion = { category?: PartCategoryOption; name?: string };

/** The part category that stands for each service category the shared AI rules answer with. */
const FROM_SERVICE: Record<string, string[]> = { '1': ['engine'], '2': ['electrical'], '3': ['hybrid', 'ev'], '4': ['cooling'], '6': ['tyres'], '7': ['brakes'], '8': ['body'], '11': ['battery', 'electrical'], '14': ['oils'] };

const MAX_SUGGESTIONS = 4;

const FRONT = 'Brake pads (front)';
const REAR = 'Brake pads (rear)';
const SAYS_FRONT = /\bfront\b|ඉදිරිපස|ඉස්සරහ|issaraha|idiripasa/i;
const SAYS_REAR = /\brear\b|\bback\b|පසුපස|පිටිපස්ස|pitipassa|pasupasa/i;

/** Brake pads come in two places, and the shared rules name only the front pair: offer the one the owner named, or both when neither (or both) is said. */
const padPositions = (names: string[], text: string): string[] => {
  if (!names.includes(FRONT) && !names.includes(REAR)) return names;
  const front = SAYS_FRONT.test(text);
  const rear = SAYS_REAR.test(text);
  const pads = front === rear ? [FRONT, REAR] : front ? [FRONT] : [REAR];
  return [...pads, ...names.filter((n) => n !== FRONT && n !== REAR)];
};

/**
 * OnBuddy for a part, the quote request's helper in the same place: the owner describes the part or the problem, and it suggests a common part name (with
 * its category), or only a category. It never fills anything in by itself, does not look at photos, does not promise a fit, and says so when the words
 * are not clear enough. The words go through the shared AI layer (rules for now).
 */
export const PartBuddy: React.FC<{ /** The vehicle's part categories. */ categories: PartCategoryOption[]; onUse: (s: PartSuggestion) => void }> = ({ categories, onUse }) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  // null: not asked yet; empty: asked, and nothing clear enough.
  const [found, setFound] = useState<PartSuggestion[] | null>(null);

  const ask = async () => {
    if (text.trim().length < 3 || busy) return;
    setBusy(true);
    const r = await getAi().classifyJob(text);
    const parts = padPositions(r.value.partsMentioned, text)
      .slice(0, MAX_SUGGESTIONS)
      .map((name) => ({ name, category: categories.find((c) => c.parts.includes(name)) }));
    const wanted = FROM_SERVICE[r.value.categoryId ?? ''] ?? [];
    const category = categories.find((c) => wanted.includes(c.id));
    // A category alone is offered only when the AI is sure enough of it.
    setFound(parts.length ? parts : category && r.confidence >= SUGGEST_MIN_CONFIDENCE ? [{ category }] : []);
    setBusy(false);
  };

  const close = () => {
    setOpen(false);
    setFound(null);
  };

  return (
    <View style={styles.card} accessibilityLabel="OnBuddy part helper">
      <View style={styles.head}>
        <View style={styles.disc}>
          <Text style={styles.robot}>🤖</Text>
        </View>
        <Text style={styles.title}>OnBuddy සහාය ලබාගන්න</Text>
        {open && (
          <Pressable style={styles.collapse} onPress={close} accessibilityRole="button" accessibilityLabel="Collapse OnBuddy">
            <Text style={styles.sub}>⌃</Text>
          </Pressable>
        )}
      </View>
      {!open ? (
        <>
          <Text style={styles.sub}>කොටසේ නම නොදනී නම්, කොටස හෝ ගැටලුව විස්තර කරන්න.</Text>
          <View style={styles.start}>
            <FlowButton label="විස්තරය ලියන්න ›" onPress={() => setOpen(true)} a11y="Open OnBuddy" />
          </View>
        </>
      ) : (
        <>
          <FlowField
            value={text}
            onChangeText={(t) => {
              setText(t);
              setFound(null);
            }}
            placeholder="උදා: බ්‍රේක් තද කරන විට ශබ්දයක් එනවා, pads මාරු කරන්න ඕනෙ"
            multiline
            accessibilityLabel="Describe the part for OnBuddy"
          />
          {found === null && <FlowButton label={busy ? 'OnBuddy සිතමින් පවතී…' : 'OnBuddy ගෙන් අසන්න'} disabled={busy || text.trim().length < 3} onPress={() => void ask()} a11y="Ask OnBuddy" />}
          {found?.length === 0 && <Text style={styles.unclear}>පැහැදිලිව හඳුනාගත නොහැකි විය. තව විස්තර ලියන්න, කාණ්ඩය තෝරන්න, නැත්නම් ඊළඟ පියවරේ ඡායාරූපයක් එක් කරන්න.</Text>}
          {!!found?.length && (
            <>
              <Text style={styles.head2}>OnBuddy ගේ යෝජනා · එකක් තෝරන්න</Text>
              {found.map((s) => (
                <Pressable
                  key={s.name ?? s.category!.id}
                  style={styles.option}
                  onPress={() => {
                    onUse(s);
                    close();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Use suggestion ${s.name ?? s.category!.si}`}
                >
                  <Text style={styles.optionTitle}>{s.name ?? s.category!.si}</Text>
                  <Text style={styles.sub}>{s.name ? (s.category ? `${s.category.si}\u00a0කාණ්ඩය` : 'කොටසේ නම') : 'කාණ්ඩය පමණයි'}</Text>
                </Pressable>
              ))}
              <Text style={styles.sub}>මේවා යෝජනා පමණි. වාහනයට ගැළපීම වෙළඳසැල තහවුරු කළ යුතුයි.</Text>
            </>
          )}
        </>
      )}
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    // The quote request's section card.
    card: { gap: 12, padding: 16, borderRadius: 26, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#f3f4f6', backgroundColor: getThemeMode() === 'dark' ? Colors.bgCard : '#ffffff', shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 10 }, shadowOpacity: getThemeMode() === 'dark' ? 0.6 : 0.16, shadowRadius: 22, elevation: 6 },
    head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    disc: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#dbeafe' },
    robot: { fontSize: 20 },
    title: { flex: 1, fontSize: 16, lineHeight: 23, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    collapse: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    sub: { fontSize: 13, lineHeight: 20, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    start: { alignSelf: 'flex-start', minWidth: 170 },
    unclear: { fontSize: 13, lineHeight: 20, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#fdd663' : '#b45309' },
    head2: { fontSize: 13, lineHeight: 20, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    option: { gap: 2, padding: 14, borderRadius: 16, borderWidth: 1.5, borderColor: '#facc15', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#eff6ff' },
    optionTitle: { fontSize: 14, lineHeight: 21, fontFamily: FONTS.bodyBold, color: Colors.textMain },
  })
);
