import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton, Colors, FONTS, GlassIcon, SERVICE_CATEGORIES, themedStyles, vehicleIcon, type DiagnosisLine, type PartLine, type PartType } from '@ongarage/shared';
import { isNamedLine, useParts } from '../context/PartsContext';
import { DEFAULT_SUGGESTIONS, PART_SUGGESTIONS, PART_TYPE_LABEL } from '../constants/parts';
import { formatDate, formatTime } from '../utils/format';
import { Sheet } from './Sheet';
import type { Booking } from '../types';

const HOUR = 60 * 60 * 1000;
const WINDOWS = [30, 60, 120];
const RADII = [5, 10, 15];
const CHOOSABLE: PartType[] = ['Genuine', 'OEM', 'Recon', 'GarageChoice'];

/** The service category of a booking (from the owner's post, or by its title). */
export const bookingCategory = (b: Booking) => b.job?.categoryId ?? SERVICE_CATEGORIES.find((c) => c.name === b.title)?.id;

// Deadlines that make sense for this booking, soonest useful one first.
const needByOptions = (b: Booking) => {
  const now = Date.now();
  const list = [
    { at: b.scheduledAt - HOUR, label: 'වැඩට පැයකට පෙර' },
    { at: now + 2 * HOUR, label: 'පැය 2ක් ඇතුළත' },
    { at: now + 4 * HOUR, label: 'පැය 4ක් ඇතුළත' },
  ];
  return list.filter((o) => o.at > now + 30 * 60 * 1000);
};

export const PartsRequestSheet: React.FC<{ booking: Booking | null; onClose: () => void; onSent?: (requestId: string) => void }> = ({ booking, onClose, onSent }) => {
  const { requestParts, toOrderFor } = useParts();
  const [shown, setShown] = useState<Booking | null>(booking);
  // Workshop jobs: exactly the parts the owner approved (or named in the post).
  const [fixed, setFixed] = useState<DiagnosisLine[]>([]);
  const [lines, setLines] = useState<PartLine[]>([]);
  const [custom, setCustom] = useState('');
  const [chassis, setChassis] = useState('');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState(false);
  const [partType, setPartType] = useState<PartType>('GarageChoice');
  const [needBy, setNeedBy] = useState(0);
  const [windowMin, setWindowMin] = useState(60);
  const [radiusKm, setRadiusKm] = useState(10);

  useEffect(() => {
    if (!booking) return;
    setShown(booking);
    const approved = toOrderFor(booking);
    setFixed(approved);
    setLines(approved.map((l) => ({ id: l.id, name: l.name, qty: l.qty })));
    setCustom('');
    setChassis('');
    setNote('');
    setPhoto(false);
    const sameType = approved.length > 0 && approved.every((l) => l.partType === approved[0].partType);
    setPartType(sameType ? approved[0].partType! : (booking.job?.sparePart ?? 'GarageChoice'));
    setNeedBy(needByOptions(booking)[0]?.at ?? Date.now() + 2 * HOUR);
    setWindowMin(60);
    setRadiusKm(10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking]);

  if (!shown) return null;

  const categoryId = bookingCategory(shown);
  const suggestions = (categoryId && PART_SUGGESTIONS[categoryId]) || DEFAULT_SUGGESTIONS;
  // The owner's choice binds the garage; only "garage's choice" jobs let it pick.
  const ownerChose = (!!shown.job && shown.job.sparePart !== 'GarageChoice') || fixed.length > 0;
  const locked = fixed.length > 0;

  const add = (name: string) => {
    const n = name.trim();
    if (!n) return;
    setLines((prev) => (prev.some((l) => l.name === n) ? prev.map((l) => (l.name === n ? { ...l, qty: l.qty + 1 } : l)) : [...prev, { id: `l${Date.now()}${prev.length}`, name: n, qty: 1 }]));
  };
  const setQty = (id: string, qty: number) => setLines((prev) => (qty <= 0 ? prev.filter((l) => l.id !== id) : prev.map((l) => (l.id === id ? { ...l, qty } : l))));

  const send = () => {
    const id = requestParts({
      bookingId: shown.id,
      categoryId,
      vehicle: { ...shown.vehicle, chassis: chassis.trim() || undefined },
      partType,
      lines,
      forLineIds: locked ? fixed.map((l) => l.id) : undefined,
      note: note.trim() || undefined,
      oldPartPhoto: photo,
      needBy,
      radiusKm,
      windowMin,
    });
    onClose();
    onSent?.(id);
  };

  return (
    <Sheet
      visible={!!booking}
      title="කොටස් ඉල්ලන්න"
      subtitle="ළඟම කොටස් වෙළඳසැල් මිල ගණන් එවයි — ඔබ තෝරන්න"
      onClose={onClose}
      footer={<ActionButton label={lines.length ? `වෙළඳසැල් වෙත යවන්න (${lines.length})` : 'කොටසක් එක් කරන්න'} icon="📨" variant="primary" disabled={!lines.length} onPress={send} />}
    >
      <View style={styles.booking}>
        <GlassIcon emoji={shown.icon} small />
        <View style={styles.flex1}>
          <Text style={styles.title}>{shown.title}</Text>
          <Text style={styles.sub}>
            {vehicleIcon(shown.vehicle.type)} {shown.vehicle.name} · {shown.vehicle.plate} · වැඩ {formatDate(shown.scheduledAt)} {formatTime(shown.scheduledAt)}
          </Text>
        </View>
      </View>

      <Text style={styles.label}>කොටස් වර්ගය</Text>
      {ownerChose ? (
        <View style={styles.locked}>
          <Text style={styles.lockedTitle}>🔒 {locked ? 'අනුමත වර්ගය' : 'අයිතිකරු තෝරා ඇත'}: {PART_TYPE_LABEL[partType]}</Text>
          <Text style={styles.sub}>
            {partType === 'Genuine'
              ? 'Genuine නොමැති නම් පමණක් Recon සඳහා අයිතිකරුගෙන් අවසර ඉල්ලිය හැක.'
              : 'වෙළඳසැල්වලට මිල ගණන් එවිය හැක්කේ මෙම වර්ගයට පමණි.'}
          </Text>
        </View>
      ) : (
        <View style={styles.chips}>
          {CHOOSABLE.map((t) => (
            <Pressable key={t} style={[styles.chip, partType === t && styles.chipOn]} onPress={() => setPartType(t)}>
              <Text style={[styles.chipText, partType === t && styles.chipTextOn]}>{PART_TYPE_LABEL[t]}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Text style={styles.label}>අවශ්‍ය කොටස්</Text>
      {locked && (
        <View style={styles.locked}>
          <Text style={styles.lockedTitle}>{fixed.every(isNamedLine) ? '📝 අයිතිකරු තම පෝස්ට් එකේ සඳහන් කළ කොටස්' : '✅ අයිතිකරු අනුමත කළ කොටස් පමණි'}</Text>
          <Text style={styles.sub}>වෙනත් කොටසක් අවශ්‍ය නම් රැකියාවේ “අමතර වැඩ” ලෙස අයිතිකරුගෙන් අනුමැතිය ගන්න — අනුමැතියකින් තොරව කොටස් අය කළ නොහැක.</Text>
        </View>
      )}
      {lines.map((l) => (
        <View key={l.id} style={styles.line}>
          <Text style={[styles.title, styles.flex1]} numberOfLines={1}>
            {l.name}
          </Text>
          {locked ? (
            <Text style={styles.qtyValue}>×{l.qty}</Text>
          ) : (
          <View style={styles.qty}>
            <Pressable style={styles.qtyBtn} onPress={() => setQty(l.id, l.qty - 1)} accessibilityLabel={`Less ${l.name}`}>
              <Text style={styles.qtyText}>{l.qty === 1 ? '✕' : '−'}</Text>
            </Pressable>
            <Text style={styles.qtyValue}>{l.qty}</Text>
            <Pressable style={styles.qtyBtn} onPress={() => setQty(l.id, l.qty + 1)} accessibilityLabel={`More ${l.name}`}>
              <Text style={styles.qtyText}>+</Text>
            </Pressable>
          </View>
          )}
        </View>
      ))}
      {!locked && (
      <>
      <View style={styles.chips}>
        {suggestions
          .filter((s) => !lines.some((l) => l.name === s))
          .map((s) => (
            <Pressable key={s} style={styles.suggest} onPress={() => add(s)}>
              <Text style={styles.suggestText}>＋ {s}</Text>
            </Pressable>
          ))}
      </View>
      <View style={styles.addRow}>
        <TextInput
          style={[styles.input, styles.flex1]}
          value={custom}
          onChangeText={setCustom}
          placeholder="වෙනත් කොටසක් (උදා: Wiper blades)"
          placeholderTextColor={Colors.textMuted}
          onSubmitEditing={() => {
            add(custom);
            setCustom('');
          }}
        />
        <Pressable
          style={[styles.addBtn, !custom.trim() && styles.off]}
          disabled={!custom.trim()}
          onPress={() => {
            add(custom);
            setCustom('');
          }}
        >
          <Text style={styles.addText}>එක් කරන්න</Text>
        </Pressable>
      </View>
      </>
      )}

      <Text style={styles.label}>වාහනය හඳුනා ගැනීමට</Text>
      <TextInput style={styles.input} value={chassis} onChangeText={setChassis} placeholder="චැසි / මාදිලි අංකය (උදා: NZE141-…)" placeholderTextColor={Colors.textMuted} autoCapitalize="characters" />
      <TextInput style={styles.input} value={note} onChangeText={setNote} placeholder="කොටස් අංක හෝ සටහනක් (විකල්ප)" placeholderTextColor={Colors.textMuted} />
      <Pressable style={[styles.toggle, photo && styles.toggleOn]} onPress={() => setPhoto((p) => !p)}>
        <View style={[styles.check, photo && styles.checkOn]}>{photo && <Text style={styles.checkMark}>✓</Text>}</View>
        <Text style={[styles.sub, styles.flex1]}>📷 පැරණි කොටසේ ඡායාරූපයක් අමුණන්න — නිවැරදි කොටස හඳුනා ගැනීමට උදව් වේ</Text>
      </Pressable>

      <Text style={styles.label}>ගරාජයට ලැබිය යුත්තේ</Text>
      <View style={styles.chips}>
        {needByOptions(shown).map((o) => (
          <Pressable key={o.label} style={[styles.chip, needBy === o.at && styles.chipOn]} onPress={() => setNeedBy(o.at)}>
            <Text style={[styles.chipText, needBy === o.at && styles.chipTextOn]}>
              {o.label} · {formatTime(o.at)}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.twoCol}>
        <View style={styles.flex1}>
          <Text style={styles.label}>මිල ගණන් සඳහා කාලය</Text>
          <View style={styles.chips}>
            {WINDOWS.map((w) => (
              <Pressable key={w} style={[styles.chip, windowMin === w && styles.chipOn]} onPress={() => setWindowMin(w)}>
                <Text style={[styles.chipText, windowMin === w && styles.chipTextOn]}>මිනි. {w}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
      <Text style={styles.label}>වෙළඳසැල් සොයන දුර</Text>
      <View style={styles.chips}>
        {RADII.map((r) => (
          <Pressable key={r} style={[styles.chip, radiusKm === r && styles.chipOn]} onPress={() => setRadiusKm(r)}>
            <Text style={[styles.chipText, radiusKm === r && styles.chipTextOn]}>කි.මී. {r}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.hint}>කොටස් ගාස්තුව වාහන හිමිකරුට වෙනම බිල්පතක් ලෙස පෙන්වයි (ඔබගේ වැඩ ගාස්තුවට අමතරව).</Text>
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    booking: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor },
    title: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1, lineHeight: 16 },
    label: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, letterSpacing: 0.4, marginTop: 6 },
    hint: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16, marginTop: 4 },
    locked: { padding: 12, borderRadius: 14, backgroundColor: 'rgba(56, 189, 248, 0.08)', borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.35)', gap: 2 },
    lockedTitle: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard },
    chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    chipText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    chipTextOn: { color: '#fff' },
    suggest: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.subtleBorder },
    suggestText: { fontSize: 11, fontFamily: FONTS.bodyMedium, color: Colors.primary },
    line: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor },
    qty: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    qtyBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.subtleFill, borderWidth: 1, borderColor: Colors.borderColor, justifyContent: 'center', alignItems: 'center' },
    qtyText: { fontSize: 14, fontWeight: '700', color: Colors.textMain },
    qtyValue: { fontSize: 13, fontFamily: FONTS.bodyBold, color: Colors.textMain, minWidth: 16, textAlign: 'center' },
    addRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    input: {
      height: 44,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: Colors.bgCard,
      borderWidth: 1,
      borderColor: Colors.borderColor,
      color: Colors.textMain,
      fontSize: 12.5,
      fontFamily: FONTS.bodyMedium,
    },
    addBtn: { paddingHorizontal: 12, height: 44, borderRadius: 12, backgroundColor: Colors.primary, justifyContent: 'center' },
    addText: { fontSize: 11.5, fontFamily: FONTS.bodyBold, color: '#fff' },
    off: { opacity: 0.4 },
    toggle: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard },
    toggleOn: { borderColor: 'rgba(16, 185, 129, 0.45)' },
    check: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: Colors.subtleBorder, justifyContent: 'center', alignItems: 'center' },
    checkOn: { backgroundColor: Colors.success, borderColor: Colors.success },
    checkMark: { fontSize: 12, fontWeight: '900', color: '#fff' },
    twoCol: { flexDirection: 'row', gap: 10 },
  })
);
