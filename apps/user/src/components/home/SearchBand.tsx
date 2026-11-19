import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextStyle, View } from 'react-native';
import { Colors, FONTS, getThemeMode, Icon, themedStyles } from '@ongarage/shared';

// The browser draws its own focus ring on text fields; the field's blue edge replaces it.
const NO_FOCUS_RING = { outlineStyle: 'none' } as unknown as TextStyle;

/**
 * The one search bar of the service screens: a solid blue band, the search pill, and a round ✕ on the right.
 * The list search and the map screen both use it, so the padding, sizes and words are the same everywhere.
 */
export const SearchBand: React.FC<{
  value: string;
  onChangeText: (text: string) => void;
  onClose: () => void;
  autoFocus?: boolean;
  /** Over a full-screen map: no blue band; the search pill and the round close button float with a soft shadow. */
  floating?: boolean;
}> = ({ value, onChangeText, onClose, autoFocus, floating }) => {
  const [focused, setFocused] = useState(false);
  const closeBtn = (
    <Pressable onPress={onClose} hitSlop={10} style={[styles.closeRound, floating && styles.floatShadow]} accessibilityLabel="Close search">
      <Text style={styles.closeRoundText}>✕</Text>
    </Pressable>
  );
  return (
    <View style={[styles.band, floating && styles.bandFloating]} pointerEvents={floating ? 'box-none' : 'auto'}>
      <View style={[styles.field, floating && styles.floatShadow, focused && styles.fieldFocus, focused && styles.glow]}>
        <Icon name="search" size={16} color={Colors.textMuted} />
        <TextInput
          style={[styles.input, NO_FOCUS_RING]}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoFocus={autoFocus}
          placeholder="සේවාවක් හෝ ගරාජයක් සොයන්න..."
          placeholderTextColor={getThemeMode() === 'dark' ? Colors.textMuted : '#94a3b8'}
          accessibilityLabel="Search text"
          returnKeyType="search"
        />
        {!!value && (
          <Pressable onPress={() => onChangeText('')} hitSlop={8} accessibilityLabel="Clear search">
            <Icon name="x" size={16} color={Colors.textMuted} />
          </Pressable>
        )}
      </View>
      {closeBtn}
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    band: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 68, backgroundColor: '#1d367f' },
    bandFloating: { backgroundColor: 'transparent', paddingTop: 0, paddingBottom: 0 },
    floatShadow: { shadowColor: '#0f172a', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.22, shadowRadius: 8, elevation: 6 },
    closeRound: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: 'transparent', backgroundColor: Colors.bgCard, justifyContent: 'center', alignItems: 'center' },
    closeRoundText: { fontSize: 16, fontWeight: '700', color: Colors.textMain },
    field: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 52, paddingHorizontal: 14, borderRadius: 26, borderWidth: 2, borderColor: 'transparent', backgroundColor: Colors.bgCard },
    fieldFocus: { borderColor: '#1a73e8' },
    // The blue glow round the pill and the close button while typing: one shared look for both search screens.
    glow: { borderWidth: 2, borderColor: '#1a73e8', shadowColor: '#3b82f6', shadowOpacity: 0.9, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
    input: { flex: 1, fontSize: 14, fontFamily: FONTS.bodyRegular, color: Colors.textMain, paddingVertical: 0 },
  })
);
