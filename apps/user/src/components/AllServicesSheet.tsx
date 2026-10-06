import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, GlassIcon, marketPrice, SERVICE_CATEGORIES, themedStyles, type ServiceCategory } from '@ongarage/shared';
import { Sheet } from './Sheet';
import { money } from '../utils/format';

/** Every service with what it covers and a typical price; picking one opens its garages. */
export const AllServicesSheet: React.FC<{ visible: boolean; onClose: () => void; onSelect: (s: ServiceCategory) => void }> = ({ visible, onClose, onSelect }) => (
  <Sheet visible={visible} title="සියලු සේවා" subtitle="සේවාවක් තෝරා ළඟම ගරාජ බලන්න" onClose={onClose}>
    {SERVICE_CATEGORIES.map((c) => (
      <Pressable
        key={c.id}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        onPress={() => {
          onClose();
          onSelect(c);
        }}
        accessibilityLabel={`Service ${c.name}`}
      >
        <GlassIcon emoji={c.icon} small />
        <View style={styles.flex1}>
          <Text style={styles.name}>{c.name}</Text>
          <Text style={styles.sub} numberOfLines={1}>
            {c.subcategories.join(' · ')}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.price}>{money(marketPrice(c.id))}</Text>
          <Text style={styles.sub}>සාමාන්‍ය</Text>
        </View>
      </Pressable>
    ))}
  </Sheet>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor },
    pressed: { opacity: 0.75 },
    name: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    right: { alignItems: 'flex-end' },
    price: { fontSize: 12, fontFamily: FONTS.bodyBold, color: Colors.primary },
  })
);
