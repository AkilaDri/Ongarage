import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { categoriesForVehicle, Colors, FONTS, marketPrice, SERVICE_CATEGORIES, themedStyles, type ServiceCategory } from '@ongarage/shared';
import { useVehicles } from '../context/VehiclesContext';
import { Sheet } from './Sheet';
import { CategoryPhoto } from './home/CategoryPhoto';
import { money } from '../utils/format';
import { useRankedCategories } from '../utils/rankedCategories';

/** Every service with what it covers and a typical price; picking one opens its garages. */
export const AllServicesSheet: React.FC<{ visible: boolean; onClose: () => void; onSelect: (s: ServiceCategory) => void }> = ({ visible, onClose, onSelect }) => {
  // Same order as the Home strip: the common services first.
  const { activeVehicle } = useVehicles();
  const allowed = categoriesForVehicle(activeVehicle.type);
  const ranked = useRankedCategories().filter((c) => allowed.includes(c.id));
  return (
  <Sheet visible={visible} noDividers title="සියලු සේවා" subtitle="සේවාවක් තෝරා ළඟම ගරාජ බලන්න" onClose={onClose}>
    {/* Room under the title and subtitle, and at the end of the list. */}
    <View style={styles.list}>
    {ranked.map((c) => (
      <Pressable
        key={c.id}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        onPress={() => {
          onClose();
          onSelect(c);
        }}
        accessibilityLabel={`Service ${c.name}`}
      >
        <CategoryPhoto categoryId={c.id} size={44} />
        <View style={styles.flex1}>
          <Text style={styles.name}>{c.name}</Text>
          <Text style={styles.sub} numberOfLines={2}>
            {c.subcategories.join(' · ')}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.price}>{money(marketPrice(c.id))}</Text>
          <Text style={styles.priceLabel}>සාමාන්‍ය මිල</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    ))}
    </View>
  </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    list: { paddingTop: 16, paddingBottom: 24, gap: 10 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 72, borderRadius: 16, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor },
    pressed: { opacity: 0.75 },
    // The name leads (15px bold), what it covers follows (12px, two lines), the price is a separate column: three levels, each a step apart.
    name: { fontSize: 15, lineHeight: 21, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 12, lineHeight: 17, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 2 },
    priceLabel: { fontSize: 12, lineHeight: 17, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 2 },
    chevron: { fontSize: 22, lineHeight: 26, fontFamily: FONTS.bodyBold, color: Colors.textMuted },
    right: { alignItems: 'flex-end' },
    price: { fontSize: 14, lineHeight: 20, fontFamily: FONTS.bodyBold, color: Colors.primary },
  })
);
