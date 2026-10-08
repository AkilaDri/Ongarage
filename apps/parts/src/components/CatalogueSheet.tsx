import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionButton, Colors, FONTS, SERVICE_CATEGORIES, themedStyles, softEdge, softShadow } from '@ongarage/shared';
import { useShop } from '../context/ShopContext';
import { ALL_TYPES } from '../constants/mockData';
import { Sheet } from './Sheet';
import type { QuoteType } from '../types';

const TYPE_NOTE: Record<QuoteType, string> = {
  Genuine: 'නිෂ්පාදකයාගේම කොටස්',
  OEM: 'OEM / Aftermarket සන්නාම',
  Recon: 'ප්‍රතිසංස්කරණය කළ කොටස් (අයිතිකරු අනුමතියෙන් පමණි)',
};

/**
 * What the shop sells: part types and service categories. A draft until saved, so a
 * stray tap can't stop requests the shop should be getting.
 */
export const CatalogueSheet: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const { profile, saveCatalogue } = useShop();
  const [types, setTypes] = useState<QuoteType[]>(profile.types);
  const [cats, setCats] = useState<string[]>(profile.categories);

  useEffect(() => {
    if (!visible) return;
    setTypes(profile.types);
    setCats(profile.categories);
  }, [visible, profile.types, profile.categories]);

  const toggle = <T,>(list: T[], x: T) => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x]);
  const changes =
    types.filter((t) => !profile.types.includes(t)).length +
    profile.types.filter((t) => !types.includes(t)).length +
    cats.filter((c) => !profile.categories.includes(c)).length +
    profile.categories.filter((c) => !cats.includes(c)).length;

  return (
    <Sheet
      visible={visible}
      title="අලෙවි කරන කොටස්"
      subtitle="ඔබට මිල ගණන් යැවිය හැක්කේ මෙම වර්ග සඳහා පමණි"
      onClose={onClose}
      footer={
        <ActionButton
          label={changes ? `වෙනස්කම් ${changes} සුරකින්න` : 'වෙනස්කම් නැත'}
          icon="✓"
          variant="primary"
          disabled={!changes || !types.length || !cats.length}
          onPress={() => {
            saveCatalogue(types, cats);
            onClose();
          }}
        />
      }
    >
      <Text style={styles.label}>කොටස් වර්ග</Text>
      {ALL_TYPES.map((t) => {
        const on = types.includes(t);
        return (
          <Pressable key={t} style={[styles.row, on && styles.rowOn]} onPress={() => setTypes((p) => toggle(p, t))}>
            <View style={styles.flex1}>
              <Text style={styles.name}>{t}</Text>
              <Text style={styles.sub}>{TYPE_NOTE[t]}</Text>
            </View>
            <View style={[styles.switch, on && styles.switchOn]}>
              <View style={[styles.knob, on && styles.knobOn]} />
            </View>
          </Pressable>
        );
      })}
      <Text style={styles.label}>සේවා ප්‍රවර්ග</Text>
      <View style={styles.grid}>
        {SERVICE_CATEGORIES.map((c) => {
          const on = cats.includes(c.id);
          return (
            <Pressable key={c.id} style={[styles.cat, on && styles.catOn]} onPress={() => setCats((p) => toggle(p, c.id))}>
              <Text style={[styles.catText, on && { color: Colors.primary }]}>
                {c.icon} {c.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    label: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 6 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, borderWidth: 1, borderColor: softEdge(), backgroundColor: Colors.bgCard, ...softShadow() },
    rowOn: { borderColor: 'rgba(56, 189, 248, 0.45)' },
    name: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    switch: { width: 42, height: 24, borderRadius: 12, padding: 3, backgroundColor: Colors.subtleBorder, justifyContent: 'center' },
    switchOn: { backgroundColor: Colors.primary },
    knob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' },
    knobOn: { alignSelf: 'flex-end' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    cat: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: softEdge(), backgroundColor: Colors.bgCard, ...softShadow() },
    catOn: { borderColor: Colors.primary, backgroundColor: 'rgba(56, 189, 248, 0.1)' },
    catText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
  })
);
