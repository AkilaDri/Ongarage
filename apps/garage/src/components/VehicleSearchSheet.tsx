import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Colors, FONTS, getThemeMode, themedStyles } from '@ongarage/shared';
import { Sheet } from './Sheet';
import { VehicleRecordPanel } from './VehicleRecordPanel';
import type { Booking } from '../types';

/**
 * The search window: type a vehicle's registration number (a part of it is enough) and see every job done on that vehicle through the app,
 * vehicle by vehicle. Tapping a job closes the window and opens its details.
 */
export const VehicleSearchSheet: React.FC<{ visible: boolean; onClose: () => void; bookings: Booking[]; onOpen: (id: string) => void }> = ({ visible, onClose, bookings, onOpen }) => {
  const [query, setQuery] = useState('');
  useEffect(() => {
    if (!visible) setQuery('');
  }, [visible]);

  return (
    <Sheet visible={visible} title="වාහන සෙවුම" subtitle="ලියාපදිංචි අංකයෙන් වාහනයේ සියලු රැකියා වාර්තා බලන්න" onClose={onClose}>
      <View style={styles.box}>
        <Text style={styles.icon}>🔎</Text>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="වාහන අංකය (Registration No)"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus
          accessibilityLabel="Search a vehicle by registration number"
        />
        {!!query && (
          <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Clear search">
            <Text style={styles.clear}>✕</Text>
          </Pressable>
        )}
      </View>
      {query.trim() ? (
        <VehicleRecordPanel
          bookings={bookings}
          query={query}
          onOpen={(id) => {
            onClose();
            onOpen(id);
          }}
        />
      ) : (
        <Text style={styles.hint}>වාහනයේ ලියාපදිංචි අංකය (හෝ කොටසක්) ටයිප් කරන්න.</Text>
      )}
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    box: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, height: 48, borderRadius: 24, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0', backgroundColor: Colors.bgCard },
    icon: { fontSize: 16 },
    input: { flex: 1, outlineWidth: 0, outlineColor: 'transparent', fontSize: 15, fontFamily: FONTS.bodyRegular, color: Colors.textMain, paddingVertical: 0 },
    clear: { fontSize: 15, color: Colors.textMuted },
    hint: { fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, textAlign: 'center', paddingVertical: 24 },
  })
);
