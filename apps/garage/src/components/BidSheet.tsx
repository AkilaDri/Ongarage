import { outline } from '../utils/material';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { fittingLabel, ActionButton, FAR_JOB_KM, isFarJob, travelFeeFor, categoryInfo, Colors, dayStart, FONTS, GlassIcon, marketPrice, themedStyles, vehicleIcon, softFill, softEdge, softShadow } from '@ongarage/shared';
import { useGarage } from '../context/GarageContext';
import { CustomerBadge } from './CustomerBadge';
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
  // A far job: the travel compensation the garage adds to its bid (the owner sees the total, marked as including travel).
  const [travel, setTravel] = useState('');
  const [warranty, setWarranty] = useState(1);
  const [hours, setHours] = useState(2);
  const [note, setNote] = useState('');
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (job) {
      setShown(job);
      setMounted(true);
      setPrice(String(existing ? existing.price - (existing.travelFee ?? 0) : marketPrice(job.categoryId)));
      setTravel(isFarJob(job.distanceKm) ? String(existing?.travelFee ?? travelFeeFor(job.distanceKm)) : '');
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
  const far = isFarJob(shown.distanceKm);
  const travelValue = far ? Number(travel) || 0 : 0;
  // What is sent: the work plus the travel fee, as one total bid.
  const total = value + travelValue;
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
    placeBid(shown, { price: total, travelFee: travelValue || undefined, warrantyMonths: warranty, estHours: hours, note: note.trim() });
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
                <CustomerBadge customer={shown.customer} />
              </View>
            </View>

            {!!shown.fitting && (
              <View style={styles.farBox} accessibilityLabel="Parts fitting job">
                <Text style={styles.farTitle}>{fittingLabel(shown.fitting)}</Text>
                <Text style={styles.farText}>
                  {shown.fitting.supply === 'owner' ? 'පාරිභෝගිකයා කොටස ගෙන එයි — ලංසුවට සවි කිරීමේ වැඩ ගාස්තුව පමණක් ඇතුළත් කරන්න.' : 'ඔබ කොටස සපයා සවි කළ යුතුයි — ලංසුවට කොටසේ මිලද ඇතුළත් කරන්න.'}
                </Text>
              </View>
            )}
            <Text style={styles.label}>ඔබගේ මිල</Text>
            <View style={styles.priceBox}>
              <Text style={styles.currency}>රු.</Text>
              <TextInput style={styles.priceInput} keyboardType="number-pad" value={price} onChangeText={(t) => setPrice(t.replace(/[^0-9]/g, ''))} maxLength={7} />
            </View>
            <Text style={styles.sub}>
              {cat.name} සඳහා සාමාන්‍ය වෙළඳපොළ මිල: {money(market)}
            </Text>
            {standing && <Text style={[styles.standing, { color: standing.color }]}>● {standing.text}</Text>}

            {far && (
              <View style={styles.farBox} accessibilityLabel="Distant job warning">
                <Text style={styles.farTitle}>🚗 මෙම රැකියාව ඈත ස්ථානයක!</Text>
                <Text style={styles.farText}>
                  රැකියාව ඔබගෙන් කි.මී. {shown.distanceKm} ක් ඈතයි (සාමාන්‍ය සීමාව කි.මී. {FAR_JOB_KM}). ගමන් ගාස්තුව රැකියා ගාස්තුවට එකතු කර මුළු ලංසුව ලෙස පාරිභෝගිකයාට යවයි; එය පාරිභෝගිකයාට විශේෂ ලෙස පෙන්වයි.
                </Text>
                <Text style={styles.farLabel}>ගමන් වන්දි ගාස්තුව</Text>
                <View style={styles.priceBox}>
                  <Text style={styles.currency}>රු.</Text>
                  <TextInput style={styles.farInput} keyboardType="number-pad" value={travel} onChangeText={(t) => setTravel(t.replace(/[^0-9]/g, ''))} maxLength={6} accessibilityLabel="Travel compensation fee" />
                </View>
                <Text style={styles.farSum}>
                  රැකියාව {money(value)} + ගමන {money(travelValue)} = මුළු ලංසුව {money(total)}
                </Text>
              </View>
            )}

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
            {total > room && <Text style={styles.roomWarn}>⚖️ හෙට ඉඩ ඇත්තේ {money(room)} ක් පමණි — අඩු ලංසුවක් හෝ පසුව උත්සාහ කරන්න.</Text>}
            <ActionButton label={existing ? 'ලංසුව යාවත්කාලීන කරන්න' : `${money(total)} ${far ? 'මුළු ' : ''}ලංසුව යවන්න`} icon="📨" variant="primary" disabled={value <= 0 || total > room} onPress={submit} />
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
      borderColor: 'transparent',
      paddingTop: 10,
      overflow: 'hidden',
    },
    handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.subtleBorder },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6, paddingTop: 12 },
    title: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
    closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: softFill(), borderWidth: 1, borderColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
    closeText: { fontSize: 12, color: Colors.textMain },
    body: { paddingVertical: 18, paddingHorizontal: 6, gap: 10 },
    jobCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 20, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), ...softShadow() },
    cardTitle: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    label: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 6 },
    priceBox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, borderRadius: 18, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), ...softShadow() },
    currency: { fontSize: 18, fontFamily: FONTS.titleBold, color: Colors.textMuted },
    priceInput: { flex: 1, fontSize: 26, fontWeight: '800', color: Colors.textMain, paddingVertical: 8 },
    farBox: { gap: 6, padding: 12, borderRadius: 16, backgroundColor: 'rgba(245, 158, 11, 0.12)', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.5)' },
    farTitle: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.warning },
    farText: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMain, lineHeight: 17 },
    farLabel: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, marginTop: 2 },
    farInput: { flex: 1, fontSize: 20, fontWeight: '800', color: Colors.textMain, paddingVertical: 6 },
    farSum: { fontSize: 12, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    standing: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    choice: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'transparent', backgroundColor: softFill() },
    choiceActive: { borderColor: Colors.primary, backgroundColor: 'rgba(56, 189, 248, 0.14)' },
    choiceText: { fontSize: 12, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    choiceTextActive: { color: Colors.primary, fontFamily: FONTS.bodyBold },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: 14, alignSelf: 'flex-start' },
    stepBtn: { width: 40, height: 40, borderRadius: 16, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), justifyContent: 'center', alignItems: 'center', ...softShadow() },
    stepText: { fontSize: 18, color: Colors.textMain, fontWeight: '700' },
    stepValue: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain, minWidth: 70, textAlign: 'center' },
    noteInput: {
      minHeight: 70,
      padding: 12,
      borderRadius: 18,
      backgroundColor: Colors.bgCard,
      borderWidth: 1,
      borderColor: outline(),
      color: Colors.textMain,
      fontSize: 13,
      fontFamily: FONTS.bodyRegular,
      textAlignVertical: 'top',
      ...softShadow(),
    },
    footer: { padding: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.borderColor, backgroundColor: Colors.barBg },
  })
);
