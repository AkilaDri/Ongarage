import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { categoryInfo, Colors, EmptyState, FONTS, GlassIcon, SERVICE_CATEGORIES, themedStyles } from '@ongarage/shared';
import { useShop } from '../context/ShopContext';
import { StockEditSheet, type StockTarget } from '../components/StockEditSheet';
import { money } from '../utils/format';
import type { StockItem } from '../types';

// What the shop has. Quotes are pre-filled from these prices, and an order can only
// be confirmed when the quantities are here, so keeping it current protects the rating.
type Filter = 'all' | 'low' | string;
const LOW = 1;

export const StockScreen: React.FC = () => {
  const { stock, profile, adjustQty } = useShop();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<StockTarget | null>(null);

  const isLow = (i: StockItem) => i.variants.some((v) => v.qty <= LOW);
  const lowCount = stock.filter(isLow).length;
  const shown = stock
    .filter((i) => (filter === 'all' ? true : filter === 'low' ? isLow(i) : i.categoryId === filter))
    .filter((i) => i.name.toLowerCase().includes(query.trim().toLowerCase()));
  const categories = SERVICE_CATEGORIES.filter((c) => profile.categories.includes(c.id));

  return (
    <View style={styles.flex1}>
      <ScrollView style={styles.flex1} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.searchRow}>
          <TextInput style={styles.search} value={query} onChangeText={setQuery} placeholder="🔍 කොටසක් සොයන්න" placeholderTextColor={Colors.textMuted} />
          <Pressable style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]} onPress={() => setEditing({ item: null })} accessibilityLabel="Add stock item">
            <Text style={styles.addText}>＋</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <FilterChip label={`සියල්ල (${stock.length})`} on={filter === 'all'} onPress={() => setFilter('all')} />
          <FilterChip label={`⚠️ අඩු / නැති (${lowCount})`} on={filter === 'low'} onPress={() => setFilter('low')} warn={lowCount > 0} />
          {categories.map((c) => (
            <FilterChip key={c.id} label={`${c.icon} ${c.name}`} on={filter === c.id} onPress={() => setFilter(c.id)} />
          ))}
        </ScrollView>

        {shown.length === 0 ? (
          <EmptyState icon="📦" title="අයිතම නැත" text="“＋” ඔබා තොගයේ ඇති කොටසක් එක් කරන්න." />
        ) : (
          shown.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.row}>
                <GlassIcon emoji={categoryInfo(item.categoryId).icon} small />
                <View style={styles.flex1}>
                  <Text style={styles.title}>{item.name}</Text>
                  <Text style={styles.sub}>{categoryInfo(item.categoryId).name}</Text>
                </View>
              </View>
              {item.variants.map((v) => {
                const out = v.qty === 0;
                const low = !out && v.qty <= LOW;
                return (
                  <View key={v.type} style={styles.variant}>
                    <Pressable style={styles.variantInfo} onPress={() => setEditing({ item, type: v.type })} accessibilityLabel={`Edit ${item.name} ${v.type}`}>
                      <View style={[styles.type, v.type === 'Recon' && styles.typeRecon]}>
                        <Text style={[styles.typeText, v.type === 'Recon' && { color: Colors.warning }]}>{v.type}</Text>
                      </View>
                      <View style={styles.flex1}>
                        <Text style={styles.priceText}>{money(v.price)} ✎</Text>
                        <Text style={[styles.sub, out && { color: Colors.errorText }, low && { color: Colors.warning }]}>
                          {v.brand ? `${v.brand} · ` : ''}
                          {out ? 'තොග නැත' : low ? 'අඩු තොගය' : 'තොගයේ ඇත'}
                        </Text>
                      </View>
                    </Pressable>
                    <View style={styles.qty}>
                      <Pressable style={[styles.qtyBtn, out && styles.off]} disabled={out} onPress={() => adjustQty(item.id, v.type, -1)} accessibilityLabel={`Less ${item.name} ${v.type}`}>
                        <Text style={styles.qtyBtnText}>−</Text>
                      </Pressable>
                      <Text style={[styles.qtyValue, out && { color: Colors.errorText }]}>{v.qty}</Text>
                      <Pressable style={styles.qtyBtn} onPress={() => adjustQty(item.id, v.type, 1)} accessibilityLabel={`More ${item.name} ${v.type}`}>
                        <Text style={styles.qtyBtnText}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
      <StockEditSheet target={editing} onClose={() => setEditing(null)} />
    </View>
  );
};

const FilterChip: React.FC<{ label: string; on: boolean; onPress: () => void; warn?: boolean }> = ({ label, on, onPress, warn }) => (
  <Pressable style={[styles.filter, on && styles.filterOn, warn && !on && styles.filterWarn]} onPress={onPress}>
    <Text style={[styles.filterText, on && styles.filterTextOn]}>{label}</Text>
  </Pressable>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    body: { padding: 16, gap: 12, paddingBottom: 100 },
    pressed: { opacity: 0.75 },
    searchRow: { flexDirection: 'row', gap: 8 },
    search: {
      flex: 1,
      height: 46,
      paddingHorizontal: 14,
      borderRadius: 14,
      backgroundColor: Colors.bgCard,
      borderWidth: 1,
      borderColor: Colors.borderColor,
      color: Colors.textMain,
      fontSize: 13,
      fontFamily: FONTS.bodyMedium,
    },
    addBtn: { width: 46, height: 46, borderRadius: 14, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
    addText: { fontSize: 22, color: '#fff', fontWeight: '700' },
    chips: { gap: 6 },
    filter: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard },
    filterOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    filterWarn: { borderColor: 'rgba(245, 158, 11, 0.55)' },
    filterText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    filterTextOn: { color: '#fff' },
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, borderRadius: 18, padding: 14, gap: 10 },
    title: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    variant: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.borderColor },
    variantInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    type: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: 'rgba(56, 189, 248, 0.12)', minWidth: 62, alignItems: 'center' },
    typeRecon: { backgroundColor: 'rgba(245, 158, 11, 0.14)' },
    typeText: { fontSize: 10, fontWeight: '800', color: Colors.primary },
    priceText: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    qty: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    qtyBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.subtleFill, borderWidth: 1, borderColor: Colors.borderColor, justifyContent: 'center', alignItems: 'center' },
    qtyBtnText: { fontSize: 16, fontWeight: '700', color: Colors.textMain },
    qtyValue: { fontSize: 14, fontFamily: FONTS.bodyBold, color: Colors.textMain, minWidth: 22, textAlign: 'center' },
    off: { opacity: 0.35 },
  })
);
