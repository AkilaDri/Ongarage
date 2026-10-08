import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionButton, Colors, dealLabel, dealPrice, FONTS, MAX_DEAL_DAYS, MAX_DEAL_PERCENT, themedStyles, softEdge, softFill } from '@ongarage/shared';
import { useShop } from '../context/ShopContext';
import { money } from '../utils/format';
import { Sheet } from './Sheet';
import type { StockTarget } from './StockEditSheet';

const PERCENTS = [5, 10, 15, 20, 25, 30];
const DAYS = [1, 3, 7, MAX_DEAL_DAYS];

/**
 * A limited-time discount on one stock item: shown to owners on OnMart's landing page ("−15%", countdown) and used as
 * the starting price when the shop answers an enquiry. 1–50% off, up to 14 days.
 */
export const DealSheet: React.FC<{ target: StockTarget | null; onClose: () => void }> = ({ target, onClose }) => {
  const { liveDeal, setDeal, endDeal } = useShop();
  const [shown, setShown] = useState<StockTarget | null>(target);
  const [percent, setPercent] = useState(10);
  const [days, setDays] = useState(3);
  const [error, setError] = useState<string | null>(null);

  const t = target ?? shown;
  const item = t && t.item ? t.item : null;
  const type = t && t.item ? t.type : null;
  const existing = item && type ? liveDeal(item.name, type) : undefined;

  useEffect(() => {
    if (!target) return;
    setShown(target);
    setError(null);
    if (target.item) {
      const d = liveDeal(target.item.name, target.type);
      setPercent(d?.discountPercent ?? 10);
      setDays(3);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  if (!item || !type) return null;
  const variant = item.variants.find((v) => v.type === type);
  const base = variant?.price ?? 0;

  const save = () => {
    const err = setDeal(item.name, type, percent, days);
    if (err) setError(err);
    else onClose();
  };

  return (
    <Sheet
      visible={!!target}
      title="🏷️ දීමනාවක් දමන්න"
      subtitle={`${item.name} · ${type}`}
      onClose={onClose}
      footer={
        <View style={styles.footer}>
          {!!existing && (
            <View style={styles.flex1}>
              <ActionButton
                label="අවසන් කරන්න"
                variant="ghost"
                compact
                onPress={() => {
                  endDeal(item.name, type);
                  onClose();
                }}
              />
            </View>
          )}
          <View style={styles.flex2}>
            <ActionButton label={existing ? 'යාවත්කාලීන කරන්න' : 'දීමනාව සක්‍රීය කරන්න'} icon="✓" variant="success" compact onPress={save} />
          </View>
        </View>
      }
    >
      <View style={styles.card}>
        <Text style={styles.sub}>සාමාන්‍ය මිල</Text>
        <Text style={styles.price}>{money(base)}</Text>
        <Text style={styles.sub}>දීමනා මිල ({dealLabel(percent)})</Text>
        <Text style={styles.deal}>{money(dealPrice(base, percent))}</Text>
        <Text style={styles.sub}>තොගය: {variant?.qty ?? 0} · ගනුදෙනුකරුවන්ට OnMart මුල් පිටුවේ “ඔබට ළඟම දීමනා” හි පෙනේ.</Text>
      </View>

      <Text style={styles.label}>වට්ටම (උපරිම {MAX_DEAL_PERCENT}%)</Text>
      <View style={styles.chips}>
        {PERCENTS.map((p) => (
          <Pressable key={p} style={[styles.chip, percent === p && styles.chipOn]} onPress={() => setPercent(p)} accessibilityLabel={`Discount ${p}`}>
            <Text style={[styles.chipText, percent === p && styles.chipTextOn]}>{p}%</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>කාලය (දින)</Text>
      <View style={styles.chips}>
        {DAYS.map((d) => (
          <Pressable key={d} style={[styles.chip, days === d && styles.chipOn]} onPress={() => setDays(d)} accessibilityLabel={`Days ${d}`}>
            <Text style={[styles.chipText, days === d && styles.chipTextOn]}>{d}</Text>
          </Pressable>
        ))}
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    flex2: { flex: 2 },
    footer: { flexDirection: 'row', gap: 8 },
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), borderRadius: 18, padding: 14, gap: 2 },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    price: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMuted, textDecorationLine: 'line-through' },
    deal: { fontSize: 22, fontFamily: FONTS.titleBold, color: Colors.successText },
    label: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, marginTop: 4 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 18, backgroundColor: softFill(), borderWidth: 1, borderColor: softEdge() },
    chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    chipText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    chipTextOn: { color: '#ffffff' },
    error: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.errorText },
  })
);
