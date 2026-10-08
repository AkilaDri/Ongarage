import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton, Colors, FONTS, SERVICE_CATEGORIES, themedStyles, softEdge, softShadow } from '@ongarage/shared';
import { useShop } from '../context/ShopContext';
import { ALL_TYPES, listPrice } from '../constants/mockData';
import { money } from '../utils/format';
import { Sheet } from './Sheet';
import type { QuoteType, StockItem } from '../types';

/** Edit one item's price/brand/quantity for a part type, or add a new item. */
export type StockTarget = { item: StockItem; type: QuoteType } | { item: null };

export const StockEditSheet: React.FC<{ target: StockTarget | null; onClose: () => void }> = ({ target, onClose }) => {
  const { profile, saveVariant, addItem } = useShop();
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState(profile.categories[0] ?? '1');
  const [type, setType] = useState<QuoteType>('OEM');
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('');
  const [brand, setBrand] = useState('');
  const [shown, setShown] = useState<StockTarget | null>(target);

  useEffect(() => {
    if (!target) return;
    setShown(target);
    if (target.item) {
      const v = target.item.variants.find((x) => x.type === target.type);
      setName(target.item.name);
      setCategoryId(target.item.categoryId);
      setType(target.type);
      setPrice(String(v?.price ?? listPrice(target.item.name, target.type)));
      setQty(String(v?.qty ?? 0));
      setBrand(v?.brand ?? '');
    } else {
      setName('');
      setCategoryId(profile.categories[0] ?? '1');
      setType(profile.types[0] ?? 'OEM');
      setPrice('');
      setQty('1');
      setBrand('');
    }
  }, [target, profile.categories, profile.types]);

  if (!shown) return null;
  const editing = !!shown.item;
  const valid = name.trim().length > 1 && Number(price) > 0;

  const save = () => {
    const variant = { type, price: Number(price), qty: Number(qty) || 0, brand: brand.trim() || undefined };
    if (shown.item) saveVariant(shown.item.id, variant);
    else addItem({ name: name.trim(), categoryId, variants: [variant] });
    onClose();
  };

  return (
    <Sheet
      visible={!!target}
      title={editing ? `${name} · ${type}` : 'නව තොග අයිතමයක්'}
      subtitle={editing ? 'මිල ගණන් යැවීමේදී මෙම මිල පෙරනිමියෙන් භාවිතා වේ' : 'ගරාජවලට ඉක්මනින් මිල ගණන් යැවීමට තොගයේ ඇති දේ එක් කරන්න'}
      onClose={onClose}
      footer={<ActionButton label="සුරකින්න" icon="✓" variant="primary" disabled={!valid} onPress={save} />}
    >
      {!editing && (
        <>
          <Text style={styles.label}>කොටසේ නම</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="උදා: Wiper blades" placeholderTextColor={Colors.textMuted} maxLength={40} />
          <Text style={styles.label}>සේවා ප්‍රවර්ගය</Text>
          <View style={styles.chips}>
            {SERVICE_CATEGORIES.filter((c) => profile.categories.includes(c.id)).map((c) => (
              <Pressable key={c.id} style={[styles.chip, categoryId === c.id && styles.chipOn]} onPress={() => setCategoryId(c.id)}>
                <Text style={[styles.chipText, categoryId === c.id && styles.chipTextOn]}>
                  {c.icon} {c.name}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>වර්ගය</Text>
          <View style={styles.chips}>
            {ALL_TYPES.filter((t) => profile.types.includes(t)).map((t) => (
              <Pressable key={t} style={[styles.chip, type === t && styles.chipOn]} onPress={() => setType(t)}>
                <Text style={[styles.chipText, type === t && styles.chipTextOn]}>{t}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
      <Text style={styles.label}>ඒකක මිල</Text>
      <View style={styles.priceBox}>
        <Text style={styles.currency}>රු.</Text>
        <TextInput style={styles.priceInput} keyboardType="number-pad" value={price} onChangeText={(t) => setPrice(t.replace(/[^0-9]/g, ''))} maxLength={7} accessibilityLabel="Unit price" />
      </View>
      {name.trim().length > 1 && <Text style={styles.sub}>සාමාන්‍ය වෙළඳපොළ මිල ({type}): {money(listPrice(name.trim(), type))}</Text>}
      <View style={styles.twoCol}>
        <View style={styles.flex1}>
          <Text style={styles.label}>තොගයේ ප්‍රමාණය</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={qty} onChangeText={(t) => setQty(t.replace(/[^0-9]/g, ''))} maxLength={4} accessibilityLabel="Quantity" />
        </View>
        <View style={styles.flex1}>
          <Text style={styles.label}>සන්නාමය</Text>
          <TextInput style={styles.input} value={brand} onChangeText={setBrand} placeholder="උදා: Denso" placeholderTextColor={Colors.textMuted} maxLength={20} />
        </View>
      </View>
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    twoCol: { flexDirection: 'row', gap: 10 },
    label: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 6, marginBottom: 6 },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: softEdge(), backgroundColor: Colors.bgCard, ...softShadow() },
    chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    chipText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    chipTextOn: { color: '#fff' },
    input: {
      height: 46,
      paddingHorizontal: 12,
      borderRadius: 16,
      backgroundColor: Colors.bgCard,
      borderWidth: 1,
      borderColor: softEdge(),
      color: Colors.textMain,
      fontSize: 13,
      fontFamily: FONTS.bodyMedium,
      ...softShadow(),
    },
    priceBox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, height: 52, borderRadius: 18, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), ...softShadow() },
    currency: { fontSize: 15, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    priceInput: { flex: 1, fontSize: 20, fontWeight: '800', color: Colors.textMain },
  })
);
