import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton, categoryInfo, Colors, dayStart, FONTS, GlassIcon, marketPrice, themedStyles, vehicleIcon } from '@ongarage/shared';
import { useGarage } from '../context/GarageContext';
import { money } from '../utils/format';
import type { FeedJob, MyBid } from '../types';

const WARRANTY = [0, 1, 3, 6];

interface BidSheetProps {
  job: FeedJob | null;
  existing?: MyBid;
  onClose: () => void;
}

export const BidSheet: React.FC<BidSheetProps> = ({ job, existing, onClose }) => {
  const { placeBid, intakeOn } = useGarage();
  // A won bid is booked tomorrow; a limited garage needs room for it then.
  const room = intakeOn(dayStart(Date.now()) + 24 * 60 * 60 * 1000).remaining;
  const [mounted, setMounted] = useState(!!job);
  const [shown, setShown] = useState<FeedJob | null>(job);
  const [price, setPrice] = useState('');
  const [warranty, setWarranty] = useState(1);
  const [hours, setHours] = useState(2);
  const [note, setNote] = useState('');
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (job) {
      setShown(job);
      setMounted(true);
      setPrice(String(existing?.price ?? marketPrice(job.categoryId)));
      setWarranty(existing?.warrantyMonths ?? 1);
      setHours(existing?.estHours ?? 2);
      setNote(existing?.note ?? '');
      Animated.spring(slide, { toValue: 1, stiffness: 200, damping: 24, useNativeDriver: true }).start();
    } else if (mounted) {
      Animated.timing(slide, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job]);

  if (!mounted || !shown) return null;

  const market = marketPrice(shown.categoryId);
  const value = Number(price) || 0;
  // Same rule the owner side uses to pick a bid (see GarageContext.bidWins).
  const standing =
    value <= 0
      ? null
      : value <= market
        ? { text: 'තරගකාරී මිලක් — දිනීමට හොඳ අවස්ථාවක්', color: Colors.success }
        : value <= market * 1.05
          ? { text: 'වෙළඳපොළ මිලට ආසන්නයි', color: Colors.warning }
          : { text: 'වෙළඳපොළ මිලට වඩා ඉහළයි — අහිමි විය හැක', color: Colors.errorText };
  const cat = categoryInfo(shown.categoryId);

  const submit = () => {
    if (value <= 0) return;
    placeBid(shown, { price: value, warrantyMonths: warranty, estHours: hours, note: note.trim() });
    onClose();
  };

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: slide }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.anchor} pointerEvents="box-none">
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [560, 0] }) }] }]}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>{existing ? 'ලංසුව යාවත්කාලීන කරන්න' : 'ලංසුවක් තබන්න'}</Text>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <View style={styles.jobCard}>
              <GlassIcon emoji={cat.icon} small />
              <View style={styles.flex1}>
                <Text style={styles.cardTitle}>{cat.name}</Text>
                <Text style={styles.sub} numberOfLines={1}>
                  {vehicleIcon(shown.vehicle.type)} {shown.vehicle.name} · {shown.customer.name}
                </Text>
              </View>
            </View>

            <Text style={styles.label}>ඔබගේ මිල</Text>
            <View style={styles.priceBox}>
              <Text style={styles.currency}>රු.</Text>
              <TextInput style={styles.priceInput} keyboardType="number-pad" value={price} onChangeText={(t) => setPrice(t.replace(/[^0-9]/g, ''))} maxLength={7} />
            </View>
            <Text style={styles.sub}>
              {cat.name} සඳහා සාමාන්‍ය වෙළඳපොළ මිල: {money(market)}
            </Text>
            {standing && <Text style={[styles.standing, { color: standing.color }]}>● {standing.text}</Text>}

            <Text style={styles.label}>වගකීම</Text>
            <View style={styles.chips}>
              {WARRANTY.map((m) => (
                <Pressable key={m} style={[styles.choice, warranty === m && styles.choiceActive]} onPress={() => setWarranty(m)}>
                  <Text style={[styles.choiceText, warranty === m && styles.choiceTextActive]}>{m === 0 ? 'නැත' : `මාස ${m}`}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>ඇස්තමේන්තුගත කාලය</Text>
            <View style={styles.stepper}>
              <Pressable style={styles.stepBtn} onPress={() => setHours((h) => Math.max(1, h - 1))}>
                <Text style={styles.stepText}>−</Text>
              </Pressable>
              <Text style={styles.stepValue}>පැය {hours}</Text>
              <Pressable style={styles.stepBtn} onPress={() => setHours((h) => Math.min(72, h + 1))}>
                <Text style={styles.stepText}>＋</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>පාරිභෝගිකයාට සටහනක් (විකල්ප)</Text>
            <TextInput
              style={styles.noteInput}
              multiline
              placeholder="උදා: ජෙනුයින් කොටස් සමඟ එදිනම අවසන් කළ හැක."
              placeholderTextColor={Colors.textMuted}
              value={note}
              onChangeText={setNote}
              maxLength={160}
            />
          </ScrollView>

          <View style={styles.footer}>
            {value > room && <Text style={styles.roomWarn}>⚖️ හෙට ඉඩ ඇත්තේ {money(room)} ක් පමණි — අඩු ලංසුවක් හෝ පසුව උත්සාහ කරන්න.</Text>}
            <ActionButton label={existing ? 'ලංසුව යාවත්කාලීන කරන්න' : `${money(value)} ලංසුව යවන්න`} icon="📨" variant="primary" disabled={value <= 0 || value > room} onPress={submit} />
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    roomWarn: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.warning, lineHeight: 17, marginBottom: 6 },
    flex1: { flex: 1 },
    backdrop: { ...StyleSheet.absoluteFill, backgroundColor: Colors.overlay },
    anchor: { flex: 1, justifyContent: 'flex-end' },
    sheet: {
      maxHeight: '90%',
      backgroundColor: Colors.sheetBg,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: Colors.borderColor,
      paddingTop: 10,
      overflow: 'hidden',
    },
    handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.subtleBorder },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 12 },
    title: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
    closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.subtleFill, borderWidth: 1, borderColor: Colors.borderColor, justifyContent: 'center', alignItems: 'center' },
    closeText: { fontSize: 12, color: Colors.textMain },
    body: { padding: 18, gap: 10 },
    jobCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor },
    cardTitle: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    label: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, letterSpacing: 0.4, marginTop: 6 },
    priceBox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, borderRadius: 14, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor },
    currency: { fontSize: 18, fontFamily: FONTS.titleBold, color: Colors.textMuted },
    priceInput: { flex: 1, fontSize: 26, fontWeight: '800', color: Colors.textMain, paddingVertical: 8 },
    standing: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    choice: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.subtleFill },
    choiceActive: { borderColor: Colors.primary, backgroundColor: 'rgba(56, 189, 248, 0.14)' },
    choiceText: { fontSize: 12, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    choiceTextActive: { color: Colors.primary, fontFamily: FONTS.bodyBold },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: 14, alignSelf: 'flex-start' },
    stepBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, justifyContent: 'center', alignItems: 'center' },
    stepText: { fontSize: 18, color: Colors.textMain, fontWeight: '700' },
    stepValue: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain, minWidth: 70, textAlign: 'center' },
    noteInput: {
      minHeight: 70,
      padding: 12,
      borderRadius: 14,
      backgroundColor: Colors.bgCard,
      borderWidth: 1,
      borderColor: Colors.borderColor,
      color: Colors.textMain,
      fontSize: 13,
      fontFamily: FONTS.bodyRegular,
      textAlignVertical: 'top',
    },
    footer: { padding: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.borderColor, backgroundColor: Colors.barBg },
  })
);
