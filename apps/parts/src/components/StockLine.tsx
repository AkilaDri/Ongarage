import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, themedStyles, type PartLine } from '@ongarage/shared';
import { useShop, variantFor } from '../context/ShopContext';
import type { QuoteType } from '../types';

/** A requested line with what the shop has of it, per part type it may quote. */
export const StockLine: React.FC<{ line: PartLine; types: QuoteType[] }> = ({ line, types }) => {
  const { stock } = useShop();
  return (
    <View style={styles.row}>
      <Text style={styles.name} numberOfLines={1}>
        {line.name} ×{line.qty}
      </Text>
      <View style={styles.tags}>
        {types.length === 0 ? (
          <Text style={[styles.tag, styles.no]}>වර්ගය නැත</Text>
        ) : (
          types.map((t) => {
            const qty = variantFor(stock, line.name, t)?.qty ?? 0;
            const ok = qty >= line.qty;
            return (
              <Text key={t} style={[styles.tag, ok ? styles.ok : styles.no]}>
                {ok ? `✓ ${t} ${qty}` : `✕ ${t}`}
              </Text>
            );
          })
        )}
      </View>
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    name: { flex: 1, fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    tags: { flexDirection: 'row', gap: 4 },
    tag: { fontSize: 10, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 7, overflow: 'hidden' },
    ok: { color: Colors.successText, backgroundColor: 'rgba(16, 185, 129, 0.12)' },
    no: { color: Colors.errorText, backgroundColor: 'rgba(239, 68, 68, 0.1)' },
  })
);
