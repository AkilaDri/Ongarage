import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  ActionButton,
  categoryInfo,
  Colors,
  FONTS,
  getAi,
  GlassIcon,
  marketPrice,
  SERVICE_CATEGORIES,
  SUGGEST_MIN_CONFIDENCE,
  themedStyles,
  vehicleIcon,
  type Garage,
  type VoiceNote,
} from '@ongarage/shared';
import { Sheet } from './Sheet';
import { MediaAttachments } from './MediaAttachments';
import { useVehicles } from '../context/VehiclesContext';
import { useBookings } from '../context/BookingsContext';
import { formatDate, formatTime, money } from '../utils/format';

const HOUR = 60 * 60 * 1000;
const SLOT_HOURS = [8, 10, 12, 14, 16, 18];
const DAYS_AHEAD = 5;

const dayStart = (offset: number) => {
  const d = new Date(Date.now() + offset * 24 * HOUR);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
const dayLabel = (offset: number, t: number) => (offset === 0 ? 'අද' : offset === 1 ? 'හෙට' : formatDate(t));

/**
 * Book a garage directly (no bidding): what's wrong, when, and whether the garage comes
 * to you. The garage gets it as a direct request and must answer within 2 hours.
 */
export const DirectBookingSheet: React.FC<{ garage: Garage | null; categoryId?: string; defaultVehicleId: string; onClose: () => void; onBooked?: () => void }> = ({
  garage,
  categoryId: initialCategory,
  defaultVehicleId,
  onClose,
  onBooked,
}) => {
  const { vehicles } = useVehicles();
  const { requestBooking } = useBookings();
  const [shown, setShown] = useState<Garage | null>(garage);
  const [categoryId, setCategoryId] = useState(initialCategory ?? '1');
  const [service, setService] = useState<string | undefined>();
  const [vehicleId, setVehicleId] = useState(defaultVehicleId);
  const [day, setDay] = useState(1);
  const [hour, setHour] = useState(10);
  const [doorstep, setDoorstep] = useState(false);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const aiRun = useRef(0);

  useEffect(() => {
    if (!garage) return;
    setShown(garage);
    setCategoryId(initialCategory ?? '1');
    setService(undefined);
    setVehicleId(defaultVehicleId);
    setDay(1);
    setHour(10);
    setDoorstep(false);
    setDescription('');
    setPhotos([]);
    setVoiceNotes([]);
    setSuggestion(null);
  }, [garage, initialCategory, defaultVehicleId]);

  // AI suggestion: if the description points to another service, offer to switch.
  useEffect(() => {
    const run = ++aiRun.current;
    if (description.trim().length < 8) {
      setSuggestion(null);
      return;
    }
    const t = setTimeout(async () => {
      const r = await getAi().classifyJob(description);
      if (run !== aiRun.current) return;
      const cat = r.value.categoryId;
      setSuggestion(cat && cat !== categoryId && r.confidence >= SUGGEST_MIN_CONFIDENCE ? cat : null);
    }, 400);
    return () => clearTimeout(t);
  }, [description, categoryId]);

  if (!shown) return null;

  const cat = categoryInfo(categoryId);
  const preferredAt = dayStart(day) + hour * HOUR;
  const slotPast = preferredAt <= Date.now() + HOUR;
  const valid = description.trim().length >= 5 && !slotPast;

  const submit = () => {
    requestBooking({ garage: shown, categoryId, service, vehicleId, preferredAt, description: description.trim(), doorstep, photos, voiceNotes });
    onClose();
    onBooked?.();
  };

  return (
    <Sheet
      visible={!!garage}
      title="ගරාජය වෙන් කරන්න"
      subtitle="ලංසු නොමැතිව — ගරාජය පැය 2ක් ඇතුළත පිළිතුරු දෙයි"
      onClose={onClose}
      footer={<ActionButton label={`වෙන්කිරීම ඉල්ලන්න · ${formatDate(preferredAt)} ${formatTime(preferredAt)}`} icon="📅" variant="primary" disabled={!valid} onPress={submit} />}
    >
      <View style={styles.garage}>
        <GlassIcon emoji="🛠️" small />
        <View style={styles.flex1}>
          <Text style={styles.title}>{shown.name}</Text>
          <Text style={styles.sub}>
            ★ {shown.rating} ({shown.reviews}) · කි.මී. {shown.distance} · {shown.address}
          </Text>
        </View>
      </View>

      <Text style={styles.label}>සේවාව</Text>
      <View style={styles.chips}>
        {SERVICE_CATEGORIES.map((c) => (
          <Chip
            key={c.id}
            label={`${c.icon} ${c.name}`}
            on={categoryId === c.id}
            onPress={() => {
              setCategoryId(c.id);
              setService(undefined);
            }}
          />
        ))}
      </View>
      <View style={styles.chips}>
        {cat.subcategories.map((s) => (
          <Chip key={s} label={s} on={service === s} onPress={() => setService(service === s ? undefined : s)} small />
        ))}
      </View>

      <Text style={styles.label}>වාහනය</Text>
      <View style={styles.chips}>
        {vehicles.map((v) => (
          <Chip key={v.id} label={`${vehicleIcon(v.type)} ${v.name} · ${v.plate}`} on={vehicleId === v.id} onPress={() => setVehicleId(v.id)} />
        ))}
      </View>

      <Text style={styles.label}>දිනය සහ වේලාව</Text>
      <View style={styles.chips}>
        {Array.from({ length: DAYS_AHEAD }, (_, i) => (
          <Chip key={i} label={dayLabel(i, dayStart(i))} on={day === i} onPress={() => setDay(i)} />
        ))}
      </View>
      <View style={styles.chips}>
        {SLOT_HOURS.map((h) => {
          const t = dayStart(day) + h * HOUR;
          const past = t <= Date.now() + HOUR;
          return <Chip key={h} label={formatTime(t)} on={hour === h} disabled={past} onPress={() => setHour(h)} small />;
        })}
      </View>
      {hour >= 17 && <Text style={styles.hint}>බොහෝ ගරාජ ප.ව. 5න් පසු වසා ඇත — ගරාජය වෙනත් වේලාවක් යෝජනා කළ හැක.</Text>}

      <Text style={styles.label}>සේවා ස්ථානය</Text>
      <View style={styles.chips}>
        <Chip label="🏠 මම වාහනය ගරාජයට ගෙනෙන්නම්" on={!doorstep} onPress={() => setDoorstep(false)} />
        <Chip label="🚛 ගරාජය මා වෙත පැමිණිය යුතුයි" on={doorstep} onPress={() => setDoorstep(true)} />
      </View>

      <Text style={styles.label}>ගැටලුව විස්තර කරන්න</Text>
      <TextInput
        style={styles.input}
        value={description}
        onChangeText={setDescription}
        placeholder="උදා: බ්‍රේක් තද කරන විට ශබ්දයක් එනවා"
        placeholderTextColor={Colors.textMuted}
        multiline
        maxLength={400}
        accessibilityLabel="Booking description"
      />
      {suggestion && (
        <Pressable style={styles.suggest} onPress={() => setCategoryId(suggestion)}>
          <Text style={styles.suggestText}>
            🤖 ඔබගේ විස්තරයට අනුව මෙය {categoryInfo(suggestion).icon} {categoryInfo(suggestion).name} විය හැක — මාරු කරන්න ›
          </Text>
        </Pressable>
      )}

      <Text style={styles.label}>ඡායාරූප සහ හඬ සටහන් (විකල්ප)</Text>
      <MediaAttachments photos={photos} voiceNotes={voiceNotes} onPhotos={setPhotos} onVoiceNotes={setVoiceNotes} />

      <Text style={styles.hint}>
        සාමාන්‍ය මිල: {money(marketPrice(categoryId))} පමණ. අවසන් මිල ගරාජය වාහනය පරීක්ෂා කළ පසු ඔබගේ අනුමැතියෙන් පමණක් තීරණය වේ.
      </Text>
    </Sheet>
  );
};

const Chip: React.FC<{ label: string; on: boolean; onPress: () => void; small?: boolean; disabled?: boolean }> = ({ label, on, onPress, small, disabled }) => (
  <Pressable style={[styles.chip, small && styles.chipSmall, on && styles.chipOn, disabled && styles.chipOff]} onPress={onPress} disabled={disabled}>
    <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
  </Pressable>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    garage: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor },
    title: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    label: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, letterSpacing: 0.4, marginTop: 6 },
    hint: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard },
    chipSmall: { paddingHorizontal: 9, paddingVertical: 5 },
    chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    chipOff: { opacity: 0.35 },
    chipText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    chipTextOn: { color: '#fff' },
    input: {
      minHeight: 80,
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
    suggest: { padding: 10, borderRadius: 12, backgroundColor: 'rgba(56, 189, 248, 0.1)', borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.4)' },
    suggestText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
  })
);
