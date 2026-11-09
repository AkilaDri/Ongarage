import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, didYouMean, FONTS, themedStyles } from '@ongarage/shared';

/**
 * The empty result of a search: the word that found nothing, and the services it probably meant as chips.
 * Touching a chip puts its name in the search, so the list shows what it finds.
 */
export const DidYouMean: React.FC<{ query: string; onPick: (text: string) => void }> = ({ query, onPick }) => {
  const suggestions = useMemo(() => didYouMean(query), [query]);
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>
        <Text style={styles.term}>“{query}”</Text> සඳහා ප්‍රතිඵල නැත.
      </Text>
      {!!suggestions.length && (
        <>
          <Text style={styles.ask}>ඔබ සොයන්නේ මෙම සේවාවන් ද ?</Text>
          <View style={styles.chips}>
            {suggestions.map((s) => (
              <Pressable key={`${s.categoryId}:${s.label}`} style={styles.chip} onPress={() => onPick(s.label)} accessibilityLabel={`Did you mean ${s.label}`}>
                <Text style={styles.chipText}>{s.label}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    wrap: { paddingHorizontal: 20, paddingTop: 28, gap: 12, alignItems: 'center' },
    // Normal text colour, not the faint grey: the message has to be read at a glance.
    text: { fontSize: 15, lineHeight: 22, color: Colors.textMain, fontFamily: FONTS.bodyRegular, textAlign: 'center' },
    // The word they typed is the emphasis: bold, the one thing that stands out.
    term: { fontFamily: FONTS.bodyBold },
    ask: { fontSize: 14, color: Colors.textMuted, fontFamily: FONTS.bodySemiBold },
    chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
    chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: Colors.primary },
    chipText: { fontSize: 14, color: '#fff', fontFamily: FONTS.bodySemiBold },
  })
);
