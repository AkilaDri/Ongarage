import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton, categoryInfo, Colors, FONTS, GlassIcon, marketPrice, themedStyles, vehicleIcon, softFill, softEdge, softShadow } from '@ongarage/shared';
import { scheduleClash, useGarage } from '../context/GarageContext';
import { formatDate, formatTime, money } from '../utils/format';
import type { DirectRequest } from '../types';

export type ReplyMode = 'accept' | 'decline';

const HOUR = 60 * 60 * 1000;
const DECLINE_REASONS = ['එම වේලාවේ ඉඩ නැත', 'අවශ්‍ය කොටස් නොමැත', 'මෙම වාහනය සේවා නොකරයි', 'දුර වැඩියි'];

const atHour = (t: number, dayOffset: number, hour: number) => {
  const d = new Date(t + dayOffset * 24 * HOUR);
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
};

// The owner's slot first, then nearby alternatives the garage can offer instead.
const slotOptions = (preferredAt: number) => {
  const h = new Date(preferredAt).getHours();
  const list = [preferredAt, preferredAt + 2 * HOUR, atHour(preferredAt, 1, h), atHour(preferredAt, 1, 9), atHour(preferredAt, 2, h)];
  return Array.from(new Set(list)).filter((t) => t === preferredAt || (t > Date.now() && new Date(t).getHours() >= 8 && new Date(t).getHours() <= 17));
};

export const DirectReplySheet: React.FC<{ request: DirectRequest | null; mode: ReplyMode; onClose: () => void }> = ({ request, mode, onClose }) => {
  const { answerDirect, declineDirect, bookings, intakeOn } = useGarage();
  const [mounted, setMounted] = useState(!!request);
  const [shown, setShown] = useState<DirectRequest | null>(request);
  const [at, setAt] = useState(0);
  const [estimate, setEstimate] = useState('');
  const [note, setNote] = useState('');
  const [reason, setReason] = useState(DECLINE_REASONS[0]);
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (request) {
      setShown(request);
      setMounted(true);
      setAt(request.preferredAt);
      setEstimate(String(marketPrice(request.categoryId)));
      setNote('');
      setReason(DECLINE_REASONS[0]);
      Animated.spring(slide, { toValue: 1, stiffness: 200, damping: 24, useNativeDriver: true }).start();
    } else if (mounted) {
      Animated.timing(slide, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  if (!mounted || !shown) return null;

  const cat = categoryInfo(shown.categoryId);
  const market = marketPrice(shown.categoryId);
  const value = Number(estimate) || 0;
  const isPreferred = at === shown.preferredAt;
  const clash = scheduleClash(bookings, at);
  const farOff = Math.abs(at - shown.preferredAt) > 24 * HOUR;

  const submit = () => {
    if (mode === 'decline') declineDirect(shown.id, reason);
    else if (value > 0) answerDirect(shown.id, { at, estimate: value, note: note.trim() });
    onClose();
  };

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: slide }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.anchor} pointerEvents="box-none">
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [600, 0] }) }] }]}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>{mode === 'decline' ? 'ඉල්ලීම ප්‍රතික්ෂේප කරන්න' : 'ඍජු වෙන්කිරීමට පිළිතුරු දෙන්න'}</Text>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <View style={styles.jobCard}>
              <GlassIcon emoji={cat.icon} small />
              <View style={styles.flex1}>
                <Text style={styles.cardTitle}>
                  {cat.name}
                  {shown.service ? ` · ${shown.service}` : ''}
                </Text>
                <Text style={styles.sub} numberOfLines={1}>
                  {vehicleIcon(shown.vehicle.type)} {shown.vehicle.name} · {shown.customer.name}
                </Text>
              </View>
            </View>

            {mode === 'decline' ? (
              <>
                <Text style={styles.label}>හේතුව (හිමිකරුට පෙන්වයි)</Text>
                <View style={styles.chips}>
                  {DECLINE_REASONS.map((r) => (
                    <Pressable key={r} style={[styles.choice, reason === r && styles.choiceActive]} onPress={() => setReason(r)}>
                      <Text style={[styles.choiceText, reason === r && styles.choiceTextActive]}>{r}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.hint}>ඔබ ප්‍රතික්ෂේප කළ විගස හිමිකරුට වෙනත් ගරාජයක් තෝරා ගත හැක — ඉක්මනින් පිළිතුරු දීම ඔවුන්ට උදව්වකි.</Text>
              </>
            ) : (
              <>
                <Text style={styles.label}>වේලාව</Text>
                {slotOptions(shown.preferredAt).map((t) => {
                  const active = at === t;
                  const busy = scheduleClash(bookings, t);
                  return (
                    <Pressable key={t} style={[styles.slot, active && styles.slotActive]} onPress={() => setAt(t)}>
                      <View style={[styles.radio, active && styles.radioOn]} />
                      <View style={styles.flex1}>
                        <Text style={styles.cardTitle}>
                          {formatDate(t)} · {formatTime(t)}
                        </Text>
                        <Text style={styles.sub}>{t === shown.preferredAt ? 'හිමිකරු ඉල්ලූ වේලාව' : 'විකල්ප වේලාවක් යෝජනා කරන්න'}</Text>
                      </View>
                      {busy && <Text style={[styles.slotTag, { color: Colors.warning }]}>⚠️ {busy.title}</Text>}
                    </Pressable>
                  );
                })}
                {!!clash && <Text style={[styles.hint, { color: Colors.warning }]}>මේ වේලාවට ආසන්නව ඔබට “{clash.title}” වෙන්කිරීමක් දැනටමත් ඇත.</Text>}
                {value > 0 && intakeOn(at).remaining < value && (
                  <Text style={[styles.hint, { color: Colors.warning }]}>⚖️ එදින දෛනික සීමාව පිරී ඇත — ප්‍රතික්ෂේප නොකර ඉඩ ඇති ඊළඟ දිනයට යෝජනා වේ.</Text>
                )}

                <Text style={styles.label}>ඇස්තමේන්තුගත මිල</Text>
                <View style={styles.priceBox}>
                  <Text style={styles.currency}>රු.</Text>
                  <TextInput style={styles.priceInput} keyboardType="number-pad" value={estimate} onChangeText={(t) => setEstimate(t.replace(/[^0-9]/g, ''))} maxLength={7} />
                </View>
                <Text style={styles.sub}>
                  {cat.name} සඳහා සාමාන්‍ය වෙළඳපොළ මිල: {money(market)} · අවසාන මිල පරීක්ෂාවෙන් පසු තහවුරු වේ.
                </Text>

                <Text style={styles.label}>සටහන (විකල්ප)</Text>
                <TextInput
                  style={styles.input}
                  value={note}
                  onChangeText={setNote}
                  placeholder="උදා: පැමිණීමට පෙර අමතන්න"
                  placeholderTextColor={Colors.textMuted}
                  maxLength={120}
                />
                {!isPreferred && (
                  <Text style={[styles.hint, farOff && { color: Colors.errorText }]}>
                    {farOff
                      ? 'මෙම වේලාව ඉල්ලූ දිනයට වඩා දින එකකට වැඩි දුරකින් ඇත — හිමිකරු වෙනත් ගරාජයක් තෝරා ගැනීමට ඉඩ ඇත.'
                      : 'හිමිකරු නව වේලාව පිළිගත් පසු වෙන්කිරීම කාලසටහනට එක් වේ.'}
                  </Text>
                )}
              </>
            )}
          </ScrollView>

          <View style={styles.footer}>
            {mode === 'decline' ? (
              <ActionButton label="ප්‍රතික්ෂේප කරන්න" icon="✕" variant="sos" onPress={submit} />
            ) : (
              <ActionButton
                label={isPreferred ? 'වෙන්කිරීම තහවුරු කරන්න' : 'නව වේලාව යෝජනා කරන්න'}
                icon={isPreferred ? '✓' : '📨'}
                variant={isPreferred ? 'success' : 'primary'}
                disabled={value <= 0}
                onPress={submit}
              />
            )}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
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
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 12, gap: 10 },
    title: { flex: 1, fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
    closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: softFill(), borderWidth: 1, borderColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
    closeText: { fontSize: 12, color: Colors.textMain },
    body: { padding: 18, gap: 10 },
    jobCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 20, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), ...softShadow() },
    cardTitle: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    label: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 6 },
    hint: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 17 },
    slot: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, borderWidth: 1, borderColor: softEdge(), backgroundColor: Colors.bgCard, ...softShadow() },
    slotActive: { borderColor: Colors.primary, backgroundColor: 'rgba(56, 189, 248, 0.08)' },
    slotTag: { fontSize: 10, fontFamily: FONTS.bodySemiBold },
    radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: Colors.subtleBorder },
    radioOn: { borderColor: Colors.primary, borderWidth: 6 },
    priceBox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, height: 52, borderRadius: 18, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), ...softShadow() },
    currency: { fontSize: 15, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    priceInput: { flex: 1, fontSize: 20, fontWeight: '800', color: Colors.textMain },
    input: {
      height: 46,
      paddingHorizontal: 14,
      borderRadius: 18,
      backgroundColor: Colors.bgCard,
      borderWidth: 1,
      borderColor: softEdge(),
      color: Colors.textMain,
      fontSize: 13,
      fontFamily: FONTS.bodyMedium,
      ...softShadow(),
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    choice: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'transparent', backgroundColor: softFill() },
    choiceActive: { borderColor: Colors.errorText, backgroundColor: 'rgba(239, 68, 68, 0.1)' },
    choiceText: { fontSize: 11.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    choiceTextActive: { color: Colors.errorText, fontFamily: FONTS.bodyBold },
    footer: { padding: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.borderColor, backgroundColor: Colors.barBg },
  })
);
