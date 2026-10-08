import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton, Colors, countdown, FONTS, MAX_DEAL_DAYS, money, themedStyles, softEdge, softFill } from '@ongarage/shared';
import { useShop } from '../context/ShopContext';
import { Sheet } from './Sheet';

const FREE_OVER = [undefined, 5000, 8000, 10000, 15000] as const;
const DAYS = [3, 7, MAX_DEAL_DAYS];

/**
 * How the shop promotes itself on OnMart: free delivery above a basket value (shown on its card), and a paid banner
 * on the landing page. Every banner is labelled as an ad and is reviewed first; ads never change the shop's place in
 * the rankings.
 */
export const PromoSheet: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const { promo, deals, setFreeDelivery, requestBanner } = useShop();
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [days, setDays] = useState(7);
  const now = Date.now();
  const live = deals.filter((d) => d.endsAt > now);

  useEffect(() => {
    if (!visible) return;
    setTitle('');
    setSubtitle('');
    setDays(7);
  }, [visible]);

  const banner = promo.banner;
  const valid = title.trim().length >= 4;

  return (
    <Sheet visible={visible} title="OnMart ප්‍රවර්ධන" subtitle="ගනුදෙනුකරුවන් ඔබව සොයා ගන්නා ආකාරය" onClose={onClose}>
      <View style={styles.card}>
        <Text style={styles.title}>🏷️ දීමනා ({live.length})</Text>
        {live.length === 0 ? (
          <Text style={styles.sub}>තොග පිටුවේ කොටසක “දීමනාවක් දමන්න” ඔබන්න.</Text>
        ) : (
          live.map((d) => (
            <Text key={d.id} style={styles.sub}>
              • {d.partName} ({d.partType}) · −{d.discountPercent}% · ⏳ {countdown(d.endsAt - now)}
            </Text>
          ))
        )}
      </View>

      <Text style={styles.label}>🚚 නොමිලේ බෙදාහැරීම</Text>
      <View style={styles.chips}>
        {FREE_OVER.map((v) => (
          <Pressable key={String(v)} style={[styles.chip, promo.freeDeliveryOver === v && styles.chipOn]} onPress={() => setFreeDelivery(v)} accessibilityLabel={`Free delivery ${v ?? 'off'}`}>
            <Text style={[styles.chipText, promo.freeDeliveryOver === v && styles.chipTextOn]}>{v ? `${money(v)}+` : 'නැත'}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.sub}>කොටස්වල වටිනාකම මෙයට ළඟා වූ විට ඔබේ බෙදාහැරීමේ ගාස්තුව අය නොකෙරේ; ඔබගේ කාඩ්පතේ “🚚 නොමිලේ” ලෙස පෙනේ.</Text>

      <Text style={styles.label}>📣 දැන්වීමක් (බැනරයක්)</Text>
      {banner ? (
        <View style={styles.card}>
          <Text style={styles.title}>{banner.title}</Text>
          {!!banner.subtitle && <Text style={styles.sub}>{banner.subtitle}</Text>}
          <View style={[styles.status, banner.status === 'live' && styles.statusLive]}>
            <Text style={[styles.statusText, banner.status === 'live' && { color: Colors.successText }]}>
              {banner.status === 'live' ? `● සක්‍රීයයි · ⏳ ${countdown(banner.endsAt - now)}` : '⏳ OnGarage සමාලෝචනය කරමින්'}
            </Text>
          </View>
        </View>
      ) : (
        <>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="මාතෘකාව (උදා: බ්‍රේක් සතිය)" placeholderTextColor={Colors.textMuted} maxLength={40} accessibilityLabel="Banner title" />
          <TextInput style={styles.input} value={subtitle} onChangeText={setSubtitle} placeholder="එක් පේළියක් (උදා: පෑඩ්, ඩිස්ක් · −15% දක්වා)" placeholderTextColor={Colors.textMuted} maxLength={70} accessibilityLabel="Banner subtitle" />
          <View style={styles.chips}>
            {DAYS.map((d) => (
              <Pressable key={d} style={[styles.chip, days === d && styles.chipOn]} onPress={() => setDays(d)}>
                <Text style={[styles.chipText, days === d && styles.chipTextOn]}>දින {d}</Text>
              </Pressable>
            ))}
          </View>
          <ActionButton label="දැන්වීම ඉල්ලන්න" icon="📣" variant="primary" compact disabled={!valid} onPress={() => requestBanner(title.trim(), subtitle.trim(), days)} />
        </>
      )}
      <Text style={styles.sub}>සෑම දැන්වීමක්ම “දැන්වීම” ලෙස සලකුණු වේ. දැන්වීම් වෙළඳසැලේ ශ්‍රේණිගත කිරීමට හෝ ලැයිස්තු අනුපිළිවෙලට බලපාන්නේ නැත. දැන්වීම් ගාස්තුව දැනට යෙදුමෙන් පිටත ගණුදෙනු කෙරේ.</Text>
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), borderRadius: 18, padding: 14, gap: 4 },
    title: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    label: { fontSize: 12.5, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 4 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: softFill(), borderWidth: 1, borderColor: softEdge() },
    chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    chipText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    chipTextOn: { color: '#ffffff' },
    input: { backgroundColor: softFill(), borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textMain, borderWidth: 1, borderColor: softEdge() },
    status: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: 'rgba(245, 158, 11, 0.14)' },
    statusLive: { backgroundColor: 'rgba(16, 185, 129, 0.12)' },
    statusText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.warning },
  })
);
